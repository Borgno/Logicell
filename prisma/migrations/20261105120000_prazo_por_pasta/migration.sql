-- O prazo de emissão passa a ser por pasta. Vazio usa o prazo padrão de "Configuracao".
ALTER TABLE "Pasta" ADD COLUMN "prazoDias" INTEGER;

-- Leva as exceções de "PrazoCliente" para as pastas, primeiro pelo nome da pasta...
UPDATE "Pasta" p
SET "prazoDias" = c."prazoDias"
FROM "PrazoCliente" c
WHERE UPPER(BTRIM(c.cliente)) = UPPER(BTRIM(p.nome));

-- ...depois pelas regras de automação. A regra vence o nome: é a exceção que casa com o pagador das
-- operações, e portanto o prazo que já valia. Com vários clientes na mesma pasta, fica o mais recente.
UPDATE "Pasta" p
SET "prazoDias" = x."prazoDias"
FROM (
  SELECT DISTINCT ON (r."pastaId") r."pastaId", c."prazoDias"
  FROM "PrazoCliente" c
  JOIN "RegraAutomacao" r ON UPPER(BTRIM(r.cliente)) = UPPER(BTRIM(c.cliente))
  ORDER BY r."pastaId", c."updatedAt" DESC
) x
WHERE p.id = x."pastaId";
