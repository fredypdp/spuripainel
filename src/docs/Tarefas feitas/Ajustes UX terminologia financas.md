---
criado: 2026-08-19
origem: Claude (orquestrador) — a pedido de Fredy Luís, Fundador e CEO da Spuri
status: concluída
tarefa: 56 — Ajustes de UX e terminologia em /financas/*
---

# Ajustes de UX e terminologia em `/financas/*`

## Prompt recomendado para o Codex

> Execute exatamente o que está descrito neste documento, arquivo por arquivo, na ordem em que aparecem. Não planeje nada — tudo já foi decidido e validado (`tsc --noEmit`, `eslint` e `next build`, todos sem erro). Todas as seções deste documento são no repositório `spuripainel`; não há nenhuma mudança de backend nesta tarefa. Onde o documento manda **substituir o arquivo inteiro**, apague o conteúdo atual e cole exatamente o bloco fornecido. Onde dá um bloco "SUBSTITUIR" com texto antes/depois, localize o texto exato (`old_str`) e troque só por aquele trecho — se não bater 100%, pare e reporte a diferença. Ao final, rode as validações da seção "Procedimento de conclusão" e cole o resultado bruto do terminal na resposta.

## Contexto

Esta tarefa parte do estado atual de `main` (commit `0d6b2aa`, depois das tarefas 49/49b/55) e cobre três pedidos de ajuste:

1. Em `/financas/credenciais`, a "Nota para Adesão ao Serviço" precisa de tratamento diferente conforme a academia já tem ou não credenciais salvas — hoje ela sempre aparece igual, recolhida atrás de um `<details>`/`<summary>` nativo do navegador (UX ruim, visual inconsistente com o resto do painel).
2. Em `/financas/configuracoes`: a tela "Histórico de versões" some, e cada subtela (Propina, Matrícula) passa a mostrar as próprias configurações já salvas; o menu de subtelas nunca deve ter mais de 2 colunas; "Regras financeiras importantes" vira "Regras de funcionamento" e some da tela principal, virando uma subtela própria; e um resquício de terminologia ("fundamental" cru dentro do texto das regras) é corrigido para o padrão já usado no resto do painel.
3. Em qualquer lugar de `/financas/*` (e `/pagamentos`, que compartilha os mesmos componentes) que hoje mostra o método de pagamento cru (`GPO`, `REF`, `GPO_QR`), passa a mostrar o texto amigável.

---

## Resumo executivo

| # | Arquivo | Ação |
|---|---|---|
| 1 | `src/components/paineis/financeiroShared.tsx` | Editar (blocos precisos) |
| 2 | `src/components/paineis/EstudantePagamentosPainel.tsx` | Editar (blocos precisos) |
| 3 | `src/components/paineis/FinanceiroCredenciaisPainel.tsx` | Substituir arquivo inteiro |
| 4 | `src/components/paineis/FinanceiroConfiguracoesPainel.tsx` | Substituir arquivo inteiro |

Nenhum arquivo deve ser removido. Nenhuma mudança de backend.

---

## Seção 1 — `src/components/paineis/financeiroShared.tsx` (editar)

**Objetivo:**
- Adiciona `METODO_PAGAMENTO_LABEL`, o mapa de texto amigável para cada método de pagamento — usado em toda parte do módulo financeiro daqui em diante:
  - `GPO` → "MCX Express via número de telefone"
  - `REF` → "Pagamento por referência"
  - `GPO_QR` → "QR Code"
- Corrige a coluna "Método" de `CobrancasTable` e o campo "Método de pagamento" de `SubtelaDetalheCobranca`, que hoje mostram o valor cru ("GPO"/"REF"/"GPO_QR").
- Limita `SubtelasMenu` a no máximo 2 colunas (removido `lg:grid-cols-3`) — pedido explícito: "apenas duas colunas nos botões de tela no máximo".

### 1.1 — Import de tipos

SUBSTITUIR:
```tsx
import type { AcademiaNivel, CobrancaResumo, EstudanteDetalhado, FinanceiroNivel, FinanceiroOrigemCobranca, NivelEscolar } from "@/types/api";
```

POR:
```tsx
import type { AcademiaNivel, CobrancaResumo, EstudanteDetalhado, FinanceiroMetodoPagamento, FinanceiroNivel, FinanceiroOrigemCobranca, NivelEscolar } from "@/types/api";
```

### 1.2 — Novo mapa `METODO_PAGAMENTO_LABEL`, logo após `origemLabel`

SUBSTITUIR:
```tsx
export const origemLabel: Record<FinanceiroOrigemCobranca, string> = {
  matricula: "Matrícula",
  mensalidade: "Mensalidade",
  avulsa: "Outros",
};
```

POR:
```tsx
export const origemLabel: Record<FinanceiroOrigemCobranca, string> = {
  matricula: "Matrícula",
  mensalidade: "Mensalidade",
  avulsa: "Outros",
};

/**
 * Texto de exibição de cada método de pagamento AppyPay — usado em toda
 * parte de /financas/* e /pagamentos onde um método aparece para o
 * usuário (nunca mostrar "GPO"/"REF"/"GPO_QR" cru).
 */
export const METODO_PAGAMENTO_LABEL: Record<FinanceiroMetodoPagamento, string> = {
  GPO: "MCX Express via número de telefone",
  REF: "Pagamento por referência",
  GPO_QR: "QR Code",
};
```

### 1.3 — `SubtelasMenu` — máximo 2 colunas

SUBSTITUIR:
```tsx
/** Grade de SubtelaCard — menu inicial de uma página dividida em subtelas. */
export function SubtelasMenu({ opcoes }: { opcoes: { id: string; icon: string; label: string; descricao: string; onClick: () => void }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {opcoes.map((o) => <SubtelaCard key={o.id} icon={o.icon} label={o.label} descricao={o.descricao} onClick={o.onClick} />)}
    </div>
  );
}
```

POR:
```tsx
/** Grade de SubtelaCard — menu inicial de uma página dividida em subtelas. Máximo 2 colunas (nunca 3+); 1 coluna em telas pequenas. */
export function SubtelasMenu({ opcoes }: { opcoes: { id: string; icon: string; label: string; descricao: string; onClick: () => void }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {opcoes.map((o) => <SubtelaCard key={o.id} icon={o.icon} label={o.label} descricao={o.descricao} onClick={o.onClick} />)}
    </div>
  );
}
```

### 1.4 — `CobrancasTable` — coluna "Método"

SUBSTITUIR:
```tsx
                <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{r.metodo_pagamento || "—"}</TableCell>
```

POR:
```tsx
                <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{r.metodo_pagamento ? METODO_PAGAMENTO_LABEL[r.metodo_pagamento] : "—"}</TableCell>
```

### 1.5 — `SubtelaDetalheCobranca` — campo "Método de pagamento"

SUBSTITUIR:
```tsx
        <p><b>Método de pagamento:</b> {cobranca.metodo_pagamento || "—"}</p>
```

POR:
```tsx
        <p><b>Método de pagamento:</b> {cobranca.metodo_pagamento ? METODO_PAGAMENTO_LABEL[cobranca.metodo_pagamento] : "—"}</p>
```

---

## Seção 2 — `src/components/paineis/EstudantePagamentosPainel.tsx` (editar)

**Objetivo:** o select de método de pagamento na subtela "Pagar mensalidades" mostrava o valor cru ("GPO"/"REF"/"GPO_QR") como rótulo de cada opção.

### 2.1 — Import

SUBSTITUIR:
```tsx
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
```

POR:
```tsx
import {
  CobrancasTable,
  EmptyState,
  LoadingState,
  METODO_PAGAMENTO_LABEL,
  PaginacaoSetas,
  Qr,
  StatusBadge,
  SubtelaDetalheCobranca,
  SubtelaPanel,
  formatAnoLetivo,
  money,
} from "@/components/paineis/financeiroShared";
```

### 2.2 — Select de método

SUBSTITUIR:
```tsx
              options={(mensalidades.data?.metodos_pagamento_por_academia[academia] ?? ["GPO"]).map((m) => ({ value: m, label: m }))}
```

POR:
```tsx
              options={(mensalidades.data?.metodos_pagamento_por_academia[academia] ?? ["GPO"]).map((m) => ({ value: m, label: METODO_PAGAMENTO_LABEL[m as FinanceiroMetodoPagamento] }))}
```

**Validação já feita por Claude (Seções 1 e 2):** `npx tsc --noEmit` sem erro; `npx eslint` nos dois arquivos sem erro/aviso.

---

## Seção 3 — `src/components/paineis/FinanceiroCredenciaisPainel.tsx` (substituir arquivo inteiro)

**Objetivo (item 1 do pedido):**
- Título da nota renomeado de "Nota para Adesão ao Serviço (enviada pela AppyPay)" para "Nota para Adesão ao Serviço".
- `AdesaoAppyPayInfo` agora recebe `temCredenciais` (calculado a partir de `rows.length > 0`, onde `rows` já é a lista de credenciais carregada):
  - **Sem nenhuma credencial salva:** a nota fica sempre em destaque — cartão com borda/fundo diferenciados (mesmo tom "brand" usado em alertas de destaque no resto do painel) e o conteúdo sempre visível por inteiro, sem nenhum botão para escondê-la.
  - **Com pelo menos uma credencial salva:** a nota volta a ficar discreta (cartão neutro) e recolhida por padrão, com um botão "Ver nota de adesão"/"Ocultar nota" (ícone de seta que gira) — substitui o `<details>`/`<summary>` nativo do navegador, que tinha uma UX/UI inconsistente com o resto do painel.

SUBSTITUIR O ARQUIVO INTEIRO por:

```tsx
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
  const { execute: listarAcademias, loading: listandoAcademias } = useApi(consultasService.listarAcademias);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
                    <TableCell className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => openEdit(credencial)}>Editar</Button></TableCell>
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
```

---

## Seção 4 — `src/components/paineis/FinanceiroConfiguracoesPainel.tsx` (substituir arquivo inteiro)

**Objetivo, mapeado ponto a ponto ao pedido:**

- **"Histórico de versões" deixou de existir como subtela separada.** Cada subtela de configuração agora mostra, abaixo do próprio formulário, uma seção "Configurações já feitas" com a tabela das configurações salvas **daquele tipo apenas** (Propina mostra só configurações de propina — com a coluna "Fim" do mês de encerramento; Matrícula mostra só configurações de matrícula, sem essa coluna, já que matrícula não tem mês de encerramento). `Tela` perdeu o valor `"historico"`.
- **Menu com no máximo 2 colunas.** `SubtelasMenu` já foi ajustada na Seção 1 para nunca passar de 2 colunas; com a remoção de "Histórico de versões" do menu, sobraram exatamente 4 opções — Propina/mensalidade, Taxa de matrícula, Início de cobrança fora do padrão, Anular ou reativar obrigações — ou seja, **2 linhas de 2 botões**, exatamente como pedido ("dois botões em cima e dois em baixo"); em telas pequenas, 1 coluna (1 botão por linha), comportamento padrão do grid.
- **"Regras financeiras importantes" → "Regras de funcionamento", agora uma subtela própria.** Não fica mais sempre visível na tela principal (o antigo `InfoBox`) — vira a função `RegrasDeFuncionamento`, renderizada dentro de uma `SubtelaPanel` própria (`tela === "regras"`), aberta por um botão "Regras de funcionamento" no topo do menu (fora da grade de 4 cartões — não conta para o limite de 2 colunas, é um botão de acesso à informação, não uma configuração).
- **Terminologia corrigida dentro do texto das regras.** O texto antigo tinha "(fundamental)" e "(médio/superior)" crus entre parênteses; agora usa `NIVEL_LABEL.fundamental`/`NIVEL_LABEL.medio`/`NIVEL_LABEL.superior` ("Ensino Primário e Iº Ciclo", "Médio", "Superior") — mesmo padrão já usado no resto do painel.
- **Métodos de pagamento com texto amigável em 3 lugares** que antes mostravam o valor cru: os checkboxes de "Métodos de pagamento aceites" (`renderMetodos`, usa `METODO_PAGAMENTO_LABEL[m]` como `label` do `Checkbox`), a coluna "Métodos" da tabela de configurações já feitas (`.map(m => METODO_PAGAMENTO_LABEL[m]).join(", ")`), e o texto das regras de funcionamento.

SUBSTITUIR O ARQUIVO INTEIRO por:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { academiaService, financeiroService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserType } from "@/hooks/useRoutePermission";
import UnauthorizedAccess from "@/components/guards/UnauthorizedAccess";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import SearchableSelect from "@/components/form/SearchableSelect";
import Checkbox from "@/components/form/input/Checkbox";
import AnularReativarObrigacoesForm from "@/components/paineis/AnularReativarObrigacoesForm";
import { LoadingState, METODO_PAGAMENTO_LABEL, NIVEL_LABEL, SubtelaPanel, SubtelasMenu, formatAnoLetivo, money, niveisDaAcademia } from "@/components/paineis/financeiroShared";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { Curso, FinanceiroMetodoPagamento, FinanceiroNivel, MatriculaConfiguracaoInput, MatriculaConfiguracaoView, MensalidadeConfiguracaoInput, MensalidadeConfiguracaoView } from "@/types/api";

const METODOS: FinanceiroMetodoPagamento[] = ["GPO", "REF", "GPO_QR"];
const MES_FIM_OPCOES = [
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
];
/** Nomes reais dos meses (pt-AO) — corrige o bug de exibir "Mês 1", "Mês 2"... */
const MES_NOME_OPCOES = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Intl.DateTimeFormat("pt-AO", { month: "long" }).format(new Date(2026, i, 1)),
}));

function date(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat("pt-AO", { dateStyle: "short", timeStyle: "short" }).format(d); }

/** "6_ano_fundamental" → "6ª Classe"; "2_ano_medio" → "2.º Ano (Médio)". Mesmo padrão usado nas telas de matrícula/turmas. */
function labelAnoAcademico(codigo: string): string {
  const m = /^(\d+)_ano_(fundamental|medio|superior)$/.exec(codigo);
  if (!m) return codigo;
  const [, numero, nivel] = m;
  if (nivel === "fundamental") return `${numero}ª Classe`;
  if (nivel === "medio") return `${numero}.º Ano (Médio)`;
  return `${numero}.º Ano (Superior)`;
}

function RegrasDeFuncionamento() {
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-300">
      <li>Cada configuração enviada cria uma <b>nova versão vigente a partir de agora</b> — não edita nem apaga versões passadas. Meses e matrículas já vencidos continuam usando o valor que estava vigente na época em que venceram.</li>
      <li>A configuração é específica por <b>nível de ensino</b> ({NIVEL_LABEL.fundamental}, {NIVEL_LABEL.medio} ou {NIVEL_LABEL.superior}) e, dentro dele, por <b>ano/classe</b> ({NIVEL_LABEL.fundamental}) ou por <b>curso e ano</b> ({NIVEL_LABEL.medio}/{NIVEL_LABEL.superior}) — por isso pode (e normalmente deve) haver várias configurações vigentes ao mesmo tempo, uma por combinação.</li>
      <li>Na Matrícula: se <b>nenhuma</b> configuração existir para a combinação nível/ano/curso de uma solicitação, a matrícula daquele candidato é <b>gratuita</b> e a academia aprova direto, sem cobrança.</li>
      <li>Pagamentos só podem ser feitos pelos métodos habilitados aqui: <b>{METODO_PAGAMENTO_LABEL.GPO}</b>, <b>{METODO_PAGAMENTO_LABEL.REF}</b> e <b>{METODO_PAGAMENTO_LABEL.GPO_QR}</b> (exibido para o pagador escanear no momento em que ele escolhe pagar).</li>
      <li>É <b>obrigatório configurar as credenciais AppyPay antes</b> — sem isso, nenhuma cobrança pode ser criada mesmo com o valor já configurado aqui. <Link href="/financas/credenciais" className="font-medium underline">Configurar credenciais</Link>.</li>
    </ul>
  );
}

type NivelFormState = {
  nivel: FinanceiroNivel;
  ano_academico: string;
  curso_id: string;
  valor: string;
  metodos_pagamento: FinanceiroMetodoPagamento[];
};

type FormFieldErrors = Partial<Record<"ano_academico" | "curso_id" | "valor", string>>;

type Tela = "menu" | "mensalidade" | "matricula" | "inicio-cobranca" | "anular-reativar" | "regras";

/**
 * Painel de configurações financeiras, dividido em subtelas: cada
 * configuração — propina, matrícula, início de cobrança fora do padrão,
 * anular/reativar obrigações — é a sua própria subtela, aberta a partir de
 * um menu com no máximo 2 colunas (2 cartões por linha; 1 por linha em
 * telas pequenas). As configurações já salvas de cada tipo aparecem
 * dentro da própria subtela daquele tipo (não existe mais uma tela de
 * "Histórico de versões" separada).
 *
 * Visão de admin (FPP): configuração de propina/matrícula é uma
 * responsabilidade exclusiva de cada academia — não existe hoje nenhuma
 * configuração financeira que pertença ao administrador. Por isso o admin
 * não vê o menu de subtelas: só o aviso "indisponível no momento".
 */
export default function FinanceiroConfiguracoesPainel() {
  const { user, isAdmin, isAcademia, loading } = useUserType();
  const isFpp = isAdmin && user?.admin?.role === "fpp";
  const codigoAcademia = user?.academia?.codigo_academia ?? "";
  const anosAcademicosAcademia = useMemo(() => user?.academia?.anos_academicos ?? [], [user?.academia?.anos_academicos]);
  /** Níveis que a academia realmente oferece — nunca uma lista fixa fundamental/médio/superior. */
  const niveisDisponiveis = useMemo(() => niveisDaAcademia(user?.academia), [user?.academia]);

  const [tela, setTela] = useState<Tela>("menu");
  const [alert, setAlert] = useState<{ variant: "success" | "error" | "warning" | "info"; message: string } | null>(null);
  const [mensalidadeForm, setMensalidadeForm] = useState<NivelFormState>({ nivel: niveisDisponiveis[0] ?? "fundamental", ano_academico: "", curso_id: "", valor: "", metodos_pagamento: ["GPO"] });
  const [mensalidadeMesFim, setMensalidadeMesFim] = useState("6");
  const [mensalidadeErrors, setMensalidadeErrors] = useState<FormFieldErrors>({});
  const [matriculaForm, setMatriculaForm] = useState<NivelFormState>({ nivel: niveisDisponiveis[0] ?? "fundamental", ano_academico: "", curso_id: "", valor: "", metodos_pagamento: ["GPO"] });
  const [matriculaErrors, setMatriculaErrors] = useState<FormFieldErrors>({});
  const [cursos, setCursos] = useState<Curso[]>([]);

  const mensalidadesApi = useApi(financeiroService.listarConfiguracoesMensalidade);
  const matriculasApi = useApi(financeiroService.listarConfiguracoesMatricula);
  const salvarMensalidade = useApi(financeiroService.configurarMensalidade);
  const salvarMatricula = useApi(financeiroService.configurarMatricula);
  const atualizarMensalidade = useApi(financeiroService.atualizarConfiguracaoMensalidade);
  const atualizarMatricula = useApi(financeiroService.atualizarConfiguracaoMatricula);

  useEffect(() => {
    if (niveisDisponiveis.length === 0) return;
    setMensalidadeForm((prev) => (niveisDisponiveis.includes(prev.nivel) ? prev : { ...prev, nivel: niveisDisponiveis[0], curso_id: "", ano_academico: "" }));
    setMatriculaForm((prev) => (niveisDisponiveis.includes(prev.nivel) ? prev : { ...prev, nivel: niveisDisponiveis[0], curso_id: "", ano_academico: "" }));
  }, [niveisDisponiveis]);

  const reload = async () => {
    if (!codigoAcademia) return;
    await Promise.all([
      mensalidadesApi.execute({ codigo_academia: codigoAcademia }),
      matriculasApi.execute({ codigo_academia: codigoAcademia }),
    ]);
  };

  useEffect(() => {
    if (!loading && isAcademia && codigoAcademia) void reload().catch((err) => setAlert({ variant: "error", message: formatApiError(err, "Não foi possível carregar configurações.") }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAcademia, codigoAcademia]);

  useEffect(() => {
    if (!isAcademia || !codigoAcademia) { setCursos([]); return; }
    academiaService.listarCursos({ codigo_academia: codigoAcademia })
      .then((r) => setCursos((r.cursos ?? []).filter((c) => c.status === "ativo")))
      .catch(() => setCursos([]));
  }, [isAcademia, codigoAcademia]);

  if (loading) return <LoadingState label="Carregando configurações..." />;
  if (!isAcademia && !isFpp) return <UnauthorizedAccess requiredTypes={["Admin FPP", "Academia"]} message="O módulo financeiro é exclusivo de administradores FPP e academias." />;

  if (isFpp) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex items-start gap-3">
          <Icon icon="mdi:cog-outline" width={24} className="text-gray-800 dark:text-white/90" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Configurações financeiras</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Propina, matrícula e as demais configurações desta página pertencem a cada academia, não ao administrador —
              indisponível no momento. Ainda não existe nenhuma configuração financeira própria do Spuri.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const toggleMetodo = (kind: "mensalidade" | "matricula", metodo: FinanceiroMetodoPagamento) => {
    const setter = kind === "mensalidade" ? setMensalidadeForm : setMatriculaForm;
    setter((prev) => ({ ...prev, metodos_pagamento: prev.metodos_pagamento.includes(metodo) ? prev.metodos_pagamento.filter((m) => m !== metodo) : [...prev.metodos_pagamento, metodo] }));
  };

  const cursosDoNivel = (nivel: FinanceiroNivel) => cursos.filter((c) => c.type === nivel);
  const anosDoFormulario = (form: NivelFormState): string[] => {
    if (form.nivel === "fundamental") return anosAcademicosAcademia.filter((a) => a.endsWith("_ano_fundamental"));
    const curso = cursos.find((c) => c.id === form.curso_id);
    return curso?.anos_academicos ?? [];
  };

  const validarValorEAno = (form: NivelFormState): FormFieldErrors => {
    const errors: FormFieldErrors = {};
    const valorNumero = Number(form.valor);
    if (!form.valor.trim() || !(valorNumero > 0)) errors.valor = "Informe um valor maior que zero.";
    if (form.nivel === "fundamental") {
      if (!form.ano_academico) errors.ano_academico = "Selecione o ano/classe.";
    } else {
      if (!form.curso_id) errors.curso_id = "Selecione o curso.";
      if (!form.ano_academico) errors.ano_academico = "Selecione o ano do curso.";
    }
    return errors;
  };

  const matches = (c: { nivel: string; curso_id?: string; ano_academico?: string }, form: NivelFormState) =>
    c.nivel === form.nivel && (form.nivel === "fundamental" ? c.ano_academico === form.ano_academico : c.curso_id === form.curso_id && c.ano_academico === form.ano_academico);

  const submitMensalidade = async () => {
    const errors = validarValorEAno(mensalidadeForm);
    setMensalidadeErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      if (!codigoAcademia) throw new Error("Academia não identificada.");
      const p: MensalidadeConfiguracaoInput = {
        codigo_academia: codigoAcademia,
        nivel: mensalidadeForm.nivel,
        ano_academico: mensalidadeForm.ano_academico,
        curso_id: mensalidadeForm.nivel === "fundamental" ? undefined : mensalidadeForm.curso_id,
        valor: Number(mensalidadeForm.valor),
        mes_fim_cobranca: Number(mensalidadeMesFim) as 6 | 7,
        metodos_pagamento: mensalidadeForm.metodos_pagamento,
      };
      const exists = (mensalidadesApi.data?.configuracoes ?? []).some((c) => matches(c, mensalidadeForm));
      await (exists ? atualizarMensalidade.execute(p) : salvarMensalidade.execute(p));
      setAlert({ variant: "success", message: "Configuração de mensalidade versionada com sucesso." });
      await reload();
    } catch (err) {
      setAlert({ variant: "error", message: formatApiError(err, "Não foi possível salvar mensalidade.") });
    }
  };

  const submitMatricula = async () => {
    const errors = validarValorEAno(matriculaForm);
    setMatriculaErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      if (!codigoAcademia) throw new Error("Academia não identificada.");
      const p: MatriculaConfiguracaoInput = {
        codigo_academia: codigoAcademia,
        nivel: matriculaForm.nivel,
        ano_academico: matriculaForm.ano_academico,
        curso_id: matriculaForm.nivel === "fundamental" ? undefined : matriculaForm.curso_id,
        valor: Number(matriculaForm.valor),
        metodos_pagamento: matriculaForm.metodos_pagamento,
      };
      const exists = (matriculasApi.data?.configuracoes ?? []).some((c) => matches(c, matriculaForm));
      await (exists ? atualizarMatricula.execute(p) : salvarMatricula.execute(p));
      setAlert({ variant: "success", message: "Configuração de matrícula versionada com sucesso." });
      await reload();
    } catch (err) {
      setAlert({ variant: "error", message: formatApiError(err, "Não foi possível salvar matrícula.") });
    }
  };

  const updateNivel = (kind: "mensalidade" | "matricula", nivel: FinanceiroNivel) => {
    const setter = kind === "mensalidade" ? setMensalidadeForm : setMatriculaForm;
    const setErrors = kind === "mensalidade" ? setMensalidadeErrors : setMatriculaErrors;
    setter((prev) => ({ ...prev, nivel, curso_id: "", ano_academico: "" }));
    setErrors({});
  };

  const renderMetodos = (kind: "mensalidade" | "matricula", selected: FinanceiroMetodoPagamento[]) => (
    <div className="flex flex-wrap gap-4">
      {METODOS.map((m) => (
        <Checkbox key={m} id={`${kind}-metodo-${m}`} label={METODO_PAGAMENTO_LABEL[m]} checked={selected.includes(m)} onChange={() => toggleMetodo(kind, m)} />
      ))}
    </div>
  );

  /** Nível só aparece como escolha quando a academia oferece mais de um (ex.: nivel_escolar="misto"). Com um único nível, ele é aplicado direto, sem select. */
  const renderNivelFields = (kind: "mensalidade" | "matricula", form: NivelFormState, errors: FormFieldErrors, setForm: (updater: (prev: NivelFormState) => NivelFormState) => void) => (
    <>
      {niveisDisponiveis.length > 1 ? (
        <>
          <Label>Nível</Label>
          <SearchableSelect
            value={form.nivel}
            options={niveisDisponiveis.map((n) => ({ value: n, label: NIVEL_LABEL[n] }))}
            onChange={(v) => updateNivel(kind, (v || niveisDisponiveis[0]) as FinanceiroNivel)}
            isSearchable={false}
            isClearable={false}
            inputId={`${kind}-nivel`}
            name={`${kind}-nivel`}
          />
        </>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nível: <span className="font-medium text-gray-800 dark:text-white/90">{NIVEL_LABEL[form.nivel]}</span></p>
      )}
      {form.nivel !== "fundamental" && (
        <>
          <Label>Curso</Label>
          <SearchableSelect
            value={form.curso_id}
            options={cursosDoNivel(form.nivel).map((c) => ({ value: c.id, label: c.nome }))}
            onChange={(v) => setForm((prev) => ({ ...prev, curso_id: v, ano_academico: "" }))}
            placeholder={cursosDoNivel(form.nivel).length ? "Selecione um curso" : "Nenhum curso cadastrado para este nível"}
            isClearable
            inputId={`${kind}-curso`}
            name={`${kind}-curso`}
            error={errors.curso_id}
          />
        </>
      )}
      <Label>{form.nivel === "fundamental" ? "Ano / classe" : "Ano do curso"}</Label>
      <SearchableSelect
        value={form.ano_academico}
        options={anosDoFormulario(form).map((a) => ({ value: a, label: labelAnoAcademico(a) }))}
        onChange={(v) => setForm((prev) => ({ ...prev, ano_academico: v }))}
        placeholder={anosDoFormulario(form).length ? "Selecione o ano" : "Selecione um curso primeiro"}
        isDisabled={form.nivel !== "fundamental" && !form.curso_id}
        isClearable
        inputId={`${kind}-ano-academico`}
        name={`${kind}-ano-academico`}
        error={errors.ano_academico}
      />
      <Label>Valor (Kz)</Label>
      <Input
        type="number"
        min="0.01"
        step={0.01}
        value={form.valor}
        onChange={(e) => setForm((prev) => ({ ...prev, valor: e.target.value }))}
        error={!!errors.valor}
        hint={errors.valor}
      />
    </>
  );

  /** Configurações já salvas de um tipo, exibidas dentro da própria subtela — substitui a antiga tela separada "Histórico de versões". */
  const renderConfiguracoesSalvas = (linhas: (MensalidadeConfiguracaoView | MatriculaConfiguracaoView)[], comMesFim: boolean) => {
    if (linhas.length === 0) {
      return <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma configuração salva ainda.</p>;
    }
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {["Nível", "Ano/Curso", "Valor", ...(comMesFim ? ["Fim"] : []), "Métodos", "Vigente em"].map((h) => (
                <TableCell key={h} isHeader className="px-3 py-2 text-xs uppercase text-gray-500 dark:text-gray-400">{h}</TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((c, i) => (
              <TableRow key={i}>
                <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{NIVEL_LABEL[c.nivel]}</TableCell>
                <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{c.ano_academico ? labelAnoAcademico(c.ano_academico) : (cursos.find((cu) => cu.id === c.curso_id)?.nome ?? c.curso_id ?? "—")}</TableCell>
                <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{money(c.valor)}</TableCell>
                {comMesFim && (
                  <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {"mes_fim_cobranca" in c ? (c.mes_fim_cobranca === 6 ? "Junho" : c.mes_fim_cobranca === 7 ? "Julho" : c.mes_fim_cobranca) : "—"}
                  </TableCell>
                )}
                <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{c.metodos_pagamento.map((m) => METODO_PAGAMENTO_LABEL[m]).join(", ")}</TableCell>
                <TableCell className="px-3 py-2 text-gray-700 dark:text-gray-300">{date(c.vigente_em)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (tela === "menu") {
    return (
      <div className="space-y-6">
        {alert && <Alert variant={alert.variant} title="Finanças" message={alert.message} />}
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setTela("regras")} startIcon={<Icon icon="mdi:information-outline" width={16} />}>
            Regras de funcionamento
          </Button>
        </div>
        <SubtelasMenu
          opcoes={[
            { id: "mensalidade", icon: "mdi:calendar-month-outline", label: "Propina / mensalidade", descricao: "Definir o valor e os métodos aceites por ano/curso.", onClick: () => setTela("mensalidade") },
            { id: "matricula", icon: "mdi:school-outline", label: "Taxa de matrícula", descricao: "Definir o valor e os métodos aceites por ano/curso.", onClick: () => setTela("matricula") },
            { id: "inicio-cobranca", icon: "mdi:calendar-start", label: "Início de cobrança fora do padrão", descricao: "Ajustar a partir de qual mês a propina passa a valer num ano letivo específico.", onClick: () => setTela("inicio-cobranca") },
            { id: "anular-reativar", icon: "mdi:receipt-text-remove-outline", label: "Anular ou reativar obrigações", descricao: "Anular ou reativar mensalidades pontuais de um estudante específico.", onClick: () => setTela("anular-reativar") },
          ]}
        />
      </div>
    );
  }

  if (tela === "regras") {
    return (
      <SubtelaPanel title="Regras de funcionamento" icon="mdi:information-outline" onVoltar={() => setTela("menu")}>
        <RegrasDeFuncionamento />
      </SubtelaPanel>
    );
  }

  if (tela === "mensalidade") {
    return (
      <SubtelaPanel title="Propina / mensalidade" icon="mdi:calendar-month-outline" onVoltar={() => setTela("menu")}>
        {alert && <Alert variant={alert.variant} title="Finanças" message={alert.message} />}
        <div className="grid gap-4">
          {renderNivelFields("mensalidade", mensalidadeForm, mensalidadeErrors, setMensalidadeForm)}
          <Label>Mês de encerramento da cobrança</Label>
          <SearchableSelect
            value={mensalidadeMesFim}
            options={MES_FIM_OPCOES}
            onChange={(v) => setMensalidadeMesFim(v || "6")}
            isSearchable={false}
            isClearable={false}
            inputId="mensalidade-mes-fim"
            name="mensalidade-mes-fim"
          />
          <Label>Métodos de pagamento aceites</Label>
          {renderMetodos("mensalidade", mensalidadeForm.metodos_pagamento)}
          <Button onClick={submitMensalidade} disabled={salvarMensalidade.loading || atualizarMensalidade.loading} startIcon={<Icon icon="mdi:content-save-outline" width={16} />}>
            Salvar nova versão
          </Button>
        </div>
        <div className="mt-6 border-t border-gray-100 pt-5 dark:border-white/[0.05]">
          <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Configurações já feitas</h3>
          {renderConfiguracoesSalvas(mensalidadesApi.data?.configuracoes ?? [], true)}
        </div>
      </SubtelaPanel>
    );
  }

  if (tela === "matricula") {
    return (
      <SubtelaPanel title="Taxa de matrícula" icon="mdi:school-outline" onVoltar={() => setTela("menu")}>
        {alert && <Alert variant={alert.variant} title="Finanças" message={alert.message} />}
        <div className="grid gap-4">
          {renderNivelFields("matricula", matriculaForm, matriculaErrors, setMatriculaForm)}
          <Label>Métodos de pagamento aceites</Label>
          {renderMetodos("matricula", matriculaForm.metodos_pagamento)}
          <Button onClick={submitMatricula} disabled={salvarMatricula.loading || atualizarMatricula.loading} startIcon={<Icon icon="mdi:content-save-outline" width={16} />}>
            Salvar nova versão
          </Button>
        </div>
        <div className="mt-6 border-t border-gray-100 pt-5 dark:border-white/[0.05]">
          <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Configurações já feitas</h3>
          {renderConfiguracoesSalvas(matriculasApi.data?.configuracoes ?? [], false)}
        </div>
      </SubtelaPanel>
    );
  }

  if (tela === "inicio-cobranca") {
    return (
      <SubtelaPanel title="Início de cobrança fora do padrão" icon="mdi:calendar-start" onVoltar={() => setTela("menu")}>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Use apenas se o ano letivo começou fora do padrão (ex.: turma que iniciou em março em vez de fevereiro) — isso ajusta a partir de qual mês a cobrança de propina passa a valer para esse ano letivo.
        </p>
        <div className="mt-4">
          <DefinirInicioCobrancaForm codigoAcademia={codigoAcademia} />
        </div>
      </SubtelaPanel>
    );
  }

  // tela === "anular-reativar"
  return (
    <SubtelaPanel title="Anular ou reativar obrigações" icon="mdi:receipt-text-remove-outline" onVoltar={() => setTela("menu")}>
      <p className="text-sm text-gray-500 dark:text-gray-400">Anule ou reative mensalidades pontuais de um estudante específico (ex.: bolsa concedida, erro de lançamento).</p>
      <div className="mt-4">
        <AnularReativarObrigacoesForm codigoAcademia={codigoAcademia} onSuccess={reload} />
      </div>
    </SubtelaPanel>
  );
}

/**
 * Formulário de "definir início de cobrança fora do padrão". Extraído do
 * corpo do painel para poder buscar o ano letivo real da academia (em vez
 * de texto livre) sem misturar essa busca com o resto do estado da página.
 */
function DefinirInicioCobrancaForm({ codigoAcademia }: { codigoAcademia: string }) {
  const [anosLetivos, setAnosLetivos] = useState<string[]>([]);
  const [anoLetivo, setAnoLetivo] = useState("");
  const [mesInicio, setMesInicio] = useState("2");
  const [alert, setAlert] = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const definirInicio = useApi(financeiroService.definirInicioCobranca);

  useEffect(() => {
    if (!codigoAcademia) return;
    Promise.all([
      academiaService.getAnoLetivo({ codigo_academia: codigoAcademia }),
      academiaService.listarAnosLetivosLista({ codigo_academia: codigoAcademia }),
    ]).then(([atual, lista]) => {
      const anos = Array.from(new Set([atual?.ano_letivo, ...((lista?.anos_letivos_lista ?? []).map((a) => a.ano_letivo))].filter((a): a is string => !!a)));
      setAnosLetivos(anos);
      setAnoLetivo((prev) => prev || atual?.ano_letivo || anos[0] || "");
    }).catch(() => setAnosLetivos([]));
  }, [codigoAcademia]);

  const submit = async () => {
    setAlert(null);
    if (!anoLetivo) { setAlert({ variant: "error", message: "Selecione o ano letivo." }); return; }
    try {
      await definirInicio.execute({ codigo_academia: codigoAcademia, ano_letivo: anoLetivo, mes_inicio: Number(mesInicio) });
      setAlert({ variant: "success", message: "Início de cobrança definido com sucesso." });
    } catch (err) {
      setAlert({ variant: "error", message: formatApiError(err, "Não foi possível definir o início de cobrança.") });
    }
  };

  return (
    <div className="space-y-3">
      {alert && <Alert variant={alert.variant} title="Início de cobrança" message={alert.message} />}
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <Label>Ano letivo</Label>
          <SearchableSelect
            value={anoLetivo}
            options={anosLetivos.map((a) => ({ value: a, label: formatAnoLetivo(a) }))}
            onChange={(v) => setAnoLetivo(v)}
            placeholder={anosLetivos.length ? "Selecione o ano letivo" : "Nenhum ano letivo definido para esta academia"}
            isSearchable={false}
            inputId="inicio-cobranca-ano-letivo"
            name="inicio-cobranca-ano-letivo"
          />
        </div>
        <div>
          <Label>Mês início</Label>
          <SearchableSelect
            value={mesInicio}
            options={MES_NOME_OPCOES}
            onChange={(v) => setMesInicio(v || "2")}
            isSearchable={false}
            isClearable={false}
            inputId="inicio-cobranca-mes"
            name="inicio-cobranca-mes"
          />
        </div>
        <div className="self-end">
          <Button onClick={submit} disabled={!anoLetivo || definirInicio.loading} startIcon={<Icon icon="mdi:calendar-start" width={16} />}>
            Definir início de cobrança
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## Fora de escopo (não fazer)

- Não alterar nenhum outro arquivo além dos 4 listados no resumo executivo — em especial não tocar em `AnularReativarObrigacoesForm.tsx` (não faz parte desta tarefa) nem em `FinanceiroPagamentosPainel.tsx` (a coluna "Método" dele já vem corrigida automaticamente pela Seção 1, via `CobrancasTable`).
- Não mudar a lógica de negócio de nenhuma configuração (validação de valor, inferência de nível/curso/ano, formato de ano letivo) — só o que está descrito acima.
- Não tocar em `package-lock.json`/`yarn.lock` — qualquer diferença nesses arquivos no ambiente de Claude veio de rodar `npm install` para validar, e não deve ser commitada.
- Não remover nenhum arquivo.

## Critérios de aceitação

1. `npx tsc --noEmit` termina sem nenhum erro.
2. `npx eslint src/components/paineis/financeiroShared.tsx src/components/paineis/EstudantePagamentosPainel.tsx src/components/paineis/FinanceiroCredenciaisPainel.tsx src/components/paineis/FinanceiroConfiguracoesPainel.tsx` termina sem erro/aviso.
3. Uma academia **sem nenhuma credencial** salva vê a "Nota para Adesão ao Serviço" sempre expandida e em destaque em `/financas/credenciais`, sem nenhum botão para escondê-la.
4. Uma academia **com pelo menos uma credencial** salva vê a nota recolhida por padrão, com um botão para expandir/ocultar (não mais `<details>`/`<summary>` nativo).
5. `/financas/configuracoes` não tem mais nenhuma tela chamada "Histórico de versões"; as subtelas "Propina / mensalidade" e "Taxa de matrícula" mostram as configurações já salvas daquele tipo, abaixo do formulário.
6. O menu de `/financas/configuracoes` mostra exatamente 4 cartões, em no máximo 2 colunas (2 linhas de 2 em telas largas, 1 coluna em telas pequenas).
7. Existe um botão "Regras de funcionamento" que abre uma subtela com o conteúdo que antes ficava sempre visível na tela principal.
8. Em nenhum lugar de `/financas/*` ou `/pagamentos` aparece mais o texto cru "GPO", "REF" ou "GPO_QR" para o usuário final — sempre "MCX Express via número de telefone", "Pagamento por referência" ou "QR Code".

## Procedimento de conclusão

```bash
npx tsc --noEmit
npx eslint src/components/paineis/financeiroShared.tsx src/components/paineis/EstudantePagamentosPainel.tsx src/components/paineis/FinanceiroCredenciaisPainel.tsx src/components/paineis/FinanceiroConfiguracoesPainel.tsx
npm run build
```

`npm run build` pode falhar no seu ambiente por causa de acesso de rede a `fonts.googleapis.com` — isso é uma limitação de rede pré-existente, sem relação com esta tarefa (Claude já confirmou isso comparando com uma cópia intocada do repositório). Se falhar exatamente nesse ponto (fonte `Outfit`), reporte como esperado e não como erro desta tarefa; se falhar em qualquer outro ponto, reporte o erro completo.

Depois de mover esta tarefa para `docs/Tarefas feitas/`, atualize o frontmatter `status` para `concluída`.
