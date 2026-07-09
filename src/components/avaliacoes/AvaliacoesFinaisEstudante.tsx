// src/components/avaliacoes/AvaliacoesFinaisEstudante.tsx
"use client";
import { useState, useEffect, useMemo } from "react";
import { useApi, estudanteService, tokenStorage } from "@/lib/api";
import type { MeuPerfilResponse, AvaliacaoFinal } from "@/types/api";
import { getCookie } from "@/lib/utils/cookies";
import Icon from "@/components/ui/Icon";

// ─── Constants & Helpers ─────────────────────────────────────────────────────

const NIVEL_LABEL: Record<string, string> = {
  "1_ano_fundamental": "1º Ano", "2_ano_fundamental": "2º Ano", "3_ano_fundamental": "3º Ano",
  "4_ano_fundamental": "4º Ano", "5_ano_fundamental": "5º Ano", "6_ano_fundamental": "6º Ano",
  "7_ano_fundamental": "7º Ano", "8_ano_fundamental": "8º Ano", "9_ano_fundamental": "9º Ano",
  "1_ano_medio": "1º Médio", "2_ano_medio": "2º Médio", "3_ano_medio": "3º Médio", "4_ano_medio": "4º Médio",
  "1_ano_superior": "1º Ano", "2_ano_superior": "2º Ano", "3_ano_superior": "3º Ano",
  "4_ano_superior": "4º Ano", "5_ano_superior": "5º Ano", "6_ano_superior": "6º Ano",
};

const NIVEL_ORDER = [
  "1_ano_fundamental","2_ano_fundamental","3_ano_fundamental","4_ano_fundamental","5_ano_fundamental",
  "6_ano_fundamental","7_ano_fundamental","8_ano_fundamental","9_ano_fundamental",
  "1_ano_medio","2_ano_medio","3_ano_medio","4_ano_medio",
  "1_ano_superior","2_ano_superior","3_ano_superior","4_ano_superior","5_ano_superior","6_ano_superior",
];

function labelNivel(v: string): string {
  return NIVEL_LABEL[v] ?? v.replace(/_/g, " ");
}

type TipoEnsino = "fundamental" | "medio" | "superior";


function getTipoEnsino(nivel: string): TipoEnsino {
  if (nivel.includes("fundamental")) return "fundamental";
  if (nivel.includes("medio"))       return "medio";
  return "superior";
}

function sortAvs(avs: AvaliacaoFinal[]): AvaliacaoFinal[] {
  return [...avs].sort((a, b) => {
    const ia = NIVEL_ORDER.indexOf(a.ano_academico_atual);
    const ib = NIVEL_ORDER.indexOf(b.ano_academico_atual);
    if (ia !== ib) return ia - ib;
    return new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime();
  });
}

function getUserFromCookie(): MeuPerfilResponse | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(getCookie("user") ?? ""); } catch { return null; }
}

// ─── Layer types ──────────────────────────────────────────────────────────────

type Layer =
  | { type: "ciclos" }
  | { type: "lista"; ciclo: TipoEnsino };

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function BadgeResultado({ aprovado, comPendencia }: { aprovado: boolean; comPendencia?: boolean }) {
  if (aprovado && comPendencia) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <Icon icon="mdi:alert-circle" width={12} />Aprovado com matéria por concluir
      </span>
    );
  }

  return aprovado ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      <Icon icon="mdi:check-circle" width={12} />Aprovado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <Icon icon="mdi:close-circle" width={12} />Reprovado
    </span>
  );
}

function MiniStats({ avs }: { avs: AvaliacaoFinal[] }) {
  const aprovadas  = avs.filter(a => a.aprovado).length;
  const reprovadas = avs.filter(a => !a.aprovado).length;
  return (
    <div className="flex items-center gap-6 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
      <div className="text-center"><p className="text-xs text-gray-400 uppercase tracking-wide">Total</p><p className="text-xl font-bold text-gray-900 dark:text-white">{avs.length}</p></div>
      <div className="text-center"><p className="text-xs text-gray-400 uppercase tracking-wide">Aprovações</p><p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{aprovadas}</p></div>
      <div className="text-center"><p className="text-xs text-gray-400 uppercase tracking-wide">Reprovações</p><p className="text-xl font-bold text-red-600 dark:text-red-400">{reprovadas}</p></div>
      {avs.length > 0 && (
        <div className="text-center"><p className="text-xs text-gray-400 uppercase tracking-wide">Taxa</p><p className="text-xl font-bold text-brand-600 dark:text-brand-400">{Math.round((aprovadas / avs.length) * 100)}%</p></div>
      )}
    </div>
  );
}

// Selector de ano letivo inline
function AnoLetivoSelector({
  anos,
  anoSel,
  onChange,
}: {
  anos: string[];
  anoSel: string;
  onChange: (ano: string) => void;
}) {
  if (anos.length <= 1) return null;
  return (
    <div className="flex items-center gap-2">
      <Icon icon="mdi:calendar-school" width={16} className="text-gray-400 flex-shrink-0" />
      <select
        value={anoSel}
        onChange={e => onChange(e.target.value)}
        className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        <option value="">Todos os anos</option>
        {anos.map(al => (
          <option key={al} value={al}>{al.replace("_", "/")} {al === anos[0] ? "(mais recente)" : ""}</option>
        ))}
      </select>
    </div>
  );
}

function TabelaCiclo({ avs, anoSel }: { avs: AvaliacaoFinal[]; anoSel: string }) {
  // Filtrar pelo ano letivo seleccionado
  const avsFilt = anoSel ? avs.filter(a => a.ano_lectivo === anoSel) : avs;

  if (avsFilt.length === 0) return (
    <div className="text-center py-10">
      <Icon icon="mdi:clipboard-check-outline" width={36} className="mx-auto mb-2 text-gray-300 dark:text-gray-700" />
      <p className="text-sm text-gray-400">
        {anoSel
          ? `Nenhuma avaliação registada em ${anoSel.replace("_", "/")}.`
          : "Nenhuma avaliação registada neste ciclo."}
      </p>
    </div>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            {["#", "Nível / Ano", "Ano Letivo", "Resultado", "Próximo Nível", "Observação", "Data"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {sortAvs(avsFilt).map((a, idx) => (
            <tr key={a.id} className={`transition-colors ${a.aprovado ? "bg-white dark:bg-gray-800 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10" : "bg-white dark:bg-gray-800 hover:bg-red-50/30 dark:hover:bg-red-900/10"}`}>
              <td className="px-4 py-3 text-xs text-gray-400 font-mono">{idx + 1}</td>
              <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{labelNivel(a.ano_academico_atual)}</td>
              <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">{a.ano_lectivo.replace("_", "/")}</td>
              <td className="px-4 py-3 whitespace-nowrap"><BadgeResultado aprovado={a.aprovado} comPendencia={a.aprovado_com_pendencia} /></td>
              <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {a.proximo_ano_academico ? labelNivel(a.proximo_ano_academico) : a.aprovado ? "Ciclo finalizado" : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-gray-400 max-w-[140px] truncate">{a.observacao ?? "—"}</td>
              <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(a.registered_at).toLocaleDateString("pt-AO")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AvaliacoesFinaisEstudante() {
  const [user]  = useState<MeuPerfilResponse | null>(getUserFromCookie);
  const token   = tokenStorage.get() ?? undefined;
  const [layer, setLayer] = useState<Layer>({ type: "ciclos" });

  // Usa /estudante/minhas-avaliacoes (endpoint específico para o próprio estudante)
  const { data, execute: carregar, loading } = useApi(estudanteService.minhasAvaliacoes);

  useEffect(() => {
    carregar(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todasAvaliacoes: AvaliacaoFinal[] = useMemo(
    () => (data as any)?.avaliacoes ?? [],
    [data]
  );

  // Anos letivos disponíveis (ordenados do mais recente)
  const anosLetivos = useMemo(() => {
    const set = new Set(todasAvaliacoes.map(a => a.ano_lectivo).filter(Boolean));
    return Array.from(set).sort();
  }, [todasAvaliacoes]);

  const [anoSel, setAnoSel] = useState<string>("");

  // Selecciona o ano mais recente por defeito
  useEffect(() => {
    if (anosLetivos.length > 0 && !anoSel) {
      setAnoSel(anosLetivos[0]);
    }
  }, [anosLetivos, anoSel]);

  // Ciclos presentes nas avaliações
  const ciclosPresentes = useMemo((): TipoEnsino[] => {
    const set = new Set<TipoEnsino>();
    todasAvaliacoes.forEach(a => set.add(getTipoEnsino(a.ano_academico_atual)));

    // Inclui ciclos em que o estudante está matriculado (mesmo sem avaliações ainda)
    const est = user?.estudante;
    if (est?.status_escolar_fundamental === "em_andamento") set.add("fundamental");
    if (est?.status_escolar_medio === "em_andamento")       set.add("medio");
    if (est?.status_superior === "em_andamento")            set.add("superior");

    const order: TipoEnsino[] = ["fundamental", "medio", "superior"];
    return order.filter(c => set.has(c));
  }, [todasAvaliacoes, user]);

  const avsPorCiclo = (ciclo: TipoEnsino) =>
    todasAvaliacoes.filter(a => getTipoEnsino(a.ano_academico_atual) === ciclo);

  // Avaliações do ciclo filtradas pelo ano letivo seleccionado
  const avsFiltradas = (ciclo: TipoEnsino) => {
    const avsCiclo = avsPorCiclo(ciclo);
    return anoSel ? avsCiclo.filter(a => a.ano_lectivo === anoSel) : avsCiclo;
  };

  const cicloInfo: Record<TipoEnsino, { label: string; sub: string; icon: string }> = {
    fundamental: { label: "Ensino Fundamental", sub: "1º ao 9º Ano", icon: "mdi:school" },
    medio:       { label: "Ensino Médio",        sub: "1º ao 4º Médio",    icon: "mdi:book-education" },
    superior:    { label: "Ensino Superior",     sub: "Cursos superiores", icon: "mdi:university" },
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
    </div>
  );

  // ── Ciclos overview ──
  if (layer.type === "ciclos") {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Avaliações Finais</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Historial das avaliações anuais por ciclo de ensino</p>
          </div>
          <AnoLetivoSelector anos={anosLetivos} anoSel={anoSel} onChange={setAnoSel} />
        </div>

        {ciclosPresentes.length === 0 ? (
          <div className="text-center py-16">
            <Icon icon="mdi:clipboard-check-outline" width={52} className="mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ainda não tens avaliações finais registadas.</p>
            <p className="text-xs text-gray-400 mt-1">As avaliações são registadas pela tua instituição de ensino.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {ciclosPresentes.map(ciclo => {
              const avsTodas = avsPorCiclo(ciclo);
              const avsFilt  = avsFiltradas(ciclo);
              const aprovacoes = avsFilt.filter(a => a.aprovado).length;
              const info = cicloInfo[ciclo];
              return (
                <button
                  key={ciclo}
                  onClick={() => setLayer({ type: "lista", ciclo })}
                  className="flex flex-col gap-4 p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-400 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                      <Icon icon={info.icon} width={24} className="text-brand-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{info.label}</p>
                      <p className="text-xs text-gray-400">{info.sub}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                    <div>
                      <p className="text-xs text-gray-400">{anoSel ? anoSel.replace("_", "/") : "Total"}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{avsFilt.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Aprovações</p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{aprovacoes}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Reprovações</p>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">{avsFilt.length - aprovacoes}</p>
                    </div>
                    {avsTodas.length !== avsFilt.length && (
                      <div className="ml-auto">
                        <p className="text-xs text-gray-400">Histórico</p>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{avsTodas.length}</p>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Lista de um ciclo ──
  if (layer.type === "lista") {
    const { ciclo } = layer;
    const avs  = avsPorCiclo(ciclo);
    const info = cicloInfo[ciclo];

    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={[
          { label: "Ciclos", onClick: () => setLayer({ type: "ciclos" }) },
          { label: info.label },
        ]} />
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{info.label}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{info.sub}</p>
          </div>
          <AnoLetivoSelector anos={anosLetivos} anoSel={anoSel} onChange={setAnoSel} />
        </div>
        <MiniStats avs={anoSel ? avs.filter(a => a.ano_lectivo === anoSel) : avs} />
        <TabelaCiclo avs={avs} anoSel={anoSel} />
      </div>
    );
  }

  return null;
}
