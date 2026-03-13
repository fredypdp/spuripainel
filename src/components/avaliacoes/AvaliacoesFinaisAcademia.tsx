// src/components/avaliacoes/AvaliacoesFinaisAcademia.tsx
"use client"
import { useState, useEffect, useMemo, useCallback } from "react";
import { useApi, academiaService, consultasService, tokenStorage } from "@/lib/api";
import type {
  MeuPerfilResponse, AvaliacaoFinal, Turma, Curso,
  EstudanteDetalhado, AcademiaDetalhada,
} from "@/types/api";
import { getCookie } from "@/lib/utils/cookies";
import Icon from "@/components/ui/Icon";

// ─── helpers ─────────────────────────────────────────────────────────────────

const NIVEL_BASE: Record<string, string> = {
  primeiro_fundamental:"1º Ano",segundo_fundamental:"2º Ano",terceiro_fundamental:"3º Ano",
  quarto_fundamental:"4º Ano",quinto_fundamental:"5º Ano",sexto_fundamental:"6º Ano",
  setimo_fundamental:"7º Ano",oitavo_fundamental:"8º Ano",nono_fundamental:"9º Ano",
  primeiro_medio:"1º Médio",segundo_medio:"2º Médio",terceiro_medio:"3º Médio",quarto_medio:"4º Médio",
  primeiro_ano:"1º Ano",segundo_ano:"2º Ano",terceiro_ano:"3º Ano",
  quarto_ano:"4º Ano",quinto_ano:"5º Ano",sexto_ano:"6º Ano",
};
const ANOS_FUNDAMENTAL = [
  "primeiro_fundamental","segundo_fundamental","terceiro_fundamental","quarto_fundamental",
  "quinto_fundamental","sexto_fundamental","setimo_fundamental","oitavo_fundamental","nono_fundamental",
];
const ANOS_MEDIO = ["primeiro_medio","segundo_medio","terceiro_medio","quarto_medio"];
const ORDEM_NIVEIS = [...ANOS_FUNDAMENTAL, ...ANOS_MEDIO,
  "primeiro_ano","segundo_ano","terceiro_ano","quarto_ano","quinto_ano","sexto_ano"];

function labelNivel(v: string, comSufixo = false): string {
  const base = NIVEL_BASE[v] ?? v.replace(/_/g, " ");
  if (!comSufixo) return base;
  if (ANOS_FUNDAMENTAL.includes(v)) return `${base} (Ensino Fundamental)`;
  if (ANOS_MEDIO.includes(v)) return `${base} (Ensino Médio)`;
  return base;
}

function getUserFromCookie(): MeuPerfilResponse | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(getCookie("user") ?? ""); } catch { return null; }
}

function sortAnos(anos: string[]) {
  return [...anos].sort((a, b) => ORDEM_NIVEIS.indexOf(a) - ORDEM_NIVEIS.indexOf(b));
}

// ─── tipos layer ─────────────────────────────────────────────────────────────

// Escola fundamental: ano_letivo → ano_academico → turma → lista
type LayerFund =
  | { mode: "fund"; type: "anos_letivos" }
  | { mode: "fund"; type: "anos_academicos"; anoLetivo: string }
  | { mode: "fund"; type: "turmas"; anoLetivo: string; anoAcademico: string }
  | { mode: "fund"; type: "resultados"; anoLetivo: string; anoAcademico: string; turma: Turma };

// Médio/Superior: curso → ano_letivo → ano_academico → turma → lista
type LayerCurso =
  | { mode: "sup"; type: "cursos" }
  | { mode: "sup"; type: "anos_letivos"; curso: Curso }
  | { mode: "sup"; type: "anos_academicos"; curso: Curso; anoLetivo: string }
  | { mode: "sup"; type: "turmas"; curso: Curso; anoLetivo: string; anoAcademico: string }
  | { mode: "sup"; type: "resultados"; curso: Curso; anoLetivo: string; anoAcademico: string; turma: Turma };

type LayerMisto = { mode: "misto"; type: "choose" } | LayerFund | LayerCurso;

type Layer = LayerFund | LayerCurso | LayerMisto;

// ─── sub-componentes ─────────────────────────────────────────────────────────

function Breadcrumb({ crumbs }: { crumbs: { label: string; onClick?: () => void }[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap mb-5">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <Icon icon="mdi:chevron-right" width={15} className="text-gray-400" />}
          {i === crumbs.length - 1
            ? <span className="text-gray-900 dark:text-white font-medium">{c.label}</span>
            : <button onClick={c.onClick} className="text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors">{c.label}</button>
          }
        </span>
      ))}
    </nav>
  );
}

function CardBtn({ icon, title, subtitle, badge, onClick }: {
  icon: string; title: string; subtitle?: string; badge?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-400 hover:shadow-sm transition-all text-left group">
      <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
        <Icon icon={icon} width={22} className="text-brand-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {badge && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize">{badge}</span>}
    </button>
  );
}

function BadgeResultado({ aprovado }: { aprovado: boolean }) {
  return aprovado
    ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><Icon icon="mdi:check-circle" width={13}/>Aprovado</span>
    : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><Icon icon="mdi:close-circle" width={13}/>Reprovado</span>;
}

function StatsAvaliacoes({ avaliacoes }: { avaliacoes: AvaliacaoFinal[] }) {
  const aprovacoes = avaliacoes.filter(a => a.aprovado).length;
  const reprovacoes = avaliacoes.length - aprovacoes;
  return (
    <div className="flex flex-wrap gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
      <div><p className="text-xs text-gray-500 uppercase tracking-wide">Total</p><p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{avaliacoes.length}</p></div>
      <div><p className="text-xs text-gray-500 uppercase tracking-wide">Aprovações</p><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{aprovacoes}</p></div>
      <div><p className="text-xs text-gray-500 uppercase tracking-wide">Reprovações</p><p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-0.5">{reprovacoes}</p></div>
      {avaliacoes.length > 0 && (
        <div><p className="text-xs text-gray-500 uppercase tracking-wide">Taxa Aprovação</p><p className="text-2xl font-bold text-brand-600 dark:text-brand-400 mt-0.5">{Math.round((aprovacoes / avaliacoes.length) * 100)}%</p></div>
      )}
    </div>
  );
}

function TabelaResultadosTurma({
  turma, avaliacoes, estudantes, anoLetivo, anoAcademico,
}: {
  turma: Turma;
  avaliacoes: AvaliacaoFinal[];
  estudantes: EstudanteDetalhado[];
  anoLetivo: string;
  anoAcademico: string;
}) {
  const estudantesMap = useMemo(() => {
    const m: Record<string, EstudanteDetalhado> = {};
    estudantes.forEach(e => { m[e.codigo_estudante] = e; });
    return m;
  }, [estudantes]);

  // Para cada estudante da turma, buscar a sua avaliação final no ano letivo/academico
  const rows = turma.estudantes.map(cod => {
    const est = estudantesMap[cod];
    const av = avaliacoes.find(a =>
      a.codigo_estudante === cod &&
      a.ano_lectivo === anoLetivo &&
      a.ano_academico_atual === anoAcademico
    );
    return { cod, est, av };
  });

  if (rows.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Icon icon="mdi:account-group" width={36} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Turma sem estudantes.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            {["Estudante", "Código", "Resultado", "Próximo Nível", "Observação", "Data"].map(h => (
              <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {rows.map(({ cod, est, av }) => (
            <tr key={cod} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{est?.nome ?? cod}</td>
              <td className="px-4 py-3 text-gray-400 text-xs font-mono">{cod}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                {av ? <BadgeResultado aprovado={av.aprovado} /> : <span className="text-xs text-gray-400 italic">Sem registo</span>}
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {av ? (av.proximo_ano_academico ? labelNivel(av.proximo_ano_academico) : (av.aprovado ? "Ciclo finalizado" : "—")) : "—"}
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs max-w-[140px] truncate">{av?.observacao ?? "—"}</td>
              <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                {av ? new Date(av.registered_at).toLocaleDateString("pt-AO") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function AvaliacoesFinaisAcademia() {
  const [user] = useState<MeuPerfilResponse | null>(getUserFromCookie);
  const token = tokenStorage.get() ?? undefined;

  const academiaType = user?.academia?.type ?? "escola";
  const nivelEscolar = user?.academia?.nivel_escolar ?? "fundamental";
  const isFundamental = academiaType === "escola" && nivelEscolar === "fundamental";
  const isSuperior = academiaType === "superior";
  const isMisto = academiaType === "escola" && nivelEscolar === "misto";

  const initLayer = (): Layer => {
    if (isFundamental) return { mode: "fund", type: "anos_letivos" };
    if (isMisto) return { mode: "misto", type: "choose" };
    return { mode: "sup", type: "cursos" };
  };
  const [layer, setLayer] = useState<Layer>(initLayer);

  const { data: dataTurmas, execute: carregarTurmas } = useApi(academiaService.listarTurmas);
  const { data: dataCursos, execute: carregarCursos } = useApi(academiaService.listarCursos);
  const { data: dataEstudantes, execute: carregarEstudantes } = useApi(consultasService.listarEstudantes);
  const { data: dataAvaliacoes, execute: carregarAvaliacoes, loading } = useApi(consultasService.listarAvaliacoes);

  // Cache de avaliações por estudante (para busca individual)
  const [avalCache, setAvalCache] = useState<Record<string, AvaliacaoFinal[]>>({});

  useEffect(() => {
    carregarTurmas(token);
    carregarCursos(token);
    carregarEstudantes(undefined, token);
    carregarAvaliacoes({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const turmas: Turma[] = useMemo(
    () => (dataTurmas as any)?.turmas ?? [],
    [dataTurmas]
  );
  const cursos: Curso[] = useMemo(
    () => (dataCursos as any)?.cursos?.filter((c: any) => c.status === "ativo") ?? [],
    [dataCursos]
  );
  const estudantes: EstudanteDetalhado[] = useMemo(
    () => (dataEstudantes as any)?.estudantes ?? [],
    [dataEstudantes]
  );

  const todasAvaliacoes: AvaliacaoFinal[] = useMemo(
    () => (dataAvaliacoes as any)?.avaliacoes ?? [],
    [dataAvaliacoes]
  );

  // Carrega avaliações de todos os estudantes de uma turma se ainda não estiver em cache
  async function carregarAvalTurma(turma: Turma) {
    const faltando = turma.estudantes.filter(cod => !avalCache[cod]);
    if (!faltando.length) return;
    await Promise.all(faltando.map(async cod => {
      try {
        const res = await consultasService.avaliacoesEstudante(cod, token);
        setAvalCache(prev => ({ ...prev, [cod]: (res as any)?.avaliacoes ?? [] }));
      } catch {}
    }));
  }

  // Avaliações da academia filtradas
  const avsDaAcademia = useCallback((anoLetivo?: string, anoAcademico?: string) =>
    todasAvaliacoes.filter(a =>
      (!anoLetivo || a.ano_lectivo === anoLetivo) &&
      (!anoAcademico || a.ano_academico_atual === anoAcademico)
    ),
  [todasAvaliacoes]);

  // Anos letivos únicos (dos mais antigos aos mais recentes)
  const anosLetivos = useMemo(() => {
    const set = new Set(todasAvaliacoes.map(a => a.ano_lectivo));
    return Array.from(set).sort();
  }, [todasAvaliacoes]);

  const anosLetivosParaCurso = (cursoId: string) => {
    const turmasDoCurso = turmas.filter(t => t.curso_id === cursoId);
    const estudantesDoCurso = new Set(turmasDoCurso.flatMap(t => t.estudantes));
    const set = new Set(todasAvaliacoes.filter(a => estudantesDoCurso.has(a.codigo_estudante)).map(a => a.ano_lectivo));
    return Array.from(set).sort();
  };

  const turmasPorNivel = (nivel: string) => turmas.filter(t => t.nivel === nivel);
  const turmasPorCursoNivel = (cursoId: string, nivel: string) =>
    turmas.filter(t => t.curso_id === cursoId && t.nivel === nivel);

  // Breadcrumbs
  function buildCrumbs(): { label: string; onClick?: () => void }[] {
    const goInicio = () => setLayer({ mode: "misto", type: "choose" });

    if (layer.mode === "fund") {
      const goAnos = () => setLayer({ mode: "fund", type: "anos_letivos" });
      const base = isMisto
        ? [{ label: "Início", onClick: goInicio }, { label: "Fundamental", onClick: goAnos }]
        : [{ label: "Anos Letivos", onClick: goAnos }];
      const l = layer as LayerFund;
      if (l.type === "anos_letivos") return isMisto ? [{ label: "Início", onClick: goInicio }, { label: "Fundamental" }] : [{ label: "Anos Letivos" }];
      if (l.type === "anos_academicos") return [...base, { label: l.anoLetivo.replace("_", "/") }];
      if (l.type === "turmas") return [...base, { label: l.anoLetivo.replace("_", "/"), onClick: () => setLayer({ mode: "fund", type: "anos_academicos", anoLetivo: l.anoLetivo }) }, { label: labelNivel(l.anoAcademico, true) }];
      if (l.type === "resultados") return [...base, { label: l.anoLetivo.replace("_", "/"), onClick: () => setLayer({ mode: "fund", type: "anos_academicos", anoLetivo: l.anoLetivo }) }, { label: labelNivel(l.anoAcademico, true), onClick: () => setLayer({ mode: "fund", type: "turmas", anoLetivo: l.anoLetivo, anoAcademico: l.anoAcademico }) }, { label: l.turma.codigo_turma }];
    }

    if (layer.mode === "sup") {
      const goCursos = () => setLayer({ mode: "sup", type: "cursos" });
      const base = isMisto
        ? [{ label: "Início", onClick: goInicio }, { label: "Cursos", onClick: goCursos }]
        : [{ label: "Cursos", onClick: goCursos }];
      const l = layer as LayerCurso;
      if (l.type === "cursos") return isMisto ? [{ label: "Início", onClick: goInicio }, { label: "Cursos" }] : [{ label: "Cursos" }];
      if (l.type === "anos_letivos") return [...base, { label: l.curso.nome }];
      if (l.type === "anos_academicos") return [...base, { label: l.curso.nome, onClick: () => setLayer({ mode: "sup", type: "anos_letivos", curso: l.curso }) }, { label: l.anoLetivo.replace("_", "/") }];
      if (l.type === "turmas") return [...base, { label: l.curso.nome, onClick: () => setLayer({ mode: "sup", type: "anos_letivos", curso: l.curso }) }, { label: l.anoLetivo.replace("_", "/"), onClick: () => setLayer({ mode: "sup", type: "anos_academicos", curso: l.curso, anoLetivo: l.anoLetivo }) }, { label: labelNivel(l.anoAcademico, !isSuperior) }];
      if (l.type === "resultados") return [...base, { label: l.curso.nome, onClick: () => setLayer({ mode: "sup", type: "anos_letivos", curso: l.curso }) }, { label: l.anoLetivo.replace("_", "/"), onClick: () => setLayer({ mode: "sup", type: "anos_academicos", curso: l.curso, anoLetivo: l.anoLetivo }) }, { label: labelNivel(l.anoAcademico, !isSuperior), onClick: () => setLayer({ mode: "sup", type: "turmas", curso: l.curso, anoLetivo: l.anoLetivo, anoAcademico: l.anoAcademico }) }, { label: l.turma.codigo_turma }];
    }

    return [];
  }

  // anos com turmas para o layer "fund/anos_academicos" — deve ficar no nível do componente
  const anoLetivoPараFund = layer.mode === "fund" && layer.type === "anos_academicos" ? layer.anoLetivo : undefined;
  const anosComTurmas = useMemo(() => {
    if (!anoLetivoPараFund) return [];
    const avsDoAno = avsDaAcademia(anoLetivoPараFund);
    const niveis = new Set(avsDoAno.map(a => a.ano_academico_atual));
    return ANOS_FUNDAMENTAL.filter(a => turmas.some(t => t.nivel === a) && niveis.has(a));
  }, [anoLetivoPараFund, avsDaAcademia, turmas]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      </div>
    );
  }

  // ── Misto: escolha ──
  if (layer.mode === "misto" && layer.type === "choose") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Avaliações Finais</h2>
          <p className="text-sm text-gray-500 mt-1">Selecione o nível de ensino</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CardBtn icon="mdi:school" title="Ensino Fundamental" subtitle="1º ao 9º Ano" onClick={() => setLayer({ mode: "fund", type: "anos_letivos" })} />
          <CardBtn icon="mdi:book-education" title="Ensino Médio" subtitle="Cursos médios" onClick={() => setLayer({ mode: "sup", type: "cursos" })} />
        </div>
      </div>
    );
  }

  // ── Fundamental: Anos Letivos ──
  if (layer.mode === "fund" && layer.type === "anos_letivos") {
    const crumbs = buildCrumbs();
    return (
      <div className="space-y-6">
        {isMisto && <Breadcrumb crumbs={crumbs} />}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Anos Letivos</h2>
        {anosLetivos.length === 0
          ? <p className="text-gray-400 text-sm py-8 text-center">Nenhuma avaliação final registada ainda.</p>
          : <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {anosLetivos.map(al => {
              const avs = avsDaAcademia(al);
              const aprov = avs.filter(a => a.aprovado).length;
              return <CardBtn key={al} icon="mdi:calendar-school" title={al.replace("_", "/")} subtitle={`${avs.length} avaliação(ões) · ${aprov} aprovação(ões)`} onClick={() => setLayer({ mode: "fund", type: "anos_academicos", anoLetivo: al })} />;
            })}
          </div>
        }
      </div>
    );
  }

  // ── Fundamental: Anos Académicos ──
  if (layer.mode === "fund" && layer.type === "anos_academicos") {
    const { anoLetivo } = layer;
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ano Letivo {anoLetivo.replace("_", "/")}</h2>
        <StatsAvaliacoes avaliacoes={avsDaAcademia(anoLetivo)} />
        {anosComTurmas.length === 0
          ? <p className="text-gray-400 text-sm py-6 text-center">Nenhum ano com avaliações neste período.</p>
          : <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {anosComTurmas.map(ano => {
              const avs = avsDaAcademia(anoLetivo, ano);
              const aprov = avs.filter(a => a.aprovado).length;
              return <CardBtn key={ano} icon="mdi:numeric" title={labelNivel(ano, true)} subtitle={`${avs.length} avaliação(ões) · ${aprov} aprovação(ões)`} onClick={() => setLayer({ mode: "fund", type: "turmas", anoLetivo, anoAcademico: ano })} />;
            })}
          </div>
        }
      </div>
    );
  }

  // ── Fundamental: Turmas ──
  if (layer.mode === "fund" && layer.type === "turmas") {
    const { anoLetivo, anoAcademico } = layer;
    const ts = turmasPorNivel(anoAcademico);
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labelNivel(anoAcademico, true)}</h2>
        {ts.length === 0
          ? <p className="text-gray-400 text-sm">Nenhuma turma neste ano.</p>
          : <div className="grid gap-3 sm:grid-cols-2">
            {ts.map(t => {
              const avs = todasAvaliacoes.filter(a => t.estudantes.includes(a.codigo_estudante) && a.ano_lectivo === anoLetivo && a.ano_academico_atual === anoAcademico);
              const aprov = avs.filter(a => a.aprovado).length;
              return <CardBtn key={t.id} icon="mdi:account-group" title={t.codigo_turma} subtitle={`${t.estudantes.length} estudante(s) · ${aprov}/${avs.length} aprovações`} badge={t.turno} onClick={async () => { await carregarAvalTurma(t); setLayer({ mode: "fund", type: "resultados", anoLetivo, anoAcademico, turma: t }); }} />;
            })}
          </div>
        }
      </div>
    );
  }

  // ── Fundamental: Resultados ──
  if (layer.mode === "fund" && layer.type === "resultados") {
    const { anoLetivo, anoAcademico, turma } = layer;
    const avs = todasAvaliacoes.filter(a => turma.estudantes.includes(a.codigo_estudante) && a.ano_lectivo === anoLetivo && a.ano_academico_atual === anoAcademico);
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Turma {turma.codigo_turma}</h2>
          <p className="text-sm text-gray-500 mt-1">{labelNivel(anoAcademico, true)} · Ano Letivo {anoLetivo.replace("_", "/")}</p>
        </div>
        <StatsAvaliacoes avaliacoes={avs} />
        <TabelaResultadosTurma turma={turma} avaliacoes={todasAvaliacoes} estudantes={estudantes} anoLetivo={anoLetivo} anoAcademico={anoAcademico} />
      </div>
    );
  }

  // ── Sup/Médio: Cursos ──
  if (layer.mode === "sup" && layer.type === "cursos") {
    return (
      <div className="space-y-6">
        {isMisto && <Breadcrumb crumbs={buildCrumbs()} />}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cursos</h2>
        {cursos.length === 0
          ? <p className="text-gray-400 text-sm">Nenhum curso activo.</p>
          : <div className="grid gap-3 sm:grid-cols-2">
            {cursos.map(c => {
              const turmasDoCurso = turmas.filter(t => t.curso_id === c.id);
              const estudsDoCurso = new Set(turmasDoCurso.flatMap(t => t.estudantes));
              const avs = todasAvaliacoes.filter(a => estudsDoCurso.has(a.codigo_estudante));
              return <CardBtn key={c.id} icon="mdi:book-open-variant" title={c.nome} subtitle={`${avs.length} avaliação(ões)`} onClick={() => setLayer({ mode: "sup", type: "anos_letivos", curso: c })} />;
            })}
          </div>
        }
      </div>
    );
  }

  // ── Sup/Médio: Anos Letivos ──
  if (layer.mode === "sup" && layer.type === "anos_letivos") {
    const { curso } = layer;
    const als = anosLetivosParaCurso(curso.id);
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{curso.nome}</h2>
        {als.length === 0
          ? <p className="text-gray-400 text-sm py-8 text-center">Nenhuma avaliação final registada para este curso ainda.</p>
          : <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {als.map(al => {
              const turmasDoCurso = turmas.filter(t => t.curso_id === curso.id);
              const estudsDoCurso = new Set(turmasDoCurso.flatMap(t => t.estudantes));
              const avs = todasAvaliacoes.filter(a => estudsDoCurso.has(a.codigo_estudante) && a.ano_lectivo === al);
              const aprov = avs.filter(a => a.aprovado).length;
              return <CardBtn key={al} icon="mdi:calendar-school" title={al.replace("_", "/")} subtitle={`${avs.length} avaliação(ões) · ${aprov} aprovação(ões)`} onClick={() => setLayer({ mode: "sup", type: "anos_academicos", curso, anoLetivo: al })} />;
            })}
          </div>
        }
      </div>
    );
  }

  // ── Sup/Médio: Anos Académicos ──
  if (layer.mode === "sup" && layer.type === "anos_academicos") {
    const { curso, anoLetivo } = layer;
    const anosOrdenados = sortAnos(curso.anos_academicos ?? []);
    const turmasDoCurso = turmas.filter(t => t.curso_id === curso.id);
    const estudsDoCurso = new Set(turmasDoCurso.flatMap(t => t.estudantes));
    const anosComAvs = anosOrdenados.filter(ano =>
      todasAvaliacoes.some(a => estudsDoCurso.has(a.codigo_estudante) && a.ano_lectivo === anoLetivo && a.ano_academico_atual === ano)
    );
    const avsDoAno = todasAvaliacoes.filter(a => estudsDoCurso.has(a.codigo_estudante) && a.ano_lectivo === anoLetivo);
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ano Letivo {anoLetivo.replace("_", "/")}</h2>
        <StatsAvaliacoes avaliacoes={avsDoAno} />
        {anosComAvs.length === 0
          ? <p className="text-gray-400 text-sm py-6 text-center">Nenhum ano académico com avaliações registadas.</p>
          : <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {anosComAvs.map(ano => {
              const avs = todasAvaliacoes.filter(a => estudsDoCurso.has(a.codigo_estudante) && a.ano_lectivo === anoLetivo && a.ano_academico_atual === ano);
              const aprov = avs.filter(a => a.aprovado).length;
              return <CardBtn key={ano} icon="mdi:calendar-school" title={labelNivel(ano, !isSuperior)} subtitle={`${avs.length} avaliação(ões) · ${aprov} aprovação(ões)`} onClick={() => setLayer({ mode: "sup", type: "turmas", curso, anoLetivo, anoAcademico: ano })} />;
            })}
          </div>
        }
      </div>
    );
  }

  // ── Sup/Médio: Turmas ──
  if (layer.mode === "sup" && layer.type === "turmas") {
    const { curso, anoLetivo, anoAcademico } = layer;
    const ts = turmasPorCursoNivel(curso.id, anoAcademico);
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labelNivel(anoAcademico, !isSuperior)}</h2>
        {ts.length === 0
          ? <p className="text-gray-400 text-sm">Nenhuma turma neste ano.</p>
          : <div className="grid gap-3 sm:grid-cols-2">
            {ts.map(t => {
              const avs = todasAvaliacoes.filter(a => t.estudantes.includes(a.codigo_estudante) && a.ano_lectivo === anoLetivo && a.ano_academico_atual === anoAcademico);
              const aprov = avs.filter(a => a.aprovado).length;
              return <CardBtn key={t.id} icon="mdi:account-group" title={t.codigo_turma} subtitle={`${t.estudantes.length} estudante(s) · ${aprov}/${avs.length} aprovações`} badge={t.turno} onClick={async () => { await carregarAvalTurma(t); setLayer({ mode: "sup", type: "resultados", curso, anoLetivo, anoAcademico, turma: t }); }} />;
            })}
          </div>
        }
      </div>
    );
  }

  // ── Sup/Médio: Resultados ──
  if (layer.mode === "sup" && layer.type === "resultados") {
    const { curso, anoLetivo, anoAcademico, turma } = layer;
    const avs = todasAvaliacoes.filter(a => turma.estudantes.includes(a.codigo_estudante) && a.ano_lectivo === anoLetivo && a.ano_academico_atual === anoAcademico);
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Turma {turma.codigo_turma}</h2>
          <p className="text-sm text-gray-500 mt-1">{labelNivel(anoAcademico, !isSuperior)} · {curso.nome} · Ano Letivo {anoLetivo.replace("_", "/")}</p>
        </div>
        <StatsAvaliacoes avaliacoes={avs} />
        <TabelaResultadosTurma turma={turma} avaliacoes={todasAvaliacoes} estudantes={estudantes} anoLetivo={anoLetivo} anoAcademico={anoAcademico} />
      </div>
    );
  }

  return null;
}