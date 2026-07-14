// src/data/landingProfiles.ts
// Conteúdo da landing page pública, separado dos componentes de apresentação.
// Copy revista e aprovada ao longo do planeamento da página — ver documento
// de especificação para o histórico das decisões.

export type Profile =
  | "estudante"
  | "colegio-pequeno-medio"
  | "colegio-grande-porte"
  | "ensino-superior";

export type PrimaryProfile = "estudante" | "colegio" | "ensino-superior";

export const CONTACT_EMAIL = "spuriartipan@gmail.com";

export interface ProfileContent {
  label: string;
  headline: string;
  subheadline: string;
  problems: string[];
  solutions: string[];
  highlights: string;
  cta: string;
  href: string;
  steps: string[];
}

function mailtoFor(subject: string): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

export const profileContent: Record<Profile, ProfileContent> = {
  estudante: {
    label: "Estudante / Encarregado",
    headline: "A matrícula do seu educando, sem filas nem deslocações.",
    subheadline:
      "Peça a matrícula em qualquer colégio ou universidade parceira do Spuri, direto do telemóvel ou computador — envie os documentos online e acompanhe o pedido em tempo real.",
    problems: [
      "Filas longas e deslocações para tratar de matrícula",
      "Ter de se deslocar só para pagar propinas ou material",
      "Não saber a tempo quando sai uma nota, falta ou o seu certificado",
      "Perder ou danificar documentos físicos importantes",
      "Falta de visibilidade sobre o estado do pedido de matrícula",
    ],
    solutions: [
      "Matrícula 100% online, a qualquer hora",
      "Pagamento de propinas e material sem sair de casa",
      "Documentos enviados digitalmente, sem burocracia",
      "Notificações imediatas sobre notas, faltas e atualizações da matrícula",
      "Histórico académico seguro, protegido contra fraude e sempre acessível",
    ],
    highlights:
      "pedido de matrícula com envio de documentos · notificações em tempo real · pagamentos digitais · painel do estudante com notas, faltas e avaliações.",
    cta: "Fazer Matrícula",
    href: "/matricula",
    steps: [
      "Escolha uma instituição parceira.",
      "Envie documentos e solicite a matrícula online.",
      "Acompanhe respostas, pagamentos, notas e faltas no seu painel.",
    ],
  },
  "colegio-pequeno-medio": {
    label: "Colégio — Pequeno/Médio Porte",
    headline: "Tecnologia de ponta, ao alcance do seu colégio — mesmo sem grande estrutura.",
    subheadline:
      "Não precisa de equipa de TI nem de servidores próprios: o Spuri funciona a partir de qualquer computador ou telemóvel com internet, e coloca o seu colégio ao mesmo nível tecnológico das maiores instituições do país.",
    problems: [
      "Filas e atendimento lento no secretariado",
      "Cobrança de propinas feita à mão, sem controlo centralizado",
      "Registos manuais em papel ou em folhas de Excel dispersas",
      "Risco de fraude documental sem qualquer mecanismo de controlo",
      "Dependência de uma única pessoa para aceder à informação da escola",
      "Dificuldade em responder a auditorias e inspeções de órgãos reguladores",
      "Risco de fraude em certificados e históricos recebidos dos estudantes na hora da matrícula",
    ],
    solutions: [
      "Diferencial competitivo imediato frente a colégios ainda 100% manuais",
      "Cobrança de propinas e material simplificada, com registo digital de pagamentos",
      "Imagem mais moderna e profissional junto de pais e encarregados de educação",
      "Sem necessidade de investimento em infraestrutura de TI",
      "Menos tempo a atender encarregados de educação, porque já recebem notificações automáticas",
      "Auditoria e conformidade facilitadas perante o Ministério da Educação",
      "Fazendo parte do nosso ecossistema, a instituição poderá consultar todo o histórico do estudante na hora da matrícula",
    ],
    highlights:
      "matrículas digitais · registo de notas e faltas por trimestre · gestão financeira digital · notificações automáticas para encarregados de educação · avaliação final automática · IA institucional contextualizada (em desenvolvimento).",
    cta: "Fale Connosco",
    href: mailtoFor("Spuri — Colégio – Pequeno/Médio Porte"),
    steps: [
      "Mapeamos os processos essenciais do colégio.",
      "A equipa passa a operar matrículas, notas, faltas e finanças no Spuri.",
      "Relatórios e auditoria ficam prontos para gestão e inspeções.",
    ],
  },
  "colegio-grande-porte": {
    label: "Colégio — Grande Porte",
    headline: "Gerir milhares de estudantes sem perder o controlo — nem o rigor.",
    subheadline:
      "Processos em massa, gestão financeira centralizada e auditoria completa para colégios com centenas ou milhares de estudantes, várias turmas e cursos.",
    problems: [
      "Volume elevado de dados académicos difícil de manter consistente",
      "Falta de visibilidade em tempo real sobre o desempenho da escola",
      "Processos manuais que não escalam com o crescimento da instituição",
      "Cobrança de propinas e taxas dispersas por vários canais, difícil de reconciliar",
      "Risco de fraude documental a uma escala que pode manchar a reputação",
      "Auditorias e inspeções mais complexas quanto maior a instituição",
      "Risco de fraude em certificados e históricos recebidos dos estudantes na hora da matrícula",
    ],
    solutions: [
      "Registo em massa de estudantes, notas e faltas, com acompanhamento em tempo real",
      "Gestão financeira centralizada — propinas e material cobrados e conciliados na mesma plataforma",
      "Dashboard com dados académicos sempre atualizados",
      "Avaliação final do estudante feita automaticamente",
      "Auditoria e cadeia de integridade prontas para qualquer inspeção",
      "Estrutura preparada para múltiplos cursos, turmas e turnos",
      "Fazendo parte do nosso ecossistema, a instituição poderá consultar todo o histórico do estudante na hora da matrícula",
    ],
    highlights:
      "processos em lote para operações em massa · gestão financeira digital · filtros avançados de consulta · relatórios e estatísticas · gestão completa de cursos e matérias disciplinares · IA institucional contextualizada (em desenvolvimento).",
    cta: "Fale Connosco",
    href: mailtoFor("Spuri — Colégio – Grande Porte"),
    steps: [
      "Centralize dados de cursos, turmas e estudantes.",
      "Execute operações em massa com acompanhamento em tempo real.",
      "Use dashboards, relatórios e auditoria para decisões e inspeções.",
    ],
  },
  "ensino-superior": {
    label: "Instituição de Ensino Superior",
    headline: "Gestão académica completa, do primeiro semestre ao milésimo estudante.",
    subheadline:
      "Cursos, semestres, propinas, avaliações — tudo configurável ao vosso modelo, quer estejam a começar, quer já giram milhares de estudantes em vários cursos.",
    problems: [
      "Falta de um sistema de gestão académica formal e credível",
      "Processos manuais de matrícula, lançamento de notas e cobrança de propinas por semestre",
      "Estudantes com cadeiras em atraso sem controlo centralizado",
      "Falta de auditoria robusta para processos de acreditação",
      "Dificuldade em escalar processos manuais à medida que o número de estudantes cresce",
      "Risco de fraude em certificados e históricos recebidos dos estudantes na hora da matrícula",
    ],
    solutions: [
      "Estrutura de cursos e semestres configurável ao vosso modelo, desde o primeiro dia",
      "Categorias de avaliação e fórmulas de avaliação final configuráveis",
      "Gestão financeira digital de propinas, adequada a qualquer volume",
      "Motor de avaliação final automático, por matéria disciplinar/cadeira, com gestão de pendências académicas",
      "Credenciais verificáveis que reforçam a reputação institucional",
      "Processos em massa prontos para quando o volume crescer, sem trocar de plataforma",
      "Fazendo parte do nosso ecossistema, a instituição poderá consultar todo o histórico do estudante na hora da matrícula",
    ],
    highlights:
      "configuração de cursos por número de semestres · fórmulas de avaliação configuráveis · gestão financeira digital · processos em massa · IA institucional contextualizada (em desenvolvimento).",
    cta: "Fale Connosco",
    href: mailtoFor("Spuri — Instituição de Ensino Superior"),
    steps: [
      "Configure cursos, semestres e regras de avaliação.",
      "Digitalize matrículas, propinas, notas e pendências académicas.",
      "Acompanhe crescimento com relatórios, processos em massa e auditoria.",
    ],
  },
};

export interface FeatureItem {
  title: string;
  description: string;
}

export interface FeatureCategory {
  title: string;
  items: FeatureItem[];
}

export const featureCategories: FeatureCategory[] = [
  {
    title: "Gestão Académica",
    items: [
      {
        title: "Matrículas 100% digitais",
        description:
          "Sem filas, sem papel: peça, envie os documentos e acompanhe a matrícula em poucos cliques.",
      },
      {
        title: "Notas e faltas sempre à mão",
        description: "Registo por trimestre ou semestre, com histórico que nunca se perde.",
      },
      {
        title: "Avaliação final automática",
        description:
          "Aprovações e reprovações calculadas a partir das notas lançadas, sem cálculos manuais nem margem de erro.",
      },
    ],
  },
  {
    title: "Gestão Financeira",
    items: [
      {
        title: "Pagamentos digitais",
        description:
          "Propinas, material escolar e outras taxas, cobradas e confirmadas dentro da própria plataforma, sem guichés nem recibos em papel.",
      },
    ],
  },
  {
    title: "Redução de Custos",
    items: [
      {
        title: "Tempo",
        description: "O maior ativo de um ser humano — tempo perdido nunca mais volta.",
      },
      {
        title: "Papel, impressões e material de secretaria",
        description:
          "Matrículas, boletins, declarações e avisos deixam de precisar de ser impressos; tudo é gerado e partilhado digitalmente.",
      },
      {
        title: "Arquivo físico e espaço de armazenamento",
        description:
          "Sem pastas, armários e salas dedicadas a guardar processos em papel; o espaço pode ser reaproveitado.",
      },
      {
        title: "Perda e reconstituição de documentos extraviados",
        description:
          "Sem o risco, nem o custo, de reconstituir históricos perdidos por humidade, incêndio ou desorganização.",
      },
      {
        title: "Cobrança e reconciliação financeira manual",
        description: "Menos tempo, e menos erros, a confirmar pagamentos um a um.",
      },
      {
        title: "Comunicação avulsa com encarregados de educação",
        description: "Menos chamadas, SMS e cartas enviadas para casa.",
      },
      {
        title: "Horas de trabalho administrativo repetitivo",
        description: "Menos tempo a transcrever notas à mão ou a localizar processos.",
      },
      {
        title: "Ferramentas dispersas e desligadas entre si",
        description: "Sem precisar de manter Excel, papel e outras ferramentas soltas em paralelo.",
      },
      {
        title: "Preparação de auditorias e inspeções",
        description:
          "Sem custo extra a reunir documentação física; o histórico já está organizado e pronto a consultar.",
      },
    ],
  },
  {
    title: "Comunicação",
    items: [
      {
        title: "Notificações em tempo real",
        description:
          "Estudantes e encarregados de educação recebem avisos imediatos sobre notas, faltas, matrículas e outros comunicados.",
      },
    ],
  },
  {
    title: "Confiança e Prestação de Contas",
    items: [
      {
        title: "Auditoria inviolável",
        description: "Cada registo é protegido por uma cadeia de verificação; qualquer alteração deixa rasto.",
      },
      {
        title: "Relatórios",
        description: "Estatísticas geradas automaticamente, sem consultar documentos manualmente.",
      },
    ],
  },
  {
    title: "Em Desenvolvimento",
    items: [
      {
        title: "Transferência de estudante entre instituições",
        description: "Com histórico académico portátil. Já a caminho.",
      },
      {
        title: "IA institucional contextualizada",
        description:
          "Treinada com o contexto real da vossa instituição — estudantes, turmas, notas, finanças — pronta a ajudar a equipa de gestão a decidir mais rápido.",
      },
    ],
  },
];

export interface Differentiator {
  title: string;
  description: string;
}

export const differentiators: Differentiator[] = [
  {
    title: "Ecossistema Interligado",
    description:
      "Ao contrário de soluções que funcionam como ilhas isoladas, o Spuri reúne escolas e universidades numa única plataforma nacional, com um diretório público de instituições sempre disponível para consulta.",
  },
  {
    title: "Imutabilidade e Auditoria",
    description:
      "Cada nota, falta ou matrícula gera um registo protegido por uma cadeia de verificação criptográfica — qualquer tentativa de alteração é detetável.",
  },
];
