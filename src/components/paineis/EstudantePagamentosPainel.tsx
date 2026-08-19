"use client";
import { useEffect, useMemo, useState } from "react";
import { financeiroService, tokenStorage, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserCookie } from "@/hooks/useUserCookie";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import SearchableSelect from "@/components/form/SearchableSelect";
import Checkbox from "@/components/form/input/Checkbox";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  CobrancasTable,
  EmptyState,
  LoadingState,
  PaginacaoSetas,
  Qr,
  StatusBadge,
  SubtelaDetalheCobranca,
  SubtelaPanel,
  formatAnoLetivo,
  money,
} from "@/components/paineis/financeiroShared";
import type { CobrancaResumo, FinanceiroMetodoPagamento, FinanceiroOrigemCobranca, MensalidadeMesView } from "@/types/api";

const PAGE_SIZE = 30;
const mesNome = (m: number) => new Intl.DateTimeFormat("pt-AO", { month: "long" }).format(new Date(2026, m - 1, 1));
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

type Tela = { nome: "lista" } | { nome: "pagar"; academia: string } | { nome: "detalhe"; cobranca: CobrancaResumo };

export default function EstudantePagamentosPainel() {
  const { user, loading } = useUserCookie();
  const restricted = tokenStorage.isRestrictedFinance();
  const codigo = getCodigo(user);

  const [tela, setTela] = useState<Tela>({ nome: "lista" });

  // ── Mensalidades pendentes + pagamento (feature independente, não alterada na regra de negócio) ──
  const mensalidades = useApi(financeiroService.consultarMensalidadesEstudante);
  const pagar = useApi(financeiroService.iniciarPagamentoMensalidades);
  const [estadoMensalidades, setEstadoMensalidades] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [metodo, setMetodo] = useState<FinanceiroMetodoPagamento>("GPO");
  const [telefone, setTelefone] = useState("");
  const [result, setResult] = useState<any>(null);

  // ── Histórico completo de cobranças (tipo + estado + ver detalhes) ──
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

  const filtered = (mensalidades.data?.mensalidades ?? []).filter((m) => !estadoMensalidades || m.estado === estadoMensalidades);
  const byAcademia = useMemo(
    () => filtered.reduce<Record<string, MensalidadeMesView[]>>((acc, m) => { (acc[m.codigo_academia] ??= []).push(m); return acc; }, {}),
    [filtered]
  );

  const abrirPagamento = (academia: string, meses: MensalidadeMesView[]) => {
    const pend = meses.filter((m) => m.estado === "pendente").sort((a, b) => a.ano_letivo.localeCompare(b.ano_letivo) || a.mes - b.mes);
    setSelected(pend[0] ? [`${pend[0].ano_letivo}:${pend[0].mes}`] : []);
    setMetodo((mensalidades.data?.metodos_pagamento_por_academia[academia]?.[0] ?? "GPO") as FinanceiroMetodoPagamento);
    setTelefone("");
    setResult(null);
    setTela({ nome: "pagar", academia });
  };

  const confirmarPagamento = async (academia: string) => {
    try {
      const meses = selected.map((x) => { const [ano_letivo, mes] = x.split(":"); return { ano_letivo, mes: Number(mes) }; });
      const r = await pagar.execute({ codigo_academia: academia, meses, metodo_pagamento: metodo, telefone: metodo === "GPO" ? telefone : undefined });
      setResult(r);
      await mensalidades.execute(codigo);
    } catch (e) {
      setAlert(formatApiError(e, "Não foi possível iniciar o pagamento."));
    }
  };

  if (loading) return <LoadingState label="Carregando..." />;
  if (!codigo) return <Alert variant="error" title="Pagamentos" message="Não foi possível identificar o estudante logado." />;

  if (tela.nome === "detalhe") {
    return <SubtelaDetalheCobranca cobranca={tela.cobranca} onVoltar={() => setTela({ nome: "lista" })} mostrarDadosEstudante={false} />;
  }

  if (tela.nome === "pagar") {
    const academia = tela.academia;
    const pendentes = (mensalidades.data?.mensalidades ?? [])
      .filter((m) => m.codigo_academia === academia && m.estado === "pendente")
      .sort((a, b) => a.ano_letivo.localeCompare(b.ano_letivo) || a.mes - b.mes);
    return (
      <SubtelaPanel title={`Pagar mensalidades — Academia ${academia}`} icon="mdi:cash-multiple" onVoltar={() => setTela({ nome: "lista" })}>
        {alert && <Alert variant="error" title="Pagamentos" message={alert} />}
        {result ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">Status: {result.cobranca.status}</p>
            {metodo === "GPO" && <p className="text-sm text-gray-700 dark:text-gray-300">Você receberá uma notificação no telefone informado para confirmar o pagamento.</p>}
            {metodo === "REF" && <pre className="rounded bg-gray-50 p-3 text-xs dark:bg-gray-800">{JSON.stringify(result.cobranca.response ?? {}, null, 2)}</pre>}
            {metodo === "GPO_QR" && <Qr value={result.cobranca.qrCodeArr} />}
            <Button size="sm" onClick={() => void mensalidades.execute(codigo)}>Verificar status</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {pendentes.map((m, i) => {
                const key = `${m.ano_letivo}:${m.mes}`;
                return (
                  <Checkbox
                    key={key}
                    id={`mes-${key}`}
                    checked={selected.includes(key)}
                    disabled={i === 0}
                    onChange={(checked) => setSelected((s) => (checked ? [...s, key] : s.filter((x) => x !== key)))}
                    label={`${formatAnoLetivo(m.ano_letivo)} · ${mesNome(m.mes)} · ${money(m.valor)}${i === 0 ? " (mais antigo, obrigatório)" : ""}`}
                  />
                );
              })}
            </div>
            <Select
              key={metodo}
              defaultValue={metodo}
              options={(mensalidades.data?.metodos_pagamento_por_academia[academia] ?? ["GPO"]).map((m) => ({ value: m, label: m }))}
              onChange={(v) => setMetodo(v as FinanceiroMetodoPagamento)}
            />
            {metodo === "GPO" && <Input placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />}
            <Button disabled={!selected.length || (metodo === "GPO" && !telefone)} onClick={() => confirmarPagamento(academia)}>Confirmar pagamento</Button>
          </div>
        )}
      </SubtelaPanel>
    );
  }

  const totalHistorico = historico.data?.total_geral ?? 0;
  const totalPaginasHistorico = Math.max(1, Math.ceil(totalHistorico / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {restricted && <Alert variant="warning" title="Acesso financeiro restrito" message="O seu vínculo com a academia foi encerrado. Você pode consultar e regularizar pendências financeiras aqui." />}
      {alert && <Alert variant="error" title="Pagamentos" message={alert} />}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Meus pagamentos</h1>
        <div className="mt-4">
          <Select
            key={estadoMensalidades}
            defaultValue={estadoMensalidades}
            options={[{ value: "", label: "Todos estados" }, { value: "pendente", label: "Pendentes" }, { value: "pago", label: "Pagos" }, { value: "anulado", label: "Anulados" }]}
            onChange={(v) => setEstadoMensalidades(v)}
          />
        </div>
        {Object.entries(byAcademia).map(([academia, rows]) => (
          <div key={academia} className="mt-5 rounded-xl border p-4 dark:border-white/[0.05]">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 dark:text-white/90">Academia {academia}</h2>
              {rows.some((m) => m.estado === "pendente") && <Button size="sm" onClick={() => abrirPagamento(academia, rows)}>Pagar mensalidades</Button>}
            </div>
            <div className="mt-3 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>{["Ano letivo", "Mês", "Valor", "Estado"].map((h) => <TableCell key={h} isHeader className="px-3 py-2 text-xs uppercase text-gray-500 dark:text-gray-400">{h}</TableCell>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatAnoLetivo(m.ano_letivo)}</TableCell>
                      <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{mesNome(m.mes)}</TableCell>
                      <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{money(m.valor)}</TableCell>
                      <TableCell className="px-3 py-2"><StatusBadge status={m.estado} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <h2 className="font-semibold text-gray-800 dark:text-white/90">Histórico completo de cobranças</h2>
        {restricted ? (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Histórico completo indisponível nesta sessão restrita; apenas mensalidades e pagamento estão liberados.</p>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
      </section>
    </div>
  );
}
