
import React, { useState } from 'react';
import { LegalParameter, User, Vacancy, ConvokedPerson, UserRole, EmailConfig, PSS, GenericParameter } from '../types';
import { removeAccents, generateId } from '../utils';
import { 
  Plus, Trash2, Building2, MapPin, X, UserPlus, Mail, Clock, Briefcase, Activity, Users as UsersIcon, Save, ShieldAlert, Lock, Info, EyeOff, Eye, Scale, DatabaseZap, Bomb, RefreshCw, Check, KeyRound, Terminal
} from 'lucide-react';

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
  onRestoreAll: () => void;
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
      onAdd(removeAccents(inputValue.trim()).toUpperCase());
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
                title="Excluir"
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
  emailConfig,
  setEmailConfig,
  onRestoreAll
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'params' | 'users' | 'email' | 'cloud'>('params');
  const [showParamModal, setShowParamModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [newParam, setNewParam] = useState<Partial<LegalParameter>>({ 
    label: '', days: 0, type: 'administrative', lawRef: '', articleRef: '', legalText: '', status: 'active'
  });

  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: UserRole.HR });

  const REPAIR_SQL = `-- SCRIPT DE REPARO INTEGRAL SUPABASE - CTU GESTÃO v2.6
-- 1. Criação/Atualização da Tabela Centralizada
CREATE TABLE IF NOT EXISTS public.sistemp_data (
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

-- 2. Permissões Globais
ALTER TABLE public.sistemp_data DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.sistemp_data TO anon;
GRANT ALL ON TABLE public.sistemp_data TO authenticated;
GRANT ALL ON TABLE public.sistemp_data TO service_role;

-- 3. Inicialização de Registro Mestre
INSERT INTO public.sistemp_data (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.sistemp_data IS 'Base de Dados Integral v2.6 - CTU Gestão';`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(REPAIR_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveParam = (e: React.FormEvent) => {
    e.preventDefault();
    const p: LegalParameter = { 
      id: generateId(), 
      label: removeAccents(newParam.label || '').toUpperCase(),
      days: newParam.days || 0,
      description: '',
      type: 'legal',
      status: 'active'
    };
    setParameters(prev => [...prev, p]);
    setShowParamModal(false);
    onLog('CONFIGURAÇÃO', `Novo prazo legal "${p.label}" adicionado.`);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const user: User = { ...newUser, id: generateId() };
    setUsers(prev => [...prev, user]);
    setShowUserModal(false);
    onLog('USUÁRIOS', `Operador "${user.name}" cadastrado.`);
    setNewUser({ name: '', username: '', password: '', role: UserRole.HR });
  };

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
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center mb-6"><Activity className="mr-2 text-indigo-600" size={18}/> Estado da Nuvem</h3>
                {cloudStatus === 'connected' ? (
                   <div className="p-8 bg-green-50 rounded-[2rem] border border-green-200 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><Check size={24}/></div>
                        <div>
                          <p className="text-xs font-black text-slate-800 uppercase">Sincronização Ativa</p>
                          <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mt-1">SISTEMA INTEGRADO AO SUPABASE</p>
                        </div>
                      </div>
                      <span className="px-4 py-2 bg-white text-green-600 border border-green-100 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">Online</span>
                   </div>
                ) : (
                  <div className="p-8 bg-amber-50 rounded-[2rem] border border-amber-200 flex items-center justify-between animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><RefreshCw size={24} className="animate-spin" /></div>
                        <div>
                          <p className="text-xs font-black text-slate-800 uppercase">Processando...</p>
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1">Status: {cloudStatus}</p>
                        </div>
                      </div>
                  </div>
                )}
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] border-2 border-indigo-100 shadow-sm relative overflow-hidden">
                <div className="flex items-center space-x-3 mb-4">
                    <DatabaseZap className="text-indigo-600" size={28}/><h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Script SQL de Reparo Supabase</h3>
                </div>
                <div className="bg-slate-900 rounded-[1.5rem] p-6 relative group border border-slate-800">
                    <button onClick={handleCopySql} className="absolute top-4 right-4 px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl">{copied ? 'Copiado!' : 'Copiar Script SQL'}</button>
                    <pre className="text-[11px] text-blue-300 font-mono overflow-x-auto max-h-[300px] leading-relaxed py-4 scrollbar-thin">{REPAIR_SQL}</pre>
                </div>
                <p className="mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center"><Info size={12} className="mr-2"/> Utilize este script caso ocorra erro 42P01 ou perda de tabelas.</p>
            </div>

            {/* ZONA DE PERIGO - BOTÃO ZERAR SISTEMA RESTAURADO */}
            <div className="bg-red-50 p-8 rounded-[2.5rem] border-2 border-red-100 shadow-sm mt-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-4 bg-red-600 text-white rounded-2xl shadow-lg"><Bomb size={24}/></div>
                  <div>
                    <h3 className="text-sm font-black text-red-800 uppercase tracking-tighter">Zona de Perigo: Master Reset</h3>
                    <p className="text-[10px] text-red-600 font-bold uppercase mt-1 tracking-widest leading-relaxed max-w-sm">Esta ação apaga permanentemente todos os registros (vagas, contratos, operadores) e restaura os padrões de fábrica.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const pwd = window.prompt("⚠️ AÇÃO IRREVERSÍVEL\nDigite a SENHA MESTRA para confirmar a limpeza total de dados:");
                    if (pwd === "1!Leinad") onRestoreAll();
                    else if (pwd !== null) alert("Senha incorreta. Acesso negado.");
                  }} 
                  className="px-8 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all border border-red-500 flex items-center active:scale-95"
                >
                  <RefreshCw size={14} className="mr-2" /> Zerar Todo o Sistema
                </button>
              </div>
            </div>
        </div>
      )}

      {activeSubTab === 'params' && (
        <div className="space-y-8 animate-in fade-in">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl mr-3"><Scale size={20}/></div>
                <div><h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Prazos Legais (Sem Acentos)</h3><p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Base de cálculo para vencimentos</p></div>
              </div>
              <button onClick={() => setShowParamModal(true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-blue-700 transition-all flex items-center"><Plus size={14} className="mr-1.5"/> Novo Prazo</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {parameters.filter(p => p && p.label).map((p) => (
                <div key={p.id} className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 transition-all flex items-center justify-between group">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.lawRef || 'Lei 8.745'}</p>
                    <p className="font-bold text-slate-800 text-xs">{p.label}</p>
                    <span className="text-[8px] font-black text-blue-600 uppercase">{p.days} Dias de Saldo</span>
                  </div>
                  <button onClick={() => setParameters(prev => prev.filter(item => item.id !== p.id))} className="p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ListManager title="Órgãos" subtitle="Órgãos Solicitantes" items={agencies} onAdd={(name) => setAgencies((p:any) => [{id: generateId(), name, status:'active'}, ...p])} onAction={(item) => setAgencies(prev => prev.filter(i => i.id !== item.id))} onToggleStatus={(item) => setAgencies(prev => prev.map(i => i.id === item.id ? {...i, status: i.status === 'active' ? 'inactive' : 'active'} : i))} icon={<Building2/>} />
            <ListManager title="Unidades" subtitle="Unidades de Lotação" items={units} onAdd={(name) => setUnits((p:any) => [{id: generateId(), name, status:'active'}, ...p])} onAction={(item) => setUnits(prev => prev.filter(i => i.id !== item.id))} onToggleStatus={(item) => setUnits(prev => prev.map(i => i.id === item.id ? {...i, status: i.status === 'active' ? 'inactive' : 'active'} : i))} icon={<MapPin/>} />
            <ListManager title="Perfis" subtitle="Perfis Profissionais" items={profiles} onAdd={(name) => setProfiles((p:any) => [{id: generateId(), name, status:'active'}, ...p])} onAction={(item) => setProfiles(prev => prev.filter(i => i.id !== item.id))} onToggleStatus={(item) => setProfiles(prev => prev.map(i => i.id === item.id ? {...i, status: i.status === 'active' ? 'inactive' : 'active'} : i))} icon={<Briefcase/>} />
          </div>
        </div>
      )}

      {/* TELA DE OPERADORES - CORRIGIDA */}
      {activeSubTab === 'users' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl mr-3"><UsersIcon size={20}/></div>
                <div><h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Operadores do Sistema</h3><p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Gestão de permissões e acessos</p></div>
              </div>
              <button onClick={() => setShowUserModal(true)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all flex items-center"><UserPlus size={14} className="mr-1.5"/> Novo Operador</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((u) => (
                <div key={u.id} className="p-6 rounded-[2rem] border border-slate-100 bg-slate-50 flex items-center justify-between group">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100">
                      <KeyRound size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 uppercase truncate max-w-[120px]">{u.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">ID: {u.username}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border mt-1 inline-block ${u.role === UserRole.ADMIN ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white text-slate-500 border-slate-200'}`}>
                        {u.role}
                      </span>
                    </div>
                  </div>
                  {u.username !== 'admin' && (
                    <button onClick={() => setUsers(prev => prev.filter(item => item.id !== u.id))} className="p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={16}/>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TELA DE NOTIFICAÇÕES - CORRIGIDA */}
      {activeSubTab === 'email' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex items-center mb-10">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl mr-4"><Mail size={24}/></div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Configuração de Alertas</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Integração via EmailJS para notificações de vencimento</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center"><Terminal size={14} className="mr-2 text-indigo-600"/> Credenciais de Serviço</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Service ID</label>
                    <input value={emailConfig?.serviceId || ''} onChange={e => setEmailConfig({...emailConfig, serviceId: e.target.value})} className="w-full mt-1.5 border border-slate-200 rounded-2xl p-4 text-xs font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="service_xxxxxx" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Template ID</label>
                    <input value={emailConfig?.templateId || ''} onChange={e => setEmailConfig({...emailConfig, templateId: e.target.value})} className="w-full mt-1.5 border border-slate-200 rounded-2xl p-4 text-xs font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="template_xxxxxx" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Public Key</label>
                    <input value={emailConfig?.publicKey || ''} onChange={e => setEmailConfig({...emailConfig, publicKey: e.target.value})} className="w-full mt-1.5 border border-slate-200 rounded-2xl p-4 text-xs font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="user_xxxxxx" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center"><Mail size={14} className="mr-2 text-indigo-600"/> Modelo da Mensagem</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Assunto do E-mail</label>
                    <input value={emailConfig?.subject || ''} onChange={e => setEmailConfig({...emailConfig, subject: e.target.value})} className="w-full mt-1.5 border border-slate-200 rounded-2xl p-4 text-xs font-bold bg-slate-50 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Corpo da Mensagem (Utilize: {'{nome}'}, {'{data_fatal}'})</label>
                    <textarea value={emailConfig?.template || ''} onChange={e => setEmailConfig({...emailConfig, template: e.target.value})} className="w-full mt-1.5 border border-slate-200 rounded-2xl p-4 text-xs font-bold bg-slate-50 outline-none h-32 resize-none" />
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center space-x-3">
                    <Info size={16} className="text-indigo-600 shrink-0" />
                    <p className="text-[9px] text-indigo-700 font-bold uppercase leading-relaxed tracking-widest">Os parâmetros entre chaves serão substituídos automaticamente pelos dados do contrato em alerta.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showParamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-10 shadow-2xl relative animate-in zoom-in duration-200 border border-slate-100">
            <button onClick={() => setShowParamModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <h2 className="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tighter">Novo Prazo</h2>
            <form onSubmit={handleSaveParam} className="space-y-4">
              <input value={newParam.label} onChange={e => setNewParam({...newParam, label: e.target.value})} required placeholder="Ex: Art 2, IV" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              <input type="number" value={newParam.days} onChange={e => setNewParam({...newParam, days: parseInt(e.target.value)})} required placeholder="Quantidade de Dias" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl mt-4 active:scale-95">Salvar Prazo</button>
            </form>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-10 shadow-2xl relative animate-in zoom-in duration-200 border border-slate-100">
            <button onClick={() => setShowUserModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <h2 className="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tighter">Novo Operador</h2>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required placeholder="Nome Completo" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              <input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required placeholder="Usuário/Login" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required placeholder="Senha de Acesso" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none">
                <option value={UserRole.HR}>Recursos Humanos</option>
                <option value={UserRole.ADMIN}>Administrador</option>
              </select>
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl mt-4 active:scale-95">Cadastrar Operador</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
