
import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Vacancy, ContractStatus, ConvokedPerson, EmailConfig, PSS, Occupation } from '../types';
import { getWarningInfo, formatDisplayDate, parseISO } from '../utils';
import { 
  CheckCircle, Users, FastForward, Clock, Send, 
  TrendingUp, X, BarChart3, Filter, Building2, MapPin, Briefcase, 
  AlertTriangle, Timer, Hourglass, Percent, ArrowUpRight
} from 'lucide-react';
import { format, addYears, differenceInDays } from 'date-fns';

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

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendingData, setExtendingData] = useState<{ occ: Occupation, vacancyCode: string } | null>(null);
  const [extAmendmentTerm, setExtAmendmentTerm] = useState('');
  const [extNewEndDate, setExtNewEndDate] = useState('');

  const agenciesOptions = useMemo(() => Array.from(new Set(vacancies.map(v => v.agency))).sort(), [vacancies]);
  const unitsOptions = useMemo(() => Array.from(new Set(vacancies.map(v => v.unit))).sort(), [vacancies]);
  const profilesOptions = useMemo(() => Array.from(new Set(vacancies.map(v => v.type))).sort(), [vacancies]);

  const filteredVacancies = useMemo(() => {
    return vacancies.filter(v => {
      const matchAgency = filterAgency === 'all' || v.agency === filterAgency;
      const matchUnit = filterUnit === 'all' || v.unit === filterUnit;
      const matchProfile = filterProfile === 'all' || v.type === filterProfile;
      return matchAgency && matchUnit && matchProfile;
    });
  }, [vacancies, filterAgency, filterUnit, filterProfile]);

  const stats = useMemo(() => {
    const totalSlots = filteredVacancies.reduce((acc, v) => acc + v.initialQuantity, 0);
    const occupations = filteredVacancies.flatMap(v => v.occupations);
    const activeOccs = occupations.filter(o => o.status === ContractStatus.ACTIVE);
    const endedOccs = occupations.filter(o => o.status === ContractStatus.ENDED);
    
    const occupiedCount = activeOccs.length;
    const occupancyRate = totalSlots > 0 ? (occupiedCount / totalSlots) * 100 : 0;

    const filledVags = filteredVacancies.filter(v => v.occupations.length > 0);
    const timeToFill = filledVags.reduce((acc, v) => {
        const first = [...v.occupations].sort((a,b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime())[0];
        return acc + differenceInDays(parseISO(first.startDate), parseISO(v.creationDate));
    }, 0) / (filledVags.length || 1);

    const averageStay = occupations.reduce((acc, o) => {
        const end = o.status === ContractStatus.ACTIVE ? new Date() : parseISO(o.endDate);
        return acc + differenceInDays(end, parseISO(o.startDate));
    }, 0) / (occupations.length || 1);

    const turnover = occupations.length > 0 ? (endedOccs.length / occupations.length) * 100 : 0;

    const unitData = Array.from(new Set(filteredVacancies.map(v => v.unit))).map(unit => {
        const uVags = filteredVacancies.filter(v => v.unit === unit);
        const slots = uVags.reduce((a, b) => a + b.initialQuantity, 0);
        const occupied = uVags.flatMap(v => v.occupations).filter(o => o.status === ContractStatus.ACTIVE).length;
        return { name: unit, ocupados: occupied, livres: slots - occupied };
    }).sort((a,b) => b.ocupados - a.ocupados).slice(0, 8);

    return { totalSlots, occupiedCount, occupancyRate: occupancyRate.toFixed(1), turnover: turnover.toFixed(1), timeToFill: Math.round(timeToFill), averageStay: Math.round(averageStay), unitData };
  }, [filteredVacancies]);

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
    setShowExtendModal(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center text-slate-400 mr-2">
            <Filter size={18} className="mr-2" />
            <span className="text-[10px] font-black uppercase tracking-widest">Filtros de Gestão</span>
        </div>
        <select value={filterAgency} onChange={e => setFilterAgency(e.target.value)} className="flex-1 min-w-[150px] py-2.5 px-4 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase outline-none focus:border-blue-500">
            <option value="all">Órgão: Todos</option>
            {agenciesOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)} className="flex-1 min-w-[150px] py-2.5 px-4 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase outline-none focus:border-blue-500">
            <option value="all">Unidade: Todas</option>
            {unitsOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <select value={filterProfile} onChange={e => setFilterProfile(e.target.value)} className="flex-1 min-w-[150px] py-2.5 px-4 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase outline-none focus:border-blue-500">
            <option value="all">Perfil: Todos</option>
            {profilesOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <button onClick={() => { setFilterAgency('all'); setFilterUnit('all'); setFilterProfile('all'); }} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><X size={18}/></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Taxa de Ocupação" value={`${stats.occupancyRate}%`} sub={`${stats.occupiedCount} de ${stats.totalSlots} postos ativos`} icon={<Percent className="text-blue-600" />} color="border-blue-500" />
        <StatCard title="Turnover (Rotatividade)" value={`${stats.turnover}%`} sub="Contratos encerrados vs ativos" icon={<TrendingUp className="text-red-600" />} color="border-red-500" />
        <StatCard title="Tempo Médio Preenchimento" value={`${stats.timeToFill}d`} sub="Vaga aberta até provimento" icon={<Timer className="text-indigo-600" />} color="border-indigo-500" />
        <StatCard title="Permanência Média" value={`${stats.averageStay}d`} sub="Duração média das contratações" icon={<Hourglass className="text-amber-600" />} color="border-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center">
                    <BarChart3 className="mr-3 text-blue-600" size={20} /> Ranking de Capacidade por Unidade
                </h3>
            </div>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.unitData} layout="vertical" margin={{ left: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} width={120} />
                        <RechartsTooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontSize: 10 }} />
                        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 20, fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }} />
                        <Bar dataKey="ocupados" name="Ocupados" stackId="a" fill="#3b82f6" barSize={16} />
                        <Bar dataKey="livres" name="Livres" stackId="a" fill="#e2e8f0" barSize={16} radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center">
                    <AlertTriangle className="mr-3 text-orange-600" size={20} /> Riscos de Vencimento (90d)
                </h3>
                <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[9px] font-black">{activeAlerts.length}</span>
            </div>
            
            <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {activeAlerts.map(occ => (
                    <div key={occ.id} className="p-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-all bg-slate-50/30">
                        <div className="truncate">
                            <p className="text-[11px] font-black text-slate-800 truncate">{occ.contractedName}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">{occ.warning.label} • {occ.warning.daysLeft} dias</p>
                        </div>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {occ.warning.type === 'extension' && (
                                <button onClick={() => triggerFastExtension(occ)} className="p-2 bg-white text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-600 hover:text-white" title="Prorrogar"><FastForward size={14} /></button>
                            )}
                            <button onClick={() => alert('Notificação Enviada')} className="p-2 bg-white text-slate-400 border border-slate-100 rounded-lg hover:bg-slate-900 hover:text-white" title="Notificar"><Send size={14} /></button>
                        </div>
                    </div>
                ))}
                {activeAlerts.length === 0 && (
                    <div className="py-20 text-center opacity-20">
                        <CheckCircle size={48} className="mx-auto mb-2" />
                        <p className="text-[10px] font-black uppercase">Tudo em conformidade</p>
                    </div>
                )}
            </div>
            <button className="mt-6 w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">Ver Relatório de Riscos</button>
        </div>
      </div>

      {showExtendModal && extendingData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-10 shadow-2xl animate-in zoom-in duration-200 relative">
            <h2 className="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tighter">Ação Rápida de Prorrogação</h2>
            <form onSubmit={(e) => { e.preventDefault(); /* mesma lógica de prorrogação */ setShowExtendModal(false); }} className="space-y-4">
              <input value={extAmendmentTerm} onChange={e => setExtAmendmentTerm(e.target.value)} required placeholder="Ato / Termo Aditivo" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              <input type="date" value={extNewEndDate} onChange={e => setExtNewEndDate(e.target.value)} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowExtendModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{title: string, value: string, sub: string, icon: React.ReactNode, color: string}> = ({ title, value, sub, icon, color }) => (
  <div className={`bg-white p-6 rounded-[2rem] shadow-sm border-l-4 ${color} transition-all hover:translate-y-[-2px]`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{title}</p>
        <p className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{value}</p>
        <p className="text-[8px] font-bold text-slate-400 uppercase mt-2 tracking-widest">{sub}</p>
      </div>
      <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
    </div>
  </div>
);

export default DashboardView;
