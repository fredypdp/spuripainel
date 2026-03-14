"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Alert from "@/components/ui/alert/Alert";
import { getCookie } from '@/lib/utils/cookies';
import type { MeuPerfilResponse } from '@/types/api';
import { VerificarEmailComFrontend } from "@/lib/utils/email"

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

export default function UserInfoCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const [user, setUser] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());
  const [mounted, setMounted] = useState(false);
  const [EnviandoEmailVerificacao, setEnviandoEmailVerificacao] = useState(false);
  const [EmailEnviado, setEmailEnviado] = useState(false);
  const [EmailErro, setEmailErro] = useState<string | null>(null);

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

  const userName = useMemo(() => 
    user?.estudante?.nome || user?.academia?.nome || user?.admin?.nome || "",
    [user]
  );

  const userEmail = useMemo(() => 
    user?.estudante?.email || user?.academia?.email || user?.admin?.email || "",
    [user]
  );

  // ✅ CORREÇÃO: Identificador correto para cada tipo de usuário
  const userIdentificador = useMemo(() => {
    if (user?.estudante) {
      return user.estudante.codigo_estudante;
    }
    if (user?.academia) {
      return user.academia.codigo_academia;
    }
    if (user?.admin) {
      return user.admin.email; // Admin usa email como identificador
    }
    return "";
  }, [user]);

  const userTelefone = useMemo(() => 
    user?.estudante?.telefone || user?.academia?.numero_telefone || "",
    [user]
  );

  const userBI = useMemo(() => 
    user?.estudante?.bilhete_identidade || "",
    [user]
  );

  const userRole = useMemo(() => 
    user?.admin?.role || "",
    [user]
  );

  // ✅ Handler com validação robusta
  const handleVerificarEmail = async () => {
    setEnviandoEmailVerificacao(true);
    setEmailEnviado(false);
    setEmailErro(null);
    
    try {
      // ✅ Validações antes de chamar a API
      if (!user?.tipo) {
        throw new Error('Tipo de usuário não identificado');
      }

      if (!userIdentificador || userIdentificador.trim() === '') {
        throw new Error('Identificador do usuário não disponível');
      }

      if (!userEmail || userEmail.trim() === '') {
        throw new Error('Email não cadastrado');
      }
      
      const res = await VerificarEmailComFrontend(userIdentificador, user.tipo);     
      setEmailEnviado(res.success || true);
      
    } catch (error: any) {
      console.error('❌ Erro capturado no handler:', {
        message: error.message,
        error
      });
      setEmailErro(error.message || 'Erro ao enviar email. Tente novamente.');
    } finally {
      setEnviandoEmailVerificacao(false);
    }
  };

  const handleSave = () => {
    console.log("Saving changes...");
    closeModal();
  };

  if (!mounted) {
    return (
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4 w-full">
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
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

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="w-[70%]">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
            Informações Pessoais
          </h4>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Nome Completo
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {userName || "Não informado"}
              </p>
            </div>

            {userBI && (
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Bilhete de Identidade
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {userBI}
                </p>
              </div>
            )}

            {userEmail && (
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Email
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{userEmail}</p>
                    {userEmail && (
                      user?.estudante?.email_verificado || user?.academia?.email_verificado || user?.admin?.email_verificado ? (
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <button 
                          onClick={handleVerificarEmail}
                          disabled={EnviandoEmailVerificacao} 
                          className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition bg-orange-500 text-white shadow-theme-xs hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed px-2 py-1.5 text-sm"
                        >
                          {EnviandoEmailVerificacao ? "Enviando..." : "Verificar e-mail"}
                        </button>
                      )
                    )}
                  </div>
                  {EmailEnviado && (
                    <Alert 
                      title="E-mail enviado com sucesso!" 
                      message="Verifique sua caixa de entrada" 
                      variant="success" 
                    />
                  )}
                  {EmailErro && (
                    <Alert 
                      title="Erro ao enviar e-mail" 
                      message={EmailErro} 
                      variant="error" 
                    />
                  )}
                </div>
              </div>
            )}

            {/* Resto do código permanece igual... */}
            {userTelefone && (
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Telefone</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {userTelefone}
                </p>
              </div>
            )}

            {userRole && (
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Função</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90 capitalize">
                  {userRole === 'fpp' ? 'FPP' : 
                   userRole === 'adm' ? 'Administrador' : 
                   userRole === 'gerente' ? 'Gerente' : userRole}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        Modal content - implement edit form here
      </Modal>
    </div>
  );
}