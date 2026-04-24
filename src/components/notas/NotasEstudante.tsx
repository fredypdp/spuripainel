// src/components/notas/NotasEstudante.tsx
"use client"
import { useState, useEffect, useMemo } from "react";
import { consultasService, tokenStorage, useApi } from "@/lib/api";
import type { MeuPerfilResponse, Nota } from "@/types/api";
import Icon from "@/components/ui/Icon";
import { getCookie } from "@/lib/utils/cookies";

// ─── helpers ────────────────────────────────────────────────────────────────

function getUserFromCookie(): MeuPerfilResponse | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(getCookie("user") ?? ""); } catch { return null; }
}

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

/**
 * Retorna label explícito do nível académico.
 * - Fundamental: "1º Ano do Ensino Fundamental"
 * - Médio:       "1º Ano do Ensino Médio"
 * - Superior:    "1º Ano" (formato original)
 */
function labelNivel(v: string): string {
  const match = v.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!match) return v.replace(/_/g, " ");
  const [, n, tipo] = match;
  if (tipo === "fundamental") return `${n}º Ano do Ensino Fundamental`;
  if (tipo === "medio")       return `${n}º Ano do Ensino Médio`;
  return `${n}º Ano`;
}

function formatCategoria(c: string) {
  const m: Record<string, string> = {
    nota_escola: "Nota Escola",
    nota_professor: "Nota do Professor",
    nota_pp1: "PP1",
    nota_pp2: "PP2",
    nota_exame: "Exame",
  };
  return m[c] ?? c.replace(/^nota_/, "").replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function corNota(n: number) {
  if (n >= 14) return "text-emerald-600 dark:text-emerald-400";
  if (n >= 10) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
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

// ─── tipos ───────────────────────────────────────────────────────────────────

type AcadInfo = { codigo: string; nome: string; type: string; nivel_escolar?: string };

type Layer =
  | { type: "academias" }
  | { type: "academia"; a: AcadInfo }
  | { type: "ano"; a: AcadInfo; ano: string }
  | { type: "periodo"; a: AcadInfo; ano: string; periodo: string };

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
  icon: string; title: string; subtitle?: string; badge?: string; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-300 hover:shadow-sm transition-all text-left">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
        <Icon icon={icon} width={22} className="text-brand-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {badge && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize">{badge}</span>}
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

/**
 * Tabela para visão do estudante — escolar.
 * Colunas: Matéria Disciplinar | Nota do Professor | Nota Escola
 * Sem médias.
 */
function TabelaNotasEscolarEstudante({
  notas,
}: {
  notas: Nota[];
}) {
  if (!notas.length) return (
    <div className="text-center py-12 text-gray-400">
      <Icon icon="mdi:notebook-outline" width={40} className="mx-auto mb-2 opacity-50" />
      <p className="text-sm">Nenhuma nota neste período.</p>
    </div>
  );

  // Agrupa por matéria
  const porMateria = new Map<string, { nome: string; notas: Nota[] }>();
  notas.forEach(n => {
    const id = n.materia_disciplinar_id;
    if (!porMateria.has(id)) porMateria.set(id, { nome: n.materia_nome ?? id, notas: [] });
    porMateria.get(id)!.notas.push(n);
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Matéria Disciplinar</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Nota do Professor</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Nota Escola</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {Array.from(porMateria.entries()).map(([, { nome, notas: nm }]) => {
            const notaProf = nm.find(n => n.categoria === "nota_professor");
            const notaFinal = nm.find(n => n.categoria === "nota_escola");

            // Fallback: categorias não padrão — exibir uma linha por nota
            if (!notaProf && !notaFinal) {
              return nm.map((n, i) => (
                <tr key={n.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                  {i === 0 && (
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium" rowSpan={nm.length}>{nome}</td>
                  )}
                  <td className="px-4 py-3 text-right text-gray-400 dark:text-gray-600">—</td>
                  <td className={`px-4 py-3 text-right font-bold ${corNota(n.nota)}`}>{n.nota}</td>
                </tr>
              ));
            }

            return (
              <tr key={nome} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">{nome}</td>
                <td className={`px-4 py-3 text-right font-bold ${notaProf ? corNota(notaProf.nota) : "text-gray-400 dark:text-gray-600"}`}>
                  {notaProf?.nota ?? "—"}
                </td>
                <td className={`px-4 py-3 text-right font-bold ${notaFinal ? corNota(notaFinal.nota) : "text-gray-400 dark:text-gray-600"}`}>
                  {notaFinal?.nota ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Tabela para visão do estudante — superior.
 * Colunas: Matéria Disciplinar | Categoria | Nota
 * Sem médias.
 */
function TabelaNotasSuperiorEstudante({
  notas,
}: {
  notas: Nota[];
}) {
  if (!notas.length) return (
    <div className="text-center py-12 text-gray-400">
      <Icon icon="mdi:notebook-outline" width={40} className="mx-auto mb-2 opacity-50" />
      <p className="text-sm">Nenhuma nota neste período.</p>
    </div>
  );

  const porMateria = new Map<string, { nome: string; notas: Nota[] }>();
  notas.forEach(n => {
    const id = n.materia_disciplinar_id;
    if (!porMateria.has(id)) porMateria.set(id, { nome: n.materia_nome ?? id, notas: [] });
    porMateria.get(id)!.notas.push(n);
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Matéria Disciplinar</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Categoria</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Nota</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {Array.from(porMateria.entries()).map(([, { nome, notas: nm }]) =>
            nm.map((n, i) => (
              <tr key={n.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                {i === 0 && (
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium" rowSpan={nm.length}>{nome}</td>
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

export default function NotasEstudante() {
  const [user] = useState<MeuPerfilResponse | null>(getUserFromCookie);
  const [layer, setLayer] = useState<Layer>({ type: "academias" });
  const [loadingLayer, setLoadingLayer] = useState(false);
  const token = tokenStorage.get() ?? undefined;
  const codigoEstudante = user?.estudante?.codigo_estudante ?? "";

  const { data: historico, execute: carregarNotas, loading } = useApi(consultasService.notasEstudante);
  const { data: acadList, execute: carregarAcademias } = useApi(consultasService.listarAcademias);

  useEffect(() => {
    if (codigoEstudante) {
      carregarNotas(codigoEstudante, token);
      carregarAcademias(token);
    }
  }, [codigoEstudante]); // eslint-disable-line react-hooks/exhaustive-deps

  const todasNotas: Nota[] = historico?.notas ?? [];

  // Academias únicas nas notas
  const academias = useMemo((): AcadInfo[] => {
    const map = new Map<string, AcadInfo>();
    todasNotas.forEach(n => {
      if (!map.has(n.codigo_academia)) {
        const info = (acadList as any)?.academias?.find((a: any) => a.codigo_academia === n.codigo_academia);
        map.set(n.codigo_academia, {
          codigo: n.codigo_academia,
          nome: info?.nome ?? n.codigo_academia,
          type: info?.type ?? "escola",
          nivel_escolar: info?.nivel_escolar ?? undefined,
        });
      }
    });
    return Array.from(map.values());
  }, [todasNotas, acadList]);

  const notasDe = (codigo: string) => todasNotas.filter(n => n.codigo_academia === codigo);

  // Navega para nova camada mostrando spinner durante a transição
  const navegar = async (novaLayer: Layer) => {
    setLoadingLayer(true);
    await new Promise(r => setTimeout(r, 80));
    setLayer(novaLayer);
    setLoadingLayer(false);
  };

  // breadcrumbs
  const crumbs = useMemo(() => {
    const base = { label: "Academias", onClick: () => setLayer({ type: "academias" }) };
    if (layer.type === "academias") return [base];
    if (layer.type === "academia") return [base, { label: layer.a.nome }];
    if (layer.type === "ano") return [
      base,
      { label: layer.a.nome, onClick: () => setLayer({ type: "academia", a: layer.a }) },
      { label: labelNivel(layer.ano) },
    ];
    if (layer.type === "periodo") return [
      base,
      { label: layer.a.nome, onClick: () => setLayer({ type: "academia", a: layer.a }) },
      { label: labelNivel(layer.ano), onClick: () => setLayer({ type: "ano", a: layer.a, ano: layer.ano }) },
      { label: PERIODOS_LABEL[layer.periodo] ?? layer.periodo },
    ];
    return [base];
  }, [layer]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
    </div>
  );

  // ── Academias ──
  if (layer.type === "academias") return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Minhas Notas</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecione uma academia</p>
      </div>
      {academias.length === 0
        ? (
          <div className="text-center py-16 text-gray-400">
            <Icon icon="mdi:notebook-outline" width={48} className="mx-auto mb-3 opacity-40" />
            <p>Nenhuma nota registada ainda.</p>
          </div>
        )
        : (
          <div className="grid gap-3 sm:grid-cols-2">
            {academias.map(a => {
              const nts = notasDe(a.codigo);
              return (
                <CardBtn
                  key={a.codigo}
                  icon={a.type === "superior" ? "mdi:university" : "mdi:school"}
                  title={a.nome}
                  subtitle={`${nts.length} nota(s)`}
                  onClick={() => setLayer({ type: "academia", a })}
                />
              );
            })}
          </div>
        )
      }
    </div>
  );

  // ── Academia ──
  if (layer.type === "academia") {
    const notas = notasDe(layer.a.codigo);
    const anosAcademicos = sortAnosAcademicos(
      Array.from(new Set(notas.map(n => n.ano_academico).filter(Boolean))) as string[]
    );
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={crumbs} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{layer.a.nome}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{layer.a.codigo}</p>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Ano</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {anosAcademicos.map(anoAcademico => {
              const np = notas.filter(n => n.ano_academico === anoAcademico);
              return (
                <CardBtn
                  key={anoAcademico}
                  icon="mdi:numeric"
                  title={labelNivel(anoAcademico)}
                  subtitle={`${np.length} nota(s)`}
                  onClick={() => setLayer({ type: "ano", a: layer.a, ano: anoAcademico })}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Ano Académico ──
  if (layer.type === "ano") {
    const notas = notasDe(layer.a.codigo).filter(n => n.ano_academico === layer.ano);
    const periodos = Array.from(new Set(notas.map(n => n.periodo))).sort(
      (a, b) => ORDEM_PERIODOS.indexOf(a) - ORDEM_PERIODOS.indexOf(b)
    );
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={crumbs} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labelNivel(layer.ano)}</h2>
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Períodos</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {periodos.map(p => {
              const np = notas.filter(n => n.periodo === p);
              return (
                <CardBtn
                  key={p}
                  icon="mdi:clipboard-text-clock-outline"
                  title={PERIODOS_LABEL[p] ?? p}
                  subtitle={`${np.length} nota(s)`}
                  onClick={() => navegar({ type: "periodo", a: layer.a, ano: layer.ano, periodo: p })}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Período ──
  if (layer.type === "periodo") {
    const notas = notasDe(layer.a.codigo).filter(
      n => n.ano_academico === layer.ano && n.periodo === layer.periodo
    );
    const isSup = layer.a.type === "superior" || notas.some(n => n.tipo === "superior");

    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={crumbs} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {PERIODOS_LABEL[layer.periodo] ?? layer.periodo}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {layer.a.nome} · {labelNivel(layer.ano)}
          </p>
        </div>
        {loadingLayer
          ? <LoadingSpinner message="Carregando notas..." />
          : (
            isSup
              ? <TabelaNotasSuperiorEstudante notas={notas} />
              : <TabelaNotasEscolarEstudante notas={notas} />
          )
        }
      </div>
    );
  }

  return null;
}
