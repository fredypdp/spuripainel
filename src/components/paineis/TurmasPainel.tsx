"use client"
import { useState, useEffect } from "react";
import { useApi, academiaService, consultasService, tokenStorage } from "@/lib/api";
import type { Curso, MeuPerfilResponse, Turma, EstudanteDetalhado } from "@/types/api";
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import Alert from "@/components/ui/alert/Alert";
import { getCookie } from "@/lib/utils/cookies";

// ── Constantes ─────────────────────────────────────────────────────────────

const ANOS_FUNDAMENTAL = [
  { value: "primeiro_fundamental",  label: "1º Ano" },
  { value: "segundo_fundamental",   label: "2º Ano" },
  { value: "terceiro_fundamental",  label: "3º Ano" },
  { value: "quarto_fundamental",    label: "4º Ano" },
  { value: "quinto_fundamental",    label: "5º Ano" },
  { value: "sexto_fundamental",     label: "6º Ano" },
  { value: "setimo_fundamental",    label: "7º Ano" },
  { value: "oitavo_fundamental",    label: "8º Ano" },
  { value: "nono_fundamental",      label: "9º Ano" },
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
const TURNOS = [
  { value: "manha", label: "Manhã"  },
  { value: "tarde", label: "Tarde"  },
  { value: "noite", label: "Noite"  },
];

const labelNivel = (v: string) =>
  [...ANOS_FUNDAMENTAL, ...ANOS_MEDIO, ...ANOS_SUPERIOR].find(a => a.value === v)?.label ?? v;

const labelTurno = (t: string) => TURNOS.find(x => x.value === t)?.label ?? t;

const getUserFromCookie = (): MeuPerfilResponse | null => {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(getCookie("user") ?? ""); }
  catch { return null; }
};

interface TurmaFormData {
  codigo_turma: string;
  nivel: string;
  turno: string;
  curso_id?: string;
}

// ── Componente principal ───────────────────────────────────────────────────

export default function TurmasPainel() {
  const [user] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());

  // UI state
  const [expandedTurma,  setExpandedTurma]  = useState<string | null>(null);
  const [expandedNivel,  setExpandedNivel]  = useState<string | null>(null);
  const [expandedCurso,  setExpandedCurso]  = useState<string | null>(null);
  const [showForm,       setShowForm]       = useState(false);
  const [editingTurma,   setEditingTurma]   = useState<Turma | null>(null);
  const [formData,       setFormData]       = useState<TurmaFormData>({ codigo_turma: "", nivel: "", turno: "manha" });
  const [addingTo,       setAddingTo]       = useState<string | null>(null);
  const [codigoAdd,      setCodigoAdd]      = useState("");
  const [alert, setAlert] = useState<{ variant: "success"|"error"|"warning"|"info"; message: string }|null>(null);

  // APIs
  const { execute: listarTurmas,       data: dataTurmas,    loading: carregando  } = useApi(academiaService.listarTurmas);
  const { execute: listarCursos,       data: dataCursos                           } = useApi(academiaService.listarCursos);
  const { execute: listarEstudantes,   data: dataEstudantes                       } = useApi(consultasService.listarEstudantes);
  const { execute: criarTurma,         loading: criando     } = useApi(academiaService.criarTurma);
  const { execute: atualizarTurma,     loading: atualizando } = useApi(academiaService.atualizarTurma);
  const { execute: adicionarEstudante, loading: adicionando } = useApi(academiaService.adicionarEstudanteATurma);
  const { execute: removerEstudante,   loading: removendo   } = useApi(academiaService.removerEstudanteDaTurma);

  useEffect(() => {
    const t = tokenStorage.get() ?? undefined;
    listarTurmas(t);
    listarCursos(t);
    listarEstudantes(undefined, t);
  }, []);

  const showMsg = (variant: "success"|"error"|"warning"|"info", msg: string) => {
    setAlert({ variant, message: msg });
    setTimeout(() => setAlert(null), 5000);
  };

  const reload = () => listarTurmas(tokenStorage.get() ?? undefined);

  // ── Contexto académico ────────────────────────────────────────────────

  const academiaType  = user?.academia?.type;
  const nivelEscolar  = user?.academia?.nivel_escolar;
  const isFundamental = academiaType === "escola" && nivelEscolar === "fundamental";
  const isMisto = academiaType === "escola" && nivelEscolar === "misto";
  const isSuperior    = academiaType === "superior";

  const turmas:     Turma[]              = dataTurmas?.turmas ?? [];
  const cursos:     Curso[]              = dataCursos?.cursos?.filter(c => c.status === "ativo") ?? [];
  const estudantes: EstudanteDetalhado[] = dataEstudantes?.estudantes ?? [];

  const getNivelOptions = (cursoId?: string) => {
    if (isFundamental) return ANOS_FUNDAMENTAL;
    const curso = cursos.find(c => c.id === cursoId);
    if (!curso) return isSuperior ? ANOS_SUPERIOR : [...ANOS_MEDIO, ...ANOS_SUPERIOR];
    if (curso.type === "medio")    return ANOS_MEDIO.filter(a => curso.anos_academicos.includes(a.value));
    if (curso.type === "superior") return ANOS_SUPERIOR.filter(a => curso.anos_academicos.includes(a.value));
    return [];
  };

  // ── Agrupamentos ─────────────────────────────────────────────────────

  const turmasPorNivel = () => {
    const map: Record<string, Turma[]> = {};
    for (const t of turmas) {
      if (!map[t.nivel]) map[t.nivel] = [];
      map[t.nivel].push(t);
    }
    return map;
  };

  const turmasPorCurso = () => {
    type G = { curso: Curso | null; niveis: Record<string, Turma[]> };
    const map: Record<string, G> = {};
    for (const t of turmas) {
      const key = t.curso_id ?? "__sem_curso__";
      if (!map[key]) {
        map[key] = { curso: cursos.find(c => c.id === t.curso_id) ?? null, niveis: {} };
      }
      if (!map[key].niveis[t.nivel]) map[key].niveis[t.nivel] = [];
      map[key].niveis[t.nivel].push(t);
    }
    return map;
  };

  // ── Handlers ─────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({ codigo_turma: "", nivel: "", turno: "manha" });
    setEditingTurma(null);
    setShowForm(false);
  };

  const handleEdit = (t: Turma) => {
    setEditingTurma(t);
    setFormData({ codigo_turma: t.codigo_turma, nivel: t.nivel, turno: t.turno, curso_id: t.curso_id });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codigo_turma.trim() || !formData.nivel || !formData.turno) {
      showMsg("error", "Preencha todos os campos obrigatórios");
      return;
    }
    try {
      if (editingTurma) {
        await atualizarTurma(editingTurma.codigo_turma, {
          nivel: formData.nivel, turno: formData.turno, curso_id: formData.curso_id || undefined,
        });
        showMsg("success", "Turma actualizada com sucesso");
      } else {
        await criarTurma({
          codigo_turma: formData.codigo_turma, nivel: formData.nivel,
          turno: formData.turno, curso_id: formData.curso_id || undefined,
        });
        showMsg("success", "Turma criada com sucesso");
      }
      resetForm();
      reload();
    } catch (err: any) {
      showMsg("error", err?.message || "Erro ao guardar turma");
    }
  };

  const handleAdd = async (codigoTurma: string) => {
    if (!codigoAdd.trim()) return;
    try {
      await adicionarEstudante(codigoTurma, { codigo_estudante: codigoAdd.trim() });
      showMsg("success", "Estudante adicionado");
      setCodigoAdd(""); setAddingTo(null);
      reload();
    } catch (err: any) {
      showMsg("error", err?.message || "Erro ao adicionar estudante");
    }
  };

  const handleRemove = async (codigoTurma: string, codigoEstudante: string) => {
    try {
      await removerEstudante(codigoTurma, codigoEstudante);
      showMsg("success", "Estudante removido");
      reload();
    } catch (err: any) {
      showMsg("error", err?.message || "Erro ao remover estudante");
    }
  };

  // ── TurmaCard ────────────────────────────────────────────────────────

  const TurmaCard = ({ turma }: { turma: Turma }) => {
    const isOpen     = expandedTurma === turma.codigo_turma;
    const isAdding   = addingTo === turma.codigo_turma;

    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          onClick={() => setExpandedTurma(isOpen ? null : turma.codigo_turma)}
        >
          <div className="flex items-center gap-3">
            <Icon icon="mdi:door-closed" className="text-brand-500 w-5 h-5" />
            <span className="font-semibold text-gray-900 dark:text-white">{turma.codigo_turma}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">· {labelTurno(turma.turno)}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              turma.status === "ativo"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            }`}>{turma.status}</span>
          </div>
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Icon icon="mdi:account-group" className="w-4 h-4" />
              {turma.estudantes.length}
            </span>
            <button
              onClick={() => handleEdit(turma)}
              className="p-1.5 text-gray-400 hover:text-brand-500 transition-colors"
              title="Editar"
            >
              <Icon icon="mdi:pencil" className="w-4 h-4" />
            </button>
            <Icon icon={isOpen ? "mdi:chevron-up" : "mdi:chevron-down"} className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        {isOpen && (
          <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700/50 space-y-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Estudantes ({turma.estudantes.length})
            </p>

            {turma.estudantes.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nenhum estudante nesta turma</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {turma.estudantes.map(codigo => {
                  const est = estudantes.find(e => e.codigo_estudante === codigo);
                  return (
                    <div key={codigo} className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-lg px-2.5 py-1.5">
                      <Icon icon="mdi:account" className="w-3.5 h-3.5 text-brand-500" />
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {est ? est.nome : codigo}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500">({codigo})</span>
                      <button
                        onClick={() => handleRemove(turma.codigo_turma, codigo)}
                        disabled={removendo}
                        className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Remover da turma"
                      >
                        <Icon icon="mdi:close-circle" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {isAdding ? (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={codigoAdd}
                  onChange={e => setCodigoAdd(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdd(turma.codigo_turma); } }}
                  placeholder="Código do estudante"
                  list="estudantes-list-dp"
                  className="flex-1 text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                />
                <datalist id="estudantes-list-dp">
                  {estudantes.map(e => (
                    <option key={e.codigo_estudante} value={e.codigo_estudante}>{e.nome}</option>
                  ))}
                </datalist>
                <button
                  onClick={() => handleAdd(turma.codigo_turma)}
                  disabled={adicionando || !codigoAdd.trim()}
                  className="px-3 py-1.5 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
                >
                  {adicionando ? "…" : "Adicionar"}
                </button>
                <button
                  onClick={() => { setAddingTo(null); setCodigoAdd(""); }}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingTo(turma.codigo_turma)}
                className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-600 transition-colors"
              >
                <Icon icon="mdi:account-plus" className="w-4 h-4" />
                Adicionar estudante
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Formulário ───────────────────────────────────────────────────────

  const Form = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-theme-xs p-6 border border-gray-200 dark:border-gray-700">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingTurma ? "Editar Turma" : "Nova Turma"}
          </h3>
          <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <Icon icon="mdi:close" width={20} />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código da Turma *</label>
          <input
            type="text"
            value={formData.codigo_turma}
            onChange={e => setFormData({ ...formData, codigo_turma: e.target.value })}
            disabled={!!editingTurma}
            placeholder="Ex: 7A, 8B, Turma-1"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
          />
          {editingTurma && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">O código não pode ser alterado após a criação</p>
          )}
        </div>

        {!isFundamental && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Curso *</label>
            <select
              value={formData.curso_id ?? ""}
              onChange={e => setFormData({ ...formData, curso_id: e.target.value || undefined, nivel: "" })}
              disabled={!!editingTurma}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
            >
              <option value="">Selecione um curso</option>
              {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            {cursos.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                ⚠️ Nenhum curso activo. Crie um curso na aba &quot;Cursos&quot; primeiro.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nível / Ano *</label>
          <select
            value={formData.nivel}
            onChange={e => setFormData({ ...formData, nivel: e.target.value })}
            disabled={!isFundamental && !formData.curso_id}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
          >
            <option value="">Selecione o ano</option>
            {getNivelOptions(formData.curso_id).map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turno *</label>
          <div className="flex gap-3">
            {TURNOS.map(t => (
              <button
                key={t.value} type="button"
                onClick={() => setFormData({ ...formData, turno: t.value })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  formData.turno === t.value
                    ? "bg-brand-500 text-white border-brand-500"
                    : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit" disabled={criando || atualizando}
            className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {criando || atualizando ? "A guardar…" : editingTurma ? "Actualizar" : "Criar Turma"}
          </button>
          <button
            type="button" onClick={resetForm}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );

  // ── Vista fundamental (ano → turmas) ────────────────────────────────

  const ViewFundamental = () => {
    const porNivel = turmasPorNivel();
    const niveisComTurmas = ANOS_FUNDAMENTAL.filter(a => porNivel[a.value]?.length > 0);
    if (niveisComTurmas.length === 0) return <Empty />;
    return (
      <div className="space-y-3">
        {niveisComTurmas.map(ano => {
          const isOpen = expandedNivel === ano.value;
          const lista  = porNivel[ano.value] ?? [];
          return (
            <div key={ano.value} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedNivel(isOpen ? null : ano.value)}
                className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon icon="mdi:school" className="text-brand-500 w-5 h-5" />
                  <span className="font-semibold text-gray-800 dark:text-white">{ano.label}</span>
                  <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">
                    {lista.length} turma{lista.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <Icon icon={isOpen ? "mdi:chevron-up" : "mdi:chevron-down"} className="w-5 h-5 text-gray-400" />
              </button>
              {isOpen && (
                <div className="p-3 space-y-2">
                  {lista.map(t => <TurmaCard key={t.codigo_turma} turma={t} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Vista médio/superior (curso → ano → turmas) ──────────────────────

  const ViewCursos = () => {
    const porCurso = turmasPorCurso();
    if (Object.keys(porCurso).length === 0) return <Empty />;
    return (
      <div className="space-y-3">
        {Object.entries(porCurso).map(([cursoKey, { curso, niveis }]) => {
          const isCursoOpen  = expandedCurso === cursoKey;
          const totalTurmas  = Object.values(niveis).reduce((s, a) => s + a.length, 0);
          return (
            <div key={cursoKey} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedCurso(isCursoOpen ? null : cursoKey)}
                className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon icon="mdi:book-education" className="text-brand-500 w-5 h-5" />
                  <span className="font-semibold text-gray-800 dark:text-white">
                    {curso ? curso.nome : "Sem curso associado"}
                  </span>
                  <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">
                    {totalTurmas} turma{totalTurmas !== 1 ? "s" : ""}
                  </span>
                </div>
                <Icon icon={isCursoOpen ? "mdi:chevron-up" : "mdi:chevron-down"} className="w-5 h-5 text-gray-400" />
              </button>
              {isCursoOpen && (
                <div className="p-3 space-y-2">
                  {Object.entries(niveis).map(([nivel, lista]) => {
                    const nivelKey = `${cursoKey}__${nivel}`;
                    const isNivel  = expandedNivel === nivelKey;
                    return (
                      <div key={nivel} className="border border-gray-100 dark:border-gray-700/50 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedNivel(isNivel ? null : nivelKey)}
                          className="w-full flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon icon="mdi:school-outline" className="text-gray-400 w-4 h-4" />
                            <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{labelNivel(nivel)}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              · {lista.length} turma{lista.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <Icon icon={isNivel ? "mdi:chevron-up" : "mdi:chevron-down"} className="w-4 h-4 text-gray-400" />
                        </button>
                        {isNivel && (
                          <div className="p-2 space-y-2">
                            {lista.map(t => <TurmaCard key={t.codigo_turma} turma={t} />)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const Empty = () => (
    <div className="text-center py-12 text-gray-400 dark:text-gray-500">
      <Icon icon="mdi:google-classroom" className="w-12 h-12 mx-auto mb-3 opacity-40" />
      <p className="text-sm">Nenhuma turma criada ainda. Clique em &quot;Nova Turma&quot; para começar.</p>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {alert && (
        <Alert
          variant={alert.variant}
          title={alert.variant === "success" ? "Sucesso" : alert.variant === "error" ? "Erro" : "Aviso"}
          message={alert.message}
        />
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Turmas
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {`Gerencie as matérias da sua ${user?.academia?.type == "escola" ? "escola" : "universidade"}. ${isMisto ? "" : `Elas estão organizadas ${isFundamental ? "por ano escolar" : "por curso → ano"}.`}`}
          </p>
        </div>
        <div className="flex gap-3">
          {!showForm && (
            <Button disabled={carregando} onClick={reload}>Actualizar</Button>
          )}
          <Button startIcon={<Icon icon="mdi:plus" />} onClick={() => setShowForm(!showForm)}>
            Nova Turma
          </Button>
        </div>
      </div>

      {showForm && <Form />}

      {carregando && !showForm && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        </div>
      )}

      {!carregando && !showForm && (
        isFundamental ? <ViewFundamental /> : <ViewCursos />
      )}
    </div>
  );
}