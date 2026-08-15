# Tarefa para o Codex — Repositório `spuripainel` (frontend)

**Repositório:** https://github.com/fredypdp/spuripainel
**Branch base:** main
**Execução:** Não é necessário planejar nada. Siga os passos exatamente como descritos abaixo, na ordem, e faça as substituições literais indicadas. Se algum trecho não bater 100% com o que está descrito aqui, PARE e reporte a diferença em vez de improvisar.

---

## Contexto do problema

O array `Provincias` (e o type `ProvinciaNome`) em `src/types/api.ts` lista a província com nome `'CUANDO CUBANGO'` e código `'CND'`. Isso está errado porque:

- Em 2024, a antiga província "Cuando Cubango" foi dividida administrativamente em duas: **Cuando** (código `CND`) e **Cubango** (código `CBG`).
- O código já reflete a divisão corretamente (existem as entradas `CND` e `CBG` separadas), mas o **nome** da entrada `CND` ficou incorreto: ainda está como `'CUANDO CUBANGO'` em vez de `'CUANDO'`.
- Resultado visível: no formulário de cadastro de academia (`AcademiaCadastroForm.tsx`), que consome esse array diretamente para montar o dropdown de província, aparece a opção "CUANDO CUBANGO" (código CND) ao lado de "CUBANGO" (código CBG) — uma duplicidade de nome que confunde o usuário, já que "Cuando Cubango" não existe mais como província.

**Objetivo da tarefa:** trocar o nome `'CUANDO CUBANGO'` por `'CUANDO'` em todos os lugares onde ele representa o código `CND`, mantendo o código `CND` inalterado. Não alterar a entrada `CUBANGO`/`CBG`, que já está correta.

---

## Passo 1 — Editar `src/types/api.ts`

Arquivo: `src/types/api.ts`

### 1a. No `type ProvinciaNome` (por volta da linha 1832-1833)

Localize este bloco exato:

```ts
export type ProvinciaNome =
  | 'BENGO' | 'BENGUELA' | 'BIE' | 'CABINDA' | 'CUANDO CUBANGO'
  | 'CUANZA NORTE' | 'CUANZA SUL' | 'CUBANGO' | 'CUNENE' | 'HUAMBO'
  | 'HUILA' | 'ICOLO E BENGO' | 'LUANDA' | 'LUNDA NORTE' | 'LUNDA SUL'
  | 'MALANJE' | 'MOXICO' | 'MOXICO LESTE' | 'NAMIBE' | 'UIGE' | 'ZAIRE';
```

Substitua por:

```ts
export type ProvinciaNome =
  | 'BENGO' | 'BENGUELA' | 'BIE' | 'CABINDA' | 'CUANDO'
  | 'CUANZA NORTE' | 'CUANZA SUL' | 'CUBANGO' | 'CUNENE' | 'HUAMBO'
  | 'HUILA' | 'ICOLO E BENGO' | 'LUANDA' | 'LUNDA NORTE' | 'LUNDA SUL'
  | 'MALANJE' | 'MOXICO' | 'MOXICO LESTE' | 'NAMIBE' | 'UIGE' | 'ZAIRE';
```

(Única mudança: `'CUANDO CUBANGO'` → `'CUANDO'`. Nada mais nessa union muda.)

### 1b. No array `Provincias` (por volta da linha 1844-1866)

Localize esta linha exata dentro do array:

```ts
  { nome: 'CUANDO CUBANGO', codigo: 'CND' },
```

Substitua por:

```ts
  { nome: 'CUANDO',         codigo: 'CND' },
```

Mantenha o alinhamento de espaços em branco igual ao das outras linhas do array (o arquivo usa espaçamento para alinhar a coluna `codigo:` — olhe as linhas vizinhas, como `{ nome: 'CABINDA', codigo: 'CAB' },` e `{ nome: 'CUANZA NORTE', codigo: 'CNO' },`, e replique o mesmo padrão de alinhamento).

**Não toque** na linha `{ nome: 'CUBANGO', codigo: 'CBG' },` — ela já está correta e deve permanecer exatamente como está.

---

## Passo 2 — Editar `src/Documentação da API.md`

Arquivo: `src/Documentação da API.md`
**Atenção:** este arquivo usa terminadores de linha CRLF (`\r\n`). Preserve o CRLF ao salvar — não converta para LF.

Localize, dentro da tabela de "21 províncias" (por volta da linha 1091), esta linha exata:

```
	  { nome: 'CUANDO CUBANGO', codigo: 'CND' },
```

(repare que a linha começa com um caractere de tab seguido de dois espaços, igual às linhas vizinhas da lista)

Substitua por:

```
	  { nome: 'CUANDO', codigo: 'CND' },
```

Não altere nenhuma outra linha da tabela.

---

## Passo 3 — Editar `src/docs/Documentação da API.md`

Arquivo: `src/docs/Documentação da API.md`
**Atenção:** este arquivo também usa CRLF (`\r\n`). Preserve o CRLF ao salvar.

Este arquivo tem a mesma tabela de províncias copiada (por volta da linha 1093). Localize a linha exata:

```
	  { nome: 'CUANDO CUBANGO', codigo: 'CND' },
```

Substitua por:

```
	  { nome: 'CUANDO', codigo: 'CND' },
```

Não altere nenhuma outra linha da tabela.

---

## Passo 4 — Buscar por qualquer outra ocorrência esquecida

Rode, na raiz do repositório:

```bash
grep -rniI "CUANDO CUBANGO" .
```

O resultado esperado é **vazio** (nenhuma ocorrência). Se aparecer qualquer resultado, corrija-o seguindo o mesmo padrão: `'CUANDO CUBANGO'` → `'CUANDO'` quando associado ao código `CND`.

---

## Passo 5 — Verificação de build/typecheck

Rode, na raiz do repositório:

```bash
npm install
npx tsc --noEmit
```

Confirme que não há novos erros de TypeScript introduzidos pela mudança (o tipo `ProvinciaNome` mudou de valor, então se houver algum lugar do código comparando a string literal `'CUANDO CUBANGO'` diretamente — fora dos arquivos já editados — o typecheck ou uma busca por texto vai revelar isso).

Se quiser rodar o lint também:

```bash
npm run lint
```

---

## Passo 6 — Verificação visual (opcional, se houver ambiente de preview)

Se for possível rodar `npm run dev` e abrir a tela de cadastro de academia (componente `src/components/academia/AcademiaCadastroForm.tsx`), confirme visualmente que o campo "Província" no dropdown agora lista **"CUANDO"** e **"CUBANGO"** como duas opções distintas e corretas, sem a duplicidade "CUANDO CUBANGO".

---

## O que NÃO fazer (fora de escopo)

- Não alterar nenhum outro nome de província (BENGO, BENGUELA, CABINDA, CUBANGO, etc.) — só a entrada `CUANDO CUBANGO` → `CUANDO`.
- Não alterar os códigos (`ProvinciaCodigo`) — nenhum código muda, só o nome de exibição da entrada `CND`.
- Não mexer em lógica de validação de formulário, em componentes além dos arquivos listados, ou em qualquer chamada de API.
- Não criar novas províncias nem remover nenhuma das 21 existentes.

---

## Resumo das mudanças (checklist final)

- [ ] `src/types/api.ts` — union `ProvinciaNome`: `'CUANDO CUBANGO'` → `'CUANDO'`
- [ ] `src/types/api.ts` — array `Provincias`: `{ nome: 'CUANDO CUBANGO', codigo: 'CND' }` → `{ nome: 'CUANDO', codigo: 'CND' }`
- [ ] `src/Documentação da API.md` — tabela de províncias atualizada, CRLF preservado
- [ ] `src/docs/Documentação da API.md` — tabela de províncias atualizada, CRLF preservado
- [ ] `grep -rniI "CUANDO CUBANGO" .` retorna vazio
- [ ] `npx tsc --noEmit` sem novos erros
- [ ] Commit com mensagem sugerida: `fix: corrige nome da província CND de "CUANDO CUBANGO" para "CUANDO"`
