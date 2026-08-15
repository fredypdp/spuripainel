---
criado: 15-08-2026
repositorio: fredypdp/spuripainel
branch: main
status: pendente
pre-requisitos: |
  Backend já concluído e em produção (fredypdp/spuri-backend):
  - Tarefa 34 + 38 — período (`periodo`) em Falta, com filtro em
    GET /faltas e GET /faltas-estudante/:codigo. Registos antigos sem
    período determinístico voltam com `periodo: ""` (nunca null).
  - Tarefa 35 + 39 — `codigo_turma` opcional em
    POST /academia/estudante/register e
    POST /academia/estudante/register/async (cada item do array), com
    validação da turma antes de criar o estudante e retorno de
    `codigo_turma` / `turma_vinculada` / `turma_aviso`.
  Nenhuma mudança de backend é necessária para esta tarefa.
---

# Tarefa para o Codex — Período nas Faltas e Cadastro de Estudante Vinculado a Turma

## Prompt recomendado para iniciar a execução

```
Leia por completo o ficheiro
"docs/Tarefa para o Codex — Período nas Faltas e Cadastro de Estudante
Vinculado a Turma (frontend).md" e execute a PARTE A e a PARTE B na
ordem em que estão descritas. Antes de alterar cada ficheiro, abra o
ficheiro espelho indicado (ex.: NotasAcademia.tsx quando for mexer em
FaltasAcademia.tsx) para confirmar o padrão exato de código a
replicar — o objetivo é que Faltas fique estruturalmente idêntico a
Notas onde a tarefa pedir, e que o cadastro de estudante (individual e
em massa) aceite vincular turma exatamente como o backend já suporta.
Não altere nada no repositório spuri-backend. Ao terminar cada parte,
rode `npm run build` (ou `tsc --noEmit`) para garantir que não há
erros de tipo, e valide manualmente os fluxos descritos na secção de
testes de cada parte.
```

## Contexto

Este repositório é o painel (frontend Next.js) do Spuri. O backend já
implementa integralmente os dois recursos abaixo; esta tarefa é
**exclusivamente frontend** — nenhum endpoint novo é necessário.

1. **Período nas faltas.** `GET /faltas`, `GET /faltas-estudante/:codigo`
   e `POST /academia/faltas-aluno` já aceitam/retornam `periodo`
   (`1_trimestre`/`2_trimestre`/`3_trimestre` para escola,
   `N_semestre` para superior — a mesma regra já usada em notas). No
   frontend, `NotasAcademia.tsx`, `NotasAdmin.tsx` e `NotasEstudante.tsx`
   já têm uma camada de navegação "períodos" (uma grelha de botões, um
   por período, antes de mostrar a tabela final). **As telas de Faltas
   (`FaltasAcademia.tsx`, `FaltasAdmin.tsx`, `FaltasEstudante.tsx`) não
   têm esse conceito hoje** — o fluxo vai direto de turma para a
   tabela de faltas, sem seleção de período. Esta tarefa replica nas
   telas de Faltas exatamente a camada de período que já existe em
   Notas.
2. **Cadastro de estudante vinculado a turma.** O backend já aceita
   `codigo_turma` opcional tanto no cadastro individual quanto no
   cadastro em massa. Hoje, no frontend, a turma só pode ser atribuída
   depois, estudante por estudante, na ficha de cada um. Esta tarefa
   adiciona a opção de já vincular a turma no momento do cadastro,
   tanto na tela individual quanto na tela de cadastro em massa (com a
   escolha "por turma" vs. "geral" pedida pelo utilizador).

Convenção usada neste documento: sempre que uma secção disser "espelhe
o padrão de `<ficheiro>`", significa **copiar a mesma estrutura,
nomes de função e forma de renderização**, adaptando apenas o que for
específico de Faltas/Notas ou de cadastro de estudante — não é para
inventar um padrão novo.

---

## Resumo executivo

| # | Onde | O quê |
|---|------|-------|
| A.1 | `src/types/api.ts` | `Falta.periodo`, `RegistrarFaltasRequest.periodo` |
| A.2 | `src/components/faltas/FaltasAcademia.tsx` | Camada "períodos" entre turma e faltas + filtro por período + seletor no modal de registo |
| A.3 | `src/components/faltas/FaltasAdmin.tsx` | Idêntico ao A.2, adaptado ao `acadLayer` |
| A.4 | `src/components/faltas/FaltasEstudante.tsx` | Camada "períodos" entre turma e matérias |
| B.1 | `src/types/api.ts`, `src/lib/api/services.ts` | `codigo_turma` em `CriarEstudanteRequest`; resposta do cadastro com `codigo_turma`/`turma_vinculada`/`turma_aviso` |
| B.2 | `.../estudantes/cadastrar/CadastroSingularForm.tsx` | Seletor de turma opcional no cadastro individual |
| B.3 | `.../estudantes/cadastrar/*` (massa) | Passo 0 "por turma vs. geral", seleção de turma, modelo Excel com `codigo_turma` no `_meta`, parser, payload e relatório atualizados |

---

## PARTE A — Período nas faltas

### A.1 — Tipos (`src/types/api.ts`)

Localize a interface `Falta` (usada em `GET /faltas-estudante/:codigo`
e `GET /faltas`) e `RegistrarFaltasRequest` (usada em
`POST /academia/faltas-aluno`). Hoje nenhuma das duas tem `periodo`;
`Nota`/`RegistrarNotasRequest`, ao lado, já têm. Adicione o campo nas
duas, usando o tipo `Periodo` já exportado (o mesmo usado em `Nota`):

```ts
export interface Falta {
  // ...campos existentes, sem alterar nenhum...
  /**
   * Período em que a falta foi registada (trimestre para escola,
   * semestre para superior). Registos antigos, cadastrados antes da
   * introdução do período, podem vir como string vazia — nunca vem
   * `undefined`/`null`. Trate "" como "período não informado" na UI.
   */
  periodo: Periodo | '';
  // ...
}

export interface RegistrarFaltasRequest {
  // ...campos existentes...
  /** Obrigatório — mesma regra de Nota: trimestre (escola) ou semestre (superior). */
  periodo: Periodo;
  // ...
}
```

Não mexa em `CorrigirFaltaRequest` — o período não é alterável na
correção (o backend não aceita esse campo em
`PUT /academia/atualizar-falta`, igual a notas).

### A.2 — `src/lib/api/services.ts`

Verifique a função `prepareRegistrarFalta` (usada por
`academiaService.registrarFaltas`). Ela já espalha `...data` no corpo
enviado, então basta o tipo `RegistrarFaltasRequest.periodo` passar a
existir — **nenhuma mudança de lógica é necessária aqui**, apenas
confirme que o TypeScript compila sem `any` escondendo o erro (se
houver um `as any` na função, não o remova só por causa desta tarefa,
mas confirme que o campo `periodo` realmente chega ao `body`).

`ListarFaltasParams`/`consultasService.listarFaltas`/
`consultasService.faltasEstudante` **já aceitam `periodo`** como
filtro — não precisam de nenhuma alteração.

### A.3 — `src/components/faltas/FaltasAcademia.tsx`

Abra `src/components/notas/NotasAcademia.tsx` ao lado e siga-o como
referência linha a linha nesta secção. As mudanças são:

**a) Constantes de período.** `NotasAcademia.tsx` define, perto do
topo do ficheiro, `PERIODOS_LABEL`, `PERIODOS_ESCOLA` e
`PERIODOS_SUPERIOR` (mapa de rótulo por período + as duas listas fixas
usadas quando o curso não define `periodos` customizados). Copie essas
três constantes (com os mesmos valores) para `FaltasAcademia.tsx`.

**b) Tipo `Layer`.** Hoje `LayerFund`/`LayerSup` (ou o tipo `Layer`
equivalente) tem os tipos `"anos" | "turmas" | "faltas"` (fund) e
`"cursos" | "anos" | "turmas" | "faltas"` (sup). Insira um novo membro
`"periodos"` entre `"turmas"` e `"faltas"`, espelhando exatamente como
`NotasAcademia.tsx` insere `"periodos"` entre `"turmas"` e `"notas"`
no seu tipo `Layer`:

```ts
| { mode: "fund"; type: "periodos"; nivel: string; turma: Turma }
```
```ts
| { mode: "sup"; type: "periodos"; curso: Curso; nivel: string; turma: Turma }
```

E o tipo `"faltas"` de cada modo passa a carregar `periodo: string`,
igual ao que `NotasAcademia.tsx` faz com o tipo `"notas"`:

```ts
| { mode: "fund"; type: "faltas"; nivel: string; turma: Turma; periodo: string }
```
```ts
| { mode: "sup"; type: "faltas"; curso: Curso; nivel: string; turma: Turma; periodo: string }
```

**c) Carregamento de faltas com filtro de período.** A função
`carregarFaltasDosEstudantesDaTurma(turma, force)` hoje chama
`consultasService.faltasEstudante(codigoOriginal, { token })` sem
filtros. Espelhe `carregarNotasDosEstudantesDaTurma` de
`NotasAcademia.tsx` (que aceita um terceiro parâmetro opcional
`filtros?: { nivel; periodo; superior }` e o repassa como
`ano_academico`/`periodo` na chamada ao serviço): adicione o mesmo
terceiro parâmetro a `carregarFaltasDosEstudantesDaTurma` e passe
`periodo: filtros?.periodo` para `consultasService.faltasEstudante`.

**d) Filtro de período nas funções derivadas.** `faltasDaTurmaEMateria`
e `getMateriasDaTurma` hoje filtram apenas por `materia_disciplinar_id`
e `ano_lectivo`. Adicione um parâmetro `periodo: string` a ambas e
filtre também por `f.periodo === periodo`, espelhando como
`notasDaTurmaEmPeriodo` de `NotasAcademia.tsx` filtra por
`n.periodo === periodo` (além de `ano_academico`).

**e) Handlers de escrita.** `handleRegistrar` e `handleCorrigirFalta`
hoje recarregam a turma sem filtro (`carregarFaltasDosEstudantesDaTurma(turmaAtual, true)`).
Troque para recarregar com o filtro de período ativo, exatamente como
`handleRegistrar`/`handleCorrigirNota` fazem em `NotasAcademia.tsx`
(usando `layer.periodo` quando `layer.type === "faltas"`).

**f) Navegação turma → períodos.** Nos dois blocos "turmas" (fund e
sup), o `onClick` do `CardBtn` de cada turma hoje faz
`await carregarFaltasDosEstudantesDaTurma(t); setLayer({..., type: "faltas", turma: t})`.
Troque para ir para `type: "periodos"` (sem forçar período ainda),
espelhando o `onClick` equivalente em `NotasAcademia.tsx` que vai para
`type: "periodos"` antes de ir para `"notas"`.

**g) Novo bloco de renderização "períodos".** Insira, entre o bloco
`turmas` e o bloco `faltas` de cada modo (fund/sup), um bloco novo
idêntico ao bloco `"periodos"` de `NotasAcademia.tsx`, trocando texto
de "Ver notas" para "Ver faltas":
- **fund**: grelha com `PERIODOS_ESCOLA`, cada card leva a
  `carregarFaltasDosEstudantesDaTurma(turma, true, { nivel, periodo: p.value, superior: false })`
  seguido de `setLayer({ mode: "fund", type: "faltas", nivel, turma, periodo: p.value })`.
- **sup**: mesma lógica, mas usando
  `curso.periodos?.length ? curso.periodos.map(...) : (curso.type === "superior" ? PERIODOS_SUPERIOR : PERIODOS_ESCOLA)`
  para calcular `periodosDisponiveis`, exatamente como
  `NotasAcademia.tsx` faz no bloco `"periodos"` do modo `sup`.

**h) Bloco "faltas" recebe `periodo`.** Os blocos que hoje chamam
`renderFaltasLayer(nivel, turma)` / `renderFaltasLayer(nivel, turma, curso.nome, curso)`
passam a extrair `periodo` do layer e repassá-lo:
`renderFaltasLayer(nivel, turma, periodo, curso?.nome, curso)` (ajuste a
assinatura de `renderFaltasLayer` para aceitar `periodo: string` como
novo parâmetro, na posição que fizer mais sentido dado o código atual
— o importante é que `faltasDaTurmaEMateria`/`getMateriasDaTurma`
passem a receber esse `periodo` em todas as chamadas dentro da função).
Adicione também no cabeçalho da tela (`<h2>`) o rótulo do período
selecionado (`PERIODOS_LABEL[periodo] ?? periodo`), da mesma forma que
`renderNotasLayer` de `NotasAcademia.tsx` mostra o período no
cabeçalho.

**i) Breadcrumbs, `goBack` e `canGoBack`.** Atualize `buildCrumbs`,
`goBack` para incluir a passagem por `"periodos"` entre `"turmas"` e
`"faltas"`, espelhando exatamente `buildCrumbs`/`goBack` de
`NotasAcademia.tsx` (o crumb da camada `"faltas"` mostra
`PERIODOS_LABEL[layer.periodo] ?? layer.periodo` como último item,
igual ao crumb de `"notas"`).

**j) Modal "Nova Falta".** Hoje `ModalRegistrarFalta` (recebe
`estudantes`, `materias`, `onConfirm`, `onClose`) não tem seletor de
período. Adicione um campo `Período *` no formulário, com as opções
vindas de uma constante `PERIODOS` calculada no componente
`FaltasAcademia` (mesma lógica de `NotasAcademia.tsx`:
`const PERIODOS = isSuperior ? PERIODOS_SUPERIOR : PERIODOS_ESCOLA;`,
onde `isSuperior` já existe/deve ser derivado da mesma forma que em
`NotasAcademia.tsx`), passando `PERIODOS` como nova prop para
`ModalRegistrarFalta`. Ao selecionar uma matéria cujo `periodo` já é
conhecido (matérias de curso superior têm `periodo` fixo — confira o
campo `periodo` em `MateriaDTO`), auto-preencha o período selecionado,
espelhando exatamente o `onChange` do campo Matéria em `ModalGestao`
de `NotasAcademia.tsx` (`if (isSuperior) { setPeriodo(mat?.periodo ?? "") }`).
Isso exige estender `materiasAtivas` (hoje `{ id, nome }`) para incluir
também `periodo` — mesmo padrão do array `materias` passado a
`ModalGestao`. Envie `periodo` no payload de `onRegistrar` (a
validação de campos obrigatórios do formulário passa a exigir também
`periodo`, igual à validação de `handleRegistrar` em `ModalGestao`).

**k) `ModalCorrigirFalta`.** Não precisa de campo de período (é
imutável na correção). Opcionalmente, mostre o período da falta no
cabeçalho do modal como contexto (somente leitura) — não obrigatório.

### A.4 — `src/components/faltas/FaltasAdmin.tsx`

Este ficheiro já é estruturalmente uma cópia de `FaltasAcademia.tsx`
com a única diferença de que a navegação vive em `acadLayer`/`AcadLayer`
(porque o admin escolhe a academia antes). Aplique exatamente as
mesmas 11 mudanças da secção A.3 (a-k), usando como referência dupla:
o que você acabou de fazer em `FaltasAcademia.tsx` **e** como
`NotasAdmin.tsx` já implementa a mesma camada `"periodos"` sobre
`NotasAcademia.tsx` (é a mesma relação — `NotasAdmin.tsx` está para
`NotasAcademia.tsx` assim como `FaltasAdmin.tsx` deve ficar para
`FaltasAcademia.tsx`). Preste atenção a manter a convenção de nomes já
usada neste ficheiro (`acadLayer`, `setAcadLayer`, `al` como alias de
layer dentro de funções) em vez de renomear para `layer`.

### A.5 — `src/components/faltas/FaltasEstudante.tsx`

Este ficheiro tem um fluxo próprio, diferente de `FaltasAcademia.tsx`:
`academias → anos_letivos → tipo_ensino → cursos → turmas → materias → faltas`,
com a seleção de matéria como um passo explícito em grelha (não inline
como em `FaltasAcademia.tsx`). `NotasEstudante.tsx` resolve isso de
outra forma (período reúne todas as matérias numa tabela só, sem passo
de matéria separado) — **não copie a estrutura de `NotasEstudante.tsx`
aqui**, apenas o conceito. Insira `"periodos"` como um novo passo
**entre `"turmas"` e `"materias"`**:

```ts
| { type: "periodos"; a: AcadInfo; anoLetivo: string; turma: Turma; tipoEnsino?: "fundamental" | "medio" | "superior"; cursoId?: string }
```

E adicione `periodo: string` ao tipo `"materias"` e ao tipo `"faltas"`.

Passos:

1. Copie `PERIODOS_LABEL` (mapa de rótulos) para este ficheiro — as
   mesmas chaves/valores usados em `FaltasAcademia.tsx`.
2. No `onClick` do `CardBtn` de cada turma (bloco `"turmas"`), troque
   `navegar({ type: "materias", ... })` por
   `navegar({ type: "periodos", a, anoLetivo, turma: t, tipoEnsino, cursoId })`.
3. Adicione um novo bloco de renderização `"periodos"`, no mesmo
   estilo visual dos outros blocos deste ficheiro (`CardBtn` em
   grelha, `Breadcrumb`, `BotaoVoltar`). A lista de períodos a mostrar
   deve ser calculada assim (este ficheiro não carrega `Curso`, então
   não há `curso.periodos` disponível — use o mesmo critério
   simplificado que `NotasEstudante.tsx` já usa no seu bloco de
   período: decidir trimestre vs. semestre pelo tipo de ensino da
   turma/academia, não pelo curso):
   ```ts
   const ehSuperior = layer.turma.nivel.includes("superior") || layer.tipoEnsino === "superior";
   const periodosDisponiveis = ehSuperior
     ? ["1_semestre", "2_semestre", "3_semestre", "4_semestre"]
     : ["1_trimestre", "2_trimestre", "3_trimestre"];
   ```
   Cada card leva para `navegar({ type: "materias", a, anoLetivo, turma, periodo: p, tipoEnsino, cursoId })`.
4. No bloco `"materias"`, `materiasDaTurma(codigoAcademia, turma, anoLetivo)`
   passa a receber também `periodo` e filtrar
   `faltasDaTurma(...)` por `f.periodo === periodo` antes de agrupar
   por matéria (adicione o parâmetro `periodo: string` a
   `materiasDaTurma` e a `faltasDaTurma`, filtrando por
   `f.periodo === periodo` do mesmo jeito que já filtra por
   `f.ano_academico === turma.nivel` e `f.ano_lectivo === anoLetivo`).
   Ao navegar para `"faltas"`, repasse `periodo: layer.periodo`.
5. No bloco `"faltas"`, `faltasDaMateria(...)` recebe o mesmo novo
   parâmetro `periodo` e filtra por ele. No cabeçalho (`<h2>`/`<p>`),
   mostre o rótulo do período (`PERIODOS_LABEL[layer.periodo] ?? layer.periodo`)
   junto da turma.
6. Atualize `crumbs`, `goBack` para incluir a passagem por
   `"periodos"` entre `"turmas"` e `"materias"`, e o rótulo do período
   no crumb final de `"faltas"`, seguindo o mesmo padrão dos outros
   crumbs deste ficheiro.

### A.6 — Testes manuais obrigatórios (Parte A)

1. Como academia (escola): `Gestão de Faltas` → escolher ano letivo →
   fundamental → uma turma → deve aparecer a grelha de 3 trimestres
   antes da tabela de faltas. Selecionar um trimestre → selecionar
   matéria → registar uma falta pelo botão "Nova Falta" (o modal deve
   exigir Período) → a falta deve aparecer na tabela do trimestre
   selecionado e **não** aparecer se trocar para outro trimestre.
2. Repetir o mesmo teste para uma turma de curso superior (deve
   mostrar semestres, não trimestres — confirme com um curso cujo
   `periodos` tenha mais de 2 semestres que a lista mostrada bate com
   `curso.periodos`).
3. Repetir como Admin (`FaltasAdmin.tsx`), escolhendo uma academia
   primeiro.
4. Como estudante (`FaltasEstudante.tsx`): entrar numa turma com
   faltas já registadas em mais de um período — confirmar que a
   grelha de períodos aparece antes das matérias, e que cada período
   mostra só as faltas daquele período.
5. Confirmar no DevTools (aba Network) que
   `GET /faltas-estudante/:codigo` é chamado com `?periodo=...` quando
   um período é selecionado nas telas de academia/admin.
6. `npm run build` sem erros de tipo.

---

## PARTE B — Cadastro de estudante vinculado a turma

### B.1 — Tipos e serviço (`src/types/api.ts`, `src/lib/api/services.ts`)

Em `src/types/api.ts`, adicione `codigo_turma` opcional a
`CriarEstudanteRequest`:

```ts
export interface CriarEstudanteRequest {
  // ...campos existentes, sem alterar nenhum...
  /**
   * Código de uma turma já existente e ativa na academia, à qual o
   * estudante será vinculado no momento do cadastro. Opcional — se
   * omitido, o estudante é criado sem turma (fluxo atual).
   */
  codigo_turma?: string;
}
```

Localize o tipo de resposta usado por `academiaService.cadastrarEstudante`
(`POST /academia/estudante/register`) e estenda-o com os campos que o
backend já retorna quando `codigo_turma` é enviado:

```ts
data: {
  id: string;
  codigo_estudante: string;
  codigo_academia: string;
  codigo_turma?: string;
  turma_vinculada?: boolean;
  turma_aviso?: string; // presente quando a vinculação falhou de forma não bloqueante
}
```

Em `src/lib/api/services.ts`, localize `prepareCriarEstudante` (a
função que monta o payload explícito para `POST /academia/estudante/register`,
usada tanto pela versão JSON quanto por `prepareCriarEstudanteForm`).
Adicione a linha de repasse do novo campo, seguindo o mesmo padrão dos
demais campos opcionais já ali (ex.: `curso_medio_id`):

```ts
codigo_turma: data.codigo_turma?.trim() || undefined,
```

Não é preciso mexer em `massaApi.ts` — ele envia `CriarEstudanteRequest[]`
diretamente como JSON, então `codigo_turma` já vai junto assim que o
payload da linha da planilha o incluir (ver B.3.5).

### B.2 — Cadastro individual (`.../estudantes/cadastrar/CadastroSingularForm.tsx`)

1. Carregue as turmas da academia ao montar o formulário, do mesmo
   jeito que `FaltasAcademia.tsx`/`NotasAcademia.tsx` já fazem:
   `useApi(academiaService.listarTurmas)` + `useEffect` disparando
   `carregarTurmas(token)` junto com as demais chamadas iniciais.
   Filtre por `status === "ativo"` (mesma checagem `turmaAtiva` usada
   em Faltas/Notas — pode importar o helper existente se ele estiver
   exportado, ou replicar a checagem inline).
2. No formulário, logo depois do campo "Ano Escolar"/"Ano Acadêmico"
   ficar definido (fundamental: `ano_escolar_fundamental`; médio:
   `ano_escolar_medio` + `curso_medio_id`; superior:
   `ano_superior`/`curso_superior_id`, conforme o que já existir no
   formulário), adicione um campo opcional **"Turma (opcional)"**
   com um `Dropdown`, cujas opções são as turmas ativas cujo `nivel`
   bate com o ano selecionado (e, quando houver curso selecionado,
   cujo `curso_id` também bate):
   ```ts
   const turmasCompatíveis = turmasAtivas.filter(t =>
     t.nivel === anoSelecionadoAtual &&
     (cursoSelecionadoId ? t.curso_id === cursoSelecionadoId : true)
   );
   ```
   Rotule cada opção como `` `Turma ${t.codigo_turma} · ${t.turno}` ``.
   Se não houver nenhuma turma compatível, mostre uma nota explicativa
   discreta abaixo do campo (algo como "Nenhuma turma ativa para este
   ano/curso ainda — o estudante pode ser cadastrado sem turma e
   vinculado depois.") em vez de esconder o campo.
3. Ao trocar o ano escolar/curso depois de já ter escolhido uma turma,
   limpe a turma selecionada se ela deixar de ser compatível (mesma
   lógica defensiva que outros campos dependentes deste formulário já
   aplicam — confirme como o formulário já reage a trocas de nível de
   ensino para replicar o padrão).
4. Inclua `codigo_turma: turmaSelecionada || undefined` no objeto
   enviado a `academiaService.cadastrarEstudante`.
5. Na tela de sucesso (`ResultadoCadastro`/`SuccessState` — o
   componente que mostra o código gerado após o cadastro), se a
   resposta trouxer `codigo_turma`, mostre uma linha extra confirmando
   o vínculo ("Vinculado à turma T1A"); se vier `turma_aviso` (turma
   não pôde ser vinculada, mas o estudante foi criado), mostre esse
   aviso em destaque (cor âmbar/atenção, não vermelho — o cadastro
   funcionou, só a vinculação automática falhou).

### B.3 — Cadastro em massa

O pedido do utilizador, especificamente:

> Antes de "Nível de ensino" e "Ano Acadêmico *" serem exibidos, fazer
> a academia escolher se quer cadastrar os estudantes por turma
> (explicando que vai cadastrar turma por turma, logo as turmas
> precisam já existir) ou de forma geral (sem vínculo, a ser feito
> depois). Padrão: sempre "por turma".
> 1. Por turma: nível/ano acadêmico → turma → baixar modelo. O modelo
>    já identifica a turma de destino.
> 2. Geral: modelo atual, sem turma.

#### B.3.1 — `massaTypes.ts`

Adicione ao `ContextoModelo` os campos necessários para carregar a
turma escolhida (quando aplicável):

```ts
export interface ContextoModelo {
  // ...campos existentes (nivel, cursoId, cursoNome, anoAcademico,
  // anoAcademicoLabel, codigoAcademia, versaoModelo, etc. — não
  // remova nem renomeie nenhum)...

  /** 'turma' = modelo gerado para uma turma específica (todos os
   *  estudantes deste ficheiro serão vinculados à mesma turma).
   *  'geral' = modelo sem turma (comportamento atual, inalterado). */
  modoCadastro: 'turma' | 'geral';

  /** Presente apenas quando modoCadastro === 'turma'. */
  codigoTurma?: string;
  turmaLabel?: string; // ex: "T1A · manhã", para exibição amigável
}
```

#### B.3.2 — `SelecaoContextoMassa.tsx`

Este é o componente "1. Descarregar o modelo". Hoje ele mostra direto
os campos "Nível de ensino" e, em seguida, "Ano Acadêmico *". Adicione
um passo 0, **antes** desses dois campos:

1. Um seletor com duas opções (pode ser dois cartões clicáveis, no
   mesmo estilo visual dos `CardBtn` já usados nas telas de
   Faltas/Notas, ou um `Dropdown`/toggle — escolha o que for mais
   consistente com o restante deste componente), com o texto:
   - **"Cadastrar por turma"** (selecionado por padrão) — descrição:
     "Vai cadastrar os estudantes turma por turma. É necessário que a
     turma já exista na plataforma."
   - **"Cadastrar de forma geral"** — descrição: "Os estudantes serão
     cadastrados sem vínculo a nenhuma turma. Pode vincular cada um a
     uma turma depois, individualmente."
2. Estado local `modoCadastro: 'turma' | 'geral'`, iniciado em
   `'turma'` (padrão pedido pelo utilizador).
3. Quando `modoCadastro === 'turma'`:
   - Os campos "Nível de ensino" e "Ano Acadêmico" continuam existindo
     exatamente como hoje (não altere a lógica deles).
   - **Depois** que o ano acadêmico estiver definido, mostre um novo
     campo "Turma \*" com um `Dropdown` das turmas ativas compatíveis
     com o nível/ano/curso selecionados (mesma filtragem descrita em
     B.2, usando `academiaService.listarTurmas` — carregue a lista de
     turmas no `useEffect` de montagem deste componente, do mesmo jeito
     que ele já carrega cursos, se aplicável).
   - Se não houver nenhuma turma compatível, desabilite o botão
     "Baixar Modelo" e mostre uma mensagem explicando que é preciso
     criar a turma primeiro (com um link/indicação para a página de
     turmas, se este componente já tiver acesso a algo assim; caso
     contrário, apenas o texto explicativo já é suficiente).
   - O botão "Baixar Modelo" só fica habilitado quando nível + ano +
     turma estiverem definidos.
4. Quando `modoCadastro === 'geral'`:
   - Mantém o comportamento atual sem nenhuma mudança (nível → ano →
     baixar modelo), apenas construindo o `ContextoModelo` com
     `modoCadastro: 'geral'` e sem `codigoTurma`.
5. Ao chamar `onModeloGerado`, preencha `contexto.modoCadastro`,
   `contexto.codigoTurma` e `contexto.turmaLabel` de acordo com o modo
   escolhido.
6. Atualize a mensagem de confirmação exibida depois do download (o
   bloco azul em `CadastroMassaForm.tsx` que mostra
   "Modelo baixado para {nível} — {ano}") para também mostrar a turma
   quando `modoCadastro === 'turma'`: `` `Modelo baixado para {label} — Turma {turmaLabel}` ``.

#### B.3.3 — `massaTemplate.ts` (geração do Excel)

Localize a função que monta a folha oculta `_meta` (a mesma lógica que
já grava `curso_id`/`ano_academico`). Adicione duas linhas novas,
preenchidas apenas quando `contexto.modoCadastro === 'turma'`:

```ts
['codigo_turma', contexto.codigoTurma || ''],
['modo_cadastro', contexto.modoCadastro],
```

Não altere o cabeçalho visível da folha "Estudantes" — a turma **não**
é uma coluna preenchida pelo utilizador, é um dado fixo do ficheiro
(por isso vai no `_meta`, igual a `curso_id`), exatamente como o
pedido do utilizador descreve ("nos indexadores/identificadores do
modelo terá a turma").

#### B.3.4 — `massaParser.ts` (leitura do Excel enviado)

Localize onde o `_meta` é lido de volta para reconstruir o
`ContextoModelo` (a mesma lógica que já lê `curso_id`/`ano_academico`
de volta). Leia também `codigo_turma` e `modo_cadastro`, reconstruindo:

```ts
modoCadastro: meta.modo_cadastro === 'turma' ? 'turma' : 'geral',
codigoTurma: meta.codigo_turma || undefined,
```

Isso garante que um ficheiro baixado no modo "por turma" continue
vinculado à mesma turma mesmo depois de reenviado (inclusive nos
fluxos de correção de erros e reenvio de falhas, que reaproveitam o
mesmo `_meta` — ver B.3.6).

Não é necessário validar aqui se a turma ainda existe/está ativa — essa
validação já acontece no backend no momento do cadastro (o mesmo
comportamento que a validação de `curso_id` já tem hoje neste parser,
se houver).

#### B.3.5 — `massaPayload.ts` (`construirPayloadEstudante`)

Esta função monta o `CriarEstudanteRequest` de cada linha da planilha
a partir de `EstudanteBulkRow` + `ContextoModelo`. Adicione:

```ts
codigo_turma: contexto.modoCadastro === 'turma' ? contexto.codigoTurma : undefined,
```

no objeto retornado, ao lado dos demais campos que já vêm do
`contexto` (como `curso_medio_id`/`curso_superior_id`/ano escolar).

#### B.3.6 — `massaErrorExport.ts`

A função `montarMetaLinhas(contexto)` monta o `_meta` reexportado nos
ficheiros de "linhas com erro", "estudantes com falha" e "rascunho
pendente". Adicione as mesmas duas linhas de B.3.3:

```ts
['codigo_turma', contexto.codigoTurma || ''],
['modo_cadastro', contexto.modoCadastro || 'geral'],
```

Isso garante que, ao corrigir e reenviar um ficheiro de erros/falhas
gerado no modo "por turma", o vínculo à turma não se perde.

#### B.3.7 — `RelatorioValidacaoMassa.tsx` (tela "3. Revisão e confirmação")

No cabeçalho que hoje mostra
`{labelNivel(contexto.nivel)} — {contexto.cursoNome} — {contexto.anoAcademicoLabel}`,
adicione a turma quando `contexto.modoCadastro === 'turma'`:
`` ` — Turma ${contexto.turmaLabel ?? contexto.codigoTurma}` ``.
Nenhuma outra mudança é necessária neste ficheiro — a validação de
linhas/erros continua igual, pois a turma é fixa por ficheiro, não por
linha.

#### B.3.8 — `BatchProgressScreen.tsx`

Nenhuma mudança obrigatória — os resultados de erro já mostram
`payload` (que agora inclui `codigo_turma`) e a mensagem de erro vinda
do backend (`f.erro`) já vai refletir naturalmente um problema de
turma (ex.: "turma não encontrada") caso ocorra, sem precisar de
tratamento especial na UI.

### B.4 — Testes manuais obrigatórios (Parte B)

1. **Individual**: cadastrar um estudante escolhendo uma turma
   compatível com o ano selecionado → confirmar na tela de sucesso que
   aparece a confirmação do vínculo → conferir na página de Turmas que
   o estudante já aparece na lista da turma.
2. **Individual**: cadastrar um estudante sem selecionar turma → deve
   funcionar exatamente como hoje (sem vínculo).
3. **Individual**: trocar o ano escolar depois de já ter escolhido uma
   turma incompatível → a turma selecionada deve ser limpa
   automaticamente.
4. **Massa — por turma**: escolher "Cadastrar por turma" (padrão) →
   selecionar nível/ano → selecionar uma turma → baixar modelo →
   preencher 2-3 linhas → enviar → confirmar cadastro → verificar que
   todos os estudantes aparecem vinculados à turma escolhida.
5. **Massa — geral**: escolher "Cadastrar de forma geral" → confirmar
   que o modelo baixado e o fluxo completo são idênticos ao
   comportamento atual (nenhuma regressão), e que os estudantes são
   criados sem turma.
6. **Massa — reenvio de erros**: no modo "por turma", forçar uma linha
   com erro (ex.: data de nascimento inválida), baixar "linhas com
   erro", corrigir e reenviar — confirmar que a turma continua sendo
   aplicada no reenvio (não precisa escolher a turma de novo).
7. Confirmar que, no modo "por turma", **não é possível** avançar para
   o download do modelo sem uma turma selecionada, e que a mensagem de
   "nenhuma turma compatível" aparece corretamente quando aplicável.
8. `npm run build` sem erros de tipo.

---

## Fora de escopo (não fazer nesta tarefa)

- Qualquer alteração no repositório `spuri-backend`.
- Criar uma tela de gestão de faltas em lote (upload de Excel) — os
  endpoints `.../faltas-aluno/async` já existem no backend, mas não há
  pedido para expor isso na UI agora; a Parte A cobre apenas as telas
  de consulta/registo já existentes.
- Corrigir a limitação já conhecida de que o seletor de período do
  modal "Nova Nota"/"Nova Falta" usa o tipo de ensino da **academia**
  (`isSuperior`) em vez do tipo do **curso** específico em academias
  mistas — esse comportamento já existe hoje em Notas e a Parte A
  apenas o replica para Faltas por consistência; não é para "corrigir"
  nesta tarefa (evitar mudar comportamento de Notas como efeito
  colateral).
- Criar um agrupamento "Sem período" para faltas antigas com
  `periodo: ""` — elas simplesmente não aparecerão em nenhuma aba de
  período específico nas telas de academia/admin/estudante após esta
  tarefa (mesmo efeito que notas antigas sem categoria compatível já
  têm hoje). Pode ser proposto como melhoria futura, mas não faz parte
  do escopo pedido.
- Permitir trocar a turma de um estudante já cadastrado a partir desta
  tela — isso já existe (ou pode ser feito) na ficha do estudante /
  gestão de turmas; esta tarefa cobre apenas o momento do cadastro.

## Critérios de aceite

- [ ] `Falta`/`RegistrarFaltasRequest` têm `periodo` em `types/api.ts`.
- [ ] `FaltasAcademia.tsx`, `FaltasAdmin.tsx` e `FaltasEstudante.tsx`
      têm uma camada de seleção de período entre turma e a
      tabela/matérias final, respeitando trimestre (escola) vs.
      semestre (superior), com dados carregados/filtrados por
      `periodo`.
- [ ] O modal de registo de falta exige período e envia-o à API.
- [ ] `CriarEstudanteRequest` aceita `codigo_turma` opcional; o
      cadastro individual tem um seletor de turma opcional filtrado
      por compatibilidade de ano/curso.
- [ ] O cadastro em massa pergunta "por turma" (padrão) vs. "geral"
      antes dos campos de nível/ano; o modo "por turma" exige turma
      selecionada antes de liberar o modelo, e o modelo/parser/payload
      propagam `codigo_turma` corretamente, inclusive em reenvios de
      erro/falha.
- [ ] Nenhuma regressão no fluxo "geral" existente.
- [ ] `npm run build` (ou `tsc --noEmit`) sem erros.
- [ ] Todos os testes manuais das secções A.6 e B.4 passaram.

## Procedimento de conclusão

Ao terminar, mova (ou copie) este ficheiro para uma pasta de tarefas
concluídas, se o repositório adotar essa convenção, e descreva num
resumo curto: (1) o que foi implementado, (2) quaisquer desvios
deliberados deste documento e por quê, (3) itens listados em "Fora de
escopo" que valeria a pena abrir como tarefa futura.
