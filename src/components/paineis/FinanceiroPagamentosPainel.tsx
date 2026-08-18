"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { financeiroService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserType } from "@/hooks/useRoutePermission";
import UnauthorizedAccess from "@/components/guards/UnauthorizedAccess";
import Alert from "@/components/ui/alert/Alert";
import Icon from "@/components/ui/Icon";
import SearchableSelect from "@/components/form/SearchableSelect";
import {
  CobrancaDetalhesModal,
  CobrancasTable,
  EmptyState,
  LoadingState,
  PaginacaoSetas,
} from "@/components/paineis/financeiroShared";
import type { CobrancaResumo, FinanceiroOrigemCobranca } from "@/types/api";

const PAGE_SIZE = 30;

const TIPO_OPCOES: { value: "" | FinanceiroOrigemCobranca; label: string }[] = [
  { value: "", label: "Todos os tipos" },
  { value: "mensalidade", label: "Mensalidade" },
  { value: "matricula", label: "Matrícula" },
  { value: "avulsa", label: "Outros" },
];

const ESTADO_OPCOES = [
  { value: "", label: "Todos os estados" },
  { value: "Success", label: "Pago" },
  { value: "Pending", label: "Pendente" },
  { value: "Failed", label: "Falhado" },
  { value: "Cancelled", label: "Cancelado" },
];

/**
 * Painel de pagamentos para academia e admin (FPP).
 *
 * - Academia: uma única tabela de cobranças, paginada de verdade (30 por
 *   página, requisição sempre com limit/offset da página atual — mesmo
 *   padrão de /estudantes), com filtro por tipo e por estado, e um botão
 *   "Ver detalhes" por cobrança.
 * - Admin (FPP): ainda não existe tipo de cobrança específico para o
 *   Spuri, então a tela mostra apenas um aviso "indisponível no momento"
 *   — sem listar cobranças de nenhuma academia.
 *
 * A antiga seção "Consultar mensalidades e histórico por estudante" (uma
 * segunda tabela, separada) foi removida: agora há só a tabela acima,
 * e "ver detalhes" mostra os dados do estudante vinculado quando houver.
 */
export default function FinanceiroPagamentosPainel() {
  const { user, isAdmin, isAcademia, loading } = useUserType();
  const isFpp = isAdmin && user?.admin?.role === "fpp";

  const [codigoAcademia, setCodigoAcademia] = useState(user?.academia?.codigo_academia ?? "");
  const [tipo, setTipo] = useState<"" | FinanceiroOrigemCobranca>("");
  const [estado, setEstado] = useState("");
  const [pagina, setPagina] = useState(1);
  const [alert, setAlert] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<CobrancaResumo | null>(null);

  const list = useApi(financeiroService.listarCobrancas);
  const cancelApi = useApi(financeiroService.cancelarCobranca);

  useEffect(() => {
    if (user?.academia?.codigo_academia) setCodigoAcademia(user.academia.codigo_academia);
  }, [user?.academia?.codigo_academia]);

  const parametros = useMemo(
    () => ({
      contexto_tipo: "academia" as const,
      codigo_academia: codigoAcademia || undefined,
      limit: PAGE_SIZE,
      offset: (pagina - 1) * PAGE_SIZE,
      tipo: tipo ? [tipo] : undefined,
      estado: estado ? [estado] : undefined,
    }),
    [codigoAcademia, tipo, estado, pagina]
  );

  const carregar = useCallback(() => {
    if (!codigoAcademia) return Promise.resolve();
    return list.execute(parametros).catch((e) => setAlert(formatApiError(e, "Não foi possível carregar as cobranças.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoAcademia, parametros]);

  useEffect(() => {
    if (!loading && isAcademia) void carregar();
  }, [loading, isAcademia, carregar]);

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

  const totalGeral = list.data?.total_geral ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalGeral / PAGE_SIZE));
  const cobrancas = list.data?.cobrancas ?? [];

  return (
    <div className="space-y-6">
      {alert && <Alert variant="error" title="Finanças" message={alert} />}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex items-start gap-3">
          <Icon icon="mdi:credit-card-multiple-outline" width={24} className="text-gray-800 dark:text-white/90" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Pagamentos</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Cobranças AppyPay da sua academia, em todos os estados.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SearchableSelect
            value={tipo}
            options={TIPO_OPCOES}
            onChange={(v) => { setTipo(v); setPagina(1); }}
            placeholder="Tipo de cobrança"
            isSearchable={false}
            isClearable={false}
            inputId="pagamentos-tipo"
            name="pagamentos-tipo"
          />
          <SearchableSelect
            value={estado}
            options={ESTADO_OPCOES}
            onChange={(v) => { setEstado(v); setPagina(1); }}
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
          ) : cobrancas.length > 0 ? (
            <CobrancasTable rows={cobrancas} onOpen={setSelecionada} />
          ) : (
            <EmptyState title="Nenhuma cobrança encontrada." description="Ajuste os filtros ou aguarde novas cobranças serem criadas." />
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
      </section>

      <CobrancaDetalhesModal
        cobranca={selecionada}
        onClose={() => setSelecionada(null)}
        mostrarDadosEstudante
        onCancelar={async (cobranca, motivo) => {
          await cancelApi.execute(cobranca.id, motivo);
          await carregar();
        }}
      />
    </div>
  );
}
