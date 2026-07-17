// app/api/recuperar-senha/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email/email-service';
import { emailAuthService } from '@/lib/api/services/email.service';
import type { UserType } from '@/types/api';

emailService.initialize();

const RECOVERY_TYPES: UserType[] = ['estudante', 'academia', 'admin'];

async function resetPasswordAndSendEmail(identificador: string, tipo: UserType) {
  // 1️⃣ Gerar token no backend Go
  const tokenResponse = await emailAuthService.gerarTokenRecuperacao({
    identificador,
    tipo
  });

  // 2️⃣ Resetar senha no backend Go
  const resetResponse = await emailAuthService.resetarSenha(tokenResponse.token);

  // 3️⃣ Enviar email via NodeMailer
  const emailResult = await emailService.sendPasswordResetEmail(
    tokenResponse.email,
    tokenResponse.token,
    tokenResponse.nome,
    resetResponse.senha_padrao
  );

  if (!emailResult.success) {
    console.error('❌ Erro ao enviar email:', emailResult.error);
    throw new Error(emailResult.error || 'Erro ao enviar email');
  }

  return { tokenResponse, emailResult };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identificador, tipo } = body;

    if (!identificador) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Usuário é obrigatório' 
        },
        { status: 400 }
      );
    }

    if (tipo && !RECOVERY_TYPES.includes(tipo)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tipo de usuário inválido' 
        },
        { status: 400 }
      );
    }

    const tiposParaTentar = tipo ? [tipo] : RECOVERY_TYPES;
    const erros: Error[] = [];

    for (const tipoTentativa of tiposParaTentar) {
      try {
        const { tokenResponse, emailResult } = await resetPasswordAndSendEmail(
          identificador.trim(),
          tipoTentativa
        );

        return NextResponse.json({
          success: true,
          message: 'Senha resetada e email enviado com sucesso!',
          messageId: emailResult.messageId,
          email: tokenResponse.email,
        });
      } catch (error: any) {
        erros.push(error);

        const message = String(error?.message || '').toLowerCase();
        const usuarioNaoEncontrado = message.includes('não encontrado') || message.includes('not found');

        if (!usuarioNaoEncontrado || tipo) {
          throw error;
        }
      }
    }

    throw erros[erros.length - 1] || new Error('Usuário não encontrado');

  } catch (error: any) {
    console.error('❌ Erro no route de recuperação:', error);

    // Tratamento específico para email não verificado
    if (error.message?.includes('email não verificado')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email não verificado',
          message: 'Por favor, verifique seu email antes de recuperar a senha',
          email_verificado: false
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}