"use client";

import React, { useCallback, useEffect, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Icon from "@/components/ui/Icon";
import SearchableSelect, { type SearchableSelectOption } from "@/components/form/SearchableSelect";
import { useUserType } from "@/hooks/useRoutePermission";
import { adminService } from "@/lib/api/services";
import { tokenStorage, formatApiError } from "@/lib/api/client";
import type { SolicitacaoAlteracaoNIFAcademia, StatusSolicitacaoAlteracaoNIFAcademia } from "@/types/api";

const ITEMS_POR_PAGINA = 50;

const statusOptions: Array<SearchableSelectOption<StatusSolicitacaoAlteracaoNIFAcademia | "">> = [
  { value: "", label: "todas" },
  { value: "pendente", label: "pendente" },
  { value: "aprovada", label: "aprovada" },
  { value: "reprovada", label: "reprovada" },
];

const statusLabel: Record<string, string> = { pendente: "Pendente", aprovada: "Aprovada", reprovada: "Reprovada" };
const statusClass: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  aprovada: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  reprovada: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

// Página exclusiva para administradores consultarem, visualizarem, aprovarem
// e reprovarem TODAS as solicitações de alteração de NIF feitas por
// academias — antes vivia dentro da tela de detalhes de cada academia; foi
// para cá para dar um lugar único e óbvio para o admin trabalhar a fila,
// sem precisar abrir academia por academia. Backend: GET/PUT
// /dominis/solicitacoes-nif-academia... (Tarefa 81). Listar é permitido a
// qualquer admin autenticado; decidir (aprovar/reprovar) exige role 'adm'
// ou 'fpp' — o próprio backend responde 403 para 'gerente', então os
// botões de decisão só aparecem para quem realmente pode usá-los.
export default function PageContent() {
  const { user, isAdmin } = useUserType();
  const podeDecidir = isAdmin && ["adm", "fpp"].includes(user?.admin?.role ?? "");

  const [status, setStatus] = useState<StatusSolicitacaoAlteracaoNIFAcademia | "">("pendente");
  const [codigoAcademia, setCodigoAcademia] = useState("");
  const [items, setItems] = useState<SolicitacaoAlteracaoNIFAcademia[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [decidindo, setDecidindo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const response = await adminService.listarSolicitacoesAlteracaoNIFAcademia({
        status: status || undefined,
        codigo_academia: codigoAcademia.trim() || undefined,
        limit: ITEMS_POR_PAGINA,
        offset,
      });
      setItems(response.solicitacoes ?? []);
      setTotal(response.total ?? 0);
    } catch (err) {
      setErro(formatApiError(err, "Não foi possível carregar as solicitações de alteração de NIF."));
    } finally {
      setLoading(false);
    }
  }, [status, codigoAcademia, offset]);

  useEffect(() => { if (isAdmin) void carregar(); }, [isAdmin, carregar]);
  useEffect(() => { setOffset(0); }, [status, codigoAcademia]);

  const decidir = async (item: SolicitacaoAlteracaoNIFAcademia, action: "aprovar" | "reprovar") => {
    const motivo = action === "reprovar" ? window.prompt("Motivo da reprovação", "") : null;
    if (action === "reprovar" && !motivo?.trim()) return;
    setDecidindo(item.codigo_solicitacao);
    setErro("");
    try {
      if (action === "aprovar") {
        await adminService.aprovarSolicitacaoAlteracaoNIFAcademia(item.codigo_solicitacao, tokenStorage.get() || undefined);
      } else {
        await adminService.reprovarSolicitacaoAlteracaoNIFAcademia(item.codigo_solicitacao, { motivo_reprovacao: motivo!.trim() }, tokenStorage.get() || undefined);
      }
      await carregar();
    } catch (err) {
      setErro(formatApiError(err, "Não foi possível decidir a solicitação de alteração de NIF."));
    } finally {
      setDecidindo(null);
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / ITEMS_POR_PAGINA));
  const paginaAtual = Math.floor(offset / ITEMS_POR_PAGINA) + 1;

  if (!isAdmin) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Solicitações de NIF" />
        <div className="flex items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
          <Icon icon="mdi:lock-outline" width="28px" className="text-red-500" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400">Acesso restrito</p>
            <p className="mt-1 text-sm text-red-600 dark:text-red-300">Esta página está disponível apenas para administradores.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Solicitações de NIF" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Solicitações de alteração de NIF</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            NIF não é mais único entre academias. Aprovar aplica o novo NIF imediatamente; reprovar não altera nada.
            {!podeDecidir && " Seu perfil pode consultar, mas só um admin com role adm ou fpp pode decidir."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={codigoAcademia}
            onChange={(e) => setCodigoAcademia(e.target.value)}
            placeholder="Filtrar por código da academia"
            className="w-56 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <div className="w-44 capitalize">
            <SearchableSelect
              value={status}
              options={statusOptions}
              onChange={(value) => setStatus(value as StatusSolicitacaoAlteracaoNIFAcademia | "")}
              isSearchable={false}
            />
          </div>
        </div>
      </div>

      {erro && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">{erro}</p>}

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">Nenhuma solicitação encontrada.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                {["Código", "Academia", "NIF atual", "NIF solicitado", "Status", "Solicitado por", "Criada em", "Ações"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
              {items.map((item) => (
                <tr key={item.codigo_solicitacao}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.codigo_solicitacao}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.codigo_academia}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.nif_atual}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.nif_solicitado}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[item.status]}`}>{statusLabel[item.status] ?? item.status}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.solicitado_por}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDateTime(item.created_at)}</td>
                  <td className="px-4 py-3 text-sm">
                    {podeDecidir && item.status === "pendente" ? (
                      <div className="flex gap-2">
                        <button type="button" disabled={decidindo === item.codigo_solicitacao} onClick={() => decidir(item, "aprovar")} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60">Aprovar</button>
                        <button type="button" disabled={decidindo === item.codigo_solicitacao} onClick={() => decidir(item, "reprovar")} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60">Reprovar</button>
                      </div>
                    ) : item.status === "reprovada" && item.motivo_reprovacao ? (
                      <span className="text-xs text-gray-500 dark:text-gray-400" title={item.motivo_reprovacao}>Motivo: {item.motivo_reprovacao}</span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-600 dark:text-gray-300">
          <button type="button" onClick={() => setOffset((o) => Math.max(0, o - ITEMS_POR_PAGINA))} disabled={paginaAtual === 1} className="rounded-lg border border-gray-200 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700">Anterior</button>
          <span>Página {paginaAtual} de {totalPaginas}</span>
          <button type="button" onClick={() => setOffset((o) => o + ITEMS_POR_PAGINA)} disabled={paginaAtual === totalPaginas} className="rounded-lg border border-gray-200 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700">Próxima</button>
        </div>
      )}
    </div>
  );
}
