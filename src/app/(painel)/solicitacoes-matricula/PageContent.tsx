"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { academiaService, adminService, consultasService } from "@/lib/api/services";
import { useUserType } from "@/hooks/useRoutePermission";
import type {
  ListarSolicitacoesStatusAcademicoParams,
  ListarSolicitacoesStatusAcademicoResponse,
  AcademiaDetalhada,
  SolicitacaoStatusAcademico,
  SolicitacaoStatusAcademicoStatus,
  SolicitacaoStatusAcademicoTipo,
} from "@/types/api";
import Icon from "@/components/ui/Icon";
import SearchableSelect, { type SearchableSelectOption } from "@/components/form/SearchableSelect";

const statusOptions: Array<SearchableSelectOption<SolicitacaoStatusAcademicoStatus | "">> = [
  { value: "", label: "todas" },
  { value: "pendente", label: "pendente" },
  { value: "aprovada", label: "aprovada" },
  { value: "reprovada", label: "reprovada" },
  { value: "cancelada", label: "cancelada" },
];
const ordemOptions: Array<SearchableSelectOption<"recentes" | "antigas">> = [
  { value: "recentes", label: "Mais recentes" },
  { value: "antigas", label: "Mais antigas" },
];
const academiaPlaceholderOption: SearchableSelectOption<string> = { value: "", label: "Selecione uma academia" };
const ITEMS_POR_PAGINA = 50;

const botaoVoltarClassName = "inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300";

async function listarPaginaSolicitacoes(
  svc: (params?: ListarSolicitacoesStatusAcademicoParams | string) => Promise<ListarSolicitacoesStatusAcademicoResponse>,
  params: ListarSolicitacoesStatusAcademicoParams,
): Promise<ListarSolicitacoesStatusAcademicoResponse> {
  return svc({ ...params, limit: ITEMS_POR_PAGINA, offset: params.offset ?? 0 });
}

const tipoLabels: Record<SolicitacaoStatusAcademicoTipo, string> = {
  interrupcao: "Interrupção de percurso acadêmico",
  desvinculacao: "Desvinculação da academia",
  revinculacao: "Revinculação à academia",
};

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

function detalheTipo(s: SolicitacaoStatusAcademico) {
  return s.tipo_ensino ? `${tipoLabels[s.tipo]} · ${s.tipo_ensino}` : tipoLabels[s.tipo];
}

async function decidirSolicitacao(item: SolicitacaoStatusAcademico, action: "aprovar" | "reprovar", texto: string) {
  const codigo = item.codigo_estudante;
  if (action === "aprovar") {
    const data = { solicitacao_id: item.codigo_solicitacao, observacao_academia: texto.trim() || undefined };
    if (item.tipo === "interrupcao") return academiaService.aprovarInterrupcaoPercurso(codigo, data);
    if (item.tipo === "desvinculacao") return academiaService.aprovarDesvinculacao(codigo, data);
    return academiaService.aprovarRevinculacao(codigo, data);
  }

  const data = { solicitacao_id: item.codigo_solicitacao, motivo_reprovacao: texto.trim() };
  if (item.tipo === "interrupcao") return academiaService.reprovarInterrupcaoPercurso(codigo, data);
  if (item.tipo === "desvinculacao") return academiaService.reprovarDesvinculacao(codigo, data);
  return academiaService.reprovarRevinculacao(codigo, data);
}

export default function PageContent() {
  const { user } = useUserType();
  const isAdmin = user?.tipo === "admin";
  const [status, setStatus] = useState<SolicitacaoStatusAcademicoStatus | "">("pendente");
  const [ordem, setOrdem] = useState<"recentes" | "antigas">("recentes");
  const [items, setItems] = useState<SolicitacaoStatusAcademico[]>([]);
  const [academias, setAcademias] = useState<AcademiaDetalhada[]>([]);
  const [academiaSelecionada, setAcademiaSelecionada] = useState("");
  const [loadingAcademias, setLoadingAcademias] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalGeral, setTotalGeral] = useState(0);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [motivo, setMotivo] = useState<Record<string, string>>({});
  const [observacao, setObservacao] = useState<Record<string, string>>({});
  const [tipoSelecionado, setTipoSelecionado] = useState<SolicitacaoStatusAcademicoTipo | null>(null);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<string | null>(null);
  const [decidindo, setDecidindo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (isAdmin && !academiaSelecionada) {
      setItems([]);
      setTotalGeral(0);
      return;
    }

    setLoading(true);
    setErro("");
    try {
      const svc = isAdmin ? adminService.listarSolicitacoesStatusAcademico : academiaService.listarSolicitacoesStatusAcademico;
      const pagina = await listarPaginaSolicitacoes(svc, {
        status: status || undefined,
        codigo_academia: isAdmin ? academiaSelecionada : undefined,
        offset: (paginaAtual - 1) * ITEMS_POR_PAGINA,
      });
      setItems(pagina.solicitacoes ?? []);
      setTotalGeral(pagina.total_geral ?? pagina.total ?? 0);
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  }, [academiaSelecionada, isAdmin, paginaAtual, status]);

  useEffect(() => {
    if (!isAdmin) return;

    let ativo = true;
    async function carregarAcademias() {
      setLoadingAcademias(true);
      setErro("");
      try {
        const resposta = await consultasService.listarAcademias();
        if (ativo) setAcademias(resposta.academias ?? []);
      } catch (e: any) {
        if (ativo) setErro(e?.message ?? "Erro ao carregar academias");
      } finally {
        if (ativo) setLoadingAcademias(false);
      }
    }

    void carregarAcademias();
    return () => { ativo = false; };
  }, [isAdmin]);

  useEffect(() => { if (user?.tipo && (!isAdmin || academiaSelecionada)) void carregar(); }, [academiaSelecionada, isAdmin, user?.tipo, carregar]);
  useEffect(() => { setPaginaAtual(1); setOrdem("recentes"); setTipoSelecionado(null); setSolicitacaoSelecionada(null); }, [status]);
  useEffect(() => { setPaginaAtual(1); setOrdem("recentes"); setTipoSelecionado(null); setSolicitacaoSelecionada(null); setItems([]); setTotalGeral(0); }, [academiaSelecionada]);

  const academiaOptions = useMemo<Array<SearchableSelectOption<string>>>(() => [
    academiaPlaceholderOption,
    ...academias.map((academia) => ({
      value: academia.codigo_academia,
      label: academia.nome ? `${academia.codigo_academia} · ${academia.nome}` : academia.codigo_academia,
    })),
  ], [academias]);

  const tipos = useMemo(() => Array.from(new Set(items.map((item) => item.tipo))), [items]);

  const solicitacoesDoTipo = useMemo(() => {
    if (!tipoSelecionado) return [];
    return items
      .filter((item) => item.tipo === tipoSelecionado)
      .sort((a, b) => {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return ordem === "recentes" ? -diff : diff;
      });
  }, [items, tipoSelecionado, ordem]);

  const totalPaginas = Math.max(1, Math.ceil(totalGeral / ITEMS_POR_PAGINA));

  const mudarPagina = useCallback((pagina: number) => {
    setOrdem("recentes");
    setTipoSelecionado(null);
    setSolicitacaoSelecionada(null);
    setPaginaAtual(pagina);
  }, []);

  const solicitacao = useMemo(
    () => items.find((item) => item.codigo_solicitacao === solicitacaoSelecionada) ?? null,
    [items, solicitacaoSelecionada]
  );

  async function aprovar(item: SolicitacaoStatusAcademico) {
    setDecidindo(`${item.codigo_solicitacao}:aprovar`);
    setErro("");
    setMensagem("");
    try {
      await decidirSolicitacao(item, "aprovar", observacao[item.codigo_solicitacao] ?? "");
      setMensagem("Solicitação aprovada com sucesso.");
      await carregar();
      setSolicitacaoSelecionada(null);
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível aprovar a solicitação.");
    } finally {
      setDecidindo(null);
    }
  }

  async function reprovar(item: SolicitacaoStatusAcademico) {
    const m = motivo[item.codigo_solicitacao]?.trim();
    if (!m) return alert("Informe o motivo da reprovação.");
    setDecidindo(`${item.codigo_solicitacao}:reprovar`);
    setErro("");
    setMensagem("");
    try {
      await decidirSolicitacao(item, "reprovar", m);
      setMensagem("Solicitação reprovada com sucesso.");
      await carregar();
      setSolicitacaoSelecionada(null);
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível reprovar a solicitação.");
    } finally {
      setDecidindo(null);
    }
  }

  if (loading && !isAdmin) return <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Solicitações de status acadêmico</h1>
          <p className="text-sm text-gray-500">Analise pedidos de interrupção, desvinculação e revinculação criados pelo estudante.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <div className="w-72">
              <SearchableSelect
                value={academiaSelecionada}
                options={academiaOptions}
                onChange={setAcademiaSelecionada}
                placeholder="Selecione uma academia"
                isDisabled={loadingAcademias}
                isSearchable={false}
              />
            </div>
          )}
          <div className="w-44 capitalize">
            <SearchableSelect value={status} options={statusOptions} onChange={(value) => setStatus(value as SolicitacaoStatusAcademicoStatus | "")} isSearchable={false} />
          </div>
        </div>
      </div>

      {mensagem && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{mensagem}</p>}
      {erro && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{erro}</p>}

      {loading && <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />}

      {isAdmin && !academiaSelecionada && !loading && (
        <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">Selecione uma academia para consultar as solicitações.</p>
      )}

      {!loading && (!isAdmin || academiaSelecionada) && !tipoSelecionado && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tipos.length === 0 ? <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">Nenhuma solicitação encontrada.</p> : tipos.map((tipo) => {
            const total = items.filter((item) => item.tipo === tipo).length;
            return (
              <button key={tipo} type="button" onClick={() => setTipoSelecionado(tipo)} className="rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:border-brand-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <Icon icon="mdi:file-document-edit-outline" className="mb-3 text-brand-500" width={24} />
                <h2 className="font-semibold text-gray-900 dark:text-white">{tipoLabels[tipo]}</h2>
                <p className="mt-1 text-sm text-gray-500">{total} solicitação(ões)</p>
              </button>
            );
          })}
        </div>
      )}

      {!loading && tipoSelecionado && !solicitacao && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => setTipoSelecionado(null)} className={botaoVoltarClassName}><Icon icon="mdi:arrow-left" width={18} /> Voltar para tipos de solicitação</button>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{tipoLabels[tipoSelecionado]}</h2>
              <div className="w-44"><SearchableSelect value={ordem} options={ordemOptions} onChange={(value) => setOrdem(value as "recentes" | "antigas")} isSearchable={false} /></div>
            </div>
          </div>
          {solicitacoesDoTipo.length === 0 ? <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">Nenhuma solicitação deste tipo.</p> : (
            <div className="grid gap-3">
              {solicitacoesDoTipo.map((s) => (
                <button key={s.codigo_solicitacao} type="button" onClick={() => setSolicitacaoSelecionada(s.codigo_solicitacao)} className="rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold text-gray-900 dark:text-white">{s.estudante_nome || s.codigo_estudante}</h3><p className="text-sm text-gray-500">{s.codigo_solicitacao} · {s.codigo_academia}{s.academia_nome ? ` · ${s.academia_nome}` : ""}</p></div><span className="h-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize dark:bg-gray-800">{s.status}</span></div>
                  <p className="mt-3 text-sm text-gray-500">Criada em {formatDateTime(s.created_at)} · {detalheTipo(s)}</p>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {!loading && totalPaginas > 1 && !solicitacao && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-600 dark:text-gray-300">
          <button type="button" onClick={() => mudarPagina(Math.max(1, paginaAtual - 1))} disabled={paginaAtual === 1} className="rounded-lg border border-gray-200 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700">Anterior</button>
          <span>Página {paginaAtual} de {totalPaginas}</span>
          <button type="button" onClick={() => mudarPagina(Math.min(totalPaginas, paginaAtual + 1))} disabled={paginaAtual === totalPaginas} className="rounded-lg border border-gray-200 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700">Próxima</button>
        </div>
      )}

      {!loading && solicitacao && (
        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <button type="button" onClick={() => setSolicitacaoSelecionada(null)} className={botaoVoltarClassName}><Icon icon="mdi:arrow-left" width={18} /> Voltar para solicitações de {tipoSelecionado ? tipoLabels[tipoSelecionado] : "status"}</button>
          <div className="flex flex-wrap justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-800"><div><h2 className="text-xl font-semibold text-gray-900 dark:text-white">{solicitacao.estudante_nome || solicitacao.codigo_estudante}</h2><p className="text-sm text-gray-500">{solicitacao.codigo_solicitacao} · {solicitacao.codigo_academia}{solicitacao.academia_nome ? ` · ${solicitacao.academia_nome}` : ""}</p></div><span className="h-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize dark:bg-gray-800">{solicitacao.status}</span></div>
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <Info label="Tipo" value={detalheTipo(solicitacao)} />
            <Info label="Código do estudante" value={solicitacao.codigo_estudante} />
            <Info label="Criada em" value={formatDateTime(solicitacao.created_at)} />
            <Info label="Atualizada em" value={formatDateTime(solicitacao.updated_at)} />
            <Info label="Observação da academia" value={solicitacao.observacao_academia || "-"} />
            <Info label="Motivo da reprovação" value={solicitacao.motivo_reprovacao || "-"} />
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-950 dark:text-gray-300"><span className="block text-xs font-semibold uppercase text-gray-500">Motivo do estudante</span>{solicitacao.motivo}</div>
          {!isAdmin && solicitacao.status === "pendente" && <div className="grid gap-2 border-t border-gray-100 pt-4 dark:border-gray-800 md:grid-cols-2"><input placeholder="Observação da academia (opcional)" className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" onChange={(e) => setObservacao((p) => ({ ...p, [solicitacao.codigo_solicitacao]: e.target.value }))} /><button disabled={decidindo === `${solicitacao.codigo_solicitacao}:aprovar`} onClick={() => aprovar(solicitacao)} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Aprovar solicitação</button><input placeholder="Motivo da reprovação" className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" onChange={(e) => setMotivo((p) => ({ ...p, [solicitacao.codigo_solicitacao]: e.target.value }))} /><button disabled={decidindo === `${solicitacao.codigo_solicitacao}:reprovar`} onClick={() => reprovar(solicitacao)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Reprovar</button></div>}
        </section>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-950"><span className="block text-xs text-gray-500">{label}</span><b className="text-gray-800 dark:text-white/90">{value}</b></div>;
}
