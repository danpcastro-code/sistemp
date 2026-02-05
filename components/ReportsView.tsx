
import React, { useState, useMemo } from 'react';
import { Vacancy, ConvokedPerson, ContractStatus } from '../types';
import { maskCPF, calculateDaysUsed, formatDisplayDate } from '../utils';
import { FileText, Download, Filter, Search, Briefcase, Calendar, Clock, ArrowUpDown, Info, MapPin } from 'lucide-react';
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns';

interface ReportsViewProps {
  vacancies: Vacancy[];
  convocations: ConvokedPerson[];
}

const ReportsView: React.FC<ReportsViewProps> = ({ vacancies, convocations }) => {
  const [selectedNotice, setSelectedNotice] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedCargo, setSelectedCargo] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const availableNotices = useMemo(() => Array.from(new Set(vacancies.map(v => v.publicNotice))).sort(), [vacancies]);
  const availableUnits = useMemo(() => Array.from(new Set(vacancies.map(v => v.unit))).sort(), [vacancies]);
  const availableCargos = useMemo(() => Array.from(new Set(vacancies.map(v => v.type))).sort(), [vacancies]);

  const reportData = useMemo(() => {
    const today = startOfDay(new Date());
    const flatData = vacancies.flatMap(v => {
      if (selectedNotice !== 'all' && v.publicNotice !== selectedNotice) return [];
      if (selectedUnit !== 'all' && v.unit !== selectedUnit) return [];
      if (selectedCargo !== 'all' && v.type !== selectedCargo) return [];
      
      return v.occupations.map(occ => {
        const daysUsedCurrent = differenceInDays(parseISO(occ.endDate), parseISO(occ.startDate)) + 1;
        const remainingInContract = Math.max(0, differenceInDays(parseISO(occ.endDate), today));
        const remainingProjected = Math.max(0, differenceInDays(parseISO(occ.projectedFinalDate), today));
        
        return { 
          vacancy: v, 
          occupation: occ, 
          person: convocations.find(p => p.id === occ.personId),
          daysUsedCurrent,
          remainingInContract,
          remainingProjected,
          maxDaysVaga: v.maxTermDays
        };
      });
    });

    if (!searchTerm) return flatData;
    return flatData.filter(d => 
      d.occupation.contractedName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.vacancy.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [selectedNotice, selectedUnit, selectedCargo, searchTerm, vacancies, convocations]);

  const exportCSV = () => {
    const headers = ["Edital", "Unidade", "Candidato", "Nº Vaga/Posto", "Ciclo Ocupação", "Início Contrato", "Expectativa de Fim", "Projeção Máxima Vaga", "Dias Restantes Contratado", "Saldo Projetado (Limite Lei)", "Situação"];
    const rows = reportData.map(d => [
      d.vacancy.publicNotice,
      d.vacancy.unit,
      d.occupation.contractedName,
      `${d.vacancy.code} (Posto ${d.occupation.slotIndex})`,
      `${d.occupation.order}ª Ocupação`,
      formatDisplayDate(d.occupation.startDate),
      formatDisplayDate(d.occupation.endDate),
      formatDisplayDate(d.occupation.projectedFinalDate),
      d.remainingInContract,
      d.remainingProjected,
      d.occupation.status
    ]);
    
    const content = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_report_sistemp_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><FileText size={24}/></div>
            <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Relatório de Auditoria Integral</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Controle de Ciclos e Prazos Lei 8.745/93</p>
            </div>
          </div>
          <button onClick={exportCSV} className="flex items-center space-x-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95">
            <Download size={16} /> <span>Exportar CSV</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative col-span-1 md:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input type="text" placeholder="Nome ou Código da Vaga..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none" />
          </div>
          <select value={selectedNotice} onChange={e => setSelectedNotice(e.target.value)} className="pl-4 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-tighter text-slate-600 outline-none">
            <option value="all">TODOS EDITAIS</option>
            {availableNotices.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)} className="pl-4 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-tighter text-slate-600 outline-none">
            <option value="all">TODAS UNIDADES</option>
            {availableUnits.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={selectedCargo} onChange={e => setSelectedCargo(e.target.value)} className="pl-4 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-tighter text-slate-600 outline-none">
            <option value="all">TODOS PERFIS</option>
            {availableCargos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-6 py-5">Posto / Ciclo</th>
                <th className="px-6 py-5">Contratado / CPF</th>
                <th className="px-6 py-5">Datas do Contrato</th>
                <th className="px-6 py-5">Projeção Máxima</th>
                <th className="px-6 py-5 text-center">Saldo Contrato</th>
                <th className="px-6 py-5 text-center">Saldo Projetado (Lei)</th>
                <th className="px-6 py-5 text-right">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.length > 0 ? reportData.map((d, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-5">
                    <p className="font-black text-slate-800">{d.vacancy.code} (P{d.occupation.slotIndex})</p>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border mt-1 block w-fit ${d.occupation.order === 1 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                        {d.occupation.order}ª Ocupação
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-bold text-slate-700">{d.occupation.contractedName}</p>
                    <p className="text-[9px] text-slate-400 font-mono">{d.person ? maskCPF(d.person.cpf) : 'Não Identificado'}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                        <span className="text-slate-400">{formatDisplayDate(d.occupation.startDate)} a</span>
                        <span className="font-bold text-slate-700">{formatDisplayDate(d.occupation.endDate)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-bold text-red-500">{formatDisplayDate(d.occupation.projectedFinalDate)}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex flex-col">
                        <span className="font-black text-slate-800">{d.remainingInContract} dias</span>
                        <div className="w-12 h-1 bg-slate-100 mx-auto rounded-full mt-1 overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (d.remainingInContract / 365) * 100)}%` }} />
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex flex-col">
                        <span className="font-black text-indigo-600">{d.remainingProjected} dias</span>
                        <div className="w-12 h-1 bg-slate-100 mx-auto rounded-full mt-1 overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(100, (d.remainingProjected / d.maxDaysVaga) * 100)}%` }} />
                        </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${d.occupation.status === ContractStatus.ACTIVE ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                        {d.occupation.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="px-6 py-20 text-center text-slate-300 italic font-bold uppercase text-[10px]">Nenhum dado encontrado para auditoria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
