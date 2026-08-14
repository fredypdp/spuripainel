// src/app/(painel)/academias/cadastrar/PageContent.tsx
"use client"
import { useState } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useApi, adminService } from '@/lib/api';
import { useUserCookie } from "@/hooks/useUserCookie";
import UnauthorizedAccess from "@/components/guards/UnauthorizedAccess";
import Icon from "@/components/ui/Icon";
import AcademiaCadastroForm from "@/components/academia/AcademiaCadastroForm";
import type { AcademiaCadastroFormPayload } from '@/components/academia/AcademiaCadastroForm';

interface ResultadoCadastro {
  codigo_academia: string;
  nome: string;
}

function SuccessState({ resultado, onCadastrarOutra }: { resultado: ResultadoCadastro; onCadastrarOutra: () => void; }) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center space-y-4">
        <div className="flex justify-center"><div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center"><svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div></div>
        <div><h3 className="text-lg font-semibold text-green-800 dark:text-green-300">Academia cadastrada com sucesso!</h3><p className="text-sm text-green-700 dark:text-green-400 mt-1 capitalize">{resultado.nome}</p></div>
        <div className="bg-white dark:bg-green-900/30 rounded-lg p-4 space-y-2 text-left">
          <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-600 dark:text-gray-400">Código da Academia</span><span className="text-sm font-bold text-gray-900 dark:text-white font-mono">{resultado.codigo_academia}</span></div>
          <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-600 dark:text-gray-400">Senha padrão</span><span className="text-sm font-bold text-gray-900 dark:text-white font-mono">{resultado.codigo_academia}</span></div>
        </div>
        <p className="text-xs text-green-700 dark:text-green-400">A primeira senha é o próprio código da academia. Oriente o encarregado a trocar a senha no primeiro acesso.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button onClick={onCadastrarOutra} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Cadastrar outra</button>
          <Link href="/academias" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>Ver academias</Link>
        </div>
      </div>
    </div>
  );
}

export default function CadastrarAcademiaPageContent() {
  const { user, loading: loadingUser } = useUserCookie();
  const { loading: carregandoCadastro, error: erroCadastro, execute: executarCadastro } = useApi(adminService.registrarAcademia);
  const [resultado, setResultado] = useState<ResultadoCadastro | null>(null);
  const [formKey, setFormKey] = useState(0);

  if (loadingUser) return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" /></div>;
  if (!user || user.tipo !== 'admin') return <UnauthorizedAccess requiredTypes={['admin']} message="Esta página é restrita a administradores." />;

  const limparFormulario = () => { setResultado(null); setFormKey((k) => k + 1); };
  const handleFormSubmit = async (payload: AcademiaCadastroFormPayload) => {
    const result = await executarCadastro(payload);
    if (result?.data) setResultado({ codigo_academia: result.data.codigo_academia, nome: payload.nome });
  };

  if (resultado) return <div><PageBreadcrumb pageTitle="Cadastrar Academia" /><SuccessState resultado={resultado} onCadastrarOutra={limparFormulario} /></div>;

  return (
    <div>
      <PageBreadcrumb pageTitle="Cadastrar Academia" />
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6"><Link href="/academias" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"><Icon icon="mdi:arrow-left" width={18} /> Voltar para academias</Link></div>
        <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.05] p-6 lg:p-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">Cadastrar Nova Academia</h2>
          <AcademiaCadastroForm key={formKey} onSubmit={handleFormSubmit} submitting={carregandoCadastro} apiError={erroCadastro} infoNote={<div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"><p className="text-xs text-blue-700 dark:text-blue-300"><strong>Informação:</strong> depois do cadastro, a academia fica aguardando a ativação por um administrador. A primeira senha será o <strong>código gerado automaticamente</strong>.</p></div>} secondaryAction={<Link href="/academias" className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-4 py-3 text-sm bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]">Cancelar</Link>} />
        </div>
      </div>
    </div>
  );
}
