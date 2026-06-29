"use client";

import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import SmartSelect from "@/components/form/SmartSelect";
import { academiaService } from "@/lib/api/services";
import { getCookie } from "@/lib/utils/cookies";
import type { Curso, Materia, Sumario } from "@/types/api";

const PERIODOS_TRIMESTRAIS = ["1_trimestre", "2_trimestre", "3_trimestre"];

type UserCookie = {
  tipo?: string;
  academia?: { nivel?: string; nivel_escolar?: string; anos_academicos?: string[] };
};

type SumarioForm = {
  sumario_titulo: string;
  descricao: string;
  periodo: string;
  ano_academico: string;
  curso_id: string;
  materia_id: string;
};

const emptyForm: SumarioForm = {
  sumario_titulo: "",
  descricao: "",
  periodo: "",
  ano_academico: "",
  curso_id: "",
  materia_id: "",
};

function getUserCookie(): UserCookie | null {
  try {
    return JSON.parse(getCookie("user") ?? "");
  } catch {
    return null;
  }
}

function formatScope(value?: string) {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/^(\d+)/, "$1º");
}

function periodosSuperior(total = 12) {
  return Array.from({ length: total }, (_, index) => `${index + 1}_semestre`);
}

export default function PageContent() {
  const [user] = useState<UserCookie | null>(() => getUserCookie());
  const token = getCookie("token") || undefined;
  const isAcademia = user?.tipo === "academia";

  const [sumarios, setSumarios] = useState<Sumario[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [editing, setEditing] = useState<Sumario | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<Sumario | null>(null);
  const [form, setForm] = useState<SumarioForm>(emptyForm);
  const [filters, setFilters] = useState({ periodo: "", ano_academico: "", curso_id: "", materia_id: "" });

  const academia = user?.academia;
  const cursosAtivos = cursos.filter((curso) => curso.status === "ativo");
  const cursoSelecionado = cursos.find((curso) => curso.id === form.curso_id);
  const materiaSelecionada = materias.find((materia) => materia.id === form.materia_id);

  const anosDisponiveis = useMemo(() => {
    if (cursoSelecionado) return cursoSelecionado.anos_academicos;
    return academia?.anos_academicos ?? [];
  }, [academia?.anos_academicos, cursoSelecionado]);

  const periodosDisponiveis = useMemo(() => {
    if (cursoSelecionado?.type === "superior") return periodosSuperior(cursoSelecionado.periodos?.length || 12);
    if (materiaSelecionada?.type === "superior") return periodosSuperior(12);
    return PERIODOS_TRIMESTRAIS;
  }, [cursoSelecionado, materiaSelecionada]);

  async function carregar(params = filters) {
    if (!isAcademia) return;
    setLoading(true);
    try {
      const [sumariosResponse, cursosResponse, materiasResponse] = await Promise.all([
        academiaService.listarSumarios({
          token,
          periodo: params.periodo || undefined,
          ano_academico: params.ano_academico || undefined,
          curso_id: params.curso_id || undefined,
          materia_id: params.materia_id || undefined,
        }),
        academiaService.listarCursos(token),
        academiaService.listarMaterias(token),
      ]);
      setSumarios(sumariosResponse.sumarios ?? []);
      setCursos(cursosResponse.cursos ?? []);
      setMaterias(materiasResponse.materias ?? []);
      setMessage(null);
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message ?? "Erro ao carregar sumários." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAcademia]);

  function validarForm() {
    const titulo = form.sumario_titulo.trim();
    if (titulo.length < 3 || titulo.length > 200) return "Título obrigatório entre 3 e 200 caracteres.";
    if (!form.materia_id) return "Matéria é obrigatória.";
    if (!form.ano_academico) return "Ano acadêmico é obrigatório.";
    if (!form.periodo) return "Período é obrigatório.";
    const materia = materias.find((item) => item.id === form.materia_id);
    if ((materia?.type === "medio" || materia?.type === "superior") && !form.curso_id) {
      return "Curso é obrigatório para matérias de médio e superior.";
    }
    if (materia?.anos_academicos?.length && !materia.anos_academicos.includes(form.ano_academico)) {
      return "Ano acadêmico incompatível com a matéria selecionada.";
    }
    if (materia?.periodo && materia.periodo !== form.periodo) {
      return "Período incompatível com a matéria selecionada.";
    }
    if (form.curso_id && cursoSelecionado && !cursoSelecionado.anos_academicos.includes(form.ano_academico)) {
      return "Ano acadêmico incompatível com o curso selecionado.";
    }
    if (form.curso_id && cursoSelecionado?.type === "superior" && !cursoSelecionado.periodos?.includes(form.periodo)) {
      return "Período incompatível com o curso superior selecionado.";
    }
    return "";
  }

  async function salvar(event: React.FormEvent) {
    event.preventDefault();
    const validation = validarForm();
    if (validation) {
      setMessage({ type: "error", text: validation });
      return;
    }

    const payload = {
      sumario_titulo: form.sumario_titulo.trim(),
      descricao: form.descricao.trim() || undefined,
      periodo: form.periodo,
      ano_academico: form.ano_academico,
      curso_id: form.curso_id || undefined,
      materia_id: form.materia_id,
    };

    try {
      if (editing) await academiaService.atualizarSumario(editing.id, payload as any, token);
      else await academiaService.criarSumario(payload as any, token);
      setForm(emptyForm);
      setEditing(null);
      setMessage({ type: "success", text: "Sumário salvo com sucesso." });
      await carregar();
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message ?? "Erro ao salvar sumário." });
    }
  }

  async function remover(id: string) {
    try {
      await academiaService.deletarSumario(id, token);
      setMessage({ type: "success", text: "Sumário removido logicamente." });
      await carregar();
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message ?? "Remoção bloqueada pela API." });
    }
  }

  function editar(sumario: Sumario) {
    setEditing(sumario);
    setForm({
      sumario_titulo: sumario.sumario_titulo,
      descricao: sumario.descricao ?? "",
      periodo: sumario.periodo,
      ano_academico: sumario.ano_academico,
      curso_id: sumario.curso_id ?? "",
      materia_id: sumario.materia_id,
    });
  }

  if (!isAcademia) {
    return <div className="rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-500/10 dark:text-red-300">Acesso disponível apenas para academias.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sumários</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Liste, filtre, crie, visualize, edite e remova logicamente sumários.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => carregar()} disabled={loading}>
          <Icon icon="mdi:refresh" width={16} />
          Carregar
        </Button>
      </div>

      {message && (
        <div className={`rounded-lg p-3 text-sm ${message.type === "error" ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" : "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300"}`}>
          {message.text}
        </div>
      )}

      <section className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-4">
        <SmartSelect value={filters.curso_id} options={cursosAtivos.map((curso) => ({ value: curso.id, label: curso.nome }))} onChange={(value) => setFilters((prev) => ({ ...prev, curso_id: value }))} searchable placeholder="Filtrar por curso" />
        <SmartSelect value={filters.materia_id} options={materias.map((materia) => ({ value: materia.id, label: materia.nome }))} onChange={(value) => setFilters((prev) => ({ ...prev, materia_id: value }))} searchable placeholder="Filtrar por matéria" />
        <SmartSelect value={filters.ano_academico} options={[...(academia?.anos_academicos ?? []), ...cursos.flatMap((curso) => curso.anos_academicos)].filter((value, index, array) => array.indexOf(value) === index).map((value) => ({ value, label: formatScope(value) }))} onChange={(value) => setFilters((prev) => ({ ...prev, ano_academico: value }))} placeholder="Filtrar por ano" />
        <SmartSelect value={filters.periodo} options={[...PERIODOS_TRIMESTRAIS, ...periodosSuperior(12)].map((value) => ({ value, label: formatScope(value) }))} onChange={(value) => setFilters((prev) => ({ ...prev, periodo: value }))} placeholder="Filtrar por período" />
        <div className="flex gap-2 md:col-span-4">
          <Button size="sm" onClick={() => carregar(filters)} disabled={loading}>Aplicar filtros</Button>
          <Button size="sm" variant="outline" onClick={() => { const clean = { periodo: "", ano_academico: "", curso_id: "", materia_id: "" }; setFilters(clean); carregar(clean); }}>Limpar filtros</Button>
        </div>
      </section>

      <form onSubmit={salvar} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-2">
        <input className="rounded-lg border border-gray-300 bg-white p-2 text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-white" placeholder="Título do sumário *" value={form.sumario_titulo} onChange={(event) => setForm((prev) => ({ ...prev, sumario_titulo: event.target.value }))} />
        <SmartSelect value={form.curso_id} options={cursosAtivos.map((curso) => ({ value: curso.id, label: `${curso.nome} (${curso.type})` }))} onChange={(value) => setForm((prev) => ({ ...prev, curso_id: value, ano_academico: "", periodo: "" }))} searchable placeholder="Curso (quando aplicável)" />
        <SmartSelect value={form.materia_id} options={materias.map((materia) => ({ value: materia.id, label: materia.nome }))} onChange={(value) => setForm((prev) => ({ ...prev, materia_id: value }))} searchable placeholder="Matéria *" />
        <SmartSelect value={form.ano_academico} options={anosDisponiveis.map((value) => ({ value, label: formatScope(value) }))} onChange={(value) => setForm((prev) => ({ ...prev, ano_academico: value }))} placeholder="Ano acadêmico *" />
        <SmartSelect value={form.periodo} options={periodosDisponiveis.map((value) => ({ value, label: formatScope(value) }))} onChange={(value) => setForm((prev) => ({ ...prev, periodo: value }))} placeholder="Período *" />
        <textarea className="rounded-lg border border-gray-300 bg-white p-2 text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-white md:col-span-2" placeholder="Descrição" value={form.descricao} onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))} />
        <div className="flex gap-2 md:col-span-2">
          <Button>{editing ? "Atualizar" : "Criar"} sumário</Button>
          {editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyForm); }} className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700">Cancelar edição</button>}
        </div>
      </form>

      <section className="grid gap-3">
        {loading && <p className="rounded-xl bg-white p-4 text-gray-500 dark:bg-gray-900 dark:text-gray-400">Carregando sumários...</p>}
        {!loading && sumarios.length === 0 && <p className="rounded-xl bg-white p-4 text-gray-500 dark:bg-gray-900 dark:text-gray-400">Nenhum sumário encontrado.</p>}
        {!loading && sumarios.map((sumario) => (
          <article key={sumario.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{sumario.sumario_titulo}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatScope(sumario.ano_academico)} · {formatScope(sumario.periodo)} · {sumario.materia_nome || sumario.materia_id}</p>
                {sumario.descricao && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{sumario.descricao}</p>}
              </div>
              <div className="flex gap-3 text-sm">
                <button type="button" onClick={() => setSelectedDetail(sumario)} className="text-gray-600 hover:text-gray-900 dark:text-gray-300">Detalhes</button>
                <button type="button" onClick={() => editar(sumario)} className="text-brand-600 hover:text-brand-700">Editar</button>
                <button type="button" onClick={() => remover(sumario.id)} className="text-red-600 hover:text-red-700">Remover</button>
              </div>
            </div>
          </article>
        ))}
      </section>

      {selectedDetail && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-100">
          <div className="mb-2 flex items-center justify-between">
            <b>Detalhes do sumário</b>
            <button type="button" onClick={() => setSelectedDetail(null)}>Fechar</button>
          </div>
          <pre className="overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(selectedDetail, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
