import { consultasService } from "./services";
import type {
  AcademiaDetalhada,
  ConsultarAcademiasResponse,
  ConsultarEstudantesResponse,
  EstudanteDetalhado,
} from "@/types/api";

const ITEMS_POR_PAGINA = 50;

export async function listarTodasAcademias(
  params?: Parameters<typeof consultasService.listarAcademias>[0]
): Promise<ConsultarAcademiasResponse> {
  if (typeof params?.offset === "number" || typeof params?.limit === "number") {
    return consultasService.listarAcademias({ ...params, limit: params.limit ?? ITEMS_POR_PAGINA, offset: params.offset ?? 0 });
  }

  let offset = 0;
  const academias: AcademiaDetalhada[] = [];
  let primeiraPagina: ConsultarAcademiasResponse | null = null;

  while (true) {
    const pagina = await consultasService.listarAcademias({ ...params, limit: ITEMS_POR_PAGINA, offset });
    if (!primeiraPagina) primeiraPagina = pagina;
    const itens = pagina.academias ?? [];
    academias.push(...itens);

    const totalGeral = pagina.total_geral;
    if ((typeof totalGeral === "number" && academias.length >= totalGeral) || itens.length < ITEMS_POR_PAGINA) break;
    offset += ITEMS_POR_PAGINA;
  }

  return {
    ...(primeiraPagina ?? { total: 0, tipo_usuario: "admin" as const }),
    academias,
    total: academias.length,
  };
}

export async function listarTodosEstudantes(
  params?: Parameters<typeof consultasService.listarEstudantes>[0]
): Promise<ConsultarEstudantesResponse> {
  if (typeof params?.offset === "number" || typeof params?.limit === "number") {
    return consultasService.listarEstudantes({ ...params, limit: params.limit ?? ITEMS_POR_PAGINA, offset: params.offset ?? 0 });
  }

  let offset = 0;
  const estudantes: EstudanteDetalhado[] = [];
  let primeiraPagina: ConsultarEstudantesResponse | null = null;

  while (true) {
    const pagina = await consultasService.listarEstudantes({ ...params, limit: ITEMS_POR_PAGINA, offset });
    if (!primeiraPagina) primeiraPagina = pagina;
    const itens = pagina.estudantes ?? [];
    estudantes.push(...itens);

    const totalGeral = pagina.total_geral;
    if ((typeof totalGeral === "number" && estudantes.length >= totalGeral) || itens.length < ITEMS_POR_PAGINA) break;
    offset += ITEMS_POR_PAGINA;
  }

  return {
    ...(primeiraPagina ?? { total: 0, tipo_usuario: "academia" as const }),
    estudantes,
    total: estudantes.length,
  };
}
