// src/app/api/verificar-email/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { emailAuthService } from '@/lib/api/services/email.service';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    // ✅ Next.js 15: params é uma Promise
    const { token } = await context.params;

    if (!token || token.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token é obrigatório' 
        },
        { status: 400 }
      );
    }

    // Verificar email usando o token
    const result = await emailAuthService.verificarEmail(token);

    return NextResponse.json({
      success: true,
      message: result.message || 'Email verificado com sucesso!',
      email: result.email,
    });

  } catch (error: any) {
    console.error('❌ Erro ao verificar email:', error);

    // Tratamento de erros específicos
    let statusCode = 500;
    let errorMessage = 'Erro ao verificar email';

    if (error.message?.includes('Token inválido') || error.message?.includes('não encontrado')) {
      statusCode = 404;
      errorMessage = 'Token inválido ou expirado';
    } else if (error.message?.includes('já verificado')) {
      statusCode = 400;
      errorMessage = 'Email já foi verificado anteriormente';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: statusCode }
    );
  }
}