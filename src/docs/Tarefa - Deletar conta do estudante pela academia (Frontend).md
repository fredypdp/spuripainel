---
criado: 2026-09-11
origem: Fredy + Claude (orquestração)
status: feito
depende_de: "Tarefa 98 (backend/spuri-backend) - Deleção da conta do estudante pela academia que o cadastrou e documento de BI vira oficial — precisa estar mergeada e implantada antes desta, porque esta tarefa chama DELETE /academia/estudante/:codigo/conta, uma rota nova que só existe depois daquela."
---

# Deletar conta do estudante pela academia que o cadastrou (Frontend)

## 0. Prompt recomendado para executar esta tarefa

> Aplique exatamente o que está descrito nesta tarefa, sem replanejar nem propor alternativas de desenho — a decisão de design já foi tomada e o código já foi testado com `tsc --noEmit` e `eslint` limpos (ver seção 2 e seção 5). Para os blocos "Diff exato", localize o trecho `-` (removido) exatamente como está no arquivo e substitua pelo trecho `+` (adicionado) — não reescreva o arquivo inteiro, não "melhore" nada além do que está pedido. Leia a seção 3 (fora de escopo) antes de começar — em particular, **não mexa em nada relacionado à exibição de documentos do estudante**, isso já funciona sem nenhuma mudança de frontend (explicado ali). Ao final, rode `npx tsc --noEmit` e `npx eslint <arquivos alterados>` e resolva qualquer erro antes de finalizar. Confira o checklist de aceite (seção 6) ao final.

## 1. Contexto

O backend (Tarefa 98, `spuri-backend`) ganhou uma rota nova: `DELETE /academia/estudante/:codigo/conta`. Ela permite que a academia **atualmente vinculada** a um estudante (`status` `'ativo'` ou `'pendente_documentos'`) delete a conta dele diretamente — mas **só** quando essa mesma academia foi quem **originalmente cadastrou** o estudante no Spuri (checado no backend via histórico do ledger; se o estudante foi transferido de outra academia, a API recusa com `403`). Isso é complementar à autodeleção que já existe para o próprio estudante (`DELETE /estudante/conta`, que já está implementada no frontend em `src/app/(painel)/perfil/PageContent.tsx`, componente `DangerZoneEstudante` — usei esse componente como referência direta de estilo/UX para esta tarefa).

**Investigação que já fiz:** a tela de detalhes de um estudante (visão da academia) é o componente `TelaDetalhesEstudante`, dentro de `src/app/(painel)/estudantes/PageContent.tsx` — é aberta a partir da listagem de estudantes (`handleVerDetalhes`) e mostra dados pessoais, vínculo atual e documentos. É o lugar certo para a nova ação, junto das demais informações do estudante que a academia já vê ali. Esse mesmo componente é reaproveitado para a visão do **admin** (prop `isAdmin`) — a ação nova só deve aparecer na visão da academia (`!isAdmin`), porque a rota do backend é exclusiva de academia (não existe uma rota equivalente para admin).

O frontend **não tem visibilidade prévia** de "esta academia foi quem cadastrou o estudante" — essa informação só existe no ledger do backend e só é resolvida no momento da chamada. Por isso o botão fica sempre visível (quando o estudante está vinculado a esta academia), e um `403` do backend é tratado como qualquer outro erro de validação — mensagem exibida no modal, nada mais sofisticado que isso. Não foi pedida nem é necessária nenhuma mudança no backend para expor essa informação antecipadamente.

## 2. Decisões de design já tomadas (não repensar)

1. **Reaproveita `DesativarRequest` (`{ motivo: string }`)** — mesmo tipo já usado por `estudanteService.deletarContaEstudante`, `academiaService.deletarAcademia`, `academiaService.deletarAdmin` — não é preciso criar um tipo novo.
2. **Reaproveita o padrão visual "Zona de Perigo"** de `perfil/PageContent.tsx` (`DangerZoneEstudante`) quase literalmente — mesma estrutura de card vermelho, `Modal` + `useModal`, textarea de motivo obrigatório, mensagem de erro via `formatApiError`.
3. **Botão desabilitado quando o estudante não está vinculado a esta academia no momento** (`status !== 'ativo' && status !== 'pendente_documentos'`) — mesmo critério de "vinculado" usado em todo o resto do app e do backend. Quando desabilitado, mostra uma mensagem explicando por quê.
4. **Erro 403 (academia não foi quem cadastrou) não tem tratamento especial** — aparece como qualquer outro erro de validação, com a mensagem que o backend já manda ("apenas a academia que cadastrou o estudante no Spuri pode deletar a conta dele"). Não foi pedido nenhum indicador visual antecipado (ex. ícone de cadeado) para esse caso — ver seção 3.
5. **Depois de deletar com sucesso**, volta para a listagem e recarrega os dados — mesmo padrão já usado por `TelaDocumentacaoEstudante` (prop `onConcluido`). Aqui a prop nova se chama `onEstudanteDeletado`.

## 3. Fora de escopo (não implementar aqui)

1. **Nenhuma mudança relacionada à exibição/download de documentos do estudante.** A Tarefa 98 (backend) corrigiu um bug em que o documento do BI enviado numa solicitação de edição nunca virava o documento oficial do estudante. A tela de documentos já existente (mesmo componente `TelaDetalhesEstudante`, seção "Documentos disponíveis") já itera genericamente sobre `estudante.documentos` e já tem `"bi_estudante"` mapeado em `DOCUMENT_LABELS` como "BI do estudante" — **vai passar a mostrar o documento automaticamente, sem nenhuma mudança de código aqui**, assim que o backend da Tarefa 98 estiver implantado. Não crie nenhum código para "garantir" que isso apareça — já funciona.
2. **Nenhum indicador visual antecipado de "esta academia pode/não pode deletar este estudante"** (ex. iríamos precisar de uma rota nova no backend só para isso, o que não foi pedido). O botão fica sempre visível quando o estudante está vinculado; o `403`, se acontecer, aparece como mensagem de erro normal no modal.
3. **Nenhuma mudança na visão do admin** (`isAdmin === true`) — a ação nova é exclusiva da visão da academia.

## 4. Diffs exatos

Localize o bloco `-` exatamente como está no arquivo atual e substitua pelo bloco `+`. Contexto (linhas sem `+`/`-`) é só para localização.

### 4.1 `src/lib/api/services.ts`

Adiciona o método novo logo após `reprovarRevinculacao`, dentro de `academiaService`.
```diff
diff --git a/src/lib/api/services.ts b/src/lib/api/services.ts
index d736065..f9eeecc 100644
--- a/src/lib/api/services.ts
+++ b/src/lib/api/services.ts
@@ -1571,6 +1571,22 @@ export const academiaService = {
       { token: token || tokenStorage.get() || undefined }
     ),
 
+  /**
+   * DELETE /academia/estudante/:codigo/conta — Tarefa 98. Permite que a
+   * academia atualmente vinculada ao estudante delete a conta dele
+   * diretamente (sem exigir desvinculação prévia, ao contrário de
+   * estudanteService.deletarContaEstudante) — mas só quando essa mesma
+   * academia foi a que ORIGINALMENTE cadastrou o estudante no Spuri. Uma
+   * academia que só recebeu o estudante por revinculação/transferência
+   * recebe 403 (ver formatApiError para exibir a mensagem do backend).
+   */
+  deletarContaEstudantePorAcademia: (codigoEstudante: string, data: DesativarRequest, token?: string) =>
+    api.delete<{ message: string; codigo_estudante: string }, DesativarRequest>(
+      `/academia/estudante/${encodeURIComponent(codigoEstudante)}/conta`,
+      data,
+      { token: token || tokenStorage.get() || undefined }
+    ),
+
   // ── Cursos ────────────────────────────────────────────────────────
 
   // ── Serviços Extras ───────────────────────────────────────────────
```

### 4.2 `src/app/(painel)/estudantes/PageContent.tsx`

Quatro mudanças no mesmo arquivo: (a) novos imports; (b) nova prop `onEstudanteDeletado` em `TelaDetalhesEstudante`; (c) novo estado/hook/handler dentro do componente; (d) nova seção "Zona de Perigo" no JSX, visível só para a academia (`!isAdmin`); (e) o call site do componente passando a nova prop.
```diff
diff --git a/src/app/(painel)/estudantes/PageContent.tsx b/src/app/(painel)/estudantes/PageContent.tsx
index d6c5b6c..d54f2f6 100644
--- a/src/app/(painel)/estudantes/PageContent.tsx
+++ b/src/app/(painel)/estudantes/PageContent.tsx
@@ -4,8 +4,12 @@ import { useState, useEffect, useCallback, useRef, useMemo } from "react";
 import Link from "next/link";
 import PageBreadcrumb from "@/components/common/PageBreadCrumb";
 import { useApi, consultasService, tokenStorage, academiaService, documentosService } from '@/lib/api';
+import { formatApiError } from '@/lib/api/client';
 import Button from "@/components/ui/button/Button";
-import { ConsultarEstudanteResponse, EstudanteDetalhado, Turma, Curso, formatAnoAcademico } from '@/types/api';
+import { Modal } from "@/components/ui/modal";
+import Label from "@/components/form/Label";
+import { useModal } from "@/hooks/useModal";
+import { ConsultarEstudanteResponse, EstudanteDetalhado, Turma, Curso, formatAnoAcademico, DesativarRequest } from '@/types/api';
 import { useUserType } from "@/hooks/useRoutePermission";
 import { useUserCookie } from "@/hooks/useUserCookie";
 import Icon from "@/components/ui/Icon";
@@ -450,8 +454,8 @@ function BotaoVoltarEstudantes({ onVoltar }: { onVoltar: () => void }) {
   );
 }
 
-function TelaDetalhesEstudante({ estudante, isAdmin, academiaNivel, nivelEscolar, cursos, onVoltar }: {
-  estudante: EstudanteDetalhado; isAdmin: boolean; academiaNivel?: string; nivelEscolar?: string; cursos: Curso[]; onVoltar: () => void;
+function TelaDetalhesEstudante({ estudante, isAdmin, academiaNivel, nivelEscolar, cursos, onVoltar, onEstudanteDeletado }: {
+  estudante: EstudanteDetalhado; isAdmin: boolean; academiaNivel?: string; nivelEscolar?: string; cursos: Curso[]; onVoltar: () => void; onEstudanteDeletado?: () => void;
 }) {
   const [estudanteConsultado, setEstudanteConsultado] = useState<EstudanteDetalhes>(estudante);
   const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
@@ -461,6 +465,12 @@ function TelaDetalhesEstudante({ estudante, isAdmin, academiaNivel, nivelEscolar
   const [carregandoDocumento, setCarregandoDocumento] = useState<string | null>(null);
   const [baixandoDocumento, setBaixandoDocumento] = useState<string | null>(null);
 
+  // Tarefa 98: deleção da conta pela academia que cadastrou o estudante.
+  const modalDelecao = useModal();
+  const { loading: deletando, execute: executarDelecao } = useApi(academiaService.deletarContaEstudantePorAcademia);
+  const [motivoDelecao, setMotivoDelecao] = useState('');
+  const [erroDelecao, setErroDelecao] = useState('');
+
   useEffect(() => {
     let mounted = true;
 
@@ -546,6 +556,22 @@ function TelaDetalhesEstudante({ estudante, isAdmin, academiaNivel, nivelEscolar
     }
   };
 
+  const vinculadoNestaAcademia = estudanteConsultado.status === 'ativo' || estudanteConsultado.status === 'pendente_documentos';
+
+  const handleDeletarConta = async (event: React.FormEvent) => {
+    event.preventDefault();
+    if (!motivoDelecao.trim()) return;
+    setErroDelecao('');
+    try {
+      const data: DesativarRequest = { motivo: motivoDelecao.trim() };
+      await executarDelecao(estudanteConsultado.codigo_estudante, data, tokenStorage.get() || undefined);
+      modalDelecao.closeModal();
+      onEstudanteDeletado?.();
+    } catch (err) {
+      setErroDelecao(formatApiError(err, 'Não foi possível deletar a conta deste estudante.'));
+    }
+  };
+
   return (
     <div className="space-y-5">
       <BotaoVoltarEstudantes onVoltar={onVoltar} />
@@ -630,6 +656,44 @@ function TelaDetalhesEstudante({ estudante, isAdmin, academiaNivel, nivelEscolar
           </div>
         )}
       </section>
+      {!isAdmin && (
+        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/60 dark:bg-red-900/10 lg:p-6">
+          <h4 className="text-lg font-semibold text-red-800 dark:text-red-200">Zona de Perigo</h4>
+          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
+            Deletar a conta deste estudante é uma ação irreversível de desativação. O histórico acadêmico de notas e faltas permanece preservado para consultas futuras. Isto só é permitido se a sua academia foi quem cadastrou este estudante no Spuri originalmente — se ele foi transferido de outra academia, a ação será recusada.
+          </p>
+          {!vinculadoNestaAcademia && (
+            <p className="mt-3 text-sm text-red-700 dark:text-red-300">Este estudante não está vinculado a esta academia no momento, então a conta não pode ser deletada por aqui.</p>
+          )}
+          <div className="mt-4">
+            <Button size="sm" variant="danger" disabled={!vinculadoNestaAcademia} onClick={() => { setErroDelecao(''); setMotivoDelecao(''); modalDelecao.openModal(); }}>
+              Deletar conta do estudante
+            </Button>
+          </div>
+          <Modal isOpen={modalDelecao.isOpen} onClose={modalDelecao.closeModal} className="max-w-[540px] p-6 lg:p-10">
+            <form onSubmit={handleDeletarConta} className="space-y-4">
+              <h4 className="text-lg font-medium text-gray-800 dark:text-white/90">Confirmar deleção da conta do estudante</h4>
+              <p className="text-sm text-gray-600 dark:text-gray-300">
+                A conta de {estudanteConsultado.nome} será desativada. Registros acadêmicos já lançados continuarão guardados.
+              </p>
+              <Label>Motivo *</Label>
+              <textarea
+                className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm dark:border-white/[0.05] dark:bg-white/[0.03]"
+                rows={4}
+                value={motivoDelecao}
+                onChange={(e) => setMotivoDelecao(e.target.value)}
+                required
+                disabled={deletando}
+              />
+              {erroDelecao && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erroDelecao}</p>}
+              <div className="flex justify-end gap-3">
+                <Button size="sm" variant="outline" onClick={modalDelecao.closeModal} disabled={deletando}>Cancelar</Button>
+                <Button size="sm" variant="danger" disabled={deletando}>{deletando ? 'Deletando...' : 'Deletar conta'}</Button>
+              </div>
+            </form>
+          </Modal>
+        </section>
+      )}
     </div>
   );
 }
@@ -944,7 +1008,7 @@ export default function Estudantes() {
         )}
 
         {modoTela === 'detalhes' && estudanteSelecionado && (
-          <TelaDetalhesEstudante estudante={estudanteSelecionado} isAdmin={!!isAdmin} academiaNivel={academiaNivel} nivelEscolar={nivelEscolar} cursos={cursos} onVoltar={handleVoltarLista} />
+          <TelaDetalhesEstudante estudante={estudanteSelecionado} isAdmin={!!isAdmin} academiaNivel={academiaNivel} nivelEscolar={nivelEscolar} cursos={cursos} onVoltar={handleVoltarLista} onEstudanteDeletado={() => { handleVoltarLista(); carregarLista(); }} />
         )}
 
         {modoTela === 'documentacao' && estudanteSelecionado && (
```

## 5. Validação já realizada

Ambiente: Node 22.22.2, `npm install` completo (803 pacotes) no meu sandbox, a partir de um clone atualizado de `origin/main` (inclui o módulo de comunicação e a sanitização de mensagens técnicas mescladas durante esta sessão — confirmei que nenhum dos arquivos que este documento altera foi tocado por esses commits, zero conflito).

- **Baseline antes de qualquer mudança:** `npx tsc --noEmit` e `npx eslint "src/app/(painel)/estudantes/PageContent.tsx" src/lib/api/services.ts` — ambos limpos, zero erros/avisos.
- **Depois das mudanças desta tarefa:** `npx tsc --noEmit` e o mesmo `eslint` acima — ambos continuam limpos, zero erros/avisos.
- **`npm run build`:** falha no meu sandbox só por bloqueio de rede a `fonts.googleapis.com` (`next/font` tentando buscar a fonte "Outfit" do Google Fonts) — erro de infraestrutura do meu ambiente, não do código; não existe nenhum outro erro no output. Se o ambiente do Codex também não tiver acesso a `fonts.googleapis.com`, espere o mesmo erro nesse mesmo ponto (build do layout raiz, não relacionado a nada desta tarefa) — não é motivo para reverter nada aqui. Se tiver acesso à internet normalmente, o build deve passar sem esse erro.

## 6. Checklist de aceite

- [ ] `src/lib/api/services.ts`: `academiaService.deletarContaEstudantePorAcademia` adicionado (seção 4.1).
- [ ] `src/app/(painel)/estudantes/PageContent.tsx`: imports novos (`formatApiError`, `Modal`, `Label`, `useModal`, `DesativarRequest`); prop `onEstudanteDeletado` em `TelaDetalhesEstudante`; estado/hook/handler novos; seção "Zona de Perigo" no JSX (só quando `!isAdmin`); call site atualizado (seção 4.2).
- [ ] `npx tsc --noEmit` sem erro.
- [ ] `npx eslint "src/app/(painel)/estudantes/PageContent.tsx" src/lib/api/services.ts` sem erro.
- [ ] Nenhum arquivo relacionado a documentos (`documento_download`, `DOCUMENT_LABELS`, `listarDocumentosDisponiveis`) foi tocado — não era necessário (seção 3, item 1).
- [ ] Nenhuma mudança na visão do admin.

## 7. Procedimento de conclusão

1. Rodar os comandos da seção 5 e confirmar que passam (exceto `npm run build`, se o mesmo bloqueio de rede a fontes do Google acontecer no ambiente do Codex — nesse caso, documentar isso no PR e seguir em frente, igual ao que já foi feito aqui).
2. Testar manualmente no navegador (se possível): abrir um estudante vinculado como academia, confirmar que o botão "Deletar conta do estudante" aparece e funciona; abrir um estudante desvinculado, confirmar que o botão aparece desabilitado com a mensagem explicativa; como admin, confirmar que a seção "Zona de Perigo" não aparece.
3. Fazer commit das mudanças.
4. Atualizar o front-matter deste arquivo: `status: feito`.
