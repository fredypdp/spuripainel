// AcademiaSection.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useUserType } from "@/hooks/useRoutePermission";
import { academiaService, adminService } from "@/lib/api/services";
import { descreverJanelaFinalizacao, formatAnoLetivo, formatPeriodoAnoLetivo, type AnoLetivoTipo } from "@/types/api";
import Icon from "@/components/ui/Icon";
import SearchableSelect from "@/components/form/SearchableSelect";
import AcademiaCategoriesSection from "./AcademiaCategoriesSection";
import AvaliacaoFinalRulesSection from "./AvaliacaoFinalRulesSection";

const ANOS_FUNDAMENTAL = Array.from({ length: 9 }, (_, index) => `${index + 1}_ano_fundamental`);
const labelAnoFundamental = (ano: string) => ano.replace(/^(\d+)_ano_fundamental$/, "$1ª Classe");
const sortAnosFundamental = (anos: string[]) =>
  [...new Set(anos)].sort((a, b) => ANOS_FUNDAMENTAL.indexOf(a) - ANOS_FUNDAMENTAL.indexOf(b));
const getApiErrorMessage = (error: any, fallback: string) => {
  const data = error?.data ?? error?.response?.data;
  const detail = data?.details?.[0];

  if (detail?.field === "anos_academicos") {
    if (detail.code === "estudantes_ativos_vinculados") return "Não foi possível remover este ano porque existem estudantes ativos nele.";
    if (detail.code === "remocao_invalida") return "A academia precisa manter pelo menos um ano ativo.";
    if (detail.code === "formato_invalido") return "Escolha apenas anos do Ensino Primário e Iº Ciclo (1ª a 9ª Classe).";
    if (detail.code === "campo_obrigatorio") return "Selecione pelo menos um ano antes de continuar.";
  }

  if (detail?.field === "type" && detail.code === "nivel_incompativel") {
    return "Esta opção está disponível apenas para escolas com o Ensino Primário e Iº Ciclo.";
  }

  return detail?.message || data?.message || error?.message || fallback;
};

export type AcademiaSettingsSection = "ano-letivo" | "anos-academicos" | "categorias-nota" | "regras-avaliacao-final" | "all";

export default function AcademiaSection({ section = "all" }: { section?: AcademiaSettingsSection }) {
  // ── Tipo da academia (fixo — vem do perfil do utilizador) ────────────────
  const { user } = useUserType();
  // academia.nivel is 'escola' | 'superior' — NOT academia.type ('public' | 'private')
  const tipoAcademia: AnoLetivoTipo = user?.academia?.nivel === "superior" ? "superior" : "escolar";

  // ── Buscar ano letivo actual da academia ──────────────────────────────────
  const {
    data: anoLetivoData,
    loading: loadingAtual,
    execute: _buscarAnoLetivo,
  } = useApi(academiaService.getAnoLetivo);

  const buscarAnoLetivo = useCallback(() => {
    _buscarAnoLetivo();
  }, [_buscarAnoLetivo]);

  const {
    data: anoLetivoGlobalData,
    execute: buscarAnoLetivoGlobal,
  } = useApi(adminService.obterAnoLetivoGlobal);

  // ── Definir/actualizar ano letivo ─────────────────────────────────────────
  const {
    loading: definindo,
    error: erroDefinir,
    execute: definirAnoLetivo,
  } = useApi(academiaService.definirAnoLetivo);

  const { data: configuracoesData, execute: buscarConfiguracoes } = useApi(academiaService.listarConfiguracoesAnoLetivo);
  const { data: finalizacoesData, execute: buscarFinalizacoes } = useApi(academiaService.listarFinalizacoesAnoLetivo);
  const { loading: finalizando, error: erroFinalizar, execute: finalizarAnoLetivo } = useApi(academiaService.finalizarAnoLetivo);

  const [observacaoFinalizacao, setObservacaoFinalizacao] = useState("");
  const [sucessoFinalizacao, setSucessoFinalizacao] = useState(false);

  const [sucesso, setSucesso] = useState(false);
  const [anosFundamentais, setAnosFundamentais] = useState<string[]>([]);
  const [anosFundSelecionados, setAnosFundSelecionados] = useState<string[]>([]);
  const [loadingAnosFund, setLoadingAnosFund] = useState(false);
  const [erroAnosFund, setErroAnosFund] = useState("");
  const [sucessoAnosFund, setSucessoAnosFund] = useState("");

  // ── Override state: só guarda o que o utilizador alterou explicitamente ───
  const [anoDeOverride, setAnoDeOverride] = useState<string | null>(null);

  // Valores derivados
  const anoDeFromApi = anoLetivoData?.ano_letivo?.split("_")[0] ?? "";
  const anoLetivoOficial = anoLetivoGlobalData?.ano_letivo ?? anoLetivoData?.ano_letivo_oficial ?? "";
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
  const podeGuardar = !definindo && !valorAtual && !!valorFormatado && mudou;

  useEffect(() => {
    buscarAnoLetivo();
    buscarAnoLetivoGlobal(tipoAcademia).catch(() => undefined);
    buscarConfiguracoes().catch(() => undefined);
    buscarFinalizacoes().catch(() => undefined);
  }, [buscarAnoLetivo, buscarAnoLetivoGlobal, buscarConfiguracoes, buscarFinalizacoes, tipoAcademia]);

  const permiteFundamental = user?.academia?.nivel !== "superior" && ["fundamental", "misto"].includes(user?.academia?.nivel_escolar ?? "fundamental");

  const carregarAnosFundamentais = useCallback(async () => {
    if (!permiteFundamental) return;
    setLoadingAnosFund(true);
    setErroAnosFund("");
    try {
      const response = await academiaService.listarAnosAcademicos();
      setAnosFundamentais(sortAnosFundamental((response.academia?.anos_academicos ?? []).filter(ano => ano.includes("fundamental"))));
    } catch (error: any) {
      setErroAnosFund(getApiErrorMessage(error, "Não foi possível carregar os anos disponíveis."));
    } finally {
      setLoadingAnosFund(false);
    }
  }, [permiteFundamental]);

  useEffect(() => {
    carregarAnosFundamentais().catch(() => undefined);
  }, [carregarAnosFundamentais]);

  const toggleAnoFundamental = (ano: string) => {
    setAnosFundSelecionados(prev => prev.includes(ano) ? prev.filter(item => item !== ano) : [...prev, ano]);
  };

  const alterarAnosFundamentais = async (modo: "add" | "remove", anos = anosFundSelecionados) => {
    if (!anos.length) { setErroAnosFund("Selecione pelo menos um ano antes de continuar."); return; }
    if (modo === "remove" && anosFundamentais.filter(ano => !anos.includes(ano)).length === 0) {
      setErroAnosFund("A academia deve manter ao menos um ano fundamental ativo.");
      return;
    }
    setLoadingAnosFund(true);
    setErroAnosFund("");
    setSucessoAnosFund("");
    try {
      const payload = { type: "fundamental" as const, anos_academicos: sortAnosFundamental(anos) };
      const response = modo === "add"
        ? await academiaService.adicionarAnosAcademicos(payload)
        : await academiaService.removerAnosAcademicos(payload);
      setAnosFundamentais(sortAnosFundamental(response.anos_academicos ?? []));
      setAnosFundSelecionados([]);
      setSucessoAnosFund(modo === "add" ? "Anos adicionados com sucesso." : "Anos removidos com sucesso.");
    } catch (error: any) {
      setErroAnosFund(getApiErrorMessage(error, "Não foi possível salvar a alteração."));
    } finally {
      setLoadingAnosFund(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSucesso(false);
    if (!valorFormatado) return;
    try {
      await definirAnoLetivo({
        ano_letivo: valorFormatado,
      }, undefined, anoLetivoOficial || undefined);
      setSucesso(true);
      setAnoDeOverride(null);
      setTimeout(() => buscarAnoLetivo(), 3000);
      setTimeout(() => setSucesso(false), 4000);
    } catch {
      // erroDefinir disponível via hook
    }
  }

  async function handleFinalizarAnoLetivo() {
    if (!valorAtual) return;
    setSucessoFinalizacao(false);
    try {
      await finalizarAnoLetivo({
        type: tipoAcademia,
        ano_letivo: valorAtual,
        observacao: observacaoFinalizacao.trim() || undefined,
      });
      setObservacaoFinalizacao("");
      await Promise.all([buscarFinalizacoes(), buscarAnoLetivo(), buscarAnoLetivoGlobal(tipoAcademia).catch(() => undefined)]);
      setSucessoFinalizacao(true);
      setTimeout(() => setSucessoFinalizacao(false), 4000);
    } catch {
      // erroFinalizar disponível via hook
    }
  }

  const configuracaoTipo = configuracoesData?.configuracoes?.find((item) => item.type === tipoAcademia);
  const finalizacoes = finalizacoesData?.finalizacoes ?? [];
  const finalizacaoAtual = finalizacoes.find((item) => item.type === tipoAcademia && item.ano_letivo === valorAtual);
  const showAnoLetivo = section === "all" || section === "ano-letivo";
  const showAnosFundamentais = section === "all" || section === "anos-academicos";
  const showCategorias = section === "all" || section === "categorias-nota";
  const showRegras = section === "all" || section === "regras-avaliacao-final";
  const anosSelecionadosAtivos = anosFundSelecionados.filter(ano => anosFundamentais.includes(ano));
  const anosSelecionadosNovos = anosFundSelecionados.filter(ano => !anosFundamentais.includes(ano));

  return (
    <div>
      {showAnoLetivo && (
      <>
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
          O ano letivo activo é usado automaticamente em notas, faltas, avaliações e aprovações. Primeiro confirme o ano oficial do seu tipo; depois, ao encerrar o ciclo, use a finalização para a API avançar automaticamente para o próximo ano.
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
              <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Ano Letivo Atual
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

          {/* Período */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 dark:text-gray-500">
              Período:
            </span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
              {formatPeriodoAnoLetivo(configuracaoTipo?.periodo)}
            </span>
          </div>

          {/* Data de activação */}
          {anoLetivoData?.ativado_em && (
            <p className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
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
              <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
                Registros de notas, faltas e avaliações estão{" "}
                <strong>bloqueados</strong> até definir um ano letivo.
              </p>
            </div>
          )}
        </div>

        {/* Card: formulário */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-1">
            {loadingAtual ? "A carregar ano letivo" : valorAtual ? "Definir Ano Letivo Seguinte" : "Definir Ano Letivo"}
          </h3>
          {!loadingAtual && !valorAtual && anoLetivoOficial && (
            <p className="mb-4 text-sm text-brand-600 dark:text-brand-300">
              Ano letivo oficial do sistema:{" "}
              <strong>{formatAnoLetivo(anoLetivoOficial)}</strong>. Selecione-o abaixo para confirmar explicitamente a configuração da academia.
            </p>
          )}

          {!loadingAtual && !valorAtual && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
              <Icon icon="mdi:alert-outline" width="18px" className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Atenção: depois de definir o ano letivo da academia não há como voltar pela interface. Confirme o intervalo antes de guardar.
              </p>
            </div>
          )}

          {loadingAtual ? (
            <div className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ) : valorAtual ? (
            <div className="flex flex-col gap-4">
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
                    Ano letivo seguinte definido com sucesso!
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900 dark:bg-brand-900/20">
                <div className="flex items-start gap-3">
                  <Icon icon="mdi:calendar-sync-outline" width="20px" className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />
                  <div>
                    <p className="text-sm font-semibold text-brand-700 dark:text-brand-200">Como avançar para o próximo ano?</p>
                    <p className="mt-1 text-sm text-brand-700/90 dark:text-brand-300">
                      Não existe uma ação manual separada para avançar. Quando todos os lançamentos estiverem fechados, use a seção <strong>Finalização do ano letivo</strong> abaixo: a API finaliza o ano atual e já ativa automaticamente o ano seguinte.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
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
                <SearchableSelect
                  inputId="al-de"
                  value={anoDe}
                  onChange={(v) => setAnoDeOverride(v || "")}
                  isClearable={false}
                  options={[
                    { value: "", label: "Selecione" },
                    ...opcoesAnoDe.map((ano) => ({
                      value: String(ano),
                      label: `${ano}${anoDeOficial && String(ano) === anoDeOficial ? " (oficial do sistema)" : ""}${
                        valorAtual.startsWith(`${ano}_`) ? " (actual)" : ""
                      }`,
                    })),
                  ]}
                />
              </div>

              {/* Até — calculado automaticamente */}
              <div>
                <label
                  htmlFor="al-ate"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Até
                  <span className="ml-1.5 text-sm font-normal text-gray-400 dark:text-gray-500">
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
                  <span className="ml-1.5 text-sm font-normal text-gray-400 dark:text-gray-500">
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
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Icon icon="mdi:arrow-right-thin" width="14px" />
                Será configurado:{" "}
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
                    Definir ano letivo
                  </>
                )}
              </button>
            </div>
            </form>
          )}
        </div>
      </div>
      </>
      )}

      <div className="mt-6 space-y-6">
        {showAnoLetivo && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-white">
                <Icon icon="mdi:flag-checkered" width="18px" className="text-brand-500" />
                Finalização do ano letivo
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                Finalize somente depois de encerrar notas, faltas e avaliações. Esta é a ação que encerra o ano atual e avança automaticamente a academia para o próximo ano letivo, respeitando a janela operacional do período configurado.
              </p>
            </div>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Período {formatPeriodoAnoLetivo(configuracaoTipo?.periodo)}
            </span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/30">
              <p className="text-sm text-gray-500 dark:text-gray-400">Tipo aplicável</p>
              <p className="mt-1 text-lg font-bold capitalize text-gray-800 dark:text-white">{tipoAcademia}</p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Ano ativo: {valorAtual ? formatAnoLetivo(valorAtual) : "não definido"}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{descreverJanelaFinalizacao(configuracaoTipo?.periodo)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/30 lg:col-span-2">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Estado da finalização</p>
                  <p className={`mt-1 text-lg font-bold ${finalizacaoAtual?.finalizado ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {finalizacaoAtual?.finalizado ? "Finalizado" : "Pendente"}
                  </p>
                  {finalizacaoAtual?.finalizado_em && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Em {new Date(finalizacaoAtual.finalizado_em).toLocaleDateString("pt-PT")}
                    </p>
                  )}
                </div>

                {(erroFinalizar || sucessoFinalizacao) && (
                  <div className={`rounded-lg border px-4 py-3 text-sm ${erroFinalizar ? "border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400" : "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"}`}>
                    {erroFinalizar || "Ano letivo finalizado com sucesso."}
                  </div>
                )}

                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <input
                    value={observacaoFinalizacao}
                    onChange={(e) => setObservacaoFinalizacao(e.target.value)}
                    placeholder="Observação opcional sobre o encerramento"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleFinalizarAnoLetivo}
                    disabled={!valorAtual || finalizando}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {finalizando ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Icon icon="mdi:check-decagram-outline" width="18px" />}
                    Finalizar ano letivo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {showAnosFundamentais && permiteFundamental && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-white">
                  <Icon icon="mdi:school-outline" width="18px" className="text-brand-500" />
                  Anos acadêmicos
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                  Escolha quais anos do Ensino Primário e Iº Ciclo a escola oferece para novas turmas e matrículas. Ao adicionar, os anos escolhidos entram na lista. Ao remover, os registros antigos continuam guardados, mas o ano deixa de aparecer para novas atividades.
                </p>
              </div>
              <button type="button" onClick={carregarAnosFundamentais} disabled={loadingAnosFund} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                <Icon icon="mdi:refresh" width="16px" />
                Recarregar
              </button>
            </div>

            {(erroAnosFund || sucessoAnosFund) && (
              <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${erroAnosFund ? "border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400" : "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"}`}>
                {erroAnosFund || sucessoAnosFund}
              </div>
            )}

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Anos disponíveis hoje</p>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Clique em um ano desta lista se quiser removê-lo.</p>
              {loadingAnosFund ? (
                <div className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              ) : anosFundamentais.length ? (
                <div className="flex flex-wrap gap-2">
                  {anosFundamentais.map(ano => (
                    <button key={ano} type="button" onClick={() => toggleAnoFundamental(ano)} className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${anosFundSelecionados.includes(ano) ? "border-red-500 bg-red-500 text-white" : "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-900/20 dark:text-green-300"}`}>
                      {labelAnoFundamental(ano)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">Nenhum ano fundamental ativo.</p>
              )}
            </div>

            {ANOS_FUNDAMENTAL.some(ano => !anosFundamentais.includes(ano)) && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Anos que ainda podem ser adicionados</p>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Clique nos anos que a escola também passará a oferecer.</p>
                <div className="flex flex-wrap gap-2">
                  {ANOS_FUNDAMENTAL.filter(ano => !anosFundamentais.includes(ano)).map(ano => (
                    <button key={ano} type="button" onClick={() => toggleAnoFundamental(ano)} className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${anosFundSelecionados.includes(ano) ? "border-brand-500 bg-brand-500 text-white" : "border-gray-300 bg-white text-gray-700 hover:border-brand-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                      {labelAnoFundamental(ano)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {ANOS_FUNDAMENTAL.some(ano => !anosFundamentais.includes(ano)) && (
                <button type="button" onClick={() => alterarAnosFundamentais("add", anosSelecionadosNovos)} disabled={loadingAnosFund || anosSelecionadosNovos.length === 0} className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                  Adicionar selecionados
                </button>
              )}
              <button type="button" onClick={() => alterarAnosFundamentais("remove", anosSelecionadosAtivos)} disabled={loadingAnosFund || anosSelecionadosAtivos.length === 0} className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                Remover selecionados
              </button>
            </div>
          </div>
        )}

        {showCategorias && <AcademiaCategoriesSection />}
        {showRegras && <AvaliacaoFinalRulesSection />}
      </div>

    </div>
  );
}
