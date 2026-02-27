"use client"
import { useState, useEffect } from "react";
import { useApi, academiaService } from "@/lib/api";
import { Curso, CursoType } from "@/types/api";
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import Alert from "@/components/ui/alert/Alert";
import { getCookie } from '@/lib/utils/cookies';
import type { MeuPerfilResponse } from '@/types/api';

interface CursoFormData {
  nome: string;
  type: CursoType;
  anos_academicos: string[]; // 🔥 RENOMEADO de nivel
}

// Anos fixos para médio (fallback — o backend aceita qualquer string)
const ANOS_MEDIO = [
  { value: "primeiro_medio", label: "1º Ano Médio" },
  { value: "segundo_medio", label: "2º Ano Médio" },
  { value: "terceiro_medio", label: "3º Ano Médio" },
  { value: "quarto_medio", label: "4º Ano Médio" },
];

// Anos fixos para superior (fallback)
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
    try { return JSON.parse(userCookie); } catch { return null; }
  }
  return null;
};

export default function CursosPainel() {
  const [showForm, setShowForm] = useState(false);
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null);
  const [alert, setAlert] = useState<{ variant: "success" | "error" | "warning" | "info"; message: string } | null>(null);
  const [user] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());

  const { execute: executarListarCursos, data: cursos, error: erroListarCursos, loading: ListandoCursos } = useApi(academiaService.listarCursos);
  const { execute: executarAtualizarCurso, error: erroAtualizarCurso, loading: AtualizandoCurso } = useApi(academiaService.atualizarCurso);
  const { execute: executarCriarCurso, error: erroCriarCurso, loading: CriandoCurso } = useApi(academiaService.criarCurso);
  const { execute: executarAtivarCurso, error: erroAtivarCurso, loading: AtivandoCurso } = useApi(academiaService.ativarCurso);
  const { execute: executarDesativarCurso, error: erroDesativarCurso, loading: DesativandoCurso } = useApi(academiaService.desativarCurso);

  const getDefaultType = (): CursoType => {
    if (!user?.academia) return "medio";
    return user.academia.type === "superior" ? "superior" : "medio";
  };

  const [formData, setFormData] = useState<CursoFormData>({
    nome: "",
    type: getDefaultType(),
    anos_academicos: [],
  });

  useEffect(() => {
    executarListarCursos();
  }, []);

  const showAlert = (variant: "success" | "error" | "warning" | "info", message: string) => {
    setAlert({ variant, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      showAlert("error", "Nome do curso é obrigatório");
      return;
    }

    if (formData.anos_academicos.length === 0) {
      showAlert("error", "Selecione pelo menos um ano");
      return;
    }

    try {
      if (editingCurso) {
        await executarAtualizarCurso(editingCurso.id, {
          nome: formData.nome,
          type: formData.type,
          // Não envia anos_academicos na edição (backend não suporta alterar anos após criação)
        });
        showAlert("success", "Curso atualizado com sucesso");
      } else {
        await executarCriarCurso({
          nome: formData.nome,
          type: formData.type,
          anos_academicos: formData.anos_academicos,
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
      anos_academicos: curso.anos_academicos, // 🔥 RENOMEADO
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

  const resetForm = () => {
    setFormData({ nome: "", type: getDefaultType(), anos_academicos: [] });
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

  const getAnosDisponiveis = () => {
    return formData.type === "medio" ? ANOS_MEDIO : ANOS_SUPERIOR;
  };

  const isTipoDisabled = () => {
    return !!editingCurso || !!user?.academia?.type;
  };

  const formatarNivelLabel = (nivel: string): string => {
    const map: Record<string, string> = {
      primeiro_medio: "1º Médio", segundo_medio: "2º Médio",
      terceiro_medio: "3º Médio", quarto_medio: "4º Médio",
      primeiro_ano: "1º Ano", segundo_ano: "2º Ano",
      terceiro_ano: "3º Ano", quarto_ano: "4º Ano",
      quinto_ano: "5º Ano", sexto_ano: "6º Ano",
    };
    return map[nivel] ?? nivel.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-6">
      {alert && (
        <Alert
          variant={alert.variant}
          title={alert.variant === "success" ? "Sucesso" : alert.variant === "error" ? "Erro" : "Aviso"}
          message={alert.message}
        />
      )}
      {erroAtivarCurso && <Alert variant="error" title="Erro ao ativar curso" message={erroAtivarCurso} />}
      {erroDesativarCurso && <Alert variant="error" title="Erro ao desativar curso" message={erroDesativarCurso} />}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cursos</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {`Gerencie os cursos da sua ${user?.academia?.type === "escola" ? "Escola" : "Superior"}`}
          </p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Icon icon="mdi:plus" width={16} />
            Novo Curso
          </Button>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do curso"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as CursoType, anos_academicos: [] })}
                disabled={isTipoDisabled()}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              >
                <option value="medio">Ensino Médio</option>
                <option value="superior">Ensino Superior</option>
              </select>
              {editingCurso && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">O tipo não pode ser alterado após a criação</p>
              )}
            </div>

            {/* Anos/Níveis — só na criação */}
            {!editingCurso && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Anos/Níveis * (selecione pelo menos um)
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
                        onChange={() => handleAnoToggle(value)}
                        className="w-4 h-4 text-brand-500 focus:ring-brand-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button type="submit" className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
                {editingCurso
                  ? (AtualizandoCurso ? "Atualizando..." : "Atualizar")
                  : (CriandoCurso ? "Criando..." : "Criar Curso")}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading */}
      {ListandoCursos && !showForm && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      )}

      {/* Lista */}
      {!ListandoCursos && !showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cursos?.cursos.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
              Nenhum curso cadastrado
            </div>
          ) : (
            cursos?.cursos.map((curso) => (
              <div
                key={curso.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-6 border-2 transition-all ${
                  curso.status === "ativo"
                    ? "border-green-200 dark:border-green-800"
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
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  }`}>
                    {curso.status}
                  </span>
                </div>

                {/* 🔥 ATUALIZADO: curso.anos_academicos */}
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
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}