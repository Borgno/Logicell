import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../server/db/generated/client";
import { recreateDatabase } from "../server/test/recreateDatabase";
import { ADMIN, PASSWORD, USER } from "./helpers";

// Roda antes do servidor do E2E (webServer do playwright.config.ts): banco vazio, migrado, com um
// admin, um usuário comum e operações na Caixa de Entrada.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL ausente no webServer.env do playwright.config.ts.");

await recreateDatabase(databaseUrl);

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
try {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await prisma.user.createMany({
    data: [
      { email: ADMIN.email, name: "Administrador", role: "admin", passwordHash },
      { email: USER.email, name: "Usuário Comum", role: "user", passwordHash },
    ],
  });
  // Operações da Caixa de Entrada e uma pasta de destino para o E2E de operações.
  await prisma.pasta.create({ data: { nome: "Destino E2E", cor: "#10b981" } });
  await prisma.operacao.createMany({
    data: [
      {
        nm_agencia: "MATRIZ - SP",
        nr_ctrc: "9001",
        nm_pessoa_pagador: "ACME E2E",
        ds_placa: "AAA1111",
      },
      {
        nm_agencia: "MATRIZ - SP",
        nr_ctrc: "9002",
        nm_pessoa_pagador: "ACME E2E",
        ds_placa: "AAA1111",
      },
      { nm_agencia: "FILIAL - MT", nr_ctrc: "9003", nm_pessoa_pagador: "BETA E2E", vl_total: 1500 },
    ],
  });
} finally {
  await prisma.$disconnect();
}
