"use client";
import { useState, useCallback, useRef } from "react";
import { tokenStorage } from "@/lib/api";
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

// ─── Dados estáticos ──────────────────────────────────────────────────────────

const PROVINCIAS: [string, string][] = [
  ["Bengo", "bengo"], ["Benguela", "benguela"], ["Bie", "bie"],
  ["Cabinda", "cabinda"], ["Cuando Cubango", "cuando cubango"],
  ["Cuanza Norte", "cuanza norte"], ["Cuanza Sul", "cuanza sul"],
  ["Cunene", "cunene"], ["Huambo", "huambo"],
  ["Huila", "huila"], ["Luanda", "luanda"],
  ["Lunda Norte", "lunda norte"], ["Lunda Sul", "lunda sul"],
  ["Malanje", "malanje"], ["Moxico", "moxico"],
  ["Namibe", "namibe"], ["Uige", "uige"], ["Zaire", "zaire"],
];

const GRUPOS_FUNDAMENTAL = [
  ["1_ano_fundamental","2_ano_fundamental","3_ano_fundamental"],
  ["1_ano_fundamental","2_ano_fundamental","3_ano_fundamental","4_ano_fundamental","5_ano_fundamental","6_ano_fundamental"],
  ["4_ano_fundamental","5_ano_fundamental","6_ano_fundamental"],
  ["7_ano_fundamental","8_ano_fundamental","9_ano_fundamental"],
  ["1_ano_fundamental","2_ano_fundamental","3_ano_fundamental","4_ano_fundamental","5_ano_fundamental",
   "6_ano_fundamental","7_ano_fundamental","8_ano_fundamental","9_ano_fundamental"],
];

const GRUPOS_MISTO = [
  ["1_ano_fundamental","2_ano_fundamental","3_ano_fundamental","4_ano_fundamental","5_ano_fundamental","6_ano_fundamental"],
  ["7_ano_fundamental","8_ano_fundamental","9_ano_fundamental"],
  ["1_ano_fundamental","2_ano_fundamental","3_ano_fundamental","4_ano_fundamental","5_ano_fundamental",
   "6_ano_fundamental","7_ano_fundamental","8_ano_fundamental","9_ano_fundamental"],
];

const CURSOS_MEDIO_TEMPLATES: CriarCursoRequest[] = [
  { nome: "Ciências e Tecnologia",   type: "medio", anos_academicos: ["1_ano_medio","2_ano_medio","3_ano_medio"] },
  { nome: "Letras e Ciências Humanas", type: "medio", anos_academicos: ["1_ano_medio","2_ano_medio","3_ano_medio"] },
  { nome: "Económico-Jurídico",      type: "medio", anos_academicos: ["1_ano_medio","2_ano_medio","3_ano_medio"] },
  { nome: "Informática e Gestão",    type: "medio", anos_academicos: ["1_ano_medio","2_ano_medio","3_ano_medio"] },
];

const MATERIAS_FUND = [
  "Língua Portuguesa","Matemática","Estudo do Meio","Educação Visual",
  "Educação Física","Música","Língua Inglesa","Ciências Naturais",
  "História de Angola","Formação Cívica",
];
const MATERIAS_MEDIO = [
  "Língua Portuguesa","Matemática","Física","Química","Biologia",
  "História","Geografia","Filosofia","Inglês","Educação Física",
  "Informática","Economia",
];

const NOMES_M = ["João","António","Manuel","Francisco","Domingos","Pedro","Paulo","Carlos","Luís","Miguel","Filipe","Rui","Hélder","Faustino","Simão","Ezequiel","Armindo","Mário","Narciso","Sérgio"];
const NOMES_F = ["Maria","Ana","Sofia","Isabel","Filomena","Rosa","Conceição","Graça","Fernanda","Lurdes","Beatriz","Carla","Diana","Elisa","Fátima","Glória","Helena","Inês","Joana","Kátia"];
const SOBRENOMES = ["Silva","Santos","Costa","Ferreira","Oliveira","Neto","Lopes","Fernandes","Gonçalves","Rodrigues","Monteiro","Cardoso","Marques","Correia","Mendes","Kiala","Nzinga","Mbemba","Lukamba","Tchipilica"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rnd = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pickN = <T,>(arr: T[], n: number): T[] => [...arr].sort(() => 0.5 - Math.random()).slice(0, n);

function gerarNome() {
  const masc = Math.random() < 0.51;
  return {
    nome: `${pick(masc ? NOMES_M : NOMES_F)} ${pick(SOBRENOMES)} ${pick(SOBRENOMES)}`,
    genero: masc ? "masculino" as const : "feminino" as const,
  };
}

function gerarDataNasc(minAge = 12, maxAge = 24): string {
  const dias = rnd(minAge, maxAge) * 365 + rnd(0, 364);
  const d = new Date(Date.now() - dias * 86400000);
  return d.toISOString().split("T")[0] + "T00:00:00Z";
}

/**
 * Senha padrão = o próprio código (services.GetDefaultPassword devolve o código).
 * Academia LDA20261 → senha "LDA20261"
 * Estudante ABC1234 → senha "ABC1234"
 */
function senhaAcademia(codigo: string): string {
  return codigo;
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

interface MateriaCriada {
  id: string;
  type: string;
  anos_academicos: string[];
  nome: string;
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
    setLogs(prev => [...prev, { ts, level, msg }].slice(-500));
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const setStep = (step: string, pct: number) => setProgress({ step, pct });

  // ── Helpers de API ────────────────────────────────────────────────────────

  const apiUrl = () => process.env.NEXT_PUBLIC_API_URL || "";

  async function callApi(
    method: string,
    path: string,
    body: unknown,
    tok?: string
  ): Promise<{ ok: boolean; status: number; data: unknown }> {
    const url = apiUrl() + path;
    const token = tok || tokenStorage.get() || "";
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
    } catch (e) {
      return { ok: false, status: 0, data: { error: String(e) } };
    }
  }

  async function loginAcademia(codigo: string): Promise<string | null> {
    const senha = senhaAcademia(codigo);
    const { ok, data } = await callApi("POST", "/login", { usuario: codigo, senha });
    if (!ok) {
      addLog(`    Login falhou para ${codigo} (senha: ${senha}): ${JSON.stringify((data as any)?.error ?? "")}`, "warn");
      return null;
    }
    return (data as any)?.token ?? null;
  }

  async function apiBatch(
    method: string,
    path: string,
    items: unknown[],
    chunkSize: number,
    tok?: string
  ): Promise<{ ok: number; err: number }> {
    let ok = 0; let err = 0;
    for (let i = 0; i < items.length; i += chunkSize) {
      if (cancelRef.current) break;
      const chunk = items.slice(i, i + chunkSize);
      const { ok: rOk, data } = await callApi(method, path, chunk, tok);
      if (!rOk) {
        err += chunk.length;
        addLog(`    Lote falhou [${method} ${path}]: ${JSON.stringify((data as any)?.error ?? "sem detalhe")}`, "warn");
        continue;
      }
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
    addLog(`Criando ${lista.length} academia(s)...`, "step");

    const criadas: AcademiaRegistrada[] = [];
    const adminToken = tokenStorage.get() || "";

    for (let i = 0; i < lista.length; i += 5) {
      if (cancelRef.current) break;
      const chunk = lista.slice(i, i + 5);

      const payloads: CriarEscolaRequest[] = chunk.map(m => {
        const base: CriarEscolaRequest = {
          type: "escola",
          nome: m.nome,
          provincia: m.prov_api,
          endereco: m.endereco,
          nivel_escolar: m.nivel as any,
        };
        // anos_academicos apenas para fundamental ou misto
        if ((m.nivel === "fundamental" || m.nivel === "misto") && m.anos.length > 0) {
          base.anos_academicos = m.anos;
        }
        return base;
      });

      const { ok: rOk, data } = await callApi("POST", "/dominis/academia/register/batch", payloads, adminToken);
      if (!rOk) {
        addLog(`  Lote ${Math.floor(i / 5) + 1}: falhou — ${JSON.stringify((data as any)?.error ?? "")}`, "err");
        continue;
      }

      const res = data as { items: { sucesso: boolean; dados?: { codigo_academia?: string; data?: { codigo_academia?: string } } }[] };
      res.items?.forEach((it, idx) => {
        // O backend retorna { message, codigo_academia, data: { id, nome, provincia, codigo_academia } }
        const codigo = it.dados?.codigo_academia ?? it.dados?.data?.codigo_academia;
        if (it.sucesso && codigo) {
          criadas.push({ meta: chunk[idx], codigo });
          addLog(`  ✓ ${codigo} (${chunk[idx].nivel}) — ${chunk[idx].nome}`, "ok");
        } else {
          addLog(`  ✗ Falha: ${chunk[idx].nome} — ${JSON.stringify(it)}`, "err");
        }
      });
    }

    addLog(`Passo 1: ${criadas.length}/${lista.length} academias criadas`, criadas.length === 0 ? "err" : "ok");
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

  async function passo3ConfigurarInfra(academias: AcademiaRegistrada[]): Promise<void> {
    setStep("Passo 3 — Configurar infra", 25);

    for (let i = 0; i < academias.length; i++) {
      if (cancelRef.current) break;
      const ac = academias[i];
      setStep(`Passo 3 [${i + 1}/${academias.length}] — ${ac.codigo}`, 25 + (i / academias.length) * 20);
      addLog(`  Configurando ${ac.codigo} (${ac.meta.nivel})...`, "step");

      const tok = await loginAcademia(ac.codigo);
      if (!tok) {
        addLog(`  Pulando ${ac.codigo} (login falhou)`, "err");
        continue;
      }
      ac.token = tok;

      // Ano letivo — obrigatório antes de qualquer registro
      const { ok: alOk, data: alData } = await callApi("POST", "/academia/ano-letivo", { ano_letivo: "2025_2026", tipo: "escola" }, tok);
      if (!alOk) {
        addLog(`    Ano letivo falhou: ${JSON.stringify((alData as any)?.error ?? "")}`, "warn");
      } else {
        addLog(`    Ano letivo 2025_2026 definido`, "info");
      }

      // Cursos — apenas para médio e misto
      const cursoIds: string[] = [];
      if (ac.meta.nivel !== "fundamental") {
        const { ok: rOk, data } = await callApi("POST", "/academia/curso/batch", CURSOS_MEDIO_TEMPLATES, tok);
        if (rOk) {
          const res = data as { items?: { sucesso: boolean; dados?: { data?: { id?: string } } }[] };
          if (res.items) {
            const ids = res.items
              .filter(it => it.sucesso)
              .map(it => it.dados?.data?.id)
              .filter(Boolean) as string[];
            cursoIds.push(...ids);
            if (ids.length > 0) {
              // Ativar cursos criados
              await callApi("PUT", "/academia/curso/ativar/batch", ids.map(id => ({ id })), tok);
            }
            addLog(`    ${ids.length} cursos criados e ativados`, "info");
          }
        } else {
          addLog(`    Cursos batch falhou: ${JSON.stringify((data as any)?.error ?? "")}`, "warn");
        }
      }

      // Matérias fundamentais
      const matPayloads: CriarMateriaRequest[] = [];
      if (ac.meta.nivel === "fundamental" || ac.meta.nivel === "misto") {
        pickN(MATERIAS_FUND, 5).forEach(nome => {
          const ano = pick(ac.meta.anos.length > 0 ? ac.meta.anos : ["1_ano_fundamental"]);
          const n = ano.replace("_ano_fundamental", "");
          matPayloads.push({ nome: `${nome} ${n}F`, type: "fundamental", anos_academicos: [ano] });
        });
      }

      // Matérias médio — vinculadas a um curso
      if ((ac.meta.nivel === "medio" || ac.meta.nivel === "misto") && cursoIds.length > 0) {
        const cId = pick(cursoIds);
        pickN(MATERIAS_MEDIO, 4).forEach(nome => {
          matPayloads.push({
            nome: `${nome} 1M`,
            type: "medio",
            anos_academicos: ["1_ano_medio"],
            curso_id: cId,
          });
        });
      }

      if (matPayloads.length > 0) {
        const { ok: mOk, data: mData } = await callApi("POST", "/academia/materia/batch", matPayloads, tok);
        if (!mOk) {
          addLog(`    Matérias batch falhou: ${JSON.stringify((mData as any)?.error ?? "")}`, "warn");
        } else {
          addLog(`    ${matPayloads.length} matérias criadas`, "info");
        }
      }

      // Turmas
      const turnos: ("manha" | "tarde" | "noite")[] = ["manha", "tarde", "noite"];
      const turPayloads: CriarTurmaRequest[] = [];
      if (ac.meta.nivel === "fundamental" || ac.meta.nivel === "misto") {
        ac.meta.anos.slice(0, 3).forEach((ano, idx) => {
          turPayloads.push({
            codigo_turma: `F${idx + 1}A${rnd(10, 99)}`,
            nivel: ano,
            turno: pick(turnos),
          });
        });
      }
      if ((ac.meta.nivel === "medio" || ac.meta.nivel === "misto") && cursoIds.length > 0) {
        ["1_ano_medio", "2_ano_medio"].forEach((ano, idx) => {
          turPayloads.push({
            codigo_turma: `M${idx + 1}A${rnd(10, 99)}`,
            nivel: ano,
            turno: pick(turnos),
            curso_id: pick(cursoIds),
          });
        });
      }

      if (turPayloads.length > 0) {
        const { ok: tOk, data: tData } = await callApi("POST", "/academia/turma/batch", turPayloads, tok);
        if (!tOk) {
          addLog(`    Turmas batch falhou: ${JSON.stringify((tData as any)?.error ?? "")}`, "warn");
        } else {
          addLog(`    ${turPayloads.length} turmas criadas`, "info");
        }
      }
    }

    addLog("Passo 3 concluído", "ok");
  }

  // ─── PASSOS 4–8: Popular dados ────────────────────────────────────────────

  async function passos4a8PopularDados(
    academias: AcademiaRegistrada[],
    minEst: number,
    maxEst: number,
    aprovPct: number
  ): Promise<void> {

    for (let i = 0; i < academias.length; i++) {
      if (cancelRef.current) break;
      const ac = academias[i];
      const basePct = 45 + (i / academias.length) * 55;
      setStep(`Passos 4-8 [${i + 1}/${academias.length}] — ${ac.codigo}`, basePct);
      addLog(`\n  Populando ${ac.codigo}...`, "step");

      const tok = ac.token || (await loginAcademia(ac.codigo));
      if (!tok) {
        addLog(`  Pulando ${ac.codigo} (login falhou)`, "err");
        continue;
      }

      // Buscar matérias
      const { ok: mOk, data: mData } = await callApi("GET", "/academia/materias", undefined, tok);
      const materias: MateriaCriada[] = mOk ? ((mData as any)?.materias ?? []) : [];
      if (!mOk || materias.length === 0) {
        addLog(`    Nenhuma matéria encontrada, pulando registros`, "warn");
      }

      // Buscar turmas
      const { ok: tOk, data: tData } = await callApi("GET", "/academia/turmas", undefined, tok);
      const turmas: { id: string; codigo_turma: string; estudantes: string[] }[] =
        tOk ? ((tData as any)?.turmas ?? []) : [];

      // PASSO 4 — Criar estudantes
      const qtd = rnd(minEst, maxEst);
      addLog(`    Criando ${qtd} estudantes...`, "info");
      const estPayloads: CriarEstudanteRequest[] = Array.from({ length: qtd }, () => {
        const { nome, genero } = gerarNome();
        const body: CriarEstudanteRequest = {
          nome,
          genero,
          data_nascimento: gerarDataNasc(),
        };
        if (ac.meta.nivel === "fundamental" && ac.meta.anos.length > 0) {
          body.ano_escolar = pick(ac.meta.anos);
          body.status_escolar_fundamental = "em_andamento";
        } else if (ac.meta.nivel === "medio" || ac.meta.nivel === "misto") {
          body.ano_escolar_medio = "1_ano_medio";
          body.status_escolar_medio = "em_andamento";
        }
        return body;
      });

      const { ok: eOk, err: eErr } = await apiBatch(
        "POST", "/academia/estudante/register/batch", estPayloads, 100, tok
      );
      addLog(`    Estudantes: ${eOk} criados, ${eErr} erros`, eErr > 0 ? "warn" : "ok");

      // Buscar estudantes criados
      const { ok: estOk, data: estData } = await callApi("GET", "/estudantes", undefined, tok);
      const estudantes: { codigo_estudante: string }[] =
        estOk ? ((estData as any)?.estudantes ?? []) : [];

      if (estudantes.length === 0) {
        addLog(`    Nenhum estudante encontrado, saltando restante`, "warn");
        continue;
      }

      // PASSO 5 — Vincular turmas (amostra de até 50)
      if (turmas.length > 0) {
        const amostra = estudantes.slice(0, Math.min(50, estudantes.length));
        const vinculos = amostra.map(e => ({
          codigo_turma: pick(turmas).codigo_turma,
          codigo_estudante: e.codigo_estudante,
        }));
        const { ok: vOk, err: vErr } = await apiBatch(
          "POST", "/academia/turma/estudante/batch", vinculos, 100, tok
        );
        addLog(`    Turmas: ${vOk} vínculos, ${vErr} erros`, vErr > 0 ? "warn" : "ok");
      }

      // PASSO 6 — Registrar notas (amostra de até 20 estudantes, até 3 matérias cada)
      if (materias.length > 0) {
        const datas_periodos = ["1_trimestre", "2_trimestre", "3_trimestre"];
        const amostraEst = estudantes.slice(0, Math.min(20, estudantes.length));
        const notaPayloads: RegistrarNotasRequest[] = [];

        amostraEst.forEach(e => {
          pickN(materias, Math.min(3, materias.length)).forEach(m => {
            datas_periodos.forEach(periodo => {
              notaPayloads.push({
                codigo_estudante: e.codigo_estudante,
                periodo: periodo as import("@/types/api").Periodo,
                materia_disciplinar_id: m.id,
                tipo: "escolar",
                categoria: "nota_escola",
                nota: parseFloat((rnd(8, 20) + Math.random()).toFixed(1)),
              });
            });
          });
        });

        if (notaPayloads.length > 0) {
          const { ok: nOk, err: nErr } = await apiBatch(
            "POST", "/academia/notas-aluno/batch", notaPayloads, 200, tok
          );
          addLog(`    Notas: ${nOk} registradas, ${nErr} erros`, nErr > 0 ? "warn" : "ok");
        }
      }

      // PASSO 7 — Registrar faltas (amostra de até 15 estudantes)
      if (materias.length > 0) {
        const datas = ["2025-03-10","2025-04-07","2025-05-05","2025-06-02","2025-07-07","2025-09-01"];
        const amostraEst = estudantes.slice(0, Math.min(15, estudantes.length));
        const faltaPayloads: RegistrarFaltasRequest[] = [];

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
          const { ok: fOk, err: fErr } = await apiBatch(
            "POST", "/academia/faltas-aluno/batch", faltaPayloads, 200, tok
          );
          addLog(`    Faltas: ${fOk} registradas, ${fErr} erros`, fErr > 0 ? "warn" : "ok");
        }
      }

      // PASSO 8 — Avaliações finais (amostra de até 20 estudantes)
      const amostraAval = estudantes.slice(0, Math.min(20, estudantes.length));
      const nAprov = Math.floor(amostraAval.length * aprovPct / 100);
      const avalPayloads: RegistrarAvaliacaoFinalRequest[] = [];

      amostraAval.forEach((e, idx) => {
        const aprovado = idx < nAprov;
        if (ac.meta.nivel === "fundamental" && ac.meta.anos.length > 0) {
          const nv = pick(ac.meta.anos);
          const nvIdx = ac.meta.anos.indexOf(nv);
          const prox = nvIdx < ac.meta.anos.length - 1 ? ac.meta.anos[nvIdx + 1] : undefined;
          const payload: RegistrarAvaliacaoFinalRequest = {
            codigo_estudante: e.codigo_estudante,
            tipo_ensino: "fundamental",
            nivel_ano_academico_atual: nv,
            aprovado,
            observacao: "Avaliação via painel de testes 2025_2026",
          };
          if (aprovado && prox) payload.proximo_ano_academico = prox;
          avalPayloads.push(payload);
        } else {
          const payload: RegistrarAvaliacaoFinalRequest = {
            codigo_estudante: e.codigo_estudante,
            tipo_ensino: "medio",
            nivel_ano_academico_atual: "1_ano_medio",
            aprovado,
            observacao: "Avaliação via painel de testes 2025_2026",
          };
          if (aprovado) payload.proximo_ano_academico = "2_ano_medio";
          avalPayloads.push(payload);
        }
      });

      if (avalPayloads.length > 0) {
        const { ok: aOk, err: aErr } = await apiBatch(
          "POST", "/academia/avaliacao-final/batch", avalPayloads, 100, tok
        );
        addLog(
          `    Avaliações: ${aOk} registradas, ${aErr} erros (${nAprov} aprovações previstas)`,
          aErr > 0 ? "warn" : "ok"
        );
      }

      addLog(`  ${ac.codigo} populada ✓`, "ok");
    }

    addLog("Passos 4-8 concluídos", "ok");
  }

  // ─── RUNNER PRINCIPAL ─────────────────────────────────────────────────────

  async function runSeed() {
    cancelRef.current = false;
    setRunning(true);
    setLogs([]);
    setProgress({ step: "A iniciar...", pct: 0 });

    addLog("=== SPURI — PAINEL DE TESTES ===", "step");
    addLog(
      `Config: ${config.qtdAcademias} academias | ${config.minEst}–${config.maxEst} estudantes | ${config.aprovPct}% aprovação`,
      "info"
    );

    const adminToken = tokenStorage.get();
    if (!adminToken) {
      addLog("ERRO: Nenhum token de admin detectado. Faça login como admin FPP/ADM antes de executar.", "err");
      setRunning(false);
      return;
    }

    try {
      // Construir lista de academias
      const tipos: { label: NivelTipo; grupos: string[][] }[] = [
        { label: "fundamental", grupos: GRUPOS_FUNDAMENTAL },
        { label: "misto",       grupos: GRUPOS_MISTO },
        { label: "medio",       grupos: [[]] },
      ];

      const lista: EscolaMeta[] = [];
      const provs = config.provFilter
        ? PROVINCIAS.filter(([d]) => d.toLowerCase().includes(config.provFilter.toLowerCase()))
        : PROVINCIAS;

      outer:
      for (const [prov_display, prov_api] of provs) {
        for (const tipo of tipos) {
          if (config.nivelFilter && tipo.label !== config.nivelFilter) continue;
          if (lista.length >= config.qtdAcademias) break outer;
          const anos = tipo.label === "medio" ? [] : pick(tipo.grupos);
          lista.push({
            prov_display,
            prov_api,
            nivel: tipo.label,
            anos,
            nome: `Escola ${tipo.label.charAt(0).toUpperCase() + tipo.label.slice(1)} ${prov_display} ${rnd(1, 9)}`,
            endereco: `Rua ${rnd(1, 999)}, Bairro Central, ${prov_display}`,
          });
        }
      }

      addLog(`${lista.length} academias planeadas`, "info");
      if (lista.length === 0) {
        addLog("Nenhuma academia planeada com os filtros actuais. Ajuste os filtros.", "err");
        return;
      }

      const registradas = await passo1CriarAcademias(lista);
      if (registradas.length === 0) {
        addLog("Nenhuma academia criada. Verificar token de admin e configurações.", "err");
        return;
      }

      await passo2AtivarAcademias(registradas);
      await passo3ConfigurarInfra(registradas);
      await passos4a8PopularDados(registradas, config.minEst, config.maxEst, config.aprovPct);

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

  const adminToken = tokenStorage.get();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <div className="border border-gray-700 rounded-lg p-5 bg-gray-800">
          <h1 className="text-2xl font-bold text-white mb-1">Painel de Testes — Spuri Seeding</h1>
          <p className="text-sm text-gray-400">
            Cria academias, configura infraestrutura e popula dados de teste directamente na API.
            Requer sessão de <strong className="text-gray-300">admin FPP ou ADM</strong> activa.
          </p>
        </div>

        {/* Aviso sem token */}
        {!adminToken && (
          <div className="border border-red-700 rounded-lg p-4 bg-red-900/20 text-red-300 text-sm">
            ⚠ Nenhum token de admin detectado. Faça login como admin antes de executar o seeding.
          </div>
        )}

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
        <div className="flex gap-3 items-center flex-wrap">
          <button
            onClick={runSeed}
            disabled={running || !adminToken}
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
              onClick={() => { setLogs([]); setProgress({ step: "", pct: 0 }); }}
              className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              Limpar log
            </button>
          )}
          <div className="text-xs text-gray-500 ml-auto">
            Token:{" "}
            {adminToken
              ? <span className="text-green-400">presente ✓</span>
              : <span className="text-red-400">ausente ✗</span>
            }
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
              <span className="text-xs text-gray-400 font-mono">Log ({logs.length} linhas)</span>
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
              ["1", "Criar academias",    "POST /dominis/academia/register/batch (lotes de 5)"],
              ["2", "Ativar academias",   "PUT /dominis/academia/ativar/batch (lotes de 50)"],
              ["3", "Configurar infra",   "Ano letivo · Cursos · Matérias · Turmas (por academia)"],
              ["4", "Criar estudantes",   "POST /academia/estudante/register/batch (lotes de 100)"],
              ["5", "Vincular turmas",    "POST /academia/turma/estudante/batch (lotes de 100)"],
              ["6", "Registrar notas",    "POST /academia/notas-aluno/batch (lotes de 200)"],
              ["7", "Registrar faltas",   "POST /academia/faltas-aluno/batch (lotes de 200)"],
              ["8", "Avaliações finais",  "POST /academia/avaliacao-final/batch (lotes de 100)"],
            ].map(([n, titulo, desc]) => (
              <div key={n} className="flex gap-2">
                <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-blue-900 text-blue-300 font-bold text-xs">
                  {n}
                </span>
                <div>
                  <div className="text-gray-200 font-medium">{titulo}</div>
                  <div className="text-gray-500">{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p>
              ⚠ As operações <strong className="text-gray-400">não são atómicas</strong> —
              cada item é independente. Em caso de falha parcial, veja o log.
            </p>
            <p>
              🔑 Senha padrão = o próprio código:{" "}
              <code className="text-blue-400">academia_lda20261</code> usa senha{" "}
              <code className="text-blue-400">LDA20261</code>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}