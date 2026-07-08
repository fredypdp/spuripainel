---
criado: 2026-07-08 00:00
origem: solicitação do usuário
status: modelo
---

# Modelo de implementação de atualizações no front end

## Prompt recomendado para orientar uma atualização

Implemente a atualização solicitada no front end seguindo este modelo como guia operacional. Use obrigatoriamente a documentação do backend em `src/docs/Documentação.md` como fonte de verdade para qualquer contrato de API, payload, resposta, paginação, autenticação, permissões, upload, erro, status, enum ou regra exposta pelo backend. A implementação deve ser feita em escala de cima para baixo: comece pela página, fluxo ou componente principal afetado, depois ajuste os componentes dependentes, hooks, serviços de API, tipos, validadores, estados, mensagens, testes e documentação impactada. Não crie suporte legado, aliases, fallbacks temporários, wrappers de compatibilidade ou adaptações divergentes do contrato documentado.

## Objetivo deste modelo

Este documento serve como checklist reutilizável para orientar qualquer atualização de front end no projeto, incluindo:

- páginas e rotas do painel;
- componentes de layout, formulário, tabela, modal, card e feedback visual;
- hooks de dados, permissão, sessão, estado e efeitos assíncronos;
- camada de API do front end;
- tipos TypeScript e interfaces compartilhadas;
- validações client-side;
- tratamento de loading, erro, vazio e sucesso;
- integração com uploads e downloads;
- adequação de UX conforme permissões e regras do backend.

Sempre que a tarefa envolver dados vindos do backend, envio de dados para o backend ou interpretação de erro do backend, consulte `src/docs/Documentação.md` antes de implementar.

---

# 1. Ordem obrigatória de implementação: de cima para baixo

## Regra principal

Toda atualização deve ser planejada e implementada do elemento mais alto do fluxo para os elementos dependentes.

A ordem padrão é:

1. identificar a rota, página ou fluxo principal afetado;
2. entender o comportamento esperado pelo usuário nessa página ou fluxo;
3. mapear quais dados a página precisa buscar, enviar, transformar ou exibir;
4. conferir os contratos correspondentes em `src/docs/Documentação.md`;
5. ajustar o componente principal da página ou fluxo;
6. ajustar componentes filhos usados pela página;
7. ajustar hooks e serviços de API necessários;
8. ajustar tipos, schemas, helpers e validadores;
9. ajustar mensagens, estados visuais, permissões e navegação;
10. validar o fluxo completo e, quando aplicável, atualizar testes e documentação.

## Por que seguir essa ordem

A página ou fluxo principal define o contrato visual e funcional da atualização. Componentes, hooks e serviços devem existir para atender esse fluxo, não o contrário. Evite começar por componentes isolados ou helpers genéricos sem antes confirmar como a atualização será usada no fluxo real.

## Proibição de implementação fragmentada

Não implemente alterações soltas em componentes dependentes sem revisar o fluxo superior que os consome. Sempre confirme:

- quem chama o componente;
- quais props são realmente necessárias;
- quais dados vêm da API;
- quais permissões controlam a exibição;
- quais estados precisam ser representados;
- quais erros podem ocorrer;
- qual experiência o usuário terá do início ao fim.

---

# 2. Uso obrigatório da documentação do backend

## Fonte de verdade

`src/docs/Documentação.md` é a fonte de verdade para toda integração com API.

Use essa documentação para validar:

1. endpoint correto;
2. método HTTP;
3. headers e autenticação;
4. permissões por ator;
5. parâmetros de rota;
6. query params;
7. payload de criação, atualização, upload ou ação;
8. formato de resposta;
9. paginação, filtros, ordenação e busca;
10. enums, status e tipos literais;
11. envelope de erro;
12. códigos de erro e mensagens esperadas;
13. regras de negócio expostas ao cliente;
14. limites de arquivo e tipos aceitos;
15. contratos de jobs assíncronos e batch, quando houver.

## Regras para contratos de API

Ao implementar ou alterar chamadas de API no front end:

- não inferir campos sem consultar a documentação;
- não inventar nomes de propriedades;
- não manter campos antigos se a documentação atual não os suporta;
- não criar conversões silenciosas para formatos legados;
- não aceitar múltiplos formatos de resposta para o mesmo endpoint, salvo se a documentação exigir explicitamente;
- não mascarar erro contratual com fallback local;
- tipar payloads e respostas de acordo com a documentação;
- tratar o envelope de erro padronizado descrito em `src/docs/Documentação.md`.

## Quando a documentação e o código divergirem

Se o código existente divergir de `src/docs/Documentação.md`, a implementação deve favorecer a documentação como contrato desejado. Ajuste o front end para o contrato documentado e registre no resumo da alteração qualquer divergência relevante encontrada.

---

# 3. Checklist para páginas e rotas

Ao atualizar uma página ou rota, verifique:

1. se a rota está no local correto da estrutura do Next.js;
2. se o componente `page.tsx` continua simples e delega a lógica para o componente de conteúdo quando esse padrão já existir;
3. se o `PageContent` ou componente principal representa o fluxo completo;
4. se os estados iniciais são coerentes com permissões e dados necessários;
5. se existem estados explícitos de carregamento, erro, vazio, sucesso e sem permissão;
6. se a página refaz buscas após criação, edição, exclusão, aprovação, reprovação ou outra ação mutável;
7. se filtros, paginação e busca preservam consistência com a API;
8. se navegação, breadcrumbs, títulos e CTAs refletem a nova regra;
9. se a página não duplica lógica que deveria estar em hook, serviço ou componente reutilizável;
10. se a atualização não quebra fluxos de outros atores.

## Estrutura recomendada

Para páginas com lógica relevante, prefira a separação:

```text
src/app/(painel)/.../page.tsx
src/app/(painel)/.../PageContent.tsx
```

Use `page.tsx` como ponto de entrada da rota e mantenha estado, chamadas, handlers e renderização principal em `PageContent.tsx`, quando esse padrão já estiver presente no módulo.

---

# 4. Checklist para componentes

Ao criar ou alterar componentes:

1. comece pelo componente pai que define o caso de uso;
2. extraia componentes filhos somente quando houver reutilização real, redução clara de complexidade ou padrão visual existente;
3. mantenha props explícitas, tipadas e orientadas ao domínio do componente;
4. evite props genéricas demais quando o componente pertence a um fluxo específico;
5. evite acoplamento direto de componentes puramente visuais com chamadas de API;
6. garanta acessibilidade básica em botões, inputs, selects, modais e feedbacks;
7. preserve padrões visuais existentes do projeto;
8. não introduza bibliotecas novas sem necessidade;
9. não duplique componentes existentes sem verificar se podem ser reaproveitados;
10. garanta que componentes dependentes não passem a conhecer detalhes desnecessários do fluxo superior.

## Componentes de formulário

Para formulários:

- use labels, placeholders e mensagens alinhadas à regra de negócio;
- valide campos obrigatórios antes do envio quando isso melhorar a experiência;
- não substitua validação do backend por validação apenas local;
- envie payload exatamente conforme `src/docs/Documentação.md`;
- limpe ou preserve campos após sucesso conforme o fluxo real;
- represente erros de campo quando o envelope de erro trouxer `details`;
- evite conversões que alterem identificadores, códigos ou strings numéricas com zeros à esquerda.

---

# 5. Checklist para hooks

Use hooks para encapsular lógica reutilizável de estado, efeitos, permissões ou integração assíncrona.

Ao criar ou alterar hooks:

1. confirme primeiro qual página ou componente principal precisa do hook;
2. defina claramente entrada, saída, estados e ações expostas;
3. evite hooks genéricos prematuros;
4. centralize lógica repetida de busca, mutação, permissão ou batch;
5. exponha estados de `loading`, `error`, `data` e ações quando fizer sentido;
6. cancele ou proteja efeitos assíncronos quando houver risco de atualização após desmontagem;
7. preserve dependências corretas em `useEffect`, `useMemo` e `useCallback`;
8. não esconda divergências de contrato da API dentro do hook.

Hooks que consomem API devem continuar obedecendo a `src/docs/Documentação.md`.

---

# 6. Checklist para camada de API do front end

Ao atualizar chamadas HTTP, clientes, serviços ou helpers de API:

1. localizar chamadas existentes relacionadas ao domínio da atualização;
2. comparar cada chamada com `src/docs/Documentação.md`;
3. ajustar path, método, query params, payload e resposta;
4. tipar entrada e saída;
5. tratar autenticação conforme padrão existente;
6. tratar erros usando o envelope padronizado;
7. não criar branches para formatos antigos de erro ou resposta;
8. não engolir erros que precisam ser exibidos ao usuário;
9. não acoplar a camada de API a componentes visuais;
10. manter nomes de funções coerentes com ações de domínio.

## Erros de API

O front end deve esperar o envelope padronizado:

```json
{
  "error": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | RATE_LIMIT | INTERNAL_ERROR | ERROR",
  "message": "mensagem de erro para o cliente",
  "request_id": "identificador da requisição",
  "details": [
    {
      "field": "type",
      "code": "required",
      "message": "o campo 'type' é obrigatório"
    }
  ]
}
```

Use `message` para feedback geral ao usuário e `details` para mensagens específicas de campo quando a tela comportar esse nível de detalhe.

---

# 7. Checklist para tipos TypeScript

Ao alterar tipos:

1. buscar tipos existentes relacionados ao domínio;
2. ajustar interfaces conforme a documentação do backend;
3. representar enums e unions com valores literais documentados;
4. evitar `any` para payloads e respostas de API;
5. não modelar campos obsoletos;
6. preservar strings numéricas como `string` quando a documentação tratar como string;
7. separar tipos de payload de tipos de resposta quando eles forem diferentes;
8. atualizar todos os consumidores afetados de cima para baixo.

Tipos devem ajudar a impedir uso incorreto do contrato, não esconder incompatibilidades.

---

# 8. Checklist para permissões, procedência e atores

Antes de exibir ações, páginas, botões ou dados, confirme em `src/docs/Documentação.md` quais atores podem executar ou visualizar o recurso. O front end deve disponibilizar funcionalidades de acordo com a procedência do usuário autenticado, seu tipo, papel administrativo, academia vinculada e nível/tipo de academia quando esses atributos influenciarem o fluxo.

## 8.1 Identificação da procedência do usuário

Ao implementar uma atualização, identifique primeiro de onde vem o usuário e qual escopo ele representa:

1. **Estudante**: usuário final que visualiza dados acadêmicos próprios e só deve acessar informações e ações permitidas para o próprio vínculo estudantil.
2. **Academia**: usuário institucional vinculado a uma academia específica, com acesso limitado aos dados e operações da própria academia.
3. **Admin FPP**: administrador máximo, com permissões amplas para criar academias, criar outros admins, executar rebuilds e operar fluxos globais documentados.
4. **Admin ADM**: administrador com permissões administrativas intermediárias, especialmente ativação/desativação de academias e admins de nível inferior quando documentado.
5. **Admin Gerente**: administrador de consultas e ações administrativas básicas, sem assumir permissões de FPP ou ADM quando a documentação não permitir.

Além do tipo principal do usuário, verifique atributos que podem mudar a interface:

- `user.type` ou equivalente usado pelo projeto para distinguir `admin`, `academia` e `estudante`;
- `admin.role` ou papel equivalente para distinguir `fpp`, `adm` e `gerente`;
- academia vinculada ao usuário, quando existir;
- `academia.type`, como `public` ou `private`, quando o contrato diferenciar funcionalidades;
- `academia.nivel`, como `escola` ou `superior`, quando o contrato diferenciar cursos, matérias, notas, turmas, anos acadêmicos ou categorias;
- status da academia, estudante, solicitação, ano letivo ou outro recurso quando o status restringir ações.

## 8.2 Regras para exibição condicional

A interface deve refletir permissões e escopo antes de renderizar ou habilitar funcionalidades:

1. ocultar ações que o usuário nunca pode executar;
2. desabilitar ações temporariamente indisponíveis por status, estado do recurso ou pré-condição documentada;
3. exibir mensagens claras quando uma ação existir no fluxo, mas estiver bloqueada para o usuário atual;
4. evitar mostrar botões, links, menus, tabs, cards ou rotas que induzam o usuário a tentar uma ação proibida;
5. filtrar opções de formulário conforme tipo de usuário, papel administrativo, academia, tipo de academia e nível da academia;
6. não depender apenas do front end para segurança: a API continua sendo a fonte final de autorização;
7. tratar `401 Unauthorized` redirecionando ou encerrando sessão conforme padrão existente;
8. tratar `403 Forbidden` como falta de permissão para aquela funcionalidade ou recurso específico;
9. preservar rotas protegidas conforme os hooks, layouts e middlewares já existentes;
10. evitar fallback para permissões mais amplas quando os dados do usuário ainda estiverem carregando.

## 8.3 Procedência por tipo e nível de academia

Quando o usuário for uma academia, ou quando um admin estiver operando dados de uma academia, considere as diferenças de contrato entre academias:

- academias `public` e `private` podem ter regras, campos ou fluxos distintos se `src/docs/Documentação.md` documentar essa diferença;
- academias de nível `escola` e `superior` podem ter diferenças em cursos, matérias, turmas, notas, categorias, períodos, anos acadêmicos e avaliações;
- fluxos escolares não devem assumir regras do ensino superior;
- fluxos superiores não devem assumir regras do ensino escolar;
- componentes reutilizados entre níveis devem receber props ou configurações explícitas para evitar comportamento incorreto;
- telas administrativas que listam ou editam academias devem respeitar o escopo do admin e o estado da academia selecionada.

## 8.4 Checklist final de permissões

Antes de concluir a implementação, valide:

1. se cada ação visível é permitida para o tipo de usuário atual;
2. se cada rota acessível condiz com o ator autenticado;
3. se menus e CTAs mudam corretamente entre estudante, academia e admins;
4. se admins FPP, ADM e Gerente não recebem a mesma interface quando as permissões documentadas forem diferentes;
5. se academias de níveis `escola` e `superior` veem apenas campos, categorias, períodos e ações compatíveis com seu nível;
6. se academias `public` e `private` seguem diferenças documentadas, quando existirem;
7. se estados como inativo, ativo, arquivado, pendente, aprovado ou reprovado bloqueiam ou liberam ações corretamente;
8. se o front end trata respostas `401` e `403` sem quebrar a experiência;
9. se nenhuma regra de permissão foi inventada fora da documentação;
10. se o backend continua sendo consultado como autoridade final para permissões e dados sensíveis.

---

# 9. Checklist para upload, download e arquivos

Para fluxos com arquivos:

1. conferir em `src/docs/Documentação.md` quais tipos de arquivo são aceitos;
2. conferir limite de tamanho;
3. validar no cliente apenas como melhoria de UX;
4. manter a validação do backend como fonte final;
5. usar `FormData` quando o contrato exigir multipart;
6. não alterar nomes de campos de arquivo;
7. exibir erro padronizado quando arquivo for inválido;
8. tratar estados de envio, sucesso e falha;
9. evitar iniciar download sem autorização ou sem URL/endpoint documentado;
10. não persistir dados sensíveis em estado global desnecessariamente.

---

# 10. Checklist para feedback visual e UX

Toda atualização deve considerar:

1. estado de carregamento inicial;
2. estado de ação em andamento;
3. estado vazio;
4. erro de validação;
5. erro de autorização;
6. erro inesperado;
7. sucesso após ação mutável;
8. confirmação para ações destrutivas ou irreversíveis;
9. atualização da lista ou detalhe após mutação;
10. consistência de idioma, tom e nomenclatura com o restante do painel.

Mensagens devem ser úteis e específicas, sem expor detalhes internos sensíveis.

---

# 11. Checklist de testes e validação

Ao finalizar uma atualização, rode as verificações compatíveis com o escopo alterado.

Priorize:

1. lint;
2. typecheck;
3. build;
4. testes unitários ou de componentes, quando existirem;
5. verificação manual do fluxo principal;
6. screenshot quando a mudança visual for perceptível em aplicação executável.

Também valide manualmente:

- payload enviado;
- resposta esperada;
- tratamento de erro;
- estados de loading e vazio;
- permissões;
- responsividade quando a tela afetada exigir.

---

# 12. Proibições gerais

Não faça:

1. implementação baseada em suposição quando houver contrato em `src/docs/Documentação.md`;
2. fallback para contrato antigo;
3. aliases para nomes antigos de campos;
4. wrappers temporários para esconder inconsistência;
5. duplicação de chamada de API em múltiplos componentes quando um hook/serviço resolver;
6. uso de `any` para evitar ajuste correto de tipos;
7. mudança visual ampla fora do escopo solicitado;
8. alteração de regra de negócio apenas no front end sem respaldo do backend;
9. tratamento genérico que apague mensagens úteis do backend;
10. dependência nova sem necessidade clara.

---

# 13. Formato recomendado para prompts de atualização

Para usar este modelo em novas tarefas, o prompt pode ser curto, desde que indique o alvo e a mudança desejada.

Exemplo:

```text
Implemente no front end a atualização da página de academias para suportar o novo campo X, seguindo `src/docs/Modelo de implementação front end.md` e usando `src/docs/Documentação.md` como fonte de verdade para a API.
```

Outro exemplo:

```text
Atualize o componente/formulário Y para refletir a nova regra Z. Siga o modelo de implementação front end e implemente de cima para baixo a partir da página que consome esse componente.
```

Quando a tarefa envolver endpoint, payload, erro, permissão, upload, download ou status, mencione explicitamente que a implementação deve consultar `src/docs/Documentação.md`.

---

# 14. Resultado esperado ao final de cada implementação

Ao final de uma atualização guiada por este modelo, o front end deve ter:

1. fluxo principal atualizado de ponta a ponta;
2. componentes dependentes coerentes com o fluxo superior;
3. hooks e camada de API alinhados à documentação do backend;
4. tipos TypeScript compatíveis com contratos atuais;
5. validações locais coerentes com regras documentadas;
6. erros e feedbacks usando o envelope e mensagens atuais;
7. permissões refletindo os atores corretos;
8. testes ou verificações executadas conforme escopo;
9. ausência de compatibilidade legada não documentada;
10. código organizado, legível e consistente com padrões existentes do projeto.
