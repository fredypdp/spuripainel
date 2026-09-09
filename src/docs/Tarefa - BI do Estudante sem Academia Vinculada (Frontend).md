---
criado: 2026-09-08
origem: Fredy + Claude (orquestração)
status: pronta para implementação — TypeScript e ESLint já validados, zero erros
depende_de: "Tarefa (backend/spuri-backend) - Bloquear type, validar dependências ao trocar nivel_escolar e autoatualização de BI sem academia — precisa estar mergeada e implantada antes desta, porque esta tarefa chama PUT /estudante/bilhete-identidade, uma rota nova que só existe depois daquela."
---

# BI do estudante sem academia vinculada (Frontend)

## Prompt recomendado para executar esta tarefa

> Aplique exatamente o que está descrito nesta tarefa, sem replanejar nem propor alternativas de desenho — a decisão de design já foi tomada e o código já foi testado com `tsc --noEmit` e `eslint` limpos (ver seção 2 e seção 5). Siga a ordem das seções. Para blocos "Localizar/Substituir", localize o trecho exato indicado (é uma cópia literal do arquivo atual) e substitua pelo novo trecho — não reescreva o arquivo inteiro, e não "melhore" nada além do que está pedido aqui. Ao final, rode `npx tsc --noEmit` e `npx eslint <arquivos alterados>` e resolva qualquer erro antes de finalizar. Confira o checklist de aceite (seção 6) ao final.

## 1. Contexto

O backend ganhou uma rota nova, `PUT /estudante/bilhete-identidade`, que permite ao estudante atualizar o próprio BI **sem aprovação**, mas **só quando ele não está vinculado a nenhuma academia no momento** (`status` do estudante é `'inativo'` — nunca `'ativo'` nem `'pendente_documentos'`). Quando o estudante **está** vinculado, o caminho continua sendo o que já existe: `POST /estudante/solicitacoes-edicao/bilhete-identidade`, que exige um PDF comprovativo e aprovação da academia.

**Importante — investigação que já fiz e que evita um erro comum aqui:** o arquivo `src/app/(painel)/configuracoes/EstudanteSection.tsx` **não é usado em nenhum lugar do app** (não tem nenhum import dele em lugar nenhum — é código morto). A tela real de "meus dados" do estudante é `src/app/(painel)/configuracoes/personalizar/PageContent.tsx` (linkada em `src/layout/AppSidebar.tsx`), e ela **já está correta e funcional** para `nome`, `data_nascimento` e `bilhete_identidade_encarregado` — já usa `estudanteService.criarSolicitacaoEdicao` com upload de PDF. **Não mexer em `EstudanteSection.tsx`** — está fora do escopo desta tarefa e não afeta nada visível no app.

O único ajuste necessário é em como o campo `bilhete_identidade` é renderizado dentro de `personalizar/PageContent.tsx`: hoje ele sempre usa o card de solicitação com upload de PDF, mesmo para um estudante sem academia vinculada — e, depois da tarefa de backend, essa tentativa passaria a falhar com erro 400 para esse caso. Esta tarefa torna esse card condicional.

## 2. Decisões de design já tomadas (não repensar)

1. **`bilhete_identidade` sai da lista genérica `sensitiveStudentFields`** (que é mapeada automaticamente para o card de solicitação) e passa a ser renderizado por um componente próprio, `StudentBilheteIdentidadeCard`, que decide entre os dois caminhos.

2. **O sinal de "vinculado" no frontend é `user.estudante?.status === "ativo" || user.estudante?.status === "pendente_documentos"`** — mesmo critério exato usado no backend (`Status IN ('ativo', 'pendente_documentos')`). O tipo `StatusGeral` já existe em `src/types/api.ts` (`'inativo' | 'ativo' | 'arquivado' | 'pendente_documentos'`) e já é exposto em `MeuPerfilResponse.estudante.status` — não precisa de nenhum campo novo vindo da API.

3. **`nome`, `data_nascimento` e `bilhete_identidade_encarregado` não mudam.** Continuam sempre exigindo vínculo ativo (é assim que o backend já funciona e continua funcionando) — só `bilhete_identidade` ganha o caminho alternativo. Não estender esse padrão para os outros 3 campos.

4. **Quando vinculado**: renderiza exatamente o mesmo `StudentEditRequestCard` que já existe, sem nenhuma mudança de comportamento — só passa a ser chamado explicitamente para o campo de BI em vez de vir do `.map()` genérico.

5. **Quando não vinculado**: um card novo, mais simples — só um campo de texto e um botão "Guardar BI", sem upload de PDF (não faz sentido pedir documento comprovativo numa rota que a API já aceita sem aprovação). Estilo visual idêntico a `StudentGuardianPhoneCard` (mesmo componente já existente na mesma tela, para o campo "telefone do encarregado" — mesmo padrão "campo único + botão", sem upload).

6. **Nova função de serviço `estudanteService.atualizarBilheteIdentidadeSemAcademia`**, seguindo exatamente o mesmo padrão de `atualizarTelefoneEncarregado` (`PUT` simples, sem `FormData`, porque não há upload de arquivo).

## 3. Fora de escopo (não implementar)

- Não mexer em `EstudanteSection.tsx` (é código morto, não usado em lugar nenhum — ver seção 1).
- Não estender o caminho direto (sem aprovação) para `nome`, `data_nascimento` ou `bilhete_identidade_encarregado`.
- Não mudar o visual/comportamento do `StudentEditRequestCard` existente.
- Não adicionar nenhuma tela nova nem rota nova de navegação — tudo acontece dentro da tela `personalizar` já existente.
- Não usar os componentes de `src/components/ui/typography/Typography.tsx` nestes componentes — eles já seguem o padrão de classes Tailwind manuais usado no resto deste arquivo (`text-gray-800 dark:text-white`, etc.), e misturar os dois padrões no mesmo arquivo pioraria a consistência, não melhoraria.

## 4. Implementação

### 4.1 Novo tipo de request

Arquivo: `src/types/api.ts`

**Localizar:**
```typescript
export interface AtualizarTelefoneEncarregadoEstudanteRequest {
  telefone_encarregado: string;
}
```

**Substituir por:**
```typescript
export interface AtualizarTelefoneEncarregadoEstudanteRequest {
  telefone_encarregado: string;
}

/**
 * PUT /estudante/bilhete-identidade — autoatualização do BI do próprio
 * estudante, sem aprovação. Só é aceita pela API quando o estudante NÃO
 * está vinculado a uma academia no momento (status 'inativo'). Quando
 * vinculado (status 'ativo' ou 'pendente_documentos'), use
 * criarSolicitacaoEdicao('bilhete_identidade', ...) em vez desta.
 */
export interface AtualizarBilheteIdentidadeSemAcademiaRequest {
  bilhete_identidade: string;
}
```

### 4.2 Nova função de serviço

Arquivo: `src/lib/api/services.ts`

**Localizar** (no bloco de imports de tipos, no topo do arquivo):
```typescript
  AtualizarTelefoneEncarregadoEstudanteRequest,
```

**Substituir por:**
```typescript
  AtualizarBilheteIdentidadeSemAcademiaRequest,
  AtualizarTelefoneEncarregadoEstudanteRequest,
```

**Localizar** (dentro de `estudanteService`, logo depois de `atualizarTelefoneEncarregado`):
```typescript
  atualizarTelefoneEncarregado: (data: AtualizarTelefoneEncarregadoEstudanteRequest, token?: string) =>
    api.put<{ message: string }>(
      '/estudante/encarregado/telefone',
      prepareAtualizarTelefoneEncarregadoEstudante(data),
      { token: token || tokenStorage.get() || undefined }
    ),
```

**Substituir por:**
```typescript
  atualizarTelefoneEncarregado: (data: AtualizarTelefoneEncarregadoEstudanteRequest, token?: string) =>
    api.put<{ message: string }>(
      '/estudante/encarregado/telefone',
      prepareAtualizarTelefoneEncarregadoEstudante(data),
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Autoatualização do BI sem aprovação — só funciona quando o estudante
   * não está vinculado a uma academia no momento (status 'inativo'). Com
   * academia vinculada, a API rejeita e o caminho correto é
   * criarSolicitacaoEdicao('bilhete_identidade', ...).
   */
  atualizarBilheteIdentidadeSemAcademia: (data: AtualizarBilheteIdentidadeSemAcademiaRequest, token?: string) =>
    api.put<{ message: string; bilhete_identidade: string }>(
      '/estudante/bilhete-identidade',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),
```

(`import ... AtualizarTelefoneEncarregadoEstudanteRequest` pode não estar exatamente nessa posição no bloco de imports — se `str_replace`/busca exata falhar, procure a linha que importa `AtualizarTelefoneEncarregadoEstudanteRequest` de `@/types/api` e adicione `AtualizarBilheteIdentidadeSemAcademiaRequest` na linha imediatamente acima, em ordem alfabética, mesmo padrão do resto do bloco.)

### 4.3 `personalizar/PageContent.tsx` — separar `bilhete_identidade` da lista genérica

Arquivo: `src/app/(painel)/configuracoes/personalizar/PageContent.tsx`

**Localizar:**
```typescript
const sensitiveStudentFields: Array<{ campo: CampoEdicaoDadoEstudante; key: keyof DadosForm; label: string; type?: string }> = [
  { campo: "nome", key: "nome", label: "Nome" },
  { campo: "data_nascimento", key: "data_nascimento", label: "Data de nascimento", type: "date" },
  { campo: "bilhete_identidade", key: "bilhete_identidade", label: "BI do estudante" },
  { campo: "bilhete_identidade_encarregado", key: "bilhete_identidade_encarregado", label: "BI do encarregado" },
];
```

**Substituir por:**
```typescript
const sensitiveStudentFields: Array<{ campo: CampoEdicaoDadoEstudante; key: keyof DadosForm; label: string; type?: string }> = [
  { campo: "nome", key: "nome", label: "Nome" },
  { campo: "data_nascimento", key: "data_nascimento", label: "Data de nascimento", type: "date" },
  { campo: "bilhete_identidade_encarregado", key: "bilhete_identidade_encarregado", label: "BI do encarregado" },
];

// BI do estudante é tratado à parte (fora de sensitiveStudentFields) porque,
// diferente dos outros 3 campos sensíveis, tem dois caminhos possíveis:
// solicitação com aprovação (vinculado a uma academia) ou autoatualização
// direta (sem academia vinculada no momento). Ver StudentBilheteIdentidadeCard.
const bilheteIdentidadeField: (typeof sensitiveStudentFields)[number] = {
  campo: "bilhete_identidade",
  key: "bilhete_identidade",
  label: "BI do estudante",
};
```

### 4.4 Novos componentes

Ainda no mesmo arquivo, o componente `StudentEditRequestCard` já existente termina numa linha assim (é uma linha só, bem longa — abaixo mostro só o começo e o fim para você localizar; não precisa copiar essa linha, é só a âncora):

**Localizar** (a linha inteira do `return` de `StudentEditRequestCard`, seguida da chave de fechamento da função e uma linha em branco):
```typescript
  return <form onSubmit={submit} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"><div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end"><Field id={`personalizar-${field.campo}`} label={field.label} type={field.type} value={value} disabled={saving} onChange={setValue} /><div className="flex flex-col gap-2 md:w-64"><input aria-label={`Documento comprovativo para ${field.label}`} type="file" accept="application/pdf,.pdf" disabled={saving} onChange={(event) => setDocumento(event.target.files?.[0] ?? null)} className="block w-full text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-medium file:text-brand-600 hover:file:bg-brand-100 disabled:opacity-60 dark:text-gray-400 dark:file:bg-brand-500/10 dark:file:text-brand-300" /><button type="submit" disabled={saving} className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{saving ? "Enviando..." : "Enviar solicitação"}</button></div></div>{error && <div className="mt-3"><Alert title="Erro" message={error} variant="error" /></div>}{success && <div className="mt-3"><Alert title="Solicitação enviada" message={success} variant="success" /></div>}</form>;
}

function StudentGuardianPhoneCard({ initialValue, onUpdated }: { initialValue: string; onUpdated: () => Promise<unknown> | void }) {
```

**Substituir por** (mantém a linha do `StudentEditRequestCard` idêntica, só insere os dois componentes novos entre ela e `StudentGuardianPhoneCard`):
```typescript
  return <form onSubmit={submit} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"><div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end"><Field id={`personalizar-${field.campo}`} label={field.label} type={field.type} value={value} disabled={saving} onChange={setValue} /><div className="flex flex-col gap-2 md:w-64"><input aria-label={`Documento comprovativo para ${field.label}`} type="file" accept="application/pdf,.pdf" disabled={saving} onChange={(event) => setDocumento(event.target.files?.[0] ?? null)} className="block w-full text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-medium file:text-brand-600 hover:file:bg-brand-100 disabled:opacity-60 dark:text-gray-400 dark:file:bg-brand-500/10 dark:file:text-brand-300" /><button type="submit" disabled={saving} className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{saving ? "Enviando..." : "Enviar solicitação"}</button></div></div>{error && <div className="mt-3"><Alert title="Erro" message={error} variant="error" /></div>}{success && <div className="mt-3"><Alert title="Solicitação enviada" message={success} variant="success" /></div>}</form>;
}

// Autoatualização direta do BI (sem aprovação) — só é usada quando o
// estudante não está vinculado a nenhuma academia no momento. Espelha
// StudentGuardianPhoneCard (mesmo padrão de "campo único + botão salvar",
// sem upload de documento), não StudentEditRequestCard.
function StudentBilheteIdentidadeDirectCard({ initialValue, onUpdated }: { initialValue: string; onUpdated: () => Promise<unknown> | void }) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  useEffect(() => setValue(initialValue), [initialValue]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSuccess(""); setError("");
    const novoValor = value.trim();
    if (!novoValor) return setError("BI do estudante é obrigatório.");
    if (novoValor === initialValue.trim()) return setError("Altere o valor antes de guardar.");
    setSaving(true);
    try {
      await estudanteService.atualizarBilheteIdentidadeSemAcademia({ bilhete_identidade: novoValor });
      await onUpdated();
      setSuccess("BI atualizado com sucesso.");
    } catch (err) { setError(formatApiError(err, "Não foi possível atualizar o BI.")); } finally { setSaving(false); }
  }

  return <form onSubmit={submit} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"><div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end"><Field id="personalizar-bi-direto" label="BI do estudante" value={value} disabled={saving} onChange={setValue} /><button type="submit" disabled={saving} className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{saving ? "A guardar..." : "Guardar BI"}</button></div><p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Você não está vinculado a nenhuma academia no momento, por isso pode atualizar o BI diretamente, sem aprovação.</p>{error && <div className="mt-3"><Alert title="Erro" message={error} variant="error" /></div>}{success && <div className="mt-3"><Alert title="BI atualizado" message={success} variant="success" /></div>}</form>;
}

// Decide entre os dois caminhos do BI do estudante: solicitação com
// aprovação (vinculado) ou autoatualização direta (não vinculado). Ver
// "Decisões de design já tomadas" no documento desta tarefa para a origem
// exata da regra `vinculado`.
function StudentBilheteIdentidadeCard({ vinculado, initialValue, onUpdated }: { vinculado: boolean; initialValue: string; onUpdated: () => Promise<unknown> | void }) {
  if (vinculado) {
    return <StudentEditRequestCard field={bilheteIdentidadeField} initialValue={initialValue} onCreated={onUpdated} />;
  }
  return <StudentBilheteIdentidadeDirectCard initialValue={initialValue} onUpdated={onUpdated} />;
}

function StudentGuardianPhoneCard({ initialValue, onUpdated }: { initialValue: string; onUpdated: () => Promise<unknown> | void }) {
```

### 4.5 Usar o novo card condicional em vez do genérico

Ainda no mesmo arquivo, dentro de `DadosPessoaisSection`.

**Localizar:**
```typescript
  if (isEstudante) {
    return <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"><CardHeader icon="mdi:account-edit-outline" title="Dados do estudante" description="Cada dado é editado em uma seção separada. Dados sensíveis criam solicitações com PDF comprovativo para aprovação da academia." /><div className="space-y-4"><StudentGuardianPhoneCard initialValue={initial.telefone_encarregado} onUpdated={onUpdated} />{sensitiveStudentFields.map((field) => <StudentEditRequestCard key={field.campo} field={field} initialValue={initial[field.key]} onCreated={onUpdated} />)}</div></section>;
  }
```

**Substituir por:**
```typescript
  if (isEstudante) {
    const vinculado = user.estudante?.status === "ativo" || user.estudante?.status === "pendente_documentos";
    return <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"><CardHeader icon="mdi:account-edit-outline" title="Dados do estudante" description="Cada dado é editado em uma seção separada. Dados sensíveis criam solicitações com PDF comprovativo para aprovação da academia." /><div className="space-y-4"><StudentGuardianPhoneCard initialValue={initial.telefone_encarregado} onUpdated={onUpdated} /><StudentBilheteIdentidadeCard vinculado={vinculado} initialValue={initial.bilhete_identidade} onUpdated={onUpdated} />{sensitiveStudentFields.map((field) => <StudentEditRequestCard key={field.campo} field={field} initialValue={initial[field.key]} onCreated={onUpdated} />)}</div></section>;
  }
```

## 5. Já validado por mim (Claude)

Apliquei exatamente estas mudanças num clone do repositório, com `npm install` completo (803 pacotes) e:

- `npx tsc --noEmit`: **0 erros**, antes e depois da mudança.
- `npx eslint "src/app/(painel)/configuracoes/personalizar/PageContent.tsx" "src/lib/api/services.ts" "src/types/api.ts"`: **0 erros, 0 avisos**.

Não rodei `npm run build` completo (o build de produção do Next.js pode exigir variáveis de ambiente específicas que não tenho no sandbox de validação) — `tsc --noEmit` + `eslint` já garantem tipagem e qualidade de código consistentes com o resto do arquivo. Se o Codex tiver acesso a `npm run build` com as variáveis de ambiente corretas, rodá-lo é um passo a mais de segurança, mas não é obrigatório para aceitar esta tarefa.

## 6. Checklist de aceite

- [ ] `EstudanteSection.tsx` não foi alterado (está fora de escopo — é código morto).
- [ ] `bilhete_identidade` não aparece mais em `sensitiveStudentFields`.
- [ ] Estudante vinculado (`status` `ativo` ou `pendente_documentos`) vê o card de solicitação com upload de PDF para o BI, exatamente como antes.
- [ ] Estudante não vinculado (`status` `inativo`) vê um card simples (campo + botão "Guardar BI", sem upload) para o BI.
- [ ] `nome`, `data_nascimento` e `bilhete_identidade_encarregado` continuam exatamente como estavam (sempre via solicitação com PDF).
- [ ] `npx tsc --noEmit` passa sem erros.
- [ ] `npx eslint` nos arquivos alterados passa sem erros nem avisos.

## 7. Procedimento de conclusão

1. Confirme que a tarefa de backend (`PUT /estudante/bilhete-identidade`) já está implementada e implantada — sem ela, o card novo chamaria uma rota inexistente.
2. Aplique a seção 4, na ordem.
3. Rode `npx tsc --noEmit` e `npx eslint` nos 3 arquivos alterados; resolva qualquer erro — não deveria haver nenhum, já que todo este código foi validado antes de ser escrito aqui.
4. Confira o checklist da seção 6.
5. Não faça commit/push a menos que instruído separadamente.
