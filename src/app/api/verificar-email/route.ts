import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email/email-service';
import { emailAuthService } from '@/lib/api/services/email.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identificador, tipo } = body;

    // ✅ Pegar o JWT do header enviado pelo frontend
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // 1️⃣ Gerar token no backend Go (passa o JWT)
    const tokenResponse = await emailAuthService.gerarTokenVerificacao(
      { identificador, tipo },
      authHeader
    );

    // 2️⃣ Enviar email via NodeMailer
    emailService.initialize();
    const emailResult = await emailService.sendVerificationEmail(
      tokenResponse.email,
      tokenResponse.token,
      tokenResponse.nome
    );

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Erro ao enviar email');
    }

    return NextResponse.json({
      success: true,
      email: tokenResponse.email,
      message: 'Email de verificação enviado com sucesso!'
    });

  } catch (error: any) {
    console.error('❌ Erro no route de verificação:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao processar solicitação' },
      { status: 500 }
    );
  }
}