
import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer as RC } from 'recharts';
import { Vacancy, VacancyStatus, ContractStatus, ConvokedPerson, EmailConfig, PSS, Occupation, ConvocationStatus } from '../types';
import { getWarningInfo, formatDisplayDate } from '../utils';
import { 
  Bell, CheckCircle, UserMinus, Users, Mail, FastForward, UserX, Clock, Send, 
  RefreshCw, Loader2, TrendingUp, ClipboardList, X, Zap, ArrowUpRight, 
  BarChart3, Activity, Filter, Search, Calendar, MapPin, Building2, Briefcase, 
  ChevronRight, AlertTriangle, Timer, Hourglass, Percent
} from 'lucide-react';
import { format, parseISO, addYears, isAfter, isBefore, isValid, differenceInDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface DashboardViewProps {
  vacancies: Vacancy[];
  setVacancies: React.Dispatch<React.SetStateAction<Vacancy[]>>;
  convocations: ConvokedPerson[];
  pssList: PSS[];
  onLog: (action: string, details: string) => void;
  emailConfig: EmailConfig;
}

const DashboardView: React.FC<DashboardViewProps> = ({ vacancies, setVacancies, convocations, pssList, onLog, emailConfig }) => {
  const [filterAgency, setFilterAgency] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');
  const [filterProfile, setFilterProfile] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [isSending, setIsSending] = useState<string | null>(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendingData, setExtendingData] = useState<{ occ: Occupation, vacancyCode: string } | null>(null);
  const [extAmendmentTerm, setExtAmendmentTerm] = useState('');
  const [extNewEndDate, setExtNewEndDate] = useState('');

  // Identifica IDs de editais ativos
  const activePssIds = useMemo(() => pssList.filter(p => !p.isArchived).map(p => p.id), [pssList]);

  // Aplicação dos Filtros nos Dados + Filtro de Arquivados
  const filteredVacancies = useMemo(() => {
    return vacancies.filter(v => {
      // Regra: Editais arquivados não compõem o dashboard
      const isPssActive = v.pssId ? activePssIds.includes(v.pssId) : true;
      if (!isPssActive) return false;

      const matchAgency = filterAgency === 'all' || v.agency === filterAgency;
      const matchUnit = filterUnit === 'all' || v.unit === filterUnit;
      const matchProfile = filterProfile === 'all' || v.type === filterProfile;
      return matchAgency && matchUnit && matchProfile;
    });
  }, [vacancies, filterAgency, filterUnit, filterProfile, activePssIds]);

  const stats = useMemo(() => {
    const totalSlots = filteredVacancies.reduce((acc, v) => acc + v.initialQuantity, 0);
    const occupations = filteredVacancies.flatMap(v => v.occupations);
    
    const activeOccupations = occupations.filter(o => {
      const matchStatus = filterStatus === 'all' || o.status === filterStatus;
      return o.status === ContractStatus.ACTIVE && matchStatus;
    });

    const endedOccupations = occupations.filter(o => o.status === ContractStatus.ENDED);
    
    const occupiedCount = activeOccupations.length;
    const occupancyRate = totalSlots > 0 ? (occupiedCount / totalSlots) * 100 : 0;

    const pssIds = Array.from(new Set(filteredVacancies.map(v => v.pssId).filter(Boolean)));
    let totalNoticeFillDays = 0;
    let noticesWithHires = 0;

    pssIds.forEach(pssId => {
      const pssVacancies = filteredVacancies.filter(v => v.pssId === pssId);
      if (pssVacancies.length === 0) return;

      const earliestCreationDate = pssVacancies.reduce((min, v) => {
        if (!min) return v.creationDate;
        return isBefore(parseISO(v.creationDate), parseISO(min)) ? v.creationDate : min;
      }, '');

      const pssOccupations = pssVacancies.flatMap(v => v.occupations);
      const earliestHireDate = pssOccupations.reduce((min, o) => {
        if (!min) return o.startDate;
        return isBefore(parseISO(o.startDate), parseISO(min)) ? o.startDate : min;
      }, '');

      if (earliestCreationDate && earliestHireDate) {
        totalNoticeFillDays += differenceInDays(parseISO(earliestHireDate), parseISO(earliestCreationDate));
        noticesWithHires++;
      }
    });

    const timeToFill = noticesWithHires > 0 ? Math.round(totalNoticeFillDays / noticesWithHires) : 0;

    const averageStay = occupations.length > 0 ? occupations.reduce((acc, o) => {
        const end = o.status === ContractStatus.ACTIVE ? new Date() : parseISO(o.endDate);
        return acc + Math.max(0, differenceInDays(end, parseISO(o.startDate)));
    }, 0) / occupations.length : 0;

    const turnover = occupations.length > 0 ? (endedOccupations.length / occupations.length) * 100 : 0;

    const unitStats = Array.from(new Set(filteredVacancies.map(v => v.unit))).map(unit => {
        const vUnit = filteredVacancies.filter(v => v.unit === unit);
        const slots = vUnit.reduce((a, b) => a + b.initialQuantity, 0);
        const occupied = vUnit.flatMap(v => v.occupations).filter(o => o.status === ContractStatus.ACTIVE).length;
        return { name: unit, ocupados: occupied, livres: slots - occupied };
    }).sort((a,b) => b.ocupados - a.ocupados).slice(0, 8);

    return {
      totalSlots,
      occupiedCount,
      freeCount: totalSlots - occupiedCount,
      occupancyRate: occupancyRate.toFixed(1),
      turnover: turnover.toFixed(1),
      timeToFill,
      averageStay: Math.round(averageStay),
      unitStats
    };
  }, [filteredVacancies, filterStatus]);

  const activeAlerts = useMemo(() => {
    return filteredVacancies.flatMap(v => 
      v.occupations
        .filter(o => o.status === ContractStatus.ACTIVE)
        .map(o => ({ ...o, warning: getWarningInfo(o), vacancyCode: v.code }))
    ).filter(o => o.warning.isWarning)
     .sort((a, b) => a.warning.daysLeft - b.warning.daysLeft);
  }, [filteredVacancies]);

  const triggerFastExtension = (alertOcc: any) => {
    const { warning, vacancyCode, ...pureOcc } = alertOcc;
    setExtendingData({ occ: pureOcc as Occupation, vacancyCode: alertOcc.vacancyCode });
    setExtNewEndDate(format(addYears(parseISO(alertOcc.endDate), 1), 'yyyy-MM-dd'));
    setExtAmendmentTerm('');
    setShowExtendModal(true);
  };

  const handleConfirmExtension = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendingData) return;
    setVacancies(prev => prev.map(v => v.code === extendingData.vacancyCode ? {
      ...v,
      occupations: v.occupations.map(o => o.id === extendingData.occ.id ? {
        ...o,
        endDate: extNewEndDate,
        amendmentTerm: extAmendmentTerm,
        isExtensionRequired: extNewEndDate < o.projectedFinalDate
      } : o)
    } : v));
    setShowExtendModal(false);
    onLog('PRORROGAÇÃO_DASHBOARD', `Contrato de ${extendingData.occ.contractedName} prorrogado até ${extNewEndDate}.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center text-slate-400 mr-2">
            <Filter size={18} className="mr-2" />
            <span className="text-[10px] font-black uppercase tracking-widest">Filtros Globais</span>
        </div>
        <select value={filterAgency} onChange={e => setFilterAgency(e.target.value)} className="min-w-[150px] bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-bold uppercase outline-none focus:border-blue-500">
            <option value="all">Todos os Órgãos</option>
            {Array.from(new Set(vacancies.map(v => v.agency))).sort().map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)} className="min-w-[150px] bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-bold uppercase outline-none focus:border-blue-500">
            <option value="all">Todas as Unidades</option>
            {Array.from(new Set(vacancies.map(v => v.unit))).sort().map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <button onClick={() => { setFilterAgency('all'); setFilterUnit('all'); setFilterProfile('all'); setFilterStatus('all'); }} className="p-2.5 text-slate-400 hover:text-red-500 transition-all"><X size={18} /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Taxa de Ocupação" value={`${stats.occupancyRate}%`} sub={`${stats.occupiedCount} de ${stats.totalSlots} postos`} icon={<Percent className="text-blue-600" />} color="border-blue-500" />
        <StatCard title="Rotatividade (Turnover)" value={`${stats.turnover}%`} sub="Encerrados vs Totais" icon={<TrendingUp className="text-red-600" />} color="border-red-500" />
        <StatCard title="Tempo Médio Preenchimento" value={`${stats.timeToFill}d`} sub="PSS até 1ª contratação" icon={<Timer className="text-indigo-600" />} color="border-indigo-500" />
        <StatCard title="Permanência Média" value={`${stats.averageStay}d`} sub="Contratos ativos" icon={<Hourglass className="text-amber-600" />} color="border-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center">
                    <BarChart3 className="mr-3 text-blue-600" size={20} /> Capacidade por Unidade
                </h3>
            </div>
            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.unitStats} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} width={120} />
                        <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '15px', border: 'none', fontSize: 10 }} />
                        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 20, fontSize: 10, fontWeight: 900 }} />
                        <Bar dataKey="ocupados" name="Ocupados" stackId="a" fill="#3b82f6" barSize={20} />
                        <Bar dataKey="livres" name="Livres" stackId="a" fill="#e2e8f0" barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center">
                    <AlertTriangle className="mr-3 text-orange-600" size={20} /> Riscos Contratuais (90d)
                </h3>
                <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-orange-100">{activeAlerts.length}</span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[350px]">
                {activeAlerts.map(occ => (
                    <div key={occ.id} className="p-4 rounded-2xl border flex items-center justify-between bg-slate-50 border-slate-100 group">
                        <div className="truncate">
                            <p className="text-[11px] font-black text-slate-800 truncate">{occ.contractedName}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase truncate">{occ.warning.label} • {occ.warning.daysLeft}d</p>
                        </div>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {occ.warning.type === 'extension' && <button onClick={() => triggerFastExtension(occ)} className="p-2 bg-white text-blue-600 border border-blue-100 rounded-lg"><FastForward size={14} /></button>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {showExtendModal && extendingData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-sm w-full p-10 shadow-2xl border border-slate-100">
            <h2 className="text-2xl font-black mb-8 text-slate-800 uppercase tracking-tighter">Prorrogar: {extendingData.occ.contractedName}</h2>
            <form onSubmit={handleConfirmExtension} className="space-y-6">
              <input value={extAmendmentTerm} onChange={e => setExtAmendmentTerm(e.target.value)} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" placeholder="Termo Aditivo" />
              <input type="date" value={extNewEndDate} onChange={e => setExtNewEndDate(e.target.value)} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowExtendModal(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px]">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{title: string, value: string | number, sub: string, icon: React.ReactNode, color: string}> = ({ title, value, sub, icon, color }) => (
  <div className={`bg-white p-6 rounded-[2rem] shadow-sm border-l-4 ${color}`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-400 text-[9px] font-black uppercase mb-1">{title}</p>
        <p className="text-2xl font-black text-slate-800 tracking-tighter">{value}</p>
        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{sub}</p>
      </div>
      <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
    </div>
  </div>
);

export default DashboardView;
