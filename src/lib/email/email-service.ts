// lib/email/email-service.ts

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
  }>;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// ============================================================================
// DESIGN SYSTEM DO E-MAIL
// ----------------------------------------------------------------------------
// Tokens espelhados a partir da própria plataforma, para os e-mails
// transacionais partilharem a mesma identidade visual do site e do logótipo:
//
//  - brandBlue (#465FFF)  → cor de interação real da app (botões, links,
//    badges). Confirmada no código-fonte de TrilhaAnimation.tsx
//    (`var(--color-brand-500, #465fff)`).
//  - logoBlue (#0873BD) e navy (#172741) → amostradas diretamente dos
//    ficheiros do logótipo (o azul do "pin" e o navy do wordmark "Spuri").
//    Propositadamente NÃO se pinta o logótipo com a cor de interação da UI —
//    o logótipo é reproduzido fielmente, tal como a marca fornece.
//  - Restantes tons (cinzas/warning) seguem a mesma escala usada nos
//    componentes já existentes (Badge, Alert, cards `rounded-2xl`/`3xl`,
//    `border-gray-200`, etc.).
//
// Se o brand-500 da app alguma vez mudar, basta atualizar `theme.brandBlue`
// abaixo — todos os templates usam esta única fonte de verdade.
// ============================================================================

const theme = {
  brand50: '#ECF3FF',
  brand100: '#DDE9FF',
  brandBlue: '#465FFF', // brand-500 da plataforma
  brandBlueDark: '#3641F5', // brand-600 (tom mais escuro para texto/links)
  logoBlue: '#0873BD', // azul do "pin" do logótipo
  navy: '#172741', // cor do wordmark "Spuri"
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F2F4F7',
  gray200: '#E4E7EC',
  gray400: '#98A2B3',
  gray500: '#667085',
  gray700: '#344054',
  warning50: '#FFFAEB',
  warning200: '#FEDF89',
  warning700: '#B54708',
  warningText: '#8B5109',
} as const;

const FONT_STACK =
  "'Outfit','Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif";
const MONO_STACK = "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";

/**
 * URL absoluto do ícone do logótipo, otimizado para e-mail (PNG raster —
 * SVG tem suporte inconsistente em clientes como o Outlook desktop).
 *
 * Adicione o ficheiro `spuri-logo-email.png` (incluído junto com este
 * ficheiro) em `/public/images/email/` no projeto.
 */
function getLogoUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || '';
  return `${base}/images/email/spuri-logo-email.png`;
}

/** Escapa HTML em valores potencialmente vindos do utilizador (nome, senha). */
function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderButton(href: string, label: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto 0;">
    <tr>
      <td style="border-radius:12px; background-color:${theme.brandBlue};">
        <a href="${href}" target="_blank"
           style="display:inline-block; padding:14px 34px; font-family:${FONT_STACK}; font-size:15px; font-weight:600; color:${theme.white} !important; text-decoration:none; border-radius:12px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

function renderPill(label: string): string {
  return `<span style="display:inline-block; padding:6px 14px; border-radius:999px; background-color:${theme.warning50}; border:1px solid ${theme.warning200}; font-family:${FONT_STACK}; font-size:12px; font-weight:600; color:${theme.warning700};">${label}</span>`;
}

function renderAlert(opts: { tone: 'warning' | 'brand'; title: string; html: string }): string {
  const { tone, title, html } = opts;
  const bg = tone === 'warning' ? theme.warning50 : theme.brand50;
  const border = tone === 'warning' ? theme.warning200 : theme.brand100;
  const titleColor = tone === 'warning' ? theme.warning700 : theme.brandBlueDark;
  const textColor = tone === 'warning' ? theme.warningText : theme.gray700;
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="spuri-alert" style="margin-top:16px; border-radius:16px; background-color:${bg}; border:1px solid ${border};">
    <tr>
      <td style="padding:16px 20px;">
        <p style="margin:0 0 4px; font-family:${FONT_STACK}; font-size:13px; font-weight:700; color:${titleColor};">${title}</p>
        <div style="font-family:${FONT_STACK}; font-size:13px; line-height:1.65; color:${textColor};">${html}</div>
      </td>
    </tr>
  </table>`;
}

/**
 * Invólucro (header + footer) partilhado por todos os e-mails transacionais.
 * Mantém o cabeçalho com o logótipo, a barra de destaque com o gradiente
 * entre os dois azuis da marca, e o rodapé com os dados de contacto reais
 * do site (mesma cópia usada em LandingContent.tsx).
 */
function renderEmailShell(opts: { preheader: string; title: string; bodyHtml: string }): string {
  const { preheader, title, bodyHtml } = opts;
  const year = new Date().getFullYear();
  const logoUrl = getLogoUrl();

  return `<!DOCTYPE html>
<html lang="pt-AO">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${title}</title>
<!--[if mso]>
<style>table{border-collapse:collapse;}</style>
<![endif]-->
<style>
  @media only screen and (max-width: 620px) {
    .spuri-card { border-radius: 18px !important; }
    .spuri-px { padding-left: 22px !important; padding-right: 22px !important; }
    .spuri-h1 { font-size: 21px !important; }
    .spuri-pass { font-size: 22px !important; }
  }
  @media (prefers-color-scheme: dark) {
    .spuri-bg { background-color: #0C111D !important; }
    .spuri-card { background-color: #101828 !important; border-color: #1D2939 !important; }
    .spuri-header, .spuri-footer { background-color: #101828 !important; border-color: #1D2939 !important; }
    .spuri-heading, .spuri-brandname { color: #F5F7FA !important; }
    .spuri-body-text { color: #CDD5DF !important; }
    .spuri-muted { color: #98A2B3 !important; }
    .spuri-mono-box, .spuri-alert, .spuri-pass-box { background-color: #16202E !important; border-color: #1D2939 !important; }
    .spuri-mono-box a { color: #A9C1FF !important; }
    .spuri-pass { color: #F5F7FA !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:${theme.gray50}; -webkit-text-size-adjust:100%;">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${theme.gray50};">
    ${preheader}${'&#8199;&zwnj;'.repeat(60)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="spuri-bg" style="background-color:${theme.gray50};">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="spuri-card" style="width:100%; max-width:600px; background-color:${theme.white}; border-radius:24px; border:1px solid ${theme.gray200};">

          <tr>
            <td style="border-radius:24px 24px 0 0; height:5px; line-height:5px; font-size:0; background-color:${theme.brandBlue}; background-image:linear-gradient(90deg, ${theme.logoBlue}, ${theme.brandBlue});">&nbsp;</td>
          </tr>

          <tr>
            <td class="spuri-header spuri-px" style="padding: 30px 40px 22px; text-align:center; border-bottom:1px solid ${theme.gray100};">
              <img src="${logoUrl}" width="34" height="47" alt="Spuri" style="display:block; margin:0 auto 8px; border:0;" />
              <span class="spuri-brandname" style="font-family:${FONT_STACK}; font-size:18px; font-weight:700; color:${theme.navy}; letter-spacing:-0.01em;">Spuri</span>
            </td>
          </tr>

          <tr>
            <td class="spuri-px" style="padding: 40px;">
              ${bodyHtml}
            </td>
          </tr>

          <tr>
            <td class="spuri-footer spuri-px" style="background-color:${theme.gray50}; padding: 26px 40px; text-align:center; border-top:1px solid ${theme.gray100}; border-radius:0 0 24px 24px;">
              <p class="spuri-brandname" style="margin:0 0 4px; font-family:${FONT_STACK}; font-size:13px; font-weight:600; color:${theme.navy};">Spuri</p>
              <p class="spuri-muted" style="margin:0 0 10px; font-family:${FONT_STACK}; font-size:12px; color:${theme.gray500};">Confiança e eficiência na gestão académica.</p>
              <p style="margin:0; font-family:${FONT_STACK}; font-size:12px;">
                <a href="mailto:spuriartipan@gmail.com" style="color:${theme.brandBlue} !important; text-decoration:none;">spuriartipan@gmail.com</a>
              </p>
              <p class="spuri-muted" style="margin:14px 0 0; font-family:${FONT_STACK}; font-size:11px; color:${theme.gray400};">© ${year} Spuri. Todos os direitos reservados.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;

  /**
   * Inicializa o serviço de e-mail com as configurações do Gmail
   */
  initialize(config?: EmailConfig) {
    const emailConfig: EmailConfig = config || {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true', // true para 465, false para outros
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '', // App Password do Gmail
      },
    };

    this.config = emailConfig;

    // Configuração do transporter com opções para desenvolvimento
    this.transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.auth.user,
        pass: emailConfig.auth.pass,
      },
      // Aceitar certificados auto-assinados em desenvolvimento
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });
  }

  /**
   * Verifica se o serviço está configurado corretamente
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      throw new Error('Email service not initialized. Call initialize() first.');
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Envia um e-mail
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter) {
      return {
        success: false,
        error: 'Email service not initialized. Call initialize() first.',
      };
    }

    if (!this.config?.auth.user) {
      return {
        success: false,
        error: 'Email sender not configured. Check EMAIL_USER environment variable.',
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"Spuri" <${this.config.auth.user}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Template para e-mail de verificação
   */
  async sendVerificationEmail(to: string, token: string, userName: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verificar-email/${token}`;
    const safeName = escapeHtml(userName);

    const bodyHtml = `
      <p style="margin:0 0 6px; font-family:${FONT_STACK}; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:${theme.brandBlue};">Verificação de e-mail</p>
      <h1 class="spuri-h1 spuri-heading" style="margin:0 0 16px; font-family:${FONT_STACK}; font-size:24px; line-height:1.3; font-weight:700; color:${theme.navy};">Confirme o seu e-mail</h1>
      <p class="spuri-body-text" style="margin:0; font-family:${FONT_STACK}; font-size:15px; line-height:1.65; color:${theme.gray700};">
        Olá, <strong style="color:${theme.navy};">${safeName}</strong>! Obrigado por se registrar no Spuri.
        Para complementar o seu cadastro, precisamos verificar o seu endereço de e-mail.
      </p>

      <div style="text-align:center;">${renderButton(verificationUrl, 'Verificar E-mail')}</div>

      <p class="spuri-muted" style="margin:28px 0 8px; font-family:${FONT_STACK}; font-size:13px; color:${theme.gray500};">
        Se o botão não funcionar, copie e cole este link no navegador:
      </p>
      <p class="spuri-mono-box" style="margin:0; padding:12px 16px; background-color:${theme.gray50}; border:1px solid ${theme.gray100}; border-radius:10px;">
        <a href="${verificationUrl}" style="font-family:${MONO_STACK}; font-size:12px; word-break:break-all; color:${theme.brandBlueDark} !important; text-decoration:none;">${verificationUrl}</a>
      </p>

      <div style="margin-top:20px; text-align:center;">${renderPill('Este link expira em 24 horas')}</div>

      <p class="spuri-muted" style="margin:24px 0 0; font-family:${FONT_STACK}; font-size:12px; line-height:1.6; color:${theme.gray500}; text-align:center;">
        Se você não solicitou esta verificação, por favor ignore este e-mail.
      </p>
    `;

    const html = renderEmailShell({
      preheader: 'Confirme o seu e-mail para ativar por completo a sua conta Spuri.',
      title: 'Verificação de E-mail - Spuri',
      bodyHtml,
    });

    return this.sendEmail({
      to,
      subject: 'Verificação de E-mail - Spuri',
      html,
      text: `Olá ${userName}! Para verificar seu e-mail, acesse: ${verificationUrl}\n\nEste link expira em 24 horas.\n\nSe você não solicitou esta verificação, por favor ignore este e-mail.`,
    });
  }

  /**
   * Template para e-mail de recuperação de senha
   * Inclui a senha padrão gerada pelo backend
   */
  async sendPasswordResetEmail(
    to: string,
    token: string,
    userName: string,
    senhaPadrao: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/recuperar-senha/${token}`;
    const safeName = escapeHtml(userName);
    const safePassword = escapeHtml(senhaPadrao);

    const bodyHtml = `
      <p style="margin:0 0 6px; font-family:${FONT_STACK}; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:${theme.brandBlue};">Recuperação de senha</p>
      <h1 class="spuri-h1 spuri-heading" style="margin:0 0 16px; font-family:${FONT_STACK}; font-size:24px; line-height:1.3; font-weight:700; color:${theme.navy};">A sua senha foi redefinida</h1>
      <p class="spuri-body-text" style="margin:0; font-family:${FONT_STACK}; font-size:15px; line-height:1.65; color:${theme.gray700};">
        Olá, <strong style="color:${theme.navy};">${safeName}</strong>! Sua senha foi resetada com sucesso. Geramos uma nova senha temporária para a sua conta.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="spuri-pass-box" style="margin-top:24px; border-radius:16px; background-color:${theme.brand50}; border:1px solid ${theme.brand100};">
        <tr>
          <td style="padding:22px; text-align:center;">
            <p style="margin:0 0 8px; font-family:${FONT_STACK}; font-size:12px; font-weight:600; color:${theme.brandBlueDark};">Sua senha temporária</p>
            <p class="spuri-pass" style="margin:0; font-family:${MONO_STACK}; font-size:26px; font-weight:700; letter-spacing:0.05em; color:${theme.navy}; word-break:break-all;">${safePassword}</p>
          </td>
        </tr>
      </table>

      <div style="text-align:center;">${renderButton(resetUrl, 'Ir para Alteração de Senha')}</div>

      ${renderAlert({
        tone: 'warning',
        title: '⚠️ Importante',
        html: `Por motivos de segurança, altere esta senha imediatamente após fazer login. Acesse seu perfil e vá em <strong>&ldquo;Alterar Senha&rdquo;</strong>.`,
      })}

      ${renderAlert({
        tone: 'brand',
        title: '🔒 Dicas de Segurança',
        html: `Nunca compartilhe sua senha com ninguém. Use uma senha forte com letras, números e símbolos. Não use a mesma senha em diferentes serviços.`,
      })}

      <p class="spuri-muted" style="margin:24px 0 0; font-family:${FONT_STACK}; font-size:12px; line-height:1.6; color:${theme.gray500}; text-align:center;">
        Se você não solicitou a recuperação de senha, entre em contato conosco imediatamente em
        <a href="mailto:spuriartipan@gmail.com" style="color:${theme.brandBlue} !important;">spuriartipan@gmail.com</a>.
      </p>
    `;

    const html = renderEmailShell({
      preheader: 'Geramos uma nova senha temporária para a sua conta Spuri. Consulte com segurança dentro do e-mail.',
      title: 'Senha Resetada - Spuri',
      bodyHtml,
    });

    const textContent = `
Olá ${userName}!

Sua senha foi resetada com sucesso.

SENHA TEMPORÁRIA: ${senhaPadrao}

IMPORTANTE: Altere esta senha imediatamente após fazer login por motivos de segurança.

Você pode acessar a página de alteração de senha através deste link:
${resetUrl}

Se você não solicitou esta recuperação, entre em contato conosco imediatamente.

---
© ${new Date().getFullYear()} Spuri - Todos os direitos reservados
    `;

    return this.sendEmail({
      to,
      subject: 'Senha Resetada - Spuri',
      html,
      text: textContent,
    });
  }

}

// Singleton instance
export const emailService = new EmailService();
