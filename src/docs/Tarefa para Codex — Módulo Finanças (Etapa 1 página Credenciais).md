# Tarefa para Codex — Módulo "Finanças" (Etapa 1: página Credenciais)

**Repositório:** `fredypdp/spuripainel` (Next.js, App Router, TypeScript)
**Orquestrador:** Claude (análise + especificação) · **Execução:** Codex
**Fonte da verdade da API:** `src/docs/Documentação da API.md`, seção **19. Financeiro / AppyPay** (linhas 6862–7290, versão da API 2.2.0)


## 1. Objetivo desta etapa

Criar o grupo de páginas **"Finanças"** no painel e, dentro dele, a primeira página: **Credenciais** (`/financas/credenciais`), destinada a **administradores FPP** e a **academias** configurarem as credenciais AppyPay necessárias para futuramente criar cobranças (`POST /financeiro/appypay/cobrancas`, item 19.4 da doc — citado aqui apenas como **motivação de negócio**, não como endpoint a implementar nesta etapa).

Endpoints cobertos **nesta etapa**:

| Método | Rota | Uso na página |
|---|---|---|
| `GET` | `/financeiro/appypay/credenciais` | Listar credenciais do contexto autorizado |
| `POST` | `/financeiro/appypay/credenciais` | Criar credencial (contexto ainda sem credencial) |
| `PUT` | `/financeiro/appypay/credenciais/:id` | Substituir/rotacionar uma credencial existente |

## 2. Fora de escopo agora (roadmap do módulo Finanças)

Não implementar nesta etapa — apenas deixar a arquitetura (tipos/serviço) pronta para extensão futura:

- `POST /financeiro/appypay/cobrancas` (19.4) — página futura `/financas/cobrancas`.
- `POST /financeiro/appypay/qr-codes` (19.5) — página futura `/financas/qr-codes` (ou dentro de cobranças).
- `GET /financeiro/appypay/cobrancas/:id` (19.6) — consulta/detalhe de cobrança.
- Webhooks (19.7/19.8) — são rotas públicas consumidas pelo gateway AppyPay, não há UI associada.

---

## 3. Análise do front-end existente (padrões a seguir)

Repositório já contém grupos de páginas equivalentes que servem de modelo direto. Use-os como referência de estilo, não copie cegamente:

- **Estrutura de um grupo de páginas próprio** (analógico ao que criaremos): `src/app/(painel)/gerenciamento/` — tem `layout.tsx` (breadcrumb dinâmico por rota) + subpastas com `page.tsx` fino que delega para um componente em `src/components/paineis/*Painel.tsx` (ex.: `CursosPainel.tsx`).
- **Página com visão diferente por papel (role) dentro do mesmo componente**: `src/app/(painel)/configuracoes/AdminSection.tsx` usa `const isFPP = user?.admin?.role === "fpp"` para exibir seções extras só para admin FPP — mesmo padrão que a página de Credenciais precisa (admin FPP vê mais do que uma academia).
- **CRUD com formulário + tabela + modal**: `src/components/paineis/CursosPainel.tsx` (usa `useApi`, `Alert`, `Modal`, `Table`, `Button`, `Icon`).
- **Hook de identidade do usuário**: `src/hooks/useRoutePermission.ts` → `useUserType()` retorna `{ isAdmin, isAcademia, isEstudante, user, loading }`; `user.admin?.role` dá `'fpp' | 'adm' | 'gerente'`; `user.academia?.codigo_academia` dá o código da academia autenticada.
- **Client HTTP**: `src/lib/api/client.ts` expõe `api.get/post/put/delete` e `ApiError`/`formatApiError` para extrair a mensagem do envelope `{error, message, request_id, details?}`.
- **Serviços**: `src/lib/api/services.ts` centraliza todos os serviços (`academiaService`, `adminService`, `consultasService` etc.), reexportados em `src/lib/api/index.ts`. Todos seguem o padrão `token: params?.token || tokenStorage.get() || undefined`.
- **Tipos**: `src/types/api.ts`, reexportados em `src/lib/api/index.ts`.
- **Guarda de rotas**: `src/lib/route-guards.ts` (lista `ROUTE_PERMISSIONS`) + `src/components/guards/RouteGuard.tsx`, já aplicado globalmente em `src/app/(painel)/layout.tsx`. Ou seja, **basta registrar a rota em `ROUTE_PERMISSIONS`** — não é necessário envolver a página manualmente.
- **Sidebar**: `src/layout/AppSidebar.tsx` — array `navItems` + lógica de filtragem por `user.tipo` e `isFpp` dentro de `filteredNavItems` (`useMemo`).
- **Seleção de academia por um admin**: `consultasService.listarAcademias({ limit, offset, status, token })` retorna `{ academias: AcademiaDetalhada[] }`; `AcademiaDetalhada` tem `codigo_academia` e `nome`. Combine com `src/components/form/SearchableSelect.tsx` para um seletor pesquisável (mesmo padrão usado em `estudantes/cadastrar/CadastroSingularForm.tsx`).
- **Não há biblioteca de formulário/toast** (nem `react-hook-form`, nem `zod`, nem lib de toast) — o projeto usa `useState` manual + componente `Alert` (`src/components/ui/alert/Alert.tsx`) para erros/sucesso. Siga esse padrão, não introduza dependências novas.

---

## 4. Contrato de API (resumo funcional para a UI)

### 4.1 Regras gerais do módulo financeiro (aplicam-se a toda a página)

- Só usuários `academia` ou `admin` (qualquer role) autenticam nas rotas `/financeiro/*`, mas **apenas admin FPP e academia devem ter acesso à página** (admin `adm`/`gerente` e estudante não administram este módulo — a doc é explícita: "admins `adm` e `gerente`, estudantes e usuários anônimos não administram o módulo financeiro").
- **Academia autenticada**: o backend força `contexto_tipo="academia"` e `codigo_academia` do próprio token, mesmo que o campo venha vazio ou diferente no request. → **A UI de academia nunca deve expor esses dois campos como editáveis.**
- **Admin FPP**: pode operar `contexto_tipo="spuri"` (global) ou `contexto_tipo="academia"` de qualquer academia (informando `codigo_academia`). → **A UI de admin FPP precisa de um seletor de contexto.**
- Segredos (`client_secret`, credenciais de webhook) **nunca** são retornados pela API em nenhuma resposta — apenas máscaras (`*_mask`) e metadados. **Isso vale tanto para criação quanto para edição**: ao editar (PUT), o formulário deve ser preenchido do zero pelo usuário, pois a API não devolve o valor atual de nenhum campo sensível para pré-preencher.
- `ambiente` (`test` | `production`) é **resolvido pelo backend** a partir da variável `ENV` do servidor — não é um campo de formulário, apenas exibição.

### 4.2 `POST /financeiro/appypay/credenciais` (19.1) — criar

Request:

```json
{
  "contexto_tipo": "academia",
  "codigo_academia": "LDA20261",
  "client_id": "appy-client-id",
  "client_secret": "appy-client-secret",
  "resource": "2aed7612-de64-46b5-9e59-1f48f8902d14",
  "gpo_payment_method": "GPO_METHOD_ID",
  "ref_payment_method": "REF_METHOD_ID",
  "webhook_auth_type": "api_key",
  "webhook_secret": "segredo-do-webhook"
}
```

Response `201`:

```json
{
  "id": "2f0f8d8f-27a1-4b2d-9a70-8e26d208f7e4",
  "contexto_tipo": "academia",
  "codigo_academia": "LDA20261",
  "ambiente": "test",
  "client_id_mask": "appy**********id",
  "resource_mask": "http**********2.0",
  "gpo_payment_method_mask": "GPO_**********_ID",
  "ref_payment_method_mask": "REF_**********_ID",
  "webhook_auth_type": "api_key",
  "updated_at": "2026-08-08T12:00:00Z"
}
```

Regras de validação (replicar no front antes de enviar, para feedback imediato — a validação definitiva é sempre do backend):

- `client_id`, `client_secret`, `resource`, `gpo_payment_method`, `ref_payment_method` → **obrigatórios, não vazios**.
- `webhook_auth_type = "basic"` → exige `webhook_username` **e** `webhook_secret`.
- `webhook_auth_type = "api_key"` → exige `webhook_secret` (o `webhook_username` não se aplica; se preenchido, não enviar).
- Uma academia não pode criar credencial para `spuri` nem para outra academia (a UI de academia simplesmente não deve oferecer essa opção).

### 4.3 `PUT /financeiro/appypay/credenciais/:id` (19.2) — atualizar/rotacionar

- Mesmo corpo do `POST`; **substituição completa** (reenviar todos os campos obrigatórios, não é PATCH parcial).
- `:id` é o UUID retornado na criação/listagem.
- Resposta `200` no mesmo formato do `POST` (mesmo `id`, `updated_at` novo).
- Academia só pode atualizar a própria credencial; tentar mudar de contexto é bloqueado por autorização.

### 4.4 `GET /financeiro/appypay/credenciais` (19.3) — listar

Query params (ambos opcionais; ignorados/forçados quando quem chama é academia):

| Campo | Tipo | Descrição |
|---|---|---|
| `contexto_tipo` | `'spuri' \| 'academia'` | Filtro de contexto. |
| `codigo_academia` | `string` | Filtro por academia (só relevante com `contexto_tipo=academia`). |

Response `200` — **array** (não um objeto envelope):

```json
[
  {
    "id": "2f0f8d8f-27a1-4b2d-9a70-8e26d208f7e4",
    "contexto_tipo": "academia",
    "codigo_academia": "LDA20261",
    "ambiente": "test",
    "client_id_mask": "appy**********id",
    "resource_mask": "http**********2.0",
    "gpo_payment_method_mask": "GPO_**********_ID",
    "ref_payment_method_mask": "REF_**********_ID",
    "webhook_auth_type": "api_key",
    "updated_at": "2026-08-08T12:00:00Z"
  }
]
```

- Academia: sempre recebe só a própria credencial (0 ou 1 item).
- Admin FPP sem filtro: recebe todas as credenciais autorizadas (pode incluir `spuri` + várias academias) — a tabela deve suportar múltiplas linhas.

### 4.5 Erros comuns (envelope padrão `{error, message, request_id, details?}`)

| Status | Quando | Tratamento sugerido na UI |
|---|---|---|
| `400` | Payload inválido, UUID inválido, contexto inválido, credenciais incompletas | Mostrar `message`/`details[0].message` no `Alert` do formulário |
| `401` | Token ausente/inválido | Deixe o fluxo padrão do app tratar (já existe tratamento global de sessão) |
| `403` | Tentando operar contexto sem permissão | Alert: "Você não tem permissão para configurar credenciais deste contexto." |
| `404` | Credencial inexistente (PUT com `:id` errado) | Alert + recarregar lista |
| `409` | Já existe operação equivalente em andamento | Alert: "Já existe uma operação em andamento para esta credencial, tente novamente em instantes." (permitir retry) |
| `503` | Falha de comunicação/autenticação com a AppyPay | Alert: "Não foi possível confirmar com a AppyPay agora. Tente novamente mais tarde." |
| `500` | Erro interno | Alert genérico de erro |

Use `formatApiError(err, fallback)` de `src/lib/api/client.ts`, já usado em todo o projeto.

---

## 5. Especificação técnica de implementação

### 5.1 Tipos novos — `src/types/api.ts`

Adicionar (posicionar perto de outros tipos de domínio, ex. após os tipos de `Turma`/`CategoriaNota`):

```ts
// =====================
// FINANCEIRO / APPYPAY
// =====================

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

/** PUT é substituição completa — mesmo formato do POST. */
export type AtualizarFinanceiroCredencialRequest = CriarFinanceiroCredencialRequest;

export interface ListarFinanceiroCredenciaisParams {
  contexto_tipo?: FinanceiroContextoTipo;
  codigo_academia?: string;
}

export type ListarFinanceiroCredenciaisResponse = FinanceiroCredencial[];
```

### 5.2 Serviço novo — `src/lib/api/services.ts`

Adicionar um novo serviço `financeiroService` (seguir exatamente o padrão de `token: params?.token || tokenStorage.get() || undefined` já usado em `anosAcademicos`/`consultasService`):

```ts
// ── Financeiro / AppyPay ────────────────────────────────────────────

export const financeiroService = {
  listarCredenciais: (params?: ListarFinanceiroCredenciaisParams & { token?: string }) => {
    const qs = new URLSearchParams();
    if (params?.contexto_tipo) qs.set('contexto_tipo', params.contexto_tipo);
    if (params?.codigo_academia) qs.set('codigo_academia', params.codigo_academia);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ListarFinanceiroCredenciaisResponse>(
      `/financeiro/appypay/credenciais${query}`,
      { token: params?.token || tokenStorage.get() || undefined }
    );
  },

  criarCredencial: (data: CriarFinanceiroCredencialRequest, token?: string) =>
    api.post<FinanceiroCredencial, CriarFinanceiroCredencialRequest>(
      '/financeiro/appypay/credenciais',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarCredencial: (id: string, data: AtualizarFinanceiroCredencialRequest, token?: string) =>
    api.put<FinanceiroCredencial, AtualizarFinanceiroCredencialRequest>(
      `/financeiro/appypay/credenciais/${id}`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),
};
```

> Deixe um comentário `// TODO(finanças): criarCobranca, criarQrCode, consultarCobranca — próximas etapas` acima do serviço, sem implementar os métodos agora.

### 5.3 Exports — `src/lib/api/index.ts`

- Adicionar `financeiroService` ao bloco de export de serviços (junto de `academiaService`, `adminService` etc.).
- Adicionar ao bloco de `export type { ... } from '@/types/api'`: `FinanceiroContextoTipo`, `FinanceiroAmbiente`, `FinanceiroWebhookAuthType`, `FinanceiroCredencial`, `CriarFinanceiroCredencialRequest`, `AtualizarFinanceiroCredencialRequest`, `ListarFinanceiroCredenciaisParams`, `ListarFinanceiroCredenciaisResponse`.

### 5.4 Guarda de rota — `src/lib/route-guards.ts`

Adicionar em `ROUTE_PERMISSIONS` (seção nova, próxima da de "Configurações"):

```ts
// ==========================================
// ROTAS DE FINANÇAS — Admin FPP e Academia
// ==========================================
{
  path: '/financas/credenciais',
  allowedTypes: ['admin', 'academia'],
  redirectIfUnauthorized: '/',
},
```

> `allowedTypes` só distingue `UserType` (`admin`/`academia`/`estudante`), não o `role` do admin (`fpp`/`adm`/`gerente`). A restrição fina "só admin **FPP**" é feita **dentro do componente** (ver 5.6), replicando o padrão já usado em `AdminSection.tsx` (`isFPP`). Isso é intencional e consistente com o resto do projeto (compare com `/configuracoes/ano-letivo`, que também é `['admin','academia']` no guard e depois refina por role dentro da página).

### 5.5 Sidebar — `src/layout/AppSidebar.tsx`

1. Adicionar item ao array `navItems`, entre `"Armazenamento"` e `"Configurações"` (ou onde fizer mais sentido visualmente):

```ts
{
  icon: <Icon width="24px" icon="mdi:credit-card-outline" />,
  name: "Finanças",
  subItems: [
    { name: "Credenciais", path: "/financas/credenciais" },
  ],
},
```

2. Dentro de `filteredNavItems` (`useMemo`), no bloco `.filter((item) => { if (user?.tipo) { ... } })`, adicionar (reaproveitando a variável `isFpp` já calculada logo acima nesse mesmo `useMemo`):

```ts
// Finanças: apenas admin FPP ou academia
if (item.name === "Finanças") {
  return (user.tipo === "admin" && isFpp) || user.tipo === "academia";
}
```

Isso garante que admin `adm`/`gerente` e estudante **não vejam** o item no menu (a proteção de URL direta fica a cargo do componente, ver 5.6.2).

### 5.6 Estrutura de páginas

Seguir o padrão do grupo `gerenciamento/` (layout com breadcrumb + `page.tsx` fino delegando a um painel em `src/components/paineis/`).

#### 5.6.1 `src/app/(painel)/financas/layout.tsx` (novo arquivo)

Mesma estrutura de `src/app/(painel)/gerenciamento/layout.tsx`, adaptando o mapa de títulos:

```tsx
// src/app/(painel)/financas/layout.tsx
"use client"

import { usePathname } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

const PAGE_TITLES: Record<string, string> = {
  "/financas/credenciais": "Finanças — Credenciais AppyPay",
};

export default function FinancasLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageTitle = PAGE_TITLES[pathname] ?? "Finanças";

  return (
    <div>
      <PageBreadcrumb pageTitle={pageTitle} />
      <div className="space-y-6">{children}</div>
    </div>
  );
}
```

(Deixar o mapa preparado para crescer com `/financas/cobrancas`, `/financas/qr-codes` em etapas futuras.)

#### 5.6.2 `src/app/(painel)/financas/credenciais/page.tsx` (novo arquivo)

```tsx
// src/app/(painel)/financas/credenciais/page.tsx
import React from "react";
import { Metadata } from "next";
import FinanceiroCredenciaisPainel from "@/components/paineis/FinanceiroCredenciaisPainel";

export const metadata: Metadata = { title: "Finanças — Credenciais" };

export default function FinanceiroCredenciaisPage() {
  return <FinanceiroCredenciaisPainel />;
}
```

#### 5.6.3 `src/components/paineis/FinanceiroCredenciaisPainel.tsx` (novo arquivo — componente principal)

`"use client"`. Seguir o estilo de `CursosPainel.tsx` (mesmos imports-base: `useApi`, `formatApiError`, `Button`, `Icon`, `Alert`, `Modal`, componentes de `ui/table`, `form/input/InputField`, `form/Label`, `form/Select`, `form/SearchableSelect`, `getCookie`/`useUserType`).

**5.6.3.1 Controle de acesso fino (dentro do componente)**

```tsx
const { user, isAdmin, isAcademia, loading } = useUserType();
const isFpp = isAdmin && user?.admin?.role === "fpp";

if (loading) return <LoadingState />; // reaproveitar algum spinner já existente no projeto, se houver, ou um simples

if (!isAcademia && !isFpp) {
  // admin adm/gerente, estudante, ou usuário sem tipo reconhecido
  return <UnauthorizedAccess requiredTypes={["Admin FPP", "Academia"]} />;
}
```

Reaproveitar `src/components/guards/UnauthorizedAccess.tsx` (já existe e já tem o visual padrão do projeto) em vez de criar um componente novo.

**5.6.3.2 Modelo de contexto**

- **Se `isAcademia`**: contexto fixo. `contextoTipo = 'academia'`, `codigoAcademia = user.academia?.codigo_academia`. Nenhum seletor de contexto é exibido. Chamar `financeiroService.listarCredenciais()` sem parâmetros (o backend já força o próprio contexto).
- **Se `isFpp`**: exibir um seletor de contexto no topo da página:
  - Toggle/Radio: **"Spuri (Global)"** vs **"Academia"**.
  - Quando "Academia" selecionado: exibir `SearchableSelect` alimentado por `consultasService.listarAcademias({ status: 'ativo' })` (usar `academia.codigo_academia` como `value` e `` `${academia.nome} (${academia.codigo_academia})` `` como `label`, no mesmo padrão de `CadastroSingularForm.tsx`).
  - Também oferecer um estado inicial **"Todas"** (sem filtro), que chama `financeiroService.listarCredenciais()` sem query e mostra a tabela completa (pode conter `spuri` + várias academias) — é a visão "painel geral" do admin FPP.
  - Ao mudar o seletor, refazer a chamada de listagem com os `params` correspondentes.

**5.6.3.3 Listagem**

Tabela (`Table`/`TableHeader`/`TableBody`/`TableRow`/`TableCell`) com colunas:

| Coluna | Conteúdo |
|---|---|
| Contexto | Badge "Spuri" ou "Academia" + `codigo_academia` quando aplicável |
| Ambiente | Badge `test` (cor neutra/âmbar) ou `production` (cor verde/vermelha — destaque por ser produção real) |
| Client ID | `client_id_mask` |
| Resource | `resource_mask` |
| Método GPO | `gpo_payment_method_mask` |
| Método REF | `ref_payment_method_mask` |
| Webhook | `webhook_auth_type` (`Basic Auth` / `API Key`) |
| Atualizado em | `updated_at` formatado (usar util de data já existente no projeto, ex. `Intl.DateTimeFormat('pt-AO')` ou o helper que outras páginas já usam — verificar `src/lib/utils` antes de reinventar) |
| Ações | Botão "Editar" (abre modal em modo edição com aquele `id`) |

**Estado vazio:** quando a lista (já filtrada pelo contexto ativo) estiver vazia, mostrar um card com ícone, texto "Nenhuma credencial configurada para este contexto." e botão "Configurar credencial" que abre o modal em modo criação.

Para `isAcademia`, como só pode existir 0 ou 1 credencial, considere não usar tabela e sim um card único (criação) ou um card de resumo com botão "Editar credencial" (edição) — mais amigável que uma tabela de 1 linha. Fica a critério de implementação, mas mantenha a mesma lógica de dados.

**5.6.3.4 Modal de criação/edição** (`Modal` de `src/components/ui/modal`)

Campos do formulário (nesta ordem):

1. **Aviso fixo no topo do modal quando em modo edição:**
   > "Por segurança, a AppyPay não devolve os valores atuais dos campos sensíveis. Preencha novamente **todos os campos abaixo** para atualizar esta credencial — os valores mascarados atuais continuam visíveis na tabela até a atualização ser concluída."
2. `Client ID` * — `InputField` texto.
3. `Client Secret` * — `InputField` `type="password"` com botão de alternância mostrar/ocultar (ícone de olho, mesmo padrão visual de outros campos de senha do projeto — conferir `src/components/form/form-elements/InputStates.tsx` ou o campo de senha usado em `configuracoes/seguranca` para reuso de padrão visual).
4. `Resource` * — `InputField` texto, com `hint` explicativo: "ID ou URL do resource/recurso fornecido pela AppyPay."
5. `Método de pagamento GPO` * — `InputField` texto, `hint`: "Identificador do método GPO configurado na AppyPay."
6. `Método de pagamento REF` * — `InputField` texto, `hint`: "Identificador do método REF configurado na AppyPay."
7. `Autenticação do Webhook` * — `Select` com opções `Basic Auth` (`basic`) / `API Key` (`api_key`).
8. `Usuário do Webhook` — `InputField` texto, **obrigatório somente se `webhook_auth_type === 'basic'`**; ocultar/desabilitar o campo quando `api_key` estiver selecionado.
9. `Segredo do Webhook` * — `InputField` `type="password"` com alternância mostrar/ocultar, sempre obrigatório.

Validação client-side antes de habilitar o botão "Salvar" (bloquear submit se falhar, com mensagens inline por campo usando a prop `error`/`hint` do `InputField`):

- Todos os campos marcados com `*` não podem estar vazios (após `trim()`).
- Se `webhook_auth_type === 'basic'` → `webhook_username` também obrigatório.

Ao submeter:

- **Modo criação** → `financeiroService.criarCredencial({ contexto_tipo, codigo_academia?, ...camposDoForm })`.
- **Modo edição** → `financeiroService.atualizarCredencial(id, { contexto_tipo, codigo_academia?, ...camposDoForm })`.
- `contexto_tipo`/`codigo_academia` vêm do estado de contexto da página (5.6.3.2), **nunca** de um campo livre do formulário.
- Em sucesso: `Alert` de sucesso ("Credencial configurada com sucesso." / "Credencial atualizada com sucesso."), fechar modal, **limpar todo o estado do formulário (inclusive campos de segredo) da memória**, recarregar a listagem do contexto ativo.
- Em erro: manter modal aberto, mostrar `Alert` de erro com `formatApiError(err, 'Não foi possível salvar a credencial.')`, mapear os casos especiais da tabela da seção 4.5 quando aplicável (`err instanceof ApiError && err.status === 409/503/...`).

**5.6.3.5 Segurança de UI (obrigatório)**

- Nunca fazer `console.log` de `client_secret`/`webhook_secret`/valores de formulário completos.
- Nunca persistir os campos sensíveis em cookie, `localStorage` ou qualquer storage — apenas `useState` local do componente/modal.
- Ao fechar o modal (cancelar ou depois de sucesso), resetar o estado do formulário (não deixar segredo digitado "sobrando" na memória do componente pai).
- Nunca exibir `client_secret`/`webhook_secret` de volta na tela — somente os campos `*_mask` retornados pela API.

---

## 6. Checklist de aceite (QA manual)

- [ ] Usuário `academia` vê "Finanças ▸ Credenciais" no menu; usuário `admin` com `role="adm"` ou `"gerente"` e usuário `estudante` **não veem** o item.
- [ ] Acesso direto à URL `/financas/credenciais` por admin `adm`/`gerente`/estudante autenticado é bloqueado com mensagem de acesso negado (não quebra a página, não expõe dados).
- [ ] Usuário não autenticado é redirecionado (mesmo comportamento das demais rotas protegidas).
- [ ] Academia sem credencial configurada vê estado vazio + consegue criar a própria (POST, `contexto_tipo=academia` implícito, sem poder escolher outro código de academia).
- [ ] Academia com credencial já configurada consegue editar (PUT) e reenviar todos os campos; a listagem reflete o novo `updated_at` após sucesso.
- [ ] Admin FPP consegue alternar entre "Spuri", "Academia específica" (com busca) e "Todas", e a tabela/listagem reflete corretamente cada filtro.
- [ ] Admin FPP consegue criar credencial `contexto_tipo=spuri` e `contexto_tipo=academia` (escolhendo a academia via busca).
- [ ] Campos obrigatórios bloqueiam o submit com mensagem clara quando vazios.
- [ ] Alternar `webhook_auth_type` entre `basic`/`api_key` ajusta corretamente a obrigatoriedade do campo `webhook_username`.
- [ ] Erros `400/403/404/409/503/500` simulados (ex. via mock/backend de teste) mostram mensagens compatíveis com a tabela da seção 4.5.
- [ ] Nenhum segredo (`client_secret`, `webhook_secret`) aparece em nenhum momento fora do próprio campo de senha do formulário (nem na tabela, nem em `console`, nem após reabrir o modal de edição).
- [ ] `npm run lint` (ou o script equivalente do projeto) passa sem novos erros nos arquivos criados/alterados.

---

## 7. Arquivos a criar/alterar (resumo)

**Criar:**
- `src/app/(painel)/financas/layout.tsx`
- `src/app/(painel)/financas/credenciais/page.tsx`
- `src/components/paineis/FinanceiroCredenciaisPainel.tsx`

**Alterar:**
- `src/types/api.ts` — novos tipos financeiros (seção 5.1)
- `src/lib/api/services.ts` — `financeiroService` (seção 5.2)
- `src/lib/api/index.ts` — exports novos (seção 5.3)
- `src/lib/route-guards.ts` — nova entrada em `ROUTE_PERMISSIONS` (seção 5.4)
- `src/layout/AppSidebar.tsx` — novo item "Finanças" + filtro por FPP/academia (seção 5.5)

Nenhuma dependência nova deve ser adicionada ao `package.json`; usar apenas componentes/hook/serviços já existentes no projeto, conforme mapeado na seção 3.
