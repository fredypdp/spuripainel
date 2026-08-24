"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { academiaService, financeiroService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserType } from "@/hooks/useRoutePermission";
import UnauthorizedAccess from "@/components/guards/UnauthorizedAccess";
import Alert from "@/components/ui/alert/Alert";
import Icon from "@/components/ui/Icon";
import SearchableSelect from "@/components/form/SearchableSelect";
import {
  CobrancasTable,
  EmptyState,
  LoadingState,
  NOME_MES,
  PaginacaoSetas,
  SubtelaDetalheCobranca,
  SubtelaPanel,
  SubtelasMenu,
  capitalizar,
  formatAnoLetivo,
} from "@/components/paineis/financeiroShared";
import type { FinanceiroOrigemCobranca, PagamentoResumo } from "@/types/api";

const PAGE_SIZE = 30;

const ESTADO_OPCOES = [
  { value: "", label: "Todos os estados" },
  { value: "Success", label: "Pago" },
  { value: "Pending", label: "Pendente" },
  { value: "Failed", label: "Falhado" },
  { value: "Cancelled", label: "Cancelado" },
];

type MesDoAnoLetivo = { mes: number; ano: number; label: string };

/**
 * Meses fixos do sistema de um ano letivo, dado o tipo da academia
 * (escolar ou superior) — mesma regra de mesesAnoLetivo() no backend
 * (internal/finance/mensalidade.go) e de periodoLetivoEscolar/
 * periodoLetivoSuperior (internal/handlers/ano_letivo_helpers.go):
 * escolar começa em setembro, superior em outubro; os dois terminam em
 * julho — sempre do ano civil ANTERIOR (setembro/outubro) ao ano civil
 * SEGUINTE (janeiro-julho) dentro do mesmo ano letivo. Não é configurável
 * por academia: é a mesma regra para todas, por isso não depende de
 * nenhuma chamada extra à API além de saber o tipo do ano letivo
 * selecionado.
 */
function mesesDoAnoLetivo(anoLetivo: string, tipo: "escolar" | "superior"): MesDoAnoLetivo[] {
  const anoInicio = Number(anoLetivo.slice(0, 4));
  const anoFim = anoInicio + 1;
  const mesInicio = tipo === "superior" ? 10 : 9;
  const meses: MesDoAnoLetivo[] = [];
  for (let m = mesInicio; m <= 12; m++) meses.push({ mes: m, ano: anoInicio, label: `${capitalizar(NOME_MES[m - 1])} de ${anoInicio}` });
  for (let m = 1; m <= 7; m++) meses.push({ mes: m, ano: anoFim, label: `${capitalizar(NOME_MES[m - 1])} de ${anoFim}` });
  return meses;
}

type Tela = "menu" | "mensalidade-ano" | "mensalidade-mes" | "lista";

/**
 * Painel de pagamentos para academia e admin (FPP).
 *
 * Dividido em subtelas a partir de um menu de cartões (mesmo padrão de
 * FinanceiroConfiguracoesPainel — nada de <select> para escolher o tipo de
 * cobrança): Mensalidade/Propina abre um drill-down adicional de ano
 * letivo → mês antes de chegar na listagem; Taxa de matrícula e Outros vão
 * direto para a listagem, sem esse passo extra (uma cobrança de matrícula
 * ou avulsa não tem o conceito de "mês do ano letivo").
 *
 * A listagem final sempre mostra TODOS os estados (Pago/Pendente/Falhado/
 * Cancelado) — o filtro de estado que já existia continua disponível para
 * quem quiser restringir mais. Para Mensalidade, a mesma tabela também já
 * traz os meses ainda não pagos sem nenhuma cobrança gerada, marcados com
 * `pendencia_sem_cobranca: true` (ver CobrancasTable e
 * PagamentoResumo.pendencia_sem_cobranca) — antes desta tarefa isso vinha
 * como uma segunda lista separada (`pendencias_sem_cobranca`), com
 * paginação própria; agora é uma lista só, paginada pelo backend como uma
 * única sequência (ver `ListarPagamentosUnificado` no backend). O
 * drill-down por ano letivo/mês continua existindo pelo mesmo motivo de
 * antes: sem um mês específico selecionado, o backend não computa
 * pendências (evita varredura de toda a academia sem limite).
 *
 * Admin (FPP): ainda não existe tipo de cobrança específico para o Spuri,
 * então a tela mostra apenas um aviso "indisponível no momento" — igual a
 * antes desta tarefa.
 */
export default function FinanceiroPagamentosPainel() {
  const { user, isAdmin, isAcademia, loading } = useUserType();
  const isFpp = isAdmin && user?.admin?.role === "fpp";

  const [codigoAcademia, setCodigoAcademia] = useState(user?.academia?.codigo_academia ?? "");
  const [tela, setTela] = useState<Tela>("menu");
  const [origem, setOrigem] = useState<FinanceiroOrigemCobranca | null>(null);
  const [anoLetivoSelecionado, setAnoLetivoSelecionado] = useState<string | null>(null);
  const [tipoAnoLetivoSelecionado, setTipoAnoLetivoSelecionado] = useState<"escolar" | "superior" | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState<MesDoAnoLetivo | null>(null);
  const [estado, setEstado] = useState("");
  const [pagina, setPagina] = useState(1);
  const [alert, setAlert] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<PagamentoResumo | null>(null);

  const [anosLetivos, setAnosLetivos] = useState<{ ano_letivo: string; tipo: "escolar" | "superior" }[]>([]);
  const [anosLetivosCarregando, setAnosLetivosCarregando] = useState(false);
  const [anosLetivosErro, setAnosLetivosErro] = useState<string | null>(null);

  const list = useApi(financeiroService.listarCobrancas);
  const cancelApi = useApi(financeiroService.cancelarCobranca);

  useEffect(() => {
    if (user?.academia?.codigo_academia) setCodigoAcademia(user.academia.codigo_academia);
  }, [user?.academia?.codigo_academia]);

  // Anos letivos que a academia já teve — carregado uma vez, reaproveitado
  // sempre que o cartão "Mensalidade / Propina" é aberto. Mesma fonte já
  // usada em FinanceiroConfiguracoesPainel (DefinirInicioCobrancaForm).
  useEffect(() => {
    if (!codigoAcademia) return;
    setAnosLetivosCarregando(true);
    setAnosLetivosErro(null);
    academiaService
      .listarAnosLetivosLista({ codigo_academia: codigoAcademia })
      .then((r) => {
        const lista = (r?.anos_letivos_lista ?? [])
          .map((a) => ({ ano_letivo: a.ano_letivo, tipo: (a.tipo ?? a.type) as "escolar" | "superior" | undefined }))
          .filter((a): a is { ano_letivo: string; tipo: "escolar" | "superior" } => !!a.ano_letivo && (a.tipo === "escolar" || a.tipo === "superior"))
          .sort((a, b) => b.ano_letivo.localeCompare(a.ano_letivo));
        setAnosLetivos(lista);
      })
      .catch((e) => setAnosLetivosErro(formatApiError(e, "Não foi possível carregar os anos letivos.")))
      .finally(() => setAnosLetivosCarregando(false));
  }, [codigoAcademia]);

  const parametros = useMemo(
    () => ({
      contexto_tipo: "academia" as const,
      codigo_academia: codigoAcademia || undefined,
      limit: PAGE_SIZE,
      offset: (pagina - 1) * PAGE_SIZE,
      tipo: origem ? [origem] : undefined,
      estado: estado ? [estado] : undefined,
      ano_letivo: origem === "mensalidade" && anoLetivoSelecionado ? anoLetivoSelecionado : undefined,
      mes: origem === "mensalidade" && mesSelecionado ? mesSelecionado.mes : undefined,
    }),
    [codigoAcademia, origem, estado, pagina, anoLetivoSelecionado, mesSelecionado]
  );

  const carregar = useCallback(() => {
    if (!codigoAcademia || tela !== "lista") return Promise.resolve();
    return list.execute(parametros).catch((e) => setAlert(formatApiError(e, "Não foi possível carregar as cobranças.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoAcademia, tela, parametros]);

  useEffect(() => {
    if (!loading && isAcademia) void carregar();
  }, [loading, isAcademia, carregar]);

  const abrirLista = (o: FinanceiroOrigemCobranca) => {
    setAlert(null);
    setOrigem(o);
    setEstado("");
    setPagina(1);
    if (o !== "mensalidade") {
      setAnoLetivoSelecionado(null);
      setTipoAnoLetivoSelecionado(null);
      setMesSelecionado(null);
    }
    setTela(o === "mensalidade" ? "mensalidade-ano" : "lista");
  };

  const selecionarAnoLetivo = (anoLetivo: string, tipo: "escolar" | "superior") => {
    setAnoLetivoSelecionado(anoLetivo);
    setTipoAnoLetivoSelecionado(tipo);
    setMesSelecionado(null);
    setTela("mensalidade-mes");
  };

  const selecionarMes = (m: MesDoAnoLetivo) => {
    setMesSelecionado(m);
    setEstado("");
    setPagina(1);
    setTela("lista");
  };

  if (loading) return <LoadingState label="Carregando pagamentos..." />;

  if (!isAcademia && !isFpp) {
    return (
      <UnauthorizedAccess
        requiredTypes={["Admin FPP", "Academia"]}
        message="O módulo financeiro é exclusivo de administradores com papel FPP e de academias."
      />
    );
  }

  if (isFpp) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex items-start gap-3">
          <Icon icon="mdi:credit-card-multiple-outline" width={24} className="text-gray-800 dark:text-white/90" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Pagamentos</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Ainda não existe um tipo de cobrança específico para o Spuri — indisponível no momento.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (selecionada) {
    return (
      <SubtelaDetalheCobranca
        cobranca={selecionada}
        onVoltar={() => setSelecionada(null)}
        mostrarDadosEstudante
      />
    );
  }

  if (tela === "menu") {
    return (
      <div className="space-y-6">
        {alert && <Alert variant="error" title="Finanças" message={alert} />}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="mb-4 flex items-start gap-3">
            <Icon icon="mdi:credit-card-multiple-outline" width={24} className="text-gray-800 dark:text-white/90" />
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Pagamentos</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Escolha o tipo de cobrança para consultar.</p>
            </div>
          </div>
          <SubtelasMenu
            opcoes={[
              { id: "mensalidade", icon: "mdi:calendar-month-outline", label: "Mensalidade / Propina", descricao: "Consultar por ano letivo e mês.", onClick: () => abrirLista("mensalidade") },
              { id: "matricula", icon: "mdi:school-outline", label: "Taxa de matrícula", descricao: "Todas as cobranças de matrícula, em todos os estados.", onClick: () => abrirLista("matricula") },
              { id: "avulsa", icon: "mdi:cash-multiple", label: "Outros", descricao: "Cobranças avulsas, em todos os estados.", onClick: () => abrirLista("avulsa") },
            ]}
          />
        </section>
      </div>
    );
  }

  if (tela === "mensalidade-ano") {
    return (
      <SubtelaPanel title="Mensalidade / Propina — selecione o ano letivo" icon="mdi:calendar-month-outline" onVoltar={() => setTela("menu")}>
        {anosLetivosCarregando ? (
          <LoadingState label="Carregando anos letivos..." />
        ) : anosLetivosErro ? (
          <Alert variant="error" title="Finanças" message={anosLetivosErro} />
        ) : anosLetivos.length === 0 ? (
          <EmptyState title="Nenhum ano letivo encontrado." description="Esta academia ainda não teve nenhum ano letivo definido." />
        ) : (
          <SubtelasMenu
            opcoes={anosLetivos.map((a) => ({
              id: a.ano_letivo,
              icon: "mdi:calendar-blank-outline",
              label: formatAnoLetivo(a.ano_letivo),
              descricao: a.tipo === "superior" ? "Ano letivo de ensino superior" : "Ano letivo escolar",
              onClick: () => selecionarAnoLetivo(a.ano_letivo, a.tipo),
            }))}
          />
        )}
      </SubtelaPanel>
    );
  }

  if (tela === "mensalidade-mes" && anoLetivoSelecionado && tipoAnoLetivoSelecionado) {
    const meses = mesesDoAnoLetivo(anoLetivoSelecionado, tipoAnoLetivoSelecionado);
    return (
      <SubtelaPanel title={`Mensalidade / Propina — ${formatAnoLetivo(anoLetivoSelecionado)} — selecione o mês`} icon="mdi:calendar-month-outline" onVoltar={() => setTela("mensalidade-ano")}>
        <SubtelasMenu
          opcoes={meses.map((m) => ({
            id: `${m.ano}-${m.mes}`,
            icon: "mdi:calendar-today-outline",
            label: m.label,
            descricao: "Ver cobranças e pendências deste mês.",
            onClick: () => selecionarMes(m),
          }))}
        />
      </SubtelaPanel>
    );
  }

  const totalGeral = list.data?.total_geral ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalGeral / PAGE_SIZE));
  const pagamentos = list.data?.pagamentos ?? [];

  const tituloLista =
    origem === "mensalidade" && anoLetivoSelecionado && mesSelecionado
      ? `Mensalidade / Propina — ${mesSelecionado.label}`
      : origem === "matricula"
      ? "Taxa de matrícula"
      : "Outros";
  const iconeLista = origem === "mensalidade" ? "mdi:calendar-month-outline" : origem === "matricula" ? "mdi:school-outline" : "mdi:cash-multiple";
  const voltarLista = () => (origem === "mensalidade" ? setTela("mensalidade-mes") : setTela("menu"));

  return (
    <SubtelaPanel title={tituloLista} icon={iconeLista} onVoltar={voltarLista}>
      {alert && <Alert variant="error" title="Finanças" message={alert} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <SearchableSelect
          value={estado}
          options={ESTADO_OPCOES}
          onChange={(v) => {
            setEstado(v);
            setPagina(1);
          }}
          placeholder="Estado do pagamento"
          isSearchable={false}
          isClearable={false}
          inputId="pagamentos-estado"
          name="pagamentos-estado"
        />
      </div>

      <div className="mt-4">
        {list.loading ? (
          <LoadingState label="Carregando pagamentos..." />
        ) : pagamentos.length > 0 ? (
          <CobrancasTable
            rows={pagamentos}
            onOpen={setSelecionada}
            onCancelar={async (pagamento, motivo) => {
              await cancelApi.execute(pagamento.id, motivo);
              await carregar();
            }}
          />
        ) : (
          <EmptyState title="Nenhum pagamento encontrado." description="Ajuste os filtros ou aguarde novas cobranças serem criadas." />
        )}
      </div>

      <div className="mt-4">
        <PaginacaoSetas
          paginaAtual={pagina}
          totalPaginas={totalPaginas}
          total={totalGeral}
          porPagina={PAGE_SIZE}
          onChange={setPagina}
        />
      </div>
    </SubtelaPanel>
  );
}
