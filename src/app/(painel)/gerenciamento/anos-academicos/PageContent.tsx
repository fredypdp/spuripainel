"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button/Button";
import SmartSelect from "@/components/form/SmartSelect";
import { academiaService } from "@/lib/api/services";
import { getCookie } from "@/lib/utils/cookies";
import type { Curso } from "@/types/api";

const ANOS_FUNDAMENTAL = Array.from({ length: 9 }, (_, index) => `${index + 1}_ano_fundamental`);
const ANOS_MEDIO = Array.from({ length: 3 }, (_, index) => `${index + 1}_ano_medio`);

type TipoEscopo = "fundamental" | "medio";
type UserCookie = { tipo?: string; academia?: { nivel?: string; nivel_escolar?: string; anos_academicos?: string[] } };
type ApiDetail = { field?: string; code?: string; message?: string };
type Message = { type: "success" | "error" | "info"; text: string; field?: string; code?: string; requestId?: string };

function getUserCookie(): UserCookie | null { try { return JSON.parse(getCookie("user") ?? ""); } catch { return null; } }
function formatScope(value: string) { return value.replace(/_/g, " ").replace(/^(\d+)/, "$1º"); }
function anosSuperioresDerivados(periodos: number) { return Array.from({ length: Math.ceil(periodos / 2) }, (_, index) => `${index + 1}_ano_superior`); }
function sortByOrder(values: string[], order: string[]) { return [...new Set(values)].sort((a, b) => order.indexOf(a) - order.indexOf(b)); }
function isSequenciaMedioValida(values: string[]) { return values.length > 0 && values.every((value, index) => value === ANOS_MEDIO[index]); }
function parseApiError(error: any): Message {
  const data = error?.data ?? error?.response?.data;
  const detail: ApiDetail | undefined = data?.details?.[0];
  const requestId = data?.request_id;
  if (requestId) console.warn("Erro em anos acadêmicos", { request_id: requestId, detail, data });
  const guidance: Record<string, string> = {
    json_invalido: "Revise os dados enviados antes de tentar novamente.",
    valor_invalido: "Corrija o valor destacado.",
    nivel_incompativel: "Esta ação não é compatível com o perfil da academia.",
    tipo_diferente_do_curso: "Recarregue os cursos e confirme o tipo do curso selecionado.",
    campo_obrigatorio: "Preencha o campo obrigatório indicado.",
    nao_encontrado: "Recarregue a lista: o recurso pode não existir mais.",
    curso_de_outra_academia: "Recarregue os cursos da academia autenticada.",
    curso_inativo: "Ative o curso antes de alterar seus anos.",
    formato_invalido: "Use apenas os formatos aceitos pela API.",
    remocao_invalida: "A remoção deixaria o escopo inválido.",
    campo_nao_permitido: "Remova o campo não permitido do formulário.",
    estudantes_ativos_vinculados: "Transfira, conclua ou inative estudantes ativos antes de tentar novamente.",
    sequencia_invalida: "Cursos médios devem ser contínuos desde o 1º ano.",
    operacao_nao_suportada: "Cursos superiores são somente leitura nesta tela.",
  };
  const text = [detail?.message || data?.message || error?.message || "Operação bloqueada pela API.", detail?.code ? guidance[detail.code] : undefined, requestId ? `Request ID: ${requestId}` : undefined].filter(Boolean).join(" ");
  return { type: "error", text, field: detail?.field, code: detail?.code, requestId };
}

export default function PageContent() {
  const [user] = useState<UserCookie | null>(() => getUserCookie());
  const token = getCookie("token") || undefined;
  const isAcademia = user?.tipo === "academia";
  const [academia, setAcademia] = useState<UserCookie["academia"] | null>(null);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [tipo, setTipo] = useState<TipoEscopo>("fundamental");
  const [cursoId, setCursoId] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const academiaAtual = academia ?? user?.academia;
  const tipoAcademia = academiaAtual?.nivel === "superior" ? "superior" : academiaAtual?.nivel_escolar ?? "fundamental";
  const tiposDisponiveis = useMemo<TipoEscopo[]>(() => tipoAcademia === "misto" ? ["fundamental", "medio"] : tipoAcademia === "medio" ? ["medio"] : tipoAcademia === "superior" ? [] : ["fundamental"], [tipoAcademia]);
  const cursosMedio = cursos.filter((curso) => curso.type === "medio" && curso.status !== "deletado");
  const cursosSuperior = cursos.filter((curso) => curso.type === "superior" && curso.status !== "deletado");
  const cursoSelecionado = cursos.find((curso) => curso.id === cursoId);

  const carregar = useCallback(async () => {
    if (!isAcademia) return;
    setLoading(true);
    try { const response = await academiaService.listarAnosAcademicos(token); setAcademia(response.academia); setCursos(response.cursos ?? []); setMessage(null); }
    catch (error: any) { setMessage(parseApiError(error)); }
    finally { setLoading(false); }
  }, [isAcademia, token]);
  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { if (tiposDisponiveis.length && !tiposDisponiveis.includes(tipo)) setTipo(tiposDisponiveis[0]); }, [tipo, tiposDisponiveis]);

  function toggleAno(ano: string) { setSelecionados((current) => current.includes(ano) ? current.filter((item) => item !== ano) : [...current, ano]); }
  function validarOperacao(modo: "add" | "remove") {
    if (tipo === "medio" && !cursoId) return "Selecione o curso médio.";
    if (selecionados.length === 0) return "Selecione pelo menos um ano acadêmico.";
    if (tipo === "fundamental" && modo === "remove") {
      const finais = (academiaAtual?.anos_academicos ?? []).filter((ano) => !selecionados.includes(ano));
      if (finais.length === 0) return "A academia fundamental/mista deve manter pelo menos um ano ativo.";
    }
    if (tipo === "medio") {
      const atuais = cursoSelecionado?.anos_academicos ?? [];
      const finais = modo === "add" ? sortByOrder([...atuais, ...selecionados], ANOS_MEDIO) : sortByOrder(atuais.filter((ano) => !selecionados.includes(ano)), ANOS_MEDIO);
      if (!isSequenciaMedioValida(finais)) return "Cursos médios devem manter sequência contínua, sem duplicados, iniciada em 1º ano médio e não podem ficar vazios.";
    }
    return "";
  }
  async function enviar(modo: "add" | "remove") {
    const validation = validarOperacao(modo); if (validation) { setMessage({ type: "error", text: validation, field: tipo === "medio" ? "anos_academicos" : undefined }); return; }
    const payload = tipo === "fundamental" ? { type: "fundamental" as const, anos_academicos: selecionados } : { type: "medio" as const, curso_id: cursoId, anos_academicos: selecionados };
    try { if (modo === "add") await academiaService.adicionarAnosAcademicos(payload, token); else await academiaService.removerAnosAcademicos(payload, token); setSelecionados([]); setMessage({ type: "success", text: "Operação incremental concluída com sucesso." }); await carregar(); }
    catch (error: any) { setMessage(parseApiError(error)); }
  }

  if (!isAcademia) return <div className="rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-500/10 dark:text-red-300">Acesso disponível apenas para academias.</div>;
  const campoErro = (field: string) => message?.field === field ? " ring-2 ring-red-400" : "";
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Anos acadêmicos</h1><p className="text-sm text-gray-500 dark:text-gray-400">Consulte os escopos atuais e use ações incrementais: adicionar ou remover. Não há substituição em massa.</p></div><Button size="sm" variant="outline" onClick={carregar} disabled={loading}>Carregar</Button></div>
    {message && <div className={`rounded-lg p-3 text-sm ${message.type === "error" ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" : message.type === "info" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300"}`}>{message.text}</div>}
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"><h2 className="mb-3 font-semibold text-gray-900 dark:text-white">Visão atual</h2>{loading ? <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p> : <><p className="text-sm text-gray-600 dark:text-gray-300">Anos fundamentais da academia: {(academiaAtual?.anos_academicos ?? []).map(formatScope).join(", ") || "sem anos fundamentais ativos"}</p><div className="mt-3 grid gap-3 md:grid-cols-2">{cursos.map((curso) => <div key={curso.id} className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700"><b className="text-gray-900 dark:text-white">{curso.nome}</b><p className="text-gray-500 dark:text-gray-400">Tipo: {curso.type} · Status: {curso.status}</p><p className="text-gray-500 dark:text-gray-400">Anos acadêmicos: {curso.anos_academicos.map(formatScope).join(", ") || "—"}</p>{curso.type === "superior" && <p className="text-gray-500 dark:text-gray-400">Semestres: {(curso.periodos ?? []).map(formatScope).join(", ") || "—"}; anos derivados: {anosSuperioresDerivados(curso.periodos?.length || 0).map(formatScope).join(", ") || "—"}</p>}</div>)}</div></>}</section>
    {tipoAcademia === "superior" ? <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-200">Cursos superiores são somente leitura nesta tela. Semestres e anos superiores são derivados dos períodos cadastrados no curso; a edição cadastral de curso não manipula períodos.</section> : <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"><div className="grid gap-3 md:grid-cols-2"><div className={campoErro("type")}><SmartSelect value={tipo} options={tiposDisponiveis.map((value) => ({ value, label: value === "fundamental" ? "Fundamental" : "Médio" }))} onChange={(value) => { setTipo(value as TipoEscopo); setSelecionados([]); setCursoId(""); }} /></div><div className={campoErro("curso_id")}><SmartSelect value={cursoId} options={cursosMedio.map((curso) => ({ value: curso.id, label: curso.nome }))} onChange={setCursoId} searchable placeholder="Curso médio" disabled={tipo === "fundamental"} /></div></div><div className={`flex flex-wrap gap-2${campoErro("anos_academicos")}`}>{(tipo === "fundamental" ? ANOS_FUNDAMENTAL : ANOS_MEDIO).map((ano) => <button type="button" key={ano} onClick={() => toggleAno(ano)} className={`rounded-full border px-3 py-1 text-sm ${selecionados.includes(ano) ? "border-brand-500 bg-brand-500 text-white" : "border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"}`}>{formatScope(ano)}</button>)}</div><div className="flex flex-wrap gap-2"><Button onClick={() => enviar("add")}>Adicionar/habilitar</Button><button type="button" onClick={() => enviar("remove")} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Remover logicamente</button></div><p className="text-xs text-amber-600 dark:text-amber-400">Remoções são prospectivas e podem ser bloqueadas quando existirem estudantes ativos, turmas, matérias, notas, faltas ou avaliações finais vinculados.</p></section>}
    {cursosSuperior.length > 0 && <section className="rounded-xl border border-gray-200 bg-white p-4 text-sm dark:border-gray-800 dark:bg-gray-900"><h2 className="font-semibold text-gray-900 dark:text-white">Cursos superiores em leitura</h2><p className="mt-1 text-gray-500 dark:text-gray-400">Não envie alterações de anos/períodos superiores por esta rota.</p></section>}
  </div>;
}
