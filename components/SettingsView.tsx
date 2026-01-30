
import React, { useState } from 'react';
import { LegalParameter, User, Vacancy, ConvokedPerson, UserRole } from '../types';
import { 
  Plus, Trash2, Terminal, Users, Building2, MapPin, BriefcaseIcon, Wifi, X, UserPlus, Mail, Save, Server, Database, AlertCircle, CheckCircle2, RefreshCw
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
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  parameters = [], setParameters, 
  agencies = [], setAgencies,
  units = [], setUnits,
  profiles = [], setProfiles,
  users = [], setUsers, 
  vacancies = [], convocations = [], 
  onRestoreAll,
  cloudStatus,
  onLog
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'params' | 'users' | 'email' | 'cloud'>('params');
  const [dbDiagnostic, setDbDiagnostic] = useState<{ status: 'idle' | 'checking' | 'ok' | 'fail', message: string }>({ status: 'idle', message: '' });

  const [emailConfig, setEmailConfig] = useState(() => {
    const saved = localStorage.getItem('sistemp_email_config');
    return saved ? JSON.parse(saved) : {
      sender: 'rh.notificacao@orgao.gov.br',
      subject: 'Aviso de Término de Contrato Temporário',
      template: 'Prezado(a) {nome},\n\nInformamos que seu contrato vinculado ao posto {posto} do grupo {grupo} atingirá o limite fatal de permanência em {data_fatal}.\n\nFavor comparecer ao RH para orientações.'
    };
  });

  const [showParamModal, setShowParamModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [newParam, setNewParam] = useState({ label: '', days: '' });
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: UserRole.CONSULTANT });

  const checkDatabase = async () => {
    setDbDiagnostic({ status: 'checking', message: 'Verificando tabelas no Supabase...' });
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { data, error } = await supabase.from('sistemp_data').select('id').eq('id', 1).single();
        
        if (error) {
            setDbDiagnostic({ status: 'fail', message: `Erro: Tabela 'sistemp_data' não encontrada ou sem acesso RLS. Detalhe: ${error.message}` });
        } else if (data) {
            setDbDiagnostic({ status: 'ok', message: 'Conexão íntegra! O banco de dados está pronto para receber e memorizar seus dados.' });
        } else {
            setDbDiagnostic({ status: 'fail', message: 'A tabela existe, mas o registro de ID 1 (raiz) não foi inicializado.' });
        }
    } catch (e) {
        setDbDiagnostic({ status: 'fail', message: 'Falha na conexão de rede com o servidor de banco de dados.' });
    }
  };

  const handleSaveEmailConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('sistemp_email_config', JSON.stringify(emailConfig));
    onLog('CONFIGURAÇÃO', 'Configurações de e-mail atualizadas.');
    alert('Configurações de e-mail salvas com sucesso!');
  };

  const handleSaveParam = (e: React.FormEvent) => {
    e.preventDefault();
    if (newParam.label && newParam.days) {
      const param: LegalParameter = { id: generateId(), label: newParam.label, days: parseInt(newParam.days), description: "" };
      setParameters([...parameters, param]);
      onLog('PARAMETRIZAÇÃO', `Adicionado amparo: ${newParam.label}`);
      setShowParamModal(false);
      setNewParam({ label: '', days: '' });
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.name && newUser.username && newUser.password) {
      const user: User = { id: generateId(), ...newUser };
      setUsers([...users, user]);
      onLog('SISTEMA', `Novo operador criado: ${newUser.name}`);
      setShowUserModal(false);
      setNewUser({ name: '', username: '', password: '', role: UserRole.CONSULTANT });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200">
        <button onClick={() => setActiveSubTab('params')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'params' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Prazos e Perfis</button>
        <button onClick={() => setActiveSubTab('users')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Operadores</button>
        <button onClick={() => setActiveSubTab('email')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'email' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>E-mail de Alerta</button>
        <button onClick={() => setActiveSubTab('cloud')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'cloud' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}>Conexão e Nuvem</button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeSubTab === 'cloud' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row items-center md:items-start md:space-x-8 text-center md:text-left">
                   <div className="p-8 bg-indigo-50 rounded-full border-8 border-indigo-100 mb-6 md:mb-0 relative shrink-0">
                      <Wifi size={56} className="text-indigo-600" />
                      {cloudStatus === 'connected' && <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full border-4 border-white animate-pulse"></div>}
                   </div>
                   <div className="flex-1">
                      <h3 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Nuvem e Persistência</h3>
                      <p className="text-slate-500 mt-2 font-medium leading-relaxed">
                        O SisTemp utiliza o **Supabase** para garantir que seus dados não fiquem apenas neste computador. 
                        As alterações são sincronizadas automaticamente a cada 10 segundos ou em cada alteração importante.
                      </p>
                      
                      <div className="mt-8 p-6 bg-slate-50 border border-slate-100 rounded-3xl">
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                            <Database size={14} className="mr-2" /> Diagnóstico de Memorização
                         </h4>
                         
                         {dbDiagnostic.status === 'idle' ? (
                            <button onClick={checkDatabase} className="flex items-center px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                               <RefreshCw size={14} className="mr-2" /> Testar Comunicação Permanente
                            </button>
                         ) : (
                            <div className={`p-4 rounded-2xl flex items-start space-x-3 ${dbDiagnostic.status === 'ok' ? 'bg-green-50 text-green-700 border border-green-100' : dbDiagnostic.status === 'checking' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                               {dbDiagnostic.status === 'ok' ? <CheckCircle2 size={18} /> : dbDiagnostic.status === 'checking' ? <RefreshCw size={18} className="animate-spin" /> : <AlertCircle size={18} />}
                               <div className="text-[11px] font-bold">
                                  <p>{dbDiagnostic.message}</p>
                                  {dbDiagnostic.status === 'fail' && (
                                    <p className="mt-2 text-[9px] font-black opacity-60 uppercase">DICA: Verifique se o script SQL foi executado no painel do Supabase.</p>
                                  )}
                                  {dbDiagnostic.status !== 'checking' && (
                                    <button onClick={checkDatabase} className="mt-2 underline uppercase tracking-widest text-[9px]">Tentar Novamente</button>
                                  )}
                               </div>
                            </div>
                         )}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Mantidas abas de amparos e e-mail sem alterações visuais, apenas ajuste de renderização condicional */}
        {activeSubTab === 'params' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-slate-800 flex items-center uppercase text-sm tracking-tight"><BriefcaseIcon size={20} className="mr-3 text-blue-600" /> Perfis Profissionais</h3>
                        <button onClick={() => alert('Para gerenciar perfis, utilize a lista abaixo ou contate o administrador.')} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Novo Perfil</button>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-50">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50">
                                <tr className="text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
                                    <th className="px-4 py-3">Nome do Perfil</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {profiles.map((p, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-4 py-3.5 font-bold text-slate-700 text-xs">{p}</td>
                                        <td className="px-4 py-3.5 text-right">
                                            <button onClick={() => setProfiles(profiles.filter(i => i !== p))} className="text-slate-200 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-slate-800 flex items-center uppercase text-sm tracking-tight"><Terminal size={20} className="mr-3 text-emerald-600" /> Amparos Legais</h3>
                        <button onClick={() => setShowParamModal(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Novo Amparo</button>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-50">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50">
                                <tr className="text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
                                    <th className="px-4 py-3">Amparo</th>
                                    <th className="px-4 py-3">Vigência</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {parameters.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-4 py-3.5 font-bold text-slate-700 text-xs">{p.label}</td>
                                        <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">{p.days} dias</td>
                                        <td className="px-4 py-3.5 text-right">
                                            <button onClick={() => setParameters(parameters.filter(i => i.id !== p.id))} className="text-slate-200 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          </div>
        )}

        {activeSubTab === 'email' && (
          <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200 animate-in fade-in duration-300">
            <div className="flex items-center space-x-4 mb-10">
              <div className="p-4 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-200">
                <Mail size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Configuração de E-mail</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Automação de alertas de 90 dias</p>
              </div>
            </div>
            <form onSubmit={handleSaveEmailConfig} className="space-y-8 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail do Remetente (RH)</label>
                  <div className="relative mt-2">
                    <Server className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input type="email" value={emailConfig.sender} onChange={e => setEmailConfig({...emailConfig, sender: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" placeholder="exemplo@orgao.gov.br" />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assunto da Mensagem</label>
                  <input type="text" value={emailConfig.subject} onChange={e => setEmailConfig({...emailConfig, subject: e.target.value})} className="mt-2 w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo de Texto (Template)</label>
                  <textarea rows={6} value={emailConfig.template} onChange={e => setEmailConfig({...emailConfig, template: e.target.value})} className="mt-2 w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium text-sm leading-relaxed" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['{nome}', '{posto}', '{grupo}', '{data_fatal}'].map(tag => (
                      <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black font-mono">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-50">
                <button type="submit" className="flex items-center px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-2xl active:scale-95 transition-all">
                  <Save size={18} className="mr-3" /> Salvar Configuração
                </button>
              </div>
            </form>
          </div>
        )}

        {activeSubTab === 'users' && (
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 animate-in fade-in duration-300">
             <div className="flex justify-between items-center mb-8">
                <h3 className="font-black text-slate-800 flex items-center uppercase text-sm tracking-tight"><Users size={20} className="mr-3 text-blue-600" /> Gestão de Operadores</h3>
                <button onClick={() => setShowUserModal(true)} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"><UserPlus size={18} className="mr-2 inline"/> Novo Operador</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map(user => (
                  <div key={user.id} className="p-6 border border-slate-100 bg-slate-50 rounded-3xl relative group">
                     <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white ${user.role === UserRole.ADMIN ? 'bg-blue-600' : 'bg-slate-400'}`}>
                           {user.name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                           <p className="font-black text-slate-800 text-sm leading-none">{user.name}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">@{user.username}</p>
                        </div>
                     </div>
                     <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-white border rounded text-slate-400 tracking-widest">{user.role}</span>
                        {user.username !== 'admin' && (
                          <button onClick={() => setUsers(users.filter(u => u.id !== user.id))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                        )}
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>

      {showParamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-slate-200 animate-in zoom-in duration-200 relative">
                <button onClick={() => setShowParamModal(false)} className="absolute top-4 right-4 text-slate-400"><X size={20}/></button>
                <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Novo Amparo Legal</h2>
                <form onSubmit={handleSaveParam} className="space-y-4">
                    <input required value={newParam.label} onChange={e => setNewParam({...newParam, label: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-blue-500/10" placeholder="Ex: Art 2º, IV" />
                    <input required type="number" value={newParam.days} onChange={e => setNewParam({...newParam, days: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-blue-500/10" placeholder="Vigência em dias" />
                    <div className="flex space-x-3 pt-4">
                        <button type="button" onClick={() => setShowParamModal(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Gravar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-slate-200 animate-in zoom-in duration-200 relative">
                <button onClick={() => setShowUserModal(false)} className="absolute top-4 right-4 text-slate-400"><X size={20}/></button>
                <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Novo Operador</h2>
                <form onSubmit={handleSaveUser} className="space-y-4">
                    <input required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" placeholder="Nome Completo" />
                    <input required value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" placeholder="Login / Usuário" />
                    <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" placeholder="Senha" />
                    <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold">
                       <option value={UserRole.HR}>Gestor RH</option>
                       <option value={UserRole.CONSULTANT}>Consulta Externa</option>
                       <option value={UserRole.ADMIN}>Administrador</option>
                    </select>
                    <div className="flex space-x-3 pt-4">
                        <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Gravar</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
