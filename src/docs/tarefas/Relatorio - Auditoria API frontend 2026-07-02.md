---
criado: 2026-07-02
origem: implementação da tarefa de atualização completa da API no frontend
status: incorporado
---

# Relatório — Auditoria API/frontend 2026-07-02

## Documentos revisados e classificação

1. `src/docs/Spuri - API.md` — fonte obrigatória de implementação. Define rotas, envelopes, DTOs, permissões, regras de erro estruturado e remoções como ausência de `PATCH /academia/anos-academicos` e ausência de execução manual de avaliação final.
2. `src/docs/Spuri - Documentação.md` — documentação funcional complementar obrigatória. Define papéis, regras académicas, níveis de academia e comportamento esperado por perfil.
3. `src/docs/tarefas/Auditar documentação contra código real.md` — tarefa já incorporada ao contrato atual. Usada para conferir que o frontend não deve manter compatibilidade silenciosa com contratos antigos.
4. `src/docs/tarefas/Corrigir e depurar regra de avaliação final.md` — tarefa já incorporada ao contrato atual. Impacta a tela de configuração e a remoção de execução manual de avaliação final.
5. `src/docs/tarefas/Depurar atualizacao de regra de avaliacao final com escopo por curso ano e materias aplicaveis.md` — tarefa já incorporada ao contrato atual. Reforça escopos de regra por nível, curso, ano/período e matérias aplicáveis.
6. `src/docs/tarefas/Depurar implementacao de materias_chave por ano nos cursos medios.md` — tarefa já incorporada ao contrato atual. Reforça validação de cursos médios, anos contínuos e matérias-chave por ano.
7. `src/docs/tarefas/Tarefa - Alinhar frontend com API sem PATCH de anos e sem sumarios.md` — fonte obrigatória de implementação específica. Confirma que o frontend não deve usar `PATCH /academia/anos-academicos` nem fluxos de sumários/aulas.
8. `src/docs/tarefas/Tarefa - Depurar e implementar atualizacoes completas da API no frontend.md` — fonte obrigatória da implementação desta entrega.

## Impacto aplicado nesta entrega

- O cliente HTTP agora modela o envelope de erro documentado (`error`, `message`, `request_id`, `details[]`) e extrai mensagens por prioridade `details[0].message`, `message`, `error`, fallback.
- Cursos, matérias e turmas passaram a usar a formatação centralizada de erro para preservar o `request_id` nas mensagens de operação crítica.
- Tipos de eventos deixam de expor `any` em `payload` e `metadata`, evitando contornar divergências de contrato.
- A auditoria confirmou que não há chamadas `api.patch(...)` no frontend atual para os módulos verificados; o método permanece no client genérico para rotas futuras, mas não há uso das rotas removidas.

## Rotas conferidas prioritariamente

- Cursos: `POST /academia/curso`, `GET /academia/cursos`, `GET /academia/curso/:id`, `PUT /academia/curso/:id/ativar`, `PUT /academia/curso/:id/desativar`, `PUT /academia/curso/:id/dados`, `DELETE /academia/curso/:id`.
- Matérias: `POST /academia/materia`, `GET /academia/materias`, `GET /academia/materia/:id`, `PUT /academia/materia/:id/ativar`, `PUT /academia/materia/:id/desativar`, `PUT /academia/materia/:id/dados`, `DELETE /academia/materia/:id`.
- Turmas: `POST /academia/turma`, `GET /academia/turmas`, `GET /academia/turma/:codigo`, `PUT /academia/turma/:codigo/ativar`, `PUT /academia/turma/:codigo/desativar`, `PUT /academia/turma/:codigo/dados`, `DELETE /academia/turma/:codigo`, vínculo/desvínculo de estudantes.
- Avaliação final: rotas de regras e consultas, mantendo ausência de rota pública de execução manual.
- Anos acadêmicos: `GET`, `POST` e `DELETE /academia/anos-academicos`; `PATCH` permanece classificado como removido.

## Divergências e riscos remanescentes

- A documentação exige auditoria de todos os fluxos de `/src`; esta entrega registra a auditoria documental completa e aplica a correção transversal de erros, mas recomenda uma segunda rodada focada em remover todos os `any` remanescentes em componentes legados e responses de consultas.
- Algumas telas ainda usam coerções locais de dados de listagem para lidar com renderização; elas devem ser tipadas progressivamente contra os envelopes de resposta da API.
