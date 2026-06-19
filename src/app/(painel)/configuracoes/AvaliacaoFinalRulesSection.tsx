"use client";

import React, { useEffect, useMemo, useState } from "react";
import { academiaService } from "@/lib/api/services";
import { useApi } from "@/hooks/useApi";
import { useUserType } from "@/hooks/useRoutePermission";
import Icon from "@/components/ui/Icon";
import type { AvaliacaoFinalFormulaNode, Periodo, TipoEnsino } from "@/types/api";

const ESCOLAR_PERIODOS = ["1_trimestre", "2_trimestre", "3_trimestre"];
const TIPOS: TipoEnsino[] = ["fundamental", "medio", "superior"];

function labelNivel(v: string) {
  if (v.includes("semestre")) return `${v.split("_")[0]}.º Semestre`;
  const [numero, , nivel] = v.split("_");
  return `${numero}.º ${nivel === "fundamental" ? "Fundamental" : nivel === "medio" ? "Médio" : "Superior"}`;
}

function labelFormula(formula: AvaliacaoFinalFormulaNode): string {
  if (formula.op === "sum_periods") return `Soma por períodos: ${formula.categories.join(" + ")}`;
  if (formula.op === "category_total") return `Total da categoria ${formula.category}`;
  if (formula.op === "add") return `Soma de ${formula.items.length} componentes`;
  return `Média/divisão por ${formula.right}`;
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

export default function AvaliacaoFinalRulesSection() {
  const { user } = useUserType();
  const [tipoEnsino, setTipoEnsino] = useState<TipoEnsino>(user?.academia?.nivel === "superior" ? "superior" : "fundamental");
  const [type, setType] = useState("normal");
  const [nome, setNome] = useState("Avaliação normal");
  const [descricao, setDescricao] = useState("");
  const [notaMinima, setNotaMinima] = useState(10);
  const [anos, setAnos] = useState<Set<string>>(new Set());
  const [categorias, setCategorias] = useState<Set<string>>(new Set(["nota_escola", "nota_professor"]));
  const [dependencia, setDependencia] = useState("");
  const [modelo, setModelo] = useState<"media_periodos" | "categoria_total">("media_periodos");
  const [sucesso, setSucesso] = useState<string | null>(null);

  const { data: regrasData, loading, execute: listarRegras } = useApi(academiaService.listarRegrasAvaliacaoFinal);
  const { data: categoriasData, execute: listarCategorias } = useApi(academiaService.listarCategoriasNota);
  const { data: cursosData, execute: listarCursos } = useApi(academiaService.listarCursos);
  const { loading: criando, error, execute: criarRegra } = useApi(academiaService.criarRegraAvaliacaoFinal);

  useEffect(() => { listarRegras().catch(() => undefined); listarCategorias().catch(() => undefined); listarCursos().catch(() => undefined); }, [listarRegras, listarCategorias, listarCursos]);

  const opcoesNiveis = useMemo(() => {
    const cursos = (cursosData?.cursos ?? []).filter((c) => c.status === "ativo");
    if (tipoEnsino === "fundamental") return sortNiveis(user?.academia?.anos_academicos?.length ? user.academia.anos_academicos : Array.from({ length: 9 }, (_, i) => `${i + 1}_ano_fundamental`));
    if (tipoEnsino === "medio") return sortNiveis(cursos.filter((c) => c.type === "medio").flatMap((c) => c.anos_academicos ?? []));
    return sortNiveis(cursos.filter((c) => c.type === "superior").flatMap((c) => c.periodos ?? []));
  }, [cursosData, tipoEnsino, user]);

  const categoriasDisponiveis = useMemo(() => {
    const fixas = tipoEnsino === "superior" ? ["nota_pp1", "nota_pp2", "nota_exame"] : ["nota_escola", "nota_professor"];
    return [...new Set([...fixas, ...(categoriasData?.categorias ?? []).map((c) => c.codigo)])];
  }, [categoriasData, tipoEnsino]);

  function handleTipoEnsinoChange(nextTipo: TipoEnsino) {
    setTipoEnsino(nextTipo);
    setCategorias(new Set(nextTipo === "superior" ? ["nota_pp1", "nota_pp2"] : ["nota_escola", "nota_professor"]));
    setAnos(new Set());
  }

  function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) {
    setter((prev) => { const next = new Set(prev); next.has(value) ? next.delete(value) : next.add(value); return next; });
  }

  function buildFormula(): AvaliacaoFinalFormulaNode {
    const cats = [...categorias];
    if (modelo === "categoria_total") return { op: "category_total", category: cats[0] };
    return { op: "div", left: { op: "sum_periods", categories: cats, periods: (tipoEnsino === "superior" ? [...anos] : ESCOLAR_PERIODOS) as Periodo[] }, right: tipoEnsino === "superior" ? Math.max(1, anos.size) : 3 };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSucesso(null);
    const payload = { type: type || "normal", nome, descricao: descricao || undefined, tipo_ensino: tipoEnsino, anos_academicos: [...anos], nota_minima_aprovacao: notaMinima, categorias_envolvidas: [...categorias], formula: buildFormula(), aplica_se_reprovado_em_type: dependencia || null };
    await criarRegra(payload);
    setSucesso("Regra de avaliação final criada. Ela será executada automaticamente quando as notas completarem a fórmula.");
    await listarRegras();
  }

  const regras = regrasData?.regras ?? [];

  return <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10"><Icon icon="mdi:function-variant" width="16px" className="text-brand-500" /></span>Regras de avaliação final</h2>
      <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">Configure tipologias como normal, recurso ou especial. A avaliação não é manual: ao lançar notas, o backend percorre a cadeia de regras, calcula a fórmula e decide aprovação, reprovação e progressão.</p>
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Regras ativas</p>
        {loading ? <div className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" /> : regras.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">Nenhuma regra configurada.</div> : <div className="space-y-2">{regras.map((r) => <div key={r.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">{r.type}</span><span className="text-sm font-semibold text-gray-800 dark:text-white">{r.nome}</span><span className="text-xs text-gray-400">{r.tipo_ensino}</span></div><p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{r.anos_academicos.map(labelNivel).join(", ")} · mínimo {r.nota_minima_aprovacao} · {r.categorias_envolvidas.join(", ")}</p><p className="mt-1 text-xs text-gray-400">{labelFormula(r.formula)}{r.aplica_se_reprovado_em_type ? ` · depende de reprovação em ${r.aplica_se_reprovado_em_type}` : " · regra raiz"}</p></div>)}</div>}
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3"><select value={tipoEnsino} onChange={(e) => handleTipoEnsinoChange(e.target.value as TipoEnsino)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">{TIPOS.map(t => <option key={t} value={t}>{t}</option>)}</select><input value={type} onChange={(e) => setType(e.target.value)} placeholder="type: normal, recurso..." className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></div>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da regra" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição opcional" rows={2} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
        <div className="grid grid-cols-2 gap-3"><input type="number" min={1} value={notaMinima} onChange={(e) => setNotaMinima(Number(e.target.value))} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /><select value={dependencia} onChange={(e) => setDependencia(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"><option value="">Regra raiz</option>{regras.filter(r => r.tipo_ensino === tipoEnsino).map(r => <option key={r.id} value={r.type}>Depende de {r.type}</option>)}</select></div>
        <select value={modelo} onChange={(e) => setModelo(e.target.value as any)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"><option value="media_periodos">Modelo: média por períodos obrigatórios (sum_periods/div)</option><option value="categoria_total">Modelo: total de uma categoria (category_total)</option></select>
        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Anos/semestres da regra *</p><div className="flex flex-wrap gap-2">{opcoesNiveis.map(n => <button type="button" key={n} onClick={() => toggle(setAnos, n)} className={`rounded-full border px-3 py-1.5 text-xs ${anos.has(n) ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"}`}>{labelNivel(n)}</button>)}</div></div>
        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Categorias envolvidas *</p><div className="flex flex-wrap gap-2">{categoriasDisponiveis.map(c => <button type="button" key={c} onClick={() => toggle(setCategorias, c)} className={`rounded-full border px-3 py-1.5 text-xs ${categorias.has(c) ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"}`}>{c}</button>)}</div></div>
        <button type="submit" disabled={criando || !nome || anos.size === 0 || categorias.size === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{criando ? "A criar..." : "Criar regra"}</button>
        {(error || sucesso) && <p className={`text-sm ${sucesso ? "text-green-600" : "text-red-600"}`}>{sucesso || error}</p>}
      </form>
    </div>
  </div>;
}
