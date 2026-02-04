
import React, { useState, useMemo } from 'react';
import { LegalParameter, User, Vacancy, ConvokedPerson, UserRole, EmailConfig, PSS, GenericParameter } from '../types';
import { 
  Plus, Trash2, Building2, MapPin, X, UserPlus, Mail, Clock, Briefcase, Activity, Users, Save, ShieldAlert, Lock, Info, EyeOff, Eye, Scale, Gavel, Database, Copy, Check, Terminal, KeyRound, AlertCircle
} from 'lucide-react';
import { generateId, normalizeString } from '../utils';

interface SettingsViewProps {
  parameters: LegalParameter[];
  setParameters: React.Dispatch<React.SetStateAction<LegalParameter[]>>;
  agencies: GenericParameter[];
  setAgencies: React.Dispatch<React.SetStateAction<GenericParameter[]>>;
  units: GenericParameter[];
  setUnits: React.Dispatch<React.SetStateAction<GenericParameter[]>>;
  profiles: GenericParameter[];
  setProfiles: React.Dispatch<React.SetStateAction<GenericParameter[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  vacancies: Vacancy[];
  convocations: ConvokedPerson[];
  pssList: PSS[];
  onRestoreAll: (data: any) => void;
  cloudStatus?: 'idle' | 'syncing' | 'error' | 'connected' | 'setup_required';
  cloudErrorMessage?: string | null;
  onLog: (action: string, details: string) => void;
  emailConfig: EmailConfig;
  setEmailConfig: (e: EmailConfig) => void;
}

interface ListManagerProps {
  title: string;
  subtitle: string;
  items: GenericParameter[];
  onAdd: (name: string) => void;
  onAction: (item: GenericParameter) => void;
  onToggleStatus: (item: GenericParameter) => void;
  icon: React.ReactNode;
}

const ListManager: React.FC<ListManagerProps> = ({ title, subtitle, items, onAdd, onAction, onToggleStatus, icon }) => {
  const [inputValue, setInputValue] = useState('');
  
  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-[450px]">
      <div className="flex items-center space-x-3 mb-2">
        <div className="p-2 bg-slate-50 text-slate-500 rounded-xl">{icon}</div>
        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{title}</h3>
      </div>
      <p className="text-[9px] text-slate-400 font-bold uppercase mb-6 leading-tight">{subtitle}</p>
      
      <div className="flex space-x-2 mb-6">
        <input 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Novo item..."
          className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-blue-500 transition-all"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95">
          <Plus size={18}/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {items.map((item) => (
          <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${item.status === 'inactive' ? 'bg-slate-50 opacity-60 border-transparent' : 'bg-white border-slate-100'}`}>
            <span className={`text-[10px] font-bold uppercase truncate max-w-[120px] ${item.status === 'inactive' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
              {item.name}
            </span>
            <div className="flex items-center">
              <button 
                onClick={() => onToggleStatus(item)}
                className={`p-1.5 rounded-lg transition-colors mr-1 ${item.status === 'inactive' ? 'text-slate-300 hover:text-blue-500' : 'text-blue-500 hover:bg-blue-50'}`}
                title={item.status === 'active' ? 'Ocultar item' : 'Mostrar item'}
              >
                {item.status === 'inactive' ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
              <button 
                onClick={() => onAction(item)}
                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Excluir/Inativar"
              >
                <Trash2 size={14}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SettingsView: React.FC<SettingsViewProps> = ({ 
  parameters = [], setParameters, 
  agencies = [], setAgencies,
  units = [], setUnits,
  profiles = [], setProfiles,
  users = [], setUsers, 
  vacancies = [],
  convocations = [],
  pssList = [],
  onLog,
  cloudStatus,
  cloudErrorMessage,
  emailConfig,
  setEmailConfig
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'params' | 'users' | 'email' | 'cloud'>('params');
  const [showParamModal, setShowParamModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [newParam, setNewParam] = useState<Partial<LegalParameter>>({ 
    label: '', 
    days: 0, 
    type: 'administrative', 
    lawRef: '', 
    articleRef: '', 
    legalText: '',
    status: 'active'
  });

  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: UserRole.CONSULTANT });

  // Fix for "Cannot find name 'handleItemAction'"
  const handleItemAction = (item: GenericParameter, setter: any, type: string) => {
    // Check if item is being used in any vacancy
    const isUsed = vacancies.some(v => {
      if (type === 'a') return v.agency === item.name;
      if (type === 'u') return v.unit === item.name;
      if (type === 'p') return v.type === item.name;
      return false;
    });

    if (isUsed) {
      alert(`Este item ("${item.name}") está vinculado a um ou mais grupos de vagas e não pode ser removido definitivamente. Sugerimos apenas ocultá-lo clicando no ícone do olho.`);
      return;
    }

    if (confirm(`Deseja remover permanentemente o item "${item.name}"? Esta ação não pode ser desfeita.`)) {
      setter((prev: any) => prev.filter((i: any) => i.id !== item.id));
      onLog('CONFIGURAÇÃO', `Item "${item.name}" removido das parametrizações.`);
    }
  };

  const REPAIR_SQL = `-- REPARO DE BANCO SISTEMP (EXECUTAR NO SQL EDITOR)
-- 1. Cria a Tabela Principal
CREATE TABLE IF NOT EXISTS sistemp_data (
    id bigint PRIMARY KEY,
    vacancies jsonb DEFAULT '[]'::jsonb,
    parameters jsonb DEFAULT '[]'::jsonb,
    convocations jsonb DEFAULT '[]'::jsonb,
    pss_list jsonb DEFAULT '[]'::jsonb, 
    users jsonb DEFAULT '[]'::jsonb,
    agencies jsonb DEFAULT '[]'::jsonb,
    units jsonb DEFAULT '[]'::jsonb,
    profiles jsonb DEFAULT '[]'::jsonb,
    email_config jsonb DEFAULT '{}'::jsonb,
    logs jsonb DEFAULT '[]'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Concede permissões para o acesso público (Anonymous)
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON TABLE sistemp_data TO anon;
GRANT ALL ON TABLE sistemp_data TO authenticated;

-- 3. Desativa segurança RLS (Fundamental para acesso via chave anon)
ALTER TABLE sistemp_data DISABLE ROW LEVEL SECURITY;

-- 4. Cria registro inicial
INSERT INTO sistemp_data (id) VALUES (1) ON CONFLICT (id) DO NOTHING;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(REPAIR_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleStatus = (item: GenericParameter, setter: any) => {
    setter((prev: any) => prev.map((i: any) => i.id === item.id ? { ...i, status: i.status === 'active' ? 'inactive' : 'active' } : i));
  };

  const validParameters = useMemo(() => parameters.filter(p => p && p.label).reverse(), [parameters]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200">
        <button onClick={() => setActiveSubTab('params')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'params' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Prazos e Perfis</button>
        <button onClick={() => setActiveSubTab('users')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Operadores</button>
        <button onClick={() => setActiveSubTab('email')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'email' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Notificações</button>
        <button onClick={() => setActiveSubTab('cloud')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'cloud' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}>Conexão e Nuvem</button>
      </div>

      {activeSubTab === 'cloud' && (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center mb-6"><Activity className="mr-2 text-indigo-600" size={18}/> Diagnóstico de Conexão</h3>
                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${cloudStatus === 'connected' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {cloudStatus === 'connected' ? <Check size={20}/> : <AlertCircle className="animate-pulse" size={20}/>}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase">Estado Remoto</p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${cloudStatus === 'connected' ? 'text-green-600' : 'text-red-500'}`}>
                            {cloudStatus === 'connected' ? 'Sincronização Ativa' : cloudStatus === 'setup_required' ? 'Tabela não encontrada' : 'Erro de Comunicação'}
                        </p>
                      </div>
                    </div>
                    {cloudStatus === 'connected' && <span className="text-[10px] font-black text-green-500 bg-white border border-green-200 px-3 py-1.5 rounded-full animate-pulse shadow-sm">CONECTADO</span>}
                </div>
            </div>

            {cloudErrorMessage && (
              <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl border-4 border-slate-800">
                  <div className="flex items-center space-x-4 mb-4">
                      <Terminal className="text-blue-400" size={32}/>
                      <h3 className="text-lg font-black uppercase tracking-tighter text-blue-100">Relatório Técnico</h3>
                  </div>
                  <div className="bg-black/30 p-5 rounded-2xl font-mono text-[11px] leading-relaxed break-all border border-white/5">
                      {cloudErrorMessage}
                  </div>
              </div>
            )}

            <div className="bg-white p-10 rounded-[2.5rem] border-2 border-indigo-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-4">
                        <ShieldAlert className="text-indigo-600" size={28}/>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Reparo de Banco e Estrutura</h3>
                    </div>
                    <p className="text-sm text-slate-600 font-medium max-w-xl mb-8 leading-relaxed">
                        Se este for um projeto novo no Supabase, você precisa criar a tabela `sistemp_data` para que o sistema possa salvar as informações. Copie o script abaixo e execute-o no <strong>SQL Editor</strong> do seu painel.
                    </p>

                    <div className="bg-slate-900 rounded-[1.5rem] p-6 relative group border border-slate-800">
                        <button onClick={handleCopySql} className="absolute top-4 right-4 px-4 py-2 bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/5 active:scale-95">
                          {copied ? <span className="text-green-400">Copiado!</span> : <span className="flex items-center gap-2"><Copy size={12}/> Copiar SQL</span>}
                        </button>
                        <pre className="text-[11px] text-blue-300 font-mono overflow-x-auto max-h-[250px] leading-relaxed py-4 scrollbar-thin">
                            {REPAIR_SQL}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeSubTab === 'params' && (
        <div className="space-y-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center"><Scale className="mr-3 text-blue-600" size={20}/> Prazos Legais</h3>
              <button onClick={() => setShowParamModal(true)} className="px-5 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all">+ Novo Prazo</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {validParameters.map((p) => (
                <div key={p.id} className="p-6 rounded-3xl border border-slate-100 bg-white shadow-sm hover:border-blue-200 transition-all group">
                  <p className="font-black text-slate-800 text-sm">{p.label}</p>
                  <p className="text-xl font-black text-blue-600 mt-1">{p.days} Dias</p>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{p.lawRef}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ListManager title="Órgãos" subtitle="Gestão de Órgãos" items={agencies} onAdd={(name) => setAgencies((p:any) => [{id: generateId(), name, status:'active'}, ...p])} onAction={(i) => handleItemAction(i, setAgencies, 'a')} onToggleStatus={(i) => handleToggleStatus(i, setAgencies)} icon={<Building2/>} />
            <ListManager title="Unidades" subtitle="Gestão de Unidades" items={units} onAdd={(name) => setUnits((p:any) => [{id: generateId(), name, status:'active'}, ...p])} onAction={(i) => handleItemAction(i, setUnits, 'u')} onToggleStatus={(i) => handleToggleStatus(i, setUnits)} icon={<MapPin/>} />
            <ListManager title="Perfis" subtitle="Gestão de Perfis" items={profiles} onAdd={(name) => setProfiles((p:any) => [{id: generateId(), name, status:'active'}, ...p])} onAction={(i) => handleItemAction(i, setProfiles, 'p')} onToggleStatus={(i) => handleToggleStatus(i, setProfiles)} icon={<Briefcase/>} />
          </div>
        </div>
      )}

      {/* Modais de Gerenciamento */}
      {showParamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-10 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tighter">Novo Prazo</h2>
            <form onSubmit={(e) => { e.preventDefault(); setParameters(p => [...p, { ...newParam, id: generateId() } as LegalParameter]); setShowParamModal(false); }} className="space-y-4">
              <input value={newParam.label} onChange={e => setNewParam({...newParam, label: e.target.value})} placeholder="Rótulo (ex: Art. 2, IV)" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" required />
              <input type="number" value={newParam.days} onChange={e => setNewParam({...newParam, days: Number(e.target.value)})} placeholder="Dias Máximos" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" required />
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowParamModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
