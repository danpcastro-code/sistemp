
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from './components/Layout';
import DashboardView from './components/DashboardView';
import VacancyManagement from './components/VacancyManagement';
import ConvocationManagement from './components/ConvocationManagement';
import SettingsView from './components/SettingsView';
import ReportsView from './components/ReportsView';
import LoginView from './components/LoginView';
import AuditView from './components/AuditView';
import { INITIAL_VACANCIES, INITIAL_PARAMETERS, INITIAL_CONVOKED } from './mockData';
import { Vacancy, LegalParameter, ConvokedPerson, UserRole, User, AuditLog, EmailConfig } from './types';
import { createClient } from '@supabase/supabase-js';
import { generateId } from './utils';

const SUPABASE_URL = "https://mwhctqhjulrlisokxdth.supabase.co";
const SUPABASE_KEY = "sb_publishable_I6orZsgeBZX0QRvhrQ5d-A_Jng0xH2s";

const DEFAULT_USERS: User[] = [
  { id: '1', name: 'Administrador Sistema', username: 'admin', password: '123', role: UserRole.ADMIN },
  { id: '2', name: 'Gestor RH', username: 'rh', password: '123', role: UserRole.HR },
  { id: '3', name: 'Consulta Externa', username: 'consulta', password: '123', role: UserRole.CONSULTANT }
];

const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  serviceId: '',
  templateId: '',
  publicKey: '',
  sender: 'rh.notificacao@orgao.gov.br',
  subject: 'Aviso de Término de Contrato Temporário',
  template: 'Prezado(a) {nome},\n\nInformamos que seu contrato vinculado ao posto {posto} do grupo {grupo} atingirá o limite fatal de permanência em {data_fatal}.\n\nFavor comparecer ao RH para orientações.'
};

const mergeWithDefaultUsers = (incomingUsers: any[]): User[] => {
  const list = Array.isArray(incomingUsers) ? incomingUsers : [];
  const merged = [...DEFAULT_USERS];
  list.forEach(u => {
    const exists = merged.some(d => d.username.toLowerCase() === u.username.toLowerCase());
    if (!exists && u.username) merged.push(u);
  });
  return merged;
};

const DEFAULT_AGENCY = 'Ministério da Gestão e da Inovação em Serviços Públicos';
const DEFAULT_UNIT = 'Sede Central';
const DEFAULT_PROFILES = ['Professor Substituto', 'Técnico Especializado', 'Pesquisador Visitante', 'Administrador'];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'syncing' | 'error' | 'connected'>('idle');
  
  const lastUpdateRef = useRef<string | null>(null);
  const isUpdatingFromRemote = useRef(false);
  const isDirty = useRef(false);

  // Estados Base
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('sistemp_users');
      return mergeWithDefaultUsers(saved ? JSON.parse(saved) : []);
    } catch { return DEFAULT_USERS; }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('sistemp_session_user');
      if (!saved) return null;
      const sessionUser = JSON.parse(saved);
      return users.find(u => u.username.toLowerCase() === sessionUser.username.toLowerCase()) || null;
    } catch { return null; }
  });

  const [vacancies, setVacancies] = useState<Vacancy[]>(() => {
    try {
      const saved = localStorage.getItem('sistemp_vacancies');
      return saved ? JSON.parse(saved) : INITIAL_VACANCIES;
    } catch { return INITIAL_VACANCIES; }
  });

  const [parameters, setParameters] = useState<LegalParameter[]>(() => {
    try {
      const saved = localStorage.getItem('sistemp_parameters');
      return saved ? JSON.parse(saved) : INITIAL_PARAMETERS;
    } catch { return INITIAL_PARAMETERS; }
  });

  const [agencies, setAgencies] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sistemp_agencies');
      const parsed = saved ? JSON.parse(saved) : [DEFAULT_AGENCY];
      return Array.isArray(parsed) ? parsed : [DEFAULT_AGENCY];
    } catch { return [DEFAULT_AGENCY]; }
  });

  const [units, setUnits] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sistemp_units');
      const parsed = saved ? JSON.parse(saved) : [DEFAULT_UNIT];
      return Array.isArray(parsed) ? parsed : [DEFAULT_UNIT];
    } catch { return [DEFAULT_UNIT]; }
  });

  const [profiles, setProfiles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sistemp_profiles');
      return saved ? JSON.parse(saved) : DEFAULT_PROFILES;
    } catch { return DEFAULT_PROFILES; }
  });

  const [convocations, setConvocations] = useState<ConvokedPerson[]>(() => {
    try {
      const saved = localStorage.getItem('sistemp_convocations');
      return saved ? JSON.parse(saved) : INITIAL_CONVOKED;
    } catch { return INITIAL_CONVOKED; }
  });

  const [emailConfig, setEmailConfig] = useState<EmailConfig>(() => {
    try {
      const saved = localStorage.getItem('sistemp_email_config');
      return saved ? JSON.parse(saved) : DEFAULT_EMAIL_CONFIG;
    } catch { return DEFAULT_EMAIL_CONFIG; }
  });

  const [logs, setLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('sistemp_logs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const saveToCloud = useCallback(async () => {
    // Só salva se houver mudanças locais e não estivermos no meio de um download
    if (isUpdatingFromRemote.current || !isDirty.current) return;
    
    try {
      setCloudStatus('syncing');
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      const newTime = new Date().toISOString();
      
      // CRÍTICO: Alinhamento exato com as colunas do PostgreSQL (snake_case)
      const payload = { 
        vacancies, 
        parameters, 
        agencies, 
        units, 
        profiles, 
        convocations, 
        users, 
        logs, 
        email_config: emailConfig // Mapeamento para snake_case
      };
      
      const { error } = await supabase
        .from('sistemp_data')
        .upsert({ 
          id: 1, 
          ...payload, 
          updated_at: newTime 
        }, { onConflict: 'id' });
      
      if (!error) {
          console.log("Cloud Save Success:", newTime);
          lastUpdateRef.current = newTime;
          isDirty.current = false;
          setCloudStatus('connected');
      } else {
          console.error("Cloud Save Error:", error.message);
          setCloudStatus('error');
      }
    } catch (e) {
      console.error("Cloud Exception:", e);
      setCloudStatus('error');
    }
  }, [vacancies, parameters, agencies, units, profiles, convocations, users, logs, emailConfig]);

  const loadFromCloud = useCallback(async (isSilent = false) => {
    // Não baixa dados se tivermos mudanças locais pendentes para evitar sobrescrita
    if (isDirty.current) return;
    
    try {
      if (!isSilent) setCloudStatus('syncing');
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data, error } = await supabase.from('sistemp_data').select('*').eq('id', 1).single();
      
      if (!error && data && data.updated_at !== lastUpdateRef.current) {
        isUpdatingFromRemote.current = true;

        if (data.users) setUsers(mergeWithDefaultUsers(data.users));
        if (data.vacancies) setVacancies(data.vacancies);
        if (data.parameters) setParameters(data.parameters);
        if (data.profiles) setProfiles(data.profiles);
        if (data.convocations) setConvocations(data.convocations);
        if (data.logs) setLogs(data.logs);
        if (data.agencies) setAgencies(data.agencies);
        if (data.units) setUnits(data.units);
        if (data.email_config) setEmailConfig(data.email_config); // Mapeamento de volta
        
        lastUpdateRef.current = data.updated_at;
        // Pequeno atraso para garantir que os efeitos de estado terminem
        setTimeout(() => { isUpdatingFromRemote.current = false; }, 500);
      }
      setCloudStatus('connected');
    } catch (e) {
      if (!isSilent) setCloudStatus('error');
    }
  }, []);

  // Monitor de Mudanças e Salvamento Local/Nuvem
  useEffect(() => {
    const timer = setTimeout(() => {
      // Persistência Local (Rede de Segurança)
      localStorage.setItem('sistemp_users', JSON.stringify(users));
      localStorage.setItem('sistemp_vacancies', JSON.stringify(vacancies));
      localStorage.setItem('sistemp_parameters', JSON.stringify(parameters));
      localStorage.setItem('sistemp_agencies', JSON.stringify(agencies));
      localStorage.setItem('sistemp_units', JSON.stringify(units));
      localStorage.setItem('sistemp_profiles', JSON.stringify(profiles));
      localStorage.setItem('sistemp_convocations', JSON.stringify(convocations));
      localStorage.setItem('sistemp_logs', JSON.stringify(logs));
      localStorage.setItem('sistemp_email_config', JSON.stringify(emailConfig));
      
      // Persistência em Nuvem (Memorização Permanente)
      if (isDirty.current) {
          saveToCloud();
      }
    }, 1500); // Debounce de 1.5s para não sobrecarregar
    return () => clearTimeout(timer);
  }, [vacancies, parameters, agencies, units, profiles, convocations, users, logs, emailConfig, saveToCloud]);

  // Ciclo de Vida: Carregamento Inicial e Polling
  useEffect(() => {
    loadFromCloud();
    const interval = setInterval(() => loadFromCloud(true), 15000);
    return () => clearInterval(interval);
  }, [loadFromCloud]);

  const markAsDirty = () => {
    if (!isUpdatingFromRemote.current) {
        isDirty.current = true;
    }
  };

  // Wrappers de estado para controle de auditoria de sujeira (dirty checking)
  const wrappedSetVacancies = (val: any) => { markAsDirty(); setVacancies(val); };
  const wrappedSetParameters = (val: any) => { markAsDirty(); setParameters(val); };
  const wrappedSetAgencies = (val: any) => { markAsDirty(); setAgencies(val); };
  const wrappedSetUnits = (val: any) => { markAsDirty(); setUnits(val); };
  const wrappedSetProfiles = (val: any) => { markAsDirty(); setProfiles(val); };
  const wrappedSetConvocations = (val: any) => { markAsDirty(); setConvocations(val); };
  const wrappedSetUsers = (val: any) => { markAsDirty(); setUsers(val); };
  const wrappedSetEmailConfig = (val: any) => { markAsDirty(); setEmailConfig(val); };

  const addAuditLog = useCallback((action: string, details: string) => {
    if (!currentUser) return;
    const newLog: AuditLog = { id: generateId(), timestamp: new Date().toISOString(), user: currentUser.name, action, details };
    setLogs(prev => { markAsDirty(); return [newLog, ...prev].slice(0, 1000); });
  }, [currentUser]);

  if (!currentUser) {
    return <LoginView users={users} onLogin={u => {
      setCurrentUser(u);
      localStorage.setItem('sistemp_session_user', JSON.stringify(u));
    }} />;
  }

  return (
    <Layout 
      activeTab={activeTab} setActiveTab={setActiveTab} 
      userRole={currentUser.role} userName={currentUser.name} 
      onLogout={() => { setCurrentUser(null); localStorage.removeItem('sistemp_session_user'); }}
      cloudStatus={cloudStatus} 
      onSync={() => { isDirty.current = false; loadFromCloud(); }}
    >
      {(() => {
        switch (activeTab) {
          case 'dashboard': return <DashboardView vacancies={vacancies} setVacancies={wrappedSetVacancies} convocations={convocations} onLog={addAuditLog} emailConfig={emailConfig} />;
          case 'vacancies': return <VacancyManagement vacancies={vacancies} setVacancies={wrappedSetVacancies} parameters={parameters} agencies={agencies} units={units} profiles={profiles} setAgencies={wrappedSetAgencies} setUnits={wrappedSetUnits} convocations={convocations} setConvocations={wrappedSetConvocations} userRole={currentUser.role} onLog={addAuditLog} />;
          case 'convocations': return <ConvocationManagement convocations={convocations} setConvocations={wrappedSetConvocations} profiles={profiles} onLog={addAuditLog} />;
          case 'reports': return <ReportsView vacancies={vacancies} convocations={convocations} />;
          case 'settings': return <SettingsView parameters={parameters} setParameters={wrappedSetParameters} agencies={agencies} setAgencies={wrappedSetAgencies} units={units} setUnits={wrappedSetUnits} profiles={profiles} setProfiles={wrappedSetProfiles} users={users} setUsers={wrappedSetUsers} vacancies={vacancies} convocations={convocations} onRestoreAll={d => { markAsDirty(); if(d.vacancies) setVacancies(d.vacancies); if(d.parameters) setParameters(d.parameters); if(d.users) setUsers(d.users); if(d.convocations) setConvocations(d.convocations); if(d.logs) setLogs(d.logs); if(d.agencies) setAgencies(d.agencies); if(d.units) setUnits(d.units); if(d.profiles) setProfiles(d.profiles); if(d.email_config) setEmailConfig(d.email_config); }} cloudStatus={cloudStatus} onLog={addAuditLog} emailConfig={emailConfig} setEmailConfig={wrappedSetEmailConfig} />;
          case 'audit': return <AuditView logs={logs} onClear={() => { markAsDirty(); setLogs([]); addAuditLog('LIMPEZA', 'Auditoria limpa pelo administrador.'); }} />;
          default: return <DashboardView vacancies={vacancies} setVacancies={wrappedSetVacancies} convocations={convocations} onLog={addAuditLog} emailConfig={emailConfig} />;
        }
      })()}
    </Layout>
  );
};

export default App;
