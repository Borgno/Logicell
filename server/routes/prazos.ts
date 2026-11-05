import { Router } from "express";
import { PrazoService } from "../services/prazo.server";
import { OperacaoService } from "../services/operacao.server";

export const prazosRouter = Router();

function parseId(value: any): number {
  const id = Number(value);
  if (!Number.isFinite(id)) {
    const err: any = new Error("ID inválido");
    err.status = 400;
    throw err;
  }
  return id;
}

function parsePrazoDias(value: any): number {
  const dias = Number(value);
  if (!Number.isInteger(dias) || dias < 1 || dias > 3650) {
    const err: any = new Error("Prazo deve ser um número inteiro entre 1 e 3650 dias.");
    err.status = 400;
    throw err;
  }
  return dias;
}

// Regras atuais: prazo padrão global + todas as pastas, com o prazo próprio de cada uma.
prazosRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await PrazoService.listar());
  } catch (err) {
    next(err);
  }
});

prazosRouter.put("/padrao", async (req, res, next) => {
  try {
    const prazoDias = parsePrazoDias(req.body?.prazoDias);
    await PrazoService.atualizarPadrao(prazoDias);
    OperacaoService.invalidarCache();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Define ou altera o prazo próprio de uma pasta.
prazosRouter.put("/pastas/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const prazoDias = parsePrazoDias(req.body?.prazoDias);
    await PrazoService.definirPrazoPasta(id, prazoDias);
    OperacaoService.invalidarCache();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Remove a exceção: a pasta volta a usar o prazo padrão.
prazosRouter.delete("/pastas/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    await PrazoService.definirPrazoPasta(id, null);
    OperacaoService.invalidarCache();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
