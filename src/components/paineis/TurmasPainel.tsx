"use client"
import { useState, useEffect, useMemo, useCallback } from "react";
import { useApi, academiaService, consultasService, tokenStorage } from "@/lib/api";
import { formatApiError } from "@/lib/api/client";
import type { Curso, MeuPerfilResponse, Turma, EstudanteDetalhado } from "@/types/api";
import Button from "@/components/ui/button/Button";
import Icon from "@/components/ui/Icon";
import SearchableSelect from "@/components/form/SearchableSelect";
import Alert from "@/components/ui/alert/Alert";
import Checkbox from "@/components/form/input/Checkbox";
import { Modal } from "@/components/ui/modal";
import { getCookie } from "@/lib/utils/cookies";

// ── Constantes ─────────────────────────────────────────────────────────────

const ANOS_FUNDAMENTAL = [
  { value: "1_ano_fundamental", label: "1ª Classe" },
  { value: "2_ano_fundamental", label: "2ª Classe" },
  { value: "3_ano_fundamental", label: "3ª Classe" },
  { value: "4_ano_fundamental", label: "4ª Classe" },
  { value: "5_ano_fundamental", label: "5ª Classe" },
  { value: "6_ano_fundamental", label: "6ª Classe" },
  { value: "7_ano_fundamental", label: "7ª Classe" },
  { value: "8_ano_fundamental", label: "8ª Classe" },
  { value: "9_ano_fundamental", label: "9ª Classe" },
];

const TURNOS = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
];

const labelNivel = (v: string): string => {
  const fixo = ANOS_FUNDAMENTAL.find(a => a.value === v);
  if (fixo) return fixo.label;
  const m = v.match(/^(\d+)_ano_(medio|superior)$/);
  if (m) { const tipo = m[2] === "medio" ? "Médio" : "Superior"; return `${m[1]}º ${tipo}`; }
  return v.replace(/_/g, " ");
};
const labelTurno = (t: string) => TURNOS.find(x => x.value === t)?.label ?? t;

const estudantePertenceAoAno = (estudante: EstudanteDetalhado, ano: string): boolean => {
  if (ano.includes("fundamental")) return estudante.ano_escolar_fundamental === ano;
  if (ano.includes("medio")) return estudante.ano_escolar_medio === ano;
  if (ano.includes("superior")) return estudante.ano_superior === ano;
  return false;
};

const estudantePertenceAoCurso = (estudante: EstudanteDetalhado, ano: string, cursoId?: string): boolean => {
  if (!cursoId) return true;
  if (ano.includes("medio")) return estudante.curso_medio_id === cursoId;
  if (ano.includes("superior")) return estudante.curso_superior_id === cursoId;
  return true;
};

const getUserFromCookie = (): MeuPerfilResponse | null => {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(getCookie("user") ?? ""); }
  catch { return null; }
};

// ── Batch polling helper ────────────────────────────────────────────────────

interface BatchResultItem { codigo: string; nome: string; status: 'pending' | 'success' | 'error'; message?: string; }

type EstudantesParams = NonNullable<Parameters<typeof consultasService.listarEstudantes>[0]>;

function paramsEstudantesSemTurmaPorTurma(turma: Turma, token?: string): EstudantesParams {
  const params: EstudantesParams = { token, com_turma: false };
  if (turma.nivel.includes("fundamental")) params.ano_escolar_fundamental = turma.nivel;
  if (turma.nivel.includes("medio")) params.ano_escolar_medio = turma.nivel;
  if (turma.nivel.includes("superior")) params.ano_superior = turma.nivel;
  if (turma.curso_id) params.curso_id = turma.curso_id;
  return params;
}

function chaveConsultaEstudantesSemTurma(turma: Turma): string {
  return [turma.nivel, turma.curso_id ?? "__sem_curso__"].join(":");
}

function anexarEstudantesUnicos(
  atuais: EstudanteDetalhado[],
  novos: EstudanteDetalhado[],
): EstudanteDetalhado[] {
  const mapa = new Map(atuais.map(estudante => [estudante.codigo_estudante, estudante]));
  novos.forEach(estudante => mapa.set(estudante.codigo_estudante, estudante));
  return Array.from(mapa.values());
}

async function pollJobUntilDone(jobId: string, onProgress: (pct: number) => void, maxMs = 5 * 60 * 1000): Promise<{ ok: number; err: number }> {
  const token = tokenStorage.get();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const deadline = Date.now() + maxMs;
  let interval = 1500;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, interval));
    interval = Math.min(interval * 1.3, 6000);
    try {
      const r = await fetch(`${apiUrl}/jobs/${jobId}`, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
      if (!r.ok) continue;
      const data = await r.json();
      onProgress(data.progress ?? 0);
      if (data.status === 'done' || data.status === 'failed') return { ok: data.done_items ?? 0, err: data.fail_items ?? 0 };
    } catch { /* retry */ }
  }
  return { ok: 0, err: 0 };
}

// ── Modal Resultado Lote ────────────────────────────────────────────────────

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

// ── Barra de lote ───────────────────────────────────────────────────────────

function BarraLoteTurmas({ selecionadas, turmasList, onLimpar, onAtivar, onDesativar, onDeletar, carregando }: {
  selecionadas: Set<string>; turmasList: Turma[]; onLimpar: () => void;
  onAtivar: () => void; onDesativar: () => void; onDeletar: () => void; carregando: boolean;
}) {
  if (selecionadas.size === 0) return null;
  const sel = turmasList.filter(t => selecionadas.has(t.codigo_turma));
  const ativas = sel.filter(t => t.status === 'ativo').length;
  const inativas = sel.filter(t => t.status === 'inativo').length;
  const deletaveis = sel.filter(t => t.status === 'inativo' && t.estudantes.length === 0).length;
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold">{selecionadas.size}</span>
        <span className="text-sm font-medium text-brand-700 dark:text-brand-300">turma{selecionadas.size !== 1 ? 's' : ''} selecionada{selecionadas.size !== 1 ? 's' : ''}</span>
        {ativas > 0 && <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">{ativas} ativa{ativas !== 1 ? 's' : ''}</span>}
        {inativas > 0 && <span className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">{inativas} inativa{inativas !== 1 ? 's' : ''}</span>}
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

// ── Modal: Confirmar Deleção ────────────────────────────────────────────────

function ModalConfirmarDeleteTurma({ turma, onConfirm, onClose }: { turma: Turma; onConfirm: () => Promise<void>; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  async function handle() { setLoading(true); try { await onConfirm(); onClose(); } finally { setLoading(false); } }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Deletar Turma</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Tem certeza que deseja deletar a turma <span className="font-medium text-gray-700 dark:text-gray-200">{turma.codigo_turma}</span>? O histórico é preservado no ledger.</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancelar</Button>
          <button onClick={handle} disabled={loading} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">{loading ? "Deletando..." : "Deletar"}</button>
        </div>
      </div>
    </div>
  );
}


function TabelaEstudantesGerenciamento({ estudantes, calcularIdade }: { estudantes: EstudanteDetalhado[]; calcularIdade: (dataNascimento?: string) => string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm min-w-[800px]">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Nome</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Código</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Idade</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Gênero</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Email</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Telefone</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {estudantes.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500 italic">Nenhum estudante sem turma neste escopo</td></tr>
          ) : estudantes.map(est => (
            <tr key={est.codigo_estudante} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{est.nome ?? "—"}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{est.codigo_estudante}</td>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{calcularIdade(est.data_nascimento)}</td>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 capitalize">{est.genero ?? "—"}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{est.email ?? "—"}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{est.telefone ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────────

export default function TurmasPainel() {
  const [user] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());
  const [expandedNivel, setExpandedNivel] = useState<string | null>(null);
  const [expandedCurso, setExpandedCurso] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [turmaParaDelete, setTurmaParaDelete] = useState<Turma | null>(null);
  const [formData, setFormData] = useState({ codigo_turma: "", nivel: "", turno: "manha", curso_id: undefined as string | undefined });
  const [formTipo, setFormTipo] = useState<"fundamental" | "curso">("fundamental");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [codigoAdd, setCodigoAdd] = useState("");
  const [alert, setAlert] = useState<{ variant: "success" | "error" | "warning" | "info"; message: string } | null>(null);
  const [viewNivelTurmas, setViewNivelTurmas] = useState<"fundamental" | "cursos">("fundamental");
  const [turmaEmFoco, setTurmaEmFoco] = useState<Turma | null>(null);
  const [estudantesSemTurmaEmFoco, setEstudantesSemTurmaEmFoco] = useState<{ titulo: string; subtitulo: string; estudantes: EstudanteDetalhado[] } | null>(null);
  const [estudantesTurmaEmFoco, setEstudantesTurmaEmFoco] = useState<EstudanteDetalhado[]>([]);
  const [carregandoEstudantesTurma, setCarregandoEstudantesTurma] = useState(false);
  const [carregandoEstudantesSemTurma, setCarregandoEstudantesSemTurma] = useState(false);

  // Lote
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [loteItems, setLoteItems] = useState<BatchResultItem[]>([]);
  const [loteTitulo, setLoteTitulo] = useState('');
  const [loteProgresso, setLoteProgresso] = useState(0);
  const [loteCarregando, setLoteCarregando] = useState(false);
  const [loteModalOpen, setLoteModalOpen] = useState(false);

  const { execute: listarTurmas, data: dataTurmas, loading: carregando } = useApi(academiaService.listarTurmas);
  const { execute: listarCursos, data: dataCursos } = useApi(academiaService.listarCursos);
  const [estudantesSemTurma, setEstudantesSemTurma] = useState<EstudanteDetalhado[]>([]);
  const { execute: criarTurma, loading: criando } = useApi(academiaService.criarTurma);
  const { execute: atualizarTurma, loading: atualizando } = useApi(academiaService.atualizarTurma);
  const { execute: ativarTurma } = useApi(academiaService.ativarTurma);
  const { execute: desativarTurma } = useApi(academiaService.desativarTurma);
  const { execute: adicionarEstudante, loading: adicionando } = useApi(academiaService.adicionarEstudanteATurma);
  const { execute: removerEstudante, loading: removendo } = useApi(academiaService.removerEstudanteDaTurma);
  const { execute: executarDeletarTurma } = useApi(academiaService.deletarTurma);

  // nivel === 'escola' indica escola; nivel === 'superior' indica superior
  const academiaNivel = user?.academia?.nivel;
  const nivelEscolar = user?.academia?.nivel_escolar;
  const isFundamental = academiaNivel === "escola" && nivelEscolar === "fundamental";
  const isMisto = academiaNivel === "escola" && nivelEscolar === "misto";
  const turmaUsaCurso = !isFundamental && (!isMisto || formTipo === "curso");

  useEffect(() => {
    const t = tokenStorage.get() ?? undefined;
    listarTurmas(t);
    if (!isFundamental) listarCursos(t);
  }, [isFundamental, listarCursos, listarTurmas]);

  const showMsg = (variant: "success" | "error" | "warning" | "info", msg: string) => {
    setAlert({ variant, message: msg });
    setTimeout(() => setAlert(null), 5000);
  };

  const reload = () => {
    const t = tokenStorage.get() ?? undefined;
    listarTurmas(t);
    if (turmaEmFoco) carregarEstudantesDaTurma(turmaEmFoco);
  };

  const turmas: Turma[] = useMemo(() => dataTurmas?.turmas ?? [], [dataTurmas]);
  const cursos: Curso[] = useMemo(() => dataCursos?.cursos?.filter(c => c.status === "ativo") ?? [], [dataCursos]);
  const estudantesParaAdicionar = estudantesSemTurma;

  useEffect(() => {
    let cancelled = false;
    const t = tokenStorage.get() ?? undefined;
    const turmasAtivasParaConsulta = turmas.filter(turma => turma.status !== "inativo" && turma.status !== "deletado");
    const consultas = Array.from(
      new Map(turmasAtivasParaConsulta.map(turma => [chaveConsultaEstudantesSemTurma(turma), turma])).values(),
    );

    setEstudantesSemTurma([]);
    if (consultas.length === 0) {
      setCarregandoEstudantesSemTurma(false);
      return () => { cancelled = true; };
    }

    setCarregandoEstudantesSemTurma(true);
    let pendentes = consultas.length;
    consultas.forEach(async (turma) => {
      try {
        const data = await consultasService.listarEstudantes(paramsEstudantesSemTurmaPorTurma(turma, t));
        if (!cancelled) setEstudantesSemTurma(prev => anexarEstudantesUnicos(prev, data.estudantes ?? []));
      } catch {
        // Mantém os resultados já retornados para não bloquear a tela inteira.
      } finally {
        pendentes -= 1;
        if (!cancelled && pendentes === 0) setCarregandoEstudantesSemTurma(false);
      }
    });

    return () => { cancelled = true; };
  }, [turmas]);

  const getNivelOptions = (cursoId?: string) => {
    if (isFundamental || (isMisto && formTipo === "fundamental")) {
      const anosOfertados = user?.academia?.anos_academicos ?? [];
      return ANOS_FUNDAMENTAL.filter((ano) => anosOfertados.includes(ano.value));
    }
    if (!cursoId) return [];
    const curso = cursos.find(c => c.id === cursoId);
    if (!curso) return [];
    return curso.anos_academicos.map(v => ({ value: v, label: labelNivel(v) }));
  };

  const turmasPorNivel = (lista?: Turma[]) => {
    const source = lista ?? turmas;
    const map: Record<string, Turma[]> = {};
    for (const t of source) { if (!map[t.nivel]) map[t.nivel] = []; map[t.nivel].push(t); }
    return map;
  };

  const turmasPorCurso = (lista?: Turma[]) => {
    type G = { curso: Curso | null; niveis: Record<string, Turma[]> };
    const source = lista ?? turmas;
    const map: Record<string, G> = {};
    for (const t of source) {
      const key = t.curso_id ?? "__sem_curso__";
      if (!map[key]) map[key] = { curso: cursos.find(c => c.id === t.curso_id) ?? null, niveis: {} };
      if (!map[key].niveis[t.nivel]) map[key].niveis[t.nivel] = [];
      map[key].niveis[t.nivel].push(t);
    }
    return map;
  };

  const turmasFundamental = turmas.filter(t => t.nivel.includes("fundamental"));
  const turmasCursos = turmas.filter(t => !t.nivel.includes("fundamental"));
  const estudantesSemTurmaPorAno = (ano: string, cursoId?: string) =>
    estudantesSemTurma.filter(estudante =>
      estudantePertenceAoAno(estudante, ano) &&
      estudantePertenceAoCurso(estudante, ano, cursoId)
    );

  const carregarEstudantesDaTurma = useCallback(async (turma: Turma) => {
    setCarregandoEstudantesTurma(true);
    try {
      const params: Parameters<typeof consultasService.listarEstudantes>[0] = {
        token: tokenStorage.get() ?? undefined,
        codigo_turma: turma.codigo_turma,
        com_turma: true,
      };
      if (turma.nivel.includes("fundamental")) params.ano_escolar_fundamental = turma.nivel;
      if (turma.nivel.includes("medio")) params.ano_escolar_medio = turma.nivel;
      if (turma.nivel.includes("superior")) params.ano_superior = turma.nivel;
      if (turma.curso_id) params.curso_id = turma.curso_id;
      const data = await consultasService.listarEstudantes(params);
      setEstudantesTurmaEmFoco(data.estudantes ?? []);
    } catch (err: unknown) {
      showMsg("error", formatApiError(err, "Erro ao consultar estudantes da turma"));
      setEstudantesTurmaEmFoco([]);
    } finally {
      setCarregandoEstudantesTurma(false);
    }
  }, []);

  const abrirTurmaEmFoco = (turma: Turma) => {
    setTurmaEmFoco(turma);
    carregarEstudantesDaTurma(turma);
  };

  const calcularIdade = (dataNascimento?: string) => {
    if (!dataNascimento) return "—";
    const nascimento = new Date(dataNascimento);
    if (Number.isNaN(nascimento.getTime())) return "—";
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mesDiff = hoje.getMonth() - nascimento.getMonth();
    if (mesDiff < 0 || (mesDiff === 0 && hoje.getDate() < nascimento.getDate())) idade--;
    return `${idade} anos`;
  };

  // Seleção handlers
  const handleToggleSelecao = (codigo: string) => {
    setSelecionadas(prev => { const next = new Set(prev); if (next.has(codigo)) next.delete(codigo); else next.add(codigo); return next; });
  };
  const handleToggleTodas = (lista: Turma[]) => {
    setSelecionadas(prev => {
      const ids = lista.map(t => t.codigo_turma);
      const todasSel = ids.every(id => prev.has(id));
      if (todasSel) { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; }
      const next = new Set(prev); ids.forEach(id => next.add(id)); return next;
    });
  };
  const limparSelecao = () => setSelecionadas(new Set());

  // Batch via async
  const executarBatchAsync = async (
    submitBatch: () => Promise<{ job_id?: string; message?: string }>,
    titulo: string,
    itemsParaLabel: { codigo: string; nome: string }[]
  ) => {
    setLoteTitulo(titulo);
    setLoteProgresso(0);
    setLoteCarregando(true);
    const items: BatchResultItem[] = itemsParaLabel.map(i => ({ ...i, status: 'pending' }));
    setLoteItems(items);
    setLoteModalOpen(true);
    try {
      const data = await submitBatch();
      if (!data?.job_id) { setLoteItems(prev => prev.map(i => ({ ...i, status: 'error', message: data?.message || 'Erro' }))); setLoteCarregando(false); return; }
      const result = await pollJobUntilDone(data.job_id, pct => {
        setLoteProgresso(pct);
        setLoteItems(prev => prev.map((item, idx) => { const done = Math.floor(pct / 100 * prev.length); return idx < done ? { ...item, status: 'success' } : item; }));
      });
      setLoteItems(prev => prev.map((item, idx) => ({ ...item, status: idx < result.ok ? 'success' : 'error' })));
      setLoteProgresso(100);
    } catch { setLoteItems(prev => prev.map(i => ({ ...i, status: 'error', message: 'Erro de rede' }))); }
    finally { setLoteCarregando(false); limparSelecao(); setTimeout(reload, 2000); }
  };

  const handleAtivarLote = () => {
    const sel = turmas.filter(t => selecionadas.has(t.codigo_turma) && t.status === 'inativo');
    if (!sel.length) return;
    const payload = sel.map(t => ({ codigo_turma: t.codigo_turma }));
    executarBatchAsync(() => academiaService.ativarTurmaBatchAsync(payload), `Ativar ${sel.length} turma(s)`, sel.map(t => ({ codigo: t.codigo_turma, nome: t.codigo_turma })));
  };

  const handleDesativarLote = () => {
    const sel = turmas.filter(t => selecionadas.has(t.codigo_turma) && t.status === 'ativo');
    if (!sel.length) return;
    const payload = sel.map(t => ({ codigo_turma: t.codigo_turma }));
    executarBatchAsync(() => academiaService.desativarTurmaBatchAsync(payload), `Desativar ${sel.length} turma(s)`, sel.map(t => ({ codigo: t.codigo_turma, nome: t.codigo_turma })));
  };

  const handleDeletarLote = () => {
    const sel = turmas.filter(t => selecionadas.has(t.codigo_turma) && t.status === 'inativo' && t.estudantes.length === 0);
    if (!sel.length) return;
    const payload = sel.map(t => ({ codigo_turma: t.codigo_turma }));
    executarBatchAsync(() => academiaService.deletarTurmaBatchAsync(payload), `Deletar ${sel.length} turma(s)`, sel.map(t => ({ codigo: t.codigo_turma, nome: t.codigo_turma })));
  };

  const resetForm = () => { setFormData({ codigo_turma: "", nivel: "", turno: "manha", curso_id: undefined }); setFormTipo(isMisto ? "fundamental" : "curso"); setEditingTurma(null); setShowForm(false); };

  const handleEdit = (t: Turma) => {
    setEditingTurma(t);
    setFormData({ codigo_turma: t.codigo_turma, nivel: t.nivel, turno: t.turno, curso_id: t.curso_id });
    setFormTipo(t.curso_id ? "curso" : "fundamental");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codigo_turma.trim() || !formData.nivel || !formData.turno) { showMsg("error", "Preencha todos os campos obrigatórios"); return; }
    if (turmaUsaCurso && !formData.curso_id) { showMsg("error", "Selecione o curso da turma."); return; }
    try {
      const payload = { nivel: formData.nivel, turno: formData.turno, ...(turmaUsaCurso ? { curso_id: formData.curso_id! } : {}) };
      if (editingTurma) { await atualizarTurma(editingTurma.codigo_turma, payload); showMsg("success", "Turma actualizada com sucesso"); }
      else { await criarTurma({ codigo_turma: formData.codigo_turma, ...payload }); showMsg("success", "Turma criada com sucesso"); }
      resetForm(); reload();
    } catch (err: unknown) { showMsg("error", formatApiError(err, "Erro ao guardar turma")); }
  };

  const handleAdd = async (codigoTurma: string) => {
    if (!codigoAdd.trim()) return;
    try { await adicionarEstudante(codigoTurma, { codigo_estudante: codigoAdd.trim() }); showMsg("success", "Estudante adicionado"); setCodigoAdd(""); setAddingTo(null); reload(); }
    catch (err: unknown) { showMsg("error", formatApiError(err, "Erro ao adicionar estudante")); }
  };

  const handleRemove = async (codigoTurma: string, codigoEstudante: string) => {
    try { await removerEstudante(codigoTurma, codigoEstudante); showMsg("success", "Estudante removido"); reload(); }
    catch (err: unknown) { showMsg("error", formatApiError(err, "Erro ao remover estudante")); }
  };

  const handleDeletarTurma = async (codigoTurma: string) => {
    try { await executarDeletarTurma(codigoTurma); showMsg("success", "Turma deletada com sucesso"); reload(); }
    catch (e: unknown) { showMsg("error", formatApiError(e, "Erro ao deletar turma")); }
  };

  const handleToggleStatus = async (turma: Turma) => {
    const t = tokenStorage.get() ?? undefined;
    try {
      if (turma.status === "ativo") { await desativarTurma(turma.codigo_turma, t); showMsg("success", "Turma desativada"); }
      else { await ativarTurma(turma.codigo_turma, t); showMsg("success", "Turma ativada"); }
      reload();
    } catch (e: unknown) { showMsg("error", formatApiError(e, "Erro ao alterar status da turma")); }
  };

  // ── TurmaCard ───────────────────────────────────────────────────────────

  const TurmaCard = ({ turma, mostrarCheckbox }: { turma: Turma; mostrarCheckbox?: boolean }) => {
    const isSelecionada = selecionadas.has(turma.codigo_turma);
    return (
      <div className={`border rounded-xl overflow-hidden transition-colors ${isSelecionada ? 'border-brand-300 dark:border-brand-700 bg-brand-50/30 dark:bg-brand-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
        <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" onClick={() => abrirTurmaEmFoco(turma)}>
          <div className="flex items-center gap-3">
            {mostrarCheckbox && (
              <div onClick={e => { e.stopPropagation(); handleToggleSelecao(turma.codigo_turma); }}>
                <Checkbox checked={isSelecionada} onChange={() => handleToggleSelecao(turma.codigo_turma)} />
              </div>
            )}
            <Icon icon="mdi:door-closed" className="text-brand-500 w-5 h-5" />
            <span className="font-semibold text-gray-900 dark:text-white">{turma.codigo_turma}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">· {labelTurno(turma.turno)}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${turma.status === "ativo" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : turma.status === "deletado" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>{turma.status}</span>
          </div>
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Icon icon="mdi:account-group" className="w-4 h-4" />{turma.estudantes.length}</span>
            {turma.status !== "deletado" && (
              <>
                <button onClick={() => handleToggleStatus(turma)} className={`p-1.5 transition-colors ${turma.status === "ativo" ? "text-gray-400 hover:text-orange-500" : "text-gray-400 hover:text-green-500"}`} title={turma.status === "ativo" ? "Desativar turma" : "Ativar turma"}>
                  <Icon icon={turma.status === "ativo" ? "mdi:pause-circle-outline" : "mdi:play-circle-outline"} className="w-4 h-4" />
                </button>
                <button onClick={() => handleEdit(turma)} className="p-1.5 text-gray-400 hover:text-brand-500 transition-colors" title="Editar"><Icon icon="mdi:pencil" className="w-4 h-4" /></button>
              </>
            )}
            {turma.status === "inativo" && turma.estudantes.length === 0 && (
              <button onClick={() => setTurmaParaDelete(turma)} className="p-1.5 text-red-400 hover:text-red-600 transition-colors" title="Deletar turma"><Icon icon="mdi:delete-outline" className="w-4 h-4" /></button>
            )}
            <Icon icon="mdi:chevron-right" className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    );
  };

  // ── Form ────────────────────────────────────────────────────────────────

  const Form = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-theme-xs p-6 border border-gray-200 dark:border-gray-700">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingTurma ? "Editar Turma" : "Nova Turma"}</h3>
          <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><Icon icon="mdi:close" width={20} /></button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código da Turma *</label>
          <input type="text" value={formData.codigo_turma} onChange={e => setFormData({ ...formData, codigo_turma: e.target.value })} disabled={!!editingTurma} placeholder="Ex: 7A, 8B, Turma-1" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white disabled:opacity-50" />
          {editingTurma && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">O código não pode ser alterado após a criação</p>}
        </div>
        {isMisto && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nível de ensino *</label>
            <SearchableSelect
              value={formTipo}
              onChange={v => { const tipo = (v || "fundamental") as "fundamental" | "curso"; setFormTipo(tipo); setFormData({ ...formData, curso_id: undefined, nivel: "" }); }}
              isDisabled={!!editingTurma}
              isClearable={false}
              options={[
                { value: "fundamental", label: "Ensino Primário e Iº Ciclo" },
                { value: "curso", label: "Ensino Médio" },
              ]}
            />
          </div>
        )}
        {turmaUsaCurso && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Curso *</label>
            <SearchableSelect
              value={formData.curso_id ?? ""}
              onChange={v => setFormData({ ...formData, curso_id: v || undefined, nivel: "" })}
              isDisabled={!!editingTurma}
              isClearable={false}
              options={[{ value: "", label: "Selecione um curso" }, ...cursos.map(c => ({ value: c.id, label: c.nome }))]}
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nível / Ano *</label>
          <SearchableSelect
            value={formData.nivel}
            onChange={v => setFormData({ ...formData, nivel: v || "" })}
            isDisabled={turmaUsaCurso && !formData.curso_id}
            isClearable={false}
            options={[{ value: "", label: "Selecione o ano" }, ...getNivelOptions(formData.curso_id).map(a => ({ value: a.value, label: a.label }))]}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turno *</label>
          <div className="flex gap-3">
            {TURNOS.map(t => (
              <button key={t.value} type="button" onClick={() => setFormData({ ...formData, turno: t.value })} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${formData.turno === t.value ? "bg-brand-500 text-white border-brand-500" : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>{t.label}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={criando || atualizando} className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50">{criando || atualizando ? "A guardar…" : editingTurma ? "Actualizar" : "Criar Turma"}</button>
          <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
        </div>
      </form>
    </div>
  );

  const EstudantesSemTurmaCard = ({ estudantesSemTurma, titulo, subtitulo }: { estudantesSemTurma: EstudanteDetalhado[]; titulo: string; subtitulo: string }) => {
    if (estudantesSemTurma.length === 0) return null;
    return (
      <button type="button" onClick={() => setEstudantesSemTurmaEmFoco({ titulo, subtitulo, estudantes: estudantesSemTurma })} className="w-full border border-amber-200 dark:border-amber-800/60 rounded-xl overflow-hidden bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-100/70 dark:hover:bg-amber-900/20 transition-colors text-left">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Icon icon="mdi:account-alert-outline" className="text-amber-500 w-5 h-5" />
            <span className="font-semibold text-sm text-gray-900 dark:text-white">Estudantes sem turma</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Sem vínculo</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Icon icon="mdi:account-group" className="w-4 h-4" />{estudantesSemTurma.length}</span>
            <Icon icon="mdi:chevron-right" className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </button>
    );
  };

  // ── ViewFundamental ────────────────────────────────────────────────────

  const ViewFundamental = ({ lista }: { lista?: Turma[] }) => {
    const porNivel = turmasPorNivel(lista);
    const anosAcademicos = user?.academia?.anos_academicos ?? [];
    const niveisDisponiveis = anosAcademicos.length > 0 ? ANOS_FUNDAMENTAL.filter(a => anosAcademicos.includes(a.value)) : ANOS_FUNDAMENTAL;
    const niveisComTurmas = niveisDisponiveis.filter(a => (porNivel[a.value]?.length ?? 0) > 0 || estudantesSemTurmaPorAno(a.value).length > 0);
    if (niveisComTurmas.length === 0) return <Empty />;
    const listaCompleta = Object.values(porNivel).flat();
    const todasSelecionadas = listaCompleta.length > 0 && listaCompleta.every(t => selecionadas.has(t.codigo_turma));
    const algumasSelecionadas = listaCompleta.some(t => selecionadas.has(t.codigo_turma));
    return (
      <div className="space-y-3">
        {listaCompleta.length > 1 && (
          <div className="flex items-center gap-2 px-1">
            <Checkbox checked={todasSelecionadas} indeterminate={algumasSelecionadas && !todasSelecionadas} onChange={() => handleToggleTodas(listaCompleta)} label={todasSelecionadas ? "Desselecionar todas" : "Selecionar todas"} />
          </div>
        )}
        {niveisComTurmas.map(ano => {
          const isOpen = expandedNivel === ano.value;
          const listaAno = porNivel[ano.value] ?? [];
          const semTurmaAno = estudantesSemTurmaPorAno(ano.value);
          return (
            <div key={ano.value} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <button onClick={() => setExpandedNivel(isOpen ? null : ano.value)} className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors">
                <div className="flex items-center gap-3">
                  <Icon icon="mdi:school" className="text-brand-500 w-5 h-5" />
                  <span className="font-semibold text-gray-800 dark:text-white">{ano.label}</span>
                  <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">{listaAno.length} turma{listaAno.length !== 1 ? "s" : ""}</span>
                  {semTurmaAno.length > 0 && <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{semTurmaAno.length} sem turma</span>}
                </div>
                <Icon icon={isOpen ? "mdi:chevron-up" : "mdi:chevron-down"} className="w-5 h-5 text-gray-400" />
              </button>
              {isOpen && <div className="p-3 space-y-2">{listaAno.map(t => <TurmaCard key={t.codigo_turma} turma={t} mostrarCheckbox />)}<EstudantesSemTurmaCard estudantesSemTurma={semTurmaAno} titulo={`Estudantes sem turma · ${ano.label}`} subtitulo={`${ano.label} · ${semTurmaAno.length} estudante(s) sem vínculo`} /></div>}
            </div>
          );
        })}
      </div>
    );
  };

  const ViewCursos = ({ lista }: { lista?: Turma[] }) => {
    const porCurso = turmasPorCurso(lista);
    const cursosComConteudo = cursos.filter(curso =>
      Object.values(porCurso[curso.id]?.niveis ?? {}).some(turmasNivel => turmasNivel.length > 0) ||
      curso.anos_academicos.some(ano => estudantesSemTurmaPorAno(ano, curso.id).length > 0)
    );
    const entradasCurso = [
      ...cursosComConteudo.map(curso => ({ key: curso.id, curso, niveis: porCurso[curso.id]?.niveis ?? {} })),
      ...Object.entries(porCurso)
        .filter(([cursoKey]) => cursoKey === "__sem_curso__" || !cursos.some(c => c.id === cursoKey))
        .map(([key, grupo]) => ({ key, curso: grupo.curso, niveis: grupo.niveis })),
    ];
    if (entradasCurso.length === 0) return <Empty />;
    const listaCompleta = entradasCurso.flatMap(g => Object.values(g.niveis).flat());
    const todasSelecionadas = listaCompleta.length > 0 && listaCompleta.every(t => selecionadas.has(t.codigo_turma));
    const algumasSelecionadas = listaCompleta.some(t => selecionadas.has(t.codigo_turma));
    return (
      <div className="space-y-3">
        {listaCompleta.length > 1 && (
          <div className="flex items-center gap-2 px-1">
            <Checkbox checked={todasSelecionadas} indeterminate={algumasSelecionadas && !todasSelecionadas} onChange={() => handleToggleTodas(listaCompleta)} label={todasSelecionadas ? "Desselecionar todas" : "Selecionar todas"} />
          </div>
        )}
        {entradasCurso.map(({ key: cursoKey, curso, niveis }) => {
          const isCursoOpen = expandedCurso === cursoKey;
          const anosDoCurso = curso?.anos_academicos ?? Object.keys(niveis);
          const totalTurmas = Object.values(niveis).reduce((s, a) => s + a.length, 0);
          const totalSemTurma = anosDoCurso.reduce((s, ano) => s + estudantesSemTurmaPorAno(ano, curso?.id).length, 0);
          return (
            <div key={cursoKey} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <button onClick={() => setExpandedCurso(isCursoOpen ? null : cursoKey)} className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors">
                <div className="flex items-center gap-3">
                  <Icon icon="mdi:book-education" className="text-brand-500 w-5 h-5" />
                  <span className="font-semibold text-gray-800 dark:text-white">{curso ? curso.nome : "Sem curso associado"}</span>
                  <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">{totalTurmas} turma{totalTurmas !== 1 ? "s" : ""}</span>
                  {totalSemTurma > 0 && <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{totalSemTurma} sem turma</span>}
                </div>
                <Icon icon={isCursoOpen ? "mdi:chevron-up" : "mdi:chevron-down"} className="w-5 h-5 text-gray-400" />
              </button>
              {isCursoOpen && (
                <div className="p-3 space-y-2">
                  {anosDoCurso.map(nivel => {
                    const listaLocal = niveis[nivel] ?? [];
                    const semTurmaAno = estudantesSemTurmaPorAno(nivel, curso?.id);
                    if (listaLocal.length === 0 && semTurmaAno.length === 0) return null;
                    const nivelKey = `${cursoKey}__${nivel}`;
                    const isNivel = expandedNivel === nivelKey;
                    return (
                      <div key={nivel} className="border border-gray-100 dark:border-gray-700/50 rounded-lg overflow-hidden">
                        <button onClick={() => setExpandedNivel(isNivel ? null : nivelKey)} className="w-full flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <Icon icon="mdi:school-outline" className="text-gray-400 w-4 h-4" />
                            <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{labelNivel(nivel)}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">· {listaLocal.length} turma{listaLocal.length !== 1 ? "s" : ""}</span>
                            {semTurmaAno.length > 0 && <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{semTurmaAno.length} sem turma</span>}
                          </div>
                          <Icon icon={isNivel ? "mdi:chevron-up" : "mdi:chevron-down"} className="w-4 h-4 text-gray-400" />
                        </button>
                        {isNivel && <div className="p-2 space-y-2">{listaLocal.map(t => <TurmaCard key={t.codigo_turma} turma={t} mostrarCheckbox />)}<EstudantesSemTurmaCard estudantesSemTurma={semTurmaAno} titulo={`Estudantes sem turma · ${labelNivel(nivel)}`} subtitulo={`${curso ? curso.nome : "Sem curso associado"} · ${labelNivel(nivel)} · ${semTurmaAno.length} estudante(s) sem vínculo`} /></div>}
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

  return (
    <div className="space-y-5">
      {estudantesSemTurmaEmFoco ? (
        <div className="space-y-4">
          <button onClick={() => setEstudantesSemTurmaEmFoco(null)} className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors">
            <Icon icon="mdi:arrow-left" width={18} />
            Voltar para turmas
          </button>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{estudantesSemTurmaEmFoco.titulo}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{estudantesSemTurmaEmFoco.subtitulo}</p>
          </div>
          <TabelaEstudantesGerenciamento estudantes={estudantesSemTurmaEmFoco.estudantes} calcularIdade={calcularIdade} />
        </div>
      ) : turmaEmFoco ? (
        <div className="space-y-4">
          <button onClick={() => setTurmaEmFoco(null)} className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors">
            <Icon icon="mdi:arrow-left" width={18} />
            Voltar para turmas
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{turmaEmFoco.codigo_turma}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{labelNivel(turmaEmFoco.nivel)} · {labelTurno(turmaEmFoco.turno)} · {turmaEmFoco.estudantes.length} estudante(s)</p>
            </div>
            {turmaEmFoco.status !== "deletado" && (
              addingTo === turmaEmFoco.codigo_turma ? (
                <div className="flex gap-2 items-center">
                  <input type="text" value={codigoAdd} onChange={e => setCodigoAdd(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdd(turmaEmFoco.codigo_turma); } }} placeholder="Código do estudante" list="estudantes-list-dp" className="flex-1 text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white" />
                  <datalist id="estudantes-list-dp">{estudantesParaAdicionar.map(e => <option key={e.codigo_estudante} value={e.codigo_estudante}>{e.nome}</option>)}</datalist>
                  <button onClick={() => handleAdd(turmaEmFoco.codigo_turma)} disabled={adicionando || !codigoAdd.trim()} className="px-3 py-1.5 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors">{adicionando ? "…" : "Adicionar"}</button>
                  <button onClick={() => { setAddingTo(null); setCodigoAdd(""); }} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
                </div>
              ) : (
                <button onClick={() => setAddingTo(turmaEmFoco.codigo_turma)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-brand-500 border border-brand-300 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"><Icon icon="mdi:account-plus" className="w-4 h-4" />Adicionar estudante</button>
              )
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-gray-50 dark:bg-gray-800/70">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Nome</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Código</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Idade</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Gênero</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Telefone</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {carregandoEstudantesTurma ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500 italic">Carregando estudantes da turma…</td></tr>
                ) : turmaEmFoco.estudantes.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500 italic">Nenhum estudante nesta turma</td></tr>
                ) : (
                  turmaEmFoco.estudantes.map(codigo => {
                    const est = estudantesTurmaEmFoco.find(e => e.codigo_estudante === codigo);
                    return (
                      <tr key={codigo} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{est?.nome ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{codigo}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{calcularIdade(est?.data_nascimento)}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 capitalize">{est?.genero ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{est?.email ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{est?.telefone ?? "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleRemove(turmaEmFoco.codigo_turma, codigo)} disabled={removendo} className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50" title="Remover da turma">
                            <Icon icon="mdi:close-circle" className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      <>
      {alert && <Alert variant={alert.variant} title={alert.variant === "success" ? "Sucesso" : alert.variant === "error" ? "Erro" : "Aviso"} message={alert.message} />}

      {turmaParaDelete && <ModalConfirmarDeleteTurma turma={turmaParaDelete} onConfirm={async () => { await handleDeletarTurma(turmaParaDelete.codigo_turma); }} onClose={() => setTurmaParaDelete(null)} />}

      <ModalResultadoLote isOpen={loteModalOpen} onClose={() => setLoteModalOpen(false)} items={loteItems} titulo={loteTitulo} progresso={loteProgresso} />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Turmas</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {`Gerencie as turmas da sua ${user?.academia?.nivel === "superior" ? "universidade" : "escola"}.`}
          </p>
        </div>
        <div className="flex gap-3">
          {!showForm && <Button disabled={carregando} onClick={reload} variant="outline">Actualizar</Button>}
          <Button startIcon={<Icon icon="mdi:plus" />} onClick={() => setShowForm(!showForm)}>Nova Turma</Button>
        </div>
      </div>

      {showForm && <Form />}

      {/* Barra de lote */}
      {!showForm && selecionadas.size > 0 && (
        <BarraLoteTurmas
          selecionadas={selecionadas} turmasList={turmas}
          onLimpar={limparSelecao} onAtivar={handleAtivarLote} onDesativar={handleDesativarLote} onDeletar={handleDeletarLote}
          carregando={loteCarregando}
        />
      )}

      {(carregando || carregandoEstudantesSemTurma) && !showForm && <div className="flex justify-center items-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>}

      {!carregando && !carregandoEstudantesSemTurma && !showForm && (
        <div className="space-y-4">
          {isMisto && turmas.length > 0 && (
            <div className="flex items-center">
              <button onClick={() => setViewNivelTurmas(v => v === "fundamental" ? "cursos" : "fundamental")} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-brand-500 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
                <Icon icon={viewNivelTurmas === "fundamental" ? "mdi:book-education" : "mdi:school"} width={16} />
                {viewNivelTurmas === "fundamental" ? "Ver Turmas do Ensino Médio" : "Ver Turmas do Ensino Primário e Iº Ciclo"}
              </button>
            </div>
          )}
          {isMisto ? (
            viewNivelTurmas === "fundamental" ? <ViewFundamental lista={turmasFundamental} /> : <ViewCursos lista={turmasCursos} />
          ) : isFundamental ? (
            <ViewFundamental />
          ) : (
            <ViewCursos />
          )}
        </div>
      )}
      </>
      )}
    </div>
  );
}
