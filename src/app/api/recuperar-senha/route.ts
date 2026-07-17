// app/api/recuperar-senha/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email/email-service';
import { emailAuthService } from '@/lib/api/services/email.service';

emailService.initialize();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identificador, tipo } = body;

    if (!identificador) {
      return NextResponse.json(
        {
          success: false,
          error: 'Identificador é obrigatório'
        },
        { status: 400 }
      );
    }

    const tipos = tipo ? [tipo] : ['estudante', 'academia'] as const;
    let tokenResponse;
    let lastError: any;

    // 1️⃣ Gerar token no backend Go. A API exige tipo, então a rota pública
    // tenta estudante e academia para manter a UX com um único campo.
    for (const tipoTentativa of tipos) {
      try {
        tokenResponse = await emailAuthService.gerarTokenRecuperacao({
          identificador,
          tipo: tipoTentativa,
        });
        break;
      } catch (error: any) {
        lastError = error;

        if (!error.message?.includes('não encontrado')) {
          throw error;
        }
      }
    }

    if (!tokenResponse) {
      throw lastError || new Error('Usuário não encontrado');
    }

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

    return NextResponse.json({
      success: true,
      message: 'Senha resetada e email enviado com sucesso!',
      messageId: emailResult.messageId,
      email: tokenResponse.email,
    });

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