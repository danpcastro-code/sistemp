
import { Vacancy, VacancyStatus, ContractStatus, LegalParameter, ConvokedPerson, CompetitionType, ConvocationStatus } from './types';
import { addDays, format, subDays } from 'date-fns';

export const INITIAL_PARAMETERS: LegalParameter[] = [
  { id: 'p1', label: 'Art 2º, IV', days: 730, description: 'Professores Substitutos e Visitantes' },
  { id: 'p2', label: 'Art 2º, VI', days: 1460, description: 'Técnicos Especializados' },
  { id: 'p3', label: 'Art 2º, V', days: 1825, description: 'Pesquisadores em geral' },
  { id: 'p4', label: 'Art 2º, I', days: 365, description: 'Assistência a situações de calamidade pública' },
];

const today = new Date();

export const INITIAL_CONVOKED: ConvokedPerson[] = [
  {
    id: 'c1',
    name: 'Alice Silva',
    cpf: '123.456.789-00',
    email: 'alice.silva@email.com',
    profile: 'Professor Substituto - Computação',
    notice: 'Edital 05/2023',
    competition: CompetitionType.AC,
    ranking: 1,
    status: ConvocationStatus.HIRED,
    createdAt: format(subDays(today, 10), 'yyyy-MM-dd')
  },
  {
    id: 'c2',
    name: 'Carlos Mendes',
    cpf: '234.567.890-11',
    email: 'carlos.mendes@email.com',
    profile: 'Professor Substituto - Computação',
    notice: 'Edital 05/2023',
    competition: CompetitionType.AC,
    ranking: 2,
    status: ConvocationStatus.PENDING,
    createdAt: format(subDays(today, 60), 'yyyy-MM-dd')
  },
  {
    id: 'c3',
    name: 'Mariana Luz',
    cpf: '345.678.901-22',
    email: 'mariana.luz@email.com',
    profile: 'Professor Substituto - Computação',
    notice: 'Edital 05/2023',
    competition: CompetitionType.PPP,
    ranking: 3,
    status: ConvocationStatus.PENDING,
    createdAt: format(subDays(today, 5), 'yyyy-MM-dd')
  }
];

export const INITIAL_VACANCIES: Vacancy[] = [
  {
    id: 'v1',
    code: 'VAG-2024-001',
    legalBase: 'Lei 8.745/1993, Art. 2º, IV',
    type: 'Professor Substituto',
    maxTermDays: 730,
    status: VacancyStatus.PROVIDED,
    creationDate: '2024-01-10',
    publicNotice: 'Edital 05/2023',
    agency: 'Universidade Federal',
    unit: 'Departamento de Computação',
    initialQuantity: 3,
    occupations: [
      {
        id: 'occ1',
        contractedName: 'Alice Silva',
        personId: 'c1',
        order: 1,
        slotIndex: 1,
        startDate: '2024-01-15',
        endDate: '2025-01-15',
        competition: CompetitionType.AC,
        projectedFinalDate: '2026-01-14',
        isExtensionRequired: true,
        status: ContractStatus.ACTIVE
      },
      {
        id: 'occ_warning',
        contractedName: 'Roberto Alerta',
        personId: 'c_warning',
        order: 1,
        slotIndex: 2,
        startDate: format(subDays(today, 680), 'yyyy-MM-dd'),
        endDate: format(addDays(today, 45), 'yyyy-MM-dd'),
        competition: CompetitionType.PPP,
        projectedFinalDate: format(addDays(today, 50), 'yyyy-MM-dd'),
        isExtensionRequired: false,
        status: ContractStatus.ACTIVE,
        lastNotificationDate: format(subDays(today, 5), 'yyyy-MM-dd'),
        notificationsCount: 1
      }
    ]
  }
];
