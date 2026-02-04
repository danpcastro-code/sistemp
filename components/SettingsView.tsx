
import React, { useState, useMemo } from 'react';
import { LegalParameter, User, Vacancy, ConvokedPerson, UserRole, EmailConfig, PSS, GenericParameter } from '../types';
import { 
  Plus, Trash2, Building2, MapPin, X, UserPlus, Mail, Clock, Briefcase, Activity, Users, Save, ShieldAlert, Lock, Info, EyeOff, Eye, Scale, Gavel
} from 'lucide-react';
import { generateId } from '../utils';

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
  const [showParamModal, setShowParamModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  
  const [newParam, setNewParam] = useState<Partial<LegalParameter>>({ 
    label: '', 
    days: 0, 
    type: 'administrative', 
    lawRef: '', 
    articleRef: '', 
    legalText: '',
    status: 'active'
  });

  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: UserRole.CONSULTANT });

  const handleToggleParamStatus = (p: LegalParameter) => {
    const newStatus = p.status === 'active' ? 'inactive' : 'active';
    const actionLabel = newStatus === 'active' ? 'Reativado' : 'Inativado';
    
    if (window.confirm(`Deseja alterar o status do parâmetro "${p.label}" para ${actionLabel.toUpperCase()}?`)) {
      setParameters(prev => prev.map(item => item.id === p.id ? { ...item, status: newStatus } : item));
      onLog('PARAMETRIZAÇÃO', `Prazo ${actionLabel.toLowerCase()}: ${p.label}`);
    }
  };

  const handleToggleItemStatus = (item: GenericParameter, setter: React.Dispatch<React.SetStateAction<GenericParameter[]>>, type: string) => {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    const actionLabel = newStatus === 'active' ? 'Reativado' : 'Inativado';
    
    setter(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
    onLog('PARAMETRIZAÇÃO', `${type.toUpperCase()} ${actionLabel.toLowerCase()}: ${item.name}`);
  };

  const handleClearList = (setter: React.Dispatch<React.SetStateAction<GenericParameter[]>>, type: string) => {
    if (window.confirm(`Tem certeza que deseja LIMPAR TODOS os registros de ${type}? Esta ação não pode ser desfeita.`)) {
      setter([]);
      onLog('PARAMETRIZAÇÃO', `Lista de ${type} foi totalmente limpa.`);
    }
  };

  // Funções de adição que inserem no TOPO (primeiro campo)
  const addItemToTop = (name: string, setter: React.Dispatch<React.SetStateAction<GenericParameter[]>>) => {
    const cleanedName = name.trim();
    if (!cleanedName) return;
    setter(prev => [{ id: generateId(), name: cleanedName, status: 'active' }, ...prev]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200">
        <button onClick={() => setActiveSubTab('params')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'params' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Prazos e Perfis</button>
        <button onClick={() => setActiveSubTab('users')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Operadores</button>
        <button onClick={() => setActiveSubTab('email')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'email' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Notificações</button>
        <button onClick={() => setActiveSubTab('cloud')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'cloud' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}>Conexão e Nuvem</button>
      </div>

      {activeSubTab === 'params' && (
        <div className="space-y-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center"><Scale className="mr-3 text-blue-600" size={20}/> Amparos legais</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">Prazos e fundamentações normativas.</p>
              </div>
              <button onClick={() => setShowParamModal(true)} className="px-5 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">+ Novo Amparo</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {parameters.map((p) => (
                <div key={p.id} className={`p-6 rounded-3xl border transition-all group relative ${p.status === 'inactive' ? 'opacity-50 grayscale bg-slate-100' : p.type === 'legal' ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 shadow-sm hover:border-blue-200'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${p.type === 'legal' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {p.type === 'legal' ? '⚖️ Norma Legal' : '⚙️ Adm'}
                        </span>
                        {p.status === 'inactive' && <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase border bg-red-50 text-red-600 border-red-100">Inativo</span>}
                    </div>
                    <button onClick={() => handleToggleParamStatus(p)} className={`p-2 rounded-lg transition-all ${p.status === 'active' ? 'text-slate-300 hover:text-amber-600 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50'}`}>
                      {p.status === 'active' ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                  <p className="font-black text-slate-800 text-sm leading-tight">{p.label}</p>
                  <p className="text-xl font-black text-blue-600 mt-1">{p.days} <span className="text-[10px] uppercase">Dias Máximos</span></p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ListManager 
              title="Órgãos" items={agencies} icon={<Building2 size={18}/>}
              onAdd={(name) => addItemToTop(name, setAgencies)}
              onToggleStatus={(item) => handleToggleItemStatus(item, setAgencies, 'orgao')}
              onClear={() => handleClearList(setAgencies, 'Órgãos')}
            />
            <ListManager 
              title="Unidades" items={units} icon={<MapPin size={18}/>}
              onAdd={(name) => addItemToTop(name, setUnits)}
              onToggleStatus={(item) => handleToggleItemStatus(item, setUnits, 'unidade')}
              onClear={() => handleClearList(setUnits, 'Unidades')}
            />
            <ListManager 
              title="Perfis" items={profiles} icon={<Briefcase size={18}/>}
              onAdd={(name) => addItemToTop(name, setProfiles)}
              onToggleStatus={(item) => handleToggleItemStatus(item, setProfiles, 'perfil')}
              onClear={() => handleClearList(setProfiles, 'Perfis')}
            />
          </div>
        </div>
      )}

      {showParamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-xl w-full p-12 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-8">Nova Parametrização</h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                setParameters(prev => [{ id: generateId(), ...newParam, status: 'active' } as LegalParameter, ...prev]);
                setShowParamModal(false);
            }} className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex gap-6">
                 <label className="flex items-center cursor-pointer">
                    <input type="radio" checked={newParam.type === 'legal'} onChange={() => setNewParam({...newParam, type: 'legal'})} className="mr-2" />
                    <span className="text-xs font-black uppercase text-slate-700">⚖️ Prazo Legal</span>
                 </label>
                 <label className="flex items-center cursor-pointer">
                    <input type="radio" checked={newParam.type === 'administrative'} onChange={() => setNewParam({...newParam, type: 'administrative'})} className="mr-2" />
                    <span className="text-xs font-black uppercase text-slate-700">⚙️ Administrativo</span>
                 </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input value={newParam.label} onChange={e => setNewParam({...newParam, label: e.target.value})} required className="w-full border border-slate-200 rounded-2xl p-4 font-bold bg-slate-50" placeholder="Rótulo" />
                <input type="number" value={newParam.days || ''} onChange={e => setNewParam({...newParam, days: parseInt(e.target.value)})} required className="w-full border border-slate-200 rounded-2xl p-4 font-bold bg-slate-50" placeholder="Dias" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowParamModal(false)} className="px-6 py-4 font-bold text-slate-400">CANCELAR</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black rounded-2xl">SALVAR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeSubTab === 'users' && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Operadores</h3>
                <button onClick={() => setShowUserModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md">+ Novo Operador</button>
            </div>
            <div className="space-y-4">
                {users.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs uppercase">{u.name.substring(0,2)}</div>
                            <div>
                                <p className="text-xs font-black text-slate-800">{u.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.role}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <span className="text-[9px] font-black text-slate-500 uppercase">@{u.username}</span>
                            {u.username !== 'admin' && <button onClick={() => setUsers(prev => prev.filter(us => us.id !== u.id))} className="text-slate-300 hover:text-red-600 p-2"><Trash2 size={18}/></button>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {activeSubTab === 'email' && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center mb-8"><Mail className="mr-2 text-indigo-600" size={18}/> Notificações</h3>
          <div className="space-y-6 max-w-3xl">
              <input value={emailConfig.sender} onChange={e => setEmailConfig({...emailConfig, sender: e.target.value})} className="w-full border border-slate-200 rounded-2xl p-4 font-bold bg-slate-50" placeholder="Remetente" />
              <textarea rows={6} value={emailConfig.template} onChange={e => setEmailConfig({...emailConfig, template: e.target.value})} className="w-full border border-slate-200 rounded-2xl p-5 text-sm font-medium bg-slate-50 outline-none resize-none" placeholder="Template" />
          </div>
        </div>
      )}

      {activeSubTab === 'cloud' && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center mb-6"><Activity className="mr-2 text-indigo-600" size={18}/> Sincronização</h3>
            <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                <p className="text-xs font-black text-slate-800 uppercase">{cloudStatus === 'connected' ? 'CONECTADO' : 'OPERANDO LOCAL'}</p>
                <div className={`w-4 h-4 rounded-full ${cloudStatus === 'connected' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
            </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-10 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tighter">Novo Operador</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              setUsers(prev => [{ id: generateId(), ...newUser } as User, ...prev]);
              setShowUserModal(false);
              setNewUser({ name: '', username: '', password: '', role: UserRole.CONSULTANT });
            }} className="space-y-4">
              <input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required className="w-full border border-slate-200 rounded-2xl p-4 font-bold bg-slate-50" placeholder="Nome" />
              <input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value.toLowerCase()})} required className="w-full border border-slate-200 rounded-2xl p-4 font-bold bg-slate-50" placeholder="Usuário" />
              <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required className="w-full border border-slate-200 rounded-2xl p-4 font-bold bg-slate-50" placeholder="Senha" />
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full border border-slate-200 rounded-2xl p-4 font-bold bg-slate-50">
                <option value={UserRole.ADMIN}>Administrador</option>
                <option value={UserRole.HR}>Gestor RH</option>
                <option value={UserRole.CONSULTANT}>Consulta</option>
              </select>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-6 py-4 font-bold text-slate-400">CANCELAR</button>
                <button type="submit" className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl">CRIAR</button>
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
    items: GenericParameter[];
    onAdd: (name: string) => void;
    onToggleStatus: (item: GenericParameter) => void;
    onClear?: () => void;
    icon: React.ReactNode;
}

const ListManager: React.FC<ListManagerProps> = ({ title, items = [], onAdd, onToggleStatus, onClear, icon }) => {
  const [inputValue, setInputValue] = useState('');
  
  // Exibimos os itens conforme a ordem do array (que agora tem o mais novo no topo)
  // Filtramos nomes vazios para evitar "campos em branco"
  const displayItems = useMemo(() => items.filter(i => i.name && i.name.trim() !== ""), [items]);

  return (
    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-full">
        <div className="flex justify-between items-center mb-6">
            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center">{icon} <span className="ml-2">{title}</span></h4>
            {onClear && items.length > 0 && (
                <button onClick={onClear} className="text-[9px] font-black text-red-500 uppercase hover:underline">Limpar Tudo</button>
            )}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (inputValue.trim()) { onAdd(inputValue.trim()); setInputValue(''); } }} className="flex space-x-2 mb-6">
            <input value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Adicionar..." className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
            <button type="submit" className="p-3 bg-slate-900 text-white rounded-xl active:scale-90 transition-all shadow-lg"><Plus size={16}/></button>
        </form>
        <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 custom-scrollbar">
            {displayItems.map((item) => (
                <div key={item.id} className={`p-4 rounded-2xl flex justify-between items-center border ${item.status === 'inactive' ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <span className={`text-xs font-bold ${item.status === 'inactive' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.name}</span>
                    <button type="button" onClick={() => onToggleStatus(item)} className={`p-2 rounded-lg ${item.status === 'active' ? 'text-slate-300 hover:text-amber-600' : 'text-green-400 hover:text-green-600'}`}>
                        {item.status === 'active' ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                </div>
            ))}
            {displayItems.length === 0 && (
              <p className="text-[10px] text-slate-300 font-black uppercase text-center py-10 tracking-widest">Nenhum registro</p>
            )}
        </div>
    </div>
  );
};

export default SettingsView;
