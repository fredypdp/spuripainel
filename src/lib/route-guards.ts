// src/lib/route-guards.ts

import { UserType } from '@/types/api';

/**
 * Configuração de rotas e suas permissões
 */

export interface RouteConfig {
  path: string;
  allowedTypes: UserType[] | 'public' | 'authenticated';
  redirectIfUnauthorized?: string;
}

/**
 * Definição de todas as rotas do sistema e suas permissões
 */
export const ROUTE_PERMISSIONS: RouteConfig[] = [
  // ==========================================
  // ROTAS PÚBLICAS (sem autenticação)
  // ==========================================
  {
    path: '/login',
    allowedTypes: 'public',
    redirectIfUnauthorized: '/',
  },
  {
    path: '/esqueci-senha',
    allowedTypes: 'public',
    redirectIfUnauthorized: '/',
  },
  {
    path: '/dominis/esqueci-senha',
    allowedTypes: 'public',
    redirectIfUnauthorized: '/',
  },
  {
    path: '/verificar-email',
    allowedTypes: 'public',
  },
  {
    path: '/error-404',
    allowedTypes: 'public',
  },

  // ==========================================
  // ROTAS APENAS PARA ADMIN
  // ==========================================
  {
    path: '/academias',
    allowedTypes: ['admin'],
    redirectIfUnauthorized: '/',
  },
  {
    path: '/estudantes',
    allowedTypes: ['admin', 'academia'],
    redirectIfUnauthorized: '/',
  },
  {
    path: '/configuracoes',
    allowedTypes: ['admin'],
    redirectIfUnauthorized: '/',
  },

  // ==========================================
  // ROTAS PARA ACADEMIA
  // ==========================================
  {
    path: '/gerenciamento',
    allowedTypes: ['academia'],
    redirectIfUnauthorized: '/',
  },
  {
    path: '/notas',
    allowedTypes: 'authenticated',
    redirectIfUnauthorized: '/login',
  },
  {
    path: '/faltas',
    allowedTypes: 'authenticated',
    redirectIfUnauthorized: '/login',
  },

  // ==========================================
  // ROTAS DE AVALIAÇÕES
  // ==========================================
  {
    path: '/avaliacoes',
    allowedTypes: 'authenticated',
    redirectIfUnauthorized: '/login',
  },
  {
    path: '/avaliacoes/avaliacoes-finais',
    allowedTypes: 'authenticated',
    redirectIfUnauthorized: '/login',
  },

  // ==========================================
  // ROTAS PARA USUÁRIOS AUTENTICADOS
  // ==========================================
  {
    path: '/perfil',
    allowedTypes: 'authenticated',
    redirectIfUnauthorized: '/login',
  },
  {
    path: '/',
    allowedTypes: 'authenticated',
    redirectIfUnauthorized: '/login',
  },
];

/**
 * Verifica se o usuário tem permissão para acessar uma rota
 */
export function checkRoutePermission(
  pathname: string,
  userType: UserType | null,
  isAuthenticated: boolean
): {
  allowed: boolean;
  redirectTo?: string;
} {
  // Normalizar o pathname removendo trailing slashes
  const normalizedPath = pathname.endsWith('/') && pathname !== '/'
    ? pathname.slice(0, -1)
    : pathname;

  // Encontrar a configuração da rota
  const routeConfig = ROUTE_PERMISSIONS.find(route => {
    if (route.path === normalizedPath) return true;
    if (route.path.includes('[') && normalizedPath.startsWith(route.path.split('[')[0])) {
      return true;
    }
    return false;
  });

  // Se a rota não está configurada, permitir acesso apenas para autenticados
  if (!routeConfig) {
    if (!isAuthenticated) {
      return {
        allowed: false,
        redirectTo: '/login',
      };
    }
    return { allowed: true };
  }

  // Rotas públicas
  if (routeConfig.allowedTypes === 'public') {
    if (isAuthenticated && routeConfig.redirectIfUnauthorized) {
      return {
        allowed: false,
        redirectTo: routeConfig.redirectIfUnauthorized,
      };
    }
    return { allowed: true };
  }

  // Rotas para usuários autenticados
  if (routeConfig.allowedTypes === 'authenticated') {
    if (!isAuthenticated) {
      return {
        allowed: false,
        redirectTo: routeConfig.redirectIfUnauthorized || '/login',
      };
    }
    return { allowed: true };
  }

  // Rotas específicas por tipo de usuário
  if (Array.isArray(routeConfig.allowedTypes)) {
    if (!isAuthenticated || !userType) {
      return {
        allowed: false,
        redirectTo: routeConfig.redirectIfUnauthorized || '/login',
      };
    }

    if (!routeConfig.allowedTypes.includes(userType)) {
      return {
        allowed: false,
        redirectTo: routeConfig.redirectIfUnauthorized || '/',
      };
    }

    return { allowed: true };
  }

  // Fallback: negar acesso
  return {
    allowed: false,
    redirectTo: '/login',
  };
}

/**
 * Hook helper para obter informações de permissão de rota
 */
export function getRouteInfo(pathname: string): RouteConfig | null {
  const normalizedPath = pathname.endsWith('/') && pathname !== '/'
    ? pathname.slice(0, -1)
    : pathname;

  return ROUTE_PERMISSIONS.find(route => {
    if (route.path === normalizedPath) return true;
    if (route.path.includes('[') && normalizedPath.startsWith(route.path.split('[')[0])) {
      return true;
    }
    return false;
  }) || null;
}