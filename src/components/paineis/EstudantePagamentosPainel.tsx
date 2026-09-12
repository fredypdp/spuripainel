"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { consultasService, financeiroService, tokenStorage, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserCookie } from "@/hooks/useUserCookie";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import Input from "@/components/form/input/InputField";
import SearchableSelect from "@/components/form/SearchableSelect";
import Checkbox from "@/components/form/input/Checkbox";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  CobrancasTable,
  EmptyState,
  ESTADOS_COBRANCA_REAL,
  ESTADO_PAGAMENTO_OPCOES,
  LoadingState,
  MetodoPagamentoSelector,
  PaginacaoSetas,
  Qr,
  StatusBadge,
  SubtelaDetalheCobranca,
  SubtelaPanel,
  capitalizar,
  chaveMensalidade,
  compararMensalidadesPorData,
  formatAnoLetivo,
  formatarLinhaMensalidade,
  money,
  NOME_MES,
  origemLabel,
} from "@/components/paineis/financeiroShared";
import type { FinanceiroMetodoPagamento, FinanceiroOrigemCobranca, MensalidadeMesView, PagamentoResumo, QRCodeChargeResult } from "@/types/api";

const PAGE_SIZE = 30;
// Generoso o suficiente para cobrir qualquer cenário realista (mesmo um
// estudante com pendências em 2-3 academias acumuladas por vários anos) sem
// precisar de paginação nesta seção — ver nota em `pendentesTruncadas` no
// componente principal para o que acontece no caso extremo de estourar
// este limite.
const LIMITE_PENDENTES = 500;

function getCodigo(user: any) { return user?.estudante?.codigo_estudante || user?.estudante?.codigo || user?.codigo; }

const TIPO_OPCOES: { value: "" | FinanceiroOrigemCobranca; label: string }[] = [
  { value: "", label: "Todos os tipos" },
  { value: "mensalidade", label: "Mensalidade" },
  { value: "matricula", label: "Matrícula" },
  { value: "avulsa", label: "Outros" },
];

/**
 * Mesmas opções de estado do módulo (ESTADO_PAGAMENTO_OPCOES), exceto
 * "Pendente (sem cobrança gerada)" — esse estado já tem sua própria seção
 * nesta tela (Pendentes, com "Pagar" e checkbox); misturá-lo de novo aqui,
 * no histórico, duplicaria os mesmos itens nas duas seções.
 */
const ESTADO_HISTORICO_OPCOES = [
  { value: "", label: "Todos os estados" },
  ...ESTADO_PAGAMENTO_OPCOES.filter((o) => o.value !== "pendente"),
];

type ResultadoPagamento = { cobranca: QRCodeChargeResult; metodoUsado: FinanceiroMetodoPagamento };

type Tela =
  | { nome: "lista" }
  | { nome: "checkout"; codigoAcademia: string; itens: PagamentoResumo[] }
  | { nome: "detalhe"; cobranca: PagamentoResumo };

/**
 * Rótulo "[Mês] — [Ano letivo]" de uma pendência de mensalidade, a partir
 * do único mês em `PagamentoResumo.mensalidades` — ao contrário de
 * `formatarLinhaMensalidade` (financeiroShared), não depende de
 * `data_referencia`/`valor` como campos de MensalidadeMesView, porque um
 * item desta tela vem de `consultarCobrancasEstudante` (PagamentoResumo),
 * não de `consultarMensalidadesEstudante` (MensalidadeMesView). O ano
 * cívico exato não é mostrado (dependeria de saber se a academia é
 * escolar/superior, informação que PagamentoResumo não carrega) — só o ano
 * letivo, que já identifica o mês sem ambiguidade.
 */
function rotuloPendencia(item: PagamentoResumo) {
  const m = item.mensalidades?.[0];
  if (!m) return origemLabel[item.origem] ?? item.origem;
  return `${capitalizar(NOME_MES[m.mes - 1])} — ${formatAnoLetivo(m.ano_letivo)}`;
}

/** Posição de um mês dentro do ano letivo (setembro=9 .. julho=19), para ordenar cronologicamente sem depender de `data_referencia` (ausente em PagamentoResumo) — mesma regra de virada usada em `mesesDoAnoLetivo` (FinanceiroPagamentosPainel.tsx). */
function posicaoNoAnoLetivo(mes: number) {
  return mes >= 8 ? mes : mes + 12;
}

/** Ordena pendências cronologicamente (mais antiga primeiro) por ano letivo + posição do mês — usado para identificar a mais antiga de cada academia (obrigatória) e para a ordem de exibição na tabela. */
function compararPendencias(a: PagamentoResumo, b: PagamentoResumo) {
  const ma = a.mensalidades?.[0];
  const mb = b.mensalidades?.[0];
  if (!ma || !mb) return 0;
  if (ma.ano_letivo !== mb.ano_letivo) return ma.ano_letivo.localeCompare(mb.ano_letivo);
  return posicaoNoAnoLetivo(ma.mes) - posicaoNoAnoLetivo(mb.mes);
}

/**
 * Tabela de pendências (mensalidade sem cobrança gerada) de UMA academia —
 * "Pagar" e o checkbox de seleção só existem aqui, nunca no histórico
 * (seção mais abaixo, no componente principal): qualquer outro estado já
 * tem uma cobrança real associada (ver PagamentoResumo em types/api.ts) e
 * já está "aguardando pagamento" ou resolvida, sem nenhuma ação de
 * pagamento pendente do estudante.
 *
 * Regra de negócio preservada (já existia antes desta tarefa nesta tela, e
 * agora confirmada também no backend — IniciarPagamentoMensalidades,
 * mensalidade.go, rejeita a transação se a mensalidade pendente mais
 * antiga não estiver incluída): em vez de deixar o botão "Pagar" de uma
 * linha mais nova falhar contra essa validação, ele já inclui a mais
 * antiga automaticamente na transação (com um aviso visual na própria
 * linha) — "pagar individualmente" nunca termina em erro.
 */
function SecaoPendentesAcademia({
  titulo,
  itens,
  selecionados,
  onToggle,
  onPagar,
}: {
  titulo?: string;
  itens: PagamentoResumo[]; // já ordenadas da mais antiga para a mais recente
  selecionados: string[];
  onToggle: (id: string, checked: boolean) => void;
  onPagar: (itens: PagamentoResumo[]) => void;
}) {
  const maisAntiga = itens[0];
  const selecionadosItens = itens.filter((i) => selecionados.includes(i.id));

  function pagarLinha(item: PagamentoResumo) {
    if (!maisAntiga || item.id === maisAntiga.id) {
      onPagar([item]);
      return;
    }
    onPagar([maisAntiga, item]);
  }

  return (
    <div className="mt-5 first:mt-0">
      {titulo && <h3 className="mb-2 font-semibold text-gray-800 dark:text-white/90">{titulo}</h3>}
      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-white/[0.05]">
        <Table className="w-full text-left">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              {["", "Referência", "Tipo", "Valor", ""].map((h, i) => (
                <TableCell key={`${h || "col"}-${i}`} isHeader className="px-3 py-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{h}</TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {itens.map((item) => {
              const obrigatoria = maisAntiga?.id === item.id;
              return (
                <TableRow key={item.id}>
                  <TableCell className="px-3 py-2">
                    <Checkbox
                      id={`pendencia-${item.id}`}
                      checked={selecionados.includes(item.id)}
                      disabled={obrigatoria}
                      onChange={(checked) => onToggle(item.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                    {rotuloPendencia(item)}{obrigatoria ? " (mais antiga, obrigatória)" : ""}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{origemLabel[item.origem] ?? item.origem}</TableCell>
                  <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{money(item.valor)}</TableCell>
                  <TableCell className="px-3 py-2">
                    <Button size="sm" variant="success" onClick={() => pagarLinha(item)}>Pagar</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {selecionadosItens.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 dark:border-white/[0.05]">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {selecionadosItens.length} cobranças selecionadas — total {money(selecionadosItens.reduce((s, i) => s + i.valor, 0))}
          </p>
          <Button size="sm" variant="success" onClick={() => onPagar(selecionadosItens)}>Pagar selecionadas</Button>
        </div>
      )}
    </div>
  );
}

export default function EstudantePagamentosPainel() {
  const { user, loading } = useUserCookie();
  const restricted = tokenStorage.isRestrictedFinance();
  const codigo = getCodigo(user);

  const [tela, setTela] = useState<Tela>({ nome: "lista" });

  // Única informação que esta tela ainda usa de
  // GET /financeiro/mensalidades/estudante/:codigo: os métodos de
  // pagamento habilitados por academia (necessários na tela de checkout,
  // mais abaixo) e a lista de mensalidades "anulado" (seção própria, mais
  // abaixo) — a listagem de pendências em si vem de `pendentesApi`
  // (consultarCobrancasEstudante), não mais deste endpoint (ver comentário
  // ali sobre por que a fonte mudou).
  const mensalidadesApi = useApi(financeiroService.consultarMensalidadesEstudante);

  // Pendências (mensalidade sem cobrança gerada) — fonte única desta
  // seção, com estado=["pendente"]. Nenhuma cobrança real tem esse status
  // (ver PagamentoResumo em types/api.ts), e o backend já devolve isto
  // deduplicado: um mês com uma cobrança "aguardando_pagamento" em aberto
  // NÃO aparece aqui (FiltrarPendenciasComCobrancaRealVinculada, backend) —
  // é assim que "Pagar" e o checkbox nunca aparecem para quem já está
  // aguardando pagamento, mesmo que o mês ainda não tenha sido pago de
  // verdade. Não usa consultarMensalidadesEstudante (como antes desta
  // tarefa) porque aquele endpoint devolve o estado bruto da obrigação,
  // sem essa deduplicação — um mês já em "aguardando_pagamento" continuaria
  // aparecendo como pendente lá.
  const pendentesApi = useApi(financeiroService.consultarCobrancasEstudante);

  // Histórico (tudo que não é pendência sintética) — mesma fonte unificada
  // do backend, agora sempre visível nesta mesma tela em vez de uma
  // sub-tela separada. `estado` nunca fica vazio: quando o filtro é "Todos
  // os estados", passamos ESTADOS_COBRANCA_REAL explicitamente em vez de
  // omitir o parâmetro — omitir faria o backend incluir as pendências de
  // novo (DeveIncluirPendenciasSemCobranca só as exclui quando o filtro de
  // estado é não-vazio e não contém "pendente"), duplicando-as com a seção
  // Pendentes acima.
  const historicoApi = useApi(financeiroService.consultarCobrancasEstudante);
  const [tipoHistorico, setTipoHistorico] = useState<"" | FinanceiroOrigemCobranca>("");
  const [estadoHistorico, setEstadoHistorico] = useState("");
  const [paginaHistorico, setPaginaHistorico] = useState(1);

  const pagar = useApi(financeiroService.iniciarPagamentoMensalidades);

  // Seleção (checkboxes) da seção Pendentes, chaveada por academia — evita
  // misturar, numa mesma transação, pendências de academias diferentes
  // (IniciarPagamentoMensalidades só aceita um único codigo_academia por
  // chamada). Cada seção (SecaoPendentesAcademia) só lê/escreve a sua
  // própria chave.
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  // Academias cuja seleção padrão (mensalidade pendente mais antiga,
  // pré-marcada e obrigatória) já foi calculada — evita recalcular (e
  // apagar a seleção em andamento) a cada refetch de `pendentesApi`. É
  // removido de propósito logo após um pagamento confirmado daquela
  // academia (ver `confirmarCheckout`), para que a próxima mensalidade
  // pendente mais antiga já fique pronta assim que os dados atualizados
  // chegarem.
  const initializedRef = useRef<Set<string>>(new Set());
  const [nomesAcademias, setNomesAcademias] = useState<Record<string, string>>({});
  // Academias cujo nome já foi buscado (com sucesso ou falha) — evita
  // repetir a requisição a cada render; em caso de falha o título mantém
  // o fallback "Academia [código]".
  const nomesFetchedRef = useRef<Set<string>>(new Set());

  const [metodoCheckout, setMetodoCheckout] = useState<FinanceiroMetodoPagamento>("GPO");
  const [telefoneCheckout, setTelefoneCheckout] = useState("");

  const [alert, setAlert] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && codigo) {
      void mensalidadesApi.execute(codigo).catch((e) => setAlert(formatApiError(e, "Não foi possível carregar os métodos de pagamento.")));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, codigo]);

  const recarregarPendentes = useCallback(async () => {
    if (!codigo) return;
    try {
      await pendentesApi.execute(codigo, { estado: ["pendente"], limit: LIMITE_PENDENTES, offset: 0 });
    } catch (e) {
      setAlert(formatApiError(e, "Não foi possível carregar as pendências."));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  useEffect(() => {
    if (!loading && codigo) void recarregarPendentes();
  }, [loading, codigo, recarregarPendentes]);

  const recarregarHistorico = useCallback(async () => {
    if (!codigo || restricted) return;
    try {
      await historicoApi.execute(codigo, {
        estado: estadoHistorico ? [estadoHistorico] : ESTADOS_COBRANCA_REAL,
        tipo: tipoHistorico ? [tipoHistorico] : undefined,
        limit: PAGE_SIZE,
        offset: (paginaHistorico - 1) * PAGE_SIZE,
      });
    } catch (e) {
      setAlert(formatApiError(e, "Não foi possível carregar o histórico de cobranças."));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, restricted, estadoHistorico, tipoHistorico, paginaHistorico]);

  useEffect(() => {
    if (!loading && codigo) void recarregarHistorico();
  }, [loading, codigo, recarregarHistorico]);

  // Seleção padrão (mensalidade pendente mais antiga de cada academia,
  // pré-marcada e obrigatória) — recalculada só para academias ainda não
  // inicializadas, mesmo cuidado que o desenho anterior desta tela já
  // tinha, para não apagar uma seleção manual em andamento a cada refetch.
  useEffect(() => {
    const itens = pendentesApi.data?.pagamentos ?? [];
    const porAcademia = itens.reduce<Record<string, PagamentoResumo[]>>((acc, i) => {
      if (i.codigo_academia) (acc[i.codigo_academia] ??= []).push(i);
      return acc;
    }, {});
    const academiasNovas = Object.keys(porAcademia).filter((a) => !initializedRef.current.has(a));
    if (academiasNovas.length === 0) return;
    setSelected((prev) => {
      const next = { ...prev };
      for (const academia of academiasNovas) {
        const ordenados = [...porAcademia[academia]].sort(compararPendencias);
        next[academia] = ordenados[0] ? [ordenados[0].id] : [];
      }
      return next;
    });
    academiasNovas.forEach((a) => initializedRef.current.add(a));
  }, [pendentesApi.data]);

  // Nome de cada academia com pendências — só relevante quando há mais de
  // uma (ver semDivisaoPendentes); mesma fonte pública já usada antes desta
  // tarefa (GET /consultar-academia/:codigo).
  useEffect(() => {
    const codigos = Array.from(new Set((pendentesApi.data?.pagamentos ?? []).map((i) => i.codigo_academia).filter((c): c is string => !!c)));
    const faltantes = codigos.filter((c) => !nomesFetchedRef.current.has(c));
    if (faltantes.length === 0) return;
    faltantes.forEach((c) => nomesFetchedRef.current.add(c));
    faltantes.forEach((codigoAcademia) => {
      consultasService
        .academia(codigoAcademia)
        .then((r) => {
          // GET /consultar-academia/:codigo devolve os campos da academia
          // NO NÍVEL RAIZ da resposta, não envolvidos em `{ academia: {...} }`
          // como o tipo ConsultarAcademiaResponse sugere — mesma
          // divergência já contornada em MatriculaPublicPage.tsx.
          const bruto = r as unknown as { academia?: { nome?: string }; nome?: string };
          const nome = bruto.academia?.nome ?? bruto.nome;
          if (!nome) return;
          setNomesAcademias((prev) => ({ ...prev, [codigoAcademia]: nome }));
        })
        .catch(() => { /* mantém o fallback "Academia [código]" no título desta academia */ });
    });
  }, [pendentesApi.data]);

  const toggle = (academia: string, id: string, checked: boolean) => {
    setSelected((prev) => {
      const atual = prev[academia] ?? [];
      return { ...prev, [academia]: checked ? [...atual, id] : atual.filter((x) => x !== id) };
    });
  };

  const metodosPagamentoPorAcademia = mensalidadesApi.data?.metodos_pagamento_por_academia ?? {};

  function abrirCheckout(codigoAcademia: string, itens: PagamentoResumo[]) {
    pagar.reset();
    setAlert(null);
    setMetodoCheckout(metodosPagamentoPorAcademia[codigoAcademia]?.[0] ?? "GPO");
    setTelefoneCheckout("");
    setTela({ nome: "checkout", codigoAcademia, itens });
  }

  function fecharCheckout() {
    pagar.reset();
    setTela({ nome: "lista" });
  }

  async function confirmarCheckout() {
    if (tela.nome !== "checkout") return;
    const meses = tela.itens.map((i) => i.mensalidades![0]);
    try {
      await pagar.execute({
        codigo_academia: tela.codigoAcademia,
        meses,
        metodo_pagamento: metodoCheckout,
        telefone: metodoCheckout === "GPO" ? telefoneCheckout : undefined,
      });
      // Força o recálculo da seleção padrão desta academia assim que os
      // dados atualizados chegarem (efeito acima): se ainda restarem
      // pendências, a próxima mais antiga já fica pronta.
      initializedRef.current.delete(tela.codigoAcademia);
      await recarregarPendentes();
      await recarregarHistorico();
    } catch (e) {
      setAlert(formatApiError(e, "Não foi possível iniciar o pagamento."));
    }
  }

  if (loading) return <LoadingState label="Carregando..." />;
  if (!codigo) return <Alert variant="error" title="Pagamentos" message="Não foi possível identificar o estudante logado." />;

  if (tela.nome === "detalhe") {
    return <SubtelaDetalheCobranca cobranca={tela.cobranca} onVoltar={() => setTela({ nome: "lista" })} mostrarDadosEstudante={false} />;
  }

  if (tela.nome === "checkout") {
    const total = tela.itens.reduce((s, i) => s + i.valor, 0);
    const disponiveis: FinanceiroMetodoPagamento[] = metodosPagamentoPorAcademia[tela.codigoAcademia] ?? ["GPO"];
    const resultado = pagar.data?.cobranca;
    return (
      <SubtelaPanel title="Pagamento" icon="mdi:credit-card-outline" onVoltar={fecharCheckout}>
        {alert && <Alert variant="error" title="Pagamento" message={alert} />}

        <div className="space-y-2 rounded-xl border border-gray-100 p-4 dark:border-white/[0.05]">
          {tela.itens.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>{rotuloPendencia(item)}</span>
              <span>{money(item.valor)}</span>
            </div>
          ))}
          {tela.itens.length > 1 && (
            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 text-sm font-semibold text-gray-800 dark:border-white/[0.05] dark:text-white/90">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
          )}
        </div>

        {resultado ? (
          <div className="mt-4 space-y-3 rounded-lg border border-gray-100 p-4 dark:border-white/[0.05]">
            <p className="text-sm text-gray-700 dark:text-gray-300">Status: {resultado.status}</p>
            {metodoCheckout === "GPO" && (
              <p className="text-sm text-gray-700 dark:text-gray-300">Você receberá uma notificação no telefone informado para confirmar o pagamento.</p>
            )}
            {metodoCheckout === "REF" && (
              <pre className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs dark:bg-gray-800">{JSON.stringify(resultado.response ?? {}, null, 2)}</pre>
            )}
            {metodoCheckout === "GPO_QR" && <Qr value={resultado.qrCodeArr} />}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => { void recarregarPendentes(); void recarregarHistorico(); }}>Verificar status</Button>
              <Button size="sm" variant="outline" onClick={fecharCheckout}>Voltar</Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <MetodoPagamentoSelector value={metodoCheckout} disponiveis={disponiveis} onChange={setMetodoCheckout} />
            {metodoCheckout === "GPO" && (
              <Input placeholder="Telefone" value={telefoneCheckout} onChange={(e) => setTelefoneCheckout(e.target.value)} />
            )}
            <Button disabled={pagar.loading || (metodoCheckout === "GPO" && !telefoneCheckout)} onClick={confirmarCheckout}>
              {pagar.loading ? "Aguarde..." : "Confirmar pagamento"}
            </Button>
          </div>
        )}
      </SubtelaPanel>
    );
  }

  // tela.nome === "lista"
  const pendentesItens = pendentesApi.data?.pagamentos ?? [];
  const pendentesPorAcademia = pendentesItens.reduce<Record<string, PagamentoResumo[]>>((acc, i) => {
    if (i.codigo_academia) (acc[i.codigo_academia] ??= []).push(i);
    return acc;
  }, {});
  const academias = Object.keys(pendentesPorAcademia);
  const semDivisaoPendentes = academias.length <= 1;
  const totalPendentesGeral = pendentesApi.data?.total_geral ?? 0;
  const pendentesTruncadas = totalPendentesGeral > pendentesItens.length;

  const anuladas = (mensalidadesApi.data?.mensalidades ?? []).filter((m: MensalidadeMesView) => m.estado === "anulado");

  const totalHistorico = historicoApi.data?.total_geral ?? 0;
  const totalPaginasHistorico = Math.max(1, Math.ceil(totalHistorico / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {restricted && <Alert variant="warning" title="Acesso financeiro restrito" message="O seu vínculo com a academia foi encerrado. Você pode consultar e regularizar pendências financeiras aqui." />}
      {alert && <Alert variant="error" title="Pagamentos" message={alert} />}

      <div className="flex items-center gap-2">
        <Icon icon="mdi:credit-card-multiple-outline" width={24} className="text-gray-800 dark:text-white/90" />
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Meus pagamentos</h1>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center gap-2">
          <Icon icon="mdi:cash-clock" width={22} className="text-gray-800 dark:text-white/90" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Pendentes</h2>
        </div>

        {pendentesApi.loading ? (
          <LoadingState label="Carregando pendências..." />
        ) : pendentesItens.length === 0 ? (
          <EmptyState title="Nenhuma pendência." description="Não há mensalidades pendentes no momento." />
        ) : semDivisaoPendentes ? (
          <SecaoPendentesAcademia
            itens={[...pendentesItens].sort(compararPendencias)}
            selecionados={selected[academias[0]] ?? []}
            onToggle={(id, checked) => toggle(academias[0], id, checked)}
            onPagar={(itens) => abrirCheckout(academias[0], itens)}
          />
        ) : (
          academias.map((academia) => (
            <SecaoPendentesAcademia
              key={academia}
              titulo={nomesAcademias[academia] ?? `Academia ${academia}`}
              itens={[...pendentesPorAcademia[academia]].sort(compararPendencias)}
              selecionados={selected[academia] ?? []}
              onToggle={(id, checked) => toggle(academia, id, checked)}
              onPagar={(itens) => abrirCheckout(academia, itens)}
            />
          ))
        )}

        {pendentesTruncadas && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Existem mais pendências além das {pendentesItens.length} mostradas aqui — contacte a sua academia caso alguma mensalidade antiga não apareça.
          </p>
        )}
      </section>

      {anuladas.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="mb-4 flex items-center gap-2">
            <Icon icon="mdi:cancel" width={22} className="text-gray-800 dark:text-white/90" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Mensalidades anuladas</h2>
          </div>
          <div className="flex flex-col gap-2">
            {[...anuladas].sort(compararMensalidadesPorData).map((m) => (
              <div key={chaveMensalidade(m)} className="flex items-center justify-between gap-3 text-sm text-gray-700 dark:text-gray-300">
                <span>{formatarLinhaMensalidade(m)}</span>
                <StatusBadge status={m.estado} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center gap-2">
          <Icon icon="mdi:history" width={22} className="text-gray-800 dark:text-white/90" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Histórico</h2>
        </div>

        {restricted ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Histórico completo indisponível nesta sessão restrita; apenas mensalidades e pagamento estão liberados.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <SearchableSelect
                value={tipoHistorico}
                options={TIPO_OPCOES}
                onChange={(v) => { setTipoHistorico(v); setPaginaHistorico(1); }}
                placeholder="Tipo de cobrança"
                isSearchable={false}
                isClearable={false}
                inputId="historico-tipo"
                name="historico-tipo"
              />
              <SearchableSelect
                value={estadoHistorico}
                options={ESTADO_HISTORICO_OPCOES}
                onChange={(v) => { setEstadoHistorico(v); setPaginaHistorico(1); }}
                placeholder="Estado do pagamento"
                isSearchable={false}
                isClearable={false}
                inputId="historico-estado"
                name="historico-estado"
              />
            </div>
            <div className="mt-4">
              {historicoApi.loading ? (
                <LoadingState label="Carregando histórico..." />
              ) : (historicoApi.data?.pagamentos?.length ?? 0) > 0 ? (
                <CobrancasTable rows={historicoApi.data?.pagamentos ?? []} onOpen={(c) => setTela({ nome: "detalhe", cobranca: c })} />
              ) : (
                <EmptyState title="Sem histórico." description="Nenhuma cobrança foi encontrada para os filtros selecionados." />
              )}
            </div>
            <div className="mt-4">
              <PaginacaoSetas paginaAtual={paginaHistorico} totalPaginas={totalPaginasHistorico} total={totalHistorico} porPagina={PAGE_SIZE} onChange={setPaginaHistorico} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
