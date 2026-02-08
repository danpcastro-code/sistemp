
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Vacancy, VacancyStatus, ContractStatus, Occupation, LegalParameter, ConvokedPerson, ConvocationStatus, UserRole, PSS } from '../types';
import { generateId, calculateProjectedEndDate, suggestInitialEndDate, getSlotRemainingDays, formatDisplayDate, normalizeString, removeAccents } from '../utils';
import { 
  Search, Plus, ChevronRight, Building2, Clock, FastForward, Trash2, MapPin, X, FilterX, List, Calendar, AlertCircle, Info, FileText, Layers, CheckCircle, UserX, Pencil, HelpCircle, Briefcase
} from 'lucide-react';
import { differenceInDays, parseISO, startOfDay, format, addYears, isAfter, isBefore, isValid } from 'date-fns';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVacancyId, setSelectedVacancyId] = useState<string | null>(null);
  const [selectedSlotFilter, setSelectedSlotFilter] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [targetSlotInfo, setTargetSlotInfo] = useState<{ slotIndex: number, remainingDays: number, lastEndDate?: string } | null>(null);

  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.HR;
  const isAdmin = userRole === UserRole.ADMIN;

  const selectedVacancy = useMemo(() => 
    vacancies.find(v => v.id === selectedVacancyId) || null
  , [selectedVacancyId, vacancies]);

  const sortedPendingCandidates = useMemo(() => {
    if (!selectedVacancy) return [];
    
    const vacancyTypeNormalized = normalizeString(selectedVacancy.type);
    const vacancyPssId = String(selectedVacancy.pssId || '').trim();

    return convocations
      .filter(c => {
          // REGRA: Apenas candidatos com Ato Convocatório e status PENDENTE (exclui DECLINED/Desistentes)
          const hasAct = c.convocationAct && c.convocationAct.trim() !== "";
          if (!hasAct || c.status !== ConvocationStatus.PENDING) return false;

          const candidatePssId = String(c.pssId || '').trim();
          if (!vacancyPssId || candidatePssId !== vacancyPssId) return false;

          const candidateProfileNormalized = normalizeString(c.profile || "");
          const isProfileMatch = candidateProfileNormalized === vacancyTypeNormalized || 
                                candidateProfileNormalized.includes(vacancyTypeNormalized) || 
                                vacancyTypeNormalized.includes(candidateProfileNormalized);
          
          return isProfileMatch;
      })
      .sort((a, b) => a.ranking - b.ranking);
  }, [convocations, selectedVacancy]);

  const filteredVacancies = vacancies.filter(v => 
    removeAccents(v.code.toLowerCase()).includes(removeAccents(searchTerm.toLowerCase())) || 
    removeAccents(v.agency.toLowerCase()).includes(removeAccents(searchTerm.toLowerCase()))
  );

  const displayedOccupations = useMemo(() => {
    if (!selectedVacancy) return [];
    let list = [...selectedVacancy.occupations];
    if (selectedSlotFilter !== null) list = list.filter(o => o.slotIndex === selectedSlotFilter);
    return list.sort((a, b) => a.slotIndex - b.slotIndex || a.order - b.order);
  }, [selectedVacancy, selectedSlotFilter]);

  const handleAddContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVacancy || !selectedPersonId || !targetSlotInfo) return;

    const person = convocations.find(p => p.id === selectedPersonId);
    if (!person) return;

    const newOcc: Occupation = {
      id: generateId(),
      contractedName: person.name,
      personId: person.id,
      slotIndex: targetSlotInfo.slotIndex,
      order: selectedVacancy.occupations.filter(o => o.slotIndex === targetSlotInfo.slotIndex).length + 1,
      startDate: formStartDate,
      endDate: formEndDate,
      competition: person.competition,
      projectedFinalDate: calculateProjectedEndDate(formStartDate, targetSlotInfo.remainingDays),
      isExtensionRequired: formEndDate < calculateProjectedEndDate(formStartDate, targetSlotInfo.remainingDays),
      status: ContractStatus.ACTIVE
    };

    setConvocations(prev => prev.map(p => p.id === person.id ? { ...p, status: ConvocationStatus.HIRED } : p));
    setVacancies(prev => prev.map(v => v.id === selectedVacancy.id ? { 
      ...v, 
      status: VacancyStatus.PROVIDED, 
      occupations: [...v.occupations, newOcc] 
    } : v));

    setShowAddContractModal(false);
    setSelectedPersonId('');
    onLog('PROVIMENTO', `${person.name} contratado no Posto #${targetSlotInfo.slotIndex}.`);
  };

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
              <input type="text" placeholder="Pesquisar Grupos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none" />
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
                  <th className="px-8 py-5 text-center">Ocupação Atual</th>
                  <th className="px-8 py-5 text-right">Ver Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVacancies.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5">
                      <p className="font-black text-slate-800 text-xs">{v.code}</p>
                      <span className="text-[8px] bg-slate-100 px-1.5 py-0.5 rounded-sm font-black text-slate-500 uppercase mt-1 inline-block">PSS: {pssList.find(p => p.id === v.pssId)?.title || 'Vínculo Indefinido'}</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                        <span className="font-black text-slate-800 text-sm">{v.occupations.filter(o => o.status === ContractStatus.ACTIVE).length} / {v.initialQuantity}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <button onClick={() => setSelectedVacancyId(v.id)} className="p-3 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-2xl transition-all"><ChevronRight size={18} /></button>
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
                <ChevronRight size={16} className="rotate-180 mr-1"/> Voltar
            </button>
          </div>
          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-xl">
            <h2 className="text-4xl font-black text-slate-800 tracking-tighter">{selectedVacancy.code}</h2>
            <div className="flex flex-wrap gap-3 mt-8">
              {Array.from({ length: selectedVacancy.initialQuantity }).map((_, i) => {
                const idx = i + 1;
                const activeOcc = selectedVacancy.occupations.find(o => o.slotIndex === idx && o.status === ContractStatus.ACTIVE);
                const remDays = getSlotRemainingDays(selectedVacancy, idx);
                const isSelected = selectedSlotFilter === idx;

                return (
                  <button 
                    key={idx} 
                    onClick={() => handleSlotClick(idx)} 
                    className={`w-12 h-12 rounded-2xl border-2 flex flex-col items-center justify-center font-black transition-all ${
                      activeOcc ? 'bg-green-600 text-white border-green-700 shadow-lg' : 
                      remDays <= 0 ? 'bg-red-50 text-red-300 border-red-100 opacity-50 cursor-not-allowed' : 
                      'bg-white text-slate-400 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                    } ${isSelected ? 'ring-4 ring-blue-500/20 border-blue-600' : ''}`}
                  >
                    <span className="text-[11px]">#{idx}</span>
                  </button>
                );
              })}
            </div>

            <table className="w-full text-left mt-10">
              <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">Posto</th>
                  <th className="px-8 py-5">Contratado</th>
                  <th className="px-8 py-5 text-right">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {displayedOccupations.map(occ => (
                  <tr key={occ.id} className={`hover:bg-slate-50 transition-colors ${occ.status === ContractStatus.ENDED ? 'opacity-40 grayscale' : ''}`}>
                    <td className="px-8 py-5 font-black text-slate-900">Posto #{occ.slotIndex}</td>
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-700">{occ.contractedName}</p>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${occ.status === ContractStatus.ACTIVE ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>{occ.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddContractModal && targetSlotInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-lg w-full p-12 shadow-2xl">
            <h2 className="text-3xl font-black mb-8 text-slate-800 uppercase tracking-tighter">Provimento Posto #{targetSlotInfo.slotIndex}</h2>
            <form onSubmit={handleAddContract} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Candidato Habilitado (Filtrado)</label>
                <select value={selectedPersonId} onChange={e => setSelectedPersonId(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 focus:ring-4 focus:ring-blue-500/10 outline-none">
                  <option value="">Selecione o candidato convocado...</option>
                  {sortedPendingCandidates.map(p => (
                    <option key={p.id} value={p.id}>{p.ranking}º - {p.name}</option>
                  ))}
                </select>
                {sortedPendingCandidates.length === 0 && (
                   <p className="mt-4 p-4 bg-red-50 text-red-600 text-[10px] font-bold uppercase rounded-xl border border-red-100">Nenhum candidato apto para contratação. Verifique se existem chamamentos realizados para este PSS.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                   <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fim</label>
                   <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} required className="mt-2 w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-10">
                <button type="button" onClick={() => setShowAddContractModal(false)} className="px-6 py-4 font-bold text-slate-400 text-xs uppercase">Cancelar</button>
                <button type="submit" disabled={!selectedPersonId} className="px-10 py-4 bg-blue-600 text-white font-black text-xs uppercase rounded-2xl shadow-xl disabled:opacity-50">Contratar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VacancyManagement;
