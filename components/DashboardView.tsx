
import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { Vacancy, VacancyStatus, ContractStatus, ConvokedPerson, EmailConfig, PSS, Occupation, ConvocationStatus } from '../types';
import { getWarningInfo, formatDisplayDate } from '../utils';
import { Bell, CheckCircle, UserMinus, Users, Mail, FastForward, UserX, Clock, Send, RefreshCw, Loader2, TrendingUp, ClipboardList, X, Zap, ArrowUpRight, BarChart3, Activity } from 'lucide-react';
import { format, parseISO, addYears, isAfter, isValid } from 'date-fns';

interface DashboardViewProps {
  vacancies: Vacancy[];
  setVacancies: React.Dispatch<React.SetStateAction<Vacancy[]>>;
  convocations: ConvokedPerson[];
  pssList: PSS[];
  onLog: (action: string, details: string) => void;
  emailConfig: EmailConfig;
}

const COLORS = ['#10b981', '#3b82f6', '#ef4444', '#6366f1'];

const DashboardView: React.FC<DashboardViewProps> = ({ vacancies, setVacancies, convocations, pssList, onLog, emailConfig }) => {
  const [isSending, setIsSending] = useState<string | null>(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendingData, setExtendingData] = useState<{ occ: Occupation, vacancyCode: string } | null>(null);
  const [extAmendmentTerm, setExtAmendmentTerm] = useState('');
  const [extNewEndDate, setExtNewEndDate] = useState('');

  const statusData = [
    { name: 'Em Uso', value: vacancies.filter(v => v.status === VacancyStatus.PROVIDED).length },
    { name: 'Livres', value: vacancies.filter(v => v.status === VacancyStatus.NOT_PROVIDED).length },
    { name: 'Esgotadas', value: vacancies.filter(v => v.status === VacancyStatus.EXHAUSTED).length },
  ];

  // Cálculos de Indicadores Avançados
  const stats = useMemo(() => {
    const totalOccupations = vacancies.flatMap(v => v.occupations);
    const ended = totalOccupations.filter(o => o.status === ContractStatus.ENDED).length;
    const active = totalOccupations.filter(o => o.status === ContractStatus.ACTIVE).length;
    
    // Turnover Geral
    const turnoverRate = totalOccupations.length > 0 
      ? (ended / totalOccupations.length) * 100 
      : 0;

    // Turnover por Edital
    const notices = Array.from(new Set(vacancies.map(v => v.publicNotice)));
    const turnoverByNotice = notices.map(notice => {
      const noticeVacancies = vacancies.filter(v => v.publicNotice === notice);
      const noticeOccs = noticeVacancies.flatMap(v => v.occupations);
      const noticeEnded = noticeOccs.filter(o => o.status === ContractStatus.ENDED).length;
      const rate = noticeOccs.length > 0 ? (noticeEnded / noticeOccs.length) * 100 : 0;
      return { notice, rate: rate.toFixed(1), total: noticeOccs.length, ended: noticeEnded };
    }).sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));

    // Aproveitamento PSS: Contratados / (Contratados + Pendentes)
    const hiredCount = convocations.filter(c => c.status === ConvocationStatus.HIRED).length;
    const pendingCount = convocations.filter(c => c.status === ConvocationStatus.PENDING).length;
    const utilizationRate = (hiredCount + pendingCount) > 0
      ? (hiredCount / (hiredCount + pendingCount)) * 100
      : 0;

    return {
      activeGroups: vacancies.length,
      activeOccupations: active,
      freeSlots: vacancies.reduce((a, b) => a + (b.initialQuantity - b.occupations.filter(o => o.status === ContractStatus.ACTIVE).length), 0),
      turnover: turnoverRate.toFixed(1),
      turnoverByNotice,
      utilization: utilizationRate.toFixed(1)
    };
  }, [vacancies, convocations]);

  const activeAlerts = useMemo(() => {
    return vacancies.flatMap(v => 
      v.occupations
        .filter(o => o.status === ContractStatus.ACTIVE)
        .map(o => ({ ...o, warning: getWarningInfo(o), vacancyCode: v.code }))
    ).filter(o => o.warning.isWarning)
     .sort((a, b) => a.warning.daysLeft - b.warning.daysLeft);
  }, [vacancies]);

  const triggerFastExtension = (alertOcc: any) => {
    try {
      const currentEnd = parseISO(alertOcc.endDate);
      const maxLegal = parseISO(alertOcc.projectedFinalDate);
      
      if (!isValid(currentEnd) || !isValid(maxLegal)) {
        alert("Erro técnico: Datas do contrato corrompidas.");
        return;
      }

      const suggested = addYears(currentEnd, 1);
      const finalDateStr = isAfter(suggested, maxLegal) 
          ? alertOcc.projectedFinalDate 
          : format(suggested, 'yyyy-MM-dd');

      const { warning, vacancyCode, ...pureOcc } = alertOcc;
      setExtendingData({ occ: pureOcc as Occupation, vacancyCode: alertOcc.vacancyCode });
      setExtNewEndDate(finalDateStr);
      setExtAmendmentTerm('');
      setShowExtendModal(true);
    } catch (err) {
      alert("Falha ao abrir painel de prorrogação.");
    }
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
    alert('Contrato prorrogado com sucesso!');
  };

  const handleSendNotification = async (occId: string, vacancyCode: string) => {
    const vacancy = vacancies.find(v => v.code === vacancyCode);
    if (!vacancy) return;
    const occ = vacancy.occupations.find(o => o.id === occId);
    if (!occ) return;
    
    setIsSending(occId);
    setTimeout(() => {
        setVacancies(prev => prev.map(v => v.code === vacancyCode ? {
            ...v,
            occupations: v.occupations.map(o => o.id === occId ? {
              ...o,
              lastNotificationDate: new Date().toISOString(),
              notificationsCount: (o.notificationsCount || 0) + 1
            } : o)
        } : v));
        onLog('NOTIFICAÇÃO', `Aviso enviado para ${occ.contractedName}.`);
        setIsSending(null);
        alert(`Notificação enviada com sucesso!`);
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        <StatCard title="Grupos de Vagas" value={stats.activeGroups} icon={<ClipboardList className="text-blue-600" />} color="border-blue-500" />
        <StatCard title="Postos Ocupados" value={stats.activeOccupations} icon={<Users className="text-green-600" />} color="border-green-500" />
        <StatCard title="Postos Livres" value={stats.freeSlots} icon={<UserMinus className="text-amber-600" />} color="border-amber-500" />
        <StatCard title="Turnover Geral" value={`${stats.turnover}%`} icon={<TrendingUp className="text-red-600" />} color="border-red-500" />
        <StatCard title="Aproveitamento PSS" value={`${stats.utilization}%`} icon={<Zap className="text-indigo-600" />} color="border-indigo-500" />
        <StatCard title="Alertas Ativos" value={activeAlerts.length} icon={<Bell className="text-orange-600" />} color="border-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Ocupação do Sistema</h3>
            <ArrowUpRight size={20} className="text-slate-300" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center">
                    <BarChart3 className="mr-3 text-red-600" size={24} /> Turnover por Edital
                </h3>
                <Activity size={20} className="text-slate-300" />
            </div>
            <div className="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar max-h-[250px]">
                {stats.turnoverByNotice.map((item, idx) => (
                    <div key={idx} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-600">
                            <span className="truncate max-w-[180px]">{item.notice || 'Sem Edital'}</span>
                            <span className="text-red-600">{item.rate}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-red-500 rounded-full transition-all duration-1000" 
                                style={{ width: `${item.rate}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase">
                            <span>{item.total} Contratos Totais</span>
                            <span>{item.ended} Encerrados</span>
                        </div>
                    </div>
                ))}
                {stats.turnoverByNotice.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                        <TrendingUp size={32} className="mb-2 opacity-10" />
                        <p className="font-bold uppercase text-[9px] tracking-widest">Nenhum dado de edital</p>
                    </div>
                )}
            </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center">
              <Clock className="mr-3 text-blue-600" size={24} /> Alertas de Gestão
            </h3>
            <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">90 Dias</span>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[250px]">
            {activeAlerts.length > 0 ? activeAlerts.map(occ => (
              <div key={occ.id} className={`p-4 rounded-[1.5rem] border flex items-center justify-between transition-all hover:shadow-md ${occ.warning.type === 'termination' ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl ${occ.warning.type === 'termination' ? 'bg-red-200 text-red-700' : 'bg-blue-200 text-blue-700'}`}>
                    {occ.warning.type === 'termination' ? <UserX size={16} /> : <FastForward size={16} />}
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-800 leading-none truncate max-w-[100px]">{occ.contractedName}</p>
                    <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest truncate max-w-[100px]">{occ.vacancyCode}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right mr-1">
                    <span className={`text-[10px] font-black block ${occ.warning.daysLeft < 15 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
                      {occ.warning.daysLeft <= 0 ? 'Fim' : `${occ.warning.daysLeft}d`}
                    </span>
                  </div>
                  <button 
                    disabled={!!isSending}
                    onClick={() => handleSendNotification(occ.id, occ.vacancyCode)}
                    className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                  >
                    {isSending === occ.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  </button>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                <CheckCircle size={32} className="mb-2 opacity-10" />
                <p className="font-bold uppercase text-[9px] tracking-widest">Sem alertas próximos</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showExtendModal && extendingData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-10 shadow-2xl border border-slate-100 animate-in zoom-in duration-200 relative">
            <button onClick={() => setShowExtendModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <h2 className="text-2xl font-black mb-2 text-slate-800 uppercase tracking-tighter">Prorrogação Rápida</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8">{extendingData.occ.contractedName}</p>
            <form onSubmit={handleConfirmExtension} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº do Termo Aditivo</label>
                <input value={extAmendmentTerm} onChange={e => setExtAmendmentTerm(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="Ex: TA 02/2024" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Data de Fim</label>
                <input type="date" value={extNewEndDate} onChange={e => setExtNewEndDate(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                <p className="mt-2 text-[9px] text-blue-500 font-black uppercase tracking-widest">
                  Limite Máximo da Vaga: {formatDisplayDate(extendingData.occ.projectedFinalDate)}
                </p>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowExtendModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">Prorrogar Contrato</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{title: string, value: string | number, icon: React.ReactNode, color: string}> = ({ title, value, icon, color }) => (
  <div className={`bg-white p-6 rounded-[2rem] shadow-sm border-l-4 ${color} hover:translate-y-[-4px] transition-all duration-300 group`}>
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <p className="text-slate-400 text-[9px] font-black mb-1 uppercase tracking-widest leading-none">{title}</p>
        <p className="text-2xl font-black text-slate-800 tracking-tighter mt-1">{value}</p>
      </div>
      <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-white group-hover:shadow-md transition-all">{icon}</div>
    </div>
  </div>
);

export default DashboardView;
