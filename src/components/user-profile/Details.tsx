"use client";
import React, { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import { getCookie } from '@/lib/utils/cookies';
import type { MeuPerfilResponse } from '@/types/api';
import { useUserType } from '@/hooks/useRoutePermission';

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

export default function UserAddressCard() {
  const { isAcademia, isEstudante } = useUserType();
  const { isOpen, openModal, closeModal } = useModal();
  const mounted = useSyncExternalStore(
    (cb) => { cb(); return () => {}; },
    () => true,
    () => false,
  );

  const [user, setUser] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());

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

  const provincia = useMemo(() => 
    user?.academia?.provincia || "",
    [user]
  );

  const endereco = useMemo(() => 
    user?.academia?.endereco || "",
    [user]
  );

  const codigoAcademia = useMemo(() => 
    user?.estudante?.codigo_academia || user?.academia?.codigo_academia || "",
    [user]
  );

  const nomeAcademia = useMemo(() => 
    user?.estudante?.academia?.nome || user?.academia?.nome || "",
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

  // Se for estudante e não tiver academia vinculada, não mostra
  if (isEstudante && !codigoAcademia) {
    return null;
  }

  // Se for admin, não mostra (admins não têm endereço)
  if (user?.tipo === 'admin') {
    return null;
  }

  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="w-[70%]">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
              {isEstudante ? 'Academia Vinculada' : 'Mais detalhes'}
            </h4>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
              {isEstudante && user?.estudante && (
                <>
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Nome da Academia
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {nomeAcademia || "Não vinculado"}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Código da Academia
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90 uppercase font-mono">
                      {codigoAcademia || "N/A"}
                    </p>
                  </div>

                  {user.estudante?.academia?.tipo && (
                    <div>
                      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                        Tipo de Academia
                      </p>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90 capitalize">
                        {user.estudante.academia.tipo === 'escola' ? 'Escola' : 'Superior'}
                      </p>
                    </div>
                  )}
                </>
              )}

              {isAcademia && user?.academia && (
                <>
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Código da Academia
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90 uppercase font-mono">
                      {codigoAcademia}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Província
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {provincia || "Não informado"}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Endereço
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {endereco || "Não informado"}
                    </p>
                  </div>

                  {user.academia?.type && (
                    <div>
                      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                        Tipo de Academia
                      </p>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90 capitalize">
                        {user.academia.type === 'escola' ? 'Escola' : 'Superior'}
                      </p>
                    </div>
                  )}

                  {user.academia?.nivel_escolar && (
                    <div>
                      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                        Nível Escolar
                      </p>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90 capitalize">
                        {user.academia.nivel_escolar === 'fundamental' ? 'Fundamental' :
                         user.academia.nivel_escolar === 'medio' ? 'Médio' :
                         user.academia.nivel_escolar === 'misto' ? 'Fundamental e Médio' :
                         user.academia.nivel_escolar}
                      </p>
                    </div>
                  )}

                  {user.academia?.website && (
                    <div>
                      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                        Website
                      </p>
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

                  {user.academia?.numero_telefone && (
                    <div>
                      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                        Telefone
                      </p>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {user.academia.numero_telefone}
                      </p>
                    </div>
                  )}

                  {user.academia?.cursos && user.academia.cursos.length > 0 && (
                    <div className="lg:col-span-2">
                      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                        Cursos Disponíveis
                      </p>
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

                  {user.academia?.total_estudantes !== undefined && (
                    <div>
                      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                        Total de Estudantes
                      </p>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          {user.academia.total_estudantes} estudantes
                        </span>
                      </p>
                    </div>
                  )}

                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        Modal content - implement edit form here
      </Modal>
    </>
  );
}