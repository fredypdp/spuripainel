"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { comunicacaoService } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserCookie } from "@/hooks/useUserCookie";
import type {
  EnviarMensagemComunicacaoPayload,
  MensagemComunicacao,
  ProvedorComunicacao,
  RemetenteComunicacao,
} from "@/types/api";

const MAX_CONTEUDO_LENGTH = 1000;
const DESTINATARIO_REGEX = /^9\d{8}$/;
const MENSAGENS_LIMIT = 20;

type AbaComunicacao = "enviar" | "mensagens" | "remetentes" | "configuracoes";

// ── Aviso para academia (módulo indisponível no período de testes) ───────

function AvisoIndisponivelAcademia() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
        <h1 className="mb-2 text-xl font-semibold">Comunicação indisponível durante o período de testes</h1>
        <p className="text-sm">
          O módulo de comunicação (envio de SMS) está indisponível enquanto a sua instituição estiver no período de
          testes, por se tratar de uma funcionalidade que gera custos com provedores terceiros. Fale com a equipa do
          Spuri quando quiser ativar este módulo para a sua instituição.
        </p>
      </div>
    </div>
  );
}

// ── Badges auxiliares ──────────────────────────────────────────────────

function BadgeProvedor({ provedor }: { provedor: ProvedorComunicacao | null | undefined }) {
  if (!provedor) return <span className="text-gray-400 dark:text-gray-500">—</span>;
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      {provedor === "GOSMS" ? "GoSMS" : "Ziett"}
    </span>
  );
}

function BadgeStatusMensagem({ status }: { status: "enviada" | "falhou" }) {
  if (status === "enviada") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
        Enviada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
      Falhou
    </span>
  );
}

// ── Seletor de abas (mesmo padrão visual de ChartTab) ─────────────────────

function SeletorAbas({
  aba,
  setAba,
  mostrarConfiguracoes,
}: {
  aba: AbaComunicacao;
  setAba: (aba: AbaComunicacao) => void;
  mostrarConfiguracoes: boolean;
}) {
  const opcoes: { id: AbaComunicacao; label: string }[] = [
    { id: "enviar", label: "Enviar mensagem" },
    { id: "mensagens", label: "Mensagens" },
    { id: "remetentes", label: "Remetentes" },
    ...(mostrarConfiguracoes ? [{ id: "configuracoes" as const, label: "Configurações" }] : []),
  ];

  const getButtonClass = (id: AbaComunicacao) =>
    aba === id
      ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
      : "text-gray-500 dark:text-gray-400";

  return (
    <div className="mb-6 flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      {opcoes.map((opcao) => (
        <button
          key={opcao.id}
          onClick={() => setAba(opcao.id)}
          className={`w-full rounded-md px-3 py-2 text-theme-sm font-medium hover:text-gray-900 dark:hover:text-white ${getButtonClass(
            opcao.id
          )}`}
        >
          {opcao.label}
        </button>
      ))}
    </div>
  );
}

// ── Aba: Enviar mensagem ───────────────────────────────────────────────

function EnviarMensagemTab() {
  const [destinatario, setDestinatario] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<MensagemComunicacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const destinatarioValido = DESTINATARIO_REGEX.test(destinatario);
  const conteudoValido = conteudo.trim().length > 0 && conteudo.length <= MAX_CONTEUDO_LENGTH;
  const formValido = destinatarioValido && conteudoValido;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formValido || enviando) return;

    setEnviando(true);
    setErro(null);
    setResultado(null);

    const payload: EnviarMensagemComunicacaoPayload = {
      destinatario,
      conteudo: conteudo.trim(),
    };

    try {
      const resposta = await comunicacaoService.enviarMensagemComunicacao(payload);
      setResultado(resposta);
      if (resposta.status === "enviada") {
        setConteudo("");
      }
    } catch (error) {
      setErro(formatApiError(error, "Não foi possível enviar a mensagem."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="destinatario">
              Destinatário
            </label>
            <input
              id="destinatario"
              value={destinatario}
              onChange={(event) => setDestinatario(event.target.value.replace(/\D/g, "").slice(0, 9))}
              className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="923456789"
              inputMode="numeric"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Número nacional angolano, 9 dígitos, sem 0 inicial e sem +244. Ex.: 923456789
            </p>
            {destinatario.length > 0 && !destinatarioValido && (
              <p className="mt-1 text-sm text-red-600">Informe exatamente 9 dígitos iniciados em 9.</p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="conteudo">
                Conteúdo
              </label>
              <span
                className={`text-xs ${
                  conteudo.length > MAX_CONTEUDO_LENGTH ? "text-red-600" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {conteudo.length} / {MAX_CONTEUDO_LENGTH}
              </span>
            </div>
            <textarea
              id="conteudo"
              value={conteudo}
              onChange={(event) => setConteudo(event.target.value)}
              rows={8}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Mensagem a enviar..."
            />
          </div>

          <button
            type="submit"
            disabled={!formValido || enviando}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviando ? "Enviando..." : "Enviar mensagem"}
          </button>
        </div>
      </form>

      <aside className="space-y-4">
        {erro && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100">
            {erro}
          </div>
        )}

        {resultado && (
          <div
            className={`rounded-2xl border p-5 ${
              resultado.status === "enviada"
                ? "border-green-200 bg-green-50 text-green-900 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-100"
                : "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100"
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <h2 className="font-semibold">{resultado.status === "enviada" ? "Mensagem enviada" : "Falha no envio"}</h2>
              <BadgeStatusMensagem status={resultado.status} />
            </div>
            <p className="text-sm">Destinatário: {resultado.destinatario}</p>
            {resultado.provedor_utilizado && (
              <p className="mt-1 flex items-center gap-1 text-sm">
                Enviada via <BadgeProvedor provedor={resultado.provedor_utilizado} />
              </p>
            )}
            <ul className="mt-3 space-y-1 text-sm">
              {resultado.detalhes_tentativas.map((tentativa, index) => (
                <li key={`${tentativa.provedor}-${index}`} className="flex items-center gap-1">
                  <BadgeProvedor provedor={tentativa.provedor} />
                  <span>{tentativa.sucesso ? "sucesso" : `falhou — ${tentativa.erro_mensagem || "erro desconhecido"}`}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

// ── Aba: Mensagens ─────────────────────────────────────────────────────

function MensagensTab({ isAdmin }: { isAdmin: boolean }) {
  const [mensagens, setMensagens] = useState<MensagemComunicacao[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [codigoAcademiaFiltro, setCodigoAcademiaFiltro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(
    async (novoOffset: number) => {
      setCarregando(true);
      setErro(null);
      try {
        const resposta = await comunicacaoService.listarMensagensComunicacao({
          codigo_academia: isAdmin && codigoAcademiaFiltro.trim() ? codigoAcademiaFiltro.trim() : undefined,
          limit: MENSAGENS_LIMIT,
          offset: novoOffset,
        });
        setMensagens((atual) => (novoOffset === 0 ? resposta.mensagens : [...atual, ...resposta.mensagens]));
        setTotal(resposta.total);
        setOffset(novoOffset);
      } catch (error) {
        setErro(formatApiError(error, "Não foi possível carregar as mensagens."));
      } finally {
        setCarregando(false);
      }
    },
    [isAdmin, codigoAcademiaFiltro]
  );

  useEffect(() => {
    carregar(0);
  }, [carregar]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {isAdmin && (
        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="filtro-academia">
            Filtrar por código da academia
          </label>
          <input
            id="filtro-academia"
            value={codigoAcademiaFiltro}
            onChange={(event) => setCodigoAcademiaFiltro(event.target.value)}
            className="h-9 w-48 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="ex.: ACAD001"
          />
        </div>
      )}

      {erro && <p className="mb-4 text-sm text-red-600">{erro}</p>}

      {mensagens.length === 0 && !carregando ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma mensagem enviada ainda.</p>
      ) : (
        <ul className="space-y-3">
          {mensagens.map((mensagem) => (
            <li key={mensagem.id} className="rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-800">
              <div className="flex flex-wrap items-center gap-2">
                <BadgeStatusMensagem status={mensagem.status} />
                <BadgeProvedor provedor={mensagem.provedor_utilizado} />
                <span className="text-gray-700 dark:text-gray-300">{mensagem.destinatario}</span>
                <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                  {new Date(mensagem.created_at).toLocaleString("pt-AO")}
                </span>
              </div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">{mensagem.conteudo}</p>
              {isAdmin && mensagem.codigo_academia && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Academia: {mensagem.codigo_academia}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {mensagens.length < total && (
        <button
          type="button"
          onClick={() => carregar(offset + MENSAGENS_LIMIT)}
          disabled={carregando}
          className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {carregando ? "Carregando..." : "Carregar mais"}
        </button>
      )}
    </div>
  );
}

// ── Aba: Remetentes ────────────────────────────────────────────────────

function ListaRemetentes({
  remetentes,
  carregando,
  erro,
}: {
  remetentes: RemetenteComunicacao[];
  carregando: boolean;
  erro: string | null;
}) {
  return (
    <>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {!carregando && remetentes.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum remetente configurado ainda.</p>
      )}
      <ul className="space-y-2">
        {remetentes.map((remetente) => (
          <li key={remetente.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
            <BadgeProvedor provedor={remetente.provedor} />
            <span className="text-gray-700 dark:text-gray-300">{remetente.identificador}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function RemetentesTab({ isFpp }: { isFpp: boolean }) {
  const [remetentes, setRemetentes] = useState<RemetenteComunicacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const [provedor, setProvedor] = useState<ProvedorComunicacao>("GOSMS");
  const [identificador, setIdentificador] = useState("");
  const [tokenApi, setTokenApi] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [sucessoForm, setSucessoForm] = useState<string | null>(null);

  const carregarLista = useCallback(async () => {
    setCarregando(true);
    setErroLista(null);
    try {
      const resposta = await comunicacaoService.listarRemetentesComunicacao();
      setRemetentes(resposta.remetentes);
    } catch (error) {
      setErroLista(formatApiError(error, "Não foi possível carregar os remetentes."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarLista();
  }, [carregarLista]);

  if (!isFpp) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">Remetentes configurados</h2>
        <ListaRemetentes remetentes={remetentes} carregando={carregando} erro={erroLista} />
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Apenas administradores FPP podem cadastrar ou substituir remetentes.
        </p>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (salvando || !identificador.trim() || !tokenApi.trim()) return;

    setSalvando(true);
    setErroForm(null);
    setSucessoForm(null);

    try {
      await comunicacaoService.criarRemetenteComunicacao({
        provedor,
        identificador: identificador.trim(),
        token_api: tokenApi.trim(),
      });
      setSucessoForm(`Remetente do ${provedor === "GOSMS" ? "GoSMS" : "Ziett"} salvo com sucesso.`);
      setIdentificador("");
      setTokenApi("");
      carregarLista();
    } catch (error) {
      setErroForm(formatApiError(error, "Não foi possível salvar o remetente."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Cadastrar remetente</h2>
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="provedor">
              Provedor
            </label>
            <select
              id="provedor"
              value={provedor}
              onChange={(event) => setProvedor(event.target.value as ProvedorComunicacao)}
              className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="GOSMS">GoSMS</option>
              <option value="ZIETT">Ziett</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="identificador">
              Identificador
            </label>
            <input
              id="identificador"
              value={identificador}
              onChange={(event) => setIdentificador(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder={provedor === "GOSMS" ? "Ex.: SPURI (Sender ID)" : "UUID do remitter_id"}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {provedor === "GOSMS"
                ? "Nome do Sender ID já aprovado no GoSMS, até 11 caracteres alfanuméricos."
                : "UUID do remitter_id já configurado no painel da Ziett."}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="token_api">
              Token de API
            </label>
            <input
              id="token_api"
              type="password"
              value={tokenApi}
              onChange={(event) => setTokenApi(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Token de API deste provedor"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Fica cifrado no servidor e nunca é mostrado de novo — para trocar, cadastre novamente.
            </p>
          </div>

          {erroForm && <p className="text-sm text-red-600">{erroForm}</p>}
          {sucessoForm && <p className="text-sm text-green-600">{sucessoForm}</p>}

          <button
            type="submit"
            disabled={salvando || !identificador.trim() || !tokenApi.trim()}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar remetente"}
          </button>
        </div>
      </form>

      <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">Remetentes configurados</h2>
        <ListaRemetentes remetentes={remetentes} carregando={carregando} erro={erroLista} />
      </aside>
    </div>
  );
}

// ── Aba: Configurações (provedor padrão — apenas FPP) ─────────────────

function ConfiguracoesTab() {
  const [provedorPadrao, setProvedorPadrao] = useState<ProvedorComunicacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<ProvedorComunicacao>("GOSMS");
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const resposta = await comunicacaoService.consultarProvedorPadraoComunicacao();
        setProvedorPadrao(resposta.provedor_padrao);
        if (resposta.provedor_padrao) setSelecionado(resposta.provedor_padrao);
      } catch (error) {
        setErro(formatApiError(error, "Não foi possível carregar o provedor padrão."));
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const handleSalvar = async () => {
    setSalvando(true);
    setErro(null);
    setSucesso(null);
    try {
      const resposta = await comunicacaoService.definirProvedorPadraoComunicacao(selecionado);
      setProvedorPadrao(resposta.provedor_padrao);
      setSucesso("Provedor padrão atualizado.");
    } catch (error) {
      setErro(formatApiError(error, "Não foi possível atualizar o provedor padrão."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-2 font-semibold text-gray-900 dark:text-white">Provedor padrão</h2>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Ao enviar uma mensagem, o sistema tenta primeiro este provedor; se falhar, tenta automaticamente o outro.
      </p>

      {carregando ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
      ) : (
        <>
          <p className="mb-4 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            Atual: {provedorPadrao ? <BadgeProvedor provedor={provedorPadrao} /> : "nenhum definido ainda"}
          </p>
          <div className="flex items-center gap-3">
            <select
              value={selecionado}
              onChange={(event) => setSelecionado(event.target.value as ProvedorComunicacao)}
              className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="GOSMS">GoSMS</option>
              <option value="ZIETT">Ziett</option>
            </select>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={salvando}
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </>
      )}

      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
      {sucesso && <p className="mt-3 text-sm text-green-600">{sucesso}</p>}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────

export default function ComunicacaoPageContent() {
  const { user, loading } = useUserCookie();
  const [aba, setAba] = useState<AbaComunicacao>("enviar");

  if (loading) {
    return null;
  }

  if (user?.tipo === "academia") {
    return <AvisoIndisponivelAcademia />;
  }

  const isAdmin = user?.tipo === "admin";
  const isFpp = isAdmin && user?.admin?.role === "fpp";

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Comunicação</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Envio de SMS institucional via GoSMS ou Ziett.
        </p>
      </div>

      <SeletorAbas aba={aba} setAba={setAba} mostrarConfiguracoes={isFpp} />

      {aba === "enviar" && <EnviarMensagemTab />}
      {aba === "mensagens" && <MensagensTab isAdmin={isAdmin} />}
      {aba === "remetentes" && <RemetentesTab isFpp={isFpp} />}
      {aba === "configuracoes" && isFpp && <ConfiguracoesTab />}
    </div>
  );
}
