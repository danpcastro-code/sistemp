
import React, { useState } from 'react';
import { UserRole, User } from '../types';
import { ShieldCheck, Lock, User as UserIcon, AlertCircle, Info, RefreshCcw, KeyRound } from 'lucide-react';

interface LoginViewProps {
  users: User[];
  onLogin: (user: User) => void;
  onResetDefaults?: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ users = [], onLogin, onResetDefaults }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    const currentUsers = Array.isArray(users) ? users : [];
    const foundUser = currentUsers.find(u => 
        u.username.toLowerCase() === cleanUser && 
        u.password === cleanPass
    );
    
    if (foundUser) {
      onLogin(foundUser);
    } else {
      setError('Credenciais inválidas. Verifique seu usuário e senha e tente novamente.');
    }
  };

  const handleEmergencyReset = () => {
    if (confirm("Deseja restaurar as configurações de acesso originais de fábrica? Isso limpará permissões locais e restaurará os operadores padrão.")) {
        onResetDefaults?.();
        localStorage.clear();
        alert("Padrões de fábrica restaurados com sucesso.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-blue-600 rounded-3xl shadow-2xl shadow-blue-500/20 mb-6">
            <ShieldCheck size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">CTU Gestão</h1>
          <p className="text-slate-400 font-medium mt-2 uppercase tracking-widest text-[10px]">Controle de Contratos Temporários</p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden p-10">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso ao Sistema</h2>
          <p className="text-sm text-slate-500 mb-8">Identifique-se para gerenciar os dados operacionais.</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Usuário / Login</label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Seu identificador de acesso"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Senha</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                />
              </div>
            </div>

            {error && (
              <div className="flex flex-col space-y-2 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center space-x-2">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
                <button 
                    type="button" 
                    onClick={handleEmergencyReset}
                    className="flex items-center justify-center mt-2 py-2 bg-red-600 text-white rounded-xl text-[10px] uppercase font-black tracking-widest shadow-md active:scale-95 transition-all"
                >
                    <KeyRound size={12} className="mr-2" /> Restaurar Acesso Padrão
                </button>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl active:scale-95 mt-2"
            >
              Entrar no Sistema
            </button>
          </form>
        </div>
        
        <p className="text-center text-slate-600 text-[10px] font-bold uppercase mt-8 tracking-widest opacity-50">
          CTU Gestão v1.8.0 • Núcleo de Gestão de Pessoas
        </p>
      </div>
    </div>
  );
};

export default LoginView;
