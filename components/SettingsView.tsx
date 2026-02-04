
import React, { useState, useMemo } from 'react';
import { LegalParameter, User, Vacancy, ConvokedPerson, UserRole, EmailConfig, PSS, GenericParameter } from '../types';
import { 
  Plus, Trash2, Building2, MapPin, X, UserPlus, Mail, Clock, Briefcase, Activity, Users, Save, ShieldAlert, Lock, Info, EyeOff, Eye, Scale, Gavel, Database, Copy, Check
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
  // Fix: Added 'setup_required' to the cloudStatus union type to match App state and Layout component.
  cloudStatus?: 'idle' | 'syncing' | 'error' | 'connected' | 'setup_required';
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
  vacancies = [],
  convocations = [],
  pssList = [],
  onLog,
  cloudStatus,
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

  const REPAIR_SQL = `-- REPARO DE BANCO SISTEMP
-- Copie e cole este código no 'SQL Editor' do Supabase e clique em 'Run'

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

-- 2. Adiciona colunas faltantes se a tabela já existia
ALTER TABLE sistemp_data ADD COLUMN IF NOT EXISTS pss_list jsonb DEFAULT '[]'::jsonb;
ALTER TABLE sistemp_data ADD COLUMN IF NOT EXISTS agencies jsonb DEFAULT '[]'::jsonb;
ALTER TABLE sistemp_data ADD COLUMN IF NOT EXISTS units jsonb DEFAULT '[]'::jsonb;
ALTER TABLE sistemp_data ADD COLUMN IF NOT EXISTS profiles jsonb DEFAULT '[]'::jsonb;

-- 3. Libera permissão de gravação total (Desativa RLS)
ALTER TABLE sistemp_data DISABLE ROW LEVEL SECURITY;

-- 4. Cria o registro base id=1
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

            <div className="bg-white p-10 rounded-[2.5rem] border-2 border-red-100 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 text-red-100"><Database size={120} strokeWidth={1}/></div>
                <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-4">
                        <ShieldAlert className="text-red-600" size={28}/>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Reparo de Banco (Passo 2)</h3>
                    </div>
                    <p className="text-sm text-slate-600 font-medium max-w-xl mb-8 leading-relaxed">
                        Se você está recebendo erro ao salvar dados (como novos Editais/PSS), seu banco de dados pode estar desatualizado. 
                        Copie o código abaixo e execute-o no <strong>SQL Editor</strong> do seu painel Supabase.
                    </p>

                    <div className="bg-slate-900 rounded-[1.5rem] p-6 shadow-inner relative group">
                        <button 
                          onClick={handleCopySql}
                          className="absolute top-4 right-4 flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          {copied ? <Check size={14} className="text-green-400"/> : <Copy size={14}/>}
                          <span>{copied ? 'Copiado!' : 'Copiar Script SQL'}</span>
                        </button>
                        <pre className="text-[11px] text-blue-300 font-mono overflow-x-auto custom-scrollbar max-h-[200px] leading-relaxed py-4 pr-8">
                            {REPAIR_SQL}
                        </pre>
                    </div>

                    <div className="mt-8 flex items-start space-x-4 bg-red-50 p-6 rounded-2xl border border-red-100">
                        <Info className="text-red-500 shrink-0 mt-1" size={20}/>
                        <div>
                            <p className="text-xs font-black text-red-700 uppercase mb-1">Instruções Importantes:</p>
                            <ul className="text-[11px] text-red-600 font-bold space-y-1 list-disc ml-4 uppercase tracking-tighter">
                                <li>Isso NÃO apaga seus dados atuais.</li>
                                <li>Isso libera permissão total de gravação.</li>
                                <li>Após rodar o script, clique no botão de sincronizar no topo do sistema.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
      
      {/* MODAL: NOVO PRAZO / AMPARO LEGAL */}
      {showParamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-xl w-full p-12 shadow-2xl border border-slate-100 animate-in zoom-in duration-200 overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">Nova Parametrização</h2>
              <button onClick={() => setShowParamModal(false)} className="text-slate-300 hover:text-slate-800 transition-colors"><X size={24}/></button>
            </div>
            
            <form onSubmit={(e) => {
                e.preventDefault();
                setParameters(prev => [{ id: generateId(), ...newParam, status: 'active' } as LegalParameter, ...prev]);
                setShowParamModal(false);
                onLog('PARAMETRIZAÇÃO', `Novo ${newParam.type === 'legal' ? 'Prazo Legal' : 'Prazo Adm'} criado: ${newParam.label}`);
            }} className="space-y-6">
              
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex gap-6">
                 <label className="flex items-center cursor-pointer">
                    <input type="radio" checked={newParam.type === 'legal'} onChange={() => setNewParam({...newParam, type: 'legal'})} className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="text-xs font-black uppercase text-slate-700 tracking-tighter">⚖️ Prazo Legal</span>
                 </label>
                 <label className="flex items-center cursor-pointer">
                    <input type="radio" checked={newParam.type === 'administrative'} onChange={() => setNewParam({...newParam, type: 'administrative'})} className="w-4 h-4 text-slate-400 mr-2" />
                    <span className="text-xs font-black uppercase text-slate-700 tracking-tighter">⚙️ Administrativo</span>
                 </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rótulo / Identificação</label>
                  <input value={newParam.label} onChange={e => setNewParam({...newParam, label: e.target.value})} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" placeholder="Ex: Art 2º, IV" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dias Máximos</label>
                  <input type="number" value={newParam.days || ''} onChange={e => setNewParam({...newParam, days: parseInt(e.target.value)})} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" placeholder="Qtd de Dias" />
                </div>
              </div>

              {newParam.type === 'legal' && (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lei / Decreto</label>
                      <input value={newParam.lawRef} onChange={e => setNewParam({...newParam, lawRef: e.target.value})} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" placeholder="Ex: Lei 8.745/93" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dispositivo (Art/Inciso)</label>
                      <input value={newParam.articleRef} onChange={e => setNewParam({...newParam, articleRef: e.target.value})} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" placeholder="Ex: Art. 2º, IV" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Texto Normativo Resumido</label>
                    <textarea rows={3} value={newParam.legalText} onChange={e => setNewParam({...newParam, legalText: e.target.value})} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none resize-none" placeholder="Descreva o que a lei diz para este caso..." />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-10">
                <button type="button" onClick={() => setShowParamModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-12 py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl">Salvar Parâmetro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL USUÁRIO */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-10 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tighter">Novo Operador</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              setUsers(prev => [...prev, { id: generateId(), ...newUser } as User]);
              setShowUserModal(false);
              setNewUser({ name: '', username: '', password: '', role: UserRole.CONSULTANT });
              onLog('USUÁRIOS', `Novo usuário: ${newUser.username}`);
            }} className="space-y-4">
              <input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" placeholder="Nome Completo"/>
              <input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value.toLowerCase()})} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" placeholder="Usuário"/>
              <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" placeholder="Senha"/>
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none">
                <option value={UserRole.ADMIN}>Administrador</option>
                <option value={UserRole.HR}>Gestor RH</option>
                <option value={UserRole.CONSULTANT}>Consulta</option>
              </select>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-slate-900 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl">Criar Acesso</button>
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
    subtitle: string;
    items: GenericParameter[];
    onAdd: (name: string) => void;
    onAction: (item: GenericParameter) => void;
    onToggleStatus: (item: GenericParameter) => void;
    icon: React.ReactNode;
}

const ListManager: React.FC<ListManagerProps> = ({ title, subtitle, items = [], onAdd, onAction, onToggleStatus, icon }) => {
  const [inputValue, setInputValue] = useState('');

  const filteredItems = useMemo(() => 
    items.filter(i => i && i.name && i.name.trim() !== "")
  , [items]);

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputValue.trim()) {
      const formatted = inputValue.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      onAdd(formatted);
      setInputValue('');
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-full">
        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center mb-1">{icon} <span className="ml-2">{title}</span></h4>
        <p className="text-[9px] text-slate-400 font-bold mb-6 uppercase tracking-wider leading-relaxed">{subtitle}</p>
        
        <form onSubmit={handleAdd} className="flex space-x-2 mb-6">
            <input 
              value={inputValue} 
              onChange={e => setInputValue(e.target.value)}
              placeholder="Adicionar..."
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            <button type="submit" className="p-3 bg-slate-900 text-white rounded-xl active:scale-90 disabled:opacity-20 transition-all cursor-pointer shadow-lg" disabled={!inputValue.trim()}>
              <Plus size={16}/>
            </button>
        </form>

        <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 custom-scrollbar pr-1">
            {filteredItems.map((item) => (
                <div key={item.id} className={`p-4 rounded-2xl flex justify-between items-center group border transition-all ${item.status === 'inactive' ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm'}`}>
                    <div className="flex flex-col">
                        <span className={`text-xs font-bold truncate mr-2 ${item.status === 'inactive' ? 'text-slate-400 line-through' : 'text-slate-700'}`} title={item.name}>{item.name}</span>
                        {item.status === 'inactive' && <span className="text-[8px] font-black uppercase text-red-400 mt-1">Inativo / Legado</span>}
                    </div>
                    
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          type="button" 
                          onClick={() => onToggleStatus(item)} 
                          className={`p-2 rounded-lg transition-all ${item.status === 'active' ? 'text-slate-300 hover:text-amber-600 hover:bg-amber-50' : 'text-green-400 hover:text-green-600 hover:bg-green-50'}`}
                          title={item.status === 'active' ? "Inativar" : "Ativar"}
                        >
                            {item.status === 'active' ? <EyeOff size={14}/> : <Eye size={14}/>}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => onAction(item)} 
                          className="text-slate-300 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all"
                          title="Remover / Processar"
                        >
                            <Trash2 size={14}/>
                        </button>
                    </div>
                </div>
            ))}
            {filteredItems.length === 0 && <p className="text-[10px] text-slate-300 font-black uppercase text-center py-10 tracking-widest">Nenhum registro</p>}
        </div>
    </div>
  );
};

export default SettingsView;
