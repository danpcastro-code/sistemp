
import React, { useState, useMemo } from 'react';
import { LegalParameter, User, Vacancy, ConvokedPerson, UserRole, EmailConfig, PSS, GenericParameter } from '../types';
import { 
  Plus, Trash2, Building2, MapPin, X, UserPlus, Mail, Clock, Briefcase, Activity, Users, Save, ShieldAlert, Lock, Info, EyeOff, Eye, Scale, Gavel, Database, Copy, Check, Terminal, KeyRound, AlertCircle, DatabaseZap
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

  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: UserRole.HR });

  const REPAIR_SQL = `-- REPARO DEFINITIVO SISTEMP (COPIE E COLE NO SQL EDITOR DO SUPABASE)

-- 1. Cria a tabela mestre com colunas JSONB robustas
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

-- 2. GARANTE que a coluna pss_list exista (caso a tabela já existisse sem ela)
ALTER TABLE sistemp_data ADD COLUMN IF NOT EXISTS pss_list jsonb DEFAULT '[]'::jsonb;

-- 3. Concede permissão total para a API anônima (anon public)
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON TABLE sistemp_data TO anon;
GRANT ALL ON TABLE sistemp_data TO authenticated;

-- 4. Desabilita RLS (Obrigatoriamente para aceitar a chave 'anon public')
ALTER TABLE sistemp_data DISABLE ROW LEVEL SECURITY;

-- 5. Garante que a linha de dados id=1 exista
INSERT INTO sistemp_data (id) VALUES (1) ON CONFLICT (id) DO NOTHING;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(REPAIR_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleItemAction = (item: GenericParameter, setter: any, type: string) => {
    const isUsed = vacancies.some(v => type === 'a' ? v.agency === item.name : type === 'u' ? v.unit === item.name : v.type === item.name);
    if (isUsed) {
      alert("Item em uso em algum grupo de vagas. Sugerimos apenas ocultar clicando no ícone do olho.");
      return;
    }
    if (confirm(`Deseja remover permanentemente "${item.name}"?`)) {
      setter((prev: any) => prev.filter((i: any) => i.id !== item.id));
      onLog('CONFIGURAÇÃO', `Item "${item.name}" removido.`);
    }
  };

  const handleToggleStatus = (item: GenericParameter, setter: any) => {
    setter((prev: any) => prev.map((i: any) => i.id === item.id ? { ...i, status: i.status === 'active' ? 'inactive' : 'active' } : i));
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const user: User = { ...newUser, id: generateId() };
    setUsers(prev => [...prev, user]);
    setShowUserModal(false);
    onLog('USUÁRIOS', `Novo operador "${user.name}" adicionado.`);
    setNewUser({ name: '', username: '', password: '', role: UserRole.HR });
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
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center mb-6"><Activity className="mr-2 text-indigo-600" size={18}/> Estado da Nuvem</h3>
                
                {cloudStatus === 'setup_required' || cloudStatus === 'error' ? (
                  <div className="p-8 bg-red-50 border-2 border-red-500 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 animate-in zoom-in">
                      <div className="p-4 bg-red-600 text-white rounded-[1.5rem] shadow-xl animate-bounce">
                          <ShieldAlert size={32} />
                      </div>
                      <div className="flex-1 text-center md:text-left">
                          <h4 className="text-lg font-black text-red-800 uppercase tracking-tighter">Erro de Gravação Detectado</h4>
                          <p className="text-xs text-red-700 font-bold leading-relaxed mt-2">
                             O sistema não conseguiu gravar os dados. Provavelmente a tabela no Supabase é antiga ou não existe. 
                             Copie o script SQL abaixo e execute no painel do Supabase para destravar.
                          </p>
                      </div>
                  </div>
                ) : (
                  <div className="p-8 bg-green-50 rounded-[2rem] border border-green-200 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                          <Check size={24}/>
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800 uppercase">Sistema Operacional</p>
                          <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mt-1">Conexão Estabelecida</p>
                        </div>
                      </div>
                      <span className="px-4 py-2 bg-white text-green-600 border border-green-100 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse shadow-sm">Cloud Ativa</span>
                  </div>
                )}
            </div>

            {cloudErrorMessage && (
              <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl border-4 border-slate-800">
                  <div className="flex items-center space-x-4 mb-4">
                      <Terminal className="text-blue-400" size={32}/>
                      <h3 className="text-lg font-black uppercase tracking-tighter text-blue-100">Relatório de Erro Técnico</h3>
                  </div>
                  <div className="bg-black/30 p-5 rounded-2xl font-mono text-[11px] leading-relaxed break-all border border-white/5 text-blue-200">
                      {cloudErrorMessage}
                  </div>
              </div>
            )}

            <div className="bg-white p-10 rounded-[2.5rem] border-2 border-indigo-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-4">
                        <DatabaseZap className="text-indigo-600" size={28}/>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Script de Reparo de Banco</h3>
                    </div>
                    <p className="text-sm text-slate-600 font-medium max-w-xl mb-8 leading-relaxed">
                        1. Vá ao painel do <strong>Supabase</strong> <br/>
                        2. Clique em <strong>SQL Editor</strong> no menu lateral <br/>
                        3. Clique em <strong>New Query</strong>, cole o código abaixo e clique em <strong>RUN</strong>.
                    </p>

                    <div className="bg-slate-900 rounded-[1.5rem] p-6 relative group border border-slate-800">
                        <button onClick={handleCopySql} className="absolute top-4 right-4 px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all border border-indigo-400 active:scale-95 shadow-xl">
                          {copied ? 'Copiado!' : 'Copiar Script SQL'}
                        </button>
                        <pre className="text-[11px] text-blue-300 font-mono overflow-x-auto max-h-[300px] leading-relaxed py-4 scrollbar-thin">
                            {REPAIR_SQL}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeSubTab === 'users' && (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in fade-in">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center">
                <Users className="mr-3 text-blue-600" size={20}/> Operadores do Sistema
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Controle de acesso e níveis de permissão</p>
            </div>
            <button onClick={() => setShowUserModal(true)} className="px-5 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all flex items-center">
              <UserPlus size={14} className="mr-2"/> Adicionar Operador
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map(u => (
              <div key={u.id} className="p-5 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-all">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${u.role === UserRole.ADMIN ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                    {u.name.substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase">{u.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold">Login: {u.username} • {u.role === UserRole.ADMIN ? 'Administrador' : u.role === UserRole.HR ? 'Gestor RH' : 'Consulta'}</p>
                  </div>
                </div>
                {u.username !== 'admin' && (
                  <button onClick={() => setUsers(prev => prev.filter(x => x.id !== u.id))} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 size={16}/>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'email' && (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in fade-in">
          <div className="flex items-center space-x-3 mb-8">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Mail size={24}/></div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Configuração de Notificações</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">E-mails automáticos via EmailJS</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Service ID</label>
                  <input value={emailConfig.serviceId} onChange={e => setEmailConfig({...emailConfig, serviceId: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold" placeholder="service_xxxxxx" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Template ID</label>
                  <input value={emailConfig.templateId} onChange={e => setEmailConfig({...emailConfig, templateId: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold" placeholder="template_xxxxxx" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Public Key</label>
                  <input value={emailConfig.publicKey} onChange={e => setEmailConfig({...emailConfig, publicKey: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold" placeholder="user_xxxxxx" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Assunto Padrão</label>
                <input value={emailConfig.subject} onChange={e => setEmailConfig({...emailConfig, subject: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Corpo da Mensagem (Template)</label>
                <textarea value={emailConfig.template} onChange={e => setEmailConfig({...emailConfig, template: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-xs font-bold min-h-[120px] resize-none" />
                <p className="text-[8px] text-slate-400 font-bold uppercase mt-2">Variáveis Aceitas: {'{nome}, {data_fatal}, {edital}, {vaga}'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'params' && (
        <div className="space-y-8 animate-in fade-in">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl mr-3">
                  <Scale size={20}/>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Prazos Legais</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Configuração de prazos por amparo legal</p>
                </div>
              </div>
              <button onClick={() => setShowParamModal(true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-blue-700 transition-all active:scale-95 flex items-center">
                <Plus size={14} className="mr-1.5"/> Adicionar Prazo
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {validParameters.map((p) => (
                <div key={p.id} className="p-3.5 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 hover:shadow-sm transition-all flex items-center justify-between group">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <Gavel size={18}/>
                    </div>
                    <div className="truncate">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{p.lawRef || 'Lei 8.745'}</p>
                      <p className="font-bold text-slate-800 text-xs truncate">{p.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 ml-4">
                    <div className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-right min-w-[70px]">
                      <span className="text-xs font-black tracking-tight">{p.days}</span>
                      <span className="text-[7px] font-black uppercase tracking-widest ml-1">Dias</span>
                    </div>
                    <button 
                      onClick={() => setParameters(prev => prev.filter(item => item.id !== p.id))}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              ))}
              {validParameters.length === 0 && (
                <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                   <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Nenhum prazo cadastrado</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ListManager title="Órgãos" subtitle="Gestão de Órgãos" items={agencies} onAdd={(name) => setAgencies((p:any) => [{id: generateId(), name, status:'active'}, ...p])} onAction={(i) => handleItemAction(i, setAgencies, 'a')} onToggleStatus={(i) => handleToggleStatus(i, setAgencies)} icon={<Building2/>} />
            <ListManager title="Unidades" subtitle="Gestão de Unidades" items={units} onAdd={(name) => setUnits((p:any) => [{id: generateId(), name, status:'active'}, ...p])} onAction={(i) => handleItemAction(i, setUnits, 'u')} onToggleStatus={(i) => handleToggleStatus(i, setUnits)} icon={<MapPin/>} />
            <ListManager title="Perfis" subtitle="Gestão de Perfis" items={profiles} onAdd={(name) => setProfiles((p:any) => [{id: generateId(), name, status:'active'}, ...p])} onAction={(i) => handleItemAction(i, setProfiles, 'p')} onToggleStatus={(i) => handleToggleStatus(i, setProfiles)} icon={<Briefcase/>} />
          </div>
        </div>
      )}

      {/* MODAL: NOVO PRAZO */}
      {showParamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-10 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tighter">Novo Prazo</h2>
            <form onSubmit={(e) => { e.preventDefault(); setParameters(p => [...p, { ...newParam, id: generateId() } as LegalParameter]); setShowParamModal(false); }} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Rótulo / Amparo</label>
                <input value={newParam.label} onChange={e => setNewParam({...newParam, label: e.target.value})} placeholder="Ex: Art. 2, IV" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" required />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Quantidade de Dias</label>
                <input type="number" value={newParam.days} onChange={e => setNewParam({...newParam, days: Number(e.target.value)})} placeholder="Dias" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" required />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowParamModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95">Salvar Prazo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO USUÁRIO */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-10 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tighter">Novo Operador</h2>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="Nome Completo" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" required />
              <input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} placeholder="Usuário (Login)" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" required />
              <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="Senha de Acesso" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" required />
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none">
                <option value={UserRole.HR}>Gestor RH</option>
                <option value={UserRole.ADMIN}>Administrador</option>
                <option value={UserRole.CONSULTANT}>Consulta</option>
              </select>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95">Salvar Operador</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
