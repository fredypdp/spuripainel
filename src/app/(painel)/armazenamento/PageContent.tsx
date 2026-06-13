"use client";

import React, { useEffect, useMemo, useState } from "react";
import { adminService } from "@/lib/api/services";
import { SpuriApiError } from "@/lib/api/client";
import type { StorageQuotaResponse } from "@/types/api";

const formatBytes = (bytes?: number) => {
  if (!Number.isFinite(bytes) || (bytes ?? 0) <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let value = bytes ?? 0;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toLocaleString("pt-AO", {
    maximumFractionDigits: value >= 10 || unitIndex === 0 ? 0 : 1,
  })} ${units[unitIndex]}`;
};

type QuotaErrorState = {
  message: string;
  status?: number;
  code?: string;
};

const getQuotaErrorState = (e: unknown): QuotaErrorState => {
  if (e instanceof SpuriApiError) {
    return {
      message: e.message || "Erro ao consultar quota",
      status: e.status,
      code: typeof e.data?.error === "string" ? e.data.error : undefined,
    };
  }

  return {
    message: e instanceof Error ? e.message : "Erro ao consultar quota",
  };
};

export default function PageContent() {
  const [quota, setQuota] = useState<StorageQuotaResponse | null>(null);
  const [erro, setErro] = useState<QuotaErrorState | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    adminService
      .getStorageQuota()
      .then((data) => {
        if (!ativo) return;
        setQuota(data);
        setErro(null);
      })
      .catch((e: unknown) => {
        if (!ativo) return;
        setQuota(null);
        setErro(getQuotaErrorState(e));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const percentualUsado = quota?.total_bytes
    ? Math.min(100, Math.round((quota.used_bytes / quota.total_bytes) * 100))
    : 0;

  const academias = useMemo(
    () => [...(quota?.academias ?? [])].sort((a, b) => b.used_bytes - a.used_bytes),
    [quota?.academias]
  );

  const maiorUso = academias[0]?.used_bytes ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Armazenamento</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Quota do provider externo usado pelos documentos de matrícula, com uso separado por academia quando disponível.
        </p>
      </div>

      {erro && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-200">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold">
              {erro.status === 503 || erro.code === "SERVICE_UNAVAILABLE"
                ? "Quota do Mega indisponível"
                : "Erro ao consultar quota"}
            </p>
            {(erro.status || erro.code) && (
              <span className="text-xs uppercase tracking-wide text-red-500 dark:text-red-300">
                {[erro.status && `HTTP ${erro.status}`, erro.code].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
          <p className="mt-2 leading-relaxed">{erro.message}</p>
          {(erro.status === 503 || erro.code === "SERVICE_UNAVAILABLE") && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-300">
              Verifique as variáveis MEGA_AUTH_MODE, MEGA_SESSION_ID, MEGA_MASTER_KEY, MEGA_QUOTA_LOCAL_ESTIMATE,
              MEGA_QUOTA_TOTAL_BYTES ou MEGA_QUOTA_TOTAL_GB no backend.
            </p>
          )}
        </div>
      )}

      {!carregando && quota ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm uppercase text-gray-500 dark:text-gray-400">Provider: {quota.provider}</span>
              <span className="font-semibold text-gray-900 dark:text-white">{percentualUsado}% usado</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div className="h-full bg-brand-500" style={{ width: `${percentualUsado}%` }} />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                ["Total", quota.total_human || formatBytes(quota.total_bytes)],
                ["Usado", quota.used_human || formatBytes(quota.used_bytes)],
                ["Disponível", quota.available_human || formatBytes(quota.available_bytes)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                  <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Uso por academia</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Soma dos ficheiros encontrados em cada diretório de academia no storage.
                </p>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{academias.length} academia(s)</span>
            </div>

            {academias.length > 0 ? (
              <div className="space-y-3">
                {academias.map((academia) => {
                  const largura = maiorUso ? Math.max(4, Math.round((academia.used_bytes / maiorUso) * 100)) : 0;

                  return (
                    <div key={academia.codigo_academia} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{academia.nome || academia.codigo_academia}</p>
                          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{academia.codigo_academia}</p>
                        </div>
                        <p className="whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                          {academia.used_human || formatBytes(academia.used_bytes)}
                        </p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div className="h-full bg-brand-500" style={{ width: `${largura}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                Nenhum uso por academia foi retornado pelo backend. Em ambientes sem sessão Mega, confirme se a estimativa local está ativada no servidor.
              </div>
            )}
          </div>
        </div>
      ) : carregando ? (
        <div className="h-44 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      ) : null}
    </div>
  );
}
