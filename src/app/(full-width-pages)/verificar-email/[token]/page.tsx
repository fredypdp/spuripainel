// src/app/(full-width-pages)/verificar-email/[token]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VerificarEmailComToken } from '@/lib/utils/email';

type Status = 'loading' | 'success' | 'error';

interface ErrorDetails {
  title: string;
  message: string;
  icon: 'warning' | 'error';
  actionText?: string;
  actionLink?: string;
}

export default function VerificarEmailPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorDetails({
        title: 'Token Inválido',
        message: 'O link de verificação está incompleto ou inválido.',
        icon: 'error',
        actionText: 'Voltar ao Painel',
        actionLink: '/'
      });
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
        
        // Tratamento específico de erros
        const errorMessage = error.message || 'Erro ao verificar email';
        
        if (errorMessage.includes('token já foi usado') || errorMessage.includes('já verificado')) {
          setErrorDetails({
            title: 'Email Já Verificado',
            message: 'Este email já foi verificado anteriormente. Você pode fazer login normalmente.',
            icon: 'warning',
            actionText: 'Ir para Login',
            actionLink: '/login'
          });
        } else if (errorMessage.includes('Token inválido') || errorMessage.includes('expirado') || errorMessage.includes('não encontrado')) {
          setErrorDetails({
            title: 'Link Expirado',
            message: 'Este link de verificação expirou ou é inválido. Solicite um novo link de verificação.',
            icon: 'warning',
            actionText: 'Voltar ao Painel',
            actionLink: '/'
          });
        } else if (errorMessage.includes('Bad Request')) {
          setErrorDetails({
            title: 'Erro na Verificação',
            message: 'Não foi possível verificar o email. O link pode ter expirado ou já ter sido usado.',
            icon: 'warning',
            actionText: 'Voltar ao Painel',
            actionLink: '/'
          });
        } else {
          setErrorDetails({
            title: 'Erro Inesperado',
            message: errorMessage,
            icon: 'error',
            actionText: 'Voltar ao Painel',
            actionLink: '/'
          });
        }
      }
    };

    verificar();
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Verificando email...
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Aguarde enquanto validamos seu email
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                Email Verificado!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{message}</p>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
                Redirecionando para o painel...
              </p>
            </>
          )}

          {status === 'error' && errorDetails && (
            <>
              <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                errorDetails.icon === 'warning' 
                  ? 'bg-yellow-100 dark:bg-yellow-900/30' 
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                {errorDetails.icon === 'warning' ? (
                  <svg className="h-8 w-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                {errorDetails.title}
              </h2>
              <p className="mb-6 text-gray-600 dark:text-gray-400">
                {errorDetails.message}
              </p>
              {errorDetails.actionText && errorDetails.actionLink && (
                <button
                  onClick={() => router.push(errorDetails.actionLink!)}
                  className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  {errorDetails.actionText}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}