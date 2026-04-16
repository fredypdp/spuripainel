"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import {
  jobApiService,
  subscribeToJobStream,
  tokenStorage,
  type JobStreamEvent,
  type JobSummary,
  type JobDetail,
  type JobItemResult,
} from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifTone = "info" | "success" | "error" | "warning";

interface UiNotification {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  tone: NotifTone;
  jobId: string;
  progress?: number;
  status?: string;
  read: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_NOTIFICATIONS = 40;

const TONE_CONFIG: Record<NotifTone, { bg: string; dot: string; label: string }> = {
  info:    { bg: "bg-blue-500",   dot: "bg-blue-400 animate-pulse",  label: "Em progresso" },
  success: { bg: "bg-green-500",  dot: "bg-green-500",               label: "Concluído"    },
  error:   { bg: "bg-red-500",    dot: "bg-red-500",                  label: "Com erros"    },
  warning: { bg: "bg-orange-400", dot: "bg-orange-400 animate-pulse", label: "Atenção"      },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jobTypeLabel(type?: string): string {
  const map: Record<string, string> = {
    register_academia_batch:         "Academias",
    ativar_academia_batch:           "Ativação academias",
    desativar_academia_batch:        "Desativação academias",
    register_estudante_batch:        "Estudantes",
    registrar_nota_batch:            "Notas",
    atualizar_nota_batch:            "Atualização notas",
    deletar_nota_batch:              "Exclusão notas",
    registrar_faltas_batch:          "Faltas",
    atualizar_falta_batch:           "Atualização faltas",
    deletar_falta_batch:             "Exclusão faltas",
    registrar_avaliacao_final_batch: "Avaliações finais",
    atualizar_status_escolar_batch:  "Status escolar",
    criar_curso_batch:               "Cursos",
    criar_materia_batch:             "Matérias",
    criar_turma_batch:               "Turmas",
    adicionar_estudante_batch:       "Vínculos turma",
  };
  return type ? (map[type] ?? type.replace(/_/g, " ")) : "Operação";
}

function formatRelativeTime(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    if (diff < 60_000)   return "agora mesmo";
    if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m atrás`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h atrás`;
    return new Date(isoString).toLocaleDateString("pt-PT");
  } catch {
    return "";
  }
}

function normalizeJobSummaryToNotif(job: JobSummary): UiNotification {
  const done  = job.done_items ?? 0;
  const fail  = job.fail_items ?? 0;
  const total = job.total_items ?? 0;
  const type  = (job as any).type as string | undefined;

  let tone: NotifTone = "info";
  let title       = jobTypeLabel(type);
  let description = "";

  if (job.status === "done") {
    tone  = fail > 0 ? "warning" : "success";
    title = `${jobTypeLabel(type)} — ${fail > 0 ? "Concluído com erros" : "Concluído"}`;
    description = fail > 0
      ? `${done} sucesso · ${fail} falha${fail !== 1 ? "s" : ""} de ${total} total`
      : `${done} item${done !== 1 ? "s" : ""} processado${done !== 1 ? "s" : ""} com sucesso`;
  } else if (job.status === "failed") {
    tone  = "error";
    title = `${jobTypeLabel(type)} — Falhou`;
    description = job.error
      ? job.error.length > 80 ? job.error.slice(0, 80) + "…" : job.error
      : `${fail} item${fail !== 1 ? "s" : ""} com falha`;
  } else if (job.status === "processing") {
    tone  = "info";
    description = total > 0
      ? `${job.progress ?? 0}% · ${done}/${total} processados`
      : "Em processamento…";
  } else {
    description = "Na fila de processamento…";
  }

  return {
    id:          `${job.id}-${job.status}`,
    jobId:       job.id,
    title,
    description,
    createdAt:   job.completed_at || job.started_at || job.created_at,
    tone,
    progress:    job.progress,
    status:      job.status,
    read:        job.status === "done" || job.status === "failed",
  };
}

function normalizeEventToNotif(event: JobStreamEvent): UiNotification {
  const pct   = Math.max(0, Math.min(100, Math.round(event.progress ?? 0)));
  const done  = event.done_items ?? 0;
  const fail  = event.fail_items ?? 0;
  const total = event.total_items ?? 0;
  const type  = event.job_type as string | undefined;

  switch (event.type) {
    case "job_enqueued":
      return {
        id:          `${event.job_id}-enqueued-${Date.now()}`,
        jobId:       event.job_id,
        title:       `${jobTypeLabel(type)} — Na fila`,
        description: total > 0 ? `${total} item${total !== 1 ? "s" : ""} aguardando processamento` : "Job criado",
        createdAt:   new Date().toISOString(),
        tone:        "info",
        progress:    0,
        status:      "pending",
        read:        false,
      };

    case "job_progress":
      return {
        id:          `${event.job_id}-progress`,
        jobId:       event.job_id,
        title:       `${jobTypeLabel(type)} — Processando`,
        description: total > 0
          ? `${pct}% · ${done}/${total} processados${fail > 0 ? ` · ${fail} falha${fail !== 1 ? "s" : ""}` : ""}`
          : `${pct}% concluído`,
        createdAt:   new Date().toISOString(),
        tone:        "info",
        progress:    pct,
        status:      "processing",
        read:        false,
      };

    case "job_done":
      return {
        id:          `${event.job_id}-done`,
        jobId:       event.job_id,
        title:       `${jobTypeLabel(type)} — ${fail > 0 ? "Concluído com erros" : "Concluído"}`,
        description: fail > 0
          ? `${done} sucesso · ${fail} falha${fail !== 1 ? "s" : ""} de ${total} total`
          : `${done} item${done !== 1 ? "s" : ""} processado${done !== 1 ? "s" : ""} com sucesso`,
        createdAt:   new Date().toISOString(),
        tone:        fail > 0 ? "warning" : "success",
        progress:    100,
        status:      "done",
        read:        false,
      };

    case "job_failed":
    default:
      return {
        id:          `${event.job_id}-failed`,
        jobId:       event.job_id,
        title:       `${jobTypeLabel(type)} — Falhou`,
        description: event.error || event.message
          ? ((event.error || event.message)!).length > 80
            ? (event.error || event.message)!.slice(0, 80) + "…"
            : (event.error || event.message)!
          : `${fail > 0 ? `${fail} item${fail !== 1 ? "s" : ""} com falha` : "Operação falhou"}`,
        createdAt:   new Date().toISOString(),
        tone:        "error",
        progress:    0,
        status:      "failed",
        read:        false,
      };
  }
}

// ─── API helpers ──────────────────────────────────────────────────────────────

function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || "";
  if (url && !url.startsWith("http://") && !url.startsWith("https://")) return `https://${url}`;
  return url;
}

/**
 * Faz parse seguro de JSON de uma Response.
 *
 * O erro "Unexpected non-whitespace character after JSON at position 4"
 * ocorre quando o servidor devolve texto que não é JSON válido (ex: "null",
 * corpo vazio, HTML de erro, ou texto com BOM/espaços extras).
 * Esta função lê o corpo como texto primeiro e só então tenta fazer parse,
 * devolvendo um objeto neutro em caso de falha em vez de lançar excepção.
 */
async function safeParseJson(response: Response): Promise<Record<string, any>> {
  let text = "";
  try {
    text = await response.text();
  } catch {
    return {};
  }

  const trimmed = text.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") {
    return {};
  }

  try {
    const parsed = JSON.parse(trimmed);
    // Se o servidor retornou um primitivo (null, number, bool) envolve num objecto
    if (parsed === null || typeof parsed !== "object") {
      return {};
    }
    return parsed as Record<string, any>;
  } catch {
    // Corpo não é JSON válido — devolve o texto bruto para diagnóstico
    return {
      _raw: trimmed,
      error: `Resposta inesperada do servidor: ${trimmed.slice(0, 120)}`,
    };
  }
}

/**
 * POST /jobs/:id/retry-failed
 *
 * Cria um novo job reenviando apenas os itens que falharam no job original.
 * Requer user_type=academia.
 *
 * A API devolve `retry_job_id` (não `job_id`) conforme a documentação.
 */
async function retryFailedViaApi(
  jobId: string,
  token: string
): Promise<{ job_id: string; retry_items: number; sse_url?: string; poll_url?: string }> {
  let r: Response;

  try {
    r = await fetch(`${getApiBaseUrl()}/jobs/${jobId}/retry-failed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (networkErr: any) {
    throw new Error(
      `Erro de rede ao submeter retry: ${networkErr?.message ?? String(networkErr)}`
    );
  }

  // Lê o corpo de forma segura (evita o erro de JSON malformado)
  const data = await safeParseJson(r);

  if (!r.ok) {
    const msg =
      data?.message ||
      data?.error ||
      data?._raw ||
      `Erro HTTP ${r.status} ao submeter retry`;
    throw new Error(msg);
  }

  // A API retorna `retry_job_id` (campo documentado na secção 17)
  // Fallback para `job_id` por compatibilidade com versões antigas
  const retryJobId: string | undefined =
    data?.retry_job_id ??
    data?.job_id ??
    undefined;

  if (!retryJobId) {
    // Job pode ter sido criado mas sem ID na resposta — avisa sem lançar erro fatal
    throw new Error(
      data?.message ||
      data?.error ||
      data?._raw ||
      "Retry submetido, mas o servidor não devolveu um job_id. Verifique as notificações."
    );
  }

  return {
    job_id:      retryJobId,
    retry_items: typeof data?.retry_items === "number" ? data.retry_items : 0,
    sse_url:     data?.sse_url,
    poll_url:    data?.poll_url,
  };
}

/**
 * DELETE /jobs/:id/sse
 * Oculta o job do stream SSE da academia autenticada.
 */
async function hideJobFromSse(jobId: string, token: string): Promise<void> {
  let r: Response;

  try {
    r = await fetch(`${getApiBaseUrl()}/jobs/${jobId}/sse`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (networkErr: any) {
    throw new Error(
      `Erro de rede ao ocultar job: ${networkErr?.message ?? String(networkErr)}`
    );
  }

  if (!r.ok) {
    const data = await safeParseJson(r);
    throw new Error(
      data?.message || data?.error || data?._raw || `Erro HTTP ${r.status}`
    );
  }
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

interface DetailModalProps {
  notif: UiNotification;
  onClose: () => void;
  onRetryStarted?: (notif: UiNotification) => void;
  onHidden?: (jobId: string) => void;
}

function DetailModal({ notif, onClose, onRetryStarted, onHidden }: DetailModalProps) {
  const [detail, setDetail]         = useState<JobDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [retrying, setRetrying]     = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retryDone, setRetryDone]   = useState(false);
  const [hiding, setHiding]         = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = tokenStorage.get();
    if (!token) { setError("Token não disponível"); setLoading(false); return; }

    jobApiService.getDetail(notif.jobId, token)
      .then(resp => {
        if (cancelled) return;
        const jobDetail: JobDetail = { ...resp.job, results: resp.results ?? [] };
        setDetail(jobDetail);
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao carregar detalhes");
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [notif.jobId]);

  const failures  = detail?.results?.filter(r => !r.sucesso) ?? [];
  const successes = detail?.results?.filter(r => r.sucesso)  ?? [];

  const isTerminal = notif.status === "done" || notif.status === "failed";

  // Pode fazer retry se:
  // - ainda não fez retry com sucesso
  // - o detail foi carregado (não null)
  // - há falhas detectadas OU o status é "failed"
  const hasFailures = failures.length > 0 || notif.status === "failed";
  const canRetry    = !retryDone && hasFailures && detail !== null;

  // ─── Retry via POST /jobs/:id/retry-failed ────────────────────────────────
  const handleRetry = async () => {
    if (!detail) return;

    const token = tokenStorage.get();
    if (!token) {
      setRetryError("Token não disponível. Faça login novamente.");
      return;
    }

    setRetrying(true);
    setRetryError(null);

    try {
      const result = await retryFailedViaApi(notif.jobId, token);
      const type = (detail as any).type as string | undefined;

      // Usa retry_items da resposta; fallback para a contagem local de falhas
      const retryCount =
        result.retry_items > 0
          ? result.retry_items
          : failures.length > 0
          ? failures.length
          : 1;

      const newNotif: UiNotification = {
        id:          `${result.job_id}-enqueued-${Date.now()}`,
        jobId:       result.job_id,
        title:       `${jobTypeLabel(type)} — Retry na fila`,
        description: `${retryCount} item${retryCount !== 1 ? "s" : ""} reenviado${retryCount !== 1 ? "s" : ""}`,
        createdAt:   new Date().toISOString(),
        tone:        "info",
        progress:    0,
        status:      "pending",
        read:        false,
      };

      onRetryStarted?.(newNotif);
      setRetryDone(true);
      onClose();
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      setRetryError(msg);
    } finally {
      setRetrying(false);
    }
  };

  // ─── Ocultar do SSE via DELETE /jobs/:id/sse ─────────────────────────────
  const handleHide = async () => {
    const token = tokenStorage.get();
    if (!token) return;

    setHiding(true);
    try {
      await hideJobFromSse(notif.jobId, token);
    } catch {
      // falha silenciosa — remove localmente de qualquer forma
    } finally {
      setHiding(false);
      onHidden?.(notif.jobId);
      onClose();
    }
  };

  const toneColor: Record<NotifTone, string> = {
    success: "#22c55e",
    error:   "#ef4444",
    warning: "#f59e0b",
    info:    "#3b82f6",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16,
          width: "100%", maxWidth: 620, maxHeight: "85vh",
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: toneColor[notif.tone], display: "inline-block", flexShrink: 0 }} />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{notif.title}</h3>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
              Job: <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{notif.jobId}</span>
              {" · "}{formatRelativeTime(notif.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 4, flexShrink: 0 }}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading && (
            <div style={{ padding: 40, textAlign: "center", color: "#475569", fontSize: 14 }}>
              Carregando detalhes…
            </div>
          )}

          {error && (
            <div style={{ padding: 24 }}>
              <div style={{ background: "#1e293b", borderRadius: 8, padding: 16, color: "#f87171", fontSize: 13 }}>
                ✗ {error}
              </div>
            </div>
          )}

          {detail && !loading && (
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Summary */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[
                  { label: "Total",   val: detail.total_items, color: "#94a3b8" },
                  { label: "Sucesso", val: detail.done_items,  color: "#22c55e" },
                  { label: "Falhas",  val: detail.fail_items,  color: detail.fail_items > 0 ? "#ef4444" : "#64748b" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#1e293b", borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {detail.error && (
                <div style={{ background: "#1e0a0a", border: "1px solid #450a0a", borderRadius: 8, padding: 14 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.05em" }}>Erro do job</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#fca5a5", lineHeight: 1.5 }}>{detail.error}</p>
                </div>
              )}

              {failures.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#f87171" }}>
                    Falhas ({failures.length})
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                    {failures.map((f, i) => {
                      const payloadAny = f.payload as any;
                      const label =
                        payloadAny?.codigo_estudante ||
                        payloadAny?.codigo_turma ||
                        payloadAny?.codigo ||
                        payloadAny?.nome ||
                        `Item #${(f.index ?? i) + 1}`;
                      const motivo =
                        f.erro ||
                        (f as any).error ||
                        (f as any).message ||
                        "Sem detalhe";
                      return (
                        <div key={i} style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px", borderLeft: "3px solid #ef4444" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#fca5a5", marginBottom: 3 }}>{label}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.4 }}>{motivo}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {successes.length > 0 && failures.length === 0 && (
                <div style={{ background: "#0a1e0f", border: "1px solid #14532d", borderRadius: 8, padding: 14 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#86efac" }}>
                    ✓ Todos os {successes.length} item{successes.length !== 1 ? "s" : ""} processados com sucesso.
                  </p>
                </div>
              )}

              {detail.results.length === 0 && (
                <div style={{ background: "#1e293b", borderRadius: 8, padding: 14, color: "#64748b", fontSize: 13 }}>
                  Nenhum resultado detalhado disponível para este job.
                </div>
              )}

              {retryError && (
                <div style={{ background: "#1e0a0a", border: "1px solid #450a0a", borderRadius: 8, padding: 12 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#fca5a5" }}>✗ {retryError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

            {/* Retry via POST /jobs/:id/retry-failed */}
            {canRetry && (
              <button
                onClick={handleRetry}
                disabled={retrying}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: retrying ? "#1e293b" : "#7c2d12",
                  color: retrying ? "#475569" : "#fed7aa",
                  border: "1px solid", borderColor: retrying ? "#334155" : "#9a3412",
                  borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600,
                  cursor: retrying ? "not-allowed" : "pointer", transition: "all 0.15s",
                }}
                title={
                  failures.length > 0
                    ? `Reenviar ${failures.length} item${failures.length !== 1 ? "s" : ""} com falha`
                    : "Reenviar itens com falha"
                }
              >
                {retrying ? (
                  <>
                    <span style={{ width: 12, height: 12, border: "2px solid #475569", borderTopColor: "#fed7aa", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                    Reenviando…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 .49-3.36" />
                    </svg>
                    Tentar novamente{failures.length > 0 ? ` (${failures.length})` : ""}
                  </>
                )}
              </button>
            )}

            {/* Ocultar do SSE — apenas para jobs terminados */}
            {isTerminal && (
              <button
                onClick={handleHide}
                disabled={hiding}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "#1e293b",
                  color: hiding ? "#475569" : "#64748b",
                  border: "1px solid #334155",
                  borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 500,
                  cursor: hiding ? "not-allowed" : "pointer", transition: "all 0.15s",
                }}
                title="Ocultar este job do stream SSE e da lista"
              >
                {hiding ? (
                  <>
                    <span style={{ width: 12, height: 12, border: "2px solid #334155", borderTopColor: "#64748b", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                    Ocultando…
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                    Ocultar
                  </>
                )}
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            style={{ background: "#1e293b", color: "#e2e8f0", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Fechar
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-1.5">
      <div
        className="h-full bg-blue-400 dark:bg-blue-500 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function NotifItem({ notif, onClick }: { notif: UiNotification; onClick: () => void }) {
  const config       = TONE_CONFIG[notif.tone];
  const isProcessing = notif.status === "processing" || notif.status === "pending";
  const isTerminal   = notif.status === "done" || notif.status === "failed";

  return (
    <DropdownItem
      onItemClick={onClick}
      className={`flex gap-3 rounded-lg border-b border-gray-100 px-4 py-3 transition-colors cursor-pointer hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.04] ${!notif.read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
    >
      <span className="flex-shrink-0 mt-1.5">
        <span className={`block h-2.5 w-2.5 rounded-full ${config.dot}`} />
      </span>

      <span className="block min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2 mb-0.5">
          <span className={`text-sm font-semibold leading-tight block ${
            notif.tone === "success" ? "text-green-700 dark:text-green-400" :
            notif.tone === "error"   ? "text-red-700 dark:text-red-400" :
            notif.tone === "warning" ? "text-orange-700 dark:text-orange-400" :
            "text-gray-800 dark:text-white/90"
          }`}>
            {notif.title}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
            {formatRelativeTime(notif.createdAt)}
          </span>
        </span>

        <span className="text-xs text-gray-500 dark:text-gray-400 break-words leading-relaxed block">
          {notif.description}
        </span>

        {isProcessing && notif.progress !== undefined && (
          <ProgressBar value={notif.progress} />
        )}

        <span className="flex items-center gap-2 mt-1.5 flex-wrap">
          {!notif.read && (
            <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${
              notif.tone === "success" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
              notif.tone === "error"   ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
              notif.tone === "warning" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
              "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            }`}>
              {config.label}
            </span>
          )}
          {isTerminal && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Ver detalhes
            </span>
          )}
        </span>
      </span>
    </DropdownItem>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NotificationDropdown() {
  const [isOpen, setIsOpen]               = useState(false);
  const [notifications, setNotifications] = useState<UiNotification[]>([]);
  const [markedReadAt, setMarkedReadAt]   = useState<number>(0);
  const [sseStatus, setSseStatus]         = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [selectedNotif, setSelectedNotif] = useState<UiNotification | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const upsertNotif = useCallback((notif: UiNotification) => {
    setNotifications(prev => {
      const isProgress = notif.status === "processing" || notif.status === "pending";
      if (isProgress) {
        const existingIdx = prev.findIndex(n => n.jobId === notif.jobId && (n.status === "processing" || n.status === "pending"));
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = notif;
          return next;
        }
      }
      if (notif.status === "done" || notif.status === "failed") {
        const existing = prev.findIndex(n => n.jobId === notif.jobId);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = notif;
          return next;
        }
      }
      return [notif, ...prev].slice(0, MAX_NOTIFICATIONS);
    });
  }, []);

  const unreadCount = useMemo(() => {
    if (markedReadAt === 0) {
      return notifications.filter(n => !n.read).length;
    }
    return notifications.filter(n => {
      if (n.read) return false;
      const createdMs = new Date(n.createdAt).getTime();
      return createdMs > markedReadAt;
    }).length;
  }, [notifications, markedReadAt]);

  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) return;

    let isMounted = true;

    (async () => {
      try {
        setSseStatus("connecting");
        const recent = await jobApiService.list(token);
        if (!isMounted) return;
        const initial = (recent.jobs || []).slice(0, 10).map(normalizeJobSummaryToNotif);
        setNotifications(initial);
      } catch {
        // histórico indisponível — continua com stream
      }

      controllerRef.current = new AbortController();
      try {
        await subscribeToJobStream({
          token,
          signal: controllerRef.current.signal,
          onEvent: (event: JobStreamEvent) => {
            if (!isMounted) return;
            setSseStatus("connected");
            upsertNotif(normalizeEventToNotif(event));
          },
          onError: () => {
            if (!isMounted) return;
            setSseStatus("disconnected");
          },
        });
      } catch {
        if (isMounted) setSseStatus("disconnected");
      }
    })();

    return () => {
      isMounted = false;
      controllerRef.current?.abort();
    };
  }, [upsertNotif]);

  const ordered = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notifications]
  );

  function handleOpen() {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      setMarkedReadAt(Date.now());
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  }

  function closeDropdown() { setIsOpen(false); }

  function handleNotifClick(notif: UiNotification) {
    closeDropdown();
    setSelectedNotif(notif);
  }

  const handleRetryStarted = useCallback((newNotif: UiNotification) => {
    upsertNotif(newNotif);
  }, [upsertNotif]);

  const handleHidden = useCallback((jobId: string) => {
    setNotifications(prev => prev.filter(n => n.jobId !== jobId));
  }, []);

  const sseIndicatorColor =
    sseStatus === "connected"  ? "bg-green-400" :
    sseStatus === "connecting" ? "bg-yellow-400 animate-pulse" :
    "bg-gray-400";

  const sseLabel =
    sseStatus === "connected"  ? "Conectado — notificações em tempo real" :
    sseStatus === "connecting" ? "Conectando…" :
    "Desconectado — atualizações em tempo real indisponíveis";

  return (
    <>
      <div className="relative">
        <button
          onClick={handleOpen}
          className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          title="Notificações de jobs"
        >
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M10.75 2.29248C10.75 1.87827 10.4142 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z" fill="currentColor" />
          </svg>
        </button>

        <Dropdown
          isOpen={isOpen}
          onClose={closeDropdown}
          className="absolute right-0 mt-[17px] flex flex-col w-[380px] max-h-[520px] rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Notificações</h5>
              {notifications.length > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {notifications.length} job{notifications.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5" title={sseLabel}>
                <span className={`block h-2 w-2 rounded-full ${sseIndicatorColor}`} />
                <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
                  {sseStatus === "connected" ? "Ao vivo" : sseStatus === "connecting" ? "Conectando" : "Offline"}
                </span>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={() => { setNotifications([]); setMarkedReadAt(0); }}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Limpar notificações"
                >
                  Limpar
                </button>
              )}
              <button onClick={closeDropdown} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors dropdown-toggle">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <ul className="flex flex-col overflow-y-auto flex-1">
            {ordered.length === 0 ? (
              <li className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <svg className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-sm font-medium text-gray-400 dark:text-gray-500">Sem notificações</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Operações em lote aparecerão aqui</p>
              </li>
            ) : (
              ordered.map(n => (
                <li key={n.id}>
                  <NotifItem notif={n} onClick={() => handleNotifClick(n)} />
                </li>
              ))
            )}
          </ul>

          {/* Footer */}
          {ordered.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                {sseStatus === "connected"
                  ? "✦ Atualizações em tempo real ativas"
                  : "Reconectando ao servidor de eventos…"}
              </p>
            </div>
          )}
        </Dropdown>
      </div>

      {/* Detail modal — rendered outside the dropdown */}
      {selectedNotif && (
        <DetailModal
          notif={selectedNotif}
          onClose={() => setSelectedNotif(null)}
          onRetryStarted={handleRetryStarted}
          onHidden={handleHidden}
        />
      )}
    </>
  );
}
