"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useApi } from "@/hooks/useApi";
import { adminService, consultasService } from "@/lib/api/services";
import { useUserCookie } from "@/hooks/useUserCookie";
import { formatAnoLetivo, gerarOpcoesAnoLetivo } from "@/types/api";
import Icon from "@/components/ui/Icon";

// ============================================================================
// Tipos locais
// ============================================================================

type RebuildStatus = "idle" | "loading" | "success" | "error";

interface ProjectionMeta {
  name: string;
  label: string;
  description: string;
  tier: number;
  danger?: boolean; // true = aviso de indisponibilidade temporária
}

// Ordem e metadados das projeções — respeita dependências de FK (tier = ordem de rebuild)
const PROJECTIONS: ProjectionMeta[] = [
  // Tier 1 — sem dependências externas
  {
    name: "admins",
    label: "Admins",
    description: "Administradores do sistema. Rebuild causa indisponibilidade temporária de login.",
    tier: 1,
    danger: true,
  },
  {
    name: "academias",
    label: "Academias",
    description: "Instituições de ensino registadas, status, níveis e províncias.",
    tier: 1,
  },
  {
    name: "cursos",
    label: "Cursos",
    description: "Cursos médios e superiores vinculados a cada academia.",
    tier: 1,
  },
  {
    name: "materias",
    label: "Matérias",
    description: "Disciplinas académicas por academia e curso.",
    tier: 1,
  },
  {
    name: "sistema_config",
    label: "Config. do Sistema",
    description: "Configurações globais como o ano letivo atual.",
    tier: 1,
  },
  {
    name: "categorias_nota",
    label: "Categorias de Nota",
    description: "Categorias de avaliação personalizadas por academia.",
    tier: 1,
  },
  // Tier 2 — dependem de academias/cursos
  {
    name: "estudantes",
    label: "Estudantes",
    description: "Perfis de estudantes, status escolar e vínculos com academias.",
    tier: 2,
  },
  {
    name: "turmas",
    label: "Turmas",
    description: "Turmas com listas de estudantes matriculados.",
    tier: 2,
  },
  // Tier 3 — dependem de estudantes e matérias
  {
    name: "notas",
    label: "Notas",
    description: "Notas académicas de todos os estudantes e períodos.",
    tier: 3,
  },
  {
    name: "faltas",
    label: "Faltas",
    description: "Registos de faltas por estudante, matéria e data.",
    tier: 3,
  },
  // Tier 4 — dependem de estudantes e aprovações
  {
    name: "aprovacao_ano",
    label: "Aprovação de Ano",
    description: "Histórico de aprovações e reprovações anuais por estudante.",
    tier: 4,
  },
  {
    name: "reprovacoes",
    label: "Reprovações",
    description: "Registo consolidado de reprovações.",
    tier: 4,
  },
  {
    name: "avaliacao_final",
    label: "Avaliação Final",
    description: "Avaliações finais de ciclo e transições entre níveis.",
    tier: 4,
  },
];

const TIER_LABELS: Record<number, string> = {
  1: "Base — Sem dependências",
  2: "Nível 2 — Dependem de Academias",
  3: "Nível 3 — Dependem de Estudantes",
  4: "Nível 4 — Avaliações e Aprovações",
};

// ============================================================================
// Hook de rebuild individual
// ============================================================================

function useProjectionRebuild() {
  const [statuses, setStatuses] = useState<Record<string, RebuildStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [timestamps, setTimestamps] = useState<Record<string, Date>>({});

  const rebuild = useCallback(async (name: string) => {
    setStatuses((s) => ({ ...s, [name]: "loading" }));
    setErrors((e) => ({ ...e, [name]: "" }));
    try {
      await adminService.rebuildProjection(name);
      setStatuses((s) => ({ ...s, [name]: "success" }));
      setTimestamps((t) => ({ ...t, [name]: new Date() }));
      setTimeout(() => {
        setStatuses((s) => (s[name] === "success" ? { ...s, [name]: "idle" } : s));
      }, 6000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro desconhecido ao reconstruir projeção.";
      setStatuses((s) => ({ ...s, [name]: "error" }));
      setErrors((e) => ({ ...e, [name]: msg }));
    }
  }, []);

  return { statuses, errors, timestamps, rebuild };
}

// ============================================================================
// Componente: Card de projeção individual
// ============================================================================

function ProjectionCard({
  projection,
  status,
  error,
  lastRebuildAt,
  onRebuild,
}: {
  projection: ProjectionMeta;
  status: RebuildStatus;
  error: string;
  lastRebuildAt?: Date;
  onRebuild: (name: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick() {
    if (projection.danger && !confirming) {
      setConfirming(true);
      // auto-cancel after 4s
      timerRef.current = setTimeout(() => setConfirming(false), 4000);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setConfirming(false);
    onRebuild(projection.name);
  }

  function handleCancel(e: React.MouseEvent) {
    e.stopPropagation();
    if (timerRef.current) clearTimeout(timerRef.current);
    setConfirming(false);
  }

  const isLoading = status === "loading";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div
      className={`
        relative rounded-xl border p-4 flex flex-col gap-3 transition-all duration-200
        ${isLoading ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30" : ""}
        ${isSuccess ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30" : ""}
        ${isError ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30" : ""}
        ${!isLoading && !isSuccess && !isError ? "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700" : ""}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Status dot */}
          <span
            className={`
              flex-shrink-0 w-2 h-2 rounded-full mt-0.5
              ${isLoading ? "bg-blue-400 animate-pulse" : ""}
              ${isSuccess ? "bg-green-500" : ""}
              ${isError ? "bg-red-500" : ""}
              ${!isLoading && !isSuccess && !isError ? "bg-gray-300 dark:bg-gray-600" : ""}
            `}
          />
          <span className="text-sm font-semibold text-gray-800 dark:text-white truncate">
            {projection.label}
          </span>
          {projection.danger && (
            <span className="flex-shrink-0 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
              ⚠ crítico
            </span>
          )}
        </div>
        <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 font-mono">
          {projection.name}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        {projection.description}
      </p>

      {/* Last rebuild timestamp */}
      {lastRebuildAt && !isError && (
        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
          <Icon icon="mdi:check-circle-outline" width="12px" />
          Reconstruída às {lastRebuildAt.toLocaleTimeString("pt-PT")}
        </p>
      )}

      {/* Error message */}
      {isError && error && (
        <p className="text-xs text-red-600 dark:text-red-400 break-words leading-relaxed bg-red-100 dark:bg-red-900/30 rounded px-2 py-1.5">
          {error}
        </p>
      )}

      {/* Action area */}
      <div className="flex items-center gap-2 mt-auto pt-1">
        {confirming ? (
          <>
            <button
              onClick={handleClick}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 text-xs font-semibold transition-colors"
            >
              <Icon icon="mdi:alert-outline" width="14px" />
              Confirmar rebuild
            </button>
            <button
              onClick={handleCancel}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 text-xs transition-colors"
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            onClick={handleClick}
            disabled={isLoading}
            className={`
              w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors
              ${isLoading ? "bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 cursor-not-allowed" : ""}
              ${isSuccess ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50" : ""}
              ${isError ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50" : ""}
              ${!isLoading && !isSuccess && !isError ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700" : ""}
            `}
          >
            {isLoading ? (
              <>
                <span className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                A reconstruir...
              </>
            ) : isSuccess ? (
              <>
                <Icon icon="mdi:check" width="14px" />
                Reconstruída
              </>
            ) : isError ? (
              <>
                <Icon icon="mdi:refresh" width="14px" />
                Tentar novamente
              </>
            ) : (
              <>
                <Icon icon="mdi:database-sync-outline" width="14px" />
                Reconstruir
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Componente: Modal de confirmação para "Rebuild All"
// ============================================================================

function RebuildAllModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={loading ? undefined : onCancel}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-2xl">
        <div className="flex items-start gap-4 mb-5">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Icon icon="mdi:alert-outline" width="22px" className="text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              Reconstruir todas as projeções?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Esta operação vai truncar e reprocessar{" "}
              <strong className="text-gray-700 dark:text-gray-300">
                todas as {PROJECTIONS.length} projeções
              </strong>{" "}
              a partir do ledger de eventos. Durante o processo:
            </p>
            <ul className="mt-2 space-y-1">
              {[
                "Login de admins ficará temporariamente indisponível",
                "Dados podem estar inconsistentes até conclusão",
                "Operação pode demorar vários minutos",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400"
                >
                  <Icon
                    icon="mdi:circle-small"
                    width="16px"
                    className="flex-shrink-0 mt-0.5"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2.5 text-sm font-medium transition-colors"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                A reconstruir...
              </>
            ) : (
              <>
                <Icon icon="mdi:database-sync-outline" width="16px" />
                Reconstruir todas
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Componente principal
// ============================================================================

export default function PageContent() {
  const { user } = useUserCookie();
  const isFPP = user?.admin?.role === "fpp";

  // ── Ano letivo ──────────────────────────────────────────────────────────
  const {
    data: anoLetivoData,
    loading: loadingAtual,
    execute: _buscarAnoLetivo,
  } = useApi(consultasService.anoLetivoAtual);

  const buscarAnoLetivo = useCallback(() => {
    _buscarAnoLetivo();
  }, [_buscarAnoLetivo]);

  const {
    loading: definindo,
    error: erroDefinir,
    execute: definirAnoLetivo,
  } = useApi(adminService.definirAnoLetivo);

  const [anoSelecionado, setAnoSelecionado] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const opcoes = gerarOpcoesAnoLetivo();

  const valorSelect = anoSelecionado || anoLetivoData?.ano_letivo || "";

  useEffect(() => {
    buscarAnoLetivo();
  }, [buscarAnoLetivo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSucesso(false);
    if (!valorSelect) return;
    try {
      await definirAnoLetivo({ ano_letivo: valorSelect });
      setSucesso(true);
      setAnoSelecionado("");
      buscarAnoLetivo();
      setTimeout(() => setSucesso(false), 4000);
    } catch {
      // erroDefinir disponível via hook
    }
  }

  // ── Rebuild de projeções ────────────────────────────────────────────────
  const { statuses, errors, timestamps, rebuild } = useProjectionRebuild();

  const [showRebuildAllModal, setShowRebuildAllModal] = useState(false);
  const [rebuildAllLoading, setRebuildAllLoading] = useState(false);
  const [rebuildAllResult, setRebuildAllResult] = useState<
    "success" | "error" | null
  >(null);
  const [rebuildAllError, setRebuildAllError] = useState("");

  // Contadores para o resumo
  const loadingCount = PROJECTIONS.filter(
    (p) => statuses[p.name] === "loading"
  ).length;
  const successCount = PROJECTIONS.filter(
    (p) => statuses[p.name] === "success"
  ).length;
  const errorCount = PROJECTIONS.filter(
    (p) => statuses[p.name] === "error"
  ).length;

  async function handleRebuildAll() {
    setRebuildAllLoading(true);
    setRebuildAllResult(null);
    setRebuildAllError("");
    try {
      await adminService.rebuildAllProjections();
      setRebuildAllResult("success");
      setTimeout(() => setRebuildAllResult(null), 8000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao reconstruir todas as projeções.";
      setRebuildAllResult("error");
      setRebuildAllError(msg);
    } finally {
      setRebuildAllLoading(false);
      setShowRebuildAllModal(false);
    }
  }

  // Agrupa projeções por tier
  const tiers = [1, 2, 3, 4];
  const byTier = (tier: number) =>
    PROJECTIONS.filter((p) => p.tier === tier);

  // ── Acesso restrito ─────────────────────────────────────────────────────
  if (!isFPP) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Configurações" />
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-6 flex items-center gap-4">
          <span className="text-red-500 text-2xl">
            <Icon icon="mdi:lock-outline" width="28px" />
          </span>
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400">
              Acesso restrito
            </p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              Esta página está disponível apenas para administradores{" "}
              <strong>FPP</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Configurações do Sistema" />

      {/* ── Secção: Ano Letivo ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Card: Ano Letivo Atual */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-500">
              <Icon icon="mdi:calendar-check-outline" width="22px" />
            </span>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Ano Letivo Atual
              </p>
              {loadingAtual ? (
                <div className="h-6 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mt-1" />
              ) : anoLetivoData?.ano_letivo ? (
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {formatAnoLetivo(anoLetivoData.ano_letivo)}
                </p>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic mt-1">
                  Não definido
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-3">
            Este valor é usado em todos os registros académicos do sistema
            (notas, faltas, inscrições, aprovações).
          </p>
        </div>

        {/* Card: Definir Ano Letivo */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-1">
            Definir Ano Letivo
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Selecione o ano letivo vigente. O formato é{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">
              AAAA/AAAA
            </code>{" "}
            (ex: 2025/2026).
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="ano-letivo"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Ano Letivo
              </label>
              <select
                id="ano-letivo"
                value={valorSelect}
                onChange={(e) => setAnoSelecionado(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              >
                <option value="">Selecione um ano letivo</option>
                {opcoes.map((op) => (
                  <option key={op.valor} value={op.valor}>
                    {op.label}
                    {anoLetivoData?.ano_letivo === op.valor ? " (actual)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {erroDefinir && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
                <Icon
                  icon="mdi:alert-circle-outline"
                  width="18px"
                  className="text-red-500 shrink-0"
                />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {erroDefinir}
                </p>
              </div>
            )}

            {sucesso && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
                <Icon
                  icon="mdi:check-circle-outline"
                  width="18px"
                  className="text-green-500 shrink-0"
                />
                <p className="text-sm text-green-700 dark:text-green-400">
                  Ano letivo{" "}
                  <strong>{formatAnoLetivo(valorSelect)}</strong> definido com
                  sucesso!
                </p>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={
                  definindo ||
                  !valorSelect ||
                  valorSelect === anoLetivoData?.ano_letivo
                }
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 text-sm font-medium transition-colors"
              >
                {definindo ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    A definir...
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:content-save-outline" width="18px" />
                    Guardar
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10 px-5 py-3 flex items-start gap-3">
        <Icon
          icon="mdi:information-outline"
          width="18px"
          className="text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0"
        />
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          A alteração do ano letivo é registada no ledger de eventos do sistema
          e fica associada à sua conta. Use com atenção.
        </p>
      </div>

      {/* ── Secção: Reconstrução de Projeções ──────────────────────────── */}
      <div className="mt-10">
        {/* Cabeçalho da secção */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800">
                <Icon
                  icon="mdi:database-sync-outline"
                  width="16px"
                  className="text-gray-600 dark:text-gray-400"
                />
              </span>
              Reconstrução de Projeções
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
              Reprocessa eventos do ledger para reconstruir as tabelas de leitura.
              Use quando uma projeção estiver inconsistente com o estado do ledger.
            </p>
          </div>

          {/* Barra de estado + botão rebuild all */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {/* Contadores */}
            {(loadingCount > 0 || successCount > 0 || errorCount > 0) && (
              <div className="flex items-center gap-3 text-xs">
                {loadingCount > 0 && (
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    {loadingCount} a reconstruir
                  </span>
                )}
                {successCount > 0 && (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {successCount} concluída{successCount > 1 ? "s" : ""}
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    {errorCount} com erro
                  </span>
                )}
              </div>
            )}

            {/* Resultado do rebuild all */}
            {rebuildAllResult === "success" && (
              <div className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-lg">
                <Icon icon="mdi:check-circle-outline" width="14px" />
                Todas as projeções reconstruídas
              </div>
            )}
            {rebuildAllResult === "error" && (
              <div className="flex items-start gap-1.5 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-lg max-w-xs">
                <Icon icon="mdi:alert-circle-outline" width="14px" className="flex-shrink-0 mt-0.5" />
                <span className="break-words">{rebuildAllError}</span>
              </div>
            )}

            <button
              onClick={() => setShowRebuildAllModal(true)}
              disabled={rebuildAllLoading || loadingCount > 0}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium transition-colors"
            >
              <Icon icon="mdi:database-refresh-outline" width="16px" />
              Reconstruir todas
            </button>
          </div>
        </div>

        {/* Aviso de impacto */}
        <div className="mb-6 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10 px-5 py-3 flex items-start gap-3">
          <Icon
            icon="mdi:alert-circle-outline"
            width="18px"
            className="text-orange-500 dark:text-orange-400 mt-0.5 shrink-0"
          />
          <div className="text-sm text-orange-700 dark:text-orange-300">
            <strong>Atenção:</strong> O rebuild trunca e reprocessa a tabela do
            zero. Projeções marcadas como{" "}
            <span className="inline-flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
              ⚠ crítico
            </span>{" "}
            causam indisponibilidade temporária de login durante a operação.
            Cada ação é registada no ledger de auditoria.
          </div>
        </div>

        {/* Grid de projeções agrupado por tier */}
        <div className="space-y-8">
          {tiers.map((tier) => {
            const projections = byTier(tier);
            if (projections.length === 0) return null;
            return (
              <div key={tier}>
                {/* Separador de tier */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-bold flex-shrink-0">
                    {tier}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {TIER_LABELS[tier]}
                  </span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {projections.map((projection) => (
                    <ProjectionCard
                      key={projection.name}
                      projection={projection}
                      status={statuses[projection.name] ?? "idle"}
                      error={errors[projection.name] ?? ""}
                      lastRebuildAt={timestamps[projection.name]}
                      onRebuild={rebuild}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de confirmação — Rebuild All */}
      {showRebuildAllModal && (
        <RebuildAllModal
          onConfirm={handleRebuildAll}
          onCancel={() => setShowRebuildAllModal(false)}
          loading={rebuildAllLoading}
        />
      )}
    </div>
  );
}