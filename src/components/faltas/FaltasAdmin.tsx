// src/components/faltas/FaltasAdmin.tsx
"use client"
import { useState, useEffect, useMemo } from "react";
import { useApi, consultasService, tokenStorage } from "@/lib/api";
import type { Falta } from "@/types/api";
import { Provincias } from "@/types/api";
import Icon from "@/components/ui/Icon";

// ─── helpers ────────────────────────────────────────────────────────────────

const MAX_LIMIT = 1000;

function labelNivel(v: string): string {
  const match = v.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!match) return v.replace(/_/g, " ");
  const [, n, tipo] = match;
  if (tipo === "fundamental") return `${n}º Ano do Ensino Fundamental`;
  if (tipo === "medio")       return `${n}º Ano do Ensino Médio`;
  return `${n}º Ano`;
}

function nomeProvinciaDeCodigo(codigo: string): string {
  return Provincias.find(p => p.codigo === codigo?.toUpperCase())?.nome ?? codigo;
}

function corQuantidade(q: number) {
  if (q >= 5) return "text-red-600 dark:text-red-400";
  if (q >= 3) return "text-amber-600 dark:text-amber-400";
  return "text-gray-700 dark:text-gray-300";
}

function formatarData(data: string) {
  try {
    return new Date(data + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return data; }
}

// FaltaRegistroDTO: GET /faltas retorna estudante_nome e academia_nome extras
interface FaltaExt extends Falta {
  estudante_nome?: string;
  academia_nome?: string;
}

// ─── tipos ───────────────────────────────────────────────────────────────────

interface AcadInfo {
  codigo_academia: string;
  nome: string;
  provincia: string;
  type: string;
  status: string;
}

type Layer =
  | { type: "provincias" }
  | { type: "academias"; provincia: string }
  | { type: "niveis"; academia: AcadInfo }
  | { type: "materias"; academia: AcadInfo; nivel: string }
  | { type: "faltas"; academia: AcadInfo; nivel: string; materiaId: string; materiaNome: string };

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
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex-shrink-0">
          {badge}
        </span>
      )}
    </button>
  );
}

function StatsRow({ faltas }: { faltas: FaltaExt[] }) {
  const totalFaltas = faltas.reduce((acc, f) => acc + f.quantidade, 0);
  const estudantes  = new Set(faltas.map(f => f.codigo_estudante)).size;
  const maiorFalta  = faltas.length > 0 ? Math.max(...faltas.map(f => f.quantidade)) : 0;
  return (
    <div className="flex flex-wrap gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">Total Faltas</p>
        <p className={`text-2xl font-bold mt-0.5 ${corQuantidade(totalFaltas)}`}>{totalFaltas}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">Registros</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{faltas.length}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">Estudantes</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{estudantes}</p>
      </div>
      {maiorFalta > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Maior Falta</p>
          <p className={`text-2xl font-bold mt-0.5 ${corQuantidade(maiorFalta)}`}>{maiorFalta}</p>
        </div>
      )}
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function FaltasAdmin() {
  const token = tokenStorage.get() ?? undefined;

  const [layer, setLayer]               = useState<Layer>({ type: "provincias" });
  const [todasFaltas, setTodasFaltas]   = useState<FaltaExt[]>([]);
  const [carregandoFaltas, setCarregandoFaltas] = useState(false);

  const { data: academiasData, execute: carregarAcademias, loading: loadingAcads } =
    useApi(consultasService.listarAcademias);
  const { execute: carregarFaltasPage } = useApi(consultasService.listarFaltas);

  useEffect(() => {
    carregarAcademias(token);
    carregarTodasFaltas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarTodasFaltas() {
    setCarregandoFaltas(true);
    try {
      const primeira = await carregarFaltasPage({ limit: MAX_LIMIT, offset: 0, token });
      if (!primeira) return;
      const totalGeral = primeira.total_geral ?? primeira.total ?? 0;
      let acumulado: FaltaExt[] = [...(primeira.faltas as FaltaExt[])];
      if (totalGeral > MAX_LIMIT) {
        const paginas = Math.ceil(totalGeral / MAX_LIMIT);
        const promises: Promise<any>[] = [];
        for (let p = 1; p < paginas; p++) {
          promises.push(carregarFaltasPage({ limit: MAX_LIMIT, offset: p * MAX_LIMIT, token }));
        }
        const resultados = await Promise.all(promises);
        resultados.forEach(r => { if (r) acumulado = [...acumulado, ...(r.faltas as FaltaExt[])]; });
      }
      setTodasFaltas(acumulado);
    } catch {
      // silencioso
    } finally {
      setCarregandoFaltas(false);
    }
  }

  const academias: AcadInfo[] = useMemo(() =>
    ((academiasData as any)?.academias ?? []).map((a: any) => ({
      codigo_academia: a.codigo_academia,
      nome: a.nome,
      provincia: a.provincia,
      type: a.type,
      status: a.status,
    })),
    [academiasData]
  );

  const provincias = useMemo(() =>
    Array.from(new Set(academias.map(a => a.provincia))).sort(),
    [academias]
  );

  function academiasNaProvincia(prov: string): AcadInfo[] {
    return academias.filter(a => a.provincia === prov);
  }

  function faltasDeAcademia(codigoAcademia: string): FaltaExt[] {
    return todasFaltas.filter(f => f.codigo_academia === codigoAcademia);
  }

  /**
   * Retorna os níveis académicos únicos (ano_academico) que têm faltas
   * registadas para uma academia, agrupados por contagem.
   */
  function niveisDeAcademia(codigoAcademia: string) {
    const faltas = faltasDeAcademia(codigoAcademia);
    const map = new Map<string, { totalFaltas: number; registros: number }>();
    faltas.forEach(f => {
      const nivel = f.ano_academico;
      if (!nivel) return;
      const ex = map.get(nivel);
      if (ex) { ex.totalFaltas += f.quantidade; ex.registros++; }
      else map.set(nivel, { totalFaltas: f.quantidade, registros: 1 });
    });
    return Array.from(map.entries())
      .map(([nivel, stats]) => ({ nivel, ...stats }))
      .sort((a, b) => a.nivel.localeCompare(b.nivel));
  }

  /**
   * Retorna as matérias agrupadas para uma academia + nível.
   */
  function materiasDoNivel(codigoAcademia: string, nivel: string) {
    const faltas = faltasDeAcademia(codigoAcademia).filter(f => f.ano_academico === nivel);
    const map = new Map<string, { nome: string; total: number; count: number }>();
    faltas.forEach(f => {
      const ex = map.get(f.materia_disciplinar_id);
      if (ex) { ex.total += f.quantidade; ex.count++; }
      else map.set(f.materia_disciplinar_id, {
        nome: f.materia_nome ?? f.materia_disciplinar_id,
        total: f.quantidade,
        count: 1,
      });
    });
    return Array.from(map.entries())
      .map(([id, { nome, total, count }]) => ({ id, nome, totalFaltas: total, registros: count }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  function buildCrumbs(): { label: string; onClick?: () => void }[] {
    const goProvs = { label: "Províncias", onClick: () => setLayer({ type: "provincias" }) };
    if (layer.type === "provincias") return [goProvs];
    if (layer.type === "academias")  return [
      goProvs,
      { label: nomeProvinciaDeCodigo(layer.provincia) },
    ];
    if (layer.type === "niveis") return [
      goProvs,
      { label: nomeProvinciaDeCodigo(layer.academia.provincia), onClick: () => setLayer({ type: "academias", provincia: layer.academia.provincia }) },
      { label: layer.academia.nome },
    ];
    if (layer.type === "materias") return [
      goProvs,
      { label: nomeProvinciaDeCodigo(layer.academia.provincia), onClick: () => setLayer({ type: "academias", provincia: layer.academia.provincia }) },
      { label: layer.academia.nome, onClick: () => setLayer({ type: "niveis", academia: layer.academia }) },
      { label: labelNivel(layer.nivel) },
    ];
    if (layer.type === "faltas") return [
      goProvs,
      { label: nomeProvinciaDeCodigo(layer.academia.provincia), onClick: () => setLayer({ type: "academias", provincia: layer.academia.provincia }) },
      { label: layer.academia.nome, onClick: () => setLayer({ type: "niveis", academia: layer.academia }) },
      { label: labelNivel(layer.nivel), onClick: () => setLayer({ type: "materias", academia: layer.academia, nivel: layer.nivel }) },
      { label: layer.materiaNome },
    ];
    return [goProvs];
  }

  if (loadingAcads || carregandoFaltas) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {carregandoFaltas ? "Carregando faltas do sistema..." : "Carregando academias..."}
      </p>
    </div>
  );

  // ── Províncias ──────────────────────────────────────────────────────────────
  if (layer.type === "provincias") return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Faltas do Sistema</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {todasFaltas.length > 0 ? `${todasFaltas.length} registros carregados · ` : ""}
          Selecione uma província
        </p>
      </div>
      {provincias.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Icon icon="mdi:map-marker-outline" width={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma academia registrada.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {provincias.map(prov => {
            const acads     = academiasNaProvincia(prov);
            const faltasProv = todasFaltas.filter(f => acads.some(a => a.codigo_academia === f.codigo_academia));
            const totalProv  = faltasProv.reduce((acc, f) => acc + f.quantidade, 0);
            return (
              <CardBtn
                key={prov}
                icon="mdi:map-marker-radius"
                title={nomeProvinciaDeCodigo(prov)}
                subtitle={`${acads.length} academia(s) · ${totalProv} falta(s)`}
                onClick={() => setLayer({ type: "academias", provincia: prov })}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Academias ───────────────────────────────────────────────────────────────
  if (layer.type === "academias") {
    const acads = academiasNaProvincia(layer.provincia);
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Província {nomeProvinciaDeCodigo(layer.provincia)}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {acads.map(a => {
            const faltas = faltasDeAcademia(a.codigo_academia);
            const total  = faltas.reduce((acc, f) => acc + f.quantidade, 0);
            const niveis = new Set(faltas.map(f => f.ano_academico).filter(Boolean)).size;
            return (
              <CardBtn
                key={a.codigo_academia}
                icon={a.type === "superior" ? "mdi:university" : "mdi:school"}
                title={a.nome}
                subtitle={`${a.codigo_academia} · ${total} falta(s) · ${niveis} nível(eis)`}
                badge={a.type}
                onClick={() => setLayer({ type: "niveis", academia: a })}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // ── Níveis (ano_academico) ──────────────────────────────────────────────────
  if (layer.type === "niveis") {
    const { academia } = layer;
    const faltas = faltasDeAcademia(academia.codigo_academia);
    const niveis = niveisDeAcademia(academia.codigo_academia);
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{academia.nome}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {academia.codigo_academia} · {academia.type === "superior" ? "Superior" : "Escola"}
          </p>
        </div>
        {faltas.length > 0 && <StatsRow faltas={faltas} />}
        {niveis.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Icon icon="mdi:check-circle" width={48} className="mx-auto mb-3 text-green-400 opacity-80" />
            <p className="text-sm">Nenhuma falta registada nesta academia.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {niveis.map(({ nivel, totalFaltas, registros }) => (
              <CardBtn
                key={nivel}
                icon="mdi:numeric"
                title={labelNivel(nivel)}
                subtitle={`${totalFaltas} falta(s) · ${registros} registro(s)`}
                onClick={() => setLayer({ type: "materias", academia, nivel })}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Matérias ────────────────────────────────────────────────────────────────
  if (layer.type === "materias") {
    const { academia, nivel } = layer;
    const faltasNivel = faltasDeAcademia(academia.codigo_academia).filter(f => f.ano_academico === nivel);
    const materias    = materiasDoNivel(academia.codigo_academia, nivel);
    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {labelNivel(nivel)} — Matérias
          </h2>
          <p className="text-sm text-gray-500 mt-1">{academia.nome}</p>
        </div>
        {faltasNivel.length > 0 && <StatsRow faltas={faltasNivel} />}
        {materias.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Icon icon="mdi:check-circle" width={48} className="mx-auto mb-3 text-green-400 opacity-80" />
            <p className="text-sm">Nenhuma matéria com faltas neste nível.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {materias.map(m => (
              <CardBtn
                key={m.id}
                icon="mdi:book-open-variant"
                title={m.nome}
                subtitle={`${m.totalFaltas} falta(s) · ${m.registros} registro(s)`}
                onClick={() => setLayer({ type: "faltas", academia, nivel, materiaId: m.id, materiaNome: m.nome })}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Tabela de Faltas (folha) ─────────────────────────────────────────────────
  if (layer.type === "faltas") {
    const { academia, nivel, materiaId, materiaNome } = layer;
    const faltas = faltasDeAcademia(academia.codigo_academia)
      .filter(f => f.ano_academico === nivel && f.materia_disciplinar_id === materiaId)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={buildCrumbs()} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{materiaNome}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {academia.nome} · {labelNivel(nivel)}
          </p>
        </div>

        {faltas.length > 0 && <StatsRow faltas={faltas} />}

        {faltas.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Icon icon="mdi:check-circle" width={48} className="mx-auto mb-3 text-green-400 opacity-80" />
            <p className="text-sm">Nenhuma falta nesta matéria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/70">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Estudante</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Data</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">Qtd</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Ano Lectivo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {faltas.map(f => (
                  <tr
                    key={f.id}
                    className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white capitalize">
                        {f.estudante_nome || f.codigo_estudante}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                        {f.codigo_estudante}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {formatarData(f.data)}
                    </td>
                    <td className={`px-4 py-3 text-center text-lg font-bold ${corQuantidade(f.quantidade)}`}>
                      {f.quantidade}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {f.ano_lectivo?.replace("_", "/")}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {f.observacao || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return null;
}
