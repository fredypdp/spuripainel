---
criado: 2026-08-12 00:00
origem: substitui inteiramente a tarefa "Atualizar cadastro de credenciais AppyPay no frontend" (ainda não executada) — consolida a remoção de `resource`, a renomeação de rótulos, a nota de adesão AppyPay e a simplificação do método de autenticação de webhook para um único método
status: pendente
---

# Atualizar cadastro de credenciais AppyPay no frontend (pendente)

## Prompt recomendado para executar a atualização

Este documento **substitui inteiramente** qualquer tarefa anterior sobre o cadastro de credenciais AppyPay ainda não executada — não aplique nenhuma versão anterior, aplique só o que está aqui. Implemente, no repositório `spuripainel`, as mudanças descritas neste documento em exatamente três arquivos: `src/types/api.ts`, `src/lib/api/index.ts` e `src/components/paineis/FinanceiroCredenciaisPainel.tsx`. Nenhum outro arquivo precisa mudar. Não altere `package-lock.json` nem `yarn.lock` — se o seu `npm install` gerar diffs neles, não os inclua no commit. Todo o código já foi implementado e validado por mim (Claude, orquestrador) num clone real do repositório, com `npx tsc --noEmit` e `npm run lint` — use exatamente como está aqui.

## Contexto

Esta tarefa combina duas mudanças de contrato do backend (`spuri-backend`), ambas concluídas e depuradas lá:

1. **`resource` saiu do endpoint.** `POST`/`PUT /financeiro/appypay/credenciais` não aceitam mais o campo `resource`, e as respostas não devolvem mais `resource_mask`. O valor agora vem de uma variável de ambiente do backend.
2. **O método de autenticação de webhook foi simplificado para um único método.** O campo `webhook_auth_type` (`"basic"` ou `"api_key"`) e o campo `webhook_username` foram removidos inteiramente do backend. Restam apenas `webhook_secret` (o segredo) e `webhook_header_name` (opcional — nome do cabeçalho HTTP em que a AppyPay envia esse segredo; padrão `X-API-Key` quando omitido). Isso porque a AppyPay confirmou que o painel de webhooks deles só oferece um único par nome/valor de cabeçalho HTTP — não existe uma forma prática de configurar Basic Auth por lá, então manter essa opção no formulário só criava uma escolha confusa sem utilidade real (foi exatamente o que gerou a dúvida que levou a esta simplificação).

Além disso, esta tarefa inclui duas mudanças de rótulo e um novo bloco informativo que já estavam pendentes:

- "Método de pagamento GPO *" → "ID Método de pagamento GPO *"
- "Método de pagamento REF *" → "ID Método de pagamento REF *"
- Um bloco explicando que é necessário aderir ao Gateway de Pagamento Online da AppyPay junto ao banco antes de conseguir usar o módulo de finanças, com a nota oficial de adesão da AppyPay (recolhível).

O formulário fica em `src/components/paineis/FinanceiroCredenciaisPainel.tsx`, renderizado pela página `src/app/(painel)/financas/credenciais/page.tsx` (não precisa de nenhuma alteração — é só um wrapper). Os tipos ficam em `src/types/api.ts`, reexportados por `src/lib/api/index.ts`. `src/lib/api/services.ts` não precisa de nenhuma alteração — é passthrough genérico dos tipos.

## Resumo executivo

| Item | Decisão | Resultado esperado |
| --- | --- | --- |
| Campo `resource` | Removido do tipo, do formulário e da tabela | Formulário não pede mais nada relacionado a `resource` |
| `webhook_auth_type` / Select de tipo de autenticação | Removido inteiramente, junto com o tipo `FinanceiroWebhookAuthType` | Não existe mais escolha de "Basic Auth" vs "API Key" |
| `webhook_username` / "Usuário do Webhook" | Removido inteiramente | Campo não existe mais no formulário |
| Rótulos GPO/REF | "Método de pagamento GPO *" → "ID Método de pagamento GPO *"; "Método de pagamento REF *" → "ID Método de pagamento REF *" | Só o texto do rótulo muda |
| Campo `webhook_header_name` | Continua opcional, sempre visível (não há mais condicional de tipo) | Em branco = usa `X-API-Key` |
| Nota de adesão AppyPay | Novo bloco informativo, sempre visível na página, com a nota oficial da AppyPay recolhível | Usuário entende que precisa aderir ao Gateway de Pagamento Online via banco antes de configurar credenciais |
| Arquivos alterados | `src/types/api.ts`, `src/lib/api/index.ts`, `src/components/paineis/FinanceiroCredenciaisPainel.tsx` | Nenhum outro arquivo tocado, incluindo `src/lib/api/services.ts` |
| Validação já feita | `npx tsc --noEmit` e `npm run lint` | Ambos limpos, nenhum erro/aviso novo introduzido |

---

# 1. `src/types/api.ts`

Localizar (do `export type FinanceiroContextoTipo` até o fechamento de `CriarFinanceiroCredencialRequest`):

```ts
export type FinanceiroContextoTipo = 'spuri' | 'academia';
export type FinanceiroAmbiente = 'test' | 'production';
export type FinanceiroWebhookAuthType = 'basic' | 'api_key';

/** Credencial AppyPay mascarada — retornada por criação, atualização e listagem. */
export interface FinanceiroCredencial {
  id: string;
  contexto_tipo: FinanceiroContextoTipo;
  codigo_academia?: string;
  ambiente: FinanceiroAmbiente;
  client_id_mask: string;
  resource_mask: string;
  gpo_payment_method_mask: string;
  ref_payment_method_mask: string;
  webhook_auth_type: FinanceiroWebhookAuthType;
  updated_at: string;
}

/** Corpo de POST /financeiro/appypay/credenciais e PUT /financeiro/appypay/credenciais/:id. */
export interface CriarFinanceiroCredencialRequest {
  contexto_tipo: FinanceiroContextoTipo;
  codigo_academia?: string;
  client_id: string;
  client_secret: string;
  resource: string;
  gpo_payment_method: string;
  ref_payment_method: string;
  webhook_auth_type: FinanceiroWebhookAuthType;
  webhook_username?: string;
  webhook_secret: string;
}
```

Substituir por:

```ts
export type FinanceiroContextoTipo = 'spuri' | 'academia';
export type FinanceiroAmbiente = 'test' | 'production';

/** Credencial AppyPay mascarada — retornada por criação, atualização e listagem. */
export interface FinanceiroCredencial {
  id: string;
  contexto_tipo: FinanceiroContextoTipo;
  codigo_academia?: string;
  ambiente: FinanceiroAmbiente;
  client_id_mask: string;
  gpo_payment_method_mask: string;
  ref_payment_method_mask: string;
  webhook_header_name?: string;
  updated_at: string;
}

/** Corpo de POST /financeiro/appypay/credenciais e PUT /financeiro/appypay/credenciais/:id. */
export interface CriarFinanceiroCredencialRequest {
  contexto_tipo: FinanceiroContextoTipo;
  codigo_academia?: string;
  client_id: string;
  client_secret: string;
  gpo_payment_method: string;
  ref_payment_method: string;
  webhook_secret?: string;
  webhook_header_name?: string;
}
```

`webhook_secret` passa a ser opcional no tipo (`?`) porque o backend agora trata assim de fato: se omitido, a credencial simplesmente não autentica nenhum webhook. Isso não obriga o formulário a tratá-lo como opcional — a Seção 3 mantém `webhook_secret` na lista de campos obrigatórios da validação do formulário, preservando o comportamento atual.

`AtualizarFinanceiroCredencialRequest` (`= CriarFinanceiroCredencialRequest`, logo abaixo) não precisa de nenhuma mudança — já herda o tipo automaticamente.

---

# 2. `src/lib/api/index.ts`

Localizar, no bloco de re-exportação de tipos financeiros:

```ts
  FinanceiroContextoTipo,
  FinanceiroAmbiente,
  FinanceiroWebhookAuthType,
  FinanceiroCredencial,
```

Substituir por:

```ts
  FinanceiroContextoTipo,
  FinanceiroAmbiente,
  FinanceiroCredencial,
```

---

# 3. `src/components/paineis/FinanceiroCredenciaisPainel.tsx`

## 3.1 Import de tipos

Localizar:

```ts
import type { AcademiaDetalhada, CriarFinanceiroCredencialRequest, FinanceiroContextoTipo, FinanceiroCredencial, FinanceiroWebhookAuthType, ListarFinanceiroCredenciaisParams } from "@/types/api";
```

Substituir por:

```ts
import type { AcademiaDetalhada, CriarFinanceiroCredencialRequest, FinanceiroContextoTipo, FinanceiroCredencial, ListarFinanceiroCredenciaisParams } from "@/types/api";
```

## 3.2 `CredencialFormData` e `EMPTY_FORM`

Localizar:

```ts
type CredencialFormData = {
  client_id: string;
  client_secret: string;
  resource: string;
  gpo_payment_method: string;
  ref_payment_method: string;
  webhook_auth_type: FinanceiroWebhookAuthType;
  webhook_username: string;
  webhook_secret: string;
};

const EMPTY_FORM: CredencialFormData = {
  client_id: "",
  client_secret: "",
  resource: "",
  gpo_payment_method: "",
  ref_payment_method: "",
  webhook_auth_type: "api_key",
  webhook_username: "",
  webhook_secret: "",
};
```

Substituir por:

```ts
type CredencialFormData = {
  client_id: string;
  client_secret: string;
  gpo_payment_method: string;
  ref_payment_method: string;
  webhook_secret: string;
  webhook_header_name: string;
};

const EMPTY_FORM: CredencialFormData = {
  client_id: "",
  client_secret: "",
  gpo_payment_method: "",
  ref_payment_method: "",
  webhook_secret: "",
  webhook_header_name: "",
};
```

## 3.3 Validador local de nome de cabeçalho HTTP

Adicionar logo após a função `contextParams` já existente (mesma regra de caracteres válidos usada no backend, em `validHTTPHeaderName` de `internal/finance/appypay.go`):

```ts
const HTTP_HEADER_NAME_PATTERN = /^[A-Za-z0-9!#$%&'*+\-.^_`|~]+$/;
```

## 3.4 `validate()`

Localizar:

```ts
  const validate = () => {
    const errors: FormErrors = {};
    const required: (keyof CredencialFormData)[] = ["client_id", "client_secret", "resource", "gpo_payment_method", "ref_payment_method", "webhook_secret"];
    required.forEach((field) => {
      if (!formData[field].trim()) errors[field] = "Campo obrigatório.";
    });
    if (formData.webhook_auth_type === "basic" && !formData.webhook_username.trim()) {
      errors.webhook_username = "Usuário obrigatório para Basic Auth.";
    }
    if (!resolveContext()) errors.contexto = "Selecione um contexto antes de salvar.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
```

Substituir por:

```ts
  const validate = () => {
    const errors: FormErrors = {};
    const required: (keyof CredencialFormData)[] = ["client_id", "client_secret", "gpo_payment_method", "ref_payment_method", "webhook_secret"];
    required.forEach((field) => {
      if (!formData[field].trim()) errors[field] = "Campo obrigatório.";
    });
    if (formData.webhook_header_name.trim() && !HTTP_HEADER_NAME_PATTERN.test(formData.webhook_header_name.trim())) {
      errors.webhook_header_name = "Nome de cabeçalho HTTP inválido (sem espaços ou dois-pontos).";
    }
    if (!resolveContext()) errors.contexto = "Selecione um contexto antes de salvar.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
```

## 3.5 `handleSubmit()` — payload

Localizar:

```ts
    const payload: CriarFinanceiroCredencialRequest = {
      ...context,
      client_id: formData.client_id.trim(),
      client_secret: formData.client_secret.trim(),
      resource: formData.resource.trim(),
      gpo_payment_method: formData.gpo_payment_method.trim(),
      ref_payment_method: formData.ref_payment_method.trim(),
      webhook_auth_type: formData.webhook_auth_type,
      webhook_secret: formData.webhook_secret.trim(),
      ...(formData.webhook_auth_type === "basic" ? { webhook_username: formData.webhook_username.trim() } : {}),
    };
```

Substituir por:

```ts
    const payload: CriarFinanceiroCredencialRequest = {
      ...context,
      client_id: formData.client_id.trim(),
      client_secret: formData.client_secret.trim(),
      gpo_payment_method: formData.gpo_payment_method.trim(),
      ref_payment_method: formData.ref_payment_method.trim(),
      webhook_secret: formData.webhook_secret.trim(),
      ...(formData.webhook_header_name.trim() ? { webhook_header_name: formData.webhook_header_name.trim() } : {}),
    };
```

## 3.6 Tabela de credenciais

Localizar:

```tsx
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]"><TableRow>{["Contexto", "Ambiente", "Client ID", "Resource", "Método GPO", "Método REF", "Webhook", "Atualizado em", "Ações"].map((h) => <TableCell key={h} isHeader className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{h}</TableCell>)}</TableRow></TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {rows.map((credencial) => (
                  <TableRow key={credencial.id}>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"><span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">{credencial.contexto_tipo === "spuri" ? "Spuri" : `Academia ${credencial.codigo_academia ?? ""}`}</span></TableCell>
                    <TableCell className="px-4 py-3 text-sm"><span className={credencial.ambiente === "production" ? "rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300" : "rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"}>{credencial.ambiente}</span></TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{credencial.client_id_mask}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{credencial.resource_mask}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{credencial.gpo_payment_method_mask}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{credencial.ref_payment_method_mask}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{credencial.webhook_auth_type === "basic" ? "Basic Auth" : "API Key"}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatDate(credencial.updated_at)}</TableCell>
                    <TableCell className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => openEdit(credencial)}>Editar</Button></TableCell>
                  </TableRow>
                ))}
```

Substituir por:

```tsx
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]"><TableRow>{["Contexto", "Ambiente", "Client ID", "Método GPO", "Método REF", "Cabeçalho do Webhook", "Atualizado em", "Ações"].map((h) => <TableCell key={h} isHeader className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{h}</TableCell>)}</TableRow></TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {rows.map((credencial) => (
                  <TableRow key={credencial.id}>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"><span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">{credencial.contexto_tipo === "spuri" ? "Spuri" : `Academia ${credencial.codigo_academia ?? ""}`}</span></TableCell>
                    <TableCell className="px-4 py-3 text-sm"><span className={credencial.ambiente === "production" ? "rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300" : "rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"}>{credencial.ambiente}</span></TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{credencial.client_id_mask}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{credencial.gpo_payment_method_mask}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{credencial.ref_payment_method_mask}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{credencial.webhook_header_name || "X-API-Key"}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatDate(credencial.updated_at)}</TableCell>
                    <TableCell className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => openEdit(credencial)}>Editar</Button></TableCell>
                  </TableRow>
                ))}
```

A coluna "Webhook" (que mostrava "Basic Auth"/"API Key") vira "Cabeçalho do Webhook" (mostra o nome do cabeçalho configurado, com `X-API-Key` como padrão de exibição quando vazio) — não faz mais sentido mostrar um "tipo" que não existe mais.

## 3.7 Formulário

Localizar:

```tsx
            <Field label="Client ID *"><Input value={formData.client_id} onChange={(e) => setFormData((p) => ({ ...p, client_id: e.target.value }))} error={!!formErrors.client_id} hint={formErrors.client_id} /></Field>
            <PasswordField label="Client Secret *" value={formData.client_secret} show={showClientSecret} onToggle={() => setShowClientSecret((v) => !v)} onChange={(value) => setFormData((p) => ({ ...p, client_secret: value }))} error={formErrors.client_secret} />
            <Field label="Resource *"><Input value={formData.resource} onChange={(e) => setFormData((p) => ({ ...p, resource: e.target.value }))} error={!!formErrors.resource} hint={formErrors.resource ?? "ID ou URL do resource/recurso fornecido pela AppyPay."} /></Field>
            <Field label="Método de pagamento GPO *"><Input value={formData.gpo_payment_method} onChange={(e) => setFormData((p) => ({ ...p, gpo_payment_method: e.target.value }))} error={!!formErrors.gpo_payment_method} hint={formErrors.gpo_payment_method ?? "Identificador do método GPO configurado na AppyPay."} /></Field>
            <Field label="Método de pagamento REF *"><Input value={formData.ref_payment_method} onChange={(e) => setFormData((p) => ({ ...p, ref_payment_method: e.target.value }))} error={!!formErrors.ref_payment_method} hint={formErrors.ref_payment_method ?? "Identificador do método REF configurado na AppyPay."} /></Field>
            <Field label="Autenticação do Webhook *"><Select key={formData.webhook_auth_type} defaultValue={formData.webhook_auth_type} options={[{ value: "api_key", label: "API Key" }, { value: "basic", label: "Basic Auth" }]} onChange={(value) => setFormData((p) => ({ ...p, webhook_auth_type: value as FinanceiroWebhookAuthType, webhook_username: value === "api_key" ? "" : p.webhook_username }))} /></Field>
            {formData.webhook_auth_type === "basic" && <Field label="Usuário do Webhook *"><Input value={formData.webhook_username} onChange={(e) => setFormData((p) => ({ ...p, webhook_username: e.target.value }))} error={!!formErrors.webhook_username} hint={formErrors.webhook_username} /></Field>}
            <PasswordField label="Segredo do Webhook *" value={formData.webhook_secret} show={showWebhookSecret} onToggle={() => setShowWebhookSecret((v) => !v)} onChange={(value) => setFormData((p) => ({ ...p, webhook_secret: value }))} error={formErrors.webhook_secret} />
```

Substituir por:

```tsx
            <Field label="Client ID *"><Input value={formData.client_id} onChange={(e) => setFormData((p) => ({ ...p, client_id: e.target.value }))} error={!!formErrors.client_id} hint={formErrors.client_id} /></Field>
            <PasswordField label="Client Secret *" value={formData.client_secret} show={showClientSecret} onToggle={() => setShowClientSecret((v) => !v)} onChange={(value) => setFormData((p) => ({ ...p, client_secret: value }))} error={formErrors.client_secret} />
            <Field label="ID Método de pagamento GPO *"><Input value={formData.gpo_payment_method} onChange={(e) => setFormData((p) => ({ ...p, gpo_payment_method: e.target.value }))} error={!!formErrors.gpo_payment_method} hint={formErrors.gpo_payment_method ?? "Identificador do método GPO configurado na AppyPay."} /></Field>
            <Field label="ID Método de pagamento REF *"><Input value={formData.ref_payment_method} onChange={(e) => setFormData((p) => ({ ...p, ref_payment_method: e.target.value }))} error={!!formErrors.ref_payment_method} hint={formErrors.ref_payment_method ?? "Identificador do método REF configurado na AppyPay."} /></Field>
            <Field label="Nome do Cabeçalho do Webhook"><Input value={formData.webhook_header_name} onChange={(e) => setFormData((p) => ({ ...p, webhook_header_name: e.target.value }))} error={!!formErrors.webhook_header_name} hint={formErrors.webhook_header_name ?? "Nome do cabeçalho HTTP configurado no painel de webhooks da AppyPay. Deixe em branco para usar o padrão X-API-Key."} /></Field>
            <PasswordField label="Segredo do Webhook *" value={formData.webhook_secret} show={showWebhookSecret} onToggle={() => setShowWebhookSecret((v) => !v)} onChange={(value) => setFormData((p) => ({ ...p, webhook_secret: value }))} error={formErrors.webhook_secret} />
```

Note que o `Select` de "Autenticação do Webhook" desaparece inteiramente — não há mais nada para escolher. O componente `Select` continua sendo usado em outro lugar do arquivo (filtro de "Contexto"), então o import dele não muda.

## 3.8 Nota de adesão ao Gateway de Pagamento AppyPay

Localizar, logo depois do bloco de filtro de contexto (fechamento da primeira `<div className="rounded-2xl ...">`) e antes do bloco da tabela:

```tsx
      </div>

      {!formOpen && <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        {listando ? <LoadingState /> : rows.length === 0 ? (
```

Substituir por:

```tsx
      </div>

      <AdesaoAppyPayInfo />

      {!formOpen && <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        {listando ? <LoadingState /> : rows.length === 0 ? (
```

Adicionar o novo componente `AdesaoAppyPayInfo`, logo antes da função `Field` já existente no fim do arquivo:

```tsx
function AdesaoAppyPayInfo() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-start gap-3">
        <Icon icon="mdi:bank-outline" width={22} className="mt-0.5 shrink-0 text-brand-500" />
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Antes de configurar as credenciais</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Para ter acesso ao módulo de finanças e fazer cobranças e receber pagamentos dos estudantes, é necessário aderir aos serviços de Gateway de Pagamento Online junto ao seu banco.
          </p>
        </div>
      </div>
      <details className="mt-4 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">Nota para Adesão ao Serviço (enviada pela AppyPay)</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-500 dark:text-gray-400">
          <li>É necessário ter uma conta bancária empresarial em um dos bancos angolanos.</li>
          <li>O processo de adesão começa no seu banco comercial: dirija-se ao seu banco e solicite os formulários de adesão aos métodos de pagamento que deseja utilizar (Multicaixa Express e/ou Referência).</li>
          <li>Informe ao banco que vai trabalhar com a AppyPay como seu facilitador tecnológico.</li>
          <li>A AppyPay tem parceria com o BAI (GPO), BCS e Standard Bank (GPO e REF) — se selecionar um destes bancos, não terá de pagar as comissões da AppyPay (0,4% por cobrança, com comissão mínima de 50 Kz por cobrança), nem assinar o contrato com a AppyPay.</li>
        </ol>
      </details>
    </div>
  );
}
```

**Nota sobre o texto:** mantive a nota da AppyPay o mais próxima possível do original que o Fredy passou, só ajustando pontuação (de lista com `;` para itens de `<li>`) e trocando a voz de primeira pessoa não-atribuída ("nossas comissões", "o contrato") por "as comissões da AppyPay"/"o contrato com a AppyPay" — dentro do próprio produto do Spuri, "nossas"/"nosso" sem indicação de autor poderia ser lido como se fosse do Spuri, não da AppyPay. O rótulo "Nota para Adesão ao Serviço (enviada pela AppyPay)" no `<summary>` já deixa a origem clara.

O bloco usa `<details>/<summary>` nativo do HTML (recolhido por padrão) porque não existe nenhum componente de acordeão/disclosure reutilizável no repositório hoje.

---

# Fora de escopo

- `src/lib/api/services.ts` — confirmado que não precisa de nenhuma alteração.
- `src/app/(painel)/financas/credenciais/page.tsx` — é só um wrapper, sem lógica própria.
- `package-lock.json` / `yarn.lock` — não incluir diffs deles no commit.
- Criar um componente de acordeão/disclosure reutilizável em `src/components/ui/` — usar `<details>/<summary>` nativo é suficiente para este único uso.
- Pré-preencher os campos do formulário com os valores atuais ao editar uma credencial — o formulário já segue deliberadamente o padrão "em branco ao editar, preencher tudo de novo" (ver o `Alert` "Rotação completa" já existente no arquivo).
- Qualquer alteração em páginas, componentes ou fluxos relacionados à matrícula/inscrição de estudante numa academia.
- Corrigir os 2 erros e 5 avisos pré-existentes do `npm run lint` em `verificar-email/[token]/page.tsx`, `Calendar.tsx`, `SelecaoContextoMassa.tsx` e `AppSidebar.tsx` — não têm nenhuma relação com AppyPay e já existiam antes desta tarefa.
- O backend (`spuri-backend`) tem uma tarefa própria e separada para a simplificação do método de autenticação de webhook — não é necessário (nem possível, são repositórios diferentes) tocar nele a partir daqui.

# Critérios de aceite

1. `src/types/api.ts` bate exatamente com a Seção 1; `FinanceiroWebhookAuthType` não existe mais em nenhum lugar do arquivo.
2. `src/lib/api/index.ts` bate com a Seção 2.
3. `src/components/paineis/FinanceiroCredenciaisPainel.tsx` bate com a Seção 3.
4. O campo "Resource" e o Select "Autenticação do Webhook *" não existem mais em nenhum lugar da página (formulário e tabela).
5. Os rótulos "ID Método de pagamento GPO *" e "ID Método de pagamento REF *" aparecem no formulário.
6. O campo "Nome do Cabeçalho do Webhook" está sempre visível no formulário (sem condicional de tipo).
7. O bloco "Antes de configurar as credenciais" com a nota recolhível da AppyPay aparece sempre na página `/financas/credenciais`, independente do formulário estar aberto ou não.
8. `npx tsc --noEmit` e `npm run lint` rodam sem nenhum erro/aviso novo (os pré-existentes listados em "Fora de escopo" continuam lá, sem piorar nem melhorar).
9. `grep -rn "webhook_auth_type\|FinanceiroWebhookAuthType\|webhook_username" --include="*.ts" --include="*.tsx" src/` não retorna nenhuma linha.
10. Nenhum arquivo fora de `src/types/api.ts`, `src/lib/api/index.ts` e `src/components/paineis/FinanceiroCredenciaisPainel.tsx` é alterado.

## Nota de validação (Claude, antes de entregar esta tarefa)

Cloneei o repositório `spuripainel`, instalei as dependências reais (`npm install`) e apliquei exatamente o código desta tarefa. `npx tsc --noEmit` passou sem nenhum erro. `npm run lint` (ESLint real do projeto) resultou exatamente nos mesmos 2 erros e 5 avisos pré-existentes, nos mesmos arquivos, que já existiam antes de eu tocar em qualquer coisa — nenhum problema novo foi introduzido. O `npm install` gerou diffs em `package-lock.json`/`yarn.lock`, que são artefatos do meu ambiente de validação, não desta tarefa — não os inclua no commit.

## Procedimento de conclusão

1. Atualizar o título interno desta tarefa para `# Atualizar cadastro de credenciais AppyPay no frontend (feito)`.
2. Alterar o front matter para `status: feito`.
3. Este repositório ainda não tem uma pasta `docs/Tarefas feitas/` própria — manter o arquivo em `src/docs/` mesmo, apenas com o status atualizado.
