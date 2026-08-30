---
tarefa: Escolha obrigatória de vigência (cobranças pendentes vs a partir da atualização) ao configurar preço de mensalidade e matrícula — FRONTEND
repositorio: fredypdp/spuripainel
depende_de: Tarefa de backend em spuri-backend — "10 - Reprecificar cobrancas pendentes de mensalidade e matricula (todos os meses) ou so a partir da atualizacao.md" (o campo modo_vigencia passa a ser OBRIGATÓRIO no request; sem essa mudança no backend, este formulário passaria a enviar um campo que o backend antigo ignora)
status: pronto_para_implementacao
---

# Tarefa: escolha obrigatória de vigência na configuração de mensalidade/matrícula (Frontend)

## Como usar este documento

Toda a mudança fica dentro de um único arquivo já existente, `src/components/paineis/FinanceiroConfiguracoesPainel.tsx` — não há tela nova, nem rota nova, nem componente novo (reaproveita `Radio`, já usado em outras partes do painel, embora não neste arquivo). O JSX exato de onde inserir o novo campo está especificado abaixo com certeza (vi o arquivo completo).

**Leia antes de começar:**
- `src/components/paineis/FinanceiroConfiguracoesPainel.tsx` — arquivo inteiro a ser alterado.
- `src/components/form/input/Radio.tsx` — componente a reaproveitar (props: `id`, `name`, `value`, `checked`, `label`, `onChange(value)`, `disabled?`).
- `src/types/api.ts` — `MensalidadeConfiguracaoInput`/`MensalidadeConfiguracaoView`, `MatriculaConfiguracaoInput`/`MatriculaConfiguracaoView` (por volta das linhas 1376-1420 e 1581-1606).

## 0. Contexto

O backend (tarefa separada) passa a **exigir** um campo `modo_vigencia` em `POST`/`PUT /financeiro/mensalidades/configuracoes` e `POST`/`PUT /financeiro/matriculas/configuracoes` (confirme o path exato de matrícula em `src/lib/api/services.ts`, junto de `configurarMensalidade`), com dois valores possíveis:

- `"cobrancas_pendentes"`: o novo preço passa a valer **imediatamente para tudo que ainda não foi pago e não está aguardando pagamento** — inclusive mensalidades/matrículas em atraso há vários meses.
- `"a_partir_da_atualizacao"`: o novo preço só vale para o que for cobrado **a partir de agora** — quem já está pendente continua no preço antigo até pagar (é o comportamento que o sistema sempre teve).

Sem essa escolha, o backend agora **rejeita** a requisição. Este documento adiciona a UI para essa escolha nos dois formulários (`submitMensalidade` e `submitMatricula`), sempre obrigatória — tanto ao criar a primeira configuração de um escopo quanto ao versionar uma já existente (o backend não distingue os dois casos, então o formulário também não precisa).

## 1. Decisões de design já tomadas

1. **O campo aparece nos dois formulários** (mensalidade e matrícula), com o mesmo texto e mesmo componente — a escolha é conceitualmente idêntica nos dois casos, só o efeito prático no backend é implementado de forma diferente (mensalidade recalcula na hora de cobrar; matrícula reprecifica solicitações já aprovadas na hora — isso é 100% backend, o frontend não precisa saber disso).
2. **Sempre obrigatório, nunca com valor pré-selecionado por padrão** — force a pessoa a escolher conscientemente (nenhum dos dois rádios vem marcado ao abrir o formulário), porque a decisão tem impacto financeiro real sobre estudantes/encarregados. O botão de salvar fica desabilitado até uma opção ser escolhida (mesmo padrão de erro dos outros campos obrigatórios do formulário, `validarValorEAno`).
3. **Texto de cada opção deve deixar o efeito explícito**, não só repetir o nome técnico — ver Seção 2 para a redação exata sugerida.
4. **Quando `modo_vigencia="cobrancas_pendentes"` para matrícula**, a resposta do backend (`MatriculaConfiguracaoView`) passa a incluir um campo opcional `repricing_pendentes: { atualizadas, ignoradas, falhas }` — mostre isso no `Alert` de sucesso quando presente (ex.: "3 solicitação(ões) já aprovada(s) foram atualizadas para o novo valor."), para a academia saber que algo aconteceu além de só salvar a configuração. Mensalidade não tem equivalente (o recálculo é sob demanda, não em lote), então nenhuma mudança de mensagem é necessária lá.

## 2. Tipos alterados em `src/types/api.ts`

```typescript
export type FinanceiroModoVigencia = 'cobrancas_pendentes' | 'a_partir_da_atualizacao';

export interface MensalidadeConfiguracaoInput {
  codigo_academia: string;
  nivel: FinanceiroNivel;
  ano_academico?: string;
  curso_id?: string;
  valor: number;
  mes_fim_cobranca: 6 | 7;
  metodos_pagamento: FinanceiroMetodoPagamento[];
  /**
   * Obrigatório desde a tarefa de reprecificação retroativa (backend,
   * spuri-backend #10). "cobrancas_pendentes" alcança qualquer mensalidade
   * ainda não paga e sem cobrança aberta, de qualquer mês (inclusive
   * atrasados); "a_partir_da_atualizacao" só afeta o que for cobrado dali
   * para frente.
   */
  modo_vigencia: FinanceiroModoVigencia;
}

export interface MensalidadeConfiguracaoView extends MensalidadeConfiguracaoInput {
  vigente_em: string;
}
```

E, ao lado de `MatriculaConfiguracaoInput`/`View`:

```typescript
export interface MatriculaConfiguracaoInput {
  codigo_academia: string;
  nivel: FinanceiroNivel;
  ano_academico?: string;
  curso_id?: string;
  valor: number;
  metodos_pagamento: FinanceiroMetodoPagamento[];
  modo_vigencia: FinanceiroModoVigencia;
}

export interface MatriculaRepricingResumo {
  atualizadas: number;
  ignoradas: number;
  falhas: number;
}

export interface MatriculaConfiguracaoView extends MatriculaConfiguracaoInput {
  vigente_em: string;
  /** Só presente na resposta de POST/PUT quando modo_vigencia="cobrancas_pendentes". */
  repricing_pendentes?: MatriculaRepricingResumo;
}
```

(Ajuste os nomes exatos dos campos existentes se, ao abrir o arquivo, algo aqui descrito já tiver sido alterado por outra tarefa concluída entre a escrita deste documento e a implementação — o que importa é adicionar `modo_vigencia` como campo obrigatório e `repricing_pendentes` como opcional, preservando todo o resto já existente.)

## 3. `FinanceiroConfiguracoesPainel.tsx`

### 3.1 Novo import

```typescript
import Radio from "@/components/form/input/Radio";
```

### 3.2 Estado do formulário

`NivelFormState` (linha ~56) ganha o novo campo, com `""` como valor inicial (nenhuma opção escolhida — ver decisão 2):

```typescript
type NivelFormState = {
  nivel: FinanceiroNivel;
  ano_academico: string;
  curso_id: string;
  valor: string;
  metodos_pagamento: FinanceiroMetodoPagamento[];
  modo_vigencia: "" | FinanceiroModoVigencia;
};
```

Atualize os dois `useState<NivelFormState>` (mensalidade e matrícula, linhas ~92 e ~95) incluindo `modo_vigencia: ""` no valor inicial.

`FormFieldErrors` (linha ~62) ganha `"modo_vigencia"` na união:

```typescript
type FormFieldErrors = Partial<Record<"ano_academico" | "curso_id" | "valor" | "modo_vigencia", string>>;
```

### 3.3 Validação

Em `validarValorEAno` (linha ~178), adicione:

```typescript
if (!form.modo_vigencia) errors.modo_vigencia = "Escolha o que acontece com quem já está pendente.";
```

### 3.4 Envio

Em `submitMensalidade` (linha ~194) e `submitMatricula` (linha ~218), inclua `modo_vigencia: mensalidadeForm.modo_vigencia as FinanceiroModoVigencia` (respectivamente `matriculaForm.modo_vigencia as FinanceiroModoVigencia`) no objeto `p` montado — o `as` é seguro aqui porque a validação da Seção 3.3 já garante que não chega vazio até este ponto.

Em `submitMatricula`, depois de `await (exists ? atualizarMatricula.execute(p) : salvarMatricula.execute(p));`, capture o resultado para ler `repricing_pendentes` (hoje o `await` descarta o retorno — `useApi`/`.execute` devolve o corpo da resposta; confirme a assinatura exata olhando `useApi` em `src/hooks` ou `src/lib/api`, e ajuste a captura conforme o padrão real, ex. `const resultado = await (...)`), e monte a mensagem de sucesso:

```typescript
const resultado = await (exists ? atualizarMatricula.execute(p) : salvarMatricula.execute(p));
const resumo = resultado?.repricing_pendentes;
setAlert({
  variant: "success",
  message: resumo
    ? `Configuração de matrícula versionada com sucesso. ${resumo.atualizadas} solicitação(ões) já aprovada(s) foram atualizadas para o novo valor${resumo.ignoradas ? `; ${resumo.ignoradas} não foram alteradas por já terem cobrança em aberto` : ""}.`
    : "Configuração de matrícula versionada com sucesso.",
});
```

Se `useApi(...).execute` não devolver diretamente o corpo da resposta (ex.: devolve `void` e guarda o resultado só num estado interno do hook), use o padrão que os outros `useApi` deste mesmo arquivo já usam para ler o resultado logo após `execute` (ex.: o estado `.data` do hook retornado por `useApi`, se for esse o padrão) — não invente um mecanismo novo de leitura de resposta; espelhe o que já existe no arquivo para os `useApi` de listagem (`mensalidadesApi`, `matriculasApi`, visíveis mais acima no arquivo).

### 3.5 Novo campo no formulário (JSX)

Adicione ao final de `renderNivelFields` (linha ~299-345, o bloco que hoje termina no `Input` de "Valor (Kz)"), depois do campo de valor e antes do fechamento do fragmento `</>`:

```tsx
<Label>O que acontece com quem já está pendente?</Label>
<div className="flex flex-col gap-3">
  <Radio
    id={`${kind}-modo-vigencia-pendentes`}
    name={`${kind}-modo-vigencia`}
    value="cobrancas_pendentes"
    checked={form.modo_vigencia === "cobrancas_pendentes"}
    label={
      kind === "mensalidade"
        ? "Aplicar já a todas as mensalidades em atraso ainda não pagas (mesmo de meses anteriores)"
        : "Aplicar já a todas as matrículas já aprovadas que ainda não foram pagas"
    }
    onChange={() => setForm((prev) => ({ ...prev, modo_vigencia: "cobrancas_pendentes" }))}
  />
  <Radio
    id={`${kind}-modo-vigencia-futuro`}
    name={`${kind}-modo-vigencia`}
    value="a_partir_da_atualizacao"
    checked={form.modo_vigencia === "a_partir_da_atualizacao"}
    label="Só a partir de agora — quem já está pendente continua no valor antigo até pagar"
    onChange={() => setForm((prev) => ({ ...prev, modo_vigencia: "a_partir_da_atualizacao" }))}
  />
</div>
{errors.modo_vigencia && <p className="text-sm text-error-500">{errors.modo_vigencia}</p>}
```

`renderNivelFields` já recebe `form`, `errors` e `setForm` como parâmetros — não precisa de nenhuma prop nova na assinatura da função, só usar o que já está disponível dentro dela. Confirme a classe exata usada para texto de erro em outros pontos do mesmo arquivo (ex.: o `hint`/`error` do `Input` de valor) e reaproveite a mesma classe/convenção visual em vez de `text-error-500` se o padrão real do projeto for outro — isso é só uma indicação de intenção, não uma classe confirmada byte a byte neste arquivo.

### 3.6 Resetar ao trocar de nível/limpar formulário

Em `updateNivel` (linha ~283), **não** resete `modo_vigencia` junto com `curso_id`/`ano_academico` — trocar de nível/curso não deveria obrigar a pessoa a escolher de novo algo que já não depende dessas informações. Verifique se existe algum outro ponto do arquivo que reseta o formulário inteiro ao trocar de subtela/fechar o painel (ex.: ao voltar para o menu) e, se existir, inclua `modo_vigencia: ""` nesse reset também, para a próxima configuração exigir uma nova escolha consciente (decisão 2).

## Fora de escopo

- Qualquer mudança em telas de **matrícula do lado do aplicante/estudante** (ex.: onde ele vê o valor a pagar) — o valor já vem pronto do backend, calculado com a regra nova; não há UI adicional necessária ali.
- Mostrar, na listagem de configurações já salvas (`renderConfiguracoesSalvas`), qual `modo_vigencia` foi usado em cada versão histórica — o backend não persiste isso de forma consultável por versão antiga (só no response da própria chamada que criou a versão, ver o documento de backend, Seção 2.2/"não persistido como coluna" para mensalidade; para matrícula nem chega a haver histórico de modos por versão). Se o negócio quiser esse histórico, é uma extensão de backend antes de ser uma tarefa de frontend.

## Critérios de aceite

1. Os dois formulários (mensalidade e matrícula) exigem a escolha de `modo_vigencia` antes de permitir salvar, sem nenhuma opção pré-selecionada.
2. O request enviado ao backend inclui `modo_vigencia` com o valor exatamente `"cobrancas_pendentes"` ou `"a_partir_da_atualizacao"`.
3. Trocar nível/curso/ano não apaga a escolha já feita de `modo_vigencia`.
4. Ao configurar matrícula com `cobrancas_pendentes`, a mensagem de sucesso reflete `repricing_pendentes` quando presente na resposta.
5. `npm run build` (ou o comando de build/typecheck equivalente do projeto) passa sem erros de tipo novos.
