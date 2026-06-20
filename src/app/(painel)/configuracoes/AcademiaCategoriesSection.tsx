"use client";

import React, { useEffect, useMemo, useState } from "react";
import { academiaService } from "@/lib/api/services";
import { useApi } from "@/hooks/useApi";
import { useUserType } from "@/hooks/useRoutePermission";
import Icon from "@/components/ui/Icon";

const ORDEM_ANOS = [
  ...Array.from({ length: 9 }, (_, i) => `${i + 1}_ano_fundamental`),
  ...Array.from({ length: 4 }, (_, i) => `${i + 1}_ano_medio`),
  ...Array.from({ length: 12 }, (_, i) => `${i + 1}_semestre`),
];

function labelAno(ano: string) {
  const [numero, , nivel] = ano.split("_");
  if (ano.includes("semestre")) return `${numero}.º Semestre`;
  return `${numero}.º ${nivel === "fundamental" ? "Fundamental" : nivel === "medio" ? "Médio" : "Superior"}`;
}

function sortAnos(anos: string[]) {
  return [...new Set(anos)].sort((a, b) => ORDEM_ANOS.indexOf(a) - ORDEM_ANOS.indexOf(b));
}

function sequenciaPorExtremos(anos: string[], sufixo: "medio" | "semestre") {
  const nums = anos.map((ano) => Number(ano.split("_")[0])).filter(Boolean);
  if (!nums.length) return [];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return Array.from({ length: max - min + 1 }, (_, i) => sufixo === "semestre" ? `${min + i}_semestre` : `${min + i}_ano_medio`);
}

export default function AcademiaCategoriesSection() {
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [anosAcademicos, setAnosAcademicos] = useState<Set<string>>(new Set());
  const [sucesso, setSucesso] = useState<string | null>(null);

  const { user } = useUserType();
  const { data, loading: carregando, execute: carregarCategorias } = useApi(academiaService.listarCategoriasNota);
  const { data: cursosData, execute: carregarCursos } = useApi(academiaService.listarCursos);
  const { loading: criando, error: erroCriar, execute: criarCategoria } = useApi(academiaService.criarCategoriaNota);
  const { loading: deletando, error: erroDeletar, execute: deletarCategoria } = useApi(academiaService.deletarCategoriaNota);

  useEffect(() => {
    carregarCategorias().catch(() => undefined);
    carregarCursos().catch(() => undefined);
  }, [carregarCategorias, carregarCursos]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSucesso(null);
    try {
      await criarCategoria({ codigo, nome, descricao: descricao || undefined, anos_academicos: sortAnos([...anosAcademicos]) });
      setCodigo("");
      setNome("");
      setDescricao("");
      setAnosAcademicos(new Set());
      setSucesso("Categoria criada com sucesso.");
      await carregarCategorias();
    } catch {
      // erro disponível via hook
    }
  }

  async function handleDelete(codigoCategoria: string) {
    setSucesso(null);
    try {
      await deletarCategoria(codigoCategoria);
      setSucesso("Categoria removida com sucesso.");
      await carregarCategorias();
    } catch {
      // erro disponível via hook
    }
  }

  const categorias = data?.categorias ?? [];
  const opcoesAnos = useMemo(() => {
    const academia = user?.academia;
    const cursos = (cursosData?.cursos ?? []).filter((curso) => curso.status === "ativo");
    const fundamental = academia?.nivel === "escola" && (academia.nivel_escolar === "fundamental" || academia.nivel_escolar === "misto")
      ? (academia.anos_academicos?.length ? academia.anos_academicos : ORDEM_ANOS.slice(0, 9))
      : [];
    const medio = cursos.filter((curso) => curso.type === "medio").flatMap((curso) => curso.anos_academicos ?? []);
    const superior = cursos.filter((curso) => curso.type === "superior").flatMap((curso) => curso.periodos ?? []);
    return sortAnos([...fundamental, ...sequenciaPorExtremos(medio, "medio"), ...sequenciaPorExtremos(superior, "semestre")]);
  }, [cursosData, user]);

  function toggleAno(ano: string) {
    setAnosAcademicos((prev) => {
      const next = new Set(prev);
      next.has(ano) ? next.delete(ano) : next.add(ano);
      return next;
    });
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
            <Icon icon="mdi:format-list-checks" width="16px" className="text-brand-500" />
          </span>
          Categorias de nota
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          Crie categorias para separar os tipos de nota usados pela academia, como provas, trabalhos, exames ou avaliações do professor. Cada categoria precisa de um código sem espaços e deve ser ligada aos anos ou semestres em que poderá receber notas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Categorias cadastradas</p>
          {carregando ? (
            <div className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ) : categorias.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Nenhuma categoria personalizada cadastrada.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {categorias.map((categoria) => (
                <div key={categoria.codigo} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{categoria.nome}</p>
                    <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{categoria.codigo}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{categoria.anos_academicos?.length ? sortAnos(categoria.anos_academicos).map(labelAno).join(", ") : "Sem anos configurados"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(categoria.codigo)}
                    disabled={deletando}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Icon icon="mdi:trash-can-outline" width="14px" />
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Adicionar nova categoria de nota</p>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">Nome da categoria<input value={nome} onChange={(e) => setNome(e.target.value)} disabled={criando} placeholder="Ex.: Prova do professor" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">Código da categoria (sem espaços)<input value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\s+/g, "").replace(/[^A-Za-z0-9_]/g, ""))} disabled={criando} placeholder="Ex.: prova_profesor" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">Descrição<textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} disabled={criando} placeholder="Descrição opcional" rows={3} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Anos acadêmicos *</p>
            <div className="flex flex-wrap gap-2">
              {opcoesAnos.map((ano) => (
                <button key={ano} type="button" onClick={() => toggleAno(ano)} disabled={criando} className={`rounded-full border px-3 py-1.5 text-xs transition ${anosAcademicos.has(ano) ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 text-gray-600 hover:border-brand-300 dark:border-gray-700 dark:text-gray-300"}`}>
                  {labelAno(ano)}
                </button>
              ))}
              {opcoesAnos.length === 0 && <p className="text-xs text-gray-500">Nenhum ano acadêmico ativo encontrado.</p>}
            </div>
          </div>
          <button type="submit" disabled={criando || !codigo || !nome || anosAcademicos.size === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50">
            {criando ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />A criar...</> : <><Icon icon="mdi:plus" width="18px" />Criar categoria</>}
          </button>
        </form>
      </div>

      {(erroCriar || erroDeletar || sucesso) && (
        <div className={`mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 ${sucesso ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400" : "border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"}`}>
          <Icon icon={sucesso ? "mdi:check-circle-outline" : "mdi:alert-circle-outline"} width="18px" />
          <p className="text-sm">{sucesso || erroCriar || erroDeletar}</p>
        </div>
      )}
    </div>
  );
}
