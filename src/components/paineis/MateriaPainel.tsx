"use client"
import { useState, useEffect } from "react";
import { useApi, academiaService, tokenStorage } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import { AnoFundamental, AnoMedio, AnoSuperior, CriarMateriaRequest, Materia, MateriaType } from "@/types/api";
import Icon from "@/components/ui/Icon";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Checkbox from "@/components/form/input/Checkbox";
import { Modal } from "@/components/ui/modal";
import { getCookie } from '@/lib/utils/cookies';
import type { MeuPerfilResponse } from '@/types/api';

interface MateriaFormData {
  nome: string;
  type: MateriaType;
  anos_academicos: string[];
  curso_id?: string;
  periodo?: string;
  pendencia_permitida: boolean;
  pendencia_nivel_conclusao?: string;
}

const ANOS_FUNDAMENTAL = [
  { value: "1_ano_fundamental", label: "1º Ano" },
  { value: "2_ano_fundamental", label: "2º Ano" },
  { value: "3_ano_fundamental", label: "3º Ano" },
  { value: "4_ano_fundamental", label: "4º Ano" },
  { value: "5_ano_fundamental", label: "5º Ano" },
  { value: "6_ano_fundamental", label: "6º Ano" },
  { value: "7_ano_fundamental", label: "7º Ano" },
  { value: "8_ano_fundamental", label: "8º Ano" },
  { value: "9_ano_fundamental", label: "9º Ano" },
];

const formatarPeriodoLabel = (p: string): string => {
  const m = p.match(/^(\d+)_semestre$/);
  if (m) return `${m[1]}º Semestre`;
  return p.replace(/_/g, " ");
};

const getUserFromCookie = (): MeuPerfilResponse | null => {
  if (typeof window === "undefined") return null;
  const c = getCookie("user");
  if (!c) return null;
  try { return JSON.parse(c); } catch { return null; }
};

// ── Batch result types ────────────────────────────────────────────────────────

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

function BarraLoteMaterias({ selecionadas, materiasList, onLimpar, onAtivar, onDesativar, onDeletar, carregando }: {
  selecionadas: Set<string>; materiasList: Materia[]; onLimpar: () => void;
  onAtivar: () => void; onDesativar: () => void; onDeletar: () => void; carregando: boolean;
}) {
  if (selecionadas.size === 0) return null;
  const sel = materiasList.filter(m => selecionadas.has(m.id));
  const ativas = sel.filter(m => m.status === 'ativo').length;
  const inativas = sel.filter(m => m.status === 'inativo').length;
  const deletaveis = sel.filter(m => m.status === 'inativo').length;
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold">{selecionadas.size}</span>
        <span className="text-sm font-medium text-brand-700 dark:text-brand-300">matéria{selecionadas.size !== 1 ? 's' : ''} selecionada{selecionadas.size !== 1 ? 's' : ''}</span>
        {ativas > 0 && <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">{ativas} ativa{ativas !== 1 ? 's' : ''}</span>}
        {inativas > 0 && <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">{inativas} inativa{inativas !== 1 ? 's' : ''}</span>}
      </div>
      <div className="flex items-center gap-2 ml-auto">
        {inativas > 0 && <Button size="sm" variant="success" disabled={carregando} onClick={onAtivar} startIcon={<Icon icon="mdi:play-circle-outline" width={16} />}>{carregando ? '...' : `Ativar ${inativas}`}</Button>}
        {ativas > 0 && <Button size="sm" variant="warning" disabled={carregando} onClick={onDesativar} startIcon={<Icon icon="mdi:pause-circle-outline" width={16} />}>{carregando ? '...' : `Desativar ${ativas}`}</Button>}
        {deletaveis > 0 && <Button size="sm" variant="danger" disabled={carregando} onClick={onDeletar} startIcon={<Icon icon="mdi:delete-outline" width={16} />}>{carregando ? '...' : `Deletar ${deletaveis}`}</Button>}
        <button onClick={onLimpar} className="p-1.5 rounded-lg text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
      </div>
    </div>
  );
}

// ── Modais ────────────────────────────────────────────────────────────────────

function ModalConfirmarDelete({ materia, onConfirm, onClose }: { materia: Materia; onConfirm: () => Promise<void>; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  async function handle() { setLoading(true); try { await onConfirm(); onClose(); } finally { setLoading(false); } }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Deletar Matéria</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Tem certeza que deseja deletar <span className="font-medium text-gray-700 dark:text-gray-200">{materia.nome}</span>? O histórico é preservado no ledger.</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancelar</Button>
          <button onClick={handle} disabled={loading} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">{loading ? "Deletando..." : "Deletar"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Chips de anos ─────────────────────────────────────────────────────────────

const CHIPS_LIMIT = 4;

function AnosChips({ anos }: { anos: string[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!anos || anos.length === 0) return null;
  const visible = expanded ? anos : anos.slice(0, CHIPS_LIMIT);
  const hasMore = anos.length > CHIPS_LIMIT;
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visible.map(a => (
        <span key={a} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
          {a.replace(/^(\d+)_ano_(fundamental|medio|superior)$/, (_, n, tipo) => {
            const abrev: Record<string, string> = { fundamental: "Fund.", medio: "Méd.", superior: "Sup." };
            return `${n}º ${abrev[tipo] ?? tipo}`;
          })}
        </span>
      ))}
      {hasMore && (
        <button onClick={() => setExpanded(p => !p)} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors">
          {expanded ? "▲ menos" : `+${anos.length - CHIPS_LIMIT} mais`}
        </button>
      )}
    </div>
  );
}

// ── Card de matéria ───────────────────────────────────────────────────────────

function MateriaCard({ materia, getCursoNome, onEdit, onToggleStatus, onDelete, selecionada, onToggleSelecao }: {
  materia: Materia; getCursoNome: (id?: string) => string;
  onEdit: (m: Materia) => void; onToggleStatus: (m: Materia) => void;
  onDelete: (m: Materia) => void;
  selecionada?: boolean; onToggleSelecao?: (id: string) => void;
}) {
  const podeDelete = materia.status === "inativo";

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-4 flex flex-col gap-3 border-2 transition-colors ${selecionada ? 'border-brand-400 dark:border-brand-600 bg-brand-50/30 dark:bg-brand-900/10' : 'border-transparent'}`}>
      {/* Header */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          {onToggleSelecao && (
            <div className="flex-shrink-0 mt-0.5">
              <Checkbox checked={!!selecionada} onChange={() => onToggleSelecao(materia.id)} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-gray-900 dark:text-white truncate">{materia.nome}</h4>
            <div className="flex flex-wrap gap-1 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${materia.type === "fundamental" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : materia.type === "medio" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"}`}>
                {materia.type === "fundamental" ? "Fundamental" : materia.type === "medio" ? "Médio" : "Superior"}
              </span>
              {materia.type === "superior" && (materia.periodo ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">{formatarPeriodoLabel(materia.periodo)}</span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Período não definido</span>
              ))}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${materia.status === "ativo" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                {materia.status === "ativo" ? "Ativa" : "Inativa"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {materia.curso_id && <p className="text-xs text-gray-500 dark:text-gray-400">Curso: <span className="font-medium">{getCursoNome(materia.curso_id)}</span></p>}
      {materia.anos_academicos && materia.anos_academicos.length > 0 && <AnosChips anos={materia.anos_academicos} />}

      <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
        <button onClick={() => onEdit(materia)} className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-brand-500 transition-colors"><Icon icon="mdi:pencil" width={14} />Editar</button>
        <button onClick={() => onToggleStatus(materia)} className={`flex items-center gap-1 px-2 py-1 text-xs transition-colors ${materia.status === "ativo" ? "text-orange-600 dark:text-orange-400 hover:text-orange-700" : "text-green-600 dark:text-green-400 hover:text-green-700"}`}>
          <Icon icon={materia.status === "ativo" ? "mdi:pause-circle" : "mdi:play-circle"} width={14} />
          {materia.status === "ativo" ? "Desativar" : "Ativar"}
        </button>
        {podeDelete && (
          <button onClick={() => onDelete(materia)} className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 transition-colors ml-auto"><Icon icon="mdi:delete-outline" width={14} />Deletar</button>
        )}
      </div>
    </div>
  );
}

// ── Seção agrupada ────────────────────────────────────────────────────────────

function formatarSecaoLabel(ano: string): string {
  const m = ano.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!m) return ano.replace(/_/g, " ");
  const tipo: Record<string, string> = { fundamental: "Fundamental", medio: "Médio", superior: "Superior" };
  return `${m[1]}º Ano — ${tipo[m[2]] ?? m[2]}`;
}

function MateriasAgrupadas({ materias, getCursoNome, onEdit, onToggleStatus, onDelete, selecionadas, onToggleSelecao, onToggleTodas }: {
  materias: Materia[]; getCursoNome: (id?: string) => string;
  onEdit: (m: Materia) => void; onToggleStatus: (m: Materia) => void;
  onDelete: (m: Materia) => void; selecionadas: Set<string>;
  onToggleSelecao: (id: string) => void; onToggleTodas: (lista: Materia[]) => void;
}) {
  const [secaoAberta, setSecaoAberta] = useState<Record<string, boolean>>({});

  const grupos: Record<string, Materia[]> = {};
  for (const m of materias) {
    const anos = m.anos_academicos && m.anos_academicos.length > 0 ? m.anos_academicos : ["__sem_ano__"];
    for (const ano of anos) {
      if (!grupos[ano]) grupos[ano] = [];
      if (!grupos[ano].find(x => x.id === m.id)) grupos[ano].push(m);
    }
  }

  const ordenarAno = (a: string): number => {
    const m = a.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
    if (!m) return 9999;
    const peso: Record<string, number> = { fundamental: 0, medio: 100, superior: 200 };
    return (peso[m[2]] ?? 300) + parseInt(m[1]);
  };

  const secoes = Object.keys(grupos).sort((a, b) => {
    if (a === "__sem_ano__") return 1;
    if (b === "__sem_ano__") return -1;
    return ordenarAno(a) - ordenarAno(b);
  });

  const isAberta = (ano: string) => secaoAberta[ano] !== false;
  const toggleSecao = (ano: string) => setSecaoAberta(p => ({ ...p, [ano]: !isAberta(ano) }));

  const todasMaterias = materias;
  const todasSelecionadas = todasMaterias.length > 0 && todasMaterias.every(m => selecionadas.has(m.id));
  const algumasSelecionadas = todasMaterias.some(m => selecionadas.has(m.id));

  return (
    <div className="space-y-4">
      {todasMaterias.length > 1 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox checked={todasSelecionadas} indeterminate={algumasSelecionadas && !todasSelecionadas} onChange={() => onToggleTodas(todasMaterias)} label={todasSelecionadas ? "Desselecionar todas" : "Selecionar todas"} />
        </div>
      )}
      {secoes.map(ano => {
        const lista = grupos[ano];
        const aberta = isAberta(ano);
        const heading = ano === "__sem_ano__" ? "Sem ano definido" : formatarSecaoLabel(ano);
        const secaoSelecionadas = lista.every(m => selecionadas.has(m.id));
        const secaoAlgumas = lista.some(m => selecionadas.has(m.id));
        return (
          <section key={ano}>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox checked={secaoSelecionadas} indeterminate={secaoAlgumas && !secaoSelecionadas} onChange={() => onToggleTodas(lista)} />
              <button onClick={() => toggleSecao(ano)} className="flex-1 flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors">
                <div className="flex items-center gap-3">
                  <Icon icon="mdi:school-outline" className="w-4 h-4 text-brand-500" />
                  <span className="font-semibold text-sm text-gray-800 dark:text-white">{heading}</span>
                  <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">{lista.length} matéria{lista.length !== 1 ? "s" : ""}</span>
                </div>
                <Icon icon={aberta ? "mdi:chevron-up" : "mdi:chevron-down"} className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            {aberta && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lista.map(materia => (
                  <MateriaCard
                    key={materia.id} materia={materia} getCursoNome={getCursoNome}
                    onEdit={onEdit}
                    onToggleStatus={onToggleStatus}
                    onDelete={onDelete} selecionada={selecionadas.has(materia.id)}
                    onToggleSelecao={onToggleSelecao}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

function buildMateriaPayload(formData: MateriaFormData, incluirType: boolean): CriarMateriaRequest {
  if (formData.type === "fundamental") {
    return { nome: formData.nome.trim(), ...(incluirType ? { type: "fundamental" as const } : {}), anos_academicos: formData.anos_academicos as AnoFundamental[] };
  }
  if (formData.type === "medio") {
    return {
      nome: formData.nome.trim(),
      ...(incluirType ? { type: "medio" as const } : {}),
      anos_academicos: formData.anos_academicos as AnoMedio[],
      curso_id: formData.curso_id ?? "",
      ...(formData.pendencia_permitida ? { pendencia_permitida: true, ...(formData.pendencia_nivel_conclusao ? { pendencia_nivel_conclusao: formData.pendencia_nivel_conclusao as AnoMedio } : {}) } : {}),
    };
  }
  return {
    nome: formData.nome.trim(),
    ...(incluirType ? { type: "superior" as const } : {}),
    anos_academicos: formData.anos_academicos,
    curso_id: formData.curso_id ?? "",
    periodo: formData.periodo as AnoSuperior,
    ...(formData.pendencia_permitida ? { pendencia_permitida: true, ...(formData.pendencia_nivel_conclusao ? { pendencia_nivel_conclusao: formData.pendencia_nivel_conclusao as AnoSuperior } : {}) } : {}),
  };
}

export default function MateriaPainel() {
  const [showForm, setShowForm] = useState(false);
  const [editingMateria, setEditingMateria] = useState<Materia | null>(null);
  const [alert, setAlert] = useState<{ variant: "success" | "error" | "warning" | "info"; message: string } | null>(null);
  const [user] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());
  const [materiaParaDelete, setMateriaParaDelete] = useState<Materia | null>(null);
  const [viewNivel, setViewNivel] = useState<"fundamental" | "medio">("fundamental");

  // Lote
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [loteItems, setLoteItems] = useState<BatchResultItem[]>([]);
  const [loteTitulo, setLoteTitulo] = useState('');
  const [loteProgresso, setLoteProgresso] = useState(0);
  const [loteCarregando, setLoteCarregando] = useState(false);
  const [loteModalOpen, setLoteModalOpen] = useState(false);

  const { execute: executarCriarMateria, loading: criandoMateria } = useApi(academiaService.criarMateria);
  const { execute: executarAtualizarMateria, loading: atualizandoMateria } = useApi(academiaService.atualizarMateria);
  const { execute: executarListarMaterias, data: materiasRaw, loading: ListandoMaterias } = useApi(academiaService.listarMaterias);
  const { execute: executarListarCursos, data: cursosRaw, loading: ListandoCursos } = useApi(academiaService.listarCursos);
  const { execute: executarAtivarMateria } = useApi(academiaService.ativarMateria);
  const { execute: executarDesativarMateria } = useApi(academiaService.desativarMateria);
  const { execute: executarDeletarMateria } = useApi(academiaService.deletarMateria);

  const listaMaterias: Materia[] = materiasRaw?.materias ?? [];
  const listaCursos = cursosRaw?.cursos ?? [];

  // nivel === 'escola' && nivel_escolar === 'misto' → academia mista
  const isAcademiaMista = () => user?.academia?.nivel === "escola" && user?.academia?.nivel_escolar === "misto";
  const isTipoDisabled = () => !isAcademiaMista();

  const getDefaultType = (): MateriaType => {
    const nivel = user?.academia?.nivel;
    const nivelEscolar = user?.academia?.nivel_escolar;
    if (nivel === "superior") return "superior";
    if (nivelEscolar === "fundamental") return "fundamental";
    if (nivelEscolar === "medio") return "medio";
    return "fundamental";
  };

  const [formData, setFormData] = useState<MateriaFormData>({ nome: "", type: getDefaultType(), anos_academicos: [], curso_id: undefined, periodo: undefined, pendencia_permitida: false, pendencia_nivel_conclusao: undefined });

  useEffect(() => {
    const token = tokenStorage.get() ?? undefined;
    executarListarCursos(token);
    executarListarMaterias(token);
  }, [executarListarCursos, executarListarMaterias]);

  const showMsg = (variant: "success" | "error" | "warning" | "info", message: string) => {
    setAlert({ variant, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const carregarDados = async () => {
    const token = tokenStorage.get() ?? undefined;
    try { await Promise.all([executarListarCursos(token), executarListarMaterias(token)]); } catch {}
  };

  // ── Batch helpers ──────────────────────────────────────────────────────────

  const executarBatchSync = async (operacao: (id: string) => Promise<any>, ids: string[], titulo: string) => {
    const materiasSel = listaMaterias.filter(m => ids.includes(m.id));
    setLoteTitulo(titulo);
    setLoteProgresso(0);
    setLoteCarregando(true);
    const items: BatchResultItem[] = materiasSel.map(m => ({ id: m.id, nome: m.nome, status: 'pending' }));
    setLoteItems(items);
    setLoteModalOpen(true);

    for (let i = 0; i < materiasSel.length; i++) {
      const m = materiasSel[i];
      try {
        await operacao(m.id);
        setLoteItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'success' } : it));
      } catch (err: unknown) {
        setLoteItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'error', message: formatApiError(err, 'Falha') } : it));
      }
      setLoteProgresso(Math.round(((i + 1) / materiasSel.length) * 100));
      await new Promise(r => setTimeout(r, 150));
    }
    setLoteProgresso(100);
    setLoteCarregando(false);
    limparSelecao();
    setTimeout(carregarDados, 1000);
  };

  const handleAtivarLote = () => {
    const sel = listaMaterias.filter(m => selecionadas.has(m.id) && m.status === 'inativo');
    if (!sel.length) return;
    executarBatchSync(id => executarAtivarMateria(id), sel.map(m => m.id), `Ativar ${sel.length} matéria(s)`);
  };

  const handleDesativarLote = () => {
    const sel = listaMaterias.filter(m => selecionadas.has(m.id) && m.status === 'ativo');
    if (!sel.length) return;
    executarBatchSync(id => executarDesativarMateria(id), sel.map(m => m.id), `Desativar ${sel.length} matéria(s)`);
  };

  const handleDeletarLote = () => {
    const sel = listaMaterias.filter(m => selecionadas.has(m.id) && m.status === 'inativo');
    if (!sel.length) return;
    executarBatchSync(id => executarDeletarMateria(id), sel.map(m => m.id), `Deletar ${sel.length} matéria(s)`);
  };

  const limparSelecao = () => setSelecionadas(new Set());

  const handleToggleSelecao = (id: string) => {
    setSelecionadas(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const handleToggleTodas = (lista: Materia[]) => {
    setSelecionadas(prev => {
      const ids = lista.map(m => m.id);
      const todasSel = ids.every(id => prev.has(id));
      if (todasSel) { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; }
      const next = new Set(prev); ids.forEach(id => next.add(id)); return next;
    });
  };

  // ── Form handlers ──────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) { showMsg("error", "Nome da matéria é obrigatório"); return; }
    if (formData.anos_academicos.length === 0) { showMsg("error", "Selecione pelo menos um ano/nível"); return; }
    if (formData.type !== "fundamental" && formData.anos_academicos.length !== 1) { showMsg("error", "Matérias de Médio ou Superior devem possuir exatamente um ano/nível do curso."); return; }
    if (formData.type !== "fundamental" && !formData.curso_id) { showMsg("error", `Matérias do tipo ${formData.type === "medio" ? "Médio" : "Superior"} devem estar vinculadas a um curso`); return; }
    if (formData.type === "superior" && !formData.periodo) { showMsg("error", "Selecione o período/semestre da matéria superior na criação."); return; }
    try {
      if (editingMateria) { await executarAtualizarMateria(editingMateria.id, { nome: formData.nome }); showMsg("success", "Matéria atualizada com sucesso"); }
      else {
        const payload = buildMateriaPayload(formData, isAcademiaMista());
        await executarCriarMateria(payload);
        showMsg("success", "Matéria criada com sucesso");
      }
      resetForm(); carregarDados();
    } catch (error: unknown) { showMsg("error", formatApiError(error, "Erro ao salvar matéria")); }
  };

  const handleEdit = (materia: Materia) => {
    setEditingMateria(materia);
    setFormData({ nome: materia.nome, type: materia.type, anos_academicos: [], curso_id: undefined, periodo: undefined, pendencia_permitida: false, pendencia_nivel_conclusao: undefined });
    setShowForm(true);
  };

  const handleToggleStatus = async (materia: Materia) => {
    try {
      if (materia.status === "ativo") { await executarDesativarMateria(materia.id); showMsg("success", "Matéria desativada"); }
      else {
        await executarAtivarMateria(materia.id); showMsg("success", "Matéria ativada");
      }
      const token = tokenStorage.get() ?? undefined;
      executarListarMaterias(token);
    } catch (e: unknown) { showMsg("error", formatApiError(e, "Erro ao alterar status")); }
  };

  const handleDeletar = async (materiaId: string) => {
    await executarDeletarMateria(materiaId);
    showMsg("success", "Matéria deletada");
    carregarDados();
  };

  const resetForm = () => { setFormData({ nome: "", type: getDefaultType(), anos_academicos: [], curso_id: undefined, periodo: undefined, pendencia_permitida: false, pendencia_nivel_conclusao: undefined }); setEditingMateria(null); setShowForm(false); };

  const handleAnosToggle = (ano: string) => {
    setFormData(prev => {
      const selecionado = prev.anos_academicos.includes(ano);
      const anos_academicos = prev.type === "fundamental"
        ? (selecionado ? prev.anos_academicos.filter(a => a !== ano) : [...prev.anos_academicos, ano])
        : (selecionado ? [] : [ano]);
      return { ...prev, anos_academicos, pendencia_nivel_conclusao: undefined };
    });
  };

  const handleTypeChange = (newType: MateriaType) => { setFormData({ ...formData, type: newType, anos_academicos: [], curso_id: undefined, periodo: undefined, pendencia_permitida: false, pendencia_nivel_conclusao: undefined }); };

  const getCursosByType = () => listaCursos.filter(c => c.type === formData.type && c.status === "ativo");
  const getCursoNome = (cursoId?: string): string => { if (!cursoId) return ""; return listaCursos.find(c => c.id === cursoId)?.nome ?? cursoId; };
  const getPeriodosDisponiveis = () => {
    if (formData.type !== "superior" || !formData.curso_id) return [];
    return listaCursos.find(c => c.id === formData.curso_id)?.periodos ?? [];
  };

  const getPendenciaNiveisDisponiveis = () => formData.type === "superior" ? getPeriodosDisponiveis() : getAnosDisponiveis().map(a => a.value);

  const getAnosDisponiveis = () => {
    if (formData.type === "fundamental") {
      const anosAcademia = user?.academia?.anos_academicos?.filter(a => a.includes("fundamental")) ?? [];
      const permitidos = anosAcademia.length ? anosAcademia : [];
      return ANOS_FUNDAMENTAL.filter(a => permitidos.includes(a.value));
    }
    if (!formData.curso_id) return [];
    const curso = listaCursos.find(c => c.id === formData.curso_id);
    if (!curso) return [];
    return curso.anos_academicos.map(v => ({
      value: v,
      label: v.replace(/^(\d+)_ano_(.+)$/, (_, n, tipo) => `${n}º Ano ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`),
    }));
  };

  const tiposMateriaDisponiveis = (() => {
    const tipos: { value: string; label: string }[] = [];
    const nivel = user?.academia?.nivel;
    const nivelEscolar = user?.academia?.nivel_escolar;
    if (nivel === "escola") {
      if (nivelEscolar === "fundamental") tipos.push({ value: "fundamental", label: "Fundamental" });
      if (nivelEscolar === "medio") tipos.push({ value: "medio", label: "Médio" });
      if (nivelEscolar === "misto") { tipos.push({ value: "fundamental", label: "Fundamental" }); tipos.push({ value: "medio", label: "Médio" }); }
    } else if (nivel === "superior") { tipos.push({ value: "superior", label: "Superior" }); }
    return tipos;
  })();

  return (
    <div className="space-y-6">
      {materiaParaDelete && <ModalConfirmarDelete materia={materiaParaDelete} onConfirm={() => handleDeletar(materiaParaDelete.id)} onClose={() => setMateriaParaDelete(null)} />}
      <ModalResultadoLote isOpen={loteModalOpen} onClose={() => setLoteModalOpen(false)} items={loteItems} titulo={loteTitulo} progresso={loteProgresso} />
      {alert && <Alert variant={alert.variant} title={alert.variant === "success" ? "Sucesso" : alert.variant === "error" ? "Erro" : "Aviso"} message={alert.message} />}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Matérias Disciplinares</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{`Gerencie as matérias da sua ${user?.academia?.nivel === "superior" ? "Universidade" : "Escola"}`}</p>
        </div>
        {!showForm && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={carregarDados} disabled={ListandoMaterias || ListandoCursos}><Icon icon="mdi:refresh" width={16} />Carregar Matérias</Button>
            <Button size="sm" onClick={() => setShowForm(true)}><Icon icon="mdi:plus" width={16} />Nova Matéria</Button>
          </div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-xs p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editingMateria ? `Editar: ${editingMateria.nome}` : "Nova Matéria"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
              <input type="text" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: Matemática" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white" />
            </div>
            {!editingMateria && (
              <>
                {isAcademiaMista() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
                    <select value={formData.type} onChange={e => handleTypeChange(e.target.value as MateriaType)} disabled={isTipoDisabled()} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white disabled:opacity-50">
                      <option value="fundamental">Fundamental</option><option value="medio">Médio</option><option value="superior">Superior</option>
                    </select>
                  </div>
                )}
                {formData.type === "superior" && <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"><p className="text-xs text-amber-700 dark:text-amber-300">⚠️ Matérias superiores exigem o período no cadastro; ele deve pertencer aos períodos do curso e não é editado depois.</p></div>}
                {formData.type !== "fundamental" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Curso *</label>
                    <select value={formData.curso_id ?? ""} onChange={e => setFormData({ ...formData, curso_id: e.target.value || undefined, anos_academicos: [], periodo: undefined, pendencia_nivel_conclusao: undefined })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white">
                      <option value="">Selecione um curso</option>
                      {getCursosByType().map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{formData.type === "superior" ? "Ano do curso *" : "Anos/Níveis *"}</label>
                  {formData.type !== "fundamental" && !formData.curso_id ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Selecione o curso acima para ver os anos disponíveis.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {getAnosDisponiveis().map(a => (
                        <button key={a.value} type="button" onClick={() => handleAnosToggle(a.value)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${formData.anos_academicos.includes(a.value) ? "bg-brand-500 text-white border-brand-500" : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand-400"}`}>{a.label}</button>
                      ))}
                    </div>
                  )}
                </div>
                {formData.type === "superior" && formData.curso_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Período/semestre *</label>
                    <select value={formData.periodo ?? ""} onChange={e => setFormData({ ...formData, periodo: e.target.value || undefined })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white">
                      <option value="">Selecione o período</option>
                      {getPeriodosDisponiveis().map(p => <option key={p} value={p}>{formatarPeriodoLabel(p)}</option>)}
                    </select>
                  </div>
                )}
                {formData.type !== "fundamental" && formData.curso_id && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input type="checkbox" checked={formData.pendencia_permitida} onChange={e => setFormData({ ...formData, pendencia_permitida: e.target.checked, pendencia_nivel_conclusao: e.target.checked ? formData.pendencia_nivel_conclusao : undefined })} />
                      Permite pendência
                    </label>
                    {formData.pendencia_permitida && (
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Limite para conclusão da pendência
                        <select value={formData.pendencia_nivel_conclusao ?? ""} onChange={e => setFormData({ ...formData, pendencia_nivel_conclusao: e.target.value || undefined })} className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white">
                          <option value="">Sem limite explícito</option>
                          {getPendenciaNiveisDisponiveis().map(n => <option key={n} value={n}>{n.includes("semestre") ? formatarPeriodoLabel(n) : formatarSecaoLabel(n)}</option>)}
                        </select>
                      </label>
                    )}
                  </div>
                )}
              </>
            )}
            <div className="flex gap-3 pt-4">
              <button type="submit" className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
                {editingMateria ? (atualizandoMateria ? "Atualizando..." : "Atualizar") : (criandoMateria ? "Criando..." : "Criar Matéria")}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {(ListandoMaterias || ListandoCursos) && !showForm && <div className="flex justify-center items-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>}

      {!ListandoMaterias && !ListandoCursos && !showForm && (
        listaMaterias.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Icon icon="mdi:book-outline" width={48} className="mx-auto mb-3 opacity-30" />
            <p>Nenhuma matéria cadastrada</p>
          </div>
        ) : (
          <>
            {isAcademiaMista() && (
              <div className="flex items-center">
                <button onClick={() => setViewNivel(v => v === "fundamental" ? "medio" : "fundamental")} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-brand-500 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
                  <Icon icon={viewNivel === "fundamental" ? "mdi:school" : "mdi:book-education"} width={16} />
                  {viewNivel === "fundamental" ? "Ver Matérias do Ensino Médio" : "Ver Matérias do Ensino Fundamental"}
                </button>
              </div>
            )}

            {/* Barra de lote */}
            {selecionadas.size > 0 && (
              <BarraLoteMaterias
                selecionadas={selecionadas}
                materiasList={isAcademiaMista() ? listaMaterias.filter(m => m.type === viewNivel) : listaMaterias}
                onLimpar={limparSelecao} onAtivar={handleAtivarLote} onDesativar={handleDesativarLote} onDeletar={handleDeletarLote}
                carregando={loteCarregando}
              />
            )}

            <MateriasAgrupadas
              materias={isAcademiaMista() ? listaMaterias.filter(m => m.type === viewNivel) : listaMaterias}
              getCursoNome={getCursoNome}
              onEdit={handleEdit} onToggleStatus={handleToggleStatus}
              onDelete={setMateriaParaDelete} selecionadas={selecionadas}
              onToggleSelecao={handleToggleSelecao} onToggleTodas={handleToggleTodas}
            />
          </>
        )
      )}
    </div>
  );
}
