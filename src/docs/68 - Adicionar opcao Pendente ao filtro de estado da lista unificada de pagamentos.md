---
criado: 2026-08-27
origem: conversa com Fredy (Claude como orquestrador, Codex como executor) — companion da tarefa 69 do backend (spuri-backend), mas sem nenhuma dependência técnica real entre as duas (ver seção 0)
status: concluido
concluido: 2026-08-27
tipo: correcao_de_bug
depende_de: nenhuma — o backend já suporta estado=pendente desde a tarefa 66 (spuri-backend)
---

# Adicionar a opção "Pendente" ao filtro de estado da lista unificada de pagamentos

## 0. Leia isto primeiro — sobre o seu ambiente (Codex) e sobre a relação com a tarefa 69 do backend

Você não tem acesso a rede irrestrito neste tipo de ambiente normalmente, mas nada aqui precisa disso além do já usado pelo `npm`/`npx` do próprio projeto. Claude já validou esta correção com `npx tsc --noEmit`, `npx eslint` (escopado aos 3 arquivos afetados) e `npm run build` reais, num sandbox próprio. A seção 6 tem os comandos exatos e a saída real.

**Esta tarefa nasceu na mesma conversa que a tarefa 69 do backend (`spuri-backend`), mas resolve um problema completamente diferente e não depende dela tecnicamente**: a 69 corrige o filtro `estado=Failed` no backend (cobranças gravadas como `"falhada"` ficavam invisíveis); esta tarefa só adiciona uma opção que faltava no dropdown do frontend — o backend já suporta `estado=pendente` desde a tarefa 66. As duas podem ser aplicadas e implantadas em qualquer ordem, separadamente, sem nenhum risco de contrato quebrado entre frontend e backend.

**Numeração:** 68, a próxima disponível na sequência do repositório `spuripainel` (a tarefa 67, "Consumir novo modelo de estados de cobrança...", já ocupa o número anterior).

---

## 1. Prompt recomendado para executar esta correção

> Execute exatamente a alteração descrita neste documento. A decisão de desenho já foi tomada e validada por Claude (diagnóstico completo com evidência de código, `tsc`/`eslint`/`build` reais). Sua tarefa é mecânica: (1) aplicar o diff cirúrgico em `src/components/paineis/financeiroShared.tsx` descrito na seção 3; (2) rodar cada item da seção "Checklist de validação" (seção 5) e reportar o resultado; (3) seguir o "Procedimento de conclusão" (seção 8). Não toque em nenhum arquivo ou lógica fora do escopo listado na seção 4 ("Fora de escopo").

---

## 2. Contexto

Fredy relatou: depois da tarefa 66 (backend) e sua companion, a tarefa 67 (frontend), que trocaram a opção de filtro "Pendente"/`Pending` por "Aguardando pagamento"/`aguardando_pagamento`, ficou impossível filtrar `/financas/pagamentos` e `/pagamentos` para ver só os meses que ainda nem têm nenhuma cobrança gerada (`status: "pendente"`, pendência sintética).

Causa raiz, confirmada em `src/components/paineis/financeiroShared.tsx`: a constante `ESTADO_PAGAMENTO_OPCOES`, na tarefa 67, deliberadamente não incluiu `"pendente"` como opção — o raciocínio documentado no código era que `"pendente"` "não aparece aqui como opção de filtro de COBRANÇA — só existe como o status de uma pendência sintética". Esse raciocínio ignorava que `/financas/pagamentos` e `/pagamentos` consultam a lista **unificada** (`GET /financeiro/cobrancas` e `/financeiro/cobrancas/estudante/:codigo`, seções 19.7/19.8 da `Documentação da API.md`), que mistura cobranças reais com pendências sintéticas — e para essa lista unificada, `"pendente"` **é** um valor de filtro plenamente válido e já suportado pelo backend, exatamente para separar "meses ainda nem cobrados" de "cobranças reais aguardando resolução".

Confirmado que o backend já suporta isso, sem nenhuma mudança: `DeveIncluirPendenciasSemCobranca` (`internal/finance/pagamentos_unificado.go`, repositório `spuri-backend`) já inclui as pendências sintéticas no resultado quando `estado=pendente` está entre os valores filtrados, e nenhuma cobrança real jamais tem o valor bruto `"pendente"` persistido (`EstadoPendente = "pendente"` é reservado, por design desde a tarefa 66, só para o significado sintético) — então filtrar por `estado=pendente` já devolve exatamente e só as pendências, sem nenhum ajuste de backend.

Também confirmado que o restante da UI já trata corretamente um item com `status === "pendente"` quando ele aparece na lista (o que já acontecia por padrão, sem filtro, desde a tarefa 67): `StatusBadge` já tem uma cor própria para isso (`x.includes("pend")`), `CobrancasTable` já mostra a etiqueta "Sem cobrança gerada" e já esconde o botão "Cancelar" para esses itens, e `SubtelaDetalheCobranca` já trata esse caso na tela de detalhe. Nenhum desses componentes precisa de nenhuma mudança — só faltava a opção no dropdown.

---

## 3. Diffs exatos — 1 arquivo

```diff
diff --git a/src/components/paineis/financeiroShared.tsx b/src/components/paineis/financeiroShared.tsx
index 0d4f648..455d157 100644
--- a/src/components/paineis/financeiroShared.tsx
+++ b/src/components/paineis/financeiroShared.tsx
@@ -51,14 +51,24 @@ export const origemLabel: Record<FinanceiroOrigemCobranca, string> = {
  * O valor "aguardando_pagamento" substitui o antigo "Pending" (rotulado
  * "Pendente") — ver PagamentoResumo em types/api.ts para o porquê: o back
  * end agora usa esse nome para qualquer cobrança real já gerada/tentada
- * junto à AppyPay mas ainda sem resolução, reservando "pendente" (que não
- * aparece aqui como opção de filtro de COBRANÇA — só existe como o status
- * de uma pendência sintética, sem nenhuma cobrança gerada) para esse outro
- * significado. "Expirado" foi adicionado nesta mesma tarefa: cobre
- * referências REF que a AppyPay expira sem pagamento, estado que antes não
- * tinha nenhuma opção de filtro correspondente.
+ * junto à AppyPay mas ainda sem resolução. "Expirado" foi adicionado nesta
+ * mesma tarefa: cobre referências REF que a AppyPay expira sem pagamento,
+ * estado que antes não tinha nenhuma opção de filtro correspondente.
+ *
+ * "pendente" (bug relatado por Fredy, tarefa 69): reservado para o outro
+ * significado de "pendência sintética, sem nenhuma cobrança gerada" — foi
+ * deliberadamente deixado de fora daqui na tarefa que criou esta lista,
+ * com o raciocínio de que não era um "estado de cobrança" de verdade. Mas
+ * /financas/pagamentos e /pagamentos consultam a lista UNIFICADA (cobranças
+ * reais + pendências sintéticas — ver 19.7/19.8 na documentação da API), e
+ * sem esta opção não havia nenhuma forma de filtrar só as pendências: o
+ * dropdown pulava direto de "Pago" para "Aguardando pagamento", escondendo
+ * os meses que ainda nem foram cobrados. O backend já suportava
+ * `estado=pendente` desde antes (ver DeveIncluirPendenciasSemCobranca em
+ * pagamentos_unificado.go) — faltava só a opção aqui.
  */
 export const ESTADO_PAGAMENTO_OPCOES = [
+  { value: "pendente", label: "Pendente (sem cobrança gerada)" },
   { value: "Success", label: "Pago" },
   { value: "aguardando_pagamento", label: "Aguardando pagamento" },
   { value: "Failed", label: "Falhado" },
```

---

## 4. Fora de escopo (não altere)

- **`StatusBadge`, `CobrancasTable`, `SubtelaDetalheCobranca`** (`financeiroShared.tsx`) — já tratam `status === "pendente"` corretamente desde a tarefa 67. Nenhuma mudança necessária (ver seção 2).
- **Backend (`spuri-backend`)** — `DeveIncluirPendenciasSemCobranca` já suporta `estado=pendente` desde a tarefa 66. Nenhuma mudança de backend é necessária por causa desta tarefa.
- **`EstudantePagamentosPainel.tsx` — o outro significado de `estado === "pendente"`** (linhas ~91, 110, 240, 247, 383, 389, sobre `MensalidadeMesView.estado`, não sobre o filtro de cobrança `ESTADO_PAGAMENTO_OPCOES`) — campo completamente diferente, de uma tela diferente (aba de mensalidades por pagar, não a lista histórica de cobranças). Não relacionado a esta tarefa, não tocar.
- **Ordem/posição das outras opções** em `ESTADO_PAGAMENTO_OPCOES` — mantidas exatamente como estavam; só a opção nova foi inserida, no início do array (antes de "Pago"), já que "sem cobrança gerada" é conceitualmente o que vem antes de qualquer outro estado no ciclo de vida de um pagamento.

---

## 5. Checklist de validação (Codex deve executar e reportar o resultado de cada item)

1. `grep -n '"pendente"' src/components/paineis/financeiroShared.tsx` — deve mostrar a nova entrada em `ESTADO_PAGAMENTO_OPCOES`, além das ocorrências já existentes em `StatusBadge`/`CobrancasTable`/`SubtelaDetalheCobranca` (ver seção 2 — essas não mudam).
2. `npx tsc --noEmit` — sem erros.
3. `npx eslint src/components/paineis/financeiroShared.tsx src/components/paineis/FinanceiroPagamentosPainel.tsx src/components/paineis/EstudantePagamentosPainel.tsx` — sem erros nem warnings.
4. `npm run build` — deve completar (ou falhar **apenas** na etapa de baixar a fonte `Outfit` do Google Fonts, se o seu ambiente também bloquear `fonts.googleapis.com` — nesse caso específico, não é uma falha desta tarefa, mesma exceção já documentada na tarefa 67; qualquer outro erro deve ser investigado).
5. `git diff --stat` — alteração apenas em `src/components/paineis/financeiroShared.tsx`, mais os documentos de conclusão.

Se qualquer item falhar (além da exceção explícita do item 4), não prossiga — reporte o erro exato.

---

## 6. Evidência de validação (já executada por Claude)

```
$ npx tsc --noEmit
(sem saída — sucesso)

$ npx eslint src/components/paineis/financeiroShared.tsx src/components/paineis/FinanceiroPagamentosPainel.tsx src/components/paineis/EstudantePagamentosPainel.tsx
(sem saída — sucesso)

$ npm run build
   ▲ Next.js 16.0.10 (Turbopack)
   Creating an optimized production build ...
Turbopack build encountered 1 warnings:
[next]/internal/font/google/outfit_43d50961.module.css
Error while requesting resource
There was an issue establishing a connection while requesting https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap
...
Error: Turbopack build failed with 1 errors: [...] Failed to fetch `Outfit` from Google Fonts.
```

O erro de `next build` é exclusivamente sobre a fonte `Outfit` (mesmo bloqueio de rede do sandbox de Claude para `fonts.googleapis.com` já documentado na tarefa 67) — nenhum erro relacionado a TypeScript, ESLint ou ao arquivo desta tarefa apareceu em nenhuma das três validações. A suíte completa de lint do projeto (`npm run lint`, sem escopo) foi rodada separadamente e mostrou os mesmos 2 erros e 5 warnings pré-existentes de sempre, em arquivos completamente não relacionados a esta tarefa (`verificar-email/[token]/page.tsx`, `SelecaoContextoMassa.tsx`, `Calendar.tsx`, `AppSidebar.tsx`) — confirmando que esta mudança não introduziu nenhum problema novo.

---

## 7. Critérios de aceite

- [ ] O diff da seção 3 aplicado exatamente.
- [ ] `ESTADO_PAGAMENTO_OPCOES` inclui `{ value: "pendente", label: "Pendente (sem cobrança gerada)" }`.
- [ ] Todos os 5 itens do checklist de validação (seção 5) executados e reportados com sucesso.
- [ ] Nenhum arquivo fora do escopo desta tarefa foi alterado (seção 4).

---

## 8. Procedimento de conclusão

1. Mover este arquivo para `src/docs/`, com `status: concluido` e `concluido: <data de hoje>` no frontmatter (numeração 68, a próxima disponível — a tarefa 67 já ocupa o número anterior).
2. Um commit único, mensagem: `Adicionar opcao Pendente ao filtro de estado da lista unificada de pagamentos`.
3. Reportar a Fredy: resultado de cada item do checklist e `git diff --stat` do commit.
4. Nenhum aviso especial sobre ordem de deploy é necessário: esta é uma mudança puramente aditiva no frontend (nova opção de filtro), que não depende de nenhum deploy de backend acontecer antes, junto ou depois.

**Nenhuma etapa deste procedimento remove ou altera qualquer código relacionado à inscrição de estudantes em academias, matrícula, cadastro, turmas ou vínculo de estudante à academia** — a única alteração está em `src/components/paineis/financeiroShared.tsx`, no módulo financeiro de pagamentos.
