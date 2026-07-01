import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/dashboard.tsx"),
  route("caixa-de-entrada", "routes/inbox.tsx"),
  route("pastas/:id", "routes/pastas.$id.tsx"),
  route("api/operacoes", "routes/api.operacoes.ts"),

  route("api/stats", "routes/api.stats.ts"),
  route("api/operacoes-list", "routes/api.operacoes-list.ts"),
  route("login", "routes/login.tsx"),
] satisfies RouteConfig;
