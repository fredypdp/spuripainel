"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import React, { useState } from "react";
import { useRouter } from 'next/navigation';

import { useApi, adminService, tokenStorage } from '@/lib/api';
import { RecuperarSenhaComFrontend } from "@/lib/utils/email"
import Alert from "@/components/ui/alert/Alert";
import Link from "next/link";

export default function EsqueciSenhaAdm() {
  const [email, setEmail] = useState('');
  
  const { loading, error: erroLogin } = useApi(adminService.login);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [EnviandoEmailRecurepacao, setEnviandoEmailRecurepacao] = useState(false);
  const [EmailEnviado, setEmailEnviado] = useState(false);
  const [EmailErro, setEmailErro] = useState(false);
  const [EmailNaoVerificado, setEmailNaoVerificado] = useState(false);
  const [MensagemErro, setMensagemErro] = useState<string>(''); // ✅ Mensagem de erro específica

  const validarFormulario = (): boolean => {
    const erros: string[] = [];

    if (!email.trim()) {
      erros.push('E-mail é obrigatório');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        erros.push('E-mail inválido');
      }
    }

    setValidationErrors(erros);
    return erros.length === 0;
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">Recuperar senha - Admin</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Enviar e-mail de recuperação de senha</p>
          </div>
          <div>
            <form onSubmit={e => e.preventDefault()}>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input 
                    disabled={loading} 
                    id="email" 
                    name="email" 
                    placeholder="Digite o seu e-mail" 
                    type="email"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

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

                {erroLogin && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="first-letter:uppercase text-sm text-red-700 dark:text-red-400">
                      {erroLogin}
                    </p>
                  </div>
                )}

                {/* ✅ Alert para email não verificado */}
                {EmailNaoVerificado && (
                  <Alert 
                    title="Email não verificado!" 
                    message="O e-mail precisa estar verificado para recuperar a senha." 
                    variant="warning" 
                  />
                )}

                <div className="flex flex-col gap-2">
                  <Button onClick={async () => {
                    setValidationErrors([]);
                    setEmailNaoVerificado(false);
                    setMensagemErro('');
                    
                    if (!validarFormulario()) return;

                    setEnviandoEmailRecurepacao(true);
                    setEmailEnviado(false);
                    setEmailErro(false);

                    
                    try {
                      let res = await RecuperarSenhaComFrontend(email, "admin")
                      setEmailEnviado(res.success)
                    } catch (error: any) {                      
                      // ✅ Verificar se erro é de email não verificado
                      const errorMessage = error?.message || '';
                      
                      if (errorMessage.includes('Email não verificado') || 
                          errorMessage.includes('email não verificado') ||
                          errorMessage.includes('verifique seu email')) {
                        setEmailNaoVerificado(true);
                        setMensagemErro(errorMessage);
                      } else if (errorMessage.includes('não encontrado')) {
                        setEmailErro(true);
                        setMensagemErro('Usuário não encontrado. Verifique o e-mail digitado.');
                      } else {
                        setEmailErro(true);
                        setMensagemErro(errorMessage || 'Erro ao processar solicitação');
                      }
                    } finally {
                      setEnviandoEmailRecurepacao(false);
                    }
                  }} disabled={EnviandoEmailRecurepacao} className="w-full capitalize" size="sm">
                    {EnviandoEmailRecurepacao ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Enviando e-mail
                      </>
                    ) : (
                      'Enviar e-mail de recuperação'
                    )}
                  </Button>
                  {EmailEnviado && (
                    <Alert title="E-mail enviado com sucesso!" message="Verifique sua caixa de e-mails" variant="success" />
                  )}
                  {EmailErro && !EmailNaoVerificado && (
                    <Alert 
                      title="Erro ao enviar e-mail!" 
                      message={MensagemErro || "Tente novamente mais tarde"} 
                      variant="error" 
                    />
                  )}
                </div>
              </div>
            </form>
            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                <Link href="/login" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">Fazer login</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}