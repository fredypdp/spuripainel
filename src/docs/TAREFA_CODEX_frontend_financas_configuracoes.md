# Tarefa para o Codex — Botões de remoção em /financas/configuracoes (spuripainel)

**Autor da implementação:** Claude (orquestrador). Todo o código já foi escrito, revisado
e validado no meu sandbox — `npm install`, `tsc --noEmit` e `eslint .` rodados no
repositório inteiro, mais um smoke test real do servidor Next.js (`next dev`) confirmando
que as duas páginas afetadas renderizam sem erro (HTTP 200, sem crash no servidor).

**Papel do Codex nesta tarefa:** aplicar um patch já pronto e testado. **Não precisa
planejar nada, nem escrever nenhuma linha de UI/UX nova** — só aplicar, conferir e
commitar. Diferente da tarefa anterior do backend, **esta o Codex consegue validar 100%
sozinho** (`npm`/`tsc`/`eslint` não dependem de apt/Docker/psql), então não há parte
alguma que exija "confiar cegamente" no meu resultado — o Codex pode e deve rodar as
mesmas verificações descritas na seção 4.

---

## 0. O que foi pedido e o que foi entregue

Pedido: adicionar à página `/financas/configuracoes` (e à tela de credenciais, ver nota de
design abaixo) botões — ou outra forma de interação — para usar as 4 funcionalidades de
remoção implementadas na tarefa de backend anterior (`8e92c44`):

| Funcionalidade de remoção (backend) | Onde ficou o botão | Componente |
|---|---|---|
| Remover configuração de propina | Tabela "Configurações já feitas" da subtela de Propina | `FinanceiroConfiguracoesPainel.tsx` |
| Remover configuração de taxa de matrícula | Tabela "Configurações já feitas" da subtela de Matrícula | `FinanceiroConfiguracoesPainel.tsx` |
| Remover início de cobrança de um ano letivo | Logo abaixo do formulário "Definir início de cobrança" | `FinanceiroConfiguracoesPainel.tsx` |
| Remover credenciais AppyPay | Coluna "Ações" da tabela de credenciais | `FinanceiroCredenciaisPainel.tsx` (rota `/financas/credenciais`) |

### Nota de design: por que a remoção de credenciais não ficou em `/financas/configuracoes`

`/financas/configuracoes` já tem, hoje, uma frase de aviso apontando para
`/financas/credenciais` como o lugar onde credenciais são geridas ("É obrigatório
configurar as credenciais AppyPay antes... [Configurar credenciais]"). Toda a
criação/edição de credenciais já vive exclusivamente em `/financas/credenciais` — nunca em
`/financas/configuracoes`. Colocar o botão de remover credencial em
`/financas/configuracoes` quebraria essa separação de responsabilidades já estabelecida no
app (duplicaria gestão de credenciais em duas telas). O botão de remover foi colocado na
mesma tabela de credenciais de `/financas/credenciais`, ao lado do botão "Editar" já
existente — é o lugar coerente com o resto do app. As outras 3 funcionalidades (que são
genuinamente parte da tela de configurações) ficaram exatamente em
`/financas/configuracoes`, como pedido.

---

## 1. Como a UX foi desenhada (seguindo os padrões já existentes no módulo financeiro — nada inventado do zero)

Antes de escrever qualquer código, inspecionei os componentes existentes do módulo
financeiro (`FinanceiroConfiguracoesPainel.tsx`, `FinanceiroCredenciaisPainel.tsx`,
`financeiroShared.tsx`) para identificar os padrões já estabelecidos e replicá-los
fielmente:

- **Sem modais/pop-ups.** O módulo financeiro já tem essa convenção explícita (comentário
  no próprio código: *"SubtelaPanel... não é mais modal/pop-up... usado por toda parte do
  módulo financeiro"*). Os botões novos não abrem nenhum modal.
- **Confirmação com `window.confirm`, mesmo padrão já usado no módulo** para a ação
  "Rotacionar segredo do webhook" (`WebhookSecretPanel.handleRotacionar`, em
  `FinanceiroCredenciaisPainel.tsx`) — uma ação de consequência real, mas não uma exclusão
  de dado histórico. Cada texto de confirmação é específico da ação e já explica a
  consequência real (ex.: *"Meses já cobrados não são afetados; a partir de agora, novas
  mensalidades desse escopo ficam sem valor definido até configurar de novo."*) — isso
  comunica a garantia mais importante do backend (event sourcing preserva histórico) direto
  na hora que o usuário decide.
- **Botão `variant="danger"`** — já existe no design system (`Button.tsx`), já usado em
  outras telas do app para ações de exclusão (ex. `BarraLoteCursos`). Consistente
  visualmente com "isto é destrutivo", sem inventar uma nova cor/estilo.
- **Loading e erro por linha/ação**, não um spinner de página inteira — mesmo padrão já
  usado em `CobrancasTable` (`cancelandoId`) e em `WebhookSecretPanel`: um estado local
  guarda qual linha está com a ação em andamento, só o botão daquela linha fica
  desabilitado, as outras linhas continuam usáveis.
- **Mensagem de sucesso/erro no `Alert` já existente no topo da subtela** (`setAlert`),
  igual ao que "Salvar"/"Atualizar" já fazem nessas mesmas telas — nenhuma UI de feedback
  nova foi inventada.
- **Erros já vêm com texto claro do backend** (ex.: *"recurso financeiro não encontrado:
  nenhuma configuração de mensalidade ativa para este escopo"*), que o cliente HTTP já
  propaga via `formatApiError`/`ApiError.message` — não foi necessário mapear
  código-por-código de erro no frontend.
- **Caso especial do início de cobrança:** não existe (nem no backend nem no frontend, hoje)
  uma consulta que diga "existe uma exceção de início de cobrança definida para este ano
  letivo?" — então o botão de remover fica sempre disponível (dado um ano letivo
  selecionado), e um `404` do backend (nada para remover) é tratado como uma informação
  neutra ("já está no padrão"), não como um erro — evita assustar o usuário por clicar em
  algo que, na prática, não tinha efeito nenhum a desfazer.

---

## 2. O que o patch muda, arquivo por arquivo

**`src/types/api.ts`** — 4 interfaces novas, uma por corpo de requisição `DELETE`:
`RemoverFinanceiroCredencialRequest`, `RemoverMensalidadeConfiguracaoRequest`,
`RemoverMesInicioCobrancaRequest`, `RemoverMatriculaConfiguracaoRequest`. Cada uma espelha
exatamente o `struct` Go correspondente do backend (mesmos campos, mesma
obrigatoriedade/opcionalidade).

**`src/lib/api/services.ts`** — 4 funções novas em `financeiroService`:
`removerCredencial`, `removerConfiguracaoMensalidade`, `removerInicioCobranca`,
`removerConfiguracaoMatricula`. Todas usam `api.delete<void, Request>(...)`, que já existia
no cliente HTTP (`client.ts`) e já trata corretamente resposta `204 No Content` (devolve
`{}` tipado como `void` — mesmo padrão que `definirInicioCobranca` já usa hoje para seu
próprio `204`).

**`src/components/paineis/FinanceiroCredenciaisPainel.tsx`**:
- Novo botão "Remover" (`variant="danger"`) ao lado de "Editar", na coluna de ações da
  tabela de credenciais.
- `handleRemover(credencial)`: confirma, chama `removerCredencial`, recarrega a lista,
  mostra sucesso/erro no `Alert` do topo.
- Estado `removendoId` desabilita só o botão da linha em ação.
- *Efeito colateral incidental corrigido:* um `// eslint-disable-next-line
  react-hooks/set-state-in-effect` que já existia no arquivo ficou órfão (o ESLint passou a
  reportá-lo como "unused directive") depois das minhas edições no mesmo componente — é
  removido no patch porque o próprio ESLint confirma que não há mais problema naquele
  ponto. Sem isso, `eslint .` reportaria 1 warning novo introduzido por esta tarefa.

**`src/components/paineis/FinanceiroConfiguracoesPainel.tsx`**:
- `renderConfiguracoesSalvas` (a tabela compartilhada entre a subtela de Propina e a de
  Matrícula) ganhou uma coluna "Ações" com botão "Remover" por linha, mais um parâmetro
  `kind: "mensalidade" | "matricula"` para saber qual `handleRemover*` chamar.
  `handleRemoverMensalidade`/`handleRemoverMatricula` confirmam, chamam o serviço certo,
  recarregam a lista (`reload()`, já existente) e mostram sucesso/erro no `Alert` do topo
  da subtela (mesmo padrão que "Salvar"/"Atualizar" já usam neste mesmo componente).
- `DefinirInicioCobrancaForm` ganhou um bloco abaixo do formulário existente: texto
  explicativo + botão "Remover início de cobrança deste ano letivo", usando o mesmo
  `anoLetivo` já selecionado no formulário. Trata `404` como mensagem informativa (variante
  `info`, que já existe no componente `Alert` do design system), qualquer outro erro como
  mensagem de erro normal.

**Nenhum arquivo de backend, migration, rota ou tipo do Go foi tocado** — é
exclusivamente frontend, consumindo os 4 endpoints `DELETE` que já estão em produção desde
a tarefa anterior.

---

## 3. Como isto foi testado (no meu sandbox)

1. `git clone` limpo de `https://github.com/fredypdp/spuripainel` (branch `main`).
2. `npm install` (803 pacotes, sem erro).
3. Escrevi o código, revisei manualmente cada trecho contra os padrões já existentes no
   próprio arquivo (nunca inventei um padrão novo).
4. `npx tsc --noEmit` no repositório inteiro → **0 erros**.
5. `npx eslint .` no repositório inteiro → **exatamente os mesmos 7 problemas
   pré-existentes** (2 erros, 5 warnings) que já existiam em `main` **antes** desta tarefa,
   em arquivos que não fazem parte desta mudança (`verificar-email/[token]/page.tsx`,
   `SelecaoContextoMassa.tsx`, `Calendar.tsx`, `AppSidebar.tsx`) — confirmei isso rodando o
   eslint duas vezes, uma em `main` sem minhas mudanças e outra com elas, comparando byte a
   byte a saída. **Nenhum erro ou warning novo foi introduzido.**
6. Subi `next dev` de verdade e fiz requisições HTTP reais para `/financas/configuracoes` e
   `/financas/credenciais` → ambas devolvem `200`, sem crash de servidor, sem erro de
   renderização SSR. (O conteúdo em si — incluindo os botões novos — só aparece depois de
   hidratar no navegador com um token de autenticação válido, o que um `curl` simples não
   reproduz; isso é esperado para uma tela autenticada client-side, não é uma limitação do
   teste em si.)
7. Repeti os passos 4 e 5 a partir de **um clone novo do zero com o patch já aplicado**
   (não a partir da minha cópia de trabalho) — mesmo resultado, confirmando que o patch é
   autocontido e aplica de forma idêntica em qualquer checkout limpo de `main`.

---

## 4. Passo a passo EXATO para o Codex

1. Na raiz do repositório `spuripainel` (branch atual):
   ```bash
   git apply financas_configuracoes_botoes_remocao.patch
   ```
   (Testado com `git apply --check` a partir de um clone limpo de `main` — aplica sem
   conflito.)

2. Instalar dependências, se ainda não tiver feito nesta sessão:
   ```bash
   npm install
   ```

3. Validar — **o Codex consegue rodar os três comandos abaixo sozinho, sem nenhuma
   limitação de ambiente**:
   ```bash
   npx tsc --noEmit
   ```
   Deve terminar sem nenhuma saída (0 erros).
   ```bash
   npx eslint .
   ```
   Deve reportar exatamente os mesmos 7 problemas de sempre (2 erros, 5 warnings), todos em
   `verificar-email/[token]/page.tsx`, `SelecaoContextoMassa.tsx`, `Calendar.tsx` e
   `AppSidebar.tsx` — nada nos 4 arquivos que este patch tocou. Se aparecer QUALQUER coisa
   nova em `FinanceiroConfiguracoesPainel.tsx`, `FinanceiroCredenciaisPainel.tsx`,
   `services.ts` ou `types/api.ts`, pare e volte para mim antes de tentar corrigir por
   conta própria.
   ```bash
   git status --short
   ```
   Deve mostrar exatamente estes 4 arquivos modificados, nenhum outro:
   - `src/components/paineis/FinanceiroConfiguracoesPainel.tsx`
   - `src/components/paineis/FinanceiroCredenciaisPainel.tsx`
   - `src/lib/api/services.ts`
   - `src/types/api.ts`

4. (Opcional, mas recomendado se o ambiente do Codex tiver acesso de rede à
   `fonts.googleapis.com` — o meu sandbox não tinha, então não consegui validar o `next
   build` de produção completo, só o `next dev`): rodar `npm run build` e confirmar que
   termina sem erro. Se der o mesmo erro de fonte do Google que eu tive
   (`Failed to fetch 'Outfit' from Google Fonts`), isso é uma limitação de rede do
   ambiente, não um problema do patch — confirmei que o **mesmo erro, idêntico, já
   acontece em `main` sem nenhuma mudança minha**, então não é algo para investigar ou
   corrigir nesta tarefa.

5. Commitar, por exemplo:
   ```
   feat(financas): botões de remoção em /financas/configuracoes e /financas/credenciais

   - Propina e taxa de matrícula: botão "Remover" na tabela de configurações já feitas
   - Início de cobrança: botão para reverter ao mês natural do ano letivo
   - Credenciais AppyPay: botão "Remover" na tabela de /financas/credenciais
   - Segue os padrões já existentes no módulo: sem modais, confirmação via window.confirm,
     variant="danger", loading/erro por linha, Alert de topo para sucesso/erro
   - tsc --noEmit e eslint . limpos (mesmos 7 problemas pré-existentes de sempre, nenhum novo)
   ```

---

## 5. Por que isto é seguro de aplicar sem re-planejar nada

- Cada botão/confirmação/mensagem foi desenhado copiando um padrão **já existente e em
  produção** no mesmo módulo — não há decisão de estilo nova a tomar.
- Os 4 endpoints consumidos (`DELETE /financeiro/appypay/credenciais`,
  `/financeiro/mensalidades/configuracoes`, `/financeiro/mensalidades/inicio-cobranca`,
  `/financeiro/matriculas/configuracoes`) já estão em produção e documentados
  (`Documentação da API.md`, seções 19.23–19.26) desde a tarefa anterior — não há
  incerteza sobre o contrato da API.
- `tsc`/`eslint` já provam, de forma que o próprio Codex pode reproduzir, que o código
  compila e não introduz nenhum problema de lint novo.
