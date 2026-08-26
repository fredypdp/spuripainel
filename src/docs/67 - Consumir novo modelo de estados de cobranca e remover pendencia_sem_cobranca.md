---
criado: 2026-08-26
origem: conversa com Fredy (Claude como orquestrador, Codex como executor) — companion da tarefa 66 do backend (spuri-backend)
status: concluido
concluido: 2026-08-26
tipo: correcao_de_bug_e_ajuste_de_contrato
depende_de: docs/Lista de Tarefas/66 (repositório spuri-backend) — aplicar DEPOIS ou JUNTO desta, nunca esta sozinha em produção por muito tempo
---

# Consumir o novo modelo de estados de cobrança (`aguardando_pagamento`) e a remoção de `pendencia_sem_cobranca` — companion da tarefa 66 do backend

## 0. Leia isto primeiro — sobre o seu ambiente (Codex) e sobre a ordem de deploy

Claude já validou esta correção inteira rodando o frontend real: `npm install`, `npx tsc --noEmit` (sem erros), `npx eslint` nos 4 arquivos alterados (sem erros/warnings), e `npm run build` (Next.js 16 + Turbopack) — o build chega a compilar toda a aplicação e só falha na etapa de baixar a fonte `Outfit` do Google Fonts (`fonts.googleapis.com`), porque o sandbox de Claude bloqueia esse domínio na rede; isso é uma limitação de ambiente **completamente alheia a esta tarefa** (a mesma falha aconteceria compilando o `main` sem nenhuma mudança) — não é algo para investigar ou corrigir aqui. Se o seu ambiente tiver acesso à internet normal, `npm run build` deve completar sem esse erro.

**Ordem de deploy — diferente da tarefa 64/65:** a tarefa 66 do backend (`spuri-backend`) remove o campo `pendencia_sem_cobranca` da resposta JSON de `GET /financeiro/cobrancas` e `GET /financeiro/cobrancas/estudante/:codigo`. Um frontend não atualizado que ainda dependesse desse campo (a versão atual em produção, antes desta tarefa) pararia de mostrar a distinção "sem cobrança gerada" corretamente assim que o backend 66 for implantado — o campo simplesmente deixaria de vir na resposta (`undefined` em vez de `true`/`false`). Aplique esta tarefa junto com a 66 do backend; não deixe o backend novo em produção sozinho por muito tempo sem este frontend acompanhando.

---

## 1. Prompt recomendado para executar esta correção

> Execute exatamente as alterações descritas neste documento, nesta ordem. Todas as decisões de desenho já foram tomadas e validadas por Claude (implementação testada com `tsc --noEmit`, `eslint` e `next build` reais). Sua tarefa é mecânica: (1) aplicar os 4 diffs cirúrgicos descritos na seção 3, na ordem em que aparecem; (2) rodar cada item da seção "Checklist de validação" (seção 5) e reportar o resultado; (3) seguir o "Procedimento de conclusão" (seção 6). Não toque em nenhum arquivo fora do escopo listado na seção 4 ("Fora de escopo").

---

## 2. Contexto

A tarefa 66 do backend (`spuri-backend`) redesenha o modelo de estados de uma cobrança: o estado "cobrança gerada, ainda sem resolução do provedor" — antes gravado e devolvido como o valor bruto da AppyPay, `"Pending"` (ou, em alguns casos, `"Requested"`) — passa a se chamar `"aguardando_pagamento"`, tanto na escrita quanto na leitura (inclusive para cobranças mais antigas, criadas antes desta mudança, por uma equivalência histórica aplicada no filtro do backend). Como esse renomeio torna `status` sozinho suficiente para saber se um item da lista unificada de pagamentos (`PagamentoResumo`, ver `types/api.ts`) é uma cobrança real ou uma pendência sintética (`status === "pendente"` é, e sempre foi, exclusivo de pendências sintéticas — uma cobrança real nunca usa esse valor), o campo booleano `pendencia_sem_cobranca` — introduzido pela tarefa 65 especificamente para resolver essa ambiguidade — se torna redundante e foi removido do contrato da API.

Esta tarefa atualiza o frontend para acompanhar essas duas mudanças:

- **`src/types/api.ts`**: `PagamentoResumo` deixa de ter o campo `pendencia_sem_cobranca` — vira um alias de `CobrancaResumo` (`export type PagamentoResumo = CobrancaResumo`), já que hoje não tem mais nenhum campo próprio.
- **`src/components/paineis/financeiroShared.tsx`**: `StatusBadge` reconhece o novo valor `"aguardando_pagamento"` (mesmo estilo visual âmbar de antes, já que semanticamente é o mesmo tipo de "aguardando"); `cancelavel()` passa a checar `status === "pendente"` em vez de `pendencia_sem_cobranca`, e ganha `"expired"`/`"expirado"` na lista de estados terminais (gap que também existia no frontend, espelhando o mesmo gap corrigido no backend); os dois lugares que mostravam o badge "Sem cobrança gerada" condicionados a `pendencia_sem_cobranca` passam a checar `status === "pendente"`; nova constante exportada `ESTADO_PAGAMENTO_OPCOES` com as opções de filtro de estado, incluindo o novo `"aguardando_pagamento"` (rotulado "Aguardando pagamento", substituindo o antigo `"Pending"`/"Pendente") e um `"Expired"`/"Expirado" novo (gap de cobertura que também não existia antes).
- **`src/components/paineis/FinanceiroPagamentosPainel.tsx`** e **`src/components/paineis/EstudantePagamentosPainel.tsx`**: as duas cópias duplicadas e idênticas do array de opções de estado (`ESTADO_OPCOES` e `ESTADO_HISTORICO_OPCOES`, respectivamente) são substituídas por uma referência à nova constante compartilhada `ESTADO_PAGAMENTO_OPCOES` — elimina a duplicação e a possibilidade de as duas telas divergirem no futuro.

---
## 3. Diffs exatos — 4 arquivos

Cada bloco abaixo é um diff unificado real, gerado por Claude comparando um clone limpo de `main` com o estado já validado (`tsc --noEmit`, `eslint`, `next build` reais). Aplique cada hunk (`@@ ... @@`) exatamente: remova as linhas que começam com `-`, adicione as linhas que começam com `+`, mantendo as linhas de contexto (sem prefixo) como estão. Não altere nada fora dos hunks mostrados.

```diff
==========================================
FILE: src/types/api.ts
==========================================
--- a/src/types/api.ts
+++ b/src/types/api.ts
@@ -1467,38 +1467,38 @@
   descricao?: string;
   metodo_pagamento?: FinanceiroMetodoPagamento;
   codigo_estudante?: string;
   codigo_solicitacao?: string;
   mensalidades?: { ano_letivo: string; mes: number }[];
   /**
-   * Ausente para um item sintético (`pendencia_sem_cobranca: true`) — não
-   * existe nenhuma atividade real para reportar nesse caso. Sempre
-   * presente para um item real.
+   * Ausente para um item sintético (`status === "pendente"`, ver
+   * PagamentoResumo) — não existe nenhuma atividade real para reportar
+   * nesse caso. Sempre presente para um item real.
    */
   atualizado_em?: string;
 }
 
 /**
- * PagamentoResumo é CobrancaResumo mais um único campo adicional,
- * `pendencia_sem_cobranca` — ver ListarCobrancasResponse.pagamentos para o
- * porquê da unificação com as antigas `pendencias_sem_cobranca`. Quando
- * `pendencia_sem_cobranca` é `true`, o item foi sintetizado a partir de uma
- * pendência de mensalidade sem NENHUMA cobrança criada (nem tentada) — não
- * existe uma cobrança real por trás dele, e por isso vários campos de
- * CobrancaResumo (provider_charge_id, merchant_transaction_id,
- * metodo_pagamento, atualizado_em) ficam ausentes. Quando é `false`, é uma
- * cobrança real, com todos os campos preenchidos como sempre foi.
+ * PagamentoResumo é a unidade de ListarCobrancasResponse.pagamentos — ver
+ * esse tipo para o porquê da unificação com as antigas
+ * `pendencias_sem_cobranca`. Hoje é idêntico a CobrancaResumo.
  *
- * `status === "pendente"` pode vir de QUALQUER um dos dois casos — é
- * `pendencia_sem_cobranca` que desambigua: uma cobrança real cujo status
- * ainda não foi resolvido pelo provedor (`pendencia_sem_cobranca: false`),
- * ou uma pendência sintética (`pendencia_sem_cobranca: true`).
+ * Existem dois casos possíveis por trás de cada item, e `status` sozinho
+ * já diz qual é, sem precisar de nenhum campo booleano adicional:
+ * - `status === "pendente"`: pendência sintética — o item foi sintetizado
+ *   a partir de uma pendência de mensalidade sem NENHUMA cobrança criada
+ *   (nem tentada); não existe uma cobrança real por trás dele, e por isso
+ *   vários campos de CobrancaResumo (provider_charge_id,
+ *   merchant_transaction_id, metodo_pagamento, atualizado_em) ficam
+ *   ausentes.
+ * - Qualquer outro `status` (incluindo `"aguardando_pagamento"`, o estado
+ *   de uma cobrança real já gerada/tentada junto à AppyPay mas ainda sem
+ *   resolução): cobrança real, com todos os campos preenchidos como
+ *   sempre foi. Uma cobrança real NUNCA tem `status === "pendente"`.
  */
-export interface PagamentoResumo extends CobrancaResumo {
-  pendencia_sem_cobranca: boolean;
-}
+export type PagamentoResumo = CobrancaResumo;
 
 export interface ListarCobrancasParams {
   contexto_tipo?: FinanceiroContextoTipo;
   codigo_academia?: string;
   estado?: string[];
   tipo?: FinanceiroOrigemCobranca[];
@@ -1517,14 +1517,14 @@
 }
 
 export interface ListarCobrancasResponse {
   /**
    * Lista única de pagamentos — cobranças reais e pendências de
    * mensalidade sem nenhuma cobrança vinculada, juntas, paginadas como uma
-   * lista só (ver PagamentoResumo.pendencia_sem_cobranca para distinguir
-   * as duas). Itens sintéticos vêm sempre primeiro (representam ação
+   * lista só (ver PagamentoResumo: `status === "pendente"` distingue as
+   * duas). Itens sintéticos vêm sempre primeiro (representam ação
    * pendente); cobranças reais depois, por atividade mais recente.
    * Substituiu os antigos campos separados `cobrancas` +
    * `pendencias_sem_cobranca` — ver GET /financeiro/cobrancas.
    */
   pagamentos: PagamentoResumo[];
   total: number;
==========================================
FILE: src/components/paineis/financeiroShared.tsx
==========================================
--- a/src/components/paineis/financeiroShared.tsx
+++ b/src/components/paineis/financeiroShared.tsx
@@ -40,12 +40,36 @@
   matricula: "Matrícula",
   mensalidade: "Mensalidade",
   avulsa: "Outros",
 };
 
 /**
+ * Opções do filtro de estado usado tanto em FinanceiroPagamentosPainel
+ * quanto em EstudantePagamentosPainel — antes desta constante existir, os
+ * dois arquivos mantinham cada um a sua própria cópia idêntica, com risco
+ * de desalinhar.
+ *
+ * O valor "aguardando_pagamento" substitui o antigo "Pending" (rotulado
+ * "Pendente") — ver PagamentoResumo em types/api.ts para o porquê: o back
+ * end agora usa esse nome para qualquer cobrança real já gerada/tentada
+ * junto à AppyPay mas ainda sem resolução, reservando "pendente" (que não
+ * aparece aqui como opção de filtro de COBRANÇA — só existe como o status
+ * de uma pendência sintética, sem nenhuma cobrança gerada) para esse outro
+ * significado. "Expirado" foi adicionado nesta mesma tarefa: cobre
+ * referências REF que a AppyPay expira sem pagamento, estado que antes não
+ * tinha nenhuma opção de filtro correspondente.
+ */
+export const ESTADO_PAGAMENTO_OPCOES = [
+  { value: "Success", label: "Pago" },
+  { value: "aguardando_pagamento", label: "Aguardando pagamento" },
+  { value: "Failed", label: "Falhado" },
+  { value: "Cancelled", label: "Cancelado" },
+  { value: "Expired", label: "Expirado" },
+];
+
+/**
  * Texto de exibição de cada método de pagamento AppyPay — usado em toda
  * parte de /financas/* e /pagamentos onde um método aparece para o
  * usuário (nunca mostrar "GPO"/"REF"/"GPO_QR" cru).
  */
 export const METODO_PAGAMENTO_LABEL: Record<FinanceiroMetodoPagamento, string> = {
   GPO: "MCX Express via número de telefone",
@@ -139,17 +163,17 @@
 }
 
 export function StatusBadge({ status }: { status: string }) {
   const x = status.toLowerCase();
   const cls = x.includes("success") || x.includes("pago")
     ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
-    : x.includes("pend")
+    : x.includes("pend") || x.includes("aguardando")
     ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
     : x.includes("fail") || x.includes("falh")
     ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
-    : x.includes("cancel")
+    : x.includes("cancel") || x.includes("expir")
     ? "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
     : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
   return <span className={`rounded-full px-2 py-1 text-xs font-medium ${cls}`}>{status}</span>;
 }
 
 export function Qr({ value }: { value?: string }) {
@@ -461,17 +485,23 @@
   onOpen: (r: PagamentoResumo) => void;
   onCancelar?: (r: PagamentoResumo, motivo?: string) => Promise<void>;
 }) {
   const [cancelandoId, setCancelandoId] = useState<string | null>(null);
   const [erro, setErro] = useState<string | null>(null);
   const [cobrancaParaCancelar, setCobrancaParaCancelar] = useState<PagamentoResumo | null>(null);
-  // Uma pendência sem cobrança (pendencia_sem_cobranca=true) nunca é
-  // cancelável — não existe nenhuma cobrança real por trás dela para
-  // cancelar (ver PagamentoResumo).
+  // Uma pendência sintética (status="pendente") nunca é cancelável — não
+  // existe nenhuma cobrança real por trás dela para cancelar (ver
+  // PagamentoResumo em types/api.ts: desde esta tarefa, status="pendente"
+  // é o único sinal necessário para saber isso, sem precisar de nenhum
+  // campo adicional). "expired"/"expirado" foi adicionado à lista de
+  // estados terminais nesta mesma tarefa — faltava antes, o que deixava o
+  // botão "Cancelar" aparecer para uma referência REF já expirada na
+  // AppyPay.
   const cancelavel = (r: PagamentoResumo) =>
-    !r.pendencia_sem_cobranca && !["success", "pago", "cancelado", "cancelled", "failed", "falhado"].includes(r.status.toLowerCase());
+    r.status.toLowerCase() !== "pendente" &&
+    !["success", "pago", "cancelado", "cancelled", "failed", "falhado", "expired", "expirado"].includes(r.status.toLowerCase());
 
   return (
     <div className="space-y-2">
       {erro && <p className="text-sm text-error-500">{erro}</p>}
       <div className="overflow-x-auto">
         <Table className="w-full text-left">
@@ -490,13 +520,13 @@
                 <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{r.codigo_estudante || "—"}</TableCell>
                 <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{money(r.valor)}</TableCell>
                 <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{r.metodo_pagamento ? METODO_PAGAMENTO_LABEL[r.metodo_pagamento] : "—"}</TableCell>
                 <TableCell className="px-3 py-2">
                   <div className="flex flex-wrap items-center gap-1.5">
                     <StatusBadge status={r.status} />
-                    {r.pendencia_sem_cobranca && (
+                    {r.status.toLowerCase() === "pendente" && (
                       <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                         Sem cobrança gerada
                       </span>
                     )}
                   </div>
                 </TableCell>
@@ -557,16 +587,17 @@
  *   estudante. GET /consultar-estudante/:codigo só é permitido para
  *   academia/admin — por isso EstudantePagamentosPainel usa
  *   mostrarDadosEstudante={false} (o estudante já sabe quem é).
  * - Não tem ação de cancelar: cancelar é uma ação sobre a cobrança na
  *   listagem (CobrancasTable, botão "Cancelar" na própria linha), não faz
  *   parte de "ler os detalhes" dela.
- * - Quando pendencia_sem_cobranca=true, vários campos que só existem para
- *   uma cobrança real (referência AppyPay, transação, atualizado em) ficam
- *   "—": não existe nenhuma cobrança de verdade por trás desse item, e um
- *   aviso explica isso no lugar da ação de cancelar.
+ * - Quando status="pendente" (pendência sintética, ver PagamentoResumo em
+ *   types/api.ts), vários campos que só existem para uma cobrança real
+ *   (referência AppyPay, transação, atualizado em) ficam "—": não existe
+ *   nenhuma cobrança de verdade por trás desse item, e um aviso explica
+ *   isso no lugar da ação de cancelar.
  */
 export function SubtelaDetalheCobranca({ cobranca, onVoltar, mostrarDadosEstudante = false }: {
   cobranca: PagamentoResumo;
   onVoltar: () => void;
   mostrarDadosEstudante?: boolean;
 }) {
@@ -588,13 +619,13 @@
       .finally(() => setCarregandoEstudante(false));
   }, [cobranca.id, mostrarDadosEstudante, codigoEstudante]);
 
   return (
     <SubtelaPanel title="Detalhe da cobrança" icon="mdi:receipt-text-outline" onVoltar={onVoltar}>
       <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
-        {cobranca.pendencia_sem_cobranca && (
+        {cobranca.status.toLowerCase() === "pendente" && (
           <p className="rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
             Este mês ainda não foi pago e não tem nenhuma cobrança gerada — nenhuma tentativa de pagamento foi feita ainda.
           </p>
         )}
         <p><b>Tipo:</b> {origemLabel[cobranca.origem] ?? cobranca.origem}</p>
         <p><b>Descrição:</b> {cobranca.descricao || "—"}</p>
==========================================
FILE: src/components/paineis/FinanceiroPagamentosPainel.tsx
==========================================
--- a/src/components/paineis/FinanceiroPagamentosPainel.tsx
+++ b/src/components/paineis/FinanceiroPagamentosPainel.tsx
@@ -8,12 +8,13 @@
 import Alert from "@/components/ui/alert/Alert";
 import Icon from "@/components/ui/Icon";
 import SearchableSelect from "@/components/form/SearchableSelect";
 import {
   CobrancasTable,
   EmptyState,
+  ESTADO_PAGAMENTO_OPCOES,
   LoadingState,
   NOME_MES,
   PaginacaoSetas,
   SubtelaDetalheCobranca,
   SubtelaPanel,
   SubtelasMenu,
@@ -21,19 +22,13 @@
   formatAnoLetivo,
 } from "@/components/paineis/financeiroShared";
 import type { FinanceiroOrigemCobranca, PagamentoResumo } from "@/types/api";
 
 const PAGE_SIZE = 30;
 
-const ESTADO_OPCOES = [
-  { value: "", label: "Todos os estados" },
-  { value: "Success", label: "Pago" },
-  { value: "Pending", label: "Pendente" },
-  { value: "Failed", label: "Falhado" },
-  { value: "Cancelled", label: "Cancelado" },
-];
+const ESTADO_OPCOES = [{ value: "", label: "Todos os estados" }, ...ESTADO_PAGAMENTO_OPCOES];
 
 type MesDoAnoLetivo = { mes: number; ano: number; label: string };
 
 /**
  * Meses fixos do sistema de um ano letivo, dado o tipo da academia
  * (escolar ou superior) — mesma regra de mesesAnoLetivo() no backend
@@ -65,24 +60,26 @@
  * FinanceiroConfiguracoesPainel — nada de <select> para escolher o tipo de
  * cobrança): Mensalidade/Propina abre um drill-down adicional de ano
  * letivo → mês antes de chegar na listagem; Taxa de matrícula e Outros vão
  * direto para a listagem, sem esse passo extra (uma cobrança de matrícula
  * ou avulsa não tem o conceito de "mês do ano letivo").
  *
- * A listagem final sempre mostra TODOS os estados (Pago/Pendente/Falhado/
- * Cancelado) — o filtro de estado que já existia continua disponível para
- * quem quiser restringir mais. Para Mensalidade, a mesma tabela também já
- * traz os meses ainda não pagos sem nenhuma cobrança gerada, marcados com
- * `pendencia_sem_cobranca: true` (ver CobrancasTable e
- * PagamentoResumo.pendencia_sem_cobranca) — antes desta tarefa isso vinha
- * como uma segunda lista separada (`pendencias_sem_cobranca`), com
- * paginação própria; agora é uma lista só, paginada pelo backend como uma
- * única sequência (ver `ListarPagamentosUnificado` no backend). O
- * drill-down por ano letivo/mês continua existindo pelo mesmo motivo de
- * antes: sem um mês específico selecionado, o backend não computa
- * pendências (evita varredura de toda a academia sem limite).
+ * A listagem final sempre mostra TODOS os estados (Pago/Aguardando
+ * pagamento/Falhado/Cancelado/Expirado) — o filtro de estado que já
+ * existia continua disponível para quem quiser restringir mais. Para
+ * Mensalidade, a mesma tabela também já traz os meses ainda não pagos sem
+ * nenhuma cobrança gerada, marcados com `status: "pendente"` (ver
+ * CobrancasTable e PagamentoResumo em types/api.ts — desde esta tarefa,
+ * "pendente" sozinho já diz isso, sem precisar de nenhum campo adicional)
+ * — antes disso vinha como uma segunda lista separada
+ * (`pendencias_sem_cobranca`), com paginação própria; agora é uma lista
+ * só, paginada pelo backend como uma única sequência (ver
+ * `ListarPagamentosUnificado` no backend). O drill-down por ano letivo/mês
+ * continua existindo pelo mesmo motivo de antes: sem um mês específico
+ * selecionado, o backend não computa pendências (evita varredura de toda
+ * a academia sem limite).
  *
  * Admin (FPP): ainda não existe tipo de cobrança específico para o Spuri,
  * então a tela mostra apenas um aviso "indisponível no momento" — igual a
  * antes desta tarefa.
  */
 export default function FinanceiroPagamentosPainel() {
==========================================
FILE: src/components/paineis/EstudantePagamentosPainel.tsx
==========================================
--- a/src/components/paineis/EstudantePagamentosPainel.tsx
+++ b/src/components/paineis/EstudantePagamentosPainel.tsx
@@ -9,12 +9,13 @@
 import Select from "@/components/form/Select";
 import SearchableSelect from "@/components/form/SearchableSelect";
 import Checkbox from "@/components/form/input/Checkbox";
 import {
   CobrancasTable,
   EmptyState,
+  ESTADO_PAGAMENTO_OPCOES,
   LoadingState,
   MetodoPagamentoSelector,
   PaginacaoSetas,
   Qr,
   StatusBadge,
   SubtelaDetalheCobranca,
@@ -32,19 +33,13 @@
   { value: "", label: "Todos os tipos" },
   { value: "mensalidade", label: "Mensalidade" },
   { value: "matricula", label: "Matrícula" },
   { value: "avulsa", label: "Outros" },
 ];
 
-const ESTADO_HISTORICO_OPCOES = [
-  { value: "", label: "Todos os estados" },
-  { value: "Success", label: "Pago" },
-  { value: "Pending", label: "Pendente" },
-  { value: "Failed", label: "Falhado" },
-  { value: "Cancelled", label: "Cancelado" },
-];
+const ESTADO_HISTORICO_OPCOES = [{ value: "", label: "Todos os estados" }, ...ESTADO_PAGAMENTO_OPCOES];
 
 type ResultadoPagamento = { cobranca: QRCodeChargeResult; metodoUsado: FinanceiroMetodoPagamento };
 
 type Tela = { nome: "lista" } | { nome: "historico" } | { nome: "detalhe"; cobranca: PagamentoResumo };
 
 /**
```

---

## 4. Fora de escopo (não altere)

- Qualquer outro componente ou página de `/financas/*` além dos 4 arquivos listados na seção 3.
- `src/docs/65 - Consumir a lista unificada de pagamentos (dependente da tarefa 64 do backend).md` — é um registro histórico do que a tarefa 65 entregou na época; não é documentação viva e não deve ser editado retroativamente para refletir mudanças posteriores (mesma convenção de `docs/Tarefas feitas/` no backend). O registro histórico desta tarefa é o próprio arquivo que você vai criar e mover ao final (ver seção 6).
- Qualquer ajuste recente feito no frontend fora do módulo financeiro durante o período em que Claude esteve inativo — não têm nenhuma relação com esta tarefa.
- Não renomeie nem redesenhe `ESTADO_PAGAMENTO_OPCOES` além do especificado — mantenha exatamente os 5 valores e rótulos mostrados no diff (`Success`/Pago, `aguardando_pagamento`/Aguardando pagamento, `Failed`/Falhado, `Cancelled`/Cancelado, `Expired`/Expirado).
- Não crie nenhum novo componente visual — todos os componentes já existentes (`StatusBadge`, `CobrancasTable`, `SubtelaDetalheCobranca`) continuam os mesmos, só a lógica interna deles muda conforme os diffs.

---

## 5. Checklist de validação (Codex deve executar e reportar o resultado de cada item)

1. `grep -rn "pendencia_sem_cobranca" --include="*.ts" --include="*.tsx" src/` — deve devolver vazio.
2. `grep -rn "ESTADO_HISTORICO_OPCOES\s*=\s*\[" --include="*.tsx" src/` — deve devolver vazio (a constante local duplicada foi removida; o nome da variável em `EstudantePagamentosPainel.tsx` continua existindo, mas agora referenciando `ESTADO_PAGAMENTO_OPCOES` importado, não um array literal próprio — ver diff).
3. `npx tsc --noEmit` — sem erros.
4. `npx eslint src/types/api.ts src/components/paineis/financeiroShared.tsx src/components/paineis/FinanceiroPagamentosPainel.tsx src/components/paineis/EstudantePagamentosPainel.tsx` — sem erros nem warnings.
5. `npm run build` — deve completar (ou falhar **apenas** na etapa de baixar a fonte `Outfit` do Google Fonts, se o seu ambiente também bloquear `fonts.googleapis.com` — nesse caso específico, não é uma falha desta tarefa; qualquer outro erro deve ser investigado).
6. `git diff --stat` — alterações apenas nos 4 arquivos da seção 3, mais os documentos de conclusão.

Se qualquer item falhar (além da exceção explícita do item 5), não prossiga — reporte o erro exato.

---

## 6. Evidência de validação (já executada por Claude)

```
$ npx tsc --noEmit
(sem saída — sucesso)

$ npx eslint src/types/api.ts src/components/paineis/financeiroShared.tsx src/components/paineis/FinanceiroPagamentosPainel.tsx src/components/paineis/EstudantePagamentosPainel.tsx
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

O erro de `next build` é exclusivamente sobre a fonte `Outfit` (bloqueio de rede do sandbox de Claude para `fonts.googleapis.com`) — nenhum erro relacionado a TypeScript, ESLint ou aos 4 arquivos desta tarefa apareceu em nenhuma das quatro validações.

**Sweep final confirmando zero referências residuais:**
```
$ grep -rln "pendencia_sem_cobranca" src/ --include="*.ts" --include="*.tsx"
(sem saída — vazio, confirmado)
```

---

## 7. Critérios de aceite

- [ ] Os 4 diffs da seção 3 aplicados exatamente.
- [ ] `grep -rn "pendencia_sem_cobranca" --include="*.ts" --include="*.tsx" src/` devolve vazio.
- [ ] Todos os 6 itens do checklist de validação (seção 5) executados e reportados com sucesso.
- [ ] Nenhum arquivo fora do escopo desta tarefa foi alterado (seção 4).

---

## 8. Procedimento de conclusão

1. Mover este arquivo para `src/docs/`, com `status: concluido` e `concluido: <data de hoje>` no frontmatter (numeração 67 — a próxima disponível neste repositório no momento em que este documento foi escrito).
2. Um commit único, mensagem: `Consumir novo modelo de estados de cobranca (aguardando_pagamento) e remover pendencia_sem_cobranca`.
3. Reportar a Fredy: resultado de cada item do checklist e `git diff --stat` do commit.
4. **Confirmar com Fredy que a tarefa 66 do repositório `spuri-backend` já está mesclada/implantada** antes (ou junto) de implantar esta em produção — ver seção 0 sobre a ordem de deploy.

**Nenhuma etapa deste procedimento altera qualquer página ou componente fora do módulo financeiro de pagamentos** — todas as alterações estão contidas aos 4 arquivos listados na seção 3.
