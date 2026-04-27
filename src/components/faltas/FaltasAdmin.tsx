// src/components/faltas/FaltasAdmin.tsx
"use client"
import { useState, useEffect, useMemo, useCallback } from "react";
import { useApi, consultasService, tokenStorage } from "@/lib/api";
import type { ApiDate, Falta } from "@/types/api";
import { Provincias } from "@/types/api";
import Icon from "@/components/ui/Icon";

// ─── helpers ────────────────────────────────────────────────────────────────

const ORDEM_ANOS = [
  "1_ano_fundamental","2_ano_fundamental","3_ano_fundamental","4_ano_fundamental","5_ano_fundamental",
  "6_ano_fundamental","7_ano_fundamental","8_ano_fundamental","9_ano_fundamental",
  "1_ano_medio","2_ano_medio","3_ano_medio","4_ano_medio",
  "1_ano_superior","2_ano_superior","3_ano_superior","4_ano_superior","5_ano_superior","6_ano_superior",
];

function labelNivel(v: string): string {
  const match = v.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!match) return v.replace(/_/g, " ");
  const [, n, tipo] = match;
  if (tipo === "fundamental") return `${n}º Ano do Ensino Fundamental`;
  if (tipo === "medio")       return `${n}º Ano do Ensino Médio`;
  return `${n}º Ano`;
}

function nomeProvinciaDeCodigo(codigo: string): string {
  return Provincias.find(p => p.codigo === codigo?.toUpperCase())?.nome ?? codigo;
}

function corQuantidade(q: number) {
  if (q >= 5) return "text-red-600 dark:text-red-400";
  if (q >= 3) return "text-amber-600 dark:text-amber-400";
  return "text-gray-700 dark:text-gray-300";
}

function formatarData(data: ApiDate) {
  try {
    return new Date(data + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return data; }
}

function ordenarAnoAcademico(a: string, b: string) {
  const ia = ORDEM_ANOS.indexOf(a), ib = ORDEM_ANOS.indexOf(b);
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1; if (ib === -1) return -1;
  return ia - ib;
}

interface FaltaExt extends Falta {
  estudante_nome?: string;
  academia_nome?: string;
}

// ─── tipos ───────────────────────────────────────────────────────────────────

interface AcadInfo {
  codigo_academia: string;
  nome: string;
  provincia: string;
  nivel: string;
  status: string;
}

type Layer =
  | { type: "provincias" }
  | { type: "academias"; provincia: string }
  | { type: "anos"; academia: AcadInfo }
  | { type: "niveis"; academia: AcadInfo; anoLetivo: string }
  | { type: "materias"; academia: AcadInfo; anoLetivo: string; nivel: string }
  | { type: "faltas"; academia: AcadInfo; anoLetivo: string; nivel: string; materiaId: string; materiaNome: string };

// ─── FilterTag ───────────────────────────────────────────────────────────────

function FilterTag({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/50 rounded-full text-xs text-brand-700 dark:text-brand-300">
      <span className="text-brand-400">{label}:</span>
      <span className="font-medium">{value}</span>
    </span>
  );
}

// ─── sub-componentes ─────────────────────────────────────────────────────────

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

function CardBtn({ icon, title, subtitle, badge, onClick }: {
  icon: string; title: string; subtitle?: string; badge?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-400 hover:shadow-sm transition-all text-left group">
      <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
        <Icon icon={icon} width={22} className="text-brand-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {badge && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex-shrink-0">
          {badge}
        </span>
      )}
      <Icon icon="mdi:chevron-right" width={18} className="text-gray-400 group-hover:text-brand-500 flex-shrink-0" />
    </button>
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

function StatsRow({ faltas }: { faltas: FaltaExt[] }) {
  const totalFaltas = faltas.reduce((acc, f) => acc + f.quantidade, 0);
  const estudantes  = new Set(faltas.map(f => f.codigo_estudante)).size;
  const maiorFalta  = faltas.length > 0 ? Math.max(...faltas.map(f => f.quantidade)) : 0;
  return (
    <div className="flex flex-wrap gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">Total Faltas</p>
        <p className={`text-2xl font-bold mt-0.5 ${corQuantidade(totalFaltas)}`}>{totalFaltas}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">Registros</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{faltas.length}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">Estudantes</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{estudantes}</p>
      </div>
      {maiorFalta > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Maior Falta</p>
          <p className={`text-2xl font-bold mt-0.5 ${corQuantidade(maiorFalta)}`}>{maiorFalta}</p>
        </div>
      )}
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function FaltasAdmin() {
  const token = tokenStorage.get() ?? undefined;
  const [layer, setLayer] = useState<Layer>({ type: "provincias" });

  const { data: academiasData, execute: carregarAcademias, loading: loadingAcads } = useApi(consultasService.listarAcademias);

  // Faltas carregadas via API com filtros
  const { data: faltasData, execute: carregarFaltas, loading: loadingFaltas } = useApi(consultasService.listarFaltas);

  // Anos letivos por academia (descobertos carregando faltas com limit alto)
  const [anosLetivosPorAcademia, setAnosLetivosPorAcademia] = useState<Record<string, string[]>>({});
  const [loadingAnos, setLoadingAnos] = useState(false);

  useEffect(() => {
    carregarAcademias({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const academias: AcadInfo[] = useMemo(() =>
    ((academiasData as any)?.academias ?? []).map((a: any) => ({
      codigo_academia: a.codigo_academia,
      nome: a.nome,
      provincia: a.provincia,
      nivel: a.nivel,
      status: a.status,
    })),
    [academiasData]);

  const provincias = useMemo(() =>
    Array.from(new Set(academias.map(a => a.provincia?.toUpperCase()).filter(Boolean))).sort((a, b) =>
      nomeProvinciaDeCodigo(a).localeCompare(nomeProvinciaDeCodigo(b))
    ),
    [academias]);

  // Faltas actuais vindas do servidor (já filtradas)
  const faltasActuais: FaltaExt[] = useMemo(() => (faltasData as any)?.faltas ?? [], [faltasData]);

  const carregarAnosLetivosAcademia = useCallback(async (codigoAcademia: string) => {
    if (anosLetivosPorAcademia[codigoAcademia]) return;
    setLoadingAnos(true);
    try {
      const res = await consultasService.listarFaltas({ codigo_academia: codigoAcademia, limit: 1000, token });
      const anos = Array.from(new Set((res?.faltas ?? []).map(f => f.ano_lectivo).filter(Boolean))).sort();
      setAnosLetivosPorAcademia(prev => ({ ...prev, [codigoAcademia]: anos }));
    } catch {
      setAnosLetivosPorAcademia(prev => ({ ...prev, [codigoAcademia]: [] }));
    } finally {
      setLoadingAnos(false);
    }
  }, [anosLetivosPorAcademia, token]);

  function academiasNaProvincia(prov: string) {
    return academias.filter(a => a.provincia?.toUpperCase() === prov.toUpperCase());
  }

  function buildCrumbs(): { label: string; onClick?: () => void }[] {
    const goProvs = { label: "Províncias", onClick: () => setLayer({ type: "provincias" }) };
    if (layer.type === "provincias") return [goProvs];
    if (layer.type === "academias")  return [goProvs, { label: nomeProvinciaDeCodigo(layer.provincia) }];
    if (layer.type === "anos")       return [goProvs, { label: nomeProvinciaDeCodigo(layer.academia.provincia), onClick: () => setLayer({ type: "academias", provincia: layer.academia.provincia }) }, { label: layer.academia.nome }];
    if (layer.type === "niveis")     return [goProvs, { label: nomeProvinciaDeCodigo(layer.academia.provincia), onClick: () => setLayer({ type: "academias", provincia: layer.academia.provincia }) }, { label: layer.academia.nome, onClick: () => setLayer({ type: "anos", academia: layer.academia }) }, { label: layer.anoLetivo.replace(/_/g, "/") }];
    if (layer.type === "materias")   return [goProvs, { label: nomeProvinciaDeCodigo(layer.academia.provincia), onClick: () => setLayer({ type: "academias", provincia: layer.academia.provincia }) }, { label: layer.academia.nome, onClick: () => setLayer({ type: "anos", academia: layer.academia }) }, { label: layer.anoLetivo.replace(/_/g, "/"), onClick: () => setLayer({ type: "niveis", academia: layer.academia, anoLetivo: layer.anoLetivo }) }, { label: labelNivel(layer.nivel) }];
    if (layer.type === "faltas")     return [goProvs, { label: nomeProvinciaDeCodigo(layer.academia.provincia), onClick: () => setLayer({ type: "academias", provincia: layer.academia.provincia }) }, { label: layer.academia.nome, onClick: () => setLayer({ type: "anos", academia: layer.academia }) }, { label: layer.anoLetivo.replace(/_/g, "/"), onClick: () => setLayer({ type: "niveis", academia: layer.academia, anoLetivo: layer.anoLetivo }) }, { label: labelNivel(layer.nivel), onClick: () => setLayer({ type: "materias", academia: layer.academia, anoLetivo: layer.anoLetivo, nivel: layer.nivel }) }, { label: layer.materiaNome }];
    return [goProvs];
  }

  if (loadingAcads) return <LoadingSpinner message="Carregando academias..." />;

  // ── Províncias ──
  if (layer.type === "provincias") return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Faltas do Sistema</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecione uma província para explorar as faltas</p>
      </div>
      {provincias.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Icon icon="mdi:map-marker-outline" width={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma academia registrada.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {provincias.map(prov => {
            const acads = academiasNaProvincia(prov);
            return (
              <CardBtn
                key={prov}
                icon="mdi:map-marker-radius"
                title={nomeProvinciaDeCodigo(prov)}
                subtitle={`${acads.length} academia(s)`}
                onClick={() => setLayer({ type: "academias", provincia: prov })}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Academias ──
  if (layer.type === "academias") {
    const acads = academiasNaProvincia(layer.provincia);
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Província {nomeProvinciaDeCodigo(layer.provincia)}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {acads.map(a => (
            <CardBtn
              key={a.codigo_academia}
              icon={a.nivel === "superior" ? "mdi:university" : "mdi:school"}
              title={a.nome}
              subtitle={a.codigo_academia}
              badge={a.nivel}
              onClick={async () => {
                await carregarAnosLetivosAcademia(a.codigo_academia);
                setLayer({ type: "anos", academia: a });
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Anos letivos ──
  if (layer.type === "anos") {
    const { academia } = layer;
    const anos = anosLetivosPorAcademia[academia.codigo_academia] ?? [];
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{academia.nome}</h2>
          <p className="text-sm text-gray-500 mt-1">{academia.codigo_academia} · {academia.nivel === "superior" ? "Ensino Superior" : "Escola"}</p>
        </div>
        {loadingAnos ? (
          <LoadingSpinner message="Carregando anos letivos..." />
        ) : anos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Icon icon="mdi:check-circle" width={48} className="mx-auto mb-3 text-green-400 opacity-80" />
            <p className="text-sm">Nenhuma falta registada nesta academia.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {anos.map(ano => (
              <CardBtn
                key={ano}
                icon="mdi:calendar-school"
                title={`Ano Letivo ${ano.replace(/_/g, "/")}`}
                subtitle="Ver faltas por nível académico"
                badge={anos[0] === ano ? "actual" : undefined}
                onClick={async () => {
                  await carregarFaltas({ codigo_academia: academia.codigo_academia, ano_letivo: ano, limit: 1000, token });
                  setLayer({ type: "niveis", academia, anoLetivo: ano });
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Níveis académicos ──
  if (layer.type === "niveis") {
    const { academia, anoLetivo } = layer;
    if (loadingFaltas) return <LoadingSpinner message={`Carregando faltas de ${anoLetivo.replace(/_/g, "/")}...`} />;

    const niveisMap = new Map<string, { totalFaltas: number; registros: number }>();
    faltasActuais.forEach(f => {
      const nivel = f.ano_academico;
      if (!nivel) return;
      const ex = niveisMap.get(nivel);
      if (ex) { ex.totalFaltas += f.quantidade; ex.registros++; }
      else niveisMap.set(nivel, { totalFaltas: f.quantidade, registros: 1 });
    });
    const niveis = Array.from(niveisMap.entries())
      .map(([nivel, stats]) => ({ nivel, ...stats }))
      .sort((a, b) => ordenarAnoAcademico(a.nivel, b.nivel));

    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ano Letivo {anoLetivo.replace(/_/g, "/")}</h2>
            <p className="text-sm text-gray-500 mt-1">{academia.nome}</p>
          </div>
          <div className="flex gap-2 flex-wrap ml-auto">
            <FilterTag label="Academia" value={academia.codigo_academia} />
            <FilterTag label="Ano letivo" value={anoLetivo.replace(/_/g, "/")} />
          </div>
        </div>
        {faltasActuais.length > 0 && <StatsRow faltas={faltasActuais as FaltaExt[]} />}
        {niveis.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Icon icon="mdi:check-circle" width={48} className="mx-auto mb-3 text-green-400 opacity-80" />
            <p className="text-sm">Nenhuma falta registada neste ano letivo.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {niveis.map(({ nivel, totalFaltas, registros }) => (
              <CardBtn
                key={nivel}
                icon="mdi:numeric"
                title={labelNivel(nivel)}
                subtitle={`${totalFaltas} falta(s) · ${registros} registro(s)`}
                onClick={() => setLayer({ type: "materias", academia, anoLetivo, nivel })}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Matérias ──
  if (layer.type === "materias") {
    const { academia, anoLetivo, nivel } = layer;
    const faltasNivel = faltasActuais.filter(f => f.ano_academico === nivel);

    const materiasMap = new Map<string, { nome: string; total: number; count: number }>();
    faltasNivel.forEach(f => {
      const ex = materiasMap.get(f.materia_disciplinar_id);
      if (ex) { ex.total += f.quantidade; ex.count++; }
      else materiasMap.set(f.materia_disciplinar_id, { nome: f.materia_nome ?? f.materia_disciplinar_id, total: f.quantidade, count: 1 });
    });
    const materias = Array.from(materiasMap.entries())
      .map(([id, { nome, total, count }]) => ({ id, nome, totalFaltas: total, registros: count }))
      .sort((a, b) => a.nome.localeCompare(b.nome));

    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labelNivel(nivel)} — Matérias</h2>
            <p className="text-sm text-gray-500 mt-1">{academia.nome} · {anoLetivo.replace(/_/g, "/")}</p>
          </div>
          <div className="flex gap-2 flex-wrap ml-auto">
            <FilterTag label="Ano letivo" value={anoLetivo.replace(/_/g, "/")} />
            <FilterTag label="Nível" value={labelNivel(nivel)} />
          </div>
        </div>
        {faltasNivel.length > 0 && <StatsRow faltas={faltasNivel as FaltaExt[]} />}
        {materias.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Icon icon="mdi:check-circle" width={48} className="mx-auto mb-3 text-green-400 opacity-80" />
            <p className="text-sm">Nenhuma matéria com faltas neste nível.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {materias.map(m => (
              <CardBtn
                key={m.id}
                icon="mdi:book-open-variant"
                title={m.nome}
                subtitle={`${m.totalFaltas} falta(s) · ${m.registros} registro(s)`}
                onClick={() => setLayer({ type: "faltas", academia, anoLetivo, nivel, materiaId: m.id, materiaNome: m.nome })}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Tabela de Faltas ──
  if (layer.type === "faltas") {
    const { academia, anoLetivo, nivel, materiaId, materiaNome } = layer;
    const faltas = (faltasActuais as FaltaExt[])
      .filter(f => f.ano_academico === nivel && f.materia_disciplinar_id === materiaId)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{materiaNome}</h2>
            <p className="text-sm text-gray-500 mt-1">{academia.nome} · {anoLetivo.replace(/_/g, "/")} · {labelNivel(nivel)}</p>
          </div>
          <div className="flex gap-2 flex-wrap ml-auto">
            <FilterTag label="Ano letivo" value={anoLetivo.replace(/_/g, "/")} />
            <FilterTag label="Matéria" value={materiaNome} />
          </div>
        </div>

        {faltas.length > 0 && <StatsRow faltas={faltas} />}

        {faltas.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Icon icon="mdi:check-circle" width={48} className="mx-auto mb-3 text-green-400 opacity-80" />
            <p className="text-sm">Nenhuma falta nesta matéria para este filtro.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/70">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Estudante</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Data</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">Qtd</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {faltas.map(f => (
                  <tr key={f.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white capitalize">
                        {f.estudante_nome || f.codigo_estudante}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">{f.codigo_estudante}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatarData(f.data)}</td>
                    <td className={`px-4 py-3 text-center text-lg font-bold ${corQuantidade(f.quantidade)}`}>{f.quantidade}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{f.observacao || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return null;
}
