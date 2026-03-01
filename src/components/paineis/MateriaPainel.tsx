"use client"
import { useState, useEffect } from "react";
import { useApi, academiaService } from "@/lib/api";
import { Materia, Curso, MateriaType } from "@/types/api";
import Icon from "@/components/ui/Icon";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { getCookie } from '@/lib/utils/cookies';
import type { MeuPerfilResponse } from '@/types/api';

interface MateriaFormData {
  nome: string;
  type: MateriaType;
  anos_academicos: string[];
  curso_id?: string;
}

const ANOS_FUNDAMENTAL = [
  { value: "primeiro_fundamental", label: "1º Ano" },
  { value: "segundo_fundamental",  label: "2º Ano" },
  { value: "terceiro_fundamental", label: "3º Ano" },
  { value: "quarto_fundamental",   label: "4º Ano" },
  { value: "quinto_fundamental",   label: "5º Ano" },
  { value: "sexto_fundamental",    label: "6º Ano" },
  { value: "setimo_fundamental",   label: "7º Ano" },
  { value: "oitavo_fundamental",   label: "8º Ano" },
  { value: "nono_fundamental",     label: "9º Ano" },
];

const ANOS_MEDIO = [
  { value: "primeiro_medio",  label: "1º Ano Médio" },
  { value: "segundo_medio",   label: "2º Ano Médio" },
  { value: "terceiro_medio",  label: "3º Ano Médio" },
  { value: "quarto_medio",    label: "4º Ano Médio" },
];

const ANOS_SUPERIOR = [
  { value: "primeiro_ano", label: "1º Ano" },
  { value: "segundo_ano",  label: "2º Ano" },
  { value: "terceiro_ano", label: "3º Ano" },
  { value: "quarto_ano",   label: "4º Ano" },
  { value: "quinto_ano",   label: "5º Ano" },
  { value: "sexto_ano",    label: "6º Ano" },
];

const PERIODOS_LABEL: Record<string, string> = {
  "1_trimestre": "1º Trimestre",
  "2_trimestre": "2º Trimestre",
  "3_trimestre": "3º Trimestre",
  "1_semestre":  "1º Semestre",
  "2_semestre":  "2º Semestre",
};

const getUserFromCookie = (): MeuPerfilResponse | null => {
  if (typeof window === "undefined") return null;
  const c = getCookie("user");
  if (!c) return null;
  try { return JSON.parse(c); } catch { return null; }
};

// ── Modal: Definir Período ────────────────────────────────────────────────────

function ModalDefinirPeriodo({
  materia,
  periodos,
  onConfirm,
  onClose,
}: {
  materia: Materia;
  periodos: string[];
  onConfirm: (periodo: string) => Promise<void>;
  onClose: () => void;
}) {
  const [periodo, setPeriodo] = useState(periodos[0] ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!periodo) { setError("Selecione um período."); return; }
    setLoading(true);
    try {
      await onConfirm(periodo);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Erro ao definir período.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Definir Período</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Matéria: <span className="font-medium text-gray-700 dark:text-gray-200">{materia.nome}</span>
        </p>
        {error && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Período *</label>
            <select
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Selecione</option>
              {periodos.map(p => (
                <option key={p} value={p}>{PERIODOS_LABEL[p] ?? p.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button size="sm" disabled={loading}>
              {loading ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: Confirmar Deleção ──────────────────────────────────────────────────

function ModalConfirmarDelete({
  materia,
  onConfirm,
  onClose,
}: {
  materia: Materia;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    try { await onConfirm(); onClose(); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Deletar Matéria</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Tem certeza que deseja deletar <span className="font-medium text-gray-700 dark:text-gray-200">{materia.nome}</span>? Esta ação não pode ser desfeita (o histórico é preservado no ledger).
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancelar</Button>
          <button
            onClick={handle}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Deletando..." : "Deletar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function MateriaPainel() {
  const [showForm, setShowForm] = useState(false);
  const [editingMateria, setEditingMateria] = useState<Materia | null>(null);
  const [alert, setAlert] = useState<{ variant: "success" | "error" | "warning" | "info"; message: string } | null>(null);
  const [user] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());

  // Modal: definir período
  const [materiaParaPeriodo, setMateriaParaPeriodo] = useState<Materia | null>(null);
  // Modal: confirmar delete
  const [materiaParaDelete, setMateriaParaDelete] = useState<Materia | null>(null);

  const { execute: executarCriarMateria,      loading: criandoMateria }    = useApi(academiaService.criarMateria);
  const { execute: executarAtualizarMateria,  loading: atualizandoMateria } = useApi(academiaService.atualizarMateria);
  const { execute: executarListarMaterias,    data: materias, loading: ListandoMaterias } = useApi(academiaService.listarMaterias);
  const { execute: executarListarCursos,      data: cursos,   loading: ListandoCursos   } = useApi(academiaService.listarCursos);
  const { execute: executarAtivarMateria }    = useApi(academiaService.ativarMateria);
  const { execute: executarDesativarMateria } = useApi(academiaService.desativarMateria);
  const { execute: executarDefinirPeriodo }   = useApi(academiaService.definirPeriodoMateria);
  const { execute: executarDeletarMateria }   = useApi(academiaService.deletarMateria);

  const isAcademiaMista = () =>
    user?.academia?.type === "escola" && user?.academia?.nivel_escolar === "misto";

  const isTipoDisabled = () => !isAcademiaMista();

  const getDefaultType = (): MateriaType => {
    const t = user?.academia?.type;
    const n = user?.academia?.nivel_escolar;
    if (t === "superior") return "superior";
    if (n === "fundamental") return "fundamental";
    if (n === "medio") return "medio";
    return "fundamental";
  };

  const [formData, setFormData] = useState<MateriaFormData>({
    nome: "",
    type: getDefaultType(),
    anos_academicos: [],
    curso_id: undefined,
  });

  useEffect(() => {
    executarListarCursos();
    executarListarMaterias();
  }, []);

  const showMsg = (variant: "success" | "error" | "warning" | "info", message: string) => {
    setAlert({ variant, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const carregarDados = async () => {
    try { await Promise.all([executarListarCursos(), executarListarMaterias()]); } catch {}
  };

  // ── Handlers ──

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) { showMsg("error", "Nome da matéria é obrigatório"); return; }
    if (formData.anos_academicos.length === 0) { showMsg("error", "Selecione pelo menos um ano/nível"); return; }
    if (formData.type !== "fundamental" && !formData.curso_id) {
      showMsg("error", `Matérias do tipo ${formData.type === "medio" ? "Médio" : "Superior"} devem estar vinculadas a um curso`);
      return;
    }

    try {
      if (editingMateria) {
        await executarAtualizarMateria(editingMateria.id, { nome: formData.nome });
        showMsg("success", "Matéria atualizada com sucesso");
      } else {
        const res = await executarCriarMateria({
          nome: formData.nome,
          type: formData.type,
          anos_academicos: formData.anos_academicos,
          ...(formData.curso_id && { curso_id: formData.curso_id }),
        });
        if ((res as any)?.data?.status === "inativo") {
          showMsg("info", `Matéria "${formData.nome}" criada como inativa. Defina o período antes de ativar.`);
        } else {
          showMsg("success", "Matéria criada com sucesso");
        }
      }
      resetForm();
      carregarDados();
    } catch (error: any) {
      showMsg("error", error?.message || error?.data?.error || "Erro ao salvar matéria");
    }
  };

  const handleEdit = (materia: Materia) => {
    setEditingMateria(materia);
    setFormData({
      nome: materia.nome,
      type: materia.type,
      anos_academicos: materia.anos_academicos || [],
      curso_id: materia.curso_id,
    });
    setShowForm(true);
  };

  const handleToggleStatus = async (materia: Materia) => {
    try {
      if (materia.status === "ativo") {
        await executarDesativarMateria(materia.id);
        showMsg("success", "Matéria desativada");
      } else {
        // Superior sem período não pode ser ativada
        if (materia.type === "superior" && !materia.periodo) {
          showMsg("warning", `Defina o período de "${materia.nome}" antes de ativar`);
          return;
        }
        await executarAtivarMateria(materia.id);
        showMsg("success", "Matéria ativada");
      }
      executarListarMaterias();
    } catch (e: any) {
      showMsg("error", e?.message ?? "Erro ao alterar status");
    }
  };

  const handleDefinirPeriodo = async (materiaId: string, periodo: string) => {
    await executarDefinirPeriodo(materiaId, { periodo });
    showMsg("success", `Período definido: ${PERIODOS_LABEL[periodo] ?? periodo}`);
    carregarDados();
  };

  const handleDeletar = async (materiaId: string) => {
    await executarDeletarMateria(materiaId);
    showMsg("success", "Matéria deletada");
    carregarDados();
  };

  const resetForm = () => {
    setFormData({ nome: "", type: getDefaultType(), anos_academicos: [], curso_id: undefined });
    setEditingMateria(null);
    setShowForm(false);
  };

  const handleAnosToggle = (ano: string) => {
    setFormData(prev => ({
      ...prev,
      anos_academicos: prev.anos_academicos.includes(ano)
        ? prev.anos_academicos.filter(a => a !== ano)
        : [...prev.anos_academicos, ano],
    }));
  };

  const handleTypeChange = (newType: MateriaType) => {
    setFormData({ ...formData, type: newType, anos_academicos: [], curso_id: undefined });
  };

  const getCursosByType = () => {
    if (!cursos?.cursos) return [];
    return cursos.cursos.filter(c => c.type === formData.type && c.status === "ativo");
  };

  const getCursoNome = (cursoId?: string): string => {
    if (!cursoId || !cursos?.cursos) return "";
    return cursos.cursos.find(c => c.id === cursoId)?.nome ?? cursoId;
  };

  /** Períodos disponíveis para a matéria, obtidos do curso vinculado */
  const getPeriodosDoCurso = (materia: Materia): string[] => {
    if (!materia.curso_id || !cursos?.cursos) return [];
    return cursos.cursos.find(c => c.id === materia.curso_id)?.periodos ?? [];
  };

  const getAnosDisponiveis = () => {
    if (formData.type === "fundamental") return ANOS_FUNDAMENTAL;
    if (formData.type === "medio")       return ANOS_MEDIO;
    return ANOS_SUPERIOR;
  };

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* Modais */}
      {materiaParaPeriodo && (
        <ModalDefinirPeriodo
          materia={materiaParaPeriodo}
          periodos={getPeriodosDoCurso(materiaParaPeriodo)}
          onConfirm={p => handleDefinirPeriodo(materiaParaPeriodo.id, p)}
          onClose={() => setMateriaParaPeriodo(null)}
        />
      )}
      {materiaParaDelete && (
        <ModalConfirmarDelete
          materia={materiaParaDelete}
          onConfirm={() => handleDeletar(materiaParaDelete.id)}
          onClose={() => setMateriaParaDelete(null)}
        />
      )}

      {/* Alert */}
      {alert && (
        <Alert
          variant={alert.variant}
          title={alert.variant === "success" ? "Sucesso" : alert.variant === "error" ? "Erro" : "Aviso"}
          message={alert.message}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Matérias Disciplinares</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {`Gerencie as matérias da sua ${user?.academia?.type === "escola" ? "Escola" : "Universidade"}`}
          </p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Icon icon="mdi:plus" width={16} />
            Nova Matéria
          </Button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingMateria ? "Editar Matéria" : "Nova Matéria"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Matemática"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Tipo */}
            {isAcademiaMista() && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
                <select
                  value={formData.type}
                  onChange={e => handleTypeChange(e.target.value as MateriaType)}
                  disabled={isTipoDisabled()}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                >
                  <option value="fundamental">Fundamental</option>
                  <option value="medio">Médio</option>
                  <option value="superior">Superior</option>
                </select>
              </div>
            )}

            {/* Aviso superior inativo */}
            {formData.type === "superior" && !editingMateria && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  ⚠️ Matérias do tipo Superior são criadas como <strong>inativas</strong>. Você precisará definir o período antes de ativá-las.
                </p>
              </div>
            )}

            {/* Anos Académicos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {formData.type === "superior" ? "Ano do curso *" : "Anos/Níveis *"}
              </label>
              <div className="flex flex-wrap gap-2">
                {getAnosDisponiveis().map(a => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => handleAnosToggle(a.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      formData.anos_academicos.includes(a.value)
                        ? "bg-brand-500 text-white border-brand-500"
                        : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand-400"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Curso */}
            {formData.type !== "fundamental" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Curso *</label>
                <select
                  value={formData.curso_id ?? ""}
                  onChange={e => setFormData({ ...formData, curso_id: e.target.value || undefined })}
                  disabled={!!editingMateria}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                >
                  <option value="">Selecione um curso</option>
                  {getCursosByType().map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                {getCursosByType().length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    ⚠️ Nenhum curso {formData.type === "medio" ? "de Ensino Médio" : "Superior"} ativo. Crie um curso primeiro.
                  </p>
                )}
                {editingMateria && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">O curso não pode ser alterado após a criação</p>
                )}
              </div>
            )}

            {formData.type === "fundamental" && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">ℹ️ Matérias do Ensino Fundamental não são vinculadas a cursos</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
              >
                {editingMateria
                  ? atualizandoMateria ? "Atualizando..." : "Atualizar"
                  : criandoMateria ? "Criando..." : "Criar Matéria"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading */}
      {(ListandoMaterias || ListandoCursos) && !showForm && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        </div>
      )}

      {/* Lista */}
      {!ListandoMaterias && !ListandoCursos && !showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materias && materias.materias.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
              <Icon icon="mdi:book-outline" width={48} className="mx-auto mb-3 opacity-30" />
              <p>Nenhuma matéria cadastrada</p>
            </div>
          ) : (
            materias?.materias.map(materia => {
              const periodosDoCurso = getPeriodosDoCurso(materia);
              const precisaDefinirPeriodo = materia.type === "superior" && !materia.periodo;
              const podeAtivar           = materia.type !== "superior" || !!materia.periodo;
              const podeDelete           = materia.status === "inativo";

              return (
                <div
                  key={materia.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-4 flex flex-col gap-3"
                >
                  {/* Cabeçalho do card */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white truncate">{materia.nome}</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {/* Badge tipo */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          materia.type === "fundamental"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : materia.type === "medio"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                        }`}>
                          {materia.type === "fundamental" ? "Fundamental" : materia.type === "medio" ? "Médio" : "Superior"}
                        </span>

                        {/* Badge período (apenas superior) */}
                        {materia.type === "superior" && (
                          materia.periodo ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                              {PERIODOS_LABEL[materia.periodo] ?? materia.periodo.replace(/_/g, " ")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              Período não definido
                            </span>
                          )
                        )}

                        {/* Badge status */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          materia.status === "ativo"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        }`}>
                          {materia.status === "ativo" ? "Ativa" : "Inativa"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Info curso e anos */}
                  {materia.curso_id && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Curso: {getCursoNome(materia.curso_id)}
                    </p>
                  )}
                  {materia.anos_academicos && materia.anos_academicos.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Anos: {materia.anos_academicos.join(", ")}
                    </p>
                  )}

                  {/* Aviso superior sem período */}
                  {precisaDefinirPeriodo && (
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        ⚠️ Defina o período para poder ativar esta matéria
                      </p>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                    {/* Editar */}
                    <button
                      onClick={() => handleEdit(materia)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-brand-500 transition-colors"
                    >
                      <Icon icon="mdi:pencil" width={14} />
                      Editar
                    </button>

                    {/* Definir Período (apenas superior sem período) */}
                    {precisaDefinirPeriodo && periodosDoCurso.length > 0 && (
                      <button
                        onClick={() => setMateriaParaPeriodo(materia)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 transition-colors"
                      >
                        <Icon icon="mdi:calendar-check" width={14} />
                        Definir Período
                      </button>
                    )}

                    {/* Ativar / Desativar */}
                    <button
                      onClick={() => handleToggleStatus(materia)}
                      disabled={materia.status === "inativo" && !podeAtivar}
                      className={`flex items-center gap-1 px-2 py-1 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        materia.status === "ativo"
                          ? "text-orange-600 dark:text-orange-400 hover:text-orange-700"
                          : "text-green-600 dark:text-green-400 hover:text-green-700"
                      }`}
                    >
                      <Icon icon={materia.status === "ativo" ? "mdi:pause-circle" : "mdi:play-circle"} width={14} />
                      {materia.status === "ativo" ? "Desativar" : "Ativar"}
                    </button>

                    {/* Deletar (apenas inativas) */}
                    {podeDelete && (
                      <button
                        onClick={() => setMateriaParaDelete(materia)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 transition-colors ml-auto"
                      >
                        <Icon icon="mdi:delete-outline" width={14} />
                        Deletar
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}