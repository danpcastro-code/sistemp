
import React, { useState, useRef } from 'react';
import { LegalParameter, User, Vacancy, ConvokedPerson, UserRole } from '../types';
import { 
  Plus, Trash2, Terminal, Users, FileJson, Download, 
  Cloud, FileUp, Building2, MapPin, BriefcaseIcon, Wifi, X
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

  const [newParam, setNewParam] = useState({ label: '', days: '' });
  const [newAgencyName, setNewAgencyName] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [newProfileName, setNewProfileName] = useState('');

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

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200">
        <button onClick={() => setActiveSubTab('params')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'params' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Prazos e Estrutura</button>
        <button onClick={() => setActiveSubTab('users')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Operadores</button>
        <button onClick={() => setActiveSubTab('backup')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'backup' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Backup</button>
        <button onClick={() => setActiveSubTab('cloud')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'cloud' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Conexão</button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeSubTab === 'params' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Perfis Profissionais (Agora em Tabela) */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center"><BriefcaseIcon size={20} className="mr-3 text-blue-600" /> Perfis Profissionais</h3>
                        <button onClick={() => setShowAddProfileModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Novo Perfil</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
                                    <th className="px-4 py-4">Nome do Perfil</th>
                                    <th className="px-4 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {profiles.map((p, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-4 py-4 font-bold text-slate-700 text-xs">{p}</td>
                                        <td className="px-4 py-4 text-right">
                                            <button onClick={() => setProfiles(profiles.filter(i => i !== p))} className="text-slate-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
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
                        <h3 className="font-bold text-slate-800 flex items-center"><Terminal size={20} className="mr-3 text-emerald-600" /> Amparos Legais</h3>
                        <button onClick={() => setShowParamModal(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Novo Amparo</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
                                    <th className="px-4 py-4">Amparo</th>
                                    <th className="px-4 py-4">Vigência</th>
                                    <th className="px-4 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {parameters.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-4 py-4 font-bold text-slate-700 text-xs">{p.label}</td>
                                        <td className="px-4 py-4 text-xs text-slate-500 font-mono">{p.days} dias</td>
                                        <td className="px-4 py-4 text-right">
                                            <button onClick={() => setParameters(parameters.filter(i => i.id !== p.id))} className="text-slate-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
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
                        <h3 className="font-bold text-slate-800 flex items-center"><Building2 size={20} className="mr-3 text-indigo-600" /> Órgãos Solicitantes</h3>
                        <button onClick={() => setShowAddAgencyModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Adicionar</button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {agencies.map((agency, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group">
                                <span className={`text-[10px] font-bold ${agency === DEFAULT_AGENCY ? 'text-indigo-600' : 'text-slate-600'}`}>{agency}</span>
                                {agency !== DEFAULT_AGENCY && (
                                    <button onClick={() => setAgencies(agencies.filter(a => a !== agency))} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Unidades */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center"><MapPin size={20} className="mr-3 text-amber-600" /> Unidades</h3>
                        <button onClick={() => setShowAddUnitModal(true)} className="px-4 py-2 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Adicionar</button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {units.map((unit, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group">
                                <span className={`text-[10px] font-bold ${unit === DEFAULT_UNIT ? 'text-amber-600' : 'text-slate-600'}`}>{unit}</span>
                                {unit !== DEFAULT_UNIT && (
                                    <button onClick={() => setUnits(units.filter(u => u !== unit))} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        )}

        {activeSubTab === 'cloud' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 flex flex-col items-center justify-center py-24 text-center">
             <div className="p-8 bg-indigo-50 rounded-full border-8 border-indigo-100 mb-8">
                <Wifi size={64} className="text-indigo-600" />
             </div>
             <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Conexão em Tempo Real</h3>
             <p className="text-sm text-slate-500 mt-2 max-w-md font-medium leading-relaxed">
                As credenciais oficiais do Supabase foram injetadas. Sua sessão está autenticada no banco de dados central com alta disponibilidade.
             </p>
             <div className="mt-10 flex items-center space-x-3 bg-slate-900 px-8 py-4 rounded-3xl text-white shadow-2xl">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                <span className="text-xs font-black uppercase tracking-[0.2em]">Servidor Central Online</span>
             </div>
          </div>
        )}
      </div>

      {/* MODAIS DE APOIO */}
      {showParamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-slate-200 animate-in zoom-in duration-200">
                <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Novo Amparo Legal</h2>
                <form onSubmit={handleSaveParam} className="space-y-4">
                    <input required value={newParam.label} onChange={e => setNewParam({...newParam, label: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" placeholder="Identificação (Ex: Art 2º, IV)" />
                    <input required type="number" value={newParam.days} onChange={e => setNewParam({...newParam, days: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" placeholder="Dias de Vigência (Ex: 730)" />
                    <div className="flex space-x-3 pt-4">
                        <button type="button" onClick={() => setShowParamModal(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Gravar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showAddProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-slate-200 animate-in zoom-in duration-200">
                <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Novo Perfil Profissional</h2>
                <form onSubmit={handleAddProfile} className="space-y-4">
                    <input required autoFocus value={newProfileName} onChange={e => setNewProfileName(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" placeholder="Ex: Administrador" />
                    <div className="flex space-x-3 pt-4">
                        <button type="button" onClick={() => setShowAddProfileModal(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Adicionar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showAddAgencyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-slate-200 animate-in zoom-in duration-200">
                <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Novo Órgão</h2>
                <form onSubmit={handleAddAgency} className="space-y-4">
                    <input required autoFocus value={newAgencyName} onChange={e => setNewAgencyName(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" placeholder="Nome do Órgão" />
                    <div className="flex space-x-3 pt-4">
                        <button type="button" onClick={() => setShowAddAgencyModal(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Gravar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showAddUnitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-slate-200 animate-in zoom-in duration-200">
                <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Nova Unidade</h2>
                <form onSubmit={handleAddUnit} className="space-y-4">
                    <input required autoFocus value={newUnitName} onChange={e => setNewUnitName(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" placeholder="Nome da Unidade" />
                    <div className="flex space-x-3 pt-4">
                        <button type="button" onClick={() => setShowAddUnitModal(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-amber-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Gravar</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
