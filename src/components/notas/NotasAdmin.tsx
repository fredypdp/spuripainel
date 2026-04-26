// src/components/notas/NotasAdmin.tsx
"use client"
import { Fragment, useState, useEffect, useMemo, useCallback } from "react";
import { useApi, consultasService, tokenStorage } from "@/lib/api";
import type { Nota, ListarNotasParams } from "@/types/api";
import { Provincias } from "@/types/api";
import Icon from "@/components/ui/Icon";

// ─── helpers ────────────────────────────────────────────────────────────────

const PERIODOS_LABEL: Record<string, string> = {
  "1_trimestre": "1º Trimestre", "2_trimestre": "2º Trimestre", "3_trimestre": "3º Trimestre",
  "1_semestre": "1º Semestre",   "2_semestre": "2º Semestre",
};
const ORDEM_PERIODOS = ["1_trimestre","2_trimestre","3_trimestre","1_semestre","2_semestre"];
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
  return `${n}º Ano Superior`;
}

function nomeProvinciaDeCodigo(codigo: string): string {
  return Provincias.find(p => p.codigo === codigo?.toUpperCase())?.nome ?? codigo;
}

function corNota(n: number) {
  if (n >= 14) return "text-emerald-600 dark:text-emerald-400";
  if (n >= 10) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function calcMedia(notas: Nota[]) {
  if (!notas.length) return null;
  return notas.reduce((s, n) => s + n.nota, 0) / notas.length;
}

function sortAnosAcademicos(anos: string[]): string[] {
  return [...anos].sort((a, b) => {
    const ia = ORDEM_ANOS.indexOf(a);
    const ib = ORDEM_ANOS.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

function formatCategoria(c: string) {
  const m: Record<string, string> = {
    nota_escola: "Nota Escola", nota_professor: "Nota do Professor",
    nota_pp1: "PP1", nota_pp2: "PP2", nota_exame: "Exame",
  };
  return m[c] ?? c.replace(/^nota_/, "").replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

// ─── tipos ───────────────────────────────────────────────────────────────────

type AcadInfo = {
  codigo_academia: string;
  nome: string;
  provincia: string;
  nivel: string;
  nivel_escolar?: string;
  status: string;
};

type Layer =
  | { type: "provincias" }
  | { type: "academias"; provincia: string }
  | { type: "academia_anos"; academia: AcadInfo }
  | { type: "academia_niveis"; academia: AcadInfo; anoLetivo: string }
  | { type: "academia_periodos"; academia: AcadInfo; anoLetivo: string; nivel: string }
  | { type: "academia_materias"; academia: AcadInfo; anoLetivo: string; nivel: string; periodo: string }
  | { type: "academia_notas"; academia: AcadInfo; anoLetivo: string; nivel: string; periodo: string; materiaId: string; materiaNome: string };

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
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-400 hover:shadow-sm transition-all text-left group"
    >
      <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
        <Icon icon={icon} width={22} className="text-brand-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {badge && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize flex-shrink-0">
          {badge}
        </span>
      )}
      <Icon icon="mdi:chevron-right" width={18} className="text-gray-400 group-hover:text-brand-500 flex-shrink-0" />
    </button>
  );
}

function StatsRow({ notas }: { notas: Nota[] }) {
  const media = calcMedia(notas);
  const aprovadas = notas.filter(n => n.nota >= 10).length;
  return (
    <div className="flex flex-wrap gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
      <div><p className="text-xs text-gray-500 uppercase tracking-wide">Total</p><p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{notas.length}</p></div>
      {media !== null && <div><p className="text-xs text-gray-500 uppercase tracking-wide">Média</p><p className={`text-2xl font-bold mt-0.5 ${corNota(media)}`}>{media.toFixed(1)}</p></div>}
      <div><p className="text-xs text-gray-500 uppercase tracking-wide">Aprovações</p><p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{aprovadas}/{notas.length}</p></div>
    </div>
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

// ─── Tabela escolar (nota_professor + nota_escola) — ordenada por nome ────────

function TabelaNotasEscolar({ notas }: { notas: Nota[] }) {
  if (!notas.length) return (
    <div className="text-center py-10 text-gray-400">
      <Icon icon="mdi:notebook-outline" width={40} className="mx-auto mb-2 opacity-40" />
      <p className="text-sm">Nenhuma nota nesta matéria para este período.</p>
    </div>
  );

  // Agrupa por estudante
  const porEstudante = new Map<string, Nota[]>();
  notas.forEach(n => {
    if (!porEstudante.has(n.codigo_estudante)) porEstudante.set(n.codigo_estudante, []);
    porEstudante.get(n.codigo_estudante)!.push(n);
  });

  // Ordena por nome alfabeticamente
  const linhas = Array.from(porEstudante.entries())
    .map(([codigo, notasEst]) => ({
      codigo,
      nome: notasEst[0]?.estudante_nome ?? codigo,
      notaProf: notasEst.find(n => n.categoria === "nota_professor"),
      notaEsc: notasEst.find(n => n.categoria === "nota_escola"),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" }));

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm min-w-[500px]">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Nome do Estudante</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Código</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Nota do Professor</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Nota Escola</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {linhas.map(({ codigo, nome, notaProf, notaEsc }) => (
            <tr key={codigo} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{nome}</td>
              <td className="px-4 py-3 text-gray-400 font-mono text-xs">{codigo.toUpperCase()}</td>
              <td className={`px-4 py-3 text-right font-bold ${notaProf ? corNota(notaProf.nota) : "text-gray-300 dark:text-gray-600"}`}>
                {notaProf != null ? notaProf.nota : "—"}
              </td>
              <td className={`px-4 py-3 text-right font-bold ${notaEsc ? corNota(notaEsc.nota) : "text-gray-300 dark:text-gray-600"}`}>
                {notaEsc != null ? notaEsc.nota : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tabela superior (pp1 + pp2 + exame) — ordenada por nome ─────────────────

function TabelaNotasSuperior({ notas }: { notas: Nota[] }) {
  if (!notas.length) return (
    <div className="text-center py-10 text-gray-400">
      <Icon icon="mdi:notebook-outline" width={40} className="mx-auto mb-2 opacity-40" />
      <p className="text-sm">Nenhuma nota nesta matéria para este período.</p>
    </div>
  );

  // Agrupa e ordena por nome
  const porEstudante = new Map<string, Nota[]>();
  notas.forEach(n => {
    if (!porEstudante.has(n.codigo_estudante)) porEstudante.set(n.codigo_estudante, []);
    porEstudante.get(n.codigo_estudante)!.push(n);
  });

  const linhas = Array.from(porEstudante.entries())
    .map(([codigo, notasEst]) => ({
      codigo,
      nome: notasEst[0]?.estudante_nome ?? codigo,
      pp1: notasEst.find(n => n.categoria === "nota_pp1"),
      pp2: notasEst.find(n => n.categoria === "nota_pp2"),
      exame: notasEst.find(n => n.categoria === "nota_exame"),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" }));

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm min-w-[560px]">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Nome do Estudante</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Código</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">PP1</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">PP2</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Exame</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {linhas.map(({ codigo, nome, pp1, pp2, exame }) => (
            <tr key={codigo} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{nome}</td>
              <td className="px-4 py-3 text-gray-400 font-mono text-xs">{codigo.toUpperCase()}</td>
              <td className={`px-4 py-3 text-right font-bold ${pp1   ? corNota(pp1.nota)   : "text-gray-300 dark:text-gray-600"}`}>{pp1   != null ? pp1.nota   : "—"}</td>
              <td className={`px-4 py-3 text-right font-bold ${pp2   ? corNota(pp2.nota)   : "text-gray-300 dark:text-gray-600"}`}>{pp2   != null ? pp2.nota   : "—"}</td>
              <td className={`px-4 py-3 text-right font-bold ${exame ? corNota(exame.nota) : "text-gray-300 dark:text-gray-600"}`}>{exame != null ? exame.nota : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function NotasAdmin() {
  const token = tokenStorage.get() ?? undefined;
  const [layer, setLayer] = useState<Layer>({ type: "provincias" });

  // Dados base: academias (leves, sem notas)
  const { data: academiasData, execute: carregarAcademias, loading: loadingAcads } = useApi(consultasService.listarAcademias);

  // Notas carregadas sob demanda com filtros da API
  const { data: notasData, execute: carregarNotas, loading: loadingNotas } = useApi(consultasService.listarNotas);

  // Anos letivos disponíveis por academia
  const [anosLetivosPorAcademia, setAnosLetivosPorAcademia] = useState<Record<string, string[]>>({});
  const [loadingAnos, setLoadingAnos] = useState(false);

  // Matéria selecionada na camada "notas"
  const [materiaSelecionada, setMateriaSelecionada] = useState<string | null>(null);

  // Cache de nomes de matérias
  const [materiasCache, setMateriasCache] = useState<Record<string, { id: string; nome: string }>>({});

  // Reseta matéria selecionada quando a camada muda
  useEffect(() => {
    setMateriaSelecionada(null);
  }, [layer.type]);

  useEffect(() => {
    carregarAcademias({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Popula cache de nomes de matérias a partir das notas carregadas
  useEffect(() => {
    const notas: Nota[] = (notasData as any)?.notas ?? [];
    if (!notas.length) return;
    setMateriasCache(prev => {
      const next = { ...prev };
      notas.forEach(n => {
        if (n.materia_disciplinar_id && n.materia_nome && !next[n.materia_disciplinar_id]) {
          next[n.materia_disciplinar_id] = { id: n.materia_disciplinar_id, nome: n.materia_nome };
        }
      });
      return next;
    });
  }, [notasData]);

  const academias: AcadInfo[] = useMemo(() =>
    ((academiasData as any)?.academias ?? []).map((a: any) => ({
      codigo_academia: a.codigo_academia,
      nome: a.nome,
      provincia: a.provincia,
      nivel: a.nivel,
      nivel_escolar: a.nivel_escolar,
      status: a.status,
    })),
    [academiasData]);

  const provincias = useMemo(() =>
    Array.from(new Set(academias.map(a => a.provincia?.toUpperCase()).filter(Boolean))).sort((a, b) =>
      nomeProvinciaDeCodigo(a).localeCompare(nomeProvinciaDeCodigo(b))
    ),
    [academias]);

  // Carrega anos letivos disponíveis para uma academia
  const carregarAnosLetivosAcademia = useCallback(async (codigoAcademia: string) => {
    if (anosLetivosPorAcademia[codigoAcademia]) return;
    setLoadingAnos(true);
    try {
      const res = await consultasService.listarNotas({ codigo_academia: codigoAcademia, limit: 1000, token });
      const anos = Array.from(new Set((res?.notas ?? []).map(n => n.ano_lectivo).filter(Boolean))).sort();
      setAnosLetivosPorAcademia(prev => ({ ...prev, [codigoAcademia]: anos }));
    } catch {
      setAnosLetivosPorAcademia(prev => ({ ...prev, [codigoAcademia]: [] }));
    } finally {
      setLoadingAnos(false);
    }
  }, [anosLetivosPorAcademia, token]);

  // Notas actuais (filtradas pelo servidor)
  const notasActuais: Nota[] = useMemo(() => (notasData as any)?.notas ?? [], [notasData]);

  function academiasNaProvincia(prov: string) {
    return academias.filter(a => a.provincia?.toUpperCase() === prov.toUpperCase());
  }

  function buildCrumbs(): { label: string; onClick?: () => void }[] {
    const provs = { label: "Províncias", onClick: () => setLayer({ type: "provincias" }) };
    if (layer.type === "provincias") return [provs];
    if (layer.type === "academias") return [provs, { label: nomeProvinciaDeCodigo(layer.provincia) }];
    if (layer.type === "academia_anos") return [provs, { label: nomeProvinciaDeCodigo(layer.academia.provincia), onClick: () => setLayer({ type: "academias", provincia: layer.academia.provincia }) }, { label: layer.academia.nome }];
    if (layer.type === "academia_niveis") return [provs, { label: nomeProvinciaDeCodigo(layer.academia.provincia), onClick: () => setLayer({ type: "academias", provincia: layer.academia.provincia }) }, { label: layer.academia.nome, onClick: () => setLayer({ type: "academia_anos", academia: layer.academia }) }, { label: layer.anoLetivo.replace(/_/g, "/") }];
    if (layer.type === "academia_periodos") return [provs, { label: nomeProvinciaDeCodigo(layer.academia.provincia), onClick: () => setLayer({ type: "academias", provincia: layer.academia.provincia }) }, { label: layer.academia.nome, onClick: () => setLayer({ type: "academia_anos", academia: layer.academia }) }, { label: layer.anoLetivo.replace(/_/g, "/"), onClick: () => setLayer({ type: "academia_niveis", academia: layer.academia, anoLetivo: layer.anoLetivo }) }, { label: labelNivel(layer.nivel) }];
    if (layer.type === "academia_materias") return [provs, { label: nomeProvinciaDeCodigo(layer.academia.provincia), onClick: () => setLayer({ type: "academias", provincia: layer.academia.provincia }) }, { label: layer.academia.nome, onClick: () => setLayer({ type: "academia_anos", academia: layer.academia }) }, { label: layer.anoLetivo.replace(/_/g, "/"), onClick: () => setLayer({ type: "academia_niveis", academia: layer.academia, anoLetivo: layer.anoLetivo }) }, { label: labelNivel(layer.nivel), onClick: () => setLayer({ type: "academia_periodos", academia: layer.academia, anoLetivo: layer.anoLetivo, nivel: layer.nivel }) }, { label: PERIODOS_LABEL[layer.periodo] ?? layer.periodo }];
    if (layer.type === "academia_notas") return [provs, { label: nomeProvinciaDeCodigo(layer.academia.provincia), onClick: () => setLayer({ type: "academias", provincia: layer.academia.provincia }) }, { label: layer.academia.nome, onClick: () => setLayer({ type: "academia_anos", academia: layer.academia }) }, { label: layer.anoLetivo.replace(/_/g, "/"), onClick: () => setLayer({ type: "academia_niveis", academia: layer.academia, anoLetivo: layer.anoLetivo }) }, { label: labelNivel(layer.nivel), onClick: () => setLayer({ type: "academia_periodos", academia: layer.academia, anoLetivo: layer.anoLetivo, nivel: layer.nivel }) }, { label: PERIODOS_LABEL[layer.periodo] ?? layer.periodo, onClick: () => setLayer({ type: "academia_materias", academia: layer.academia, anoLetivo: layer.anoLetivo, nivel: layer.nivel, periodo: layer.periodo }) }, { label: layer.materiaNome }];
    return [provs];
  }

  if (loadingAcads) return <LoadingSpinner message="Carregando academias..." />;

  // ── Províncias ──
  if (layer.type === "provincias") return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notas do Sistema</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecione uma província para explorar as notas</p>
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
                setLayer({ type: "academia_anos", academia: a });
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Anos letivos da academia ──
  if (layer.type === "academia_anos") {
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
            <Icon icon="mdi:calendar-blank-outline" width={44} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum registro de notas nesta academia.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {anos.map(ano => (
              <CardBtn
                key={ano}
                icon="mdi:calendar-school"
                title={`Ano Letivo ${ano.replace(/_/g, "/")}`}
                subtitle="Ver notas por nível académico"
                badge={anos[0] === ano ? "actual" : undefined}
                onClick={async () => {
                  await carregarNotas({ codigo_academia: academia.codigo_academia, ano_letivo: ano, limit: 1000, token });
                  setLayer({ type: "academia_niveis", academia, anoLetivo: ano });
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Níveis académicos ──
  if (layer.type === "academia_niveis") {
    const { academia, anoLetivo } = layer;
    if (loadingNotas) return <LoadingSpinner message={`Carregando notas de ${anoLetivo.replace(/_/g, "/")}...`} />;

    const niveisAcademicos = sortAnosAcademicos(
      Array.from(new Set(notasActuais.map(n => n.ano_academico).filter(Boolean))) as string[]
    );

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
        {notasActuais.length > 0 && <StatsRow notas={notasActuais} />}
        {niveisAcademicos.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">Nenhum nível académico com notas neste ano letivo.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {niveisAcademicos.map(nivel => {
              const nn = notasActuais.filter(n => n.ano_academico === nivel);
              const med = calcMedia(nn);
              return (
                <CardBtn
                  key={nivel}
                  icon="mdi:numeric"
                  title={labelNivel(nivel)}
                  subtitle={`${nn.length} nota(s)${med !== null ? ` · Média ${med.toFixed(1)}` : ""}`}
                  onClick={() => setLayer({ type: "academia_periodos", academia, anoLetivo, nivel })}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Períodos ──
  if (layer.type === "academia_periodos") {
    const { academia, anoLetivo, nivel } = layer;
    const notasNivel = notasActuais.filter(n => n.ano_academico === nivel);
    const periodos = Array.from(new Set(notasNivel.map(n => n.periodo))).sort(
      (a, b) => ORDEM_PERIODOS.indexOf(a) - ORDEM_PERIODOS.indexOf(b)
    );

    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labelNivel(nivel)}</h2>
            <p className="text-sm text-gray-500 mt-1">{academia.nome} · {anoLetivo.replace(/_/g, "/")}</p>
          </div>
          <div className="flex gap-2 flex-wrap ml-auto">
            <FilterTag label="Ano letivo" value={anoLetivo.replace(/_/g, "/")} />
            <FilterTag label="Nível" value={labelNivel(nivel)} />
          </div>
        </div>
        {notasNivel.length > 0 && <StatsRow notas={notasNivel} />}
        {periodos.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">Nenhum período com notas neste nível.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {periodos.map(p => {
              const np = notasNivel.filter(n => n.periodo === p);
              const med = calcMedia(np);
              return (
                <CardBtn
                  key={p}
                  icon="mdi:clipboard-text-clock-outline"
                  title={PERIODOS_LABEL[p] ?? p}
                  subtitle={`${np.length} nota(s)${med !== null ? ` · Média ${med.toFixed(1)}` : ""}`}
                  onClick={() => setLayer({ type: "academia_materias", academia, anoLetivo, nivel, periodo: p })}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Matérias ──
  if (layer.type === "academia_materias") {
    const { academia, anoLetivo, nivel, periodo } = layer;
    const notasPeriodo = notasActuais.filter(n => n.ano_academico === nivel && n.periodo === periodo);

    const materiasMap = new Map<string, { nome: string; count: number; sum: number }>();
    notasPeriodo.forEach(n => {
      const ex = materiasMap.get(n.materia_disciplinar_id);
      if (ex) { ex.count++; ex.sum += n.nota; }
      else materiasMap.set(n.materia_disciplinar_id, { nome: n.materia_nome ?? n.materia_disciplinar_id, count: 1, sum: n.nota });
    });
    const materiasList = Array.from(materiasMap.entries())
      .map(([id, { nome, count, sum }]) => ({ id, nome, notasCount: count, media: count > 0 ? sum / count : null }))
      .sort((a, b) => a.nome.localeCompare(b.nome));

    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{PERIODOS_LABEL[periodo] ?? periodo} — Matérias</h2>
            <p className="text-sm text-gray-500 mt-1">{academia.nome} · {anoLetivo.replace(/_/g, "/")} · {labelNivel(nivel)}</p>
          </div>
          <div className="flex gap-2 flex-wrap ml-auto">
            <FilterTag label="Período" value={PERIODOS_LABEL[periodo] ?? periodo} />
          </div>
        </div>
        {notasPeriodo.length > 0 && <StatsRow notas={notasPeriodo} />}
        {materiasList.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Icon icon="mdi:book-outline" width={48} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma matéria com notas neste período.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {materiasList.map(m => (
              <CardBtn
                key={m.id}
                icon="mdi:book-open-variant"
                title={m.nome}
                subtitle={m.notasCount > 0 ? `${m.notasCount} nota(s)${m.media !== null ? ` · Média ${m.media.toFixed(1)}` : ""}` : "Sem notas"}
                badge={m.notasCount === 0 ? "vazia" : undefined}
                onClick={() => setLayer({ type: "academia_notas", academia, anoLetivo, nivel, periodo, materiaId: m.id, materiaNome: m.nome })}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Notas de uma matéria (com seletor inline, igual ao NotasAcademia) ──
  if (layer.type === "academia_notas") {
    const { academia, anoLetivo, nivel, periodo, materiaId, materiaNome } = layer;

    // Todas as notas deste nível + período
    const notasContexto = notasActuais.filter(n =>
      n.ano_academico === nivel && n.periodo === periodo
    );

    // Matérias disponíveis a partir das notas carregadas
    const materiaIdsCtx = [...new Set(notasContexto.map(n => n.materia_disciplinar_id))];
    const materiasDisponiveis = materiaIdsCtx
      .map(id => materiasCache[id] ?? { id, nome: id })
      .sort((a, b) => a.nome.localeCompare(b.nome));

    // Inicializa a matéria selecionada com a que veio do nível anterior
    const materiaEfetiva = materiaSelecionada ?? materiaId;

    // Notas filtradas pela matéria selecionada
    const notasFiltradas = notasContexto.filter(n => n.materia_disciplinar_id === materiaEfetiva);

    const isSup = notasFiltradas.some(n => n.tipo === "superior") ||
      notasContexto.some(n => n.tipo === "superior") ||
      academia.nivel === "superior";

    // Título: academia · nível · período · ano letivo  (admin não tem turma no fluxo)
    const titulo = `${academia.nome} · ${labelNivel(nivel)} · ${PERIODOS_LABEL[periodo] ?? periodo} · ${anoLetivo.replace(/_/g, "/")}`;
    const subtitulo = `Notas de ${materiasCache[materiaEfetiva]?.nome ?? materiaNome}`;

    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {titulo}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{academia.nome}</p>
          </div>
          <div className="flex gap-2 flex-wrap ml-auto">
            <FilterTag label="Matéria" value={materiasCache[materiaEfetiva]?.nome ?? materiaNome} />
          </div>
        </div>

        {/* Seletor de matéria */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {subtitulo}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Selecione uma matéria abaixo para ver as notas
            </p>
          </div>
          {materiasDisponiveis.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {materiasDisponiveis.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMateriaSelecionada(prev => prev === m.id ? null : m.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    materiaEfetiva === m.id
                      ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400"
                  }`}
                >
                  {m.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        {notasFiltradas.length > 0 && <StatsRow notas={notasFiltradas} />}

        {/* Tabela */}
        {materiaEfetiva ? (
          notasFiltradas.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Icon icon="mdi:notebook-outline" width={40} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma nota nesta matéria para este período.</p>
            </div>
          ) : isSup ? (
            <TabelaNotasSuperior notas={notasFiltradas} />
          ) : (
            <TabelaNotasEscolar notas={notasFiltradas} />
          )
        ) : (
          materiasDisponiveis.length > 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-4">
              Selecione uma matéria acima para ver as notas.
            </p>
          )
        )}
      </div>
    );
  }

  return null;
}