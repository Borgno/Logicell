import { Router } from "express";
import { DashboardService, type DashboardFiltros } from "../services/dashboard.server";
import { aplicarServerTiming } from "../lib/timing";

export const dashboardRouter = Router();

function texto(value: any): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

// Lê os filtros globais da querystring.
// faturista=<id|sem> · cliente=<pagador> · status= · tipo= · agencia=
function parseFiltros(query: Record<string, any>): DashboardFiltros {
  return {
    faturistaId: texto(query.faturista),
    pastaId: texto(query.pasta),
    pagador: texto(query.cliente),
    status: texto(query.status),
    tipoDocumento: texto(query.tipo),
    tipoCte: texto(query.tipoCte),
    agencia: texto(query.agencia),
  };
}

//Visão geral + lista de pastas (valor, quantidade, atrasos, faturista...).
dashboardRouter.get("/", async (req, res, next) => {
  try {
    const resumo = await DashboardService.resumo(parseFiltros(req.query as Record<string, any>));
    aplicarServerTiming(res);
    res.json(resumo);
  } catch (err) {
    next(err);
  }
});

//Listas distintas para os selects de filtro.
dashboardRouter.get("/opcoes", async (_req, res, next) => {
  try {
    res.json(await DashboardService.opcoes());
  } catch (err) {
    next(err);
  }
});

//Detalhe agregado de um faturista ("sem" = Caixa de Entrada + pastas sem dono).
dashboardRouter.get("/faturistas/:faturistaId", async (req, res, next) => {
  try {
    const raw = req.params.faturistaId;
    const faturistaId = raw === "sem" ? null : raw;
    const detalhe = await DashboardService.faturistaDetalhe(
      faturistaId,
      parseFiltros(req.query as Record<string, any>)
    );
    res.json(detalhe);
  } catch (err) {
    next(err);
  }
});

//Detalhamento de uma pasta ("inbox" = Caixa de Entrada).
dashboardRouter.get("/pastas/:pastaId", async (req, res, next) => {
  try {
    const raw = req.params.pastaId;
    let pastaId: number | null;
    if (raw === "inbox") {
      pastaId = null;
    } else {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        res.status(400).json({ error: "ID de pasta inválido." });
        return;
      }
      pastaId = parsed;
    }
    const detalhe = await DashboardService.pastaDetalhe(pastaId);
    res.json(detalhe);
  } catch (err) {
    next(err);
  }
});
