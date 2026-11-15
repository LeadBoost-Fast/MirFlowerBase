#!/usr/bin/env bash
# Первичная настройка VPS (Ubuntu 22.04 / 24.04). Запускать один раз от root:  bash setup.sh
# Что делает: обновления, защита (брандмауэр, fail2ban, вход только по ключу), Docker, папки, ежедневные резервные копии.
# Скрипт можно запускать повторно: ничего не ломает. НЕ проверялся на живом сервере: первый запуск делаем вместе.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Запустите от root: sudo bash setup.sh"; exit 1; }
APP_DIR=/opt/crm
echo "== 1. Обновления и нужные программы =="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y && apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg ufw fail2ban unattended-upgrades rclone cron git
echo "== 2. Docker =="
if ! command -v docker >/dev/null; then curl -fsSL https://get.docker.com | sh; fi
systemctl enable --now docker
echo "== 3. Брандмауэр: открыты только SSH, HTTP, HTTPS =="
ufw default deny incoming; ufw default allow outgoing
ufw allow 22/tcp; ufw allow 80/tcp; ufw allow 443/tcp
ufw --force enable
echo "== 4. Защита от подбора паролей =="
systemctl enable --now fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades || true
echo "== 5. Вход по SSH только по ключу (если ключ уже добавлен) =="
if [ -s /root/.ssh/authorized_keys ]; then
  sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
  systemctl reload ssh || systemctl reload sshd || true
else
  echo "ВНИМАНИЕ: ключа SSH нет, вход по паролю оставлен. Добавьте ключ и запустите скрипт снова."
fi
echo "== 6. Папки =="
mkdir -p "$APP_DIR"/{data/postgres,data/caddy,backups,uploads}
cp -n "$(dirname "$0")"/docker-compose.yml "$(dirname "$0")"/Caddyfile "$(dirname "$0")"/backup.sh "$APP_DIR"/ 2>/dev/null || true
chmod +x "$APP_DIR/backup.sh" 2>/dev/null || true
[ -f "$APP_DIR/.env" ] || { cat > "$APP_DIR/.env" <<ENV
# Заполните и сохраните. Файл читает только root. Пароли в чат и в письма не отправляйте.
DOMAIN=crm.example.kz
POSTGRES_PASSWORD=$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)
S3_ENDPOINT=
S3_BUCKET=
S3_KEY=
S3_SECRET=
ENV
  chmod 600 "$APP_DIR/.env"; }
echo "== 7. Ежедневная резервная копия в 03:30 =="
cat > /etc/cron.d/crm-backup <<'CRON'
30 3 * * * root /opt/crm/backup.sh >> /var/log/crm-backup.log 2>&1
CRON
chmod 644 /etc/cron.d/crm-backup
echo
echo "Готово. Дальше: заполните $APP_DIR/.env (домен и ключи хранилища), затем: cd $APP_DIR && docker compose up -d"
