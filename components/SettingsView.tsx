
import React, { useState, useRef } from 'react';
import { LegalParameter, User, Vacancy, ConvokedPerson, UserRole } from '../types';
import { 
  Plus, Trash2, Terminal, Users, FileJson, Download, 
  Cloud, Copy, FileUp, UserPlus, Code, X, Shield, Key, User as UserIcon, Calendar, Briefcase, Building2, MapPin, UserSquare2, Globe, AlertTriangle, Wifi
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
      const param: LegalParameter = { id: generateId(), label: newParam.label, days: parseInt(newParam.days), description: "" };
      setParameters([...parameters, param]);
      onLog('PARAMETRIZAÇÃO', `Adicionado: ${newParam.label}`);
      setShowParamModal(false);
      setNewParam({ label: '', days: '' });
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.name && newUser.username && newUser.password) {
      const user: User = { id: generateId(), ...newUser };
      setUsers([...users, user]);
      onLog('SISTEMA', `Criado operador: ${newUser.name}`);
      setShowUserModal(false);
      setNewUser({ name: '', username: '', password: '', role: UserRole.CONSULTANT });
    }
  };

  const handleAddAgency = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAgencyName.trim()) {
      setAgencies([...agencies, newAgencyName.trim()]);
      setNewAgencyName('');
      setShowAddAgencyModal(false);
    }
  };

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUnitName.trim()) {
      setUnits([...units, newUnitName.trim()]);
      setNewUnitName('');
      setShowAddUnitModal(false);
    }
  };

  const handleAddProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProfileName.trim()) {
      setProfiles([...profiles, newProfileName.trim()]);
      setNewProfileName('');
      setShowAddProfileModal(false);
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
    onLog('BACKUP', 'Exportado backup manual.');
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
          onLog('RESTAURAÇÃO', 'Sistema restaurado via backup.');
        }
      } catch { alert("Erro no backup."); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200">
        <button onClick={() => setActiveSubTab('params')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'params' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Prazos</button>
        <button onClick={() => setActiveSubTab('users')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Operadores</button>
        <button onClick={() => setActiveSubTab('backup')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'backup' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Backup</button>
        <button onClick={() => setActiveSubTab('cloud')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'cloud' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Conexão</button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeSubTab === 'params' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 flex items-center"><Terminal size={20} className="mr-3 text-blue-600" /> Prazos Legais</h3>
                <button onClick={() => setShowParamModal(true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all">
                    Novo Prazo
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
                            <button onClick={() => setParameters(parameters.filter(i => i.id !== p.id))} className="text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
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
                        <button onClick={() => setShowAddAgencyModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Adicionar</button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {agencies.map((agency, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                                <span className={`text-sm font-bold ${agency === DEFAULT_AGENCY ? 'text-indigo-600' : 'text-slate-600'}`}>{agency}</span>
                                {agency !== DEFAULT_AGENCY && (
                                    <button onClick={() => setAgencies(agencies.filter(a => a !== agency))} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center"><MapPin size={20} className="mr-3 text-emerald-600" /> Unidades</h3>
                        <button onClick={() => setShowAddUnitModal(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Adicionar</button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {units.map((unit, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                                <span className={`text-sm font-bold ${unit === DEFAULT_UNIT ? 'text-emerald-600' : 'text-slate-600'}`}>{unit}</span>
                                {unit !== DEFAULT_UNIT && (
                                    <button onClick={() => setUnits(units.filter(u => u !== unit))} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        )}

        {activeSubTab === 'cloud' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 flex flex-col items-center justify-center py-20 text-center">
             <div className="p-6 bg-indigo-50 rounded-full border-4 border-indigo-100 mb-6">
                <Wifi size={48} className="text-indigo-600" />
             </div>
             <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Conexão de Sistema Ativa</h3>
             <p className="text-sm text-slate-500 mt-2 max-w-sm">O SisTemp está configurado com o banco de dados oficial (Supabase). Todas as suas alterações são salvas automaticamente na nuvem.</p>
             <div className="mt-8 flex items-center space-x-3 bg-slate-900 px-6 py-3 rounded-2xl text-white shadow-xl">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Servidor Online • Alta Disponibilidade</span>
             </div>
          </div>
        )}

        {activeSubTab === 'backup' && (
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-8 flex items-center"><FileJson size={20} className="mr-3 text-blue-600" /> Exportação de Dados</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                        <Download size={32} className="text-blue-600" />
                        <h4 className="font-bold text-slate-800">Exportar Backup</h4>
                        <p className="text-xs text-slate-500">Baixa um arquivo JSON com todas as informações atuais.</p>
                        <button onClick={exportBackup} className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all">Baixar Agora</button>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                        <FileUp size={32} className="text-indigo-600" />
                        <h4 className="font-bold text-slate-800">Importar Backup</h4>
                        <p className="text-xs text-slate-500">Substitui o banco de dados local por um arquivo externo.</p>
                        <input type="file" ref={fileInputRef} onChange={handleImportBackup} className="hidden" accept=".json" />
                        <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all">Selecionar Arquivo</button>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* MODAIS DE APOIO */}
      {showParamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-sm w-full p-8 border border-slate-200 animate-in zoom-in duration-200">
                <h2 className="text-xl font-black text-slate-800 flex items-center mb-6">Novo Prazo Legal</h2>
                <form onSubmit={handleSaveParam} className="space-y-4">
                    <input required value={newParam.label} onChange={e => setNewParam({...newParam, label: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" placeholder="Ex: Art 2º, IV" />
                    <input required type="number" value={newParam.days} onChange={e => setNewParam({...newParam, days: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" placeholder="Ex: 730" />
                    <div className="flex space-x-3 pt-4">
                        <button type="button" onClick={() => setShowParamModal(false)} className="flex-1 py-4 text-slate-500 font-bold">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-xs rounded-2xl shadow-xl">Gravar</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
