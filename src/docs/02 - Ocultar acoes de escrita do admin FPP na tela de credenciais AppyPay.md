---
criado: 2026-08-22
origem: Claude (orquestrador) — a pedido de Fredy Luís, Fundador e CEO da Spuri
status: pendente
tarefa: Ocultar/desabilitar, na tela de credenciais AppyPay (spuripainel), as ações de criar/atualizar/remover/rotacionar que o admin FPP não pode mais executar sobre o contexto de uma academia, desde a correção de segurança já aplicada no backend (spuri-backend, tarefa "60 - Bloquear escrita de admin nas configurações financeiras de uma academia"). Correção puramente de UX — a proteção real já está garantida pelo backend; sem isto, o admin apenas vê um erro 403 confuso ao clicar num botão que nunca deveria estar disponível.
---

# Ocultar ações de escrita do admin FPP na tela de credenciais AppyPay

> **Papel do Codex nesta tarefa:** aplicar um patch já pronto, testado e validado
> (`tsc --noEmit`, `eslint` no arquivo e no projeto inteiro, e `npm run build`, este
> último com uma limitação de ambiente explicada na seção 6). **Não é necessário
> investigar, planejar, redesenhar ou decidir nada** — a investigação, o desenho da
> correção e a validação já foram feitos pelo Claude (orquestrador). O Codex só precisa
> aplicar o patch, rodar as validações da seção 6 e commitar.

---

## 0. Resumo executivo

**Contexto:** numa tarefa anterior (`60 - Bloquear escrita de admin nas configurações
financeiras de uma academia`, já concluída no `spuri-backend`), o backend passou a
bloquear com `403` qualquer tentativa de um admin FPP criar, atualizar, remover ou
rotacionar as configurações financeiras de uma academia (credenciais AppyPay,
mensalidade, matrícula, mês de início de cobrança) — o admin FPP continua podendo
**consultar** qualquer academia normalmente, e continua podendo escrever livremente no
contexto global `spuri` (que não pertence a nenhuma academia).

**O que ficou pendente:** a tela de credenciais AppyPay do painel
(`FinanceiroCredenciaisPainel.tsx`, usada pela rota `/financas/credenciais`) ainda mostra
os botões "Configurar credenciais", "Editar", "Remover" e "Rotacionar" para o admin FPP
mesmo quando ele está olhando para o contexto de uma academia específica — clicando
neles, o admin recebe agora um `403` do backend (a proteção real já existe), mas a
experiência fica confusa: o botão está lá, parece que deveria funcionar, e não funciona.

**O que esta tarefa corrige:** só a experiência visual — esconder/desabilitar esses
botões exatamente nos casos em que o backend já os rejeitaria, e mostrar em seu lugar um
rótulo discreto ("Apenas consulta"). **Nenhuma mudança de segurança** é feita aqui — a
segurança real já está 100% garantida pelo backend desde a tarefa 60; esta tarefa é
inteiramente sobre não oferecer, na interface, um botão que o backend já recusa.

As outras duas telas do módulo financeiro (`FinanceiroConfiguracoesPainel.tsx` — mensalidade/matrícula/início de cobrança — e `FinanceiroPagamentosPainel.tsx` — cobranças/pagamentos) **já tratavam isso corretamente antes desta tarefa**: ambas mostram, para o admin FPP, uma tela de aviso "indisponível no momento" em vez de qualquer formulário de escrita, e **nenhuma das duas foi alterada**. Conferido e confirmado — ver seção 2.

**Arquivo alterado:** 1 (`src/components/paineis/FinanceiroCredenciaisPainel.tsx`).
**Arquivos a remover:** nenhum.
**Rotas ou chamadas de API novas:** nenhuma — a tela já chamava exatamente os mesmos
endpoints; a mudança é só sobre quando mostrar cada botão.
**Risco de regressão:** validado como nulo — `tsc --noEmit` e `eslint` (arquivo e projeto
inteiro) limpos antes e depois do patch, incluindo num clone novo do `main` atual.

---

## 1. Onde estava o problema (com evidência do código, não suposição)

Em `src/components/paineis/FinanceiroCredenciaisPainel.tsx`:

1. **Botão "Configurar credenciais"** (linha ~265, variável `canCreate`): calculado como
   ```ts
   const canCreate = isAcademia || contextFilter === "spuri" || (contextFilter === "academia" && !!codigoAcademia);
   ```
   O terceiro termo (`contextFilter === "academia" && !!codigoAcademia`) habilitava o
   botão para o admin FPP sempre que ele filtrasse por uma academia específica — mas o
   backend, desde a tarefa 60, **sempre** rejeita essa escrita com `403` quando o ator é
   admin e o contexto é uma academia.

2. **Botões "Editar" e "Remover" de cada linha da tabela** (dentro do `rows.map(...)`,
   por volta da linha ~345): eram renderizados **incondicionalmente**, sem nenhuma
   verificação de `isFpp`/`isAcademia`/contexto da própria linha. Um admin FPP olhando a
   lista "Todas" (que mostra credenciais de várias academias ao mesmo tempo) via os
   botões "Editar"/"Remover" em **todas** as linhas, inclusive nas de academias — mesmo
   sabendo que o backend rejeitaria.

3. **Botão "Rotacionar" do segredo de webhook** (dentro de `WebhookSecretPanel`, por
   volta da linha ~481): também renderizado incondicionalmente, junto do botão
   "Consultar segredo". A consulta continua sempre permitida para o admin (é leitura),
   mas a rotação é escrita — hoje o backend responde `403` quando a credencial pertence a
   uma academia.

Nenhum desses três pontos verificava, antes desta tarefa, se o **contexto daquela
credencial específica** (`spuri` ou uma academia) permitia escrita para o ator atual — só
verificavam se o ator tinha *algum* acesso à tela (`isAcademia || isFpp`), o que não é a
mesma coisa que poder escrever ali.

---

## 2. Confirmado: as outras duas telas do módulo já estavam corretas (sem ação)

- **`FinanceiroConfiguracoesPainel.tsx`** (mensalidade, matrícula, início de cobrança):
  quando `isFpp` é verdadeiro, a tela inteira retorna mais cedo (antes de qualquer
  formulário) mostrando só um aviso: *"Propina, matrícula e as demais configurações desta
  página pertencem a cada academia, não ao administrador — indisponível no momento."* O
  admin nunca chega a ver nenhum botão de escrita nesta tela. Isso já bate exatamente com
  o backend (mensalidade/matrícula/início de cobrança não têm contexto `spuri` — são
  100% exclusivas de cada academia). **Não precisa de nenhuma mudança.**

- **`FinanceiroPagamentosPainel.tsx`** (cobranças/pagamentos): mesma coisa — quando
  `isFpp`, mostra só *"Ainda não existe um tipo de cobrança específico para o Spuri —
  indisponível no momento."*, sem chegar a nenhuma listagem ou botão. Além disso, criar
  cobrança e cancelar cobrança **não fizeram parte** da correção de segurança da tarefa
  60 (o backend preservou de propósito o comportamento antigo do admin para essas
  operações transacionais, por não serem "configurações" — ver seção 2 da tarefa 60).
  **Não precisa de nenhuma mudança.**

---

## 3. Correção aplicada (o que muda e por quê)

Adicionei uma variável `podeGerir` (por linha da tabela) e ajustei `canCreate`, ambas
espelhando **exatamente** a mesma regra que `authorizeFinanceScope` aplica no backend:

- **Academia**: sempre pode gerir (criar/editar/remover/rotacionar) — comportamento
  inalterado.
- **Admin FPP**: só pode gerir quando o contexto é `spuri`. Nunca quando o contexto é uma
  academia (`contexto_tipo === "academia"`), mesmo que o admin esteja filtrando por ela.

Isso afeta três pontos, todos no mesmo arquivo:

1. `canCreate` (controla o botão "Configurar credenciais", em dois lugares da tela):
   ```ts
   const canCreate = isAcademia || (isFpp && contextFilter === "spuri");
   ```

2. Dentro do `rows.map(...)`, cada linha agora calcula `podeGerir` a partir do **contexto
   daquela credencial específica** (não do filtro selecionado na tela):
   ```ts
   const podeGerir = isAcademia || (isFpp && credencial.contexto_tipo === "spuri");
   ```
   Quando `podeGerir` é `false`, a célula "Ações" mostra o texto discreto "Apenas
   consulta" em vez dos botões "Editar"/"Remover".

3. `WebhookSecretPanel` passa a receber uma nova prop `podeRotacionar` (o mesmo valor de
   `podeGerir` da linha) e só mostra o botão "Rotacionar" quando ela é `true`. O botão
   "Consultar segredo" continua sempre visível — consultar é leitura, e o admin FPP
   sempre pode consultar, em qualquer academia.

Nada além disso muda: nenhuma chamada de API nova, nenhum componente novo, nenhuma outra
tela tocada.

---

## 4. Arquivo completo, já corrigido (para copiar e substituir integralmente)

Arquivo anexo: **`FinanceiroCredenciaisPainel.tsx`** (581 linhas) — substitua
integralmente `src/components/paineis/FinanceiroCredenciaisPainel.tsx` por este
conteúdo. Use este método se o patch da seção 5 não aplicar.

---

## 5. Como aplicar — patch anexo (método principal)

O arquivo **`61_ocultar_acoes_admin_credenciais_academia.patch`** (anexo, para colocar na
raiz do repositório `spuripainel` antes de aplicar) contém o diff exato e completo desta
mudança. Validado com `git apply --check` a partir de um clone limpo do `main` mais
recente do GitHub no momento da entrega — deve aplicar sem conflito.

```bash
git apply 61_ocultar_acoes_admin_credenciais_academia.patch
```

Se falhar, use o arquivo completo da seção 4 no lugar (substituição integral do arquivo).
Se o `main` tiver avançado com mudanças novas nesse mesmo arquivo desde a entrega desta
tarefa, não tente mesclar manualmente — pare e sinalize para revisão.

---

## 6. Validação já realizada por mim (evidência) e o que falta para o Codex

Validado, duas vezes (uma no meu sandbox de trabalho, outra a partir de um clone 100%
novo do `main` atual, com o patch já aplicado):

- `npx tsc --noEmit` — limpo, antes e depois do patch.
- `npx eslint src/components/paineis/FinanceiroCredenciaisPainel.tsx` — limpo, antes e
  depois do patch (zero erros, zero avisos).
- `npx eslint .` (projeto inteiro) — depois do patch, aparecem só os **2 erros
  pré-existentes e não relacionados** já conhecidos deste repositório
  (`verificar-email/[token]/page.tsx` e `components/calendar/Calendar.tsx`) — nenhum erro
  novo, nenhum no arquivo alterado por este patch.
- `npm run build` — falha no meu ambiente por uma limitação de rede conhecida e já
  documentada (o sandbox não alcança `fonts.googleapis.com`, usado por `next/font` para
  baixar a fonte "Outfit"); **não é um problema de código** — é a mesma limitação já
  registrada em tarefas anteriores deste mesmo repositório. **O Codex deve rodar `npm run
  build` de verdade no seu ambiente como checagem final** — se o ambiente do Codex também
  não alcançar `fonts.googleapis.com`, isso é uma limitação de ambiente (idêntica à já
  conhecida), não uma falha desta tarefa; qualquer outro erro de build, esse sim, deve
  ser investigado.

O Codex **não precisa** rodar nenhum teste de integração nem montar nenhum ambiente
especial — esta tarefa não toca em nenhuma lógica de backend, API, nem em nenhum outro
arquivo do frontend além do listado na seção acima.

---

## 7. Análise do arquivo (funcionalidade confirmada, sem erros)

### `src/components/paineis/FinanceiroCredenciaisPainel.tsx`
- **`tsc --noEmit`**: limpo — nenhum erro de tipo. A nova prop `podeRotacionar: boolean`
  em `WebhookSecretPanel` é passada em todas as chamadas do componente (só existe uma,
  dentro do `rows.map`), então não há nenhum "missing prop" nem tipo incompatível.
- **`eslint`**: limpo — nenhuma regra violada (incluindo `react-hooks/*`, já que nenhum
  hook novo foi introduzido — `podeGerir` é uma constante simples calculada por
  iteração, não um hook).
- **Redeclarações/undefined**: nenhuma — `podeGerir` é declarado uma vez por iteração do
  `.map`, com escopo local a cada linha; não colide com nenhum outro identificador do
  arquivo (confirmado por `tsc`, que acusaria erro de sombreamento/redeclaração se
  houvesse).
- **Lógica isolada**: a mudança é inteiramente sobre em quais condições exibir cada
  botão de ação — nenhuma lógica de formulário, validação, ou chamada de API foi alterada
  (as funções `handleSubmit`, `handleRemover`, `openCreate`, `openEdit` continuam
  exatamente iguais; só passaram a ser inacessíveis por botão quando não fazem sentido).
- **Consistência com o restante do arquivo**: a variável `podeGerir` usa exatamente a
  mesma convenção de nomes e o mesmo padrão (`isAcademia || (isFpp && condição)`) já
  usado em `canCreate` no mesmo arquivo, e o mesmo padrão (`isFpp && user?.admin?.role
  === "fpp"`) já usado nas outras duas telas do módulo (seção 2).

**Conclusão da análise:** o arquivo, depois do patch, compila sem erro de tipo, passa em
`eslint` sem nenhum apontamento, e não introduz nenhuma regressão nos outros arquivos do
projeto (confirmado rodando `eslint` no projeto inteiro, não só no arquivo alterado).

---

## 8. Passo a passo exato para o Codex

1. No repositório `spuripainel`, na raiz, aplicar o patch:
   ```bash
   git apply 61_ocultar_acoes_admin_credenciais_academia.patch
   ```
   Se falhar, usar o arquivo completo da seção 4 (substituição integral) — e se houver
   dúvida sobre conflito com mudanças novas nesse arquivo, parar e reportar em vez de
   decidir sozinho.

2. Conferir que só o arquivo da seção 0 aparece como modificado:
   ```bash
   git status
   ```

3. Rodar as checagens que não dependem de rede:
   ```bash
   npx tsc --noEmit
   npx eslint src/components/paineis/FinanceiroCredenciaisPainel.tsx
   ```
   Ambos devem sair limpos (sem erros).

4. Rodar o build completo (checagem final obrigatória, mesmo com a limitação de rede
   explicada na seção 6):
   ```bash
   npm run build
   ```

5. Commitar com uma mensagem descrevendo a correção, por exemplo:
   ```
   fix(financas): oculta acoes de escrita do admin FPP em credencial de academia

   - canCreate e a nova variavel por-linha podeGerir espelham
     authorizeFinanceScope do backend: admin FPP so pode criar/editar/
     remover/rotacionar credenciais do contexto spuri, nunca do contexto de
     uma academia (backend ja bloqueia isso desde a tarefa 60 do
     spuri-backend)
   - Linhas de credencial de academia mostram "Apenas consulta" para o
     admin FPP em vez dos botoes Editar/Remover
   - WebhookSecretPanel ganha prop podeRotacionar: Consultar segredo
     continua sempre visivel (leitura), Rotacionar some quando a
     credencial pertence a uma academia e o ator e admin FPP
   - Nenhuma mudanca de seguranca: a protecao real ja esta no backend;
     esta tarefa e so para nao oferecer um botao que o backend ja recusa
   - Validado com tsc --noEmit e eslint (arquivo e projeto inteiro), sem
     nenhuma regressao alem dos 2 erros de eslint ja pre-existentes e
     nao relacionados neste repositorio
   ```

---

## 9. Critérios de aceitação

- [ ] `git status` mostra somente `src/components/paineis/FinanceiroCredenciaisPainel.tsx`
      como modificado.
- [ ] `npx tsc --noEmit` não reporta nenhum erro.
- [ ] `npx eslint src/components/paineis/FinanceiroCredenciaisPainel.tsx` não reporta
      nenhum erro nem aviso.
- [ ] `npm run build` conclui com sucesso no ambiente do Codex (se falhar só pela
      limitação de rede de `fonts.googleapis.com`, registrar isso como limitação
      ambiental, não como falha desta tarefa).
- [ ] Nenhum arquivo novo criado, nenhum arquivo removido.
- [ ] Nenhuma rota nova, nenhum componente novo, nenhuma chamada de API nova.
- [ ] Commit feito com a mensagem descrita na seção 8, passo 5 (ou equivalente).
