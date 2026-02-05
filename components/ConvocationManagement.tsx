
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ConvokedPerson, CompetitionType, ConvocationStatus, PSS, Vacancy, ContractStatus, UserRole } from '../types';
import { generateId, maskCPF, formatDisplayDate, normalizeString } from '../utils';
import { 
  Search, FileUp, X, CheckCircle2, AlertCircle, Users, Table, RefreshCw, 
  UserX, FileDown, Filter, ArrowDownToLine, UserPlus, FileSpreadsheet, 
  Edit2, Trash2, ArrowRight, Download, CheckSquare, Square, Info, 
  History, AlertTriangle, ArrowDown, Archive, Eye, EyeOff, FolderOpen, Briefcase, Hash
} from 'lucide-react';
import { isAfter, startOfDay, parseISO } from 'date-fns';

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

const ConvocationManagement: React.FC<ConvocationManagementProps> = ({ convocations, setConvocations, pssList, setPssList, vacancies, profiles, userRole, onLog }) => {
  const [activeSubTab, setActiveSubTab] = useState<'classified' | 'convoked' | 'substitution'>('classified');
  const [selectedPssId, setSelectedPssId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  
  // Modais
  const [showPssModal, setShowPssModal] = useState(false);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [showEndOfQueueModal, setShowEndOfQueueModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  
  // Estados de Operação
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [namingAct, setNamingAct] = useState('');
  const [namingDate, setNamingDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [targetPerson, setTargetPerson] = useState<ConvokedPerson | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = userRole === UserRole.ADMIN;
  const today = startOfDay(new Date());

  useEffect(() => {
    setSelectedCandidates([]);
  }, [selectedPssId, activeSubTab]);

  const handleDownloadTemplate = () => {
    const headers = "Nome;CPF;Email;Perfil;Edital;Concorrencia;Ranking";
    const example = "João Silva;12345678900;joao@email.com;Professor Substituto;Edital 01/2024;AC;1";
    const csvContent = "\ufeff" + headers + "\n" + example;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_importacao_pss.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddPSS = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPss: PSS = {
        id: generateId(),
        title: formData.get('title') as string,
        validUntil: formData.get('validUntil') as string,
        isArchived: false,
        candidates: []
    };
    setPssList(prev => [...prev, newPss]);
    setShowPssModal(false);
    onLog('PSS', `Novo PSS criado: ${newPss.title}`);
  };

  const handleArchivePSS = (id: string) => {
    const pss = pssList.find(p => p.id === id);
    if (!pss) return;
    const newState = !pss.isArchived;
    
    if (confirm(`Deseja ${newState ? 'arquivar' : 'restaurar'} o edital "${pss.title}"?`)) {
      setPssList(prev => prev.map(p => p.id === id ? { ...p, isArchived: newState } : p));
      onLog('PARAMETRIZAÇÃO_PSS', `Edital "${pss.title}" ${newState ? 'arquivado' : 'restaurado'}.`);
      if (newState && selectedPssId === id) setSelectedPssId(null);
    }
  };

  const handleDeletePSS = (id: string) => {
    const pssToDelete = pssList.find(p => p.id === id);
    if (!pssToDelete) return;
    const candidatesCount = pssToDelete.candidates?.length || 0;
    const hasConvocations = convocations.some(c => c.pssId === id);
    const hasVacancies = vacancies.some(v => v.pssId === id);
    if (candidatesCount > 0 || hasConvocations || hasVacancies) {
      alert("Bloqueio de Exclusão: Este edital não pode ser excluído pois possui dados históricos vinculados.");
      return;
    }
    if (!confirm(`Deseja excluir permanentemente o edital "${pssToDelete.title}"?`)) return;
    setPssList(prev => prev.filter(p => p.id !== id));
    if (selectedPssId === id) setSelectedPssId(null);
    onLog('PSS_EXCLUSAO', `Edital "${pssToDelete.title}" excluído.`);
  };

  const handleNamingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCandidates.length === 0 || !selectedPssId) return;
    const pss = pssList.find(p => p.id === selectedPssId);
    if (!pss) return;
    const newConvocations: ConvokedPerson[] = [];
    selectedCandidates.forEach(cid => {
      const candidate = pss.candidates.find(c => c.id === cid);
      if (candidate) {
        newConvocations.push({
          ...candidate,
          convocationAct: namingAct,
          convocationDate: namingDate,
          status: ConvocationStatus.PENDING,
          pssId: selectedPssId
        });
      }
    });
    setConvocations(prev => [...prev, ...newConvocations]);
    setSelectedCandidates([]);
    setNamingAct('');
    setShowNamingModal(false);
    onLog('NOMEAÇÃO', `${newConvocations.length} nomeados.`);
  };

  const handleConfirmEndOfQueue = () => {
    if (!targetPerson) return;
    const targetPssId = targetPerson.pssId || selectedPssId;
    const targetCpf = targetPerson.cpf;
    setPssList(prevPssList => prevPssList.map(pss => {
      if (pss.id === targetPssId) {
        const baseCandidates = pss.candidates.filter(c => !c.isReentry);
        const N = baseCandidates.length;
        const updatedOriginals = pss.candidates.map(c => {
          if (c.cpf === targetCpf && !c.isReentry) {
            return { ...c, status: ConvocationStatus.RECLASSIFIED, originalRanking: c.originalRanking || c.ranking };
          }
          return c;
        });
        const allReclassified = updatedOriginals.filter(c => c.status === ConvocationStatus.RECLASSIFIED && !c.isReentry).sort((a,b) => (a.originalRanking || a.ranking) - (b.originalRanking || b.ranking));
        const baseListClean = updatedOriginals.filter(c => !c.isReentry);
        const reentryEntries = allReclassified.map((orig, idx) => ({
          ...orig, id: `reentry-${orig.cpf}`, ranking: N + idx + 1, status: ConvocationStatus.PENDING, isReentry: true, originalRanking: orig.originalRanking || orig.ranking
        }));
        return { ...pss, candidates: [...baseListClean, ...reentryEntries] };
      }
      return pss;
    }));
    setConvocations(prev => prev.filter(c => c.id !== targetPerson.id));
    onLog('GESTÃO_PSS', `${targetPerson.name} movido para o Fim de Fila.`);
    setShowEndOfQueueModal(false);
    setTargetPerson(null);
  };

  const handleConfirmDecline = () => {
    if (!targetPerson) return;
    const targetPssId = targetPerson.pssId || selectedPssId;
    const targetCpf = targetPerson.cpf;
    setConvocations(prev => prev.filter(c => c.id !== targetPerson.id));
    setPssList(prev => prev.map(pss => {
      if (pss.id === targetPssId) {
        return { ...pss, candidates: pss.candidates.map(c => c.cpf === targetCpf ? { ...c, status: ConvocationStatus.DECLINED } : c) };
      }
      return pss;
    }));
    onLog('GESTÃO_PSS', `${targetPerson.name} registrou desistência.`);
    setShowDeclineModal(false);
    setTargetPerson(null);
  };

  const filteredPssList = useMemo(() => pssList.filter(p => p.isArchived === showArchived), [pssList, showArchived]);
  const currentPss = useMemo(() => pssList.find(p => p.id === selectedPssId), [selectedPssId, pssList]);

  const selectableCandidates = useMemo(() => {
    if (!currentPss) return [];
    return currentPss.candidates.filter(c => {
      if (c.status !== ConvocationStatus.PENDING) return false;
      const isCurrentlyNamed = convocations.some(cv => cv.cpf === c.cpf && cv.pssId === selectedPssId && (cv.status === ConvocationStatus.PENDING || cv.status === ConvocationStatus.HIRED));
      const isPermanentlyDeclined = convocations.some(cv => cv.cpf === c.cpf && cv.pssId === selectedPssId && cv.status === ConvocationStatus.DECLINED);
      return !isCurrentlyNamed && !isPermanentlyDeclined;
    });
  }, [currentPss, convocations, selectedPssId]);

  // LOGICA DE SUBSTITUIÇÃO MELHORADA
  const substitutionData = useMemo(() => {
    if (!selectedPssId || !currentPss) return { totalSlots: [], candidates: [] };
    const pssVacancies = vacancies.filter(v => v.pssId === selectedPssId);
    
    const vacantSlots: { vacancyCode: string, slotIndex: number, competition: CompetitionType }[] = [];
    
    pssVacancies.forEach(v => {
      for (let i = 1; i <= v.initialQuantity; i++) {
        const active = v.occupations.find(o => o.slotIndex === i && o.status === ContractStatus.ACTIVE);
        if (!active) {
          const history = v.occupations.filter(o => o.slotIndex === i).sort((a, b) => b.order - a.order);
          const lastOccupantComp = (history.length > 0 ? history[0].competition : CompetitionType.AC) || CompetitionType.AC;
          vacantSlots.push({ vacancyCode: v.code, slotIndex: i, competition: lastOccupantComp });
        }
      }
    });

    // Filtra nomeações pendentes para abater dos postos vagos
    const pendingConvocations = convocations.filter(c => c.pssId === selectedPssId && c.status === ConvocationStatus.PENDING);
    let slotsToSuggest = [...vacantSlots];
    
    pendingConvocations.forEach(c => {
        const idx = slotsToSuggest.findIndex(s => s.competition === c.competition);
        if (idx !== -1) { slotsToSuggest.splice(idx, 1); } 
        else {
            const acIdx = slotsToSuggest.findIndex(s => s.competition === CompetitionType.AC);
            if (acIdx !== -1) slotsToSuggest.splice(acIdx, 1);
        }
    });

    const availablePool = currentPss.candidates.filter(c => {
      if (c.status !== ConvocationStatus.PENDING) return false;
      const isDeclined = convocations.some(cv => cv.cpf === c.cpf && cv.pssId === selectedPssId && cv.status === ConvocationStatus.DECLINED);
      const isHiredOrNominated = convocations.some(cv => cv.cpf === c.cpf && cv.pssId === selectedPssId && (cv.status === ConvocationStatus.PENDING || cv.status === ConvocationStatus.HIRED));
      return !isDeclined && !isHiredOrNominated;
    }).sort((a, b) => a.ranking - b.ranking);

    const pairings: { slot: any, candidate: ConvokedPerson }[] = [];
    const poolCopy = [...availablePool];
    
    slotsToSuggest.forEach(slot => {
        const candidateIdx = poolCopy.findIndex(c => c.competition === slot.competition);
        if (candidateIdx !== -1) {
            pairings.push({ slot, candidate: poolCopy[candidateIdx] });
            poolCopy.splice(candidateIdx, 1);
        } else if (poolCopy.length > 0) {
            // Se não tiver do mesmo tipo, pega o próximo por ranking (geralmente AC)
            pairings.push({ slot, candidate: poolCopy[0] });
            poolCopy.splice(0, 1);
        }
    });

    return { totalSlots: vacantSlots, pairings };
  }, [selectedPssId, currentPss, vacancies, convocations]);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPssId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/);
        const newCandidates: ConvokedPerson[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const values = line.includes(';') ? line.split(';') : line.split(',');
          if (values.length < 7) continue;
          newCandidates.push({
            id: generateId(), name: values[0]?.trim(), cpf: values[1]?.trim(), email: values[2]?.trim(), profile: values[3]?.trim(), notice: values[4]?.trim(), pssId: selectedPssId, competition: values[5]?.trim().toUpperCase().includes('PCD') ? CompetitionType.PCD : values[5]?.trim().toUpperCase().includes('PPP') ? CompetitionType.PPP : CompetitionType.AC, ranking: parseInt(values[6]?.trim() || '0'), status: ConvocationStatus.PENDING, createdAt: new Date().toISOString().split('T')[0]
          });
        }
        setPssList(prev => prev.map(p => p.id === selectedPssId ? { ...p, candidates: [...p.candidates, ...newCandidates] } : p));
      } catch { alert("Erro CSV"); }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200">
        <button onClick={() => setActiveSubTab('classified')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'classified' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}><Table size={14} className="inline mr-2" /> Classificação</button>
        <button onClick={() => setActiveSubTab('convoked')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'convoked' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}><Users size={14} className="inline mr-2" /> Nomeados</button>
        <button onClick={() => setActiveSubTab('substitution')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'substitution' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}><RefreshCw size={14} className="inline mr-2" /> Substituição</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
          <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm h-fit">
                  <div className="flex justify-between items-center mb-6"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pastas de Editais</h3></div>
                  <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button type="button" onClick={() => { setShowArchived(false); setSelectedPssId(null); }} className={`flex items-center justify-center py-2 rounded-lg text-[9px] font-black uppercase transition-all ${!showArchived ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><FolderOpen size={12} className="mr-1.5" /> Ativos</button>
                      <button type="button" onClick={() => { setShowArchived(true); setSelectedPssId(null); }} className={`flex items-center justify-center py-2 rounded-lg text-[9px] font-black uppercase transition-all ${showArchived ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400'}`}><Archive size={12} className="mr-1.5" /> Arquivos</button>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredPssList.map(p => {
                          const isExpired = !isAfter(parseISO(p.validUntil), today);
                          return (
                            <div key={p.id} className="relative group" onClick={() => setSelectedPssId(p.id)}>
                                <div className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${selectedPssId === p.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                                    <div className="flex justify-between items-start">
                                      <p className="text-xs font-black text-slate-800 truncate pr-6">{p.title}</p>
                                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${isExpired ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{isExpired ? 'Expirado' : 'Vigente'}</span>
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Validade: {formatDisplayDate(p.validUntil)}</p>
                                </div>
                                {isAdmin && (
                                  <div className="absolute right-2 top-2 hidden group-hover:flex space-x-1 z-30"><button type="button" onClick={(e) => { e.stopPropagation(); handleArchivePSS(p.id); }} className="p-1.5 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-blue-600 shadow-xl">{p.isArchived ? <RefreshCw size={12} /> : <Archive size={12} />}</button></div>
                                )}
                            </div>
                          );
                      })}
                  </div>
                  {isAdmin && !showArchived && (<button onClick={() => setShowPssModal(true)} className="w-full mt-6 py-3 border-2 border-dashed border-slate-200 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:border-blue-400 transition-all">+ Novo Edital</button>)}
              </div>
          </div>

          <div className="lg:col-span-3">
              {selectedPssId ? (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                  {activeSubTab === 'classified' && (
                    <>
                      <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-slate-50/30 gap-6">
                          <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Lista de Classificação</h2><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Selecione para nomeação</p></div>
                          <div className="flex items-center space-x-3">
                              {selectedCandidates.length > 0 && (<button onClick={() => setShowNamingModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl flex items-center"><UserPlus size={16} className="mr-2"/> Nomear Selecionados ({selectedCandidates.length})</button>)}
                              <input type="file" ref={fileInputRef} onChange={handleCsvUpload} className="hidden" accept=".csv" />
                              <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm"><FileUp size={18}/></button>
                          </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-4 w-12"><input type="checkbox" className="w-5 h-5 rounded border-slate-300" checked={selectableCandidates.length > 0 && selectedCandidates.length === selectableCandidates.length} onChange={(e) => setSelectedCandidates(e.target.checked ? selectableCandidates.map(c => c.id) : [])} /></th>
                                    <th className="px-8 py-4">Rank</th>
                                    <th className="px-8 py-4">Candidato / CPF</th>
                                    <th className="px-8 py-4 text-center">Perfil</th>
                                    <th className="px-8 py-4 text-right">Situação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[...(currentPss?.candidates || [])].sort((a,b) => a.ranking - b.ranking).map(c => {
                                    const isNominated = convocations.some(cv => cv.cpf === c.cpf && cv.pssId === selectedPssId && (cv.status === ConvocationStatus.PENDING || cv.status === ConvocationStatus.HIRED));
                                    const isDeclined = c.status === ConvocationStatus.DECLINED || convocations.some(cv => cv.cpf === c.cpf && cv.pssId === selectedPssId && cv.status === ConvocationStatus.DECLINED);
                                    const canSelect = c.status === ConvocationStatus.PENDING && !isNominated && !isDeclined;
                                    return (
                                        <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${!canSelect ? 'opacity-40' : ''}`}>
                                            <td className="px-8 py-4 text-center">{canSelect && (<input type="checkbox" checked={selectedCandidates.includes(c.id)} onChange={() => setSelectedCandidates(prev => prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id])} className="w-5 h-5 rounded border-slate-300" />)}</td>
                                            <td className="px-8 py-4"><span className="font-black text-blue-600">{c.ranking}º</span></td>
                                            <td className="px-8 py-4"><p className="text-xs font-bold text-slate-800">{c.name}</p><p className="text-[10px] text-slate-400">{maskCPF(c.cpf)}</p></td>
                                            <td className="px-8 py-4 text-center"><span className="text-[10px] font-black text-slate-600 uppercase bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">{c.profile}</span></td>
                                            <td className="px-8 py-4 text-right"><span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${isNominated ? 'text-blue-600 bg-blue-50' : isDeclined ? 'text-red-500 bg-red-50' : 'text-green-600 bg-green-50'}`}>{isNominated ? 'Nomeado' : isDeclined ? 'Desistente' : 'Habilitado'}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {activeSubTab === 'substitution' && (
                    <div className="p-8 space-y-8">
                        <div className="bg-blue-600 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="text-3xl font-black uppercase tracking-tighter">Monitor de Reposição</h3>
                                <p className="text-blue-100 font-medium text-sm mt-2">Cruzamento automático de postos vagos com cadastro reserva.</p>
                                <div className="flex gap-4 mt-8">
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex-1">
                                        <p className="text-[9px] font-black uppercase opacity-60">Postos Livres</p>
                                        <p className="text-2xl font-black">{substitutionData.totalSlots.length}</p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex-1">
                                        <p className="text-[9px] font-black uppercase opacity-60">Sugestões Ativas</p>
                                        <p className="text-2xl font-black">{substitutionData.pairings.length}</p>
                                    </div>
                                </div>
                            </div>
                            <RefreshCw className="absolute -right-10 -bottom-10 text-white/5" size={240} />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {substitutionData.pairings.map((pair, idx) => (
                                <div key={idx} className="bg-white border border-slate-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between group hover:border-blue-200 hover:shadow-md transition-all">
                                    <div className="flex items-center space-x-6 mb-4 md:mb-0">
                                        <div className="flex flex-col items-center">
                                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black mb-1">
                                                #{pair.slot.slotIndex}
                                            </div>
                                            <span className="text-[9px] font-black uppercase text-slate-400">Posto</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pair.slot.vacancyCode}</p>
                                            <h4 className="text-lg font-black text-slate-800 tracking-tighter">NECESSITA REPOSIÇÃO</h4>
                                            <p className="text-[9px] font-bold text-blue-600 uppercase">Cota Requerida: {pair.slot.competition}</p>
                                        </div>
                                    </div>

                                    <div className="hidden md:block"><ArrowRight className="text-slate-200" size={24}/></div>

                                    <div className="flex items-center space-x-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-blue-600 uppercase">{pair.candidate.ranking}º Classificado</p>
                                            <p className="text-sm font-black text-slate-800">{pair.candidate.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{pair.candidate.competition}</p>
                                        </div>
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-200">
                                            <Hash size={16}/>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {substitutionData.pairings.length === 0 && (
                                <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                                    <CheckCircle2 size={40} className="mx-auto text-green-200 mb-4"/>
                                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Sem pendências de reposição</h4>
                                    <p className="text-[10px] text-slate-300 font-bold uppercase mt-2">Todos os postos deste edital estão providos ou nomeados.</p>
                                </div>
                            )}
                        </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-32 flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8"><FileSpreadsheet size={48} className="text-slate-200"/></div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">Selecione um Edital</h3>
                </div>
              )}
          </div>
      </div>

      {/* MODAL: NOVO PSS */}
      {showPssModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-12 shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-3xl font-black mb-8 text-slate-800 uppercase tracking-tighter leading-none">Novo Edital</h2>
            <form onSubmit={handleAddPSS} className="space-y-6">
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título</label><input name="title" required className="mt-2 w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 focus:border-blue-500 outline-none" /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Validade</label><input type="date" name="validUntil" required className="mt-2 w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 focus:border-blue-500 outline-none" /></div>
              <div className="flex justify-end gap-4 mt-10">
                <button type="button" onClick={() => setShowPssModal(false)} className="px-6 py-4 font-bold text-slate-400 text-xs uppercase">Cancelar</button>
                <button type="submit" className="px-12 py-4 bg-blue-600 text-white font-black text-xs uppercase rounded-2xl shadow-xl">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OUTROS MODAIS (NOMINAÇÃO, FIM DE FILA, DESISTÊNCIA) MANTIDOS CONFORME ORIGINAL */}
      {showNamingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-12 shadow-2xl animate-in zoom-in duration-200 border border-slate-100 relative">
            <button onClick={() => setShowNamingModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <h2 className="text-3xl font-black mb-1 text-slate-800 uppercase tracking-tighter">Nomear Candidatos</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8">{selectedCandidates.length} selecionados</p>
            <form onSubmit={handleNamingSubmit} className="space-y-6">
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ato / Portaria</label><input value={namingAct} onChange={e => setNamingAct(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="Ex: Portaria 123/2024" /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label><input type="date" value={namingDate} onChange={e => setNamingDate(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10" /></div>
              <div className="flex justify-end gap-3 mt-10">
                <button type="button" onClick={() => setShowNamingModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95">Confirmar Nomeação</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEndOfQueueModal && targetPerson && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-10 shadow-2xl border border-slate-100">
            <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-6"><AlertTriangle size={32} /></div>
                <h2 className="text-2xl font-black mb-2 text-slate-800 uppercase tracking-tighter">Mover para Fim de Fila?</h2>
                <p className="text-sm text-slate-500 font-medium mb-8">Candidato <strong>{targetPerson.name}</strong> será reclassificado para a última posição.</p>
                <div className="flex w-full gap-3">
                    <button onClick={() => setShowEndOfQueueModal(false)} className="flex-1 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                    <button onClick={handleConfirmEndOfQueue} className="flex-1 py-4 bg-amber-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl">Confirmar</button>
                </div>
            </div>
          </div>
        </div>
      )}

      {showDeclineModal && targetPerson && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-10 shadow-2xl border border-slate-100">
            <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6"><UserX size={32} /></div>
                <h2 className="text-2xl font-black mb-2 text-slate-800 uppercase tracking-tighter">Registrar Desistência?</h2>
                <p className="text-sm text-slate-500 font-medium mb-8">Confirma a desistência definitiva de <strong>{targetPerson.name}</strong>?</p>
                <div className="flex w-full gap-3">
                    <button onClick={() => setShowDeclineModal(false)} className="flex-1 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                    <button onClick={handleConfirmDecline} className="flex-1 py-4 bg-red-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl">Confirmar</button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConvocationManagement;
