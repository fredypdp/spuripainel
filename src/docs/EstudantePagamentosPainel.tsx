"use client";
import { useEffect, useRef, useState } from "react";
import { consultasService, financeiroService, tokenStorage, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserCookie } from "@/hooks/useUserCookie";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import SearchableSelect from "@/components/form/SearchableSelect";
import Checkbox from "@/components/form/input/Checkbox";
import {
  CobrancasTable,
  EmptyState,
  LoadingState,
  MetodoPagamentoSelector,
  PaginacaoSetas,
  Qr,
  StatusBadge,
  SubtelaDetalheCobranca,
  SubtelaPanel,
  chaveMensalidade,
  compararMensalidadesPorData,
  formatarLinhaMensalidade,
} from "@/components/paineis/financeiroShared";
import type { CobrancaResumo, FinanceiroMetodoPagamento, FinanceiroOrigemCobranca, MensalidadeMesView, QRCodeChargeResult } from "@/types/api";

const PAGE_SIZE = 30;
function getCodigo(user: any) { return user?.estudante?.codigo_estudante || user?.estudante?.codigo || user?.codigo; }

const TIPO_OPCOES: { value: "" | FinanceiroOrigemCobranca; label: string }[] = [
  { value: "", label: "Todos os tipos" },
  { value: "mensalidade", label: "Mensalidade" },
  { value: "matricula", label: "Matrícula" },
  { value: "avulsa", label: "Outros" },
];

const ESTADO_HISTORICO_OPCOES = [
  { value: "", label: "Todos os estados" },
  { value: "Success", label: "Pago" },
  { value: "Pending", label: "Pendente" },
  { value: "Failed", label: "Falhado" },
  { value: "Cancelled", label: "Cancelado" },
];

type ResultadoPagamento = { cobranca: QRCodeChargeResult; metodoUsado: FinanceiroMetodoPagamento };

type Tela = { nome: "lista" } | { nome: "historico" } | { nome: "detalhe"; cobranca: CobrancaResumo };

/**
 * Uma seção de mensalidades de uma única academia: lista (não mais
 * tabela) com uma linha por mês no formato "[valor] - [mês] de [ano
 * cívil] ([ano letivo])" (formatarLinhaMensalidade) — meses pendentes
 * viram checkbox selecionável, os demais (pago/anulado) ficam como linha
 * somente leitura com StatusBadge. Logo abaixo, quando há pendências e
 * nenhum resultado de pagamento em andamento, os controles de pagamento
 * (seleção já embutida nos checkboxes acima + método + confirmar); com
 * resultado presente, mostra o status da cobrança no lugar dos controles.
 *
 * `academia` é sempre derivado do primeiro mês pendente de `linhas` (nunca
 * recebido como prop): como cada seção só mistura mensalidades de uma
 * mesma academia (tanto na divisão por academia quanto na visão unificada,
 * que só existe quando no máximo uma academia tem pendências — ver
 * `semDivisao` no componente principal), isso identifica corretamente a
 * academia relevante nos dois casos sem precisar de uma prop extra.
 */
function SecaoMensalidadesAcademia({
  titulo,
  linhas,
  selected,
  metodo,
  telefone,
  resultados,
  metodosPagamentoPorAcademia,
  onToggleMes,
  onMudarMetodo,
  onMudarTelefone,
  onConfirmar,
  onVerificarStatus,
  onNovaSelecao,
}: {
  titulo?: string;
  linhas: MensalidadeMesView[];
  selected: Record<string, string[]>;
  metodo: Record<string, FinanceiroMetodoPagamento>;
  telefone: Record<string, string>;
  resultados: Record<string, ResultadoPagamento | undefined>;
  metodosPagamentoPorAcademia: Record<string, FinanceiroMetodoPagamento[]>;
  onToggleMes: (academia: string, chave: string, checked: boolean) => void;
  onMudarMetodo: (academia: string, m: FinanceiroMetodoPagamento) => void;
  onMudarTelefone: (academia: string, v: string) => void;
  onConfirmar: (academia: string) => void;
  onVerificarStatus: () => void;
  onNovaSelecao: (academia: string) => void;
}) {
  const pendentes = linhas.filter((m) => m.estado === "pendente");
  const academia = pendentes[0]?.codigo_academia;
  const maisAntigaChave = pendentes[0] ? chaveMensalidade(pendentes[0]) : null;
  const resultado = academia ? resultados[academia] : undefined;
  const selecionados = academia ? selected[academia] ?? [] : [];
  const metodoAtual = academia ? metodo[academia] ?? "GPO" : "GPO";
  const telefoneAtual = academia ? telefone[academia] ?? "" : "";
  const disponiveis: FinanceiroMetodoPagamento[] = (academia ? metodosPagamentoPorAcademia[academia] : undefined) ?? ["GPO"];

  return (
    <div className="mt-5 rounded-xl border p-4 dark:border-white/[0.05]">
      {titulo && <h2 className="font-semibold text-gray-800 dark:text-white/90">{titulo}</h2>}
      {linhas.length === 0 ? (
        <p className={`text-sm text-gray-500 dark:text-gray-400 ${titulo ? "mt-3" : ""}`}>Nenhuma mensalidade neste filtro.</p>
      ) : (
        <div className={`space-y-2 ${titulo ? "mt-3" : ""}`}>
          {linhas.map((m) => {
            const chave = chaveMensalidade(m);
            const label = formatarLinhaMensalidade(m);
            if (m.estado === "pendente" && !resultado) {
              return (
                <Checkbox
                  key={chave}
                  id={`mes-${m.codigo_academia}-${chave}`}
                  checked={selecionados.includes(chave)}
                  disabled={chave === maisAntigaChave}
                  onChange={(checked) => academia && onToggleMes(academia, chave, checked)}
                  label={`${label}${chave === maisAntigaChave ? " (mais antigo, obrigatório)" : ""}`}
                />
              );
            }
            return (
              <div key={chave} className="flex items-center justify-between gap-3 py-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                <StatusBadge status={m.estado} />
              </div>
            );
          })}
        </div>
      )}

      {academia && (pendentes.length > 0 || resultado) && (
        resultado ? (
          <div className="mt-4 space-y-3 rounded-lg border border-gray-100 p-4 dark:border-white/[0.05]">
            <p className="text-sm text-gray-700 dark:text-gray-300">Status: {resultado.cobranca.status}</p>
            {resultado.metodoUsado === "GPO" && (
              <p className="text-sm text-gray-700 dark:text-gray-300">Você receberá uma notificação no telefone informado para confirmar o pagamento.</p>
            )}
            {resultado.metodoUsado === "REF" && (
              <pre className="rounded bg-gray-50 p-3 text-xs dark:bg-gray-800">{JSON.stringify(resultado.cobranca.response ?? {}, null, 2)}</pre>
            )}
            {resultado.metodoUsado === "GPO_QR" && <Qr value={resultado.cobranca.qrCodeArr} />}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={onVerificarStatus}>Verificar status</Button>
              <Button size="sm" variant="outline" onClick={() => onNovaSelecao(academia)}>Selecionar outros meses</Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <MetodoPagamentoSelector value={metodoAtual} disponiveis={disponiveis} onChange={(m) => onMudarMetodo(academia, m)} />
            {metodoAtual === "GPO" && (
              <Input placeholder="Telefone" value={telefoneAtual} onChange={(e) => onMudarTelefone(academia, e.target.value)} />
            )}
            <Button
              disabled={!selecionados.length || (metodoAtual === "GPO" && !telefoneAtual)}
              onClick={() => onConfirmar(academia)}
            >
              Confirmar pagamento
            </Button>
          </div>
        )
      )}
    </div>
  );
}

export default function EstudantePagamentosPainel() {
  const { user, loading } = useUserCookie();
  const restricted = tokenStorage.isRestrictedFinance();
  const codigo = getCodigo(user);

  const [tela, setTela] = useState<Tela>({ nome: "lista" });

  // ── Mensalidades pendentes + pagamento — lógica de seleção/pagamento
  // agora vive na tela principal (antes ficava numa subtela "pagar"),
  // então o estado é mantido por academia (Record chaveado por
  // codigo_academia) em vez de um único valor: mais de uma academia pode
  // ter controles de pagamento visíveis ao mesmo tempo quando há
  // pendências em mais de uma (ver `semDivisao` abaixo). ──
  const mensalidades = useApi(financeiroService.consultarMensalidadesEstudante);
  const pagar = useApi(financeiroService.iniciarPagamentoMensalidades);
  const [estadoMensalidades, setEstadoMensalidades] = useState("");
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [metodo, setMetodo] = useState<Record<string, FinanceiroMetodoPagamento>>({});
  const [telefone, setTelefone] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Record<string, ResultadoPagamento | undefined>>({});
  const [nomesAcademias, setNomesAcademias] = useState<Record<string, string>>({});
  // Academias cujo `selected`/`metodo` padrão já foi calculado — evita
  // recalcular (e apagar a seleção em andamento do estudante) a cada
  // refetch de `mensalidades`. Só é removido de propósito logo após um
  // pagamento confirmado daquela academia (ver `confirmarPagamento`), para
  // que ela seja recalculada com os dados novos assim que o resultado for
  // dispensado em "Selecionar outros meses".
  const initializedRef = useRef<Set<string>>(new Set());
  // Academias cujo nome já foi buscado (com sucesso ou falha) — evita
  // repetir a requisição a cada render; em caso de falha o título mantém
  // o fallback "Academia [código]" (ver render abaixo).
  const nomesFetchedRef = useRef<Set<string>>(new Set());

  // ── Histórico completo de cobranças — mesma fonte/filtros de antes,
  // agora renderizado dentro da subtela "Histórico de pagamentos" em vez
  // de uma seção fixa no fim da página. ──
  const historico = useApi(financeiroService.consultarCobrancasEstudante);
  const [tipoHistorico, setTipoHistorico] = useState<"" | FinanceiroOrigemCobranca>("");
  const [estadoHistorico, setEstadoHistorico] = useState("");
  const [paginaHistorico, setPaginaHistorico] = useState(1);

  const [alert, setAlert] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && codigo) {
      void mensalidades.execute(codigo).catch((e) => setAlert(formatApiError(e, "Não foi possível carregar mensalidades.")));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, codigo]);

  useEffect(() => {
    if (!loading && codigo && !restricted) {
      void historico
        .execute(codigo, {
          limit: PAGE_SIZE,
          offset: (paginaHistorico - 1) * PAGE_SIZE,
          tipo: tipoHistorico ? [tipoHistorico] : undefined,
          estado: estadoHistorico ? [estadoHistorico] : undefined,
        })
        .catch((e) => setAlert(formatApiError(e, "Não foi possível carregar o histórico de cobranças.")));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, codigo, restricted, paginaHistorico, tipoHistorico, estadoHistorico]);

  // Calcula a seleção/método padrão de cada academia com pendências que
  // ainda não foi inicializada — mesmo cálculo que antes rodava em
  // "abrirPagamento" (mês pendente mais antigo pré-selecionado e
  // obrigatório, primeiro método habilitado da academia), só que agora
  // roda automaticamente para toda academia nova assim que os dados
  // chegam, em vez de esperar o estudante clicar em um botão por academia.
  useEffect(() => {
    const todas = mensalidades.data?.mensalidades ?? [];
    const metodosPorAcademia = mensalidades.data?.metodos_pagamento_por_academia ?? {};
    const academiasNovas = Array.from(new Set(todas.filter((m) => m.estado === "pendente").map((m) => m.codigo_academia)))
      .filter((a) => !initializedRef.current.has(a));
    if (academiasNovas.length === 0) return;
    setSelected((prev) => {
      const next = { ...prev };
      for (const academia of academiasNovas) {
        const pendentes = todas
          .filter((m) => m.codigo_academia === academia && m.estado === "pendente")
          .sort(compararMensalidadesPorData);
        next[academia] = pendentes[0] ? [chaveMensalidade(pendentes[0])] : [];
      }
      return next;
    });
    setMetodo((prev) => {
      const next = { ...prev };
      for (const academia of academiasNovas) next[academia] = (metodosPorAcademia[academia]?.[0] ?? "GPO") as FinanceiroMetodoPagamento;
      return next;
    });
    academiasNovas.forEach((a) => initializedRef.current.add(a));
  }, [mensalidades.data]);

  // Nome de cada academia presente nas mensalidades — troca o título
  // "Academia [código]" por "[Nome da academia]" quando a divisão por
  // academia está ativa. GET /consultar-academia/:codigo é público (ver
  // OptionalAuthMiddleware em cmd/server/main.go), então qualquer
  // estudante pode consultar o nome de qualquer academia à qual tenha
  // mensalidades vinculadas.
  useEffect(() => {
    const codigos = Array.from(new Set((mensalidades.data?.mensalidades ?? []).map((m) => m.codigo_academia)));
    const faltantes = codigos.filter((c) => !nomesFetchedRef.current.has(c));
    if (faltantes.length === 0) return;
    faltantes.forEach((c) => nomesFetchedRef.current.add(c));
    faltantes.forEach((codigoAcademia) => {
      consultasService
        .academia(codigoAcademia)
        .then((r) => setNomesAcademias((prev) => ({ ...prev, [codigoAcademia]: r.academia.nome })))
        .catch(() => { /* mantém o fallback "Academia [código]" no título desta academia */ });
    });
  }, [mensalidades.data]);

  const toggleMes = (academia: string, chave: string, checked: boolean) => {
    setSelected((prev) => {
      const atual = prev[academia] ?? [];
      return { ...prev, [academia]: checked ? [...atual, chave] : atual.filter((x) => x !== chave) };
    });
  };
  const mudarMetodo = (academia: string, m: FinanceiroMetodoPagamento) => setMetodo((prev) => ({ ...prev, [academia]: m }));
  const mudarTelefone = (academia: string, v: string) => setTelefone((prev) => ({ ...prev, [academia]: v }));
  const novaSelecao = (academia: string) => setResult((prev) => ({ ...prev, [academia]: undefined }));

  const confirmarPagamento = async (academia: string) => {
    const metodoUsado = metodo[academia] ?? "GPO";
    const meses = (selected[academia] ?? []).map((chave) => {
      const [ano_letivo, mesStr] = chave.split(":");
      return { ano_letivo, mes: Number(mesStr) };
    });
    try {
      const r = await pagar.execute({ codigo_academia: academia, meses, metodo_pagamento: metodoUsado, telefone: metodoUsado === "GPO" ? (telefone[academia] ?? "") : undefined });
      if (r) setResult((prev) => ({ ...prev, [academia]: { cobranca: r.cobranca, metodoUsado } }));
      // Força o recálculo da seleção padrão desta academia assim que os
      // dados atualizados chegarem (ver efeito acima) — se ainda restarem
      // pendências, a próxima mais antiga já fica pronta para quando o
      // estudante clicar em "Selecionar outros meses".
      initializedRef.current.delete(academia);
      await mensalidades.execute(codigo);
    } catch (e) {
      setAlert(formatApiError(e, "Não foi possível iniciar o pagamento."));
    }
  };

  if (loading) return <LoadingState label="Carregando..." />;
  if (!codigo) return <Alert variant="error" title="Pagamentos" message="Não foi possível identificar o estudante logado." />;

  if (tela.nome === "detalhe") {
    return <SubtelaDetalheCobranca cobranca={tela.cobranca} onVoltar={() => setTela({ nome: "historico" })} mostrarDadosEstudante={false} />;
  }

  if (tela.nome === "historico") {
    const totalHistorico = historico.data?.total_geral ?? 0;
    const totalPaginasHistorico = Math.max(1, Math.ceil(totalHistorico / PAGE_SIZE));
    return (
      <SubtelaPanel title="Histórico de pagamentos" icon="mdi:history" onVoltar={() => setTela({ nome: "lista" })}>
        {alert && <Alert variant="error" title="Pagamentos" message={alert} />}
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
              {historico.loading ? (
                <LoadingState label="Carregando histórico..." />
              ) : (historico.data?.cobrancas?.length ?? 0) > 0 ? (
                <CobrancasTable rows={historico.data?.cobrancas ?? []} onOpen={(c) => setTela({ nome: "detalhe", cobranca: c })} />
              ) : (
                <EmptyState title="Sem histórico." description="Nenhuma cobrança foi encontrada para os filtros selecionados." />
              )}
            </div>
            <div className="mt-4">
              <PaginacaoSetas paginaAtual={paginaHistorico} totalPaginas={totalPaginasHistorico} total={totalHistorico} porPagina={PAGE_SIZE} onChange={setPaginaHistorico} />
            </div>
          </>
        )}
      </SubtelaPanel>
    );
  }

  const filtered = (mensalidades.data?.mensalidades ?? []).filter((m) => !estadoMensalidades || m.estado === estadoMensalidades);
  const byAcademia = filtered.reduce<Record<string, MensalidadeMesView[]>>((acc, m) => { (acc[m.codigo_academia] ??= []).push(m); return acc; }, {});
  // Só divide em uma tabela/lista por academia quando há pendências em
  // mais de uma — o cálculo usa as mensalidades sem o filtro de estado
  // (`mensalidades.data`, não `filtered`) para que a divisão não mude
  // conforme o estudante troca o filtro "Estado" acima da lista.
  const academiasComPendencia = new Set((mensalidades.data?.mensalidades ?? []).filter((m) => m.estado === "pendente").map((m) => m.codigo_academia));
  const semDivisao = academiasComPendencia.size <= 1;
  const metodosPagamentoPorAcademia = mensalidades.data?.metodos_pagamento_por_academia ?? {};

  return (
    <div className="space-y-6">
      {restricted && <Alert variant="warning" title="Acesso financeiro restrito" message="O seu vínculo com a academia foi encerrado. Você pode consultar e regularizar pendências financeiras aqui." />}
      {alert && <Alert variant="error" title="Pagamentos" message={alert} />}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Meus pagamentos</h1>
          <Button size="sm" variant="outline" onClick={() => setTela({ nome: "historico" })}>Histórico de pagamentos</Button>
        </div>
        <div className="mt-4">
          <Select
            key={estadoMensalidades}
            defaultValue={estadoMensalidades}
            options={[{ value: "", label: "Todos estados" }, { value: "pendente", label: "Pendentes" }, { value: "pago", label: "Pagos" }, { value: "anulado", label: "Anulados" }]}
            onChange={(v) => setEstadoMensalidades(v)}
          />
        </div>

        {mensalidades.loading ? (
          <div className="mt-5"><LoadingState label="Carregando mensalidades..." /></div>
        ) : filtered.length === 0 ? (
          <div className="mt-5"><EmptyState title="Nenhuma mensalidade encontrada." description="Não há mensalidades para os filtros selecionados." /></div>
        ) : semDivisao ? (
          <SecaoMensalidadesAcademia
            linhas={[...filtered].sort(compararMensalidadesPorData)}
            selected={selected}
            metodo={metodo}
            telefone={telefone}
            resultados={result}
            metodosPagamentoPorAcademia={metodosPagamentoPorAcademia}
            onToggleMes={toggleMes}
            onMudarMetodo={mudarMetodo}
            onMudarTelefone={mudarTelefone}
            onConfirmar={confirmarPagamento}
            onVerificarStatus={() => void mensalidades.execute(codigo)}
            onNovaSelecao={novaSelecao}
          />
        ) : (
          Object.entries(byAcademia).map(([academia, linhas]) => (
            <SecaoMensalidadesAcademia
              key={academia}
              titulo={nomesAcademias[academia] ?? `Academia ${academia}`}
              linhas={[...linhas].sort(compararMensalidadesPorData)}
              selected={selected}
              metodo={metodo}
              telefone={telefone}
              resultados={result}
              metodosPagamentoPorAcademia={metodosPagamentoPorAcademia}
              onToggleMes={toggleMes}
              onMudarMetodo={mudarMetodo}
              onMudarTelefone={mudarTelefone}
              onConfirmar={confirmarPagamento}
              onVerificarStatus={() => void mensalidades.execute(codigo)}
              onNovaSelecao={novaSelecao}
            />
          ))
        )}
      </section>
    </div>
  );
}
