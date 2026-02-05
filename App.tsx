
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

const SUPABASE_URL = "https://xsbpynwtlhntnafnmnbs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzYnB5bnd0bGhudG5hZm5tbmJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDEwMTcsImV4cCI6MjA4NTIxNzAxN30.fSEBLOipxHT7qjNbG66tXxNe9EgfIVavdr53dIncdpQ"; 

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
  const [cloudErrorMessage, setCloudErrorMessage] = useState<string | null>(null);
  
  const lastUpdateRef = useRef<string | null>(null);
  const isUpdatingFromRemote = useRef(false);
  const isInitialLoadDone = useRef(false);
  const isDirty = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);

  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  
  // PERSISTÊNCIA: Inicializa o usuário a partir do localStorage
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('sistemp_session_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [vacancies, setVacancies] = useState<Vacancy[]>(INITIAL_VACANCIES);
  const [parameters, setParameters] = useState<LegalParameter[]>(INITIAL_PARAMETERS);
  
  const [agencies, setAgencies] = useState<GenericParameter[]>([
    { id: 'a1', name: 'Universidade Federal', status: 'active' }
  ]);
  const [units, setUnits] = useState<GenericParameter[]>([
    { id: 'u1', name: 'Departamento de Computação', status: 'active' },
    { id: 'u2', name: 'Departamento de Artes', status: 'active' }
  ]);
  const [profiles, setProfiles] = useState<GenericParameter[]>([
    { id: 'p1', name: 'Professor Visitante', status: 'active' },
    { id: 'p2', name: 'Professor Substituto', status: 'active' }
  ]);

  const [convocations, setConvocations] = useState<ConvokedPerson[]>(INITIAL_CONVOKED);
  const [pssList, setPssList] = useState<PSS[]>([]); 
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(DEFAULT_EMAIL_CONFIG);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Função para gerenciar o login com persistência
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('sistemp_session_user', JSON.stringify(user));
    addLog('LOGIN', `Usuário ${user.username} acessou o sistema.`);
  };

  // Função para gerenciar o logout
  const handleLogout = () => {
    if (currentUser) {
      addLog('LOGOUT', `Usuário ${currentUser.username} saiu do sistema.`);
    }
    setCurrentUser(null);
    localStorage.removeItem('sistemp_session_user');
  };

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
    if (!isInitialLoadDone.current || isUpdatingFromRemote.current || !isDirty.current) return;
    
    setCloudStatus('syncing');
    const newTime = new Date().toISOString();
    
    try {
      const payload = { 
        id: 1, 
        vacancies,
        parameters,
        agencies,
        units,
        profiles,
        convocations,
        pss_list: Array.isArray(pssList) ? pssList : [],
        users, 
        logs,
        email_config: emailConfig,
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
          setCloudStatus(error.code === '42P01' ? 'setup_required' : 'error');
          setCloudErrorMessage(error.message);
      }
    } catch (e: any) {
      setCloudStatus('error');
    }
  }, [vacancies, parameters, agencies, units, profiles, convocations, pssList, users, logs, emailConfig]);

  const loadFromCloud = useCallback(async () => {
    setCloudStatus('syncing');
    try {
      const { data, error } = await supabase.from('sistemp_data').select('*').eq('id', 1).maybeSingle();
      
      if (!error && data) {
        isUpdatingFromRemote.current = true;
        const safe = (val: any) => Array.isArray(val) ? val : [];
        
        setVacancies(safe(data.vacancies));
        setParameters(safe(data.parameters));
        setAgencies(safe(data.agencies));
        setUnits(safe(data.units));
        setProfiles(safe(data.profiles));
        setConvocations(safe(data.convocations));
        setPssList(safe(data.pss_list)); 
        setUsers(safe(data.users).length ? data.users : DEFAULT_USERS);
        setLogs(safe(data.logs));
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

  useEffect(() => { loadFromCloud(); }, [loadFromCloud]);

  useEffect(() => {
    if (isInitialLoadDone.current && !isUpdatingFromRemote.current) {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = window.setTimeout(saveToCloud, 1000);
    }
  }, [vacancies, parameters, agencies, units, profiles, convocations, pssList, users, logs, emailConfig, saveToCloud]);

  if (!currentUser) {
    return <LoginView users={users} onLogin={handleLogin} onResetDefaults={() => setUsers(DEFAULT_USERS)} />;
  }

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      userRole={currentUser.role} 
      userName={currentUser.name} 
      onLogout={handleLogout}
      cloudStatus={cloudStatus}
      onSync={() => { isDirty.current = true; saveToCloud(); }}
    >
      {activeTab === 'dashboard' && <DashboardView vacancies={vacancies} setVacancies={setVacancies} convocations={convocations} pssList={pssList} onLog={addLog} emailConfig={emailConfig} />}
      {activeTab === 'vacancies' && <VacancyManagement vacancies={vacancies} setVacancies={setVacancies} parameters={parameters} agencies={agencies.filter(a => a.status === 'active').map(a => a.name)} units={units.filter(u => u.status === 'active').map(u => u.name)} profiles={profiles.filter(p => p.status === 'active').map(p => p.name)} setAgencies={() => {}} setUnits={() => {}} convocations={convocations} setConvocations={setConvocations} pssList={pssList} userRole={currentUser.role} onLog={addLog} />}
      {activeTab === 'convocations' && <ConvocationManagement convocations={convocations} setConvocations={setConvocations} pssList={pssList} setPssList={setPssList} vacancies={vacancies} profiles={profiles.filter(p => p.status === 'active').map(p => p.name)} userRole={currentUser.role} onLog={addLog} />}
      {activeTab === 'reports' && <ReportsView vacancies={vacancies} convocations={convocations} />}
      {activeTab === 'settings' && <SettingsView parameters={parameters} setParameters={setParameters} agencies={agencies} setAgencies={setAgencies} units={units} setUnits={setUnits} profiles={profiles} setProfiles={setProfiles} users={users} setUsers={setUsers} vacancies={vacancies} convocations={convocations} pssList={pssList} onRestoreAll={() => {}} cloudStatus={cloudStatus} cloudErrorMessage={cloudErrorMessage} onLog={addLog} emailConfig={emailConfig} setEmailConfig={setEmailConfig} />}
      {activeTab === 'audit' && <AuditView logs={logs} onClear={() => setLogs([])} />}
    </Layout>
  );
};

export default App;
