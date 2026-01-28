// app/api/verificar-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email/email-service';
import { emailAuthService } from '@/lib/api/services/email.service';

export async function POST(request: NextRequest) {
  try {
    const { identificador, tipo } = await request.json();

    // 1. Gerar token no backend
    const response = await emailAuthService.gerarTokenVerificacao({
      identificador,
      tipo
    });

    // 2. Enviar email pelo servidor usando nodemailer
    emailService.initialize();
    const emailResult = await emailService.sendVerificationEmail(
      response.email,
      response.token,
      response.nome
    );

    if (emailResult.success) {
      return NextResponse.json({ success: true, email: response.email });
    } else {
      throw new Error(emailResult.error || 'Erro ao enviar email');
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}