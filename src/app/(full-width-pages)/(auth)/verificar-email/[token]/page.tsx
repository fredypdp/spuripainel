// app/(full-width-pages)/(auth)/verificar-email/[token]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VerificarEmailComToken } from '@/lib/utils/email';

export default function VerificarEmailPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token inválido');
      return;
    }

    const verificar = async () => {
      try {
        const response = await VerificarEmailComToken(token);
        setStatus('success');
        setMessage(response.message || 'Email verificado com sucesso!');
        
        // Redirecionar após 3 segundos
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'Erro ao verificar email');
      }
    };

    verificar();
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Verificando email...
              </h2>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                Email Verificado!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{message}</p>
              <p className="mt-4 text-sm text-gray-500">Redirecionando para o Painel...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                Erro na Verificação
              </h2>
              <p className="mb-4 text-gray-600 dark:text-gray-400">{message}</p>
              <button
                onClick={() => router.push('/')}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Ir para o Painel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}