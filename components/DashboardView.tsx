
import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { Vacancy, VacancyStatus, ContractStatus } from '../types';
import { getVacancyStats, getWarningInfo } from '../utils';
import { Bell, CheckCircle, UserMinus, Users, AlertTriangle, Mail, FastForward, UserX, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface DashboardViewProps {
  vacancies: Vacancy[];
}

const COLORS = ['#10b981', '#3b82f6', '#ef4444', '#6366f1'];

const DashboardView: React.FC<DashboardViewProps> = ({ vacancies }) => {
  const total = vacancies.length;
  const provided = vacancies.filter(v => v.status === VacancyStatus.PROVIDED).length;
  const notProvided = vacancies.filter(v => v.status === VacancyStatus.NOT_PROVIDED).length;
  const exhausted = vacancies.filter(v => v.status === VacancyStatus.EXHAUSTED).length;

  const statusData = [
    { name: 'Em Uso', value: provided },
    { name: 'Livres', value: notProvided },
    { name: 'Esgotadas', value: exhausted },
  ];

  const activeAlerts = vacancies.flatMap(v => 
    v.occupations
      .filter(o => o.status === ContractStatus.ACTIVE)
      .map(o => ({ ...o, warning: getWarningInfo(o), vacancyCode: v.code }))
  ).filter(o => o.warning.isWarning)
   .sort((a, b) => a.warning.daysLeft - b.warning.daysLeft);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Grupos Cadastrados" value={total} icon={<CheckCircle className="text-blue-600" />} color="border-blue-500" />
        <StatCard title="Postos Ativos" value={vacancies.reduce((a, b) => a + b.occupations.filter(o => o.status === ContractStatus.ACTIVE).length, 0)} icon={<Users className="text-green-600" />} color="border-green-500" />
        <StatCard title="Capacidade Vaga" value={vacancies.reduce((a, b) => a + (b.initialQuantity - b.occupations.filter(o => o.status === ContractStatus.ACTIVE).length), 0)} icon={<UserMinus className="text-amber-600" />} color="border-amber-500" />
        <StatCard title="Janela de Alerta" value={activeAlerts.length} icon={<Bell className="text-red-600" />} color="border-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <h3 className="text-lg font-black mb-8 text-slate-800 uppercase tracking-tighter">Ocupação do Sistema</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center">
              <Clock className="mr-3 text-blue-600" size={24} /> Avisos de Gestão (Janela 90d)
            </h3>
            <div className="flex space-x-2">
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black border border-blue-100 uppercase">Prorrogação</span>
                <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[9px] font-black border border-red-100 uppercase">Término Fatal</span>
            </div>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[400px]">
            {activeAlerts.length > 0 ? activeAlerts.map(occ => (
              <div key={occ.id} className={`p-5 rounded-2xl border flex items-center justify-between transition-all hover:shadow-lg ${occ.warning.type === 'termination' ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl ${occ.warning.type === 'termination' ? 'bg-red-200 text-red-700' : 'bg-blue-200 text-blue-700'}`}>
                    {occ.warning.type === 'termination' ? <UserX size={18} /> : <FastForward size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 leading-none">{occ.contractedName}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{occ.vacancyCode} • {occ.warning.label}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[11px] font-black block ${occ.warning.daysLeft < 15 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
                    {occ.warning.daysLeft <= 0 ? 'PRAZO VENCIDO' : `Faltam ${occ.warning.daysLeft} dias`}
                  </span>
                  {occ.warning.type === 'termination' && (
                    <div className="flex items-center justify-end text-[9px] text-red-600 font-black mt-1 uppercase">
                      <Mail size={12} className="mr-1" /> Notificação Mensal Ativa
                    </div>
                  )}
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <CheckCircle size={48} className="mb-4 opacity-10" />
                <p className="font-bold uppercase text-[10px] tracking-widest">Sem alertas na janela de 90 dias</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{title: string, value: number, icon: React.ReactNode, color: string}> = ({ title, value, icon, color }) => (
  <div className={`bg-white p-6 rounded-3xl shadow-sm border-l-4 ${color} hover:translate-y-[-2px] transition-all`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-400 text-[10px] font-black mb-1 uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-black text-slate-800 tracking-tighter">{value}</p>
      </div>
      <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
    </div>
  </div>
);

export default DashboardView;
