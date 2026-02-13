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
    if (!loadingUser && user && !hasLoadedProfile.current) {
      hasLoadedProfile.current = true;
      executarPegarPerfil(token).then((data) => {
        if (data) {
          const userAtual = JSON.stringify(user);
          const userNovo = JSON.stringify(data);
          
          if (userAtual !== userNovo) {
            setCookie("user", JSON.stringify(data), 1);
            window.location.reload();
          } else {
            setCookie("user", JSON.stringify(data), 1);
          }
        }
      });
    }
  }, [router, user, loadingUser, executarPegarPerfil]);

  // Calcula padding-left baseado no estado da sidebar
  const contentPadding = isExpanded || isHovered
    ? "lg:pl-[290px]"
    : "lg:pl-[90px]";

  return (
    <RouteGuard>
      <div className="flex min-h-screen">
        <AppSidebar />
        <Backdrop />
        
        <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${contentPadding}`}>
          <AppHeader />
          
          <div className="p-4 mx-auto w-full max-w-(--breakpoint-2xl) md:p-6">
            {children}
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}