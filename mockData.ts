
import { Vacancy, VacancyStatus, ContractStatus, LegalParameter, ConvokedPerson, CompetitionType, ConvocationStatus, PSS } from './types';
import { addDays, format, subDays } from 'date-fns';
import { maskCPF } from './utils';

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

const today = new Date();

export const INITIAL_PSS: PSS[] = [
  {
    id: 'pss_default',
    title: 'PSS 001/2023 - PROFESSORES E TECNICOS',
    validUntil: format(addDays(today, 365), 'yyyy-MM-dd'),
    isArchived: false,
    candidates: []
  }
];

export const INITIAL_CONVOKED: ConvokedPerson[] = [
  {
    id: 'c1',
    name: 'ALICE SILVA',
    cpf: maskCPF('12345678900'),
    email: 'alice.silva@email.com',
    profile: 'PROFESSOR SUBSTITUTO',
    notice: 'PSS 001/2023',
    pssId: 'pss_default',
    competition: CompetitionType.AC,
    ranking: 1,
    status: ConvocationStatus.HIRED,
    convocationAct: 'PORTARIA 10/2024',
    convocationDate: format(subDays(today, 20), 'yyyy-MM-dd'),
    createdAt: format(subDays(today, 10), 'yyyy-MM-dd')
  },
  {
    id: 'c2',
    name: 'CARLOS MENDES',
    cpf: maskCPF('23456789011'),
    email: 'carlos.mendes@email.com',
    profile: 'PROFESSOR SUBSTITUTO',
    notice: 'PSS 001/2023',
    pssId: 'pss_default',
    competition: CompetitionType.AC,
    ranking: 2,
    status: ConvocationStatus.PENDING,
    convocationAct: 'PORTARIA 12/2024',
    convocationDate: format(subDays(today, 5), 'yyyy-MM-dd'),
    createdAt: format(subDays(today, 60), 'yyyy-MM-dd')
  }
];

INITIAL_PSS[0].candidates = [...INITIAL_CONVOKED];

export const INITIAL_VACANCIES: Vacancy[] = [
  {
    id: 'v1',
    code: 'VAG-2024-001',
    legalBase: 'Art 2º, IV',
    type: 'PROFESSOR SUBSTITUTO',
    maxTermDays: 730,
    status: VacancyStatus.PROVIDED,
    creationDate: '2024-01-10',
    publicNotice: 'PSS 001/2023',
    pssId: 'pss_default',
    agency: 'UNIVERSIDADE FEDERAL',
    unit: 'DEPARTAMENTO DE COMPUTACAO',
    initialQuantity: 3,
    occupations: [
      {
        id: 'occ1',
        contractedName: 'ALICE SILVA',
        personId: 'c1',
        order: 1,
        slotIndex: 1,
        startDate: '2024-01-15',
        endDate: '2025-01-15',
        competition: CompetitionType.AC,
        projectedFinalDate: '2026-01-14',
        isExtensionRequired: true,
        status: ContractStatus.ACTIVE
      }
    ]
  }
];
