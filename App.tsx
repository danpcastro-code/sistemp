
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

// Conexão Direta com Supabase
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

  // Estados Base
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>(INITIAL_VACANCIES);
  const [parameters, setParameters] = useState<LegalParameter[]>(INITIAL_PARAMETERS);
  const [agencies, setAgencies] = useState<string[]>(['Ministério da Gestão']);
  const [units, setUnits] = useState<string[]>(['Sede']);
  const [profiles, setProfiles] = useState<string[]>(['Administrador', 'Professor']);
  const [convocations, setConvocations] = useState<ConvokedPerson[]>(INITIAL_CONVOKED);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(DEFAULT_EMAIL_CONFIG);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // MECANISMO DE GRAVAÇÃO (SAVE)
  const saveToCloud = useCallback(async () => {
    // Não salva se estivermos baixando dados ou se não houver mudanças
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
          users, 
          logs, 
          email_config: emailConfig, // Mapeamento para coluna snake_case
          updated_at: newTime 
        }, { onConflict: 'id' });
      
      if (!error) {
          console.log("✔️ Dados sincronizados com a nuvem.");
          lastUpdateRef.current = newTime;
          isDirty.current = false;
          setCloudStatus('connected');
      } else {
          console.error("❌ Erro Supabase:", error.message);
          setCloudStatus('error');
      }
    } catch (e) {
      setCloudStatus('error');
    }
  }, [vacancies, parameters, agencies, units, profiles, convocations, users, logs, emailConfig]);

  // MECANISMO DE LEITURA (LOAD)
  const loadFromCloud = useCallback(async (isSilent = false) => {
    if (isDirty.current) return; // Não sobrescreve mudanças locais pendentes
    
    if (!isSilent) setCloudStatus('syncing');
    
    try {
      const { data, error } = await supabase.from('sistemp_data').select('*').eq('id', 1).single();
      
      if (error) {
          // Se não houver registro ID 1, ele será criado no primeiro save
          setCloudStatus('connected');
          return;
      }

      if (data && data.updated_at !== lastUpdateRef.current) {
        isUpdatingFromRemote.current = true;
        
        if (data.vacancies) setVacancies(data.vacancies);
        if (data.parameters) setParameters(data.parameters);
        if (data.agencies) setAgencies(data.agencies);
        if (data.units) setUnits(data.units);
        if (data.profiles) setProfiles(data.profiles);
        if (data.convocations) setConvocations(data.convocations);
        if (data.users) setUsers(data.users);
        if (data.logs) setLogs(data.logs);
        if (data.email_config) setEmailConfig(data.email_config);
        
        lastUpdateRef.current = data.updated_at;
        setTimeout(() => { isUpdatingFromRemote.current = false; }, 300);
      }
      setCloudStatus('connected');
    } catch (e) {
      if (!isSilent) setCloudStatus('error');
    }
  }, []);

  // Timer de Sincronização (Debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isDirty.current) saveToCloud();
    }, 2000); 
    return () => clearTimeout(timer);
  }, [vacancies, parameters, agencies, units, profiles, convocations, users, logs, emailConfig, saveToCloud]);

  // Polling para manter dados atualizados entre abas/usuários
  useEffect(() => {
    loadFromCloud();
    const interval = setInterval(() => loadFromCloud(true), 15000);
    return () => clearInterval(interval);
  }, [loadFromCloud]);

  // Função para marcar que algo mudou
  const markDirty = () => { if (!isUpdatingFromRemote.current) isDirty.current = true; };

  // Handlers Envelopados para disparar o salvamento
  const wrappedSetVacancies = (v: any) => { markDirty(); setVacancies(v); };
  const wrappedSetParameters = (p: any) => { markDirty(); setParameters(p); };
  const wrappedSetAgencies = (a: any) => { markDirty(); setAgencies(a); };
  const wrappedSetUnits = (u: any) => { markDirty(); setUnits(u); };
  const wrappedSetProfiles = (p: any) => { markDirty(); setProfiles(p); };
  const wrappedSetConvocations = (c: any) => { markDirty(); setConvocations(c); };
  const wrappedSetUsers = (u: any) => { markDirty(); setUsers(u); };
  const wrappedSetEmailConfig = (e: any) => { markDirty(); setEmailConfig(e); };

  const addAuditLog = useCallback((action: string, details: string) => {
    if (!currentUser) return;
    const newLog: AuditLog = { id: generateId(), timestamp: new Date().toISOString(), user: currentUser.name, action, details };
    setLogs(prev => { markDirty(); return [newLog, ...prev].slice(0, 500); });
  }, [currentUser]);

  // Recuperação de Sessão Local
  useEffect(() => {
    const saved = localStorage.getItem('sistemp_session');
    if (saved) setCurrentUser(JSON.parse(saved));
  }, []);

  if (!currentUser) {
    return <LoginView users={users} onLogin={u => {
      setCurrentUser(u);
      localStorage.setItem('sistemp_session', JSON.stringify(u));
    }} />;
  }

  return (
    <Layout 
      activeTab={activeTab} setActiveTab={setActiveTab} 
      userRole={currentUser.role} userName={currentUser.name} 
      onLogout={() => { setCurrentUser(null); localStorage.removeItem('sistemp_session'); }}
      cloudStatus={cloudStatus} 
      onSync={() => { isDirty.current = false; loadFromCloud(); }}
    >
      {(() => {
        switch (activeTab) {
          case 'dashboard': return <DashboardView vacancies={vacancies} setVacancies={wrappedSetVacancies} convocations={convocations} onLog={addAuditLog} emailConfig={emailConfig} />;
          case 'vacancies': return <VacancyManagement vacancies={vacancies} setVacancies={wrappedSetVacancies} parameters={parameters} agencies={agencies} units={units} profiles={profiles} setAgencies={wrappedSetAgencies} setUnits={wrappedSetUnits} convocations={convocations} setConvocations={wrappedSetConvocations} userRole={currentUser.role} onLog={addAuditLog} />;
          case 'convocations': return <ConvocationManagement convocations={convocations} setConvocations={wrappedSetConvocations} profiles={profiles} onLog={addAuditLog} />;
          case 'reports': return <ReportsView vacancies={vacancies} convocations={convocations} />;
          case 'settings': return <SettingsView parameters={parameters} setParameters={wrappedSetParameters} agencies={agencies} setAgencies={wrappedSetAgencies} units={units} setUnits={wrappedSetUnits} profiles={profiles} setProfiles={wrappedSetProfiles} users={users} setUsers={wrappedSetUsers} vacancies={vacancies} convocations={convocations} onRestoreAll={d => { markDirty(); }} cloudStatus={cloudStatus} onLog={addAuditLog} emailConfig={emailConfig} setEmailConfig={wrappedSetEmailConfig} />;
          case 'audit': return <AuditView logs={logs} onClear={() => { markDirty(); setLogs([]); addAuditLog('LIMPEZA', 'Auditoria limpa.'); }} />;
          default: return <DashboardView vacancies={vacancies} setVacancies={wrappedSetVacancies} convocations={convocations} onLog={addAuditLog} emailConfig={emailConfig} />;
        }
      })()}
    </Layout>
  );
};

export default App;
