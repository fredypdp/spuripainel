// src/lib/api/client.ts

import { getCookie, setCookie, removeCookie } from '@/lib/utils/cookies';

// ✅ URL base com protocolo garantido
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;

export const getApiBaseUrl = () => {
  const url = API_BASE_URL;
  
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  
  return url;
};

export interface ApiErrorDetail {
  field?: string;
  code?: string;
  message?: string;
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMIT'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'ERROR';

export interface ApiErrorEnvelope {
  error: ApiErrorCode;
  message: string;
  request_id: string;
  details?: ApiErrorDetail[];
}

export interface FetchOptions extends RequestInit {
  token?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const asApiErrorEnvelope = (value: unknown): ApiErrorEnvelope | undefined => {
  if (!isRecord(value)) return undefined;
  const details = Array.isArray(value.details)
    ? value.details.filter(isRecord).map((detail) => ({
        field: typeof detail.field === 'string' ? detail.field : undefined,
        code: typeof detail.code === 'string' ? detail.code : undefined,
        message: typeof detail.message === 'string' ? detail.message : undefined,
      }))
    : undefined;

  if (
    typeof value.error !== 'string' ||
    typeof value.message !== 'string' ||
    typeof value.request_id !== 'string'
  ) {
    return undefined;
  }

  return {
    error: value.error as ApiErrorCode,
    message: value.message,
    request_id: value.request_id,
    details,
  };
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: ApiErrorEnvelope
  ) {
    const message = extractErrorMessage(data, statusText);
    super(message);
    this.name = 'ApiError';
  }
}

// ✅ EXPORTADO: Erro específico da API Spuri
export class SpuriApiError extends ApiError {
  constructor(
    status: number,
    statusText: string,
    data?: ApiErrorEnvelope
  ) {
    super(status, statusText, data);
    this.name = 'SpuriApiError';
  }
}

/**
 * Extrai a mensagem priorizando o envelope documentado pela API:
 * details[0].message > message > error > statusText.
 */
function extractErrorMessage(data: ApiErrorEnvelope | undefined, statusText: string): string {
  const detailMessage = data?.details?.find((detail) => detail.message)?.message;
  if (detailMessage) return detailMessage;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  return statusText || 'Erro desconhecido';
}

export function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const requestId = error.data?.request_id;
    return [error.message || fallback, requestId ? `Request ID: ${requestId}` : undefined].filter(Boolean).join(' ');
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

/**
 * Cliente HTTP base para fazer requisições à API
 */
async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  
  if (!baseUrl) {
    throw new Error('API_URL não está configurada. Defina NEXT_PUBLIC_API_URL no arquivo .env');
  }

  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // ✅ Tratamento de erro ANTES do parse
  if (!response.ok) {
    let errorData: ApiErrorEnvelope | undefined;
    
    try {
      errorData = asApiErrorEnvelope(await response.json());
    } catch {
      errorData = undefined;
    }
    
    // ✅ Log detalhado do erro (apenas em dev)
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ API Request Failed:', {
        url,
        status: response.status,
        statusText: response.statusText,
        errorData
      });
    }
    
    // ✅ SpuriApiError já extrai a mensagem no construtor
    throw new SpuriApiError(response.status, response.statusText, errorData);
  }

  // Se a resposta for 204 (No Content), retorna objeto vazio
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}


export async function fetchApiBlob(endpoint: string, options: FetchOptions = {}): Promise<Blob> {
  const { token, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    throw new Error('API_URL não está configurada. Defina NEXT_PUBLIC_API_URL no arquivo .env');
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...fetchOptions,
    method: fetchOptions.method ?? 'GET',
    headers,
  });

  if (!response.ok) {
    let errorData: ApiErrorEnvelope | undefined;

    try {
      errorData = asApiErrorEnvelope(await response.json());
    } catch {
      errorData = undefined;
    }

    throw new SpuriApiError(response.status, response.statusText, errorData);
  }

  return response.blob();
}

// Métodos HTTP convenientes
export const api = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    fetchApi<T>(endpoint, { ...options, method: 'GET' }),

  post: <T, TBody = unknown>(endpoint: string, data?: TBody, options?: FetchOptions) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  postForm: <T>(endpoint: string, data: FormData, options?: FetchOptions) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data,
    }),

  put: <T, TBody = unknown>(endpoint: string, data?: TBody, options?: FetchOptions) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T, TBody = unknown>(endpoint: string, dataOrOptions?: TBody | FetchOptions, options?: FetchOptions) => {
    const hasExplicitOptions = options !== undefined;
    const looksLikeOptions = !hasExplicitOptions && isRecord(dataOrOptions) && (
      'token' in dataOrOptions || 'headers' in dataOrOptions || 'signal' in dataOrOptions || 'method' in dataOrOptions
    );
    const data = looksLikeOptions ? undefined : dataOrOptions as TBody | undefined;
    const fetchOptions = (looksLikeOptions ? dataOrOptions : options) as FetchOptions | undefined;

    return fetchApi<T>(endpoint, {
      ...fetchOptions,
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  patch: <T, TBody = unknown>(endpoint: string, data?: TBody, options?: FetchOptions) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),
};

// Storage helpers para token (usando cookies)
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
    removeCookie('user');
  },

  getWithType: () => {
    if (typeof window === 'undefined') return { token: null, type: null };
    const token = getCookie('auth_token');
    const type = getCookie('user_type');
    return { token, type };
  },

  setWithType: (token: string, type: string) => {
    if (typeof window === 'undefined') return;
    setCookie('auth_token', token, 1);
    setCookie('user_type', type, 1);
  },
};
