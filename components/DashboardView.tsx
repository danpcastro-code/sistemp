
import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Vacancy, ContractStatus, ConvokedPerson, PSS } from '../types';
import { CheckCircle, Users, Clock, Briefcase, BarChart3 } from 'lucide-react';

interface DashboardViewProps {
  vacancies: Vacancy[];
  setVacancies: React.Dispatch<React.SetStateAction<Vacancy[]>>;
  convocations: ConvokedPerson[];
  pssList: PSS[];
  onLog: (action: string, details: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ vacancies }) => {
  const stats = useMemo(() => {
    const totalSlots = vacancies.reduce((acc, v) => acc + v.initialQuantity, 0);
    const occupiedSlots = vacancies.reduce((acc, v) => 
      acc + v.occupations.filter(o => o.status === ContractStatus.ACTIVE).length, 0);
    
    // Dados para o gráfico simplificado
    const unitData = Array.from(new Set(vacancies.map(v => v.unit))).map(unit => {
      const unitVacancies = vacancies.filter(v => v.unit === unit);
      const slots = unitVacancies.reduce((a, b) => a + b.initialQuantity, 0);
      const occupied = unitVacancies.reduce((a, b) => 
        a + b.occupations.filter(o => o.status === ContractStatus.ACTIVE).length, 0);
      return { name: unit, ocupados: occupied, totais: slots };
    }).slice(0, 6);

    return { totalSlots, occupiedSlots, unitData };
  }, [vacancies]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* CARTÕES DE RESUMO BÁSICO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total de Postos" 
          value={stats.totalSlots.toString()} 
          icon={<Briefcase className="text-blue-600" />} 
          color="bg-blue-50"
        />
        <StatCard 
          title="Postos Ocupados" 
          value={stats.occupiedSlots.toString()} 
          icon={<CheckCircle className="text-green-600" />} 
          color="bg-green-50"
        />
        <StatCard 
          title="Postos Disponíveis" 
          value={(stats.totalSlots - stats.occupiedSlots).toString()} 
          icon={<Clock className="text-amber-600" />} 
          color="bg-amber-50"
        />
      </div>

      {/* GRÁFICO SIMPLIFICADO */}
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
        <div className="flex items-center mb-10">
          <BarChart3 className="mr-4 text-blue-600" size={24} />
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Ocupação por Unidade</h3>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.unitData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)'}} />
              <Bar dataKey="ocupados" name="Ocupados" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              <Bar dataKey="totais" name="Capacidade Total" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{title: string, value: string, icon: React.ReactNode, color: string}> = ({ title, value, icon, color }) => (
  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex items-center justify-between">
    <div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
      <p className="text-4xl font-black text-slate-800 tracking-tighter">{value}</p>
    </div>
    <div className={`p-4 ${color} rounded-2xl`}>{icon}</div>
  </div>
);

export default DashboardView;
