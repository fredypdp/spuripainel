"use client";
import { useEffect, useState } from "react";
import { academiaService, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import type { CategoriaServico } from "@/types/api";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import { PageHeading, PageDescription } from "@/components/ui/typography/Typography";

export default function CategoriasServicoPainel() {
  const lista = useApi(academiaService.listarCategoriasServico);
  const criar = useApi(academiaService.criarCategoriaServico);
  const atualizar = useApi(academiaService.atualizarCategoriaServico);
  const desativar = useApi(academiaService.desativarCategoriaServico);
  const reativar = useApi(academiaService.reativarCategoriaServico);

  const [nome, setNome] = useState("");
  const [edicao, setEdicao] = useState<CategoriaServico | null>(null);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = () => lista.execute();
  useEffect(() => { recarregar() }, []);

  const tratar = async (fn: () => Promise<unknown>) => {
    try {
      setErro(null);
      await fn();
      recarregar();
    } catch (e) {
      setErro(formatApiError(e, "Não foi possível salvar a categoria."));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <PageHeading>Categorias de Serviço</PageHeading>
        <PageDescription>Organize os serviços extras da academia.</PageDescription>
      </div>

      {erro && <Alert variant="error" title="Categorias" message={erro} />}

      <form
        className="flex max-w-xl gap-2"
        onSubmit={e => {
          e.preventDefault();
          if (nome.trim()) tratar(async () => { await criar.execute({ nome: nome.trim() }); setNome(""); });
        }}
      >
        <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da categoria" />
        <Button>Adicionar categoria</Button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/70">
            <tr>
              <th className="p-3 text-left font-medium text-gray-600 dark:text-gray-400">Nome</th>
              <th className="p-3 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
              <th className="p-3 text-left font-medium text-gray-600 dark:text-gray-400">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.data?.categorias_servico.map(c => (
              <tr key={c.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="p-3 font-medium text-gray-900 dark:text-white">
                  {edicao?.id === c.id ? (
                    <div className="flex gap-2">
                      <Input value={texto} onChange={e => setTexto(e.target.value)} />
                      <button
                        className="text-brand-600 dark:text-brand-400"
                        onClick={() => tratar(async () => { await atualizar.execute(c.id, { nome: texto }); setEdicao(null); })}
                      >
                        Salvar
                      </button>
                      <button className="text-gray-500 dark:text-gray-400" onClick={() => setEdicao(null)}>
                        Cancelar
                      </button>
                    </div>
                  ) : c.nome}
                </td>
                <td className="p-3 text-gray-500 dark:text-gray-400">{c.ativo ? "Ativo" : "Inativo"}</td>
                <td className="p-3">
                  <button
                    className="mr-3 text-brand-600 dark:text-brand-400"
                    onClick={() => { setEdicao(c); setTexto(c.nome); }}
                  >
                    Editar
                  </button>
                  <button
                    className="text-brand-600 dark:text-brand-400"
                    onClick={() => tratar(() => (c.ativo ? desativar : reativar).execute(c.id))}
                  >
                    {c.ativo ? "Desativar" : "Reativar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
