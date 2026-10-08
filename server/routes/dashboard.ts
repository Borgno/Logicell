import { Router } from "express";
import { DashboardService, type DashboardFiltros } from "../services/dashboard.server";
import { PastaService } from "../services/pasta.server";
import { ehGestor, getUser, type AuthedResponse } from "../middlewares/auth";
import { aplicarServerTiming } from "../lib/timing";

export const dashboardRouter = Router();

function texto(value: any): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

//Gestor e admin veem tudo. O usuário comum só vê o próprio recorte: devolve o
//id dele (faturista das pastas) para forçar o filtro, ou null se não há restrição.
async function faturistaRestrito(res: AuthedResponse): Promise<string | null> {
  const user = getUser(res);
  return (await ehGestor(user)) ? null : user.id;
}

function negar(): never {
  const err: any = new Error("Você só pode ver o dashboard das suas pastas.");
  err.status = 403;
  throw err;
}

//Data no formato YYYY-MM-DD (o que o <input type="date"> envia); o resto é
//ignorado. A ida e volta barra dias inexistentes (2026-02-30), que o
//Date.parse aceita e o Postgres recusaria.
function dataISO(value: any): string | undefined {
  const v = texto(value);
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v ? v : undefined;
}

// Lê os filtros globais da querystring.
// faturista=<id|sem> · cliente=<pagador> · status= · tipo= · agencia= · de=/ate=<YYYY-MM-DD>
function parseFiltros(query: Record<string, any>): DashboardFiltros {
  return {
    faturistaId: texto(query.faturista),
    pastaId: texto(query.pasta),
    pagador: texto(query.cliente),
    status: texto(query.status),
    tipoDocumento: texto(query.tipo),
    tipoCte: texto(query.tipoCte),
    agencia: texto(query.agencia),
    antigas: query.antigas === "1" ? "1" : undefined,
    emissaoDe: dataISO(query.de),
    emissaoAte: dataISO(query.ate),
  };
}

//Visão geral + lista de pastas (valor, quantidade, atrasos, faturista...).
dashboardRouter.get("/", async (req, res: AuthedResponse, next) => {
  try {
    const filtros = parseFiltros(req.query as Record<string, any>);
    const restrito = await faturistaRestrito(res);
    if (restrito) filtros.faturistaId = restrito;
    const resumo = await DashboardService.resumo(filtros);
    aplicarServerTiming(res);
    res.json(resumo);
  } catch (err) {
    next(err);
  }
});

//Listas distintas para os selects de filtro.
dashboardRouter.get("/opcoes", async (_req, res: AuthedResponse, next) => {
  try {
    const opcoes = await DashboardService.opcoes();
    const restrito = await faturistaRestrito(res);
    if (restrito) {
      res.json({
        ...opcoes,
        faturistas: opcoes.faturistas.filter((f) => f.id === restrito),
        pastas: opcoes.pastas.filter((p) => p.faturistaId === restrito),
      });
      return;
    }
    res.json(opcoes);
  } catch (err) {
    next(err);
  }
});

//Cubo do detalhe de um faturista ("sem" = Caixa de Entrada + pastas sem dono)
//com os filtros globais; os sub-filtros do detalhe são recalculados no navegador.
dashboardRouter.get("/faturistas/:faturistaId/cubo", async (req, res: AuthedResponse, next) => {
  try {
    const raw = req.params.faturistaId;
    const faturistaId = raw === "sem" ? null : raw;
    const restrito = await faturistaRestrito(res);
    if (restrito && faturistaId !== restrito) negar();
    const cubo = await DashboardService.faturistaCubo(
      faturistaId,
      parseFiltros(req.query as Record<string, any>)
    );
    aplicarServerTiming(res);
    res.json(cubo);
  } catch (err) {
    next(err);
  }
});

//Detalhamento de uma pasta ("inbox" = Caixa de Entrada).
dashboardRouter.get("/pastas/:pastaId", async (req, res: AuthedResponse, next) => {
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
    const restrito = await faturistaRestrito(res);
    if (restrito) {
      const pasta = pastaId === null ? null : await PastaService.buscarPorId(pastaId);
      if (pasta?.faturistaId !== restrito) negar();
    }
    const detalhe = await DashboardService.pastaDetalhe(pastaId);
    res.json(detalhe);
  } catch (err) {
    next(err);
  }
});
