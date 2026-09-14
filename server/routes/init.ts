import { Router } from "express";
import { PastaService } from "../services/pasta.server";
import { OperacaoService } from "../services/operacao.server";
import { OrdemColunasService } from "../services/config.server";
import { getUser, type AuthedResponse } from "../middlewares/auth";
import { aplicarServerTiming } from "../lib/timing";

export const initRouter = Router();

//Dados de boot do cliente: pastas, contadores por pasta e ordem de colunas.
initRouter.get("/", async (_req, res: AuthedResponse) => {
  const user = getUser(res);
  const [pastas, totalInbox, columnOrder, emissaoAntigasPorPasta] = await Promise.all([
    PastaService.listar().catch(() => []),
    OperacaoService.contarInbox().catch(() => 0),
    OrdemColunasService.get().catch(() => null),
    OperacaoService.contarEmissoesAntigasPorPasta().catch(() => ({})),
  ]);
  aplicarServerTiming(res);
  res.json({ user, pastas, totalInbox, columnOrder, emissaoAntigasPorPasta });
});
