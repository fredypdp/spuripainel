---
criado: 2026-09-12
origem: Claude (orquestrador)
status: a implementar — backend já pronto e testado (ver nota abaixo)
---

# Senha mínima de 8 caracteres + UI de documentos extra

## Contexto — o backend já está pronto

O backend (`rastreio-backend`) já foi implementado e testado para esta
tarefa (patch aplicado em `docs/Lista de Tarefas/` daquele repositório).
Esta é a parte de frontend, que ainda precisa ser escrita. Não pré-testei
nada aqui além de `npx tsc --noEmit` (baseline: **0 erros**) e `npm run
lint` (baseline pré-existente: 2 erros + 8 warnings, todos SEM relação com
esta tarefa — não é para corrigi-los, só não introduzir NOVOS).

Contrato do backend que você vai consumir (resumo — detalhes completos e
exemplos de payload estão no `Documentação da API.md` do backend, seção
nova "Documentos extra"):

- `GET /academia/documentos-extra` (`?ativos=true` opcional) — lista o
  catálogo da academia logada. Cada item:
  `{id, rotulo, tipo: "pdf"|"jpg", obrigatorio, nivel, ano_academico, ativo, created_at, updated_at}`.
- `POST /academia/documentos-extra` — cria. Body:
  `{rotulo, tipo, obrigatorio, ano_academico}` (`ano_academico` no formato
  `N_ano_fundamental|N_ano_medio|N_ano_superior`, ex.: `"6_ano_fundamental"`;
  `nivel` é derivado pelo backend, não precisa (nem deve) ser enviado).
- `PUT /academia/documentos-extra/:id` — edita (mesmo body).
- `PUT /academia/documentos-extra/:id/desativar` e `.../reativar`.
- No cadastro direto (`POST /academia/estudante/register`), na matrícula
  pública (`POST /solicitacao-matricula`) e ao completar documentos
  pendentes (`POST /academia/estudante/:codigo/documentos`): cada
  documento extra é um campo de arquivo multipart nomeado
  **`documento_extra_<id>`** (o `<id>` é o id retornado pelo catálogo).
  Tamanho máximo: 10MB (igual aos documentos fixos já existentes). Tipo
  exigido (pdf ou jpg) é o que está configurado naquela definição — enviar
  o tipo errado é rejeitado pelo backend com uma mensagem clara.

## Parte 1 — Senha mínima de 8 caracteres

Três arquivos têm a regra de 6 caracteres hardcoded, cada um em dois
lugares (validação + texto do placeholder). Troque `6` por `8` e o texto
"mínimo 6 caracteres" por "mínimo 8 caracteres" em todos:

1. `src/components/academia/AcademiaCadastroForm.tsx`
   - Linha 113: `senha.trim().length < 6` → `< 8`, e a mensagem
     `'A senha deve ter no mínimo 6 caracteres'` → `8 caracteres`.
   - Linha 152: placeholder `"Mínimo 6 caracteres"` → `"Mínimo 8 caracteres"`.
2. `src/components/user-profile/UserConfigCard.tsx`
   - Linha 32: `senhaNova.length < 6` → `< 8`, mensagem correspondente.
3. `src/app/(painel)/configuracoes/PasswordSettingsCard.tsx`
   - Linha 32: `novaSenha.length < 6` → `< 8`, mensagem correspondente.
   - Linha 94: placeholder `"Mínimo 6 caracteres"` → `"Mínimo 8 caracteres"`.

Não encontrei uma tela de "definir nova senha via link de recuperação por
e-mail" no frontend (só o passo de pedir o e-mail, em `esqueci-senha/`) —
se ela não existir mesmo, não há nada a fazer aqui para esse fluxo; a
validação do backend (`ResetarSenha`) já foi corrigida para exigir 8
caracteres de qualquer forma, então a API está protegida mesmo sem UI
dedicada.

## Parte 2 — Gestão do catálogo de documentos extra (visão da academia)

**Siga o padrão visual e de código de `src/components/paineis/
ServicosExtrasCatalogoPainel.tsx`** (catálogo de itens configuráveis pela
academia, com criar/editar/desativar/reativar) — é a peça mais parecida
que já existe no projeto. Abra esse arquivo antes de começar e replique a
mesma estrutura (states, modal de criar/editar, tabela/lista, badges de
ativo/inativo, chamadas de API) trocando os campos pelos de documento
extra:

- Rótulo (texto)
- Tipo: seletor PDF / JPG
- Obrigatório: toggle/checkbox
- Ano acadêmico: reaproveite o MESMO seletor de ano acadêmico já usado em
  outros formulários do projeto (ex.: em `CadastroSingularForm.tsx` ou em
  `MatriculaPublicPage.tsx` — procure o componente que already lista
  `1º ano do ensino fundamental`, `2º ano do ensino médio` etc., e
  reaproveite; não crie uma lista nova de anos do zero)

Adicione as chamadas de API em `src/lib/api/services.ts` (siga o padrão
já usado para categorias de serviço/serviços extra nesse mesmo arquivo:
`listar`, `criar`, `atualizar`, `desativar`, `reativar`) e os tipos
correspondentes em `src/types/api.ts` (um tipo `DocumentoExtra` espelhando
exatamente os campos da resposta do backend, listados acima).

Coloque esta gestão em algum lugar acessível da área de configurações da
academia — o local exato (nova aba, nova página, dentro de uma tela já
existente) fica a seu critério; siga o padrão de navegação que
`ServicosExtrasCatalogoPainel.tsx` já usa hoje (veja onde ele é montado —
provavelmente uma página em `src/app/(painel)/...`) e replique.

## Parte 3 — Campos de upload dinâmicos no cadastro/matrícula do estudante

Dois formulários precisam, cada um, buscar o catálogo ativo de documentos
extra **para o ano acadêmico selecionado no formulário** (via
`GET /academia/documentos-extra?ativos=true`, filtrando no cliente pelos
que têm `ano_academico` igual ao ano escolhido, ou passando o ano como
query param se preferir estender a chamada — o backend aceita filtrar
client-side sem problema, a rota retorna todo o catálogo ativo da
academia) e renderizar, para cada um, um campo de upload de arquivo
(aceitando `.pdf` ou `.jpg`/`.jpeg` conforme o `tipo` daquela definição),
com indicação visual de "obrigatório" quando `obrigatorio: true`. O nome do
campo de arquivo enviado no `FormData` deve ser exatamente
`documento_extra_<id>`.

1. **`src/app/(painel)/estudantes/cadastrar/CadastroSingularForm.tsx`**
   (cadastro direto pela academia) — os documentos fixos (BI, cédula,
   declaração, certificados) já são renderizados aqui com lógica bem
   específica de "alternativas" entre tipos de certificado; **não mexa
   nessa lógica existente**. Adicione a seção de documentos extra como um
   bloco **separado e adicional**, depois dos campos fixos, dinamicamente
   gerado a partir do catálogo filtrado pelo ano acadêmico selecionado no
   próprio formulário.
2. **`src/app/(full-width-pages)/(auth)/matricula/MatriculaPublicPage.tsx`**
   (solicitação pública de matrícula) — mesma ideia: bloco adicional após
   os documentos fixos, dinâmico pelo catálogo da academia (aqui a
   academia já é conhecida via `codigo_academia` selecionado/informado no
   formulário) filtrado pelo ano acadêmico escolhido.

Nos dois casos, se um documento obrigatório não for anexado, o backend
retorna erro de validação com uma mensagem citando o rótulo do documento
— basta exibir essa mensagem de erro da API normalmente (como já é feito
para os outros erros de validação desses formulários), não precisa
duplicar a checagem de obrigatoriedade no cliente antes de enviar (embora
seja uma boa prática de UX desabilitar o botão de enviar até os
obrigatórios estarem anexados, se for simples de encaixar no fluxo atual).

## Fora de escopo (não fazer nesta tarefa)

- Tela de download/visualização dos documentos extra já enviados por um
  estudante — o backend **já tem** essa capacidade (a rota de download
  genérica que já existia para os documentos fixos também serve
  documentos extra, com `download_url` preenchido corretamente nas
  respostas que já listam documentos), mas construir a TELA de
  visualização/download no frontend não é parte desta tarefa. Se quiser
  fazer isso depois, é só consumir o `download_url` que já vem em cada
  item de `documentos` nas rotas de listagem existentes — nenhum trabalho
  de backend adicional seria necessário.
- Qualquer alteração nos documentos fixos existentes (BI, cédula,
  declaração, certificados) — nenhuma mudança de comportamento foi pedida
  neles.

## Procedimento de conclusão

1. `npx tsc --noEmit` — não deve introduzir nenhum erro nesse baseline
   (que hoje está zerado).
2. `npm run lint` — não deve introduzir NENHUM erro/warning novo além dos
   2 erros + 8 warnings pré-existentes (não relacionados a esta tarefa).
3. `npm run build` pode falhar neste sandbox especificamente por causa de
   bloqueio de rede a `fonts.googleapis.com` (usado por `next/font/google`)
   — isso é uma limitação do ambiente de teste, não do código; confirme
   que o build passa no seu próprio ambiente.
4. Teste manualmente (ou via testes automatizados, se o projeto tiver
   suíte de frontend) o fluxo: criar um documento extra obrigatório no
   catálogo da academia para um ano específico → tentar cadastrar um
   estudante direto nesse ano sem anexar o arquivo (deve bloquear com a
   mensagem do backend) → anexar o arquivo certo (deve passar).
5. Mover este arquivo para o local de tarefas concluídas usado neste
   repositório, se houver um (ex.: análogo ao `docs/Tarefas feitas/` do
   backend).

## Critérios de aceite

- [ ] Senha mínima de 8 caracteres nos 3 arquivos listados (validação +
      texto do placeholder).
- [ ] Tela de gestão do catálogo de documentos extra (criar, editar,
      desativar, reativar, listar), seguindo o padrão visual de
      `ServicosExtrasCatalogoPainel.tsx`.
- [ ] Tipos e chamadas de API novos em `src/types/api.ts` e
      `src/lib/api/services.ts`.
- [ ] Campos de upload dinâmicos em `CadastroSingularForm.tsx` e
      `MatriculaPublicPage.tsx`, nomeados `documento_extra_<id>`, filtrados
      pelo ano acadêmico do formulário.
- [ ] `tsc --noEmit` e `lint` sem regressões.
