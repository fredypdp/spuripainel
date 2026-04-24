"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { adminService, jobApiService, pollJob, tokenStorage } from "@/lib/api";
import { resolveJobItemError } from "@/lib/api/job-service";
import { getCookie } from "@/lib/utils/cookies";
import type { MeuPerfilResponse } from "@/types/api";

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
  ano_escolar?: string;
  ano_escolar_medio?: string;
  ano_superior?: string;
  curso_medio_id?: string;
  curso_superior_id?: string;
  total_notas?: number;
  total_faltas?: number;
}

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
  { value: "nota_escola", label: "Nota Escola" },
  { value: "nota_professor", label: "Nota Professor" },
];

const CATEGORIAS_SUPERIOR: { value: string; label: string }[] = [
  { value: "nota_pp1", label: "PP1" },
  { value: "nota_pp2", label: "PP2" },
  { value: "nota_exame", label: "Exame" },
];

// Períodos fixos do ensino escolar
const PERIODOS_ESCOLARES = ["1_trimestre", "2_trimestre", "3_trimestre"] as const;

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
const DATAS_FALTA = ["2025-03-10","2025-04-07","2025-05-05","2025-06-02","2025-07-07","2025-09-01","2025-10-06","2025-11-03"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const rnd = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pickN = <T,>(arr: T[], n: number): T[] => [...arr].sort(() => 0.5 - Math.random()).slice(0, n);
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const gerarNome = () => {
  const m = Math.random() < 0.51;
  return { nome: `${pick(m ? NOMES_M : NOMES_F)} ${pick(SOBRENOMES)} ${pick(SOBRENOMES)}`, genero: m ? "masculino" as const : "feminino" as const };
};
const gerarDataNasc = (minAge = 8, maxAge = 25) => {
  const dias = rnd(minAge, maxAge) * 365 + rnd(0, 364);
  return new Date(Date.now() - dias * 86400000).toISOString();
};

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

function tiposEnsinoDisponiveis(academia: AcademiaInfo, cursos: Curso[]): { value: string; label: string }[] {
  const tipos: { value: string; label: string }[] = [];
  if (academia.tipo === "escola") {
    if (academia.nivel === "fundamental" || academia.nivel === "misto") {
      tipos.push({ value: "fundamental", label: "Fundamental" });
    }
    const temCursoMedio = cursos.some(c => c.type === "medio");
    if ((academia.nivel === "medio" || academia.nivel === "misto") && temCursoMedio) {
      tipos.push({ value: "medio", label: "Médio" });
    }
  } else if (academia.tipo === "superior") {
    const temCursoSuperior = cursos.some(c => c.type === "superior");
    if (temCursoSuperior) {
      tipos.push({ value: "superior", label: "Superior" });
    }
  }
  return tipos;
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
    if (!estudante.ano_escolar) return false;
    return estudante.ano_escolar === turma.nivel;
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

// ─── Matéria matching ─────────────────────────────────────────────────────────
/**
 * Retorna todas as matérias ativas compatíveis com um estudante:
 * - Fundamental: matéria.type === "fundamental" e matéria.anos_academicos inclui o ano do estudante
 * - Médio: matéria.type === "medio", curso_id === estudante.curso_medio_id, e anos_academicos inclui o ano
 * - Superior: matéria.type === "superior", curso_id === estudante.curso_superior_id, e anos_academicos inclui o ano
 */
function materiasDoEstudante(estudante: Estudante, materias: Materia[]): Materia[] {
  const result: Materia[] = [];

  // Fundamental
  if (estudante.ano_escolar) {
    const mat = materias.filter(m =>
      m.type === "fundamental" &&
      Array.isArray(m.anos_academicos) &&
      m.anos_academicos.includes(estudante.ano_escolar!)
    );
    result.push(...mat);
  }

  // Médio
  if (estudante.ano_escolar_medio && estudante.curso_medio_id) {
    const mat = materias.filter(m =>
      m.type === "medio" &&
      m.curso_id === estudante.curso_medio_id &&
      Array.isArray(m.anos_academicos) &&
      m.anos_academicos.includes(estudante.ano_escolar_medio!)
    );
    result.push(...mat);
  }

  // Superior
  if (estudante.ano_superior && estudante.curso_superior_id) {
    const mat = materias.filter(m =>
      m.type === "superior" &&
      m.curso_id === estudante.curso_superior_id &&
      Array.isArray(m.anos_academicos) &&
      m.anos_academicos.includes(estudante.ano_superior!)
    );
    result.push(...mat);
  }

  // Dedup por id (edge case: estudante em múltiplos níveis)
  const seen = new Set<string>();
  return result.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
}

/**
 * Retorna os períodos válidos para uma matéria:
 * - Escolar: todos os 3 trimestres
 * - Superior: apenas o período definido na matéria (campo materia.periodo)
 */
function periodosParaMateria(materia: Materia): string[] {
  if (materia.type === "superior") {
    return materia.periodo ? [materia.periodo] : [];
  }
  return [...PERIODOS_ESCOLARES];
}

/**
 * Retorna o tipoNota para uma matéria.
 */
function tipoNotaParaMateria(materia: Materia): "escolar" | "superior" {
  return materia.type === "superior" ? "superior" : "escolar";
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
  const [cadastroLoading, setCadastroLoading] = useState(false);
  const [cadastroMsg, setCadastroMsg] = useState<string>("");
  const [cadastroErro, setCadastroErro] = useState<string>("");
  const [cadastroForm, setCadastroForm] = useState({
    nivel: "escola" as "escola" | "superior",
    type: "private" as "private" | "public",
    nome: "",
    provincia: "",
    endereco: "",
    numero_telefone: "",
    email: "",
    website: "",
    nivel_escolar: "fundamental" as "fundamental" | "medio" | "misto",
  });

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [estudantes, setEstudantes] = useState<Estudante[]>([]);

  const [cursoConfig, setCursoConfig] = useState({ tipo: "medio" as "medio"|"superior", qtd: 2 });
  const [materiaConfig, setMateriaConfig] = useState({ tipo: "fundamental" as "fundamental"|"medio"|"superior", qtd: 5, cursoId: "" });

  const [turmaConfig, setTurmaConfig] = useState({ qtd: 3, turno: "random" as string, nivel: "random", cursoId: "random" });
  const [vincularConfig, setVincularConfig] = useState({ turmaCodigo: "random" });

  const [categoriaEscolarSel, setCategoriaEscolarSel] = useState<string[]>(["nota_escola", "nota_professor"]);
  const [categoriaSuperiorSel, setCategoriaSuperiorSel] = useState<string[]>(["nota_pp1", "nota_pp2", "nota_exame"]);

  const [notaConfig, setNotaConfig] = useState({ qtdEstudantes: 0 });
  const [faltaConfig, setFaltaConfig] = useState({ qtdEstudantes: 0 });
  const [avalConfig, setAvalConfig] = useState({ tipoEnsino: "fundamental" as string, aprovPct: 70 });

  const [estudanteConfig, setEstudanteConfig] = useState({
    qtd: 20,
    anoFundamental: "random",
    statusFundamental: "em_andamento",
    anoMedio: "random",
    statusMedio: "em_andamento",
    cursoMedioId: "random",
    anoSuperior: "random",
    statusSuperior: "em_andamento",
    cursoSuperiorId: "random",
    modoPrincipal: "fundamental" as "fundamental" | "medio",
    pctFundamental: 60,
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
    if (!userCookie || !token) { setAuthError("Sem sessão ativa. Faça login como admin para usar esta página."); return; }
    try {
      const parsed: MeuPerfilResponse = JSON.parse(userCookie);
      if (parsed.tipo !== "admin") { setAuthError("Esta página é exclusiva para admins."); return; }
      setCurrentUser(parsed);
    } catch { setAuthError("Erro ao ler dados da sessão. Faça login novamente."); }
  }, []);

  useEffect(() => {
    if (!academia) return;
    const tipos = tiposEnsinoDisponiveis(academia, cursos);
    if (tipos.length > 0) {
      setAvalConfig(p => ({ ...p, tipoEnsino: tipos[0].value }));
    }
  }, [academia, cursos]);

  useEffect(() => {
    if (estudantes.length > 0) {
      setNotaConfig(p => ({ ...p, qtdEstudantes: p.qtdEstudantes === 0 ? estudantes.length : p.qtdEstudantes }));
      setFaltaConfig(p => ({ ...p, qtdEstudantes: p.qtdEstudantes === 0 ? estudantes.length : p.qtdEstudantes }));
    }
  }, [estudantes.length]);

  const handleCadastroAcademia = useCallback(async () => {
    if (cadastroLoading) return;
    setCadastroMsg("");
    setCadastroErro("");

    if (!cadastroForm.nome.trim() || !cadastroForm.provincia.trim() || !cadastroForm.endereco.trim()) {
      setCadastroErro("Preencha os campos obrigatórios: nome, província e endereço.");
      return;
    }

    try {
      setCadastroLoading(true);
      const basePayload = {
        nivel: cadastroForm.nivel,
        type: cadastroForm.type,
        nome: cadastroForm.nome.trim(),
        provincia: cadastroForm.provincia.trim(),
        endereco: cadastroForm.endereco.trim(),
        numero_telefone: cadastroForm.numero_telefone.trim() || undefined,
        email: cadastroForm.email.trim() || undefined,
        website: cadastroForm.website.trim() || undefined,
      };

      const payload = cadastroForm.nivel === "escola"
        ? { ...basePayload, nivel_escolar: cadastroForm.nivel_escolar }
        : basePayload;

      const resp = await adminService.registrarAcademia(payload as any);
      const codigo = resp?.data?.codigo_academia || resp?.codigo_academia;
      setCadastroMsg(codigo
        ? `Academia cadastrada com sucesso. Código: ${codigo}.`
        : "Academia cadastrada com sucesso.");
      setCadastroForm((prev) => ({
        ...prev,
        nome: "",
        endereco: "",
        numero_telefone: "",
        email: "",
        website: "",
      }));
    } catch (error: any) {
      setCadastroErro(error?.message || "Não foi possível cadastrar a academia.");
    } finally {
      setCadastroLoading(false);
    }
  }, [cadastroForm, cadastroLoading]);

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
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const r = await fetch(url, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
      });
      const data = await r.json().catch(() => ({}));
      return { ok: r.status >= 200 && r.status < 300, status: r.status, data };
    } catch (e: any) {
      return { ok: false, status: 0, data: { error: String(e) } };
    }
  };

  const refreshData = async (ac?: AcademiaInfo) => {
    const acad = ac || academia;
    if (!acad?.token) return;
    const tok = acad.token;

    const [rCursos, rMaterias, rTurmas, rEstudantes, rAnoLetivo] = await Promise.all([
      callApi("GET", "/academia/cursos", undefined, tok),
      callApi("GET", "/academia/materias", undefined, tok),
      callApi("GET", "/academia/turmas", undefined, tok),
      callApi("GET", "/estudantes", undefined, tok),
      callApi("GET", "/academia/ano-letivo", undefined, tok),
    ]);

    const cursosData: Curso[] = (rCursos.data as any)?.cursos || [];
    const materiasData: Materia[] = (rMaterias.data as any)?.materias?.filter((m: any) => m.status === "ativo") || [];
    const turmasData: Turma[] = (rTurmas.data as any)?.turmas || [];
    const estudantesData: Estudante[] = (rEstudantes.data as any)?.estudantes || [];

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
    addLog(`Gerando ${qtd} curso(s) do tipo ${tipo}...`, "step");
    const templates = tipo === "medio" ? CURSOS_MEDIO : CURSOS_SUPERIOR;
    const picked = pickN(templates, Math.min(qtd, templates.length));
    for (const t of picked) {
      if (cancelRef.current) break;
      const payload: any = {
        nome: t.nome,
        type: tipo,
        anos_academicos: t.anos,
      };
      if (tipo === "superior") {
        payload.periodos = (t as any).periodos;
      }
      const { ok, data } = await callApi("POST", "/academia/curso", payload, academia.token);
      if (ok) {
        const id = (data as any).data?.id;
        addLog(`  ✓ Curso "${t.nome}" criado`, "ok");
        if (id) {
          await sleep(500);
          const { ok: okA } = await callApi("PUT", `/academia/curso/${id}/ativar`, {}, academia.token);
          if (okA) addLog(`    ✓ Curso ativado`, "dim");
        }
      } else {
        const errMsg = (data as any)?.message || (data as any)?.error || "Erro desconhecido";
        addLog(`  ✗ "${t.nome}": ${errMsg}`, "warn");
      }
      await sleep(300);
    }
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
    addLog(`Gerando ${qtd} turma(s)...`, "step");
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

    if (niveisDisponiveis.length === 0) {
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

    for (let i = 0; i < qtd; i++) {
      if (cancelRef.current) break;

      const nivel = turmaConfig.nivel === "random" ? pick(niveisDisponiveis) : turmaConfig.nivel;
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

      const { ok, data } = await callApi("POST", "/academia/turma", payload, academia.token);
      if (ok) {
        criadas++;
        addLog(`  ✓ Turma ${payload.codigo_turma} (${nivel}, ${turno}) criada`, "ok");
      } else {
        const errMsg = (data as any)?.message || (data as any)?.error || "Erro desconhecido";
        addLog(`  ✗ Turma ${payload.codigo_turma}: ${errMsg}`, "warn");
      }
      await sleep(200);
    }
    await sleep(2000);
    await refreshData();
    addLog(`${criadas} turma(s) gerada(s) ✓`, "ok");
  };

  // ─── Gerar Estudantes ─────────────────────────────────────────────────────────
  const gerarEstudantes = async () => {
    if (!academia) return;
    const cfg = estudanteConfig;
    const modo = getEscolaMode(academia);

    addLog(`Gerando ${cfg.qtd} estudante(s) via async (modo: ${modo})...`, "step");

    const cursoMedioAlvo = cfg.cursoMedioId === "random"
      ? cursos.find(c => c.type === "medio" && c.status === "ativo")
      : cursos.find(c => c.id === cfg.cursoMedioId && c.status === "ativo");

    const cursoSuperiorAlvo = cfg.cursoSuperiorId === "random"
      ? cursos.find(c => c.type === "superior" && c.status === "ativo")
      : cursos.find(c => c.id === cfg.cursoSuperiorId && c.status === "ativo");

    const anosF = (academia.anos_academicos || []).filter(a => a.includes("fundamental"));
    const anosMedio = cursoMedioAlvo?.anos_academicos || [];
    const anosSuperior = cursoSuperiorAlvo?.anos_academicos || [];

    const items: any[] = Array.from({ length: cfg.qtd }, (_, idx) => {
      const { nome, genero } = gerarNome();
      const payload: any = {
        nome,
        genero,
        data_nascimento: gerarDataNasc(),
        bilhete_identidade: `${rnd(100000000, 999999999)}LA0${rnd(10, 99)}`,
      };

      if (modo === "superior") {
        if (cursoSuperiorAlvo) {
          const ano = cfg.anoSuperior === "random"
            ? (anosSuperior.length > 0 ? pick(anosSuperior) : "1_ano_superior")
            : cfg.anoSuperior;
          payload.ano_superior = ano;
          payload.status_superior = cfg.statusSuperior;
          payload.curso_superior_id = cursoSuperiorAlvo.id;
        } else {
          addLog(`  ! Est. #${idx + 1}: nenhum curso superior ativo — criado sem vínculo de curso`, "warn");
        }
      } else if (modo === "medio") {
        if (cursoMedioAlvo && anosMedio.length > 0) {
          const ano = cfg.anoMedio === "random"
            ? pick(anosMedio)
            : cfg.anoMedio;
          payload.ano_escolar_medio = ano;
          payload.status_escolar_medio = cfg.statusMedio;
          payload.curso_medio_id = cursoMedioAlvo.id;
        } else {
          addLog(`  ! Est. #${idx + 1}: nenhum curso médio ativo — criado sem vínculo de curso`, "warn");
        }
      } else if (modo === "fundamental") {
        if (anosF.length > 0) {
          const ano = cfg.anoFundamental === "random"
            ? pick(anosF)
            : cfg.anoFundamental;
          payload.ano_escolar = ano;
          payload.status_escolar_fundamental = cfg.statusFundamental;
        }
      } else if (modo === "misto") {
        const isFund = idx < Math.floor(cfg.qtd * cfg.pctFundamental / 100);
        if (isFund) {
          if (anosF.length > 0) {
            const ano = cfg.anoFundamental === "random" ? pick(anosF) : cfg.anoFundamental;
            payload.ano_escolar = ano;
            payload.status_escolar_fundamental = cfg.statusFundamental;
          }
        } else {
          if (cursoMedioAlvo && anosMedio.length > 0) {
            const ano = cfg.anoMedio === "random" ? pick(anosMedio) : cfg.anoMedio;
            payload.ano_escolar_medio = ano;
            payload.status_escolar_medio = cfg.statusMedio;
            payload.curso_medio_id = cursoMedioAlvo.id;
          }
        }
      }

      return payload;
    });

    const { ok, data } = await callApi("POST", "/academia/estudante/register/async", items, academia.token);
    if (!ok) {
      const errMsg = (data as any)?.message || (data as any)?.error || "Erro ao submeter";
      addLog(`  ✗ Erro ao submeter: ${errMsg}`, "err");
      return;
    }
    const jobId = (data as any)?.job_id;
    if (!jobId) { addLog(`  ✗ Job ID não retornado`, "err"); return; }
    addLog(`  Job ${jobId} criado — ${(data as any)?.total_items} estudante(s) na fila`, "info");

    const result = await acompanharJob(jobId, "Estudantes");
    if (!result.timedOut) {
      addLog(`Estudantes: ${result.ok} ✓  ${result.err} ✗`, result.ok > 0 ? "ok" : "err");
    }
    await sleep(3000);
    await refreshData();
  };

  // ─── Vincular Estudantes a Turmas ─────────────────────────────────────────────
  const vincularEstudantesATurmas = async () => {
    if (!academia || turmas.length === 0 || estudantes.length === 0) {
      addLog("Sem turmas ou estudantes disponíveis", "warn");
      return;
    }

    const estudantesEmTurma = new Set(turmas.flatMap(t => t.estudantes));
    const semTurma = estudantes.filter(e => !estudantesEmTurma.has(e.codigo_estudante));

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
          ` (ano_escolar=${est.ano_escolar || est.ano_escolar_medio || est.ano_superior || "?"}` +
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

    const { ok, data } = await callApi("POST", "/academia/turma/estudante/async", items, academia.token);
    if (!ok) {
      const errMsg = (data as any)?.message || (data as any)?.error || "Erro ao submeter";
      addLog(`  ✗ Erro ao submeter: ${errMsg}`, "err");
      return;
    }
    const jobId = (data as any)?.job_id;
    if (!jobId) { addLog(`  ✗ Job ID não retornado`, "err"); return; }
    addLog(`  Job ${jobId} criado — ${items.length} vínculo(s) na fila`, "info");

    const result = await acompanharJob(jobId, "Vínculos");
    if (!result.timedOut) {
      addLog(`Vínculos: ${result.ok} ✓  ${result.err} ✗`, result.ok > 0 ? "ok" : "err");
    }
    await sleep(2000);
    await refreshData();
  };

  // ─── Gerar Notas ──────────────────────────────────────────────────────────────
  //
  // Lógica melhorada:
  //  1. Para cada estudante, encontra TODAS as matérias ativas compatíveis com o seu
  //     ano académico e curso (via materiasDoEstudante).
  //  2. Para cada matéria, gera notas para TODOS os períodos válidos
  //     (3 trimestres para escolar; o período definido na matéria para superior).
  //  3. Para cada período, gera uma nota por cada categoria selecionada.
  //  4. Idempotência: o backend bloqueia duplicatas (409 por item), por isso não
  //     precisamos de pré-verificar via GET /notas. Enviamos tudo e deixamos o
  //     backend rejeitar o que já existe — simples e correto.
  //
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

    const { qtdEstudantes } = notaConfig;
    const total = qtdEstudantes > 0 ? Math.min(qtdEstudantes, estudantes.length) : estudantes.length;
    const sample = estudantes.slice(0, total);

    addLog(`Gerando notas para ${sample.length} estudante(s) — tipo: ${tipoNota}, categorias: ${categoriasAtivas.join(", ")}`, "step");
    addLog(`  Lógica: todas as matérias do ano do estudante × todos os períodos × todas as categorias`, "dim");

    // Estatísticas de cobertura
    let semMateria = 0;
    let totalCombinacoes = 0;

    // Monta batch: estudante × matéria compatível × período × categoria
    const batch: any[] = [];
    const batchDedup = new Set<string>();

    for (const est of sample) {
      if (cancelRef.current) break;

      const materiasEst = materiasDoEstudante(est, materias);

      if (materiasEst.length === 0) {
        semMateria++;
        addLog(
          `  ! ${est.codigo_estudante}: nenhuma matéria ativa compatível` +
          ` (ano=${est.ano_escolar || est.ano_escolar_medio || est.ano_superior || "?"})`,
          "warn"
        );
        continue;
      }

      for (const mat of materiasEst) {
        const periodos = periodosParaMateria(mat);
        const tipoNotaMat = tipoNotaParaMateria(mat);

        if (periodos.length === 0) {
          addLog(`  ! Matéria "${mat.nome}" (superior) sem período definido — ignorada para ${est.codigo_estudante}`, "warn");
          continue;
        }

        for (const periodo of periodos) {
          for (const categoria of categoriasAtivas) {
            // Chave de dedup interna ao batch
            const key = `${est.codigo_estudante}|${mat.id}|${periodo}|${tipoNotaMat}|${categoria}`;
            if (batchDedup.has(key)) continue;
            batchDedup.add(key);
            totalCombinacoes++;

            batch.push({
              codigo_estudante: est.codigo_estudante,
              periodo,
              materia_disciplinar_id: mat.id,
              tipo: tipoNotaMat,
              categoria,
              nota: parseFloat((rnd(8, 20) + Math.random()).toFixed(1)),
            });
          }
        }
      }
    }

    if (semMateria > 0) {
      addLog(`  ⚠ ${semMateria} estudante(s) sem matéria compatível — verifique se as matérias cobrem os anos dos estudantes`, "warn");
    }

    if (batch.length === 0) {
      addLog("Nenhuma nota para registrar. Verifique se existem matérias com anos compatíveis com os estudantes.", "warn");
      return;
    }

    addLog(`  Total de combinações: ${batch.length} nota(s)`, "info");
    addLog(`  (${sample.length} estudantes × matérias compatíveis × períodos × ${categoriasAtivas.length} categorias)`, "dim");
    addLog(`  O backend rejeitará notas duplicadas automaticamente — não há pré-verificação necessária`, "dim");

    // Divide em chunks de 2000 (limite da API)
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
      `Notas concluídas: ${totalOk} ✓  ${totalErr > 0 ? `${totalErr} ✗  ` : ""}(${batch.length} enviadas — duplicatas rejeitadas pelo backend)`,
      totalOk > 0 ? "ok" : "err"
    );
  };

  // ─── Gerar Faltas ─────────────────────────────────────────────────────────────
  //
  // Lógica melhorada:
  //  1. Para cada estudante, encontra TODAS as matérias ativas compatíveis
  //     com o seu ano académico e curso (via materiasDoEstudante).
  //  2. Para cada matéria × data, gera uma falta.
  //  3. Idempotência: o backend bloqueia duplicatas por (estudante, matéria, data).
  //     Enviamos tudo e o backend rejeita o que já existe.
  //
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
    addLog(`  Lógica: todas as matérias do ano do estudante × todas as datas (${DATAS_FALTA.length} datas)`, "dim");

    let semMateria = 0;

    const batch: any[] = [];
    const batchDedup = new Set<string>();

    for (const est of sample) {
      if (cancelRef.current) break;

      const materiasEst = materiasDoEstudante(est, materias);

      if (materiasEst.length === 0) {
        semMateria++;
        addLog(
          `  ! ${est.codigo_estudante}: nenhuma matéria ativa compatível` +
          ` (ano=${est.ano_escolar || est.ano_escolar_medio || est.ano_superior || "?"})`,
          "warn"
        );
        continue;
      }

      for (const mat of materiasEst) {
        for (const dataFalta of DATAS_FALTA) {
          const key = `${est.codigo_estudante}|${mat.id}|${dataFalta}`;
          if (batchDedup.has(key)) continue;
          batchDedup.add(key);

          batch.push({
            codigo_estudante: est.codigo_estudante,
            data: dataFalta,
            materia_disciplinar_id: mat.id,
            quantidade: rnd(1, 3),
          });
        }
      }
    }

    if (semMateria > 0) {
      addLog(`  ⚠ ${semMateria} estudante(s) sem matéria compatível — verifique se as matérias cobrem os anos dos estudantes`, "warn");
    }

    if (batch.length === 0) {
      addLog("Nenhuma falta para registrar. Verifique se existem matérias com anos compatíveis com os estudantes.", "warn");
      return;
    }

    addLog(`  Total de combinações: ${batch.length} falta(s)`, "info");
    addLog(`  (${sample.length} estudantes × matérias compatíveis × ${DATAS_FALTA.length} datas)`, "dim");
    addLog(`  O backend rejeitará faltas duplicadas automaticamente — não há pré-verificação necessária`, "dim");

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
      `Faltas concluídas: ${totalOkFalta} ✓  ${totalErrFalta > 0 ? `${totalErrFalta} ✗  ` : ""}(${batch.length} enviadas — duplicatas rejeitadas pelo backend)`,
      totalOkFalta > 0 ? "ok" : "err"
    );
  };

  // ─── Gerar Avaliações Finais ───────────────────────────────────────────────────
  const gerarAvaliacoes = async () => {
    if (!academia || estudantes.length === 0) { addLog("Sem estudantes disponíveis", "warn"); return; }
    if (!academia.ano_letivo) { addLog("Academia sem ano letivo configurado", "err"); return; }

    const { tipoEnsino, aprovPct } = avalConfig;
    const sample = [...estudantes];
    const nAprov = Math.floor(sample.length * aprovPct / 100);
    addLog(`Gerando avaliações finais (${tipoEnsino}) para ${sample.length} estudante(s) via async...`, "step");

    const batch: any[] = [];

    for (let idx = 0; idx < sample.length; idx++) {
      const est = sample[idx];
      const aprovado = idx < nAprov;
      let nivelAtual = "";
      let proximoNivel: string | undefined;

      if (tipoEnsino === "fundamental") {
        const anosF = (academia.anos_academicos || []).filter(a => a.includes("fundamental")).sort();
        const anoAtual = est.ano_escolar || (anosF.length > 0 ? pick(anosF) : "1_ano_fundamental");
        nivelAtual = anoAtual;
        const idx2 = anosF.indexOf(anoAtual);
        if (aprovado && idx2 >= 0 && idx2 < anosF.length - 1) {
          proximoNivel = anosF[idx2 + 1];
        }
      } else if (tipoEnsino === "medio") {
        const c = cursos.find(x => x.type === "medio" && x.status === "ativo");
        const anos = c?.anos_academicos?.sort() || [];
        if (anos.length === 0) {
          addLog(`  ! Nenhum curso médio ativo para avaliação — ignorando estudante ${est.codigo_estudante}`, "warn");
          continue;
        }
        const anoAtual = est.ano_escolar_medio || anos[0];
        nivelAtual = anoAtual;
        const idx2 = anos.indexOf(anoAtual);
        if (aprovado && idx2 >= 0 && idx2 < anos.length - 1) {
          proximoNivel = anos[idx2 + 1];
        }
      } else if (tipoEnsino === "superior") {
        const c = cursos.find(x => x.type === "superior" && x.status === "ativo");
        const anos = c?.anos_academicos?.sort() || [];
        if (anos.length === 0) {
          addLog(`  ! Nenhum curso superior ativo para avaliação — ignorando estudante ${est.codigo_estudante}`, "warn");
          continue;
        }
        const anoAtual = est.ano_superior || anos[0];
        nivelAtual = anoAtual;
        const idx2 = anos.indexOf(anoAtual);
        if (aprovado && idx2 >= 0 && idx2 < anos.length - 1) {
          proximoNivel = anos[idx2 + 1];
        }
      }

      if (!nivelAtual) continue;

      const item: any = {
        codigo_estudante: est.codigo_estudante,
        tipo_ensino: tipoEnsino,
        nivel_ano_academico_atual: nivelAtual,
        aprovado,
        observacao: "Avaliação gerada pelo painel de testes",
      };
      if (aprovado && proximoNivel) {
        item.proximo_ano_academico = proximoNivel;
      }

      batch.push(item);
    }

    if (batch.length === 0) { addLog("Nenhuma avaliação para enviar", "warn"); return; }

    const CHUNK_SIZE_AVAL = 1000;
    const chunksAval: any[][] = [];
    for (let i = 0; i < batch.length; i += CHUNK_SIZE_AVAL) {
      chunksAval.push(batch.slice(i, i + CHUNK_SIZE_AVAL));
    }

    addLog(
      `  Submetendo ${batch.length} avaliação(ões) em ${chunksAval.length} job(s) de até ${CHUNK_SIZE_AVAL} itens...`,
      "info"
    );

    let totalOkAval = 0;
    let totalErrAval = 0;

    for (let ci = 0; ci < chunksAval.length; ci++) {
      if (cancelRef.current) break;
      const chunk = chunksAval[ci];
      const label = chunksAval.length > 1 ? `Avaliações ${ci + 1}/${chunksAval.length}` : "Avaliações";
      addLog(`  📦 Submetendo job ${ci + 1}/${chunksAval.length} — ${chunk.length} avaliação(ões)...`, "info");

      const { ok, data } = await callApi("POST", "/academia/avaliacao-final/async", chunk, academia.token);
      if (!ok) {
        const errMsg = (data as any)?.message || (data as any)?.error || "Erro ao submeter";
        addLog(`  ✗ Erro no job ${ci + 1}: ${errMsg}`, "err");
        break;
      }

      const jobId = (data as any)?.job_id;
      if (!jobId) { addLog(`  ✗ Job ID não retornado (chunk ${ci + 1})`, "err"); break; }
      addLog(`  Job ${jobId} criado — ${chunk.length} avaliação(ões) na fila`, "dim");

      const result = await acompanharJob(jobId, label);
      if (!result.timedOut) {
        totalOkAval += result.ok;
        totalErrAval += result.err;
      }

      if (ci < chunksAval.length - 1 && !cancelRef.current) await sleep(500);
    }

    addLog(
      `Avaliações concluídas: ${totalOkAval} ✓  ${totalErrAval > 0 ? `${totalErrAval} ✗  ` : ""}(≈${nAprov} aprovações de ${sample.length} total)`,
      totalOkAval > 0 ? "ok" : "err"
    );
  };

  // ─── Configurar Ano Letivo ─────────────────────────────────────────────────────
  const configurarAnoLetivo = async () => {
    if (!academia) return;
    const ano = "2025_2026";
    const tipo = academia.tipo === "superior" ? "superior" : "escola";
    const { ok, data } = await callApi("POST", "/academia/ano-letivo", { ano_letivo: ano, tipo }, academia.token);
    if (ok) {
      addLog(`Ano letivo ${ano} (tipo: ${tipo}) configurado ✓`, "ok");
      setAcademia(prev => prev ? { ...prev, ano_letivo: ano } : prev);
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
  const tiposEnsinoDisp = academia ? tiposEnsinoDisponiveis(academia, cursos) : [];
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
  const categoriasDisponiveis = tipoNota === "escolar" ? CATEGORIAS_ESCOLAR : CATEGORIAS_SUPERIOR;
  const categoriasAtivas = tipoNota === "escolar" ? categoriaEscolarSel : categoriaSuperiorSel;
  const setCategoriasAtivas = tipoNota === "escolar" ? setCategoriaEscolarSel : setCategoriaSuperiorSel;

  // Estimativa de notas: por cada estudante, encontra matérias compatíveis e calcula combinações
  const estimativaNota = (() => {
    if (!academia || materias.length === 0 || estudantes.length === 0) return 0;
    const totalSample = notaConfig.qtdEstudantes > 0 ? Math.min(notaConfig.qtdEstudantes, estudantes.length) : estudantes.length;
    const sample = estudantes.slice(0, totalSample);
    let count = 0;
    for (const est of sample) {
      const mats = materiasDoEstudante(est, materias);
      for (const mat of mats) {
        const periodos = periodosParaMateria(mat);
        count += periodos.length * categoriasAtivas.length;
      }
    }
    return count;
  })();

  // Estimativa de faltas
  const estimativaFalta = (() => {
    if (!academia || materias.length === 0 || estudantes.length === 0) return 0;
    const totalSample = faltaConfig.qtdEstudantes > 0 ? Math.min(faltaConfig.qtdEstudantes, estudantes.length) : estudantes.length;
    const sample = estudantes.slice(0, totalSample);
    let count = 0;
    for (const est of sample) {
      const mats = materiasDoEstudante(est, materias);
      count += mats.length * DATAS_FALTA.length;
    }
    return count;
  })();

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
    if (currentUser?.tipo === "admin") {
      return (
        <div style={{ minHeight: "100vh", background: "#020817", color: "#e2e8f0", padding: 24, fontFamily: "'JetBrains Mono', monospace" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", border: "1px solid #1e293b", borderRadius: 12, background: "#0f172a", padding: 24 }}>
            <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 24 }}>Cadastrar Academia</h1>
            <p style={{ marginTop: 0, color: "#94a3b8", marginBottom: 20 }}>
              Preencha os dados abaixo para registrar uma nova academia.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <input placeholder="Nome *" value={cadastroForm.nome} onChange={(e) => setCadastroForm((p) => ({ ...p, nome: e.target.value }))} style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8, padding: "10px 12px" }} />
              <input placeholder="Província *" value={cadastroForm.provincia} onChange={(e) => setCadastroForm((p) => ({ ...p, provincia: e.target.value }))} style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8, padding: "10px 12px" }} />
              <input placeholder="Endereço *" value={cadastroForm.endereco} onChange={(e) => setCadastroForm((p) => ({ ...p, endereco: e.target.value }))} style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8, padding: "10px 12px", gridColumn: "1 / -1" }} />
              <select value={cadastroForm.nivel} onChange={(e) => setCadastroForm((p) => ({ ...p, nivel: e.target.value as "escola" | "superior" }))} style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
                <option value="escola">Escola</option>
                <option value="superior">Superior</option>
              </select>
              <select value={cadastroForm.type} onChange={(e) => setCadastroForm((p) => ({ ...p, type: e.target.value as "private" | "public" }))} style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
                <option value="private">Privada</option>
                <option value="public">Pública</option>
              </select>
              {cadastroForm.nivel === "escola" && (
                <select value={cadastroForm.nivel_escolar} onChange={(e) => setCadastroForm((p) => ({ ...p, nivel_escolar: e.target.value as "fundamental" | "medio" | "misto" }))} style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
                  <option value="fundamental">Fundamental</option>
                  <option value="medio">Médio</option>
                  <option value="misto">Misto</option>
                </select>
              )}
              <input placeholder="Telefone" value={cadastroForm.numero_telefone} onChange={(e) => setCadastroForm((p) => ({ ...p, numero_telefone: e.target.value }))} style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8, padding: "10px 12px" }} />
              <input placeholder="Email" value={cadastroForm.email} onChange={(e) => setCadastroForm((p) => ({ ...p, email: e.target.value }))} style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8, padding: "10px 12px" }} />
              <input placeholder="Website" value={cadastroForm.website} onChange={(e) => setCadastroForm((p) => ({ ...p, website: e.target.value }))} style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8, padding: "10px 12px", gridColumn: "1 / -1" }} />
            </div>

            {cadastroErro && <p style={{ color: "#f87171", marginTop: 16 }}>{cadastroErro}</p>}
            {cadastroMsg && <p style={{ color: "#4ade80", marginTop: 16 }}>{cadastroMsg}</p>}

            <button onClick={handleCadastroAcademia} disabled={cadastroLoading} style={{ marginTop: 12, background: cadastroLoading ? "#1e293b" : "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, cursor: cadastroLoading ? "not-allowed" : "pointer" }}>
              {cadastroLoading ? "Cadastrando..." : "Cadastrar Academia"}
            </button>
          </div>
        </div>
      );
    }

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
  const totalEstudantesFalta = faltaConfig.qtdEstudantes > 0 ? Math.min(faltaConfig.qtdEstudantes, estudantes.length) : estudantes.length;

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
              <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#60a5fa" }}>ℹ Jobs assíncronos</p>
              <p style={{ margin: 0 }}>
                Ao submeter um job, o servidor processa em background.
                Acompanhe o progresso pelo <strong style={{ color: "#94a3b8" }}>sino 🔔</strong> no canto superior direito.
              </p>
            </div>

            <div style={{ border: "1px solid #334155", borderRadius: 8, padding: 12, background: "#0a1929", fontSize: 11, color: "#64748b", lineHeight: 1.6, marginTop: 12 }}>
              <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#94a3b8" }}>ℹ Idempotência de notas e faltas</p>
              <p style={{ margin: 0 }}>
                Notas e faltas são enviadas sem pré-verificação. O backend bloqueia duplicatas automaticamente
                (409 por item no batch). Reenviar é seguro — apenas novos registos são criados.
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
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#475569" }}>
                    ✦ Para notas/faltas cobrindo todos os estudantes, crie matérias para <strong style={{ color: "#64748b" }}>cada ano académico</strong> que os estudantes frequentam
                  </p>
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
                  max={1000}
                  step={10}
                  onChange={v => setEstudanteConfig(p => ({ ...p, qtd: v }))}
                  hint={`máx. 1000 por job`}
                />
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
                    <Field label="Status fundamental">
                      <Sel value={estudanteConfig.statusFundamental}
                        onChange={e => setEstudanteConfig(p => ({ ...p, statusFundamental: e.target.value }))}>
                        <option value="em_andamento">Em andamento</option>
                        <option value="inativo">Inativo</option>
                        <option value="finalizado">Finalizado</option>
                      </Sel>
                    </Field>
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
                          onChange={e => setEstudanteConfig(p => ({ ...p, cursoMedioId: e.target.value, anoMedio: "random" }))}>
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
                      <Field label="Status médio">
                        <Sel value={estudanteConfig.statusMedio}
                          onChange={e => setEstudanteConfig(p => ({ ...p, statusMedio: e.target.value }))}>
                          <option value="em_andamento">Em andamento</option>
                          <option value="inativo">Inativo</option>
                          <option value="finalizado">Finalizado</option>
                        </Sel>
                      </Field>
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
                          onChange={e => setEstudanteConfig(p => ({ ...p, cursoSuperiorId: e.target.value, anoSuperior: "random" }))}>
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
                      <Field label="Status superior">
                        <Sel value={estudanteConfig.statusSuperior}
                          onChange={e => setEstudanteConfig(p => ({ ...p, statusSuperior: e.target.value }))}>
                          <option value="em_andamento">Em andamento</option>
                          <option value="inativo">Inativo</option>
                          <option value="finalizado">Finalizado</option>
                        </Sel>
                      </Field>
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
                  Gerar {estudanteConfig.qtd} Estudante(s) (async)
                </Btn>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "#475569" }}>
                Usa endpoint assíncrono — limite: 1000 por job
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
                        Vincular {estudantesSemTurmaComCompativeis.length} compatíveis (async)
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
            <Section
              title="Notas"
              badge={
                materias.length === 0
                  ? "crie matérias primeiro"
                  : estudantes.length === 0
                  ? "crie estudantes primeiro"
                  : `≈${estimativaNota} notas estimadas`
              }
            >
              <SubSection title={`Categorias — ${tipoNota === "escolar" ? "Escolar" : "Superior"}`}>
                <CategoryCheckboxes
                  label="Registrar notas para"
                  options={categoriasDisponiveis}
                  selected={categoriasAtivas}
                  onChange={setCategoriasAtivas}
                />
                <p style={{ margin: "8px 0 0", fontSize: 11, color: "#475569" }}>
                  {tipoNota === "escolar"
                    ? "Categorias fixas do ensino escolar"
                    : "Categorias fixas do ensino superior"}
                  {" · "}{categoriasAtivas.length} de {categoriasDisponiveis.length} selecionada(s)
                </p>
              </SubSection>

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
                <Btn
                  onClick={() => withLoading(gerarNotas)}
                  color="#b45309"
                  disabled={materias.length === 0 || estudantes.length === 0}
                >
                  Gerar Notas (async)
                </Btn>
              </Row>

              {/* Painel informativo sobre a lógica */}
              <div style={{ background: "#0a1929", border: "1px solid #1e3a5f", borderRadius: 8, padding: "10px 14px", marginTop: 8, fontSize: 11, color: "#64748b", lineHeight: 1.7 }}>
                <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#60a5fa" }}>Cobertura completa por estudante</p>
                <p style={{ margin: 0 }}>
                  Cada estudante recebe notas em <strong style={{ color: "#94a3b8" }}>todas as matérias</strong> cujos{" "}
                  <code style={{ color: "#60a5fa" }}>anos_academicos</code> incluem o seu ano atual
                  (e, para médio/superior, cujo <code style={{ color: "#60a5fa" }}>curso_id</code> coincide).
                  Para escolar: 3 trimestres × {categoriasAtivas.length} categorias.
                  Para superior: 1 período (definido na matéria) × {categoriasAtivas.length} categorias.
                  <br />Duplicatas são bloqueadas automaticamente pelo backend — reenviar é seguro.
                </p>
              </div>
            </Section>

            {/* Faltas */}
            <Section
              title="Faltas"
              badge={
                materias.length === 0
                  ? "crie matérias primeiro"
                  : estudantes.length === 0
                  ? "crie estudantes primeiro"
                  : `≈${estimativaFalta} faltas estimadas`
              }
            >
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
                <Btn
                  onClick={() => withLoading(gerarFaltas)}
                  color="#b45309"
                  disabled={materias.length === 0 || estudantes.length === 0}
                >
                  Gerar Faltas (async)
                </Btn>
              </Row>

              {/* Painel informativo sobre a lógica */}
              <div style={{ background: "#0a1929", border: "1px solid #1e3a5f", borderRadius: 8, padding: "10px 14px", marginTop: 8, fontSize: 11, color: "#64748b", lineHeight: 1.7 }}>
                <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#60a5fa" }}>Cobertura completa por estudante</p>
                <p style={{ margin: 0 }}>
                  Cada estudante recebe faltas em <strong style={{ color: "#94a3b8" }}>todas as matérias</strong> compatíveis
                  com o seu ano e curso, em todas as {DATAS_FALTA.length} datas ({DATAS_FALTA.join(", ")}).
                  <br />Duplicatas (mesma data + matéria + estudante) são bloqueadas pelo backend — reenviar é seguro.
                </p>
              </div>
            </Section>

            {/* Avaliações Finais */}
            <Section title="Avaliações Finais" badge={estudantes.length === 0 ? "crie estudantes primeiro" : `${estudantes.length} estudantes`}>
              {tiposEnsinoDisp.length === 0 ? (
                <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>
                  {academia.tipo === "escola" && (academia.nivel === "medio" || academia.nivel === "misto")
                    ? "Crie e ative cursos médios para habilitar avaliações de nível médio"
                    : "Crie e ative cursos para habilitar avaliações"}
                </p>
              ) : (
                <>
                  <Row>
                    <Field label="Tipo ensino">
                      <Sel value={avalConfig.tipoEnsino} onChange={e => setAvalConfig(p => ({ ...p, tipoEnsino: e.target.value }))}>
                        {tiposEnsinoDisp.map(t => (<option key={t.value} value={t.value}>{t.label}</option>))}
                      </Sel>
                    </Field>
                    <NumberStepper
                      label="% Aprovação"
                      value={avalConfig.aprovPct}
                      min={0}
                      max={100}
                      step={5}
                      onChange={v => setAvalConfig(p => ({ ...p, aprovPct: v }))}
                      hint={`≈${Math.floor(estudantes.length * avalConfig.aprovPct / 100)} aprovados`}
                    />
                    <Btn onClick={() => withLoading(gerarAvaliacoes)} color="#7c3aed" disabled={estudantes.length === 0}>
                      Avaliar TODOS ({estudantes.length}) async
                    </Btn>
                  </Row>
                </>
              )}
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
