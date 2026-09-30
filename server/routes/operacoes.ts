import { Router } from "express";
import multer from "multer";
import { OperacaoService } from "../services/operacao.server";
import { OperacaoImportService } from "../services/operacao-import.server";
import { getUser, type AuthedResponse } from "../middlewares/auth";
import { aplicarServerTiming } from "../lib/timing";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export const operacoesRouter = Router();

function parseId(value: any): number {
  const id = Number(value);
  if (!Number.isFinite(id)) {
    const err: any = new Error("ID inválido");
    err.status = 400;
    throw err;
  }
  return id;
}

function parseParams(raw: Record<string, unknown>) {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") params[k] = v;
  }
  if ("pastaId" in params) {
    const pid = Number(params.pastaId);
    params.pastaId = Number.isFinite(pid) ? String(pid) : "";
  }
  return params;
}

//Lista paginada com filtros/sort — substitui os loaders de inbox/pastas e o antigo /api/operacoes-list.
operacoesRouter.get("/", async (req, res: AuthedResponse, next) => {
  try {
    getUser(res);
    const params = parseParams(req.query as Record<string, unknown>);
    const { dbMs, ...dados } = await OperacaoService.listarOperacoesLocal(params);
    res.locals.timing.marcas.push({ nome: "db", dur: dbMs });
    aplicarServerTiming(res);
    res.json(dados);
  } catch (err) {
    next(err);
  }
});

operacoesRouter.get("/agencias", async (_req, res: AuthedResponse, next) => {
  try {
    getUser(res);
    res.json(await OperacaoService.buscarAgencias());
  } catch (err) {
    next(err);
  }
});

operacoesRouter.patch("/:id", async (req, res: AuthedResponse, next) => {
  try {
    getUser(res);
    const id = parseId(req.params.id);
    const campo = String(req.body?.campo || "");
    const valor = String(req.body?.valor ?? "");
    if (!campo) {
      res.status(400).json({ error: "Campo não informado." });
      return;
    }
    await OperacaoService.update(id, campo, valor);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

operacoesRouter.post("/bulk", async (req, res: AuthedResponse, next) => {
  try {
    getUser(res);
    const action = String(req.body?.action || "");
    const body = req.body || {};

    if (action === "update") {
      const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
      const campo = String(body.campo || "");
      const valor = String(body.valor ?? "");
      if (!campo) {
        res.status(400).json({ error: "Campo não informado." });
        return;
      }
      await OperacaoService.bulkUpdate(ids, campo, valor);
      res.json({ success: true, intent: "bulkUpdate" });
      return;
    }

    if (action === "move" || action === "delete") {
      const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
      const filters = body.filters || {};
      const selectAll = body.selectAll === true;
      const excludedIds = Array.isArray(body.excludedIds) ? body.excludedIds.map(Number) : [];

      if (action === "move") {
        const pastaRaw = body.pastaId;
        const pastaId = pastaRaw === null || pastaRaw === undefined || pastaRaw === "" ? null : Number(pastaRaw);
        await OperacaoService.bulkActionPasta({ ids, pastaId, filtros: filters, selectAll, excludedIds });
      } else {
        await OperacaoService.bulkDelete({ ids, filtros: filters, selectAll, excludedIds });
      }
      res.json({ success: true, intent: action === "move" ? "bulkMove" : "bulkDelete" });
      return;
    }

    res.status(400).json({ error: "Ação inválida." });
  } catch (err: any) {
    if (!err?.status) err.status = 400;
    next(err);
  }
});

//Importação de planilha (multipart) — substitui o intent "upload".
operacoesRouter.post("/import", upload.single("file"), async (req, res: AuthedResponse, next) => {
  try {
    const user = getUser(res);
    if (!req.file) {
      res.status(400).json({ error: "Nenhum arquivo enviado." });
      return;
    }
    const modo = String(req.body?.modo || "SUBSTITUIR");
    const userName = user.user_metadata?.nome || user.email || "Sistema";

    const resultado = await OperacaoImportService.processarPlanilha(
      req.file.buffer,
      req.file.originalname,
      userName,
      modo
    );

    res.json({ ...resultado, success: true, intent: "upload" });
  } catch (err: any) {
    if (!err?.status) err.status = 400;
    next(err);
  }
});
