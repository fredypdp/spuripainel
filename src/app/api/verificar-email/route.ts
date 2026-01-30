// app/api/verificar-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email/email-service';
import { emailAuthService } from '@/lib/api/services/email.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identificador, tipo } = body;

    if (!identificador || !tipo) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Identificador e tipo são obrigatórios' 
        },
        { status: 400 }
      );
    }

    console.log('📧 [Verificação] Iniciando processo:', { identificador, tipo });

    // 1️⃣ Gerar token no backend Go
    console.log('1️⃣ Gerando token no backend...');
    const tokenResponse = await emailAuthService.gerarTokenVerificacao({
      identificador,
      tipo
    });

    console.log('✅ Token gerado:', {
      email: tokenResponse.email,
      nome: tokenResponse.nome,
      expira_em: tokenResponse.expira_em
    });

    // 2️⃣ Enviar email via NodeMailer
    console.log('2️⃣ Enviando email via NodeMailer...');
    emailService.initialize();
    const emailResult = await emailService.sendVerificationEmail(
      tokenResponse.email,
      tokenResponse.token,
      tokenResponse.nome
    );

    if (!emailResult.success) {
      console.error('❌ Erro ao enviar email:', emailResult.error);
      throw new Error(emailResult.error || 'Erro ao enviar email');
    }

    console.log('✅ Email enviado com sucesso. MessageID:', emailResult.messageId);

    return NextResponse.json({ 
      success: true, 
      email: tokenResponse.email,
      messageId: emailResult.messageId,
      message: 'Email de verificação enviado com sucesso!'
    });

  } catch (error: any) {
    console.error('❌ Erro no route de verificação:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro ao processar solicitação de verificação' 
      },
      { status: 500 }
    );
  }
}