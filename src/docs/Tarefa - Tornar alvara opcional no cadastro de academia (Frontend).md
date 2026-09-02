# Tarefa Frontend — spuripainel

### Documento de execução para o Codex (orquestrado e pré-testado pelo Claude)

## 0. Como usar este documento

- Aplique os diffs da seção 2 **exatamente como estão**, na ordem listada, com `git apply` ou reproduzindo manualmente as linhas `-`/`+`.
- Não refatore, não renomeie nada além do que está aqui.
- Se um diff não aplicar limpo (contexto não bate com o que está no repo), **pare e sinalize para revisão humana** — não adivinhe.
- **Aviso importante de honestidade sobre validação**: por limite de tempo/orçamento nesta sessão, eu (Claude) **não rodei** `npm install` / `npx tsc --noEmit` / `next build` sobre este diff — diferente do que fiz no backend irmão desta tarefa (esse sim, validado com Go+PostgreSQL reais). Os diffs abaixo foram escritos com base em leitura cuidadosa do código real do repo (tipos, serviços, componentes vizinhos usados como molde), mas **você precisa rodar `npx tsc --noEmit` (e idealmente `next build`) depois de aplicar**, e corrigir qualquer erro de tipo antes de considerar a tarefa concluída. Isso é diferente do padrão usual deste projeto (normalmente eu já entrego isso validado) — sinalizando aqui para não mascarar a lacuna.

## 1. Requisito

Duas rotas de cadastro de academia foram renomeadas no backend (tarefa irmã, `spuri-backend`, arquivo `80 - Tornar alvara opcional no cadastro de academia e renomear rotas de cadastro.md`):

- `POST /dominis/academia/register` → `POST /dominis/academia/cadastro`
- `POST /academia/registo-publico` → `POST /academia/cadastro`

E o campo `alvara` (PDF do alvará) deixou de ser obrigatório nas duas — pode ser enviado no cadastro ou depois, individualmente, via um novo endpoint `POST /documentos/academias/{codigo}/alvara/upload`.

Este documento cobre o lado do painel: (1) apontar para as rotas novas, (2) tornar o campo de alvará opcional no formulário de cadastro, (3) adicionar a capacidade de enviar/atualizar o alvará depois, tanto na tela de detalhes da academia (visão admin) quanto nas configurações da própria academia (self-service) — decisão confirmada com o Fredy.

**Coordenação de deploy**: este frontend e o backend irmão precisam subir juntos. Se só o frontend subir, ele vai chamar rotas que ainda não existem no backend antigo. Se só o backend subir, o formulário do painel vai chamar rotas que não existem mais (`/academia/registo-publico`, `/dominis/academia/register`) e todo cadastro de academia quebra.

## 2. O que já existe (mapeado antes de escrever os diffs)

- `src/types/api.ts`: `CriarEscolaRequest` e `CriarUniversidadeRequest` tinham `alvara: File` obrigatório; `CadastroAcademiaPublicaRequest` é `(CriarEscolaRequest | CriarUniversidadeRequest) & {...}`, então herda o campo automaticamente — só precisa mudar nos dois tipos base.
- `src/components/academia/AcademiaCadastroForm.tsx`: único formulário usado tanto no cadastro admin quanto no público (via prop `onSubmit`). Validação client-side hoje rejeita ausência de alvará; precisa só validar formato/tamanho **se** um arquivo for anexado.
- `src/lib/api/services.ts`:
  - `academiaPublicaService` (linha ~505) chama `'/academia/registo-publico'` via `api.postForm`.
  - `adminService.registrarAcademia` (linha ~2062) chama `'/dominis/academia/register'`.
  - Ambos já constroem o `FormData` pulando campos `undefined`/`null` automaticamente (`if (value === undefined || value === null) return;`) — então marcar `alvara` como opcional no tipo já é suficiente, **não precisa mudar a lógica de montagem do FormData**.
  - `documentosService` (linha ~1079) já tem `baixarAlvaraAcademia(codigoAcademia, token)` — GET `/documentos/academias/{codigo}/alvara/download`. É o par exato do novo endpoint de upload; a convenção de nomes/assinatura foi copiada dele.
- `src/app/(painel)/academias/PageContent.tsx`: função `SubtelaDetalhesAcademia` (visão admin, tela de detalhe de uma academia) já tem uma seção "Documentos" com botão "Visualizar alvará" (chama `documentosService.baixarAlvaraAcademia`, abre num iframe). É o único lugar do painel, hoje, que referencia alvará além do formulário de cadastro.
- `src/app/(painel)/configuracoes/AcademiaSection.tsx`: tela de configurações da própria academia (self-service). Renderiza cards extras (ex: `PasswordSettingsCard`) quando `section === "all"`, sem precisar de rota própria. `PasswordSettingsCard.tsx` foi usado como molde de estilo/estrutura para o novo card.
- **Não existe hoje** nenhuma tela de "documentos da academia" no self-service — só o admin tinha visualização. Por isso a Parte 4 cria um componente novo (`AlvaraSettingsCard.tsx`), em vez de estender algo existente.

## 3. Diffs a aplicar, nesta ordem

### Arquivo 1/6 — `src/types/api.ts`

```diff
--- a/src/types/api.ts
+++ b/src/types/api.ts
@@ export interface CriarEscolaRequest {
   nome: string;
   nif: string;
-  alvara: File;
+  alvara?: File;
   provincia: string;
   endereco: string;
@@ export interface CriarUniversidadeRequest {
   nome: string;
   nif: string;
-  alvara: File;
+  alvara?: File;
   provincia: string;
   endereco: string;
@@
- * Cadastro público de academia (sem autenticação) — POST /academia/registo-publico.
+ * Cadastro público de academia (sem autenticação) — POST /academia/cadastro.
```

*(Há duas ocorrências de `alvara: File;` no arquivo — a primeira dentro de `CriarEscolaRequest`, a segunda dentro de `CriarUniversidadeRequest`. Mude as duas. O comentário com a rota antiga fica logo acima da definição de `CadastroAcademiaPublicaRequest`.)*

### Arquivo 2/6 — `src/lib/api/services.ts`

**2a. Rename das duas rotas de cadastro:**
```diff
-    return api.postForm<CadastroAcademiaPublicaResponse>('/academia/registo-publico', formData);
+    return api.postForm<CadastroAcademiaPublicaResponse>('/academia/cadastro', formData);
```
```diff
-      '/dominis/academia/register',
+      '/dominis/academia/cadastro',
```

**2b. Novo método `enviarAlvaraAcademia` em `documentosService`**, logo depois de `baixarAlvaraAcademiaPorUrl`:
```diff
   baixarAlvaraAcademiaPorUrl: (downloadUrl: string, token?: string) =>
     fetchApiBlob(
       normalizarDocumentoEndpoint(downloadUrl, '/documentos/academias/'),
       { token: token || tokenStorage.get() || undefined }
     ),
+
+  // Envia (ou substitui) o alvará de uma academia depois do cadastro — o
+  // alvará agora é opcional em POST /dominis/academia/cadastro e
+  // POST /academia/cadastro. Usado tanto pelo admin (qualquer codigo) quanto
+  // pela própria academia (seu próprio codigo) — mesma regra de permissão
+  // do download, validada no backend.
+  enviarAlvaraAcademia: (codigoAcademia: string, alvara: File, token?: string) => {
+    const formData = new FormData();
+    formData.append('alvara', alvara);
+    return api.postForm<{ message: string; codigo_academia: string; download_url: string }>(
+      `/documentos/academias/${encodeURIComponent(codigoAcademia)}/alvara/upload`,
+      formData,
+      { token: token || tokenStorage.get() || undefined }
+    );
+  },
```

### Arquivo 3/6 — `src/components/academia/AcademiaCadastroForm.tsx`

**3a. Validação client-side — alvará vira opcional:**
```diff
-    if (!alvara) erros.push('Anexe o alvará em PDF');
-    else if (alvara.type !== 'application/pdf' && !alvara.name.toLowerCase().endsWith('.pdf')) erros.push('O alvará deve ser um arquivo PDF');
-    else if (alvara.size > 10 * 1024 * 1024) erros.push('O alvará deve ter no máximo 10 MB');
+    // Alvará é opcional no cadastro: pode ser enviado depois, individualmente
+    // (documentosService.enviarAlvaraAcademia). Se o usuário anexar um
+    // arquivo agora, ele ainda precisa ser um PDF válido de até 10 MB.
+    if (alvara) {
+      if (alvara.type !== 'application/pdf' && !alvara.name.toLowerCase().endsWith('.pdf')) erros.push('O alvará deve ser um arquivo PDF');
+      else if (alvara.size > 10 * 1024 * 1024) erros.push('O alvará deve ter no máximo 10 MB');
+    }
```

**3b. Payload — `alvara as File` (que quebraria em runtime se `null`) vira `alvara ?? undefined`:**
```diff
-    const base = { type, nome: nomeAcademia.trim(), nif: nif.replace(/\D/g, ''), alvara: alvara as File, provincia: provinciaCodigo, endereco: endereco.trim(), telefone: onlyDigits(numeroTelefone), email: email.trim(), website: website.trim() || undefined, cursos: [] as string[], ...(showSenhaField ? { senha: senhaTrim } : {}) };
+    const base = { type, nome: nomeAcademia.trim(), nif: nif.replace(/\D/g, ''), alvara: alvara ?? undefined, provincia: provinciaCodigo, endereco: endereco.trim(), telefone: onlyDigits(numeroTelefone), email: email.trim(), website: website.trim() || undefined, cursos: [] as string[], ...(showSenhaField ? { senha: senhaTrim } : {}) };
```

**3c. Label do campo — remove o `*` de obrigatório, remove `required` do `DocumentUpload`, adiciona nota:**
```diff
-        <div className="col-span-2 sm:col-span-1"><Label>Alvará em PDF *</Label><DocumentUpload id="academia-alvara" label="Alvará" required file={alvara ?? undefined} onChange={(file, error) => { setAlvara(file ?? null); if (error) setValidationErrors([error]); else setValidationErrors((prev) => prev.filter((item) => !item.toLowerCase().includes('alvará') && !item.toLowerCase().includes('ficheiro'))); }} /></div>
+        <div className="col-span-2 sm:col-span-1"><Label>Alvará em PDF (opcional)</Label><DocumentUpload id="academia-alvara" label="Alvará" file={alvara ?? undefined} onChange={(file, error) => { setAlvara(file ?? null); if (error) setValidationErrors([error]); else setValidationErrors((prev) => prev.filter((item) => !item.toLowerCase().includes('alvará') && !item.toLowerCase().includes('ficheiro'))); }} /><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Pode enviar depois, individualmente, se ainda não tiver o arquivo em mãos.</p></div>
```

### Arquivo 4/6 — `src/app/(painel)/academias/PageContent.tsx` (visão admin — enviar/atualizar alvará na tela de detalhes)

**4a. Novo estado + handler de envio, dentro de `SubtelaDetalhesAcademia`:**
```diff
 function SubtelaDetalhesAcademia({ academia, onVoltar }: { academia: AcademiaDetalhada; onVoltar: () => void }) {
   const [documentoAberto, setDocumentoAberto] = useState<string | null>(null);
   const [carregandoDocumento, setCarregandoDocumento] = useState(false);
   const [erroDocumento, setErroDocumento] = useState('');
+  const [enviandoAlvara, setEnviandoAlvara] = useState(false);
+  const [erroEnvioAlvara, setErroEnvioAlvara] = useState('');
+  const [sucessoEnvioAlvara, setSucessoEnvioAlvara] = useState(false);
+  const inputAlvaraRef = useRef<HTMLInputElement>(null);
 
   useEffect(() => () => { if (documentoAberto) URL.revokeObjectURL(documentoAberto); }, [documentoAberto]);
+
+  const enviarAlvara = async (file: File) => {
+    setErroEnvioAlvara('');
+    setSucessoEnvioAlvara(false);
+    setEnviandoAlvara(true);
+    try {
+      await documentosService.enviarAlvaraAcademia(academia.codigo_academia, file, tokenStorage.get() || undefined);
+      setSucessoEnvioAlvara(true);
+      if (documentoAberto) fecharAlvara();
+    } catch (err: any) {
+      setErroEnvioAlvara(err?.message || 'Não foi possível enviar o alvará.');
+    } finally {
+      setEnviandoAlvara(false);
+      if (inputAlvaraRef.current) inputAlvaraRef.current.value = '';
+    }
+  };
```

`useRef` já está importado no topo do arquivo (`import { useState, useEffect, useCallback, useRef, useMemo } from "react";`) — não precisa adicionar import.

**4b. Seção "Documentos" do JSX — adiciona botão de envio ao lado do de visualizar:**
```diff
-    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-gray-800 dark:text-white">Documentos</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Visualize o alvará da academia sem sair desta tela.</p></div><Button size="sm" variant="outline" disabled={carregandoDocumento} onClick={abrirAlvara} startIcon={<Icon icon={carregandoDocumento ? 'mdi:loading' : documentoAberto ? 'mdi:close' : 'mdi:file-eye-outline'} width={16} className={carregandoDocumento ? 'animate-spin' : undefined} />}>{carregandoDocumento ? 'A abrir...' : documentoAberto ? 'Fechar alvará' : 'Visualizar alvará'}</Button></div>{erroDocumento && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroDocumento}</p>}{documentoAberto && <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"><iframe title={`Alvará de ${academia.nome}`} src={documentoAberto} className="h-[70vh] w-full bg-white" /></div>}</section>
+    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-gray-800 dark:text-white">Documentos</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">O alvará é opcional no cadastro — visualize ou envie/atualize aqui.</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={carregandoDocumento} onClick={abrirAlvara} startIcon={<Icon icon={carregandoDocumento ? 'mdi:loading' : documentoAberto ? 'mdi:close' : 'mdi:file-eye-outline'} width={16} className={carregandoDocumento ? 'animate-spin' : undefined} />}>{carregandoDocumento ? 'A abrir...' : documentoAberto ? 'Fechar alvará' : 'Visualizar alvará'}</Button><input ref={inputAlvaraRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) enviarAlvara(file); }} /><Button size="sm" disabled={enviandoAlvara} onClick={() => inputAlvaraRef.current?.click()} startIcon={<Icon icon={enviandoAlvara ? 'mdi:loading' : 'mdi:file-upload-outline'} width={16} className={enviandoAlvara ? 'animate-spin' : undefined} />}>{enviandoAlvara ? 'A enviar...' : 'Enviar/atualizar alvará'}</Button></div></div>{erroDocumento && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroDocumento}</p>}{erroEnvioAlvara && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroEnvioAlvara}</p>}{sucessoEnvioAlvara && <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">Alvará enviado com sucesso.</p>}{documentoAberto && <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"><iframe title={`Alvará de ${academia.nome}`} src={documentoAberto} className="h-[70vh] w-full bg-white" /></div>}</section>
```

*Nota de design*: optei por **duplicar** essa lógica de upload (em vez de extrair um componente compartilhado entre esta tela e a nova de configurações da Parte 5) para manter o diff pequeno e de baixo risco dentro do orçamento desta sessão. O padrão de duplicação entre os dois pontos de entrada é o mesmo que já existe no backend entre `RegisterAcademia`/`RegisterAcademiaPublica`. Se quiser, uma refatoração futura pode extrair um componente `AlvaraDocumentoCard` compartilhado — não fiz isso aqui de propósito, para não aumentar a superfície do diff.

### Arquivo 5/6 — `src/app/(painel)/configuracoes/AlvaraSettingsCard.tsx` (NOVO — self-service)

Crie este arquivo com o conteúdo completo abaixo. É um card autocontido, no mesmo estilo de `PasswordSettingsCard.tsx` (mesmo padrão de card, mesmos imports de `Icon`/`Button`), usando `useUserType()` para pegar `user.academia.codigo_academia` e os mesmos dois métodos de `documentosService` já usados na Parte 4.

```tsx
"use client";

import { useRef, useState } from "react";
import { useUserType } from "@/hooks/useRoutePermission";
import { documentosService } from "@/lib/api/services";
import { tokenStorage } from "@/lib/api/client";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/button/Button";

// Alvará é opcional no cadastro (POST /dominis/academia/cadastro e
// POST /academia/cadastro). Este card cobre o caso "envio individual mais
// tarde" pelo lado da própria academia — visualizar o que já está enviado e
// enviar/atualizar um novo arquivo, reaproveitando
// documentosService.baixarAlvaraAcademia / enviarAlvaraAcademia, os mesmos
// métodos já usados na tela de detalhes da academia no painel admin.
export default function AlvaraSettingsCard() {
  const { user } = useUserType();
  const codigoAcademia = user?.academia?.codigo_academia;

  const [documentoAberto, setDocumentoAberto] = useState<string | null>(null);
  const [carregandoDocumento, setCarregandoDocumento] = useState(false);
  const [erroDocumento, setErroDocumento] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [sucessoEnvio, setSucessoEnvio] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fecharAlvara = () => {
    setDocumentoAberto((atual) => {
      if (atual) URL.revokeObjectURL(atual);
      return null;
    });
  };

  const abrirAlvara = async () => {
    if (!codigoAcademia) return;
    if (documentoAberto) {
      fecharAlvara();
      return;
    }
    setErroDocumento("");
    setCarregandoDocumento(true);
    try {
      const blob = await documentosService.baixarAlvaraAcademia(codigoAcademia, tokenStorage.get() || undefined);
      const url = URL.createObjectURL(blob);
      setDocumentoAberto((atual) => { if (atual) URL.revokeObjectURL(atual); return url; });
    } catch (err: any) {
      setErroDocumento(err?.message || "Alvará ainda não enviado, ou não foi possível abri-lo.");
    } finally {
      setCarregandoDocumento(false);
    }
  };

  const enviarAlvara = async (file: File) => {
    if (!codigoAcademia) return;
    setErroEnvio("");
    setSucessoEnvio(false);
    setEnviando(true);
    try {
      await documentosService.enviarAlvaraAcademia(codigoAcademia, file, tokenStorage.get() || undefined);
      setSucessoEnvio(true);
      if (documentoAberto) fecharAlvara();
    } catch (err: any) {
      setErroEnvio(err?.message || "Não foi possível enviar o alvará.");
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (!codigoAcademia) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="mb-4 flex items-center gap-3">
        <Icon icon="mdi:file-certificate-outline" width={22} className="text-brand-500" />
        <h3 className="text-base font-semibold text-gray-800 dark:text-white">Alvará</h3>
      </div>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        O alvará é opcional no cadastro. Envie ou atualize o seu aqui a qualquer momento.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={carregandoDocumento}
          onClick={abrirAlvara}
          startIcon={<Icon icon={carregandoDocumento ? "mdi:loading" : documentoAberto ? "mdi:close" : "mdi:file-eye-outline"} width={16} className={carregandoDocumento ? "animate-spin" : undefined} />}
        >
          {carregandoDocumento ? "A abrir..." : documentoAberto ? "Fechar alvará" : "Visualizar alvará"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => { const file = e.target.files?.[0]; if (file) enviarAlvara(file); }}
        />
        <Button
          size="sm"
          disabled={enviando}
          onClick={() => inputRef.current?.click()}
          startIcon={<Icon icon={enviando ? "mdi:loading" : "mdi:file-upload-outline"} width={16} className={enviando ? "animate-spin" : undefined} />}
        >
          {enviando ? "A enviar..." : "Enviar/atualizar alvará"}
        </Button>
      </div>
      {erroDocumento && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroDocumento}</p>}
      {erroEnvio && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{erroEnvio}</p>}
      {sucessoEnvio && <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">Alvará enviado com sucesso.</p>}
      {documentoAberto && (
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <iframe title="Alvará" src={documentoAberto} className="h-[70vh] w-full bg-white" />
        </div>
      )}
    </div>
  );
}
```

**Ponto de atenção para o Codex**: verifique se `user.academia` no tipo `MeuPerfilResponse` (`src/types/api.ts`) realmente expõe `codigo_academia` (é do tipo `AcademiaDetalhada`, que já é usado com esse campo em `PageContent.tsx`, então deveria bater — mas confirme com `tsc` antes de dar como certo).

### Arquivo 6/6 — `src/app/(painel)/configuracoes/AcademiaSection.tsx` (registra o card novo)

```diff
 import PasswordSettingsCard from "./PasswordSettingsCard";
+import AlvaraSettingsCard from "./AlvaraSettingsCard";
```
```diff
+        {section === "all" && <AlvaraSettingsCard />}
         {section === "all" && <PasswordSettingsCard />}
```

## 4. Validação já feita neste documento (metodologia)

Diferente da tarefa irmã do backend (validada com Go+PostgreSQL reais), aqui eu fiz **leitura cuidadosa e mapeamento exato** do código real (imports, assinaturas, componentes vizinhos usados como molde linha a linha), mas **não rodei build**. Especificamente, o que eu conferi manualmente, lendo o código-fonte real do repo (não de memória):

- `postForm` já ignora campos `undefined`/`null` ao montar o `FormData` (li a implementação exata em `services.ts`, linha ~486) — por isso não precisei mexer na lógica de montagem do form, só no tipo.
- `DocumentUpload.tsx`: a prop `required` é só cosmética (adiciona " *" ao label do botão), não gera atributo HTML `required` real — removê-la é seguro.
- `AcademiaDetalhada` (tipo usado em `PageContent.tsx`) já expõe `codigo_academia` — usado várias vezes no arquivo original.
- `documentosService.baixarAlvaraAcademia` já existe e segue exatamente o padrão de assinatura que copiei para `enviarAlvaraAcademia`.
- `useRef` já importado em `PageContent.tsx` — confirmado via grep no topo do arquivo.

## 5. Checklist final que o Codex deve rodar

- [ ] `npx tsc --noEmit` limpo (**obrigatório** — é a validação que eu não consegui rodar nesta sessão).
- [ ] `npm run build` (ou `next build`) completa sem erro.
- [ ] Cadastro de academia (admin e público) funciona sem anexar alvará.
- [ ] Cadastro com alvará continua funcionando como antes.
- [ ] Tela de detalhes da academia (admin) mostra os dois botões (visualizar/enviar) na seção Documentos.
- [ ] Configurações da academia (self-service) mostra o novo card "Alvará" quando logado como academia.
- [ ] Nenhuma referência residual a `/academia/registo-publico` ou `/dominis/academia/register` sobrou no código (`grep -r` para confirmar).

## 6. Perguntas em aberto (não bloqueiam a execução, mas o Fredy deve decidir depois)

- Vale a pena extrair `AlvaraDocumentoCard` como componente compartilhado entre a Parte 4 e a Parte 5, para eliminar a duplicação de lógica de upload/visualização? Deixei duplicado de propósito nesta entrega (ver nota na seção 3, Arquivo 4).
- O aviso retornado pelo backend (`response.aviso` / `response.data.aviso`) quando o cadastro é feito sem alvará hoje não é exibido em lugar nenhum do formulário — o `onSubmit` do `AcademiaCadastroForm` só propaga a resposta para quem o chama. Vale mostrar esse aviso na tela de confirmação de cadastro? Não implementei isso aqui por não fazer parte do pedido original ("tornar opcional + permitir upload depois").
