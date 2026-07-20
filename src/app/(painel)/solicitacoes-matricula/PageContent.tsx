"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { academiaService, adminService, documentosService } from "@/lib/api/services";
import { tokenStorage } from "@/lib/api/client";
import { useUserType } from "@/hooks/useRoutePermission";
import type { ListarSolicitacoesMatriculaParams, ListarSolicitacoesMatriculaResponse, SolicitacaoMatricula, SolicitacaoMatriculaStatus } from "@/types/api";
import Icon from "@/components/ui/Icon";
import SearchableSelect, { type SearchableSelectOption } from "@/components/form/SearchableSelect";

const statusOptions: Array<SearchableSelectOption<SolicitacaoMatriculaStatus | "">> = [
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
const ITEMS_POR_PAGINA = 50;

const botaoVoltarClassName = "inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300";

async function listarTodasSolicitacoes(
  svc: (params?: ListarSolicitacoesMatriculaParams | string) => Promise<ListarSolicitacoesMatriculaResponse>,
  params: ListarSolicitacoesMatriculaParams,
): Promise<SolicitacaoMatricula[]> {
  let offset = 0;
  const solicitacoes: SolicitacaoMatricula[] = [];

  while (true) {
    const pagina = await svc({ ...params, limit: ITEMS_POR_PAGINA, offset });
    const itens = pagina.solicitacoes ?? [];
    solicitacoes.push(...itens);

    const totalGeral = (pagina as any).total_geral;
    if ((typeof totalGeral === 'number' && solicitacoes.length >= totalGeral) || itens.length < ITEMS_POR_PAGINA) break;
    offset += ITEMS_POR_PAGINA;
  }

  return solicitacoes;
}
const docLabels: Record<string, string> = {
  bi_estudante: "BI do estudante",
  bi_encarregado: "BI do encarregado de educação",
  cedula: "Cédula do estudante",
  cedula_estudante: "Cédula do estudante",
  declaracao: "Declaração",
  certificado_6_ano_fundamental: "Certificado do 6.º ano",
  certificado_9_ano_fundamental: "Certificado do 9.º ano",
  certificado_ensino_medio: "Certificado do ensino médio",
};

function anoValue(s: SolicitacaoMatricula) {
  return s.ano_escolar_fundamental || s.ano_escolar_medio || s.ano_superior || "sem_ano";
}

function anoLabel(value?: string) {
  if (!value || value === "sem_ano") return "Ano não informado";
  const match = value.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!match) return value.replace(/_/g, " ");
  const nivel = match[2] === "medio" ? "Médio" : match[2] === "superior" ? "Superior" : "Fundamental";
  return `${match[1]}º Ano ${nivel}`;
}

function anoOrder(value: string) {
  const match = value.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!match) return 9999;
  const nivelOrder = match[2] === "fundamental" ? 0 : match[2] === "medio" ? 1 : 2;
  return nivelOrder * 100 + Number(match[1]);
}

function documentoNome(campo: string, fileUrl?: string) {
  const origem = (fileUrl || '').split('?')[0].split('#')[0];
  const ultimoSegmento = origem.split('/').filter(Boolean).pop();
  if (!ultimoSegmento) return `${docLabels[campo] || campo}.pdf`;
  try { return decodeURIComponent(ultimoSegmento); }
  catch { return ultimoSegmento; }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-PT");
}
function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

export default function PageContent() {
  const { user } = useUserType();
  const isAdmin = user?.tipo === "admin";
  const [status, setStatus] = useState<SolicitacaoMatriculaStatus | "">("pendente");
  const [ordem, setOrdem] = useState<"recentes" | "antigas">("recentes");
  const [items, setItems] = useState<SolicitacaoMatricula[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [motivo, setMotivo] = useState<Record<string, string>>({});
  const [anoSelecionado, setAnoSelecionado] = useState<string | null>(null);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<string | null>(null);
  const [documentoBaixando, setDocumentoBaixando] = useState<string | null>(null);
  const [documentoAbrindo, setDocumentoAbrindo] = useState<string | null>(null);
  const [documentoAberto, setDocumentoAberto] = useState<{ titulo: string; url: string } | null>(null);
  const [solicitacaoSemelhanteAbrindo, setSolicitacaoSemelhanteAbrindo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const svc = isAdmin ? adminService.listarSolicitacoesMatricula : academiaService.listarSolicitacoesMatricula;
      const solicitacoes = await listarTodasSolicitacoes(svc, { status: status || undefined });
      setItems(solicitacoes);
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, status]);

  useEffect(() => { if (user?.tipo) carregar(); }, [user?.tipo, carregar]);
  useEffect(() => { setAnoSelecionado(null); setSolicitacaoSelecionada(null); setDocumentoAberto((atual) => { if (atual?.url) URL.revokeObjectURL(atual.url); return null; }); }, [status]);
  useEffect(() => () => { if (documentoAberto?.url) URL.revokeObjectURL(documentoAberto.url); }, [documentoAberto?.url]);

  const anos = useMemo(() => {
    const values = new Set<string>(items.map(anoValue));
    if (!isAdmin) (user?.academia?.anos_academicos ?? []).forEach((ano) => values.add(ano));
    return Array.from(values).sort((a, b) => anoOrder(a) - anoOrder(b));
  }, [items, isAdmin, user?.academia?.anos_academicos]);

  const solicitacoesDoAno = useMemo(() => {
    if (!anoSelecionado) return [];
    return items
      .filter((item) => anoValue(item) === anoSelecionado)
      .sort((a, b) => {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return ordem === "recentes" ? -diff : diff;
      });
  }, [items, anoSelecionado, ordem]);

  const solicitacao = useMemo(
    () => items.find((item) => item.codigo_solicitacao === solicitacaoSelecionada) ?? null,
    [items, solicitacaoSelecionada]
  );

  async function aprovar(codigo: string) { await academiaService.aprovarSolicitacaoMatricula(codigo); await carregar(); }
  async function obterBlobDocumento(codigo: string, campo: string, downloadUrl?: string) {
    const token = tokenStorage.get() || undefined;
    if (downloadUrl) return documentosService.baixarDocumentoSolicitacaoMatriculaPorUrl(downloadUrl, token);
    return documentosService.baixarDocumentoSolicitacaoMatricula(codigo, campo, token);
  }
  async function baixarDocumento(codigo: string, campo: string, fileUrl?: string, downloadUrl?: string) {
    setDocumentoBaixando(`${codigo}:${campo}`);
    setErro("");
    try {
      const blob = await obterBlobDocumento(codigo, campo, downloadUrl);
      downloadBlob(blob, documentoNome(campo, fileUrl));
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível baixar o documento.");
    } finally {
      setDocumentoBaixando(null);
    }
  }
  async function abrirDocumento(codigo: string, campo: string, downloadUrl?: string) {
    setDocumentoAbrindo(`${codigo}:${campo}`);
    setErro("");
    try {
      const blob = await obterBlobDocumento(codigo, campo, downloadUrl);
      const url = URL.createObjectURL(blob);
      setDocumentoAberto((atual) => { if (atual?.url) URL.revokeObjectURL(atual.url); return { titulo: docLabels[campo] || campo, url }; });
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível abrir o PDF do documento.");
    } finally {
      setDocumentoAbrindo(null);
    }
  }

  async function abrirSolicitacaoSemelhante(codigo: string) {
    setSolicitacaoSemelhanteAbrindo(codigo);
    setErro("");
    try {
      let encontrada = items.find((item) => item.codigo_solicitacao === codigo);

      if (!encontrada) {
        const svc = isAdmin ? adminService.listarSolicitacoesMatricula : academiaService.listarSolicitacoesMatricula;
        const novasSolicitacoes = await listarTodasSolicitacoes(svc, {});
        setItems(novasSolicitacoes);
        encontrada = novasSolicitacoes.find((item) => item.codigo_solicitacao === codigo);
      }

      if (!encontrada && !isAdmin) {
        const response = await academiaService.consultarSolicitacaoMatricula(codigo);
        encontrada = response.solicitacao;
        setItems((atuais) => atuais.some((item) => item.codigo_solicitacao === codigo) ? atuais : [...atuais, encontrada!]);
      }

      if (!encontrada) {
        setErro("Não foi possível abrir a solicitação semelhante. Ela pode estar fora do seu escopo de acesso.");
        return;
      }

      setAnoSelecionado(anoValue(encontrada));
      setSolicitacaoSelecionada(encontrada.codigo_solicitacao);
      setDocumentoAberto((atual) => { if (atual?.url) URL.revokeObjectURL(atual.url); return null; });
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível abrir a solicitação semelhante.");
    } finally {
      setSolicitacaoSemelhanteAbrindo(null);
    }
  }

  async function reprovar(codigo: string) {
    const m = motivo[codigo]?.trim();
    if (!m) return alert("Informe o motivo da reprovação.");
    await academiaService.reprovarSolicitacaoMatricula(codigo, { motivo_reprovacao: m });
    await carregar();
  }

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Solicitações de matrícula</h1>
          <p className="text-sm text-gray-500">Entre em cada ano acadêmico para ver as solicitações e abrir os detalhes completos.</p>
        </div>
        <div className="w-44 capitalize">
          <SearchableSelect
            value={status}
            options={statusOptions}
            onChange={(value) => setStatus(value as SolicitacaoMatriculaStatus | "")}
            isSearchable={false}
          />
        </div>
      </div>

      {erro && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{erro}</p>}

      {!anoSelecionado && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {anos.length === 0 ? <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">Nenhum ano acadêmico encontrado.</p> : anos.map((ano) => {
            const total = items.filter((item) => anoValue(item) === ano).length;
            return (
              <button key={ano} type="button" onClick={() => setAnoSelecionado(ano)} className="rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:border-brand-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <Icon icon="mdi:calendar-blank-outline" className="mb-3 text-brand-500" width={24} />
                <h2 className="font-semibold text-gray-900 dark:text-white">{anoLabel(ano)}</h2>
                <p className="mt-1 text-sm text-gray-500">{total} solicitação(ões)</p>
              </button>
            );
          })}
        </div>
      )}

      {anoSelecionado && !solicitacao && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => setAnoSelecionado(null)} className={botaoVoltarClassName}><Icon icon="mdi:arrow-left" width={18} /> Voltar para anos acadêmicos</button>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{anoLabel(anoSelecionado)}</h2>
              <div className="w-44">
                <SearchableSelect
                  value={ordem}
                  options={ordemOptions}
                  onChange={(value) => setOrdem(value as "recentes" | "antigas")}
                  isSearchable={false}
                />
              </div>
            </div>
          </div>
          {solicitacoesDoAno.length === 0 ? <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">Nenhuma solicitação neste ano acadêmico.</p> : (
            <div className="grid gap-3">
              {solicitacoesDoAno.map((s) => (
                <button key={s.codigo_solicitacao} type="button" onClick={() => setSolicitacaoSelecionada(s.codigo_solicitacao)} className="rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold text-gray-900 dark:text-white">{s.nome}</h3><p className="text-sm text-gray-500">{s.codigo_solicitacao} · {s.codigo_academia}{s.academia_nome ? ` · ${s.academia_nome}` : ""}</p></div><span className="h-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize dark:bg-gray-800">{s.status}</span></div>
                  <p className="mt-3 text-sm text-gray-500">Criada em {formatDateTime(s.created_at)} · {s.curso_medio_nome || s.curso_superior_nome || anoLabel(anoValue(s))}</p>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {solicitacao && (
        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <button type="button" onClick={() => setSolicitacaoSelecionada(null)} className={botaoVoltarClassName}><Icon icon="mdi:arrow-left" width={18} /> Voltar para solicitações de {anoLabel(anoSelecionado ?? undefined)}</button>
          <div className="flex flex-wrap justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-800"><div><h2 className="text-xl font-semibold text-gray-900 dark:text-white">{solicitacao.nome}</h2><p className="text-sm text-gray-500">{solicitacao.codigo_solicitacao} · {solicitacao.codigo_academia}{solicitacao.academia_nome ? ` · ${solicitacao.academia_nome}` : ""}</p></div><span className="h-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize dark:bg-gray-800">{solicitacao.status}</span></div>
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <Info label="Ano acadêmico" value={anoLabel(anoValue(solicitacao))} />
            <Info label="Curso" value={solicitacao.curso_medio_nome || solicitacao.curso_superior_nome || "Não se aplica"} />
            <Info label="Data de nascimento" value={formatDate(solicitacao.data_nascimento)} />
            <Info label="Género" value={solicitacao.genero} />
            <Info label="Telefone" value={solicitacao.telefone || "-"} />
            <Info label="Email" value={solicitacao.email || "-"} />
            <Info label="BI estudante" value={solicitacao.bilhete_identidade || "-"} />
            <Info label="BI encarregado de educação" value={solicitacao.bilhete_identidade_encarregado || "-"} />
            <Info label="Criada em" value={formatDateTime(solicitacao.created_at)} />
          </div>
          {solicitacao.solicitacoes_semelhantes?.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
              <h4 className="mb-2 text-xs font-semibold uppercase text-amber-700 dark:text-amber-300">Solicitações semelhantes</h4>
              <p className="mb-2 text-xs text-amber-700/80 dark:text-amber-200/80">O backend identificou outras solicitações possivelmente relacionadas a este estudante.</p>
              <div className="flex flex-wrap gap-2">
                {solicitacao.solicitacoes_semelhantes.map((codigo) => (
                  <button
                    key={codigo}
                    type="button"
                    onClick={() => abrirSolicitacaoSemelhante(codigo)}
                    disabled={solicitacaoSemelhanteAbrindo === codigo}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-wait disabled:opacity-70 dark:border-amber-800 dark:bg-gray-900 dark:text-amber-200 dark:hover:bg-amber-950"
                    title={`Abrir solicitação ${codigo}`}
                  >
                    <Icon icon={solicitacaoSemelhanteAbrindo === codigo ? "mdi:loading" : "mdi:open-in-new"} className={solicitacaoSemelhanteAbrindo === codigo ? "animate-spin" : undefined} />
                    {codigo}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!!solicitacao.documentos && <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-950"><h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Documentos</h4><p className="mb-2 text-xs text-gray-500">Leitura e download são feitos pelas rotas autenticadas do backend, sem abrir links privados do storage.</p><div className="flex flex-wrap gap-2">{Object.entries(solicitacao.documentos).map(([key, value]) => { const loadingKey = `${solicitacao.codigo_solicitacao}:${key}`; const disabled = (!value?.path && !value?.download_url); return <div key={key} className="inline-flex overflow-hidden rounded-full border border-gray-200 text-xs dark:border-gray-700"><button type="button" disabled={disabled || documentoAbrindo === loadingKey} onClick={() => abrirDocumento(solicitacao.codigo_solicitacao, key, value?.download_url)} title={value?.path || undefined} className="px-3 py-1 text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-brand-300">{documentoAbrindo === loadingKey ? "Abrindo..." : docLabels[key] || key}</button><button type="button" disabled={disabled || documentoBaixando === loadingKey} onClick={() => baixarDocumento(solicitacao.codigo_solicitacao, key, value?.file_url, value?.download_url)} title={`Baixar ${documentoNome(key, value?.file_url)}`} className="border-l border-gray-200 px-2 py-1 text-gray-500 hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:text-gray-400 dark:border-gray-700 dark:text-gray-300"><Icon icon={documentoBaixando === loadingKey ? "mdi:loading" : "mdi:download"} className={documentoBaixando === loadingKey ? "animate-spin" : undefined} /></button></div>; })}</div>{documentoAberto && <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"><div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-700"><span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90"><Icon icon="mdi:file-eye-outline" />{documentoAberto.titulo}</span><button type="button" onClick={() => setDocumentoAberto((atual) => { if (atual?.url) URL.revokeObjectURL(atual.url); return null; })} className="rounded-lg px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">Fechar</button></div><iframe title={`Pré-visualização de ${documentoAberto.titulo}`} src={documentoAberto.url} className="h-[70vh] w-full bg-white" /></div>}</div>}
          {!isAdmin && solicitacao.status === "pendente" && <div className="flex flex-col gap-2 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row"><button onClick={() => aprovar(solicitacao.codigo_solicitacao)} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white">Aprovar e criar estudante</button><input placeholder="Motivo da reprovação" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" onChange={(e) => setMotivo((p) => ({ ...p, [solicitacao.codigo_solicitacao]: e.target.value }))} /><button onClick={() => reprovar(solicitacao.codigo_solicitacao)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">Reprovar</button></div>}
        </section>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-950"><span className="block text-xs text-gray-500">{label}</span><b className="text-gray-800 dark:text-white/90">{value}</b></div>;
}
