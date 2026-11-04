-- Usuários saem de auth.users (GoTrue) para public.users, com o mesmo id e o mesmo hash bcrypt.
-- A cópia roda aqui, e não num script de corte, porque a FK de Pasta.faturistaId só pode entrar com a
-- tabela preenchida, e o `migrate deploy` roda no start do container. Num banco sem auth.users (dev,
-- teste, CI) a cópia não faz nada.

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'gestor', 'user');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "supervisorId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_supervisorId_idx" ON "users"("supervisorId");

-- Cópia de auth.users. Hash que não é bcrypt (conta sem senha, convite nunca aceito) fica de fora e
-- precisa de reset pelo admin. Nome e cargo seguem o mapearUsuario e o normalizarCargo do app antigo:
-- cargo desconhecido vira o comum. Banimento no GoTrue era o bloqueio do app, e vira active = false.
-- Datas em UTC, como o Prisma grava. ON CONFLICT mantém quem já está em users, então rodar de novo
-- não volta a senha de quem já trocou no app novo.
DO $copia$
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE $sql$
    INSERT INTO "users" ("id", "email", "name", "passwordHash", "role", "active", "lastLoginAt", "createdAt", "updatedAt")
    SELECT u.id::text,
           lower(btrim(u.email)),
           coalesce(nullif(btrim(u.raw_user_meta_data->>'nome'), ''),
                    nullif(btrim(u.raw_user_meta_data->>'nickname'), ''),
                    split_part(lower(btrim(u.email)), '@', 1)),
           u.encrypted_password,
           CASE u.raw_app_meta_data->>'role'
             WHEN 'admin' THEN 'admin'::"Role"
             WHEN 'gestor' THEN 'gestor'::"Role"
             ELSE 'user'::"Role"
           END,
           NOT coalesce(u.banned_until > now(), false),
           u.last_sign_in_at AT TIME ZONE 'UTC',
           coalesce(u.created_at, now()) AT TIME ZONE 'UTC',
           now() AT TIME ZONE 'UTC'
      FROM auth.users u
     WHERE u.email IS NOT NULL
       AND u.encrypted_password LIKE '$2%'
    ON CONFLICT ("id") DO NOTHING
  $sql$;

  -- Supervisor num segundo passo: a FK aponta para a própria tabela, e o supervisor pode ter sido
  -- inserido depois do atendente.
  EXECUTE $sql$
    UPDATE "users" t
       SET "supervisorId" = u.raw_app_meta_data->>'supervisorId'
      FROM auth.users u
     WHERE t."id" = u.id::text
       AND t."supervisorId" IS NULL
       AND u.raw_app_meta_data->>'supervisorId' IN (SELECT "id" FROM "users")
  $sql$;
END
$copia$;

-- Faturista que não virou usuário (apagado no GoTrue ou sem senha bcrypt) perde o vínculo, senão a FK
-- não entra. Em produção, em 14/10/2026, eram zero.
UPDATE "Pasta" SET "faturistaId" = NULL
 WHERE "faturistaId" IS NOT NULL
   AND "faturistaId" NOT IN (SELECT "id" FROM "users");

-- AddForeignKey
ALTER TABLE "Pasta" ADD CONSTRAINT "Pasta_faturistaId_fkey" FOREIGN KEY ("faturistaId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
