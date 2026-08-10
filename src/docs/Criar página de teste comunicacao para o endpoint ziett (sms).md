---
criado: 2026-08-10 00:00
origem: solicitação do usuário
status: pendente
---

# Criar página `/comunicacao` (frontend) para testar o endpoint Ziett (SMS) (pendente)

## Prompt recomendado para executar a atualização

Implemente, no repositório `spuripainel`, uma página nova em `/comunicacao` contendo um formulário que chama diretamente o endpoint isolado do backend `POST /integracoes/ziett/mensagens/teste` (ver `docs/Lista de Tarefas/18 - Criar rota isolada de teste de envio de mensagem via Ziett (SMS).md` no repositório `spuri-backend`, já implementado). Esta página é **exclusivamente uma ferramenta de teste manual** para o time interno validar a conectividade com a Ziett a partir da interface — não é uma funcionalidade de produto para os clientes (academias/estudantes) e **não pode ficar acessível em ambiente de produção**. Siga rigorosamente o padrão já estabelecido pela página `/testes` já existente (`src/app/(painel)/testes/page.tsx` + `PageContent.tsx`): mesmo mecanismo de bloqueio por ambiente, mesmo estilo de componente auto-contido, sem introduzir nenhuma dependência nova de `src/types/` ou `src/lib/api/services/`. A página deve aparecer no menu lateral **apenas** em ambiente de teste/desenvolvimento e **apenas** para administradores FPP (mesmo padrão de visibilidade já usado para o item "Testes" em `AppSidebar.tsx`, adaptado para a role correta). Toda a lógica específica deste endpoint de teste (tipos do payload/resposta, chamada HTTP, validação, estado do formulário) deve viver exclusivamente dentro do arquivo do componente da própria página, para que a funcionalidade inteira possa ser removida no futuro apagando apenas a pasta `src/app/(painel)/comunicacao/` e revertendo as pequenas entradas adicionadas em `src/lib/route-guards.ts` e `src/layout/AppSidebar.tsx`.

## Contexto

O backend já expõe `POST /integracoes/ziett/mensagens/teste`, uma rota isolada (sem Event Sourcing, sem ledger) que exige autenticação de admin FPP e envia um SMS de teste através da Ziett. Falta apenas uma interface simples para preencher esse payload manualmente sem precisar de `curl`/Postman.

O repositório `spuripainel` já possui um precedente direto para páginas internas de teste, restritas a ambientes não-produtivos: a página `/testes` (`src/app/(painel)/testes/`). Ela usa `isTestesPageEnabled()` (`src/lib/app-env.ts`) para se auto-desabilitar fora de ambientes de teste/desenvolvimento, e mantém toda a lógica de chamada à API auto-contida no próprio arquivo do componente, sem depender de `src/lib/api/services/`. A página `/comunicacao` desta tarefa deve seguir exatamente esse mesmo padrão.

**Diferença importante em relação a `/testes`:** `/testes` é restrita a usuários do tipo `academia`; `/comunicacao` deve ser restrita a administradores **FPP** (`tipo === "admin"` e `admin.role === "fpp"`), pelo mesmo motivo de exigência do backend — dispara SMS real com custo.

## Resumo executivo

| Item | Decisão | Resultado esperado |
| --- | --- | --- |
| Rota nova | `/comunicacao` → `src/app/(painel)/comunicacao/` | Duas páginas: `page.tsx` (gate de ambiente) + `PageContent.tsx` (formulário) |
| Disponibilidade | Bloqueada fora de teste/desenvolvimento | Reutiliza `isTestesPageEnabled()` já existente — nenhuma nova variável de ambiente no frontend |
| Autorização | Apenas admin FPP | Checagem em `route-guards.ts` (nível `admin`) + checagem fina de `role === "fpp"` dentro do próprio componente |
| Isolamento de código | Tudo específico do endpoint de teste fica no arquivo do componente | Nenhuma alteração em `src/types/*` nem em `src/lib/api/services/*` |
| Navegação | Item novo em `AppSidebar.tsx`, visível apenas em ambiente de teste **e** apenas para admin FPP | Menu lateral reflete exatamente a mesma restrição de acesso da página |
| Chamada HTTP | `fetch` local dentro do componente (mesmo padrão de `/testes/PageContent.tsx`) | Não usa `src/lib/api/client.ts` nem cria um novo arquivo de serviço |

---

# 1. Bloqueio de ambiente (não disponível em produção)

## Objetivo

Garantir que `/comunicacao` funcione exatamente como `/testes`: inacessível fora de ambientes de teste/desenvolvimento, com dupla camada de proteção (nível de rota + nível de página).

## Regra de negócio

1. Reutilizar a função já existente `isTestesPageEnabled()` de `@/lib/app-env` — **não criar uma nova função equivalente**, não modificar `src/lib/app-env.ts`. O nome da função é específico da página `/testes` apenas por herança histórica, mas seu comportamento (checar `ENV` contra `['test', 'teste', 'development', 'desenvolvimento', 'dev']`) é genérico o suficiente para reaproveitar aqui.
2. Em `src/app/(painel)/comunicacao/page.tsx`, replicar exatamente o padrão de `src/app/(painel)/testes/page.tsx`: se `!isTestesPageEnabled()`, `redirect("/painel")` antes de renderizar `PageContent`.
3. Em `src/lib/route-guards.ts` (arquivo central de permissões de rota, usado por `RouteGuard` para **todas** as páginas do grupo `(painel)`, portanto não é "tipos e serviços" do domínio — é infraestrutura de roteamento compartilhada e obrigatória para qualquer página nova):
   - Adicionar uma entrada em `ROUTE_PERMISSIONS` para `/comunicacao`, com `allowedTypes: ['admin']` e `redirectIfUnauthorized: '/painel'` (mesmo padrão de `/armazenamento`).
   - Estender a checagem hoje hardcoded para `/testes` dentro de `checkRoutePermission()`:
     ```ts
     if (normalizedPath === '/testes' && !isTestesPageEnabled()) {
       return { allowed: false, redirectTo: '/painel' };
     }
     ```
     para também cobrir `/comunicacao` (ex.: `if ((normalizedPath === '/testes' || normalizedPath === '/comunicacao') && !isTestesPageEnabled())`), preservando o comportamento existente para `/testes` sem nenhuma outra alteração nessa função.
4. Esta é, junto com a alteração em `src/layout/AppSidebar.tsx` descrita na seção 3, a **única** alteração permitida fora da pasta `src/app/(painel)/comunicacao/`. Nenhum outro arquivo do repositório deve ser tocado.

---

# 2. Página e componente

## Objetivo

Criar a rota `/comunicacao` com um formulário funcional para o payload da rota de teste da Ziett.

## Escopo obrigatório

### 2.1 Arquivos

- `src/app/(painel)/comunicacao/page.tsx`: componente de servidor, `export const metadata` com título (ex.: `"Comunicação (Teste Ziett)"`), aplica o redirect da seção 1, item 2, e renderiza `<PageContent />`. Espelhar a estrutura de `src/app/(painel)/testes/page.tsx`.
- `src/app/(painel)/comunicacao/PageContent.tsx`: `"use client"`, componente único e auto-contido com todo o resto descrito abaixo.
- Não criar nenhum outro arquivo (sem `layout.tsx` próprio, sem hooks separados, sem componentes extraídos para outras pastas) — mesmo critério de simplicidade de `/testes`, que não usa `layout.tsx` nem breadcrumb dedicados.

### 2.2 Tipos locais (dentro de `PageContent.tsx`, não em `src/types/`)

Definir localmente, apenas neste arquivo:

```ts
interface EnviarMensagemZiettPayload {
  remitter_id: string;
  target_e164: string;
  content: string;
}

interface EnviarMensagemZiettSuccessResponse {
  message: string;
  message_id: string;
  target_e164: string;
  channel_type: "SMS";
}

interface EnviarMensagemZiettErrorResponse {
  error: string;
  message: string;
  request_id: string;
  ziett_code?: string;
  ziett_trace_id?: string;
  details?: { field?: string; code?: string; message?: string }[];
}
```

Estes tipos existem exclusivamente para este teste manual e não devem ser exportados nem movidos para `src/types/api.ts`.

### 2.3 Autenticação e leitura do usuário atual

Replicar o padrão já usado em `src/app/(painel)/testes/PageContent.tsx`:

- Ler o token via `tokenStorage.get()` (importado de `@/lib/api`, já existente — reutilização de utilitário genérico, não é criação de novo serviço).
- Ler o cookie `"user"` via `getCookie("user")` (importado de `@/lib/utils/cookies`, já existente) e fazer `JSON.parse` para o tipo já existente `MeuPerfilResponse` (importado de `@/types/api` — apenas leitura de um tipo já exportado, nenhuma alteração nesse arquivo).
- Se não houver token/cookie: exibir mensagem de "sem sessão ativa, faça login".
- Se `parsed.tipo !== "admin" || parsed.admin?.role !== "fpp"`: **não renderizar o formulário**; exibir mensagem inline informando que a página é exclusiva para administradores FPP (mensagem simples de texto é suficiente; opcionalmente reutilizar o componente já existente `UnauthorizedAccess` de `src/components/guards/UnauthorizedAccess.tsx`, sem modificá-lo).

Esta checagem no componente é um reforço de UX — a autorização real continua sendo feita pelo backend (`RequireFPP()`); não depender apenas dela.

### 2.4 Formulário

Campos, todos controlados por `useState` local:

| Campo | Input | Validação client-side (antes de habilitar o botão de envio) |
| --- | --- | --- |
| `remitter_id` | texto | formato UUID (regex simples), obrigatório |
| `target_e164` | texto | exatamente 9 dígitos numéricos, iniciados em `9`; incluir texto de ajuda explícito: *"Apenas o número nacional, sem 0 inicial e sem +244. Ex.: 923456789"* |
| `content` | textarea | obrigatório, não vazio, máximo 1600 caracteres; exibir contador de caracteres (`content.length / 1600`) |

Use elementos HTML nativos estilizados com Tailwind (mesmo estilo visual usado em `/testes/PageContent.tsx`), para manter a página com o mínimo de dependências possível. Se preferir usar os componentes de formulário já existentes (`@/components/form/input/InputField`, `@/components/form/input/TextArea`, `@/components/ui/button/Button`, `@/components/ui/alert/Alert`), isso também é aceitável — são componentes de UI genéricos, não específicos de domínio — mas não é obrigatório.

### 2.5 Envio

Ao submeter:

1. Validar os três campos localmente; se algum for inválido, não enviar e mostrar o erro correspondente próximo ao campo.
2. Montar a URL a partir de `process.env.NEXT_PUBLIC_API_URL` (mesma lógica de normalização já usada em `/testes/PageContent.tsx`, função `apiUrl()` — pode ser copiada/adaptada localmente, sem importar `getApiBaseUrl` de `src/lib/api/client.ts`, para manter este arquivo 100% independente).
3. Fazer `fetch(url + "/integracoes/ziett/mensagens/teste", { method: "POST", headers: { "Content-Type": "application/json", Authorization: \`Bearer ${token}\` }, body: JSON.stringify({ remitter_id, target_e164, content }) })`. **Não enviar `channel_type`** — o backend fixa esse valor.
4. Estado de carregamento (`enviando`) desabilitando o botão durante a requisição.
5. Em sucesso (`202`): mostrar `message`, `message_id` e o `target_e164` formatado que o backend devolveu (útil para conferir se a formatação `+244XXXXXXXXX` ficou correta).
6. Em erro: mostrar `message` do envelope de erro; se presentes, mostrar também `ziett_code` e `ziett_trace_id` (campos específicos de erro da Ziett, úteis para depuração); se `details` vier preenchido, listar cada `details[].message`.
7. Opcional (sugestão de UX, não obrigatório): manter um pequeno histórico das últimas tentativas na própria tela (lista simples em estado local), no mesmo espírito do painel de logs de `/testes/PageContent.tsx`, sem persistir nada em storage.

---

# 3. Item no menu lateral (`AppSidebar.tsx`)

## Objetivo

Adicionar "Comunicação" ao menu lateral, visível **apenas** quando `isTestesPageEnabled()` for verdadeiro **e** apenas para o usuário logado ser admin FPP — exatamente a mesma restrição de acesso da própria página (seções 1 e 2.3), refletida na navegação.

## Escopo obrigatório

`src/layout/AppSidebar.tsx` é o único arquivo de layout/navegação tocado por esta tarefa. É infraestrutura de UI compartilhada (assim como `route-guards.ts` é infraestrutura de rota) — não é "tipos e serviços" de domínio, e o próprio item "Testes" já existente segue este mesmo padrão de alteração.

1. Adicionar um novo objeto ao array `navItems` (mesmo arquivo, próximo ao item `"Testes"` já existente), por exemplo:
   ```tsx
   {
     icon: <Icon width="24px" icon="mdi:message-text-outline" />,
     name: "Comunicação",
     path: "/comunicacao",
   },
   ```
   (o ícone exato é livre — usar um ícone do conjunto `mdi:*` já utilizado nos demais itens, relacionado a mensagens/comunicação.)

2. Estender o filtro de ambiente já existente em `filteredNavItems` (hoje restrito a `/testes`) para também remover `/comunicacao` fora de ambiente de teste:
   ```tsx
   const environmentNavItems = isTestesPageEnabled()
     ? navItems
     : navItems.filter((item) => item.path !== "/testes" && item.path !== "/comunicacao");
   ```

3. Adicionar uma nova checagem de role dentro do `.filter((item) => { if (user?.tipo) { ... } ... })` já existente, análoga à checagem já existente para `/testes` (`return user.tipo === "academia"`), mas restrita a admin FPP:
   ```tsx
   // Comunicação: apenas admin FPP
   if (item.path === "/comunicacao") {
     return user.tipo === "admin" && user?.admin?.role === "fpp";
   }
   ```
   Posicionar este bloco junto aos demais `if (item.path === ...)`/`if (item.name === ...)` já existentes na mesma função, sem alterar a lógica de nenhum item pré-existente.

4. Não alterar nenhuma outra parte de `AppSidebar.tsx` (ordem dos demais itens, ícones existentes, lógica de submenu, responsividade, etc.).

---

# 4. Fora de escopo

- Qualquer alteração em `src/types/*` — nenhum tipo desta tarefa deve ser exportado ou movido para lá.
- Qualquer alteração em `src/lib/api/services/*` ou `src/lib/api/client.ts` — nenhum novo arquivo de serviço, nenhuma nova função exportada de cliente HTTP genérico.
- Qualquer alteração em `src/lib/app-env.ts` — a função `isTestesPageEnabled()` é reaproveitada como está.
- Persistência de histórico de mensagens enviadas (banco de dados, storage local, cookies) além do estado em memória da própria página.
- Internacionalização, testes E2E automatizados (Cypress/Playwright) ou testes de snapshot — fora do escopo desta tarefa pontual de ferramenta interna.
- Qualquer alteração em páginas, componentes ou fluxos relacionados à matrícula/inscrição de estudante numa academia.

# Critérios de aceite

A tarefa só deve ser considerada concluída quando:

1. `/comunicacao` existir e renderizar o formulário apenas quando `isTestesPageEnabled()` for verdadeiro (testar localmente com `ENV=development` e com `ENV=production`, confirmando o redirect para `/painel` neste último caso);
2. `/comunicacao` redirecionar usuários não autenticados ou não-admin para `/painel`, via `route-guards.ts`;
3. usuários admin que não sejam `fpp` (`adm`, `gerente`) verem a mensagem de acesso restrito em vez do formulário, mesmo estando dentro do grupo `admin` liberado por `route-guards.ts`;
4. o item "Comunicação" aparecer no menu lateral **somente** quando `isTestesPageEnabled()` for verdadeiro **e** o usuário logado for admin FPP — testar as quatro combinações (ambiente de teste/produção × admin FPP/outro tipo de usuário) e confirmar que o item some corretamente em cada caso que não atenda ambas as condições;
5. o formulário validar `remitter_id` (UUID), `target_e164` (9 dígitos, sem `0`/`+244`) e `content` (não vazio, máx. 1600) antes de enviar;
6. o `POST` for feito exatamente para `{NEXT_PUBLIC_API_URL}/integracoes/ziett/mensagens/teste`, sem enviar `channel_type` no payload;
7. sucesso e erro (incluindo `ziett_code`/`ziett_trace_id`) forem exibidos de forma legível na própria página;
8. **nenhum arquivo fora de `src/app/(painel)/comunicacao/` for alterado, exceto `src/lib/route-guards.ts` e `src/layout/AppSidebar.tsx`**, e nesses dois apenas nos pontos descritos nas seções 1 e 3;
9. `src/types/*` e `src/lib/api/services/*` permanecerem sem nenhuma alteração;
10. `npm run lint` e `npm run build` (ou os scripts equivalentes já usados no projeto) rodarem sem erros novos introduzidos por esta tarefa.

## Procedimento de conclusão

Ao finalizar a implementação:

1. Confirmar que a remoção completa da funcionalidade, se necessária no futuro, se resume a: apagar `src/app/(painel)/comunicacao/`, reverter a entrada/condição adicionada em `src/lib/route-guards.ts`, e remover o item "Comunicação" (e as duas condições associadas a ele) de `src/layout/AppSidebar.tsx`.
2. Atualizar o título interno desta tarefa para `# Criar página /comunicacao (frontend) para testar o endpoint Ziett (SMS) (feito)`.
3. Alterar o front matter para `status: feito`.
4. Mover este arquivo para a pasta de tarefas concluídas equivalente, caso o repositório `spuripainel` passe a adotar essa convenção (hoje o repositório ainda não tem uma pasta `docs/Tarefas feitas/` própria, ao contrário do `spuri-backend`).
