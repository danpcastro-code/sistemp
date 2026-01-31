
import React, { useState } from 'react';
import { LegalParameter, User, Vacancy, ConvokedPerson, UserRole, EmailConfig } from '../types';
import { 
  Plus, Trash2, Terminal, Users, Building2, MapPin, BriefcaseIcon, Wifi, X, UserPlus, Mail, Save, Server, Database, AlertCircle, CheckCircle2, RefreshCw, Key, Shield, Send, Info, List
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
  vacancies = [], convocations = [], 
  onRestoreAll,
  cloudStatus,
  onLog,
  emailConfig,
  setEmailConfig
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'params' | 'users' | 'email' | 'cloud'>('params');
  const [dbDiagnostic, setDbDiagnostic] = useState<{ status: 'idle' | 'checking' | 'ok' | 'fail', message: string }>({ status: 'idle', message: '' });
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'ok' | 'fail'>('idle');

  // Modais
  const [showParamModal, setShowParamModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAgencyModal, setShowAgencyModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  // Estados dos formulários
  const [newParam, setNewParam] = useState({ label: '', days: '' });
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: UserRole.CONSULTANT });
  const [newProfile, setNewProfile] = useState('');
  const [newAgency, setNewAgency] = useState('');
  const [newUnit, setNewUnit] = useState('');

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

  const handleTestEmail = async () => {
    if (!emailConfig.publicKey || !emailConfig.serviceId || !emailConfig.templateId) {
        alert("Preencha as chaves de API (Public Key, Service ID e Template ID) antes de testar.");
        return;
    }
    
    setTestStatus('sending');
    try {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: emailConfig.serviceId,
                template_id: emailConfig.templateId,
                user_id: emailConfig.publicKey,
                template_params: {
                    to_name: "Administrador SisTemp",
                    to_email: emailConfig.sender,
                    from_name: "SisTemp Test",
                    subject: "Teste de Integração de E-mail",
                    message: "Este é um e-mail automático para confirmar que a integração do SisTemp com o EmailJS está ativa e funcional."
                }
            })
        });

        if (response.ok) {
            setTestStatus('ok');
            alert("Sucesso! E-mail de teste enviado para " + emailConfig.sender);
        } else {
            setTestStatus('fail');
            alert("Falha no envio. Verifique as chaves e permissões no painel do EmailJS.");
        }
    } catch (e) {
        setTestStatus('fail');
    }
  };

  const handleSaveEmailConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailConfig(emailConfig);
    onLog('CONFIGURAÇÃO', 'Integração de e-mail atualizada e salva na nuvem.');
    alert('Configurações de e-mail salvas permanentemente!');
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

  const handleAddProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProfile.trim()) {
      setProfiles([...profiles, newProfile.trim()]);
      onLog('PARAMETRIZAÇÃO', `Novo perfil profissional: ${newProfile.trim()}`);
      setNewProfile('');
      setShowProfileModal(false);
    }
  };

  const handleAddAgency = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAgency.trim()) {
      setAgencies([...agencies, newAgency.trim()]);
      onLog('PARAMETRIZAÇÃO', `Novo órgão solicitante: ${newAgency.trim()}`);
      setNewAgency('');
      setShowAgencyModal(false);
    }
  };

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUnit.trim()) {
      setUnits([...units, newUnit.trim()]);
      onLog('PARAMETRIZAÇÃO', `Nova unidade administrativa: ${newUnit.trim()}`);
      setNewUnit('');
      setShowUnitModal(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200">
        <button onClick={() => setActiveSubTab('params')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'params' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Prazos e Perfis</button>
        <button onClick={() => setActiveSubTab('users')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Operadores</button>
        <button onClick={() => setActiveSubTab('email')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'email' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Integração E-mail</button>
        <button onClick={() => setActiveSubTab('cloud')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'cloud' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}>Conexão e Nuvem</button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeSubTab === 'params' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Perfis */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-slate-800 flex items-center uppercase text-[10px] tracking-widest"><BriefcaseIcon size={16} className="mr-3 text-blue-600" /> Perfis Profissionais</h3>
                        <button onClick={() => setShowProfileModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Novo Perfil</button>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-50 max-h-60 custom-scrollbar">
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-slate-50">
                                {profiles.map((p, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-4 py-3 font-bold text-slate-700 text-xs">{p}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => setProfiles(profiles.filter(i => i !== p))} className="text-slate-200 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Amparos */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-slate-800 flex items-center uppercase text-[10px] tracking-widest"><Terminal size={16} className="mr-3 text-emerald-600" /> Amparos Legais</h3>
                        <button onClick={() => setShowParamModal(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Novo Amparo</button>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-50 max-h-60 custom-scrollbar">
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-slate-50">
                                {parameters.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-4 py-3 font-bold text-slate-700 text-xs">{p.label}</td>
                                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">{p.days}d</td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => setParameters(parameters.filter(i => i.id !== p.id))} className="text-slate-200 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Órgãos */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-slate-800 flex items-center uppercase text-[10px] tracking-widest"><Building2 size={16} className="mr-3 text-amber-600" /> Órgãos Solicitantes</h3>
                        <button onClick={() => setShowAgencyModal(true)} className="px-4 py-2 bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Novo Órgão</button>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-50 max-h-60 custom-scrollbar">
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-slate-50">
                                {agencies.map((a, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-4 py-3 font-bold text-slate-700 text-xs">{a}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => setAgencies(agencies.filter(i => i !== a))} className="text-slate-200 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Unidades */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-slate-800 flex items-center uppercase text-[10px] tracking-widest"><MapPin size={16} className="mr-3 text-indigo-600" /> Unidades Administrativas</h3>
                        <button onClick={() => setShowUnitModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Nova Unidade</button>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-50 max-h-60 custom-scrollbar">
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-slate-50">
                                {units.map((u, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-4 py-3 font-bold text-slate-700 text-xs">{u}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => setUnits(units.filter(i => i !== u))} className="text-slate-200 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14}/></button>
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
              <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-200">
                <Mail size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Integração de Notificação Real</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Conectado via EmailJS API Service</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                    <form onSubmit={handleSaveEmailConfig} className="space-y-6">
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2 flex items-center">
                                <Shield size={14} className="mr-2" /> Credenciais da API (EmailJS)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Service ID</label>
                                    <input value={emailConfig.serviceId} onChange={e => setEmailConfig({...emailConfig, serviceId: e.target.value})} className="mt-1.5 w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Ex: service_xxxx" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Template ID</label>
                                    <input value={emailConfig.templateId} onChange={e => setEmailConfig({...emailConfig, templateId: e.target.value})} className="mt-1.5 w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Ex: template_xxxx" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Public Key (User ID)</label>
                                    <input value={emailConfig.publicKey} onChange={e => setEmailConfig({...emailConfig, publicKey: e.target.value})} className="mt-1.5 w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Ex: xxxxxxxxxxxxxxxx" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail do Remetente (RH/Gestor)</label>
                                <input type="email" value={emailConfig.sender} onChange={e => setEmailConfig({...emailConfig, sender: e.target.value})} className="mt-2 w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" placeholder="exemplo@orgao.gov.br" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assunto da Mensagem</label>
                                <input type="text" value={emailConfig.subject} onChange={e => setEmailConfig({...emailConfig, subject: e.target.value})} className="mt-2 w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Corpo da Mensagem (Template Dinâmico)</label>
                                <textarea rows={5} value={emailConfig.template} onChange={e => setEmailConfig({...emailConfig, template: e.target.value})} className="mt-2 w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium text-sm leading-relaxed" />
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {['{nome}', '{posto}', '{grupo}', '{data_fatal}'].map(tag => (
                                    <span key={tag} className="px-2 py-1 bg-indigo-50 text-indigo-500 rounded-lg text-[10px] font-black font-mono">{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 flex space-x-4">
                            <button type="submit" className="flex items-center px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-2xl active:scale-95 transition-all">
                                <Save size={18} className="mr-3" /> Salvar Configuração Global
                            </button>
                            <button type="button" onClick={handleTestEmail} disabled={testStatus === 'sending'} className="flex items-center px-6 py-4 border-2 border-slate-900 text-slate-900 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-50 transition-all active:scale-95">
                                {testStatus === 'sending' ? <RefreshCw size={18} className="mr-3 animate-spin" /> : <Send size={18} className="mr-3" />}
                                Testar Integração
                            </button>
                        </div>
                    </form>
                </div>

                <div className="bg-indigo-50 p-8 rounded-[2rem] border border-indigo-100">
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center">
                        <Info size={14} className="mr-2" /> Guia de Produção
                    </h4>
                    <ul className="text-[11px] space-y-4 text-indigo-900/80 font-medium">
                        <li>1. Crie uma conta gratuita em **emailjs.com**.</li>
                        <li>2. Adicione seu serviço de e-mail (Gmail, Outlook ou SMTP institucional).</li>
                        <li>3. Crie um Template de e-mail no painel deles.</li>
                        <li>4. Copie as chaves para os campos ao lado.</li>
                        <hr className="border-indigo-200" />
                        <li className="font-bold text-indigo-600 uppercase">Segurança & LGPD:</li>
                        <li>O sistema utiliza conexão HTTPS criptografada para enviar os dados à API. As chaves são armazenadas de forma segura no Supabase e protegidas por RLS.</li>
                    </ul>
                </div>
            </div>
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
      </div>

      {/* Modais de Cadastro */}
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

      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-slate-200 animate-in zoom-in duration-200 relative">
                <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 text-slate-400"><X size={20}/></button>
                <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Novo Perfil</h2>
                <form onSubmit={handleAddProfile} className="space-y-4">
                    <input required value={newProfile} onChange={e => setNewProfile(e.target.value)} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" placeholder="Ex: Professor Substituto" />
                    <div className="flex space-x-3 pt-4">
                        <button type="button" onClick={() => setShowProfileModal(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Gravar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showAgencyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-slate-200 animate-in zoom-in duration-200 relative">
                <button onClick={() => setShowAgencyModal(false)} className="absolute top-4 right-4 text-slate-400"><X size={20}/></button>
                <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Novo Órgão</h2>
                <form onSubmit={handleAddAgency} className="space-y-4">
                    <input required value={newAgency} onChange={e => setNewAgency(e.target.value)} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" placeholder="Nome do Órgão" />
                    <div className="flex space-x-3 pt-4">
                        <button type="button" onClick={() => setShowAgencyModal(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-amber-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Gravar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showUnitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-slate-200 animate-in zoom-in duration-200 relative">
                <button onClick={() => setShowUnitModal(false)} className="absolute top-4 right-4 text-slate-400"><X size={20}/></button>
                <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Nova Unidade</h2>
                <form onSubmit={handleAddUnit} className="space-y-4">
                    <input required value={newUnit} onChange={e => setNewUnit(e.target.value)} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" placeholder="Nome da Unidade" />
                    <div className="flex space-x-3 pt-4">
                        <button type="button" onClick={() => setShowUnitModal(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Gravar</button>
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
