#!/usr/bin/env bash
# Importa no Postgres próprio (E8) o que o exportar.sh tirou do Supabase, e confere. Roda da raiz do
# repositório, porque usa as migrations e o CLI do Prisma.
#
# Uso: DATABASE_URL='postgresql://...' bash server/scripts/copiarSupabase/importar.sh <pasta>
#
# O banco de destino precisa existir e estar vazio. Os passos:
#  1. auth.users mínimo e o schema public restaurados numa transação só, com o pg_trgm antes.
#  2. `prisma migrate resolve --applied 0_baseline`: o baseline descreve o schema que veio do
#     Supabase. O `migrate deploy` aplica o resto, e a migration de usuários copia de auth.users como
#     foi escrita para fazer no Supabase.
#  3. Conferência: linhas por tabela e sequences contra o dump, usuários contra o CSV, e o schema
#     contra um banco criado só pelas migrations.
#  4. Sem divergência, o schema auth sai. Com divergência, o banco fica como está para inspeção e o
#     script sai com erro.
# O relatório vai para <pasta>/relatorio-importacao.txt.
#
# psql e pg_dump rodam na imagem postgres:17-alpine. Na rede host por padrão; para alcançar o db de
# um compose, DOCKER_NETWORK=<rede do compose>.
set -euo pipefail

pasta=${1:?"uso: importar.sh <pasta do exportar.sh>"}
: "${DATABASE_URL:?defina DATABASE_URL do banco de destino}"
pasta=$(cd "$pasta" && pwd)
for arquivo in public.sql auth-users.csv; do
  [ -f "$pasta/$arquivo" ] || { echo "Falta $pasta/$arquivo." >&2; exit 1; }
done

# libpq não aceita o ?schema= do Prisma.
export PGURL=${DATABASE_URL%%\?*}
if [[ $PGURL =~ \.supabase\.(com|co)[:/] ]]; then
  echo "DATABASE_URL aponta para o Supabase. O destino é o Postgres próprio." >&2
  exit 1
fi
banco=${PGURL##*/}
export PGURL_REFERENCIA=${PGURL%/*}/${banco}_referencia
rede=${DOCKER_NETWORK:-host}

# Sem os NOTICE do Postgres no relatório.
export PGOPTIONS="-c client_min_messages=warning"
pg() {
  docker run --rm -i --network "$rede" --user "$(id -u):$(id -g)" -e PGURL -e PGURL_REFERENCIA \
    -e PGOPTIONS -v "$pasta":/dados:ro postgres:17-alpine "$@"
}
# stdin fechado: senão o docker run -i consome a entrada dos loops de conferência.
sql() { pg psql "$PGURL" -v ON_ERROR_STOP=1 -At -q -c "$1" < /dev/null; }
prisma() { node_modules/.bin/prisma "$@" 2>&1 | grep -v -E '^(Loaded Prisma config|Prisma schema loaded|$)' || true; }

relatorio="$pasta/relatorio-importacao.txt"
: > "$relatorio"
log() { echo "$*" | tee -a "$relatorio"; }
divergencias=0
diverge() { log "DIVERGE: $*"; divergencias=$((divergencias + 1)); }

log "Importação em $(date -u +%Y-%m-%dT%H:%M:%SZ), banco $banco"
[ -f "$pasta/exportado-em.txt" ] && log "Exportado em $(cat "$pasta/exportado-em.txt")"

tabelas=$(sql "select count(*) from pg_tables where schemaname in ('public', 'auth')")
if [ "$tabelas" != 0 ]; then
  echo "O banco $banco não está vazio ($tabelas tabelas em public e auth)." >&2
  exit 1
fi

# --- 1. Restore -----------------------------------------------------------------------------------
log "Restaurando auth.users e o schema public..."
{
  cat <<'SQL'
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA public;
-- Só as colunas que a migration 20261014120000_users lê.
CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email varchar(255),
  encrypted_password varchar(255),
  raw_user_meta_data jsonb,
  raw_app_meta_data jsonb,
  banned_until timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz
);
\copy auth.users from /dados/auth-users.csv with (format csv, header)
SQL
  # O schema public já existe no banco novo.
  grep -v -E '^(CREATE SCHEMA public;|COMMENT ON SCHEMA public )' "$pasta/public.sql"
} | pg psql "$PGURL" -v ON_ERROR_STOP=1 -q -1 -o /dev/null

# Faturista que não vira usuário perde o vínculo na migration: o relatório diz quantos antes.
orfaos=$(sql "select count(*) from \"Pasta\" where \"faturistaId\" is not null and \"faturistaId\" not in (select id::text from auth.users where email is not null and encrypted_password like '\$2%')")
log "Pastas com faturista que não vira usuário (perdem o vínculo): $orfaos"

# --- 2. Migrations --------------------------------------------------------------------------------
log "Marcando o baseline e aplicando as migrations..."
DATABASE_URL=$DATABASE_URL prisma migrate resolve --applied 0_baseline | tee -a "$relatorio"
DATABASE_URL=$DATABASE_URL prisma migrate deploy | tail -1 | tee -a "$relatorio"

# --- 3. Conferência -------------------------------------------------------------------------------
log "Linhas por tabela (dump / banco):"
# Linhas entre "COPY public.<tabela> (...) FROM stdin;" e "\." no dump.
while read -r tabela esperado; do
  [ -n "$tabela" ] || continue
  atual=$(sql "select count(*) from public.$tabela")
  log "  $tabela $esperado / $atual"
  [ "$esperado" = "$atual" ] || diverge "$tabela: $esperado no dump, $atual no banco"
done < <(awk '
  /^COPY public\./ { split($2, p, "."); t = p[2]; n = 0; dentro = 1; next }
  dentro && /^\\\.$/ { print t, n; dentro = 0; next }
  dentro { n++ }
' "$pasta/public.sql")

log "Sequences (dump / banco):"
while read -r sequencia esperado; do
  [ -n "$sequencia" ] || continue
  atual=$(sql "select last_value from $sequencia")
  log "  $sequencia $esperado / $atual"
  [ "$esperado" = "$atual" ] || diverge "$sequencia: $esperado no dump, $atual no banco"
done < <(sed -n -E "s/^SELECT pg_catalog\.setval\('([^']+)', ([0-9]+), (true|false)\);$/\1 \2/p" \
  "$pasta/public.sql")

csv=$(($(wc -l < "$pasta/auth-users.csv") - 1))
esperados=$(sql "select count(*) from auth.users where email is not null and encrypted_password like '\$2%'")
usuarios=$(sql "select count(*) from public.users")
log "Usuários: $csv em auth.users, $esperados com e-mail e senha bcrypt, $usuarios em users"
[ "$esperados" = "$usuarios" ] || diverge "users: $esperados esperados, $usuarios copiados"
supervisores=$(sql "select count(*) from public.users where \"supervisorId\" is not null")
log "Usuários com supervisor: $supervisores"

log "Schema contra um banco criado só pelas migrations:"
sql "drop database if exists ${banco}_referencia" >/dev/null
sql "create database ${banco}_referencia" >/dev/null
DATABASE_URL=${PGURL_REFERENCIA}${DATABASE_URL#"$PGURL"} prisma migrate deploy >/dev/null
# \restrict e \unrestrict levam uma chave aleatória por dump.
esquema() { pg sh -c "pg_dump \"\$$1\" --schema-only --schema=public --no-owner --no-privileges | grep -v -E '^\\\\(un)?restrict '" < /dev/null; }
if diff <(esquema PGURL) <(esquema PGURL_REFERENCIA) > "$pasta/schema-diff.txt"; then
  log "  igual"
  rm "$pasta/schema-diff.txt"
else
  diverge "schema diferente das migrations, ver $pasta/schema-diff.txt"
fi
sql "drop database ${banco}_referencia" >/dev/null

# --- 4. Fim ---------------------------------------------------------------------------------------
if [ "$divergencias" -gt 0 ]; then
  log "$divergencias divergência(s). O schema auth ficou para inspeção."
  exit 1
fi
sql "drop schema auth cascade" >/dev/null
log "Sem divergência. O schema auth saiu."
