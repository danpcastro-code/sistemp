
import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { Vacancy, VacancyStatus, ContractStatus, ConvokedPerson, EmailConfig } from '../types';
import { getVacancyStats, getWarningInfo, formatDisplayDate } from '../utils';
import { Bell, CheckCircle, UserMinus, Users, AlertTriangle, Mail, FastForward, UserX, Clock, Send, RefreshCw, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface DashboardViewProps {
  vacancies: Vacancy[];
  // Fix: changed type to React.Dispatch<React.SetStateAction<Vacancy[]>> to support functional updates
  setVacancies: React.Dispatch<React.SetStateAction<Vacancy[]>>;
  convocations: ConvokedPerson[];
  onLog: (action: string, details: string) => void;
  emailConfig: EmailConfig;
}

const COLORS = ['#10b981', '#3b82f6', '#ef4444', '#6366f1'];

const DashboardView: React.FC<DashboardViewProps> = ({ vacancies, setVacancies, convocations, onLog, emailConfig }) => {
  const [isSending, setIsSending] = useState<string | null>(null);
  const [isSendingAll, setIsSendingAll] = useState(false);

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

  const sendRealEmail = async (occ: any) => {
    if (!emailConfig.publicKey || !emailConfig.serviceId || !emailConfig.templateId) {
        alert("Erro: Integração de E-mail não configurada. Vá em Parametrização > E-mail.");
        return false;
    }

    const person = convocations.find(p => p.id === occ.personId);
    if (!person || !person.email) {
        alert(`Erro: E-mail não encontrado para ${occ.contractedName}`);
        return false;
    }

    // Preparação do corpo da mensagem substituindo as tags
    const message = emailConfig.template
        .replace(/{nome}/g, person.name)
        .replace(/{posto}/g, `Posto #${occ.slotIndex}`)
        .replace(/{grupo}/g, occ.vacancyCode)
        .replace(/{data_fatal}/g, formatDisplayDate(occ.warning.date));

    try {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: emailConfig.serviceId,
                template_id: emailConfig.templateId,
                user_id: emailConfig.publicKey,
                template_params: {
                    to_name: person.name,
                    to_email: person.email,
                    from_name: "SisTemp RH",
                    subject: emailConfig.subject,
                    message: message
                }
            })
        });

        if (response.ok) {
            return true;
        } else {
            const err = await response.text();
            console.error("EmailJS Error:", err);
            return false;
        }
    } catch (e) {
        console.error("Fetch Error:", e);
        return false;
    }
  };

  const handleSendNotification = async (occId: string, vacancyCode: string) => {
    const vacancy = vacancies.find(v => v.code === vacancyCode);
    if (!vacancy) return;

    const occ = vacancy.occupations.find(o => o.id === occId);
    if (!occ) return;
    
    setIsSending(occId);
    const success = await sendRealEmail({ ...occ, warning: getWarningInfo(occ), vacancyCode });

    if (success) {
        const updatedVacancies = vacancies.map(v => v.code === vacancyCode ? {
            ...v,
            occupations: v.occupations.map(o => o.id === occId ? {
              ...o,
              lastNotificationDate: new Date().toISOString(),
              notificationsCount: (o.notificationsCount || 0) + 1
            } : o)
        } : v);
        setVacancies(updatedVacancies);
        onLog('NOTIFICAÇÃO', `E-mail REAL enviado para ${occ.contractedName}.`);
        alert(`Notificação enviada com sucesso!`);
    } else {
        alert("Falha ao enviar e-mail. Verifique suas credenciais de integração.");
    }
    setIsSending(null);
  };

  const handleNotifyAll = async () => {
    if (activeAlerts.length === 0) return;
    if (!confirm(`Deseja enviar notificações individuais para os ${activeAlerts.length} contratados da lista?`)) return;

    setIsSendingAll(true);
    let count = 0;
    
    // Processamento sequencial para não sobrecarregar a API
    for (const occ of activeAlerts) {
        const success = await sendRealEmail(occ);
        if (success) {
            count++;
            // Atualização local de cada um
            // Fix: support functional update and simplified map logic
            setVacancies(prev => prev.map(v => v.code === occ.vacancyCode ? {
                ...v,
                occupations: v.occupations.map(o => o.id === occ.id ? {
                  ...o,
                  lastNotificationDate: new Date().toISOString(),
                  notificationsCount: (o.notificationsCount || 0) + 1
                } : o)
            } : v));
        }
    }

    setIsSendingAll(false);
    onLog('NOTIFICAÇÃO_LOTE', `Disparo em massa concluído: ${count} e-mails enviados.`);
    alert(`Processo concluído: ${count} e-mails enviados.`);
  };

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
                {activeAlerts.length > 0 && (
                    <button 
                        disabled={isSendingAll}
                        onClick={handleNotifyAll}
                        className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black border border-slate-700 uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center disabled:opacity-50"
                    >
                        {isSendingAll ? <RefreshCw size={12} className="mr-2 animate-spin" /> : <Mail size={12} className="mr-2" />}
                        {isSendingAll ? 'Enviando Lote...' : 'Notificar Todos'}
                    </button>
                )}
            </div>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[400px]">
            {activeAlerts.length > 0 ? activeAlerts.map(occ => (
              <div key={occ.id} className={`p-5 rounded-3xl border flex items-center justify-between transition-all hover:shadow-lg ${occ.warning.type === 'termination' ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                <div className="flex items-center space-x-4">
                  <div className={`p-4 rounded-2xl ${occ.warning.type === 'termination' ? 'bg-red-200 text-red-700' : 'bg-blue-200 text-blue-700'}`}>
                    {occ.warning.type === 'termination' ? <UserX size={20} /> : <FastForward size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 leading-none">{occ.contractedName}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{occ.vacancyCode} • {occ.warning.label}</p>
                    {occ.lastNotificationDate && (
                      <p className="text-[9px] font-black text-green-600 uppercase mt-1.5 flex items-center">
                        <CheckCircle size={10} className="mr-1" /> Notificado em {formatDisplayDate(occ.lastNotificationDate)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <span className={`text-[11px] font-black block ${occ.warning.daysLeft < 15 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
                      {occ.warning.daysLeft <= 0 ? 'VENCIDO' : `${occ.warning.daysLeft} dias`}
                    </span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{formatDisplayDate(occ.warning.date)}</span>
                  </div>
                  
                  <button 
                    disabled={!!isSending}
                    onClick={() => handleSendNotification(occ.id, occ.vacancyCode)}
                    className={`p-3 bg-white border rounded-2xl transition-all shadow-sm active:scale-90 group ${occ.warning.type === 'termination' ? 'border-red-200 text-red-500 hover:bg-red-600 hover:text-white' : 'border-blue-200 text-blue-500 hover:bg-blue-600 hover:text-white'}`}
                    title="Enviar Notificação Real"
                  >
                    {isSending === occ.id ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    )}
                  </button>
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
