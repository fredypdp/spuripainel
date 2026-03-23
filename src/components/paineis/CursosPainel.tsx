"use client"
import { useState, useEffect } from "react";
import { useApi, academiaService } from "@/lib/api";
import type { Curso, CursoType, MeuPerfilResponse } from "@/types/api";
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import Alert from "@/components/ui/alert/Alert";
import { getCookie } from "@/lib/utils/cookies";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Anos de médio e superior são DINÂMICOS — definidos pela academia.
 * Gera a lista a partir do número de anos escolhido no formulário.
 */
const gerarAnosMedio = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    value: `${i + 1}_ano_medio`,
    label: `${i + 1}º Ano Médio`,
  }));

const gerarAnosSuperior = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    value: `${i + 1}_ano_superior`,
    label: `${i + 1}º Ano Superior`,
  }));

/**
 * Semestres do superior também são DINÂMICOS.
 * O número total de semestres é definido pela academia (ex: curso de 4 anos = 8 semestres).
 */
const gerarSemestres = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    value: `${i + 1}_semestre`,
    label: `${i + 1}º Semestre`,
  }));

interface CursoFormData {
  nome: string;
  type: CursoType;
  anos_academicos: string[];
  /** Quantidade de anos — usada para gerar anos_academicos dinamicamente. */
  numAnos: number;
  /** Períodos (semestres) — apenas cursos superiores; gerados a partir de numSemestres. */
  periodos: string[];
  numSemestres: number;
}

const getUserFromCookie = (): MeuPerfilResponse | null => {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(getCookie("user") ?? ""); }
  catch { return null; }
};

/** Formata o label de um ano para exibição nos cards de cursos. */
const formatarNivelLabel = (nivel: string): string => {
  // ex: "3_ano_medio" → "3º Médio"  |  "2_ano_superior" → "2º Superior"
  const m = nivel.match(/^(\d+)_ano_(medio|superior)$/);
  if (m) {
    const tipo = m[2] === "medio" ? "Médio" : "Superior";
    return `${m[1]}º ${tipo}`;
  }
  return nivel.replace(/_/g, " ");
};

// ── Modal: Confirmar Deleção de Curso ─────────────────────────────────────────

function ModalConfirmarDeleteCurso({
  curso,
  onConfirm,
  onClose,
}: {
  curso: Curso;
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Deletar Curso</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Tem certeza que deseja deletar{" "}
          <span className="font-medium text-gray-700 dark:text-gray-200">{curso.nome}</span>?
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
          ⚠️ Matérias inativas e turmas inativas vinculadas também serão deletadas em cascata.
          O histórico é preservado no ledger.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
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

export default function CursosPainel() {
  const [user] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());
  const [showForm, setShowForm] = useState(false);
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null);
  const [cursoParaDelete, setCursoParaDelete] = useState<Curso | null>(null);
  const [alert, setAlert] = useState<{
    variant: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);

  const getDefaultType = (): CursoType => {
    if (!user?.academia) return "medio";
    return user.academia.type === "superior" ? "superior" : "medio";
  };

  const [formData, setFormData] = useState<CursoFormData>({
    nome: "",
    type: getDefaultType(),
    anos_academicos: [],
    numAnos: 3,
    periodos: [],
    numSemestres: 6,
  });

  const { execute: executarListarCursos, data: cursos, loading: ListandoCursos   } = useApi(academiaService.listarCursos);
  const { execute: executarCriarCurso, loading: CriandoCurso } = useApi(academiaService.criarCurso);
  const { execute: executarAtualizarCurso, loading: AtualizandoCurso } = useApi(academiaService.atualizarCurso);
  const { execute: executarAtivarCurso, error: erroAtivarCurso } = useApi(academiaService.ativarCurso);
  const { execute: executarDesativarCurso, error: erroDesativarCurso } = useApi(academiaService.desativarCurso);
  const { execute: executarDeletarCurso } = useApi(academiaService.deletarCurso);

  // Para academias mistas: qual tipo de curso está visível na lista
  const [viewTipoCurso, setViewTipoCurso] = useState<"medio" | "superior">("medio");
  // Controlo de quais secções estão abertas
  const [secaoAberta, setSecaoAberta] = useState<Record<string, boolean>>({});

  const isAcademiaMista = () =>
    user?.academia?.type === "escola" && user?.academia?.nivel_escolar === "misto";

  const toggleSecao = (key: string) =>
    setSecaoAberta(p => ({ ...p, [key]: p[key] === false ? true : false }));

  const isSecaoAberta = (key: string) => secaoAberta[key] !== false;

  useEffect(() => {
    executarListarCursos();
  }, []);

  const showAlert = (variant: "success" | "error" | "warning" | "info", message: string) => {
    setAlert({ variant, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      showAlert("error", "Nome do curso é obrigatório");
      return;
    }

    try {
      if (editingCurso) {
        await executarAtualizarCurso(editingCurso.id, {
          nome: formData.nome,
          type: formData.type,
        });
        showAlert("success", "Curso atualizado com sucesso");
      } else {
        // Gerar anos_academicos e periodos dinamicamente a partir dos contadores
        const anosGerados = formData.type === "medio"
          ? gerarAnosMedio(formData.numAnos).map(a => a.value)
          : gerarAnosSuperior(formData.numAnos).map(a => a.value);

        const periodosGerados = formData.type === "superior"
          ? gerarSemestres(formData.numSemestres).map(s => s.value)
          : undefined;

        await executarCriarCurso({
          nome: formData.nome,
          type: formData.type,
          anos_academicos: anosGerados,
          ...(periodosGerados && { periodos: periodosGerados }),
        });
        showAlert("success", "Curso criado com sucesso");
      }
      resetForm();
      executarListarCursos();
    } catch (error: any) {
      showAlert("error", error?.data?.error || error?.message || "Erro ao salvar curso");
    }
  };

  const handleEdit = (curso: Curso) => {
    setEditingCurso(curso);
    setFormData({
      nome: curso.nome,
      type: curso.type,
      anos_academicos: curso.anos_academicos,
      numAnos: curso.anos_academicos.length || 3,
      periodos: curso.periodos ?? [],
      numSemestres: curso.periodos?.length || 6,
    });
    setShowForm(true);
  };

  const handleToggleStatus = async (curso: Curso) => {
    try {
      if (curso.status === "ativo") {
        await executarDesativarCurso(curso.id);
        showAlert("success", "Curso desativado");
      } else {
        await executarAtivarCurso(curso.id);
        showAlert("success", "Curso ativado");
      }
      executarListarCursos();
    } catch (error: any) {
      showAlert("error", error?.data?.error || "Erro ao alterar status");
    }
  };

  const handleDeletar = async (cursoId: string) => {
    try {
      const res = await executarDeletarCurso(cursoId);
      let msg = "Curso deletado com sucesso";
      if (res?.turmas_deletadas?.length)   msg += ` (${res.turmas_deletadas.length} turma(s) removida(s))`;
      if (res?.materias_deletadas?.length) msg += ` e ${res.materias_deletadas.length} matéria(s)`;
      showAlert("success", msg);
      executarListarCursos();
    } catch (e: any) {
      showAlert("error", e?.message ?? "Erro ao deletar curso");
    }
  };

  const resetForm = () => {
    setFormData({ nome: "", type: getDefaultType(), anos_academicos: [], numAnos: 3, periodos: [], numSemestres: 6 });
    setEditingCurso(null);
    setShowForm(false);
  };

  const handleAnoToggle = (ano: string) => {
    setFormData(prev => ({
      ...prev,
      anos_academicos: prev.anos_academicos.includes(ano)
        ? prev.anos_academicos.filter(a => a !== ano)
        : [...prev.anos_academicos, ano],
    }));
  };

  const isTipoDisabled = () => !!editingCurso || !!user?.academia?.type;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {alert && (
        <Alert
          variant={alert.variant}
          title={alert.variant === "success" ? "Sucesso" : alert.variant === "error" ? "Erro" : "Aviso"}
          message={alert.message}
        />
      )}
      {erroAtivarCurso    && <Alert variant="error" title="Erro ao ativar curso"    message={erroAtivarCurso} />}
      {erroDesativarCurso && <Alert variant="error" title="Erro ao desativar curso" message={erroDesativarCurso} />}

      {/* Modal de deleção */}
      {cursoParaDelete && (
        <ModalConfirmarDeleteCurso
          curso={cursoParaDelete}
          onConfirm={async () => { await handleDeletar(cursoParaDelete.id); }}
          onClose={() => setCursoParaDelete(null)}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cursos</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {`Gerencie os cursos da sua ${user?.academia?.type === "escola" ? "Escola" : "Superior"}`}
          </p>
        </div>
        {!showForm && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => executarListarCursos()}
              disabled={ListandoCursos}
            >
              <Icon icon="mdi:refresh" width={16} />
              Carregar Cursos
            </Button>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Icon icon="mdi:plus" width={16} />
              Novo Curso
            </Button>
          </div>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingCurso ? "Editar Curso" : "Novo Curso"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do curso"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo *
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as CursoType, anos_academicos: [] })
                }
                disabled={isTipoDisabled()}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              >
                <option value="medio">Ensino Médio</option>
                <option value="superior">Ensino Superior</option>
              </select>
              {editingCurso && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  O tipo não pode ser alterado após a criação
                </p>
              )}
            </div>

            {/* Anos — apenas na criação, gerados dinamicamente */}
            {!editingCurso && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Número de anos *
                    <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                      (gera automaticamente: 1º…{formData.numAnos}º {formData.type === "medio" ? "Médio" : "Superior"})
                    </span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, numAnos: Math.max(1, p.numAnos - 1) }))}
                      className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >−</button>
                    <span className="w-8 text-center font-semibold text-gray-900 dark:text-white">
                      {formData.numAnos}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, numAnos: Math.min(10, p.numAnos + 1) }))}
                      className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >+</button>
                    <div className="flex flex-wrap gap-1 ml-2">
                      {(formData.type === "medio"
                        ? gerarAnosMedio(formData.numAnos)
                        : gerarAnosSuperior(formData.numAnos)
                      ).map(a => (
                        <span key={a.value} className="text-xs px-2 py-1 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded border border-brand-200 dark:border-brand-800">
                          {a.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {formData.type === "superior" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Número de semestres *
                      <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                        (gera: 1º…{formData.numSemestres}º Semestre)
                      </span>
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, numSemestres: Math.max(1, p.numSemestres - 1) }))}
                        className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >−</button>
                      <span className="w-8 text-center font-semibold text-gray-900 dark:text-white">
                        {formData.numSemestres}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, numSemestres: Math.min(20, p.numSemestres + 1) }))}
                        className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >+</button>
                      <div className="flex flex-wrap gap-1 ml-2">
                        {gerarSemestres(formData.numSemestres).map(s => (
                          <span key={s.value} className="text-xs px-2 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded border border-teal-200 dark:border-teal-800">
                            {s.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
              >
                {editingCurso
                  ? (AtualizandoCurso ? "Atualizando..." : "Atualizar")
                  : (CriandoCurso     ? "Criando..."     : "Criar Curso")}
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
      {ListandoCursos && !showForm && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        </div>
      )}

      {/* Lista de cursos agrupada por tipo */}
      {!ListandoCursos && !showForm && (() => {
        const listaCursos = cursos?.cursos ?? [];

        if (listaCursos.length === 0) {
          return (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Icon icon="mdi:book-education-outline" width={48} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum curso cadastrado</p>
            </div>
          );
        }

        // Para academias mistas: filtrar por tipo seleccionado
        const cursosVisiveis = isAcademiaMista()
          ? listaCursos.filter(c => c.type === viewTipoCurso)
          : listaCursos;

        // Agrupar por tipo para academias com ambos (superior puro ou escola pura)
        const tiposPresentes = Array.from(new Set(cursosVisiveis.map(c => c.type))) as Array<"medio" | "superior">;
        const mostrarSecoes = !isAcademiaMista() && tiposPresentes.length > 1;

        const labelTipo = (t: string) => t === "medio" ? "Ensino Médio" : "Ensino Superior";
        const iconeTipo = (t: string) => t === "medio" ? "mdi:school" : "mdi:book-education";

        const CursoCard = ({ curso }: { curso: Curso }) => (
          <div
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-6 border-2 transition-all ${
              curso.status === "ativo"
                ? "border-green-200 dark:border-green-800"
                : curso.status === "deletado"
                ? "border-red-200 dark:border-red-900 opacity-40 pointer-events-none"
                : "border-gray-200 dark:border-gray-700 opacity-60"
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{curso.nome}</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {curso.type === "medio" ? "Ensino Médio" : "Ensino Superior"}
                </span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                curso.status === "ativo"
                  ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                  : curso.status === "deletado"
                  ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              }`}>
                {curso.status}
              </span>
            </div>

            {curso.anos_academicos.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Anos:</p>
                <div className="flex flex-wrap gap-1">
                  {curso.anos_academicos.map((n) => (
                    <span key={n} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                      {formatarNivelLabel(n)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {curso.status !== "deletado" && (
              <>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(curso)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Icon icon="mdi:pencil" width={16} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleStatus(curso)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                      curso.status === "ativo"
                        ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100"
                        : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100"
                    }`}
                  >
                    <Icon icon={curso.status === "ativo" ? "mdi:eye-off" : "mdi:eye"} width={16} />
                    {curso.status === "ativo" ? "Desativar" : "Ativar"}
                  </button>
                </div>
                {curso.status === "inativo" && (
                  <button
                    onClick={() => setCursoParaDelete(curso)}
                    className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Icon icon="mdi:delete-outline" width={14} />
                    Deletar curso
                  </button>
                )}
              </>
            )}
          </div>
        );

        const SecaoCursos = ({ tipo, lista }: { tipo: string; lista: Curso[] }) => {
          const key = tipo;
          const aberta = isSecaoAberta(key);
          return (
            <section>
              <button
                onClick={() => toggleSecao(key)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors mb-3"
              >
                <div className="flex items-center gap-3">
                  <Icon icon={iconeTipo(tipo)} className="w-4 h-4 text-brand-500" />
                  <span className="font-semibold text-sm text-gray-800 dark:text-white">{labelTipo(tipo)}</span>
                  <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">
                    {lista.length} curso{lista.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <Icon icon={aberta ? "mdi:chevron-up" : "mdi:chevron-down"} className="w-5 h-5 text-gray-400" />
              </button>
              {aberta && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lista.map(curso => <CursoCard key={curso.id} curso={curso} />)}
                </div>
              )}
            </section>
          );
        };

        return (
          <div className="space-y-4">
            {/* Toggle Médio/Superior para academias mistas */}
            {isAcademiaMista() && (
              <div className="flex items-center">
                <button
                  onClick={() => setViewTipoCurso(v => v === "medio" ? "superior" : "medio")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-brand-500 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                >
                  <Icon icon={viewTipoCurso === "medio" ? "mdi:book-education" : "mdi:school"} width={16} />
                  {viewTipoCurso === "medio" ? "Ver Cursos do Ensino Superior" : "Ver Cursos do Ensino Médio"}
                </button>
              </div>
            )}

            {mostrarSecoes ? (
              tiposPresentes.map(tipo => (
                <SecaoCursos
                  key={tipo}
                  tipo={tipo}
                  lista={cursosVisiveis.filter(c => c.type === tipo)}
                />
              ))
            ) : (
              <SecaoCursos
                tipo={cursosVisiveis[0]?.type ?? "medio"}
                lista={cursosVisiveis}
              />
            )}
          </div>
        );
      })()}
    </div>
  );
}