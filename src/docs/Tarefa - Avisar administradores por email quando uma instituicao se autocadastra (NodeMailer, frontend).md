---
criado: 09-09-2026
origem: Fredy + Claude (orquestração)
status: pronto para execução pelo Codex
orquestrado_e_pre_testado_por: Claude
depende_de: nenhuma mudança pendente no backend — a tarefa "92 — Avisar por email admins com permissão de ativação sempre que uma academia se autocadastra" (spuri-backend) já está implementada e não precisa de nenhum ajuste adicional para esta tarefa funcionar
validado_contra: Node 22 + Next.js 16 (Turbopack) reais, `tsc --noEmit`, `npm run lint` (0 problemas novos vs. baseline), e um teste end-to-end real (servidor Next.js real + mock do backend) cobrindo os 4 fluxos da rota nova
---

# Tarefa — Avisar administradores por email quando uma instituição se autocadastra (via NodeMailer/frontend, não EmailJS)

## Prompt recomendado para executar esta tarefa

> Aplique exatamente o que está descrito neste documento (3 diffs pontuais + 1 arquivo novo), na ordem das seções. Não replaneje nem redesenhe nada do que já está decidido — as decisões da seção 2 (por que NodeMailer em vez de EmailJS, por que a lista de admins é estática, por que o conteúdo do email vem de uma consulta ao backend e nunca do formulário) são definitivas. Ao final, rode `npx tsc --noEmit` e `npm run lint`, confirme que não há nenhum erro/warning novo além dos já existentes no projeto (2 erros/8 warnings de baseline, nenhum nos arquivos desta tarefa), e confira o checklist da seção 4. Nenhuma mudança é necessária no repositório `spuri-backend` para esta tarefa — ele já está pronto e implantado (tarefa 92).

## 1. Contexto (investigação já feita — não repetir)

### 1.1 Por que isto existe: limite do plano gratuito do EmailJS

A tarefa 92 (spuri-backend) implementou o aviso via EmailJS (mesmo serviço já usado pelo backend para verificação de email e reset de senha), mas ao tentar criar o template dedicado no dashboard do EmailJS, a conta já está no limite de templates do plano gratuito (2 templates já em uso: recuperação de senha e verificação de email) — "You have reached your subscription limit. Please upgrade to unlock this feature."

Em vez de pagar o upgrade agora, o aviso passa a ser enviado pelo **frontend**, reaproveitando um sistema que **já existe neste repositório e já está em produção**: `src/lib/email/email-service.ts`, baseado em NodeMailer/SMTP (Gmail), sem limite de "templates" (o HTML é só código, gerado na hora). Confirmei isso investigando o próprio backend Go: as rotas `POST /email/gerar-token/verificacao` e `POST /email/gerar-token/recuperacao` têm o comentário explícito *"gera o token ... e o RETORNA ao frontend"* — ou seja, o backend **não envia mais** esses emails; quem envia é este frontend, via `src/app/api/verificar-email/route.ts` e `src/app/api/recuperar-senha/route.ts`, que chamam `emailService.sendVerificationEmail`/`sendPasswordResetEmail`. Este projeto já vinha migrando de EmailJS para este sistema antes mesmo desta tarefa — a tarefa 93 só segue o mesmo caminho.

**O backend (tarefa 92) não precisa de nenhuma mudança.** Ele continua com `AdminProjection.GetAdminsParaNotificarNovaAcademia` + `EmailService.SendAcademiaCadastradaEmail` (EmailJS) implementados e testados — só ficam inertes (log apenas, sem enviar nada) enquanto `EMAILJS_TEMPLATE_ACADEMIA_CADASTRADA` não for configurada. Os dois caminhos (backend/EmailJS e frontend/NodeMailer) convivem sem conflito: o dia que o plano do EmailJS for resolvido (upgrade, ou uma conta EmailJS nova), o caminho do backend pode ser ativado só configurando a env var — nenhum código muda.

### 1.2 Onde o autocadastro acontece neste repositório

O formulário público de autocadastro de academia (que chama `POST /academia/cadastro` no backend Go) já vive **neste mesmo repositório**, em `src/app/(full-width-pages)/(auth)/instituicoes/cadastrar/InstituicaoCadastroPublico.tsx` — não é um site separado. `handleFormSubmit` já recebe a resposta de sucesso do backend (`result.codigo_academia`, `result.aviso`) antes de mostrar a tela de sucesso (`SuccessState`). É logo ali, depois do `setResultado(...)`, que a notificação é acionada.

### 1.3 Decisão de segurança: o navegador nunca decide o conteúdo do email

Este é o ponto mais importante da tarefa. A página de cadastro é **pública, sem login** — qualquer um pode abrir o DevTools e chamar a rota nova diretamente com qualquer corpo. Por isso, a rota nova **nunca usa o texto que vier do POST do navegador para montar o email**: o navegador só informa **qual** `codigoAcademia` notificar. A rota então consulta `GET {API_URL}/consultar-academia/:codigo` — endpoint já existente no backend Go, **público** (`middleware.OptionalAuthMiddleware()`, permite chamada anônima), que devolve `nome, type, nivel, codigo_academia, provincia` (sem autenticação, esses campos já são públicos: é o mesmo endpoint que a busca de academias do site usa). Só se o código existir de verdade é que um email é enviado, e todo o conteúdo (nome, tipo, nível, província) vem **desta consulta**, nunca do corpo do POST original.

Isso fecha dois problemas de uma vez:
- **Conteúdo forjado**: sem essa verificação, qualquer um poderia mandar um `nome` arbitrário (ofensivo, phishing, etc.) e o email sairia com esse texto, enviado pela conta Gmail real do projeto.
- **Spam de volume ilimitado e sem fricção**: sem essa verificação, qualquer um poderia chamar a rota repetidamente com dados totalmente inventados, sem nenhuma barreira (nem precisa existir uma academia de verdade). Com a verificação, o código precisa corresponder a uma academia real já cadastrada — o volume de abuso possível fica limitado ao número de academias reais que existem, e o conteúdo enviado é sempre genuíno.

Residual conhecido, aceito conscientemente por ora (ver seção 5 — "não é seguro contra tudo, é seguro o suficiente para o estágio atual"): a consulta não confirma que o `status` da academia é exatamente `inativo` (o endpoint anônimo não devolve `status` — só devolve esse campo para quem está autenticado). Ou seja, tecnicamente dá para forçar o reenvio do aviso para uma academia que já foi ativada há tempos, usando um código real. O conteúdo continua sendo sempre genuíno (nome/tipo/nível/província reais), então o pior caso é "um admin recebe um aviso repetido/desatualizado sobre uma academia real", não vazamento de dados nem conteúdo malicioso. Ver seção 5 para o caminho de reforço futuro, caso vire um problema de verdade.

### 1.4 Decisão de design: lista de admins estática, não dinâmica

O backend não tem (e propositalmente esta tarefa não cria) nenhum endpoint público que liste nome+email de administradores — isso seria uma exposição pública de dados pessoais de administradores por um endpoint sem autenticação nem captcha (colheita de email para spam/phishing). Em vez disso, a lista de quem recebe o aviso é uma **env var estática** só de servidor (nunca prefixada com `NEXT_PUBLIC_`, então nunca vai para o bundle do navegador): `ADMINS_NOTIFICACAO_ACADEMIA`, formato `"Nome Um:email1@x.com,Nome Dois:email2@x.com"`.

Trade-off consciente: essa lista **não se atualiza sozinha** quando um admin novo é promovido a `adm`/`fpp` ou quando um é desativado — precisa ser mantida manualmente em quem configura o deploy. Isso é aceitável para o estágio atual (poucos admins, muda raramente) e evita o problema de exposição pública descrito acima. Ver seção 5 para o caminho de reforço futuro.

### 1.5 Por que NIF não aparece neste email (mas aparece no do backend/EmailJS)

O endpoint público `GET /consultar-academia/:codigo` não devolve NIF para chamadas anônimas (só nome, type, nivel, codigo_academia, provincia). Em vez de criar um jeito de expor NIF publicamente só para isto, o email desta tarefa simplesmente não inclui NIF — nome, código, tipo, nível e província já bastam para o admin localizar e analisar a instituição no painel. (O caminho do backend/EmailJS, tarefa 92, inclui NIF porque lá os dados vêm direto do banco, sem essa limitação de endpoint público.)

## 2. Diffs a aplicar, nesta ordem

Todos os diffs abaixo foram extraídos com `git diff` a partir de uma cópia limpa deste repositório após aplicar e validar as mudanças, e reconferidos aplicando-os com `git apply` contra um clone limpo antes de fechar este documento.

### Arquivo 1/4 — `src/lib/email/email-service.ts` (novo método na classe `EmailService`)

```diff
--- a/src/lib/email/email-service.ts
+++ b/src/lib/email/email-service.ts
@@ -434,6 +434,69 @@ Se você não solicitou esta recuperação, entre em contato conosco imediatamen
     });
   }
 
+  /**
+   * Template para aviso a administradores: uma instituição acabou de se
+   * autocadastrar (POST /academia/cadastro no backend Go) e está pendente
+   * de análise/ativação.
+   *
+   * Segurança: todos os campos de `academia` devem vir já verificados
+   * contra o backend (GET /consultar-academia/:codigo) por quem chama este
+   * método — nunca passe aqui texto ainda não verificado vindo diretamente
+   * do visitante que preencheu o formulário público de cadastro. Ver
+   * src/app/api/academia-cadastro-notificacao/route.ts.
+   */
+  async sendAcademiaCadastradaAdminEmail(
+    to: string,
+    adminNome: string,
+    academia: { nome: string; codigoAcademia: string; type: string; nivel: string; provincia: string }
+  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
+    const painelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/academias`;
+    const safeAdminNome = escapeHtml(adminNome);
+    const safeNome = escapeHtml(academia.nome);
+    const safeCodigo = escapeHtml(academia.codigoAcademia);
+    const safeType = escapeHtml(academia.type);
+    const safeNivel = escapeHtml(academia.nivel);
+    const safeProvincia = escapeHtml(academia.provincia);
+
+    const bodyHtml = `
+      <p style="margin:0 0 6px; font-family:${FONT_STACK}; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:${theme.brandBlue};">Novo cadastro pendente</p>
+      <h1 class="spuri-h1 spuri-heading" style="margin:0 0 16px; font-family:${FONT_STACK}; font-size:24px; line-height:1.3; font-weight:700; color:${theme.navy};">Uma instituição acabou de se cadastrar</h1>
+      <p class="spuri-body-text" style="margin:0; font-family:${FONT_STACK}; font-size:15px; line-height:1.65; color:${theme.gray700};">
+        Olá, <strong style="color:${theme.navy};">${safeAdminNome}</strong>! A instituição <strong style="color:${theme.navy};">${safeNome}</strong> concluiu o autocadastro no Spuri e está com a conta <strong>inativa</strong>, aguardando a sua análise.
+      </p>
+
+      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px; border-radius:16px; background-color:${theme.gray50}; border:1px solid ${theme.gray100};">
+        <tr>
+          <td style="padding:20px 22px;">
+            <p style="margin:0 0 6px; font-family:${FONT_STACK}; font-size:13px; color:${theme.gray700};"><strong>Código:</strong> ${safeCodigo}</p>
+            <p style="margin:0 0 6px; font-family:${FONT_STACK}; font-size:13px; color:${theme.gray700};"><strong>Tipo:</strong> ${safeType}</p>
+            <p style="margin:0 0 6px; font-family:${FONT_STACK}; font-size:13px; color:${theme.gray700};"><strong>Nível:</strong> ${safeNivel}</p>
+            <p style="margin:0; font-family:${FONT_STACK}; font-size:13px; color:${theme.gray700};"><strong>Província:</strong> ${safeProvincia}</p>
+          </td>
+        </tr>
+      </table>
+
+      <div style="text-align:center;">${renderButton(painelUrl, 'Analisar no Painel')}</div>
+
+      <p class="spuri-muted" style="margin:24px 0 0; font-family:${FONT_STACK}; font-size:12px; line-height:1.6; color:${theme.gray500}; text-align:center;">
+        Acesse o painel para revisar os dados e decidir se a instituição deve ser ativada.
+      </p>
+    `;
+
+    const html = renderEmailShell({
+      preheader: `${academia.nome} concluiu o autocadastro e está pendente de análise.`,
+      title: 'Nova instituição cadastrada - Spuri',
+      bodyHtml,
+    });
+
+    return this.sendEmail({
+      to,
+      subject: `Nova instituição cadastrada: ${academia.nome}`,
+      html,
+      text: `Olá ${adminNome}!\n\nA instituição ${academia.nome} (código ${academia.codigoAcademia}, ${academia.type}, ${academia.nivel}, província ${academia.provincia}) concluiu o autocadastro no Spuri e está inativa, aguardando análise.\n\nAcesse o painel para revisar: ${painelUrl}`,
+    });
+  }
+
 }
 
 // Singleton instance
```

Nenhum import novo é necessário — `escapeHtml`, `renderButton`, `renderEmailShell`, `theme`, `FONT_STACK` já existem neste arquivo (usados pelos métodos `sendVerificationEmail`/`sendPasswordResetEmail` logo acima).

### Arquivo 2/4 — `src/app/(full-width-pages)/(auth)/instituicoes/cadastrar/InstituicaoCadastroPublico.tsx` (aciona o aviso após o cadastro)

```diff
--- a/src/app/(full-width-pages)/(auth)/instituicoes/cadastrar/InstituicaoCadastroPublico.tsx
+++ b/src/app/(full-width-pages)/(auth)/instituicoes/cadastrar/InstituicaoCadastroPublico.tsx
@@ -11,6 +11,23 @@ import type { CadastroAcademiaPublicaRequest } from "@/types/api";
 
 interface ResultadoCadastroPublico { codigo_academia: string; nome: string; aviso: string; }
 
+/**
+ * Aciona (melhor esforço, sem bloquear a UI) o aviso por email aos
+ * administradores com permissão de ativação sobre esta nova instituição
+ * pendente de análise. Nunca aguardado (sem await no chamador) e qualquer
+ * falha aqui é só logada — o cadastro em si já foi concluído com sucesso
+ * antes desta chamada.
+ */
+function notificarAdminsCadastroAcademia(codigoAcademia: string) {
+  fetch("/api/academia-cadastro-notificacao", {
+    method: "POST",
+    headers: { "Content-Type": "application/json" },
+    body: JSON.stringify({ codigoAcademia }),
+  }).catch((error) => {
+    console.error("[cadastro-publico] falha ao acionar aviso aos administradores:", error);
+  });
+}
+
 function SuccessState({ resultado, onCadastrarOutra }: { resultado: ResultadoCadastroPublico; onCadastrarOutra: () => void; }) {
   return (
     <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center space-y-4">
@@ -37,7 +54,10 @@ export default function InstituicaoCadastroPublico() {
     if (!senha) throw new Error("A senha é obrigatória para o cadastro público de academia.");
 
     const result = await executarCadastro({ ...payload, senha } as CadastroAcademiaPublicaRequest);
-    if (result) setResultado({ codigo_academia: result.codigo_academia, nome: payload.nome, aviso: result.aviso });
+    if (result) {
+      setResultado({ codigo_academia: result.codigo_academia, nome: payload.nome, aviso: result.aviso });
+      notificarAdminsCadastroAcademia(result.codigo_academia);
+    }
   };
   return (
     <div className="flex min-h-screen w-full flex-1 justify-center overflow-y-auto bg-gray-50 px-4 py-6 dark:bg-gray-950 lg:w-1/2 lg:px-8">
```

Note que a chamada **não usa `await`** — é intencional (ver seção 1.3 e docstring): nunca deve atrasar nem quebrar a transição para a tela de sucesso do cadastro.

### Arquivo 3/4 — `.env.example` (documentação da variável nova)

```diff
--- a/.env.example
+++ b/.env.example
@@ -24,3 +24,10 @@ EMAIL_PORT=587
 EMAIL_SECURE=false
 EMAIL_USER=
 EMAIL_PASS=
+
+# Lista estática (não vem do banco) de administradores avisados por email
+# sempre que uma instituição conclui o autocadastro público e fica pendente
+# de análise/ativação (ver src/app/api/academia-cadastro-notificacao).
+# Formato: "Nome Um:email1@x.com,Nome Dois:email2@x.com". Vazio = nenhum
+# aviso é enviado (o cadastro em si continua funcionando normalmente).
+ADMINS_NOTIFICACAO_ACADEMIA=
```

### Arquivo NOVO 4/4 — `src/app/api/academia-cadastro-notificacao/route.ts`

Rota Next.js nova. Crie com o conteúdo exato abaixo:

```ts
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
```

`api`/`SpuriApiError` vêm de `@/lib/api/client`, já usado do mesmo jeito (server-side, dentro de rotas `route.ts`) em `src/app/api/recuperar-senha/route.ts` e `src/app/api/verificar-email/route.ts` — não é uma importação nova em termos de padrão, só um arquivo novo usando algo já comprovado em produção.

## 3. Configuração necessária fora do código (deploy)

1. **`EMAIL_USER`/`EMAIL_PASS`** — se a verificação de email e o reset de senha já funcionam em produção hoje, essas já estão configuradas; nenhuma ação extra aqui.
2. **`ADMINS_NOTIFICACAO_ACADEMIA`** — nova, precisa ser definida em produção com a lista real de administradores a avisar, formato `"Nome Um:email1@x.com,Nome Dois:email2@x.com"`. **Sem isso, a rota nova roda normalmente mas não envia nada** (loga `ADMINS_NOTIFICACAO_ACADEMIA não configurado` e retorna `sent:0`) — não quebra o cadastro, só fica silenciosa.
3. Nenhuma mudança de configuração no `spuri-backend` é necessária.

## 4. Checklist de aceitação

- [ ] `EmailService.sendAcademiaCadastradaAdminEmail(to, adminNome, academia)` existe em `src/lib/email/email-service.ts`, com todos os campos de `academia` escapados via `escapeHtml` no HTML.
- [ ] `POST /api/academia-cadastro-notificacao` existe, recebe só `{ codigoAcademia }`, consulta `GET {API_URL}/consultar-academia/:codigo` antes de enviar qualquer email, e nunca usa texto vindo diretamente do corpo do POST para montar o conteúdo do email.
- [ ] Código inexistente (404 na consulta) → nenhum email é tentado, resposta `{success:true, sent:0, failed:0}`, sem expor ao chamador se o código existe ou não além do que a própria consulta pública já revela.
- [ ] `ADMINS_NOTIFICACAO_ACADEMIA` vazio/ausente → nenhum email é tentado, resposta `{success:true, sent:0, failed:0}`, cadastro nunca quebra.
- [ ] `InstituicaoCadastroPublico.tsx` chama `notificarAdminsCadastroAcademia` só depois de `setResultado(...)` (cadastro já confirmado como sucesso), **sem `await`**, e qualquer erro cai num `.catch` que só loga — nunca aparece para quem está se cadastrando.
- [ ] `ADMINS_NOTIFICACAO_ACADEMIA` documentada em `.env.example`, vazia por padrão.
- [ ] Nenhuma mudança no repositório `spuri-backend`.
- [ ] `npx tsc --noEmit` limpo.
- [ ] `npm run lint` sem nenhum problema novo além dos já existentes no projeto antes desta tarefa (na data deste documento: 2 erros em `verificar-email/[token]/page.tsx` e `Calendar.tsx`, 8 warnings de `react-hooks/exhaustive-deps`/`unused eslint-disable` em arquivos não relacionados — nenhum deles nos 4 arquivos desta tarefa).

## 5. Validação já feita (evidência real)

- **Ambiente**: Node 22.22.2, `npm install` completo (803 pacotes), num clone limpo do repositório.
- **`npx tsc --noEmit`**: limpo antes e depois das mudanças.
- **`npm run lint`**: exatamente os mesmos 2 erros / 8 warnings antes e depois das mudanças (mesmos arquivos, mesmas linhas) — confirmado tanto na minha cópia de trabalho quanto, de novo, num clone limpo com os diffs desta seção aplicados via `git apply --check` + `git apply` (aplicaram limpo os três, sem conflito de contexto).
- **`npm run build` não pôde ser validado neste ambiente**: o build de produção deste projeto falha ao tentar buscar a fonte "Outfit" do Google Fonts (`next/font/google`) porque o sandbox onde fiz a validação não tem acesso a `fonts.googleapis.com` — isso já falha *antes* de qualquer mudança minha (comprovei rodando o build na branch original, sem minhas mudanças, mesmo erro) e não tem relação com este código. `npx tsc --noEmit` já cobre a checagem de tipos que o build faria; se o seu ambiente tiver acesso normal à internet, rode `npm run build` mesmo assim para confirmar — deve passar.
- **Teste end-to-end real da rota nova**, com Next.js de verdade (`next dev`, Turbopack) e um servidor HTTP mínimo em Node fazendo o papel do backend Go (`GET /consultar-academia/LDA2026A001` → 200 com dados de teste; qualquer outro código → 404), sem SMTP configurado (`EMAIL_USER`/`EMAIL_PASS` vazios, para não depender de credenciais reais nem tentar uma conexão de rede de verdade — o próprio `EmailService.sendEmail` já teria um guard-clause preexistente pra esse caso, `"Email sender not configured"`, sem tentar nada por SMTP):
  - `POST` sem `codigoAcademia` → `400 {"success":false,"error":"codigoAcademia é obrigatório"}` ✅
  - `POST` com corpo que não é JSON válido → `400 {"success":false,"error":"corpo inválido"}` ✅
  - `POST` com `codigoAcademia` existente (`LDA2026A001`) → consultou o mock, tentou notificar os 2 admins configurados em `ADMINS_NOTIFICACAO_ACADEMIA` de teste, e falhou nos 2 exatamente pelo motivo esperado (`"Email sender not configured. Check EMAIL_USER environment variable."`, sem tentar nenhuma conexão de rede) → `200 {"success":true,"sent":0,"failed":2}` ✅ — os logs de erro por admin apareceram exatamente como o código previa.
  - `POST` com `codigoAcademia` inexistente (`NAOEXISTE`) → mock respondeu 404, rota logou o aviso de "não encontrado" e **não tentou enviar nada** → `200 {"success":true,"sent":0,"failed":0}` ✅
- **Função de parsing de `ADMINS_NOTIFICACAO_ACADEMIA` validada isoladamente** com 11 casos de borda (vazio, só espaços, espaços ao redor dos campos, vírgula dupla, vírgula final, entrada sem `:`, nome vazio, email vazio) — todos os 11 bateram com o esperado.

**O que não pôde ser testado neste ambiente, por não ter como acessar de verdade**: o envio real por SMTP (Gmail) e a renderização visual do email num cliente de email de verdade. O guard-clause `"Email sender not configured"` é código **preexistente**, já usado pelos métodos `sendVerificationEmail`/`sendPasswordResetEmail` que já rodam em produção — meu método novo (`sendAcademiaCadastradaAdminEmail`) usa exatamente o mesmo caminho (`this.sendEmail(...)`), então a mesma garantia de funcionamento se aplica. Recomendo, depois de configurar `ADMINS_NOTIFICACAO_ACADEMIA` com um email de teste real em ambiente de homologação, fazer um autocadastro de teste e conferir a caixa de entrada — isso está fora do que dá para automatizar/comprovar por aqui.

## 6. Reforços futuros (fora do escopo desta tarefa, registrados para não esquecer)

- Confirmar também que a academia está com `status = 'inativo'` antes de notificar (hoje não dá porque o endpoint público de consulta não devolve `status` para chamadas anônimas) — mitigaria o residual descrito na seção 1.3.
- Trocar a lista estática de admins (`ADMINS_NOTIFICACAO_ACADEMIA`) por algo dinâmico vindo do banco, se/quando existir um jeito de fazer isso sem expor publicamente nome+email de administradores (por exemplo, um endpoint autenticado por um segredo compartilhado entre backend e este frontend, chamado só server-to-server).
- Se o plano do EmailJS for resolvido (upgrade, ou nova conta), decidir se o caminho do backend (tarefa 92) volta a ser o principal, se os dois continuam coexistindo, ou se o caminho do frontend (esta tarefa) é descontinuado — nenhuma decisão foi tomada sobre isso, é só para não esquecer que a pendência existe.
