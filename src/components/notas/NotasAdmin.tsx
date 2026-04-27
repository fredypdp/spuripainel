// src/components/notas/NotasAdmin.tsx
"use client"
import { useState, useEffect, useMemo } from "react";
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

// ─── tipos ────────────────────────────────────────────────────────────────────

type AcadInfo = {
  codigo_academia: string;
  nome:            string;
  provincia:       string;
  nivel:           string;
  nivel_escolar?:  string;
  anos_academicos?: string[];
  status:          string;
};

// Camada de navegação global
type NavLayer =
  | { type: "provincias" }
  | { type: "academias"; provincia: string }
  | { type: "academia";  academia: AcadInfo };

// Camada interna (igual a NotasAcademia)
type LayerFund =
  | { mode: "fund"; type: "anos" }
  | { mode: "fund"; type: "turmas";   nivel: string }
  | { mode: "fund"; type: "periodos"; nivel: string; turma: Turma }
  | { mode: "fund"; type: "notas";    nivel: string; turma: Turma; periodo: string };

type LayerSup =
  | { mode: "sup"; type: "cursos" }
  | { mode: "sup"; type: "anos";     curso: Curso }
  | { mode: "sup"; type: "turmas";   curso: Curso; nivel: string }
  | { mode: "sup"; type: "periodos"; curso: Curso; nivel: string; turma: Turma }
  | { mode: "sup"; type: "notas";    curso: Curso; nivel: string; turma: Turma; periodo: string };

type LayerMisto =
  | { mode: "misto"; type: "choose" }
  | LayerFund
  | LayerSup;

type AcadLayer = LayerFund | LayerSup | LayerMisto;

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
              <button onClick={c.onClick} className="text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors">
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
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

// ─── Tabela escolar ───────────────────────────────────────────────────────────

function TabelaNotasEscolar({ notas, estudantes, codigosTurma }: {
  notas: Nota[]; estudantes: EstudanteDetalhado[]; codigosTurma: string[];
}) {
  if (codigosTurma.length === 0)
    return (
      <div className="text-center py-10 text-gray-400">
        <Icon icon="mdi:notebook-outline" width={40} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nenhum estudante encontrado nesta turma.</p>
      </div>
    );

  const porEst = new Map<string, Nota[]>();
  notas.forEach(n => {
    const k = normCodigo(n.codigo_estudante);
    if (!porEst.has(k)) porEst.set(k, []);
    porEst.get(k)!.push(n);
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm min-w-[500px]">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Nome</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Código</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Nota do Professor</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Nota Escola</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {[...codigosTurma]
            .map(codigo => {
              const ne   = porEst.get(codigo) ?? [];
              const est  = estudantes.find(e => normCodigo(e.codigo_estudante) === codigo);
              const nome = est?.nome ?? ne[0]?.estudante_nome ?? "-";
              return { codigo, nome, notaProf: ne.find(n => n.categoria === "nota_professor"), notaEsc: ne.find(n => n.categoria === "nota_escola") };
            })
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" }))
            .map(({ codigo, nome, notaProf, notaEsc }) => (
              <tr key={codigo} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{nome}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{codigo.toUpperCase()}</td>
                <td className={`px-4 py-3 text-right font-bold ${notaProf ? corNota(notaProf.nota) : "text-gray-300 dark:text-gray-600"}`}>{notaProf != null ? notaProf.nota : "—"}</td>
                <td className={`px-4 py-3 text-right font-bold ${notaEsc  ? corNota(notaEsc.nota)  : "text-gray-300 dark:text-gray-600"}`}>{notaEsc  != null ? notaEsc.nota  : "—"}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tabela superior ──────────────────────────────────────────────────────────

function TabelaNotasSuperior({ notas, estudantes, codigosTurma }: {
  notas: Nota[]; estudantes: EstudanteDetalhado[]; codigosTurma: string[];
}) {
  if (codigosTurma.length === 0)
    return (
      <div className="text-center py-10 text-gray-400">
        <Icon icon="mdi:notebook-outline" width={40} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nenhum estudante encontrado nesta turma.</p>
      </div>
    );

  const porEst = new Map<string, Nota[]>();
  notas.forEach(n => {
    const k = normCodigo(n.codigo_estudante);
    if (!porEst.has(k)) porEst.set(k, []);
    porEst.get(k)!.push(n);
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm min-w-[600px]">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Nome</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Código</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">PP1</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">PP2</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Exame</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {[...codigosTurma]
            .map(codigo => {
              const ne   = porEst.get(codigo) ?? [];
              const est  = estudantes.find(e => normCodigo(e.codigo_estudante) === codigo);
              const nome = est?.nome ?? ne[0]?.estudante_nome ?? "-";
              return { codigo, nome, pp1: ne.find(n => n.categoria === "nota_pp1"), pp2: ne.find(n => n.categoria === "nota_pp2"), exame: ne.find(n => n.categoria === "nota_exame") };
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

  // navegação global
  const [navLayer, setNavLayer] = useState<NavLayer>({ type: "provincias" });
  const [alert, setAlert]       = useState<{ variant: "success" | "error"; message: string } | null>(null);

  // estado da academia seleccionada
  const [acadLayer, setAcadLayer]                               = useState<AcadLayer>({ mode: "fund", type: "anos" });
  const [anoLetivoSelecionado, setAnoLetivoSelecionado]         = useState("");
  const [notasPorEstudante, setNotasPorEstudante]               = useState<Record<string, Nota[]>>({});
  const [carregandoNotas, setCarregandoNotas]                   = useState(false);
  const [materiaSelecionada, setMateriaSelecionada]             = useState<string | null>(null);
  const [materiasCache, setMateriasCache]                       = useState<Record<string, { id: string; nome: string }>>({});
  const [carregandoMaterias, setCarregandoMaterias]             = useState(false);

  // APIs
  const { data: academiasData, loading: loadingAcads, execute: fetchAcademias } =
    useApi(consultasService.listarAcademias);

  const { data: dataTurmas,     loading: loadingTurmas, execute: fetchTurmas     } = useApi(academiaService.listarTurmas);
  const { data: dataCursos,     loading: loadingCursos, execute: fetchCursos     } = useApi(academiaService.listarCursos);
  const { data: dataEstudantes, loading: loadingEstud,  execute: fetchEstudantes } = useApi(consultasService.listarEstudantes);
  const { data: dataMaterias,                           execute: fetchMaterias   } = useApi(academiaService.listarMaterias);
  const { data: dataAnosLetivos, loading: loadingAnos,  execute: fetchAnosLetivos} = useApi(academiaService.listarAnosLetivosLista);
  const { data: dataAnoLetivo,                          execute: fetchAnoLetivo  } = useApi(academiaService.getAnoLetivo);

  useEffect(() => {
    fetchAcademias({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setMateriaSelecionada(null);
  }, [acadLayer]);

  // dados derivados
  const academias: AcadInfo[] = useMemo(() =>
    ((academiasData as any)?.academias ?? []).map((a: any) => ({
      codigo_academia: a.codigo_academia,
      nome:            a.nome,
      provincia:       a.provincia,
      nivel:           a.nivel,
      nivel_escolar:   a.nivel_escolar,
      anos_academicos: a.anos_academicos ?? [],
      status:          a.status,
    })),
    [academiasData]);

  const provincias = useMemo(() =>
    Array.from(new Set(academias.map(a => a.provincia?.toUpperCase()).filter(Boolean)))
      .sort((a, b) => nomeProvinciaDeCodigo(a).localeCompare(nomeProvinciaDeCodigo(b))),
    [academias]);

  const turmas: Turma[]                  = useMemo(() => (dataTurmas    as any)?.turmas   ?? [], [dataTurmas]);
  const cursos: Curso[]                  = useMemo(() => (dataCursos    as any)?.cursos?.filter((c: any) => c.status === "ativo") ?? [], [dataCursos]);
  const estudantes: EstudanteDetalhado[] = useMemo(() => (dataEstudantes as any)?.estudantes ?? [], [dataEstudantes]);
  const todasNotas                       = useMemo(() => Object.values(notasPorEstudante).flat(), [notasPorEstudante]);
  const turmasAtivas: Turma[]            = useMemo(() => turmas.filter(turmaAtiva), [turmas]);

  const anosLetivosDisponiveis: string[] = useMemo(() => (
    ((dataAnosLetivos as any)?.anos_letivos_lista ?? [])
      .map((x: any) => x?.ano_letivo)
      .filter(Boolean)
      .sort()
  ), [dataAnosLetivos]);

  const anoLectivo = (dataAnoLetivo as any)?.ano_letivo ?? "";

  const academiaAtual: AcadInfo | null = navLayer.type === "academia" ? navLayer.academia : null;
  const isSuperior    = academiaAtual?.nivel === "superior";
  const nivelEscolar  = academiaAtual?.nivel_escolar ?? "fundamental";
  const isMisto       = !isSuperior && nivelEscolar === "misto";

  // Níveis fundamentais: derivados das turmas carregadas + fallback para anos_academicos
  const niveisFundamentais = useMemo(() => {
    if (!academiaAtual) return [];
    const anosAcademia = academiaAtual.anos_academicos ?? [];
    // Preferir turmas já carregadas da academia seleccionada
    const niveisComTurmas = [...new Set(turmasAtivas.map(t => t.nivel).filter(n => n.includes("fundamental")))];
    if (niveisComTurmas.length > 0) return sortAnos(niveisComTurmas);
    // Fallback: anos_academicos filtrados
    const base = anosAcademia.filter(a => a.includes("fundamental"));
    return sortAnos(base);
  }, [turmasAtivas, academiaAtual]);

  // pré-selecionar primeira matéria quando o cache estiver pronto
  useEffect(() => {
    if (acadLayer.type !== "notas") return;
    if (materiaSelecionada) return;
    const l = acadLayer as any;
    const anoFiltro = anoLetivoSelecionado || anoLectivo;
    const codsHistorico: string[] = anoFiltro ? (l.turma.historico_estudantes_ano_letivo?.[anoFiltro] ?? []) : [];
    const codsOrigem: string[]    = codsHistorico.length > 0 ? codsHistorico : (l.turma.estudantes ?? []);
    const codsNorm = [...new Set(codsOrigem.map((c: string) => normCodigo(c)).filter(Boolean))];
    const notasCtx: Nota[] = codsNorm
      .flatMap((c: string) => notasPorEstudante[c] ?? [])
      .filter((n: Nota) => (!anoFiltro || n.ano_lectivo === anoFiltro) && n.ano_academico === l.nivel && n.periodo === l.periodo);
    const ids = [...new Set(notasCtx.map((n: Nota) => n.materia_disciplinar_id))];
    if (ids.length === 0) return;
    const todosResolvidos = ids.every(id => materiasCache[id] && materiasCache[id].nome !== id);
    if (!todosResolvidos) return;
    const sorted = ids.map(id => materiasCache[id]).sort((a, b) => a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" }));
    if (sorted.length > 0) setMateriaSelecionada(sorted[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acadLayer, materiasCache, notasPorEstudante]);

  // buscar detalhes das matérias via GET /academia/materia/:id?codigo_academia=...
  useEffect(() => {
    if (acadLayer.type !== "notas") return;
    const l = acadLayer as any;
    const anoFiltro = anoLetivoSelecionado || anoLectivo;
    const codsHistorico: string[] = anoFiltro ? (l.turma.historico_estudantes_ano_letivo?.[anoFiltro] ?? []) : [];
    const codsOrigem: string[]    = codsHistorico.length > 0 ? codsHistorico : (l.turma.estudantes ?? []);
    const codsNorm = [...new Set(codsOrigem.map((c: string) => normCodigo(c)).filter(Boolean))];
    const notasCtx: Nota[] = codsNorm
      .flatMap((c: string) => notasPorEstudante[c] ?? [])
      .filter((n: Nota) => (!anoFiltro || n.ano_lectivo === anoFiltro) && n.ano_academico === l.nivel && n.periodo === l.periodo);
    const ids: string[]     = [...new Set(notasCtx.map((n: Nota) => n.materia_disciplinar_id))];
    const missing: string[] = ids.filter(id => !materiasCache[id]);
    if (missing.length === 0) return;

    setCarregandoMaterias(true);
    Promise.all(
      missing.map(id => academiaService.getMateria(id, { codigo_academia: academiaAtual?.codigo_academia, token }))
    )
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
  }, [acadLayer, notasPorEstudante, anoLetivoSelecionado, anoLectivo]);

  // ─── helpers internos ───────────────────────────────────────────────────────

  function showAlert(variant: "success" | "error", message: string) {
    setAlert({ variant, message });
    setTimeout(() => setAlert(null), 4000);
  }

  function codigosTurmaDoAnoLetivo(turma: Turma, anoLetivo?: string): string[] {
    const hist   = anoLetivo ? (turma.historico_estudantes_ano_letivo?.[anoLetivo] ?? []) : [];
    const origem = hist.length > 0 ? hist : turma.estudantes;
    return Array.from(new Set(origem.map(normCodigo).filter(Boolean)));
  }

  function codigoOriginalDaTurma(turma: Turma, codigoNorm: string, anoLetivo?: string): string {
    const hist   = anoLetivo ? (turma.historico_estudantes_ano_letivo?.[anoLetivo] ?? []) : [];
    const origem = hist.length > 0 ? hist : turma.estudantes;
    return origem.find(c => normCodigo(c) === codigoNorm) ?? codigoNorm;
  }

  async function carregarNotasDosEstudantesDaTurma(turma: Turma, force = false) {
    const anoFiltro         = anoLetivoSelecionado || anoLectivo || undefined;
    const codsNorm          = codigosTurmaDoAnoLetivo(turma, anoFiltro);
    const codsParaBuscar    = force ? codsNorm : codsNorm.filter(c => !(c in notasPorEstudante));
    if (codsParaBuscar.length === 0) return;

    setCarregandoNotas(true);
    try {
      const resultados = await Promise.all(
        codsParaBuscar.map(async codigoNorm => {
          const codigoOriginal = codigoOriginalDaTurma(turma, codigoNorm, anoFiltro);
          const resposta = await consultasService.notasEstudante(codigoOriginal, { token });
          return { codigoNorm, notas: resposta?.notas ?? [] };
        })
      );
      setNotasPorEstudante(prev => {
        const next = { ...prev };
        resultados.forEach(({ codigoNorm, notas }) => { next[codigoNorm] = notas; });
        return next;
      });
    } catch { /* erro silencioso */ }
    finally { setCarregandoNotas(false); }
  }

  function notasDaTurmaEmPeriodo(turma: Turma, nivel: string, periodo: string): Nota[] {
    const anoFiltro    = anoLetivoSelecionado || anoLectivo;
    const cods         = codigosTurmaDoAnoLetivo(turma, anoFiltro);
    const notasDaTurma = cods.flatMap(c => notasPorEstudante[c] ?? []);
    const filtAno      = anoFiltro ? notasDaTurma.filter(n => n.ano_lectivo === anoFiltro) : notasDaTurma;
    return filtAno.filter(n => n.ano_academico === nivel && n.periodo === periodo);
  }

  const turmasPorNivel = (nivel: string)   => turmasAtivas.filter(t => t.nivel === nivel);
  const turmasPorCurso = (cursoId: string) => turmasAtivas.filter(t => t.curso_id === cursoId);
  const anosDosCurso   = (c: Curso)        => sortAnos(c.anos_academicos ?? []);

  // ─── entrar na academia: navegação imediata, carregamentos em paralelo ──────

  function entrarNaAcademia(academia: AcadInfo) {
    // Reset
    setAnoLetivoSelecionado("");
    setNotasPorEstudante({});
    setMateriasCache({});
    setMateriaSelecionada(null);

    const isSup  = academia.nivel === "superior";
    const nivelE = academia.nivel_escolar ?? "fundamental";
    const isFund = !isSup && nivelE === "fundamental";
    const isMst  = !isSup && nivelE === "misto";

    const initLayer: AcadLayer =
      isFund ? { mode: "fund", type: "anos" }
      : isMst ? { mode: "misto", type: "choose" }
      : { mode: "sup", type: "cursos" };

    setAcadLayer(initLayer);
    // Navegar imediatamente — spinners cuidam da espera
    setNavLayer({ type: "academia", academia });

    const cod = academia.codigo_academia;
    // Disparar todos os carregamentos sem bloquear
    fetchTurmas({ codigo_academia: cod, token });
    fetchCursos({ codigo_academia: cod, token });
    fetchMaterias({ codigo_academia: cod, token });
    fetchEstudantes(token);
    fetchAnosLetivos({ codigo_academia: cod, token });
    fetchAnoLetivo({ codigo_academia: cod, token });
  }

  // ─── breadcrumbs ─────────────────────────────────────────────────────────────

  function buildCrumbs(): { label: string; onClick?: () => void }[] {
    const goProvs  = () => setNavLayer({ type: "provincias" });
    const goAcads  = () => academiaAtual && setNavLayer({ type: "academias", provincia: academiaAtual.provincia });
    const goInicio = () => setAcadLayer({ mode: "misto", type: "choose" });

    if (navLayer.type === "provincias") return [{ label: "Províncias" }];

    if (navLayer.type === "academias") return [
      { label: "Províncias", onClick: goProvs },
      { label: nomeProvinciaDeCodigo(navLayer.provincia) },
    ];

    // dentro de academia
    const navBase = [
      { label: "Províncias", onClick: goProvs },
      { label: nomeProvinciaDeCodigo(academiaAtual!.provincia), onClick: goAcads },
      { label: academiaAtual!.nome, onClick: () => setAcadLayer(
          isMisto ? { mode: "misto", type: "choose" }
          : isSuperior ? { mode: "sup", type: "cursos" }
          : { mode: "fund", type: "anos" }
        )
      },
    ];

    const al = acadLayer;

    if (al.mode === "misto" && al.type === "choose") return navBase;

    if (al.mode === "fund") {
      const goAnos    = () => setAcadLayer({ mode: "fund", type: "anos" });
      const anosCrumb = { label: isMisto ? "Fundamental" : "Anos", onClick: goAnos };
      const base      = isMisto ? [...navBase, { label: "Início", onClick: goInicio }, anosCrumb] : [...navBase, anosCrumb];
      if (al.type === "anos")     return base;
      if (al.type === "turmas")   return [...base, { label: labelNivel(al.nivel) }];
      if (al.type === "periodos") return [...base,
        { label: labelNivel(al.nivel), onClick: () => setAcadLayer({ mode: "fund", type: "turmas", nivel: al.nivel }) },
        { label: al.turma.codigo_turma },
      ];
      if (al.type === "notas") return [...base,
        { label: labelNivel(al.nivel),  onClick: () => setAcadLayer({ mode: "fund", type: "turmas",   nivel: al.nivel }) },
        { label: al.turma.codigo_turma, onClick: () => setAcadLayer({ mode: "fund", type: "periodos", nivel: al.nivel, turma: al.turma }) },
        { label: PERIODOS_LABEL[al.periodo] ?? al.periodo },
      ];
    }

    if (al.mode === "sup") {
      const goCursos    = () => setAcadLayer({ mode: "sup", type: "cursos" });
      const cursosCrumb = { label: isMisto ? "Médio" : "Cursos", onClick: goCursos };
      const base        = isMisto ? [...navBase, { label: "Início", onClick: goInicio }, cursosCrumb] : [...navBase, cursosCrumb];
      const l = al as any;
      if (al.type === "cursos")   return base;
      if (al.type === "anos")     return [...base, { label: l.curso.nome }];
      if (al.type === "turmas")   return [...base,
        { label: l.curso.nome, onClick: () => setAcadLayer({ mode: "sup", type: "anos", curso: l.curso }) },
        { label: labelNivel(l.nivel) },
      ];
      if (al.type === "periodos") return [...base,
        { label: l.curso.nome,        onClick: () => setAcadLayer({ mode: "sup", type: "anos",    curso: l.curso }) },
        { label: labelNivel(l.nivel), onClick: () => setAcadLayer({ mode: "sup", type: "turmas",  curso: l.curso, nivel: l.nivel }) },
        { label: l.turma.codigo_turma },
      ];
      if (al.type === "notas") return [...base,
        { label: l.curso.nome,              onClick: () => setAcadLayer({ mode: "sup", type: "anos",     curso: l.curso }) },
        { label: labelNivel(l.nivel),        onClick: () => setAcadLayer({ mode: "sup", type: "turmas",   curso: l.curso, nivel: l.nivel }) },
        { label: l.turma.codigo_turma,       onClick: () => setAcadLayer({ mode: "sup", type: "periodos", curso: l.curso, nivel: l.nivel, turma: l.turma }) },
        { label: PERIODOS_LABEL[l.periodo] ?? l.periodo },
      ];
    }

    return navBase;
  }

  // ─── voltar ───────────────────────────────────────────────────────────────────

  function canGoBack(): boolean {
    if (navLayer.type === "provincias") return false;
    return true;
  }

  function goBack() {
    if (navLayer.type === "academias") { setNavLayer({ type: "provincias" }); return; }
    if (navLayer.type !== "academia")  return;

    const prov = academiaAtual!.provincia;
    const al   = acadLayer;

    if (al.mode === "misto" && al.type === "choose") { setNavLayer({ type: "academias", provincia: prov }); return; }

    if (al.type === "anos" && anoLetivoSelecionado) { setAnoLetivoSelecionado(""); return; }

    if (al.mode === "fund") {
      if      (al.type === "anos")     isMisto ? setAcadLayer({ mode: "misto", type: "choose" }) : setNavLayer({ type: "academias", provincia: prov });
      else if (al.type === "turmas")   setAcadLayer({ mode: "fund", type: "anos" });
      else if (al.type === "periodos") setAcadLayer({ mode: "fund", type: "turmas",   nivel: al.nivel });
      else if (al.type === "notas")    setAcadLayer({ mode: "fund", type: "periodos", nivel: al.nivel, turma: al.turma });
      return;
    }
    if (al.mode === "sup") {
      const l = al as any;
      if      (al.type === "cursos")   isMisto ? setAcadLayer({ mode: "misto", type: "choose" }) : setNavLayer({ type: "academias", provincia: prov });
      else if (al.type === "anos")     setAcadLayer({ mode: "sup", type: "cursos" });
      else if (al.type === "turmas")   setAcadLayer({ mode: "sup", type: "anos",    curso: l.curso });
      else if (al.type === "periodos") setAcadLayer({ mode: "sup", type: "turmas",  curso: l.curso, nivel: l.nivel });
      else if (al.type === "notas")    setAcadLayer({ mode: "sup", type: "periodos", curso: l.curso, nivel: l.nivel, turma: l.turma });
      return;
    }
  }

  // ─── seletor de matérias + tabela ────────────────────────────────────────────

  function renderNotasLayer(nivel: string, turma: Turma, periodo: string, usarTabelaSuperior: boolean) {
    const anoFiltro           = anoLetivoSelecionado || anoLectivo;
    const codigosTurma        = codigosTurmaDoAnoLetivo(turma, anoFiltro).filter(Boolean);
    const notasContexto       = notasDaTurmaEmPeriodo(turma, nivel, periodo);
    const materiaIdsCtx       = [...new Set(notasContexto.map(n => n.materia_disciplinar_id))];
    const materiasDisponiveis = materiaIdsCtx
      .map(id => materiasCache[id] ?? { id, nome: id })
      .sort((a, b) => a.nome.localeCompare(b.nome));
    const notasFiltradas = materiaSelecionada
      ? notasContexto.filter(n => n.materia_disciplinar_id === materiaSelecionada)
      : [];

    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Turma {turma.codigo_turma} · {labelNivel(nivel)} · {PERIODOS_LABEL[periodo] ?? periodo} · {(anoFiltro || "").replace("_", "/")}
        </h2>

        {materiasDisponiveis.length === 0 && !carregandoMaterias ? (
          <div className="text-center py-10 text-gray-400">
            <Icon icon="mdi:book-outline" width={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma nota registada neste período.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {materiaSelecionada
                ? `Notas de ${materiasCache[materiaSelecionada]?.nome ?? materiaSelecionada}`
                : "Selecione uma matéria:"}
            </p>
            {!materiaSelecionada && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Clique numa matéria abaixo para ver as notas</p>
            )}
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

  // ─── renderAcadLayer ─────────────────────────────────────────────────────────

  function renderAcadLayer() {
    const crumbs    = buildCrumbs();
    const BotaoVoltar = canGoBack() ? (
      <button
        onClick={goBack}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-colors mb-4"
      >
        <Icon icon="mdi:arrow-left" width={16} /> Voltar
      </button>
    ) : null;

    if (carregandoNotas) return (
      <div className="space-y-4">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <LoadingSpinner message="Carregando notas..." />
      </div>
    );

    const al = acadLayer;

    // misto
    if (al.mode === "misto" && al.type === "choose") return (
      <div className="space-y-6">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notas</h2>
          <p className="text-sm text-gray-500 mt-1">Selecione o nível de ensino</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CardBtn icon="mdi:school"         title="Ensino Fundamental" subtitle="1º ao 9º Ano"   onClick={() => setAcadLayer({ mode: "fund", type: "anos" })} />
          <CardBtn icon="mdi:book-education" title="Ensino Médio"       subtitle="1º ao 4º Médio" onClick={() => setAcadLayer({ mode: "sup",  type: "cursos" })} />
        </div>
      </div>
    );

    // fundamental: anos letivos / níveis
    if (al.mode === "fund" && al.type === "anos") return (
      <div className="space-y-4">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Anos Letivos — Ensino Fundamental</h2>
        {!anoLetivoSelecionado ? (
          loadingAnos ? <LoadingSpinner message="Carregando anos letivos..." /> : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {anosLetivosDisponiveis.length === 0
                ? <p className="text-sm text-gray-400 col-span-full text-center py-8">Nenhum ano letivo encontrado.</p>
                : anosLetivosDisponiveis.map((ano: string) => (
                  <CardBtn key={ano} icon="mdi:calendar-school" title={`Ano Letivo ${ano.replace("_", "/")}`} subtitle="Entrar para ver anos letivos" onClick={() => setAnoLetivoSelecionado(ano)} />
                ))
              }
            </div>
          )
        ) : (
          <>
            <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium border border-brand-200 dark:border-brand-800">
              Ano letivo {anoLetivoSelecionado.replace("_", "/")}
            </span>
            {loadingTurmas ? <LoadingSpinner message="Carregando turmas..." /> :
              niveisFundamentais.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Icon icon="mdi:school-outline" width={48} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Nenhum nível fundamental configurado nesta academia.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {niveisFundamentais.map(nivel => (
                    <CardBtn key={nivel} icon="mdi:numeric" title={labelNivel(nivel)} subtitle={`${turmasPorNivel(nivel).length} turma(s) ativa(s)`} onClick={() => setAcadLayer({ mode: "fund", type: "turmas", nivel })} />
                  ))}
                </div>
              )}
          </>
        )}
      </div>
    );

    // fundamental: turmas
    if (al.mode === "fund" && al.type === "turmas") {
      const ts = turmasPorNivel(al.nivel);
      return (
        <div className="space-y-4">
          {BotaoVoltar}
          <Breadcrumb crumbs={crumbs} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labelNivel(al.nivel)}</h2>
          {loadingTurmas ? <LoadingSpinner message="Carregando turmas..." /> :
            ts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Icon icon="mdi:account-group-outline" width={48} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Nenhuma turma ativa para este nível.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {ts.map(t => (
                  <CardBtn key={t.id ?? t.codigo_turma} icon="mdi:account-group" title={t.codigo_turma}
                    subtitle={`${codigosTurmaDoAnoLetivo(t, anoLetivoSelecionado || anoLectivo).length} estudante(s) · ${t.turno}`}
                    onClick={async () => { await carregarNotasDosEstudantesDaTurma(t); setAcadLayer({ mode: "fund", type: "periodos", nivel: al.nivel, turma: t }); }}
                  />
                ))}
              </div>
            )}
        </div>
      );
    }

    // fundamental: períodos
    if (al.mode === "fund" && al.type === "periodos") {
      const { nivel, turma } = al;
      return (
        <div className="space-y-4">
          {BotaoVoltar}
          <Breadcrumb crumbs={crumbs} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Turma {turma.codigo_turma}</h2>
          <p className="text-sm text-gray-500">{labelNivel(nivel)}</p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {PERIODOS_ESCOLA.map(p => (
              <CardBtn key={p.value} icon="mdi:clipboard-text-clock-outline" title={p.label} subtitle="Ver notas"
                onClick={() => setAcadLayer({ mode: "fund", type: "notas", nivel, turma, periodo: p.value })}
              />
            ))}
          </div>
        </div>
      );
    }

    // fundamental: notas
    if (al.mode === "fund" && al.type === "notas") return (
      <div className="space-y-4">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        {renderNotasLayer(al.nivel, al.turma, al.periodo, false)}
      </div>
    );

    // superior: cursos
    if (al.mode === "sup" && al.type === "cursos") return (
      <div className="space-y-4">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cursos</h2>
        {loadingCursos ? <LoadingSpinner message="Carregando cursos..." /> :
          cursos.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Icon icon="mdi:book-open-outline" width={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhum curso ativo.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {cursos.map(c => (
                <CardBtn key={c.id} icon="mdi:book-open-variant" title={c.nome} subtitle={`${c.anos_academicos?.length ?? 0} ano(s)`}
                  onClick={() => setAcadLayer({ mode: "sup", type: "anos", curso: c })}
                />
              ))}
            </div>
          )}
      </div>
    );

    // superior: anos
    if (al.mode === "sup" && al.type === "anos") {
      const { curso } = al;
      const anos      = anosDosCurso(curso);
      return (
        <div className="space-y-4">
          {BotaoVoltar}
          <Breadcrumb crumbs={crumbs} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{curso.nome}</h2>
          {!anoLetivoSelecionado ? (
            loadingAnos ? <LoadingSpinner message="Carregando anos letivos..." /> : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {anosLetivosDisponiveis.length === 0
                  ? <p className="text-sm text-gray-400 col-span-full text-center py-8">Nenhum ano letivo encontrado.</p>
                  : anosLetivosDisponiveis.map((ano: string) => (
                    <CardBtn key={ano} icon="mdi:calendar-school" title={`Ano Letivo ${ano.replace("_", "/")}`} subtitle="Entrar para ver anos letivos" onClick={() => setAnoLetivoSelecionado(ano)} />
                  ))
                }
              </div>
            )
          ) : (
            <div className="space-y-3">
              <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium border border-brand-200 dark:border-brand-800">
                Ano letivo {anoLetivoSelecionado.replace("_", "/")}
              </span>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {anos.map(nivel => (
                  <CardBtn key={nivel} icon="mdi:calendar-school" title={labelNivel(nivel)} subtitle={`${turmasPorCurso(curso.id).filter(t => t.nivel === nivel).length} turma(s)`}
                    onClick={() => setAcadLayer({ mode: "sup", type: "turmas", curso, nivel })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // superior: turmas
    if (al.mode === "sup" && al.type === "turmas") {
      const { curso, nivel } = al;
      const ts = turmasPorCurso(curso.id).filter(t => t.nivel === nivel);
      return (
        <div className="space-y-4">
          {BotaoVoltar}
          <Breadcrumb crumbs={crumbs} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labelNivel(nivel)}</h2>
          {loadingTurmas ? <LoadingSpinner message="Carregando turmas..." /> :
            ts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Icon icon="mdi:account-group-outline" width={48} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Nenhuma turma ativa para este nível neste curso.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {ts.map(t => (
                  <CardBtn key={t.id ?? t.codigo_turma} icon="mdi:account-group" title={t.codigo_turma}
                    subtitle={`${codigosTurmaDoAnoLetivo(t, anoLetivoSelecionado || anoLectivo).length} estudante(s)`}
                    onClick={async () => { await carregarNotasDosEstudantesDaTurma(t); setAcadLayer({ mode: "sup", type: "periodos", curso, nivel, turma: t }); }}
                  />
                ))}
              </div>
            )}
        </div>
      );
    }

    // superior: períodos
    if (al.mode === "sup" && al.type === "periodos") {
      const { curso, nivel, turma } = al;
      const periodos = curso.periodos?.length
        ? curso.periodos.map(v => ({ label: PERIODOS_LABEL[v] ?? v, value: v }))
        : PERIODOS_SUPERIOR;
      return (
        <div className="space-y-4">
          {BotaoVoltar}
          <Breadcrumb crumbs={crumbs} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Turma {turma.codigo_turma}</h2>
          <p className="text-sm text-gray-500">{labelNivel(nivel)} · {curso.nome}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {periodos.map(p => (
              <CardBtn key={p.value} icon="mdi:clipboard-text-clock-outline" title={p.label} subtitle="Ver notas"
                onClick={() => setAcadLayer({ mode: "sup", type: "notas", curso, nivel, turma, periodo: p.value })}
              />
            ))}
          </div>
        </div>
      );
    }

    // superior: notas
    if (al.mode === "sup" && al.type === "notas") return (
      <div className="space-y-4">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        {renderNotasLayer(al.nivel, al.turma, al.periodo, true)}
      </div>
    );

    return null;
  }

  // ─── render principal ─────────────────────────────────────────────────────────

  if (loadingAcads) return <LoadingSpinner message="Carregando academias..." />;

  // províncias
  if (navLayer.type === "provincias") return (
    <div className="space-y-6">
      {alert && <Alert variant={alert.variant} title={alert.variant === "success" ? "Sucesso" : "Erro"} message={alert.message} />}
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
              <CardBtn key={prov} icon="mdi:map-marker-radius" title={nomeProvinciaDeCodigo(prov)} subtitle={`${acads.length} academia(s)`}
                onClick={() => setNavLayer({ type: "academias", provincia: prov })}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  // academias
  if (navLayer.type === "academias") {
    const acads = academias.filter(a => a.provincia?.toUpperCase() === navLayer.provincia.toUpperCase());
    return (
      <div className="space-y-6">
        {alert && <Alert variant={alert.variant} title={alert.variant === "success" ? "Sucesso" : "Erro"} message={alert.message} />}
        <button onClick={() => setNavLayer({ type: "provincias" })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-colors"
        >
          <Icon icon="mdi:arrow-left" width={16} /> Voltar
        </button>
        <Breadcrumb crumbs={buildCrumbs()} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Província de {nomeProvinciaDeCodigo(navLayer.provincia)}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{acads.length} academia(s)</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {acads.map(a => (
            <CardBtn key={a.codigo_academia}
              icon={a.nivel === "superior" ? "mdi:university" : "mdi:school"}
              title={a.nome} subtitle={a.codigo_academia} badge={a.nivel}
              onClick={() => entrarNaAcademia(a)}
            />
          ))}
        </div>
      </div>
    );
  }

  // academia seleccionada
  if (navLayer.type === "academia") {
    const { academia } = navLayer;
    return (
      <div className="space-y-6">
        {alert && <Alert variant={alert.variant} title={alert.variant === "success" ? "Sucesso" : "Erro"} message={alert.message} />}

        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{academia.nome}</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {academia.codigo_academia}
            {!loadingTurmas  && turmasAtivas.length > 0  && ` · ${turmasAtivas.length} turma(s) ativa(s)`}
            {!loadingEstud   && estudantes.length > 0    && ` · ${estudantes.length} estudante(s)`}
            {todasNotas.length > 0                       && ` · ${todasNotas.length} nota(s) carregada(s)`}
          </p>
        </div>

        {renderAcadLayer()}
      </div>
    );
  }

  return null;
}
