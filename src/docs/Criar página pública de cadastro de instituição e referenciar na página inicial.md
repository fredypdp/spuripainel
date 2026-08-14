---
criado: 2026-08-14 00:00
origem: solicitação do usuário
status: pendente
---

# Criar página pública de cadastro de instituição (reaproveitando o formulário de /academias/cadastrar) e referenciá-la na página inicial (pendente)

## Prompt recomendado para executar a atualização

Implemente exatamente o código especificado neste documento no repositório `spuripainel`. Este documento já foi validado de verdade neste ambiente: `npx tsc --noEmit` (checagem de tipos do projeto inteiro) e `npx eslint` em todos os arquivos tocados passaram sem nenhum erro ou aviso. Aplique os arquivos novos e os diffs exatamente como estão — não invente estrutura diferente, não misture a lógica do formulário com a lógica de cada página (o formulário em si vive só em `AcademiaCadastroForm.tsx`; cada página cuida apenas de autenticação/guarda, chamada ao serviço certo e tela de sucesso). Ao final, rode `npx tsc --noEmit`, `npx eslint .` e `npm run build`, e só então abra o PR.

## Contexto

### Parte 1 — Auditoria da Tarefa 32 (backend, `spuri-backend`)

Antes de iniciar esta tarefa, foi feita uma auditoria completa da implementação da Tarefa 32 (cadastro público de academia) no backend, comparando o commit mesclado (`9fdc55e`, PR #528) byte a byte contra a especificação original. **Resultado: implementação correta e completa**, sem nenhuma divergência, duplicação de símbolo, ou arquivo fora do escopo tocado. Não há nenhuma correção pendente no backend.

Isso significa que a rota `POST /academia/registo-publico` já está em produção, aceitando cadastro de academia sem autenticação, com status inicial sempre `"inativo"`, e um campo opcional `senha` (adicionado numa iteração seguinte da Tarefa 32) que permite à própria instituição definir a senha de acesso no momento do cadastro.

### Parte 2 — Investigação do frontend (`spuripainel`) para esta tarefa

O repositório foi clonado e lido diretamente. Principais descobertas:

1. **A página `/academias/cadastrar`** (`src/app/(painel)/academias/cadastrar/PageContent.tsx`) é a única página que já implementa o formulário completo de cadastro de academia. Ela é protegida por `useUserCookie`/`UnauthorizedAccess` (só `admin`) e chama `adminService.registrarAcademia`, que monta `FormData` e faz `POST /dominis/academia/register` com token — **não tem** o campo `senha` (a API nunca leu esse campo nesse endpoint, e deve continuar assim).
2. **Achado crítico de segurança de rotas**: `src/lib/route-guards.ts` define `ROUTE_PERMISSIONS` — **qualquer rota não listada explicitamente ali exige autenticação por padrão** (visitante não autenticado é redirecionado para `/`). Isso significa que a nova página pública **precisa** de uma entrada explícita com `allowedTypes: 'public'`, ou o `RouteGuard` (usado no layout `(full-width-pages)/(auth)/layout.tsx`) vai bloquear o próprio público de acessá-la.
3. **Precedente direto**: `/matricula` já é uma página pública equivalente, no mesmo grupo de rotas `(full-width-pages)/(auth)`, já registrada em `ROUTE_PERMISSIONS` como `'public'`, e seu serviço (`solicitacaoMatriculaService.criar`) já chama `api.postForm` **sem passar token** — é exatamente o padrão que o novo serviço público deve seguir. O wrapper visual (`<div className="... lg:w-1/2 ..."><div className="w-full max-w-4xl rounded-2xl border ...">`) também foi copiado desse precedente.
4. **Tipos existentes**: `CriarEscolaRequest`/`CriarUniversidadeRequest` (`src/types/api.ts`) não têm campo `senha` — foi necessário um tipo novo por interseção (`CadastroAcademiaPublicaRequest`), sem duplicar os campos existentes e sem tocar nesses dois tipos.
5. **Copy da landing page é copy aprovado**: `src/data/landingProfiles.ts` tem o comentário explícito *"Copy revista e aprovada ao longo do planeamento da página"*. Por isso, a referência à nova página de cadastro foi feita como um link secundário adicional, sem alterar nenhum texto de `cta`/`headline`/`href` já existente.

### Decisão de design: reaproveitamento do formulário

O formulário (campos, validação client-side, montagem do payload) foi extraído para um componente novo e compartilhado — `src/components/academia/AcademiaCadastroForm.tsx` — usado tanto pela página admin (`/academias/cadastrar`) quanto pela nova página pública (`/instituicoes/cadastrar`). Cada página continua responsável, por conta própria, pelo que É diferente entre os dois fluxos: guarda de autenticação, qual serviço de API chamar, e a tela de sucesso (o texto e a navegação pós-cadastro são diferentes: a página admin manda "Ver academias"/token já existe; a pública manda para "/login" e explica que a conta fica inativa até ativação).

**Limitação desta validação:** não foi possível rodar `npm run build` completo até o fim neste ambiente — o Turbopack tenta baixar a fonte "Outfit" de `fonts.googleapis.com` (usada em `src/app/layout.tsx`, não relacionada a esta tarefa) e esse domínio não está liberado na rede do sandbox de investigação (erro 403 do proxy de rede, não um erro de código). **Isso é uma limitação de ambiente, não do código desta tarefa** — `npx tsc --noEmit` (projeto inteiro) e `npx eslint` (todos os arquivos tocados) passaram 100% limpos, o que cobre toda a superfície de erros que este build adicionaria (tipos, imports, rotas). O Codex, que tem rede completa, deve conseguir rodar `npm run build` até o fim sem esse bloqueio — é obrigatório fazer essa checagem final antes do PR.

## Resumo executivo

| Item | Decisão | Resultado esperado |
| --- | --- | --- |
| Formulário compartilhado | Novo componente `src/components/academia/AcademiaCadastroForm.tsx` | Reaproveitado por `/academias/cadastrar` (admin) e pela nova `/instituicoes/cadastrar` (pública) |
| Nova página pública | `src/app/(full-width-pages)/(auth)/instituicoes/cadastrar/` (`page.tsx` + `InstituicaoCadastroPublico.tsx`) | Mesmo grupo de rotas e mesmo padrão visual de `/matricula` |
| Serviço de API novo | `academiaPublicaService.cadastrar` em `src/lib/api/services.ts` | Chama `POST /academia/registo-publico` sem token, igual a `solicitacaoMatriculaService.criar` |
| Tipos novos | `CadastroAcademiaPublicaRequest`/`CadastroAcademiaPublicaResponse` em `src/types/api.ts` | Não altera `CriarEscolaRequest`/`CriarUniversidadeRequest` existentes |
| Permissão de rota | Nova entrada `'public'` em `ROUTE_PERMISSIONS` (`src/lib/route-guards.ts`) | Sem isso, o `RouteGuard` bloquearia o público — checado e corrigido nesta tarefa |
| Página admin (`/academias/cadastrar`) | Refatorada para usar o formulário compartilhado | Comportamento e visual idênticos ao atual — mesma validação, mesmo `adminService.registrarAcademia`, mesma tela de sucesso |
| Campo `senha` | Só aparece no formulário quando `showSenhaField` (usado só na página pública) | Página admin continua sem esse campo |
| Página inicial (`/`) | Link secundário adicionado em `LandingContent.tsx`, visível para os 3 perfis institucionais | Copy aprovado (`cta`/`headline`/`href` em `landingProfiles.ts`) **não foi alterado** |
| Validação real | `npx tsc --noEmit` e `npx eslint` — 0 erros em todos os arquivos tocados | `npm run build` não pôde ser concluído no sandbox só por bloqueio de rede a `fonts.googleapis.com` (não relacionado ao código) |

---

# 1. Tipos novos — `src/types/api.ts`

## Objetivo

Adicionar os tipos de request/response do cadastro público, sem alterar `CriarEscolaRequest`/`CriarUniversidadeRequest`.

## Diff exato

```diff
diff --git a/src/types/api.ts b/src/types/api.ts
index f0dd3e8..d862246 100644
--- a/src/types/api.ts
+++ b/src/types/api.ts
@@ -119,6 +119,32 @@ export interface CriarUniversidadeRequest {
   cursos?: string[];
 }
 
+/**
+ * Cadastro público de academia (sem autenticação) — POST /academia/registo-publico.
+ * Mesmos campos de CriarEscolaRequest/CriarUniversidadeRequest, mais um campo
+ * `senha` opcional exclusivo deste fluxo: quem se autocadastra pode definir a
+ * própria senha; se omitido, a API usa o mesmo padrão do fluxo admin (o
+ * próprio código da academia). Não usar este tipo no fluxo administrativo
+ * (CriarEscolaRequest/CriarUniversidadeRequest continuam como estavam).
+ */
+export type CadastroAcademiaPublicaRequest = (CriarEscolaRequest | CriarUniversidadeRequest) & {
+  senha?: string;
+};
+
+export interface CadastroAcademiaPublicaResponse {
+  message: string;
+  codigo_academia: string;
+  data: {
+    id: string;
+    nome: string;
+    nif: string;
+    type: AcademiaType;
+    provincia: string;
+    codigo_academia: string;
+    status: string;
+  };
+  aviso: string;
+}
 
 export interface AnoLetivoItem {
   ano_letivo: string;
```

---

# 2. Novo serviço de API — `src/lib/api/services.ts`

## Objetivo

Adicionar `academiaPublicaService.cadastrar`, espelhando exatamente o padrão de `solicitacaoMatriculaService.criar` (rota pública, sem token).

## Diff exato

```diff
diff --git a/src/lib/api/services.ts b/src/lib/api/services.ts
index 7ede58c..478dc2e 100644
--- a/src/lib/api/services.ts
+++ b/src/lib/api/services.ts
@@ -7,6 +7,8 @@ import type {
   AuthResponse,
   CriarEscolaRequest,
   CriarUniversidadeRequest,
+  CadastroAcademiaPublicaRequest,
+  CadastroAcademiaPublicaResponse,
   LoginRequest,
   CriarEstudanteRequest,
   RegistrarNotasRequest,
@@ -420,6 +422,35 @@ export const solicitacaoMatriculaService = {
     ),
 };
 
+// =====================
+// CADASTRO PÚBLICO DE ACADEMIA (rota pública, sem token)
+// =====================
+
+export const academiaPublicaService = {
+  cadastrar: (data: CadastroAcademiaPublicaRequest) => {
+    const formData = new FormData();
+
+    Object.entries(data).forEach(([key, value]) => {
+      if (value === undefined || value === null) return;
+
+      if (typeof File !== 'undefined' && value instanceof File) {
+        formData.append(key, value);
+        return;
+      }
+
+      if (Array.isArray(value)) {
+        value.forEach((item) => formData.append(key, String(item)));
+        return;
+      }
+
+      formData.append(key, String(value));
+    });
+
+    // Rota pública — nenhum token é enviado, igual a solicitacaoMatriculaService.criar.
+    return api.postForm<CadastroAcademiaPublicaResponse>('/academia/registo-publico', formData);
+  },
+};
+
 // =====================
 // AUTH (rotas públicas)
 // =====================
```

## Escopo obrigatório

- Inserir logo após o bloco `solicitacaoMatriculaService` (mesma vizinhança de "serviços públicos sem token").
- **Não** passar `token` nem usar `tokenStorage.get()` nesta função — é o que garante que nenhum `Authorization` seja enviado, mesmo que o navegador tenha um token antigo guardado.

---

# 3. Permissão de rota pública — `src/lib/route-guards.ts`

## Objetivo

Registrar `/instituicoes/cadastrar` como rota pública. **Este passo é obrigatório** — sem ele, o `RouteGuard` (usado em `(full-width-pages)/(auth)/layout.tsx`) redireciona qualquer visitante não autenticado para `/`, tornando a página nova inacessível ao público que ela deveria atender.

## Diff exato

```diff
diff --git a/src/lib/route-guards.ts b/src/lib/route-guards.ts
index b6b45b3..40b72ce 100644
--- a/src/lib/route-guards.ts
+++ b/src/lib/route-guards.ts
@@ -28,6 +28,11 @@ export const ROUTE_PERMISSIONS: RouteConfig[] = [
     allowedTypes: 'public',
     redirectIfUnauthorized: '/',
   },
+  {
+    path: '/instituicoes/cadastrar',
+    allowedTypes: 'public',
+    redirectIfUnauthorized: '/',
+  },
   {
     path: '/dominis/esqueci-senha',
     allowedTypes: 'public',
```

---

# 4. Componente de formulário compartilhado (novo arquivo)

## Objetivo

Extrair o formulário de `PageContent.tsx` (campos, validação, montagem do payload) para um componente reutilizável. Este componente **não** decide qual serviço chamar e **não** renderiza tela de sucesso — isso fica com cada página, via a prop `onSubmit`.

## Arquivo novo: `src/components/academia/AcademiaCadastroForm.tsx`

```tsx
// src/components/academia/AcademiaCadastroForm.tsx
//
// Formulário de cadastro de academia — campos, validação e montagem do
// payload. Extraído de src/app/(painel)/academias/cadastrar/PageContent.tsx
// para ser reutilizado por dois lugares:
//   1. O fluxo administrativo (admin autenticado, role fpp), que continua
//      chamando adminService.registrarAcademia.
//   2. O novo cadastro público (sem autenticação), que chama
//      academiaPublicaService.cadastrar.
//
// Este componente é só o formulário: campos, validação client-side e
// montagem do payload. Ele NÃO decide qual serviço chamar, não sabe o
// formato da resposta e não renderiza tela de sucesso — cada página que o
// usa é responsável por isso via a prop `onSubmit` (ver PageContent.tsx e
// InstituicaoCadastroPublico.tsx para os dois usos).
"use client";

import { useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import DocumentUpload from "@/components/form/DocumentUpload";
import SearchableSelect from "@/components/form/SearchableSelect";
import Button from "@/components/ui/button/Button";
import type { AcademiaType, NivelEscolar, CadastroAcademiaPublicaRequest } from "@/types/api";
import { Provincias } from "@/types/api";

// ---------------------------------------------------------------------------
// Opções dos dropdowns — valores primitivos para evitar problemas de
// comparação por referência no PrimeReact Dropdown
// ---------------------------------------------------------------------------

const NIVEL_ACADEMIA_OPCOES = [
  { nome: "Escola (Fundamental (1ª-9ª Classe) / Médio)", value: "escola" },
  { nome: "Ensino Superior", value: "superior" },
];

const NATUREZA_OPCOES = [
  { nome: "Pública", value: "public" as AcademiaType },
  { nome: "Privada", value: "private" as AcademiaType },
];

const NIVEL_ESCOLAR_OPCOES = [
  { nome: "Ensino Fundamental (1ª-9ª Classe)", value: "fundamental" as NivelEscolar },
  { nome: "Ensino Médio", value: "medio" as NivelEscolar },
  { nome: "Fundamental (1ª-9ª Classe) e Médio", value: "misto" as NivelEscolar },
];

const ANOS_FUNDAMENTAL_OPCOES = [
  { value: "1_ano_fundamental", label: "1ª Classe" },
  { value: "2_ano_fundamental", label: "2ª Classe" },
  { value: "3_ano_fundamental", label: "3ª Classe" },
  { value: "4_ano_fundamental", label: "4ª Classe" },
  { value: "5_ano_fundamental", label: "5ª Classe" },
  { value: "6_ano_fundamental", label: "6ª Classe" },
  { value: "7_ano_fundamental", label: "7ª Classe" },
  { value: "8_ano_fundamental", label: "8ª Classe" },
  { value: "9_ano_fundamental", label: "9ª Classe" },
];

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function maskTelefoneAngola(value: string) {
  const digits = onlyDigits(value).slice(0, 9);
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

export interface AcademiaCadastroFormProps {
  /**
   * Recebe o payload já validado e montado e o envia. Deve lançar em caso de
   * erro — a mensagem de erro é responsabilidade do chamador (ex.: via
   * `apiError`, tipicamente vindo do `error` de useApi), não deste
   * componente.
   */
  onSubmit: (payload: CadastroAcademiaPublicaRequest) => Promise<unknown>;
  submitting: boolean;
  apiError?: string | null;
  /** Mostra o campo opcional de senha — exclusivo do cadastro público. */
  showSenhaField?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  /** Nota informativa acima do botão — o texto difere entre o fluxo admin e o público. */
  infoNote?: React.ReactNode;
  /** Ação extra ao lado do botão de envio (ex.: link "Cancelar"). */
  secondaryAction?: React.ReactNode;
}

export default function AcademiaCadastroForm({
  onSubmit,
  submitting,
  apiError,
  showSenhaField = false,
  submitLabel = "Cadastrar",
  submittingLabel = "Cadastrando...",
  infoNote,
  secondaryAction,
}: AcademiaCadastroFormProps) {
  // Todos os estados são primitivos (string) para evitar problemas de
  // comparação por referência no PrimeReact Dropdown
  const [nomeAcademia, setNomeAcademia] = useState('');
  const [nif, setNif] = useState('');
  const [alvara, setAlvara] = useState<File | null>(null);
  const [email, setEmail] = useState('');
  const [numeroTelefone, setNumeroTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [website, setWebsite] = useState('');
  // provinciaCodigo armazena o CÓDIGO da província (ex: 'LUA', 'BGO')
  // conforme exigido pela API — não o nome
  const [provinciaCodigo, setProvinciaCodigo] = useState<string>('');
  // nivelAcademia: 'escola' | 'superior'  (AcademiaNivel)
  const [nivelAcademia, setNivelAcademia] = useState<'escola' | 'superior' | ''>('');
  // academiaType: 'public' | 'private'  (AcademiaType)
  const [academiaType, setAcademiaType] = useState<AcademiaType | ''>('');
  // nivelEscolar: apenas para nivel='escola'
  const [nivelEscolar, setNivelEscolar] = useState<NivelEscolar | ''>('');
  const [anosAcademicosSelecionados, setAnosAcademicosSelecionados] = useState<string[]>([]);
  // senha: só relevante quando showSenhaField=true (cadastro público)
  const [senha, setSenha] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validarFormulario = (): boolean => {
    const erros: string[] = [];

    if (!nomeAcademia.trim()) erros.push('Informe o nome da academia');

    const nifDigitos = nif.replace(/\D/g, '');
    if (!nifDigitos) {
      erros.push('Informe o NIF');
    } else if (nifDigitos.length !== 10) {
      erros.push('O NIF deve ter exatamente 10 números');
    }

    if (!alvara) {
      erros.push('Anexe o alvará em PDF');
    } else if (alvara.type !== 'application/pdf' && !alvara.name.toLowerCase().endsWith('.pdf')) {
      erros.push('O alvará deve ser um arquivo PDF');
    } else if (alvara.size > 10 * 1024 * 1024) {
      erros.push('O alvará deve ter no máximo 10 MB');
    }
    if (!nivelAcademia) erros.push('Escolha o tipo de instituição');
    if (!academiaType) erros.push('Escolha se é pública ou privada');
    if (!provinciaCodigo) erros.push('Selecione a província');
    if (!endereco.trim()) erros.push('Informe o endereço');

    if (!numeroTelefone.trim()) {
      erros.push('Número de telefone é obrigatório');
    } else {
      const apenasDigitos = onlyDigits(numeroTelefone);
      if (apenasDigitos.length !== 9) erros.push('Informe um telefone válido com exatamente 9 números locais');
    }

    if (!email.trim()) {
      erros.push('E-mail é obrigatório');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) erros.push('Informe um e-mail válido');
    }

    if (website.trim()) {
      try {
        new URL(website.trim());
      } catch {
        erros.push('Informe o site completo, começando com http:// ou https://');
      }
    }

    // Senha customizada — só validada quando o campo está visível (cadastro
    // público). É opcional: string vazia é válida (cai no padrão da API).
    if (showSenhaField && senha.trim()) {
      if (senha.trim().length < 6) erros.push('A senha deve ter no mínimo 6 caracteres');
      else if (senha.trim().length > 128) erros.push('A senha deve ter no máximo 128 caracteres');
    }

    // Validações específicas para escola
    if (nivelAcademia === 'escola') {
      if (!nivelEscolar) erros.push('Escolha quais níveis a escola oferece');

      // anos_academicos obrigatório para fundamental e misto
      if (
        (nivelEscolar === 'fundamental' || nivelEscolar === 'misto') &&
        anosAcademicosSelecionados.length === 0
      ) {
        erros.push('Selecione pelo menos um ano do ensino fundamental');
      }

      // anos_academicos NÃO deve ser informado para médio
      // (conforme documentação: "Para nivel=escola com nivel_escolar medio: anos_academicos não deve ser informado")
      // — não há erro aqui, apenas ignoramos os anos se medio estiver selecionado
    }

    setValidationErrors(erros);
    return erros.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);

    if (!validarFormulario()) return;

    // Após validarFormulario() retornar true, estes valores nunca são string vazia
    const type = academiaType as AcademiaType;
    const nivel = nivelAcademia as 'escola' | 'superior';

    const senhaTrim = senha.trim();
    const base = {
      type,
      nome: nomeAcademia.trim(),
      nif: nif.replace(/\D/g, ''),
      alvara: alvara as File,
      provincia: provinciaCodigo,
      endereco: endereco.trim(),
      telefone: onlyDigits(numeroTelefone),
      email: email.trim(),
      website: website.trim() || undefined,
      cursos: [] as string[],
      ...(showSenhaField && senhaTrim ? { senha: senhaTrim } : {}),
    };

    let payload: CadastroAcademiaPublicaRequest;
    if (nivel === 'escola') {
      const nivel_es = nivelEscolar as NivelEscolar;
      // anos_academicos: enviado apenas para fundamental e misto
      // para medio NÃO deve ser informado (regra da API)
      const anos_academicos =
        nivel_es === 'fundamental' || nivel_es === 'misto'
          ? anosAcademicosSelecionados
          : undefined;

      payload = { ...base, nivel: 'escola', nivel_escolar: nivel_es, anos_academicos };
    } else {
      payload = { ...base, nivel: 'superior' };
    }

    try {
      await onSubmit(payload);
    } catch {
      // Erro tratado pelo chamador via apiError (tipicamente useApi.error)
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">

        {/* Nome */}
        <div className="col-span-2">
          <Label>Nome da instituição *</Label>
          <Input
            type="text"
            placeholder="Ex: Escola Primária Ngola Kiluanje"
            value={nomeAcademia}
            onChange={(e) => setNomeAcademia(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <Label>NIF *</Label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="10 números"
            value={nif}
            onChange={(e) => setNif(e.target.value.replace(/\D/g, '').slice(0, 10))}
            disabled={submitting}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Informe apenas os 10 números do NIF.</p>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <Label>Alvará em PDF *</Label>
          <DocumentUpload
            id="academia-alvara"
            label="Alvará"
            required
            file={alvara ?? undefined}
            onChange={(file, error) => {
              setAlvara(file ?? null);
              if (error) setValidationErrors([error]);
              else setValidationErrors((prev) => prev.filter((item) => !item.toLowerCase().includes('alvará') && !item.toLowerCase().includes('ficheiro')));
            }}
          />
        </div>

        {/* Nível da academia: 'escola' | 'superior'
            optionValue="value" → armazena a string primitiva, não o objeto */}
        <div className="col-span-2 sm:col-span-1">
          <Label>Tipo de instituição *</Label>
          <SearchableSelect
            value={nivelAcademia}
            onChange={(value) => {
              setNivelAcademia(value as 'escola' | 'superior' | '');
              // Resetar campos dependentes ao mudar o nível
              setNivelEscolar('');
              setAnosAcademicosSelecionados([]);
            }}
            options={NIVEL_ACADEMIA_OPCOES.map((opcao) => ({ value: opcao.value, label: opcao.nome }))}
            placeholder="Escola ou Superior"
            searchable
            disabled={submitting}
          />
        </div>

        {/* Natureza: 'public' | 'private'
            optionValue="value" → armazena a string primitiva, não o objeto */}
        <div className="col-span-2 sm:col-span-1">
          <Label>Natureza *</Label>
          <SearchableSelect
            value={academiaType}
            onChange={(value) => setAcademiaType(value as AcademiaType | '')}
            options={NATUREZA_OPCOES.map((opcao) => ({ value: opcao.value, label: opcao.nome }))}
            placeholder="Pública ou Privada"
            searchable
            disabled={submitting}
          />
        </div>

        {/* Nível escolar — apenas visível quando nivel='escola'
            'fundamental' | 'medio' | 'misto'
            optionValue="value" → armazena a string primitiva */}
        {nivelAcademia === 'escola' && (
          <div className="col-span-2 sm:col-span-1">
            <Label>Nível escolar *</Label>
            <SearchableSelect
              value={nivelEscolar}
              onChange={(value) => {
                setNivelEscolar(value as NivelEscolar | '');
                setAnosAcademicosSelecionados([]);
              }}
              options={NIVEL_ESCOLAR_OPCOES.map((opcao) => ({ value: opcao.value, label: opcao.nome }))}
              placeholder="Fundamental (1ª-9ª Classe), Médio ou Misto"
              searchable
              disabled={submitting}
            />
          </div>
        )}

        {/* Província — optionValue="codigo" envia o CÓDIGO (ex: 'LUA', 'BGO')
            que é o que a API espera, não o nome por extenso */}
        <div className="col-span-2 sm:col-span-1">
          <Label>Província *</Label>
          <SearchableSelect
            value={provinciaCodigo}
            onChange={setProvinciaCodigo}
            options={Provincias.map((provincia) => ({ value: provincia.codigo, label: provincia.nome }))}
            searchable
            placeholder="Selecione a província"
            disabled={submitting}
            noOptionsMessage={() => 'Nenhuma província encontrada'}
          />
        </div>

        {/* Telefone */}
        <div className="col-span-2 sm:col-span-1">
          <Label>Telefone *</Label>
          <Input
            type="tel"
            inputMode="numeric"
            placeholder="923 456 789"
            value={maskTelefoneAngola(numeroTelefone)}
            onChange={(e) => setNumeroTelefone(onlyDigits(e.target.value).slice(0, 9))}
            disabled={submitting}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Informe apenas os 9 dígitos locais, sem DDI.</p>
        </div>

        {/* E-mail */}
        <div className="col-span-2 sm:col-span-1">
          <Label>E-mail *</Label>
          <Input
            type="email"
            placeholder="email@academia.ao"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
        </div>

        {/* Endereço */}
        <div className="col-span-2 sm:col-span-1">
          <Label>Endereço *</Label>
          <Input
            type="text"
            placeholder="Rua, Bairro, Município"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            disabled={submitting}
          />
        </div>

        {/* Website */}
        <div className="col-span-2 sm:col-span-1">
          <Label>Website (opcional)</Label>
          <Input
            type="text"
            placeholder="https://academia.ao"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            disabled={submitting}
          />
        </div>

        {/* Senha — só no cadastro público (showSenhaField=true) */}
        {showSenhaField && (
          <div className="col-span-2 sm:col-span-1">
            <Label>Senha (opcional)</Label>
            <Input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Se não definir, a senha inicial será o código da academia (gerado após o cadastro).
            </p>
          </div>
        )}

        {/* Anos académicos — apenas para escola fundamental / misto
            Para 'medio' a API proíbe enviar este campo */}
        {nivelAcademia === 'escola' &&
          (nivelEscolar === 'fundamental' || nivelEscolar === 'misto') && (
            <div className="col-span-2">
              <Label>Anos Académicos * (obrigatório para fundamental/misto)</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Selecione as classes do ensino fundamental que esta escola oferece
              </p>
              <div className="grid grid-cols-3 gap-2">
                {ANOS_FUNDAMENTAL_OPCOES.map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={anosAcademicosSelecionados.includes(value)}
                      onChange={() =>
                        setAnosAcademicosSelecionados((prev) =>
                          prev.includes(value)
                            ? prev.filter((a) => a !== value)
                            : [...prev, value]
                        )
                      }
                      disabled={submitting}
                      className="w-4 h-4 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
      </div>

      {/* Erros de validação */}
      {validationErrors.length > 0 && (
        <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
            Antes de continuar, corrija estes pontos:
          </h4>
          <ul className="list-disc list-inside space-y-1">
            {validationErrors.map((erro, i) => (
              <li key={i} className="text-sm text-red-700 dark:text-red-400">
                {erro}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Erro da API */}
      {apiError && (
        <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="first-letter:uppercase text-sm text-red-700 dark:text-red-400">
            {apiError}
          </p>
        </div>
      )}

      {infoNote && <div className="mt-5">{infoNote}</div>}

      <div className="flex items-center justify-end gap-3 mt-6">
        {secondaryAction}
        <Button size="sm" disabled={submitting}>
          {submitting ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {submittingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
```

---

# 5. Refatoração da página admin — `src/app/(painel)/academias/cadastrar/PageContent.tsx`

## Objetivo

Trocar o formulário inline pelo componente compartilhado, **mantendo exatamente o mesmo comportamento visível**: mesma guarda de autenticação (`admin`), mesma chamada a `adminService.registrarAcademia` (sem campo `senha`), mesma tela de sucesso, mesmo texto informativo.

## Conteúdo final completo do arquivo (substituir o arquivo inteiro por este conteúdo)

```tsx
// src/app/(painel)/academias/cadastrar/PageContent.tsx
"use client"
import { useState } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useApi, adminService } from '@/lib/api';
import { useUserCookie } from "@/hooks/useUserCookie";
import UnauthorizedAccess from "@/components/guards/UnauthorizedAccess";
import Icon from "@/components/ui/Icon";
import AcademiaCadastroForm from "@/components/academia/AcademiaCadastroForm";
import type { CadastroAcademiaPublicaRequest } from '@/types/api';

// ---------------------------------------------------------------------------
// Resultado de cadastro bem-sucedido
// ---------------------------------------------------------------------------

interface ResultadoCadastro {
  codigo_academia: string;
  nome: string;
}

function SuccessState({
  resultado,
  onCadastrarOutra,
}: {
  resultado: ResultadoCadastro;
  onCadastrarOutra: () => void;
}) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">
            Academia cadastrada com sucesso!
          </h3>
          <p className="text-sm text-green-700 dark:text-green-400 mt-1 capitalize">
            {resultado.nome}
          </p>
        </div>

        <div className="bg-white dark:bg-green-900/30 rounded-lg p-4 space-y-2 text-left">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Código da Academia</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">
              {resultado.codigo_academia}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Senha padrão</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">
              {resultado.codigo_academia}
            </span>
          </div>
        </div>

        <p className="text-xs text-green-700 dark:text-green-400">
          A primeira senha é o próprio código da academia. Oriente o encarregado a trocar a senha no primeiro acesso.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={onCadastrarOutra}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Cadastrar outra
          </button>
          <Link
            href="/academias"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Ver academias
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function CadastrarAcademiaPageContent() {
  const { user, loading: loadingUser } = useUserCookie();

  const {
    loading: carregandoCadastro,
    error: erroCadastro,
    execute: executarCadastro,
  } = useApi(adminService.registrarAcademia);

  const [resultado, setResultado] = useState<ResultadoCadastro | null>(null);
  // Incrementado a cada "Cadastrar outra" para remontar AcademiaCadastroForm
  // com estado zerado (o formulário mantém seus próprios campos internos).
  const [formKey, setFormKey] = useState(0);

  // Guard: apenas admin FPP
  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (!user || user.tipo !== 'admin') {
    return (
      <UnauthorizedAccess
        requiredTypes={['admin']}
        message="Esta página é restrita a administradores."
      />
    );
  }

  const limparFormulario = () => {
    setResultado(null);
    setFormKey((k) => k + 1);
  };

  const handleFormSubmit = async (payload: CadastroAcademiaPublicaRequest) => {
    const result = await executarCadastro(payload);
    if (result?.data) {
      setResultado({
        codigo_academia: result.data.codigo_academia,
        nome: payload.nome,
      });
    }
  };

  // Estado de sucesso
  if (resultado) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Cadastrar Academia" />
        <SuccessState resultado={resultado} onCadastrarOutra={limparFormulario} />
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Cadastrar Academia" />

      <div className="max-w-2xl">
        {/* Voltar */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/academias"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"
          >
            <Icon icon="mdi:arrow-left" width={18} /> Voltar para academias
          </Link>
        </div>

        <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.05] p-6 lg:p-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">
            Cadastrar Nova Academia
          </h2>

          <AcademiaCadastroForm
            key={formKey}
            onSubmit={handleFormSubmit}
            submitting={carregandoCadastro}
            apiError={erroCadastro}
            infoNote={
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Informação:</strong> depois do cadastro, a academia fica aguardando a ativação por um administrador.
                  A primeira senha será o <strong>código gerado automaticamente</strong>.
                </p>
              </div>
            }
            secondaryAction={
              <Link
                href="/academias"
                className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-4 py-3 text-sm bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
              >
                Cancelar
              </Link>
            }
          />
        </div>
      </div>
    </div>
  );
}
```

## Pontos de atenção obrigatórios

- O reset do formulário ao clicar em "Cadastrar outra" agora é feito remontando `AcademiaCadastroForm` via a prop `key={formKey}` (incrementada em `limparFormulario`) — o formulário compartilhado guarda seus próprios campos internamente, então não há mais estados individuais de campo neste arquivo.
- `handleFormSubmit` chama `executarCadastro(payload)` sem passar `token` explicitamente — **igual ao comportamento atual**, que já dependia do fallback `tokenStorage.get()` dentro de `adminService.registrarAcademia`.
- Este arquivo **não** passa `showSenhaField` para `AcademiaCadastroForm` — o campo de senha continua exclusivo da página pública.

---

# 6. Nova página pública (2 arquivos novos)

## Objetivo

Criar `/instituicoes/cadastrar`, no mesmo grupo de rotas de `/matricula` (`(full-width-pages)/(auth)`), reaproveitando `AcademiaCadastroForm` com `showSenhaField` habilitado e chamando `academiaPublicaService.cadastrar` (sem token).

## Arquivo novo: `src/app/(full-width-pages)/(auth)/instituicoes/cadastrar/page.tsx`

```tsx
import InstituicaoCadastroPublico from "./InstituicaoCadastroPublico";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Cadastrar instituição", description: "Registe a sua instituição de ensino no Spuri" };

export default function Page() { return <InstituicaoCadastroPublico />; }
```

## Arquivo novo: `src/app/(full-width-pages)/(auth)/instituicoes/cadastrar/InstituicaoCadastroPublico.tsx`

```tsx
// src/app/(full-width-pages)/(auth)/instituicoes/cadastrar/InstituicaoCadastroPublico.tsx
//
// Cadastro público de instituição (academia), sem autenticação. Reaproveita
// o mesmo formulário usado em /academias/cadastrar (fluxo admin) via o
// componente compartilhado AcademiaCadastroForm — ver esse arquivo para a
// lógica de campos e validação. Aqui ficam apenas as diferenças do fluxo
// público: chamada à rota pública (academiaPublicaService.cadastrar, sem
// token), campo de senha customizada habilitado, e uma tela de sucesso com
// texto e navegação apropriados para quem não está autenticado.
"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/lib/api";
import { academiaPublicaService } from "@/lib/api/services";
import AcademiaCadastroForm from "@/components/academia/AcademiaCadastroForm";
import type { CadastroAcademiaPublicaRequest } from "@/types/api";

interface ResultadoCadastroPublico {
  codigo_academia: string;
  nome: string;
  aviso: string;
}

function SuccessState({
  resultado,
  onCadastrarOutra,
}: {
  resultado: ResultadoCadastroPublico;
  onCadastrarOutra: () => void;
}) {
  return (
    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center space-y-4">
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">Cadastro recebido com sucesso!</h3>
        <p className="text-sm text-green-700 dark:text-green-400 mt-1 capitalize">{resultado.nome}</p>
      </div>

      <div className="bg-white dark:bg-green-900/30 rounded-lg p-4 space-y-2 text-left">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Código da instituição</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">{resultado.codigo_academia}</span>
        </div>
      </div>

      <p className="text-xs text-green-700 dark:text-green-400">{resultado.aviso}</p>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-left">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          A conta fica <strong>inativa</strong> até que um administrador do Spuri a ative. Assim que for ativada, já pode entrar usando o código da instituição.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <button
          onClick={onCadastrarOutra}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Cadastrar outra instituição
        </button>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          Ir para o login
        </Link>
      </div>
    </div>
  );
}

export default function InstituicaoCadastroPublico() {
  const {
    loading: submitting,
    error: apiError,
    execute: executarCadastro,
  } = useApi(academiaPublicaService.cadastrar);

  const [resultado, setResultado] = useState<ResultadoCadastroPublico | null>(null);
  // Incrementado a cada "Cadastrar outra instituição" para remontar
  // AcademiaCadastroForm com estado zerado.
  const [formKey, setFormKey] = useState(0);

  const limparFormulario = () => {
    setResultado(null);
    setFormKey((k) => k + 1);
  };

  const handleFormSubmit = async (payload: CadastroAcademiaPublicaRequest) => {
    const result = await executarCadastro(payload);
    if (result) {
      setResultado({
        codigo_academia: result.codigo_academia,
        nome: payload.nome,
        aviso: result.aviso,
      });
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-1 justify-center overflow-y-auto bg-gray-50 px-4 py-6 dark:bg-gray-950 lg:w-1/2 lg:px-8">
      <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Cadastrar instituição</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Registe a sua instituição de ensino no Spuri. Um administrador ativa a conta após revisão.
            </p>
          </div>
          <Link href="/login" className="text-sm font-medium text-brand-500 hover:text-brand-600">
            Voltar
          </Link>
        </div>

        {resultado ? (
          <SuccessState resultado={resultado} onCadastrarOutra={limparFormulario} />
        ) : (
          <AcademiaCadastroForm
            key={formKey}
            onSubmit={handleFormSubmit}
            submitting={submitting}
            apiError={apiError}
            showSenhaField
            submitLabel="Cadastrar instituição"
            submittingLabel="Enviando cadastro..."
            infoNote={
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Informação:</strong> depois do cadastro, a instituição fica aguardando a ativação por um administrador do Spuri.
                  Se não definir uma senha, a senha inicial será o código gerado automaticamente.
                </p>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
```

---

# 7. Referência na página inicial — `src/components/landing/LandingContent.tsx`

## Objetivo

Adicionar uma referência à nova página pública para os 3 perfis institucionais (`colegio-pequeno-medio`, `colegio-grande-porte`, `ensino-superior`), **sem alterar nenhum texto já aprovado** de `cta`/`headline`/`href` em `src/data/landingProfiles.ts`.

## Diff exato

```diff
diff --git a/src/components/landing/LandingContent.tsx b/src/components/landing/LandingContent.tsx
index 1629ac8..5ff0d9e 100644
--- a/src/components/landing/LandingContent.tsx
+++ b/src/components/landing/LandingContent.tsx
@@ -370,6 +370,18 @@ export default function LandingContent({
 
             <div className="mt-8">
               <CtaButton profile={profile} />
+              {profile !== "estudante" && (
+                <p className="mt-4 text-sm lg:text-base text-gray-500 dark:text-gray-400">
+                  Prefere começar já?{" "}
+                  <Link
+                    href="/instituicoes/cadastrar"
+                    className="font-medium text-brand-500 hover:text-brand-600"
+                  >
+                    Cadastre a sua instituição diretamente
+                  </Link>
+                  .
+                </p>
+              )}
             </div>
           </motion.div>
         </section>
```

## Por que não alterar `landingProfiles.ts`

O arquivo tem o comentário explícito *"Copy revista e aprovada ao longo do planeamento da página"* — os 3 perfis institucionais têm `cta: "Fale Connosco"` apontando para `mailto:`. Em vez de substituir esse CTA (que pode ter sido uma decisão de produto deliberada — manter uma conversa comercial antes do autocadastro), esta tarefa adiciona um link secundário, menor, abaixo do botão principal, para quem já quer se cadastrar direto. Se Fredy quiser que o CTA principal dos perfis institucionais passe a ser diretamente "Cadastrar instituição" (substituindo "Fale Connosco"), isso é uma decisão de produto/copy que deve ser confirmada explicitamente antes de qualquer IA alterar `landingProfiles.ts` — não presumir isso nesta tarefa.

---

# Fora de escopo

- Qualquer alteração em `src/data/landingProfiles.ts` (copy aprovado) — ver seção 7.
- Alterar o CTA fixo do rodapé mobile (`<CtaButton profile={profile} className="w-full" />`) ou o CTA final da página (`CtaButtonInverse`) — a referência nova fica só no ponto indicado na seção 7, para não duplicar/poluir múltiplos CTAs.
- Qualquer mudança em `adminService.registrarAcademia`, no endpoint `POST /dominis/academia/register`, ou em qualquer arquivo do backend — o backend (Tarefa 32) já foi auditado e está correto, nada a fazer lá.
- Notificação por e-mail/SMS após o cadastro público — não solicitado, e o módulo de SMS ainda não está integrado ao backend.
- Página ou fluxo de aprovação/ativação de instituições pendentes para os administradores — os endpoints `PUT /dominis/academia/:codigo/ativar`/`desativar` já existem e já têm interface própria; esta tarefa não mexe nisso.
- Qualquer alteração em arquivos do fluxo de inscrição/matrícula de estudante (`/matricula`, `MatriculaPublicPage.tsx`, `solicitacaoMatriculaService`) além de usá-los como referência de padrão — nenhum desses arquivos é tocado por esta tarefa.

# Critérios de aceite

1. `src/types/api.ts` contém `CadastroAcademiaPublicaRequest` e `CadastroAcademiaPublicaResponse` exatamente como na seção 1, e `CriarEscolaRequest`/`CriarUniversidadeRequest` permanecem byte-a-byte idênticos ao estado atual;
2. `academiaPublicaService.cadastrar` existe em `src/lib/api/services.ts`, chama `POST /academia/registo-publico` sem token;
3. `/instituicoes/cadastrar` está registrada como `'public'` em `ROUTE_PERMISSIONS` (`src/lib/route-guards.ts`) — visitante não autenticado consegue acessar a página sem ser redirecionado;
4. `src/components/academia/AcademiaCadastroForm.tsx` existe, com todos os campos de `/academias/cadastrar` preservados (nome, NIF, alvará, tipo de instituição, natureza, nível escolar, província, telefone, endereço, website, anos académicos) mais o campo opcional de senha controlado por `showSenhaField`;
5. `/academias/cadastrar` (admin) continua funcionando exatamente como antes: mesma guarda de autenticação, mesma chamada a `adminService.registrarAcademia` sem campo `senha`, mesma validação, mesma tela de sucesso, mesmo texto informativo;
6. `/instituicoes/cadastrar` (pública) permite cadastro sem login, mostra o campo de senha opcional, chama `academiaPublicaService.cadastrar`, e a tela de sucesso mostra o `aviso` retornado pela API e não afirma incondicionalmente que "a senha padrão é o código" (já que a senha pode ter sido definida pelo usuário);
7. a página inicial (`/`) referencia `/instituicoes/cadastrar` para os 3 perfis institucionais, sem alterar nenhum texto de `cta`/`headline`/`href` em `landingProfiles.ts`;
8. `npx tsc --noEmit`, `npx eslint .` e `npm run build` rodam limpos, sem erros, sem warnings novos, sem conflito de rotas — esta checagem final é obrigatória e deve ser concluída pelo Codex (ver "Limitação desta validação" no Contexto).

## Arquivos a remover

**Nenhum.** Todo o formulário existente continua em uso (agora dentro do componente compartilhado); nenhuma página, rota ou serviço antigo é removido.

## Procedimento de conclusão

Ao finalizar a implementação, atualize o título e o front matter deste arquivo (`status: feito`, título com sufixo "(feito)"), seguindo a convenção já usada nos demais documentos em `src/docs/` deste repositório.
