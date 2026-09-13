import "dotenv/config";
import express from "express";
import compression from "compression";
import path from "node:path";
import fs from "node:fs";
import { requireUser, requireAdmin, type AuthedResponse } from "./middlewares/auth";
import { authRouter } from "./routes/auth";
import { initRouter } from "./routes/init";
import { pastasRouter } from "./routes/pastas";
import { colunasRouter } from "./routes/colunas";
import { operacoesRouter } from "./routes/operacoes";
import { dashboardRouter } from "./routes/dashboard";
import { automacoesRouter } from "./routes/automacoes";
import { prazosRouter } from "./routes/prazos";
import { usuariosRouter } from "./routes/usuarios";
import { perfilRouter } from "./routes/perfil";

//Em produção, serve o build estático do SPA com fallback para index.html
const clientDist = path.resolve(process.cwd(), "dist/client");

const app = express();
app.disable("x-powered-by");

//LOG_HTTP=1 registra método, caminho, status e duração de cada request — sem
//a env, nenhum middleware extra é adicionado.
if (process.env.LOG_HTTP === "1") {
  app.use((req, res, next) => {
    const inicio = Date.now();
    res.on("finish", () => {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - inicio}ms`);
    });
    next();
  });
}

//Gzip/brotli nas respostas — a VPS fica na Europa, então cada KB a menos
//conta na viagem até o navegador (BR).
app.use(compression());

app.use(express.json({ limit: "2mb" }));

const api = express.Router();
api.use("/auth", authRouter);
api.use(requireUser);
api.use("/init", initRouter);
api.use("/pastas", pastasRouter);
api.use("/colunas", colunasRouter);
api.use("/operacoes", operacoesRouter);
api.use("/dashboard", dashboardRouter);
api.use("/automacoes", automacoesRouter);
api.use("/prazos", prazosRouter);
api.use("/perfil", perfilRouter);
api.use("/usuarios", requireAdmin, usuariosRouter);
app.use("/api", api);

if (process.env.NODE_ENV === "production" && fs.existsSync(clientDist)) {
  app.use(
    express.static(clientDist, {
      index: false,
      setHeaders: (res, filePath) => {
        // Assets com hash são imutáveis — cache longo evita revalidação
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    })
  );
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      // index.html não tem hash no nome: precisa revalidar a cada load para
      // pegar o novo deploy (os assets com hash é que ficam "immutable").
      // { root } em vez de path.join: sendFile aplica o check de dotfile no
      // path absoluto inteiro, e falha se algum diretório pai começar com "."
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile("index.html", { root: clientDist });
      return;
    }
    next();
  });
}

//Tratamento de erros centralizado
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = typeof err?.status === "number" && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500) console.error("[API ERROR]", err);
  res.status(status).json({ error: err?.message || "Erro inesperado.", success: false });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`[Logicell API] rodando em http://localhost:${port}`);
});

export type { AuthedResponse };
