// app/api/academia-cadastro-notificacao/route.ts
//
// Aviso por email aos administradores sempre que uma instituição conclui o
// autocadastro público (POST /academia/cadastro no backend Go) e fica
// pendente de análise/ativação.
//
// Enviado pelo frontend (NodeMailer/SMTP, mesmo caminho já usado para
// verificação de email e recuperação de senha) em vez do backend (EmailJS)
// porque a conta EmailJS do projeto já atingiu o limite de templates do
// plano gratuito. O backend Go mantém o suporte equivalente já implementado
// (AdminProjection.GetAdminsParaNotificarNovaAcademia + SendAcademiaCadastradaEmail
// em internal/services/email_service.go), só não enviando nada enquanto
// EMAILJS_TEMPLATE_ACADEMIA_CADASTRADA não for configurada — os dois
// caminhos convivem sem conflito.
//
// Segurança: este endpoint é público (chamado de uma página sem login), então
// NUNCA confia no conteúdo enviado pelo navegador para montar o email — o
// navegador só informa QUAL codigoAcademia notificar; todo o conteúdo do
// email (nome, tipo, nível, província) vem de uma consulta ao backend
// (GET /consultar-academia/:codigo, também pública) feita aqui, no servidor,
// logo antes de enviar. Se o código não existir, nada é enviado.
import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email/email-service';
import { api, SpuriApiError } from '@/lib/api/client';

interface ConsultarAcademiaPublicaResponse {
  nome: string;
  type: string;
  nivel: string;
  codigo_academia: string;
  provincia: string;
}

interface AdminNotificacao {
  nome: string;
  email: string;
}

/**
 * Formato de ADMINS_NOTIFICACAO_ACADEMIA: "Nome Um:email1@x.com,Nome Dois:email2@x.com".
 * Lista estática por env var (não vem do banco) de propósito — evita expor
 * publicamente, por um endpoint sem autenticação, quais administradores
 * existem/seus emails. Ver seção de segurança na tarefa correspondente.
 */
function parseAdminsNotificacao(raw: string | undefined): AdminNotificacao[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((entrada) => entrada.trim())
    .filter(Boolean)
    .map((entrada) => {
      const separador = entrada.indexOf(':');
      if (separador === -1) return null;
      const nome = entrada.slice(0, separador).trim();
      const email = entrada.slice(separador + 1).trim();
      if (!nome || !email) return null;
      return { nome, email };
    })
    .filter((entrada): entrada is AdminNotificacao => entrada !== null);
}

export async function POST(request: NextRequest) {
  emailService.initialize();

  const admins = parseAdminsNotificacao(process.env.ADMINS_NOTIFICACAO_ACADEMIA);
  if (admins.length === 0) {
    console.warn('[academia-cadastro-notificacao] ADMINS_NOTIFICACAO_ACADEMIA não configurado — nenhum aviso enviado');
    return NextResponse.json({ success: true, sent: 0, failed: 0 });
  }

  let codigoAcademia: string | undefined;
  try {
    const body = await request.json();
    codigoAcademia = typeof body?.codigoAcademia === 'string' ? body.codigoAcademia.trim() : undefined;
  } catch {
    return NextResponse.json({ success: false, error: 'corpo inválido' }, { status: 400 });
  }

  if (!codigoAcademia) {
    return NextResponse.json({ success: false, error: 'codigoAcademia é obrigatório' }, { status: 400 });
  }

  let academia: ConsultarAcademiaPublicaResponse;
  try {
    academia = await api.get<ConsultarAcademiaPublicaResponse>(
      `/consultar-academia/${encodeURIComponent(codigoAcademia)}`
    );
  } catch (error) {
    if (error instanceof SpuriApiError && error.status === 404) {
      console.warn(`[academia-cadastro-notificacao] codigoAcademia não encontrado: ${codigoAcademia}`);
    } else {
      console.error('[academia-cadastro-notificacao] falha ao consultar academia:', error);
    }
    // Nunca informa ao chamador anônimo se o código existe ou não além do
    // que o próprio endpoint público de consulta já revelaria.
    return NextResponse.json({ success: true, sent: 0, failed: 0 });
  }

  let sent = 0;
  let failed = 0;
  for (const admin of admins) {
    const resultado = await emailService.sendAcademiaCadastradaAdminEmail(admin.email, admin.nome, {
      nome: academia.nome,
      codigoAcademia: academia.codigo_academia,
      type: academia.type,
      nivel: academia.nivel,
      provincia: academia.provincia,
    });
    if (resultado.success) {
      sent += 1;
    } else {
      failed += 1;
      console.error(`[academia-cadastro-notificacao] falha ao notificar ${admin.email}:`, resultado.error);
    }
  }

  return NextResponse.json({ success: true, sent, failed });
}
