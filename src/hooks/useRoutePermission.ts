// src/hooks/useRoutePermission.ts

import { usePathname } from 'next/navigation';
import { useUserCookie } from './useUserCookie';
import { tokenStorage } from '@/lib/api';
import { checkRoutePermission, getRouteInfo } from '@/lib/route-guards';
import type { UserType } from '@/types/api';

/**
 * Hook para verificar permissões de rota
 */
export function useRoutePermission() {
  const pathname = usePathname();
  const { user, loading } = useUserCookie();
  const token = tokenStorage.get();
  const isAuthenticated = !!token;
  const userType = user?.tipo || null;

  const permission = checkRoutePermission(pathname, userType, isAuthenticated, tokenStorage.isRestrictedFinance());
  const routeInfo = getRouteInfo(pathname);

  return {
    loading,
    isAuthenticated,
    userType,
    isAllowed: permission.allowed,
    redirectTo: permission.redirectTo,
    routeInfo,
  };
}

/**
 * Hook para verificar se o usuário tem um tipo específico
 */
export function useUserType() {
  const { user, loading } = useUserCookie();

  const isAdmin = user?.tipo === 'admin';
  const isAcademia = user?.tipo === 'academia';
  const isEstudante = user?.tipo === 'estudante';

  const hasType = (type: UserType | UserType[]) => {
    if (!user) return false;
    
    if (Array.isArray(type)) {
      return type.includes(user.tipo);
    }
    
    return user.tipo === type;
  };

  return {
    loading,
    userType: user?.tipo || null,
    isAdmin,
    isAcademia,
    isEstudante,
    hasType,
    user,
  };
}