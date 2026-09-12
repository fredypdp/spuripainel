---
criado: 12-09-2026
origem: Fredy + Claude (orquestração — investigação do backend/frontend atuais, desenho e implementação de referência já feitos e validados por Claude)
status: pronto para execução
---

# Tarefa — Ajustes nas telas de pagamentos: `/financas/pagamentos` e `/pagamentos` (Frontend)

## Prompt recomendado para executar esta tarefa

> Aplique exatamente o que está descrito neste documento, na ordem das seções (4 → 5 → 6). Não
> replaneje nem redesenhe nada do que já está decidido — as decisões da seção 2 são definitivas, e a
> investigação de quais endpoints usar já foi feita (seção 1). Nas seções 4 e 5, aplique cada
> "Localizar/Substituir" como um patch pontual. Na seção 6, o arquivo inteiro é substituído pelo
> conteúdo fornecido — não faça um merge parcial. Ao final, rode `npx tsc --noEmit` e `npx eslint .`
> (ou `npm run lint`) na raiz do repositório, confira que nenhum erro novo aparece, e rode também
> `npm run build` — no seu ambiente, diferente do sandbox usado para validar este documento, isso deve
> completar sem o erro de rede do Google Fonts descrito na seção 8. Não é necessária nenhuma mudança em
> `rastreio-backend` para esta tarefa — ver seção 1.

## 1. Contexto e investigação já feita (não repita)

Fredy pediu três ajustes em `/financas/pagamentos` (tela de pagamentos para academia/admin) e uma
reformulação de `/pagamentos` (tela de pagamentos do estudante), com um documento só de execução —
sem espaço para o Codex planejar — e pré-testes já feitos por Claude, dada a limitação real do
ambiente do Codex (bloqueia `apt`, sem Docker/`psql`, ao contrário do sandbox usado para validar este
documento, que instala PostgreSQL de verdade quando precisa).

**Conclusão da investigação: esta tarefa é 100% frontend.** Não é necessária nenhuma mudança em
`rastreio-backend`. Os três endpoints usados já existem e já suportam tudo que as duas telas
precisam:

- `GET /financeiro/mensalidades/estudante/:codigo` (`consultarMensalidadesEstudante`) — usado só para
  os métodos de pagamento habilitados por academia e para a lista bruta de mensalidades (necessária
  só para a seção "Mensalidades anuladas", seção 6).
- `GET /financeiro/cobrancas/estudante/:codigo` (`consultarCobrancasEstudante`) — a lista **unificada**
  (cobranças reais + pendências sintéticas de mensalidade, já deduplicadas — ver
  `FiltrarPendenciasComCobrancaRealVinculada` no backend), filtrável por `estado`/`tipo`. É a fonte
  única tanto da seção "Pendentes" quanto da seção "Histórico" da nova tela do estudante (seção 6),
  cada uma com um filtro de `estado` diferente.
- `POST /financeiro/mensalidades/pagamento` (`iniciarPagamentoMensalidades`) — usado pela tela de
  checkout (seção 6) exatamente como já era usado antes desta tarefa; **confirmei no código do backend
  (`mensalidade.go`, `IniciarPagamentoMensalidades`) que ele já rejeita, com um erro claro, qualquer
  tentativa de pagar um mês sem incluir a mensalidade pendente mais antiga na mesma transação** — essa
  regra de negócio não é nova desta tarefa, mas passou a ser tratada de forma diferente no frontend por
  causa dela (ver decisão 2.3).

Como não há mudança de backend, **não há nenhuma migração/endpoint novo para testar com Postgres
real** nesta tarefa — só validação de frontend (`tsc`/`eslint`/`build`), que já fiz (seção 8).

## 2. Decisões de design já tomadas (não repensar)

1. **A seção "Pendentes" da nova tela do estudante usa `consultarCobrancasEstudante` (com
   `estado: ["pendente"]`), não `consultarMensalidadesEstudante`.** Motivo: só o primeiro endpoint já
   deduplica um mês que já tem uma cobrança real "aguardando_pagamento" em aberto — o segundo devolve
   o estado bruto da obrigação (que só vira `"pago"` quando a cobrança é confirmada, nunca só por ter
   sido iniciada), então usá-lo aqui reabriria exatamente o bug que o requisito 2.1.1 do pedido original
   proíbe ("Pagar" e o checkbox não podem aparecer para quem já está aguardando pagamento).
   `consultarMensalidadesEstudante` continua sendo chamado, só que agora só para os métodos de
   pagamento habilitados por academia e para a lista de mensalidades "anulado" (decisão 4 abaixo) — seu
   campo `mensalidades` deixou de alimentar a seção Pendentes.
2. **Sem paginação na seção "Pendentes"**: busca com `limit=500` (constante `LIMITE_PENDENTES`) numa
   chamada só, sem controles de página — o volume real (mensalidades em atraso de 1-2 academias) nunca
   chega perto disso; se algum dia chegar, um aviso de "existem mais pendências além das mostradas"
   aparece (usa `total_geral` da resposta) em vez de esconder o problema silenciosamente. Se Fredy
   preferir paginação de verdade aqui no futuro, é uma tarefa separada.
3. **O botão "Pagar" de qualquer linha da seção Pendentes já inclui a mensalidade mais antiga
   automaticamente na transação, com um aviso na própria linha ("mais antiga, obrigatória")**, em vez
   de deixar o backend rejeitar uma tentativa de pagar só um mês mais novo (ver validação confirmada na
   seção 1). Clicar em "Pagar" na própria linha mais antiga continua sendo "apenas um" item, exatamente
   como pedido — o comportamento só muda para linhas mais novas, que passam a virar uma transação de 2
   itens (a mais antiga + a clicada) em vez de uma tentativa fadada a falhar.
4. **Nova seção "Mensalidades anuladas"** (só aparece se houver alguma): preserva a única informação
   que a versão anterior desta tela mostrava e que não existe em nenhum lugar de
   `consultarCobrancasEstudante` — um mês com `estado: "anulado"` (perdoado pela academia, sem nenhuma
   cobrança) nunca é sintetizado como pendência (só `estado: "pendente"` vira pendência sintética — ver
   `PendenciasSemCobrancaEstudante`, backend) e nunca teve cobrança real, então não aparece em nenhum
   filtro do endpoint unificado. Sem esta seção, o estudante perderia a visibilidade de que um mês foi
   perdoado — regressão que não foi pedida e que esta tarefa evita.
5. **O filtro "Todos os estados" do Histórico nunca omite o parâmetro `estado`** — usa a nova constante
   `ESTADOS_COBRANCA_REAL` (financeiroShared.tsx, seção 5.1), com os cinco estados que não são
   `"pendente"`. Omitir o parâmetro faria o backend incluir as pendências sintéticas de novo
   (`DeveIncluirPendenciasSemCobranca` só as exclui quando `estado` não está vazio e não contém
   `"pendente"`), duplicando-as com a seção Pendentes.
6. **Divisão por academia preservada**: quando o estudante tem pendências em mais de uma academia (caso
   raro — normalmente troca de instituição), a seção Pendentes continua dividida em uma
   sub-seção por academia (como já era antes desta tarefa), cada uma com sua própria seleção de
   checkboxes — evita misturar, numa mesma transação de pagamento, mensalidades de academias
   diferentes (`iniciarPagamentoMensalidades` só aceita um `codigo_academia` por chamada).
7. **A tela de checkout é uma sub-tela nova** (`tela: "checkout"`), não mais controles inline dentro da
   lista — é aqui que "os métodos de pagamento já não ficam onde estão atualmente" (requisito 2.1.2) é
   cumprido: `MetodoPagamentoSelector` e o campo de telefone saem da tela principal e só aparecem
   depois de clicar em "Pagar"/"Pagar selecionadas".
8. **A tabela de "Pendentes" é uma tabela de verdade** (`Table`/`TableRow`/`TableCell`, os mesmos
   primitivos já usados em `CobrancasTable`), não mais uma lista de `Checkbox` com `label` — mudança
   deliberada para se aproximar visualmente da referência que Fredy enviou (colunas
   checkbox/Referência/Tipo/Valor/Pagar), mantendo os mesmos componentes de tabela do resto do módulo.
9. **Sem alteração de rota/URL** — `/pagamentos` continua sendo uma única página (`EstudantePagamentosPainel`),
   com as seções e a sub-tela de checkout controladas por estado local (`tela`), no mesmo padrão de
   sub-tela já usado em `SubtelaDetalheCobranca`/`SubtelaPanel`.

## 3. Fora de escopo (não implementar)

- Qualquer mudança em `rastreio-backend` — nenhuma foi necessária (seção 1).
- Paginação de verdade na seção "Pendentes" (decisão 2.2) — o aviso de "existem mais pendências" é
  suficiente para o volume real esperado.
- Contiguidade obrigatória de meses selecionados na seção Pendentes (ex.: proibir selecionar um mês
  bem mais novo pulando meses no meio) — o backend não exige isso (só exige que a mais antiga esteja
  incluída — ver seção 1), e o comportamento anterior a esta tarefa também não exigia; não mude essa
  regra.
- Qualquer alteração em `MatriculaPublicPage.tsx` ou no fluxo de pagamento de matrícula durante o
  cadastro público — fora do escopo desta tarefa (matrícula nunca aparece como "pendente" na tela do
  estudante autenticado; só como cobrança real já resolvida ou em andamento, na seção Histórico).
- Mudar o comportamento da sessão financeira restrita (`tokenStorage.isRestrictedFinance()`) — a seção
  Histórico continua escondida nesse caso, exatamente como já era; só a origem dos dados da seção
  Pendentes mudou (decisão 2.1), não essa restrição.
- Adicionar `pypdf`/exportação/impressão do comprovante de pagamento — não foi pedido.

## 4. `src/components/paineis/FinanceiroPagamentosPainel.tsx` — remover o cartão "Outros"

### 4.1 Comentário do topo do arquivo

**Localizar:**
```tsx
 * Dividido em subtelas a partir de um menu de cartões (mesmo padrão de
 * FinanceiroConfiguracoesPainel — nada de <select> para escolher o tipo de
 * cobrança): Mensalidade/Propina abre um drill-down adicional de ano
 * letivo → mês antes de chegar na listagem; Taxa de matrícula e Outros vão
 * direto para a listagem, sem esse passo extra (uma cobrança de matrícula
 * ou avulsa não tem o conceito de "mês do ano letivo").
```

**Substituir por:**
```tsx
 * Dividido em subtelas a partir de um menu de cartões (mesmo padrão de
 * FinanceiroConfiguracoesPainel — nada de <select> para escolher o tipo de
 * cobrança): Mensalidade/Propina abre um drill-down adicional de ano
 * letivo → mês antes de chegar na listagem; Taxa de matrícula vai direto
 * para a listagem, sem esse passo extra (uma cobrança de matrícula não tem
 * o conceito de "mês do ano letivo").
 *
 * O cartão "Outros" (cobranças avulsas) foi removido deste menu — avulsa
 * deixou de ser um tipo consultável por aqui, então `origem` nunca chega a
 * "avulsa" através desta tela (ver abrirLista, mais abaixo). O `else` para
 * "avulsa" em `tituloLista`/`iconeLista` (mais abaixo) foi deixado como
 * estava, deliberadamente: é código inatingível a partir desta UI só
 * porque FinanceiroOrigemCobranca ainda inclui esse valor no tipo — não
 * faz parte desta tarefa reescrevê-lo.
```

### 4.2 Menu de cartões

**Localizar:**
```tsx
          <SubtelasMenu
            opcoes={[
              { id: "mensalidade", icon: "mdi:calendar-month-outline", label: "Mensalidade / Propina", descricao: "Consultar por ano letivo e mês.", onClick: () => abrirLista("mensalidade"), disabled: bloquearSubtelas },
              { id: "matricula", icon: "mdi:school-outline", label: "Taxa de matrícula", descricao: "Todas as cobranças de matrícula, em todos os estados.", onClick: () => abrirLista("matricula"), disabled: bloquearSubtelas },
              { id: "avulsa", icon: "mdi:cash-multiple", label: "Outros", descricao: "Cobranças avulsas, em todos os estados.", onClick: () => abrirLista("avulsa"), disabled: bloquearSubtelas },
            ]}
          />
```

**Substituir por:**
```tsx
          <SubtelasMenu
            opcoes={[
              { id: "mensalidade", icon: "mdi:calendar-month-outline", label: "Mensalidade / Propina", descricao: "Consultar por ano letivo e mês.", onClick: () => abrirLista("mensalidade"), disabled: bloquearSubtelas },
              { id: "matricula", icon: "mdi:school-outline", label: "Taxa de matrícula", descricao: "Todas as cobranças de matrícula, em todos os estados.", onClick: () => abrirLista("matricula"), disabled: bloquearSubtelas },
            ]}
          />
```

Nada mais neste arquivo muda — `tituloLista`/`iconeLista`/`abrirLista` continuam com o `case`/`else`
de `"avulsa"` no código (inatingível a partir desta UI, ver comentário acima), e isso é intencional.

## 5. `src/components/paineis/financeiroShared.tsx` — usado pelas duas telas

Este arquivo é compartilhado por `/financas/pagamentos` **e** `/pagamentos` (e também por
`FinanceiroConfiguracoesPainel`/`MatriculaPublicPage`) — as mudanças aqui valem para as duas telas de
uma vez. Isso é intencional: a remoção da coluna "Descrição" (pedida só para `/financas/pagamentos`,
item 1.2 do pedido original) e a melhoria de "Detalhe da cobrança" (item 1.3) acabam valendo também
para a tabela de Histórico da tela do estudante (seção 6), que reusa o mesmo `CobrancasTable`/
`SubtelaDetalheCobranca` — não crie uma segunda versão desses componentes só para o estudante.

### 5.1 Nova constante `ESTADOS_COBRANCA_REAL`

**Localizar:**
```tsx
export const ESTADO_PAGAMENTO_OPCOES = [
  { value: "pendente", label: "Pendente (sem cobrança gerada)" },
  { value: "Success", label: "Pago" },
  { value: "aguardando_pagamento", label: "Aguardando pagamento" },
  { value: "Failed", label: "Falhado" },
  { value: "Cancelled", label: "Cancelado" },
  { value: "Expired", label: "Expirado" },
];
```

**Substituir por:**
```tsx
export const ESTADO_PAGAMENTO_OPCOES = [
  { value: "pendente", label: "Pendente (sem cobrança gerada)" },
  { value: "Success", label: "Pago" },
  { value: "aguardando_pagamento", label: "Aguardando pagamento" },
  { value: "Failed", label: "Falhado" },
  { value: "Cancelled", label: "Cancelado" },
  { value: "Expired", label: "Expirado" },
];

/**
 * Os cinco valores de ESTADO_PAGAMENTO_OPCOES que representam uma cobrança
 * REAL (nunca uma pendência sintética) — todos os valores exceto
 * "pendente". Usado por EstudantePagamentosPainel para pedir
 * explicitamente ao backend "todos os estados, exceto pendente" quando o
 * filtro de estado do histórico está em "Todos os estados": omitir o
 * parâmetro `estado` faria DeveIncluirPendenciasSemCobranca (backend)
 * incluir as pendências de novo, duplicando-as com a seção "Pendentes",
 * que já as mostra separadamente nessa tela.
 */
export const ESTADOS_COBRANCA_REAL = ESTADO_PAGAMENTO_OPCOES
  .map((o) => o.value)
  .filter((v) => v !== "pendente");
```

(Repare que este bloco **inclui de novo** o array `ESTADO_PAGAMENTO_OPCOES` já existente, sem
mudança nele — o "localizar" precisa do bloco inteiro só para ficar inequívoco onde inserir o texto
novo logo depois. Não duplique o array.)

### 5.2 Remover a coluna "Descrição" de `CobrancasTable` — cabeçalho

**Localizar:**
```tsx
              {["Tipo", "Descrição", "Estudante", "Valor", "Método", "Estado", "Atualizado em", ""].map((h) => (
```

**Substituir por:**
```tsx
              {["Tipo", "Estudante", "Valor", "Método", "Estado", "Atualizado em", ""].map((h) => (
```

### 5.3 Remover a coluna "Descrição" de `CobrancasTable` — corpo da tabela

**Localizar:**
```tsx
                <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{origemLabel[r.origem] ?? r.origem}</TableCell>
                <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{r.descricao || "—"}</TableCell>
                <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{r.codigo_estudante || "—"}</TableCell>
```

**Substituir por:**
```tsx
                <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{origemLabel[r.origem] ?? r.origem}</TableCell>
                <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{r.codigo_estudante || "—"}</TableCell>
```

### 5.4 Melhorar a tela "Detalhe da cobrança" — reescrever `SubtelaDetalheCobranca` e o comentário
### logo acima dela

Isto substitui o comentário JSDoc de `SubtelaDetalheCobranca` inteiro **e** a função inteira — copie
o bloco "Localizar" com atenção, ele começa no comentário, não na função.

**Localizar:**
```tsx
/**
 * Subtela de detalhes de um pagamento (não é mais modal/pop-up).
 *
 * - Usa os dados já carregados na linha da tabela (PagamentoResumo) em vez
 *   de buscar o pagamento de novo no servidor — evita uma requisição
 *   redundante a cada "ver detalhes" (a listagem já trouxe tudo que o
 *   pagamento tem).
 * - Quando o pagamento está vinculado a um estudante (codigo_estudante) e
 *   mostrarDadosEstudante=true, busca e exibe também os dados desse
 *   estudante. GET /consultar-estudante/:codigo só é permitido para
 *   academia/admin — por isso EstudantePagamentosPainel usa
 *   mostrarDadosEstudante={false} (o estudante já sabe quem é).
 * - Não tem ação de cancelar: cancelar é uma ação sobre a cobrança na
 *   listagem (CobrancasTable, botão "Cancelar" na própria linha), não faz
 *   parte de "ler os detalhes" dela.
 * - Quando status="pendente" (pendência sintética, ver PagamentoResumo em
 *   types/api.ts), vários campos que só existem para uma cobrança real
 *   (referência AppyPay, transação, atualizado em) ficam "—": não existe
 *   nenhuma cobrança de verdade por trás desse item, e um aviso explica
 *   isso no lugar da ação de cancelar.
 */
export function SubtelaDetalheCobranca({ cobranca, onVoltar, mostrarDadosEstudante = false }: {
  cobranca: PagamentoResumo;
  onVoltar: () => void;
  mostrarDadosEstudante?: boolean;
}) {
  const [estudante, setEstudante] = useState<EstudanteDetalhado | null>(null);
  const [erroEstudante, setErroEstudante] = useState<string | null>(null);
  const [carregandoEstudante, setCarregandoEstudante] = useState(false);

  const codigoEstudante = cobranca.codigo_estudante;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta o estado de estudante ao trocar de cobrança, antes de buscar os novos dados.
    setEstudante(null);
    setErroEstudante(null);
    if (!mostrarDadosEstudante || !codigoEstudante) return;
    setCarregandoEstudante(true);
    consultasService.estudante(codigoEstudante)
      .then((r) => setEstudante(r?.estudante ?? null))
      .catch((e) => setErroEstudante(formatApiError(e, "Não foi possível carregar os dados do estudante.")))
      .finally(() => setCarregandoEstudante(false));
  }, [cobranca.id, mostrarDadosEstudante, codigoEstudante]);

  return (
    <SubtelaPanel title="Detalhe da cobrança" icon="mdi:receipt-text-outline" onVoltar={onVoltar}>
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        {cobranca.status.toLowerCase() === "pendente" && (
          <p className="rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            Este mês ainda não foi pago e não tem nenhuma cobrança gerada — nenhuma tentativa de pagamento foi feita ainda.
          </p>
        )}
        <p><b>Tipo:</b> {origemLabel[cobranca.origem] ?? cobranca.origem}</p>
        <p><b>Descrição:</b> {cobranca.descricao || "—"}</p>
        {cobranca.mensalidades?.[0] && (
          <p><b>Mês de referência:</b> {capitalizar(NOME_MES[cobranca.mensalidades[0].mes - 1])} ({formatAnoLetivo(cobranca.mensalidades[0].ano_letivo)})</p>
        )}
        <p><b>Valor:</b> {money(cobranca.valor)} {cobranca.moeda ? `(${cobranca.moeda})` : ""}</p>
        <p><b>Método de pagamento:</b> {cobranca.metodo_pagamento ? METODO_PAGAMENTO_LABEL[cobranca.metodo_pagamento] : "—"}</p>
        <p><b>Estado:</b> <StatusBadge status={cobranca.status} /></p>
        <p><b>Referência AppyPay:</b> {cobranca.provider_charge_id || "—"}</p>
        <p><b>Transação:</b> {cobranca.merchant_transaction_id || "—"}</p>
        <p><b>Atualizado em:</b> {dt(cobranca.atualizado_em)}</p>
        {cobranca.codigo_solicitacao && <p><b>Solicitação de matrícula:</b> {cobranca.codigo_solicitacao}</p>}

        {codigoEstudante && (
          <div className="mt-4 rounded-lg border border-gray-100 p-3 dark:border-white/[0.05]">
            <p className="mb-2 font-semibold text-gray-800 dark:text-white/90">Estudante vinculado</p>
            {!mostrarDadosEstudante ? (
              <p><b>Código:</b> {codigoEstudante}</p>
            ) : carregandoEstudante ? (
              <p className="text-gray-500 dark:text-gray-400">Carregando dados do estudante...</p>
            ) : erroEstudante ? (
              <p className="text-red-600 dark:text-red-400">{erroEstudante}</p>
            ) : estudante ? (
              <div className="space-y-1">
                <p><b>Nome:</b> {estudante.nome}</p>
                <p><b>Código:</b> {estudante.codigo_estudante}</p>
                {estudante.telefone && <p><b>Telefone:</b> {estudante.telefone}</p>}
                {estudante.email && <p><b>Email:</b> {estudante.email}</p>}
                {estudante.status && <p><b>Status:</b> {estudante.status}</p>}
              </div>
            ) : (
              <p><b>Código:</b> {codigoEstudante}</p>
            )}
          </div>
        )}
      </div>
    </SubtelaPanel>
  );
}
```

**Substituir por:**
```tsx
/**
 * Um campo label/valor da grade de metadados de SubtelaDetalheCobranca,
 * com botão de copiar opcional — usado para os dois identificadores que a
 * academia/admin mais precisa colar em outro lugar (painel da AppyPay,
 * ticket de suporte): Referência AppyPay e Transação. `break-all` evita
 * que um id longo (uuid/merchant transaction id) quebre o layout da grade.
 */
function CampoDetalheCobranca({ label, valor, onCopiar, copiado }: {
  label: string;
  valor: string;
  onCopiar?: () => void;
  copiado?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className="break-all text-sm text-gray-700 dark:text-gray-300">{valor}</p>
        {onCopiar && (
          <button
            type="button"
            onClick={onCopiar}
            title="Copiar"
            className="shrink-0 text-gray-400 transition hover:text-brand-500 dark:text-gray-500 dark:hover:text-brand-400"
          >
            <Icon icon={copiado ? "mdi:check" : "mdi:content-copy"} width={16} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Subtela de detalhes de um pagamento (não é mais modal/pop-up).
 *
 * Reorganizada nesta tarefa para dar mais hierarquia visual ao que antes
 * era uma lista plana de `<p><b>Label:</b> valor</p>`: um cabeçalho com o
 * valor em destaque + o StatusBadge (as duas informações que a academia
 * escaneia primeiro), seguido de uma grade de metadados de dois campos por
 * linha, com botão de copiar em Referência AppyPay/Transação — os dois
 * identificadores que a academia/admin mais precisa colar em outro lugar
 * (painel da AppyPay, ticket de suporte) ao investigar uma cobrança. Nenhum
 * dado novo foi adicionado: os mesmos campos de antes, só reorganizados.
 *
 * - Usa os dados já carregados na linha da tabela (PagamentoResumo) em vez
 *   de buscar o pagamento de novo no servidor — evita uma requisição
 *   redundante a cada "ver detalhes" (a listagem já trouxe tudo que o
 *   pagamento tem).
 * - Quando o pagamento está vinculado a um estudante (codigo_estudante) e
 *   mostrarDadosEstudante=true, busca e exibe também os dados desse
 *   estudante. GET /consultar-estudante/:codigo só é permitido para
 *   academia/admin — por isso EstudantePagamentosPainel usa
 *   mostrarDadosEstudante={false} (o estudante já sabe quem é).
 * - Não tem ação de cancelar: cancelar é uma ação sobre a cobrança na
 *   listagem (CobrancasTable, botão "Cancelar" na própria linha), não faz
 *   parte de "ler os detalhes" dela.
 * - Quando status="pendente" (pendência sintética, ver PagamentoResumo em
 *   types/api.ts), vários campos que só existem para uma cobrança real
 *   (referência AppyPay, transação, atualizado em) ficam "—": não existe
 *   nenhuma cobrança de verdade por trás desse item, e um aviso explica
 *   isso no lugar da ação de cancelar.
 */
export function SubtelaDetalheCobranca({ cobranca, onVoltar, mostrarDadosEstudante = false }: {
  cobranca: PagamentoResumo;
  onVoltar: () => void;
  mostrarDadosEstudante?: boolean;
}) {
  const [estudante, setEstudante] = useState<EstudanteDetalhado | null>(null);
  const [erroEstudante, setErroEstudante] = useState<string | null>(null);
  const [carregandoEstudante, setCarregandoEstudante] = useState(false);
  const [copiado, setCopiado] = useState<"referencia" | "transacao" | null>(null);

  const codigoEstudante = cobranca.codigo_estudante;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta o estado de estudante ao trocar de cobrança, antes de buscar os novos dados.
    setEstudante(null);
    setErroEstudante(null);
    if (!mostrarDadosEstudante || !codigoEstudante) return;
    setCarregandoEstudante(true);
    consultasService.estudante(codigoEstudante)
      .then((r) => setEstudante(r?.estudante ?? null))
      .catch((e) => setErroEstudante(formatApiError(e, "Não foi possível carregar os dados do estudante.")))
      .finally(() => setCarregandoEstudante(false));
  }, [cobranca.id, mostrarDadosEstudante, codigoEstudante]);

  function copiar(valor: string, campo: "referencia" | "transacao") {
    navigator.clipboard.writeText(valor).catch(() => { /* ignorado — o clique já teve feedback visual abaixo mesmo se a cópia falhar */ });
    setCopiado(campo);
    setTimeout(() => setCopiado((atual) => (atual === campo ? null : atual)), 1500);
  }

  return (
    <SubtelaPanel title="Detalhe da cobrança" icon="mdi:receipt-text-outline" onVoltar={onVoltar}>
      <div className="space-y-5">
        {cobranca.status.toLowerCase() === "pendente" && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            Este mês ainda não foi pago e não tem nenhuma cobrança gerada — nenhuma tentativa de pagamento foi feita ainda.
          </p>
        )}

        {/* Cabeçalho: tipo + valor em destaque + estado — as duas informações mais escaneadas ao abrir o detalhe. */}
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">
          <div>
            <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{origemLabel[cobranca.origem] ?? cobranca.origem}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{money(cobranca.valor)}</p>
            {cobranca.moeda && cobranca.moeda !== "AOA" && <p className="text-xs text-gray-500 dark:text-gray-400">{cobranca.moeda}</p>}
          </div>
          <StatusBadge status={cobranca.status} />
        </div>

        {cobranca.mensalidades?.[0] && (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <b>Mês de referência:</b> {capitalizar(NOME_MES[cobranca.mensalidades[0].mes - 1])} ({formatAnoLetivo(cobranca.mensalidades[0].ano_letivo)})
          </p>
        )}

        {/* Grade de metadados — dois campos por linha em telas largas. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoDetalheCobranca label="Método de pagamento" valor={cobranca.metodo_pagamento ? METODO_PAGAMENTO_LABEL[cobranca.metodo_pagamento] : "—"} />
          <CampoDetalheCobranca label="Atualizado em" valor={dt(cobranca.atualizado_em)} />
          <CampoDetalheCobranca
            label="Referência AppyPay"
            valor={cobranca.provider_charge_id || "—"}
            onCopiar={cobranca.provider_charge_id ? () => copiar(cobranca.provider_charge_id!, "referencia") : undefined}
            copiado={copiado === "referencia"}
          />
          <CampoDetalheCobranca
            label="Transação"
            valor={cobranca.merchant_transaction_id || "—"}
            onCopiar={cobranca.merchant_transaction_id ? () => copiar(cobranca.merchant_transaction_id!, "transacao") : undefined}
            copiado={copiado === "transacao"}
          />
          {cobranca.codigo_solicitacao && <CampoDetalheCobranca label="Solicitação de matrícula" valor={cobranca.codigo_solicitacao} />}
        </div>

        {cobranca.descricao && (
          <div>
            <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Descrição</p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{cobranca.descricao}</p>
          </div>
        )}

        {codigoEstudante && (
          <div className="rounded-lg border border-gray-100 p-3 dark:border-white/[0.05]">
            <p className="mb-2 font-semibold text-gray-800 dark:text-white/90">Estudante vinculado</p>
            {!mostrarDadosEstudante ? (
              <p className="text-sm text-gray-700 dark:text-gray-300"><b>Código:</b> {codigoEstudante}</p>
            ) : carregandoEstudante ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Carregando dados do estudante...</p>
            ) : erroEstudante ? (
              <p className="text-sm text-red-600 dark:text-red-400">{erroEstudante}</p>
            ) : estudante ? (
              <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <p><b>Nome:</b> {estudante.nome}</p>
                <p><b>Código:</b> {estudante.codigo_estudante}</p>
                {estudante.telefone && <p><b>Telefone:</b> {estudante.telefone}</p>}
                {estudante.email && <p><b>Email:</b> {estudante.email}</p>}
                {estudante.status && <p><b>Status:</b> {estudante.status}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300"><b>Código:</b> {codigoEstudante}</p>
            )}
          </div>
        )}
      </div>
    </SubtelaPanel>
  );
}
```

Nada mais neste arquivo muda. `Icon` já está importado no topo do arquivo (usado por outros
componentes do mesmo módulo) — não precisa de import novo.

## 6. `src/components/paineis/EstudantePagamentosPainel.tsx` — reescrever por inteiro

Esta é a tela do estudante (`/pagamentos`). A mudança toca praticamente todo o arquivo — o antigo
componente `SecaoMensalidadesAcademia` (seleção + método + confirmar, tudo inline) é substituído por
`SecaoPendentesAcademia` (só seleção + botão "Pagar", uma tabela de verdade) mais uma sub-tela de
checkout nova, e as antigas telas "lista"/"historico" viram uma tela "lista" só, com as duas seções
(Pendentes + Histórico) sempre visíveis juntas, mais a seção condicional "Mensalidades anuladas". Por
isso é mais seguro **substituir o arquivo inteiro** pelo conteúdo abaixo do que tentar um
"localizar/substituir" pontual.

**Substitua todo o conteúdo do arquivo por:**

```tsx
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { consultasService, financeiroService, tokenStorage, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserCookie } from "@/hooks/useUserCookie";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import Input from "@/components/form/input/InputField";
import SearchableSelect from "@/components/form/SearchableSelect";
import Checkbox from "@/components/form/input/Checkbox";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  CobrancasTable,
  EmptyState,
  ESTADOS_COBRANCA_REAL,
  ESTADO_PAGAMENTO_OPCOES,
  LoadingState,
  MetodoPagamentoSelector,
  PaginacaoSetas,
  Qr,
  StatusBadge,
  SubtelaDetalheCobranca,
  SubtelaPanel,
  capitalizar,
  chaveMensalidade,
  compararMensalidadesPorData,
  formatAnoLetivo,
  formatarLinhaMensalidade,
  money,
  NOME_MES,
  origemLabel,
} from "@/components/paineis/financeiroShared";
import type { FinanceiroMetodoPagamento, FinanceiroOrigemCobranca, MensalidadeMesView, PagamentoResumo, QRCodeChargeResult } from "@/types/api";

const PAGE_SIZE = 30;
// Generoso o suficiente para cobrir qualquer cenário realista (mesmo um
// estudante com pendências em 2-3 academias acumuladas por vários anos) sem
// precisar de paginação nesta seção — ver nota em `pendentesTruncadas` no
// componente principal para o que acontece no caso extremo de estourar
// este limite.
const LIMITE_PENDENTES = 500;

function getCodigo(user: any) { return user?.estudante?.codigo_estudante || user?.estudante?.codigo || user?.codigo; }

const TIPO_OPCOES: { value: "" | FinanceiroOrigemCobranca; label: string }[] = [
  { value: "", label: "Todos os tipos" },
  { value: "mensalidade", label: "Mensalidade" },
  { value: "matricula", label: "Matrícula" },
  { value: "avulsa", label: "Outros" },
];

/**
 * Mesmas opções de estado do módulo (ESTADO_PAGAMENTO_OPCOES), exceto
 * "Pendente (sem cobrança gerada)" — esse estado já tem sua própria seção
 * nesta tela (Pendentes, com "Pagar" e checkbox); misturá-lo de novo aqui,
 * no histórico, duplicaria os mesmos itens nas duas seções.
 */
const ESTADO_HISTORICO_OPCOES = [
  { value: "", label: "Todos os estados" },
  ...ESTADO_PAGAMENTO_OPCOES.filter((o) => o.value !== "pendente"),
];

type ResultadoPagamento = { cobranca: QRCodeChargeResult; metodoUsado: FinanceiroMetodoPagamento };

type Tela =
  | { nome: "lista" }
  | { nome: "checkout"; codigoAcademia: string; itens: PagamentoResumo[] }
  | { nome: "detalhe"; cobranca: PagamentoResumo };

/**
 * Rótulo "[Mês] — [Ano letivo]" de uma pendência de mensalidade, a partir
 * do único mês em `PagamentoResumo.mensalidades` — ao contrário de
 * `formatarLinhaMensalidade` (financeiroShared), não depende de
 * `data_referencia`/`valor` como campos de MensalidadeMesView, porque um
 * item desta tela vem de `consultarCobrancasEstudante` (PagamentoResumo),
 * não de `consultarMensalidadesEstudante` (MensalidadeMesView). O ano
 * cívico exato não é mostrado (dependeria de saber se a academia é
 * escolar/superior, informação que PagamentoResumo não carrega) — só o ano
 * letivo, que já identifica o mês sem ambiguidade.
 */
function rotuloPendencia(item: PagamentoResumo) {
  const m = item.mensalidades?.[0];
  if (!m) return origemLabel[item.origem] ?? item.origem;
  return `${capitalizar(NOME_MES[m.mes - 1])} — ${formatAnoLetivo(m.ano_letivo)}`;
}

/** Posição de um mês dentro do ano letivo (setembro=9 .. julho=19), para ordenar cronologicamente sem depender de `data_referencia` (ausente em PagamentoResumo) — mesma regra de virada usada em `mesesDoAnoLetivo` (FinanceiroPagamentosPainel.tsx). */
function posicaoNoAnoLetivo(mes: number) {
  return mes >= 8 ? mes : mes + 12;
}

/** Ordena pendências cronologicamente (mais antiga primeiro) por ano letivo + posição do mês — usado para identificar a mais antiga de cada academia (obrigatória) e para a ordem de exibição na tabela. */
function compararPendencias(a: PagamentoResumo, b: PagamentoResumo) {
  const ma = a.mensalidades?.[0];
  const mb = b.mensalidades?.[0];
  if (!ma || !mb) return 0;
  if (ma.ano_letivo !== mb.ano_letivo) return ma.ano_letivo.localeCompare(mb.ano_letivo);
  return posicaoNoAnoLetivo(ma.mes) - posicaoNoAnoLetivo(mb.mes);
}

/**
 * Tabela de pendências (mensalidade sem cobrança gerada) de UMA academia —
 * "Pagar" e o checkbox de seleção só existem aqui, nunca no histórico
 * (seção mais abaixo, no componente principal): qualquer outro estado já
 * tem uma cobrança real associada (ver PagamentoResumo em types/api.ts) e
 * já está "aguardando pagamento" ou resolvida, sem nenhuma ação de
 * pagamento pendente do estudante.
 *
 * Regra de negócio preservada (já existia antes desta tarefa nesta tela, e
 * agora confirmada também no backend — IniciarPagamentoMensalidades,
 * mensalidade.go, rejeita a transação se a mensalidade pendente mais
 * antiga não estiver incluída): em vez de deixar o botão "Pagar" de uma
 * linha mais nova falhar contra essa validação, ele já inclui a mais
 * antiga automaticamente na transação (com um aviso visual na própria
 * linha) — "pagar individualmente" nunca termina em erro.
 */
function SecaoPendentesAcademia({
  titulo,
  itens,
  selecionados,
  onToggle,
  onPagar,
}: {
  titulo?: string;
  itens: PagamentoResumo[]; // já ordenadas da mais antiga para a mais recente
  selecionados: string[];
  onToggle: (id: string, checked: boolean) => void;
  onPagar: (itens: PagamentoResumo[]) => void;
}) {
  const maisAntiga = itens[0];
  const selecionadosItens = itens.filter((i) => selecionados.includes(i.id));

  function pagarLinha(item: PagamentoResumo) {
    if (!maisAntiga || item.id === maisAntiga.id) {
      onPagar([item]);
      return;
    }
    onPagar([maisAntiga, item]);
  }

  return (
    <div className="mt-5 first:mt-0">
      {titulo && <h3 className="mb-2 font-semibold text-gray-800 dark:text-white/90">{titulo}</h3>}
      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-white/[0.05]">
        <Table className="w-full text-left">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              {["", "Referência", "Tipo", "Valor", ""].map((h, i) => (
                <TableCell key={`${h || "col"}-${i}`} isHeader className="px-3 py-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{h}</TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {itens.map((item) => {
              const obrigatoria = maisAntiga?.id === item.id;
              return (
                <TableRow key={item.id}>
                  <TableCell className="px-3 py-2">
                    <Checkbox
                      id={`pendencia-${item.id}`}
                      checked={selecionados.includes(item.id)}
                      disabled={obrigatoria}
                      onChange={(checked) => onToggle(item.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                    {rotuloPendencia(item)}{obrigatoria ? " (mais antiga, obrigatória)" : ""}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{origemLabel[item.origem] ?? item.origem}</TableCell>
                  <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{money(item.valor)}</TableCell>
                  <TableCell className="px-3 py-2">
                    <Button size="sm" variant="success" onClick={() => pagarLinha(item)}>Pagar</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {selecionadosItens.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 dark:border-white/[0.05]">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {selecionadosItens.length} cobranças selecionadas — total {money(selecionadosItens.reduce((s, i) => s + i.valor, 0))}
          </p>
          <Button size="sm" variant="success" onClick={() => onPagar(selecionadosItens)}>Pagar selecionadas</Button>
        </div>
      )}
    </div>
  );
}

export default function EstudantePagamentosPainel() {
  const { user, loading } = useUserCookie();
  const restricted = tokenStorage.isRestrictedFinance();
  const codigo = getCodigo(user);

  const [tela, setTela] = useState<Tela>({ nome: "lista" });

  // Única informação que esta tela ainda usa de
  // GET /financeiro/mensalidades/estudante/:codigo: os métodos de
  // pagamento habilitados por academia (necessários na tela de checkout,
  // mais abaixo) e a lista de mensalidades "anulado" (seção própria, mais
  // abaixo) — a listagem de pendências em si vem de `pendentesApi`
  // (consultarCobrancasEstudante), não mais deste endpoint (ver comentário
  // ali sobre por que a fonte mudou).
  const mensalidadesApi = useApi(financeiroService.consultarMensalidadesEstudante);

  // Pendências (mensalidade sem cobrança gerada) — fonte única desta
  // seção, com estado=["pendente"]. Nenhuma cobrança real tem esse status
  // (ver PagamentoResumo em types/api.ts), e o backend já devolve isto
  // deduplicado: um mês com uma cobrança "aguardando_pagamento" em aberto
  // NÃO aparece aqui (FiltrarPendenciasComCobrancaRealVinculada, backend) —
  // é assim que "Pagar" e o checkbox nunca aparecem para quem já está
  // aguardando pagamento, mesmo que o mês ainda não tenha sido pago de
  // verdade. Não usa consultarMensalidadesEstudante (como antes desta
  // tarefa) porque aquele endpoint devolve o estado bruto da obrigação,
  // sem essa deduplicação — um mês já em "aguardando_pagamento" continuaria
  // aparecendo como pendente lá.
  const pendentesApi = useApi(financeiroService.consultarCobrancasEstudante);

  // Histórico (tudo que não é pendência sintética) — mesma fonte unificada
  // do backend, agora sempre visível nesta mesma tela em vez de uma
  // sub-tela separada. `estado` nunca fica vazio: quando o filtro é "Todos
  // os estados", passamos ESTADOS_COBRANCA_REAL explicitamente em vez de
  // omitir o parâmetro — omitir faria o backend incluir as pendências de
  // novo (DeveIncluirPendenciasSemCobranca só as exclui quando o filtro de
  // estado é não-vazio e não contém "pendente"), duplicando-as com a seção
  // Pendentes acima.
  const historicoApi = useApi(financeiroService.consultarCobrancasEstudante);
  const [tipoHistorico, setTipoHistorico] = useState<"" | FinanceiroOrigemCobranca>("");
  const [estadoHistorico, setEstadoHistorico] = useState("");
  const [paginaHistorico, setPaginaHistorico] = useState(1);

  const pagar = useApi(financeiroService.iniciarPagamentoMensalidades);

  // Seleção (checkboxes) da seção Pendentes, chaveada por academia — evita
  // misturar, numa mesma transação, pendências de academias diferentes
  // (IniciarPagamentoMensalidades só aceita um único codigo_academia por
  // chamada). Cada seção (SecaoPendentesAcademia) só lê/escreve a sua
  // própria chave.
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  // Academias cuja seleção padrão (mensalidade pendente mais antiga,
  // pré-marcada e obrigatória) já foi calculada — evita recalcular (e
  // apagar a seleção em andamento) a cada refetch de `pendentesApi`. É
  // removido de propósito logo após um pagamento confirmado daquela
  // academia (ver `confirmarCheckout`), para que a próxima mensalidade
  // pendente mais antiga já fique pronta assim que os dados atualizados
  // chegarem.
  const initializedRef = useRef<Set<string>>(new Set());
  const [nomesAcademias, setNomesAcademias] = useState<Record<string, string>>({});
  // Academias cujo nome já foi buscado (com sucesso ou falha) — evita
  // repetir a requisição a cada render; em caso de falha o título mantém
  // o fallback "Academia [código]".
  const nomesFetchedRef = useRef<Set<string>>(new Set());

  const [metodoCheckout, setMetodoCheckout] = useState<FinanceiroMetodoPagamento>("GPO");
  const [telefoneCheckout, setTelefoneCheckout] = useState("");

  const [alert, setAlert] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && codigo) {
      void mensalidadesApi.execute(codigo).catch((e) => setAlert(formatApiError(e, "Não foi possível carregar os métodos de pagamento.")));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, codigo]);

  const recarregarPendentes = useCallback(async () => {
    if (!codigo) return;
    try {
      await pendentesApi.execute(codigo, { estado: ["pendente"], limit: LIMITE_PENDENTES, offset: 0 });
    } catch (e) {
      setAlert(formatApiError(e, "Não foi possível carregar as pendências."));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  useEffect(() => {
    if (!loading && codigo) void recarregarPendentes();
  }, [loading, codigo, recarregarPendentes]);

  const recarregarHistorico = useCallback(async () => {
    if (!codigo || restricted) return;
    try {
      await historicoApi.execute(codigo, {
        estado: estadoHistorico ? [estadoHistorico] : ESTADOS_COBRANCA_REAL,
        tipo: tipoHistorico ? [tipoHistorico] : undefined,
        limit: PAGE_SIZE,
        offset: (paginaHistorico - 1) * PAGE_SIZE,
      });
    } catch (e) {
      setAlert(formatApiError(e, "Não foi possível carregar o histórico de cobranças."));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, restricted, estadoHistorico, tipoHistorico, paginaHistorico]);

  useEffect(() => {
    if (!loading && codigo) void recarregarHistorico();
  }, [loading, codigo, recarregarHistorico]);

  // Seleção padrão (mensalidade pendente mais antiga de cada academia,
  // pré-marcada e obrigatória) — recalculada só para academias ainda não
  // inicializadas, mesmo cuidado que o desenho anterior desta tela já
  // tinha, para não apagar uma seleção manual em andamento a cada refetch.
  useEffect(() => {
    const itens = pendentesApi.data?.pagamentos ?? [];
    const porAcademia = itens.reduce<Record<string, PagamentoResumo[]>>((acc, i) => {
      if (i.codigo_academia) (acc[i.codigo_academia] ??= []).push(i);
      return acc;
    }, {});
    const academiasNovas = Object.keys(porAcademia).filter((a) => !initializedRef.current.has(a));
    if (academiasNovas.length === 0) return;
    setSelected((prev) => {
      const next = { ...prev };
      for (const academia of academiasNovas) {
        const ordenados = [...porAcademia[academia]].sort(compararPendencias);
        next[academia] = ordenados[0] ? [ordenados[0].id] : [];
      }
      return next;
    });
    academiasNovas.forEach((a) => initializedRef.current.add(a));
  }, [pendentesApi.data]);

  // Nome de cada academia com pendências — só relevante quando há mais de
  // uma (ver semDivisaoPendentes); mesma fonte pública já usada antes desta
  // tarefa (GET /consultar-academia/:codigo).
  useEffect(() => {
    const codigos = Array.from(new Set((pendentesApi.data?.pagamentos ?? []).map((i) => i.codigo_academia).filter((c): c is string => !!c)));
    const faltantes = codigos.filter((c) => !nomesFetchedRef.current.has(c));
    if (faltantes.length === 0) return;
    faltantes.forEach((c) => nomesFetchedRef.current.add(c));
    faltantes.forEach((codigoAcademia) => {
      consultasService
        .academia(codigoAcademia)
        .then((r) => {
          // GET /consultar-academia/:codigo devolve os campos da academia
          // NO NÍVEL RAIZ da resposta, não envolvidos em `{ academia: {...} }`
          // como o tipo ConsultarAcademiaResponse sugere — mesma
          // divergência já contornada em MatriculaPublicPage.tsx.
          const bruto = r as unknown as { academia?: { nome?: string }; nome?: string };
          const nome = bruto.academia?.nome ?? bruto.nome;
          if (!nome) return;
          setNomesAcademias((prev) => ({ ...prev, [codigoAcademia]: nome }));
        })
        .catch(() => { /* mantém o fallback "Academia [código]" no título desta academia */ });
    });
  }, [pendentesApi.data]);

  const toggle = (academia: string, id: string, checked: boolean) => {
    setSelected((prev) => {
      const atual = prev[academia] ?? [];
      return { ...prev, [academia]: checked ? [...atual, id] : atual.filter((x) => x !== id) };
    });
  };

  const metodosPagamentoPorAcademia = mensalidadesApi.data?.metodos_pagamento_por_academia ?? {};

  function abrirCheckout(codigoAcademia: string, itens: PagamentoResumo[]) {
    pagar.reset();
    setAlert(null);
    setMetodoCheckout(metodosPagamentoPorAcademia[codigoAcademia]?.[0] ?? "GPO");
    setTelefoneCheckout("");
    setTela({ nome: "checkout", codigoAcademia, itens });
  }

  function fecharCheckout() {
    pagar.reset();
    setTela({ nome: "lista" });
  }

  async function confirmarCheckout() {
    if (tela.nome !== "checkout") return;
    const meses = tela.itens.map((i) => i.mensalidades![0]);
    try {
      await pagar.execute({
        codigo_academia: tela.codigoAcademia,
        meses,
        metodo_pagamento: metodoCheckout,
        telefone: metodoCheckout === "GPO" ? telefoneCheckout : undefined,
      });
      // Força o recálculo da seleção padrão desta academia assim que os
      // dados atualizados chegarem (efeito acima): se ainda restarem
      // pendências, a próxima mais antiga já fica pronta.
      initializedRef.current.delete(tela.codigoAcademia);
      await recarregarPendentes();
      await recarregarHistorico();
    } catch (e) {
      setAlert(formatApiError(e, "Não foi possível iniciar o pagamento."));
    }
  }

  if (loading) return <LoadingState label="Carregando..." />;
  if (!codigo) return <Alert variant="error" title="Pagamentos" message="Não foi possível identificar o estudante logado." />;

  if (tela.nome === "detalhe") {
    return <SubtelaDetalheCobranca cobranca={tela.cobranca} onVoltar={() => setTela({ nome: "lista" })} mostrarDadosEstudante={false} />;
  }

  if (tela.nome === "checkout") {
    const total = tela.itens.reduce((s, i) => s + i.valor, 0);
    const disponiveis: FinanceiroMetodoPagamento[] = metodosPagamentoPorAcademia[tela.codigoAcademia] ?? ["GPO"];
    const resultado = pagar.data?.cobranca;
    return (
      <SubtelaPanel title="Pagamento" icon="mdi:credit-card-outline" onVoltar={fecharCheckout}>
        {alert && <Alert variant="error" title="Pagamento" message={alert} />}

        <div className="space-y-2 rounded-xl border border-gray-100 p-4 dark:border-white/[0.05]">
          {tela.itens.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>{rotuloPendencia(item)}</span>
              <span>{money(item.valor)}</span>
            </div>
          ))}
          {tela.itens.length > 1 && (
            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 text-sm font-semibold text-gray-800 dark:border-white/[0.05] dark:text-white/90">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
          )}
        </div>

        {resultado ? (
          <div className="mt-4 space-y-3 rounded-lg border border-gray-100 p-4 dark:border-white/[0.05]">
            <p className="text-sm text-gray-700 dark:text-gray-300">Status: {resultado.status}</p>
            {metodoCheckout === "GPO" && (
              <p className="text-sm text-gray-700 dark:text-gray-300">Você receberá uma notificação no telefone informado para confirmar o pagamento.</p>
            )}
            {metodoCheckout === "REF" && (
              <pre className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs dark:bg-gray-800">{JSON.stringify(resultado.response ?? {}, null, 2)}</pre>
            )}
            {metodoCheckout === "GPO_QR" && <Qr value={resultado.qrCodeArr} />}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => { void recarregarPendentes(); void recarregarHistorico(); }}>Verificar status</Button>
              <Button size="sm" variant="outline" onClick={fecharCheckout}>Voltar</Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <MetodoPagamentoSelector value={metodoCheckout} disponiveis={disponiveis} onChange={setMetodoCheckout} />
            {metodoCheckout === "GPO" && (
              <Input placeholder="Telefone" value={telefoneCheckout} onChange={(e) => setTelefoneCheckout(e.target.value)} />
            )}
            <Button disabled={pagar.loading || (metodoCheckout === "GPO" && !telefoneCheckout)} onClick={confirmarCheckout}>
              {pagar.loading ? "Aguarde..." : "Confirmar pagamento"}
            </Button>
          </div>
        )}
      </SubtelaPanel>
    );
  }

  // tela.nome === "lista"
  const pendentesItens = pendentesApi.data?.pagamentos ?? [];
  const pendentesPorAcademia = pendentesItens.reduce<Record<string, PagamentoResumo[]>>((acc, i) => {
    if (i.codigo_academia) (acc[i.codigo_academia] ??= []).push(i);
    return acc;
  }, {});
  const academias = Object.keys(pendentesPorAcademia);
  const semDivisaoPendentes = academias.length <= 1;
  const totalPendentesGeral = pendentesApi.data?.total_geral ?? 0;
  const pendentesTruncadas = totalPendentesGeral > pendentesItens.length;

  const anuladas = (mensalidadesApi.data?.mensalidades ?? []).filter((m: MensalidadeMesView) => m.estado === "anulado");

  const totalHistorico = historicoApi.data?.total_geral ?? 0;
  const totalPaginasHistorico = Math.max(1, Math.ceil(totalHistorico / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {restricted && <Alert variant="warning" title="Acesso financeiro restrito" message="O seu vínculo com a academia foi encerrado. Você pode consultar e regularizar pendências financeiras aqui." />}
      {alert && <Alert variant="error" title="Pagamentos" message={alert} />}

      <div className="flex items-center gap-2">
        <Icon icon="mdi:credit-card-multiple-outline" width={24} className="text-gray-800 dark:text-white/90" />
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Meus pagamentos</h1>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center gap-2">
          <Icon icon="mdi:cash-clock" width={22} className="text-gray-800 dark:text-white/90" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Pendentes</h2>
        </div>

        {pendentesApi.loading ? (
          <LoadingState label="Carregando pendências..." />
        ) : pendentesItens.length === 0 ? (
          <EmptyState title="Nenhuma pendência." description="Não há mensalidades pendentes no momento." />
        ) : semDivisaoPendentes ? (
          <SecaoPendentesAcademia
            itens={[...pendentesItens].sort(compararPendencias)}
            selecionados={selected[academias[0]] ?? []}
            onToggle={(id, checked) => toggle(academias[0], id, checked)}
            onPagar={(itens) => abrirCheckout(academias[0], itens)}
          />
        ) : (
          academias.map((academia) => (
            <SecaoPendentesAcademia
              key={academia}
              titulo={nomesAcademias[academia] ?? `Academia ${academia}`}
              itens={[...pendentesPorAcademia[academia]].sort(compararPendencias)}
              selecionados={selected[academia] ?? []}
              onToggle={(id, checked) => toggle(academia, id, checked)}
              onPagar={(itens) => abrirCheckout(academia, itens)}
            />
          ))
        )}

        {pendentesTruncadas && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Existem mais pendências além das {pendentesItens.length} mostradas aqui — contacte a sua academia caso alguma mensalidade antiga não apareça.
          </p>
        )}
      </section>

      {anuladas.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="mb-4 flex items-center gap-2">
            <Icon icon="mdi:cancel" width={22} className="text-gray-800 dark:text-white/90" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Mensalidades anuladas</h2>
          </div>
          <div className="flex flex-col gap-2">
            {[...anuladas].sort(compararMensalidadesPorData).map((m) => (
              <div key={chaveMensalidade(m)} className="flex items-center justify-between gap-3 text-sm text-gray-700 dark:text-gray-300">
                <span>{formatarLinhaMensalidade(m)}</span>
                <StatusBadge status={m.estado} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center gap-2">
          <Icon icon="mdi:history" width={22} className="text-gray-800 dark:text-white/90" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Histórico</h2>
        </div>

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
              {historicoApi.loading ? (
                <LoadingState label="Carregando histórico..." />
              ) : (historicoApi.data?.pagamentos?.length ?? 0) > 0 ? (
                <CobrancasTable rows={historicoApi.data?.pagamentos ?? []} onOpen={(c) => setTela({ nome: "detalhe", cobranca: c })} />
              ) : (
                <EmptyState title="Sem histórico." description="Nenhuma cobrança foi encontrada para os filtros selecionados." />
              )}
            </div>
            <div className="mt-4">
              <PaginacaoSetas paginaAtual={paginaHistorico} totalPaginas={totalPaginasHistorico} total={totalHistorico} porPagina={PAGE_SIZE} onChange={setPaginaHistorico} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

```

## 7. Testes obrigatórios

1. `npx tsc --noEmit` na raiz do repositório.
2. `npx eslint .` (ou `npm run lint`) na raiz do repositório — confirme que nenhum problema novo
   aparece nos três arquivos desta tarefa (`FinanceiroPagamentosPainel.tsx`, `financeiroShared.tsx`,
   `EstudantePagamentosPainel.tsx`). Os avisos/erros pré-existentes em outros arquivos (ex.:
   `Calendar.tsx`, `verificar-email/[token]/page.tsx`, alguns `useEffect` de Serviços Extras) não são
   desta tarefa — não precisa corrigi-los.
3. `npm run build` — no seu ambiente, com acesso normal à internet, isto deve completar sem erro. No
   sandbox usado para validar este documento, o build parou só por uma restrição de rede específica do
   sandbox (não conseguia buscar a fonte `Outfit` do Google Fonts) — nada relacionado ao código desta
   tarefa; ver seção 8.

Já rodei os itens 1 e 2 (mais o build, até onde o sandbox permitiu) sobre este exato conjunto de
mudanças — veja a seção 8. Rode de novo no seu ambiente como segunda confirmação independente.

## 8. O que eu (Claude) já validei

Apliquei estas exatas mudanças (seções 4, 5 e 6) numa cópia local real dos repositórios
`rastreio-frontend` (clonado do GitHub) e `rastreio-backend` (clonado só para ler o código-fonte do
backend e confirmar os endpoints/validações citados na seção 1 e 2 — nenhuma mudança foi feita nesse
repositório). No frontend, com as ferramentas reais do próprio projeto:

- `npm install` — 803 pacotes, sem erro de instalação.
- `npx tsc --noEmit` na raiz do projeto inteiro (não só nos três arquivos alterados) — **zero erros**,
  antes e depois de cada mudança.
- `npx eslint .` no projeto inteiro — **zero problemas novos** nos três arquivos desta tarefa. Este
  projeto usa o plugin do React Compiler no ESLint (regras `react-hooks/set-state-in-effect`,
  `react-hooks/purity`, etc., bem mais estritas que o padrão) — o novo código passa por elas sem
  nenhum aviso.
- `npm run build` (`next build`, Turbopack) — parou só na etapa de buscar a fonte `Outfit` do Google
  Fonts (`fonts.googleapis.com`), um domínio fora da lista de domínios permitidos no sandbox onde
  validei isto — **não é um erro de código**; o build chegou a compilar toda a árvore de componentes
  (incluindo os três arquivos desta tarefa) antes de falhar nessa etapa de rede. Rode `npm run build`
  no seu ambiente (com acesso normal à internet) como confirmação final desta etapa.
- Conferi o `git diff` resultante nos três arquivos: `FinanceiroPagamentosPainel.tsx` (2 pontos, seção
  4) e `financeiroShared.tsx` (4 pontos, seção 5) só mudam exatamente o que está descrito;
  `EstudantePagamentosPainel.tsx` é a reescrita completa da seção 6, sem nenhuma linha residual do
  arquivo anterior fora do que foi conscientemente reaproveitado (ex.: a busca do nome da academia via
  `consultasService.academia`, com a mesma observação sobre o formato de resposta que já existia antes
  desta tarefa).
- Confirmei em `internal/finance/mensalidade.go`
  (`IniciarPagamentoMensalidades`, `rastreio-backend`) que a validação "a seleção deve incluir a
  mensalidade pendente mais antiga" já existe no backend — a decisão 2.3 (auto-incluir a mais antiga no
  clique de "Pagar" de qualquer linha) foi desenhada e confirmada contra esse código real, não é uma
  suposição.
- Confirmei em `internal/finance/pagamentos_unificado.go` e
  `internal/finance/mensalidade_pendencias.go` (`rastreio-backend`) que `PendenciasSemCobrancaEstudante`
  só sintetiza pendências para `Estado == EstadoPendente` (nunca para `"anulado"`/`"pago"`) — é a base
  da decisão 2.4 (seção "Mensalidades anuladas" nova, para não perder essa visibilidade).

Não há nada pendente de validação de ambiente aqui (esta tarefa não usa Postgres, Docker, nem nada que
dependa de rede além do `npm install`/`npm run build` normais do projeto e do próprio repositório
`rastreio-backend` só para leitura) — as seções 7 e 9 são só uma segunda confirmação independente da
sua parte.

## 9. Verificação manual sugerida

Depois de aplicar tudo, confira visualmente (idealmente também no tema escuro):

- `/financas/pagamentos` (como academia ou admin): o menu principal mostra só "Mensalidade / Propina" e
  "Taxa de matrícula" — sem o cartão "Outros". A tabela de listagem (qualquer um dos dois tipos) não
  tem mais a coluna "Descrição". Abrir "Ver detalhes" de qualquer cobrança mostra o novo layout
  (valor em destaque + badge de estado no topo, grade de dois campos, botão de copiar em Referência
  AppyPay/Transação quando esses campos existem).
- `/pagamentos` (como estudante) **com pendências em só uma academia**: a seção "Pendentes" mostra uma
  tabela única, com a mensalidade mais antiga já marcada e travada ("mais antiga, obrigatória"). Marque
  mais um mês e confirme que aparece a barra "N cobranças selecionadas" com o botão "Pagar
  selecionadas". Clique em "Pagar" numa linha que não é a mais antiga (sem mexer nos checkboxes) e
  confirme que a tela de checkout abre com **dois** itens (a mais antiga + a clicada). Clique em
  "Pagar" na própria linha mais antiga e confirme que abre com **um** item só. Complete um pagamento
  (ambiente de teste) e confirme que, ao voltar, o item pago não aparece mais em Pendentes e passa a
  aparecer em Histórico.
- Mesma tela, com um estudante que tenha alguma mensalidade `"anulado"` (se existir algum caso de teste)
  — confirme que a seção "Mensalidades anuladas" aparece, com o valor e o badge corretos.
- Mesma tela, filtrando o Histórico por cada tipo/estado — confirme que "Pendente (sem cobrança
  gerada)" não é mais uma opção ali (só existe na seção Pendentes, acima) e que "Todos os estados"
  não traz nenhum item duplicado que já apareça em Pendentes.
- Mesma tela, com uma conta de sessão financeira restrita (`acesso_restrito_financeiro`) — confirme que
  a seção Histórico continua mostrando a mensagem de indisponibilidade, mas Pendentes continua
  funcionando normalmente (consultar e pagar).
- Se houver algum estudante de teste com pendências em **duas** academias diferentes — confirme que a
  seção Pendentes aparece dividida em duas sub-tabelas, cada uma com o nome da respectiva academia, e
  que selecionar itens numa não afeta a seleção da outra.

## 10. Checklist de aceite

- [ ] `/financas/pagamentos`: cartão "Outros" removido do menu; coluna "Descrição" removida da tabela
      de listagem; "Detalhe da cobrança" no novo layout (cabeçalho com valor+estado, grade de
      metadados, botão de copiar em Referência AppyPay/Transação).
- [ ] `/pagamentos`: Pendentes e Histórico aparecem na mesma tela, sem nenhuma sub-tela de "Histórico
      de pagamentos" separada.
- [ ] Na seção Pendentes, "Pagar" e o checkbox só existem para itens com status "pendente" — nenhum
      item "aguardando_pagamento" (ou qualquer outro estado) tem essas duas ações.
- [ ] A mensalidade pendente mais antiga de cada academia aparece sempre marcada e com o checkbox
      travado (não dá para desmarcar).
- [ ] Clicar em "Pagar" em qualquer linha (mais antiga ou não) sempre abre o checkout com uma transação
      válida (nunca um erro do backend por faltar a mais antiga).
- [ ] Marcar mais de um item mostra a barra "N cobranças selecionadas" com o botão "Pagar
      selecionadas", que abre o checkout com todos os itens marcados.
- [ ] A tela de checkout mostra o(s) item(ns), o total (quando mais de um), o seletor de método de
      pagamento e o campo de telefone (só para GPO) — nenhum desses dois últimos aparece mais na tela
      principal.
- [ ] Depois de confirmar o pagamento, o resultado (status/QR/referência) aparece na própria tela de
      checkout, com "Verificar status" e "Voltar"; ao voltar, Pendentes e Histórico já refletem o novo
      estado.
- [ ] Estudante com pendências em mais de uma academia continua vendo uma sub-seção por academia,
      sem misturar seleção entre elas.
- [ ] Seção "Mensalidades anuladas" aparece só quando existe alguma, com o mesmo valor/estado de antes.
- [ ] Sessão financeira restrita: Histórico continua indisponível; Pendentes continua funcionando.
- [ ] `npx tsc --noEmit` e `npx eslint .` sem nenhum erro/aviso novo nos três arquivos desta tarefa.
- [ ] `npm run build` sem erros (no seu ambiente, com internet).

## Procedimento de conclusão

1. Aplique a seção 4, depois a seção 5, depois a seção 6, nessa ordem (a ordem não afeta o resultado
   final, mas facilita conferir cada patch isoladamente antes de passar para o próximo).
2. Rode a seção 7 e confirme que os três comandos passam.
3. Faça a verificação manual da seção 9 no seu ambiente de desenvolvimento.
4. Confira o checklist da seção 10.
5. Não faça commit/push nem abra pull request — deixe as alterações prontas no working tree para o
   Fredy revisar.
6. Quando Fredy confirmar, atualize o front matter deste documento para `status: feito` e acrescente
   "(feito)" ao título — mesma convenção já usada nos demais arquivos de `src/docs/`. Isso só depois da
   confirmação, não como parte da execução automática.
