
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

const SUPABASE_URL = "https://nvbjiqfnhsgriuejrnad.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52YmppcWZuaHNncml1ZWpybmFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjE1MjUsImV4cCI6MjA4NTg5NzUyNX0.t_bpmk4Ul5CAPewYDOBN5rWRWkdiLIGpiZrdyn6OaBo"; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const SESSION_KEY = 'ctu_gestao_session_v1';

const DEFAULT_USERS: User[] = [
  { id: '1', name: 'Administrador Sistema', username: 'admin', password: '123', role: UserRole.ADMIN },
  { id: '2', name: 'Gestor RH', username: 'rh', password: '123', role: UserRole.HR }
];

const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  serviceId: '', templateId: '', publicKey: '',
  sender: 'rh.notificacao@orgao.gov.br',
  subject: 'Aviso de Término de Contrato Temporário (CTU Gestão)',
  template: 'Prezado(a) {nome},\n\nSeu contrato expira em {data_fatal}.'
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'syncing' | 'error' | 'connected' | 'setup_required'>('idle');
  const [cloudErrorMessage, setCloudErrorMessage] = useState<string | null>(null);
  
  const isUpdatingFromRemote = useRef(false);
  const isInitialLoadDone = useRef(false);
  const isDirty = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return (parsed && parsed.id) ? parsed : null;
    } catch { return null; }
  });

  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [vacancies, setVacancies] = useState<Vacancy[]>(INITIAL_VACANCIES);
  const [parameters, setParameters] = useState<LegalParameter[]>(INITIAL_PARAMETERS);
  const [agencies, setAgencies] = useState<GenericParameter[]>([{ id: 'a1', name: 'Universidade Federal', status: 'active' }]);
  const [units, setUnits] = useState<GenericParameter[]>([{ id: 'u1', name: 'Departamento de Computação', status: 'active' }]);
  const [profiles, setProfiles] = useState<GenericParameter[]>([{ id: 'p1', name: 'Professor Visitante', status: 'active' }]);
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
    setLogs(prev => [newLog, ...(prev || [])].slice(0, 200));
    isDirty.current = true;
  }, [currentUser]);

  const handleMasterReset = () => {
    if (!confirm("⚠️ RESTAURAÇÃO DE FÁBRICA\nTodos os dados serão apagados permanentemente.")) return;
    setVacancies([]);
    setConvocations([]);
    setPssList([]);
    setAgencies([{ id: 'a1', name: 'Universidade Federal', status: 'active' }]);
    setUnits([{ id: 'u1', name: 'Departamento de Computação', status: 'active' }]);
    setProfiles([{ id: 'p1', name: 'Professor Visitante', status: 'active' }]);
    setUsers(DEFAULT_USERS);
    setLogs([]);
    setEmailConfig(DEFAULT_EMAIL_CONFIG);
    setParameters(INITIAL_PARAMETERS);
    isDirty.current = true;
    setTimeout(() => saveToCloud(), 500);
  };

  const saveToCloud = useCallback(async () => {
    if (!isInitialLoadDone.current || isUpdatingFromRemote.current || !isDirty.current) return;
    setCloudStatus('syncing');
    try {
      const payload = { 
        id: 1, vacancies, parameters, agencies, units, profiles, convocations, pss_list: pssList, users, logs,
        email_config: emailConfig, updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('sistemp_data').upsert(payload);
      if (!error) { isDirty.current = false; setCloudStatus('connected'); setCloudErrorMessage(null); }
      else { setCloudStatus(error.code === '42P01' ? 'setup_required' : 'error'); setCloudErrorMessage(error.message); }
    } catch (e: any) { setCloudStatus('error'); setCloudErrorMessage(e.message); }
  }, [vacancies, parameters, agencies, units, profiles, convocations, pssList, users, logs, emailConfig]);

  const loadFromCloud = useCallback(async () => {
    setCloudStatus('syncing');
    try {
      const { data, error } = await supabase.from('sistemp_data').select('*').eq('id', 1).maybeSingle();
      if (!error && data) {
        isUpdatingFromRemote.current = true;
        const safeArr = (arr: any) => Array.isArray(arr) ? arr : [];
        setVacancies(safeArr(data.vacancies));
        setParameters(safeArr(data.parameters).length ? data.parameters : INITIAL_PARAMETERS);
        setAgencies(safeArr(data.agencies).length ? data.agencies : [{ id: 'a1', name: 'Universidade Federal', status: 'active' }]);
        setUnits(safeArr(data.units).length ? data.units : [{ id: 'u1', name: 'Departamento de Computação', status: 'active' }]);
        setProfiles(safeArr(data.profiles).length ? data.profiles : [{ id: 'p1', name: 'Professor Visitante', status: 'active' }]);
        setConvocations(safeArr(data.convocations));
        setPssList(safeArr(data.pss_list).length ? data.pss_list : INITIAL_PSS);
        setUsers(safeArr(data.users).length ? data.users : DEFAULT_USERS);
        setLogs(safeArr(data.logs));
        setEmailConfig(data.email_config && typeof data.email_config === 'object' && Object.keys(data.email_config).length > 0 ? data.email_config : DEFAULT_EMAIL_CONFIG);
        setCloudStatus('connected');
      } else if (error) { setCloudStatus(error.code === '42P01' ? 'setup_required' : 'error'); setCloudErrorMessage(error.message); }
      else { setCloudStatus('connected'); }
      isInitialLoadDone.current = true;
      setTimeout(() => { isUpdatingFromRemote.current = false; }, 500);
    } catch (e: any) { setCloudStatus('error'); setCloudErrorMessage(e.message); isInitialLoadDone.current = true; }
  }, []);

  useEffect(() => { loadFromCloud(); }, [loadFromCloud]);
  useEffect(() => {
    if (isInitialLoadDone.current && !isUpdatingFromRemote.current) {
      isDirty.current = true;
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = window.setTimeout(saveToCloud, 2000);
    }
  }, [vacancies, parameters, agencies, units, profiles, convocations, pssList, users, logs, emailConfig, saveToCloud]);

  if (!currentUser) return <LoginView users={users} onLogin={user => { setCurrentUser(user); localStorage.setItem(SESSION_KEY, JSON.stringify(user)); }} onResetDefaults={() => setUsers(DEFAULT_USERS)} />;

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} userRole={currentUser.role} userName={currentUser.name} onLogout={() => { localStorage.removeItem(SESSION_KEY); setCurrentUser(null); }} cloudStatus={cloudStatus} onSync={() => { isDirty.current = true; saveToCloud(); }}>
      {activeTab === 'dashboard' && <DashboardView vacancies={vacancies} setVacancies={setVacancies} convocations={convocations} pssList={pssList} onLog={addLog} emailConfig={emailConfig} />}
      {activeTab === 'vacancies' && <VacancyManagement vacancies={vacancies} setVacancies={setVacancies} parameters={parameters} agencies={agencies.filter(a => a.status === 'active').map(a => a.name)} units={units.filter(u => u.status === 'active').map(u => u.name)} profiles={profiles.filter(p => p.status === 'active').map(p => p.name)} setAgencies={() => {}} setUnits={() => {}} convocations={convocations} setConvocations={setConvocations} pssList={pssList} userRole={currentUser.role} onLog={addLog} />}
      {activeTab === 'convocations' && <ConvocationManagement convocations={convocations} setConvocations={setConvocations} pssList={pssList} setPssList={setPssList} vacancies={vacancies} profiles={profiles.filter(p => p.status === 'active').map(p => p.name)} userRole={currentUser.role} onLog={addLog} />}
      {activeTab === 'reports' && <ReportsView vacancies={vacancies} convocations={convocations} />}
      {activeTab === 'settings' && <SettingsView parameters={parameters} setParameters={setParameters} agencies={agencies} setAgencies={setAgencies} units={units} setUnits={setUnits} profiles={profiles} setProfiles={setProfiles} users={users} setUsers={setUsers} vacancies={vacancies} convocations={convocations} pssList={pssList} onRestoreAll={handleMasterReset} cloudStatus={cloudStatus} cloudErrorMessage={cloudErrorMessage} onLog={addLog} emailConfig={emailConfig} setEmailConfig={setEmailConfig} />}
      {activeTab === 'audit' && <AuditView logs={logs} onClear={() => setLogs([])} />}
    </Layout>
  );
};

export default App;
