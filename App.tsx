
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
import { Vacancy, LegalParameter, ConvokedPerson, UserRole, User, AuditLog } from './types';
import { createClient } from '@supabase/supabase-js';
import { generateId } from './utils';

const DEFAULT_USERS: User[] = [
  { id: '1', name: 'Administrador Sistema', username: 'admin', password: '123', role: UserRole.ADMIN },
  { id: '2', name: 'Gestor RH', username: 'rh', password: '123', role: UserRole.HR },
  { id: '3', name: 'Consulta Externa', username: 'consulta', password: '123', role: UserRole.CONSULTANT }
];

const DEFAULT_AGENCY = 'Ministério da Gestão e da Inovação em Serviços Públicos';
const DEFAULT_UNIT = 'Sede Central';
const DEFAULT_PROFILES = ['Professor Substituto', 'Técnico Especializado', 'Pesquisador Visitante'];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'syncing' | 'error' | 'connected'>('idle');
  const lastUpdateRef = useRef<string | null>(null);
  const isUpdatingFromRemote = useRef(false);
  const lastLocalSaveTime = useRef<number>(0);

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('sistemp_users');
      if (!saved) return DEFAULT_USERS;
      return JSON.parse(saved);
    } catch { return DEFAULT_USERS; }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('sistemp_session_user');
      if (!saved) return null;
      const sessionUser = JSON.parse(saved);
      return users.find(u => u.username === sessionUser.username) || null;
    } catch { return null; }
  });

  const [vacancies, setVacancies] = useState<Vacancy[]>(() => {
    try {
      const saved = localStorage.getItem('sistemp_vacancies');
      if (!saved) return INITIAL_VACANCIES;
      return JSON.parse(saved);
    } catch { return INITIAL_VACANCIES; }
  });

  const [parameters, setParameters] = useState<LegalParameter[]>(() => {
    try {
      const saved = localStorage.getItem('sistemp_parameters');
      if (!saved) return INITIAL_PARAMETERS;
      return JSON.parse(saved);
    } catch { return INITIAL_PARAMETERS; }
  });

  const [agencies, setAgencies] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sistemp_agencies');
      if (!saved) return [DEFAULT_AGENCY];
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(a => a !== DEFAULT_AGENCY);
        return [DEFAULT_AGENCY, ...filtered];
      }
      return [DEFAULT_AGENCY];
    } catch { return [DEFAULT_AGENCY]; }
  });

  const [units, setUnits] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sistemp_units');
      if (!saved) return [DEFAULT_UNIT];
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(u => u !== DEFAULT_UNIT);
        return [DEFAULT_UNIT, ...filtered];
      }
      return [DEFAULT_UNIT];
    } catch { return [DEFAULT_UNIT]; }
  });

  const [profiles, setProfiles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sistemp_profiles');
      if (!saved) return DEFAULT_PROFILES;
      return JSON.parse(saved);
    } catch { return DEFAULT_PROFILES; }
  });

  const [convocations, setConvocations] = useState<ConvokedPerson[]>(() => {
    try {
      const saved = localStorage.getItem('sistemp_convocations');
      if (!saved) return INITIAL_CONVOKED;
      return JSON.parse(saved);
    } catch { return INITIAL_CONVOKED; }
  });

  const [logs, setLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('sistemp_logs');
      if (!saved) return [];
      return JSON.parse(saved);
    } catch { return []; }
  });

  const addAuditLog = useCallback((action: string, details: string) => {
    if (!currentUser) return;
    const newLog: AuditLog = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      action,
      details
    };
    setLogs(prev => [newLog, ...prev].slice(0, 1000));
  }, [currentUser]);

  const saveToCloud = useCallback(async (payload: any) => {
    if (isUpdatingFromRemote.current) return;
    try {
      const configRaw = localStorage.getItem('sistemp_cloud_config');
      if (!configRaw) return;
      const config = JSON.parse(configRaw);
      if (!config.url || !config.key) return;

      const supabase = createClient(config.url, config.key);
      const newTime = new Date().toISOString();
      
      const { error } = await supabase.from('sistemp_data').upsert({ id: 1, ...payload, updated_at: newTime });
      
      if (!error) {
          lastUpdateRef.current = newTime;
          lastLocalSaveTime.current = Date.now();
          setCloudStatus('connected');
      } else {
          setCloudStatus('error');
      }
    } catch (e) {
      setCloudStatus('error');
    }
  }, []);

  const loadFromCloud = useCallback(async (isSilent = false) => {
    // Aumentado para 10s para garantir que o Supabase processou o último salvamento local
    if (Date.now() - lastLocalSaveTime.current < 10000) return;
    
    try {
      const configRaw = localStorage.getItem('sistemp_cloud_config');
      if (!configRaw) return;
      const config = JSON.parse(configRaw);
      if (!config.url || !config.key) return;
      
      if (!isSilent) setCloudStatus('syncing');
      const supabase = createClient(config.url, config.key);
      const { data, error } = await supabase.from('sistemp_data').select('*').eq('id', 1).single();
      
      if (!error && data && data.updated_at !== lastUpdateRef.current) {
        isUpdatingFromRemote.current = true;
        if (data.vacancies) setVacancies(data.vacancies);
        if (data.parameters) setParameters(data.parameters);
        if (data.agencies) {
          const filtered = data.agencies.filter((a: string) => a !== DEFAULT_AGENCY);
          setAgencies([DEFAULT_AGENCY, ...filtered]);
        }
        if (data.units) {
          const filtered = data.units.filter((u: string) => u !== DEFAULT_UNIT);
          setUnits([DEFAULT_UNIT, ...filtered]);
        }
        if (data.profiles) setProfiles(data.profiles);
        if (data.convocations) setConvocations(data.convocations);
        if (data.users) setUsers(data.users);
        if (data.logs) setLogs(data.logs);
        lastUpdateRef.current = data.updated_at;
        setTimeout(() => { isUpdatingFromRemote.current = false; }, 1000);
      }
      setCloudStatus('connected');
    } catch (e) {
      setCloudStatus('error');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('sistemp_vacancies', JSON.stringify(vacancies));
      localStorage.setItem('sistemp_parameters', JSON.stringify(parameters));
      localStorage.setItem('sistemp_agencies', JSON.stringify(agencies));
      localStorage.setItem('sistemp_units', JSON.stringify(units));
      localStorage.setItem('sistemp_profiles', JSON.stringify(profiles));
      localStorage.setItem('sistemp_convocations', JSON.stringify(convocations));
      localStorage.setItem('sistemp_users', JSON.stringify(users));
      localStorage.setItem('sistemp_logs', JSON.stringify(logs));
      
      if (!isUpdatingFromRemote.current) {
        lastLocalSaveTime.current = Date.now();
        saveToCloud({ vacancies, parameters, agencies, units, profiles, convocations, users, logs });
      }
    }, 800); // Debounce um pouco maior para evitar spam
    return () => clearTimeout(timer);
  }, [vacancies, parameters, agencies, units, profiles, convocations, users, logs, saveToCloud]);

  useEffect(() => {
    loadFromCloud();
    const interval = setInterval(() => loadFromCloud(true), 20000);
    return () => clearInterval(interval);
  }, [loadFromCloud]);

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
      cloudStatus={cloudStatus} onSync={() => loadFromCloud()}
    >
      {(() => {
        switch (activeTab) {
          case 'dashboard': return <DashboardView vacancies={vacancies} />;
          case 'vacancies': return <VacancyManagement vacancies={vacancies} setVacancies={setVacancies} parameters={parameters} agencies={agencies} units={units} profiles={profiles} setAgencies={setAgencies} setUnits={setUnits} convocations={convocations} setConvocations={setConvocations} userRole={currentUser.role} onLog={addAuditLog} />;
          case 'convocations': return <ConvocationManagement convocations={convocations} setConvocations={setConvocations} profiles={profiles} onLog={addAuditLog} />;
          case 'reports': return <ReportsView vacancies={vacancies} convocations={convocations} />;
          case 'settings': return <SettingsView parameters={parameters} setParameters={setParameters} agencies={agencies} setAgencies={setAgencies} units={units} setUnits={setUnits} profiles={profiles} setProfiles={setProfiles} users={users} setUsers={setUsers} vacancies={vacancies} convocations={convocations} onRestoreAll={d => { if(d.vacancies) setVacancies(d.vacancies); if(d.parameters) setParameters(d.parameters); if(d.users) setUsers(d.users); if(d.convocations) setConvocations(d.convocations); if(d.logs) setLogs(d.logs); if(d.agencies) setAgencies(d.agencies); if(d.units) setUnits(d.units); if(d.profiles) setProfiles(d.profiles); }} cloudStatus={cloudStatus} onCloudConfigChange={() => loadFromCloud()} onLog={addAuditLog} />;
          case 'audit': return <AuditView logs={logs} onClear={() => { setLogs([]); addAuditLog('LIMPEZA', 'Auditoria limpa pelo administrador.'); }} />;
          default: return <DashboardView vacancies={vacancies} />;
        }
      })()}
    </Layout>
  );
};

export default App;
