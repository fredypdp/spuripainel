// AcademiaSection.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useUserType } from "@/hooks/useRoutePermission";
import { academiaService } from "@/lib/api/services";
import { formatAnoLetivo } from "@/types/api";
import Icon from "@/components/ui/Icon";

export default function AcademiaSection() {
  // ── Tipo da academia (fixo — vem do perfil do utilizador) ────────────────
  const { user } = useUserType();
  // academia.nivel is 'escola' | 'superior' — NOT academia.type ('public' | 'private')
  const tipoAcademia = (user?.academia?.nivel ?? "escola") as "escola" | "superior";

  // ── Buscar ano letivo actual da academia ──────────────────────────────────
  const {
    data: anoLetivoData,
    loading: loadingAtual,
    execute: _buscarAnoLetivo,
  } = useApi(academiaService.getAnoLetivo);

  const buscarAnoLetivo = useCallback(() => {
    _buscarAnoLetivo();
  }, [_buscarAnoLetivo]);

  // ── Definir/actualizar ano letivo ─────────────────────────────────────────
  const {
    loading: definindo,
    error: erroDefinir,
    execute: definirAnoLetivo,
  } = useApi(academiaService.definirAnoLetivo);

  const [sucesso, setSucesso] = useState(false);

  // ── Override state: só guarda o que o utilizador alterou explicitamente ───
  const [anoDeOverride, setAnoDeOverride] = useState<string | null>(null);

  // Valores derivados
  const anoDeFromApi = anoLetivoData?.ano_letivo?.split("_")[0] ?? "";
  const anoLetivoOficial = anoLetivoData?.ano_letivo_oficial ?? "";
  const anoDeOficial = anoLetivoOficial?.split("_")[0] ?? "";
  const anoDe = anoDeOverride ?? anoDeFromApi;

  // ── Dropdown "De" + campo "Até" calculado automaticamente ─────────────────
  const anoAtual = new Date().getFullYear();
  const opcoesAnoDe = anoDeOficial
    ? [Number(anoDeOficial)]
    : Array.from({ length: 11 }, (_, i) => anoAtual - 10 + i);

  const anoAteCalculado = anoDe ? String(parseInt(anoDe) + 1) : "";
  const valorFormatado = anoDe ? `${anoDe}_${anoAteCalculado}` : "";
  const valorAtual = anoLetivoData?.ano_letivo ?? "";
  const tipoAtual = anoLetivoData?.tipo ?? "";

  // Considera mudança no ano OU se o tipo guardado na API difere do tipo da academia
  const mudou =
    valorFormatado !== valorAtual || tipoAcademia !== tipoAtual;
  const podeGuardar = !definindo && !!valorFormatado && mudou;

  useEffect(() => {
    buscarAnoLetivo();
  }, [buscarAnoLetivo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSucesso(false);
    if (!valorFormatado) return;
    try {
      await definirAnoLetivo({
        ano_letivo: valorFormatado,
        tipo: tipoAcademia,
      }, undefined, anoLetivoOficial || undefined);
      setSucesso(true);
      setAnoDeOverride(null);
      setTimeout(() => buscarAnoLetivo(), 3000);
      setTimeout(() => setSucesso(false), 4000);
    } catch {
      // erroDefinir disponível via hook
    }
  }

  return (
    <div>
      {/* ── Cabeçalho da secção ──────────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-500/10">
            <Icon
              icon="mdi:calendar-clock-outline"
              width="16px"
              className="text-brand-500"
            />
          </span>
          Ano Letivo
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
          O ano letivo activo é usado automaticamente em todos os registros da
          sua academia — notas, faltas, avaliações e aprovações. Sem ele
          configurado, esses registros ficam bloqueados.
        </p>
      </div>

      {/* ── Grid: card de estado + card de formulário ────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Card: estado actual */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                anoLetivoData?.ano_letivo
                  ? "bg-green-50 dark:bg-green-500/10 text-green-500"
                  : "bg-amber-50 dark:bg-amber-500/10 text-amber-500"
              }`}
            >
              <Icon
                icon={
                  anoLetivoData?.ano_letivo
                    ? "mdi:calendar-check-outline"
                    : "mdi:calendar-alert-outline"
                }
                width="22px"
              />
            </span>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Ano Letivo Activo
              </p>
              {loadingAtual ? (
                <div className="h-6 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mt-1" />
              ) : anoLetivoData?.ano_letivo ? (
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {formatAnoLetivo(anoLetivoData.ano_letivo)}
                </p>
              ) : (
                <p className="text-sm text-amber-500 dark:text-amber-400 font-medium mt-1">
                  Não configurado
                </p>
              )}
            </div>
          </div>

          {/* Tipo */}
          {anoLetivoData?.tipo && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Tipo:
              </span>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded capitalize">
                {anoLetivoData.tipo}
              </span>
            </div>
          )}

          {/* Data de activação */}
          {anoLetivoData?.ativado_em && (
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
              <Icon icon="mdi:clock-outline" width="12px" />
              Definido em{" "}
              {new Date(anoLetivoData.ativado_em).toLocaleDateString("pt-PT", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}

          {/* Alerta quando não configurado */}
          {!loadingAtual && !anoLetivoData?.ano_letivo && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2.5 flex items-start gap-2">
              <Icon
                icon="mdi:alert-outline"
                width="14px"
                className="text-amber-500 shrink-0 mt-0.5"
              />
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                Registros de notas, faltas e avaliações estão{" "}
                <strong>bloqueados</strong> até definir um ano letivo.
              </p>
            </div>
          )}
        </div>

        {/* Card: formulário */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-1">
            {valorAtual ? "Actualizar Ano Letivo" : "Definir Ano Letivo"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Selecione o intervalo. O formato enviado ao sistema é{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">
              AAAA_AAAA
            </code>{" "}
            (ex: 2025_2026).
          </p>
          {anoLetivoOficial && (
            <p className="mb-4 text-xs text-brand-600 dark:text-brand-300">
              Ano letivo oficial do sistema:{" "}
              <strong>{formatAnoLetivo(anoLetivoOficial)}</strong>. A academia
              só pode definir este mesmo valor.
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Linha: De + Até + Tipo (read-only) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* De */}
              <div>
                <label
                  htmlFor="al-de"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  De
                </label>
                <select
                  id="al-de"
                  value={anoDe}
                  onChange={(e) => setAnoDeOverride(e.target.value)}
                  disabled={!!anoDeOficial}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                >
                  <option value="">Selecione</option>
                  {opcoesAnoDe.map((ano) => (
                    <option key={ano} value={String(ano)}>
                      {ano}
                      {anoDeOficial && String(ano) === anoDeOficial ? " (oficial do sistema)" : ""}
                      {valorAtual.startsWith(`${ano}_`) ? " (actual)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Até — calculado automaticamente */}
              <div>
                <label
                  htmlFor="al-ate"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Até
                  <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-gray-500">
                    (automático)
                  </span>
                </label>
                <div
                  id="al-ate"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 px-3 py-2.5 text-sm select-none"
                >
                  {anoAteCalculado || (
                    <span className="text-gray-300 dark:text-gray-600 italic">
                      —
                    </span>
                  )}
                </div>
              </div>

              {/* Tipo — read-only, derivado do nivel da academia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Tipo
                  <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-gray-500">
                    (definido pela academia)
                  </span>
                </label>
                <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-2.5 text-sm flex items-center gap-2 select-none">
                  <Icon
                    icon={
                      tipoAcademia === "superior"
                        ? "mdi:school-outline"
                        : "mdi:book-education-outline"
                    }
                    width="16px"
                    className="text-brand-500 shrink-0"
                  />
                  <span className="text-gray-700 dark:text-gray-300 capitalize font-medium">
                    {tipoAcademia}
                  </span>
                </div>
              </div>
            </div>

            {/* Preview */}
            {valorFormatado && (
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Icon icon="mdi:arrow-right-thin" width="14px" />
                Será enviado:{" "}
                <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono">
                  {valorFormatado}
                </code>
                <span className="text-gray-400 dark:text-gray-500">
                  ({formatAnoLetivo(valorFormatado)})
                </span>
              </p>
            )}

            {/* Erro */}
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

            {/* Sucesso */}
            {sucesso && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
                <Icon
                  icon="mdi:check-circle-outline"
                  width="18px"
                  className="text-green-500 shrink-0"
                />
                <p className="text-sm text-green-700 dark:text-green-400">
                  Ano letivo{" "}
                  <strong>{formatAnoLetivo(valorFormatado)}</strong> definido
                  com sucesso!
                </p>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={!podeGuardar}
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

      {/* Nota informativa */}
      <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10 px-5 py-3 flex items-start gap-3">
        <Icon
          icon="mdi:information-outline"
          width="18px"
          className="text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0"
        />
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          A alteração do ano letivo é registada no ledger de eventos e fica
          associada à sua conta. O novo valor entra em vigor imediatamente para
          todos os registros subsequentes da sua academia.
        </p>
      </div>
    </div>
  );
}
