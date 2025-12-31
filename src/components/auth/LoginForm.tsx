"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from 'next/navigation';

import { useApi, estudanteService, academiaService, tokenStorage } from '@/lib/api';

export default function LoginForm() {
  const router = useRouter();
  const [showSenha, setShowSenha] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [ContaTipo, setContaTipo] = useState<string>("estudante");
  
  const { loading: carregandoEstudante, error: erroAPIEstudante, execute:  executeEstudante} = useApi(estudanteService.login);
  const { loading: carregandoAcademia, error: erroApiAcademia, execute: executeAcademia} = useApi(academiaService.login);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Limpar erros anteriores
    setValidationErrors([]);

    // Validar formulário
    if (!validarFormulario()) {
      return;
    }
    
    try {
      let result
      if (ContaTipo && ContaTipo == "estudante") result = await executeEstudante({usuario: codigo, senha, type: ContaTipo});
      if (ContaTipo && ContaTipo == "academia") result = await executeAcademia({usuario: codigo, senha, type: ContaTipo});
    
      if (result) {
        tokenStorage.setWithType(result.token, ContaTipo);
        router.push("/");
      }
    } catch (error) {
      console.error('Erro no login:', error);
    }
  };

  // Validação do formulário
  const validarFormulario = (): boolean => {
    const erros: string[] = [];

    // Validações obrigatórias
    if (!codigo.trim()) {
      erros.push('Código de identificação é obrigatório');
    }

    if (!senha.trim()) {
      erros.push('Senha é obrigatória');
    }

    setValidationErrors(erros);
    return erros.length === 0;
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">Fazer login</h1>
          </div>
          <div className="flex border border-brand-500 rounded-lg w-fulltext-sm font-medium transition shadow-theme-xs mb-5">
            <div onClick={() => setContaTipo("estudante")} className={`flex-1 cursor-pointer px-4 py-3 text-center dark:text-white rounded-l-lg ${ContaTipo == "estudante" ? "text-white bg-brand-500 hover:bg-brand-600" : ""}`}>Estudante</div>
            <div onClick={() => setContaTipo("academia")} className={`flex-1 cursor-pointer px-4 py-3 text-center dark:text-white rounded-r-lg ${ContaTipo == "academia" ? "text-white bg-brand-500 hover:bg-brand-600" : ""}`}>Academia</div>
          </div>
          <div>
            <form onSubmit={handleLogin}>
              <div className="space-y-6">
                <div>
                  <Label>Código de {ContaTipo}</Label>
                  <Input disabled={carregandoEstudante || carregandoAcademia} id="codigo" name="codigo" placeholder={`Digite o seu de ${ContaTipo}`} type="text" onChange={(e) => setCodigo(e.target.value)} />
                </div>
                <div>
                  <Label>Senha</Label>
                  <div className="relative">
                    <Input disabled={carregandoEstudante || carregandoAcademia} id="senha" name="senha" type={showSenha ? "text" : "password"} placeholder="Digite a sua senha" onChange={(e) => setSenha(e.target.value)} />
                    <span onClick={() => setShowSenha(!showSenha)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                      {showSenha ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
                {/* <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Keep me logged in
                    </span>
                  </div>
                  <Link
                    href="/reset-password"
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Forgot password?
                  </Link>
                </div> */}

                {/* Erros de validação */}
                {validationErrors.length > 0 && (
                  <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                      Corrija os seguintes erros:
                    </h3>
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.map((erro, index) => (
                        <li key={index} className="text-sm text-red-700 dark:text-red-400">
                          {erro}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Erro da API */}
                {erroAPIEstudante && (
                  <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="first-letter:uppercase text-sm text-red-700 dark:text-red-400">{erroAPIEstudante} (Estudante)</p>
                  </div>
                )}

                {erroApiAcademia && (
                  <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="first-letter:uppercase text-sm text-red-700 dark:text-red-400">{erroApiAcademia} (Academia)</p>
                  </div>
                )}

                <div>
                  <Button disabled={carregandoEstudante || carregandoAcademia} className="w-full" size="sm">
                    {carregandoEstudante || carregandoAcademia ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Não tem uma conta? {""}
                <Link href="/cadastro" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">Fazer cadastro</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
