"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { academiaService, consultasService } from "@/lib/api/services";
import { tokenStorage } from "@/lib/api";
import { useUserType } from "@/hooks/useRoutePermission";
import type { Curso, Materia, Turma, CategoriaNotaItem, RegraAvaliacaoFinal, EstudanteDetalhado } from "@/types/api";

export type ConfiguracaoGuiaStepId =
  | "ano-letivo"
  | "anos-fundamentais"
  | "cursos-medios"
  | "cursos-superiores"
  | "materias-fundamentais"
  | "materias-medias"
  | "materias-superiores"
  | "categorias-superiores"
  | "regras-superiores"
  | "estudantes"
  | "turmas-fundamentais"
  | "turmas-medias"
  | "turmas-superiores"
  | "estudantes-turmas";

export interface ConfiguracaoGuiaStep {
  id: ConfiguracaoGuiaStepId;
  title: string;
  description: string;
  href: string;
  completed: boolean;
  unlocked: boolean;
  current: boolean;
  details: string;
}

interface RawStatus {
  anoLetivo?: unknown;
  anosAcademicos?: { academia?: { anos_academicos?: string[] }; cursos?: Curso[] };
  cursos?: Curso[];
  materias?: Materia[];
  turmas?: Turma[];
  categorias?: CategoriaNotaItem[];
  regras?: RegraAvaliacaoFinal[];
  estudantes?: EstudanteDetalhado[];
}

const hasAnoLetivo = (value: any) => Boolean(value?.ano_letivo || value?.academia?.ano_letivo || value?.data?.ano_letivo);
const active = <T extends { status?: string }>(items: T[] = []) => items.filter((item) => item.status === "ativo" || !item.status);
const intersects = (a: string[] = [], b: string[] = []) => a.some((item) => b.includes(item));
const cursoAnos = (curso: Curso) => curso.anos_academicos ?? [];
const cursoPeriodos = (curso: Curso) => curso.periodos ?? [];

function byCourseYearCoverage(cursos: Curso[], predicate: (curso: Curso, ano: string) => boolean) {
  const escopos = cursos.flatMap((curso) => cursoAnos(curso).map((ano) => ({ curso, ano })));
  return escopos.length > 0 && escopos.every(({ curso, ano }) => predicate(curso, ano));
}

function byFundamentalYearCoverage(anos: string[], predicate: (ano: string) => boolean) {
  return anos.length > 0 && anos.every(predicate);
}

function buildSteps(raw: RawStatus, nivel?: string, nivelEscolar?: string): ConfiguracaoGuiaStep[] {
  const fundamentalYears = raw.anosAcademicos?.academia?.anos_academicos ?? [];
  const cursos = active(raw.cursos ?? raw.anosAcademicos?.cursos ?? []);
  const cursosMedios = cursos.filter((curso) => curso.type === "medio");
  const cursosSuperiores = cursos.filter((curso) => curso.type === "superior");
  const materias = active(raw.materias ?? []);
  const turmas = active(raw.turmas ?? []);
  const categorias = active(raw.categorias ?? []);
  const regras = active(raw.regras ?? []);
  const estudantes = active((raw.estudantes ?? []) as Array<EstudanteDetalhado & { status?: string }>);

  const base = (id: ConfiguracaoGuiaStepId, title: string, description: string, href: string, completed: boolean, details: string) => ({
    id, title, description, href, completed, details, unlocked: false, current: false,
  });

  const anoLetivo = base("ano-letivo", "Definir ano letivo", "Ative o primeiro ciclo letivo da academia.", "/configuracoes/ano-letivo", hasAnoLetivo(raw.anoLetivo), hasAnoLetivo(raw.anoLetivo) ? "Ano letivo ativo encontrado." : "Nenhum ano letivo ativo encontrado.");

  let steps: ConfiguracaoGuiaStep[] = [anoLetivo];

  if (nivel === "superior") {
    steps = steps.concat([
      base("cursos-superiores", "Criar cursos superiores", "Cadastre os cursos e seus períodos.", "/gerenciamento/cursos", cursosSuperiores.length > 0, `${cursosSuperiores.length} curso(s) superior(es) ativo(s).`),
      base("materias-superiores", "Criar matérias superiores", "Garanta matérias ativas em cada ano/período de cada curso.", "/gerenciamento/materias-disciplinares", byCourseYearCoverage(cursosSuperiores, (curso, ano) => {
        const periodos = cursoPeriodos(curso);
        return periodos.length > 0 && periodos.every((periodo) => materias.some((m) => m.type === "superior" && m.curso_id === curso.id && m.periodo === periodo && intersects(m.anos_academicos, [ano])));
      }), "Cobertura exigida por curso, ano superior e semestre."),
      base("categorias-superiores", "Criar categorias de nota", "Configure categorias para todos os anos superiores em uso.", "/configuracoes/regras-avaliacao-final", byCourseYearCoverage(cursosSuperiores, (_curso, ano) => categorias.some((c) => intersects(c.anos_academicos, [ano]))), "Cobertura exigida por ano superior."),
      base("regras-superiores", "Criar regras de avaliação final", "Cadastre ao menos uma regra superior ativa.", "/configuracoes/regras-avaliacao-final", regras.some((r) => (r as any).nivel === "superior" || (r as any).type), `${regras.length} regra(s) ativa(s).`),
      base("estudantes", "Cadastrar ou aprovar estudantes", "Tenha ao menos um estudante ativo na academia.", "/estudantes/cadastrar", estudantes.length > 0, `${estudantes.length} estudante(s) encontrado(s).`),
      base("turmas-superiores", "Criar turmas superiores", "Crie turmas ativas para cada ano de curso superior.", "/gerenciamento/turmas", byCourseYearCoverage(cursosSuperiores, (curso, ano) => turmas.some((t) => t.curso_id === curso.id && t.nivel === ano)), "Cobertura exigida por curso e ano superior."),
      base("estudantes-turmas", "Adicionar estudantes às turmas", "Vincule pelo menos um estudante a uma turma.", "/gerenciamento/turmas", turmas.some((t) => (t.estudantes ?? []).length > 0), "Ao menos uma turma deve ter estudante vinculado."),
    ]);
  } else {
    const isFundamental = nivelEscolar === "fundamental" || nivelEscolar === "misto";
    const isMedio = nivelEscolar === "medio" || nivelEscolar === "misto";
    if (isFundamental) steps.push(base("anos-fundamentais", "Cadastrar anos fundamentais", "Informe os anos fundamentais ofertados.", "/configuracoes/anos-academicos", fundamentalYears.length > 0, `${fundamentalYears.length} ano(s) fundamental(is) ofertado(s).`));
    if (isMedio) steps.push(base("cursos-medios", "Criar cursos médios", "Cadastre os cursos médios e seus modelos.", "/gerenciamento/cursos", cursosMedios.length > 0, `${cursosMedios.length} curso(s) médio(s) ativo(s).`));
    if (isFundamental) steps.push(base("materias-fundamentais", "Criar matérias fundamentais", "Garanta matérias para cada ano fundamental ofertado.", "/gerenciamento/materias-disciplinares", byFundamentalYearCoverage(fundamentalYears, (ano) => materias.some((m) => m.type === "fundamental" && intersects(m.anos_academicos, [ano]))), "Cobertura exigida por ano fundamental."));
    if (isMedio) steps.push(base("materias-medias", "Criar matérias médias", "Garanta matérias para cada ano de cada curso médio.", "/gerenciamento/materias-disciplinares", byCourseYearCoverage(cursosMedios, (curso, ano) => materias.some((m) => m.type === "medio" && m.curso_id === curso.id && intersects(m.anos_academicos, [ano]))), "Cobertura exigida por curso e ano médio."));
    steps.push(base("estudantes", "Cadastrar ou aprovar estudantes", "Tenha ao menos um estudante ativo na academia.", "/estudantes/cadastrar", estudantes.length > 0, `${estudantes.length} estudante(s) encontrado(s).`));
    if (isFundamental) steps.push(base("turmas-fundamentais", "Criar turmas fundamentais", "Crie turmas ativas para cada ano fundamental.", "/gerenciamento/turmas", byFundamentalYearCoverage(fundamentalYears, (ano) => turmas.some((t) => !t.curso_id && t.nivel === ano)), "Cobertura exigida por ano fundamental."));
    if (isMedio) steps.push(base("turmas-medias", "Criar turmas médias", "Crie turmas ativas para cada ano de cada curso médio.", "/gerenciamento/turmas", byCourseYearCoverage(cursosMedios, (curso, ano) => turmas.some((t) => t.curso_id === curso.id && t.nivel === ano)), "Cobertura exigida por curso e ano médio."));
    steps.push(base("estudantes-turmas", "Adicionar estudantes às turmas", "Vincule pelo menos um estudante a uma turma.", "/gerenciamento/turmas", turmas.some((t) => (t.estudantes ?? []).length > 0), "Ao menos uma turma deve ter estudante vinculado."));
  }

  let previousCompleted = true;
  let currentAssigned = false;
  return steps.map((step) => {
    const unlocked = previousCompleted;
    const current = unlocked && !step.completed && !currentAssigned;
    if (current) currentAssigned = true;
    previousCompleted = previousCompleted && step.completed;
    return { ...step, unlocked, current };
  });
}

export function useAcademiaConfiguracaoStatus() {
  const { user, isAcademia } = useUserType();
  const [raw, setRaw] = useState<RawStatus>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const nivel = user?.academia?.nivel;
  const nivelEscolar = user?.academia?.nivel_escolar;

  const reload = useCallback(async () => {
    if (!isAcademia || !nivel) return;
    setLoading(true);
    setError(null);
    const token = tokenStorage.get() || undefined;
    try {
      const needsFundamentalYears = nivel === "escola" && ["fundamental", "misto"].includes(nivelEscolar ?? "");
      const needsCursos = nivel === "superior" || ["medio", "misto"].includes(nivelEscolar ?? "");
      const needsSuperior = nivel === "superior";
      const [anoLetivo, anosAcademicos, cursosResp, materiasResp, turmasResp, estudantesResp, categoriasResp, regrasResp] = await Promise.all([
        academiaService.getAnoLetivo(token).catch((err) => ({ __error: err })),
        (needsFundamentalYears || needsCursos) ? academiaService.listarAnosAcademicos(token) : Promise.resolve(undefined),
        needsCursos ? academiaService.listarCursos(token) : Promise.resolve(undefined),
        academiaService.listarMaterias(token),
        academiaService.listarTurmas(token),
        consultasService.listarEstudantes({ token }),
        needsSuperior ? academiaService.listarCategoriasNota(token) : Promise.resolve(undefined),
        needsSuperior ? academiaService.listarRegrasAvaliacaoFinal(token) : Promise.resolve(undefined),
      ]);
      setRaw({
        anoLetivo: (anoLetivo as any).__error ? undefined : anoLetivo,
        anosAcademicos,
        cursos: cursosResp?.cursos ?? anosAcademicos?.cursos,
        materias: materiasResp.materias,
        turmas: turmasResp.turmas,
        estudantes: estudantesResp.estudantes,
        categorias: categoriasResp?.categorias,
        regras: regrasResp?.regras,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Não foi possível carregar o guia."));
    } finally {
      setLoading(false);
    }
  }, [isAcademia, nivel, nivelEscolar]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [reload]);

  const steps = useMemo(() => buildSteps(raw, nivel, nivelEscolar), [raw, nivel, nivelEscolar]);
  const completedCount = steps.filter((step) => step.completed).length;
  const nextStep = steps.find((step) => step.current) ?? null;

  return { steps, completedCount, totalCount: steps.length, nextStep, loading, error, retry: reload, mutate: reload };
}
