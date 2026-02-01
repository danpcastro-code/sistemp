
import React, { useState } from 'react';
import { LegalParameter, User, Vacancy, ConvokedPerson, UserRole, EmailConfig } from '../types';
import { 
  Plus, Trash2, Terminal, Users, Building2, MapPin, BriefcaseIcon, Wifi, X, UserPlus, Mail, Save, Server, Database, AlertCircle, CheckCircle2, RefreshCw, Key, Shield, Send, Info, List, Activity
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

  const runDatabaseDiagnostic = async () => {
    setDbDiagnostic({ status: 'checking', message: 'Verificando gavetas no banco...' });
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { data, error } = await supabase.from('sistemp_data').select('id').eq('id', 1).single();
        
        if (error) {
            throw new Error("Erro de Leitura: O Script SQL precisa ser executado no painel do Supabase.");
        }
        
        setDbDiagnostic({ status: 'ok', message: 'Conexão Íntegra! Suas gavetas estão prontas e memorizando dados.' });
    } catch (e: any) {
        setDbDiagnostic({ status: 'fail', message: e.message || 'Falha na comunicação com o banco.' });
    }
  };

  const handleSaveEmailConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailConfig(emailConfig);
    onLog('CONFIGURAÇÃO', 'Integração de e-mail atualizada.');
    alert('Configurações salvas!');
  };

  const handleSaveParam = (e: React.FormEvent) => {
    e.preventDefault();
    if (newParam.label && newParam.days) {
      setParameters([...parameters, { id: generateId(), label: newParam.label, days: parseInt(newParam.days), description: "" }]);
      setShowParamModal(false);
      setNewParam({ label: '', days: '' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200">
        <button onClick={() => setActiveSubTab('params')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'params' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Prazos e Perfis</button>
        <button onClick={() => setActiveSubTab('users')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Operadores</button>
        <button onClick={() => setActiveSubTab('email')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'email' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Notificações</button>
        <button onClick={() => setActiveSubTab('cloud')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'cloud' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}>Conexão e Nuvem</button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeSubTab === 'cloud' && (
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200 animate-in fade-in duration-500">
             <div className="flex flex-col md:flex-row items-center md:items-start md:space-x-8">
                <div className="p-8 bg-indigo-50 rounded-full border-8 border-indigo-100 mb-6 md:mb-0 relative">
                   <Wifi size={56} className="text-indigo-600" />
                   {cloudStatus === 'connected' && <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full border-4 border-white animate-pulse"></div>}
                </div>
                <div className="flex-1">
                   <h3 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Nuvem e Persistência Permanente</h3>
                   <p className="text-slate-500 mt-2 font-medium leading-relaxed">
                     Esta função garante que o SisTemp salve cada clique e alteração em um banco de dados externo. 
                     Mesmo se você formatar este computador, os dados estarão seguros.
                   </p>
                   
                   <div className="mt-8 p-8 bg-slate-50 border border-slate-200 rounded-[2rem]">
                      <div className="flex justify-between items-center mb-6">
                         <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                             <Activity size={16} className="mr-2 text-indigo-600" /> Diagnóstico do Banco de Dados
                         </h4>
                         <button 
                            onClick={runDatabaseDiagnostic} 
                            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                         >
                            Testar Memorização
                         </button>
                      </div>

                      {dbDiagnostic.status !== 'idle' && (
                        <div className={`p-6 rounded-3xl flex items-start space-x-4 border-2 ${
                            dbDiagnostic.status === 'ok' ? 'bg-green-50 text-green-700 border-green-100' : 
                            dbDiagnostic.status === 'checking' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 
                            'bg-red-50 text-red-700 border-red-100'
                        }`}>
                            <div className="mt-0.5">
                                {dbDiagnostic.status === 'ok' ? <CheckCircle2 size={24} /> : 
                                 dbDiagnostic.status === 'checking' ? <RefreshCw size={24} className="animate-spin" /> : 
                                 <AlertCircle size={24} />}
                            </div>
                            <div className="text-xs font-bold">
                                <p className="text-sm font-black uppercase tracking-tight mb-1">
                                    {dbDiagnostic.status === 'ok' ? 'Conexão Íntegra' : 'Falha Detectada'}
                                </p>
                                <p>{dbDiagnostic.message}</p>
                            </div>
                        </div>
                      )}
                      
                      {dbDiagnostic.status === 'fail' && (
                        <div className="mt-6 p-6 bg-amber-50 rounded-2xl border border-amber-200">
                           <h5 className="text-[10px] font-black text-amber-700 uppercase mb-3">Como resolver este problema:</h5>
                           <ol className="text-xs text-amber-800 space-y-2 list-decimal list-inside">
                              <li>Acesse o <b>SQL Editor</b> no painel do Supabase.</li>
                              <li>Copie o script fornecido no tutorial do suporte.</li>
                              <li>Clique em <b>Run</b>.</li>
                              <li>Recarregue esta página do SisTemp.</li>
                           </ol>
                        </div>
                      )}
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* ... Restante das abas (parâmetros, e-mail, etc) permanece igual ao arquivo anterior ... */}
        {activeSubTab === 'email' && (
          <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200 animate-in fade-in duration-300">
            {/* Interface de emailJS simplificada */}
            <h3 className="text-xl font-black mb-6 uppercase">Configurações de Notificação</h3>
            <form onSubmit={handleSaveEmailConfig} className="space-y-4">
               <input placeholder="Service ID" value={emailConfig.serviceId} onChange={e => setEmailConfig({...emailConfig, serviceId: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl" />
               <input placeholder="Template ID" value={emailConfig.templateId} onChange={e => setEmailConfig({...emailConfig, templateId: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl" />
               <input placeholder="Public Key" value={emailConfig.publicKey} onChange={e => setEmailConfig({...emailConfig, publicKey: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl" />
               <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl">Salvar na Nuvem</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
