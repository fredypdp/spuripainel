"use client";
import React, { useCallback, useEffect, useState } from "react";
import { academiaService, adminService } from "@/lib/api/services";
import { useUserType } from "@/hooks/useRoutePermission";
import type { SolicitacaoMatricula, SolicitacaoMatriculaStatus } from "@/types/api";
import Icon from "@/components/ui/Icon";

const statusOptions: Array<SolicitacaoMatriculaStatus | ""> = ["", "pendente", "aprovada", "reprovada"];

export default function PageContent(){
  const { user } = useUserType();
  const isAdmin = user?.tipo === "admin";
  const [status,setStatus]=useState<SolicitacaoMatriculaStatus|"">("pendente");
  const [items,setItems]=useState<SolicitacaoMatricula[]>([]);
  const [loading,setLoading]=useState(false); const [erro,setErro]=useState("");
  const [motivo,setMotivo]=useState<Record<string,string>>({});
  const carregar = useCallback(async () => { setLoading(true); setErro(""); try { const svc = isAdmin ? adminService.listarSolicitacoesMatricula : academiaService.listarSolicitacoesMatricula; const r=await svc({ status: status || undefined, limit:100 }); setItems((r as any).solicitacoes ?? []);} catch(e:any){setErro(e?.message??"Erro ao carregar solicitações");} finally{setLoading(false);} }, [isAdmin, status]);
  useEffect(()=>{ if(user?.tipo) carregar(); },[user?.tipo, carregar]);
  async function aprovar(codigo:string){ await academiaService.aprovarSolicitacaoMatricula(codigo); await carregar(); }
  async function reprovar(codigo:string){ const m=motivo[codigo]?.trim(); if(!m) return alert("Informe o motivo da reprovação."); await academiaService.reprovarSolicitacaoMatricula(codigo,{motivo_reprovacao:m}); await carregar(); }
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Solicitações de matrícula</h1><p className="text-sm text-gray-500">Analise pedidos públicos, aprove para criar o estudante ou reprove com motivo.</p></div><select value={status} onChange={e=>setStatus(e.target.value as any)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">{statusOptions.map(s=><option key={s||"todas"} value={s}>{s||"todas"}</option>)}</select></div>{erro&&<p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{erro}</p>}{loading?<div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"/>:<div className="grid gap-4">{items.map(s=><article key={s.codigo_solicitacao} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold text-gray-900 dark:text-white">{s.nome}</h2><p className="text-sm text-gray-500">{s.codigo_solicitacao} · {s.codigo_academia}{s.academia_nome?` · ${s.academia_nome}`:""}</p></div><span className="h-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium dark:bg-gray-800">{s.status}</span></div><div className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-600 dark:text-gray-300 md:grid-cols-3"><span><Icon icon="mdi:cake-variant-outline" className="mr-1 inline"/> {s.data_nascimento}</span><span>{s.email || "Sem email"}</span><span>{s.telefone || "Sem telefone"}</span><span>{s.ano_escolar_fundamental || s.ano_escolar_medio || s.ano_superior || "Ano não informado"}</span><span>{s.curso_medio_nome || s.curso_superior_nome || ""}</span></div>{!isAdmin && s.status==="pendente"&&<div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row"><button onClick={()=>aprovar(s.codigo_solicitacao)} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white">Aprovar e criar estudante</button><input placeholder="Motivo da reprovação" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" onChange={e=>setMotivo(p=>({...p,[s.codigo_solicitacao]:e.target.value}))}/><button onClick={()=>reprovar(s.codigo_solicitacao)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">Reprovar</button></div>}</article>)}{items.length===0&&<p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">Nenhuma solicitação encontrada.</p>}</div>}</div>;
}
