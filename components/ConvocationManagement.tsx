
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ConvokedPerson, CompetitionType, ConvocationStatus, PSS, Vacancy, ContractStatus, UserRole } from '../types';
import { generateId, maskCPF, formatDisplayDate, normalizeString } from '../utils';
import { Search, FileUp, X, CheckCircle2, AlertCircle, Users, Table, RefreshCw, UserX, FileDown, Filter, ArrowDownToLine, UserPlus, FileSpreadsheet, Edit2, Trash2, ArrowRight, Download, CheckSquare, Square, Info, History, AlertTriangle, ArrowDown, Archive, Eye, EyeOff, FolderOpen, Briefcase } from 'lucide-react';
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
      alert("Bloqueio de Exclusão: Este edital não pode ser excluído pois possui dados históricos vinculados (Candidatos, Nomeações ou Grupos de Vagas). Utilize a função 'Arquivar' para ocultá-lo.");
      return;
    }

    if (!confirm(`Deseja realmente excluir permanentemente o edital "${pssToDelete.title}"? Esta ação é irreversível.`)) return;
    
    setPssList(prev => prev.filter(p => p.id !== id));
    if (selectedPssId === id) setSelectedPssId(null);
    onLog('PSS_EXCLUSAO', `Edital "${pssToDelete.title}" excluído.`);
    alert("Edital removido com sucesso.");
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
    onLog('NOMEAÇÃO', `${newConvocations.length} nomeados pelo Ato ${namingAct}.`);
    alert("Nomeação registrada com sucesso!");
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
            return { 
              ...c, 
              status: ConvocationStatus.RECLASSIFIED,
              originalRanking: c.originalRanking || c.ranking
            };
          }
          return c;
        });

        const allReclassified = updatedOriginals
          .filter(c => c.status === ConvocationStatus.RECLASSIFIED && !c.isReentry);

        allReclassified.sort((a, b) => (a.originalRanking || a.ranking) - (b.originalRanking || b.ranking));

        const baseListClean = updatedOriginals.filter(c => !c.isReentry);

        const reentryEntries = allReclassified.map((orig, idx) => ({
          ...orig,
          id: `reentry-${orig.cpf}`,
          ranking: N + idx + 1,
          status: ConvocationStatus.PENDING,
          isReentry: true,
          originalRanking: orig.originalRanking || orig.ranking
        }));

        return {
          ...pss,
          candidates: [...baseListClean, ...reentryEntries]
        };
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
        return {
          ...pss,
          candidates: pss.candidates.map(c => 
            c.cpf === targetCpf ? { ...c, status: ConvocationStatus.DECLINED } : c
          )
        };
      }
      return pss;
    }));
    onLog('GESTÃO_PSS', `${targetPerson.name} registrou desistência definitiva.`);
    setShowDeclineModal(false);
    setTargetPerson(null);
  };

  const filteredPssList = useMemo(() => pssList.filter(p => p.isArchived === showArchived), [pssList, showArchived]);
  const currentPss = useMemo(() => pssList.find(p => p.id === selectedPssId), [selectedPssId, pssList]);

  const selectableCandidates = useMemo(() => {
    if (!currentPss) return [];
    return currentPss.candidates.filter(c => {
      // O status aqui deve ser PENDING
      if (c.status !== ConvocationStatus.PENDING) return false;
      const isCurrentlyNamed = convocations.some(cv => 
        cv.cpf === c.cpf && cv.pssId === selectedPssId && (cv.status === ConvocationStatus.PENDING || cv.status === ConvocationStatus.HIRED)
      );
      // c.status is Pendente here, so checking if it is DECLINED directly on c is redundant.
      // We only need to check if the candidate has a DECLINED record in the convocations list.
      const isPermanentlyDeclined = convocations.some(cv => cv.cpf === c.cpf && cv.pssId === selectedPssId && cv.status === ConvocationStatus.DECLINED);
      return !isCurrentlyNamed && !isPermanentlyDeclined;
    });
  }, [currentPss, convocations, selectedPssId]);

  const substitutionData = useMemo(() => {
    if (!selectedPssId || !currentPss) return { gap: 0, candidates: [] };
    const pssVacancies = vacancies.filter(v => v.pssId === selectedPssId);
    const requirements: Record<string, number> = { [CompetitionType.AC]: 0, [CompetitionType.PCD]: 0, [CompetitionType.PPP]: 0 };
    pssVacancies.forEach(v => {
      for (let i = 1; i <= v.initialQuantity; i++) {
        const active = v.occupations.find(o => o.slotIndex === i && o.status === ContractStatus.ACTIVE);
        if (!active) {
          const history = v.occupations.filter(o => o.slotIndex === i).sort((a, b) => b.order - a.order);
          const lastOccupantComp = history.length > 0 ? history[0].competition : CompetitionType.AC;
          requirements[lastOccupantComp || CompetitionType.AC]++;
        }
      }
    });
    const pendingConvocations = convocations.filter(c => c.pssId === selectedPssId && c.status === ConvocationStatus.PENDING);
    pendingConvocations.forEach(c => {
      if (requirements[c.competition] > 0) { requirements[c.competition]--; } 
      else { requirements[CompetitionType.AC] = Math.max(0, requirements[CompetitionType.AC] - 1); }
    });
    const totalGap = Object.values(requirements).reduce((a, b) => a + b, 0);
    if (totalGap <= 0) return { gap: 0, candidates: [] };
    const availablePool = currentPss.candidates.filter(c => {
      if (c.status !== ConvocationStatus.PENDING) return false;
      const isDeclined = convocations.some(cv => cv.cpf === c.cpf && cv.pssId === selectedPssId && cv.status === ConvocationStatus.DECLINED);
      const isHiredOrNominated = convocations.some(cv => cv.cpf === c.cpf && cv.pssId === selectedPssId && (cv.status === ConvocationStatus.PENDING || cv.status === ConvocationStatus.HIRED));
      return !isDeclined && !isHiredOrNominated;
    }).sort((a, b) => a.ranking - b.ranking);
    const selectedSuggestions: ConvokedPerson[] = [];
    const poolCopy = [...availablePool];
    [CompetitionType.PCD, CompetitionType.PPP, CompetitionType.AC].forEach(type => {
      let needed = requirements[type];
      for (let i = 0; i < poolCopy.length && needed > 0; i++) {
        if (poolCopy[i].competition === type) { selectedSuggestions.push(poolCopy[i]); poolCopy.splice(i, 1); i--; needed--; }
      }
    });
    return { gap: totalGap, candidates: selectedSuggestions.sort((a, b) => a.ranking - b.ranking) };
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
            id: generateId(),
            name: values[0]?.trim(),
            cpf: values[1]?.trim(),
            email: values[2]?.trim(),
            profile: values[3]?.trim(),
            notice: values[4]?.trim(),
            pssId: selectedPssId,
            competition: values[5]?.trim().toUpperCase().includes('PCD') ? CompetitionType.PCD : values[5]?.trim().toUpperCase().includes('PPP') ? CompetitionType.PPP : CompetitionType.AC,
            ranking: parseInt(values[6]?.trim() || '0'),
            status: ConvocationStatus.PENDING,
            createdAt: new Date().toISOString().split('T')[0]
          });
        }
        setPssList(prev => prev.map(p => p.id === selectedPssId ? { ...p, candidates: [...p.candidates, ...newCandidates] } : p));
        alert("Importação concluída.");
      } catch { alert("Erro no CSV."); }
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
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pastas de Editais</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button 
                        type="button"
                        onClick={() => { setShowArchived(false); setSelectedPssId(null); }} 
                        className={`flex items-center justify-center py-2 rounded-lg text-[9px] font-black uppercase transition-all ${!showArchived ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                      >
                        <FolderOpen size={12} className="mr-1.5" /> Ativos
                      </button>
                      <button 
                        type="button"
                        onClick={() => { setShowArchived(true); setSelectedPssId(null); }} 
                        className={`flex items-center justify-center py-2 rounded-lg text-[9px] font-black uppercase transition-all ${showArchived ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400'}`}
                      >
                        <Archive size={12} className="mr-1.5" /> Arquivos
                      </button>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredPssList.length > 0 ? filteredPssList.map(p => {
                          const isExpired = !isAfter(parseISO(p.validUntil), today);
                          return (
                            <div key={p.id} className="relative group">
                                <div 
                                  onClick={() => setSelectedPssId(p.id)} 
                                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${selectedPssId === p.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                                >
                                    <div className="flex justify-between items-start">
                                      <p className="text-xs font-black text-slate-800 truncate pr-6">{p.title}</p>
                                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0 ${isExpired ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                        {isExpired ? 'Expirado' : 'Vigente'}
                                      </span>
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Validade: {formatDisplayDate(p.validUntil)}</p>
                                </div>
                                
                                {isAdmin && (
                                  <div className="absolute right-2 top-2 hidden group-hover:flex space-x-1 z-30 pointer-events-auto">
                                      <button 
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleArchivePSS(p.id); }} 
                                        className="p-1.5 bg-white shadow-xl border border-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-90" 
                                        title={p.isArchived ? "Restaurar" : "Arquivar"}
                                      >
                                        {p.isArchived ? <RefreshCw size={12} /> : <Archive size={12} />}
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeletePSS(p.id); }} 
                                        className="p-1.5 bg-white shadow-xl border border-slate-100 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all active:scale-90" 
                                        title="Excluir Permanentemente"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                  </div>
                                )}
                            </div>
                          );
                      }) : (
                        <div className="py-10 text-center">
                            <Briefcase size={24} className="mx-auto text-slate-200 mb-2" />
                            <p className="text-[9px] font-black uppercase text-slate-300 tracking-widest">Nenhum edital nesta pasta</p>
                        </div>
                      )}
                  </div>
                  
                  {isAdmin && !showArchived && (
                      <button onClick={() => setShowPssModal(true)} className="w-full mt-6 py-3 border-2 border-dashed border-slate-200 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-all">+ Novo Edital</button>
                  )}
              </div>
          </div>

          <div className="lg:col-span-3">
              {selectedPssId ? (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                  {activeSubTab === 'classified' && (
                    <>
                      <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/30 gap-6">
                          <div>
                              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Lista de Classificação</h2>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Selecione os candidatos habilitados</p>
                          </div>
                          <div className="flex items-center space-x-3">
                              {selectedCandidates.length > 0 && (
                                  <button onClick={() => setShowNamingModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center active:scale-95 transition-all">
                                      <UserPlus size={16} className="mr-2"/> Nomear Selecionados ({selectedCandidates.length})
                                  </button>
                              )}
                              <input type="file" ref={fileInputRef} onChange={handleCsvUpload} className="hidden" accept=".csv" />
                              <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                                <button onClick={handleDownloadTemplate} className="p-2.5 text-blue-600 hover:bg-white rounded-xl transition-all flex items-center gap-2" title="Baixar Modelo CSV">
                                  <FileDown size={18}/><span className="text-[9px] font-black uppercase tracking-widest hidden md:inline">Modelo</span>
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2">
                                  <FileUp size={18}/><span className="text-[9px] font-black uppercase tracking-widest hidden md:inline">Importar CSV</span>
                                </button>
                              </div>
                          </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-4 w-12 text-center">
                                        <input 
                                          type="checkbox" 
                                          className="w-5 h-5 rounded-md border-slate-300 text-blue-600 cursor-pointer"
                                          checked={selectableCandidates.length > 0 && selectedCandidates.length === selectableCandidates.length}
                                          onChange={(e) => setSelectedCandidates(e.target.checked ? selectableCandidates.map(c => c.id) : [])}
                                        />
                                    </th>
                                    <th className="px-8 py-4">Rank</th>
                                    <th className="px-8 py-4">Candidato / CPF</th>
                                    <th className="px-8 py-4 text-center">Perfil</th>
                                    <th className="px-8 py-4">Concorrência</th>
                                    <th className="px-8 py-4 text-right">Situação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[...(currentPss?.candidates || [])].sort((a,b) => a.ranking - b.ranking).map(c => {
                                    const isNominated = convocations.some(cv => 
                                        cv.cpf === c.cpf && cv.pssId === selectedPssId && (cv.status === ConvocationStatus.PENDING || cv.status === ConvocationStatus.HIRED)
                                    );
                                    const isDeclined = c.status === ConvocationStatus.DECLINED || convocations.some(cv => cv.cpf === c.cpf && cv.pssId === selectedPssId && cv.status === ConvocationStatus.DECLINED);
                                    const canSelect = c.status === ConvocationStatus.PENDING && !isNominated && !isDeclined;
                                    return (
                                        <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${!canSelect ? 'opacity-40 bg-slate-50/50' : ''}`}>
                                            <td className="px-8 py-4 text-center">
                                                {canSelect && (
                                                    <input 
                                                      type="checkbox" 
                                                      checked={selectedCandidates.includes(c.id)} 
                                                      onChange={() => setSelectedCandidates(prev => prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id])}
                                                      className="w-5 h-5 rounded-md border-slate-300 text-blue-600 cursor-pointer"
                                                    />
                                                )}
                                            </td>
                                            <td className="px-8 py-4">
                                              <div className="flex flex-col">
                                                <span className="font-black text-blue-600">{c.ranking}º</span>
                                                {c.originalRanking && c.ranking !== c.originalRanking && (
                                                  <span className="text-[8px] font-black text-slate-400 uppercase flex items-center mt-0.5">
                                                    <History size={8} className="mr-0.5"/> Reclassificado (Era {c.originalRanking}º)
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <p className="text-xs font-bold text-slate-800">{c.name}</p>
                                                <p className="text-[10px] text-slate-400 font-mono tracking-tighter">{maskCPF(c.cpf)}</p>
                                            </td>
                                            <td className="px-8 py-4 text-center">
                                                <span className="text-[10px] font-black text-slate-600 uppercase bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">{c.profile}</span>
                                            </td>
                                            <td className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">{c.competition}</td>
                                            <td className="px-8 py-4 text-right">
                                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${
                                                  isNominated ? 'text-blue-600 bg-blue-50 border-blue-100' : 
                                                  isDeclined ? 'text-red-500 bg-red-50 border-red-100' : 
                                                  c.status === ConvocationStatus.RECLASSIFIED ? 'text-amber-600 bg-amber-50 border-amber-100' :
                                                  'text-green-600 bg-green-50 border-green-100'
                                                }`}>
                                                    {isNominated ? 'Nomeado' : isDeclined ? 'Desistente' : c.status === ConvocationStatus.RECLASSIFIED ? 'Fim de Fila (Original)' : 'Habilitado'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {activeSubTab === 'convoked' && (
                    <>
                        <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Candidatos Nomeados</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Gestão de pendências e desistências</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-5">Ato / Portaria</th>
                                        <th className="px-8 py-5">Candidato</th>
                                        <th className="px-8 py-5 text-right">Ações de Gestão</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {[...convocations].filter(c => c.pssId === selectedPssId).sort((a,b) => (b.convocationDate || '').localeCompare(a.convocationDate || '')).map(c => (
                                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-8 py-5">
                                                <p className="font-black text-slate-800 text-xs">{c.convocationAct}</p>
                                                <p className="text-[9px] text-slate-400 font-bold">{formatDisplayDate(c.convocationDate || '')}</p>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="text-xs font-bold text-slate-700">{c.name}</p>
                                                <p className="text-[10px] text-slate-400 font-mono tracking-tighter">{maskCPF(c.cpf)}</p>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                {c.status === ConvocationStatus.PENDING && (
                                                    <div className="flex justify-end space-x-2">
                                                        <button type="button" onClick={() => { setTargetPerson(c); setShowEndOfQueueModal(true); }} className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase border border-amber-100 hover:bg-amber-600 hover:text-white transition-all shadow-sm active:scale-95">Fim de Fila</button>
                                                        <button type="button" onClick={() => { setTargetPerson(c); setShowDeclineModal(true); }} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95">Desistência</button>
                                                    </div>
                                                )}
                                                {c.status === ConvocationStatus.HIRED && <span className="text-[10px] font-black text-green-600 uppercase border border-green-100 px-3 py-1.5 rounded-xl bg-green-50">Contratado</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                  )}
                  
                  {activeSubTab === 'substitution' && (
                    <div className="p-8">
                        <div className="bg-blue-50 border-2 border-blue-100 rounded-[2rem] p-8 mb-6 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <Info className="text-blue-600" size={24} />
                                <div>
                                    <h3 className="text-lg font-black text-blue-900 uppercase">Sugestões de Reposição</h3>
                                    <p className="text-sm text-blue-700 font-medium">Candidatos habilitados para preencher postos livres ({substitutionData.gap})</p>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto rounded-[2rem] border border-slate-100">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                    <tr><th className="px-8 py-5">Rank</th><th className="px-8 py-5">Candidato</th><th className="px-8 py-5 text-right">Status</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {substitutionData.candidates.map(c => (
                                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-8 py-5 font-black text-blue-600">{c.ranking}º</td>
                                            <td className="px-8 py-5">
                                                <p className="text-xs font-bold text-slate-800">{c.name}</p>
                                                <p className="text-[10px] text-slate-400 font-mono">{maskCPF(c.cpf)}</p>
                                            </td>
                                            <td className="px-8 py-5 text-right"><span className="px-3 py-1 bg-green-50 text-green-700 rounded-xl text-[9px] font-black uppercase border border-green-100">Reposição Sugerida</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-32 flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8"><FileSpreadsheet size={48} className="text-slate-200"/></div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">Selecione um Edital</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest max-w-xs leading-relaxed">Navegue pelas pastas à esquerda para gerenciar as classificações.</p>
                </div>
              )}
          </div>
      </div>

      {/* MODAL: NOVO PSS */}
      {showPssModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-12 shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-3xl font-black mb-8 text-slate-800 uppercase tracking-tighter leading-none">Novo PSS</h2>
            <form onSubmit={handleAddPSS} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título do Edital</label>
                <input name="title" required className="mt-2 w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Validade</label>
                <input type="date" name="validUntil" required className="mt-2 w-full border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold bg-slate-50 focus:border-blue-500 outline-none" />
              </div>
              <div className="flex justify-end gap-4 mt-10">
                <button type="button" onClick={() => setShowPssModal(false)} className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-widest">Cancelar</button>
                <button type="submit" className="px-12 py-4 bg-blue-600 text-white font-black text-xs uppercase rounded-2xl shadow-xl active:scale-95">Criar Edital</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOMEAR SELECIONADOS */}
      {showNamingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-12 shadow-2xl animate-in zoom-in duration-200 border border-slate-100 relative">
            <button onClick={() => setShowNamingModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <h2 className="text-3xl font-black mb-1 text-slate-800 uppercase tracking-tighter">Nomear Candidatos</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8">{selectedCandidates.length} selecionados</p>
            <form onSubmit={handleNamingSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ato de Nomeação / Portaria</label>
                <input value={namingAct} onChange={e => setNamingAct(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="Ex: Portaria Nº 123/2024" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data da Nomeação</label>
                <input type="date" value={namingDate} onChange={e => setNamingDate(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
              </div>
              <div className="flex justify-end gap-3 mt-10">
                <button type="button" onClick={() => setShowNamingModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">Confirmar Nomeação</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR FIM DE FILA */}
      {showEndOfQueueModal && targetPerson && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-10 shadow-2xl border border-slate-100 animate-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-6">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-2xl font-black mb-2 text-slate-800 uppercase tracking-tighter">Mover para Fim de Fila?</h2>
                <p className="text-sm text-slate-500 font-medium mb-8">
                    O candidato <strong>{targetPerson.name}</strong> será removido das nomeações pendentes e reclassificado para a última posição do edital.
                </p>
                <div className="flex w-full gap-3">
                    <button onClick={() => setShowEndOfQueueModal(false)} className="flex-1 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                    <button onClick={handleConfirmEndOfQueue} className="flex-1 py-4 bg-amber-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">Confirmar Reclassificação</button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR DESISTÊNCIA */}
      {showDeclineModal && targetPerson && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-10 shadow-2xl border border-slate-100 animate-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
                    <UserX size={32} />
                </div>
                <h2 className="text-2xl font-black mb-2 text-slate-800 uppercase tracking-tighter">Registrar Desistência?</h2>
                <p className="text-sm text-slate-500 font-medium mb-8">
                    Confirma a desistência definitiva de <strong>{targetPerson.name}</strong>? Esta ação é irreversível e o candidato não poderá mais ser nomeado neste edital.
                </p>
                <div className="flex w-full gap-3">
                    <button onClick={() => setShowDeclineModal(false)} className="flex-1 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                    <button onClick={handleConfirmDecline} className="flex-1 py-4 bg-red-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">Confirmar Desistência</button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConvocationManagement;
