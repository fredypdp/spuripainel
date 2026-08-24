---
criado: 2026-08-24
status: pendente
tipo: nova_funcionalidade_refactor_de_contrato
depende_de: tarefa 64 (repositório spuri-backend — precisa estar mesclada antes do DEPLOY deste frontend, mas o código pode ser aplicado/revisado em paralelo)
---

# Consumir a lista unificada de pagamentos em GET /financeiro/cobrancas (dependente da tarefa 64 do backend)

## 0. Leia isto primeiro — sobre esta tarefa e sua dependência

Esta tarefa é o lado **frontend** (repositório `spuripainel`) da unificação de `cobrancas` + `pendencias_sem_cobranca` numa lista só (`pagamentos`), cuja parte de **backend** é a tarefa 64 do repositório `spuri-backend`. As duas tarefas têm código e PRs completamente independentes (repositórios diferentes) — você pode aplicar o código desta tarefa a qualquer momento, mesmo antes da 64 ser mesclada. A única coisa que precisa da ordem certa é o **deploy**: este frontend só deve ir para produção depois (ou junto) do backend da tarefa 64 estar no ar, porque o frontend, depois desta tarefa, espera o campo `pagamentos` na resposta de `GET /financeiro/cobrancas` — um backend antigo (ainda com `cobrancas`/`pendencias_sem_cobranca`) quebraria a tela.

Claude já validou esta correção com Node 22, Next.js e o `tsc`/`eslint` reais deste repositório, incluindo aplicar todos os arquivos sobre um clone **novo e limpo** de `main` e rodar `npm install` + `tsc --noEmit` + `eslint` do zero — limpo, sem nenhum erro. Nenhuma validação com backend real (rodando de verdade) foi feita nem é necessária — os tipos TypeScript já garantem que o frontend está alinhado com o contrato que a tarefa 64 implementa.

Diferente do repositório `spuri-backend`, `spuripainel` não tem uma pasta `docs/Lista de Tarefas/` estabelecida — siga as instruções deste documento diretamente, sem precisar movê-lo para lugar nenhum ao final.

---

## 1. Prompt recomendado para executar esta correção

> Execute exatamente as alterações descritas neste documento, nesta ordem. Todas as decisões já foram tomadas e validadas (implementação testada com `tsc --noEmit` e `eslint` reais, incluindo um clone novo e independente do repositório rodando `npm install` do zero). Sua tarefa é mecânica: (1) aplicar a substituição cirúrgica em `src/types/api.ts` descrita na seção 3; (2) substituir o conteúdo inteiro dos 3 arquivos `.tsx` descritos nas seções 4, 5 e 6; (3) rodar cada item da seção "Checklist de validação" e reportar o resultado; (4) seguir o "Procedimento de conclusão". Não toque em nenhum arquivo ou lógica fora do escopo listado na seção "Fora de escopo".

---

## 2. Contexto

A tarefa 64 do backend (`spuri-backend`) muda `GET /financeiro/cobrancas` e `GET /financeiro/cobrancas/estudante/:codigo` para devolver uma única lista `pagamentos` (em vez de `cobrancas` + `pendencias_sem_cobranca` separados), em que cada item é o mesmo formato de sempre mais um campo booleano `pendencia_sem_cobranca`. Esta tarefa atualiza o frontend para consumir o novo contrato:

- **`src/types/api.ts`**: novo tipo `PagamentoResumo` (`CobrancaResumo` + `pendencia_sem_cobranca: boolean`); `ListarCobrancasResponse.cobrancas`/`pendencias_sem_cobranca` viram `ListarCobrancasResponse.pagamentos: PagamentoResumo[]`; `CobrancaResumo.atualizado_em` vira opcional (`string` → `string | undefined`), espelhando a mudança de `time.Time` para `*time.Time` no backend.
- **`src/components/paineis/financeiroShared.tsx`**: `CobrancasTable` e `SubtelaDetalheCobranca` passam a trabalhar com `PagamentoResumo[]`; a ação "Cancelar" fica indisponível quando `pendencia_sem_cobranca === true` (não existe cobrança real para cancelar); um badge extra "Sem cobrança gerada" identifica visualmente esses itens na tabela; `dt()` (formatação de data) passa a aceitar `undefined` e devolve "—" nesse caso, em vez de quebrar.
- **`src/components/paineis/FinanceiroPagamentosPainel.tsx`** (tela da academia): a função `PendenciasSemCobrancaTable` (uma segunda tabela, sem paginação própria, renderizada abaixo da lista principal) é removida inteiramente — os itens que antes apareciam ali agora vêm misturados na mesma `CobrancasTable`/paginação de sempre, identificados pelo badge.
- **`src/components/paineis/EstudantePagamentosPainel.tsx`** (tela "Histórico de pagamentos" do estudante): passa a ler `historico.data?.pagamentos` em vez de `historico.data?.cobrancas`. Efeito colateral bem-vindo, não um objetivo desta tarefa: essa tela **já ignorava silenciosamente `pendencias_sem_cobranca`** antes desta mudança (só renderizava `cobrancas`) — com a unificação, o estudante passa a ver essas pendências também, de graça, sem nenhum código adicional além da renomeação do campo lido.

---

## 3. `src/types/api.ts` — substituição cirúrgica (não é o arquivo inteiro)

Este arquivo tem 2269 linhas; só o bloco de tipos de cobrança/pagamento muda. Localize o bloco EXATO abaixo (é único no arquivo, começa em `export interface CobrancaResumo {` e termina no fechamento de `ListarCobrancasResponse`, logo antes de `export interface ListarCobrancasEstudanteParams`) e substitua apenas ele:

**Bloco a localizar (exato):**

```typescript
export interface CobrancaResumo {
  id: string;
  provider_charge_id?: string;
  merchant_transaction_id: string;
  contexto_tipo: FinanceiroContextoTipo;
  codigo_academia?: string;
  origem: FinanceiroOrigemCobranca;
  status: string;
  valor: number;
  moeda?: string;
  descricao?: string;
  metodo_pagamento?: FinanceiroMetodoPagamento;
  codigo_estudante?: string;
  codigo_solicitacao?: string;
  mensalidades?: { ano_letivo: string; mes: number }[];
  atualizado_em: string;
}

export interface ListarCobrancasParams {
  contexto_tipo?: FinanceiroContextoTipo;
  codigo_academia?: string;
  estado?: string[];
  tipo?: FinanceiroOrigemCobranca[];
  /** Restringe a cobranças de mensalidade vinculadas a esta turma (tarefa 59/60 do backend). */
  turma_id?: string;
  /** Restringe a cobranças de mensalidade vinculadas a este curso. */
  curso_id?: string;
  /** Restringe a cobranças de mensalidade deste ano/classe (ex.: "7_ano_fundamental"). */
  ano_academico?: string;
  /** Restringe a cobranças de mensalidade deste ano letivo (ex.: "2026_2027"). */
  ano_letivo?: string;
  /** Restringe a um mês de calendário (1-12) — só tem efeito combinado com pelo menos um dos quatro filtros acima. */
  mes?: number;
  limit?: number;
  offset?: number;
}

export interface ListarCobrancasResponse {
  cobrancas: CobrancaResumo[];
  total: number;
  total_geral: number;
  limit: number;
  offset: number;
  /**
   * Meses de mensalidade em estado "pendente" que NUNCA tiveram nenhuma
   * tentativa de cobrança — por isso não aparecem em `cobrancas` (que só
   * lista tentativas de cobrança já feitas, com sucesso ou não). Só vem
   * preenchido quando a consulta usa pelo menos um dos filtros de escopo
   * (turma_id, curso_id, ano_academico ou ano_letivo); do contrário fica
   * ausente. Ver GET /financeiro/cobrancas.
   */
  pendencias_sem_cobranca?: MensalidadeMesView[];
}
```

**Substituir por (texto literal, exato):**

```typescript
export interface CobrancaResumo {
  id: string;
  provider_charge_id?: string;
  merchant_transaction_id: string;
  contexto_tipo: FinanceiroContextoTipo;
  codigo_academia?: string;
  origem: FinanceiroOrigemCobranca;
  status: string;
  valor: number;
  moeda?: string;
  descricao?: string;
  metodo_pagamento?: FinanceiroMetodoPagamento;
  codigo_estudante?: string;
  codigo_solicitacao?: string;
  mensalidades?: { ano_letivo: string; mes: number }[];
  /**
   * Ausente para um item sintético (`pendencia_sem_cobranca: true`) — não
   * existe nenhuma atividade real para reportar nesse caso. Sempre
   * presente para um item real.
   */
  atualizado_em?: string;
}

/**
 * PagamentoResumo é CobrancaResumo mais um único campo adicional,
 * `pendencia_sem_cobranca` — ver ListarCobrancasResponse.pagamentos para o
 * porquê da unificação com as antigas `pendencias_sem_cobranca`. Quando
 * `pendencia_sem_cobranca` é `true`, o item foi sintetizado a partir de uma
 * pendência de mensalidade sem NENHUMA cobrança criada (nem tentada) — não
 * existe uma cobrança real por trás dele, e por isso vários campos de
 * CobrancaResumo (provider_charge_id, merchant_transaction_id,
 * metodo_pagamento, atualizado_em) ficam ausentes. Quando é `false`, é uma
 * cobrança real, com todos os campos preenchidos como sempre foi.
 *
 * `status === "pendente"` pode vir de QUALQUER um dos dois casos — é
 * `pendencia_sem_cobranca` que desambigua: uma cobrança real cujo status
 * ainda não foi resolvido pelo provedor (`pendencia_sem_cobranca: false`),
 * ou uma pendência sintética (`pendencia_sem_cobranca: true`).
 */
export interface PagamentoResumo extends CobrancaResumo {
  pendencia_sem_cobranca: boolean;
}

export interface ListarCobrancasParams {
  contexto_tipo?: FinanceiroContextoTipo;
  codigo_academia?: string;
  estado?: string[];
  tipo?: FinanceiroOrigemCobranca[];
  /** Restringe a cobranças de mensalidade vinculadas a esta turma (tarefa 59/60 do backend). */
  turma_id?: string;
  /** Restringe a cobranças de mensalidade vinculadas a este curso. */
  curso_id?: string;
  /** Restringe a cobranças de mensalidade deste ano/classe (ex.: "7_ano_fundamental"). */
  ano_academico?: string;
  /** Restringe a cobranças de mensalidade deste ano letivo (ex.: "2026_2027"). */
  ano_letivo?: string;
  /** Restringe a um mês de calendário (1-12) — só tem efeito combinado com pelo menos um dos quatro filtros acima. */
  mes?: number;
  limit?: number;
  offset?: number;
}

export interface ListarCobrancasResponse {
  /**
   * Lista única de pagamentos — cobranças reais e pendências de
   * mensalidade sem nenhuma cobrança vinculada, juntas, paginadas como uma
   * lista só (ver PagamentoResumo.pendencia_sem_cobranca para distinguir
   * as duas). Itens sintéticos vêm sempre primeiro (representam ação
   * pendente); cobranças reais depois, por atividade mais recente.
   * Substituiu os antigos campos separados `cobrancas` +
   * `pendencias_sem_cobranca` — ver GET /financeiro/cobrancas.
   */
  pagamentos: PagamentoResumo[];
  total: number;
  total_geral: number;
  limit: number;
  offset: number;
}
```

**Confirme antes de prosseguir:** `grep -n "cobrancas: CobrancaResumo\[\]\|pendencias_sem_cobranca" src/types/api.ts` deve retornar vazio depois desta alteração; `grep -n "PagamentoResumo" src/types/api.ts` deve mostrar a nova interface.

---

## 4. `src/components/paineis/financeiroShared.tsx` — substituir conteúdo inteiro

```typescript
"use client";
import { useEffect, useState } from "react";
import { consultasService } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { AcademiaNivel, EstudanteDetalhado, FinanceiroMetodoPagamento, FinanceiroNivel, FinanceiroOrigemCobranca, MensalidadeMesView, NivelEscolar, PagamentoResumo } from "@/types/api";

/**
 * Utilitários e componentes partilhados pelas telas de pagamentos e de
 * configurações financeiras (FinanceiroPagamentosPainel,
 * EstudantePagamentosPainel, FinanceiroConfiguracoesPainel e
 * MatriculaPublicPage). Extraído da tarefa 49 e ampliado na correção
 * seguinte (subtelas em vez de modais, terminologia e inferência de nível
 * a partir dos dados da própria academia).
 */

export const money = (v: number) =>
  new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA" }).format(v);

export const dt = (v?: string) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : new Intl.DateTimeFormat("pt-AO", { dateStyle: "short", timeStyle: "short" }).format(d);
};

/** "2026_2027" (formato de armazenamento no backend) → "2026/2027" (exibição). Nunca mostrar o valor cru. */
export function formatAnoLetivo(v?: string) {
  if (!v) return "—";
  return v.includes("_") ? v.replace("_", "/") : v;
}

/** "Avulsa" no backend passou a ser apresentada como "Outros" no frontend (pedido do produto). */
export const origemLabel: Record<FinanceiroOrigemCobranca, string> = {
  matricula: "Matrícula",
  mensalidade: "Mensalidade",
  avulsa: "Outros",
};

/**
 * Texto de exibição de cada método de pagamento AppyPay — usado em toda
 * parte de /financas/* e /pagamentos onde um método aparece para o
 * usuário (nunca mostrar "GPO"/"REF"/"GPO_QR" cru).
 */
export const METODO_PAGAMENTO_LABEL: Record<FinanceiroMetodoPagamento, string> = {
  GPO: "MCX Express via número de telefone",
  REF: "Pagamento por referência",
  GPO_QR: "QR Code",
};

/**
 * Nomes reais dos meses em pt-AO, com a primeira letra maiúscula — extraído
 * de FinanceiroPagamentosPainel (mesesDoAnoLetivo) para ser a única fonte
 * de nome de mês usada em toda parte de /financas/pagamentos e /pagamentos.
 * A formatação "long" do Intl para pt-AO devolve o nome em minúsculas
 * ("setembro"); `capitalizar` é sempre aplicado por cima para exibição.
 */
export const NOME_MES = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("pt-AO", { month: "long" }).format(new Date(2026, i, 1))
);
export function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Chave estável de uma mensalidade (usada para seleção de checkboxes e
 * para montar o payload de MensalidadePagamentoInput.meses) — mesmo
 * formato "ano_letivo:mes" já usado em EstudantePagamentosPainel antes
 * desta tarefa.
 */
export function chaveMensalidade(m: Pick<MensalidadeMesView, "ano_letivo" | "mes">) {
  return `${m.ano_letivo}:${m.mes}`;
}

/**
 * Comparador cronológico de mensalidades — usa `data_referencia`, já
 * calculada corretamente pelo backend em mesesAnoLetivo()
 * (internal/finance/mensalidade.go: meses 9–12 no ano de início do ano
 * letivo, meses 1–7 no ano seguinte). Nunca comparar `a.mes - b.mes`
 * diretamente: como o ano letivo começa em setembro/outubro, isso ordena
 * as mensalidades como se o ano começasse em janeiro (bug corrigido nesta
 * tarefa).
 */
export function compararMensalidadesPorData(a: MensalidadeMesView, b: MensalidadeMesView) {
  return new Date(a.data_referencia).getTime() - new Date(b.data_referencia).getTime();
}

/**
 * Linha de exibição de uma mensalidade no formato "[valor] - [mês] de [ano
 * cívil] ([ano letivo])" (ex.: "45 000,00 Kz - Setembro de 2026
 * (2026/2027)") — mesmo padrão de nome de mês de
 * FinanceiroPagamentosPainel (mesesDoAnoLetivo), mas o ano cívil vem
 * diretamente de `data_referencia` (já calculado pelo backend) em vez de
 * recalculado aqui a partir do nível — evita duplicar a regra de mês de
 * início (setembro para fundamental/médio, outubro para superior) no
 * cliente. `getUTCFullYear()` é proposital: `data_referencia` chega como
 * meia-noite UTC (ex. "2027-01-01T00:00:00Z") e usar os métodos locais
 * (`getFullYear`/`getMonth`) puxaria a data para o dia anterior — e para o
 * ano/mês civil errado — em fusos horários negativos.
 */
export function formatarLinhaMensalidade(m: MensalidadeMesView) {
  const anoCivil = new Date(m.data_referencia).getUTCFullYear();
  return `${money(m.valor)} - ${capitalizar(NOME_MES[m.mes - 1])} de ${anoCivil} (${formatAnoLetivo(m.ano_letivo)})`;
}

/**
 * Rótulo de exibição de cada nível de ensino, seguindo a terminologia
 * angolana já padronizada no resto do painel (MateriaPainel.tsx,
 * TurmasPainel.tsx): "fundamental" nunca aparece como "Fundamental" para o
 * usuário, e sim como "Ensino Primário e Iº Ciclo".
 */
export const NIVEL_LABEL: Record<FinanceiroNivel, string> = {
  fundamental: "Ensino Primário e Iº Ciclo",
  medio: "Médio",
  superior: "Superior",
};

/**
 * Infere os níveis de ensino que a academia realmente oferece — nunca uma
 * lista fixa. Mesma regra usada em MateriaPainel.tsx/TurmasPainel.tsx:
 * `academia.nivel === "superior"` → só superior; `academia.nivel ===
 * "escola"` → depende de `academia.nivel_escolar` (fundamental | medio |
 * misto).
 */
export function niveisDaAcademia(academia?: { nivel?: AcademiaNivel; nivel_escolar?: NivelEscolar }): FinanceiroNivel[] {
  if (!academia) return [];
  if (academia.nivel === "superior") return ["superior"];
  if (academia.nivel === "escola") {
    if (academia.nivel_escolar === "fundamental") return ["fundamental"];
    if (academia.nivel_escolar === "medio") return ["medio"];
    if (academia.nivel_escolar === "misto") return ["fundamental", "medio"];
  }
  return [];
}

export function StatusBadge({ status }: { status: string }) {
  const x = status.toLowerCase();
  const cls = x.includes("success") || x.includes("pago")
    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
    : x.includes("pend")
    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
    : x.includes("fail") || x.includes("falh")
    ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
    : x.includes("cancel")
    ? "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${cls}`}>{status}</span>;
}

export function Qr({ value }: { value?: string }) {
  if (!value) return null;
  return value.startsWith("data:image") ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={value} alt="QR Code" className="max-h-64 rounded border p-2" />
  ) : (
    <pre className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs dark:bg-gray-800">{value}</pre>
  );
}

const METODO_ICON: Record<FinanceiroMetodoPagamento, string> = {
  GPO: "mdi:cellphone",
  REF: "mdi:barcode",
  GPO_QR: "mdi:qrcode",
};
const METODOS_ORDEM: FinanceiroMetodoPagamento[] = ["GPO", "REF", "GPO_QR"];

/**
 * Seletor de método de pagamento em 3 caixas (nunca um <select>) — usada
 * em EstudantePagamentosPainel, onde a lógica de pagamento passou a ficar
 * na tela principal. Sempre mostra as 3 opções, na mesma ordem (GPO, REF,
 * GPO_QR); as que a academia não habilitou em
 * `metodos_pagamento_por_academia` ficam desabilitadas em vez de
 * escondidas — mesmo raciocínio do resto do módulo financeiro, que nunca
 * omite estado, só desabilita ações indisponíveis. Comportamento de rádio:
 * no máximo 1 escolhida por vez.
 */
export function MetodoPagamentoSelector({ value, disponiveis, onChange }: {
  value: FinanceiroMetodoPagamento;
  disponiveis: FinanceiroMetodoPagamento[];
  onChange: (m: FinanceiroMetodoPagamento) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Método de pagamento">
      {METODOS_ORDEM.map((m) => {
        const habilitado = disponiveis.includes(m);
        const selecionado = value === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={selecionado}
            disabled={!habilitado}
            onClick={() => onChange(m)}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition ${
              selecionado
                ? "border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10"
                : "border-gray-200 bg-white hover:border-brand-300 dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:border-brand-500/40"
            } ${!habilitado ? "cursor-not-allowed opacity-40 hover:border-gray-200 dark:hover:border-white/[0.05]" : "cursor-pointer"}`}
          >
            <Icon icon={METODO_ICON[m]} width={22} className={selecionado ? "text-brand-500" : "text-gray-500 dark:text-gray-400"} />
            <span className={`text-sm font-medium ${selecionado ? "text-brand-600 dark:text-brand-400" : "text-gray-700 dark:text-gray-300"}`}>
              {METODO_PAGAMENTO_LABEL[m]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
        {label}
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-white/[0.08]">
      <Icon icon="mdi:credit-card-off-outline" width={32} className="mx-auto text-gray-400" />
      <p className="mt-2 font-medium text-gray-800 dark:text-white/90">{title}</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

/**
 * Modal de confirmação genérico do módulo financeiro — mesmo padrão visual
 * já usado em ModalConfirmarDeleteCurso/ModalConfirmarDeleteTurma
 * (CursosPainel.tsx, TurmasPainel.tsx): overlay + cartão central, título,
 * mensagem, botão "Cancelar" (outline) e botão de ação (vermelho),
 * desabilitados durante o carregamento. Substitui os `window.confirm`
 * que só existiam em /financas/* — inconsistente com o resto do app, que
 * nunca usa pop-ups nativos do navegador para confirmação.
 *
 * `onConfirm` é assíncrono e o próprio modal controla o estado de
 * carregamento (mesmo contrato do ModalConfirmarDeleteCurso/Turma): o
 * chamador só precisa passar a função que executa a ação, sem gerir
 * loading manualmente.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  async function handle() {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancelar</Button>
          <button
            onClick={handle}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Aguarde..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal com um campo de texto opcional — mesmo padrão visual do
 * ConfirmDialog acima, com um campo de texto no lugar do `window.prompt`
 * nativo. Usado hoje apenas pelo motivo de cancelamento de cobrança
 * (CobrancasTable, abaixo), mas mantido genérico por props para servir a
 * outros casos do módulo financeiro sem duplicar o wrapper visual.
 *
 * Diferença deliberada de comportamento em relação ao `window.prompt`
 * anterior: antes, mesmo clicando "Cancelar" na caixa nativa do
 * navegador, a cobrança ERA cancelada mesmo assim (só sem motivo) — efeito
 * colateral confuso de reaproveitar `window.prompt` para uma ação que, na
 * prática, não era opcional. Aqui, "Voltar" fecha o modal sem executar
 * nada; só o botão de ação confirma (com ou sem o campo preenchido) — mais
 * intuitivo e consistente com os demais modais de confirmação do app.
 */
export function PromptDialog({
  title,
  description,
  label,
  placeholder,
  confirmLabel = "Confirmar",
  onConfirm,
  onClose,
}: {
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm: (valor: string | undefined) => Promise<void>;
  onClose: () => void;
}) {
  const [valor, setValor] = useState("");
  const [loading, setLoading] = useState(false);
  async function handle() {
    setLoading(true);
    try {
      await onConfirm(valor.trim() || undefined);
      onClose();
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{description}</p>}
        <div className="mb-4">
          <Label>{label}</Label>
          <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder={placeholder} disabled={loading} />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Voltar</Button>
          <button
            onClick={handle}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Aguarde..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Paginação por botões numerados. Mesmo padrão visual e de comportamento
 * do componente PaginacaoSetas usado em /estudantes (PageContent.tsx) —
 * replicado aqui (e não importado de lá) porque aquele componente não é
 * exportado e /estudantes está fora do escopo desta tarefa.
 */
export function PaginacaoSetas({ paginaAtual, totalPaginas, total, porPagina, onChange }: {
  paginaAtual: number; totalPaginas: number; total: number; porPagina: number; onChange: (p: number) => void;
}) {
  if (totalPaginas <= 1) return null;
  const inicio = (paginaAtual - 1) * porPagina + 1;
  const fim = Math.min(paginaAtual * porPagina, total);
  const getPages = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (totalPaginas <= 7) { for (let i = 1; i <= totalPaginas; i++) pages.push(i); }
    else if (paginaAtual <= 4) { for (let i = 1; i <= 5; i++) pages.push(i); pages.push("..."); pages.push(totalPaginas); }
    else if (paginaAtual >= totalPaginas - 3) { pages.push(1); pages.push("..."); for (let i = totalPaginas - 4; i <= totalPaginas; i++) pages.push(i); }
    else { pages.push(1); pages.push("..."); for (let i = paginaAtual - 1; i <= paginaAtual + 1; i++) pages.push(i); pages.push("..."); pages.push(totalPaginas); }
    return pages;
  };
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-white/[0.05]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{inicio}–{fim} de {total}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(paginaAtual - 1)} disabled={paginaAtual === 1}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        {getPages().map((p, i) => p === "..." ? (
          <span key={`e${i}`} className="px-1.5 text-gray-400 text-sm select-none">…</span>
        ) : (
          <button key={p} onClick={() => onChange(p as number)}
            className={`min-w-[32px] h-8 rounded-md text-sm font-medium transition-colors ${paginaAtual === p ? "bg-brand-500 text-white" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05]"}`}>{p}</button>
        ))}
        <button onClick={() => onChange(paginaAtual + 1)} disabled={paginaAtual === totalPaginas}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">Pág. {paginaAtual}/{totalPaginas}</p>
    </div>
  );
}

/**
 * Container padrão de subtela: título + botão "Voltar", sem sobreposição
 * (nada de pop-up/modal). Usado por toda parte do módulo financeiro que
 * precisa abrir uma tela de detalhe/formulário a partir de uma lista ou de
 * um menu de opções — o mesmo padrão já usado em
 * FinanceiroCredenciaisPainel para criar/editar credencial.
 */
export function SubtelaPanel({ title, icon, onVoltar, children }: { title: string; icon?: string; onVoltar: () => void; children: React.ReactNode }) {
  return (
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03] lg:p-8">
      <Button variant="outline" size="sm" onClick={onVoltar} startIcon={<Icon icon="mdi:arrow-left" width={16} />}>Voltar</Button>
      <div className="flex items-center gap-2">
        {icon && <Icon icon={icon} width={22} className="text-gray-800 dark:text-white/90" />}
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h2>
      </div>
      {children}
    </div>
  );
}

/** Cartão clicável de uma opção do menu de subtelas (ex.: menu de configurações financeiras). */
export function SubtelaCard({ icon, label, descricao, onClick }: { icon: string; label: string; descricao: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:border-brand-300 hover:shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:border-brand-500/40"
    >
      <Icon icon={icon} width={22} className="mt-0.5 shrink-0 text-brand-500" />
      <div>
        <p className="font-medium text-gray-800 dark:text-white/90">{label}</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{descricao}</p>
      </div>
    </button>
  );
}

/** Grade de SubtelaCard — menu inicial de uma página dividida em subtelas. Máximo 2 colunas (nunca 3+); 1 coluna em telas pequenas. */
export function SubtelasMenu({ opcoes }: { opcoes: { id: string; icon: string; label: string; descricao: string; onClick: () => void }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {opcoes.map((o) => <SubtelaCard key={o.id} icon={o.icon} label={o.label} descricao={o.descricao} onClick={o.onClick} />)}
    </div>
  );
}

/**
 * Tabela única de cobranças, com botão "Ver detalhes" explícito por linha
 * e, quando `onCancelar` é fornecido, um botão "Cancelar" independente
 * (na própria linha, não dentro do detalhe — cancelar é uma ação sobre a
 * cobrança, não parte de "ler os detalhes dela").
 */
export function CobrancasTable({ rows, onOpen, onCancelar }: {
  rows: PagamentoResumo[];
  onOpen: (r: PagamentoResumo) => void;
  onCancelar?: (r: PagamentoResumo, motivo?: string) => Promise<void>;
}) {
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [cobrancaParaCancelar, setCobrancaParaCancelar] = useState<PagamentoResumo | null>(null);
  // Uma pendência sem cobrança (pendencia_sem_cobranca=true) nunca é
  // cancelável — não existe nenhuma cobrança real por trás dela para
  // cancelar (ver PagamentoResumo).
  const cancelavel = (r: PagamentoResumo) =>
    !r.pendencia_sem_cobranca && !["success", "pago", "cancelado", "cancelled", "failed", "falhado"].includes(r.status.toLowerCase());

  return (
    <div className="space-y-2">
      {erro && <p className="text-sm text-error-500">{erro}</p>}
      <div className="overflow-x-auto">
        <Table className="w-full text-left">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              {["Tipo", "Descrição", "Estudante", "Valor", "Método", "Estado", "Atualizado em", ""].map((h) => (
                <TableCell key={h || "acoes"} isHeader className="px-3 py-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{h}</TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{origemLabel[r.origem] ?? r.origem}</TableCell>
                <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{r.descricao || "—"}</TableCell>
                <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{r.codigo_estudante || "—"}</TableCell>
                <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{money(r.valor)}</TableCell>
                <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{r.metodo_pagamento ? METODO_PAGAMENTO_LABEL[r.metodo_pagamento] : "—"}</TableCell>
                <TableCell className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={r.status} />
                    {r.pendencia_sem_cobranca && (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        Sem cobrança gerada
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{dt(r.atualizado_em)}</TableCell>
                <TableCell className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => onOpen(r)}>Ver detalhes</Button>
                    {onCancelar && cancelavel(r) && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={cancelandoId === r.id}
                        onClick={() => { setErro(null); setCobrancaParaCancelar(r); }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {cobrancaParaCancelar && onCancelar && (
        <PromptDialog
          title="Cancelar cobrança"
          description="O motivo é opcional e fica registado junto ao cancelamento."
          label="Motivo do cancelamento (opcional)"
          placeholder="Ex.: solicitado pelo encarregado"
          confirmLabel="Cancelar cobrança"
          onConfirm={async (motivo) => {
            setCancelandoId(cobrancaParaCancelar.id);
            try {
              await onCancelar(cobrancaParaCancelar, motivo);
            } catch (e) {
              setErro(formatApiError(e, "Não foi possível cancelar a cobrança."));
            } finally {
              setCancelandoId(null);
            }
          }}
          onClose={() => setCobrancaParaCancelar(null)}
        />
      )}
    </div>
  );
}

/**
 * Subtela de detalhes de um pagamento (não é mais modal/pop-up).
 *
 * - Usa os dados já carregados na linha da tabela (PagamentoResumo) em vez
 *   de buscar o pagamento de novo no servidor — evita uma requisição
 *   redundante a cada "ver detalhes" (a listagem já trouxe tudo que o
 *   pagamento tem).
 * - Quando o pagamento está vinculado a um estudante (codigo_estudante) e
 *   mostrarDadosEstudante=true, busca e exibe também os dados desse
 *   estudante. GET /consultar-estudante/:codigo só é permitido para
 *   academia/admin — por isso EstudantePagamentosPainel usa
 *   mostrarDadosEstudante={false} (o estudante já sabe quem é).
 * - Não tem ação de cancelar: cancelar é uma ação sobre a cobrança na
 *   listagem (CobrancasTable, botão "Cancelar" na própria linha), não faz
 *   parte de "ler os detalhes" dela.
 * - Quando pendencia_sem_cobranca=true, vários campos que só existem para
 *   uma cobrança real (referência AppyPay, transação, atualizado em) ficam
 *   "—": não existe nenhuma cobrança de verdade por trás desse item, e um
 *   aviso explica isso no lugar da ação de cancelar.
 */
export function SubtelaDetalheCobranca({ cobranca, onVoltar, mostrarDadosEstudante = false }: {
  cobranca: PagamentoResumo;
  onVoltar: () => void;
  mostrarDadosEstudante?: boolean;
}) {
  const [estudante, setEstudante] = useState<EstudanteDetalhado | null>(null);
  const [erroEstudante, setErroEstudante] = useState<string | null>(null);
  const [carregandoEstudante, setCarregandoEstudante] = useState(false);

  const codigoEstudante = cobranca.codigo_estudante;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta o estado de estudante ao trocar de cobrança, antes de buscar os novos dados.
    setEstudante(null);
    setErroEstudante(null);
    if (!mostrarDadosEstudante || !codigoEstudante) return;
    setCarregandoEstudante(true);
    consultasService.estudante(codigoEstudante)
      .then((r) => setEstudante(r?.estudante ?? null))
      .catch((e) => setErroEstudante(formatApiError(e, "Não foi possível carregar os dados do estudante.")))
      .finally(() => setCarregandoEstudante(false));
  }, [cobranca.id, mostrarDadosEstudante, codigoEstudante]);

  return (
    <SubtelaPanel title="Detalhe da cobrança" icon="mdi:receipt-text-outline" onVoltar={onVoltar}>
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        {cobranca.pendencia_sem_cobranca && (
          <p className="rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            Este mês ainda não foi pago e não tem nenhuma cobrança gerada — nenhuma tentativa de pagamento foi feita ainda.
          </p>
        )}
        <p><b>Tipo:</b> {origemLabel[cobranca.origem] ?? cobranca.origem}</p>
        <p><b>Descrição:</b> {cobranca.descricao || "—"}</p>
        {cobranca.mensalidades?.[0] && (
          <p><b>Mês de referência:</b> {capitalizar(NOME_MES[cobranca.mensalidades[0].mes - 1])} ({formatAnoLetivo(cobranca.mensalidades[0].ano_letivo)})</p>
        )}
        <p><b>Valor:</b> {money(cobranca.valor)} {cobranca.moeda ? `(${cobranca.moeda})` : ""}</p>
        <p><b>Método de pagamento:</b> {cobranca.metodo_pagamento ? METODO_PAGAMENTO_LABEL[cobranca.metodo_pagamento] : "—"}</p>
        <p><b>Estado:</b> <StatusBadge status={cobranca.status} /></p>
        <p><b>Referência AppyPay:</b> {cobranca.provider_charge_id || "—"}</p>
        <p><b>Transação:</b> {cobranca.merchant_transaction_id || "—"}</p>
        <p><b>Atualizado em:</b> {dt(cobranca.atualizado_em)}</p>
        {cobranca.codigo_solicitacao && <p><b>Solicitação de matrícula:</b> {cobranca.codigo_solicitacao}</p>}

        {codigoEstudante && (
          <div className="mt-4 rounded-lg border border-gray-100 p-3 dark:border-white/[0.05]">
            <p className="mb-2 font-semibold text-gray-800 dark:text-white/90">Estudante vinculado</p>
            {!mostrarDadosEstudante ? (
              <p><b>Código:</b> {codigoEstudante}</p>
            ) : carregandoEstudante ? (
              <p className="text-gray-500 dark:text-gray-400">Carregando dados do estudante...</p>
            ) : erroEstudante ? (
              <p className="text-red-600 dark:text-red-400">{erroEstudante}</p>
            ) : estudante ? (
              <div className="space-y-1">
                <p><b>Nome:</b> {estudante.nome}</p>
                <p><b>Código:</b> {estudante.codigo_estudante}</p>
                {estudante.telefone && <p><b>Telefone:</b> {estudante.telefone}</p>}
                {estudante.email && <p><b>Email:</b> {estudante.email}</p>}
                {estudante.status && <p><b>Status:</b> {estudante.status}</p>}
              </div>
            ) : (
              <p><b>Código:</b> {codigoEstudante}</p>
            )}
          </div>
        )}
      </div>
    </SubtelaPanel>
  );
}
```

---

## 5. `src/components/paineis/FinanceiroPagamentosPainel.tsx` — substituir conteúdo inteiro

```typescript
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { academiaService, financeiroService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserType } from "@/hooks/useRoutePermission";
import UnauthorizedAccess from "@/components/guards/UnauthorizedAccess";
import Alert from "@/components/ui/alert/Alert";
import Icon from "@/components/ui/Icon";
import SearchableSelect from "@/components/form/SearchableSelect";
import {
  CobrancasTable,
  EmptyState,
  LoadingState,
  NOME_MES,
  PaginacaoSetas,
  SubtelaDetalheCobranca,
  SubtelaPanel,
  SubtelasMenu,
  capitalizar,
  formatAnoLetivo,
} from "@/components/paineis/financeiroShared";
import type { FinanceiroOrigemCobranca, PagamentoResumo } from "@/types/api";

const PAGE_SIZE = 30;

const ESTADO_OPCOES = [
  { value: "", label: "Todos os estados" },
  { value: "Success", label: "Pago" },
  { value: "Pending", label: "Pendente" },
  { value: "Failed", label: "Falhado" },
  { value: "Cancelled", label: "Cancelado" },
];

type MesDoAnoLetivo = { mes: number; ano: number; label: string };

/**
 * Meses fixos do sistema de um ano letivo, dado o tipo da academia
 * (escolar ou superior) — mesma regra de mesesAnoLetivo() no backend
 * (internal/finance/mensalidade.go) e de periodoLetivoEscolar/
 * periodoLetivoSuperior (internal/handlers/ano_letivo_helpers.go):
 * escolar começa em setembro, superior em outubro; os dois terminam em
 * julho — sempre do ano civil ANTERIOR (setembro/outubro) ao ano civil
 * SEGUINTE (janeiro-julho) dentro do mesmo ano letivo. Não é configurável
 * por academia: é a mesma regra para todas, por isso não depende de
 * nenhuma chamada extra à API além de saber o tipo do ano letivo
 * selecionado.
 */
function mesesDoAnoLetivo(anoLetivo: string, tipo: "escolar" | "superior"): MesDoAnoLetivo[] {
  const anoInicio = Number(anoLetivo.slice(0, 4));
  const anoFim = anoInicio + 1;
  const mesInicio = tipo === "superior" ? 10 : 9;
  const meses: MesDoAnoLetivo[] = [];
  for (let m = mesInicio; m <= 12; m++) meses.push({ mes: m, ano: anoInicio, label: `${capitalizar(NOME_MES[m - 1])} de ${anoInicio}` });
  for (let m = 1; m <= 7; m++) meses.push({ mes: m, ano: anoFim, label: `${capitalizar(NOME_MES[m - 1])} de ${anoFim}` });
  return meses;
}

type Tela = "menu" | "mensalidade-ano" | "mensalidade-mes" | "lista";

/**
 * Painel de pagamentos para academia e admin (FPP).
 *
 * Dividido em subtelas a partir de um menu de cartões (mesmo padrão de
 * FinanceiroConfiguracoesPainel — nada de <select> para escolher o tipo de
 * cobrança): Mensalidade/Propina abre um drill-down adicional de ano
 * letivo → mês antes de chegar na listagem; Taxa de matrícula e Outros vão
 * direto para a listagem, sem esse passo extra (uma cobrança de matrícula
 * ou avulsa não tem o conceito de "mês do ano letivo").
 *
 * A listagem final sempre mostra TODOS os estados (Pago/Pendente/Falhado/
 * Cancelado) — o filtro de estado que já existia continua disponível para
 * quem quiser restringir mais. Para Mensalidade, a mesma tabela também já
 * traz os meses ainda não pagos sem nenhuma cobrança gerada, marcados com
 * `pendencia_sem_cobranca: true` (ver CobrancasTable e
 * PagamentoResumo.pendencia_sem_cobranca) — antes desta tarefa isso vinha
 * como uma segunda lista separada (`pendencias_sem_cobranca`), com
 * paginação própria; agora é uma lista só, paginada pelo backend como uma
 * única sequência (ver `ListarPagamentosUnificado` no backend). O
 * drill-down por ano letivo/mês continua existindo pelo mesmo motivo de
 * antes: sem um mês específico selecionado, o backend não computa
 * pendências (evita varredura de toda a academia sem limite).
 *
 * Admin (FPP): ainda não existe tipo de cobrança específico para o Spuri,
 * então a tela mostra apenas um aviso "indisponível no momento" — igual a
 * antes desta tarefa.
 */
export default function FinanceiroPagamentosPainel() {
  const { user, isAdmin, isAcademia, loading } = useUserType();
  const isFpp = isAdmin && user?.admin?.role === "fpp";

  const [codigoAcademia, setCodigoAcademia] = useState(user?.academia?.codigo_academia ?? "");
  const [tela, setTela] = useState<Tela>("menu");
  const [origem, setOrigem] = useState<FinanceiroOrigemCobranca | null>(null);
  const [anoLetivoSelecionado, setAnoLetivoSelecionado] = useState<string | null>(null);
  const [tipoAnoLetivoSelecionado, setTipoAnoLetivoSelecionado] = useState<"escolar" | "superior" | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState<MesDoAnoLetivo | null>(null);
  const [estado, setEstado] = useState("");
  const [pagina, setPagina] = useState(1);
  const [alert, setAlert] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<PagamentoResumo | null>(null);

  const [anosLetivos, setAnosLetivos] = useState<{ ano_letivo: string; tipo: "escolar" | "superior" }[]>([]);
  const [anosLetivosCarregando, setAnosLetivosCarregando] = useState(false);
  const [anosLetivosErro, setAnosLetivosErro] = useState<string | null>(null);

  const list = useApi(financeiroService.listarCobrancas);
  const cancelApi = useApi(financeiroService.cancelarCobranca);

  useEffect(() => {
    if (user?.academia?.codigo_academia) setCodigoAcademia(user.academia.codigo_academia);
  }, [user?.academia?.codigo_academia]);

  // Anos letivos que a academia já teve — carregado uma vez, reaproveitado
  // sempre que o cartão "Mensalidade / Propina" é aberto. Mesma fonte já
  // usada em FinanceiroConfiguracoesPainel (DefinirInicioCobrancaForm).
  useEffect(() => {
    if (!codigoAcademia) return;
    setAnosLetivosCarregando(true);
    setAnosLetivosErro(null);
    academiaService
      .listarAnosLetivosLista({ codigo_academia: codigoAcademia })
      .then((r) => {
        const lista = (r?.anos_letivos_lista ?? [])
          .map((a) => ({ ano_letivo: a.ano_letivo, tipo: (a.tipo ?? a.type) as "escolar" | "superior" | undefined }))
          .filter((a): a is { ano_letivo: string; tipo: "escolar" | "superior" } => !!a.ano_letivo && (a.tipo === "escolar" || a.tipo === "superior"))
          .sort((a, b) => b.ano_letivo.localeCompare(a.ano_letivo));
        setAnosLetivos(lista);
      })
      .catch((e) => setAnosLetivosErro(formatApiError(e, "Não foi possível carregar os anos letivos.")))
      .finally(() => setAnosLetivosCarregando(false));
  }, [codigoAcademia]);

  const parametros = useMemo(
    () => ({
      contexto_tipo: "academia" as const,
      codigo_academia: codigoAcademia || undefined,
      limit: PAGE_SIZE,
      offset: (pagina - 1) * PAGE_SIZE,
      tipo: origem ? [origem] : undefined,
      estado: estado ? [estado] : undefined,
      ano_letivo: origem === "mensalidade" && anoLetivoSelecionado ? anoLetivoSelecionado : undefined,
      mes: origem === "mensalidade" && mesSelecionado ? mesSelecionado.mes : undefined,
    }),
    [codigoAcademia, origem, estado, pagina, anoLetivoSelecionado, mesSelecionado]
  );

  const carregar = useCallback(() => {
    if (!codigoAcademia || tela !== "lista") return Promise.resolve();
    return list.execute(parametros).catch((e) => setAlert(formatApiError(e, "Não foi possível carregar as cobranças.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoAcademia, tela, parametros]);

  useEffect(() => {
    if (!loading && isAcademia) void carregar();
  }, [loading, isAcademia, carregar]);

  const abrirLista = (o: FinanceiroOrigemCobranca) => {
    setAlert(null);
    setOrigem(o);
    setEstado("");
    setPagina(1);
    if (o !== "mensalidade") {
      setAnoLetivoSelecionado(null);
      setTipoAnoLetivoSelecionado(null);
      setMesSelecionado(null);
    }
    setTela(o === "mensalidade" ? "mensalidade-ano" : "lista");
  };

  const selecionarAnoLetivo = (anoLetivo: string, tipo: "escolar" | "superior") => {
    setAnoLetivoSelecionado(anoLetivo);
    setTipoAnoLetivoSelecionado(tipo);
    setMesSelecionado(null);
    setTela("mensalidade-mes");
  };

  const selecionarMes = (m: MesDoAnoLetivo) => {
    setMesSelecionado(m);
    setEstado("");
    setPagina(1);
    setTela("lista");
  };

  if (loading) return <LoadingState label="Carregando pagamentos..." />;

  if (!isAcademia && !isFpp) {
    return (
      <UnauthorizedAccess
        requiredTypes={["Admin FPP", "Academia"]}
        message="O módulo financeiro é exclusivo de administradores com papel FPP e de academias."
      />
    );
  }

  if (isFpp) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex items-start gap-3">
          <Icon icon="mdi:credit-card-multiple-outline" width={24} className="text-gray-800 dark:text-white/90" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Pagamentos</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Ainda não existe um tipo de cobrança específico para o Spuri — indisponível no momento.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (selecionada) {
    return (
      <SubtelaDetalheCobranca
        cobranca={selecionada}
        onVoltar={() => setSelecionada(null)}
        mostrarDadosEstudante
      />
    );
  }

  if (tela === "menu") {
    return (
      <div className="space-y-6">
        {alert && <Alert variant="error" title="Finanças" message={alert} />}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="mb-4 flex items-start gap-3">
            <Icon icon="mdi:credit-card-multiple-outline" width={24} className="text-gray-800 dark:text-white/90" />
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Pagamentos</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Escolha o tipo de cobrança para consultar.</p>
            </div>
          </div>
          <SubtelasMenu
            opcoes={[
              { id: "mensalidade", icon: "mdi:calendar-month-outline", label: "Mensalidade / Propina", descricao: "Consultar por ano letivo e mês.", onClick: () => abrirLista("mensalidade") },
              { id: "matricula", icon: "mdi:school-outline", label: "Taxa de matrícula", descricao: "Todas as cobranças de matrícula, em todos os estados.", onClick: () => abrirLista("matricula") },
              { id: "avulsa", icon: "mdi:cash-multiple", label: "Outros", descricao: "Cobranças avulsas, em todos os estados.", onClick: () => abrirLista("avulsa") },
            ]}
          />
        </section>
      </div>
    );
  }

  if (tela === "mensalidade-ano") {
    return (
      <SubtelaPanel title="Mensalidade / Propina — selecione o ano letivo" icon="mdi:calendar-month-outline" onVoltar={() => setTela("menu")}>
        {anosLetivosCarregando ? (
          <LoadingState label="Carregando anos letivos..." />
        ) : anosLetivosErro ? (
          <Alert variant="error" title="Finanças" message={anosLetivosErro} />
        ) : anosLetivos.length === 0 ? (
          <EmptyState title="Nenhum ano letivo encontrado." description="Esta academia ainda não teve nenhum ano letivo definido." />
        ) : (
          <SubtelasMenu
            opcoes={anosLetivos.map((a) => ({
              id: a.ano_letivo,
              icon: "mdi:calendar-blank-outline",
              label: formatAnoLetivo(a.ano_letivo),
              descricao: a.tipo === "superior" ? "Ano letivo de ensino superior" : "Ano letivo escolar",
              onClick: () => selecionarAnoLetivo(a.ano_letivo, a.tipo),
            }))}
          />
        )}
      </SubtelaPanel>
    );
  }

  if (tela === "mensalidade-mes" && anoLetivoSelecionado && tipoAnoLetivoSelecionado) {
    const meses = mesesDoAnoLetivo(anoLetivoSelecionado, tipoAnoLetivoSelecionado);
    return (
      <SubtelaPanel title={`Mensalidade / Propina — ${formatAnoLetivo(anoLetivoSelecionado)} — selecione o mês`} icon="mdi:calendar-month-outline" onVoltar={() => setTela("mensalidade-ano")}>
        <SubtelasMenu
          opcoes={meses.map((m) => ({
            id: `${m.ano}-${m.mes}`,
            icon: "mdi:calendar-today-outline",
            label: m.label,
            descricao: "Ver cobranças e pendências deste mês.",
            onClick: () => selecionarMes(m),
          }))}
        />
      </SubtelaPanel>
    );
  }

  const totalGeral = list.data?.total_geral ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalGeral / PAGE_SIZE));
  const pagamentos = list.data?.pagamentos ?? [];

  const tituloLista =
    origem === "mensalidade" && anoLetivoSelecionado && mesSelecionado
      ? `Mensalidade / Propina — ${mesSelecionado.label}`
      : origem === "matricula"
      ? "Taxa de matrícula"
      : "Outros";
  const iconeLista = origem === "mensalidade" ? "mdi:calendar-month-outline" : origem === "matricula" ? "mdi:school-outline" : "mdi:cash-multiple";
  const voltarLista = () => (origem === "mensalidade" ? setTela("mensalidade-mes") : setTela("menu"));

  return (
    <SubtelaPanel title={tituloLista} icon={iconeLista} onVoltar={voltarLista}>
      {alert && <Alert variant="error" title="Finanças" message={alert} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <SearchableSelect
          value={estado}
          options={ESTADO_OPCOES}
          onChange={(v) => {
            setEstado(v);
            setPagina(1);
          }}
          placeholder="Estado do pagamento"
          isSearchable={false}
          isClearable={false}
          inputId="pagamentos-estado"
          name="pagamentos-estado"
        />
      </div>

      <div className="mt-4">
        {list.loading ? (
          <LoadingState label="Carregando pagamentos..." />
        ) : pagamentos.length > 0 ? (
          <CobrancasTable
            rows={pagamentos}
            onOpen={setSelecionada}
            onCancelar={async (pagamento, motivo) => {
              await cancelApi.execute(pagamento.id, motivo);
              await carregar();
            }}
          />
        ) : (
          <EmptyState title="Nenhum pagamento encontrado." description="Ajuste os filtros ou aguarde novas cobranças serem criadas." />
        )}
      </div>

      <div className="mt-4">
        <PaginacaoSetas
          paginaAtual={pagina}
          totalPaginas={totalPaginas}
          total={totalGeral}
          porPagina={PAGE_SIZE}
          onChange={setPagina}
        />
      </div>
    </SubtelaPanel>
  );
}
```

---

## 6. `src/components/paineis/EstudantePagamentosPainel.tsx` — substituir conteúdo inteiro

```typescript
"use client";
import { useEffect, useRef, useState } from "react";
import { consultasService, financeiroService, tokenStorage, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { useUserCookie } from "@/hooks/useUserCookie";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import SearchableSelect from "@/components/form/SearchableSelect";
import Checkbox from "@/components/form/input/Checkbox";
import {
  CobrancasTable,
  EmptyState,
  LoadingState,
  MetodoPagamentoSelector,
  PaginacaoSetas,
  Qr,
  StatusBadge,
  SubtelaDetalheCobranca,
  SubtelaPanel,
  chaveMensalidade,
  compararMensalidadesPorData,
  formatarLinhaMensalidade,
} from "@/components/paineis/financeiroShared";
import type { FinanceiroMetodoPagamento, FinanceiroOrigemCobranca, MensalidadeMesView, PagamentoResumo, QRCodeChargeResult } from "@/types/api";

const PAGE_SIZE = 30;
function getCodigo(user: any) { return user?.estudante?.codigo_estudante || user?.estudante?.codigo || user?.codigo; }

const TIPO_OPCOES: { value: "" | FinanceiroOrigemCobranca; label: string }[] = [
  { value: "", label: "Todos os tipos" },
  { value: "mensalidade", label: "Mensalidade" },
  { value: "matricula", label: "Matrícula" },
  { value: "avulsa", label: "Outros" },
];

const ESTADO_HISTORICO_OPCOES = [
  { value: "", label: "Todos os estados" },
  { value: "Success", label: "Pago" },
  { value: "Pending", label: "Pendente" },
  { value: "Failed", label: "Falhado" },
  { value: "Cancelled", label: "Cancelado" },
];

type ResultadoPagamento = { cobranca: QRCodeChargeResult; metodoUsado: FinanceiroMetodoPagamento };

type Tela = { nome: "lista" } | { nome: "historico" } | { nome: "detalhe"; cobranca: PagamentoResumo };

/**
 * Uma seção de mensalidades de uma única academia: lista (não mais
 * tabela) com uma linha por mês no formato "[valor] - [mês] de [ano
 * cívil] ([ano letivo])" (formatarLinhaMensalidade) — meses pendentes
 * viram checkbox selecionável, os demais (pago/anulado) ficam como linha
 * somente leitura com StatusBadge. Logo abaixo, quando há pendências e
 * nenhum resultado de pagamento em andamento, os controles de pagamento
 * (seleção já embutida nos checkboxes acima + método + confirmar); com
 * resultado presente, mostra o status da cobrança no lugar dos controles.
 *
 * `academia` é sempre derivado do primeiro mês pendente de `linhas` (nunca
 * recebido como prop): como cada seção só mistura mensalidades de uma
 * mesma academia (tanto na divisão por academia quanto na visão unificada,
 * que só existe quando no máximo uma academia tem pendências — ver
 * `semDivisao` no componente principal), isso identifica corretamente a
 * academia relevante nos dois casos sem precisar de uma prop extra.
 */
function SecaoMensalidadesAcademia({
  titulo,
  linhas,
  selected,
  metodo,
  telefone,
  resultados,
  metodosPagamentoPorAcademia,
  onToggleMes,
  onMudarMetodo,
  onMudarTelefone,
  onConfirmar,
  onVerificarStatus,
  onNovaSelecao,
}: {
  titulo?: string;
  linhas: MensalidadeMesView[];
  selected: Record<string, string[]>;
  metodo: Record<string, FinanceiroMetodoPagamento>;
  telefone: Record<string, string>;
  resultados: Record<string, ResultadoPagamento | undefined>;
  metodosPagamentoPorAcademia: Record<string, FinanceiroMetodoPagamento[]>;
  onToggleMes: (academia: string, chave: string, checked: boolean) => void;
  onMudarMetodo: (academia: string, m: FinanceiroMetodoPagamento) => void;
  onMudarTelefone: (academia: string, v: string) => void;
  onConfirmar: (academia: string) => void;
  onVerificarStatus: () => void;
  onNovaSelecao: (academia: string) => void;
}) {
  const pendentes = linhas.filter((m) => m.estado === "pendente");
  const academia = pendentes[0]?.codigo_academia;
  const maisAntigaChave = pendentes[0] ? chaveMensalidade(pendentes[0]) : null;
  const resultado = academia ? resultados[academia] : undefined;
  const selecionados = academia ? selected[academia] ?? [] : [];
  const metodoAtual = academia ? metodo[academia] ?? "GPO" : "GPO";
  const telefoneAtual = academia ? telefone[academia] ?? "" : "";
  const disponiveis: FinanceiroMetodoPagamento[] = (academia ? metodosPagamentoPorAcademia[academia] : undefined) ?? ["GPO"];

  return (
    <div className="mt-5 rounded-xl border p-4 dark:border-white/[0.05]">
      {titulo && <h2 className="font-semibold text-gray-800 dark:text-white/90">{titulo}</h2>}
      {linhas.length === 0 ? (
        <p className={`text-sm text-gray-500 dark:text-gray-400 ${titulo ? "mt-3" : ""}`}>Nenhuma mensalidade neste filtro.</p>
      ) : (
        <div className={`flex flex-col gap-2 ${titulo ? "mt-3" : ""}`}>
          {linhas.map((m) => {
            const chave = chaveMensalidade(m);
            const label = formatarLinhaMensalidade(m);
            if (m.estado === "pendente" && !resultado) {
              return (
                <Checkbox
                  key={chave}
                  id={`mes-${m.codigo_academia}-${chave}`}
                  checked={selecionados.includes(chave)}
                  disabled={chave === maisAntigaChave}
                  onChange={(checked) => academia && onToggleMes(academia, chave, checked)}
                  label={`${label}${chave === maisAntigaChave ? " (mais antigo, obrigatório)" : ""}`}
                />
              );
            }
            return (
              <div key={chave} className="flex items-center justify-between gap-3 py-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                <StatusBadge status={m.estado} />
              </div>
            );
          })}
        </div>
      )}

      {academia && (pendentes.length > 0 || resultado) && (
        resultado ? (
          <div className="mt-4 space-y-3 rounded-lg border border-gray-100 p-4 dark:border-white/[0.05]">
            <p className="text-sm text-gray-700 dark:text-gray-300">Status: {resultado.cobranca.status}</p>
            {resultado.metodoUsado === "GPO" && (
              <p className="text-sm text-gray-700 dark:text-gray-300">Você receberá uma notificação no telefone informado para confirmar o pagamento.</p>
            )}
            {resultado.metodoUsado === "REF" && (
              <pre className="rounded bg-gray-50 p-3 text-xs dark:bg-gray-800">{JSON.stringify(resultado.cobranca.response ?? {}, null, 2)}</pre>
            )}
            {resultado.metodoUsado === "GPO_QR" && <Qr value={resultado.cobranca.qrCodeArr} />}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={onVerificarStatus}>Verificar status</Button>
              <Button size="sm" variant="outline" onClick={() => onNovaSelecao(academia)}>Selecionar outros meses</Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <MetodoPagamentoSelector value={metodoAtual} disponiveis={disponiveis} onChange={(m) => onMudarMetodo(academia, m)} />
            {metodoAtual === "GPO" && (
              <Input placeholder="Telefone" value={telefoneAtual} onChange={(e) => onMudarTelefone(academia, e.target.value)} />
            )}
            <Button
              disabled={!selecionados.length || (metodoAtual === "GPO" && !telefoneAtual)}
              onClick={() => onConfirmar(academia)}
            >
              Confirmar pagamento
            </Button>
          </div>
        )
      )}
    </div>
  );
}

export default function EstudantePagamentosPainel() {
  const { user, loading } = useUserCookie();
  const restricted = tokenStorage.isRestrictedFinance();
  const codigo = getCodigo(user);

  const [tela, setTela] = useState<Tela>({ nome: "lista" });

  // ── Mensalidades pendentes + pagamento — lógica de seleção/pagamento
  // agora vive na tela principal (antes ficava numa subtela "pagar"),
  // então o estado é mantido por academia (Record chaveado por
  // codigo_academia) em vez de um único valor: mais de uma academia pode
  // ter controles de pagamento visíveis ao mesmo tempo quando há
  // pendências em mais de uma (ver `semDivisao` abaixo). ──
  const mensalidades = useApi(financeiroService.consultarMensalidadesEstudante);
  const pagar = useApi(financeiroService.iniciarPagamentoMensalidades);
  const [estadoMensalidades, setEstadoMensalidades] = useState("");
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [metodo, setMetodo] = useState<Record<string, FinanceiroMetodoPagamento>>({});
  const [telefone, setTelefone] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Record<string, ResultadoPagamento | undefined>>({});
  const [nomesAcademias, setNomesAcademias] = useState<Record<string, string>>({});
  // Academias cujo `selected`/`metodo` padrão já foi calculado — evita
  // recalcular (e apagar a seleção em andamento do estudante) a cada
  // refetch de `mensalidades`. Só é removido de propósito logo após um
  // pagamento confirmado daquela academia (ver `confirmarPagamento`), para
  // que ela seja recalculada com os dados novos assim que o resultado for
  // dispensado em "Selecionar outros meses".
  const initializedRef = useRef<Set<string>>(new Set());
  // Academias cujo nome já foi buscado (com sucesso ou falha) — evita
  // repetir a requisição a cada render; em caso de falha o título mantém
  // o fallback "Academia [código]" (ver render abaixo).
  const nomesFetchedRef = useRef<Set<string>>(new Set());

  // ── Histórico completo de cobranças — mesma fonte/filtros de antes,
  // agora renderizado dentro da subtela "Histórico de pagamentos" em vez
  // de uma seção fixa no fim da página. ──
  const historico = useApi(financeiroService.consultarCobrancasEstudante);
  const [tipoHistorico, setTipoHistorico] = useState<"" | FinanceiroOrigemCobranca>("");
  const [estadoHistorico, setEstadoHistorico] = useState("");
  const [paginaHistorico, setPaginaHistorico] = useState(1);

  const [alert, setAlert] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && codigo) {
      void mensalidades.execute(codigo).catch((e) => setAlert(formatApiError(e, "Não foi possível carregar mensalidades.")));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, codigo]);

  useEffect(() => {
    if (!loading && codigo && !restricted) {
      void historico
        .execute(codigo, {
          limit: PAGE_SIZE,
          offset: (paginaHistorico - 1) * PAGE_SIZE,
          tipo: tipoHistorico ? [tipoHistorico] : undefined,
          estado: estadoHistorico ? [estadoHistorico] : undefined,
        })
        .catch((e) => setAlert(formatApiError(e, "Não foi possível carregar o histórico de cobranças.")));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, codigo, restricted, paginaHistorico, tipoHistorico, estadoHistorico]);

  // Calcula a seleção/método padrão de cada academia com pendências que
  // ainda não foi inicializada — mesmo cálculo que antes rodava em
  // "abrirPagamento" (mês pendente mais antigo pré-selecionado e
  // obrigatório, primeiro método habilitado da academia), só que agora
  // roda automaticamente para toda academia nova assim que os dados
  // chegam, em vez de esperar o estudante clicar em um botão por academia.
  useEffect(() => {
    const todas = mensalidades.data?.mensalidades ?? [];
    const metodosPorAcademia = mensalidades.data?.metodos_pagamento_por_academia ?? {};
    const academiasNovas = Array.from(new Set(todas.filter((m) => m.estado === "pendente").map((m) => m.codigo_academia)))
      .filter((a) => !initializedRef.current.has(a));
    if (academiasNovas.length === 0) return;
    setSelected((prev) => {
      const next = { ...prev };
      for (const academia of academiasNovas) {
        const pendentes = todas
          .filter((m) => m.codigo_academia === academia && m.estado === "pendente")
          .sort(compararMensalidadesPorData);
        next[academia] = pendentes[0] ? [chaveMensalidade(pendentes[0])] : [];
      }
      return next;
    });
    setMetodo((prev) => {
      const next = { ...prev };
      for (const academia of academiasNovas) next[academia] = (metodosPorAcademia[academia]?.[0] ?? "GPO") as FinanceiroMetodoPagamento;
      return next;
    });
    academiasNovas.forEach((a) => initializedRef.current.add(a));
  }, [mensalidades.data]);

  // Nome de cada academia presente nas mensalidades — troca o título
  // "Academia [código]" por "[Nome da academia]" quando a divisão por
  // academia está ativa. GET /consultar-academia/:codigo é público (ver
  // OptionalAuthMiddleware em cmd/server/main.go), então qualquer
  // estudante pode consultar o nome de qualquer academia à qual tenha
  // mensalidades vinculadas.
  useEffect(() => {
    const codigos = Array.from(new Set((mensalidades.data?.mensalidades ?? []).map((m) => m.codigo_academia)));
    const faltantes = codigos.filter((c) => !nomesFetchedRef.current.has(c));
    if (faltantes.length === 0) return;
    faltantes.forEach((c) => nomesFetchedRef.current.add(c));
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
  }, [mensalidades.data]);

  const toggleMes = (academia: string, chave: string, checked: boolean) => {
    setSelected((prev) => {
      const atual = prev[academia] ?? [];
      return { ...prev, [academia]: checked ? [...atual, chave] : atual.filter((x) => x !== chave) };
    });
  };
  const mudarMetodo = (academia: string, m: FinanceiroMetodoPagamento) => setMetodo((prev) => ({ ...prev, [academia]: m }));
  const mudarTelefone = (academia: string, v: string) => setTelefone((prev) => ({ ...prev, [academia]: v }));
  const novaSelecao = (academia: string) => setResult((prev) => ({ ...prev, [academia]: undefined }));

  const confirmarPagamento = async (academia: string) => {
    const metodoUsado = metodo[academia] ?? "GPO";
    const meses = (selected[academia] ?? []).map((chave) => {
      const [ano_letivo, mesStr] = chave.split(":");
      return { ano_letivo, mes: Number(mesStr) };
    });
    try {
      const r = await pagar.execute({ codigo_academia: academia, meses, metodo_pagamento: metodoUsado, telefone: metodoUsado === "GPO" ? (telefone[academia] ?? "") : undefined });
      if (r) setResult((prev) => ({ ...prev, [academia]: { cobranca: r.cobranca, metodoUsado } }));
      // Força o recálculo da seleção padrão desta academia assim que os
      // dados atualizados chegarem (ver efeito acima) — se ainda restarem
      // pendências, a próxima mais antiga já fica pronta para quando o
      // estudante clicar em "Selecionar outros meses".
      initializedRef.current.delete(academia);
      await mensalidades.execute(codigo);
    } catch (e) {
      setAlert(formatApiError(e, "Não foi possível iniciar o pagamento."));
    }
  };

  if (loading) return <LoadingState label="Carregando..." />;
  if (!codigo) return <Alert variant="error" title="Pagamentos" message="Não foi possível identificar o estudante logado." />;

  if (tela.nome === "detalhe") {
    return <SubtelaDetalheCobranca cobranca={tela.cobranca} onVoltar={() => setTela({ nome: "historico" })} mostrarDadosEstudante={false} />;
  }

  if (tela.nome === "historico") {
    const totalHistorico = historico.data?.total_geral ?? 0;
    const totalPaginasHistorico = Math.max(1, Math.ceil(totalHistorico / PAGE_SIZE));
    return (
      <SubtelaPanel title="Histórico de pagamentos" icon="mdi:history" onVoltar={() => setTela({ nome: "lista" })}>
        {alert && <Alert variant="error" title="Pagamentos" message={alert} />}
        {restricted ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Histórico completo indisponível nesta sessão restrita; apenas mensalidades e pagamento estão liberados.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <SearchableSelect
                value={tipoHistorico}
                options={TIPO_OPCOES}
                onChange={(v) => { setTipoHistorico(v); setPaginaHistorico(1); }}
                placeholder="Tipo de cobrança"
                isSearchable={false}
                isClearable={false}
                inputId="historico-tipo"
                name="historico-tipo"
              />
              <SearchableSelect
                value={estadoHistorico}
                options={ESTADO_HISTORICO_OPCOES}
                onChange={(v) => { setEstadoHistorico(v); setPaginaHistorico(1); }}
                placeholder="Estado do pagamento"
                isSearchable={false}
                isClearable={false}
                inputId="historico-estado"
                name="historico-estado"
              />
            </div>
            <div className="mt-4">
              {historico.loading ? (
                <LoadingState label="Carregando histórico..." />
              ) : (historico.data?.pagamentos?.length ?? 0) > 0 ? (
                <CobrancasTable rows={historico.data?.pagamentos ?? []} onOpen={(c) => setTela({ nome: "detalhe", cobranca: c })} />
              ) : (
                <EmptyState title="Sem histórico." description="Nenhuma cobrança foi encontrada para os filtros selecionados." />
              )}
            </div>
            <div className="mt-4">
              <PaginacaoSetas paginaAtual={paginaHistorico} totalPaginas={totalPaginasHistorico} total={totalHistorico} porPagina={PAGE_SIZE} onChange={setPaginaHistorico} />
            </div>
          </>
        )}
      </SubtelaPanel>
    );
  }

  const filtered = (mensalidades.data?.mensalidades ?? []).filter((m) => !estadoMensalidades || m.estado === estadoMensalidades);
  const byAcademia = filtered.reduce<Record<string, MensalidadeMesView[]>>((acc, m) => { (acc[m.codigo_academia] ??= []).push(m); return acc; }, {});
  // Só divide em uma tabela/lista por academia quando há pendências em
  // mais de uma — o cálculo usa as mensalidades sem o filtro de estado
  // (`mensalidades.data`, não `filtered`) para que a divisão não mude
  // conforme o estudante troca o filtro "Estado" acima da lista.
  const academiasComPendencia = new Set((mensalidades.data?.mensalidades ?? []).filter((m) => m.estado === "pendente").map((m) => m.codigo_academia));
  const semDivisao = academiasComPendencia.size <= 1;
  const metodosPagamentoPorAcademia = mensalidades.data?.metodos_pagamento_por_academia ?? {};

  return (
    <div className="space-y-6">
      {restricted && <Alert variant="warning" title="Acesso financeiro restrito" message="O seu vínculo com a academia foi encerrado. Você pode consultar e regularizar pendências financeiras aqui." />}
      {alert && <Alert variant="error" title="Pagamentos" message={alert} />}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Meus pagamentos</h1>
          <Button size="sm" variant="outline" onClick={() => setTela({ nome: "historico" })}>Histórico de pagamentos</Button>
        </div>
        <div className="mt-4">
          <Select
            key={estadoMensalidades}
            defaultValue={estadoMensalidades}
            options={[{ value: "", label: "Todos estados" }, { value: "pendente", label: "Pendentes" }, { value: "pago", label: "Pagos" }, { value: "anulado", label: "Anulados" }]}
            onChange={(v) => setEstadoMensalidades(v)}
          />
        </div>

        {mensalidades.loading ? (
          <div className="mt-5"><LoadingState label="Carregando mensalidades..." /></div>
        ) : filtered.length === 0 ? (
          <div className="mt-5"><EmptyState title="Nenhuma mensalidade encontrada." description="Não há mensalidades para os filtros selecionados." /></div>
        ) : semDivisao ? (
          <SecaoMensalidadesAcademia
            linhas={[...filtered].sort(compararMensalidadesPorData)}
            selected={selected}
            metodo={metodo}
            telefone={telefone}
            resultados={result}
            metodosPagamentoPorAcademia={metodosPagamentoPorAcademia}
            onToggleMes={toggleMes}
            onMudarMetodo={mudarMetodo}
            onMudarTelefone={mudarTelefone}
            onConfirmar={confirmarPagamento}
            onVerificarStatus={() => void mensalidades.execute(codigo)}
            onNovaSelecao={novaSelecao}
          />
        ) : (
          Object.entries(byAcademia).map(([academia, linhas]) => (
            <SecaoMensalidadesAcademia
              key={academia}
              titulo={nomesAcademias[academia] ?? `Academia ${academia}`}
              linhas={[...linhas].sort(compararMensalidadesPorData)}
              selected={selected}
              metodo={metodo}
              telefone={telefone}
              resultados={result}
              metodosPagamentoPorAcademia={metodosPagamentoPorAcademia}
              onToggleMes={toggleMes}
              onMudarMetodo={mudarMetodo}
              onMudarTelefone={mudarTelefone}
              onConfirmar={confirmarPagamento}
              onVerificarStatus={() => void mensalidades.execute(codigo)}
              onNovaSelecao={novaSelecao}
            />
          ))
        )}
      </section>
    </div>
  );
}
```

---

## 7. Fora de escopo (não altere)

- Qualquer outro arquivo de `src/types/api.ts` além do bloco da seção 3 — todos os outros tipos (matrícula, avaliação, turmas, etc.) não mudam.
- Qualquer outro componente do painel financeiro não listado acima (`FinanceiroConfiguracoesPainel.tsx`, telas de credenciais, etc.).
- `src/lib/api/services.ts` — `financeiroService.listarCobrancas`/`listarCobrancasEstudante` já devolvem `ListarCobrancasResponse` (o tipo, não os dados) sem nenhuma mudança de assinatura necessária; a mudança de contrato é só na FORMA dos dados dentro desse tipo (já coberta pela seção 3), não na função em si.
- Não invente nenhuma ação nova (ex.: "gerar cobrança" a partir de uma linha com `pendencia_sem_cobranca: true`) — fora do escopo pedido; a tela continua só exibindo essas pendências, sem nenhuma ação nova sobre elas (igual a antes, quando estavam na tabela separada).
- Não altere `package.json`, `package-lock.json` nem `yarn.lock` — nenhuma dependência nova foi necessária.
- **Não aplique a tarefa 64** (backend, repositório `spuri-backend`) como parte desta tarefa — são repositórios e PRs separados.

---

## 8. Checklist de validação (Codex deve executar e reportar o resultado de cada item)

1. `grep -n "cobrancas: CobrancaResumo\[\]" src/types/api.ts` — deve retornar vazio (o campo array antigo não existe mais). `grep -n "pendencias_sem_cobranca" src/types/api.ts` **pode** retornar 2 ocorrências dentro de comentários (contexto histórico explicando a unificação, ex.: "porquê da unificação com as antigas `pendencias_sem_cobranca`") — isso é esperado e correto; o que não pode existir é um campo de verdade com esse nome, ou seja, `grep -n "pendencias_sem_cobranca?:" src/types/api.ts` (dois-pontos logo depois, sintaxe de campo TypeScript) deve retornar vazio.
2. `grep -rn "PendenciasSemCobrancaTable" src/` — deve retornar vazio (função removida).
3. `grep -rn "\.data?\.cobrancas" src/components/paineis/` — deve retornar vazio (os dois painéis agora leem `.data?.pagamentos`).
4. `npx tsc --noEmit` — sem erros.
5. `npx eslint .` — sem novos erros/warnings nos 4 arquivos desta tarefa (`src/types/api.ts`, `financeiroShared.tsx`, `FinanceiroPagamentosPainel.tsx`, `EstudantePagamentosPainel.tsx`). Se o comando já mostrava avisos/erros em OUTROS arquivos antes desta tarefa, isso é esperado e não bloqueia — só os 4 arquivos desta tarefa precisam estar limpos.
6. `git diff --stat` — alterações apenas em `src/types/api.ts`, `src/components/paineis/financeiroShared.tsx`, `src/components/paineis/FinanceiroPagamentosPainel.tsx` e `src/components/paineis/EstudantePagamentosPainel.tsx`.

Se qualquer item falhar, não prossiga — reporte o erro exato.

---

## 9. Critérios de aceite

- [ ] `src/types/api.ts` com a substituição cirúrgica exata da seção 3, e mais nada alterado no arquivo.
- [ ] `src/components/paineis/financeiroShared.tsx`, `FinanceiroPagamentosPainel.tsx`, `EstudantePagamentosPainel.tsx` substituídos exatamente pelo conteúdo das seções 4, 5 e 6.
- [ ] Todos os 6 itens do checklist de validação executados e reportados com sucesso.
- [ ] Nenhum arquivo fora do escopo desta tarefa foi alterado (seção 7).

---

## 10. Procedimento de conclusão

1. Um commit único, mensagem: `Consumir lista unificada de pagamentos (pagamentos) em GET /financeiro/cobrancas`.
2. Reportar a Fredy: resultado de cada item do checklist e `git diff --stat` do commit.
3. Lembrar explicitamente a Fredy que o deploy deste frontend só deve acontecer depois (ou junto) do deploy do backend da tarefa 64 — antes disso, o backend em produção ainda devolve `cobrancas`/`pendencias_sem_cobranca`, e este frontend, depois desta tarefa, não sabe mais ler esse formato antigo.

**Nenhuma etapa deste procedimento remove ou altera qualquer código relacionado à inscrição de estudantes em academias** — todas as alterações estão contidas às telas de pagamentos financeiros (`src/types/api.ts`, `src/components/paineis/financeiroShared.tsx`, `FinanceiroPagamentosPainel.tsx`, `EstudantePagamentosPainel.tsx`), sem tocar em matrícula, cadastro, turmas ou vínculo de estudante à academia.
