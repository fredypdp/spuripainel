---
criado: 2026-08-23 00:00
origem: Pedido do usuário (Spuri), orquestrado por Claude (Anthropic) em sandbox com Node 22, tsc e ESLint reais
status: pendente
prioridade: alta
depende_de: []
---

# Ordenação cronológica e pagamento inline em `/pagamentos` do estudante

## 0. Leia isto primeiro

**O que já foi validado por Claude antes de este documento ser escrito**, num sandbox com Node 22 real
(repositório clonado de verdade via `codeload.github.com/fredypdp/spuripainel`, não apenas lido/inferido):

1. `npm install` — dependências instaladas e funcionando.
2. `npx tsc --noEmit` (projeto inteiro) — limpo, tanto ANTES quanto DEPOIS das mudanças descritas abaixo.
3. `npx eslint` nos três arquivos tocados — limpo (0 erros, 0 warnings).
4. `npx eslint .` (projeto inteiro) — os únicos problemas reportados são pré-existentes em arquivos **fora**
   do escopo desta tarefa (`verificar-email/[token]/page.tsx`, `SelecaoContextoMassa.tsx`,
   `calendar/Calendar.tsx`, `AppSidebar.tsx`) — nenhum deles tocado aqui, e nenhum problema novo introduzido.
5. `npm run build` (`next build`, Turbopack) — **não pôde ser concluído neste sandbox**: a rede do sandbox de
   validação não tem acesso a `fonts.googleapis.com`, e o build do Next falha ao buscar a fonte `Outfit` em
   `src/app/layout.tsx` (`next/font`). Isso é uma limitação de rede do sandbox de validação, **não tem
   nenhuma relação com o código desta tarefa** — o mesmo erro apareceria em QUALQUER build deste repositório
   nesse sandbox, com ou sem esta tarefa aplicada (mesma observação já registrada na tarefa 01, ver
   `docs/Tarefas feitas/01 - ...md`). Se o ambiente do Codex tiver acesso a `fonts.googleapis.com`, rode
   `npm run build` normalmente como parte da checklist (seção 7); se não tiver, valide só com os itens 1-4 e
   registre a mesma limitação de rede na documentação final, sem tentar "corrigir" `layout.tsx`.
6. Também validado à parte, em Node puro (evidência completa na seção 8): o comparador de ordenação antigo
   *de fato* produz `[1, 2, 9, 10, 11]` para um ano letivo que começa em setembro — reproduz exatamente o bug
   relatado ("começa em janeiro") — e o novo comparador produz `[9, 10, 11, 1, 2]`. Também confirmado que
   `getUTCFullYear()` é necessário (não `getFullYear()`) para não quebrar o ano cívil de janeiro em fusos
   horários negativos.

**Backend auditado, zero mudanças necessárias.** `spuri-backend` (`internal/finance/mensalidade.go`,
`internal/handlers/mensalidade_handlers.go`) já devolve as mensalidades **corretamente ordenadas**
cronologicamente (ver seção 2.1). O bug é 100% frontend. Não abra nenhuma issue nem PR no `spuri-backend`
por causa desta tarefa.

Trate o desenho abaixo (diffs exatos + conteúdo completo do componente reescrito) como já correto e
testado, não como uma proposta a reavaliar. Todas as decisões de design (por que cada escolha foi feita, e
não outra) estão explicadas na seção 3 — não é necessário (nem desejado) tomar nenhuma decisão nova ao
aplicar esta tarefa.

---

## 1. Prompt recomendado para executar esta tarefa

Aplique exatamente os diffs descritos na seção 4 e substitua o arquivo `EstudantePagamentosPainel.tsx` pelo
conteúdo completo da seção 5, sem alterar o desenho (nomes de função, estrutura de estado, nomes de campo).
Depois de aplicar, confirme `npx tsc --noEmit` e `npx eslint` nos arquivos tocados limpos (e `npm run build`
se seu ambiente tiver acesso a `fonts.googleapis.com` — ver seção 0, item 5), confirme com `git status
--short` que só os três arquivos listados na seção 7 foram alterados (nenhum lockfile), e gere a
documentação de tarefa concluída, movendo este arquivo para `docs/Tarefas feitas/` com `status: feito`.

---

## 2. Contexto

### 2.1 — O bug: ordenação incorreta dos meses

Em `/pagamentos` (tela do estudante, `EstudantePagamentosPainel.tsx`), a subtela de pagamento de
mensalidades ordenava os meses pendentes assim:

```ts
const pend = meses.filter((m) => m.estado === "pendente").sort((a, b) => a.ano_letivo.localeCompare(b.ano_letivo) || a.mes - b.mes);
```

`a.mes - b.mes` compara o **número cru** do mês (1 a 12). Como o ano letivo começa em setembro (escolar) ou
outubro (superior) e termina em julho do ano seguinte, isso ordena os meses como se o ano letivo começasse
em janeiro — exatamente o bug relatado ("começa por janeiro"). Prova concreta (rodada de verdade em Node,
não hipotética) na seção 8.1.

**O backend já ordena certo.** `internal/finance/mensalidade.go`, função `ListMensalidades` (linha ~383):

```go
sort.Slice(result, func(i, j int) bool {
    if result[i].AnoLetivo != result[j].AnoLetivo {
        return result[i].AnoLetivo < result[j].AnoLetivo
    }
    if result[i].CodigoAcademia != result[j].CodigoAcademia {
        return result[i].CodigoAcademia < result[j].CodigoAcademia
    }
    return result[i].DataReferencia.Before(result[j].DataReferencia)
})
```

`DataReferencia` vem de `mesesAnoLetivo()` (mesmo arquivo, linha ~723), que já implementa a regra correta
(meses 9-12 no ano de início do ano letivo, meses 1-7 no ano seguinte; início em outubro para nível
superior) — coberta pelo teste `TestMensalidadeAnoLetivoEMesesRespeitamPeriodosFixos`
(`internal/finance/mensalidade_test.go`). O handler `ConsultarMensalidadesEstudante`
(`internal/handlers/mensalidade_handlers.go`) serializa esse array direto, sem reordenar. Ou seja: o array
que chega ao frontend em `mensalidades` (resposta de `GET /financeiro/mensalidades/estudante/:codigo`) **já
está cronologicamente correto**; o frontend é quem quebrava essa ordem ao reordenar sozinho com `a.mes -
b.mes` dentro da subtela de pagamento.

### 2.2 — O pedido completo (além do bug)

Fredy pediu, no mesmo fôlego do bug, uma reformulação de `/pagamentos` alinhada ao padrão já usado em
`/financas/pagamentos` (tela da academia):

1. **Ordenação correta** — resolvida pela mudança de comparador (seção 2.1 → seção 3.2).
2. **Formato de linha único**: `"[valor] - [mês] de [ano cívil do mês] ([ano letivo])"` — ex.: `"45 000,00
   Kz - Setembro de 2026 (2026/2027)"` — usando o mesmo cálculo de `/financas/pagamentos`
   (`FinanceiroPagamentosPainel.tsx`, função `mesesDoAnoLetivo`) para saber a que ano cívil cada mês
   pertence.
3. **Checkboxes organizados em lista** (não mais uma tabela de 4 colunas).
4. **Dividir em uma tabela/lista por academia só quando há pendências em mais de uma academia** — do
   contrário, uma lista só, sem título de seção.
5. **Título da seção**: quando dividido, `"Academia [código]"` → `"[Nome da academia]"`.
6. **Botão "Pagar mensalidades" → "Histórico de pagamentos"**, que agora abre uma subtela com a tabela de
   histórico que hoje aparece fixa embaixo do card "Meus pagamentos" (pagos, anulados, pendentes, com
   filtros de tipo/estado e paginação — sem nenhuma mudança de comportamento, só de local).
7. **A lógica de pagamento (seleção de mensalidades → escolha do método em 3 caixas, só 1 selecionável →
   confirmar) passa a viver na tela principal**, no lugar de onde ficava o botão "Pagar mensalidades" — ou
   seja, os dois papéis trocam de lugar: o que estava fixo (histórico) vira uma subtela sob demanda; o que
   estava atrás de um clique (pagamento) fica sempre visível.

Cada um desses pontos tem uma decisão de design explícita e justificada na seção 3 — a ambiguidade em cada
um foi resolvida por Claude, não deixada para o Codex decidir.

---

## 3. Decisões de design já tomadas

**#1 — Ano cívil de cada mês vem de `data_referencia`, não recalculado a partir do nível.**
`MensalidadeMesView` (tanto em `internal/finance/mensalidade.go` quanto em `src/types/api.ts`) já traz
`data_referencia` — a data exata (`time.Date(ano, mes, 1, ...)`) que o backend calculou em `mesesAnoLetivo()`
para aquele mês. Em vez de duplicar no cliente a regra "setembro/outubro até julho" (como
`FinanceiroPagamentosPainel.tsx` faz em `mesesDoAnoLetivo`, porque ali o mês ainda não tem um
`MensalidadeMesView` associado — é só um drill-down de navegação), `formatarLinhaMensalidade` (nova função em
`financeiroShared.tsx`) extrai o ano cívil direto de `data_referencia` com `getUTCFullYear()`. Duas vantagens
sobre recalcular: (a) menos código duplicado; (b) fica correto mesmo se uma academia tiver uma exceção de
mês de início de cobrança (`MesInicioCobrancaInput`) — `data_referencia` já reflete qualquer regra aplicada
no servidor, sem o cliente precisar conhecê-la.

**`getUTCFullYear()`, não `getFullYear()`.** `data_referencia` chega como meia-noite UTC (ex.
`"2027-01-01T00:00:00Z"`). Em fusos horários negativos, `new Date(...).getFullYear()` local devolveria
**2026** para essa mesma data (o dia local ainda seria 31 de dezembro) — quebrando exatamente o mês de
virada de ano (janeiro). Reproduzido de verdade na seção 8.2. Como `mes` já vem pronto em
`MensalidadeMesView.mes`, só o ano precisa ser extraído de `data_referencia` — não há necessidade de extrair
o mês da mesma forma (evita o mesmo risco duas vezes).

**#2 — Comparador cronológico usa `data_referencia`, não `a.mes - b.mes`.** Mesma fonte de verdade do item
#1 — `compararMensalidadesPorData`, nova função em `financeiroShared.tsx`, usada tanto para ordenar a lista
principal quanto (indiretamente) para achar "o mês pendente mais antigo" de cada academia.

**#3 — `NOME_MES`/`capitalizar` centralizados em `financeiroShared.tsx`.** Antes desta tarefa, essas duas
constantes existiam só dentro de `FinanceiroPagamentosPainel.tsx` (não exportadas). Como o pedido é
explicitamente "o mesmo cálculo" usado em `/financas/pagamentos`, a forma mais segura de garantir isso — e
de nunca deixar as duas telas divergirem silenciosamente no futuro — é uma única fonte, não duas cópias.
`FinanceiroPagamentosPainel.tsx` passa a importar as duas de `financeiroShared.tsx` em vez de declará-las
localmente; `mesesDoAnoLetivo` (a função que as usa ali) não muda nenhuma linha de lógica, só a origem das
duas constantes. Diff mínimo, comportamento idêntico (confirmado por `tsc`/`eslint` limpos antes e depois).

**#4 — Divisão em tabelas usa `mensalidades.data` cru, não a lista já filtrada pelo `<Select>` de estado.**
Se a divisão fosse recalculada a partir da lista já filtrada por "Estado", trocar o filtro para "Pagos" (por
exemplo) zeraria momentaneamente as pendências visíveis e o layout pularia entre dividido/unificado a cada
troca de filtro — confuso. A contagem de "quantas academias têm pendência" usa sempre o array completo
(`mensalidades.data?.mensalidades`), então a decisão de dividir ou não fica estável enquanto o estudante
navega pelos filtros; só o **conteúdo** de cada lista (o que é mostrado) respeita o filtro.

**#5 — Botão "Histórico de pagamentos" é único e global, não um por academia.** Antes, "Pagar mensalidades"
existia um por academia (só aparecia se aquela academia tinha pendência) e abria uma subtela de pagamento
*daquela* academia. A seção de histórico, ao contrário, sempre foi **uma seção só, global** (não filtrada
por academia — `consultarCobrancasEstudante` não recebe `codigo_academia`). Como o pedido é mover
literalmente essa mesma seção (mesmos filtros, mesma tabela, mesma paginação) para trás de um botão, o botão
também precisa ser único e global — não faria sentido ter 2+ botões idênticos, um por seção de academia,
todos abrindo a mesma subtela. Colocado ao lado do título "Meus pagamentos".

**#6 — Estado de seleção/método/telefone/resultado por academia (`Record<string, ...>`), com
`useRef<Set<string>>` para não resetar seleção em andamento.** Como o pagamento passa a ficar inline (não
mais atrás de um clique que abre uma subtela isolada), é possível ter os controles de pagamento de 2+
academias visíveis ao mesmo tempo (quando há pendência em mais de uma). Cada `Record` é chaveado por
`codigo_academia`. Um `useRef<Set<string>>` (`initializedRef`) guarda quais academias já tiveram seu valor
padrão calculado (mês pendente mais antigo pré-selecionado, primeiro método habilitado) — sem isso, qualquer
refetch de `mensalidades` (ex.: o estudante paga a Academia A) apagaria a seleção em andamento do estudante
na Academia B. Só é removido do `Set` de propósito, para a academia que **acabou de ser paga**, logo após a
confirmação — assim, quando os dados atualizados chegarem, a próxima mensalidade pendente (se houver) já
fica pré-selecionada, pronta para quando o estudante clicar em "Selecionar outros meses" (ver #7).

**#7 — Resultado do pagamento congela o método usado (`metodoUsado`), não lê o `metodo` "ao vivo".** Depois
de confirmar um pagamento, o `useEffect` do item #6 recalcula o método padrão daquela academia assim que os
dados atualizados chegam — o que poderia ser um método diferente do que foi de fato usado na cobrança que
acabou de ser criada. Por isso `ResultadoPagamento` guarda `metodoUsado` junto com a `cobranca`, capturado no
momento exato da chamada a `pagar.execute`, e a tela de resultado (QR/referência/aviso de telefone) sempre lê
`resultado.metodoUsado`, nunca o `metodo[academia]` do estado ao vivo. Sem isso, um estudante que pagou por
QR Code poderia ver a tela de resultado mostrar o aviso de "GPO" (ou vice-versa) se o método padrão mudasse
entre o clique em "Confirmar" e o próximo render.

**#8 — Seletor de método sempre mostra as 3 caixas; desabilita as que a academia não aceita, não esconde.**
`metodos_pagamento_por_academia[academia]` pode ter 1, 2 ou 3 métodos. Esconder as caixas não habilitadas
mudaria o layout de 1 para 3 colunas dependendo da academia (inconsistente); desabilitar (opacidade reduzida
+ `disabled`, mesmo padrão visual já usado em `SubtelaCard`/`MetodoPagamentoSelector`) deixa sempre 3 caixas
visíveis, com a(s) indisponível(is) claramente marcada(s) como tal — mesma filosofia do resto do módulo
financeiro, que nunca omite estado, só desabilita ações indisponíveis.

**#9 — `EmptyState` adicionado para "nenhuma mensalidade".** Não existia antes (a seção "Meus pagamentos"
simplesmente não renderizava nada se `filtered` estivesse vazio). Como a tarefa já reescreve inteiramente
essa parte da tela, adicionar um `EmptyState` (mesmo componente já usado no histórico) é uma melhoria mínima
e de baixo risco — evita a seção parecer quebrada quando o estudante não tem nenhuma mensalidade, ou quando
o filtro de estado não bate com nada. Junto com isso, um `LoadingState` cobre a janela entre montar o
componente e a primeira resposta de `mensalidades` chegar (sem isso, o novo `EmptyState` apareceria
brevemente e de forma enganosa durante todo carregamento inicial).

**#10 — `onVoltar` da subtela de detalhe da cobrança aponta para `"historico"`, não mais para `"lista"`.**
Antes, a única forma de abrir o detalhe de uma cobrança era a partir da seção de histórico (sempre visível na
tela principal), então "Voltar" ia direto para `"lista"`. Agora que o histórico é uma subtela própria, o
detalhe só é alcançável a partir de dentro dela — "Voltar" deve devolver o estudante para onde ele estava
(filtros e paginação do histórico preservados no estado do componente), não pular direto para a tela
principal.

---

## 4. Diffs exatos

### 4.1 — `src/components/paineis/financeiroShared.tsx`

**Edição 1 — import de tipos.**

Localizar:

```ts
import type { AcademiaNivel, CobrancaResumo, EstudanteDetalhado, FinanceiroMetodoPagamento, FinanceiroNivel, FinanceiroOrigemCobranca, NivelEscolar } from "@/types/api";
```

Substituir por:

```ts
import type { AcademiaNivel, CobrancaResumo, EstudanteDetalhado, FinanceiroMetodoPagamento, FinanceiroNivel, FinanceiroOrigemCobranca, MensalidadeMesView, NivelEscolar } from "@/types/api";
```

**Edição 2 — novas funções utilitárias, logo depois de `METODO_PAGAMENTO_LABEL`.**

Localizar:

```ts
export const METODO_PAGAMENTO_LABEL: Record<FinanceiroMetodoPagamento, string> = {
  GPO: "MCX Express via número de telefone",
  REF: "Pagamento por referência",
  GPO_QR: "QR Code",
};

/**
 * Rótulo de exibição de cada nível de ensino, seguindo a terminologia
```

Substituir por:

```ts
export const METODO_PAGAMENTO_LABEL: Record<FinanceiroMetodoPagamento, string> = {
  GPO: "MCX Express via número de telefone",
  REF: "Pagamento por referência",
  GPO_QR: "QR Code",
};

/**
 * Nomes reais dos meses em pt-AO, com a primeira letra maiúscula — extraído
 * de FinanceiroPagamentosPainel (mesesDoAnoLetivo) para ser a única fonte
 * de nome de mês usada em toda parte de /financas/pagamentos e /pagamentos.
 * A formatação "long" do Intl para pt-AO devolve o nome em minúsculas
 * ("setembro"); `capitalizar` é sempre aplicado por cima para exibição.
 */
export const NOME_MES = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("pt-AO", { month: "long" }).format(new Date(2026, i, 1))
);
export function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Chave estável de uma mensalidade (usada para seleção de checkboxes e
 * para montar o payload de MensalidadePagamentoInput.meses) — mesmo
 * formato "ano_letivo:mes" já usado em EstudantePagamentosPainel antes
 * desta tarefa.
 */
export function chaveMensalidade(m: Pick<MensalidadeMesView, "ano_letivo" | "mes">) {
  return `${m.ano_letivo}:${m.mes}`;
}

/**
 * Comparador cronológico de mensalidades — usa `data_referencia`, já
 * calculada corretamente pelo backend em mesesAnoLetivo()
 * (internal/finance/mensalidade.go: meses 9–12 no ano de início do ano
 * letivo, meses 1–7 no ano seguinte). Nunca comparar `a.mes - b.mes`
 * diretamente: como o ano letivo começa em setembro/outubro, isso ordena
 * as mensalidades como se o ano começasse em janeiro (bug corrigido nesta
 * tarefa).
 */
export function compararMensalidadesPorData(a: MensalidadeMesView, b: MensalidadeMesView) {
  return new Date(a.data_referencia).getTime() - new Date(b.data_referencia).getTime();
}

/**
 * Linha de exibição de uma mensalidade no formato "[valor] - [mês] de [ano
 * cívil] ([ano letivo])" (ex.: "45 000,00 Kz - Setembro de 2026
 * (2026/2027)") — mesmo padrão de nome de mês de
 * FinanceiroPagamentosPainel (mesesDoAnoLetivo), mas o ano cívil vem
 * diretamente de `data_referencia` (já calculado pelo backend) em vez de
 * recalculado aqui a partir do nível — evita duplicar a regra de mês de
 * início (setembro para fundamental/médio, outubro para superior) no
 * cliente. `getUTCFullYear()` é proposital: `data_referencia` chega como
 * meia-noite UTC (ex. "2027-01-01T00:00:00Z") e usar os métodos locais
 * (`getFullYear`/`getMonth`) puxaria a data para o dia anterior — e para o
 * ano/mês civil errado — em fusos horários negativos.
 */
export function formatarLinhaMensalidade(m: MensalidadeMesView) {
  const anoCivil = new Date(m.data_referencia).getUTCFullYear();
  return `${money(m.valor)} - ${capitalizar(NOME_MES[m.mes - 1])} de ${anoCivil} (${formatAnoLetivo(m.ano_letivo)})`;
}

/**
 * Rótulo de exibição de cada nível de ensino, seguindo a terminologia
```

**Edição 3 — novo componente `MetodoPagamentoSelector`, logo antes de `LoadingState`.**

Localizar:

```ts
export function Qr({ value }: { value?: string }) {
  if (!value) return null;
  return value.startsWith("data:image") ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={value} alt="QR Code" className="max-h-64 rounded border p-2" />
  ) : (
    <pre className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs dark:bg-gray-800">{value}</pre>
  );
}

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
```

Substituir por:

```ts
export function Qr({ value }: { value?: string }) {
  if (!value) return null;
  return value.startsWith("data:image") ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={value} alt="QR Code" className="max-h-64 rounded border p-2" />
  ) : (
    <pre className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs dark:bg-gray-800">{value}</pre>
  );
}

const METODO_ICON: Record<FinanceiroMetodoPagamento, string> = {
  GPO: "mdi:cellphone",
  REF: "mdi:barcode",
  GPO_QR: "mdi:qrcode",
};
const METODOS_ORDEM: FinanceiroMetodoPagamento[] = ["GPO", "REF", "GPO_QR"];

/**
 * Seletor de método de pagamento em 3 caixas (nunca um <select>) — usada
 * em EstudantePagamentosPainel, onde a lógica de pagamento passou a ficar
 * na tela principal. Sempre mostra as 3 opções, na mesma ordem (GPO, REF,
 * GPO_QR); as que a academia não habilitou em
 * `metodos_pagamento_por_academia` ficam desabilitadas em vez de
 * escondidas — mesmo raciocínio do resto do módulo financeiro, que nunca
 * omite estado, só desabilita ações indisponíveis. Comportamento de rádio:
 * no máximo 1 escolhida por vez.
 */
export function MetodoPagamentoSelector({ value, disponiveis, onChange }: {
  value: FinanceiroMetodoPagamento;
  disponiveis: FinanceiroMetodoPagamento[];
  onChange: (m: FinanceiroMetodoPagamento) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Método de pagamento">
      {METODOS_ORDEM.map((m) => {
        const habilitado = disponiveis.includes(m);
        const selecionado = value === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={selecionado}
            disabled={!habilitado}
            onClick={() => onChange(m)}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition ${
              selecionado
                ? "border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10"
                : "border-gray-200 bg-white hover:border-brand-300 dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:border-brand-500/40"
            } ${!habilitado ? "cursor-not-allowed opacity-40 hover:border-gray-200 dark:hover:border-white/[0.05]" : "cursor-pointer"}`}
          >
            <Icon icon={METODO_ICON[m]} width={22} className={selecionado ? "text-brand-500" : "text-gray-500 dark:text-gray-400"} />
            <span className={`text-sm font-medium ${selecionado ? "text-brand-600 dark:text-brand-400" : "text-gray-700 dark:text-gray-300"}`}>
              {METODO_PAGAMENTO_LABEL[m]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
```

### 4.2 — `src/components/paineis/FinanceiroPagamentosPainel.tsx`

**Edição 1 — import de `financeiroShared`.**

Localizar:

```ts
import {
  CobrancasTable,
  EmptyState,
  LoadingState,
  PaginacaoSetas,
  SubtelaDetalheCobranca,
  SubtelaPanel,
  SubtelasMenu,
  formatAnoLetivo,
  money,
} from "@/components/paineis/financeiroShared";
```

Substituir por:

```ts
import {
  CobrancasTable,
  EmptyState,
  LoadingState,
  NOME_MES,
  PaginacaoSetas,
  SubtelaDetalheCobranca,
  SubtelaPanel,
  SubtelasMenu,
  capitalizar,
  formatAnoLetivo,
  money,
} from "@/components/paineis/financeiroShared";
```

**Edição 2 — remover as duas constantes locais (agora vêm de `financeiroShared.tsx`).**

Localizar:

```ts
/** Nomes reais dos meses em pt-AO — mesmo padrão de MES_NOME_OPCOES em FinanceiroConfiguracoesPainel.tsx. */
const NOME_MES = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("pt-AO", { month: "long" }).format(new Date(2026, i, 1))
);
function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type MesDoAnoLetivo = { mes: number; ano: number; label: string };
```

Substituir por:

```ts
type MesDoAnoLetivo = { mes: number; ano: number; label: string };
```

Nenhuma outra linha de `FinanceiroPagamentosPainel.tsx` muda — `mesesDoAnoLetivo` continua exatamente igual,
só passa a usar o `NOME_MES`/`capitalizar` importados em vez dos locais.

---

## 5. Arquivo a substituir por completo — `src/components/paineis/EstudantePagamentosPainel.tsx`

Substitua o conteúdo inteiro do arquivo pelo abaixo (é uma reescrita completa; não faça merge parcial com o
conteúdo atual):

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { consultasService, financeiroService, tokenStorage, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserCookie } from "@/hooks/useUserCookie";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import SearchableSelect from "@/components/form/SearchableSelect";
import Checkbox from "@/components/form/input/Checkbox";
import {
  CobrancasTable,
  EmptyState,
  LoadingState,
  MetodoPagamentoSelector,
  PaginacaoSetas,
  Qr,
  StatusBadge,
  SubtelaDetalheCobranca,
  SubtelaPanel,
  chaveMensalidade,
  compararMensalidadesPorData,
  formatarLinhaMensalidade,
} from "@/components/paineis/financeiroShared";
import type { CobrancaResumo, FinanceiroMetodoPagamento, FinanceiroOrigemCobranca, MensalidadeMesView, QRCodeChargeResult } from "@/types/api";

const PAGE_SIZE = 30;
function getCodigo(user: any) { return user?.estudante?.codigo_estudante || user?.estudante?.codigo || user?.codigo; }

const TIPO_OPCOES: { value: "" | FinanceiroOrigemCobranca; label: string }[] = [
  { value: "", label: "Todos os tipos" },
  { value: "mensalidade", label: "Mensalidade" },
  { value: "matricula", label: "Matrícula" },
  { value: "avulsa", label: "Outros" },
];

const ESTADO_HISTORICO_OPCOES = [
  { value: "", label: "Todos os estados" },
  { value: "Success", label: "Pago" },
  { value: "Pending", label: "Pendente" },
  { value: "Failed", label: "Falhado" },
  { value: "Cancelled", label: "Cancelado" },
];

type ResultadoPagamento = { cobranca: QRCodeChargeResult; metodoUsado: FinanceiroMetodoPagamento };

type Tela = { nome: "lista" } | { nome: "historico" } | { nome: "detalhe"; cobranca: CobrancaResumo };

/**
 * Uma seção de mensalidades de uma única academia: lista (não mais
 * tabela) com uma linha por mês no formato "[valor] - [mês] de [ano
 * cívil] ([ano letivo])" (formatarLinhaMensalidade) — meses pendentes
 * viram checkbox selecionável, os demais (pago/anulado) ficam como linha
 * somente leitura com StatusBadge. Logo abaixo, quando há pendências e
 * nenhum resultado de pagamento em andamento, os controles de pagamento
 * (seleção já embutida nos checkboxes acima + método + confirmar); com
 * resultado presente, mostra o status da cobrança no lugar dos controles.
 *
 * `academia` é sempre derivado do primeiro mês pendente de `linhas` (nunca
 * recebido como prop): como cada seção só mistura mensalidades de uma
 * mesma academia (tanto na divisão por academia quanto na visão unificada,
 * que só existe quando no máximo uma academia tem pendências — ver
 * `semDivisao` no componente principal), isso identifica corretamente a
 * academia relevante nos dois casos sem precisar de uma prop extra.
 */
function SecaoMensalidadesAcademia({
  titulo,
  linhas,
  selected,
  metodo,
  telefone,
  resultados,
  metodosPagamentoPorAcademia,
  onToggleMes,
  onMudarMetodo,
  onMudarTelefone,
  onConfirmar,
  onVerificarStatus,
  onNovaSelecao,
}: {
  titulo?: string;
  linhas: MensalidadeMesView[];
  selected: Record<string, string[]>;
  metodo: Record<string, FinanceiroMetodoPagamento>;
  telefone: Record<string, string>;
  resultados: Record<string, ResultadoPagamento | undefined>;
  metodosPagamentoPorAcademia: Record<string, FinanceiroMetodoPagamento[]>;
  onToggleMes: (academia: string, chave: string, checked: boolean) => void;
  onMudarMetodo: (academia: string, m: FinanceiroMetodoPagamento) => void;
  onMudarTelefone: (academia: string, v: string) => void;
  onConfirmar: (academia: string) => void;
  onVerificarStatus: () => void;
  onNovaSelecao: (academia: string) => void;
}) {
  const pendentes = linhas.filter((m) => m.estado === "pendente");
  const academia = pendentes[0]?.codigo_academia;
  const maisAntigaChave = pendentes[0] ? chaveMensalidade(pendentes[0]) : null;
  const resultado = academia ? resultados[academia] : undefined;
  const selecionados = academia ? selected[academia] ?? [] : [];
  const metodoAtual = academia ? metodo[academia] ?? "GPO" : "GPO";
  const telefoneAtual = academia ? telefone[academia] ?? "" : "";
  const disponiveis: FinanceiroMetodoPagamento[] = (academia ? metodosPagamentoPorAcademia[academia] : undefined) ?? ["GPO"];

  return (
    <div className="mt-5 rounded-xl border p-4 dark:border-white/[0.05]">
      {titulo && <h2 className="font-semibold text-gray-800 dark:text-white/90">{titulo}</h2>}
      {linhas.length === 0 ? (
        <p className={`text-sm text-gray-500 dark:text-gray-400 ${titulo ? "mt-3" : ""}`}>Nenhuma mensalidade neste filtro.</p>
      ) : (
        <div className={`space-y-2 ${titulo ? "mt-3" : ""}`}>
          {linhas.map((m) => {
            const chave = chaveMensalidade(m);
            const label = formatarLinhaMensalidade(m);
            if (m.estado === "pendente" && !resultado) {
              return (
                <Checkbox
                  key={chave}
                  id={`mes-${m.codigo_academia}-${chave}`}
                  checked={selecionados.includes(chave)}
                  disabled={chave === maisAntigaChave}
                  onChange={(checked) => academia && onToggleMes(academia, chave, checked)}
                  label={`${label}${chave === maisAntigaChave ? " (mais antigo, obrigatório)" : ""}`}
                />
              );
            }
            return (
              <div key={chave} className="flex items-center justify-between gap-3 py-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                <StatusBadge status={m.estado} />
              </div>
            );
          })}
        </div>
      )}

      {academia && (pendentes.length > 0 || resultado) && (
        resultado ? (
          <div className="mt-4 space-y-3 rounded-lg border border-gray-100 p-4 dark:border-white/[0.05]">
            <p className="text-sm text-gray-700 dark:text-gray-300">Status: {resultado.cobranca.status}</p>
            {resultado.metodoUsado === "GPO" && (
              <p className="text-sm text-gray-700 dark:text-gray-300">Você receberá uma notificação no telefone informado para confirmar o pagamento.</p>
            )}
            {resultado.metodoUsado === "REF" && (
              <pre className="rounded bg-gray-50 p-3 text-xs dark:bg-gray-800">{JSON.stringify(resultado.cobranca.response ?? {}, null, 2)}</pre>
            )}
            {resultado.metodoUsado === "GPO_QR" && <Qr value={resultado.cobranca.qrCodeArr} />}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={onVerificarStatus}>Verificar status</Button>
              <Button size="sm" variant="outline" onClick={() => onNovaSelecao(academia)}>Selecionar outros meses</Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <MetodoPagamentoSelector value={metodoAtual} disponiveis={disponiveis} onChange={(m) => onMudarMetodo(academia, m)} />
            {metodoAtual === "GPO" && (
              <Input placeholder="Telefone" value={telefoneAtual} onChange={(e) => onMudarTelefone(academia, e.target.value)} />
            )}
            <Button
              disabled={!selecionados.length || (metodoAtual === "GPO" && !telefoneAtual)}
              onClick={() => onConfirmar(academia)}
            >
              Confirmar pagamento
            </Button>
          </div>
        )
      )}
    </div>
  );
}

export default function EstudantePagamentosPainel() {
  const { user, loading } = useUserCookie();
  const restricted = tokenStorage.isRestrictedFinance();
  const codigo = getCodigo(user);

  const [tela, setTela] = useState<Tela>({ nome: "lista" });

  // ── Mensalidades pendentes + pagamento — lógica de seleção/pagamento
  // agora vive na tela principal (antes ficava numa subtela "pagar"),
  // então o estado é mantido por academia (Record chaveado por
  // codigo_academia) em vez de um único valor: mais de uma academia pode
  // ter controles de pagamento visíveis ao mesmo tempo quando há
  // pendências em mais de uma (ver `semDivisao` abaixo). ──
  const mensalidades = useApi(financeiroService.consultarMensalidadesEstudante);
  const pagar = useApi(financeiroService.iniciarPagamentoMensalidades);
  const [estadoMensalidades, setEstadoMensalidades] = useState("");
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [metodo, setMetodo] = useState<Record<string, FinanceiroMetodoPagamento>>({});
  const [telefone, setTelefone] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Record<string, ResultadoPagamento | undefined>>({});
  const [nomesAcademias, setNomesAcademias] = useState<Record<string, string>>({});
  // Academias cujo `selected`/`metodo` padrão já foi calculado — evita
  // recalcular (e apagar a seleção em andamento do estudante) a cada
  // refetch de `mensalidades`. Só é removido de propósito logo após um
  // pagamento confirmado daquela academia (ver `confirmarPagamento`), para
  // que ela seja recalculada com os dados novos assim que o resultado for
  // dispensado em "Selecionar outros meses".
  const initializedRef = useRef<Set<string>>(new Set());
  // Academias cujo nome já foi buscado (com sucesso ou falha) — evita
  // repetir a requisição a cada render; em caso de falha o título mantém
  // o fallback "Academia [código]" (ver render abaixo).
  const nomesFetchedRef = useRef<Set<string>>(new Set());

  // ── Histórico completo de cobranças — mesma fonte/filtros de antes,
  // agora renderizado dentro da subtela "Histórico de pagamentos" em vez
  // de uma seção fixa no fim da página. ──
  const historico = useApi(financeiroService.consultarCobrancasEstudante);
  const [tipoHistorico, setTipoHistorico] = useState<"" | FinanceiroOrigemCobranca>("");
  const [estadoHistorico, setEstadoHistorico] = useState("");
  const [paginaHistorico, setPaginaHistorico] = useState(1);

  const [alert, setAlert] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && codigo) {
      void mensalidades.execute(codigo).catch((e) => setAlert(formatApiError(e, "Não foi possível carregar mensalidades.")));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, codigo]);

  useEffect(() => {
    if (!loading && codigo && !restricted) {
      void historico
        .execute(codigo, {
          limit: PAGE_SIZE,
          offset: (paginaHistorico - 1) * PAGE_SIZE,
          tipo: tipoHistorico ? [tipoHistorico] : undefined,
          estado: estadoHistorico ? [estadoHistorico] : undefined,
        })
        .catch((e) => setAlert(formatApiError(e, "Não foi possível carregar o histórico de cobranças.")));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, codigo, restricted, paginaHistorico, tipoHistorico, estadoHistorico]);

  // Calcula a seleção/método padrão de cada academia com pendências que
  // ainda não foi inicializada — mesmo cálculo que antes rodava em
  // "abrirPagamento" (mês pendente mais antigo pré-selecionado e
  // obrigatório, primeiro método habilitado da academia), só que agora
  // roda automaticamente para toda academia nova assim que os dados
  // chegam, em vez de esperar o estudante clicar em um botão por academia.
  useEffect(() => {
    const todas = mensalidades.data?.mensalidades ?? [];
    const metodosPorAcademia = mensalidades.data?.metodos_pagamento_por_academia ?? {};
    const academiasNovas = Array.from(new Set(todas.filter((m) => m.estado === "pendente").map((m) => m.codigo_academia)))
      .filter((a) => !initializedRef.current.has(a));
    if (academiasNovas.length === 0) return;
    setSelected((prev) => {
      const next = { ...prev };
      for (const academia of academiasNovas) {
        const pendentes = todas
          .filter((m) => m.codigo_academia === academia && m.estado === "pendente")
          .sort(compararMensalidadesPorData);
        next[academia] = pendentes[0] ? [chaveMensalidade(pendentes[0])] : [];
      }
      return next;
    });
    setMetodo((prev) => {
      const next = { ...prev };
      for (const academia of academiasNovas) next[academia] = (metodosPorAcademia[academia]?.[0] ?? "GPO") as FinanceiroMetodoPagamento;
      return next;
    });
    academiasNovas.forEach((a) => initializedRef.current.add(a));
  }, [mensalidades.data]);

  // Nome de cada academia presente nas mensalidades — troca o título
  // "Academia [código]" por "[Nome da academia]" quando a divisão por
  // academia está ativa. GET /consultar-academia/:codigo é público (ver
  // OptionalAuthMiddleware em cmd/server/main.go), então qualquer
  // estudante pode consultar o nome de qualquer academia à qual tenha
  // mensalidades vinculadas.
  useEffect(() => {
    const codigos = Array.from(new Set((mensalidades.data?.mensalidades ?? []).map((m) => m.codigo_academia)));
    const faltantes = codigos.filter((c) => !nomesFetchedRef.current.has(c));
    if (faltantes.length === 0) return;
    faltantes.forEach((c) => nomesFetchedRef.current.add(c));
    faltantes.forEach((codigoAcademia) => {
      consultasService
        .academia(codigoAcademia)
        .then((r) => setNomesAcademias((prev) => ({ ...prev, [codigoAcademia]: r.academia.nome })))
        .catch(() => { /* mantém o fallback "Academia [código]" no título desta academia */ });
    });
  }, [mensalidades.data]);

  const toggleMes = (academia: string, chave: string, checked: boolean) => {
    setSelected((prev) => {
      const atual = prev[academia] ?? [];
      return { ...prev, [academia]: checked ? [...atual, chave] : atual.filter((x) => x !== chave) };
    });
  };
  const mudarMetodo = (academia: string, m: FinanceiroMetodoPagamento) => setMetodo((prev) => ({ ...prev, [academia]: m }));
  const mudarTelefone = (academia: string, v: string) => setTelefone((prev) => ({ ...prev, [academia]: v }));
  const novaSelecao = (academia: string) => setResult((prev) => ({ ...prev, [academia]: undefined }));

  const confirmarPagamento = async (academia: string) => {
    const metodoUsado = metodo[academia] ?? "GPO";
    const meses = (selected[academia] ?? []).map((chave) => {
      const [ano_letivo, mesStr] = chave.split(":");
      return { ano_letivo, mes: Number(mesStr) };
    });
    try {
      const r = await pagar.execute({ codigo_academia: academia, meses, metodo_pagamento: metodoUsado, telefone: metodoUsado === "GPO" ? (telefone[academia] ?? "") : undefined });
      if (r) setResult((prev) => ({ ...prev, [academia]: { cobranca: r.cobranca, metodoUsado } }));
      // Força o recálculo da seleção padrão desta academia assim que os
      // dados atualizados chegarem (ver efeito acima) — se ainda restarem
      // pendências, a próxima mais antiga já fica pronta para quando o
      // estudante clicar em "Selecionar outros meses".
      initializedRef.current.delete(academia);
      await mensalidades.execute(codigo);
    } catch (e) {
      setAlert(formatApiError(e, "Não foi possível iniciar o pagamento."));
    }
  };

  if (loading) return <LoadingState label="Carregando..." />;
  if (!codigo) return <Alert variant="error" title="Pagamentos" message="Não foi possível identificar o estudante logado." />;

  if (tela.nome === "detalhe") {
    return <SubtelaDetalheCobranca cobranca={tela.cobranca} onVoltar={() => setTela({ nome: "historico" })} mostrarDadosEstudante={false} />;
  }

  if (tela.nome === "historico") {
    const totalHistorico = historico.data?.total_geral ?? 0;
    const totalPaginasHistorico = Math.max(1, Math.ceil(totalHistorico / PAGE_SIZE));
    return (
      <SubtelaPanel title="Histórico de pagamentos" icon="mdi:history" onVoltar={() => setTela({ nome: "lista" })}>
        {alert && <Alert variant="error" title="Pagamentos" message={alert} />}
        {restricted ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Histórico completo indisponível nesta sessão restrita; apenas mensalidades e pagamento estão liberados.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <SearchableSelect
                value={tipoHistorico}
                options={TIPO_OPCOES}
                onChange={(v) => { setTipoHistorico(v); setPaginaHistorico(1); }}
                placeholder="Tipo de cobrança"
                isSearchable={false}
                isClearable={false}
                inputId="historico-tipo"
                name="historico-tipo"
              />
              <SearchableSelect
                value={estadoHistorico}
                options={ESTADO_HISTORICO_OPCOES}
                onChange={(v) => { setEstadoHistorico(v); setPaginaHistorico(1); }}
                placeholder="Estado do pagamento"
                isSearchable={false}
                isClearable={false}
                inputId="historico-estado"
                name="historico-estado"
              />
            </div>
            <div className="mt-4">
              {historico.loading ? (
                <LoadingState label="Carregando histórico..." />
              ) : (historico.data?.cobrancas?.length ?? 0) > 0 ? (
                <CobrancasTable rows={historico.data?.cobrancas ?? []} onOpen={(c) => setTela({ nome: "detalhe", cobranca: c })} />
              ) : (
                <EmptyState title="Sem histórico." description="Nenhuma cobrança foi encontrada para os filtros selecionados." />
              )}
            </div>
            <div className="mt-4">
              <PaginacaoSetas paginaAtual={paginaHistorico} totalPaginas={totalPaginasHistorico} total={totalHistorico} porPagina={PAGE_SIZE} onChange={setPaginaHistorico} />
            </div>
          </>
        )}
      </SubtelaPanel>
    );
  }

  const filtered = (mensalidades.data?.mensalidades ?? []).filter((m) => !estadoMensalidades || m.estado === estadoMensalidades);
  const byAcademia = filtered.reduce<Record<string, MensalidadeMesView[]>>((acc, m) => { (acc[m.codigo_academia] ??= []).push(m); return acc; }, {});
  // Só divide em uma tabela/lista por academia quando há pendências em
  // mais de uma — o cálculo usa as mensalidades sem o filtro de estado
  // (`mensalidades.data`, não `filtered`) para que a divisão não mude
  // conforme o estudante troca o filtro "Estado" acima da lista.
  const academiasComPendencia = new Set((mensalidades.data?.mensalidades ?? []).filter((m) => m.estado === "pendente").map((m) => m.codigo_academia));
  const semDivisao = academiasComPendencia.size <= 1;
  const metodosPagamentoPorAcademia = mensalidades.data?.metodos_pagamento_por_academia ?? {};

  return (
    <div className="space-y-6">
      {restricted && <Alert variant="warning" title="Acesso financeiro restrito" message="O seu vínculo com a academia foi encerrado. Você pode consultar e regularizar pendências financeiras aqui." />}
      {alert && <Alert variant="error" title="Pagamentos" message={alert} />}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Meus pagamentos</h1>
          <Button size="sm" variant="outline" onClick={() => setTela({ nome: "historico" })}>Histórico de pagamentos</Button>
        </div>
        <div className="mt-4">
          <Select
            key={estadoMensalidades}
            defaultValue={estadoMensalidades}
            options={[{ value: "", label: "Todos estados" }, { value: "pendente", label: "Pendentes" }, { value: "pago", label: "Pagos" }, { value: "anulado", label: "Anulados" }]}
            onChange={(v) => setEstadoMensalidades(v)}
          />
        </div>

        {mensalidades.loading ? (
          <div className="mt-5"><LoadingState label="Carregando mensalidades..." /></div>
        ) : filtered.length === 0 ? (
          <div className="mt-5"><EmptyState title="Nenhuma mensalidade encontrada." description="Não há mensalidades para os filtros selecionados." /></div>
        ) : semDivisao ? (
          <SecaoMensalidadesAcademia
            linhas={[...filtered].sort(compararMensalidadesPorData)}
            selected={selected}
            metodo={metodo}
            telefone={telefone}
            resultados={result}
            metodosPagamentoPorAcademia={metodosPagamentoPorAcademia}
            onToggleMes={toggleMes}
            onMudarMetodo={mudarMetodo}
            onMudarTelefone={mudarTelefone}
            onConfirmar={confirmarPagamento}
            onVerificarStatus={() => void mensalidades.execute(codigo)}
            onNovaSelecao={novaSelecao}
          />
        ) : (
          Object.entries(byAcademia).map(([academia, linhas]) => (
            <SecaoMensalidadesAcademia
              key={academia}
              titulo={nomesAcademias[academia] ?? `Academia ${academia}`}
              linhas={[...linhas].sort(compararMensalidadesPorData)}
              selected={selected}
              metodo={metodo}
              telefone={telefone}
              resultados={result}
              metodosPagamentoPorAcademia={metodosPagamentoPorAcademia}
              onToggleMes={toggleMes}
              onMudarMetodo={mudarMetodo}
              onMudarTelefone={mudarTelefone}
              onConfirmar={confirmarPagamento}
              onVerificarStatus={() => void mensalidades.execute(codigo)}
              onNovaSelecao={novaSelecao}
            />
          ))
        )}
      </section>
    </div>
  );
}
```

---

## 6. Ordem de execução recomendada

1. `src/components/paineis/financeiroShared.tsx` — as 3 edições da seção 4.1, nesta ordem.
2. `src/components/paineis/FinanceiroPagamentosPainel.tsx` — as 2 edições da seção 4.2.
3. `src/components/paineis/EstudantePagamentosPainel.tsx` — substituir pelo conteúdo completo da seção 5.
4. Rodar a checklist da seção 7.

---

## 7. Checklist de aceitação

1. **TypeScript limpo:** `npx tsc --noEmit` sem nenhuma saída de erro.
2. **ESLint limpo:** `npx eslint src/components/paineis/EstudantePagamentosPainel.tsx
   src/components/paineis/financeiroShared.tsx src/components/paineis/FinanceiroPagamentosPainel.tsx` sem
   nenhuma saída.
3. **Build de produção** (se o ambiente tiver acesso a `fonts.googleapis.com` — ver seção 0, item 5):
   `npm run build` termina com sucesso, com `/pagamentos` e `/financas/pagamentos` aparecendo na tabela de
   rotas da saída, sem erro. Se não tiver acesso, pule este item e registre a limitação de rede na
   documentação final (não é um problema desta tarefa).
4. **Diff final** — `git status --short` deve mostrar exatamente estes três arquivos modificados (`M`), e
   nenhum arquivo novo, nenhum lockfile (`package-lock.json`/`yarn.lock`) alterado:
   - `src/components/paineis/EstudantePagamentosPainel.tsx`
   - `src/components/paineis/FinanceiroPagamentosPainel.tsx`
   - `src/components/paineis/financeiroShared.tsx`

---

## 8. Evidência de validação (já executada por Claude)

```
$ npx tsc --noEmit         # limpo, antes e depois das mudanças
$ npx eslint src/components/paineis/EstudantePagamentosPainel.tsx \
              src/components/paineis/financeiroShared.tsx \
              src/components/paineis/FinanceiroPagamentosPainel.tsx
                            # limpo (0 erros, 0 warnings)
$ npx eslint .              # 7 problemas, todos em arquivos fora do escopo desta tarefa
                            # (verificar-email/[token]/page.tsx, SelecaoContextoMassa.tsx,
                            # Calendar.tsx, AppSidebar.tsx) — nenhum novo introduzido por esta tarefa
$ npm run build             # bloqueado pela rede do sandbox (fonts.googleapis.com) — ver seção 0, item 5
```

### 8.1 — Prova do bug de ordenação e da correção (rodado em Node puro)

```js
const pendentes = [
  { ano_letivo: '2026_2027', mes: 9,  data_referencia: '2026-09-01T00:00:00Z' },
  { ano_letivo: '2026_2027', mes: 10, data_referencia: '2026-10-01T00:00:00Z' },
  { ano_letivo: '2026_2027', mes: 11, data_referencia: '2026-11-01T00:00:00Z' },
  { ano_letivo: '2026_2027', mes: 1,  data_referencia: '2027-01-01T00:00:00Z' },
  { ano_letivo: '2026_2027', mes: 2,  data_referencia: '2027-02-01T00:00:00Z' },
];

// Comportamento ANTIGO (bug): a.mes - b.mes
[...pendentes].sort((a,b) => a.ano_letivo.localeCompare(b.ano_letivo) || a.mes - b.mes)
  .map(m => m.mes);
// => [ 1, 2, 9, 10, 11 ]   ← começa em janeiro, exatamente o bug relatado

// Comportamento NOVO (corrigido): compararMensalidadesPorData
function compararMensalidadesPorData(a,b){ return new Date(a.data_referencia).getTime() - new Date(b.data_referencia).getTime(); }
[...pendentes].sort(compararMensalidadesPorData).map(m => m.mes);
// => [ 9, 10, 11, 1, 2 ]   ← começa em setembro, correto
```

### 8.2 — Prova do bug de fuso horário evitado por `getUTCFullYear()`

```js
const d = new Date('2027-01-01T00:00:00Z'); // mês 1 do ano_letivo 2026_2027

// Em qualquer timezone:
d.getUTCFullYear(); // => 2027 (correto, sempre)

// Rodado com TZ=America/New_York (fuso negativo):
d.getFullYear();    // => 2026 (ERRADO — mostraria "Janeiro de 2026" em vez de "Janeiro de 2027")
d.getMonth();        // => 11 (ERRADO — mostraria dezembro em vez de janeiro; por isso o mês usa
                      //         sempre `MensalidadeMesView.mes`, nunca extraído de data_referencia)
```

### 8.3 — Confirmação de que o backend já ordena corretamente (leitura de código, sem execução)

- `internal/finance/mensalidade.go`, `ListMensalidades` (linha ~383): `sort.Slice` por `AnoLetivo` →
  `CodigoAcademia` → `DataReferencia.Before` — cronológico, correto.
- `internal/finance/mensalidade.go`, `mesesAnoLetivo` (linha ~723): meses 9-12 no ano de início, 1-7 no ano
  seguinte; início em 10 (outubro) para `NivelSuperior`, 9 (setembro) para os demais.
- `internal/finance/mensalidade_test.go`, `TestMensalidadeAnoLetivoEMesesRespeitamPeriodosFixos`: confirma
  exatamente essa regra (11 meses para escolar começando em setembro, 10 meses para superior começando em
  outubro).
- `internal/handlers/mensalidade_handlers.go`, `ConsultarMensalidadesEstudante` (linha ~238): serializa o
  resultado de `ListMensalidades` direto em `c.JSON`, sem reordenar.

Nenhuma mudança de backend faz parte desta tarefa.

---

## 9. Comportamento esperado (para QA manual depois de aplicado)

- Em `/pagamentos`, a lista de mensalidades de cada academia aparece em ordem cronológica real (ex.:
  setembro, outubro, novembro, dezembro, depois janeiro a julho — nunca janeiro primeiro).
- Cada linha mostra o formato `"[valor] - [Mês] de [ano cívil] ([ano letivo])"`, ex.: `"45 000,00 Kz -
  Setembro de 2026 (2026/2027)"`.
- Meses pendentes aparecem como checkbox numa lista vertical (não mais tabela); o mês pendente mais antigo
  de cada academia vem sempre pré-marcado e não pode ser desmarcado (rótulo "(mais antigo, obrigatório)").
  Meses pagos/anulados aparecem como linha somente leitura com o badge de estado.
- Se o estudante só tem pendência em **uma** academia (ou nenhuma academia com pendência), a lista aparece
  **sem** título de seção, unificada. Se há pendência em **duas ou mais** academias, a lista se divide numa
  seção por academia, cada uma titulada com o **nome** da academia (não mais "Academia [código]").
- Abaixo dos meses pendentes de cada academia com pendência: 3 caixas de método de pagamento (só 1
  selecionável por vez; as que a academia não aceita aparecem desabilitadas), campo de telefone só quando o
  método é MCX Express, e botão "Confirmar pagamento".
- Depois de confirmar, a seção mostra o status da cobrança (aviso de telefone / JSON de referência / QR Code,
  conforme o método usado — sempre o método realmente usado nesse pagamento, mesmo que o padrão mude
  depois), com botões "Verificar status" e "Selecionar outros meses".
- O botão que antes era "Pagar mensalidades" agora é **"Histórico de pagamentos"**, único, ao lado do título
  "Meus pagamentos" — abre uma subtela com a mesma tabela de histórico (filtros de tipo/estado + paginação)
  que antes ficava sempre visível embaixo do card.
- Abrir o detalhe de uma cobrança a partir do histórico e clicar em "Voltar" retorna para a subtela de
  histórico (com os filtros/paginação como estavam), não direto para a tela principal.

---

## 10. Ao terminar

Gere a documentação de tarefa concluída (mova este arquivo para `docs/Tarefas feitas/`, criando a pasta se
ainda não existir) com `status: feito` e um resumo do que foi validado, seguindo o mesmo padrão de
`docs/Tarefas feitas/01 - Cartoes de tipo de cobranca e drill-down ano letivo-mes em financas-pagamentos.md`.
