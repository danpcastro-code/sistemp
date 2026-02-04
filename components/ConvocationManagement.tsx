
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ConvokedPerson, CompetitionType, ConvocationStatus, PSS, Vacancy, ContractStatus, UserRole } from '../types';
import { generateId, maskCPF, formatDisplayDate } from '../utils';
import { Search, FileUp, X, Users, Table, RefreshCw, UserX, FileDown, UserPlus, FileSpreadsheet, Trash2, History, AlertTriangle, Archive, EyeOff, Eye, FolderOpen, Briefcase, PlusCircle } from 'lucide-react';
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
  const [activeSubTab, setActiveSubTab] = useState<'classified' | 'convoked'>('classified');
  const [selectedPssId, setSelectedPssId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  
  const [showPssModal, setShowPssModal] = useState(false);
  const [showNamingModal, setShowNamingModal] = useState(false);
  
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [namingAct, setNamingAct] = useState('');
  const [namingDate, setNamingDate] = useState(new Date().toISOString().split('T')[0]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const canManage = userRole === UserRole.ADMIN || userRole === UserRole.HR;

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
    link.href = url;
    link.download = "modelo_importacao_pss.csv";
    link.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPssId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/);
        const newCandidates: ConvokedPerson[] = [];

        // Detecta delimitador (padrão Brasil é ; mas aceita ,)
        const header = lines[0];
        const delimiter = header.includes(';') ? ';' : ',';

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const parts = line.split(delimiter);
            if (parts.length < 6) continue;

            const [name, cpf, email, profile, notice, competition, ranking] = parts;
            
            newCandidates.push({
                id: generateId(),
                name: name.trim(),
                cpf: cpf.replace(/\D/g, ''),
                email: email.trim(),
                profile: profile.trim(),
                notice: notice.trim(),
                competition: (competition.toUpperCase().includes('PCD') ? CompetitionType.PCD : competition.toUpperCase().includes('PPP') ? CompetitionType.PPP : CompetitionType.AC),
                ranking: parseInt(ranking) || 0,
                status: ConvocationStatus.PENDING,
                createdAt: new Date().toISOString(),
                pssId: selectedPssId
            });
        }

        if (newCandidates.length > 0) {
            setPssList(prev => prev.map(p => p.id === selectedPssId ? { ...p, candidates: [...p.candidates, ...newCandidates] } : p));
            onLog('IMPORTAÇÃO', `Importados ${newCandidates.length} candidatos para o PSS.`);
            alert(`${newCandidates.length} candidatos carregados com sucesso.`);
        }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    onLog('PSS', `Novo PSS: ${newPss.title}`);
  };

  const handleArchivePSS = (id: string) => {
    const pss = pssList.find(p => p.id === id);
    if (!pss) return;
    const newState = !pss.isArchived;
    if (confirm(`Deseja ${newState ? 'arquivar' : 'restaurar'} "${pss.title}"?`)) {
      setPssList(prev => prev.map(p => p.id === id ? { ...p, isArchived: newState } : p));
      if (newState && selectedPssId === id) setSelectedPssId(null);
    }
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
    setShowNamingModal(false);
    onLog('NOMEAÇÃO', `Nomeados ${newConvocations.length} candidatos.`);
    alert("Nomeação registrada com sucesso.");
  };

  const filteredPssList = useMemo(() => pssList.filter(p => p.isArchived === showArchived), [pssList, showArchived]);
  const currentPss = useMemo(() => pssList.find(p => p.id === selectedPssId), [selectedPssId, pssList]);
  
  const selectableCandidates = useMemo(() => {
    if (!currentPss) return [];
    return currentPss.candidates.filter(c => 
        !convocations.some(cv => cv.cpf === c.cpf && cv.pssId === selectedPssId)
    );
  }, [currentPss, convocations, selectedPssId]);

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200">
        <button onClick={() => setActiveSubTab('classified')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'classified' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Classificação</button>
        <button onClick={() => setActiveSubTab('convoked')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'convoked' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Nomeados</button>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
          <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm h-fit">
                  <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
                      <button onClick={() => { setShowArchived(false); setSelectedPssId(null); }} className={`flex items-center justify-center py-2 rounded-lg text-[9px] font-black uppercase ${!showArchived ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><FolderOpen size={12} className="mr-1.5" /> Ativos</button>
                      <button onClick={() => { setShowArchived(true); setSelectedPssId(null); }} className={`flex items-center justify-center py-2 rounded-lg text-[9px] font-black uppercase ${showArchived ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400'}`}><Archive size={12} className="mr-1.5" /> Arquivos</button>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredPssList.map(p => (
                          <div key={p.id} className="relative group">
                              <div onClick={() => setSelectedPssId(p.id)} className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${selectedPssId === p.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                                  <p className="text-xs font-black text-slate-800 truncate pr-10">{p.title}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Validade: {formatDisplayDate(p.validUntil)}</p>
                              </div>
                              <div className="absolute right-2 top-2 hidden group-hover:flex space-x-1">
                                  {canManage && <button onClick={(e) => { e.stopPropagation(); handleArchivePSS(p.id); }} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 shadow-sm"><Archive size={12} /></button>}
                              </div>
                          </div>
                      ))}
                      {filteredPssList.length === 0 && (
                        <div className="py-10 text-center">
                           <FileSpreadsheet size={32} className="mx-auto text-slate-200 mb-3 opacity-20" />
                           <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Nenhum PSS cadastrado</p>
                        </div>
                      )}
                  </div>
                  {canManage && !showArchived && <button onClick={() => setShowPssModal(true)} className="w-full mt-6 py-3 border-2 border-dashed border-slate-200 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:text-blue-600 transition-all">+ Novo PSS</button>}
              </div>
          </div>

          <div className="lg:col-span-3">
              {selectedPssId ? (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                  {activeSubTab === 'classified' ? (
                    <>
                      <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/30 gap-4">
                          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Candidatos Classificados</h2>
                          <div className="flex flex-wrap gap-2">
                              {selectedCandidates.length > 0 && <button onClick={() => setShowNamingModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl animate-in fade-in zoom-in duration-200">Nomear Selecionados ({selectedCandidates.length})</button>}
                              
                              {canManage && (
                                <button 
                                  onClick={() => fileInputRef.current?.click()} 
                                  className="flex items-center space-x-2 px-5 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-xl text-[10px] font-black uppercase shadow-sm hover:bg-blue-50 transition-all active:scale-95"
                                >
                                  <FileUp size={16} />
                                  <span>Importar Lista (CSV)</span>
                                </button>
                              )}
                              
                              <button onClick={handleDownloadTemplate} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 shadow-sm hover:text-blue-600 transition-colors" title="Baixar Modelo de Importação">
                                <FileDown size={18}/>
                              </button>
                          </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                                <tr>
                                    <th className="px-8 py-4 w-12 text-center"><input type="checkbox" checked={selectableCandidates.length > 0 && selectedCandidates.length === selectableCandidates.length} onChange={(e) => setSelectedCandidates(e.target.checked ? selectableCandidates.map(c => c.id) : [])} /></th>
                                    <th className="px-8 py-4">Ranking</th>
                                    <th className="px-8 py-4">Nome do Candidato</th>
                                    <th className="px-8 py-4">Perfil / Cota</th>
                                    <th className="px-8 py-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[...selectableCandidates].sort((a,b) => a.ranking - b.ranking).map(c => {
                                    return (
                                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-8 py-4 text-center">
                                              <input type="checkbox" checked={selectedCandidates.includes(c.id)} onChange={() => setSelectedCandidates(prev => prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id])} />
                                            </td>
                                            <td className="px-8 py-4 font-black text-blue-600">{c.ranking}º</td>
                                            <td className="px-8 py-4">
                                                <p className="text-xs font-bold text-slate-800">{c.name}</p>
                                                <p className="text-[10px] text-slate-400 font-mono tracking-tighter">{maskCPF(c.cpf)}</p>
                                            </td>
                                            <td className="px-8 py-4">
                                              <p className="text-[9px] font-black uppercase text-slate-500">{c.profile}</p>
                                              <p className="text-[8px] font-bold text-blue-400 uppercase">{c.competition}</p>
                                            </td>
                                            <td className="px-8 py-4 text-right">
                                              <button 
                                                onClick={() => { setSelectedCandidates([c.id]); setShowNamingModal(true); }}
                                                className="text-[9px] font-black text-blue-600 uppercase hover:underline"
                                              >
                                                Nomear Individual
                                              </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {selectableCandidates.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                       <div className="flex flex-col items-center opacity-30">
                                          <Users size={48} className="text-slate-200 mb-4" />
                                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum candidato carregado para este PSS.</p>
                                          <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">Use o botão "Importar Lista (CSV)" acima.</p>
                                       </div>
                                    </td>
                                  </tr>
                                )}
                            </tbody>
                        </table>
                      </div>
                    </>
                  ) : activeSubTab === 'convoked' ? (
                    <>
                      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Candidatos Nomeados</h2>
                          <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Aguardando Provimento</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                                <tr>
                                    <th className="px-8 py-4">Candidato</th>
                                    <th className="px-8 py-4">Ato / Portaria</th>
                                    <th className="px-8 py-4">Data Nomeação</th>
                                    <th className="px-8 py-4 text-right">Desfazer</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {convocations.filter(c => c.pssId === selectedPssId && c.status === ConvocationStatus.PENDING).map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-4">
                                            <p className="text-xs font-bold text-slate-800">{c.name}</p>
                                            <p className="text-[10px] text-slate-400 font-mono">{maskCPF(c.cpf)}</p>
                                        </td>
                                        <td className="px-8 py-4 text-[10px] font-black uppercase text-slate-600">{c.convocationAct || '---'}</td>
                                        <td className="px-8 py-4 text-xs font-medium text-slate-500">{formatDisplayDate(c.convocationDate || '')}</td>
                                        <td className="px-8 py-4 text-right">
                                            <button onClick={() => {
                                              if (confirm("Deseja remover a nomeação deste candidato e retorná-lo para a classificação?")) {
                                                setConvocations(prev => prev.filter(conv => conv.id !== c.id));
                                              }
                                            }} className="p-2 text-slate-300 hover:text-red-600 transition-colors" title="Cancelar Nomeação">
                                              <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {convocations.filter(c => c.pssId === selectedPssId && c.status === ConvocationStatus.PENDING).length === 0 && (
                                  <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest opacity-30">Sem nomeações pendentes.</td>
                                  </tr>
                                )}
                            </tbody>
                        </table>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-32 flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 shadow-inner animate-pulse"><FileSpreadsheet size={48} className="text-slate-200"/></div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">Selecione um Processo (PSS)</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-[250px] leading-relaxed">Selecione um edital na lista lateral para carregar a classificação e realizar nomeações.</p>
                </div>
              )}
          </div>
      </div>

      {showPssModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-12 shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-3xl font-black mb-8 text-slate-800 uppercase tracking-tighter">Novo Processo PSS</h2>
            <form onSubmit={handleAddPSS} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título / Edital</label>
                <input name="title" required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="Ex: Edital 01/2024 - Saúde" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Válido Até</label>
                <input type="date" name="validUntil" required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 font-bold bg-slate-50 outline-none" />
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => setShowPssModal(false)} className="px-6 py-4 font-bold text-slate-400 text-xs uppercase">Cancelar</button>
                <button type="submit" className="px-12 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl active:scale-95 text-xs uppercase">Criar PSS</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNamingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-12 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-3xl font-black mb-8 text-slate-800 uppercase tracking-tighter">Registrar Nomeação</h2>
            <form onSubmit={handleNamingSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ato / Portaria de Nomeação</label>
                <input value={namingAct} onChange={e => setNamingAct(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 font-bold bg-slate-50 outline-none" placeholder="Ex: Portaria nº 05/2024-RH" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data da Nomeação</label>
                <input type="date" value={namingDate} onChange={e => setNamingDate(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 font-bold bg-slate-50 outline-none" />
              </div>
              <div className="flex justify-end gap-3 mt-10">
                <button type="button" onClick={() => setShowNamingModal(false)} className="px-6 py-4 font-bold text-slate-400 text-xs uppercase">Voltar</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl active:scale-95 text-xs uppercase">Finalizar Nomeação</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConvocationManagement;
