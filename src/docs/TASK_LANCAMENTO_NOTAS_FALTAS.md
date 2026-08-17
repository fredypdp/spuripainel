# Tarefa para o Codex — Lançamento de Notas e Faltas por Planilha Excel

> **Como usar este documento:** ele já foi planejado por completo pelo orquestrador (Claude). O Codex não precisa
> decidir arquitetura, nomes de arquivo, contrato de dados nem regras de validação — tudo isso já está definido
> abaixo. A única coisa que o Codex deve fazer é **implementar exatamente o que está especificado**, arquivo por
> arquivo, e depois rodar as validações da Seção 12 e preencher o relatório da Seção 14.
>
> Se, durante a implementação, o Codex encontrar algo neste documento que **não bate com o código real do
> repositório** (nome de função diferente, campo que não existe, etc.), ele deve: (1) preferir sempre o que está no
> código-fonte real, (2) registrar a divergência no relatório final (Seção 14), e (3) só então prosseguir com o
> ajuste mínimo necessário. Não é permitido redesenhar o fluxo por conta própria.

---

## 0. Contexto do repositório

Repositório: `https://github.com/fredypdp/spuripainel` (branch `main`).

Este repositório é **apenas o front-end** (Next.js 16 / React 19 / TypeScript, App Router, pasta `src/app`). Não há
código de back-end (Go) neste repositório — nenhum `db/`, `aggregates/`, `models.go`, `handlers/` ou `projections/`.
O front-end consome uma API HTTP já pronta e documentada em `src/Documentação da API.md`. **Esta tarefa não exige
nenhuma alteração de back-end**: os endpoints assíncronos de lote que vamos usar já existem e já estão em produção
(`POST /academia/notas-aluno/async` e `POST /academia/faltas-aluno/async`). O Codex deve trabalhar **somente** no
front-end.

Não rode `apt`, não tente subir Docker/Postgres. Isso é validado depois pelo orquestrador (ver Seção 13).

---

## 1. Objetivo da tarefa

Nas páginas `/notas` e `/faltas` (componentes usados apenas pelo perfil **academia**: `NotasAcademia.tsx` e
`FaltasAcademia.tsx`):

1. Renomear o botão principal de **"Nova Nota"** → **"Lançar Notas"** e de **"Nova Falta"** → **"Lançar Faltas"**.
2. Reposicionar esse botão para ficar **ao lado do título** ("Gestão de Notas" / "Gestão de Faltas"), e não mais
   isolado na ponta direita do cabeçalho.
3. O botão deixa de abrir o modal de lançamento individual e passa a **navegar para uma nova subtela** dedicada ao
   lançamento em lote via planilha Excel — no mesmo espírito do fluxo já existente em `/estudantes/cadastrar`
   (cadastro em massa).
4. Nessa subtela, a academia configura o contexto (nível de ensino → curso → ano acadêmico → turma → período →
   matéria → categoria, conforme o caso), baixa um modelo `.xlsx` **já preenchido com os estudantes da turma
   selecionada** (ordenados crescentemente pelo nome), preenche os valores, envia o arquivo, revê os erros de
   validação e confirma o lançamento em lote.
5. O identificador mais importante de cada modelo gerado é o **código da turma** (`codigo_turma`) — é ele que
   individualiza e valida cada planilha no reenvio (igual ao papel que já cumpre no `_meta` do modelo de cadastro
   em massa de estudantes).

---

## 2. Decisões de design já tomadas (não replanejar)

Estas decisões foram tomadas por já haver precedente idêntico no próprio código-base (`/estudantes/cadastrar`) e
por causa de campos obrigatórios da API que o pedido original não detalhava. Estão fechadas — o Codex só executa.

**D1 — Período, Matéria e Categoria vão no contexto da planilha, não em colunas por aluno.**
`RegistrarNotasRequest` exige `periodo`, `materia_disciplinar_id` e `categoria`; `RegistrarFaltasRequest` exige
`periodo` e `materia_disciplinar_id`. Nenhum desses três campos varia por lançamento dentro do mesmo modelo — por
isso eles são escolhidos **uma única vez**, na subtela de configuração, e embutidos na aba oculta `_meta` do
Excel — exatamente como `curso_id`/`ano_academico`/`codigo_turma` já são embutidos no modelo de cadastro em massa
de estudantes. As colunas da planilha ficam exatamente como o usuário pediu: Notas = `Nome do Estudante, Código do
Estudante, Valor da Nota`; Faltas = `Nome do Estudante, Código do Estudante, Data da Falta, Quantidade`.

**D2 — O botão principal deixa de abrir o formulário de lançamento individual.**
O botão "Lançar Notas"/"Lançar Faltas" passa a levar exclusivamente ao fluxo em lote (mesmo que a pessoa preencha
só uma linha da planilha — isso já cobre o caso de lançar para um único estudante). O modal atual de registro
individual (`ModalGestao` modo `"registrar"` em `NotasAcademia.tsx`, e `ModalRegistrarFalta` em
`FaltasAcademia.tsx`) deixa de ser acionado por esse botão.

- Em `NotasAcademia.tsx`, o botão **"Categoria"** (visível só para `isSuperior`) continua existindo e continua
  abrindo `ModalGestao`, mas agora o modal deve ser aberto **apenas com a aba "Categoria"** (a aba "Registar" deixa
  de existir nesse modal). Ver Seção 5.
- Em `FaltasAcademia.tsx` não existe equivalente ao botão "Categoria" — o `ModalRegistrarFalta` inteiro deixa de
  ser usado a partir do header; o componente pode ser removido do arquivo (ver Seção 6) se não for referenciado em
  mais nenhum lugar.
- **Não mexer** em `ModalCorrigirNota` / `ModalCorrigirFalta` (fluxo de correção) — isso é uma funcionalidade
  separada e não faz parte desta tarefa.

**D3 — "Subtela" = nova rota, não modal.**
O próprio repositório já resolve exatamente esse tipo de fluxo (contexto → baixar modelo → upload → validação →
confirmação → progresso) como uma **rota própria** (`/estudantes/cadastrar`), acessada por um botão que é um
`<Link>`, não um modal. Seguimos o mesmo padrão: criar `/notas/lancar` e `/faltas/lancar` como novas rotas dentro
do route group `(painel)`, com a mesma composição de arquivos usada em `estudantes/cadastrar`.

**D4 — Acesso restrito a `academia`.**
Os endpoints de lote exigem "academia ativa". As novas rotas devem ser protegidas com o mesmo padrão de guarda de
`estudantes/cadastrar/PageContent.tsx` (`useUserCookie` + `useUserType` + `UnauthorizedAccess`), e devem ser
registradas em `src/lib/route-guards.ts` com `allowedTypes: ['academia']`.

**D5 — Turma sempre obrigatória (sem modo "geral").**
Ao contrário do cadastro de estudantes (que tem modo "geral", sem turma), lançar notas/faltas **sempre** exige uma
turma selecionada, porque o modelo é pré-preenchido com os estudantes dela. Não implementar alternância
turma/geral aqui.

**D6 — Validação de negócio de datas fica a cargo do back-end.**
O front-end valida apenas formato/obrigatoriedade/faixa de valores no cliente (ver Seções 8–9). Regras como "a
data da falta precisa estar dentro do ano letivo ativo" são validadas pelo servidor; o erro retornado por item do
job (`resolveJobItemError`) já é exibido normalmente na tela de progresso — não precisa ser replicado no cliente.

---

## 3. Arquivos existentes para estudar antes de codar

Leia estes arquivos por completo antes de escrever qualquer código novo — o padrão a seguir é uma cópia adaptada
deles, então divergências não intencionais do padrão são bugs, não "melhorias":

| Arquivo | Por que importa |
|---|---|
| `src/app/(painel)/estudantes/cadastrar/page.tsx` | Padrão de wrapper de rota + `metadata`. |
| `src/app/(painel)/estudantes/cadastrar/PageContent.tsx` | Padrão de guarda de acesso (`useUserCookie`/`useUserType`/`UnauthorizedAccess`) e botão "Voltar". |
| `src/app/(painel)/estudantes/cadastrar/CadastroMassaForm.tsx` | Máquina de estados do fluxo (verificando → normal → progresso), verificação de job em andamento ao montar, envio em lotes, rascunho local. |
| `src/app/(painel)/estudantes/cadastrar/SelecaoContextoMassa.tsx` | Seleção em cascata Nível → Curso → Ano Acadêmico → Turma — **é a base literal** da subtela de configuração pedida (a lógica de "misto" e de mostrar/ocultar "Curso" já está pronta ali). |
| `src/app/(painel)/estudantes/cadastrar/massaTemplate.ts` | Geração do `.xlsx` com aba `_meta` oculta — padrão a replicar para os novos modelos. |
| `src/app/(painel)/estudantes/cadastrar/massaParser.ts` | Leitura/validação linha a linha, mensagens de erro didáticas — padrão a replicar. |
| `src/app/(painel)/estudantes/cadastrar/massaTypes.ts` | Padrão de tipos `ContextoModelo` / `ResultadoAnalise` / `ErroValidacao`. |
| `src/app/(painel)/estudantes/cadastrar/massaHelpers.ts` | `dividirEmLotes`, labels de nível/ano — reaproveitar o que for genérico. |
| `src/app/(painel)/estudantes/cadastrar/massaPayload.ts` | Conversão linha → payload de API. |
| `src/app/(painel)/estudantes/cadastrar/massaApi.ts` | Chamada ao endpoint assíncrono. |
| `src/app/(painel)/estudantes/cadastrar/massaDraft.ts` | Rascunho em `localStorage` para retomar envio após falha parcial. |
| `src/app/(painel)/estudantes/cadastrar/massaErrorExport.ts` | Exportar `.xlsx` só com as linhas com erro/falha. |
| `src/app/(painel)/estudantes/cadastrar/BatchProgressScreen.tsx` | Acompanhamento de job(s) via polling — reaproveitar quase 1:1. |
| `src/app/(painel)/estudantes/cadastrar/UploadPlanilhaMassa.tsx` | Componente de upload (`<input type="file">`) — reaproveitar quase 1:1. |
| `src/app/(painel)/estudantes/cadastrar/RelatorioValidacaoMassa.tsx` | Relatório de validação pré-envio — adaptar textos/summary ao contexto de notas/faltas. |
| `src/components/notas/NotasAcademia.tsx` | Onde fica o botão a alterar, o header a reposicionar, e o `ModalGestao` a restringir à aba "Categoria". Também tem a lógica de filtragem de matérias por turma/ano/curso/período que deve ser **reaproveitada** na nova tela (não reinventar). |
| `src/components/faltas/FaltasAcademia.tsx` | Idem, para faltas (`ModalRegistrarFalta` a remover do fluxo principal). |
| `src/lib/route-guards.ts` | Onde registrar as novas rotas. |
| `src/lib/api/services.ts` | `academiaService.registrarNotaBatchAsync`, `academiaService.registrarFaltasBatchAsync`, `academiaService.listarTurmas`, `academiaService.listarCursos`, `academiaService.listarMaterias`, `academiaService.listarCategoriasNota`, `academiaService.getAnoLetivo`, `consultasService.listarEstudantes`. |
| `src/lib/api/job-service.ts` | `jobApiService`, `pollJob`, tipos `JobSummary`/`JobDetail`/`AsyncBatchResponse`. |
| `src/types/api.ts` | `RegistrarNotasRequest`, `RegistrarFaltasRequest`, `Turma`, `Curso`, `Materia`, `CategoriaNotaItem`, `EstudanteDetalhado`, `ApiDate`, `Periodo`. |
| `src/Documentação da API.md` (seções "13. Notas" e "14. Faltas", e a seção de endpoints `/async`) | Contrato oficial dos endpoints e limites por requisição. |
| `src/components/form/SearchableSelect.tsx` | Componente de select pesquisável já usado em `SelecaoContextoMassa` — reaproveitar. |
| `src/components/form/date-picker` (usado em `FaltasAcademia.tsx` como `DatePicker`) | Se optar por permitir editar a data também por um seletor, mas **não é necessário** — a data vem da planilha, não de um datepicker na tela de configuração. |

---

## 4. Fora de escopo (não tocar)

- Qualquer coisa de back-end/Go — não existe neste repositório.
- `ModalCorrigirNota`, `ModalCorrigirFalta` e todo o fluxo de correção de nota/falta já lançada.
- `NotasEstudante.tsx`, `NotasAdmin.tsx`, `FaltasEstudante.tsx`, `FaltasAdmin.tsx` — são somente leitura, sem botão
  de lançamento, não precisam mudar.
- O fluxo de cadastro em massa de estudantes (`/estudantes/cadastrar/**`) — só serve de referência, não deve ser
  alterado.
- Regras de avaliação final, matérias, cursos, turmas (CRUD) — fora do escopo.

---

## 5. Parte A — `NotasAcademia.tsx`

### A.1 — Header (título + botão)

Local atual (por volta da linha 1595–1614):

```tsx
<div className="flex items-center justify-between gap-4">
  <div>
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Notas</h2>
    {turmas.length > 0 && (
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
        {turmasAtivas.length} turma(s) ativa(s){!loadingEstud && estudantes.length > 0 ? ` · ${estudantes.length} estudante(s)` : ""} · {todasNotas.length} nota(s)
      </p>
    )}
  </div>
  <div className="flex gap-2">
    {isSuperior && (
      <Button size="sm" variant="outline" startIcon={<Icon icon="mdi:tag-plus-outline" />} onClick={abrirModalNovaNota}>
        Categoria
      </Button>
    )}
    <Button size="sm" startIcon={<Icon icon="mdi:plus" />} onClick={abrirModalNovaNota}>
      Nova Nota
    </Button>
  </div>
</div>
```

Substituir por uma estrutura em que o título e o novo botão **"Lançar Notas"** fiquem agrupados à esquerda (lado a
lado), e a legenda de contagem continue abaixo do título. O botão "Categoria" (quando `isSuperior`) continua
existindo, mas some da linha do título e passa a ficar junto dos demais controles secundários — **não precisa ficar
colado ao título**, só o botão de lançamento precisa. Estrutura sugerida (ajustar classes Tailwind ao gosto do
projeto, mantendo consistência visual com o resto do app):

```tsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
  <div className="flex flex-wrap items-center gap-3">
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Notas</h2>
    <Link
      href="/notas/lancar"
      className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
    >
      <Icon icon="mdi:upload" width={16} /> Lançar Notas
    </Link>
  </div>
  {isSuperior && (
    <Button size="sm" variant="outline" startIcon={<Icon icon="mdi:tag-plus-outline" />} onClick={abrirModalNovaCategoria}>
      Categoria
    </Button>
  )}
</div>
{turmas.length > 0 && (
  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
    {turmasAtivas.length} turma(s) ativa(s){!loadingEstud && estudantes.length > 0 ? ` · ${estudantes.length} estudante(s)` : ""} · {todasNotas.length} nota(s)
  </p>
)}
```

Regras:
- É preciso importar `Link` de `next/link` no topo do arquivo.
- O ícone sugerido é `mdi:upload` (coerente com o resto do app, que usa `mdi:*` do Iconify) — o Codex pode manter
  `mdi:plus` se preferir manter consistência com o resto do app; **não é um requisito rígido**, mas o texto do
  botão **precisa** ser exatamente "Lançar Notas".
- Mantenha o parágrafo de contagem de turmas/estudantes/notas como estava, apenas reposicionado abaixo do bloco de
  título+botões.

### A.2 — Renomear/isolar o gatilho do modal de Categoria

Renomeie a função `abrirModalNovaNota` para `abrirModalNovaCategoria` (ou crie uma nova função com esse nome e
apague a antiga) e remova a chamada a `carregarEstudantes` se ela só era necessária para o dropdown de estudante do
modo "Registar" (**confirme isso lendo o restante do arquivo antes de remover** — se `dataEstudantes` for usado em
outro lugar da tela, mantenha o carregamento):

```tsx
function abrirModalNovaCategoria() {
  openModal();
}
```

### A.3 — `ModalGestao`: remover a aba/modo "Registar"

Em `ModalGestao` (por volta da linha 434–679):
- Remover o modo `"registrar"` do tipo `ModalMode`, o estado e a lógica associada (`codigoEst`, `periodo`,
  `materiaId`, `categoria`, `nota`, `obs`, `handleRegistrar`, o bloco `{mode === "registrar" && (...)}`, e a prop
  `onRegistrar` — se `onRegistrar` não for mais usada em nenhum lugar, remova a prop da interface e do componente
  pai).
- `TABS` passa a ter só uma entrada: `{ key: "categoria", label: "Categorias" }` — e como só existe uma aba, pode
  simplificar removendo os botões de troca de aba (não faz sentido ter uma "aba" única) e exibir direto o formulário
  de categoria com um título fixo ("Nova Categoria de Nota").
- **Atenção:** o componente principal (`NotasAcademia`) referencia `handleRegistrar` (a função de nível de página,
  por volta da linha 1015, que grava a nota e recarrega a tabela) — **essa função de página não é a mesma coisa**
  que o `handleRegistrar` interno do modal. A função de página (`async function handleRegistrar(d:
  RegistrarNotasRequest) {...}`) é usada pela tabela ao clicar numa nota (`onCorrigir`)? Confira: se ela só era
  chamada via `onRegistrar` do modal removido, e não é usada em mais nenhum lugar, pode ser removida também. Se for
  usada por outro fluxo, mantenha.
- Ajuste a chamada de `<ModalGestao ... onRegistrar={handleRegistrar} ... />` no render final do componente,
  removendo a prop `onRegistrar` (e `estudantes`/`PERIODOS`/`anoLectivo`/`materias` se deixarem de ser necessários
  só por causa da aba removida — **confirme se `categorias`/`anosAcademicosDisponiveis`/`onCriarCategoria`
  continuam sendo passados**, pois a aba "Categoria" continua funcionando).

### A.4 — Não alterar mais nada neste arquivo

O restante do fluxo de navegação em camadas (anos → turmas → períodos → notas, tabelas, correção de nota) fica
igual. Esta tarefa não deve alterar como as notas são exibidas/corrigidas — apenas como uma nova nota é lançada.

---

## 6. Parte B — `FaltasAcademia.tsx`

Aplicar o mesmo raciocínio da Parte A, adaptado (não há botão "Categoria" aqui):

### B.1 — Header

Local atual (por volta da linha 1262–1275):

```tsx
<div className="flex items-center justify-between gap-4">
  <div>
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Faltas</h2>
    ...
  </div>
  <Button size="sm" startIcon={<Icon icon="mdi:plus" />} onClick={abrirModalNovaFalta}>
    Nova Falta
  </Button>
</div>
```

Substituir seguindo o mesmo padrão da Seção A.1, mas sem o botão "Categoria":

```tsx
<div className="flex flex-wrap items-center gap-3">
  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Faltas</h2>
  <Link
    href="/faltas/lancar"
    className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
  >
    <Icon icon="mdi:upload" width={16} /> Lançar Faltas
  </Link>
</div>
{turmas.length > 0 && (
  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
    {turmasAtivas.length} turma(s) ativa(s){!loadingEstud && estudantes.length > 0 ? ` · ${estudantes.length} estudante(s)` : ""} · {todasFaltas.length} registro(s)
  </p>
)}
```

Texto do botão **precisa** ser exatamente "Lançar Faltas". Importar `Link` de `next/link`.

### B.2 — Remover o gatilho e o uso de `ModalRegistrarFalta`

- Remover a chamada/renderização de `<ModalRegistrarFalta ... />` no final do componente.
- Remover `abrirModalNovaFalta`, `handleRegistrar` (a versão de página que só existia para alimentar
  `ModalRegistrarFalta.onConfirm` — **confirme antes de apagar** que não é usada em outro lugar) e o próprio
  componente `ModalRegistrarFalta` (função inteira, por volta da linha 264), **se e somente se** ele não for
  importado/usado em nenhum outro arquivo do repositório (rode `grep -rn "ModalRegistrarFalta" src/` para
  confirmar).
- **Não remover** `ModalCorrigirFalta` nem `faltaSelecionada`/`isCorrigirOpen`/`closeCorrigirModal` — isso é o
  fluxo de correção, fora de escopo.

### B.3 — Não alterar mais nada neste arquivo

Igual à Seção A.4.

---

## 7. Parte C — `src/lib/route-guards.ts`

Adicionar duas novas entradas em `ROUTE_PERMISSIONS`, próximas ao bloco `// NOTAS / FALTAS` já existente:

```ts
{
  path: '/notas/lancar',
  allowedTypes: ['academia'],
  redirectIfUnauthorized: '/notas',
},
{
  path: '/faltas/lancar',
  allowedTypes: ['academia'],
  redirectIfUnauthorized: '/faltas',
},
```

---

## 8. Parte D — Nova rota `/notas/lancar`

Criar o diretório `src/app/(painel)/notas/lancar/` com a seguinte composição de arquivos (mesma organização de
`estudantes/cadastrar/`, adaptada ao domínio de notas):

```
src/app/(painel)/notas/lancar/
├── page.tsx                     # wrapper de rota + metadata
├── PageContent.tsx              # guarda de acesso (academia) + "Voltar para notas" + orquestra o fluxo
├── LancamentoNotasForm.tsx      # máquina de estados (verificando → normal → progresso), equivalente a CadastroMassaForm.tsx
├── SelecaoContextoNotas.tsx     # seleção em cascata: Nível → Curso → Ano Acadêmico → Turma → Período → Matéria → Categoria
├── notasTemplate.ts             # gera o .xlsx pré-preenchido com os estudantes da turma
├── notasParser.ts               # lê/valida o .xlsx enviado
├── notasTypes.ts                # ContextoModeloNotas, NotaBulkRow, ErroValidacao (reaproveitar tipo de erro), ResultadoAnaliseNotas
├── notasPayload.ts              # linha validada + contexto → RegistrarNotasRequest
├── notasApi.ts                  # chamada a academiaService.registrarNotaBatchAsync
├── notasDraft.ts                # rascunho em localStorage (mesmo padrão de massaDraft.ts)
├── notasErrorExport.ts          # exporta .xlsx só com linhas com erro/falha
└── BatchProgressScreenNotas.tsx # adaptação de BatchProgressScreen.tsx para este domínio (ver Seção 10)
```

### 8.1 — `page.tsx`

```tsx
import React from "react";
import { Metadata } from "next";
import PageContent from "./PageContent";

export const metadata: Metadata = {
  title: "Lançar Notas",
};

export default function LancarNotasPage() {
  return <PageContent />;
}
```

### 8.2 — `PageContent.tsx`

Copiar a estrutura de `estudantes/cadastrar/PageContent.tsx`, adaptando:
- `PageBreadcrumb pageTitle="Lançar Notas"`.
- Guarda: `requiredTypes={['academia']}`, mensagem `"Esta página está disponível apenas para academias."`.
- Link "Voltar" apontando para `/notas` (texto: "Voltar para notas").
- Sem abas "Individual"/"Massa" (decisão D2/D5) — renderiza direto `<LancamentoNotasForm />`.

### 8.3 — `SelecaoContextoNotas.tsx`

Copiar `SelecaoContextoMassa.tsx` como ponto de partida e adaptar:

1. **Remover** a escolha "Modo de cadastro" (turma/geral) — aqui é sempre por turma (decisão D5).
2. Manter a cascata **Nível de ensino → Curso (quando aplicável) → Ano Acadêmico → Turma**, com as mesmas regras
   já implementadas em `niveisDisponiveis`/`precisaCurso`/`anosDisponiveis`/`turmasCompativeis`:
   - Ensino Primário e Iº Ciclo (`nivel === 'fundamental'`): não mostra Curso; mostra direto Ano Acadêmico → Turma.
   - Ensino Médio (`nivel === 'medio'`): Curso → Ano Acadêmico → Turma.
   - Ensino Superior (`nivel === 'superior'`): Curso → Ano Acadêmico → Turma.
   - Academia do tipo "misto" (`user.academia.nivel_escolar === 'misto'`): `niveisDisponiveis` já retorna
     `['fundamental', 'medio']` nesse caso — ou seja, a pessoa primeiro escolhe entre os dois caminhos (via o
     seletor "Nível de ensino", que já aparece quando `niveisDisponiveis.length > 1`) e a partir daí segue
     exatamente o caminho daquele nível. **Não reinventar essa lógica** — ela já está correta em
     `SelecaoContextoMassa.tsx`.
3. **Adicionar**, depois da Turma ser escolhida, mais dois (ou três) seletores novos, só habilitados quando há uma
   turma selecionada:
   - **Período** (`Trimestre` para escola, `Semestre` para superior) — usar as mesmas listas/labels já definidas em
     `NotasAcademia.tsx` (`PERIODOS_ESCOLA`, `PERIODOS_SUPERIOR`, `PERIODOS_LABEL`) — não recriar essas constantes
     em outro formato, apenas importar/replicar os mesmos valores literais para não haver risco de desalinhamento
     com o back-end (`Periodo` em `types/api.ts`).
   - **Matéria** (`materia_disciplinar_id`) — buscar via `academiaService.listarMaterias(token)`, filtrando por
     `status === 'ativo'` e pela mesma regra de compatibilidade já usada em `NotasAcademia.tsx` (função inline no
     `useEffect` de pré-seleção de matéria, por volta da linha 872–878): a matéria deve ter `anos_academicos`
     incluindo o ano acadêmico escolhido; se a turma tiver `curso_id`, a matéria (se tiver `curso_id`) precisa
     bater; se o nível for superior, o `periodo` da matéria (quando definido) precisa bater com o período
     escolhido.
   - **Categoria** (`categoria`) — **somente para notas** (não existe para faltas). Regras:
     - Se `!isSuperior` (escolar): usar a lista fixa `CATEGORIAS_ESCOLAR` já definida em `NotasAcademia.tsx`,
       filtrando pelas categorias cujo `anos_academicos` inclui o ano acadêmico escolhido.
     - Se `isSuperior`: buscar via `academiaService.listarCategoriasNota(token)`, filtrando `status !== 'inativo'`
       e por `anos_academicos` (vazio = vale para todos, ou precisa incluir o ano escolhido) — mesma regra de
       `categoriasSuperioresDoAno` em `NotasAcademia.tsx`.
4. A ordem final dos campos na tela deve ser: **Nível → Curso (se aplicável) → Ano Acadêmico → Turma → Período →
   Matéria → Categoria**. Todos obrigatórios para liberar o botão "Baixar Modelo de Excel".
5. Ao carregar a turma escolhida, buscar os estudantes dessa turma via
   `consultasService.listarEstudantes({ token, codigo_turma: turma.codigo_turma })` (mesma chamada já usada em
   `NotasAcademia.tsx`, linha ~845) e exibir logo abaixo do seletor de Turma um resumo, ex.: `"18 estudante(s)
   nesta turma"`. Se vier `0` estudantes, desabilitar o botão de baixar modelo e mostrar aviso: *"Esta turma não
   tem estudantes ativos. Adicione estudantes à turma antes de lançar notas."*
6. Reaproveitar `SearchableSelect` para todos os selects (igual ao `SelecaoContextoMassa.tsx`), inclusive Período,
   Matéria e Categoria.
7. Ao clicar em "Baixar Modelo de Excel": montar o `ContextoModeloNotas` (ver 8.5) com todos os campos acima
   (incluindo `nome`/`id` de matéria e categoria para exibir depois nos resumos de tela) e chamar
   `gerarModeloExcelNotas(contexto, estudantesDaTurma)` (ver 8.4), depois `onModeloGerado(contexto)`.

### 8.4 — `notasTemplate.ts` — especificação exata do `.xlsx`

Função principal:

```ts
export function gerarModeloExcelNotas(
  contexto: ContextoModeloNotas,
  estudantes: { nome: string; codigo_estudante: string }[]
): void
```

Estrutura do workbook (3 abas, igual ao padrão de `massaTemplate.ts`):

1. **Aba "Instruções"** (texto de apoio, mesmo estilo de `montarLinhasInstrucoes`):
   - Título: "Modelo de Lançamento de Notas — Spuri".
   - Linhas: Academia, Turma (`turmaLabel` ou `codigoTurma`), Curso (se houver), Ano Acadêmico, Período, Matéria,
     Categoria, "Gerado em".
   - Instruções numeradas, adaptadas de `montarLinhasInstrucoes`, cobrindo pelo menos:
     1. Preencha a nota na folha "Notas", coluna "Valor da Nota", a partir da linha 2.
     2. Não altere cabeçalhos, nomes de colunas, nem o nome/ordem das folhas.
     3. Não é preciso preencher turma, período, matéria ou categoria — este modelo já está definido para esse
        contexto.
     4. Não é preciso preencher todos os estudantes de uma vez — linhas com "Valor da Nota" em branco são
        simplesmente ignoradas no envio; pode reenviar depois para completar os que faltarem.
     5. A nota deve ser um número entre 0 e 20 (aceita casas decimais, ex.: 14.5).
     6. Não adicione nem remova linhas de estudantes — se um estudante não aparecer na lista, verifique se ele
        pertence à turma selecionada. Adicionar estudantes que não sejam desta turma resulta em erro de validação.

2. **Aba "Notas"** (única lida na importação):
   - Cabeçalho na linha 1 (mesmo estilo visual de `COLUNAS_MODELO_MASSA`: preenchimento `ABDBE3`, negrito, centrado,
     `wrapText`): `["Nome do Estudante", "Código do Estudante", "Valor da Nota"]`.
   - **Uma linha por estudante da turma** (não 1000 linhas em branco como no cadastro de estudantes) — a lista
     recebida em `estudantes`, **ordenada crescentemente pelo nome** (`localeCompare` com `sensitivity: "base"`,
     locale `"pt"`, igual ao padrão já usado em `TabelaNotasEscolar`/`TabelaNotasSuperior`).
   - Colunas A (Nome) e B (Código) vêm **preenchidas e formatadas como texto** (`z: '@'`), célula a célula, com o
     nome e o `codigo_estudante` de cada estudante.
   - Coluna C (Valor da Nota) vem **vazia**, formatada como texto (`z: '@'`) para não deixar o Excel converter
     automaticamente e para preservar a possibilidade de casas decimais com vírgula ou ponto sem reformatação
     estranha — o parser deve aceitar tanto `,` quanto `.` como separador decimal (ver 8.6).
   - Largura de colunas sugerida: Nome 30, Código 22, Valor da Nota 16.
   - `!autofilter` na linha de cabeçalho (mesmo padrão de `massaTemplate.ts`).

3. **Aba oculta `"_meta"`** — o identificador do modelo. Estrutura `chave/valor`, mesmo padrão de
   `montarLinhasMeta`/`gerarModeloExcel`, com estas chaves (todas como string):
   ```
   versao_modelo
   codigo_academia
   nome_academia
   nivel                  // 'fundamental' | 'medio' | 'superior'
   curso_id                // vazio quando não aplicável
   curso_nome
   ano_academico
   ano_academico_label
   codigo_turma            // *** identificador principal do modelo ***
   turma_label
   periodo                 // valor cru, ex.: "1_trimestre" ou "1_semestre"
   periodo_label
   materia_disciplinar_id
   materia_nome
   categoria                // código da categoria, ex.: "nota_professor" ou "nota_xyz"
   categoria_nome
   tipo_nota                // 'escolar' | 'superior' — igual a TipoNota
   gerado_em                // new Date().toISOString()
   ```
   Ocultar a aba exatamente como em `massaTemplate.ts` (`Workbook.Sheets[i] = { Hidden: 1 }` para o índice de
   `_meta`).

Nome do arquivo gerado — **o código da turma é o componente central do nome**, conforme pedido do usuário:

```ts
export function gerarNomeArquivoModeloNotas(contexto: ContextoModeloNotas): string {
  return `modelo-lancamento-notas-${slugify(contexto.codigoTurma)}-${slugify(contexto.periodoLabel || contexto.periodo)}.xlsx`;
}
```//
(reaproveitar a função `slugify` — copiar de `massaTemplate.ts`, ela é pequena e não depende de nada externo).

### 8.5 — `notasTypes.ts`

```ts
export interface ContextoModeloNotas {
  codigoAcademia: string;
  nomeAcademia: string;
  nivel: 'fundamental' | 'medio' | 'superior';
  cursoId?: string;
  cursoNome?: string;
  anoAcademico: string;
  anoAcademicoLabel: string;
  codigoTurma: string;
  turmaLabel?: string;
  periodo: string;
  periodoLabel: string;
  materiaId: string;
  materiaNome: string;
  categoria: string;
  categoriaNome: string;
  tipoNota: 'escolar' | 'superior';
  versaoModelo: string;
}

export interface NotaBulkRow {
  linha: number;              // linha real no Excel (1-indexado)
  nome: string;
  codigoEstudante: string;
  valorNotaTexto: string;     // valor bruto da célula
  valorNota?: number;         // convertido, quando válido
}

export interface ErroValidacao {              // igual ao de estudantes/cadastrar — pode até importar de lá
  linha: number;
  coluna: string;
  campo: string;
  valor: string;
  mensagem: string;
}

export interface ResultadoAnaliseNotas {
  contexto: ContextoModeloNotas | null;
  linhas: NotaBulkRow[];       // apenas linhas com "Valor da Nota" preenchido (ver 8.6)
  totalLinhasIgnoradas: number; // linhas do estudante presentes na planilha mas sem nota preenchida (não são erro)
  erros: ErroValidacao[];
  totalLinhas: number;         // = linhas.length (apenas as preenchidas)
}
```

> Se preferir, o Codex pode importar o tipo `ErroValidacao` diretamente de
> `../../estudantes/cadastrar/massaTypes` em vez de duplicá-lo — ambas as abordagens são aceitáveis; **duplicar é
> preferível** para não criar acoplamento entre os dois fluxos (consistente com o comentário já presente em
> `massaHelpers.ts`: *"Mantido isolado do fluxo de cadastro singular para evitar acoplamento entre os dois."*).

### 8.6 — `notasParser.ts` — regras de validação

Função principal: `analisarPlanilhaNotas(file: File, codigoAcademiaAtual: string, turmasAtivas: Turma[]):
Promise<ResultadoAnaliseNotas>`.

Passos (espelhando `massaParser.ts`):

1. Ler o workbook (`XLSX.read`). Se falhar → erro geral "Não foi possível abrir este ficheiro...".
2. Ler `_meta`. Se não existir ou faltar `codigo_academia`/`nivel`/`codigo_turma`/`periodo`/`materia_disciplinar_id`
   → erro geral: *"Este ficheiro não foi reconhecido como um modelo do Spuri..."*.
3. Se `contexto.codigoAcademia !== codigoAcademiaAtual` → erro geral (mesma mensagem de `massaParser.ts`, adaptada).
4. **Validação adicional específica deste fluxo:** confirmar que `contexto.codigoTurma` corresponde a uma turma
   **ativa** dentro de `turmasAtivas` (lista passada pelo componente, buscada de novo no momento do upload, não a
   turma escolhida há vários minutos na tela de configuração — a pessoa pode ter aberto o modelo antigo). Se não
   encontrar → erro geral: *"A turma deste modelo (`<codigo_turma>`) não existe mais ou foi desativada. Baixe um
   novo modelo para uma turma ativa."*
5. Ler a aba `"Notas"`. Se não existir → erro geral (mensagem análoga a `massaParser.ts`).
6. Para cada linha de dados (a partir da linha 2):
   - Ler Nome (col A), Código do Estudante (col B), Valor da Nota (col C).
   - Se as três células estiverem vazias, pular a linha (não conta nem como erro nem como `totalLinhasIgnoradas` —
     é apenas ruído de planilha).
   - Se Nome/Código estiverem preenchidos mas **Valor da Nota estiver vazio**: **não é erro** — incrementar
     `totalLinhasIgnoradas` e não incluir a linha em `linhas` (decisão D-implícita: permitir lançar nota só de
     parte da turma).
   - Se Valor da Nota estiver preenchido:
     - Código do Estudante é obrigatório (coluna B). Se vazio → erro coluna B, campo "Código do Estudante": *"O
       código do estudante é obrigatório quando a nota é preenchida."*
     - Normalizar Valor da Nota: aceitar tanto `,` quanto `.` como separador decimal antes de `Number(...)`. Se
       não for numérico → erro coluna C: *"O valor da nota deve ser um número entre 0 e 20 (ex.: 14 ou 14.5)."*
     - Se numérico mas fora de `[0, 20]` → erro coluna C: *"A nota deve estar entre 0 e 20."*
7. Depois de montar todas as linhas válidas (com nota preenchida), validar se os `codigoEstudante` batem com os
   estudantes atuais da turma (o componente deve buscar a lista atual de estudantes da turma — via
   `consultasService.listarEstudantes({ codigo_turma })` — **no momento do upload**, não reaproveitar a lista
   carregada há minutos na tela de configuração) — se um código não pertencer a essa lista → erro coluna B:
   *"Este código de estudante não pertence (ou não pertence mais) à turma selecionada."*
8. Retornar `ResultadoAnaliseNotas` com `contexto`, `linhas` (só as preenchidas e válidas + as preenchidas com
   erro, para exibição de relatório — siga o mesmo padrão de `massaParser.ts`, que inclui linhas com erro em
   `linhas` e os erros à parte em `erros`), `erros`, `totalLinhas`, `totalLinhasIgnoradas`.
9. Se, ao final, `linhas.length === 0` (nenhuma nota preenchida em nenhuma linha) → tratar como caso especial na
   tela de relatório (ver 8.8): mensagem "Nenhuma nota foi preenchida nesta planilha." em vez do fluxo normal de
   confirmação.

### 8.7 — `notasPayload.ts`

```ts
export function construirPayloadNota(linha: NotaBulkRow, contexto: ContextoModeloNotas): RegistrarNotasRequest {
  return {
    codigo_estudante: linha.codigoEstudante.trim(),
    periodo: contexto.periodo as RegistrarNotasRequest['periodo'],
    materia_disciplinar_id: contexto.materiaId,
    tipo: contexto.tipoNota,
    categoria: contexto.categoria,
    nota: linha.valorNota as number,
  };
}
```

### 8.8 — `notasApi.ts`

```ts
export function registrarNotasBatch(
  notas: RegistrarNotasRequest[],
  token?: string
): Promise<AsyncBatchResponse> {
  return academiaService.registrarNotaBatchAsync(notas, token);
}
```

### 8.9 — Limite de lote para notas

**Atenção — diferente do cadastro de estudantes:** o limite documentado para
`POST /academia/notas-aluno/async` é **2000 itens por requisição** (não 100). Definir em `LancamentoNotasForm.tsx`
(ou em um pequeno helper local) `LIMITE_NOTAS_POR_LOTE = 2000` e usar a mesma função `dividirEmLotes` (importada de
`../../estudantes/cadastrar/massaHelpers`, que é genérica o suficiente para ser reaproveitada, ou duplicada
localmente — preferir importar, já que é uma função pura sem estado). Como uma turma normalmente tem bem menos de
2000 estudantes, na prática quase sempre haverá 1 lote só — mas a divisão deve existir para não quebrar em turmas
grandes hipotéticas ou reenvios agregados.

### 8.10 — `LancamentoNotasForm.tsx`

Copiar a máquina de estados de `CadastroMassaForm.tsx` quase 1:1, adaptando:
- `jobApiService.list` filtrando por `j.type === 'registrar_nota_batch'` (ver `JobType` em `job-service.ts`) em vez
  de `'register_estudante_batch'`.
- `registrarEstudantesBatchSemArquivo` → `registrarNotasBatch` (8.8).
- `construirPayloadEstudante` → `construirPayloadNota` (8.7).
- `LIMITE_ESTUDANTES_POR_LOTE` → `LIMITE_NOTAS_POR_LOTE = 2000` (8.9).
- Rascunho: `notasDraft.ts`, mesmo padrão de `massaDraft.ts`, mas guardando `RegistrarNotasRequest[]` em vez de
  `CriarEstudanteRequest[]`, com chave de storage própria, ex.: `'spuri:lancamento-notas:rascunho:v1'`. A função de
  "chave do item" para deduplicar (`chaveEstudante` em `massaDraft.ts`) deve virar `chaveNota`, usando
  `codigo_estudante + periodo + materia_disciplinar_id + categoria` como identidade (uma nota é "a mesma" se tiver
  o mesmo estudante+período+matéria+categoria).
- Usa `SelecaoContextoNotas` no lugar de `SelecaoContextoMassa`.
- Usa `UploadPlanilhaMassa` **reaproveitado tal como está** (ele já é genérico — recebe `onResultado` e uma função
  de análise via prop, ou, se estiver hard-coded para `analisarPlanilha` de estudantes, adaptar para aceitar a
  função de análise como prop, ou duplicar o componente localmente como `UploadPlanilhaNotas.tsx` chamando
  `analisarPlanilhaNotas`; **verifique o código real antes de decidir** — se `UploadPlanilhaMassa.tsx` já importa
  `analisarPlanilha` diretamente (sem prop), a forma mais simples é duplicar o componente localmente, trocando
  apenas essa chamada).
- Usa `RelatorioValidacaoNotas.tsx` (adaptação de `RelatorioValidacaoMassa.tsx`, ver 8.11).
- Usa `BatchProgressScreenNotas.tsx` (ver 8.12).

### 8.11 — `RelatorioValidacaoNotas.tsx`

Adaptar `RelatorioValidacaoMassa.tsx`:
- Resumo do cabeçalho mostra: nível, curso (se houver), ano acadêmico, **turma**, **período**, **matéria**,
  **categoria** — todos vindos do `contexto`.
- Contagem: `"X nota(s) preenchida(s) na planilha"` (em vez de "estudante(s)"), e mostrar também, se
  `totalLinhasIgnoradas > 0`: *"Y estudante(s) desta turma ficaram sem nota preenchida — serão ignorados neste
  envio."* (texto informativo, não erro).
- Caso especial: se `totalLinhas === 0` (nenhuma nota preenchida), mostrar mensagem específica: *"Nenhuma nota foi
  preenchida nesta planilha. Preencha a coluna 'Valor da Nota' para pelo menos um estudante e envie novamente."*
- Texto do botão de confirmação: `"Confirmar lançamento de N nota(s)"` / com lotes: `"Confirmar lançamento de N
  nota(s) em M grupos"`.
- Botão de baixar planilha apenas com erros (`baixarLinhasComErro` adaptado em `notasErrorExport.ts`) — mesma ideia
  de `massaErrorExport.ts`, mas com cabeçalho `["Nome do Estudante", "Código do Estudante", "Valor da Nota"]` e
  meta com as novas chaves da Seção 8.4.

### 8.12 — `BatchProgressScreenNotas.tsx`

Copiar `BatchProgressScreen.tsx` quase 1:1, trocando:
- Tipos de `contexto` para `ContextoModeloNotas | null`.
- `baixarEstudantesComFalha`/`baixarRascunhoEstudantesPendentes` → equivalentes em `notasErrorExport.ts`
  (`baixarNotasComFalha`, `baixarRascunhoNotasPendentes`), com o mesmo comportamento, adaptando os nomes de campo
  do payload exibido na lista de falhas (usar `payload.codigo_estudante` para identificar a linha, já que não há
  `nome` no `RegistrarNotasRequest` — se quiser mostrar o nome do estudante na lista de falhas, é necessário guardar
  um mapa `codigo_estudante → nome` no componente pai, a partir de `estudantesDaTurma`, e passá-lo como prop
  opcional para exibição — **não é obrigatório**, mas melhora a UX; se implementar, documente no relatório final).
- Textos "estudantes" → "notas" nos rótulos de progresso (ex.: "X de Y notas processadas").
- `lerRascunhoCadastroMassa`/`salvarRascunhoCadastroMassa`/`removerEstudantesCadastradosDoRascunho` →
  equivalentes de `notasDraft.ts`.

---

## 9. Parte E — Nova rota `/faltas/lancar`

Estrutura de arquivos análoga à Parte D, dentro de `src/app/(painel)/faltas/lancar/`:

```
src/app/(painel)/faltas/lancar/
├── page.tsx
├── PageContent.tsx
├── LancamentoFaltasForm.tsx
├── SelecaoContextoFaltas.tsx
├── faltasTemplate.ts
├── faltasParser.ts
├── faltasTypes.ts
├── faltasPayload.ts
├── faltasApi.ts
├── faltasDraft.ts
├── faltasErrorExport.ts
└── BatchProgressScreenFaltas.tsx
```

Tudo segue exatamente o mesmo raciocínio da Parte D, com estas diferenças específicas:

### 9.1 — `SelecaoContextoFaltas.tsx`

Igual à Seção 8.3, **mas sem seletor de Categoria** (faltas não têm categoria). Cascata final: **Nível → Curso (se
aplicável) → Ano Acadêmico → Turma → Período → Matéria**.

### 9.2 — `faltasTemplate.ts` — colunas exatas

Cabeçalho da aba `"Faltas"`: `["Nome do Estudante", "Código do Estudante", "Data da Falta", "Quantidade"]`.

- Colunas A e B: preenchidas por estudante da turma, ordenadas crescentemente pelo nome — igual à Seção 8.4.
- Coluna C ("Data da Falta"): vazia, formatada como texto (`z: '@'`), com instrução para o formato `DD/MM/AAAA`
  (mesmo padrão de robustez de `celulaData` em `massaParser.ts`, que também sabe converter de volta quando o Excel
  transforma a célula num número de data nativo).
- Coluna D ("Quantidade"): vazia, formatada como texto, número inteiro ≥ 1.
- **Linhas extras em branco ao final:** depois da última linha de estudante, adicionar **20 linhas extras em
  branco** (sem nome/código pré-preenchidos) para permitir registrar mais de uma falta do mesmo estudante em datas
  diferentes dentro do mesmo período — nesse caso a pessoa preenche manualmente Nome/Código copiando de uma das
  linhas já preenchidas, ou apenas o Código (o Nome nas linhas extras é só informativo, não é usado na validação —
  ver 9.4). Documentar essa decisão claramente no comentário do arquivo, igual ao comentário já existente em
  `massaTemplate.ts` sobre `LINHAS_MODELO_EXCEL`.
- Aba `_meta`: mesmas chaves da Seção 8.4, **exceto** `categoria`/`categoria_nome` (não existem aqui) e
  **exceto** `tipo_nota` (não existe `RegistrarFaltasRequest.tipo`).
- Nome do arquivo: `modelo-lancamento-faltas-${slugify(codigoTurma)}-${slugify(periodoLabel)}.xlsx` — mesmo
  princípio da Seção 8.4 (código da turma como componente central do nome).

### 9.3 — `faltasTypes.ts`

```ts
export interface ContextoModeloFaltas {
  codigoAcademia: string;
  nomeAcademia: string;
  nivel: 'fundamental' | 'medio' | 'superior';
  cursoId?: string;
  cursoNome?: string;
  anoAcademico: string;
  anoAcademicoLabel: string;
  codigoTurma: string;
  turmaLabel?: string;
  periodo: string;
  periodoLabel: string;
  materiaId: string;
  materiaNome: string;
  versaoModelo: string;
}

export interface FaltaBulkRow {
  linha: number;
  nome: string;
  codigoEstudante: string;
  dataTexto: string;
  dataIso?: string;
  dataErro?: string;
  quantidadeTexto: string;
  quantidade?: number;
}
```
(mais `ErroValidacao`/`ResultadoAnaliseFaltas`, mesmo espírito da Seção 8.5).

### 9.4 — `faltasParser.ts` — regras de validação

Mesma estrutura da Seção 8.6, adaptando:
- Uma linha só é considerada "preenchida" (e por isso validada/enviada) se **Data OU Quantidade** estiver
  preenchida — e, nesse caso, **as duas passam a ser obrigatórias** (erro se só uma estiver preenchida):
  - Se Data vazia e Quantidade preenchida → erro coluna C: *"Informe a data da falta."*
  - Se Data preenchida e Quantidade vazia → erro coluna D: *"Informe a quantidade de faltas."*
- Data: reaproveitar a mesma lógica de `celulaData`/parse de `DD/MM/AAAA` de `massaParser.ts` (incluindo o
  tratamento de célula convertida para número de data nativo pelo Excel). Erros de formato/data inválida usam as
  mesmas mensagens já usadas lá, adaptadas ao campo.
- Quantidade: inteiro ≥ 1. Se não for número inteiro válido ou for `< 1` → erro coluna D: *"A quantidade deve ser
  um número inteiro maior ou igual a 1."*
- Código do Estudante: obrigatório quando a linha está preenchida (mesma regra da Seção 8.6, item 6), e validado
  contra a lista atual de estudantes da turma no momento do upload (mesma regra do item 7 da Seção 8.6).
- Linhas totalmente vazias (inclusive as 20 linhas extras não usadas) são ignoradas, sem contar em erro nem em
  `totalLinhasIgnoradas`.
- `totalLinhasIgnoradas` aqui conta apenas as linhas de estudante pré-preenchidas (Nome+Código presentes) cuja
  Data e Quantidade ficaram ambas vazias — mesmo raciocínio informativo da Seção 8.6.

### 9.5 — `faltasPayload.ts`

```ts
export function construirPayloadFalta(linha: FaltaBulkRow, contexto: ContextoModeloFaltas): RegistrarFaltasRequest {
  return {
    codigo_estudante: linha.codigoEstudante.trim(),
    data: linha.dataIso as ApiDate,
    materia_disciplinar_id: contexto.materiaId,
    periodo: contexto.periodo as RegistrarFaltasRequest['periodo'],
    quantidade: linha.quantidade as number,
  };
}
```

### 9.6 — `faltasApi.ts`

```ts
export function registrarFaltasBatch(
  faltas: RegistrarFaltasRequest[],
  token?: string
): Promise<AsyncBatchResponse> {
  return academiaService.registrarFaltasBatchAsync(faltas, token);
}
```

### 9.7 — Limite de lote para faltas

Igual à Seção 8.9: **2000 itens por requisição** (`POST /academia/faltas-aluno/async`, documentado). Usar
`LIMITE_FALTAS_POR_LOTE = 2000`.

### 9.8 — Restante

`LancamentoFaltasForm.tsx`, `RelatorioValidacaoFaltas.tsx` (se optar por extrair, ou inline em
`LancamentoFaltasForm.tsx`/reaproveitar `RelatorioValidacaoMassa.tsx` adaptado) e `BatchProgressScreenFaltas.tsx`
seguem exatamente o mesmo raciocínio das Seções 8.10–8.12, trocando o `JobType` filtrado para
`'registrar_faltas_batch'` e os textos "nota(s)" → "falta(s)".

---

## 10. Contrato de dados — referência rápida

```ts
// src/types/api.ts
export interface RegistrarNotasRequest {
  codigo_estudante: string;
  periodo: Periodo;
  materia_disciplinar_id: string;
  tipo: TipoNota;           // 'escolar' | 'superior'
  categoria: string;
  nota: number;              // 0–20
  observacao?: string;       // não usado neste fluxo em lote — omitir
}

export interface RegistrarFaltasRequest {
  codigo_estudante: string;
  data: ApiDate;              // "AAAA-MM-DD"
  materia_disciplinar_id: string;
  periodo: Periodo;
  quantidade: number;         // >= 1
  observacao?: string;        // não usado neste fluxo em lote — omitir
}
```

Endpoints (já existentes, não criar/alterar nada no back-end):

| Endpoint | Item do array | Limite por requisição | Resposta |
|---|---|---|---|
| `POST /academia/notas-aluno/async` | `RegistrarNotasRequest` | 2000 | `202` + `job_id` |
| `POST /academia/faltas-aluno/async` | `RegistrarFaltasRequest` | 2000 | `202` + `job_id` |

Acompanhamento: `GET /jobs/:id` (polling, via `jobApiService.getStatus`/`pollJob`) e `GET /jobs/:id?results=true`
(detalhe com erro por item, via `jobApiService.getDetail`). Já implementado em `job-service.ts` — **não recriar**,
apenas reaproveitar.

---

## 11. Estrutura final de arquivos (visão consolidada)

```
src/lib/route-guards.ts                                  (editar)
src/components/notas/NotasAcademia.tsx                    (editar)
src/components/faltas/FaltasAcademia.tsx                  (editar)

src/app/(painel)/notas/lancar/
├── page.tsx                          (novo)
├── PageContent.tsx                   (novo)
├── LancamentoNotasForm.tsx           (novo)
├── SelecaoContextoNotas.tsx          (novo)
├── UploadPlanilhaNotas.tsx           (novo, se não for possível reaproveitar o de estudantes via prop)
├── RelatorioValidacaoNotas.tsx       (novo)
├── BatchProgressScreenNotas.tsx      (novo)
├── notasTemplate.ts                  (novo)
├── notasParser.ts                    (novo)
├── notasTypes.ts                     (novo)
├── notasPayload.ts                   (novo)
├── notasApi.ts                       (novo)
├── notasDraft.ts                     (novo)
└── notasErrorExport.ts               (novo)

src/app/(painel)/faltas/lancar/
├── page.tsx                          (novo)
├── PageContent.tsx                   (novo)
├── LancamentoFaltasForm.tsx          (novo)
├── SelecaoContextoFaltas.tsx         (novo)
├── UploadPlanilhaFaltas.tsx          (novo, mesma ressalva acima)
├── RelatorioValidacaoFaltas.tsx      (novo)
├── BatchProgressScreenFaltas.tsx     (novo)
├── faltasTemplate.ts                 (novo)
├── faltasParser.ts                   (novo)
├── faltasTypes.ts                    (novo)
├── faltasPayload.ts                  (novo)
├── faltasApi.ts                      (novo)
├── faltasDraft.ts                    (novo)
└── faltasErrorExport.ts              (novo)
```

---

## 12. Checklist de aceitação

- [ ] Em `/notas`, o botão fica escrito **"Lançar Notas"**, posicionado imediatamente ao lado do título "Gestão de
      Notas" (não mais isolado à direita do cabeçalho).
- [ ] Em `/faltas`, o botão fica escrito **"Lançar Faltas"**, mesma posição relativa ao título "Gestão de Faltas".
- [ ] Clicar em "Lançar Notas" navega para `/notas/lancar`; clicar em "Lançar Faltas" navega para `/faltas/lancar`.
- [ ] `/notas/lancar` e `/faltas/lancar` só são acessíveis para usuários do tipo `academia` (redirecionam/mostram
      acesso negado para admin/estudante).
- [ ] Em `/notas/lancar`, a cascata de seleção segue exatamente: Fundamental → Ano Acadêmico → Turma; Médio → Curso
      → Ano Acadêmico → Turma; Superior → Curso → Ano Acadêmico → Turma; Misto → escolhe Fundamental ou Médio → daí
      segue o caminho correspondente. Depois da Turma: Período → Matéria → Categoria.
- [ ] Em `/faltas/lancar`, mesma cascata, sem o passo de Categoria.
- [ ] O modelo `.xlsx` baixado vem **pré-preenchido** com Nome e Código de cada estudante ativo da turma
      selecionada, **em ordem crescente pelo nome**.
- [ ] O modelo de notas tem exatamente as colunas: Nome do Estudante, Código do Estudante, Valor da Nota.
- [ ] O modelo de faltas tem exatamente as colunas: Nome do Estudante, Código do Estudante, Data da Falta,
      Quantidade.
- [ ] O `codigo_turma` está presente na aba oculta `_meta` do modelo e é usado para validar/rejeitar planilhas de
      turmas que não existem mais/estão inativas no momento do upload.
- [ ] Planilhas de outra academia são rejeitadas com mensagem clara.
- [ ] Linhas sem nota (ou sem data+quantidade) preenchida são ignoradas silenciosamente (não geram erro).
- [ ] Linhas com dado parcial (ex.: só data, sem quantidade) geram erro específico e didático, apontando linha e
      coluna.
- [ ] Envio é dividido automaticamente em lotes de até 2000 itens (na prática, quase sempre 1 lote).
- [ ] Tela de progresso acompanha o(s) job(s) via polling e mostra sucesso/falha por item ao concluir, com opção de
      baixar planilha só com os itens que falharam.
- [ ] Nenhuma alteração foi feita em `ModalCorrigirNota`, `ModalCorrigirFalta`, `NotasEstudante.tsx`,
      `NotasAdmin.tsx`, `FaltasEstudante.tsx`, `FaltasAdmin.tsx`, nem em `/estudantes/cadastrar/**`.
- [ ] Botão "Categoria" (Ensino Superior) em `/notas` continua funcionando, agora abrindo direto o formulário de
      categoria (sem aba "Registar").

---

## 13. O que o Codex **deve** validar (rodar e reportar)

O ambiente do Codex bloqueia `apt` (403 Forbidden) e não tem Docker nem `psql`. **Não tente instalar nada fora do
gerenciador de pacotes Node (`npm`)** — os domínios de rede liberados cobrem `registry.npmjs.org`/`npmjs.com`, que é
o suficiente para `npm install`.

Rodar, nesta ordem, e colar a saída relevante no relatório final (Seção 14):

1. `npm install` (se `node_modules` não existir ou o lockfile tiver sido tocado).
2. `npx tsc --noEmit` — checagem de tipos completa do projeto. **Zero erros novos** introduzidos pela tarefa
   (erros pré-existentes no repositório, se houver, devem ser listados separadamente e não são responsabilidade
   desta tarefa).
3. `npm run lint` — zero erros novos de ESLint nos arquivos tocados/criados.
4. `npm run build` — o build de produção do Next precisa completar sem falhas nas novas rotas
   (`/notas/lancar`, `/faltas/lancar`) e nas rotas editadas (`/notas`, `/faltas`).
5. Se for viável no tempo disponível, escrever um pequeno script Node ad-hoc (fora da árvore `src/`, ex.: em
   `/tmp` ou apagado ao final) que importe as funções puras de geração/parse de planilha (`gerarModeloExcelNotas`,
   `analisarPlanilhaNotas`, `gerarModeloExcelFaltas`, `analisarPlanilhaFaltas`) com dados fictícios de 2–3
   estudantes, gere o `.xlsx` em memória/disco, releia com a própria função de parser e confirme que:
   - o contexto (`_meta`) é lido corretamente, incluindo `codigo_turma`;
   - uma linha com nota válida (ex.: `14.5`) é aceita;
   - uma linha com nota fora da faixa (ex.: `25`) gera erro;
   - uma linha com código de estudante que não pertence à lista informada gera erro;
   - (faltas) uma linha com data preenchida e quantidade vazia gera erro específico.
   Isso não depende de back-end/Postgres — é só JS puro rodando sobre a biblioteca `xlsx`, e serve como evidência de
   que o parser/gerador funcionam de ponta a ponta antes de qualquer teste manual na interface.
6. `grep -rn "ModalRegistrarFalta" src/` e `grep -rn "abrirModalNovaNota\b" src/` (sem a barra invertida real,
   apenas para casar a palavra completa) — confirmar que não sobraram referências órfãs depois das remoções da
   Seção 5/6, e colar o resultado no relatório.

---

## 14. O que fica para o orquestrador (Claude) validar depois

Não tente fazer nada disto — apenas devolva o código pronto e o relatório da Seção 15:

- Rodar `npm run dev` com o back-end real conectado (PostgreSQL via Docker) e testar o fluxo fim a fim: baixar
  modelo → preencher → enviar → acompanhar job → conferir que a nota/falta aparece na tabela de `/notas`/`/faltas`.
- Confirmar visualmente, em telas de diferentes tamanhos, que o novo posicionamento do botão ao lado do título não
  quebra em mobile.
- Testar o cenário "academia do tipo misto" com uma conta de teste real (fundamental e médio).
- Confirmar que o `route-guards.ts` bloqueia mesmo o acesso direto via URL para admin/estudante.
- Testar reenvio de planilha após falha parcial (rascunho em `localStorage`).

---

## 15. Formato do relatório final que o Codex deve entregar

Ao terminar, o Codex deve devolver um resumo estruturado assim:

```
## Resumo da implementação
- Lista dos arquivos criados
- Lista dos arquivos editados (com um resumo de 1–2 linhas do que mudou em cada um)

## Divergências encontradas em relação a este documento
- (ou "nenhuma", se não houve nenhuma)

## Resultado das validações da Seção 13
1. npm install: OK / FALHOU (colar erro)
2. npx tsc --noEmit: OK / X erro(s) novo(s) (colar)
3. npm run lint: OK / X erro(s) novo(s) (colar)
4. npm run build: OK / FALHOU (colar erro)
5. Script ad-hoc de geração/parse de planilha: OK / FALHOU (colar saída resumida)
6. grep de referências órfãs: OK (nada sobrou) / encontrado X (listar)

## Itens da checklist (Seção 12) não concluídos, se houver
- ...

## Perguntas em aberto para o orquestrador
- ...
```
