---
criado: 2026-07-02
origem: solicitação de alinhamento integral do frontend às atualizações da API
status: pendente
prioridade: crítica
---

# Tarefa — Depurar e implementar atualizações completas da API no frontend

## Objetivo

Atualizar o frontend para refletir **todas as mudanças recentes da API**, implementando cada rota exatamente conforme o contrato documentado, com requests, responses, validações, permissões e tipos do frontend aderentes às estruturas de dados oficiais.

A implementação deve ser precedida por uma auditoria completa da documentação em `src/docs` e do código do frontend. Não é permitido ajustar apenas telas visíveis ou apenas rotas já conhecidas: cada arquivo documental e cada fluxo que consome API deve ser verificado criticamente para determinar se precisa de atualização.

## Fontes obrigatórias de verdade

Antes de implementar qualquer alteração, ler e cruzar as regras em:

- `src/docs/Spuri - API.md`, como fonte de verdade para rotas, payloads, responses, erros, permissões e exemplos;
- `src/docs/Spuri - Documentação.md`, como fonte de verdade para processos de negócio, regras académicas, papéis de usuário, níveis de academia e comportamento esperado do produto;
- todos os demais arquivos em `src/docs`, incluindo tarefas, atualizações, notas técnicas e documentação complementar.

> A implementação deve seguir a documentação mais específica e atualizada. Se houver divergência entre arquivos, registrar a divergência na tarefa/PR, confirmar o contrato final pela documentação da API e adaptar o frontend sem criar compatibilidade silenciosa com formatos antigos.

## Auditoria obrigatória de `/src/docs`

Antes de codificar, depurar arquivo por arquivo dentro de `src/docs` e classificar cada documento como:

1. **fonte obrigatória de implementação**;
2. **documentação funcional complementar**;
3. **tarefa já incorporada ao contrato atual**;
4. **documentação histórica que não deve guiar implementação nova**;
5. **documentação conflitante que precisa de esclarecimento ou anotação no PR**.

A auditoria deve verificar, no mínimo:

- rotas novas, removidas ou alteradas;
- mudanças em métodos HTTP;
- mudanças em query params, path params e body;
- envelopes de sucesso e erro;
- `request_id`, `details[]`, códigos de erro e mensagens de validação;
- permissões por tipo de usuário;
- diferenças entre estudante, admin e academia;
- diferenças entre academias de nível fundamental, médio, superior e mistas;
- impactos em cursos, matérias disciplinares, turmas, estudantes, notas, faltas, avaliações finais, regras de avaliação final, matrícula, autenticação, configurações e dashboards.

A conclusão da auditoria deve ser registrada na implementação/PR com a lista dos arquivos revisados e o impacto identificado.

## Escopo técnico obrigatório

### 1. Contratos de API e tipagem do frontend

Implementar ou corrigir todos os tipos do frontend para seguirem rigorosamente as estruturas documentadas pela API:

- DTOs de request;
- DTOs de response;
- envelopes de paginação/listagem;
- envelopes de erro;
- enums e unions discriminadas por nível, tipo de usuário, status e tipo de operação;
- tipos derivados de entidades como academia, curso, matéria disciplinar, estudante, turma, falta, nota, avaliação final, regra de avaliação final, matrícula e configuração.

Regras obrigatórias:

- não usar `any` para contornar divergência com a API;
- não manter campos legados em tipos públicos se a API não documenta mais esses campos;
- não enviar propriedades extras nos payloads;
- não inferir estruturas por conveniência do componente quando a API documenta outro formato;
- separar tipos de criação, edição parcial, edição total, leitura, listagem e erro quando a API diferenciar esses contratos;
- modelar formatos diferentes por nível de academia com unions explícitas, não com objetos frouxos opcionais.

### 2. Serviços, clients, hooks e mutations

Auditar e atualizar todos os pontos que chamam API:

- `src/lib/api` e arquivos equivalentes;
- hooks de query/mutation;
- componentes que chamam serviços diretamente;
- caches, query keys, invalidations e revalidações;
- mocks, fixtures e dados temporários;
- handlers assíncronos e importações em lote.

Para cada rota documentada na API:

- confirmar método HTTP correto;
- confirmar path e path params;
- confirmar query params;
- confirmar body permitido;
- confirmar response esperada;
- confirmar permissões e visibilidade por perfil;
- confirmar comportamento de erro;
- confirmar invalidação de cache após escrita;
- confirmar telas e estados que dependem da resposta.

Rotas removidas ou formatos antigos devem ser eliminados do frontend, incluindo menus, páginas, services, tipos, mocks, testes e fallbacks.

### 3. Tratamento de erros estruturados

Padronizar o tratamento de erros da API em toda a aplicação:

- ler `details[0].message` antes de mensagens genéricas;
- mapear `details[0].field` para erro visual no formulário;
- usar `details[0].code` para orientar bloqueios, recarregamentos e mensagens específicas;
- preservar e exibir/registrar `request_id` para suporte;
- evitar retries automáticos em erros de validação, autorização ou conflito;
- manter fallback seguro quando a API retornar apenas `message`.

A UI deve ser clara, auditável e útil para o usuário, principalmente em operações académicas críticas.

## Escopo funcional obrigatório

### 1. UI/UX dinâmica por usuário logado

Garantir que o frontend reflita o uso diferenciado por perfil, mantendo e aprimorando o padrão existente de visões diferentes para:

- estudante;
- admin;
- academia;
- admins com responsabilidades distintas;
- academias de níveis diferentes.

A UI deve:

- ocultar ações indisponíveis para o perfil atual;
- desabilitar ações bloqueadas com explicação objetiva;
- carregar apenas dados permitidos ao usuário;
- evitar menus e atalhos para funcionalidades sem permissão;
- separar claramente fluxos de gestão, consulta e operação diária;
- respeitar regras de academia fundamental, média, superior e mista;
- adaptar labels, filtros, colunas, formulários e estados vazios ao contexto do usuário logado.

### 2. Regras de avaliação final — caso especial obrigatório

A área de configuração de regras de avaliação final deve receber atenção especial.

Implementar uma UI intuitiva, versátil e segura que permita configurar regras considerando que academias diferentes configuram avaliação final de maneiras diferentes conforme nível e estrutura académica.

A interface deve suportar, conforme documentado pela API e pelas regras de negócio:

- escopo por nível de academia;
- escopo por curso quando aplicável;
- escopo por ano académico quando aplicável;
- matérias aplicáveis ao escopo selecionado;
- diferenças entre fundamental, médio, superior e academias mistas;
- regras ativas/inativas;
- conflitos de escopo;
- validação de payload antes do envio;
- preview/resumo da regra que será salva;
- mensagens claras para formatos inválidos;
- edição sem perda de dados já configurados;
- bloqueio de combinações não documentadas pela API.

A UI não deve forçar um modelo único rígido se academias de níveis diferentes configuram a regra de modo diferente. O layout deve ser modular e versátil, por exemplo:

- seletor inicial de nível/escopo;
- blocos condicionais por curso e ano;
- seleção de matérias filtrada pelo escopo;
- cards ou painéis por curso/ano;
- validações inline;
- resumo final antes de salvar;
- estados de ajuda contextual explicando a regra de negócio.

Qualquer formato legado de regra de avaliação final deve ser removido ou migrado explicitamente, sem inferência silenciosa que possa gerar decisão académica incorreta.

### 3. Menção honrosa obrigatória: cursos e matérias disciplinares

Cursos e matérias disciplinares devem ser tratados como prioridade alta na atualização, pois influenciam várias outras áreas.

Auditar e implementar corretamente:

- criação, edição, listagem, ativação/inativação e detalhes de cursos;
- diferenças entre curso médio e superior;
- períodos/semestres quando aplicável;
- anos académicos associados ou derivados;
- matérias disciplinares por nível, curso e ano/período;
- filtros por curso, ano académico, nível e status;
- validações que impedem matéria fora do escopo do curso/ano;
- impactos em turmas, estudantes, notas, faltas e avaliações finais.

A UI deve tornar evidente para o usuário quando uma matéria pertence a um curso, ano, período ou nível específico.

## Checklist de implementação por domínio

### Autenticação e sessão

- Validar login, recuperação de senha, verificação de e-mail e matrícula pública.
- Garantir que o usuário logado expõe papel, permissões, academia e responsabilidades suficientes para a UI dinâmica.
- Confirmar redirecionamentos e guards após mudanças de contrato.

### Academias

- Atualizar tipos, formulários e telas conforme a API.
- Respeitar níveis de academia e suas implicações funcionais.
- Garantir que admins e academias vejam ações adequadas ao seu perfil.

### Configurações académicas

- Atualizar ano letivo, categorias de nota, anos académicos e regras de avaliação final conforme contrato atual.
- Remover fluxos obsoletos e métodos removidos pela API.
- Usar erros estruturados para bloqueios de negócio.

### Cursos

- Implementar payloads e responses atuais.
- Diferenciar corretamente médio e superior.
- Não enviar campos não documentados.
- Atualizar filtros e seleção em telas dependentes.

### Matérias disciplinares

- Implementar contrato atual com escopo por nível, curso e ano/período.
- Garantir que matérias exibidas em notas, faltas, turmas e avaliações finais estejam filtradas corretamente.

### Turmas e estudantes

- Atualizar fluxos de matrícula, cadastro, edição, listagem e detalhe.
- Respeitar curso, ano académico, academia e status.
- Garantir que estudantes vejam apenas dados próprios.

### Notas, testes e avaliações

- Atualizar payloads e responses.
- Confirmar categorias, pesos, estados e permissões.
- Adaptar telas por perfil.

### Faltas

- Confirmar campos atuais de lançamento, correção, listagem e detalhe.
- Remover qualquer vínculo ou fallback para entidades removidas.
- Filtrar matéria, estudante e turma conforme documentação.

### Avaliações finais

- Atualizar regras, execução, leitura de resultados, pendências e histórico.
- Garantir consistência entre regra configurada, matérias aplicáveis e execução final.

### Dashboards e navegação

- Atualizar cards, contadores, atalhos, menus e breadcrumbs conforme funcionalidades realmente disponíveis.
- Evitar cards baseados em rotas removidas ou responses antigas.

## Critérios de aceite

A tarefa só pode ser considerada concluída quando:

1. todos os arquivos de `/src` tiverem sido auditados e classificados;
2. todas as rotas documentadas em `Spuri - API.md` usadas pelo frontend tiverem serviço/tipo compatível ou decisão registrada de não uso;
3. todos os payloads enviados pelo frontend seguirem exatamente o contrato da API;
4. todos os responses consumidos estiverem tipados conforme documentação;
5. erros estruturados forem tratados de forma uniforme;
6. a UI mudar dinamicamente conforme usuário logado, responsabilidades e nível da academia;
7. regras de avaliação final tiverem UI versátil para diferentes configurações por academia;
8. cursos e matérias disciplinares estiverem alinhados com o contrato atual;
9. rotas, menus, services, tipos e mocks obsoletos forem removidos;
10. testes e checks do projeto passarem ou tiverem limitação ambiental justificada.

## Validação obrigatória

Ao finalizar, executar no mínimo:

- typecheck do projeto;
- lint;
- build;
- testes existentes;
- busca textual por rotas e campos removidos pela API;
- navegação manual ou verificação visual das telas alteradas, incluindo screenshot se houver mudança perceptível em aplicação web executável.

O PR deve listar:

- documentos de `src/docs` auditados;
- rotas ajustadas;
- tipos criados/alterados/removidos;
- telas alteradas;
- serviços/hooks alterados;
- decisões tomadas diante de divergências documentais;
- testes executados;
- riscos remanescentes.
