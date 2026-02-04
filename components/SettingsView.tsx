
import React, { useState, useMemo } from 'react';
import { LegalParameter, User, Vacancy, ConvokedPerson, UserRole, EmailConfig, PSS, GenericParameter } from '../types';
import { 
  Plus, Trash2, Building2, MapPin, X, UserPlus, Mail, Clock, Briefcase, Activity, Users, Save, ShieldAlert, Lock, Info, EyeOff, Eye, Scale, Gavel, Database, Copy, Check, Terminal
} from 'lucide-react';
import { generateId, normalizeString } from '../utils';

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
  cloudStatus?: 'idle' | 'syncing' | 'error' | 'connected' | 'setup_required';
  cloudErrorMessage?: string | null;
  onLog: (action: string, details: string) => void;
  emailConfig: EmailConfig;
  setEmailConfig: (e: EmailConfig) => void;
}

// Fix: Implemented ListManager component to manage generic parameter lists
interface ListManagerProps {
  title: string;
  subtitle: string;
  items: GenericParameter[];
  onAdd: (name: string) => void;
  onAction: (item: GenericParameter) => void;
  onToggleStatus: (item: GenericParameter) => void;
  icon: React.ReactNode;
}

const ListManager: React.FC<ListManagerProps> = ({ title, subtitle, items, onAdd, onAction, onToggleStatus, icon }) => {
  const [inputValue, setInputValue] = useState('');
  
  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim());
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
        <input 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Novo item..."
          className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-blue-500 transition-all"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95">
          <Plus size={18}/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {items.map((item) => (
          <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${item.status === 'inactive' ? 'bg-slate-50 opacity-60 border-transparent' : 'bg-white border-slate-100'}`}>
            <span className={`text-[10px] font-bold uppercase truncate max-w-[120px] ${item.status === 'inactive' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
              {item.name}
            </span>
            <div className="flex items-center">
              <button 
                onClick={() => onToggleStatus(item)}
                className={`p-1.5 rounded-lg transition-colors mr-1 ${item.status === 'inactive' ? 'text-slate-300 hover:text-blue-500' : 'text-blue-500 hover:bg-blue-50'}`}
                title={item.status === 'active' ? 'Ocultar item' : 'Mostrar item'}
              >
                {item.status === 'inactive' ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
              <button 
                onClick={() => onAction(item)}
                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Excluir/Inativar"
              >
                <Trash2 size={14}/>
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
            <Database size={32} className="mb-2"/>
            <p className="text-[8px] font-black uppercase">Vazio</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SettingsView: React.FC<SettingsViewProps> = ({ 
  parameters = [], setParameters, 
  agencies = [], setAgencies,
  units = [], setUnits,
  profiles = [], setProfiles,
  users = [], setUsers, 
  vacancies = [],
  convocations = [],
  pssList = [],
  onLog,
  cloudStatus,
  cloudErrorMessage,
  emailConfig,
  setEmailConfig
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'params' | 'users' | 'email' | 'cloud'>('params');
  const [showParamModal, setShowParamModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [copied, setCopied] = useState(false);
  
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

  const REPAIR_SQL = `-- REPARO COMPLETO SISTEMP (COPIE TUDO)
-- 1. Cria ou Atualiza a Tabela
CREATE TABLE IF NOT EXISTS sistemp_data (
    id bigint PRIMARY KEY,
    vacancies jsonb DEFAULT '[]'::jsonb,
    parameters jsonb DEFAULT '[]'::jsonb,
    convocations jsonb DEFAULT '[]'::jsonb,
    pss_list jsonb DEFAULT '[]'::jsonb, 
    users jsonb DEFAULT '[]'::jsonb,
    agencies jsonb DEFAULT '[]'::jsonb,
    units jsonb DEFAULT '[]'::jsonb,
    profiles jsonb DEFAULT '[]'::jsonb,
    email_config jsonb DEFAULT '{}'::jsonb,
    logs jsonb DEFAULT '[]'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Garante colunas novas
ALTER TABLE sistemp_data ADD COLUMN IF NOT EXISTS pss_list jsonb DEFAULT '[]'::jsonb;
ALTER TABLE sistemp_data ADD COLUMN IF NOT EXISTS agencies jsonb DEFAULT '[]'::jsonb;
ALTER TABLE sistemp_data ADD COLUMN IF NOT EXISTS units jsonb DEFAULT '[]'::jsonb;
ALTER TABLE sistemp_data ADD COLUMN IF NOT EXISTS profiles jsonb DEFAULT '[]'::jsonb;

-- 3. Libera permissões de rede (Grants)
GRANT ALL ON TABLE sistemp_data TO anon;
GRANT ALL ON TABLE sistemp_data TO authenticated;
GRANT ALL ON TABLE sistemp_data TO service_role;

-- 4. Desativa segurança RLS (Essencial para chaves anon)
ALTER TABLE sistemp_data DISABLE ROW LEVEL SECURITY;

-- 5. Garante registro mestre
INSERT INTO sistemp_data (id) VALUES (1) ON CONFLICT (id) DO NOTHING;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(REPAIR_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const checkDependencies = (itemName: string, type: 'agency' | 'unit' | 'profile' | 'param'): boolean => {
    if (!itemName) return false;
    const normName = normalizeString(itemName);
    if (type === 'agency') return vacancies.some(v => normalizeString(v.agency) === normName);
    if (type === 'unit') return vacancies.some(v => normalizeString(v.unit) === normName);
    if (type === 'profile') {
      const inV = vacancies.some(v => normalizeString(v.type) === normName);
      const inC = convocations.some(c => normalizeString(c.profile) === normName);
      const inP = pssList.some(p => p.candidates.some(c => normalizeString(c.profile || "") === normName));
      return inV || inC || inP;
    }
    if (type === 'param') return vacancies.some(v => normalizeString(v.legalBase) === normName);
    return false;
  };

  const handleItemAction = (
    item: GenericParameter, 
    setter: React.Dispatch<React.SetStateAction<GenericParameter[]>>, 
    type: 'agency' | 'unit' | 'profile'
  ) => {
    if (!item || !item.name) return;
    const hasDeps = checkDependencies(item.name, type);

    if (hasDeps) {
      if (window.confirm(`⚠️ REGISTRO COM HISTÓRICO\n\n"${item.name}" possui vínculos ativos. Deseja INATIVAR este item?`)) {
        setter(prev => prev.map(i => i.id === item.id ? { ...i, status: 'inactive' } : i));
        onLog('PARAMETRIZAÇÃO', `${type.toUpperCase()} inativado: ${item.name}`);
      }
    } else {
      if (window.confirm(`❓ EXCLUSÃO PERMITIDA\n\nDeseja excluir permanentemente "${item.name}"?`)) {
        setter(prev => prev.filter(i => i.id !== item.id));
        onLog('PARAMETRIZAÇÃO', `${type.toUpperCase()} excluído: ${item.name}`);
      }
    }
  };

  const handleToggleStatus = (item: GenericParameter, setter: React.Dispatch<React.SetStateAction<GenericParameter[]>>) => {
    if (!item) return;
    setter(prev => prev.map(i => i.id === item.id ? { ...i, status: i.status === 'active' ? 'inactive' : 'active' } : i));
  };

  const validParameters = useMemo(() => 
    parameters.filter(p => p && p.label && p.label.trim() !== "").reverse()
  , [parameters]);

  const handleAddParam = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: LegalParameter = {
        ...newParam as LegalParameter,
        id: generateId(),
    };
    setParameters(prev => [...prev, newEntry]);
    setShowParamModal(false);
    onLog('CONFIGURAÇÃO', `Novo Amparo Legal cadastrado: ${newEntry.label}`);
    setNewParam({ label: '', days: 0, type: 'administrative', lawRef: '', articleRef: '', legalText: '', status: 'active' });
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const newUserEntry: User = {
        ...newUser,
        id: generateId(),
    };
    setUsers(prev => [...prev, newUserEntry]);
    setShowUserModal(false);
    onLog('USUÁRIOS', `Novo operador cadastrado: ${newUserEntry.username}`);
    setNewUser({ name: '', username: '', password: '', role: UserRole.CONSULTANT });
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
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center"><Scale className="mr-3 text-blue-600" size={20}/> Amparos legais – prazos máximos definidos em lei</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">Esses prazos decorrem de dispositivos legais e limitam as parametrizações operacionais do sistema.</p>
              </div>
              <button onClick={() => setShowParamModal(true)} className="px-5 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-lg">+ Novo Amparo/Prazo</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {validParameters.map((p) => (
                <div key={p.id} className={`p-6 rounded-3xl border transition-all group relative ${p.type === 'legal' ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 shadow-sm hover:border-blue-200'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${p.type === 'legal' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {p.type === 'legal' ? '⚖️ Norma Legal' : '⚙️ Adm'}
                    </span>
                    <div className="flex space-x-1">
                      {p.type === 'legal' ? (
                        <div className="p-2 text-slate-300" title="Prazos legais não podem ser excluídos."><Lock size={16}/></div>
                      ) : (
                        <button 
                          onClick={() => {
                             if (checkDependencies(p.label, 'param')) {
                               alert("Bloqueio Normativo: Este prazo possui vínculos ativos e não pode ser removido.");
                             } else if (confirm(`Deseja remover o prazo administrativo "${p.label}"?`)) {
                               setParameters(prev => prev.filter(item => item.id !== p.id));
                             }
                          }}
                          className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16}/>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <p className="font-black text-slate-800 text-sm leading-tight">{p.label}</p>
                  <p className="text-xl font-black text-blue-600 mt-1">{p.days} <span className="text-[10px] uppercase">Dias Máximos</span></p>
                  
                  {p.type === 'legal' && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-[9px] font-black text-slate-400 uppercase flex items-center"><Gavel size={10} className="mr-1"/> Fundamentação:</p>
                        <p className="text-[10px] font-bold text-slate-600 mt-1 italic">"{p.legalText || 'Texto normativo não cadastrado.'}"</p>
                        <div className="mt-2 flex space-x-2">
                           <span className="text-[8px] font-black text-blue-500 uppercase">{p.lawRef}</span>
                           <span className="text-[8px] font-black text-slate-400 uppercase">•</span>
                           <span className="text-[8px] font-black text-blue-500 uppercase">{p.articleRef}</span>
                        </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ListManager 
              title="Órgãos solicitantes" 
              subtitle="Define quais órgãos podem iniciar demandas."
              items={agencies} 
              onAdd={(name) => setAgencies(prev => [{ id: generateId(), name, status: 'active' }, ...prev])}
              onAction={(item) => handleItemAction(item, setAgencies, 'agency')}
              onToggleStatus={(item) => handleToggleStatus(item, setAgencies)}
              icon={<Building2 size={18}/>} 
            />
            <ListManager 
              title="Unidades / setores" 
              subtitle="Utilizadas para roteamento interno."
              items={units} 
              onAdd={(name) => setUnits(prev => [{ id: generateId(), name, status: 'active' }, ...prev])}
              onAction={(item) => handleItemAction(item, setUnits, 'unit')}
              onToggleStatus={(item) => handleToggleStatus(item, setUnits)}
              icon={<MapPin size={18}/>} 
            />
            <ListManager 
              title="Perfis profissionais" 
              subtitle="Controlam prazos por atividade."
              items={profiles} 
              onAdd={(name) => setProfiles(prev => [{ id: generateId(), name, status: 'active' }, ...prev])}
              onAction={(item) => handleItemAction(item, setProfiles, 'profile')}
              onToggleStatus={(item) => handleToggleStatus(item, setProfiles)}
              icon={<Briefcase size={18}/>} 
            />
          </div>
        </div>
      )}

      {activeSubTab === 'users' && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center"><Users className="mr-2 text-blue-600" size={18}/> Operadores do Sistema</h3>
                <button onClick={() => setShowUserModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-md transition-all">+ Novo Operador</button>
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
                            <span className="text-[9px] font-black text-slate-500 uppercase bg-white border border-slate-200 px-2 py-1 rounded-lg">@{u.username}</span>
                            {u.username !== 'admin' && (
                                <button onClick={() => setUsers(prev => prev.filter(us => us.id !== u.id))} className="text-slate-300 hover:text-red-600 transition-colors p-3 cursor-pointer"><Trash2 size={18}/></button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {activeSubTab === 'email' && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in fade-in">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center mb-8"><Mail className="mr-2 text-indigo-600" size={18}/> Configuração de Notificações</h3>
          <div className="space-y-6 max-w-3xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Remetente</label>
                  <input value={emailConfig.sender} onChange={e => setEmailConfig({...emailConfig, sender: e.target.value})} className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assunto Padrão</label>
                  <input value={emailConfig.subject} onChange={e => setEmailConfig({...emailConfig, subject: e.target.value})} className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Template da Mensagem</label>
                  <textarea rows={6} value={emailConfig.template} onChange={e => setEmailConfig({...emailConfig, template: e.target.value})} className="w-full border border-slate-200 rounded-2xl p-5 text-sm font-medium bg-slate-50 outline-none resize-none leading-relaxed" />
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Variáveis: {"{nome}, {data_fatal}, {vaga_codigo}"}</p>
              </div>
          </div>
        </div>
      )}

      {activeSubTab === 'cloud' && (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center mb-6"><Activity className="mr-2 text-indigo-600" size={18}/> Estado da Sincronização</h3>
                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-black text-slate-800 uppercase">Comunicação com Servidor</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                            {cloudStatus === 'connected' ? 'Sincronização Ativa (Nuvem)' : cloudStatus === 'syncing' ? 'Transmitindo Dados...' : cloudStatus === 'error' ? 'Falha de Conexão' : cloudStatus === 'setup_required' ? 'Reparo Necessário' : 'Operação Local'}
                        </p>
                    </div>
                    <div className={`w-4 h-4 rounded-full ${cloudStatus === 'connected' ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]' : (cloudStatus === 'error' || cloudStatus === 'setup_required') ? 'bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-slate-300 animate-pulse'}`}></div>
                </div>
            </div>

            {(cloudStatus === 'error' || cloudStatus === 'setup_required') && cloudErrorMessage && (
              <div className="bg-red-900 text-white p-8 rounded-[2.5rem] shadow-2xl border-4 border-red-500/30 animate-in slide-in-from-top-4">
                  <div className="flex items-center space-x-4 mb-4">
                      <Terminal className="text-red-400" size={32}/>
                      <h3 className="text-lg font-black uppercase tracking-tighter">Relatório Técnico do Erro</h3>
                  </div>
                  <div className="bg-black/30 p-5 rounded-2xl font-mono text-[11px] leading-relaxed break-all">
                      {cloudErrorMessage}
                  </div>
                  <div className="mt-6 flex items-start space-x-3">
                      <Info size={16} className="text-red-300 shrink-0 mt-0.5"/>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-200">
                          Geralmente este erro ocorre por falta de permissão na tabela ou colunas inexistentes. Siga o Passo 2 abaixo.
                      </p>
                  </div>
              </div>
            )}

            <div className="bg-white p-10 rounded-[2.5rem] border-2 border-slate-200 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 text-slate-100"><Database size={120} strokeWidth={1}/></div>
                <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-4">
                        <ShieldAlert className="text-blue-600" size={28}/>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Reparo de Banco e Permissões (Passo 2)</h3>
                    </div>
                    <p className="text-sm text-slate-600 font-medium max-w-xl mb-8 leading-relaxed">
                        Copie este script atualizado. Ele agora inclui comandos de <strong>GRANT</strong>, que autorizam o seu navegador a ler e escrever na tabela, mesmo sem login direto no banco.
                    </p>

                    <div className="bg-slate-900 rounded-[1.5rem] p-6 shadow-inner relative group">
                        <button 
                          onClick={handleCopySql}
                          className="absolute top-4 right-4 flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          {copied ? <Check size={14} className="text-green-400"/> : <Copy size={14}/>}
                          <span>{copied ? 'Copiado!' : 'Copiar Script SQL'}</span>
                        </button>
                        <pre className="text-[11px] text-blue-300 font-mono overflow-x-auto custom-scrollbar max-h-[250px] leading-relaxed py-4 pr-8">
                            {REPAIR_SQL}
                        </pre>
                    </div>

                    <div className="mt-8 flex items-start space-x-4 bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <Info className="text-blue-500 shrink-0 mt-1" size={20}/>
                        <div>
                            <p className="text-xs font-black text-blue-700 uppercase mb-1">Como aplicar este reparo:</p>
                            <ul className="text-[11px] text-blue-600 font-bold space-y-1 list-decimal ml-4 uppercase tracking-tighter">
                                <li>Vá no seu painel do Supabase.</li>
                                <li>Clique no menu <strong>SQL Editor</strong> (ícone de terminal à esquerda).</li>
                                <li>Clique no ícone de <strong>"+" (New Query)</strong> à direita das abas abertas.</li>
                                <li>Cole o código copiado e clique no botão azul <strong>RUN</strong> no canto inferior direito.</li>
                                <li>Verifique se apareceu "Success" e recarregue o sistema.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Fix: Added missing modals for parameter and user management */}
      {showParamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-lg w-full p-12 shadow-2xl animate-in zoom-in duration-200 relative">
            <button onClick={() => setShowParamModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <h2 className="text-3xl font-black mb-8 text-slate-800 uppercase tracking-tighter">Novo Amparo/Prazo</h2>
            <form onSubmit={handleAddParam} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rótulo/Identificador</label>
                  <input value={newParam.label} onChange={e => setNewParam({...newParam, label: e.target.value})} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" placeholder="Ex: Art 2, IV" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dias Máximos</label>
                  <input type="number" value={newParam.days} onChange={e => setNewParam({...newParam, days: Number(e.target.value)})} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fundamentação (Texto de Lei)</label>
                <textarea value={newParam.legalText} onChange={e => setNewParam({...newParam, legalText: e.target.value})} className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none resize-none" rows={3} placeholder="Descreva o trecho da lei..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Referência (Lei)</label>
                  <input value={newParam.lawRef} onChange={e => setNewParam({...newParam, lawRef: e.target.value})} className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" placeholder="Lei 8.745/93" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Referência (Artigo)</label>
                  <input value={newParam.articleRef} onChange={e => setNewParam({...newParam, articleRef: e.target.value})} className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" placeholder="Art. 2, IV" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowParamModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">Salvar Parametrização</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-12 shadow-2xl animate-in zoom-in duration-200 relative">
            <button onClick={() => setShowUserModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <h2 className="text-3xl font-black mb-8 text-slate-800 uppercase tracking-tighter">Novo Operador</h2>
            <form onSubmit={handleAddUser} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Login</label>
                  <input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Função/Role</label>
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none">
                    <option value={UserRole.CONSULTANT}>Consulta</option>
                    <option value={UserRole.HR}>Operador RH</option>
                    <option value={UserRole.ADMIN}>Administrador</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha Provisória</label>
                <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">Criar Acesso</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
