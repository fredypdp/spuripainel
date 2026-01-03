"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import React, { useState } from "react";
import { useRouter } from 'next/navigation';

import { useApi, adminService, tokenStorage } from '@/lib/api';

export default function LoginAdm() {
  const router = useRouter();
  const [showSenha, setShowSenha] = useState(false);

  const [Email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  
  const { data, loading, error: erroAPI, execute } = useApi(adminService.login);
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
      const result = await execute({
        email: Email,
        senha,
      });
  
      if (result) {
        tokenStorage.set(result.token);
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
    if (!Email.trim()) {
      erros.push('E-mail é obrigatório');
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
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">Fazer login - Admin.</h1>
          </div>
          <div>
            <form onSubmit={handleLogin}>
              <div className="space-y-6">
                <div>
                  <Label>E-mail</Label>
                  <Input disabled={loading} id="email" name="email" placeholder="Digite o seu e-mail" type="email" onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Senha</Label>
                  <div className="relative">
                    <Input disabled={loading} id="senha" name="senha" type={showSenha ? "text" : "password"} placeholder="Digite a sua senha" onChange={(e) => setSenha(e.target.value)} />
                    <span onClick={() => setShowSenha(!showSenha)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                      {showSenha ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>

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
                {erroAPI && (
                  <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="first-letter:uppercase text-sm text-red-700 dark:text-red-400">{erroAPI}</p>
                  </div>
                )}

                <div>
                  <Button disabled={loading} className="w-full" size="sm">
                    {loading ? (
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
          </div>
        </div>
      </div>
    </div>
  );
}