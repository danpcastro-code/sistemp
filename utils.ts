
import { differenceInDays, parseISO, addDays, format, addYears, subDays, startOfDay, isValid } from 'date-fns';
import { Vacancy, Occupation, ContractStatus } from './types';

export const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Remove acentuação e caracteres especiais, mantendo apenas ASCII básico.
 */
export const removeAccents = (str: string): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7F]/g, '');
};

/**
 * Memoriza e formata o CPF no padrão: ***.456.789-**
 * Garante que o dado seja armazenado já anonimizado.
 */
export const maskCPF = (cpf: string): string => {
  if (!cpf) return '***.***.***-**';
  
  // Se já estiver no formato de máscara final, retorna
  if (cpf.startsWith('***') && cpf.endsWith('**')) return cpf;

  let digits = cpf.replace(/\D/g, '');
  
  // Recompõe zeros à esquerda se necessário
  if (digits.length > 0 && digits.length < 11) {
    digits = digits.padStart(11, '0');
  }
  
  if (digits.length === 11) {
    return `***.${digits.substring(3, 6)}.${digits.substring(6, 9)}-**`;
  }
  
  return '***.***.***-**';
};

export const normalizeString = (str: string): string => {
  if (!str) return '';
  return removeAccents(str).toLowerCase().trim();
};

export const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, 'dd-MM-yyyy');
  } catch {
    return dateStr;
  }
};

export const calculateDaysUsed = (occupations: Occupation[]): number => {
  return occupations.reduce((acc, occ) => {
    const start = parseISO(occ.startDate);
    const end = parseISO(occ.endDate);
    return acc + Math.max(0, differenceInDays(end, start) + 1);
  }, 0);
};

export const getSlotRemainingDays = (vacancy: Vacancy, slotIndex: number): number => {
  const slotOccupations = vacancy.occupations.filter(o => o.slotIndex === slotIndex);
  const used = calculateDaysUsed(slotOccupations);
  return Math.max(0, vacancy.maxTermDays - used);
};

export const calculateProjectedEndDate = (startDate: string, remainingDays: number): string => {
  if (remainingDays <= 0) return startDate;
  return format(addDays(parseISO(startDate), remainingDays - 1), 'yyyy-MM-dd');
};

export const suggestInitialEndDate = (startDate: string): string => {
  if (!startDate) return '';
  try {
    return format(subDays(addYears(parseISO(startDate), 1), 1), 'yyyy-MM-dd');
  } catch {
    return '';
  }
};

export const getWarningInfo = (occ: Occupation) => {
  const today = startOfDay(new Date());
  if (!occ.endDate || occ.status === ContractStatus.ENDED) {
    return { isWarning: false, daysLeft: 0, label: '', type: '' };
  }

  const end = parseISO(occ.endDate);
  const diff = differenceInDays(end, today);

  if (diff <= 30 && diff >= 0) {
    return { isWarning: true, daysLeft: diff, label: 'Crítico: Término Iminente', type: 'termination' };
  } else if (diff <= 90 && diff >= 0) {
    return { isWarning: true, daysLeft: diff, label: 'Alerta: Fim em 90 dias', type: 'extension' };
  }

  return { isWarning: false, daysLeft: diff, label: '', type: '' };
};
