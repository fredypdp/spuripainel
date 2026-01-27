// components/email/EmailTestForm.tsx
'use client';

import { useState } from 'react';
import Button from '@/components/ui/button/Button';
import Alert from '@/components/ui/alert/Alert';

type EmailType = 'custom' | 'verification' | 'password-reset' | 'inscricao-aprovada';

interface EmailFormData {
  to: string;
  subject: string;
  text: string;
  html: string;
  type: EmailType;
  userName?: string;
  academiaNome?: string;
  tipo?: 'escola' | 'superior';
  ano?: string;
  curso?: string;
}

export default function EmailTestForm() {
  const [formData, setFormData] = useState<EmailFormData>({
    to: '',
    subject: 'E-mail de Teste - Sistema SPURI',
    text: 'Este é um e-mail de teste enviado pelo Sistema SPURI.',
    html: '<p>Este é um <strong>e-mail de teste</strong> enviado pelo Sistema SPURI.</p>',
    type: 'custom',
    userName: 'João Silva',
    academiaNome: 'Escola Primária de Luanda',
    tipo: 'escola',
    ano: '2024',
    curso: '',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    messageId?: string;
  } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    config?: any;
  } | null>(null);

  // Verificar conexão SMTP
  const checkConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/email/send-test');
      const data = await response.json();
      setConnectionStatus(data);
    } catch (error: any) {
      setConnectionStatus({
        connected: false,
        config: { error: error.message },
      });
    } finally {
      setLoading(false);
    }
  };

  // Enviar e-mail
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/email/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: data.message,
          messageId: data.messageId,
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Erro ao enviar e-mail',
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Erro desconhecido',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: EmailType) => {
    setFormData({ ...formData, type });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Teste de Envio de E-mail (SMTP Gmail)
        </h2>

        {/* Status da Conexão */}
        <div className="mb-6">
          <Button
            onClick={checkConnection}
            disabled={loading}
            variant="outline"
            className="mb-4"
          >
            {loading ? 'Verificando...' : 'Verificar Conexão SMTP'}
          </Button>

          {connectionStatus && (
            <div className={`p-4 rounded-lg ${
              connectionStatus.connected 
                ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800'
                : 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'
            }`}>
              <h3 className={`font-semibold mb-2 ${
                connectionStatus.connected 
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-red-800 dark:text-red-300'
              }`}>
                {connectionStatus.connected ? '✅ Conectado' : '❌ Não Conectado'}
              </h3>
              {connectionStatus.config && (
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(connectionStatus.config, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Formulário */}
        <form onSubmit={handleSendEmail} className="space-y-6">
          {/* Tipo de E-mail */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Tipo de E-mail
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['custom', 'verification', 'password-reset', 'inscricao-aprovada'] as EmailType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    formData.type === type
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {type === 'custom' && 'Personalizado'}
                  {type === 'verification' && 'Verificação'}
                  {type === 'password-reset' && 'Recuperação'}
                  {type === 'inscricao-aprovada' && 'Aprovação'}
                </button>
              ))}
            </div>
          </div>

          {/* Destinatário */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Destinatário (E-mail) *
            </label>
            <input
              type="email"
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="exemplo@gmail.com"
              required
            />
          </div>

          {/* Campos específicos por tipo */}
          {formData.type !== 'custom' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Nome do Usuário
                </label>
                <input
                  type="text"
                  value={formData.userName}
                  onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="João Silva"
                />
              </div>

              {formData.type === 'inscricao-aprovada' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Nome da Academia
                    </label>
                    <input
                      type="text"
                      value={formData.academiaNome}
                      onChange={(e) => setFormData({ ...formData, academiaNome: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Escola Primária de Luanda"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Tipo
                      </label>
                      <select
                        value={formData.tipo}
                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'escola' | 'superior' })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="escola">Escola</option>
                        <option value="superior">Superior</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Ano
                      </label>
                      <input
                        type="text"
                        value={formData.ano}
                        onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        placeholder="2024"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Curso (opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.curso}
                      onChange={(e) => setFormData({ ...formData, curso: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Informática"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Campos para e-mail personalizado */}
          {formData.type === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Assunto *
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Assunto do e-mail"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Texto (Plain Text)
                </label>
                <textarea
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Conteúdo do e-mail em texto puro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  HTML (opcional)
                </label>
                <textarea
                  value={formData.html}
                  onChange={(e) => setFormData({ ...formData, html: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                  placeholder="<p>Conteúdo HTML</p>"
                />
              </div>
            </>
          )}

          {/* Botão de envio */}
          <Button
            disabled={loading || !formData.to}
            className="w-full"
          >
            {loading ? 'Enviando...' : 'Enviar E-mail de Teste'}
          </Button>
        </form>

        {/* Resultado */}
        {result && (
          <div className="mt-6">
            <Alert
              variant={result.success ? 'success' : 'error'}
              title={result.success ? 'Sucesso!' : 'Erro ao enviar e-mail'}
              message={
                result.success
                  ? `${result.message}${result.messageId ? ` (Message ID: ${result.messageId})` : ''}`
                  : result.message
              }
            />
          </div>
        )}

        {/* Instruções */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
            📝 Configuração Necessária
          </h3>
          <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
            <li>Crie um App Password no Gmail (Conta Google → Segurança)</li>
            <li>Adicione as variáveis no arquivo <code>.env.local</code>:</li>
          </ol>
          <pre className="mt-3 p-3 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto">
{`EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seuemail@gmail.com
EMAIL_PASS=sua-app-password-aqui
NEXT_PUBLIC_APP_URL=http://localhost:3000`}
NODE_ENV=development
          </pre>
        </div>
      </div>
    </div>
  );
}