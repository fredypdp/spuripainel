"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, consultasService, financeiroService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserType } from "@/hooks/useRoutePermission";
import type {
  AcademiaDetalhada,
  CriarFinanceiroCredencialRequest,
  FinanceiroContextoTipo,
  FinanceiroCredencial,
  ListarFinanceiroCredenciaisParams,
} from "@/types/api";
import UnauthorizedAccess from "@/components/guards/UnauthorizedAccess";
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import Alert from "@/components/ui/alert/Alert";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import SearchableSelect from "@/components/form/SearchableSelect";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

type AlertState = { variant: "success" | "error" | "warning" | "info"; message: string } | null;
type ContextFilter = "todas" | "spuri" | "academia";
type FormErrors = Partial<Record<keyof CredencialFormData | "contexto", string>>;

/**
 * Campos de credencial que o formulário coleta. NÃO inclui webhook_secret
 * nem webhook_header_name: o backend (finance.CredentialInput) nunca teve
 * esses campos no corpo da requisição — o segredo é gerado automaticamente
 * pelo servidor na primeira configuração da credencial, e o nome do
 * cabeçalho é a constante fixa "X-Spuri-Webhook-Secret"
 * (finance.WebhookHeaderName), nunca configurável. Ver
 * WebhookSecretPanel abaixo para consultar/rotacionar o segredo depois.
 */
type CredencialFormData = {
  client_id: string;
  client_secret: string;
  gpo_payment_method: string;
  ref_payment_method: string;
};

const EMPTY_FORM: CredencialFormData = {
  client_id: "",
  client_secret: "",
  gpo_payment_method: "",
  ref_payment_method: "",
};

const WEBHOOK_HEADER_NAME = "X-Spuri-Webhook-Secret";

function LoadingState() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
        Carregando credenciais...
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-AO", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function getErrorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 403) return "Você não tem permissão para configurar credenciais deste contexto.";
    if (err.status === 409) return "Já existe uma operação em andamento para esta credencial, tente novamente em instantes.";
    if (err.status === 503) return "Não foi possível confirmar com a AppyPay agora. Tente novamente mais tarde.";
  }
  return formatApiError(err, "Não foi possível salvar a credencial.");
}

function contextParams(filter: ContextFilter, codigoAcademia: string): ListarFinanceiroCredenciaisParams | undefined {
  if (filter === "spuri") return { contexto_tipo: "spuri" };
  if (filter === "academia" && codigoAcademia) return { contexto_tipo: "academia", codigo_academia: codigoAcademia };
  return undefined;
}

export default function FinanceiroCredenciaisPainel() {
  const { user, isAdmin, isAcademia, loading } = useUserType();
  const isFpp = isAdmin && user?.admin?.role === "fpp";

  const [alert, setAlert] = useState<AlertState>(null);
  const [contextFilter, setContextFilter] = useState<ContextFilter>("todas");
  const [codigoAcademia, setCodigoAcademia] = useState("");
  const [academias, setAcademias] = useState<AcademiaDetalhada[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceiroCredencial | null>(null);
  const [formData, setFormData] = useState<CredencialFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  // Erro/sucesso do próprio formulário — renderizado DENTRO do card do
  // formulário (não no topo da página), para que o usuário veja o erro
  // exatamente onde ele foi disparado.
  const [formAlert, setFormAlert] = useState<AlertState>(null);
  const [showClientSecret, setShowClientSecret] = useState(false);
  // Segredo do webhook devolvido UMA VEZ pelo backend, na criação da
  // credencial (finance.CredencialAppyPayCriada.WebhookSecret). Some
  // depois de fechado — para vê-lo de novo, use "Consultar segredo" na
  // linha da tabela (WebhookSecretPanel).
  const [novoWebhookSecret, setNovoWebhookSecret] = useState<string | null>(null);

  const { execute: listarCredenciais, data: credenciais, loading: listando } = useApi(financeiroService.listarCredenciais);
  const { execute: criarCredencial, loading: criando } = useApi(financeiroService.criarCredencial);
  const { execute: atualizarCredencial, loading: atualizando } = useApi(financeiroService.atualizarCredencial);
  const { execute: removerCredencial } = useApi(financeiroService.removerCredencial);
  const { execute: listarAcademias, loading: listandoAcademias } = useApi(consultasService.listarAcademias);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  const saving = criando || atualizando;

  const academiaOptions = useMemo(() => academias.map((academia) => ({
    value: academia.codigo_academia,
    label: `${academia.nome} (${academia.codigo_academia})`,
  })), [academias]);

  const activeParams = useCallback((): ListarFinanceiroCredenciaisParams | undefined => {
    if (isAcademia) return undefined;
    return contextParams(contextFilter, codigoAcademia);
  }, [codigoAcademia, contextFilter, isAcademia]);

  const carregarCredenciais = useCallback(async () => {
    if (!isAcademia && !isFpp) return;
    if (isFpp && contextFilter === "academia" && !codigoAcademia) return;
    try {
      await listarCredenciais(activeParams());
    } catch (err) {
      setAlert({ variant: "error", message: formatApiError(err, "Não foi possível carregar as credenciais.") });
    }
  }, [activeParams, codigoAcademia, contextFilter, isAcademia, isFpp, listarCredenciais]);

  useEffect(() => {
    if (!isFpp) return;
    listarAcademias({ status: "ativo" })
      .then((response) => setAcademias(response?.academias ?? []))
      .catch((err) => setAlert({ variant: "error", message: formatApiError(err, "Não foi possível carregar as academias.") }));
  }, [isFpp, listarAcademias]);

  useEffect(() => {
    if (!loading) void carregarCredenciais();
  }, [carregarCredenciais, loading]);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setFormAlert(null);
    setShowClientSecret(false);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    resetForm();
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (credencial: FinanceiroCredencial) => {
    setEditing(credencial);
    resetForm();
    setFormOpen(true);
  };

  const resolveContext = (): { contexto_tipo: FinanceiroContextoTipo; codigo_academia?: string } | null => {
    if (isAcademia) return { contexto_tipo: "academia", codigo_academia: user?.academia?.codigo_academia };
    if (editing) return { contexto_tipo: editing.contexto_tipo, codigo_academia: editing.codigo_academia };
    if (contextFilter === "spuri") return { contexto_tipo: "spuri" };
    if (contextFilter === "academia" && codigoAcademia) return { contexto_tipo: "academia", codigo_academia: codigoAcademia };
    return null;
  };

  const validate = () => {
    const errors: FormErrors = {};
    const required: (keyof CredencialFormData)[] = ["client_id", "client_secret", "gpo_payment_method", "ref_payment_method"];
    required.forEach((field) => {
      if (!formData[field].trim()) errors[field] = "Campo obrigatório.";
    });
    // A API da AppyPay exige que os identificadores dos métodos de
    // pagamento comecem com o prefixo do método (validação espelhada de
    // finance.ConfigureCredential no backend).
    if (formData.gpo_payment_method.trim() && !formData.gpo_payment_method.trim().startsWith("GPO_")) {
      errors.gpo_payment_method = 'Deve começar com "GPO_" (ex.: GPO_12345).';
    }
    if (formData.ref_payment_method.trim() && !formData.ref_payment_method.trim().startsWith("REF_")) {
      errors.ref_payment_method = 'Deve começar com "REF_" (ex.: REF_12345).';
    }
    if (!resolveContext()) errors.contexto = "Selecione um contexto antes de salvar.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    setFormAlert(null);
    if (!validate()) return;
    const context = resolveContext();
    if (!context) return;
    const payload: CriarFinanceiroCredencialRequest = {
      ...context,
      client_id: formData.client_id.trim(),
      client_secret: formData.client_secret.trim(),
      gpo_payment_method: formData.gpo_payment_method.trim(),
      ref_payment_method: formData.ref_payment_method.trim(),
    };

    try {
      if (editing) {
        await atualizarCredencial(editing.id, payload);
        setAlert({ variant: "success", message: "Credencial atualizada com sucesso." });
        closeForm();
      } else {
        const criada = await criarCredencial(payload);
        setAlert({ variant: "success", message: "Credencial configurada com sucesso." });
        closeForm();
        if (criada?.webhook_secret) setNovoWebhookSecret(criada.webhook_secret);
      }
      await carregarCredenciais();
    } catch (err) {
      // Erro do envio: fica DENTRO do formulário (que continua aberto),
      // e não no topo da página — é ali que o usuário está olhando.
      setFormAlert({ variant: "error", message: getErrorMessage(err) });
    }
  };

  /**
   * Remove a credencial vigente do contexto da linha clicada. Ação
   * destrutiva com consequência imediata (bloqueia novas cobranças nesse
   * contexto) — por isso passa por confirmação explícita, mesmo padrão já
   * usado em "Rotacionar" (WebhookSecretPanel.handleRotacionar) nesta
   * mesma tela. O evento de configuração original nunca é apagado no
   * backend: configurar de novo (via "Configurar credenciais") volta a
   * habilitar cobranças normalmente a qualquer momento depois.
   */
  const handleRemover = async (credencial: FinanceiroCredencial) => {
    const alvo = credencial.contexto_tipo === "spuri" ? "Spuri (Global)" : `da academia ${credencial.codigo_academia ?? ""}`;
    if (!window.confirm(`Remover as credenciais AppyPay ${alvo}? A partir de agora, nenhuma cobrança nova poderá ser criada nesse contexto até configurar novas credenciais. Cobranças já criadas não são afetadas.`)) return;
    setAlert(null);
    setRemovendoId(credencial.id);
    try {
      await removerCredencial({ contexto_tipo: credencial.contexto_tipo, codigo_academia: credencial.codigo_academia });
      setAlert({ variant: "success", message: "Credencial removida com sucesso." });
      await carregarCredenciais();
    } catch (err) {
      setAlert({ variant: "error", message: formatApiError(err, "Não foi possível remover a credencial.") });
    } finally {
      setRemovendoId(null);
    }
  };

  if (loading) return <LoadingState />;
  if (!isAcademia && !isFpp) return <UnauthorizedAccess requiredTypes={["Admin FPP", "Academia"]} />;

  const rows = credenciais ?? [];
  const canCreate = isAcademia || contextFilter === "spuri" || (contextFilter === "academia" && !!codigoAcademia);

  return (
    <div className="space-y-6">
      {alert && <Alert variant={alert.variant} title={alert.variant === "success" ? "Sucesso" : "Atenção"} message={alert.message} />}

      {novoWebhookSecret && (
        <NovoWebhookSecretAlert
          segredo={novoWebhookSecret}
          onFechar={() => setNovoWebhookSecret(null)}
        />
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Credenciais AppyPay</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Utilize as suas credenciais de uso da API da AppyPay para configurar o seu módulo de finanças</p>
          </div>
          <Button size="sm" onClick={openCreate} disabled={!canCreate} startIcon={<Icon icon="mdi:plus" width={16} />}>Configurar credenciais</Button>
        </div>

        {isFpp && (
          <div className="mt-5 grid gap-4 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03] lg:grid-cols-[260px_1fr]">
            <div>
              <Label>Contexto</Label>
              <Select
                key={contextFilter}
                defaultValue={contextFilter}
                options={[{ value: "todas", label: "Todas" }, { value: "spuri", label: "Spuri (Global)" }, { value: "academia", label: "Academia" }]}
                onChange={(value) => { setContextFilter(value as ContextFilter); setCodigoAcademia(""); }}
              />
            </div>
            {contextFilter === "academia" && (
              <div>
                <Label>Academia</Label>
                <SearchableSelect value={codigoAcademia} options={academiaOptions} onChange={setCodigoAcademia} placeholder={listandoAcademias ? "Carregando academias..." : "Selecione uma academia"} isDisabled={listandoAcademias} isClearable />
              </div>
            )}
          </div>
        )}
      </div>

      <AdesaoAppyPayInfo temCredenciais={rows.length > 0} />

      {!formOpen && <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        {listando ? <LoadingState /> : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <Icon icon="mdi:credit-card-remove-outline" width={44} className="text-gray-400" />
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Nenhuma credencial configurada.</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Salve as credenciais para habilitar as próximas operações financeiras.</p>
            </div>
            <Button size="sm" onClick={openCreate} disabled={!canCreate}>Configurar credenciais</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full text-left">
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]"><TableRow>{["Contexto", "Ambiente", "Client ID", "Método GPO", "Método REF", "Segredo do webhook", "Atualizado em", "Ações"].map((h) => <TableCell key={h} isHeader className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{h}</TableCell>)}</TableRow></TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {rows.map((credencial) => (
                  <TableRow key={credencial.id}>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"><span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">{credencial.contexto_tipo === "spuri" ? "Spuri" : `Academia ${credencial.codigo_academia ?? ""}`}</span></TableCell>
                    <TableCell className="px-4 py-3 text-sm"><span className={credencial.ambiente === "production" ? "rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300" : "rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"}>{credencial.ambiente}</span></TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{credencial.client_id_mask}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{credencial.gpo_payment_method_mask}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{credencial.ref_payment_method_mask}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"><WebhookSecretPanel credencialId={credencial.id} /></TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatDate(credencial.updated_at)}</TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(credencial)}>Editar</Button>
                        <Button size="sm" variant="danger" disabled={removendoId === credencial.id} onClick={() => handleRemover(credencial)} startIcon={<Icon icon="mdi:delete-outline" width={14} />}>
                          {removendoId === credencial.id ? "Removendo..." : "Remover"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>}

      {formOpen && (
        <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03] lg:p-8">
          <Button variant="outline" size="sm" onClick={closeForm} disabled={saving} startIcon={<Icon icon="mdi:arrow-left" width={16} />}>Voltar</Button>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{editing ? "Atualizar credencial" : "Configurar credenciais"}</h3>
            {formErrors.contexto && <p className="mt-1 text-xs text-error-500">{formErrors.contexto}</p>}
          </div>
          {/* Erro/sucesso do envio deste formulário — visível aqui dentro, não no topo da página. */}
          {formAlert && <Alert variant={formAlert.variant} title={formAlert.variant === "success" ? "Sucesso" : "Não foi possível salvar"} message={formAlert.message} />}
          {editing && <Alert variant="warning" title="Rotação completa" message="Por segurança, a AppyPay não devolve os valores atuais dos campos sensíveis. Preencha novamente todos os campos abaixo para atualizar esta credencial — os valores mascarados atuais continuam visíveis na tabela até a atualização ser concluída. O segredo do webhook NÃO muda ao editar; use 'Rotacionar' na tabela se precisar de um novo." />}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Client ID *"><Input value={formData.client_id} onChange={(e) => setFormData((p) => ({ ...p, client_id: e.target.value }))} error={!!formErrors.client_id} hint={formErrors.client_id} /></Field>
            <PasswordField label="Client Secret *" value={formData.client_secret} show={showClientSecret} onToggle={() => setShowClientSecret((v) => !v)} onChange={(value) => setFormData((p) => ({ ...p, client_secret: value }))} error={formErrors.client_secret} />
            <Field label="ID Método de pagamento GPO *"><Input value={formData.gpo_payment_method} onChange={(e) => setFormData((p) => ({ ...p, gpo_payment_method: e.target.value }))} error={!!formErrors.gpo_payment_method} hint={formErrors.gpo_payment_method ?? 'Identificador do método GPO configurado na AppyPay. Deve começar com "GPO_".'} /></Field>
            <Field label="ID Método de pagamento REF *"><Input value={formData.ref_payment_method} onChange={(e) => setFormData((p) => ({ ...p, ref_payment_method: e.target.value }))} error={!!formErrors.ref_payment_method} hint={formErrors.ref_payment_method ?? 'Identificador do método REF configurado na AppyPay. Deve começar com "REF_".'} /></Field>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-white/[0.03] dark:text-gray-300">
            <p className="font-medium text-gray-800 dark:text-white/90">Sobre o webhook</p>
            <p className="mt-1">
              Não é preciso configurar segredo nem cabeçalho de webhook aqui: o Spuri gera automaticamente um segredo
              único{editing ? "" : ", exibido uma única vez logo após salvar"} e sempre envia o cabeçalho fixo{" "}
              <code className="rounded bg-gray-200 px-1 py-0.5 text-xs dark:bg-gray-700">{WEBHOOK_HEADER_NAME}</code>.
              Configure este mesmo nome de cabeçalho no painel da AppyPay. Para ver ou trocar o segredo depois, use as ações
              na coluna &quot;Segredo do webhook&quot; da tabela.
            </p>
          </div>
          <div className="flex justify-end gap-3"><Button variant="outline" size="sm" onClick={closeForm} disabled={saving}>Cancelar</Button><Button size="sm" onClick={handleSubmit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></div>
        </div>
      )}
    </div>
  );
}

/** Alerta que exibe (uma única vez) o segredo de webhook devolvido pela criação da credencial. */
function NovoWebhookSecretAlert({ segredo, onFechar }: { segredo: string; onFechar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-500/30 dark:bg-brand-500/10">
      <div className="flex items-start gap-3">
        <Icon icon="mdi:key-alert-outline" width={22} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Segredo do webhook gerado</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Copie e configure isto no painel da AppyPay agora — por segurança, este valor não será mostrado por
            inteiro novamente (só via &quot;Consultar segredo&quot;, que exige confirmação).
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded bg-white px-3 py-1.5 text-sm dark:bg-gray-900 dark:text-white/90">{segredo}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { navigator.clipboard?.writeText(segredo).catch(() => {}); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}
            >
              {copiado ? "Copiado!" : "Copiar"}
            </Button>
            <span className="text-xs text-gray-500 dark:text-gray-400">Cabeçalho: {WEBHOOK_HEADER_NAME}</span>
          </div>
        </div>
        <button type="button" onClick={onFechar} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Fechar">
          <Icon icon="mdi:close" width={18} />
        </button>
      </div>
    </div>
  );
}

/**
 * Ações de consulta e rotação do segredo de webhook de uma credencial já
 * existente (GET/POST .../webhook-secret). O erro de cada ação aparece
 * aqui mesmo, dentro da célula da tabela — não no topo da página.
 */
function WebhookSecretPanel({ credencialId }: { credencialId: string }) {
  const consultar = useApi(financeiroService.consultarSegredoWebhook);
  const rotacionar = useApi(financeiroService.rotacionarSegredoWebhook);
  const [segredo, setSegredo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const handleConsultar = async () => {
    setErro(null);
    try {
      const r = await consultar.execute(credencialId);
      setSegredo(r?.webhook_secret ?? null);
    } catch (e) {
      setErro(formatApiError(e, "Não foi possível consultar o segredo."));
    }
  };

  const handleRotacionar = async () => {
    if (!window.confirm("Isto invalida o segredo atual imediatamente. A AppyPay precisará ser reconfigurada com o novo valor. Continuar?")) return;
    setErro(null);
    try {
      const r = await rotacionar.execute(credencialId);
      setSegredo(r?.webhook_secret ?? null);
    } catch (e) {
      setErro(formatApiError(e, "Não foi possível rotacionar o segredo."));
    }
  };

  if (segredo) {
    return (
      <div className="space-y-1">
        <code className="block max-w-[180px] truncate rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">{segredo}</code>
        <button type="button" className="text-xs text-brand-600 hover:underline dark:text-brand-300" onClick={() => setSegredo(null)}>Ocultar</button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={consultar.loading} onClick={handleConsultar}>Consultar segredo</Button>
        <Button size="sm" variant="outline" disabled={rotacionar.loading} onClick={handleRotacionar}>Rotacionar</Button>
      </div>
      {erro && <p className="text-xs text-error-500">{erro}</p>}
    </div>
  );
}

/**
 * "Antes de configurar as credenciais": quando a academia AINDA NÃO tem
 * nenhuma credencial gravada, a nota de adesão fica sempre em destaque e
 * visível por inteiro (não pode ficar escondida atrás de um clique nesse
 * momento — é a informação mais importante da tela). Depois que já existe
 * pelo menos uma credencial, a nota passa a vir recolhida por padrão, com
 * um botão para expandir/ocultar (em vez do `<details>`/`<summary>` nativo
 * do navegador, que tem uma UX pobre e visualmente inconsistente com o
 * resto do painel).
 */
function AdesaoAppyPayInfo({ temCredenciais }: { temCredenciais: boolean }) {
  const [aberta, setAberta] = useState(false);
  const destaque = !temCredenciais;
  const mostrarConteudo = destaque || aberta;

  return (
    <div
      className={
        destaque
          ? "rounded-2xl border border-brand-300 bg-brand-50 p-5 dark:border-brand-500/40 dark:bg-brand-500/10"
          : "rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]"
      }
    >
      <div className="flex items-start gap-3">
        <Icon icon="mdi:bank-outline" width={22} className={`mt-0.5 shrink-0 ${destaque ? "text-brand-600 dark:text-brand-300" : "text-brand-500"}`} />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Antes de configurar as credenciais</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Para ter acesso ao módulo de finanças e fazer cobranças e receber pagamentos dos estudantes, é necessário aderir aos serviços de Gateway de Pagamento Online junto ao seu banco.
          </p>
        </div>
        {!destaque && (
          <button
            type="button"
            onClick={() => setAberta((v) => !v)}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-300 dark:hover:bg-white/[0.05]"
          >
            {aberta ? "Ocultar nota" : "Ver nota de adesão"}
            <Icon icon={aberta ? "mdi:chevron-up" : "mdi:chevron-down"} width={16} />
          </button>
        )}
      </div>
      {mostrarConteudo && (
        <div className={`mt-4 rounded-xl p-4 ${destaque ? "bg-white/60 dark:bg-white/[0.06]" : "bg-gray-50 dark:bg-white/[0.03]"}`}>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Nota para Adesão ao Serviço</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-500 dark:text-gray-400">
            <li>É necessário ter uma conta bancária empresarial em um dos bancos angolanos.</li>
            <li>O processo de adesão começa no seu banco comercial: dirija-se ao seu banco e solicite os formulários de adesão aos métodos de pagamento que deseja utilizar (Multicaixa Express e/ou Referência).</li>
            <li>Informe ao banco que vai trabalhar com a AppyPay como seu facilitador tecnológico.</li>
            <li>A AppyPay tem parceria com o BAI (GPO), BCS e Standard Bank (GPO e REF) — se selecionar um destes bancos, não terá de pagar as comissões da AppyPay (0,4% por cobrança, com comissão mínima de 50 Kz por cobrança), nem assinar o contrato com a AppyPay.</li>
          </ol>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}

function PasswordField({ label, value, show, error, onToggle, onChange }: { label: string; value: string; show: boolean; error?: string; onToggle: () => void; onChange: (value: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <Input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} error={!!error} hint={error} className="pr-11" />
        <button type="button" onClick={onToggle} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label={show ? "Ocultar segredo" : "Mostrar segredo"}>
          <Icon icon={show ? "mdi:eye-off-outline" : "mdi:eye-outline"} width={20} />
        </button>
      </div>
    </div>
  );
}
