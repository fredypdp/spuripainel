// app/(full-width-pages)/(auth)/recuperar-senha/[token]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ResetarSenhaComToken } from '@/lib/utils/email';

export default function RecuperarSenhaPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [senhaTemporaria, setSenhaTemporaria] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token inválido');
      return;
    }

    const resetar = async () => {
      try {
        const response = await ResetarSenhaComToken(token);
        setStatus('success');
        setMessage(response.message || 'Senha redefinida com sucesso!');
        setSenhaTemporaria(response.senha_padrao);
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'Erro ao redefinir senha');
      }
    };

    resetar();
  }, [token]);

  const copiarSenha = () => {
    navigator.clipboard.writeText(senhaTemporaria);
    alert('Senha copiada!');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Redefinindo senha...
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
                Senha Redefinida!
              </h2>
              <p className="mb-4 text-gray-600 dark:text-gray-400">{message}</p>
              
              <div className="mb-6 rounded-lg bg-gray-100 p-4 dark:bg-gray-700">
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                  Sua senha temporária:
                </p>
                <div className="flex items-center justify-between rounded bg-white px-3 py-2 dark:bg-gray-800">
                  <code className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
                    {senhaTemporaria}
                  </code>
                  <button
                    onClick={copiarSenha}
                    className="ml-2 text-blue-600 hover:text-blue-700"
                    title="Copiar senha"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Altere esta senha após fazer login
                </p>
              </div>

              <button
                onClick={() => router.push('/')}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Ir para o Painel
              </button>
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
                Erro na Recuperação
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