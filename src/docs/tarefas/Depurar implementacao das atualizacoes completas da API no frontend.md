---
criado: 2026-07-02
origem: solicitação de auditoria da implementação frontend das atualizações completas da API
status: pendente
prioridade: crítica
---

# Tarefa — Depurar implementação das atualizações completas da API no frontend

## Objetivo

Fazer uma auditoria crítica, completa e arquivo por arquivo da implementação da tarefa:

`src/docs/tarefas/Tarefa - Depurar e implementar atualizacoes completas da API no frontend.md`

A auditoria deve confirmar se a implementação foi feita corretamente, completamente e **à risca**. Caso qualquer parte esteja incompleta, inconsistente, parcialmente implementada, sem validação, sem teste, sem documentação, com comportamento silencioso incorreto ou divergente do contrato atual da API, esta tarefa exige **ajustar ou implementar o que falta no frontend**.

Esta tarefa é uma etapa de validação final. O objetivo não é apenas verificar telas principais: é garantir que todo o frontend esteja aderente às atualizações completas da API, removendo contratos antigos, payloads obsoletos, fallbacks silenciosos, tipos frouxos, mocks divergentes e fluxos incompletos.

## Fontes obrigatórias de verdade

Antes de alterar código, ler e cruzar obrigatoriamente:

- `src/docs/tarefas/Tarefa - Depurar e implementar atualizacoes completas da API no frontend.md`, como especificação original da implementação a ser auditada;
- `src/docs/Spuri - API.md`, como fonte de verdade para rotas, payloads, responses, envelopes, erros, permissões e exemplos;
- `src/docs/Spuri - Documentação.md`, como fonte de verdade para regras de negócio, papéis, níveis de academia e comportamento esperado;
- todos os demais arquivos em `src/docs`, incluindo tarefas, atualizações, notas técnicas e documentação complementar;
- o código real do frontend, incluindo tipos, services, hooks, pages, components, stores, guards, mocks, testes e integrações.

> Se houver divergência entre documentação e implementação, não criar compatibilidade silenciosa. Confirmar o contrato mais específico e atualizado pela documentação da API, ajustar o frontend e registrar a divergência no relatório/PR.

## Regra de execução obrigatória

Esta tarefa deve ser executada em duas fases inseparáveis:

1. **Auditoria e classificação dos achados**: investigar o repositório e produzir uma lista objetiva de conformidades, lacunas e riscos.
2. **Correção imediata**: para cada lacuna encontrada, implementar o ajuste necessário no frontend, incluindo tipos, requests, UI, validações, tratamento de erro, cache, testes e documentação quando aplicável.

Não é aceitável concluir apenas com um relatório se houver problema corrigível no frontend.

## Escopo mínimo da investigação

Auditar, no mínimo:

1. contratos TypeScript de request, response, entidades, enums, unions, paginação e erro;
2. clients HTTP, interceptors, normalização de erro e configuração de autenticação;
3. services e funções de API por domínio;
4. hooks de query/mutation, query keys, invalidations e revalidações;
5. pages, layouts, menus, guards e redirecionamentos por perfil;
6. componentes de formulário, tabelas, filtros, modais, cards, estados vazios e mensagens de erro;
7. stores/contextos que guardam usuário, academia, permissões, cursos, anos acadêmicos, matérias, estudantes, turmas, notas, faltas, avaliações finais, regras de avaliação final e configurações;
8. mocks, fixtures, factories, seeds, testes e dados temporários usados no frontend;
9. qualquer chamada direta a `fetch`, `axios`, client customizado ou wrapper equivalente fora da camada esperada;
10. rotas, menus e componentes legados removidos do contrato público.

## Checklist obrigatório de validação

### 1. Evidência de auditoria de `/src/docs`

Confirmar que a implementação auditada leu e classificou todos os documentos de `src/docs`, conforme exigido na tarefa original.

Validar que a implementação registrou, no mínimo:

- arquivos revisados;
- classificação de cada arquivo;
- impacto ou ausência de impacto no frontend;
- divergências encontradas entre documentação funcional, documentação de API e tarefas complementares;
- decisão final adotada quando havia conflito.

Se essa evidência não existir, produzi-la durante esta auditoria e anexar ao PR/relatório.

### 2. Busca ampla por contratos antigos e formatos removidos

Fazer busca ampla e classificar todas as ocorrências dos termos abaixo, separando ocorrência aceitável, histórica, teste intencional ou bug ativo:

- `sumario`, `sumário`, `sumarios`, `sumários`, `sumario_id`, `sumario_titulo`;
- `/academia/sumarios`;
- `PATCH /academia/anos-academicos`, `.patch('/academia/anos-academicos')`, `replace`, `set`, `substituir`, `salvar lista`, `update` aplicado a anos acadêmicos;
- `tipo_ensino`, `tipoEnsino`, `tipo ensino`;
- `anosAcademicos`, `anos_academicos`, `periodos`, `semestres`, `quantidade_semestres`, `anos` em payloads de curso quando não documentados;
- `materias_aplicaveis`, `materiasAplicaveis`, `materias_chave`, `materiasChave`;
- `curso_id`, `cursoId`, `ano_academico`, `anoAcademico`, `materia_id`, `materiaId` nos fluxos de regras de avaliação final;
- usos de `any`, `unknown as`, casts duplos, objetos indexados frouxos ou campos opcionais usados para contornar divergências de contrato;
- chamadas diretas a endpoints não centralizadas na camada de API;
- nomes de campos camelCase enviados no body quando a API documenta snake_case, e vice-versa, conforme contrato real de cada rota.

Qualquer ocorrência ativa divergente do contrato atual deve ser removida ou corrigida.

### 3. Contratos de API e tipos do frontend

Confirmar que todos os tipos públicos do frontend refletem exatamente a API documentada:

- DTOs de criação, edição total, edição parcial, leitura e listagem;
- responses paginadas e não paginadas;
- envelopes de erro com `error`, `message`, `request_id` e `details[]`;
- enums e literais de nível, tipo de usuário, status, tipo de curso, ano acadêmico, período e escopo;
- unions discriminadas para diferenças entre fundamental, médio, superior e academia mista;
- tipos específicos para cursos, matérias disciplinares, turmas, estudantes, faltas, notas, avaliações finais, regras de avaliação final, matrícula, autenticação e configurações.

Validar que:

- não há campos legados em tipos usados para payloads novos;
- não há propriedades extras enviadas para a API;
- não há tipos globais permissivos substituindo contratos específicos por domínio;
- requests e responses com formatos diferentes não compartilham a mesma interface indevidamente;
- mocks e testes seguem os mesmos tipos reais.

### 4. Rotas, métodos, parâmetros e payloads

Para cada rota documentada em `src/docs/Spuri - API.md`, confirmar se o frontend:

- usa o método HTTP correto;
- usa path params e query params corretos;
- envia apenas body permitido;
- interpreta o response correto;
- trata permissões e visibilidade por perfil;
- invalida caches corretos após mutações;
- remove chamadas a rotas descontinuadas;
- não cria fallback para formatos antigos;
- apresenta erro claro quando o backend retorna validação, conflito, autorização ou recurso inexistente.

Dar atenção especial a rotas de:

- autenticação, sessão, recuperação de senha e matrícula pública;
- academias e configurações acadêmicas;
- anos acadêmicos;
- cursos;
- matérias disciplinares;
- turmas;
- estudantes;
- notas, testes e avaliações;
- faltas;
- avaliações finais;
- regras de avaliação final;
- dashboards e relatórios.

### 5. Erros estruturados

Confirmar que a UI trata erros da API de forma padronizada e útil:

- `details[0].message` deve ter prioridade sobre mensagens genéricas;
- `details[0].field` deve mapear erro visual no campo correto quando houver formulário;
- `details[0].code` deve orientar bloqueios, recarregamentos ou mensagens específicas;
- `request_id` deve ser preservado e exibido ou registrado para suporte;
- erros de validação, autorização e conflito não devem sofrer retry automático indevido;
- fallback seguro deve existir apenas para respostas sem `details`.

Verificar se esse padrão foi aplicado em anos acadêmicos, cursos, matérias, estudantes, notas, faltas, avaliações finais e regras de avaliação final.

### 6. UI dinâmica por usuário e nível de academia

Confirmar que a interface se adapta corretamente a:

- estudante;
- admin;
- academia;
- admins com responsabilidades específicas;
- academia fundamental;
- academia média;
- academia superior;
- academia mista.

Validar que menus, botões, formulários, filtros, colunas, ações em massa e estados vazios:

- não aparecem para perfis sem permissão;
- aparecem desabilitados com explicação quando a ação é conhecida mas bloqueada;
- não carregam dados fora do escopo permitido;
- não expõem atalhos para funcionalidades removidas;
- diferenciam corretamente regras e labels por nível de academia;
- respeitam permissões documentadas pela API e pelas regras de negócio.

### 7. Caso crítico: regras de avaliação final

Auditar profundamente a UI, tipos, services, hooks e validações de regras de avaliação final.

Confirmar que o frontend suporta corretamente:

- `nivel` como nomenclatura pública, sem `tipo_ensino` ativo;
- escopo por nível;
- escopo por curso quando aplicável;
- escopo por ano acadêmico quando aplicável;
- matérias aplicáveis ao escopo selecionado;
- diferenças entre fundamental, médio, superior e academias mistas;
- regras ativas/inativas;
- validação de conflitos de escopo;
- preview/resumo antes de salvar;
- edição sem perda de dados;
- bloqueio de combinações não documentadas;
- mensagens claras para formatos inválidos;
- responses e erros estruturados da API.

Regras adicionais obrigatórias:

- regra `fundamental` deve enviar `anos_academicos` apenas como array simples de strings, quando documentado;
- regra `medio` deve enviar `anos_academicos` apenas como lista por `curso_id` + `anos_academicos`, quando documentado;
- regra `superior` não deve enviar `anos_academicos`;
- `materias_aplicaveis` não pode ser lista simples global se o contrato atual exigir escopo por nível/curso/ano;
- qualquer formato legado deve ser removido, não convertido silenciosamente.

### 8. Cursos e matérias disciplinares

Confirmar que cursos e matérias foram implementados conforme contrato atual:

- criação, edição, listagem, ativação/inativação e detalhe de cursos;
- diferenças entre curso médio e superior;
- anos acadêmicos de curso médio e períodos/semestres de curso superior;
- `materias_chave` por ano nos cursos médios, quando exigido;
- validações que impedem curso médio sem matérias-chave por ano;
- matérias disciplinares por nível, curso e ano/período;
- filtros por curso, ano acadêmico, nível e status;
- seleções em turmas, estudantes, notas, faltas e avaliações finais usando apenas matérias aplicáveis;
- remoção de campos não documentados em payloads de curso e matéria.

### 9. Anos acadêmicos sem substituição em massa

Confirmar que o frontend não usa mais fluxo de substituição total de anos acadêmicos.

Validar que:

- não existe `PATCH /academia/anos-academicos` ativo;
- `GET /academia/anos-academicos` é usado para leitura;
- `POST /academia/anos-academicos` adiciona/habilita escopos;
- `DELETE /academia/anos-academicos` remove/desabilita escopos quando permitido;
- a UI não oferece botão de “salvar lista completa” se isso gerar substituição em massa;
- curso superior não tenta editar períodos por `/academia/anos-academicos`;
- `PUT /academia/curso/:id/dados` não recebe campos proibidos de anos, períodos, semestres ou quantidades.

### 10. Sumários/aulas removidos

Confirmar remoção completa da entidade de sumários/aulas do frontend:

- páginas;
- rotas;
- menus;
- services;
- hooks;
- query keys;
- tipos;
- mocks;
- fixtures;
- testes;
- filtros;
- vínculos com faltas;
- campos `sumario_id`, `sumario_titulo` ou equivalentes em payloads/responses de falta.

Ocorrências históricas em documentação antiga devem ser classificadas e não podem alimentar código ativo.

### 11. Testes e validação programática

Ao concluir ajustes, executar a maior cobertura viável de validação do frontend, incluindo conforme disponível:

- typecheck;
- lint;
- testes unitários;
- testes de componentes;
- testes de integração/e2e;
- build de produção.

Se algum teste não puder rodar por limitação de ambiente, registrar comando, erro e motivo. Se falhar por problema real do código, corrigir antes de concluir.

## Critérios de aceite

A tarefa só pode ser considerada concluída quando:

- todos os documentos relevantes em `src/docs` tiverem sido considerados;
- todas as chamadas de API do frontend estiverem alinhadas ao contrato atual;
- contratos antigos tiverem sido removidos do código ativo;
- erros estruturados forem tratados de forma consistente;
- regras de avaliação final, cursos, matérias, anos acadêmicos e sumários removidos tiverem sido validados com atenção especial;
- perfis de usuário e níveis de academia tiverem UI coerente e segura;
- mocks e testes não mascararem contratos antigos;
- typecheck/lint/build/testes aplicáveis tiverem sido executados ou justificados;
- o relatório/PR listar arquivos revisados, problemas encontrados, correções aplicadas e riscos residuais.

## Entregáveis obrigatórios

A implementação desta tarefa deve entregar:

1. relatório de auditoria com arquivos e fluxos revisados;
2. lista de divergências encontradas entre implementação e contrato;
3. correções no frontend para cada divergência corrigível;
4. remoção de contratos e telas obsoletas;
5. atualização ou criação de testes quando houver comportamento alterado;
6. comandos executados e resultados;
7. riscos residuais, se houver, com justificativa objetiva.
