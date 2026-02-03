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

    // Tratamento de erros específicos baseado na resposta do backend
    let statusCode = 500;
    let errorMessage = 'Erro ao verificar email';
    let userFriendlyMessage = '';

    // Extrair mensagem de erro do backend
    const backendError = error?.data?.error || error?.message || '';

    if (backendError.includes('token já foi usado') || backendError.includes('já verificado')) {
      statusCode = 400;
      errorMessage = 'token já foi usado';
      userFriendlyMessage = 'Este email já foi verificado anteriormente. Você pode fazer login normalmente.';
    } else if (backendError.includes('Token inválido') || backendError.includes('não encontrado') || backendError.includes('token inválido')) {
      statusCode = 404;
      errorMessage = 'Token inválido ou expirado';
      userFriendlyMessage = 'Este link de verificação expirou ou é inválido. Solicite um novo link.';
    } else if (backendError.includes('expirado')) {
      statusCode = 400;
      errorMessage = 'Token expirado';
      userFriendlyMessage = 'Este link de verificação expirou. Solicite um novo link.';
    } else {
      errorMessage = backendError || errorMessage;
      userFriendlyMessage = 'Ocorreu um erro ao verificar o email. Tente novamente mais tarde.';
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        message: userFriendlyMessage
      },
      { status: statusCode }
    );
  }
}