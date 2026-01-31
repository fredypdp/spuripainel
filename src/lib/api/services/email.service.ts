// src/lib/api/services/email.service.ts

import { api } from '../client';
import type {
  GerarTokenVerificacaoRequest,
  GerarTokenRecuperacaoRequest,
  TokenResponse,
  VerificarEmailResponse,
  ResetarSenhaResponse,
} from '@/types/email-auth';

class EmailAuthService {
  /**
   * Gera token de verificação de email
   * Backend retorna o token para o frontend enviar o email
   */
  async gerarTokenVerificacao(data: GerarTokenVerificacaoRequest): Promise<TokenResponse> {
    // ✅ Garantir que os campos estão corretos
    const payload = {
      identificador: data.identificador,
      tipo: data.tipo, // 'estudante', 'academia', 'admin'
    };
    
    return api.post<TokenResponse>('/gerar-token/verificacao', payload);
  }

  /**
   * Gera token de recuperação de senha
   * Backend retorna o token para o frontend enviar o email
   */
  async gerarTokenRecuperacao(data: GerarTokenRecuperacaoRequest): Promise<TokenResponse> {
    // ✅ Garantir que os campos estão corretos
    const payload = {
      identificador: data.identificador,
      tipo: data.tipo, // 'estudante', 'academia', 'admin'
    };
    
    return api.post<TokenResponse>('/gerar-token/recuperacao', payload);
  }

  /**
   * Verifica email usando o token
   * Marca o email como verificado no banco
   */
  async verificarEmail(token: string): Promise<VerificarEmailResponse> {
    return api.post<VerificarEmailResponse>(`/verificar-email/${token}`, {});
  }
  
  /**
   * Reseta senha usando o token
   * Retorna a senha padrão gerada pelo backend
   */
  async resetarSenha(token: string): Promise<ResetarSenhaResponse> {
    return api.post<ResetarSenhaResponse>(`/recuperar-senha/${token}`, {});
  }
}

export const emailAuthService = new EmailAuthService();