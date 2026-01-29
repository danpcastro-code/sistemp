
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
  const isDirty = useRef(false);
  const lastChangeTimestamp = useRef<number>(0);

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('sistemp_users');
      const parsed = saved ? JSON.parse(saved) : DEFAULT_USERS;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_USERS;
    } catch { return DEFAULT_USERS; }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('sistemp_session_user');
      if (!saved) return null;
      const sessionUser = JSON.parse(saved);
      // Validar se o usuário da sessão ainda existe na lista de usuários válida
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
      if (!saved) return [DEFAULT_AGENCY];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.length > 0 ? [DEFAULT_AGENCY, ...parsed.filter(a => a !== DEFAULT_AGENCY)] : [DEFAULT_AGENCY];
    } catch { return [DEFAULT_AGENCY]; }
  });

  const [units, setUnits] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sistemp_units');
      if (!saved) return [DEFAULT_UNIT];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.length > 0 ? [DEFAULT_UNIT, ...parsed.filter(u => u !== DEFAULT_UNIT)] : [DEFAULT_UNIT];
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

  const [logs, setLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('sistemp_logs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const markAsDirty = useCallback(() => {
    if (isUpdatingFromRemote.current) return;
    isDirty.current = true;
    lastChangeTimestamp.current = Date.now();
  }, []);

  const addAuditLog = useCallback((action: string, details: string) => {
    if (!currentUser) return;
    const newLog: AuditLog = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      action,
      details
    };
    setLogs(prev => {
        markAsDirty();
        return [newLog, ...prev].slice(0, 1000);
    });
  }, [currentUser, markAsDirty]);

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
          isDirty.current = false;
          setCloudStatus('connected');
      } else {
          setCloudStatus('error');
      }
    } catch (e) {
      setCloudStatus('error');
    }
  }, []);

  const loadFromCloud = useCallback(async (isSilent = false) => {
    if (isDirty.current || (Date.now() - lastChangeTimestamp.current < 15000)) return;
    
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
        
        // Validação rigorosa: Não permite que a nuvem zere os usuários se eles vierem vazios/nulos
        if (data.users && Array.isArray(data.users) && data.users.length > 0) {
          setUsers(data.users);
        }
        
        // Só atualiza os demais se vierem preenchidos ou se for intencional
        if (data.vacancies && Array.isArray(data.vacancies)) setVacancies(data.vacancies);
        if (data.parameters && Array.isArray(data.parameters)) setParameters(data.parameters);
        if (data.profiles && Array.isArray(data.profiles)) setProfiles(data.profiles);
        if (data.convocations && Array.isArray(data.convocations)) setConvocations(data.convocations);
        if (data.logs && Array.isArray(data.logs)) setLogs(data.logs);
        
        if (data.agencies && Array.isArray(data.agencies)) {
           setAgencies([DEFAULT_AGENCY, ...data.agencies.filter((a:any) => a !== DEFAULT_AGENCY)]);
        }
        if (data.units && Array.isArray(data.units)) {
           setUnits([DEFAULT_UNIT, ...data.units.filter((u:any) => u !== DEFAULT_UNIT)]);
        }
        
        lastUpdateRef.current = data.updated_at;
        setTimeout(() => { isUpdatingFromRemote.current = false; }, 800);
      }
      setCloudStatus('connected');
    } catch (e) {
      setCloudStatus('error');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('sistemp_users', JSON.stringify(users));
      localStorage.setItem('sistemp_vacancies', JSON.stringify(vacancies));
      localStorage.setItem('sistemp_parameters', JSON.stringify(parameters));
      localStorage.setItem('sistemp_agencies', JSON.stringify(agencies));
      localStorage.setItem('sistemp_units', JSON.stringify(units));
      localStorage.setItem('sistemp_profiles', JSON.stringify(profiles));
      localStorage.setItem('sistemp_convocations', JSON.stringify(convocations));
      localStorage.setItem('sistemp_logs', JSON.stringify(logs));
      
      if (!isUpdatingFromRemote.current) {
        saveToCloud({ vacancies, parameters, agencies, units, profiles, convocations, users, logs });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [vacancies, parameters, agencies, units, profiles, convocations, users, logs, saveToCloud]);

  useEffect(() => {
    loadFromCloud();
    const interval = setInterval(() => loadFromCloud(true), 25000);
    return () => clearInterval(interval);
  }, [loadFromCloud]);

  const wrappedSetVacancies = (val: any) => { markAsDirty(); setVacancies(val); };
  const wrappedSetParameters = (val: any) => { markAsDirty(); setParameters(val); };
  const wrappedSetAgencies = (val: any) => { markAsDirty(); setAgencies(val); };
  const wrappedSetUnits = (val: any) => { markAsDirty(); setUnits(val); };
  const wrappedSetProfiles = (val: any) => { markAsDirty(); setProfiles(val); };
  const wrappedSetConvocations = (val: any) => { markAsDirty(); setConvocations(val); };
  const wrappedSetUsers = (val: any) => { markAsDirty(); setUsers(val); };

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
      cloudStatus={cloudStatus} onSync={() => { isDirty.current = false; loadFromCloud(); }}
    >
      {(() => {
        switch (activeTab) {
          case 'dashboard': return <DashboardView vacancies={vacancies} />;
          case 'vacancies': return <VacancyManagement vacancies={vacancies} setVacancies={wrappedSetVacancies} parameters={parameters} agencies={agencies} units={units} profiles={profiles} setAgencies={wrappedSetAgencies} setUnits={wrappedSetUnits} convocations={convocations} setConvocations={wrappedSetConvocations} userRole={currentUser.role} onLog={addAuditLog} />;
          case 'convocations': return <ConvocationManagement convocations={convocations} setConvocations={wrappedSetConvocations} profiles={profiles} onLog={addAuditLog} />;
          case 'reports': return <ReportsView vacancies={vacancies} convocations={convocations} />;
          case 'settings': return <SettingsView parameters={parameters} setParameters={wrappedSetParameters} agencies={agencies} setAgencies={wrappedSetAgencies} units={units} setUnits={wrappedSetUnits} profiles={profiles} setProfiles={wrappedSetProfiles} users={users} setUsers={wrappedSetUsers} vacancies={vacancies} convocations={convocations} onRestoreAll={d => { markAsDirty(); if(d.vacancies) setVacancies(d.vacancies); if(d.parameters) setParameters(d.parameters); if(d.users && d.users.length > 0) setUsers(d.users); if(d.convocations) setConvocations(d.convocations); if(d.logs) setLogs(d.logs); if(d.agencies) setAgencies(d.agencies); if(d.units) setUnits(d.units); if(d.profiles) setProfiles(d.profiles); }} cloudStatus={cloudStatus} onCloudConfigChange={() => { isDirty.current = false; loadFromCloud(); }} onLog={addAuditLog} />;
          case 'audit': return <AuditView logs={logs} onClear={() => { markAsDirty(); setLogs([]); addAuditLog('LIMPEZA', 'Auditoria limpa pelo administrador.'); }} />;
          default: return <DashboardView vacancies={vacancies} />;
        }
      })()}
    </Layout>
  );
};

export default App;
