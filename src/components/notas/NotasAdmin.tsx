// src/components/notas/NotasAdmin.tsx
"use client"
import { useState, useEffect, useMemo, useCallback } from "react";
import { useApi, consultasService, academiaService, tokenStorage } from "@/lib/api";
import type { Nota, Turma, EstudanteDetalhado, Curso } from "@/types/api";
import { Provincias } from "@/types/api";
import Icon from "@/components/ui/Icon";
import Alert from "@/components/ui/alert/Alert";

// ─── helpers ─────────────────────────────────────────────────────────────────

const PERIODOS_LABEL: Record<string, string> = {
  "1_trimestre": "1º Trimestre", "2_trimestre": "2º Trimestre", "3_trimestre": "3º Trimestre",
  "1_semestre":  "1º Semestre",  "2_semestre":  "2º Semestre",
};
const PERIODOS_ESCOLA   = [
  { label: "1º Trimestre", value: "1_trimestre" },
  { label: "2º Trimestre", value: "2_trimestre" },
  { label: "3º Trimestre", value: "3_trimestre" },
];
const PERIODOS_SUPERIOR = [
  { label: "1º Semestre", value: "1_semestre" },
  { label: "2º Semestre", value: "2_semestre" },
];

const ANOS_FUNDAMENTAL = [
  "1_ano_fundamental","2_ano_fundamental","3_ano_fundamental","4_ano_fundamental",
  "5_ano_fundamental","6_ano_fundamental","7_ano_fundamental","8_ano_fundamental","9_ano_fundamental",
];
const ANOS_MEDIO    = ["1_ano_medio","2_ano_medio","3_ano_medio","4_ano_medio"];
const ANOS_SUPERIOR = [
  "1_ano_superior","2_ano_superior","3_ano_superior",
  "4_ano_superior","5_ano_superior","6_ano_superior",
];
const ORDEM_ANOS = [...ANOS_FUNDAMENTAL, ...ANOS_MEDIO, ...ANOS_SUPERIOR];

function sortAnos(anos: string[]): string[] {
  return [...anos].sort((a, b) => {
    const ia = ORDEM_ANOS.indexOf(a);
    const ib = ORDEM_ANOS.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

function labelNivel(v: string): string {
  const match = v.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!match) return v.replace(/_/g, " ");
  const [, n, tipo] = match;
  if (tipo === "fundamental") return `${n}º Ano do Ensino Fundamental`;
  if (tipo === "medio")       return `${n}º Ano do Ensino Médio`;
  return `${n}º Ano Superior`;
}

function nomeProvinciaDeCodigo(codigo: string): string {
  return Provincias.find(p => p.codigo === codigo?.toUpperCase())?.nome ?? codigo;
}

function corNota(n: number): string {
  if (n >= 14) return "text-emerald-600 dark:text-emerald-400";
  if (n >= 10) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function normCodigo(codigo: string): string {
  return (codigo ?? "").trim().toLowerCase();
}

function turmaAtiva(turma: Turma): boolean {
  const s = turma.status ?? "";
  return s !== "inativo" && s !== "deletado";
}

// ─── tipos de layer ───────────────────────────────────────────────────────────
// Admin: Províncias → Academias → Anos letivos → (replica NotasAcademia)
// Após anos letivos: anos/cursos → turmas → períodos → notas (igual à academia)

type AcadInfo = {
  codigo_academia: string;
  nome: string;
  provincia: string;
  nivel: string;              // 'escola' | 'superior'
  nivel_escolar?: string;     // 'fundamental' | 'medio' | 'misto'
  anos_academicos?: string[];
  status: string;
};

// Sub-layers internos da academia (idênticos ao NotasAcademia, mas com academia no contexto)
type AcadLayer =
  | { mode: "fund"; type: "anos" }
  | { mode: "fund"; type: "turmas"; nivel: string }
  | { mode: "fund"; type: "periodos"; nivel: string; turma: Turma }
  | { mode: "fund"; type: "notas";   nivel: string; turma: Turma; periodo: string }
  | { mode: "sup";  type: "cursos" }
  | { mode: "sup";  type: "anos";    curso: Curso }
  | { mode: "sup";  type: "turmas";  curso: Curso; nivel: string }
  | { mode: "sup";  type: "periodos"; curso: Curso; nivel: string; turma: Turma }
  | { mode: "sup";  type: "notas";   curso: Curso; nivel: string; turma: Turma; periodo: string }
  | { mode: "misto"; type: "choose" };

type Layer =
  | { type: "provincias" }
  | { type: "academias"; provincia: string }
  | { type: "academia_root"; academia: AcadInfo; anoLetivo: string; acad: AcadLayer };

// ─── sub-componentes ─────────────────────────────────────────────────────────

function Breadcrumb({ crumbs }: { crumbs: { label: string; onClick?: () => void }[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap mb-5">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <Icon icon="mdi:chevron-right" width={15} className="text-gray-400" />}
          {i === crumbs.length - 1
            ? <span className="text-gray-900 dark:text-white font-medium">{c.label}</span>
            : (
              <button
                onClick={c.onClick}
                className="text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors"
              >
                {c.label}
              </button>
            )
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
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-400 hover:shadow-sm transition-all text-left group"
    >
      <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
        <Icon icon={icon} width={22} className="text-brand-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {badge && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize flex-shrink-0">
          {badge}
        </span>
      )}
      <Icon icon="mdi:chevron-right" width={18} className="text-gray-400 group-hover:text-brand-500 flex-shrink-0" />
    </button>
  );
}

function LoadingSpinner({ message = "Carregando..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

// ─── Tabela escolar ───────────────────────────────────────────────────────────

function TabelaNotasEscolar({
  notas,
  estudantes,
  codigosTurma,
}: {
  notas: Nota[];
  estudantes: EstudanteDetalhado[];
  codigosTurma: string[];
}) {
  if (codigosTurma.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Icon icon="mdi:notebook-outline" width={40} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nenhum estudante encontrado nesta turma.</p>
      </div>
    );
  }

  const porEstudante = new Map<string, Nota[]>();
  notas.forEach(n => {
    const k = normCodigo(n.codigo_estudante);
    if (!porEstudante.has(k)) porEstudante.set(k, []);
    porEstudante.get(k)!.push(n);
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm min-w-[500px]">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Nome do Estudante</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Código</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Nota do Professor</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Nota Escola</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {[...codigosTurma]
            .map(codigo => {
              const notasEst = porEstudante.get(codigo) ?? [];
              const est      = estudantes.find(e => normCodigo(e.codigo_estudante) === codigo);
              const nome     = est?.nome ?? notasEst[0]?.estudante_nome ?? "-";
              return {
                codigo,
                nome,
                notaProf: notasEst.find(n => n.categoria === "nota_professor"),
                notaEsc:  notasEst.find(n => n.categoria === "nota_escola"),
              };
            })
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" }))
            .map(({ codigo, nome, notaProf, notaEsc }) => (
              <tr
                key={codigo}
                className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{nome}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{codigo.toUpperCase()}</td>
                <td className={`px-4 py-3 text-right font-bold ${notaProf ? corNota(notaProf.nota) : "text-gray-300 dark:text-gray-600"}`}>
                  {notaProf != null ? notaProf.nota : "—"}
                </td>
                <td className={`px-4 py-3 text-right font-bold ${notaEsc ? corNota(notaEsc.nota) : "text-gray-300 dark:text-gray-600"}`}>
                  {notaEsc != null ? notaEsc.nota : "—"}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tabela superior ──────────────────────────────────────────────────────────

function TabelaNotasSuperior({
  notas,
  estudantes,
  codigosTurma,
}: {
  notas: Nota[];
  estudantes: EstudanteDetalhado[];
  codigosTurma: string[];
}) {
  if (codigosTurma.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Icon icon="mdi:notebook-outline" width={40} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nenhum estudante encontrado nesta turma.</p>
      </div>
    );
  }

  const porEstudante = new Map<string, Nota[]>();
  notas.forEach(n => {
    const k = normCodigo(n.codigo_estudante);
    if (!porEstudante.has(k)) porEstudante.set(k, []);
    porEstudante.get(k)!.push(n);
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm min-w-[600px]">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Nome do Estudante</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Código</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">PP1</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">PP2</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Exame</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {[...codigosTurma]
            .map(codigo => {
              const notasEst = porEstudante.get(codigo) ?? [];
              const est      = estudantes.find(e => normCodigo(e.codigo_estudante) === codigo);
              const nome     = est?.nome ?? notasEst[0]?.estudante_nome ?? "-";
              return {
                codigo,
                nome,
                pp1:   notasEst.find(n => n.categoria === "nota_pp1"),
                pp2:   notasEst.find(n => n.categoria === "nota_pp2"),
                exame: notasEst.find(n => n.categoria === "nota_exame"),
              };
            })
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" }))
            .map(({ codigo, nome, pp1, pp2, exame }) => (
              <tr key={codigo} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{nome}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{codigo.toUpperCase()}</td>
                <td className={`px-4 py-3 text-right font-bold ${pp1   ? corNota(pp1.nota)   : "text-gray-300 dark:text-gray-600"}`}>{pp1   != null ? pp1.nota   : "—"}</td>
                <td className={`px-4 py-3 text-right font-bold ${pp2   ? corNota(pp2.nota)   : "text-gray-300 dark:text-gray-600"}`}>{pp2   != null ? pp2.nota   : "—"}</td>
                <td className={`px-4 py-3 text-right font-bold ${exame ? corNota(exame.nota) : "text-gray-300 dark:text-gray-600"}`}>{exame != null ? exame.nota : "—"}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function NotasAdmin() {
  const token = tokenStorage.get() ?? undefined;
  const [layer, setLayer] = useState<Layer>({ type: "provincias" });
  const [alert, setAlert] = useState<{ variant: "success" | "error"; message: string } | null>(null);

  // ── dados base ──────────────────────────────────────────────────────────────
  const { data: academiasData, execute: carregarAcademias, loading: loadingAcads } =
    useApi(consultasService.listarAcademias);

  // Dados carregados ao entrar numa academia específica
  const { data: dataTurmas,      execute: carregarTurmas     } = useApi(academiaService.listarTurmas);
  const { data: dataCursos,      execute: carregarCursos     } = useApi(academiaService.listarCursos);
  const { data: dataEstudantes,  execute: carregarEstudantes } = useApi(consultasService.listarEstudantes);

  // Anos letivos disponíveis por academia (buscados via GET /notas com limit=1)
  const [anosLetivosPorAcad, setAnosLetivosPorAcad] = useState<Record<string, string[]>>({});
  const [loadingAnos, setLoadingAnos]               = useState(false);

  // Notas por estudante (cache local, igual ao NotasAcademia)
  const [notasPorEstudante, setNotasPorEstudante]   = useState<Record<string, Nota[]>>({});
  const [carregandoNotas, setCarregandoNotas]       = useState(false);

  // Cache de detalhes de matérias
  const [materiasCache, setMateriasCache]           = useState<Record<string, { id: string; nome: string }>>({});
  const [carregandoMaterias, setCarregandoMaterias] = useState(false);

  // Matéria selecionada na camada de notas
  const [materiaSelecionada, setMateriaSelecionada] = useState<string | null>(null);

  // Sub-layer interno da academia (espelha NotasAcademia)
  const [acadLayer, setAcadLayer] = useState<AcadLayer>({ mode: "fund", type: "anos" });

  // Ano letivo selecionado dentro da academia
  const [anoLetivoSelecionado, setAnoLetivoSelecionado] = useState("");

  // ── carga inicial ───────────────────────────────────────────────────────────
  useEffect(() => {
    carregarAcademias({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reseta sub-layer ao trocar matéria
  useEffect(() => {
    setMateriaSelecionada(null);
  }, [acadLayer]);

  // ── dados derivados ─────────────────────────────────────────────────────────
  const academias: AcadInfo[] = useMemo(() =>
    ((academiasData as any)?.academias ?? []).map((a: any) => ({
      codigo_academia: a.codigo_academia,
      nome: a.nome,
      provincia: a.provincia,
      nivel: a.nivel,
      nivel_escolar: a.nivel_escolar,
      anos_academicos: a.anos_academicos ?? [],
      status: a.status,
    })),
    [academiasData]);

  const provincias = useMemo(() =>
    Array.from(new Set(academias.map(a => a.provincia?.toUpperCase()).filter(Boolean)))
      .sort((a, b) => nomeProvinciaDeCodigo(a).localeCompare(nomeProvinciaDeCodigo(b))),
    [academias]);

  const turmas: Turma[]                  = useMemo(() => (dataTurmas as any)?.turmas ?? [], [dataTurmas]);
  const cursos: Curso[]                  = useMemo(() => (dataCursos as any)?.cursos?.filter((c: any) => c.status === "ativo") ?? [], [dataCursos]);
  const estudantes: EstudanteDetalhado[] = useMemo(() => (dataEstudantes as any)?.estudantes ?? [], [dataEstudantes]);
  const turmasAtivas: Turma[]            = useMemo(() => turmas.filter(turmaAtiva), [turmas]);
  const todasNotas                       = useMemo(() => Object.values(notasPorEstudante).flat(), [notasPorEstudante]);

  // Academia actual (quando em academia_root)
  const academiaAtual: AcadInfo | null = layer.type === "academia_root" ? layer.academia : null;

  const isSuperior    = academiaAtual?.nivel === "superior";
  const nivelEscolar  = academiaAtual?.nivel_escolar ?? "fundamental";
  const isFundamental = !isSuperior && nivelEscolar === "fundamental";
  const isMisto       = !isSuperior && nivelEscolar === "misto";
  const PERIODOS      = isSuperior ? PERIODOS_SUPERIOR : PERIODOS_ESCOLA;

  // Níveis fundamentais disponíveis
  const niveisFundamentais = useMemo(() => {
    if (!academiaAtual) return [];
    const anosAcademia = academiaAtual.anos_academicos ?? [];
    const comTurmas    = anosAcademia.filter(a => a.includes("fundamental") && turmasAtivas.some(t => t.nivel === a));
    const base         = comTurmas.length > 0 ? comTurmas : anosAcademia.filter(a => a.includes("fundamental"));
    return sortAnos(base);
  }, [turmasAtivas, academiaAtual]);

  // Anos letivos disponíveis dentro da academia
  const anosLetivosDisponiveis = useMemo(() =>
    (anosLetivosPorAcad[academiaAtual?.codigo_academia ?? ""] ?? []).sort(),
    [anosLetivosPorAcad, academiaAtual]);

  // ── pré-selecionar primeira matéria (igual ao NotasAcademia) ────────────────
  useEffect(() => {
    if (layer.type !== "academia_root") return;
    if (acadLayer.type !== "notas") return;
    if (materiaSelecionada) return;

    const l = acadLayer as any;
    const anoFiltro = anoLetivoSelecionado;
    const codigosHistorico: string[] = anoFiltro
      ? (l.turma.historico_estudantes_ano_letivo?.[anoFiltro] ?? [])
      : [];
    const codigosOrigem: string[] = codigosHistorico.length > 0 ? codigosHistorico : (l.turma.estudantes ?? []);
    const codigosNorm = [...new Set(codigosOrigem.map((c: string) => normCodigo(c)).filter(Boolean))];

    const notasCtx: Nota[] = codigosNorm
      .flatMap((c: string) => notasPorEstudante[c] ?? [])
      .filter((n: Nota) =>
        (!anoFiltro || n.ano_lectivo === anoFiltro) &&
        n.ano_academico === l.nivel &&
        n.periodo === l.periodo
      );

    const ids = [...new Set(notasCtx.map((n: Nota) => n.materia_disciplinar_id))];
    if (ids.length === 0) return;

    const todosResolvidos = ids.every(id => materiasCache[id] && materiasCache[id].nome !== id);
    if (!todosResolvidos) return;

    const materiasDisp = ids
      .map(id => materiasCache[id])
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" }));

    if (materiasDisp.length > 0) {
      setMateriaSelecionada(materiasDisp[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acadLayer, materiasCache, notasPorEstudante, layer]);

  // ── buscar detalhes de matérias quando na camada notas ─────────────────────
  useEffect(() => {
    if (layer.type !== "academia_root") return;
    if (acadLayer.type !== "notas") return;

    const l = acadLayer as any;
    const anoFiltro = anoLetivoSelecionado;
    const codigosHistorico: string[] = anoFiltro
      ? (l.turma.historico_estudantes_ano_letivo?.[anoFiltro] ?? [])
      : [];
    const codigosOrigem: string[] = codigosHistorico.length > 0 ? codigosHistorico : (l.turma.estudantes ?? []);
    const codigosNorm = [...new Set(codigosOrigem.map((c: string) => normCodigo(c)).filter(Boolean))];

    const notasCtx: Nota[] = codigosNorm
      .flatMap((c: string) => notasPorEstudante[c] ?? [])
      .filter((n: Nota) =>
        (!anoFiltro || n.ano_lectivo === anoFiltro) &&
        n.ano_academico === l.nivel &&
        n.periodo       === l.periodo
      );

    const ids: string[]     = [...new Set(notasCtx.map((n: Nota) => n.materia_disciplinar_id))];
    const missing: string[] = ids.filter(id => !materiasCache[id]);
    if (missing.length === 0) return;

    setCarregandoMaterias(true);
    Promise.all(missing.map(id => academiaService.getMateria(id, token)))
      .then(results => {
        setMateriasCache(prev => {
          const next = { ...prev };
          results.forEach(m => { if (m?.id) next[m.id] = { id: m.id, nome: m.nome }; });
          return next;
        });
      })
      .catch(() => {})
      .finally(() => setCarregandoMaterias(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acadLayer, notasPorEstudante, anoLetivoSelecionado, layer]);

  // ── helpers internos ────────────────────────────────────────────────────────

  function showAlert(variant: "success" | "error", message: string) {
    setAlert({ variant, message });
    setTimeout(() => setAlert(null), 4000);
  }

  function codigosTurmaDoAnoLetivo(turma: Turma, anoLetivo?: string): string[] {
    const codigosHistorico = anoLetivo ? (turma.historico_estudantes_ano_letivo?.[anoLetivo] ?? []) : [];
    const codigosOrigem    = codigosHistorico.length > 0 ? codigosHistorico : turma.estudantes;
    return Array.from(new Set(codigosOrigem.map(normCodigo).filter(Boolean)));
  }

  function codigoOriginalDaTurma(turma: Turma, codigoNorm: string, anoLetivo?: string): string {
    const codigosHistorico = anoLetivo ? (turma.historico_estudantes_ano_letivo?.[anoLetivo] ?? []) : [];
    const codigosOrigem    = codigosHistorico.length > 0 ? codigosHistorico : turma.estudantes;
    return codigosOrigem.find(c => normCodigo(c) === codigoNorm) ?? codigoNorm;
  }

  async function carregarNotasDosEstudantesDaTurma(turma: Turma, force = false) {
    const codigosNorm       = codigosTurmaDoAnoLetivo(turma, anoLetivoSelecionado);
    const codigosParaBuscar = force
      ? codigosNorm
      : codigosNorm.filter(c => !(c in notasPorEstudante));
    if (codigosParaBuscar.length === 0) return;

    setCarregandoNotas(true);
    try {
      const resultados = await Promise.all(
        codigosParaBuscar.map(async codigoNorm => {
          const codigoOriginal = codigoOriginalDaTurma(turma, codigoNorm, anoLetivoSelecionado);
          const resposta = await consultasService.notasEstudante(codigoOriginal, { token });
          return { codigoNorm, notas: resposta?.notas ?? [] };
        })
      );
      setNotasPorEstudante(prev => {
        const next = { ...prev };
        resultados.forEach(({ codigoNorm, notas }) => { next[codigoNorm] = notas; });
        return next;
      });
    } catch {
      // erro silencioso
    } finally {
      setCarregandoNotas(false);
    }
  }

  function notasDaTurmaEmPeriodo(turma: Turma, nivel: string, periodo: string): Nota[] {
    const codigosTurma  = codigosTurmaDoAnoLetivo(turma, anoLetivoSelecionado);
    const notasDaTurma  = codigosTurma.flatMap(c => notasPorEstudante[c] ?? []);
    const notasAnoLetivo = anoLetivoSelecionado
      ? notasDaTurma.filter(n => n.ano_lectivo === anoLetivoSelecionado)
      : notasDaTurma;
    return notasAnoLetivo.filter(n => n.ano_academico === nivel && n.periodo === periodo);
  }

  const turmasPorNivel = (nivel: string) => turmasAtivas.filter(t => t.nivel === nivel);
  const turmasPorCurso = (cursoId: string) => turmasAtivas.filter(t => t.curso_id === cursoId);
  const anosDosCurso   = (c: Curso) => sortAnos(c.anos_academicos ?? []);

  // ── entrar numa academia ────────────────────────────────────────────────────

  const carregarAnosLetivosAcademia = useCallback(async (codigoAcademia: string) => {
    if (anosLetivosPorAcad[codigoAcademia]) return;
    setLoadingAnos(true);
    try {
      const res = await consultasService.listarNotas({ codigo_academia: codigoAcademia, limit: 1000, token });
      const anos = Array.from(new Set((res?.notas ?? []).map(n => n.ano_lectivo).filter(Boolean))).sort();
      setAnosLetivosPorAcad(prev => ({ ...prev, [codigoAcademia]: anos }));
    } catch {
      setAnosLetivosPorAcad(prev => ({ ...prev, [codigoAcademia]: [] }));
    } finally {
      setLoadingAnos(false);
    }
  }, [anosLetivosPorAcad, token]);

  async function entrarNaAcademia(academia: AcadInfo) {
    await carregarAnosLetivosAcademia(academia.codigo_academia);
    // Carregar dados da academia (turmas, cursos, estudantes) — usando admin token
    // Estes endpoints retornam dados da academia autenticada, mas para o admin
    // usamos os endpoints públicos com o código da academia. Para turmas/cursos
    // não há endpoint público com filtro de academia, então chamamos os da academia
    // com o token de admin (que tem acesso total).
    await Promise.all([
      carregarTurmas(token),
      carregarCursos(token),
      carregarEstudantes(token),
    ]);

    // Determinar sub-layer inicial com base no tipo da academia
    const nivelEsc  = academia.nivel_escolar ?? "fundamental";
    const isSup     = academia.nivel === "superior";
    const isFund    = !isSup && nivelEsc === "fundamental";
    const isMst     = !isSup && nivelEsc === "misto";

    let initAcad: AcadLayer;
    if (isFund)      initAcad = { mode: "fund", type: "anos" };
    else if (isMst)  initAcad = { mode: "misto", type: "choose" };
    else             initAcad = { mode: "sup", type: "cursos" };

    setAcadLayer(initAcad);
    setAnoLetivoSelecionado("");
    setNotasPorEstudante({});
    setMateriaSelecionada(null);
    setLayer({ type: "academia_root", academia, anoLetivo: "", acad: initAcad });
  }

  // ── breadcrumbs ─────────────────────────────────────────────────────────────

  function buildCrumbs(): { label: string; onClick?: () => void }[] {
    const goProvs = () => setLayer({ type: "provincias" });

    if (layer.type === "provincias") return [{ label: "Províncias" }];

    if (layer.type === "academias") return [
      { label: "Províncias", onClick: goProvs },
      { label: nomeProvinciaDeCodigo(layer.provincia) },
    ];

    if (layer.type === "academia_root") {
      const { academia } = layer;
      const goAcads  = () => setLayer({ type: "academias", provincia: academia.provincia });
      const goAcad   = () => {
        setAcadLayer({ mode: "fund", type: "anos" });
        setAnoLetivoSelecionado("");
        setLayer(prev => prev.type === "academia_root" ? { ...prev, acad: { mode: "fund", type: "anos" } } : prev);
      };

      const base = [
        { label: "Províncias", onClick: goProvs },
        { label: nomeProvinciaDeCodigo(academia.provincia), onClick: goAcads },
        { label: academia.nome, onClick: goAcad },
      ];

      const al = acadLayer;

      if (al.mode === "misto" && al.type === "choose") return base;

      if (al.mode === "fund") {
        const goAnos = () => setAcadLayer({ mode: "fund", type: "anos" });
        const anosCrumb = { label: isMisto ? "Fundamental" : "Anos", onClick: goAnos };
        const ext = isMisto ? [{ label: "Início", onClick: () => setAcadLayer({ mode: "misto", type: "choose" }) }, anosCrumb] : [anosCrumb];

        if (al.type === "anos")     return [...base, ...ext];
        if (al.type === "turmas")   return [...base, ...ext, { label: labelNivel(al.nivel) }];
        if (al.type === "periodos") return [...base, ...ext,
          { label: labelNivel(al.nivel), onClick: () => setAcadLayer({ mode: "fund", type: "turmas", nivel: al.nivel }) },
          { label: al.turma.codigo_turma },
        ];
        if (al.type === "notas") return [...base, ...ext,
          { label: labelNivel(al.nivel), onClick: () => setAcadLayer({ mode: "fund", type: "turmas", nivel: al.nivel }) },
          { label: al.turma.codigo_turma, onClick: () => setAcadLayer({ mode: "fund", type: "periodos", nivel: al.nivel, turma: al.turma }) },
          { label: PERIODOS_LABEL[al.periodo] ?? al.periodo },
        ];
      }

      if (al.mode === "sup") {
        const goCursos = () => setAcadLayer({ mode: "sup", type: "cursos" });
        const cursosCrumb = { label: isMisto ? "Médio" : "Cursos", onClick: goCursos };
        const ext = isMisto
          ? [{ label: "Início", onClick: () => setAcadLayer({ mode: "misto", type: "choose" }) }, cursosCrumb]
          : [cursosCrumb];

        if (al.type === "cursos") return [...base, ...ext];
        if (al.type === "anos")   return [...base, ...ext, { label: al.curso.nome }];
        if (al.type === "turmas") return [...base, ...ext,
          { label: al.curso.nome, onClick: () => setAcadLayer({ mode: "sup", type: "anos", curso: al.curso }) },
          { label: labelNivel(al.nivel) },
        ];
        if (al.type === "periodos") return [...base, ...ext,
          { label: al.curso.nome,        onClick: () => setAcadLayer({ mode: "sup", type: "anos",   curso: al.curso }) },
          { label: labelNivel(al.nivel), onClick: () => setAcadLayer({ mode: "sup", type: "turmas", curso: al.curso, nivel: al.nivel }) },
          { label: al.turma.codigo_turma },
        ];
        if (al.type === "notas") return [...base, ...ext,
          { label: al.curso.nome,               onClick: () => setAcadLayer({ mode: "sup", type: "anos",     curso: al.curso }) },
          { label: labelNivel(al.nivel),         onClick: () => setAcadLayer({ mode: "sup", type: "turmas",   curso: al.curso, nivel: al.nivel }) },
          { label: al.turma.codigo_turma,        onClick: () => setAcadLayer({ mode: "sup", type: "periodos", curso: al.curso, nivel: al.nivel, turma: al.turma }) },
          { label: PERIODOS_LABEL[al.periodo] ?? al.periodo },
        ];
      }

      return base;
    }

    return [];
  }

  // ── voltar ──────────────────────────────────────────────────────────────────

  function canGoBack(): boolean {
    if (layer.type === "provincias") return false;
    if (layer.type === "academias") return true;
    if (layer.type === "academia_root") {
      const al = acadLayer;
      if (al.mode === "misto" && al.type === "choose") return true; // volta a academias
      if (al.mode === "fund" && al.type === "anos" && !isMisto && !anoLetivoSelecionado) return true;
      if (al.mode === "sup"  && al.type === "cursos" && !isMisto) return true;
      return true;
    }
    return false;
  }

  function goBack() {
    if (layer.type === "academias") {
      setLayer({ type: "provincias" });
      return;
    }
    if (layer.type === "academia_root") {
      const al = acadLayer;

      // Se está no nível inicial da academia (choose/anos/cursos sem sub-navegação),
      // volta à lista de academias
      if (
        (al.mode === "misto" && al.type === "choose") ||
        (al.mode === "fund" && al.type === "anos" && !isMisto && !anoLetivoSelecionado) ||
        (al.mode === "sup"  && al.type === "cursos" && !isMisto)
      ) {
        setLayer({ type: "academias", provincia: layer.academia.provincia });
        return;
      }

      // Limpa ano letivo quando está na tela de anos com um selecionado
      if (al.type === "anos" && anoLetivoSelecionado) {
        setAnoLetivoSelecionado("");
        return;
      }

      // Navega para trás dentro do sub-layer
      if (al.mode === "fund") {
        if (al.type === "anos")     { if (isMisto) setAcadLayer({ mode: "misto", type: "choose" }); }
        else if (al.type === "turmas")   setAcadLayer({ mode: "fund", type: "anos" });
        else if (al.type === "periodos") setAcadLayer({ mode: "fund", type: "turmas", nivel: al.nivel });
        else if (al.type === "notas")    setAcadLayer({ mode: "fund", type: "periodos", nivel: al.nivel, turma: al.turma });
      } else if (al.mode === "sup") {
        if (al.type === "cursos")   { if (isMisto) setAcadLayer({ mode: "misto", type: "choose" }); }
        else if (al.type === "anos")     setAcadLayer({ mode: "sup", type: "cursos" });
        else if (al.type === "turmas")   setAcadLayer({ mode: "sup", type: "anos", curso: al.curso });
        else if (al.type === "periodos") setAcadLayer({ mode: "sup", type: "turmas", curso: al.curso, nivel: al.nivel });
        else if (al.type === "notas")    setAcadLayer({ mode: "sup", type: "periodos", curso: al.curso, nivel: al.nivel, turma: al.turma });
      } else if (al.mode === "misto") {
        setLayer({ type: "academias", provincia: layer.academia.provincia });
      }
    }
  }

  // ── render da camada de notas (igual ao NotasAcademia) ──────────────────────

  function renderNotasLayer(nivel: string, turma: Turma, periodo: string, usarTabelaSuperior: boolean) {
    const codigosTurma   = codigosTurmaDoAnoLetivo(turma, anoLetivoSelecionado).filter(Boolean);
    const notasContexto  = notasDaTurmaEmPeriodo(turma, nivel, periodo);
    const materiaIdsCtx  = [...new Set(notasContexto.map(n => n.materia_disciplinar_id))];

    const materiasDisponiveis = materiaIdsCtx
      .map(id => materiasCache[id] ?? { id, nome: id })
      .sort((a, b) => a.nome.localeCompare(b.nome));

    const notasFiltradas = materiaSelecionada
      ? notasContexto.filter(n => n.materia_disciplinar_id === materiaSelecionada)
      : [];

    const academiaLabel = academiaAtual
      ? `${academiaAtual.nome} · `
      : "";

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {academiaLabel}Turma {turma.codigo_turma} · {labelNivel(nivel)} · {PERIODOS_LABEL[periodo] ?? periodo} · {(anoLetivoSelecionado || "").replace("_", "/")}
          </h2>
        </div>

        {materiasDisponiveis.length === 0 && !carregandoMaterias ? (
          <div className="text-center py-10 text-gray-400">
            <Icon icon="mdi:book-outline" width={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma nota registada neste período.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {materiaSelecionada
                  ? `Notas de ${materiasCache[materiaSelecionada]?.nome ?? materiaSelecionada}`
                  : "Selecione uma matéria:"}
              </p>
              {!materiaSelecionada && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Clique numa matéria abaixo para ver as notas
                </p>
              )}
            </div>
            {carregandoMaterias && materiasDisponiveis.every(m => m.nome === m.id) ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-500" />
                Carregando matérias...
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {materiasDisponiveis.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMateriaSelecionada(prev => prev === m.id ? null : m.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                      materiaSelecionada === m.id
                        ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400"
                    }`}
                  >
                    {m.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {materiaSelecionada ? (
          usarTabelaSuperior
            ? <TabelaNotasSuperior notas={notasFiltradas} estudantes={estudantes} codigosTurma={codigosTurma} />
            : <TabelaNotasEscolar  notas={notasFiltradas} estudantes={estudantes} codigosTurma={codigosTurma} />
        ) : (
          materiasDisponiveis.length > 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-4">
              Selecione uma matéria acima para ver as notas.
            </p>
          )
        )}
      </div>
    );
  }

  // ── render sub-layer da academia ─────────────────────────────────────────────

  function renderAcadLayer() {
    const al = acadLayer;

    if (carregandoNotas) return <LoadingSpinner message="Carregando notas..." />;

    // misto: escolha de nível
    if (al.mode === "misto" && al.type === "choose") return (
      <div className="grid gap-3 sm:grid-cols-2">
        <CardBtn icon="mdi:school"         title="Ensino Fundamental" subtitle="1º ao 9º Ano"  onClick={() => setAcadLayer({ mode: "fund", type: "anos" })} />
        <CardBtn icon="mdi:book-education" title="Ensino Médio"       subtitle="1º ao 4º Médio" onClick={() => setAcadLayer({ mode: "sup", type: "cursos" })} />
      </div>
    );

    // ── FUNDAMENTAL ────────────────────────────────────────────────────────────

    if (al.mode === "fund" && al.type === "anos") return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Anos Académicos — Ensino Fundamental</h2>
        {!anoLetivoSelecionado ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {loadingAnos
              ? <LoadingSpinner message="Carregando anos letivos..." />
              : anosLetivosDisponiveis.length === 0
                ? <p className="text-sm text-gray-400 col-span-full text-center py-8">Nenhum ano letivo encontrado.</p>
                : anosLetivosDisponiveis.map((ano: string) => (
                  <CardBtn
                    key={ano}
                    icon="mdi:calendar-school"
                    title={`Ano Letivo ${ano.replace("_", "/")}`}
                    subtitle="Entrar para ver anos académicos"
                    onClick={() => setAnoLetivoSelecionado(ano)}
                  />
                ))
            }
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium border border-brand-200 dark:border-brand-800">
                Ano letivo {anoLetivoSelecionado.replace("_", "/")}
              </span>
            </div>
            {niveisFundamentais.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Icon icon="mdi:school-outline" width={48} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Nenhum nível fundamental configurado nesta academia.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {niveisFundamentais.map(nivel => (
                  <CardBtn
                    key={nivel}
                    icon="mdi:numeric"
                    title={labelNivel(nivel)}
                    subtitle={`${turmasPorNivel(nivel).length} turma(s) ativa(s)`}
                    onClick={() => setAcadLayer({ mode: "fund", type: "turmas", nivel })}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );

    if (al.mode === "fund" && al.type === "turmas") {
      const ts = turmasPorNivel(al.nivel);
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labelNivel(al.nivel)}</h2>
          {ts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Icon icon="mdi:account-group-outline" width={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma turma ativa para este nível.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {ts.map(t => (
                <CardBtn
                  key={t.id ?? t.codigo_turma}
                  icon="mdi:account-group"
                  title={t.codigo_turma}
                  subtitle={`${codigosTurmaDoAnoLetivo(t, anoLetivoSelecionado).length} estudante(s) · ${t.turno}`}
                  onClick={async () => {
                    await carregarNotasDosEstudantesDaTurma(t);
                    setAcadLayer({ mode: "fund", type: "periodos", nivel: al.nivel, turma: t });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    if (al.mode === "fund" && al.type === "periodos") {
      const { nivel, turma } = al;
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Turma {turma.codigo_turma}</h2>
          <p className="text-sm text-gray-500">{labelNivel(nivel)}</p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {PERIODOS_ESCOLA.map(p => (
              <CardBtn
                key={p.value}
                icon="mdi:clipboard-text-clock-outline"
                title={p.label}
                subtitle="Ver notas"
                onClick={() => setAcadLayer({ mode: "fund", type: "notas", nivel, turma, periodo: p.value })}
              />
            ))}
          </div>
        </div>
      );
    }

    if (al.mode === "fund" && al.type === "notas") {
      const { nivel, turma, periodo } = al;
      return renderNotasLayer(nivel, turma, periodo, false);
    }

    // ── SUPERIOR ───────────────────────────────────────────────────────────────

    if (al.mode === "sup" && al.type === "cursos") return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cursos</h2>
        {cursos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Icon icon="mdi:book-open-outline" width={48} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum curso ativo.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {cursos.map(c => (
              <CardBtn
                key={c.id}
                icon="mdi:book-open-variant"
                title={c.nome}
                subtitle={`${c.anos_academicos?.length ?? 0} ano(s)`}
                onClick={() => setAcadLayer({ mode: "sup", type: "anos", curso: c })}
              />
            ))}
          </div>
        )}
      </div>
    );

    if (al.mode === "sup" && al.type === "anos") {
      const { curso } = al;
      const anos      = anosDosCurso(curso);
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{curso.nome}</h2>
          {!anoLetivoSelecionado ? (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {loadingAnos
                ? <LoadingSpinner message="Carregando anos letivos..." />
                : anosLetivosDisponiveis.length === 0
                  ? <p className="text-sm text-gray-400 col-span-full text-center py-8">Nenhum ano letivo encontrado.</p>
                  : anosLetivosDisponiveis.map((ano: string) => (
                    <CardBtn
                      key={ano}
                      icon="mdi:calendar-school"
                      title={`Ano Letivo ${ano.replace("_", "/")}`}
                      subtitle="Entrar para ver anos académicos"
                      onClick={() => setAnoLetivoSelecionado(ano)}
                    />
                  ))
              }
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium border border-brand-200 dark:border-brand-800">
                  Ano letivo {anoLetivoSelecionado.replace("_", "/")}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {anos.map(nivel => (
                  <CardBtn
                    key={nivel}
                    icon="mdi:calendar-school"
                    title={labelNivel(nivel)}
                    subtitle={`${turmasPorCurso(curso.id).filter(t => t.nivel === nivel).length} turma(s)`}
                    onClick={() => setAcadLayer({ mode: "sup", type: "turmas", curso, nivel })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (al.mode === "sup" && al.type === "turmas") {
      const { curso, nivel } = al;
      const ts               = turmasPorCurso(curso.id).filter(t => t.nivel === nivel);
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labelNivel(nivel)}</h2>
          {ts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Icon icon="mdi:account-group-outline" width={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma turma ativa para este nível neste curso.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {ts.map(t => (
                <CardBtn
                  key={t.id ?? t.codigo_turma}
                  icon="mdi:account-group"
                  title={t.codigo_turma}
                  subtitle={`${codigosTurmaDoAnoLetivo(t, anoLetivoSelecionado).length} estudante(s)`}
                  onClick={async () => {
                    await carregarNotasDosEstudantesDaTurma(t);
                    setAcadLayer({ mode: "sup", type: "periodos", curso, nivel, turma: t });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    if (al.mode === "sup" && al.type === "periodos") {
      const { curso, nivel, turma } = al;
      const periodosDisponiveis     = curso.periodos?.length
        ? curso.periodos.map(v => ({ label: PERIODOS_LABEL[v] ?? v, value: v }))
        : PERIODOS_SUPERIOR;
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Turma {turma.codigo_turma}</h2>
          <p className="text-sm text-gray-500">{labelNivel(nivel)} · {curso.nome}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {periodosDisponiveis.map(p => (
              <CardBtn
                key={p.value}
                icon="mdi:clipboard-text-clock-outline"
                title={p.label}
                subtitle="Ver notas"
                onClick={() => setAcadLayer({ mode: "sup", type: "notas", curso, nivel, turma, periodo: p.value })}
              />
            ))}
          </div>
        </div>
      );
    }

    if (al.mode === "sup" && al.type === "notas") {
      const { nivel, turma, periodo } = al;
      return renderNotasLayer(nivel, turma, periodo, true);
    }

    return null;
  }

  // ── render principal ─────────────────────────────────────────────────────────

  const BotaoVoltar = canGoBack() ? (
    <button
      onClick={goBack}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-colors mb-4"
    >
      <Icon icon="mdi:arrow-left" width={16} />
      Voltar
    </button>
  ) : null;

  if (loadingAcads) return <LoadingSpinner message="Carregando academias..." />;

  // ── Províncias ──────────────────────────────────────────────────────────────
  if (layer.type === "provincias") return (
    <div className="space-y-6">
      {alert && (
        <Alert variant={alert.variant} title={alert.variant === "success" ? "Sucesso" : "Erro"} message={alert.message} />
      )}
      {BotaoVoltar}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notas do Sistema</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecione uma província para explorar as notas</p>
      </div>
      {provincias.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Icon icon="mdi:map-marker-outline" width={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma academia registrada.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {provincias.map(prov => {
            const acads = academias.filter(a => a.provincia?.toUpperCase() === prov.toUpperCase());
            return (
              <CardBtn
                key={prov}
                icon="mdi:map-marker-radius"
                title={nomeProvinciaDeCodigo(prov)}
                subtitle={`${acads.length} academia(s)`}
                onClick={() => setLayer({ type: "academias", provincia: prov })}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Academias ───────────────────────────────────────────────────────────────
  if (layer.type === "academias") {
    const acads = academias.filter(a => a.provincia?.toUpperCase() === layer.provincia.toUpperCase());
    return (
      <div className="space-y-6">
        {alert && (
          <Alert variant={alert.variant} title={alert.variant === "success" ? "Sucesso" : "Erro"} message={alert.message} />
        )}
        {BotaoVoltar}
        <Breadcrumb crumbs={buildCrumbs()} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Província de {nomeProvinciaDeCodigo(layer.provincia)}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{acads.length} academia(s)</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {acads.map(a => (
            <CardBtn
              key={a.codigo_academia}
              icon={a.nivel === "superior" ? "mdi:university" : "mdi:school"}
              title={a.nome}
              subtitle={a.codigo_academia}
              badge={a.nivel}
              onClick={() => entrarNaAcademia(a)}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Academia root (espelha NotasAcademia) ────────────────────────────────────
  if (layer.type === "academia_root") {
    const { academia } = layer;
    return (
      <div className="space-y-6">
        {alert && (
          <Alert variant={alert.variant} title={alert.variant === "success" ? "Sucesso" : "Erro"} message={alert.message} />
        )}
        {BotaoVoltar}
        <Breadcrumb crumbs={buildCrumbs()} />

        {/* Cabeçalho da academia */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{academia.nome}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {academia.codigo_academia} · {turmasAtivas.length} turma(s) ativa(s) · {estudantes.length} estudante(s) · {todasNotas.length} nota(s)
            </p>
          </div>
        </div>

        {renderAcadLayer()}
      </div>
    );
  }

  return null;
}
