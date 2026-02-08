
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
  const backupInputRef = useRef<HTMLInputElement>(null);

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

  const sqlFix = `
-- CTU GESTÃO: SCRIPT DE REPARO E CRIAÇÃO DO BANCO
CREATE TABLE IF NOT EXISTS sistemp_data (
  id INT PRIMARY KEY,
  vacancies JSONB DEFAULT '[]',
  parameters JSONB DEFAULT '[]',
  agencies JSONB DEFAULT '[]',
  units JSONB DEFAULT '[]',
  profiles JSONB DEFAULT '[]',
  convocations JSONB DEFAULT '[]',
  pss_list JSONB DEFAULT '[]',
  users JSONB DEFAULT '[]',
  logs JSONB DEFAULT '[]',
  email_config JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
INSERT INTO sistemp_data (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
  `.trim();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* TABS DE PARAMETRIZAÇÃO */}
      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200">
        <button onClick={() => setActiveSubTab('params')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'params' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Prazos e Perfis</button>
        <button onClick={() => setActiveSubTab('users')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Operadores</button>
        <button onClick={() => setActiveSubTab('email')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'email' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Notificações</button>
        <button onClick={() => setActiveSubTab('cloud')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'cloud' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Conexão e Nuvem</button>
        <button onClick={() => setActiveSubTab('backup')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'backup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Segurança</button>
      </div>

      {/* TELA: PRAZOS E PERFIS */}
      {activeSubTab === 'params' && (
        <div className="space-y-8">
          {/* PRAZOS DE VIGÊNCIA (CARD SECTION) */}
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

          {/* LIST MANAGERS (ÓRGÃOS, UNIDADES, PERFIS) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ListManager title="Órgãos" subtitle="Órgãos Solicitantes" items={agencies} onAdd={(name) => setAgencies(p => [{id: generateId(), name, status:'active'}, ...p])} onAction={(item) => setAgencies(prev => prev.filter(i => i.id !== item.id))} onToggleStatus={(item) => setAgencies(prev => prev.map(i => i.id === item.id ? {...i, status: i.status === 'active' ? 'inactive' : 'active'} : i))} icon={<Building2/>} />
            <ListManager title="Unidades" subtitle="Unidades de Lotação" items={units} onAdd={(name) => setUnits(p => [{id: generateId(), name, status:'active'}, ...p])} onAction={(item) => setUnits(prev => prev.filter(i => i.id !== item.id))} onToggleStatus={(item) => setUnits(prev => prev.map(i => i.id === item.id ? {...i, status: i.status === 'active' ? 'inactive' : 'active'} : i))} icon={<MapPin/>} />
            <ListManager title="Perfis" subtitle="Perfis Profissionais" items={profiles} onAdd={(name) => setProfiles(p => [{id: generateId(), name, status:'active'}, ...p])} onAction={(item) => setProfiles(prev => prev.filter(i => i.id !== item.id))} onToggleStatus={(item) => setProfiles(prev => prev.map(i => i.id === item.id ? {...i, status: i.status === 'active' ? 'inactive' : 'active'} : i))} icon={<Briefcase/>} />
          </div>
        </div>
      )}

      {/* TELA: OPERADORES */}
      {activeSubTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
          <div className="lg:col-span-1">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-4 mb-8">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><UserPlus size={24}/></div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">Novo Operador</h3>
              </div>
              <form onSubmit={handleAddUser} className="space-y-4">
                <input name="name" required placeholder="Nome Completo" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500" />
                <input name="username" required placeholder="Usuário / Login" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500" />
                <input name="password" required type="password" placeholder="Senha de Acesso" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500" />
                <select name="role" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500 appearance-none cursor-pointer">
                  <option value={UserRole.HR}>RH Operacional</option>
                  <option value={UserRole.ADMIN}>Administrador Sistema</option>
                  <option value={UserRole.CONSULTANT}>Apenas Consulta</option>
                </select>
                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all mt-4">Criar Acesso</button>
              </form>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-full">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center"><UsersIcon size={14} className="mr-2"/> Operadores Credenciados</h3>
              <div className="space-y-3">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:shadow-md transition-all group">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">{u.name.substring(0, 2).toUpperCase()}</div>
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase">{u.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">USUÁRIO: {u.username} • CARGO: {u.role === UserRole.ADMIN ? 'ADM' : 'OPERACIONAL'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="bg-white border border-slate-100 px-3 py-1 rounded-xl text-[10px] font-mono font-bold flex items-center">
                        {showPass[u.id] ? u.password : '••••••••'}
                        <button onClick={() => togglePass(u.id)} className="ml-2 text-slate-300 hover:text-blue-500">{showPass[u.id] ? <EyeOff size={12}/> : <Eye size={12}/>}</button>
                      </div>
                      <button onClick={() => setUsers(prev => prev.filter(i => i.id !== u.id))} className="p-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TELA: NOTIFICAÇÕES */}
      {activeSubTab === 'email' && (
        <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in fade-in">
          <div className="flex items-center space-x-4 mb-10">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Mail size={24}/></div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Templates de Notificação</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Mensagens Automáticas de 90/30 Dias</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assunto do E-mail</label>
                <input value={emailConfig.subject} onChange={e => setEmailConfig({...emailConfig, subject: e.target.value})} className="mt-2 w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Corpo da Mensagem (Suporta {`{nome}`}, {`{data_fatal}`})</label>
                <textarea value={emailConfig.template} onChange={e => setEmailConfig({...emailConfig, template: e.target.value})} rows={8} className="mt-2 w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none resize-none" />
              </div>
            </div>
            <div className="bg-slate-900 text-slate-400 p-8 rounded-[2rem] border border-slate-800 flex flex-col justify-center">
              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Preview de Envio</h4>
              <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 italic text-[11px] leading-relaxed">
                {emailConfig.template.replace('{nome}', 'JOSÉ DA SILVA').replace('{data_fatal}', '10/12/2024')}
              </div>
              <p className="text-[9px] mt-6 leading-relaxed opacity-60">As notificações são acionadas via Dashboard ou automaticamente quando o contrato atinge os marcos críticos estabelecidos na parametrização legal.</p>
            </div>
          </div>
          <button onClick={() => onLog('EMAIL_CONFIG', 'Template de notificação atualizado.')} className="mt-10 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center hover:bg-slate-800 transition-all"><Save size={16} className="mr-2"/> Salvar Configurações</button>
        </div>
      )}

      {/* TELA: NUVEM */}
      {activeSubTab === 'cloud' && (
        <div className="space-y-8 animate-in fade-in">
          <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <div className="flex justify-between items-start mb-10">
               <div className="flex items-center space-x-4">
                 <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Zap size={24}/></div>
                 <div>
                   <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Conexão Supabase</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Sincronização em Nuvem (PostgreSQL)</p>
                 </div>
               </div>
               <div className={`px-5 py-2 rounded-full border-2 flex items-center ${cloudStatus === 'connected' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                 <div className={`w-2 h-2 rounded-full mr-3 ${cloudStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                 <span className="text-[10px] font-black uppercase">{cloudStatus === 'connected' ? 'Servidor Conectado' : 'Desconectado'}</span>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informações da Sessão</h4>
                 <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                   <div className="flex justify-between text-[11px]"><span className="text-slate-400">Banco de Dados:</span> <span className="font-bold text-slate-700">Supabase Cloud</span></div>
                   <div className="flex justify-between text-[11px]"><span className="text-slate-400">Protocolo:</span> <span className="font-bold text-slate-700">HTTPS / REST API</span></div>
                   <div className="flex justify-between text-[11px]"><span className="text-slate-400">Persistência:</span> <span className="font-bold text-slate-700">Ativa (JSONB)</span></div>
                   {cloudErrorMessage && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[9px] text-red-600 font-bold mt-4">{cloudErrorMessage}</div>}
                 </div>
               </div>
               
               <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800">
                 <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4 flex items-center"><Terminal size={14} className="mr-2"/> SQL de Reparo (SQL Editor)</h4>
                 <div className="p-4 bg-black/40 rounded-xl text-[9px] font-mono text-slate-400 overflow-x-auto h-40 custom-scrollbar">
                   <pre>{sqlFix}</pre>
                 </div>
                 <button onClick={() => { navigator.clipboard.writeText(sqlFix); alert('Script copiado!'); }} className="mt-4 text-[9px] font-black text-blue-400 uppercase hover:underline">Copiar Script SQL</button>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* TELA: SEGURANÇA */}
      {activeSubTab === 'backup' && (
        <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-12 animate-in fade-in">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><ShieldCheck size={24}/></div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Segurança e Backup</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Gestão de Local Storage e Arquivos Físicos</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase mb-4 flex items-center"><Download size={16} className="mr-2 text-blue-600"/> Exportar Banco (.json)</h4>
              <p className="text-[10px] text-slate-500 leading-relaxed mb-6 font-medium uppercase">Cria uma cópia completa de todos os parâmetros, candidatos e vagas para backup em disco ou e-mail.</p>
              <button onClick={() => {
                const data = { version: '1.9', timestamp: new Date().toISOString(), parameters, agencies, units, profiles, users, vacancies, convocations, pssList, emailConfig };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `CTU_BACKUP_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
                link.click();
                URL.revokeObjectURL(url);
                onLog('BACKUP', 'Exportação integral realizada.');
              }} className="w-full py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl hover:bg-blue-700 transition-all">Baixar Backup Integral</button>
            </div>

            <div className="p-8 bg-red-50 rounded-[2.5rem] border border-red-100">
              <h4 className="text-xs font-black text-red-600 uppercase mb-4 flex items-center"><Bomb size={16} className="mr-2 text-red-600"/> Master Reset</h4>
              <p className="text-[10px] text-red-400 leading-relaxed mb-6 font-medium uppercase tracking-tighter">Limpa todos os dados da memória local e da nuvem, restaurando o sistema ao seu estado original de fábrica.</p>
              <button onClick={onRestoreAll} className="w-full py-4 bg-red-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl hover:bg-red-700 transition-all">Apagar Tudo Permanentemente</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO PRAZO */}
      {showAddParamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-md w-full p-10 shadow-2xl animate-in zoom-in duration-200 border border-slate-100 relative">
             <button onClick={() => setShowAddParamModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"><X size={20}/></button>
             <h2 className="text-2xl font-black mb-1 text-slate-800 uppercase tracking-tighter">Novo Amparo Legal</h2>
             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-8">Definir Período Limite (Dias)</p>
             <form onSubmit={handleAddParam} className="space-y-4">
               <input name="lawRef" required placeholder="Lei de Referência (Ex: Lei 8.745/93)" className="w-full border border-slate-200 rounded-2xl p-4 text-xs font-bold bg-slate-50 outline-none" />
               <input name="articleRef" required placeholder="Artigo / Inciso (Ex: Art 2º, IV)" className="w-full border border-slate-200 rounded-2xl p-4 text-xs font-bold bg-slate-50 outline-none" />
               <input name="label" required placeholder="Apelido / Rótulo (Ex: Professor Substituto)" className="w-full border border-slate-200 rounded-2xl p-4 text-xs font-bold bg-slate-50 outline-none" />
               <input name="days" type="number" required placeholder="Dias Máximos (Ex: 730)" className="w-full border border-slate-200 rounded-2xl p-4 text-xs font-bold bg-slate-50 outline-none" />
               <textarea name="description" placeholder="Descrição curta (Opcional)" className="w-full border border-slate-200 rounded-2xl p-4 text-xs font-bold bg-slate-50 outline-none resize-none" rows={3} />
               <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl mt-4">Salvar Parametrização</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
