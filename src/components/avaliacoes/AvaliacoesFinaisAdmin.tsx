// src/components/avaliacoes/AvaliacoesFinaisAdmin.tsx
"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useApi, consultasService, tokenStorage } from "@/lib/api";
import type {
  AvaliacaoFinal,
  ListarAvaliacoesResponse,
  AcademiaDetalhada,
} from "@/types/api";
import { Provincias } from "@/types/api";
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

function labelNivel(v: string): string {
  const base = NIVEL_LABEL[v] ?? v.replace(/_/g, " ");
  if (v.includes("fundamental")) return `${base} (Fund.)`;
  if (v.includes("medio"))       return `${base} (Médio)`;
  if (v.includes("superior"))    return `${base} (Sup.)`;
  return base;
}


function nomeProvincia(codigo: string): string {
  return Provincias.find(p => p.codigo === codigo?.toUpperCase())?.nome ?? codigo;
}

function sortAvs(avs: AvaliacaoFinal[]): AvaliacaoFinal[] {
  return [...avs].sort((a, b) => {
    const ia = NIVEL_ORDER.indexOf(a.ano_academico_atual);
    const ib = NIVEL_ORDER.indexOf(b.ano_academico_atual);
    if (ia !== ib) return ia - ib;
    return new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime();
  });
}

type TipoEnsino = "fundamental" | "medio" | "superior";

function getTipoEnsino(nivel: string): TipoEnsino {
  if (nivel.includes("fundamental")) return "fundamental";
  if (nivel.includes("medio"))       return "medio";
  return "superior";
}

// ─── Layer types ──────────────────────────────────────────────────────────────

type AcadInfo = Pick<AcademiaDetalhada, "codigo_academia" | "nome" | "provincia" | "nivel" | "tipo_ano_letivo" | "nivel_escolar" | "status">;

type Layer =
  | { type: "provincias" }
  | { type: "academias"; provincia: string }
  | { type: "academia"; acad: AcadInfo }
  | { type: "resultados"; acad: AcadInfo; tipoEnsino: TipoEnsino; anoLetivo: string; anoAcademico: string };

// ─── FilterTag ───────────────────────────────────────────────────────────────

function FilterTag({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/50 rounded-full text-xs text-brand-700 dark:text-brand-300">
      <span className="text-brand-400">{label}:</span>
      <span className="font-medium">{value}</span>
    </span>
  );
}

// ─── AnoLetivoSelector ───────────────────────────────────────────────────────

function AnoLetivoSelector({
  anosDisponiveis,
  anoSelecionado,
  onChange,
  label = "Ano letivo:",
}: {
  anosDisponiveis: string[];
  anoSelecionado: string;
  onChange: (ano: string) => void;
  label?: string;
}) {
  if (anosDisponiveis.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      <Icon icon="mdi:calendar-school" width={16} className="text-gray-400 flex-shrink-0" />
      <span className="text-xs text-gray-500 whitespace-nowrap">{label}</span>
      <select
        value={anoSelecionado}
        onChange={e => onChange(e.target.value)}
        className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        <option value="">Todos os anos</option>
        {anosDisponiveis.map(al => (
          <option key={al} value={al}>{al.replace("_", "/")}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function CardBtn({ icon, title, subtitle, badge, stats, onClick }: {
  icon: string; title: string; subtitle?: string; badge?: string;
  stats?: { approved: number; reprovated: number }; onClick: () => void;
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
        <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700/50">
          <div className="flex-1 text-center"><p className="text-xs text-gray-400">Aprovações</p><p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{stats.approved}</p></div>
          <div className="flex-1 text-center"><p className="text-xs text-gray-400">Reprovações</p><p className="text-base font-bold text-red-600 dark:text-red-400">{stats.reprovated}</p></div>
        </div>
      )}
    </button>
  );
}

function StatsBar({ avaliacoes }: { avaliacoes: AvaliacaoFinal[] }) {
  const aprov  = avaliacoes.filter(a => a.aprovado).length;
  const reprov = avaliacoes.filter(a => !a.aprovado).length;
  const pct    = avaliacoes.length > 0 ? Math.round((aprov / avaliacoes.length) * 100) : 0;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
      {[
        { label: "Total", value: avaliacoes.length, color: "text-gray-900 dark:text-white" },
        { label: "Aprovações",  value: aprov,  color: "text-emerald-600 dark:text-emerald-400" },
        { label: "Reprovações", value: reprov, color: "text-red-600 dark:text-red-400" },
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

function LoadingSpinner({ message = "Carregando..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

// Tabela de resultados detalhados
function TabelaResultados({ avs }: { avs: AvaliacaoFinal[] }) {
  if (avs.length === 0) return (
    <p className="text-sm text-gray-400 py-8 text-center">Nenhuma avaliação neste filtro.</p>
  );
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            {["Estudante", "Código", "Resultado", "Próximo Nível", "Observação", "Data"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {sortAvs(avs).map(a => (
            <tr key={a.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                {(a as any).estudante_nome ?? a.codigo_estudante}
              </td>
              <td className="px-4 py-3 text-xs text-gray-400 font-mono">{a.codigo_estudante}</td>
              <td className="px-4 py-3 whitespace-nowrap"><BadgeResultado aprovado={a.aprovado} comPendencia={a.aprovado_com_pendencia} /></td>
              <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {a.proximo_ano_academico ? labelNivel(a.proximo_ano_academico) : a.aprovado ? "Ciclo finalizado" : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-gray-400 max-w-[140px] truncate">{a.observacao ?? "—"}</td>
              <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                {new Date(a.registered_at).toLocaleDateString("pt-AO")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── AcademiaDetalhe (sublayers dentro da academia) ──────────────────────────

function AcademiaDetalhe({
  acad,
  todasAvaliacoes,
  anosDisponiveis,
  anoLetivoSel,
  onAnoChange,
  onSelectResultados,
}: {
  acad: AcadInfo;
  todasAvaliacoes: AvaliacaoFinal[];
  anosDisponiveis: string[];
  anoLetivoSel: string;
  onAnoChange: (ano: string) => void;
  onSelectResultados: (tipoEnsino: TipoEnsino, anoLetivo: string, anoAcademico: string) => void;
}) {
  const avsAcad = todasAvaliacoes; // já filtrados pela academia + ano letivo na API

  const tipoLabel: Record<TipoEnsino, string> = {
    fundamental: "Ensino Fundamental", medio: "Ensino Médio", superior: "Ensino Superior",
  };
  const tipoIcon: Record<TipoEnsino, string> = {
    fundamental: "mdi:school", medio: "mdi:book-education", superior: "mdi:university",
  };

  const tiposEnsino = useMemo(() => {
    const set = new Set(avsAcad.map(a => getTipoEnsino(a.ano_academico_atual)));
    return Array.from(set) as TipoEnsino[];
  }, [avsAcad]);

  const [tipoSel, setTipoSel] = useState<TipoEnsino | "">("");

  // Anos académicos para o tipo seleccionado
  const anosAcademicos = useMemo(() => {
    const avsFilt = tipoSel
      ? avsAcad.filter(a => getTipoEnsino(a.ano_academico_atual) === tipoSel)
      : avsAcad;
    const set = new Set(avsFilt.map(a => a.ano_academico_atual));
    return Array.from(set).sort((a, b) => NIVEL_ORDER.indexOf(a) - NIVEL_ORDER.indexOf(b));
  }, [avsAcad, tipoSel]);

  if (avsAcad.length === 0) return (
    <div className="text-center py-10">
      <Icon icon="mdi:clipboard-check-outline" width={36} className="mx-auto mb-2 text-gray-300 dark:text-gray-700" />
      <p className="text-sm text-gray-400">
        {anoLetivoSel
          ? `Nenhuma avaliação registada em ${anoLetivoSel.replace("_", "/")} para esta academia.`
          : "Nenhuma avaliação registada para esta academia."}
      </p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
        <AnoLetivoSelector anosDisponiveis={anosDisponiveis} anoSelecionado={anoLetivoSel} onChange={onAnoChange} />
        {tiposEnsino.length > 1 && (
          <div className="flex items-center gap-2">
            <Icon icon="mdi:filter-outline" width={16} className="text-gray-400" />
            <select
              value={tipoSel}
              onChange={e => setTipoSel(e.target.value as TipoEnsino | "")}
              className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">Todos os tipos</option>
              {tiposEnsino.map(t => <option key={t} value={t}>{tipoLabel[t]}</option>)}
            </select>
          </div>
        )}
      </div>

      <StatsBar avaliacoes={avsAcad} />

      {/* Anos académicos */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Anos Académicos</p>
      {anosAcademicos.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Nenhum resultado para este filtro.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {anosAcademicos.map(ano => {
            const avs = avsAcad.filter(a =>
              a.ano_academico_atual === ano &&
              (!tipoSel || getTipoEnsino(a.ano_academico_atual) === tipoSel)
            );
            const tipoDoAno = getTipoEnsino(ano);
            return (
              <CardBtn
                key={ano}
                icon="mdi:numeric"
                title={labelNivel(ano)}
                subtitle={`${avs.length} avaliação(ões)`}
                stats={{
                  approved: avs.filter(a => a.aprovado).length,
                  reprovated: avs.filter(a => !a.aprovado).length,
                }}
                onClick={() => onSelectResultados(tipoDoAno, anoLetivoSel, ano)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AvaliacoesFinaisAdmin() {
  const token = tokenStorage.get() ?? undefined;
  const [layer, setLayer] = useState<Layer>({ type: "provincias" });

  // Académias (leves)
  const { data: dataAcads,      execute: carregarAcads,      loading: loadAcads  } = useApi(consultasService.listarAcademias);
  // Avaliações filtradas pelo servidor
  const { data: dataAvaliacoes, execute: carregarAvaliacoes, loading: loadAvs    } = useApi(listarPaginaAvaliacoes);

  // Anos letivos disponíveis globalmente (carregados com 1 chamada inicial)
  const [anosGlobais,      setAnosGlobais]      = useState<string[]>([]);
  const [anoLetivoGlobal,  setAnoLetivoGlobal]  = useState<string>("");
  // Anos por academia (carregados ao entrar na academia)
  const [anosAcademia,     setAnosAcademia]      = useState<string[]>([]);
  const [anoLetivoAcademia, setAnoLetivoAcademia] = useState<string>("");
  const [loadingAnosAcad, setLoadingAnosAcad]    = useState(false);

  useEffect(() => {
    carregarAcads({ token });
    // Descobrir anos letivos globais
    listarPaginaAvaliacoes({ token }).then(res => {
      const anos = Array.from(new Set((res?.avaliacoes ?? []).map(a => a.ano_lectivo).filter(Boolean))).sort();
      setAnosGlobais(anos);
      if (anos.length > 0) setAnoLetivoGlobal(anos[0]);
    }).catch(() => {});
    // Carregar avaliações (sem filtro inicialmente para stats das províncias)
    carregarAvaliacoes({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const academias: AcadInfo[] = useMemo(() =>
    ((dataAcads as any)?.academias ?? []).map((a: AcademiaDetalhada): AcadInfo => ({
      codigo_academia: a.codigo_academia,
      nome: a.nome,
      provincia: a.provincia,
      nivel: a.nivel,
      tipo_ano_letivo: a.tipo_ano_letivo,
      nivel_escolar: a.nivel_escolar,
      status: a.status,
    })),
    [dataAcads]);

  const todasAvaliacoes: AvaliacaoFinal[] = useMemo(
    () => (dataAvaliacoes as any)?.avaliacoes ?? [],
    [dataAvaliacoes]
  );

  const provincias = useMemo(() => {
    const set = new Set(academias.map(a => a.provincia?.toUpperCase()).filter(Boolean));
    return Array.from(set).sort((a, b) => nomeProvincia(a).localeCompare(nomeProvincia(b)));
  }, [academias]);

  const acadsDaProvincia = (prov: string) =>
    academias.filter(a => a.provincia?.toUpperCase() === prov.toUpperCase());

  // Carrega anos letivos de uma academia e as suas avaliações
  const entrarNaAcademia = useCallback(async (acad: AcadInfo) => {
    setLoadingAnosAcad(true);
    try {
      const res = await listarPaginaAvaliacoes({ codigo_academia: acad.codigo_academia, token });
      const avs  = res?.avaliacoes ?? [];
      const anos = Array.from(new Set(avs.map(a => a.ano_lectivo).filter(Boolean))).sort();
      setAnosAcademia(anos);
      const anoInicial = anos[0] ?? "";
      setAnoLetivoAcademia(anoInicial);
      // Carrega filtrado pelo primeiro ano letivo
      if (anoInicial) {
        await carregarAvaliacoes({ codigo_academia: acad.codigo_academia, ano_letivo: anoInicial, token });
      } else {
        await carregarAvaliacoes({ codigo_academia: acad.codigo_academia, token });
      }
    } finally {
      setLoadingAnosAcad(false);
    }
  }, [carregarAvaliacoes, token]);

  // Quando muda o ano letivo dentro da academia
  const onChangeAnoAcademia = useCallback(async (acad: AcadInfo, ano: string) => {
    setAnoLetivoAcademia(ano);
    await carregarAvaliacoes({ codigo_academia: acad.codigo_academia, ano_letivo: ano || undefined, token });
  }, [carregarAvaliacoes, token]);

  function buildCrumbs() {
    if (layer.type === "provincias") return [{ label: "Províncias" }];
    if (layer.type === "academias")  return [
      { label: "Províncias", onClick: () => setLayer({ type: "provincias" }) },
      { label: nomeProvincia(layer.provincia) },
    ];
    if (layer.type === "academia")   return [
      { label: "Províncias", onClick: () => setLayer({ type: "provincias" }) },
      { label: nomeProvincia(layer.acad.provincia), onClick: () => setLayer({ type: "academias", provincia: layer.acad.provincia }) },
      { label: layer.acad.nome },
    ];
    if (layer.type === "resultados") return [
      { label: "Províncias", onClick: () => setLayer({ type: "provincias" }) },
      { label: nomeProvincia(layer.acad.provincia), onClick: () => setLayer({ type: "academias", provincia: layer.acad.provincia }) },
      { label: layer.acad.nome, onClick: () => setLayer({ type: "academia", acad: layer.acad }) },
      { label: `${layer.anoLetivo.replace("_", "/")} · ${labelNivel(layer.anoAcademico)}` },
    ];
    return [];
  }

  if (loadAcads) return <LoadingSpinner message="Carregando academias..." />;

  // ── Províncias ──
  if (layer.type === "provincias") {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Avaliações Finais</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecione uma província para explorar as academias</p>
          </div>
          <AnoLetivoSelector anosDisponiveis={anosGlobais} anoSelecionado={anoLetivoGlobal} onChange={v => { setAnoLetivoGlobal(v); carregarAvaliacoes({ ano_letivo: v || undefined, token }); }} />
        </div>
        <StatsBar avaliacoes={todasAvaliacoes} />
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {provincias.map(prov => {
            const acads = acadsDaProvincia(prov);
            const avsProvd = todasAvaliacoes.filter(av => acads.some(a => a.codigo_academia === av.codigo_academia));
            return (
              <CardBtn
                key={prov}
                icon="mdi:map-marker-radius"
                title={nomeProvincia(prov)}
                subtitle={`${acads.length} academia(s) · ${avsProvd.length} avaliação(ões)`}
                stats={{ approved: avsProvd.filter(a => a.aprovado).length, reprovated: avsProvd.filter(a => !a.aprovado).length }}
                onClick={() => setLayer({ type: "academias", provincia: prov })}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // ── Academias de uma Província ──
  if (layer.type === "academias") {
    const { provincia } = layer;
    const acads    = acadsDaProvincia(provincia);
    const avsProvd = todasAvaliacoes.filter(av => acads.some(a => a.codigo_academia === av.codigo_academia));
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{nomeProvincia(provincia)}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{acads.length} academia(s) nesta província</p>
          </div>
          {anoLetivoGlobal && <FilterTag label="Ano letivo" value={anoLetivoGlobal.replace("_", "/")} />}
        </div>
        <StatsBar avaliacoes={avsProvd} />
        <div className="grid gap-3 sm:grid-cols-2">
          {acads.map(a => {
            const avs = todasAvaliacoes.filter(av => av.codigo_academia === a.codigo_academia);
            return (
              <CardBtn
                key={a.codigo_academia}
                icon={a.nivel === "superior" ? "mdi:university" : "mdi:school"}
                title={a.nome}
                subtitle={`${a.codigo_academia} · ${avs.length} avaliação(ões)`}
                badge={a.nivel}
                stats={{ approved: avs.filter(av => av.aprovado).length, reprovated: avs.filter(av => !av.aprovado).length }}
                onClick={async () => {
                  await entrarNaAcademia(a);
                  setLayer({ type: "academia", acad: a });
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // ── Vista da academia ──
  if (layer.type === "academia") {
    const { acad } = layer;
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{acad.nome}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {acad.codigo_academia} · {acad.nivel === "superior" ? "Ensino Superior" : "Escola"}
          </p>
        </div>
        {(loadAvs || loadingAnosAcad) ? (
          <LoadingSpinner message="Carregando avaliações..." />
        ) : (
          <AcademiaDetalhe
            acad={acad}
            todasAvaliacoes={todasAvaliacoes}
            anosDisponiveis={anosAcademia}
            anoLetivoSel={anoLetivoAcademia}
            onAnoChange={ano => onChangeAnoAcademia(acad, ano)}
            onSelectResultados={(tipoEnsino, anoLetivo, anoAcademico) =>
              setLayer({ type: "resultados", acad, tipoEnsino, anoLetivo, anoAcademico })
            }
          />
        )}
      </div>
    );
  }

  // ── Resultados detalhados ──
  if (layer.type === "resultados") {
    const { acad, tipoEnsino, anoLetivo, anoAcademico } = layer;
    const avs = todasAvaliacoes.filter(a =>
      getTipoEnsino(a.ano_academico_atual) === tipoEnsino &&
      a.ano_academico_atual === anoAcademico
    );
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labelNivel(anoAcademico)}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{acad.nome} · Ano Letivo {anoLetivo.replace("_", "/")}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <FilterTag label="Ano letivo" value={anoLetivo.replace("_", "/")} />
            <FilterTag label="Nível" value={labelNivel(anoAcademico)} />
          </div>
        </div>
        <StatsBar avaliacoes={avs} />
        <TabelaResultados avs={avs} />
      </div>
    );
  }

  return null;
}
