
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
import { format, parseISO, addYears, isAfter, isValid, differenceInDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface DashboardViewProps {
  vacancies: Vacancy[];
  setVacancies: React.Dispatch<React.SetStateAction<Vacancy[]>>;
  convocations: ConvokedPerson[];
  pssList: PSS[];
  onLog: (action: string, details: string) => void;
  emailConfig: EmailConfig;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6366f1'];

const DashboardView: React.FC<DashboardViewProps> = ({ vacancies, setVacancies, convocations, pssList, onLog, emailConfig }) => {
  // Estados de Filtros Globais
  const [filterAgency, setFilterAgency] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');
  const [filterProfile, setFilterProfile] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Estados de Modais
  const [isSending, setIsSending] = useState<string | null>(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendingData, setExtendingData] = useState<{ occ: Occupation, vacancyCode: string } | null>(null);
  const [extAmendmentTerm, setExtAmendmentTerm] = useState('');
  const [extNewEndDate, setExtNewEndDate] = useState('');

  // Opções para os Filtros
  const agenciesOptions = useMemo(() => Array.from(new Set(vacancies.map(v => v.agency))).sort(), [vacancies]);
  const unitsOptions = useMemo(() => Array.from(new Set(vacancies.map(v => v.unit))).sort(), [vacancies]);
  const profilesOptions = useMemo(() => Array.from(new Set(vacancies.map(v => v.type))).sort(), [vacancies]);

  // Aplicação dos Filtros nos Dados
  const filteredVacancies = useMemo(() => {
    return vacancies.filter(v => {
      const matchAgency = filterAgency === 'all' || v.agency === filterAgency;
      const matchUnit = filterUnit === 'all' || v.unit === filterUnit;
      const matchProfile = filterProfile === 'all' || v.type === filterProfile;
      return matchAgency && matchUnit && matchProfile;
    });
  }, [vacancies, filterAgency, filterUnit, filterProfile]);

  // Cálculos de Indicadores Evoluídos
  const stats = useMemo(() => {
    const totalSlots = filteredVacancies.reduce((acc, v) => acc + v.initialQuantity, 0);
    const occupations = filteredVacancies.flatMap(v => v.occupations);
    
    const activeOccupations = occupations.filter(o => {
      const matchStatus = filterStatus === 'all' || o.status === filterStatus;
      return o.status === ContractStatus.ACTIVE && matchStatus;
    });

    const endedOccupations = occupations.filter(o => o.status === ContractStatus.ENDED);
    
    // Capacidade
    const occupiedCount = activeOccupations.length;
    const freeCount = totalSlots - occupiedCount;
    const occupancyRate = totalSlots > 0 ? (occupiedCount / totalSlots) * 100 : 0;

    // Tempos Médios (em dias)
    const timeToFill = filteredVacancies.reduce((acc, v) => {
        const firstOcc = v.occupations.sort((a,b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime())[0];
        if (firstOcc) {
            return acc + differenceInDays(parseISO(firstOcc.startDate), parseISO(v.creationDate));
        }
        return acc;
    }, 0) / (filteredVacancies.filter(v => v.occupations.length > 0).length || 1);

    const averageStay = occupations.reduce((acc, o) => {
        const end = o.status === ContractStatus.ACTIVE ? new Date() : parseISO(o.endDate);
        return acc + differenceInDays(end, parseISO(o.startDate));
    }, 0) / (occupations.length || 1);

    // Rotatividade (Turnover)
    const turnover = occupations.length > 0 ? (endedOccupations.length / occupations.length) * 100 : 0;

    // Dados para Gráfico de Unidades (Barras Empilhadas)
    const unitStats = Array.from(new Set(filteredVacancies.map(v => v.unit))).map(unit => {
        const vUnit = filteredVacancies.filter(v => v.unit === unit);
        const slots = vUnit.reduce((a, b) => a + b.initialQuantity, 0);
        const occupied = vUnit.flatMap(v => v.occupations).filter(o => o.status === ContractStatus.ACTIVE).length;
        return { name: unit, ocupados: occupied, livres: slots - occupied };
    }).sort((a,b) => b.ocupados - a.ocupados).slice(0, 8);

    return {
      totalSlots,
      occupiedCount,
      freeCount,
      occupancyRate: occupancyRate.toFixed(1),
      turnover: turnover.toFixed(1),
      timeToFill: Math.round(timeToFill),
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

  // Ações Diretas
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
      
      {/* BARRA DE FILTROS GLOBAIS */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center text-slate-400 mr-2">
            <Filter size={18} className="mr-2" />
            <span className="text-[10px] font-black uppercase tracking-widest">Filtros Globais</span>
        </div>
        
        <div className="flex-1 min-w-[150px] relative">
            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
            <select value={filterAgency} onChange={e => setFilterAgency(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold uppercase outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
                <option value="all">Todos os Órgãos</option>
                {agenciesOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>

        <div className="flex-1 min-w-[150px] relative">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
            <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold uppercase outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
                <option value="all">Todas as Unidades</option>
                {unitsOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>

        <div className="flex-1 min-w-[150px] relative">
            <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
            <select value={filterProfile} onChange={e => setFilterProfile(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold uppercase outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
                <option value="all">Todos os Perfis</option>
                {profilesOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>

        <button 
            onClick={() => { setFilterAgency('all'); setFilterUnit('all'); setFilterProfile('all'); setFilterStatus('all'); }}
            className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="Limpar Filtros"
        >
            <X size={18} />
        </button>
      </div>

      {/* INDICADORES DE CAPACIDADE OPERACIONAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Taxa de Ocupação" value={`${stats.occupancyRate}%`} sub={`${stats.occupiedCount} de ${stats.totalSlots} postos`} icon={<Percent className="text-blue-600" />} color="border-blue-500" />
        <StatCard title="Rotatividade (Turnover)" value={`${stats.turnover}%`} sub="Contratos encerrados vs totais" icon={<TrendingUp className="text-red-600" />} color="border-red-500" />
        <StatCard title="Tempo Médio Preenchimento" value={`${stats.timeToFill}d`} sub="Dias entre criação e ocupação" icon={<Timer className="text-indigo-600" />} color="border-indigo-500" />
        <StatCard title="Permanência Média" value={`${stats.averageStay}d`} sub="Tempo médio de contrato ativo" icon={<Hourglass className="text-amber-600" />} color="border-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRÁFICO: OCUPAÇÃO POR UNIDADE */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center">
                        <BarChart3 className="mr-3 text-blue-600" size={20} /> Capacidade Operacional por Unidade
                    </h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Postos Ocupados vs Livres (Top 8)</p>
                </div>
            </div>
            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.unitStats} layout="vertical" margin={{ left: 40, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} width={120} />
                        <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontSize: 10 }} />
                        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 20, fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }} />
                        <Bar dataKey="ocupados" name="Ocupados" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={20} />
                        <Bar dataKey="livres" name="Livres" stackId="a" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* LISTA DE RISCOS CONTRATUAIS (90 DIAS) */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center">
                    <AlertTriangle className="mr-3 text-orange-600" size={20} /> Gestão de Riscos (90d)
                </h3>
                <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-orange-100">{activeAlerts.length}</span>
            </div>
            
            <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[350px]">
                {activeAlerts.length > 0 ? activeAlerts.map(occ => (
                    <div key={occ.id} className={`p-4 rounded-2xl border flex items-center justify-between transition-all group ${occ.warning.type === 'termination' ? 'bg-red-50/30 border-red-100' : 'bg-orange-50/30 border-orange-100'}`}>
                        <div className="flex items-center space-x-3 truncate">
                            <div className={`p-2 rounded-xl shrink-0 ${occ.warning.type === 'termination' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                <Clock size={16} />
                            </div>
                            <div className="truncate">
                                <p className="text-[11px] font-black text-slate-800 truncate">{occ.contractedName}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase truncate">{occ.warning.label} • {occ.warning.daysLeft}d</p>
                            </div>
                        </div>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {occ.warning.type === 'extension' && (
                                <button onClick={() => triggerFastExtension(occ)} className="p-2 bg-white text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Prorrogar">
                                    <FastForward size={14} />
                                </button>
                            )}
                            <button onClick={() => handleSendNotification(occ.id, occ.vacancyCode)} className="p-2 bg-white text-slate-400 border border-slate-100 rounded-lg hover:bg-slate-900 hover:text-white transition-all shadow-sm" title="Notificar">
                                <Send size={14} />
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                        <CheckCircle size={40} className="mb-4 opacity-10" />
                        <p className="font-black uppercase text-[10px] tracking-widest">Sem riscos contratuais</p>
                    </div>
                )}
            </div>
            <button className="mt-6 w-full py-3 bg-slate-50 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100">
                Ver Relatório Completo
            </button>
        </div>
      </div>

      {/* MODAL DE PRORROGAÇÃO RÁPIDA */}
      {showExtendModal && extendingData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-10 shadow-2xl border border-slate-100 animate-in zoom-in duration-200 relative">
            <button onClick={() => setShowExtendModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <h2 className="text-2xl font-black mb-2 text-slate-800 uppercase tracking-tighter">Ação de Gestão</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8">Prorrogar Contrato: {extendingData.occ.contractedName}</p>
            <form onSubmit={handleConfirmExtension} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ato/Termo Aditivo</label>
                <input value={extAmendmentTerm} onChange={e => setExtAmendmentTerm(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="Ex: TA 01/2024" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Novo Término</label>
                <input type="date" value={extNewEndDate} onChange={e => setExtNewEndDate(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowExtendModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">Confirmar Ação</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  async function handleSendNotification(occId: string, vacancyCode: string) {
    setIsSending(occId);
    setTimeout(() => {
        onLog('NOTIFICAÇÃO', `Aviso de 90 dias enviado para profissional no grupo ${vacancyCode}.`);
        setIsSending(null);
        alert(`Notificação enviada.`);
    }, 1000);
  }
};

const StatCard: React.FC<{title: string, value: string | number, sub: string, icon: React.ReactNode, color: string}> = ({ title, value, sub, icon, color }) => (
  <div className={`bg-white p-6 rounded-[2rem] shadow-sm border-l-4 ${color} transition-all duration-300 group`}>
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <p className="text-slate-400 text-[9px] font-black mb-1 uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-black text-slate-800 tracking-tighter mt-1">{value}</p>
        <p className="text-[8px] font-bold text-slate-400 uppercase mt-2 tracking-widest leading-none">{sub}</p>
      </div>
      <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-white group-hover:shadow-md transition-all">{icon}</div>
    </div>
  </div>
);

export default DashboardView;
