"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
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
      console.error('Erro ao parsear dados do usuário:', error);
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
        <div>
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
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{userEmail}</p>
                    {userEmail && (
                      user?.estudante?.email_verificado || user?.academia?.email_verificado || user?.admin?.email_verificado ? (
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <button onClick={async () => {
                          setEnviandoEmailVerificacao(true);
                          if (user?.tipo) {
                            let res = await VerificarEmailComFrontend(userEmail, user?.tipo)
                            setEmailEnviado(res.success)
                            console.log(res.email)
                          }
                          setEnviandoEmailVerificacao(false);
                        }} disabled={EnviandoEmailVerificacao} className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition bg-orange-500 text-white shadow-theme-xs hover:bg-orange-600 disabled:bg-orange-300 px-2 py-1.5 text-sm">{EnviandoEmailVerificacao ? "Enviando e-mail..." : "Verificar e-mail"}</button>
                      )
                    )}
                  </div>
                  {EmailEnviado ? (
                    <Alert title="E-mail enviado com sucesso!" message="Verifique sua caixa de e-mails" variant="success" />
                  ) : (
                    <Alert title="Erro ao enviar e-mail!" message="Tente novamente mais tarde" variant="error" />
                  )}
                </div>
              </div>
            )}

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
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Cargo</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90 uppercase">
                  {user?.tipo === "admin" ? `Admin - ${userRole}` : userRole}
                </p>
              </div>
            )}

            {user?.estudante && (
              <>
                {user.estudante.ano_escolar && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Ano Escolar</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {user.estudante.ano_escolar}
                    </p>
                  </div>
                )}
                
                {user.estudante.ano_superior && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Ano Superior</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {user.estudante.ano_superior}
                    </p>
                  </div>
                )}
              </>
            )}

            {user?.academia && (
              <>
                {user.academia.provincia && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Província</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {user.academia.provincia}
                    </p>
                  </div>
                )}
                
                {user.academia.type && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Tipo</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90 capitalize">
                      {user.academia.type}
                    </p>
                  </div>
                )}
                
                {user.academia.website && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Website</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90 capitalize">
                      {user.academia.website}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <button
          onClick={openModal}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
        >
          <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z" fill=""/>
          </svg>
          Editar
        </button>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        Modal content - implement edit form here
      </Modal>
    </div>
  );
}