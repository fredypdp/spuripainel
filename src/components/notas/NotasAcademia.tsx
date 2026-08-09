// src/components/notas/NotasAcademia.tsx
"use client"
import { useState, useEffect, useMemo } from "react";
import { useApi, academiaService, consultasService, tokenStorage } from "@/lib/api";
import { listarTodosEstudantes } from "@/lib/api/pagination";
import type {
  MeuPerfilResponse, Nota, Turma, EstudanteDetalhado, Curso,
  TipoNota, RegistrarNotasRequest, CriarCategoriaNotaRequest, CategoriaNotaItem,
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


const ORDEM_ANOS_ACADEMICOS = [
  ...Array.from({ length: 9 }, (_, i) => `${i + 1}_ano_fundamental`),
  ...Array.from({ length: 4 }, (_, i) => `${i + 1}_ano_medio`),
  ...Array.from({ length: 6 }, (_, i) => `${i + 1}_ano_superior`),
];

function labelAnoAcademico(ano: string) {
  const [numero, , nivel] = ano.split("_");
  return `${numero}.º ${nivel === "fundamental" ? "Fundamental" : nivel === "medio" ? "Médio" : "Superior"}`;
}

function sortAnosAcademicos(anos: string[]) {
  return [...new Set(anos)].sort((a, b) => ORDEM_ANOS_ACADEMICOS.indexOf(a) - ORDEM_ANOS_ACADEMICOS.indexOf(b));
}

function sequenciaAnos(anos: string[], sufixo: string) {
  const nums = anos.map((ano) => Number(ano.split("_")[0])).filter(Boolean);
  if (!nums.length) return [];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return Array.from({ length: max - min + 1 }, (_, i) => `${min + i}_ano_${sufixo}`);
}

function anoAcademicoDoEstudante(estudante?: EstudanteDetalhado) {
  return estudante?.ano_superior || estudante?.ano_escolar_medio || estudante?.ano_escolar_fundamental || (estudante as any)?.ano_academico;
}

const PERIODOS_LABEL: Record<string, string> = {
  "1_trimestre": "1º Trimestre", "2_trimestre": "2º Trimestre", "3_trimestre": "3º Trimestre",
  "1_semestre":  "1º Semestre",  "2_semestre":  "2º Semestre",
};

const PERIODOS_ESCOLA   = [
  { label: "1º Trimestre", value: "1_trimestre" },
  { label: "2º Trimestre", value: "2_trimestre" },
  { label: "3º Trimestre", value: "3_trimestre" },
];
const PERIODOS_SUPERIOR = [
  { label: "1º Semestre", value: "1_semestre" },
  { label: "2º Semestre", value: "2_semestre" },
];

const ANOS_COM_NOTAS_REGULARES = [
  "1_ano_fundamental", "2_ano_fundamental", "3_ano_fundamental", "4_ano_fundamental",
  "5_ano_fundamental", "6_ano_fundamental", "7_ano_fundamental", "8_ano_fundamental",
  "9_ano_fundamental", "1_ano_medio", "2_ano_medio", "3_ano_medio",
];
const ANOS_COM_EXAME = ["6_ano_fundamental", "9_ano_fundamental", "3_ano_medio"];
const CATEGORIAS_ESCOLAR = [
  { label: "Nota do professor", value: "nota_professor", anos_academicos: ANOS_COM_NOTAS_REGULARES },
  { label: "Prova do trimestre", value: "prova_trimestral", anos_academicos: ANOS_COM_NOTAS_REGULARES },
  { label: "Exame final", value: "exame_final", anos_academicos: ANOS_COM_EXAME },
  { label: "Exame de recurso", value: "exame_recurso", anos_academicos: ANOS_COM_EXAME },
  { label: "Prova de Aptidão Profissional", value: "nota_pap", anos_academicos: ["4_ano_medio"] },
];

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
    const ia = ORDEM_ANOS.indexOf(a);
    const ib = ORDEM_ANOS.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

function labelNivel(v: string): string {
  const match = v.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!match) return v.replace(/_/g, " ");
  const [, n, tipo] = match;
  if (tipo === "fundamental") return `${n}º Ano do Ensino Fundamental`;
  if (tipo === "medio")       return `${n}º Ano do Ensino Médio`;
  return `${n}º Ano Superior`;
}

function notaText(n?: number | null): string {
  return n == null || n === 0 ? "" : String(n);
}


function tituloCorrecaoNota(nota: Nota): string | undefined {
  if (!nota.corrigido_em) return undefined;
  const anterior = nota.valor_anterior ?? "—";
  const motivo = nota.motivo_correcao ? ` Motivo: ${nota.motivo_correcao}` : "";
  return `Corrigido em ${nota.corrigido_em}: ${anterior} → ${nota.nota}.${motivo}`;
}

function NotaCorrigidaBadge({ nota }: { nota: Nota }) {
  if (!nota.corrigido_em) return null;
  return <Icon icon="mdi:pencil-circle" width={14} className="ml-1 inline text-brand-500" />;
}

function corNota(n: number): string {
  if (n >= 14) return "text-emerald-600 dark:text-emerald-400";
  if (n >= 10) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function formatCategoria(c: string): string {
  const m: Record<string, string> = {
    nota_professor: "Nota do professor",
    prova_trimestral: "Prova do trimestre",
    exame_final: "Exame final",
    exame_recurso: "Exame de recurso",
    nota_pap: "Prova de Aptidão Profissional",
  };
  return m[c] ?? c.replace(/^nota_/, "").replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function turmaAtiva(turma: Turma): boolean {
  const s = turma.status ?? "";
  return s !== "inativo" && s !== "deletado";
}

function normCodigoEstudante(codigo: string): string {
  return (codigo ?? "").trim().toLowerCase();
}

function exibirCodigoEstudante(codigo: string): string {
  return (codigo ?? "").trim().toUpperCase();
}

function nomeEstudante(estudante: EstudanteDetalhado | undefined, notas: Nota[], codigo: string): string {
  const nome = estudante?.nome?.trim() || notas.find(n => n.estudante_nome?.trim())?.estudante_nome?.trim();
  return nome || exibirCodigoEstudante(codigo);
}

function categoriasEscolaresDoAno(anoAcademico: string, notas: Nota[]): string[] {
  const categoriasFixas = CATEGORIAS_ESCOLAR
    .filter(cat => cat.anos_academicos.includes(anoAcademico))
    .map(cat => cat.value);
  return Array.from(new Set([...categoriasFixas, ...notas.map(n => n.categoria)]));
}

function categoriasSuperioresDoAno(anoAcademico: string, notas: Nota[], categorias: CategoriaNotaItem[]): string[] {
  const categoriasConfiguradas = categorias
    .filter(cat => cat.status !== "inativo")
    .filter(cat => {
      const anos = cat.anos_academicos ?? [];
      return anos.length === 0 || anos.includes(anoAcademico);
    })
    .map(cat => cat.codigo);
  return Array.from(new Set([...categoriasConfiguradas, ...notas.map(n => n.categoria)]))
    .sort((a, b) => formatCategoria(a).localeCompare(formatCategoria(b), "pt", { sensitivity: "base" }));
}

function categoriasParaConsulta(anoAcademico: string, superior: boolean, categorias: CategoriaNotaItem[]): string[] {
  return superior
    ? categoriasSuperioresDoAno(anoAcademico, [], categorias)
    : categoriasEscolaresDoAno(anoAcademico, []);
}

function nomeCategoria(codigo: string, categorias: CategoriaNotaItem[]): string {
  return categorias.find(cat => cat.codigo === codigo)?.nome ?? formatCategoria(codigo);
}

// ─── tipos de layer ───────────────────────────────────────────────────────────
// Fluxo: anos → turmas → periodos → notas (com seletor de matéria inline)

type LayerFund =
  | { mode: "fund"; type: "anos" }
  | { mode: "fund"; type: "turmas"; nivel: string }
  | { mode: "fund"; type: "periodos"; nivel: string; turma: Turma }
  | { mode: "fund"; type: "notas";   nivel: string; turma: Turma; periodo: string };

type LayerSup =
  | { mode: "sup"; type: "cursos" }
  | { mode: "sup"; type: "anos";    curso: Curso }
  | { mode: "sup"; type: "turmas";  curso: Curso; nivel: string }
  | { mode: "sup"; type: "periodos"; curso: Curso; nivel: string; turma: Turma }
  | { mode: "sup"; type: "notas";   curso: Curso; nivel: string; turma: Turma; periodo: string };

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

// ─── Tabela escolar ───────────────────────────────────────────────────────────

function TabelaNotasEscolar({
  notas,
  estudantes,
  codigosTurma,
  anoAcademico,
  onCorrigir,
}: {
  notas: Nota[];
  estudantes: EstudanteDetalhado[];
  codigosTurma: string[];
  anoAcademico: string;
  onCorrigir: (nota: Nota) => void;
}) {
  const categoriasOrdem = categoriasEscolaresDoAno(anoAcademico, notas);

  if (codigosTurma.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Icon icon="mdi:notebook-outline" width={40} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nenhum estudante encontrado nesta turma.</p>
      </div>
    );
  }

  const porEstudante = new Map<string, Nota[]>();
  notas.forEach(n => {
    const k = normCodigoEstudante(n.codigo_estudante);
    if (!porEstudante.has(k)) porEstudante.set(k, []);
    porEstudante.get(k)!.push(n);
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm min-w-[500px]">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Nome do Estudante</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Código do Estudante</th>
            {categoriasOrdem.map((cat) => (
              <th key={cat} className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">{formatCategoria(cat)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {[...codigosTurma]
            .map(codigo => {
              const notasEst = porEstudante.get(codigo) ?? [];
              const est      = estudantes.find(e => normCodigoEstudante(e.codigo_estudante) === codigo);
              return {
                codigo,
                nome: nomeEstudante(est, notasEst, codigo),
                notasEst,
              };
            })
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" }))
            .map(({ codigo, nome, notasEst }) => (
              <tr
                key={codigo}
                className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {nome}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                  {exibirCodigoEstudante(codigo)}
                </td>
                {categoriasOrdem.map((cat) => {
                  const notaCat = notasEst.find(n => n.categoria === cat);
                  return (
                    <td key={cat} className={`px-4 py-3 text-right font-bold ${notaCat ? corNota(notaCat.nota) : "text-gray-300 dark:text-gray-600"}`}>
                      {notaCat ? (
                        <button type="button" onClick={() => onCorrigir(notaCat)} title={tituloCorrecaoNota(notaCat) ?? "Corrigir nota"} className="inline-flex items-center justify-end rounded px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700">
                          {notaText(notaCat.nota)}<NotaCorrigidaBadge nota={notaCat} />
                        </button>
                      ) : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tabela superior ──────────────────────────────────────────────────────────

function TabelaNotasSuperior({
  notas,
  estudantes,
  codigosTurma,
  anoAcademico,
  categorias,
  onCorrigir,
}: {
  notas: Nota[];
  estudantes: EstudanteDetalhado[];
  codigosTurma: string[];
  anoAcademico: string;
  categorias: CategoriaNotaItem[];
  onCorrigir: (nota: Nota) => void;
}) {
  const categoriasOrdem = categoriasSuperioresDoAno(anoAcademico, notas, categorias);

  if (codigosTurma.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Icon icon="mdi:notebook-outline" width={40} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nenhum estudante encontrado nesta turma.</p>
      </div>
    );
  }

  const porEstudante = new Map<string, Nota[]>();
  notas.forEach(n => {
    const k = normCodigoEstudante(n.codigo_estudante);
    if (!porEstudante.has(k)) porEstudante.set(k, []);
    porEstudante.get(k)!.push(n);
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm min-w-[600px]">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Nome do Estudante</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Código do Estudante</th>
            {categoriasOrdem.map((cat) => (
              <th key={cat} className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">{nomeCategoria(cat, categorias)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {[...codigosTurma]
            .map(codigo => {
              const notasEst = porEstudante.get(codigo) ?? [];
              const est = estudantes.find(e => normCodigoEstudante(e.codigo_estudante) === codigo);
              return { codigo, nome: nomeEstudante(est, notasEst, codigo), notasEst };
            })
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" }))
            .map(({ codigo, nome, notasEst }) => (
              <tr key={codigo} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{nome}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{exibirCodigoEstudante(codigo)}</td>
                {categoriasOrdem.map((cat) => {
                  const notaCat = notasEst.find(n => n.categoria === cat);
                  return <td key={cat} className={`px-4 py-3 text-right font-bold ${notaCat ? corNota(notaCat.nota) : "text-gray-300 dark:text-gray-600"}`}>{notaCat ? <button type="button" onClick={() => onCorrigir(notaCat)} title={tituloCorrecaoNota(notaCat) ?? "Corrigir nota"} className="inline-flex items-center justify-end rounded px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700">{notaText(notaCat.nota)}<NotaCorrigidaBadge nota={notaCat} /></button> : ""}</td>;
                })}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Modal de gestão de notas ─────────────────────────────────────────────────

type ModalMode = "registrar" | "categoria";

function ModalGestao({
  isOpen, onClose, isSuperior, tipoNota, PERIODOS, anoLectivo,
  estudantes, materias, categorias, anosAcademicosDisponiveis, onRegistrar, onCriarCategoria,
}: {
  isOpen: boolean;
  onClose: () => void;
  isSuperior: boolean;
  tipoNota: TipoNota;
  PERIODOS: { label: string; value: string }[];
  anoLectivo: string;
  estudantes: EstudanteDetalhado[];
  materias: any[];
  categorias: CategoriaNotaItem[];
  anosAcademicosDisponiveis: string[];
  onRegistrar: (d: RegistrarNotasRequest) => Promise<void>;
  onCriarCategoria: (d: CriarCategoriaNotaRequest) => Promise<void>;
}) {
  const [mode, setMode]     = useState<ModalMode>("registrar");
  const [error, setError]   = useState<string | null>(null);

  const [codigoEst, setCodigoEst]   = useState("");
  const [periodo, setPeriodo]       = useState("");
  const [materiaId, setMateriaId]   = useState("");
  const [categoria, setCategoria]   = useState("");
  const [nota, setNota]             = useState<number | "">("");
  const [obs, setObs]               = useState("");

  const [nomeCateg, setNomeCateg] = useState("");
  const [descCateg, setDescCateg] = useState("");
  const [anosCateg, setAnosCateg] = useState<Set<string>>(new Set());

  const CATS_FIXAS = isSuperior ? [] : CATEGORIAS_ESCOLAR;
  const anoSelecionado = anoAcademicoDoEstudante(estudantes.find((estudante) => normCodigoEstudante(estudante.codigo_estudante) === normCodigoEstudante(codigoEst)));
  const todasCatsBase  = [
    ...CATS_FIXAS,
    ...categorias
      .filter((c: any) => c.status !== "inativo")
      .map((c: any) => ({ label: c.nome, value: c.codigo, anos_academicos: c.anos_academicos ?? [] })),
  ];
  const todasCats = todasCatsBase.filter((cat: any) => !cat.anos_academicos?.length || !anoSelecionado || cat.anos_academicos.includes(anoSelecionado));


  async function handleRegistrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!codigoEst || !periodo || !materiaId || !categoria || nota === "") {
      setError("Preencha os campos obrigatórios.");
      return;
    }
    const n = Number(nota);
    if (Number.isNaN(n) || n < 0 || n > 20) {
      setError("A nota deve estar entre 0 e 20.");
      return;
    }
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
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível registar a nota.");
    }
  }
  async function handleCriarCategoria(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!nomeCateg) { setError("Nome é obrigatório."); return; }
    if (anosCateg.size === 0) { setError("Selecione ao menos um ano acadêmico."); return; }
    const codigoBase = nomeCateg
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const codigo = codigoBase.startsWith("nota_") ? codigoBase : `nota_${codigoBase}`;
    try { await onCriarCategoria({ codigo, nome: nomeCateg.trim(), descricao: descCateg || undefined, anos_academicos: sortAnosAcademicos([...anosCateg]) }); onClose(); }
    catch (err: any) { setError(err?.message ?? "Erro ao criar categoria."); }
  }

  function toggleAnoCategoria(ano: string) {
    setAnosCateg((prev) => {
      const next = new Set(prev);
      next.has(ano) ? next.delete(ano) : next.add(ano);
      return next;
    });
  }

  if (!isOpen) return null;

  const TABS: { key: ModalMode; label: string }[] = [
    { key: "registrar", label: "Registar" },
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
                ? "bg-brand-500 text-white"
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
                options={materias.map((m: any) => ({ label: m.nome, value: m.id }))}
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
              {anoSelecionado && <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Categorias filtradas para {labelAnoAcademico(anoSelecionado)}.</p>}
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
            <button
              type="submit"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
            >
              Registar
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
          <div>
            <Label>Anos acadêmicos *</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {anosAcademicosDisponiveis.map((ano) => (
                <button key={ano} type="button" onClick={() => toggleAnoCategoria(ano)} className={`rounded-full border px-3 py-1.5 text-xs transition ${anosCateg.has(ano) ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 text-gray-600 hover:border-brand-300 dark:border-gray-700 dark:text-gray-300"}`}>
                  {labelAnoAcademico(ano)}
                </button>
              ))}
              {anosAcademicosDisponiveis.length === 0 && <p className="text-xs text-gray-500">Nenhum ano acadêmico ativo encontrado.</p>}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <button
              type="submit"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
            >
              Criar
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}


function ModalCorrigirNota({ nota, isOpen, onClose, onConfirm }: { nota: Nota | null; isOpen: boolean; onClose: () => void; onConfirm: (id: string, data: { nota: number; observacao?: string; motivo: string }) => Promise<void>; }) {
  const [valor, setValor] = useState<number | "">("");
  const [observacao, setObservacao] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!nota || !isOpen) return;
    setValor(nota.nota);
    setObservacao(nota.observacao ?? "");
    setMotivo("");
    setError(null);
  }, [nota, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nota) return;
    setError(null);
    const n = Number(valor);
    if (valor === "" || Number.isNaN(n) || n < 0 || n > 20) { setError("A nota deve estar entre 0 e 20."); return; }
    if (!motivo.trim()) { setError("Informe o motivo da correção."); return; }
    setLoading(true);
    try {
      await onConfirm(nota.id, { nota: n, observacao: observacao || undefined, motivo: motivo.trim() });
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível corrigir a nota.");
    } finally { setLoading(false); }
  }

  if (!isOpen || !nota) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[520px] p-5 lg:p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h4 className="font-semibold text-gray-900 dark:text-white">Corrigir Nota</h4>
        {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">{error}</div>}
        <div><Label>Nota (0–20) *</Label><Input type="number" min="0" max="20" step={0.01} value={valor} onChange={e => setValor(e.target.value === "" ? "" : Number(e.target.value))} /></div>
        <div><Label>Observação</Label><Input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Opcional" /></div>
        <div><Label>Motivo da correção *</Label><Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Explique o motivo" /></div>
        <div className="flex gap-2 justify-end"><Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button><Button disabled={loading}>{loading ? "Corrigindo..." : "Corrigir"}</Button></div>
      </form>
    </Modal>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function NotasAcademia() {
  const [user] = useState<MeuPerfilResponse | null>(getUserFromCookie);
  const token  = tokenStorage.get() ?? undefined;

  const academiaNivel = user?.academia?.nivel;
  const nivelEscolar  = user?.academia?.nivel_escolar ?? "fundamental";
  const isFundamental = academiaNivel === "escola" && nivelEscolar === "fundamental";
  const isSuperior    = academiaNivel === "superior";
  const isMisto       = academiaNivel === "escola" && nivelEscolar === "misto";
  const tipoNota: TipoNota = isSuperior ? "superior" : "escolar";

  const PERIODOS = isSuperior ? PERIODOS_SUPERIOR : PERIODOS_ESCOLA;

  const initLayer = (): Layer => {
    if (isFundamental) return { mode: "fund", type: "anos" };
    if (isMisto)       return { mode: "misto", type: "choose" };
    return { mode: "sup", type: "cursos" };
  };

  const [layer, setLayer]             = useState<Layer>(initLayer);
  const [alert, setAlert]             = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const [notasPorEstudante, setNotasPorEstudante] = useState<Record<string, Nota[]>>({});
  const [carregandoNotas, setCarregandoNotas]     = useState(false);

  // Matéria selecionada na camada notas
  const [materiaSelecionada, setMateriaSelecionada]     = useState<string | null>(null);
  // Cache de detalhes de matérias obtidos via GET /academia/materia/:id
  const [materiasCache, setMateriasCache]               = useState<Record<string, { id: string; nome: string }>>({});
  const [carregandoMaterias, setCarregandoMaterias]     = useState(false);

  const { data: dataTurmas,         loading: loadingTurmas, execute: carregarTurmas     } = useApi(academiaService.listarTurmas);
  const { data: dataCursos,                                  execute: carregarCursos     } = useApi(academiaService.listarCursos);
  const { data: dataEstudantes,                              execute: carregarEstudantes } = useApi(listarTodosEstudantes);
  const { data: dataMaterias,                                execute: carregarMaterias   } = useApi(academiaService.listarMaterias);
  const { data: dataCategorias,                              execute: carregarCategorias } = useApi(academiaService.listarCategoriasNota);
  const { data: dataAnoLetivo,                               execute: buscarAnoLetivo    } = useApi(academiaService.getAnoLetivo);
  const { data: dataAnosLetivosLista,                        execute: buscarAnosLetivos  } = useApi(academiaService.listarAnosLetivosLista);

  const { isOpen, openModal, closeModal } = useModal();
  const { isOpen: isCorrigirOpen, openModal: openCorrigirModal, closeModal: closeCorrigirModal } = useModal();
  const [notaSelecionada, setNotaSelecionada] = useState<Nota | null>(null);

  // ─── carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    carregarTurmas(token);
    carregarCursos(token);
    carregarEstudantes({ token, limit: 50, offset: 0 });
    carregarMaterias(token);
    buscarAnoLetivo(token);
    buscarAnosLetivos(token);
    if (isSuperior) carregarCategorias(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── dados derivados ────────────────────────────────────────────────────────

  const turmas: Turma[]                  = useMemo(() => (dataTurmas as any)?.turmas ?? [], [dataTurmas]);
  const cursos: Curso[]                  = useMemo(() => (dataCursos as any)?.cursos?.filter((c: any) => c.status === "ativo") ?? [], [dataCursos]);
  const estudantes: EstudanteDetalhado[] = useMemo(() => (dataEstudantes as any)?.estudantes ?? [], [dataEstudantes]);
  const materias                         = useMemo(() => (dataMaterias as any)?.materias?.filter((m: any) => m.status === "ativo") ?? [], [dataMaterias]);
  const categorias: CategoriaNotaItem[]    = useMemo(() => (dataCategorias as any)?.categorias ?? [], [dataCategorias]);
  const anosAcademicosDisponiveis         = useMemo(() => {
    const academia = user?.academia;
    const fundamental = academia?.nivel === "escola" && (academia.nivel_escolar === "fundamental" || academia.nivel_escolar === "misto")
      ? (academia.anos_academicos?.length ? academia.anos_academicos : ORDEM_ANOS_ACADEMICOS.slice(0, 9))
      : [];
    const medio = cursos.filter((curso) => curso.type === "medio").flatMap((curso) => curso.anos_academicos ?? []);
    const superior = cursos.filter((curso) => curso.type === "superior").flatMap((curso) => curso.anos_academicos ?? []);
    return sortAnosAcademicos([...fundamental, ...sequenciaAnos(medio, "medio"), ...sequenciaAnos(superior, "superior")]);
  }, [cursos, user]);
  const anoLectivo                       = (dataAnoLetivo as any)?.ano_letivo ?? "";
  const anosLetivosDisponiveis           = useMemo(() => (
    ((dataAnosLetivosLista as any)?.anos_letivos_lista ?? [])
      .map((x: any) => x?.ano_letivo)
      .filter(Boolean)
      .sort()
  ), [dataAnosLetivosLista]);

  const [anoLetivoSelecionado, setAnoLetivoSelecionado] = useState("");

  const turmasAtivas: Turma[] = useMemo(() => turmas.filter(turmaAtiva), [turmas]);
  const todasNotas             = useMemo(() => Object.values(notasPorEstudante).flat(), [notasPorEstudante]);

  // Níveis fundamentais disponíveis — ordenados crescentemente
  const niveisFundamentais = useMemo(() => {
    const anosAcademia = user?.academia?.anos_academicos ?? [];
    const comTurmas    = anosAcademia.filter(a => a.includes("fundamental") && turmasAtivas.some(t => t.nivel === a));
    const base         = comTurmas.length > 0 ? comTurmas : anosAcademia.filter(a => a.includes("fundamental"));
    return sortAnos(base);
  }, [turmasAtivas, user]);

  // ─── reset seleção ao mudar de camada ───────────────────────────────────────

  useEffect(() => {
    setMateriaSelecionada(null);
  }, [layer]);

  // pré-selecionar a primeira matéria disponível no contexto
  useEffect(() => {
    if (layer.type !== "notas") return;
    if (materiaSelecionada) return;

    const l = layer as any;
    const anoFiltro = anoLetivoSelecionado || anoLectivo;
    const codsHistorico: string[] = anoFiltro ? (l.turma.historico_estudantes_ano_letivo?.[anoFiltro] ?? []) : [];
    const codsOrigem: string[] = codsHistorico.length > 0 ? codsHistorico : (l.turma.estudantes ?? []);
    const codsNorm = [...new Set(codsOrigem.map((c: string) => normCodigoEstudante(c)).filter(Boolean))];
    const notasCtx: Nota[] = codsNorm
      .flatMap((c: string) => notasPorEstudante[c] ?? [])
      .filter((n: Nota) => (!anoFiltro || n.ano_lectivo === anoFiltro) && n.ano_academico === l.nivel && n.periodo === l.periodo);
    const idsConfiguradas = materias
      .filter((m: any) =>
        (m.anos_academicos ?? []).includes(l.nivel) &&
        (!l.turma.curso_id || !m.curso_id || m.curso_id === l.turma.curso_id) &&
        ((layer.mode !== "sup") || !m.periodo || m.periodo === l.periodo)
      )
      .map((m: any) => m.id);
    const ids = [...new Set([...idsConfiguradas, ...notasCtx.map((n: Nota) => n.materia_disciplinar_id)])];
    if (ids.length === 0) return;

    const sorted = ids
      .map(id => materias.find((m: any) => m.id === id) ?? materiasCache[id] ?? { id, nome: id })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" }));
    if (sorted.length > 0) setMateriaSelecionada(sorted[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer, materias, materiasCache, notasPorEstudante]);

  // ─── buscar detalhes das matérias quando na camada "notas" ─────────────────
  // Pega os materia_disciplinar_id únicos das notas filtradas e chama GET /academia/materia/:id

  useEffect(() => {
    if (layer.type !== "notas") return;

    const l = layer as any;
    const anoFiltro = anoLetivoSelecionado || anoLectivo;

    // Reconstruir lista de códigos da turma para o ano letivo
    const codigosHistorico: string[] = anoFiltro
      ? (l.turma.historico_estudantes_ano_letivo?.[anoFiltro] ?? [])
      : [];
    const codigosOrigem: string[] = codigosHistorico.length > 0 ? codigosHistorico : (l.turma.estudantes ?? []);
    const codigosNorm = [
      ...new Set(codigosOrigem.map((c: string) => (c ?? "").trim().toLowerCase()).filter(Boolean)),
    ];

    // Filtrar notas do contexto: ano letivo + nível + período
    const notasCtx: Nota[] = codigosNorm
      .flatMap((c: string) => notasPorEstudante[c] ?? [])
      .filter((n: Nota) =>
        (!anoFiltro || n.ano_lectivo === anoFiltro) &&
        n.ano_academico === l.nivel &&
        n.periodo       === l.periodo
      );

    const ids: string[]    = [...new Set(notasCtx.map((n: Nota) => n.materia_disciplinar_id))];
    const missing: string[] = ids.filter(id => !materiasCache[id]);
    if (missing.length === 0) return;

    setCarregandoMaterias(true);
    Promise.all(missing.map(id => academiaService.getMateria(id, token)))
      .then(results => {
        setMateriasCache(prev => {
          const next = { ...prev };
          results.forEach(m => { if (m?.id) next[m.id] = { id: m.id, nome: m.nome }; });
          return next;
        });
      })
      .catch(() => {})
      .finally(() => setCarregandoMaterias(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer, notasPorEstudante, anoLetivoSelecionado, anoLectivo]);

  // ─── helpers internos ───────────────────────────────────────────────────────

  function showAlert(variant: "success" | "error", message: string) {
    setAlert({ variant, message });
    setTimeout(() => setAlert(null), 4000);
  }

  /** Retorna os códigos de estudante (normalizados) da turma para o ano letivo dado. */
  function codigosTurmaDoAnoLetivo(turma: Turma, anoLetivo?: string): string[] {
    const codigosHistorico = anoLetivo ? (turma.historico_estudantes_ano_letivo?.[anoLetivo] ?? []) : [];
    const codigosOrigem    = codigosHistorico.length > 0 ? codigosHistorico : turma.estudantes;
    return Array.from(new Set(codigosOrigem.map(normCodigoEstudante).filter(Boolean)));
  }

  /** Devolve a forma original (case original) de um código normalizado dentro de uma turma. */
  function codigoOriginalDaTurma(turma: Turma, codigoNorm: string, anoLetivo?: string): string {
    const codigosHistorico = anoLetivo ? (turma.historico_estudantes_ano_letivo?.[anoLetivo] ?? []) : [];
    const codigosOrigem    = codigosHistorico.length > 0 ? codigosHistorico : turma.estudantes;
    return codigosOrigem.find(c => normCodigoEstudante(c) === codigoNorm) ?? codigoNorm;
  }

  /**
   * Carrega notas dos estudantes da turma via GET /notas-estudante/:codigo.
   * Quando o contexto já é conhecido, envia os filtros de ano, ano académico,
   * período e categorias válidas para evitar consultar categorias indevidas.
   */
  async function carregarNotasDosEstudantesDaTurma(
    turma: Turma,
    force = false,
    filtros?: { nivel: string; periodo: string; superior: boolean }
  ) {
    const anoFiltro      = anoLetivoSelecionado || anoLectivo || undefined;
    const codigosNorm    = codigosTurmaDoAnoLetivo(turma, anoFiltro);
    const categoriasValidas = filtros ? categoriasParaConsulta(filtros.nivel, filtros.superior, categorias) : [];
    const deveForcarConsulta = force || Boolean(filtros);
    const codigosParaBuscar = deveForcarConsulta
      ? codigosNorm
      : codigosNorm.filter(c => !(c in notasPorEstudante));
    if (codigosParaBuscar.length === 0) return;

    setCarregandoNotas(true);
    try {
      const resultados = await Promise.all(
        codigosParaBuscar.map(async codigoNorm => {
          const codigoOriginal = codigoOriginalDaTurma(turma, codigoNorm, anoFiltro);
          const resposta = await consultasService.notasEstudante(codigoOriginal, {
            token,
            ano_letivo: anoFiltro,
            ano_academico: filtros?.nivel,
            periodo: filtros?.periodo,
            categoria: categoriasValidas.length > 0 ? categoriasValidas : undefined,
          });
          return { codigoNorm, notas: resposta?.notas ?? [] };
        })
      );
      setNotasPorEstudante(prev => {
        const next = { ...prev };
        resultados.forEach(({ codigoNorm, notas }) => { next[codigoNorm] = notas; });
        return next;
      });
    } catch {
      // erro silencioso — a UI continua com dados parciais
    } finally {
      setCarregandoNotas(false);
    }
  }

  /**
   * Retorna todas as notas da turma filtradas por ano letivo, nível académico e período.
   * Usa os dados em cache (notasPorEstudante).
   */
  function notasDaTurmaEmPeriodo(turma: Turma, nivel: string, periodo: string): Nota[] {
    const anoFiltro      = anoLetivoSelecionado || anoLectivo;
    const codigosTurma   = codigosTurmaDoAnoLetivo(turma, anoFiltro);
    const notasDaTurma   = codigosTurma.flatMap(c => notasPorEstudante[c] ?? []);
    const notasAnoLetivo = anoFiltro ? notasDaTurma.filter(n => n.ano_lectivo === anoFiltro) : notasDaTurma;
    return notasAnoLetivo.filter(n => n.ano_academico === nivel && n.periodo === periodo);
  }

  // ─── handlers de escrita ────────────────────────────────────────────────────

  async function handleRegistrar(d: RegistrarNotasRequest) {
    await academiaService.registrarNota(d, token);
    showAlert("success", "Nota registada com sucesso.");
    const turmaAtual = (layer.type === "periodos" || layer.type === "notas") ? (layer as any).turma : null;
    if (turmaAtual) {
      const l = layer as any;
      await carregarNotasDosEstudantesDaTurma(turmaAtual, true, l.type === "notas" ? { nivel: l.nivel, periodo: l.periodo, superior: l.mode === "sup" } : undefined);
    }
  }

  async function handleCorrigirNota(id: string, data: { nota: number; observacao?: string; motivo: string }) {
    await academiaService.corrigirNota(id, data, token);
    showAlert("success", "Nota corrigida com sucesso.");
    const turmaAtual = layer.type === "notas" ? (layer as any).turma : null;
    if (turmaAtual) {
      const l = layer as any;
      await carregarNotasDosEstudantesDaTurma(turmaAtual, true, { nivel: l.nivel, periodo: l.periodo, superior: l.mode === "sup" });
    }
  }

  async function handleCriarCategoria(d: CriarCategoriaNotaRequest) {
    await academiaService.criarCategoriaNota(d, token);
    carregarCategorias(token);
    showAlert("success", "Categoria criada.");
  }

  // ─── helpers de listagem ────────────────────────────────────────────────────

  const turmasPorNivel  = (nivel: string)    => turmasAtivas.filter(t => t.nivel === nivel);
  const turmasPorCurso  = (cursoId: string)  => turmasAtivas.filter(t => t.curso_id === cursoId);
  const anosDosCurso    = (c: Curso)         => sortAnos(c.anos_academicos ?? []);

  // ─── breadcrumbs ────────────────────────────────────────────────────────────

  function buildCrumbs(): { label: string; onClick?: () => void }[] {
    const goInicio = () => setLayer({ mode: "misto", type: "choose" });

    if (layer.mode === "fund") {
      const goAnos    = () => setLayer({ mode: "fund", type: "anos" });
      const anosCrumb = { label: isMisto ? "Fundamental" : "Anos", onClick: goAnos };
      const base      = isMisto ? [{ label: "Início", onClick: goInicio }, anosCrumb] : [anosCrumb];
      if (layer.type === "anos")     return base;
      if (layer.type === "turmas")   return [...base, { label: labelNivel(layer.nivel) }];
      if (layer.type === "periodos") return [
        ...base,
        { label: labelNivel(layer.nivel), onClick: () => setLayer({ mode: "fund", type: "turmas",  nivel: layer.nivel }) },
        { label: layer.turma.codigo_turma },
      ];
      if (layer.type === "notas")    return [
        ...base,
        { label: labelNivel(layer.nivel), onClick: () => setLayer({ mode: "fund", type: "turmas",   nivel: layer.nivel }) },
        { label: layer.turma.codigo_turma, onClick: () => setLayer({ mode: "fund", type: "periodos", nivel: layer.nivel, turma: layer.turma }) },
        { label: PERIODOS_LABEL[layer.periodo] ?? layer.periodo },
      ];
    }

    if (layer.mode === "sup") {
      const goCursos    = () => setLayer({ mode: "sup", type: "cursos" });
      const cursosCrumb = { label: isMisto ? "Médio" : "Cursos", onClick: goCursos };
      const base        = isMisto ? [{ label: "Início", onClick: goInicio }, cursosCrumb] : [cursosCrumb];
      const l = layer as any;
      if (layer.type === "cursos")   return base;
      if (layer.type === "anos")     return [...base, { label: l.curso.nome }];
      if (layer.type === "turmas")   return [
        ...base,
        { label: l.curso.nome, onClick: () => setLayer({ mode: "sup", type: "anos", curso: l.curso }) },
        { label: labelNivel(l.nivel) },
      ];
      if (layer.type === "periodos") return [
        ...base,
        { label: l.curso.nome,          onClick: () => setLayer({ mode: "sup", type: "anos",    curso: l.curso }) },
        { label: labelNivel(l.nivel),   onClick: () => setLayer({ mode: "sup", type: "turmas",  curso: l.curso, nivel: l.nivel }) },
        { label: l.turma.codigo_turma },
      ];
      if (layer.type === "notas")    return [
        ...base,
        { label: l.curso.nome,               onClick: () => setLayer({ mode: "sup", type: "anos",     curso: l.curso }) },
        { label: labelNivel(l.nivel),         onClick: () => setLayer({ mode: "sup", type: "turmas",   curso: l.curso, nivel: l.nivel }) },
        { label: l.turma.codigo_turma,        onClick: () => setLayer({ mode: "sup", type: "periodos", curso: l.curso, nivel: l.nivel, turma: l.turma }) },
        { label: PERIODOS_LABEL[l.periodo] ?? l.periodo },
      ];
    }

    if (layer.mode === "misto" && layer.type === "choose") return [{ label: "Início" }];
    return [];
  }

  // ─── voltar à secção anterior ────────────────────────────────────────────────

  function goBack() {
    if (layer.mode === "misto" && layer.type === "choose") {
      if (anoLetivoSelecionado) setAnoLetivoSelecionado("");
      return;
    }

    // Se estiver na secção de anos com um ano letivo já selecionado,
    // o "Voltar" limpa o ano letivo (volta à lista de anos letivos) antes de mudar de secção
    if ((layer.type === "anos") && anoLetivoSelecionado) {
      setAnoLetivoSelecionado("");
      return;
    }

    if (layer.mode === "fund") {
      if (layer.type === "anos") {
        if (isMisto) setLayer({ mode: "misto", type: "choose" });
      } else if (layer.type === "turmas") {
        setLayer({ mode: "fund", type: "anos" });
      } else if (layer.type === "periodos") {
        setLayer({ mode: "fund", type: "turmas", nivel: layer.nivel });
      } else if (layer.type === "notas") {
        setLayer({ mode: "fund", type: "periodos", nivel: layer.nivel, turma: layer.turma });
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
      } else if (layer.type === "periodos") {
        setLayer({ mode: "sup", type: "turmas", curso: l.curso, nivel: l.nivel });
      } else if (layer.type === "notas") {
        setLayer({ mode: "sup", type: "periodos", curso: l.curso, nivel: l.nivel, turma: l.turma });
      }
      return;
    }
  }

  /** Retorna true se há uma secção anterior para onde voltar */
  function canGoBack(): boolean {
    if (layer.mode === "misto" && layer.type === "choose") return Boolean(anoLetivoSelecionado);
    if (layer.mode === "fund" && layer.type === "anos" && !isMisto && !anoLetivoSelecionado) return false;
    if (layer.mode === "sup"  && layer.type === "cursos" && !isMisto) return false;
    return true;
  }

  // ─── seletor de matérias + tabela (camada "notas") ──────────────────────────

  function renderNotasLayer(nivel: string, turma: Turma, periodo: string, usarTabelaSuperior: boolean, subtitulo?: string) {
    const anoFiltro      = anoLetivoSelecionado || anoLectivo;
    const codigosTurma   = codigosTurmaDoAnoLetivo(turma, anoFiltro).filter(Boolean);
    const notasContexto  = notasDaTurmaEmPeriodo(turma, nivel, periodo);
    const materiaIdsConfiguradas = materias
      .filter((m: any) =>
        (m.anos_academicos ?? []).includes(nivel) &&
        (!turma.curso_id || !m.curso_id || m.curso_id === turma.curso_id) &&
        (!usarTabelaSuperior || !m.periodo || m.periodo === periodo)
      )
      .map((m: any) => m.id);
    const materiaIdsCtx  = [...new Set([...materiaIdsConfiguradas, ...notasContexto.map(n => n.materia_disciplinar_id)])];

    // Mapear IDs para nomes (usa a lista configurada e, como fallback, cache/ID)
    const materiasDisponiveis = materiaIdsCtx
      .map(id => {
        const materia = materias.find((m: any) => m.id === id);
        return materia ? { id: materia.id, nome: materia.nome } : (materiasCache[id] ?? { id, nome: id });
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));

    const notasFiltradas = materiaSelecionada
      ? notasContexto.filter(n => n.materia_disciplinar_id === materiaSelecionada)
      : [];

    return (
      <div className="space-y-5">
        {/* Cabeçalho */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Turma {turma.codigo_turma} · {labelNivel(nivel)} · {PERIODOS_LABEL[periodo] ?? periodo} · {(anoLetivoSelecionado || anoLectivo || "").replace("_", "/")}
          </h2>
        </div>

        {/* Selector de matéria */}
        {materiasDisponiveis.length === 0 && !carregandoMaterias ? (
          <div className="text-center py-10 text-gray-400">
            <Icon icon="mdi:book-outline" width={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma matéria configurada para este contexto.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Selecione uma matéria:</p>
            </div>
            {carregandoMaterias && materiasDisponiveis.every(m => m.nome === m.id) ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-500" />
                Carregando matérias...
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {materiasDisponiveis.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMateriaSelecionada(m.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                      materiaSelecionada === m.id
                        ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400"
                    }`}
                  >
                    {m.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tabela */}
        {materiasDisponiveis.length > 0 && (
          usarTabelaSuperior
            ? <TabelaNotasSuperior notas={notasFiltradas} estudantes={estudantes} codigosTurma={codigosTurma} anoAcademico={nivel} categorias={categorias} onCorrigir={(nota) => { setNotaSelecionada(nota); openCorrigirModal(); }} />
            : <TabelaNotasEscolar  notas={notasFiltradas} estudantes={estudantes} codigosTurma={codigosTurma} anoAcademico={nivel} onCorrigir={(nota) => { setNotaSelecionada(nota); openCorrigirModal(); }} />
        )}
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

    if (loadingTurmas || carregandoNotas) return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {carregandoNotas ? "Carregando notas..." : "Carregando turmas..."}
          </p>
        </div>
      </div>
    );

    // ── modo misto: escolha de nível ──────────────────────────────────────────
    if (layer.mode === "misto" && layer.type === "choose") return (
      <div className="space-y-6">
        {BotaoVoltar}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{anoLetivoSelecionado ? "Notas" : "Anos Letivos"}</h2>
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
            <CardBtn icon="mdi:book-education" title="Ensino Médio"       subtitle="1º ao 4º Médio" onClick={() => setLayer({ mode: "sup", type: "cursos" })} />
          </div>
        )}
      </div>
    );

    // ── fundamental: anos ────────────────────────────────────────────────────
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
              <CardBtn
                key={ano}
                icon="mdi:calendar-school"
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
                  <CardBtn
                    key={nivel}
                    icon="mdi:numeric"
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
              {ts.map(t => (
                <CardBtn
                  key={t.id ?? t.codigo_turma}
                  icon="mdi:account-group"
                  title={t.codigo_turma}
                  subtitle={`${codigosTurmaDoAnoLetivo(t, anoLetivoSelecionado || anoLectivo).length} estudante(s) · ${t.turno}`}
                  onClick={async () => {
                    await carregarNotasDosEstudantesDaTurma(t);
                    setLayer({ mode: "fund", type: "periodos", nivel: layer.nivel, turma: t });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    // ── fundamental: períodos ────────────────────────────────────────────────
    if (layer.mode === "fund" && layer.type === "periodos") {
      const { nivel, turma } = layer;
      return (
        <div className="space-y-4">
          {BotaoVoltar}
          <Breadcrumb crumbs={crumbs} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Turma {turma.codigo_turma}</h2>
          <p className="text-sm text-gray-500">{labelNivel(nivel)}</p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {PERIODOS_ESCOLA.map(p => (
              <CardBtn
                key={p.value}
                icon="mdi:clipboard-text-clock-outline"
                title={p.label}
                subtitle="Ver notas"
                onClick={async () => {
                  await carregarNotasDosEstudantesDaTurma(turma, true, { nivel, periodo: p.value, superior: false });
                  setLayer({ mode: "fund", type: "notas", nivel, turma, periodo: p.value });
                }}
              />
            ))}
          </div>
        </div>
      );
    }

    // ── fundamental: notas ───────────────────────────────────────────────────
    if (layer.mode === "fund" && layer.type === "notas") {
      const { nivel, turma, periodo } = layer;
      return (
        <div className="space-y-4">
          {BotaoVoltar}
          <Breadcrumb crumbs={crumbs} />
          {renderNotasLayer(nivel, turma, periodo, false)}
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
                <CardBtn
                  key={ano}
                  icon="mdi:calendar-school"
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
                  <CardBtn
                    key={nivel}
                    icon="mdi:calendar-school"
                    title={labelNivel(nivel)}
                    subtitle={`${turmasPorCurso(curso.id).filter(t => t.nivel === nivel).length} turma(s)`}
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
      const ts               = turmasPorCurso(curso.id).filter(t => t.nivel === nivel);
      return (
        <div className="space-y-4">
          {BotaoVoltar}
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
                  subtitle={`${codigosTurmaDoAnoLetivo(t, anoLetivoSelecionado || anoLectivo).length} estudante(s)`}
                  onClick={async () => {
                    await carregarNotasDosEstudantesDaTurma(t);
                    setLayer({ mode: "sup", type: "periodos", curso, nivel, turma: t });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    // ── superior: períodos ────────────────────────────────────────────────────
    if (layer.mode === "sup" && layer.type === "periodos") {
      const { curso, nivel, turma } = layer as { mode: "sup"; type: "periodos"; curso: Curso; nivel: string; turma: Turma };
      const periodosDisponiveis     = curso.periodos?.length
        ? curso.periodos.map(v => ({ label: PERIODOS_LABEL[v] ?? v, value: v }))
        : PERIODOS_SUPERIOR;
      return (
        <div className="space-y-4">
          {BotaoVoltar}
          <Breadcrumb crumbs={crumbs} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Turma {turma.codigo_turma}</h2>
          <p className="text-sm text-gray-500">{labelNivel(nivel)} · {curso.nome}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {periodosDisponiveis.map(p => (
              <CardBtn
                key={p.value}
                icon="mdi:clipboard-text-clock-outline"
                title={p.label}
                subtitle="Ver notas"
                onClick={async () => {
                  await carregarNotasDosEstudantesDaTurma(turma, true, { nivel, periodo: p.value, superior: true });
                  setLayer({ mode: "sup", type: "notas", curso, nivel, turma, periodo: p.value });
                }}
              />
            ))}
          </div>
        </div>
      );
    }

    // ── superior: notas ───────────────────────────────────────────────────────
    if (layer.mode === "sup" && layer.type === "notas") {
      const { curso, nivel, turma, periodo } = layer as { mode: "sup"; type: "notas"; curso: Curso; nivel: string; turma: Turma; periodo: string };
      return (
        <div className="space-y-4">
          {BotaoVoltar}
          <Breadcrumb crumbs={crumbs} />
          {renderNotasLayer(nivel, turma, periodo, true, curso.nome)}
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

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Notas</h2>
          {turmas.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {turmasAtivas.length} turma(s) ativa(s) · {estudantes.length} estudante(s) · {todasNotas.length} nota(s)
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {isSuperior && (
            <Button size="sm" variant="outline" startIcon={<Icon icon="mdi:tag-plus-outline" />} onClick={openModal}>
              Categoria
            </Button>
          )}
          <Button size="sm" startIcon={<Icon icon="mdi:plus" />} onClick={openModal}>
            Nova Nota
          </Button>
        </div>
      </div>

      {renderLayer()}

      <ModalCorrigirNota
        nota={notaSelecionada}
        isOpen={isCorrigirOpen}
        onClose={closeCorrigirModal}
        onConfirm={handleCorrigirNota}
      />

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
        anosAcademicosDisponiveis={anosAcademicosDisponiveis}
        onRegistrar={handleRegistrar}
        onCriarCategoria={handleCriarCategoria}
      />
    </div>
  );
}
