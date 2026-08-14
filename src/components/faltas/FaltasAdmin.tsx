// src/components/faltas/FaltasAdmin.tsx
"use client"
import { useState, useEffect, useMemo } from "react";
import { useApi, consultasService, academiaService, tokenStorage } from "@/lib/api";
import { listarTodasAcademias, listarTodosEstudantes } from "@/lib/api/pagination";
import type { ApiDate, Falta, Turma, EstudanteDetalhado, Curso } from "@/types/api";
import { Provincias } from "@/types/api";
import Icon from "@/components/ui/Icon";
import Alert from "@/components/ui/alert/Alert";


// ─── helpers ─────────────────────────────────────────────────────────────────

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
    const ia = ORDEM_ANOS.indexOf(a), ib = ORDEM_ANOS.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1; if (ib === -1) return -1;
    return ia - ib;
  });
}

function labelNivel(v: string): string {
  const match = v.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!match) return v.replace(/_/g, " ");
  const [, n, tipo] = match;
  if (tipo === "fundamental") return `${n}ª Classe`;
  if (tipo === "medio")       return `${n}º Ano do Ensino Médio`;
  return `${n}º Ano Superior`;
}

function nomeProvinciaDeCodigo(codigo: string): string {
  return Provincias.find(p => p.codigo === codigo?.toUpperCase())?.nome ?? codigo;
}

function corQuantidade(q: number): string {
  if (q >= 5) return "text-red-600 dark:text-red-400";
  if (q >= 3) return "text-amber-600 dark:text-amber-400";
  return "text-gray-700 dark:text-gray-300";
}


function tituloCorrecaoFalta(falta: Falta): string | undefined {
  if (!falta.corrigido_em) return undefined;
  const anterior = falta.valor_anterior ?? "—";
  const motivo = falta.motivo_correcao ? ` Motivo: ${falta.motivo_correcao}` : "";
  return `Corrigido em ${falta.corrigido_em}: ${anterior} → ${falta.quantidade}.${motivo}`;
}

function FaltaCorrigidaBadge({ falta }: { falta: Falta }) {
  if (!falta.corrigido_em) return null;
  return <Icon icon="mdi:pencil-circle" width={14} className="ml-1 inline text-brand-500" />;
}

function ValorFaltaComCorrecao({ falta, mostrarMotivo = false }: { falta: Falta; mostrarMotivo?: boolean }) {
  return (
    <span title={tituloCorrecaoFalta(falta)}>
      {falta.quantidade}<FaltaCorrigidaBadge falta={falta} />
      {mostrarMotivo && falta.motivo_correcao && <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">Motivo: {falta.motivo_correcao}</span>}
    </span>
  );
}

function formatarData(data: ApiDate): string {
  try {
    return new Date(data + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return data; }
}

function normCodigo(codigo: string): string {
  return (codigo ?? "").trim().toLowerCase();
}

function turmaAtiva(t: Turma): boolean {
  return t.status !== "inativo" && t.status !== "deletado";
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

// Camada de navegação global — igual ao NotasAdmin
type NavLayer =
  | { type: "provincias" }
  | { type: "academias"; provincia: string }
  | { type: "academia";  academia: AcadInfo };

// Camada interna — fluxo: anos → turmas → faltas (seletor de matéria inline)
type LayerFund =
  | { mode: "fund"; type: "anos" }
  | { mode: "fund"; type: "turmas"; nivel: string }
  | { mode: "fund"; type: "faltas"; nivel: string; turma: Turma };

type LayerSup =
  | { mode: "sup"; type: "cursos" }
  | { mode: "sup"; type: "anos";   curso: Curso }
  | { mode: "sup"; type: "turmas"; curso: Curso; nivel: string }
  | { mode: "sup"; type: "faltas"; curso: Curso; nivel: string; turma: Turma };

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

// ─── Tabela de Faltas ─────────────────────────────────────────────────────────

function TabelaFaltas({
  faltas,
  estudantes,
  codigosTurma,
  onVerDetalhes,
}: {
  faltas: Falta[];
  estudantes: EstudanteDetalhado[];
  codigosTurma: string[];
  onVerDetalhes: (detalhe: { codigo: string; nome: string | null; faltas: Falta[]; total: number }) => void;
}) {
  if (codigosTurma.length === 0 && faltas.length === 0) return (
    <div className="text-center py-10 text-gray-400">
      <Icon icon="mdi:check-circle-outline" width={40} className="mx-auto mb-2 text-emerald-400 opacity-80" />
      <p className="text-sm">Nenhum estudante encontrado nesta turma.</p>
    </div>
  );

  const getNome = (codigoNorm: string) => estudantes.find(e => normCodigo(e.codigo_estudante) === codigoNorm)?.nome ?? null;
  const faltasPorCodigo = new Map<string, Falta[]>();
  faltas.forEach(f => {
    const codigo = normCodigo(f.codigo_estudante);
    faltasPorCodigo.set(codigo, [...(faltasPorCodigo.get(codigo) ?? []), f]);
  });
  const codigosTabela = Array.from(new Set([...codigosTurma, ...faltasPorCodigo.keys()]));
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 dark:bg-gray-800/70">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Nome do Estudante</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Código do Estudante</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">Quantidade</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {codigosTabela
              .map(codigo => {
                const fs = faltasPorCodigo.get(codigo) ?? [];
                return { codigo, nome: getNome(codigo) ?? (fs[0] as any)?.estudante_nome ?? null, total: fs.reduce((acc, f) => acc + f.quantidade, 0), faltas: fs };
              })
              .sort((a, b) => (a.nome ?? a.codigo).localeCompare(b.nome ?? b.codigo, "pt", { sensitivity: "base" }))
              .map(({ codigo, nome, total, faltas: fs }) => (
                <tr key={codigo} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{nome ?? <span className="text-gray-400 italic text-sm">Nome não encontrado</span>}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{codigo.toUpperCase()}</td>
                  <td className={`px-4 py-3 text-center text-base font-bold ${total > 0 ? corQuantidade(total) : "text-gray-300 dark:text-gray-600"}`}>{total || "—"}</td>
                  <td className="px-4 py-3 text-right">{fs.length > 0 && <button type="button" onClick={() => onVerDetalhes({ codigo, nome, faltas: [...fs].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()), total })} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"><Icon icon="mdi:open-in-new" width={14} /> Ver mais</button>}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function FaltasAdmin() {
  const token = tokenStorage.get() ?? undefined;

  // navegação global
  const [navLayer, setNavLayer] = useState<NavLayer>({ type: "provincias" });
  const [alert, setAlert]       = useState<{ variant: "success" | "error"; message: string } | null>(null);

  // estado interno da academia seleccionada
  const [acadLayer, setAcadLayer]                       = useState<AcadLayer>({ mode: "fund", type: "anos" });
  const [anoLetivoSelecionado, setAnoLetivoSelecionado] = useState("");
  const [faltasPorEstudante, setFaltasPorEstudante]     = useState<Record<string, Falta[]>>({});
  const [carregandoFaltas, setCarregandoFaltas]         = useState(false);
  const [estudantesPorTurma, setEstudantesPorTurma]     = useState<Record<string, EstudanteDetalhado[]>>({});
  const [carregandoEstudantesTurma, setCarregandoEstudantesTurma] = useState(false);

  // Matéria selecionada inline — auto-selecionada ao entrar na camada faltas
  const [materiaSelecionada, setMateriaSelecionada]     = useState<{ id: string; nome: string } | null>(null);
  const [detalheFaltas, setDetalheFaltas] = useState<{ codigo: string; nome: string | null; faltas: Falta[]; total: number } | null>(null);

  // APIs
  const { data: academiasData, loading: loadingAcads, execute: fetchAcademias } =
    useApi(listarTodasAcademias);
  const { data: dataTurmas,     loading: loadingTurmas, execute: fetchTurmas     } = useApi(academiaService.listarTurmas);
  const { data: dataCursos,     loading: loadingCursos, execute: fetchCursos     } = useApi(academiaService.listarCursos);
  const { data: dataEstudantes, loading: loadingEstud,  execute: fetchEstudantes } = useApi(listarTodosEstudantes);
  const { data: dataMaterias,                           execute: fetchMaterias   } = useApi(academiaService.listarMaterias);
  const { data: dataAnosLetivos, loading: loadingAnos,  execute: fetchAnosLetivos} = useApi(academiaService.listarAnosLetivosLista);
  const { data: dataAnoLetivo,                          execute: fetchAnoLetivo  } = useApi(academiaService.getAnoLetivo);

  useEffect(() => {
    fetchAcademias({ token, limit: 50, offset: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-selecionar primeira matéria ao entrar na camada "faltas"
  useEffect(() => {
    if (acadLayer.type !== "faltas") {
      setMateriaSelecionada(null);
      setDetalheFaltas(null);
      return;
    }
    const l    = acadLayer as any;
    const tipo = l.nivel?.includes("fundamental") ? "fundamental"
               : l.nivel?.includes("medio")       ? "medio"
               : "superior";

    const materiasConfig = (materias as any[]).filter((m: any) => {
      if (m.type !== tipo) return false;
      if (tipo === "fundamental") return m.anos_academicos?.includes(l.nivel);
      if (tipo === "medio")       return l.turma?.curso_id ? m.curso_id === l.turma.curso_id : m.anos_academicos?.includes(l.nivel);
      return l.curso ? m.curso_id === l.curso.id : false;
    });

    const sorted = [...materiasConfig].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" })
    );
    setMateriaSelecionada(sorted.length > 0 ? { id: sorted[0].id, nome: sorted[0].nome } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acadLayer]);

  // ─── dados derivados ────────────────────────────────────────────────────────

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
  const estudantesBase: EstudanteDetalhado[] = useMemo(() => (dataEstudantes as any)?.estudantes ?? [], [dataEstudantes]);
  const estudantes: EstudanteDetalhado[] = useMemo(() => {
    const mapa = new Map(estudantesBase.map(e => [normCodigo(e.codigo_estudante), e]));
    Object.values(estudantesPorTurma).flat().forEach(e => mapa.set(normCodigo(e.codigo_estudante), e));
    return Array.from(mapa.values());
  }, [estudantesBase, estudantesPorTurma]);
  const materias                         = useMemo(() => ((dataMaterias as any)?.materias ?? []).filter((m: any) => m.status === "ativo"), [dataMaterias]);
  const todasFaltas                      = useMemo(() => Object.values(faltasPorEstudante).flat(), [faltasPorEstudante]);
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

  const niveisFundamentais = useMemo(() => {
    if (!academiaAtual) return [];
    const niveisComTurmas = [...new Set(turmasAtivas.map(t => t.nivel).filter(n => n.includes("fundamental")))];
    if (niveisComTurmas.length > 0) return sortAnos(niveisComTurmas);
    return sortAnos((academiaAtual.anos_academicos ?? []).filter(a => a.includes("fundamental")));
  }, [turmasAtivas, academiaAtual]);


  useEffect(() => {
    if (acadLayer.type !== "faltas") return;
    const turma = (acadLayer as any).turma as Turma | undefined;
    const codAcad = navLayer.type === "academia" ? navLayer.academia.codigo_academia : undefined;
    if (!turma?.codigo_turma || estudantesPorTurma[turma.codigo_turma]) return;
    let cancelado = false;
    setCarregandoEstudantesTurma(true);
    consultasService.listarEstudantes({ token, codigo_turma: turma.codigo_turma, codigo_academia: codAcad } as any)
      .then((res: any) => {
        if (!cancelado) setEstudantesPorTurma(prev => ({ ...prev, [turma.codigo_turma]: res?.estudantes ?? [] }));
      })
      .finally(() => { if (!cancelado) setCarregandoEstudantesTurma(false); });
    return () => { cancelado = true; };
  }, [acadLayer, estudantesPorTurma, navLayer, token]);

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

  async function carregarFaltasDosEstudantesDaTurma(turma: Turma, force = false) {
    const anoFiltro      = anoLetivoSelecionado || anoLectivo || undefined;
    const codsNorm       = codigosTurmaDoAnoLetivo(turma, anoFiltro);
    const codsParaBuscar = force ? codsNorm : codsNorm.filter(c => !(c in faltasPorEstudante));
    if (codsParaBuscar.length === 0) return;

    setCarregandoFaltas(true);
    try {
      const resultados = await Promise.all(
        codsParaBuscar.map(async codigoNorm => {
          const codigoOriginal = codigoOriginalDaTurma(turma, codigoNorm, anoFiltro);
          const resposta = await consultasService.faltasEstudante(codigoOriginal, { token });
          return { codigoNorm, faltas: resposta?.faltas ?? [] };
        })
      );
      setFaltasPorEstudante(prev => {
        const next = { ...prev };
        resultados.forEach(({ codigoNorm, faltas }) => { next[codigoNorm] = faltas; });
        return next;
      });
    } catch { /* erro silencioso */ }
    finally { setCarregandoFaltas(false); }
  }

  /** Faltas da turma filtradas por matéria e ano letivo */
  function faltasDaTurmaEMateria(turma: Turma, materiaId: string): Falta[] {
    const anoFiltro    = anoLetivoSelecionado || anoLectivo;
    const cods         = codigosTurmaDoAnoLetivo(turma, anoFiltro);
    const faltasTurma  = cods.flatMap(c => faltasPorEstudante[c] ?? []);
    const filtAno      = anoFiltro ? faltasTurma.filter(f => f.ano_lectivo === anoFiltro) : faltasTurma;
    return filtAno.filter(f => f.materia_disciplinar_id === materiaId);
  }

  /** Matérias disponíveis para a turma/nível com contagem de faltas */
  function getMateriasDaTurma(turma: Turma, nivel: string, curso?: Curso): { id: string; nome: string; totalFaltas: number; registros: number }[] {
    const tipo = nivel.includes("fundamental") ? "fundamental"
               : nivel.includes("medio")       ? "medio"
               : "superior";

    const materiasConfig = (materias as any[]).filter((m: any) => {
      if (m.type !== tipo) return false;
      if (tipo === "fundamental") return m.anos_academicos?.includes(nivel);
      if (tipo === "medio")       return turma.curso_id ? m.curso_id === turma.curso_id : m.anos_academicos?.includes(nivel);
      return curso ? m.curso_id === curso.id : false;
    });

    const anoFiltro    = anoLetivoSelecionado || anoLectivo;
    const cods         = codigosTurmaDoAnoLetivo(turma, anoFiltro);
    const faltasTurma  = cods.flatMap(c => faltasPorEstudante[c] ?? [])
      .filter(f => (anoFiltro ? f.ano_lectivo === anoFiltro : true));

    return materiasConfig.map((m: any) => {
      const fs    = faltasTurma.filter(f => f.materia_disciplinar_id === m.id);
      const total = fs.reduce((acc, f) => acc + f.quantidade, 0);
      return { id: m.id, nome: m.nome, totalFaltas: total, registros: fs.length };
    }).sort((a, b) => a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" }));
  }

  const turmasPorNivel = (nivel: string)   => turmasAtivas.filter(t => t.nivel === nivel);
  const turmasPorCurso = (cursoId: string) => turmasAtivas.filter(t => t.curso_id === cursoId);
  const anosDosCurso   = (c: Curso)        => sortAnos(c.anos_academicos ?? []);

  // ─── entrar na academia ──────────────────────────────────────────────────────

  function entrarNaAcademia(academia: AcadInfo) {
    setAnoLetivoSelecionado("");
    setFaltasPorEstudante({});
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
    setNavLayer({ type: "academia", academia });

    const cod = academia.codigo_academia;
    fetchTurmas({ codigo_academia: cod, token });
    fetchCursos({ codigo_academia: cod, token });
    fetchMaterias({ codigo_academia: cod, token });
    fetchEstudantes({ token, codigo_academia: cod });
    fetchAnosLetivos({ codigo_academia: cod, token });
    fetchAnoLetivo({ codigo_academia: cod, token });
  }

  // ─── breadcrumbs ─────────────────────────────────────────────────────────────

  function buildCrumbs(): { label: string; onClick?: () => void }[] {
    const goProvs  = () => setNavLayer({ type: "provincias" });
    const goAcads  = () => academiaAtual && setNavLayer({ type: "academias", provincia: academiaAtual.provincia });
    const goInicio = () => setAcadLayer({ mode: "misto", type: "choose" });

    if (navLayer.type === "provincias") return [{ label: "Províncias" }];
    if (navLayer.type === "academias")  return [
      { label: "Províncias", onClick: goProvs },
      { label: nomeProvinciaDeCodigo(navLayer.provincia) },
    ];

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
      if (al.type === "anos")   return base;
      if (al.type === "turmas") return [...base, { label: labelNivel(al.nivel) }];
      if (al.type === "faltas") return [...base,
        { label: labelNivel(al.nivel),  onClick: () => setAcadLayer({ mode: "fund", type: "turmas", nivel: al.nivel }) },
        { label: `Turma ${al.turma.codigo_turma}` },
      ];
    }

    if (al.mode === "sup") {
      const goCursos    = () => setAcadLayer({ mode: "sup", type: "cursos" });
      const cursosCrumb = { label: isMisto ? "Médio" : "Cursos", onClick: goCursos };
      const base        = isMisto ? [...navBase, { label: "Início", onClick: goInicio }, cursosCrumb] : [...navBase, cursosCrumb];
      const l = al as any;
      if (al.type === "cursos") return base;
      if (al.type === "anos")   return [...base, { label: l.curso.nome }];
      if (al.type === "turmas") return [...base,
        { label: l.curso.nome, onClick: () => setAcadLayer({ mode: "sup", type: "anos", curso: l.curso }) },
        { label: labelNivel(l.nivel) },
      ];
      if (al.type === "faltas") return [...base,
        { label: l.curso.nome,        onClick: () => setAcadLayer({ mode: "sup", type: "anos",   curso: l.curso }) },
        { label: labelNivel(l.nivel), onClick: () => setAcadLayer({ mode: "sup", type: "turmas", curso: l.curso, nivel: l.nivel }) },
        { label: `Turma ${l.turma.codigo_turma}` },
      ];
    }

    return navBase;
  }

  // ─── goBack / canGoBack ──────────────────────────────────────────────────────

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
    if (al.type === "anos" && anoLetivoSelecionado)  { setAnoLetivoSelecionado(""); return; }

    if (al.mode === "fund") {
      if      (al.type === "anos")   isMisto ? setAcadLayer({ mode: "misto", type: "choose" }) : setNavLayer({ type: "academias", provincia: prov });
      else if (al.type === "turmas") setAcadLayer({ mode: "fund", type: "anos" });
      else if (al.type === "faltas") setAcadLayer({ mode: "fund", type: "turmas", nivel: al.nivel });
      return;
    }
    if (al.mode === "sup") {
      const l = al as any;
      if      (al.type === "cursos") isMisto ? setAcadLayer({ mode: "misto", type: "choose" }) : setNavLayer({ type: "academias", provincia: prov });
      else if (al.type === "anos")   setAcadLayer({ mode: "sup", type: "cursos" });
      else if (al.type === "turmas") setAcadLayer({ mode: "sup", type: "anos",   curso: l.curso });
      else if (al.type === "faltas") setAcadLayer({ mode: "sup", type: "turmas", curso: l.curso, nivel: l.nivel });
      return;
    }
  }

  // ─── camada folha: seletor inline de matéria + tabela de faltas ──────────────

  function renderFaltasLayer(nivel: string, turma: Turma, subtitulo?: string, curso?: Curso) {
    const materiasDisponiveis = getMateriasDaTurma(turma, nivel, curso);
    const codigosTurma        = codigosTurmaDoAnoLetivo(turma, anoLetivoSelecionado || anoLectivo).filter(Boolean);
    const anoFiltro           = anoLetivoSelecionado || anoLectivo;

    const faltas = materiaSelecionada
      ? faltasDaTurmaEMateria(turma, materiaSelecionada.id)
      : [];

    const totalFaltas = faltas.reduce((acc, f) => acc + f.quantidade, 0);
    const comFalta    = new Set(faltas.map(f => normCodigo(f.codigo_estudante))).size;

    if (detalheFaltas) return (
      <div className="space-y-5">
        <button type="button" onClick={() => setDetalheFaltas(null)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          <Icon icon="mdi:arrow-left" width={18} /> Voltar para a turma
        </button>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitulo}</p>
          <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">Faltas de {detalheFaltas.nome ?? detalheFaltas.codigo.toUpperCase()}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{materiaSelecionada?.nome} · {detalheFaltas.codigo.toUpperCase()} · Total: {detalheFaltas.total} falta(s)</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm min-w-[620px]">
            <thead className="bg-gray-50 dark:bg-gray-800/70"><tr><th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Data</th><th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">Quantidade</th><th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Ano Lectivo</th><th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Observação</th></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">{detalheFaltas.faltas.map(f => <tr key={f.id} className="bg-white dark:bg-gray-800"><td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">{formatarData(f.data)}</td><td className={`px-4 py-3 text-center text-base font-bold ${corQuantidade(f.quantidade)}`}><ValorFaltaComCorrecao falta={f} mostrarMotivo /></td><td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{f.ano_lectivo?.replace("_", "/")}</td><td className="px-4 py-3 text-gray-500 dark:text-gray-400">{f.observacao || "—"}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    );

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Turma {turma.codigo_turma} · {labelNivel(nivel)}
            {anoFiltro ? ` · ${anoFiltro.replace("_", "/")}` : ""}
          </h2>
          {subtitulo && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitulo}</p>}
        </div>

        {/* Seletor de matéria inline */}
        {materiasDisponiveis.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Icon icon="mdi:book-outline" width={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma matéria configurada para este nível.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {materiaSelecionada ? `Faltas de ${materiaSelecionada.nome}` : "Matérias"}
            </p>
            <div className="flex flex-wrap gap-2">
              {materiasDisponiveis.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setDetalheFaltas(null); setMateriaSelecionada(prev => prev?.id === m.id ? null : { id: m.id, nome: m.nome }); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    materiaSelecionada?.id === m.id
                      ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400"
                  }`}
                >
                  {m.nome}
                  {m.totalFaltas > 0 && (
                    <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                      materiaSelecionada?.id === m.id
                        ? "bg-white/20 text-white"
                        : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    }`}>
                      {m.totalFaltas}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        {materiaSelecionada && (faltas.length > 0 || codigosTurma.length > 0) && (
          <div className="flex flex-wrap gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Faltas</p>
              <p className={`text-2xl font-bold mt-0.5 ${corQuantidade(totalFaltas)}`}>{totalFaltas}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Registros</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{faltas.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estudantes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{codigosTurma.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Com falta</p>
              <p className={`text-2xl font-bold mt-0.5 ${comFalta > 0 ? corQuantidade(comFalta) : "text-gray-900 dark:text-white"}`}>
                {comFalta}
              </p>
            </div>
          </div>
        )}

        {/* Tabela */}
        {materiaSelecionada
          ? <TabelaFaltas faltas={faltas} estudantes={estudantes} codigosTurma={codigosTurma} onVerDetalhes={setDetalheFaltas} />
          : null}
      </div>
    );
  }

  // ─── renderAcadLayer ─────────────────────────────────────────────────────────

  function renderAcadLayer() {
    const crumbs = buildCrumbs();
    const BotaoVoltar = canGoBack() ? (
      <button
        type="button"
        onClick={goBack}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300 mb-4"
      >
        <Icon icon="mdi:arrow-left" width={18} /> Voltar
      </button>
    ) : null;

    if (loadingEstud || carregandoFaltas || carregandoEstudantesTurma) return (
      <div className="space-y-4">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <LoadingSpinner message={carregandoFaltas ? "Carregando faltas..." : "Carregando estudantes..."} />
      </div>
    );

    const al = acadLayer;

    // misto
    if (al.mode === "misto" && al.type === "choose") return (
      <div className="space-y-6">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Faltas</h2>
          <p className="text-sm text-gray-500 mt-1">Selecione o nível de ensino</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CardBtn icon="mdi:school"         title="Ensino Fundamental (1ª-9ª Classe)" subtitle="1ª a 9ª Classe"   onClick={() => setAcadLayer({ mode: "fund", type: "anos" })} />
          <CardBtn icon="mdi:book-education" title="Ensino Médio"       subtitle="1º ao 4º Médio"  onClick={() => setAcadLayer({ mode: "sup",  type: "cursos" })} />
        </div>
      </div>
    );

    // fundamental: anos letivos
    if (al.mode === "fund" && al.type === "anos") return (
      <div className="space-y-4">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {anoLetivoSelecionado ? "Anos Académicos — Ensino Fundamental" : "Anos Letivos — Ensino Fundamental"}
        </h2>
        {!anoLetivoSelecionado ? (
          loadingAnos ? <LoadingSpinner message="Carregando anos letivos..." /> : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {anosLetivosDisponiveis.length === 0
                ? <p className="text-sm text-gray-400 col-span-full text-center py-8">Nenhum ano letivo encontrado.</p>
                : anosLetivosDisponiveis.map((ano: string) => (
                  <CardBtn key={ano} icon="mdi:calendar-school" title={`Ano Letivo ${ano.replace("_", "/")}`} subtitle="Entrar para ver os anos académicos" onClick={() => setAnoLetivoSelecionado(ano)} />
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
                    <CardBtn key={nivel} icon="mdi:numeric" title={labelNivel(nivel)}
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
                  <CardBtn key={t.id ?? t.codigo_turma} icon="mdi:account-group" title={`Turma ${t.codigo_turma}`}
                    subtitle={`${codigosTurmaDoAnoLetivo(t, anoLetivoSelecionado || anoLectivo).length} estudante(s) · ${t.turno}`}
                    onClick={async () => { await carregarFaltasDosEstudantesDaTurma(t); setAcadLayer({ mode: "fund", type: "faltas", nivel: al.nivel, turma: t }); }}
                  />
                ))}
              </div>
            )}
        </div>
      );
    }

    // fundamental: faltas
    if (al.mode === "fund" && al.type === "faltas") return (
      <div className="space-y-4">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        {renderFaltasLayer(al.nivel, al.turma)}
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
                <CardBtn key={c.id} icon="mdi:book-open-variant" title={c.nome}
                  subtitle={`${c.anos_academicos?.length ?? 0} ano(s)`}
                  onClick={() => setAcadLayer({ mode: "sup", type: "anos", curso: c })}
                />
              ))}
            </div>
          )}
      </div>
    );

    // superior: anos letivos
    if (al.mode === "sup" && al.type === "anos") {
      const { curso } = al;
      const anos      = anosDosCurso(curso);
      return (
        <div className="space-y-4">
          {BotaoVoltar}
          <Breadcrumb crumbs={crumbs} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {anoLetivoSelecionado ? "Anos Académicos" : curso.nome}
          </h2>
          {anoLetivoSelecionado && <p className="text-sm text-gray-500 dark:text-gray-400">{curso.nome}</p>}
          {!anoLetivoSelecionado ? (
            loadingAnos ? <LoadingSpinner message="Carregando anos letivos..." /> : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {anosLetivosDisponiveis.length === 0
                  ? <p className="text-sm text-gray-400 col-span-full text-center py-8">Nenhum ano letivo encontrado.</p>
                  : anosLetivosDisponiveis.map((ano: string) => (
                    <CardBtn key={ano} icon="mdi:calendar-school" title={`Ano Letivo ${ano.replace("_", "/")}`} subtitle="Entrar para ver os anos académicos" onClick={() => setAnoLetivoSelecionado(ano)} />
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
                  <CardBtn key={nivel} icon="mdi:calendar-school" title={labelNivel(nivel)}
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

    // superior: turmas
    if (al.mode === "sup" && al.type === "turmas") {
      const { curso, nivel } = al;
      const ts = turmasPorCurso(curso.id).filter(t => t.nivel === nivel);
      return (
        <div className="space-y-4">
          {BotaoVoltar}
          <Breadcrumb crumbs={crumbs} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labelNivel(nivel)}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{curso.nome}</p>
          {loadingTurmas ? <LoadingSpinner message="Carregando turmas..." /> :
            ts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Icon icon="mdi:account-group-outline" width={48} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Nenhuma turma ativa para este nível neste curso.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {ts.map(t => (
                  <CardBtn key={t.id ?? t.codigo_turma} icon="mdi:account-group" title={`Turma ${t.codigo_turma}`}
                    subtitle={`${codigosTurmaDoAnoLetivo(t, anoLetivoSelecionado || anoLectivo).length} estudante(s)`}
                    onClick={async () => { await carregarFaltasDosEstudantesDaTurma(t); setAcadLayer({ mode: "sup", type: "faltas", curso, nivel, turma: t }); }}
                  />
                ))}
              </div>
            )}
        </div>
      );
    }

    // superior: faltas
    if (al.mode === "sup" && al.type === "faltas") return (
      <div className="space-y-4">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        {renderFaltasLayer(al.nivel, al.turma, al.curso.nome, al.curso)}
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Faltas do Sistema</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecione uma província para explorar as faltas</p>
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
              <CardBtn key={prov} icon="mdi:map-marker-radius"
                title={nomeProvinciaDeCodigo(prov)}
                subtitle={`${acads.length} academia(s)`}
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
        <button
          type="button"
          onClick={() => setNavLayer({ type: "provincias" })}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"
        >
          <Icon icon="mdi:arrow-left" width={18} /> Voltar
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
            {!loadingTurmas  && turmasAtivas.length > 0   && ` · ${turmasAtivas.length} turma(s) ativa(s)`}
            {!loadingEstud   && estudantes.length > 0     && ` · ${estudantes.length} estudante(s)`}
            {todasFaltas.length > 0                       && ` · ${todasFaltas.length} falta(s) carregada(s)`}
          </p>
        </div>
        {renderAcadLayer()}
      </div>
    );
  }

  return null;
}
