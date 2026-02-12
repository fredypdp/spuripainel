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

  // ✅ NOVO: Calcular largura da sidebar para o grid
  const sidebarWidth = isMobileOpen
    ? "0px"
    : isExpanded || isHovered
    ? "290px"
    : "90px";

  useEffect(() => {
    const token = tokenStorage.get();

    if (!loadingUser && !user && !hasLoadedProfile.current) {
      hasLoadedProfile.current = true;
      executarPegarPerfil(token).then((data) => {
        if (data) {
          setCookie("user", JSON.stringify(data), 1);
          window.location.reload();
        }
      });
    }
    
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

  return (
    <RouteGuard>
      {/* ✅ NOVO: Usar CSS Grid ao invés de flexbox */}
      <div 
        className="min-h-screen"
        style={{
          display: 'grid',
          gridTemplateColumns: `${sidebarWidth} 1fr`,
          transition: 'grid-template-columns 300ms ease-in-out',
        }}
      >
        <AppSidebar />
        <Backdrop />
        
        {/* ✅ NOVO: Container sem margin-left, apenas overflow-x-hidden */}
        <div className="overflow-x-hidden">
          <AppHeader />
          
          <div className="p-4 mx-auto md:p-6">
            {children}
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}