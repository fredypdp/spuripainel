# Regras de Cadastro de Estudantes

## 1. Cadastro singular/direto

### Formato da requisição

O cadastro singular exige `multipart/form-data`, mesmo que os documentos sejam opcionais no sentido de nem sempre haver arquivos em todos os cenários. Se o `Content-Type` não for multipart, a API retorna erro:

> "cadastro direto de estudante exige multipart/form-data; documentos são opcionais"

O multipart é parseado com limite de **32 MiB**.

### Campos textuais aceitos

O handler monta a requisição a partir dos campos de formulário:

- `nome`
- `genero`
- `data_nascimento`
- `email`
- `telefone`
- `telefone_encarregado`
- `bilhete_identidade`
- `bilhete_identidade_encarregado`
- `ano_escolar_fundamental`
- `ano_escolar_medio`
- `ano_superior`
- `curso_medio_id`
- `curso_superior_id`
- `declaracao_ano_academico`, usado para normalizar declaração escolar enviada como arquivo

A estrutura do cadastro direto declara como **obrigatórios** no modelo: `nome`, `genero` e `data_nascimento`.

### Formatação de `data_nascimento`

No cadastro singular, `data_nascimento` deve vir no formato `YYYY-MM-DD`. O parsing usa `time.Parse("2006-01-02", ...)`; se falhar, retorna:

> "data_nascimento deve ser YYYY-MM-DD anterior à data atual"

Além do formato, a data precisa ser **estritamente anterior** à data atual.

### Formatação e regras comuns dos campos

As regras comuns passam por `ValidateMatriculaCommon`, que:

- remove espaços de campos opcionais e transforma strings vazias em `nil`;
- normaliza telefone;
- valida nome;
- valida gênero;
- valida data de nascimento;
- valida email, se informado;
- valida ano fundamental, médio e superior, se informados;
- valida telefones;
- valida BI/BI do encarregado;
- valida documentos, exceto quando a chamada pede para pular validação documental.

#### `nome`

O nome deve ter entre **2 e 255 caracteres** e conter apenas letras, acentos/marcas, espaços e apóstrofos aceitos (`'`, `’`, `ʻ`).

#### `genero`

O gênero aceita apenas:

- `masculino`
- `feminino`

#### `email`

O email é opcional, mas, se informado:

- não pode estar vazio após trim;
- tem máximo de 255 caracteres;
- deve bater com o regex de email;
- não pode conter caracteres bloqueados por regra anti-SQL.

#### `telefone` e `telefone_encarregado`

Antes de validar, o telefone é normalizado removendo espaços, hífens e parênteses; o sistema salva telefone nativo como número local de **9 dígitos**, sem DDI.

A validação aceita string vazia quando o telefone é opcional, mas, quando informado, aplica o formato esperado pelo regex de telefone; se inválido, retorna:

> "formato de telefone inválido"

**Regras de obrigatoriedade por contexto acadêmico:**

- Se for estudante escolar — ou seja, com `ano_escolar_fundamental` ou `ano_escolar_medio` — `telefone_encarregado` é obrigatório.
- Se for ensino superior — com `ano_superior` — telefone do estudante é obrigatório.
- Se não houver nem contexto escolar nem superior, é obrigatório informar pelo menos `telefone` ou `telefone_encarregado`.
- Se ambos forem informados, não podem ser iguais.

#### Anos acadêmicos

- `ano_escolar_fundamental` deve seguir `[1-9]_ano_fundamental`, por exemplo `1_ano_fundamental`, e o número deve estar entre 1 e 9.
- `ano_escolar_medio` deve seguir `[número]_ano_medio`, por exemplo `1_ano_medio` ou `2_ano_medio`.
- `ano_superior` deve seguir `[número]_ano_superior`, por exemplo `1_ano_superior` ou `2_ano_superior`.

#### Cursos

`curso_medio_id` e `curso_superior_id`, quando informados, devem ser UUIDs válidos e precisam apontar para curso ativo, do tipo correto (`medio` ou `superior`) e pertencente à academia autenticada.

---

## 2. Documentos no cadastro singular

### Campos de arquivo aceitos

O cadastro singular rejeita qualquer campo de arquivo que não esteja no conjunto de documentos de matrícula suportados.

Os arquivos são lidos apenas para os campos documentais conhecidos em `solicitacaoDocFields`.

### Formato dos arquivos

Cada arquivo enviado deve ser:

- PDF
- `Content-Type: application/pdf`
- extensão `.pdf`
- assinatura inicial `%PDF`
- tamanho máximo de **10 MB**

### Regras documentais de negócio

As regras documentais são centralizadas em `ValidarDocumentosMatricula`.

**Principais regras:**

- Se `ano_superior` estiver informado, `bilhete_identidade` do estudante é obrigatório.
- Se `bilhete_identidade` do estudante for informado, o documento `bi_estudante` é obrigatório.
- Se `bilhete_identidade_encarregado` for informado, o documento `bi_encarregado` é obrigatório.
- Para estudante escolar, `bilhete_identidade_encarregado` é obrigatório.
- Para estudante escolar sem `bilhete_identidade`, `cedula_estudante` é obrigatória.

### Comprovativo acadêmico

Para `1_ano_fundamental`, não é exigido comprovativo acadêmico anterior.

Para anos posteriores, o sistema calcula o ano acadêmico anterior e exige declaração do ano anterior ou, em alguns anos de transição, certificado específico.

**Certificados específicos aceitos como alternativa/obrigatoriedade conforme o ano:**

| Ano | Certificado exigido |
|---|---|
| `7_ano_fundamental` | `certificado_6_ano_fundamental` |
| `1_ano_medio` | `certificado_9_ano_fundamental` |
| `1_ano_superior` | `certificado_ensino_medio` |

A declaração precisa informar `ano_academico` e ele deve ser exatamente o ano anterior esperado.

---

## 3. Cadastro em massa sem arquivo

### Formato da requisição

Quando não é `multipart/form-data`, o endpoint espera JSON com:

```json
{
  "com_arquivo": false,
  "estudantes": []
}
```

O campo `com_arquivo` é obrigatório. Se estiver ausente, retorna erro. Se for `true` em JSON comum, retorna erro dizendo que `com_arquivo true` exige `multipart/form-data`.

### Limite e obrigatoriedade do array

O batch de cadastro de estudantes tem limite de **100 itens** e o array não pode ser vazio.

A função genérica de validação confirma: zero itens gera "array não pode ser vazio" e acima do máximo gera "máximo de X itens por batch".

### Campos por estudante no JSON

Cada item do array usa `cadastroEstudanteJSONItem` com estes campos:

- `codigo_temporario`
- `nome`
- `genero`
- `data_nascimento`
- `email`
- `telefone`
- `telefone_encarregado`
- `bilhete_identidade`
- `bilhete_identidade_encarregado`
- `ano_escolar_fundamental`
- `ano_escolar_medio`
- `ano_superior`
- `curso_medio_id`
- `curso_superior_id`
- `declaracao_ano_academico`
- `documentos`
- `arquivos`, interno/serializado para job quando há arquivo

Esses campos são convertidos para o mesmo request do cadastro direto, com `strings.TrimSpace` nos campos textuais.

### Diferença importante: documentos no modo sem arquivo

No job de cadastro, quando o item não tem arquivos (`len(files) == 0`), o handler chama o cadastro com `pendenteDocumentos = true`.

Esse `pendenteDocumentos = true` faz a validação comum receber `PularValidacaoDocumentos: true`.

**Na prática:** cadastro em massa sem arquivo pula a validação documental inicial e cadastra o estudante em fluxo de pendência documental, mantendo as demais regras de dados pessoais, telefones, BI, anos e cursos.

---

## 4. Cadastro em massa com arquivo

### Formato da requisição

Quando o `Content-Type` é `multipart/form-data`, o endpoint processa como lote com arquivos. O multipart é parseado com limite de **64 MiB**.

Nesse modo:

- `com_arquivo` deve existir no form e ser exatamente `"true"`.
- `estudantes` deve ser um campo textual contendo JSON válido com o array de estudantes.

### Nomenclatura dos arquivos

Cada arquivo no multipart deve ter nome de campo no formato:

```
<codigo_temporario>.<campo_documental>
```

Exemplo:

```
tmp-001.bi_estudante
tmp-001.bi_encarregado
tmp-001.declaracao
```

O handler divide o campo em duas partes pelo primeiro ponto (`.`) e valida se o segundo pedaço é um campo documental conhecido. Se o padrão não bater, retorna:

> "campo de arquivo de lote inválido"

Cada campo de arquivo só pode ter um arquivo; duplicidade retorna erro.

### `codigo_temporario`

No lote com arquivos, cada item precisa ter `codigo_temporario`. Esse código:

- é obrigatório;
- não pode estar duplicado no array;
- precisa corresponder aos prefixos dos campos de arquivo;
- não pode haver arquivo "órfão" para código que não existe em `estudantes`.

### Regras dos arquivos

Os arquivos do lote com arquivo usam a mesma validação de PDF do cadastro singular:

- máximo 10 MB;
- Content-Type PDF;
- extensão `.pdf`;
- assinatura `%PDF`.

### Validação documental no lote com arquivo

Quando há arquivos, eles são convertidos para arquivos no item e processados pelo job.

No job, se houver arquivos, eles são repassados ao mesmo fluxo do cadastro direto.

Portanto, no lote com arquivo, as regras documentais são aplicadas como no cadastro singular, exceto que o código também permite marcar pendência documental se houver falha de storage em certos cenários assíncronos. O handler seta `permitir_pendencia_documentos_em_falha_storage` quando há arquivos no job.

---

## 5. Matriz de obrigatoriedade por cenário

| Campo/regra | Singular | Massa sem arquivo | Massa com arquivo |
|---|---|---|---|
| Content-Type | `multipart/form-data` obrigatório | JSON normal | `multipart/form-data` obrigatório |
| `com_arquivo` | Não se aplica | obrigatório e `false` | obrigatório e `"true"` |
| `estudantes` | Não se aplica | array obrigatório, não vazio, máx. 100 | campo textual JSON válido, não vazio, máx. 100 |
| `codigo_temporario` | Não se aplica | não é necessário para arquivos | obrigatório e único |
| `nome` | obrigatório por validação comum | obrigatório por validação comum | obrigatório por validação comum |
| `genero` | obrigatório; só `masculino` ou `feminino` | igual | igual |
| `data_nascimento` | obrigatório; `YYYY-MM-DD`; anterior a hoje | igual | igual |
| `email` | opcional; se informado, validado | igual | igual |
| Escolar: `telefone_encarregado` | obrigatório | obrigatório | obrigatório |
| Superior: `telefone` | obrigatório | obrigatório | obrigatório |
| Sem contexto escolar/superior | pelo menos um telefone | igual | igual |
| `bilhete_identidade` no superior | obrigatório | obrigatório | obrigatório |
| `bilhete_identidade_encarregado` no escolar | obrigatório | obrigatório | obrigatório |
| Documentos exigidos por BI/ano | validados | pulados inicialmente / pendência documental | validados |
| Arquivos PDF | se enviados, PDF válido até 10 MB | não envia arquivo | PDF válido até 10 MB |
| Cursos | UUID válido, curso ativo, tipo correto e da academia | igual | igual |
