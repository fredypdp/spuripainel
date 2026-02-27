// src/types/api.ts

export type UserType = 'academia' | 'estudante' | 'admin';
export type AdminType = "gerente" | "adm" | "fpp";

export type AcademiaType = 'escola' | 'superior';
export type NivelEscolar = 'fundamental' | 'medio' | "misto";

export type AnoAcademico = AnoEscolar | AnoSuperior;

export type AnoEscolar = 
  | 'primeiro_fundamental' | 'segundo_fundamental' | 'terceiro_fundamental'
  | 'quarto_fundamental' | 'quinto_fundamental' | 'sexto_fundamental'
  | 'setimo_fundamental' | 'oitavo_fundamental' | 'nono_fundamental'
  | 'primeiro_medio' | 'segundo_medio' | 'terceiro_medio' | "quarto_medio";

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
  nome: string;
  provincia: string;
  endereco: string;
  numero_telefone?: string;
  email?: string;
  website?: string;
  nivel_escolar: NivelEscolar;
  cursos?: string[];
  anos_academicos?: string[];
}

export interface CriarUniversidadeRequest {
  type: 'superior';
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

// 🔥 ATUALIZADO: curso_medio_id e curso_superior_id agora são UUID
export interface CriarEstudanteRequest {
  nome: string;
  email?: string;
  telefone?: string;
  bilhete_identidade?: string;
  bilhete_identidade_responsavel?: string;
  ano_escolar?: string;
  ano_superior?: string;
  curso_medio_id?: string;
  curso_superior_id?: string;
  status_escolar?: StatusEscolar;
  status_superior?: StatusSuperior;
  genero: Genero;
}

// 🔥 ATUALIZADO: curso_medio_id agora é UUID
export interface SolicitarInscricaoEscolaRequest {
  codigo_academia: string;
  ano_escolar_inscricao: string;
  curso_medio_id?: string;
}

// 🔥 ATUALIZADO: curso_id agora é UUID obrigatório
export interface SolicitarInscricaoUniversidadeRequest {
  codigo_academia: string;
  ano_inscricao: string;
  curso_superior_id: string;
}

export interface RegistrarNotasRequest {
  codigo_estudante: string;
  ano_lectivo: string;
  periodo: Periodo;
  materia_disciplinar_id: string;
  nota: number;
  observacao?: string;
}

export interface RegistrarFaltasRequest {
  codigo_estudante: string;
  ano_lectivo: string;
  ano_academico: string;
  data: string;
  materia_disciplinar_id: string;
  quantidade: number;
  observacao?: string;
}

// 🔥 ATUALIZADO: curso_id agora é UUID
export interface AprovarInscricaoRequest {
  codigo_estudante: string;
  tipo: 'escola' | 'superior';
  ano_inscricao: string;
  curso_id?: string; // 🔥 MUDOU: agora é UUID
}

export interface ReprovarInscricaoRequest {
  codigo_estudante: string;
  motivo: string;
}

export interface CriarAdminRequest {
  nome: string;
  email: string;
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

export interface CriarCursoRequest {
  nome: string;
  type: CursoType;
  anos_academicos: string[];
}

export interface AtualizarCursoRequest {
  nome?: string;
  type?: CursoType;
  anos_academicos?: string[];
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

export interface AtualizarDadosPessoaisEstudanteRequest {
  nome?: string;
  email?: string;
  telefone?: string;
  bilhete_identidade?: string;
  bilhete_identidade_responsavel?: string;
}

// 🔥 ATUALIZADO: curso_medio_id e curso_superior_id agora são UUID
export interface AtualizarDadosAcademicosEstudanteRequest {
  ano_escolar?: string;
  ano_superior?: string;
  curso_medio_id?: string;    // 🔥 MUDOU: agora é UUID
  curso_superior_id?: string; // 🔥 MUDOU: agora é UUID
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

export interface RegistrarAprovacaoAnoRequest {
  codigo_estudante: string;
  ano_lectivo: string;
  tipo_ensino: 'fundamental' | 'medio' | 'superior';
  nivel_atual: string;
  proximo_nivel?: string;
  aprovado: boolean;
  observacao?: string;
}

export interface AlterarCursoRequest {
  tipo_ensino: 'medio' | 'superior';
  curso_id: string;
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

// 🔥 ATUALIZADO: curso_id agora é UUID
export interface Inscricao {
  id: string;
  estudante_id: string;
  codigo_estudante: string;
  academia_id: string;
  codigo_academia: string;
  tipo: 'escola' | 'superior';
  ano_inscricao: string;
  curso_id?: string; // 🔥 MUDOU: agora é UUID
  status: StatusInscricao;
  status_usado: boolean;
  created_at: string;
  updated_at: string;
  event_id: string;
  version: number;
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

export interface Falta {
  id: string;
  codigo_estudante: string;
  codigo_academia: string;
  ano_lectivo: string;
  ano_academico?: string;
  data: string;
  materia_disciplinar_id: string;
  materia_nome: string;
  quantidade: number;
  observacao?: string;
  registered_at: string;
  event_id: string;
  version: number;
}

export interface AprovacaoAno {
  id: string;
  codigo_estudante: string;
  codigo_academia: string;
  ano_lectivo: string;
  tipo_ensino: 'fundamental' | 'medio' | 'superior';
  nivel_atual: string;
  proximo_nivel?: string;
  aprovado: boolean;
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

export interface AprovacoesEstudanteResponse {
  codigo_estudante: string;
  nome: string;
  aprovacoes: AprovacaoAno[];
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

export interface Curso {
  id: string;
  nome: string;
  type: CursoType;
  anos_academicos: string[];
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
  status_escolar_fundamental: StatusEscolar;
  status_escolar_medio: StatusEscolar;
  status_superior: StatusSuperior;
  ano_escolar?: string;
  ano_escolar_medio?: string;
  ano_superior?: string;
  curso_medio_id?: string;
  curso_superior_id?: string;
  created_at: string;
  updated_at: string;
  total_notas: number;
  total_faltas: number;
  total_inscricoes: number;
  version: number;
  genero?: Genero;
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
  anos_academicos?: string[];
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
  email_verificado: boolean;
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
  id: string;
  nome: string;
  email: string;
  email_verificado: boolean;
  role: AdminType;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  total_acoes_realizadas: number;
  version: number;
}

export interface BuscarUsuarioResponse {
  tipo: UserType;
  dados: EstudanteDetalhado | AcademiaDetalhada | AdminDetalhado;
}

export interface ConsultarAcademiasResponse {
  academias: AcademiaDetalhada[];
  total: number;
  tipo_usuario: UserType;
}

export interface ConsultarEstudantesResponse {
  estudantes: EstudanteDetalhado[];
  total: number;
  tipo_usuario: UserType;
  codigo_academia?: string;
  nome_academia?: string;
}

export interface ListarAdminsResponse {
  admins: AdminDetalhado[];
  total: number;
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

export interface GetInscricoesPorCodigoResponse {
  codigo_estudante: string;
  nome: string;
  inscricoes: Inscricao[];
  total: number;
}

export interface AlterarCursoResponse {
  message: string;
  codigo_estudante: string;
  tipo_ensino: 'medio' | 'superior';
  curso_id: string;
  curso_nome: string;
}

export interface VincularAcademiaResponse {
  message: string;
  status: string;
}

export interface AtualizarStatusResponse {
  message: string;
  novo_status: string;
}

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

export interface DefinirAnoLetivoRequest {
  ano_letivo: string; // formato: YYYY_YYYY  ex: "2025_2026"
}

export interface AnoLetivoResponse {
  ano_letivo: string; // ex: "2025_2026"
}

export interface DefinirAnoLetivoResponse {
  message: string;
  ano_letivo: string;
}

// --- Helper ---

/**
 * Converte o formato interno "2025_2026" para exibição "2025/2026"
 */
export function formatAnoLetivo(valor: string): string {
  return valor.replace('_', '/');
}

/**
 * Gera as 2 opções de anos letivos relevantes com base no ano atual:
 *  - Opção A: ano anterior → ano atual  (ex: 2024/2025)
 *  - Opção B: ano atual → ano seguinte  (ex: 2025/2026)
 */
export function gerarOpcoesAnoLetivo(): { valor: string; label: string }[] {
  const anoAtual = new Date().getFullYear();

  return [
    { valor: `${anoAtual - 1}_${anoAtual}`, label: `${anoAtual - 1}/${anoAtual}` },
    { valor: `${anoAtual}_${anoAtual + 1}`, label: `${anoAtual}/${anoAtual + 1}` },
  ];
}

export type TipoNota = 'escolar' | 'superior';

export type CategoriaNotaEscolar =
  | 'nota_escola' // nota final
  | 'nota_professor'; // nota dada pelo professor

export type CategoriaNotaSuperiorFixa =
  | 'nota_pp1'    // prova parcelar 1
  | 'nota_pp2'    // prova parcelar 2
  | 'nota_exame'; // exame

// Categoria pode ser uma das fixas ou qualquer string "nota_[nome]" para adicionais
export type CategoriaNota =
  | CategoriaNotaEscolar
  | CategoriaNotaSuperiorFixa
  | string; // categorias adicionais criadas pela universidade (formato: nota_[nome])

export interface Nota {
  id: string;
  codigo_estudante: string;
  codigo_academia: string;
  ano_lectivo: string;
  ano_academico?: string;
  periodo: Periodo;
  materia_disciplinar_id: string;
  materia_nome?: string;
  tipo: TipoNota;
  categoria: CategoriaNota;
  nota: number;
  observacao?: string;
  registered_at: string;
  event_id: string;
  version: number;
}

export interface RegistrarNotasRequest {
  codigo_estudante: string;
  ano_lectivo: string;
  periodo: Periodo;
  materia_disciplinar_id: string;
  tipo: TipoNota;
  categoria: CategoriaNota;
  nota: number;
  observacao?: string;
}

export interface AtualizarNotaRequest {
  id: string;
  nota_nova: number;
  observacao: string;
}

export interface CriarCategoriaNotaRequest {
  nome: string; // formato: nota_[nome]  ex: nota_trabalho
  descricao?: string;
}

export interface CategoriaNotaItem {
  id: string;
  codigo_academia: string;
  nome: string;
  descricao?: string;
  status: 'ativo' | 'inativo';
  created_at: string;
}

export interface ListarCategoriasNotaResponse {
  categorias: CategoriaNotaItem[];
  total: number;
}

export type Genero = 'masculino' | 'feminino';

export interface Turma {
  id: string;
  codigo_turma: string;
  codigo_academia: string;
  nivel: string;
  curso_id?: string;
  turno: 'manha' | 'tarde' | 'noite';
  estudantes: string[]; // array de codigo_estudante
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
  version: number;
}

export interface ListarTurmasResponse {
  turmas: Turma[];
}

export interface CriarTurmaRequest {
  codigo_turma: string;
  nivel: string;
  turno: 'manha' | 'tarde' | 'noite';
  curso_id?: string;
}

export interface AtualizarTurmaRequest {
  nivel?: string;
  turno?: string;
  curso_id?: string;
}

export interface AdicionarEstudanteTurmaRequest {
  codigo_estudante: string;
}