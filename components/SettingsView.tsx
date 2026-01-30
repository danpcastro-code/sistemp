
import React, { useState, useRef } from 'react';
import { LegalParameter, User, Vacancy, ConvokedPerson, UserRole } from '../types';
import { 
  Plus, Trash2, Terminal, Users, FileJson, Download, 
  Cloud, FileUp, Building2, MapPin, BriefcaseIcon, Wifi, X, UserPlus, Settings2
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
  onLog
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'params' | 'users' | 'backup' | 'cloud'>('params');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showParamModal, setShowParamModal] = useState(false);
  const [showAddAgencyModal, setShowAddAgencyModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  const [newParam, setNewParam] = useState({ label: '', days: '' });
  const [newAgencyName, setNewAgencyName] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [newProfileName, setNewProfileName] = useState('');
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: UserRole.CONSULTANT });

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

  const handleAddAgency = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAgencyName.trim()) {
      setAgencies([...agencies, newAgencyName.trim()]);
      onLog('PARAMETRIZAÇÃO', `Adicionado órgão: ${newAgencyName.trim()}`);
      setNewAgencyName('');
      setShowAddAgencyModal(false);
    }
  };

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUnitName.trim()) {
      setUnits([...units, newUnitName.trim()]);
      onLog('PARAMETRIZAÇÃO', `Adicionada unidade: ${newUnitName.trim()}`);
      setNewUnitName('');
      setShowAddUnitModal(false);
    }
  };

  const handleAddProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProfileName.trim()) {
      setProfiles([...profiles, newProfileName.trim()]);
      onLog('PARAMETRIZAÇÃO', `Adicionado perfil profissional: ${newProfileName.trim()}`);
      setNewProfileName('');
      setShowAddProfileModal(false);
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
        <button onClick={() => setActiveSubTab('backup')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'backup' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Backup</button>
        <button onClick={() => setActiveSubTab('cloud')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'cloud' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Conexão</button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeSubTab === 'params' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Perfis Profissionais (Tabela) */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-slate-800 flex items-center uppercase text-sm tracking-tight"><BriefcaseIcon size={20} className="mr-3 text-blue-600" /> Perfis Profissionais</h3>
                        <button onClick={() => setShowAddProfileModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Novo Perfil</button>
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

                {/* Prazos Legais */}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Órgãos Solicitantes */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-slate-800 flex items-center uppercase text-sm tracking-tight"><Building2 size={20} className="mr-3 text-indigo-600" /> Órgãos Solicitantes</h3>
                        <button onClick={() => setShowAddAgencyModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Adicionar</button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {agencies.map((agency, idx) => (
                            <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group">
                                <span className={`text-[10px] font-bold ${agency === DEFAULT_AGENCY ? 'text-indigo-600' : 'text-slate-600'}`}>{agency}</span>
                                {agency !== DEFAULT_AGENCY && (
                                    <button onClick={() => setAgencies(agencies.filter(a => a !== agency))} className="text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Unidades */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-slate-800 flex items-center uppercase text-sm tracking-tight"><MapPin size={20} className="mr-3 text-amber-600" /> Unidades Administrativas</h3>
                        <button onClick={() => setShowAddUnitModal(true)} className="px-4 py-2 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Adicionar</button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {units.map((unit, idx) => (
                            <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group">
                                <span className={`text-[10px] font-bold ${unit === DEFAULT_UNIT ? 'text-amber-600' : 'text-slate-600'}`}>{unit}</span>
                                {unit !== DEFAULT_UNIT && (
                                    <button onClick={() => setUnits(units.filter(u => u !== unit))} className="text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                )}
                            </div>
                        ))}
                    </div>
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
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 flex flex-col items-center justify-center py-24 text-center animate-in zoom-in duration-500">
             <div className="p-10 bg-indigo-50 rounded-full border-8 border-indigo-100 mb-8 relative">
                <Wifi size={64} className="text-indigo-600" />
                <div className="absolute inset-0 border-4 border-indigo-200 rounded-full animate-ping opacity-20"></div>
             </div>
             <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Conexão Automatizada Ativa</h3>
             <p className="text-sm text-slate-500 mt-2 max-w-md font-medium leading-relaxed">
                As credenciais do Supabase estão configuradas permanentemente. O SisTemp sincroniza suas alterações em milissegundos com o servidor central.
             </p>
             <div className="mt-10 flex items-center space-x-4 bg-slate-900 px-10 py-5 rounded-[2.5rem] text-white shadow-2xl">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_12px_#22c55e]"></div>
                <span className="text-xs font-black uppercase tracking-[0.25em]">Cluster Oficial Conectado</span>
             </div>
          </div>
        )}
      </div>

      {/* MODAIS DE APOIO */}
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

      {showAddProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-slate-200 animate-in zoom-in duration-200 relative">
                <button onClick={() => setShowAddProfileModal(false)} className="absolute top-4 right-4 text-slate-400"><X size={20}/></button>
                <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Novo Perfil Profissional</h2>
                <form onSubmit={handleAddProfile} className="space-y-4">
                    <input required autoFocus value={newProfileName} onChange={e => setNewProfileName(e.target.value)} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-blue-500/10" placeholder="Ex: Administrador" />
                    <div className="flex space-x-3 pt-4">
                        <button type="button" onClick={() => setShowAddProfileModal(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Adicionar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showAddAgencyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-slate-200 animate-in zoom-in duration-200 relative">
                <button onClick={() => setShowAddAgencyModal(false)} className="absolute top-4 right-4 text-slate-400"><X size={20}/></button>
                <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Novo Órgão</h2>
                <form onSubmit={handleAddAgency} className="space-y-4">
                    <input required autoFocus value={newAgencyName} onChange={e => setNewAgencyName(e.target.value)} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-indigo-500/10" placeholder="Nome do Órgão" />
                    <div className="flex space-x-3 pt-4">
                        <button type="button" onClick={() => setShowAddAgencyModal(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Gravar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showAddUnitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-slate-200 animate-in zoom-in duration-200 relative">
                <button onClick={() => setShowAddUnitModal(false)} className="absolute top-4 right-4 text-slate-400"><X size={20}/></button>
                <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Nova Unidade</h2>
                <form onSubmit={handleAddUnit} className="space-y-4">
                    <input required autoFocus value={newUnitName} onChange={e => setNewUnitName(e.target.value)} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-amber-500/10" placeholder="Nome da Unidade" />
                    <div className="flex space-x-3 pt-4">
                        <button type="button" onClick={() => setShowAddUnitModal(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-amber-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Gravar</button>
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
                    <input required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-blue-500/10" placeholder="Nome Completo" />
                    <input required value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-blue-500/10" placeholder="Username" />
                    <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-blue-500/10" placeholder="Senha" />
                    <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold">
                        <option value={UserRole.CONSULTANT}>CONSULTA</option>
                        <option value={UserRole.HR}>GESTOR RH</option>
                        <option value={UserRole.ADMIN}>ADMINISTRADOR</option>
                    </select>
                    <div className="flex space-x-3 pt-4">
                        <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Criar</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
