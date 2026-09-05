# Módulo de Serviços Extras — Catálogo e Inscrição do Estudante (Frontend)

## Prompt recomendado para executar esta tarefa

> Implemente exatamente o que está descrito neste documento (tipos, serviços de API, páginas, menu lateral), na ordem das seções. O backend já está pronto e testado — as rotas, payloads e respostas descritos aqui refletem o comportamento real e atual da API. Não invente nem altere nomes de campo. Ao final, rode o build/lint do projeto e preencha os critérios de aceite.

## Contexto

Esta é a segunda de duas tarefas de frontend do Módulo de Serviços Extras. A primeira ("Gestão pela Academia") cobre o cadastro dos serviços e a revisão das solicitações; esta cobre **o lado do estudante**: ver o catálogo de serviços disponíveis, solicitar inscrição (com documento anexado quando o serviço exigir), acompanhar o status, pagar a taxa de inscrição quando houver, pagar mensalidades/preço único do serviço depois de vinculado, e cancelar a própria inscrição.

Se a tarefa "Gestão pela Academia" já foi executada, os tipos TypeScript da seção 1 já existem em `src/types/api.ts` — não duplique, apenas confirme que estão lá e prossiga. Se esta tarefa está sendo executada primeiro, adicione os tipos você mesmo (estão reproduzidos aqui de novo por completude).

**A API já está com o formato corrigido** (bugs de serialização/binding do início da implementação já foram resolvidos) — os exemplos deste documento refletem o comportamento real e atual.

## Resumo executivo

1. Tipos TypeScript em `src/types/api.ts` (mesmos da outra tarefa — reaproveitar se já existirem).
2. Funções de API em `src/lib/api/services.ts`.
3. Página `/servicos-extras`: catálogo de serviços disponíveis para a academia atual do estudante + solicitar inscrição.
4. Página `/servicos-extras/minhas-inscricoes`: status das solicitações, pagamento de taxa/mensalidade/preço único, cancelamento.
5. Item novo no menu lateral, visível apenas para `user.tipo === "estudante"`.

## 1. Tipos TypeScript (`src/types/api.ts`)

Mesmos tipos definidos na tarefa "Gestão pela Academia" (`ServicoExtra`, `SolicitacaoServicoExtra`, `StatusSolicitacaoServicoExtra`, `TipoLancamentoServicoExtra`, `EstadoLancamentoServicoExtra`, `PendenciaServicoExtra`, `TipoCobrancaServico`, `MetodoPagamentoServico`) — copie-os de lá se ainda não existirem no arquivo. Adicione também:

```typescript
export interface SolicitarServicoExtraRequest {
  documento?: File; // opcional, exceto quando ServicoExtra.documento_obrigatorio === true
}

export interface IniciarPagamentoTaxaInscricaoRequest {
  solicitacao_id: string;
  metodo_pagamento: MetodoPagamentoServico;
  telefone?: string; // obrigatório para GPO/GPO_QR conforme já é a convenção nas outras cobranças AppyPay do painel
}

export interface IniciarPagamentoObrigacaoRequest {
  solicitacao_id: string;
  tipo_lancamento: TipoLancamentoServicoExtra;
  ano?: number; // obrigatório quando tipo_lancamento === 'mensalidade'
  mes?: number; // obrigatório quando tipo_lancamento === 'mensalidade'
  metodo_pagamento: MetodoPagamentoServico;
  telefone?: string;
}

// Resposta de qualquer início de pagamento — mesmo formato QRCodeResult já
// usado pelos pagamentos de mensalidade/matrícula existentes no painel
// (releia o tipo já usado por financeiroService.iniciarPagamentoMensalidades
// para confirmar os campos exatos de "cobranca" — normalmente inclui status,
// qr_code/imagem, referência, valor). Reaproveite esse tipo já existente em
// vez de criar um novo — a estrutura de resposta é idêntica.
```

## 2. Serviços de API (`src/lib/api/services.ts`)

Adicione ao serviço do estudante já existente (o que já tem `atualizarTelefoneEncarregado`/`listarMinhasSolicitacoesEdicao` — mesmo objeto):

```typescript
// --- Catálogo (leitura pública, requer apenas saber a academia atual) ---
listarServicosExtrasDisponiveis: (codigoAcademia: string, token?: string) =>
  api.get<{ servicos_extras: ServicoExtra[]; total: number }>(
    `/academia/servico/${codigoAcademia}/servicos-extras`,
    { token: token || tokenStorage.get() || undefined },
  ),

// --- Solicitação de inscrição ---
solicitarServicoExtra: (servicoId: string, data: SolicitarServicoExtraRequest, token?: string) => {
  const form = new FormData();
  if (data.documento) form.append('documento', data.documento);
  return api.postForm<{ data: SolicitacaoServicoExtra }>(
    `/estudante/servicos-extras/${servicoId}/solicitacao`,
    form,
    { token: token || tokenStorage.get() || undefined },
  );
},

listarMinhasInscricoesServicoExtra: (status?: string, token?: string) =>
  api.get<{ inscricoes: SolicitacaoServicoExtra[]; total: number }>(
    `/estudante/servicos-extras/minhas-inscricoes${status ? `?status=${status}` : ''}`,
    { token: token || tokenStorage.get() || undefined },
  ),

cancelarMinhaInscricaoServicoExtra: (id: string, motivo: string | undefined, token?: string) =>
  api.put<{ message: string; status: string }, { motivo?: string }>(
    `/estudante/servicos-extras/minhas-inscricoes/${id}/cancelar`,
    { motivo },
    { token: token || tokenStorage.get() || undefined },
  ),

minhasPendenciasServicoExtra: (id: string, token?: string) =>
  api.get<{ pendencias: PendenciaServicoExtra[] }>(
    `/estudante/servicos-extras/minhas-inscricoes/${id}/pendencias`,
    { token: token || tokenStorage.get() || undefined },
  ),

downloadMeuDocumentoServicoExtra: (id: string, token?: string) =>
  `${process.env.NEXT_PUBLIC_API_URL}/estudante/servicos-extras/minhas-inscricoes/${id}/documento/download`,
```

**Atenção ao prefixo das rotas:** todas as rotas do estudante deste módulo vivem sob o grupo `/estudante` (`router.Group("/estudante")` em `cmd/server/main.go`), então o path completo é sempre `/estudante/servicos-extras/...` — confirme isto em `cmd/server/main.go` do backend antes de codar. Não confunda com as rotas de catálogo (`/academia/servico/:codigo_academia/servicos-extras`, pública) ou de pagamento (`/financeiro/servicos-extras/...`, fora do grupo `/estudante`), que têm prefixos diferentes.

Adicione ao `financeiroService` (mesmo objeto de `iniciarPagamentoMensalidades`):

```typescript
iniciarPagamentoTaxaInscricaoServicoExtra: (data: IniciarPagamentoTaxaInscricaoRequest, token?: string) =>
  api.post<{ cobranca: QRCodeResult }, IniciarPagamentoTaxaInscricaoRequest>(
    '/financeiro/servicos-extras/taxa-inscricao/pagamento',
    data,
    { token },
  ),

iniciarPagamentoObrigacaoServicoExtra: (data: IniciarPagamentoObrigacaoRequest, token?: string) =>
  api.post<{ cobranca: QRCodeResult }, IniciarPagamentoObrigacaoRequest>(
    '/financeiro/servicos-extras/obrigacao/pagamento',
    data,
    { token },
  ),
```

Confirme o nome exato do tipo `QRCodeResult` (ou equivalente) já usado por `iniciarPagamentoMensalidades` em `src/types/api.ts` e reaproveite-o nas duas funções acima em vez de definir um tipo de resposta novo.

## 3. Página de catálogo — `/servicos-extras`

### 3.1 Arquivos
- `src/app/(painel)/servicos-extras/page.tsx` — wrapper fino.
- `src/components/paineis/ServicosExtrasCatalogoPainel.tsx` — componente principal.

### 3.2 Comportamento

- Ao montar, obtenha a academia atual do estudante (mesmo mecanismo já usado por `EstudantePagamentosPainel.tsx` para saber a academia do usuário logado — releia como esse componente resolve isso, provavelmente via contexto de autenticação/`useAuth`) e chame `listarServicosExtrasDisponiveis(codigoAcademia)`.
- Mostre cada serviço como um cartão: nome, categoria, descrição, indicação clara de "Gratuito" ou preço + periodicidade ("5.000 Kz/mês", "5.000 Kz (pagamento único)"), indicação de taxa de inscrição se houver ("Taxa de inscrição: 2.000 Kz"), e os anos acadêmicos elegíveis (ou "Disponível para todos os anos" se a lista vier vazia).
- **Não mostre** serviços para os quais o estudante já tem uma solicitação ativa (pendente, aguardando pagamento ou vinculada) para aquele mesmo serviço — em vez disso, mostre um badge de status no lugar do botão de solicitar (ex. "Pendente de aprovação", "Aguardando seu pagamento", "Já inscrito"). Para saber isso, cruze a lista do catálogo com `listarMinhasInscricoesServicoExtra()` (chame as duas em paralelo ao montar a página) por `servico_extra_id`.
- Botão "Solicitar inscrição" abre um modal:
  - Se `documento_obrigatorio === true`, mostra as `documento_instrucoes` do serviço (se houver) e um campo de upload de arquivo **obrigatório**, aceitando apenas PDF (`accept="application/pdf"`, e valide a extensão/tipo no frontend antes de habilitar o botão de enviar — mas a validação definitiva é do backend).
  - Se `documento_obrigatorio === false`, mostra o mesmo campo de upload, mas **opcional**, com texto indicando isso.
  - Ao confirmar, chama `solicitarServicoExtra`. Trate especificamente o erro `409` ("já existe solicitação ativa para este serviço") mostrando uma mensagem amigável e fechando o modal (a lista deveria já impedir isso normalmente, mas trate a corrida mesmo assim).
  - Depois de solicitar com sucesso, atualize a lista de "minhas inscrições" e mostre um `Alert` de sucesso explicando o próximo passo: "sua solicitação foi enviada e está aguardando aprovação da academia".

## 4. Página de acompanhamento — `/servicos-extras/minhas-inscricoes`

### 4.1 Arquivos
- `src/app/(painel)/servicos-extras/minhas-inscricoes/page.tsx` — wrapper.
- `src/components/paineis/MinhasInscricoesServicoExtraPainel.tsx` — componente principal.

### 4.2 Comportamento

Um cartão por inscrição, buscando os dados do serviço correspondente (cruzar `listarServicosExtrasDisponiveis`/cache local por `servico_extra_id` para mostrar o nome — não é preciso uma chamada por cartão). Conteúdo e ações variam por `status`:

- **`pendente`**: "Aguardando aprovação da academia." Sem ações além de, opcionalmente, ver o documento enviado (`downloadMeuDocumentoServicoExtra`, se `documento_path` não vazio).
- **`aprovada_pendente_pagamento_taxa_inscricao`**: mostra o valor da taxa (`valor_taxa_inscricao`) e os métodos habilitados (`metodos_pagamento_taxa_inscricao`); formulário de pagamento (seletor de método dentre os habilitados + campo de telefone quando o método exigir — mesmo padrão de UI já usado no pagamento de mensalidade em `EstudantePagamentosPainel.tsx`, **releia esse componente e reproduza o mesmo fluxo de exibição de QR code/status de cobrança**, não invente um novo). Chama `iniciarPagamentoTaxaInscricaoServicoExtra`. Também oferece um botão "Cancelar solicitação" (chama `cancelarMinhaInscricaoServicoExtra`).
- **`vinculada`**: "Inscrição ativa." Se o serviço for `tipo_cobranca=mensal` ou `unico`, busca `minhasPendenciasServicoExtra(id)` e lista cada lançamento com estado; para os `pendente`, mostra o mesmo formulário de pagamento da etapa anterior mas chamando `iniciarPagamentoObrigacaoServicoExtra` com `tipo_lancamento`/`ano`/`mes` do item da lista. Botão "Cancelar minha inscrição" (mesma função de cancelamento acima — o backend decide sozinho qual transição de estado aplicar).
- **`reprovada`**: mostra `motivo_reprovacao`. Sem ações — o estudante pode voltar ao catálogo e solicitar de novo se quiser (o backend permite nova solicitação depois de uma reprovação).
- **`cancelada_antes_da_vinculacao`** / **`cancelada`**: somente leitura, mostra `motivo_cancelamento` e quem cancelou (`cancelada_por`).

## 5. Menu lateral (`src/layout/AppSidebar.tsx`)

Adicione, como item de topo visível apenas para `user.tipo === "estudante"` (mesmo nível de `{ name: "Pagamentos", path: "/pagamentos" }`, não dentro de um submenu):

```typescript
{
  name: "Serviços Extras",
  subItems: [
    { name: "Catálogo", path: "/servicos-extras" },
    { name: "Minhas Inscrições", path: "/servicos-extras/minhas-inscricoes" },
  ],
},
```

Confirme a forma exata de declarar um item com submenu olhando a entrada "Finanças" já existente (ela usa a mesma estrutura de `subItems`).

## Fora de escopo (não implementar nesta tarefa)

- Qualquer tela do lado da academia (cadastro de serviços, aprovação/reprovação, anular/reativar obrigações) — é a outra tarefa.
- Qualquer forma de o estudante solicitar um serviço de uma academia diferente da sua atual — o catálogo mostra só os serviços da academia à qual o estudante está vinculado no momento.
- Notificações push/e-mail sobre mudança de status da solicitação — não existe esse mecanismo no backend hoje.
- Edição da solicitação depois de enviada (trocar o documento anexado, por exemplo) — não existe endpoint para isso; se o estudante errar, a única saída é cancelar (quando aplicável) e solicitar de novo.

## Critérios de aceite

- [ ] Tipos adicionados/confirmados em `src/types/api.ts`.
- [ ] Todas as funções da seção 2 adicionadas aos serviços corretos, com a rota exata confirmada em `cmd/server/main.go`.
- [ ] `/servicos-extras`: catálogo filtra pela academia atual do estudante, esconde/marca serviços com solicitação já ativa, upload de documento obrigatório respeitado conforme `documento_obrigatorio`.
- [ ] `/servicos-extras/minhas-inscricoes`: todos os 6 estados tratados com a ação correta (ou ausência de ação) descrita na seção 4.2.
- [ ] Fluxo de pagamento (taxa de inscrição e obrigação mensal/único) reaproveita o mesmo componente/padrão visual já usado em `EstudantePagamentosPainel.tsx`, não um novo do zero.
- [ ] Item novo no menu lateral, visível apenas para `user.tipo === "estudante"`.
- [ ] Build/lint do projeto sem erros novos.

## Procedimento de conclusão

Ao terminar, rode o build e o lint, corrija qualquer erro, teste manualmente o fluxo completo do ponto de vista do estudante (ver catálogo → solicitar com e sem documento → acompanhar em "minhas inscrições" → pagar taxa quando houver → ver pendência mensal → cancelar), e relate o resultado: o que funcionou, o que não pôde ser testado e por quê.
