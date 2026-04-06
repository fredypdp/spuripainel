"use client"
import { useState, useEffect } from "react";
import { useApi, academiaService } from "@/lib/api";
import type { Curso, CursoType, MeuPerfilResponse } from "@/types/api";
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import Alert from "@/components/ui/alert/Alert";
import Checkbox from "@/components/form/input/Checkbox";
import { Modal } from "@/components/ui/modal";
import { getCookie } from "@/lib/utils/cookies";

// ── Helpers ───────────────────────────────────────────────────────────────────

const gerarAnosMedio = (n: number) => Array.from({ length: n }, (_, i) => ({ value: `${i + 1}_ano_medio`, label: `${i + 1}º Ano Médio` }));
const gerarAnosSuperior = (n: number) => Array.from({ length: n }, (_, i) => ({ value: `${i + 1}_ano_superior`, label: `${i + 1}º Ano Superior` }));
const gerarSemestres = (n: number) => Array.from({ length: n }, (_, i) => ({ value: `${i + 1}_semestre`, label: `${i + 1}º Semestre` }));

const formatarNivelLabel = (nivel: string): string => {
  const m = nivel.match(/^(\d+)_ano_(medio|superior)$/);
  if (m) { const tipo = m[2] === "medio" ? "Médio" : "Superior"; return `${m[1]}º ${tipo}`; }
  return nivel.replace(/_/g, " ");
};

interface CursoFormData {
  nome: string; type: CursoType; anos_academicos: string[];
  numAnos: number; periodos: string[]; numSemestres: number;
}

const getUserFromCookie = (): MeuPerfilResponse | null => {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(getCookie("user") ?? ""); } catch { return null; }
};

// ── Batch types ───────────────────────────────────────────────────────────────

interface BatchResultItem { id: string; nome: string; status: 'pending' | 'success' | 'error'; message?: string; }

// ── Modal Resultado Lote ──────────────────────────────────────────────────────

function ModalResultadoLote({ isOpen, onClose, items, titulo, progresso }: { isOpen: boolean; onClose: () => void; items: BatchResultItem[]; titulo: string; progresso: number }) {
  const ok = items.filter(i => i.status === 'success').length;
  const err = items.filter(i => i.status === 'error').length;
  const done = progresso >= 100 || items.every(i => i.status !== 'pending');
  return (
    <Modal isOpen={isOpen} onClose={done ? onClose : () => {}} showCloseButton={done} className="max-w-[520px] p-5 lg:p-8">
      <div>
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">{titulo}</h4>
        {!done && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1"><span>Processando...</span><span>{progresso}%</span></div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${progresso}%` }} /></div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] rounded-xl text-center"><div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{items.length}</div><div className="text-xs text-gray-500 mt-0.5">Total</div></div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-center"><div className="text-2xl font-bold text-green-700 dark:text-green-400">{ok}</div><div className="text-xs text-green-600 mt-0.5">Sucesso</div></div>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center"><div className="text-2xl font-bold text-red-700 dark:text-red-400">{err}</div><div className="text-xs text-red-600 mt-0.5">Falhas</div></div>
        </div>
        <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-gray-200 dark:border-white/[0.05] p-2">
          {items.map((item, i) => (
            <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${item.status === 'success' ? 'bg-green-50 dark:bg-green-900/10' : item.status === 'error' ? 'bg-red-50 dark:bg-red-900/10' : 'bg-gray-50 dark:bg-white/[0.02]'}`}>
              {item.status === 'pending' && <span className="w-3.5 h-3.5 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin flex-shrink-0" />}
              {item.status === 'success' && <Icon icon="mdi:check-circle" width={16} className="text-green-500 flex-shrink-0" />}
              {item.status === 'error' && <Icon icon="mdi:close-circle" width={16} className="text-red-500 flex-shrink-0" />}
              <div className="min-w-0 flex-1">
                <span className="font-medium text-gray-800 dark:text-white/90 truncate block">{item.nome}</span>
                {item.message && <span className="text-xs text-red-600 dark:text-red-400 truncate block">{item.message}</span>}
              </div>
            </div>
          ))}
        </div>
        {done && <div className="flex justify-end mt-5"><Button size="sm" variant="outline" onClick={onClose}>Fechar</Button></div>}
      </div>
    </Modal>
  );
}

// ── Barra de lote ─────────────────────────────────────────────────────────────

function BarraLoteCursos({ selecionadas, cursosList, onLimpar, onAtivar, onDesativar, onDeletar, carregando }: {
  selecionadas: Set<string>; cursosList: Curso[]; onLimpar: () => void;
  onAtivar: () => void; onDesativar: () => void; onDeletar: () => void; carregando: boolean;
}) {
  if (selecionadas.size === 0) return null;
  const sel = cursosList.filter(c => selecionadas.has(c.id));
  const ativas = sel.filter(c => c.status === 'ativo').length;
  const inativas = sel.filter(c => c.status === 'inativo').length;
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold">{selecionadas.size}</span>
        <span className="text-sm font-medium text-brand-700 dark:text-brand-300">curso{selecionadas.size !== 1 ? 's' : ''} selecionado{selecionadas.size !== 1 ? 's' : ''}</span>
        {ativas > 0 && <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">{ativas} ativo{ativas !== 1 ? 's' : ''}</span>}
        {inativas > 0 && <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">{inativas} inativo{inativas !== 1 ? 's' : ''}</span>}
      </div>
      <div className="flex items-center gap-2 ml-auto">
        {inativas > 0 && <Button size="sm" variant="success" disabled={carregando} onClick={onAtivar} startIcon={<Icon icon="mdi:play-circle-outline" width={16} />}>{carregando ? '...' : `Ativar ${inativas}`}</Button>}
        {ativas > 0 && <Button size="sm" variant="warning" disabled={carregando} onClick={onDesativar} startIcon={<Icon icon="mdi:pause-circle-outline" width={16} />}>{carregando ? '...' : `Desativar ${ativas}`}</Button>}
        {inativas > 0 && <Button size="sm" variant="danger" disabled={carregando} onClick={onDeletar} startIcon={<Icon icon="mdi:delete-outline" width={16} />}>{carregando ? '...' : `Deletar ${inativas}`}</Button>}
        <button onClick={onLimpar} className="p-1.5 rounded-lg text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
      </div>
    </div>
  );
}

// ── Modal confirmar deleção ───────────────────────────────────────────────────

function ModalConfirmarDeleteCurso({ curso, onConfirm, onClose }: { curso: Curso; onConfirm: () => Promise<void>; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  async function handle() { setLoading(true); try { await onConfirm(); onClose(); } finally { setLoading(false); } }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Deletar Curso</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Tem certeza que deseja deletar <span className="font-medium text-gray-700 dark:text-gray-200">{curso.nome}</span>?</p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">⚠️ Matérias inativas e turmas inativas vinculadas também serão deletadas em cascata.</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancelar</Button>
          <button onClick={handle} disabled={loading} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">{loading ? "Deletando..." : "Deletar"}</button>
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
  const [alert, setAlert] = useState<{ variant: "success" | "error" | "warning" | "info"; message: string } | null>(null);
  const [viewTipoCurso, setViewTipoCurso] = useState<"medio" | "superior">("medio");
  const [secaoAberta, setSecaoAberta] = useState<Record<string, boolean>>({});

  // Lote
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [loteItems, setLoteItems] = useState<BatchResultItem[]>([]);
  const [loteTitulo, setLoteTitulo] = useState('');
  const [loteProgresso, setLoteProgresso] = useState(0);
  const [loteCarregando, setLoteCarregando] = useState(false);
  const [loteModalOpen, setLoteModalOpen] = useState(false);

  const getDefaultType = (): CursoType => {
    if (!user?.academia) return "medio";
    return user.academia.type === "superior" ? "superior" : "medio";
  };

  const [formData, setFormData] = useState<CursoFormData>({ nome: "", type: getDefaultType(), anos_academicos: [], numAnos: 3, periodos: [], numSemestres: 6 });

  const { execute: executarListarCursos, data: cursos, loading: ListandoCursos } = useApi(academiaService.listarCursos);
  const { execute: executarCriarCurso, loading: CriandoCurso } = useApi(academiaService.criarCurso);
  const { execute: executarAtualizarCurso, loading: AtualizandoCurso } = useApi(academiaService.atualizarCurso);
  const { execute: executarAtivarCurso, error: erroAtivarCurso } = useApi(academiaService.ativarCurso);
  const { execute: executarDesativarCurso, error: erroDesativarCurso } = useApi(academiaService.desativarCurso);
  const { execute: executarDeletarCurso } = useApi(academiaService.deletarCurso);

  const isAcademiaMista = () => user?.academia?.type === "escola" && user?.academia?.nivel_escolar === "misto";
  const toggleSecao = (key: string) => setSecaoAberta(p => ({ ...p, [key]: p[key] === false ? true : false }));
  const isSecaoAberta = (key: string) => secaoAberta[key] !== false;

  useEffect(() => { executarListarCursos(); }, []);

  const showAlert = (variant: "success" | "error" | "warning" | "info", message: string) => {
    setAlert({ variant, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // Seleção handlers
  const handleToggleSelecao = (id: string) => {
    setSelecionadas(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const handleToggleTodas = (lista: Curso[]) => {
    setSelecionadas(prev => {
      const ids = lista.map(c => c.id);
      const todasSel = ids.every(id => prev.has(id));
      if (todasSel) { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; }
      const next = new Set(prev); ids.forEach(id => next.add(id)); return next;
    });
  };
  const limparSelecao = () => setSelecionadas(new Set());

  // Batch operations (individual calls for courses since batch endpoints do exist)
  const executarBatchSync = async (operacao: (id: string) => Promise<any>, ids: string[], titulo: string) => {
    const cursosSel = (cursos?.cursos ?? []).filter(c => ids.includes(c.id));
    setLoteTitulo(titulo);
    setLoteProgresso(0);
    setLoteCarregando(true);
    const items: BatchResultItem[] = cursosSel.map(c => ({ id: c.id, nome: c.nome, status: 'pending' }));
    setLoteItems(items);
    setLoteModalOpen(true);

    for (let i = 0; i < cursosSel.length; i++) {
      const c = cursosSel[i];
      try {
        await operacao(c.id);
        setLoteItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'success' } : it));
      } catch (err: any) {
        setLoteItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'error', message: err?.message } : it));
      }
      setLoteProgresso(Math.round(((i + 1) / cursosSel.length) * 100));
      await new Promise(r => setTimeout(r, 200));
    }

    setLoteProgresso(100);
    setLoteCarregando(false);
    limparSelecao();
    setTimeout(() => executarListarCursos(), 1000);
  };

  const handleAtivarLote = () => {
    const sel = (cursos?.cursos ?? []).filter(c => selecionadas.has(c.id) && c.status === 'inativo');
    if (!sel.length) return;
    executarBatchSync(id => executarAtivarCurso(id), sel.map(c => c.id), `Ativar ${sel.length} curso(s)`);
  };

  const handleDesativarLote = () => {
    const sel = (cursos?.cursos ?? []).filter(c => selecionadas.has(c.id) && c.status === 'ativo');
    if (!sel.length) return;
    executarBatchSync(id => executarDesativarCurso(id), sel.map(c => c.id), `Desativar ${sel.length} curso(s)`);
  };

  const handleDeletarLote = () => {
    const sel = (cursos?.cursos ?? []).filter(c => selecionadas.has(c.id) && c.status === 'inativo');
    if (!sel.length) return;
    executarBatchSync(id => executarDeletarCurso(id), sel.map(c => c.id), `Deletar ${sel.length} curso(s)`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) { showAlert("error", "Nome do curso é obrigatório"); return; }
    try {
      if (editingCurso) {
        await executarAtualizarCurso(editingCurso.id, { nome: formData.nome, type: formData.type });
        showAlert("success", "Curso atualizado com sucesso");
      } else {
        const anosGerados = formData.type === "medio" ? gerarAnosMedio(formData.numAnos).map(a => a.value) : gerarAnosSuperior(formData.numAnos).map(a => a.value);
        const periodosGerados = formData.type === "superior" ? gerarSemestres(formData.numSemestres).map(s => s.value) : undefined;
        await executarCriarCurso({ nome: formData.nome, type: formData.type, anos_academicos: anosGerados, ...(periodosGerados && { periodos: periodosGerados }) });
        showAlert("success", "Curso criado com sucesso");
      }
      resetForm(); executarListarCursos();
    } catch (error: any) { showAlert("error", error?.message || "Erro ao salvar curso"); }
  };

  const handleEdit = (curso: Curso) => {
    setEditingCurso(curso);
    setFormData({ nome: curso.nome, type: curso.type, anos_academicos: curso.anos_academicos, numAnos: curso.anos_academicos.length || 3, periodos: curso.periodos ?? [], numSemestres: curso.periodos?.length || 6 });
    setShowForm(true);
  };

  const handleToggleStatus = async (curso: Curso) => {
    try {
      if (curso.status === "ativo") { await executarDesativarCurso(curso.id); showAlert("success", "Curso desativado"); }
      else { await executarAtivarCurso(curso.id); showAlert("success", "Curso ativado"); }
      executarListarCursos();
    } catch (error: any) { showAlert("error", error?.message || "Erro ao alterar status"); }
  };

  const handleDeletar = async (cursoId: string) => {
    try {
      const res = await executarDeletarCurso(cursoId);
      let msg = "Curso deletado com sucesso";
      if (res?.turmas_deletadas?.length) msg += ` (${res.turmas_deletadas.length} turma(s) removida(s))`;
      if (res?.materias_deletadas?.length) msg += ` e ${res.materias_deletadas.length} matéria(s)`;
      showAlert("success", msg);
      executarListarCursos();
    } catch (e: any) { showAlert("error", e?.message ?? "Erro ao deletar curso"); }
  };

  const resetForm = () => { setFormData({ nome: "", type: getDefaultType(), anos_academicos: [], numAnos: 3, periodos: [], numSemestres: 6 }); setEditingCurso(null); setShowForm(false); };
  const isTipoDisabled = () => !!editingCurso || !!user?.academia?.type;
  const listaCursos = cursos?.cursos ?? [];

  return (
    <div className="space-y-6">
      {alert && <Alert variant={alert.variant} title={alert.variant === "success" ? "Sucesso" : alert.variant === "error" ? "Erro" : "Aviso"} message={alert.message} />}
      {erroAtivarCurso && <Alert variant="error" title="Erro ao ativar curso" message={erroAtivarCurso} />}
      {erroDesativarCurso && <Alert variant="error" title="Erro ao desativar curso" message={erroDesativarCurso} />}
      {cursoParaDelete && <ModalConfirmarDeleteCurso curso={cursoParaDelete} onConfirm={async () => { await handleDeletar(cursoParaDelete.id); }} onClose={() => setCursoParaDelete(null)} />}
      <ModalResultadoLote isOpen={loteModalOpen} onClose={() => setLoteModalOpen(false)} items={loteItems} titulo={loteTitulo} progresso={loteProgresso} />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cursos</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{`Gerencie os cursos da sua ${user?.academia?.type === "escola" ? "Escola" : "Superior"}`}</p>
        </div>
        {!showForm && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => executarListarCursos()} disabled={ListandoCursos}><Icon icon="mdi:refresh" width={16} />Carregar Cursos</Button>
            <Button size="sm" onClick={() => setShowForm(true)}><Icon icon="mdi:plus" width={16} />Novo Curso</Button>
          </div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editingCurso ? "Editar Curso" : "Novo Curso"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
              <input type="text" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Nome do curso" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as CursoType, anos_academicos: [] })} disabled={isTipoDisabled()} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white disabled:opacity-50">
                <option value="medio">Ensino Médio</option>
                <option value="superior">Ensino Superior</option>
              </select>
            </div>
            {!editingCurso && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Número de anos *
                    <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">(gera automaticamente: 1º…{formData.numAnos}º {formData.type === "medio" ? "Médio" : "Superior"})</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setFormData(p => ({ ...p, numAnos: Math.max(1, p.numAnos - 1) }))} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">−</button>
                    <span className="w-8 text-center font-semibold text-gray-900 dark:text-white">{formData.numAnos}</span>
                    <button type="button" onClick={() => setFormData(p => ({ ...p, numAnos: Math.min(10, p.numAnos + 1) }))} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">+</button>
                    <div className="flex flex-wrap gap-1 ml-2">
                      {(formData.type === "medio" ? gerarAnosMedio(formData.numAnos) : gerarAnosSuperior(formData.numAnos)).map(a => (
                        <span key={a.value} className="text-xs px-2 py-1 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded border border-brand-200 dark:border-brand-800">{a.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {formData.type === "superior" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Número de semestres *
                      <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">(gera: 1º…{formData.numSemestres}º Semestre)</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setFormData(p => ({ ...p, numSemestres: Math.max(1, p.numSemestres - 1) }))} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">−</button>
                      <span className="w-8 text-center font-semibold text-gray-900 dark:text-white">{formData.numSemestres}</span>
                      <button type="button" onClick={() => setFormData(p => ({ ...p, numSemestres: Math.min(20, p.numSemestres + 1) }))} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">+</button>
                      <div className="flex flex-wrap gap-1 ml-2">
                        {gerarSemestres(formData.numSemestres).map(s => (
                          <span key={s.value} className="text-xs px-2 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded border border-teal-200 dark:border-teal-800">{s.label}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="flex gap-3 pt-4">
              <button type="submit" className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
                {editingCurso ? (AtualizandoCurso ? "Atualizando..." : "Atualizar") : (CriandoCurso ? "Criando..." : "Criar Curso")}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {ListandoCursos && !showForm && <div className="flex justify-center items-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>}

      {!ListandoCursos && !showForm && (() => {
        if (listaCursos.length === 0) return (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Icon icon="mdi:book-education-outline" width={48} className="mx-auto mb-3 opacity-30" />
            <p>Nenhum curso cadastrado</p>
          </div>
        );

        const cursosVisiveis = isAcademiaMista() ? listaCursos.filter(c => c.type === viewTipoCurso) : listaCursos;
        const tiposPresentes = Array.from(new Set(cursosVisiveis.map(c => c.type))) as Array<"medio" | "superior">;
        const mostrarSecoes = !isAcademiaMista() && tiposPresentes.length > 1;
        const labelTipo = (t: string) => t === "medio" ? "Ensino Médio" : "Ensino Superior";
        const iconeTipo = (t: string) => t === "medio" ? "mdi:school" : "mdi:book-education";

        const todasSelecionadas = cursosVisiveis.length > 0 && cursosVisiveis.every(c => selecionadas.has(c.id));
        const algumasSelecionadas = cursosVisiveis.some(c => selecionadas.has(c.id));

        const CursoCard = ({ curso }: { curso: Curso }) => {
          const isSelecionado = selecionadas.has(curso.id);
          return (
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-6 border-2 transition-all ${
              curso.status === "deletado" ? "border-transparent opacity-40 pointer-events-none" :
              isSelecionado ? "border-brand-400 dark:border-brand-600 bg-brand-50/30 dark:bg-brand-900/10" :
              curso.status === "ativo" ? "border-green-200 dark:border-green-800" : "border-gray-200 dark:border-gray-700 opacity-70"
            }`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {curso.status !== "deletado" && (
                    <div className="flex-shrink-0 mt-0.5">
                      <Checkbox checked={isSelecionado} onChange={() => handleToggleSelecao(curso.id)} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{curso.nome}</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{curso.type === "medio" ? "Ensino Médio" : "Ensino Superior"}</span>
                  </div>
                </div>
                <span className={`flex-shrink-0 text-xs px-2 py-1 rounded-full ml-2 ${curso.status === "ativo" ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" : curso.status === "deletado" ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}>{curso.status}</span>
              </div>
              {curso.anos_academicos.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Anos:</p>
                  <div className="flex flex-wrap gap-1">
                    {curso.anos_academicos.map((n) => <span key={n} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">{formatarNivelLabel(n)}</span>)}
                  </div>
                </div>
              )}
              {curso.status !== "deletado" && (
                <>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(curso)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"><Icon icon="mdi:pencil" width={16} />Editar</button>
                    <button onClick={() => handleToggleStatus(curso)} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${curso.status === "ativo" ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100" : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100"}`}>
                      <Icon icon={curso.status === "ativo" ? "mdi:eye-off" : "mdi:eye"} width={16} />
                      {curso.status === "ativo" ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                  {curso.status === "inativo" && (
                    <button onClick={() => setCursoParaDelete(curso)} className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Icon icon="mdi:delete-outline" width={14} />Deletar curso
                    </button>
                  )}
                </>
              )}
            </div>
          );
        };

        const SecaoCursos = ({ tipo, lista }: { tipo: string; lista: Curso[] }) => {
          const key = tipo;
          const aberta = isSecaoAberta(key);
          const tipoSelecionadas = lista.every(c => selecionadas.has(c.id));
          const tipoAlgumas = lista.some(c => selecionadas.has(c.id));
          return (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Checkbox checked={tipoSelecionadas} indeterminate={tipoAlgumas && !tipoSelecionadas} onChange={() => handleToggleTodas(lista)} />
                <button onClick={() => toggleSecao(key)} className="flex-1 flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <Icon icon={iconeTipo(tipo)} className="w-4 h-4 text-brand-500" />
                    <span className="font-semibold text-sm text-gray-800 dark:text-white">{labelTipo(tipo)}</span>
                    <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">{lista.length} curso{lista.length !== 1 ? "s" : ""}</span>
                  </div>
                  <Icon icon={aberta ? "mdi:chevron-up" : "mdi:chevron-down"} className="w-5 h-5 text-gray-400" />
                </button>
              </div>
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
            {isAcademiaMista() && (
              <div className="flex items-center">
                <button onClick={() => setViewTipoCurso(v => v === "medio" ? "superior" : "medio")} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-brand-500 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
                  <Icon icon={viewTipoCurso === "medio" ? "mdi:book-education" : "mdi:school"} width={16} />
                  {viewTipoCurso === "medio" ? "Ver Cursos do Ensino Superior" : "Ver Cursos do Ensino Médio"}
                </button>
              </div>
            )}

            {/* Selecionar todas / barra de lote */}
            {cursosVisiveis.length > 1 && (
              <div className="flex items-center gap-2 px-1">
                <Checkbox checked={todasSelecionadas} indeterminate={algumasSelecionadas && !todasSelecionadas} onChange={() => handleToggleTodas(cursosVisiveis)} label={todasSelecionadas ? "Desselecionar todas" : "Selecionar todas"} />
              </div>
            )}

            {selecionadas.size > 0 && (
              <BarraLoteCursos
                selecionadas={selecionadas} cursosList={listaCursos}
                onLimpar={limparSelecao} onAtivar={handleAtivarLote} onDesativar={handleDesativarLote} onDeletar={handleDeletarLote}
                carregando={loteCarregando}
              />
            )}

            {mostrarSecoes ? (
              tiposPresentes.map(tipo => <SecaoCursos key={tipo} tipo={tipo} lista={cursosVisiveis.filter(c => c.type === tipo)} />)
            ) : (
              <SecaoCursos tipo={cursosVisiveis[0]?.type ?? "medio"} lista={cursosVisiveis} />
            )}
          </div>
        );
      })()}
    </div>
  );
}