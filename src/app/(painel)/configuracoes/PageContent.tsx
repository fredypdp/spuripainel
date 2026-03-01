"use client";

import React, { useEffect, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useApi } from "@/hooks/useApi";
import { adminService, consultasService } from "@/lib/api/services";
import { useUserCookie } from "@/hooks/useUserCookie";
import { formatAnoLetivo, gerarOpcoesAnoLetivo } from "@/types/api";
import Icon from "@/components/ui/Icon";

export default function PageContent() {
  const { user } = useUserCookie();
  const isFPP = user?.admin?.role === "fpp";

  const {
    data: anoLetivoData,
    loading: loadingAtual,
    execute: buscarAnoLetivo,
  } = useApi(consultasService.getAnoLetivoAtual);

  const {
    loading: definindo,
    error: erroDefinir,
    execute: definirAnoLetivo,
  } = useApi(adminService.definirAnoLetivo);

  // Seleção explícita do utilizador (vazia = ainda não tocou)
  const [anoSelecionado, setAnoSelecionado] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const opcoes = gerarOpcoesAnoLetivo();

  // Valor efectivo: usa a escolha do utilizador se existir,
  // caso contrário o valor actual da API.
  // Elimina a necessidade de useEffect para sincronizar estado derivado.
  const valorSelect = anoSelecionado || anoLetivoData?.ano_letivo || "";

  useEffect(() => {
    buscarAnoLetivo();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSucesso(false);
    if (!valorSelect) return;

    try {
      await definirAnoLetivo({ ano_letivo: valorSelect });
      setSucesso(true);
      // Resetar para que o select volte a reflectir o valor da API
      setAnoSelecionado("");
      buscarAnoLetivo();
      setTimeout(() => setSucesso(false), 4000);
    } catch {
      // erroDefinir já disponível via hook
    }
  }

  if (!isFPP) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Configurações" />
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-6 flex items-center gap-4">
          <span className="text-red-500 text-2xl">
            <Icon icon="mdi:lock-outline" width="28px" />
          </span>
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400">Acesso restrito</p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              Esta página está disponível apenas para administradores <strong>FPP</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Configurações do Sistema" />

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
                <p className="text-sm text-gray-400 dark:text-gray-500 italic mt-1">Não definido</p>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-3">
            Este valor é usado em todos os registros académicos do sistema (notas, faltas, inscrições, aprovações).
          </p>
        </div>

        {/* Card: Definir Ano Letivo */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-1">Definir Ano Letivo</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Selecione o ano letivo vigente. O formato é{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">AAAA/AAAA</code>{" "}
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
                <Icon icon="mdi:alert-circle-outline" width="18px" className="text-red-500 shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{erroDefinir}</p>
              </div>
            )}

            {sucesso && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
                <Icon icon="mdi:check-circle-outline" width="18px" className="text-green-500 shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-400">
                  Ano letivo <strong>{formatAnoLetivo(valorSelect)}</strong> definido com sucesso!
                </p>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={definindo || !valorSelect || valorSelect === anoLetivoData?.ano_letivo}
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
        <Icon icon="mdi:information-outline" width="18px" className="text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          A alteração do ano letivo é registada no ledger de eventos do sistema e fica associada à sua conta. Use com atenção.
        </p>
      </div>
    </div>
  );
}