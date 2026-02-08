
import React, { useState, useMemo, useRef } from 'react';
import { ConvokedPerson, CompetitionType, ConvocationStatus, PSS, Vacancy, ContractStatus, UserRole } from '../types';
import { maskCPF, formatDisplayDate, generateId, removeAccents } from '../utils';
import { 
  X, Plus, FileSpreadsheet, Clock, Trash2, Archive, Download, Upload, Pencil, UserMinus, ArrowDownToLine, AlertCircle, Package, FileDown, Briefcase, RefreshCw, UserX
} from 'lucide-react';
import { format } from 'date-fns';

interface ConvocationManagementProps {
  convocations: ConvokedPerson[];
  setConvocations: React.Dispatch<React.SetStateAction<ConvokedPerson[]>>;
  pssList: PSS[];
  setPssList: React.Dispatch<React.SetStateAction<PSS[]>>;
  vacancies: Vacancy[];
  profiles: string[];
  userRole: UserRole;
  onLog: (action: string, details: string) => void;
}

const ConvocationManagement: React.FC<ConvocationManagementProps> = ({ 
  convocations = [], 
  setConvocations,
  pssList = [], 
  setPssList, 
  vacancies = [],
  userRole, 
  onLog 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'classified' | 'convoked' | 'substitution'>('classified');
  const [selectedPssId, setSelectedPssId] = useState<string | null>(null);
  const [showAddPssModal, setShowAddPssModal] = useState(false);
  const [showEditPssModal, setShowEditPssModal] = useState<PSS | null>(null);
  const [showNominationModal, setShowNominationModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState<ConvokedPerson | null>(null);
  const [showReclassifyModal, setShowReclassifyModal] = useState<ConvokedPerson | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [nominationAct, setNominationAct] = useState('');
  const [nominationDate, setNominationDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [pssFormTitle, setPssFormTitle] = useState('');
  const [pssFormDate, setPssFormDate] = useState('');
  const [newRankingInput, setNewRankingInput] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.HR;
  const isAdmin = userRole === UserRole.ADMIN;

  const currentPss = useMemo(() => pssList.find(p => p.id === selectedPssId), [selectedPssId, pssList]);

  const nextRankingForFila = useMemo(() => {
    if (!selectedPssId) return 1;
    const pssCandidates = convocations.filter(c => c.pssId === selectedPssId);
    if (pssCandidates.length === 0) return 1;
    const maxRank = Math.max(...pssCandidates.map(c => c.ranking));
    return maxRank + 1;
  }, [convocations, selectedPssId]);

  const candidates = useMemo(() => {
    let list = convocations.filter(c => c.pssId === selectedPssId);
    
    if (activeSubTab === 'classified') {
      // REGRA: Incluir DECLINED na lista de habilitados para visualização histórica
      list = list.filter(c => 
        c.status === ConvocationStatus.PENDING || 
        c.status === ConvocationStatus.RECLASSIFIED ||
        c.status === ConvocationStatus.DECLINED
      );
    } else if (activeSubTab === 'convoked') {
      list = list.filter(c => !!c.convocationAct && c.status === ConvocationStatus.PENDING);
    }

    if (searchTerm) {
      const lowSearch = removeAccents(searchTerm.toLowerCase());
      list = list.filter(c => 
        removeAccents(c.name.toLowerCase()).includes(lowSearch) || 
        c.cpf.includes(searchTerm)
      );
    }

    return list.sort((a, b) => a.ranking - b.ranking);
  }, [convocations, selectedPssId, activeSubTab, searchTerm]);

  const handleDecline = () => {
    if (!showDeclineModal) return;
    setConvocations(prev => prev.map(c => 
      c.id === showDeclineModal.id ? { ...c, status: ConvocationStatus.DECLINED } : c
    ));
    onLog('DESISTÊNCIA', `Candidato ${showDeclineModal.name} inabilitado permanentemente por desistência.`);
    setShowDeclineModal(null);
  };

  const handleReclassify = () => {
    if (!showReclassifyModal) return;
    setConvocations(prev => prev.map(c => 
      c.id === showReclassifyModal.id ? { 
        ...c, 
        ranking: newRankingInput, 
        convocationAct: undefined, 
        convocationDate: undefined,
        status: ConvocationStatus.RECLASSIFIED 
      } : c
    ));
    onLog('FIM DE FILA', `Candidato ${showReclassifyModal.name} movido para posição #${newRankingInput}.`);
    setShowReclassifyModal(null);
  };

  const handleNomination = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    const sanitizedAct = removeAccents(nominationAct).toUpperCase();
    setConvocations(prev => prev.map(c => 
      selectedIds.includes(c.id) ? { ...c, convocationAct: sanitizedAct, convocationDate: nominationDate } : c
    ));
    onLog('CHAMAMENTO', `Convocação ${sanitizedAct} emitida para ${selectedIds.length} candidatos.`);
    setShowNominationModal(false);
    setSelectedIds([]);
    setNominationAct('');
  };

  const handleArchivePss = (id: string, archive: boolean) => {
    setPssList(prev => prev.map(p => p.id === id ? { ...p, isArchived: archive } : p));
    onLog(archive ? 'ARQUIVAR_PSS' : 'RESTAURAR_PSS', `Edital ${id} ${archive ? 'arquivado' : 'restaurado'}.`);
  };

  const toggleSelect = (id: string) => {
    const cand = convocations.find(c => c.id === id);
    // REGRA: Impede seleção se já convocado ou se for DESISTENTE
    if (cand?.convocationAct || cand?.status === ConvocationStatus.DECLINED) return;
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSaveNewPss = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pssFormTitle.trim() || !pssFormDate) return;
    
    const newPss: PSS = { 
      id: generateId(), 
      title: pssFormTitle.toUpperCase(), 
      validUntil: pssFormDate, 
      isArchived: false, 
      candidates: [] 
    };
    
    setPssList(prev => [...prev, newPss]);
    setSelectedPssId(newPss.id);
    setPssFormTitle('');
    setPssFormDate('');
    setShowAddPssModal(false);
    onLog('CRIAR_PSS', `Edital ${newPss.title} cadastrado com sucesso.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex space-x-2 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200">
          <button onClick={() => { setActiveSubTab('classified'); setSelectedIds([]); }} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeSubTab === 'classified' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>Habilitados (Classificados)</button>
          <button onClick={() => { setActiveSubTab('convoked'); setSelectedIds([]); }} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeSubTab === 'convoked' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>Convocados (Ações)</button>
          <button onClick={() => { setActiveSubTab('substitution'); setSelectedIds([]); }} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeSubTab === 'substitution' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>Substituição</button>
        </div>
        <button onClick={() => { setPssFormTitle(''); setPssFormDate(''); setShowAddPssModal(true); }} className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center hover:bg-blue-700 active:scale-95 transition-all"><Plus size={18} className="mr-2" /> Novo Edital PSS</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Clock size={14} className="mr-2" /> {showArchived ? 'Arquivados' : 'Ativos'}</h3>
              <button onClick={() => { setShowArchived(!showArchived); setSelectedPssId(null); }} className="text-[9px] font-black text-blue-600 uppercase hover:underline">{showArchived ? 'Ativos' : 'Arquivados'}</button>
            </div>
            <div className="space-y-3">
              {pssList.filter(p => showArchived ? p.isArchived : !p.isArchived).map(p => (
                <div key={p.id} onClick={() => setSelectedPssId(p.id)} className={`p-4 rounded-2xl border transition-all cursor-pointer group relative ${selectedPssId === p.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent hover:border-slate-100'}`}>
                  <div className="pr-10">
                    <p className={`text-[11px] font-black truncate ${selectedPssId === p.id ? 'text-blue-700' : 'text-slate-800'}`}>{p.title}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Vencimento: {formatDisplayDate(p.validUntil)}</p>
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {isAdmin && (
                      <button onClick={(e) => { e.stopPropagation(); setPssFormTitle(p.title); setPssFormDate(p.validUntil); setShowEditPssModal(p); }} className="p-1.5 bg-white text-slate-400 hover:text-blue-600 rounded-lg shadow-sm border border-slate-100" title="Configurar Edital"><Pencil size={12}/></button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleArchivePss(p.id, !p.isArchived); }} className="p-1.5 bg-white text-slate-400 hover:text-amber-600 rounded-lg shadow-sm border border-slate-100">{p.isArchived ? <Package size={12}/> : <Archive size={12}/>}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="lg:col-span-3 space-y-6">
          {selectedPssId ? (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center"><FileSpreadsheet className="mr-3 text-blue-600" size={20} /> {currentPss?.title}</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">
                    {activeSubTab === 'classified' ? 'Ranking Geral de Habilitados' : activeSubTab === 'convoked' ? 'Gestão de Candidatos Convocados' : 'Sugestão de Substituição'}
                  </p>
                </div>
                {activeSubTab === 'classified' && canEdit && (
                  <div className="flex items-center space-x-2">
                    <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 bg-slate-50 text-blue-600 text-[10px] font-black uppercase rounded-xl border border-slate-200 hover:bg-blue-50 transition-all">Importar Lista</button>
                    <input type="file" ref={fileInputRef} className="hidden" />
                    <button disabled={selectedIds.length === 0} onClick={() => setShowNominationModal(true)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg disabled:opacity-30 transition-all active:scale-95">Convocar Selecionados ({selectedIds.length})</button>
                  </div>
                )}
              </div>

              <div className="overflow-hidden border border-slate-100 rounded-2xl">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 border-b border-slate-100">
                    <tr>
                      {activeSubTab === 'classified' && <th className="px-6 py-4 w-10 text-center">
                        <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === candidates.filter(c => !c.convocationAct && c.status !== ConvocationStatus.DECLINED).length} onChange={() => setSelectedIds(selectedIds.length > 0 ? [] : candidates.filter(c => !c.convocationAct && c.status !== ConvocationStatus.DECLINED).map(c => c.id))} className="w-4 h-4 rounded" />
                      </th>}
                      <th className="px-6 py-4">Ranking</th>
                      <th className="px-6 py-4">Nome</th>
                      <th className="px-6 py-4">Situação Operacional</th>
                      <th className="px-6 py-4 text-right">{activeSubTab === 'convoked' ? 'Ações' : ''}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {candidates.map(c => {
                      const isConvoked = !!c.convocationAct;
                      const isDeclined = c.status === ConvocationStatus.DECLINED;

                      return (
                        <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${isDeclined ? 'bg-red-50/20' : ''}`}>
                          {activeSubTab === 'classified' && (
                            <td className="px-6 py-4 text-center">
                              <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} disabled={isConvoked || isDeclined} className="w-4 h-4 rounded disabled:opacity-30 disabled:cursor-not-allowed" />
                            </td>
                          )}
                          <td className="px-6 py-4 font-black">#{c.ranking}</td>
                          <td className="px-6 py-4">
                            <p className={`font-bold ${isDeclined ? 'text-red-400 line-through' : 'text-slate-800'}`}>{c.name}</p>
                            <p className="text-[9px] text-slate-400 font-mono">{c.cpf}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              {isDeclined ? (
                                <span className="bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase flex items-center"><UserX size={8} className="mr-1"/> DESISTENTE</span>
                              ) : isConvoked ? (
                                <span className="bg-blue-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase">CONVOCADO: {c.convocationAct}</span>
                              ) : (
                                <span className="bg-slate-100 text-slate-400 text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase">HABILITADO</span>
                              )}
                              <span className="text-[7px] font-black uppercase text-slate-400">{c.competition}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {activeSubTab === 'convoked' && canEdit && !isDeclined && (
                              <div className="flex justify-end gap-2">
                                <button onClick={() => { setNewRankingInput(nextRankingForFila); setShowReclassifyModal(c); }} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:text-amber-600 transition-all shadow-sm" title="Fim de Fila"><ArrowDownToLine size={14}/></button>
                                <button onClick={() => setShowDeclineModal(c)} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:text-red-600 transition-all shadow-sm" title="Desistência"><UserMinus size={14}/></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-32 flex flex-col items-center justify-center text-center">
              <FileSpreadsheet size={64} className="text-slate-100 mb-6"/><h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Editais PSS</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest max-w-xs">Selecione um edital para gerenciar a lista de habilitados e convocados.</p>
            </div>
          )}
        </section>
      </div>

      {/* MODAL: NOVO PSS */}
      {showAddPssModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-10 shadow-2xl border border-slate-100 animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tighter">Cadastrar Novo Edital</h2>
            <form onSubmit={handleSaveNewPss} className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Número / Identificação do Edital PSS</label>
                <input value={pssFormTitle} onChange={e => setPssFormTitle(e.target.value)} required placeholder="Ex: PSS 001/2024" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 shadow-inner" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Data de Validade Final</label>
                <input type="date" value={pssFormDate} onChange={e => setPssFormDate(e.target.value)} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 shadow-inner" />
              </div>
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase shadow-xl mt-4 hover:bg-blue-700 transition-all">Salvar Edital</button>
              <button type="button" onClick={() => setShowAddPssModal(false)} className="w-full text-slate-400 font-bold uppercase text-[10px] mt-2">Cancelar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DESISTÊNCIA */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-12 shadow-2xl text-center">
            <div className="flex justify-center mb-6 text-red-600"><AlertCircle size={48} /></div>
            <h2 className="text-2xl font-black mb-4 text-slate-800 uppercase tracking-tighter">Registrar Desistência?</h2>
            <p className="text-xs text-slate-500 mb-10 leading-relaxed font-medium px-4">O candidato <strong>{showDeclineModal.name}</strong> será marcado como desistente e ficará inabilitado para este edital permanentemente.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeclineModal(null)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px]">Cancelar</button>
              <button onClick={handleDecline} className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl text-[10px] uppercase shadow-lg transition-all active:scale-95">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONVOCAR */}
      {showNominationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-10 shadow-2xl">
            <h2 className="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tighter">Lançar Chamamento</h2>
            <form onSubmit={handleNomination} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Número do Ato Convocatório</label>
                <input value={nominationAct} onChange={e => setNominationAct(e.target.value)} required placeholder="Ex: PORTARIA 123/2024" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Data da Convocação</label>
                <input type="date" value={nominationDate} onChange={e => setNominationDate(e.target.value)} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500" />
              </div>
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase shadow-xl mt-4">Emitir Convocação</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConvocationManagement;
