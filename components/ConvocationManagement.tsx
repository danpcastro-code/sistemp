
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ConvokedPerson, CompetitionType, ConvocationStatus, PSS, Vacancy, ContractStatus, UserRole } from '../types';
import { generateId, maskCPF, formatDisplayDate } from '../utils';
import { 
  Search, X, Table, UserPlus, FileSpreadsheet, FileText, UserCheck
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

const ConvocationManagement: React.FC<ConvocationManagementProps> = ({ convocations, setConvocations, pssList, setPssList, userRole, onLog }) => {
  const [activeSubTab, setActiveSubTab] = useState<'classified' | 'convoked'>('classified');
  const [selectedPssId, setSelectedPssId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  
  const [showPssModal, setShowPssModal] = useState(false);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [namingAct, setNamingAct] = useState('');
  const [namingDate, setNamingDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setSelectedCandidates([]);
  }, [selectedPssId, activeSubTab]);

  const currentPss = useMemo(() => pssList.find(p => p.id === selectedPssId), [selectedPssId, pssList]);
  const filteredPssList = useMemo(() => pssList.filter(p => p.isArchived === showArchived), [pssList, showArchived]);

  // Lista apenas candidatos que pertencem ao PSS selecionado e estão nomeados/contratados
  const nominatedCandidates = useMemo(() => {
    if (!selectedPssId) return [];
    return convocations.filter(c => 
      c.pssId === selectedPssId && 
      (c.status === ConvocationStatus.PENDING || c.status === ConvocationStatus.HIRED)
    );
  }, [convocations, selectedPssId]);

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

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200">
        <button onClick={() => setActiveSubTab('classified')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeSubTab === 'classified' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}><Table size={14} className="inline mr-2" /> Classificação</button>
        <button onClick={() => setActiveSubTab('convoked')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeSubTab === 'convoked' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}><UserCheck size={14} className="inline mr-2" /> Nomeados</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
          <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm h-fit">
                  <div className="flex justify-between items-center mb-6"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Editais PSS</h3></div>
                  <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
                      <button onClick={() => { setShowArchived(false); setSelectedPssId(null); }} className={`py-2 rounded-lg text-[9px] font-black uppercase ${!showArchived ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Ativos</button>
                      <button onClick={() => { setShowArchived(true); setSelectedPssId(null); }} className={`py-2 rounded-lg text-[9px] font-black uppercase ${showArchived ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Arquivos</button>
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
                          <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Candidatos Classificados</h2></div>
                          {selectedCandidates.length > 0 && (<button onClick={() => setShowNamingModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl flex items-center hover:bg-blue-700 transition-all"><UserPlus size={16} className="mr-2"/> Nomear Selecionados ({selectedCandidates.length})</button>)}
                      </div>
                      <table className="w-full text-left">
                          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                              <tr>
                                  <th className="px-8 py-4 w-12"><input type="checkbox" onChange={(e) => setSelectedCandidates(e.target.checked ? currentPss?.candidates.filter(c => !nominatedCandidates.some(nc => nc.cpf === c.cpf)).map(c => c.id) || [] : [])} /></th>
                                  <th className="px-8 py-4">Ranking</th>
                                  <th className="px-8 py-4">Candidato / CPF</th>
                                  <th className="px-8 py-4 text-right">Situação</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {[...(currentPss?.candidates || [])].sort((a,b) => a.ranking - b.ranking).map(c => {
                                  const named = nominatedCandidates.find(nc => nc.cpf === c.cpf);
                                  return (
                                    <tr key={c.id} className={`hover:bg-slate-50 ${named ? 'opacity-40' : ''}`}>
                                        <td className="px-8 py-4">{!named && <input type="checkbox" checked={selectedCandidates.includes(c.id)} onChange={() => setSelectedCandidates(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])} />}</td>
                                        <td className="px-8 py-4 font-black text-blue-600">{c.ranking}º</td>
                                        <td className="px-8 py-4"><p className="text-xs font-bold text-slate-800">{c.name}</p><p className="text-[9px] text-slate-400">{maskCPF(c.cpf)}</p></td>
                                        <td className="px-8 py-4 text-right"><span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${named ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{named ? 'Nomeado' : 'Disponível'}</span></td>
                                    </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                    </>
                  )}

                  {activeSubTab === 'convoked' && (
                    <>
                      <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Candidatos Nomeados</h2>
                      </div>
                      <table className="w-full text-left">
                          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                              <tr>
                                  <th className="px-8 py-4">Ato / Portaria</th>
                                  <th className="px-8 py-4">Candidato</th>
                                  <th className="px-8 py-4">Data Nomeação</th>
                                  <th className="px-8 py-4 text-right">Status</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {nominatedCandidates.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50">
                                    <td className="px-8 py-4 font-black text-slate-800 text-xs"><FileText size={14} className="inline mr-2 text-blue-500" />{c.convocationAct}</td>
                                    <td className="px-8 py-4"><p className="text-xs font-bold text-slate-800">{c.name}</p><p className="text-[9px] text-slate-400">{maskCPF(c.cpf)}</p></td>
                                    <td className="px-8 py-4 text-xs font-bold text-slate-500">{formatDisplayDate(c.convocationDate || '')}</td>
                                    <td className="px-8 py-4 text-right"><span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${c.status === ConvocationStatus.HIRED ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{c.status}</span></td>
                                </tr>
                              ))}
                              {nominatedCandidates.length === 0 && (
                                  <tr><td colSpan={4} className="py-20 text-center text-slate-300 font-black uppercase text-[10px]">Nenhum candidato nomeado para este edital.</td></tr>
                              )}
                          </tbody>
                      </table>
                    </>
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
              <input value={namingAct} onChange={e => setNamingAct(e.target.value)} required placeholder="Ato / Portaria (ex: Port. 10/2024)" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              <input type="date" value={namingDate} onChange={e => setNamingDate(e.target.value)} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowNamingModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConvocationManagement;
