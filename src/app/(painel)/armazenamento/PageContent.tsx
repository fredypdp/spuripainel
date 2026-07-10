"use client";

import React, { useEffect, useMemo, useState } from "react";
import { adminService } from "@/lib/api/services";
import { SpuriApiError } from "@/lib/api/client";
import type { AccountFileUsage, StorageQuotaResponse } from "@/types/api";

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
      message: e.message || "Não foi possível consultar o espaço usado",
      status: e.status,
      code: typeof e.data?.error === "string" ? e.data.error : undefined,
    };
  }

  return {
    message: e instanceof Error ? e.message : "Não foi possível consultar o espaço usado",
  };
};

const getFriendlyErrorMessage = (erro: QuotaErrorState) => {
  if (erro.status === 503 || erro.code === "SERVICE_UNAVAILABLE") {
    return "O backend informou que a quota detalhada do storage está indisponível ou não é suportada pelo provider ativo. Peça à equipa responsável para verificar a configuração.";
  }

  return erro.message;
};

const getFileSize = (file: AccountFileUsage) => file.size_human || formatBytes(file.size_bytes);

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

  const accountFiles = useMemo(
    () => [...(quota?.account_files ?? [])].sort((a, b) => b.size_bytes - a.size_bytes),
    [quota?.account_files]
  );

  const managedFilesCount = useMemo(() => accountFiles.filter((file) => file.managed).length, [accountFiles]);
  const outsideFilesCount = accountFiles.length - managedFilesCount;
  const maiorUso = academias[0]?.used_bytes ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Armazenamento</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Veja quanto espaço os documentos ocupam no provider ativo de arquivos e identifique o que pertence às academias ou está fora delas.
        </p>
      </div>

      {erro && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-200">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold">
              {erro.status === 503 || erro.code === "SERVICE_UNAVAILABLE"
                ? "Consulta de espaço indisponível"
                : "Não foi possível consultar o espaço usado"}
            </p>
          </div>
          <p className="mt-2 leading-relaxed">{getFriendlyErrorMessage(erro)}</p>
          {(erro.status === 503 || erro.code === "SERVICE_UNAVAILABLE") && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-300">
              A configuração do armazenamento precisa ser revista pela equipa responsável antes de esta informação ficar disponível.
            </p>
          )}
        </div>
      )}

      {!carregando && quota ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm uppercase text-gray-500 dark:text-gray-400">Provider de arquivos: {quota.provider?.toUpperCase() || "Storage"}</span>
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
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {[
                ["Arquivos das academias", quota.managed_human || formatBytes(quota.managed_bytes)],
                ["Arquivos fora das academias", quota.outside_academias_human || formatBytes(quota.outside_academias_bytes)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                  <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Arquivos na pasta principal</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Lista dos arquivos conhecidos pelo provider ativo, incluindo os que ainda não estão ligados a uma academia.
                </p>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {accountFiles.length} arquivo(s) · {managedFilesCount} de academia(s) · {outsideFilesCount} fora das academias
              </span>
            </div>

            {accountFiles.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="max-h-96 overflow-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                    <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Arquivo</th>
                        <th className="px-4 py-3 font-medium">Localização</th>
                        <th className="px-4 py-3 font-medium">Origem</th>
                        <th className="px-4 py-3 text-right font-medium">Tamanho</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {accountFiles.map((file, index) => (
                        <tr key={`${file.path}-${file.name}-${index}`} className="bg-white dark:bg-gray-900">
                          <td className="max-w-xs px-4 py-3 font-medium text-gray-900 dark:text-white">{file.name || "Sem nome"}</td>
                          <td className="max-w-md truncate px-4 py-3 text-gray-500 dark:text-gray-400" title={file.path}>{file.path || "/"}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${file.managed ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}`}>
                              {file.managed ? "Academia" : "Outro arquivo"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{getFileSize(file)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                Nenhum arquivo foi encontrado pelo provider ativo. Se isto parecer incorreto, peça à equipa responsável para rever a configuração do armazenamento.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Uso por academia</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total de arquivos encontrados na pasta de cada academia.
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
                Ainda não há arquivos ligados às academias. Se isto parecer incorreto, peça à equipa responsável para rever a configuração do armazenamento.
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
