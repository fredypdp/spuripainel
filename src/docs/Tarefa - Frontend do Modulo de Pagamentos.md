---
criado: 2026-08-16
atualizado: 2026-08-17 — backend corrigiu os dois gaps registrados em "Problemas de Backend - Modulo de Pagamentos.md" (endpoint de listagem de cobranças e QR Code nos fluxos de pagamento); seções 2.1, 2.3, 4, Partes A/B/F/H/I e checklist revisadas para refletir a API atual
origem: Orquestração Claude (leitura direta de spuri-backend e spuripainel em main)
repositório alvo desta tarefa: spuripainel (frontend)
repositório de referência (somente leitura): spuri-backend
status: pendente
---

# Frontend do módulo de pagamentos (Finanças) — spuripainel

## 0. Prompt recomendado para executar esta tarefa

Implemente no repositório **spuripainel** todo o suporte de frontend ao módulo de pagamentos já existente no backend **spuri-backend** (contexto `financeiro`: credenciais AppyPay, listagem/consulta de cobranças, configuração e cobrança de mensalidade/propina, configuração e cobrança de taxa de matrícula, sessão financeira restrita de estudante inativo). Este documento já contém o levantamento completo do backend e do frontend atuais — **não é necessário planejar nada, apenas seguir as partes A a I na ordem**, criando/editando exatamente os arquivos indicados, com os tipos, contratos de API, regras de permissão e comportamento de UI descritos. Onde este documento mostra um exemplo de código, ele é ilustrativo do contrato (nomes de campos, formato) — a implementação final deve seguir os padrões de UI, componentes e organização de arquivos já usados no restante do projeto (referenciados na seção 3), especialmente o painel `src/components/paineis/FinanceiroCredenciaisPainel.tsx`, que é o único pedaço do módulo de pagamentos já implementado no frontend hoje e deve servir de modelo de estilo, tratamento de erro e permissão. Preste atenção especial à seção 2 (avisos críticos): **duas** limitações que existiam numa versão anterior deste documento (falta de endpoint de listagem geral de cobranças, e QR Code não retornado nos fluxos de pagamento de propina/matrícula) **já foram corrigidas no backend** e a seção 2 e as partes afetadas foram reescritas para usar a API corrigida — não implemente mais nenhum dos contornos que uma versão anterior deste documento pudesse sugerir para esses dois pontos. Continua valendo, sem alteração, a restrição de leitura financeira exclusiva a admins com papel `fpp` (aviso 2.2) — essa não foi alterada no backend. Ao final, atualize `AppSidebar.tsx`, `route-guards.ts` e qualquer outro ponto de navegação afetado, e garanta que build e lint do projeto passam. Não crie mocks, dados falsos, endpoints inexistentes ou funcionalidades "fallback" que simulem dados que a API não retorna.

---

## 1. Leitura obrigatória antes de codificar

### Backend (`spuri-backend`, branch `main`) — apenas para entender o contrato, não editar

- `internal/handlers/financeiro_handlers.go` — credenciais AppyPay, cobrança genérica, QR Code.
- `internal/handlers/mensalidade_handlers.go` — configuração de mensalidade, início de cobrança excecional, anular/reativar obrigações, consulta de mensalidades do estudante, pagamento de mensalidades.
- `internal/handlers/solicitacao_matricula_handlers.go` — busca pública de solicitações, status público, pagamento público da matrícula, cancelamento pela academia, configuração de matrícula.
- `internal/finance/appypay.go`, `internal/finance/mensalidade.go`, `internal/finance/matricula.go` — regras de negócio e formatos de retorno exatos.
- `internal/middleware/auth.go` — mecanismo de **sessão financeira restrita** (`acesso_restrito_financeiro`), essencial para a Parte C/I.
- `internal/domain/aggregates/solicitacao_matricula.go` — status possíveis da solicitação de matrícula, incluindo os relacionados a pagamento.
- `Documentação da API.md`, seção **"Financeiro / AppyPay"** (perto do fim do arquivo) — cobre a maior parte dos endpoints. **Atenção:** a seção "9. Solicitação de Matrícula" e o DTO de `SolicitacaoMatricula` (seção 2.5) desse mesmo documento **estão desatualizados** e não refletem os campos/rotas de pagamento de matrícula — use os campos e rotas descritos na seção 4 deste documento (extraídos diretamente do código-fonte) como fonte de verdade nesses pontos específicos.

### Frontend (`spuripainel`, branch `main`) — padrões a seguir, arquivos a editar

- `src/components/paineis/FinanceiroCredenciaisPainel.tsx` — **modelo de referência obrigatório** para todo o módulo: como chamar `financeiroService`, como tratar erro de API, como restringir ações por papel de admin, como exibir texto explicativo/didático.
- `src/app/(painel)/financas/layout.tsx` e `src/app/(painel)/financas/credenciais/page.tsx` — padrão de layout de seção "Finanças".
- `src/lib/api/services.ts`, `src/lib/api/client.ts`, `src/lib/api/index.ts` — camada de serviços e cliente HTTP.
- `src/types/api.ts` — tipos TypeScript de toda a API.
- `src/lib/route-guards.ts` e `src/components/guards/RouteGuard.tsx` — sistema de permissão de rota.
- `src/layout/AppSidebar.tsx` — menu lateral e suas regras de visibilidade por tipo de usuário/papel.
- `src/app/(painel)/configuracoes/PageContent.tsx`, `AdminSection.tsx`, `AcademiaSection.tsx`, `GuiaConfiguracoesSection.tsx` — padrão de página de configurações "didática" (textos explicativos, caixas de regra, seções por contexto) e padrão de restrição de campos por papel de admin (`disabled={!isFpp}`).
- `src/app/(painel)/solicitacoes-matricula/PageContent.tsx` — página a atualizar (Parte G).
- `src/app/(full-width-pages)/(auth)/matricula/MatriculaPublicPage.tsx` e `page.tsx` — página pública a atualizar (Parte F).
- `src/components/auth/LoginForm.tsx`, `src/app/(painel)/layout.tsx`, `src/hooks/useUserCookie.ts` — fluxo de login/perfil, a ajustar por causa da sessão financeira restrita (Parte C).
- `src/components/guards/UnauthorizedAccess.tsx` — componente já existente para telas de acesso negado, reaproveitar em vez de criar um novo.
- `src/hooks/useApi.ts`, `src/hooks/useRoutePermission.ts`, `src/hooks/useModal.ts` — hooks utilitários a reutilizar.
- `src/components/form/SearchableSelect.tsx`, `src/components/ui/modal/`, `src/components/ui/alert/Alert.tsx`, tabelas em `src/components/tables/` — componentes de UI a reutilizar; **não crie componentes de UI genéricos novos que já existem**.

---

## 2. Avisos críticos — leia antes de implementar

Estas são limitações **reais do backend atual**, confirmadas lendo o código-fonte. Elas mudam o escopo do que é literalmente possível construir hoje. Não tente contornar nenhuma delas inventando endpoints ou dados no frontend.

### 2.1 [RESOLVIDO] Endpoint de listagem geral de cobranças já existe — use-o em `/financas/pagamentos`

Uma versão anterior deste documento registrava que não havia endpoint de listagem de cobranças. **Isso foi corrigido no backend**: agora existe `GET /financeiro/cobrancas`, com filtro por academia/contexto, por estado e por origem (mensalidade/matrícula/avulsa), e paginação. O contrato completo está na seção 4.1-A. Por causa disso, a página `/financas/pagamentos` (Parte H) **deixa de ser** um conjunto de ferramentas de busca pontual e passa a ser, como pedido originalmente, uma listagem real de "todos os pagamentos, em todos os estados", com abertura de subtela de detalhe por linha — ver Parte H reescrita.

Continuam existindo, e continuam úteis como complemento (não como substituto) desta listagem:

- `GET /financeiro/appypay/cobrancas/:id` — consulta o **detalhe completo** de uma cobrança (a listagem de `GET /financeiro/cobrancas` traz só um resumo por linha, de propósito — ver nota no código-fonte, seção 4.1-A).
- `GET /financeiro/mensalidades/estudante/:codigo` — consulta as mensalidades de um estudante específico (continua sendo a única fonte "mês a mês" com `estado` por mensalidade, útil como uma das seções da Parte H).

### 2.2 Administrador que não é `fpp` recebe 403 em TODA rota `/financeiro/*`, inclusive leitura (GET)

Toda rota sob `/financeiro/*` (credenciais, cobranças, configuração de mensalidade, configuração de matrícula) chama, no backend, `authorizeFinanceScope`/`authorizeMensalidadeAcademia`, que por sua vez chama `financeAdminAllowed(c)` → `verificarPermissaoAdmin(c, "fpp")`. Essa verificação usa uma hierarquia de papéis (`fpp` = 3, `adm` = 2, `gerente` = 1) e exige **exatamente** nível `fpp` para qualquer admin acessar finanças — **inclusive para simplesmente consultar/visualizar**. Admins com papel `adm` ou `gerente` recebem `403 Forbidden` mesmo em `GET`.

Isso significa que **não é possível hoje** implementar um modo "visualizar mas não executar" para admins não-FPP nas páginas de finanças, porque o backend bloqueia até a leitura dos dados — não há dados para mostrar em modo leitura. Portanto:

- Em `/financas/configuracoes` e `/financas/pagamentos`, quando o usuário logado é `admin` com papel diferente de `fpp`, a página deve exibir uma tela de acesso restrito (reaproveitando `UnauthorizedAccess`, ver Parte D/E/H) explicando que o módulo financeiro é exclusivo de administradores com papel FPP, **e não** tentar renderizar formulários desabilitados com dados vazios fingindo ser "somente leitura".
- Isso é diferente do padrão usado em `/configuracoes` (onde o front consegue ler os dados e só desabilita os campos) — não copie esse padrão aqui, porque a leitura em si falha.

**Recomendação separada (fora de escopo, não implementar agora):** se o dono do produto realmente quiser "visualizar mas não executar" para `adm`/`gerente`, o backend precisaria permitir leitura (GET) para qualquer papel de admin e manter só escrita (POST/PUT) restrita a `fpp`. Informe isso ao usuário como possível ajuste futuro de backend; **implemente o item acima (tela de acesso restrito) como comportamento desta tarefa**, já que é o que a API permite hoje.

### 2.3 [RESOLVIDO] Pagamento por QR Code (`GPO_QR`) já retorna a imagem do QR Code nos fluxos de propina e de matrícula

Uma versão anterior deste documento registrava que o campo `qrCodeArr` (o conteúdo do QR Code) era descartado nas respostas de `IniciarPagamentoMensalidades` (propina do estudante) e `IniciarPagamentoMatricula` (matrícula, rota pública), porque essas respostas usavam o tipo `ChargeResult` (sem esse campo) em vez de `QRCodeResult` (com esse campo). **Isso foi corrigido no backend**: `MensalidadePagamentoView.Charge` e `MatriculaPagamentoView.Charge` agora são do tipo `QRCodeResult`, e o campo chega normalmente no JSON como `cobranca.qrCodeArr` (**atenção**: o nome do campo no JSON é `qrCodeArr`, em camelCase — é uma exceção ao padrão `snake_case` do resto da API; confirme isso no código antes de tipar, não assuma) quando `metodo_pagamento = "GPO_QR"`; para os demais métodos, o campo simplesmente não aparece na resposta (`omitempty`).

Por causa disso, **`GPO_QR` deve ser oferecido normalmente** como opção de pagamento em todas as telas — configuração (`/financas/configuracoes`), pagamento do estudante (`/pagamentos`, Parte I) e pagamento público de matrícula (Parte F) — sempre que a academia o tiver habilitado na configuração. Quando o método escolhido for `GPO_QR`, a tela de pagamento deve renderizar `cobranca.qrCodeArr` como uma imagem para o pagador escanear (o conteúdo é a string do QR Code/EMV; se ao inspecionar uma resposta real ele já vier como data URI `data:image/...;base64,...`, use direto num `<img src>`; se vier só a string EMV crua, será necessário gerar a imagem do QR Code no próprio frontend a partir dela — confirme o formato exato inspecionando uma resposta real em ambiente de teste antes de decidir qual dos dois casos implementar, e não presuma um deles).

### 2.4 Sessão financeira restrita de estudante inativo (mecanismo já existe no backend, frontend ainda não trata)

Um estudante com `status = "inativo"` (ex.: desvinculado) consegue logar normalmente em `POST /login`, mas recebe um **JWT com a claim `acesso_restrito_financeiro: true`**. Esse token só é aceito pelo backend em exatamente duas rotas:

- `GET /financeiro/mensalidades/estudante/:codigo`
- `POST /financeiro/mensalidades/pagamento`

Qualquer outra rota (inclusive `GET /meu-perfil`, que hoje o layout do painel chama automaticamente) responde `403 Forbidden` com a mensagem `"sessão restrita exclusivamente ao pagamento de mensalidades"`. Note também que a claim **não vem no corpo da resposta do login** (`{token, nome, type, codigo}`) — ela só existe dentro do JWT. O frontend precisa decodificar o token para saber disso. Este comportamento é tratado em detalhe na Parte C — **é obrigatório implementá-lo**, senão um estudante desvinculado fica preso em loop de redirecionamento/erro ao logar (porque o layout padrão do painel chama `/meu-perfil`, que vai falhar com 403).

### 2.5 Regras de negócio a respeitar na validação client-side (espelhar o backend, sem substituí-lo)

Estas regras existem no backend e devem ser refletidas na UI (mensagens de ajuda, desabilitar submissão precocemente) — mas a validação final é sempre do backend; a UI deve tratar o erro retornado normalmente via `useApi`/`ApiError`:

- Configuração de mensalidade/matrícula nunca é editada, apenas **versionada**: cada `POST/PUT` cria uma nova versão vigente a partir de "agora"; versões antigas continuam valendo para meses/matrículas já vencidos antes da mudança. A UI deve deixar isso claro (ver Parte E) e mostrar o histórico de versões, não um formulário de "editar" que sugira mutação.
- `mes_fim_cobranca` de mensalidade só aceita `6` ou `7` (junho ou julho, fim do ano letivo).
- Pagamento de mensalidade: o estudante só pode selecionar meses **pendentes** de **uma única academia por vez**, e a seleção **precisa incluir o mês pendente mais antigo** daquela academia (não dá para pular meses).
- Pagamento de matrícula: só é possível quando o status da solicitação é `aprovada_pendente_pagamento_matricula`; o valor e os métodos vêm da configuração vigente no momento da aprovação (retornados por `GET /solicitacao-matricula/:codigo/status`).
- As rotas públicas de solicitação de matrícula (busca, status, pagamento) têm limite de taxa (rate limit) por IP — não faça polling agressivo; use um botão explícito de "verificar status" em vez de intervalo automático curto.

---

## 3. Convenções obrigatórias de código (não reinventar)

- Toda chamada de API passa por `useApi(<service>.<método>)` (ver `src/hooks/useApi.ts`), que já expõe `{ data, loading, error, execute }` e formata erros da API via `ApiError`/`formatApiError`. Não faça `fetch` direto em componente.
- Serviços ficam agrupados por domínio em `src/lib/api/services.ts` (ex.: `financeiroService`, `solicitacaoMatriculaService`, `academiaService`, `adminService`, `estudanteService`, `consultasService`), seguindo o padrão `api.get/post/put<TipoResposta>(rota, corpo?, { token })`. Adicione os novos métodos dentro do objeto de serviço correto, sem criar um objeto novo paralelo.
- Tipos de request/response ficam em `src/types/api.ts`, exportados como `interface`/`type`, com nomes espelhando os campos JSON reais em `snake_case` (é assim que o projeto já faz — não converta para camelCase).
- Permissão de página: cada rota nova entra em `ROUTE_PERMISSIONS` (`src/lib/route-guards.ts`); dentro da página, use `useUserType()` (`src/hooks/useRoutePermission.ts`) para diferenciar admin FPP / admin comum / academia / estudante, e `UnauthorizedAccess` para bloquear visualmente quando aplicável.
- Navegação: itens novos entram em `navItems` de `src/layout/AppSidebar.tsx`, respeitando o padrão de filtro já usado ali (bloco de filtragem por `user.tipo`/papel, próximo ao comentário `// Finanças: apenas admin FPP ou academia`).
- Estilo de "página didática com regras explicadas" (pedido explicitamente pelo usuário para `/financas/configuracoes`): siga o padrão de `src/app/(painel)/configuracoes/AcademiaSection.tsx`, que usa caixas `rounded-xl border ... bg-{cor}-50 dark:bg-{cor}-900/20 p-4` para blocos de explicação/regra, e o padrão de nota já usado em `FinanceiroCredenciaisPainel.tsx` (bloco "Nota" explicando pré-requisitos).
- Modal de detalhe ("subtela"): use `useModal` (`src/hooks/useModal.ts`) + `Modal` (`src/components/ui/modal/`), como já é usado em outras páginas do painel — não implemente um modal customizado do zero.
- Seleção de estudante/academia com busca: use `SearchableSelect` (`src/components/form/SearchableSelect.tsx`) alimentado por `consultasService.listarEstudantes` (para academia/admin escolherem um estudante) e pelo serviço equivalente de listagem de academias já existente (usado em `FinanceiroCredenciaisPainel.tsx` para o seletor de academia do admin FPP — reaproveite o mesmo padrão).
- Tabelas: use os componentes existentes em `src/components/tables/` (mesmo padrão usado em `solicitacoes-matricula/PageContent.tsx` e `estudantes/PageContent.tsx`), com paginação consistente com o resto do painel.
- Formatação de valores monetários: os valores da API vêm em `AOA` como `number` (ex.: `25000` = 25 000 Kz). Formate com `Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' })` (ou o helper de formatação de moeda já usado em outra tela do projeto, se existir — procure antes de criar um novo).

---

## 4. Contrato de API definitivo usado nesta tarefa

Todas as rotas abaixo já existem e funcionam no backend (`spuri-backend`, branch `main`). Os nomes de campo são exatamente os usados no JSON real (confirmados no código-fonte, não apenas na documentação).

### 4.1 Credenciais AppyPay (já implementado no frontend — só referência)

| Método | Rota | Quem chama |
| --- | --- | --- |
| GET | `/financeiro/appypay/credenciais?contexto_tipo=` | admin FPP (contexto `spuri` ou, com `codigo_academia`, `academia`) / academia (só a própria) |
| POST | `/financeiro/appypay/credenciais` | idem |
| PUT | `/financeiro/appypay/credenciais` | idem |

Tipos já existem em `types/api.ts`: `FinanceiroContextoTipo`, `FinanceiroCredencial`, `CriarFinanceiroCredencialRequest`, `AtualizarFinanceiroCredencialRequest`, `ListarFinanceiroCredenciaisParams`, `ListarFinanceiroCredenciaisResponse`. Serviço já existe em `financeiroService.listarCredenciais/criarCredencial/atualizarCredencial`.

### 4.1-A Listagem de cobranças (`GET /financeiro/cobrancas`) — novo endpoint

| Método | Rota | Quem chama | Query |
| --- | --- | --- | --- |
| GET | `/financeiro/cobrancas` | academia (escopo automático da própria) / admin FPP (`contexto_tipo` + `codigo_academia` conforme o que quiser consultar) | `contexto_tipo?`, `codigo_academia?`, `estado?` (repetível, ex.: `estado=pendente&estado=pago`), `tipo?` (repetível; valores aceitos: `matricula`, `mensalidade`, `avulsa`), `limit?` (padrão 50, máx. 1000), `offset?` (padrão 0) |

Mesma autorização de `authorizeFinanceScope` usada nas demais rotas de `/financeiro` — vale o aviso 2.2 (bloqueado para admin não-FPP).

Resposta `200`:

```json
{
  "cobrancas": [
    {
      "id": "uuid",
      "provider_charge_id": "...",
      "merchant_transaction_id": "...",
      "contexto_tipo": "academia",
      "codigo_academia": "ACD-...",
      "origem": "mensalidade",
      "status": "pendente",
      "valor": 25000,
      "moeda": "AOA",
      "descricao": "Propinas ACD-...: 1 mensalidade(s)",
      "metodo_pagamento": "GPO",
      "codigo_estudante": "EST-...",
      "codigo_solicitacao": "",
      "mensalidades": [{ "ano_letivo": "2026", "mes": 3 }],
      "atualizado_em": "2026-08-10T12:00:00Z"
    }
  ],
  "total": 1,
  "total_geral": 37,
  "limit": 50,
  "offset": 0
}
```

Notas importantes sobre este contrato, direto do código-fonte (não deduza nada diferente disso):

- `origem` é derivado automaticamente pelo backend a partir do payload da cobrança: `"matricula"` quando há `codigo_solicitacao`, `"mensalidade"` quando há `codigo_estudante` (e não há `codigo_solicitacao`), `"avulsa"` nos demais casos (cobrança criada diretamente por academia/admin, sem vínculo a propina nem matrícula). Use isso para os filtros/abas da Parte H, não tente inferir a origem de outra forma no frontend.
- `metodo_pagamento` já vem como `"GPO_QR"` distinto de `"GPO"` quando aplicável — não precisa de lógica adicional no frontend para diferenciar.
- **Este endpoint devolve só um resumo por cobrança** — não inclui `response` (payload bruto do provedor) nem `qrCodeArr`. Para o detalhe completo de uma cobrança específica, a subtela de detalhe (Parte H) deve chamar `GET /financeiro/appypay/cobrancas/:id` com o `id` retornado nesta listagem — os dois endpoints são complementares por design, não uma falha do primeiro. **Atenção:** confirmado no código-fonte (`Service.ConsultCharge`/`consultCharge`, em `internal/finance/appypay.go`) que esta consulta de detalhe devolve o tipo `ChargeResult` (reconsultando a AppyPay ao vivo), **não** `QRCodeResult` — ou seja, **não há garantia de que `qrCodeArr` volte aqui** para uma cobrança originalmente criada como `GPO_QR`; o campo só é gerado e devolvido no momento da criação (`POST /financeiro/appypay/qr-codes` ou dentro dos fluxos de pagamento corrigidos no aviso 2.3). Ao implementar a subtela de detalhe (Parte H), não assuma que o QR Code sempre estará disponível para recuperação posterior — trate a ausência de `qrCodeArr` como caso normal, mostrando os demais campos normalmente.
- `total` no corpo da resposta é a quantidade de itens **nesta página** (equivalente a `cobrancas.length`); `total_geral` é a quantidade total que casa com o filtro, use este último para calcular paginação (número de páginas, "mostrando X de Y", etc.).

### 4.2 Configuração de mensalidade (propina)

| Método | Rota | Quem chama | Body / Query |
| --- | --- | --- | --- |
| GET | `/financeiro/mensalidades/configuracoes?codigo_academia=` | academia (própria, `codigo_academia` opcional) / admin FPP (`codigo_academia` obrigatório) | — |
| POST | `/financeiro/mensalidades/configuracoes` | idem | `{ codigo_academia, nivel, ano_academico, curso_id?, valor, mes_fim_cobranca, metodos_pagamento: string[] }` |
| PUT | `/financeiro/mensalidades/configuracoes` | idem | mesmo body do POST (cria nova versão vigente; não edita a anterior) |

- `nivel`: `"fundamental" | "medio" | "superior"` (mesmo enum já usado em `anos-academicos`/`cursos`).
- `ano_academico`: número do ano/série dentro do nível (obrigatório para fundamental/médio; para superior, ver `curso_id`).
- `curso_id`: obrigatório apenas para nível superior (vincula a config a um curso específico).
- `mes_fim_cobranca`: `6` ou `7` — mês em que a cobrança do ano letivo termina.
- `metodos_pagamento`: subconjunto de `["GPO", "REF", "GPO_QR"]`.
- Resposta (POST/PUT/cada item do GET): `{ codigo_academia, nivel, ano_academico, curso_id?, valor, mes_fim_cobranca, metodos_pagamento, vigente_em }` — `vigente_em` é a data/hora a partir da qual essa versão passou a valer.
- GET retorna `{ codigo_academia, configuracoes: [...] }` (lista de todas as versões, mais recente primeiro, uma por combinação nível+ano/curso).

### 4.3 Início de cobrança excecional

| Método | Rota | Quem chama | Body |
| --- | --- | --- | --- |
| POST | `/financeiro/mensalidades/inicio-cobranca` | academia / admin FPP | `{ codigo_academia, ano_letivo, mes_inicio }` — `201`, sem corpo de resposta relevante |

Usado quando a academia quer que a cobrança de propina de um ano letivo específico comece num mês diferente do padrão (ex.: ano letivo que começou atrasado).

### 4.4 Anular / reativar obrigações de mensalidade

| Método | Rota | Quem chama | Body |
| --- | --- | --- | --- |
| POST | `/financeiro/mensalidades/anular` | academia / admin FPP | `{ codigo_estudante, codigo_academia, ano_letivo, meses: number[], motivo? }` — `201` |
| POST | `/financeiro/mensalidades/reativar` | academia / admin FPP | mesmo formato de body — `201` |

Marca meses específicos de um estudante como isentos ("anulado") ou reverte essa isenção. Não tem corpo de resposta relevante (apenas status).

### 4.5 Consultar mensalidades de um estudante

| Método | Rota | Quem chama |
| --- | --- | --- |
| GET | `/financeiro/mensalidades/estudante/:codigo` | o próprio estudante (todas as academias em que já teve vínculo) / academia (só as mensalidades daquele estudante na própria academia) / admin FPP (qualquer estudante, todas as academias) |

Resposta: `{ codigo_estudante, mensalidades: MensalidadeMesView[], metodos_pagamento_por_academia: Record<string, string[]> }`, onde cada item de `mensalidades` é:

```json
{
  "codigo_estudante": "EST-...",
  "codigo_academia": "ACD-...",
  "ano_letivo": "2026",
  "mes": 3,
  "data_referencia": "2026-03-01",
  "nivel": "fundamental",
  "ano_academico": 5,
  "curso_id": null,
  "valor": 25000,
  "mes_fim_cobranca": 6,
  "estado": "pendente",
  "eventos_auditoria": []
}
```

`estado` é um destes: `"pendente" | "pago" | "anulado"`. `metodos_pagamento_por_academia` mapeia `codigo_academia -> string[]` com os métodos habilitados por aquela academia (útil para montar o seletor de método de pagamento por academia na Parte I).

### 4.6 Pagamento de mensalidades (estudante)

| Método | Rota | Quem chama | Body |
| --- | --- | --- | --- |
| POST | `/financeiro/mensalidades/pagamento` | estudante (inclusive em sessão financeira restrita) | `{ codigo_academia, meses: [{ ano_letivo, mes }], metodo_pagamento: "GPO"\|"REF"\|"GPO_QR", telefone? }` |

- `telefone` só é usado (e relevante) quando `metodo_pagamento = "GPO"`.
- Regras: todos os meses devem ser da mesma academia, devem estar `pendente`, nenhum pode ter cobrança em aberto, e a seleção precisa incluir o mês pendente mais antigo daquela academia (ver 2.5).
- Resposta `201`: `{ cobranca: ChargeResult, meses: [{ ano_letivo, mes }] }`, onde `ChargeResult` aqui é, de fato, o tipo mais completo (com `qrCodeArr` quando `metodo_pagamento = "GPO_QR"` — ver aviso 2.3, resolvido). Campos confirmados no código-fonte (`internal/finance/appypay.go`): `{ id, provider_charge_id?, merchant_transaction_id, status, response? }`, mais `qrCodeArr?` quando aplicável. **Não há campos `valor`/`moeda`/`metodo_pagamento`/`criado_em` no nível da cobrança em si** neste tipo — se precisar exibir valor/método pagos, use os dados que a própria tela já tem (do formulário de pagamento) em vez de esperar que voltem na resposta da cobrança.

### 4.7 Configuração de matrícula (taxa de matrícula)

| Método | Rota | Quem chama | Body |
| --- | --- | --- | --- |
| GET | `/financeiro/matriculas/configuracoes?codigo_academia=` | academia / admin FPP | — |
| POST | `/financeiro/matriculas/configuracoes` | academia / admin FPP | `{ codigo_academia, nivel, ano_academico, curso_id?, valor, metodos_pagamento: string[] }` |
| PUT | `/financeiro/matriculas/configuracoes` | academia / admin FPP | mesmo body |

Mesmo modelo de versionamento da mensalidade (4.2), mas sem `mes_fim_cobranca` (não se aplica a uma taxa única). Resposta: `{ codigo_academia, nivel, ano_academico, curso_id?, valor, metodos_pagamento, vigente_em }`; GET retorna `{ codigo_academia, configuracoes: [...] }`.

Se **não** houver nenhuma configuração de matrícula vigente para o nível/ano/curso de uma solicitação no momento da aprovação, a matrícula é **gratuita** (a academia aprova diretamente, sem cobrança) — deixe isso claro na tela de configuração (Parte E).

### 4.8 Fluxo público de pagamento da matrícula (candidato, sem login)

| Método | Rota | Body / Query | Resposta |
| --- | --- | --- | --- |
| GET | `/solicitacao-matricula/busca?telefone=&telefone_encarregado=&email=&bilhete_identidade=&bilhete_identidade_encarregado=` | pelo menos **2** desses parâmetros preenchidos | `{ solicitacoes: [{ codigo_solicitacao, nome_estudante, academia, data_submissao, status }] }` |
| GET | `/solicitacao-matricula/:codigo/status` | — | `{ status, codigo_academia, valor_matricula?, metodos_pagamento? }` (`valor_matricula`/`metodos_pagamento` só vêm preenchidos quando `status = "aprovada_pendente_pagamento_matricula"`) |
| POST | `/solicitacao-matricula/:codigo/pagamento-matricula` | `{ metodo_pagamento: "GPO"\|"REF"\|"GPO_QR", telefone? }` (só válido quando status é `aprovada_pendente_pagamento_matricula`) | `201` `{ cobranca: QRCodeChargeResult }` — inclui `qrCodeArr` quando `metodo_pagamento = "GPO_QR"`, ver aviso 2.3 (resolvido) |

Status possíveis de uma solicitação de matrícula (confirme os rótulos exatos em `internal/domain/aggregates/solicitacao_matricula.go`; a lista relevante para pagamento é):

- `pendente` — aguardando análise da academia.
- `aprovada_pendente_pagamento_matricula` — academia aprovou e há taxa de matrícula a pagar; candidato deve efetuar o pagamento para o vínculo do estudante ser criado.
- `aprovada` — aprovada e sem pendência de pagamento (matrícula gratuita, ou já paga e vinculada).
- `reprovada` — reprovada pela academia.
- `cancelada` — cancelada (inclusive por falta de pagamento dentro do prazo, ação da academia — ver 4.9).

### 4.9 Cancelar solicitação pendente de pagamento (academia)

| Método | Rota | Quem chama | Body |
| --- | --- | --- | --- |
| PUT | `/academia/solicitacao-matricula/:codigo/cancelar` | a própria academia | `{ motivo: string }` |

Só é permitido quando o status da solicitação é `aprovada_pendente_pagamento_matricula` (ex.: candidato não pagou dentro do prazo esperado e a academia decide liberar a vaga).

### 4.10 Cobrança genérica AppyPay — consulta e cancelamento (academia/admin)

| Método | Rota | Quem chama | Query/Body |
| --- | --- | --- | --- |
| GET | `/financeiro/appypay/cobrancas/:id` | academia (só cobranças do próprio contexto) / admin FPP (contexto `spuri`; **nunca** cobranças de uma academia em nome dela) | query opcional `contexto_tipo`, `codigo_academia` |
| POST | `/financeiro/appypay/cobrancas/:id/cancelar` (confirmar rota exata em `financeiro_handlers.go`; se a rota real usar outro verbo/formato, seguir o que está no código) | mesmo escopo acima | `{ motivo? }` |

`:id` aceita tanto o id interno da cobrança quanto o `merchantTransactionId`. Resposta é um `ChargeResult` (id, provider_charge_id?, merchant_transaction_id, status, response?) — **sem garantia de `qrCodeArr`**, mesmo para uma cobrança originalmente `GPO_QR` (ver nota detalhada na seção 4.1-A). O caminho garantido para o pagador ver o QR Code é a própria resposta de criação do pagamento (4.6/4.8, corrigidas no aviso 2.3), não uma consulta posterior.

### 4.11 Solicitações de matrícula — campos novos na listagem/detalhe já existentes

`GET /solicitacoes-matricula` (admin) e `GET /academia/solicitacoes-matricula` (academia), e o respectivo detalhe por código, agora incluem, quando aplicável:

```json
{
  "...campos já existentes...": "...",
  "status": "aprovada_pendente_pagamento_matricula",
  "valor_matricula": 15000,
  "metodos_pagamento_matricula": ["GPO", "REF"]
}
```

`valor_matricula` e `metodos_pagamento_matricula` são `omitempty` — só existem quando a solicitação passou pelo fluxo de aprovação com taxa de matrícula configurada.

---

## PARTE A — Tipos TypeScript (`src/types/api.ts`)

Adicione os tipos abaixo próximo ao bloco `FinanceiroCredencial` já existente (mantenha o mesmo estilo de comentário/organização do arquivo). Ajuste nomes apenas se, ao inspecionar uma resposta real da API em ambiente de teste, algum campo divergir do que está documentado aqui — priorize sempre o que a API realmente retorna.

```ts
// ---- Mensalidade (propina) ----

export type FinanceiroNivel = 'fundamental' | 'medio' | 'superior';
export type FinanceiroMetodoPagamento = 'GPO' | 'REF' | 'GPO_QR';
export type FinanceiroEstadoMensalidade = 'pendente' | 'pago' | 'anulado';

export interface MensalidadeConfiguracaoInput {
  codigo_academia: string;
  nivel: FinanceiroNivel;
  ano_academico?: number;
  curso_id?: string;
  valor: number;
  mes_fim_cobranca: 6 | 7;
  metodos_pagamento: FinanceiroMetodoPagamento[];
}

export interface MensalidadeConfiguracaoView extends MensalidadeConfiguracaoInput {
  vigente_em: string;
}

export interface ListarConfiguracoesMensalidadeResponse {
  codigo_academia: string;
  configuracoes: MensalidadeConfiguracaoView[];
}

export interface MesInicioCobrancaInput {
  codigo_academia: string;
  ano_letivo: string;
  mes_inicio: number;
}

export interface ObrigacaoMensalidadeInput {
  codigo_estudante: string;
  codigo_academia: string;
  ano_letivo: string;
  meses: number[];
  motivo?: string;
}

export interface MensalidadeMesView {
  codigo_estudante: string;
  codigo_academia: string;
  ano_letivo: string;
  mes: number;
  data_referencia: string;
  nivel: FinanceiroNivel;
  ano_academico?: number;
  curso_id?: string;
  valor: number;
  mes_fim_cobranca: number;
  estado: FinanceiroEstadoMensalidade;
  eventos_auditoria?: unknown[];
}

export interface ConsultarMensalidadesEstudanteResponse {
  codigo_estudante: string;
  mensalidades: MensalidadeMesView[];
  metodos_pagamento_por_academia: Record<string, FinanceiroMetodoPagamento[]>;
}

export interface MensalidadePagamentoInput {
  codigo_academia: string;
  meses: { ano_letivo: string; mes: number }[];
  metodo_pagamento: FinanceiroMetodoPagamento;
  telefone?: string;
}

// Campos confirmados em internal/finance/appypay.go (type ChargeResult). Note
// que NÃO existem campos valor/moeda/metodo_pagamento/criado_em neste tipo —
// não invente esses campos; se a tela precisar exibi-los, use os dados que
// ela mesma já tem do formulário de pagamento, não espere que voltem aqui.
export interface ChargeResult {
  id: string;
  provider_charge_id?: string;
  merchant_transaction_id: string;
  status: string;
  response?: Record<string, unknown>; // payload bruto repassado da AppyPay; formato pode variar por método/estado
}

// Usado nas respostas de pagamento (mensalidade/matrícula) quando o método é
// GPO_QR — ver aviso 2.3. IMPORTANTE: o campo no JSON é "qrCodeArr", em
// camelCase (exceção ao padrão snake_case do resto da API) — confirmado em
// internal/finance/appypay.go, type QRCodeResult. Não normalize esse nome.
export interface QRCodeChargeResult extends ChargeResult {
  qrCodeArr?: string;
}

export interface MensalidadePagamentoResponse {
  cobranca: QRCodeChargeResult;
  meses: { ano_letivo: string; mes: number }[];
}

// ---- Listagem de cobranças (GET /financeiro/cobrancas) ----

export type FinanceiroOrigemCobranca = 'matricula' | 'mensalidade' | 'avulsa';

export interface CobrancaResumo {
  id: string;
  provider_charge_id?: string;
  merchant_transaction_id: string;
  contexto_tipo: FinanceiroContextoTipo;
  codigo_academia?: string;
  origem: FinanceiroOrigemCobranca;
  status: string;
  valor: number;
  moeda?: string;
  descricao?: string;
  metodo_pagamento?: FinanceiroMetodoPagamento;
  codigo_estudante?: string;
  codigo_solicitacao?: string;
  mensalidades?: { ano_letivo: string; mes: number }[];
  atualizado_em: string;
}

export interface ListarCobrancasParams {
  contexto_tipo?: FinanceiroContextoTipo;
  codigo_academia?: string;
  estado?: string[];
  tipo?: FinanceiroOrigemCobranca[];
  limit?: number;
  offset?: number;
}

export interface ListarCobrancasResponse {
  cobrancas: CobrancaResumo[];
  total: number; // quantidade nesta página (cobrancas.length)
  total_geral: number; // quantidade total que casa com o filtro — use para paginação
  limit: number;
  offset: number;
}

// ---- Matrícula (taxa de matrícula) ----

export interface MatriculaConfiguracaoInput {
  codigo_academia: string;
  nivel: FinanceiroNivel;
  ano_academico?: number;
  curso_id?: string;
  valor: number;
  metodos_pagamento: FinanceiroMetodoPagamento[];
}

export interface MatriculaConfiguracaoView extends MatriculaConfiguracaoInput {
  vigente_em: string;
}

export interface ListarConfiguracoesMatriculaResponse {
  codigo_academia: string;
  configuracoes: MatriculaConfiguracaoView[];
}

// ---- Fluxo público de pagamento de matrícula ----

export interface BuscarSolicitacoesMatriculaParams {
  telefone?: string;
  telefone_encarregado?: string;
  email?: string;
  bilhete_identidade?: string;
  bilhete_identidade_encarregado?: string;
}

export interface SolicitacaoMatriculaResumo {
  codigo_solicitacao: string;
  nome_estudante: string;
  academia: string;
  data_submissao: string;
  status: string;
}

export interface BuscarSolicitacoesMatriculaResponse {
  solicitacoes: SolicitacaoMatriculaResumo[];
}

export interface SolicitacaoMatriculaStatusResponse {
  status: string;
  codigo_academia: string;
  valor_matricula?: number;
  metodos_pagamento?: FinanceiroMetodoPagamento[];
}

export interface PagamentoMatriculaInput {
  metodo_pagamento: FinanceiroMetodoPagamento;
  telefone?: string;
}

export interface PagamentoMatriculaResponse {
  cobranca: QRCodeChargeResult;
}

export interface CancelarSolicitacaoMatriculaInput {
  motivo: string;
}
```

No `interface SolicitacaoMatricula` (ou nome equivalente já existente na seção de solicitações de matrícula, por volta da linha ~300 do arquivo), **adicione** os dois campos novos e amplie a união de `status`, sem remover nenhum valor já existente:

```ts
// dentro da interface SolicitacaoMatricula já existente:
status: '...(valores já existentes)...' | 'aprovada_pendente_pagamento_matricula';
valor_matricula?: number;
metodos_pagamento_matricula?: FinanceiroMetodoPagamento[];
```

---

## PARTE B — Serviços de API (`src/lib/api/services.ts`)

### B.1 Ampliar `financeiroService`

Adicione estes métodos ao objeto `financeiroService` já existente (mesmo padrão de `listarCredenciais`/`criarCredencial`, usando `tokenStorage.get()` como token padrão):

```ts
export const financeiroService = {
  // ...métodos já existentes de credenciais...

  listarConfiguracoesMensalidade: (params: { codigo_academia?: string }, token?: string) =>
    api.get<ListarConfiguracoesMensalidadeResponse>(
      `/financeiro/mensalidades/configuracoes${params.codigo_academia ? `?codigo_academia=${encodeURIComponent(params.codigo_academia)}` : ''}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  configurarMensalidade: (data: MensalidadeConfiguracaoInput, token?: string) =>
    api.post<MensalidadeConfiguracaoView>('/financeiro/mensalidades/configuracoes', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  atualizarConfiguracaoMensalidade: (data: MensalidadeConfiguracaoInput, token?: string) =>
    api.put<MensalidadeConfiguracaoView>('/financeiro/mensalidades/configuracoes', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  definirInicioCobranca: (data: MesInicioCobrancaInput, token?: string) =>
    api.post<void>('/financeiro/mensalidades/inicio-cobranca', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  anularObrigacoes: (data: ObrigacaoMensalidadeInput, token?: string) =>
    api.post<void>('/financeiro/mensalidades/anular', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  reativarObrigacoes: (data: ObrigacaoMensalidadeInput, token?: string) =>
    api.post<void>('/financeiro/mensalidades/reativar', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  consultarMensalidadesEstudante: (codigoEstudante: string, token?: string) =>
    api.get<ConsultarMensalidadesEstudanteResponse>(
      `/financeiro/mensalidades/estudante/${encodeURIComponent(codigoEstudante)}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  iniciarPagamentoMensalidades: (data: MensalidadePagamentoInput, token?: string) =>
    api.post<MensalidadePagamentoResponse>('/financeiro/mensalidades/pagamento', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  listarConfiguracoesMatricula: (params: { codigo_academia?: string }, token?: string) =>
    api.get<ListarConfiguracoesMatriculaResponse>(
      `/financeiro/matriculas/configuracoes${params.codigo_academia ? `?codigo_academia=${encodeURIComponent(params.codigo_academia)}` : ''}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  configurarMatricula: (data: MatriculaConfiguracaoInput, token?: string) =>
    api.post<MatriculaConfiguracaoView>('/financeiro/matriculas/configuracoes', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  atualizarConfiguracaoMatricula: (data: MatriculaConfiguracaoInput, token?: string) =>
    api.put<MatriculaConfiguracaoView>('/financeiro/matriculas/configuracoes', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  listarCobrancas: (params: ListarCobrancasParams, token?: string) => {
    const qs = new URLSearchParams();
    if (params.contexto_tipo) qs.set('contexto_tipo', params.contexto_tipo);
    if (params.codigo_academia) qs.set('codigo_academia', params.codigo_academia);
    (params.estado || []).forEach((e) => qs.append('estado', e));
    (params.tipo || []).forEach((t) => qs.append('tipo', t));
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.offset != null) qs.set('offset', String(params.offset));
    return api.get<ListarCobrancasResponse>(`/financeiro/cobrancas?${qs.toString()}`, {
      token: token || tokenStorage.get() || undefined,
    });
  },

  consultarCobranca: (id: string, params?: { contexto_tipo?: FinanceiroContextoTipo; codigo_academia?: string }, token?: string) =>
    api.get<ChargeResult>(`/financeiro/appypay/cobrancas/${encodeURIComponent(id)}${/* montar querystring com params, se houver */ ''}`, {
      token: token || tokenStorage.get() || undefined,
    }),

  cancelarCobranca: (id: string, motivo: string | undefined, token?: string) =>
    api.post<ChargeResult>(`/financeiro/appypay/cobrancas/${encodeURIComponent(id)}/cancelar`, { motivo }, {
      token: token || tokenStorage.get() || undefined,
    }),
};
```

Confirme a rota exata de cancelamento de cobrança e a montagem da querystring de `consultarCobranca` olhando `financeiro_handlers.go` linha a linha antes de finalizar — o formato de rota pode diferir ligeiramente do escrito acima; o contrato de campos é o que importa manter.

### B.2 Ampliar `solicitacaoMatriculaService` (rotas públicas)

```ts
export const solicitacaoMatriculaService = {
  // ...métodos já existentes (criar solicitação, etc.)...

  buscar: (params: BuscarSolicitacoesMatriculaParams) =>
    api.get<BuscarSolicitacoesMatriculaResponse>(
      `/solicitacao-matricula/busca?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),

  consultarStatus: (codigo: string) =>
    api.get<SolicitacaoMatriculaStatusResponse>(`/solicitacao-matricula/${encodeURIComponent(codigo)}/status`),

  iniciarPagamento: (codigo: string, data: PagamentoMatriculaInput) =>
    api.post<PagamentoMatriculaResponse>(`/solicitacao-matricula/${encodeURIComponent(codigo)}/pagamento-matricula`, data),
};
```

Estas três chamadas **não enviam token** (rotas públicas) — não passe `tokenStorage.get()` nelas.

### B.3 Ampliar `academiaService`

```ts
export const academiaService = {
  // ...métodos já existentes...

  cancelarSolicitacaoMatricula: (codigo: string, data: CancelarSolicitacaoMatriculaInput, token?: string) =>
    api.put<{ message: string }>(`/academia/solicitacao-matricula/${encodeURIComponent(codigo)}/cancelar`, data, {
      token: token || tokenStorage.get() || undefined,
    }),
};
```

---

## PARTE C — Sessão financeira restrita (JWT restrito de estudante inativo)

Esta parte é pré-requisito técnico da Parte I e deve ser feita antes dela. Sem isso, um estudante desvinculado que tenta logar entra em loop quebrado (o layout do painel chama `/meu-perfil`, que responde `403` para esse token, ver aviso 2.4).

### C.1 Utilitário de decodificação do JWT

Em `src/lib/api/client.ts`, adicione uma função utilitária que decodifica (sem verificar assinatura — isso é seguro no cliente, o payload de um JWT não é confidencial para quem já o possui) o payload do token:

```ts
export interface DecodedTokenClaims {
  user_id?: string;
  user_type?: string;
  acesso_restrito_financeiro?: boolean;
  exp?: number;
}

export function decodeTokenPayload(token: string): DecodedTokenClaims | null {
  try {
    const payload = token.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return json as DecodedTokenClaims;
  } catch {
    return null;
  }
}
```

Amplie `tokenStorage` (mesmo arquivo) com um helper de conveniência:

```ts
export const tokenStorage = {
  // ...métodos já existentes...

  isRestrictedFinance: () => {
    const token = tokenStorage.get();
    if (!token) return false;
    return decodeTokenPayload(token)?.acesso_restrito_financeiro === true;
  },
};
```

### C.2 `LoginForm.tsx` — redirecionar corretamente e não depender de `/meu-perfil`

Depois de `tokenStorage.setWithType(result.token, result.type)`, verifique a claim e:

1. Se `tokenStorage.isRestrictedFinance()` for `true`: grave imediatamente um cookie `user` mínimo montado **a partir da própria resposta do login** (que já traz `{ token, nome, type, codigo }`), sem chamar `/meu-perfil` (essa rota vai 403 para este token). Use a mesma chave/formato de cookie que `useUserCookie` já lê (`getCookie('user')` esperando um JSON compatível com `MeuPerfilResponse`) — preencha só os campos que fizerem sentido (`tipo: 'estudante'`, `estudante: { codigo_estudante: result.codigo, nome: result.nome, status: 'inativo' }` ou o subconjunto mínimo que `MeuPerfilResponse` exigir para não quebrar tipagem — ajuste conforme a interface real). Em seguida, `router.push('/pagamentos')`.
2. Caso contrário, mantenha o comportamento atual (`router.push('/painel')`), sem alterações.

### C.3 `(painel)/layout.tsx` — não chamar `/meu-perfil` em sessão restrita

No `useEffect` que chama `executarPegarPerfil(token)`, adicione uma guarda no início: `if (tokenStorage.isRestrictedFinance()) return;` — pulando completamente a chamada a `/meu-perfil` quando a sessão é restrita, já que o cookie `user` mínimo já foi gravado no login (C.2) e essa chamada retornaria 403.

### C.4 `route-guards.ts` / `RouteGuard.tsx` — travar navegação em `/pagamentos`

1. Adicione a rota nova em `ROUTE_PERMISSIONS`:

```ts
{
  path: '/pagamentos',
  allowedTypes: ['estudante'],
  redirectIfUnauthorized: '/login',
},
```

2. Em `checkRoutePermission`, adicione um parâmetro opcional `isRestrictedFinance` (mantendo compatibilidade com as chamadas existentes que não o passam), e, quando verdadeiro, force: se `normalizedPath !== '/pagamentos'`, retornar `{ allowed: false, redirectTo: '/pagamentos' }` **antes** de qualquer outra checagem (inclusive para `/painel`, `/perfil`, etc. — o backend rejeitaria todas mesmo assim).
3. Em `RouteGuard.tsx`, calcule `const isRestrictedFinance = tokenStorage.isRestrictedFinance();` e passe para `checkRoutePermission(pathname, userType, isAuthenticated, isRestrictedFinance)`.

### C.5 `AppSidebar.tsx` — menu mínimo em sessão restrita

Quando `tokenStorage.isRestrictedFinance()` for `true`, a sidebar deve mostrar **apenas** o item "Pagamentos" (e a ação de sair) — oculte todo o resto do menu nesse estado, para não convidar o usuário a clicar em algo que vai 403.

### C.6 Página `/pagamentos` fora do fluxo normal de perfil

A página em si (Parte I) deve montar a identidade do estudante a partir do cookie `user` mínimo gravado em C.2 (ou, na ausência dele — ex.: usuário já estava logado antes desta implementação — a partir de `tokenStorage.getWithType()` mais o `codigo` salvo em cookie no login), **nunca** disparando uma chamada a `/meu-perfil` por conta própria.

Adicione também, na própria página `/pagamentos`, um aviso visível (`Alert variant="warning"`) explicando por que o acesso está restrito, por exemplo: "O seu vínculo com a academia foi encerrado. Você pode consultar e regularizar pendências financeiras aqui." — reutilize o texto oficial que a academia/admin usa para desvincular, se existir em outra tela, para consistência.

---

## PARTE D — Rotas, permissões e navegação (demais itens)

Além do que já foi especificado na Parte C para `/pagamentos`, adicione a `ROUTE_PERMISSIONS`:

```ts
{
  path: '/financas/configuracoes',
  allowedTypes: ['admin', 'academia'],
  redirectIfUnauthorized: '/',
},
{
  path: '/financas/pagamentos',
  allowedTypes: ['admin', 'academia'],
  redirectIfUnauthorized: '/',
},
```

Note que, diferente de `/financas/credenciais` hoje, estas rotas usam `allowedTypes: ['admin', 'academia']` **sem** filtrar por papel FPP no nível de rota — o filtro por papel (FPP vs. `adm`/`gerente`) acontece **dentro da página**, porque um admin não-FPP tecnicamente pode acessar a URL, só não consegue ler nenhum dado (ver aviso 2.2) e vai ver a tela de acesso restrito. Isso é intencional: a rota fica navegável, a página decide o que mostrar.

Em `src/layout/AppSidebar.tsx`:

1. No item "Finanças", **troque** o filtro atual (que hoje provavelmente restringe a `fpp`/academia de forma mais estrita — confira o comentário `// Finanças: apenas admin FPP ou academia`) para permitir **qualquer admin** e academia verem o item de menu (a página é quem decide mostrar acesso restrito para não-FPP). Adicione os dois novos subitens:

```ts
{ name: "Configurações", path: "/financas/configuracoes" },
{ name: "Pagamentos", path: "/financas/pagamentos" },
```

mantendo `{ name: "Credenciais", path: "/financas/credenciais" }` como já está.

2. Adicione um item de nível superior novo, visível **apenas** para `estudante` (ao lado de itens equivalentes como "Perfil"):

```ts
{ name: "Pagamentos", path: "/pagamentos" },
```

Certifique-se de que este item **não** aparece para admin/academia (eles usam `/financas/pagamentos`) e que, quando `tokenStorage.isRestrictedFinance()`, os demais itens do menu do estudante ficam ocultos (Parte C.5).

Crie/edite `src/app/(painel)/financas/layout.tsx`, adicionando as duas rotas novas ao mapa `PAGE_TITLES`:

```ts
const PAGE_TITLES: Record<string, string> = {
  "/financas/credenciais": "Finanças — Credenciais",
  "/financas/configuracoes": "Finanças — Configurações",
  "/financas/pagamentos": "Finanças — Pagamentos",
};
```

---

## PARTE E — Página `/financas/configuracoes`

Arquivos a criar, seguindo exatamente o padrão de `financas/credenciais/page.tsx` + `FinanceiroCredenciaisPainel.tsx`:

- `src/app/(painel)/financas/configuracoes/page.tsx` (wrapper fino com `metadata`, igual ao de credenciais).
- `src/components/paineis/FinanceiroConfiguracoesPainel.tsx` (componente principal, `"use client"`).

### E.1 Controle de acesso dentro da página

No topo do componente, usando `useUserType()`:

- Se `userType === 'admin'` e o papel do admin (verifique como `AdminSection.tsx`/`useUserType` expõe isso — provavelmente via `user.admin.role` no cookie de perfil) **não** for `fpp`: renderize `<UnauthorizedAccess requiredTypes={["Administrador FPP", "Academia"]} message="O módulo financeiro é exclusivo de administradores com papel FPP. Fale com um administrador FPP para consultar ou alterar estas configurações." />` e **pare aqui** — não tente carregar dados.
- Se `userType === 'academia'`: segue normalmente, sempre operando sobre a própria `codigo_academia` (do cookie de usuário), sem seletor de academia.
- Se `userType === 'admin'` com papel `fpp`: precisa de um seletor de academia antes de mostrar qualquer configuração (mesmo padrão de `FinanceiroCredenciaisPainel.tsx` — reaproveite o mesmo componente/lógica de seleção, não duplique).

### E.2 Estrutura da página (didática, por pedido explícito do usuário)

Organize em duas abas/seções (`Mensalidades (Propinas)` e `Matrícula`), cada uma com:

1. **Bloco de explicação no topo** (caixa `rounded-xl border ... bg-brand-50`, no mesmo estilo de `AcademiaSection.tsx`), explicando em linguagem simples:
   - Que cada configuração enviada cria uma **nova versão vigente a partir de agora**; não edita nem apaga versões passadas, e meses/matrículas já vencidos continuam usando o valor da versão que estava vigente na época (cite a regra de 2.5).
   - Que a configuração é específica por **nível de ensino** e, dentro dele, por **ano/série** (fundamental/médio) ou por **curso** (superior) — logo pode (e normalmente deve) haver várias configurações vigentes ao mesmo tempo, uma por combinação.
   - No caso da Matrícula: que, se **nenhuma** configuração existir para a combinação nível/ano/curso de uma solicitação, a matrícula daquele candidato é **gratuita** e a academia aprova direto, sem cobrança.
   - Que pagamentos só podem ser feitos pelos métodos habilitados aqui: explique brevemente o que é cada um — `GPO` (Multicaixa Express via número de telefone), `REF` (referência para pagar em qualquer Multicaixa/ATM/homebanking) e `GPO_QR` (QR Code, exibido para o pagador escanear no momento em que ele escolhe pagar).
   - Um aviso de que é **obrigatório configurar as credenciais AppyPay antes** (link direto para `/financas/credenciais`), senão nenhuma cobrança poderá ser criada mesmo com a configuração de valor pronta.

2. **Formulário de nova versão**: campos `nivel` (select), `ano_academico` (number, condicional a fundamental/médio), `curso_id` (select de cursos da academia, condicional a superior — reaproveite o serviço de listagem de cursos já existente no projeto), `valor` (number, moeda AOA), `mes_fim_cobranca` (select 6/7, só na aba Mensalidades), `metodos_pagamento` (checkboxes `GPO`/`REF`/`GPO_QR`, com a nota de 2.3 ao lado de `GPO_QR`). Botão "Salvar nova versão" chamando `configurarMensalidade`/`configurarMatricula` (ou o `atualizarConfiguracaoX` — **pergunte-se**: como não existe "editar", use sempre o mesmo botão de submit; se já existir configuração para a combinação escolhida, é razoável usar PUT, senão POST — implemente essa escolha automaticamente com base no que veio do GET, mas trate o caso de falha de um deles tentando o outro só se a API indicar claramente que é esse o motivo do erro, não por tentativa-erro cega).

3. **Histórico de versões**: tabela abaixo do formulário, listando todas as configurações retornadas pelo GET (mais recente primeiro), agrupadas por combinação nível/ano/curso, com colunas `Vigente desde`, `Valor`, `Métodos`, e (só na de mensalidade) `Mês fim de cobrança`. Sem ações de editar/excluir (reforça a natureza imutável/versionada).

4. **Ferramentas adicionais (só na aba Mensalidades, em seção separada e claramente identificada como "ações excecionais")**:
   - "Definir início de cobrança excecional": formulário pequeno (`ano_letivo`, `mes_inicio`) com explicação de quando usar (ano letivo que começou fora do padrão).
   - "Anular / reativar obrigações de um estudante": busca de estudante (`SearchableSelect` + `consultasService.listarEstudantes`, escopado à própria academia quando ator é academia), depois seleção de `ano_letivo` e dos meses a anular/reativar (multi-select simples 1–12), campo `motivo` (obrigatório para anular, mesmo que a API não exija — é boa prática de auditoria), dois botões separados "Anular selecionados" / "Reativar selecionados".

Todos os formulários usam `useApi` para o submit, mostram erro via o padrão já usado em `FinanceiroCredenciaisPainel.tsx`, e mostram uma confirmação de sucesso (toast/alert) sem duplicar o estado local manualmente — refaça o GET após qualquer POST/PUT bem-sucedido para refletir a nova versão vigente.

---

## PARTE F — Atualizar a página pública de matrícula

Arquivos: `src/app/(full-width-pages)/(auth)/matricula/MatriculaPublicPage.tsx` (e `page.tsx` se precisar de nova rota — ver F.2).

### F.1 Tela de sucesso após enviar a solicitação

No estado de sucesso atual (que já mostra o `codigo_solicitacao` gerado), adicione:

- Um texto explicando que, após a análise da academia, caso haja taxa de matrícula, o candidato será informado e poderá efetuar o pagamento nesta mesma página, usando o código da solicitação — deixe claro que **hoje não é possível saber o valor antes da aprovação** (não existe endpoint público para isso; não tente adivinhar ou mostrar um valor "estimado").
- Um botão/link "Acompanhar esta solicitação e pagar (se necessário)" que leva à nova tela de acompanhamento (F.2), já com o código pré-preenchido (via querystring ou estado local, à sua escolha, desde que funcione também em acesso direto sem esse estado, ver F.2).

### F.2 Nova tela/rota de acompanhamento e pagamento

Crie uma nova subseção acessível a partir da própria página pública de matrícula (pode ser uma aba/etapa adicional dentro do mesmo componente com um seletor "Nova solicitação" / "Acompanhar solicitação existente" no topo, seguindo o padrão de etapas que `MatriculaPublicPage.tsx` já usa internamente — não crie uma página totalmente nova e desconectada, para não duplicar o cabeçalho/layout institucional).

Fluxo:

1. **Localizar a solicitação**: dois caminhos, deixe ambos disponíveis:
   - Campo único "Código da solicitação" (se o usuário já tem, ex.: veio do link de F.1 ou anotou) → chama `solicitacaoMatriculaService.consultarStatus(codigo)` diretamente.
   - "Não tenho o código" → formulário com os campos de `BuscarSolicitacoesMatriculaParams` (explicando que é preciso preencher **pelo menos dois** dos cinco campos) → chama `solicitacaoMatriculaService.buscar(...)` → lista resultados (`nome_estudante`, `academia`, `data_submissao`, `status`) para o candidato escolher a solicitação correta → então consulta o status dela.

2. **Exibir status**, com mensagens específicas por valor de `status` (use os mesmos rótulos amigáveis da Parte G para manter consistência):
   - `pendente`: "Sua solicitação ainda está em análise pela academia."
   - `aprovada_pendente_pagamento_matricula`: mostra `valor_matricula` formatado, e o formulário de pagamento (abaixo).
   - `aprovada`: "Sua matrícula foi aprovada" (com nota adicional se antes exigiu pagamento: "e o pagamento foi confirmado").
   - `reprovada`: "Sua solicitação não foi aprovada."
   - `cancelada`: "Esta solicitação foi cancelada."

3. **Formulário de pagamento** (só quando `aprovada_pendente_pagamento_matricula`): seletor de método com todas as opções retornadas em `metodos_pagamento` (`GPO`, `REF` e/ou `GPO_QR`, conforme o que a academia tiver habilitado — ver aviso 2.3, resolvido: os três métodos podem ser oferecidos normalmente aqui), campo `telefone` obrigatório só quando `GPO`, botão "Pagar" chamando `solicitacaoMatriculaService.iniciarPagamento(codigo, {...})`.

4. **Após iniciar o pagamento**: mostre o resultado de `cobranca` de forma útil por método — **atenção**: `entidade`/`referencia` (dados de referência Multicaixa) **não são campos de nível superior** de `ChargeResult`; se a AppyPay os devolver, eles vêm dentro de `cobranca.response` (`Record<string, unknown>`, formato variável) — inspecione uma resposta real de uma cobrança `REF` em ambiente de teste antes de decidir exatamente quais chaves ler de dentro de `response`, não presuma nomes de campo.
   - `REF`: extraia e destaque os dados de referência de dentro de `cobranca.response`, em destaque visual grande, com instrução "pague em qualquer ATM, Multicaixa Express ou homebanking usando estes dados".
   - `GPO`: instrução "você receberá uma notificação no telefone informado para confirmar o pagamento".
   - `GPO_QR`: renderize `cobranca.qrCodeArr` como imagem (ver formato exato a confirmar, aviso 2.3) com instrução "escaneie o QR Code no aplicativo do seu banco para confirmar o pagamento".
   - Um botão "Verificar status" que rechama `consultarStatus(codigo)` sob demanda (nunca em intervalo automático curto, ver 2.5) para o candidato conferir se já foi confirmado (`status` muda para `aprovada`).

---

## PARTE G — Atualizar `/solicitacoes-matricula` (visão academia/admin)

Arquivo: `src/app/(painel)/solicitacoes-matricula/PageContent.tsx` (e o subcomponente de detalhe/modal que ele já usa, se estiver em arquivo separado — confirme ao abrir o arquivo).

### G.1 Detalhe da solicitação

Na visualização detalhada (modal ou subtela já existente), adicione um bloco "Pagamento da matrícula", exibido apenas quando a solicitação tiver `valor_matricula` definido (independente do status atual, para preservar histórico), mostrando:

- `Valor da matrícula`: `valor_matricula` formatado em AOA.
- `Métodos habilitados`: lista de `metodos_pagamento_matricula`.
- `Situação`: rótulo amigável do `status` atual (ver mapeamento em G.2).

Quando `status === 'aprovada_pendente_pagamento_matricula'` e o ator logado for a **academia** dona da solicitação, adicione um botão "Cancelar por falta de pagamento" que abre um pequeno formulário/modal pedindo `motivo` (obrigatório) e chama `academiaService.cancelarSolicitacaoMatricula(codigo, { motivo })`; após sucesso, atualize a lista/detalhe.

Não implemente aqui nenhuma tela de "ver a cobrança" — não há como relacionar a solicitação diretamente a um `id` de cobrança pelo contrato atual (ver 2.1/4.11); se a academia precisar investigar uma cobrança específica, ela usa a busca por cobrança em `/financas/pagamentos` (Parte H) manualmente, se souber o `merchantTransactionId`.

### G.2 Rótulos de status e filtro

Onde a página já mapeia `status` para rótulo/cor de badge, adicione:

```ts
aprovada_pendente_pagamento_matricula: { label: "Aguardando pagamento da matrícula", color: "warning" /* ou equivalente já usado no projeto */ },
```

Onde a página já tem um filtro/dropdown de status (`statusOptions` ou nome equivalente), adicione a mesma opção nova, mantendo a ordem e o estilo das demais.

---

## PARTE H — Página `/financas/pagamentos` (academia/admin)

Arquivos: `src/app/(painel)/financas/pagamentos/page.tsx` + `src/components/paineis/FinanceiroPagamentosPainel.tsx`, mesmo padrão de organização da Parte E.

> Esta parte foi reescrita: com a correção do backend (aviso 2.1), esta página deixou de precisar de contornos por busca pontual e passa a ser, como pedido originalmente, uma **listagem real** de "todos os pagamentos, em todos os estados", com abertura de subtela de detalhe por linha, sobre `GET /financeiro/cobrancas` (seção 4.1-A).

### H.1 Controle de acesso

Idêntico ao E.1 (admin não-FPP → `UnauthorizedAccess`; admin FPP → seletor de academia; academia → escopo próprio automático). O seletor de academia do admin FPP define o `codigo_academia` usado em todas as chamadas desta página — sem uma academia selecionada, não chame `listarCobrancas` (evite uma primeira consulta sem filtro nenhum, que devolveria cobranças de todas as academias misturadas para um FPP).

### H.2 Listagem principal (tabela de cobranças)

Ao entrar na página (ou trocar de academia, para o admin FPP), chame `financeiroService.listarCobrancas({ codigo_academia, contexto_tipo: 'academia', limit: 20, offset: 0 })` e monte uma tabela paginada (reaproveite o componente de paginação já usado em `solicitacoes-matricula/PageContent.tsx`/`estudantes/PageContent.tsx`) com colunas:

- `Origem` (badge: "Matrícula" / "Mensalidade" / "Avulsa", a partir de `origem`).
- `Descrição` (`descricao`, com fallback para "—" se vazio).
- `Estudante` (`codigo_estudante`, só quando `origem !== 'avulsa'`; se o projeto já tiver um jeito de resolver código→nome de estudante em outra tela, reaproveite o mesmo padrão aqui, não implemente um novo).
- `Valor` (`valor` formatado em AOA).
- `Método` (`metodo_pagamento`).
- `Estado` (`status`, como badge colorido — **atenção**: conforme a nota do código-fonte citada na seção 4.1-A, `status` mistura valores internos do Spuri (`"solicitada"`, `"criada"`, `"cancelada"`, `"falhada"`) com valores crus vindos da AppyPay (`"Success"`, `"Pending"`, `"Failed"`, etc. — case variável); mapeie o badge por comparação **case-insensitive**, não por igualdade exata de string, e trate qualquer valor não reconhecido com uma cor neutra em vez de quebrar).
- `Atualizado em` (`atualizado_em`, formatado como data/hora local).

**Filtros acima da tabela** (todos client-side viram parâmetros da mesma chamada, refazendo a consulta ao mudar qualquer um):

- Por origem (`tipo`): "Todas" / "Matrícula" / "Mensalidade" / "Avulsa".
- Por estado (`estado`, multi-seleção): construa a lista de opções a partir dos estados que já apareceram na página atual da listagem (não tente adivinhar todos os valores possíveis de antemão, já que a nota do backend deixa claro que o texto é passado adiante sem normalização).

### H.3 Subtela de detalhe (clique na linha)

Ao clicar numa linha, abra um modal (`useModal`/`Modal`) que chama `financeiroService.consultarCobranca(id, { contexto_tipo, codigo_academia })` (usando o `id` da linha) e mostra:

- Todos os campos de `ChargeResult` (`id`, `provider_charge_id`, `merchant_transaction_id`, `status`).
- O conteúdo de `response` (payload bruto da AppyPay) — apresente de forma legível (ex.: lista de chave/valor ou bloco de código formatado), não tente adivinhar um layout específico para ele, já que o formato varia por método/estado.
- Se, e somente se, o campo `qrCodeArr` vier presente na resposta (ver seção 4.1-A: **não é garantido**, mesmo para cobranças originalmente criadas como `GPO_QR` — trate a ausência como caso normal), renderize-o como imagem, do mesmo jeito descrito no aviso 2.3.
- Botão "Cancelar cobrança" (`financeiroService.cancelarCobranca`, pedindo `motivo` opcional), visível apenas quando `status` não estiver em um estado terminal (mesma lista de estados terminais que a API já valida do lado dela — trate o erro retornado pela API como fonte de verdade se a tentativa de cancelar for rejeitada, em vez de tentar replicar essa lista no frontend). Após sucesso, feche o modal e recarregue a linha/página atual da listagem.

### H.4 Seção complementar — mensalidades por estudante

Mantenha, abaixo da listagem principal, uma seção separada "Consultar mensalidades de um estudante": `SearchableSelect` de estudante (via `consultasService.listarEstudantes`, escopado à própria academia quando o ator é academia; livre, com aviso claro de que o resultado cobre todas as academias do estudante, quando o ator é admin FPP). Ao selecionar um estudante, chama `financeiroService.consultarMensalidadesEstudante(codigo)` e mostra uma tabela com `ano_letivo`, `mes`, `academia` (relevante principalmente para o admin FPP, que vê todas), `valor`, `estado` (mesmo esquema de badge da seção H.2). Esta seção continua necessária porque `GET /financeiro/cobrancas` lista **cobranças que já foram iniciadas** — um mês de propina ainda pendente, sem nenhuma cobrança criada para ele, não aparece na listagem principal, só nesta consulta por estudante. Acima da tabela, para academia/admin FPP, dois botões de ação em massa sobre os meses selecionados (checkbox por linha): "Anular selecionados" / "Reativar selecionados", reaproveitando o mesmo fluxo/serviço da Parte E.2.4 (extraia esse mini-formulário para um componente compartilhado, evitando duplicar entre `/financas/configuracoes` e `/financas/pagamentos`).

---

## PARTE I — Página `/pagamentos` (estudante)

Arquivos: `src/app/(painel)/pagamentos/page.tsx` (ou fora de `(painel)` se, na prática, isso se mostrar necessário para acomodar a sessão restrita da Parte C — avalie durante a implementação; o requisito não-negociável é que a sessão restrita **funcione sem erro nenhum**, mesmo que a solução final não use exatamente o grupo de rotas `(painel)`) + `src/components/paineis/EstudantePagamentosPainel.tsx`.

### I.1 Carregamento de dados

Ao montar, obtenha o `codigo_estudante` do estudante logado (do cookie `user`/`MeuPerfilResponse`, ou do cookie mínimo gravado em sessão restrita — Parte C.6) e chame `financeiroService.consultarMensalidadesEstudante(codigo)`. **Nunca** peça esse código como input manual — o estudante só vê os próprios dados.

### I.2 Listagem — "todos os pagamentos, todos os status, de todas as academias"

Isto **é totalmente suportado** pela API (diferente das telas de admin/academia — ver 4.5), já que `mensalidades` retorna todo o histórico do estudante em todas as academias por onde já passou. Agrupe visualmente por academia (uma seção/acordeão por `codigo_academia`), e dentro de cada uma, uma tabela por `ano_letivo` com `mes`, `valor`, `estado` (badges: pendente/pago/anulado, mesmas cores da Parte H). Adicione filtro por estado no topo (todos/pendentes/pagos/anulados).

### I.3 Iniciar pagamento

Dentro de cada agrupamento por academia, se houver meses `pendente`, mostre um botão "Pagar mensalidades" que abre um formulário (modal ou seção expansível):

- Checkboxes dos meses pendentes **daquela academia**, com a regra de 2.5 aplicada no client (desabilite/pré-marque o mês pendente mais antigo como obrigatório — não permita desmarcá-lo se houver outros meses selecionados depois dele).
- Seletor de método com todas as opções de `metodos_pagamento_por_academia[codigo_academia]` (`GPO`, `REF` e/ou `GPO_QR`, ver aviso 2.3, resolvido).
- Campo `telefone`, obrigatório só para `GPO`.
- Botão "Confirmar pagamento" chamando `iniciarPagamentoMensalidades`.

### I.4 Resultado do pagamento

Mesmo tratamento de exibição por método descrito em F.2 item 4 (dados de referência extraídos de `cobranca.response` para `REF`, instrução de confirmação por telefone para `GPO`, imagem de `cobranca.qrCodeArr` para `GPO_QR`), com botão "Verificar status" que re-chama `consultarMensalidadesEstudante` para atualizar o `estado` dos meses pagos (de `pendente` para `pago`) sob demanda — sem polling automático.

### I.5 Sessão financeira restrita

Ver Parte C por completo — esta página precisa funcionar integralmente (leitura e pagamento) para um estudante com `acesso_restrito_financeiro = true`, incluindo o aviso explicativo mencionado em C.6, e sem chamar nenhuma rota fora das duas permitidas nesse modo (4.5 e 4.6).

---

## 5. Checklist de aceite final

- [ ] `npm run build` (ou equivalente do projeto) passa sem erros de tipo.
- [ ] `npm run lint` passa.
- [ ] Login de estudante com `status = "inativo"` não entra em loop nem gera erro 403 visível; é redirecionado direto para `/pagamentos`, com menu lateral reduzido a "Pagamentos".
- [ ] Admin com papel diferente de `fpp` vê tela de acesso restrito, sem erro no console, em `/financas/configuracoes` e `/financas/pagamentos`.
- [ ] Admin `fpp` e academia conseguem configurar mensalidade e matrícula, versão após versão, com histórico visível.
- [ ] `GPO_QR` aparece normalmente como opção selecionável nas telas de pagamento de propina (estudante) e matrícula (público), sempre que a academia o tiver habilitado — e, quando escolhido, a tela renderiza `cobranca.qrCodeArr` como imagem.
- [ ] Detalhe de `/solicitacoes-matricula` mostra valor/métodos/situação de pagamento quando existentes, e permite à academia cancelar por falta de pagamento no status correto.
- [ ] Página pública de matrícula permite acompanhar uma solicitação existente e pagar a taxa quando aplicável, sem prometer valor antes da aprovação.
- [ ] `/financas/pagamentos` mostra a listagem real de cobranças (`GET /financeiro/cobrancas`), com filtros por origem e estado, paginação, e subtela de detalhe por linha (Parte H.2/H.3), além da seção complementar de mensalidades por estudante (Parte H.4).
- [ ] `/pagamentos` (estudante) mostra o histórico completo de todas as academias e todos os status, e permite pagar mensalidades pendentes por qualquer método habilitado, incluindo `GPO_QR`.
- [ ] Nenhum endpoint inexistente foi inventado; nenhuma listagem foi simulada com dados parciais.
- [ ] Nenhum campo inexistente foi inventado em `ChargeResult` (sem `valor`/`moeda`/`referencia`/`entidade` no nível superior — esses dados, quando existirem, vêm dentro de `response`).

---

## 6. Fora de escopo desta tarefa — recomendações para uma tarefa futura de backend

Registradas aqui apenas para conhecimento; **não implementar agora**, pois esta tarefa é só de frontend. Dois itens que estavam aqui (endpoint de listagem de cobranças, e `qrCodeArr` nas respostas de pagamento) **já foram corrigidos no backend** e por isso saíram desta lista — ver avisos 2.1 e 2.3, ambos marcados `[RESOLVIDO]`.

1. Permitir leitura (GET) das rotas `/financeiro/*` para qualquer papel de admin (não só `fpp`), mantendo escrita restrita a `fpp`, para viabilizar um modo "visualizar mas não executar" de fato em `/financas/configuracoes` e `/financas/pagamentos` para admins `adm`/`gerente` (ver aviso 2.2, ainda em aberto).
2. Fazer `GET /financeiro/appypay/cobrancas/:id` devolver `qrCodeArr` de forma confiável também para uma cobrança `GPO_QR` já existente (hoje só é garantido no momento da criação — ver nota da seção 4.1-A/4.10), para que a subtela de detalhe de `/financas/pagamentos` (Parte H.3) sempre consiga reexibir o QR Code de uma cobrança antiga, não só logo após criá-la.
3. Atualizar a seção "9. Solicitação de Matrícula" e o DTO da seção 2.5 de `Documentação da API.md` para refletir os campos e status de pagamento já implementados (hoje só documentados na seção separada de "Cobrança de matrícula por solicitação").
