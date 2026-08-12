"use client";

import { FormEvent, useMemo, useState } from "react";
import { tokenStorage } from "@/lib/api";
import { getCookie } from "@/lib/utils/cookies";
import type { MeuPerfilResponse } from "@/types/api";

interface EnviarMensagemZiettPayload {
  remitter_id: string;
  target_e164: string;
  content: string;
}

interface EnviarMensagemZiettSuccessResponse {
  message: string;
  message_id: string;
  target_e164: string;
  channel_type: "SMS";
}

interface EnviarMensagemZiettErrorResponse {
  error: string;
  message: string;
  request_id: string;
  ziett_code?: string;
  ziett_trace_id?: string;
  details?: { field?: string; code?: string; message?: string }[];
}

type FieldErrors = Partial<Record<keyof EnviarMensagemZiettPayload, string>>;
type Attempt = {
  id: number;
  status: "success" | "error";
  target: string;
  message: string;
  timestamp: string;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TARGET_REGEX = /^9\d{8}$/;
const MAX_CONTENT_LENGTH = 1600;

function apiUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  return `${baseUrl}${path}`;
}

function readCurrentUser(): MeuPerfilResponse | null {
  const userCookie = getCookie("user");
  if (!userCookie) return null;

  try {
    return JSON.parse(userCookie) as MeuPerfilResponse;
  } catch {
    return null;
  }
}

function validatePayload(payload: EnviarMensagemZiettPayload): FieldErrors {
  const errors: FieldErrors = {};

  if (!payload.remitter_id.trim()) {
    errors.remitter_id = "Informe o remitter_id.";
  } else if (!UUID_REGEX.test(payload.remitter_id.trim())) {
    errors.remitter_id = "Use um UUID válido para o remitter_id.";
  }

  if (!payload.target_e164.trim()) {
    errors.target_e164 = "Informe o telefone de destino.";
  } else if (!TARGET_REGEX.test(payload.target_e164.trim())) {
    errors.target_e164 = "Informe exatamente 9 dígitos iniciados em 9, sem 0 inicial e sem +244.";
  }

  const content = payload.content.trim();
  if (!content) {
    errors.content = "Informe o conteúdo do SMS.";
  } else if (payload.content.length > MAX_CONTENT_LENGTH) {
    errors.content = `O conteúdo deve ter no máximo ${MAX_CONTENT_LENGTH} caracteres.`;
  }

  return errors;
}

export default function ComunicacaoPageContent() {
  const [remitterId, setRemitterId] = useState("");
  const [targetE164, setTargetE164] = useState("");
  const [content, setContent] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [enviando, setEnviando] = useState(false);
  const [success, setSuccess] = useState<EnviarMensagemZiettSuccessResponse | null>(null);
  const [requestError, setRequestError] = useState<EnviarMensagemZiettErrorResponse | null>(null);
  const [history, setHistory] = useState<Attempt[]>([]);

  const token = tokenStorage.get();
  const currentUser = readCurrentUser();
  const isFppAdmin = currentUser?.tipo === "admin" && currentUser.admin?.role === "fpp";

  const payload = useMemo<EnviarMensagemZiettPayload>(() => ({
    remitter_id: remitterId,
    target_e164: targetE164,
    content,
  }), [content, remitterId, targetE164]);

  const formErrors = useMemo(() => validatePayload(payload), [payload]);
  const isFormValid = Object.keys(formErrors).length === 0;

  const addHistory = (attempt: Omit<Attempt, "id" | "timestamp">) => {
    setHistory((items) => [
      { ...attempt, id: Date.now(), timestamp: new Date().toLocaleString("pt-AO") },
      ...items,
    ].slice(0, 5));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validatePayload(payload);
    setErrors(validationErrors);
    setSuccess(null);
    setRequestError(null);

    if (Object.keys(validationErrors).length > 0 || !token) return;

    setEnviando(true);
    const normalizedPayload: EnviarMensagemZiettPayload = {
      remitter_id: remitterId.trim(),
      target_e164: targetE164.trim(),
      content: content.trim(),
    };

    try {
      const response = await fetch(apiUrl("/integracoes/ziett/mensagens/teste"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(normalizedPayload),
      });

      const data = await response.json();

      if (response.status === 202) {
        const successData = data as EnviarMensagemZiettSuccessResponse;
        setSuccess(successData);
        addHistory({ status: "success", target: successData.target_e164, message: successData.message });
        return;
      }

      const errorData = data as EnviarMensagemZiettErrorResponse;
      setRequestError(errorData);
      addHistory({ status: "error", target: normalizedPayload.target_e164, message: errorData.message || "Falha ao enviar SMS de teste." });
    } catch (error) {
      const fallbackError: EnviarMensagemZiettErrorResponse = {
        error: "network_error",
        message: error instanceof Error ? error.message : "Não foi possível comunicar com a API.",
        request_id: "indisponível",
      };
      setRequestError(fallbackError);
      addHistory({ status: "error", target: normalizedPayload.target_e164, message: fallbackError.message });
    } finally {
      setEnviando(false);
    }
  };

  if (!token || !currentUser) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
          <h1 className="mb-2 text-xl font-semibold">Sem sessão ativa</h1>
          <p>Faça login novamente para acessar a ferramenta interna de teste de comunicação.</p>
        </div>
      </div>
    );
  }

  if (!isFppAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100">
          <h1 className="mb-2 text-xl font-semibold">Acesso restrito</h1>
          <p>Esta página é exclusiva para administradores FPP, pois dispara SMS real pela Ziett.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <p className="text-sm font-medium text-brand-500">Ferramenta interna de teste</p>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Comunicação (Teste Ziett SMS)</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Envia um SMS real pelo endpoint isolado <code className="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800">POST /integracoes/ziett/mensagens/teste</code>.
          Use apenas em ambientes de teste/desenvolvimento.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="remitter_id">Remitter ID</label>
              <input id="remitter_id" value={remitterId} onChange={(event) => setRemitterId(event.target.value)} className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="00000000-0000-4000-8000-000000000000" />
              {errors.remitter_id && <p className="mt-1 text-sm text-red-600">{errors.remitter_id}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="target_e164">Telefone de destino</label>
              <input id="target_e164" value={targetE164} onChange={(event) => setTargetE164(event.target.value.replace(/\D/g, "").slice(0, 9))} className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="923456789" inputMode="numeric" />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Apenas o número nacional, sem 0 inicial e sem +244. Ex.: 923456789</p>
              {errors.target_e164 && <p className="mt-1 text-sm text-red-600">{errors.target_e164}</p>}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="content">Conteúdo</label>
                <span className={`text-xs ${content.length > MAX_CONTENT_LENGTH ? "text-red-600" : "text-gray-500 dark:text-gray-400"}`}>{content.length} / {MAX_CONTENT_LENGTH}</span>
              </div>
              <textarea id="content" value={content} onChange={(event) => setContent(event.target.value)} rows={8} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Mensagem de teste..." />
              {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content}</p>}
            </div>

            <button type="submit" disabled={!isFormValid || enviando} className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50">
              {enviando ? "Enviando..." : "Enviar SMS de teste"}
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          {success && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-green-900 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-100">
              <h2 className="mb-2 font-semibold">Envio aceito</h2>
              <p className="text-sm">{success.message}</p>
              <dl className="mt-3 space-y-1 text-sm"><div><dt className="font-medium">Message ID</dt><dd className="break-all">{success.message_id}</dd></div><div><dt className="font-medium">Destino</dt><dd>{success.target_e164}</dd></div><div><dt className="font-medium">Canal</dt><dd>{success.channel_type}</dd></div></dl>
            </div>
          )}

          {requestError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100">
              <h2 className="mb-2 font-semibold">Falha no envio</h2>
              <p className="text-sm">{requestError.message}</p>
              <dl className="mt-3 space-y-1 text-sm">
                {requestError.ziett_code && <div><dt className="font-medium">Ziett code</dt><dd>{requestError.ziett_code}</dd></div>}
                {requestError.ziett_trace_id && <div><dt className="font-medium">Ziett trace ID</dt><dd className="break-all">{requestError.ziett_trace_id}</dd></div>}
                <div><dt className="font-medium">Request ID</dt><dd className="break-all">{requestError.request_id}</dd></div>
              </dl>
              {requestError.details?.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{requestError.details.map((detail, index) => <li key={`${detail.field ?? "detail"}-${index}`}>{detail.message ?? detail.code ?? detail.field}</li>)}</ul> : null}
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">Últimas tentativas</h2>
            {history.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma tentativa nesta sessão.</p> : (
              <ul className="space-y-3">{history.map((item) => <li key={item.id} className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800"><div className="flex items-center justify-between gap-2"><span className={item.status === "success" ? "font-medium text-green-600" : "font-medium text-red-600"}>{item.status === "success" ? "Sucesso" : "Erro"}</span><span className="text-xs text-gray-500">{item.timestamp}</span></div><p className="mt-1 text-gray-700 dark:text-gray-300">{item.target}</p><p className="text-gray-500 dark:text-gray-400">{item.message}</p></li>)}</ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
