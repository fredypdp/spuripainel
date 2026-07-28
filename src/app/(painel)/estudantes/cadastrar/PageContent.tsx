// src/app/(painel)/estudantes/cadastrar/PageContent.tsx
"use client"
import { useState } from 'react';
import Link from 'next/link';
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Icon from '@/components/ui/Icon';
import { useUserCookie } from '@/hooks/useUserCookie';
import { useUserType } from '@/hooks/useRoutePermission';
import UnauthorizedAccess from '@/components/guards/UnauthorizedAccess';
import CadastroSingularForm from './CadastroSingularForm';
import CadastroMassaForm from './CadastroMassaForm';

type Aba = 'singular' | 'massa';

export default function CadastrarEstudantePageContent() {
  const { user, loading: loadingUser } = useUserCookie();
  const { isAcademia } = useUserType();
  const [aba, setAba] = useState<Aba>('singular');

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (!user || !isAcademia) {
    return (
      <UnauthorizedAccess
        requiredTypes={['academia']}
        message="Esta página está disponível apenas para academias."
      />
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Cadastrar Estudante" />

      <div className="max-w-3xl">
        {/* Voltar */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/estudantes"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"
          >
            <Icon icon="mdi:arrow-left" width={18} /> Voltar para estudantes
          </Link>
        </div>

        {/* Abas: Cadastro Individual / Cadastro em Massa */}
        <div className="mb-6 inline-flex w-full sm:w-auto rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800/60">
          <button
            type="button"
            onClick={() => setAba('singular')}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              aba === 'singular'
                ? 'bg-white text-brand-600 shadow-sm dark:bg-gray-900 dark:text-brand-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon icon="mdi:account-plus-outline" width={16} /> Cadastro Individual
          </button>
          <button
            type="button"
            onClick={() => setAba('massa')}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              aba === 'massa'
                ? 'bg-white text-brand-600 shadow-sm dark:bg-gray-900 dark:text-brand-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon icon="mdi:account-group-outline" width={16} /> Cadastro em Massa
          </button>
        </div>

        {aba === 'singular' ? <CadastroSingularForm /> : <CadastroMassaForm />}
      </div>
    </div>
  );
}
