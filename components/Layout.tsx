
import React from 'react';
import { LayoutDashboard, Users, FileText, Settings, History, Menu, X, Award, LogOut, ShieldCheck, CloudOff, RefreshCw, Zap, Wifi, Save, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { UserRole } from '../types';
import { format } from 'date-fns';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  userName?: string;
  onLogout: () => void;
  cloudStatus?: 'idle' | 'syncing' | 'error' | 'connected' | 'setup_required';
  onSync?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  userRole, 
  userName, 
  onLogout,
  cloudStatus,
  onSync
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.HR] },
    { id: 'vacancies', label: 'Vagas (Grupos)', icon: Users, roles: [UserRole.ADMIN, UserRole.HR, UserRole.CONSULTANT] },
    { id: 'convocations', label: 'Classificados PSS', icon: FileSpreadsheet, roles: [UserRole.ADMIN, UserRole.HR] },
    { id: 'reports', label: 'Relatórios', icon: FileText, roles: [UserRole.ADMIN, UserRole.HR] },
    { id: 'settings', label: 'Parametrização', icon: Settings, roles: [UserRole.ADMIN] },
    { id: 'audit', label: 'Auditoria', icon: History, roles: [UserRole.ADMIN] },
  ].filter(item => item.roles.includes(userRole));

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-slate-300 flex-shrink-0 transition-all duration-300 flex flex-col shadow-2xl z-20`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          {isSidebarOpen && (
            <div className="flex items-center space-x-2">
              <ShieldCheck className="text-blue-500" size={24} />
              <span className="font-bold text-xl text-white tracking-tight">SisTemp</span>
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-slate-800 rounded transition-colors">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center p-3 rounded-xl transition-all ${
                activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'hover:bg-slate-800'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'mr-3' : 'mx-auto md:mr-3'} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border ${userRole === UserRole.ADMIN ? 'bg-blue-600 border-blue-400 text-white' : userRole === UserRole.HR ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'}`}>
              {userRole === UserRole.ADMIN ? 'ADM' : userRole === UserRole.HR ? 'RH' : 'CON'}
            </div>
            {isSidebarOpen && (
              <div className="text-xs">
                <p className="font-bold text-white truncate max-w-[120px]">{userName}</p>
                <p className="text-slate-500 text-[9px] uppercase font-bold">
                  {userRole === UserRole.ADMIN ? 'Administrador' : userRole === UserRole.HR ? 'RH Operacional' : 'Consulta'}
                </p>
              </div>
            )}
          </div>
          <button onClick={onLogout} className="w-full flex items-center p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut size={20} className={isSidebarOpen ? 'mr-3' : ''} />
            {isSidebarOpen && <span className="font-bold">Sair</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-50 relative">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold text-slate-800">{menuItems.find(i => i.id === activeTab)?.label}</h1>

            <div className="flex items-center pl-6 border-l border-slate-100">
               {cloudStatus === 'connected' ? (
                 <div className="flex items-center text-green-600 bg-green-50 px-4 py-1.5 rounded-full border-2 border-green-200 shadow-sm">
                    <Zap size={14} className="text-green-500 mr-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Memorizado na Nuvem</span>
                 </div>
               ) : cloudStatus === 'syncing' ? (
                 <div className="flex items-center text-amber-600 bg-amber-50 px-4 py-1.5 rounded-full border-2 border-amber-200 shadow-sm animate-pulse">
                    <RefreshCw size={14} className="mr-2 animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</span>
                 </div>
               ) : cloudStatus === 'setup_required' ? (
                 <div className="flex items-center text-red-600 bg-red-50 px-4 py-1.5 rounded-full border-2 border-red-500 shadow-sm cursor-pointer" onClick={() => setActiveTab('settings')}>
                    <AlertTriangle size={14} className="mr-2 animate-bounce" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Reparo Necessário (Ver Config)</span>
                 </div>
               ) : cloudStatus === 'error' ? (
                 <div className="flex items-center text-red-600 bg-red-50 px-4 py-1.5 rounded-full border-2 border-red-200 shadow-sm">
                    <CloudOff size={14} className="mr-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Erro na Gravação</span>
                 </div>
               ) : (
                 <div className="flex items-center text-slate-400 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200 opacity-60">
                    <Save size={14} className="mr-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Local</span>
                 </div>
               )}
               
               <button onClick={onSync} className="ml-3 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100" title="Forçar Sincronização">
                 <RefreshCw size={14} />
               </button>
            </div>
          </div>
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
            {format(new Date(), 'dd-MM-yyyy')}
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
