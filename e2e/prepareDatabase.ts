import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../server/db/generated/client";
import { recreateDatabase } from "../server/test/recreateDatabase";
import { ADMIN, PASSWORD, USER } from "./helpers";

// Roda antes do servidor do E2E (webServer do playwright.config.ts): banco vazio, migrado, com um
// admin e um usuário comum.
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
} finally {
  await prisma.$disconnect();
}
