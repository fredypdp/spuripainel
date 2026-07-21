"use client";

import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { useAcademiaConfiguracaoStatus } from "@/hooks/useAcademiaConfiguracaoStatus";

const stepRouteReferences: Record<string, { href: string; label: string }[]> = {
  estudantes: [
    { href: "/estudantes/cadastrar", label: "Cadastrar estudantes" },
    { href: "/solicitacoes-matricula", label: "Ver solicitações de matrículas" },
  ],
};

export default function GuiaConfiguracoesSection() {
  const { steps, completedCount, totalCount, nextStep, loading, error, retry } = useAcademiaConfiguracaoStatus();
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextStepRouteReferences = nextStep ? stepRouteReferences[nextStep.id] ?? [] : [];

  if (loading) {
    return <div className="space-y-5 sm:space-y-6">{[1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800 sm:h-28" />)}</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex items-start gap-3">
          <Icon icon="mdi:alert-circle-outline" className="mt-0.5 h-6 w-6 text-red-500" />
          <div className="flex-1">
            <h2 className="font-semibold text-red-700 dark:text-red-300">Não foi possível carregar o guia</h2>
            <p className="mt-1 text-sm text-red-600 dark:text-red-300">{error.message}</p>
            <button onClick={retry} className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 sm:w-auto">Tentar novamente</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-500">Configuração inicial</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">{completedCount} de {totalCount} passos concluídos</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">Siga a sequência liberada para preparar a academia sem pular dependências. No telemóvel, cada ação fica destacada e ocupa a largura completa para facilitar o toque.</p>
          </div>
          {nextStep ? (
            nextStepRouteReferences.length > 0 ? (
              <div className="grid w-full gap-3 sm:w-auto sm:grid-flow-col sm:auto-cols-max">
                {nextStepRouteReferences.map((route) => (
                  <Link key={route.href} href={route.href} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 sm:w-auto sm:px-5">
                    Continuar: {route.label}
                    <Icon icon="mdi:arrow-right" className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            ) : (
              <Link href={nextStep.href} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 sm:w-auto sm:px-5">
                Continuar: {nextStep.title}
                <Icon icon="mdi:arrow-right" className="h-4 w-4" />
              </Link>
            )
          ) : (
            <span className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300"><Icon icon="mdi:check-circle" className="h-4 w-4" /> Guia concluído</span>
          )}
        </div>
        <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} /></div>
      </section>

      <ol className="grid gap-5 sm:gap-6 lg:gap-7">
        {steps.map((step, index) => {
          const icon = step.completed ? "mdi:check-circle" : step.unlocked ? "mdi:circle-outline" : "mdi:lock-outline";
          const iconColor = step.completed ? "text-green-500" : step.current ? "text-brand-500" : "text-gray-400";
          const routeReferences = stepRouteReferences[step.id] ?? [];
          const cardContent = (
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800 ${iconColor}`}>
                <Icon icon={icon} className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <h3 className="text-base font-semibold leading-6 text-gray-800 dark:text-white/90"><span className="text-gray-400">{index + 1}.</span> {step.title}</h3>
                  {step.current && <span className="w-fit rounded-full bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">Próximo passo</span>}
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{step.description}</p>
                <p className="mt-3 text-xs leading-5 text-gray-400 dark:text-gray-500">{step.details}</p>
                {routeReferences.length > 0 && (
                  <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
                    {routeReferences.map((route) => step.unlocked ? (
                      <Link
                        key={route.href}
                        href={route.href}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-600 sm:w-auto"
                      >
                        {route.label}
                        <Icon icon="mdi:arrow-right" className="h-4 w-4" />
                      </Link>
                    ) : (
                      <span
                        key={route.href}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-400 dark:border-gray-800 sm:w-auto"
                      >
                        {route.label}
                      </span>
                    ))}
                  </div>
                )}
                {step.unlocked && !step.completed && routeReferences.length === 0 && <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-500">Abrir configuração <Icon icon="mdi:open-in-new" className="h-4 w-4" /></span>}
                {!step.unlocked && <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-gray-400"><Icon icon="mdi:lock-outline" className="h-4 w-4" /> Conclua os passos anteriores para liberar</span>}
              </div>
            </div>
          );

          const cardClassName = `rounded-2xl border p-4 shadow-sm transition hover:shadow-md sm:p-5 lg:p-6 ${step.current ? "border-brand-300 bg-brand-50/60 dark:border-brand-700 dark:bg-brand-900/10" : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"} ${!step.unlocked ? "opacity-75" : ""}`;

          if (routeReferences.length > 0 || !step.unlocked) {
            return <li key={step.id} className={cardClassName}>{cardContent}</li>;
          }

          return <li key={step.id}><Link href={step.href} className={`${cardClassName} block`}>{cardContent}</Link></li>;
        })}
      </ol>
    </div>
  );
}
