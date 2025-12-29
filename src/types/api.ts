// src/types/api.ts

export type UserType = 'academia' | 'estudante' | 'admin';

export type AcademiaType = 'escola' | 'superior';

export type NivelEscolar = 'fundamental' | 'medio';

export type AnoEscolar = 
  | 'primeiro_fundamental' | 'segundo_fundamental' | 'terceiro_fundamental'
  | 'quarto_fundamental' | 'quinto_fundamental' | 'sexto_fundamental'
  | 'setimo_fundamental' | 'oitavo_fundamental' | 'nono_fundamental'
  | 'primeiro_medio' | 'segundo_medio' | 'terceiro_medio';

export type AnoSuperior = 
  | 'primeiro_superior' | 'segundo_superior' | 'terceiro_superior'
  | 'quarto_superior' | 'quinto_superior';

export type StatusEscolar = 'ativo' | 'inativo' | 'transferido' | 'concluido';

export type StatusInscricao = 'espera' | 'aprovada' | 'reprovada';

export type Periodo = 
  | 'trimestre_1' | 'trimestre_2' | 'trimestre_3'
  | 'semestre_1' | 'semestre_2';

// Request Types
export interface CriarEscolaRequest {
  type: 'escola';
  senha: string;
  nome: string;
  provincia: string;
  endereco: string;
  numero_telefone: string;
  email: string;
  nivel_escolar: NivelEscolar;
  cursos: string[];
}

export interface CriarUniversidadeRequest {
  type: 'superior';
  senha: string;
  nome: string;
  provincia: string;
  endereco: string;
  numero_telefone: string;
  email: string;
  website?: string;
  cursos: string[];
}

export interface LoginRequest {
  usuario: string;
  senha: string;
  type: UserType;
}

export interface CriarEstudanteFundamentalRequest {
  senha: string;
  nome: string;
  bilhete_identidade_responsavel: string;
  ano_escolar: AnoEscolar;
  status_escolar: StatusEscolar;
}

export interface CriarEstudanteSuperiorRequest {
  senha: string;
  nome: string;
  bilhete_identidade: string;
  ano_superior: AnoSuperior;
  curso_superior: string;
  status_superior: StatusEscolar;
}

export interface SolicitarInscricaoRequest {
  codigo_academia: string;
  ano_escolar_inscricao?: AnoEscolar;
  curso_medio?: string | null;
}

export interface Materia {
  nome: string;
  nota?: number;
  faltas?: number;
}

export interface RegistrarNotasRequest {
  codigo_estudante: string;
  ano_lectivo: string;
  periodo: Periodo;
  materias: Materia[];
}

export interface RegistrarFaltasRequest {
  codigo_estudante: string;
  ano_lectivo: string;
  periodo: Periodo;
  materias: Materia[];
}

export interface CriarAdminRequest {
  nome: string;
  email: string;
  senha: string;
  role: string;
}

export interface DesativarRequest {
  motivo: string;
}

// Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AuthResponse {
  token: string;
  codigo: string;
  codigo_academia?: string;
  id?: string;
  type: UserType;
}

export interface Inscricao {
  id: string;
  codigo_estudante: string;
  codigo_academia: string;
  status: StatusInscricao;
  ano_escolar_inscricao?: AnoEscolar;
  curso_medio?: string;
  created_at: string;
  updated_at: string;
}

export interface NotasPorPeriodo {
  periodo: Periodo;
  materias: Materia[];
}

export interface FaltasPorPeriodo {
  periodo: Periodo;
  materias: Materia[];
}

export interface HistoricoEstudante {
  codigo: string;
  nome: string;
  anos_lectivos: {
    ano: string;
    periodos: (NotasPorPeriodo | FaltasPorPeriodo)[];
  }[];
}

export interface Evento {
  id: string;
  tipo: string;
  dados: any;
  timestamp: string;
}