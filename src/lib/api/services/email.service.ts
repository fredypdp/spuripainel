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
  async gerarTokenVerificacao(data: GerarTokenVerificacaoRequest): Promise<TokenResponse> {
    return api.post<TokenResponse>('/gerar-token/verificacao', data);
  }

  async gerarTokenRecuperacao(data: GerarTokenRecuperacaoRequest): Promise<TokenResponse> {
    return api.post<TokenResponse>('/gerar-token/recuperacao', data);
  }

  async verificarEmail(token: string): Promise<VerificarEmailResponse> {
    return api.post<VerificarEmailResponse>(`/verificar-email/${token}`);
  }
  
  async resetarSenha(token: string): Promise<ResetarSenhaResponse> {
    return api.post<ResetarSenhaResponse>(`/recuperar-senha/${token}`);
  }
}

export const emailAuthService = new EmailAuthService();