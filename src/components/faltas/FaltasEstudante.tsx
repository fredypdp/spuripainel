// src/components/faltas/FaltasEstudante.tsx
"use client"
import { useState, useEffect, useMemo } from "react";
import { consultasService, tokenStorage, useApi } from "@/lib/api";
import type { MeuPerfilResponse, Falta } from "@/types/api";
import Icon from "@/components/ui/Icon";
import { getCookie } from "@/lib/utils/cookies";

// ─── helpers ────────────────────────────────────────────────────────────────

function getUserFromCookie(): MeuPerfilResponse | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(getCookie("user") ?? ""); } catch { return null; }
}

function labelNivel(v: string): string {
  const match = v.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!match) return v.replace(/_/g, " ");
  const [, n, tipo] = match;
  if (tipo === "fundamental") return `${n}º Ano do Ensino Fundamental`;
  if (tipo === "medio")       return `${n}º Ano do Ensino Médio`;
  return `${n}º Ano`;
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

// ─── tipos ───────────────────────────────────────────────────────────────────

type AcadInfo = { codigo: string; nome: string; type: string };

type Layer =
  | { type: "academias" }
  | { type: "academia"; a: AcadInfo }
  | { type: "ano"; a: AcadInfo; ano: string }
  | { type: "faltas"; a: AcadInfo; ano: string; materiaId: string; materiaNome: string };

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
  icon: string; title: string; subtitle?: string; badge?: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-300 hover:shadow-sm transition-all text-left"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
        <Icon icon={icon} width={22} className="text-brand-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {badge && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── componente principal ────────────────────────────────────────────────────

export default function FaltasEstudante() {
  const [user] = useState<MeuPerfilResponse | null>(getUserFromCookie);
  const [layer, setLayer] = useState<Layer>({ type: "academias" });
  const codigoEstudante = user?.estudante?.codigo_estudante ?? "";
  const token = tokenStorage.get() ?? undefined;

  const { data: historico, execute: carregarFaltas, loading } = useApi(consultasService.faltasEstudante);

  useEffect(() => {
    if (codigoEstudante) {
      carregarFaltas(codigoEstudante, token);
    }
  }, [codigoEstudante]); // eslint-disable-line react-hooks/exhaustive-deps

  const todasFaltas: Falta[] = historico?.faltas ?? [];

  // Academias únicas nas faltas
  const academias = useMemo((): AcadInfo[] => {
    const map = new Map<string, AcadInfo>();
    todasFaltas.forEach(f => {
      if (!map.has(f.codigo_academia)) {
        map.set(f.codigo_academia, {
          codigo: f.codigo_academia,
          nome: f.codigo_academia,
          type: "escola",
        });
      }
    });
    return Array.from(map.values());
  }, [todasFaltas]);

  function faltasDe(codigoAcademia: string) {
    return todasFaltas.filter(f => f.codigo_academia === codigoAcademia);
  }

  const crumbs = useMemo(() => {
    const base = { label: "Academias", onClick: () => setLayer({ type: "academias" }) };
    if (layer.type === "academias") return [base];
    if (layer.type === "academia") return [base, { label: layer.a.nome }];
    if (layer.type === "ano") return [
      base,
      { label: layer.a.nome, onClick: () => setLayer({ type: "academia", a: layer.a }) },
      { label: labelNivel(layer.ano) },
    ];
    if (layer.type === "faltas") return [
      base,
      { label: layer.a.nome, onClick: () => setLayer({ type: "academia", a: layer.a }) },
      { label: labelNivel(layer.ano), onClick: () => setLayer({ type: "ano", a: layer.a, ano: layer.ano }) },
      { label: layer.materiaNome },
    ];
    return [base];
  }, [layer]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
    </div>
  );

  // ── Academias ──────────────────────────────────────────────────────────────
  if (layer.type === "academias") return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Minhas Faltas</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecione uma academia</p>
      </div>
      {academias.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Icon icon="mdi:check-circle" width={48} className="mx-auto mb-3 text-green-400 opacity-80" />
          <p className="text-sm font-medium">Nenhuma falta registrada! Continue assim!</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {academias.map(a => {
            const fs = faltasDe(a.codigo);
            const total = fs.reduce((acc, f) => acc + f.quantidade, 0);
            return (
              <CardBtn
                key={a.codigo}
                icon={a.type === "superior" ? "mdi:university" : "mdi:school"}
                title={a.nome}
                subtitle={`${total} falta(s) no total`}
                badge={`${fs.length} registro(s)`}
                onClick={() => setLayer({ type: "academia", a })}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Academia → Anos Académicos ─────────────────────────────────────────────
  if (layer.type === "academia") {
    const faltas = faltasDe(layer.a.codigo);
    const anos = Array.from(
      new Set(faltas.map(f => f.ano_academico).filter(Boolean))
    ) as string[];

    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={crumbs} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{layer.a.nome}</h2>
          <p className="text-sm text-gray-500 mt-1">{layer.a.codigo}</p>
        </div>
        {anos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Icon icon="mdi:check-circle" width={48} className="mx-auto mb-3 text-green-400 opacity-80" />
            <p className="text-sm">Nenhum ano académico com faltas.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {anos.map(ano => {
              const fs = faltas.filter(f => f.ano_academico === ano);
              const total = fs.reduce((acc, f) => acc + f.quantidade, 0);
              return (
                <CardBtn
                  key={ano}
                  icon="mdi:numeric"
                  title={labelNivel(ano)}
                  subtitle={`${total} falta(s) em ${fs.length} registro(s)`}
                  onClick={() => setLayer({ type: "ano", a: layer.a, ano })}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Ano → Matérias ─────────────────────────────────────────────────────────
  if (layer.type === "ano") {
    const faltas = faltasDe(layer.a.codigo).filter(f => f.ano_academico === layer.ano);

    const materiasMap = new Map<string, { nome: string; total: number; count: number }>();
    faltas.forEach(f => {
      const id = f.materia_disciplinar_id;
      const ex = materiasMap.get(id);
      if (ex) { ex.total += f.quantidade; ex.count++; }
      else materiasMap.set(id, { nome: f.materia_nome ?? id, total: f.quantidade, count: 1 });
    });

    const materias = Array.from(materiasMap.entries()).sort((a, b) =>
      a[1].nome.localeCompare(b[1].nome)
    );

    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={crumbs} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labelNivel(layer.ano)}</h2>
        {materias.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Icon icon="mdi:check-circle" width={48} className="mx-auto mb-3 text-green-400 opacity-80" />
            <p className="text-sm">Nenhuma falta neste ano.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {materias.map(([id, { nome, total, count }]) => (
              <CardBtn
                key={id}
                icon="mdi:book-open-variant"
                title={nome}
                subtitle={`${total} falta(s) em ${count} registro(s)`}
                badge={total >= 5 ? "atenção" : undefined}
                onClick={() => setLayer({ type: "faltas", a: layer.a, ano: layer.ano, materiaId: id, materiaNome: nome })}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Tabela de Faltas (folha) ───────────────────────────────────────────────
  if (layer.type === "faltas") {
    const faltas = faltasDe(layer.a.codigo).filter(
      f => f.ano_academico === layer.ano && f.materia_disciplinar_id === layer.materiaId
    ).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    const totalFaltas = faltas.reduce((acc, f) => acc + f.quantidade, 0);

    return (
      <div className="space-y-6">
        <Breadcrumb crumbs={crumbs} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{layer.materiaNome}</h2>
          <p className="text-sm text-gray-500 mt-1">{layer.a.nome} · {labelNivel(layer.ano)}</p>
        </div>

        {faltas.length > 0 && (
          <div className="flex flex-wrap gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total de Faltas</p>
              <p className={`text-2xl font-bold mt-0.5 ${corQuantidade(totalFaltas)}`}>{totalFaltas}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Registros</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{faltas.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Maior Falta</p>
              <p className={`text-2xl font-bold mt-0.5 ${corQuantidade(Math.max(...faltas.map(f => f.quantidade)))}`}>
                {Math.max(...faltas.map(f => f.quantidade))}
              </p>
            </div>
          </div>
        )}

        {faltas.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Icon icon="mdi:check-circle" width={48} className="mx-auto mb-3 text-green-400 opacity-80" />
            <p className="text-sm">Nenhuma falta nesta matéria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/70">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Data</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">Quantidade</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Ano Lectivo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {faltas.map(f => (
                  <tr key={f.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                      {formatarData(f.data)}
                    </td>
                    <td className={`px-4 py-3 text-center text-lg font-bold ${corQuantidade(f.quantidade)}`}>
                      {f.quantidade}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
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

        {totalFaltas >= 10 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <Icon icon="mdi:alert-circle" width={20} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">
              Atenção: você acumulou <strong>{totalFaltas}</strong> faltas nesta matéria. Tenha cuidado com a frequência!
            </p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
