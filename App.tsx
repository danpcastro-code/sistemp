
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from './components/Layout';
import DashboardView from './components/DashboardView';
import VacancyManagement from './components/VacancyManagement';
import ConvocationManagement from './components/ConvocationManagement';
import SettingsView from './components/SettingsView';
import ReportsView from './components/ReportsView';
import LoginView from './components/LoginView';
import AuditView from './components/AuditView';
import { INITIAL_VACANCIES, INITIAL_PARAMETERS, INITIAL_CONVOKED, INITIAL_PSS } from './mockData';
import { Vacancy, LegalParameter, ConvokedPerson, UserRole, User, AuditLog, EmailConfig, PSS, GenericParameter } from './types';
import { createClient } from '@supabase/supabase-js';
import { generateId } from './utils';

// --- CONFIGURAÇÃO SUPABASE ---
const SUPABASE_URL = "https://mwhctqhjulrlisokxdth.supabase.co";
const SUPABASE_KEY = "sb_publishable_YB__7kiH7SCphKh60wXrrw_XqgYwOS0"; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DEFAULT_USERS: User[] = [
  { id: '1', name: 'Administrador Sistema', username: 'admin', password: '123', role: UserRole.ADMIN },
  { id: '2', name: 'Gestor RH', username: 'rh', password: '123', role: UserRole.HR }
];

const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  serviceId: '', templateId: '', publicKey: '',
  sender: 'rh.notificacao@orgao.gov.br',
  subject: 'Aviso de Término de Contrato Temporário',
  template: 'Prezado(a) {nome},\n\nSeu contrato expira em {data_fatal}.'
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'syncing' | 'error' | 'connected' | 'setup_required'>('idle');
  
  const lastUpdateRef = useRef<string | null>(null);
  const isUpdatingFromRemote = useRef(false);
  const isInitialLoadDone = useRef(false);
  const isDirty = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);

  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>(INITIAL_VACANCIES);
  const [parameters, setParameters] = useState<LegalParameter[]>(INITIAL_PARAMETERS);
  
  const [agencies, setAgencies] = useState<GenericParameter[]>([
    { id: 'a1', name: 'Universidade Federal', status: 'active' }
  ]);
  const [units, setUnits] = useState<GenericParameter[]>([
    { id: 'u1', name: 'Departamento de Computação', status: 'active' },
    { id: 'u2', name: 'Departamento de Artes', status: 'active' },
    { id: 'u3', name: 'Sede Administrativa', status: 'active' }
  ]);
  const [profiles, setProfiles] = useState<GenericParameter[]>([
    { id: 'p1', name: 'Professor Visitante', status: 'active' },
    { id: 'p2', name: 'Professor Substituto', status: 'active' },
    { id: 'p3', name: 'Técnico Especializado', status: 'active' }
  ]);

  const [convocations, setConvocations] = useState<ConvokedPerson[]>(INITIAL_CONVOKED);
  const [pssList, setPssList] = useState<PSS[]>(INITIAL_PSS);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(DEFAULT_EMAIL_CONFIG);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const addLog = useCallback((action: string, details: string) => {
    const newLog: AuditLog = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      user: currentUser?.name || 'Sistema',
      action,
      details
    };
    setLogs(prev => [newLog, ...prev].slice(0, 200));
    isDirty.current = true;
  }, [currentUser]);

  const saveToCloud = useCallback(async () => {
    // Só salva se já tentou carregar e se houver mudanças manuais
    if (!isInitialLoadDone.current || isUpdatingFromRemote.current || !isDirty.current) return;
    
    setCloudStatus('syncing');
    const newTime = new Date().toISOString();
    
    try {
      const payload = { 
        id: 1, 
        vacancies: JSON.parse(JSON.stringify(vacancies)),
        parameters: JSON.parse(JSON.stringify(parameters)),
        agencies: JSON.parse(JSON.stringify(agencies)),
        units: JSON.parse(JSON.stringify(units)),
        profiles: JSON.parse(JSON.stringify(profiles)),
        convocations: JSON.parse(JSON.stringify(convocations)),
        pss_list: JSON.parse(JSON.stringify(pssList)),
        users: JSON.parse(JSON.stringify(users)), 
        logs: JSON.parse(JSON.stringify(logs)),
        email_config: JSON.parse(JSON.stringify(emailConfig)),
        updated_at: newTime 
      };

      const { error } = await supabase
        .from('sistemp_data')
        .upsert(payload, { onConflict: 'id' });

      if (!error) {
          lastUpdateRef.current = newTime;
          isDirty.current = false;
          setCloudStatus('connected');
      } else {
          console.error("Erro Supabase:", error);
          if (error.message.includes("relation") || error.message.includes("does not exist")) {
            setCloudStatus('setup_required');
          } else {
            setCloudStatus('error');
          }
      }
    } catch (e) {
      setCloudStatus('error');
    }
  }, [vacancies, parameters, agencies, units, profiles, convocations, pssList, users, logs, emailConfig]);

  const loadFromCloud = useCallback(async () => {
    setCloudStatus('syncing');
    
    try {
      const { data, error } = await supabase.from('sistemp_data').select('*').eq('id', 1).maybeSingle();
      
      if (error) {
        console.warn("Aviso: Tabela não encontrada ou erro de conexão. Execute o script SQL de reparo.");
        setCloudStatus(error.message.includes("relation") ? 'setup_required' : 'error');
        isInitialLoadDone.current = true;
        return;
      }

      if (data && data.updated_at !== lastUpdateRef.current) {
        isUpdatingFromRemote.current = true;
        const safeArr = (arr: any) => Array.isArray(arr) ? arr : [];

        setVacancies(safeArr(data.vacancies));
        setParameters(safeArr(data.parameters));
        setAgencies(safeArr(data.agencies));
        setUnits(safeArr(data.units));
        setProfiles(safeArr(data.profiles));
        setConvocations(safeArr(data.convocations));
        setPssList(safeArr(data.pss_list));
        setUsers(safeArr(data.users).length ? data.users : DEFAULT_USERS);
        setLogs(safeArr(data.logs));
        setEmailConfig(data.email_config || DEFAULT_EMAIL_CONFIG);
        
        lastUpdateRef.current = data.updated_at;
      }
      
      setCloudStatus('connected');
      isInitialLoadDone.current = true;
      setTimeout(() => { isUpdatingFromRemote.current = false; }, 500);
    } catch (e) {
      setCloudStatus('error');
      isInitialLoadDone.current = true;
    }
  }, []);

  useEffect(() => {
    loadFromCloud();
  }, [loadFromCloud]);

  useEffect(() => {
    if (isInitialLoadDone.current && !isUpdatingFromRemote.current) {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = window.setTimeout(saveToCloud, 1500);
    }
  }, [vacancies, parameters, agencies, units, profiles, convocations, pssList, users, logs, emailConfig, saveToCloud]);

  if (!currentUser) {
    return <LoginView users={users} onLogin={setCurrentUser} onResetDefaults={() => setUsers(DEFAULT_USERS)} />;
  }

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      userRole={currentUser.role} 
      userName={currentUser.name} 
      onLogout={() => setCurrentUser(null)}
      cloudStatus={cloudStatus}
      onSync={() => { isDirty.current = true; saveToCloud(); }}
    >
      {activeTab === 'dashboard' && <DashboardView vacancies={vacancies} setVacancies={setVacancies} convocations={convocations} pssList={pssList} onLog={addLog} emailConfig={emailConfig} />}
      {activeTab === 'vacancies' && <VacancyManagement vacancies={vacancies} setVacancies={setVacancies} parameters={parameters} agencies={agencies.filter(a => a.status === 'active').map(a => a.name)} units={units.filter(u => u.status === 'active').map(u => u.name)} profiles={profiles.filter(p => p.status === 'active').map(p => p.name)} setAgencies={() => {}} setUnits={() => {}} convocations={convocations} setConvocations={setConvocations} pssList={pssList} userRole={currentUser.role} onLog={addLog} />}
      {activeTab === 'convocations' && <ConvocationManagement convocations={convocations} setConvocations={setConvocations} pssList={pssList} setPssList={setPssList} vacancies={vacancies} profiles={profiles.filter(p => p.status === 'active').map(p => p.name)} userRole={currentUser.role} onLog={addLog} />}
      {activeTab === 'reports' && <ReportsView vacancies={vacancies} convocations={convocations} />}
      {activeTab === 'settings' && <SettingsView parameters={parameters} setParameters={setParameters} agencies={agencies} setAgencies={setAgencies} units={units} setUnits={setUnits} profiles={profiles} setProfiles={setProfiles} users={users} setUsers={setUsers} vacancies={vacancies} convocations={convocations} pssList={pssList} onRestoreAll={() => {}} cloudStatus={cloudStatus} onLog={addLog} emailConfig={emailConfig} setEmailConfig={setEmailConfig} />}
      {activeTab === 'audit' && <AuditView logs={logs} onClear={() => setLogs([])} />}
    </Layout>
  );
};

export default App;
