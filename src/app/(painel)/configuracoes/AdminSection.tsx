"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useUserType } from "@/hooks/useRoutePermission";
import { useApi } from "@/hooks/useApi";
import { adminService } from "@/lib/api/services";
import { pollJob } from "@/lib/api/job-service";
import Icon from "@/components/ui/Icon";
import { formatAnoLetivo } from "@/types/api";
import PasswordSettingsCard from "./PasswordSettingsCard";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Projection definitions ───────────────────────────────────────────────────

const PROJECTIONS: ProjectionMeta[] = [
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
  {
    name: "avaliacao_final",
    label: "Avaliação Final",
    description:
      "Avaliações finais de ciclo, transições entre níveis, aprovações e reprovações.",
    tier: 4,
  },
];

const TIER_LABELS: Record<number, string> = {
  1: "Base — Sem dependências",
  2: "Nível 2 — Dependem de Academias",
  3: "Nível 3 — Dependem de Estudantes",
  4: "Nível 4 — Avaliações Finais",
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Usa o endpoint assíncrono POST /dominis/projections/rebuild/:name/async,
 * depois faz polling via pollJob até o job completar ou falhar.
 */
function useProjectionRebuild() {
  const [statuses, setStatuses] = useState<Record<string, RebuildStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [timestamps, setTimestamps] = useState<Record<string, Date>>({});

  const rebuildRaw = useCallback(
    async (name: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      setStatuses((s) => ({ ...s, [name]: "loading" }));
      setErrors((e) => ({ ...e, [name]: "" }));

      try {
        // 1. Disparar rebuild assíncrono → recebe job_id
        const response = await adminService.rebuildProjectionAsync(name);
        const jobId = response.job_id;

        if (!jobId) {
          throw new Error("Job ID não retornado pelo servidor.");
        }

        // 2. Polling até done | failed (timeout 10 min)
        const detail = await pollJob(jobId, {
          timeoutMs: 10 * 60 * 1000,
          intervalMs: 1500,
          maxIntervalMs: 6000,
        });

        if (detail.status === "failed") {
          const msg = detail.error || "Rebuild falhou sem mensagem de erro.";
          setStatuses((s) => ({ ...s, [name]: "error" }));
          setErrors((e) => ({ ...e, [name]: msg }));
          return { ok: false, error: msg };
        }

        // done
        setStatuses((s) => ({ ...s, [name]: "success" }));
        setTimestamps((t) => ({ ...t, [name]: new Date() }));
        return { ok: true };
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Erro desconhecido ao reconstruir projeção.";
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
          setStatuses((s) =>
            s[name] === "success" ? { ...s, [name]: "idle" } : s
          );
        }, 6000);
      }
    },
    [rebuildRaw]
  );

  return { statuses, errors, timestamps, rebuild, rebuildRaw };
}

// ─── ProjectionCard ───────────────────────────────────────────────────────────

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
      className={`relative rounded-xl border p-4 flex flex-col gap-3 transition-all duration-200
        ${isLoading ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30" : ""}
        ${isSuccess ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30" : ""}
        ${isError ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30" : ""}
        ${!isLoading && !isSuccess && !isError
          ? "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700"
          : ""}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`flex-shrink-0 w-2 h-2 rounded-full mt-0.5
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
            <span className="flex-shrink-0 text-sm bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
              ⚠ crítico
            </span>
          )}
        </div>
        <span className="flex-shrink-0 text-sm text-gray-400 dark:text-gray-500 font-mono">
          {projection.name}
        </span>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
        {projection.description}
      </p>

      {lastRebuildAt && !isError && (
        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
          <Icon icon="mdi:check-circle-outline" width="12px" />
          Reconstruída às {lastRebuildAt.toLocaleTimeString("pt-PT")}
        </p>
      )}

      {isError && error && (
        <p className="text-sm text-red-600 dark:text-red-400 break-words leading-relaxed bg-red-100 dark:bg-red-900/30 rounded px-2 py-1.5">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 mt-auto pt-1">
        {confirming ? (
          <>
            <button
              onClick={handleClick}
              disabled={isDisabled}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 text-sm font-semibold transition-colors"
            >
              <Icon icon="mdi:alert-outline" width="14px" />
              Confirmar rebuild
            </button>
            <button
              onClick={handleCancel}
              disabled={isDisabled}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 text-sm transition-colors"
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            onClick={handleClick}
            disabled={isDisabled}
            className={`w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors
              ${isDisabled && !isLoading ? "opacity-40 cursor-not-allowed" : ""}
              ${isLoading ? "bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 cursor-not-allowed" : ""}
              ${isSuccess && !isDisabled ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50" : ""}
              ${isSuccess && isDisabled ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : ""}
              ${isError && !isDisabled ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50" : ""}
              ${isError && isDisabled ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" : ""}
              ${!isLoading && !isSuccess && !isError ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700" : ""}
            `}
          >
            {isLoading ? (
              <>
                <span className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                A reconstruir...
              </>
            ) : isSuccess ? (
              <><Icon icon="mdi:check" width="14px" />Reconstruída</>
            ) : isError ? (
              <><Icon icon="mdi:refresh" width="14px" />Tentar novamente</>
            ) : (
              <><Icon icon="mdi:database-sync-outline" width="14px" />Reconstruir</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── RebuildAllModal ──────────────────────────────────────────────────────────

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
              Esta operação vai enfileirar um job assíncrono para reprocessar{" "}
              <strong className="text-gray-700 dark:text-gray-300">
                todas as {PROJECTIONS.length} projeções
              </strong>{" "}
              a partir do ledger de eventos, uma a uma em ordem de tier.
            </p>
            <ul className="mt-2 space-y-1">
              {[
                "Login de admins ficará temporariamente indisponível",
                "Dados podem estar inconsistentes até conclusão",
                "Operação pode demorar vários minutos",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400"
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

// ─── RebuildAllResultsPanel ───────────────────────────────────────────────────

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

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-3 ${
        allSuccess
          ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
          : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon
            icon={
              allSuccess
                ? "mdi:check-circle-outline"
                : "mdi:alert-circle-outline"
            }
            width="18px"
            className={
              allSuccess
                ? "text-green-600 dark:text-green-400"
                : "text-red-500 dark:text-red-400"
            }
          />
          <span
            className={`text-sm font-semibold ${
              allSuccess
                ? "text-green-800 dark:text-green-300"
                : "text-red-700 dark:text-red-300"
            }`}
          >
            {allSuccess
              ? `Todas as ${results.length} projeções reconstruídas com sucesso`
              : `${errorList.length} projeção${
                  errorList.length > 1 ? "ões" : ""
                } com erro — ${successList.length} concluída${
                  successList.length !== 1 ? "s" : ""
                }`}
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
        >
          <Icon icon="mdi:close" width="16px" />
        </button>
      </div>

      {!allSuccess && successList.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {successList.map((r) => (
            <span
              key={r.name}
              className="inline-flex items-center gap-1 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full"
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
              <span className="text-sm font-semibold text-red-700 dark:text-red-300 flex items-center gap-1.5">
                <Icon
                  icon="mdi:close-circle-outline"
                  width="13px"
                  className="flex-shrink-0"
                />
                {r.label}{" "}
                <span className="font-mono font-normal text-red-400 dark:text-red-500">
                  ({r.name})
                </span>
              </span>
              {r.error && (
                <span className="text-sm text-red-600 dark:text-red-400 leading-relaxed pl-5 break-words">
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

function GlobalAcademicYearCard({ isFPP }: { isFPP: boolean }) {
  const anoAtual = new Date().getFullYear();
  const [anoDe, setAnoDe] = useState(String(anoAtual));
  const [anoDefinido, setAnoDefinido] = useState<string | null>(null);
  const [anoLetivoAtual, setAnoLetivoAtual] = useState<string | null>(null);
  const [historicoAnosLetivos, setHistoricoAnosLetivos] = useState<string[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [erroDados, setErroDados] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const {
    loading,
    error,
    execute: definirAnoLetivoGlobal,
  } = useApi(adminService.definirAnoLetivoGlobal);

  const {
    loading: avancando,
    error: erroAvancar,
    execute: definirAnoLetivoSeguinte,
  } = useApi(adminService.definirAnoLetivoSeguinte);

  const anoAte = anoDe ? String(Number(anoDe) + 1) : "";
  const valorFormatado = anoDe && anoAte ? `${anoDe}_${anoAte}` : "";
  const opcoesAnoDe = Array.from({ length: anoAtual - 1900 + 1 }, (_, i) => 1900 + i);

  const carregarDadosAnoLetivo = useCallback(async () => {
    setCarregandoDados(true);
    setErroDados(null);
    try {
      const [anoAtualResp, historicoResp] = await Promise.all([
        adminService.obterAnoLetivoGlobal(),
        adminService.listarAnosLetivosGlobais(),
      ]);
      const anoAtualApi = anoAtualResp?.ano_letivo ?? null;
      setAnoLetivoAtual(anoAtualApi);
      setAnoDefinido(anoAtualApi);
      setHistoricoAnosLetivos(
        (historicoResp?.anos_letivos_lista ?? []).map((item) => item.ano_letivo)
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar ano letivo global.";
      setErroDados(message);
    } finally {
      setCarregandoDados(false);
    }
  }, []);

  useEffect(() => {
    carregarDadosAnoLetivo();
  }, [carregarDadosAnoLetivo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSucesso(false);
    if (!isFPP) return;

    try {
      const response = await definirAnoLetivoGlobal();
      const novoAno = response?.ano_letivo ?? valorFormatado;
      setAnoDefinido(novoAno);
      setAnoLetivoAtual(novoAno);
      setHistoricoAnosLetivos((prev) =>
        prev.includes(novoAno) ? prev : [novoAno, ...prev]
      );
      setSucesso(true);
      setTimeout(() => setSucesso(false), 5000);
    } catch {
      // erro disponível via hook
    }
  }

  async function handleAvancarAnoLetivo() {
    setSucesso(false);
    if (!isFPP) return;
    try {
      const response = await definirAnoLetivoSeguinte();
      const novoAno = response?.ano_letivo ?? null;
      if (novoAno) {
        setAnoDefinido(novoAno);
        setAnoLetivoAtual(novoAno);
        setHistoricoAnosLetivos((prev) => prev.includes(novoAno) ? prev : [novoAno, ...prev]);
      }
      setSucesso(true);
      setTimeout(() => setSucesso(false), 5000);
    } catch {
      // erroAvancar disponível via hook
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
              <Icon icon="mdi:calendar-star-outline" width="16px" className="text-brand-500" />
            </span>
            Ano letivo oficial global
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Responsabilidade do admin FPP: define uma única vez a referência obrigatória para todas as academias. A API calcula automaticamente pelo ano civil atual; depois, a evolução deve ser feita pela ação de definir o ano letivo seguinte.
          </p>
        </div>
        <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${isFPP ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
          <Icon icon={isFPP ? "mdi:shield-check-outline" : "mdi:shield-lock-outline"} width="14px" />
          {isFPP ? "FPP habilitado" : "Apenas FPP altera"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/30">
          <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">Último valor definido nesta sessão</p>
          <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">
            {carregandoDados ? "A carregar..." : anoDefinido ? formatAnoLetivo(anoDefinido) : "—"}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Mostra o ano retornado pela API ao consultar e ao definir o valor global.
          </p>
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-900/60">
            <p className="font-semibold text-gray-700 dark:text-gray-200">Ano letivo global atual</p>
            <p className="mt-1 text-sm font-bold text-brand-600 dark:text-brand-400">
              {carregandoDados ? "A carregar..." : anoLetivoAtual ? formatAnoLetivo(anoLetivoAtual) : "Não definido"}
            </p>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Histórico global: {historicoAnosLetivos.length} ano(s) letivo(s) registado(s).
            </p>
            {historicoAnosLetivos.length > 0 && (
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                {historicoAnosLetivos.map((item) => formatAnoLetivo(item)).join(", ")}
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {carregandoDados ? (
            <div className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ) : (
            <>
              {(error || erroAvancar) && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
                  <Icon icon="mdi:alert-circle-outline" width="18px" className="shrink-0 text-red-500" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error || erroAvancar}</p>
                </div>
              )}
              {erroDados && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
                  <Icon icon="mdi:alert-outline" width="18px" className="shrink-0 text-amber-500" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">{erroDados}</p>
                </div>
              )}

              {sucesso && anoDefinido && (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
                  <Icon icon="mdi:check-circle-outline" width="18px" className="shrink-0 text-green-500" />
                  <p className="text-sm text-green-700 dark:text-green-400">Ano letivo oficial {formatAnoLetivo(anoDefinido)} definido com sucesso.</p>
                </div>
              )}

              {anoLetivoAtual ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAvancarAnoLetivo}
                    disabled={!isFPP || avancando}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand-200 px-5 py-2.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-900 dark:text-brand-300 dark:hover:bg-brand-900/20"
                  >
                    {avancando ? (
                      <><span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />A avançar...</>
                    ) : (
                      <><Icon icon="mdi:calendar-arrow-right" width="18px" />Definir ano letivo seguinte</>
                    )}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div>
                      <label htmlFor="admin-ano-de" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">De</label>
                      <select
                        id="admin-ano-de"
                        value={anoDe}
                        onChange={(e) => setAnoDe(e.target.value)}
                        disabled={!isFPP || loading}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      >
                        {opcoesAnoDe.map((ano) => (
                          <option key={ano} value={String(ano)}>{ano}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Até <span className="text-sm font-normal text-gray-400">(automático)</span></label>
                      <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">{anoAte}</div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Formato</label>
                      <code className="flex w-full items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300">{valorFormatado}</code>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!isFPP || loading}
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />A definir...</>
                      ) : (
                        <><Icon icon="mdi:content-save-outline" width="18px" />Definir ano global automaticamente</>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminSection() {
  const { user } = useUserType();
  const isFPP = user?.admin?.role === "fpp";
  const { statuses, errors, timestamps, rebuild, rebuildRaw } =
    useProjectionRebuild();

  const [showRebuildAllModal, setShowRebuildAllModal] = useState(false);
  const [rebuildAllLoading, setRebuildAllLoading] = useState(false);
  const [rebuildAllResults, setRebuildAllResults] = useState<
    RebuildAllItemResult[] | null
  >(null);

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

  return (
    <div>
      <GlobalAcademicYearCard isFPP={isFPP} />
      <div className="mb-6">
        <PasswordSettingsCard />
      </div>

      {isFPP ? (
      <>
      {/* ── Cabeçalho ──────────────────────────────────────────────────── */}
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
            Usa jobs assíncronos — o progresso é acompanhado automaticamente.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {(loadingCount > 0 || successCount > 0 || errorCount > 0) && (
            <div className="flex items-center gap-3 text-sm">
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

      {/* ── Resultados do rebuild-all ───────────────────────────────────── */}
      {rebuildAllResults && (
        <div className="mb-6">
          <RebuildAllResultsPanel
            results={rebuildAllResults}
            onDismiss={() => setRebuildAllResults(null)}
          />
        </div>
      )}

      {/* ── Aviso de atenção ────────────────────────────────────────────── */}
      <div className="mb-6 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10 px-5 py-3 flex items-start gap-3">
        <Icon
          icon="mdi:alert-circle-outline"
          width="18px"
          className="text-orange-500 dark:text-orange-400 mt-0.5 shrink-0"
        />
        <div className="text-sm text-orange-700 dark:text-orange-300">
          <strong>Atenção:</strong> O rebuild trunca e reprocessa a tabela do
          zero via job assíncrono. Projeções marcadas como{" "}
          <span className="inline-flex items-center gap-1 text-sm bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
            ⚠ crítico
          </span>{" "}
          causam indisponibilidade temporária de login durante a operação.
        </div>
      </div>

      {/* ── Cards por tier ──────────────────────────────────────────────── */}
      <div className="space-y-8">
        {tiers.map((tier) => {
          const projections = PROJECTIONS.filter((p) => p.tier === tier);
          if (projections.length === 0) return null;
          return (
            <div key={tier}>
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm font-bold flex-shrink-0">
                  {tier}
                </span>
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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

      {/* ── Modal de confirmação rebuild-all ───────────────────────────── */}
      {showRebuildAllModal && (
        <RebuildAllModal
          onConfirm={handleRebuildAll}
          onCancel={() => setShowRebuildAllModal(false)}
          loading={rebuildAllLoading}
        />
      )}
      </>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900/40">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <Icon icon="mdi:information-outline" width="18px" className="text-brand-500" />
            Sem configurações administrativas críticas para este role
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            A documentação reserva o ano letivo global e o rebuild de projeções para FPP. Operações de ativação/desativação ficam nas páginas de gerenciamento.
          </p>
        </div>
      )}
    </div>
  );
}
