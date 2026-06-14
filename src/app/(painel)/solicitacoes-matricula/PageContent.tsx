"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { academiaService, adminService } from "@/lib/api/services";
import { useUserType } from "@/hooks/useRoutePermission";
import type { SolicitacaoMatricula, SolicitacaoMatriculaDocumento, SolicitacaoMatriculaStatus } from "@/types/api";
import Icon from "@/components/ui/Icon";

const statusOptions: Array<SolicitacaoMatriculaStatus | ""> = ["", "pendente", "aprovada", "reprovada"];
const docLabels: Record<string, string> = {
  bi_estudante: "BI do estudante",
  bi_responsavel: "BI do responsável",
  cedula: "Cédula do estudante",
  cedula_estudante: "Cédula do estudante",
  declaracao: "Declaração",
  certificado_6_ano_fundamental: "Certificado do 6.º ano",
  certificado_9_ano_fundamental: "Certificado do 9.º ano",
  certificado_ensino_medio: "Certificado do ensino médio",
};

function anoLabel(s: SolicitacaoMatricula) {
  return s.ano_escolar_fundamental || s.ano_escolar_medio || s.ano_superior || "Ano não informado";
}
function documentoUrl(value: SolicitacaoMatriculaDocumento | string) {
  if (typeof value === "string") return value;
  return value.file_url || value.download_url || value.url || value.path;
}
function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-PT");
}

export default function PageContent() {
  const { user } = useUserType();
  const isAdmin = user?.tipo === "admin";
  const [status, setStatus] = useState<SolicitacaoMatriculaStatus | "">("pendente");
  const [ordem, setOrdem] = useState<"recentes" | "antigas">("recentes");
  const [items, setItems] = useState<SolicitacaoMatricula[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [motivo, setMotivo] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const svc = isAdmin ? adminService.listarSolicitacoesMatricula : academiaService.listarSolicitacoesMatricula;
      const r = await svc({ status: status || undefined, limit: 100 });
      setItems((r as any).solicitacoes ?? []);
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, status]);

  useEffect(() => { if (user?.tipo) carregar(); }, [user?.tipo, carregar]);

  const grupos = useMemo(() => {
    const ordenadas = [...items].sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return ordem === "recentes" ? -diff : diff;
    });
    return ordenadas.reduce<Record<string, SolicitacaoMatricula[]>>((acc, item) => {
      const key = anoLabel(item);
      acc[key] = acc[key] ? [...acc[key], item] : [item];
      return acc;
    }, {});
  }, [items, ordem]);

  async function aprovar(codigo: string) { await academiaService.aprovarSolicitacaoMatricula(codigo); await carregar(); }
  async function reprovar(codigo: string) {
    const m = motivo[codigo]?.trim();
    if (!m) return alert("Informe o motivo da reprovação.");
    await academiaService.reprovarSolicitacaoMatricula(codigo, { motivo_reprovacao: m });
    await carregar();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Solicitações de matrícula</h1>
          <p className="text-sm text-gray-500">Pedidos agrupados por ano acadêmico, com dados pessoais, decisão e documentos anexados.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">{statusOptions.map((s) => <option key={s || "todas"} value={s}>{s || "todas"}</option>)}</select>
          <select value={ordem} onChange={(e) => setOrdem(e.target.value as any)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"><option value="recentes">Mais recentes</option><option value="antigas">Mais antigas</option></select>
        </div>
      </div>

      {erro && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{erro}</p>}
      {loading ? <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" /> : Object.entries(grupos).length === 0 ? <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">Nenhuma solicitação encontrada.</p> : Object.entries(grupos).map(([ano, solicitacoes]) => (
        <section key={ano} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white"><Icon icon="mdi:calendar-blank-outline" /> {ano}</h2>
          <div className="grid gap-4">
            {solicitacoes.map((s) => (
              <article key={s.codigo_solicitacao} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold text-gray-900 dark:text-white">{s.nome}</h3><p className="text-sm text-gray-500">{s.codigo_solicitacao} · {s.codigo_academia}{s.academia_nome ? ` · ${s.academia_nome}` : ""}</p></div><span className="h-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize dark:bg-gray-800">{s.status}</span></div>
                <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-600 dark:text-gray-300 md:grid-cols-4"><span>Nascimento: {formatDate(s.data_nascimento)}</span><span>Género: {s.genero}</span><span>Telefone: {s.telefone || "-"}</span><span>Email: {s.email || "-"}</span><span>BI estudante: {s.bilhete_identidade || "-"}</span><span>BI responsável: {s.bilhete_identidade_responsavel || "-"}</span><span>Curso: {s.curso_medio_nome || s.curso_superior_nome || "Não se aplica"}</span><span>Criada em: {formatDate(s.created_at)}</span></div>
                {!!s.documentos && <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-950"><h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Documentos</h4><div className="flex flex-wrap gap-2">{Object.entries(s.documentos).map(([key, value]) => { const url = documentoUrl(value); return <a key={key} href={url} target="_blank" rel="noreferrer" className="rounded-full border border-gray-200 px-3 py-1 text-xs text-brand-600 hover:bg-brand-50 dark:border-gray-700 dark:text-brand-300">{docLabels[key] || key}</a>; })}</div></div>}
                {!isAdmin && s.status === "pendente" && <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row"><button onClick={() => aprovar(s.codigo_solicitacao)} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white">Aprovar e criar estudante</button><input placeholder="Motivo da reprovação" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" onChange={(e) => setMotivo((p) => ({ ...p, [s.codigo_solicitacao]: e.target.value }))} /><button onClick={() => reprovar(s.codigo_solicitacao)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">Reprovar</button></div>}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
