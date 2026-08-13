# Tarefa para o Codex — Correções em `/notas`, `/faltas` e terminologia "Ensino Fundamental"

> Documento preparado pelo Claude (orquestrador) após investigação completa do repositório
> `spuripainel` (frontend Next.js). Todas as causas-raiz abaixo foram confirmadas lendo o
> código-fonte real, com arquivo e número de linha. **Siga as instruções ao pé da letra — as
> decisões de design já foram tomadas, não é necessário (nem desejável) reinterpretar o
> problema.** Onde houver trecho de código "antes/depois", use exatamente o texto indicado.

## 0. Nota sobre back-end

Este repositório (`spuripainel`) é **só o frontend** (Next.js). Não existem aqui pastas
`db/`, `aggregates`, `models.go`, `handlers` nem `projections` — isso vive num repositório de
back-end separado, que não foi fornecido. Investiguei a API já consumida pelo frontend (ver
`src/Documentação da API.md` e `src/types/api.ts`) e confirmei que **ela já expõe tudo que é
necessário** para corrigir os bugs abaixo (campo `estudante_nome` em `Nota`/`Falta`, filtro
`codigo_turma` em `GET /estudantes`, campo `Curso.type`). **Nenhuma mudança de back-end é
necessária.** Todas as correções são de uso incorreto da API pelo frontend.

---

## TAREFA 1 — Trimestres exibidos como semestres no "Ensino Médio" de escola mista (`/notas`)

### Diagnóstico (causa-raiz confirmada)

Numa escola **mista** (`nivel: "escola"`, `nivel_escolar: "misto"`), a tela inicial de Notas
oferece dois botões: "Ensino Fundamental" e "Ensino Médio". O botão "Ensino Médio" foi
implementado reaproveitando o mesmo fluxo interno ("mode") usado para **Ensino Superior**,
porque ambos os níveis se organizam por "cursos":

- `src/components/notas/NotasAcademia.tsx:1255`
- `src/components/notas/NotasAdmin.tsx:828`

```tsx
onClick={() => setLayer({ mode: "sup", type: "cursos" })}   // "Ensino Médio" entra no mode "sup"
```

Isso por si só não é o bug (é uma reutilização de fluxo intencional, e o `tipoNota`/`isSuperior`
a nível de instituição continuam corretos: `isSuperior = academiaNivel === "superior"`, que é
`false` numa escola mista). **O bug real** está na tela de seleção de período, dentro desse
fluxo "sup", que decide os períodos a mostrar **sem olhar ao tipo do curso**:

- `src/components/notas/NotasAcademia.tsx:1507-1511`
- `src/components/notas/NotasAdmin.tsx:1029-1033`

```tsx
// código atual (com bug)
const periodosDisponiveis = curso.periodos?.length
  ? curso.periodos.map(v => ({ label: PERIODOS_LABEL[v] ?? v, value: v }))
  : PERIODOS_SUPERIOR;                      // ← fallback sempre semestral!
```

Como cursos de "Ensino Médio" normalmente não têm `curso.periodos` configurado
manualmente, cai sempre no `PERIODOS_SUPERIOR` (semestres) — mesmo sendo um curso do
médio, que deveria usar trimestres. O tipo `Curso` (`src/types/api.ts:1167-1180`) já tem o
campo `type: 'medio' | 'superior'` exatamente para essa distinção, mas ele não está sendo
usado nessa decisão.

Há ainda um **segundo bug com a mesma causa-raiz**, mais sutil: a tabela de notas exibida
para "Ensino Médio" também está sempre a usar o layout/categoria "Superior"
(`TabelaNotasSuperior`, com categorias configuráveis via `categorias` — que nem chega a ser
carregado, porque `carregarCategorias` só corre `if (isSuperior)`, e `isSuperior` a nível de
instituição é `false` numa escola mista) em vez do layout "Escolar" com categorias fixas
(`TabelaNotasEscolar`, `CATEGORIAS_ESCOLAR`) que é o que de facto é usado ao registar as notas
desse curso (`tipoNota` já é corretamente `"escolar"` no modal de registo). Isto pode fazer a
tabela aparecer sem colunas de categoria quando ainda não há notas lançadas.

- `src/components/notas/NotasAcademia.tsx:1543`
- `src/components/notas/NotasAdmin.tsx:1056`

```tsx
// código atual (com bug) — NotasAcademia.tsx:1543
{renderNotasLayer(nivel, turma, periodo, true, curso.nome)}
//                                        ^^^^ usarTabelaSuperior sempre true

// código atual (com bug) — NotasAdmin.tsx:1056
{renderNotasLayer(al.nivel, al.turma, al.periodo, true)}
//                                                 ^^^^ idem
```

### Correção a aplicar

**1.1 — `src/components/notas/NotasAcademia.tsx` (linhas 1509-1511):**

```tsx
// ANTES
const periodosDisponiveis     = curso.periodos?.length
  ? curso.periodos.map(v => ({ label: PERIODOS_LABEL[v] ?? v, value: v }))
  : PERIODOS_SUPERIOR;

// DEPOIS
const periodosDisponiveis     = curso.periodos?.length
  ? curso.periodos.map(v => ({ label: PERIODOS_LABEL[v] ?? v, value: v }))
  : (curso.type === "superior" ? PERIODOS_SUPERIOR : PERIODOS_ESCOLA);
```

**1.2 — `src/components/notas/NotasAdmin.tsx` (linhas 1031-1033):** aplicar exatamente a
mesma mudança (o bloco de código é idêntico).

**1.3 — `src/components/notas/NotasAcademia.tsx` (linha 1543):**

```tsx
// ANTES
{renderNotasLayer(nivel, turma, periodo, true, curso.nome)}

// DEPOIS
{renderNotasLayer(nivel, turma, periodo, curso.type === "superior", curso.nome)}
```

**1.4 — `src/components/notas/NotasAdmin.tsx` (linha 1056):**

```tsx
// ANTES
{renderNotasLayer(al.nivel, al.turma, al.periodo, true)}

// DEPOIS
{renderNotasLayer(al.nivel, al.turma, al.periodo, al.curso.type === "superior")}
```

### Por que isto é seguro

- `curso.type` já existe no objeto `Curso` retornado pela API (`'medio' | 'superior'`), não
  requer nenhuma chamada nova nem mudança de back-end.
- Para uma academia puramente "superior" (não mista), todos os cursos são `type: "superior"`,
  então o comportamento não muda em nada — a condição `curso.type === "superior"` continua
  `true` e cai exatamente no mesmo `PERIODOS_SUPERIOR` / `TabelaNotasSuperior` de sempre.
- A mudança só afeta o caminho **misto + curso do médio**, que é exatamente o caso relatado
  como quebrado.
- Não mexe em `/faltas`: confirmei que `FaltasAcademia.tsx`/`FaltasAdmin.tsx` não têm conceito
  de período (trimestre/semestre) — o botão "Ensino Médio"/"Médio-Superior" nessas páginas já
  reaproveita "sup" só para agrupar por curso, sem esse bug de período.

---

## TAREFA 2 — "Nome do Estudante" mostra código (Notas) / não mostra nada (Faltas)

### Diagnóstico (causa-raiz confirmada, mesma causa nos 4 arquivos)

Os quatro componentes abaixo carregam a lista de estudantes da academia **uma única vez**, ao
montar o componente (ou ao entrar numa academia, no caso do Admin), assim:

```tsx
carregarEstudantes({ token, limit: 50, offset: 0 });   // Academia
fetchEstudantes({ token, limit: 50, offset: 0 });      // Admin
```

- `src/components/notas/NotasAcademia.tsx:776`
- `src/components/notas/NotasAdmin.tsx:599`
- `src/components/faltas/FaltasAcademia.tsx:490`
- `src/components/faltas/FaltasAdmin.tsx:480`

O helper usado, `listarTodosEstudantes` (`src/lib/api/pagination.ts:40-67`), foi desenhado
para **paginar automaticamente até trazer todos os estudantes** — mas só faz isso quando é
chamado **sem** `limit`/`offset` explícitos:

```ts
// src/lib/api/pagination.ts
export async function listarTodosEstudantes(params) {
  if (typeof params?.offset === "number" || typeof params?.limit === "number") {
    // ← como os 4 arquivos SEMPRE passam limit:50, offset:0, cai sempre aqui:
    return consultasService.listarEstudantes({ ...params, limit: params.limit ?? 50, offset: params.offset ?? 0 });
  }
  // paginação completa só acontece se chegar até aqui
  ...
}
```

Ou seja: os quatro componentes **pedem explicitamente só os primeiros 50 estudantes da
academia inteira** (não da turma!) — e, no caso do Admin, nem sequer filtrados por
`codigo_academia` (compare com `fetchTurmas`, `fetchCursos`, `fetchMaterias` na mesma função,
que corretamente passam `codigo_academia: cod`; só o `fetchEstudantes` não passa).

Consequência direta:
- Uma escola com mais de 50 estudantes (comum, especialmente misto) quase nunca tem a turma
  aberta contida nesse lote fixo de 50 — a maioria dos estudantes da turma não é encontrada.
- Em `/notas`, existe um *fallback* que usa `nota.estudante_nome` (campo que a API já devolve
  em cada nota) quando o estudante não é encontrado na lista — por isso aparece pelo menos o
  **código** em vez do nome (pior caso: nome ausente também no fallback → mostra código puro).
  Ver `nomeEstudante()` em `NotasAcademia.tsx:163-166` e `NotasAdmin.tsx:110-113`.
- Em `/faltas`, `FaltasAcademia.tsx` (função `TabelaFaltas`, linhas 173-268) **não tem esse
  fallback nenhum** — usa só `estudantesMap.get(codigo)`, e se não encontrar, mostra
  "Nome não encontrado" (linhas 222 e 259). `FaltasAdmin.tsx` tem o fallback só nas linhas
  *com* falta registada (linha 232, usa `f.estudante_nome`), mas não nas linhas *sem* falta
  (linha 256, a maioria dos estudantes de uma turma em qualquer período) — por isso o
  Admin é o caso relatado como "não exibe nenhum nome".
- **Efeito colateral extra encontrado**: a mesma lista limitada de 50 estudantes alimenta o
  dropdown "Selecione o estudante" do modal "Nova Nota"/"Registrar Nova Falta" em
  `NotasAcademia.tsx:564` e `FaltasAcademia.tsx:341` — ou seja, um professor pode não conseguir
  encontrar um estudante da própria turma nesse dropdown ao lançar uma nota/falta nova. E
  alimenta também o contador "N estudante(s)" exibido no cabeçalho
  (`NotasAcademia.tsx:1568`, `NotasAdmin.tsx:1138`, `FaltasAcademia.tsx:1179`,
  `FaltasAdmin.tsx:982`), que hoje mostra no máximo "50" mesmo quando a academia tem mais.

A API já suporta exatamente o que falta — filtrar (ou simplesmente não limitar) a busca de
estudantes:

> `GET /estudantes?codigo_academia=...&limit=...` — filtro `codigo_academia` "disponível para
> admin" (não-admin já é escopado automaticamente pelo próprio token).
> `limit` — "quantidade máxima por página (padrão: 50, teto fixo: 100)".
> (ver `src/Documentação da API.md`, seção de filtros de `GET /estudantes`)

### Correção a aplicar

A correção é **remover o cap artificial de 50** para que `listarTodosEstudantes` faça o que já
foi desenhado para fazer (paginar até trazer a lista completa), e, no caso do Admin, **também
escopar por `codigo_academia`** (que já está disponível na mesma função, é só reaproveitar a
variável `cod` que já existe ali ao lado das outras chamadas).

**2.1 — `src/components/notas/NotasAcademia.tsx` (linha 776):**
```tsx
// ANTES
carregarEstudantes({ token, limit: 50, offset: 0 });

// DEPOIS
carregarEstudantes({ token });
```

**2.2 — `src/components/faltas/FaltasAcademia.tsx` (linha 490):** exatamente a mesma mudança
(`carregarEstudantes({ token, limit: 50, offset: 0 });` → `carregarEstudantes({ token });`).

**2.3 — `src/components/notas/NotasAdmin.tsx` (linha 599):**
```tsx
// ANTES
fetchEstudantes({ token, limit: 50, offset: 0 });

// DEPOIS
fetchEstudantes({ token, codigo_academia: cod });
```
(`cod` já está definido duas linhas acima nessa mesma função, é a mesma variável usada em
`fetchTurmas({ codigo_academia: cod, token })` logo ao lado.)

**2.4 — `src/components/faltas/FaltasAdmin.tsx` (linha 480):** exatamente a mesma mudança
(`fetchEstudantes({ token, limit: 50, offset: 0 });` → `fetchEstudantes({ token, codigo_academia: cod });`),
reaproveitando o `cod` já definido na mesma função (linha 476).

### Por que isto é a correção certa (e não só um "aumentar o número")

- `listarTodosEstudantes` já foi desenhado para paginação completa automática — o bug é que
  os 4 call-sites estavam a **desativar** esse comportamento sem necessidade, passando
  `limit`/`offset` fixos. Remover os parâmetros restaura o comportamento pretendido, sem
  precisar de nenhuma lógica nova de paginação/merge no componente.
- Corrige de uma vez: a tabela de Notas (mostra código em vez de nome), a tabela de Faltas
  (não mostra nada), o dropdown de "Selecione o estudante" ao registar nota/falta, e o
  contador "N estudante(s)" no cabeçalho — todos bebem da mesma lista `estudantes`/
  `dataEstudantes`.
- Para o Admin, adicionar `codigo_academia: cod` é indispensável: sem isso, `fetchEstudantes`
  sem limite passaria a paginar **todos os estudantes de todas as academias da plataforma**
  (lento e incorreto) em vez de só os da academia que o admin está a visualizar.

### Reforço adicional (robustez de exibição — pedido explícito no item 3.1)

Ainda assim, adicione um fallback de segurança (defesa em profundidade, para o caso raro de a
lista de estudantes falhar/atrasar ao carregar) na tabela de Faltas, espelhando o padrão que
`nomeEstudante()` já usa em Notas:

**2.5 — `src/components/faltas/FaltasAcademia.tsx`, função `TabelaFaltas` (linhas ~216-223):**
```tsx
// ANTES
.map(f => {
  const codigoNorm = normCodigoEstudante(f.codigo_estudante);
  const nome       = estudantesMap.get(codigoNorm) ?? estudantesMap.get(f.codigo_estudante);
  return (
    <tr key={f.id} ...>
      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
        {nome ?? <span className="text-gray-400 italic text-sm">Nome não encontrado</span>}
      </td>

// DEPOIS
.map(f => {
  const codigoNorm = normCodigoEstudante(f.codigo_estudante);
  const nome       = estudantesMap.get(codigoNorm)
    ?? estudantesMap.get(f.codigo_estudante)
    ?? f.estudante_nome;
  return (
    <tr key={f.id} ...>
      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
        {nome ?? <span className="text-gray-400 italic text-sm">Nome não encontrado</span>}
      </td>
```
(`Falta.estudante_nome?: string` já existe no tipo — `src/types/api.ts:1075`.) Não é preciso
mexer no bloco "sem falta" logo abaixo (linhas ~245-260): sem nenhum registo de falta não há
`estudante_nome` disponível em lado nenhum, e com a Tarefa 2.1-2.4 aplicada a lista completa de
estudantes já resolve esses casos.

---

## TAREFA 3 — Terminologia "Ensino Fundamental" → português de Angola

**Importante: mudança visual/textual apenas.** Não alterar nomes de variáveis, chaves de
objeto, valores enviados à API (`"1_ano_fundamental"`, `tipo === "fundamental"`, `nivel_escolar`,
etc.) nem lógica de nenhum tipo — só o texto que aparece na tela.

Duas transformações-base:

| Padrão de texto atual | Novo texto |
|---|---|
| `Ensino Fundamental` (como rótulo/título autónomo, nomeando o nível) | `Ensino Fundamental (1ª-9ª Classe)` |
| `` `${n}º Ano do Ensino Fundamental` `` (e variantes equivalentes — ver abaixo) | `` `${n}ª Classe` `` |

Levantei **todas** as ocorrências no repositório. Abaixo, cada arquivo com a decisão exata
(já tomada — só aplicar) e o porquê quando não é uma aplicação direta da regra.

### 3.1 — Padrão `Nº Ano do Ensino Fundamental` → `Nª Classe`

Aplicar a mudança **apenas no texto de retorno** da função `labelNivel`/equivalente, em cada
um destes 6 arquivos (não mexer no `medio`/`superior`, só no `fundamental`):

```tsx
// ANTES (idêntico nos 6 arquivos)
if (tipo === "fundamental") return `${n}º Ano do Ensino Fundamental`;

// DEPOIS
if (tipo === "fundamental") return `${n}ª Classe`;
```

Arquivos e linhas:
- `src/components/notas/NotasAdmin.tsx:54`
- `src/components/notas/NotasAcademia.tsx:111`
- `src/components/notas/NotasEstudante.tsx:34`
- `src/components/faltas/FaltasAdmin.tsx:38`
- `src/components/faltas/FaltasEstudante.tsx:20`
- `src/components/faltas/FaltasAcademia.tsx:33`

### 3.2 — Mesmo padrão, variantes de formato equivalentes noutros arquivos

**`src/components/user-profile/Details.tsx`, função `formatarAnoAcademico` (linhas 8-18):**
```tsx
// ANTES
function formatarAnoAcademico(ano: string): string {
  if (!ano) return '';
  const m = ano.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!m) return ano.replace(/_/g, ' ');
  const tipo: Record<string, string> = {
    fundamental: 'Fundamental',
    medio: 'Médio',
    superior: 'Superior',
  };
  return `${m[1]}º Ano — ${tipo[m[2]] ?? m[2]}`;
}

// DEPOIS
function formatarAnoAcademico(ano: string): string {
  if (!ano) return '';
  const m = ano.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!m) return ano.replace(/_/g, ' ');
  if (m[2] === 'fundamental') return `${m[1]}ª Classe`;
  const tipo: Record<string, string> = {
    medio: 'Médio',
    superior: 'Superior',
  };
  return `${m[1]}º Ano — ${tipo[m[2]] ?? m[2]}`;
}
```

**`src/app/(painel)/estudantes/cadastrar/massaHelpers.ts` (linhas ~56-60), função que formata
o ano acadêmico em lote (ajustar ao nome real da função no arquivo, o corpo é este):**
```tsx
// ANTES
const nivel = match[2] === 'medio' ? 'Médio' : match[2] === 'superior' ? 'Superior' : 'Fundamental';
return `${match[1]}º Ano ${nivel}`;

// DEPOIS
if (match[2] === 'fundamental') return `${match[1]}ª Classe`;
const nivel = match[2] === 'medio' ? 'Médio' : 'Superior';
return `${match[1]}º Ano ${nivel}`;
```

**Mapas `"N_ano_fundamental": "Nº Ano"` (9 entradas, mesmo padrão em 3 arquivos de
Avaliações) — trocar só o valor de cada entrada `..._fundamental`:**
```tsx
// ANTES (exemplo — repete para 1 a 9)
"1_ano_fundamental": "1º Ano",

// DEPOIS
"1_ano_fundamental": "1ª Classe",
```
Arquivos: `src/components/avaliacoes/AvaliacoesFinaisEstudante.tsx:12-14`,
`src/components/avaliacoes/AvaliacoesFinaisAcademia.tsx:26-28`,
`src/components/avaliacoes/AvaliacoesFinaisAdmin.tsx:22-24`. **Não mexer** nas entradas
`_medio` nem `_superior` desses mesmos mapas.

**Listas `{ value: "N_ano_fundamental", label: "Nº Ano" }` (9 entradas cada, mesmo padrão) —
trocar só o `label`, nunca o `value`:**
```tsx
// ANTES
{ value: "1_ano_fundamental", label: "1º Ano" },

// DEPOIS
{ value: "1_ano_fundamental", label: "1ª Classe" },
```
Arquivos:
- `src/components/paineis/MateriaPainel.tsx:25-33`
- `src/components/paineis/TurmasPainel.tsx:16-24`
- `src/app/(painel)/academias/cadastrar/PageContent.tsx:39-48` (constante
  `ANOS_FUNDAMENTAL_OPCOES`)

**`src/app/(painel)/testes/PageContent.tsx:2369`** — este é o **Painel de Testes interno**
(`/dev/seed`, ferramenta de geração de dados fictícios para desenvolvimento/QA, protegida por
`isTestesPageEnabled()` e fora do fluxo normal de qualquer usuário real da escola). **Deixar
como está** — não é uma página vista por escolas/estudantes/admins reais, e mudar o texto ali
não traz benefício para o usuário final. Se preferir, pode deixar comentado no PR o motivo de
ter sido pulado, mas não é obrigatório alterar.

### 3.3 — Rótulo "Ensino Fundamental" como título/opção autónoma

Aplicar `Ensino Fundamental (1ª-9ª Classe)` nestes pontos — são todos "primeiro contato" com o
conceito (título de card de seleção, opção de dropdown, badge de status, cabeçalho de secção):

| Arquivo | Linha(s) | Texto atual | Texto novo |
|---|---|---|---|
| `notas/NotasAcademia.tsx` | 1254 | `title="Ensino Fundamental"` | `title="Ensino Fundamental (1ª-9ª Classe)"` |
| `notas/NotasAdmin.tsx` | 827 | idem | idem |
| `faltas/FaltasAcademia.tsx` | 918 | idem | idem |
| `faltas/FaltasAdmin.tsx` | 707 | idem | idem |
| `avaliacoes/AvaliacoesFinaisAcademia.tsx` | 377 | idem | idem |
| `avaliacoes/AvaliacoesFinaisEstudante.tsx` | 211 | `label: "Ensino Fundamental"` | `label: "Ensino Fundamental (1ª-9ª Classe)"` |
| `avaliacoes/AvaliacoesFinaisAdmin.tsx` | 272 | `fundamental: "Ensino Fundamental",` | `fundamental: "Ensino Fundamental (1ª-9ª Classe)",` |
| `paineis/TurmasPainel.tsx` | 570 | `<option value="fundamental">Ensino Fundamental</option>` | `<option value="fundamental">Ensino Fundamental (1ª-9ª Classe)</option>` |
| `app/(painel)/estudantes/PageContent.tsx` | 815 | `<span ...>Ensino Fundamental</span>` | `<span ...>Ensino Fundamental (1ª-9ª Classe)</span>` |
| `app/(painel)/estudantes/PageContent.tsx` | 965 | `return 'Ensino Fundamental';` | `return 'Ensino Fundamental (1ª-9ª Classe)';` |
| `estudantes/cadastrar/massaHelpers.ts` | 65 | `return 'Ensino Fundamental';` | `return 'Ensino Fundamental (1ª-9ª Classe)';` |
| `user-profile/Details.tsx` | 30 | `label: 'Ensino Fundamental',` | `label: 'Ensino Fundamental (1ª-9ª Classe)',` |
| `app/(painel)/academias/cadastrar/PageContent.tsx` | 34 | `{ nome: "Ensino Fundamental (1ª–9ª)", ... }` | `{ nome: "Ensino Fundamental (1ª-9ª Classe)", ... }` (padronizar com o texto novo — o atual já tentava o mesmo objetivo, mas com formato diferente) |

**Subtítulo "1º ao 9º Ano" ao lado desses mesmos títulos** — como o título já passa a incluir
"(1ª-9ª Classe)", trocar o subtítulo para o mesmo vocabulário evita misturar "Ano" e "Classe"
na mesma tela:
```tsx
// ANTES
subtitle="1º ao 9º Ano"

// DEPOIS
subtitle="1ª a 9ª Classe"
```
Arquivos: `notas/NotasAcademia.tsx:1254`, `notas/NotasAdmin.tsx:827`,
`faltas/FaltasAcademia.tsx:918`, `faltas/FaltasAdmin.tsx:707`,
`avaliacoes/AvaliacoesFinaisAcademia.tsx:377`, `avaliacoes/AvaliacoesFinaisEstudante.tsx:211`
(campo `sub`).

**Toggle buttons "Ver Matérias/Turmas do Ensino Fundamental":**
```tsx
// ANTES (MateriaPainel.tsx:714)
{viewNivel === "fundamental" ? "Ver Matérias do Ensino Médio" : "Ver Matérias do Ensino Fundamental"}
// DEPOIS
{viewNivel === "fundamental" ? "Ver Matérias do Ensino Médio" : "Ver Matérias do Ensino Fundamental (1ª-9ª Classe)"}

// ANTES (TurmasPainel.tsx:868)
{viewNivelTurmas === "fundamental" ? "Ver Turmas do Ensino Médio" : "Ver Turmas do Ensino Fundamental"}
// DEPOIS
{viewNivelTurmas === "fundamental" ? "Ver Turmas do Ensino Médio" : "Ver Turmas do Ensino Fundamental (1ª-9ª Classe)"}
```

**Badge "Fundamental (Finalizado)" — `user-profile/Details.tsx:33`:**
```tsx
// ANTES
if (e.status_escolar_fundamental === 'finalizado') return { label: 'Fundamental (Finalizado)', cor: 'green' };
// DEPOIS
if (e.status_escolar_fundamental === 'finalizado') return { label: '1ª-9ª Classe (Finalizado)', cor: 'green' };
```

**`app/(painel)/estudantes/PageContent.tsx:815`** fica dentro de um cabeçalho de secção
expansível (accordion) de uma escola mista — igual em espírito ao 3.3 acima, aplicar a mesma
regra (já incluído na tabela acima).

### 3.4 — O que **não** alterar (decisão explícita, não deixar para o Codex escolher)

- **Breadcrumbs de navegação** que repetem "Ensino Fundamental" a cada passo dentro do mesmo
  fluxo (ex.: `avaliacoes/AvaliacoesFinaisAcademia.tsx:393,434,473`) — manter o texto curto
  "Ensino Fundamental". O rótulo completo já aparece uma vez no título/card de entrada; repetir
  "(1ª-9ª Classe)" em cada nível do breadcrumb só adiciona ruído visual sem ganho de clareza.
- **`src/components/landing/TrilhaAnimation.tsx`** (landing page pública/marketing, diagrama
  SVG animado com rótulos curtos e texto corrido tipo "Matrícula → Ensino Fundamental → Ensino
  Médio → Universidade"). Não faz parte do painel administrativo/acadêmico e o parêntese
  quebraria o layout do diagrama e o ritmo do texto de marketing. Deixar como está.
- **`src/app/(painel)/testes/PageContent.tsx`** — painel de dev/QA, ver justificativa na seção
  3.2.
- Nenhum valor interno (`"fundamental"`, `"1_ano_fundamental"`, `nivel_escolar`, chaves de
  `Record`, parâmetros de API) deve mudar — só texto exibido ao usuário.

---

## Checklist de aceite (validar manualmente após as mudanças)

1. **Login como escola mista (role academia)** → `/notas` → entrar num curso do "Ensino
   Médio" → abrir uma turma → a tela de seleção de período deve mostrar **1º, 2º e 3º
   Trimestre** (não semestres), a menos que esse curso específico tenha `periodos`
   configurados manualmente como semestrais.
2. Ainda nesse fluxo, abrir a tabela de notas do trimestre: deve mostrar as categorias
   fixas do escolar (não uma tabela vazia sem colunas).
3. **`/notas`**, qualquer role (academia/admin/misto), qualquer turma com mais de 50
   estudantes na academia: a coluna "Nome do Estudante" deve mostrar o **nome real**, não o
   código, para todos os estudantes da turma.
4. **`/faltas`**, role academia e role admin: abrir uma turma qualquer → todos os estudantes
   da turma devem aparecer com nome (tanto os que têm falta registada quanto os que não têm).
5. **`/notas`** e **`/faltas`**, role academia: abrir o modal "Nova Nota"/"Registrar Nova
   Falta" → o dropdown "Selecione o estudante" deve conter **todos** os estudantes da
   academia (buscável), não só os primeiros 50.
6. O contador "N estudante(s)" no cabeçalho de `/notas` e `/faltas` (academia e admin) deve
   bater com o total real de estudantes da academia, não travar em 50.
7. Buscar "Ensino Fundamental (1ª-9ª Classe)" e "Nª Classe" na aplicação (grep visual/telas
   principais) e confirmar que aparece nos pontos da tabela da seção 3.3, e que a landing page
   e o painel de testes (`/dev/seed`) permanecem com o texto antigo, sem quebra de layout.
8. Rodar `npm run build` (ou `yarn build`) e `npx tsc --noEmit` (ou equivalente do projeto)
   para garantir que nenhuma alteração de texto/condicional quebrou tipagem.

---

## Fora de escopo (não tocar)

- Qualquer arquivo de back-end (não está neste repositório).
- Endpoints, contratos de API, tipos em `src/types/api.ts` (só leitura/referência).
- `src/components/landing/TrilhaAnimation.tsx` e `src/app/(painel)/testes/**`.
- Qualquer valor interno usado como chave/identificador (`"N_ano_fundamental"`,
  `nivel_escolar`, `curso.type`, etc.) — só o texto visível muda.
