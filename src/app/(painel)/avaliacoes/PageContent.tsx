// src/app/(painel)/avaliacoes/PageContent.tsx
"use client"
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Icon from "@/components/ui/Icon";

const subPages = [
  {
    href: "/avaliacoes/avaliacoes-finais",
    icon: "mdi:clipboard-check-outline",
    title: "Avaliações Finais",
    subtitle: "Historial de aprovações e reprovações anuais por nível de ensino",
  },
];

export default function AvaliacoesPageContent() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Avaliações" />
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Avaliações</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecione uma secção</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {subPages.map(p => (
            <Link
              key={p.href}
              href={p.href}
              className="flex items-center gap-4 p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-400 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
                <Icon icon={p.icon} width={26} className="text-brand-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{p.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}