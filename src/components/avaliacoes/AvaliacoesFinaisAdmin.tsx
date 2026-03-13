// src/components/avaliacoes/AvaliacoesFinaisAdmin.tsx
"use client"
import { useState, useEffect, useMemo } from "react";
import { useApi, consultasService, tokenStorage } from "@/lib/api";
import type { AvaliacaoFinal, AcademiaDetalhada, Turma, EstudanteDetalhado } from "@/types/api";
import { Provincias } from "@/types/api";
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
const ORDEM_NIVEIS = [...ANOS_FUNDAMENTAL, ...ANOS_MEDIO,
  "primeiro_ano","segundo_ano","terceiro_ano","quarto_ano","quinto_ano","sexto_ano"];

function labelNivel(v: string, comSufixo = false): string {
  const base = NIVEL_BASE[v] ?? v.replace(/_/g, " ");
  if (!comSufixo) return base;
  if (ANOS_FUNDAMENTAL.includes(v)) return `${base} (Fund.)`;
  if (ANOS_MEDIO.includes(v)) return `${base} (Médio)`;
  return base;
}

function nomeProvinciaDeCodigo(codigo: string): string {
  return Provincias.find(p => p.codigo === codigo?.toUpperCase())?.nome ?? codigo;
}

// ─── tipos ───────────────────────────────────────────────────────────────────

type AcadInfo = {
  codigo_academia: string;
  nome: string;
  provincia: string;
  type: string;
  nivel_escolar?: string;
  status: string;
};

type Layer =
  | { type: "provincias" }
  | { type: "academias"; provincia: string }
  | { type: "academia_view"; academia: AcadInfo };

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
      {badge && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize">{badge}</span>}
    </button>
  );
}

function BadgeResultado({ aprovado }: { aprovado: boolean }) {
  return aprovado
    ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><Icon icon="mdi:check-circle" width={13}/>Aprovado</span>
    : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><Icon icon="mdi:close-circle" width={13}/>Reprovado</span>;
}

function StatsAvaliacoes({ avaliacoes }: { avaliacoes: AvaliacaoFinal[] }) {
  const aprovacoes = avaliacoes.filter(a => a.aprovado).length;
  const reprovacoes = avaliacoes.length - aprovacoes;
  return (
    <div className="flex flex-wrap gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
      <div><p className="text-xs text-gray-500 uppercase tracking-wide">Total</p><p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{avaliacoes.length}</p></div>
      <div><p className="text-xs text-gray-500 uppercase tracking-wide">Aprovações</p><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{aprovacoes}</p></div>
      <div><p className="text-xs text-gray-500 uppercase tracking-wide">Reprovações</p><p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-0.5">{reprovacoes}</p></div>
      {avaliacoes.length > 0 && (
        <div><p className="text-xs text-gray-500 uppercase tracking-wide">Taxa Aprovação</p><p className="text-2xl font-bold text-brand-600 dark:text-brand-400 mt-0.5">{Math.round((aprovacoes / avaliacoes.length) * 100)}%</p></div>
      )}
    </div>
  );
}

// ─── Vista de academia interna (reutiliza lógica da academia) ─────────────────

function AcademiaView({
  academia, todasAvaliacoes, estudantes,
}: {
  academia: AcadInfo;
  todasAvaliacoes: AvaliacaoFinal[];
  estudantes: EstudanteDetalhado[];
}) {
  const isFundamental = academia.type === "escola" && academia.nivel_escolar === "fundamental";
  const isSuperior = academia.type === "superior";
  const isMisto = academia.type === "escola" && academia.nivel_escolar === "misto";

  // Avaliações desta academia
  const avsAcad = todasAvaliacoes.filter(a => a.codigo_academia === academia.codigo_academia);

  const anosLetivos = useMemo(() => {
    const set = new Set(avsAcad.map(a => a.ano_lectivo));
    return Array.from(set).sort();
  }, [avsAcad]);

  const [subLayer, setSubLayer] = useState<
    | { type: "inicio" }
    | { type: "anos_letivos"; tipoEnsino: "fundamental" | "medio" | "superior" }
    | { type: "anos_academicos"; tipoEnsino: "fundamental" | "medio" | "superior"; anoLetivo: string }
    | { type: "resultados"; tipoEnsino: "fundamental" | "medio" | "superior"; anoLetivo: string; anoAcademico: string }
  >({ type: "inicio" });

  const avsFiltradas = (tipoEnsino: string, anoLetivo?: string, anoAcademico?: string) =>
    avsAcad.filter(a =>
      a.tipo_ensino === tipoEnsino &&
      (!anoLetivo || a.ano_lectivo === anoLetivo) &&
      (!anoAcademico || a.ano_academico_atual === anoAcademico)
    );

  const tiposEnsino = useMemo(() => {
    const set = new Set(avsAcad.map(a => a.tipo_ensino));
    return Array.from(set) as ("fundamental" | "medio" | "superior")[];
  }, [avsAcad]);

  const tipoLabel: Record<string, string> = { fundamental: "Ensino Fundamental", medio: "Ensino Médio", superior: "Ensino Superior" };
  const tipoIcon: Record<string, string> = { fundamental: "mdi:school", medio: "mdi:book-education", superior: "mdi:university" };

  if (subLayer.type === "inicio") {
    const mostrarTipos = tiposEnsino.length > 1;
    if (mostrarTipos) {
      return (
        <div className="space-y-4">
          <StatsAvaliacoes avaliacoes={avsAcad} />
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Tipo de Ensino</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {tiposEnsino.map(te => {
              const avs = avsFiltradas(te);
              const aprov = avs.filter(a => a.aprovado).length;
              return <CardBtn key={te} icon={tipoIcon[te]} title={tipoLabel[te]} subtitle={`${avs.length} avaliação(ões) · ${aprov} aprovação(ões)`} onClick={() => setSubLayer({ type: "anos_letivos", tipoEnsino: te })} />;
            })}
          </div>
        </div>
      );
    } else if (tiposEnsino.length === 1) {
      // Vai direto para anos letivos
      const te = tiposEnsino[0];
      return (
        <div className="space-y-4">
          <StatsAvaliacoes avaliacoes={avsAcad} />
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Anos Letivos</h3>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {anosLetivos.map(al => {
              const avs = avsFiltradas(te, al);
              const aprov = avs.filter(a => a.aprovado).length;
              return <CardBtn key={al} icon="mdi:calendar-school" title={al.replace("_", "/")} subtitle={`${avs.length} avaliação(ões) · ${aprov} aprovação(ões)`} onClick={() => setSubLayer({ type: "anos_academicos", tipoEnsino: te, anoLetivo: al })} />;
            })}
          </div>
        </div>
      );
    }
    return <p className="text-gray-400 text-sm py-8 text-center">Nenhuma avaliação final registada para esta academia.</p>;
  }

  if (subLayer.type === "anos_letivos") {
    const { tipoEnsino } = subLayer;
    const als = Array.from(new Set(avsFiltradas(tipoEnsino).map(a => a.ano_lectivo))).sort();
    return (
      <div className="space-y-4">
        <button onClick={() => setSubLayer({ type: "inicio" })} className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-500 transition-colors">
          <Icon icon="mdi:chevron-left" width={16} />{tipoLabel[tipoEnsino]}
        </button>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Anos Letivos</h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {als.map(al => {
            const avs = avsFiltradas(tipoEnsino, al);
            const aprov = avs.filter(a => a.aprovado).length;
            return <CardBtn key={al} icon="mdi:calendar-school" title={al.replace("_", "/")} subtitle={`${avs.length} avaliação(ões) · ${aprov} aprovação(ões)`} onClick={() => setSubLayer({ type: "anos_academicos", tipoEnsino, anoLetivo: al })} />;
          })}
        </div>
      </div>
    );
  }

  if (subLayer.type === "anos_academicos") {
    const { tipoEnsino, anoLetivo } = subLayer;
    const avsDoAno = avsFiltradas(tipoEnsino, anoLetivo);
    const anos = Array.from(new Set(avsDoAno.map(a => a.ano_academico_atual)))
      .sort((a, b) => ORDEM_NIVEIS.indexOf(a) - ORDEM_NIVEIS.indexOf(b));
    return (
      <div className="space-y-4">
        <button onClick={() => setSubLayer({ type: "anos_letivos", tipoEnsino })} className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-500 transition-colors">
          <Icon icon="mdi:chevron-left" width={16} />Anos Letivos
        </button>
        <StatsAvaliacoes avaliacoes={avsDoAno} />
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Anos Académicos</h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {anos.map(ano => {
            const avs = avsFiltradas(tipoEnsino, anoLetivo, ano);
            const aprov = avs.filter(a => a.aprovado).length;
            return <CardBtn key={ano} icon="mdi:numeric" title={labelNivel(ano, tipoEnsino === "fundamental")} subtitle={`${avs.length} avaliação(ões) · ${aprov} aprovação(ões)`} onClick={() => setSubLayer({ type: "resultados", tipoEnsino, anoLetivo, anoAcademico: ano })} />;
          })}
        </div>
      </div>
    );
  }

  if (subLayer.type === "resultados") {
    const { tipoEnsino, anoLetivo, anoAcademico } = subLayer;
    const avs = avsFiltradas(tipoEnsino, anoLetivo, anoAcademico);
    const estudantesMap: Record<string, EstudanteDetalhado> = {};
    estudantes.forEach(e => { estudantesMap[e.codigo_estudante] = e; });
    return (
      <div className="space-y-4">
        <button onClick={() => setSubLayer({ type: "anos_academicos", tipoEnsino, anoLetivo })} className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-500 transition-colors">
          <Icon icon="mdi:chevron-left" width={16} />Anos Académicos
        </button>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{labelNivel(anoAcademico, true)}</h3>
          <p className="text-sm text-gray-500 mt-0.5">Ano Letivo {anoLetivo.replace("_", "/")}</p>
        </div>
        <StatsAvaliacoes avaliacoes={avs} />
        {avs.length === 0
          ? <p className="text-gray-400 text-sm py-8 text-center">Nenhuma avaliação neste filtro.</p>
          : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/70">
                  <tr>
                    {["Estudante", "Código", "Resultado", "Próximo Nível", "Observação", "Data"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {avs.map(a => (
                    <tr key={a.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{estudantesMap[a.codigo_estudante]?.nome ?? a.codigo_estudante}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs font-mono">{a.codigo_estudante}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><BadgeResultado aprovado={a.aprovado} /></td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{a.proximo_ano_academico ? labelNivel(a.proximo_ano_academico) : (a.aprovado ? "Ciclo finalizado" : "—")}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-[140px] truncate">{a.observacao ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{new Date(a.registered_at).toLocaleDateString("pt-AO")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    );
  }

  return null;
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function AvaliacoesFinaisAdmin() {
  const token = tokenStorage.get() ?? undefined;
  const [layer, setLayer] = useState<Layer>({ type: "provincias" });

  const { data: dataAcads, execute: carregarAcads, loading: loadingAcads } = useApi(consultasService.listarAcademias);
  const { data: dataEstudantes, execute: carregarEstudantes } = useApi(consultasService.listarEstudantes);
  const { data: dataAvaliacoes, execute: carregarAvaliacoes, loading: loadingAvs } = useApi(consultasService.listarAvaliacoes);

  useEffect(() => {
    carregarAcads(token);
    carregarEstudantes(undefined, token);
    carregarAvaliacoes({ token });
  }, []);

  const academias: AcadInfo[] = useMemo(() => {
    return ((dataAcads as any)?.academias ?? []).map((a: AcademiaDetalhada) => ({
      codigo_academia: a.codigo_academia,
      nome: a.nome,
      provincia: a.provincia,
      type: a.type,
      nivel_escolar: a.nivel_escolar,
      status: a.status,
    }));
  }, [dataAcads]);

  const estudantes: EstudanteDetalhado[] = (dataEstudantes as any)?.estudantes ?? [];
  const todasAvaliacoes: AvaliacaoFinal[] = (dataAvaliacoes as any)?.avaliacoes ?? [];

  // Províncias únicas das académias
  const provincias = useMemo(() => {
    const set = new Set(academias.map(a => a.provincia?.toUpperCase()));
    return Array.from(set).filter(Boolean).sort((a, b) =>
      nomeProvinciaDeCodigo(a).localeCompare(nomeProvinciaDeCodigo(b))
    );
  }, [academias]);

  const academiasNaProvincia = (prov: string) =>
    academias.filter(a => a.provincia?.toUpperCase() === prov.toUpperCase());

  function buildCrumbs() {
    if (layer.type === "provincias") return [{ label: "Províncias" }];
    if (layer.type === "academias") return [
      { label: "Províncias", onClick: () => setLayer({ type: "provincias" }) },
      { label: nomeProvinciaDeCodigo(layer.provincia) },
    ];
    if (layer.type === "academia_view") return [
      { label: "Províncias", onClick: () => setLayer({ type: "provincias" }) },
      { label: nomeProvinciaDeCodigo(layer.academia.provincia), onClick: () => setLayer({ type: "academias", provincia: layer.academia.provincia }) },
      { label: layer.academia.nome },
    ];
    return [];
  }

  const loading = loadingAcads || loadingAvs;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      </div>
    );
  }

  // ── Províncias ──
  if (layer.type === "provincias") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Avaliações Finais</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecione uma província para ver as academias</p>
        </div>
        <StatsAvaliacoes avaliacoes={todasAvaliacoes} />
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {provincias.map(prov => {
            const acads = academiasNaProvincia(prov);
            const avsProvinc = todasAvaliacoes.filter(av =>
              acads.some(a => a.codigo_academia === av.codigo_academia)
            );
            return (
              <CardBtn
                key={prov}
                icon="mdi:map-marker-radius"
                title={nomeProvinciaDeCodigo(prov)}
                subtitle={`${acads.length} academia(s) · ${avsProvinc.length} avaliação(ões)`}
                onClick={() => setLayer({ type: "academias", provincia: prov })}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // ── Academias de uma Província ──
  if (layer.type === "academias") {
    const acads = academiasNaProvincia(layer.provincia);
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Província de {nomeProvinciaDeCodigo(layer.provincia)}</h2>
        <StatsAvaliacoes avaliacoes={todasAvaliacoes.filter(av => acads.some(a => a.codigo_academia === av.codigo_academia))} />
        <div className="grid gap-3 sm:grid-cols-2">
          {acads.map(a => {
            const avs = todasAvaliacoes.filter(av => av.codigo_academia === a.codigo_academia);
            const aprov = avs.filter(av => av.aprovado).length;
            return (
              <CardBtn
                key={a.codigo_academia}
                icon={a.type === "superior" ? "mdi:university" : "mdi:school"}
                title={a.nome}
                subtitle={`${a.codigo_academia} · ${avs.length} avaliação(ões) · ${aprov} aprovação(ões)`}
                badge={a.type}
                onClick={() => setLayer({ type: "academia_view", academia: a })}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // ── Vista da academia ──
  if (layer.type === "academia_view") {
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{layer.academia.nome}</h2>
          <p className="text-sm text-gray-500 mt-1">{layer.academia.codigo_academia} · {layer.academia.type === "superior" ? "Superior" : "Escola"}</p>
        </div>
        <AcademiaView
          academia={layer.academia}
          todasAvaliacoes={todasAvaliacoes}
          estudantes={estudantes}
        />
      </div>
    );
  }

  return null;
}