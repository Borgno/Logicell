-- ATENÇÃO: ESTA MIGRATION NÃO PODE SER EXECUTADA VIA `prisma migrate deploy` PADRÃO.
-- O comando `CREATE INDEX CONCURRENTLY` e `DROP INDEX CONCURRENTLY` não podem rodar dentro de uma transação.
-- O Prisma executa migrations dentro de transações por padrão.
-- 
-- PARA APLICAR EM PRODUÇÃO, SIGA ESTES PASSOS:
-- 1. Acesse seu banco de dados diretamente (via psql, pgAdmin, DBeaver, ou Supabase SQL Editor).
-- 2. Copie e cole este SQL inteiro e execute-o.
-- 3. Após a execução com sucesso no banco, informe ao Prisma que esta migration já foi resolvida para que ele não tente rodá-la:
--    $ npx prisma migrate resolve --applied 99999999999999_optimize_indexes

-- 1. Habilitar a extensão de trigramas (necessária para buscas ILIKE eficientes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Remover os índices B-Tree antigos de texto que não servem para ILIKE (com CONCURRENTLY para não travar a tabela)
DROP INDEX CONCURRENTLY IF EXISTS "Operacao_nm_pessoa_pagador_idx";
DROP INDEX CONCURRENTLY IF EXISTS "Operacao_nm_motorista_idx";
DROP INDEX CONCURRENTLY IF EXISTS "Operacao_nm_produto_idx";

-- 3. Remover o índice antigo da pasta que ordenava por createdAt
DROP INDEX CONCURRENTLY IF EXISTS "Operacao_pastaId_createdAt_idx";

-- 4. Criar o novo índice de pasta focado em ID Descendente (Usado para paginação)
CREATE INDEX CONCURRENTLY "Operacao_pastaId_id_idx" ON "Operacao"("pastaId", "id" DESC);

-- 5. Criar os índices GIN de Trigramas para as buscas de texto livre (com CONCURRENTLY)
CREATE INDEX CONCURRENTLY "Operacao_nm_pessoa_pagador_idx" ON "Operacao" USING GIN("nm_pessoa_pagador" gin_trgm_ops);
CREATE INDEX CONCURRENTLY "Operacao_nm_motorista_idx" ON "Operacao" USING GIN("nm_motorista" gin_trgm_ops);
CREATE INDEX CONCURRENTLY "Operacao_nm_produto_idx" ON "Operacao" USING GIN("nm_produto" gin_trgm_ops);
