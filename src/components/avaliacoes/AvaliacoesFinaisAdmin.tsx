// src/components/avaliacoes/AvaliacoesFinaisAdmin.tsx
"use client";
import { useState, useEffect, useMemo } from "react";
import { useApi, consultasService, tokenStorage } from "@/lib/api";
import type {
  AvaliacaoFinal,
  AcademiaDetalhada,
  EstudanteDetalhado,
} from "@/types/api";
import { Provincias } from "@/types/api";
import Icon from "@/components/ui/Icon";

// ─── Constants & Helpers ─────────────────────────────────────────────────────

const NIVEL_LABEL: Record<string, string> = {
  "1_ano_fundamental": "1º Ano",
  "2_ano_fundamental": "2º Ano",
  "3_ano_fundamental": "3º Ano",
  "4_ano_fundamental": "4º Ano",
  "5_ano_fundamental": "5º Ano",
  "6_ano_fundamental": "6º Ano",
  "7_ano_fundamental": "7º Ano",
  "8_ano_fundamental": "8º Ano",
  "9_ano_fundamental": "9º Ano",
  "1_ano_medio": "1º Médio",
  "2_ano_medio": "2º Médio",
  "3_ano_medio": "3º Médio",
  "4_ano_medio": "4º Médio",
  "1_ano_superior": "1º Ano",
  "2_ano_superior": "2º Ano",
  "3_ano_superior": "3º Ano",
  "4_ano_superior": "4º Ano",
  "5_ano_superior": "5º Ano",
  "6_ano_superior": "6º Ano",
};

const NIVEL_ORDER = [
  "1_ano_fundamental","2_ano_fundamental","3_ano_fundamental",
  "4_ano_fundamental","5_ano_fundamental","6_ano_fundamental",
  "7_ano_fundamental","8_ano_fundamental","9_ano_fundamental",
  "1_ano_medio","2_ano_medio","3_ano_medio","4_ano_medio",
  "1_ano_superior","2_ano_superior","3_ano_superior",
  "4_ano_superior","5_ano_superior","6_ano_superior",
];

function labelNivel(v: string): string {
  const base = NIVEL_LABEL[v] ?? v.replace(/_/g, " ");
  if (v.includes("fundamental")) return `${base} (Fund.)`;
  if (v.includes("medio")) return `${base} (Médio)`;
  if (v.includes("superior")) return `${base} (Sup.)`;
  return base;
}

function nomeProvincia(codigo: string): string {
  return (
    Provincias.find(
      p => p.codigo === codigo?.toUpperCase()
    )?.nome ?? codigo
  );
}

function sortAvs(avs: AvaliacaoFinal[]): AvaliacaoFinal[] {
  return [...avs].sort((a, b) => {
    const ia = NIVEL_ORDER.indexOf(a.ano_academico_atual);
    const ib = NIVEL_ORDER.indexOf(b.ano_academico_atual);
    if (ia !== ib) return ia - ib;
    return (
      new Date(a.registered_at).getTime() -
      new Date(b.registered_at).getTime()
    );
  });
}

type TipoEnsino = "fundamental" | "medio" | "superior";

function getTipoEnsino(nivel: string): TipoEnsino {
  if (nivel.includes("fundamental")) return "fundamental";
  if (nivel.includes("medio")) return "medio";
  return "superior";
}

// ─── Layer types ──────────────────────────────────────────────────────────────

type AcadInfo = Pick<
  AcademiaDetalhada,
  "codigo_academia" | "nome" | "provincia" | "type" | "nivel_escolar" | "status"
>;

type Layer =
  | { type: "provincias" }
  | { type: "academias"; provincia: string }
  | { type: "academia"; acad: AcadInfo }
  | {
      type: "resultados";
      acad: AcadInfo;
      tipoEnsino: TipoEnsino;
      anoLetivo: string;
      anoAcademico: string;
    };

// ─── Sub-components ───────────────────────────────────────────────────────────

function Breadcrumb({
  crumbs,
}: {
  crumbs: { label: string; onClick?: () => void }[];
}) {
  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap mb-5">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && (
            <Icon icon="mdi:chevron-right" width={15} className="text-gray-400" />
          )}
          {i === crumbs.length - 1 ? (
            <span className="text-gray-900 dark:text-white font-medium">
              {c.label}
            </span>
          ) : (
            <button
              onClick={c.onClick}
              className="text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors"
            >
              {c.label}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}

function CardBtn({
  icon,
  title,
  subtitle,
  badge,
  stats,
  onClick,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  badge?: string;
  stats?: { approved: number; reprovated: number };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex flex-col gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-400 hover:shadow-sm transition-all text-left group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
          <Icon icon={icon} width={22} className="text-brand-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white truncate">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize">
            {badge}
          </span>
        )}
      </div>
      {stats && (
        <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700/50">
          <div className="flex-1 text-center">
            <p className="text-xs text-gray-400">Aprovações</p>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {stats.approved}
            </p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-xs text-gray-400">Reprovações</p>
            <p className="text-base font-bold text-red-600 dark:text-red-400">
              {stats.reprovated}
            </p>
          </div>
        </div>
      )}
    </button>
  );
}

function StatsBar({ avaliacoes }: { avaliacoes: AvaliacaoFinal[] }) {
  const aprov = avaliacoes.filter(a => a.aprovado).length;
  const reprov = avaliacoes.filter(a => !a.aprovado).length;
  const pct =
    avaliacoes.length > 0
      ? Math.round((aprov / avaliacoes.length) * 100)
      : 0;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
      {[
        { label: "Total", value: avaliacoes.length, color: "text-gray-900 dark:text-white" },
        { label: "Aprovações", value: aprov, color: "text-emerald-600 dark:text-emerald-400" },
        { label: "Reprovações", value: reprov, color: "text-red-600 dark:text-red-400" },
        { label: "Taxa Aprovação", value: `${pct}%`, color: "text-brand-600 dark:text-brand-400" },
      ].map(s => (
        <div key={s.label} className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            {s.label}
          </p>
          <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

function BadgeResultado({ aprovado }: { aprovado: boolean }) {
  return aprovado ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      <Icon icon="mdi:check-circle" width={12} />
      Aprovado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <Icon icon="mdi:close-circle" width={12} />
      Reprovado
    </span>
  );
}

// Academia detail view — shows tipo_ensino > anos letivos > anos academicos > results
function AcademiaDetalhe({
  acad,
  todasAvaliacoes,
  estudantes,
  onSelectResultados,
}: {
  acad: AcadInfo;
  todasAvaliacoes: AvaliacaoFinal[];
  estudantes: EstudanteDetalhado[];
  onSelectResultados: (
    tipoEnsino: TipoEnsino,
    anoLetivo: string,
    anoAcademico: string
  ) => void;
}) {
  const avsAcad = todasAvaliacoes.filter(
    a => a.codigo_academia === acad.codigo_academia
  );

  const [subLayer, setSubLayer] = useState<
    | { type: "inicio" }
    | { type: "anos_letivos"; tipoEnsino: TipoEnsino }
    | { type: "anos_academicos"; tipoEnsino: TipoEnsino; anoLetivo: string }
  >({ type: "inicio" });

  const tiposEnsino = useMemo(() => {
    const set = new Set(avsAcad.map(a => getTipoEnsino(a.ano_academico_atual)));
    return Array.from(set) as TipoEnsino[];
  }, [avsAcad]);

  const tipoLabel: Record<TipoEnsino, string> = {
    fundamental: "Ensino Fundamental",
    medio: "Ensino Médio",
    superior: "Ensino Superior",
  };
  const tipoIcon: Record<TipoEnsino, string> = {
    fundamental: "mdi:school",
    medio: "mdi:book-education",
    superior: "mdi:university",
  };

  if (avsAcad.length === 0) {
    return (
      <div className="text-center py-10">
        <Icon
          icon="mdi:clipboard-check-outline"
          width={36}
          className="mx-auto mb-2 text-gray-300 dark:text-gray-700"
        />
        <p className="text-sm text-gray-400">
          Nenhuma avaliação final registada para esta academia.
        </p>
      </div>
    );
  }

  // inicio: show tipo_ensino breakdown
  if (subLayer.type === "inicio") {
    return (
      <div className="space-y-4">
        <StatsBar avaliacoes={avsAcad} />
        {tiposEnsino.length > 1 && (
          <>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Tipo de Ensino
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {tiposEnsino.map(te => {
                const avs = avsAcad.filter(
                  a => getTipoEnsino(a.ano_academico_atual) === te
                );
                return (
                  <CardBtn
                    key={te}
                    icon={tipoIcon[te]}
                    title={tipoLabel[te]}
                    subtitle={`${avs.length} avaliação(ões)`}
                    stats={{
                      approved: avs.filter(a => a.aprovado).length,
                      reprovated: avs.filter(a => !a.aprovado).length,
                    }}
                    onClick={() =>
                      setSubLayer({ type: "anos_letivos", tipoEnsino: te })
                    }
                  />
                );
              })}
            </div>
          </>
        )}
        {tiposEnsino.length === 1 && (
          <AnosLetivosView
            tipoEnsino={tiposEnsino[0]}
            avsAcad={avsAcad}
            onSelectAno={al =>
              setSubLayer({
                type: "anos_academicos",
                tipoEnsino: tiposEnsino[0],
                anoLetivo: al,
              })
            }
          />
        )}
      </div>
    );
  }

  if (subLayer.type === "anos_letivos") {
    const { tipoEnsino } = subLayer;
    const avsTipo = avsAcad.filter(
      a => getTipoEnsino(a.ano_academico_atual) === tipoEnsino
    );
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSubLayer({ type: "inicio" })}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-500 transition-colors"
        >
          <Icon icon="mdi:chevron-left" width={16} />
          {tipoLabel[tipoEnsino]}
        </button>
        <StatsBar avaliacoes={avsTipo} />
        <AnosLetivosView
          tipoEnsino={tipoEnsino}
          avsAcad={avsTipo}
          onSelectAno={al =>
            setSubLayer({ type: "anos_academicos", tipoEnsino, anoLetivo: al })
          }
        />
      </div>
    );
  }

  if (subLayer.type === "anos_academicos") {
    const { tipoEnsino, anoLetivo } = subLayer;
    const avsDoAno = avsAcad.filter(
      a =>
        getTipoEnsino(a.ano_academico_atual) === tipoEnsino &&
        a.ano_lectivo === anoLetivo
    );
    const anos = Array.from(
      new Set(avsDoAno.map(a => a.ano_academico_atual))
    ).sort((a, b) => NIVEL_ORDER.indexOf(a) - NIVEL_ORDER.indexOf(b));

    return (
      <div className="space-y-4">
        <button
          onClick={() =>
            setSubLayer({ type: "anos_letivos", tipoEnsino })
          }
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-500 transition-colors"
        >
          <Icon icon="mdi:chevron-left" width={16} />
          Anos Letivos
        </button>
        <StatsBar avaliacoes={avsDoAno} />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Anos Académicos — {anoLetivo.replace("_", "/")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {anos.map(ano => {
            const avs = avsDoAno.filter(a => a.ano_academico_atual === ano);
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
                onClick={() =>
                  onSelectResultados(tipoEnsino, anoLetivo, ano)
                }
              />
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

function AnosLetivosView({
  tipoEnsino,
  avsAcad,
  onSelectAno,
}: {
  tipoEnsino: TipoEnsino;
  avsAcad: AvaliacaoFinal[];
  onSelectAno: (anoLetivo: string) => void;
}) {
  const anosLetivos = useMemo(() => {
    const set = new Set(
      avsAcad
        .filter(a => getTipoEnsino(a.ano_academico_atual) === tipoEnsino)
        .map(a => a.ano_lectivo)
    );
    return Array.from(set).sort().reverse();
  }, [avsAcad, tipoEnsino]);

  return (
    <>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Anos Letivos
      </p>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {anosLetivos.map(al => {
          const avs = avsAcad.filter(
            a =>
              getTipoEnsino(a.ano_academico_atual) === tipoEnsino &&
              a.ano_lectivo === al
          );
          return (
            <CardBtn
              key={al}
              icon="mdi:calendar-school"
              title={al.replace("_", "/")}
              subtitle={`${avs.length} avaliação(ões)`}
              stats={{
                approved: avs.filter(a => a.aprovado).length,
                reprovated: avs.filter(a => !a.aprovado).length,
              }}
              onClick={() => onSelectAno(al)}
            />
          );
        })}
      </div>
    </>
  );
}

// Results table
function TabelaResultados({
  avs,
  estudantes,
}: {
  avs: AvaliacaoFinal[];
  estudantes: EstudanteDetalhado[];
}) {
  const estudantesMap = useMemo(() => {
    const m: Record<string, EstudanteDetalhado> = {};
    estudantes.forEach(e => {
      m[e.codigo_estudante] = e;
    });
    return m;
  }, [estudantes]);

  if (avs.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        Nenhuma avaliação neste filtro.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            {[
              "Estudante",
              "Código",
              "Resultado",
              "Próximo Nível",
              "Observação",
              "Data",
            ].map(h => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {sortAvs(avs).map(a => (
            <tr
              key={a.id}
              className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors"
            >
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                {estudantesMap[a.codigo_estudante]?.nome ?? a.codigo_estudante}
              </td>
              <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                {a.codigo_estudante}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <BadgeResultado aprovado={a.aprovado} />
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {a.proximo_ano_academico
                  ? labelNivel(a.proximo_ano_academico)
                  : a.aprovado
                  ? "Ciclo finalizado"
                  : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-gray-400 max-w-[140px] truncate">
                {a.observacao ?? "—"}
              </td>
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AvaliacoesFinaisAdmin() {
  const token = tokenStorage.get() ?? undefined;
  const [layer, setLayer] = useState<Layer>({ type: "provincias" });

  const {
    data: dataAcads,
    execute: carregarAcads,
    loading: loadAcads,
  } = useApi(consultasService.listarAcademias);
  const { data: dataEstudantes, execute: carregarEstudantes } = useApi(
    consultasService.listarEstudantes
  );
  const {
    data: dataAvaliacoes,
    execute: carregarAvaliacoes,
    loading: loadAvs,
  } = useApi(consultasService.listarAvaliacoes);

  useEffect(() => {
    carregarAcads({ token });
    carregarEstudantes(token);
    carregarAvaliacoes({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const academias: AcadInfo[] = useMemo(
    () =>
      ((dataAcads as any)?.academias ?? []).map(
        (a: AcademiaDetalhada): AcadInfo => ({
          codigo_academia: a.codigo_academia,
          nome: a.nome,
          provincia: a.provincia,
          type: a.type,
          nivel_escolar: a.nivel_escolar,
          status: a.status,
        })
      ),
    [dataAcads]
  );

  const estudantes: EstudanteDetalhado[] = useMemo(
    () => (dataEstudantes as any)?.estudantes ?? [],
    [dataEstudantes]
  );
  const todasAvaliacoes: AvaliacaoFinal[] = useMemo(
    () => (dataAvaliacoes as any)?.avaliacoes ?? [],
    [dataAvaliacoes]
  );

  const provincias = useMemo(() => {
    const set = new Set(
      academias.map(a => a.provincia?.toUpperCase()).filter(Boolean)
    );
    return Array.from(set).sort((a, b) =>
      nomeProvincia(a).localeCompare(nomeProvincia(b))
    );
  }, [academias]);

  const acadsDaProvincia = (prov: string) =>
    academias.filter(
      a => a.provincia?.toUpperCase() === prov.toUpperCase()
    );

  function buildCrumbs() {
    if (layer.type === "provincias")
      return [{ label: "Províncias" }];
    if (layer.type === "academias")
      return [
        {
          label: "Províncias",
          onClick: () => setLayer({ type: "provincias" }),
        },
        { label: nomeProvincia(layer.provincia) },
      ];
    if (layer.type === "academia")
      return [
        {
          label: "Províncias",
          onClick: () => setLayer({ type: "provincias" }),
        },
        {
          label: nomeProvincia(layer.acad.provincia),
          onClick: () =>
            setLayer({ type: "academias", provincia: layer.acad.provincia }),
        },
        { label: layer.acad.nome },
      ];
    if (layer.type === "resultados")
      return [
        {
          label: "Províncias",
          onClick: () => setLayer({ type: "provincias" }),
        },
        {
          label: nomeProvincia(layer.acad.provincia),
          onClick: () =>
            setLayer({ type: "academias", provincia: layer.acad.provincia }),
        },
        {
          label: layer.acad.nome,
          onClick: () => setLayer({ type: "academia", acad: layer.acad }),
        },
        {
          label: `${layer.anoLetivo.replace("_", "/")} · ${labelNivel(layer.anoAcademico)}`,
        },
      ];
    return [];
  }

  const loading = loadAcads || loadAvs;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      </div>
    );
  }

  // ── Províncias ──
  if (layer.type === "provincias") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Avaliações Finais
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Selecione uma província para explorar as academias
          </p>
        </div>
        <StatsBar avaliacoes={todasAvaliacoes} />
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {provincias.map(prov => {
            const acads = acadsDaProvincia(prov);
            const avsProvd = todasAvaliacoes.filter(av =>
              acads.some(a => a.codigo_academia === av.codigo_academia)
            );
            return (
              <CardBtn
                key={prov}
                icon="mdi:map-marker-radius"
                title={nomeProvincia(prov)}
                subtitle={`${acads.length} academia(s) · ${avsProvd.length} avaliação(ões)`}
                stats={{
                  approved: avsProvd.filter(a => a.aprovado).length,
                  reprovated: avsProvd.filter(a => !a.aprovado).length,
                }}
                onClick={() =>
                  setLayer({ type: "academias", provincia: prov })
                }
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
    const acads = acadsDaProvincia(provincia);
    const avsProvd = todasAvaliacoes.filter(av =>
      acads.some(a => a.codigo_academia === av.codigo_academia)
    );

    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {nomeProvincia(provincia)}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {acads.length} academia(s) nesta província
          </p>
        </div>
        <StatsBar avaliacoes={avsProvd} />
        <div className="grid gap-3 sm:grid-cols-2">
          {acads.map(a => {
            const avs = todasAvaliacoes.filter(
              av => av.codigo_academia === a.codigo_academia
            );
            return (
              <CardBtn
                key={a.codigo_academia}
                icon={
                  a.type === "superior"
                    ? "mdi:university"
                    : "mdi:school"
                }
                title={a.nome}
                subtitle={`${a.codigo_academia} · ${avs.length} avaliação(ões)`}
                badge={a.type}
                stats={{
                  approved: avs.filter(av => av.aprovado).length,
                  reprovated: avs.filter(av => !av.aprovado).length,
                }}
                onClick={() => setLayer({ type: "academia", acad: a })}
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {acad.nome}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {acad.codigo_academia} ·{" "}
            {acad.type === "superior" ? "Ensino Superior" : "Escola"}
          </p>
        </div>
        <AcademiaDetalhe
          acad={acad}
          todasAvaliacoes={todasAvaliacoes}
          estudantes={estudantes}
          onSelectResultados={(tipoEnsino, anoLetivo, anoAcademico) =>
            setLayer({
              type: "resultados",
              acad,
              tipoEnsino,
              anoLetivo,
              anoAcademico,
            })
          }
        />
      </div>
    );
  }

  // ── Resultados detalhados ──
  if (layer.type === "resultados") {
    const { acad, tipoEnsino, anoLetivo, anoAcademico } = layer;
    const avs = todasAvaliacoes.filter(
      a =>
        a.codigo_academia === acad.codigo_academia &&
        getTipoEnsino(a.ano_academico_atual) === tipoEnsino &&
        a.ano_lectivo === anoLetivo &&
        a.ano_academico_atual === anoAcademico
    );

    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {labelNivel(anoAcademico)}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {acad.nome} · Ano Letivo {anoLetivo.replace("_", "/")}
          </p>
        </div>
        <StatsBar avaliacoes={avs} />
        <TabelaResultados avs={avs} estudantes={estudantes} />
      </div>
    );
  }

  return null;
}
