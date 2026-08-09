# Tarefa para Codex — Atualizar Frontend (spuripainel) aos Módulos de Notas e Faltas

**Repositório:** `fredypdp/spuripainel` (branch `main`).
**Contexto:** o backend (`spuri-backend`) passou por cinco rodadas de depuração e ganhou, para os módulos de Notas e Faltas: dois endpoints novos de correção (`PATCH /academia/notas-aluno/:id`, `PATCH /academia/faltas-aluno/:id`), campos novos de auditoria em `GET /notas`, `GET /faltas`, `GET /notas-estudante/:codigo`, `GET /faltas-estudante/:codigo`, um filtro novo (`?corrigido=`), e dois endpoints de auditoria de eventos já existentes, mas agora abertos a estudante/academia além de admin (`GET /eventos/:event_id`, `GET /eventos-estudante/:codigo`). **`src/docs/Documentação da API.md` já está atualizada e é a fonte de verdade** — confirmei linha a linha que reflete exatamente o estado atual do backend. O frontend, porém, ainda não foi atualizado para usar nada disso.

**Como usar este documento:** cada tarefa tem um ID (`FE-01`, `FE-02`, ...), o(s) arquivo(s) exato(s) a alterar, o estado atual confirmado por leitura de código, e o que fazer. Seguir a ordem — as tarefas de tipos/serviço (`FE-01`–`FE-03`) são pré-requisito das tarefas de UI (`FE-04` em diante), porque os componentes de página vão consumir esses tipos e funções.

---

## 1. Camada de tipos (`src/types/api.ts`)

### FE-01 — Adicionar campos de auditoria/correção a `Nota` e `Falta`

**Estado atual confirmado (linhas 1020–1052):** as interfaces `Nota` e `Falta` não têm nenhum dos cinco campos novos que a API já devolve.

**Fazer:** adicionar a ambas as interfaces, como campos opcionais (o backend usa `omitempty`, então só vêm preenchidos quando o registro já foi corrigido):

```ts
export interface Nota {
  id: string;
  codigo_estudante: string;
  codigo_academia: string;
  estudante_nome?: string;
  academia_nome?: string;
  ano_lectivo: string;
  ano_academico: string;
  periodo: Periodo;
  materia_disciplinar_id: string;
  materia_nome?: string;
  tipo: TipoNota;
  categoria: CategoriaNota;
  nota: number;
  observacao?: string;
  registrado_por?: string;
  valor_anterior?: number;
  motivo_correcao?: string;
  corrigido_por?: string;
  corrigido_em?: string;
  registered_at: string;
  event_id: string;
  version: number;
}

export interface Falta {
  id: string;
  codigo_estudante: string;
  codigo_academia: string;
  estudante_nome?: string;
  academia_nome?: string;
  ano_lectivo: string;
  ano_academico: string;
  data: ApiDate;
  materia_disciplinar_id: string;
  materia_nome?: string;
  quantidade: number;
  observacao?: string;
  registrado_por?: string;
  valor_anterior?: number;
  motivo_correcao?: string;
  corrigido_por?: string;
  corrigido_em?: string;
  registered_at: string;
  event_id: string;
  version: number;
}
```

### FE-02 — Adicionar filtro `corrigido` a `ListarNotasParams` e `ListarFaltasParams`

**Estado atual confirmado (linhas 664–723):** nenhum dos dois tipos tem esse campo.

**Fazer:** adicionar `corrigido?: boolean;` a `ListarNotasParams` e a `ListarFaltasParams`, com um comentário `/** Filtra registros que já receberam (true) ou não (false) evento compensatório de correção. */`.

### FE-03 — Criar tipos de request/response para correção e para auditoria de evento individual

**Fazer:** adicionar a `src/types/api.ts` (perto de `RegistrarNotasRequest`/`RegistrarFaltasRequest`, respectivamente):

```ts
export interface CorrigirNotaRequest {
  nota: number;
  observacao?: string;
  motivo: string;
}

export interface CorrigirNotaResponse {
  message: string;
  id: string;
}

export interface CorrigirFaltaRequest {
  quantidade: number;
  observacao?: string;
  motivo: string;
}

export interface CorrigirFaltaResponse {
  message: string;
  id: string;
}
```

E, perto de `EventosEstudanteResponse` (linha ~1454), reaproveitando a interface `Evento` já existente (linha 1249):

```ts
export interface EventoAuditoriaResponse {
  evento: Evento;
}
```

---

## 2. Camada de serviço (`src/lib/api/services.ts`)

### FE-04 — Adicionar `corrigirNota` e `corrigirFalta` a `academiaService`

**Estado atual confirmado (linhas 1044–1057):** `academiaService` tem `registrarNota` (`POST /academia/notas-aluno`) e `registrarFaltas` (`POST /academia/faltas-aluno`), mas nenhuma função de correção. O cliente HTTP já suporta `.patch<T, TBody>()` (`src/lib/api/client.ts:262`), então não é preciso criar infraestrutura nova.

**Fazer:** logo abaixo de `registrarNota`, dentro do bloco `// ── Notas ──`:

```ts
corrigirNota: (id: string, data: CorrigirNotaRequest, token?: string) =>
  api.patch<CorrigirNotaResponse>(
    `/academia/notas-aluno/${id}`,
    data,
    { token: token || tokenStorage.get() || undefined }
  ),
```

E logo abaixo de `registrarFaltas`, dentro do bloco `// ── Faltas ──`:

```ts
corrigirFalta: (id: string, data: CorrigirFaltaRequest, token?: string) =>
  api.patch<CorrigirFaltaResponse>(
    `/academia/faltas-aluno/${id}`,
    data,
    { token: token || tokenStorage.get() || undefined }
  ),
```

Importar `CorrigirNotaRequest`, `CorrigirNotaResponse`, `CorrigirFaltaRequest`, `CorrigirFaltaResponse` no topo do arquivo, junto aos demais tipos já importados de `@/types/api`.

### FE-05 — Adicionar `corrigido` aos query builders de `listarNotas`/`listarFaltas`

**Estado atual confirmado (linhas 697–748):** `listarNotas`/`listarFaltas`, dentro de `consultasService`, montam a query string com `appendMultiValueParam` para cada filtro, mas não incluem `corrigido`.

**Fazer:** em ambas as funções, logo após o último `appendMultiValueParam(...)` e antes de montar `query`, adicionar:

```ts
if (params?.corrigido !== undefined) qs.set('corrigido', String(params.corrigido));
```

(Conferir se já existe um helper equivalente para parâmetros booleanos simples no arquivo antes de escrever um novo — se houver, reaproveitar em vez de duplicar lógica.)

### FE-06 — Adicionar `eventoAuditoria` a `eventSourcingService`

**Estado atual confirmado (linhas 787–796):** `eventSourcingService` só tem `eventosEstudante` (`GET /eventos-estudante/:codigo`) e `verificarIntegridade`. Não existe função para `GET /eventos/:event_id`. Confirmei também que `eventSourcingService`/`eventosEstudante` **não é usado em nenhuma página hoje** (`src/app`, `src/components`) — é código de serviço já pronto mas sem UI consumidora. Isso é relevante para a priorização das tarefas de UI na seção 3.

**Fazer:**

```ts
eventoAuditoria: (eventId: string, token?: string) =>
  api.get<EventoAuditoriaResponse>(
    `/eventos/${eventId}`,
    { token: token || tokenStorage.get() || undefined }
  ),
```

Importar `EventoAuditoriaResponse` no topo do arquivo.

---

## 3. Páginas e componentes

Cada página/componente abaixo já foi lido e mapeado; a coluna "padrão atual" descreve o que existe hoje para orientar onde encaixar a mudança sem reescrever o componente do zero.

### FE-07 — `src/components/notas/NotasAcademia.tsx`: ação de corrigir nota

**Padrão atual confirmado:** o componente renderiza uma tabela **pivotada** (linha = estudante, coluna = categoria) em duas variantes, `TabelaNotasEscolar` (linha ~250) e `TabelaNotasSuperior` (linha ~308). Cada célula preenchida já tem acesso ao objeto `Nota` completo via `notaCat` (`const notaCat = notasEst.find(n => n.categoria === cat)`), incluindo `notaCat.id` — só falta o gatilho de clique. Existe um modal único, `ModalGestao` (linha ~412), com abas (`ModalMode`: `"registrar" | "categoria"`) já usando o componente `Modal` de `@/components/ui/modal` e o hook `useModal`.

**Fazer:**
1. Nas duas tabelas, trocar a `<td>` de célula preenchida (que hoje só renderiza `notaText(notaCat?.nota)`) para um elemento clicável (`<button>` ou `<td onClick=...>`) quando `notaCat` existir, chamando um novo callback `onCorrigir(notaCat: Nota)` recebido por prop.
2. Se `notaCat.corrigido_em` existir, mostrar um indicador visual discreto na célula (ex.: um pontinho/ícone pequeno no canto, ou sublinhado tracejado) com `title`/tooltip mostrando `Corrigido em {corrigido_em}: {valor_anterior} → {nota}. Motivo: {motivo_correcao}` — sem precisar de um componente de tooltip novo se o projeto não tiver um padrão pronto; um `title` HTML nativo já resolve como primeira versão.
3. Criar `ModalCorrigirNota` (arquivo novo `src/components/notas/ModalCorrigirNota.tsx`, ou uma nova aba `"corrigir"` dentro do próprio `ModalGestao` — decidir pelo que gerar menos duplicação de estilo, olhando como `ModalGestao` já faz para `"registrar"`) com os campos: `nota` (number, pré-preenchido com o valor atual), `observacao` (opcional, pré-preenchido), `motivo` (obrigatório, **sem valor pré-preenchido**, campo de texto livre). Ao submeter, chamar `academiaService.corrigirNota(notaSelecionada.id, { nota, observacao, motivo }, token)`.
4. Validação no cliente, espelhando a regra que a `ModalGestao` já aplica para `registrar` (linha ~452, `n < 0 || n > 20`): usar o mesmo teto de 0–20 (ou 0–10 conforme o ano acadêmico, se o componente já tiver essa lógica disponível — conferir `validarEscalaNotaPorAnoAcademico` equivalente no frontend antes de assumir 20 fixo) e obrigar `motivo` não vazio antes de chamar a API — só como validação client-side amigável; a validação de verdade já está no backend.
5. Tratar erro 403 (`nota pertence a outra academia`), 404 (`id não encontrado`) e 400 (`motivo`/teto) com a mesma UI de alerta já usada em `handleRegistrar` (`setError(err?.message ?? ...)`).
6. Depois do sucesso, recarregar as notas da turma/período atual (mesma função que já é chamada depois de `onRegistrar` no fluxo existente) para que a tabela mostre o valor corrigido sem precisar de reload manual da página.

### FE-08 — `src/components/faltas/FaltasAcademia.tsx`: ação de corrigir falta

**Padrão atual confirmado:** diferente de notas, `TabelaFaltas` (linha ~159) é uma tabela **linear** (uma linha por `Falta`, `key={f.id}`), com colunas Nome, Código, Data, Qtd, Observação — mais simples de estender.

**Fazer:**
1. Adicionar uma coluna `Ações` (`<th>`) e, em cada linha com falta (`<tr key={f.id}>`), um botão/ícone "Corrigir" na última `<td>`, chamando `onCorrigir(f: Falta)`.
2. Se `f.corrigido_em` existir, mostrar o mesmo tipo de indicador visual sugerido em `FE-07` (ícone/badge + `title` com `valor_anterior`/`motivo_correcao`/`corrigido_em`) — pode ficar ao lado da quantidade, na mesma célula, para não precisar de coluna extra.
3. Criar `ModalCorrigirFalta` (mesmo raciocínio de reaproveitamento do `FE-07`, olhando o modal de registrar falta já existente por volta da linha 254) com campos `quantidade` (pré-preenchida, limite 1–100 no cliente, espelhando o limite que já existe no backend), `observacao` (opcional) e `motivo` (obrigatório). Chamar `academiaService.corrigirFalta(f.id, { quantidade, observacao, motivo }, token)`.
4. Mesmo tratamento de erros e reload pós-sucesso descrito em `FE-07`.

### FE-09 — `src/components/notas/NotasAdmin.tsx` e `src/components/faltas/FaltasAdmin.tsx`: exibir indicador de correção (somente leitura)

**Padrão atual confirmado:** `NotasAdmin.tsx` usa o mesmo padrão pivotado de `NotasAcademia.tsx`; presumir que `FaltasAdmin.tsx` segue o mesmo padrão linear de `FaltasAcademia.tsx` (mesma estrutura de componente-irmão) — conferir ao implementar.

**Fazer:** admin não corrige diretamente por aqui (o backend não expõe correção para admin nestes endpoints — só a academia dona do registro corrige), então **não** adicionar o modal/ação de correção nestas duas páginas. Adicionar apenas o mesmo indicador visual somente-leitura de `FE-07`/`FE-08` (célula/linha com `corrigido_em` preenchido ganha o ícone + tooltip), para que o admin também veja quais registros já foram corrigidos ao navegar pela mesma árvore turma/período.

### FE-10 — `src/components/notas/NotasEstudante.tsx` e `src/components/faltas/FaltasEstudante.tsx`: indicador de correção (somente leitura)

**Padrão atual confirmado:** ambos são read-only, pivotado para notas (linha ~187) e linear para faltas (linha ~542).

**Fazer:** mesmo indicador visual somente-leitura das tarefas anteriores. Aqui, por ser a visão do próprio estudante, considerar mostrar também `motivo_correcao` de forma mais visível (não só em tooltip) — é informação relevante para o estudante entender por que uma nota/falta mudou. Não expor `corrigido_por`/`registrado_por` (UUID de academia) diretamente ao estudante; usar só para uso interno se necessário.

### FE-11 — Filtro "Corrigido" nas telas que já têm filtros de listagem

**Verificar antes de implementar:** nenhuma das seis páginas de notas/faltas mapeadas hoje usa `consultasService.listarNotas`/`listarFaltas` com filtros via UI — todas navegam por drill-down (província → academia → turma → período) e montam a matriz a partir do que já foi carregado. Então `FE-02`/`FE-05` (o parâmetro `corrigido` no tipo e no query builder) ficam prontos para uso, mas **não há, hoje, uma tela de filtro de listagem plana onde encaixar um toggle "mostrar só corrigidos"** sem criar uma tela nova.

**Fazer:** confirmar se existe alguma outra página (fora do escopo de notas/faltas específico) que já implemente esse padrão de "lista plana com filtros" para outro módulo (ex. avaliações, aprovações) e que sirva de referência de estilo. Se existir, é razoável adicionar um filtro `corrigido` semelhante numa eventual tela plana de notas/faltas — mas isso é uma decisão de produto (criar uma nova tela de auditoria/lista plana), não uma correção de bug, então tratar como item de **prioridade baixa/opcional** nesta tarefa. Não bloquear as demais tarefas por causa deste item.

### FE-12 — (Opcional, baixa prioridade) Tela de auditoria de evento individual

**Contexto:** `GET /eventos/:event_id` e `GET /eventos-estudante/:codigo` já têm cobertura na camada de serviço (`eventSourcingService`, incluindo o `eventoAuditoria` novo de `FE-06`), mas **nenhuma página consome isso hoje** — não existe tela de "histórico de eventos" no frontend.

**Fazer (opcional):** se o produto quiser uma tela de auditoria (útil para suporte/admin investigar um caso específico), criar uma página simples que: (a) lista os eventos de um estudante via `eventosEstudante`, e (b) ao clicar num evento, ou ao ter o `event_id` em mãos, consulta o detalhe via `eventoAuditoria`. Como isso não foi pedido por nenhuma rodada de depuração do backend como bloqueador, tratar como melhoria futura, não como parte obrigatória desta tarefa — as tarefas `FE-01` a `FE-10` já cobrem o essencial de expor a funcionalidade de correção que o backend implementou.

---

## 4. Documentação e limpeza (baixa prioridade)

### FE-13 — Verificar `VISAO_ESCALA_AVALIACOES_NOTAS_FALTAS.md`

Este documento (raiz do repositório) não menciona correção de notas/faltas em nenhum ponto — foi escrito antes dessa funcionalidade existir no backend. Não é urgente, mas se o time mantém esse documento como referência de produto, vale adicionar uma seção curta descrevendo o fluxo de correção (evento compensatório, motivo obrigatório, quem pode corrigir) depois que `FE-07`/`FE-08` estiverem implementados, para não deixar a "visão" do produto desatualizada em relação ao que a UI passa a oferecer.

---

## 5. Ordem de execução recomendada

1. `FE-01`, `FE-02`, `FE-03` — tipos (sem isso nada mais compila).
2. `FE-04`, `FE-05`, `FE-06` — serviço.
3. `FE-07`, `FE-08` — ação de correção nas telas de academia (o caminho que realmente precisa da funcionalidade nova, já que é quem tem permissão para corrigir).
4. `FE-09`, `FE-10` — indicadores somente-leitura nas telas de admin e de estudante.
5. `FE-11`, `FE-12`, `FE-13` — opcionais/baixa prioridade, não bloqueiam o restante.

## 6. Checklist de validação

- [ ] `Nota`/`Falta` incluem os 5 campos novos, opcionais.
- [ ] `ListarNotasParams`/`ListarFaltasParams` aceitam `corrigido`.
- [ ] `academiaService.corrigirNota`/`corrigirFalta` chamam `PATCH` nos caminhos corretos e usam os tipos novos.
- [ ] Em `NotasAcademia.tsx` e `FaltasAcademia.tsx`, uma academia autenticada consegue corrigir uma nota/falta própria pela UI, com `motivo` obrigatório no formulário, e vê o erro correto quando a API retorna 400/403/404.
- [ ] Registros corrigidos mostram algum indicador visual (não precisa ser elaborado — um ícone com tooltip já resolve) nas seis telas de notas/faltas (academia, admin, estudante × notas/faltas).
- [ ] Depois de corrigir, a tela atualiza sem precisar de reload manual.
- [ ] `npm run build` / `next build` (ou o comando equivalente do projeto) sem erros de tipo — não executado neste ambiente de análise; rodar antes de considerar a tarefa concluída.
