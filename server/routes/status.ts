import { Router } from "express";
import { StatusService } from "../services/status.server";

export const statusRouter = Router();

function parseId(value: any): number {
  const id = Number(value);
  if (!Number.isFinite(id)) {
    const err: any = new Error("ID inválido");
    err.status = 400;
    throw err;
  }
  return id;
}

//Todos os status, inclusive inativos, para a página de gestão.
statusRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ status: await StatusService.listar() });
  } catch (err) {
    next(err);
  }
});

statusRouter.post("/", async (req, res, next) => {
  try {
    await StatusService.criar(String(req.body?.nome || ""));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

//Corpo com nome e/ou ativo.
statusRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (typeof req.body?.nome === "string") await StatusService.renomear(id, req.body.nome);
    if (typeof req.body?.ativo === "boolean") await StatusService.definirAtivo(id, req.body.ativo);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

statusRouter.put("/ordem", async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(parseId) : [];
    await StatusService.reordenar(ids);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

statusRouter.delete("/:id", async (req, res, next) => {
  try {
    await StatusService.remover(parseId(req.params.id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
