import { emailAuthService } from '@/lib/api/services/email.service';
import { UserType } from "@/types/api";
import { SpuriApiError } from '@/lib/api/client';

/**
 * Solicita verificação de email
 * 1. Backend gera token
 * 2. Frontend envia email via API route
 */
export async function VerificarEmailComFrontend(identificador: string, tipo: UserType) {
  try {
    // 1. Gerar token no backend
    const tokenResponse = await emailAuthService.gerarTokenVerificacao({
      identificador,
      tipo,
    });

    // 2. Enviar email via API route do Next.js
    const response = await fetch('/api/verificar-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: tokenResponse.token,
        email: tokenResponse.email,
        nome: tokenResponse.nome,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao enviar email de verificação');
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Solicita recuperação de senha
 * 1. Backend gera token (valida se email está verificado)
 * 2. Backend reseta senha e retorna senha_padrao
 * 3. Frontend envia email via API route incluindo a senha_padrao
 * 
 * @throws {Error} Se o email não estiver verificado
 */
export async function RecuperarSenhaComFrontend(identificador: string, tipo: UserType) {
  try {
    // 1. Gerar token no backend (backend valida se email está verificado)
    const tokenResponse = await emailAuthService.gerarTokenRecuperacao({
      identificador,
      tipo,
    });

    // 2. Resetar senha usando o token (backend retorna senha_padrao)
    const resetResponse = await emailAuthService.resetarSenha(tokenResponse.token);

    // 3. Enviar email via API route do Next.js incluindo a senha_padrao
    const response = await fetch('/api/recuperar-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: tokenResponse.token,
        email: tokenResponse.email,
        nome: tokenResponse.nome,
        senha_padrao: resetResponse.senha_padrao,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao enviar email de recuperação');
    }

    return {
      ...data,
      senha_padrao: resetResponse.senha_padrao,
    };
  } catch (error: any) {
    // ✅ Tratamento específico para SpuriApiError
    if (error instanceof SpuriApiError) {
      const errorData = error.data;
      
      // Verificar se é erro 403 de email não verificado
      if (error.status === 403 && errorData?.error === 'email não verificado') {
        const errorMessage = errorData.message || 'Email não verificado. Por favor, verifique seu email antes de recuperar a senha.';
        throw new Error(errorMessage);
      }
      
      // Verificar se é erro 404 (endpoint não encontrado ou usuário não encontrado)
      if (error.status === 404) {
        throw new Error(errorData?.error || 'Usuário não encontrado');
      }
      
      // Outros erros da API
      throw new Error(errorData?.error || error.statusText || 'Erro ao processar solicitação');
    }
    
    // Outros tipos de erro
    throw error;
  }
}

/**
 * Verifica email usando token da URL
 */
export async function VerificarEmailComToken(token: string) {
  try {
    const response = await emailAuthService.verificarEmail(token);
    return response;
  } catch (error) {
    throw error;
  }
}