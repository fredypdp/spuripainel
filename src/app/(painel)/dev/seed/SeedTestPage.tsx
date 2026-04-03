"use client";
import { useState, useCallback, useRef } from "react";
import { tokenStorage } from "@/lib/api";
import { adminService } from "@/lib/api/services";
import type {
  CriarEscolaRequest,
  CriarEstudanteRequest,
  RegistrarNotasRequest,
  RegistrarFaltasRequest,
  RegistrarAvaliacaoFinalRequest,
  CriarCursoRequest,
  CriarMateriaRequest,
  CriarTurmaRequest,
} from "@/types/api";

// ─── Dados estáticos (espelhados do spuri_seed.py) ───────────────────────────

const PROVINCIAS: [string, string][] = [
  ["Bengo", "bengo"], ["Benguela", "benguela"], ["Bie", "bie"],
  ["Cabinda", "cabinda"], ["Cuando Cubango", "cuando cubango"],
  ["Cuanza Norte", "cuanza norte"], ["Cuanza Sul", "cuanza sul"],
  ["Cubango", "cuando cubango"], ["Cunene", "cunene"], ["Huambo", "huambo"],
  ["Huila", "huila"], ["Icolo e Bengo", "bengo"], ["Luanda", "luanda"],
  ["Lunda Norte", "lunda norte"], ["Lunda Sul", "lunda sul"],
  ["Malanje", "malanje"], ["Moxico", "moxico"], ["Moxico Leste", "moxico"],
  ["Namibe", "namibe"], ["Uige", "uige"], ["Zaire", "zaire"],
];

const GRUPOS_FUNDAMENTAL = [
  ["1_ano_fundamental","2_ano_fundamental","3_ano_fundamental"],
  ["1_ano_fundamental","2_ano_fundamental","3_ano_fundamental","4_ano_fundamental","5_ano_fundamental","6_ano_fundamental"],
  ["4_ano_fundamental","5_ano_fundamental","6_ano_fundamental"],
  ["7_ano_fundamental","8_ano_fundamental","9_ano_fundamental"],
  ["1_ano_fundamental","2_ano_fundamental","3_ano_fundamental","4_ano_fundamental","5_ano_fundamental","6_ano_fundamental","7_ano_fundamental","8_ano_fundamental","9_ano_fundamental"],
];

const GRUPOS_MISTO = [
  ["1_ano_fundamental","2_ano_fundamental","3_ano_fundamental","4_ano_fundamental","5_ano_fundamental","6_ano_fundamental"],
  ["7_ano_fundamental","8_ano_fundamental","9_ano_fundamental"],
  ["1_ano_fundamental","2_ano_fundamental","3_ano_fundamental","4_ano_fundamental","5_ano_fundamental","6_ano_fundamental","7_ano_fundamental","8_ano_fundamental","9_ano_fundamental"],
];

const CURSOS_MEDIO: CriarCursoRequest[] = [
  { nome: "Ciencias e Tecnologia", type: "medio", anos_academicos: ["1_ano_medio","2_ano_medio","3_ano_medio"] },
  { nome: "Letras e Ciencias Humanas", type: "medio", anos_academicos: ["1_ano_medio","2_ano_medio","3_ano_medio"] },
  { nome: "Economico-Juridico", type: "medio", anos_academicos: ["1_ano_medio","2_ano_medio","3_ano_medio"] },
  { nome: "Informatica e Gestao", type: "medio", anos_academicos: ["1_ano_medio","2_ano_medio","3_ano_medio"] },
];

const MATERIAS_FUND = ["Lingua Portuguesa","Matematica","Estudo do Meio","Educacao Visual","Educacao Fisica","Musica","Lingua Inglesa","Ciencias Naturais","Historia de Angola","Formacao Civica"];
const MATERIAS_MEDIO = ["Lingua Portuguesa","Matematica","Fisica","Quimica","Biologia","Historia","Geografia","Filosofia","Ingles","Educacao Fisica","Informatica","Economia"];
const NOMES_M = ["Joao","Antonio","Manuel","Francisco","Domingos","Pedro","Paulo","Carlos","Luis","Miguel","Filipe","Rui","Helder","Faustino","Simao","Ezequiel","Armindo","Mario","Narciso","Sergio"];
const NOMES_F = ["Maria","Ana","Sofia","Isabel","Filomena","Rosa","Conceicao","Graca","Fernanda","Lurdes","Beatriz","Carla","Diana","Elisa","Fatima","Gloria","Helena","Ines","Joana","Katia"];
const SOBRENOMES = ["Silva","Santos","Costa","Ferreira","Oliveira","Neto","Lopes","Fernandes","Goncalves","Rodrigues","Monteiro","Cardoso","Marques","Correia","Mendes","Kiala","Nzinga","Mbemba","Lukamba","Tchipilica"];

// ─── Helpers de geração aleatória ────────────────────────────────────────────

const rnd = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const pickN = <T,>(arr: T[], n: number): T[] => [...arr].sort(() => 0.5 - Math.random()).slice(0, n);

function gerarNome() {
  const masc = Math.random() < 0.51;
  const nome = masc ? pick(NOMES_M) : pick(NOMES_F);
  return { nome: `${nome} ${pick(SOBRENOMES)} ${pick(SOBRENOMES)}`, genero: masc ? "masculino" as const : "feminino" as const };
}

function gerarDataNasc(minAge = 12, maxAge = 24): string {
  const dias = rnd(minAge, maxAge) * 365 + rnd(0, 364);
  const d = new Date(Date.now() - dias * 86400000);
  return d.toISOString().split("T")[0] + "T00:00:00Z";
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

type NivelTipo = "fundamental" | "misto" | "medio";

interface EscolaMeta {
  prov_display: string;
  prov_api: string;
  nivel: NivelTipo;
  anos: string[];
  nome: string;
  endereco: string;
}

interface AcademiaRegistrada {
  meta: EscolaMeta;
  codigo: string;
  token?: string;
}

interface LogEntry { ts: string; level: "ok" | "err" | "warn" | "info" | "step"; msg: string; }

interface TestConfig {
  provFilter: string;
  nivelFilter: string;
  minEst: number;
  maxEst: number;
  qtdAcademias: number;
  aprovPct: number;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SeedTestPage() {
  const [config, setConfig] = useState<TestConfig>({
    provFilter: "",
    nivelFilter: "",
    minEst: 10,
    maxEst: 30,
    qtdAcademias: 3,
    aprovPct: 70,
  });

  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState({ step: "", pct: 0 });
  const cancelRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string, level: LogEntry["level"] = "info") => {
    const ts = new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(prev => {
      const next = [...prev, { ts, level, msg }];
      return next.slice(-500); // manter só as últimas 500 linhas
    });
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const setStep = (step: string, pct: number) => setProgress({ step, pct });

  // ── Login numa academia ────────────────────────────────────────────────────

  async function loginAcademia(codigo: string): Promise<string | null> {
    try {
      const r = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "") + "/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario: codigo, senha: codigo }),
        }
      );
      const data = await r.json();
      return data?.token ?? null;
    } catch {
      return null;
    }
  }

  // ── Chamada API autenticada ────────────────────────────────────────────────

  async function callApi(
    method: string, path: string, body: unknown, tok?: string
  ): Promise<{ ok: boolean; data: unknown }> {
    const url = (process.env.NEXT_PUBLIC_API_URL || "") + path;
    const token = tok || tokenStorage.get() || "";
    try {
      const r = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await r.json().catch(() => ({}));
      return { ok: r.status >= 200 && r.status < 300, data };
    } catch (e) {
      return { ok: false, data: { error: String(e) } };
    }
  }

  // ── Batch helper ───────────────────────────────────────────────────────────

  async function apiBatch(
    method: string, path: string, items: unknown[], chunkSize: number, tok?: string
  ): Promise<{ ok: number; err: number }> {
    let ok = 0; let err = 0;
    for (let i = 0; i < items.length; i += chunkSize) {
      if (cancelRef.current) break;
      const chunk = items.slice(i, i + chunkSize);
      const { ok: rOk, data } = await callApi(method, path, chunk, tok);
      if (!rOk) { err += chunk.length; continue; }
      const res = data as { items?: { sucesso: boolean }[] };
      if (res?.items) {
        res.items.forEach(it => it.sucesso ? ok++ : err++);
      } else {
        ok += chunk.length;
      }
    }
    return { ok, err };
  }

  // ─── PASSO 1: Criar academias ─────────────────────────────────────────────

  async function passo1CriarAcademias(lista: EscolaMeta[]): Promise<AcademiaRegistrada[]> {
    setStep("Passo 1 — Criar academias", 5);
    addLog(`Criando ${lista.length} academia(s) em batch...`, "step");

    const criadas: AcademiaRegistrada[] = [];
    const adminToken = tokenStorage.get() || "";

    for (let i = 0; i < lista.length; i += 5) {
      if (cancelRef.current) break;
      const chunk = lista.slice(i, i + 5);
      const payloads: CriarEscolaRequest[] = chunk.map(m => ({
        type: "escola",
        nome: m.nome,
        provincia: m.prov_api,
        endereco: m.endereco,
        nivel_escolar: m.nivel as any,
        ...(m.anos.length > 0 ? { anos_academicos: m.anos } : {}),
      }));

      const { ok: rOk, data } = await callApi("POST", "/dominis/academia/register/batch", payloads, adminToken);
      if (!rOk) {
        addLog(`Lote ${i / 5 + 1}: falhou (${JSON.stringify((data as any)?.error ?? "sem detalhes")})`, "err");
        continue;
      }

      const res = data as { items: { sucesso: boolean; dados?: { data?: { codigo_academia?: string } } }[] };
      res.items?.forEach((it, idx) => {
        const codigo = it.dados?.data?.codigo_academia;
        if (it.sucesso && codigo) {
          criadas.push({ meta: chunk[idx], codigo });
          addLog(`  Academia criada: ${codigo} (${chunk[idx].nivel})`, "ok");
        } else {
          addLog(`  Falha ao criar academia ${chunk[idx].nome}`, "err");
        }
      });
    }

    addLog(`Passo 1 concluído: ${criadas.length}/${lista.length} criadas`, "ok");
    return criadas;
  }

  // ─── PASSO 2: Ativar academias ────────────────────────────────────────────

  async function passo2AtivarAcademias(academias: AcademiaRegistrada[]): Promise<void> {
    setStep("Passo 2 — Ativar academias", 15);
    addLog(`Ativando ${academias.length} academia(s)...`, "step");
    const adminToken = tokenStorage.get() || "";
    const payloads = academias.map(a => ({ codigo: a.codigo }));
    const { ok, err } = await apiBatch("PUT", "/dominis/academia/ativar/batch", payloads, 50, adminToken);
    addLog(`Passo 2: ${ok} ativadas, ${err} erros`, err > 0 ? "warn" : "ok");
  }

  // ─── PASSO 3: Configurar infra por academia ───────────────────────────────

  async function passo3ConfigurarInfra(
    academias: AcademiaRegistrada[]
  ): Promise<void> {
    setStep("Passo 3 — Configurar infra (cursos, matérias, turmas)", 25);

    for (let i = 0; i < academias.length; i++) {
      if (cancelRef.current) break;
      const ac = academias[i];
      setStep(`Passo 3 [${i + 1}/${academias.length}] — ${ac.codigo}`, 25 + (i / academias.length) * 20);
      addLog(`  Configurando ${ac.codigo} (${ac.meta.nivel})...`, "step");

      const tok = await loginAcademia(ac.codigo);
      if (!tok) { addLog(`  Falha no login de ${ac.codigo}`, "err"); continue; }
      ac.token = tok;

      // Ano letivo
      await callApi("POST", "/academia/ano-letivo", { ano_letivo: "2025_2026", tipo: "escola" }, tok);
      addLog(`    Ano letivo definido`, "info");

      // Cursos (apenas médio/misto)
      const cursoIds: string[] = [];
      if (ac.meta.nivel !== "fundamental") {
        const { ok: rOk, data } = await callApi("POST", "/academia/curso/batch", CURSOS_MEDIO, tok);
        const res = data as { items?: { sucesso: boolean; dados?: { data?: { id?: string } } }[] };
        if (rOk && res.items) {
          const ids = res.items.filter(it => it.sucesso).map(it => it.dados?.data?.id).filter(Boolean) as string[];
          cursoIds.push(...ids);
          if (ids.length > 0) {
            await callApi("PUT", "/academia/curso/ativar/batch", ids.map(id => ({ id })), tok);
          }
          addLog(`    ${ids.length} cursos criados e ativados`, "info");
        }
      }

      // Matérias
      const matPayloads: CriarMateriaRequest[] = [];
      if (ac.meta.nivel === "fundamental" || ac.meta.nivel === "misto") {
        const pool = pickN(MATERIAS_FUND, 5);
        pool.forEach(nome => {
          const ano = pick(ac.meta.anos.length > 0 ? ac.meta.anos : ["1_ano_fundamental"]);
          const n = ano.replace("_ano_fundamental", "");
          matPayloads.push({ nome: `${nome} ${n}F`, type: "fundamental", anos_academicos: [ano] });
        });
      }
      if ((ac.meta.nivel === "medio" || ac.meta.nivel === "misto") && cursoIds.length > 0) {
        const cId = pick(cursoIds);
        pickN(MATERIAS_MEDIO, 4).forEach(nome => {
          matPayloads.push({ nome: `${nome} 1M`, type: "medio", anos_academicos: ["1_ano_medio"], curso_id: cId });
        });
      }
      if (matPayloads.length > 0) {
        await callApi("POST", "/academia/materia/batch", matPayloads, tok);
        addLog(`    ${matPayloads.length} matérias criadas`, "info");
      }

      // Turmas
      const turPayloads: CriarTurmaRequest[] = [];
      const turnos: ("manha" | "tarde" | "noite")[] = ["manha", "tarde", "noite"];
      if (ac.meta.nivel === "fundamental" || ac.meta.nivel === "misto") {
        ac.meta.anos.slice(0, 3).forEach((ano, idx) => {
          turPayloads.push({ codigo_turma: `F${idx + 1}A${rnd(10, 99)}`, nivel: ano, turno: pick(turnos) });
        });
      }
      if ((ac.meta.nivel === "medio" || ac.meta.nivel === "misto") && cursoIds.length > 0) {
        ["1_ano_medio", "2_ano_medio"].forEach((ano, idx) => {
          turPayloads.push({ codigo_turma: `M${idx + 1}A${rnd(10, 99)}`, nivel: ano, turno: pick(turnos), curso_id: pick(cursoIds) });
        });
      }
      if (turPayloads.length > 0) {
        await callApi("POST", "/academia/turma/batch", turPayloads, tok);
        addLog(`    ${turPayloads.length} turmas criadas`, "info");
      }
    }

    addLog("Passo 3 concluído", "ok");
  }

  // ─── PASSO 4-9: Popular dados ─────────────────────────────────────────────

  async function passos4a9PopularDados(
    academias: AcademiaRegistrada[],
    minEst: number, maxEst: number, aprovPct: number
  ): Promise<void> {

    for (let i = 0; i < academias.length; i++) {
      if (cancelRef.current) break;
      const ac = academias[i];
      const basePct = 45 + (i / academias.length) * 55;
      setStep(`Passos 4-9 [${i + 1}/${academias.length}] — ${ac.codigo}`, basePct);
      addLog(`\n  Populando ${ac.codigo}...`, "step");

      const tok = ac.token || (await loginAcademia(ac.codigo));
      if (!tok) { addLog(`  Falha login ${ac.codigo}`, "err"); continue; }

      // Buscar matérias
      const { data: matData } = await callApi("GET", "/academia/materias", undefined, tok);
      const materias = ((matData as any)?.materias ?? []) as { id: string; type: string; anos_academicos: string[]; nome: string }[];

      // Buscar turmas
      const { data: turData } = await callApi("GET", "/academia/turmas", undefined, tok);
      const turmas = ((turData as any)?.turmas ?? []) as { id: string; codigo_turma: string; estudantes: string[] }[];

      // Gerar estudantes
      const qtd = rnd(minEst, maxEst);
      addLog(`    Criando ${qtd} estudantes...`, "info");
      const estPayloads: CriarEstudanteRequest[] = [];
      for (let j = 0; j < qtd; j++) {
        const { nome, genero } = gerarNome();
        const body: CriarEstudanteRequest = {
          nome, genero,
          data_nascimento: gerarDataNasc(),
        };
        if (ac.meta.nivel === "fundamental" && ac.meta.anos.length > 0) {
          body.ano_escolar = pick(ac.meta.anos);
          body.status_escolar_fundamental = "em_andamento";
        } else if (ac.meta.nivel === "medio" || ac.meta.nivel === "misto") {
          body.ano_escolar_medio = pick(["1_ano_medio", "2_ano_medio", "3_ano_medio"]);
          body.status_escolar_medio = "em_andamento";
        }
        estPayloads.push(body);
      }

      const { ok: eOk, err: eErr } = await apiBatch("POST", "/academia/estudante/register/batch", estPayloads, 100, tok);
      addLog(`    Estudantes: ${eOk} criados, ${eErr} erros`, eErr > 0 ? "warn" : "ok");

      // Buscar estudantes criados
      const { data: estData } = await callApi("GET", "/estudantes", undefined, tok);
      const estudantes = ((estData as any)?.estudantes ?? []) as { codigo_estudante: string }[];

      if (estudantes.length === 0) {
        addLog(`    Nenhum estudante encontrado, saltando`, "warn");
        continue;
      }

      // Vincular turmas
      if (turmas.length > 0) {
        const vinculos = estudantes.slice(0, Math.min(50, estudantes.length)).map(e => ({
          codigo_turma: pick(turmas).codigo_turma,
          codigo_estudante: e.codigo_estudante,
        }));
        const { ok: vOk } = await apiBatch("POST", "/academia/turma/estudante/batch", vinculos, 100, tok);
        addLog(`    ${vOk} vínculos turma criados`, "info");
      }

      // Registrar notas
      if (materias.length > 0) {
        const notaPayloads: RegistrarNotasRequest[] = [];
        const amostraEst = estudantes.slice(0, Math.min(20, estudantes.length));
        amostraEst.forEach(e => {
          pickN(materias, Math.min(3, materias.length)).forEach(m => {
            ["1_trimestre", "2_trimestre", "3_trimestre"].forEach(periodo => {
              notaPayloads.push({
                codigo_estudante: e.codigo_estudante,
                periodo: periodo as import("@/types/api").Periodo,
                materia_disciplinar_id: m.id,
                tipo: m.type === "fundamental" ? "escolar" : "escolar",
                categoria: "nota_escola",
                nota: rnd(8, 20) + Math.random(),
              });
            });
          });
        });

        if (notaPayloads.length > 0) {
          const { ok: nOk, err: nErr } = await apiBatch("POST", "/academia/notas-aluno/batch", notaPayloads, 200, tok);
          addLog(`    Notas: ${nOk} registradas, ${nErr} erros`, nErr > 0 ? "warn" : "ok");
        }
      }

      // Registrar faltas
      if (materias.length > 0) {
        const faltaPayloads: RegistrarFaltasRequest[] = [];
        const amostraEst = estudantes.slice(0, Math.min(15, estudantes.length));
        const datas = ["2025-03-10","2025-04-07","2025-05-05","2025-06-02","2025-07-07","2025-09-01"];
        amostraEst.forEach(e => {
          pickN(materias, Math.min(2, materias.length)).forEach(m => {
            faltaPayloads.push({
              codigo_estudante: e.codigo_estudante,
              data: pick(datas),
              materia_disciplinar_id: m.id,
              quantidade: rnd(1, 3),
            });
          });
        });

        if (faltaPayloads.length > 0) {
          const { ok: fOk, err: fErr } = await apiBatch("POST", "/academia/faltas-aluno/batch", faltaPayloads, 200, tok);
          addLog(`    Faltas: ${fOk} registradas, ${fErr} erros`, fErr > 0 ? "warn" : "ok");
        }
      }

      // Avaliações finais
      const nAprov = Math.floor(estudantes.slice(0, 20).length * aprovPct / 100);
      const amostraAval = estudantes.slice(0, Math.min(20, estudantes.length));
      const avalPayloads: RegistrarAvaliacaoFinalRequest[] = [];
      amostraAval.forEach((e, idx) => {
        const aprovado = idx < nAprov;
        if (ac.meta.nivel === "fundamental" && ac.meta.anos.length > 0) {
          const nv = pick(ac.meta.anos);
          const prox = ac.meta.anos[ac.meta.anos.indexOf(nv) + 1];
          avalPayloads.push({
            codigo_estudante: e.codigo_estudante,
            tipo_ensino: "fundamental",
            nivel_ano_academico_atual: nv,
            aprovado,
            observacao: "Avaliacao via painel de testes 2025_2026",
            ...(aprovado && prox ? { proximo_ano_academico: prox } : {}),
          });
        } else {
          avalPayloads.push({
            codigo_estudante: e.codigo_estudante,
            tipo_ensino: "medio",
            nivel_ano_academico_atual: "1_ano_medio",
            aprovado,
            observacao: "Avaliacao via painel de testes 2025_2026",
            ...(aprovado ? { proximo_ano_academico: "2_ano_medio" } : {}),
          });
        }
      });

      if (avalPayloads.length > 0) {
        const { ok: aOk, err: aErr } = await apiBatch("POST", "/academia/avaliacao-final/batch", avalPayloads, 100, tok);
        addLog(`    Avaliações: ${aOk} registradas, ${aErr} erros (${nAprov} aprovações)`, aErr > 0 ? "warn" : "ok");
      }

      addLog(`  ${ac.codigo} populada ✓`, "ok");
    }

    addLog("Passos 4-9 concluídos", "ok");
  }

  // ─── RUNNER PRINCIPAL ─────────────────────────────────────────────────────

  async function runSeed() {
    cancelRef.current = false;
    setRunning(true);
    setLogs([]);
    setProgress({ step: "A iniciar...", pct: 0 });

    addLog("=== SPURI — PAINEL DE TESTES ===", "step");
    addLog(`Config: ${config.qtdAcademias} academias | ${config.minEst}–${config.maxEst} estudantes | ${config.aprovPct}% aprovação`, "info");

    try {
      // Construir lista de academias a criar
      const tipos: { label: NivelTipo; grupos: string[][] }[] = [
        { label: "fundamental", grupos: GRUPOS_FUNDAMENTAL },
        { label: "misto", grupos: GRUPOS_MISTO },
        { label: "medio", grupos: [[]] },
      ];

      const lista: EscolaMeta[] = [];
      const provs = config.provFilter
        ? PROVINCIAS.filter(([d]) => d.toLowerCase().includes(config.provFilter.toLowerCase()))
        : PROVINCIAS;

      for (const [prov_display, prov_api] of provs) {
        for (const tipo of tipos) {
          if (config.nivelFilter && tipo.label !== config.nivelFilter) continue;
          if (lista.length >= config.qtdAcademias) break;
          const anos = tipo.label === "medio" ? [] : pick(tipo.grupos);
          lista.push({
            prov_display, prov_api,
            nivel: tipo.label,
            anos,
            nome: `Escola ${tipo.label.charAt(0).toUpperCase() + tipo.label.slice(1)} ${prov_display} ${rnd(1, 9)}`,
            endereco: `Rua ${rnd(1, 999)}, Bairro Central, ${prov_display}`,
          });
        }
        if (lista.length >= config.qtdAcademias) break;
      }

      addLog(`${lista.length} academias planeadas`, "info");

      const registradas = await passo1CriarAcademias(lista);
      if (registradas.length === 0) { addLog("Nenhuma academia criada. Abortar.", "err"); return; }

      await passo2AtivarAcademias(registradas);
      await passo3ConfigurarInfra(registradas);
      await passos4a9PopularDados(registradas, config.minEst, config.maxEst, config.aprovPct);

      setProgress({ step: "Concluído!", pct: 100 });
      addLog("\n=== SEEDING CONCLUÍDO ===", "ok");
    } catch (e) {
      addLog(`Erro inesperado: ${String(e)}`, "err");
    } finally {
      setRunning(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const levelColor: Record<LogEntry["level"], string> = {
    ok:   "text-green-400",
    err:  "text-red-400 font-semibold",
    warn: "text-yellow-400",
    info: "text-gray-400",
    step: "text-blue-400 font-bold",
  };

  const levelIcon: Record<LogEntry["level"], string> = {
    ok: "✓", err: "✗", warn: "!", info: "·", step: "▶",
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <div className="border border-gray-700 rounded-lg p-5 bg-gray-800">
          <h1 className="text-2xl font-bold text-white mb-1">Painel de Testes — Spuri Seeding</h1>
          <p className="text-sm text-gray-400">
            Cria academias, configura infraestrutura e popula dados de teste directamente na API.
            Usa o token do admin autenticado. Reproduz o comportamento do <code className="text-blue-400">spuri_seed.py</code>.
          </p>
        </div>

        {/* Configuração */}
        <div className="border border-gray-700 rounded-lg p-5 bg-gray-800 grid grid-cols-2 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Filtro província</label>
            <input
              type="text"
              placeholder="Ex: Luanda"
              value={config.provFilter}
              onChange={e => setConfig(c => ({ ...c, provFilter: e.target.value }))}
              disabled={running}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Nível escolar</label>
            <select
              value={config.nivelFilter}
              onChange={e => setConfig(c => ({ ...c, nivelFilter: e.target.value }))}
              disabled={running}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">Todos</option>
              <option value="fundamental">Fundamental</option>
              <option value="misto">Misto</option>
              <option value="medio">Médio</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Qtd. academias</label>
            <input
              type="number"
              min={1} max={63}
              value={config.qtdAcademias}
              onChange={e => setConfig(c => ({ ...c, qtdAcademias: Number(e.target.value) }))}
              disabled={running}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Mín. estudantes</label>
            <input
              type="number"
              min={1} max={500}
              value={config.minEst}
              onChange={e => setConfig(c => ({ ...c, minEst: Number(e.target.value) }))}
              disabled={running}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Máx. estudantes</label>
            <input
              type="number"
              min={1} max={1000}
              value={config.maxEst}
              onChange={e => setConfig(c => ({ ...c, maxEst: Number(e.target.value) }))}
              disabled={running}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Taxa aprovação (%)</label>
            <input
              type="number"
              min={0} max={100}
              value={config.aprovPct}
              onChange={e => setConfig(c => ({ ...c, aprovPct: Number(e.target.value) }))}
              disabled={running}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Controles */}
        <div className="flex gap-3 items-center">
          <button
            onClick={runSeed}
            disabled={running}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
          >
            {running ? "A executar..." : "▶ Iniciar Seeding"}
          </button>
          {running && (
            <button
              onClick={() => { cancelRef.current = true; addLog("Cancelamento solicitado...", "warn"); }}
              className="px-6 py-2.5 bg-red-700 hover:bg-red-600 rounded-lg text-sm font-semibold transition-colors"
            >
              ✕ Cancelar
            </button>
          )}
          {logs.length > 0 && !running && (
            <button
              onClick={() => setLogs([])}
              className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              Limpar log
            </button>
          )}
          <div className="text-xs text-gray-500 ml-auto">
            Token: {tokenStorage.get() ? <span className="text-green-400">presente ✓</span> : <span className="text-red-400">ausente ✗</span>}
          </div>
        </div>

        {/* Progress bar */}
        {(running || progress.pct > 0) && (
          <div className="border border-gray-700 rounded-lg p-4 bg-gray-800">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>{progress.step}</span>
              <span>{progress.pct.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Log terminal */}
        {logs.length > 0 && (
          <div className="border border-gray-700 rounded-lg bg-gray-950">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
              <span className="text-xs text-gray-400 font-mono">Log de execução ({logs.length} linhas)</span>
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="w-3 h-3 rounded-full bg-green-500" />
              </div>
            </div>
            <div className="h-96 overflow-y-auto p-4 font-mono text-xs space-y-0.5">
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-2 ${levelColor[log.level]}`}>
                  <span className="text-gray-600 shrink-0 w-20">{log.ts}</span>
                  <span className="shrink-0">{levelIcon[log.level]}</span>
                  <span className="whitespace-pre-wrap break-all">{log.msg}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        {/* Guia rápido */}
        <div className="border border-gray-700 rounded-lg p-5 bg-gray-800 text-sm">
          <h2 className="font-semibold text-gray-300 mb-3">Sequência de operações</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-400">
            {[
              ["1", "Criar academias", "POST /dominis/academia/register/batch (lotes de 5)"],
              ["2", "Ativar academias", "PUT /dominis/academia/ativar/batch (lotes de 50)"],
              ["3", "Configurar infra", "Ano letivo · Cursos · Matérias · Turmas (por academia)"],
              ["4", "Cadastrar estudantes", "POST /academia/estudante/register/batch (lotes de 100)"],
              ["5", "Vincular turmas", "POST /academia/turma/estudante/batch (lotes de 100)"],
              ["6", "Registrar notas", "POST /academia/notas-aluno/batch (lotes de 200)"],
              ["7", "Registrar faltas", "POST /academia/faltas-aluno/batch (lotes de 200)"],
              ["8", "Avaliações finais", "POST /academia/avaliacao-final/batch (lotes de 100)"],
            ].map(([n, titulo, desc]) => (
              <div key={n} className="flex gap-2">
                <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-blue-900 text-blue-300 font-bold text-xs">{n}</span>
                <div>
                  <div className="text-gray-200 font-medium">{titulo}</div>
                  <div className="text-gray-500">{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-500">
            ⚠ As operações <strong className="text-gray-400">não são atómicas</strong> — cada item é processado independentemente. Em caso de falha parcial, veja o log para detalhes. Este painel usa o token do admin actualmente autenticado.
          </p>
        </div>

      </div>
    </div>
  );
}