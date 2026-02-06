
import React, { useState, useMemo } from 'react';
import { ConvokedPerson, CompetitionType, ConvocationStatus, PSS, Vacancy, ContractStatus, UserRole } from '../types';
import { maskCPF, formatDisplayDate, generateId } from '../utils';
import { 
  X, Plus, FileSpreadsheet, Clock, Search, Trash2, CheckCircle2, AlertCircle
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
  pssList = [], 
  setPssList, 
  userRole, 
  onLog 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'classified' | 'convoked' | 'substitution'>('classified');
  const [selectedPssId, setSelectedPssId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showAddPssModal, setShowAddPssModal] = useState(false);
  
  const [newPssTitle, setNewPssTitle] = useState('');
  const [newPssDate, setNewPssDate] = useState('');
  
  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.HR;

  const safePssList = useMemo(() => Array.isArray(pssList) ? pssList : [], [pssList]);
  const filteredPssList = useMemo(() => safePssList.filter(p => p.isArchived === showArchived), [safePssList, showArchived]);
  const currentPss = useMemo(() => safePssList.find(p => p.id === selectedPssId), [selectedPssId, safePssList]);

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
          <div className="lg:col-span-1">
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
                            className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedPssId === p.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                          >
                              <p className="text-xs font-black text-slate-800 truncate">{p.title}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Validade: {formatDisplayDate(p.validUntil)}</p>
                          </div>
                      )) : (
                        <div className="py-20 text-center opacity-30 flex flex-col items-center">
                          <FileSpreadsheet size={32} className="mb-2"/>
                          <p className="text-[9px] font-black uppercase tracking-widest">Nenhum Edital</p>
                        </div>
                      )}
                  </div>
              </div>
          </div>

          <div className="lg:col-span-3">
              {selectedPssId ? (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[500px] p-10 flex flex-col items-center justify-center text-center opacity-40">
                   <FileSpreadsheet size={48} className="mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Edital Ativo: {currentPss?.title}</p>
                   <p className="text-[9px] font-bold uppercase mt-2">Clique nas abas acima para gerenciar este edital.</p>
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
          </div>
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
