import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../server/db/generated/client";

// Usuários de desenvolvimento, um por cargo, todos com a senha 123456. Roda com `bun run db:seed` e
// nunca em `prisma migrate deploy`, que é o comando de produção. Idempotente: quem já existe fica como
// está.

if (process.env.NODE_ENV === "production") {
  console.error("Seed bloqueado em produção.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function seed() {
  const passwordHash = await bcrypt.hash("123456", 10);
  const users = [
    { email: "admin@local.test", name: "Admin Local", role: "admin" },
    { email: "gestor@local.test", name: "Supervisor Local", role: "gestor" },
    { email: "user@local.test", name: "Usuário Local", role: "user" },
  ] as const;
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, passwordHash },
    });
  }
  console.log(`Usuários: ${users.map((user) => user.email).join(", ")} / 123456`);
}

try {
  await seed();
} finally {
  await prisma.$disconnect();
}
