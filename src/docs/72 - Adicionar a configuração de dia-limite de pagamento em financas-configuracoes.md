---
criado: 2026-08-27
origem: conversa com Fredy (Claude como orquestrador — validação com npm/tsc/eslint/next build real em sandbox, Codex como executor)
status: pendente
tipo: nova_funcionalidade
depende_de: "71, no repositório spuri-backend (o backend precisa expor POST/DELETE /financeiro/mensalidades/dia-limite-cobranca antes desta tela fazer sentido em produção; nada impede aplicar este diff antes, já que ele é só aditivo)"
---

# Adicionar a configuração de "dia-limite de pagamento" em /financas/configuracoes

## 0. Leia isto primeiro — sobre esta tarefa e sobre o seu ambiente (Codex)

Claude já implementou e validou esta alteração inteira: `npm install`, `npx tsc --noEmit` (limpo), `npx eslint` nos arquivos alterados (limpo) e `npm run build` — o build chega a compilar todo o código e só falha na etapa de baixar a fonte `Outfit` do Google Fonts (`fonts.googleapis.com`), que é bloqueada no ambiente de sandbox de Claude e não tem nenhuma relação com esta mudança — o mesmo comportamento já documentado no precedente da própria tarefa 67 deste repositório.

Foi validada também depois de rebasear em cima do commit `1eb1679` (`Adicionar opcao Pendente ao filtro de estado da lista unificada de pagamentos`, PR #298), mesclado ao `main` enquanto esta tarefa estava sendo escrita — sem nenhum conflito (arquivos diferentes: aquele mexeu em `financeiroShared.tsx`, esta tarefa não toca nesse arquivo).

## 1. Prompt recomendado para executar esta tarefa

> Execute exatamente as alterações descritas neste documento, nesta ordem, sobre o `main` atual do repositório. Todas as decisões de desenho já foram tomadas e validadas por Claude (`npx tsc --noEmit`, `npx eslint` e `npm run build` — este último só falha ao baixar a fonte do Google, uma limitação de rede do ambiente, não do código). Sua tarefa é mecânica: (1) aplicar o diff da seção 3; (2) rodar `npx tsc --noEmit` e `npx eslint` nos arquivos alterados e reportar o resultado; (3) seguir o "Procedimento de conclusão" (seção 6). Não toque em nenhum arquivo fora do escopo listado na seção 5.

---

## 2. Contexto

O backend (tarefa **71** de `spuri-backend`) adicionou `POST`/`DELETE /financeiro/mensalidades/dia-limite-cobranca`, permitindo que uma academia defina um único dia do mês (1-31) usado como prazo de pagamento de toda mensalidade, em qualquer ano letivo — refletido como `paymentInfo.dueDate` nas cobranças REF (atrás de uma flag de segurança no backend, ver a tarefa 71 para o racional completo; isso não afeta esta tela, que só chama a API existente).

Esta tarefa adiciona a tela correspondente em `/financas/configuracoes`, espelhando **exatamente** o padrão já existente de "Início de cobrança fora do padrão" (`DefinirInicioCobrancaForm`, mesma página) — só que mais simples, porque o dia-limite não é versionado por ano letivo (um único valor por academia), então não há nada para buscar/selecionar antes de mostrar o formulário.

Assim como "início de cobrança", **não existe uma consulta dedicada** ao valor vigente (sem endpoint GET) — o botão de remover fica sempre disponível, e um `404` do backend ao tentar remover (nada para remover) é tratado como informação neutra, não como erro, seguindo o mesmo padrão de `removerInicioCobranca`.

---

## 3. Diff a aplicar

Arquivos: `src/types/api.ts`, `src/lib/api/services.ts`, `src/components/paineis/FinanceiroConfiguracoesPainel.tsx`.

```diff
diff --git a/src/components/paineis/FinanceiroConfiguracoesPainel.tsx b/src/components/paineis/FinanceiroConfiguracoesPainel.tsx
index fdfb757..934fcb6 100644
--- a/src/components/paineis/FinanceiroConfiguracoesPainel.tsx
+++ b/src/components/paineis/FinanceiroConfiguracoesPainel.tsx
@@ -63,7 +63,7 @@ type NivelFormState = {
 
 type FormFieldErrors = Partial<Record<"ano_academico" | "curso_id" | "valor", string>>;
 
-type Tela = "menu" | "mensalidade" | "matricula" | "inicio-cobranca" | "anular-reativar" | "regras";
+type Tela = "menu" | "mensalidade" | "matricula" | "inicio-cobranca" | "dia-limite-cobranca" | "anular-reativar" | "regras";
 
 /**
  * Painel de configurações financeiras, dividido em subtelas: cada
@@ -438,6 +438,7 @@ export default function FinanceiroConfiguracoesPainel() {
             { id: "mensalidade", icon: "mdi:calendar-month-outline", label: "Propina / mensalidade", descricao: "Definir o valor e os métodos aceites por ano/curso.", onClick: () => setTela("mensalidade"), disabled: bloquearSubtelas },
             { id: "matricula", icon: "mdi:school-outline", label: "Taxa de matrícula", descricao: "Definir o valor e os métodos aceites por ano/curso.", onClick: () => setTela("matricula"), disabled: bloquearSubtelas },
             { id: "inicio-cobranca", icon: "mdi:calendar-start", label: "Início de cobrança fora do padrão", descricao: "Ajustar a partir de qual mês a propina passa a valer num ano letivo específico.", onClick: () => setTela("inicio-cobranca"), disabled: bloquearSubtelas },
+            { id: "dia-limite-cobranca", icon: "mdi:calendar-clock-outline", label: "Dia-limite de pagamento", descricao: "Definir o dia do mês usado como prazo de pagamento da propina, em todo ano letivo.", onClick: () => setTela("dia-limite-cobranca"), disabled: bloquearSubtelas },
             { id: "anular-reativar", icon: "mdi:receipt-text-remove-outline", label: "Anular ou reativar obrigações", descricao: "Anular ou reativar mensalidades pontuais de um estudante específico.", onClick: () => setTela("anular-reativar"), disabled: bloquearSubtelas },
           ]}
         />
@@ -517,6 +518,19 @@ export default function FinanceiroConfiguracoesPainel() {
     );
   }
 
+  if (tela === "dia-limite-cobranca") {
+    return (
+      <SubtelaPanel title="Dia-limite de pagamento" icon="mdi:calendar-clock-outline" onVoltar={() => setTela("menu")}>
+        <p className="text-sm text-gray-500 dark:text-gray-400">
+          Define o dia do mês (1 a 31) usado como prazo de pagamento de toda mensalidade — o mesmo dia vale para todo mês elegível, em qualquer ano letivo. Ex.: definindo o dia 10, a mensalidade de cada mês passa a ter prazo até o dia 10 daquele mesmo mês/ano.
+        </p>
+        <div className="mt-4">
+          <DefinirDiaLimiteCobrancaForm codigoAcademia={codigoAcademia} />
+        </div>
+      </SubtelaPanel>
+    );
+  }
+
   // tela === "anular-reativar"
   return (
     <SubtelaPanel title="Anular ou reativar obrigações" icon="mdi:receipt-text-remove-outline" onVoltar={() => setTela("menu")}>
@@ -656,3 +670,89 @@ function DefinirInicioCobrancaForm({ codigoAcademia }: { codigoAcademia: string
     </div>
   );
 }
+
+/**
+ * Formulário de "dia-limite de pagamento de mensalidade". Mais simples que
+ * DefinirInicioCobrancaForm: não é versionado por ano letivo (um único
+ * valor vale para toda a academia, em qualquer ano letivo), então não há
+ * nada para buscar antes de mostrar o formulário. Assim como início de
+ * cobrança, não existe uma consulta dedicada ao valor vigente — o botão de
+ * remover fica sempre disponível e um 404 do backend (nada para remover) é
+ * tratado como informação neutra, não como erro.
+ */
+function DefinirDiaLimiteCobrancaForm({ codigoAcademia }: { codigoAcademia: string }) {
+  const [diaLimite, setDiaLimite] = useState("10");
+  const [alert, setAlert] = useState<{ variant: "success" | "error" | "info"; message: string } | null>(null);
+  const definirDiaLimite = useApi(financeiroService.definirDiaLimiteCobranca);
+  const removerDiaLimite = useApi(financeiroService.removerDiaLimiteCobranca);
+  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);
+
+  const diaValido = Number.isInteger(Number(diaLimite)) && Number(diaLimite) >= 1 && Number(diaLimite) <= 31;
+
+  const submit = async () => {
+    setAlert(null);
+    if (!diaValido) { setAlert({ variant: "error", message: "Informe um dia entre 1 e 31." }); return; }
+    try {
+      await definirDiaLimite.execute({ codigo_academia: codigoAcademia, dia_limite: Number(diaLimite) });
+      setAlert({ variant: "success", message: "Dia-limite de pagamento definido com sucesso." });
+    } catch (err) {
+      setAlert({ variant: "error", message: formatApiError(err, "Não foi possível definir o dia-limite de pagamento.") });
+    }
+  };
+
+  const removerException = async () => {
+    try {
+      await removerDiaLimite.execute({ codigo_academia: codigoAcademia });
+      setAlert({ variant: "success", message: "Dia-limite de pagamento removido — a AppyPay volta a aplicar seu prazo padrão." });
+    } catch (err) {
+      if (err instanceof ApiError && err.status === 404) {
+        setAlert({ variant: "info", message: "Não havia nenhum dia-limite de pagamento definido para esta academia." });
+        return;
+      }
+      setAlert({ variant: "error", message: formatApiError(err, "Não foi possível remover o dia-limite de pagamento.") });
+    }
+  };
+
+  return (
+    <div className="space-y-3">
+      {confirmandoRemocao && (
+        <ConfirmDialog
+          title="Remover dia-limite de pagamento"
+          message="Tem certeza que deseja remover o dia-limite de pagamento? A AppyPay volta a aplicar seu prazo padrão de expiração nas próximas cobranças por referência."
+          confirmLabel="Remover"
+          onConfirm={removerException}
+          onClose={() => setConfirmandoRemocao(false)}
+        />
+      )}
+      {alert && <Alert variant={alert.variant} title="Dia-limite de pagamento" message={alert.message} />}
+      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
+        <div>
+          <Label>Dia do mês (1 a 31)</Label>
+          <Input
+            type="number"
+            min="1"
+            max="31"
+            step={1}
+            value={diaLimite}
+            onChange={(e) => setDiaLimite(e.target.value)}
+          />
+        </div>
+        <div className="self-end">
+          <Button onClick={submit} disabled={!diaValido || definirDiaLimite.loading} startIcon={<Icon icon="mdi:calendar-clock-outline" width={16} />}>
+            Definir dia-limite
+          </Button>
+        </div>
+      </div>
+      <div className="border-t border-gray-100 pt-4 dark:border-white/[0.05]">
+        <p className="text-xs text-gray-500 dark:text-gray-400">
+          Se esta academia não deveria mais ter um dia-limite de pagamento customizado, remova-o — a AppyPay volta a aplicar seu próprio prazo padrão.
+        </p>
+        <div className="mt-2">
+          <Button size="sm" variant="danger" onClick={() => setConfirmandoRemocao(true)} disabled={removerDiaLimite.loading} startIcon={<Icon icon="mdi:delete-outline" width={14} />}>
+            {removerDiaLimite.loading ? "Removendo..." : "Remover dia-limite de pagamento"}
+          </Button>
+        </div>
+      </div>
+    </div>
+  );
+}
diff --git a/src/lib/api/services.ts b/src/lib/api/services.ts
index 6905978..e9bda9c 100644
--- a/src/lib/api/services.ts
+++ b/src/lib/api/services.ts
@@ -135,6 +135,8 @@ import type {
   RemoverMensalidadeConfiguracaoRequest,
   MesInicioCobrancaInput,
   RemoverMesInicioCobrancaRequest,
+  DiaLimiteCobrancaInput,
+  RemoverDiaLimiteCobrancaRequest,
   ObrigacaoMensalidadeInput,
   ConsultarMensalidadesEstudanteResponse,
   MensalidadePagamentoInput,
@@ -906,6 +908,9 @@ export const financeiroService = {
   definirInicioCobranca: (data: MesInicioCobrancaInput, token?: string) => api.post<void, MesInicioCobrancaInput>('/financeiro/mensalidades/inicio-cobranca', data, { token: token || tokenStorage.get() || undefined }),
   /** DELETE /financeiro/mensalidades/inicio-cobranca — reverte ao mês natural do ano letivo. */
   removerInicioCobranca: (data: RemoverMesInicioCobrancaRequest, token?: string) => api.delete<void, RemoverMesInicioCobrancaRequest>('/financeiro/mensalidades/inicio-cobranca', data, { token: token || tokenStorage.get() || undefined }),
+  definirDiaLimiteCobranca: (data: DiaLimiteCobrancaInput, token?: string) => api.post<void, DiaLimiteCobrancaInput>('/financeiro/mensalidades/dia-limite-cobranca', data, { token: token || tokenStorage.get() || undefined }),
+  /** DELETE /financeiro/mensalidades/dia-limite-cobranca — volta a usar o padrão de expiração em 72h da própria AppyPay. */
+  removerDiaLimiteCobranca: (data: RemoverDiaLimiteCobrancaRequest, token?: string) => api.delete<void, RemoverDiaLimiteCobrancaRequest>('/financeiro/mensalidades/dia-limite-cobranca', data, { token: token || tokenStorage.get() || undefined }),
   anularObrigacoes: (data: ObrigacaoMensalidadeInput, token?: string) => api.post<void, ObrigacaoMensalidadeInput>('/financeiro/mensalidades/obrigacoes/anular', data, { token: token || tokenStorage.get() || undefined }),
   reativarObrigacoes: (data: ObrigacaoMensalidadeInput, token?: string) => api.post<void, ObrigacaoMensalidadeInput>('/financeiro/mensalidades/obrigacoes/reativar', data, { token: token || tokenStorage.get() || undefined }),
   consultarMensalidadesEstudante: (codigoEstudante: string, token?: string) => api.get<ConsultarMensalidadesEstudanteResponse>(`/financeiro/mensalidades/estudante/${encodeURIComponent(codigoEstudante)}`, { token: token || tokenStorage.get() || undefined }),
diff --git a/src/types/api.ts b/src/types/api.ts
index e39d4fd..6d4afee 100644
--- a/src/types/api.ts
+++ b/src/types/api.ts
@@ -1398,6 +1398,23 @@ export interface RemoverMesInicioCobrancaRequest {
   ano_letivo: string;
 }
 
+/**
+ * Corpo de POST /financeiro/mensalidades/dia-limite-cobranca
+ * (finance.DefinirDiaLimiteCobranca). Define o dia do mês (1-31) usado como
+ * prazo de pagamento (dueDate do REF) de toda mensalidade elegível desta
+ * academia, em qualquer ano letivo — ao contrário de MesInicioCobrancaInput,
+ * não é versionado por ano_letivo.
+ */
+export interface DiaLimiteCobrancaInput {
+  codigo_academia: string;
+  dia_limite: number;
+}
+
+/** Corpo de DELETE /financeiro/mensalidades/dia-limite-cobranca (finance.RemoveDiaLimiteCobranca). Reverte ao padrão de expiração em 72h da própria AppyPay. */
+export interface RemoverDiaLimiteCobrancaRequest {
+  codigo_academia: string;
+}
+
 export interface ObrigacaoMensalidadeInput {
   codigo_estudante: string;
   codigo_academia: string;
```

---

## 4. Resumo do que o diff faz (para revisão, não para re-decidir nada)

1. **`src/types/api.ts`**: dois tipos novos, `DiaLimiteCobrancaInput` (`{codigo_academia, dia_limite}`) e `RemoverDiaLimiteCobrancaRequest` (`{codigo_academia}`) — espelham `MesInicioCobrancaInput`/`RemoverMesInicioCobrancaRequest` já existentes.
2. **`src/lib/api/services.ts`**: duas funções novas em `financeiroService`, `definirDiaLimiteCobranca` (POST) e `removerDiaLimiteCobranca` (DELETE), chamando as rotas do backend — mesmo padrão de `definirInicioCobranca`/`removerInicioCobranca`.
3. **`src/components/paineis/FinanceiroConfiguracoesPainel.tsx`**:
   - `Tela` ganha o valor `"dia-limite-cobranca"`.
   - Um novo card no menu principal, logo depois de "Início de cobrança fora do padrão".
   - Um novo bloco de subtela (`if (tela === "dia-limite-cobranca")`), com o mesmo texto explicativo curto que os demais blocos.
   - Um novo componente `DefinirDiaLimiteCobrancaForm`: um único `Input type="number"` (1-31) com `Label`, um botão "Definir dia-limite", e — depois de uma linha divisória, como nos demais formulários da página — um botão "Remover dia-limite de pagamento" com `ConfirmDialog` de confirmação. Erros são formatados com `formatApiError` e mostrados em `Alert`, exatamente como os outros formulários da mesma página; um `404` ao remover mostra um `Alert` variant `"info"` em vez de `"error"`.

Nenhum componente/utilitário compartilhado (`Button`, `Input`, `Label`, `Alert`, `ConfirmDialog`, `SubtelaPanel`, `useApi`, `formatApiError`, `ApiError`) precisou de alteração — todos já existiam e já eram usados pelo formulário de "início de cobrança" que serviu de modelo.

---

## 5. Fora de escopo

- Qualquer mudança no backend — isso é a tarefa **71**, em `spuri-backend`.
- Um endpoint/tela para **consultar** o dia-limite vigente antes de definir um novo — não existe também para "início de cobrança" (mesmo precedente); pode ser adicionado depois, como melhoria incremental, se fizer falta na prática.
- Qualquer mudança em `financeiroShared.tsx` ou na lista unificada de pagamentos — fora do escopo desta tela de configuração.
- Validação de que o backend realmente está enviando `dueDate` para a AppyPay — isso depende da flag `APPYPAY_REF_DUEDATE_ENABLED` do backend (tarefa 71, seção 2.4), que fica desligada por padrão até confirmação manual; esta tela funciona (define/remove a configuração) independentemente do estado dessa flag.

## 6. Critérios de aceite

1. O diff da seção 3 aplicado exatamente como descrito.
2. `npx tsc --noEmit` sem erros.
3. `npx eslint` sem avisos nos três arquivos alterados.
4. `npm run build` chega a compilar o código (falhar só na etapa de fonte do Google é aceitável e esperado no ambiente do Codex, se o mesmo bloqueio de rede se aplicar).
5. A tela nova segue visualmente o mesmo padrão das demais subtelas de `/financas/configuracoes` (mesmos componentes, mesma estrutura de card/botão/confirmação).
6. Nenhum arquivo fora da lista da seção 3 alterado.

### Procedimento de conclusão

Ao finalizar:

1. Atualizar o título interno deste documento para `# Adicionar a configuração de "dia-limite de pagamento" em /financas/configuracoes (feito)`;
2. Alterar o front matter para `status: feito` e adicionar `concluido: <data>`;
3. Mover este arquivo para o local usado pelas tarefas já concluídas neste repositório (mesma pasta de `67 - Consumir novo modelo de estados de cobranca e remover pendencia_sem_cobranca.md`).
