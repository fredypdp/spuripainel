---
criado: 2026-08-23 14:00
origem: Erro de produção reportado por Fredy após a tarefa 02, diagnosticado por Claude (Anthropic) com leitura do backend real e simulação do crash em Node
status: pendente
prioridade: crítica (crash em produção)
depende_de: ["02 - Ordenacao cronologica e pagamento inline em -pagamentos do estudante.md"]
---

# Hotfix: crash "Cannot read properties of undefined (reading 'nome')" e checkboxes não empilhando verticalmente em `/pagamentos`

## 0. Leia isto primeiro

Depois de aplicada a tarefa 02, Fredy reportou em produção:

1. `Uncaught TypeError: Cannot read properties of undefined (reading 'nome')`, com uma stack de erro batendo
   dentro do processamento interno de `useState` do React (não dentro de uma promise) — ou seja, um crash
   real durante a atualização de estado, não um erro silencioso.
2. "A lista de pagamentos em 'Meus pagamentos' era pra listar verticalmente" — os itens da lista (checkboxes
   + linhas de meses pagos/anulados) não estavam empilhando um por linha.

**Os dois são bugs meus (Claude), introduzidos na tarefa 02 — o Codex implementou exatamente o que eu
especifiquei; a causa raiz está no meu desenho, não numa divergência de implementação.** Confirmei isso
comparando byte a byte o `EstudantePagamentosPainel.tsx` publicado no GitHub com o que eu tinha especificado
— são idênticos. Ambos os bugs foram raiz-causados lendo o código real (backend e o componente `Checkbox`
existente) e reproduzidos fora do navegador antes deste documento ser escrito (evidência na seção 3).

Esta é uma correção cirúrgica: só um arquivo muda (`EstudantePagamentosPainel.tsx`), só dois pontos dentro
dele. Nenhuma outra decisão de design da tarefa 02 muda.

---

## 1. Prompt recomendado para executar esta tarefa

Aplique exatamente o diff da seção 2 em `src/components/paineis/EstudantePagamentosPainel.tsx`. Não altere
mais nada nesse arquivo nem em nenhum outro. Depois de aplicar, confirme `npx tsc --noEmit` e `npx eslint
src/components/paineis/EstudantePagamentosPainel.tsx` limpos, confirme com `git status --short` que só esse
um arquivo foi alterado, e mova este documento para `docs/Tarefas feitas/` com `status: feito`.

---

## 2. Diff exato — `src/components/paineis/EstudantePagamentosPainel.tsx`

**Correção 1 — empilhamento vertical dos itens da lista.**

Localizar:

```tsx
        <div className={`space-y-2 ${titulo ? "mt-3" : ""}`}>
```

Substituir por:

```tsx
        <div className={`flex flex-col gap-2 ${titulo ? "mt-3" : ""}`}>
```

**Correção 2 — crash ao buscar o nome da academia.**

Localizar:

```tsx
    faltantes.forEach((codigoAcademia) => {
      consultasService
        .academia(codigoAcademia)
        .then((r) => setNomesAcademias((prev) => ({ ...prev, [codigoAcademia]: r.academia.nome })))
        .catch(() => { /* mantém o fallback "Academia [código]" no título desta academia */ });
    });
```

Substituir por:

```tsx
    faltantes.forEach((codigoAcademia) => {
      consultasService
        .academia(codigoAcademia)
        .then((r) => {
          // GET /consultar-academia/:codigo devolve os campos da academia
          // NO NÍVEL RAIZ da resposta (gin.H{"nome": ..., ...} em
          // internal/handlers/academia_handlers.go, GetAcademiaPorCodigo),
          // não envolvidos em `{ academia: {...} }` como o tipo
          // ConsultarAcademiaResponse sugere — mesma divergência já
          // contornada em MatriculaPublicPage.tsx (normalizarAcademia). O
          // acesso a `.nome` é resolvido aqui, FORA do updater funcional
          // de setState: se ficasse dentro do updater e lançasse, o React
          // invocaria o updater depois, fora do try/catch desta promise, e
          // o erro escaparia do `.catch()` abaixo como uma exceção não
          // tratada durante a atualização de estado.
          const bruto = r as unknown as { academia?: { nome?: string }; nome?: string };
          const nome = bruto.academia?.nome ?? bruto.nome;
          if (!nome) return;
          setNomesAcademias((prev) => ({ ...prev, [codigoAcademia]: nome }));
        })
        .catch(() => { /* mantém o fallback "Academia [código]" no título desta academia */ });
    });
```

Nenhuma outra linha do arquivo muda.

---

## 3. Causa raiz de cada bug (com evidência)

### 3.1 — Crash "Cannot read properties of undefined (reading 'nome')"

**O tipo `ConsultarAcademiaResponse` (`src/types/api.ts`) está errado para este endpoint.** Ele declara
`{ academia: AcademiaDetalhada & {...} }`, mas o handler real (`internal/handlers/academia_handlers.go`,
`GetAcademiaPorCodigo`, linha ~817) devolve os campos **direto na raiz** do JSON:

```go
resp := gin.H{
    "nivel":           academia.Nivel,
    "type":            academia.Type,
    "nome":            academia.Nome,
    "codigo_academia": academia.CodigoAcademia,
    ...
}
c.JSON(http.StatusOK, resp)
```

Ou seja, a resposta real é `{ nome: "...", codigo_academia: "...", ... }`, não `{ academia: { nome: "...",
... } }`. Isso já tinha sido descoberto antes por quem escreveu
`src/app/(full-width-pages)/(auth)/matricula/MatriculaPublicPage.tsx` — a função `normalizarAcademia`
naquele arquivo existe exatamente por isso:

```ts
function normalizarAcademia(response: unknown): AcademiaDetalhada {
  const data = response as { academia?: AcademiaDetalhada; data?: AcademiaDetalhada } & AcademiaDetalhada;
  return data.academia ?? data.data ?? data;
}
```

Na tarefa 02, eu (Claude) confiei no tipo declarado `ConsultarAcademiaResponse` sem cruzar com o handler
real — `r.academia.nome` lança porque `r.academia` não existe (é `undefined`) na resposta de verdade.

**Por que o crash aparecia como um `Uncaught TypeError` fora de qualquer `try/catch`, e não era engolido
pelo `.catch()` logo depois do `.then()`:** o acesso a `r.academia.nome` estava dentro do **updater
funcional** passado a `setNomesAcademias` — `(prev) => ({ ...prev, [codigoAcademia]: r.academia.nome })`.
O React não executa esse updater no mesmo instante em que `setNomesAcademias(...)` é chamado dentro do
`.then()`; ele guarda a função e a invoca depois, durante o processamento da atualização de estado — fora
da pilha de execução síncrona do `.then()` original. Quando o updater lança naquele momento, o erro não tem
mais nenhum `.catch()` de promise "ouvindo" — ele escapa como uma exceção não tratada dentro do próprio
mecanismo de `useState` do React, batendo exatamente na stack reportada (`Object.useState` → `r.useState` →
funções internas do React → o componente). Reproduzido em Node puro antes deste documento:

```js
function simulaReactSetState(updaterFn, prevState) { return updaterFn(prevState); }
async function fluxoAtual() {
  const r = {}; // resposta sem "academia"
  const updater = (prev) => ({ ...prev, x: r.academia.nome });
  setTimeout(() => {
    try { simulaReactSetState(updater, {}); }
    catch (e) { console.log('CRASH fora do escopo do .then/.catch original:', e.message); }
  }, 0);
}
fluxoAtual();
// => CRASH fora do escopo do .then/.catch original: Cannot read properties of undefined (reading 'nome')
```

A correção resolve os dois problemas ao mesmo tempo: (a) lê o nome de forma defensiva, aceitando tanto
`r.nome` (o formato real) quanto `r.academia.nome` (caso o endpoint um dia passe a envelopar, sem quebrar
nada) e (b) faz essa leitura **fora** do updater de `setState` — se `nome` vier vazio/indefinido, a função
simplesmente retorna sem chamar `setNomesAcademias`, mantendo o fallback `"Academia [código]"` no título, em
vez de arriscar lançar dentro do updater outra vez no futuro.

Não fiz nenhuma mudança em `src/types/api.ts` nem em `MatriculaPublicPage.tsx` — o tipo `ConsultarAcademiaResponse`
continua tecnicamente impreciso para este endpoint, mas corrigi-lo é uma limpeza separada, de menor
urgência, fora do escopo deste hotfix (o único outro consumidor já contorna isso com `normalizarAcademia`).
Se quiser, posso abrir essa limpeza como uma tarefa própria depois.

### 3.2 — Checkboxes não empilhando verticalmente

O componente `Checkbox` (`src/components/form/input/Checkbox.tsx`, não alterado por nenhuma das duas
tarefas) renderiza sua raiz como:

```tsx
<label className="group inline-flex items-center gap-2.5 select-none ...">
```

`inline-flex` faz o `<label>` se comportar como uma caixa **inline** no fluxo do documento — várias caixas
inline irmãs fluem lado a lado (como palavras numa frase), quebrando linha só quando não cabem mais na
largura disponível, independentemente de qualquer margem vertical entre elas. O container que eu usei na
tarefa 02, `<div className="space-y-2">`, só adiciona `margin-top` entre os filhos — isso não força quebra
de linha em elementos inline, então os checkboxes (e as linhas de texto simples dos meses pagos/anulados)
podiam ficar lado a lado em vez de um por linha, exatamente o comportamento relatado.

A correção troca `space-y-2` por `flex flex-col gap-2`: com `flex-col` no container, cada filho direto vira
um item de flex em coluna e ocupa sua própria linha, **independentemente do `display` que o próprio filho já
tinha** (`inline-flex` no caso do `Checkbox`, `block`/`div` normal no caso das linhas somente leitura) — por
isso essa é a correção certa para os dois tipos de linha ao mesmo tempo, não só para os checkboxes.

---

## 4. Checklist de aceitação

1. `npx tsc --noEmit` — limpo.
2. `npx eslint src/components/paineis/EstudantePagamentosPainel.tsx` — limpo.
3. `git status --short` — só `src/components/paineis/EstudantePagamentosPainel.tsx` como `M`.
4. QA manual em `/pagamentos`: os meses (checkboxes e linhas somente leitura) aparecem um por linha,
   empilhados verticalmente; o título de cada seção mostra o nome da academia (não mais "Academia [código]")
   assim que a busca de `/consultar-academia/:codigo` responder, sem nenhum erro no console do navegador.

---

## 5. Ao terminar

Mova este arquivo para `docs/Tarefas feitas/` com `status: feito`, registrando que a causa raiz foi
diagnosticada e corrigida sem depender de reprodução manual no navegador (evidência integralmente por leitura
de código real + simulação em Node, seção 3).
