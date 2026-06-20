"use client";

import React, { useEffect, useMemo, useState } from "react";
import { academiaService } from "@/lib/api/services";
import { useApi } from "@/hooks/useApi";
import { useUserType } from "@/hooks/useRoutePermission";
import Icon from "@/components/ui/Icon";
import type { TipoEnsino } from "@/types/api";

const ESCOLAR_PERIODOS = ["1_trimestre", "2_trimestre", "3_trimestre"];
type FormulaItem = { kind: "ref"; categoria: string; periodo: string } | { kind: "const"; valor: string } | { kind: "op"; op: "+" | "-" | "*" | "/" } | { kind: "paren"; value: "(" | ")" };

function labelNivel(v: string) {
  if (v.includes("semestre")) return `${v.split("_")[0]}.º Semestre`;
  const [numero, , nivel] = v.split("_");
  return `${numero}.º ${nivel === "fundamental" ? "Fundamental" : nivel === "medio" ? "Médio" : "Superior"}`;
}

function labelPeriodo(v: string) {
  if (v.includes("trimestre")) return `${v.split("_")[0]}.º trimestre`;
  return labelNivel(v);
}

function labelTipo(v: TipoEnsino) {
  return v === "fundamental" ? "Ensino fundamental" : v === "medio" ? "Ensino médio" : "Ensino superior";
}

function labelFormula(formula: string): string {
  return formula || "Fórmula não informada";
}

function sortNiveis(niveis: string[]) {
  return [...new Set(niveis)].sort((a, b) => {
    const na = Number(a.split("_")[0]);
    const nb = Number(b.split("_")[0]);
    if (a.includes("fundamental") !== b.includes("fundamental")) return a.includes("fundamental") ? -1 : 1;
    if (a.includes("medio") !== b.includes("medio")) return a.includes("medio") ? -1 : 1;
    return na - nb;
  });
}

function itemText(item: FormulaItem) {
  if (item.kind === "op") return item.op;
  if (item.kind === "const") return item.valor;
  if (item.kind === "paren") return item.value;
  return `[${item.categoria},${item.periodo}]`;
}

function formulaText(items: FormulaItem[]) {
  return items.map(itemText).join("");
}

export default function AvaliacaoFinalRulesSection() {
  const { user } = useUserType();
  const academia = user?.academia;
  const isSuperior = academia?.nivel === "superior";
  const isMista = academia?.nivel === "escola" && academia?.nivel_escolar === "misto";
  const tipoFixo = isSuperior ? "superior" : academia?.nivel_escolar === "medio" ? "medio" : "fundamental";

  const [tipoEnsino, setTipoEnsino] = useState<TipoEnsino>("fundamental");
  const tipoSelecionado: TipoEnsino = isMista ? tipoEnsino : tipoFixo;
  const [type, setType] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [notaMinima, setNotaMinima] = useState("");
  const [anos, setAnos] = useState<Set<string>>(new Set());
  const [dependencia, setDependencia] = useState("");
  const [formulaItems, setFormulaItems] = useState<FormulaItem[]>([]);
  const [draftCategoria, setDraftCategoria] = useState("");
  const [draftPeriodo, setDraftPeriodo] = useState("");
  const [draftConstante, setDraftConstante] = useState("");
  const [sucesso, setSucesso] = useState<string | null>(null);

  const { data: regrasData, loading, execute: listarRegras } = useApi(academiaService.listarRegrasAvaliacaoFinal);
  const { data: categoriasData, execute: listarCategorias } = useApi(academiaService.listarCategoriasNota);
  const { data: cursosData, execute: listarCursos } = useApi(academiaService.listarCursos);
  const { loading: criando, error, execute: criarRegra } = useApi(academiaService.criarRegraAvaliacaoFinal);

  useEffect(() => { listarRegras().catch(() => undefined); listarCategorias().catch(() => undefined); listarCursos().catch(() => undefined); }, [listarRegras, listarCategorias, listarCursos]);
  const opcoesNiveis = useMemo(() => {
    const cursos = (cursosData?.cursos ?? []).filter((c) => c.status === "ativo");
    if (tipoSelecionado === "fundamental") return sortNiveis(academia?.anos_academicos?.length ? academia.anos_academicos.filter((a) => a.includes("fundamental")) : Array.from({ length: 9 }, (_, i) => `${i + 1}_ano_fundamental`));
    if (tipoSelecionado === "medio") return sortNiveis(cursos.filter((c) => c.type === "medio").flatMap((c) => c.anos_academicos ?? []));
    return sortNiveis(cursos.filter((c) => c.type === "superior").flatMap((c) => c.periodos ?? []));
  }, [academia, cursosData, tipoSelecionado]);

  const periodosFormula = useMemo(() => tipoSelecionado === "superior" ? [...anos] : ESCOLAR_PERIODOS, [anos, tipoSelecionado]);
  const categoriasDisponiveis = useMemo(() => {
    const fixas = tipoSelecionado === "superior" ? ["nota_pp1", "nota_pp2", "nota_exame"] : ["nota_escola", "nota_professor"];
    return [...new Set([...fixas, ...(categoriasData?.categorias ?? []).map((c) => c.codigo)])];
  }, [categoriasData, tipoSelecionado]);
  const categoriasEnvolvidas = useMemo(() => [...new Set(formulaItems.filter((i): i is Extract<FormulaItem, { kind: "ref" }> => i.kind === "ref").map((i) => i.categoria))], [formulaItems]);
  const formula = formulaText(formulaItems);
  const ultimoItem = formulaItems[formulaItems.length - 1];
  const parentesesAbertos = formulaItems.reduce((total, item) => item.kind === "paren" ? total + (item.value === "(" ? 1 : -1) : total, 0);
  const precisaValor = formulaItems.length === 0 || ultimoItem?.kind === "op" || (ultimoItem?.kind === "paren" && ultimoItem.value === "(");
  const podeFecharParenteses = !precisaValor && parentesesAbertos > 0;

  function handleTipoEnsinoChange(nextTipo: TipoEnsino) {
    setTipoEnsino(nextTipo); setAnos(new Set()); setFormulaItems([]); setDraftCategoria(""); setDraftPeriodo("");
  }

  function toggleAno(value: string) {
    setAnos((prev) => { const next = new Set(prev); next.has(value) ? next.delete(value) : next.add(value); return next; });
    setFormulaItems([]); setDraftPeriodo("");
  }

  function addRef() {
    if (!precisaValor || !draftCategoria || !draftPeriodo) return;
    setFormulaItems((prev) => [...prev, { kind: "ref", categoria: draftCategoria, periodo: draftPeriodo }]);
    setDraftCategoria(""); setDraftPeriodo("");
  }

  function addConstante() {
    if (!precisaValor || !draftConstante || Number(draftConstante) < 0) return;
    setFormulaItems((prev) => [...prev, { kind: "const", valor: draftConstante }]);
    setDraftConstante("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSucesso(null);
    const payload = { type: type.trim(), nome: nome.trim(), descricao: descricao.trim() || undefined, tipo_ensino: tipoSelecionado, anos_academicos: [...anos], nota_minima_aprovacao: Number(notaMinima), categorias_envolvidas: categoriasEnvolvidas, formula: formula.trim(), aplica_se_reprovado_em_type: dependencia || null };
    await criarRegra(payload);
    setSucesso("Regra criada. Ela será executada automaticamente quando as notas necessárias forem lançadas.");
    await listarRegras();
  }

  const regras = regrasData?.regras ?? [];
  const canSubmit = !!type.trim() && !!nome.trim() && !!notaMinima && Number(notaMinima) > 0 && anos.size > 0 && categoriasEnvolvidas.length > 0 && !!formula && !precisaValor && parentesesAbertos === 0;

  return <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-5"><h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10"><Icon icon="mdi:function-variant" width="16px" className="text-brand-500" /></span>Regras para automação de avaliação final</h2><p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">Configure como a academia decide se o estudante foi aprovado ou precisa de uma nova chance no fim do período. Depois que todas as notas usadas na regra forem lançadas, o sistema calcula automaticamente a nota final pela fórmula, compara com a nota mínima e registra o resultado, sem decisão manual.</p></div>
    <div className="grid gap-6 lg:grid-cols-2">
      <div><p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Regras ativas</p>{loading ? <div className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" /> : regras.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">Nenhuma regra configurada.</div> : <div className="space-y-2">{regras.map((r) => <div key={r.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">{r.type}</span><span className="text-sm font-semibold text-gray-800 dark:text-white">{r.nome}</span><span className="text-xs text-gray-400">{labelTipo(r.tipo_ensino)}</span></div><p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{r.anos_academicos.map(labelNivel).join(", ")} · mínimo {r.nota_minima_aprovacao} · {r.categorias_envolvidas.join(", ")}</p><p className="mt-1 text-xs text-gray-400">{labelFormula(r.formula)}{r.aplica_se_reprovado_em_type ? ` · depende de reprovação em ${r.aplica_se_reprovado_em_type}` : " · regra raiz"}</p></div>)}</div>}</div>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><p className="mb-3 text-sm font-semibold text-gray-800 dark:text-white">1. Identificação da regra</p><div className="grid gap-3 sm:grid-cols-2">{isMista ? <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Tipo de academia<select value={tipoSelecionado} onChange={(e) => handleTipoEnsinoChange(e.target.value as TipoEnsino)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"><option value="fundamental">Ensino fundamental</option><option value="medio">Ensino médio</option></select></label> : <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200"><span className="block text-xs font-medium text-gray-500">Tipo de academia</span>{labelTipo(tipoSelecionado)}</div>}<label className="text-xs font-medium text-gray-600 dark:text-gray-300">Nome da regra<input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Avaliação final" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label><label className="text-xs font-medium text-gray-600 dark:text-gray-300">Tipo de regra (código)<input value={type} onChange={(e) => setType(e.target.value.replace(/[^A-Za-z0-9_ ]/g, ""))} placeholder="Ex.: avaliacao_final" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label><label className="text-xs font-medium text-gray-600 dark:text-gray-300">Nota mínima de aprovação<input type="number" min={1} value={notaMinima} onChange={(e) => setNotaMinima(e.target.value)} placeholder="Ex.: 10" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label></div><label className="mt-3 block text-xs font-medium text-gray-600 dark:text-gray-300">Descrição<textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Explique quando essa será aplicada" rows={2} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label><label className="mt-3 block text-xs font-medium text-gray-600 dark:text-gray-300">Dependência<select value={dependencia} onChange={(e) => setDependencia(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"><option value="">Regra raiz (primeira avaliação)</option>{regras.filter(r => r.tipo_ensino === tipoSelecionado).map(r => <option key={r.id} value={r.type}>Só aplicar se reprovar em {r.type}</option>)}</select></label></div>
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><p className="mb-2 text-sm font-semibold text-gray-800 dark:text-white">2. Anos ou semestres atendidos</p><div className="flex flex-wrap gap-2">{opcoesNiveis.map(n => <button type="button" key={n} onClick={() => toggleAno(n)} className={`rounded-full border px-3 py-1.5 text-xs ${anos.has(n) ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"}`}>{labelNivel(n)}</button>)}</div>{tipoSelecionado === "superior" && anos.size === 0 && <p className="mt-2 text-xs text-amber-600">Selecione primeiro os semestres para liberar os períodos da fórmula.</p>}</div>
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><p className="text-sm font-semibold text-gray-800 dark:text-white">3. Fórmula guiada</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Monte a conta na mesma ordem em que ela deve ser calculada. Use parênteses para agrupar somas e médias antes de dividir ou aplicar pesos, por exemplo: primeiro abra parênteses, adicione as notas, feche parênteses e só depois divida pelo número desejado.</p><div className="mt-3 rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">{formula || "A fórmula aparecerá aqui conforme você adicionar notas, números e operações."}</div>{precisaValor ? <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><button type="button" onClick={() => setFormulaItems((prev) => [...prev, { kind: "paren", value: "(" }])} className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-600 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300">Abrir parênteses (</button><label className="text-xs font-medium text-gray-600 dark:text-gray-300">Categoria da nota<select value={draftCategoria} onChange={(e) => setDraftCategoria(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"><option value="">Categoria da nota</option>{categoriasDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}</select></label><label className="text-xs font-medium text-gray-600 dark:text-gray-300">Período<select value={draftPeriodo} onChange={(e) => setDraftPeriodo(e.target.value)} disabled={periodosFormula.length === 0} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"><option value="">Período</option>{periodosFormula.map(p => <option key={p} value={p}>{labelPeriodo(p)}</option>)}</select></label><button type="button" onClick={addRef} disabled={!draftCategoria || !draftPeriodo} className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Adicionar nota</button><label className="text-xs font-medium text-gray-600 dark:text-gray-300">Número constante<input type="number" min={0} step="0.01" value={draftConstante} onChange={(e) => setDraftConstante(e.target.value)} placeholder="Número constante" className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label><button type="button" onClick={addConstante} disabled={!draftConstante} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200">Adicionar número</button></div> : <div className="mt-3 flex flex-wrap gap-2">{["+", "-", "*", "/"].map(op => <button type="button" key={op} onClick={() => setFormulaItems((prev) => [...prev, { kind: "op", op: op as "+" | "-" | "*" | "/" }])} className="h-10 w-10 rounded-lg bg-brand-50 text-lg font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">{op}</button>)}<button type="button" onClick={() => setFormulaItems((prev) => [...prev, { kind: "paren", value: ")" }])} disabled={!podeFecharParenteses} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200">)</button></div>}<div className="mt-3 flex gap-2"><button type="button" onClick={() => setFormulaItems((prev) => prev.slice(0, -1))} className="text-xs font-medium text-gray-500 hover:text-gray-700">Desfazer último item</button><button type="button" onClick={() => setFormulaItems([])} className="text-xs font-medium text-red-500 hover:text-red-600">Limpar fórmula</button></div></div>
        <button type="submit" disabled={criando || !canSubmit} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{criando ? "A criar..." : "Criar regra"}</button>{(error || sucesso) && <p className={`text-sm ${sucesso ? "text-green-600" : "text-red-600"}`}>{sucesso || error}</p>}
      </form>
    </div>
  </div>;
}
