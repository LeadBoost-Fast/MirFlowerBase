#!/usr/bin/env bash
# Ежедневная копия базы: 1) на самом сервере (7 последних), 2) в облачное хранилище PS.kz (S3). Две копии в двух местах.
set -euo pipefail
cd /opt/crm; set -a; . ./.env; set +a
D=$(date +%F); F=backups/crm-$D.sql.gz
docker compose exec -T db pg_dumpall -U crm | gzip > "$F"
ls -1t backups/crm-*.sql.gz | tail -n +8 | xargs -r rm -f
if [ -n "${S3_ENDPOINT:-}" ] && [ -n "${S3_BUCKET:-}" ]; then
  RCLONE_CONFIG_PS_TYPE=s3 RCLONE_CONFIG_PS_PROVIDER=Other RCLONE_CONFIG_PS_ENDPOINT="$S3_ENDPOINT" \
  RCLONE_CONFIG_PS_ACCESS_KEY_ID="$S3_KEY" RCLONE_CONFIG_PS_SECRET_ACCESS_KEY="$S3_SECRET" \
  rclone copy "$F" "ps:$S3_BUCKET/backups/" && echo "$D: копия отправлена в S3"
  # фото магазинов копируем туда же
  [ -d uploads ] && RCLONE_CONFIG_PS_TYPE=s3 RCLONE_CONFIG_PS_PROVIDER=Other RCLONE_CONFIG_PS_ENDPOINT="$S3_ENDPOINT" \
  RCLONE_CONFIG_PS_ACCESS_KEY_ID="$S3_KEY" RCLONE_CONFIG_PS_SECRET_ACCESS_KEY="$S3_SECRET" \
  rclone sync uploads "ps:$S3_BUCKET/uploads/" || true
else
  echo "$D: S3 не настроен, копия только на сервере"
fi
