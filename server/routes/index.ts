import type { Router } from "../lib/router";
import auditEvents from "./auditEvents";
import colunas from "./colunas";
import dashboard from "./dashboard";
import faturistas from "./faturistas";
import importacoes from "./importacoes";
import me from "./me";
import operacaoStats from "./operacaoStats";
import operacoes from "./operacoes";
import pastas from "./pastas";
import prazos from "./prazos";
import regras from "./regras";
import sessions from "./sessions";
import users from "./users";
import userStats from "./userStats";

// Módulos montados sob /api/v1, como [path, router].
export const modules: Array<[string, Router]> = [
  ["/sessions", sessions],
  ["/me", me],
  ["/users", users],
  ["/auditEvents", auditEvents],
  ["/userStats", userStats],
  ["/pastas", pastas],
  ["/faturistas", faturistas],
  ["/regras", regras],
  ["/prazos", prazos],
  ["/colunas", colunas],
  ["/operacoes", operacoes],
  ["/operacaoStats", operacaoStats],
  ["/importacoes", importacoes],
  ["/dashboard", dashboard],
];
