
import { differenceInDays, parseISO, addDays, format, addYears, subDays, startOfDay } from 'date-fns';
import { Vacancy, Occupation, ContractStatus } from './types';

/**
 * Remove acentuação e caracteres especiais de uma string.
 */
export const removeAccents = (str: string): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\x00-\x7F]/g, ''); // Remove qualquer outro caractere não-ASCII (limpeza profunda)
};

/**
 * Aplica máscara de proteção ao CPF: ***.XXX.XXX-**
 */
export const maskCPF = (cpf: string): string => {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length < 11) return '***.***.***-**';
  const part1 = digits.substring(3, 6);
  const part2 = digits.substring(6, 9);
  return `***.${part1}.${part2}-**`;
};

export const normalizeString = (str: string): string => {
  if (!str) return '';
  return removeAccents(str).toLowerCase().trim();
};

export const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    if (isNaN(date.getTime())) return dateStr;
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
  return format(subDays(addYears(parseISO(startDate), 1), 0), 'yyyy-MM-dd');
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const getWarningInfo = (occ: Occupation) => {
  const today = startOfDay(new Date());
  const endDate = parseISO(occ.endDate);
  const maxDate = parseISO(occ.projectedFinalDate);
  
  const daysToCurrentEnd = differenceInDays(endDate, today);
  const daysToMaxEnd = differenceInDays(maxDate, today);

  if (daysToMaxEnd <= 90) {
    return {
      isWarning: true,
      daysLeft: daysToMaxEnd,
      type: 'termination',
      date: occ.projectedFinalDate,
      label: 'Término Improrrogável'
    };
  }

  if (occ.isExtensionRequired && daysToCurrentEnd <= 90) {
    return {
      isWarning: true,
      daysLeft: daysToCurrentEnd,
      type: 'extension',
      date: occ.endDate,
      label: 'Necessita Prorrogação'
    };
  }

  return { isWarning: false, daysLeft: 999, type: 'none', date: '', label: '' };
};

export const getVacancyStats = (vacancy: Vacancy) => {
  const totalCapacityDays = vacancy.maxTermDays * vacancy.initialQuantity;
  const daysUsedTotal = calculateDaysUsed(vacancy.occupations);
  const daysRemainingTotal = Math.max(0, totalCapacityDays - daysUsedTotal);
  
  return { 
    daysUsedTotal, 
    daysRemainingTotal, 
    totalCapacityDays, 
    currentlyActiveCount: vacancy.occupations.filter(o => o.status === ContractStatus.ACTIVE).length,
    percentageUsedTotal: totalCapacityDays > 0 ? (daysUsedTotal / totalCapacityDays) * 100 : 0
  };
};
