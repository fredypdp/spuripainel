---
criado: 2026-06-29
origem: solicitação de implementação frontend
status: pendente
prioridade: alta
---

# Tarefa — Atualizações de matrícula, documentos, sumários e anos acadêmicos

## Objetivo

Implementar no front end as atualizações de matrícula, cadastro de estudantes, gestão de sumários, gestão de anos acadêmicos e cursos superiores, seguindo obrigatoriamente o comportamento descrito em:

- `src/docs/Resumo das atualizações implementadas.md`;
- `src/docs/Spuri - API.md`;
- `src/docs/Spuri - Documentação.md`.

> A implementação não deve se basear apenas no resumo. Antes de codificar cada item, valide a regra completa nas documentações da API e do domínio, principalmente regras de telefones, documentos, sumários, anos acadêmicos, cursos superiores e diferenças por tipo de academia (`fundamental`, `medio`, `misto`, `superior`).

## Escopo funcional

### 1. Página de login

- Substituir o texto/link atual `Quer estudar? Fazer matrícula` por um botão com o texto `Fazer matrícula`.
- Posicionar esse botão abaixo do botão `Entrar`.
- Manter o fluxo de navegação para a página pública de matrícula.
- Garantir que a aparência respeite o tema claro/escuro e o padrão visual dos botões existentes.

### 2. Página pública de matrícula (`/matricula`)

#### 2.1. Fluxo de passos

- Remover o 5.º passo do fluxo atual.
- Mesclar o conteúdo e as validações do antigo 5.º passo ao 3.º passo.
- Atualizar labels, indicadores de progresso, validação por etapa, bloqueios de avanço e resumo final para refletirem o novo total de passos.
- Garantir que nenhum campo obrigatório do antigo 5.º passo deixe de ser coletado quando aplicável.

### 3. Atualizações comuns em `/matricula` e `/estudantes/cadastrar`

#### 3.1. Telefones

- Implementar as regras atuais de obrigatoriedade e validação dos telefones conforme a API:
  - telefones devem ser normalizados para string local de exatamente 9 dígitos, sem DDI, espaços, hífens ou parênteses;
  - para estudantes, pelo menos um entre `telefone` e `telefone_responsavel` deve ser informado;
  - `telefone` e `telefone_responsavel` não podem ser iguais;
  - para estudantes de ensino superior, `telefone_responsavel` é opcional desde que `telefone` esteja preenchido;
  - não expor nem consumir fluxo de verificação de telefone, pois os campos `*_verificado` são reservados para uso futuro.
- Mostrar mensagens de erro claras antes do envio e também tratar erros retornados pela API.
- Garantir comportamento consistente na solicitação pública de matrícula e no cadastro direto realizado pela academia.

#### 3.2. Dropdown/select

- Substituir o dropdown/select atual por um componente novo que:
  - suporte Tailwind CSS e modo escuro corretamente;
  - permita ao front end controlar as classes e estilos dos estados principais;
  - tenha opção configurável para habilitar ou desabilitar pesquisa interna;
  - funcione bem com teclado, foco, estados de erro, placeholder e valores controlados;
  - possa ser reutilizado nas telas de matrícula, cadastro de estudante, sumários, anos acadêmicos e cursos.
- Migrar os selects afetados nas duas páginas para esse novo componente.
- Evitar regressão visual no tema claro e corrigir legibilidade no tema escuro.

#### 3.3. Data de nascimento

- Substituir o componente atual de data de nascimento por um componente que:
  - suporte português;
  - seja configurável quanto ao intervalo de datas exibido/permitido;
  - impeça datas futuras;
  - entregue valor compatível com a API em `YYYY-MM-DD`;
  - ofereça boa UX/UI em desktop e mobile;
  - permita configurar limites por contexto caso a regra de matrícula/cadastro exija.

#### 3.4. Anexação de documentos

- Substituir inputs nativos de arquivo por um fluxo visual orientado a documento:
  - quando o documento ainda não foi anexado, exibir botão `Anexar [documento a ser anexado]`;
  - depois do anexo, exibir um componente com o texto `[documento] anexado` e um botão `Remover`;
  - ao clicar em `Remover`, limpar o arquivo e voltar a exigir/anunciar a anexação quando o documento for obrigatório.
- O nome exibido deve ser sempre o nome do tipo de documento exigido, nunca o nome do arquivo local enviado.
- Manter acessibilidade básica: label acionável, foco visível, estados de erro e texto de ajuda.

#### 3.5. Lista de documentos anexados

- Sempre que documentos anexados forem listados, exibir o nome do tipo de documento e um verificado verde ao lado.
- Exemplos de nomes esperados:
  - `Bilhete de identidade do estudante`;
  - `Bilhete de identidade do responsável`;
  - `Cédula do estudante`;
  - `Declaração`;
  - `Certificado da 6.ª classe`;
  - `Certificado da 9.ª classe`;
  - `Certificado do ensino médio`.
- Não exibir o nome do arquivo enviado pelo usuário como rótulo principal.

#### 3.6. Tipos de arquivo suportados

- Respeitar as regras documentadas para ficheiros:
  - aceitar apenas PDF;
  - aplicar `accept="application/pdf,.pdf"` no input;
  - validar extensão `.pdf` no front end;
  - bloquear arquivos acima de 5MB;
  - manter nomes de campos esperados pela API: `bi_estudante`, `bi_responsavel`, `cedula_estudante`, `declaracao`, `certificado_6_ano_fundamental`, `certificado_9_ano_fundamental`, `certificado_ensino_medio`.
- Continuar enviando `multipart/form-data` para os endpoints que exigem documentos.

### 4. Página `/gerenciamento/sumarios`

- Criar uma página de gerenciamento de sumários disponível apenas para usuários do tipo academia.
- Implementar todas as funcionalidades disponíveis na API de sumários:
  - listar sumários com filtros (`periodo`, `ano_academico`, `curso_id`, `materia_id`);
  - criar sumário;
  - visualizar detalhes;
  - editar sumário;
  - remover logicamente sumário quando a API disponibilizar `DELETE /academia/sumarios/:id`.
- Montar a UI conforme o tipo de academia:
  - fundamental: anos acadêmicos fundamentais e períodos trimestrais;
  - médio: cursos médios, anos acadêmicos do curso e períodos trimestrais;
  - misto: permitir os fluxos fundamental e médio quando aplicáveis;
  - superior: cursos superiores, matérias superiores e períodos `N_semestre`.
- Não enviar `academia_id`, `nivel` ou `type` como fonte de verdade quando a API indicar que esses dados são inferidos pelo backend.
- Validar no front end as regras principais antes do envio:
  - `sumario_titulo` obrigatório, entre 3 e 200 caracteres;
  - `materia_id` obrigatório;
  - `curso_id` obrigatório para matérias de médio e superior;
  - período compatível com matéria/curso;
  - `ano_academico` compatível com a matéria.
- Adicionar navegação no menu de gerenciamento respeitando permissões.

### 5. Página `/gerenciamento/anos-academicos`

- Criar uma página de gerenciamento de anos acadêmicos disponível apenas para usuários do tipo academia.
- Implementar as funcionalidades resumidas em `4.1. Academias podem adicionar ou remover anos acadêmicos com validações avançadas` e detalhadas na API:
  - consultar a visão unificada por `GET /academia/anos-academicos`;
  - adicionar/habilitar escopos por `POST /academia/anos-academicos`;
  - substituir completamente escopos por `PATCH /academia/anos-academicos`;
  - remover logicamente/desabilitar escopos por `DELETE /academia/anos-academicos`.
- Apresentar a interface conforme o tipo de academia:
  - fundamental: gerenciar `anos_academicos` da academia;
  - médio: gerenciar `anos_academicos` dos cursos médios;
  - misto: gerenciar anos fundamentais da academia e anos dos cursos médios;
  - superior: gerenciar cursos superiores por quantidade numérica de períodos/semestres, exibindo os anos superiores derivados.
- Evidenciar que remoções são lógicas/prospectivas e podem ser bloqueadas pela API quando houver dados dependentes, como estudantes ativos, turmas, matérias, notas, faltas, avaliações finais ou sumários.
- Exibir mensagens de erro da API de forma compreensível, sem mascarar validações avançadas do backend.
- Adicionar navegação no menu de gerenciamento respeitando permissões.

### 6. Gerenciamento de cursos — cursos superiores

- Verificar e garantir que o gerenciamento de cursos implementa corretamente `Curso superior com períodos numéricos e anos acadêmicos calculados`:
  - criação/edição de curso superior deve receber `periodos` como número inteiro positivo;
  - não enviar `anos_academicos` manualmente para curso superior;
  - exibir semestres derivados (`1_semestre`, `2_semestre`, etc.) retornados pela API;
  - exibir anos acadêmicos superiores derivados por `ceil(periodos / 2)` quando retornados pela API;
  - impedir configurações incompatíveis no front end antes do envio quando possível;
  - tratar bloqueios da API quando a redução de períodos remover semestre/ano em uso por estudantes ativos.

## Critérios de aceite

- A tarefa só deve ser considerada concluída quando todas as telas alteradas funcionarem em modo claro e escuro.
- `/matricula` e `/estudantes/cadastrar` devem aplicar as mesmas regras de telefones, documentos e data de nascimento compatíveis com a documentação.
- Documentos obrigatórios/opcionais devem seguir as regras automáticas da API para cada contexto acadêmico.
- Os anexos devem ser enviados com os nomes de campo esperados pelo backend e como PDFs válidos de até 5MB.
- `/gerenciamento/sumarios` deve cobrir CRUD/filtros disponíveis na API e adaptar período/ano/curso/matéria ao tipo de academia.
- `/gerenciamento/anos-academicos` deve cobrir consulta, adição, substituição e remoção lógica, adaptando a UI ao tipo de academia.
- Cursos superiores no gerenciamento de cursos não devem depender de listas manuais de semestres/anos superiores.
- Deve haver tratamento de loading, vazio, erro, sucesso e validação de formulário nas novas páginas.
- As permissões devem impedir acesso por usuários que não sejam academia nas páginas novas.
- A implementação deve incluir testes/checks mínimos aplicáveis ao projeto e revisão manual das jornadas críticas.

## Observações técnicas

- Reaproveitar serviços e hooks de API existentes sempre que possível, criando novos métodos tipados apenas quando necessário.
- Preferir componentes reutilizáveis para o novo dropdown, seletor de data e anexador de documentos caso estes atendam a nova demanda. Caso não, importe ou crie novos componentes para essa demanda.
- Não envolver imports com `try/catch`.
- Manter compatibilidade com a arquitetura atual do Next.js e com os padrões de estilo já existentes no projeto.
