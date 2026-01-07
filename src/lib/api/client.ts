// src/lib/api/client.ts

const API_BASE_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

export interface FetchOptions extends RequestInit {
  token?: string;
}

export class SpuriApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: any
  ) {
    super(data.error);
    this.name = 'SpuriApiError';
  }
}

// src/lib/api/client.ts

import { getCookie, setCookie, removeCookie } from '@/lib/utils/cookies';

const getApiBaseUrl = () => API_BASE_URL;

export interface FetchOptions extends RequestInit {
  token?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: any
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

/**
 * Cliente HTTP base para fazer requisições à API
 */
async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${getApiBaseUrl()}${endpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new SpuriApiError(response.status, response.statusText, errorData);
  }

  // Se a resposta for 204 (No Content), retorna objeto vazio
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Métodos HTTP convenientes
export const api = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    fetchApi<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: any, options?: FetchOptions) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: any, options?: FetchOptions) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: FetchOptions) =>
    fetchApi<T>(endpoint, { ...options, method: 'DELETE' }),

  patch: <T>(endpoint: string, data?: any, options?: FetchOptions) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),
};

// Storage helpers para token (agora usando cookies em vez de localStorage)
export const tokenStorage = {
  get: () => {
    if (typeof window === 'undefined') return null;
    return getCookie('auth_token');
  },

  set: (token: string) => {
    if (typeof window === 'undefined') return;
    setCookie('auth_token', token, 1); // Expira em 1 dia (24h)
  },

  remove: () => {
    if (typeof window === 'undefined') return;
    removeCookie('auth_token');
    removeCookie('user_type');
  },

  getWithType: () => {
    if (typeof window === 'undefined') return { token: null, type: null };
    const token = getCookie('auth_token');
    const type = getCookie('user_type');
    return { token, type };
  },

  setWithType: (token: string, type: string) => {
    if (typeof window === 'undefined') return;
    setCookie('auth_token', token, 1); // Expira em 1 dia (24h)
    setCookie('user_type', type, 1);
  },
};