"use client";

import React, { useEffect, useMemo, useState } from "react";
import { adminService } from "@/lib/api/services";
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

export default function PageContent() {
  const [quota, setQuota] = useState<StorageQuotaResponse | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    adminService
      .getStorageQuota()
      .then(setQuota)
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : "Erro ao consultar quota";
        setErro(message);
      });
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

      {erro && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">{erro}</p>}

      {quota ? (
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
      ) : (
        <div className="h-44 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      )}
    </div>
  );
}
