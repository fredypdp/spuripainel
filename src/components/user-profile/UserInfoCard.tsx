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
  const [EmailErro, setEmailErro] = useState(false);

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
        <div className="w-[60%]">
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
                        <button onClick={async () => {
                          setEnviandoEmailVerificacao(true);
                          setEmailEnviado(false);
                          setEmailErro(false);
                          
                          try {
                            if (user?.tipo) {
                              let res = await VerificarEmailComFrontend(userEmail, user?.tipo)
                              setEmailEnviado(res.success)
                            }
                          } catch (error) {
                            setEmailErro(true);
                          } finally {
                            setEnviandoEmailVerificacao(false);
                          }
                        }} disabled={EnviandoEmailVerificacao} className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition bg-orange-500 text-white shadow-theme-xs hover:bg-orange-600 disabled:bg-orange-300 px-2 py-1.5 text-sm">{EnviandoEmailVerificacao ? "Enviando e-mail..." : "Verificar e-mail"}</button>
                      )
                    )}
                  </div>
                  {EmailEnviado && (
                    <Alert title="E-mail enviado com sucesso!" message="Verifique sua caixa de e-mails" variant="success" />
                  )}
                  {EmailErro && (
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
              <>
                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Cargo</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      userRole === 'adm' 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                        : userRole === 'gerente'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      Admin - {userRole.toUpperCase()}
                    </span>
                  </p>
                </div>

                {user?.admin?.status && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Status</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.admin.status === 'ativo' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {user.admin.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </p>
                  </div>
                )}

                {user?.admin?.total_acoes_realizadas !== undefined && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Total de Ações Realizadas</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {user.admin.total_acoes_realizadas}
                    </p>
                  </div>
                )}

                {user?.admin?.created_at && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Membro Desde</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {new Date(user.admin.created_at).toLocaleDateString('pt-AO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}

                {user?.admin?.created_by && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Criado Por</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {user.admin.created_by}
                    </p>
                  </div>
                )}
              </>
            )}

            {user?.estudante && (
              <>
                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Código do Estudante</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90 uppercase font-mono">
                    {user.estudante.codigo_estudante}
                  </p>
                </div>

                {user.estudante.ano_escolar && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Ano Escolar</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {user.estudante.ano_escolar.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>
                )}
                
                {user.estudante.ano_superior && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Ano Superior</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {user.estudante.ano_superior.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>
                )}

                {user.estudante.curso_medio && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Curso Médio</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {user.estudante.curso_medio}
                    </p>
                  </div>
                )}

                {user.estudante.curso_superior && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Curso Superior</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {user.estudante.curso_superior}
                    </p>
                  </div>
                )}

                {user.estudante.status_escolar && user.estudante.status_escolar !== 'inativo' && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Status Escolar</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.estudante.status_escolar === 'em_andamento' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : user.estudante.status_escolar === 'finalizado'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {user.estudante.status_escolar === 'em_andamento' ? 'Em Andamento' : 
                         user.estudante.status_escolar === 'finalizado' ? 'Finalizado' : 
                         'Inativo'}
                      </span>
                    </p>
                  </div>
                )}

                {user.estudante.status_superior && user.estudante.status_superior !== 'inativo' && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Status Superior</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.estudante.status_superior === 'em_andamento' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : user.estudante.status_superior === 'finalizado'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {user.estudante.status_superior === 'em_andamento' ? 'Em Andamento' : 
                         user.estudante.status_superior === 'finalizado' ? 'Finalizado' : 
                         'Inativo'}
                      </span>
                    </p>
                  </div>
                )}

                {user.estudante.bilhete_identidade_responsavel && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">BI do Responsável</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {user.estudante.bilhete_identidade_responsavel}
                    </p>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Status Geral</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.estudante.status === 'ativo' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : user.estudante.status === 'finalizado'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}>
                      {user.estudante.status === 'ativo' ? 'Ativo' : 
                       user.estudante.status === 'finalizado' ? 'Finalizado' : 
                       'Inativo'}
                    </span>
                  </p>
                </div>
              </>
            )}

            {user?.academia && (
              <>
                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Código da Academia</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90 uppercase font-mono">
                    {user.academia.codigo_academia}
                  </p>
                </div>

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
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Tipo de Academia</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90 capitalize">
                      {user.academia.type === 'escola' ? 'Escola' : 'Superior'}
                    </p>
                  </div>
                )}

                {user.academia.nivel_escolar && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Nível Escolar</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90 capitalize">
                      {user.academia.nivel_escolar === 'fundamental' ? 'Fundamental' :
                       user.academia.nivel_escolar === 'medio' ? 'Médio' :
                       user.academia.nivel_escolar === 'misto' ? 'Fundamental e Médio' :
                       user.academia.nivel_escolar}
                    </p>
                  </div>
                )}

                {user.academia.endereco && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Endereço</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {user.academia.endereco}
                    </p>
                  </div>
                )}
                
                {user.academia.website && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Website</p>
                    <a 
                      href={user.academia.website.startsWith('http') ? user.academia.website : `https://${user.academia.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {user.academia.website}
                    </a>
                  </div>
                )}

                {user.academia.cursos && user.academia.cursos.length > 0 && (
                  <div className="lg:col-span-2">
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Cursos Disponíveis</p>
                    <div className="flex flex-wrap gap-2">
                      {user.academia.cursos.map((curso, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                          {curso}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Status</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.academia.status === 'ativo' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}>
                      {user.academia.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </p>
                </div>

                {user.academia.total_estudantes !== undefined && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Total de Estudantes</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {user.academia.total_estudantes}
                    </p>
                  </div>
                )}

                {user.academia.total_inscricoes_pendentes !== undefined && user.academia.total_inscricoes_pendentes > 0 && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Inscrições Pendentes</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                        {user.academia.total_inscricoes_pendentes}
                      </span>
                    </p>
                  </div>
                )}
              </>
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