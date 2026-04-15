// src/components/notas/NotasAdmin.tsx
"use client"
import { useState, useEffect, useMemo } from "react";
import { useApi, consultasService, tokenStorage } from "@/lib/api";
import type { Nota } from "@/types/api";
import { Provincias } from "@/types/api";
import Icon from "@/components/ui/Icon";

// ─── helpers ────────────────────────────────────────────────────────────────

const PERIODOS_LABEL: Record<string, string> = {
  "1_trimestre": "1º Trimestre", "2_trimestre": "2º Trimestre", "3_trimestre": "3º Trimestre",
  "1_semestre": "1º Semestre",   "2_semestre": "2º Semestre",
};
const ORDEM_PERIODOS = ["1_trimestre","2_trimestre","3_trimestre","1_semestre","2_semestre"];

const NIVEL_LABEL: Record<string, string> = {
  "1_ano_fundamental": "1º Ano", "2_ano_fundamental": "2º Ano", "3_ano_fundamental": "3º Ano",
  "4_ano_fundamental": "4º Ano", "5_ano_fundamental": "5º Ano", "6_ano_fundamental": "6º Ano",
  "7_ano_fundamental": "7º Ano", "8_ano_fundamental": "8º Ano", "9_ano_fundamental": "9º Ano",
  "1_ano_medio": "1º Médio",     "2_ano_medio": "2º Médio",     "3_ano_medio": "3º Médio",     "4_ano_medio": "4º Médio",
  "1_ano_superior": "1º Ano",    "2_ano_superior": "2º Ano",    "3_ano_superior": "3º Ano",
  "4_ano_superior": "4º Ano",    "5_ano_superior": "5º Ano",    "6_ano_superior": "6º Ano",
};
function labelNivel(v: string) { return NIVEL_LABEL[v] ?? v.replace(/_/g, " "); }

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

function formatCategoria(c: string) {
  const m: Record<string, string> = {
    nota_escola: "Nota Final", nota_professor: "Nota Prof.",
    nota_pp1: "PP1", nota_pp2: "PP2", nota_exame: "Exame",
  };
  return m[c] ?? c.replace(/^nota_/, "").replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

// ─── tipos ───────────────────────────────────────────────────────────────────

type AcadInfo = {
  codigo_academia: string; nome: string; provincia: string;
  type: string; nivel_escolar?: string; status: string;
};

type Layer =
  | { type: "provincias" }
  | { type: "academias"; provincia: string }
  | { type: "academia_anos"; academia: AcadInfo }
  | { type: "academia_periodos"; academia: AcadInfo; ano: string }
  | { type: "academia_materias"; academia: AcadInfo; ano: string; periodo: string }
  | { type: "academia_notas"; academia: AcadInfo; ano: string; periodo: string; materiaId: string; materiaNome: string };

// ─── sub-componentes ─────────────────────────────────────────────────────────

function Spinner({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

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
      {badge && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize flex-shrink-0">{badge}</span>}
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

// Tabela escolar: Nome, Código, Nota Professor, Nota Final
function TabelaEscolar({ notas, estudantesMap }: { notas: Nota[]; estudantesMap: Record<string, string> }) {
  if (!notas.length) return (
    <div className="text-center py-10 text-gray-400">
      <Icon icon="mdi:notebook-outline" width={40} className="mx-auto mb-2 opacity-40" />
      <p className="text-sm">Nenhuma nota nesta matéria para este período.</p>
    </div>
  );

  const porEstudante = new Map<string, Nota[]>();
  notas.forEach(n => {
    if (!porEstudante.has(n.codigo_estudante)) porEstudante.set(n.codigo_estudante, []);
    porEstudante.get(n.codigo_estudante)!.push(n);
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Nome do Estudante</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Código do Estudante</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Nota do Professor</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Nota Final</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {Array.from(porEstudante.entries()).map(([codigo, notasEst]) => {
            const notaProf  = notasEst.find(n => n.categoria === "nota_professor");
            const notaFinal = notasEst.find(n => n.categoria === "nota_escola");

            if (!notaProf && !notaFinal) {
              return notasEst.map((nota, i) => (
                <tr key={nota.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 transition-colors">
                  {i === 0 && (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white" rowSpan={notasEst.length}>{estudantesMap[codigo] ?? "-"}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs" rowSpan={notasEst.length}>{codigo}</td>
                    </>
                  )}
                  <td className="px-4 py-3 text-right text-gray-400 dark:text-gray-600">—</td>
                  <td className={`px-4 py-3 text-right font-bold ${corNota(nota.nota)}`}>{nota.nota}</td>
                </tr>
              ));
            }

            return (
              <tr key={codigo} className="bg-white dark:bg-gray-800 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{estudantesMap[codigo] ?? "-"}</td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{codigo}</td>
                <td className={`px-4 py-3 text-right font-bold ${notaProf ? corNota(notaProf.nota) : "text-gray-400 dark:text-gray-600"}`}>{notaProf?.nota ?? "—"}</td>
                <td className={`px-4 py-3 text-right font-bold ${notaFinal ? corNota(notaFinal.nota) : "text-gray-400 dark:text-gray-600"}`}>{notaFinal?.nota ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Tabela superior: Nome, Código, Categoria, Nota
function TabelaSuperior({ notas, estudantesMap }: { notas: Nota[]; estudantesMap: Record<string, string> }) {
  if (!notas.length) return (
    <div className="text-center py-10 text-gray-400">
      <Icon icon="mdi:notebook-outline" width={40} className="mx-auto mb-2 opacity-40" />
      <p className="text-sm">Nenhuma nota nesta matéria para este período.</p>
    </div>
  );

  const porEstudante = new Map<string, Nota[]>();
  notas.forEach(n => {
    if (!porEstudante.has(n.codigo_estudante)) porEstudante.set(n.codigo_estudante, []);
    porEstudante.get(n.codigo_estudante)!.push(n);
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Nome do Estudante</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Código do Estudante</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Categoria</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Nota</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {Array.from(porEstudante.entries()).map(([codigo, notasEst]) =>
            notasEst.map((n, i) => (
              <tr key={n.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 transition-colors">
                {i === 0 && (
                  <>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white" rowSpan={notasEst.length}>{estudantesMap[codigo] ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs" rowSpan={notasEst.length}>{codigo}</td>
                  </>
                )}
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatCategoria(n.categoria)}</td>
                <td className={`px-4 py-3 text-right font-bold ${corNota(n.nota)}`}>{n.nota}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function NotasAdmin() {
  const token = tokenStorage.get() ?? undefined;
  const [layer, setLayer] = useState<Layer>({ type: "provincias" });
  const [loadingNotasAcad, setLoadingNotasAcad] = useState(false);

  const { data: academiasData, execute: carregarAcademias, loading: loadingAcads } = useApi(consultasService.listarAcademias);
  const { data: estudantesData, execute: carregarEstudantes, loading: loadingEstudantes } = useApi(consultasService.listarEstudantes);

  const [notasEstCache, setNotasEstCache] = useState<Record<string, Nota[]>>({});

  useEffect(() => {
    carregarAcademias(token);
    carregarEstudantes(undefined, token);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const academias: AcadInfo[] = useMemo(() =>
    ((academiasData as any)?.academias ?? []).map((a: any) => ({
      codigo_academia: a.codigo_academia, nome: a.nome, provincia: a.provincia,
      type: a.type, nivel_escolar: a.nivel_escolar, status: a.status,
    })),
    [academiasData]);

  const estudantesMap: Record<string, string> = useMemo(() => {
    const m: Record<string, string> = {};
    ((estudantesData as any)?.estudantes ?? []).forEach((e: any) => { m[e.codigo_estudante] = e.nome; });
    return m;
  }, [estudantesData]);

  const provincias = useMemo(() =>
    Array.from(new Set(academias.map(a => a.provincia))).sort(),
    [academias]);

  function academiasNaProvincia(prov: string) {
    return academias.filter(a => a.provincia === prov);
  }

  async function carregarNotasAcademia(academia: AcadInfo) {
    const estudantesAcad = ((estudantesData as any)?.estudantes ?? []).filter(
      (e: any) => e.codigo_academia === academia.codigo_academia
    );
    if (!estudantesAcad.length) return;
    setLoadingNotasAcad(true);
    await Promise.all(estudantesAcad.map(async (e: any) => {
      if (notasEstCache[e.codigo_estudante]) return;
      try {
        const res = await consultasService.notasEstudante(e.codigo_estudante, token);
        setNotasEstCache(prev => ({ ...prev, [e.codigo_estudante]: (res as any)?.notas ?? [] }));
      } catch {}
    }));
    setLoadingNotasAcad(false);
  }

  function notasDeAcademia(codigoAcademia: string): Nota[] {
    const estudantesAcad = ((estudantesData as any)?.estudantes ?? []).filter(
      (e: any) => e.codigo_academia === codigoAcademia
    );
    return estudantesAcad.flatMap(
      (e: any) => (notasEstCache[e.codigo_estudante] ?? []).filter((n: Nota) => n.codigo_academia === codigoAcademia)
    );
  }

  function anosDeAcademia(codigoAcademia: string): string[] {
    return Array.from(new Set(notasDeAcademia(codigoAcademia).map(n => n.ano_lectivo))).sort().reverse();
  }

  function periodosNoAno(codigoAcademia: string, ano: string): string[] {
    const ps = Array.from(new Set(notasDeAcademia(codigoAcademia).filter(n => n.ano_lectivo === ano).map(n => n.periodo)));
    return ps.sort((a, b) => ORDEM_PERIODOS.indexOf(a) - ORDEM_PERIODOS.indexOf(b));
  }

  function isAcademiaSuperior(codigoAcademia: string): boolean {
    const acad = academias.find(a => a.codigo_academia === codigoAcademia);
    if (acad?.type === "superior") return true;
    return notasDeAcademia(codigoAcademia).some(n => n.tipo === "superior");
  }

  function materiasNoAnoEPeriodo(codigoAcademia: string, ano: string, periodo: string) {
    const notas = notasDeAcademia(codigoAcademia).filter(n => n.ano_lectivo === ano && n.periodo === periodo);
    const map = new Map<string, { nome: string; count: number; sum: number }>();
    notas.forEach(n => {
      const ex = map.get(n.materia_disciplinar_id);
      if (ex) { ex.count++; ex.sum += n.nota; }
      else map.set(n.materia_disciplinar_id, { nome: n.materia_nome ?? n.materia_disciplinar_id, count: 1, sum: n.nota });
    });
    return Array.from(map.entries()).map(([id, { nome, count, sum }]) => ({
      id, nome, notasCount: count, media: count > 0 ? sum / count : null,
    })).sort((a, b) => a.nome.localeCompare(b.nome));
  }

  function buildCrumbs(): { label: string; onClick?: () => void }[] {
    const provs = { label: "Províncias", onClick: () => setLayer({ type: "provincias" }) };
    if (layer.type === "provincias") return [provs];
    if (layer.type === "academias") return [provs, { label: nomeProvinciaDeCodigo(layer.provincia) }];
    if (layer.type === "academia_anos") return [provs, { label: nomeProvinciaDeCodigo(layer.academia.provincia), onClick: () => setLayer({ type: "academias", provincia: layer.academia.provincia }) }, { label: layer.academia.nome }];
    if (layer.type === "academia_periodos") return [provs, { label: nomeProvinciaDeCodigo(layer.academia.provincia), onClick: () => setLayer({ type: "academias", provincia: layer.academia.provincia }) }, { label: layer.academia.nome, onClick: () => setLayer({ type: "academia_anos", academia: layer.academia }) }, { label: layer.ano.replace(/_/g, "/") }];
    if (layer.type === "academia_materias") return [provs, { label: nomeProvinciaDeCodigo(layer.academia.provincia), onClick: () => setLayer({ type: "academias", provincia: layer.academia.provincia }) }, { label: layer.academia.nome, onClick: () => setLayer({ type: "academia_anos", academia: layer.academia }) }, { label: layer.ano.replace(/_/g, "/"), onClick: () => setLayer({ type: "academia_periodos", academia: layer.academia, ano: layer.ano }) }, { label: PERIODOS_LABEL[layer.periodo] ?? layer.periodo }];
    if (layer.type === "academia_notas") return [provs, { label: nomeProvinciaDeCodigo(layer.academia.provincia), onClick: () => setLayer({ type: "academias", provincia: layer.academia.provincia }) }, { label: layer.academia.nome, onClick: () => setLayer({ type: "academia_anos", academia: layer.academia }) }, { label: layer.ano.replace(/_/g, "/"), onClick: () => setLayer({ type: "academia_periodos", academia: layer.academia, ano: layer.ano }) }, { label: PERIODOS_LABEL[layer.periodo] ?? layer.periodo, onClick: () => setLayer({ type: "academia_materias", academia: layer.academia, ano: layer.ano, periodo: layer.periodo }) }, { label: layer.materiaNome }];
    return [provs];
  }

  // Loading inicial: dados globais da API ainda carregando
  if (loadingAcads || loadingEstudantes) return <Spinner label="Carregando dados do sistema..." />;

  // ── Províncias ──
  if (layer.type === "provincias") return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notas do Sistema</h2><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecione uma província</p></div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {provincias.map(prov => (
          <CardBtn key={prov} icon="mdi:map-marker-radius" title={nomeProvinciaDeCodigo(prov)} subtitle={`${academiasNaProvincia(prov).length} academia(s)`} onClick={() => setLayer({ type: "academias", provincia: prov })} />
        ))}
      </div>
    </div>
  );

  // ── Academias de uma província ──
  if (layer.type === "academias") {
    const acads = academiasNaProvincia(layer.provincia);
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Província {nomeProvinciaDeCodigo(layer.provincia)}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {acads.map(a => (
            <CardBtn key={a.codigo_academia} icon={a.type === "superior" ? "mdi:university" : "mdi:school"} title={a.nome} subtitle={`${a.codigo_academia} · ${a.status === "ativo" ? "Activa" : "Inactiva"}`} badge={a.type}
              onClick={async () => {
                setLayer({ type: "academia_anos", academia: a });
                await carregarNotasAcademia(a);
              }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Anos lectivos de uma academia ──
  if (layer.type === "academia_anos") {
    const { academia } = layer;
    const notas = notasDeAcademia(academia.codigo_academia);
    const anos  = anosDeAcademia(academia.codigo_academia);
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">{academia.nome}</h2><p className="text-sm text-gray-500 mt-1">{academia.codigo_academia} · {academia.type === "superior" ? "Superior" : "Escola"}</p></div>
        {!loadingNotasAcad && notas.length > 0 && <StatsRow notas={notas} />}
        {loadingNotasAcad ? <Spinner label="Carregando notas da academia..." /> : anos.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">Nenhuma nota registada nesta academia.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {anos.map(ano => {
              const np = notas.filter(n => n.ano_lectivo === ano);
              const med = calcMedia(np);
              return <CardBtn key={ano} icon="mdi:calendar-school" title={`Ano ${ano.replace(/_/g, "/")}`} subtitle={`${np.length} nota(s)${med !== null ? ` · Média ${med.toFixed(1)}` : ""}`} onClick={() => setLayer({ type: "academia_periodos", academia, ano })} />;
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Períodos de um ano lectivo ──
  if (layer.type === "academia_periodos") {
    const { academia, ano } = layer;
    const notas    = notasDeAcademia(academia.codigo_academia).filter(n => n.ano_lectivo === ano);
    const periodos = periodosNoAno(academia.codigo_academia, ano);
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ano {ano.replace(/_/g, "/")}</h2>
        <StatsRow notas={notas} />
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Períodos</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {periodos.map(p => {
              const np = notas.filter(n => n.periodo === p);
              const med = calcMedia(np);
              return <CardBtn key={p} icon="mdi:clipboard-text-clock-outline" title={PERIODOS_LABEL[p] ?? p} subtitle={`${np.length} nota(s)${med !== null ? ` · Média ${med.toFixed(1)}` : ""}`} onClick={() => setLayer({ type: "academia_materias", academia, ano, periodo: p })} />;
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Matérias de um período ──
  if (layer.type === "academia_materias") {
    const { academia, ano, periodo } = layer;
    const materiasLista  = materiasNoAnoEPeriodo(academia.codigo_academia, ano, periodo);
    const notasPeriodo   = notasDeAcademia(academia.codigo_academia).filter(n => n.ano_lectivo === ano && n.periodo === periodo);
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">{PERIODOS_LABEL[periodo] ?? periodo} — Matérias</h2><p className="text-sm text-gray-500 mt-1">{academia.nome} · {ano.replace(/_/g, "/")}</p></div>
        {notasPeriodo.length > 0 && <StatsRow notas={notasPeriodo} />}
        {materiasLista.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><Icon icon="mdi:book-outline" width={48} className="mx-auto mb-3 opacity-40" /><p className="text-sm">Nenhuma matéria com notas neste período.</p></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {materiasLista.map(m => (
              <CardBtn key={m.id} icon="mdi:book-open-variant" title={m.nome} subtitle={m.notasCount > 0 ? `${m.notasCount} nota(s)${m.media !== null ? ` · Média ${m.media.toFixed(1)}` : ""}` : "Sem notas"} badge={m.notasCount === 0 ? "vazia" : undefined}
                onClick={() => setLayer({ type: "academia_notas", academia, ano, periodo, materiaId: m.id, materiaNome: m.nome })} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Notas de uma academia num período, filtradas por matéria ──
  if (layer.type === "academia_notas") {
    const { academia, ano, periodo, materiaId, materiaNome } = layer;
    const notas = notasDeAcademia(academia.codigo_academia).filter(
      n => n.ano_lectivo === ano && n.periodo === periodo && n.materia_disciplinar_id === materiaId
    );
    const isSup = isAcademiaSuperior(academia.codigo_academia);
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">{materiaNome}</h2><p className="text-sm text-gray-500 mt-1">{academia.nome} · {ano.replace(/_/g, "/")} · {PERIODOS_LABEL[periodo] ?? periodo}</p></div>
        {notas.length > 0 && <StatsRow notas={notas} />}
        {isSup
          ? <TabelaSuperior notas={notas} estudantesMap={estudantesMap} />
          : <TabelaEscolar  notas={notas} estudantesMap={estudantesMap} />
        }
      </div>
    );
  }

  return null;
}