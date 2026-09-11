---
criado: 11-09-2026
origem: Fredy + Claude (depuração completa do código, front-end e back-end)
status: pendente de execução pelo Codex
tipo: correção de segurança / privacidade (spuripainel)
prioridade: BAIXA — hardening preventivo; já validado com tsc/eslint reais do projeto, zero erros
---

# Sanitizar mensagem de retry de job para usuários não-administradores + auditoria de mensagens técnicas no frontend

### Documento de execução para o Codex (localizado, escrito e já validado pelo Claude)

> **Este documento já contém a única mudança de código necessária no frontend para esta tarefa.** Você
> (Codex) não precisa investigar nada — aplique o "localizar/substituir" da seção 2, exatamente como
> está, e rode a seção 3 para confirmar. Já rodei `npm install` + `npx tsc --noEmit` + `npx eslint`
> reais deste projeto sobre este exato patch, com zero erros — está na seção 4.

## 0. Contexto — por que este documento existe

Fredy relatou que `/instituicoes/cadastrar` mostrava uma mensagem técnica (rota + verbo HTTP) ao
cadastrar uma academia, e pediu (a) a remoção desse caso específico e (b) uma auditoria de todo o
frontend para garantir que não existe "algo do gênero" em nenhum outro lugar.

**O caso específico (a) já estava corrigido no frontend** antes deste documento existir — um commit
separado, já mesclado hoje (PR "Hide technical API messages from non-admin users and simplify public
signup message"), parou de exibir o campo `aviso` em `InstituicaoCadastroPublico.tsx` e adicionou
sanitização automática de mensagens de erro HTTP em `src/lib/api/client.ts`
(`isTechnicalApiMessage`/`sanitizeApiMessageForCurrentUser`, aplicada dentro do construtor de
`ApiError` — por isso qualquer código que capture um erro como `ApiError` e leia `.message` já recebe a
versão sanitizada automaticamente, sem precisar chamar nada explicitamente). **Não repita esse
trabalho.**

A causa raiz do texto técnico ainda continuar aparecendo é que o **backend** monta esse texto dentro do
corpo de respostas de **sucesso** (200/201/202) — que nunca passam pela sanitização de erro do
frontend. Isso está sendo corrigido em paralelo no repositório `spuri-backend`, no documento de tarefa
"Remover vazamento de mensagens técnicas em respostas de sucesso (spuri-backend)". **Este documento
(frontend) não depende daquele para ser aplicado** — a única mudança de código daqui é independente —
mas o vazamento relatado por Fredy só desaparece de verdade quando os dois forem aplicados.

Fiz a auditoria (b) em todo o frontend (`src/**/*.ts`, `src/**/*.tsx`). O resultado, com o único ponto
que precisa de mudança, está nas seções 1 e 2.

## 1. Resultado da auditoria — o que já está seguro e o que precisa de correção

Busquei em todo o repositório por: leitura direta de campos de resposta de API com nomes como `.aviso`,
`.message`, `.info` fora do caminho de erro; qualquer `catch` que exiba `err.message`/`error.message`
sem passar pelo `ApiError`/`formatApiError`; e qualquer `fetch()` direto (fora de
`src/lib/api/client.ts`) que possa expor texto de resposta não sanitizado.

**Já seguro, sem necessidade de mudança:**

- `InstituicaoCadastroPublico.tsx` (o caso relatado) — já corrigido, confirmado por leitura do arquivo
  atual: não lê mais `resultado.aviso`, mostra só texto fixo próprio.
- Todos os formulários de cadastro em massa (`CadastroMassaForm.tsx`, `LancamentoNotasForm.tsx`,
  `LancamentoFaltasForm.tsx` e o respectivo `BatchProgressScreen.tsx`): a mensagem de aviso de submissão
  é composta a partir de `err?.message` de um `ApiError` — já sanitizado automaticamente pelo mecanismo
  citado no contexto. Não precisa de mudança.
- `src/lib/utils/email.ts` e as rotas internas `src/app/api/verificar-email/*`,
  `src/app/api/recuperar-senha/*`: não chamam o backend Go para este fluxo (usam um serviço de e-mail
  próprio do Next.js) — fora do padrão de vazamento auditado aqui.
- `src/app/(painel)/testes/PageContent.tsx`: é, por design, um console de teste de API cru — só existe
  e só é visível quando `isTestesPageEnabled()` (ambientes `test`/`dev`) **e** o usuário é `academia`,
  nunca em produção. Mostrar detalhe técnico é o propósito dessa tela; não é um vazamento.
- `TurmasPainel.tsx` (polling de progresso de job, linha ~100): em caso de erro, faz `continue` — não
  exibe nada ao usuário. Seguro.

**Precisa de correção — `src/components/header/NotificationDropdown.tsx`:**

A função `retryFailedViaApi` (reenvio de itens com falha de um job, rota `POST /jobs/:id/retry-failed`,
que exige `user_type=academia` — **não-admin**) usa um `fetch()` direto, sem passar pelo cliente
compartilhado `src/lib/api/client.ts`. Isso significa que o texto do erro (`data?.message`,
`data?.error`, ou até o corpo bruto da resposta em `data?._raw`, quando a resposta não é um JSON válido)
**não passa pela sanitização automática do `ApiError`**, e o resultado é exibido diretamente para a
academia (estado `retryError`, renderizado em `<p>✗ {retryError}</p>`).

Conferi o backend (`internal/handlers/job_handlers.go`, `RetryFailedJob`): hoje, nenhuma das mensagens
de erro possíveis nesse endpoint contém texto técnico (usam `RespondWithValidationError`,
`RespondWithForbiddenError`, `RespondWithInternalError`, todas com texto genérico). **Ou seja, hoje não
há vazamento ativo aqui** — mas o mecanismo de proteção está ausente, então qualquer mudança futura no
backend desse endpoint específico (ou uma resposta malformada de um proxy/gateway intermediário)
passaria direto para a tela da academia sem filtro nenhum. É uma correção preventiva, de mesma natureza
do que já existe no resto do app — não uma correção de um vazamento visível hoje.

## 2. Localizar/substituir

**Arquivo:** `src/components/header/NotificationDropdown.tsx`

### 2.1 Import novo

**Localizar:**

```tsx
import {
  jobApiService,
  subscribeToJobStream,
  tokenStorage,
  type JobStreamEvent,
  type JobSummary,
  type JobDetail,
  type JobItemResult,
} from "@/lib/api";
```

**Substituir por:**

```tsx
import {
  jobApiService,
  subscribeToJobStream,
  tokenStorage,
  type JobStreamEvent,
  type JobSummary,
  type JobDetail,
  type JobItemResult,
} from "@/lib/api";
import { sanitizeApiMessageForCurrentUser } from "@/lib/api/client";
```

(`sanitizeApiMessageForCurrentUser` não é reexportada pelo barrel `@/lib/api`, por isso o import
separado direto de `@/lib/api/client`.)

### 2.2 Primeiro ponto de exposição — resposta HTTP com erro

**Localizar:**

```tsx
  if (!r.ok) {
    const msg =
      data?.message ||
      data?.error ||
      data?._raw ||
      `Erro HTTP ${r.status} ao submeter retry`;
    throw new Error(msg);
  }
```

**Substituir por:**

```tsx
  if (!r.ok) {
    const msg =
      data?.message ||
      data?.error ||
      data?._raw ||
      `Erro HTTP ${r.status} ao submeter retry`;
    throw new Error(sanitizeApiMessageForCurrentUser(msg));
  }
```

### 2.3 Segundo ponto de exposição — resposta sem `retry_job_id`

**Localizar:**

```tsx
  if (!retryJobId) {
    // Job pode ter sido criado mas sem ID na resposta — avisa sem lançar erro fatal
    throw new Error(
      data?.message ||
      data?.error ||
      data?._raw ||
      "Retry submetido, mas o servidor não devolveu um job_id. Verifique as notificações."
    );
  }
```

**Substituir por:**

```tsx
  if (!retryJobId) {
    // Job pode ter sido criado mas sem ID na resposta — avisa sem lançar erro fatal
    throw new Error(
      sanitizeApiMessageForCurrentUser(
        data?.message ||
        data?.error ||
        data?._raw ||
        "Retry submetido, mas o servidor não devolveu um job_id. Verifique as notificações."
      )
    );
  }
```

Nada mais neste arquivo muda. `sanitizeApiMessageForCurrentUser` já resolve sozinha se o usuário atual é
admin (nesse caso devolve a mensagem original, sem alterar nada) ou não (nesse caso devolve uma mensagem
genérica seguindo o mesmo padrão já usado no resto do app) — não precisa de nenhuma lógica adicional de
verificação de papel/role aqui.

## 3. Testes obrigatórios

1. `npx tsc --noEmit` na raiz do repositório.
2. `npx eslint src/components/header/NotificationDropdown.tsx` (ou `npm run lint` no projeto inteiro).

Ambos já rodei eu mesmo sobre este exato patch — veja seção 4. Rode de novo no seu ambiente como
segunda confirmação independente; é rápido e não depende de rede além do que `npm install` já buscou.

## 4. O que eu (Claude) já validei

Apliquei este patch exato (as três mudanças da seção 2) numa cópia local real do repositório
`spuripainel` e rodei, com as ferramentas reais do próprio projeto:

- `npm install` — 803 pacotes, sem erro de instalação.
- `npx tsc --noEmit` na raiz do projeto inteiro (não só no arquivo alterado) — **zero erros**.
- `npx eslint src/components/header/NotificationDropdown.tsx` — **zero problemas**, nenhum novo.
- Conferi o `git diff` resultante linha a linha — só as quatro linhas descritas na seção 2 mudam (1
  import novo + 2 chamadas envolvidas por `sanitizeApiMessageForCurrentUser`); nada mais no arquivo foi
  tocado.

Não há nada pendente de validação de ambiente aqui (este documento não usa Postgres, Docker, nem nada
que dependa de rede além do `npm install` normal do projeto) — a seção 3 é só uma segunda confirmação
independente da sua parte.

## 5. Fora de escopo — não implemente nesta tarefa

- Qualquer mudança em `InstituicaoCadastroPublico.tsx`, `CadastroSingularForm.tsx`,
  `CadastroMassaForm.tsx`, `LancamentoNotasForm.tsx`, `LancamentoFaltasForm.tsx`,
  `BatchProgressScreen.tsx`, `TurmasPainel.tsx` ou `src/lib/api/client.ts` — todos já auditados e já
  seguros (seção 1); mexer neles não faz parte desta tarefa.
- Refatorar `retryFailedViaApi`/`safeParseJson`/`hideJobFromSse` para usar o cliente `api.post`/`api.delete`
  compartilhado em vez de `fetch()` direto — seria uma limpeza estrutural válida, mas é uma mudança
  bem maior (mudaria o formato de erro tratado, o parsing de resposta malformada, etc.) do que o
  necessário para fechar o vazamento; a correção mínima e já validada é a da seção 2.
- Qualquer mudança no repositório `spuri-backend` — está no outro documento de tarefa
  ("Remover vazamento de mensagens técnicas em respostas de sucesso (spuri-backend)").

## 6. Critérios de aceite

- [ ] As três mudanças da seção 2 foram aplicadas exatamente como especificado, e só neste arquivo.
- [ ] `npx tsc --noEmit` passa sem erros novos.
- [ ] `npx eslint` no arquivo alterado passa sem problemas novos.
- [ ] Nenhum arquivo listado na seção 5 foi alterado.

## 7. Procedimento de conclusão

1. Aplique a seção 2.
2. Rode a seção 3 e confirme que os dois comandos passam.
3. Confira o checklist da seção 6.
4. Não faça commit/push nem abra pull request — deixe as alterações prontas no working tree para o
   Fredy revisar.
5. Quando Fredy confirmar, atualize o front matter deste documento para `status: feito` e acrescente
   "(feito)" ao título — mesma convenção já usada nos demais arquivos de `src/docs/`. Isso só depois da
   confirmação, não como parte da execução automática.
