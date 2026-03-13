"use client";

import React, { useCallback, useRef, useState } from "react";
import { adminService } from "@/lib/api/services";
import Icon from "@/components/ui/Icon";

// ============================================================================
// Tipos
// ============================================================================

type RebuildStatus = "idle" | "loading" | "success" | "error";

interface ProjectionMeta {
  name: string;
  label: string;
  description: string;
  tier: number;
  danger?: boolean;
}

interface RebuildAllItemResult {
  name: string;
  label: string;
  status: "success" | "error";
  error?: string;
}

// ============================================================================
// Metadados das projeções
// Ordem respeita dependências de FK (tier = ordem de rebuild).
// sistema_config foi removido — substituído por ano letivo por academia.
// ============================================================================

const PROJECTIONS: ProjectionMeta[] = [
  // Tier 1 — sem dependências externas
  {
    name: "admins",
    label: "Admins",
    description:
      "Administradores do sistema. Rebuild causa indisponibilidade temporária de login.",
    tier: 1,
    danger: true,
  },
  {
    name: "academias",
    label: "Academias",
    description:
      "Instituições de ensino registadas, status, níveis, províncias e ano letivo activo.",
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
// Hook de rebuild
// ============================================================================

function useProjectionRebuild() {
  const [statuses, setStatuses] = useState<Record<string, RebuildStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [timestamps, setTimestamps] = useState<Record<string, Date>>({});

  const rebuildRaw = useCallback(
    async (name: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      setStatuses((s) => ({ ...s, [name]: "loading" }));
      setErrors((e) => ({ ...e, [name]: "" }));
      try {
        await adminService.rebuildProjection(name);
        setStatuses((s) => ({ ...s, [name]: "success" }));
        setTimestamps((t) => ({ ...t, [name]: new Date() }));
        return { ok: true };
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Erro desconhecido ao reconstruir projeção.";
        setStatuses((s) => ({ ...s, [name]: "error" }));
        setErrors((e) => ({ ...e, [name]: msg }));
        return { ok: false, error: msg };
      }
    },
    []
  );

  const rebuild = useCallback(
    async (name: string) => {
      const result = await rebuildRaw(name);
      if (result.ok) {
        setTimeout(() => {
          setStatuses((s) => (s[name] === "success" ? { ...s, [name]: "idle" } : s));
        }, 6000);
      }
    },
    [rebuildRaw]
  );

  return { statuses, errors, timestamps, rebuild, rebuildRaw };
}

// ============================================================================
// Card individual de projeção
// ============================================================================

function ProjectionCard({
  projection,
  status,
  error,
  lastRebuildAt,
  onRebuild,
  disabled,
}: {
  projection: ProjectionMeta;
  status: RebuildStatus;
  error: string;
  lastRebuildAt?: Date;
  onRebuild: (name: string) => void;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick() {
    if (disabled) return;
    if (projection.danger && !confirming) {
      setConfirming(true);
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
  const isDisabled = disabled || isLoading;

  return (
    <div
      className={`
        relative rounded-xl border p-4 flex flex-col gap-3 transition-all duration-200
        ${isLoading ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30" : ""}
        ${isSuccess ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30" : ""}
        ${isError ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30" : ""}
        ${
          !isLoading && !isSuccess && !isError
            ? "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700"
            : ""
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
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

      {/* Last rebuild */}
      {lastRebuildAt && !isError && (
        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
          <Icon icon="mdi:check-circle-outline" width="12px" />
          Reconstruída às {lastRebuildAt.toLocaleTimeString("pt-PT")}
        </p>
      )}

      {/* Error */}
      {isError && error && (
        <p className="text-xs text-red-600 dark:text-red-400 break-words leading-relaxed bg-red-100 dark:bg-red-900/30 rounded px-2 py-1.5">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-1">
        {confirming ? (
          <>
            <button
              onClick={handleClick}
              disabled={isDisabled}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 text-xs font-semibold transition-colors"
            >
              <Icon icon="mdi:alert-outline" width="14px" />
              Confirmar rebuild
            </button>
            <button
              onClick={handleCancel}
              disabled={isDisabled}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 text-xs transition-colors"
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            onClick={handleClick}
            disabled={isDisabled}
            className={`
              w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors
              ${isDisabled && !isLoading ? "opacity-40 cursor-not-allowed" : ""}
              ${isLoading ? "bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 cursor-not-allowed" : ""}
              ${isSuccess && !isDisabled ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50" : ""}
              ${isSuccess && isDisabled ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : ""}
              ${isError && !isDisabled ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50" : ""}
              ${isError && isDisabled ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" : ""}
              ${
                !isLoading && !isSuccess && !isError
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  : ""
              }
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
// Modal de confirmação para Rebuild All
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
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={loading ? undefined : onCancel}
      />
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
              a partir do ledger de eventos, uma a uma em ordem de tier. Durante
              o processo:
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
// Painel de resultados do Rebuild All
// ============================================================================

function RebuildAllResultsPanel({
  results,
  onDismiss,
}: {
  results: RebuildAllItemResult[];
  onDismiss: () => void;
}) {
  const successList = results.filter((r) => r.status === "success");
  const errorList = results.filter((r) => r.status === "error");
  const allSuccess = errorList.length === 0;

  const wrapperClass = allSuccess
    ? "rounded-xl border p-4 flex flex-col gap-3 border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
    : "rounded-xl border p-4 flex flex-col gap-3 border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20";

  const iconName = allSuccess ? "mdi:check-circle-outline" : "mdi:alert-circle-outline";
  const iconClass = allSuccess
    ? "text-green-600 dark:text-green-400"
    : "text-red-500 dark:text-red-400";
  const labelClass = allSuccess
    ? "text-sm font-semibold text-green-800 dark:text-green-300"
    : "text-sm font-semibold text-red-700 dark:text-red-300";

  const errSuffix = errorList.length > 1 ? "ões" : "";
  const okSuffix = successList.length !== 1 ? "s" : "";
  const summaryLabel = allSuccess
    ? `Todas as ${results.length} projeções reconstruídas com sucesso`
    : `${errorList.length} projeção${errSuffix} com erro — ${successList.length} concluída${okSuffix}`;

  return (
    <div className={wrapperClass}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon icon={iconName} width="18px" className={iconClass} />
          <span className={labelClass}>{summaryLabel}</span>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
          title="Fechar resumo"
        >
          <Icon icon="mdi:close" width="16px" />
        </button>
      </div>

      {!allSuccess && successList.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {successList.map((r) => (
            <span
              key={r.name}
              className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full"
            >
              <Icon icon="mdi:check" width="11px" />
              {r.label}
            </span>
          ))}
        </div>
      )}

      {errorList.length > 0 && (
        <div className="flex flex-col gap-2">
          {errorList.map((r) => (
            <div
              key={r.name}
              className="flex flex-col gap-0.5 bg-red-100 dark:bg-red-900/30 rounded-lg px-3 py-2"
            >
              <span className="text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-1.5">
                <Icon
                  icon="mdi:close-circle-outline"
                  width="13px"
                  className="flex-shrink-0"
                />
                {r.label}
                <span className="font-mono font-normal text-red-400 dark:text-red-500">
                  ({r.name})
                </span>
              </span>
              {r.error && (
                <span className="text-xs text-red-600 dark:text-red-400 leading-relaxed pl-5 break-words">
                  {r.error}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminSection() {
  const { statuses, errors, timestamps, rebuild, rebuildRaw } = useProjectionRebuild();

  const [showRebuildAllModal, setShowRebuildAllModal] = useState(false);
  const [rebuildAllLoading, setRebuildAllLoading] = useState(false);
  const [rebuildAllResults, setRebuildAllResults] = useState<RebuildAllItemResult[] | null>(null);

  const loadingCount = PROJECTIONS.filter((p) => statuses[p.name] === "loading").length;
  const successCount = PROJECTIONS.filter((p) => statuses[p.name] === "success").length;
  const errorCount = PROJECTIONS.filter((p) => statuses[p.name] === "error").length;

  async function handleRebuildAll() {
    setRebuildAllLoading(true);
    setRebuildAllResults(null);
    setShowRebuildAllModal(false);

    const results: RebuildAllItemResult[] = [];
    for (const projection of PROJECTIONS) {
      const result = await rebuildRaw(projection.name);
      results.push({
        name: projection.name,
        label: projection.label,
        status: result.ok ? "success" : "error",
        error: result.ok ? undefined : result.error,
      });
    }

    setRebuildAllResults(results);
    setRebuildAllLoading(false);
  }

  const tiers = [1, 2, 3, 4];
  const byTier = (tier: number) => PROJECTIONS.filter((p) => p.tier === tier);

  return (
    <div>
      {/* Cabeçalho */}
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

        {/* Contadores + botão Rebuild All */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
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

          <button
            onClick={() => setShowRebuildAllModal(true)}
            disabled={rebuildAllLoading || loadingCount > 0}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium transition-colors"
          >
            {rebuildAllLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                A reconstruir...
              </>
            ) : (
              <>
                <Icon icon="mdi:database-refresh-outline" width="16px" />
                Reconstruir todas
              </>
            )}
          </button>
        </div>
      </div>

      {/* Painel de resultados do último Rebuild All */}
      {rebuildAllResults && (
        <div className="mb-6">
          <RebuildAllResultsPanel
            results={rebuildAllResults}
            onDismiss={() => setRebuildAllResults(null)}
          />
        </div>
      )}

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
          causam indisponibilidade temporária de login durante a operação. Cada
          ação é registada no ledger de auditoria.
        </div>
      </div>

      {/* Grid de projeções agrupado por tier */}
      <div className="space-y-8">
        {tiers.map((tier) => {
          const projections = byTier(tier);
          if (projections.length === 0) return null;
          return (
            <div key={tier}>
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
                    disabled={rebuildAllLoading}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Rebuild All */}
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