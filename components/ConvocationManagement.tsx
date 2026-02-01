
import React, { useState, useMemo, useRef } from 'react';
import { ConvokedPerson, CompetitionType, ConvocationStatus } from '../types';
import { generateId, maskCPF } from '../utils';
import { Search, Plus, Edit, Clock, FileUp, X, CheckCircle2, AlertCircle, Users, Download, Info, Table, ShieldAlert } from 'lucide-react';
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
  const [duplicateError, setDuplicateError] = useState(false);
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

  const checkIsDuplicate = (candidate: Partial<ConvokedPerson>, excludeId?: string) => {
    return convocations.some(existing => {
      if (excludeId && existing.id === excludeId) return false;
      
      return (
        existing.name.trim().toLowerCase() === candidate.name?.trim().toLowerCase() &&
        existing.cpf.replace(/\D/g, '') === candidate.cpf?.replace(/\D/g, '') &&
        existing.email.trim().toLowerCase() === candidate.email?.trim().toLowerCase() &&
        existing.profile === candidate.profile &&
        existing.notice.trim().toLowerCase() === candidate.notice?.trim().toLowerCase() &&
        existing.competition === candidate.competition &&
        Number(existing.ranking) === Number(candidate.ranking)
      );
    });
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDuplicateError(false);
    
    const formData = new FormData(e.currentTarget);
    const rawCpf = formData.get('cpf') as string;
    
    // Lógica de Preservação de Dados Sensíveis:
    // Se estivermos editando e o valor enviado contém a máscara (asteriscos),
    // recuperamos o CPF original para não sobrescrever o dado real com a máscara.
    let finalCpf = rawCpf;
    if (editingPerson && rawCpf.includes('*')) {
      finalCpf = editingPerson.cpf;
    }

    const newCandidateData = {
      name: formData.get('name') as string,
      cpf: finalCpf,
      email: formData.get('email') as string,
      profile: formData.get('profile') as string,
      notice: formData.get('notice') as string,
      competition: formData.get('competition') as CompetitionType,
      ranking: Number(formData.get('ranking')),
    };

    if (checkIsDuplicate(newCandidateData, editingPerson?.id)) {
      setDuplicateError(true);
      return;
    }

    const person: ConvokedPerson = {
      id: editingPerson?.id || generateId(),
      ...newCandidateData,
      status: (formData.get('status') as ConvocationStatus) || ConvocationStatus.PENDING,
      createdAt: editingPerson?.createdAt || new Date().toISOString().split('T')[0]
    };

    if (editingPerson) {
        setConvocations(prev => prev.map(p => p.id === editingPerson.id ? person : p));
        onLog('ALTERAÇÃO', `Dados do candidato ${person.name} atualizados.`);
    } else {
        setConvocations(prev => [...prev, person]);
        onLog('CONVOCAÇÃO', `Novo candidato ${person.name} incluído.`);
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
        let duplicatesCount = 0;
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = line.includes(';') ? line.split(';') : line.split(',');
          if (values.length < 6) continue;

          const competitionStr = values[5]?.trim() || '';
          let competition = CompetitionType.AC;
          if (competitionStr.toLowerCase().includes('pcd')) competition = CompetitionType.PCD;
          else if (competitionStr.toLowerCase().includes('ppp') || competitionStr.toLowerCase().includes('cota')) competition = CompetitionType.PPP;

          const candidateData = {
            name: values[0]?.trim(),
            cpf: values[1]?.trim(),
            email: values[2]?.trim(),
            profile: values[3]?.trim(),
            notice: values[4]?.trim(),
            competition: competition,
            ranking: parseInt(values[6]?.trim() || '0'),
          };

          const isDuplicateInCurrentBatch = newCandidates.some(c => 
            c.name.toLowerCase() === candidateData.name.toLowerCase() && 
            c.cpf.replace(/\D/g,'') === candidateData.cpf.replace(/\D/g,'')
          );

          if (checkIsDuplicate(candidateData) || isDuplicateInCurrentBatch) {
            duplicatesCount++;
            continue;
          }

          newCandidates.push({
            id: generateId(),
            ...candidateData,
            status: ConvocationStatus.PENDING,
            createdAt: new Date().toISOString().split('T')[0]
          });
        }

        if (newCandidates.length > 0) {
          setConvocations(prev => [...prev, ...newCandidates]);
          onLog('IMPORTAÇÃO', `Importados ${newCandidates.length} candidatos. Ignorados ${duplicatesCount} duplicados.`);
          alert(`${newCandidates.length} candidatos importados. ${duplicatesCount} registros idênticos foram ignorados.`);
        } else if (duplicatesCount > 0) {
          alert(`Nenhum candidato novo importado. Todos os ${duplicatesCount} registros na planilha já existem no sistema.`);
        }
      } catch (error) {
        alert("Erro ao processar o arquivo CSV. Verifique a formatação.");
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
                onClick={() => { setEditingPerson(null); setDuplicateError(false); setShowModal(true); }} 
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
                    <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight mb-2">Segurança de Dados</h4>
                    <p className="text-xs text-amber-800/80 leading-relaxed mb-4">
                        O sistema protege dados sensíveis e rejeita automaticamente registros idênticos para manter a integridade da auditoria. 
                        As colunas devem seguir a ordem: Nome, CPF, Email, Perfil, Edital, Concorrência e Ranking.
                    </p>
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
                <span className="text-[10px] font-black text-slate-400 uppercase">Registros Únicos:</span>
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
                        <p className="text-[10px] text-slate-400 font-mono tracking-tighter flex items-center mt-1">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 mr-2 text-[9px] font-black">CPF: {maskCPF(p.cpf)}</span>
                            <span>• {p.email}</span>
                        </p>
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
                        <button onClick={() => { setEditingPerson(p); setDuplicateError(false); setShowModal(true); }} className="text-slate-300 hover:text-blue-600 transition-all p-2.5 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md">
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

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-lg w-full p-10 shadow-2xl border border-slate-100 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-800 tracking-tighter">{editingPerson ? 'Editar' : 'Incluir'} Candidato</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-6">
              {duplicateError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center space-x-3 text-red-600 animate-bounce">
                  <ShieldAlert size={20} className="shrink-0" />
                  <p className="text-[11px] font-black uppercase tracking-widest">Rejeitado: Já existe um registro idêntico.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo do Candidato</label>
                    <input name="name" defaultValue={editingPerson?.name} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm transition-all font-bold" placeholder="Ex: Maria Oliveira"/>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF (Documento)</label>
                    <input name="cpf" defaultValue={editingPerson ? maskCPF(editingPerson.cpf) : ''} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm transition-all font-mono" placeholder="000.000.000-00"/>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ranking / Classificação</label>
                    <input name="ranking" type="number" defaultValue={editingPerson?.ranking} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm transition-all font-bold" placeholder="1"/>
                </div>
                <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Edital / Contrato de Origem</label>
                    <input name="notice" defaultValue={editingPerson?.notice} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm transition-all font-bold" placeholder="Edital 01/2024"/>
                </div>
                <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail para Notificação</label>
                    <input name="email" type="email" defaultValue={editingPerson?.email} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm transition-all font-bold" placeholder="candidato@email.com"/>
                </div>
                <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perfil Profissional / Vaga Pretendida</label>
                    <select name="profile" defaultValue={editingPerson?.profile || profiles[0]} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm transition-all bg-white font-bold">
                        {profiles.map((p, i) => <option key={i} value={p}>{p}</option>)}
                    </select>
                </div>
                <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Concorrência</label>
                    <select name="competition" defaultValue={editingPerson?.competition || CompetitionType.AC} className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm transition-all bg-white font-bold">
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
