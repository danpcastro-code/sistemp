
import React, { useState, useRef } from 'react';
import { LegalParameter, User, Vacancy, ConvokedPerson, UserRole } from '../types';
import { 
  Plus, Trash2, Terminal, Users, FileJson, Download, 
  Cloud, Copy, FileUp, UserPlus, Code, X, Shield, Key, User as UserIcon, Calendar, Briefcase, Building2, MapPin, UserSquare2, Globe, AlertTriangle
} from 'lucide-react';
import { generateId } from '../utils';

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
  onCloudConfigChange?: () => void;
  onLog: (action: string, details: string) => void;
}

const DEFAULT_AGENCY = 'Ministério da Gestão e da Inovação em Serviços Públicos';
const DEFAULT_UNIT = 'Sede Central';

const SettingsView: React.FC<SettingsViewProps> = ({ 
  parameters = [], setParameters, 
  agencies = [], setAgencies,
  units = [], setUnits,
  profiles = [], setProfiles,
  users = [], setUsers, 
  vacancies = [], convocations = [], 
  onRestoreAll,
  cloudStatus,
  onCloudConfigChange,
  onLog
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'params' | 'users' | 'backup' | 'cloud'>('params');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showUserModal, setShowUserModal] = useState(false);
  const [showParamModal, setShowParamModal] = useState(false);
  const [showAddAgencyModal, setShowAddAgencyModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);

  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: UserRole.CONSULTANT });
  const [newParam, setNewParam] = useState({ label: '', days: '' });
  const [newAgencyName, setNewAgencyName] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [newProfileName, setNewProfileName] = useState('');

  const handleSaveParam = (e: React.FormEvent) => {
    e.preventDefault();
    if (newParam.label && newParam.days) {
      const param: LegalParameter = { 
        id: generateId(), 
        label: newParam.label, 
        days: parseInt(newParam.days), 
        description: "" 
      };
      setParameters([...parameters, param]);
      onLog('PARAMETRIZAÇÃO', `Adicionado novo amparo legal: ${newParam.label} (${newParam.days} dias).`);
      setShowParamModal(false);
      setNewParam({ label: '', days: '' });
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.name && newUser.username && newUser.password) {
      const user: User = { 
        id: generateId(), 
        ...newUser 
      };
      setUsers([...users, user]);
      onLog('SISTEMA', `Criado novo operador: ${newUser.name} (@${newUser.username}).`);
      setShowUserModal(false);
      setNewUser({ name: '', username: '', password: '', role: UserRole.CONSULTANT });
    }
  };

  const handleAddAgency = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAgencyName.trim()) {
      setAgencies([...agencies, newAgencyName.trim()]);
      onLog('SISTEMA', `Adicionado novo órgão: ${newAgencyName.trim()}`);
      setNewAgencyName('');
      setShowAddAgencyModal(false);
    }
  };

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUnitName.trim()) {
      setUnits([...units, newUnitName.trim()]);
      onLog('SISTEMA', `Adicionada nova unidade: ${newUnitName.trim()}`);
      setNewUnitName('');
      setShowAddUnitModal(false);
    }
  };

  const handleAddProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProfileName.trim()) {
      setProfiles([...profiles, newProfileName.trim()]);
      onLog('SISTEMA', `Adicionado novo perfil profissional: ${newProfileName.trim()}`);
      setNewProfileName('');
      setShowAddProfileModal(false);
    }
  };

  const handleRemoveAgency = (agencyToRemove: string) => {
    if (agencyToRemove === DEFAULT_AGENCY) {
        alert("O órgão principal não pode ser removido.");
        return;
    }
    if (confirm(`Remover "${agencyToRemove}" da lista de seleção?`)) {
        setAgencies(agencies.filter(a => a !== agencyToRemove));
        onLog('SISTEMA', `Removido órgão da lista de seleção: ${agencyToRemove}`);
    }
  };

  const handleRemoveUnit = (unitToRemove: string) => {
    if (unitToRemove === DEFAULT_UNIT) {
        alert("A unidade principal não pode ser removida.");
        return;
    }
    if (confirm(`Remover "${unitToRemove}" da lista de seleção?`)) {
        setUnits(units.filter(u => u !== unitToRemove));
        onLog('SISTEMA', `Removida unidade da lista de seleção: ${unitToRemove}`);
    }
  };

  const handleRemoveProfile = (profileToRemove: string) => {
    if (confirm(`Remover "${profileToRemove}" da lista de seleção?`)) {
        setProfiles(profiles.filter(p => p !== profileToRemove));
        onLog('SISTEMA', `Removido perfil profissional da lista de seleção: ${profileToRemove}`);
    }
  };

  const exportBackup = () => {
    const data = { vacancies, parameters, agencies, units, profiles, convocations, users };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sistemp_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    onLog('BACKUP', 'Exportado backup manual do sistema.');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm("Isso substituirá TODOS os dados atuais. Prosseguir?")) {
          onRestoreAll(data);
          onLog('RESTAURAÇÃO', 'Sistema restaurado integralmente a partir de arquivo de backup.');
          alert("Backup restaurado!");
        }
      } catch { alert("Erro ao importar backup."); }
    };
    reader.readAsText(file);
  };

  const [cloudUrl, setCloudUrl] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sistemp_cloud_config') || '{}').url || '';
    } catch { return ''; }
  });
  const [cloudKey, setCloudKey] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sistemp_cloud_config') || '{}').key || '';
    } catch { return ''; }
  });

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200">
        <button onClick={() => setActiveSubTab('params')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'params' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Prazos e Parâmetros</button>
        <button onClick={() => setActiveSubTab('users')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Operadores</button>
        <button onClick={() => setActiveSubTab('backup')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'backup' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Backup e Publicação</button>
        <button onClick={() => setActiveSubTab('cloud')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'cloud' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Nuvem</button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeSubTab === 'params' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 flex items-center"><Terminal size={20} className="mr-3 text-blue-600" /> Prazos e Amparos Legais</h3>
                <button onClick={() => setShowParamModal(true)} className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95">
                    <Plus size={16} /> <span>Novo Prazo</span>
                </button>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                    <tr className="text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
                        <th className="px-4 py-4">Amparo Legal</th>
                        <th className="px-4 py-4">Dias</th>
                        <th className="px-4 py-4 text-right">Ações</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                    {parameters.map(p => (
                        <tr key={p.id}>
                        <td className="px-4 py-4 font-bold text-slate-700">{p.label}</td>
                        <td className="px-4 py-4 text-sm text-slate-500">{p.days} dias</td>
                        <td className="px-4 py-4 text-right">
                            <button onClick={() => { setParameters(parameters.filter(i => i.id !== p.id)); onLog('PARAMETRIZAÇÃO', `Removido amparo legal: ${p.label}.`); }} className="text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center"><Building2 size={20} className="mr-3 text-indigo-600" /> Órgãos Solicitantes</h3>
                        <button onClick={() => setShowAddAgencyModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                            Adicionar
                        </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {agencies.map((agency, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                                <span className={`text-sm font-bold ${agency === DEFAULT_AGENCY ? 'text-indigo-600' : 'text-slate-600'}`}>{agency}</span>
                                {agency !== DEFAULT_AGENCY && (
                                    <button onClick={() => handleRemoveAgency(agency)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center"><MapPin size={20} className="mr-3 text-emerald-600" /> Unidades de Atuação</h3>
                        <button onClick={() => setShowAddUnitModal(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                            Adicionar
                        </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {units.map((unit, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                                <span className={`text-sm font-bold ${unit === DEFAULT_UNIT ? 'text-emerald-600' : 'text-slate-600'}`}>{unit}</span>
                                {unit !== DEFAULT_UNIT && (
                                    <button onClick={() => handleRemoveUnit(unit)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 flex items-center"><UserSquare2 size={20} className="mr-3 text-amber-600" /> Perfis Profissionais</h3>
                    <button onClick={() => setShowAddProfileModal(true)} className="px-4 py-2 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                        Adicionar Perfil
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profiles.map((profile, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                            <span className="text-sm font-bold text-slate-600">{profile}</span>
                            <button onClick={() => handleRemoveProfile(profile)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {activeSubTab === 'users' && (
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 flex items-center"><Users size={20} className="mr-3 text-blue-600" /> Gerenciar Operadores</h3>
              <button onClick={() => setShowUserModal(true)} className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95">
                <UserPlus size={16} /> <span>Novo Operador</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map(u => (
                <div key={u.id} className="p-5 bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-between group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${u.role === UserRole.ADMIN ? 'bg-blue-600 text-white' : u.role === UserRole.HR ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-bold text-slate-800">{u.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-black">@{u.username} • {u.role}</p>
                    </div>
                  </div>
                  <button onClick={() => { setUsers(users.filter(i => i.id !== u.id)); onLog('SISTEMA', `Removido operador: ${u.name}.`); }} className="p-2 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'backup' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-8 flex items-center"><FileJson size={20} className="mr-3 text-blue-600" /> Salvaguarda e Publicação</h3>
              
              <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-[2rem] flex items-start space-x-4">
                 <AlertTriangle className="text-amber-600 shrink-0 mt-1" size={24} />
                 <div className="space-y-2">
                    <h4 className="font-black text-amber-800 text-sm uppercase tracking-tight">Aviso Importante sobre 404 na Vercel</h4>
                    <p className="text-xs text-amber-700 leading-relaxed">
                       Se você está recebendo erro <strong>404 NOT FOUND</strong> na Vercel, certifique-se de que o projeto foi enviado <strong>completo</strong> via GitHub. O sistema não funciona apenas com o <code>index.html</code>; ele precisa dos arquivos <code>.tsx</code> e da pasta <code>components</code> na raiz do repositório.
                    </p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                  <Download size={32} className="text-blue-600" />
                  <h4 className="font-bold text-slate-800">Exportar Dados</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Baixa um arquivo JSON com todas as informações atuais do sistema.</p>
                  <button onClick={exportBackup} className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95">Baixar Dados (JSON)</button>
                </div>
                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                  <FileUp size={32} className="text-indigo-600" />
                  <h4 className="font-bold text-slate-800">Restaurar Dados</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Substitui o banco de dados local por um backup anteriormente exportado.</p>
                  <input type="file" ref={fileInputRef} onChange={handleImportBackup} className="hidden" accept=".json" />
                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95">Selecionar Backup</button>
                </div>
                <div className="p-8 bg-blue-600 rounded-[2rem] border border-blue-500 space-y-4 shadow-xl shadow-blue-500/20">
                  <Globe size={32} className="text-white" />
                  <h4 className="font-bold text-white">Guia de Produção</h4>
                  <p className="text-xs text-blue-100 leading-relaxed">Para evitar erros 404, sincronize este projeto inteiro com o seu GitHub e conecte à Vercel.</p>
                  <a 
                    href="https://vercel.com/new" 
                    target="_blank" 
                    rel="noreferrer"
                    className="block w-full text-center py-3 bg-white text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all active:scale-95"
                  >
                    Ir para Vercel
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'cloud' && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center"><Cloud size={20} className="mr-3 text-indigo-600" /> Conexão Supabase</h3>
                <form onSubmit={(e) => { e.preventDefault(); localStorage.setItem('sistemp_cloud_config', JSON.stringify({url: cloudUrl, key: cloudKey})); if(onCloudConfigChange) onCloudConfigChange(); alert("Configuração salva!"); onLog('NUVEM', 'Alteradas configurações de conexão.'); }} className="space-y-4">
                    <input type="text" value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} placeholder="Supabase Project URL" className="w-full border border-slate-200 rounded-xl p-4 text-sm" />
                    <input type="password" value={cloudKey} onChange={e => setCloudKey(e.target.value)} placeholder="Supabase Anon Key" className="w-full border border-slate-200 rounded-xl p-4 text-sm" />
                    <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Salvar e Conectar</button>
                </form>
            </div>
          </div>
        )}
      </div>

      {/* Modais de Gerenciamento */}
      {showAddAgencyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-slate-100 animate-in zoom-in duration-200">
                <h3 className="text-lg font-black text-slate-800 mb-4">Novo Órgão</h3>
                <form onSubmit={handleAddAgency} className="space-y-4">
                    <input required autoFocus value={newAgencyName} onChange={e => setNewAgencyName(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="Nome do Órgão" />
                    <div className="flex space-x-2">
                        <button type="button" onClick={() => setShowAddAgencyModal(false)} className="flex-1 py-3 text-slate-400 font-bold uppercase text-[10px]">Cancelar</button>
                        <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px]">Adicionar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showAddUnitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-slate-100 animate-in zoom-in duration-200">
                <h3 className="text-lg font-black text-slate-800 mb-4">Nova Unidade</h3>
                <form onSubmit={handleAddUnit} className="space-y-4">
                    <input required autoFocus value={newUnitName} onChange={e => setNewUnitName(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="Nome da Unidade" />
                    <div className="flex space-x-2">
                        <button type="button" onClick={() => setShowAddUnitModal(false)} className="flex-1 py-3 text-slate-400 font-bold uppercase text-[10px]">Cancelar</button>
                        <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px]">Adicionar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showAddProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-slate-100 animate-in zoom-in duration-200">
                <h3 className="text-lg font-black text-slate-800 mb-4">Novo Perfil</h3>
                <form onSubmit={handleAddProfile} className="space-y-4">
                    <input required autoFocus value={newProfileName} onChange={e => setNewProfileName(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="Nome do Perfil" />
                    <div className="flex space-x-2">
                        <button type="button" onClick={() => setShowAddProfileModal(false)} className="flex-1 py-3 text-slate-400 font-bold uppercase text-[10px]">Cancelar</button>
                        <button type="submit" className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-black uppercase text-[10px]">Adicionar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-md w-full p-8 border border-slate-200 animate-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black text-slate-800 flex items-center"><UserPlus size={24} className="mr-3 text-blue-600" /> Novo Operador</h2>
                    <button onClick={() => setShowUserModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                </div>
                <form onSubmit={handleSaveUser} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nome Completo</label>
                        <div className="relative">
                            <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input required type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" placeholder="Ex: João da Silva" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Login</label>
                            <input required type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600" placeholder="joao.silva" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Senha</label>
                            <div className="relative">
                                <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Perfil de Acesso</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button type="button" onClick={() => setNewUser({...newUser, role: UserRole.CONSULTANT})} className={`py-3 rounded-2xl text-[9px] font-black uppercase tracking-tighter border transition-all ${newUser.role === UserRole.CONSULTANT ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>Consulta</button>
                            <button type="button" onClick={() => setNewUser({...newUser, role: UserRole.HR})} className={`py-3 rounded-2xl text-[9px] font-black uppercase tracking-tighter border transition-all ${newUser.role === UserRole.HR ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-100'}`}><div className="flex items-center justify-center"><Briefcase size={10} className="mr-1" /> RH</div></button>
                            <button type="button" onClick={() => setNewUser({...newUser, role: UserRole.ADMIN})} className={`py-3 rounded-2xl text-[9px] font-black uppercase tracking-tighter border transition-all ${newUser.role === UserRole.ADMIN ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-400 border-slate-100'}`}><div className="flex items-center justify-center"><Shield size={10} className="mr-1" /> Admin</div></button>
                        </div>
                    </div>
                    <div className="flex space-x-3 pt-4">
                        <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-xs rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Salvar Operador</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showParamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-sm w-full p-8 border border-slate-200 animate-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black text-slate-800 flex items-center"><Terminal size={24} className="mr-3 text-blue-600" /> Prazo Legal</h2>
                    <button onClick={() => setShowParamModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                </div>
                <form onSubmit={handleSaveParam} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Descrição / Artigo</label>
                        <input required type="text" value={newParam.label} onChange={e => setNewParam({...newParam, label: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" placeholder="Ex: Art 2º, IV" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Duração Máxima (Dias)</label>
                        <div className="relative">
                            <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input required type="number" value={newParam.days} onChange={e => setNewParam({...newParam, days: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" placeholder="Ex: 730" />
                        </div>
                    </div>
                    <div className="flex space-x-3 pt-4">
                        <button type="button" onClick={() => setShowParamModal(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-xs rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Gravar</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
