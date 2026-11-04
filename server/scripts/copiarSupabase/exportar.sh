#!/usr/bin/env bash
# Exporta do Supabase o que o Postgres próprio precisa (E8): o schema public com os dados, sem a
# _prisma_migrations, e de auth.users só as colunas que a migration de usuários lê. Só lê: o pg_dump
# roda numa transação somente leitura, e o \copy também. Por ser contra produção, quem roda é uma
# pessoa (CLAUDE.md, "Banco de produção").
#
# Uso: SUPABASE_URL='postgresql://...' bash server/scripts/copiarSupabase/exportar.sh <pasta>
# A pasta é criada e precisa estar vazia. Ela fica fora do git (por exemplo em .tmp/) e tem dado
# pessoal e hash de senha: não sai da máquina de quem roda o corte.
#
# pg_dump e psql rodam na imagem postgres:17-alpine, na mesma versão maior do Supabase, para não
# depender do que está instalado na máquina.
# A SUPABASE_URL expande dentro do container, por isso as aspas simples nos sh -c.
# shellcheck disable=SC2016
set -euo pipefail

destino=${1:?"uso: exportar.sh <pasta>"}
: "${SUPABASE_URL:?defina SUPABASE_URL (conexão direta ou pooler em modo sessão)}"
# Parâmetros do Prisma na URL (?pgbouncer=true, ?schema=) não existem para o libpq.
export SUPABASE_URL=${SUPABASE_URL%%\?*}
# 6543 é o pooler em modo transação: o pg_dump precisa da sessão inteira.
if [[ $SUPABASE_URL =~ :6543/ ]]; then
  echo "SUPABASE_URL usa a porta 6543 (modo transação). Use a 5432 do pooler (modo sessão)." >&2
  exit 1
fi

if [ -e "$destino" ] && [ -n "$(ls -A "$destino")" ]; then
  echo "A pasta $destino não está vazia." >&2
  exit 1
fi
mkdir -p "$destino"
destino=$(cd "$destino" && pwd)

# A URL vai por variável de ambiente, e não por argumento, para não aparecer na lista de processos.
pg() {
  docker run --rm -i --network host --user "$(id -u):$(id -g)" -e SUPABASE_URL \
    -v "$destino":/saida postgres:17-alpine "$@"
}

echo "Exportando o schema public..."
pg sh -c 'pg_dump "$SUPABASE_URL" --schema=public --exclude-table=public._prisma_migrations \
  --no-owner --no-privileges --no-publications --no-subscriptions --no-security-labels \
  --file=/saida/public.sql'

echo "Exportando auth.users..."
pg sh -c 'psql "$SUPABASE_URL" -v ON_ERROR_STOP=1 -q \
  -c "begin read only" \
  -c "\copy (select id, email, encrypted_password, raw_user_meta_data, raw_app_meta_data, banned_until, last_sign_in_at, created_at from auth.users order by id) to /saida/auth-users.csv with (format csv, header)" \
  -c "rollback"'

pg sh -c 'psql "$SUPABASE_URL" -At -c "select version()"' > "$destino/versao-origem.txt"
date -u +%Y-%m-%dT%H:%M:%SZ > "$destino/exportado-em.txt"

echo "Pronto em $destino:"
ls -la "$destino"
