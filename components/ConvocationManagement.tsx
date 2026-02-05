
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ConvokedPerson, CompetitionType, ConvocationStatus, PSS, Vacancy, ContractStatus, UserRole } from '../types';
import { maskCPF, formatDisplayDate } from '../utils';
import { 
  X, Table, UserPlus, FileText, UserCheck, RefreshCw, Copy, ArrowDownWideNarrow, AlertCircle, UserX, FileUp, FileSpreadsheet
} from 'lucide-center';
import { 
  Search, CheckCircle2 
} from 'lucide-react';

// Nota: Certifique-se de que os ícones estão sendo importados corretamente do lucide-react no seu ambiente
import * as Lucide from 'lucide-react';

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
  
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [showReclassifyModal, setShowReclassifyModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [namingAct, setNamingAct] = useState('');
  const [namingDate, setNamingDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [reclassifyTarget, setReclassifyTarget] = useState<ConvokedPerson | null>(null);
  const [declineTarget, setDeclineTarget] = useState<ConvokedPerson | null>(null);
  const [newRankingValue, setNewRankingValue] = useState<number>(0);

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

    const availablePool = currentPss.candidates.filter(c => {
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
  }, [selectedPssId, currentPss, vacancies, convocations, nominatedCandidates]);

  const copySubstitutionTable = () => {
    if (substitutionData.pairings.length === 0) return;
    const header = "Posto / Grupo;Cota Posto;Candidato Sugerido;Ranking;CPF\n";
    const body = substitutionData.pairings.map(p => 
      `#${p.slotIndex} (${p.vacancyCode});${p.competition};${p.suggestedName};${p.suggestedRanking}º;${maskCPF(p.suggestedCpf)}`
    ).join("\n");
    navigator.clipboard.writeText(header + body);
    alert("Dados copiados para o Excel!");
  };

  const handleNamingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPssId || !currentPss) return;
    const newConvs = selectedCandidates.map(cid => {
      const c = currentPss.candidates.find(x => x.id === cid);
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
    setPssList(prev => prev.map(p => p.id === declineTarget.pssId ? { ...p, candidates: p.candidates.map(c => c.cpf === declineTarget.cpf ? { ...c, status: ConvocationStatus.DECLINED } : c) } : p));
    onLog('DESISTENCIA', `Desistência de ${declineTarget.name} registrada.`);
    setShowDeclineModal(false);
    setDeclineTarget(null);
  };

  const triggerReclassify = (c: ConvokedPerson) => {
    const max = Math.max(...(currentPss?.candidates.map(x => x.ranking) || [0]));
    setReclassifyTarget(c);
    setNewRankingValue(max + 1);
    setShowReclassifyModal(true);
  };

  const handleReclassifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reclassifyTarget) return;
    setConvocations(prev => prev.filter(x => x.id !== reclassifyTarget.id));
    setPssList(prev => prev.map(p => p.id === reclassifyTarget.pssId ? { ...p, candidates: p.candidates.map(c => c.cpf === reclassifyTarget.cpf ? { ...c, ranking: newRankingValue, status: ConvocationStatus.RECLASSIFIED } : c) } : p));
    setShowReclassifyModal(false);
    onLog('FIM_DE_FILA', `${reclassifyTarget.name} movido para ranking ${newRankingValue}.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200 shadow-inner">
        <button onClick={() => setActiveSubTab('classified')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center ${activeSubTab === 'classified' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}><Lucide.Table size={14} className="mr-2" /> Classificação</button>
        <button onClick={() => setActiveSubTab('convoked')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center ${activeSubTab === 'convoked' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}><Lucide.UserCheck size={14} className="mr-2" /> Nomeados</button>
        <button onClick={() => setActiveSubTab('substitution')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center ${activeSubTab === 'substitution' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}><Lucide.RefreshCw size={14} className="mr-2" /> Substituição</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
          <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Editais PSS</h3>
                  <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
                      <button onClick={() => { setShowArchived(false); setSelectedPssId(null); }} className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all ${!showArchived ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Ativos</button>
                      <button onClick={() => { setShowArchived(true); setSelectedPssId(null); }} className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all ${showArchived ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Arquivos</button>
                  </div>
                  <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
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
                          <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Candidatos Classificados</h2><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Lista geral de espera</p></div>
                          <div className="flex space-x-2">
                            {selectedCandidates.length > 0 && (
                                <button onClick={() => setShowNamingModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl flex items-center hover:bg-blue-700 transition-all active:scale-95">
                                    <Lucide.UserPlus size={16} className="mr-2"/> Nomear ({selectedCandidates.length})
                                </button>
                            )}
                          </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                <tr><th className="px-8 py-4 w-12"><input type="checkbox" /></th><th className="px-8 py-4">Ranking</th><th className="px-8 py-4">Candidato</th><th className="px-8 py-4">Cota</th><th className="px-8 py-4 text-right">Situação</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {currentPss?.candidates.sort((a,b) => a.ranking-b.ranking).map(c => {
                                    const named = nominatedCandidates.find(nc => nc.cpf === c.cpf);
                                    const declined = c.status === ConvocationStatus.DECLINED;
                                    return (
                                        <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${named || declined ? 'opacity-40 grayscale' : ''}`}>
                                            <td className="px-8 py-4">{(!named && !declined) && <input type="checkbox" checked={selectedCandidates.includes(c.id)} onChange={() => setSelectedCandidates(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])} />}</td>
                                            <td className="px-8 py-4 font-black text-blue-600">{c.ranking}º</td>
                                            <td className="px-8 py-4 font-bold text-slate-800 text-xs">{c.name}</td>
                                            <td className="px-8 py-4 text-[9px] font-black uppercase text-slate-400">{c.competition}</td>
                                            <td className="px-8 py-4 text-right"><span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg border">{named ? 'Nomeado' : declined ? 'Desistente' : 'Apto'}</span></td>
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
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Gestão de Portarias e Fluxo de Admissão</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                <tr><th className="px-8 py-4">Ato / Portaria</th><th className="px-8 py-4">Candidato</th><th className="px-8 py-4">Status</th><th className="px-8 py-4 text-right">Ações</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {nominatedCandidates.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-4 font-black text-slate-800 text-xs">{c.convocationAct}</td>
                                        <td className="px-8 py-4 font-bold text-slate-800 text-xs">{c.name}</td>
                                        <td className="px-8 py-4"><span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${c.status === ConvocationStatus.HIRED ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>{c.status}</span></td>
                                        <td className="px-8 py-4 text-right">
                                            {c.status === ConvocationStatus.PENDING && (
                                              <div className="flex justify-end space-x-2">
                                                  <button onClick={() => triggerReclassify(c)} className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 hover:bg-amber-600 hover:text-white transition-all shadow-sm" title="Fim de Fila"><Lucide.ArrowDownWideNarrow size={14}/></button>
                                                  <button onClick={() => { setDeclineTarget(c); setShowDeclineModal(true); }} className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm" title="Desistência"><Lucide.UserX size={14}/></button>
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
                    <div className="animate-in slide-in-from-bottom-2 duration-300">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/10">
                            <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Sugestão para Substituição</h2><p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Lista simplificada para cópia (Excel)</p></div>
                            <button onClick={copySubstitutionTable} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center hover:bg-slate-800 transition-all active:scale-95"><Lucide.Copy size={16} className="mr-2"/> Copiar para Excel</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px]">
                                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                    <tr><th className="px-8 py-4">Posto / Grupo</th><th className="px-8 py-4">Cota Posto</th><th className="px-8 py-4">Candidato Sugerido</th><th className="px-8 py-4">Ranking</th><th className="px-8 py-4 text-right">CPF</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {substitutionData.pairings.map((pair, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-8 py-4 font-black text-slate-800 uppercase tracking-tighter">#{pair.slotIndex} ({pair.vacancyCode})</td>
                                            <td className="px-8 py-4 text-[9px] font-bold uppercase text-slate-400">{pair.competition}</td>
                                            <td className="px-8 py-4 font-bold text-blue-600">{pair.suggestedName}</td>
                                            <td className="px-8 py-4 font-black text-slate-800 tracking-tighter">{pair.suggestedRanking}º</td>
                                            <td className="px-8 py-4 text-right text-slate-400 font-mono tracking-tighter">{maskCPF(pair.suggestedCpf)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-32 flex flex-col items-center justify-center text-center opacity-60">
                    <Lucide.FileSpreadsheet size={64} className="text-slate-200 mb-6"/>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Selecione um Edital PSS</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">Identifique um edital ativo para gerenciar a classificação</p>
                </div>
              )}
          </div>
      </div>

      {/* MODAL: NOMEAÇÃO */}
      {showNamingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-10 shadow-2xl relative border border-slate-100 animate-in zoom-in duration-200">
            <button onClick={() => setShowNamingModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 p-2"><Lucide.X size={20}/></button>
            <h2 className="text-2xl font-black mb-2 text-slate-800 uppercase tracking-tighter">Atuar na Nomeação</h2>
            <form onSubmit={handleNamingSubmit} className="space-y-4">
              <input value={namingAct} onChange={e => setNamingAct(e.target.value)} required placeholder="Ato / Portaria" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              <input type="date" value={namingDate} onChange={e => setNamingDate(e.target.value)} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">Confirmar Chamamento</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECLASSIFICAÇÃO (FIM DE FILA) */}
      {showReclassifyModal && reclassifyTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-10 shadow-2xl relative border border-amber-100 animate-in zoom-in duration-200">
            <button onClick={() => setShowReclassifyModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 p-2"><Lucide.X size={20}/></button>
            <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Lucide.ArrowDownWideNarrow size={24}/></div>
                <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Fim de Fila</h2></div>
            </div>
            <p className="text-xs text-slate-600 mb-6">Mover <strong>{reclassifyTarget.name}</strong> para o final da lista? A nomeação atual será revogada.</p>
            <form onSubmit={handleReclassifySubmit} className="space-y-4">
              <input type="number" value={newRankingValue} onChange={e => setNewRankingValue(Number(e.target.value))} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              <button type="submit" className="w-full py-4 bg-amber-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">Confirmar Reclassificação</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DESISTÊNCIA */}
      {showDeclineModal && declineTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-12 shadow-2xl relative border border-red-100 animate-in zoom-in duration-200">
            <button onClick={() => setShowDeclineModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 p-2"><Lucide.X size={20}/></button>
            <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-red-50 text-red-600 rounded-[2rem] mb-6 shadow-inner"><Lucide.AlertCircle size={40}/></div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">Confirmar Desistência</h2>
                <p className="text-xs text-slate-500 mb-8">Confirmar a desistência formal de <strong>{declineTarget.name}</strong>? Ação irreversível.</p>
                <button onClick={handleDeclineConfirm} className="w-full py-4 bg-red-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl hover:bg-red-700 transition-all active:scale-95">Sim, Registrar Desistência</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConvocationManagement;
