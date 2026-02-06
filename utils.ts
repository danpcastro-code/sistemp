
import { differenceInDays, parseISO, addDays, format, addYears, subDays, startOfDay, isValid } from 'date-fns';
import { Vacancy, Occupation, ContractStatus } from './types';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const removeAccents = (str: string): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7F]/g, '');
};

export const maskCPF = (cpf: string): string => {
  if (!cpf) return '***.***.***-**';
  
  // Limpa caracteres não numéricos
  let digits = cpf.replace(/\D/g, '');
  
  // Se for um CPF já mascarado (ex: vindo do mock), tenta extrair os números ou mantém
  if (digits.length === 0) return cpf.includes('*') ? cpf : '***.***.***-**';
  
  // Recompõe zeros à esquerda (comum em Excel/CSV)
  if (digits.length < 11) {
    digits = digits.padStart(11, '0');
  }
  
  // Formato: ***.456.789-** (Oculta os 3 primeiros e os 2 últimos conforme solicitado)
  return `***.${digits.substring(3, 6)}.${digits.substring(6, 9)}-**`;
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
