
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

const SUPABASE_URL = "https://mwhctqhjulrlisokxdth.supabase.co";
const SUPABASE_KEY = "sb_publishable_I6orZsgeBZX0QRvhrQ5d-A_Jng0xH2s";
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
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'syncing' | 'error' | 'connected'>('idle');
  
  const lastUpdateRef = useRef<string | null>(null);
  const isUpdatingFromRemote = useRef(false);
  const isDirty = useRef(false);

  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // ESTADOS INICIADOS VAZIOS (AGUARDANDO NUVEM)
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [parameters, setParameters] = useState<LegalParameter[]>(INITIAL_PARAMETERS);
  const [agencies, setAgencies] = useState<GenericParameter[]>([]);
  const [units, setUnits] = useState<GenericParameter[]>([]);
  const [profiles, setProfiles] = useState<GenericParameter[]>([]);
  const [convocations, setConvocations] = useState<ConvokedPerson[]>([]);
  const [pssList, setPssList] = useState<PSS[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(DEFAULT_EMAIL_CONFIG);

  const addLog = useCallback((action: string, details: string) => {
    const newLog: AuditLog = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      user: currentUser?.name || 'Sistema',
      action,
      details
    };
    setLogs(prev => [newLog, ...prev]);
    isDirty.current = true;
  }, [currentUser]);

  const saveToCloud = useCallback(async () => {
    if (isUpdatingFromRemote.current || !isDirty.current) return;
    setCloudStatus('syncing');
    const newTime = new Date().toISOString();
    try {
      const { error } = await supabase
        .from('sistemp_data')
        .upsert({ 
          id: 1, 
          vacancies, 
          parameters, 
          agencies, 
          units, 
          profiles, 
          convocations, 
          pss_list: pssList,
          users, 
          logs, 
          email_config: emailConfig,
          updated_at: newTime 
        }, { onConflict: 'id' });
      if (!error) {
          lastUpdateRef.current = newTime;
          isDirty.current = false;
          setCloudStatus('connected');
      } else {
          setCloudStatus('error');
      }
    } catch (e) {
      setCloudStatus('error');
    }
  }, [vacancies, parameters, agencies, units, profiles, convocations, pssList, users, logs, emailConfig]);

  const loadFromCloud = useCallback(async (isSilent = false) => {
    if (isDirty.current) return;
    if (!isSilent) setCloudStatus('syncing');
    try {
      const { data, error } = await supabase.from('sistemp_data').select('*').eq('id', 1).single();
      if (error) { 
        console.log("Aguardando inicialização da tabela no Supabase...");
        setCloudStatus('connected'); 
        return; 
      }
      
      if (data && data.updated_at !== lastUpdateRef.current) {
        isUpdatingFromRemote.current = true;
        setVacancies(data.vacancies || []);
        setParameters(data.parameters || INITIAL_PARAMETERS);
        setAgencies(data.agencies || []);
        setUnits(data.units || []);
        setProfiles(data.profiles || []);
        setConvocations(data.convocations || []);
        setPssList(data.pss_list || []);
        setUsers(data.users || DEFAULT_USERS);
        setLogs(data.logs || []);
        setEmailConfig(data.email_config || DEFAULT_EMAIL_CONFIG);
        lastUpdateRef.current = data.updated_at;
        setCloudStatus('connected');
        setTimeout(() => { isUpdatingFromRemote.current = false; }, 150);
      } else {
        setCloudStatus('connected');
      }
    } catch (e) {
      setCloudStatus('error');
    }
  }, []);

  useEffect(() => {
    loadFromCloud();
  }, [loadFromCloud]);

  useEffect(() => {
    if (!isUpdatingFromRemote.current) {
      const timeout = setTimeout(() => {
        if (isDirty.current) saveToCloud();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [vacancies, parameters, agencies, units, profiles, convocations, pssList, users, logs, emailConfig, saveToCloud]);

  if (!currentUser) {
    return <LoginView users={users} onLogin={setCurrentUser} onResetDefaults={() => setUsers(DEFAULT_USERS)} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView vacancies={vacancies} setVacancies={setVacancies} convocations={convocations} pssList={pssList} onLog={addLog} emailConfig={emailConfig} />;
      case 'vacancies':
        return <VacancyManagement vacancies={vacancies} setVacancies={setVacancies} parameters={parameters} agencies={agencies.filter(a => a.status === 'active').map(a => a.name)} units={units.filter(u => u.status === 'active').map(u => u.name)} profiles={profiles.filter(p => p.status === 'active').map(p => p.name)} setAgencies={() => {}} setUnits={() => {}} convocations={convocations} setConvocations={setConvocations} pssList={pssList} userRole={currentUser.role} onLog={addLog} />;
      case 'convocations':
        return <ConvocationManagement convocations={convocations} setConvocations={setConvocations} pssList={pssList} setPssList={setPssList} vacancies={vacancies} profiles={profiles.filter(p => p.status === 'active').map(p => p.name)} userRole={currentUser.role} onLog={addLog} />;
      case 'reports':
        return <ReportsView vacancies={vacancies} convocations={convocations} />;
      case 'settings':
        return <SettingsView parameters={parameters} setParameters={setParameters} agencies={agencies} setAgencies={setAgencies} units={units} setUnits={setUnits} profiles={profiles} setProfiles={setProfiles} users={users} setUsers={setUsers} vacancies={vacancies} convocations={convocations} pssList={pssList} onRestoreAll={() => {}} cloudStatus={cloudStatus} onLog={addLog} emailConfig={emailConfig} setEmailConfig={setEmailConfig} />;
      case 'audit':
        return <AuditView logs={logs} onClear={() => { setLogs([]); isDirty.current = true; }} />;
      default:
        return <DashboardView vacancies={vacancies} setVacancies={setVacancies} convocations={convocations} pssList={pssList} onLog={addLog} emailConfig={emailConfig} />;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      userRole={currentUser.role} 
      userName={currentUser.name} 
      onLogout={() => setCurrentUser(null)}
      cloudStatus={cloudStatus}
      onSync={() => loadFromCloud(false)}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
