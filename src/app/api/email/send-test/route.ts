// app/api/email/send-test/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email/email-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, text, html, type } = body;

    // Validações
    if (!to || !subject) {
      return NextResponse.json(
        { success: false, error: 'Campos "to" e "subject" são obrigatórios' },
        { status: 400 }
      );
    }

    // Inicializar o serviço
    emailService.initialize();

    // Verificar conexão
    const isConnected = await emailService.verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Falha na conexão com o servidor SMTP. Verifique as configurações de e-mail.' 
        },
        { status: 500 }
      );
    }

    // Enviar e-mail baseado no tipo
    let result;

    switch (type) {
      case 'verification':
        result = await emailService.sendVerificationEmail(
          to,
          'mock-token-123',
          body.userName || 'Usuário'
        );
        break;

      case 'password-reset':
        result = await emailService.sendPasswordResetEmail(
          to,
          'mock-token-456',
          body.userName || 'Usuário'
        );
        break;

      case 'inscricao-aprovada':
        result = await emailService.sendInscricaoAprovadaEmail(
          to,
          body.userName || 'Estudante',
          body.academiaNome || 'Academia Teste',
          body.tipo || 'escola',
          body.ano || '2024',
          body.curso
        );
        break;

      case 'custom':
      default:
        result = await emailService.sendEmail({
          to,
          subject,
          text,
          html,
        });
        break;
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'E-mail enviado com sucesso!',
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Erro ao enviar e-mail:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro desconhecido ao enviar e-mail' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Inicializar o serviço
    emailService.initialize();

    // Verificar conexão
    const isConnected = await emailService.verifyConnection();

    return NextResponse.json({
      success: true,
      connected: isConnected,
      config: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || '587',
        user: process.env.EMAIL_USER || 'não configurado',
        environment: process.env.NODE_ENV || 'development',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        connected: false,
        error: error.message 
      },
      { status: 500 }
    );
  }
}