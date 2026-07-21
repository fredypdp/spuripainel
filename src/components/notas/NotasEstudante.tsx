// src/components/notas/NotasEstudante.tsx
"use client"
import { useState, useEffect, useMemo } from "react";
import { academiaService, consultasService, tokenStorage, useApi } from "@/lib/api";
import { listarTodasAcademias } from "@/lib/api/pagination";
import type { CategoriaNotaItem, Materia, MeuPerfilResponse, Nota, Turma } from "@/types/api";
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
    nota_professor: "Nota do professor",
    prova_trimestral: "Prova do trimestre",
    exame_final: "Exame final",
    exame_recurso: "Exame de recurso",
    nota_pap: "Prova de Aptidão Profissional",
  };
  return m[c] ?? c.replace(/^nota_/, "").replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function notaText(n?: number | null): string {
  return n == null || n === 0 ? "" : String(n);
}

function corNota(n: number) {
  if (n >= 14) return "text-emerald-600 dark:text-emerald-400";
  if (n >= 10) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function sortAnosAcademicos(anos: string[]): string[] {
  return [...anos].sort((a, b) => {
    const ia = ORDEM_ANOS.indexOf(a), ib = ORDEM_ANOS.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1; if (ib === -1) return -1;
    return ia - ib;
  });
}

// ─── tipos ───────────────────────────────────────────────────────────────────

type AcadInfo = { codigo: string; nome: string; nivel: string; nivel_escolar?: string };

const ANOS_COM_NOTAS_REGULARES = [
  "1_ano_fundamental", "2_ano_fundamental", "3_ano_fundamental", "4_ano_fundamental",
  "5_ano_fundamental", "6_ano_fundamental", "7_ano_fundamental", "8_ano_fundamental",
  "9_ano_fundamental", "1_ano_medio", "2_ano_medio", "3_ano_medio",
];
const ANOS_COM_EXAME = ["6_ano_fundamental", "9_ano_fundamental", "3_ano_medio"];
const CATEGORIAS_ESCOLAR = [
  { value: "nota_professor", anos_academicos: ANOS_COM_NOTAS_REGULARES },
  { value: "prova_trimestral", anos_academicos: ANOS_COM_NOTAS_REGULARES },
  { value: "exame_final", anos_academicos: ANOS_COM_EXAME },
  { value: "exame_recurso", anos_academicos: ANOS_COM_EXAME },
  { value: "nota_pap", anos_academicos: ["4_ano_medio"] },
];

function categoriasEscolaresDoAno(anoAcademico: string, notas: Nota[]): string[] {
  const categoriasFixas = CATEGORIAS_ESCOLAR
    .filter(cat => cat.anos_academicos.includes(anoAcademico))
    .map(cat => cat.value);
  return Array.from(new Set([...categoriasFixas, ...notas.map(n => n.categoria)]));
}

function categoriasSuperioresDoAno(anoAcademico: string, notas: Nota[], categorias: CategoriaNotaItem[]): string[] {
  const categoriasConfiguradas = categorias
    .filter(cat => cat.status !== "inativo")
    .filter(cat => {
      const anos = cat.anos_academicos ?? [];
      return anos.length === 0 || anos.includes(anoAcademico);
    })
    .map(cat => cat.codigo);
  return Array.from(new Set([...categoriasConfiguradas, ...notas.map(n => n.categoria)]))
    .sort((a, b) => formatCategoria(a).localeCompare(formatCategoria(b), "pt", { sensitivity: "base" }));
}

type Layer =
  | { type: "academias" }
  | { type: "anos_letivos"; a: AcadInfo }
  | { type: "tipo_ensino"; a: AcadInfo; anoLetivo: string }
  | { type: "cursos"; a: AcadInfo; anoLetivo: string; tipoEnsino: "medio" | "superior" }
  | { type: "ano_academico"; a: AcadInfo; anoLetivo: string; tipoEnsino?: "fundamental" | "medio" | "superior"; cursoId?: string }
  | { type: "turmas"; a: AcadInfo; anoLetivo: string; anoAcademico: string; tipoEnsino?: "fundamental" | "medio" | "superior"; cursoId?: string }
  | { type: "periodos"; a: AcadInfo; anoLetivo: string; anoAcademico: string; turma: Turma; tipoEnsino?: "fundamental" | "medio" | "superior"; cursoId?: string }
  | { type: "periodo"; a: AcadInfo; anoLetivo: string; anoAcademico: string; periodo: string; turma?: Turma; tipoEnsino?: "fundamental" | "medio" | "superior"; cursoId?: string };

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

function StatsNotas({ notas }: { notas: Nota[] }) {
  if (!notas.length) return null;
  const media = notas.reduce((s, n) => s + n.nota, 0) / notas.length;
  const aprovadas = notas.filter(n => n.nota >= 10).length;
  return (
    <div className="flex flex-wrap gap-5 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
      <div><p className="text-xs text-gray-500 uppercase tracking-wide">Notas</p><p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{notas.length}</p></div>
      <div><p className="text-xs text-gray-500 uppercase tracking-wide">Média</p><p className={`text-2xl font-bold mt-0.5 ${corNota(media)}`}>{media.toFixed(1)}</p></div>
      <div><p className="text-xs text-gray-500 uppercase tracking-wide">Aprovações</p><p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{aprovadas}/{notas.length}</p></div>
    </div>
  );
}

function TabelaNotasEscolarEstudante({ notas, categoriasMap, materias = [], anoAcademico }: { notas: Nota[]; categoriasMap: Record<string, string>; materias?: Materia[]; anoAcademico: string }) {
  const porMateria = new Map<string, { nome: string; notas: Nota[] }>();
  materias.forEach(m => porMateria.set(m.id, { nome: m.nome, notas: [] }));
  notas.forEach(n => {
    const id = n.materia_disciplinar_id;
    if (!porMateria.has(id)) porMateria.set(id, { nome: n.materia_nome ?? id, notas: [] });
    porMateria.get(id)!.notas.push(n);
  });


  const categoriasOrdem = categoriasEscolaresDoAno(anoAcademico, notas);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Matéria Disciplinar</th>
            {categoriasOrdem.map((cat) => (
              <th key={cat} className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">{categoriasMap[cat] ?? formatCategoria(cat)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {porMateria.size === 0 && (
            <tr className="bg-white dark:bg-gray-800">
              <td className="px-4 py-6 text-gray-400 dark:text-gray-600" colSpan={categoriasOrdem.length + 1}></td>
            </tr>
          )}
          {Array.from(porMateria.entries()).sort((a, b) => a[1].nome.localeCompare(b[1].nome)).map(([, { nome, notas: nm }]) => {
            const notaProf  = nm.find(n => n.categoria === "nota_professor");
            const provaTrimestral = nm.find(n => n.categoria === "prova_trimestral");
            if (nm.length === 0) {
              return (
                <tr key={nome} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">{nome}</td>
                  {categoriasOrdem.map((cat) => (
                    <td key={cat} className="px-4 py-3 text-right font-bold text-gray-400 dark:text-gray-600"></td>
                  ))}
                </tr>
              );
            }
            if (!notaProf && !provaTrimestral) {
              return nm.map((n, i) => (
                <tr key={n.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                  {i === 0 && <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium" rowSpan={nm.length}>{nome}</td>}
                  <td className="px-4 py-3 text-right text-gray-400 dark:text-gray-600"></td>
                  <td className={`px-4 py-3 text-right font-bold ${corNota(n.nota)}`}>{notaText(n.nota)}</td>
                </tr>
              ));
            }
            return (
              <tr key={nome} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">{nome}</td>
                {categoriasOrdem.map((cat) => {
                  const notaCat = nm.find(n => n.categoria === cat);
                  return <td key={cat} className={`px-4 py-3 text-right font-bold ${notaCat ? corNota(notaCat.nota) : "text-gray-400 dark:text-gray-600"}`}>{notaText(notaCat?.nota)}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TabelaNotasSuperiorEstudante({ notas, materias = [], anoAcademico, categorias }: { notas: Nota[]; materias?: Materia[]; anoAcademico: string; categorias: CategoriaNotaItem[] }) {
  const porMateria = new Map<string, { nome: string; notas: Nota[] }>();
  materias.forEach(m => porMateria.set(m.id, { nome: m.nome, notas: [] }));
  notas.forEach(n => {
    const id = n.materia_disciplinar_id;
    if (!porMateria.has(id)) porMateria.set(id, { nome: n.materia_nome ?? id, notas: [] });
    porMateria.get(id)!.notas.push(n);
  });

  const categoriasOrdem = categoriasSuperioresDoAno(anoAcademico, notas, categorias);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Matéria Disciplinar</th>
            {categoriasOrdem.map((cat) => (
              <th key={cat} className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">{formatCategoria(cat)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {porMateria.size === 0 && (
            <tr className="bg-white dark:bg-gray-800">
              <td className="px-4 py-6 text-gray-400 dark:text-gray-600" colSpan={categoriasOrdem.length + 1}></td>
            </tr>
          )}
          {Array.from(porMateria.entries()).sort((a, b) => a[1].nome.localeCompare(b[1].nome)).map(([, { nome, notas: nm }]) => (
            <tr key={nome} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">{nome}</td>
              {categoriasOrdem.map((cat) => {
                const notaCat = nm.find(n => n.categoria === cat);
                return <td key={cat} className={`px-4 py-3 text-right font-bold ${notaCat ? corNota(notaCat.nota) : "text-gray-400 dark:text-gray-600"}`}>{notaText(notaCat?.nota)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── componente principal ────────────────────────────────────────────────────

export default function NotasEstudante() {
  const [user]  = useState<MeuPerfilResponse | null>(getUserFromCookie);
  const [layer, setLayer] = useState<Layer>({ type: "academias" });
  const [loadingLayer, setLoadingLayer] = useState(false);
  const [categoriasPorAcademia, setCategoriasPorAcademia] = useState<Record<string, CategoriaNotaItem[]>>({});
  const token = tokenStorage.get() ?? undefined;
  const codigoEstudante = user?.estudante?.codigo_estudante ?? "";

  const { data: historico, execute: carregarNotas, loading } = useApi(consultasService.notasEstudante);
  const { data: acadList, execute: carregarAcademias } = useApi(listarTodasAcademias);
  const { data: turmasData, execute: carregarTurmas } = useApi(consultasService.turmasEstudante);
  const { data: materiasData, execute: carregarMaterias } = useApi(academiaService.listarMaterias);

  useEffect(() => {
    if (codigoEstudante) {
      carregarNotas(codigoEstudante, token);
      carregarAcademias({ token, limit: 50, offset: 0 });
      carregarTurmas(codigoEstudante, token);
      const academiaCodigo = user?.estudante?.academia_info?.codigo ?? user?.estudante?.academia?.codigo;
      if (academiaCodigo) carregarMaterias({ codigo_academia: academiaCodigo, token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoEstudante]);

  const todasNotas: Nota[] = useMemo(() => historico?.notas ?? [], [historico]);
  const turmas: Turma[] = useMemo(() => (turmasData as any)?.turmas ?? [], [turmasData]);
  const materias: Materia[] = useMemo(() => ((materiasData as any)?.materias ?? []).filter((m: Materia) => m.status === "ativo"), [materiasData]);
  const categoriasMap = useMemo<Record<string, string>>(() => ({}), []);

  // Académias únicas nas notas
  const academias = useMemo((): AcadInfo[] => {
    const map = new Map<string, AcadInfo>();
    const perfilAcademia = user?.estudante?.academia_info ?? user?.estudante?.academia;
    if (perfilAcademia?.codigo) {
      const info = (acadList as any)?.academias?.find((a: any) => a.codigo_academia === perfilAcademia.codigo);
      map.set(perfilAcademia.codigo, {
        codigo: perfilAcademia.codigo,
        nome: perfilAcademia.nome ?? info?.nome ?? perfilAcademia.codigo,
        nivel: perfilAcademia.nivel ?? info?.nivel ?? "escola",
        nivel_escolar: (perfilAcademia as any).nivel_escolar ?? info?.nivel_escolar,
      });
    }
    todasNotas.forEach(n => {
      if (!map.has(n.codigo_academia)) {
        const info = (acadList as any)?.academias?.find((a: any) => a.codigo_academia === n.codigo_academia);
        map.set(n.codigo_academia, {
          codigo: n.codigo_academia,
          nome: info?.nome ?? n.codigo_academia,
          nivel: info?.nivel ?? "escola",
          nivel_escolar: info?.nivel_escolar,
        });
      }
    });
    return Array.from(map.values());
  }, [todasNotas, acadList, user]);

  const notasDe = (codigoAcad: string) => todasNotas.filter(n => n.codigo_academia === codigoAcad);

  const nivelDoTipo = (nivel: string, tipo?: "fundamental" | "medio" | "superior") => {
    if (!tipo) return true;
    return nivel.includes(tipo);
  };

  const turmasDoContexto = (codigoAcad: string, anoLetivo: string, anoAcademico: string, tipoEnsino?: "fundamental" | "medio" | "superior", cursoId?: string) => turmas.filter(t => {
    const estudantesAno = t.historico_estudantes_ano_letivo?.[anoLetivo] ?? t.estudantes ?? [];
    if (t.codigo_academia !== codigoAcad || t.nivel !== anoAcademico || !estudantesAno.includes(codigoEstudante)) return false;
    if (!nivelDoTipo(t.nivel, tipoEnsino)) return false;
    if (cursoId && t.curso_id !== cursoId) return false;
    return true;
  });

  const cursosDaAcademia = (codigoAcad: string, anoLetivo: string, tipoEnsino: "medio" | "superior") => Array.from(new Set(
    turmas
      .filter(t => t.codigo_academia === codigoAcad && nivelDoTipo(t.nivel, tipoEnsino) && ((t.historico_estudantes_ano_letivo?.[anoLetivo] ?? t.estudantes ?? []).includes(codigoEstudante)))
      .map(t => t.curso_id)
      .filter(Boolean) as string[]
  )).sort();

  const proximaLayerAnoLetivo = (a: AcadInfo, anoLetivo: string): Layer => {
    if (a.nivel === "superior") return { type: "cursos", a, anoLetivo, tipoEnsino: "superior" };
    if (a.nivel_escolar === "misto") return { type: "tipo_ensino", a, anoLetivo };
    if (a.nivel_escolar === "medio") return { type: "cursos", a, anoLetivo, tipoEnsino: "medio" };
    return { type: "ano_academico", a, anoLetivo, tipoEnsino: "fundamental" };
  };

  // Anos letivos de uma academia
  const anosLetivosDe = (codigoAcad: string) => {
    const anosNotas = notasDe(codigoAcad).map(n => n.ano_lectivo).filter(Boolean);
    const anosTurmas = turmas.flatMap(t => Object.keys(t.historico_estudantes_ano_letivo ?? {}));
    const anos = Array.from(new Set([...anosNotas, ...anosTurmas]));
    return anos.sort();
  };

  // Anos académicos dentro de um ano letivo
  const anosAcademicosDe = (codigoAcad: string, anoLetivo: string) => {
    const notas = notasDe(codigoAcad).filter(n => n.ano_lectivo === anoLetivo);
    const anosNotas = notas.map(n => n.ano_academico).filter(Boolean);
    const anosTurmas = turmas
      .filter(t => t.codigo_academia === codigoAcad && ((t.historico_estudantes_ano_letivo?.[anoLetivo] ?? t.estudantes ?? []).includes(codigoEstudante)))
      .map(t => t.nivel);
    return sortAnosAcademicos(Array.from(new Set([...anosNotas, ...anosTurmas])) as string[]);
  };

  const navegar = async (novaLayer: Layer) => {
    setLoadingLayer(true);
    if (novaLayer.type === "periodo" && novaLayer.a.nivel === "superior" && !categoriasPorAcademia[novaLayer.a.codigo]) {
      try {
        const res = await academiaService.listarCategoriasNota({ codigo_academia: novaLayer.a.codigo, token });
        setCategoriasPorAcademia(prev => ({ ...prev, [novaLayer.a.codigo]: res?.categorias ?? [] }));
      } catch {
        setCategoriasPorAcademia(prev => ({ ...prev, [novaLayer.a.codigo]: [] }));
      }
    }
    await new Promise(r => setTimeout(r, 80));
    setLayer(novaLayer);
    setLoadingLayer(false);
  };

  // Breadcrumbs
  const crumbs = useMemo(() => {
    const base = { label: "Academias", onClick: () => setLayer({ type: "academias" }) };
    if (layer.type === "academias")    return [base];
    if (layer.type === "anos_letivos") return [base, { label: layer.a.nome }];
    if (layer.type === "tipo_ensino") return [base, { label: layer.a.nome, onClick: () => setLayer({ type: "anos_letivos", a: layer.a }) }, { label: layer.anoLetivo.replace("_", "/") }];
    if (layer.type === "cursos") return [base, { label: layer.a.nome, onClick: () => setLayer({ type: "anos_letivos", a: layer.a }) }, { label: layer.anoLetivo.replace("_", "/") }, { label: layer.tipoEnsino === "superior" ? "Ensino Superior" : "Ensino Médio" }];
    if (layer.type === "ano_academico") return [
      base,
      { label: layer.a.nome, onClick: () => setLayer({ type: "anos_letivos", a: layer.a }) },
      { label: layer.anoLetivo.replace("_", "/") },
    ];
    if (layer.type === "turmas") return [
      base,
      { label: layer.a.nome, onClick: () => setLayer({ type: "anos_letivos", a: layer.a }) },
      { label: layer.anoLetivo.replace("_", "/"), onClick: () => setLayer({ type: "ano_academico", a: layer.a, anoLetivo: layer.anoLetivo, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId }) },
      { label: labelNivel(layer.anoAcademico) },
    ];
    if (layer.type === "periodos") return [
      base,
      { label: layer.a.nome, onClick: () => setLayer({ type: "anos_letivos", a: layer.a }) },
      { label: layer.anoLetivo.replace("_", "/"), onClick: () => setLayer({ type: "ano_academico", a: layer.a, anoLetivo: layer.anoLetivo, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId }) },
      { label: labelNivel(layer.anoAcademico), onClick: () => setLayer({ type: "turmas", a: layer.a, anoLetivo: layer.anoLetivo, anoAcademico: layer.anoAcademico, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId }) },
      { label: `Turma ${layer.turma.codigo_turma}` },
    ];
    if (layer.type === "periodo") return [
      base,
      { label: layer.a.nome, onClick: () => setLayer({ type: "anos_letivos", a: layer.a }) },
      { label: layer.anoLetivo.replace("_", "/"), onClick: () => setLayer({ type: "ano_academico", a: layer.a, anoLetivo: layer.anoLetivo, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId }) },
      { label: labelNivel(layer.anoAcademico), onClick: () => setLayer({ type: "turmas", a: layer.a, anoLetivo: layer.anoLetivo, anoAcademico: layer.anoAcademico, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId }) },
      { label: PERIODOS_LABEL[layer.periodo] ?? layer.periodo },
    ];
    return [base];
  }, [layer]);

  const canGoBack = () => layer.type !== "academias";

  const goBack = () => {
    if (layer.type === "anos_letivos") return setLayer({ type: "academias" });
    if (layer.type === "tipo_ensino") return setLayer({ type: "anos_letivos", a: layer.a });
    if (layer.type === "cursos") return setLayer(layer.a.nivel_escolar === "misto" ? { type: "tipo_ensino", a: layer.a, anoLetivo: layer.anoLetivo } : { type: "anos_letivos", a: layer.a });
    if (layer.type === "ano_academico") return setLayer(layer.a.nivel_escolar === "misto" ? { type: "tipo_ensino", a: layer.a, anoLetivo: layer.anoLetivo } : { type: "anos_letivos", a: layer.a });
    if (layer.type === "turmas") return setLayer({ type: "ano_academico", a: layer.a, anoLetivo: layer.anoLetivo, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId });
    if (layer.type === "periodos") return setLayer({ type: "turmas", a: layer.a, anoLetivo: layer.anoLetivo, anoAcademico: layer.anoAcademico, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId });
    if (layer.type === "periodo" && layer.turma) return setLayer({ type: "periodos", a: layer.a, anoLetivo: layer.anoLetivo, anoAcademico: layer.anoAcademico, turma: layer.turma, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId });
    if (layer.type === "periodo") return setLayer({ type: "turmas", a: layer.a, anoLetivo: layer.anoLetivo, anoAcademico: layer.anoAcademico, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId });
  };

  const BotaoVoltar = canGoBack() ? (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300 mb-4"
    >
      <Icon icon="mdi:arrow-left" width={18} />
      Voltar para estudantes
    </button>
  ) : null;

  if (loading) return <LoadingSpinner message="Carregando notas..." />;

  // ── Academias ──
  if (layer.type === "academias") return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Minhas Notas</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecione uma academia</p>
      </div>
      {academias.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Icon icon="mdi:notebook-outline" width={48} className="mx-auto mb-3 opacity-40" />
          <p>Nenhuma nota registada ainda.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {academias.map(a => {
            const nts = notasDe(a.codigo);
            const anos = anosLetivosDe(a.codigo);
            return (
              <CardBtn
                key={a.codigo}
                icon={a.nivel === "superior" ? "mdi:university" : "mdi:school"}
                title={a.nome}
                subtitle={`${nts.length} nota(s) · ${anos.length} ano(s) letivo(s)`}
                onClick={() => setLayer({ type: "anos_letivos", a })}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Anos letivos ──
  if (layer.type === "anos_letivos") {
    const { a } = layer;
    const anos = anosLetivosDe(a.codigo);
    return (
      <div className="space-y-6">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{a.nome}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecione o ano letivo</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {anos.map(anoLetivo => {
            const np = notasDe(a.codigo).filter(n => n.ano_lectivo === anoLetivo);
            return (
              <CardBtn
                key={anoLetivo}
                icon="mdi:calendar-school"
                title={`${anoLetivo.replace("_", "/")}`}
                subtitle={`${np.length} nota(s)`}
                badge={anoLetivo === anos[0] ? "actual" : undefined}
                onClick={() => setLayer(proximaLayerAnoLetivo(a, anoLetivo))}
              />
            );
          })}
        </div>
      </div>
    );
  }


  // ── Tipo de ensino ──
  if (layer.type === "tipo_ensino") {
    return (
      <div className="space-y-6">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">{layer.a.nome}</h2><p className="text-sm text-gray-500 mt-1">Selecione o tipo de ensino</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CardBtn icon="mdi:school" title="Ensino Fundamental" subtitle="Selecione o ano acadêmico" onClick={() => navegar({ type: "ano_academico", a: layer.a, anoLetivo: layer.anoLetivo, tipoEnsino: "fundamental" })} />
          <CardBtn icon="mdi:book-education" title="Ensino Médio" subtitle="Selecione o curso" onClick={() => navegar({ type: "cursos", a: layer.a, anoLetivo: layer.anoLetivo, tipoEnsino: "medio" })} />
        </div>
      </div>
    );
  }

  // ── Cursos ──
  if (layer.type === "cursos") {
    const cursos = cursosDaAcademia(layer.a.codigo, layer.anoLetivo, layer.tipoEnsino);
    return (
      <div className="space-y-6">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">Selecione o curso</h2><p className="text-sm text-gray-500 mt-1">{layer.a.nome} · {layer.anoLetivo.replace("_", "/")}</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {cursos.map(cursoId => <CardBtn key={cursoId} icon="mdi:book-education" title={cursoId} onClick={() => navegar({ type: "ano_academico", a: layer.a, anoLetivo: layer.anoLetivo, tipoEnsino: layer.tipoEnsino, cursoId })} />)}
        </div>
      </div>
    );
  }

  // ── Ano Académico ──
  if (layer.type === "ano_academico") {
    const { a, anoLetivo } = layer;
    const anosAcademicos = anosAcademicosDe(a.codigo, anoLetivo).filter(ano => nivelDoTipo(ano, layer.tipoEnsino));
    const notasAno = notasDe(a.codigo).filter(n => n.ano_lectivo === anoLetivo);
    return (
      <div className="space-y-6">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ano Letivo {anoLetivo.replace("_", "/")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{a.nome}</p>
        </div>
        {notasAno.length > 0 && <StatsNotas notas={notasAno} />}
        <div className="grid gap-3 sm:grid-cols-2">
          {anosAcademicos.map(anoAcad => {
            const np = notasAno.filter(n => n.ano_academico === anoAcad);
            return (
              <CardBtn
                key={anoAcad}
                icon="mdi:numeric"
                title={labelNivel(anoAcad)}
                subtitle={`${np.length} nota(s)`}
                onClick={() => navegar({ type: "turmas", a, anoLetivo, anoAcademico: anoAcad, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId })}
              />
            );
          })}
        </div>
      </div>
    );
  }


  // ── Turmas ──
  if (layer.type === "turmas") {
    const turmasCtx = turmasDoContexto(layer.a.codigo, layer.anoLetivo, layer.anoAcademico, layer.tipoEnsino, layer.cursoId);
    return (
      <div className="space-y-6">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labelNivel(layer.anoAcademico)}</h2><p className="text-sm text-gray-500 mt-1">Selecione a turma</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {turmasCtx.map(t => <CardBtn key={t.codigo_turma} icon="mdi:account-group" title={`Turma ${t.codigo_turma}`} subtitle={t.turno} onClick={() => navegar({ type: "periodos", a: layer.a, anoLetivo: layer.anoLetivo, anoAcademico: layer.anoAcademico, turma: t, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId })} />)}
        </div>
      </div>
    );
  }


  // ── Períodos ──
  if (layer.type === "periodos") {
    const notasAno = notasDe(layer.a.codigo).filter(n => n.ano_lectivo === layer.anoLetivo && n.ano_academico === layer.anoAcademico);
    const periodosNotas = Array.from(new Set(notasAno.map(n => n.periodo)));
    const periodos = (periodosNotas.length > 0 ? periodosNotas : (layer.a.nivel === "superior" ? ["1_semestre", "2_semestre"] : ["1_trimestre", "2_trimestre", "3_trimestre"])).sort((x, y) => ORDEM_PERIODOS.indexOf(x) - ORDEM_PERIODOS.indexOf(y));
    return (
      <div className="space-y-6">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">Turma {layer.turma.codigo_turma}</h2><p className="text-sm text-gray-500 mt-1">Selecione o período</p></div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {periodos.map(p => <CardBtn key={p} icon="mdi:calendar-range" title={PERIODOS_LABEL[p] ?? p} onClick={() => navegar({ type: "periodo", a: layer.a, anoLetivo: layer.anoLetivo, anoAcademico: layer.anoAcademico, periodo: p, turma: layer.turma, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId })} />)}
        </div>
      </div>
    );
  }

  // ── Período ──
  if (layer.type === "periodo") {
    const { a, anoLetivo, anoAcademico, periodo } = layer;
    const notasAno  = notasDe(a.codigo).filter(n => n.ano_lectivo === anoLetivo && n.ano_academico === anoAcademico);
    const periodosNotas = Array.from(new Set(notasAno.map(n => n.periodo)));
    const periodos  = (periodosNotas.length > 0 ? periodosNotas : (a.nivel === "superior" ? ["1_semestre", "2_semestre"] : ["1_trimestre", "2_trimestre", "3_trimestre"])).sort((x, y) => ORDEM_PERIODOS.indexOf(x) - ORDEM_PERIODOS.indexOf(y));
    const notas     = notasAno.filter(n => n.periodo === periodo);
    const isSup     = a.nivel === "superior" || notas.some(n => n.tipo === "superior");
    const materiasPeriodo = materias.filter(m =>
      (m.anos_academicos ?? []).includes(anoAcademico) &&
      (!isSup || !m.periodo || m.periodo === periodo)
    );

    return (
      <div className="space-y-6">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{PERIODOS_LABEL[periodo] ?? periodo}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{a.nome} · {anoLetivo.replace("_", "/")} · {labelNivel(anoAcademico)}</p>
        </div>

        {/* Selector de período quando há múltiplos */}
        {periodos.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {periodos.map(p => (
              <button
                key={p}
                onClick={() => navegar({ type: "periodo", a, anoLetivo, anoAcademico, periodo: p, turma: layer.turma, tipoEnsino: layer.tipoEnsino, cursoId: layer.cursoId })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  p === periodo
                    ? "bg-brand-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {PERIODOS_LABEL[p] ?? p}
              </button>
            ))}
          </div>
        )}

        {notas.length > 0 && <StatsNotas notas={notas} />}

        {loadingLayer
          ? <LoadingSpinner message="Carregando notas..." />
          : isSup
            ? <TabelaNotasSuperiorEstudante notas={notas} materias={materiasPeriodo} anoAcademico={anoAcademico} categorias={categoriasPorAcademia[a.codigo] ?? []} />
            : <TabelaNotasEscolarEstudante notas={notas} categoriasMap={categoriasMap} materias={materiasPeriodo} anoAcademico={anoAcademico} />
        }
      </div>
    );
  }

  return null;
}
