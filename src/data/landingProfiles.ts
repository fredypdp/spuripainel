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


export const profileContent: Record<Profile, ProfileContent> = {
  estudante: {
    label: "Estudante / Encarregado",
    headline: "Faça a sua matrícula, sem filas nem deslocações.",
    subheadline:
      "Peça a matrícula em qualquer colégio ou universidade parceira do Spuri, direto do telemóvel ou computador e acompanhe o pedido em tempo real.",
    problems: [
      "Filas longas e deslocações para tratar de matrícula",
      "Ter de se deslocar só para pagar propinas ou material",
      "Não saber a tempo quando sai uma nota, falta, pautas ou o seu certificado",
      "Perder ou danificar documentos físicos importantes",
      "Falta de visibilidade sobre o estado do pedido de matrícula",
    ],
    solutions: [
      "Matrícula 100% online, a qualquer hora",
      "Pagamento de propinas e material sem sair de casa",
      "Documentos enviados digitalmente, sem burocracia",
      "Notificações imediatas sobre notas, faltas e resultado da sua avaliação final",
      "Histórico académico seguro, protegido contra fraude e sempre acessível",
    ],
    highlights:
      "pagamentos e matrículas digitais · notificações em tempo real · painel do estudante com notas, faltas e avaliações.",
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
    headline: "Tecnologia de ponta ao alcance do seu colégio, sem grandes investimentos em infraestrutura.",
    subheadline:
      "O Spuri funciona a partir de qualquer computador ou telemóvel com internet, sem necessidade de servidores próprios ou equipa de TI, permitindo que o seu colégio alcance o mesmo nível tecnológico das maiores instituições do país.",
    problems: [
      "Filas e demora no atendimento aos encarregados de educação",
      "Pagamento de propinas realizado exclusivamente de forma presencial",
      "Registos académicos dispersos em papel ou folhas de Excel",
      "Ausência de mecanismos eficientes de controlo contra fraudes documentais",
      "Dependência de pessoas específicas para acesso às informações da instituição",
      "Dificuldade na geração de relatórios estatísticos e de gestão",
      "Risco de certificados e históricos falsificados no processo de matrícula",
    ],
    solutions: [
      "Maior competitividade face a instituições com processos ainda manuais",
      "Pagamento digital de propinas e demais encargos, com registo automático de todas as transações",
      "Imagem mais moderna e profissional junto de pais e encarregados de educação",
      "Sem necessidade de investimento em infraestrutura tecnológica própria",
      "Redução do tempo de atendimento através de notificações automáticas aos encarregados de educação",
      "Histórico académico dos estudantes organizado, centralizado e sempre disponível para consulta",
      "Consulta do histórico completo do estudante no momento da matrícula através do nosso ecossistema",
    ],
    highlights:
      "pagamentos e matrículas digitais · registo de notas e faltas · gestão financeira digital · notificações automáticas · avaliação final automática · Inteligência Artificial personalizada (em desenvolvimento).",
    cta: "Cadastrar instituição",
    href: "/instituicoes/cadastrar",
    steps: [
      "Mapeamos os processos essenciais do colégio.",
      "A equipa passa a operar matrículas, notas, faltas e finanças no Spuri.",
      "Relatórios e auditoria ficam prontos para gestão e inspeções.",
    ],
  },
  "colegio-grande-porte": {
    label: "Colégio — Grande Porte",
    headline: "Gerir milhares de estudantes com controlo, eficiência e segurança.",
    subheadline:
      "Centralize operações académicas, financeiras e administrativas numa única plataforma, com dados em tempo real, processos escaláveis e controlo total sobre a instituição.",
    problems: [
      "Grande volume de dados académicos difícil de gerir e manter consistente",
      "Falta de visibilidade em tempo real sobre o desempenho da instituição",
      "Processos manuais que limitam o crescimento e a eficiência operacional",
      "Cobrança de propinas e outros encargos dispersa por vários canais",
      "Dificuldade em realizar auditorias e acompanhar operações internas",
      "Risco de fraude documental que pode comprometer a reputação da instituição",
      "Processo de matrícula vulnerável a históricos e certificados falsificados",
    ],
    solutions: [
      "Gestão em massa de estudantes, notas e faltas com acompanhamento em tempo real",
      "Gestão financeira centralizada de propinas e demais encargos, com reconciliação automática",
      "Dashboard institucional com indicadores académicos e financeiros atualizados",
      "Avaliação final dos estudantes calculada automaticamente",
      "Auditoria completa e rastreabilidade de todas as operações",
      "Estrutura preparada para múltiplos cursos, turmas e turnos",
      "Acesso ao histórico completo do estudante no momento da matrícula através do nosso ecossistema",
    ],
    highlights:
      "operações em massa · gestão financeira centralizada · dashboards institucionais · relatórios estatísticos avançados · gestão de cursos e disciplinas · Inteligência Artificial institucional personalizada (em desenvolvimento).",
    cta: "Cadastrar instituição",
    href: "/instituicoes/cadastrar",
    steps: [
      "Centralize dados de cursos, turmas e estudantes.",
      "Execute operações em massa com acompanhamento em tempo real.",
      "Use dashboards, relatórios e auditoria para decisões e inspeções.",
    ],
  },
  "ensino-superior": {
    label: "Instituição de Ensino Superior",
    headline: "Gestão académica preparada para crescer com a sua instituição.",
    subheadline:
      "Centralize cursos, propinas, avaliações e processos académicos numa única plataforma, totalmente adaptável ao modelo da sua instituição.",
    problems: [
      "Processos académicos dispersos entre sistemas manuais e ferramentas sem integração",
      "Dificuldade na gestão de matrículas, notas e propinas em diferentes cursos e cadeiras",
      "Falta de controlo centralizado sobre estudantes com pendências académicas",
      "Necessidade de maior rastreabilidade para auditorias e processos de acreditação",
      "Processos manuais ou sistemas tecnológicos que dificultam o crescimento da instituição",
      "Risco de fraude em certificados e históricos apresentados no processo de matrícula",
    ],
    solutions: [
      "Estrutura académica configurável para cursos, cadeiras e modelos institucionais",
      "Fórmulas de avaliação e regras académicas totalmente personalizáveis",
      "Gestão financeira digital de propinas e demais encargos",
      "Cálculo automático da avaliação final e gestão de pendências académicas",
      "Credenciais verificáveis que reforçam a segurança e reputação institucional",
      "Operações em massa preparadas para acompanhar o crescimento da instituição",
      "Acesso ao histórico completo do estudante no momento da matrícula através do nosso ecossistema",
    ],
    highlights:
      "gestão de cursos e cadeiras · avaliação configurável · gestão financeira digital · operações em massa · auditoria académica · Inteligência Artificial institucional personalizada (em desenvolvimento).",
    cta: "Cadastrar instituição",
    href: "/instituicoes/cadastrar",
    steps: [
      "Configure cursos, cadeiras e regras académicas.",
      "Digitalize matrículas, propinas, avaliações e pendências.",
      "Acompanhe o crescimento com relatórios, operações em massa e auditoria.",
    ],
  },
};

export interface FeatureItem {
  title: string;
  description: string;
  /** Verdadeiro quando esta funcionalidade deve aparecer também na vista
   * curada do perfil Estudante/Encarregado (secção "Funcionalidades"). */
  studentRelevant?: boolean;
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
          "Elimine filas e papel: solicite, envie documentos e acompanhe matrículas de forma simples e rápida.",
        studentRelevant: true,
      },
      {
        title: "Notas e faltas sempre disponíveis",
        description:
          "Registo por trimestre ou semestre, com histórico académico centralizado e acessível.",
        studentRelevant: true,
      },
      {
        title: "Avaliação final automática",
        description:
          "Cálculo automático de aprovações e reprovações com base nas notas registadas, reduzindo erros manuais.",
      },
    ],
  },
  {
    title: "Gestão Financeira e Comunicação",
    items: [
      {
        title: "Pagamentos digitais",
        description:
          "Propinas, taxas e demais encargos cobrados e registados na própria plataforma, com maior controlo financeiro.",
        studentRelevant: true,
      },
      {
        title: "Notificações em tempo real",
        description:
          "Estudantes e encarregados de educação recebem avisos imediatos sobre notas, faltas, matrículas e outros comunicados.",
        studentRelevant: true,
      },
    ],
  },
  {
    title: "Redução de Custos",
    items: [
      {
        title: "Tempo administrativo",
        description:
          "Reduza o tempo gasto em tarefas repetitivas e permita que a equipa se concentre em atividades de maior valor.",
      },
      {
        title: "Papel, impressões e material de secretaria",
        description:
          "Matrículas, boletins, declarações e avisos passam a ser gerados e partilhados digitalmente.",
      },
      {
        title: "Arquivo físico e espaço de armazenamento",
        description:
          "Substitua arquivos físicos por registos digitais organizados, reduzindo a necessidade de espaço dedicado.",
      },
      {
        title: "Recuperação de documentos extraviados",
        description:
          "Reduza custos e riscos associados à perda de documentos através de históricos digitais centralizados.",
      },
      {
        title: "Cobrança e reconciliação financeira manual",
        description:
          "Automatize a confirmação de pagamentos e reduza erros em processos financeiros.",
      },
      {
        title: "Comunicação com encarregados de educação",
        description:
          "Reduza custos operacionais com comunicação automatizada através de notificações digitais.",
      },
      {
        title: "Trabalho administrativo repetitivo",
        description:
          "Automatize tarefas como transcrição de notas, consulta de processos e organização de informações.",
      },
      {
        title: "Ferramentas dispersas",
        description:
          "Centralize informações académicas, financeiras e administrativas numa única plataforma.",
      },
      {
        title: "Relatórios académicos e institucionais",
        description:
          "Reduza o tempo e os custos associados à elaboração de relatórios, com dados organizados e disponíveis automaticamente.",
      },
    ],
  },
  {
    title: "Confiança e Prestação de Contas",
    items: [
      {
        title: "Auditoria com rastreabilidade completa",
        description:
          "Cada alteração fica registada, garantindo maior transparência, controlo e segurança.",
      },
      {
        title: "Relatórios automáticos",
        description:
          "Indicadores e estatísticas gerados automaticamente, sem necessidade de consultas manuais.",
      },
    ],
  },
  {
    title: "Em Desenvolvimento",
    items: [
      {
        title: "Transferência de estudantes entre instituições",
        description:
          "Histórico académico portátil para facilitar processos de transferência.",
        studentRelevant: true,
      },
      {
        title: "Inteligência Artificial institucional personalizada",
        description:
          "Adaptada ao contexto da instituição — estudantes, turmas, notas e finanças — para apoiar a equipa de gestão na tomada de decisões.",
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
      "Cada nota, falta ou matrícula registada no Spuri gera um registo protegido por uma cadeia de verificação criptográfica, reforçando a integridade, a rastreabilidade e a confiança na informação académica. Cada operação relevante fica registada, permitindo auditoria e verificação ao longo do tempo.",
  },
];
