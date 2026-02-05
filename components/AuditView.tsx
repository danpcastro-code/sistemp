
import React, { useMemo } from 'react';
import { AuditLog } from '../types';
import { History, Search, Trash2, Clock, User as UserIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface AuditViewProps {
  logs: AuditLog[];
  onClear: () => void;
}

const AuditView: React.FC<AuditViewProps> = ({ logs = [], onClear }) => {
  const [search, setSearch] = React.useState('');
  
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const action = l?.action?.toLowerCase() || "";
      const details = l?.details?.toLowerCase() || "";
      const user = l?.user?.toLowerCase() || "";
      const query = search.toLowerCase();
      
      return action.includes(query) || details.includes(query) || user.includes(query);
    }).sort((a, b) => {
        const timeA = a?.timestamp || "";
        const timeB = b?.timestamp || "";
        return timeB.localeCompare(timeA);
    });
  }, [logs, search]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Filtrar histórico..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
          />
        </div>
        <button 
          onClick={() => confirm('Deseja realmente limpar todo o histórico de auditoria?') && onClear()}
          className="flex items-center space-x-2 px-6 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-all border border-transparent hover:border-red-100"
        >
          <Trash2 size={18} />
          <span>Limpar Logs</span>
        </button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                <th className="px-8 py-5">Data / Hora</th>
                <th className="px-8 py-5">Operador</th>
                <th className="px-8 py-5">Ação Realizada</th>
                <th className="px-8 py-5">Detalhes Técnicos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const dateStr = log?.timestamp || new Date().toISOString();
                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5 whitespace-nowrap text-[11px] text-slate-500 font-mono font-bold">
                      <div className="flex items-center">
                        <Clock size={12} className="mr-2 text-blue-500 opacity-60" />
                        {format(parseISO(dateStr), 'dd-MM-yyyy HH:mm:ss')}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black mr-3 text-slate-400 border border-slate-200">
                          {(log?.user || "??").substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-slate-700">{log?.user || "Sistema"}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 shadow-sm">
                        {log?.action || "AÇÃO DESCONHECIDA"}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-[11px] text-slate-500 leading-relaxed font-medium">
                      {log?.details || "Sem detalhes adicionais."}
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-16 text-center text-slate-300 italic">
                    <div className="flex flex-col items-center">
                        <History size={48} className="mb-4 opacity-10" />
                        <p className="font-bold uppercase text-[10px] tracking-widest">Nenhum registro de auditoria disponível</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditView;
