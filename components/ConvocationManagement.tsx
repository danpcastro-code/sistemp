
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ConvokedPerson, CompetitionType, ConvocationStatus, PSS, Vacancy, ContractStatus, UserRole } from '../types';
import { generateId, maskCPF, formatDisplayDate } from '../utils';
import { 
  Search, X, Table, UserPlus, FileSpreadsheet, FileText, UserCheck, RefreshCw, ArrowRight, Clock, Hash, Check, FileUp, AlertCircle, UserX, ArrowDownWideNarrow
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

const ConvocationManagement: React.FC<ConvocationManagementProps> = ({ convocations, setConvocations, pssList, setPssList, vacancies, userRole, onLog }) => {
  const [activeSubTab, setActiveSubTab] = useState<'classified' | 'convoked' | 'substitution'>('classified');
  const [selectedPssId, setSelectedPssId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  
  const [showPssModal, setShowPssModal] = useState(false);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [namingAct, setNamingAct] = useState('');
  const [namingDate, setNamingDate] = useState(new Date().toISOString().split('T')[0]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedCandidates([]);
  }, [selectedPssId, activeSubTab]);

  const currentPss = useMemo(() => pssList.find(p => p.id === selectedPssId), [selectedPssId, pssList]);
  const filteredPssList = useMemo(() => pssList.filter(p => p.isArchived === showArchived), [pssList, showArchived]);

  const nominatedCandidates = useMemo(() => {
    if (!selectedPssId) return [];
    return convocations.filter(c => 
      c.pssId === selectedPssId && 
      (c.status === ConvocationStatus.PENDING || c.status === ConvocationStatus.HIRED)
    );
  }, [convocations, selectedPssId]);

  // LÓGICA DE SUBSTITUIÇÃO REFINADA
  const substitutionData = useMemo(() => {
    if (!selectedPssId || !currentPss) return { totalVacant: 0, pairings: [] };
    
    const pssVacancies = vacancies.filter(v => v.pssId === selectedPssId);
    const vacantSlots: { vacancyCode: string, slotIndex: number, competition: CompetitionType }[] = [];
    
    // 1. Identificar postos Livres (Sem contrato Ativo)
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

    // 2. Pool de Candidatos Aptos (Exclui quem já está trabalhando ou desistiu)
    const candidatePool = currentPss.candidates.filter(c => {
        const globalInfo = convocations.find(nc => nc.cpf === c.cpf && nc.pssId === selectedPssId);
        if (!globalInfo) return true;
        // Permite sugerir quem já foi nomeado (Pendente) para que o RH veja que o processo está em curso
        return globalInfo.status !== ConvocationStatus.HIRED && globalInfo.status !== ConvocationStatus.DECLINED;
    }).sort((a, b) => a.ranking - b.ranking);

    // 3. Mapeamento 1 para 1 (Posto Vago -> Candidato)
    const pairings: { slot: any, candidate: ConvokedPerson, isAlreadyNamed: boolean }[] = [];
    const poolCopy = [...candidatePool];
    
    vacantSlots.forEach(slot => {
        if (poolCopy.length > 0) {
            let cIdx = poolCopy.findIndex(c => c.competition === slot.competition);
            if (cIdx === -1) cIdx = 0; 
            
            const candidate = poolCopy[cIdx];
            const globalInfo = convocations.find(nc => nc.cpf === candidate.cpf && nc.pssId === selectedPssId);
            
            pairings.push({ 
                slot, 
                candidate, 
                isAlreadyNamed: globalInfo?.status === ConvocationStatus.PENDING 
            });

            poolCopy.splice(cIdx, 1);
        }
    });

    return { totalVacant: vacantSlots.length, pairings };
  }, [selectedPssId, currentPss, vacancies, convocations]);

  const handleNamingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPssId || !currentPss) return;
    
    const newConvocations = selectedCandidates.map(cid => {
      const candidate = currentPss.candidates.find(c => c.id === cid);
      return { 
        ...candidate!, 
        convocationAct: namingAct, 
        convocationDate: namingDate, 
        status: ConvocationStatus.PENDING, 
        pssId: selectedPssId 
      };
    }) as ConvokedPerson[];
    
    setConvocations(prev => [...prev, ...newConvocations]);
    setSelectedCandidates([]);
    setNamingAct('');
    setShowNamingModal(false);
    onLog('NOMEACAO', `${newConvocations.length} nomeados no PSS ${currentPss.title}`);
  };

  const handleDecline = (convocationId: string) => {
    if (!confirm("Confirmar desistência definitiva deste candidato?")) return;
    setConvocations(prev => prev.map(c => c.id === convocationId ? { ...c, status: ConvocationStatus.DECLINED } : c));
    onLog('DESISTENCIA', `Candidato marcou desistência.`);
  };

  const handleReclassify = (convocation: ConvokedPerson) => {
    if (!confirm("O candidato irá para o final da lista (Fim de Fila). Confirmar?")) return;
    
    // 1. Remove da lista de nomeações ativas
    setConvocations(prev => prev.filter(c => c.id !== convocation.id));
    
    // 2. Atualiza ranking no PSS para ser o último
    setPssList(prev => prev.map(p => {
        if (p.id === convocation.pssId) {
            const maxRanking = Math.max(...p.candidates.map(c => c.ranking), 0);
            return {
                ...p,
                candidates: p.candidates.map(c => c.cpf === convocation.cpf ? { ...c, ranking: maxRanking + 1, status: ConvocationStatus.RECLASSIFIED } : c)
            };
        }
        return p;
    }));
    
    onLog('FIM_DE_FILA', `${convocation.name} movido para o final da lista.`);
  };

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
        onLog('IMPORTACAO_PSS', `${newCandidates.length} candidatos importados.`);
      } catch { alert("Erro ao processar CSV. Verifique o formato."); }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200">
        <button onClick={() => setActiveSubTab('classified')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeSubTab === 'classified' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}><Table size={14} className="inline mr-2" /> Classificação</button>
        <button onClick={() => setActiveSubTab('convoked')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeSubTab === 'convoked' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}><UserCheck size={14} className="inline mr-2" /> Nomeados</button>
        <button onClick={() => setActiveSubTab('substitution')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeSubTab === 'substitution' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}><RefreshCw size={14} className="inline mr-2" /> Substituição</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
          <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm h-fit">
                  <div className="flex justify-between items-center mb-6"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Editais PSS</h3></div>
                  <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
                      <button onClick={() => { setShowArchived(false); setSelectedPssId(null); }} className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all ${!showArchived ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Ativos</button>
                      <button onClick={() => { setShowArchived(true); setSelectedPssId(null); }} className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all ${showArchived ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Arquivos</button>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredPssList.map(p => (
                          <div key={p.id} onClick={() => setSelectedPssId(p.id)} className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedPssId === p.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                              <p className="text-xs font-black text-slate-800 truncate">{p.title}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Vigência: {formatDisplayDate(p.validUntil)}</p>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          <div className="lg:col-span-3">
              {selectedPssId ? (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                  {activeSubTab === 'classified' && (
                    <>
                      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                          <div>
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Candidatos Classificados</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Lista de espera e candidatos aptos</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {selectedCandidates.length > 0 && (
                                <button onClick={() => setShowNamingModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl flex items-center hover:bg-blue-700 transition-all">
                                    <UserPlus size={16} className="mr-2"/> Nomear Selecionados ({selectedCandidates.length})
                                </button>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleCsvUpload} className="hidden" accept=".csv" />
                            <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                <FileUp size={18}/>
                            </button>
                          </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-4 w-12"><input type="checkbox" onChange={(e) => setSelectedCandidates(e.target.checked ? currentPss?.candidates.filter(c => !nominatedCandidates.some(nc => nc.cpf === c.cpf)).map(c => c.id) || [] : [])} /></th>
                                    <th className="px-8 py-4">Ranking</th>
                                    <th className="px-8 py-4">Candidato / CPF</th>
                                    <th className="px-8 py-4">Cota</th>
                                    <th className="px-8 py-4 text-right">Situação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[...(currentPss?.candidates || [])].sort((a,b) => a.ranking - b.ranking).map(c => {
                                    const named = nominatedCandidates.find(nc => nc.cpf === c.cpf);
                                    return (
                                        <tr key={c.id} className={`hover:bg-slate-50 ${named ? 'opacity-40 grayscale' : ''}`}>
                                            <td className="px-8 py-4">{!named && <input type="checkbox" checked={selectedCandidates.includes(c.id)} onChange={() => setSelectedCandidates(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])} />}</td>
                                            <td className="px-8 py-4 font-black text-blue-600">{c.ranking}º</td>
                                            <td className="px-8 py-4"><p className="text-xs font-bold text-slate-800">{c.name}</p><p className="text-[9px] text-slate-400">{maskCPF(c.cpf)}</p></td>
                                            <td className="px-8 py-4 text-[9px] font-black uppercase text-slate-400">{c.competition}</td>
                                            <td className="px-8 py-4 text-right">
                                                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border ${named ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                                    {named ? 'Nomeado' : 'Habilitado'}
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
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Controle de portarias em aberto</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-4">Ato / Portaria</th>
                                    <th className="px-8 py-4">Candidato</th>
                                    <th className="px-8 py-4">Data</th>
                                    <th className="px-8 py-4">Status</th>
                                    <th className="px-8 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {nominatedCandidates.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50">
                                        <td className="px-8 py-4 font-black text-slate-800 text-xs"><FileText size={14} className="inline mr-2 text-blue-500" />{c.convocationAct}</td>
                                        <td className="px-8 py-4"><p className="text-xs font-bold text-slate-800">{c.name}</p><p className="text-[9px] text-slate-400">{maskCPF(c.cpf)}</p></td>
                                        <td className="px-8 py-4 text-xs font-bold text-slate-500">{formatDisplayDate(c.convocationDate || '')}</td>
                                        <td className="px-8 py-4"><span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border ${c.status === ConvocationStatus.HIRED ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{c.status}</span></td>
                                        <td className="px-8 py-4 text-right">
                                            {c.status === ConvocationStatus.PENDING && (
                                              <div className="flex justify-end space-x-2">
                                                  <button onClick={() => handleReclassify(c)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all shadow-sm" title="Fim de Fila">
                                                      <ArrowDownWideNarrow size={14}/>
                                                  </button>
                                                  <button onClick={() => handleDecline(c.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm" title="Desistente">
                                                      <UserX size={14}/>
                                                  </button>
                                              </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {activeSubTab === 'substitution' && (
                    <div className="p-10 space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div>
                                    <h3 className="text-3xl font-black uppercase tracking-tighter">Monitor de Reposição</h3>
                                    <p className="text-slate-400 font-medium text-sm mt-2">Cruzamento automático de postos vagos com o cadastro reserva.</p>
                                </div>
                                <div className="bg-white/10 p-4 rounded-3xl border border-white/10 text-center min-w-[120px]">
                                    <p className="text-[9px] font-black uppercase opacity-60 mb-1">Postos Livres</p>
                                    <p className="text-3xl font-black">{substitutionData.totalVacant}</p>
                                </div>
                            </div>
                            <RefreshCw className="absolute -right-10 -bottom-10 text-white/5" size={200} />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {substitutionData.pairings.map((pair, idx) => (
                                <div key={idx} className={`bg-white border p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between group hover:shadow-xl transition-all border-l-8 ${pair.isAlreadyNamed ? 'border-l-indigo-500 border-slate-100' : 'border-l-amber-500 border-amber-100'}`}>
                                    <div className="flex items-center space-x-6 mb-4 md:mb-0">
                                        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black border shadow-inner ${pair.isAlreadyNamed ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                            <span className="text-[8px] uppercase opacity-60">Posto</span>
                                            <span className="text-lg leading-none">#{pair.slot.slotIndex}</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pair.slot.vacancyCode}</p>
                                            <h4 className="text-xl font-black text-slate-800 tracking-tighter">AGUARDA REPOSIÇÃO</h4>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase">Cota Original: <span className="text-blue-600">{pair.slot.competition}</span></p>
                                        </div>
                                    </div>

                                    <div className="hidden md:flex flex-col items-center text-slate-200">
                                        <span className={`text-[8px] font-black uppercase mb-1 ${pair.isAlreadyNamed ? 'text-indigo-400' : 'text-amber-400'}`}>{pair.isAlreadyNamed ? 'Nomeação em Curso' : 'Sugerido'}</span>
                                        <ArrowRight size={24}/>
                                    </div>

                                    <div className={`flex items-center space-x-4 p-4 rounded-2xl border shadow-inner transition-all ${pair.isAlreadyNamed ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ranking: <span className="text-blue-600">{pair.candidate.ranking}º</span></p>
                                            <p className="text-sm font-black text-slate-800">{pair.candidate.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{pair.candidate.competition}</p>
                                        </div>
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm ${pair.isAlreadyNamed ? 'bg-white text-indigo-600 border-indigo-200' : 'bg-white text-amber-600 border-amber-200'}`}>
                                            {pair.isAlreadyNamed ? <UserCheck size={20}/> : <Hash size={20}/>}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {substitutionData.totalVacant > 0 && substitutionData.pairings.length === 0 && (
                                <div className="py-24 text-center border-4 border-dashed border-red-50 rounded-[3.5rem] bg-red-50/20">
                                    <AlertCircle size={48} className="mx-auto text-red-200 mb-6"/>
                                    <h4 className="text-xl font-black text-red-800 uppercase tracking-widest">Cadastro Reserva Esgotado</h4>
                                    <p className="text-[10px] text-red-400 font-bold uppercase mt-2">Não há candidatos aptos para os {substitutionData.totalVacant} postos vagos.</p>
                                </div>
                            )}
                        </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-32 flex flex-col items-center justify-center text-center">
                    <FileSpreadsheet size={48} className="text-slate-200 mb-6"/>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Selecione um Edital</h3>
                </div>
              )}
          </div>
      </div>

      {/* MODAL NOMEAÇÃO */}
      {showNamingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-10 shadow-2xl animate-in zoom-in duration-200 relative">
            <button onClick={() => setShowNamingModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <h2 className="text-2xl font-black mb-2 text-slate-800 uppercase tracking-tighter">Atuar na Nomeação</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8">{selectedCandidates.length} selecionados</p>
            <form onSubmit={handleNamingSubmit} className="space-y-4">
              <input value={namingAct} onChange={e => setNamingAct(e.target.value)} required placeholder="Ato / Portaria (ex: Port. 10/2024)" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
              <input type="date" value={namingDate} onChange={e => setNamingDate(e.target.value)} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowNamingModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConvocationManagement;
