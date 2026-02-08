import React, { useMemo } from 'react';
import { AuditLog } from '../types';
import { History, Search, Clock, User as UserIcon, CalendarDays } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface AuditViewProps {
  logs: AuditLog[];
}

const AuditView: React.FC<AuditViewProps> = ({ logs = [] }) => {
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

  // Use explicit Record type for groupedLogs to improve type safety
  const groupedLogs = useMemo<Record<string, AuditLog[]>>(() => {
    const groups: Record<string, AuditLog[]> = {};
    
    filteredLogs.forEach(log => {
      try {
        const date = parseISO(log.timestamp);
        // Formato para agrupamento: Mês Ano (ex: Janeiro 2024)
        // Usando Intl para garantir nomes em português se possível, ou fallback para format
        const monthYear = format(date, 'MMMM yyyy'); 
        if (!groups[monthYear]) groups[monthYear] = [];
        groups[monthYear].push(log);
      } catch {
        const fallback = "Período Indefinido";
        if (!groups[fallback]) groups[fallback] = [];
        groups[fallback].push(log);
      }
    });
    
    return groups;
  }, [filteredLogs]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Filtrar histórico permanente..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-xs"
          />
        </div>
        <div className="flex items-center text-slate-400 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
           <History size={14} className="mr-2" />
           <span className="text-[10px] font-black uppercase tracking-widest">{logs.length} Registros Auditados</span>
        </div>
      </div>

      <div className="space-y-10">
        {Object.keys(groupedLogs).length > 0 ? Object.entries(groupedLogs).map(([monthYear, items]) => (
          <div key={monthYear} className="space-y-4">
            <div className="flex items-center space-x-3 ml-4">
               <CalendarDays className="text-blue-500" size={18} />
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">{monthYear}</h3>
               <div className="h-px bg-slate-200 flex-1"></div>
               {/* Fix: cast items to AuditLog[] to resolve 'unknown' type error on .length property */}
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{(items as AuditLog[]).length} Ações</span>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[9px] uppercase tracking-widest font-black">
                      <th className="px-8 py-4">Data / Hora</th>
                      <th className="px-8 py-4">Operador</th>
                      <th className="px-8 py-4">Ação</th>
                      <th className="px-8 py-4">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Fix: cast items to AuditLog[] to resolve 'unknown' type error on .map property */}
                    {(items as AuditLog[]).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5 whitespace-nowrap text-[10px] text-slate-500 font-mono font-bold">
                          <div className="flex items-center">
                            <Clock size={12} className="mr-2 text-blue-500 opacity-40 group-hover:opacity-100 transition-opacity" />
                            {format(parseISO(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[10px] font-black mr-3 text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
                              {(log?.user || "??").substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-[11px] font-bold text-slate-700">{log?.user || "Sistema"}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                            {log?.action}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-[10px] text-slate-500 leading-relaxed font-medium">
                          {log?.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )) : (
          <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 py-32 flex flex-col items-center justify-center text-center">
              <History size={64} className="text-slate-100 mb-6" />
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Histórico de Auditoria</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest max-w-xs">Nenhum registro encontrado para os filtros aplicados.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditView;