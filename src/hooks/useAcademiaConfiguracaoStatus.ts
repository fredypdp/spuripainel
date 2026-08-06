"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { academiaService, consultasService } from "@/lib/api/services";
import { tokenStorage } from "@/lib/api";
import { useUserType } from "@/hooks/useRoutePermission";
import type { CategoriaNotaItem, Curso, EstudanteDetalhado, Materia, RegraAvaliacaoFinal, Turma } from "@/types/api";

export type ConfiguracaoGuiaStepId = "email-verificacao" | "ano-letivo" | "cursos" | "materias" | "categorias-superiores" | "regras-superiores" | "turmas" | "estudantes" | "estudantes-turmas";

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
  academia?: { anos_academicos?: string[] };
  cursos?: Curso[];
  materias?: Materia[];
  turmas?: Turma[];
  categorias?: CategoriaNotaItem[];
  regras?: RegraAvaliacaoFinal[];
  estudantes?: EstudanteDetalhado[];
}

const hasAnoLetivo = (value: any) => Boolean(value?.ano_letivo || value?.academia?.ano_letivo || value?.data?.ano_letivo);
const asArray = <T,>(value: T[] | null | undefined): T[] => Array.isArray(value) ? value : [];
const active = <T extends { status?: string }>(items: T[] | null | undefined) => asArray(items).filter((item) => item.status === "ativo" || !item.status);
const includes = (values: string[] | null | undefined, value: string) => asArray(values).includes(value);

function hasStudentsInInstitutionLevels(estudantes: EstudanteDetalhado[], nivel?: string, nivelEscolar?: string) {
  if (nivel === "superior") return estudantes.some((estudante) => Boolean(estudante.ano_superior || estudante.curso_superior_id));
  const required = [
    nivelEscolar === "fundamental" || nivelEscolar === "misto"
      ? estudantes.some((estudante) => Boolean(estudante.ano_escolar_fundamental))
      : true,
    nivelEscolar === "medio" || nivelEscolar === "misto"
      ? estudantes.some((estudante) => Boolean(estudante.ano_escolar_medio || estudante.curso_medio_id))
      : true,
  ];
  return required.every(Boolean);
}

function buildSteps(raw: RawStatus, nivel?: string, nivelEscolar?: string, emailVerificado = false, email?: string): ConfiguracaoGuiaStep[] {
  const fundamentalYears = asArray(raw.academia?.anos_academicos);
  const cursos = active(raw.cursos);
  const materias = active(raw.materias);
  const turmas = active(raw.turmas);
  const estudantes = asArray(raw.estudantes);
  const isFundamental = nivel === "escola" && ["fundamental", "misto"].includes(nivelEscolar ?? "");
  const needsCourses = nivel === "superior" || (nivel === "escola" && ["medio", "misto"].includes(nivelEscolar ?? ""));

  const base = (id: ConfiguracaoGuiaStepId, title: string, description: string, href: string, completed: boolean, details: string): ConfiguracaoGuiaStep => ({ id, title, description, href, completed, details, unlocked: false, current: false });
  const hasFundamentalCoverage = (predicate: (year: string) => boolean) => !isFundamental || (fundamentalYears.length > 0 && fundamentalYears.every(predicate));
  const hasCourseCoverage = (predicate: (course: Curso, year: string) => boolean) => !needsCourses || (cursos.length > 0 && cursos.every((course) => {
    const years = asArray(course.anos_academicos);
    return years.length > 0 && years.every((year) => predicate(course, year));
  }));

  const materiaComplete = hasFundamentalCoverage((year) => materias.some((materia) => materia.type === "fundamental" && includes(materia.anos_academicos, year)))
    && hasCourseCoverage((course, year) => {
      if (course.type === "superior") return (course.periodos ?? []).length > 0 && course.periodos!.every((periodo) => materias.some((materia) => materia.type === "superior" && materia.curso_id === course.id && materia.periodo === periodo && includes(materia.anos_academicos, year)));
      return materias.some((materia) => materia.type === "medio" && materia.curso_id === course.id && includes(materia.anos_academicos, year));
    });
  const turmaComplete = hasFundamentalCoverage((year) => turmas.some((turma) => !turma.curso_id && turma.nivel === year))
    && hasCourseCoverage((course, year) => turmas.some((turma) => turma.curso_id === course.id && turma.nivel === year));
  const studentsInTurmasComplete = hasFundamentalCoverage((year) => turmas.some((turma) => !turma.curso_id && turma.nivel === year && asArray(turma.estudantes).length > 0))
    && hasCourseCoverage((course, year) => turmas.some((turma) => turma.curso_id === course.id && turma.nivel === year && asArray(turma.estudantes).length > 0));

  const steps: ConfiguracaoGuiaStep[] = [
    base(
      "email-verificacao",
      "Verificar e-mail",
      "Envie o e-mail de verificação para confirmar o endereço da instituição antes de continuar.",
      "",
      emailVerificado,
      emailVerificado
        ? "E-mail da instituição verificado."
        : email
          ? `Será enviado um link de verificação para ${email}.`
          : "Cadastre um e-mail para a instituição antes de solicitar a verificação.",
    ),
    base("ano-letivo", "Definir ano letivo", "Ative o primeiro ciclo letivo da instituição.", "/configuracoes/ano-letivo", hasAnoLetivo(raw.anoLetivo), hasAnoLetivo(raw.anoLetivo) ? "Ano letivo ativo encontrado." : "Nenhum ano letivo ativo encontrado."),
  ];
  if (needsCourses) steps.push(base("cursos", "Criar cursos", "Cadastre os cursos da sua instituição", "/gerenciamento/cursos", cursos.length > 0, `${cursos.length} curso(s) ativo(s).`));
  steps.push(base("materias", "Criar matérias disciplinares", "Garanta matérias disciplinares para cada ano acadêmico ofertado.", "/gerenciamento/materias-disciplinares", materiaComplete, "Cobertura exigida para cada ano ofertado e, no superior, para cada período do curso."));
  if (nivel === "superior") {
    const categorias = active(raw.categorias);
    const regras = active(raw.regras);
    steps.push(base("categorias-superiores", "Criar categorias de nota", "Configure categorias para todos os anos acadêmicos superiores em uso.", "/configuracoes/regras-avaliacao-final", hasCourseCoverage((_course, year) => categorias.some((categoria) => includes(categoria.anos_academicos, year))), "Cobertura exigida por ano acadêmico."));
    steps.push(base("regras-superiores", "Criar regras de avaliação final", "Cadastre ao menos uma regra superior ativa.", "/configuracoes/regras-avaliacao-final", regras.some((regra) => (regra as any).nivel === "superior" || (regra as any).type), `${regras.length} regra(s) ativa(s).`));
  }
  steps.push(
    base("turmas", "Criar turmas", "Crie turmas ativas para cada ano acadêmico ofertado.", "/gerenciamento/turmas", turmaComplete, "Cobertura exigida para cada ano ofertado."),
    base("estudantes", "Cadastrar estudantes ou aprovar solicitações de matrícula", "Tenha ao menos um estudante cadastrado em cada nível da instituição", "/estudantes/cadastrar", hasStudentsInInstitutionLevels(estudantes, nivel, nivelEscolar), `${estudantes.length} estudante(s) encontrado(s), sem filtro de status.`),
    base("estudantes-turmas", "Adicionar estudantes às turmas", "Para cada ano acadêmico da sua instituição, vincule pelo menos um estudante a uma turma.", "/gerenciamento/turmas", studentsInTurmasComplete, "Cobertura exigida para cada ano ofertado."),
  );

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
    setLoading(true); setError(null);
    const token = tokenStorage.get() || undefined;
    try {
      const needsCourses = nivel === "superior" || ["medio", "misto"].includes(nivelEscolar ?? "");
      const [anoLetivo, anosAcademicos, cursosResp, materiasResp, turmasResp, estudantesResp, categoriasResp, regrasResp] = await Promise.all([
        academiaService.getAnoLetivo(token).catch((err) => ({ __error: err })),
        nivel === "escola" ? academiaService.listarAnosAcademicos(token) : Promise.resolve(undefined),
        needsCourses ? academiaService.listarCursos(token) : Promise.resolve(undefined),
        academiaService.listarMaterias(token), academiaService.listarTurmas(token), consultasService.listarEstudantes({ token }),
        nivel === "superior" ? academiaService.listarCategoriasNota(token) : Promise.resolve(undefined),
        nivel === "superior" ? academiaService.listarRegrasAvaliacaoFinal(token) : Promise.resolve(undefined),
      ]);
      setRaw({ anoLetivo: (anoLetivo as any).__error ? undefined : anoLetivo, academia: anosAcademicos?.academia, cursos: cursosResp?.cursos ?? anosAcademicos?.cursos, materias: materiasResp.materias, turmas: turmasResp.turmas, estudantes: estudantesResp.estudantes, categorias: categoriasResp?.categorias, regras: regrasResp?.regras });
    } catch (err) { setError(err instanceof Error ? err : new Error("Não foi possível carregar o guia.")); }
    finally { setLoading(false); }
  }, [isAcademia, nivel, nivelEscolar]);

  useEffect(() => { reload(); }, [reload]);
  const steps = useMemo(() => buildSteps(raw, nivel, nivelEscolar, Boolean(user?.academia?.email_verificado), user?.academia?.email), [raw, nivel, nivelEscolar, user?.academia?.email, user?.academia?.email_verificado]);
  const completedCount = steps.filter((step) => step.completed).length;
  return { steps, completedCount, totalCount: steps.length, nextStep: steps.find((step) => step.current) ?? null, loading, error, retry: reload, mutate: reload };
}
