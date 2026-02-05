
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ConvokedPerson, CompetitionType, ConvocationStatus, PSS, Vacancy, ContractStatus, UserRole } from '../types';
import { generateId, maskCPF, formatDisplayDate, startOfDay, parseISO } from '../utils';
import { 
  Search, FileUp, X, CheckCircle2, Users, Table, RefreshCw, 
  UserPlus, FileSpreadsheet, ArrowRight, FolderOpen, Archive, Hash, Clock, FileText, UserCheck, Check
} from 'lucide-react';
import { isAfter } from 'date-fns';

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
  
  const [showPssModal, setShowPssModal] = useState(false);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [namingAct, setNamingAct] = useState('');
  const [namingDate, setNamingDate] = useState(new Date().toISOString().split('T')[0]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const today = startOfDay(new Date());

  useEffect(() => {
    setSelectedCandidates([]);
  }, [selectedPssId, activeSubTab]);

  const currentPss = useMemo(() => pssList.find(p => p.id === selectedPssId), [selectedPssId, pssList]);
  const filteredPssList = useMemo(() => pssList.filter(p => p.isArchived === showArchived), [pssList, showArchived]);

  // CORREÇÃO: Candidatos nomeados para este PSS específico
  const nominatedCandidates = useMemo(() => {
    if (!selectedPssId) return [];
    // Filtramos convocações que têm o ID deste PSS e status PENDENTE ou CONTRATADO
    return convocations.filter(c => 
      c.pssId === selectedPssId && 
      (c.status === ConvocationStatus.PENDING || c.status === ConvocationStatus.HIRED)
    );
  }, [convocations, selectedPssId]);

  // MONITOR DE SUBSTITUIÇÃO REFORMULADO
  const substitutionData = useMemo(() => {
    if (!selectedPssId || !currentPss) return { pairings: [] };
    
    const pssVacancies = vacancies.filter(v => v.pssId === selectedPssId);
    const vacantSlots: { vacancyCode: string, slotIndex: number, competition: CompetitionType }[] = [];
    
    // 1. Identifica postos que NÃO possuem contratos ATIVOS
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

    // 2. Abate postos que já têm nomeações em curso (Pendente de assinatura)
    const pendingActions = nominatedCandidates.filter(c => c.status === ConvocationStatus.PENDING);
    let netVacantSlots = [...vacantSlots];
    
    pendingActions.forEach(() => {
        if (netVacantSlots.length > 0) netVacantSlots.splice(0, 1);
    });

    // 3. Busca candidatos disponíveis (Que não desistiram nem estão nomeados/contratados)
    const availablePool = currentPss.candidates.filter(c => {
      const isNamed = nominatedCandidates.some(nc => nc.cpf === c.cpf);
      const isDeclined = c.status === ConvocationStatus.DECLINED;
      return !isNamed && !isDeclined;
    }).sort((a, b) => a.ranking - b.ranking);

    // 4. Cria o pareamento entre POSTO VAGO e CANDIDATO
    const pairings: { slot: any, candidate: ConvokedPerson }[] = [];
    const poolCopy = [...availablePool];
    
    netVacantSlots.forEach(slot => {
        if (poolCopy.length > 0) {
            // Tenta achar da mesma cota, senão pega o primeiro
            const candidateIdx = poolCopy.findIndex(c => c.competition === slot.competition) !== -1 
                ? poolCopy.findIndex(c => c.competition === slot.competition) 
                : 0;
            
            pairings.push({ slot, candidate: poolCopy[candidateIdx] });
            poolCopy.splice(candidateIdx, 1);
        }
    });

    return { pairings };
  }, [selectedPssId, currentPss, vacancies, nominatedCandidates]);

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
    onLog('NOMEACAO_PSS', `${newConvocations.length} nomeados no Edital ${currentPss.title}`);
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
                  <div className="flex justify-between items-center mb-6"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pastas de Editais</h3></div>
                  <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
                      <button onClick={() => { setShowArchived(false); setSelectedPssId(null); }} className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all ${!showArchived ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Ativos</button>
                      <button onClick={() => { setShowArchived(true); setSelectedPssId(null); }} className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all ${showArchived ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Arquivos</button>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredPssList.map(p => (
                          <div key={p.id} onClick={() => setSelectedPssId(p.id)} className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedPssId === p.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                              <p className="text-xs font-black text-slate-800 truncate">{p.title}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Validade: {formatDisplayDate(p.validUntil)}</p>
                          </div>
                      ))}
                      {filteredPssList.length === 0 && (
                          <div className="py-10 text-center opacity-30"><FileSpreadsheet className="mx-auto mb-2" size={24}/><p className="text-[8px] font-black uppercase">Pasta Vazia</p></div>
                      )}
                  </div>
                  {!showArchived && (
                    <button onClick={() => setShowPssModal(true)} className="w-full mt-6 py-3 border-2 border-dashed border-slate-200 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all">+ Novo Edital</button>
                  )}
              </div>
          </div>

          <div className="lg:col-span-3">
              {selectedPssId ? (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                  
                  {activeSubTab === 'classified' && (
                    <>
                      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                          <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Candidatos Classificados</h2><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Selecione para gerar portaria de nomeação</p></div>
                          {selectedCandidates.length > 0 && (<button onClick={() => setShowNamingModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl flex items-center hover:bg-blue-700 transition-all animate-in zoom-in"><UserPlus size={16} className="mr-2"/> Nomear Selecionados ({selectedCandidates.length})</button>)}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-4 w-12"><input type="checkbox" onChange={(e) => setSelectedCandidates(e.target.checked ? currentPss?.candidates.filter(c => !nominatedCandidates.some(nc => nc.cpf === c.cpf)).map(c => c.id) || [] : [])} /></th>
                                    <th className="px-8 py-4">Ranking</th>
                                    <th className="px-8 py-4">Candidato / CPF</th>
                                    <th className="px-8 py-4">Perfil</th>
                                    <th className="px-8 py-4 text-right">Situação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[...(currentPss?.candidates || [])].sort((a,b) => a.ranking - b.ranking).map(c => {
                                    const named = nominatedCandidates.find(nc => nc.cpf === c.cpf);
                                    const isDeclined = c.status === ConvocationStatus.DECLINED;
                                    return (
                                        <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${named || isDeclined ? 'opacity-40 grayscale' : ''}`}>
                                            <td className="px-8 py-4">{!named && !isDeclined && <input type="checkbox" checked={selectedCandidates.includes(c.id)} onChange={() => setSelectedCandidates(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])} className="w-5 h-5 rounded border-slate-300" />}</td>
                                            <td className="px-8 py-4 font-black text-blue-600">{c.ranking}º</td>
                                            <td className="px-8 py-4"><p className="text-xs font-bold text-slate-800">{c.name}</p><p className="text-[9px] text-slate-400">{maskCPF(c.cpf)}</p></td>
                                            <td className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase">{c.profile}</td>
                                            <td className="px-8 py-4 text-right">
                                                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border ${named ? 'bg-blue-50 text-blue-600 border-blue-100' : isDeclined ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                                    {named ? (named.status === ConvocationStatus.HIRED ? 'Contratado' : 'Nomeado') : isDeclined ? 'Desistente' : 'Habilitado'}
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
                          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Controle de Nomeados</h2>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Candidatos com portarias geradas e aguardando assinatura de contrato</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-4">Ato / Portaria</th>
                                    <th className="px-8 py-4">Candidato</th>
                                    <th className="px-8 py-4">Data Nomeação</th>
                                    <th className="px-8 py-4 text-right">Status Atual</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {nominatedCandidates.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-4"><div className="flex items-center space-x-2 text-xs font-black text-slate-800"><FileText className="text-blue-500" size={14}/><span>{c.convocationAct}</span></div></td>
                                        <td className="px-8 py-4"><p className="text-xs font-bold text-slate-800">{c.name}</p><p className="text-[9px] text-slate-400">{maskCPF(c.cpf)}</p></td>
                                        <td className="px-8 py-4 text-xs font-bold text-slate-500">{formatDisplayDate(c.convocationDate || '')}</td>
                                        <td className="px-8 py-4 text-right"><span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border ${c.status === ConvocationStatus.HIRED ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{c.status}</span></td>
                                    </tr>
                                ))}
                                {nominatedCandidates.length === 0 && (
                                    <tr><td colSpan={4} className="py-20 text-center text-slate-300 font-black uppercase text-[10px]">Não há candidatos nomeados neste edital.</td></tr>
                                )}
                            </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {activeSubTab === 'substitution' && (
                    <div className="p-10 space-y-8">
                        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div>
                                    <h3 className="text-3xl font-black uppercase tracking-tighter">Monitor de Reposição</h3>
                                    <p className="text-slate-400 font-medium text-sm mt-2">Cruzamento de postos vagos com cadastro reserva disponível.</p>
                                </div>
                                <div className="bg-white/10 p-4 rounded-3xl border border-white/10 text-center min-w-[120px]">
                                    <p className="text-[9px] font-black uppercase opacity-60 mb-1">Alertas</p>
                                    <p className="text-3xl font-black">{substitutionData.pairings.length}</p>
                                </div>
                            </div>
                            <RefreshCw className="absolute -right-10 -bottom-10 text-white/5" size={200} />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {substitutionData.pairings.map((pair, idx) => (
                                <div key={idx} className="bg-white border border-slate-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between group hover:border-blue-200 hover:shadow-lg transition-all border-l-8 border-l-amber-500">
                                    <div className="flex items-center space-x-6 mb-4 md:mb-0">
                                        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex flex-col items-center justify-center font-black border border-amber-100">
                                            <span className="text-[8px] uppercase opacity-60">Posto</span>
                                            <span className="text-lg leading-none">#{pair.slot.slotIndex}</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pair.slot.vacancyCode}</p>
                                            <h4 className="text-xl font-black text-slate-800 tracking-tighter">AGUARDA REPOSIÇÃO</h4>
                                            <p className="text-[9px] font-bold text-amber-600 uppercase flex items-center mt-1"><Clock size={10} className="mr-1"/> Cota Requerida: {pair.slot.competition}</p>
                                        </div>
                                    </div>
                                    <div className="hidden md:block"><ArrowRight className="text-slate-200" size={32}/></div>
                                    <div className="flex items-center space-x-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Indicação Ranking: {pair.candidate.ranking}º</p>
                                            <p className="text-sm font-black text-slate-800">{pair.candidate.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{pair.candidate.competition}</p>
                                        </div>
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 border border-slate-200 shadow-sm"><UserCheck size={20}/></div>
                                    </div>
                                </div>
                            ))}
                            {substitutionData.pairings.length === 0 && (
                                <div className="py-24 text-center border-4 border-dashed border-slate-100 rounded-[3.5rem]">
                                    <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6"><Check size={40}/></div>
                                    <h4 className="text-xl font-black text-slate-300 uppercase tracking-widest">Sem Pendências</h4>
                                    <p className="text-[10px] text-slate-300 font-bold uppercase mt-2">Todos os postos vigentes estão providos ou nomeados.</p>
                                </div>
                            )}
                        </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-[3.5rem] border-4 border-dashed border-slate-100 p-32 flex flex-col items-center justify-center text-center">
                    <FileSpreadsheet size={64} className="text-slate-100 mb-8"/>
                    <h3 className="text-3xl font-black text-slate-200 uppercase tracking-tighter">Selecione um Edital no Menu Lateral</h3>
                </div>
              )}
          </div>
      </div>

      {/* MODAL NOMEAÇÃO */}
      {showNamingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-12 shadow-2xl animate-in zoom-in duration-200 relative">
            <button onClick={() => setShowNamingModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <h2 className="text-3xl font-black mb-2 text-slate-800 uppercase tracking-tighter">Ato de Nomeação</h2>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-10">{selectedCandidates.length} candidatos na mesma portaria</p>
            <form onSubmit={handleNamingSubmit} className="space-y-6">
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº Portaria / Ato</label><input value={namingAct} onChange={e => setNamingAct(e.target.value)} required placeholder="Ex: Portaria 150/2024" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10" /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data do Ato</label><input type="date" value={namingDate} onChange={e => setNamingDate(e.target.value)} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" /></div>
              <div className="flex justify-end gap-3 mt-10">
                <button type="button" onClick={() => setShowNamingModal(false)} className="px-6 py-4 font-bold text-slate-400 text-xs uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black text-xs uppercase rounded-2xl shadow-xl active:scale-95 transition-all">Nomear Candidatos</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO EDITAL */}
      {showPssModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-12 shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-3xl font-black mb-8 text-slate-800 uppercase tracking-tighter">Novo Edital</h2>
            <form onSubmit={(e) => {
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
                onLog('PSS', `Novo edital criado: ${newPss.title}`);
            }} className="space-y-6">
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título do Edital</label><input name="title" required placeholder="Ex: PSS 02/2024 - Saúde" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Validade Inicial</label><input type="date" name="validUntil" required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" /></div>
              <div className="flex justify-end gap-3 mt-10">
                <button type="button" onClick={() => setShowPssModal(false)} className="px-6 py-4 font-bold text-slate-400 text-xs uppercase">Cancelar</button>
                <button type="submit" className="px-12 py-4 bg-blue-600 text-white font-black text-xs uppercase rounded-2xl shadow-xl">Salvar Edital</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConvocationManagement;
