// src/lib/api/services/email.service.ts

import { api } from '../client';

export interface GerarTokenVerificacaoRequest {
  identificador: string;
  tipo: 'estudante' | 'academia' | 'admin';
}

export interface GerarTokenRecuperacaoRequest {
  identificador: string;
  tipo: 'estudante' | 'academia' | 'admin';
}

export interface TokenResponse {
  success: boolean;
  token: string;
  email: string;
  nome: string;
  tipo: string;
  expira_em: string;
}

export interface VerificarEmailResponse {
  message: string;
  email: string;
}

export interface ResetarSenhaResponse {
  message: string;
  senha_padrao: string;
  email: string;
  proximos_passos: string;
}

class EmailAuthService {
  /**
   * Gera token de verificação de email (retorna token para frontend enviar)
   */
  async gerarTokenVerificacao(data: GerarTokenVerificacaoRequest): Promise<TokenResponse> {
    return api.post<TokenResponse>('/gerar-token/verificacao', data);
  }

  /**
   * Gera token de recuperação de senha (retorna token para frontend enviar)
   */
  async gerarTokenRecuperacao(data: GerarTokenRecuperacaoRequest): Promise<TokenResponse> {
    return api.post<TokenResponse>('/gerar-token/recuperacao', data);
  }

  /**
   * Verifica email usando token (mesma rota original)
   */
  async verificarEmail(token: string): Promise<VerificarEmailResponse> {
    return api.post<VerificarEmailResponse>(`/verificar-email/${token}`);
  }

  /**
   * Reseta senha usando token (mesma rota original)
   */
  async resetarSenha(token: string): Promise<ResetarSenhaResponse> {
    return api.post<ResetarSenhaResponse>(`/recuperar-senha/${token}`);
  }

  /**
   * Solicita verificação de email (envia via backend - rota original)
   */
  async solicitarVerificacaoEmail(data: GerarTokenVerificacaoRequest): Promise<{ message: string; email: string }> {
    return api.post('/verificar-email/solicitar', data);
  }

  /**
   * Solicita recuperação de senha (envia via backend - rota original)
   */
  async solicitarRecuperacaoSenha(data: GerarTokenRecuperacaoRequest): Promise<{ message: string; email: string }> {
    return api.post('/recuperar-senha/solicitar', data);
  }
}

export const emailAuthService = new EmailAuthService();