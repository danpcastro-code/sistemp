
import { Vacancy, VacancyStatus, ContractStatus, LegalParameter, ConvokedPerson, CompetitionType, ConvocationStatus, PSS } from './types';
import { addDays, format, subDays } from 'date-fns';

/**
 * Parâmetros de Amparo Legal
 * Mantidos pois são a base normativa do sistema.
 */
export const INITIAL_PARAMETERS: LegalParameter[] = [
  { 
    id: 'p1', 
    label: 'Art 2º, IV', 
    days: 730, 
    description: 'Professores Substitutos e Visitantes',
    type: 'legal',
    status: 'active',
    lawRef: 'Lei 8.745/1993',
    articleRef: 'Art. 2º, IV',
    legalText: 'Contratação de professor substituto e professor visitante.'
  },
  { 
    id: 'p2', 
    label: 'Art 2º, VI', 
    days: 1460, 
    description: 'Técnicos Especializados',
    type: 'legal',
    status: 'active',
    lawRef: 'Lei 8.745/1993',
    articleRef: 'Art. 2º, VI',
    legalText: 'Contratação de pesquisador e tecnólogo de alta qualificação.'
  },
  { 
    id: 'p3', 
    label: 'Art 2º, V', 
    days: 1825, 
    description: 'Pesquisadores em geral',
    type: 'legal',
    status: 'active',
    lawRef: 'Lei 8.745/1993',
    articleRef: 'Art. 2º, V',
    legalText: 'Contratação de pessoal para atividades de pesquisa e desenvolvimento.'
  },
  { 
    id: 'p4', 
    label: 'Art 2º, I', 
    days: 365, 
    description: 'Calamidade Pública',
    type: 'legal',
    status: 'active',
    lawRef: 'Lei 8.745/1993',
    articleRef: 'Art. 2º, I',
    legalText: 'Assistência a situações de calamidade pública.'
  },
];

/**
 * Listas de dados limpas para início de operação
 */
export const INITIAL_PSS: PSS[] = [];
export const INITIAL_CONVOKED: ConvokedPerson[] = [];
export const INITIAL_VACANCIES: Vacancy[] = [];
