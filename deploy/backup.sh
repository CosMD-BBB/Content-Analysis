#!/usr/bin/env bash
# สำรองฐานข้อมูลรายวัน เก็บ 7 วัน (ตั้งใน crontab: 30 2 * * * /opt/content-studio/deploy/backup.sh)
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
mkdir -p backups
file="backups/db-$(date +%F).sql.gz"
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U "${POSTGRES_USER:-content}" "${POSTGRES_DB:-content_studio}" | gzip > "$file"
find backups -name 'db-*.sql.gz' -mtime +7 -delete
echo "backup saved: $file"
