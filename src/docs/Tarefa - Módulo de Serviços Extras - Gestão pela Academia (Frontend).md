# Módulo de Serviços Extras — Gestão pela Academia (Frontend)

## Prompt recomendado para executar esta tarefa

> Implemente exatamente o que está descrito neste documento (tipos, serviços de API, páginas, menu lateral), na ordem das seções. O backend já está pronto e testado — as rotas, payloads e respostas descritos aqui refletem o comportamento real e atual da API, não uma proposta. Não invente nem altere nomes de campo. Ao final, rode o build/lint do projeto e preencha os critérios de aceite.

## Contexto

O backend (`spuri-backend`) já implementa por completo o Módulo de Serviços Extras: academias cadastram serviços adicionais (transporte, atividades extracurriculares, etc.), configuram preço/gratuidade, taxa de inscrição, anos acadêmicos elegíveis e exigência de documento; estudantes solicitam inscrição; a academia aprova/reprova; se houver taxa, o estudante paga antes de ser vinculado; depois de vinculado, a academia pode cancelar a inscrição a qualquer momento. Esta tarefa cobre **o lado da academia** no painel: cadastrar/gerir os serviços e revisar as solicitações dos estudantes. O lado do estudante (catálogo, pedido de inscrição, pagamentos, cancelamento voluntário) é uma tarefa separada.

**Importante — a API já foi corrigida e está consistente.** Nas primeiras semanas de implementação, algumas respostas deste módulo devolviam os nomes de campo em PascalCase (ex. `"CodigoAcademia"`) por um bug de serialização, e o cadastro de serviços pagos estava quebrado por falta de tags JSON no binding do payload. Ambos os bugs já foram corrigidos e aplicados no backend. Os tipos e exemplos deste documento já refletem o formato **corrigido** (snake_case em tudo). Se algo que você observar na API divergir do que está aqui, o backend é que está desatualizado — pare e avise, não adapte o frontend para compensar.

## Resumo executivo

1. Tipos TypeScript novos em `src/types/api.ts`.
2. Funções de API novas em `src/lib/api/services.ts`, no objeto de serviço da academia já existente.
3. Página `/gerenciamento/servicos-extras`: listar, criar, editar, ativar/desativar serviços.
4. Página `/gerenciamento/servicos-extras-solicitacoes` (ou subseção da mesma página — ver seção 4): listar solicitações, aprovar/reprovar, ver documento anexado, cancelar inscrição vinculada, anular/reativar cobranças mensais.
5. Dois itens novos em `AppSidebar.tsx`, visíveis apenas para `user.tipo === "academia"`.

## 1. Tipos TypeScript (`src/types/api.ts`)

Adicione, próximo aos tipos de `Curso`/`Materia` (mesma seção do arquivo):

```typescript
export type TipoCobrancaServico = 'unico' | 'mensal';
export type MetodoPagamentoServico = 'GPO' | 'REF' | 'GPO_QR';

export interface ServicoExtra {
  id: string;
  codigo_academia: string;
  nome: string;
  descricao?: string;
  categoria?: string;
  pago: boolean;
  preco: number | null;               // null quando pago=false
  tipo_cobranca: TipoCobrancaServico | null; // null quando pago=false
  metodos_pagamento: MetodoPagamentoServico[];
  tem_taxa_inscricao: boolean;
  valor_taxa_inscricao: number | null;       // null quando tem_taxa_inscricao=false
  metodos_pagamento_taxa_inscricao: MetodoPagamentoServico[];
  anos_academicos_disponiveis: string[];     // vazio = disponível para todos os anos
  documento_obrigatorio: boolean;
  documento_instrucoes?: string;
  detalhes_personalizados: Record<string, unknown>;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// Payload de criação/edição. Ao editar, envie só os campos que quer alterar —
// o backend faz merge parcial (PUT funciona como PATCH aqui). Nunca envie
// preco/tipo_cobranca/metodos_pagamento se pago=false, nem
// valor_taxa_inscricao/metodos_pagamento_taxa_inscricao se
// tem_taxa_inscricao=false — o backend rejeita a combinação.
export interface ServicoExtraPayload {
  nome?: string;
  descricao?: string;
  categoria?: string;
  pago?: boolean;
  preco?: number;
  tipo_cobranca?: TipoCobrancaServico;
  metodos_pagamento?: MetodoPagamentoServico[];
  tem_taxa_inscricao?: boolean;
  valor_taxa_inscricao?: number;
  metodos_pagamento_taxa_inscricao?: MetodoPagamentoServico[];
  anos_academicos_disponiveis?: string[];
  documento_obrigatorio?: boolean;
  documento_instrucoes?: string;
  detalhes_personalizados?: Record<string, unknown>;
}

export type StatusSolicitacaoServicoExtra =
  | 'pendente'
  | 'aprovada_pendente_pagamento_taxa_inscricao'
  | 'vinculada'
  | 'reprovada'
  | 'cancelada_antes_da_vinculacao'
  | 'cancelada';

export interface SolicitacaoServicoExtra {
  id: string;
  servico_extra_id: string;
  codigo_academia: string;
  codigo_estudante: string;
  status: StatusSolicitacaoServicoExtra;
  motivo_reprovacao?: string;
  motivo_cancelamento?: string;
  cancelada_por?: 'academia' | 'estudante';
  documento_path?: string;
  documento_url?: string;
  valor_taxa_inscricao: number;
  metodos_pagamento_taxa_inscricao: MetodoPagamentoServico[];
  aprovada_por?: string;
  reprovada_por?: string;
  vinculada_em?: string;
  created_at: string;
  updated_at: string;
}

export type TipoLancamentoServicoExtra = 'mensalidade' | 'preco_unico';
export type EstadoLancamentoServicoExtra = 'pendente' | 'anulada' | 'pago';

export interface PendenciaServicoExtra {
  tipo_lancamento: TipoLancamentoServicoExtra;
  ano?: number;
  mes?: number;
  estado: EstadoLancamentoServicoExtra;
  valor: number;
}
```

## 2. Serviços de API (`src/lib/api/services.ts`)

Adicione estas funções ao objeto de serviço da academia já existente (o mesmo que já tem `criarCurso`, `listarCursos` etc. — localize-o pelo `grep -n "criarCurso" src/lib/api/services.ts` e adicione ao lado):

```typescript
// --- Serviços Extras (catálogo, gestão pela academia) ---
criarServicoExtra: (data: ServicoExtraPayload, token?: string) =>
  api.post<{ message: string; data: ServicoExtra }, ServicoExtraPayload>('/academia/servicos-extras', data, { token }),

atualizarServicoExtra: (id: string, data: ServicoExtraPayload, token?: string) =>
  api.put<{ message: string; data: ServicoExtra }, ServicoExtraPayload>(`/academia/servicos-extras/${id}`, data, { token }),

desativarServicoExtra: (id: string, token?: string) =>
  api.put<{ data: ServicoExtra }>(`/academia/servicos-extras/${id}/desativar`, undefined, { token }),

reativarServicoExtra: (id: string, token?: string) =>
  api.put<{ data: ServicoExtra }>(`/academia/servicos-extras/${id}/reativar`, undefined, { token }),

listarServicosExtras: (token?: string) =>
  api.get<{ servicos_extras: ServicoExtra[]; total: number }>('/academia/servicos-extras', { token }),

getServicoExtra: (id: string, token?: string) =>
  api.get<{ data: ServicoExtra }>(`/academia/servicos-extras/${id}`, { token }),

// --- Solicitações (revisão pela academia) ---
listarSolicitacoesServicoExtra: (status?: string, token?: string) =>
  api.get<{ solicitacoes: Array<{ id: string; servico_extra_id: string; codigo_estudante: string; status: StatusSolicitacaoServicoExtra; motivo_reprovacao?: string; motivo_cancelamento?: string; created_at: string; updated_at: string }>; total: number }>(
    `/academia/servicos-extras/solicitacoes${status ? `?status=${status}` : ''}`,
    { token },
  ),

getSolicitacaoServicoExtra: (id: string, token?: string) =>
  api.get<{ data: SolicitacaoServicoExtra }>(`/academia/servicos-extras/solicitacoes/${id}`, { token }),

aprovarSolicitacaoServicoExtra: (id: string, token?: string) =>
  api.put<{ data: SolicitacaoServicoExtra }>(`/academia/servicos-extras/solicitacoes/${id}/aprovar`, undefined, { token }),

reprovarSolicitacaoServicoExtra: (id: string, motivo_reprovacao: string, token?: string) =>
  api.put<{ data: SolicitacaoServicoExtra }, { motivo_reprovacao: string }>(
    `/academia/servicos-extras/solicitacoes/${id}/reprovar`,
    { motivo_reprovacao },
    { token },
  ),

cancelarInscricaoServicoExtraAcademia: (id: string, motivo: string | undefined, token?: string) =>
  api.put<{ message: string; status: string }, { motivo?: string }>(
    `/academia/servicos-extras/inscricoes/${id}/cancelar`,
    { motivo },
    { token },
  ),

pendenciasServicoExtraAcademia: (id: string, token?: string) =>
  api.get<{ pendencias: PendenciaServicoExtra[] }>(`/academia/servicos-extras/inscricoes/${id}/pendencias`, { token }),

downloadDocumentoSolicitacaoServicoExtraAcademia: (id: string, token?: string) =>
  `${process.env.NEXT_PUBLIC_API_URL}/academia/servicos-extras/solicitacoes/${id}/documento/download`,
```

Confirme o padrão exato usado para downloads de documento já existentes neste arquivo (ex. o download de documentos de `solicitacao_edicao_dado_estudante`) — pode ser que o backend devolva o arquivo diretamente (nesse caso a função acima, usada como `href` de um link/botão que abre nova aba com o token como query param ou header via fetch+blob, é o padrão certo) ou uma URL assinada em JSON (nesse caso ajuste para uma função `async` que faz `api.get` e usa a URL da resposta). Copie o mecanismo exato já usado, não invente um novo.

Adicione também ao **`financeiroService`** (mesmo objeto que já tem `anularObrigacoesMensalidade`/`reativarObrigacoesMensalidade` — releia `AnularReativarObrigacoesForm.tsx` para confirmar a assinatura exata dessas duas antes de escrever as novas, e siga o mesmo padrão de nomes de parâmetro):

```typescript
anularObrigacaoServicoExtra: (
  data: { solicitacao_id: string; tipo_lancamento: TipoLancamentoServicoExtra; ano?: number; mes?: number; motivo?: string },
  token?: string,
) => api.post<{ message: string }>('/financeiro/servicos-extras/obrigacao/anular', data, { token }),

reativarObrigacaoServicoExtra: (
  data: { solicitacao_id: string; tipo_lancamento: TipoLancamentoServicoExtra; ano?: number; mes?: number; motivo?: string },
  token?: string,
) => api.post<{ message: string }>('/financeiro/servicos-extras/obrigacao/reativar', data, { token }),
```

## 3. Página de catálogo — `/gerenciamento/servicos-extras`

### 3.1 Arquivos
- `src/app/(painel)/gerenciamento/servicos-extras/page.tsx` — wrapper fino, mesmo padrão de `src/app/(painel)/gerenciamento/cursos/page.tsx` (importa e renderiza o componente principal, nada de lógica aqui).
- `src/components/paineis/ServicosExtrasPainel.tsx` — componente principal.

### 3.2 Comportamento
Mirror do padrão geral de `CursosPainel.tsx` (lista + modal de criar/editar), mas **sem** as funcionalidades de lote/batch de `CursosPainel.tsx` — não fazem parte deste pedido, não implemente.

- **Listagem**: tabela com colunas Nome, Categoria, Pago (Sim/Não + preço se sim), Taxa de Inscrição (Sim/Não + valor se sim), Anos Acadêmicos (badge "Todos" se lista vazia, senão lista os anos), Status (Ativo/Inativo), Ações. Use `useApi(academiaService.listarServicosExtras)` e chame `.execute()` no `useEffect` de montagem.
- **Botão "Novo Serviço"** abre um modal de criação (mesmo componente `Modal` de `@/components/ui/modal` já usado em outras telas do painel — confirme o import exato usado em `CursosPainel.tsx`).
- **Formulário de criar/editar** (mesmo modal, reutilizado para os dois casos):
  - `Input` (nome, descrição, categoria).
  - `Checkbox` "Serviço pago" → ao marcar, revela: `Input type="number"` (preço), `SearchableSelect` ou botões de rádio (tipo de cobrança: Único / Mensal), `MultiSelect` (métodos de pagamento: GPO, REF, GPO_QR — mesmo componente e mesma lista de opções já usada em `AnularReativarObrigacoesForm.tsx`/telas de configuração financeira).
  - `Checkbox` "Tem taxa de inscrição" → ao marcar, revela: `Input type="number"` (valor da taxa), `MultiSelect` (métodos de pagamento da taxa — pode ser um segundo `MultiSelect` independente do de cima; não precisam ter os mesmos métodos selecionados).
  - `MultiSelect` ou `Input` de tags (anos acadêmicos disponíveis) — campo livre, aceite qualquer string no formato `N_ano_fundamental`/`N_ano_medio`/`N_ano_superior`; **não valide o formato no frontend**, deixe o backend validar e mostre o erro que ele devolver. Vazio = "todos os anos" (mostre um texto de ajuda dizendo isso).
  - `Checkbox` "Exige documento anexado na inscrição" → ao marcar, revela `TextArea`/`Input` (instruções do documento).
  - **Não inclua um campo de UI para `detalhes_personalizados`** nesta primeira versão — é um JSON livre sem estrutura definida; se quiser, adicione como um `TextArea` opcional rotulado "Detalhes adicionais (JSON)" que faz `JSON.parse` antes de enviar e mostra erro de validação se o JSON for inválido, mas isto é opcional, não bloqueie a entrega por causa dele.
  - Ao salvar: se está criando, chame `academiaService.criarServicoExtra`; se editando, chame `academiaService.atualizarServicoExtra`, enviando **apenas os campos alterados** (compare com o estado original antes de montar o payload — não reenvie tudo).
  - Trate o erro específico de credenciais ("não é possível criar um serviço pago ou com taxa de inscrição sem credenciais AppyPay configuradas para a academia") destacando-o num `Alert` com um link para `/financas/credenciais`.
- **Ativar/Desativar**: botão de toggle na linha da tabela, chama `desativarServicoExtra`/`reativarServicoExtra` conforme o status atual, com confirmação (`window.confirm` ou o componente de confirmação já usado em outras telas do painel — confirme qual é).

## 4. Página de solicitações — revisão pela academia

### 4.1 Arquivos
- `src/app/(painel)/gerenciamento/servicos-extras-solicitacoes/page.tsx` — wrapper.
- `src/components/paineis/ServicosExtrasSolicitacoesPainel.tsx` — componente principal.

### 4.2 Comportamento
Mirror do padrão de cartões de `src/app/(painel)/solicitacoes-matricula/PageContent.tsx` (releia antes de escrever esta tela) — um card por solicitação, não uma tabela densa, já que cada card tem ações contextuais diferentes conforme o status.

- Filtro por status no topo (`SearchableSelect` ou abas: Pendentes / Aguardando Pagamento / Vinculadas / Reprovadas / Canceladas — todas puxando de `listarSolicitacoesServicoExtra(status)` com o valor correspondente, ou sem filtro para "Todas").
- Cada card mostra: nome do serviço (busque em paralelo a lista de serviços já carregada e cruze por `servico_extra_id` — não faça uma chamada de API por card), código do estudante, status (badge colorido), datas.
- **Status `pendente`**: botões "Aprovar" e "Reprovar". Reprovar abre um campo de texto inline para o motivo (obrigatório) antes de confirmar — mesmo padrão do card de matrícula referenciado acima.
- **Status `aprovada_pendente_pagamento_taxa_inscricao`**: mostra o valor da taxa pendente; botão "Cancelar solicitação" (chama `cancelarInscricaoServicoExtraAcademia`, que internamente decide entre os dois estados possíveis de cancelamento — você não precisa diferenciar isso no frontend, é o mesmo endpoint para ambos os casos, ver seção 2).
- **Status `vinculada`**: botão "Cancelar inscrição" (mesmo endpoint acima); se o serviço for `tipo_cobranca=mensal` ou `unico`, um botão "Ver pendências" que expande a lista vinda de `pendenciasServicoExtraAcademia`, cada item com estado (Pendente/Anulada/Paga) e, se pendente ou paga, um botão "Anular" (se pendente) ou "Reativar" (se anulada) chamando as duas novas funções de `financeiroService` da seção 2 — **mirror direto do formulário `AnularReativarObrigacoesForm.tsx`**, adaptando os campos: aqui você já sabe `solicitacao_id` e `tipo_lancamento`/`ano`/`mes` a partir do item da lista, não precisa de um formulário de busca separado como aquele componente tem para mensalidade regular.
- Se `documento_path` não estiver vazio, mostra um link/botão "Ver documento anexado" usando `downloadDocumentoSolicitacaoServicoExtraAcademia`.
- **Status `reprovada`/`cancelada`/`cancelada_antes_da_vinculacao`**: somente leitura, mostra o motivo registrado.

## 5. Menu lateral (`src/layout/AppSidebar.tsx`)

Releia a lógica de filtro por `user.tipo` já existente (`grep -n "user.tipo ===" src/layout/AppSidebar.tsx`) antes de editar. Adicione dois itens dentro do submenu **"Gerenciamento"** (mesmo grupo de Cursos/Matérias/Turmas, visível só para `user.tipo === "academia"`):

```typescript
{ name: "Serviços Extras", path: "/gerenciamento/servicos-extras" },
{ name: "Solicitações de Serviços Extras", path: "/gerenciamento/servicos-extras-solicitacoes" },
```

## Fora de escopo (não implementar nesta tarefa)

- Qualquer tela do lado do estudante (catálogo, solicitar inscrição, pagar, cancelar a própria inscrição) — é a tarefa "Catálogo e Inscrição do Estudante (Frontend)", separada.
- Upload de documento pela academia — quem anexa documento é o estudante, no momento da solicitação; a academia só visualiza/baixa.
- Edição de `detalhes_personalizados` com UI estruturada (campo-a-campo) — só o campo JSON livre opcional mencionado na seção 3.2, se você optar por incluí-lo.
- Qualquer relatório, gráfico ou exportação agregada de dados de serviços extras.
- Reprecificação em lote ou qualquer operação em massa sobre múltiplos serviços/solicitações ao mesmo tempo.

## Critérios de aceite

- [ ] Tipos adicionados a `src/types/api.ts` exatamente como especificado.
- [ ] Todas as funções da seção 2 adicionadas aos serviços corretos.
- [ ] `/gerenciamento/servicos-extras`: lista, cria, edita (com merge parcial), ativa/desativa; erro de credenciais tratado com destaque.
- [ ] Formulário de criação nunca envia `preco`/`tipo_cobranca`/`metodos_pagamento` quando "pago" está desmarcado, nem os equivalentes de taxa quando "tem taxa de inscrição" está desmarcado.
- [ ] `/gerenciamento/servicos-extras-solicitacoes`: lista com filtro por status; aprovar; reprovar com motivo obrigatório; cancelar (nos dois estados possíveis, via um único botão); ver pendências e anular/reativar lançamentos; baixar documento anexado quando existir.
- [ ] Dois itens novos no menu lateral, visíveis apenas para `user.tipo === "academia"`.
- [ ] Build/lint do projeto sem erros novos.

## Procedimento de conclusão

Ao terminar, rode o build (`npm run build` ou equivalente já usado no projeto) e o lint, corrija qualquer erro, teste manualmente o fluxo completo (criar serviço pago → aparece na lista → estudante solicitaria pela outra tarefa, mas você pode simular criando uma solicitação diretamente via API/Postman para testar a tela de revisão → aprovar → ver pendência → anular → reativar), e relate o resultado: o que funcionou, o que não pôde ser testado (ex. se não havia uma solicitação real disponível) e por quê.
