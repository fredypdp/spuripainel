import { emailAuthService } from '@/lib/api/services/email.service';
import { emailService } from '@/lib/email/email-service';
import { UserType } from "@/types/api";

export async function VerificarEmailComFrontend(identificador: string, tipo: UserType) {
  try {
    // 1. Gerar token no backend
    const response = await emailAuthService.gerarTokenVerificacao({
      identificador,
      tipo
    });

    // 2. Enviar email pelo frontend usando nodemailer
    emailService.initialize();
    const emailResult = await emailService.sendVerificationEmail(
      response.email,
      response.token,
      response.nome
    );

    if (emailResult.success) {
      return { success: true, email: response.email };
    } else {
      throw new Error(emailResult.error || 'Erro ao enviar email');
    }
  } catch (error) {
    throw error;
  }
}

export async function RecuperarSenhaComFrontend(identificador: string, tipo: UserType) {
  try {
    // 1. Gerar token no backend
    const response = await emailAuthService.gerarTokenRecuperacao({
      identificador,
      tipo
    });

    // 2. Enviar email pelo frontend usando nodemailer
    emailService.initialize();
    const emailResult = await emailService.sendPasswordResetEmail(
      response.email,
      response.token,
      response.nome
    );

    if (emailResult.success) {
      return { success: true, email: response.email };
    } else {
      throw new Error(emailResult.error || 'Erro ao enviar email');
    }
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