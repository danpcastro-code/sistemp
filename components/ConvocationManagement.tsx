
import React, { useState, useMemo, useRef } from 'react';
import { ConvokedPerson, CompetitionType, ConvocationStatus } from '../types';
import { generateId, maskCPF } from '../utils';
import { Search, Plus, Edit, Clock, FileUp, X, CheckCircle2, AlertCircle, Users, Download, Info, Table } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface ConvocationManagementProps {
  convocations: ConvokedPerson[];
  setConvocations: React.Dispatch<React.SetStateAction<ConvokedPerson[]>>;
  profiles: string[];
  onLog: (action: string, details: string) => void;
}

const ConvocationManagement: React.FC<ConvocationManagementProps> = ({ convocations, setConvocations, profiles, onLog }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<ConvokedPerson | null>(null);
  const [showModelInfo, setShowModelInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const active = useMemo(() => {
    const today = new Date();
    return convocations.filter(c => {
      const days = differenceInDays(today, parseISO(c.createdAt));
      return days <= 50;
    });
  }, [convocations]);

  const filteredActive = active.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.notice.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.profile.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.ranking - b.ranking);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const person: ConvokedPerson = {
      id: editingPerson?.id || generateId(),
      name: formData.get('name') as string,
      cpf: formData.get('cpf') as string,
      email: formData.get('email') as string,
      profile: formData.get('profile') as string,
      notice: formData.get('notice') as string,
      competition: formData.get('competition') as CompetitionType,
      ranking: Number(formData.get('ranking')),
      status: (formData.get('status') as ConvocationStatus) || ConvocationStatus.PENDING,
      createdAt: editingPerson?.createdAt || new Date().toISOString().split('T')[0]
    };
    if (editingPerson) {
        setConvocations(prev => prev.map(p => p.id === editingPerson.id ? person : p));
        onLog('ALTERAÇÃO', `Dados do candidato ${person.name} atualizados.`);
    } else {
        setConvocations(prev => [...prev, person]);
        onLog('CONVOCAÇÃO', `Novo candidato ${person.name} incluído para o edital/contrato ${person.notice}.`);
    }
    setShowModal(false);
    setEditingPerson(null);
  };

  const downloadModelCsv = () => {
    const headers = ["Nome", "CPF", "Email", "Perfil Profissional", "Edital", "Concorrência (AC, PCD ou PPP)", "Ranking"];
    const example = ["João da Silva", "123.456.789-00", "joao@email.com", "Professor Substituto", "Edital 01/2024", "AC", "1"];
    const csvContent = [headers.join(";"), example.join(";")].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_importacao_convocados.csv");
    link.click();
    onLog('SISTEMA', 'Usuário baixou o modelo de planilha de importação.');
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/);
        const newCandidates: ConvokedPerson[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = line.includes(';') ? line.split(';') : line.split(',');
          if (values.length < 6) continue;

          const competitionStr = values[5]?.trim() || '';
          let competition = CompetitionType.AC;
          if (competitionStr.toLowerCase().includes('pcd')) competition = CompetitionType.PCD;
          else if (competitionStr.toLowerCase().includes('ppp') || competitionStr.toLowerCase().includes('cota')) competition = CompetitionType.PPP;

          newCandidates.push({
            id: generateId(),
            name: values[0]?.trim(),
            cpf: values[1]?.trim(),
            email: values[2]?.trim(),
            profile: values[3]?.trim(),
            notice: values[4]?.trim(),
            competition: competition,
            ranking: parseInt(values[6]?.trim() || '0'),
            status: ConvocationStatus.PENDING,
            createdAt: new Date().toISOString().split('T')[0]
          });
        }

        if (newCandidates.length > 0) {
          setConvocations(prev => [...prev, ...newCandidates]);
          onLog('IMPORTAÇÃO', `Importados ${newCandidates.length} candidatos via planilha CSV.`);
          alert(`${newCandidates.length} candidatos importados com sucesso!`);
        }
      } catch (error) {
        alert("Erro ao processar o arquivo CSV. Verifique a formatação.");
        console.error(error);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Candidato, Edital ou Perfil..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 shadow-sm transition-all font-medium" />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
            <button 
                onClick={() => setShowModelInfo(!showModelInfo)} 
                className={`p-3 rounded-2xl border transition-all ${showModelInfo ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-400 hover:text-amber-600'}`}
                title="Ver orientações da planilha"
            >
                <Info size={20}/>
            </button>
            <button 
                onClick={downloadModelCsv} 
                className="px-5 py-3 bg-white text-slate-700 hover:bg-slate-50 rounded-2xl font-bold flex items-center justify-center transition-all border border-slate-200 text-xs uppercase tracking-widest"
            >
                <Download size={18} className="mr-2 text-blue-500"/> Modelo CSV
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleCsvUpload} 
                className="hidden" 
                accept=".csv" 
            />
            <button 
                onClick={() => fileInputRef.current?.click()} 
                className="px-6 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl font-bold flex items-center justify-center transition-all shadow-lg active:scale-95 text-xs uppercase tracking-widest"
            >
                <FileUp size={18} className="mr-2"/> Importar Dados
            </button>
            <button 
                onClick={() => { setEditingPerson(null); setShowModal(true); }} 
                className="px-8 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-2xl font-bold flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-xs uppercase tracking-widest"
            >
                <Plus size={18} className="mr-2"/> Novo Registro
            </button>
        </div>
      </div>

      {showModelInfo && (
        <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-8 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-start space-x-4">
                <div className="p-3 bg-amber-200 rounded-2xl text-amber-700">
                    <Table size={24} />
                </div>
                <div className="flex-1">
                    <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight mb-2">Instruções para Importação CSV</h4>
                    <p className="text-xs text-amber-800/80 leading-relaxed mb-4">
                        Para importar múltiplos candidatos de uma vez, utilize um arquivo CSV (separado por ponto e vírgula ou vírgula) com as seguintes colunas na ordem exata:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-white/50 p-3 rounded-xl border border-amber-100"><p className="text-[9px] font-black uppercase text-amber-900">1. Nome</p><p className="text-[10px] text-amber-700">Nome completo do candidato.</p></div>
                        <div className="bg-white/50 p-3 rounded-xl border border-amber-100"><p className="text-[9px] font-black uppercase text-amber-900">2. CPF</p><p className="text-[10px] text-amber-700">Formatado ou apenas números.</p></div>
                        <div className="bg-white/50 p-3 rounded-xl border border-amber-100"><p className="text-[9px] font-black uppercase text-amber-900">3. Email</p><p className="text-[10px] text-amber-700">Endereço eletrônico válido.</p></div>
                        <div className="bg-white/50 p-3 rounded-xl border border-amber-100"><p className="text-[9px] font-black uppercase text-amber-900">4. Perfil</p><p className="text-[10px] text-amber-700">Exatamente como cadastrado no sistema.</p></div>
                        <div className="bg-white/50 p-3 rounded-xl border border-amber-100"><p className="text-[9px] font-black uppercase text-amber-900">5. Edital</p><p className="text-[10px] text-amber-700">Número do certame de origem.</p></div>
                        <div className="bg-white/50 p-3 rounded-xl border border-amber-100"><p className="text-[9px] font-black uppercase text-amber-900">6. Concorrência</p><p className="text-[10px] text-amber-700">Usar: AC, PCD ou PPP.</p></div>
                        <div className="bg-white/50 p-3 rounded-xl border border-amber-100"><p className="text-[9px] font-black uppercase text-amber-900">7. Ranking</p><p className="text-[10px] text-amber-700">Classificação numérica final.</p></div>
                    </div>
                </div>
                <button onClick={() => setShowModelInfo(false)} className="text-amber-400 hover:text-amber-600"><X size={20}/></button>
            </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600 mr-3">
                    <Clock size={16} />
                </div>
                <p className="font-bold text-xs uppercase tracking-widest text-slate-500">Fluxo de Convocação (Janela 50 dias)</p>
            </div>
            <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black text-slate-400 uppercase">Total na Janela:</span>
                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-[10px] font-black">{filteredActive.length}</span>
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead className="text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                <tr>
                <th className="px-8 py-5">Ranking / Cota</th>
                <th className="px-8 py-5">Candidato / Identificação</th>
                <th className="px-8 py-5">Perfil e Edital Vinculado</th>
                <th className="px-8 py-5 text-center">Status Atual</th>
                <th className="px-8 py-5 text-right">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
                {filteredActive.length > 0 ? filteredActive.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-5">
                        <div className="flex flex-col items-start">
                            <span className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 font-black text-blue-600">
                                {p.ranking}º
                            </span>
                            <span className={`text-[8px] font-black uppercase mt-1.5 px-1.5 py-0.5 rounded border ${
                                p.competition === CompetitionType.PCD ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                p.competition === CompetitionType.PPP ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                                'bg-slate-50 text-slate-400 border-slate-200'
                            }`}>
                                {p.competition}
                            </span>
                        </div>
                    </td>
                    <td className="px-8 py-5">
                        <p className="font-bold text-slate-800">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono tracking-tighter">{maskCPF(p.cpf)} • {p.email}</p>
                    </td>
                    <td className="px-8 py-5">
                        <div className="flex items-center space-x-2">
                            <span className="p-1 bg-slate-100 rounded text-slate-400"><CheckCircle2 size={12}/></span>
                            <p className="font-bold text-slate-700 text-xs">{p.profile}</p>
                        </div>
                        <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-1 ml-6">{p.notice}</p>
                    </td>
                    <td className="px-8 py-5 text-center">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                            p.status === ConvocationStatus.HIRED ? 'bg-green-50 text-green-700 border-green-100' : 
                            p.status === ConvocationStatus.DECLINED ? 'bg-red-50 text-red-700 border-red-100' : 
                            'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                            {p.status}
                        </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                        <button onClick={() => { setEditingPerson(p); setShowModal(true); }} className="text-slate-300 hover:text-blue-600 transition-all p-2.5 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md">
                            <Edit size={16}/>
                        </button>
                    </td>
                </tr>
                )) : (
                    <tr>
                        <td colSpan={5} className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center">
                                <AlertCircle size={40} className="text-slate-200 mb-4" />
                                <p className="text-slate-400 font-medium text-sm italic">Nenhum candidato encontrado nesta janela ou filtro.</p>
                            </div>
                        </td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>

      <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="flex items-center space-x-6 relative z-10">
            <div className="p-5 bg-white/10 rounded-3xl backdrop-blur-md border border-white/10">
                <Users size={32} className="text-indigo-300" />
            </div>
            <div>
                <h4 className="font-black text-xl tracking-tight">Gestão de Concorrência</h4>
                <p className="text-sm text-indigo-200/70 max-w-xl leading-relaxed font-medium">
                    O sistema prioriza a transparência na reserva de vagas (PCD e PPP). Certifique-se de importar ou cadastrar corretamente a cota de cada candidato para garantir a conformidade legal do provimento.
                </p>
            </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-lg w-full p-10 shadow-2xl border border-slate-100 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-800 tracking-tighter">{editingPerson ? 'Editar' : 'Incluir'} Candidato</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo do Candidato</label>
                    <input name="name" defaultValue={editingPerson?.name} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm transition-all" placeholder="Ex: Maria Oliveira"/>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF</label>
                    <input name="cpf" defaultValue={editingPerson?.cpf} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm transition-all" placeholder="000.000.000-00"/>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ranking / Classificação</label>
                    <input name="ranking" type="number" defaultValue={editingPerson?.ranking} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm transition-all" placeholder="1"/>
                </div>
                <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Edital / Contrato de Origem</label>
                    <input name="notice" defaultValue={editingPerson?.notice} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm transition-all" placeholder="Edital 01/2024"/>
                </div>
                <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail para Notificação</label>
                    <input name="email" type="email" defaultValue={editingPerson?.email} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm transition-all" placeholder="candidato@email.com"/>
                </div>
                <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perfil Profissional / Vaga Pretendida</label>
                    <select name="profile" defaultValue={editingPerson?.profile || profiles[0]} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm transition-all bg-white">
                        {profiles.map((p, i) => <option key={i} value={p}>{p}</option>)}
                    </select>
                </div>
                <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Concorrência</label>
                    <select name="competition" defaultValue={editingPerson?.competition || CompetitionType.AC} className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm transition-all bg-white">
                        <option value={CompetitionType.AC}>Ampla Concorrência</option>
                        <option value={CompetitionType.PCD}>Pessoa com Deficiência (PcD)</option>
                        <option value={CompetitionType.PPP}>Pessoas Pretas ou Pardas (Cotas)</option>
                    </select>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-10">
                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 font-bold text-slate-500 hover:text-slate-600 transition-colors uppercase text-xs tracking-widest">Cancelar</button>
                <button type="submit" className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-2xl active:scale-95 transition-all">Salvar Registro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConvocationManagement;
