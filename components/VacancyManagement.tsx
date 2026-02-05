
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Vacancy, VacancyStatus, ContractStatus, Occupation, LegalParameter, ConvokedPerson, ConvocationStatus, UserRole, PSS } from '../types';
import { generateId, calculateProjectedEndDate, suggestInitialEndDate, getSlotRemainingDays, formatDisplayDate, normalizeString } from '../utils';
import { 
  Search, Plus, ChevronRight, Building2, Clock, FastForward, Trash2, MapPin, X, FilterX, List, Calendar, AlertCircle, Info, FileText, Layers, CheckCircle
} from 'lucide-react';
import { 
  differenceInDays, 
  parseISO, 
  startOfDay, 
  format, 
  addYears, 
  isAfter, 
  isBefore, 
  isValid 
} from 'date-fns';

interface VacancyManagementProps {
  vacancies: Vacancy[];
  setVacancies: React.Dispatch<React.SetStateAction<Vacancy[]>>;
  parameters: LegalParameter[];
  agencies: string[];
  units: string[];
  profiles: string[];
  setAgencies: React.Dispatch<React.SetStateAction<string[]>>;
  setUnits: React.Dispatch<React.SetStateAction<string[]>>;
  convocations: ConvokedPerson[];
  setConvocations: React.Dispatch<React.SetStateAction<ConvokedPerson[]>>;
  pssList: PSS[];
  userRole: UserRole;
  onLog: (action: string, details: string) => void;
}

const VacancyManagement: React.FC<VacancyManagementProps> = ({ vacancies, setVacancies, parameters, agencies, units, profiles, setAgencies, setUnits, convocations, setConvocations, pssList, userRole, onLog }) => {
  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.HR;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVacancyId, setSelectedVacancyId] = useState<string | null>(null);
  const [selectedSlotFilter, setSelectedSlotFilter] = useState<number | null>(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showRescindModal, setShowRescindModal] = useState(false);
  
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [targetSlotInfo, setTargetSlotInfo] = useState<{ slotIndex: number, remainingDays: number, lastEndDate?: string } | null>(null);

  const [extendingOccId, setExtendingOccId] = useState<string | null>(null);
  const [extAmendmentTerm, setExtAmendmentTerm] = useState('');
  const [extNewEndDate, setExtNewEndDate] = useState('');

  const [rescindingOccId, setRescindingOccId] = useState<string | null>(null);
  const [rescindDate, setRescindDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const selectedVacancy = useMemo(() => 
    vacancies.find(v => v.id === selectedVacancyId) || null
  , [selectedVacancyId, vacancies]);

  const validPssOptions = useMemo(() => {
    const today = startOfDay(new Date());
    return pssList.filter(p => {
      if (p.isArchived) return false;
      const validDate = parseISO(p.validUntil);
      return !isAfter(today, validDate);
    });
  }, [pssList]);

  // Filtra candidatos que estão NOMEADOS (PENDING) e que NÃO desistiram ou foram contratados
  const sortedPendingCandidates = useMemo(() => {
    if (!selectedVacancy) return [];
    const vacancyTypeNormalized = normalizeString(selectedVacancy.type);

    return convocations
      .filter(c => {
          if (c.status !== ConvocationStatus.PENDING) return false;
          if (selectedVacancy.pssId && c.pssId !== selectedVacancy.pssId) return false;

          const candidateProfileNormalized = normalizeString(c.profile || "");
          return candidateProfileNormalized === vacancyTypeNormalized || 
                 candidateProfileNormalized.includes(vacancyTypeNormalized) || 
                 vacancyTypeNormalized.includes(candidateProfileNormalized);
      })
      .sort((a, b) => a.ranking - b.ranking);
  }, [convocations, selectedVacancy]);

  useEffect(() => {
    setSelectedSlotFilter(null);
  }, [selectedVacancyId]);

  useEffect(() => {
    if (formStartDate && targetSlotInfo) {
      const suggestedEnd = suggestInitialEndDate(formStartDate);
      const projectedFinal = calculateProjectedEndDate(formStartDate, targetSlotInfo.remainingDays);
      setFormEndDate(suggestedEnd > projectedFinal ? projectedFinal : suggestedEnd);
    }
  }, [formStartDate, targetSlotInfo]);

  const handleSaveVacancy = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const paramId = formData.get('legalBase') as string;
    const selectedParam = parameters.find(p => p.id === paramId);
    if (!selectedParam) return alert('Selecione um Amparo Legal.');

    const pssId = formData.get('pssId') as string;
    if (!pssId) return alert('Selecione um Processo Seletivo (PSS) válido.');

    const newVacancy: Vacancy = {
      id: generateId(),
      code: formData.get('code') as string,
      legalBase: selectedParam.label,
      maxTermDays: selectedParam.days,
      type: formData.get('type') as string,
      agency: formData.get('agency') as string,
      unit: formData.get('unit') as string,
      publicNotice: formData.get('publicNotice') as string,
      initialQuantity: Number(formData.get('quantity')),
      status: VacancyStatus.NOT_PROVIDED,
      creationDate: new Date().toISOString().split('T')[0],
      occupations: [],
      pssId: pssId
    };
    
    setVacancies(prev => [...prev, newVacancy]);
    setShowAddModal(false);
    onLog('CRIAR_VAGA', `Grupo ${newVacancy.code} criado vinculado ao PSS.`);
    alert("Grupo de vagas criado com sucesso.");
  };

  const handleAddContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVacancy || !selectedPersonId || !targetSlotInfo) {
        alert("Erro: Informações de posto ou candidato ausentes.");
        return;
    }

    const person = convocations.find(p => p.id === selectedPersonId);
    if (!person) {
        alert("Erro: Candidato não localizado.");
        return;
    }

    // Validação 1: Continuidade do Posto
    if (targetSlotInfo.lastEndDate) {
      const lastEnd = parseISO(targetSlotInfo.lastEndDate);
      const newStart = parseISO(formStartDate);
      if (isValid(lastEnd) && !isAfter(newStart, lastEnd)) {
        alert(`A data de início deve ser posterior ao encerramento anterior (${formatDisplayDate(targetSlotInfo.lastEndDate)}).`);
        return;
      }
    }

    // Validação 2: Data Portaria vs Data Contrato
    if (person.convocationDate) {
        const namingDate = parseISO(person.convocationDate);
        const startContractDate = parseISO(formStartDate);
        if (isValid(namingDate) && isValid(startContractDate) && isBefore(startContractDate, namingDate)) {
            if (!confirm(`Atenção: Início do contrato (${formatDisplayDate(formStartDate)}) antes da Portaria (${formatDisplayDate(person.convocationDate)}). Prosseguir?`)) return;
        }
    }

    const slotHistory = selectedVacancy.occupations.filter(o => o.slotIndex === targetSlotInfo.slotIndex);
    const newOcc: Occupation = {
      id: generateId(),
      contractedName: person.name,
      personId: person.id,
      slotIndex: targetSlotInfo.slotIndex,
      order: slotHistory.length + 1,
      startDate: formStartDate,
      endDate: formEndDate,
      competition: person.competition,
      projectedFinalDate: calculateProjectedEndDate(formStartDate, targetSlotInfo.remainingDays),
      isExtensionRequired: formEndDate < calculateProjectedEndDate(formStartDate, targetSlotInfo.remainingDays),
      status: ContractStatus.ACTIVE,
      notificationsCount: 0
    };

    // Atualiza estados usando formas funcionais para evitar race conditions
    setConvocations(prev => prev.map(p => p.id === person.id ? { ...p, status: ConvocationStatus.HIRED } : p));
    
    setVacancies(prev => prev.map(v => v.id === selectedVacancy.id ? { 
      ...v, 
      status: VacancyStatus.PROVIDED, 
      occupations: [...v.occupations, newOcc] 
    } : v));

    setShowAddContractModal(false);
    setSelectedPersonId('');
    onLog('PROVIMENTO', `${person.name} contratado no Posto #${targetSlotInfo.slotIndex}.`);
    alert(`Contratação de ${person.name} concluída com sucesso!`);
  };

  const triggerExtension = useCallback((occ: Occupation) => {
    setExtendingOccId(occ.id);
    setExtNewEndDate(format(addYears(parseISO(occ.endDate), 1), 'yyyy-MM-dd'));
    setExtAmendmentTerm('');
    setShowExtendModal(true);
  }, []);

  const triggerRescision = useCallback((occ: Occupation) => {
    setRescindingOccId(occ.id);
    setRescindDate(format(new Date(), 'yyyy-MM-dd'));
    setShowRescindModal(true);
  }, []);

  const handleExtendContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVacancy || !extendingOccId) return;
    setVacancies(prev => prev.map(v => v.id === selectedVacancy.id ? {
      ...v,
      occupations: v.occupations.map(o => o.id === extendingOccId ? {
        ...o,
        endDate: extNewEndDate,
        amendmentTerm: extAmendmentTerm,
        isExtensionRequired: extNewEndDate < o.projectedFinalDate
      } : o)
    } : v));
    setShowExtendModal(false);
    onLog('PRORROGAÇÃO', `Contrato prorrogado até ${extNewEndDate}.`);
    alert("Contrato prorrogado com sucesso.");
  };

  const handleRescindContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVacancy || !rescindingOccId) return;
    setVacancies(prev => prev.map(v => v.id === selectedVacancy.id ? {
      ...v,
      occupations: v.occupations.map(o => o.id === rescindingOccId ? {
        ...o,
        endDate: rescindDate,
        status: ContractStatus.ENDED,
        terminationReason: 'Rescisão Antecipada'
      } : o)
    } : v));
    setShowRescindModal(false);
    onLog('RESCISÃO', `Contrato encerrado em ${rescindDate}.`);
    alert("Rescisão registrada.");
  };

  const filteredVacancies = vacancies.filter(v => 
    v.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.agency.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedOccupations = useMemo(() => {
    if (!selectedVacancy) return [];
    let list = [...selectedVacancy.occupations];
    if (selectedSlotFilter !== null) list = list.filter(o => o.slotIndex === selectedSlotFilter);
    return list.sort((a, b) => a.slotIndex - b.slotIndex || a.order - b.order);
  }, [selectedVacancy, selectedSlotFilter]);

  const handleSlotClick = (idx: number) => {
    if (!selectedVacancy) return;
    
    const isAlreadyFiltered = selectedSlotFilter === idx;
    setSelectedSlotFilter(isAlreadyFiltered ? null : idx);

    const activeOcc = selectedVacancy.occupations.find(o => o.slotIndex === idx && o.status === ContractStatus.ACTIVE);
    const remDays = getSlotRemainingDays(selectedVacancy, idx);
    
    if (!activeOcc && canEdit && remDays > 0) {
      const hist = selectedVacancy.occupations.filter(o => o.slotIndex === idx);
      const last = hist.length > 0 ? [...hist].sort((a,b) => b.order - a.order)[0] : null;
      setTargetSlotInfo({ slotIndex: idx, remainingDays: remDays, lastEndDate: last?.endDate });
      setShowAddContractModal(true);
    }
  };

  return (
    <div className="space-y-6">
      {!selectedVacancy ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center gap-4">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Pesquisar Grupos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none shadow-sm transition-all font-medium" />
            </div>
            {canEdit && (
              <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black flex items-center shadow-lg active:scale-95 transition-all text-[11px] uppercase tracking-widest">
                <Plus size={18} className="mr-2"/>Novo Grupo de Vagas
              </button>
            )}
          </div>
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">Código / Edital</th>
                  <th className="px-8 py-5">Órgão Solicitante</th>
                  <th className="px-8 py-5 text-center">Ocupação Atual</th>
                  <th className="px-8 py-5 text-right">Ver Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVacancies.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-5"><p className="font-black text-slate-800 text-xs">{v.code}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{v.type}</p></td>
                    <td className="px-8 py-5"><p className="font-bold text-slate-700 text-xs">{v.agency}</p><p className="text-[9px] text-blue-500 font-black uppercase tracking-widest">{v.unit}</p></td>
                    <td className="px-8 py-5 text-center">
                        <div className="flex flex-col items-center">
                            <span className="font-black text-slate-800 text-sm">{v.occupations.filter(o => o.status === ContractStatus.ACTIVE).length} / {v.initialQuantity}</span>
                            <div className="w-12 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                <div className="bg-blue-500 h-full" style={{ width: `${(v.occupations.filter(o => o.status === ContractStatus.ACTIVE).length / v.initialQuantity) * 100}%` }}></div>
                            </div>
                        </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <button onClick={() => setSelectedVacancyId(v.id)} className="p-3 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-2xl transition-all shadow-sm"><ChevronRight size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <button onClick={() => { setSelectedVacancyId(null); setSelectedSlotFilter(null); }} className="text-blue-600 font-black flex items-center text-xs uppercase tracking-widest hover:translate-x-[-4px] transition-transform">
                <ChevronRight size={16} className="rotate-180 mr-1"/> Voltar para Lista
            </button>
            <div className="bg-slate-900 px-6 py-3 rounded-2xl text-white shadow-xl flex items-center border border-slate-700">
                <Clock size={16} className="text-blue-400 mr-2" />
                <span className="text-[10px] font-black uppercase tracking-widest">Saldo do Grupo: {selectedVacancy.maxTermDays} Dias Legais</span>
            </div>
          </div>
          
          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-xl">
            <div className="mb-8">
                <h2 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">{selectedVacancy.code}</h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-3">{selectedVacancy.agency} • {selectedVacancy.unit}</p>
                {selectedVacancy.pssId && (
                  <div className="mt-5 flex items-center space-x-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 w-fit">
                    <CheckCircle size={14} className="text-green-500" />
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">PSS: {pssList.find(p => p.id === selectedVacancy.pssId)?.title}</span>
                  </div>
                )}
            </div>

            <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 mb-10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                        <List size={14} className="mr-2 text-blue-500" /> Painel Visual de Postos
                    </h3>
                    {selectedSlotFilter !== null && (
                        <button onClick={() => setSelectedSlotFilter(null)} className="text-[9px] font-black text-blue-600 uppercase flex items-center hover:underline">
                            <FilterX size={12} className="mr-1"/> Limpar Filtro de Posto
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-3">
                  {Array.from({ length: selectedVacancy.initialQuantity }).map((_, i) => {
                    const idx = i + 1;
                    const activeOcc = selectedVacancy.occupations.find(o => o.slotIndex === idx && o.status === ContractStatus.ACTIVE);
                    const remDays = getSlotRemainingDays(selectedVacancy, idx);
                    const isSelected = selectedSlotFilter === idx;

                    return (
                      <button 
                        key={idx} 
                        onClick={() => handleSlotClick(idx)} 
                        className={`w-12 h-12 rounded-2xl border-2 flex flex-col items-center justify-center font-black transition-all transform active:scale-90 ${
                            isSelected ? 'ring-4 ring-blue-500/20 border-blue-600 z-10 scale-110 bg-blue-50' : ''
                        } ${
                            activeOcc ? (isSelected ? 'border-blue-600' : 'bg-green-600 text-white border-green-700 shadow-lg') : 
                            remDays <= 0 ? 'bg-red-50 text-red-300 border-red-100 opacity-50 cursor-not-allowed' : 
                            'bg-white text-slate-400 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        <span className="text-[11px]">#{idx}</span>
                      </button>
                    );
                  })}
                </div>
            </div>

            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">Posto</th>
                  <th className="px-8 py-5">Ocupação</th>
                  <th className="px-8 py-5">Contratado / Cota</th>
                  <th className="px-8 py-5">Período Vigente</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {displayedOccupations.map(occ => (
                  <tr key={occ.id} className={`hover:bg-slate-50 transition-colors ${occ.status === ContractStatus.ENDED ? 'opacity-40 grayscale' : ''}`}>
                    <td className="px-8 py-5 font-black text-slate-900">Posto #{occ.slotIndex}</td>
                    <td className="px-8 py-5">
                      <span className="px-2 py-1 bg-slate-100 rounded text-[9px] font-black uppercase">{occ.order}ª Ocup.</span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-700">{occ.contractedName}</p>
                      <p className="text-[9px] text-blue-500 font-black uppercase">{occ.competition}</p>
                    </td>
                    <td className="px-8 py-5 font-medium text-slate-500">
                        {formatDisplayDate(occ.startDate)} → {formatDisplayDate(occ.endDate)}
                    </td>
                    <td className="px-8 py-5 text-right">
                      {occ.status === ContractStatus.ACTIVE && canEdit && (
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => triggerExtension(occ)} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90" title="Prorrogar"><FastForward size={14}/></button>
                          <button onClick={() => triggerRescision(occ)} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90" title="Rescindir"><Trash2 size={14}/></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: PROVIMENTO (CONTRATAR) */}
      {showAddContractModal && targetSlotInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-sm w-full p-12 shadow-2xl animate-in zoom-in duration-200 border border-slate-100 relative">
            <button onClick={() => setShowAddContractModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 p-2"><X size={20}/></button>
            <h2 className="text-3xl font-black mb-10 text-slate-800 uppercase tracking-tighter leading-tight">Provimento Posto #{targetSlotInfo.slotIndex}</h2>
            <form onSubmit={handleAddContract} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selecionar Candidato Nomeado</label>
                <select value={selectedPersonId} onChange={e => setSelectedPersonId(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 focus:ring-4 focus:ring-blue-500/10 outline-none">
                  <option value="">Selecione o candidato...</option>
                  {sortedPendingCandidates.map(p => (
                    <option key={p.id} value={p.id}>{p.ranking}º - {p.name} ({p.competition})</option>
                  ))}
                </select>
                {sortedPendingCandidates.length === 0 && (
                   <p className="mt-2 text-[9px] text-red-500 font-black uppercase">Nenhum candidato pendente de contratação para este PSS.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Início</label>
                   <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Fim</label>
                   <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-10">
                <button type="button" onClick={() => setShowAddContractModal(false)} className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-widest">Cancelar</button>
                <button type="submit" disabled={!selectedPersonId} className="px-10 py-4 bg-blue-600 text-white font-black text-xs uppercase rounded-2xl shadow-xl active:scale-95 disabled:opacity-50">Contratar Agora</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAIS: NOVO GRUPO, PRORROGAÇÃO E RESCISÃO (CÓDIGO MANTIDO PARA INTEGRIDADE) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-lg w-full p-12 shadow-2xl animate-in zoom-in duration-200 border border-slate-100 relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 p-2"><X size={20}/></button>
            <h2 className="text-3xl font-black mb-10 text-slate-800 uppercase tracking-tighter leading-tight">Novo Grupo de Vagas</h2>
            <form onSubmit={handleSaveVacancy} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código do Grupo</label>
                  <input name="code" required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="Ex: VAG-2024-002" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qtd de Postos</label>
                  <input name="quantity" type="number" min="1" required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Processo PSS Ativo</label>
                  <select name="pssId" required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none">
                    <option value="">Selecione o PSS...</option>
                    {validPssOptions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perfil Profissional</label>
                  <select name="type" required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none">
                    <option value="">Selecione o perfil...</option>
                    {profiles.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amparo Legal (Prazo Lei)</label>
                <select name="legalBase" required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none">
                  <option value="">Selecione o amparo...</option>
                  {parameters.map(p => <option key={p.id} value={p.id}>{p.label} - {p.days} dias</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Órgão</label>
                  <select name="agency" required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none">
                    {agencies.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade</label>
                  <select name="unit" required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none">
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-5 mt-10">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-8 py-4 font-bold text-slate-500 uppercase text-xs tracking-widest">Cancelar</button>
                <button type="submit" className="px-14 py-4 bg-blue-600 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all">Criar Grupo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExtendModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-10 shadow-2xl border border-slate-100 animate-in zoom-in duration-200 relative">
            <button onClick={() => setShowExtendModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X size={18}/></button>
            <h2 className="text-2xl font-black mb-8 text-slate-800 uppercase tracking-tighter">Prorrogar Contrato</h2>
            <form onSubmit={handleExtendContract} className="space-y-6">
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Termo Aditivo</label><input value={extAmendmentTerm} onChange={e => setExtAmendmentTerm(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="Ex: TA 01/2024" /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Data de Fim</label><input type="date" value={extNewEndDate} onChange={e => setExtNewEndDate(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10" /></div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowExtendModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRescindModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-10 shadow-2xl border border-slate-100 animate-in zoom-in duration-200 relative">
            <button onClick={() => setShowRescindModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X size={18}/></button>
            <h2 className="text-2xl font-black mb-8 text-slate-800 uppercase tracking-tighter">Rescisão Antecipada</h2>
            <form onSubmit={handleRescindContract} className="space-y-6">
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data da Rescisão</label><input type="date" value={rescindDate} onChange={e => setRescindDate(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10" /></div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowRescindModal(false)} className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-red-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95">Encerrar Contrato</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VacancyManagement;
