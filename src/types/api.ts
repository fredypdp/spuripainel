// src/types/api.ts

export type UserType = 'academia' | 'estudante' | 'admin';
export type AdminType = "gerente" | "adm" | "fpp"; // 🔥 Corrigido: "adm" ao invés de "admin"

export type AcademiaType = 'escola' | 'superior';

export type NivelEscolar = 'fundamental' | 'medio' | "misto";

export type AnoEscolar = 
  | 'primeiro_fundamental' | 'segundo_fundamental' | 'terceiro_fundamental'
  | 'quarto_fundamental' | 'quinto_fundamental' | 'sexto_fundamental'
  | 'setimo_fundamental' | 'oitavo_fundamental' | 'nono_fundamental'
  | 'primeiro_medio' | 'segundo_medio' | 'terceiro_medio' | 'quarto_medio';

export type AnoSuperior = 
  | 'primeiro_superior' | 'segundo_superior' | 'terceiro_superior'
  | 'quarto_superior' | 'quinto_superior';

export type StatusEscolar = 'inativo' | 'em_andamento' | 'finalizado'; // 🔥 Atualizado
export type StatusSuperior = 'inativo' | 'em_andamento' | 'finalizado'; // 🔥 Atualizado
export type StatusGeral = 'inativo' | 'ativo' | 'finalizado'; // 🔥 Novo

export type StatusInscricao = 'espera' | 'aprovado' | 'reprovado';

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
  email?: string;
  usuario: string;
  senha: string;
  type: UserType;
}

export interface CriarEstudanteFundamentalRequest {
  senha: string;
  nome: string;
  bilhete_identidade?: string;
  bilhete_identidade_responsavel?: string;
  ano_escolar?: AnoEscolar;
  status_escolar?: StatusEscolar;
}

export interface CriarEstudanteSuperiorRequest {
  senha: string;
  nome: string;
  bilhete_identidade: string;
  ano_superior?: AnoSuperior;
  curso_superior?: string;
  status_superior?: StatusSuperior;
}

export interface SolicitarInscricaoRequest {
  codigo_academia: string;
  ano_escolar_inscricao: AnoEscolar;
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
  role: AdminType;
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
  id?: string;
  nome: string;
  token: string;
  codigo: string; // 🔥 Unificado: codigo_estudante ou codigo_academia
  type: UserType;
  role?: AdminType; // 🔥 Para admin
}

export interface Inscricao {
  id: string;
  estudante_id: string;
  codigo_estudante: string;
  academia_id: string;
  codigo_academia: string;
  tipo: 'escola' | 'universidade';
  ano_inscricao: string;
  curso?: string;
  status: StatusInscricao;
  status_usado: boolean; // 🔥 Novo
  created_at: string;
  updated_at: string;
  event_id?: string;
  version?: number;
}

export interface ListarInscricoesResponse {
  inscricoes: Inscricao[];
  total: number;
  total_geral: number;
  limit: number;
  offset: number;
  status_filter?: string;
  user_type: UserType;
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
  event_id: string;
  aggregate_id: string;
  aggregate_type: string;
  event_type: string;
  event_version: number;
  payload: any;
  metadata: any;
  occurred_at: string;
  recorded_at: string;
  ledger_hash: string;
  previous_hash?: string;
}

// Response Types - Perfis
export interface EstudanteDetalhado {
  id: string;
  nome: string;
  codigo_estudante: string;
  bilhete_identidade?: string;
  bilhete_identidade_responsavel?: string;
  codigo_academia?: string;
  status: StatusGeral; // 🔥 Novo
  status_escolar: StatusEscolar; // 🔥 Atualizado
  status_superior: StatusSuperior; // 🔥 Atualizado
  academia_info?: {
    codigo: string;
    nome: string;
    tipo: string;
    provincia?: string;
    nivel_escolar?: NivelEscolar;
  };
  ano_escolar?: string;
  ano_superior?: string;
  curso_medio?: string;
  curso_superior?: string;
  created_at: string;
  total_notas?: number;
  total_faltas?: number;
  total_inscricoes?: number;
}

export interface AcademiaSimples {
  codigo_academia: string;
  created_at: string;
  id: string;
  nivel_escolar?: NivelEscolar;
  nome: string;
  provincia: string;
  status: string;
  total_estudantes: number;
  total_inscricoes_pendentes: number;
  type: AcademiaType;
}

export interface AcademiaDetalhada {
  id: string;
  type: AcademiaType;
  nome: string;
  codigo_academia: string;
  provincia: string;
  endereco: string;
  numero_telefone: string;
  email: string;
  website?: string;
  nivel_escolar?: NivelEscolar;
  status: string;
  cursos: string[];
  created_at: string;
  total_estudantes?: number;
  total_inscricoes_pendentes?: number;
}

export interface AdminDetalhado {
  id: string;
  nome: string;
  email: string;
  role: AdminType;
  status: string;
  created_by?: string;
  created_at: string;
  total_acoes_realizadas?: number;
}

export interface MeuPerfilResponse {
  tipo: 'estudante' | 'academia' | 'admin';
  estudante?: EstudanteDetalhado;
  academia?: AcademiaDetalhada;
  admin?: AdminDetalhado;
}

export interface ConsultarEstudantesResponse {
  estudantes: {
    id: string;
    nome: string;
    codigo_estudante: string;
    bilhete_identidade?: string;
    bilhete_identidade_responsavel?: string;
    codigo_academia?: string;
    ano_escolar?: string;
    ano_superior?: string;
    status_superior?: StatusSuperior;
    status_escolar?: StatusEscolar;
    created_at: string;
    total_notas: number;
    total_faltas: number;
    total_inscricoes: number;
  }[];
  total: number;
  tipo_usuario: string;
  codigo_academia?: string;
  nome_academia?: string;
}

export interface ConsultarEstudanteResponse {
  estudante: EstudanteDetalhado;
  consultado_por: 'academia' | 'admin';
}

export interface ConsultarAcademiasResponse {
  academias: AcademiaSimples[];
  total: number;
}

export interface ConsultarAcademiaResponse {
  academia: AcademiaDetalhada;
  consultado_por: 'academia' | 'admin';
  estatisticas_completas?: {
    total_inscricoes_historico: number;
    total_notas_registradas: number;
    total_faltas_registradas: number;
  };
}

export interface ConsultarAdminResponse {
  admin: AdminDetalhado;
}

export interface BuscarUsuarioResponse {
  tipo: 'estudante' | 'academia' | 'admin';
  dados: EstudanteDetalhado | AcademiaDetalhada | AdminDetalhado;
}

export interface PrimeiroAmdminResponse {
  credentials: {
    email: string;
    senha: string;
  };
  data: {
    email: string;
    id: string;
    nome: string;
    role: AdminType;
  };
  message: string;
  next_steps: string[];
  success: boolean;
  test_login: {
    body: {
      email: string;
      senha: string;
    };
    method: "POST";
    url: "/admin/login";
  };
}

export interface InscricaoResponse {
  message: string;
  codigo_academia: string;
}

export interface Provincia {
  nome: ProvinciaNome;
  codigo: ProvinciaCodigo;
}

export type ProvinciaNome =
  | "BENGO" | "BENGUELA" | "BIE" | "CABINDA" | "CUANDO CUBANGO"
  | "CUANZA NORTE" | "CUANZA SUL" | "CUBANGO" | "CUNENE" | "HUAMBO"
  | "HUILA" | "ICOLO E BENGO" | "LUANDA" | "LUNDA NORTE" | "LUNDA SUL"
  | "MALANJE" | "MOXICO" | "MOXICO LESTE" | "NAMIBE" | "UIGE" | "ZAIRE";

export type ProvinciaCodigo =
  | "BGO" | "BGU" | "BIE" | "CAB" | "CND" | "CNO" | "CUS"
  | "CBG" | "CNN" | "HUA" | "HUI" | "IBG" | "LUA"
  | "LNO" | "LSU" | "MAL" | "MOX" | "MXL" | "NAM"
  | "UIG" | "ZAI";

export const Provincias: Provincia[] = [
  { nome: "BENGO", codigo: "BGO" },
  { nome: "BENGUELA", codigo: "BGU" },
  { nome: "BIE", codigo: "BIE" },
  { nome: "CABINDA", codigo: "CAB" },
  { nome: "CUANDO CUBANGO", codigo: "CND" },
  { nome: "CUANZA NORTE", codigo: "CNO" },
  { nome: "CUANZA SUL", codigo: "CUS" },
  { nome: "CUBANGO", codigo: "CBG" },
  { nome: "CUNENE", codigo: "CNN" },
  { nome: "HUAMBO", codigo: "HUA" },
  { nome: "HUILA", codigo: "HUI" },
  { nome: "ICOLO E BENGO", codigo: "IBG" },
  { nome: "LUANDA", codigo: "LUA" },
  { nome: "LUNDA NORTE", codigo: "LNO" },
  { nome: "LUNDA SUL", codigo: "LSU" },
  { nome: "MALANJE", codigo: "MAL" },
  { nome: "MOXICO", codigo: "MOX" },
  { nome: "MOXICO LESTE", codigo: "MXL" },
  { nome: "NAMIBE", codigo: "NAM" },
  { nome: "UIGE", codigo: "UIG" },
  { nome: "ZAIRE", codigo: "ZAI" },
];