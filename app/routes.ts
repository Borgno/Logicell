import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  layout("routes/_operacoes.layout.tsx", [
    index("routes/inbox.tsx", { id: "home" }),
    route("caixa-de-entrada", "routes/inbox.tsx"),
    route("pastas/:id", "routes/pastas.$id.tsx"),
  ]),
  route("automacoes", "routes/automacoes.tsx"),
  route("api/operacoes", "routes/api.operacoes.ts"),

  route("api/operacoes-list", "routes/api.operacoes-list.ts"),
  route("login", "routes/login.tsx"),
] satisfies RouteConfig;
