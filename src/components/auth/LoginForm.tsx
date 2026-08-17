"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { useApi, authService, tokenStorage } from "@/lib/api";
import { setCookieHours } from "@/lib/utils/cookies";
import { getLoginTokenCookieExpirationHours } from "@/lib/api/client";

export default function LoginForm() {
  const router = useRouter();
  const [showSenha, setShowSenha] = useState(false);
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { loading, error: erroLogin, execute: executeLogin } = useApi(authService.login);

  const validarFormulario = (): boolean => {
    const erros: string[] = [];
    if (!identificador.trim()) erros.push("Usuário é obrigatório");
    if (!senha.trim()) erros.push("Senha é obrigatória");
    setValidationErrors(erros);
    return erros.length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);

    if (!validarFormulario()) return;

    try {
      const result = await executeLogin({
        usuario: identificador.trim(),
        senha,
      });

      if (result) {
        tokenStorage.setWithType(result.token, result.type);
        if (tokenStorage.isRestrictedFinance()) {
          const userMinimo = {
            tipo: "estudante",
            estudante: {
              codigo_estudante: result.codigo,
              nome: result.nome,
              status: "inativo",
            },
          };
          setCookieHours("user", JSON.stringify(userMinimo), getLoginTokenCookieExpirationHours());
          router.push("/pagamentos");
          return;
        }
        router.push("/painel");
      }
    } catch {
      // Erro já tratado pelo useApi e exposto em erroLogin
    }
  };

  const handleFormKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    const target = event.target as HTMLInputElement;

    if (event.key !== "Enter" || target.name !== "identificador") return;

    if (identificador.trim() && senha.trim()) return;

    event.preventDefault();
    const passwordInput = event.currentTarget.elements.namedItem("senha");

    if (passwordInput instanceof HTMLInputElement) {
      passwordInput.focus();
    }
  };

  return (
    <div className="flex w-full flex-1 flex-col px-4 sm:px-6 lg:w-1/2 lg:px-8">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Fazer login
            </h1>
          </div>

          <form onKeyDown={handleFormKeyDown} onSubmit={handleLogin}>
            <div className="space-y-6">
              <div>
                <Label>Usuário</Label>
                <Input
                  disabled={loading}
                  id="identificador"
                  name="identificador"
                  placeholder="Código, e-mail ou telefone"
                  type="text"
                  onChange={(e) => setIdentificador(e.target.value)}
                />
              </div>

              <div>
                <Label>Senha</Label>
                <div className="relative">
                  <Input
                    disabled={loading}
                    id="senha"
                    name="senha"
                    type={showSenha ? "text" : "password"}
                    placeholder="Digite a sua senha"
                    onChange={(e) => setSenha(e.target.value)}
                  />
                  <span
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showSenha ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                    )}
                  </span>
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((erro, index) => (
                      <li key={index} className="text-sm text-red-700 dark:text-red-400">
                        {erro}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {erroLogin && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="first-letter:uppercase text-sm text-red-700 dark:text-red-400">
                    {erroLogin}
                  </p>
                </div>
              )}

              <div>
                <Button disabled={loading} className="w-full" size="sm">
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </div>
            </div>
          </form>

          <div className="mt-5 space-y-3">
            <Link href="/matricula" className="inline-flex w-full items-center justify-center rounded-lg border border-brand-500 px-4 py-2.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-brand-400 dark:text-brand-300 dark:hover:bg-brand-500/10">
              Fazer matrícula
            </Link>
            <p className="text-start text-sm font-normal text-gray-700 dark:text-gray-400">
              Esqueceu a senha?{" "}
              <Link
                href="/esqueci-senha"
                className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Clique aqui
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
