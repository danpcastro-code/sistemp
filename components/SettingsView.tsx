
import React, { useState, useRef } from 'react';
import { LegalParameter, User, Vacancy, ConvokedPerson, UserRole, EmailConfig, PSS, GenericParameter } from '../types';
import { removeAccents, generateId } from '../utils';
import { 
  Plus, Trash2, Building2, MapPin, X, UserPlus, Mail, Clock, Briefcase, Activity, Users as UsersIcon, Save, ShieldAlert, Lock, Info, EyeOff, Eye, Scale, DatabaseZap, Bomb, RefreshCw, Check, KeyRound, Terminal, Download, Upload, ShieldCheck, Zap, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

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
  setVacancies: React.Dispatch<React.SetStateAction<Vacancy[]>>;
  convocations: ConvokedPerson[];
  setConvocations: React.Dispatch<React.SetStateAction<ConvokedPerson[]>>;
  pssList: PSS[];
  setPssList: React.Dispatch<React.SetStateAction<PSS[]>>;
  onRestoreAll: () => void;
  cloudStatus?: 'idle' | 'syncing' | 'error' | 'connected' | 'setup_required';
  cloudErrorMessage?: string | null;
  onLog: (action: string, details: string) => void;
  emailConfig: EmailConfig;
  setEmailConfig: (e: EmailConfig) => void;
}

const ListManager: React.FC<{
  title: string;
  subtitle: string;
  items: GenericParameter[];
  onAdd: (name: string) => void;
  onAction: (item: GenericParameter) => void;
  onToggleStatus: (item: GenericParameter) => void;
  icon: React.ReactNode;
}> = ({ title, subtitle, items = [], onAdd, onAction, onToggleStatus, icon }) => {
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
        <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Novo..." className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-blue-500" onKeyDown={(e) => e.key === 'Enter' && handleAdd()}/>
        <button onClick={handleAdd} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95"><Plus size={18}/></button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {items.map((item) => (
          <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${item.status === 'inactive' ? 'bg-slate-50 opacity-60 border-transparent' : 'bg-white border-slate-100'}`}>
            <span className={`text-[10px] font-bold uppercase truncate max-w-[120px] ${item.status === 'inactive' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.name}</span>
            <div className="flex items-center">
              <button onClick={() => onToggleStatus(item)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg">{item.status === 'inactive' ? <EyeOff size={14}/> : <Eye size={14}/>}</button>
              <button onClick={() => onAction(item)} className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg"><Trash2 size={14}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SettingsView: React.FC<SettingsViewProps> = ({ 
  parameters = [], setParameters, agencies = [], setAgencies, units = [], setUnits, profiles = [], setProfiles,
  users = [], setUsers, vacancies = [], setVacancies, convocations = [], setConvocations, pssList = [], setPssList,
  onLog, cloudStatus, cloudErrorMessage, emailConfig, setEmailConfig, onRestoreAll
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'params' | 'users' | 'email' | 'cloud' | 'backup'>('params');
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});
  const [showAddParamModal, setShowAddParamModal] = useState(false);
  
  const togglePass = (id: string) => setShowPass(p => ({ ...p, [id]: !p[id] }));

  const handleAddParam = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newP: LegalParameter = {
      id: generateId(),
      label: fd.get('label') as string,
      days: Number(fd.get('days')),
      description: fd.get('description') as string,
      lawRef: fd.get('lawRef') as string,
      articleRef: fd.get('articleRef') as string,
      type: 'legal',
      status: 'active'
    };
    setParameters(prev => [...prev, newP]);
    setShowAddParamModal(false);
    onLog('CONFIG_PRAZO', `Novo prazo ${newP.label} cadastrado.`);
  };

  const handleAddUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newUser: User = {
      id: generateId(),
      name: fd.get('name') as string,
      username: (fd.get('username') as string).toLowerCase(),
      password: fd.get('password') as string,
      role: fd.get('role') as UserRole
    };
    setUsers(prev => [...prev, newUser]);
    e.currentTarget.reset();
    onLog('USUARIO', `Novo operador ${newUser.name} cadastrado.`);
  };

  // SCRIPT SQL PARA O NOVO PROJETO (BLINDADO CONTRA RLS)
  const sqlFix = `
-- 1. CRIAR TABELA NOVO PROJETO SE NÃO EXISTIR
CREATE TABLE IF NOT EXISTS public.sistemp_data (
  id BIGINT PRIMARY KEY,
  vacancies JSONB DEFAULT '[]'::jsonb,
  parameters JSONB DEFAULT '[]'::jsonb,
  agencies JSONB DEFAULT '[]'::jsonb,
  units JSONB DEFAULT '[]'::jsonb,
  profiles JSONB DEFAULT '[]'::jsonb,
  convocations JSONB DEFAULT '[]'::jsonb,
  pss_list JSONB DEFAULT '[]'::jsonb,
  users JSONB DEFAULT '[]'::jsonb,
  logs JSONB DEFAULT '[]'::jsonb,
  email_config JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. GARANTIR REGISTRO MESTRE ID=1
INSERT INTO public.sistemp_data (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 3. DESATIVAR RLS (IMPEDE QUE O SUPABASE BLOQUEIE USUÁRIOS PÚBLICOS)
ALTER TABLE public.sistemp_data DISABLE ROW LEVEL SECURITY;

-- 4. CONCEDER PERMISSÕES TOTAIS DE ESCRITA E LEITURA AO ACESSO ANÔNIMO
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON TABLE public.sistemp_data TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 5. TAMBÉM CONCEDER AOS USUÁRIOS AUTENTICADOS (PRECAUÇÃO)
GRANT ALL ON TABLE public.sistemp_data TO authenticated;
  `.trim();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200">
        <button onClick={() => setActiveSubTab('params')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'params' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Prazos e Perfis</button>
        <button onClick={() => setActiveSubTab('users')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Operadores</button>
        <button onClick={() => setActiveSubTab('email')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'email' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Notificações</button>
        <button onClick={() => setActiveSubTab('cloud')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'cloud' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Conexão e Nuvem</button>
        <button onClick={() => setActiveSubTab('backup')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'backup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Segurança</button>
      </div>

      {activeSubTab === 'params' && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-10">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100"><Scale size={24}/></div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Prazos de Vigência</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Base de Cálculo Legal (Lei 8.745/93)</p>
                  </div>
                </div>
                <button onClick={() => setShowAddParamModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 active:scale-95 transition-all flex items-center">
                  <Plus size={16} className="mr-2"/> Novo Prazo
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {parameters.map(p => (
                  <div key={p.id} className="p-6 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm hover:border-blue-200 transition-all group relative">
                    <button onClick={() => setParameters(prev => prev.filter(i => i.id !== p.id))} className="absolute top-4 right-4 p-1 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{p.lawRef || 'LEI FEDERAL'}</p>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight mt-1">{p.articleRef || p.label}</p>
                    <p className="text-[10px] font-black text-blue-600 uppercase mt-4">{p.days} DIAS</p>
                  </div>
                ))}
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ListManager title="Órgãos" subtitle="Órgãos Solicitantes" items={agencies} onAdd={(name) => setAgencies(p => [{id: generateId(), name, status:'active'}, ...p])} onAction={(item) => setAgencies(prev => prev.filter(i => i.id !== item.id))} onToggleStatus={(item) => setAgencies(prev => prev.map(i => i.id === item.id ? {...i, status: i.status === 'active' ? 'inactive' : 'active'} : i))} icon={<Building2/>} />
            <ListManager title="Unidades" subtitle="Unidades de Lotação" items={units} onAdd={(name) => setUnits(p => [{id: generateId(), name, status:'active'}, ...p])} onAction={(item) => setUnits(prev => prev.filter(i => i.id !== item.id))} onToggleStatus={(item) => setUnits(prev => prev.map(i => i.id === item.id ? {...i, status: i.status === 'active' ? 'inactive' : 'active'} : i))} icon={<MapPin/>} />
            <ListManager title="Perfis" subtitle="Perfis Profissionais" items={profiles} onAdd={(name) => setProfiles(p => [{id: generateId(), name, status:'active'}, ...p])} onAction={(item) => setProfiles(prev => prev.filter(i => i.id !== item.id))} onToggleStatus={(item) => setProfiles(prev => prev.map(i => i.id === item.id ? {...i, status: i.status === 'active' ? 'inactive' : 'active'} : i))} icon={<Briefcase/>} />
          </div>
        </div>
      )}

      {activeSubTab === 'cloud' && (
        <div className="space-y-8 animate-in fade-in">
          <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <div className="flex justify-between items-start mb-10">
               <div className="flex items-center space-x-4">
                 <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Zap size={24}/></div>
                 <div>
                   <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Conexão e Nuvem</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Sincronização (Supabase Nova Instância)</p>
                 </div>
               </div>
               <div className={`px-5 py-2 rounded-full border-2 flex items-center ${cloudStatus === 'connected' ? 'bg-green-50 text-green-600 border-green-200' : cloudStatus === 'setup_required' ? 'bg-red-50 text-red-600 border-red-500' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                 <div className={`w-2 h-2 rounded-full mr-3 ${cloudStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                 <span className="text-[10px] font-black uppercase">
                    {cloudStatus === 'connected' ? 'Sincronizado' : cloudStatus === 'setup_required' ? 'Configurar Banco' : 'Tentando...'}
                 </span>
               </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               <div className="space-y-6">
                 <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center mb-3">
                        <Info size={14} className="mr-2"/> Status da Conexão
                    </h4>
                    <p className="text-xs text-blue-700 leading-relaxed font-medium">
                        O sistema está apontando para o seu novo projeto Supabase. Se houver falha de gravação (círculo vermelho no topo), você deve rodar o script SQL ao lado.
                    </p>
                    <div className="mt-4 p-4 bg-white rounded-xl border border-blue-200">
                        <p className="text-[10px] font-black text-slate-700 uppercase mb-2">Mensagem Técnica:</p>
                        <p className="text-[10px] font-mono text-slate-500 break-all">{cloudErrorMessage || "Pronto para autorizar a nova API."}</p>
                    </div>
                 </div>
                 <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 font-bold uppercase">Passo-a-passo Obrigatório:</p>
                    <ol className="text-[10px] text-slate-600 space-y-2 list-decimal pl-4 font-bold uppercase">
                        <li>Clique em <b>Copiar Script de Reparo</b> abaixo.</li>
                        <li>No seu novo painel Supabase, vá em <b>SQL Editor</b>.</li>
                        <li>Clique em <b>New Query</b>, cole o código e clique em <b>RUN</b>.</li>
                        <li><b>Recarregue</b> esta página do sistema (F5).</li>
                    </ol>
                 </div>
               </div>

               <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800">
                 <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center"><Terminal size={14} className="mr-2"/> Script SQL de Autorização</h4>
                 <div className="p-4 bg-black/40 rounded-xl text-[9px] font-mono text-slate-400 overflow-x-auto h-60 custom-scrollbar">
                   <pre>{sqlFix}</pre>
                 </div>
                 <button onClick={() => { navigator.clipboard.writeText(sqlFix); alert('Script copiado! Execute no SQL Editor do seu novo Supabase.'); }} className="mt-6 w-full py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl">Copiar Script de Reparo</button>
               </div>
             </div>
          </div>
        </div>
      )}

      {activeSubTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
          <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter mb-6 flex items-center"><UserPlus className="mr-3 text-blue-600" size={20}/> Novo Operador</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <input name="name" required placeholder="Nome Completo" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-500" />
              <input name="username" required placeholder="Login de Acesso" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-500" />
              <input name="password" type="password" required placeholder="Senha" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-500" />
              <select name="role" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-500">
                <option value={UserRole.HR}>Recursos Humanos</option>
                <option value={UserRole.ADMIN}>Administrador Master</option>
                <option value={UserRole.CONSULTANT}>Apenas Consulta</option>
              </select>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all">Criar Acesso</button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">Nome do Operador</th>
                  <th className="px-8 py-5">Login</th>
                  <th className="px-8 py-5">Perfil</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5 font-bold text-slate-700">{u.name}</td>
                    <td className="px-8 py-5 font-mono text-slate-500">{u.username}</td>
                    <td className="px-8 py-5">
                      <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${u.role === UserRole.ADMIN ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>{u.role}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => setUsers(prev => prev.filter(i => i.id !== u.id))} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {activeSubTab === 'backup' && (
        <div className="space-y-8 animate-in fade-in">
          <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-sm text-center">
             <div className="p-5 bg-red-50 text-red-600 rounded-3xl inline-block mb-6 border border-red-100"><Bomb size={48}/></div>
             <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Zona de Risco</h3>
             <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-2 max-w-md mx-auto">Procedimentos irreversíveis de limpeza e restauração de parâmetros de fábrica.</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 max-w-2xl mx-auto">
                <button onClick={onRestoreAll} className="p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] hover:border-red-500 hover:bg-red-50 transition-all group">
                   <RefreshCw size={32} className="text-slate-200 group-hover:text-red-600 mx-auto mb-4"/>
                   <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-red-600">Restaurar Padrões Master</span>
                </button>
                <div className="p-8 bg-slate-900 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center">
                   <ShieldCheck size={32} className="text-blue-500 mb-4"/>
                   <span className="text-[10px] font-black uppercase text-white">Sincronização Ativa</span>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
