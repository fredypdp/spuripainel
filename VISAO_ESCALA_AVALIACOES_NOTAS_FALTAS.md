# Visão textual em escala — Avaliações finais, notas e faltas

Este documento representa textualmente os fluxos de navegação em escala das visões de avaliações finais, notas e faltas para os perfis Academia, Admin e Estudante, separados por nível de ensino quando a tela possui caminhos distintos.

## Avaliações finais

### AvaliacoesFinaisAcademia.tsx

AvaliacoesFinaisAcademia.tsx (Academia mista)
│
└── Seleção do tipo de ensino
    ├── Ensino fundamental
    │   └── Seleção do ano letivo
    │       └── Visão geral do ensino fundamental
    │           └── Seleção da turma
    │               └── Tela de exibição dos resultados finais dos estudantes da turma
    └── Ensino médio / superior
        └── Seleção do ano letivo
            └── Seleção do curso
                └── Visão geral do curso
                    └── Seleção da turma
                        └── Tela de exibição dos resultados finais dos estudantes da turma

AvaliacoesFinaisAcademia.tsx (Ensino fundamental)
│
└── Seleção do ano letivo
    └── Visão geral do ensino fundamental
        └── Seleção da turma
            └── Tela de exibição dos resultados finais dos estudantes da turma

AvaliacoesFinaisAcademia.tsx (Ensino médio)
│
└── Seleção do ano letivo
    └── Seleção do curso
        └── Visão geral do curso
            └── Seleção da turma
                └── Tela de exibição dos resultados finais dos estudantes da turma

AvaliacoesFinaisAcademia.tsx (Ensino superior)
│
└── Seleção do ano letivo
    └── Seleção do curso
        └── Visão geral do curso
            └── Seleção da turma
                └── Tela de exibição dos resultados finais dos estudantes da turma

### AvaliacoesFinaisAdmin.tsx

AvaliacoesFinaisAdmin.tsx (Ensino fundamental)
│
└── Seleção do ano letivo global
    └── Seleção da província
        └── Seleção da academia
            └── Seleção do ano letivo da academia
                └── Seleção do ano acadêmico
                    └── Tela de exibição dos resultados finais dos estudantes

AvaliacoesFinaisAdmin.tsx (Ensino médio)
│
└── Seleção do ano letivo global
    └── Seleção da província
        └── Seleção da academia
            └── Seleção do ano letivo da academia
                └── Seleção do ano acadêmico
                    └── Tela de exibição dos resultados finais dos estudantes

AvaliacoesFinaisAdmin.tsx (Ensino superior)
│
└── Seleção do ano letivo global
    └── Seleção da província
        └── Seleção da academia
            └── Seleção do ano letivo da academia
                └── Seleção do ano acadêmico
                    └── Tela de exibição dos resultados finais dos estudantes

### AvaliacoesFinaisEstudante.tsx

AvaliacoesFinaisEstudante.tsx (Ensino fundamental)
│
└── Seleção do ano letivo
    └── Seleção do ciclo de ensino
        └── Tela de exibição dos resultados finais do estudante

AvaliacoesFinaisEstudante.tsx (Ensino médio)
│
└── Seleção do ano letivo
    └── Seleção do ciclo de ensino
        └── Tela de exibição dos resultados finais do estudante

AvaliacoesFinaisEstudante.tsx (Ensino superior)
│
└── Seleção do ano letivo
    └── Seleção do ciclo de ensino
        └── Tela de exibição dos resultados finais do estudante

## Notas

### NotasAcademia.tsx

NotasAcademia.tsx (Academia mista)
│
└── Seleção do tipo de ensino
    ├── Ensino fundamental / médio
    │   └── Seleção do ano acadêmico
    │       └── Seleção da turma
    │           └── Seleção do período
    │               └── Tela de exibição e registro das notas dos estudantes
    └── Ensino superior
        └── Seleção do curso
            └── Seleção do ano acadêmico
                └── Seleção da turma
                    └── Seleção do período
                        └── Tela de exibição e registro das notas dos estudantes

NotasAcademia.tsx (Ensino fundamental)
│
└── Seleção do ano acadêmico
    └── Seleção da turma
        └── Seleção do período
            └── Tela de exibição e registro das notas dos estudantes

NotasAcademia.tsx (Ensino médio)
│
└── Seleção do ano acadêmico
    └── Seleção da turma
        └── Seleção do período
            └── Tela de exibição e registro das notas dos estudantes

NotasAcademia.tsx (Ensino superior)
│
└── Seleção do curso
    └── Seleção do ano acadêmico
        └── Seleção da turma
            └── Seleção do período
                └── Tela de exibição e registro das notas dos estudantes

### NotasAdmin.tsx

NotasAdmin.tsx (Ensino fundamental)
│
└── Seleção da província
    └── Seleção da academia
        └── Seleção do ano acadêmico
            └── Seleção da turma
                └── Seleção do período
                    └── Tela de exibição das notas dos estudantes

NotasAdmin.tsx (Ensino médio)
│
└── Seleção da província
    └── Seleção da academia
        └── Seleção do ano acadêmico
            └── Seleção da turma
                └── Seleção do período
                    └── Tela de exibição das notas dos estudantes

NotasAdmin.tsx (Ensino superior)
│
└── Seleção da província
    └── Seleção da academia
        └── Seleção do curso
            └── Seleção do ano acadêmico
                └── Seleção da turma
                    └── Seleção do período
                        └── Tela de exibição das notas dos estudantes

### NotasEstudante.tsx

NotasEstudante.tsx (Ensino fundamental)
│
└── Seleção da academia
    └── Seleção do ano letivo
        └── Seleção do ano acadêmico
            └── Seleção do período
                └── Tela de exibição das notas do estudante

NotasEstudante.tsx (Ensino médio)
│
└── Seleção da academia
    └── Seleção do ano letivo
        └── Seleção do ano acadêmico
            └── Seleção do período
                └── Tela de exibição das notas do estudante

NotasEstudante.tsx (Ensino superior)
│
└── Seleção da academia
    └── Seleção do ano letivo
        └── Seleção do ano acadêmico
            └── Seleção do período
                └── Tela de exibição das notas do estudante

## Faltas

### FaltasAcademia.tsx

FaltasAcademia.tsx (Academia mista)
│
└── Seleção do tipo de ensino
    ├── Ensino fundamental / médio
    │   └── Seleção do ano acadêmico
    │       └── Seleção da turma
    │           └── Tela de exibição e registro das faltas dos estudantes
    └── Ensino superior
        └── Seleção do curso
            └── Seleção do ano acadêmico
                └── Seleção da turma
                    └── Tela de exibição e registro das faltas dos estudantes

FaltasAcademia.tsx (Ensino fundamental)
│
└── Seleção do ano acadêmico
    └── Seleção da turma
        └── Tela de exibição e registro das faltas dos estudantes

FaltasAcademia.tsx (Ensino médio)
│
└── Seleção do ano acadêmico
    └── Seleção da turma
        └── Tela de exibição e registro das faltas dos estudantes

FaltasAcademia.tsx (Ensino superior)
│
└── Seleção do curso
    └── Seleção do ano acadêmico
        └── Seleção da turma
            └── Tela de exibição e registro das faltas dos estudantes

### FaltasAdmin.tsx

FaltasAdmin.tsx (Ensino fundamental)
│
└── Seleção da província
    └── Seleção da academia
        └── Seleção do ano acadêmico
            └── Seleção da turma
                └── Tela de exibição das faltas dos estudantes

FaltasAdmin.tsx (Ensino médio)
│
└── Seleção da província
    └── Seleção da academia
        └── Seleção do ano acadêmico
            └── Seleção da turma
                └── Tela de exibição das faltas dos estudantes

FaltasAdmin.tsx (Ensino superior)
│
└── Seleção da província
    └── Seleção da academia
        └── Seleção do curso
            └── Seleção do ano acadêmico
                └── Seleção da turma
                    └── Tela de exibição das faltas dos estudantes

### FaltasEstudante.tsx

FaltasEstudante.tsx (Ensino fundamental)
│
└── Seleção da academia
    └── Seleção do ano letivo
        └── Seleção da turma
            └── Seleção da matéria
                └── Tela de exibição das faltas do estudante

FaltasEstudante.tsx (Ensino médio)
│
└── Seleção da academia
    └── Seleção do ano letivo
        └── Seleção da turma
            └── Seleção da matéria
                └── Tela de exibição das faltas do estudante

FaltasEstudante.tsx (Ensino superior)
│
└── Seleção da academia
    └── Seleção do ano letivo
        └── Seleção da turma
            └── Seleção da matéria
                └── Tela de exibição das faltas do estudante
