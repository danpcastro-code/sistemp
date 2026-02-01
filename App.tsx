
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Allocations from './components/Allocations';
import AuditTrail from './components/AuditTrail';
import NominatedCandidates from './components/NominatedCandidates';
import StructureView from './components/StructureView';
import Login from './components/Login';
import { 
  initialAlocacoes, carreiras as initialCarreiras, cargos as initialCargos, edicoes as initialEdicoes, unidades as initialUnidades, portarias as initialPortarias
} from './mockData';
import { Alocacao, HistoricoAlteracao, User, CandidatoNomeado, Cargo, EdicaoCPNU, Unidade, Carreira, Portaria, UserRole } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [alocacoes, setAlocacoes] = useState<Alocacao[]>(initialAlocacoes);
  const [cargos, setCargos] = useState<Cargo[]>(initialCargos);
  const [carreiras, setCarreiras] = useState<Carreira[]>(initialCarreiras);
  const [edicoes, setEdicoes] = useState<EdicaoCPNU[]>(initialEdicoes);
  const [portarias, setPortarias] = useState<Portaria[]>(initialPortarias);
  const [unidades, setUnidades] = useState<Unidade[]>(initialUnidades);
  const [nomeados, setNomeados] = useState<CandidatoNomeado[]>([]);
  const [historico, setHistorico] = useState<HistoricoAlteracao[]>([]);
  
  const [users, setUsers] = useState<User[]>([
    { id: 'u1', nome: 'Administrador Central', perfil: UserRole.ADMIN, email: 'admin@mgi.gov.br' },
    { id: 'u2', nome: 'Gestor de RH - SEGES', perfil: UserRole.RH, email: 'rh.seges@mgi.gov.br' }
  ]);

  useEffect(() => {
    const savedSession = sessionStorage.getItem('siscal_session');
    if (savedSession) setUser(JSON.parse(savedSession));
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    sessionStorage.setItem('siscal_session', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('siscal_session');
    setActiveTab('dashboard');
  };

  const addLog = useCallback((log: Omit<HistoricoAlteracao, 'id' | 'dataHora'>) => {
    const newLog: HistoricoAlteracao = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      dataHora: new Date().toISOString()
    };
    setHistorico(prev => [...prev, newLog]);
  }, []);

  const dynamicAlocacoes = useMemo(() => {
    return alocacoes.map(aloc => {
      const vinculados = nomeados.filter(n => n.uorgId === aloc.uorgId && n.cargoId === aloc.cargoId && n.portariaId === aloc.portariaId);
      return { 
        ...aloc, 
        vagasNomeadas: vinculados.length,
        vagasPosses: vinculados.filter(n => !!n.dataPosse).length,
        vagasEfetivadas: vinculados.filter(n => !!n.dataExercicio).length 
      };
    });
  }, [alocacoes, nomeados]);

  // Handlers de Alocação
  const handleUpdateAlocacao = (updated: Alocacao, justification: string) => {
    if (!user) return;
    setAlocacoes(prev => prev.map(a => a.id === updated.id ? updated : a));
    addLog({ alocacaoId: updated.id, tipo: 'EDIÇÃO', usuarioId: user.id, usuarioNome: user.nome, justificativa: justification });
  };

  const handleCreateAlocacao = (newAlloc: Omit<Alocacao, 'id'>, justification: string) => {
    if (!user) return;
    const id = 'a' + Date.now();
    setAlocacoes(prev => [...prev, { ...newAlloc, id, dataRegistro: new Date().toISOString(), vagasEfetivadas: 0 }]);
    addLog({ alocacaoId: id, tipo: 'CRIAÇÃO', usuarioId: user.id, usuarioNome: user.nome, justificativa: justification });
  };

  const handleDeleteAlocacao = (id: string, justification: string) => {
    if (!user) return;
    setAlocacoes(prev => prev.filter(a => a.id !== id));
    addLog({ alocacaoId: id, tipo: 'EXCLUSÃO', usuarioId: user.id, usuarioNome: user.nome, justificativa: justification });
  };

  // Handlers de Candidatos
  const handleUpdateCandidato = (id: string, updated: Partial<CandidatoNomeado>) => {
    setNomeados(prev => prev.map(n => n.id === id ? { ...n, ...updated } : n));
  };
  const handleImportNomeados = (newList: CandidatoNomeado[]) => setNomeados(prev => [...prev, ...newList]);

  // Handlers de Parâmetros
  const handleCreateUnidade = (u: Unidade) => setUnidades(prev => [...prev, u]);
  const handleUpdateUnidade = (uorg: string, updated: Partial<Unidade>) => setUnidades(prev => prev.map(u => u.uorg === uorg ? {...u, ...updated} : u));
  
  const handleCreateCarreira = (c: Omit<Carreira, 'id'>) => setCarreiras(prev => [...prev, {...c, id: 'c' + Date.now()}]);
  const handleUpdateCarreira = (id: string, updated: Partial<Carreira>) => setCarreiras(prev => prev.map(c => c.id === id ? {...c, ...updated} : c));

  const handleCreatePortaria = (p: Omit<Portaria, 'id'>) => setPortarias(prev => [...prev, {...p, id: 'p' + Date.now()}]);
  const handleUpdatePortaria = (id: string, updated: Partial<Portaria>) => setPortarias(prev => prev.map(p => p.id === id ? {...p, ...updated} : p));

  const handleCreateUser = (newUser: Omit<User, 'id'>) => setUsers(prev => [...prev, { ...newUser, id: 'u' + Date.now(), dataCriacao: new Date().toISOString() }]);
  const handleDeleteUser = (id: string) => setUsers(prev => prev.filter(u => u.id !== id));

  // Handler de Restauração de Backup
  const handleRestoreDatabase = (backup: any) => {
    if (backup.alocacoes) setAlocacoes(backup.alocacoes);
    if (backup.nomeados) setNomeados(backup.nomeados);
    if (backup.unidades) setUnidades(backup.unidades);
    if (backup.carreiras) setCarreiras(backup.carreiras);
    if (backup.portarias) setPortarias(backup.portarias);
    if (backup.edicoes) setEdicoes(backup.edicoes);
    if (backup.users) setUsers(backup.users);
    if (backup.historico) setHistorico(backup.historico);
    if (backup.cargos) setCargos(backup.cargos);
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <Layout user={user} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>
      {activeTab === 'dashboard' && <Dashboard alocacoes={dynamicAlocacoes} nomeados={nomeados} carreiras={carreiras} cargos={cargos} unidades={unidades} edicoes={edicoes} />}
      {activeTab === 'alocacoes' && <Allocations alocacoes={dynamicAlocacoes} carreiras={carreiras} cargos={cargos} unidades={unidades} edicoes={edicoes} portarias={portarias} user={user} onUpdate={handleUpdateAlocacao} onCreate={handleCreateAlocacao} onDelete={handleDeleteAlocacao} />}
      {activeTab === 'nomeados' && <NominatedCandidates nomeados={nomeados} unidades={unidades} cargos={cargos} alocacoes={dynamicAlocacoes} portarias={portarias} user={user} onImport={handleImportNomeados} onUpdateCandidato={handleUpdateCandidato} onDeleteCandidato={(id) => setNomeados(prev => prev.filter(n => n.id !== id))} />}
      {activeTab === 'historico' && <AuditTrail historico={historico} />}
      {activeTab === 'cadastros' && (
        <StructureView 
          unidades={unidades} cargos={cargos} carreiras={carreiras} edicoes={edicoes} portarias={portarias} alocacoes={dynamicAlocacoes}
          users={users} historico={historico} nomeados={nomeados}
          onCreateUser={handleCreateUser} onDeleteUser={handleDeleteUser}
          onUpdateCargo={id => {}} onCreateCargo={c => {}} onDeleteCargo={id => {}}
          onUpdateEdicao={id => {}} onCreateEdicao={e => {}} 
          onUpdatePortaria={handleUpdatePortaria} onCreatePortaria={handleCreatePortaria} onDeletePortaria={id => {}}
          onUpdateUnidade={handleUpdateUnidade} onCreateUnidade={handleCreateUnidade} 
          onUpdateCarreira={handleUpdateCarreira} onCreateCarreira={handleCreateCarreira} 
          onUpdateAlocacao={handleUpdateAlocacao}
          onRestoreDatabase={handleRestoreDatabase}
        />
      )}
    </Layout>
  );
};

export default App;
