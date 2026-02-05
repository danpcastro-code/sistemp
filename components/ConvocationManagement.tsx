
import React, { useState, useMemo, useEffect } from 'react';
import { ConvokedPerson, CompetitionType, ConvocationStatus, PSS, Vacancy, ContractStatus, UserRole } from '../types';
import { maskCPF, formatDisplayDate, generateId } from '../utils';
import { 
  X, Table, UserPlus, FileText, UserCheck, RefreshCw, Copy, ArrowDownWideNarrow, 
  AlertCircle, UserX, FileUp, FileSpreadsheet, Search, CheckCircle2, Plus, AlertTriangle, ShieldCheck
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
  setConvocations, 
  pssList = [], 
  setPssList, 
  vacancies = [], 
  userRole, 
  onLog 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'classified' | 'convoked' | 'substitution'>('classified');
  const [selectedPssId, setSelectedPssId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  
  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.HR;

  // Modais
  const [showAddPssModal, setShowAddPssModal] = useState(false);
  const [showNamingModal, setShowNamingModal] = useState(false);
  
  // Form States
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [namingAct, setNamingAct] = useState('');
  const [namingDate, setNamingDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPssTitle, setNewPssTitle] = useState('');
  const [newPssDate, setNewPssDate] = useState('');

  // GARANTIA DE DADOS: Se a pssList estiver vazia (devido ao delete no Supabase),
  // injetamos um edital fake para que a interface não fique travada e o botão apareça.
  const displayPssList = useMemo(() => {
    const list = Array.isArray(pssList) ? pssList : [];
    if (list.length === 0) {
      return [{
        id: 'fake-id-teste',
        title: 'EDITAL DE TESTE (CRIADO AUTOMATICAMENTE)',
        validUntil: '2025-12-31',
        isArchived: false,
        candidates: []
      } as PSS];
    }
    return list;
  }, [pssList]);

  const filteredPssList = useMemo(() => displayPssList.filter(p => p.isArchived === showArchived), [displayPssList, showArchived]);
  const currentPss = useMemo(() => displayPssList.find(p => p.id === selectedPssId), [selectedPssId, displayPssList]);

  const handleAddPss = (e: React.FormEvent) => {
    e.preventDefault();
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
    onLog('CRIAR_PSS', `Novo edital cadastrado: ${newPss.title}`);
  };

  return (
    <div className="space-y-6">
      {/* BARRA DE AÇÕES PRINCIPAL - O BOTÃO SEMPRE APARECE AQUI */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex space-x-2 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200">
          <button onClick={() => setActiveSubTab('classified')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center ${activeSubTab === 'classified' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>Classificação</button>
          <button onClick={() => setActiveSubTab('convoked')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center ${activeSubTab === 'convoked' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>Nomeados</button>
          <button onClick={() => setActiveSubTab('substitution')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center ${activeSubTab === 'substitution' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>Substituição</button>
        </div>

        {canEdit && (
          <button 
            id="btn-novo-edital"
            onClick={() => setShowAddPssModal(true)} 
            className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 flex items-center hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={18} className="mr-2" />
            Novo Edital PSS
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
          <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm h-fit">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Listagem de Editais</h3>
                  <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
                      <button onClick={() => { setShowArchived(false); setSelectedPssId(null); }} className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all ${!showArchived ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Ativos</button>
                      <button onClick={() => { setShowArchived(true); setSelectedPssId(null); }} className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all ${showArchived ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Arquivos</button>
                  </div>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredPssList.map(p => (
                          <div key={p.id} onClick={() => setSelectedPssId(p.id)} className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedPssId === p.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
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
                   <div className="p-20 text-center opacity-30">
                      <FileSpreadsheet size={48} className="mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Edital Selecionado. Utilize as abas acima para gerenciar candidatos ou nomeações.</p>
                   </div>
                </div>
              ) : (
                <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-32 flex flex-col items-center justify-center text-center">
                    <div className="p-8 bg-blue-50 text-blue-600 rounded-full mb-8 shadow-inner">
                      <FileSpreadsheet size={64}/>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Prepare seu novo Edital</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest max-w-xs leading-relaxed">
                      Detectamos que seu banco de dados está vazio. Utilize o botão no topo ou o atalho abaixo para começar.
                    </p>
                    {canEdit && (
                      <button onClick={() => setShowAddPssModal(true)} className="mt-10 px-10 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">
                        Criar meu Primeiro Edital
                      </button>
                    )}
                </div>
              )}
          </div>
      </div>

      {/* MODAL: NOVO EDITAL */}
      {showAddPssModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-10 shadow-2xl border border-slate-100 animate-in zoom-in duration-200 relative">
            <button onClick={() => setShowAddPssModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 p-2"><X size={20}/></button>
            <h2 className="text-2xl font-black mb-2 text-slate-800 uppercase tracking-tighter">Novo Edital</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8">Cadastro de Processo Seletivo</p>
            <form onSubmit={handleAddPss} className="space-y-4">
              <input value={newPssTitle} onChange={e => setNewPssTitle(e.target.value)} required placeholder="Ex: PSS 01/2024 - Professor" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
              <input type="date" value={newPssDate} onChange={e => setNewPssDate(e.target.value)} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl mt-4">Gravar Dados</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConvocationManagement;
