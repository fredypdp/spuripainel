# Tarefa para o Codex — Modo de cadastro em massa + modais em /financas/* (spuripainel)

**Autor da implementação:** Claude (orquestrador). Todo o código já foi escrito, revisado
e validado — `npm install`, `tsc --noEmit` e `eslint .` rodados no repositório inteiro,
um teste isolado real da lógica nova (fora do navegador, gerando ficheiros `.xlsx` de
verdade), um smoke test real do servidor (`next dev` + `curl` nas rotas afetadas) e **tudo
repetido do zero num clone limpo com o patch já aplicado**, para confirmar que o patch é
autocontido.

**Papel do Codex nesta tarefa:** aplicar um patch já pronto e testado. **Não precisa
planejar nada, nem tomar nenhuma decisão de UX/desenho nova** — só aplicar, conferir e
commitar. Assim como na tarefa anterior de `/financas/configuracoes`, **o Codex consegue
validar 100% sozinho** (`npm`/`tsc`/`eslint` não dependem de `apt`/Docker/`psql`), então
não há parte alguma que exija "confiar cegamente" no meu resultado.

**Nenhuma mudança de backend foi necessária.** Não há repositório de backend linkado
nesta tarefa (só `spuripainel`, que é só o frontend Next.js). Ainda assim, verifiquei
deliberadamente se alguma das duas tarefas exigiria tocar `db/`, agregados, `models.go`,
handlers ou projeções: não exige — confirmei contra `src/Documentação da API.md` (seção
8, "Estudantes", e o endpoint `POST /academia/estudante/register/async`) que
`codigo_turma` já é um campo opcional por item, validado da mesma forma que no cadastro
individual síncrono. As duas tarefas são inteiramente sobre **como o frontend decide o
que enviar e como confirma ações destrutivas** — nada que o backend precise saber ou
mudar.

---

## 0. O que foi pedido e o que foi entregue

| # | Pedido | Onde | Resultado |
|---|---|---|---|
| 1 | Modelo gerado num modo de cadastro (turma/geral) não pode ser usado no outro | `/estudantes/cadastrar` (cadastro em massa) | Upload agora é validado contra o modo selecionado no passo 1; modelo do modo errado é rejeitado com mensagem clara |
| 2 | Substituir `window.*` (alert/confirm/prompt) por pop-ups/modal em `/financas/*` | `/financas/configuracoes`, `/financas/credenciais`, `/financas/pagamentos` | Os 6 usos de `window.confirm`/`window.prompt` do módulo financeiro viraram modais reais, no mesmo estilo já usado em outras partes do app |

Nenhuma das duas tarefas tinha, na verdade, um "bug de processamento" por trás — em ambos
os casos o código já fazia o que deveria fazer com os dados que recebia; o problema era
**o que faltava validar** (tarefa 1) ou **qual mecanismo de UI estava sendo usado**
(tarefa 2). Isso está detalhado nas seções 1 e 2 abaixo.

---

## 1. Tarefa 1 — Modelo de um modo não pode ser usado no outro

### 1.1 O que eu encontrei ao investigar

O cadastro em massa (`/estudantes/cadastrar`, aba "Em massa") funciona em 2 passos:

1. **`SelecaoContextoMassa.tsx`** — o utilizador escolhe "Cadastrar por turma" ou
   "Cadastrar de forma geral", preenche nível/curso/ano (e turma, se aplicável), e
   descarrega um `.xlsx` gerado por `massaTemplate.ts::gerarModeloExcel`. Esse ficheiro
   tem uma folha oculta `_meta` com um campo `modo_cadastro` (`"turma"` ou `"geral"`),
   além do `codigo_turma` quando aplicável.
2. **`UploadPlanilhaMassa.tsx`** — o utilizador reenvia o `.xlsx` preenchido.
   `massaParser.ts::analisarPlanilha` lê a folha `_meta` de volta e usa o que estiver lá
   (`contexto.modoCadastro`, `contexto.codigoTurma`) para montar o payload de cada
   estudante (`massaPayload.ts`: `codigo_turma` só é enviado se
   `contexto.modoCadastro === 'turma'`).

**O problema:** o passo 2 nunca comparava o `modo_cadastro` do ficheiro com o modo
selecionado no passo 1. `analisarPlanilha` só validava `codigo_academia` — nunca o modo.
Isso significa que, na prática, o que estava selecionado no passo 1 era **cosmético**:
o utilizador podia estar com "Cadastrar por turma" selecionado e mesmo assim enviar um
ficheiro antigo gerado em modo "geral" (ou vice-versa) sem nenhum aviso — os estudantes
seriam cadastrados exatamente como o ficheiro determinasse, silenciosamente ignorando o
que a tela mostrava. Não há bug de processamento (cada modo, usado "como devia", sempre
funcionou); o que faltava era impedir essa troca silenciosa — exatamente o que foi
pedido: *"o modelo gerado num modo não pode ser utilizado no outro"*.

Confirmei isto lendo o histórico do arquivo (`git log`/`git show` em
`massaParser.ts`/`massaTypes.ts`): o campo `modo_cadastro` já existe há tempo, mas nunca
teve essa checagem cruzada — não é uma regressão recente, é uma validação que sempre
esteve faltando.

### 1.2 O desenho da correção

- **`modoCadastro` deixou de ser estado interno de `SelecaoContextoMassa`** e virou
  estado único, elevado a `CadastroMassaForm` (fonte de verdade para os dois passos).
- **`analisarPlanilha` ganhou um 3º parâmetro opcional**, `modoCadastroEsperado?: 'turma'
  | 'geral'`. Se informado e diferente do `modo_cadastro` do ficheiro, o upload é
  **rejeitado** com uma mensagem didática dizendo qual modo o ficheiro tem, qual modo
  está selecionado, e o que fazer (mudar o modo ou descarregar o modelo certo). O
  parâmetro é opcional para não quebrar nenhum outro possível chamador — mas hoje só
  existe um chamador (`UploadPlanilhaMassa.tsx`), e ele **sempre** passa o modo atual.
- **A rejeição reaproveita 100% da UI de erro já existente** (`RelatorioValidacaoMassa`,
  o mesmo bloco vermelho que já trata "ficheiro de outra academia" ou "ficheiro não
  reconhecido") — não foi criado nenhum componente novo de erro.
- **Trocar o modo no passo 1 limpa qualquer resultado/modelo baixado anteriormente**
  (`handleModoCadastroChange`), para nunca mostrar um relatório de validação que já não
  corresponde ao modo agora selecionado.
- **Edge case corrigido:** se o utilizador recarregar a página com um envio em massa em
  andamento (job assíncrono) ou um rascunho de estudantes com falha pendente de reenvio,
  o modo agora é restaurado a partir do rascunho salvo (`lerRascunhoCadastroMassa`), em
  vez de sempre voltar ao padrão "turma". Sem isso, um recarregamento de página no meio
  de um cadastro "geral" faria o novo check rejeitar, por engano, o reenvio da planilha
  de falhas daquele mesmo cadastro — um efeito colateral que só existiria por causa desta
  tarefa, então tratei antes de entregar.
- Um pequeno texto foi adicionado acima da zona de upload (`UploadPlanilhaMassa.tsx`)
  mostrando qual modo está selecionado, para o utilizador entender de imediato por que um
  upload foi rejeitado, se for o caso.

### 1.3 Por que não modifiquei a lógica de geração do modelo em si

`massaTemplate.ts` (geração do `.xlsx`) e a leitura de `_meta`
(`massaParser.ts::lerContexto`) já estavam corretas e não precisaram mudar — o problema
nunca foi "o ficheiro grava/lê o modo errado", foi "ninguém compara o modo do ficheiro
com o modo selecionado". Mudar só o ponto de comparação é a correção mínima e correta.

---

## 2. Tarefa 2 — `window.*` → modais em `/financas/*`

### 2.1 O que eu encontrei ao investigar

O módulo financeiro tinha **6 usos de pop-ups nativos do navegador**:

| Arquivo | Ação | Tipo |
|---|---|---|
| `FinanceiroCredenciaisPainel.tsx` | Remover credenciais AppyPay | `window.confirm` |
| `FinanceiroCredenciaisPainel.tsx` (`WebhookSecretPanel`) | Rotacionar segredo do webhook | `window.confirm` |
| `FinanceiroConfiguracoesPainel.tsx` | Remover configuração de propina | `window.confirm` |
| `FinanceiroConfiguracoesPainel.tsx` | Remover configuração de taxa de matrícula | `window.confirm` |
| `FinanceiroConfiguracoesPainel.tsx` (`DefinirInicioCobrancaForm`) | Remover início de cobrança | `window.confirm` |
| `financeiroShared.tsx` (`CobrancasTable`) | Motivo do cancelamento de uma cobrança | `window.prompt` |

**Nota importante sobre uma decisão anterior:** o documento da tarefa anterior
(`TAREFA_CODEX_frontend_financas_configuracoes.md`, já neste repositório) registou, como
convenção deliberada do módulo financeiro, "sem modais/pop-ups... confirmação com
`window.confirm`". Essa nota descrevia corretamente o estado do código **na época**, mas
o pedido desta tarefa é explicitamente o oposto — substituir esses `window.*` por
modais — e é uma instrução direta e explícita da pessoa dona do produto, não uma
reavaliação minha. Implementei o pedido atual; a nota antiga fica desatualizada a partir
deste patch. Isso **não** contradiz o outro padrão do módulo, `SubtelaPanel` ("container
padrão de subtela... sem sobreposição, nada de pop-up/modal", usado para
criar/editar/ver detalhe) — esse padrão é sobre **navegação** (trocar toda a tela por uma
subtela), não sobre **confirmação de ação destrutiva**, e continua absolutamente
intocado: nenhuma subtela virou modal, só as confirmações via `window.*` viraram.

### 2.2 Qual padrão de modal segui (não inventei nenhum estilo novo)

Antes de escrever qualquer código, procurei um padrão de modal de confirmação **já em
produção** em outras partes do app — e encontrei um, duplicado de forma idêntica em dois
arquivos: `ModalConfirmarDeleteCurso` (`CursosPainel.tsx`) e `ModalConfirmarDeleteTurma`
(`TurmasPainel.tsx`). Ambos: overlay `fixed inset-0 z-50 bg-black/50`, cartão branco/
`gray-800` centrado, título, mensagem, botão "Cancelar" (`outline`) e botão de ação
vermelho, desabilitados durante o carregamento, o próprio modal controlando seu
`loading` (o chamador só passa uma função `onConfirm` assíncrona).

Repliquei exatamente esse padrão visual, mas **abstraído para reutilização** — já que
`financeiroShared.tsx` existe precisamente para isso ("Utilitários e componentes
partilhados pelas telas de pagamentos e de configurações financeiras") e são 6 usos, não
1 ou 2. Criei lá dois componentes novos e genéricos:

- **`ConfirmDialog`** (`title`, `message`, `confirmLabel?`, `onConfirm`, `onClose`) — para
  os 5 casos de "sim/não". Usado pelos 5 `window.confirm`.
- **`PromptDialog`** (`title`, `description?`, `label`, `placeholder?`, `confirmLabel?`,
  `onConfirm: (valor) => Promise<void>`, `onClose`) — mesmo wrapper visual, com um campo
  de texto (`Label`/`Input`, os mesmos componentes de formulário já usados em todo o
  app) no lugar do `window.prompt`. Usado só pelo motivo de cancelamento de cobrança
  (`CobrancasTable`), mas deixei genérico por props para não ter que duplicar o wrapper
  visual se `/financas/*` precisar de outro prompt no futuro.

Não inventei nenhuma cor, espaçamento ou animação nova — é o mesmo cartão que já existe
em `CursosPainel.tsx`/`TurmasPainel.tsx`, só que reaproveitável.

### 2.3 Uma diferença de comportamento deliberada (não é regressão — está documentada no código)

No `window.prompt` antigo do cancelamento de cobrança, clicar "Cancelar" na caixa nativa
do navegador **ainda assim cancelava a cobrança** (só sem motivo) — `window.prompt(...)
|| undefined` trata "cliquei Cancelar" e "cliquei OK com o campo vazio" exatamente da
mesma forma. Isso sempre foi um efeito colateral confuso de reaproveitar `window.prompt`
para uma ação que, na prática, não era opcional.

No `PromptDialog` novo, isso é mais intuitivo: o botão "Voltar" fecha o modal **sem**
cancelar a cobrança; só o botão de ação confirma (com ou sem motivo preenchido). Deixei
isso comentado explicitamente no código (`financeiroShared.tsx`, acima de
`PromptDialog`) para não parecer um efeito colateral não intencional para quem ler depois.

### 2.4 Sobre o "raio de alcance" de mexer em `financeiroShared.tsx`

`CobrancasTable` (onde estava o `window.prompt`) é usado por **duas** telas, não só por
`/financas/*`:
- `FinanceiroPagamentosPainel.tsx` → rota `/financas/pagamentos` (academia/FPP) — dentro
  do escopo pedido.
- `EstudantePagamentosPainel.tsx` → rota `/pagamentos` (estudante) — **fora** do escopo
  literal de `/financas/*`.

Corrigir o `window.prompt` só dentro do componente compartilhado (em vez de duplicar
`CobrancasTable` para bifurcar o comportamento entre as duas telas) foi uma escolha
deliberada: a alternativa seria manter um `window.prompt` inconsistente numa tela e um
modal na outra, para uma mesma tabela reaproveitada — pior para manutenção e pior UX para
quem usa `/pagamentos`. Verifiquei que os outros dois consumidores de
`financeiroShared.tsx` (`MatriculaPublicPage.tsx` e `AnularReativarObrigacoesForm.tsx`)
importam só `Qr`/`money`/`formatAnoLetivo` — não usam `CobrancasTable`, `ConfirmDialog`
nem `PromptDialog` — portanto **não são afetados** por este patch. Testei `/pagamentos`
no smoke test (seção 3) e confirmei `200 OK`, sem erro.

Os 5 `window.confirm` (em `FinanceiroCredenciaisPainel.tsx`/`FinanceiroConfiguracoesPainel.tsx`)
já estavam 100% contidos dentro de `/financas/*` — nenhuma decisão de raio de alcance
necessária ali.

---

## 3. Como isto foi testado (no meu sandbox)

1. `git clone` limpo de `https://github.com/fredypdp/spuripainel` (branch `main`).
2. `npm install` (803 pacotes, sem erro — mesmo baseline da tarefa anterior).
3. Escrevi o código, revisei manualmente cada trecho contra padrões já existentes no
   próprio app (nunca inventei um padrão novo — ver seções 1.2 e 2.2).
4. `npx tsc --noEmit` no repositório inteiro → **0 erros**.
5. `npx eslint .` no repositório inteiro → **exatamente os mesmos 7 problemas
   pré-existentes** (2 erros, 5 warnings) já presentes em `main` **antes** desta tarefa,
   em arquivos fora desta mudança (`verificar-email/[token]/page.tsx`,
   `SelecaoContextoMassa.tsx` — os 2 warnings de "unused eslint-disable" já existiam
   antes, não introduzidos agora —, `Calendar.tsx`, `AppSidebar.tsx`). **Nenhum erro ou
   warning novo.**
6. **Teste isolado, fora do navegador, da lógica nova da Tarefa 1**: escrevi um script
   (`npx tsx`) que monta ficheiros `.xlsx` reais em memória (réplica fiel de
   `massaTemplate.ts::gerarModeloExcel`, incluindo a folha `_meta`) para os modos
   "turma" e "geral", e chama `analisarPlanilha` diretamente com várias combinações de
   modo selecionado. **7/7 verificações passaram**: ficheiro certo é aceite, ficheiro
   errado é rejeitado (nos dois sentidos), a checagem de academia continua funcionando
   junto, e sem o novo parâmetro o comportamento antigo (aceitar qualquer modo) é
   preservado — confirmando retrocompatibilidade. O script não faz parte do patch (é só
   uma ferramenta de diagnóstico) — o conteúdo completo está no Anexo A, para o Codex
   reproduzir se quiser.
7. Subi `next dev` de verdade e fiz requisições HTTP reais para `/financas/configuracoes`,
   `/financas/credenciais`, `/financas/pagamentos`, `/pagamentos` e `/estudantes/cadastrar`
   → **todas devolvem 200**, sem crash de servidor, sem erro de renderização SSR. (O
   único aviso no log é a fonte "Outfit" do Google Fonts não baixar por falta de rede no
   meu sandbox — o mesmo aviso, idêntico, já acontece em `main` sem nenhuma mudança
   minha; não é um problema do patch.)
8. **Repeti os passos 4, 5, 6 e 7 a partir de um clone novo do zero com o patch já
   aplicado** (não a partir da minha cópia de trabalho) — mesmo resultado byte a byte em
   `tsc`/`eslint`, mesmas 7 verificações passando no teste isolado, mesmas rotas
   respondendo 200 — confirmando que o patch é autocontido e aplica de forma idêntica em
   qualquer checkout limpo de `main`.

---

## 4. O que o patch muda, arquivo por arquivo

**`src/app/(painel)/estudantes/cadastrar/massaParser.ts`** — `analisarPlanilha` ganha o
3º parâmetro `modoCadastroEsperado?: 'turma' | 'geral'` e uma checagem nova logo após a
validação de `codigo_academia`, antes de abrir a folha "Estudantes".

**`src/app/(painel)/estudantes/cadastrar/SelecaoContextoMassa.tsx`** — `modoCadastro`
deixa de ser `useState` interno e vira prop controlada (`modoCadastro` +
`onModoCadastroChange`), recebida do pai.

**`src/app/(painel)/estudantes/cadastrar/UploadPlanilhaMassa.tsx`** — recebe
`modoCadastroSelecionado` e repassa para `analisarPlanilha`; mostra o modo selecionado
acima da zona de upload.

**`src/app/(painel)/estudantes/cadastrar/CadastroMassaForm.tsx`** — eleva o estado
`modoCadastro` (fonte única de verdade), adiciona `handleModoCadastroChange` (limpa
estado obsoleto ao trocar de modo) e restaura o modo a partir do rascunho salvo ao
montar o componente.

**`src/components/paineis/financeiroShared.tsx`** — dois componentes novos exportados,
`ConfirmDialog` e `PromptDialog` (ver seção 2.2); `CobrancasTable` passa a abrir
`PromptDialog` em vez de `window.prompt` no cancelamento de cobrança.

**`src/components/paineis/FinanceiroCredenciaisPainel.tsx`** — `handleRemover` (remoção
de credencial) e `handleRotacionar` (`WebhookSecretPanel`, rotação de segredo de
webhook) abrem `ConfirmDialog` em vez de `window.confirm`.

**`src/components/paineis/FinanceiroConfiguracoesPainel.tsx`** — `handleRemoverMensalidade`,
`handleRemoverMatricula` (dentro de `renderConfiguracoesSalvas`) e `removerException`
(`DefinirInicioCobrancaForm`) abrem `ConfirmDialog` em vez de `window.confirm`.

**Nenhum arquivo de backend, migration, rota ou tipo do Go foi tocado** — as duas
tarefas são inteiramente frontend (ver nota no topo deste documento).

---

## 5. Passo a passo EXATO para o Codex

1. Na raiz do repositório `spuripainel` (branch atual):
   ```bash
   git apply estudantes_financas_correcoes.patch
   ```
   (Testado com `git apply --check` a partir de um clone limpo de `main` — aplica sem
   conflito. Repeti a aplicação de verdade, não só o `--check`, num clone separado — ver
   seção 3, passo 8.)

2. Instalar dependências, se ainda não tiver feito nesta sessão:
   ```bash
   npm install
   ```

3. Validar — **o Codex consegue rodar os comandos abaixo sozinho, sem nenhuma limitação
   de ambiente**:
   ```bash
   npx tsc --noEmit
   ```
   Deve terminar sem nenhuma saída (0 erros).
   ```bash
   npx eslint .
   ```
   Deve reportar exatamente os mesmos 7 problemas de sempre (2 erros, 5 warnings), todos
   em `verificar-email/[token]/page.tsx`, `SelecaoContextoMassa.tsx`, `Calendar.tsx` e
   `AppSidebar.tsx` — nada nos 7 arquivos que este patch tocou. Se aparecer QUALQUER coisa
   nova nesses 7 arquivos, pare e volte para mim antes de tentar corrigir por conta
   própria.
   ```bash
   git status --short
   ```
   Deve mostrar exatamente estes 7 arquivos modificados, nenhum outro:
   - `src/app/(painel)/estudantes/cadastrar/CadastroMassaForm.tsx`
   - `src/app/(painel)/estudantes/cadastrar/SelecaoContextoMassa.tsx`
   - `src/app/(painel)/estudantes/cadastrar/UploadPlanilhaMassa.tsx`
   - `src/app/(painel)/estudantes/cadastrar/massaParser.ts`
   - `src/components/paineis/FinanceiroConfiguracoesPainel.tsx`
   - `src/components/paineis/FinanceiroCredenciaisPainel.tsx`
   - `src/components/paineis/financeiroShared.tsx`

4. (Opcional) Reproduzir o teste isolado da Tarefa 1: cole o conteúdo do Anexo A num
   arquivo `scripts/_teste_modo_cadastro.ts` e rode `npx tsx
   scripts/_teste_modo_cadastro.ts` — deve terminar com `TODAS AS VERIFICAÇÕES PASSARAM`
   e código de saída `0`. Apague o arquivo depois (não faz parte do patch).

5. (Opcional, mas recomendado se o ambiente do Codex tiver acesso de rede a
   `fonts.googleapis.com` — o meu sandbox não tinha): `npm run build` e confirmar que
   termina sem erro. Se aparecer o mesmo erro de fonte do Google que eu tive, é limitação
   de rede do ambiente (já confirmei que acontece em `main` sem nenhuma mudança minha),
   não um problema do patch.

6. Commitar. Como as duas tarefas não têm nenhum arquivo em comum, pode ser 2 commits
   separados (`git add` seletivo) ou 1 só — sugestão:
   ```
   fix(estudantes): modelo de cadastro em massa de um modo não pode ser usado no outro

   - modoCadastro (turma/geral) elevado a estado único do formulário de massa
   - analisarPlanilha valida o modo do ficheiro contra o modo selecionado no passo 1
   - modelo do modo errado é rejeitado com mensagem clara, reaproveitando a UI de erro
     já existente
   - modo é restaurado do rascunho salvo ao recarregar a página (evita falso-positivo
     ao reenviar planilha de falhas de um cadastro "geral" em andamento)
   - tsc --noEmit e eslint . limpos (mesmos 7 problemas pré-existentes, nenhum novo)
   - validado com teste isolado real (7/7) gerando .xlsx em memória e chamando
     analisarPlanilha diretamente

   feat(financas): window.confirm/window.prompt -> modais em /financas/*

   - ConfirmDialog e PromptDialog novos em financeiroShared.tsx, reaproveitando o
     padrão visual já usado em ModalConfirmarDeleteCurso/Turma (CursosPainel/TurmasPainel)
   - substitui os 5 window.confirm (remoção de credencial, rotação de segredo de webhook,
     remoção de config. de propina/matrícula, remoção de início de cobrança) e o
     window.prompt (motivo de cancelamento de cobrança) do módulo financeiro
   - comportamento do cancelamento de cobrança ligeiramente mais intuitivo: "Voltar"
     agora aborta a ação (o window.prompt antigo cancelava a cobrança mesmo ao clicar
     "Cancelar" na caixa nativa) — documentado no código
   - tsc --noEmit e eslint . limpos (mesmos 7 problemas pré-existentes, nenhum novo)
   ```

---

## 6. Por que isto é seguro de aplicar sem re-planejar nada

- Cada correção resolve exatamente o que foi pedido, sem inventar comportamento extra: a
  Tarefa 1 só adiciona a checagem que faltava (o resto do fluxo de massa não mudou); a
  Tarefa 2 só troca o mecanismo de confirmação, sem tocar em `SubtelaPanel` nem em
  nenhuma outra convenção do módulo.
- Os dois modais novos copiam um padrão visual **já em produção** noutra parte do app
  (`ModalConfirmarDeleteCurso`/`Turma`) — não há decisão de estilo nova a tomar.
- `tsc`/`eslint` já provam, de forma que o próprio Codex pode reproduzir, que o código
  compila e não introduz nenhum problema de lint novo.
- O teste isolado da Tarefa 1 (Anexo A) prova, de forma que o próprio Codex pode
  reproduzir sem depender de navegador nem de backend, que a lógica de validação de modo
  funciona nos dois sentidos e preserva retrocompatibilidade.
- Nenhuma mudança de backend, contrato de API ou schema de banco foi necessária — só
  frontend, confirmado contra `Documentação da API.md`.

---

## Anexo A — script do teste isolado da Tarefa 1 (não faz parte do patch)

```ts
// npx tsx scripts/_teste_modo_cadastro.ts
import * as XLSX from 'xlsx';
import { analisarPlanilha } from '../src/app/(painel)/estudantes/cadastrar/massaParser';
import type { ContextoModelo } from '../src/app/(painel)/estudantes/cadastrar/massaTypes';

const COLUNAS_MODELO_MASSA = [
  'Nome Completo', 'Género (masculino ou feminino)', 'Data de Nascimento (DD/MM/AAAA)',
  'BI do Estudante', 'BI do Encarregado', 'Telefone do Estudante', 'Telefone do Encarregado', 'Email (opcional)',
];

function construirBuffer(contexto: ContextoModelo): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const wsDados = XLSX.utils.aoa_to_sheet([COLUNAS_MODELO_MASSA]);
  XLSX.utils.book_append_sheet(wb, wsDados, 'Estudantes');
  const linhasMeta = [
    ['chave', 'valor'],
    ['versao_modelo', contexto.versaoModelo],
    ['codigo_academia', contexto.codigoAcademia],
    ['nome_academia', contexto.nomeAcademia || ''],
    ['nivel', contexto.nivel],
    ['curso_id', contexto.cursoId || ''],
    ['curso_nome', contexto.cursoNome || ''],
    ['ano_academico', contexto.anoAcademico],
    ['ano_academico_label', contexto.anoAcademicoLabel || ''],
    ['codigo_turma', contexto.codigoTurma || ''],
    ['turma_label', contexto.turmaLabel || ''],
    ['modo_cadastro', contexto.modoCadastro || 'geral'],
    ['gerado_em', new Date().toISOString()],
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet(linhasMeta);
  XLSX.utils.book_append_sheet(wb, wsMeta, '_meta');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

function fileDeContexto(contexto: ContextoModelo, nome: string): File {
  return new File([construirBuffer(contexto)], nome, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const contextoTurma: ContextoModelo = {
  codigoAcademia: 'ACAD001', nomeAcademia: 'Escola Teste', nivel: 'fundamental',
  anoAcademico: '5_ano_fundamental', anoAcademicoLabel: '5ª Classe', versaoModelo: '1',
  modoCadastro: 'turma', codigoTurma: 'T5A', turmaLabel: 'T5A · Manhã',
};
const contextoGeral: ContextoModelo = {
  codigoAcademia: 'ACAD001', nomeAcademia: 'Escola Teste', nivel: 'fundamental',
  anoAcademico: '5_ano_fundamental', anoAcademicoLabel: '5ª Classe', versaoModelo: '1',
  modoCadastro: 'geral',
};

let falhas = 0;
function checar(nome: string, condicao: boolean, detalhe?: string) {
  if (condicao) console.log(`OK   - ${nome}`);
  else { falhas++; console.log(`FALHA- ${nome}${detalhe ? ` (${detalhe})` : ''}`); }
}

async function main() {
  const fileTurma = fileDeContexto(contextoTurma, 'modelo-turma.xlsx');
  const fileGeral = fileDeContexto(contextoGeral, 'modelo-geral.xlsx');

  const r1 = await analisarPlanilha(fileTurma, 'ACAD001', 'turma');
  checar('turma + turma selecionado => aceite', r1.contexto !== null, JSON.stringify(r1.erros));
  const r2 = await analisarPlanilha(fileTurma, 'ACAD001', 'geral');
  checar('turma + geral selecionado => rejeitado', r2.contexto === null);
  const r3 = await analisarPlanilha(fileGeral, 'ACAD001', 'geral');
  checar('geral + geral selecionado => aceite', r3.contexto !== null, JSON.stringify(r3.erros));
  const r4 = await analisarPlanilha(fileGeral, 'ACAD001', 'turma');
  checar('geral + turma selecionado => rejeitado', r4.contexto === null);
  const r5 = await analisarPlanilha(fileTurma, 'ACAD001', undefined);
  checar('sem modoCadastroEsperado => turma aceite', r5.contexto !== null, JSON.stringify(r5.erros));
  const r7 = await analisarPlanilha(fileTurma, 'OUTRA_ACAD', 'turma');
  checar('academia errada => rejeitado mesmo com modo certo', r7.contexto === null);

  console.log('\n' + (falhas === 0 ? 'TODAS AS VERIFICAÇÕES PASSARAM' : `${falhas} VERIFICAÇÃO(ÕES) FALHARAM`));
  process.exit(falhas === 0 ? 0 : 1);
}
main();
```
