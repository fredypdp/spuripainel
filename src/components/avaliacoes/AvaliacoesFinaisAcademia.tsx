// src/components/avaliacoes/AvaliacoesFinaisAcademia.tsx
"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useApi, academiaService, consultasService, tokenStorage } from "@/lib/api";
import type {
  MeuPerfilResponse,
  AvaliacaoFinal,
  ListarAvaliacoesResponse,
  Turma,
  Curso,
  EstudanteDetalhado,
  TipoEnsino,
} from "@/types/api";
import { getCookie } from "@/lib/utils/cookies";
import Icon from "@/components/ui/Icon";


const ITEMS_POR_PAGINA = 50;

async function listarPaginaAvaliacoes(params?: Parameters<typeof consultasService.listarAvaliacoes>[0]): Promise<ListarAvaliacoesResponse> {
  return consultasService.listarAvaliacoes({ ...params, limit: ITEMS_POR_PAGINA, offset: params?.offset ?? 0 });
}
// ─── Constants & Helpers ─────────────────────────────────────────────────────

const NIVEL_LABEL: Record<string, string> = {
  "1_ano_fundamental": "1º Ano", "2_ano_fundamental": "2º Ano", "3_ano_fundamental": "3º Ano",
  "4_ano_fundamental": "4º Ano", "5_ano_fundamental": "5º Ano", "6_ano_fundamental": "6º Ano",
  "7_ano_fundamental": "7º Ano", "8_ano_fundamental": "8º Ano", "9_ano_fundamental": "9º Ano",
  "1_ano_medio": "1º Médio", "2_ano_medio": "2º Médio", "3_ano_medio": "3º Médio", "4_ano_medio": "4º Médio",
  "1_ano_superior": "1º Ano", "2_ano_superior": "2º Ano", "3_ano_superior": "3º Ano",
  "4_ano_superior": "4º Ano", "5_ano_superior": "5º Ano", "6_ano_superior": "6º Ano",
};

const NIVEL_ORDER = [
  "1_ano_fundamental","2_ano_fundamental","3_ano_fundamental","4_ano_fundamental","5_ano_fundamental",
  "6_ano_fundamental","7_ano_fundamental","8_ano_fundamental","9_ano_fundamental",
  "1_ano_medio","2_ano_medio","3_ano_medio","4_ano_medio",
  "1_ano_superior","2_ano_superior","3_ano_superior","4_ano_superior","5_ano_superior","6_ano_superior",
];

function labelNivel(v: string, withSuffix = false): string {
  const base = NIVEL_LABEL[v] ?? v.replace(/_/g, " ");
  if (!withSuffix) return base;
  if (v.includes("fundamental")) return `${base} (Fund.)`;
  if (v.includes("medio")) return `${base} (Médio)`;
  if (v.includes("superior")) return `${base} (Sup.)`;
  return base;
}

function labelMomento(type?: string): string {
  if (!type) return "—";
  const normalizado = type.toLowerCase();
  if (normalizado.includes("recurso")) return "Nova chance";
  if (normalizado.includes("exame")) return "Exame final";
  if (normalizado.includes("pap")) return "Prova final";
  if (normalizado.includes("final")) return "Avaliação final";
  return type.replace(/_/g, " ").replace(/\b\w/g, letra => letra.toUpperCase());
}


function getUserFromCookie(): MeuPerfilResponse | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(getCookie("user") ?? ""); } catch { return null; }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Layer =
  | { type: "choose" }
  | { type: "fund_overview" }
  | { type: "fund_turma"; turma: Turma }
  | { type: "cursos" }
  | { type: "curso_overview"; curso: Curso }
  | { type: "curso_turma"; curso: Curso; turma: Turma };

// ─── AnoLetivoSelector ───────────────────────────────────────────────────────

function AnoLetivoSelector({
  anosDisponiveis,
  anoSelecionado,
  onChange,
}: {
  anosDisponiveis: string[];
  anoSelecionado: string;
  onChange: (ano: string) => void;
}) {
  if (anosDisponiveis.length <= 1) return null;
  return (
    <div className="flex items-center gap-2">
      <Icon icon="mdi:calendar-school" width={16} className="text-gray-400 flex-shrink-0" />
      <select
        value={anoSelecionado}
        onChange={e => onChange(e.target.value)}
        className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        {anosDisponiveis.map(al => (
          <option key={al} value={al}>{al.replace("_", "/")} {al === anosDisponiveis[0] ? "(actual)" : ""}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ crumbs }: { crumbs: { label: string; onClick?: () => void }[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap mb-5">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <Icon icon="mdi:chevron-right" width={15} className="text-gray-400" />}
          {i === crumbs.length - 1
            ? <span className="text-gray-900 dark:text-white font-medium">{c.label}</span>
            : <button onClick={c.onClick} className="text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors">{c.label}</button>
          }
        </span>
      ))}
    </nav>
  );
}

// ─── CardBtn ──────────────────────────────────────────────────────────────────

interface CardBtnStats { approved: number; reprovated: number; pending: number; }

function CardBtn({ icon, title, subtitle, badge, stats, onClick }: {
  icon: string; title: string; subtitle?: string; badge?: string;
  stats?: CardBtnStats; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex flex-col gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-400 hover:shadow-sm transition-all text-left group">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
          <Icon icon={icon} width={22} className="text-brand-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white truncate">{title}</p>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {badge && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize">{badge}</span>}
      </div>
      {stats && (
        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
          <div className="flex-1 text-center"><p className="text-xs text-gray-400">Aprovados</p><p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{stats.approved}</p></div>
          <div className="flex-1 text-center"><p className="text-xs text-gray-400">Reprovados</p><p className="text-base font-bold text-red-600 dark:text-red-400">{stats.reprovated}</p></div>
          <div className="flex-1 text-center"><p className="text-xs text-gray-400">Pendentes</p><p className="text-base font-bold text-gray-500 dark:text-gray-400">{stats.pending}</p></div>
        </div>
      )}
    </button>
  );
}

// ─── StatsBar ─────────────────────────────────────────────────────────────────

function StatsBar({ avaliacoes, anoLetivo }: { avaliacoes: AvaliacaoFinal[]; anoLetivo?: string }) {
  const aprovacoes = avaliacoes.filter(a => a.aprovado).length;
  const reprovacoes = avaliacoes.filter(a => !a.aprovado).length;
  const pct = avaliacoes.length > 0 ? Math.round((aprovacoes / avaliacoes.length) * 100) : 0;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
      {[
        { label: anoLetivo ? `Total ${anoLetivo.replace("_", "/")}` : "Total", value: avaliacoes.length, color: "text-gray-900 dark:text-white" },
        { label: "Aprovações", value: aprovacoes, color: "text-emerald-600 dark:text-emerald-400" },
        { label: "Reprovações", value: reprovacoes, color: "text-red-600 dark:text-red-400" },
        { label: "Taxa Aprovação", value: `${pct}%`, color: "text-brand-600 dark:text-brand-400" },
      ].map(s => (
        <div key={s.label} className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
          <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── BadgeResultado ───────────────────────────────────────────────────────────

function BadgeResultado({ aprovado, comPendencia }: { aprovado: boolean; comPendencia?: boolean }) {
  if (aprovado && comPendencia) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <Icon icon="mdi:alert-circle" width={12} />Aprovado com matéria por concluir
      </span>
    );
  }

  return aprovado ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      <Icon icon="mdi:check-circle" width={12} />Aprovado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <Icon icon="mdi:close-circle" width={12} />Reprovado
    </span>
  );
}

// ─── TabelaEstudantes ─────────────────────────────────────────────────────────

function TabelaEstudantes({ turma, avaliacoes, estudantes, anoLetivo }: {
  turma: Turma; avaliacoes: AvaliacaoFinal[]; estudantes: EstudanteDetalhado[];
  anoLetivo: string;
}) {

  const estudantesMap = useMemo(() => {
    const m: Record<string, EstudanteDetalhado> = {};
    estudantes.forEach(e => { m[e.codigo_estudante] = e; });
    return m;
  }, [estudantes]);

  // Avaliações do ano letivo actual para esta turma/nível
  const rows = useMemo(() => {
    return turma.estudantes.map(cod => {
      const est = estudantesMap[cod];
      const av = avaliacoes.find(a =>
        a.codigo_estudante === cod &&
        a.ano_lectivo === anoLetivo &&
        a.ano_academico_atual === turma.nivel
      );
      return { cod, est, av };
    });
  }, [turma, estudantesMap, avaliacoes, anoLetivo]);

  const aprovados  = rows.filter(r => r.av?.aprovado).length;
  const reprovados = rows.filter(r => r.av && !r.av.aprovado).length;
  const pendentes  = rows.filter(r => !r.av).length;
  const rowsOrdenadas = [...rows].sort((a, b) =>
    (a.est?.nome ?? a.cod).localeCompare(b.est?.nome ?? b.cod, "pt", { sensitivity: "base" })
  );

  if (turma.estudantes.length === 0) return (
    <div className="text-center py-12">
      <Icon icon="mdi:account-group" width={40} className="mx-auto mb-2 text-gray-300 dark:text-gray-700" />
      <p className="text-sm text-gray-400">Turma sem estudantes vinculados.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Stats inline */}
      <div className="flex items-center gap-4 text-xs ml-auto w-fit">
        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"><Icon icon="mdi:check-circle" width={14} />{aprovados} aprovados</span>
        <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400"><Icon icon="mdi:close-circle" width={14} />{reprovados} reprovados</span>
        <span className="flex items-center gap-1.5 text-gray-400"><Icon icon="mdi:clock-outline" width={14} />{pendentes} pendentes</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/70">
            <tr>
              {["Nome do Estudante", "Código do Estudante", "Género", "Avaliação final", "Momento", "Nota", "Próximo Nível", "Observação", "Data"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {rowsOrdenadas.map(({ cod, est, av }) => (
              <tr key={cod} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{est?.nome ?? cod}</td>
                <td className="px-4 py-3 text-gray-400 text-xs font-mono">{cod}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 capitalize">{est?.genero ?? "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {av ? <BadgeResultado aprovado={av.aprovado} comPendencia={av.aprovado_com_pendencia} /> : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      <Icon icon="mdi:clock-outline" width={11} />Pendente
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{labelMomento(av?.type)}</td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{av?.nota_final ?? "—"}{av?.nota_minima_aprovacao ? ` / min. ${av.nota_minima_aprovacao}` : ""}</td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {av ? (av.proximo_ano_academico ? labelNivel(av.proximo_ano_academico) : av.aprovado ? "Ciclo finalizado" : "Retido no nível") : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 max-w-[120px] truncate">{av?.observacao ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                  {av ? new Date(av.registered_at).toLocaleDateString("pt-AO") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AvaliacoesFinaisAcademia() {
  const [user] = useState<MeuPerfilResponse | null>(getUserFromCookie);
  const token = tokenStorage.get() ?? undefined;

  const academiaNivel = user?.academia?.nivel;
  const nivelEscolar  = user?.academia?.nivel_escolar ?? "fundamental";
  const isFundamental = academiaNivel === "escola" && nivelEscolar === "fundamental";
  const isSuperior    = academiaNivel === "superior";
  const isMisto       = academiaNivel === "escola" && nivelEscolar === "misto";

  const initLayer = (): Layer => {
    if (isMisto)       return { type: "choose" };
    if (isFundamental) return { type: "fund_overview" };
    return { type: "cursos" };
  };

  const [layer, setLayer]             = useState<Layer>(initLayer);
  const [anoLetivoSel, setAnoLetivoSel] = useState<string>("");
  const [anosDisponiveis, setAnosDisponiveis] = useState<string[]>([]);

  const { data: dataTurmas,    loading: loadTurmas,  execute: carregarTurmas    } = useApi(academiaService.listarTurmas);
  const { data: dataCursos,                           execute: carregarCursos    } = useApi(academiaService.listarCursos);
  const { data: dataEstudantes,                       execute: carregarEstudantes } = useApi(consultasService.listarEstudantes);
  const { data: dataAvaliacoes, loading: loadAvs,    execute: carregarAvaliacoes } = useApi(listarPaginaAvaliacoes);
  const { data: dataAnoLetivo,                        execute: buscarAnoLetivo   } = useApi(academiaService.getAnoLetivo);

  // Carrega avaliações para um ano letivo específico (ou todos se vazio)
  const recarregarAvaliacoes = useCallback((anoLetivo?: string) => {
    carregarAvaliacoes({ ano_letivo: anoLetivo || undefined, token });
  }, [carregarAvaliacoes, token]);

  useEffect(() => {
    carregarTurmas(token);
    carregarCursos(token);
    carregarEstudantes({ token, limit: 50, offset: 0 });
    buscarAnoLetivo(token);
    // Primeiro carrega sem filtro para descobrir anos disponíveis
    carregarAvaliacoes({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Após ter as avaliações, determina anos disponíveis e selecciona o actual
  useEffect(() => {
    const todasAvs: AvaliacaoFinal[] = (dataAvaliacoes as any)?.avaliacoes ?? [];
    const anos = Array.from(new Set(todasAvs.map(a => a.ano_lectivo).filter(Boolean))).sort();
    setAnosDisponiveis(anos);

    // Preferir o ano letivo activo da academia
    const anoAtivo = (dataAnoLetivo as any)?.ano_letivo;
    if (anoAtivo && anos.includes(anoAtivo)) {
      setAnoLetivoSel(anoAtivo);
    } else if (anos.length > 0 && !anoLetivoSel) {
      setAnoLetivoSel(anos[0]);
    }
  }, [dataAvaliacoes, dataAnoLetivo, anoLetivoSel]);

  // Quando o ano letivo seleccionado muda, recarrega as avaliações filtradas
  useEffect(() => {
    if (anoLetivoSel) {
      recarregarAvaliacoes(anoLetivoSel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoLetivoSel]);

  const turmas: Turma[]                 = useMemo(() => (dataTurmas as any)?.turmas ?? [], [dataTurmas]);
  const cursos: Curso[]                 = useMemo(() => ((dataCursos as any)?.cursos ?? []).filter((c: any) => c.status === "ativo"), [dataCursos]);
  const estudantes: EstudanteDetalhado[] = useMemo(() => (dataEstudantes as any)?.estudantes ?? [], [dataEstudantes]);

  // Avaliações já filtradas pelo servidor pelo ano letivo seleccionado
  const todasAvaliacoes: AvaliacaoFinal[] = useMemo(
    () => (dataAvaliacoes as any)?.avaliacoes ?? [],
    [dataAvaliacoes]
  );

  const reload = useCallback(() => {
    recarregarAvaliacoes(anoLetivoSel);
  }, [recarregarAvaliacoes, anoLetivoSel]);

  const loading = loadTurmas || loadAvs;

  if (loading && todasAvaliacoes.length === 0) return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
    </div>
  );

  // Selector de ano letivo comum a todas as views
  const anoSelectorEl = (
    <AnoLetivoSelector
      anosDisponiveis={anosDisponiveis}
      anoSelecionado={anoLetivoSel}
      onChange={setAnoLetivoSel}
    />
  );

  // ── Misto: escolher nivel ──
  if (layer.type === "choose") {
    const fundAvs  = todasAvaliacoes.filter(a => a.tipo_ensino === "fundamental");
    const medioAvs = todasAvaliacoes.filter(a => a.tipo_ensino === "medio");
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Avaliações Finais</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecione o nível de ensino</p>
          </div>
          {anoSelectorEl}
        </div>
        <StatsBar avaliacoes={todasAvaliacoes} anoLetivo={anoLetivoSel} />
        <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl">
          <Icon icon="mdi:information-outline" width={18} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            As avaliações finais não são registradas manualmente. Configure as regras em Configurações e lance as notas; o backend calcula automaticamente a nota final, aprovação/reprovação e progressão quando a fórmula estiver completa.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <CardBtn icon="mdi:school" title="Ensino Fundamental" subtitle="1º ao 9º Ano"
            stats={{ approved: fundAvs.filter(a => a.aprovado).length, reprovated: fundAvs.filter(a => !a.aprovado).length, pending: 0 }}
            onClick={() => setLayer({ type: "fund_overview" })} />
          <CardBtn icon="mdi:book-education" title="Ensino Médio" subtitle="Cursos Médios"
            stats={{ approved: medioAvs.filter(a => a.aprovado).length, reprovated: medioAvs.filter(a => !a.aprovado).length, pending: 0 }}
            onClick={() => setLayer({ type: "cursos" })} />
        </div>
      </div>
    );
  }

  // ── Fundamental: Turmas overview ──
  if (layer.type === "fund_overview") {
    const fundTurmas = turmas.filter(t => t.nivel.includes("fundamental"))
      .sort((a, b) => NIVEL_ORDER.indexOf(a.nivel) - NIVEL_ORDER.indexOf(b.nivel));
    const fundAvs = todasAvaliacoes.filter(a => a.tipo_ensino === "fundamental");
    return (
      <div className="space-y-6">
        {isMisto && <Breadcrumb crumbs={[{ label: "Início", onClick: () => setLayer({ type: "choose" }) }, { label: "Ensino Fundamental" }]} />}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Avaliações Finais — Fundamental</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecione uma turma para ver resultados calculados automaticamente</p>
          </div>
          {anoSelectorEl}
        </div>
        <StatsBar avaliacoes={fundAvs} anoLetivo={anoLetivoSel} />
        {fundTurmas.length === 0 ? (
          <div className="text-center py-14">
            <Icon icon="mdi:account-group" width={44} className="mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-sm text-gray-400">Nenhuma turma do ensino fundamental.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {fundTurmas.map(t => {
              const avs = todasAvaliacoes.filter(a => t.estudantes.includes(a.codigo_estudante) && a.ano_academico_atual === t.nivel);
              return (
                <CardBtn key={t.id} icon="mdi:account-group" title={t.codigo_turma}
                  subtitle={`${labelNivel(t.nivel)} · ${t.estudantes.length} estudante(s)`}
                  badge={t.turno}
                  stats={{ approved: avs.filter(a => a.aprovado).length, reprovated: avs.filter(a => !a.aprovado).length, pending: Math.max(0, t.estudantes.length - avs.length) }}
                  onClick={() => setLayer({ type: "fund_turma", turma: t })} />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Fundamental: Turma detail ──
  if (layer.type === "fund_turma") {
    const { turma } = layer;
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={[
          ...(isMisto ? [{ label: "Início", onClick: () => setLayer({ type: "choose" }) }] : []),
          { label: "Fundamental", onClick: () => setLayer({ type: "fund_overview" }) },
          { label: turma.codigo_turma },
        ]} />
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Turma {turma.codigo_turma}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{labelNivel(turma.nivel, true)} · Turno {turma.turno}</p>
          </div>
          <div className="flex items-center gap-3">
            {anoSelectorEl}
            <span className="text-xs px-2.5 py-1 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-full whitespace-nowrap">
              {turma.estudantes.length} estudante(s)
            </span>
          </div>
        </div>
        <TabelaEstudantes turma={turma} avaliacoes={todasAvaliacoes} estudantes={estudantes} anoLetivo={anoLetivoSel} />
      </div>
    );
  }

  // ── Cursos: overview ──
  if (layer.type === "cursos") {
    const tipoLabel   = isSuperior ? "Avaliações Finais — Superior" : "Avaliações Finais — Médio";
    const tipoEnsino: TipoEnsino = isSuperior ? "superior" : "medio";
    const filteredAvs = todasAvaliacoes.filter(a => a.tipo_ensino === tipoEnsino);
    return (
      <div className="space-y-6">
        {isMisto && <Breadcrumb crumbs={[{ label: "Início", onClick: () => setLayer({ type: "choose" }) }, { label: "Ensino Médio" }]} />}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{tipoLabel}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecione um curso</p>
          </div>
          {anoSelectorEl}
        </div>
        <StatsBar avaliacoes={filteredAvs} anoLetivo={anoLetivoSel} />
        {cursos.length === 0 ? (
          <div className="text-center py-14">
            <Icon icon="mdi:book-open-variant" width={44} className="mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-sm text-gray-400">Nenhum curso activo.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {cursos.map(c => {
              const turmasDoCurso = turmas.filter(t => t.curso_id === c.id);
              const estudsDoCurso = new Set(turmasDoCurso.flatMap(t => t.estudantes));
              const avs = todasAvaliacoes.filter(a => estudsDoCurso.has(a.codigo_estudante));
              return (
                <CardBtn key={c.id} icon="mdi:book-open-variant" title={c.nome}
                  subtitle={`${turmasDoCurso.length} turma(s) · ${estudsDoCurso.size} estudante(s)`}
                  stats={{ approved: avs.filter(a => a.aprovado).length, reprovated: avs.filter(a => !a.aprovado).length, pending: Math.max(0, estudsDoCurso.size - avs.length) }}
                  onClick={() => setLayer({ type: "curso_overview", curso: c })} />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Curso: turmas overview ──
  if (layer.type === "curso_overview") {
    const { curso } = layer;
    const turmasDoCurso = turmas.filter(t => t.curso_id === curso.id)
      .sort((a, b) => NIVEL_ORDER.indexOf(a.nivel) - NIVEL_ORDER.indexOf(b.nivel));
    const estudsDoCurso = new Set(turmasDoCurso.flatMap(t => t.estudantes));
    const avsDosCurso   = todasAvaliacoes.filter(a => estudsDoCurso.has(a.codigo_estudante));
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={[
          ...(isMisto ? [{ label: "Início", onClick: () => setLayer({ type: "choose" }) }] : []),
          { label: isSuperior ? "Cursos" : "Médio", onClick: () => setLayer({ type: "cursos" }) },
          { label: curso.nome },
        ]} />
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{curso.nome}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecione uma turma</p>
          </div>
          {anoSelectorEl}
        </div>
        <StatsBar avaliacoes={avsDosCurso} anoLetivo={anoLetivoSel} />
        {turmasDoCurso.length === 0 ? (
          <div className="text-center py-14">
            <Icon icon="mdi:account-group" width={44} className="mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-sm text-gray-400">Nenhuma turma para este curso.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {turmasDoCurso.map(t => {
              const avs = todasAvaliacoes.filter(a => t.estudantes.includes(a.codigo_estudante));
              return (
                <CardBtn key={t.id} icon="mdi:account-group" title={t.codigo_turma}
                  subtitle={`${labelNivel(t.nivel)} · ${t.estudantes.length} estudante(s)`}
                  badge={t.turno}
                  stats={{ approved: avs.filter(a => a.aprovado).length, reprovated: avs.filter(a => !a.aprovado).length, pending: Math.max(0, t.estudantes.length - avs.length) }}
                  onClick={() => setLayer({ type: "curso_turma", curso, turma: t })} />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Curso: turma detail ──
  if (layer.type === "curso_turma") {
    const { curso, turma } = layer;
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={[
          ...(isMisto ? [{ label: "Início", onClick: () => setLayer({ type: "choose" }) }] : []),
          { label: isSuperior ? "Cursos" : "Médio", onClick: () => setLayer({ type: "cursos" }) },
          { label: curso.nome, onClick: () => setLayer({ type: "curso_overview", curso }) },
          { label: turma.codigo_turma },
        ]} />
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Turma {turma.codigo_turma}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{curso.nome} · {labelNivel(turma.nivel, true)} · Turno {turma.turno}</p>
          </div>
          <div className="flex items-center gap-3">
            {anoSelectorEl}
            <span className="text-xs px-2.5 py-1 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-full whitespace-nowrap">
              {turma.estudantes.length} estudante(s)
            </span>
          </div>
        </div>
        <TabelaEstudantes turma={turma} avaliacoes={todasAvaliacoes} estudantes={estudantes} anoLetivo={anoLetivoSel} />
      </div>
    );
  }

  return null;
}
