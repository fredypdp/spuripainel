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
 * Opções do filtro de estado usado tanto em FinanceiroPagamentosPainel
 * quanto em EstudantePagamentosPainel — antes desta constante existir, os
 * dois arquivos mantinham cada um a sua própria cópia idêntica, com risco
 * de desalinhar.
 *
 * O valor "aguardando_pagamento" substitui o antigo "Pending" (rotulado
 * "Pendente") — ver PagamentoResumo em types/api.ts para o porquê: o back
 * end agora usa esse nome para qualquer cobrança real já gerada/tentada
 * junto à AppyPay mas ainda sem resolução. "Expirado" foi adicionado nesta
 * mesma tarefa: cobre referências REF que a AppyPay expira sem pagamento,
 * estado que antes não tinha nenhuma opção de filtro correspondente.
 *
 * "pendente" (bug relatado por Fredy, tarefa 69): reservado para o outro
 * significado de "pendência sintética, sem nenhuma cobrança gerada" — foi
 * deliberadamente deixado de fora daqui na tarefa que criou esta lista,
 * com o raciocínio de que não era um "estado de cobrança" de verdade. Mas
 * /financas/pagamentos e /pagamentos consultam a lista UNIFICADA (cobranças
 * reais + pendências sintéticas — ver 19.7/19.8 na documentação da API), e
 * sem esta opção não havia nenhuma forma de filtrar só as pendências: o
 * dropdown pulava direto de "Pago" para "Aguardando pagamento", escondendo
 * os meses que ainda nem foram cobrados. O backend já suportava
 * `estado=pendente` desde antes (ver DeveIncluirPendenciasSemCobranca em
 * pagamentos_unificado.go) — faltava só a opção aqui.
 */
export const ESTADO_PAGAMENTO_OPCOES = [
  { value: "pendente", label: "Pendente (sem cobrança gerada)" },
  { value: "Success", label: "Pago" },
  { value: "aguardando_pagamento", label: "Aguardando pagamento" },
  { value: "Failed", label: "Falhado" },
  { value: "Cancelled", label: "Cancelado" },
  { value: "Expired", label: "Expirado" },
];

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
    : x.includes("pend") || x.includes("aguardando")
    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
    : x.includes("fail") || x.includes("falh")
    ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
    : x.includes("cancel") || x.includes("expir")
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
export function SubtelaCard({ icon, label, descricao, onClick, disabled = false }: { icon: string; label: string; descricao: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:border-brand-300 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:shadow-none dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:border-brand-500/40"
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
export function SubtelasMenu({ opcoes }: { opcoes: { id: string; icon: string; label: string; descricao: string; onClick: () => void; disabled?: boolean }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {opcoes.map((o) => <SubtelaCard key={o.id} icon={o.icon} label={o.label} descricao={o.descricao} onClick={o.onClick} disabled={o.disabled} />)}
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
  // Uma pendência sintética (status="pendente") nunca é cancelável — não
  // existe nenhuma cobrança real por trás dela para cancelar (ver
  // PagamentoResumo em types/api.ts: desde esta tarefa, status="pendente"
  // é o único sinal necessário para saber isso, sem precisar de nenhum
  // campo adicional). "expired"/"expirado" foi adicionado à lista de
  // estados terminais nesta mesma tarefa — faltava antes, o que deixava o
  // botão "Cancelar" aparecer para uma referência REF já expirada na
  // AppyPay.
  const cancelavel = (r: PagamentoResumo) =>
    r.status.toLowerCase() !== "pendente" &&
    !["success", "pago", "cancelado", "cancelled", "failed", "falhado", "expired", "expirado"].includes(r.status.toLowerCase());

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
                    {r.status.toLowerCase() === "pendente" && (
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
 * - Quando status="pendente" (pendência sintética, ver PagamentoResumo em
 *   types/api.ts), vários campos que só existem para uma cobrança real
 *   (referência AppyPay, transação, atualizado em) ficam "—": não existe
 *   nenhuma cobrança de verdade por trás desse item, e um aviso explica
 *   isso no lugar da ação de cancelar.
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
        {cobranca.status.toLowerCase() === "pendente" && (
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
