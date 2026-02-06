
import React, { useState, useMemo, useRef } from 'react';
import { ConvokedPerson, CompetitionType, ConvocationStatus, PSS, Vacancy, ContractStatus, UserRole } from '../types';
import { maskCPF, formatDisplayDate, generateId, removeAccents } from '../utils';
import { 
  X, Plus, FileSpreadsheet, Clock, Search, Trash2, CheckCircle2, AlertCircle, Download, Upload, UserPlus, Filter, Trash, UserCheck, Mail, Megaphone, Calendar, Repeat
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
  userRole, 
  onLog 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'classified' | 'convoked' | 'substitution'>('classified');
  const [selectedPssId, setSelectedPssId] = useState<string | null>(null);
  const [showAddPssModal, setShowAddPssModal] = useState(false);
  const [showNominationModal, setShowNominationModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [nominationAct, setNominationAct] = useState('');
  const [nominationDate, setNominationDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newPssTitle, setNewPssTitle] = useState('');
  const [newPssDate, setNewPssDate] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.HR;

  const currentPss = useMemo(() => pssList.find(p => p.id === selectedPssId), [selectedPssId, pssList]);

  const candidates = useMemo(() => {
    let list = convocations.filter(c => c.pssId === selectedPssId);
    
    if (activeSubTab === 'classified') {
      list = list.filter(c => c.status === ConvocationStatus.PENDING && !c.convocationAct);
    } else if (activeSubTab === 'convoked') {
      list = list.filter(c => c.status === ConvocationStatus.PENDING && c.convocationAct);
    } else if (activeSubTab === 'substitution') {
      list = list.filter(c => c.status === ConvocationStatus.PENDING);
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

  const toggleSelectAll = () => {
    if (selectedIds.length === candidates.length && candidates.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(candidates.map(c => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleNomination = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;

    const sanitizedAct = removeAccents(nominationAct).toUpperCase();

    setConvocations(prev => prev.map(c => 
      selectedIds.includes(c.id) 
        ? { ...c, convocationAct: sanitizedAct, convocationDate: nominationDate } 
        : c
    ));

    const logType = activeSubTab === 'substitution' ? 'SUBSTITUIÇÃO' : 'CONVOCAÇÃO';
    onLog(logType, `Processamento de ${logType} (${sanitizedAct}) para ${selectedIds.length} candidatos.`);
    
    setShowNominationModal(false);
    setSelectedIds([]);
    setNominationAct('');
    alert("Operação concluída com sucesso.");
  };

  const handleAddPss = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = removeAccents(newPssTitle).toUpperCase();
    const newPss: PSS = { id: generateId(), title: cleanTitle, validUntil: newPssDate, isArchived: false, candidates: [] };
    setPssList(prev => [...prev, newPss]);
    setSelectedPssId(newPss.id);
    setShowAddPssModal(false);
    setNewPssTitle('');
    onLog('CRIAR_PSS', `Novo Edital "${cleanTitle}" cadastrado.`);
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
          ranking: parseInt(ranking) || 99,
          status: ConvocationStatus.PENDING, 
          createdAt: new Date().toISOString()
        });
      }
      
      setConvocations(prev => [...prev, ...newCandidates]);
      onLog('IMPORTAÇÃO', `Importados ${newCandidates.length} candidatos do edital ${currentPss?.title}.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex space-x-2 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200">
          <button 
            onClick={() => { setActiveSubTab('classified'); setSelectedIds([]); }} 
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeSubTab === 'classified' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            Classificados
          </button>
          <button 
            onClick={() => { setActiveSubTab('convoked'); setSelectedIds([]); }} 
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeSubTab === 'convoked' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            Chamamento Efetuado
          </button>
          <button 
            onClick={() => { setActiveSubTab('substitution'); setSelectedIds([]); }} 
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeSubTab === 'substitution' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <span className="flex items-center"><Repeat size={12} className="mr-1.5"/> Substituição</span>
          </button>
        </div>

        {canEdit && (
          <button onClick={() => setShowAddPssModal(true)} className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center hover:bg-blue-700 transition-all active:scale-95">
            <Plus size={18} className="mr-2" /> Novo Edital PSS
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[500px]">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center"><Clock size={14} className="mr-2" /> Editais Ativos</h3>
            <div className="space-y-2 overflow-y-auto max-h-[450px] pr-1 custom-scrollbar">
              {pssList.map(p => (
                <div key={p.id} onClick={() => { setSelectedPssId(p.id); setSelectedIds([]); }} className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedPssId === p.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                  <p className={`text-xs font-black truncate ${selectedPssId === p.id ? 'text-blue-700' : 'text-slate-800'}`}>{p.title}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Validade: {formatDisplayDate(p.validUntil)}</p>
                </div>
              ))}
              {pssList.length === 0 && <p className="text-[10px] font-bold text-slate-300 uppercase text-center py-10">Nenhum edital cadastrado</p>}
            </div>
          </div>
        </aside>

        <section className="lg:col-span-3">
          {selectedPssId ? (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in fade-in">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center"><FileSpreadsheet className="mr-3 text-blue-600" size={20} /> {currentPss?.title}</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">
                    {activeSubTab === 'classified' ? 'Candidatos aguardando chamamento' : activeSubTab === 'convoked' ? 'Candidatos convocados' : 'Processo de substituição (vagas remanescentes)'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {activeSubTab !== 'convoked' && canEdit && (
                    <>
                      <button onClick={() => fileInputRef.current?.click()} className="flex items-center px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200">
                        <Upload size={14} className="mr-2" /> Importar CSV
                      </button>
                      <button 
                        disabled={selectedIds.length === 0}
                        onClick={() => setShowNominationModal(true)} 
                        className={`flex items-center px-6 py-2.5 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-30 disabled:grayscale ${activeSubTab === 'substitution' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                      >
                        {activeSubTab === 'substitution' ? <Repeat size={14} className="mr-2"/> : <Megaphone size={14} className="mr-2" />}
                        {activeSubTab === 'substitution' ? 'Substituir Agora' : 'Realizar Chamamento'} ({selectedIds.length})
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv, .txt" className="hidden" />
                    </>
                  )}
                </div>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Buscar por nome ou CPF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all" />
              </div>

              <div className="overflow-hidden border border-slate-100 rounded-2xl">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 border-b border-slate-100">
                    <tr>
                      {activeSubTab !== 'convoked' && <th className="px-6 py-4 w-10 text-center"><input type="checkbox" checked={selectedIds.length === candidates.length && candidates.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded cursor-pointer" /></th>}
                      <th className="px-6 py-4">Ranking</th>
                      <th className="px-6 py-4">Candidato / CPF</th>
                      <th className="px-6 py-4">Perfil</th>
                      <th className="px-6 py-4">Modalidade</th>
                      {(activeSubTab === 'convoked' || activeSubTab === 'substitution') && <th className="px-6 py-4">Ato / Portaria</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {candidates.map(c => (
                      <tr key={c.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(c.id) ? 'bg-blue-50/30' : ''}`}>
                        {activeSubTab !== 'convoked' && <td className="px-6 py-4 text-center"><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4 rounded cursor-pointer" /></td>}
                        <td className="px-6 py-4 font-black text-slate-900">#{c.ranking}</td>
                        <td className="px-6 py-4">
                           <p className="font-bold text-slate-800">{c.name}</p>
                           <p className="text-[9px] text-slate-400 font-mono tracking-tighter">{c.cpf}</p>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-500 uppercase text-[10px]">{c.profile}</td>
                        <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${c.competition === CompetitionType.AC ? 'bg-white text-slate-500 border-slate-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>{c.competition}</span></td>
                        {(activeSubTab === 'convoked' || activeSubTab === 'substitution') && (
                          <td className="px-6 py-4">
                            {c.convocationAct ? (
                              <>
                                <p className="font-black text-blue-600 uppercase">{c.convocationAct}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">{formatDisplayDate(c.convocationDate || '')}</p>
                              </>
                            ) : (
                              <span className="text-slate-300 italic">Aguardando Ato</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-32 flex flex-col items-center justify-center text-center h-full">
              <FileSpreadsheet size={64} className="text-slate-200 mb-6"/>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Gestão de Classificados</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest max-w-xs">Selecione um edital para iniciar o chamamento ou substituição.</p>
            </div>
          )}
        </section>
      </div>

      {showNominationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-10 shadow-2xl relative animate-in zoom-in duration-200 border border-slate-100">
            <button onClick={() => setShowNominationModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <h2 className="text-2xl font-black mb-1 text-slate-800 uppercase tracking-tighter">
              {activeSubTab === 'substitution' ? 'Substituição' : 'Chamamento'}
            </h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-8">Processando {selectedIds.length} candidatos do edital {currentPss?.title}</p>
            <form onSubmit={handleNomination} className="space-y-4">
              <input value={nominationAct} onChange={e => setNominationAct(e.target.value)} required placeholder="Ex: Portaria 123/2024" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
              <input type="date" value={nominationDate} onChange={e => setNominationDate(e.target.value)} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500" />
              <button type="submit" className={`w-full py-4 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl mt-4 active:scale-95 transition-all ${activeSubTab === 'substitution' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                Confirmar {activeSubTab === 'substitution' ? 'Substituição' : 'Chamamento'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showAddPssModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-10 shadow-2xl relative animate-in zoom-in duration-200 border border-slate-100">
            <button onClick={() => setShowAddPssModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <h2 className="text-2xl font-black mb-1 text-slate-800 uppercase tracking-tighter">Novo Edital</h2>
            <form onSubmit={handleAddPss} className="space-y-4">
              <input value={newPssTitle} onChange={e => setNewPssTitle(e.target.value)} required placeholder="Ex: PSS 01/2024" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
              <input type="date" value={newPssDate} onChange={e => setNewPssDate(e.target.value)} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl mt-4 active:scale-95">Salvar Edital</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConvocationManagement;
