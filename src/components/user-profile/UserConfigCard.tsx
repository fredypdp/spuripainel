"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Alert from "../ui/alert/Alert";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { getCookie } from '@/lib/utils/cookies';
import type { MeuPerfilResponse } from '@/types/api';
import { EyeCloseIcon, EyeIcon } from "@/icons";

import { useApi, perfilService, tokenStorage } from '@/lib/api';

const getUserFromCookie = (): MeuPerfilResponse | null => {
  if (typeof window === 'undefined') return null;
  
  const userCookie = getCookie("user");
  if (userCookie) {
    try {
      return JSON.parse(userCookie);
    } catch (error) {
      return null;
    }
  }
  return null;
};

export default function UserConfigCard() {
  const router = useRouter();
  const [verEditarSenha, setVerEditarSenha] = useState<boolean>(false);
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showSenhaNova, setShowSenhaNova] = useState(false);
  const [user, setUser] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());
  const [mounted, setMounted] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  const { loading: alterandoSenha, error: erroAlterarSenha, execute: executeAlterarSenha } = useApi(perfilService.alterarSenha);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const interval = setInterval(() => {
      const updatedUser = getUserFromCookie();
      setUser(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(updatedUser)) {
          return updatedUser;
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4 w-full">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const validarFormulario = (): boolean => {
    const erros: string[] = [];

    if (!senhaAtual.trim()) {
      erros.push('Senha atual é obrigatória');
    }

    if (!senhaNova.trim()) {
      erros.push('Nova senha é obrigatória');
    } else if (senhaNova.length < 6) {
      erros.push('Nova senha deve ter no mínimo 6 caracteres');
    }

    if (senhaAtual === senhaNova && senhaAtual.trim()) {
      erros.push('A nova senha deve ser diferente da senha atual');
    }

    setValidationErrors(erros);
    return erros.length === 0;
  };

  const limparFormulario = () => {
    setSenhaAtual('');
    setSenhaNova('');
    setValidationErrors([]);
    setSuccessMessage('');
    setShowSenhaAtual(false);
    setShowSenhaNova(false);
  };

  const editarSenha = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setValidationErrors([]);
    setSuccessMessage('');

    if (!validarFormulario()) {
      return;
    }
    
    try {
      const result = await executeAlterarSenha({
        senha_atual: senhaAtual, 
        nova_senha: senhaNova
      });
    
      if (result) {
        setSuccessMessage('Você será redirecionado para fazer login novamente.');
        
        // Limpar dados e redirecionar após 2 segundos
        setTimeout(() => {
          tokenStorage.remove();
          router.push('/login');
        }, 2000);
      }
    } catch (error: any) {
      // O erro já será tratado pelo hook useApi e estará disponível em erroAlterarSenha
      console.error('Erro ao alterar senha:', error);
    }
  };

  const cancelarEdicao = () => {
    limparFormulario();
    setVerEditarSenha(false);
  };

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Configurações
        </h4>

        {/* Formulário de Alteração de Senha */}
        {verEditarSenha ? (
          <form onSubmit={editarSenha} className="space-y-4">
            {/* Senha Atual */}
            <div className="flex gap-2">
              <div>
                <Label htmlFor="senha-atual">Senha Atual</Label>
                <div className="relative">
                  <Input 
                    disabled={alterandoSenha} 
                    id="senha-atual" 
                    name="senha-atual" 
                    type={showSenhaAtual ? "text" : "password"} 
                    placeholder="Digite a sua senha atual"
                    onChange={(e) => setSenhaAtual(e.target.value)}
                  />
                  <span onClick={() => setShowSenhaAtual(!showSenhaAtual)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                    {showSenhaAtual ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                    )}
                  </span>
                </div>
              </div>
              <div>
                <Label htmlFor="senha-nova">Nova Senha</Label>
                <div className="relative">
                  <Input 
                    disabled={alterandoSenha} 
                    id="senha-nova" 
                    name="senha-nova" 
                    type={showSenhaNova ? "text" : "password"} 
                    placeholder="Digite a sua nova senha"
                    onChange={(e) => setSenhaNova(e.target.value)}
                  />
                  <span onClick={() => setShowSenhaNova(!showSenhaNova)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                    {showSenhaNova ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-2">
              <Button variant="success" disabled={alterandoSenha}>
                {alterandoSenha ? 'Alterando...' : 'Salvar Nova Senha'}
              </Button>
              <Button onClick={cancelarEdicao}  variant="outline" disabled={alterandoSenha}>
                Cancelar
              </Button>
            </div>

            {successMessage && (
              <Alert title="Senha alterada com sucesso!" message={successMessage} variant="success" />
            )}

            {/* Erros de Validação */}
            {validationErrors.length > 0 && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
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
            {erroAlterarSenha && (
              <div className="first-letter:uppercase w-fit p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">
                  {typeof erroAlterarSenha === 'string' 
                    ? erroAlterarSenha 
                    : 'Erro ao alterar senha. Verifique se a senha atual está correta.'}
                </p>
              </div>
            )}
          </form>
        ) : (
          <div>
            <Button onClick={() => setVerEditarSenha(true)} variant="outline">
              Editar Senha
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}