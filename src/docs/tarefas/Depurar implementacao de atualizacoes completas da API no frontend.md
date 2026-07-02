---
modificado: 2026-07-02
criado: 2026-07-02
origem: solicitação de depuração da implementação integral das atualizações da API no frontend
status: pendente
prioridade: crítica
---

# Depurar implementação das atualizações completas da API no frontend

## Objetivo da auditoria

Fazer uma auditoria crítica, completa e arquivo por arquivo da implementação da tarefa:

`src/docs/tarefas/Tarefa - Depurar e implementar atualizacoes completas da API no frontend.md`

A auditoria deve confirmar se a tarefa foi implementada corretamente, completamente e **à risca** no frontend. Caso qualquer parte esteja incompleta, inconsistente, parcialmente implementada, sem validação, sem teste, sem documentação, com fallback legado, com compatibilidade silenciosa indevida ou divergente do contrato atual da API, esta tarefa exige **ajustar ou implementar o que falta** antes de ser considerada concluída.

Esta tarefa é crítica porque valida o alinhamento final do frontend com o contrato público da API, com impacto em autenticação, permissões, academias, cursos, matérias disciplinares, turmas, estudantes, notas, faltas, avaliações finais, regras de avaliação final, configurações académicas, dashboards, menus, guards, formulários, tipos, services, hooks e tratamento de erros estruturados.

## Fontes obrigatórias de verdade

Antes de auditar ou alterar código, ler e cruzar obrigatoriamente:

- `src/docs/tarefas/Tarefa - Depurar e implementar atualizacoes completas da API no frontend.md`, como especificação da implementação que está sendo validada;
- `src/docs/Spuri - API.md`, como fonte de verdade para rotas, métodos, payloads, responses, erros, permissões, exemplos e códigos de validação;
- `src/docs/Spuri - Documentação.md`, como fonte de verdade para processos de negócio, papéis de usuário, níveis de academia e comportamento esperado;
- todos os demais arquivos em `src/docs`, incluindo tarefas, atualizações, notas técnicas e documentação complementar.

Não assumir que a implementação existente está correta apenas porque compila ou porque a tela parece funcionar. O contrato documentado e as regras de negócio devem ser verificados contra o código real do frontend.

## Regra adicional obrigatória

Além da especificação original, é obrigatório garantir que a implementação final não introduziu nem manteve compatibilidade silenciosa com contratos antigos:

- rotas removidas não podem continuar existindo em services, hooks, mocks, menus, páginas ou testes como fallback;
- payloads antigos não podem ser aceitos, montados ou enviados por conveniência da UI;
- campos removidos não podem permanecer em tipos públicos, formulários, normalizadores, serializers, filtros, tabelas ou estados locais;
- responses antigas não podem ser normalizadas silenciosamente para o novo formato;
- erros estruturados não podem ser substituídos por mensagens genéricas quando `details[]` e `request_id` estiverem disponíveis;
- regras por nível de academia, curso, ano/período e matérias aplicáveis não podem ser inferidas silenciosamente quando a API exige escopo explícito;
- casts, `any`, campos opcionais frouxos ou adaptadores genéricos não podem ser usados para esconder divergência entre frontend e API.

## Escopo mínimo da investigação

Antes de concluir a auditoria, investigar no mínimo:

1. todos os documentos de `src/docs` e a classificação registrada pela implementação original;
2. todas as rotas e páginas em `src/app`;
3. todos os componentes em `src/components`, incluindo filhos indiretos renderizados por páginas críticas;
4. providers, contexts, guards, stores, menus, breadcrumbs e regras de navegação;
5. clients, services, hooks de query/mutation, helpers de request e tratamento de cache em `src/lib`;
6. tipos, DTOs, schemas, enums, unions e modelos compartilhados em `src/types` ou equivalentes;
7. mocks, fixtures, constantes, seeds locais e dados temporários usados pelo frontend;
8. formulários, modais, filtros, tabelas, cards, estados vazios, loading, erro e confirmação;
9. tratamento de permissões e diferenças entre usuário estudante, admin, academia e responsabilidades administrativas;
10. diferenças de comportamento por academia fundamental, média, superior e mista;
11. fluxos de criação, edição, listagem, detalhe, ativação/inativação, exclusão e operações assíncronas;
12. testes existentes e lacunas de cobertura para contratos críticos da API.

## Checklist obrigatório de validação

### 1. Evidências da auditoria original

Confirmar que a implementação da tarefa original registrou evidências suficientes de auditoria, incluindo:

- lista dos arquivos de `src/docs` revisados;
- classificação de cada documento como fonte obrigatória, complementar, histórica, incorporada ou conflitante;
- divergências documentais encontradas e decisão adotada;
- árvore de auditoria em cascata de `src` por rota, página, componente pai, filhos, hooks/services e tipos;
- rotas ajustadas e rotas deliberadamente não usadas;
- tipos criados, alterados ou removidos;
- telas e fluxos alterados;
- services, hooks, caches e invalidations alterados;
- testes e checks executados;
- riscos remanescentes.

Se essas evidências não existirem ou forem insuficientes, complementar a auditoria e registrar o resultado no PR da correção.

### 2. Busca ampla e classificação de ocorrências

Fazer busca ampla no frontend e classificar cada ocorrência encontrada, explicando se é uso válido, documentação histórica, teste de rejeição, pendência ou bug ativo. No mínimo buscar por:

- rotas antigas, removidas ou alteradas pela API;
- `PATCH /academia/anos-academicos`, `.patch('/academia/anos-academicos')`, `replace`, `set`, `substituir` e `update` aplicados a anos académicos;
- `sumario`, `sumário`, `sumarios`, `sumários`, `sumario_id`, `sumario_titulo` e `/academia/sumarios`;
- `tipo_ensino`, `tipoEnsino`, `tipo ensino`;
- `anos_academicos`, `anosAcademicos`, `ano_academico`, `anoAcademico`;
- `materias_aplicaveis`, `materiasAplicaveis`, `materias_chave`, `materiasChave`;
- `curso_id`, `cursoId`, `materia_id`, `materiaId`, `periodo`, `semestre`;
- `request_id`, `details`, `details[0].field`, `details[0].message`, `details[0].code`;
- `any`, casts suspeitos, normalizadores genéricos e fallbacks para campos legados em arquivos que consomem API.

Não basta listar ocorrências: cada achado relevante deve ser analisado e corrigido quando representar contrato antigo, comportamento parcial ou risco funcional.

### 3. Contratos de API, services e hooks

Para cada rota documentada em `src/docs/Spuri - API.md` que seja usada ou deveria ser usada pelo frontend, confirmar:

- método HTTP correto;
- path e path params corretos;
- query params corretos;
- body permitido e sem campos extras;
- response tipada conforme documentação;
- permissões e visibilidade por perfil;
- tratamento de erro estruturado;
- query keys, cache, invalidation e revalidação após escrita;
- componentes consumidores atualizados até a UI final.

Rotas removidas devem ser eliminadas de services, hooks, tipos, mocks, testes, menus, páginas e fallbacks.

### 4. Tipagem, DTOs e validações do frontend

Confirmar que os tipos do frontend estão alinhados ao contrato atual:

- separar DTOs de criação, edição parcial, edição total, leitura, listagem, paginação e erro;
- não usar `any` para contornar divergência;
- não manter campos legados em tipos públicos;
- não enviar propriedades extras;
- modelar diferenças por nível de academia com unions explícitas quando o contrato diferenciar fundamental, médio, superior e mista;
- validar payloads antes do envio quando a API documentar combinações proibidas;
- garantir que formulários, tabelas, filtros e modais usem os mesmos tipos corretos dos services/hooks.

### 5. Tratamento de erros estruturados

Auditar todos os fluxos de erro de API e garantir que a UI:

- leia `details[0].message` antes de mensagens genéricas;
- use `details[0].field` para destacar campos inválidos;
- use `details[0].code` para orientar bloqueios, recarregamentos ou mensagens específicas;
- preserve e exiba/registre `request_id` para suporte;
- não faça retry automático em validação, autorização, conflito ou regra de negócio;
- mantenha fallback seguro quando a API retornar apenas `message`.

### 6. UI dinâmica por perfil e nível de academia

Confirmar que menus, guards, páginas, ações, filtros, labels, colunas, cards e estados vazios respeitam:

- estudante;
- admin;
- academia;
- responsabilidades administrativas distintas;
- academia fundamental;
- academia média;
- academia superior;
- academia mista;
- permissões documentadas por rota e por regra de negócio.

Ações indisponíveis devem ser ocultadas ou desabilitadas com explicação objetiva, nunca apenas falhar depois do submit.

### 7. Caso crítico: regras de avaliação final

Auditar profundamente a UI, tipos, services, hooks e validações de regras de avaliação final, garantindo suporte correto a:

- escopo por nível de academia;
- escopo por curso quando aplicável;
- escopo por ano académico quando aplicável;
- matérias aplicáveis ao escopo selecionado;
- diferenças entre fundamental, médio, superior e academias mistas;
- regras ativas/inativas;
- conflitos de escopo;
- edição sem perda de dados;
- preview/resumo antes de salvar;
- bloqueio de combinações não documentadas;
- remoção de formatos legados de regra.

Validar especialmente que a UI não força modelo único rígido e não converte silenciosamente contratos antigos para contratos novos.

### 8. Caso prioritário: cursos e matérias disciplinares

Confirmar que cursos e matérias disciplinares estão totalmente alinhados à API atual:

- criação, edição, listagem, detalhe, ativação/inativação e filtros de cursos;
- diferenças entre curso médio e superior;
- anos académicos, períodos e semestres conforme contrato atual;
- `materias_chave` por ano em cursos médios, quando aplicável;
- matérias disciplinares por nível, curso, ano/período e status;
- validações que impedem matéria fora do escopo;
- impactos em turmas, estudantes, notas, faltas e avaliações finais;
- labels e filtros que deixem claro o escopo da matéria para o usuário.

### 9. Demais domínios obrigatórios

Auditar e corrigir, quando necessário:

- autenticação, sessão, recuperação de senha, verificação de e-mail e matrícula pública;
- academias, níveis, configurações e ano letivo;
- anos académicos sem substituição em massa por `PATCH`;
- turmas e estudantes;
- notas, testes e avaliações;
- faltas sem vínculo com sumários/aulas removidos;
- avaliações finais, pendências, histórico e execução;
- dashboards, contadores, atalhos, menus e breadcrumbs;
- importações, operações em lote e fluxos assíncronos.

## Critérios de aceite

A auditoria só pode ser considerada concluída quando:

1. a implementação da tarefa original tiver sido confrontada com cada requisito da especificação;
2. todo achado incompleto, incorreto, legado ou ambíguo tiver sido corrigido ou registrado com justificativa técnica clara;
3. todas as rotas usadas pelo frontend estiverem compatíveis com `src/docs/Spuri - API.md`;
4. todos os payloads enviados pelo frontend estiverem sem campos extras ou legados;
5. todos os responses consumidos estiverem tipados conforme documentação;
6. erros estruturados estiverem tratados uniformemente;
7. UI, permissões, menus e guards estiverem coerentes por usuário e nível de academia;
8. regras de avaliação final, cursos e matérias disciplinares tiverem validação especial concluída;
9. rotas, menus, services, tipos, mocks e testes obsoletos tiverem sido removidos;
10. testes/checks obrigatórios passarem ou tiverem limitação ambiental justificada;
11. o PR documentar a auditoria, os ajustes feitos, riscos remanescentes e evidências de validação.

## Validação obrigatória

Ao finalizar, executar no mínimo:

- typecheck do projeto;
- lint;
- build;
- testes existentes;
- busca textual por rotas, campos e padrões removidos pela API;
- verificação manual das telas alteradas ou screenshot quando houver mudança perceptível em aplicação web executável.

O PR deve listar obrigatoriamente:

- documentos de `src/docs` auditados;
- árvore de auditoria em cascata de `src` por rota/página/componente/hook/service/tipo;
- achados e correções por domínio;
- rotas ajustadas e rotas removidas;
- tipos criados, alterados ou removidos;
- services/hooks/caches alterados;
- telas, menus, guards e formulários alterados;
- decisões diante de divergências documentais;
- comandos de validação executados;
- riscos remanescentes e próximos passos, se houver.
