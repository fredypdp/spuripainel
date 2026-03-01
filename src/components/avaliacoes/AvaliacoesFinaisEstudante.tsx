// src/components/avaliacoes/AvaliacoesFinaisEstudante.tsx
"use client"
import { useState, useEffect, useMemo } from "react";
import { useApi, consultasService, tokenStorage } from "@/lib/api";
import type { MeuPerfilResponse, AvaliacaoFinal } from "@/types/api";
import { getCookie } from "@/lib/utils/cookies";
import Icon from "@/components/ui/Icon";

// ─── helpers ─────────────────────────────────────────────────────────────────

const NIVEL_BASE: Record<string, string> = {
  primeiro_fundamental:"1º Ano",segundo_fundamental:"2º Ano",terceiro_fundamental:"3º Ano",
  quarto_fundamental:"4º Ano",quinto_fundamental:"5º Ano",sexto_fundamental:"6º Ano",
  setimo_fundamental:"7º Ano",oitavo_fundamental:"8º Ano",nono_fundamental:"9º Ano",
  primeiro_medio:"1º Médio",segundo_medio:"2º Médio",terceiro_medio:"3º Médio",quarto_medio:"4º Médio",
  primeiro_ano:"1º Ano",segundo_ano:"2º Ano",terceiro_ano:"3º Ano",
  quarto_ano:"4º Ano",quinto_ano:"5º Ano",sexto_ano:"6º Ano",
};

const ANOS_FUNDAMENTAL = [
  "primeiro_fundamental","segundo_fundamental","terceiro_fundamental","quarto_fundamental",
  "quinto_fundamental","sexto_fundamental","setimo_fundamental","oitavo_fundamental","nono_fundamental",
];
const ANOS_MEDIO = ["primeiro_medio","segundo_medio","terceiro_medio","quarto_medio"];

function labelNivel(v: string): string {
  return NIVEL_BASE[v] ?? v.replace(/_/g, " ");
}

function nivelTipo(v: string): "fundamental" | "medio" | "superior" {
  if (ANOS_FUNDAMENTAL.includes(v)) return "fundamental";
  if (ANOS_MEDIO.includes(v)) return "medio";
  return "superior";
}

function getUserFromCookie(): MeuPerfilResponse | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(getCookie("user") ?? ""); } catch { return null; }
}

// ─── tipos de layer ───────────────────────────────────────────────────────────

type NivelEnsino = "fundamental" | "medio" | "superior";

type Layer =
  | { type: "niveis" }
  | { type: "lista"; nivel: NivelEnsino };

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

function CardBtn({ icon, title, subtitle, badge, badgeColor, onClick }: {
  icon: string; title: string; subtitle?: string; badge?: string; badgeColor?: string; onClick: () => void;
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
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor ?? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function BadgeResultado({ aprovado }: { aprovado: boolean }) {
  return aprovado
    ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><Icon icon="mdi:check-circle" width={13}/>Aprovado</span>
    : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><Icon icon="mdi:close-circle" width={13}/>Reprovado</span>;
}

function MetricasNivel({ avaliacoes }: { avaliacoes: AvaliacaoFinal[] }) {
  const aprovacoes = avaliacoes.filter(a => a.aprovado).length;
  const reprovacoes = avaliacoes.filter(a => !a.aprovado).length;
  const total = avaliacoes.length;
  return (
    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="text-center">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{total}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Aprovações</p>
        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{aprovacoes}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Reprovações</p>
        <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-0.5">{reprovacoes}</p>
      </div>
    </div>
  );
}

function TabelaAvaliacoes({ avaliacoes }: { avaliacoes: AvaliacaoFinal[] }) {
  if (!avaliacoes.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Icon icon="mdi:clipboard-check-outline" width={40} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhuma avaliação registrada neste nível.</p>
      </div>
    );
  }

  // Ordenar por nivel_ano_academico_atual usando a ordem pedagógica
  const ordemNiveis = [...ANOS_FUNDAMENTAL, ...ANOS_MEDIO,
    "primeiro_ano","segundo_ano","terceiro_ano","quarto_ano","quinto_ano","sexto_ano"];
  const sorted = [...avaliacoes].sort((a, b) => {
    const ia = ordemNiveis.indexOf(a.nivel_ano_academico_atual);
    const ib = ordemNiveis.indexOf(b.nivel_ano_academico_atual);
    if (ia !== ib) return ia - ib;
    return new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime();
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/70">
          <tr>
            {["#", "Ano/Nível", "Ano Letivo", "Resultado", "Próximo Nível", "Observação", "Data"].map(h => (
              <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {sorted.map((a, idx) => (
            <tr key={a.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
              <td className="px-4 py-3 text-gray-400 text-xs font-mono">{idx + 1}</td>
              <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                {labelNivel(a.nivel_ano_academico_atual)}
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono text-xs">
                {a.ano_lectivo.replace("_", "/")}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <BadgeResultado aprovado={a.aprovado} />
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {a.proximo_ano_academico ? labelNivel(a.proximo_ano_academico) : (a.aprovado ? "Ciclo finalizado" : "—")}
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate">
                {a.observacao ?? "—"}
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                {new Date(a.registered_at).toLocaleDateString("pt-AO")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function AvaliacoesFinaisEstudante() {
  const [user] = useState<MeuPerfilResponse | null>(getUserFromCookie);
  const [layer, setLayer] = useState<Layer>({ type: "niveis" });
  const token = tokenStorage.get() ?? undefined;

  const { data, execute: carregar, loading } = useApi(consultasService.listarAvaliacoes);

  useEffect(() => {
    carregar({ token });
  }, []);

  const todasAvaliacoes: AvaliacaoFinal[] = (data as any)?.avaliacoes ?? [];

  // Determinar quais níveis o estudante já fez parte
  const niveisPresentes = useMemo((): NivelEnsino[] => {
    const set = new Set<NivelEnsino>();
    todasAvaliacoes.forEach(a => set.add(nivelTipo(a.nivel_ano_academico_atual)));

    // Também incluir o nível atual do estudante (mesmo sem avaliações ainda)
    const est = user?.estudante;
    if (est?.status_escolar_fundamental === "em_andamento") set.add("fundamental");
    if (est?.status_escolar_medio === "em_andamento") set.add("medio");
    if (est?.status_superior === "em_andamento") set.add("superior");

    // Ordem fixa
    const ordem: NivelEnsino[] = ["fundamental", "medio", "superior"];
    return ordem.filter(n => set.has(n));
  }, [todasAvaliacoes, user]);

  const avaliacoesPorNivel = (nivel: NivelEnsino) =>
    todasAvaliacoes.filter(a => nivelTipo(a.nivel_ano_academico_atual) === nivel);

  const nivelInfo: Record<NivelEnsino, { label: string; sub: string; icon: string }> = {
    fundamental: { label: "Ensino Fundamental", sub: "1º ao 9º Ano", icon: "mdi:school" },
    medio: { label: "Ensino Médio", sub: "1º ao 4º Médio", icon: "mdi:book-education" },
    superior: { label: "Ensino Superior", sub: "Cursos superiores", icon: "mdi:university" },
  };

  const crumbs = layer.type === "niveis"
    ? [{ label: "Níveis" }]
    : [
        { label: "Níveis", onClick: () => setLayer({ type: "niveis" }) },
        { label: nivelInfo[layer.nivel].label },
      ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      </div>
    );
  }

  // ── Níveis ──
  if (layer.type === "niveis") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Avaliações Finais</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Historial das avaliações anuais por nível de ensino</p>
        </div>
        {niveisPresentes.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Icon icon="mdi:clipboard-check-outline" width={48} className="mx-auto mb-3 opacity-40" />
            <p>Nenhuma avaliação final registrada ainda.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {niveisPresentes.map(nivel => {
              const avs = avaliacoesPorNivel(nivel);
              const aprovacoes = avs.filter(a => a.aprovado).length;
              const info = nivelInfo[nivel];
              return (
                <CardBtn
                  key={nivel}
                  icon={info.icon}
                  title={info.label}
                  subtitle={`${avs.length} avaliação(ões) · ${aprovacoes} aprovação(ões)`}
                  onClick={() => setLayer({ type: "lista", nivel })}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Lista de um nível ──
  const { nivel } = layer;
  const avs = avaliacoesPorNivel(nivel);
  const info = nivelInfo[nivel];

  return (
    <div className="space-y-6">
      <Breadcrumb crumbs={crumbs} />
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{info.label}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{info.sub}</p>
      </div>
      <MetricasNivel avaliacoes={avs} />
      <TabelaAvaliacoes avaliacoes={avs} />
    </div>
  );
}