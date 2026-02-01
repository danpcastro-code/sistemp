
export enum UserRole {
  ADMIN = 'ADMIN',
  RH = 'RH',
  CONSULTA = 'CONSULTA'
}

export interface User {
  id: string;
  nome: string;
  cpf?: string;
  email?: string;
  perfil: UserRole;
  secretariaId?: string;
  dataCriacao?: string;
}

export interface PerfilProfissional {
  demandas: string;
  competenciasComportamentais: string;
  formacao: string;
  competenciasTecnicas: string;
}

export interface Unidade {
  uorg: string;
  siorg: string;
  nome: string;
  sigla: string;
  uorgPai?: string;
  tipo: 'ORGAO' | 'SECRETARIA' | 'DIRETORIA' | 'COORDENACAO_GERAL' | 'COORDENACAO' | 'DIVISAO' | 'SERVICO' | 'OUTRO';
}

export interface Carreira {
  id: string;
  nome: string;
  codigoLegal: string;
  orgaoSupervisor: string;
}

export interface Cargo {
  id: string;
  nome: string;
  codigoCPNU: string;
  carreiraId: string;
  edicaoId: string;
  escolaridade: 'Médio' | 'Superior';
  vagasOriginarias: number;
  vagasAdicionais: number;
  totalVagas: number;
}

export interface Portaria {
  id: string;
  numero: string;
  dataPublicacao: string;
  linkDOU?: string;
  descricao?: string;
}

export interface CandidatoNomeado {
  id: string;
  nome: string;
  cpf: string;
  secretaria: string;
  diretoria: string;
  uorgId?: string;
  cargoId?: string; 
  portariaId?: string;
  carreira: string;
  cargo: string;
  linkCurriculo?: string;
  dataImportacao: string;
  dataPosse?: string;
  dataExercicio?: string;
  dataInicioContrato?: string; // Novo: Data oficial de contrato/exercício
  prorrogacoes?: number;       // Novo: Contador de prorrogações de prazo
}

export interface EdicaoCPNU {
  id: string;
  concurso: string; 
  ano: number;
  edital: string;
  situacao: 'Homologado' | 'Em andamento';
}

export interface Alocacao {
  id: string;
  uorgId: string;
  carreiraId: string;
  cargoId: string;
  edicaoId: string;
  portariaId: string;
  vagasPrevistas: number;
  vagasNomeadas: number; 
  vagasPosses: number;    
  vagasEfetivadas: number;
  dataRegistro: string;
  perfil?: PerfilProfissional; 
  observacoes?: string;
}

export interface HistoricoAlteracao {
  id: string;
  alocacaoId: string;
  tipo: 'CRIAÇÃO' | 'EDIÇÃO' | 'EXCLUSÃO';
  campoAlterado?: string;
  valorAnterior?: string;
  valorNovo?: string;
  dataHora: string;
  usuarioId: string;
  usuarioNome: string;
  justificativa: string;
}
