---
criado: 2026-06-30
origem: solicitação de atualização frontend após mudanças severas da API
status: pendente
prioridade: crítica
---

# Tarefa — Alinhar frontend com API sem PATCH de anos acadêmicos, sem sumários e com erros estruturados

## Objetivo

Atualizar o front end para ficar compatível com as mudanças severas da API descritas nos resumos:

- `src/docs/Atualizacao remocao PATCH anos academicos para frontend.md`;
- `src/docs/Atualizacao remocao total de sumarios para frontend.md`;
- `src/docs/Atualizacao respostas de erro anos academicos para frontend.md`.

A implementação **não pode se basear apenas nestes resumos**. Para cada ajuste abaixo, é **obrigatório ler e validar a regra completa** em:

- `src/docs/Spuri - API.md`;
- `src/docs/Spuri - Documentação.md`.

> A documentação da API é a fonte de verdade. Os resumos explicam as mudanças, mas a implementação deve confirmar payloads, permissões, exemplos, respostas, erros, tipos de academia, impacto em faltas, cursos, anos acadêmicos, matérias, estudantes, turmas, notas, avaliações finais e fluxos assíncronos diretamente na documentação.

## Contexto validado nos resumos e na documentação

### 1. Anos acadêmicos não têm mais substituição em massa

- `PATCH /academia/anos-academicos` foi removido do contrato público.
- As rotas válidas de anos acadêmicos são:
  - `GET /academia/anos-academicos`;
  - `POST /academia/anos-academicos`;
  - `DELETE /academia/anos-academicos`.
- O fluxo é incremental:
  - `POST` adiciona/habilita escopos;
  - `DELETE` remove/desabilita escopos quando a remoção for segura;
  - não existe “salvar lista completa”, “substituir todos”, `replace`, `patch`, `set`, `update` ou equivalente.
- Escritas por academia autenticada não devem enviar `codigo_academia` no body.
- Admin deve informar `codigo_academia` apenas na query de leitura quando consultar anos de uma academia.
- Curso médio deve manter sequência contínua desde `1_ano_medio`.
- Curso superior não aceita edição direta de anos/períodos/semestres por `/academia/anos-academicos`.
- `PUT /academia/curso/:id/dados` é apenas cadastral e deve rejeitar/remover payloads com `anos_academicos`, `anosAcademicos`, `periodos`, `semestres`, `quantidade_semestres`, `anos` ou equivalentes.

### 2. Sumários/aulas foram removidos totalmente

- A entidade sumário/aula não existe mais no contrato público da API.
- Devem ser removidas telas, rotas, menus, serviços, hooks, tipos, caches, mocks, query keys, filtros, formulários e componentes relacionados a sumários.
- Endpoints removidos:
  - `GET /academia/sumarios`;
  - `GET /academia/sumarios/:id`;
  - `POST /academia/sumarios`;
  - `PUT /academia/sumarios/:id`;
  - `DELETE /academia/sumarios/:id`.
- Faltas continuam existindo, mas são independentes e não aceitam nem retornam `sumario_id`, `sumario_titulo` ou campos equivalentes.

### 3. Erros de anos acadêmicos ficaram estruturados

- As rotas de anos acadêmicos retornam envelope de erro com `error`, `message`, `request_id` e, quando aplicável, `details[]`.
- O front end deve ler `details?.[0]` antes de usar mensagens genéricas.
- `details[0].field` deve destacar o campo do formulário.
- `details[0].message` deve ser exibida ao usuário.
- `details[0].code` deve orientar regras específicas de UI, como bloquear ação, recarregar cursos ou abrir orientação para estudantes ativos vinculados.
- `request_id` deve ser preservado/registrado para suporte.

## Escopo obrigatório de implementação

### 1. Auditoria inicial obrigatória antes de codificar

Antes de alterar componentes, faça uma auditoria com busca textual no código por todos os termos legados e registre os achados na própria implementação/PR:

- `sumario`, `sumário`, `sumarios`, `sumários`;
- `sumario_id`, `sumario_titulo`;
- `/academia/sumarios`;
- `PATCH /academia/anos-academicos`, `.patch('/academia/anos-academicos')`, `substituir`, `replace`, `set`, `update` aplicados a anos acadêmicos;
- `anosAcademicos`, `anos_academicos`, `periodos`, `semestres`, `quantidade_semestres`, `anos` em formulários de cursos;
- tipos/interfaces de `Falta`, payloads de criação/edição de faltas, responses e DTOs;
- menus/rotas de gerenciamento;
- componentes pais e filhos que recebem dados de anos acadêmicos, cursos, faltas e sumários.

Arquivos já identificados como candidatos e que devem ser revisados no mínimo:

- `src/layout/AppSidebar.tsx`;
- `src/lib/route-guards.ts`;
- `src/lib/api/services.ts`;
- `src/types/api.ts`;
- `src/app/(painel)/gerenciamento/anos-academicos/PageContent.tsx`;
- `src/app/(painel)/gerenciamento/anos-academicos/page.tsx`;
- `src/app/(painel)/gerenciamento/sumarios/PageContent.tsx`;
- `src/app/(painel)/gerenciamento/sumarios/page.tsx`;
- `src/app/(painel)/gerenciamento/page.tsx`;
- `src/components/faltas/FaltasAcademia.tsx`;
- `src/components/faltas/FaltasAdmin.tsx`;
- `src/components/faltas/FaltasEstudante.tsx`;
- `src/app/(painel)/faltas/PageContent.tsx`;
- `src/components/paineis/CursosPainel.tsx`;
- componentes de estudantes, turmas, matérias, notas, avaliações, dashboard e configurações que consumam `anos_academicos`, `periodos` ou totais de faltas.

> Não limitar a implementação aos arquivos acima. Eles são pontos de partida. Use a busca no projeto inteiro para garantir que nenhum código legado fique de fora.

### 2. Remover sumários/aulas por completo

#### 2.1. Roteamento, páginas e navegação

- Remover a rota/página de sumários do front end.
- Remover o item `Sumários` do menu lateral e de qualquer card, atalho, breadcrumb ou navegação em `gerenciamento`.
- Se a URL antiga `/gerenciamento/sumarios` ainda existir por compatibilidade técnica, ela deve apenas redirecionar para uma área válida, preferencialmente `/faltas` ou `/gerenciamento`, ou exibir uma página simples informando que o recurso foi removido. Não deve carregar chamadas de sumários.
- Atualizar guardas/permissões para não listar nem autorizar uma feature removida.

#### 2.2. Serviços, hooks, API client, cache e tipos

- Remover todos os métodos de serviço dedicados a `/academia/sumarios`.
- Remover tipos/interfaces `Sumario`, payloads de criar/editar/listar/detalhar sumários e responses associadas.
- Remover query keys, stores, estados locais, mocks, fixtures, seeds e helpers de sumários.
- Remover imports e props de sumários em componentes pais e filhos.
- Remover qualquer tratamento de `404` para sumários que tente fallback, alias ou retry automático.

#### 2.3. Faltas sem vínculo com sumário

Atualizar todos os fluxos de faltas para respeitarem a API atual:

- Formulário de criação de falta deve enviar somente campos aceitos pela documentação, como:
  - `codigo_estudante`;
  - `data` em `YYYY-MM-DD`;
  - `materia_disciplinar_id`;
  - `quantidade`;
  - `observacao` quando houver.
- Formulário de atualização/correção de falta deve enviar apenas campos próprios da falta e `observacao` como justificativa quando a documentação exigir.
- Não carregar lista de sumários para lançar/corrigir faltas.
- Não exibir seletor de sumário.
- Não mostrar coluna, badge, chip, detalhe ou texto com `sumario_titulo`.
- Tipos `Falta`, `FaltaRegistroDTO`, payloads e responses não devem esperar `sumario_id` nem `sumario_titulo`.
- Componentes de listagem/detalhe de faltas em academia, admin e estudante devem exibir apenas dados próprios e vínculos válidos: estudante, matéria, data, quantidade, ano letivo, ano acadêmico, curso/turma quando documentado e observação.
- Atualizar integrações assíncronas de faltas para não aceitarem campos de sumário em lote.

### 3. Migrar anos acadêmicos para fluxo incremental sem PATCH

#### 3.1. Serviços e tipos

- Remover `gerirAnosAcademicosPatch`, `patchAnosAcademicos`, ou qualquer chamada equivalente a `api.patch('/academia/anos-academicos')`.
- Remover tipos/payloads que representem substituição completa de lista.
- Tipar explicitamente payloads permitidos:
  - fundamental: `{ type: 'fundamental'; anos_academicos: string[] }`;
  - médio: `{ type: 'medio'; curso_id: string; anos_academicos: string[] }`;
  - superior: **sem escrita por `/academia/anos-academicos`**.
- Separar mutations/handlers de adicionar e remover:
  - `POST /academia/anos-academicos` para adicionar/habilitar;
  - `DELETE /academia/anos-academicos` para remover/desabilitar.
- Para `DELETE`, confirmar na documentação se o body deve ser enviado por `data`/config do cliente HTTP e manter o formato aceito pelo client atual.
- Não enviar `codigo_academia` no body de `POST`/`DELETE` de academia autenticada.
- Para leitura por admin, enviar `codigo_academia` em query string quando o usuário for admin e estiver consultando uma academia específica.

#### 3.2. Página `/gerenciamento/anos-academicos`

A página deve ser reestruturada para ações explícitas e incrementais:

- Manter `GET /academia/anos-academicos` como fonte de leitura.
- Remover qualquer botão/fluxo de “salvar tudo”, “substituir lista”, “aplicar configuração completa” ou equivalente.
- Exibir estado atual de anos fundamentais da academia, anos de cursos médios e semestres/anos derivados de cursos superiores.
- Para academia fundamental:
  - permitir adicionar anos fundamentais válidos por `POST`;
  - permitir remover anos fundamentais válidos por `DELETE`;
  - não bloquear academia com `nivel='escola'` e `nivel_escolar='fundamental'` quando `type='fundamental'`;
  - impedir ação que deixaria a academia fundamental/mista sem nenhum ano ativo quando a documentação indicar esse bloqueio.
- Para academia média:
  - exigir seleção de curso médio;
  - permitir adicionar/remover anos por curso médio;
  - validar que a lista final continue contínua, crescente e iniciada em `1_ano_medio`;
  - bloquear remoção de todos os anos do curso antes do envio;
  - orientar correção em caso de curso inativo, inexistente ou de outra academia.
- Para academia mista:
  - separar visualmente seção fundamental da academia e seção médio por curso;
  - aplicar as mesmas regras de fundamental e médio sem misturar payloads.
- Para academia superior:
  - ocultar/desabilitar escrita direta por `/academia/anos-academicos`;
  - exibir somente leitura dos cursos superiores, semestres (`periodos`) e anos superiores derivados;
  - orientar que alteração de curso superior deve seguir a documentação de cursos, e que `PUT /academia/curso/:id/dados` não manipula períodos.
- Remover menções antigas de dependência com sumários nas mensagens de bloqueio. Bloqueios devem mencionar apenas entidades ainda existentes/documentadas, como estudantes ativos, turmas, matérias, notas, faltas e avaliações finais.

#### 3.3. Validações de UI para médio

- A UI deve calcular o estado final antes de enviar `POST` ou `DELETE`.
- A lista final de anos médios deve:
  - conter `1_ano_medio`;
  - não ter lacunas;
  - não ter duplicados;
  - estar em ordem lógica;
  - não ficar vazia.
- Se o usuário tentar remover `1_ano_medio` mantendo `2_ano_medio`, bloquear antes do envio e explicar que cursos médios devem ser contínuos desde o 1.º ano.

### 4. Melhorar tratamento de erros de anos acadêmicos

Criar ou atualizar utilitário comum de tratamento de erros da API para usar erros estruturados:

- Ler `response.details?.[0]` antes de `response.message`.
- Mapear `field` para erro de campo no formulário.
- Exibir `details[0].message` em toast/alerta.
- Usar `details[0].code` para ações específicas:
  - `json_invalido`: erro geral de payload mal formado;
  - `valor_invalido`: destacar campo de tipo ou período;
  - `nivel_incompativel`: ocultar/bloquear ação incompatível com o perfil da academia;
  - `tipo_diferente_do_curso`: recarregar/validar tipo do curso selecionado;
  - `campo_obrigatorio`: exigir o campo indicado;
  - `nao_encontrado`: recarregar listas e informar que o recurso não existe mais;
  - `curso_de_outra_academia`: recarregar cursos da academia autenticada;
  - `curso_inativo`: orientar ativação do curso;
  - `formato_invalido`: mostrar formatos aceitos;
  - `remocao_invalida`: bloquear remoção que deixaria escopo inválido;
  - `campo_nao_permitido`: remover campo do payload e corrigir formulário;
  - `valor_invalido` em `periodos`: exigir inteiro positivo quando a rota documentada aceitar `periodos`;
  - `estudantes_ativos_vinculados`: abrir orientação bloqueante para transferir, concluir ou inativar estudantes antes de tentar novamente.
- Registrar `request_id` em log de suporte, console controlado ou estrutura de erro visível para atendimento.
- Manter fallback para `message` quando `details` não vier.
- Não fazer reenvio automático de operações bloqueadas por `409`.

### 5. Atualizar gerenciamento de cursos

#### 5.1. Criação de curso superior

- Confirmar na documentação da API que curso superior recebe `periodos` como número inteiro positivo no `POST /academia/curso`.
- Não enviar `anos_academicos` para curso superior.
- Não enviar lista manual de semestres para criar curso superior.
- Exibir semestres retornados pela API (`1_semestre`, `2_semestre`, etc.) e anos derivados (`ceil(periodos / 2)`) quando vierem na resposta.
- Validar `periodos` como inteiro positivo antes do envio.

#### 5.2. Criação de curso médio

- Confirmar na documentação que curso médio usa `anos_academicos` contínuos desde `1_ano_medio`.
- Não enviar `periodos` numérico para curso médio.
- Bloquear listas fora de ordem, com lacuna, duplicadas ou iniciadas em `2_ano_medio`.

#### 5.3. Edição cadastral de curso

- `PUT /academia/curso/:id/dados` deve enviar apenas dados cadastrais permitidos, como `nome`.
- Remover desse fluxo todos os campos acadêmicos:
  - `anos_academicos`;
  - `anosAcademicos`;
  - `periodos`;
  - `semestres`;
  - `quantidade_semestres`;
  - `anos`.
- Se a UI atual usa o mesmo formulário para criar e editar, separar payload de criação e payload de edição para evitar vazamento de campos proibidos.
- Em edição, exibir anos/semestres como informação de leitura, não como campos enviados pela rota cadastral.

### 6. Atualizar componentes em cascata

A alteração deve percorrer componentes pais e filhos para evitar props/tipos legados:

- Layout e navegação:
  - remover feature de sumários do menu lateral;
  - atualizar grupos de gerenciamento;
  - revisar breadcrumbs e links diretos.
- Guardas de rota:
  - remover permissão para sumários;
  - garantir acesso de anos acadêmicos somente para perfis documentados;
  - tratar rota legada de sumários sem chamar API removida.
- Serviços de API:
  - remover endpoints de sumários;
  - remover PATCH de anos acadêmicos;
  - ajustar payloads de faltas;
  - ajustar payloads de cursos.
- Tipos globais:
  - remover tipos de sumário;
  - remover campos de sumário de faltas;
  - separar tipos de criação/edição de cursos;
  - separar tipos de adicionar/remover anos acadêmicos.
- Páginas de faltas:
  - atualizar componentes de admin, academia e estudante;
  - remover qualquer exibição de sumário;
  - garantir que filtros e tabelas continuem funcionando sem campos de sumário.
- Página de anos acadêmicos:
  - atualizar estado, validações, formulários, mensagens e handlers;
  - remover fluxos de substituição e superior direto.
- Página/painel de cursos:
  - ajustar criação/edição e apresentação de médio/superior.
- Dashboard, estudantes, turmas, matérias, notas, avaliações finais e configurações:
  - revisar qualquer consumo de `anos_academicos` e `periodos` para assegurar que superior usa `periodos`/semestres quando documentado;
  - remover qualquer referência residual a sumários;
  - garantir que totais de faltas não dependam de sumários.
- AI do front end:
  - atualizar qualquer prompt, assistente interno, helper de geração, automação, sugestão, mock de resposta ou instrução usada pelo front end para não sugerir endpoints de sumários, `PATCH /academia/anos-academicos`, substituição em massa, `sumario_id` ou `sumario_titulo`;
  - a AI deve orientar usuários e desenvolvedores conforme a documentação atual: faltas independentes, anos acadêmicos incrementais e cursos superiores com períodos derivados pelo backend.

### 7. Redirecionamento/compatibilidade de rota antiga de sumários

- Usuário com favorito antigo para `/gerenciamento/sumarios` não deve ver erro quebrado nem acionar endpoint removido.
- Implementar uma das opções:
  - redirecionar para `/faltas` com aviso de que sumários foram removidos; ou
  - redirecionar para `/gerenciamento`; ou
  - renderizar página informativa sem chamada HTTP.
- Não manter formulário oculto ou código morto de sumário nessa rota.

## Critérios de aceite

- Não existe chamada `PATCH /academia/anos-academicos` no código de produção, testes, mocks ou serviços.
- Não existe chamada `/academia/sumarios` no código de produção, testes, mocks ou serviços.
- Menus e rotas não apresentam `Sumários` como recurso ativo.
- Faltas não enviam nem esperam `sumario_id`, `sumario_titulo` ou equivalentes.
- A página de faltas funciona para admin, academia e estudante sem dependência de sumários.
- A página de anos acadêmicos usa somente `GET`, `POST` e `DELETE` conforme a documentação.
- A página de anos acadêmicos separa adicionar/remover e não possui “substituir todos”.
- Curso médio mantém sequência contínua desde `1_ano_medio` em criação e gestão incremental.
- Curso superior não é alterado por `/academia/anos-academicos` e não envia `anos_academicos` em criação.
- Edição cadastral de curso não envia campos acadêmicos proibidos.
- Erros estruturados de anos acadêmicos destacam campo, mostram mensagem específica e preservam `request_id`.
- Bloqueios `409` por estudantes ativos vinculados são tratados sem retry automático.
- Nenhuma mensagem ao usuário menciona sumários como dependência ativa de bloqueio.
- Código compila e lint/checks do projeto passam, ou eventuais limitações de ambiente ficam documentadas.
- Foi feita busca final por termos legados e os resultados restantes, se existirem, são justificados como documentação histórica ou rota informativa sem integração com API removida.

## Checks obrigatórios sugeridos

Executar no mínimo:

```bash
rg -n "academia/sumarios|sumario_id|sumario_titulo|Sumario|sumários|sumarios" src --glob '!src/docs/**'
rg -n "patch<.*anos-academicos|\.patch\([^\n]*anos-academicos|PATCH /academia/anos-academicos|substituir|replace|patch|set|update" src --glob '!src/docs/**'
rg -n "anosAcademicos|anos_academicos|periodos|semestres|quantidade_semestres" src --glob '!src/docs/**'
yarn lint
```

> Os `rg` de termos acadêmicos podem retornar usos válidos. A obrigação é revisar cada ocorrência e confirmar que ela está alinhada à documentação atual.

## Observações técnicas

- Não colocar imports dentro de `try/catch`.
- Preferir helpers tipados e reutilizáveis para payloads e tratamento de erros.
- Evitar “apenas esconder UI”: integrações removidas devem sair de serviços, tipos e fluxos de dados.
- Manter padrões de tema claro/escuro e UX existentes.
- Ao alterar comportamento visual perceptível, validar manualmente as telas principais.
- Atualizar qualquer teste existente afetado por sumários, faltas, cursos e anos acadêmicos.
- Quando houver divergência entre resumo e documentação da API, seguir a documentação e registrar a decisão no PR.
