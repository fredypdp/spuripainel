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

// ✅ Anos do ensino fundamental
const ANOS_FUNDAMENTAL = [
  { value: "primeiro_fundamental", label: "1º Ano" },
  { value: "segundo_fundamental", label: "2º Ano" },
  { value: "terceiro_fundamental", label: "3º Ano" },
  { value: "quarto_fundamental", label: "4º Ano" },
  { value: "quinto_fundamental", label: "5º Ano" },
  { value: "sexto_fundamental", label: "6º Ano" },
  { value: "setimo_fundamental", label: "7º Ano" },
  { value: "oitavo_fundamental", label: "8º Ano" },
  { value: "nono_fundamental", label: "9º Ano" },
];

// ✅ Anos do ensino médio
const ANOS_MEDIO = [
  { value: "primeiro_medio", label: "1º Ano Médio" },
  { value: "segundo_medio", label: "2º Ano Médio" },
  { value: "terceiro_medio", label: "3º Ano Médio" },
  { value: "quarto_medio", label: "4º Ano Médio" },
];

// ✅ Anos do ensino superior
const ANOS_SUPERIOR = [
  { value: "primeiro_ano", label: "1º Ano" },
  { value: "segundo_ano", label: "2º Ano" },
  { value: "terceiro_ano", label: "3º Ano" },
  { value: "quarto_ano", label: "4º Ano" },
  { value: "quinto_ano", label: "5º Ano" },
  { value: "sexto_ano", label: "6º Ano" },
];

const getUserFromCookie = (): MeuPerfilResponse | null => {
  if (typeof window === 'undefined') return null;
  const userCookie = getCookie("user");
  if (userCookie) {
    try {
      return JSON.parse(userCookie);
    } catch {
      return null;
    }
  }
  return null;
};

export default function MateriaPainel() {
  const [showForm, setShowForm] = useState(false);
  const [editingMateria, setEditingMateria] = useState<Materia | null>(null);
  const [alert, setAlert] = useState<{ variant: "success" | "error" | "warning" | "info"; message: string } | null>(null);
  const [user] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());

  const { execute: executarCriarMateria, loading: criandoMateria } = useApi(academiaService.criarMateria);
  const { execute: executarAtualizarMateria, loading: atualizandoMateria } = useApi(academiaService.atualizarMateria);
  const { execute: executarListarMaterias, data: materias, loading: ListandoMaterias } = useApi(academiaService.listarMaterias);
  const { execute: executarListarCursos, data: cursos, loading: ListandoCursos } = useApi(academiaService.listarCursos);
  const { execute: executarAtivarMateria } = useApi(academiaService.ativarMateria);
  const { execute: executarDesativarMateria } = useApi(academiaService.desativarMateria);

  // ✅ Detecta se a academia é mista
  const isAcademiaMista = () => {
    return user?.academia?.type === "escola" && user?.academia?.nivel_escolar === "misto";
  };

  // Tipo padrão baseado na academia
  const getDefaultType = (): MateriaType => {
    if (!user?.academia) return "fundamental";
    const academiaNivel = user.academia.nivel_escolar;
    const academiaType = user.academia.type;
    if (academiaType === "superior") return "superior";
    if (academiaNivel === "fundamental") return "fundamental";
    if (academiaNivel === "medio") return "medio";
    if (academiaNivel === "misto") return "fundamental";
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

  const showAlert = (variant: "success" | "error" | "warning" | "info", message: string) => {
    setAlert({ variant, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const carregarDados = async () => {
    try {
      await executarListarCursos();
      await executarListarMaterias();
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      showAlert("error", "Nome da matéria é obrigatório");
      return;
    }

    if (formData.anos_academicos.length === 0) {
      showAlert("error", "Selecione pelo menos um ano/nível");
      return;
    }

    // ✅ Validações específicas por tipo
    if (formData.type === "fundamental") {
      if (formData.curso_id) {
        showAlert("error", "Matérias do Fundamental não devem ter curso vinculado");
        return;
      }
    } else {
      if (!formData.curso_id) {
        showAlert("error", `Matérias do tipo ${formData.type === 'medio' ? 'Médio' : 'Superior'} devem estar vinculadas a um curso`);
        return;
      }
    }

    try {
      const payload = {
        nome: formData.nome,
        type: formData.type,
        anos_academicos: formData.anos_academicos,
        ...(formData.curso_id && { curso_id: formData.curso_id }),
      };

      if (editingMateria) {
        await executarAtualizarMateria(editingMateria.id, {
          nome: formData.nome,
          type: formData.type,
        });
        showAlert("success", "Matéria atualizada com sucesso");
      } else {
        await executarCriarMateria(payload);
        showAlert("success", "Matéria criada com sucesso");
      }

      resetForm();
      carregarDados();
    } catch (error: any) {
      showAlert("error", error?.message || error?.data?.error || "Erro ao salvar matéria");
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
        showAlert("success", "Matéria desativada");
      } else {
        await executarAtivarMateria(materia.id);
        showAlert("success", "Matéria ativada");
      }
      executarListarMaterias();
    } catch {}
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
    setFormData({
      ...formData,
      type: newType,
      anos_academicos: [],
      curso_id: undefined,
    });
  };

  const getCursoNome = (cursoId?: string) => {
    if (!cursoId) return null;
    const curso = cursos?.cursos.find(c => c.id === cursoId);
    return curso?.nome;
  };

  const getCursosByType = () => {
    if (!cursos?.cursos) return [];
    if (formData.type === "medio") return cursos.cursos.filter(c => c.type === "medio" && c.status === "ativo");
    if (formData.type === "superior") return cursos.cursos.filter(c => c.type === "superior" && c.status === "ativo");
    return [];
  };

  // ✅ Retorna os anos disponíveis conforme o tipo
  const getAnosDisponiveis = () => {
    if (formData.type === "fundamental") return ANOS_FUNDAMENTAL;
    if (formData.type === "medio") return ANOS_MEDIO;
    if (formData.type === "superior") return ANOS_SUPERIOR;
    return [];
  };

  // ✅ Tipo está bloqueado se vier da academia (exceto misto) ou em edição
  const isTipoDisabled = () => {
    if (editingMateria) return true;
    if (isAcademiaMista()) return false;
    return !user?.academia;
  };

  // ✅ Função para formatar labels dos anos académicos
  const formatarAnoLabel = (ano: string): string => {
    if (ano.includes('fundamental')) {
      const m = ano.match(/(primeiro|segundo|terceiro|quarto|quinto|sexto|setimo|oitavo|nono)_fundamental/);
      if (m) {
        const nums: Record<string, string> = {
          primeiro: '1º', segundo: '2º', terceiro: '3º', quarto: '4º', quinto: '5º',
          sexto: '6º', setimo: '7º', oitavo: '8º', nono: '9º',
        };
        return `${nums[m[1]]} Ano`;
      }
    }
    if (ano.includes('medio')) {
      const m = ano.match(/(primeiro|segundo|terceiro|quarto)_medio/);
      if (m) {
        const nums: Record<string, string> = { primeiro: '1º', segundo: '2º', terceiro: '3º', quarto: '4º' };
        return `${nums[m[1]]} Médio`;
      }
    }
    if (ano.includes('ano') && !ano.includes('medio') && !ano.includes('fundamental')) {
      const m = ano.match(/(primeiro|segundo|terceiro|quarto|quinto|sexto)_ano/);
      if (m) {
        const nums: Record<string, string> = {
          primeiro: '1º', segundo: '2º', terceiro: '3º', quarto: '4º', quinto: '5º', sexto: '6º',
        };
        return `${nums[m[1]]} Ano`;
      }
    }
    return ano.replace(/_/g, ' ');
  };

  // ✅ Obter descrição do tipo de academia
  const getTipoAcademiaDescricao = (): string => {
    if (!user?.academia) return '';
    const academiaType = user.academia.type;
    const academiaNivel = user.academia.nivel_escolar;
    if (academiaType === 'superior') return 'Superior';
    if (academiaNivel === 'fundamental') return 'Fundamental';
    if (academiaNivel === 'medio') return 'Médio';
    if (academiaNivel === 'misto') return 'Misto (Fundamental e Médio)';
    return '';
  };

  return (
    <div className="space-y-6">
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Matérias Disciplinares
          </h2>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Matemática"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Tipo */}
            {isAcademiaMista() && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleTypeChange(e.target.value as MateriaType)}
                  disabled={isTipoDisabled()}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="fundamental">Ensino Fundamental</option>
                  <option value="medio">Ensino Médio</option>
                  <option value="superior">Ensino Superior</option>
                </select>
                {user?.academia && !editingMateria && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Tipo definido automaticamente pela academia ({getTipoAcademiaDescricao()})
                  </p>
                )}
                {editingMateria && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    O tipo não pode ser alterado após a criação
                  </p>
                )}
              </div>
            )}

            {/* ✅ SELEÇÃO DE ANOS ACADÉMICOS (TODOS OS TIPOS) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Anos Académicos * (selecione pelo menos um)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {getAnosDisponiveis().map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={formData.anos_academicos.includes(value)}
                      onChange={() => handleAnosToggle(value)}
                      className="w-4 h-4 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* ✅ SELEÇÃO DE CURSO (APENAS MÉDIO E SUPERIOR) */}
            {(formData.type === "medio" || formData.type === "superior") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Curso * (obrigatório)
                </label>
                <select
                  value={formData.curso_id || ""}
                  onChange={(e) => setFormData({ ...formData, curso_id: e.target.value })}
                  disabled={!!editingMateria}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                >
                  <option value="">Selecione um curso</option>
                  {getCursosByType().map((curso) => (
                    <option key={curso.id} value={curso.id}>
                      {curso.nome}
                    </option>
                  ))}
                </select>
                {getCursosByType().length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    ⚠️ Nenhum curso {formData.type === "medio" ? "de Ensino Médio" : "Superior"} ativo disponível.
                    Crie um curso primeiro na aba &quot;Cursos&quot;.
                  </p>
                )}
                {editingMateria && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    O curso não pode ser alterado após a criação
                  </p>
                )}
              </div>
            )}

            {/* ✅ INFO PARA FUNDAMENTAL */}
            {formData.type === "fundamental" && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  ℹ️ Matérias do Ensino Fundamental não são vinculadas a cursos
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
              >
                {editingMateria
                  ? atualizandoMateria ? "Atualizando matéria..." : "Atualizar"
                  : criandoMateria ? "Criando matéria..." : "Criar Matéria"}
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      )}

      {/* Lista de Matérias */}
      {!ListandoMaterias && !ListandoCursos && !showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materias && materias.total > 0 && materias?.materias.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
              Nenhuma matéria cadastrada
            </div>
          ) : (
            materias && materias.total > 0 && materias?.materias.map((materia) => (
              <div
                key={materia.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-6 border-2 transition-all ${
                  materia.status === "ativo"
                    ? "border-blue-200 dark:border-blue-800"
                    : "border-gray-200 dark:border-gray-700 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="mdi:book-open-page-variant" width={20} className="text-brand-500" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {materia.nome}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300">
                        {materia.type === "fundamental" ? "Fundamental" :
                          materia.type === "medio" ? "Médio" : "Superior"}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          materia.status === "ativo"
                            ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {materia.status === "ativo" ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Anos Académicos */}
                {materia.anos_academicos && materia.anos_academicos.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Anos académicos:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {materia.anos_academicos.map((ano) => (
                        <span
                          key={ano}
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                        >
                          {formatarAnoLabel(ano)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Curso (apenas para médio e superior) */}
                {(materia.type === "medio" || materia.type === "superior") && materia.curso_id && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Curso:
                    </p>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {getCursoNome(materia.curso_id) || "Curso não encontrado"}
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(materia)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Icon icon="mdi:pencil" width={16} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleStatus(materia)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                      materia.status === "ativo"
                        ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                        : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                    }`}
                  >
                    <Icon icon={materia.status === "ativo" ? "mdi:eye-off" : "mdi:eye"} width={16} />
                    {materia.status === "ativo" ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>
            ))
          )}

          {(!materias || materias.total === 0) && (
            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
              Nenhuma matéria cadastrada ainda
            </div>
          )}
        </div>
      )}
    </div>
  );
}