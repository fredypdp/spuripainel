// src/components/faltas/FaltasEstudante.tsx
"use client"
import { useCallback, useState, useEffect, useMemo } from "react";
import { consultasService, tokenStorage, useApi } from "@/lib/api";
import type { ApiDate, MeuPerfilResponse, Falta, Turma } from "@/types/api";
import Icon from "@/components/ui/Icon";
import { getCookie } from "@/lib/utils/cookies";

// ─── helpers ────────────────────────────────────────────────────────────────

function getUserFromCookie(): MeuPerfilResponse | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(getCookie("user") ?? ""); } catch { return null; }
}

function labelNivel(v: string): string {
  const match = v.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!match) return v.replace(/_/g, " ");
  const [, n, tipo] = match;
  if (tipo === "fundamental") return `${n}ª Classe`;
  if (tipo === "medio")       return `${n}º Ano do Ensino Médio`;
  return `${n}º Ano Superior`;
}

function corQuantidade(q: number) {
  if (q >= 5) return "text-red-600 dark:text-red-400";
  if (q >= 3) return "text-amber-600 dark:text-amber-400";
  return "text-gray-700 dark:text-gray-300";
}

function formatarData(data: ApiDate) {
  try {
    return new Date(data + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return data; }
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

const PERIODOS_LABEL: Record<string, string> = {
  "1_trimestre": "1º Trimestre",
  "2_trimestre": "2º Trimestre",
  "3_trimestre": "3º Trimestre",
  "1_semestre": "1º Semestre",
  "2_semestre": "2º Semestre",
  "3_semestre": "3º Semestre",
  "4_semestre": "4º Semestre",
};

function ValorFaltaComCorrecao({ falta, mostrarMotivo = false }: { falta: Falta; mostrarMotivo?: boolean }) {
  return <span title={tituloCorrecaoFalta(falta)}>{falta.quantidade}<FaltaCorrigidaBadge falta={falta} />{mostrarMotivo && falta.motivo_correcao && <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">Motivo: {falta.motivo_correcao}</span>}</span>;
}

// ─── tipos ───────────────────────────────────────────────────────────────────

interface AcadInfo {
  codigo: string;
  nome: string;
  nivel?: string;
  nivel_escolar?: string;
}

type Layer =
  | { type: "academias" }
  | { type: "anos_letivos"; a: AcadInfo }
  | { type: "tipo_ensino"; a: AcadInfo; anoLetivo: string }
  | { type: "cursos"; a: AcadInfo; anoLetivo: string; tipoEnsino: "medio" | "superior" }
  | { type: "turmas"; a: AcadInfo; anoLetivo: string; tipoEnsino?: "fundamental" | "medio" | "superior"; cursoId?: string }
  | { type: "periodos"; a: AcadInfo; anoLetivo: string; turma: Turma; tipoEnsino?: "fundamental" | "medio" | "superior"; cursoId?: string }
  | { type: "materias"; a: AcadInfo; anoLetivo: string; turma: Turma; periodo: string; tipoEnsino?: "fundamental" | "medio" | "superior"; cursoId?: string }
  | { type: "faltas"; a: AcadInfo; anoLetivo: string; turma: Turma; periodo: string; materiaId: string; materiaNome: string; tipoEnsino?: "fundamental" | "medio" | "superior"; cursoId?: string };

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
  icon: string; title: string; subtitle?: string; badge?: string; onClick?: () => void;
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

// ─── componente principal ────────────────────────────────────────────────────

export default function FaltasEstudante() {
  const [user] = useState<MeuPerfilResponse | null>(getUserFromCookie);
  const [layer, setLayer] = useState<Layer>({ type: "academias" });
  const [loadingLayer, setLoadingLayer] = useState(false);

  const codigoEstudante = user?.estudante?.codigo_estudante ?? "";
  const token = tokenStorage.get() ?? undefined;

  // ✅ Usa a rota correta do estudante: GET /faltas-estudante/:codigo
  const { data: faltasData, loading: loadingFaltas, execute: carregarFaltas } =
    useApi(consultasService.faltasEstudante);

  const { data: historicoTurmas, execute: carregarTurmas, loading: loadingTurmas } =
    useApi(consultasService.turmasEstudante);

  useEffect(() => {
    if (codigoEstudante) {
      carregarFaltas(codigoEstudante, { token });
      carregarTurmas(codigoEstudante, token);
    }
  }, [codigoEstudante]); // eslint-disable-line react-hooks/exhaustive-deps

  const todasFaltas: Falta[] = useMemo(() => faltasData?.faltas ?? [], [faltasData]);
  const todasTurmas: Turma[] = useMemo(() => (historicoTurmas as any)?.turmas ?? [], [historicoTurmas]);

  // ── Resolução do nome da academia ─────────────────────────────────────────
  // FaltaDTO não inclui academia_nome, então usamos a academia_info do perfil
  // como fonte primária, com fallback para o código.
  const resolverNomeAcademia = useCallback((codigoAcademia: string): string => {
    const academiaInfo = user?.estudante?.academia_info ?? (user?.estudante as any)?.academia;
    if (academiaInfo?.codigo === codigoAcademia) return academiaInfo.nome;
    return codigoAcademia;
  }, [user]);

  // Academias únicas a partir das turmas do estudante e das faltas registradas.
  const academias = useMemo((): AcadInfo[] => {
    const map = new Map<string, AcadInfo>();
    [...todasTurmas.map(t => t.codigo_academia), ...todasFaltas.map(f => f.codigo_academia)]
      .filter(Boolean)
      .forEach(codigo => {
        if (!map.has(codigo)) {
          const academiaInfo = user?.estudante?.academia_info ?? (user?.estudante as any)?.academia;
          map.set(codigo, {
            codigo,
            nome: resolverNomeAcademia(codigo),
            nivel: academiaInfo?.codigo === codigo ? academiaInfo?.nivel : undefined,
            nivel_escolar: academiaInfo?.codigo === codigo ? academiaInfo?.nivel_escolar : undefined,
          });
        }
      });
    return Array.from(map.values());
  }, [resolverNomeAcademia, todasFaltas, todasTurmas, user]);

  function anosLetivosDaAcademia(codigoAcademia: string): string[] {
    const anosDasFaltas = todasFaltas
      .filter(f => f.codigo_academia === codigoAcademia)
      .map(f => f.ano_lectivo);
    const anosDasTurmas = todasTurmas
      .filter(t => t.codigo_academia === codigoAcademia)
      .flatMap(t => Object.keys(t.historico_estudantes_ano_letivo ?? {}));
    return Array.from(new Set([...anosDasTurmas, ...anosDasFaltas].filter(Boolean))).sort();
  }

  /**
   * Retorna as turmas de uma academia que possuem faltas para este estudante.
   * Correspondência: turma.codigo_academia === academia && turma.nivel === falta.ano_academico
   */
  function turmasDaAcademia(codigoAcademia: string, anoLetivo: string, tipoEnsino?: "fundamental" | "medio" | "superior", cursoId?: string): Turma[] {
    return todasTurmas.filter(t => {
      const codigosAno = t.historico_estudantes_ano_letivo?.[anoLetivo] ?? t.estudantes;
      if (t.codigo_academia !== codigoAcademia || !codigosAno.includes(codigoEstudante)) return false;
      if (tipoEnsino === "fundamental" && !t.nivel.includes("fundamental")) return false;
      if (tipoEnsino === "medio" && !t.nivel.includes("medio")) return false;
      if (tipoEnsino === "superior" && !t.nivel.includes("superior")) return false;
      if (cursoId && t.curso_id !== cursoId) return false;
      return true;
    });
  }

  function cursosDaAcademia(codigoAcademia: string, anoLetivo: string, tipoEnsino: "medio" | "superior") {
    const cursos = turmasDaAcademia(codigoAcademia, anoLetivo, tipoEnsino)
      .map(t => t.curso_id)
      .filter(Boolean) as string[];
    return Array.from(new Set(cursos)).sort();
  }

  function proximaLayerAnoLetivo(a: AcadInfo, anoLetivo: string): Layer {
    if (a.nivel === "superior") return { type: "cursos", a, anoLetivo, tipoEnsino: "superior" };
    if (a.nivel_escolar === "misto") return { type: "tipo_ensino", a, anoLetivo };
    if (a.nivel_escolar === "medio") return { type: "cursos", a, anoLetivo, tipoEnsino: "medio" };
    return { type: "turmas", a, anoLetivo, tipoEnsino: "fundamental" };
  }

  /** Faltas do estudante nesta turma (academia + nivel + anoLetivo). */
  function faltasDaTurma(codigoAcademia: string, turma: Turma, anoLetivo: string, periodo?: string): Falta[] {
    return todasFaltas.filter(
      f =>
        f.codigo_academia === codigoAcademia &&
        f.ano_academico === turma.nivel &&
        f.ano_lectivo === anoLetivo &&
        (!periodo || f.periodo === periodo)
    );
  }

  /** Matérias agrupadas das faltas de uma turma. */
  function materiasDaTurma(codigoAcademia: string, turma: Turma, anoLetivo: string, periodo: string) {
    const faltas = faltasDaTurma(codigoAcademia, turma, anoLetivo, periodo);
    const map = new Map<string, { nome: string; total: number; count: number }>();
    faltas.forEach(f => {
      const ex = map.get(f.materia_disciplinar_id);
      if (ex) { ex.total += f.quantidade; ex.count++; }
      else map.set(f.materia_disciplinar_id, {
        nome: f.materia_nome ?? f.materia_disciplinar_id,
        total: f.quantidade,
        count: 1,
      });
    });
    return Array.from(map.entries())
      .map(([id, { nome, total, count }]) => ({
        id, nome, totalFaltas: total, registros: count,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  /** Faltas de uma matéria específica numa turma. */
  function faltasDaMateria(codigoAcademia: string, turma: Turma, anoLetivo: string, periodo: string, materiaId: string): Falta[] {
    return faltasDaTurma(codigoAcademia, turma, anoLetivo, periodo)
      .filter(f => f.materia_disciplinar_id === materiaId)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }

  const navegar = async (novaLayer: Layer) => {
    setLoadingLayer(true);
    await new Promise(r => setTimeout(r, 80));
    setLayer(novaLayer);
    setLoadingLayer(false);
  };

  // Breadcrumbs
  const crumbs = useMemo(() => {
    const goAcademias = () => setLayer({ type: "academias" });
    if (layer.type === "academias") return [{ label: "Academias" }];
    if (layer.type === "anos_letivos") return [
      { label: "Academias", onClick: goAcademias },
      { label: layer.a.nome },
    ];
    if (layer.type === "tipo_ensino") return [
      { label: "Academias", onClick: goAcademias },
      { label: layer.a.nome, onClick: () => setLayer({ type: "anos_letivos", a: layer.a }) },
      { label: layer.anoLetivo.replace("_", "/") },
    ];
    if (layer.type === "cursos") return [
      { label: "Academias", onClick: goAcademias },
      { label: layer.a.nome, onClick: () => setLayer({ type: "anos_letivos", a: layer.a }) },
      { label: layer.anoLetivo.replace("_", "/"), onClick: () => setLayer(layer.a.nivel_escolar === "misto" ? { type: "tipo_ensino", a: layer.a, anoLetivo: layer.anoLetivo } : { type: "anos_letivos", a: layer.a }) },
      { label: layer.tipoEnsino === "superior" ? "Ensino Superior" : "Ensino Médio" },
    ];
    if (layer.type === "turmas") return [
      { label: "Academias", onClick: goAcademias },
      { label: layer.a.nome, onClick: () => setLayer({ type: "anos_letivos", a: layer.a }) },
      { label: layer.anoLetivo.replace("_", "/") },
    ];
    if (layer.type === "periodos") return [
      { label: "Academias", onClick: goAcademias },
      { label: layer.a.nome, onClick: () => setLayer({ type: "anos_letivos", a: layer.a }) },
      { label: layer.anoLetivo.replace("_", "/"), onClick: () => setLayer({ type: "turmas", a: layer.a, anoLetivo: layer.anoLetivo, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId }) },
      { label: `Turma ${layer.turma.codigo_turma}` },
    ];
    if (layer.type === "materias") return [
      { label: "Academias", onClick: goAcademias },
      { label: layer.a.nome, onClick: () => setLayer({ type: "anos_letivos", a: layer.a }) },
      { label: layer.anoLetivo.replace("_", "/"), onClick: () => setLayer({ type: "turmas", a: layer.a, anoLetivo: layer.anoLetivo, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId }) },
      { label: `Turma ${layer.turma.codigo_turma}`, onClick: () => setLayer({ type: "periodos", a: layer.a, anoLetivo: layer.anoLetivo, turma: layer.turma, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId }) },
      { label: PERIODOS_LABEL[layer.periodo] ?? layer.periodo },
    ];
    if (layer.type === "faltas") return [
      { label: "Academias", onClick: goAcademias },
      { label: layer.a.nome, onClick: () => setLayer({ type: "anos_letivos", a: layer.a }) },
      { label: layer.anoLetivo.replace("_", "/"), onClick: () => setLayer({ type: "turmas", a: layer.a, anoLetivo: layer.anoLetivo, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId }) },
      {
        label: `Turma ${layer.turma.codigo_turma}`,
        onClick: () => setLayer({ type: "materias", a: layer.a, anoLetivo: layer.anoLetivo, turma: layer.turma, periodo: layer.periodo, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId }),
      },
      { label: PERIODOS_LABEL[layer.periodo] ?? layer.periodo },
      { label: layer.materiaNome },
    ];
    return [{ label: "Academias" }];
  }, [layer]);

  const canGoBack = () => layer.type !== "academias";

  const goBack = () => {
    if (layer.type === "anos_letivos") return setLayer({ type: "academias" });
    if (layer.type === "tipo_ensino") return setLayer({ type: "anos_letivos", a: layer.a });
    if (layer.type === "cursos") return setLayer(layer.a.nivel_escolar === "misto" ? { type: "tipo_ensino", a: layer.a, anoLetivo: layer.anoLetivo } : { type: "anos_letivos", a: layer.a });
    if (layer.type === "turmas") return setLayer(layer.a.nivel_escolar === "misto" ? { type: "tipo_ensino", a: layer.a, anoLetivo: layer.anoLetivo } : { type: "anos_letivos", a: layer.a });
    if (layer.type === "periodos") return setLayer({ type: "turmas", a: layer.a, anoLetivo: layer.anoLetivo, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId });
    if (layer.type === "materias") return setLayer({ type: "periodos", a: layer.a, anoLetivo: layer.anoLetivo, turma: layer.turma, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId });
    if (layer.type === "faltas") return setLayer({ type: "materias", a: layer.a, anoLetivo: layer.anoLetivo, turma: layer.turma, periodo: layer.periodo, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId });
  };

  const BotaoVoltar = canGoBack() ? (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300 mb-4"
    >
      <Icon icon="mdi:arrow-left" width={18} />
      Voltar
    </button>
  ) : null;

  if (loadingFaltas || loadingTurmas) return <LoadingSpinner message="Carregando faltas..." />;

  // ── Academias ──────────────────────────────────────────────────────────────
  if (layer.type === "academias") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Minhas Faltas</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecione uma academia</p>
        </div>
        {academias.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Icon icon="mdi:check-circle" width={48} className="mx-auto mb-3 text-green-400 opacity-80" />
            <p className="text-sm font-medium">Nenhuma falta registrada! Continue assim!</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {academias.map(a => {
              const total = todasFaltas
                .filter(f => f.codigo_academia === a.codigo)
                .reduce((acc, f) => acc + f.quantidade, 0);
              const anos = anosLetivosDaAcademia(a.codigo);
              return (
                <CardBtn
                  key={a.codigo}
                  icon="mdi:school"
                  title={a.nome}
                  subtitle={`${anos.length} ano(s) letivo(s) · ${total} falta(s)`}
                  onClick={() => navegar({ type: "anos_letivos", a })}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Anos letivos ──────────────────────────────────────────────────────────
  if (layer.type === "anos_letivos") {
    const anos = anosLetivosDaAcademia(layer.a.codigo);
    return (
      <div className="space-y-6">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{layer.a.nome}</h2>
          <p className="text-sm text-gray-500 mt-1">Selecione o ano letivo</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {anos.map(ano => (
            <CardBtn
              key={ano}
              icon="mdi:calendar-school"
              title={ano.replace("_", "/")}
              onClick={() => navegar(proximaLayerAnoLetivo(layer.a, ano))}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Tipo de ensino ─────────────────────────────────────────────────────────
  if (layer.type === "tipo_ensino") {
    return (
      <div className="space-y-6">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{layer.a.nome}</h2>
          <p className="text-sm text-gray-500 mt-1">Selecione o tipo de ensino</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CardBtn icon="mdi:school" title="Ensino Fundamental (1ª-9ª Classe)" subtitle="Turmas da 1ª à 9ª Classe" onClick={() => navegar({ type: "turmas", a: layer.a, anoLetivo: layer.anoLetivo, tipoEnsino: "fundamental" })} />
          <CardBtn icon="mdi:book-education" title="Ensino Médio" subtitle="Selecione um curso" onClick={() => navegar({ type: "cursos", a: layer.a, anoLetivo: layer.anoLetivo, tipoEnsino: "medio" })} />
        </div>
      </div>
    );
  }

  // ── Cursos ────────────────────────────────────────────────────────────────
  if (layer.type === "cursos") {
    const cursos = cursosDaAcademia(layer.a.codigo, layer.anoLetivo, layer.tipoEnsino);
    return (
      <div className="space-y-6">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Selecione o curso</h2>
          <p className="text-sm text-gray-500 mt-1">{layer.a.nome} · {layer.anoLetivo.replace("_", "/")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {cursos.map(cursoId => <CardBtn key={cursoId} icon="mdi:book-education" title={cursoId} onClick={() => navegar({ type: "turmas", a: layer.a, anoLetivo: layer.anoLetivo, tipoEnsino: layer.tipoEnsino, cursoId })} />)}
        </div>
      </div>
    );
  }

  // ── Turmas ─────────────────────────────────────────────────────────────────
  if (layer.type === "turmas") {
    const turmas = turmasDaAcademia(layer.a.codigo, layer.anoLetivo, layer.tipoEnsino, layer.cursoId);
    return (
      <div className="space-y-6">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{layer.a.nome}</h2>
          <p className="text-sm text-gray-500 mt-1">Ano letivo {layer.anoLetivo.replace("_", "/")} · Selecione uma turma</p>
        </div>
        {turmas.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Icon icon="mdi:check-circle" width={48} className="mx-auto mb-3 text-green-400 opacity-80" />
            <p className="text-sm">Nenhuma turma com faltas encontrada.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {turmas.map(t => {
              const fs = faltasDaTurma(layer.a.codigo, t, layer.anoLetivo);
              const total = fs.reduce((acc, f) => acc + f.quantidade, 0);
              return (
                <CardBtn
                  key={t.codigo_turma}
                  icon="mdi:account-group"
                  title={`Turma ${t.codigo_turma}`}
                  subtitle={`${labelNivel(t.nivel)} · ${total} falta(s)`}
                  badge={t.turno}
                  onClick={() => navegar({ type: "periodos", a: layer.a, anoLetivo: layer.anoLetivo, turma: t, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId })}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Períodos ───────────────────────────────────────────────────────────────
  if (layer.type === "periodos") {
    const ehSuperior = layer.turma.nivel.includes("superior") || layer.tipoEnsino === "superior";
    const periodosDisponiveis = ehSuperior
      ? ["1_semestre", "2_semestre", "3_semestre", "4_semestre"]
      : ["1_trimestre", "2_trimestre", "3_trimestre"];
    return (
      <div className="space-y-6">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Turma {layer.turma.codigo_turma}</h2>
          <p className="text-sm text-gray-500 mt-1">{labelNivel(layer.turma.nivel)} · Selecione o período</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {periodosDisponiveis.map(p => (
            <CardBtn key={p} icon="mdi:calendar-range" title={PERIODOS_LABEL[p] ?? p} subtitle="Ver matérias" onClick={() => navegar({ type: "materias", a: layer.a, anoLetivo: layer.anoLetivo, turma: layer.turma, periodo: p, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId })} />
          ))}
        </div>
      </div>
    );
  }

  // ── Matérias ───────────────────────────────────────────────────────────────
  if (layer.type === "materias") {
    const materias = materiasDaTurma(layer.a.codigo, layer.turma, layer.anoLetivo, layer.periodo);
    return (
      <div className="space-y-6">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Turma {layer.turma.codigo_turma}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {labelNivel(layer.turma.nivel)} · {PERIODOS_LABEL[layer.periodo] ?? layer.periodo} · {layer.a.nome}
          </p>
        </div>
        {materias.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Icon icon="mdi:check-circle" width={48} className="mx-auto mb-3 text-green-400 opacity-80" />
            <p className="text-sm">Nenhuma falta nesta turma.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {materias.map(m => (
              <CardBtn
                key={m.id}
                icon="mdi:book-open-variant"
                title={m.nome}
                subtitle={`${m.totalFaltas} falta(s) · ${m.registros} registro(s)`}
                badge={m.totalFaltas >= 5 ? "atenção" : undefined}
                onClick={() => navegar({
                  type: "faltas",
                  a: layer.a,
                  anoLetivo: layer.anoLetivo,
                  turma: layer.turma,
                  materiaId: m.id,
                  materiaNome: m.nome,
                  tipoEnsino: layer.tipoEnsino,
                  cursoId: layer.cursoId,
                  periodo: layer.periodo,
                })}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Tabela de Faltas ───────────────────────────────────────────────────────
  if (layer.type === "faltas") {
    const faltas = faltasDaMateria(layer.a.codigo, layer.turma, layer.anoLetivo, layer.periodo, layer.materiaId);
    const totalFaltas = faltas.reduce((acc, f) => acc + f.quantidade, 0);
    const maiorFalta  = faltas.length > 0 ? Math.max(...faltas.map(f => f.quantidade)) : 0;

    return (
      <div className="space-y-6">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {layer.materiaNome}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Turma {layer.turma.codigo_turma} · {labelNivel(layer.turma.nivel)} · {PERIODOS_LABEL[layer.periodo] ?? layer.periodo} · {layer.a.nome}
          </p>
        </div>

        {faltas.length > 0 && (
          <div className="flex flex-wrap gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total de Faltas</p>
              <p className={`text-2xl font-bold mt-0.5 ${corQuantidade(totalFaltas)}`}>{totalFaltas}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Registros</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{faltas.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Maior Falta</p>
              <p className={`text-2xl font-bold mt-0.5 ${corQuantidade(maiorFalta)}`}>{maiorFalta}</p>
            </div>
          </div>
        )}

        {loadingLayer ? (
          <LoadingSpinner message="Carregando faltas..." />
        ) : faltas.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Icon icon="mdi:check-circle" width={48} className="mx-auto mb-3 text-green-400 opacity-80" />
            <p className="text-sm">Nenhuma falta nesta matéria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/70">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Data</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">Quantidade</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Ano Lectivo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {faltas.map(f => (
                  <tr
                    key={f.id}
                    className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
                      {formatarData(f.data)}
                    </td>
                    <td className={`px-4 py-3 text-center text-lg font-bold ${corQuantidade(f.quantidade)}`}>
                      <ValorFaltaComCorrecao falta={f} mostrarMotivo />
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {f.ano_lectivo?.replace("_", "/")}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {f.observacao || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalFaltas >= 10 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <Icon
              icon="mdi:alert-circle"
              width={20}
              className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0"
            />
            <p className="text-sm text-red-700 dark:text-red-400">
              Atenção: você acumulou <strong>{totalFaltas}</strong> faltas nesta matéria.
              Tenha cuidado com a frequência!
            </p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
