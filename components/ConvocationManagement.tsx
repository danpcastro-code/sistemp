
import React, { useState, useMemo, useRef } from 'react';
import { ConvokedPerson, CompetitionType, ConvocationStatus, PSS, Vacancy, ContractStatus, UserRole } from '../types';
import { maskCPF, formatDisplayDate, generateId } from '../utils';
import { 
  X, Plus, FileSpreadsheet, Clock, Search, Trash2, CheckCircle2, AlertCircle, Download, Upload, UserPlus, Filter, Trash, UserCheck, Mail
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
  const [showArchived, setShowArchived] = useState(false);
  const [showAddPssModal, setShowAddPssModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newPssTitle, setNewPssTitle] = useState('');
  const [newPssDate, setNewPssDate] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.HR;

  const safePssList = useMemo(() => Array.isArray(pssList) ? pssList : [], [pssList]);
  const filteredPssList = useMemo(() => safePssList.filter(p => p.isArchived === showArchived), [safePssList, showArchived]);
  const currentPss = useMemo(() => safePssList.find(p => p.id === selectedPssId), [selectedPssId, safePssList]);

  // Filtra candidatos do PSS selecionado
  const pssCandidates = useMemo(() => {
    return convocations.filter(c => c.pssId === selectedPssId)
      .sort((a, b) => a.ranking - b.ranking);
  }, [convocations, selectedPssId]);

  const displayedCandidates = useMemo(() => {
    if (!searchTerm) return pssCandidates;
    return pssCandidates.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.cpf.includes(searchTerm)
    );
  }, [pssCandidates, searchTerm]);

  const handleAddPss = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPssTitle || !newPssDate) return;

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
    onLog('CRIAR_PSS', `Novo Edital "${newPss.title}" cadastrado.`);
  };

  const downloadTemplate = () => {
    const headers = ["Nome", "CPF", "Email", "Perfil", "Modalidade (AC, PCD, PPP)", "Ranking"];
    const rows = [
      ["João da Silva", "123.456.789-00", "joao@email.com", "Professor Substituto", "AC", "1"],
      ["Maria Souza", "234.567.890-11", "maria@email.com", "Professor Substituto", "PCD", "1"]
    ];
    const content = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo_classificados_pss.csv";
    link.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPssId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newCandidates: ConvokedPerson[] = [];

      // Ignora o cabeçalho e linhas vazias
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = line.split(';').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 6) continue;

        const [nome, cpf, email, perfil, modalidade, ranking] = cols;
        
        let competition = CompetitionType.AC;
        if (modalidade.toUpperCase() === 'PCD') competition = CompetitionType.PCD;
        if (modalidade.toUpperCase() === 'PPP') competition = CompetitionType.PPP;

        newCandidates.push({
          id: generateId(),
          name: nome,
          cpf: cpf,
          email: email,
          profile: perfil,
          notice: currentPss?.title || '',
          pssId: selectedPssId,
          competition: competition,
          ranking: parseInt(ranking) || 99,
          status: ConvocationStatus.PENDING,
          createdAt: new Date().toISOString()
        });
      }

      if (newCandidates.length > 0) {
        setConvocations(prev => [...prev, ...newCandidates]);
        onLog('IMPORTAÇÃO', `Importados ${newCandidates.length} candidatos para o edital ${currentPss?.title}.`);
        alert(`${newCandidates.length} candidatos importados com sucesso.`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearCandidates = () => {
    if (confirm("Deseja remover TODOS os candidatos vinculados a este edital? Esta ação não pode ser desfeita.")) {
      setConvocations(prev => prev.filter(c => c.pssId !== selectedPssId));
      onLog('LIMPEZA', `Todos os candidatos do edital ${currentPss?.title} foram removidos.`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex space-x-2 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200">
          <button onClick={() => setActiveSubTab('classified')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeSubTab === 'classified' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>Classificados</button>
          <button onClick={() => setActiveSubTab('convoked')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeSubTab === 'convoked' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>Nomeações</button>
          <button onClick={() => setActiveSubTab('substitution')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeSubTab === 'substitution' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>Substituição</button>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[500px]">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                    <Clock size={14} className="mr-2" /> Listagem de Editais
                  </h3>
                  <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
                      <button onClick={() => { setShowArchived(false); setSelectedPssId(null); }} className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all ${!showArchived ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Ativos</button>
                      <button onClick={() => { setShowArchived(true); setSelectedPssId(null); }} className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all ${showArchived ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Arquivos</button>
                  </div>
                  
                  <div className="space-y-2 overflow-y-auto max-h-[450px] pr-1 custom-scrollbar">
                      {filteredPssList.length > 0 ? filteredPssList.map(p => (
                          <div 
                            key={p.id} 
                            onClick={() => setSelectedPssId(p.id)} 
                            className={`p-4 rounded-2xl border transition-all cursor-pointer group ${selectedPssId === p.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                          >
                              <div className="flex justify-between items-start">
                                <div>
                                    <p className={`text-xs font-black truncate max-w-[120px] ${selectedPssId === p.id ? 'text-blue-700' : 'text-slate-800'}`}>{p.title}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Validade: {formatDisplayDate(p.validUntil)}</p>
                                </div>
                                {selectedPssId === p.id && (
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                )}
                              </div>
                          </div>
                      )) : (
                        <div className="py-20 text-center opacity-30 flex flex-col items-center">
                          <FileSpreadsheet size={32} className="mb-2"/>
                          <p className="text-[9px] font-black uppercase tracking-widest">Nenhum Edital</p>
                        </div>
                      )}
                  </div>
              </div>
          </aside>

          <section className="lg:col-span-3">
              {selectedPssId ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* CABEÇALHO DA ABA CLASSIFICADOS */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center">
                                    <FileSpreadsheet className="mr-3 text-blue-600" size={20} /> 
                                    {currentPss?.title}
                                </h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">
                                    {pssCandidates.length} Candidatos Classificados no Edital
                                </p>
                            </div>

                            {activeSubTab === 'classified' && canEdit && (
                                <div className="flex flex-wrap gap-2">
                                    <button 
                                        onClick={downloadTemplate}
                                        className="flex items-center px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 shadow-sm"
                                    >
                                        <Download size={14} className="mr-2" /> Baixar Modelo
                                    </button>
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                                    >
                                        <Upload size={14} className="mr-2" /> Importar Planilha
                                    </button>
                                    <button 
                                        onClick={clearCandidates}
                                        className="flex items-center px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
                                        title="Limpar Lista"
                                    >
                                        <Trash size={14} />
                                    </button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                                </div>
                            )}
                        </div>

                        {activeSubTab === 'classified' && (
                            <div className="mt-8">
                                <div className="relative mb-6">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar por nome ou CPF..." 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>

                                <div className="bg-white rounded-[1.5rem] border border-slate-100 overflow-hidden">
                                    <table className="w-full text-left text-[11px]">
                                        <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4">Ranking</th>
                                                <th className="px-6 py-4">Candidato / CPF</th>
                                                <th className="px-6 py-4">Perfil</th>
                                                <th className="px-6 py-4">Modalidade</th>
                                                <th className="px-6 py-4 text-right">Situação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {displayedCandidates.length > 0 ? displayedCandidates.map((c) => (
                                                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-black text-slate-900 text-xs">#{c.ranking}</td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-slate-800">{c.name}</p>
                                                        <p className="text-[9px] text-slate-400 font-mono">{maskCPF(c.cpf)}</p>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-slate-500">{c.profile}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${c.competition === CompetitionType.AC ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                                            {c.competition}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${c.status === ConvocationStatus.HIRED ? 'bg-green-50 text-green-600' : c.status === ConvocationStatus.PENDING ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                                                            {c.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-20 text-center opacity-30">
                                                        <div className="flex flex-col items-center">
                                                            <Filter size={32} className="mb-2"/>
                                                            <p className="text-[9px] font-black uppercase tracking-widest">Nenhum candidato encontrado</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
              ) : (
                <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-32 flex flex-col items-center justify-center text-center h-full">
                    <div className="p-8 bg-blue-50 text-blue-600 rounded-full mb-8 shadow-inner">
                      <FileSpreadsheet size={64}/>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Processos Seletivos</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest max-w-xs leading-relaxed">
                      Selecione um edital na lista lateral para gerenciar os candidatos ou crie um novo.
                    </p>
                    {canEdit && (
                      <button onClick={() => setShowAddPssModal(true)} className="mt-10 px-10 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all active:scale-95">
                        Novo Edital Agora
                      </button>
                    )}
                </div>
              )}
          </section>
      </div>

      {showAddPssModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-10 shadow-2xl relative border border-slate-100 animate-in zoom-in duration-200">
            <button onClick={() => setShowAddPssModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 p-2"><X size={20}/></button>
            <h2 className="text-2xl font-black mb-2 text-slate-800 uppercase tracking-tighter">Novo Edital</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8">Cadastro de Novo Processo Seletivo</p>
            <form onSubmit={handleAddPss} className="space-y-4">
              <input value={newPssTitle} onChange={e => setNewPssTitle(e.target.value)} required placeholder="Ex: PSS 01/2024 - Professor" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Validade:</label>
                <input type="date" value={newPssDate} onChange={e => setNewPssDate(e.target.value)} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none mt-1" />
              </div>
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl mt-4 active:scale-95 transition-all">Salvar Edital</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConvocationManagement;
