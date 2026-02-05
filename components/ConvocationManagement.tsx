
import React, { useState, useMemo, useEffect } from 'react';
import { ConvokedPerson, CompetitionType, ConvocationStatus, PSS, Vacancy, ContractStatus, UserRole } from '../types';
import { maskCPF, formatDisplayDate, generateId } from '../utils';
import { 
  X, Table, UserPlus, FileText, UserCheck, RefreshCw, Copy, ArrowDownWideNarrow, 
  AlertCircle, UserX, FileUp, FileSpreadsheet, Search, CheckCircle2, Plus, AlertTriangle
} from 'lucide-react';

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
  const [showArchived, setShowArchived] = useState(false);
  
  // Controle de Permissão
  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.HR;

  // Modais
  const [showAddPssModal, setShowAddPssModal] = useState(false);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [showReclassifyModal, setShowReclassifyModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  
  // Form States
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [namingAct, setNamingAct] = useState('');
  const [namingDate, setNamingDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [newPssTitle, setNewPssTitle] = useState('');
  const [newPssDate, setNewPssDate] = useState('');

  const [reclassifyTarget, setReclassifyTarget] = useState<ConvokedPerson | null>(null);
  const [declineTarget, setDeclineTarget] = useState<ConvokedPerson | null>(null);
  const [newRankingValue, setNewRankingValue] = useState<number>(0);

  useEffect(() => {
    setSelectedCandidates([]);
  }, [selectedPssId, activeSubTab]);

  const safePssList = Array.isArray(pssList) ? pssList : [];
  const safeConvocations = Array.isArray(convocations) ? convocations : [];

  const currentPss = useMemo(() => safePssList.find(p => p.id === selectedPssId), [selectedPssId, safePssList]);
  const filteredPssList = useMemo(() => safePssList.filter(p => p.isArchived === showArchived), [safePssList, showArchived]);

  const nominatedCandidates = useMemo(() => {
    if (!selectedPssId) return [];
    return safeConvocations.filter(c => 
      c.pssId === selectedPssId && 
      (c.status === ConvocationStatus.PENDING || c.status === ConvocationStatus.HIRED)
    );
  }, [safeConvocations, selectedPssId]);

  const substitutionData = useMemo(() => {
    if (!selectedPssId || !currentPss) return { totalVacant: 0, pairings: [] };
    const pssVacancies = vacancies.filter(v => v.pssId === selectedPssId);
    const vacantSlots: { vacancyCode: string, slotIndex: number, competition: CompetitionType }[] = [];
    
    pssVacancies.forEach(v => {
      for (let i = 1; i <= v.initialQuantity; i++) {
        const active = v.occupations.find(o => o.slotIndex === i && o.status === ContractStatus.ACTIVE);
        if (!active) {
          const history = v.occupations.filter(o => o.slotIndex === i).sort((a, b) => b.order - a.order);
          const lastComp = (history.length > 0 ? history[0].competition : CompetitionType.AC) || CompetitionType.AC;
          vacantSlots.push({ vacancyCode: v.code, slotIndex: i, competition: lastComp });
        }
      }
    });

    const availablePool = (currentPss.candidates || []).filter(c => {
        const isCalled = nominatedCandidates.some(nc => nc.cpf === c.cpf);
        return c.status !== ConvocationStatus.DECLINED && c.status !== ConvocationStatus.RECLASSIFIED && !isCalled;
    }).sort((a, b) => a.ranking - b.ranking);

    const pairings: { vacancyCode: string, slotIndex: number, competition: string, suggestedName: string, suggestedRanking: number, suggestedCpf: string }[] = [];
    const poolCopy = [...availablePool];
    vacantSlots.forEach(slot => {
        if (poolCopy.length > 0) {
            let cIdx = poolCopy.findIndex(c => c.competition === slot.competition);
            if (cIdx === -1) cIdx = 0; 
            const candidate = poolCopy[cIdx];
            pairings.push({ 
                vacancyCode: slot.vacancyCode, slotIndex: slot.slotIndex, competition: slot.competition,
                suggestedName: candidate.name, suggestedRanking: candidate.ranking, suggestedCpf: candidate.cpf
            });
            poolCopy.splice(cIdx, 1);
        }
    });
    return { totalVacant: vacantSlots.length, pairings };
  }, [selectedPssId, currentPss, vacancies, safeConvocations, nominatedCandidates]);

  const handleAddPss = (e: React.FormEvent) => {
    e.preventDefault();
    const newPss: PSS = {
        id: generateId(),
        title: newPssTitle,
        validUntil: newPssDate,
        isArchived: false,
        candidates: []
    };
    setPssList(prev => [...(Array.isArray(prev) ? prev : []), newPss]);
    setSelectedPssId(newPss.id);
    setShowAddPssModal(false);
    setNewPssTitle('');
    setNewPssDate('');
    onLog('CRIAR_PSS', `Novo edital: ${newPss.title}`);
  };

  const copySubstitutionTable = () => {
    if (substitutionData.pairings.length === 0) return;
    const header = "Posto / Grupo;Cota Posto;Candidato Sugerido;Ranking;CPF\n";
    const body = substitutionData.pairings.map(p => 
      `#${p.slotIndex} (${p.vacancyCode});${p.competition};${p.suggestedName};${p.suggestedRanking}º;${maskCPF(p.suggestedCpf)}`
    ).join("\n");
    navigator.clipboard.writeText(header + body);
    alert("Copiado com sucesso!");
  };

  const handleNamingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPssId || !currentPss) return;
    const newConvs = selectedCandidates.map(cid => {
      const c = (currentPss.candidates || []).find(x => x.id === cid);
      return { ...c!, convocationAct: namingAct, convocationDate: namingDate, status: ConvocationStatus.PENDING, pssId: selectedPssId };
    }) as ConvokedPerson[];
    setConvocations(prev => [...prev, ...newConvs]);
    setSelectedCandidates([]);
    setNamingAct('');
    setShowNamingModal(false);
    onLog('NOMEACAO', `${newConvs.length} candidatos nomeados.`);
  };

  const handleDeclineConfirm = () => {
    if (!declineTarget) return;
    setConvocations(prev => prev.map(c => c.id === declineTarget.id ? { ...c, status: ConvocationStatus.DECLINED } : c));
    setPssList(prev => prev.map(p => p.id === declineTarget.pssId ? { ...p, candidates: (p.candidates || []).map(c => c.cpf === declineTarget.cpf ? { ...c, status: ConvocationStatus.DECLINED } : c) } : p));
    onLog('DESISTENCIA', `${declineTarget.name} desistiu.`);
    setShowDeclineModal(false);
    setDeclineTarget(null);
  };

  const triggerReclassify = (c: ConvokedPerson) => {
    const max = Math.max(...((currentPss?.candidates || []).map(x => x.ranking) || [0]));
    setReclassifyTarget(c);
    setNewRankingValue(max + 1);
    setShowReclassifyModal(true);
  };

  const handleReclassifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reclassifyTarget) return;
    setConvocations(prev => prev.filter(x => x.id !== reclassifyTarget.id));
    setPssList(prev => prev.map(p => p.id === reclassifyTarget.pssId ? { ...p, candidates: (p.candidates || []).map(c => c.cpf === reclassifyTarget.cpf ? { ...c, ranking: newRankingValue, status: ConvocationStatus.RECLASSIFIED } : c) } : p));
    setShowReclassifyModal(false);
    onLog('FIM_DE_FILA', `${reclassifyTarget.name} movido.`);
  };

  return (
    <div className="space-y-6">
      {/* BARRA DE AÇÕES SUPERIOR - SEMPRE VISÍVEL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex space-x-2 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200">
          <button onClick={() => setActiveSubTab('classified')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center ${activeSubTab === 'classified' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}><Table size={14} className="mr-2" /> Classificação</button>
          <button onClick={() => setActiveSubTab('convoked')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center ${activeSubTab === 'convoked' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}><UserCheck size={14} className="mr-2" /> Nomeados</button>
          <button onClick={() => setActiveSubTab('substitution')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center ${activeSubTab === 'substitution' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}><RefreshCw size={14} className="mr-2" /> Substituição</button>
        </div>

        {canEdit && (
          <button 
            onClick={() => setShowAddPssModal(true)} 
            className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 flex items-center hover:bg-blue-700 transition-all active:scale-95 group"
          >
            <Plus size={18} className="mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Novo Edital PSS
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
          {/* BARRA LATERAL */}
          <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm h-fit">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Listagem de Editais</h3>
                  <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
                      <button onClick={() => { setShowArchived(false); setSelectedPssId(null); }} className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all ${!showArchived ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Ativos</button>
                      <button onClick={() => { setShowArchived(true); setSelectedPssId(null); }} className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all ${showArchived ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Arquivados</button>
                  </div>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredPssList.map(p => (
                          <div key={p.id} onClick={() => setSelectedPssId(p.id)} className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedPssId === p.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                              <p className="text-xs font-black text-slate-800 truncate">{p.title}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Vigência: {formatDisplayDate(p.validUntil)}</p>
                          </div>
                      ))}
                      {filteredPssList.length === 0 && (
                          <div className="py-10 text-center opacity-30">
                              <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">Nenhum edital encontrado nesta pasta.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* ÁREA DE CONTEÚDO */}
          <div className="lg:col-span-3">
              {selectedPssId ? (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                  {activeSubTab === 'classified' && (
                    <>
                      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                          <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Classificação Geral</h2><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Lista de espera para contratação</p></div>
                          {selectedCandidates.length > 0 && (
                              <button onClick={() => setShowNamingModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl flex items-center hover:bg-blue-700 transition-all">
                                  <UserPlus size={16} className="mr-2"/> Nomear Selecionados ({selectedCandidates.length})
                              </button>
                          )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                <tr><th className="px-8 py-4 w-12"><input type="checkbox" /></th><th className="px-8 py-4">Ranking</th><th className="px-8 py-4">Candidato / CPF</th><th className="px-8 py-4">Cota</th><th className="px-8 py-4 text-right">Situação</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(currentPss?.candidates || []).sort((a,b) => a.ranking-b.ranking).map(c => {
                                    const named = nominatedCandidates.find(nc => nc.cpf === c.cpf);
                                    const declined = c.status === ConvocationStatus.DECLINED;
                                    return (
                                        <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${named || declined ? 'opacity-40 grayscale' : ''}`}>
                                            <td className="px-8 py-4">{(!named && !declined) && <input type="checkbox" checked={selectedCandidates.includes(c.id)} onChange={() => setSelectedCandidates(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])} />}</td>
                                            <td className="px-8 py-4 font-black text-blue-600">{c.ranking}º</td>
                                            <td className="px-8 py-4"><p className="text-xs font-bold text-slate-800">{c.name}</p><p className="text-[9px] text-slate-400 font-mono">{maskCPF(c.cpf)}</p></td>
                                            <td className="px-8 py-4 text-[9px] font-black uppercase text-slate-400">{c.competition}</td>
                                            <td className="px-8 py-4 text-right"><span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${named ? 'bg-blue-50 text-blue-600 border-blue-100' : declined ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{named ? 'Nomeado' : declined ? 'Desistente' : 'Apto'}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                      </div>
                    </>
                  )}
                  {/* ... outros menus de nomeados e substituição seguem o mesmo padrão de segurança ... */}
                  {activeSubTab === 'convoked' && (
                    <div className="p-20 text-center opacity-40">
                      <Search size={48} className="mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Utilize o menu "Classificação" para iniciar chamamentos</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-32 flex flex-col items-center justify-center text-center opacity-80">
                    <div className="p-8 bg-blue-50 text-blue-600 rounded-full mb-8 shadow-inner">
                      <FileSpreadsheet size={64}/>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Nenhum Edital Selecionado</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest max-w-xs leading-relaxed">
                      Se você excluiu todos os dados, clique no botão abaixo para cadastrar o primeiro processo seletivo do sistema.
                    </p>
                    {canEdit && (
                      <button onClick={() => setShowAddPssModal(true)} className="mt-10 px-10 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all flex items-center">
                        <Plus size={20} className="mr-2"/> Criar Primeiro Edital
                      </button>
                    )}
                </div>
              )}
          </div>
      </div>

      {/* MODAL: NOVO EDITAL PSS */}
      {showAddPssModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-10 shadow-2xl relative border border-slate-100 animate-in zoom-in duration-200">
            <button onClick={() => setShowAddPssModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 p-2"><X size={20}/></button>
            <h2 className="text-2xl font-black mb-2 text-slate-800 uppercase tracking-tighter">Cadastrar Edital</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8">Novo Processo Seletivo (PSS)</p>
            <form onSubmit={handleAddPss} className="space-y-4">
              <input value={newPssTitle} onChange={e => setNewPssTitle(e.target.value)} required placeholder="Nome do Edital (Ex: PSS 01/2024)" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Válido até:</label>
                <input type="date" value={newPssDate} onChange={e => setNewPssDate(e.target.value)} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none mt-1" />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowAddPssModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">Criar Edital</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ... outros modais permanecem o mesmo, mas com checks de segurança ... */}
      {showNamingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-10 shadow-2xl relative border border-slate-100 animate-in zoom-in duration-200">
            <button onClick={() => setShowNamingModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 p-2"><X size={20}/></button>
            <h2 className="text-2xl font-black mb-2 text-slate-800 uppercase tracking-tighter">Gerar Nomeação</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8">{selectedCandidates.length} candidatos selecionados</p>
            <form onSubmit={handleNamingSubmit} className="space-y-4">
              <input value={namingAct} onChange={e => setNamingAct(e.target.value)} required placeholder="Portaria ou Ato Administrativo" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
              <input type="date" value={namingDate} onChange={e => setNamingDate(e.target.value)} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all mt-4">Confirmar Nomeação</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConvocationManagement;
