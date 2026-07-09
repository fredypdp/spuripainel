"use client";

import React, { useEffect, useMemo, useState } from "react";
import { academiaService } from "@/lib/api/services";
import { useApi } from "@/hooks/useApi";
import { useUserType } from "@/hooks/useRoutePermission";
import Icon from "@/components/ui/Icon";
import AcademiaCategoriesSection from "./AcademiaCategoriesSection";
import type { CategoriaNotaItem, CriarRegraAvaliacaoFinalRequest, RegraAvaliacaoFinal, TipoEnsino } from "@/types/api";

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
  return item.periodo ? `[${item.categoria},${item.periodo}]` : `[${item.categoria}]`;
}

function formulaText(items: FormulaItem[]) {
  return items.map(itemText).join("");
}


function categoriaAtendeEscopo(categoria: CategoriaNotaItem, nivel: TipoEnsino) {
  if (categoria.status !== "ativo") return false;
  if (nivel === "superior") return true;
  return categoria.anos_academicos?.some((ano) => ano.includes(nivel)) ?? false;
}

function formatEscopoRegra(regra: RegraAvaliacaoFinal) {
  if (regra.nivel === "superior") return "Escopo superior (sem anos_academicos)";
  const escopo = regra.anos_academicos;
  if (!escopo) return "Escopo não informado";
  if (Array.isArray(escopo) && escopo.length > 0 && typeof escopo[0] === "object") {
    return (escopo as Array<{ curso_id: string; anos_academicos: string[] }>).map((item) => `${item.curso_id}: ${item.anos_academicos.map(labelNivel).join(", ")}`).join(" · ");
  }
  return (escopo as string[]).map(labelNivel).join(", ");
}

export default function AvaliacaoFinalRulesSection() {
  const { isAcademia, isAdmin, isEstudante, user } = useUserType();
  const academia = user?.academia;
  const isSuperior = academia?.nivel === "superior";
  const tipoFixo = "superior";

  const tipoSelecionado: TipoEnsino = tipoFixo;
  const [type, setType] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [notaMinima, setNotaMinima] = useState("");
  const [limitePendentes, setLimitePendentes] = useState("0");
  const [notaDespertadora, setNotaDespertadora] = useState("");
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
  const { loading: deletando, execute: deletarRegra } = useApi(academiaService.deletarRegraAvaliacaoFinal);

  useEffect(() => {
    if (!isAcademia || !isSuperior) return;
    listarRegras().catch(() => undefined);
    listarCategorias().catch(() => undefined);
  }, [isAcademia, isSuperior, listarRegras, listarCategorias]);

  useEffect(() => {
    if (!isAcademia || isSuperior) return;
    const nivelEscolar = academia?.nivel_escolar;
    if (nivelEscolar !== "medio" && nivelEscolar !== "misto") return;
    listarCursos().catch(() => undefined);
  }, [academia?.nivel_escolar, isAcademia, isSuperior, listarCursos]);

  const periodosFormula = useMemo(() => tipoSelecionado === "superior" ? [] : ESCOLAR_PERIODOS, [tipoSelecionado]);
  const categoriasDisponiveis = useMemo(() => {
    return (categoriasData?.categorias ?? [])
      .filter((categoria) => categoriaAtendeEscopo(categoria, tipoSelecionado))
      .map((categoria) => categoria.codigo);
  }, [categoriasData, tipoSelecionado]);
  const categoriasEnvolvidas = useMemo(() => [...new Set(formulaItems.filter((i): i is Extract<FormulaItem, { kind: "ref" }> => i.kind === "ref").map((i) => i.categoria))], [formulaItems]);
  const formula = formulaText(formulaItems);
  const ultimoItem = formulaItems[formulaItems.length - 1];
  const parentesesAbertos = formulaItems.reduce((total, item) => item.kind === "paren" ? total + (item.value === "(" ? 1 : -1) : total, 0);
  const precisaValor = formulaItems.length === 0 || ultimoItem?.kind === "op" || (ultimoItem?.kind === "paren" && ultimoItem.value === "(");
  const podeFecharParenteses = !precisaValor && parentesesAbertos > 0;

  function addRef() {
    if (!precisaValor || !draftCategoria || (tipoSelecionado !== "superior" && !draftPeriodo)) return;
    setFormulaItems((prev) => [...prev, { kind: "ref", categoria: draftCategoria, periodo: tipoSelecionado === "superior" ? "" : draftPeriodo }]);
    setDraftCategoria(""); setDraftPeriodo("");
  }

  function addConstante() {
    if (!precisaValor || !draftConstante || Number(draftConstante) < 0) return;
    setFormulaItems((prev) => [...prev, { kind: "const", valor: draftConstante }]);
    setDraftConstante("");
  }

  function buildPayload(): CriarRegraAvaliacaoFinalRequest {
    return {
      type: type.trim(),
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      nota_minima_aprovacao: Number(notaMinima),
      formula: formula.trim(),
      nota_despertadora: dependencia ? undefined : (notaDespertadora || undefined),
      aplica_se_reprovado_em_type: dependencia || null,
      nivel: "superior",
      limite_materias_pendentes: Number(limitePendentes),
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSucesso(null);
    await criarRegra(buildPayload());
    setSucesso("Regra criada. Ela será executada automaticamente quando as notas necessárias forem lançadas.");
    await listarRegras();
  }


  if (isAdmin) {
    return <InformacaoAvaliacaoFinal perfil="admin" />;
  }

  if (isEstudante) {
    const estudante = user?.estudante;
    const nivelEstudante = estudante?.semestre_atual || estudante?.curso_superior_id || estudante?.status_superior === "em_andamento" ? "superior" : estudante?.ano_escolar_medio ? "medio" : "fundamental";
    return <InformacaoAvaliacaoFinal perfil="estudante" nivel={nivelEstudante} />;
  }

  const regras = regrasData?.regras ?? [];
  const escopoOk = true;
  const limiteOk = limitePendentes !== "" && Number(limitePendentes) >= 0;
  const canSubmit = !!type.trim() && !!nome.trim() && !!notaMinima && Number(notaMinima) > 0 && escopoOk && limiteOk && !!formula && categoriasEnvolvidas.length > 0 && !precisaValor;

  if (!isSuperior) {
    const nivelAcademia = academia?.nivel_escolar === "medio" ? "medio" : academia?.nivel_escolar === "misto" ? "misto" : "fundamental";
    const modelosMedio = inferirModelosMedio(cursosData?.cursos ?? []);
    return <InformacaoAvaliacaoFinal perfil="academia-escola" nivel={nivelAcademia} modelosMedio={modelosMedio} />;
  }

  return <div className="space-y-6"><InformacaoAvaliacaoFinal perfil="academia-superior" /><div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-5"><h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10"><Icon icon="mdi:function-variant" width="16px" className="text-brand-500" /></span>Regras para automação de avaliação final</h2><p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">Configure como a academia decide se o estudante foi aprovado ou precisa de uma nova chance no fim do período. Depois que todas as notas usadas na regra forem lançadas, o sistema calcula automaticamente a nota final pela fórmula, compara com a nota mínima e registra o resultado, sem decisão manual.</p></div>
    <div className="grid gap-6 lg:grid-cols-2">
      <div><p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Regras ativas</p>{loading ? <div className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" /> : regras.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">Nenhuma regra configurada.</div> : <div className="space-y-2">{regras.map((r) => <div key={r.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-brand-50 px-2 py-0.5 text-sm font-semibold text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">{r.type}</span><span className="text-sm font-semibold text-gray-800 dark:text-white">{r.nome}</span><span className="text-sm text-gray-400">{labelTipo(r.nivel)}</span><button type="button" disabled={deletando} onClick={async () => { if (window.confirm("Inativar esta regra? As dependentes em cadeia também podem ser afetadas.")) { await deletarRegra(r.id); await listarRegras(); } }} className="ml-auto rounded-full border border-red-200 px-2 py-0.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-900/20">Inativar</button></div><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{formatEscopoRegra(r)} · mínimo {r.nota_minima_aprovacao} · categorias extraídas: {r.categorias_envolvidas.join(", ")}</p><p className="mt-1 text-sm text-gray-400">{labelFormula(r.formula)}{r.aplica_se_reprovado_em_type ? ` · depende de reprovação em ${r.aplica_se_reprovado_em_type}` : " · regra raiz"}</p></div>)}</div>}</div>
      <form onSubmit={submit} className="space-y-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white">Criar nova regra de avaliação final</h3>
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><p className="mb-3 text-sm font-semibold text-gray-800 dark:text-white">1. Identificação da regra</p><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200"><span className="block text-sm font-medium text-gray-500">Tipo de academia</span>{labelTipo(tipoSelecionado)}</div><label className="text-sm font-medium text-gray-600 dark:text-gray-300">Nome da regra<input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Avaliação final" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label><label className="text-sm font-medium text-gray-600 dark:text-gray-300">Tipo de regra (código)<input value={type} onChange={(e) => setType(e.target.value.replace(/[^A-Za-z0-9_ ]/g, ""))} placeholder="Ex.: avaliacao_final" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label><label className="text-sm font-medium text-gray-600 dark:text-gray-300">Nota mínima de aprovação<input type="number" min={1} value={notaMinima} onChange={(e) => setNotaMinima(e.target.value)} placeholder="Ex.: 10" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label><label className="text-sm font-medium text-gray-600 dark:text-gray-300">Limite de matérias pendentes<input type="number" min={0} value={limitePendentes} onChange={(e) => setLimitePendentes(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label></div><label className="mt-3 block text-sm font-medium text-gray-600 dark:text-gray-300">Descrição<textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Explique quando essa será aplicada" rows={2} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label><label className="mt-3 block text-sm font-medium text-gray-600 dark:text-gray-300">Dependência<p className="mt-1 text-sm font-normal leading-relaxed text-gray-500 dark:text-gray-400">Use a dependência para ligar uma tentativa à anterior. Regras dependentes não enviam nota despertadora.</p><select value={dependencia} onChange={(e) => setDependencia(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"><option value="">Regra raiz (primeira avaliação)</option>{regras.filter(r => r.nivel === tipoSelecionado).map(r => <option key={r.id} value={r.type}>Só aplicar se reprovar em {r.type}</option>)}</select></label>{!dependencia && <label className="mt-3 block text-sm font-medium text-gray-600 dark:text-gray-300">Nota despertadora<select value={notaDespertadora} onChange={(e) => setNotaDespertadora(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"><option value="">Sem disparo por categoria</option>{categoriasDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}</select></label>}</div>
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><p className="text-sm font-semibold text-gray-800 dark:text-white">2. Fórmula guiada</p><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Monte a conta passo a passo, adicionando uma nota ou número e depois escolhendo a operação desejada. O sistema extrai automaticamente as categorias usadas na fórmula e calcula a nota final assim que todas as notas necessárias forem lançadas.</p><div className="mt-3 rounded-lg bg-gray-50 p-3 font-mono text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">{formula || "A fórmula aparecerá aqui conforme você adicionar notas, números e operações."}</div>{precisaValor ? <div className="mt-3 space-y-3"><div className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]"><label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Categoria da nota<select value={draftCategoria} onChange={(e) => setDraftCategoria(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"><option value="">{categoriasDisponiveis.length === 0 ? "Nenhuma categoria configurada para o escopo" : "Categoria da nota"}</option>{categoriasDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}</select></label><label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Período<select value={draftPeriodo} onChange={(e) => setDraftPeriodo(e.target.value)} disabled={tipoSelecionado === "superior" || periodosFormula.length === 0} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"><option value="">{tipoSelecionado === "superior" ? "Inferido pela matéria" : "Período"}</option>{periodosFormula.map(p => <option key={p} value={p}>{labelPeriodo(p)}</option>)}</select></label><button type="button" onClick={addRef} disabled={!draftCategoria || (tipoSelecionado !== "superior" && !draftPeriodo)} className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-3 text-sm font-medium text-white disabled:opacity-50">Adicionar nota</button></div><div className="grid items-end gap-2 sm:grid-cols-[1fr_auto]"><label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Número constante<input type="number" min={0} step="0.01" value={draftConstante} onChange={(e) => setDraftConstante(e.target.value)} placeholder="Número constante" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label><button type="button" onClick={addConstante} disabled={!draftConstante} className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200">Adicionar número</button></div></div> : <div className="mt-3 flex flex-wrap gap-2">{["+", "-", "*", "/"].map(op => <button type="button" key={op} onClick={() => setFormulaItems((prev) => [...prev, { kind: "op", op: op as "+" | "-" | "*" | "/" }])} className="h-10 w-10 rounded-lg bg-brand-50 text-lg font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">{op}</button>)}</div>}<div className="mt-3 flex gap-2"><button type="button" onClick={() => setFormulaItems((prev) => prev.slice(0, -1))} className="text-sm font-medium text-gray-500 hover:text-gray-700">Desfazer último item</button><button type="button" onClick={() => setFormulaItems([])} className="text-sm font-medium text-red-500 hover:text-red-600">Limpar fórmula</button></div></div>
        <button type="submit" disabled={criando || !canSubmit} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{criando ? "A criar..." : "Criar regra"}</button>{(error || sucesso) && <p className={`text-sm ${sucesso ? "text-green-600" : "text-red-600"}`}>{sucesso || error}</p>}
      </form>
    </div>
  </div><AcademiaCategoriesSection /></div>;
}



type ModeloMedio = "liceu" | "tecnico";

type SchoolRuleSection = {
  title: string;
  scope: string;
  models?: ModeloMedio[];
  description: string;
  formula: string;
  calculationSteps: string[];
};

function inferirModelosMedio(cursos: unknown[]): ModeloMedio[] {
  const modelos = new Set<ModeloMedio>();

  cursos.forEach((curso) => {
    const item = curso as { type?: string; modelo?: string; anos_academicos?: string[] };
    if (item.type !== "medio") return;
    if (item.modelo === "liceu" || item.modelo === "tecnico") {
      modelos.add(item.modelo);
      return;
    }
    if (item.anos_academicos?.includes("4_ano_medio")) {
      modelos.add("tecnico");
    } else if (item.anos_academicos?.some((ano) => ano.includes("ano_medio"))) {
      modelos.add("liceu");
    }
  });

  return Array.from(modelos);
}

function labelModelosMedio(modelos?: ModeloMedio[]) {
  if (!modelos || modelos.length === 0 || modelos.length > 1) return "Liceu/Técnico";
  return modelos[0] === "liceu" ? "Liceu" : "Técnico";
}

function filtrarPorModelo(section: SchoolRuleSection, modelos?: ModeloMedio[]) {
  if (!section.models || !modelos || modelos.length === 0) return true;
  return section.models.some((modelo) => modelos.includes(modelo));
}

const SCHOOL_RULE_SECTIONS: SchoolRuleSection[] = [
  {
    title: "1.º ao 5.º Fundamental",
    scope: "Anos acadêmicos com regra regular",
    formula: "Média anual = média dos 3 trimestres; nota mínima: 5 valores",
    description: "O sistema calcula a média de cada trimestre combinando a nota do professor com a prova trimestral e depois tira a média anual da matéria.",
    calculationSteps: [
      "Média do trimestre = (nota do professor + prova trimestral) ÷ 2",
      "Nota final da matéria = (média do 1.º trimestre + média do 2.º trimestre + média do 3.º trimestre) ÷ 3",
      "Para aprovar o estudante deve ter no mínimo 5 valores em todas as matérias.",
    ],
  },
  {
    title: "6.º Fundamental",
    scope: "Ano acadêmico com exame final e recurso",
    formula: "Com exame final = média dos 1.º e 2.º trimestres regulares + 3.º trimestre com exame final; recurso = exame de recurso; nota mínima: 5 valores",
    description: "Neste ano, a avaliação final não começa pela média regular com prova trimestral no 3.º trimestre: ela é despertada pelo exame final e usa o exame final no lugar da prova trimestral do 3.º trimestre. Se a matéria reprovar nessa etapa normal, o exame de recurso pode recalcular somente as matérias reprovadas.",
    calculationSteps: [
      "Etapa normal com exame final: mantém as médias regulares do 1.º e 2.º trimestres e calcula o 3.º trimestre como (nota do professor + exame final) ÷ 2.",
      "Nota final da matéria com exame final = (média do 1.º trimestre + média do 2.º trimestre + média do 3.º trimestre com exame final) ÷ 3.",
      "Etapa de recurso: se a matéria ficou abaixo de 5 valores na etapa normal, a nota final dessa matéria passa a ser exatamente a nota do exame de recurso do 3.º trimestre.",
      "Para aprovar o estudante deve ter no mínimo 5 valores em todas as matérias após a etapa aplicável.",
    ],
  },
  {
    title: "7.º e 8.º Fundamental",
    scope: "Anos acadêmicos com regra regular",
    formula: "Média anual = média dos 3 trimestres; nota mínima: 10 valores",
    description: "O sistema calcula a média de cada trimestre combinando a nota do professor com a prova trimestral e depois tira a média anual da matéria.",
    calculationSteps: [
      "Média do trimestre = (nota do professor + prova trimestral) ÷ 2",
      "Nota final da matéria = (média do 1.º trimestre + média do 2.º trimestre + média do 3.º trimestre) ÷ 3",
      "Para aprovar o estudante deve ter no mínimo 10 valores em todas as matérias.",
    ],
  },
  {
    title: "9.º Fundamental",
    scope: "Ano acadêmico com exame final e recurso",
    formula: "Com exame final = média dos 1.º e 2.º trimestres regulares + 3.º trimestre com exame final; recurso = exame de recurso; nota mínima: 10 valores",
    description: "Neste ano, a avaliação final não começa pela média regular com prova trimestral no 3.º trimestre: ela é despertada pelo exame final e usa o exame final no lugar da prova trimestral do 3.º trimestre. Se a matéria reprovar nessa etapa normal, o exame de recurso pode recalcular somente as matérias reprovadas.",
    calculationSteps: [
      "Etapa normal com exame final: mantém as médias regulares do 1.º e 2.º trimestres e calcula o 3.º trimestre como (nota do professor + exame final) ÷ 2.",
      "Nota final da matéria com exame final = (média do 1.º trimestre + média do 2.º trimestre + média do 3.º trimestre com exame final) ÷ 3.",
      "Etapa de recurso: se a matéria ficou abaixo de 10 valores na etapa normal, a nota final dessa matéria passa a ser exatamente a nota do exame de recurso do 3.º trimestre.",
      "Para aprovar o estudante deve ter no mínimo 10 valores em todas as matérias após a etapa aplicável.",
    ],
  },
  {
    title: "1.º e 2.º Médio",
    scope: "Ensino médio (Liceu/Técnico) com regra regular",
    models: ["liceu", "tecnico"],
    formula: "Média anual = média dos 3 trimestres; nota mínima: 10 valores",
    description: "Nestes anos do Ensino médio, a regra é regular por matéria: média trimestral entre nota do professor e prova trimestral, seguida da média anual.",
    calculationSteps: [
      "Média do trimestre = (nota do professor + prova trimestral) ÷ 2",
      "Nota final da matéria = (média do 1.º trimestre + média do 2.º trimestre + média do 3.º trimestre) ÷ 3",
      "Para aprovar o estudante deve ter no mínimo 10 valores em todas as matérias.",
    ],
  },
  {
    title: "3.º Médio",
    scope: "Ensino médio (Liceu/Técnico) com exame final e recurso",
    models: ["liceu", "tecnico"],
    formula: "Com exame final = média dos 1.º e 2.º trimestres regulares + 3.º trimestre com exame final; recurso = exame de recurso; nota mínima: 10 valores",
    description: "No 3.º ano do Ensino médio, a avaliação final é despertada pelo exame final e usa o exame final no lugar da prova trimestral do 3.º trimestre. O exame de recurso existe somente depois de reprovação nessa etapa normal e recalcula apenas as matérias reprovadas.",
    calculationSteps: [
      "Etapa normal com exame final: mantém as médias regulares do 1.º e 2.º trimestres e calcula o 3.º trimestre como (nota do professor + exame final) ÷ 2.",
      "Nota final da matéria com exame final = (média do 1.º trimestre + média do 2.º trimestre + média do 3.º trimestre com exame final) ÷ 3.",
      "Etapa de recurso: se a matéria ficou abaixo de 10 valores na etapa normal, a nota final dessa matéria passa a ser exatamente a nota do exame de recurso do 3.º trimestre.",
      "Para aprovar o estudante deve ter no mínimo 10 valores em todas as matérias após a etapa aplicável.",
    ],
  },
  {
    title: "4.º Médio",
    scope: "Ensino médio (Técnico) — ano final",
    models: ["tecnico"],
    formula: "PAP ≥ 10 valores",
    description: "O 4.º ano existe apenas para cursos médios técnicos. A avaliação decisiva é a Prova de Aptidão Profissional (PAP).",
    calculationSteps: [
      "Nota final = nota da Prova de Aptidão Profissional.",
      "Aprova e conclui o Ensino Médio Técnico quando a PAP é maior ou igual a 10 valores.",
      "Reprova quando a PAP fica abaixo de 10 valores.",
    ],
  },
];

function RuleFormulaBlock({ title, scope, formula, description, calculationSteps }: SchoolRuleSection) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-100 bg-gradient-to-r from-brand-50 to-white px-4 py-3 dark:border-gray-800 dark:from-brand-900/20 dark:to-gray-900">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-gray-800 dark:text-white">{title}</p>
          <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">{scope}</span>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{description}</p>
      </div>
      <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)]">
        <div className="space-y-2">
          {calculationSteps.map((step, index) => (
            <div key={step} className="flex gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">{index + 1}</span>
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200">{step}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-dashed border-brand-200 bg-brand-50/70 p-3 dark:border-brand-900/60 dark:bg-brand-900/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">Cálculo resumido</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-800 dark:text-white">{formula}</p>
        </div>
      </div>
    </div>
  );
}

type InfoPerfil = "admin" | "estudante" | "academia-escola" | "academia-superior";

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"><p className="font-semibold text-gray-800 dark:text-white">{title}</p><div className="mt-2 space-y-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{children}</div></div>;
}

function InformacaoAvaliacaoFinal({ perfil, nivel, modelosMedio }: { perfil: InfoPerfil; nivel?: string; modelosMedio?: ModeloMedio[] }) {
  const mostrarFundamental = perfil === "admin" || nivel === "fundamental" || nivel === "misto";
  const mostrarMedio = perfil === "admin" || nivel === "medio" || nivel === "misto";
  const mostrarSuperior = perfil === "admin" || perfil === "academia-superior" || nivel === "superior";

  return <div className="space-y-4">
    <div className="rounded-2xl border border-brand-100 bg-brand-50 p-6 dark:border-brand-900/40 dark:bg-brand-900/10">
      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white"><Icon icon="mdi:function-variant" width="18px" className="text-brand-500" />Regras de avaliação final</h2>
      <p className="mt-2 max-w-4xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        A avaliação final é calculada automaticamente quando as notas necessárias são lançadas. O sistema olha para cada matéria, faz a conta definida para aquele nível e decide se a nota ficou suficiente ou se o estudante precisa de uma nova oportunidade.
      </p>
    </div>
    {perfil === "academia-superior" && mostrarSuperior && (
      <div className="grid gap-4 lg:grid-cols-3">
        <InfoCard title="Ensino superior"><p>A academia define as categorias de nota, a fórmula de cálculo, a nota mínima e quantas matérias podem ficar pendentes. Depois disso, a cada lançamento de nota, o sistema verifica se já consegue calcular a situação da matéria.</p><p>Exemplo simples de fórmula: ([prova_1]+[prova_2])/2. Se a regra tiver nova chance, ela só é usada quando o estudante reprova na etapa anterior.</p></InfoCard>
      </div>
    )}
    {(mostrarFundamental || mostrarMedio) && (
      <InfoCard title="Explicando cada modelo de avaliação">
        <div className="space-y-3">
          {SCHOOL_RULE_SECTIONS.filter((section) => {
            const isMedio = section.scope.includes("Ensino médio");
            return isMedio ? mostrarMedio && filtrarPorModelo(section, modelosMedio) : mostrarFundamental;
          }).map((section) => {
            const scope = section.scope.replace("Liceu/Técnico", labelModelosMedio(modelosMedio));
            return <RuleFormulaBlock key={section.title} {...section} scope={scope} />;
          })}
        </div>
      </InfoCard>
    )}
    {perfil === "admin" && <InfoCard title="O que o administrador precisa saber"><p>Nas escolas, as regras são fixas para manter o mesmo padrão entre academias: Ensino fundamental, Ensino Médio Técnico ou Liceu, exame e recurso seguem o catálogo oficial. No ensino superior, cada academia tem liberdade para criar suas próprias regras e categorias.</p></InfoCard>}
  </div>;
}
