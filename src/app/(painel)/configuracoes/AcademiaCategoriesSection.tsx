"use client";

import React, { useEffect, useState } from "react";
import { academiaService } from "@/lib/api/services";
import { useApi } from "@/hooks/useApi";
import Icon from "@/components/ui/Icon";

export default function AcademiaCategoriesSection() {
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [sucesso, setSucesso] = useState<string | null>(null);

  const { data, loading: carregando, execute: carregarCategorias } = useApi(academiaService.listarCategoriasNota);
  const { loading: criando, error: erroCriar, execute: criarCategoria } = useApi(academiaService.criarCategoriaNota);
  const { loading: deletando, error: erroDeletar, execute: deletarCategoria } = useApi(academiaService.deletarCategoriaNota);

  useEffect(() => {
    carregarCategorias().catch(() => undefined);
  }, [carregarCategorias]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSucesso(null);
    try {
      await criarCategoria({ codigo, nome, descricao: descricao || undefined });
      setCodigo("");
      setNome("");
      setDescricao("");
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
          A academia pode criar categorias personalizadas além das categorias fixas documentadas para notas escolares e superiores.
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
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nova categoria</p>
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)} disabled={criando} placeholder="codigo_sem_espacos" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          <input value={nome} onChange={(e) => setNome(e.target.value)} disabled={criando} placeholder="Nome exibido" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} disabled={criando} placeholder="Descrição opcional" rows={3} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          <button type="submit" disabled={criando || !codigo || !nome} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50">
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
