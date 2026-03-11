"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import { getCookie } from '@/lib/utils/cookies';
import type { MeuPerfilResponse } from '@/types/api';

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

export default function UserMetaCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const [user, setUser] = useState<MeuPerfilResponse | null>(() => getUserFromCookie());
  const [mounted, setMounted] = useState(false);

  // Montar componente
  useEffect(() => {
    setMounted(true);
  }, []);

  // Listener para mudanças no cookie
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
    user?.estudante?.nome || user?.academia?.nome || user?.admin?.nome || "Carregando...",
    [user]
  );

  const userCode = useMemo(() => 
    user?.estudante?.codigo_estudante || user?.academia?.codigo_academia || user?.admin?.role || "",
    [user]
  );

  const userEmail = useMemo(() => 
    user?.estudante?.email || user?.academia?.email || user?.admin?.email || "",
    [user]
  );

  const userType = useMemo(() => user?.tipo || "", [user]);

  const userInitials = useMemo(() =>
    userName && userName !== "Carregando..."
      ? userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
      : "?",
    [userName]
  );

  const emailVerificado = useMemo(() => {
    if (user?.estudante) return user.estudante.email_verificado;
    if (user?.academia) return user.academia.email_verificado;
    if (user?.admin) return user.admin.email_verificado;
    return false;
  }, [user]);

  const handleSave = () => {
    console.log("Saving changes...");
    closeModal();
  };

  if (!mounted) {
    return (
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800 animate-pulse bg-gray-200 dark:bg-gray-700" />
            <div className="order-3 xl:order-2 space-y-2">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            <div className="w-20 h-20 flex items-center justify-center rounded-full bg-brand-500 text-white text-2xl font-semibold shrink-0">
              {userInitials}
            </div>
            
            <div className="order-3 xl:order-2">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="capitalize truncate text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                  {userName}
                </h4>
              </div>
              <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                <p className="uppercase text-sm text-gray-500 dark:text-gray-400">
                  {userCode}
                </p>
                {userEmail && (
                  <>
                    <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {userEmail}
                    </p>
                  </>
                )}
              </div>
              {userEmail && !emailVerificado && (
                <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                  Email não verificado
                </p>
              )}
            </div>
            
            <div className="flex items-center order-2 gap-2 grow xl:order-3 xl:justify-end">              
              {/* <a target="_blank" rel="noreferrer" href='' className="flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
                <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.6666 11.2503H13.7499L14.5833 7.91699H11.6666V6.25033C11.6666 5.39251 11.6666 4.58366 13.3333 4.58366H14.5833V1.78374C14.3118 1.7477 13.2858 1.66699 12.2023 1.66699C9.94025 1.66699 8.33325 3.04771 8.33325 5.58342V7.91699H5.83325V11.2503H8.33325V18.3337H11.6666V11.2503Z" fill=""/>
                </svg>
              </a>

              <a href='' target="_blank" rel="noreferrer" className="flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
                <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.1708 1.875H17.9274L11.9049 8.75833L18.9899 18.125H13.4424L9.09742 12.4442L4.12578 18.125H1.36745L7.80912 10.7625L1.01245 1.875H6.70078L10.6283 7.0675L15.1708 1.875ZM14.2033 16.475H15.7308L5.87078 3.43833H4.23162L14.2033 16.475Z" fill=""/>
                </svg>
              </a>

              <a href="" target="_blank" rel="noreferrer" className="flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
                <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.78381 4.16645C5.78351 4.84504 5.37181 5.45569 4.74286 5.71045C4.11391 5.96521 3.39331 5.81321 2.92083 5.32613C2.44836 4.83904 2.31837 4.11413 2.59216 3.49323C2.86596 2.87233 3.48886 2.47942 4.16715 2.49978C5.06804 2.52682 5.78422 3.26515 5.78381 4.16645ZM5.83381 7.06645H2.50048V17.4998H5.83381V7.06645ZM11.1005 7.06645H7.78381V17.4998H11.0672V12.0248C11.0672 8.97475 15.0422 8.69142 15.0422 12.0248V17.4998H18.3338V10.8914C18.3338 5.74978 12.4505 5.94145 11.0672 8.46642L11.1005 7.06645Z" fill=""/>
                </svg>
              </a> */}
            </div>
          </div>
          
          <button
            onClick={openModal}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z" fill=""/>
            </svg>
            Edit
          </button>
        </div>
      </div>
      
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        Modal content stays the same
      </Modal>
    </>
  );
}