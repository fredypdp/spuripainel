// app/api/recuperar-senha/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email/email-service';

// Inicializar serviço de email
emailService.initialize();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email, nome, senha_padrao } = body;

    if (!token || !email || !nome || !senha_padrao) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token, email, nome e senha_padrao são obrigatórios' 
        },
        { status: 400 }
      );
    }

    // Enviar email com a senha padrão
    const result = await emailService.sendPasswordResetEmail(
      email, 
      token, 
      nome,
      senha_padrao
    );

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Erro ao enviar email' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email de recuperação enviado com sucesso',
      messageId: result.messageId,
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}