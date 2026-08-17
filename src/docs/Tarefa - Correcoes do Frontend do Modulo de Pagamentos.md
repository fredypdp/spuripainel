---
titulo: Correções — Frontend do Módulo de Pagamentos
autor: Claude (orquestrador) — auditoria feita lendo o código-fonte real do commit já mesclado
base: main @ 0863a76 (merge da PR #277, commit `73757d0 feat: add frontend payments module`)
para: Codex (executor) — este documento é de execução direta, não de planejamento
atualizado: 2026-08-17
---

## 0. Como usar este documento

Todas as decisões de desenho já foram tomadas. **Não replaneje nada, não proponha alternativas, apenas execute cada item na ordem em que aparece.** Onde eu já dei a classe CSS, o nome do componente ou o texto exato, use exatamente isso — não é sugestão, é a especificação.

Regras gerais para esta execução:

- Trabalhe direto no `main` (o módulo já foi mesclado; não é um PR novo do zero, é uma correção em cima do que já existe).
- Depois de cada seção, rode `npx tsc --noEmit` para garantir que não quebrou tipos. **Não rode `npm run lint` nem `npm run build` neste ambiente** — ambos exigem coisas que o seu sandbox não tem (o build baixa a fonte `Outfit` do Google Fonts pela rede; parte do lint depende de regras que já falham em dois arquivos completamente fora deste módulo). Eu (orquestrador) validou os dois separadamente, ao vivo, e te devolvo o resultado depois.
- **Não toque** em `src/app/(full-width-pages)/verificar-email/[token]/page.tsx` nem em `src/components/calendar/Calendar.tsx` — os erros de lint reportados nesses dois arquivos são pré-existentes, de fora deste módulo, e não fazem parte desta tarefa.
- Ao final, devolva um resumo no mesmo formato que você já vem usando (Summary/Testing), listando item por item desta lista o que foi feito.

---

## 1. Leitura obrigatória antes de começar

- `src/docs/Tarefa - Frontend do Modulo de Pagamentos.md` — documento original completo. As Partes E, F e H citadas abaixo remetem a ele; leia a íntegra de cada parte antes de mexer nos arquivos correspondentes, este documento aqui só cobre o que está **faltando ou errado**, não repete o que já está certo.
- `src/components/paineis/FinanceiroCredenciaisPainel.tsx` — **modelo de referência obrigatório de novo**. É o único painel financeiro que já segue o padrão visual correto do projeto (cores, ícones, estados de carregamento/vazio, padrão de filtro "Contexto" + academia). Use-o como cópia de estilo para tudo que for corrigido abaixo.
- `src/app/(painel)/estudantes/PageContent.tsx`, função `parametrosConsultaEstudantes` (por volta da linha 1308) — referência do padrão correto de paginação: filtros são **opcionais**, nunca travam a consulta, e `codigo_academia` só é enviado quando o admin escolhe filtrar; se não escolher, a API devolve todos os resultados permitidos, paginados.
- `src/components/paineis/FinanceiroPagamentosPainel.tsx`, `src/components/paineis/FinanceiroConfiguracoesPainel.tsx`, `src/components/paineis/EstudantePagamentosPainel.tsx` — os três arquivos com a maior parte dos problemas descritos abaixo.
- `src/lib/api/services.ts` — trecho do `financeiroService` (a partir de `configurarMensalidade`, por volta da linha 865).

---

## 2. [BUG CRÍTICO] Rota errada em anular/reativar obrigações de mensalidade

Em `src/lib/api/services.ts`, dentro de `financeiroService`, as duas linhas abaixo apontam para rotas que **não existem** no backend (confirmado em `cmd/server/main.go` do repositório `spuri-backend`):

```ts
anularObrigacoes: (data: ObrigacaoMensalidadeInput, token?: string) => api.post<void, ObrigacaoMensalidadeInput>('/financeiro/mensalidades/anular', data, { token: token || tokenStorage.get() || undefined }),
reativarObrigacoes: (data: ObrigacaoMensalidadeInput, token?: string) => api.post<void, ObrigacaoMensalidadeInput>('/financeiro/mensalidades/reativar', data, { token: token || tokenStorage.get() || undefined }),
```

Troque as duas rotas para as reais:

```ts
anularObrigacoes: (data: ObrigacaoMensalidadeInput, token?: string) => api.post<void, ObrigacaoMensalidadeInput>('/financeiro/mensalidades/obrigacoes/anular', data, { token: token || tokenStorage.get() || undefined }),
reativarObrigacoes: (data: ObrigacaoMensalidadeInput, token?: string) => api.post<void, ObrigacaoMensalidadeInput>('/financeiro/mensalidades/obrigacoes/reativar', data, { token: token || tokenStorage.get() || undefined }),
```

Esse bug ainda é "inofensivo" hoje porque nenhuma tela chama esses dois métodos ainda — mas as seções 6.7 e 7 abaixo vão conectá-los, então corrija antes de continuar.

---

## 3. [AUTORIZAÇÃO] "Anular/reativar obrigações" é uma ação exclusiva da academia — admin FPP nunca pode usar

Confirmado no backend (`internal/handlers/mensalidade_handlers.go`, função `alterarObrigacoesMensalidadeHandler`, usada tanto por `AnularObrigacoesMensalidade` quanto por `ReativarObrigacoesMensalidade`):

```go
// FPP admins intentionally cannot make either of these business decisions.
if typ != "academia" {
    utils.RespondWithForbiddenError(c, "somente a academia dona pode anular ou reativar mensalidades")
    return
}
```

Isso é diferente de tudo o mais no módulo financeiro (onde admin FPP normalmente pode fazer o que a academia faz). Existe até um teste de integração no backend garantindo esse comportamento (`TestIntegrationFPPAdminNaoPodeAnularOuReativarMensalidade`). **Efeito prático para as seções 6.7 e 7 abaixo: a ferramenta de anular/reativar só pode aparecer quando `isAcademia` for verdadeiro. Nunca renderize essa ferramenta (nem desabilitada, nem escondida atrás de uma checagem client-side facilmente ignorável) para admin FPP — simplesmente não inclua o bloco na árvore quando `isAcademia` for falso.**

Já a ferramenta "definir início de cobrança excecional" (`definirInicioCobranca` / `DefinirMesInicioCobranca`) **não** tem essa restrição — confirmado via `authorizeMensalidadeAcademia`, que aceita tanto `academia` quanto `admin` com permissão `fpp`. Essa continua disponível para os dois papéis, como o restante do módulo.

---

## 4. [BUG GRAVE] `/financas/pagamentos` consulta uma academia por vez em vez de todas de uma vez, paginado

Em `src/components/paineis/FinanceiroPagamentosPainel.tsx`, a listagem principal (`GET /financeiro/cobrancas`) está assim hoje:

```ts
const [codigoAcademia,setCodigoAcademia]=useState(user?.academia?.codigo_academia??"");
// ...
const load=()=>{if(!codigoAcademia)return; return list.execute({contexto_tipo:"academia",codigo_academia:codigoAcademia,limit:20,offset:page*20, ...})...};
useEffect(()=>{if(!loading&&(isAcademia||isFpp)&&codigoAcademia)void list.execute({contexto_tipo:"academia",codigo_academia:codigoAcademia, ...})...},[loading,isAcademia,isFpp,codigoAcademia,page,tipo,estado,list]);
```

Para um admin FPP (que não tem `user?.academia`), `codigoAcademia` começa vazio e só é preenchido se ele escolher manualmente uma academia no `SearchableSelect` — ou seja, **hoje o admin é obrigado a escolher uma academia de cada vez para ver qualquer cobrança**, e nunca consegue ver o total de todas as academias juntas. Isso é o **oposto** do que a API permite e do padrão usado no resto do projeto.

Confirmado no backend (`internal/handlers/financeiro_handlers.go`, `authorizeFinanceScope`, e `internal/finance/appypay.go`, `ListCobrancas`): quando quem chama é `admin`, o backend **não força nenhum filtro** — se `contexto_tipo` e `codigo_academia` vierem vazios, a query roda com `WHERE 1=1`, ou seja, devolve cobranças de **todas** as academias juntas, filtradas só por `estado`/`tipo`, paginadas por `limit`/`offset`. É exatamente o mesmo espírito do que `/estudantes` já faz (`codigo_academia` como filtro opcional — se o admin não escolher nenhuma, vê todos, paginado).

### O que fazer

1. Troque a lógica para que **a consulta principal rode sempre que a página carregar**, sem depender de `codigoAcademia` estar preenchido, exceto para o caso `isAcademia` (que precisa aguardar o próprio código do cookie, o que já acontece automaticamente e é praticamente instantâneo).
2. Só envie `codigo_academia` na chamada quando ele estiver preenchido (seleção manual do admin, ou o próprio código quando `isAcademia`). Quando vazio (admin sem filtro escolhido), **não envie o parâmetro** — deixe undefined, para o backend devolver todas.
3. Nunca envie `contexto_tipo` fixo como `"academia"` para o caso admin — deixe undefined também quando não filtrando por uma academia específica. Para o caso `isAcademia`, pode manter como está (o backend ignora e força o próprio contexto de qualquer forma, então é inofensivo, mas não é necessário).
4. Troque o seletor de academia do admin para o **mesmo padrão** já usado em `FinanceiroCredenciaisPainel.tsx` (`Contexto` com `Select` + `SearchableSelect` condicional) — adaptado: aqui não existe "Spuri", só duas opções fazem sentido: um `SearchableSelect` de academia com `isClearable` cujo valor vazio já significa "todas as academias" (não precisa de um segundo campo "Contexto" separado, só o próprio seletor de academia limpo/preenchido já resolve). Deixe um texto pequeno abaixo do seletor, tipo `"Deixe em branco para ver cobranças de todas as academias."`, para deixar isso óbvio pro usuário.
5. Tamanho de página: **30 itens por página** (não 50, não 20 — 30, ponto). Troque `limit:20` (e qualquer outro valor) para `30` em todo lugar deste painel.
6. **Cada troca de página deve disparar exatamente uma requisição, buscando só o `offset` daquela página** — nunca busque "tudo" no cliente para depois fatiar/paginar localmente. A rota já devolve `total_geral` (o total real que casa com os filtros, não só o tamanho da página atual — ver contrato 4.1-A do documento original) exatamente para isso: calcule o total de páginas a partir dele, não do tamanho do array `cobrancas` retornado.
7. Cálculo do total de páginas — implemente exatamente assim (não use `list.data.total`, que é só o tamanho da página atual, equivalente a `cobrancas.length`; use sempre `total_geral`):

   ```ts
   const totalPaginas = Math.max(1, Math.ceil((list.data?.total_geral ?? 0) / 30));
   const paginaAtual = page + 1; // page é 0-indexed no estado atual do componente
   ```

   E use isso para desabilitar corretamente os botões e mostrar a legenda:

   ```tsx
   <span className="text-sm">Página {paginaAtual} de {totalPaginas} · {list.data?.total_geral ?? 0} cobranças</span>
   <Button size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
   <Button size="sm" disabled={paginaAtual >= totalPaginas} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
   ```

   (O código atual desabilita "Próxima" comparando `(page+1)*20 >= list.data.total_geral`, o que dá o resultado certo matematicamente, mas troque pelo cálculo explícito de `totalPaginas` acima mesmo assim — é a forma pedida, deixa a legenda "Página X de Y" correta de graça e evita repetir a conta em mais de um lugar se você precisar dela em outro botão.)
8. Confirme que trocar de página (`page`) e trocar os filtros (`tipo`, `estado`, academia) sempre reseta `page` para `0` — já está assim para os filtros de tipo/estado/academia, só confirme que continua valendo com a mudança acima.

O resultado esperado: ao entrar em `/financas/pagamentos`, um admin FPP já vê imediatamente a primeira página de cobranças de **todas** as academias (sem precisar escolher nada antes), podendo opcionalmente estreitar para uma academia específica. Uma academia continua vendo só as suas, automaticamente, como já acontece hoje.

Esse mesmo princípio — **nunca gatear a consulta principal atrás de uma seleção obrigatória de "um item de cada vez"; sempre oferecer a consulta ampla, paginada (30 por página, uma requisição por página, total de páginas calculado a partir de `total_geral`), com filtros opcionais para estreitar** — vale para qualquer outra consulta nova que você adicionar no módulo financeiro daqui pra frente. Isso **não** inclui as buscas intencionais por um único estudante específico das seções H.4/E.4 (que são ferramentas de busca pontual por um estudante já escolhido, não uma listagem de muitos registros) — só se aplica a listagens que retornam potencialmente muitos itens.

### 4.1 O mesmo vale para o histórico completo por estudante (H.5 e I.2-A)

`GET /financeiro/cobrancas/estudante/:codigo` (contrato 4.1-B) também aceita `limit`/`offset` e devolve `total_geral` — não é diferente de `GET /financeiro/cobrancas` nesse aspecto, só o filtro por estudante já vem embutido na rota. Hoje as duas telas que usam esse endpoint buscam um lote fixo, sem paginação real nenhuma:

- `FinanceiroPagamentosPainel.tsx` (seção H.5): `hist.execute(v,{limit:50,offset:0})` — sempre `offset:0`, sem forma de ver o resto se o estudante tiver mais de 50 cobranças ao longo dos anos (matrícula + várias mensalidades de vários anos letivos facilmente passa disso).
- `EstudantePagamentosPainel.tsx` (seção I.2-A): `historico.execute(codigo,{limit:100,offset:0})` — mesmo problema.

Corrija as duas para o mesmo padrão do item 7 acima: **30 itens por página**, estado de página próprio para essa tabela (`[paginaHistorico, setPaginaHistorico]`, separado da paginação da listagem principal quando as duas coexistirem na mesma tela — é o caso de `FinanceiroPagamentosPainel.tsx`), botões "Anterior"/"Próxima" e `totalPaginas = Math.max(1, Math.ceil((dados?.total_geral ?? 0) / 30))`. Resete essa página para `0` sempre que o estudante selecionado mudar (H.5) ou quando o filtro de `estado` mudar (I.2-A).

---

## 5. [DESIGN] Padronizar cores, ícones e componentes de formulário

O padrão visual correto do projeto está em `FinanceiroCredenciaisPainel.tsx` (leia a seção 1 de novo se ainda não leu). Os dois arquivos abaixo se desviaram desse padrão em pontos concretos:

### 5.1 `FinanceiroConfiguracoesPainel.tsx` — cor errada no bloco de explicação

A função `InfoBox()` está usando azul (`border-blue-200 bg-blue-50 ... text-blue-800`), mas o documento original (Parte E.2, item 1) pedia explicitamente a cor `brand`, no mesmo estilo do bloco já existente em `src/app/(painel)/configuracoes/AcademiaSection.tsx`. Troque para exatamente este padrão (copie a estrutura, não só a cor):

```tsx
<div className="rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900 dark:bg-brand-900/20">
  <div className="flex items-start gap-3">
    <Icon icon="mdi:information-outline" width={20} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />
    <div>
      <p className="text-sm font-semibold text-brand-700 dark:text-brand-200">Regras financeiras importantes</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-700/90 dark:text-brand-300">
        ...
      </ul>
    </div>
  </div>
</div>
```

Importe `Icon` de `@/components/ui/Icon` (o arquivo atual não importa esse componente — adicione o import). O conteúdo textual completo desse bloco está especificado na seção 6.4 abaixo (é mais do que os 3 itens que existem hoje).

### 5.2 `FinanceiroPagamentosPainel.tsx` — selects nativos em vez do componente do projeto

Os dois filtros da listagem principal usam `<select className="rounded border p-2">` nativo do HTML:

```tsx
<select className="rounded border p-2" value={tipo} onChange={e=>{setTipo(e.target.value as any);setPage(0)}}>...</select>
<select className="rounded border p-2" value={estado} onChange={e=>{setEstado(e.target.value);setPage(0)}}>...</select>
```

Troque os dois pelo componente `Select` do projeto (`@/components/form/Select`, o mesmo já usado em `FinanceiroConfiguracoesPainel.tsx` e em `FinanceiroCredenciaisPainel.tsx`). **Atenção**: esse componente não é controlado por `value` — ele só aceita `defaultValue` e gerencia o próprio estado interno, então, para forçar uma opção externamente (por exemplo, ao resetar filtros), use o truque de `key` já usado em `FinanceiroCredenciaisPainel.tsx` (`<Select key={contextFilter} defaultValue={contextFilter} .../>`) para forçar o remount quando o valor precisar mudar de fora. Adicione uma opção vazia em cada (`{ value: "", label: "Todas origens" }` / `{ value: "", label: "Todos estados" }`) já que o componente não tem uma prop de placeholder-vazio separada como o `SearchableSelect`.

Nunca use `<select>` nativo em nenhum lugar do módulo financeiro — sempre `Select` (opções fixas, poucas) ou `SearchableSelect` (opções carregadas via API, muitas ou com busca). Isso também vale para `src/components/paineis/EstudantePagamentosPainel.tsx` (Parte I): o filtro de `estado` no topo da página (`<select className="rounded border p-2" value={estado} onChange={e=>setEstado(e.target.value)}>...`) tem o mesmo problema — troque pelo componente `Select`, mesma lógica do item 5.2.

### 5.3 `FinanceiroPagamentosPainel.tsx` — cores de badge sem suporte a modo escuro

A função `badge()` hoje é:

```tsx
const badge=(s:string)=>{const x=s.toLowerCase(); const cls=x.includes("success")||x.includes("pago")?"bg-green-100 text-green-700":x.includes("pend")?"bg-amber-100 text-amber-700":x.includes("fail")||x.includes("falh")?"bg-red-100 text-red-700":x.includes("cancel")?"bg-gray-200 text-gray-700":"bg-blue-100 text-blue-700"; return <span className={`rounded-full px-2 py-1 text-xs font-medium ${cls}`}>{s}</span>};
```

Nenhuma dessas classes tem variante `dark:`, diferente de todo o resto do projeto (compare com `getStatusBadgeClass` em `src/app/(painel)/estudantes/PageContent.tsx`, ou com as badges de `FinanceiroCredenciaisPainel.tsx`). Troque para:

```tsx
const badge=(s:string)=>{
  const x=s.toLowerCase();
  const cls = x.includes("success")||x.includes("pago")
    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
    : x.includes("pend")
    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
    : x.includes("fail")||x.includes("falh")
    ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
    : x.includes("cancel")
    ? "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${cls}`}>{s}</span>;
};
```

### 5.4 Estados de carregando/vazio e ícones

Nenhum dos dois painéis (`FinanceiroConfiguracoesPainel.tsx`, `FinanceiroPagamentosPainel.tsx`) importa ou usa o componente `Icon` (`@/components/ui/Icon`), diferente de `FinanceiroCredenciaisPainel.tsx`, que usa ícones (`mdi:...`) nos títulos de seção, no botão de ação principal e nos estados vazios/carregando. Ajuste os dois arquivos para:

- Trocar o texto simples `"Carregando..."` (usado hoje quando `loading` é verdadeiro) pelo componente `LoadingState` — copie a função `LoadingState()` de `FinanceiroCredenciaisPainel.tsx` tal como está (ela não tem nenhuma dependência específica daquele arquivo).
- Adicionar um estado vazio com ícone quando uma listagem carregar e vier vazia (`list.data?.cobrancas?.length === 0`, `mensalidadesApi.data?.configuracoes?.length === 0`, etc.), no mesmo estilo do bloco `"Nenhuma credencial configurada."` de `FinanceiroCredenciaisPainel.tsx` (ícone + título + descrição curta).
- Usar `Icon` nos títulos de seção e nos botões de ação principal (ex.: botão de "Salvar nova versão", "Anular selecionados", "Verificar status"), seguindo os mesmos ícones `mdi:` já usados em painéis semelhantes do projeto (`mdi:content-save-outline`, `mdi:close-circle-outline`, `mdi:reload`, etc. — escolha os que fizerem sentido semântico, não precisa ser exatamente estes).

---

## 6. Completar a Parte E (`/financas/configuracoes`) — itens da especificação original que ficaram de fora

O documento original (`Tarefa - Frontend do Modulo de Pagamentos.md`, Parte E.2) especificava vários itens que não foram implementados. Corrija cada um:

### 6.1 `curso_id` precisa ser um select de cursos reais, não texto livre

Hoje, em `FinanceiroConfiguracoesPainel.tsx`, o campo é:

```tsx
<Label>Curso ID (superior)</Label><Input value={mensalidadeForm.curso_id} onChange={e=>setMensalidadeForm({...mensalidadeForm,curso_id:e.target.value})}/>
```

Troque por um `SearchableSelect` carregado via `academiaService.listarCursos({ codigo_academia: codigoAcademia })` (mesmo serviço já usado em `MatriculaPublicPage.tsx`, função `listarCursos`), filtrando só `status === "ativo"` e `type === "superior"` (curso é relevante só para nível superior — filtre também por esse `type`, igual ao `cursosSuperior` de `MatriculaPublicPage.tsx`). Recarregue a lista de cursos sempre que `codigoAcademia` mudar (mesmo padrão de `useEffect` já usado ali). Faça isso nos dois formulários (mensalidade e matrícula).

### 6.2 `curso_id` e `ano_academico` precisam ser condicionais ao nível escolhido, não aparecer sempre

Hoje os dois campos (`Curso ID` e `Ano acadêmico`) aparecem sempre, independente do `nivel` selecionado no formulário. Ajuste para:

- `ano_academico` (`Input type="number"`): mostrar só quando `nivel === "fundamental"` ou `nivel === "medio"`.
- `curso_id` (o novo `SearchableSelect` da seção 6.1): mostrar só quando `nivel === "superior"`.

Faça isso nos dois formulários (mensalidade e matrícula). Quando trocar o `nivel` para um valor que esconde o campo atualmente preenchido, limpe o valor correspondente no estado do formulário (não deixe um `curso_id` antigo sendo enviado escondido se o usuário mudar de superior para fundamental, por exemplo).

### 6.3 Escolher POST ou PUT automaticamente, em vez de sempre POST

Hoje `submitMensalidade`/`submitMatricula` sempre chamam `financeiroService.configurarMensalidade`/`configurarMatricula` (POST). O documento original pedia: se já existe uma configuração vigente para a mesma combinação (`nivel` + `ano_academico` ou `curso_id`, dependendo do nível), use `atualizarConfiguracaoMensalidade`/`atualizarConfiguracaoMatricula` (PUT, ambos já existem em `services.ts`); senão, use o POST atual.

Implemente assim: antes de montar o payload, procure dentro de `mensalidadesApi.data?.configuracoes` (ou `matriculasApi.data?.configuracoes`) uma entrada cujo `nivel` bata E, dependendo do nível, `ano_academico` bata (fundamental/médio) ou `curso_id` bata (superior). Se encontrar, chame a versão PUT; senão, a versão POST atual. Não implemente fallback de tentar um e cair pro outro em caso de erro — só essa checagem local antes de decidir qual chamar.

### 6.4 Texto didático completo do bloco de explicação

O `InfoBox()` atual só tem 3 itens. O documento original (Parte E.2, item 1) pedia 5 pontos. Substitua a lista inteira por:

```tsx
<ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-700/90 dark:text-brand-300">
  <li>Cada configuração enviada cria uma <b>nova versão vigente a partir de agora</b> — não edita nem apaga versões passadas. Meses e matrículas já vencidos continuam usando o valor que estava vigente na época em que venceram.</li>
  <li>A configuração é específica por <b>nível de ensino</b> e, dentro dele, por <b>ano/série</b> (fundamental/médio) ou por <b>curso</b> (superior) — por isso pode (e normalmente deve) haver várias configurações vigentes ao mesmo tempo, uma por combinação.</li>
  <li>Na Matrícula: se <b>nenhuma</b> configuração existir para a combinação nível/ano/curso de uma solicitação, a matrícula daquele candidato é <b>gratuita</b> e a academia aprova direto, sem cobrança.</li>
  <li>Pagamentos só podem ser feitos pelos métodos habilitados aqui: <b>GPO</b> (Multicaixa Express via número de telefone), <b>REF</b> (referência para pagar em qualquer Multicaixa/ATM/homebanking) e <b>GPO_QR</b> (QR Code, exibido para o pagador escanear no momento em que ele escolhe pagar).</li>
  <li>É <b>obrigatório configurar as credenciais AppyPay antes</b> — sem isso, nenhuma cobrança pode ser criada mesmo com o valor já configurado aqui. <a href="/financas/credenciais" className="font-medium underline">Configurar credenciais</a>.</li>
</ul>
```

(Ajuste a tag `<a>` para o componente `Link` do Next.js, `import Link from "next/link"`, em vez de `<a>` puro, para navegação client-side consistente com o resto do projeto.)

### 6.5 Ferramenta "Definir início de cobrança excecional"

Adicione, dentro da aba/seção de Mensalidades, abaixo do histórico de versões, uma nova subseção claramente identificada (título "Ações excecionais" ou similar, disponível tanto para `isAcademia` quanto para `isFpp` — sem a restrição da seção 3):

- Formulário pequeno com dois campos: `ano_letivo` (`Input` texto, ex.: "2026") e `mes_inicio` (`Select` com opções 1 a 12).
- Um texto curto explicando quando usar: "Use apenas se o ano letivo começou fora do padrão (ex.: turma que iniciou em março em vez de fevereiro) — isso ajusta a partir de qual mês a cobrança de propina passa a valer para esse ano letivo."
- Botão "Definir início de cobrança" chamando `financeiroService.definirInicioCobranca({ codigo_academia: codigoAcademia, ano_letivo, mes_inicio: Number(mesInicio) })`.
- Mostrar sucesso/erro no mesmo padrão de `Alert` já usado no resto do arquivo.

### 6.6 e 6.7: ferramenta "Anular/reativar obrigações de um estudante" (componente compartilhado)

Esta ferramenta é reaproveitada tanto aqui (Parte E, seção "ações excecionais", **só quando `isAcademia`** — ver seção 3 acima) quanto na Parte H.4 (seção 7 abaixo). Crie um componente novo e compartilhado:

**Arquivo novo**: `src/components/paineis/AnularReativarObrigacoesForm.tsx`

```tsx
"use client";
import { useEffect, useState } from "react";
import { consultasService, financeiroService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import SearchableSelect from "@/components/form/SearchableSelect";
import MultiSelect from "@/components/form/MultiSelect";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";

const MESES = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), text: `Mês ${i + 1}`, selected: false }));

export default function AnularReativarObrigacoesForm({ codigoAcademia, onSuccess }: { codigoAcademia: string; onSuccess?: () => void }) {
  const [estudantes, setEstudantes] = useState<{ value: string; label: string }[]>([]);
  const [codigoEstudante, setCodigoEstudante] = useState("");
  const [anoLetivo, setAnoLetivo] = useState("");
  const [meses, setMeses] = useState<string[]>([]);
  const [motivo, setMotivo] = useState("");
  const [alert, setAlert] = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const anular = useApi(financeiroService.anularObrigacoes);
  const reativar = useApi(financeiroService.reativarObrigacoes);

  // Carrega estudantes da academia com um limite explícito — nunca chame
  // listarEstudantes sem limit aqui: sem paginação explícita o serviço
  // agrega TODAS as páginas automaticamente (ver getAllPaginated em
  // services.ts), o que é caro para academias grandes só para popular um dropdown.
  // Nota: SearchableSelect (src/components/form/SearchableSelect.tsx) tem uma
  // interface de props fechada — não aceita onMenuOpen nem repassa props soltas
  // ao react-select interno. Carregue ao montar o componente com useEffect
  // (import { useEffect } from "react"), disparando de novo se codigoAcademia mudar:
  useEffect(() => {
    consultasService.listarEstudantes({ codigo_academia: codigoAcademia, limit: 300, offset: 0 })
      .then((r) => setEstudantes((r.estudantes ?? []).map((e: any) => ({ value: e.codigo_estudante, label: `${e.nome ?? e.codigo_estudante} (${e.codigo_estudante})` }))))
      .catch(() => {});
  }, [codigoAcademia]);

  const executar = async (acao: "anular" | "reativar") => {
    if (!codigoEstudante || !anoLetivo || meses.length === 0) { setAlert({ variant: "error", message: "Selecione o estudante, o ano letivo e ao menos um mês." }); return; }
    if (acao === "anular" && !motivo.trim()) { setAlert({ variant: "error", message: "Informe o motivo para anular obrigações." }); return; }
    try {
      const payload = { codigo_estudante: codigoEstudante, codigo_academia: codigoAcademia, ano_letivo: anoLetivo, meses: meses.map(Number), motivo: motivo.trim() || undefined };
      await (acao === "anular" ? anular.execute(payload) : reativar.execute(payload));
      setAlert({ variant: "success", message: acao === "anular" ? "Obrigações anuladas." : "Obrigações reativadas." });
      onSuccess?.();
    } catch (err) {
      setAlert({ variant: "error", message: formatApiError(err, "Não foi possível concluir a ação.") });
    }
  };

  return (
    <div className="space-y-4 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
      {alert && <Alert variant={alert.variant} title="Obrigações de mensalidade" message={alert.message} />}
      <div><Label>Estudante</Label><SearchableSelect value={codigoEstudante} options={estudantes} onChange={setCodigoEstudante} placeholder="Buscar estudante..." isClearable /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Ano letivo</Label><Input value={anoLetivo} onChange={(e) => setAnoLetivo(e.target.value)} placeholder="2026" /></div>
        <MultiSelect label="Meses" options={MESES.map((m) => ({ ...m, selected: meses.includes(m.value) }))} onChange={setMeses} />
      </div>
      <div><Label>Motivo (obrigatório para anular)</Label><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: bolsa concedida, erro de lançamento..." /></div>
      <div className="flex gap-3">
        <Button size="sm" variant="outline" disabled={anular.loading} onClick={() => executar("anular")}>Anular selecionados</Button>
        <Button size="sm" disabled={reativar.loading} onClick={() => executar("reativar")}>Reativar selecionados</Button>
      </div>
    </div>
  );
}
```

**Em `FinanceiroConfiguracoesPainel.tsx`** (Parte E, seção 6.6): renderize `<AnularReativarObrigacoesForm codigoAcademia={codigoAcademia} onSuccess={reload} />` dentro da subseção "Ações excecionais" (junto com o item 6.5), **envolto em `{isAcademia && (...)}`** — nunca renderize para admin FPP (ver seção 3).

---

## 7. Completar a Parte H.4 (`/financas/pagamentos`) — ação em massa de anular/reativar

O checklist do documento original pedia botões de ação em massa "Anular selecionados"/"Reativar selecionados" na seção "Consultar mensalidades e histórico por estudante" de `FinanceiroPagamentosPainel.tsx`. Isso não foi implementado. Adicione, **só quando `isAcademia` for verdadeiro** (ver seção 3 — nunca para admin FPP), logo abaixo da tabela de mensalidades daquela seção, reaproveitando o mesmo componente da seção 6:

```tsx
{isAcademia && codigoEstudante && (
  <div className="mt-4">
    <AnularReativarObrigacoesForm codigoAcademia={codigoAcademia} onSuccess={() => mens.execute(codigoEstudante)} />
  </div>
)}
```

Import `AnularReativarObrigacoesForm` de `@/components/paineis/AnularReativarObrigacoesForm`. Não duplique o formulário — é o mesmo componente da seção 6.

---

## 8. Implementar a Parte F inteira (página pública de matrícula) — nada foi feito ainda

Confirmado: nenhum arquivo de `src/app/(full-width-pages)/(auth)/matricula/` foi alterado no commit mesclado. A Parte F do documento original (`F.1` e `F.2`) precisa ser implementada do zero, exatamente como especificada lá — leia a íntegra dessa parte antes de começar, ela já é bastante detalhada (fluxo de localizar solicitação por código ou por busca, mensagens por status, formulário de pagamento, tratamento de `REF`/`GPO`/`GPO_QR`, botão de verificar status).

Só reforçando dois pontos que não estavam explícitos lá, mas valem pelas seções 5 acima:

- O seletor de método de pagamento (F.2, item 3) deve usar o componente `Select` do projeto, nunca um `<select>` nativo.
- O seletor de academia/instituição, se precisar de algum nesta tela nova (não deveria — a academia já vem da solicitação consultada), segue o mesmo padrão de `SearchableSelect` já usado no restante de `MatriculaPublicPage.tsx`.
- `solicitacaoMatriculaService.buscar/consultarStatus/iniciarPagamento` já existem em `services.ts` prontos para uso — não crie chamadas `fetch`/`api` novas, use o serviço existente.

---

## 9. Checklist final antes de reportar

- [ ] Seção 2: as duas rotas de `anularObrigacoes`/`reativarObrigacoes` corrigidas para `/financeiro/mensalidades/obrigacoes/anular` e `.../obrigacoes/reativar`.
- [ ] Seção 3: ferramenta de anular/reativar nunca aparece para admin FPP, nem em `/financas/configuracoes` nem em `/financas/pagamentos`.
- [ ] Seção 4: `/financas/pagamentos` mostra cobranças de todas as academias por padrão para admin FPP, **30 itens por página**, uma requisição por página (nunca busca tudo de uma vez), total de páginas calculado a partir de `total_geral` (`Math.ceil(total_geral/30)`), com filtro de academia opcional e claramente marcado como opcional.
- [ ] Seção 4.1: histórico completo por estudante (H.5 em `FinanceiroPagamentosPainel.tsx` e I.2-A em `EstudantePagamentosPainel.tsx`) também paginado de verdade, 30 itens por página, em vez do fetch fixo atual (`limit:50,offset:0` / `limit:100,offset:0`).
- [ ] Seção 5: nenhum `<select>` nativo restante no módulo financeiro; `InfoBox` usa `bg-brand-50`; badges com variantes `dark:`; `Icon`, `LoadingState` e estado vazio usados nos dois painéis.
- [ ] Seção 6: `curso_id` é `SearchableSelect` de cursos reais, condicional a superior; `ano_academico` condicional a fundamental/médio; lógica PUT/POST implementada; texto didático completo (5 itens); ferramentas de início de cobrança excecional e anular/reativar presentes.
- [ ] Seção 7: botões de ação em massa presentes em H.4, só para academia.
- [ ] Seção 8: Parte F implementada por completo (acompanhar solicitação + pagar taxa de matrícula).
- [ ] `npx tsc --noEmit` passa sem erros novos.
- [ ] Nenhuma alteração em `verificar-email/[token]/page.tsx` nem em `Calendar.tsx`.
- [ ] Commit criado com mensagem clara referenciando esta correção.

Ao terminar, devolva o resumo de sempre (Summary/Testing) — eu cuido de validar `lint`/`build` e qualquer coisa que dependa de rede ou banco de dados de verdade, e te retorno o resultado com o que fazer em seguida, se algo mais precisar de ajuste.
