// src/components/faltas/FaltasAcademia.tsx
"use client"
import { useState, useEffect, useMemo } from "react";
import { useApi, academiaService, consultasService, tokenStorage } from "@/lib/api";
import { listarTodosEstudantes } from "@/lib/api/pagination";
import type {
  ApiDate, MeuPerfilResponse, Falta, RegistrarFaltasRequest,
  Turma, Curso, EstudanteDetalhado,
} from "@/types/api";
import Icon from "@/components/ui/Icon";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useModal } from "@/hooks/useModal";
import { Dropdown } from "primereact/dropdown";
import DatePicker from "@/components/form/date-picker";
import { getCookie } from "@/lib/utils/cookies";


// ─── helpers ─────────────────────────────────────────────────────────────────

function getUserFromCookie(): MeuPerfilResponse | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(getCookie("user") ?? ""); } catch { return null; }
}

function labelNivel(v: string): string {
  const match = v.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!match) return v.replace(/_/g, " ");
  const [, n, tipo] = match;
  if (tipo === "fundamental") return `${n}º Ano do Ensino Fundamental`;
  if (tipo === "medio")       return `${n}º Ano do Ensino Médio`;
  return `${n}º Ano Superior`;
}

function corQuantidade(q: number): string {
  if (q >= 5) return "text-red-600 dark:text-red-400";
  if (q >= 3) return "text-amber-600 dark:text-amber-400";
  return "text-gray-700 dark:text-gray-300";
}


function tituloCorrecaoFalta(falta: Falta): string | undefined {
  if (!falta.corrigido_em) return undefined;
  const anterior = falta.valor_anterior ?? "—";
  const motivo = falta.motivo_correcao ? ` Motivo: ${falta.motivo_correcao}` : "";
  return `Corrigido em ${falta.corrigido_em}: ${anterior} → ${falta.quantidade}.${motivo}`;
}

function FaltaCorrigidaBadge({ falta }: { falta: Falta }) {
  if (!falta.corrigido_em) return null;
  return <Icon icon="mdi:pencil-circle" width={14} className="ml-1 inline text-brand-500" />;
}

function formatarData(data: ApiDate): string {
  try {
    return new Date(data + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return data; }
}

function toApiDateFromLocalDate(date: Date): ApiDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}` as ApiDate;
}

function turmaAtiva(t: Turma): boolean {
  return t.status !== "inativo" && t.status !== "deletado";
}

function normCodigoEstudante(codigo: string): string {
  return (codigo ?? "").trim().toLowerCase();
}

const ANOS_FUNDAMENTAL = [
  "1_ano_fundamental", "2_ano_fundamental", "3_ano_fundamental", "4_ano_fundamental",
  "5_ano_fundamental", "6_ano_fundamental", "7_ano_fundamental", "8_ano_fundamental", "9_ano_fundamental",
];
const ANOS_MEDIO    = ["1_ano_medio", "2_ano_medio", "3_ano_medio", "4_ano_medio"];
const ANOS_SUPERIOR = [
  "1_ano_superior", "2_ano_superior", "3_ano_superior",
  "4_ano_superior", "5_ano_superior", "6_ano_superior",
];
const ORDEM_ANOS = [...ANOS_FUNDAMENTAL, ...ANOS_MEDIO, ...ANOS_SUPERIOR];

function sortAnos(anos: string[]): string[] {
  return [...anos].sort((a, b) => {
    const ia = ORDEM_ANOS.indexOf(a), ib = ORDEM_ANOS.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1; if (ib === -1) return -1;
    return ia - ib;
  });
}

// ─── tipos de layer ───────────────────────────────────────────────────────────
// Fluxo: anos → turmas → faltas (seletor de matéria inline na camada faltas)

type LayerFund =
  | { mode: "fund"; type: "anos" }
  | { mode: "fund"; type: "turmas"; nivel: string }
  | { mode: "fund"; type: "faltas"; nivel: string; turma: Turma };

type LayerSup =
  | { mode: "sup"; type: "cursos" }
  | { mode: "sup"; type: "anos"; curso: Curso }
  | { mode: "sup"; type: "turmas"; curso: Curso; nivel: string }
  | { mode: "sup"; type: "faltas"; curso: Curso; nivel: string; turma: Turma };

type LayerMisto =
  | { mode: "misto"; type: "choose" }
  | LayerFund
  | LayerSup;

type Layer = LayerFund | LayerSup | LayerMisto;

// ─── sub-componentes ─────────────────────────────────────────────────────────

function Breadcrumb({ crumbs }: { crumbs: { label: string; onClick?: () => void }[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap mb-5">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <Icon icon="mdi:chevron-right" width={15} className="text-gray-400" />}
          {i === crumbs.length - 1
            ? <span className="text-gray-900 dark:text-white font-medium">{c.label}</span>
            : (
              <button
                onClick={c.onClick}
                className="text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors"
              >
                {c.label}
              </button>
            )
          }
        </span>
      ))}
    </nav>
  );
}

function CardBtn({ icon, title, subtitle, badge, onClick }: {
  icon: string; title: string; subtitle?: string; badge?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-400 hover:shadow-sm transition-all text-left group"
    >
      <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
        <Icon icon={icon} width={22} className="text-brand-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {badge && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize flex-shrink-0">
          {badge}
        </span>
      )}
      <Icon icon="mdi:chevron-right" width={18} className="text-gray-400 group-hover:text-brand-500 flex-shrink-0" />
    </button>
  );
}

// ─── Tabela de Faltas ─────────────────────────────────────────────────────────

function TabelaFaltas({
  faltas,
  estudantesMap,
  codigosTurma,
  onCorrigir,
}: {
  faltas: Falta[];
  estudantesMap: Map<string, string>;
  codigosTurma: string[];
  onCorrigir: (falta: Falta) => void;
}) {
  if (codigosTurma.length === 0 && faltas.length === 0) return (
    <div className="text-center py-10 text-gray-400">
      <Icon icon="mdi:check-circle-outline" width={40} className="mx-auto mb-2 text-emerald-400 opacity-80" />
      <p className="text-sm">Nenhum estudante encontrado nesta turma.</p>
    </div>
  );

  const codigosComFalta = new Set(faltas.map(f => normCodigoEstudante(f.codigo_estudante)));
  const codigosSemFalta = codigosTurma.filter(c => !codigosComFalta.has(c));

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm min-w-[700px]">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Nome do Estudante</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Código do Estudante</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Data</th>
            <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">Qtd</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Observação</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {/* Linhas com falta — ordenadas por nome e depois por data descendente */}
          {[...faltas]
            .sort((a, b) => {
              const nomeA = estudantesMap.get(normCodigoEstudante(a.codigo_estudante)) ?? a.codigo_estudante;
              const nomeB = estudantesMap.get(normCodigoEstudante(b.codigo_estudante)) ?? b.codigo_estudante;
              const cmp   = nomeA.localeCompare(nomeB, "pt", { sensitivity: "base" });
              return cmp !== 0 ? cmp : new Date(b.data).getTime() - new Date(a.data).getTime();
            })
            .map(f => {
              const codigoNorm = normCodigoEstudante(f.codigo_estudante);
              const nome       = estudantesMap.get(codigoNorm) ?? estudantesMap.get(f.codigo_estudante);
              return (
                <tr key={f.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {nome ?? <span className="text-gray-400 italic text-sm">Nome não encontrado</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                    {f.codigo_estudante.toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {formatarData(f.data)}
                  </td>
                  <td className={`px-4 py-3 text-center text-base font-bold ${corQuantidade(f.quantidade)}`}>
                    <span title={tituloCorrecaoFalta(f)}>{f.quantidade}<FaltaCorrigidaBadge falta={f} /></span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {f.observacao || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => onCorrigir(f)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300">
                      <Icon icon="mdi:pencil" width={14} /> Corrigir
                    </button>
                  </td>
                </tr>
              );
            })}

          {/* Linhas sem falta nesta matéria — ordenadas por nome */}
          {codigosSemFalta
            .map(codigo => ({
              codigo,
              nome: estudantesMap.get(codigo) ?? estudantesMap.get(codigo.toUpperCase()) ?? null,
            }))
            .sort((a, b) => {
              const nA = a.nome ?? a.codigo;
              const nB = b.nome ?? b.codigo;
              return nA.localeCompare(nB, "pt", { sensitivity: "base" });
            })
            .map(({ codigo, nome }) => (
              <tr key={`sem-falta-${codigo}`} className="bg-white dark:bg-gray-800/60">
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {nome ?? <span className="text-gray-400 italic text-sm">Nome não encontrado</span>}
                </td>
                <td className="px-4 py-3 text-gray-400 dark:text-gray-500 font-mono text-xs">
                  {codigo.toUpperCase()}
                </td>
                <td className="px-4 py-3 text-gray-300 dark:text-gray-600">—</td>
                <td className="px-4 py-3 text-center text-gray-300 dark:text-gray-600 font-bold"></td>
                <td className="px-4 py-3 text-gray-300 dark:text-gray-600">Sem faltas</td>
                <td className="px-4 py-3 text-gray-300 dark:text-gray-600"></td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Modal Registrar Falta ────────────────────────────────────────────────────

function ModalRegistrarFalta({
  isOpen,
  estudantes,
  materias,
  onConfirm,
  onClose,
}: {
  isOpen: boolean;
  estudantes: EstudanteDetalhado[];
  materias: { id: string; nome: string }[];
  onConfirm: (data: RegistrarFaltasRequest) => Promise<void>;
  onClose: () => void;
}) {
  const [codigoEstudante, setCodigoEstudante] = useState("");
  const [dataFalta, setDataFalta]             = useState<ApiDate>(toApiDateFromLocalDate(new Date()));
  const [materiaId, setMateriaId]             = useState("");
  const [quantidade, setQuantidade]           = useState("");
  const [observacao, setObservacao]           = useState("");
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!codigoEstudante || !dataFalta || !materiaId || !quantidade) {
      setError("Preencha todos os campos obrigatórios"); return;
    }
    const qtd = parseInt(quantidade);
    if (isNaN(qtd) || qtd < 1) { setError("Quantidade deve ser no mínimo 1"); return; }
    setLoading(true);
    try {
      await onConfirm({
        codigo_estudante: codigoEstudante,
        data: dataFalta,
        materia_disciplinar_id: materiaId,
        quantidade: qtd,
        observacao: observacao || undefined,
      });
      setCodigoEstudante(""); setMateriaId(""); setQuantidade(""); setObservacao("");
      setDataFalta(toApiDateFromLocalDate(new Date()));
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Erro ao registrar falta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] p-5 lg:p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h4 className="text-lg font-medium text-gray-800 dark:text-white/90 mb-2">
          Registrar Nova Falta
        </h4>
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        <div>
          <Label>Estudante *</Label>
          <Dropdown
            value={codigoEstudante}
            options={estudantes.map(e => ({
              label: `${e.nome} (${e.codigo_estudante})`,
              value: e.codigo_estudante,
            }))}
            onChange={e => setCodigoEstudante(e.value)}
            filter
            placeholder="Selecione o estudante"
            className="w-full"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Quantidade *</Label>
            <Input
              type="number"
              min="1"
              placeholder="Ex: 2"
              value={quantidade}
              onChange={e => setQuantidade(e.target.value)}
            />
          </div>
          <DatePicker
            id="registrar-falta-data"
            label="Data *"
            placeholder="Selecione"
            defaultDate={dataFalta}
            onChange={dates => {
              if (dates?.length) setDataFalta(toApiDateFromLocalDate(dates[0]));
            }}
          />
        </div>
        <div>
          <Label>Matéria *</Label>
          <Dropdown
            value={materiaId}
            options={materias.map(m => ({ label: m.nome, value: m.id }))}
            onChange={e => setMateriaId(e.value)}
            filter
            placeholder="Selecione a matéria"
            className="w-full"
          />
        </div>
        <div>
          <Label>Observação</Label>
          <Input type="text" placeholder="Opcional" onChange={e => setObservacao(e.target.value)} />
        </div>
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button disabled={loading}>{loading ? "Registrando..." : "Registrar Falta"}</Button>
        </div>
      </form>
    </Modal>
  );
}


function ModalCorrigirFalta({ falta, isOpen, onClose, onConfirm }: { falta: Falta | null; isOpen: boolean; onClose: () => void; onConfirm: (id: string, data: { quantidade: number; observacao?: string; motivo: string }) => Promise<void>; }) {
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!falta || !isOpen) return;
    setQuantidade(String(falta.quantidade));
    setObservacao(falta.observacao ?? "");
    setMotivo("");
    setError(null);
  }, [falta, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!falta) return;
    setError(null);
    const qtd = parseInt(quantidade, 10);
    if (Number.isNaN(qtd) || qtd < 1 || qtd > 100) { setError("A quantidade deve estar entre 1 e 100."); return; }
    if (!motivo.trim()) { setError("Informe o motivo da correção."); return; }
    setLoading(true);
    try {
      await onConfirm(falta.id, { quantidade: qtd, observacao: observacao || undefined, motivo: motivo.trim() });
      onClose();
    } catch (err: any) { setError(err?.message ?? "Não foi possível corrigir a falta."); }
    finally { setLoading(false); }
  }

  if (!isOpen || !falta) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[520px] p-5 lg:p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h4 className="text-lg font-medium text-gray-800 dark:text-white/90">Corrigir Falta</h4>
        {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">{error}</div>}
        <div><Label>Quantidade (1–100) *</Label><Input type="number" min="1" max="100" value={quantidade} onChange={e => setQuantidade(e.target.value)} /></div>
        <div><Label>Observação</Label><Input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Opcional" /></div>
        <div><Label>Motivo da correção *</Label><Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Explique o motivo" /></div>
        <div className="flex gap-3 justify-end"><Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button><Button disabled={loading}>{loading ? "Corrigindo..." : "Corrigir"}</Button></div>
      </form>
    </Modal>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function FaltasAcademia() {
  const [user] = useState<MeuPerfilResponse | null>(getUserFromCookie);
  const token  = tokenStorage.get() ?? undefined;

  const academiaNivel = user?.academia?.nivel ?? "escola";
  const nivelEscolar  = user?.academia?.nivel_escolar ?? "fundamental";
  const isFundamental = academiaNivel === "escola" && nivelEscolar === "fundamental";
  const isSuperior    = academiaNivel === "superior";
  const isMisto       = academiaNivel === "escola" && nivelEscolar === "misto";

  const initLayer = (): Layer => {
    if (isFundamental) return { mode: "fund", type: "anos" };
    if (isMisto)       return { mode: "misto", type: "choose" };
    return { mode: "sup", type: "cursos" };
  };

  const [layer, setLayer]                           = useState<Layer>(initLayer);
  const [alert, setAlert]                           = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const [faltasPorEstudante, setFaltasPorEstudante] = useState<Record<string, Falta[]>>({});
  const [carregandoFaltas, setCarregandoFaltas]     = useState(false);
  const [anoLetivoSelecionado, setAnoLetivoSelecionado] = useState("");

  // Matéria selecionada nos botões inline — análogo ao materiaSelecionada do NotasAcademia
  const [materiaSelecionada, setMateriaSelecionada] = useState<{ id: string; nome: string } | null>(null);

  const { data: dataTurmas,         loading: loadingTurmas, execute: carregarTurmas     } = useApi(academiaService.listarTurmas);
  const { data: dataCursos,                                  execute: carregarCursos     } = useApi(academiaService.listarCursos);
  const { data: dataEstudantes,                              execute: carregarEstudantes } = useApi(listarTodosEstudantes);
  const { data: dataMaterias,                                execute: carregarMaterias   } = useApi(academiaService.listarMaterias);
  const { data: dataAnoLetivo,                               execute: buscarAnoLetivo    } = useApi(academiaService.getAnoLetivo);
  const { data: dataAnosLetivosLista,                        execute: buscarAnosLetivos  } = useApi(academiaService.listarAnosLetivosLista);
  const { execute: executarRegistrar }                                                      = useApi(academiaService.registrarFaltas);

  const { isOpen, openModal, closeModal } = useModal();
  const { isOpen: isCorrigirOpen, openModal: openCorrigirModal, closeModal: closeCorrigirModal } = useModal();
  const [faltaSelecionada, setFaltaSelecionada] = useState<Falta | null>(null);
  const materias = useMemo(
    () => ((dataMaterias as any)?.materias ?? []).filter((m: any) => m.status === "ativo"),
    [dataMaterias]
  );

  // ─── carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    carregarTurmas(token);
    carregarCursos(token);
    carregarEstudantes({ token, limit: 50, offset: 0 });
    carregarMaterias(token);
    buscarAnoLetivo(token);
    buscarAnosLetivos(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── auto-selecionar primeira matéria ao entrar na camada faltas ────────────
  // Quando o layer muda para "faltas" e as matérias já estão carregadas,
  // pré-seleciona a primeira matéria alfabeticamente para evitar tela vazia.
  // Quando sai da camada "faltas", limpa a seleção.

  useEffect(() => {
    if (layer.type !== "faltas") {
      setMateriaSelecionada(null);
      return;
    }

    const l = layer as any;
    const tipo = l.nivel?.includes("fundamental") ? "fundamental"
               : l.nivel?.includes("medio")       ? "medio"
               : "superior";

    const materiasConfig = (materias as any[]).filter((m: any) => {
      if (m.type !== tipo) return false;
      if (tipo === "fundamental") return m.anos_academicos?.includes(l.nivel);
      if (tipo === "medio")       return l.turma?.curso_id ? m.curso_id === l.turma.curso_id : m.anos_academicos?.includes(l.nivel);
      return l.curso ? m.curso_id === l.curso.id : false;
    });

    const sorted = [...materiasConfig].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" })
    );

    if (sorted.length > 0) {
      setMateriaSelecionada({ id: sorted[0].id, nome: sorted[0].nome });
    } else {
      setMateriaSelecionada(null);
    }

  }, [layer, materias]);

  // ─── dados derivados ────────────────────────────────────────────────────────

  const turmas: Turma[]                  = useMemo(() => (dataTurmas as any)?.turmas ?? [], [dataTurmas]);
  const cursos: Curso[]                  = useMemo(() => ((dataCursos as any)?.cursos ?? []).filter((c: any) => c.status === "ativo"), [dataCursos]);
  const estudantes: EstudanteDetalhado[] = useMemo(() => (dataEstudantes as any)?.estudantes ?? [], [dataEstudantes]);
  const anoLectivo                       = (dataAnoLetivo as any)?.ano_letivo ?? "";
  const anosLetivosDisponiveis           = useMemo(() => (
    ((dataAnosLetivosLista as any)?.anos_letivos_lista ?? [])
      .map((x: any) => x?.ano_letivo)
      .filter(Boolean)
      .sort()
  ), [dataAnosLetivosLista]);

  const turmasAtivas: Turma[] = useMemo(() => turmas.filter(turmaAtiva), [turmas]);
  const todasFaltas           = useMemo(() => Object.values(faltasPorEstudante).flat(), [faltasPorEstudante]);

  // estudantesMap indexado por código normalizado (lowercase) para garantir lookup sempre funciona
  const estudantesMap = useMemo(() => {
    const m = new Map<string, string>();
    estudantes.forEach(e => {
      m.set(normCodigoEstudante(e.codigo_estudante), e.nome);
    });
    return m;
  }, [estudantes]);

  const materiasAtivas = useMemo(
    () => (materias as any[]).map((m: any) => ({ id: m.id, nome: m.nome })),
    [materias]
  );

  const niveisFundamentais = useMemo(() => {
    const anosAcademia = user?.academia?.anos_academicos ?? [];
    const comTurmas    = anosAcademia.filter(
      a => a.includes("fundamental") && turmasAtivas.some(t => t.nivel === a)
    );
    return sortAnos(comTurmas.length > 0 ? comTurmas : anosAcademia.filter(a => a.includes("fundamental")));
  }, [turmasAtivas, user]);

  // ─── helpers internos ───────────────────────────────────────────────────────

  function showAlert(variant: "success" | "error", message: string) {
    setAlert({ variant, message });
    setTimeout(() => setAlert(null), 4000);
  }

  function codigosTurmaDoAnoLetivo(turma: Turma, anoLetivo?: string): string[] {
    const codigosHistorico = anoLetivo ? (turma.historico_estudantes_ano_letivo?.[anoLetivo] ?? []) : [];
    const codigosOrigem    = codigosHistorico.length > 0 ? codigosHistorico : turma.estudantes;
    return Array.from(new Set(codigosOrigem.map(normCodigoEstudante).filter(Boolean)));
  }

  function codigoOriginalDaTurma(turma: Turma, codigoNorm: string, anoLetivo?: string): string {
    const codigosHistorico = anoLetivo ? (turma.historico_estudantes_ano_letivo?.[anoLetivo] ?? []) : [];
    const codigosOrigem    = codigosHistorico.length > 0 ? codigosHistorico : turma.estudantes;
    return codigosOrigem.find(c => normCodigoEstudante(c) === codigoNorm) ?? codigoNorm;
  }

  async function carregarFaltasDosEstudantesDaTurma(turma: Turma, force = false) {
    const anoFiltro         = anoLetivoSelecionado || anoLectivo || undefined;
    const codigosNorm       = codigosTurmaDoAnoLetivo(turma, anoFiltro);
    const codigosParaBuscar = force
      ? codigosNorm
      : codigosNorm.filter(c => !(c in faltasPorEstudante));
    if (codigosParaBuscar.length === 0) return;

    setCarregandoFaltas(true);
    try {
      const resultados = await Promise.all(
        codigosParaBuscar.map(async codigoNorm => {
          const codigoOriginal = codigoOriginalDaTurma(turma, codigoNorm, anoFiltro);
          const resposta = await consultasService.faltasEstudante(codigoOriginal, { token });
          return { codigoNorm, faltas: resposta?.faltas ?? [] };
        })
      );
      setFaltasPorEstudante(prev => {
        const next = { ...prev };
        resultados.forEach(({ codigoNorm, faltas }) => { next[codigoNorm] = faltas; });
        return next;
      });
    } catch {
      // erro silencioso — a UI continua com dados parciais
    } finally {
      setCarregandoFaltas(false);
    }
  }

  /** Faltas da turma filtradas por matéria e ano letivo */
  function faltasDaTurmaEMateria(turma: Turma, materiaId: string): Falta[] {
    const codigosTurma  = codigosTurmaDoAnoLetivo(turma, anoLetivoSelecionado || anoLectivo);
    const faltasDaTurma = codigosTurma.flatMap(c => faltasPorEstudante[c] ?? []);
    const anoFiltro     = anoLetivoSelecionado || anoLectivo;
    return faltasDaTurma.filter(f =>
      f.materia_disciplinar_id === materiaId &&
      (anoFiltro ? f.ano_lectivo === anoFiltro : true)
    );
  }

  /** Matérias disponíveis para a turma/nível, com contagem de faltas para o badge nos botões */
  function getMateriasDaTurma(turma: Turma, nivel: string, curso?: Curso) {
    const tipo = nivel.includes("fundamental") ? "fundamental"
               : nivel.includes("medio")       ? "medio"
               : "superior";

    const materiasConfig = (materias as any[]).filter((m: any) => {
      if (m.type !== tipo) return false;
      if (tipo === "fundamental") return m.anos_academicos?.includes(nivel);
      if (tipo === "medio")       return turma.curso_id ? m.curso_id === turma.curso_id : m.anos_academicos?.includes(nivel);
      return curso ? m.curso_id === curso.id : false;
    });

    const codigosTurma  = codigosTurmaDoAnoLetivo(turma, anoLetivoSelecionado || anoLectivo);
    const anoFiltro     = anoLetivoSelecionado || anoLectivo;
    const faltasDaTurma = codigosTurma
      .flatMap(c => faltasPorEstudante[c] ?? [])
      .filter(f => (anoFiltro ? f.ano_lectivo === anoFiltro : true));

    return materiasConfig.map((m: any) => {
      const fs    = faltasDaTurma.filter(f => f.materia_disciplinar_id === m.id);
      const total = fs.reduce((acc, f) => acc + f.quantidade, 0);
      return { id: m.id, nome: m.nome, totalFaltas: total, registros: fs.length };
    }).sort((a, b) => a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" }));
  }

  // ─── handlers de escrita ────────────────────────────────────────────────────

  async function handleRegistrar(data: RegistrarFaltasRequest) {
    await executarRegistrar(data, token);
    showAlert("success", "Falta registrada com sucesso.");
    const turmaAtual = layer.type === "faltas" ? (layer as any).turma : null;
    if (turmaAtual) await carregarFaltasDosEstudantesDaTurma(turmaAtual, true);
  }

  async function handleCorrigirFalta(id: string, data: { quantidade: number; observacao?: string; motivo: string }) {
    await academiaService.corrigirFalta(id, data, token);
    showAlert("success", "Falta corrigida com sucesso.");
    const turmaAtual = layer.type === "faltas" ? (layer as any).turma : null;
    if (turmaAtual) await carregarFaltasDosEstudantesDaTurma(turmaAtual, true);
  }

  // ─── helpers de listagem ────────────────────────────────────────────────────

  const turmasPorNivel = (nivel: string) => turmasAtivas.filter(t => t.nivel === nivel);
  const turmasPorCurso = (cursoId: string, nivel: string) =>
    turmasAtivas.filter(t => t.curso_id === cursoId && t.nivel === nivel);
  const anosDosCurso   = (c: Curso) => sortAnos(c.anos_academicos ?? []);

  // ─── breadcrumbs ────────────────────────────────────────────────────────────

  function buildCrumbs(): { label: string; onClick?: () => void }[] {
    const goInicio = () => setLayer({ mode: "misto", type: "choose" });

    if (layer.mode === "fund") {
      const goAnos    = () => setLayer({ mode: "fund", type: "anos" });
      const anosCrumb = { label: isMisto ? "Fundamental" : "Anos", onClick: goAnos };
      const base      = isMisto ? [{ label: "Início", onClick: goInicio }, anosCrumb] : [anosCrumb];
      if (layer.type === "anos")   return base;
      if (layer.type === "turmas") return [...base, { label: labelNivel(layer.nivel) }];
      if (layer.type === "faltas") return [
        ...base,
        { label: labelNivel(layer.nivel), onClick: () => setLayer({ mode: "fund", type: "turmas", nivel: layer.nivel }) },
        { label: `Turma ${layer.turma.codigo_turma}` },
      ];
    }

    if (layer.mode === "sup") {
      const goCursos    = () => setLayer({ mode: "sup", type: "cursos" });
      const cursosCrumb = { label: isMisto ? "Médio/Superior" : "Cursos", onClick: goCursos };
      const base        = isMisto ? [{ label: "Início", onClick: goInicio }, cursosCrumb] : [cursosCrumb];
      const l = layer as any;
      if (layer.type === "cursos") return base;
      if (layer.type === "anos")   return [...base, { label: l.curso.nome }];
      if (layer.type === "turmas") return [
        ...base,
        { label: l.curso.nome, onClick: () => setLayer({ mode: "sup", type: "anos", curso: l.curso }) },
        { label: labelNivel(l.nivel) },
      ];
      if (layer.type === "faltas") return [
        ...base,
        { label: l.curso.nome,        onClick: () => setLayer({ mode: "sup", type: "anos",   curso: l.curso }) },
        { label: labelNivel(l.nivel), onClick: () => setLayer({ mode: "sup", type: "turmas", curso: l.curso, nivel: l.nivel }) },
        { label: `Turma ${l.turma.codigo_turma}` },
      ];
    }

    if (layer.mode === "misto" && layer.type === "choose") return [{ label: "Início" }];
    return [];
  }

  // ─── goBack / canGoBack ──────────────────────────────────────────────────────

  function canGoBack(): boolean {
    if (layer.mode === "misto" && layer.type === "choose") return Boolean(anoLetivoSelecionado);
    if (layer.mode === "fund" && layer.type === "anos" && !isMisto && !anoLetivoSelecionado) return false;
    if (layer.mode === "sup"  && layer.type === "cursos" && !isMisto) return false;
    return true;
  }

  function goBack() {
    if (!canGoBack()) return;

    if (layer.mode === "misto" && layer.type === "choose") {
      setAnoLetivoSelecionado("");
      return;
    }

    if (layer.type === "anos" && anoLetivoSelecionado) {
      setAnoLetivoSelecionado("");
      return;
    }

    if (layer.mode === "fund") {
      if (layer.type === "anos") {
        if (isMisto) setLayer({ mode: "misto", type: "choose" });
      } else if (layer.type === "turmas") {
        setLayer({ mode: "fund", type: "anos" });
      } else if (layer.type === "faltas") {
        setLayer({ mode: "fund", type: "turmas", nivel: layer.nivel });
      }
      return;
    }

    if (layer.mode === "sup") {
      const l = layer as any;
      if (layer.type === "cursos") {
        if (isMisto) setLayer({ mode: "misto", type: "choose" });
      } else if (layer.type === "anos") {
        setLayer({ mode: "sup", type: "cursos" });
      } else if (layer.type === "turmas") {
        setLayer({ mode: "sup", type: "anos", curso: l.curso });
      } else if (layer.type === "faltas") {
        setLayer({ mode: "sup", type: "turmas", curso: l.curso, nivel: l.nivel });
      }
      return;
    }
  }

  // ─── camada folha: seletor inline de matéria + tabela ────────────────────────

  function renderFaltasLayer(nivel: string, turma: Turma, subtitulo?: string, curso?: Curso) {
    const materiasDisponiveis = getMateriasDaTurma(turma, nivel, curso);
    const codigosTurma        = codigosTurmaDoAnoLetivo(turma, anoLetivoSelecionado || anoLectivo).filter(Boolean);

    const faltas = materiaSelecionada
      ? faltasDaTurmaEMateria(turma, materiaSelecionada.id)
      : [];

    const totalFaltas = faltas.reduce((acc, f) => acc + f.quantidade, 0);
    const comFalta    = new Set(faltas.map(f => normCodigoEstudante(f.codigo_estudante))).size;

    return (
      <div className="space-y-5">
        {/* Cabeçalho */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Turma {turma.codigo_turma} · {labelNivel(nivel)}
            {(anoLetivoSelecionado || anoLectivo) ? ` · ${(anoLetivoSelecionado || anoLectivo).replace("_", "/")}` : ""}
          </h2>
          {subtitulo && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitulo}</p>}
        </div>

        {/* ── Seletor de matéria inline (igual ao NotasAcademia) ── */}
        {materiasDisponiveis.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Icon icon="mdi:book-outline" width={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma matéria configurada para este nível.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {materiaSelecionada ? `Faltas de ${materiaSelecionada.nome}` : "Matérias"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {materiasDisponiveis.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMateriaSelecionada(prev => prev?.id === m.id ? null : { id: m.id, nome: m.nome })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    materiaSelecionada?.id === m.id
                      ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400"
                  }`}
                >
                  {m.nome}
                  {m.totalFaltas > 0 && (
                    <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                      materiaSelecionada?.id === m.id
                        ? "bg-white/20 text-white"
                        : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    }`}>
                      {m.totalFaltas}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats — só aparece quando há matéria selecionada */}
        {materiaSelecionada && (faltas.length > 0 || codigosTurma.length > 0) && (
          <div className="flex flex-wrap gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Faltas</p>
              <p className={`text-2xl font-bold mt-0.5 ${corQuantidade(totalFaltas)}`}>{totalFaltas}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Registros</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{faltas.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estudantes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{codigosTurma.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Com falta</p>
              <p className={`text-2xl font-bold mt-0.5 ${comFalta > 0 ? corQuantidade(comFalta) : "text-gray-900 dark:text-white"}`}>
                {comFalta}
              </p>
            </div>
          </div>
        )}

        {/* Tabela */}
        {materiaSelecionada ? (
          <TabelaFaltas
            faltas={faltas}
            estudantesMap={estudantesMap}
            codigosTurma={codigosTurma}
            onCorrigir={(falta) => { setFaltaSelecionada(falta); openCorrigirModal(); }}
          />
        ) : null}
      </div>
    );
  }

  // ─── renderLayer ─────────────────────────────────────────────────────────────

  function renderLayer() {
    const crumbs = buildCrumbs();

    const BotaoVoltar = canGoBack() ? (
      <button
        type="button"
        onClick={goBack}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300 mb-4"
      >
        <Icon icon="mdi:arrow-left" width={18} />
        Voltar
      </button>
    ) : null;

    if (loadingTurmas || carregandoFaltas) return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {carregandoFaltas ? "Carregando faltas..." : "Carregando turmas..."}
          </p>
        </div>
      </div>
    );

    // ── modo misto ────────────────────────────────────────────────────────────
    if (layer.mode === "misto" && layer.type === "choose") return (
      <div className="space-y-6">
        {BotaoVoltar}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{anoLetivoSelecionado ? "Faltas" : "Anos Letivos"}</h2>
          <p className="text-sm text-gray-500 mt-1">{anoLetivoSelecionado ? "Selecione o nível de ensino" : "Selecione o ano letivo"}</p>
        </div>
        {!anoLetivoSelecionado ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {anosLetivosDisponiveis.map((ano: string) => (
              <CardBtn
                key={ano}
                icon="mdi:calendar-school"
                title={`Ano Letivo ${ano.replace("_", "/")}`}
                subtitle="Entrar para selecionar o nível de ensino"
                onClick={() => setAnoLetivoSelecionado(ano)}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <CardBtn icon="mdi:school"         title="Ensino Fundamental" subtitle="1º ao 9º Ano"  onClick={() => setLayer({ mode: "fund", type: "anos" })} />
            <CardBtn icon="mdi:book-education" title="Médio / Superior"   subtitle="Cursos"         onClick={() => setLayer({ mode: "sup", type: "cursos" })} />
          </div>
        )}
      </div>
    );

    // ── fundamental: anos letivos ────────────────────────────────────────────
    if (layer.mode === "fund" && layer.type === "anos") return (
      <div className="space-y-4">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {anoLetivoSelecionado ? "Anos Académicos — Ensino Fundamental" : "Anos Letivos — Ensino Fundamental"}
        </h2>
        {!anoLetivoSelecionado ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {anosLetivosDisponiveis.map((ano: string) => (
              <CardBtn key={ano} icon="mdi:calendar-school"
                title={`Ano Letivo ${ano.replace("_", "/")}`}
                subtitle="Entrar para ver os anos académicos"
                onClick={() => setAnoLetivoSelecionado(ano)}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium border border-brand-200 dark:border-brand-800">
                Ano letivo {anoLetivoSelecionado.replace("_", "/")}
              </span>
            </div>
            {niveisFundamentais.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Icon icon="mdi:school-outline" width={48} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Nenhum nível fundamental configurado nesta academia.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {niveisFundamentais.map(nivel => (
                  <CardBtn key={nivel} icon="mdi:numeric"
                    title={labelNivel(nivel)}
                    subtitle={`${turmasPorNivel(nivel).length} turma(s) ativa(s)`}
                    onClick={() => setLayer({ mode: "fund", type: "turmas", nivel })}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );

    // ── fundamental: turmas ──────────────────────────────────────────────────
    if (layer.mode === "fund" && layer.type === "turmas") {
      const ts = turmasPorNivel(layer.nivel);
      return (
        <div className="space-y-4">
          {BotaoVoltar}
          <Breadcrumb crumbs={crumbs} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labelNivel(layer.nivel)}</h2>
          {ts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Icon icon="mdi:account-group-outline" width={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma turma ativa para este nível.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {ts.map(t => {
                const codigosTurma = new Set(codigosTurmaDoAnoLetivo(t, anoLetivoSelecionado || anoLectivo));
                const faltasTurma  = todasFaltas.filter(f =>
                  codigosTurma.has(normCodigoEstudante(f.codigo_estudante)) &&
                  (anoLetivoSelecionado || anoLectivo ? f.ano_lectivo === (anoLetivoSelecionado || anoLectivo) : true)
                );
                const totalFaltas = faltasTurma.reduce((acc, f) => acc + f.quantidade, 0);
                return (
                  <CardBtn key={t.codigo_turma} icon="mdi:account-group"
                    title={`Turma ${t.codigo_turma}`}
                    subtitle={`${codigosTurmaDoAnoLetivo(t, anoLetivoSelecionado || anoLectivo).length} estudante(s) · ${t.turno}${totalFaltas > 0 ? ` · ${totalFaltas} falta(s)` : ""}`}
                    onClick={async () => {
                      await carregarFaltasDosEstudantesDaTurma(t);
                      setLayer({ mode: "fund", type: "faltas", nivel: layer.nivel, turma: t });
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // ── fundamental: faltas ──────────────────────────────────────────────────
    if (layer.mode === "fund" && layer.type === "faltas") {
      const { nivel, turma } = layer;
      return (
        <div className="space-y-4">
          {BotaoVoltar}
          <Breadcrumb crumbs={crumbs} />
          {renderFaltasLayer(nivel, turma)}
        </div>
      );
    }

    // ── superior: cursos ─────────────────────────────────────────────────────
    if (layer.mode === "sup" && layer.type === "cursos") return (
      <div className="space-y-4">
        {BotaoVoltar}
        <Breadcrumb crumbs={crumbs} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{anoLetivoSelecionado ? "Cursos" : "Anos Letivos"}</h2>
        {!anoLetivoSelecionado ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {anosLetivosDisponiveis.map((ano: string) => (
              <CardBtn
                key={ano}
                icon="mdi:calendar-school"
                title={`Ano Letivo ${ano.replace("_", "/")}`}
                subtitle="Entrar para selecionar o curso"
                onClick={() => setAnoLetivoSelecionado(ano)}
              />
            ))}
          </div>
        ) : cursos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Icon icon="mdi:book-open-outline" width={48} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum curso ativo.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {cursos.map(c => (
              <CardBtn key={c.id} icon="mdi:book-open-variant"
                title={c.nome}
                subtitle={`${c.anos_academicos?.length ?? 0} ano(s)`}
                onClick={() => setLayer({ mode: "sup", type: "anos", curso: c })}
              />
            ))}
          </div>
        )}
      </div>
    );

    // ── superior: anos letivos ────────────────────────────────────────────────
    if (layer.mode === "sup" && layer.type === "anos") {
      const { curso } = layer as { mode: "sup"; type: "anos"; curso: Curso };
      const anos      = anosDosCurso(curso);
      return (
        <div className="space-y-4">
          {BotaoVoltar}
          <Breadcrumb crumbs={crumbs} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {anoLetivoSelecionado ? "Anos Académicos" : curso.nome}
          </h2>
          {anoLetivoSelecionado && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{curso.nome}</p>
          )}
          {!anoLetivoSelecionado ? (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {anosLetivosDisponiveis.map((ano: string) => (
                <CardBtn key={ano} icon="mdi:calendar-school"
                  title={`Ano Letivo ${ano.replace("_", "/")}`}
                  subtitle="Entrar para ver os anos académicos"
                  onClick={() => setAnoLetivoSelecionado(ano)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium border border-brand-200 dark:border-brand-800">
                  Ano letivo {anoLetivoSelecionado.replace("_", "/")}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {anos.map(nivel => (
                  <CardBtn key={nivel} icon="mdi:calendar-school"
                    title={labelNivel(nivel)}
                    subtitle={`${turmasPorCurso(curso.id, nivel).length} turma(s)`}
                    onClick={() => setLayer({ mode: "sup", type: "turmas", curso, nivel })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── superior: turmas ──────────────────────────────────────────────────────
    if (layer.mode === "sup" && layer.type === "turmas") {
      const { curso, nivel } = layer as { mode: "sup"; type: "turmas"; curso: Curso; nivel: string };
      const ts               = turmasPorCurso(curso.id, nivel);
      return (
        <div className="space-y-4">
          {BotaoVoltar}
          <Breadcrumb crumbs={crumbs} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labelNivel(nivel)}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{curso.nome}</p>
          {ts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Icon icon="mdi:account-group-outline" width={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma turma ativa para este nível neste curso.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {ts.map(t => {
                const codigosTurma = new Set(codigosTurmaDoAnoLetivo(t, anoLetivoSelecionado || anoLectivo));
                const faltasTurma  = todasFaltas.filter(f =>
                  codigosTurma.has(normCodigoEstudante(f.codigo_estudante)) &&
                  (anoLetivoSelecionado || anoLectivo ? f.ano_lectivo === (anoLetivoSelecionado || anoLectivo) : true)
                );
                const totalFaltas = faltasTurma.reduce((acc, f) => acc + f.quantidade, 0);
                return (
                  <CardBtn key={t.id ?? t.codigo_turma} icon="mdi:account-group"
                    title={`Turma ${t.codigo_turma}`}
                    subtitle={`${codigosTurmaDoAnoLetivo(t, anoLetivoSelecionado || anoLectivo).length} estudante(s) · ${t.turno}${totalFaltas > 0 ? ` · ${totalFaltas} falta(s)` : ""}`}
                    onClick={async () => {
                      await carregarFaltasDosEstudantesDaTurma(t);
                      setLayer({ mode: "sup", type: "faltas", curso, nivel, turma: t });
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // ── superior: faltas ──────────────────────────────────────────────────────
    if (layer.mode === "sup" && layer.type === "faltas") {
      const { curso, nivel, turma } = layer as any;
      return (
        <div className="space-y-4">
          {BotaoVoltar}
          <Breadcrumb crumbs={crumbs} />
          {renderFaltasLayer(nivel, turma, curso.nome, curso)}
        </div>
      );
    }

    return null;
  }

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {alert && (
        <Alert
          variant={alert.variant}
          title={alert.variant === "success" ? "Sucesso" : "Erro"}
          message={alert.message}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Faltas</h2>
          {turmas.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {turmasAtivas.length} turma(s) ativa(s) · {estudantes.length} estudante(s) · {todasFaltas.length} registro(s)
            </p>
          )}
        </div>
        <Button size="sm" startIcon={<Icon icon="mdi:plus" />} onClick={openModal}>
          Nova Falta
        </Button>
      </div>

      {renderLayer()}

      {/* Modal registrar */}
      <ModalCorrigirFalta
        falta={faltaSelecionada}
        isOpen={isCorrigirOpen}
        onClose={closeCorrigirModal}
        onConfirm={handleCorrigirFalta}
      />

      <ModalRegistrarFalta
        isOpen={isOpen}
        estudantes={estudantes}
        materias={materiasAtivas}
        onConfirm={handleRegistrar}
        onClose={closeModal}
      />
    </div>
  );
}
