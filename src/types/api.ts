// src/types/api.ts

export type UserType = 'academia' | 'estudante' | 'admin';
export type AdminType = "gerente" | "adm" | "fpp";

export type AcademiaType = 'escola' | 'superior';
export type NivelEscolar = 'fundamental' | 'medio' | "misto";

export type AnoEscolar = 
  | 'primeiro_fundamental' | 'segundo_fundamental' | 'terceiro_fundamental'
  | 'quarto_fundamental' | 'quinto_fundamental' | 'sexto_fundamental'
  | 'setimo_fundamental' | 'oitavo_fundamental' | 'nono_fundamental'
  | 'primeiro_medio' | 'segundo_medio' | 'terceiro_medio';

export type AnoSuperior = 
  | 'primeiro_ano' | 'segundo_ano' | 'terceiro_ano'
  | 'quarto_ano' | 'quinto_ano' | 'sexto_ano';

export type StatusEscolar = 'inativo' | 'em_andamento' | 'finalizado';
export type StatusSuperior = 'inativo' | 'em_andamento' | 'finalizado';
export type StatusGeral = 'inativo' | 'ativo' | 'finalizado';
export type StatusInscricao = 'espera' | 'aprovado' | 'reprovado';

export type Periodo = 
  | '1_trimestre' | '2_trimestre' | '3_trimestre'
  | '1_semestre' | '2_semestre';

export type CursoType = 'medio' | 'superior';
export type MateriaType = 'fundamental' | 'medio' | 'superior';

// =====================
// REQUEST TYPES
// =====================

export interface CriarEscolaRequest {
  type: 'escola';
  senha: string;
  nome: string;
  provincia: string;
  endereco: string;
  numero_telefone?: string;
  email?: string;
  website?: string;
  nivel_escolar: NivelEscolar;
  cursos?: string[];
}

export interface CriarUniversidadeRequest {
  type: 'superior';
  senha: string;
  nome: string;
  provincia: string;
  endereco: string;
  numero_telefone?: string;
  email?: string;
  website?: string;
  cursos?: string[];
}

export interface LoginRequest {
  usuario: string;
  senha: string;
  type: UserType;
}

export interface AdminLoginRequest {
  email: string;
  senha: string;
}

export interface CriarEstudanteRequest {
  senha: string;
  nome: string;
  email?: string;
  telefone?: string;
  bilhete_identidade?: string;
  bilhete_identidade_responsavel?: string;
  ano_escolar?: string;
  ano_superior?: string;
  curso_medio?: string;
  curso_superior?: string;
  status_escolar?: StatusEscolar;
  status_superior?: StatusSuperior;
}

export interface SolicitarInscricaoEscolaRequest {
  codigo_academia: string;
  ano_escolar_inscricao: string;
  curso_medio?: string;
}

export interface SolicitarInscricaoUniversidadeRequest {
  codigo_academia: string;
  ano_inscricao: string;
  curso?: string;
}

// 🔥 NOVO v3.0: Nota individual
export interface RegistrarNotasRequest {
  codigo_estudante: string;
  ano_lectivo: string;
  periodo: Periodo;
  materia_disciplinar_id: string;
  nota: number;
  observacao?: string;
}

// 🔥 NOVO v3.0: Falta individual
export interface RegistrarFaltasRequest {
  codigo_estudante: string;
  ano_lectivo: string;
  data: string; // YYYY-MM-DD
  materia_disciplinar_id: string;
  quantidade: number;
  observacao?: string;
}

export interface AprovarInscricaoRequest {
  codigo_estudante: string;
  tipo: 'escola' | 'superior';
  ano_inscricao: string;
  curso?: string;
}

export interface ReprovarInscricaoRequest {
  codigo_estudante: string;
  motivo: string;
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

export interface VincularAcademiaRequest {
  inscricao_id: string;
}

export interface AtualizarStatusRequest {
  novo_status: StatusEscolar | StatusSuperior;
}

// ✅ Cursos e Matérias
export interface CriarCursoRequest {
  nome: string;
  type: CursoType;
  nivel: string[];
}

export interface AtualizarCursoRequest {
  nome?: string;
  type?: CursoType;
  nivel?: string[];
}

export interface CriarMateriaRequest {
  nome: string;
  type: MateriaType;
  nivel?: string[];
  curso_id?: string;
}

export interface AtualizarMateriaRequest {
  nome?: string;
  type?: MateriaType;
}

// ✅ Atualização de Dados
export interface AtualizarDadosPessoaisEstudanteRequest {
  nome?: string;
  email?: string;
  telefone?: string;
  bilhete_identidade?: string;
  bilhete_identidade_responsavel?: string;
}

export interface AtualizarDadosAcademicosEstudanteRequest {
  ano_escolar?: string;
  ano_superior?: string;
  curso_medio?: string;
  curso_superior?: string;
}

export interface AtualizarDadosAcademiaRequest {
  nome?: string;
  provincia?: string;
  endereco?: string;
  numero_telefone?: string;
  email?: string;
  website?: string;
  nivel_escolar?: string;
  cursos?: string[];
}

export interface AtualizarDadosAdminRequest {
  nome?: string;
  email?: string;
}

export interface AtualizarRoleAdminRequest {
  novo_role: AdminType;
}

export interface AlterarSenhaRequest {
  senha_atual: string;
  nova_senha: string;
}

export interface SolicitarRecuperacaoRequest {
  identificador: string;
  tipo: 'estudante' | 'academia' | 'admin';
}

export interface SolicitarVerificacaoRequest {
  identificador: string;
  tipo: 'estudante' | 'academia' | 'admin';
}

// =====================
// RESPONSE TYPES
// =====================

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AuthResponse {
  token: string;
  codigo?: string;
  nome: string;
  type: UserType;
  role?: AdminType;
}

export interface Inscricao {
  id: string;
  estudante_id: string;
  codigo_estudante: string;
  academia_id: string;
  codigo_academia: string;
  tipo: 'escola' | 'superior';
  ano_inscricao: string;
  curso?: string;
  status: StatusInscricao;
  status_usado: boolean;
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
  has_next: boolean;
  status_filter?: string;
  user_type: UserType;
}

export interface InscricaoResponse {
  message: string;
  status: string;
  academia: string;
}

// 🔥 NOVO v3.0: Estrutura individual de nota
export interface Nota {
  id: string;
  estudante_id: string;
  codigo_estudante: string;
  codigo_academia: string;
  ano_lectivo: string;
  periodo: Periodo;
  materia_disciplinar_id: string;
  materia_nome?: string;
  nota: number;
  observacao?: string;
  registered_at: string;
  event_id: string;
  version: number;
}

// 🔥 NOVO v3.0: Estrutura individual de falta
export interface Falta {
  id: string;
  estudante_id: string;
  codigo_estudante: string;
  codigo_academia: string;
  ano_lectivo: string;
  data: string;
  materia_disciplinar_id: string;
  materia_nome?: string;
  quantidade: number;
  observacao?: string;
  registered_at: string;
  event_id: string;
  version: number;
}

export interface NotasEstudanteResponse {
  codigo_estudante: string;
  nome: string;
  notas: Nota[];
  total: number;
}

export interface FaltasEstudanteResponse {
  codigo_estudante: string;
  nome: string;
  faltas: Falta[];
  total: number;
}

export interface HistoricoCompletoResponse {
  estudante: EstudanteDetalhado;
  notas: Nota[];
  faltas: Falta[];
  inscricoes: Inscricao[];
}

export interface Evento {
  id: number;
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

export interface EventosEstudanteResponse {
  codigo_estudante: string;
  nome: string;
  eventos: Evento[];
  total: number;
  message: string;
}

export interface VerificarIntegridadeResponse {
  codigo_estudante: string;
  nome: string;
  integro: boolean;
  message: string;
}

// ✅ Cursos e Matérias
export interface Curso {
  id: string;
  nome: string;
  type: CursoType;
  nivel: string[];
  codigo_academia: string;
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Materia {
  id: string;
  nome: string;
  type: MateriaType;
  nivel?: string[];
  codigo_academia: string;
  curso_id?: string;
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
  version: number;
}

export interface ListarCursosResponse {
  cursos: Curso[];
  total: number;
}

export interface ListarMateriasResponse {
  materias: Materia[];
  total: number;
}

// =====================
// PERFIS E CONSULTAS
// =====================

export interface EstudanteDetalhado {
  id: string;
  nome: string;
  codigo_estudante: string;
  email?: string;
  telefone?: string;
  email_verificado: boolean;
  bilhete_identidade?: string;
  bilhete_identidade_responsavel?: string;
  codigo_academia?: string;
  status: StatusGeral;
  status_escolar: StatusEscolar;
  status_superior: StatusSuperior;
  ano_escolar?: string;
  ano_superior?: string;
  curso_medio?: string;
  curso_superior?: string;
  created_at: string;
  updated_at: string;
  total_notas: number;
  total_faltas: number;
  total_inscricoes: number;
  version: number;
}

export interface AcademiaSimples {
  id: string;
  type: AcademiaType;
  nome: string;
  codigo_academia: string;
  provincia: string;
  status: string;
  nivel_escolar?: NivelEscolar;
  created_at: string;
  total_estudantes: number;
  total_inscricoes_pendentes: number;
}

export interface AcademiaDetalhada {
  id: string;
  type: AcademiaType;
  nome: string;
  codigo_academia: string;
  provincia: string;
  endereco: string;
  numero_telefone?: string;
  email?: string;
  email_verificado: boolean;
  website?: string;
  nivel_escolar?: NivelEscolar;
  status: string;
  cursos: string[];
  created_at: string;
  updated_at: string;
  total_estudantes: number;
  total_inscricoes_pendentes: number;
  version: number;
}

export interface AdminDetalhado {
  id: string;
  nome: string;
  email: string;
  role: AdminType;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  total_acoes_realizadas: number;
  version: number;
}

export interface MeuPerfilResponse {
  tipo: UserType;
  estudante?: EstudanteDetalhado & {
    academia_info?: {
      codigo: string;
      nome: string;
      tipo: AcademiaType;
    };
  };
  academia?: AcademiaDetalhada;
  admin?: AdminDetalhado;
}

export interface ConsultarEstudanteResponse {
  estudante: EstudanteDetalhado & {
    academia_info?: {
      codigo: string;
      nome: string;
      tipo: AcademiaType;
      provincia: string;
      nivel_escolar?: NivelEscolar;
    };
  };
  consultado_por: 'academia' | 'admin';
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
  tipo: UserType;
  dados: EstudanteDetalhado | AcademiaDetalhada | AdminDetalhado;
}

export interface ConsultarAcademiasResponse {
  academias: AcademiaSimples[];
  total: number;
  total_geral: number;
  limit: number;
  offset: number;
  has_next: boolean;
}

export interface ConsultarEstudantesResponse {
  estudantes: EstudanteDetalhado[];
  total: number;
  tipo_usuario: UserType;
  codigo_academia?: string;
  nome_academia?: string;
}

export interface PrimeiroAdminResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    nome: string;
    email: string;
    role: AdminType;
  };
  credentials: {
    email: string;
    senha: string;
  };
  next_steps: string[];
  test_login: {
    url: string;
    method: string;
    body: {
      email: string;
      senha: string;
    };
  };
}

export interface ListarInscricoesAprovadasResponse {
  inscricoes: Inscricao[];
  total: number;
  mensagem: string;
}

export interface VincularAcademiaResponse {
  message: string;
  status: string;
}

export interface AtualizarStatusResponse {
  message: string;
  novo_status: string;
}

// ✅ ADMIN - Registros
export interface RegistroCompleto {
  notas?: Nota[];
  total_notas?: number;
  faltas?: Falta[];
  total_faltas?: number;
  estatisticas?: {
    total_estudantes: number;
    total_academias: number;
    total_notas: number;
    total_faltas: number;
  };
  limit?: number;
  offset?: number;
  filtro_tipo?: string;
}

export interface RegistrosPorEstudanteResponse {
  estudante: {
    codigo: string;
    nome: string;
    id: string;
  };
  notas: Nota[];
  total_notas: number;
  faltas: Falta[];
  total_faltas: number;
}

export interface RegistrosPorAcademiaResponse {
  academia: {
    codigo: string;
    nome: string;
    id: string;
  };
  notas: Nota[];
  total_notas: number;
  faltas: Falta[];
  total_faltas: number;
}

// =====================
// PROVÍNCIAS
// =====================

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