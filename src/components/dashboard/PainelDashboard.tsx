"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import {
  adminService,
  academiaService,
  consultasService,
  estudanteService,
  tokenStorage,
} from "@/lib/api";
import { useUserCookie } from "@/hooks/useUserCookie";
import Icon from "@/components/ui/Icon";
import type {
  MeuPerfilResponse,
  RegistroCompleto,
  NotasEstudanteResponse,
  FaltasEstudanteResponse,
} from "@/types/api";

// ─── helpers ─────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function firstName(nome: string): string {
  return nome?.split(" ")[0] ?? nome;
}

function formatNumber(n: number | undefined | null): string {
  if (n == null) return "—";
  return n.toLocaleString("pt-AO");
}

// ─── sub-components ───────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  );
}

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number | undefined | null;
  sub?: string;
  color: string; // tailwind bg class for icon bg
  iconColor: string;
  loading?: boolean;
  href?: string;
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  iconColor,
  loading,
  href,
}: StatCardProps) {
  const content = (
    <div className="flex items-start gap-4 p-5 rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] hover:shadow-md transition-shadow">
      <div
        className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${color}`}
      >
        <Icon icon={icon} width="22px" className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 truncate">
          {label}
        </p>
        {loading ? (
          <Skeleton className="mt-1 h-7 w-20" />
        ) : (
          <p className="mt-0.5 text-2xl font-bold text-gray-800 dark:text-white tabular-nums">
            {value == null ? "—" : formatNumber(Number(value))}
          </p>
        )}
        {sub && !loading && (
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500 truncate">
            {sub}
          </p>
        )}
        {loading && sub && <Skeleton className="mt-1 h-3 w-28" />}
      </div>
      {href && (
        <Icon
          icon="mdi:chevron-right"
          width="20px"
          className="shrink-0 text-gray-300 dark:text-gray-600 self-center"
        />
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}

interface SectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
}

function Section({ title, icon, children }: SectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Icon icon={icon} width="18px" className="text-gray-400 dark:text-gray-500" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

interface AlertBannerProps {
  icon: string;
  message: React.ReactNode;
  variant: "warning" | "info" | "success";
  action?: { label: string; href: string };
}

function AlertBanner({ icon, message, variant, action }: AlertBannerProps) {
  const styles = {
    warning:
      "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/15 dark:border-yellow-800/40 dark:text-yellow-300",
    info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/15 dark:border-blue-800/40 dark:text-blue-300",
    success:
      "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/15 dark:border-green-800/40 dark:text-green-300",
  };
  const iconStyles = {
    warning: "text-yellow-500 dark:text-yellow-400",
    info: "text-blue-500 dark:text-blue-400",
    success: "text-green-500 dark:text-green-400",
  };

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${styles[variant]}`}
    >
      <Icon
        icon={icon}
        width="18px"
        className={`shrink-0 mt-0.5 ${iconStyles[variant]}`}
      />
      <span className="flex-1">{message}</span>
      {action && (
        <Link
          href={action.href}
          className="shrink-0 font-semibold underline underline-offset-2 hover:opacity-80"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

// ─── Quick-link card ──────────────────────────────────────────────────────────

interface QuickLinkProps {
  href: string;
  icon: string;
  label: string;
  sub: string;
}

function QuickLink({ href, icon, label, sub }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-sm transition-all group"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 shrink-0">
        <Icon
          icon={icon}
          width="20px"
          className="text-brand-500 dark:text-brand-400"
        />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
          {label}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{sub}</p>
      </div>
      <Icon
        icon="mdi:arrow-right"
        width="16px"
        className="ml-auto shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-brand-400 transition-colors"
      />
    </Link>
  );
}

// ─── Nota média badge ─────────────────────────────────────────────────────────

function MediaBadge({ media }: { media: number }) {
  const cor =
    media >= 14
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : media >= 10
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cor}`}>
      {media.toFixed(1)} / 20
    </span>
  );
}

// ─── Visão ADMIN ──────────────────────────────────────────────────────────────

function DashboardAdmin({ user }: { user: MeuPerfilResponse }) {
  const token = tokenStorage.get() ?? undefined;
  const admin = user.admin!;

  const { data: registros, loading: loadingRegistros, execute: fetchRegistros } =
    useApi(adminService.listarTodosRegistros);

  const { data: dataAcademias, loading: loadingAcademias, execute: fetchAcademias } =
    useApi(consultasService.listarAcademias);

  const { data: dataEstudantes, loading: loadingEstudantes, execute: fetchEstudantes } =
    useApi(consultasService.listarEstudantes);

  const load = useCallback(() => {
    fetchRegistros({ token, tipo: "estatisticas" });
    fetchAcademias(token);
    fetchEstudantes(undefined, token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = (registros as RegistroCompleto)?.estatisticas;
  const totalAcademias = (dataAcademias as any)?.total ?? stats?.total_academias;
  const academias: any[] = (dataAcademias as any)?.academias ?? [];
  const inativas = academias.filter((a) => a.status === "inativo").length;

  const loading = loadingRegistros || loadingAcademias || loadingEstudantes;

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {inativas > 0 && (
        <AlertBanner
          variant="warning"
          icon="mdi:alert-outline"
          message={
            <>
              <strong>{inativas}</strong> academia{inativas > 1 ? "s" : ""} aguardam activação.
            </>
          }
          action={{ label: "Ver academias", href: "/academias" }}
        />
      )}

      {/* Métricas principais */}
      <Section title="Visão geral do sistema" icon="mdi:chart-bar">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon="fluent-emoji-high-contrast:school"
            label="Academias"
            value={totalAcademias}
            sub={inativas > 0 ? `${inativas} inativas` : "Todas ativas"}
            color="bg-blue-50 dark:bg-blue-500/10"
            iconColor="text-blue-500"
            loading={loading}
            href="/academias"
          />
          <StatCard
            icon="mdi:account-school"
            label="Estudantes"
            value={(dataEstudantes as any)?.total ?? stats?.total_estudantes}
            color="bg-violet-50 dark:bg-violet-500/10"
            iconColor="text-violet-500"
            loading={loading}
            href="/estudantes"
          />
          <StatCard
            icon="mdi:file-document-edit-outline"
            label="Notas registadas"
            value={stats?.total_notas}
            color="bg-emerald-50 dark:bg-emerald-500/10"
            iconColor="text-emerald-500"
            loading={loadingRegistros}
          />
          <StatCard
            icon="mdi:calendar-remove-outline"
            label="Faltas registadas"
            value={stats?.total_faltas}
            color="bg-orange-50 dark:bg-orange-500/10"
            iconColor="text-orange-500"
            loading={loadingRegistros}
          />
        </div>
      </Section>

      {/* Acesso rápido */}
      <Section title="Acesso rápido" icon="mdi:lightning-bolt-outline">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink
            href="/academias"
            icon="fluent-emoji-high-contrast:school"
            label="Academias"
            sub="Gerir e activar instituições"
          />
          <QuickLink
            href="/estudantes"
            icon="mdi:account-school"
            label="Estudantes"
            sub="Consultar todos os estudantes"
          />
          {admin.role === "fpp" && (
            <QuickLink
              href="/configuracoes"
              icon="mdi:cog-outline"
              label="Configurações"
              sub="Ano letivo e sistema"
            />
          )}
        </div>
      </Section>

      {/* Info do admin */}
      <Section title="A sua conta" icon="mdi:shield-account-outline">
        <div className="p-5 rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.03]">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Role</p>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 uppercase">
                {admin.role}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Email</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{admin.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Desde</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">
                {admin.created_at ? new Date(admin.created_at).toLocaleDateString("pt-PT") : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Status</p>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  admin.status === "ativo"
                    ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                }`}
              >
                {admin.status}
              </span>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─── Visão ACADEMIA ───────────────────────────────────────────────────────────

function DashboardAcademia({ user }: { user: MeuPerfilResponse }) {
  const token = tokenStorage.get() ?? undefined;
  const academia = user.academia!;

  const { data: dataEstudantes, loading: loadingEst, execute: fetchEst } =
    useApi(consultasService.listarEstudantes);

  const { data: dataTurmas, loading: loadingTurmas, execute: fetchTurmas } =
    useApi(academiaService.listarTurmas);

  const { data: dataCursos, loading: loadingCursos, execute: fetchCursos } =
    useApi(academiaService.listarCursos);

  const { data: dataAnoLetivo, execute: fetchAnoLetivo } =
    useApi(academiaService.getAnoLetivo);

  const load = useCallback(() => {
    fetchEst(undefined, token);
    fetchTurmas(token);
    fetchCursos(token);
    fetchAnoLetivo(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const estudantes: any[] = (dataEstudantes as any)?.estudantes ?? [];
  const totalEst = (dataEstudantes as any)?.total ?? 0;
  const turmas: any[] = (dataTurmas as any)?.turmas ?? [];
  const turmasAtivas = turmas.filter((t) => t.status === "ativo").length;
  const cursos: any[] = (dataCursos as any)?.cursos ?? [];
  const cursosAtivos = cursos.filter((c) => c.status === "ativo").length;
  const anoLetivo = (dataAnoLetivo as any)?.ano_letivo ?? null;

  // Totais de notas e faltas derivados da lista de estudantes
  const totalNotasAcad = useMemo(() => {
    const list: any[] = (dataEstudantes as any)?.estudantes ?? [];
    return list.reduce((acc, e) => acc + (e.total_notas ?? 0), 0);
  }, [dataEstudantes]);

  const totalFaltasAcad = useMemo(() => {
    const list: any[] = (dataEstudantes as any)?.estudantes ?? [];
    return list.reduce((acc, e) => acc + (e.total_faltas ?? 0), 0);
  }, [dataEstudantes]);

  const loading = loadingEst || loadingTurmas || loadingCursos;

  const isSuperior = academia.type === "superior";
  const nivelLabel = isSuperior
    ? "Superior"
    : academia.nivel_escolar === "fundamental"
    ? "Fundamental"
    : academia.nivel_escolar === "medio"
    ? "Médio"
    : "Fundamental + Médio";

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {!academia.email_verificado && (
        <AlertBanner
          variant="warning"
          icon="mdi:email-alert-outline"
          message="O e-mail da sua instituição ainda não foi verificado."
          action={{ label: "Ir ao perfil", href: "/perfil" }}
        />
      )}

      {anoLetivo && (
        <AlertBanner
          variant="success"
          icon="mdi:calendar-check-outline"
          message={
            <>
              Ano letivo activo: <strong>{anoLetivo}</strong>
            </>
          }
        />
      )}

      {/* Cabeçalho da instituição */}
      <div className="p-5 rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white capitalize">
                {academia.nome}
              </h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-gray-400 uppercase font-mono">
                {academia.codigo_academia}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1">
                <Icon icon="mdi:map-marker-outline" width="14px" />
                {academia.provincia}
              </span>
              <span className="flex items-center gap-1">
                <Icon icon="mdi:school-outline" width="14px" />
                {nivelLabel}
              </span>
              <span
                className={`flex items-center gap-1 font-medium ${
                  academia.status === "ativo"
                    ? "text-green-500 dark:text-green-400"
                    : "text-red-500 dark:text-red-400"
                }`}
              >
                <Icon
                  icon={
                    academia.status === "ativo"
                      ? "mdi:check-circle-outline"
                      : "mdi:close-circle-outline"
                  }
                  width="14px"
                />
                {academia.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <Section title="Visão geral" icon="mdi:chart-bar">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon="mdi:account-group-outline"
            label="Estudantes"
            value={totalEst}
            color="bg-violet-50 dark:bg-violet-500/10"
            iconColor="text-violet-500"
            loading={loadingEst}
            href="/estudantes"
          />

          <StatCard
            icon="mdi:google-classroom"
            label="Turmas activas"
            value={turmasAtivas}
            sub={`${turmas.length} no total`}
            color="bg-blue-50 dark:bg-blue-500/10"
            iconColor="text-blue-500"
            loading={loadingTurmas}
          />
          <StatCard
            icon="mdi:book-open-outline"
            label={isSuperior ? "Cursos activos" : "Notas registadas"}
            value={isSuperior ? cursosAtivos : totalNotasAcad}
            color="bg-emerald-50 dark:bg-emerald-500/10"
            iconColor="text-emerald-500"
            loading={loading}
          />
        </div>
      </Section>

      {/* Registo */}
      <Section title="Registos" icon="mdi:pencil-outline">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon="mdi:file-document-edit-outline"
            label="Notas lançadas"
            value={totalNotasAcad}
            color="bg-emerald-50 dark:bg-emerald-500/10"
            iconColor="text-emerald-500"
            loading={loadingEst}
            href="/notas"
          />
          <StatCard
            icon="mdi:calendar-remove-outline"
            label="Faltas lançadas"
            value={totalFaltasAcad}
            color="bg-red-50 dark:bg-red-500/10"
            iconColor="text-red-500"
            loading={loadingEst}
            href="/faltas"
          />
        </div>
      </Section>

      {/* Acesso rápido */}
      <Section title="Acesso rápido" icon="mdi:lightning-bolt-outline">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink
            href="/estudantes"
            icon="mdi:account-plus-outline"
            label="Estudantes"
            sub="Matricular e consultar"
          />
          <QuickLink
            href="/notas"
            icon="mdi:file-document-edit-outline"
            label="Notas"
            sub="Lançar e gerir notas"
          />
          <QuickLink
            href="/faltas"
            icon="mdi:calendar-remove-outline"
            label="Faltas"
            sub="Registar presenças"
          />
          <QuickLink
            href="/gerenciamento"
            icon="mdi:clipboard-list-outline"
            label="Gerenciamento"
            sub="Turmas, cursos e materias"
          />
          <QuickLink
            href="/avaliacoes/avaliacoes-finais"
            icon="mdi:clipboard-check-outline"
            label="Avaliações finais"
            sub="Aprovações e reprovações"
          />
          <QuickLink
            href="/perfil"
            icon="mdi:account-edit-outline"
            label="Perfil"
            sub="Dados da instituição"
          />
        </div>
      </Section>
    </div>
  );
}

// ─── Visão ESTUDANTE ──────────────────────────────────────────────────────────

function DashboardEstudante({ user }: { user: MeuPerfilResponse }) {
  const token = tokenStorage.get() ?? undefined;
  const estudante = user.estudante!;

  const { data: dataNotas, loading: loadingNotas, execute: fetchNotas } =
    useApi(estudanteService.minhasNotas);

  const { data: dataFaltas, loading: loadingFaltas, execute: fetchFaltas } =
    useApi(estudanteService.minhasFaltas);

  const { data: dataAvaliacoes, loading: loadingAval, execute: fetchAval } =
    useApi(estudanteService.minhasAvaliacoes);

  const load = useCallback(() => {
    fetchNotas(token);
    fetchFaltas(token);
    fetchAval(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const notasAno = useMemo(() => {
    const notas: any[] = (dataNotas as NotasEstudanteResponse)?.notas ?? [];
    // Derivar ano letivo activo a partir da nota mais recente
    const anoLetivo = notas.length > 0 ? notas[0].ano_lectivo ?? null : null;
    return anoLetivo ? notas.filter((n) => n.ano_lectivo === anoLetivo) : notas;
  }, [dataNotas]);

  const faltasAno = useMemo(() => {
    const faltas: any[] = (dataFaltas as FaltasEstudanteResponse)?.faltas ?? [];
    const anoLetivo = notasAno.length > 0 ? notasAno[0].ano_lectivo ?? null : null;
    return anoLetivo ? faltas.filter((f) => f.ano_lectivo === anoLetivo) : faltas;
  }, [dataFaltas, notasAno]);

  const anoLetivo = notasAno.length > 0 ? (notasAno[0].ano_lectivo ?? null) : null;
  const avaliacoes: any[] = (dataAvaliacoes as any)?.avaliacoes ?? [];
  const totalFaltasAno = faltasAno.reduce((acc: number, f: any) => acc + (f.quantidade ?? 0), 0);

  const mediaGeral = useMemo(() => {
    if (!notasAno.length) return null;
    const soma = notasAno.reduce((acc: number, n: any) => acc + (n.nota ?? 0), 0);
    return soma / notasAno.length;
  }, [notasAno]);

  const aprovacoes = avaliacoes.filter((a) => a.aprovado).length;
  const reprovacoes = avaliacoes.filter((a) => !a.aprovado).length;

  // Status activo
  const emAndamento =
    estudante.status_escolar_fundamental === "em_andamento" ||
    estudante.status_escolar_medio === "em_andamento" ||
    estudante.status_superior === "em_andamento";

  const anoActual =
    estudante.ano_escolar ?? estudante.ano_escolar_medio ?? estudante.ano_superior ?? null;

  const loading = loadingNotas || loadingFaltas || loadingAval;

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {!estudante.email_verificado && estudante.email && (
        <AlertBanner
          variant="warning"
          icon="mdi:email-alert-outline"
          message="O seu e-mail ainda não foi verificado."
          action={{ label: "Ir ao perfil", href: "/perfil" }}
        />
      )}
      {!estudante.codigo_academia && (
        <AlertBanner
          variant="info"
          icon="mdi:school-outline"
          message="Ainda não está matriculado em nenhuma academia."
        />
      )}
      {anoLetivo && (
        <AlertBanner
          variant="success"
          icon="mdi:calendar-check-outline"
          message={
            <>
              Ano letivo activo: <strong>{anoLetivo}</strong>
              {anoActual && (
                <>
                  {" · "}Ano académico:{" "}
                  <strong>
                    {anoActual.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </strong>
                </>
              )}
            </>
          }
        />
      )}

      {/* Card resumo do aluno */}
      <div className="p-5 rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white capitalize">
                {estudante.nome}
              </h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-gray-400 uppercase font-mono">
                {estudante.codigo_estudante}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-400 dark:text-gray-500">
              {estudante.academia && (
                <span className="flex items-center gap-1">
                  <Icon icon="fluent-emoji-high-contrast:school" width="14px" />
                  {estudante.academia.nome}
                </span>
              )}
              <span
                className={`flex items-center gap-1 font-medium ${
                  emAndamento
                    ? "text-green-500 dark:text-green-400"
                    : "text-gray-400"
                }`}
              >
                <Icon
                  icon={emAndamento ? "mdi:check-circle-outline" : "mdi:circle-outline"}
                  width="14px"
                />
                {emAndamento ? "Em andamento" : "Inativo"}
              </span>
              {mediaGeral != null && <MediaBadge media={mediaGeral} />}
            </div>
          </div>
        </div>
      </div>

      {/* Métricas do ano */}
      <Section
        title={anoLetivo ? `Ano lectivo ${anoLetivo}` : "Situação académica"}
        icon="mdi:chart-bar"
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon="mdi:file-document-edit-outline"
            label="Notas este ano"
            value={notasAno.length}
            sub={mediaGeral != null ? `Média: ${mediaGeral.toFixed(1)}` : undefined}
            color="bg-emerald-50 dark:bg-emerald-500/10"
            iconColor="text-emerald-500"
            loading={loadingNotas}
            href="/notas"
          />
          <StatCard
            icon="mdi:calendar-remove-outline"
            label="Faltas este ano"
            value={totalFaltasAno}
            sub={`${faltasAno.length} registro${faltasAno.length !== 1 ? "s" : ""}`}
            color="bg-orange-50 dark:bg-orange-500/10"
            iconColor="text-orange-500"
            loading={loadingFaltas}
            href="/faltas"
          />
          <StatCard
            icon="mdi:check-circle-outline"
            label="Aprovações"
            value={aprovacoes}
            color="bg-green-50 dark:bg-green-500/10"
            iconColor="text-green-500"
            loading={loadingAval}
            href="/avaliacoes/avaliacoes-finais"
          />
          <StatCard
            icon="mdi:close-circle-outline"
            label="Reprovações"
            value={reprovacoes}
            color="bg-red-50 dark:bg-red-500/10"
            iconColor="text-red-500"
            loading={loadingAval}
            href="/avaliacoes/avaliacoes-finais"
          />
        </div>
      </Section>

      {/* Últimas notas */}
      {!loadingNotas && notasAno.length > 0 && (
        <Section title="Últimas notas" icon="mdi:format-list-bulleted">
          <div className="rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] overflow-hidden">
            <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
              {notasAno.slice(0, 5).map((nota, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate capitalize">
                      {nota.materia_nome ?? "Matéria"}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {nota.periodo?.replace(/_/g, " ")} · {nota.categoria}
                    </p>
                  </div>
                  <MediaBadge media={nota.nota} />
                </div>
              ))}
            </div>
            {notasAno.length > 5 && (
              <div className="px-5 py-3 border-t border-gray-50 dark:border-white/[0.04]">
                <Link
                  href="/notas"
                  className="text-xs text-brand-500 dark:text-brand-400 font-medium hover:underline"
                >
                  Ver todas as {notasAno.length} notas →
                </Link>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Acesso rápido */}
      <Section title="Acesso rápido" icon="mdi:lightning-bolt-outline">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink
            href="/notas"
            icon="mdi:file-document-edit-outline"
            label="Minhas notas"
            sub="Ver boletim completo"
          />
          <QuickLink
            href="/faltas"
            icon="mdi:calendar-remove-outline"
            label="Minhas faltas"
            sub="Controlar presenças"
          />
          <QuickLink
            href="/avaliacoes/avaliacoes-finais"
            icon="mdi:clipboard-check-outline"
            label="Avaliações finais"
            sub="Histórico de aprovações"
          />
          <QuickLink
            href="/perfil"
            icon="mdi:account-edit-outline"
            label="Meu perfil"
            sub="Dados pessoais"
          />
        </div>
      </Section>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PainelDashboard() {
  const { user, loading: loadingUser } = useUserCookie();

  const nome = user?.estudante?.nome ?? user?.academia?.nome ?? user?.admin?.nome ?? "";
  const tipo = user?.tipo;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-1">
        {loadingUser ? (
          <>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-40" />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              {greeting()}, {firstName(nome)} 👋
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {tipo === "admin" && "Visão geral do sistema Spuri"}
              {tipo === "academia" && "Resumo da sua instituição"}
              {tipo === "estudante" && "O seu painel académico"}
            </p>
          </>
        )}
      </div>

      {/* Conteúdo condicional por tipo */}
      {loadingUser ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.03]"
            >
              <div className="flex items-start gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {tipo === "admin" && user && <DashboardAdmin user={user} />}
          {tipo === "academia" && user && <DashboardAcademia user={user} />}
          {tipo === "estudante" && user && <DashboardEstudante user={user} />}
        </>
      )}
    </div>
  );
}