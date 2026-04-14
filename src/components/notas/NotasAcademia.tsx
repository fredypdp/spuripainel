// src/components/notas/NotasAcademia.tsx
"use client"
import { useState, useEffect, useMemo } from "react";
import { useApi, academiaService, consultasService, tokenStorage } from "@/lib/api";
import type {
  MeuPerfilResponse, Nota, Turma, EstudanteDetalhado, Curso,
  TipoNota, RegistrarNotasRequest, AtualizarNotaRequest, CriarCategoriaNotaRequest,
} from "@/types/api";
import Icon from "@/components/ui/Icon";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useModal } from "@/hooks/useModal";
import { Dropdown } from "primereact/dropdown";
import { getCookie } from "@/lib/utils/cookies";

// ─── helpers ─────────────────────────────────────────────────────────────────

function getUserFromCookie(): MeuPerfilResponse | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(getCookie("user") ?? ""); } catch { return null; }
}

const PERIODOS_LABEL: Record<string, string> = {
  "1_trimestre": "1º Trimestre", "2_trimestre": "2º Trimestre", "3_trimestre": "3º Trimestre",
  "1_semestre": "1º Semestre", "2_semestre": "2º Semestre",
};

const PERIODOS_ESCOLA   = [{ label: "1º Trimestre", value: "1_trimestre" }, { label: "2º Trimestre", value: "2_trimestre" }, { label: "3º Trimestre", value: "3_trimestre" }];
const PERIODOS_SUPERIOR = [{ label: "1º Semestre", value: "1_semestre" }, { label: "2º Semestre", value: "2_semestre" }];

const CATEGORIAS_ESCOLAR        = [{ label: "Nota Final", value: "nota_escola" }, { label: "Nota Professor", value: "nota_professor" }];
const CATEGORIAS_FIXAS_SUPERIOR = [{ label: "PP1", value: "nota_pp1" }, { label: "PP2", value: "nota_pp2" }, { label: "Exame", value: "nota_exame" }];

const ANOS_FUNDAMENTAL = [
  "1_ano_fundamental", "2_ano_fundamental", "3_ano_fundamental", "4_ano_fundamental",
  "5_ano_fundamental", "6_ano_fundamental", "7_ano_fundamental", "8_ano_fundamental", "9_ano_fundamental",
];
const ANOS_MEDIO    = ["1_ano_medio", "2_ano_medio", "3_ano_medio", "4_ano_medio"];
const ANOS_SUPERIOR = ["1_ano_superior", "2_ano_superior", "3_ano_superior", "4_ano_superior", "5_ano_superior", "6_ano_superior"];
const ORDEM_ANOS    = [...ANOS_FUNDAMENTAL, ...ANOS_MEDIO, ...ANOS_SUPERIOR];

function sortAnos(anos: string[]): string[] {
  return [...anos].sort((a, b) => {
    const ia = ORDEM_ANOS.indexOf(a); const ib = ORDEM_ANOS.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1; if (ib === -1) return -1;
    return ia - ib;
  });
}

const NIVEL_BASE: Record<string, string> = {
  "1_ano_fundamental": "1º Ano", "2_ano_fundamental": "2º Ano", "3_ano_fundamental": "3º Ano",
  "4_ano_fundamental": "4º Ano", "5_ano_fundamental": "5º Ano", "6_ano_fundamental": "6º Ano",
  "7_ano_fundamental": "7º Ano", "8_ano_fundamental": "8º Ano", "9_ano_fundamental": "9º Ano",
  "1_ano_medio": "1º Médio",     "2_ano_medio": "2º Médio",     "3_ano_medio": "3º Médio",     "4_ano_medio": "4º Médio",
  "1_ano_superior": "1º Ano",    "2_ano_superior": "2º Ano",    "3_ano_superior": "3º Ano",
  "4_ano_superior": "4º Ano",    "5_ano_superior": "5º Ano",    "6_ano_superior": "6º Ano",
};

function labelNivel(v: string, comSufixo = false): string {
  const base = NIVEL_BASE[v] ?? v.replace(/_/g, " ");
  if (!comSufixo) return base;
  if (v.includes("fundamental")) return `${base} (Fundamental)`;
  if (v.includes("medio"))       return `${base} (Médio)`;
  return base;
}

function corNota(n: number) {
  if (n >= 14) return "text-emerald-600 dark:text-emerald-400";
  if (n >= 10) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function calcMedia(notas: Nota[]) {
  if (!notas.length) return null;
  return notas.reduce((s, n) => s + n.nota, 0) / notas.length;
}

function formatCategoria(c: string) {
  const m: Record<string, string> = { nota_escola: "Nota Final", nota_professor: "Nota Prof.", nota_pp1: "PP1", nota_pp2: "PP2", nota_exame: "Exame" };
  return m[c] ?? c.replace(/^nota_/, "").replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function turmaAtiva(turma: Turma): boolean {
  const s = turma.status ?? "";
  return s !== "inativo" && s !== "deletado";
}

// ─── tipos de layer ───────────────────────────────────────────────────────────

type LayerFund =
  | { mode: "fund"; type: "anos" }
  | { mode: "fund"; type: "turmas"; nivel: string }
  | { mode: "fund"; type: "periodos"; nivel: string; turma: Turma }
  | { mode: "fund"; type: "materias"; nivel: string; turma: Turma; periodo: string }
  | { mode: "fund"; type: "notas"; nivel: string; turma: Turma; periodo: string; materiaId: string; materiaNome: string };

type LayerSup =
  | { mode: "sup"; type: "cursos" }
  | { mode: "sup"; type: "anos"; curso: Curso }
  | { mode: "sup"; type: "turmas"; curso: Curso; nivel: string }
  | { mode: "sup"; type: "periodos"; curso: Curso; nivel: string; turma: Turma }
  | { mode: "sup"; type: "materias"; curso: Curso; nivel: string; turma: Turma; periodo: string }
  | { mode: "sup"; type: "notas"; curso: Curso; nivel: string; turma: Turma; periodo: string; materiaId: string; materiaNome: string };

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
            : <button onClick={c.onClick} className="text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors">{c.label}</button>
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
    <button onClick={onClick} className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-400 hover:shadow-sm transition-all text-left group">
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

function StatsRow({ notas, label }: { notas: Nota[]; label: string }) {
  const media = calcMedia(notas);
  const aprovadas = notas.filter(n => n.nota >= 10).length;
  return (
    <div className="flex flex-wrap gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
      <div><p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p><p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{notas.length}</p></div>
      {media !== null && <div><p className="text-xs text-gray-500 uppercase tracking-wide">Média</p><p className={`text-2xl font-bold mt-0.5 ${corNota(media)}`}>{media.toFixed(1)}</p></div>}
      <div><p className="text-xs text-gray-500 uppercase tracking-wide">Aprovações</p><p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{aprovadas}/{notas.length}</p></div>
    </div>
  );
}

function TabelaNotasTurma({ notas, estudantes }: { notas: Nota[]; estudantes: EstudanteDetalhado[] }) {
  if (!notas.length) return (
    <div className="text-center py-10 text-gray-400">
      <Icon icon="mdi:notebook-outline" width={40} className="mx-auto mb-2 opacity-40" />
      <p className="text-sm">Nenhuma nota registrada nesta matéria para este período.</p>
    </div>
  );
  const estudantesNotas = Array.from(new Set(notas.map(n => n.codigo_estudante)));
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Estudante</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Código</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Ano Académico</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Categoria</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Nota</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {estudantesNotas.map(codigo => {
            const notasEst = notas.filter(n => n.codigo_estudante === codigo);
            const est = estudantes.find(e => e.codigo_estudante === codigo);
            return notasEst.map((nota, i) => (
              <tr key={nota.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                {i === 0 && (
                  <>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white" rowSpan={notasEst.length}>{est?.nome ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs" rowSpan={notasEst.length}>{codigo}</td>
                  </>
                )}
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{nota.ano_academico ? labelNivel(nota.ano_academico) : "-"}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatCategoria(nota.categoria)}</td>
                <td className={`px-4 py-3 text-right font-bold ${corNota(nota.nota)}`}>{nota.nota}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Modal de gestão de notas ─────────────────────────────────────────────────

type ModalMode = "registrar" | "atualizar" | "deletar" | "categoria";

function ModalGestao({
  isOpen, onClose, isSuperior, tipoNota, PERIODOS, anoLectivo,
  estudantes, materias, categorias, onRegistrar, onAtualizar, onDeletar, onCriarCategoria,
}: {
  isOpen: boolean;
  onClose: () => void;
  isSuperior: boolean;
  tipoNota: TipoNota;
  PERIODOS: { label: string; value: string }[];
  anoLectivo: string;
  estudantes: EstudanteDetalhado[];
  materias: any[];
  categorias: any[];
  onRegistrar: (d: RegistrarNotasRequest) => Promise<void>;
  onAtualizar: (d: AtualizarNotaRequest) => Promise<void>;
  onDeletar: (notaId: string, motivo: string) => Promise<void>;
  onCriarCategoria: (d: CriarCategoriaNotaRequest) => Promise<void>;
}) {
  const [mode, setMode] = useState<ModalMode>("registrar");
  const [error, setError] = useState<string | null>(null);

  const [codigoEst, setCodigoEst] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [materiaId, setMateriaId] = useState("");
  const [categoria, setCategoria] = useState("");
  const [nota, setNota] = useState<number | "">("");
  const [obs, setObs] = useState("");

  const [estAtualizar, setEstAtualizar]       = useState("");
  const [notaId, setNotaId]                   = useState("");
  const [notaNova, setNotaNova]               = useState<number | "">("");
  const [obsAtualizar, setObsAtualizar]       = useState("");
  const [notasEstudante, setNotasEstudante]   = useState<Nota[]>([]);
  const { execute: carregarNotasEst }         = useApi(consultasService.notasEstudante);

  const [estDeletar, setEstDeletar]           = useState("");
  const [notaIdDeletar, setNotaIdDeletar]     = useState("");
  const [motivoDeletar, setMotivoDeletar]     = useState("");
  const [notasEstDeletar, setNotasEstDeletar] = useState<Nota[]>([]);
  const { execute: carregarNotasEstDeletar }  = useApi(consultasService.notasEstudante);

  const [nomeCateg, setNomeCateg] = useState("");
  const [descCateg, setDescCateg] = useState("");

  const CATS_FIXAS = isSuperior ? CATEGORIAS_FIXAS_SUPERIOR : CATEGORIAS_ESCOLAR;
  const todasCats  = [...CATS_FIXAS, ...categorias.map(c => ({ label: c.nome, value: c.nome }))];

  async function handleRegistrar(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!codigoEst || !periodo || !materiaId || !categoria || nota === "") {
      setError("Preencha todos os campos obrigatórios."); return;
    }
    const n = Number(nota);
    if (isNaN(n) || n < 0 || n > 20) { setError("Nota deve estar entre 0 e 20."); return; }
    try {
      await onRegistrar({
        codigo_estudante: codigoEst,
        periodo: periodo as any,
        materia_disciplinar_id: materiaId,
        tipo: tipoNota,
        categoria,
        nota: n,
        observacao: obs || undefined,
      });
      onClose();
    } catch (err: any) { setError(err?.message ?? "Erro ao registar nota."); }
  }

  async function handleSelecionarEstAtualizar(codigo: string) {
    setEstAtualizar(codigo); setNotaId(""); setNotaNova(""); setObsAtualizar("");
    const res = await carregarNotasEst(codigo);
    setNotasEstudante((res as any)?.notas ?? []);
  }

  async function handleAtualizar(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!notaId || notaNova === "" || !obsAtualizar) { setError("Preencha todos os campos."); return; }
    const n = Number(notaNova);
    if (isNaN(n) || n < 0 || n > 20) { setError("Nota deve estar entre 0 e 20."); return; }
    try {
      await onAtualizar({ id: notaId, nota_nova: n, observacao: obsAtualizar });
      onClose();
    } catch (err: any) { setError(err?.message ?? "Erro ao atualizar nota."); }
  }

  async function handleSelecionarEstDeletar(codigo: string) {
    setEstDeletar(codigo); setNotaIdDeletar(""); setMotivoDeletar("");
    const res = await carregarNotasEstDeletar(codigo);
    setNotasEstDeletar((res as any)?.notas ?? []);
  }

  async function handleDeletar(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!notaIdDeletar || !motivoDeletar.trim()) {
      setError("Selecione a nota e informe o motivo da exclusão."); return;
    }
    try {
      await onDeletar(notaIdDeletar, motivoDeletar);
      onClose();
    } catch (err: any) { setError(err?.message ?? "Erro ao excluir nota."); }
  }

  async function handleCriarCategoria(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!nomeCateg) { setError("Nome é obrigatório."); return; }
    const nome = nomeCateg.startsWith("nota_") ? nomeCateg : `nota_${nomeCateg}`;
    try { await onCriarCategoria({ nome, descricao: descCateg || undefined }); onClose(); }
    catch (err: any) { setError(err?.message ?? "Erro ao criar categoria."); }
  }

  if (!isOpen) return null;

  const TABS: { key: ModalMode; label: string }[] = [
    { key: "registrar", label: "Registar" },
    { key: "atualizar", label: "Atualizar" },
    { key: "deletar",   label: "Excluir" },
    ...(isSuperior ? [{ key: "categoria" as ModalMode, label: "Categorias" }] : []),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] p-5 lg:p-8">
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4 flex-wrap">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setMode(key); setError(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              mode === key
                ? key === "deletar" ? "bg-red-500 text-white" : "bg-brand-500 text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {mode === "registrar" && (
        <form onSubmit={handleRegistrar} className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">Registar Nota</h4>
          <div>
            <Label>Estudante *</Label>
            <Dropdown
              value={codigoEst}
              options={estudantes.map(e => ({ label: `${e.nome} (${e.codigo_estudante})`, value: e.codigo_estudante }))}
              onChange={e => setCodigoEst(e.value)}
              placeholder="Selecione"
              className="w-full"
              filter
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Período *</Label>
              <Dropdown
                value={periodo}
                options={PERIODOS}
                onChange={e => setPeriodo(e.value)}
                placeholder="Selecione"
                className="w-full"
              />
            </div>
            <div>
              <Label>Matéria *</Label>
              <Dropdown
                value={materiaId}
                options={materias.map(m => ({ label: m.nome, value: m.id }))}
                onChange={e => {
                  const id = e.value;
                  setMateriaId(id);
                  if (isSuperior) {
                    const mat = (materias as any[]).find((m: any) => m.id === id);
                    setPeriodo(mat?.periodo ?? "");
                  }
                }}
                placeholder="Selecione"
                className="w-full"
                filter
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria *</Label>
              <Dropdown
                value={categoria}
                options={todasCats}
                onChange={e => setCategoria(e.value)}
                placeholder="Selecione"
                className="w-full"
              />
            </div>
            <div>
              <Label>Nota (0–20) *</Label>
              <Input
                type="number"
                min="0"
                max="20"
                step={0.01}
                onChange={e => setNota(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Ex: 14"
              />
            </div>
          </div>
          <div>
            <Label>Observação</Label>
            <Input onChange={e => setObs(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <button type="submit" className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors">
              Registar
            </button>
          </div>
        </form>
      )}

      {mode === "atualizar" && (
        <form onSubmit={handleAtualizar} className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">Atualizar Nota</h4>
          <div>
            <Label>Estudante *</Label>
            <Dropdown
              value={estAtualizar}
              options={estudantes.map(e => ({ label: `${e.nome} (${e.codigo_estudante})`, value: e.codigo_estudante }))}
              onChange={e => handleSelecionarEstAtualizar(e.value)}
              placeholder="Selecione"
              className="w-full"
              filter
            />
          </div>
          {estAtualizar && (
            <div>
              <Label>Nota a atualizar *</Label>
              <Dropdown
                value={notaId}
                options={notasEstudante.map(n => ({
                  label: `${n.materia_nome ?? n.materia_disciplinar_id} · ${PERIODOS_LABEL[n.periodo] ?? n.periodo} · ${formatCategoria(n.categoria)} → ${n.nota}`,
                  value: n.id,
                }))}
                onChange={e => setNotaId(e.value)}
                placeholder="Selecione"
                className="w-full"
                filter
              />
            </div>
          )}
          <div>
            <Label>Nova nota (0–20) *</Label>
            <Input
              type="number"
              min="0"
              max="20"
              step={0.01}
              onChange={e => setNotaNova(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Ex: 14"
            />
          </div>
          <div>
            <Label>Justificação *</Label>
            <Input onChange={e => setObsAtualizar(e.target.value)} placeholder="Obrigatório" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <button type="submit" className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors">
              Atualizar
            </button>
          </div>
        </form>
      )}

      {mode === "deletar" && (
        <form onSubmit={handleDeletar} className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">Excluir Nota</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            A nota é removida da projeção mas permanece no ledger para auditoria.
          </p>
          <div>
            <Label>Estudante *</Label>
            <Dropdown
              value={estDeletar}
              options={estudantes.map(e => ({ label: `${e.nome} (${e.codigo_estudante})`, value: e.codigo_estudante }))}
              onChange={e => handleSelecionarEstDeletar(e.value)}
              placeholder="Selecione"
              className="w-full"
              filter
            />
          </div>
          {estDeletar && (
            <div>
              <Label>Nota a excluir *</Label>
              <Dropdown
                value={notaIdDeletar}
                options={notasEstDeletar.map(n => ({
                  label: `${n.materia_nome ?? n.materia_disciplinar_id} · ${PERIODOS_LABEL[n.periodo] ?? n.periodo} · ${formatCategoria(n.categoria)} → ${n.nota}`,
                  value: n.id,
                }))}
                onChange={e => setNotaIdDeletar(e.value)}
                placeholder="Selecione"
                className="w-full"
                filter
              />
            </div>
          )}
          <div>
            <Label>Motivo da exclusão *</Label>
            <Input
              onChange={e => setMotivoDeletar(e.target.value)}
              placeholder="Informe o motivo (obrigatório)"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <button
              type="submit"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Excluir Nota
            </button>
          </div>
        </form>
      )}

      {mode === "categoria" && (
        <form onSubmit={handleCriarCategoria} className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">Nova Categoria</h4>
          <div>
            <Label>Nome *</Label>
            <Input onChange={e => setNomeCateg(e.target.value)} placeholder="Ex: nota_trabalho" />
            <p className="text-xs text-gray-500 mt-1">Será prefixado com nota_ se necessário.</p>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input onChange={e => setDescCateg(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <button type="submit" className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors">
              Criar
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function NotasAcademia() {
  const [user] = useState<MeuPerfilResponse | null>(getUserFromCookie);
  const token = tokenStorage.get() ?? undefined;

  const academiaType  = user?.academia?.type ?? "escola";
  const nivelEscolar  = user?.academia?.nivel_escolar ?? "fundamental";
  const isFundamental = academiaType === "escola" && nivelEscolar === "fundamental";
  const isSuperior    = academiaType === "superior";
  const isMisto       = academiaType === "escola" && nivelEscolar === "misto";
  const tipoNota: TipoNota = isSuperior ? "superior" : "escolar";

  const PERIODOS = isSuperior ? PERIODOS_SUPERIOR : PERIODOS_ESCOLA;

  const initLayer = (): Layer => {
    if (isFundamental) return { mode: "fund", type: "anos" };
    if (isMisto)       return { mode: "misto", type: "choose" };
    return { mode: "sup", type: "cursos" };
  };
  const [layer, setLayer]   = useState<Layer>(initLayer);
  const [alert, setAlert]   = useState<{ variant: "success" | "error"; message: string } | null>(null);

  const { data: dataTurmas,     loading: loadingTurmas,     execute: carregarTurmas     } = useApi(academiaService.listarTurmas);
  const { data: dataCursos,                                  execute: carregarCursos     } = useApi(academiaService.listarCursos);
  const { data: dataEstudantes,                              execute: carregarEstudantes } = useApi(consultasService.listarEstudantes);
  const { data: dataMaterias,                                execute: carregarMaterias   } = useApi(academiaService.listarMaterias);
  const { data: dataCategorias,                              execute: carregarCategorias } = useApi(academiaService.listarCategoriasNota);
  const { data: dataAnoLetivo,                               execute: buscarAnoLetivo    } = useApi(academiaService.getAnoLetivo);

  const [notasCache, setNotasCache] = useState<Record<string, Nota[]>>({});
  const { isOpen, openModal, closeModal } = useModal();

  useEffect(() => {
    carregarTurmas(token);
    carregarCursos(token);
    carregarEstudantes(undefined, token);
    carregarMaterias(token);
    buscarAnoLetivo(token);
    if (isSuperior) carregarCategorias(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const turmas: Turma[] = useMemo(() => {
    const raw = dataTurmas as any;
    return raw?.turmas ?? [];
  }, [dataTurmas]);

  const cursos: Curso[]                  = useMemo(() => (dataCursos as any)?.cursos?.filter((c: any) => c.status === "ativo") ?? [], [dataCursos]);
  const estudantes: EstudanteDetalhado[] = useMemo(() => (dataEstudantes as any)?.estudantes ?? [], [dataEstudantes]);
  const materias                         = useMemo(() => (dataMaterias as any)?.materias?.filter((m: any) => m.status === "ativo") ?? [], [dataMaterias]);
  const categorias                       = useMemo(() => (dataCategorias as any)?.categorias ?? [], [dataCategorias]);
  const anoLectivo                       = (dataAnoLetivo as any)?.ano_letivo ?? "";
  const turmasAtivas: Turma[]            = useMemo(() => turmas.filter(turmaAtiva), [turmas]);

  function showAlert(variant: "success" | "error", message: string) {
    setAlert({ variant, message }); setTimeout(() => setAlert(null), 4000);
  }

  async function carregarNotasTurma(turma: Turma) {
    const codigos = turma.estudantes.filter(c => !notasCache[c]);
    if (codigos.length === 0) return;
    await Promise.all(codigos.map(async codigo => {
      try {
        const res = await consultasService.notasEstudante(codigo, token);
        setNotasCache(prev => ({ ...prev, [codigo]: (res as any)?.notas ?? [] }));
      } catch {}
    }));
  }

  // Retorna notas de uma turma num período (todas as matérias)
  function notasDaTurmaEmPeriodo(turma: Turma, periodo: string): Nota[] {
    return turma.estudantes.flatMap(codigo => {
      const notas = notasCache[codigo] ?? [];
      return notas.filter(n => {
        const matchPeriodo = n.periodo === periodo;
        const matchAno = anoLectivo ? n.ano_lectivo === anoLectivo : true;
        return matchPeriodo && matchAno;
      });
    });
  }

  // Retorna notas de uma turma num período filtradas por matéria
  function notasDaTurmaEmPeriodoEMateria(turma: Turma, periodo: string, materiaId: string): Nota[] {
    return turma.estudantes.flatMap(codigo => {
      const notas = notasCache[codigo] ?? [];
      return notas.filter(n => {
        const matchPeriodo = n.periodo === periodo;
        const matchAno = anoLectivo ? n.ano_lectivo === anoLectivo : true;
        const matchMateria = n.materia_disciplinar_id === materiaId;
        return matchPeriodo && matchAno && matchMateria;
      });
    });
  }

  // Retorna matérias para o contexto atual com contagem e média de notas
  function getMateriasPorContexto(
    nivel: string,
    turma: Turma,
    periodo: string,
    curso?: Curso
  ): { id: string; nome: string; notasCount: number; media: number | null }[] {
    const tipoNivel = nivel.includes("fundamental")
      ? "fundamental"
      : nivel.includes("medio")
      ? "medio"
      : "superior";

    const materiasContexto = (materias as any[]).filter((m: any) => {
      if (m.type !== tipoNivel) return false;
      if (tipoNivel === "fundamental") {
        return m.anos_academicos?.includes(nivel);
      }
      if (tipoNivel === "medio") {
        return turma.curso_id ? m.curso_id === turma.curso_id : m.anos_academicos?.includes(nivel);
      }
      // superior
      return curso ? m.curso_id === curso.id && m.periodo === periodo : false;
    });

    // Também inclui matérias com notas no cache mas não na lista (ex: matéria desativada)
    const notasPeriodo = notasDaTurmaEmPeriodo(turma, periodo);
    const materiasDeNotas = new Map<string, string>();
    notasPeriodo.forEach(n => {
      if (!materiasDeNotas.has(n.materia_disciplinar_id)) {
        materiasDeNotas.set(n.materia_disciplinar_id, n.materia_nome ?? n.materia_disciplinar_id);
      }
    });

    // Merge: lista de matérias do contexto + matérias encontradas em notas
    const merged = new Map<string, string>();
    materiasContexto.forEach((m: any) => merged.set(m.id, m.nome));
    materiasDeNotas.forEach((nome, id) => { if (!merged.has(id)) merged.set(id, nome); });

    return Array.from(merged.entries())
      .map(([id, nome]) => {
        const notasMateria = notasDaTurmaEmPeriodoEMateria(turma, periodo, id);
        return {
          id,
          nome,
          notasCount: notasMateria.length,
          media: calcMedia(notasMateria),
        };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  const turmasPorNivel = (nivel: string) => turmasAtivas.filter(t => t.nivel === nivel);
  const turmasPorCurso = (cursoId: string) => turmasAtivas.filter(t => t.curso_id === cursoId);
  const anosDosCurso = (c: Curso) => sortAnos(c.anos_academicos ?? []);

  const niveisFundamentais = useMemo(() => {
    const anosAcademia = user?.academia?.anos_academicos ?? [];
    const comTurmas = anosAcademia.filter(a =>
      a.includes("fundamental") && turmasAtivas.some(t => t.nivel === a)
    );
    return comTurmas.length > 0
      ? comTurmas
      : anosAcademia.filter(a => a.includes("fundamental"));
  }, [turmasAtivas, user]);

  async function handleRegistrar(d: RegistrarNotasRequest) {
    await academiaService.registrarNota(d, token);
    showAlert("success", "Nota registada com sucesso.");
  }

  async function handleAtualizar(d: AtualizarNotaRequest) {
    await academiaService.atualizarNota(d, token);
    showAlert("success", "Nota atualizada com sucesso.");
  }

  async function handleDeletar(notaId: string, motivo: string) {
    await academiaService.deletarNota(notaId, motivo, token);
    setNotasCache(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(codigo => {
        next[codigo] = (next[codigo] ?? []).filter(n => n.id !== notaId);
      });
      return next;
    });
    showAlert("success", "Nota excluída com sucesso.");
  }

  async function handleCriarCategoria(d: CriarCategoriaNotaRequest) {
    await academiaService.criarCategoriaNota(d, token);
    carregarCategorias(token);
    showAlert("success", "Categoria criada.");
  }

  // ─── Breadcrumbs ─────────────────────────────────────────────────────────────

  function buildCrumbs(): { label: string; onClick?: () => void }[] {
    const goInicio = () => setLayer({ mode: "misto", type: "choose" });

    if (layer.mode === "fund") {
      const goAnos = () => setLayer({ mode: "fund", type: "anos" });
      const anosCrumb = { label: isMisto ? "Fundamental" : "Anos", onClick: goAnos };
      const base = isMisto ? [{ label: "Início", onClick: goInicio }, anosCrumb] : [anosCrumb];

      if (layer.type === "anos") return base;

      if (layer.type === "turmas") return [
        ...base,
        { label: labelNivel(layer.nivel, true), onClick: () => setLayer({ mode: "fund", type: "turmas", nivel: layer.nivel }) },
      ];

      if (layer.type === "periodos") return [
        ...base,
        { label: labelNivel(layer.nivel, true), onClick: () => setLayer({ mode: "fund", type: "turmas", nivel: layer.nivel }) },
        { label: layer.turma.codigo_turma },
      ];

      if (layer.type === "materias") return [
        ...base,
        { label: labelNivel(layer.nivel, true), onClick: () => setLayer({ mode: "fund", type: "turmas", nivel: layer.nivel }) },
        { label: layer.turma.codigo_turma, onClick: () => setLayer({ mode: "fund", type: "periodos", nivel: layer.nivel, turma: layer.turma }) },
        { label: PERIODOS_LABEL[layer.periodo] ?? layer.periodo },
      ];

      if (layer.type === "notas") return [
        ...base,
        { label: labelNivel(layer.nivel, true), onClick: () => setLayer({ mode: "fund", type: "turmas", nivel: layer.nivel }) },
        { label: layer.turma.codigo_turma, onClick: () => setLayer({ mode: "fund", type: "periodos", nivel: layer.nivel, turma: layer.turma }) },
        { label: PERIODOS_LABEL[layer.periodo] ?? layer.periodo, onClick: () => setLayer({ mode: "fund", type: "materias", nivel: layer.nivel, turma: layer.turma, periodo: layer.periodo }) },
        { label: layer.materiaNome },
      ];
    }

    if (layer.mode === "sup") {
      const goCursos = () => setLayer({ mode: "sup", type: "cursos" });
      const cursosCrumb = { label: isMisto ? "Médio" : "Cursos", onClick: goCursos };
      const base = isMisto ? [{ label: "Início", onClick: goInicio }, cursosCrumb] : [cursosCrumb];
      const l = layer as any;

      if (layer.type === "cursos") return base;

      if (layer.type === "anos") return [
        ...base,
        { label: l.curso.nome },
      ];

      if (layer.type === "turmas") return [
        ...base,
        { label: l.curso.nome, onClick: () => setLayer({ mode: "sup", type: "anos", curso: l.curso }) },
        { label: labelNivel(l.nivel) },
      ];

      if (layer.type === "periodos") return [
        ...base,
        { label: l.curso.nome, onClick: () => setLayer({ mode: "sup", type: "anos", curso: l.curso }) },
        { label: labelNivel(l.nivel), onClick: () => setLayer({ mode: "sup", type: "turmas", curso: l.curso, nivel: l.nivel }) },
        { label: l.turma.codigo_turma },
      ];

      if (layer.type === "materias") return [
        ...base,
        { label: l.curso.nome, onClick: () => setLayer({ mode: "sup", type: "anos", curso: l.curso }) },
        { label: labelNivel(l.nivel), onClick: () => setLayer({ mode: "sup", type: "turmas", curso: l.curso, nivel: l.nivel }) },
        { label: l.turma.codigo_turma, onClick: () => setLayer({ mode: "sup", type: "periodos", curso: l.curso, nivel: l.nivel, turma: l.turma }) },
        { label: PERIODOS_LABEL[l.periodo] ?? l.periodo },
      ];

      if (layer.type === "notas") return [
        ...base,
        { label: l.curso.nome, onClick: () => setLayer({ mode: "sup", type: "anos", curso: l.curso }) },
        { label: labelNivel(l.nivel), onClick: () => setLayer({ mode: "sup", type: "turmas", curso: l.curso, nivel: l.nivel }) },
        { label: l.turma.codigo_turma, onClick: () => setLayer({ mode: "sup", type: "periodos", curso: l.curso, nivel: l.nivel, turma: l.turma }) },
        { label: PERIODOS_LABEL[l.periodo] ?? l.periodo, onClick: () => setLayer({ mode: "sup", type: "materias", curso: l.curso, nivel: l.nivel, turma: l.turma, periodo: l.periodo }) },
        { label: l.materiaNome },
      ];
    }

    if (layer.mode === "misto" && layer.type === "choose") return [{ label: "Início" }];
    return [];
  }

  // ─── renderLayer ─────────────────────────────────────────────────────────────

  function renderLayer() {
    const crumbs = buildCrumbs();

    if (loadingTurmas) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Carregando turmas...</p>
          </div>
        </div>
      );
    }

    // ── Misto: escolha ──
    if (layer.mode === "misto" && layer.type === "choose") return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notas</h2>
          <p className="text-sm text-gray-500 mt-1">Selecione o nível de ensino</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CardBtn icon="mdi:school" title="Ensino Fundamental" subtitle="1º ao 9º Ano" onClick={() => setLayer({ mode: "fund", type: "anos" })} />
          <CardBtn icon="mdi:book-education" title="Ensino Médio" subtitle="1º ao 4º Médio" onClick={() => setLayer({ mode: "sup", type: "cursos" })} />
        </div>
      </div>
    );

    // ── Fundamental: anos ──
    if (layer.mode === "fund" && layer.type === "anos") return (
      <div className="space-y-4">
        <Breadcrumb crumbs={crumbs} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Anos Académicos — Ensino Fundamental</h2>
        {niveisFundamentais.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Icon icon="mdi:school-outline" width={48} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum nível fundamental configurado nesta academia.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {niveisFundamentais.map(nivel => {
              const ts = turmasPorNivel(nivel);
              return (
                <CardBtn
                  key={nivel}
                  icon="mdi:numeric"
                  title={labelNivel(nivel)}
                  subtitle={`${ts.length} turma(s) ativa(s)`}
                  onClick={() => setLayer({ mode: "fund", type: "turmas", nivel })}
                />
              );
            })}
          </div>
        )}
      </div>
    );

    // ── Fundamental: turmas ──
    if (layer.mode === "fund" && layer.type === "turmas") {
      const ts = turmasPorNivel(layer.nivel);
      return (
        <div className="space-y-4">
          <Breadcrumb crumbs={crumbs} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labelNivel(layer.nivel, true)}</h2>
          {ts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Icon icon="mdi:account-group-outline" width={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma turma ativa para este nível.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {ts.map(t => (
                <CardBtn
                  key={t.id ?? t.codigo_turma}
                  icon="mdi:account-group"
                  title={t.codigo_turma}
                  subtitle={`${t.estudantes.length} estudante(s) · ${t.turno}`}
                  onClick={() => setLayer({ mode: "fund", type: "periodos", nivel: layer.nivel, turma: t })}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    // ── Fundamental: períodos ──
    if (layer.mode === "fund" && layer.type === "periodos") {
      const { nivel, turma } = layer;
      return (
        <div className="space-y-4">
          <Breadcrumb crumbs={crumbs} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Turma {turma.codigo_turma}</h2>
          <p className="text-sm text-gray-500">{labelNivel(nivel, true)}</p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {PERIODOS_ESCOLA.map(p => (
              <CardBtn
                key={p.value}
                icon="mdi:clipboard-text-clock-outline"
                title={p.label}
                subtitle="Ver matérias"
                onClick={async () => {
                  await carregarNotasTurma(turma);
                  setLayer({ mode: "fund", type: "materias", nivel, turma, periodo: p.value });
                }}
              />
            ))}
          </div>
        </div>
      );
    }

    // ── Fundamental: matérias ──
    if (layer.mode === "fund" && layer.type === "materias") {
      const { nivel, turma, periodo } = layer;
      const materiasContexto = getMateriasPorContexto(nivel, turma, periodo);
      return (
        <div className="space-y-4">
          <Breadcrumb crumbs={crumbs} />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {PERIODOS_LABEL[periodo] ?? periodo} — Matérias
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Turma {turma.codigo_turma} · {labelNivel(nivel, true)}
            </p>
          </div>
          {materiasContexto.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Icon icon="mdi:book-outline" width={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma matéria encontrada para este período.</p>
              <p className="text-xs mt-1 text-gray-300 dark:text-gray-600">
                Crie matérias do tipo fundamental para este ano académico.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {materiasContexto.map(m => (
                <CardBtn
                  key={m.id}
                  icon="mdi:book-open-variant"
                  title={m.nome}
                  subtitle={
                    m.notasCount > 0
                      ? `${m.notasCount} nota(s)${m.media !== null ? ` · Média ${m.media.toFixed(1)}` : ""}`
                      : "Sem notas registadas"
                  }
                  badge={m.notasCount === 0 ? "vazia" : undefined}
                  onClick={() =>
                    setLayer({
                      mode: "fund",
                      type: "notas",
                      nivel,
                      turma,
                      periodo,
                      materiaId: m.id,
                      materiaNome: m.nome,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    // ── Fundamental: notas ──
    if (layer.mode === "fund" && layer.type === "notas") {
      const { nivel, turma, periodo, materiaId, materiaNome } = layer;
      const notas = notasDaTurmaEmPeriodoEMateria(turma, periodo, materiaId);
      return (
        <div className="space-y-4">
          <Breadcrumb crumbs={crumbs} />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{materiaNome}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {PERIODOS_LABEL[periodo]} · Turma {turma.codigo_turma} · {labelNivel(nivel, true)}
            </p>
          </div>
          {notas.length > 0 && <StatsRow notas={notas} label="Notas registadas" />}
          <TabelaNotasTurma notas={notas} estudantes={estudantes} />
        </div>
      );
    }

    // ── Superior: cursos ──
    if (layer.mode === "sup" && layer.type === "cursos") return (
      <div className="space-y-4">
        <Breadcrumb crumbs={crumbs} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cursos</h2>
        {cursos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Icon icon="mdi:book-open-outline" width={48} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum curso ativo.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {cursos.map(c => (
              <CardBtn
                key={c.id}
                icon="mdi:book-open-variant"
                title={c.nome}
                subtitle={`${c.anos_academicos?.length ?? 0} ano(s)`}
                onClick={() => setLayer({ mode: "sup", type: "anos", curso: c })}
              />
            ))}
          </div>
        )}
      </div>
    );

    // ── Superior: anos ──
    if (layer.mode === "sup" && layer.type === "anos") {
      const { curso } = layer as { mode: "sup"; type: "anos"; curso: Curso };
      const anos = anosDosCurso(curso);
      return (
        <div className="space-y-4">
          <Breadcrumb crumbs={crumbs} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{curso.nome}</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {anos.map(nivel => {
              const ts = turmasPorCurso(curso.id).filter(t => t.nivel === nivel);
              return (
                <CardBtn
                  key={nivel}
                  icon="mdi:calendar-school"
                  title={labelNivel(nivel)}
                  subtitle={`${ts.length} turma(s)`}
                  onClick={() => setLayer({ mode: "sup", type: "turmas", curso, nivel })}
                />
              );
            })}
          </div>
        </div>
      );
    }

    // ── Superior: turmas ──
    if (layer.mode === "sup" && layer.type === "turmas") {
      const { curso, nivel } = layer as { mode: "sup"; type: "turmas"; curso: Curso; nivel: string };
      const ts = turmasPorCurso(curso.id).filter(t => t.nivel === nivel);
      return (
        <div className="space-y-4">
          <Breadcrumb crumbs={crumbs} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labelNivel(nivel)}</h2>
          {ts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Icon icon="mdi:account-group-outline" width={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma turma ativa para este nível neste curso.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {ts.map(t => (
                <CardBtn
                  key={t.id ?? t.codigo_turma}
                  icon="mdi:account-group"
                  title={t.codigo_turma}
                  subtitle={`${t.estudantes.length} estudante(s)`}
                  onClick={() => setLayer({ mode: "sup", type: "periodos", curso, nivel, turma: t })}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    // ── Superior: períodos ──
    if (layer.mode === "sup" && layer.type === "periodos") {
      const { curso, nivel, turma } = layer as any;
      return (
        <div className="space-y-4">
          <Breadcrumb crumbs={crumbs} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Turma {turma.codigo_turma}</h2>
          <p className="text-sm text-gray-500">{labelNivel(nivel)} · {curso.nome}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PERIODOS.map(p => (
              <CardBtn
                key={p.value}
                icon="mdi:clipboard-text-clock-outline"
                title={p.label}
                subtitle="Ver matérias"
                onClick={async () => {
                  await carregarNotasTurma(turma);
                  setLayer({ mode: "sup", type: "materias", curso, nivel, turma, periodo: p.value });
                }}
              />
            ))}
          </div>
        </div>
      );
    }

    // ── Superior: matérias ──
    if (layer.mode === "sup" && layer.type === "materias") {
      const { curso, nivel, turma, periodo } = layer as any;
      const materiasContexto = getMateriasPorContexto(nivel, turma, periodo, curso);
      return (
        <div className="space-y-4">
          <Breadcrumb crumbs={crumbs} />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {PERIODOS_LABEL[periodo] ?? periodo} — Matérias
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Turma {turma.codigo_turma} · {labelNivel(nivel)} · {curso.nome}
            </p>
          </div>
          {materiasContexto.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Icon icon="mdi:book-outline" width={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma matéria encontrada para este período.</p>
              <p className="text-xs mt-1 text-gray-300 dark:text-gray-600">
                Crie matérias do tipo superior com o período correto.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {materiasContexto.map(m => (
                <CardBtn
                  key={m.id}
                  icon="mdi:book-open-variant"
                  title={m.nome}
                  subtitle={
                    m.notasCount > 0
                      ? `${m.notasCount} nota(s)${m.media !== null ? ` · Média ${m.media.toFixed(1)}` : ""}`
                      : "Sem notas registadas"
                  }
                  badge={m.notasCount === 0 ? "vazia" : undefined}
                  onClick={() =>
                    setLayer({
                      mode: "sup",
                      type: "notas",
                      curso,
                      nivel,
                      turma,
                      periodo,
                      materiaId: m.id,
                      materiaNome: m.nome,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    // ── Superior: notas ──
    if (layer.mode === "sup" && layer.type === "notas") {
      const { curso, nivel, turma, periodo, materiaId, materiaNome } = layer as any;
      const notas = notasDaTurmaEmPeriodoEMateria(turma, periodo, materiaId);
      return (
        <div className="space-y-4">
          <Breadcrumb crumbs={crumbs} />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{materiaNome}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {PERIODOS_LABEL[periodo]} · Turma {turma.codigo_turma} · {curso.nome} · {labelNivel(nivel)}
            </p>
          </div>
          {notas.length > 0 && <StatsRow notas={notas} label="Notas registadas" />}
          <TabelaNotasTurma notas={notas} estudantes={estudantes} />
        </div>
      );
    }

    return null;
  }

  return (
    <div className="space-y-6">
      {alert && (
        <Alert
          variant={alert.variant}
          title={alert.variant === "success" ? "Sucesso" : "Erro"}
          message={alert.message}
        />
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Notas</h2>
          {turmas.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {turmasAtivas.length} turma(s) ativa(s) · {estudantes.length} estudante(s)
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {isSuperior && (
            <Button
              size="sm"
              variant="outline"
              startIcon={<Icon icon="mdi:tag-plus-outline" />}
              onClick={openModal}
            >
              Categoria
            </Button>
          )}
          <Button size="sm" startIcon={<Icon icon="mdi:plus" />} onClick={openModal}>
            Nova Nota
          </Button>
        </div>
      </div>

      {renderLayer()}

      <ModalGestao
        isOpen={isOpen}
        onClose={closeModal}
        isSuperior={isSuperior}
        tipoNota={tipoNota}
        PERIODOS={PERIODOS}
        anoLectivo={anoLectivo}
        estudantes={estudantes}
        materias={materias}
        categorias={categorias}
        onRegistrar={handleRegistrar}
        onAtualizar={handleAtualizar}
        onDeletar={handleDeletar}
        onCriarCategoria={handleCriarCategoria}
      />
    </div>
  );
}