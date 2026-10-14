import { Router } from "express";
import { PastaService } from "../services/pasta.server";
import { OperacaoService } from "../services/operacao.server";
import { OrdemColunasService } from "../services/config.server";
import { StatusService } from "../services/status.server";
import { getUser, type AuthedResponse } from "../middlewares/auth";
import { aplicarServerTiming } from "../lib/timing";

export const initRouter = Router();

//Dados de boot do cliente: pastas, contadores por pasta, ordem de colunas e
//opções ativas de status (editor da coluna status na grid).
initRouter.get("/", async (_req, res: AuthedResponse) => {
  const user = getUser(res);
  const [pastas, totalInbox, columnOrder, emissaoAntigasPorPasta, statusOpcoes] = await Promise.all([
    PastaService.listar().catch(() => []),
    OperacaoService.contarInbox().catch(() => 0),
    OrdemColunasService.get().catch(() => null),
    OperacaoService.contarEmissoesAntigasPorPasta().catch(() => ({})),
    StatusService.ativos().catch(() => [] as string[]),
  ]);
  aplicarServerTiming(res);
  res.json({ user, pastas, totalInbox, columnOrder, emissaoAntigasPorPasta, statusOpcoes });
});
