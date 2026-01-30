
import React, { useState, useEffect, useMemo } from 'react';
import { Vacancy, VacancyStatus, ContractStatus, Occupation, LegalParameter, ConvokedPerson, ConvocationStatus, UserRole, CompetitionType } from '../types';
import { generateId, calculateProjectedEndDate, suggestInitialEndDate, getSlotRemainingDays, formatDisplayDate, normalizeString } from '../utils';
import { 
  Search, Plus, ChevronRight, Building2, Info, Clock, ListFilter, FastForward, Trash2, MapPin, Calendar, X, UserCheck
} from 'lucide-react';
import { differenceInDays, parseISO, startOfDay, format, addYears } from 'date-fns';

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
  userRole: UserRole;
  onLog: (action: string, details: string) => void;
}

const VacancyManagement: React.FC<VacancyManagementProps> = ({ vacancies, setVacancies, parameters, agencies, units, profiles, setAgencies, setUnits, convocations, setConvocations, userRole, onLog }) => {
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
  const [targetSlotInfo, setTargetSlotInfo] = useState<{ slotIndex: number, remainingDays: number } | null>(null);

  const [extendingOccId, setExtendingOccId] = useState<string | null>(null);
  const [extAmendmentTerm, setExtAmendmentTerm] = useState('');
  const [extNewEndDate, setExtNewEndDate] = useState('');

  const [rescindingOccId, setRescindingOccId] = useState<string | null>(null);
  const [rescindDate, setRescindDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const selectedVacancy = useMemo(() => 
    vacancies.find(v => v.id === selectedVacancyId) || null
  , [selectedVacancyId, vacancies]);

  // Lógica de equivalência robusta para Perfis Profissionais (Mesmo que Administrador != ADMINISTRADOR)
  const sortedPendingCandidates = useMemo(() => {
    if (!selectedVacancy) return [];
    const vacancyTypeNormalized = normalizeString(selectedVacancy.type);

    return convocations
      .filter(c => {
          if (c.status !== ConvocationStatus.PENDING) return false;
          const candidateProfileNormalized = normalizeString(c.profile || "");
          // Verifica se o perfil da vaga está contido no perfil do candidato ou vice-versa, normalizados
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
      occupations: []
    };
    
    setVacancies(prev => [...prev, newVacancy]);
    setShowAddModal(false);
    onLog('CRIAR_VAGA', `Grupo ${newVacancy.code} criado para ${newVacancy.agency}.`);
  };

  const handleDeleteVacancy = (vacancyId: string, vacancyCode: string) => {
    if (!confirm(`Deseja realmente excluir o grupo ${vacancyCode}?`)) return;
    setVacancies(prev => prev.filter(v => v.id !== vacancyId));
    onLog('EXCLUIR_VAGA', `Grupo ${vacancyCode} excluído.`);
  };

  const handleAddContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVacancy || !selectedPersonId || !targetSlotInfo) return;

    const contractDuration = differenceInDays(parseISO(formEndDate), parseISO(formStartDate)) + 1;
    if (contractDuration > targetSlotInfo.remainingDays) {
      alert(`Bloqueio: O período excede o saldo do posto.`);
      return;
    }

    const person = convocations.find(p => p.id === selectedPersonId);
    if (!person) return;

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

    setConvocations(prev => prev.map(p => p.id === person.id ? { ...p, status: ConvocationStatus.HIRED } : p));
    setVacancies(prev => prev.map(v => v.id === selectedVacancy.id ? { 
      ...v, 
      status: VacancyStatus.PROVIDED, 
      occupations: [...v.occupations, newOcc] 
    } : v));

    setShowAddContractModal(false);
    setSelectedPersonId('');
    onLog('PROVIMENTO', `${person.name} vinculado ao posto #${targetSlotInfo.slotIndex}.`);
  };

  // Funções de gatilho para abertura imediata dos modais
  const triggerExtension = (occ: Occupation) => {
    setExtendingOccId(occ.id);
    setExtNewEndDate(format(addYears(parseISO(occ.endDate), 1), 'yyyy-MM-dd'));
    setExtAmendmentTerm('');
    setShowExtendModal(true);
  };

  const triggerRescision = (occ: Occupation) => {
    setRescindingOccId(occ.id);
    setRescindDate(format(new Date(), 'yyyy-MM-dd'));
    setShowRescindModal(true);
  };

  const handleExtendContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVacancy || !extendingOccId) return;

    const occ = selectedVacancy.occupations.find(o => o.id === extendingOccId);
    if (!occ) return;

    const remDaysInPosto = getSlotRemainingDays(selectedVacancy, occ.slotIndex);
    const additionalDays = differenceInDays(parseISO(extNewEndDate), parseISO(occ.endDate));

    if (additionalDays > remDaysInPosto) {
      alert(`Erro: Prorrogação excede o limite legal do posto (${remDaysInPosto} dias restantes).`);
      return;
    }

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
    onLog('PRORROGAÇÃO', `Contrato de ${occ.contractedName} prorrogado até ${extNewEndDate}.`);
  };

  const handleRescindContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVacancy || !rescindingOccId) return;

    const occ = selectedVacancy.occupations.find(o => o.id === rescindingOccId);
    if (!occ) return;

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
    onLog('RESCISÃO', `Contrato de ${occ.contractedName} encerrado em ${rescindDate}.`);
  };

  const filteredVacancies = vacancies.filter(v => 
    v.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.agency.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.unit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedOccupations = useMemo(() => {
    if (!selectedVacancy) return [];
    let list = [...selectedVacancy.occupations];
    if (selectedSlotFilter !== null) {
      list = list.filter(o => o.slotIndex === selectedSlotFilter);
    }
    return list.sort((a, b) => a.slotIndex - b.slotIndex || a.order - b.order);
  }, [selectedVacancy, selectedSlotFilter]);

  return (
    <div className="space-y-6">
      {!selectedVacancy ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center gap-4">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Código, Órgão ou Unidade..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 shadow-sm transition-all font-medium" />
            </div>
            {canEdit && <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center shadow-lg active:scale-95 transition-all text-xs uppercase tracking-widest"><Plus size={18} className="mr-2"/>Novo Grupo de Vagas</button>}
          </div>
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="px-6 py-4">Código / Grupo</th>
                  <th className="px-6 py-4">Órgão / Unidade</th>
                  <th className="px-6 py-4 text-center">Ocupação Atual</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVacancies.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4"><p className="font-bold text-slate-800">{v.code}</p><p className="text-[10px] text-slate-400 uppercase font-black">{v.type}</p></td>
                    <td className="px-6 py-4"><p className="font-bold text-slate-700">{v.agency}</p><p className="text-[10px] text-indigo-500 uppercase font-black tracking-widest">{v.unit}</p></td>
                    <td className="px-6 py-4 text-center">
                        <span className="font-black text-slate-800">{v.occupations.filter(o => o.status === ContractStatus.ACTIVE).length} / {v.initialQuantity}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end items-center space-x-2">
                          {canEdit && v.occupations.length === 0 && (
                            <button onClick={() => handleDeleteVacancy(v.id, v.code)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                          )}
                          <button onClick={() => setSelectedVacancyId(v.id)} className="p-2 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-xl transition-all"><ChevronRight size={18} /></button>
                       </div>
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
            <button onClick={() => setSelectedVacancyId(null)} className="text-blue-600 font-bold flex items-center text-sm hover:translate-x-[-4px] transition-transform group">
                <ChevronRight size={16} className="rotate-180 mr-1 group-hover:mr-2 transition-all"/> Voltar para Lista
            </button>
            <div className="flex items-center space-x-3 bg-slate-900 px-4 py-2 rounded-xl text-white">
                <Clock size={16} className="text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-widest">Posto: {selectedVacancy.maxTermDays} dias max.</span>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-200/50 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div className="flex items-center space-x-5">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl"><Building2 size={24} /></div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{selectedVacancy.code}</h2>
                        <div className="flex items-center space-x-3 mt-1">
                            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">{selectedVacancy.agency}</p>
                            <span className="text-slate-200">•</span>
                            <div className="flex items-center text-indigo-500 font-black uppercase text-[9px] tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">
                                <MapPin size={10} className="mr-1" /> {selectedVacancy.unit}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
              <div className="flex flex-wrap gap-1.5 max-h-[400px] overflow-y-auto custom-scrollbar p-2">
                {Array.from({ length: selectedVacancy.initialQuantity }).map((_, i) => {
                  const idx = i + 1;
                  const slotOccupations = selectedVacancy.occupations.filter(o => o.slotIndex === idx);
                  const activeOcc = slotOccupations.find(o => o.status === ContractStatus.ACTIVE);
                  const remDays = getSlotRemainingDays(selectedVacancy, idx);
                  const isExhausted = remDays <= 0;
                  const isSelected = selectedSlotFilter === idx;
                  
                  return (
                    <button 
                      key={idx}
                      onClick={() => {
                          setSelectedSlotFilter(idx);
                          if (!activeOcc && canEdit && !isExhausted) {
                              setTargetSlotInfo({ slotIndex: idx, remainingDays: remDays });
                              setShowAddContractModal(true);
                          }
                      }}
                      className={`w-7 h-7 rounded-md flex items-center justify-center text-[8px] font-black border transition-all ${
                          isSelected ? 'ring-2 ring-blue-500 ring-offset-2 border-blue-600' : ''
                      } ${
                          activeOcc ? 'bg-green-500 border-green-600 text-white' : 
                          isExhausted ? 'bg-red-100 border-red-200 text-red-300' :
                          slotOccupations.length > 0 ? 'bg-blue-100 border border-blue-200 text-blue-500' :
                          'bg-white border-slate-200 text-slate-300'
                      }`}
                    >
                      {idx}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-12 overflow-x-auto rounded-3xl border border-slate-100 shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Posto / Ciclo</th>
                            <th className="px-6 py-4">Contratado</th>
                            <th className="px-6 py-4">Período</th>
                            <th className="px-6 py-4 text-center">Saldo Restante</th>
                            <th className="px-6 py-4 text-right">Situação</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[11px]">
                        {displayedOccupations.map(occ => {
                            const remDaysContract = Math.max(0, differenceInDays(parseISO(occ.endDate), startOfDay(new Date())));
                            const isActive = occ.status === ContractStatus.ACTIVE;
                            return (
                                <tr key={occ.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="font-black text-slate-400"># {occ.slotIndex}</span>
                                        <span className="block text-[8px] font-black uppercase text-blue-600 mt-1">{occ.order}ª Ocupação</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-slate-700">{occ.contractedName}</span>
                                        <span className="block text-[8px] font-black uppercase text-slate-400 mt-1">{occ.competition}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-slate-400 font-medium">{formatDisplayDate(occ.startDate)} a</span>
                                        <span className="font-bold text-slate-800 ml-1">{formatDisplayDate(occ.endDate)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center font-black">{remDaysContract} dias</td>
                                    <td className="px-6 py-4 text-right uppercase text-[9px] font-black">{occ.status}</td>
                                    <td className="px-6 py-4 text-right">
                                        {isActive && canEdit && (
                                            <div className="flex justify-end space-x-2">
                                                <button 
                                                  onClick={() => triggerExtension(occ)} 
                                                  className="p-2 border border-slate-200 rounded-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all text-slate-400" 
                                                  title="Prorrogar"
                                                >
                                                  <FastForward size={14} />
                                                </button>
                                                <button 
                                                  onClick={() => triggerRescision(occ)} 
                                                  className="p-2 border border-slate-200 rounded-lg hover:bg-red-500 hover:text-white hover:border-red-500 transition-all text-slate-400" 
                                                  title="Rescindir"
                                                >
                                                  <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRORROGAÇÃO */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-sm w-full p-8 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-xl font-black mb-6 text-slate-800 uppercase tracking-tight">Prorrogar Contrato</h2>
            <form onSubmit={handleExtendContract} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº Termo Aditivo</label>
                <input value={extAmendmentTerm} onChange={e => setExtAmendmentTerm(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-xl p-3 text-sm outline-none font-bold" placeholder="Ex: TA 01/2024"/>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Data Final</label>
                <input type="date" value={extNewEndDate} onChange={e => setExtNewEndDate(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-xl p-3 text-sm outline-none font-bold"/>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowExtendModal(false)} className="px-6 py-3 font-bold text-slate-400 text-[10px] uppercase tracking-widest">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESCISÃO */}
      {showRescindModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-sm w-full p-8 shadow-2xl animate-in zoom-in duration-200 border-2 border-red-50">
            <h2 className="text-xl font-black mb-6 text-red-600 uppercase tracking-tight">Efetivar Rescisão</h2>
            <p className="text-[11px] text-slate-500 mb-6 font-medium leading-relaxed">Confirme a data do desligamento. O saldo do posto será liberado para nova ocupação automaticamente.</p>
            <form onSubmit={handleRescindContract} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data do Desligamento</label>
                <input type="date" value={rescindDate} onChange={e => setRescindDate(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-xl p-3 text-sm outline-none font-bold"/>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowRescindModal(false)} className="px-6 py-3 font-bold text-slate-400 text-[10px] uppercase tracking-widest">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg">Confirmar Rescisão</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Novo Grupo de Vagas */}
      {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-[2.5rem] max-w-lg w-full p-10 shadow-2xl animate-in zoom-in duration-200">
                <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center tracking-tighter uppercase"><Building2 size={28} className="mr-4 text-blue-600" /> Criar Grupo de Vagas</h2>
                <form onSubmit={handleSaveVacancy} className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="col-span-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Órgão Solicitante</label>
                             <select name="agency" required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm bg-slate-50 outline-none font-bold">
                                {agencies.map((a, i) => <option key={i} value={a}>{a}</option>)}
                             </select>
                        </div>
                        <div className="col-span-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade de Atuação</label>
                             <select name="unit" required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm bg-slate-50 outline-none font-bold">
                                {units.map((u, i) => <option key={i} value={u}>{u}</option>)}
                             </select>
                        </div>
                        <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código Identificador</label>
                             <input name="code" required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm outline-none font-bold" placeholder="Ex: VAG-2024-01"/>
                        </div>
                        <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº de Postos</label>
                             <input name="quantity" type="number" required min="1" className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm outline-none font-bold" placeholder="Ex: 10"/>
                        </div>
                        <div className="col-span-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amparo Legal</label>
                             <select name="legalBase" required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm bg-slate-50 outline-none font-bold">
                                {parameters.map(p => <option key={p.id} value={p.id}>{p.label} - {p.days} dias</option>)}
                             </select>
                        </div>
                        <div className="col-span-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perfil Profissional</label>
                             <select name="type" required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm bg-slate-50 outline-none font-bold">
                                {profiles.map((p, i) => <option key={i} value={p}>{p}</option>)}
                             </select>
                        </div>
                   </div>
                   <div className="flex justify-end gap-4 mt-10">
                      <button type="button" onClick={() => setShowAddModal(false)} className="px-8 py-3.5 font-bold text-slate-400 uppercase text-[10px] tracking-[0.2em]">Cancelar</button>
                      <button type="submit" className="px-12 py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all">Criar Grupo</button>
                   </div>
                </form>
             </div>
          </div>
      )}

      {/* MODAL: Provimento de Posto */}
      {showAddContractModal && targetSlotInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-md w-full p-10 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black mb-8 text-slate-800 uppercase tracking-tight">Provimento Posto #{targetSlotInfo.slotIndex}</h2>
            <form onSubmit={handleAddContract} className="space-y-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selecionar Candidato Convocado</label>
              <select value={selectedPersonId} onChange={e => setSelectedPersonId(e.target.value)} required className="w-full border border-slate-200 rounded-2xl p-4 text-sm bg-slate-50 outline-none font-bold">
                {sortedPendingCandidates.length > 0 ? (
                  <>
                    <option value="">Selecione o candidato...</option>
                    {sortedPendingCandidates.map(p => (<option key={p.id} value={p.id}>{p.ranking}º - {p.name} ({p.competition})</option>))}
                  </>
                ) : (
                  <option value="">Nenhum candidato pendente para: {selectedVacancy?.type}</option>
                )}
              </select>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Início</label>
                  <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm outline-none font-bold"/>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Fim Prevista</label>
                  <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm outline-none font-bold"/>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-8">
                <button type="button" onClick={() => setShowAddContractModal(false)} className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Cancelar</button>
                <button type="submit" disabled={sortedPendingCandidates.length === 0} className="px-12 py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50">Contratar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VacancyManagement;
