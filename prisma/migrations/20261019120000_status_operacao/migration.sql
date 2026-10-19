-- Lista fechada de status das operações. Em produção a tabela já existe: foi criada à mão no
-- Supabase em 2026-10-13 (commit 404f0eb da branch temp) e chega pelo db:importar-supabase com as
-- opções que o time cadastrou depois. Por isso tudo aqui só roda num banco sem a tabela, e as 11
-- opções iniciais entram só nele: repetir o INSERT traria de volta opção renomeada ou excluída.
DO $status$
BEGIN
  IF to_regclass('"StatusOperacao"') IS NOT NULL THEN
    RETURN;
  END IF;

  CREATE TABLE "StatusOperacao" (
      "id" SERIAL NOT NULL,
      "nome" TEXT NOT NULL,
      "ordem" INTEGER NOT NULL DEFAULT 0,
      "ativo" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,

      CONSTRAINT "StatusOperacao_pkey" PRIMARY KEY ("id")
  );

  CREATE UNIQUE INDEX "StatusOperacao_nome_key" ON "StatusOperacao"("nome");

  INSERT INTO "StatusOperacao" ("nome", "ordem", "updatedAt") VALUES
      ('ANEXADO PORTAL', 1, CURRENT_TIMESTAMP),
      ('ANEXADO E-MAIL', 2, CURRENT_TIMESTAMP),
      ('DESACORDO', 3, CURRENT_TIMESTAMP),
      ('SINISTRO', 4, CURRENT_TIMESTAMP),
      ('ABERTO', 5, CURRENT_TIMESTAMP),
      ('ENCERRADO', 6, CURRENT_TIMESTAMP),
      ('PENDENTE FILIAL', 7, CURRENT_TIMESTAMP),
      ('PENDENTE POSTO', 8, CURRENT_TIMESTAMP),
      ('MDF-e ABERTO', 9, CURRENT_TIMESTAMP),
      ('EM TRATATIVA', 10, CURRENT_TIMESTAMP),
      ('CARGA RECUSADA', 11, CURRENT_TIMESTAMP);
END
$status$;
