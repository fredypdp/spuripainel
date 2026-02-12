// src/app/(painel)/layout.tsx
"use client"
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";
import { tokenStorage, useApi, perfilService} from '@/lib/api';
import { setCookie } from '@/lib/utils/cookies';
import { useUserCookie } from '@/hooks/useUserCookie';
import RouteGuard from "@/components/guards/RouteGuard";

export default function PainelLayout({children}: {children: React.ReactNode}) {
  const router = useRouter();
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const hasLoadedProfile = useRef(false);
  
  const { user, loading: loadingUser } = useUserCookie();  
  const {error: erroMeuPerfil, execute: executarPegarPerfil} = useApi(perfilService.meuPerfil);

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  useEffect(() => {
    const token = tokenStorage.get();

    // Recarregar perfil apenas se não tiver user
    if (!loadingUser && !user && !hasLoadedProfile.current) {
      hasLoadedProfile.current = true;
      executarPegarPerfil(token).then((data) => {
        if (data) {
          setCookie("user", JSON.stringify(data), 1);
          window.location.reload();
        }
      });
    }
    
    // Atualizar cookie silenciosamente se user já existe
    // (sem reload, apenas atualiza o cookie)
    if (!loadingUser && user && !hasLoadedProfile.current) {
      hasLoadedProfile.current = true;
      executarPegarPerfil(token).then((data) => {
        if (data) {
          // Comparar se realmente mudou algo importante
          const userAtual = JSON.stringify(user);
          const userNovo = JSON.stringify(data);
          
          if (userAtual !== userNovo) {
            setCookie("user", JSON.stringify(data), 1);
            // Apenas recarregar se mudou algo relevante
            window.location.reload();
          } else {
            // Apenas atualiza o cookie sem reload
            setCookie("user", JSON.stringify(data), 1);
          }
        }
      });
    }
  }, [router, user, loadingUser, executarPegarPerfil]);

  return (
    <RouteGuard>
      <div className="min-h-screen xl:flex">
        <AppSidebar />
        <Backdrop />
        
        {/* ✅ CORRIGIDO: Adicionado max-w-full para respeitar limite com sidebar */}
        <div className={`flex-1 max-w-full transition-all duration-300 ease-in-out ${mainContentMargin}`}>
          <AppHeader />
          
          {/* ✅ CORRIGIDO: Trocado max-w-(--breakpoint-2xl) por max-w-full */}
          <div className="p-4 mx-auto max-w-full md:p-6">
            {children}
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}