// src/hooks/useUserCookie.ts

import { useState, useEffect } from 'react';
import { getCookie } from '@/lib/utils/cookies';
import { MeuPerfilResponse } from '@/types/api';

export function useUserCookie() {
  const [user, setUser] = useState<MeuPerfilResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCookie = () => {
      try {
        const userCookie = getCookie('user');
        if (userCookie) {
          const parsedUser = JSON.parse(userCookie);
          setUser(parsedUser);
          setLoading(false);
          return true;
        }
        return false;
      } catch (error) {
        setUser(null);
        return false;
      }
    };

    // Verificação inicial
    const found = checkCookie();
    
    if (!found) {
      // Se não encontrou, tenta novamente a cada 100ms por até 3 segundos
      const interval = setInterval(() => {
        const foundNow = checkCookie();
        if (foundNow) {
          clearInterval(interval);
        }
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        setLoading(false);
      }, 3000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, []);

  return { user, loading };
}