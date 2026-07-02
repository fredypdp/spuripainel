---
criado: 2026-07-02
origem: revisão corretiva após implementação parcial de cursos médios
status: parcial-com-implementacao
---

# Relatório — Auditoria frontend/API em cascata

Este relatório registra a auditoria documental e de código executada para a tarefa **"Depurar e implementar atualizações completas da API no frontend"**. A conclusão importante é que a entrega anterior não cobria todo o escopo da tarefa: ela tratava principalmente cursos médios e `materias_chave`. A revisão abaixo explicita o que foi confirmado, o que foi implementado agora e o que continua como risco para ciclos posteriores.

## 1. Auditoria de `src/docs`

| Documento | Classificação | Impacto identificado |
| --- | --- | --- |
| `src/docs/Spuri - API.md` | Fonte obrigatória de implementação | Contrato final de rotas, payloads, responses, erros estruturados, cursos, matérias, anos acadêmicos, faltas e avaliação final. Confirma que `materias_chave` pertence ao curso médio por `ano_academico`; regras de avaliação final rejeitam `materias_chave`; cursos superiores usam `periodos`; `PATCH /academia/anos-academicos` e sumários não existem no contrato público. |
| `src/docs/Spuri - Documentação.md` | Fonte obrigatória funcional | Regras de negócio por nível de academia, papéis, avaliação final e curso médio. Confirma o vínculo curricular das matérias-chave ao curso médio e o uso posterior pela avaliação final. |
| `src/docs/tarefas/Tarefa - Depurar e implementar atualizacoes completas da API no frontend.md` | Fonte obrigatória de execução | Exige auditoria completa de docs e cascata `rota → página → componente → hooks/services → tipos → UI`; motivou este relatório e a ampliação em cursos/matérias/configurações. |
| `src/docs/tarefas/Tarefa - Alinhar frontend com API sem PATCH de anos e sem sumarios.md` | Tarefa incorporada ao contrato atual | Confirmou remoção de sumários, ausência de `PATCH /academia/anos-academicos`, fluxo incremental `POST`/`DELETE` de anos e necessidade de erros estruturados. Busca textual não encontrou vestígios ativos fora de docs. |
| `src/docs/tarefas/Depurar implementacao de materias_chave por ano nos cursos medios.md` | Fonte específica atual | Confirma obrigatoriedade de `materias_chave` no curso médio, por ano, e remoção total desse campo das regras de avaliação final. |
| `src/docs/tarefas/Depurar atualizacao de regra de avaliacao final com escopo por curso ano e materias aplicaveis.md` | Documentação complementar atual | Reforça escopo versátil da regra final e a separação entre matérias aplicáveis da regra e matérias-chave curriculares do curso médio. |
| `src/docs/tarefas/Corrigir e depurar regra de avaliação final.md` | Documentação histórica/conflitante | Contém orientação antiga que colocava `materias_chave` na regra; foi superada pela API atual e pela tarefa específica de curso médio. Não deve guiar implementação nova nesse ponto. |
| `src/docs/tarefas/Auditar documentação contra código real.md` | Documentação funcional complementar | Reforça necessidade de validação cruzada documentação/código. |
| `src/docs/tarefas/Depurar implementacao de atualizacoes completas da API no frontend.md` | Tarefa já incorporada ao contrato atual | Checklist intermediário compatível com a tarefa principal. |

## 2. Auditoria em cascata de `src`

```text
/app/(painel)/gerenciamento/cursos/page.tsx
└─ CursosPainel
   ├─ Formulário de criação/edição de curso
   ├─ Cards/listagem de cursos
   ├─ academiaService.criarCurso / atualizarCurso / listarCursos / listarMaterias
   └─ Tipos CriarCursoRequest, AtualizarCursoRequest, Curso, MateriasChaveCursoAnoDTO
      Ajuste: curso médio agora monta/valida/exibe materias_chave por ano; edição usa seleção filtrada por matéria ativa do próprio curso/ano; curso superior envia somente periodos.

/app/(painel)/gerenciamento/materias-disciplinares/page.tsx e /materias/page.tsx
└─ MateriaPainel
   ├─ Formulário de matéria por tipo e curso
   ├─ Cards agrupados por ano acadêmico
   ├─ academiaService.criarMateria / atualizarMateria / listarMaterias / listarCursos
   └─ Tipos CriarMateriaRequest, AtualizarMateriaRequest, Materia, Curso
      Validação: já exige curso para matéria média/superior e anos do curso selecionado. Impacto indireto: cursos médios agora usam essas matérias ativas do próprio curso/ano como seleção de materias_chave na edição.

/app/(painel)/configuracoes/regras-avaliacao-final/page.tsx
└─ AvaliacaoFinalRulesSection
   ├─ Formulário guiado de regra
   ├─ Listagem/inativação de regras
   ├─ academiaService.criarRegraAvaliacaoFinal / listarRegrasAvaliacaoFinal / deletarRegraAvaliacaoFinal / listarCursos
   └─ Tipos CriarRegraAvaliacaoFinalRequest, RegraAvaliacaoFinal
      Validação: regra não envia materias_chave. Risco remanescente: UI ainda não modela todos os escopos avançados documentados, como blocos por curso/ano/matérias aplicáveis.

/app/(painel)/configuracoes/anos-academicos/page.tsx
└─ Fluxo de anos acadêmicos
   ├─ academiaService.listarAnosAcademicos / adicionarAnosAcademicos / removerAnosAcademicos
   └─ Tipo GerirAnosAcademicosRequest
      Validação: escrita incremental sem PATCH; curso superior sem escrita direta por anos acadêmicos.

/app/(painel)/faltas/page.tsx
└─ FaltasAcademia / FaltasAdmin / FaltasEstudante
   ├─ academiaService.registrarFaltas / atualizarFalta / deletarFalta / consultasService.listarFaltas
   └─ Tipos RegistrarFaltasRequest, AtualizarFaltaRequest, Falta
      Validação textual: sem `sumario_id`, `sumario_titulo` ou endpoint `/academia/sumarios` fora de docs.

/app/(painel)/notas/page.tsx
└─ NotasAcademia / NotasAdmin / NotasEstudante
   ├─ academiaService.registrarNota / atualizarNota / consultasService.listarNotas
   └─ Tipos RegistrarNotasRequest, AtualizarNotaRequest, Nota
      Sem alteração nesta rodada; depende dos filtros de curso/matéria já documentados.

/app/(full-width-pages)/(auth)/matricula/page.tsx
└─ MatriculaPublicPage
   ├─ solicitacaoMatriculaService.criar
   └─ CriarSolicitacaoMatriculaRequest
      Sem alteração nesta rodada; fluxo usa payload público documentado.
```

## 3. Alterações implementadas nesta revisão

1. Cursos médios mantêm `materias_chave` como DTO público por ano acadêmico.
2. O painel de cursos deixou de depender apenas de campo livre: na edição, apresenta seleção de matérias médias ativas, do próprio curso e do ano correto.
3. A listagem de cursos exibe nomes das matérias-chave quando elas estão carregadas em `listarMaterias`.
4. Matérias disciplinares foram auditadas como origem dos itens elegíveis de `materias_chave`; seu contrato atual já filtra por curso e anos do curso.
5. Regras de avaliação final foram auditadas para confirmar ausência de `materias_chave` no payload.

## 4. Riscos remanescentes

- A criação inicial de um curso médio ainda precisa de UUIDs quando o backend exigir `materias_chave` antes de existir `curso_id`; isso revela uma tensão de fluxo entre criação de curso e criação de matérias vinculadas. Na edição, o fluxo já é seguro e assistido por matérias reais.
- A UI de regras de avaliação final ainda precisa evoluir para escopos avançados por curso/ano/matérias aplicáveis, conforme a tarefa principal.
- A auditoria completa de todas as páginas foi registrada em nível funcional, mas nem todos os domínios receberam alteração de UI nesta rodada por não apresentarem divergência ativa detectada nos contratos pesquisados.
