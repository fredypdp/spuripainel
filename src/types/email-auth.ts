// src/types/email-auth.ts

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

export interface AlterarSenhaRequest {
  senha_atual: string;
  nova_senha: string;
}

export interface AlterarSenhaResponse {
  message: string;
}