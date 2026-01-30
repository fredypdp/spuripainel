// app/api/recuperar-senha/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email/email-service';
import { emailAuthService } from '@/lib/api/services/email.service';

emailService.initialize();

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

    console.log('🔐 [Recuperação] Iniciando processo:', { identificador, tipo });

    // 1️⃣ Gerar token no backend Go
    console.log('1️⃣ Gerando token no backend...');
    const tokenResponse = await emailAuthService.gerarTokenRecuperacao({
      identificador,
      tipo
    });

    console.log('✅ Token gerado:', {
      email: tokenResponse.email,
      nome: tokenResponse.nome,
      expira_em: tokenResponse.expira_em
    });

    // 2️⃣ Resetar senha no backend Go
    console.log('2️⃣ Resetando senha no backend...');
    const resetResponse = await emailAuthService.resetarSenha(tokenResponse.token);

    console.log('✅ Senha resetada:', {
      email: resetResponse.email,
      senha_padrao: '***'
    });

    // 3️⃣ Enviar email via NodeMailer
    console.log('3️⃣ Enviando email via NodeMailer...');
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