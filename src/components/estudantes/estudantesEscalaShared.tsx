"use client"
import { useState, useMemo } from "react";
import { consultasService } from '@/lib/api';
import { EstudanteDetalhado, Turma, Curso } from '@/types/api';
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

// ─────────────────────────────────────────────────────────────────────────────
// Módulo compartilhado entre a página /estudantes (visão Academia + Vista Tabela,
// em src/app/(painel)/estudantes/PageContent.tsx) e a Vista em Escala do Admin
// (src/components/estudantes/EstudantesVistaEscalaAdmin.tsx).
//
// Tudo aqui é puramente de apresentação/formatação client-side, exceto
// `paramsEstudantesPorTurma`, que apenas MONTA parâmetros de consulta — não
// executa nenhuma chamada de rede. Quem decide QUANDO e QUANTAS vezes chamar a
// API é sempre o componente consumidor (PageContent.tsx ou
// EstudantesVistaEscalaAdmin.tsx), para manter o controle de quantas
// requisições são de fato disparadas ao backend.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Listas de anos/níveis ──────────────────────────────────────────────────

export const ANOS_FUNDAMENTAL_LIST = [
  { label: '1ª Classe', value: '1_ano_fundamental' },
  { label: '2ª Classe', value: '2_ano_fundamental' },
  { label: '3ª Classe', value: '3_ano_fundamental' },
  { label: '4ª Classe', value: '4_ano_fundamental' },
  { label: '5ª Classe', value: '5_ano_fundamental' },
  { label: '6ª Classe', value: '6_ano_fundamental' },
  { label: '7ª Classe', value: '7_ano_fundamental' },
  { label: '8ª Classe', value: '8_ano_fundamental' },
  { label: '9ª Classe', value: '9_ano_fundamental' },
];

export const ANOS_MEDIO_LIST = [
  { label: '1º Ano Médio', value: '1_ano_medio' },
  { label: '2º Ano Médio', value: '2_ano_medio' },
  { label: '3º Ano Médio', value: '3_ano_medio' },
  { label: '4º Ano Médio', value: '4_ano_medio' },
];

export const ANOS_SUPERIOR_LIST = [
  { label: '1º Ano Superior', value: '1_ano_superior' },
  { label: '2º Ano Superior', value: '2_ano_superior' },
  { label: '3º Ano Superior', value: '3_ano_superior' },
  { label: '4º Ano Superior', value: '4_ano_superior' },
  { label: '5º Ano Superior', value: '5_ano_superior' },
  { label: '6º Ano Superior', value: '6_ano_superior' },
];

// ─── Ordenação ────────────────────────────────────────────────────────────────

export type OrdemEstudantes = 'nome_asc' | 'nome_desc' | 'idade_asc' | 'idade_desc' | 'cadastro_desc' | 'cadastro_asc';

export const ORDEM_PADRAO: OrdemEstudantes = 'nome_asc';

export function ordenarEstudantes(lista: EstudanteDetalhado[], ordem: OrdemEstudantes): EstudanteDetalhado[] {
  return [...lista].sort((a, b) => {
    switch (ordem) {
      case 'nome_asc':      return a.nome.localeCompare(b.nome, 'pt');
      case 'nome_desc':     return b.nome.localeCompare(a.nome, 'pt');
      case 'idade_asc':     { const ia = calcularIdade(a.data_nascimento) ?? 0; const ib = calcularIdade(b.data_nascimento) ?? 0; return ia - ib; }
      case 'idade_desc':    { const ia = calcularIdade(a.data_nascimento) ?? 0; const ib = calcularIdade(b.data_nascimento) ?? 0; return ib - ia; }
      case 'cadastro_desc': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'cadastro_asc':  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      default: return 0;
    }
  });
}

// ─── Filtros (estrutura + aplicação client-side sobre uma lista já carregada) ──

export interface FiltrosState {
  genero: string; idadeMin: string; idadeMax: string;
  anoFundamental: string; anoMedio: string; anoSuperior: string;
  status: string; statusFundamental: string; statusMedio: string; statusSuperior: string;
  turno: string; codigoTurma: string; comTurma: string;
  semestreAtual: string; cursoId: string; codigoAcademia: string;
  statusDocumentos: string;
}

export const FILTROS_INICIAIS: FiltrosState = {
  genero: '', idadeMin: '', idadeMax: '',
  anoFundamental: '', anoMedio: '', anoSuperior: '',
  status: '', statusFundamental: '', statusMedio: '', statusSuperior: '',
  turno: '', codigoTurma: '', comTurma: '',
  semestreAtual: '', cursoId: '', codigoAcademia: '',
  statusDocumentos: '',
};

function filtroAceitaValor(filtro: string, valor?: string): boolean {
  if (!filtro) return true;
  const valores = filtro.split(',').map(item => item.trim()).filter(Boolean);
  return valores.length === 0 || (valor ? valores.includes(valor) : false);
}

export function aplicarFiltros(lista: EstudanteDetalhado[], filtros: FiltrosState): EstudanteDetalhado[] {
  const idadeMin = filtros.idadeMin ? Number(filtros.idadeMin) : null;
  const idadeMax = filtros.idadeMax ? Number(filtros.idadeMax) : null;

  return lista.filter(estudante => {
    const idade = calcularIdade(estudante.data_nascimento);

    if (!filtroAceitaValor(filtros.genero, estudante.genero)) return false;
    if (!filtroAceitaValor(filtros.status, estudante.status)) return false;
    if (filtros.statusDocumentos === 'pendente_documentos' && estudante.status !== 'pendente_documentos') return false;
    if (!filtroAceitaValor(filtros.anoFundamental, estudante.ano_escolar_fundamental)) return false;
    if (!filtroAceitaValor(filtros.anoMedio, estudante.ano_escolar_medio)) return false;
    if (!filtroAceitaValor(filtros.anoSuperior, estudante.ano_superior)) return false;
    if (!filtroAceitaValor(filtros.statusFundamental, estudante.status_escolar_fundamental)) return false;
    if (!filtroAceitaValor(filtros.statusMedio, estudante.status_escolar_medio)) return false;
    if (!filtroAceitaValor(filtros.statusSuperior, estudante.status_superior)) return false;
    if (!filtroAceitaValor(filtros.codigoAcademia, estudante.codigo_academia)) return false;
    if (!filtroAceitaValor(filtros.cursoId, estudante.curso_medio_id) && !filtroAceitaValor(filtros.cursoId, estudante.curso_superior_id)) return false;
    if (filtros.semestreAtual) {
      const valoresSemestre = filtros.semestreAtual.split(',').map(item => Number(item.trim())).filter(Number.isFinite);
      if (valoresSemestre.length > 0 && !valoresSemestre.includes(Number(estudante.semestre_atual))) return false;
    }
    if (idadeMin !== null && (idade === null || idade < idadeMin)) return false;
    if (idadeMax !== null && (idade === null || idade > idadeMax)) return false;

    return true;
  });
}

// ─── Formatação / apresentação ──────────────────────────────────────────────

export function calcularIdade(dataNascimento: string): number | null {
  if (!dataNascimento) return null;
  try {
    const nasc = new Date(dataNascimento); const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  } catch { return null; }
}

export function formatarDataNasc(data: string): string {
  if (!data) return '-';
  try { const [year, month, day] = data.split('T')[0].split('-'); return `${day}/${month}/${year}`; }
  catch { return data; }
}

export function getStatusBadgeClass(status: string) {
  switch (status?.toLowerCase()) {
    case 'ativo':      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'inativo':    return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    case 'finalizado': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    case 'pendente_documentos': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    default:           return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
}

export function formatarStatusEstudante(status: string): string {
  switch (status?.toLowerCase()) {
    case 'pendente_documentos': return 'Pendência de documentos';
    case 'ativo': return 'Ativo';
    case 'inativo': return 'Inativo';
    case 'arquivado': return 'Arquivado';
    case 'finalizado': return 'Finalizado';
    default: return status ? status.replace(/_/g, ' ') : '-';
  }
}

export function labelNivel(v: string): string {
  const fixo = ANOS_FUNDAMENTAL_LIST.find(a => a.value === v);
  if (fixo) return fixo.label;
  const m = v.match(/^(\d+)_ano_(medio|superior)$/);
  if (m) return `${m[1]}º ${m[2] === 'medio' ? 'Médio' : 'Superior'}`;
  return v.replace(/_/g, ' ');
}

export function estudantePertenceAoAno(estudante: EstudanteDetalhado, ano: string): boolean {
  if (ano.includes('fundamental')) return estudante.ano_escolar_fundamental === ano;
  if (ano.includes('medio')) return estudante.ano_escolar_medio === ano;
  if (ano.includes('superior')) return estudante.ano_superior === ano;
  return false;
}

export function estudantePertenceAoCurso(estudante: EstudanteDetalhado, ano: string, cursoId?: string): boolean {
  if (!cursoId) return true;
  if (ano.includes('medio')) return estudante.curso_medio_id === cursoId;
  if (ano.includes('superior')) return estudante.curso_superior_id === cursoId;
  return true;
}

// ─── Montagem de parâmetros de consulta por turma/contexto ────────────────────
//
// Usado para construir a Vista em Escala: uma consulta por combinação única de
// (nível × curso) com `com_turma` true/false, mais uma consulta por turma ativa
// (via `codigo_turma`) para popular as turmas individualmente.
//
// `codigoAcademia` é OPCIONAL e só deve ser informado quando quem está chamando
// é um admin (a academia autenticada já é resolvida implicitamente pelo token
// no backend). Ver EstudantesVistaEscalaAdmin.tsx.

export type EstudantesParams = NonNullable<Parameters<typeof consultasService.listarEstudantes>[0]>;

export function paramsEstudantesPorTurma(
  turma: Turma,
  token?: string,
  comTurma?: boolean,
  porCodigoTurma = false,
  codigoAcademia?: string,
): EstudantesParams {
  const params: EstudantesParams = { token, com_turma: comTurma };
  if (codigoAcademia) params.codigo_academia = codigoAcademia;
  if (porCodigoTurma) params.codigo_turma = turma.codigo_turma;
  if (turma.nivel.includes('fundamental')) params.ano_escolar_fundamental = turma.nivel;
  if (turma.nivel.includes('medio')) params.ano_escolar_medio = turma.nivel;
  if (turma.nivel.includes('superior')) params.ano_superior = turma.nivel;
  if (turma.curso_id) params.curso_id = turma.curso_id;
  return params;
}

export function chaveConsultaTurma(turma: Turma): string {
  return [turma.nivel, turma.curso_id ?? '__sem_curso__'].join(':');
}

export function turmasAtivasUnicasPorContexto(turmas: Turma[]): Turma[] {
  return Array.from(new Map(
    turmas
      .filter(turma => turma.status !== 'inativo' && turma.status !== 'deletado')
      .map(turma => [chaveConsultaTurma(turma), turma]),
  ).values());
}

export function codigosEstudantesTurma(turma: Turma): string[] {
  return (turma.estudantes ?? [])
    .map(item => typeof item === 'string' ? item : (item as { codigo_estudante?: string })?.codigo_estudante)
    .filter((codigo): codigo is string => Boolean(codigo));
}

// ─── TabelaEstudantes ─────────────────────────────────────────────────────────
// Reutilizada tanto pela Vista Tabela "achatada" (com paginação, em
// PageContent.tsx) quanto pelas folhas da árvore da Vista em Escala
// (TurmaColapsavel / EstudantesSemTurmaColapsavel, abaixo).

export function TabelaEstudantes({ estudantes, isAdmin, onVerDetalhes, onAdicionarDocumentacao, academias }: {
  estudantes: EstudanteDetalhado[]; isAdmin: boolean; onVerDetalhes: (e: EstudanteDetalhado) => void;
  onAdicionarDocumentacao?: (e: EstudanteDetalhado) => void; academias?: Record<string, string>;
}) {
  if (estudantes.length === 0) return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <Icon icon="mdi:account-group-outline" width={48} className="mb-3 opacity-40" />
      <p className="text-sm">Nenhum estudante encontrado.</p>
    </div>
  );


  return (
    <div className="overflow-x-auto">
      <Table className="w-full">
        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
          <TableRow>
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nome</TableCell>
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Código</TableCell>
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Género</TableCell>
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nascimento</TableCell>
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Email</TableCell>
            {isAdmin && <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Academia</TableCell>}
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
            <TableCell isHeader className="whitespace-nowrap px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Ações</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
          {estudantes.map(est => (
            <TableRow key={est.codigo_estudante} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
              <TableCell className="max-w-[180px] capitalize truncate px-4 py-3 text-gray-900 dark:text-white text-start text-theme-sm font-medium">{est.nome || '-'}</TableCell>
              <TableCell className="whitespace-nowrap px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 font-mono text-xs">{est.codigo_estudante || '-'}</TableCell>
              <TableCell className="whitespace-nowrap px-4 py-3 text-start text-theme-sm">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${est.genero === 'masculino' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400'}`}>
                  <Icon icon={est.genero === 'masculino' ? 'mdi:gender-male' : 'mdi:gender-female'} width={12} />
                  {est.genero === 'masculino' ? 'Masc.' : 'Fem.'}
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                <span className="block">{formatarDataNasc(est.data_nascimento)}</span>
                {est.data_nascimento && <span className="text-xs text-gray-400">{calcularIdade(est.data_nascimento)} anos</span>}
              </TableCell>
              <TableCell className="whitespace-nowrap px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{est.email || '-'}</TableCell>
              {isAdmin && <TableCell className="whitespace-nowrap px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{academias?.[est.codigo_academia ?? ''] ?? est.codigo_academia ?? '-'}</TableCell>}
              <TableCell className="whitespace-nowrap px-4 py-3 text-start text-theme-sm">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(est.status)}`}>{formatarStatusEstudante(est.status)}</span>
              </TableCell>
              <TableCell className="whitespace-nowrap px-4 py-3 text-start text-theme-sm">
                {String(est.status) === 'pendente_documentos' && onAdicionarDocumentacao ? (
                  <Button size="sm" variant="primary" onClick={() => onAdicionarDocumentacao(est)}>Adicionar documentação</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => onVerDetalhes(est)}>Ver mais</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── TurmaColapsavel ──────────────────────────────────────────────────────────

function TurmaColapsavel({ turma, estudantesMapa, filtros, ordem, onVerDetalhes }: {
  turma: Turma; estudantesMapa: Map<string, EstudanteDetalhado>;
  filtros: FiltrosState; ordem: OrdemEstudantes; onVerDetalhes: (e: EstudanteDetalhado) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const estudantesDaTurma = useMemo(() => {
    const lista = codigosEstudantesTurma(turma).map(cod => estudantesMapa.get(cod)).filter(Boolean) as EstudanteDetalhado[];
    return ordenarEstudantes(aplicarFiltros(lista, filtros), ordem);
  }, [turma, estudantesMapa, filtros, ordem]);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => setAberto(p => !p)}>
        <div className="flex items-center gap-3">
          <Icon icon="mdi:door-closed" className="text-brand-500 w-5 h-5" />
          <span className="font-semibold text-sm text-gray-900 dark:text-white">{turma.codigo_turma}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">· {turma.turno === 'manha' ? 'Manhã' : turma.turno === 'tarde' ? 'Tarde' : 'Noite'}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${turma.status === 'ativo' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>{turma.status}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 flex items-center gap-1"><Icon icon="mdi:account-group" className="w-4 h-4" />{estudantesDaTurma.length}/{codigosEstudantesTurma(turma).length}</span>
          <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} className="w-5 h-5 text-gray-400" />
        </div>
      </div>
      {aberto && <div className="border-t border-gray-100 dark:border-gray-700/50 p-3"><TabelaEstudantes estudantes={estudantesDaTurma} isAdmin={false} onVerDetalhes={onVerDetalhes} /></div>}
    </div>
  );
}

// ─── EstudantesSemTurmaColapsavel ─────────────────────────────────────────────

function EstudantesSemTurmaColapsavel({ estudantes, onVerDetalhes }: {
  estudantes: EstudanteDetalhado[];
  onVerDetalhes: (e: EstudanteDetalhado) => void;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="border border-amber-200 dark:border-amber-800/60 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer bg-amber-50/70 dark:bg-amber-900/10 hover:bg-amber-100/80 dark:hover:bg-amber-900/20 transition-colors"
        onClick={() => setAberto(p => !p)}>
        <div className="flex items-center gap-3">
          <Icon icon="mdi:account-alert-outline" className="text-amber-500 w-5 h-5" />
          <span className="font-semibold text-sm text-gray-900 dark:text-white">Estudantes sem turma</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Sem vínculo</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 flex items-center gap-1"><Icon icon="mdi:account-group" className="w-4 h-4" />{estudantes.length}</span>
          <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} className="w-5 h-5 text-gray-400" />
        </div>
      </div>
      {aberto && <div className="border-t border-amber-100 dark:border-amber-800/40 p-3"><TabelaEstudantes estudantes={estudantes} isAdmin={false} onVerDetalhes={onVerDetalhes} /></div>}
    </div>
  );
}

// ─── AnoColapsavel ────────────────────────────────────────────────────────────

function AnoColapsavel({ ano, label, turmas, estudantesMapa, filtros, ordem, onVerDetalhes, cursoId }: {
  ano: string; label: string; turmas: Turma[]; estudantesMapa: Map<string, EstudanteDetalhado>;
  filtros: FiltrosState; ordem: OrdemEstudantes; onVerDetalhes: (e: EstudanteDetalhado) => void; cursoId?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const turmasDoAno = turmas.filter(t => t.nivel === ano);
  const codigosComTurma = useMemo(() => new Set(turmas.flatMap(codigosEstudantesTurma)), [turmas]);
  const estudantesSemTurma = useMemo(() => {
    const lista = Array.from(estudantesMapa.values()).filter(estudante =>
      estudantePertenceAoAno(estudante, ano) &&
      estudantePertenceAoCurso(estudante, ano, cursoId) &&
      !codigosComTurma.has(estudante.codigo_estudante)
    );
    return ordenarEstudantes(aplicarFiltros(lista, filtros), ordem);
  }, [ano, codigosComTurma, cursoId, estudantesMapa, filtros, ordem]);
  const totalEstTurmas = turmasDoAno.reduce((s, t) => s + codigosEstudantesTurma(t).length, 0);
  const totalEst = totalEstTurmas + estudantesSemTurma.length;
  const temTurmasOuSemTurma = turmasDoAno.length > 0 || estudantesSemTurma.length > 0;
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button onClick={() => setAberto(p => !p)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors">
        <div className="flex items-center gap-3">
          <Icon icon="mdi:school-outline" width={18} className="text-brand-500" />
          <span className="font-semibold text-gray-800 dark:text-white">{label}</span>
          <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">{turmasDoAno.length} turma{turmasDoAno.length !== 1 ? 's' : ''}</span>
          {estudantesSemTurma.length > 0 && <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{estudantesSemTurma.length} sem turma</span>}
          <span className="text-xs text-gray-400">{totalEst} estudantes</span>
        </div>
        <Icon icon={aberto ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={18} className="text-gray-400" />
      </button>
      {aberto && (
        <div className="p-3 space-y-2 border-t border-gray-100 dark:border-gray-700/50">
          {!temTurmasOuSemTurma && <p className="text-sm text-gray-400 text-center py-4">Nenhuma turma ou estudante sem turma para este ano.</p>}
          {turmasDoAno.map(t => <TurmaColapsavel key={t.id} turma={t} estudantesMapa={estudantesMapa} filtros={filtros} ordem={ordem} onVerDetalhes={onVerDetalhes} />)}
          {estudantesSemTurma.length > 0 && <EstudantesSemTurmaColapsavel estudantes={estudantesSemTurma} onVerDetalhes={onVerDetalhes} />}
        </div>
      )}
    </div>
  );
}

// ─── SecaoFundamental ─────────────────────────────────────────────────────────

function SecaoFundamental({ turmas, estudantesMapa, filtros, ordem, onVerDetalhes, anosDisponiveis }: {
  turmas: Turma[];
  estudantesMapa: Map<string, EstudanteDetalhado>;
  filtros: FiltrosState;
  ordem: OrdemEstudantes;
  onVerDetalhes: (e: EstudanteDetalhado) => void;
  anosDisponiveis?: string[];
}) {
  const anosComTurmas = ANOS_FUNDAMENTAL_LIST.filter(a =>
    (anosDisponiveis ? anosDisponiveis.includes(a.value) : true) &&
    (
      turmas.some(t => t.nivel === a.value) ||
      Array.from(estudantesMapa.values()).some(estudante =>
        estudantePertenceAoAno(estudante, a.value) &&
        !turmas.some(t => codigosEstudantesTurma(t).includes(estudante.codigo_estudante))
      )
    )
  );
  if (anosComTurmas.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Nenhuma turma ou estudante sem turma cadastrado.</p>;
  return (
    <div className="space-y-2">
      {anosComTurmas.map(ano => (
        <AnoColapsavel
          key={ano.value}
          ano={ano.value}
          label={ano.label}
          turmas={turmas}
          estudantesMapa={estudantesMapa}
          filtros={filtros}
          ordem={ordem}
          onVerDetalhes={onVerDetalhes}
        />
      ))}
    </div>
  );
}

// ─── SecaoCursos ──────────────────────────────────────────────────────────────

function SecaoCursos({ tipo, cursosAtivos, turmas, estudantesMapa, filtros, ordem, onVerDetalhes }: {
  tipo?: 'medio' | 'superior';
  cursosAtivos: Curso[];
  turmas: Turma[];
  estudantesMapa: Map<string, EstudanteDetalhado>;
  filtros: FiltrosState;
  ordem: OrdemEstudantes;
  onVerDetalhes: (e: EstudanteDetalhado) => void;
}) {
  const lista = tipo ? cursosAtivos.filter(c => c.type === tipo) : cursosAtivos;
  if (lista.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Nenhum curso ativo cadastrado.</p>;
  return (
    <div className="space-y-2">
      {lista.map(curso => (
        <div key={curso.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800 flex items-center gap-3">
            <Icon icon={curso.type === 'superior' ? 'mdi:university' : 'mdi:book-education'} width={18} className="text-brand-500" />
            <span className="font-semibold text-gray-800 dark:text-white">{curso.nome}</span>
            <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">{curso.anos_academicos.length} anos</span>
          </div>
          <div className="p-3 space-y-2">
            {curso.anos_academicos.map(ano => (
              <AnoColapsavel
                key={ano}
                ano={ano}
                label={labelNivel(ano)}
                turmas={turmas.filter(t => t.curso_id === curso.id)}
                estudantesMapa={estudantesMapa}
                filtros={filtros}
                ordem={ordem}
                onVerDetalhes={onVerDetalhes}
                cursoId={curso.id}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── VistaEscala ──────────────────────────────────────────────────────────────
// Componente "burro": só sabe montar a árvore a partir de listas já carregadas
// (estudantes/turmas/cursos) em memória. Não dispara nenhuma chamada de rede —
// isso é responsabilidade de quem o utiliza (PageContent.tsx para a Academia,
// EstudantesVistaEscalaAdmin.tsx para o Admin).

export function VistaEscala({ estudantes, turmas, cursos, nivelAcademia, filtros, ordem, onVerDetalhes, anosAcademicos }: {
  estudantes: EstudanteDetalhado[]; turmas: Turma[]; cursos: Curso[]; nivelAcademia: string;
  filtros: FiltrosState; ordem: OrdemEstudantes; onVerDetalhes: (e: EstudanteDetalhado) => void;
  anosAcademicos?: string[];
}) {
  const [secaoAberta, setSecaoAberta] = useState<'fundamental' | 'cursos' | null>(null);

  const estudantesMapa = useMemo(() => {
    const m = new Map<string, EstudanteDetalhado>();
    estudantes.forEach(e => m.set(e.codigo_estudante, e));
    return m;
  }, [estudantes]);

  const cursosAtivos = useMemo(() => cursos.filter(c => c.status === 'ativo'), [cursos]);
  const anosDispFundamental = useMemo(
    () => (anosAcademicos || []).filter(a => a.includes('fundamental')),
    [anosAcademicos]
  );

  const commonProps = { turmas, estudantesMapa, filtros, ordem, onVerDetalhes };

  if (nivelAcademia === 'fundamental') {
    return (
      <SecaoFundamental
        {...commonProps}
        anosDisponiveis={anosDispFundamental}
      />
    );
  }

  if (nivelAcademia === 'medio') {
    return <SecaoCursos {...commonProps} tipo="medio" cursosAtivos={cursosAtivos} />;
  }

  if (nivelAcademia === 'superior') {
    return <SecaoCursos {...commonProps} tipo="superior" cursosAtivos={cursosAtivos} />;
  }

  if (nivelAcademia === 'misto') {
    return (
      <div className="space-y-3">
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setSecaoAberta(p => p === 'fundamental' ? null : 'fundamental')}
            className="w-full flex items-center justify-between px-5 py-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon icon="mdi:school" width={20} className="text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-gray-800 dark:text-white">Ensino Primário e Iº Ciclo</span>
            </div>
            <Icon icon={secaoAberta === 'fundamental' ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={20} className="text-gray-400" />
          </button>
          {secaoAberta === 'fundamental' && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700/50">
              <SecaoFundamental {...commonProps} anosDisponiveis={anosDispFundamental} />
            </div>
          )}
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setSecaoAberta(p => p === 'cursos' ? null : 'cursos')}
            className="w-full flex items-center justify-between px-5 py-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon icon="mdi:book-education" width={20} className="text-purple-600 dark:text-purple-400" />
              <span className="font-bold text-gray-800 dark:text-white">Ensino Médio</span>
            </div>
            <Icon icon={secaoAberta === 'cursos' ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={20} className="text-gray-400" />
          </button>
          {secaoAberta === 'cursos' && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700/50">
              <SecaoCursos {...commonProps} tipo="medio" cursosAtivos={cursosAtivos} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
