
import React, { useState } from 'react';
import { LegalParameter, User, Vacancy, ConvokedPerson, UserRole, EmailConfig } from '../types';
import { 
  Plus, Trash2, Users, Building2, MapPin, BriefcaseIcon, Wifi, X, UserPlus, Mail, Save, AlertCircle, CheckCircle2, RefreshCw, Key, Shield, Activity, List, Briefcase, Clock
} from 'lucide-react';
import { generateId } from '../utils';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mwhctqhjulrlisokxdth.supabase.co";
const SUPABASE_KEY = "sb_publishable_I6orZsgeBZX0QRvhrQ5d-A_Jng0xH2s";

interface SettingsViewProps {
  parameters: LegalParameter[];
  setParameters: (p: LegalParameter[]) => void;
  agencies: string[];
  setAgencies: (a: string[]) => void;
  units: string[];
  setUnits: (u: string[]) => void;
  profiles: string[];
  setProfiles: (p: string[]) => void;
  users: User[];
  setUsers: (u: User[]) => void;
  vacancies: Vacancy[];
  convocations: ConvokedPerson[];
  onRestoreAll: (data: any) => void;
  cloudStatus?: 'idle' | 'syncing' | 'error' | 'connected';
  onLog: (action: string, details: string) => void;
  emailConfig: EmailConfig;
  setEmailConfig: (e: EmailConfig) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  parameters = [], setParameters, 
  agencies = [], setAgencies,
  units = [], setUnits,
  profiles = [], setProfiles,
  users = [], setUsers, 
  onLog,
  cloudStatus,
  emailConfig,
  setEmailConfig
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'params' | 'users' | 'email' | 'cloud'>('params');
  const [dbDiagnostic, setDbDiagnostic] = useState<{ 
    status: 'idle' | 'checking' | 'ok' | 'fail', 
    message: string 
  }>({ status: 'idle', message: '' });

  // Modais e Formulários
  const [showParamModal, setShowParamModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [newParam, setNewParam] = useState({ label: '', days: '' });
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: UserRole.CONSULTANT });

  // Utilitários de Gestão de Listas Simples
  const handleAddItem = (list: string[], setList: (l: string[]) => void, promptMsg: string, logAction: string) => {
    const item = prompt(promptMsg);
    if (item && item.trim()) {
      setList([...list, item.trim()]);
      onLog('CONFIGURAÇÃO', `${logAction}: ${item}`);
    }
  };

  const handleRemoveItem = (list: string[], setList: (l: string[]) => void, index: number, logAction: string) => {
    if (confirm("Deseja remover este item? Isso pode afetar registros legados.")) {
      const item = list[index];
      const newList = [...list];
      newList.splice(index, 1);
      setList(newList);
      onLog('CONFIGURAÇÃO', `${logAction} removido: ${item}`);
    }
  };

  const runDatabaseDiagnostic = async () => {
    setDbDiagnostic({ status: 'checking', message: 'Verificando gavetas no banco...' });
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { error } = await supabase.from('sistemp_data').select('id').eq('id', 1).single();
        if (error) throw new Error("Erro de Leitura: Verifique se o Script SQL foi executado.");
        setDbDiagnostic({ status: 'ok', message: 'Conexão Íntegra! Suas gavetas estão prontas e memorizando dados.' });
    } catch (e: any) {
        setDbDiagnostic({ status: 'fail', message: e.message || 'Falha na comunicação com o banco.' });
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const user: User = { id: generateId(), ...newUser };
    setUsers([...users, user]);
    setShowUserModal(false);
    setNewUser({ name: '', username: '', password: '', role: UserRole.CONSULTANT });
    onLog('USUÁRIOS', `Novo operador criado: ${user.username}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200">
        <button onClick={() => setActiveSubTab('params')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'params' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Prazos e Perfis</button>
        <button onClick={() => setActiveSubTab('users')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Operadores</button>
        <button onClick={() => setActiveSubTab('email')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'email' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Notificações</button>
        <button onClick={() => setActiveSubTab('cloud')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'cloud' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}>Conexão e Nuvem</button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* ABA 1: PRAZOS E PERFIS */}
        {activeSubTab === 'params' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center"><Clock className="mr-2 text-blue-600" size={18}/> Amparos Legais (Prazos da Lei)</h3>
                    <button onClick={() => setShowParamModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">+ Novo Prazo</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {parameters.map((p) => (
                        <div key={p.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center">
                            <div>
                                <p className="font-black text-slate-800 text-xs">{p.label}</p>
                                <p className="text-[10px] font-bold text-blue-600 uppercase">{p.days} Dias de Limite</p>
                            </div>
                            <button onClick={() => setParameters(parameters.filter(item => item.id !== p.id))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ListManager title="Órgãos Solicitantes" items={agencies} onAdd={() => handleAddItem(agencies, setAgencies, "Nome do Órgão:", "Órgão")} onRemove={(i) => handleRemoveItem(agencies, setAgencies, i, "Órgão")} icon={<Building2 size={18}/>} />
                <ListManager title="Unidades / Setores" items={units} onAdd={() => handleAddItem(units, setUnits, "Nome da Unidade:", "Unidade")} onRemove={(i) => handleRemoveItem(units, setUnits, i, "Unidade")} icon={<MapPin size={18}/>} />
                <ListManager title="Perfis Profissionais" items={profiles} onAdd={() => handleAddItem(profiles, setProfiles, "Nome do Perfil Profissional:", "Perfil")} onRemove={(i) => handleRemoveItem(profiles, setProfiles, i, "Perfil")} icon={<Briefcase size={18}/>} />
            </div>
          </div>
        )}

        {/* ABA 2: OPERADORES */}
        {activeSubTab === 'users' && (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center"><Users className="mr-2 text-blue-600" size={18}/> Gestão de Operadores</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Controle de quem pode ler e escrever no sistema</p>
                </div>
                <button onClick={() => setShowUserModal(true)} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                    <UserPlus size={16} className="inline mr-2"/> Novo Operador
                </button>
            </div>
            <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                    <tr>
                        <th className="px-8 py-4">Nome</th>
                        <th className="px-8 py-4">Usuário</th>
                        <th className="px-8 py-4">Nível de Acesso</th>
                        <th className="px-8 py-4 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-4 font-bold text-slate-700 text-xs">{u.name}</td>
                            <td className="px-8 py-4 font-mono text-slate-400 text-[11px]">{u.username}</td>
                            <td className="px-8 py-4">
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${
                                    u.role === UserRole.ADMIN ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                    u.role === UserRole.HR ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                                    'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                    {u.role === UserRole.ADMIN ? 'Administrador' : u.role === UserRole.HR ? 'Gestor RH' : 'Consulta'}
                                </span>
                            </td>
                            <td className="px-8 py-4 text-right">
                                {u.username !== 'admin' && (
                                    <button onClick={() => setUsers(users.filter(item => item.id !== u.id))} className="text-slate-300 hover:text-red-500 transition-all p-2 rounded-lg hover:bg-red-50">
                                        <Trash2 size={16}/>
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        )}

        {/* ABA 3: NOTIFICAÇÕES (EmailJS) */}
        {activeSubTab === 'email' && (
          <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200 animate-in fade-in duration-300">
            <h3 className="text-xl font-black mb-6 uppercase tracking-tighter flex items-center"><Mail className="mr-3 text-indigo-600" /> Configurações de Notificação</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">Integração via EmailJS para envio automático de alertas aos contratados temporários.</p>
            <form onSubmit={(e) => { e.preventDefault(); setEmailConfig(emailConfig); alert('Configurações salvas!'); }} className="space-y-5 max-w-2xl">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service ID</label>
                       <input value={emailConfig.serviceId} onChange={e => setEmailConfig({...emailConfig, serviceId: e.target.value})} className="mt-2 w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" placeholder="service_xxxx" />
                   </div>
                   <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Template ID</label>
                       <input value={emailConfig.templateId} onChange={e => setEmailConfig({...emailConfig, templateId: e.target.value})} className="mt-2 w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" placeholder="template_xxxx" />
                   </div>
                   <div className="md:col-span-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Public Key (User ID)</label>
                       <input value={emailConfig.publicKey} onChange={e => setEmailConfig({...emailConfig, publicKey: e.target.value})} className="mt-2 w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" placeholder="Public Key EmailJS" />
                   </div>
               </div>
               <button type="submit" className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Salvar na Nuvem</button>
            </form>
          </div>
        )}

        {/* ABA 4: CLOUD (Sincronização) */}
        {activeSubTab === 'cloud' && (
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
             <div className="flex flex-col md:flex-row items-center md:items-start md:space-x-8">
                <div className="p-8 bg-indigo-50 rounded-full border-8 border-indigo-100 mb-6 md:mb-0 relative shrink-0">
                   <Wifi size={56} className="text-indigo-600" />
                   {cloudStatus === 'connected' && <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full border-4 border-white animate-pulse"></div>}
                </div>
                <div className="flex-1">
                   <h3 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Nuvem e Persistência Permanente</h3>
                   <p className="text-slate-500 mt-2 font-medium leading-relaxed">
                     O SisTemp salva cada alteração automaticamente em um banco de dados externo auditável.
                   </p>
                   <div className="mt-8 p-8 bg-slate-50 border border-slate-200 rounded-[2rem]">
                      <div className="flex justify-between items-center mb-6">
                         <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                             <Activity size={16} className="mr-2 text-indigo-600" /> Diagnóstico do Banco de Dados
                         </h4>
                         <button onClick={runDatabaseDiagnostic} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Testar Comunicação</button>
                      </div>
                      {dbDiagnostic.status !== 'idle' && (
                        <div className={`p-6 rounded-3xl flex items-start space-x-4 border-2 ${dbDiagnostic.status === 'ok' ? 'bg-green-50 text-green-700 border-green-100' : dbDiagnostic.status === 'checking' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                            {dbDiagnostic.status === 'ok' ? <CheckCircle2 size={24} /> : dbDiagnostic.status === 'checking' ? <RefreshCw size={24} className="animate-spin" /> : <AlertCircle size={24} />}
                            <div className="text-xs font-bold"><p className="text-sm font-black uppercase mb-1">{dbDiagnostic.status === 'ok' ? 'Conexão Íntegra' : 'Falha Detectada'}</p><p>{dbDiagnostic.message}</p></div>
                        </div>
                      )}
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* MODAL PARA OPERADOR */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-10 shadow-2xl border border-slate-100 animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tighter">Novo Operador</h2>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold" placeholder="Nome Completo"/>
              <input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value.toLowerCase()})} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold" placeholder="Login (ex: marta.silva)"/>
              <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold" placeholder="Senha Provisória"/>
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-white">
                 <option value={UserRole.ADMIN}>Administrador (Acesso Total)</option>
                 <option value={UserRole.HR}>Gestor RH (Operação)</option>
                 <option value={UserRole.CONSULTANT}>Consulta (Somente Leitura)</option>
              </select>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-slate-900 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl">Criar Acesso</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA PARÂMETRO LEGAL */}
      {showParamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-10 shadow-2xl border border-slate-100 animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tighter">Novo Amparo Legal</h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                setParameters([...parameters, { id: generateId(), label: newParam.label, days: parseInt(newParam.days), description: "" }]);
                setShowParamModal(false);
                setNewParam({ label: '', days: '' });
                onLog('PARÂMETRO', `Novo amparo legal criado: ${newParam.label}`);
            }} className="space-y-4">
              <input value={newParam.label} onChange={e => setNewParam({...newParam, label: e.target.value})} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold" placeholder="Ex: Art 2º, IV"/>
              <input type="number" value={newParam.days} onChange={e => setNewParam({...newParam, days: e.target.value})} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold" placeholder="Dias de Limite (Ex: 730)"/>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowParamModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl">Salvar Prazo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface ListManagerProps {
    title: string;
    items: string[];
    onAdd: () => void;
    onRemove: (i: number) => void;
    icon: React.ReactNode;
}

const ListManager: React.FC<ListManagerProps> = ({ title, items, onAdd, onRemove, icon }) => (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-full">
        <div className="flex justify-between items-center mb-6">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center">{icon} <span className="ml-2">{title}</span></h4>
            <button onClick={onAdd} className="p-2 bg-slate-900 text-white rounded-lg active:scale-90 transition-all"><Plus size={14}/></button>
        </div>
        <div className="flex-1 overflow-y-auto max-h-[200px] space-y-2 custom-scrollbar">
            {items.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center group">
                    <span className="text-xs font-bold text-slate-600">{item}</span>
                    <button onClick={() => onRemove(idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12}/></button>
                </div>
            ))}
        </div>
    </div>
);

export default SettingsView;

import React, { useState } from 'react';
import { LegalParameter, User, Vacancy, ConvokedPerson, UserRole, EmailConfig } from '../types';
import { 
  Plus, Trash2, Users, Building2, MapPin, BriefcaseIcon, Wifi, X, UserPlus, Mail, Save, AlertCircle, CheckCircle2, RefreshCw, Key, Shield, Activity, List, Briefcase, Clock
} from 'lucide-react';
import { generateId } from '../utils';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mwhctqhjulrlisokxdth.supabase.co";
const SUPABASE_KEY = "sb_publishable_I6orZsgeBZX0QRvhrQ5d-A_Jng0xH2s";

interface SettingsViewProps {
  parameters: LegalParameter[];
  setParameters: (p: LegalParameter[]) => void;
  agencies: string[];
  setAgencies: (a: string[]) => void;
  units: string[];
  setUnits: (u: string[]) => void;
  profiles: string[];
  setProfiles: (p: string[]) => void;
  users: User[];
  setUsers: (u: User[]) => void;
  vacancies: Vacancy[];
  convocations: ConvokedPerson[];
  onRestoreAll: (data: any) => void;
  cloudStatus?: 'idle' | 'syncing' | 'error' | 'connected';
  onLog: (action: string, details: string) => void;
  emailConfig: EmailConfig;
  setEmailConfig: (e: EmailConfig) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  parameters = [], setParameters, 
  agencies = [], setAgencies,
  units = [], setUnits,
  profiles = [], setProfiles,
  users = [], setUsers, 
  onLog,
  cloudStatus,
  emailConfig,
  setEmailConfig
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'params' | 'users' | 'email' | 'cloud'>('params');
  const [dbDiagnostic, setDbDiagnostic] = useState<{ 
    status: 'idle' | 'checking' | 'ok' | 'fail', 
    message: string 
  }>({ status: 'idle', message: '' });

  // Modais e Formulários
  const [showParamModal, setShowParamModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [newParam, setNewParam] = useState({ label: '', days: '' });
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: UserRole.CONSULTANT });

  // Utilitários de Gestão de Listas Simples
  const handleAddItem = (list: string[], setList: (l: string[]) => void, promptMsg: string, logAction: string) => {
    const item = prompt(promptMsg);
    if (item && item.trim()) {
      setList([...list, item.trim()]);
      onLog('CONFIGURAÇÃO', `${logAction}: ${item}`);
    }
  };

  const handleRemoveItem = (list: string[], setList: (l: string[]) => void, index: number, logAction: string) => {
    if (confirm("Deseja remover este item? Isso pode afetar registros legados.")) {
      const item = list[index];
      const newList = [...list];
      newList.splice(index, 1);
      setList(newList);
      onLog('CONFIGURAÇÃO', `${logAction} removido: ${item}`);
    }
  };

  const runDatabaseDiagnostic = async () => {
    setDbDiagnostic({ status: 'checking', message: 'Verificando gavetas no banco...' });
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { error } = await supabase.from('sistemp_data').select('id').eq('id', 1).single();
        if (error) throw new Error("Erro de Leitura: Verifique se o Script SQL foi executado.");
        setDbDiagnostic({ status: 'ok', message: 'Conexão Íntegra! Suas gavetas estão prontas e memorizando dados.' });
    } catch (e: any) {
        setDbDiagnostic({ status: 'fail', message: e.message || 'Falha na comunicação com o banco.' });
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const user: User = { id: generateId(), ...newUser };
    setUsers([...users, user]);
    setShowUserModal(false);
    setNewUser({ name: '', username: '', password: '', role: UserRole.CONSULTANT });
    onLog('USUÁRIOS', `Novo operador criado: ${user.username}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200">
        <button onClick={() => setActiveSubTab('params')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'params' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Prazos e Perfis</button>
        <button onClick={() => setActiveSubTab('users')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Operadores</button>
        <button onClick={() => setActiveSubTab('email')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'email' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Notificações</button>
        <button onClick={() => setActiveSubTab('cloud')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'cloud' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}>Conexão e Nuvem</button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* ABA 1: PRAZOS E PERFIS */}
        {activeSubTab === 'params' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center"><Clock className="mr-2 text-blue-600" size={18}/> Amparos Legais (Prazos da Lei)</h3>
                    <button onClick={() => setShowParamModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">+ Novo Prazo</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {parameters.map((p) => (
                        <div key={p.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center">
                            <div>
                                <p className="font-black text-slate-800 text-xs">{p.label}</p>
                                <p className="text-[10px] font-bold text-blue-600 uppercase">{p.days} Dias de Limite</p>
                            </div>
                            <button onClick={() => setParameters(parameters.filter(item => item.id !== p.id))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ListManager title="Órgãos Solicitantes" items={agencies} onAdd={() => handleAddItem(agencies, setAgencies, "Nome do Órgão:", "Órgão")} onRemove={(i) => handleRemoveItem(agencies, setAgencies, i, "Órgão")} icon={<Building2 size={18}/>} />
                <ListManager title="Unidades / Setores" items={units} onAdd={() => handleAddItem(units, setUnits, "Nome da Unidade:", "Unidade")} onRemove={(i) => handleRemoveItem(units, setUnits, i, "Unidade")} icon={<MapPin size={18}/>} />
                <ListManager title="Perfis Profissionais" items={profiles} onAdd={() => handleAddItem(profiles, setProfiles, "Nome do Perfil Profissional:", "Perfil")} onRemove={(i) => handleRemoveItem(profiles, setProfiles, i, "Perfil")} icon={<Briefcase size={18}/>} />
            </div>
          </div>
        )}

        {/* ABA 2: OPERADORES */}
        {activeSubTab === 'users' && (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center"><Users className="mr-2 text-blue-600" size={18}/> Gestão de Operadores</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Controle de quem pode ler e escrever no sistema</p>
                </div>
                <button onClick={() => setShowUserModal(true)} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                    <UserPlus size={16} className="inline mr-2"/> Novo Operador
                </button>
            </div>
            <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                    <tr>
                        <th className="px-8 py-4">Nome</th>
                        <th className="px-8 py-4">Usuário</th>
                        <th className="px-8 py-4">Nível de Acesso</th>
                        <th className="px-8 py-4 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-4 font-bold text-slate-700 text-xs">{u.name}</td>
                            <td className="px-8 py-4 font-mono text-slate-400 text-[11px]">{u.username}</td>
                            <td className="px-8 py-4">
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${
                                    u.role === UserRole.ADMIN ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                    u.role === UserRole.HR ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                                    'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                    {u.role === UserRole.ADMIN ? 'Administrador' : u.role === UserRole.HR ? 'Gestor RH' : 'Consulta'}
                                </span>
                            </td>
                            <td className="px-8 py-4 text-right">
                                {u.username !== 'admin' && (
                                    <button onClick={() => setUsers(users.filter(item => item.id !== u.id))} className="text-slate-300 hover:text-red-500 transition-all p-2 rounded-lg hover:bg-red-50">
                                        <Trash2 size={16}/>
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        )}

        {/* ABA 3: NOTIFICAÇÕES (EmailJS) */}
        {activeSubTab === 'email' && (
          <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200 animate-in fade-in duration-300">
            <h3 className="text-xl font-black mb-6 uppercase tracking-tighter flex items-center"><Mail className="mr-3 text-indigo-600" /> Configurações de Notificação</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">Integração via EmailJS para envio automático de alertas aos contratados temporários.</p>
            <form onSubmit={(e) => { e.preventDefault(); setEmailConfig(emailConfig); alert('Configurações salvas!'); }} className="space-y-5 max-w-2xl">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service ID</label>
                       <input value={emailConfig.serviceId} onChange={e => setEmailConfig({...emailConfig, serviceId: e.target.value})} className="mt-2 w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" placeholder="service_xxxx" />
                   </div>
                   <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Template ID</label>
                       <input value={emailConfig.templateId} onChange={e => setEmailConfig({...emailConfig, templateId: e.target.value})} className="mt-2 w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" placeholder="template_xxxx" />
                   </div>
                   <div className="md:col-span-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Public Key (User ID)</label>
                       <input value={emailConfig.publicKey} onChange={e => setEmailConfig({...emailConfig, publicKey: e.target.value})} className="mt-2 w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" placeholder="Public Key EmailJS" />
                   </div>
               </div>
               <button type="submit" className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Salvar na Nuvem</button>
            </form>
          </div>
        )}

        {/* ABA 4: CLOUD (Sincronização) */}
        {activeSubTab === 'cloud' && (
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
             <div className="flex flex-col md:flex-row items-center md:items-start md:space-x-8">
                <div className="p-8 bg-indigo-50 rounded-full border-8 border-indigo-100 mb-6 md:mb-0 relative shrink-0">
                   <Wifi size={56} className="text-indigo-600" />
                   {cloudStatus === 'connected' && <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full border-4 border-white animate-pulse"></div>}
                </div>
                <div className="flex-1">
                   <h3 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Nuvem e Persistência Permanente</h3>
                   <p className="text-slate-500 mt-2 font-medium leading-relaxed">
                     O SisTemp salva cada alteração automaticamente em um banco de dados externo auditável.
                   </p>
                   <div className="mt-8 p-8 bg-slate-50 border border-slate-200 rounded-[2rem]">
                      <div className="flex justify-between items-center mb-6">
                         <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                             <Activity size={16} className="mr-2 text-indigo-600" /> Diagnóstico do Banco de Dados
                         </h4>
                         <button onClick={runDatabaseDiagnostic} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Testar Comunicação</button>
                      </div>
                      {dbDiagnostic.status !== 'idle' && (
                        <div className={`p-6 rounded-3xl flex items-start space-x-4 border-2 ${dbDiagnostic.status === 'ok' ? 'bg-green-50 text-green-700 border-green-100' : dbDiagnostic.status === 'checking' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                            {dbDiagnostic.status === 'ok' ? <CheckCircle2 size={24} /> : dbDiagnostic.status === 'checking' ? <RefreshCw size={24} className="animate-spin" /> : <AlertCircle size={24} />}
                            <div className="text-xs font-bold"><p className="text-sm font-black uppercase mb-1">{dbDiagnostic.status === 'ok' ? 'Conexão Íntegra' : 'Falha Detectada'}</p><p>{dbDiagnostic.message}</p></div>
                        </div>
                      )}
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* MODAL PARA OPERADOR */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-10 shadow-2xl border border-slate-100 animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tighter">Novo Operador</h2>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold" placeholder="Nome Completo"/>
              <input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value.toLowerCase()})} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold" placeholder="Login (ex: marta.silva)"/>
              <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold" placeholder="Senha Provisória"/>
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-white">
                 <option value={UserRole.ADMIN}>Administrador (Acesso Total)</option>
                 <option value={UserRole.HR}>Gestor RH (Operação)</option>
                 <option value={UserRole.CONSULTANT}>Consulta (Somente Leitura)</option>
              </select>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-slate-900 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl">Criar Acesso</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA PARÂMETRO LEGAL */}
      {showParamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-10 shadow-2xl border border-slate-100 animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tighter">Novo Amparo Legal</h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                setParameters([...parameters, { id: generateId(), label: newParam.label, days: parseInt(newParam.days), description: "" }]);
                setShowParamModal(false);
                setNewParam({ label: '', days: '' });
                onLog('PARÂMETRO', `Novo amparo legal criado: ${newParam.label}`);
            }} className="space-y-4">
              <input value={newParam.label} onChange={e => setNewParam({...newParam, label: e.target.value})} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold" placeholder="Ex: Art 2º, IV"/>
              <input type="number" value={newParam.days} onChange={e => setNewParam({...newParam, days: e.target.value})} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold" placeholder="Dias de Limite (Ex: 730)"/>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowParamModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl">Salvar Prazo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface ListManagerProps {
    title: string;
    items: string[];
    onAdd: () => void;
    onRemove: (i: number) => void;
    icon: React.ReactNode;
}

const ListManager: React.FC<ListManagerProps> = ({ title, items, onAdd, onRemove, icon }) => (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-full">
        <div className="flex justify-between items-center mb-6">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center">{icon} <span className="ml-2">{title}</span></h4>
            <button onClick={onAdd} className="p-2 bg-slate-900 text-white rounded-lg active:scale-90 transition-all"><Plus size={14}/></button>
        </div>
        <div className="flex-1 overflow-y-auto max-h-[200px] space-y-2 custom-scrollbar">
            {items.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center group">
                    <span className="text-xs font-bold text-slate-600">{item}</span>
                    <button onClick={() => onRemove(idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12}/></button>
                </div>
            ))}
        </div>
    </div>
);

export default SettingsView;
