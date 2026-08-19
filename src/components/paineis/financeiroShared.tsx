"use client";
import { useEffect, useState } from "react";
import { consultasService } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { AcademiaNivel, CobrancaResumo, EstudanteDetalhado, FinanceiroMetodoPagamento, FinanceiroNivel, FinanceiroOrigemCobranca, NivelEscolar } from "@/types/api";

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

export const dt = (v: string) => {
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
  rows: CobrancaResumo[];
  onOpen: (r: CobrancaResumo) => void;
  onCancelar?: (r: CobrancaResumo, motivo?: string) => Promise<void>;
}) {
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const cancelavel = (r: CobrancaResumo) => !["success", "pago", "cancelado", "cancelled", "failed", "falhado"].includes(r.status.toLowerCase());

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
                <TableCell className="px-3 py-2"><StatusBadge status={r.status} /></TableCell>
                <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{dt(r.atualizado_em)}</TableCell>
                <TableCell className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => onOpen(r)}>Ver detalhes</Button>
                    {onCancelar && cancelavel(r) && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={cancelandoId === r.id}
                        onClick={async () => {
                          setErro(null);
                          setCancelandoId(r.id);
                          try {
                            await onCancelar(r, window.prompt("Motivo do cancelamento (opcional)") || undefined);
                          } catch (e) {
                            setErro(formatApiError(e, "Não foi possível cancelar a cobrança."));
                          } finally {
                            setCancelandoId(null);
                          }
                        }}
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
    </div>
  );
}

/**
 * Subtela de detalhes de uma cobrança (não é mais modal/pop-up).
 *
 * - Usa os dados já carregados na linha da tabela (CobrancaResumo) em vez
 *   de buscar a cobrança de novo no servidor — evita uma requisição
 *   redundante a cada "ver detalhes" (a listagem já trouxe tudo que a
 *   cobrança tem).
 * - Quando a cobrança está vinculada a um estudante (codigo_estudante) e
 *   mostrarDadosEstudante=true, busca e exibe também os dados desse
 *   estudante. GET /consultar-estudante/:codigo só é permitido para
 *   academia/admin — por isso EstudantePagamentosPainel usa
 *   mostrarDadosEstudante={false} (o estudante já sabe quem é).
 * - Não tem ação de cancelar: cancelar é uma ação sobre a cobrança na
 *   listagem (CobrancasTable, botão "Cancelar" na própria linha), não faz
 *   parte de "ler os detalhes" dela.
 */
export function SubtelaDetalheCobranca({ cobranca, onVoltar, mostrarDadosEstudante = false }: {
  cobranca: CobrancaResumo;
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
        <p><b>Tipo:</b> {origemLabel[cobranca.origem] ?? cobranca.origem}</p>
        <p><b>Descrição:</b> {cobranca.descricao || "—"}</p>
        <p><b>Valor:</b> {money(cobranca.valor)} {cobranca.moeda ? `(${cobranca.moeda})` : ""}</p>
        <p><b>Método de pagamento:</b> {cobranca.metodo_pagamento ? METODO_PAGAMENTO_LABEL[cobranca.metodo_pagamento] : "—"}</p>
        <p><b>Estado:</b> <StatusBadge status={cobranca.status} /></p>
        <p><b>Referência AppyPay:</b> {cobranca.provider_charge_id || "—"}</p>
        <p><b>Transação:</b> {cobranca.merchant_transaction_id}</p>
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
