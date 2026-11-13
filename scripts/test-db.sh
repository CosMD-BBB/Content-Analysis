#!/usr/bin/env bash
# เริ่ม PostgreSQL ชั่วคราวสำหรับรัน test (ใช้เมื่อไม่มี Docker)
# ใช้: source scripts/test-db.sh
set -e
PGBIN=${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}
DIR=${PGTESTDIR:-/tmp/content-studio-pg}
PORT=${PGTESTPORT:-54329}
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
if [ ! -d "$DIR" ]; then
  mkdir -p "$DIR"; [ "$(id -u)" = 0 ] && chown postgres "$DIR"
  run "$PGBIN/initdb -D $DIR/data -U postgres --auth=trust >/dev/null"
fi
if ! run "$PGBIN/pg_ctl -D $DIR/data status" >/dev/null 2>&1; then
  run "$PGBIN/pg_ctl -D $DIR/data -o '-p $PORT -k $DIR' -l $DIR/log start -w >/dev/null"
fi
run "$PGBIN/psql -h $DIR -p $PORT -U postgres -tc \"select 1 from pg_database where datname='cs_test'\"" | grep -q 1 \
  || run "$PGBIN/createdb -h $DIR -p $PORT -U postgres cs_test"
export TEST_DATABASE_URL="postgres://postgres@localhost:$PORT/cs_test"
echo "TEST_DATABASE_URL=$TEST_DATABASE_URL"
