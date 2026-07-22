"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { jobApiService, pollJob, tokenStorage } from "@/lib/api";
import { resolveJobItemError } from "@/lib/api/job-service";
import { getCookie } from "@/lib/utils/cookies";
import type { ApiDate, MeuPerfilResponse } from "@/types/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type LogLevel = "ok" | "err" | "warn" | "info" | "step" | "dim";
interface LogEntry { ts: string; level: LogLevel; msg: string; }

interface AcademiaInfo {
  codigo: string;
  token: string;
  tipo: "escola" | "superior";
  nivel?: "fundamental" | "medio" | "misto";
  anos_academicos?: string[];
  ano_letivo?: string;
}

interface Materia {
  id: string;
  nome: string;
  type: string;
  anos_academicos: string[];
  periodo?: string;
  curso_id?: string;
}

interface Estudante {
  codigo_estudante: string;
  nome: string;
  ano_escolar_fundamental?: string;
  ano_escolar_medio?: string;
  ano_superior?: string;
  curso_medio_id?: string;
  curso_superior_id?: string;
  bilhete_identidade?: string;
  bilhete_identidade_encarregado?: string;
  total_notas?: number;
  total_faltas?: number;
  status?: string;
  documentos?: Record<string, unknown>;
}

const DOCUMENT_LABELS: Record<string, string> = {
  bi_estudante: "BI do estudante",
  bi_encarregado: "BI do encarregado",
  cedula_estudante: "Cédula do estudante",
  declaracao: "Declaração do ano anterior",
  certificado_6_ano_fundamental: "Certificado da 6ª classe",
  certificado_9_ano_fundamental: "Certificado da 9ª classe",
  certificado_ensino_medio: "Certificado do ensino médio",
};

interface Turma {
  id?: string;
  codigo_turma: string;
  nivel: string;
  estudantes: string[];
  curso_id?: string;
  status?: string;
}

interface Curso {
  id: string;
  nome: string;
  type: string;
  anos_academicos: string[];
  periodos?: string[];
  status?: string;
}

// ─── Categorias de Nota ───────────────────────────────────────────────────────

const CATEGORIAS_ESCOLAR: { value: string; label: string }[] = [
  { value: "nota_professor", label: "Nota do professor" },
  { value: "prova_trimestral", label: "Prova do trimestre" },
  { value: "exame_final", label: "Exame final" },
  { value: "exame_recurso", label: "Exame de recuperação" },
  { value: "nota_pap", label: "Prova final profissional" },
];

const CATEGORIAS_SUPERIOR: { value: string; label: string }[] = [
  { value: "nota_pp1", label: "Primeira prova" },
  { value: "nota_pp2", label: "Segunda prova" },
  { value: "nota_exame", label: "Exame" },
];

// ─── Constants ─────────────────────────────────────────────────────────────────

const NOMES_M = ["João","António","Manuel","Francisco","Domingos","Pedro","Paulo","Carlos","Luís","Miguel","Filipe","Rui","Hélder","Faustino","Simão","Narciso","Mário","Sérgio","Ezequiel","Armindo"];
const NOMES_F = ["Maria","Ana","Sofia","Isabel","Filomena","Rosa","Conceição","Graça","Fernanda","Lurdes","Beatriz","Carla","Diana","Elisa","Fátima","Glória","Helena","Inês","Joana","Kátia"];
const SOBRENOMES = ["Silva","Santos","Costa","Ferreira","Oliveira","Neto","Lopes","Fernandes","Gonçalves","Rodrigues","Monteiro","Cardoso","Marques","Correia","Mendes","Kiala","Nzinga","Mbemba","Lukamba","Tchipilica"];

const CURSOS_MEDIO = [
  { nome: "Ciências e Tecnologia", anos: ["1_ano_medio","2_ano_medio","3_ano_medio"] },
  { nome: "Letras e Ciências Humanas", anos: ["1_ano_medio","2_ano_medio","3_ano_medio"] },
  { nome: "Económico-Jurídico", anos: ["1_ano_medio","2_ano_medio","3_ano_medio"] },
  { nome: "Informática e Gestão", anos: ["1_ano_medio","2_ano_medio","3_ano_medio"] },
];
const CURSOS_SUPERIOR = [
  { nome: "Engenharia Informática", anos: ["1_ano_superior","2_ano_superior","3_ano_superior","4_ano_superior","5_ano_superior"], periodos: ["1_semestre","2_semestre"] },
  { nome: "Medicina", anos: ["1_ano_superior","2_ano_superior","3_ano_superior","4_ano_superior","5_ano_superior","6_ano_superior"], periodos: ["1_semestre","2_semestre"] },
  { nome: "Direito", anos: ["1_ano_superior","2_ano_superior","3_ano_superior","4_ano_superior"], periodos: ["1_semestre","2_semestre"] },
  { nome: "Gestão de Empresas", anos: ["1_ano_superior","2_ano_superior","3_ano_superior","4_ano_superior"], periodos: ["1_semestre","2_semestre"] },
  { nome: "Psicologia", anos: ["1_ano_superior","2_ano_superior","3_ano_superior","4_ano_superior","5_ano_superior"], periodos: ["1_semestre","2_semestre"] },
];

const MATERIAS_FUND = ["Língua Portuguesa","Matemática","Estudo do Meio","Educação Visual","Educação Física","Música","Inglês","Ciências Naturais","História de Angola","Formação Cívica"];
const MATERIAS_MEDIO = ["Língua Portuguesa","Matemática","Física","Química","Biologia","História","Geografia","Filosofia","Inglês","Educação Física","Informática","Economia"];
const MATERIAS_SUPERIOR = ["Álgebra Linear","Cálculo I","Programação","Estruturas de Dados","Redes","Sistemas Operativos","Base de Dados","Engenharia de Software","Inteligência Artificial","Segurança Informática"];

const TURNOS = ["manha","tarde","noite"] as const;
const DATAS_FALTA: ApiDate[] = ["2026-03-10","2026-04-07","2026-05-05","2026-06-02","2026-07-07","2026-09-01","2026-10-06","2026-11-03"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const rnd = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pickN = <T,>(arr: T[], n: number): T[] => [...arr].sort(() => 0.5 - Math.random()).slice(0, n);
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const ordenarAnosAcademicos = (anos: string[]) =>
  [...anos].sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
    return a.localeCompare(b, "pt-PT");
  });
const gerarNome = () => {
  const m = Math.random() < 0.51;
  return { nome: `${pick(m ? NOMES_M : NOMES_F)} ${pick(SOBRENOMES)} ${pick(SOBRENOMES)}`, genero: m ? "masculino" as const : "feminino" as const };
};
const gerarDataNasc = (minAge = 8, maxAge = 25) => {
  const dias = rnd(minAge, maxAge) * 365 + rnd(0, 364);
  return new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);
};
const gerarTelefoneAngola = (usados: Set<string>) => {
  let telefone = "";
  do {
    telefone = `${pick(["91", "92", "93", "94", "95", "99"])}${rnd(1000000, 9999999)}`;
  } while (usados.has(telefone));
  usados.add(telefone);
  return telefone;
};
const gerarBilheteIdentidade = (usados: Set<string>) => {
  let bilhete = "";
  do {
    bilhete = `${rnd(100000000, 999999999)}${pick(["LA", "BO", "UE", "MO", "BE"])}${String(rnd(0, 999)).padStart(3, "0")}`;
  } while (usados.has(bilhete.toLowerCase()));
  usados.add(bilhete.toLowerCase());
  return bilhete;
};
const gerarDataNascimentoPorAnoAcademico = (anoAcademico?: string) => {
  if (anoAcademico?.endsWith("_ano_superior")) return gerarDataNasc(18, 35);
  if (anoAcademico?.endsWith("_ano_medio")) return gerarDataNasc(14, 22);
  if (anoAcademico?.endsWith("_ano_fundamental")) return gerarDataNasc(6, 16);
  return gerarDataNasc();
};

const criarPdfTeste = (nome: string) => new File([
  new Blob([
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF\n",
  ], { type: "application/pdf" }),
], `${nome}.pdf`, { type: "application/pdf" });

const anoAnteriorAcademico = (anoAcademico?: string) => {
  const match = anoAcademico?.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!match) return undefined;
  const numero = Number(match[1]);
  const nivel = match[2];
  if (nivel === "fundamental" && numero > 1) return `${numero - 1}_ano_fundamental`;
  if (nivel === "medio" && numero > 1) return `${numero - 1}_ano_medio`;
  if (nivel === "superior" && numero > 1) return `${numero - 1}_ano_superior`;
  if (nivel === "medio" && numero === 1) return "9_ano_fundamental";
  if (nivel === "superior" && numero === 1) return "3_ano_medio";
  return undefined;
};

const camposDocumentaisObrigatorios = (payload: Record<string, any>) => {
  const campos: string[] = [];
  const anoAcademico = payload.ano_superior || payload.ano_escolar_medio || payload.ano_escolar_fundamental;

  if (payload.ano_superior) {
    campos.push("bi_estudante");
    if (payload.ano_superior === "1_ano_superior") campos.push("certificado_ensino_medio");
    else if (anoAnteriorAcademico(anoAcademico)) campos.push("declaracao");
    return campos;
  }

  campos.push(payload.bilhete_identidade ? "bi_estudante" : "cedula_estudante", "bi_encarregado");
  if (payload.ano_escolar_fundamental === "7_ano_fundamental") campos.push("certificado_6_ano_fundamental");
  else if (payload.ano_escolar_medio === "1_ano_medio") campos.push("certificado_9_ano_fundamental");
  else if (anoAcademico && anoAcademico !== "1_ano_fundamental" && anoAnteriorAcademico(anoAcademico)) campos.push("declaracao");
  return campos;
};

const getDocumentoChaves = (estudante: Estudante) => new Set(Object.keys(estudante.documentos || {}));

const documentoPendenteJaEnviado = (chaves: Set<string>, campo: string, estudante: Estudante) => {
  if (chaves.has(campo)) return true;
  const anoAtual = estudante.ano_superior || estudante.ano_escolar_medio || estudante.ano_escolar_fundamental;
  const anoAnterior = anoAnteriorAcademico(anoAtual);
  if (campo === "declaracao") {
    return [...chaves].some(chave => chave.includes(".declaracao_") || chave === `declaracao_${anoAnterior}`);
  }
  return [...chaves].some(chave => chave.endsWith(`.${campo}`));
};

const camposDocumentaisPendentes = (estudante: Estudante) => {
  const obrigatorios = camposDocumentaisObrigatorios(estudante as Record<string, any>);
  const chaves = getDocumentoChaves(estudante);
  return obrigatorios.filter(campo => !documentoPendenteJaEnviado(chaves, campo, estudante));
};

const camposDocumentaisParaRegularizacao = (estudante: Estudante) => {
  const campos = camposDocumentaisPendentes(estudante);
  const anoAtual = estudante.ano_superior || estudante.ano_escolar_medio || estudante.ano_escolar_fundamental;
  const certificadoAlternativo =
    anoAtual === "7_ano_fundamental" ? "certificado_6_ano_fundamental" :
    anoAtual === "1_ano_medio" ? "certificado_9_ano_fundamental" :
    anoAtual === "1_ano_superior" ? "certificado_ensino_medio" :
    undefined;

  if (certificadoAlternativo && campos.includes(certificadoAlternativo) && Math.random() < 0.5) {
    return campos.map(campo => campo === certificadoAlternativo ? "declaracao" : campo);
  }
  return campos;
};

const toggleSelecionado = (lista: string[], valor: string) =>
  lista.includes(valor) ? lista.filter(item => item !== valor) : [...lista, valor];

function tiposMateriaValidos(academia: AcademiaInfo): { value: "fundamental"|"medio"|"superior"; label: string }[] {
  if (academia.tipo === "superior") {
    return [{ value: "superior", label: "Superior" }];
  }
  if (academia.nivel === "fundamental") {
    return [{ value: "fundamental", label: "Fundamental" }];
  }
  if (academia.nivel === "medio") {
    return [{ value: "medio", label: "Médio" }];
  }
  if (academia.nivel === "misto") {
    return [
      { value: "fundamental", label: "Fundamental" },
      { value: "medio", label: "Médio" },
    ];
  }
  return [{ value: "fundamental", label: "Fundamental" }];
}

function tiposCursoValidos(academia: AcademiaInfo): { value: "medio"|"superior"; label: string }[] {
  if (academia.tipo === "superior") {
    return [{ value: "superior", label: "Superior" }];
  }
  if (academia.nivel === "medio" || academia.nivel === "misto") {
    return [{ value: "medio", label: "Médio" }];
  }
  return [];
}

type EscolaMode = "fundamental" | "medio" | "superior" | "misto";

function getEscolaMode(academia: AcademiaInfo): EscolaMode {
  if (academia.tipo === "superior") return "superior";
  if (academia.nivel === "medio") return "medio";
  if (academia.nivel === "misto") return "misto";
  return "fundamental";
}

function inferirTipoEnsinoPorNivel(nivel: string): "fundamental" | "medio" | "superior" | "desconhecido" {
  if (nivel.endsWith("_ano_fundamental")) return "fundamental";
  if (nivel.endsWith("_ano_medio")) return "medio";
  if (nivel.endsWith("_ano_superior")) return "superior";
  return "desconhecido";
}

function estudanteCompatívelComTurma(
  estudante: Estudante,
  turma: Turma,
  academiaAnosAcademicos: string[],
): boolean {
  const tipo = inferirTipoEnsinoPorNivel(turma.nivel);

  if (tipo === "fundamental") {
    if (!academiaAnosAcademicos.includes(turma.nivel)) return false;
    if (!estudante.ano_escolar_fundamental) return false;
    return estudante.ano_escolar_fundamental === turma.nivel;
  }

  if (tipo === "medio") {
    if (!estudante.ano_escolar_medio) return false;
    if (estudante.ano_escolar_medio !== turma.nivel) return false;
    if (!turma.curso_id) return false;
    if (!estudante.curso_medio_id) return false;
    return estudante.curso_medio_id === turma.curso_id;
  }

  if (tipo === "superior") {
    if (!estudante.ano_superior) return false;
    if (estudante.ano_superior !== turma.nivel) return false;
    if (!turma.curso_id) return false;
    if (!estudante.curso_superior_id) return false;
    return estudante.curso_superior_id === turma.curso_id;
  }

  return true;
}

function getAnoAcademicoEstudante(estudante: Estudante, academia: AcademiaInfo): string | null {
  if (academia.tipo === "superior") return estudante.ano_superior ?? null;
  if (academia.nivel === "fundamental") return estudante.ano_escolar_fundamental ?? null;
  if (academia.nivel === "medio") return estudante.ano_escolar_medio ?? null;
  return estudante.ano_escolar_medio || estudante.ano_escolar_fundamental || null;
}

function getCategoriasEscolaresPermitidas(anoAcademico: string, periodo: string): string[] {
  if (anoAcademico === "4_ano_medio") return ["nota_pap"];

  const categorias = ["nota_professor", "prova_trimestral"];
  const anoComExame = ["6_ano_fundamental", "9_ano_fundamental", "3_ano_medio"].includes(anoAcademico);
  if (anoComExame && periodo === "3_trimestre") {
    categorias.push("exame_final", "exame_recurso");
  }
  return categorias;
}

function getCategoriasPermitidasParaNota(tipoNota: "escolar" | "superior", anoAcademico: string, periodo: string, categoriasSelecionadas: string[]): string[] {
  if (tipoNota === "superior") return categoriasSelecionadas;
  const permitidas = getCategoriasEscolaresPermitidas(anoAcademico, periodo);
  return categoriasSelecionadas.filter(categoria => permitidas.includes(categoria));
}

function getNotaAleatoria(anoAcademico: string): number {
  const max = /^([1-6])_ano_fundamental$/.test(anoAcademico) ? 10 : 20;
  const min = max === 10 ? 5 : 10;
  return parseFloat((rnd(min, max) + Math.random()).toFixed(1));
}

// ─── NumberStepper Component ───────────────────────────────────────────────────

function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  label,
  hint,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  hint?: string;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || raw === "-") { onChange(min); return; }
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) onChange(clamp(parsed));
  };

  const handleBtnClick = (e: React.MouseEvent, newVal: number) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(clamp(newVal));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </label>
      )}
      <div style={{ display: "flex", alignItems: "center", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, overflow: "hidden", height: 34 }}>
        <button
          type="button"
          onClick={(e) => handleBtnClick(e, value - step)}
          disabled={value <= min}
          style={{
            width: 32, height: "100%", background: "transparent", border: "none",
            color: value <= min ? "#334155" : "#94a3b8", cursor: value <= min ? "not-allowed" : "pointer",
            fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
            borderRight: "1px solid #334155", flexShrink: 0, transition: "color 0.15s",
          }}
        >
          −
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={handleInput}
          onWheel={(e) => e.currentTarget.blur()}
          style={{
            width: 60, height: "100%", background: "transparent", border: "none",
            color: "#e2e8f0", fontSize: 13, fontWeight: 600, textAlign: "center",
            outline: "none", MozAppearance: "textfield" as any,
          }}
        />
        <button
          type="button"
          onClick={(e) => handleBtnClick(e, value + step)}
          disabled={value >= max}
          style={{
            width: 32, height: "100%", background: "transparent", border: "none",
            color: value >= max ? "#334155" : "#94a3b8", cursor: value >= max ? "not-allowed" : "pointer",
            fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
            borderLeft: "1px solid #334155", flexShrink: 0, transition: "color 0.15s",
          }}
        >
          +
        </button>
      </div>
      {hint && <span style={{ fontSize: 10, color: "#475569" }}>{hint}</span>}
    </div>
  );
}

// ─── CategoryCheckboxes Component ─────────────────────────────────────────────

function CategoryCheckboxes({
  options,
  selected,
  onChange,
  label,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (sel: string[]) => void;
  label?: string;
}) {
  const toggle = (val: string) => {
    if (selected.includes(val)) {
      if (selected.length === 1) return;
      onChange(selected.filter(v => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const all = options.every(o => selected.includes(o.value));
  const toggleAll = () => {
    if (all) {
      onChange([options[0].value]);
    } else {
      onChange(options.map(o => o.value));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {label}
          </label>
          <button
            type="button"
            onClick={toggleAll}
            style={{ fontSize: 10, color: "#60a5fa", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            {all ? "desmarcar todas" : "todas"}
          </button>
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map(opt => {
          const checked = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                border: `1px solid ${checked ? "#3b82f6" : "#334155"}`,
                background: checked ? "#1e3a5f" : "#1e293b",
                color: checked ? "#93c5fd" : "#64748b",
                fontSize: 12, fontWeight: checked ? 600 : 400,
                transition: "all 0.15s",
              }}
            >
              <span style={{
                width: 12, height: 12, borderRadius: 3, border: `1.5px solid ${checked ? "#3b82f6" : "#475569"}`,
                background: checked ? "#3b82f6" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {checked && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PageContent() {
  const [currentUser, setCurrentUser] = useState<MeuPerfilResponse | null>(null);
  const [academia, setAcademia] = useState<AcademiaInfo | null>(null);
  const [authError, setAuthError] = useState<string>("");

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [estudantes, setEstudantes] = useState<Estudante[]>([]);

  const [cursoConfig, setCursoConfig] = useState({ tipo: "medio" as "medio"|"superior", qtd: 2 });
  const [materiaConfig, setMateriaConfig] = useState({ tipo: "fundamental" as "fundamental"|"medio"|"superior", qtd: 5, cursoId: "" });

  const [turmaConfig, setTurmaConfig] = useState({ qtd: 3, turno: "random" as string, nivel: "random", cursoId: "random", niveisSelecionados: [] as string[] });
  const [vincularConfig, setVincularConfig] = useState({ turmaCodigo: "random" });

  const [categoriaEscolarSel, setCategoriaEscolarSel] = useState<string[]>(["nota_professor", "prova_trimestral"]);
  const [categoriaSuperiorSel, setCategoriaSuperiorSel] = useState<string[]>(["nota_pp1", "nota_pp2", "nota_exame"]);

  const [notaConfig, setNotaConfig] = useState({ qtdEstudantes: 0, periodo: "random" });
  const [faltaConfig, setFaltaConfig] = useState({ qtdEstudantes: 0 });

  const [estudanteConfig, setEstudanteConfig] = useState({
    qtd: 20,
    anoFundamental: "random",
    anosFundamentalSelecionados: [] as string[],
    anoMedio: "random",
    anosMedioSelecionados: [] as string[],
    cursoMedioId: "random",
    anoSuperior: "random",
    anosSuperiorSelecionados: [] as string[],
    cursoSuperiorId: "random",
    modoPrincipal: "fundamental" as "fundamental" | "medio",
    pctFundamental: 60,
    comArquivos: false,
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);
  const shouldScrollRef = useRef(false);

  const addLog = useCallback((msg: string, level: LogLevel = "info") => {
    const ts = new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(prev => [...prev, { ts, level, msg }].slice(-800));
    shouldScrollRef.current = true;
  }, []);

  useEffect(() => {
    if (shouldScrollRef.current) {
      shouldScrollRef.current = false;
      const timer = setTimeout(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [logs]);

  useEffect(() => {
    const userCookie = getCookie("user");
    const token = tokenStorage.get();
    if (!userCookie || !token) { setAuthError("Sem sessão ativa. Faça login como academia para usar esta página."); return; }
    try {
      const parsed: MeuPerfilResponse = JSON.parse(userCookie);
      if (parsed.tipo !== "academia") { setAuthError("Esta página é exclusiva para academias."); return; }
      if (!parsed.academia) { setAuthError("Dados da academia não encontrados. Faça login novamente."); return; }
      setCurrentUser(parsed);
      const ac = parsed.academia;
      const acInfo: AcademiaInfo = {
        codigo: ac.codigo_academia,
        token,
        tipo: ac.nivel,
        nivel: ac.nivel_escolar,
        anos_academicos: ac.anos_academicos || [],
        ano_letivo: ac.ano_letivo,
      };
      setAcademia(acInfo);

      const tiposCurso = tiposCursoValidos(acInfo);
      if (tiposCurso.length > 0) setCursoConfig(p => ({ ...p, tipo: tiposCurso[0].value }));
      const tiposMateria = tiposMateriaValidos(acInfo);
      if (tiposMateria.length > 0) setMateriaConfig(p => ({ ...p, tipo: tiposMateria[0].value }));

      if (acInfo.nivel === "misto") {
        setEstudanteConfig(p => ({ ...p, modoPrincipal: "fundamental" }));
      }
    } catch { setAuthError("Erro ao ler dados da sessão. Faça login novamente."); }
  }, []);

  useEffect(() => {
    if (estudantes.length > 0) {
      setNotaConfig(p => ({ ...p, qtdEstudantes: p.qtdEstudantes === 0 ? estudantes.length : p.qtdEstudantes }));
      setFaltaConfig(p => ({ ...p, qtdEstudantes: p.qtdEstudantes === 0 ? estudantes.length : p.qtdEstudantes }));
    }
  }, [estudantes.length]);

  useEffect(() => { if (academia) refreshData(academia); }, [academia?.codigo]); // eslint-disable-line react-hooks/exhaustive-deps

  const apiUrl = () => {
    const url = process.env.NEXT_PUBLIC_API_URL || "";
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) return `https://${url}`;
    return url;
  };

  const callApi = async (
    method: string,
    path: string,
    body: unknown,
    tok?: string
  ) => {
    const url = apiUrl() + path;
    const token = tok || academia?.token || tokenStorage.get() || "";
    try {
      const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
      const headers: Record<string, string> = isFormData ? {} : { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const r = await fetch(url, {
        method,
        headers,
        body: body == null ? undefined : isFormData ? body : JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      return { ok: r.status >= 200 && r.status < 300, status: r.status, data };
    } catch (e: any) {
      return { ok: false, status: 0, data: { error: String(e) } };
    }
  };

  const listarTodosEstudantes = async (tok: string) => {
    const limit = 100;
    let offset = 0;
    const todos: Estudante[] = [];
    const codigosVistos = new Set<string>();

    while (true) {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      const { ok, data, status } = await callApi("GET", `/estudantes?${params.toString()}`, undefined, tok);
      if (!ok) {
        addLog(`Falha ao consultar estudantes da academia (status ${status})`, "warn");
        break;
      }

      const pagina: Estudante[] = (data as any)?.estudantes || [];
      pagina.forEach(estudante => {
        if (!codigosVistos.has(estudante.codigo_estudante)) {
          codigosVistos.add(estudante.codigo_estudante);
          todos.push(estudante);
        }
      });
      if (pagina.length < limit) break;
      offset += limit;
    }

    return todos;
  };

  const refreshData = async (ac?: AcademiaInfo) => {
    const acad = ac || academia;
    if (!acad?.token) return;
    const tok = acad.token;

    const [rCursos, rMaterias, rTurmas, estudantesData, rAnoLetivo] = await Promise.all([
      callApi("GET", "/academia/cursos", undefined, tok),
      callApi("GET", "/academia/materias", undefined, tok),
      callApi("GET", "/academia/turmas", undefined, tok),
      listarTodosEstudantes(tok),
      callApi("GET", "/academia/ano-letivo", undefined, tok),
    ]);

    const cursosData: Curso[] = (rCursos.data as any)?.cursos || [];
    const materiasData: Materia[] = (rMaterias.data as any)?.materias?.filter((m: any) => m.status === "ativo") || [];
    const turmasData: Turma[] = (rTurmas.data as any)?.turmas || [];

    setCursos(cursosData);
    setMaterias(materiasData);
    setTurmas(turmasData);
    setEstudantes(estudantesData);

    const anoLetivoAtual = (rAnoLetivo.data as any)?.ano_letivo as string | undefined;
    if (anoLetivoAtual) {
      setAcademia(prev => prev ? { ...prev, ano_letivo: anoLetivoAtual } : prev);
    }

    addLog(
      `Dados atualizados: ${cursosData.length} cursos, ${materiasData.length} matérias ativas, ` +
      `${turmasData.length} turmas, ${estudantesData.length} estudantes` +
      (anoLetivoAtual ? `, ano letivo: ${anoLetivoAtual.replace("_", "/")}` : ""),
      "dim"
    );
  };

  const acompanharJob = async (jobId: string, titulo: string) => {
    addLog(`  ⏳ [${titulo}] Aguardando conclusão do job ${jobId}...`, "info");

    let detail: Awaited<ReturnType<typeof pollJob>>;
    try {
      detail = await pollJob(jobId, {
        timeoutMs: 5 * 60 * 1000,
        onProgress: (summary) => {
          const pct = summary.progress ?? 0;
          const done = summary.done_items ?? 0;
          const fail = summary.fail_items ?? 0;
          const total = summary.total_items ?? 0;
          addLog(
            `  📊 [${titulo}] ${pct}% — ${done} ✓  ${fail > 0 ? `${fail} ✗` : ""}  de ${total}`,
            "dim"
          );
        },
      });
    } catch (pollErr: any) {
      addLog(
        `  ⚠ [${titulo}] Timeout ao acompanhar o job ${jobId} — o processamento continua no servidor.`,
        "warn"
      );
      addLog(
        `  ℹ [${titulo}] Acompanhe o progresso pelo sino de notificações no canto superior direito.`,
        "info"
      );
      return { ok: 0, err: 0, total: 0, timedOut: true };
    }

    const detailResponse = await jobApiService.getDetail(jobId, academia?.token);
    const failures = (detailResponse.results ?? []).filter((item) => !item.sucesso);

    if (failures.length > 0) {
      addLog(`  ⚠ [${titulo}] ${failures.length} item(ns) com falha`, "warn");
      failures.slice(0, 8).forEach((f, i) => {
        const payloadAny = f.payload as any;
        const label =
          payloadAny?.codigo_estudante ||
          payloadAny?.codigo_turma ||
          payloadAny?.codigo ||
          payloadAny?.nome ||
          `item #${(f.index ?? i) + 1}`;
        const motivo = resolveJobItemError(f) || detail.error || "Falha sem detalhe retornado";
        addLog(`    • ${label}: ${motivo}`, "warn");
      });
      if (failures.length > 8) addLog(`    • ...e mais ${failures.length - 8} falha(s)`, "dim");
    }

    if (detail.status === "failed" && detail.error) {
      addLog(`  ✗ [${titulo}] ${detail.error}`, "err");
    }

    const resultado = { ok: detail.done_items, err: detail.fail_items, total: detail.total_items, timedOut: false };
    addLog(
      `  ✓ [${titulo}] Concluído — ${resultado.ok} sucesso${resultado.err > 0 ? ` · ${resultado.err} falha(s)` : ""}`,
      resultado.ok > 0 ? "ok" : "err"
    );
    return resultado;
  };

  const withLoading = async (fn: () => Promise<void>) => {
    setRunning(true);
    cancelRef.current = false;
    try { await fn(); } finally { setRunning(false); }
  };

  const submeterJobAsync = async (
    method: string,
    path: string,
    items: unknown[],
    titulo: string,
  ) => {
    if (!academia) return { ok: 0, err: 0, total: 0, timedOut: false };
    if (items.length === 0) return { ok: 0, err: 0, total: 0, timedOut: false };

    const { ok, data } = await callApi(method, path, items, academia.token);
    if (!ok) {
      const errMsg = (data as any)?.message || (data as any)?.error || "Erro ao submeter job";
      addLog(`  ✗ [${titulo}] ${errMsg}`, "err");
      return { ok: 0, err: items.length, total: items.length, timedOut: false };
    }

    const jobId = (data as any)?.job_id;
    if (!jobId) {
      addLog(`  ✗ [${titulo}] Job ID não retornado`, "err");
      return { ok: 0, err: items.length, total: items.length, timedOut: false };
    }

    addLog(`  Job ${jobId} criado — ${(data as any)?.total_items ?? items.length} item(ns) na fila`, "info");
    return acompanharJob(jobId, titulo);
  };

  // ─── Gerar Cursos ─────────────────────────────────────────────────────────────
  const gerarCursos = async () => {
    if (!academia) return;
    const tiposValidos = tiposCursoValidos(academia);
    if (tiposValidos.length === 0) {
      addLog("  ✗ Esta academia (fundamental) não suporta cursos", "err");
      return;
    }
    const { tipo, qtd } = cursoConfig;
    if (!tiposValidos.find(t => t.value === tipo)) {
      addLog(`  ✗ Tipo de curso "${tipo}" não é válido para esta academia`, "err");
      return;
    }

    const templates = tipo === "medio" ? CURSOS_MEDIO : CURSOS_SUPERIOR;
    const picked = pickN(templates, Math.min(qtd, templates.length));
    const payloads = picked.map(t => ({
      nome: t.nome,
      type: tipo,
      anos_academicos: t.anos,
      ...(tipo === "superior" ? { periodos: (t as any).periodos } : {}),
    }));

    addLog(`Gerando ${payloads.length} curso(s) do tipo ${tipo} via /academia/curso/async...`, "step");
    await submeterJobAsync("POST", "/academia/curso/async", payloads, "Cursos");
    await sleep(3000);
    await refreshData();
    addLog("Cursos gerados ✓", "ok");
  };

  // ─── Gerar Matérias ───────────────────────────────────────────────────────────
  const gerarMaterias = async () => {
    if (!academia) return;
    const tiposValidos = tiposMateriaValidos(academia);
    const { tipo, qtd, cursoId } = materiaConfig;

    if (!tiposValidos.find(t => t.value === tipo)) {
      addLog(`  ✗ Tipo de matéria "${tipo}" não é válido para esta academia (${academia.tipo}/${academia.nivel})`, "err");
      return;
    }

    if (tipo === "medio" || tipo === "superior") {
      const cursoDisponivel = cursoId && cursoId !== "auto"
        ? cursos.find(c => c.id === cursoId && c.type === tipo && c.status === "ativo")
        : cursos.find(c => c.type === tipo && c.status === "ativo");
      if (!cursoDisponivel) {
        addLog(`  ✗ Nenhum curso "${tipo}" ativo disponível — crie e ative cursos primeiro`, "err");
        return;
      }
    }

    addLog(`Gerando ${qtd} matéria(s) do tipo ${tipo}...`, "step");

    const pool = tipo === "fundamental" ? MATERIAS_FUND : tipo === "medio" ? MATERIAS_MEDIO : MATERIAS_SUPERIOR;
    const cursoAlvo = (tipo === "medio" || tipo === "superior")
      ? (cursoId && cursoId !== "auto"
          ? cursos.find(c => c.id === cursoId && c.type === tipo && c.status === "ativo")
          : cursos.find(c => c.type === tipo && c.status === "ativo"))
      : null;

    let anosDisponiveis: string[] = [];
    if (tipo === "fundamental") {
      anosDisponiveis = (academia.anos_academicos || []).filter(a => a.includes("fundamental"));
      if (anosDisponiveis.length === 0) {
        addLog("  ✗ Academia não tem anos fundamentais configurados", "err");
        return;
      }
    } else if (cursoAlvo) {
      anosDisponiveis = cursoAlvo.anos_academicos || [];
    }

    if ((tipo === "medio" || tipo === "superior") && anosDisponiveis.length === 0) {
      addLog(`  ✗ Curso "${cursoAlvo?.nome}" não tem anos académicos configurados`, "err");
      return;
    }

    const materiasExistentesNomes = materias
      .filter(m => m.type === tipo && (cursoAlvo ? m.curso_id === cursoAlvo.id : true))
      .map(m => m.nome.toLowerCase());
    const poolFiltrado = pool.filter(n => !materiasExistentesNomes.includes(n.toLowerCase()));
    if (poolFiltrado.length === 0) {
      addLog("  ✗ Todas as matérias do pool já existem para este tipo/curso", "warn");
      return;
    }

    const picked = pickN(poolFiltrado, Math.min(qtd, poolFiltrado.length));
    let criadas = 0;

    for (const nome of picked) {
      if (cancelRef.current) break;

      const anoSelecionado = pick(anosDisponiveis);
      const payload: any = {
        nome,
        type: tipo,
        anos_academicos: [anoSelecionado],
      };
      if (cursoAlvo) payload.curso_id = cursoAlvo.id;

      const { ok, data } = await callApi("POST", "/academia/materia", payload, academia.token);
      if (!ok) {
        const errMsg = (data as any)?.message || (data as any)?.error || "Erro desconhecido";
        addLog(`  ✗ "${nome}": ${errMsg}`, "warn");
        await sleep(300);
        continue;
      }

      const id = (data as any).data?.id;
      criadas++;
      addLog(`  ✓ Matéria "${nome}" (${anoSelecionado}) ${cursoAlvo ? `→ ${cursoAlvo.nome}` : ""} criada`, "ok");

      if (tipo === "superior" && id && cursoAlvo?.periodos?.length) {
        await sleep(300);
        const periodo = pick(cursoAlvo.periodos);
        const { ok: okP, data: dataP } = await callApi("PUT", `/academia/materia/${id}/periodo`, { periodo }, academia.token);
        if (okP) {
          addLog(`    ✓ Período "${periodo}" definido`, "dim");
          await sleep(300);
          const { ok: okA } = await callApi("PUT", `/academia/materia/${id}/ativar`, {}, academia.token);
          if (okA) addLog(`    ✓ Matéria ativada`, "dim");
          else addLog(`    ! Falha ao ativar`, "warn");
        } else {
          const errP = (dataP as any)?.message || (dataP as any)?.error || "Erro";
          addLog(`    ✗ Falha ao definir período: ${errP}`, "warn");
        }
      } else if (tipo !== "superior" && id) {
        await sleep(300);
        await callApi("PUT", `/academia/materia/${id}/ativar`, {}, academia.token);
      }

      await sleep(300);
    }

    await sleep(3000);
    await refreshData();
    addLog(`${criadas} matéria(s) gerada(s) ✓`, "ok");
  };

  // ─── Gerar Turmas ─────────────────────────────────────────────────────────────
  const gerarTurmas = async () => {
    if (!academia) return;
    const { qtd } = turmaConfig;
    let criadas = 0;

    const niveisDisponiveis: string[] = [];
    if (academia.tipo === "escola") {
      if (academia.nivel === "fundamental" || academia.nivel === "misto") {
        niveisDisponiveis.push(...(academia.anos_academicos?.filter(a => a.includes("fundamental")) || ["1_ano_fundamental"]));
      }
      if (academia.nivel === "medio" || academia.nivel === "misto") {
        const cursosMedio = cursos.filter(c => c.type === "medio" && c.status === "ativo");
        for (const curso of cursosMedio) niveisDisponiveis.push(...curso.anos_academicos);
      }
    } else if (academia.tipo === "superior") {
      const cursosSup = cursos.filter(c => c.type === "superior" && c.status === "ativo");
      for (const curso of cursosSup) niveisDisponiveis.push(...curso.anos_academicos);
    }

    const niveisFiltrados = turmaConfig.niveisSelecionados.length > 0
      ? niveisDisponiveis.filter(nivel => turmaConfig.niveisSelecionados.includes(nivel))
      : niveisDisponiveis;

    if (niveisFiltrados.length === 0) {
      addLog("  ✗ Nenhum nível disponível para criar turmas.", "err");
      return;
    }

    const tipoCurso = academia.tipo === "superior" ? "superior" : "medio";
    const cursosAtivos = cursos.filter(c => c.type === tipoCurso && c.status === "ativo");

    const cursoEspecifico = turmaConfig.cursoId !== "random"
      ? cursosAtivos.find(c => c.id === turmaConfig.cursoId)
      : undefined;

    if (turmaConfig.cursoId !== "random" && !cursoEspecifico) {
      addLog(`  ✗ Curso selecionado não encontrado ou inativo`, "err");
      return;
    }

    const niveisParaGerar = turmaConfig.nivel === "random" && turmaConfig.niveisSelecionados.length > 0
      ? turmaConfig.niveisSelecionados.filter(nivel => niveisFiltrados.includes(nivel))
      : [];
    const totalTurmas = niveisParaGerar.length > 0 ? qtd * niveisParaGerar.length : qtd;
    addLog(`Gerando ${totalTurmas} turma(s) via /academia/turma/async...`, "step");
    const payloads: any[] = [];

    const planoGeracaoNiveis = niveisParaGerar.length > 0
      ? niveisParaGerar.flatMap(nivel => Array.from({ length: qtd }, () => nivel))
      : Array.from({ length: qtd }, () => turmaConfig.nivel === "random" ? pick(niveisFiltrados) : turmaConfig.nivel);

    for (let i = 0; i < planoGeracaoNiveis.length; i++) {
      if (cancelRef.current) break;

      const nivel = planoGeracaoNiveis[i];
      const turno = turmaConfig.turno === "random" ? pick([...TURNOS]) : turmaConfig.turno as typeof TURNOS[number];
      const letra = String.fromCharCode(65 + (i % 26));
      const payload: any = { codigo_turma: `T${rnd(1, 9)}${letra}${rnd(10, 99)}`, nivel, turno };

      if (nivel.includes("medio") || nivel.includes("superior")) {
        let cursoAlvo: Curso | undefined;
        if (cursoEspecifico) {
          cursoAlvo = cursoEspecifico;
        } else if (turmaConfig.cursoId === "random") {
          const cursosCompativeis = cursosAtivos.filter(c => c.anos_academicos.includes(nivel));
          if (cursosCompativeis.length > 0) {
            cursoAlvo = pick(cursosCompativeis);
          } else {
            cursoAlvo = cursosAtivos.length > 0 ? pick(cursosAtivos) : undefined;
          }
        }
        if (cursoAlvo) {
          payload.curso_id = cursoAlvo.id;
          addLog(`  · Turma ${payload.codigo_turma} → ${cursoAlvo.nome} (${nivel})`, "dim");
        }
      }

      payloads.push(payload);
      criadas++;
    }
    const CHUNK_SIZE_TURMA = 200;
    for (let i = 0; i < payloads.length; i += CHUNK_SIZE_TURMA) {
      if (cancelRef.current) break;
      const chunk = payloads.slice(i, i + CHUNK_SIZE_TURMA);
      await submeterJobAsync("POST", "/academia/turma/async", chunk, payloads.length > CHUNK_SIZE_TURMA ? `Turmas ${Math.floor(i / CHUNK_SIZE_TURMA) + 1}` : "Turmas");
    }
    await sleep(2000);
    await refreshData();
    addLog(`${criadas} turma(s) submetida(s) ✓`, "ok");
  };

  // ─── Gerar Estudantes ─────────────────────────────────────────────────────────
  const gerarEstudantes = async () => {
    if (!academia) return;
    const cfg = estudanteConfig;
    const modo = getEscolaMode(academia);

    const cursoMedioAlvo = cfg.cursoMedioId === "random"
      ? cursos.find(c => c.type === "medio" && c.status === "ativo")
      : cursos.find(c => c.id === cfg.cursoMedioId && c.status === "ativo");

    const cursoSuperiorAlvo = cfg.cursoSuperiorId === "random"
      ? cursos.find(c => c.type === "superior" && c.status === "ativo")
      : cursos.find(c => c.id === cfg.cursoSuperiorId && c.status === "ativo");

    const anosF = (academia.anos_academicos || []).filter(a => a.includes("fundamental"));
    const anosFSelecionados = cfg.anosFundamentalSelecionados.length > 0
      ? anosF.filter(a => cfg.anosFundamentalSelecionados.includes(a))
      : anosF;
    const anosMedio = cursoMedioAlvo?.anos_academicos || [];
    const anosMedioSelecionados = cfg.anosMedioSelecionados.length > 0
      ? anosMedio.filter(a => cfg.anosMedioSelecionados.includes(a))
      : anosMedio;
    const anosSuperior = cursoSuperiorAlvo?.anos_academicos || [];
    const anosSuperiorSelecionados = cfg.anosSuperiorSelecionados.length > 0
      ? anosSuperior.filter(a => cfg.anosSuperiorSelecionados.includes(a))
      : anosSuperior;

    if (modo === "fundamental" && anosFSelecionados.length === 0) {
      addLog("Não há anos fundamentais disponíveis para cadastrar estudantes conforme a documentação.", "warn");
      return;
    }
    if (modo === "medio" && (!cursoMedioAlvo || anosMedioSelecionados.length === 0)) {
      addLog("Selecione/crie um curso médio ativo com anos acadêmicos antes de cadastrar estudantes do médio.", "warn");
      return;
    }
    if (modo === "superior" && (!cursoSuperiorAlvo || anosSuperiorSelecionados.length === 0)) {
      addLog("Selecione/crie um curso superior ativo com anos acadêmicos antes de cadastrar estudantes do superior.", "warn");
      return;
    }
    if (modo === "misto") {
      const qtdFundamental = Math.floor(cfg.qtd * cfg.pctFundamental / 100);
      const qtdMedio = cfg.qtd - qtdFundamental;
      if (qtdFundamental > 0 && anosFSelecionados.length === 0) {
        addLog("A geração mista inclui fundamental, mas não há anos fundamentais disponíveis.", "warn");
        return;
      }
      if (qtdMedio > 0 && (!cursoMedioAlvo || anosMedioSelecionados.length === 0)) {
        addLog("A geração mista inclui médio, mas falta curso médio ativo com anos acadêmicos.", "warn");
        return;
      }
    }

    const anosFundamentaisGeracao = cfg.anoFundamental === "random" && cfg.anosFundamentalSelecionados.length > 0
      ? ordenarAnosAcademicos(anosFSelecionados)
      : [];
    const anosMedioGeracao = cfg.anoMedio === "random" && cfg.anosMedioSelecionados.length > 0
      ? ordenarAnosAcademicos(anosMedioSelecionados)
      : [];
    const anosSuperiorGeracao = cfg.anoSuperior === "random" && cfg.anosSuperiorSelecionados.length > 0
      ? ordenarAnosAcademicos(anosSuperiorSelecionados)
      : [];

    const fatorMultiplicador =
      modo === "superior" ? (anosSuperiorGeracao.length || 1)
      : modo === "medio" ? (anosMedioGeracao.length || 1)
      : modo === "fundamental" ? (anosFundamentaisGeracao.length || 1)
      : 1;
    const totalEstudantes = cfg.qtd * fatorMultiplicador;
    addLog(`Gerando ${totalEstudantes} estudante(s) via cadastro em lote (modo: ${modo})...`, "step");

    const bilhetesUsadosCadastro = new Set<string>(estudantes.flatMap(e => [
      e.bilhete_identidade,
      e.bilhete_identidade_encarregado,
    ]).filter(Boolean).map(bi => String(bi).trim().toLowerCase()));
    const telefonesUsadosCadastro = new Set<string>();

    const items: any[] = Array.from({ length: totalEstudantes }, (_, idx) => {
      const { nome, genero } = gerarNome();
      const payload: any = {
        nome,
        genero,
      };

      if (modo === "superior") {
        if (cursoSuperiorAlvo) {
          const anoSuperiorDoItem = anosSuperiorGeracao.length > 0
            ? anosSuperiorGeracao[Math.floor(idx / cfg.qtd) % anosSuperiorGeracao.length]
            : null;
          const ano = cfg.anoSuperior === "random"
            ? (anoSuperiorDoItem || (anosSuperiorSelecionados.length > 0 ? pick(anosSuperiorSelecionados) : "1_ano_superior"))
            : cfg.anoSuperior;
          payload.ano_superior = ano;
          payload.curso_superior_id = cursoSuperiorAlvo.id;
        } else {
          addLog(`  ! Est. #${idx + 1}: nenhum curso superior ativo — criado sem vínculo de curso`, "warn");
        }
      } else if (modo === "medio") {
        if (cursoMedioAlvo && anosMedioSelecionados.length > 0) {
          const anoMedioDoItem = anosMedioGeracao.length > 0
            ? anosMedioGeracao[Math.floor(idx / cfg.qtd) % anosMedioGeracao.length]
            : null;
          const ano = cfg.anoMedio === "random"
            ? (anoMedioDoItem || pick(anosMedioSelecionados))
            : cfg.anoMedio;
          payload.ano_escolar_medio = ano;
          payload.curso_medio_id = cursoMedioAlvo.id;
        } else {
          addLog(`  ! Est. #${idx + 1}: nenhum curso médio ativo — criado sem vínculo de curso`, "warn");
        }
      } else if (modo === "fundamental") {
        if (anosFSelecionados.length > 0) {
          const anoFundamentalDoItem = anosFundamentaisGeracao.length > 0
            ? anosFundamentaisGeracao[Math.floor(idx / cfg.qtd) % anosFundamentaisGeracao.length]
            : null;
          const ano = cfg.anoFundamental === "random"
            ? (anoFundamentalDoItem || pick(anosFSelecionados))
            : cfg.anoFundamental;
          payload.ano_escolar_fundamental = ano;
        }
      } else if (modo === "misto") {
        const isFund = idx < Math.floor(cfg.qtd * cfg.pctFundamental / 100);
        if (isFund) {
          if (anosFSelecionados.length > 0) {
            const ano = cfg.anoFundamental === "random" ? pick(anosFSelecionados) : cfg.anoFundamental;
            payload.ano_escolar_fundamental = ano;
          }
        } else {
          if (cursoMedioAlvo && anosMedioSelecionados.length > 0) {
            const ano = cfg.anoMedio === "random" ? pick(anosMedioSelecionados) : cfg.anoMedio;
            payload.ano_escolar_medio = ano;
            payload.curso_medio_id = cursoMedioAlvo.id;
          }
        }
      }

      const anoAcademico = payload.ano_superior || payload.ano_escolar_medio || payload.ano_escolar_fundamental;
      payload.data_nascimento = gerarDataNascimentoPorAnoAcademico(anoAcademico);
      payload.bilhete_identidade = gerarBilheteIdentidade(bilhetesUsadosCadastro);
      payload.telefone = gerarTelefoneAngola(telefonesUsadosCadastro);

      if (!payload.ano_superior) {
        payload.bilhete_identidade_encarregado = gerarBilheteIdentidade(bilhetesUsadosCadastro);
        payload.telefone_encarregado = gerarTelefoneAngola(telefonesUsadosCadastro);
      }

      if (camposDocumentaisObrigatorios(payload).includes("declaracao")) {
        payload.declaracao_ano_academico = anoAnteriorAcademico(anoAcademico);
      }

      return payload;
    });

    const CHUNK_SIZE_ESTUDANTE = 100;
    const chunks = Array.from({ length: Math.ceil(items.length / CHUNK_SIZE_ESTUDANTE) }, (_, i) =>
      items.slice(i * CHUNK_SIZE_ESTUDANTE, (i + 1) * CHUNK_SIZE_ESTUDANTE)
    );

    let okTotal = 0;
    let errTotal = 0;

    addLog(
      `  Enviando ${items.length} cadastro(s) em ${chunks.length} lote(s) pelo endpoint /academia/estudante/register/async (${cfg.comArquivos ? "multipart com arquivos" : "JSON sem arquivos"})...`,
      "info"
    );

    for (let i = 0; i < chunks.length; i++) {
      if (cancelRef.current) break;

      const chunk = chunks[i];
      addLog(`  📦 Submetendo lote ${i + 1}/${chunks.length} — ${chunk.length} estudante(s)...`, "info");

      let body: unknown;
      if (cfg.comArquivos) {
        const form = new FormData();
        form.append("com_arquivo", "true");
        const estudantesComCodigo = chunk.map((item, index) => ({
          ...item,
          codigo_temporario: `tmp-${Date.now()}-${i + 1}-${index + 1}`,
        }));
        form.append("estudantes", JSON.stringify(estudantesComCodigo));
        estudantesComCodigo.forEach((item) => {
          camposDocumentaisObrigatorios(item).forEach((campo) => {
            form.append(`${item.codigo_temporario}.${campo}`, criarPdfTeste(`${item.codigo_temporario}-${campo}`));
          });
        });
        body = form;
      } else {
        body = { com_arquivo: false, estudantes: chunk };
      }

      const { ok, data, status } = await callApi("POST", "/academia/estudante/register/async", body, academia.token);
      const sucesso = Number((data as any)?.sucesso ?? 0);
      const total = Number((data as any)?.total ?? chunk.length);
      const falhas = Number((data as any)?.falhas ?? (ok ? Math.max(total - sucesso, 0) : chunk.length));

      if (!ok) {
        errTotal += chunk.length;
        const errMsg = (data as any)?.details?.[0]?.message || (data as any)?.message || (data as any)?.error || `Erro ao cadastrar lote (HTTP ${status})`;
        addLog(`  ✗ Erro ao submeter lote ${i + 1}: ${errMsg}`, "err");
        continue;
      }

      okTotal += sucesso;
      errTotal += falhas;
      addLog(`  ✓ Lote ${i + 1}: ${sucesso} sucesso(s), ${falhas} falha(s)`, falhas > 0 ? "warn" : "ok");
      ((data as any)?.items || []).filter((item: any) => !item.sucesso).slice(0, 8).forEach((item: any, idx: number) => {
        addLog(`    • ${item.codigo_temporario || item.codigo_estudante || item.nome || `item #${idx + 1}`}: ${item.erro || item.message || "Falha sem detalhe retornado"}`, "warn");
      });
    }

    addLog(`Estudantes (lotes): ${okTotal} ✓  ${errTotal} ✗`, okTotal > 0 && errTotal === 0 ? "ok" : errTotal > 0 ? "warn" : "err");
    await sleep(3000);
    await refreshData();
  };

  // ─── Regularizar Documentos Pendentes ────────────────────────────────────────
  const regularizarDocumentosPendentes = async () => {
    if (!academia) return;

    addLog("Consultando estudantes com status pendente_documentos...", "step");
    const { ok, data, status } = await callApi("GET", "/estudantes?status=pendente_documentos&limit=100", undefined, academia.token);
    const base = ok ? ((data as any)?.estudantes || []) as Estudante[] : estudantes.filter(e => e.status === "pendente_documentos");

    if (!ok) {
      addLog(`  ⚠ Consulta filtrada falhou (HTTP ${status}); usando os estudantes já carregados na página.`, "warn");
    }
    if (base.length === 0) {
      addLog("Nenhum estudante com pendência documental encontrado.", "ok");
      return;
    }

    let regularizados = 0;
    let falhas = 0;
    addLog(`Encontrados ${base.length} estudante(s) pendente(s); consultando detalhes e documentos faltantes...`, "info");

    for (const resumido of base) {
      if (cancelRef.current) break;
      const codigo = resumido.codigo_estudante;
      const detalheResp = await callApi("GET", `/consultar-estudante/${encodeURIComponent(codigo)}`, undefined, academia.token);
      const estudanteDetalhado = (detalheResp.ok ? ((detalheResp.data as any)?.estudante || detalheResp.data) : resumido) as Estudante;
      const estudanteAlvo = { ...resumido, ...estudanteDetalhado };
      const campos = camposDocumentaisParaRegularizacao(estudanteAlvo);

      if (campos.length === 0) {
        addLog(`  • ${codigo}: sem documentos pendentes detectados após consulta detalhada.`, "dim");
        continue;
      }

      const form = new FormData();
      const anoAtual = estudanteAlvo.ano_superior || estudanteAlvo.ano_escolar_medio || estudanteAlvo.ano_escolar_fundamental;
      const anoAnterior = anoAnteriorAcademico(anoAtual);
      campos.forEach(campo => form.append(campo, criarPdfTeste(`${codigo}-${campo}`)));
      if (campos.includes("declaracao") && anoAnterior) form.append("declaracao_ano_academico", anoAnterior);

      const labels = campos.map(c => DOCUMENT_LABELS[c] || c).join(", ");
      addLog(`  → ${codigo} (${estudanteAlvo.nome}): gerando PDF(s) para ${labels} e enviando pela rota /academia/estudante/{codigo}/documentos...`, "info");
      const envio = await callApi("POST", `/academia/estudante/${encodeURIComponent(codigo)}/documentos`, form, academia.token);

      if (envio.ok) {
        regularizados++;
        const novoStatus = (envio.data as any)?.status || "ativo";
        addLog(`    ✓ Documentos adicionados; status retornado: ${novoStatus}`, "ok");
      } else {
        falhas++;
        const msg = (envio.data as any)?.message || (envio.data as any)?.error || `HTTP ${envio.status}`;
        addLog(`    ✗ Falha ao adicionar documentos: ${msg}`, "err");
      }

      await sleep(300);
    }

    addLog(`Regularização documental concluída: ${regularizados} estudante(s) ativo(s), ${falhas} falha(s).`, falhas > 0 ? "warn" : "ok");
    await sleep(1500);
    await refreshData();
  };

  // ─── Vincular Estudantes a Turmas ─────────────────────────────────────────────
  const vincularEstudantesATurmas = async () => {
    if (!academia || turmas.length === 0 || estudantes.length === 0) {
      addLog("Sem turmas ou estudantes disponíveis", "warn");
      return;
    }

    addLog("Consultando todas as páginas de estudantes antes de calcular quem está sem turma...", "info");
    const estudantesAtualizados = await listarTodosEstudantes(academia.token);
    if (estudantesAtualizados.length > estudantes.length) {
      setEstudantes(estudantesAtualizados);
    }

    const baseEstudantes = estudantesAtualizados.length > 0 ? estudantesAtualizados : estudantes;
    const estudantesEmTurma = new Set(turmas.flatMap(t => t.estudantes));
    const semTurma = baseEstudantes.filter(e => !estudantesEmTurma.has(e.codigo_estudante));

    if (semTurma.length === 0) {
      addLog("Todos os estudantes já estão vinculados a alguma turma", "info");
      return;
    }

    const turmasAtivas = turmas.filter(t => t.status !== "inativo" && t.status !== "deletado");

    if (turmasAtivas.length === 0) {
      addLog("Nenhuma turma ativa disponível", "err");
      return;
    }

    addLog(`Vinculando ${semTurma.length} estudante(s) sem turma — modo compatível...`, "step");
    addLog(`  Regra: estudante só é vinculado a turma compatível com seu ano e curso`, "dim");

    const academiaAnosAcademicos = academia.anos_academicos || [];

    const turmasAlvo = vincularConfig.turmaCodigo !== "random"
      ? turmasAtivas.filter(t => t.codigo_turma === vincularConfig.turmaCodigo)
      : turmasAtivas;

    if (turmasAlvo.length === 0) {
      addLog(`Turma "${vincularConfig.turmaCodigo}" não encontrada ou inativa`, "err");
      return;
    }

    const items: { codigo_turma: string; codigo_estudante: string }[] = [];
    let semTurmaCompativel = 0;

    const turmaIndexMap = new Map<string, number>();

    for (const est of semTurma) {
      if (cancelRef.current) break;

      const turmasCompativeis = turmasAlvo.filter(t =>
        estudanteCompatívelComTurma(est, t, academiaAnosAcademicos)
      );

      if (turmasCompativeis.length === 0) {
        addLog(
          `  ! ${est.codigo_estudante}: nenhuma turma compatível encontrada` +
          ` (ano_escolar_fundamental=${est.ano_escolar_fundamental || est.ano_escolar_medio || est.ano_superior || "?"}` +
          ` curso=${est.curso_medio_id || est.curso_superior_id || "—"})`,
          "warn"
        );
        semTurmaCompativel++;
        continue;
      }

      const chaveGrupo = turmasCompativeis.map(t => t.codigo_turma).sort().join(",");
      const idx = (turmaIndexMap.get(chaveGrupo) ?? 0) % turmasCompativeis.length;
      turmaIndexMap.set(chaveGrupo, idx + 1);

      const turmaEscolhida = turmasCompativeis[idx];
      items.push({
        codigo_turma: turmaEscolhida.codigo_turma,
        codigo_estudante: est.codigo_estudante,
      });
    }

    if (semTurmaCompativel > 0) {
      addLog(
        `  ⚠ ${semTurmaCompativel} estudante(s) sem turma compatível — verifique se existem turmas` +
        ` com o mesmo nível e curso dos estudantes`,
        "warn"
      );
    }

    if (items.length === 0) {
      addLog("Nenhum vínculo compatível para realizar. Crie turmas com os níveis corretos primeiro.", "err");
      return;
    }

    const distribuicao = items.reduce<Record<string, number>>((acc, v) => {
      acc[v.codigo_turma] = (acc[v.codigo_turma] || 0) + 1;
      return acc;
    }, {});
    Object.entries(distribuicao).forEach(([turma, qtd]) => {
      addLog(`    • ${turma}: ${qtd} estudante(s)`, "dim");
    });

    const BATCH_MAX_VINCULO = 1000;
    const lotesVinculo = Array.from({ length: Math.ceil(items.length / BATCH_MAX_VINCULO) }, (_, i) =>
      items.slice(i * BATCH_MAX_VINCULO, (i + 1) * BATCH_MAX_VINCULO)
    );

    let okTotal = 0;
    let errTotal = 0;

    for (let i = 0; i < lotesVinculo.length; i++) {
      if (cancelRef.current) break;
      const lote = lotesVinculo[i];
      addLog(`  Enviando lote ${i + 1}/${lotesVinculo.length} (${lote.length} vínculo(s))...`, "info");

      const { ok, data } = await callApi("POST", "/academia/turma/estudante/async", lote, academia.token);
      if (!ok) {
        const errMsg = (data as any)?.message || (data as any)?.error || "Erro ao submeter";
        addLog(`  ✗ Erro no lote ${i + 1}: ${errMsg}`, "err");
        return;
      }
      const jobId = (data as any)?.job_id;
      if (!jobId) { addLog(`  ✗ Job ID não retornado no lote ${i + 1}`, "err"); return; }
      addLog(`  Job ${jobId} criado — ${lote.length} vínculo(s) na fila`, "info");

      const result = await acompanharJob(jobId, `Vínculos [lote ${i + 1}]`);
      if (!result.timedOut) {
        okTotal += result.ok;
        errTotal += result.err;
      }
    }

    if (okTotal > 0 || errTotal > 0) {
      addLog(`Vínculos (total): ${okTotal} ✓  ${errTotal} ✗`, okTotal > 0 ? "ok" : "err");
    }
    await sleep(2000);
    await refreshData();
  };

  // ─── Buscar registros existentes de notas via GET /notas (paginado) ───────────
  const fetchNotasExistentes = async (
    anoLetivo: string,
    logPrefix: string
  ): Promise<Set<string>> => {
    const notasExistentes = new Set<string>();
    const LIMIT = 100;
    let offset = 0;
    let totalGeral = 0;
    let pagina = 1;

    addLog(`  ${logPrefix} Buscando notas existentes via GET /notas (paginado)...`, "info");

    while (true) {
      if (cancelRef.current) break;

      const { ok, data } = await callApi(
        "GET",
        `/notas?limit=${LIMIT}&offset=${offset}`,
        undefined,
        academia!.token
      );

      if (!ok) {
        const errMsg = (data as any)?.message || (data as any)?.error || "Erro ao buscar notas";
        addLog(`  ✗ ${logPrefix} Falha ao buscar notas (offset ${offset}): ${errMsg}`, "warn");
        break;
      }

      const notas: any[] = (data as any)?.notas || [];
      totalGeral = (data as any)?.total_geral ?? totalGeral;

      for (const n of notas) {
        if (n.ano_lectivo === anoLetivo) {
          const key = `${n.codigo_estudante}|${n.ano_lectivo}|${n.materia_disciplinar_id}|${n.periodo}|${n.tipo}|${n.categoria}`;
          notasExistentes.add(key);
        }
      }

      addLog(
        `  ${logPrefix} Página ${pagina}: ${notas.length} registros lidos` +
        (totalGeral > 0 ? ` (${notasExistentes.size} do ano letivo ${anoLetivo} de ${totalGeral} total)` : ""),
        "dim"
      );

      if (notas.length < LIMIT) break;
      offset += LIMIT;
      pagina++;

      await sleep(200);
    }

    addLog(
      `  ${logPrefix} Notas existentes indexadas: ${notasExistentes.size} registros do ano letivo ${anoLetivo}`,
      "dim"
    );

    return notasExistentes;
  };

  // ─── Buscar registros existentes de faltas via GET /faltas (paginado) ─────────
  const fetchFaltasExistentes = async (
    anoLetivo: string,
    logPrefix: string
  ): Promise<Set<string>> => {
    const faltasExistentes = new Set<string>();
    const LIMIT = 100;
    let offset = 0;
    let totalGeral = 0;
    let pagina = 1;

    addLog(`  ${logPrefix} Buscando faltas existentes via GET /faltas (paginado)...`, "info");

    while (true) {
      if (cancelRef.current) break;

      const { ok, data } = await callApi(
        "GET",
        `/faltas?limit=${LIMIT}&offset=${offset}`,
        undefined,
        academia!.token
      );

      if (!ok) {
        const errMsg = (data as any)?.message || (data as any)?.error || "Erro ao buscar faltas";
        addLog(`  ✗ ${logPrefix} Falha ao buscar faltas (offset ${offset}): ${errMsg}`, "warn");
        break;
      }

      const faltas: any[] = (data as any)?.faltas || [];
      totalGeral = (data as any)?.total_geral ?? totalGeral;

      for (const f of faltas) {
        if (f.ano_lectivo === anoLetivo) {
          const key = `${f.codigo_estudante}|${f.materia_disciplinar_id}|${f.data}`;
          faltasExistentes.add(key);
        }
      }

      addLog(
        `  ${logPrefix} Página ${pagina}: ${faltas.length} registros lidos` +
        (totalGeral > 0 ? ` (${faltasExistentes.size} do ano letivo ${anoLetivo} de ${totalGeral} total)` : ""),
        "dim"
      );

      if (faltas.length < LIMIT) break;
      offset += LIMIT;
      pagina++;

      await sleep(200);
    }

    addLog(
      `  ${logPrefix} Faltas existentes indexadas: ${faltasExistentes.size} registros do ano letivo ${anoLetivo}`,
      "dim"
    );

    return faltasExistentes;
  };

  // ─── Gerar Notas ──────────────────────────────────────────────────────────────
  const gerarNotas = async () => {
    if (!academia || materias.length === 0 || estudantes.length === 0) {
      addLog("Sem matérias ou estudantes — crie-os primeiro", "warn");
      return;
    }
    if (!academia.ano_letivo) { addLog("Academia sem ano letivo configurado", "err"); return; }

    const tipoNota = academia.tipo === "superior" ? "superior" : "escolar";
    const categoriasAtivas = tipoNota === "escolar" ? categoriaEscolarSel : categoriaSuperiorSel;

    if (categoriasAtivas.length === 0) {
      addLog("Nenhuma categoria de nota selecionada", "warn");
      return;
    }

    const tiposMateriasCompativeis = academia.tipo === "superior"
      ? ["superior"]
      : ["fundamental", "medio"];

    const { qtdEstudantes, periodo: periodoConfig } = notaConfig;
    const total = qtdEstudantes > 0 ? Math.min(qtdEstudantes, estudantes.length) : estudantes.length;
    const sample = estudantes.slice(0, total);

    addLog(`Gerando notas para ${sample.length} estudante(s) — tipo: ${tipoNota}, categorias: ${categoriasAtivas.join(", ")}`, "step");

    const notasExistentes = await fetchNotasExistentes(academia.ano_letivo, "Fase 1/2:");

    if (cancelRef.current) return;

    addLog(`  Fase 2/2: montando batch para ${sample.length} estudante(s)...`, "info");

    const periodosEscolares = ["1_trimestre", "2_trimestre", "3_trimestre"];
    const batch: any[] = [];
    const batchDedup = new Set<string>();

    let totalSkippedServer = 0;
    let totalSkippedBatch = 0;

    const materiasTipo = materias.filter(m => tiposMateriasCompativeis.includes(m.type));
    if (materiasTipo.length === 0) {
      addLog(`  ✗ Nenhuma matéria ativa compatível (tipos esperados: ${tiposMateriasCompativeis.join(", ")})`, "err");
      return;
    }

    for (let i = 0; i < sample.length; i++) {
      if (cancelRef.current) break;

      const est = sample[i];

      const anoAcademico = getAnoAcademicoEstudante(est, academia);
      if (!anoAcademico) continue;

      const materiasDoAno = materiasTipo.filter(mat => {
        if (academia.tipo === "superior") {
          return !!mat.curso_id && mat.anos_academicos?.includes(anoAcademico) && mat.curso_id === est.curso_superior_id;
        }
        if (anoAcademico.includes("medio")) {
          return mat.type === "medio"
            && !!mat.curso_id
            && mat.curso_id === est.curso_medio_id
            && mat.anos_academicos?.includes(anoAcademico);
        }
        return mat.type === "fundamental" && mat.anos_academicos?.includes(anoAcademico);
      });

      if (materiasDoAno.length === 0) continue;

      const numMaterias = Math.min(3, materiasDoAno.length);
      const startIdx = i % materiasDoAno.length;
      const materiasSample: Materia[] = [];
      for (let m = 0; m < numMaterias; m++) {
        materiasSample.push(materiasDoAno[(startIdx + m) % materiasDoAno.length]);
      }

      for (const mat of materiasSample) {
        let periodos: string[];

        if (academia.tipo === "superior") {
          if (mat.periodo) {
            periodos = [mat.periodo];
          } else {
            const cursoMat = cursos.find(c => c.id === mat.curso_id);
            const cursoPeriodos = cursoMat?.periodos || [];
            periodos = cursoPeriodos.length > 0 ? [cursoPeriodos[0]] : ["1_semestre"];
            addLog(
              `  ⚠ Matéria "${mat.nome}" sem período definido — usando "${periodos[0]}" como fallback`,
              "warn"
            );
          }
        } else {
          periodos = periodoConfig !== "random" ? [periodoConfig] : periodosEscolares;
        }

        for (const p of periodos) {
          const categoriasParaPeriodo = getCategoriasPermitidasParaNota(tipoNota, anoAcademico, p, categoriasAtivas);

          if (categoriasParaPeriodo.length === 0) {
            addLog(
              `  ℹ ${est.codigo_estudante} (${anoAcademico}, ${p}): categorias selecionadas não se aplicam a este nível/modelo de avaliação`,
              "dim"
            );
            continue;
          }

          for (const categoria of categoriasParaPeriodo) {
            const key = `${est.codigo_estudante}|${academia.ano_letivo}|${mat.id}|${p}|${tipoNota}|${categoria}`;

            if (notasExistentes.has(key)) {
              totalSkippedServer++;
              continue;
            }

            if (batchDedup.has(key)) {
              totalSkippedBatch++;
              continue;
            }

            batchDedup.add(key);
            batch.push({
              codigo_estudante: est.codigo_estudante,
              periodo: p,
              materia_disciplinar_id: mat.id,
              tipo: tipoNota,
              categoria,
              nota: getNotaAleatoria(anoAcademico),
            });
          }
        }
      }
    }

    if (totalSkippedServer > 0) {
      addLog(`  ℹ ${totalSkippedServer} nota(s) já existiam no servidor — ignoradas`, "dim");
    }
    if (totalSkippedBatch > 0) {
      addLog(`  ℹ ${totalSkippedBatch} nota(s) duplicadas no batch — ignoradas`, "dim");
    }

    if (batch.length === 0) {
      addLog(
        "Nenhuma nota nova para registrar — todas já existem ou nenhuma matéria compatível encontrada",
        "info"
      );
      return;
    }

    addLog(`  Total a registrar: ${batch.length} nota(s) novas`, "info");

    const CHUNK_SIZE = 2000;
    const chunks: any[][] = [];
    for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
      chunks.push(batch.slice(i, i + CHUNK_SIZE));
    }

    addLog(
      `  Submetendo ${batch.length} nota(s) em ${chunks.length} job(s) de até ${CHUNK_SIZE} itens...`,
      "info"
    );

    let totalOk = 0;
    let totalErr = 0;

    for (let ci = 0; ci < chunks.length; ci++) {
      if (cancelRef.current) break;
      const chunk = chunks[ci];
      const label = chunks.length > 1 ? `Notas ${ci + 1}/${chunks.length}` : "Notas";
      addLog(`  📦 Submetendo job ${ci + 1}/${chunks.length} — ${chunk.length} nota(s)...`, "info");

      const { ok, data } = await callApi("POST", "/academia/notas-aluno/async", chunk, academia.token);
      if (!ok) {
        const errMsg = (data as any)?.message || (data as any)?.error || "Erro ao submeter";
        addLog(`  ✗ Erro no job ${ci + 1}: ${errMsg}`, "err");
        addLog(`  ℹ Verifique as notificações para jobs que possam ter sido criados.`, "info");
        break;
      }

      const jobId = (data as any)?.job_id;
      if (!jobId) { addLog(`  ✗ Job ID não retornado (chunk ${ci + 1})`, "err"); break; }
      addLog(`  Job ${jobId} criado — ${chunk.length} nota(s) na fila`, "dim");

      const result = await acompanharJob(jobId, label);
      if (!result.timedOut) {
        totalOk += result.ok;
        totalErr += result.err;
      }

      if (ci < chunks.length - 1 && !cancelRef.current) await sleep(500);
    }

    addLog(
      `Notas concluídas: ${totalOk} ✓  ${totalErr > 0 ? `${totalErr} ✗  ` : ""}(${batch.length} total)`,
      totalOk > 0 ? "ok" : "err"
    );
  };

  // ─── Gerar Faltas ─────────────────────────────────────────────────────────────
  const gerarFaltas = async () => {
    if (!academia || materias.length === 0 || estudantes.length === 0) {
      addLog("Sem matérias ou estudantes", "warn");
      return;
    }
    if (!academia.ano_letivo) { addLog("Academia sem ano letivo configurado", "err"); return; }

    const { qtdEstudantes } = faltaConfig;
    const total = qtdEstudantes > 0 ? Math.min(qtdEstudantes, estudantes.length) : estudantes.length;
    const sample = estudantes.slice(0, total);
    addLog(`Gerando faltas para ${sample.length} estudante(s) via async...`, "step");

    const tiposMateriasCompativeisFalta = academia.tipo === "superior"
      ? ["superior"]
      : ["fundamental", "medio"];
    const materiasTipo = materias.filter(m => tiposMateriasCompativeisFalta.includes(m.type));

    if (materiasTipo.length === 0) {
      addLog(`  ✗ Nenhuma matéria ativa compatível com esta academia (${academia.tipo}/${academia.nivel || "—"})`, "err");
      return;
    }

    const faltasExistentes = await fetchFaltasExistentes(academia.ano_letivo, "Fase 1/2:");

    if (cancelRef.current) return;

    addLog(`  Fase 2/2: montando batch para ${sample.length} estudante(s)...`, "info");

    const batch: any[] = [];
    const batchDedup = new Set<string>();
    let totalSkippedServer = 0;
    let totalSkippedBatch = 0;

    for (let i = 0; i < sample.length; i++) {
      if (cancelRef.current) break;

      const est = sample[i];
      const anoAcademico = getAnoAcademicoEstudante(est, academia);
      if (!anoAcademico) continue;

      const materiasDoAno = materiasTipo.filter(mat => {
        if (academia.tipo === "superior") {
          return !!mat.curso_id && mat.anos_academicos?.includes(anoAcademico) && mat.curso_id === est.curso_superior_id;
        }
        if (anoAcademico.includes("medio")) {
          return mat.type === "medio"
            && !!mat.curso_id
            && mat.curso_id === est.curso_medio_id
            && mat.anos_academicos?.includes(anoAcademico);
        }
        return mat.type === "fundamental" && mat.anos_academicos?.includes(anoAcademico);
      });

      if (materiasDoAno.length === 0) continue;
      const materiasSample = pickN(materiasDoAno, Math.min(2, materiasDoAno.length));

      for (const mat of materiasSample) {
        const dataFalta = pick(DATAS_FALTA);
        const key = `${est.codigo_estudante}|${mat.id}|${dataFalta}`;

        if (faltasExistentes.has(key)) {
          totalSkippedServer++;
          continue;
        }
        if (batchDedup.has(key)) {
          totalSkippedBatch++;
          continue;
        }

        batchDedup.add(key);
        batch.push({
          codigo_estudante: est.codigo_estudante,
          data: dataFalta,
          materia_disciplinar_id: mat.id,
          quantidade: rnd(1, 3),
        });
      }
    }

    if (totalSkippedServer > 0) {
      addLog(`  ℹ ${totalSkippedServer} falta(s) já existiam no servidor — ignoradas`, "dim");
    }
    if (totalSkippedBatch > 0) {
      addLog(`  ℹ ${totalSkippedBatch} falta(s) duplicadas no batch — ignoradas`, "dim");
    }

    if (batch.length === 0) {
      addLog("Nenhuma falta nova para registrar (todas já existem para estas datas/matérias)", "info");
      return;
    }

    const CHUNK_SIZE_FALTA = 2000;
    const chunksFalta: any[][] = [];
    for (let i = 0; i < batch.length; i += CHUNK_SIZE_FALTA) {
      chunksFalta.push(batch.slice(i, i + CHUNK_SIZE_FALTA));
    }

    addLog(
      `  Submetendo ${batch.length} falta(s) em ${chunksFalta.length} job(s) de até ${CHUNK_SIZE_FALTA} itens...`,
      "info"
    );

    let totalOkFalta = 0;
    let totalErrFalta = 0;

    for (let ci = 0; ci < chunksFalta.length; ci++) {
      if (cancelRef.current) break;
      const chunk = chunksFalta[ci];
      const label = chunksFalta.length > 1 ? `Faltas ${ci + 1}/${chunksFalta.length}` : "Faltas";
      addLog(`  📦 Submetendo job ${ci + 1}/${chunksFalta.length} — ${chunk.length} falta(s)...`, "info");

      const { ok, data } = await callApi("POST", "/academia/faltas-aluno/async", chunk, academia.token);
      if (!ok) {
        const errMsg = (data as any)?.message || (data as any)?.error || "Erro ao submeter";
        addLog(`  ✗ Erro no job ${ci + 1}: ${errMsg}`, "err");
        addLog(`  ℹ Verifique as notificações para jobs que possam ter sido criados.`, "info");
        break;
      }

      const jobId = (data as any)?.job_id;
      if (!jobId) { addLog(`  ✗ Job ID não retornado (chunk ${ci + 1})`, "err"); break; }
      addLog(`  Job ${jobId} criado — ${chunk.length} falta(s) na fila`, "dim");

      const result = await acompanharJob(jobId, label);
      if (!result.timedOut) {
        totalOkFalta += result.ok;
        totalErrFalta += result.err;
      }

      if (ci < chunksFalta.length - 1 && !cancelRef.current) await sleep(500);
    }

    addLog(
      `Faltas concluídas: ${totalOkFalta} ✓  ${totalErrFalta > 0 ? `${totalErrFalta} ✗  ` : ""}(${batch.length} total)`,
      totalOkFalta > 0 ? "ok" : "err"
    );
  };

  // ─── Configurar Ano Letivo ─────────────────────────────────────────────────────
  const configurarAnoLetivo = async () => {
    if (!academia) return;
    const tipo = academia.tipo === "superior" ? "superior" : "escola";
    const { ok, data } = await callApi("POST", "/academia/definir-ano-letivo", {}, academia.token);
    if (ok) {
      const ano = (data as any)?.ano_letivo || academia.ano_letivo || "ano global";
      addLog(`Ano letivo ${String(ano).replace("_", "/")} (tipo inferido: ${tipo}) configurado ✓`, "ok");
      setAcademia(prev => prev ? { ...prev, ano_letivo: (data as any)?.ano_letivo || prev.ano_letivo } : prev);
    } else {
      const errMsg = (data as any)?.message || (data as any)?.error || "Erro desconhecido";
      addLog(`Ano letivo: ${errMsg}`, "warn");
    }
  };

  // ─── Derived ──────────────────────────────────────────────────────────────────

  const estudantesEmTurmaSet = new Set(turmas.flatMap(t => t.estudantes));
  const estudantesSemTurma = estudantes.filter(e => !estudantesEmTurmaSet.has(e.codigo_estudante));

  const academiaAnosAcademicosLocal = academia?.anos_academicos || [];
  const turmasAtivas = turmas.filter(t => t.status !== "inativo" && t.status !== "deletado");
  const estudantesSemTurmaComCompativeis = estudantesSemTurma.filter(est =>
    turmasAtivas.some(t => estudanteCompatívelComTurma(est, t, academiaAnosAcademicosLocal))
  );
  const estudantesSemCompatibilidade = estudantesSemTurma.length - estudantesSemTurmaComCompativeis.length;

  const tiposCursoDisp = academia ? tiposCursoValidos(academia) : [];
  const tiposMateriaDisp = academia ? tiposMateriaValidos(academia) : [];
  const anosDispFundamental = academia?.anos_academicos?.filter(a => a.includes("fundamental")) || [];
  const modo = academia ? getEscolaMode(academia) : "fundamental";

  const tipoCursoTurma = academia?.tipo === "superior" ? "superior" : "medio";
  const cursosParaTurma = cursos.filter(c => c.type === tipoCursoTurma && c.status === "ativo");
  const cursosMedioAtivos = cursos.filter(c => c.type === "medio" && c.status === "ativo");
  const cursosSuperiorAtivos = cursos.filter(c => c.type === "superior" && c.status === "ativo");

  const niveisParaTurma: string[] = (() => {
    const cursoEscolhido = turmaConfig.cursoId !== "random"
      ? cursosParaTurma.find(c => c.id === turmaConfig.cursoId)
      : undefined;
    if (cursoEscolhido) return cursoEscolhido.anos_academicos;
    const pool: string[] = [];
    if (academia?.tipo === "escola") {
      if (academia.nivel === "fundamental" || academia.nivel === "misto") {
        pool.push(...(academia.anos_academicos?.filter(a => a.includes("fundamental")) || []));
      }
      if (academia.nivel === "medio" || academia.nivel === "misto") {
        for (const c of cursosParaTurma) pool.push(...c.anos_academicos);
      }
    } else if (academia?.tipo === "superior") {
      for (const c of cursosParaTurma) pool.push(...c.anos_academicos);
    }
    return [...new Set(pool)];
  })();

  const tipoNota = academia?.tipo === "superior" ? "superior" : "escolar";
  const tiposMateriaParaNota = academia?.tipo === "superior" ? ["superior"] : ["fundamental", "medio"];
  const categoriasDisponiveis = tipoNota === "escolar" ? CATEGORIAS_ESCOLAR : CATEGORIAS_SUPERIOR;
  const categoriasAtivas = tipoNota === "escolar" ? categoriaEscolarSel : categoriaSuperiorSel;
  const setCategoriasAtivas = tipoNota === "escolar" ? setCategoriaEscolarSel : setCategoriaSuperiorSel;

  // ─── Render helpers ────────────────────────────────────────────────────────────

  const logColors: Record<LogLevel, string> = {
    ok: "#4ade80", err: "#f87171", warn: "#facc15", info: "#94a3b8", step: "#60a5fa", dim: "#475569"
  };
  const logIcons: Record<LogLevel, string> = { ok: "✓", err: "✗", warn: "!", info: "·", step: "▶", dim: "·" };

  if (authError) {
    return (
      <div style={{ minHeight: "100vh", background: "#020817", color: "#e2e8f0", padding: 24, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#f87171", marginBottom: 12 }}>Acesso Restrito</h1>
          <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>{authError}</p>
        </div>
      </div>
    );
  }

  if (!academia) {
    return (
      <div style={{ minHeight: "100vh", background: "#020817", color: "#e2e8f0", padding: 24, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 14, color: "#475569" }}>Carregando dados da academia...</div>
      </div>
    );
  }

  const Section = ({ title, children, badge }: { title: string; children: React.ReactNode; badge?: string }) => (
    <div style={{ border: "1px solid #1e293b", borderRadius: 12, padding: 20, background: "#0f172a", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.05em", textTransform: "uppercase" }}>{title}</h3>
        {badge && <span style={{ fontSize: 11, padding: "2px 8px", background: "#1e3a5f", color: "#60a5fa", borderRadius: 20, fontWeight: 600 }}>{badge}</span>}
      </div>
      {children}
    </div>
  );

  const SubSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ border: "1px solid #1e3a5f", borderRadius: 8, padding: "12px 14px", background: "#0a1929", marginBottom: 12 }}>
      <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</p>
      {children}
    </div>
  );

  const Row = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>{children}</div>
  );

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 140 }}>
      <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      {children}
    </div>
  );

  const Sel = (props: React.SelectHTMLAttributes<HTMLSelectElement> & { style?: React.CSSProperties }) => (
    <select {...props} style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8, padding: "6px 10px", fontSize: 13, cursor: "pointer", height: 34, ...props.style }} />
  );

  const Btn = ({ onClick, children, color = "#2563eb", disabled = false }: { onClick: () => void; children: React.ReactNode; color?: string; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled || running} style={{ background: disabled || running ? "#1e293b" : color, color: disabled || running ? "#475569" : "#fff", border: "none", borderRadius: 8, padding: "0 18px", height: 34, fontSize: 13, fontWeight: 600, cursor: disabled || running ? "not-allowed" : "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}>
      {children}
    </button>
  );

  const periodosNotaDisponiveis = academia.tipo !== "superior" ? [
    { value: "random", label: "Todos os trimestres" },
    { value: "1_trimestre", label: "1º Trimestre" },
    { value: "2_trimestre", label: "2º Trimestre" },
    { value: "3_trimestre", label: "3º Trimestre" },
  ] : [];

  const anosMedioParaConfig = cursosMedioAtivos.length > 0
    ? (estudanteConfig.cursoMedioId === "random"
        ? cursosMedioAtivos[0]?.anos_academicos || []
        : cursos.find(c => c.id === estudanteConfig.cursoMedioId)?.anos_academicos || [])
    : [];

  const anosSuperiorParaConfig = cursosSuperiorAtivos.length > 0
    ? (estudanteConfig.cursoSuperiorId === "random"
        ? cursosSuperiorAtivos[0]?.anos_academicos || []
        : cursos.find(c => c.id === estudanteConfig.cursoSuperiorId)?.anos_academicos || [])
    : [];

  const totalEstudantesNota = notaConfig.qtdEstudantes > 0 ? Math.min(notaConfig.qtdEstudantes, estudantes.length) : estudantes.length;
  const periodosMult = academia?.tipo === "superior" ? 1 : (notaConfig.periodo === "random" ? 3 : 1);
  const materiasParaNota = materias.filter(m => tiposMateriaParaNota.includes(m.type));
  const numMateriasPorEstudante = Math.min(3, materiasParaNota.length);
  const estimativaNota = totalEstudantesNota * numMateriasPorEstudante * categoriasAtivas.length * periodosMult;

  return (
    <div style={{ minHeight: "100vh", background: "#020817", color: "#e2e8f0", padding: 24, fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" }}>
      <style>{`
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em" }}>
            <span style={{ color: "#3b82f6" }}>⬡</span> Painel de Testes
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
            Academia: <span style={{ color: "#60a5fa", fontWeight: 700 }}>{academia.codigo}</span>
            {" · "}{academia.tipo}{academia.nivel ? ` · ${academia.nivel}` : ""}
            {academia.ano_letivo ? ` · Ano letivo: ${academia.ano_letivo.replace("_", "/")}` : " · ⚠ sem ano letivo"}
            {" · "}<span style={{ color: "#facc15" }}>⚡ Modo Assíncrono</span>
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>
          {/* ─── Estado ──────────────────────────────────────────────────── */}
          <div>
            <Section title="Estado atual">
              {[
                { label: "Cursos", val: cursos.length, icon: "📚" },
                { label: "Matérias ativas", val: materias.length, icon: "📖" },
                { label: "Turmas", val: turmas.length, icon: "🏫" },
                { label: "Estudantes", val: estudantes.length, icon: "👥" },
                { label: "Sem turma", val: estudantesSemTurma.length, icon: "⚠️", warn: estudantesSemTurma.length > 0 },
                ...(estudantesSemCompatibilidade > 0 ? [{ label: "Sem turma compatível", val: estudantesSemCompatibilidade, icon: "🔴", warn: true }] : []),
              ].map(s => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>{s.icon} {s.label}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: (s as any).warn ? "#facc15" : s.val > 0 ? "#4ade80" : "#ef4444" }}>{s.val}</span>
                </div>
              ))}
              <div style={{ marginTop: 12 }}>
                <Row>
                  <Btn onClick={() => withLoading(async () => { await configurarAnoLetivo(); })} color="#0f4c75">
                    {academia.ano_letivo ? "✓ Ano letivo ok" : "Configurar ano letivo"}
                  </Btn>
                  <Btn onClick={() => refreshData()} color="#334155">↻ Atualizar</Btn>
                </Row>
              </div>
            </Section>

            {turmas.length > 0 && estudantesSemTurma.length > 0 && (
              <div style={{ border: "1px solid #1e3a5f", borderRadius: 8, padding: 12, background: "#0a1929", fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>
                <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#60a5fa" }}>ℹ Regra de vínculo</p>
                <p style={{ margin: 0 }}>
                  Estudantes só são vinculados a turmas do <strong style={{ color: "#94a3b8" }}>mesmo nível e curso</strong>.
                  {estudantesSemCompatibilidade > 0 && (
                    <span style={{ color: "#facc15" }}> {estudantesSemCompatibilidade} estudante(s) não têm turma compatível — crie turmas adequadas.</span>
                  )}
                </p>
              </div>
            )}

            <div style={{ border: "1px solid #1e3a5f", borderRadius: 8, padding: 12, background: "#0a1929", fontSize: 11, color: "#64748b", lineHeight: 1.6, marginTop: 12 }}>
              <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#60a5fa" }}>ℹ Criação em lote</p>
              <p style={{ margin: 0 }}>
                Esta página cria cursos, estudantes, notas, faltas e vínculos em grupos para ser mais rápida.
                O processamento continua no servidor, e o progresso também aparece no <strong style={{ color: "#94a3b8" }}>sino 🔔</strong>.
              </p>
            </div>

            <div style={{ border: "1px solid #334155", borderRadius: 8, padding: 12, background: "#0a1929", fontSize: 11, color: "#64748b", lineHeight: 1.6, marginTop: 12 }}>
              <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#94a3b8" }}>ℹ Evita registros repetidos</p>
              <p style={{ margin: 0 }}>
                Antes de criar novas notas ou faltas, a página verifica o que já existe.
                Assim ela evita duplicar registros e termina a verificação mais rápido.
              </p>
            </div>
          </div>

          {/* ─── Operações ───────────────────────────────────────────────── */}
          <div>
            {/* Cursos */}
            {tiposCursoDisp.length > 0 && (
              <Section title="Cursos" badge={`${cursos.length} criados`}>
                <Row>
                  <Field label="Tipo">
                    <Sel value={cursoConfig.tipo} onChange={e => setCursoConfig(p => ({ ...p, tipo: e.target.value as any }))}>
                      {tiposCursoDisp.map(t => (<option key={t.value} value={t.value}>{t.label}</option>))}
                    </Sel>
                  </Field>
                  <NumberStepper
                    label="Quantidade"
                    value={cursoConfig.qtd}
                    min={1}
                    max={5}
                    onChange={v => setCursoConfig(p => ({ ...p, qtd: v }))}
                  />
                  <Btn onClick={() => withLoading(gerarCursos)} color="#7c3aed">Gerar Cursos</Btn>
                </Row>
                {cursos.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                    {cursos.map(c => (
                      <span key={c.id} style={{ fontSize: 11, padding: "3px 8px", background: "#1e293b", borderRadius: 20, color: "#94a3b8" }}>
                        {c.nome} <span style={{ color: "#475569" }}>({c.type})</span>
                      </span>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* Matérias */}
            <Section title="Matérias Disciplinares" badge={`${materias.length} ativas`}>
              {tiposMateriaDisp.length === 0 ? (
                <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>Tipo de academia não suporta matérias nesta configuração.</p>
              ) : (
                <>
                  <Row>
                    <Field label="Tipo">
                      <Sel value={materiaConfig.tipo} onChange={e => { const newTipo = e.target.value as any; setMateriaConfig(p => ({ ...p, tipo: newTipo, cursoId: "auto" })); }}>
                        {tiposMateriaDisp.map(t => (<option key={t.value} value={t.value}>{t.label}</option>))}
                      </Sel>
                    </Field>
                    {(materiaConfig.tipo === "medio" || materiaConfig.tipo === "superior") && (
                      <Field label="Curso">
                        <Sel value={materiaConfig.cursoId} onChange={e => setMateriaConfig(p => ({ ...p, cursoId: e.target.value }))}>
                          <option value="auto">Auto (primeiro ativo)</option>
                          {cursos.filter(c => c.type === materiaConfig.tipo && c.status === "ativo").map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </Sel>
                      </Field>
                    )}
                    <NumberStepper
                      label="Quantidade"
                      value={materiaConfig.qtd}
                      min={1}
                      max={10}
                      onChange={v => setMateriaConfig(p => ({ ...p, qtd: v }))}
                    />
                    <Btn
                      onClick={() => withLoading(gerarMaterias)}
                      color="#7c3aed"
                      disabled={(materiaConfig.tipo === "medio" || materiaConfig.tipo === "superior") && cursos.filter(c => c.type === materiaConfig.tipo && c.status === "ativo").length === 0}
                    >
                      Gerar Matérias
                    </Btn>
                  </Row>
                  {materiaConfig.tipo === "superior" && (
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#facc15" }}>
                      ⚠ Matérias superiores nascem inativas — período definido automaticamente antes de ativar
                    </p>
                  )}
                </>
              )}
            </Section>

            {/* Turmas */}
            <Section title="Turmas" badge={`${turmas.length} criadas`}>
              {academia.tipo === "superior" && cursosParaTurma.length === 0 ? (
                <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>✗ Academia superior sem cursos ativos — crie cursos primeiro</p>
              ) : academia.nivel === "medio" && cursosParaTurma.length === 0 ? (
                <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>✗ Academia de nível médio sem cursos ativos — crie cursos primeiro</p>
              ) : (
                <>
                  <Row>
                    <NumberStepper
                      label="Quantidade"
                      value={turmaConfig.qtd}
                      min={1}
                      max={20}
                      onChange={v => setTurmaConfig(p => ({ ...p, qtd: v }))}
                    />
                    <Field label="Turno">
                      <Sel value={turmaConfig.turno} onChange={e => setTurmaConfig(p => ({ ...p, turno: e.target.value }))}>
                        <option value="random">Aleatório</option>
                        <option value="manha">Manhã</option>
                        <option value="tarde">Tarde</option>
                        <option value="noite">Noite</option>
                      </Sel>
                    </Field>
                    {cursosParaTurma.length > 0 && (
                      <Field label="Curso">
                        <Sel
                          value={turmaConfig.cursoId}
                          onChange={e => setTurmaConfig(p => ({ ...p, cursoId: e.target.value, nivel: "random" }))}
                          style={{ minWidth: 200 }}
                        >
                          <option value="random">Aleatório (todos os cursos)</option>
                          {cursosParaTurma.map(c => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                        </Sel>
                      </Field>
                    )}
                    <Field label="Nível">
                      <Sel value={turmaConfig.nivel} onChange={e => setTurmaConfig(p => ({ ...p, nivel: e.target.value }))}>
                        <option value="random">Aleatório</option>
                        {(academia.nivel === "fundamental" || academia.nivel === "misto") &&
                          (academia.anos_academicos || []).filter(a => a.includes("fundamental")).map(a => (
                            <option key={a} value={a}>{a.replace(/_ano_fundamental$/, "º Fundamental")}</option>
                          ))
                        }
                        {niveisParaTurma.filter(a => !a.includes("fundamental")).map(a => (
                          <option key={a} value={a}>
                            {a.includes("medio") ? a.replace(/_ano_medio$/, "º Médio") : a.replace(/_ano_superior$/, "º Superior")}
                          </option>
                        ))}
                      </Sel>
                    </Field>
                    <Btn onClick={() => withLoading(gerarTurmas)} color="#0891b2">Gerar Turmas</Btn>
                  </Row>
                  {turmaConfig.nivel === "random" && (
                    <div style={{ marginTop: 8 }}>
                      <p style={{ margin: "0 0 6px", fontSize: 11, color: "#94a3b8" }}>
                        Anos académicos (múltipla escolha) — vazio = todos
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {ordenarAnosAcademicos(Array.from(new Set(niveisParaTurma))).map(nivel => (
                          <button
                            key={nivel}
                            type="button"
                            onClick={() => setTurmaConfig(p => ({ ...p, niveisSelecionados: toggleSelecionado(p.niveisSelecionados, nivel) }))}
                            style={{
                              border: "1px solid #334155",
                              background: turmaConfig.niveisSelecionados.includes(nivel) ? "#0f766e" : "#1e293b",
                              color: "#e2e8f0",
                              borderRadius: 999,
                              padding: "4px 10px",
                              fontSize: 11,
                              cursor: "pointer",
                            }}
                          >
                            {nivel.replace(/_ano_fundamental$/, "º Fundamental").replace(/_ano_medio$/, "º Médio").replace(/_ano_superior$/, "º Superior")}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#475569" }}>
                    ✦ Para vincular estudantes, as turmas devem ter o <strong style={{ color: "#64748b" }}>mesmo nível e curso</strong> dos estudantes
                  </p>
                </>
              )}
            </Section>

            {/* Estudantes */}
            <Section title="Estudantes" badge={`${estudantes.length} cadastrados`}>
              <Row>
                <NumberStepper
                  label="Quantidade"
                  value={estudanteConfig.qtd}
                  min={1}
                  step={10}
                  onChange={v => setEstudanteConfig(p => ({ ...p, qtd: v }))}
                />
                <Field label="Contrato documental">
                  <Sel
                    value={estudanteConfig.comArquivos ? "com" : "sem"}
                    onChange={e => setEstudanteConfig(p => ({ ...p, comArquivos: e.target.value === "com" }))}
                  >
                    <option value="sem">Sem arquivos (JSON; pendente_documentos)</option>
                    <option value="com">Com arquivos (multipart; ativo)</option>
                  </Sel>
                </Field>
              </Row>

              {(modo === "fundamental" || modo === "misto") && (
                <SubSection title="Ensino Fundamental">
                  <Row>
                    <Field label="Ano escolar">
                      <Sel value={estudanteConfig.anoFundamental}
                        onChange={e => setEstudanteConfig(p => ({ ...p, anoFundamental: e.target.value }))}>
                        <option value="random">Aleatório</option>
                        {anosDispFundamental.map(a => (
                          <option key={a} value={a}>{a.replace(/_ano_fundamental$/, "º Fundamental")}</option>
                        ))}
                      </Sel>
                    </Field>
                    {estudanteConfig.anoFundamental === "random" && (
                      <Field label="Anos (multi)">
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {ordenarAnosAcademicos(anosDispFundamental).map(a => (
                            <button
                              key={a}
                              type="button"
                              onClick={() => setEstudanteConfig(p => ({ ...p, anosFundamentalSelecionados: toggleSelecionado(p.anosFundamentalSelecionados, a) }))}
                              style={{ border: "1px solid #334155", background: estudanteConfig.anosFundamentalSelecionados.includes(a) ? "#0f766e" : "#1e293b", color: "#e2e8f0", borderRadius: 999, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}
                            >
                              {a.replace(/_ano_fundamental$/, "º Fundamental")}
                            </button>
                          ))}
                        </div>
                      </Field>
                    )}
                  </Row>
                </SubSection>
              )}

              {(modo === "medio" || modo === "misto") && (
                <SubSection title="Ensino Médio">
                  {cursosMedioAtivos.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 11, color: "#f87171" }}>✗ Nenhum curso médio ativo — crie e ative um curso médio primeiro</p>
                  ) : (
                    <Row>
                      <Field label="Curso médio">
                        <Sel value={estudanteConfig.cursoMedioId}
                          onChange={e => setEstudanteConfig(p => ({ ...p, cursoMedioId: e.target.value, anoMedio: "random", anosMedioSelecionados: [] }))}>
                          <option value="random">Primeiro ativo</option>
                          {cursosMedioAtivos.map(c => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                        </Sel>
                      </Field>
                      <Field label="Ano médio">
                        <Sel value={estudanteConfig.anoMedio}
                          onChange={e => setEstudanteConfig(p => ({ ...p, anoMedio: e.target.value }))}>
                          <option value="random">Aleatório</option>
                          {anosMedioParaConfig.map(a => (
                            <option key={a} value={a}>{a.replace(/_ano_medio$/, "º Médio")}</option>
                          ))}
                        </Sel>
                      </Field>
                      {estudanteConfig.anoMedio === "random" && (
                        <Field label="Anos (multi)">
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {ordenarAnosAcademicos(anosMedioParaConfig).map(a => (
                              <button
                                key={a}
                                type="button"
                                onClick={() => setEstudanteConfig(p => ({ ...p, anosMedioSelecionados: toggleSelecionado(p.anosMedioSelecionados, a) }))}
                                style={{ border: "1px solid #334155", background: estudanteConfig.anosMedioSelecionados.includes(a) ? "#0f766e" : "#1e293b", color: "#e2e8f0", borderRadius: 999, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}
                              >
                                {a.replace(/_ano_medio$/, "º Médio")}
                              </button>
                            ))}
                          </div>
                        </Field>
                      )}
                    </Row>
                  )}
                </SubSection>
              )}

              {modo === "superior" && (
                <SubSection title="Ensino Superior">
                  {cursosSuperiorAtivos.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 11, color: "#f87171" }}>✗ Nenhum curso superior ativo — crie e ative um curso superior primeiro</p>
                  ) : (
                    <Row>
                      <Field label="Curso superior">
                        <Sel value={estudanteConfig.cursoSuperiorId}
                          onChange={e => setEstudanteConfig(p => ({ ...p, cursoSuperiorId: e.target.value, anoSuperior: "random", anosSuperiorSelecionados: [] }))}>
                          <option value="random">Primeiro ativo</option>
                          {cursosSuperiorAtivos.map(c => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                        </Sel>
                      </Field>
                      <Field label="Ano superior">
                        <Sel value={estudanteConfig.anoSuperior}
                          onChange={e => setEstudanteConfig(p => ({ ...p, anoSuperior: e.target.value }))}>
                          <option value="random">Aleatório</option>
                          {anosSuperiorParaConfig.map(a => (
                            <option key={a} value={a}>{a.replace(/_ano_superior$/, "º Superior")}</option>
                          ))}
                        </Sel>
                      </Field>
                      {estudanteConfig.anoSuperior === "random" && (
                        <Field label="Anos (multi)">
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {ordenarAnosAcademicos(anosSuperiorParaConfig).map(a => (
                              <button
                                key={a}
                                type="button"
                                onClick={() => setEstudanteConfig(p => ({ ...p, anosSuperiorSelecionados: toggleSelecionado(p.anosSuperiorSelecionados, a) }))}
                                style={{ border: "1px solid #334155", background: estudanteConfig.anosSuperiorSelecionados.includes(a) ? "#0f766e" : "#1e293b", color: "#e2e8f0", borderRadius: 999, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}
                              >
                                {a.replace(/_ano_superior$/, "º Superior")}
                              </button>
                            ))}
                          </div>
                        </Field>
                      )}
                    </Row>
                  )}
                </SubSection>
              )}

              {modo === "misto" && (
                <SubSection title="Distribuição Misto">
                  <Row>
                    <NumberStepper
                      label="% Fundamental"
                      value={estudanteConfig.pctFundamental}
                      min={0}
                      max={100}
                      step={5}
                      onChange={v => setEstudanteConfig(p => ({ ...p, pctFundamental: v }))}
                    />
                  </Row>
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b" }}>
                    ≈ {Math.floor(estudanteConfig.qtd * estudanteConfig.pctFundamental / 100)} fundamental
                    · {estudanteConfig.qtd - Math.floor(estudanteConfig.qtd * estudanteConfig.pctFundamental / 100)} médio
                  </p>
                </SubSection>
              )}

              <div style={{ marginTop: 8 }}>
                <Btn onClick={() => withLoading(gerarEstudantes)} color="#059669">
                  Criar {estudanteConfig.qtd} estudante(s) em lote {estudanteConfig.comArquivos ? "com arquivos" : "sem arquivos"}
                </Btn>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "#475569" }}>
                Criação em massa via /academia/estudante/register/async: JSON usa com_arquivo=false e deixa status pendente_documentos; multipart usa com_arquivo=true, codigo_temporario e PDFs obrigatórios.
              </p>
            </Section>

            {/* Documentos pendentes */}
            <Section
              title="Documentos pendentes"
              badge={`${estudantes.filter(e => e.status === "pendente_documentos").length} pendente(s)`}
            >
              <Row>
                <Btn
                  onClick={() => withLoading(regularizarDocumentosPendentes)}
                  color="#d97706"
                  disabled={estudantes.length === 0}
                >
                  Gerar PDFs e adicionar documentos pendentes
                </Btn>
              </Row>
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "#475569" }}>
                Consulta /estudantes?status=pendente_documentos, confirma cada estudante em /consultar-estudante/:codigo, gera PDFs de teste e envia multipart para /academia/estudante/:codigo/documentos. Quando certificado e declaração são alternativas válidas, a escolha pode ser aleatória.
              </p>
            </Section>

            {/* Vincular a Turmas */}
            {turmas.length > 0 && estudantes.length > 0 && (
              <Section title="Vincular Estudantes a Turmas" badge={
                estudantesSemTurma.length === 0
                  ? "todos vinculados"
                  : estudantesSemCompatibilidade > 0
                    ? `${estudantesSemTurmaComCompativeis.length} compatíveis de ${estudantesSemTurma.length} sem turma`
                    : `${estudantesSemTurma.length} sem turma`
              }>
                {estudantesSemTurma.length === 0 ? (
                  <p style={{ color: "#4ade80", fontSize: 12, margin: 0 }}>✓ Todos os estudantes já estão vinculados a turmas.</p>
                ) : (
                  <>
                    {estudantesSemCompatibilidade > 0 && (
                      <div style={{ background: "#1c1000", border: "1px solid #854d0e", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 11, color: "#fbbf24" }}>
                        <strong>⚠ {estudantesSemCompatibilidade} estudante(s)</strong> não têm turma compatível com seu nível/curso.
                        Crie turmas com os níveis e cursos correspondentes.
                      </div>
                    )}
                    <Row>
                      <Field label="Turma alvo">
                        <Sel value={vincularConfig.turmaCodigo} onChange={e => setVincularConfig({ turmaCodigo: e.target.value })} style={{ minWidth: 220 }}>
                          <option value="random">Distribuir por compatibilidade (auto)</option>
                          {turmas.filter(t => t.status !== "inativo" && t.status !== "deletado").map(t => (
                            <option key={t.codigo_turma} value={t.codigo_turma}>
                              {t.codigo_turma} — {t.nivel.replace(/_ano_(fundamental|medio|superior)$/, "º $1")} ({t.estudantes.length} alunos)
                            </option>
                          ))}
                        </Sel>
                      </Field>
                      <Btn
                        onClick={() => withLoading(vincularEstudantesATurmas)}
                        color="#0f4c75"
                        disabled={estudantesSemTurmaComCompativeis.length === 0}
                      >
                        Vincular {estudantesSemTurmaComCompativeis.length} compatíveis em lote
                      </Btn>
                    </Row>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#475569" }}>
                      ✦ Cada estudante é vinculado apenas a turmas do <strong style={{ color: "#64748b" }}>mesmo nível e curso</strong>
                      {" — "}distribuição automática por round-robin entre turmas compatíveis
                    </p>
                  </>
                )}
              </Section>
            )}

            {/* Notas */}
            <Section title="Notas" badge={materiasParaNota.length === 0 ? "crie matérias primeiro" : `≈${estimativaNota} notas estimadas`}>
              <SubSection title={`Categorias — ${tipoNota === "escolar" ? "Escolar" : "Superior"}`}>
                <CategoryCheckboxes
                  label="Registrar notas para"
                  options={categoriasDisponiveis}
                  selected={categoriasAtivas}
                  onChange={setCategoriasAtivas}
                />
                <p style={{ margin: "8px 0 0", fontSize: 11, color: "#475569" }}>
                  {tipoNota === "escolar"
                    ? "A escola usa opções fixas conforme o ano do estudante. Opções que não se aplicam serão ignoradas automaticamente."
                    : "Escolha as categorias já configuradas para o ensino superior."}
                  {" · "}{categoriasAtivas.length} de {categoriasDisponiveis.length} selecionada(s)
                </p>
              </SubSection>

              {academia.tipo !== "superior" ? (
                <Row>
                  <NumberStepper
                    label="Nº estudantes (0 = todos)"
                    value={notaConfig.qtdEstudantes}
                    min={0}
                    max={estudantes.length || 1000}
                    step={5}
                    onChange={v => setNotaConfig(p => ({ ...p, qtdEstudantes: v }))}
                    hint={notaConfig.qtdEstudantes === 0 ? `todos (${estudantes.length})` : undefined}
                  />
                  <Field label="Período">
                    <Sel value={notaConfig.periodo} onChange={e => setNotaConfig(p => ({ ...p, periodo: e.target.value }))}>
                      {periodosNotaDisponiveis.map(p => (<option key={p.value} value={p.value}>{p.label}</option>))}
                    </Sel>
                  </Field>
                  <Btn onClick={() => withLoading(gerarNotas)} color="#b45309" disabled={materiasParaNota.length === 0 || estudantes.length === 0}>
                    Gerar notas em lote
                  </Btn>
                </Row>
              ) : (
                <Row>
                  <NumberStepper
                    label="Nº estudantes (0 = todos)"
                    value={notaConfig.qtdEstudantes}
                    min={0}
                    max={estudantes.length || 1000}
                    step={5}
                    onChange={v => setNotaConfig(p => ({ ...p, qtdEstudantes: v }))}
                    hint={notaConfig.qtdEstudantes === 0 ? `todos (${estudantes.length})` : undefined}
                  />
                  <Btn onClick={() => withLoading(gerarNotas)} color="#b45309" disabled={materiasParaNota.length === 0 || estudantes.length === 0}>
                    Gerar notas em lote
                  </Btn>
                </Row>
              )}
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#475569" }}>
                Primeiro verifica o que já foi lançado para evitar repetição. Depois cria apenas as notas que faltam.
              </p>
            </Section>

            {/* Faltas */}
            <Section title="Faltas" badge={materiasParaNota.length === 0 ? "crie matérias primeiro" : undefined}>
              <Row>
                <NumberStepper
                  label="Nº estudantes (0 = todos)"
                  value={faltaConfig.qtdEstudantes}
                  min={0}
                  max={estudantes.length || 1000}
                  step={5}
                  onChange={v => setFaltaConfig(p => ({ ...p, qtdEstudantes: v }))}
                  hint={faltaConfig.qtdEstudantes === 0 ? `todos (${estudantes.length})` : undefined}
                />
                <Btn onClick={() => withLoading(gerarFaltas)} color="#b45309" disabled={materiasParaNota.length === 0 || estudantes.length === 0}>
                  Gerar faltas em lote
                </Btn>
              </Row>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#475569" }}>
                Primeiro verifica faltas já lançadas para evitar repetição. Depois cria apenas os registros que faltam.
              </p>
            </Section>

          </div>
        </div>

        {/* ─── Log ───────────────────────────────────────────────────────── */}
        {logs.length > 0 && (
          <div style={{ marginTop: 20, border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ background: "#0f172a", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e293b" }}>
              <span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>LOG · {logs.length} entradas</span>
              <div style={{ display: "flex", gap: 10 }}>
                {running && (
                  <button onClick={() => { cancelRef.current = true; addLog("Cancelando...", "warn"); }} style={{ background: "#7f1d1d", color: "#fca5a5", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>
                    ✕ Cancelar
                  </button>
                )}
                <button onClick={() => setLogs([])} style={{ background: "transparent", color: "#475569", border: "1px solid #1e293b", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>
                  Limpar
                </button>
              </div>
            </div>
            <div style={{ background: "#020817", height: 320, overflowY: "auto", padding: 16, fontSize: 12, lineHeight: "1.8" }}>
              {logs.map((l, i) => (
                <div key={i} style={{ display: "flex", gap: 12, color: logColors[l.level] }}>
                  <span style={{ color: "#334155", minWidth: 64 }}>{l.ts}</span>
                  <span style={{ minWidth: 12 }}>{logIcons[l.level]}</span>
                  <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{l.msg}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
