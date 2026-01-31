// src/components/guards/RouteGuard.tsx
"use client"

import { useEffect, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { checkRoutePermission } from '@/lib/route-guards';
import { tokenStorage } from '@/lib/api';
import { useUserCookie } from '@/hooks/useUserCookie';

interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * Loading component reutilizável
 */
function LoadingScreen({ message = "Carregando..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}

/**
 * Componente que protege rotas baseado no tipo de usuário
 * Versão otimizada - sem setState síncrono, sem estado local
 */
export default function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: loadingUser } = useUserCookie();
  const redirectedRef = useRef<string | null>(null);

  // Calcular permissão baseado no estado atual
  const { allowed, redirectTo } = useMemo(() => {
    const token = tokenStorage.get();
    const isAuthenticated = !!token;
    const userType = user?.tipo || null;
    
    return checkRoutePermission(pathname, userType, isAuthenticated);
  }, [pathname, user]);

  // Resetar flag quando pathname muda
  useEffect(() => {
    redirectedRef.current = null;
  }, [pathname]);

  // Lidar com redirecionamento
  useEffect(() => {
    if (loadingUser) return; // Aguardar carregar usuário

    if (!allowed && redirectTo && redirectedRef.current !== redirectTo) {
      redirectedRef.current = redirectTo;
      console.log(`🚫 Acesso negado: ${pathname} → ${redirectTo}`);
      router.push(redirectTo);
    }
  }, [allowed, redirectTo, pathname, router, loadingUser]);

  // Estados de renderização
  if (loadingUser) {
    return <LoadingScreen message="Verificando permissões..." />;
  }

  if (!allowed) {
    return <LoadingScreen message="Redirecionando..." />;
  }

  return <>{children}</>;
}