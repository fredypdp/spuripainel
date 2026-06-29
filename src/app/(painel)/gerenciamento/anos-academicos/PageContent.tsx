"use client";

import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button/Button";
import SmartSelect from "@/components/form/SmartSelect";
import { academiaService } from "@/lib/api/services";
import { getCookie } from "@/lib/utils/cookies";
import type { Curso } from "@/types/api";

const ANOS_FUNDAMENTAL = Array.from({ length: 9 }, (_, index) => `${index + 1}_ano_fundamental`);
const ANOS_MEDIO = Array.from({ length: 3 }, (_, index) => `${index + 1}_ano_medio`);

type TipoEscopo = "fundamental" | "medio" | "superior";
type UserCookie = {
  tipo?: string;
  academia?: { nivel?: string; nivel_escolar?: string; anos_academicos?: string[] };
};

function getUserCookie(): UserCookie | null {
  try {
    return JSON.parse(getCookie("user") ?? "");
  } catch {
    return null;
  }
}

function formatScope(value: string) {
  return value.replace(/_/g, " ").replace(/^(\d+)/, "$1º");
}

function anosSuperioresDerivados(periodos: number) {
  return Array.from({ length: Math.ceil(periodos / 2) }, (_, index) => `${index + 1}_ano_superior`);
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
  const [periodos, setPeriodos] = useState(6);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const academiaAtual = academia ?? user?.academia;
  const tipoAcademia = academiaAtual?.nivel === "superior" ? "superior" : academiaAtual?.nivel_escolar ?? "fundamental";

  const tiposDisponiveis = useMemo<TipoEscopo[]>(() => {
    if (tipoAcademia === "superior") return ["superior"];
    if (tipoAcademia === "medio") return ["medio"];
    if (tipoAcademia === "misto") return ["fundamental", "medio"];
    return ["fundamental"];
  }, [tipoAcademia]);

  const cursosDoTipo = cursos.filter((curso) => curso.type === tipo && curso.status !== "deletado");
  const cursoSelecionado = cursos.find((curso) => curso.id === cursoId);
  const opcoesAnos = tipo === "fundamental" ? ANOS_FUNDAMENTAL : ANOS_MEDIO;

  async function carregar() {
    if (!isAcademia) return;
    setLoading(true);
    try {
      const response = await academiaService.listarAnosAcademicos(token);
      setAcademia(response.academia);
      setCursos(response.cursos ?? []);
      setMessage(null);
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message ?? "Erro ao consultar anos acadêmicos." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAcademia]);

  useEffect(() => {
    if (!tiposDisponiveis.includes(tipo)) setTipo(tiposDisponiveis[0] ?? "fundamental");
  }, [tipo, tiposDisponiveis]);

  function toggleAno(ano: string) {
    setSelecionados((current) => current.includes(ano) ? current.filter((item) => item !== ano) : [...current, ano]);
  }

  function validarOperacao() {
    if (tipo !== "fundamental" && !cursoId) return "Selecione o curso.";
    if (tipo !== "superior" && selecionados.length === 0) return "Selecione pelo menos um ano acadêmico.";
    if (tipo === "superior" && (!Number.isInteger(periodos) || periodos <= 0)) return "Informe uma quantidade inteira positiva de semestres.";
    return "";
  }

  async function enviar(modo: "add" | "replace" | "remove") {
    const validation = validarOperacao();
    if (validation) {
      setMessage({ type: "error", text: validation });
      return;
    }

    const payload = tipo === "fundamental"
      ? { type: "fundamental" as const, anos_academicos: selecionados }
      : tipo === "medio"
        ? { type: "medio" as const, curso_id: cursoId, anos_academicos: selecionados }
        : { type: "superior" as const, curso_id: cursoId, periodos };

    try {
      if (modo === "add") await academiaService.adicionarAnosAcademicos(payload, token);
      if (modo === "replace") await academiaService.substituirAnosAcademicos(payload, token);
      if (modo === "remove") await academiaService.removerAnosAcademicos(payload, token);
      setMessage({
        type: "success",
        text: "Operação concluída. Remoções são lógicas/prospectivas e podem ser bloqueadas quando há dados dependentes.",
      });
      await carregar();
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message ?? "Operação bloqueada pela API por validações avançadas." });
    }
  }

  if (!isAcademia) {
    return <div className="rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-500/10 dark:text-red-300">Acesso disponível apenas para academias.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Anos acadêmicos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Consulte, habilite, substitua ou desabilite escopos acadêmicos por tipo de academia.</p>
        </div>
        <Button size="sm" variant="outline" onClick={carregar} disabled={loading}>Carregar</Button>
      </div>

      {message && (
        <div className={`rounded-lg p-3 text-sm ${message.type === "error" ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" : "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300"}`}>
          {message.text}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">Visão atual unificada</h2>
        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Anos fundamentais da academia: {(academiaAtual?.anos_academicos ?? []).map(formatScope).join(", ") || "sem anos fundamentais ativos"}
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {cursos.map((curso) => (
                <div key={curso.id} className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
                  <b className="text-gray-900 dark:text-white">{curso.nome}</b>
                  <p className="text-gray-500 dark:text-gray-400">Tipo: {curso.type} · Status: {curso.status}</p>
                  <p className="text-gray-500 dark:text-gray-400">Anos acadêmicos: {curso.anos_academicos.map(formatScope).join(", ") || "—"}</p>
                  {curso.type === "superior" && (
                    <p className="text-gray-500 dark:text-gray-400">
                      Semestres: {(curso.periodos ?? []).map(formatScope).join(", ") || "—"}; anos derivados: {anosSuperioresDerivados(curso.periodos?.length || 0).map(formatScope).join(", ") || "—"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="grid gap-3 md:grid-cols-3">
          <SmartSelect
            value={tipo}
            options={tiposDisponiveis.map((value) => ({ value, label: value === "fundamental" ? "Fundamental" : value === "medio" ? "Médio" : "Superior" }))}
            onChange={(value) => { setTipo(value as TipoEscopo); setSelecionados([]); setCursoId(""); }}
          />
          <SmartSelect
            value={cursoId}
            options={cursosDoTipo.map((curso) => ({ value: curso.id, label: curso.nome }))}
            onChange={(value) => {
              setCursoId(value);
              const curso = cursos.find((item) => item.id === value);
              if (curso?.type === "superior") setPeriodos(curso.periodos?.length || 1);
            }}
            searchable
            placeholder="Curso (médio/superior)"
            disabled={tipo === "fundamental"}
          />
          {tipo === "superior" && (
            <input
              type="number"
              min={1}
              value={periodos}
              onChange={(event) => setPeriodos(Math.max(1, Number(event.target.value)))}
              className="rounded-lg border border-gray-300 bg-white p-2 text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              placeholder="Total de semestres"
            />
          )}
        </div>

        {tipo !== "superior" && (
          <div className="flex flex-wrap gap-2">
            {opcoesAnos.map((ano) => (
              <button
                type="button"
                key={ano}
                onClick={() => toggleAno(ano)}
                className={`rounded-full border px-3 py-1 text-sm ${selecionados.includes(ano) ? "border-brand-500 bg-brand-500 text-white" : "border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"}`}
              >
                {formatScope(ano)}
              </button>
            ))}
          </div>
        )}

        {tipo === "superior" && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {cursoSelecionado ? `Curso selecionado: ${cursoSelecionado.nome}. ` : ""}
            Serão enviados {periodos} semestres; anos superiores derivados: {anosSuperioresDerivados(periodos).map(formatScope).join(", ")}.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => enviar("add")}>Adicionar/habilitar</Button>
          <Button variant="outline" onClick={() => enviar("replace")}>Substituir escopo</Button>
          <button type="button" onClick={() => enviar("remove")} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Remover logicamente</button>
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Remoções são prospectivas e podem ser bloqueadas pela API quando existirem estudantes ativos, turmas, matérias, notas, faltas, avaliações finais ou sumários dependentes.
        </p>
      </section>
    </div>
  );
}
