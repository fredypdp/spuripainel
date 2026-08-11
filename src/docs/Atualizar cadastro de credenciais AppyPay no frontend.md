---
criado: 2026-08-12 00:00
origem: solicitação do usuário — alinhar o formulário de credenciais AppyPay do frontend com a tarefa 24 do backend (spuri-backend) e adicionar nota de adesão ao Gateway de Pagamento
status: pendente
---

# Atualizar cadastro de credenciais AppyPay no frontend (pendente)

## Prompt recomendado para executar a atualização

Implemente, no repositório `spuripainel`, as mudanças descritas neste documento em três arquivos: `src/types/api.ts`, `src/components/paineis/FinanceiroCredenciaisPainel.tsx` e nenhum outro. `src/lib/api/services.ts` **não precisa de nenhuma alteração** — já foi auditado e confirmado genérico (não referencia `resource` nem nenhum campo de webhook diretamente; apenas repassa os tipos de `src/types/api.ts`). Todas as seções abaixo já foram implementadas e validadas por mim (Claude, orquestrador) num clone real do repositório — use o código exatamente como está aqui, não precisa reinterpretar ou redesenhar nada.

## Contexto

O backend (`spuri-backend`) concluiu a tarefa 24 (`docs/Tarefas feitas/24 - Cabeçalho de webhook configurável e resource AppyPay via variável de ambiente.md`), já depurada e validada duas vezes. Duas mudanças de contrato de API afetam o formulário de credenciais AppyPay do frontend:

1. **`resource` saiu do endpoint.** `POST`/`PUT /financeiro/appypay/credenciais` não aceitam mais o campo `resource`, e `GET`/a resposta de criação/atualização não devolvem mais `resource_mask`. O valor agora vem de uma variável de ambiente do backend (`APPYPAY_RESOURCE`), igual para todas as academias.
2. **Novo campo opcional `webhook_header_name`.** Quando `webhook_auth_type="api_key"`, é possível informar o nome do cabeçalho HTTP em que a AppyPay deve enviar o segredo do webhook (antes fixo em `X-API-Key`, agora configurável por credencial, com esse mesmo valor como padrão quando o campo é omitido).

`src/docs/Documentação da API.md` (a cópia local da documentação da API neste repositório) já está atualizada e confirma os dois pontos acima nas seções 19.1–19.3 e 19.7–19.8.

O formulário de credenciais fica em `src/components/paineis/FinanceiroCredenciaisPainel.tsx`, renderizado pela página `src/app/(painel)/financas/credenciais/page.tsx` (essa página não precisa de nenhuma alteração — é só um wrapper). Os tipos ficam em `src/types/api.ts`. Não encontrei nenhum outro arquivo do frontend referenciando `resource`/`resource_mask`/AppyPay além desses dois mais `src/lib/api/services.ts` (que não precisa de mudanças).

**Sobre "typos":** revisei o arquivo do formulário com atenção redobrada (inclusive comparação byte a byte dos rótulos "Método de pagamento GPO *" e "Método de pagamento REF *") e não encontrei nenhuma inconsistência de digitação além das mudanças de rótulo pedidas explicitamente (adicionar o prefixo "ID " a ambos). Se havia algum typo em mente, ele não estava no texto atual deste arquivo — as mudanças abaixo cobrem tudo que identifiquei.

## Resumo executivo

| Item | Decisão | Resultado esperado |
| --- | --- | --- |
| Campo `resource` | Removido do tipo, do formulário, da tabela e do payload enviado | Formulário não pede mais nada relacionado a `resource` |
| Rótulos GPO/REF | "Método de pagamento GPO *" → "ID Método de pagamento GPO *"; "Método de pagamento REF *" → "ID Método de pagamento REF *" | Só o texto do rótulo muda; nenhuma lógica de validação/campo é afetada |
| Campo `webhook_header_name` | Novo campo de texto opcional, visível apenas quando `webhook_auth_type="api_key"` | Compatível com o backend; em branco = usa `X-API-Key` |
| Nota de adesão AppyPay | Novo bloco informativo, sempre visível na página, com a nota oficial da AppyPay recolhível | Usuário entende que precisa aderir ao Gateway de Pagamento Online via banco antes de configurar credenciais |
| Arquivos alterados | `src/types/api.ts`, `src/components/paineis/FinanceiroCredenciaisPainel.tsx` | Nenhum outro arquivo tocado, incluindo `src/lib/api/services.ts` |
| Validação já feita | `npx tsc --noEmit` e `npm run lint` | Ambos limpos, nenhum erro/aviso novo introduzido (ver nota de validação no fim) |

---

# 1. `src/types/api.ts` — alinhar tipos com o novo contrato do backend

## 1.1 `FinanceiroCredencial`

Localizar:

```ts
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
```

Substituir por:

```ts
export interface FinanceiroCredencial {
  id: string;
  contexto_tipo: FinanceiroContextoTipo;
  codigo_academia?: string;
  ambiente: FinanceiroAmbiente;
  client_id_mask: string;
  gpo_payment_method_mask: string;
  ref_payment_method_mask: string;
  webhook_auth_type: FinanceiroWebhookAuthType;
  webhook_header_name?: string;
  updated_at: string;
}
```

## 1.2 `CriarFinanceiroCredencialRequest`

Localizar:

```ts
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
export interface CriarFinanceiroCredencialRequest {
  contexto_tipo: FinanceiroContextoTipo;
  codigo_academia?: string;
  client_id: string;
  client_secret: string;
  gpo_payment_method: string;
  ref_payment_method: string;
  webhook_auth_type: FinanceiroWebhookAuthType;
  webhook_username?: string;
  webhook_secret: string;
  webhook_header_name?: string;
}
```

`AtualizarFinanceiroCredencialRequest` (`= CriarFinanceiroCredencialRequest`, logo abaixo) não precisa de nenhuma mudança — já herda o tipo automaticamente.

---

# 2. `src/components/paineis/FinanceiroCredenciaisPainel.tsx`

## 2.1 `CredencialFormData` e `EMPTY_FORM`

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
  webhook_auth_type: FinanceiroWebhookAuthType;
  webhook_username: string;
  webhook_secret: string;
  webhook_header_name: string;
};

const EMPTY_FORM: CredencialFormData = {
  client_id: "",
  client_secret: "",
  gpo_payment_method: "",
  ref_payment_method: "",
  webhook_auth_type: "api_key",
  webhook_username: "",
  webhook_secret: "",
  webhook_header_name: "",
};
```

## 2.2 Validador local de nome de cabeçalho HTTP

Adicionar logo após a função `contextParams` já existente (mesma regra de caracteres válidos usada no backend, em `validHTTPHeaderName` de `internal/finance/appypay.go`):

```ts
const HTTP_HEADER_NAME_PATTERN = /^[A-Za-z0-9!#$%&'*+\-.^_`|~]+$/;
```

## 2.3 `validate()`

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
    if (formData.webhook_auth_type === "basic" && !formData.webhook_username.trim()) {
      errors.webhook_username = "Usuário obrigatório para Basic Auth.";
    }
    if (formData.webhook_auth_type === "api_key" && formData.webhook_header_name.trim() && !HTTP_HEADER_NAME_PATTERN.test(formData.webhook_header_name.trim())) {
      errors.webhook_header_name = "Nome de cabeçalho HTTP inválido (sem espaços ou dois-pontos).";
    }
    if (!resolveContext()) errors.contexto = "Selecione um contexto antes de salvar.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
```

`webhook_header_name` fica de fora do array `required` de propósito: é opcional no backend (cai no padrão `X-API-Key` quando vazio).

## 2.4 `handleSubmit()` — payload

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
      webhook_auth_type: formData.webhook_auth_type,
      webhook_secret: formData.webhook_secret.trim(),
      ...(formData.webhook_auth_type === "basic" ? { webhook_username: formData.webhook_username.trim() } : {}),
      ...(formData.webhook_auth_type === "api_key" && formData.webhook_header_name.trim() ? { webhook_header_name: formData.webhook_header_name.trim() } : {}),
    };
```

`webhook_header_name` só é incluído no payload quando o usuário efetivamente digitou algo em modo `api_key` — deixar de fora (em vez de mandar string vazia) é o que faz o backend cair no padrão `X-API-Key`.

## 2.5 Tabela de credenciais — remover coluna "Resource"

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

Substituir por (também aproveita para mostrar o nome do cabeçalho configurado quando for `api_key`, já que agora essa informação existe e não é sensível):

```tsx
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]"><TableRow>{["Contexto", "Ambiente", "Client ID", "Método GPO", "Método REF", "Webhook", "Atualizado em", "Ações"].map((h) => <TableCell key={h} isHeader className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{h}</TableCell>)}</TableRow></TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {rows.map((credencial) => (
                  <TableRow key={credencial.id}>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"><span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">{credencial.contexto_tipo === "spuri" ? "Spuri" : `Academia ${credencial.codigo_academia ?? ""}`}</span></TableCell>
                    <TableCell className="px-4 py-3 text-sm"><span className={credencial.ambiente === "production" ? "rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300" : "rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"}>{credencial.ambiente}</span></TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{credencial.client_id_mask}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{credencial.gpo_payment_method_mask}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{credencial.ref_payment_method_mask}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{credencial.webhook_auth_type === "basic" ? "Basic Auth" : `API Key (${credencial.webhook_header_name || "X-API-Key"})`}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatDate(credencial.updated_at)}</TableCell>
                    <TableCell className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => openEdit(credencial)}>Editar</Button></TableCell>
                  </TableRow>
                ))}
```

## 2.6 Formulário — remover "Resource", renomear GPO/REF, adicionar "Nome do Cabeçalho do Webhook"

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
            <Field label="Autenticação do Webhook *"><Select key={formData.webhook_auth_type} defaultValue={formData.webhook_auth_type} options={[{ value: "api_key", label: "API Key" }, { value: "basic", label: "Basic Auth" }]} onChange={(value) => setFormData((p) => ({ ...p, webhook_auth_type: value as FinanceiroWebhookAuthType, webhook_username: value === "api_key" ? "" : p.webhook_username, webhook_header_name: value === "basic" ? "" : p.webhook_header_name }))} /></Field>
            {formData.webhook_auth_type === "basic" && <Field label="Usuário do Webhook *"><Input value={formData.webhook_username} onChange={(e) => setFormData((p) => ({ ...p, webhook_username: e.target.value }))} error={!!formErrors.webhook_username} hint={formErrors.webhook_username} /></Field>}
            {formData.webhook_auth_type === "api_key" && <Field label="Nome do Cabeçalho do Webhook"><Input value={formData.webhook_header_name} onChange={(e) => setFormData((p) => ({ ...p, webhook_header_name: e.target.value }))} error={!!formErrors.webhook_header_name} hint={formErrors.webhook_header_name ?? "Nome do cabeçalho HTTP configurado no painel de webhooks da AppyPay. Deixe em branco para usar o padrão X-API-Key."} /></Field>}
            <PasswordField label="Segredo do Webhook *" value={formData.webhook_secret} show={showWebhookSecret} onToggle={() => setShowWebhookSecret((v) => !v)} onChange={(value) => setFormData((p) => ({ ...p, webhook_secret: value }))} error={formErrors.webhook_secret} />
```

Note que a troca do `Select` de autenticação agora também limpa `webhook_header_name` ao mudar para `basic` (mesmo padrão já usado para `webhook_username` ao mudar para `api_key`), evitando que um valor digitado antes de trocar o modo vaze para o payload errado.

## 2.7 Nota de adesão ao Gateway de Pagamento AppyPay

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

Este bloco fica sempre visível na página (lista, formulário aberto ou vazio), pois é contexto útil em qualquer um desses estados.

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

**Nota sobre o texto:** mantive a nota da AppyPay o mais próxima possível do original que você passou, só ajustando pontuação (de lista com `;` para itens de `<li>`) e trocando a voz de primeira pessoa não-atribuída ("nossas comissões", "o contrato") por "as comissões da AppyPay"/"o contrato com a AppyPay" — dentro do próprio produto do Spuri, "nossas"/"nosso" sem indicação de autor poderia ser lido como se fosse do Spuri, não da AppyPay. O rótulo "Nota para Adesão ao Serviço (enviada pela AppyPay)" no `<summary>` já deixa a origem clara. Se preferir manter a primeira pessoa exatamente como no original, é só reverter essas duas trocas de palavra — o resto do conteúdo e a ordem dos 4 pontos estão fiéis ao que você mandou.

O bloco usa `<details>/<summary>` nativo do HTML (recolhido por padrão) porque não existe nenhum componente de acordeão/disclosure reutilizável no repositório hoje (`src/components/ui/` não tem um); criar um componente novo só para isto seria escopo maior do que o pedido. O resumo/intro fica sempre visível; o passo a passo completo fica atrás do clique em "Nota para Adesão ao Serviço", para não sobrecarregar a página para quem já configurou as credenciais antes.

---

# Fora de escopo

- `src/lib/api/services.ts` — confirmado que não precisa de nenhuma alteração.
- `src/app/(painel)/financas/credenciais/page.tsx` — é só um wrapper, sem lógica própria.
- Qualquer alteração em `src/docs/Documentação da API.md` — já está atualizada.
- Criar um componente de acordeão/disclosure reutilizável em `src/components/ui/` — usar `<details>/<summary>` nativo é suficiente para este único uso.
- Pré-preencher os campos do formulário com os valores atuais ao editar uma credencial — o formulário já segue deliberadamente o padrão "em branco ao editar, preencher tudo de novo" (ver o `Alert` "Rotação completa" já existente no arquivo); `webhook_header_name` segue esse mesmo padrão, sem tratamento especial.
- Qualquer alteração em páginas, componentes ou fluxos relacionados à matrícula/inscrição de estudante numa academia.
- Corrigir os 2 erros e 5 avisos pré-existentes do `npm run lint` em `verificar-email/[token]/page.tsx`, `Calendar.tsx`, `SelecaoContextoMassa.tsx` e `AppSidebar.tsx` — não têm nenhuma relação com AppyPay e já existiam antes desta tarefa.

# Critérios de aceite

1. `src/types/api.ts` bate exatamente com a Seção 1.
2. `src/components/paineis/FinanceiroCredenciaisPainel.tsx` bate exatamente com a Seção 2.
3. O campo "Resource" não existe mais em nenhum lugar da página (formulário e tabela).
4. Os rótulos "ID Método de pagamento GPO *" e "ID Método de pagamento REF *" aparecem no formulário.
5. O campo "Nome do Cabeçalho do Webhook" aparece apenas quando "Autenticação do Webhook" está em "API Key", nunca em "Basic Auth".
6. O bloco "Antes de configurar as credenciais" com a nota recolhível da AppyPay aparece sempre na página `/financas/credenciais`, independente do formulário estar aberto ou não.
7. `npx tsc --noEmit` e `npm run lint` rodam sem nenhum erro/aviso novo (os pré-existentes listados em "Fora de escopo" continuam lá, sem piorar nem melhorar).
8. `src/lib/api/services.ts` permanece sem nenhuma alteração.
9. Nenhum arquivo fora de `src/types/api.ts` e `src/components/paineis/FinanceiroCredenciaisPainel.tsx` é alterado.

## Nota de validação (Claude, antes de entregar esta tarefa)

Cloneei o repositório `spuripainel`, instalei as dependências reais (`npm install`) e apliquei exatamente o código desta tarefa. `npx tsc --noEmit` passou sem nenhum erro. `npm run lint` (ESLint real do projeto) resultou exatamente nos mesmos 2 erros e 5 avisos pré-existentes, nos mesmos arquivos, que já existiam antes de eu tocar em qualquer coisa (confirmei rodando o lint antes e depois das mudanças) — nenhum problema novo foi introduzido. Não consegui rodar `npm run build` até o fim neste ambiente porque ele depende de buscar fontes do Google (`fonts.googleapis.com`), bloqueado pela minha rede de sandbox — isso não tem relação com o código desta tarefa; `tsc --noEmit` cobre a mesma checagem de tipos que o build faria. Recomendo ao Codex rodar `npm run build` normalmente no ambiente dele para confirmar, já que lá o acesso à internet não deve ter essa restrição.

## Procedimento de conclusão

1. Atualizar o título interno desta tarefa para `# Atualizar cadastro de credenciais AppyPay no frontend (feito)`.
2. Alterar o front matter para `status: feito`.
3. Este repositório ainda não tem uma pasta `docs/Tarefas feitas/` própria (mesma observação já registrada na tarefa do Ziett) — manter o arquivo em `src/docs/` mesmo, apenas com o status atualizado.
