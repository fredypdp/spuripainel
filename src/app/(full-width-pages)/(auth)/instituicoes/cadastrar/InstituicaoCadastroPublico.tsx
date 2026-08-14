// src/app/(full-width-pages)/(auth)/instituicoes/cadastrar/InstituicaoCadastroPublico.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/lib/api";
import { academiaPublicaService } from "@/lib/api/services";
import AcademiaCadastroForm from "@/components/academia/AcademiaCadastroForm";
import type { CadastroAcademiaPublicaRequest } from "@/types/api";

interface ResultadoCadastroPublico { codigo_academia: string; nome: string; aviso: string; }

function SuccessState({ resultado, onCadastrarOutra }: { resultado: ResultadoCadastroPublico; onCadastrarOutra: () => void; }) {
  return (
    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center space-y-4">
      <div className="flex justify-center"><div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center"><svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div></div>
      <div><h3 className="text-lg font-semibold text-green-800 dark:text-green-300">Cadastro recebido com sucesso!</h3><p className="text-sm text-green-700 dark:text-green-400 mt-1 capitalize">{resultado.nome}</p></div>
      <div className="bg-white dark:bg-green-900/30 rounded-lg p-4 space-y-2 text-left"><div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-600 dark:text-gray-400">Código da instituição</span><span className="text-sm font-bold text-gray-900 dark:text-white font-mono">{resultado.codigo_academia}</span></div></div>
      <p className="text-xs text-green-700 dark:text-green-400">{resultado.aviso}</p>
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-left"><p className="text-xs text-blue-700 dark:text-blue-300">A conta fica <strong>inativa</strong> até que um administrador do Spuri a ative. Assim que for ativada, já pode entrar usando o código da instituição.</p></div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <button onClick={onCadastrarOutra} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Cadastrar outra instituição</button>
        <Link href="/login" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">Ir para o login</Link>
      </div>
    </div>
  );
}

export default function InstituicaoCadastroPublico() {
  const { loading: submitting, error: apiError, execute: executarCadastro } = useApi(academiaPublicaService.cadastrar);
  const [resultado, setResultado] = useState<ResultadoCadastroPublico | null>(null);
  const [formKey, setFormKey] = useState(0);
  const limparFormulario = () => { setResultado(null); setFormKey((k) => k + 1); };
  const handleFormSubmit = async (payload: CadastroAcademiaPublicaRequest) => {
    const result = await executarCadastro(payload);
    if (result) setResultado({ codigo_academia: result.codigo_academia, nome: payload.nome, aviso: result.aviso });
  };
  return (
    <div className="flex min-h-screen w-full flex-1 justify-center overflow-y-auto bg-gray-50 px-4 py-6 dark:bg-gray-950 lg:w-1/2 lg:px-8">
      <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4"><div><h1 className="text-xl font-semibold text-gray-900 dark:text-white">Cadastrar instituição</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Registe a sua instituição de ensino no Spuri. Um administrador ativa a conta após revisão.</p></div><Link href="/login" className="text-sm font-medium text-brand-500 hover:text-brand-600">Voltar</Link></div>
        {resultado ? <SuccessState resultado={resultado} onCadastrarOutra={limparFormulario} /> : <AcademiaCadastroForm key={formKey} onSubmit={handleFormSubmit} submitting={submitting} apiError={apiError} showSenhaField submitLabel="Cadastrar instituição" submittingLabel="Enviando cadastro..." infoNote={<div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"><p className="text-xs text-blue-700 dark:text-blue-300"><strong>Informação:</strong> depois do cadastro, a instituição fica aguardando a ativação por um administrador do Spuri. Se não definir uma senha, a senha inicial será o código gerado automaticamente.</p></div>} />}
      </div>
    </div>
  );
}
