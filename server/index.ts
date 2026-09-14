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
import { SupabaseAdminService, renovarUsuarios } from "./services/supabase-admin.server";
import { PrazoService } from "./services/prazo.server";
import { PastaService } from "./services/pasta.server";
import { OrdemColunasService } from "./services/config.server";
import { DashboardService } from "./services/dashboard.server";
import { iniciarTiming } from "./lib/timing";
import prisma from "./lib/prisma.server";

//Em produção, serve o build estático do SPA com fallback para index.html
const clientDist = path.resolve(process.cwd(), "dist/client");

const app = express();
app.disable("x-powered-by");
//Sem ETag/304 nas respostas da API (res.send/json): o condicional não
//economizava nada (o servidor calculava tudo de qualquer forma) e fazia o
//Chrome serializar requests iguais em voo. express.static mantém seu próprio
//ETag para os assets.
app.set("etag", false);

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
//Toda resposta da API é dinâmica: sem cache HTTP condicional. Também começa a
//cronometrar a request aqui (Server-Timing só é aplicado no fim de cada rota).
api.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  iniciarTiming(res);
  next();
});
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
    if ((req.method === "GET" || req.method === "HEAD") && !req.path.startsWith("/api")) {
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

  // Aquecimento: popula os caches em memória logo no boot para que o
  // primeiro request de cada usuário não pague a ida ao Supabase/banco.
  // Erros aqui não derrubam o servidor — só ficam registrados no log.
  Promise.allSettled([
    SupabaseAdminService.listarUsuarios(),
    PrazoService.regras(),
    PastaService.listar(),
    OrdemColunasService.get(),
    DashboardService.opcoes(),
  ]).then((resultados) => {
    resultados.forEach((r) => {
      if (r.status === "rejected") console.error("[Aquecimento] falhou:", r.reason);
    });
  });

  if (process.env.NODE_ENV === "production") {
    // O balanceador da AWS na frente do pooler do Supabase (modo sessão,
    // aws-1-sa-east-1) derruba conexões ociosas sem avisar; um SELECT 1 por
    // minuto em até 3 conexões do pool evita que a próxima request pague
    // reconexão + handshake TLS EU→BR. unref() para não travar o shutdown.
    const keepAlive = setInterval(() => {
      Promise.all([
        prisma.$queryRaw`SELECT 1`,
        prisma.$queryRaw`SELECT 1`,
        prisma.$queryRaw`SELECT 1`,
      ]).catch((err) => console.error("[Keep-alive] falhou:", err));
    }, 60_000);
    keepAlive.unref();

    // Cache de usuários sempre quente: renova antes do TTL vencer, sem janela
    // sem dados (renovar só troca o valor depois que o loader termina).
    const renovarCache = setInterval(() => {
      renovarUsuarios().catch((err) => console.error("[Cache] renovarUsuarios falhou:", err));
    }, 5 * 60_000);
    renovarCache.unref();
  }
});

export type { AuthedResponse };
