
export enum UserRole {
  ADMIN = 'admin',
  HR = 'hr',
  CONSULTANT = 'consultant'
}

export enum VacancyStatus {
  PROVIDED = 'Provida',
  NOT_PROVIDED = 'Não Provida',
  CLOSED = 'Encerrada',
  EXHAUSTED = 'Esgotada'
}

export enum ContractStatus {
  ACTIVE = 'Ativo',
  ENDED = 'Encerrado'
}

export enum CompetitionType {
  AC = 'Ampla Concorrência',
  PCD = 'Pessoa com Deficiência',
  PPP = 'Cotas (PPP)'
}

export enum ConvocationStatus {
  PENDING = 'Pendente',
  HIRED = 'Contratado',
  DECLINED = 'Desistente'
}

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
  lastLogin?: string;
}

export interface ConvokedPerson {
  id: string;
  name: string;
  cpf: string;
  email: string;
  profile: string;
  notice: string;
  competition: CompetitionType;
  ranking: number;
  status: ConvocationStatus;
  createdAt: string; 
}

export interface LegalParameter {
  id: string;
  label: string;
  days: number;
  description: string;
}

export interface EmailConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  sender: string;
  subject: string;
  template: string;
}

export interface Occupation {
  id: string;
  contractedName: string;
  personId?: string;
  order: number;
  slotIndex: number; 
  startDate: string;
  endDate: string;
  competition?: CompetitionType;
  amendmentTerm?: string;
  projectedFinalDate: string; 
  isExtensionRequired: boolean; 
  terminationReason?: string;
  status: ContractStatus;
  lastNotificationDate?: string;
  notificationsCount?: number;
}

export interface Vacancy {
  id: string;
  code: string;
  legalBase: string;
  type: string;
  maxTermDays: number; 
  status: VacancyStatus;
  occupations: Occupation[];
  creationDate: string;
  publicNotice: string;
  agency: string;
  unit: string;
  initialQuantity: number; 
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}
