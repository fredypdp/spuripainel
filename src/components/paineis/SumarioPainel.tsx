"use client";

import { useEffect, useState } from "react";
import { academiaService, tokenStorage, useApi } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import type { Materia, MeuPerfilResponse, Periodo, Sumario } from "@/types/api";
import { getCookie } from "@/lib/utils/cookies";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import SearchableSelect from "@/components/form/SearchableSelect";
import { Modal } from "@/components/ui/modal";

const PERIODOS_ESCOLARES: { value: Periodo; label: string }[] = [
  { value: "1_trimestre", label: "1º Trimestre" },
  { value: "2_trimestre", label: "2º Trimestre" },
  { value: "3_trimestre", label: "3º Trimestre" },
];

function getUserFromCookie(): MeuPerfilResponse | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(getCookie("user") ?? ""); } catch { return null; }
}

function formatarPeriodo(periodo: string) {
  const semestre = periodo.match(/^(\d+)_semestre$/);
  return semestre ? `${semestre[1]}º Semestre` : periodo.replace(/_/g, " ");
}

function formatarAno(ano: string) {
  const match = ano.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!match) return ano.replace(/_/g, " ");
  const [, numero, nivel] = match;
  return nivel === "fundamental" ? `${numero}ª Classe` : `${numero}º Ano ${nivel === "medio" ? "Médio" : "Superior"}`;
}

interface FormData {
  sumario_titulo: string;
  descricao: string;
  materia_id: string;
  periodo: string;
  ano_academico: string;
}

const emptyForm: FormData = { sumario_titulo: "", descricao: "", materia_id: "", periodo: "", ano_academico: "" };

export default function SumarioPainel() {
  const [user] = useState<MeuPerfilResponse | null>(getUserFromCookie);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Sumario | null>(null);
  const [deleting, setDeleting] = useState<Sumario | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [alert, setAlert] = useState<{ variant: "success" | "error"; message: string } | null>(null);

  const { execute: listarSumarios, data: sumariosData, loading: loadingSumarios } = useApi(academiaService.listarSumarios);
  const { execute: listarMaterias, data: materiasData, loading: loadingMaterias } = useApi(academiaService.listarMaterias);
  const { execute: criarSumario, loading: savingCreate } = useApi(academiaService.criarSumario);
  const { execute: atualizarSumario, loading: savingEdit } = useApi(academiaService.atualizarSumario);
  const { execute: deletarSumario, loading: deletingSumario } = useApi(academiaService.deletarSumario);

  const sumarios = sumariosData?.sumarios ?? [];
  const materias: Materia[] = materiasData?.materias ?? [];
  const materiaSelecionada = materias.find(m => m.id === form.materia_id);
  const saving = savingCreate || savingEdit;

  const carregarDados = () => {
    const token = tokenStorage.get() ?? undefined;
    return Promise.all([listarSumarios(token), listarMaterias(token)]);
  };

  useEffect(() => { void carregarDados(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showMessage = (variant: "success" | "error", message: string) => {
    setAlert({ variant, message });
    window.setTimeout(() => setAlert(null), 5000);
  };

  const resetForm = () => { setForm(emptyForm); setEditing(null); setShowForm(false); };

  const selecionarMateria = (materia_id: string) => {
    const materia = materias.find(m => m.id === materia_id);
    setForm({
      ...emptyForm,
      materia_id,
      periodo: materia?.type === "superior" ? (materia.periodo ?? "") : "",
    });
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.sumario_titulo.trim()) return showMessage("error", "O título do sumário é obrigatório.");
    if (!editing && (!form.materia_id || !form.periodo || !form.ano_academico)) return showMessage("error", "Selecione matéria, período e ano académico.");
    try {
      if (editing) {
        await atualizarSumario(editing.id, { sumario_titulo: form.sumario_titulo.trim(), descricao: form.descricao.trim() || undefined });
        showMessage("success", "Sumário atualizado com sucesso.");
      } else {
        await criarSumario({
          sumario_titulo: form.sumario_titulo.trim(), descricao: form.descricao.trim() || undefined,
          materia_id: form.materia_id, periodo: form.periodo as Periodo, ano_academico: form.ano_academico as any,
        });
        showMessage("success", "Sumário criado com sucesso.");
      }
      resetForm();
      await carregarDados();
    } catch (error) { showMessage("error", formatApiError(error, "Não foi possível salvar o sumário.")); }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deletarSumario(deleting.id);
      showMessage("success", "Sumário deletado com sucesso.");
      setDeleting(null);
      await carregarDados();
    } catch (error) { showMessage("error", formatApiError(error, "Não foi possível deletar o sumário.")); }
  }

  const abrirEdicao = (sumario: Sumario) => {
    setEditing(sumario);
    setForm({ ...emptyForm, sumario_titulo: sumario.sumario_titulo, descricao: sumario.descricao ?? "" });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {alert && <Alert variant={alert.variant} title={alert.variant === "success" ? "Sucesso" : "Erro"} message={alert.message} />}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sumários de Aula</h2><p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Gerencie os sumários das aulas da sua {user?.academia?.nivel === "superior" ? "Universidade" : "Escola"}.</p></div>
        {!showForm && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void carregarDados()} disabled={loadingSumarios || loadingMaterias}><Icon icon="mdi:refresh" width={16} />Atualizar</Button><Button size="sm" onClick={() => setShowForm(true)}><Icon icon="mdi:plus" width={16} />Novo Sumário</Button></div>}
      </div>

      {showForm && <div className="rounded-lg bg-white p-6 shadow-theme-xs dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{editing ? `Editar: ${editing.sumario_titulo}` : "Novo Sumário"}</h3>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Título *</label><input value={form.sumario_titulo} onChange={e => setForm({ ...form, sumario_titulo: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="Ex: Equações do 1º grau" /></div>
          <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label><textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white" rows={3} placeholder="Opcional" /></div>
          {!editing && <>
            <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Matéria *</label><SearchableSelect value={form.materia_id} onChange={v => selecionarMateria(v || "")} isClearable={false} options={[{ value: "", label: "Selecione uma matéria" }, ...materias.filter(m => m.status === "ativo").map(m => ({ value: m.id, label: m.nome }))]} /></div>
            {materiaSelecionada && <><div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Período *</label>{materiaSelecionada.type === "superior" ? <input readOnly value={formatarPeriodo(materiaSelecionada.periodo ?? "")} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300" /> : <SearchableSelect value={form.periodo} onChange={v => setForm({ ...form, periodo: v || "" })} isClearable={false} options={[{ value: "", label: "Selecione o período" }, ...PERIODOS_ESCOLARES]} />}</div>
            <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Ano académico *</label><SearchableSelect value={form.ano_academico} onChange={v => setForm({ ...form, ano_academico: v || "" })} isClearable={false} options={[{ value: "", label: "Selecione o ano" }, ...(materiaSelecionada.anos_academicos ?? []).map(ano => ({ value: ano, label: formatarAno(ano) }))]} /></div></>}
          </>}
          {editing && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">Matéria, período e ano académico não podem ser alterados. Para mudá-los, delete este sumário e crie outro.</p>}
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={resetForm} disabled={saving}>Cancelar</Button><Button disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar sumário"}</Button></div>
        </form>
      </div>}

      {loadingSumarios ? <div className="py-12 text-center text-gray-500">Carregando sumários...</div> : sumarios.length === 0 ? <div className="rounded-lg bg-white py-12 text-center text-gray-500 shadow-theme-xs dark:bg-gray-800"><Icon icon="mdi:book-open-page-variant-outline" width={48} className="mx-auto mb-3 opacity-30" /><p>Nenhum sumário cadastrado.</p></div> : <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700"><table className="min-w-[720px] w-full text-sm"><thead className="bg-gray-50 dark:bg-gray-800/70"><tr><th className="px-4 py-3 text-left">Título</th><th className="px-4 py-3 text-left">Matéria</th><th className="px-4 py-3 text-left">Período</th><th className="px-4 py-3 text-left">Ano Académico</th><th className="px-4 py-3 text-right">Ações</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">{sumarios.map(s => <tr key={s.id} className="bg-white dark:bg-gray-800"><td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.sumario_titulo}</td><td className="px-4 py-3 text-gray-600 dark:text-gray-300">{materias.find(m => m.id === s.materia_id)?.nome ?? s.materia_id}</td><td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatarPeriodo(s.periodo)}</td><td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatarAno(s.ano_academico)}</td><td className="px-4 py-3 text-right"><button onClick={() => abrirEdicao(s)} className="mr-3 text-brand-600 hover:text-brand-700">Editar</button><button onClick={() => setDeleting(s)} className="text-red-600 hover:text-red-700">Deletar</button></td></tr>)}</tbody></table></div>}

      {deleting && <Modal isOpen onClose={() => setDeleting(null)} className="max-w-[420px] p-5 lg:p-8"><h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Deletar Sumário</h3><p className="mb-5 text-sm text-gray-600 dark:text-gray-400">Deseja deletar <strong>{deleting.sumario_titulo}</strong>? As faltas já registradas continuarão mostrando o título atual deste sumário.</p><div className="flex justify-end gap-3"><Button size="sm" variant="outline" onClick={() => setDeleting(null)} disabled={deletingSumario}>Cancelar</Button><Button size="sm" variant="danger" onClick={() => void handleDelete()} disabled={deletingSumario}>{deletingSumario ? "Deletando..." : "Deletar"}</Button></div></Modal>}
    </div>
  );
}
