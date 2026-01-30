// src/lib/utils/email.ts
import { UserType } from "@/types/api";

/**
 * ✅ SIMPLIFICADO: Tudo acontece no API route
 * Não gera token no frontend - deixa o route fazer tudo
 */
export async function VerificarEmailComFrontend(identificador: string, tipo: UserType) {
  // Validação
  if (!identificador || identificador.trim() === '') {
    throw new Error('Identificador é obrigatório');
  }

  if (!tipo || !['estudante', 'academia', 'admin'].includes(tipo)) {
    throw new Error('Tipo de usuário inválido');
  }

  console.log('📧 Solicitando verificação de email:', { identificador, tipo });

  try {
    // ✅ CHAMA API ROUTE QUE FAZ TUDO:
    // 1. Gera token no backend
    // 2. Envia email
    const response = await fetch('/api/verificar-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identificador,  // ✅ Passa identificador
        tipo            // ✅ Passa tipo
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao enviar email');
    }

    console.log('✅ Email enviado:', data);
    return data;

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    throw error;
  }
}

/**
 * ✅ SIMPLIFICADO: Tudo acontece no API route
 */
export async function RecuperarSenhaComFrontend(identificador: string, tipo: UserType) {
  // Validação
  if (!identificador || identificador.trim() === '') {
    throw new Error('Identificador é obrigatório');
  }

  if (!tipo || !['estudante', 'academia', 'admin'].includes(tipo)) {
    throw new Error('Tipo de usuário inválido');
  }

  console.log('🔐 Solicitando recuperação de senha:', { identificador, tipo });

  try {
    // ✅ CHAMA API ROUTE QUE FAZ TUDO:
    // 1. Gera token no backend
    // 2. Reseta senha
    // 3. Envia email
    const response = await fetch('/api/recuperar-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identificador,  // ✅ Passa identificador
        tipo            // ✅ Passa tipo
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao recuperar senha');
    }

    console.log('✅ Senha recuperada:', data);
    return data;

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    throw error;
  }
}

/**
 * Verifica email usando token da URL
 */
export async function VerificarEmailComToken(token: string) {
  if (!token || token.trim() === '') {
    throw new Error('Token é obrigatório');
  }

  try {
    const response = await fetch(`/api/verificar-email/${token}`, {
      method: 'POST'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao verificar email');
    }

    return data;
  } catch (error: any) {
    console.error('❌ Erro ao verificar token:', error);
    throw error;
  }
}