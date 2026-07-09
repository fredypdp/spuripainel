"use client";
import React, { useMemo } from "react";
import type { MeuPerfilResponse } from '@/types/api';

type UserMetaCardProps = {
  user: MeuPerfilResponse;
};

export default function UserMetaCard({ user }: UserMetaCardProps) {

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

  if (!user) {
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
          
        </div>
      </div>
      
    </>
  );
}
