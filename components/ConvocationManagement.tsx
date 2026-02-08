
import React, { useState, useMemo, useRef } from 'react';
import { ConvokedPerson, CompetitionType, ConvocationStatus, PSS, Vacancy, ContractStatus, UserRole } from '../types';
import { maskCPF, formatDisplayDate, generateId, removeAccents } from '../utils';
import { 
  X, Plus, FileSpreadsheet, Clock, Trash2, Archive, Download, Upload, Pencil, UserMinus, ArrowDownToLine, AlertCircle, Package, FileDown, Briefcase, RefreshCw, Ban
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

  // Filtros de Listagem
  const candidates = useMemo(() => {
    let list = convocations.filter(c => c.pssId === selectedPssId);
    
    if (activeSubTab === 'classified') {
      // Ajuste: Inclui PENDENTE, RECLASSIFICADO e agora DESISTENTE (para visualização da inabilitação)
      list = list.filter(c => 
        c.status === ConvocationStatus.PENDING || 
        c.status === ConvocationStatus.RECLASSIFIED || 
        c.status === ConvocationStatus.DECLINED
      );
    } else if (activeSubTab === 'convoked') {
      // Apenas quem JÁ possui ato de convocação e aguarda contratação
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

  const substitutionSuggestions = useMemo(() => {
    if (!selectedPssId || activeSubTab !== 'substitution') return [];
    
    const pssVacancies = vacancies.filter(v => v.pssId === selectedPssId);
    const emptySlotsWithHistory: { vacancy: Vacancy, slotIndex: number, lastCompetition: CompetitionType }[] = [];
    
    pssVacancies.forEach(v => {
      for (let i = 1; i <= v.initialQuantity; i++) {
        const occupations = v.occupations.filter(o => o.slotIndex === i);
        const active = occupations.find(o => o.status === ContractStatus.ACTIVE);
        
        if (!active && occupations.length > 0) {
          const lastOcc = [...occupations].sort((a, b) => b.order - a.order)[0];
          emptySlotsWithHistory.push({ 
            vacancy: v, 
            slotIndex: i, 
            lastCompetition: lastOcc.competition || CompetitionType.AC 
          });
        }
      }
    });

    const pssClassifieds = convocations.filter(c => 
      c.pssId === selectedPssId && 
      !c.convocationAct && 
      (c.status === ConvocationStatus.PENDING || c.status === ConvocationStatus.RECLASSIFIED)
    );

    return emptySlotsWithHistory.map(slot => {
      const bestMatch = pssClassifieds
        .filter(c => c.competition === slot.lastCompetition)
        .sort((a, b) => a.ranking - b.ranking)[0];
        
      return { ...slot, suggestedCandidate: bestMatch };
    });
  }, [vacancies, convocations, selectedPssId, activeSubTab]);

  const handleDownloadTemplate = () => {
    const headers = "Nome;CPF;Email;Perfil Profissional;Modalidade;Ranking";
    const example = "JOAO DA SILVA;12345678900;joao@exemplo.com;PROFESSOR SUBSTITUTO;AC;1";
    const csvContent = "\ufeff" + headers + "\n" + example;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_ctu_importacao.csv");
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPssId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      let decoder = new TextDecoder('utf-8');
      let text = decoder.decode(buffer);
      if (text.includes('\ufffd')) { 
        decoder = new TextDecoder('iso-8859-1'); 
        text = decoder.decode(buffer); 
      }
      
      const lines = text.split('\n');
      const newCandidates: ConvokedPerson[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const separator = line.includes(';') ? ';' : ',';
        const cols = line.split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
        
        if (cols.length < 6) continue;
        const [nome, cpf, email, perfil, modalidade, ranking] = cols;
        
        let comp = CompetitionType.AC;
        const modUpper = removeAccents(modalidade).toUpperCase();
        if (modUpper.includes('PCD')) comp = CompetitionType.PCD;
        if (modUpper.includes('PPP') || modUpper.includes('COTA')) comp = CompetitionType.PPP;
        
        newCandidates.push({
          id: generateId(), 
          name: removeAccents(nome).toUpperCase(), 
          cpf: maskCPF(cpf), 
          email: email.toLowerCase(), 
          profile: removeAccents(perfil).toUpperCase(), 
          notice: currentPss?.title || '', 
          pssId: selectedPssId, 
          competition: comp, 
          ranking: parseInt(ranking) || (nextRankingForFila + i), 
          status: ConvocationStatus.PENDING, 
          createdAt: new Date().toISOString()
        });
      }
      
      if (newCandidates.length > 0) {
        setConvocations(prev => [...prev, ...newCandidates]);
        onLog('IMPORTAÇÃO', `${newCandidates.length} candidatos importados para ${currentPss?.title}.`);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDecline = () => {
    if (!showDeclineModal) return;
    setConvocations(prev => prev.map(c => 
      c.id === showDeclineModal.id ? { 
        ...c, 
        status: ConvocationStatus.DECLINED, 
        convocationAct: undefined, 
        convocationDate: undefined 
      } : c
    ));
    onLog('DESISTÊNCIA', `Candidato ${showDeclineModal.name} inabilitado por desistência registrada.`);
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
    onLog('CHAMAMENTO', `Convocação ${sanitizedAct} emitida.`);
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
    // Bloqueia seleção se já houver convocação ativa OU se for desistente
    if (!cand || cand.convocationAct || cand.status === ConvocationStatus.DECLINED) return; 
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
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
                    <button onClick={(e) => { e.stopPropagation(); handleArchivePss(p.id, !p.isArchived); }} className="p-1.5 bg-white text-slate-400 hover:text-amber-600 rounded-lg shadow-sm border border-slate-100" title={p.isArchived ? "Restaurar" : "Arquivar"}>{p.isArchived ? <Package size={12}/> : <Archive size={12}/>}</button>
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
                    {activeSubTab === 'classified' ? 'Ranking Geral de Habilitados' : activeSubTab === 'convoked' ? 'Gestão de Candidatos Convocados' : 'Sugestão de Substituição por Rescisão'}
                  </p>
                </div>
                {activeSubTab === 'classified' && canEdit && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-stretch bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 bg-slate-50 text-blue-600 text-[10px] font-black uppercase flex items-center hover:bg-blue-50 transition-all border-r border-slate-100">
                          <Upload size={14} className="mr-2"/> Importar
                      </button>
                      <button onClick={handleDownloadTemplate} className="px-4 py-2.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-all flex items-center bg-white" title="Modelo CSV">
                          <FileDown size={16} className="mr-2" /><span className="text-[9px] font-black uppercase">Modelo</span>
                      </button>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv, .txt" className="hidden" />
                    <button disabled={selectedIds.length === 0} onClick={() => setShowNominationModal(true)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg disabled:opacity-30 transition-all active:scale-95">Convocar Selecionados ({selectedIds.length})</button>
                  </div>
                )}
              </div>

              {activeSubTab === 'substitution' ? (
                <div className="overflow-hidden border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Vaga a Substituir</th>
                        <th className="px-6 py-4">Órgão / Unidade</th>
                        <th className="px-6 py-4">Candidato Sugerido</th>
                        <th className="px-6 py-4">Mesma Concorrência</th>
                        <th className="px-6 py-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {substitutionSuggestions.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-black text-slate-800">{item.vacancy.code} (Posto #{item.slotIndex})</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{item.vacancy.type}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-700">{item.vacancy.agency}</p>
                            <p className="text-[8px] text-blue-500 font-black uppercase tracking-widest">{item.vacancy.unit}</p>
                          </td>
                          <td className="px-6 py-4">
                            {item.suggestedCandidate ? (
                              <>
                                <p className="font-black text-blue-700">{item.suggestedCandidate.name}</p>
                                <p className="text-[9px] text-slate-400 font-mono">Ranking #{item.suggestedCandidate.ranking}</p>
                              </>
                            ) : (
                              <p className="text-slate-400 italic">Nenhum habilitado disponível</p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[8px] font-black uppercase">{item.lastCompetition}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-amber-600 text-[8px] font-black uppercase flex items-center justify-end">
                                <RefreshCw size={10} className="mr-1 animate-spin-slow"/> Aguardando Convocação
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-hidden border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 border-b border-slate-100">
                      <tr>
                        {activeSubTab === 'classified' && <th className="px-6 py-4 w-10 text-center">
                          <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === candidates.filter(c => !c.convocationAct && c.status !== ConvocationStatus.DECLINED).length} onChange={() => setSelectedIds(selectedIds.length > 0 ? [] : candidates.filter(c => !c.convocationAct && c.status !== ConvocationStatus.DECLINED).map(c => c.id))} className="w-4 h-4 rounded" />
                        </th>}
                        <th className="px-6 py-4">Posição</th>
                        <th className="px-6 py-4">Nome / CPF</th>
                        <th className="px-6 py-4">Perfil Profissional</th>
                        <th className="px-6 py-4">Situação Operacional</th>
                        <th className="px-6 py-4 text-right">{activeSubTab === 'convoked' ? 'Ações de Chamamento' : ''}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {candidates.map(c => {
                        const isConvoked = !!c.convocationAct;
                        const isReclassified = c.status === ConvocationStatus.RECLASSIFIED;
                        const isDeclined = c.status === ConvocationStatus.DECLINED;

                        return (
                          <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${isConvoked && activeSubTab === 'classified' ? 'bg-blue-50/20' : ''} ${isDeclined ? 'bg-red-50/10 grayscale-[0.5]' : ''}`}>
                            {activeSubTab === 'classified' && (
                              <td className="px-6 py-4 text-center">
                                <input 
                                  type="checkbox" 
                                  checked={selectedIds.includes(c.id)} 
                                  onChange={() => toggleSelect(c.id)} 
                                  disabled={isConvoked || isDeclined} 
                                  className="w-4 h-4 rounded disabled:opacity-30 disabled:cursor-not-allowed" 
                                />
                              </td>
                            )}
                            <td className="px-6 py-4 font-black">#{c.ranking}</td>
                            <td className="px-6 py-4">
                              <p className={`font-bold ${isDeclined ? 'text-slate-400' : 'text-slate-800'}`}>{c.name}</p>
                              <p className="text-[9px] text-slate-400 font-mono">{c.cpf}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                  <Briefcase size={12} className="text-slate-300" />
                                  <span className="font-bold text-slate-600 uppercase text-[9px] tracking-tighter truncate max-w-[150px]">{c.profile}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[8px] font-black uppercase text-slate-400">{c.competition}</span>
                                {isConvoked && <span className="bg-blue-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase">CONVOCADO: {c.convocationAct}</span>}
                                {isReclassified && <span className="bg-amber-100 text-amber-700 text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-tighter">RECLASSIFICADO</span>}
                                {isDeclined && (
                                  <span className="bg-red-600 text-white text-[7px] font-black px-2 py-1 rounded-sm uppercase flex items-center">
                                    <Ban size={8} className="mr-1" /> INABILITADO - DESISTENTE
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                {activeSubTab === 'convoked' && canEdit && !isDeclined ? (
                                  <>
                                    <button onClick={() => { setNewRankingInput(nextRankingForFila); setShowReclassifyModal(c); }} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:text-amber-600 shadow-sm transition-all" title="Mover para Fim de Fila"><ArrowDownToLine size={14}/></button>
                                    <button onClick={() => setShowDeclineModal(c)} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:text-red-600 shadow-sm transition-all" title="Registrar Desistência"><UserMinus size={14}/></button>
                                  </>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-32 flex flex-col items-center justify-center text-center">
              <FileSpreadsheet size={64} className="text-slate-100 mb-6"/><h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Editais PSS</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest max-w-xs">Selecione um edital para gerenciar a lista de habilitados e convocados.</p>
            </div>
          )}
        </section>
      </div>

      {/* MODAL: EDITAR PSS */}
      {showEditPssModal && isAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-sm w-full p-10 shadow-2xl relative animate-in zoom-in duration-200 border border-slate-100">
            <h2 className="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tighter">Identificação do Edital</h2>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Número / Ano do Edital (Ex: PSS 001/2024)</label>
                <input value={pssFormTitle} onChange={e => setPssFormTitle(e.target.value)} className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 shadow-inner" placeholder="Ex: PSS 01/2024" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Data Final de Validade da Homologação</label>
                <input type="date" value={pssFormDate} onChange={e => setPssFormDate(e.target.value)} className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 shadow-inner" />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowEditPssModal(null)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px]">Cancelar</button>
                <button onClick={() => {
                  setPssList(prev => prev.map(p => p.id === showEditPssModal.id ? { ...p, title: pssFormTitle.toUpperCase(), validUntil: pssFormDate } : p));
                  onLog('EDITAR_PSS', `Edital ${showEditPssModal.id} atualizado.`);
                  setShowEditPssModal(null);
                }} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase shadow-lg">Salvar Configurações</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECLASSIFICAR */}
      {showReclassifyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-12 shadow-2xl text-center">
            <h2 className="text-3xl font-black mb-4 text-slate-800 uppercase tracking-tighter">Fim de Fila</h2>
            <p className="text-xs text-slate-500 mb-8 font-medium leading-relaxed">Você está reclassificando <strong>{showReclassifyModal.name}</strong> para o final da lista geral. Informe o novo ranking:</p>
            <div className="mb-8">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nova Posição Sugerida</label>
                <input type="number" value={newRankingInput} onChange={e => setNewRankingInput(parseInt(e.target.value))} className="w-32 border-b-2 border-amber-500 text-center text-3xl font-black bg-transparent outline-none focus:border-amber-600 transition-colors" />
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-4 tracking-widest">Saldo Atual: #{nextRankingForFila}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowReclassifyModal(null)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px]">Cancelar</button>
              <button onClick={handleReclassify} className="flex-1 py-4 bg-amber-600 text-white font-black rounded-2xl text-[10px] uppercase shadow-lg transition-all active:scale-95">Confirmar Reclassificação</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DESISTÊNCIA */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-12 shadow-2xl text-center">
            <div className="flex justify-center mb-6 text-red-600"><AlertCircle size={48} /></div>
            <h2 className="text-2xl font-black mb-4 text-slate-800 uppercase tracking-tighter">Confirmar Desistência?</h2>
            <p className="text-xs text-slate-500 mb-10 leading-relaxed font-medium px-4">Esta ação é <strong>definitiva</strong>. O candidato <strong>{showDeclineModal.name}</strong> será marcado como inabilitado para esta e futuras convocações deste PSS.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeclineModal(null)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px]">Cancelar</button>
              <button onClick={handleDecline} className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl text-[10px] uppercase shadow-lg transition-all active:scale-95">Confirmar Desistência</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONVOCAR */}
      {showNominationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-10 shadow-2xl">
            <h2 className="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tighter">Novo Chamamento</h2>
            <form onSubmit={handleNomination} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Número do Ato convocatório / Portaria</label>
                <input value={nominationAct} onChange={e => setNominationAct(e.target.value)} required placeholder="Ex: PORTARIA 123/2024" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 shadow-inner" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Data Publicação / Convocação</label>
                <input type="date" value={nominationDate} onChange={e => setNominationDate(e.target.value)} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 shadow-inner" />
              </div>
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase shadow-xl mt-4 active:scale-95 transition-all">Emitir Convocação</button>
              <button type="button" onClick={() => setShowNominationModal(false)} className="w-full text-slate-400 font-bold uppercase text-[10px] mt-2">Voltar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO PSS */}
      {showAddPssModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-10 shadow-2xl border border-slate-100 animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tighter">Cadastrar Novo Edital</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const newPss: PSS = { id: generateId(), title: pssFormTitle.toUpperCase(), validUntil: pssFormDate, isArchived: false, candidates: [] };
              setPssList(prev => [...prev, newPss]);
              setSelectedPssId(newPss.id);
              setShowAddPssModal(false);
            }} className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Número / Identificação do Edital PSS</label>
                <input value={pssFormTitle} onChange={e => setPssFormTitle(e.target.value)} required placeholder="Ex: PSS 001/2024 - EDUCAÇÃO" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 shadow-inner" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Data de Validade Final da Homologação</label>
                <input type="date" value={pssFormDate} onChange={e => setPssFormDate(e.target.value)} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 shadow-inner" />
              </div>
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase shadow-xl mt-4 hover:bg-blue-700 transition-all active:scale-95">Salvar e Selecionar Edital</button>
              <button type="button" onClick={() => setShowAddPssModal(false)} className="w-full text-slate-400 font-bold uppercase text-[10px] mt-2">Cancelar Operação</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConvocationManagement;
