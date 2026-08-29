"use client";

import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { adminService, tokenStorage, useApi } from "@/lib/api";
import type { AuditoriaDelecaoTipo } from "@/types/api";

const LIMIT = 20;
const labels: Record<AuditoriaDelecaoTipo, string> = { academia: "Academia", admin: "Administrador", estudante: "Estudante" };

function formatDate(value?: string) { if (!value) return "—"; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleString("pt-AO"); }

export default function AuditoriaPageContent() {
  const [tipo, setTipo] = useState<AuditoriaDelecaoTipo | "">("");
  const [offset, setOffset] = useState(0);
  const { data, loading, error, execute } = useApi(adminService.listarAuditoriaDelecoes);
  useEffect(() => { execute({ tipo, limit: LIMIT, offset, token: tokenStorage.get() || undefined }).catch(() => undefined); }, [execute, tipo, offset]);
  const items = useMemo(() => data?.delecoes ?? [], [data]);
  const total = data?.total ?? items.length;
  const page = Math.floor(offset / LIMIT) + 1;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  return <div><PageBreadcrumb pageTitle="Auditoria de Deleções" /><div className="space-y-6">
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <select className="rounded-lg border border-gray-200 px-4 py-3 text-sm dark:border-white/[0.05] dark:bg-gray-900 dark:text-white" value={tipo} onChange={(e)=>{setTipo(e.target.value as AuditoriaDelecaoTipo | ""); setOffset(0);}}><option value="">Todos os tipos</option><option value="academia">Academias</option><option value="admin">Administradores</option><option value="estudante">Estudantes</option></select>
      <Button size="sm" variant="outline" disabled={loading} onClick={()=>execute({ tipo, limit: LIMIT, offset, token: tokenStorage.get() || undefined }).catch(()=>undefined)}>{loading?"Carregando...":"Atualizar"}</Button>
      <span className="text-sm text-gray-500 dark:text-gray-400">{total} registro(s)</span>
    </div>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{error}</div>}
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]"><div className="w-full overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-gray-100 dark:border-white/[0.05]"><th className="px-5 py-3">Tipo</th><th className="px-5 py-3">Entidade</th><th className="px-5 py-3">Motivo</th><th className="px-5 py-3">Quem deletou</th><th className="px-5 py-3">Quando</th></tr></thead><tbody>{loading && items.length===0 ? Array.from({length:5}).map((_,i)=><tr key={i}><td colSpan={5} className="px-5 py-4"><div className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" /></td></tr>) : items.map((item)=><tr key={item.id} className="border-b border-gray-100 dark:border-white/[0.05]"><td className="px-5 py-4"><span className="rounded-full bg-gray-100 px-3 py-1 text-xs dark:bg-white/[0.08]">{labels[item.tipo] ?? item.tipo}</span></td><td className="px-5 py-4"><div className="font-medium text-gray-800 dark:text-white/90">{item.nome || item.email || item.identificador || item.entidade_id || "—"}</div><div className="text-xs text-gray-500">{item.identificador || item.entidade_id || item.email || ""}</div></td><td className="px-5 py-4 max-w-md text-gray-600 dark:text-gray-300">{item.motivo}</td><td className="px-5 py-4">{item.deletado_por_nome || item.deleted_by_nome || item.deletado_por || item.deleted_by || "—"}</td><td className="px-5 py-4">{formatDate(item.deleted_at || item.created_at)}</td></tr>)}{!loading && items.length===0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-500">Nenhuma deleção registrada ainda.</td></tr>}</tbody></table></div></div>
    <div className="flex items-center justify-end gap-3"><Button size="sm" variant="outline" disabled={offset===0 || loading} onClick={()=>setOffset(Math.max(0, offset-LIMIT))}>Anterior</Button><span className="text-sm text-gray-500">Página {page} de {totalPages}</span><Button size="sm" variant="outline" disabled={offset+LIMIT>=total || loading} onClick={()=>setOffset(offset+LIMIT)}>Próxima</Button></div>
  </div></div>;
}
