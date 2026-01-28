import { emailAuthService } from '@/lib/api/services/email.service';
import { UserType } from "@/types/api";

export async function VerificarEmailComFrontend(identificador: string, tipo: UserType) {
  try {
    const response = await fetch('/api/verificar-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identificador, tipo })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao enviar email');
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function RecuperarSenhaComFrontend(identificador: string, tipo: UserType) {
  try {
    const response = await fetch('/api/recuperar-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identificador, tipo })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao enviar email');
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function VerificarEmailComToken(token: string) {
  try {
    const response = await emailAuthService.verificarEmail(token);
    return response;
  } catch (error) {
    throw error;
  }
}

export async function ResetarSenhaComToken(token: string) {
  try {
    const response = await emailAuthService.resetarSenha(token);
    return response;
  } catch (error) {
    throw error;
  }
}