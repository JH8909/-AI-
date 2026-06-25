#!/usr/bin/env bash
set -euo pipefail

# Quick single-server deployment for Tencent Cloud Lighthouse Ubuntu.
# It installs PostgreSQL, Node.js, nginx, and pm2, then runs the admin panel on port 3000.
#
# Usage on the server:
#   cd /opt/ecommerce-ai
#   sudo bash scripts/tencent-cloud-quick-deploy-ubuntu.sh
#
# Optional env before running:
#   APP_DIR=/opt/ecommerce-ai APP_PORT=3000 DB_PASSWORD='your-strong-password' sudo -E bash scripts/tencent-cloud-quick-deploy-ubuntu.sh

APP_DIR="${APP_DIR:-/opt/ecommerce-ai}"
APP_PORT="${APP_PORT:-3000}"
DB_NAME="${DB_NAME:-ecommerce_ai}"
DB_USER="${DB_USER:-ecommerce_ai}"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 24 | tr -d '=+/ ' | cut -c1-20)}"
DATA_DIR="${DATA_DIR:-/opt/ecommerce-ai/data}"
NODE_MAJOR="${NODE_MAJOR:-20}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root: sudo bash scripts/tencent-cloud-quick-deploy-ubuntu.sh"
  exit 1
fi

if [ ! -f "$APP_DIR/package.json" ]; then
  echo "Project not found at $APP_DIR. Upload or clone the project there first."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Installing system packages"
apt-get update
apt-get install -y curl ca-certificates gnupg nginx postgresql postgresql-contrib openssl

if [ ! -f /swapfile ]; then
  echo "==> Creating 2GB swapfile for builds"
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
elif ! swapon --show=NAME | grep -q '^/swapfile$'; then
  swapon /swapfile || true
fi

if ! command -v node >/dev/null 2>&1 || ! node -e "process.exit(Number(process.versions.node.split('.')[0]) >= ${NODE_MAJOR} ? 0 : 1)"; then
  echo "==> Installing Node.js ${NODE_MAJOR}"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi

echo "==> Installing pm2"
npm install -g pm2

echo "==> Preparing PostgreSQL database"
systemctl enable --now postgresql
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}"

echo "==> Initializing schema"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$APP_DIR/scripts/tencent-cloud-postgres-schema.sql"

echo "==> Writing environment"
mkdir -p "$DATA_DIR"
chmod 700 "$DATA_DIR"
cat > "$APP_DIR/apps/admin-panel/.env.local" <<ENV
DATABASE_URL=${DATABASE_URL}
DATA_DIR=${DATA_DIR}
NEXT_PUBLIC_APP_URL=http://localhost:${APP_PORT}
DB_CONNECT_TIMEOUT_MS=3000
DB_POOL_MAX=5
ENV
chmod 600 "$APP_DIR/apps/admin-panel/.env.local"

echo "==> Installing app dependencies"
cd "$APP_DIR"
npm install

echo "==> Building app"
npm run build --workspace @ecommerce/admin-panel

echo "==> Starting app with pm2"
pm2 delete ecommerce-ai-admin >/dev/null 2>&1 || true
pm2 start npm --name ecommerce-ai-admin --cwd "$APP_DIR/apps/admin-panel" -- start -- -p "$APP_PORT"
pm2 save
pm2 startup systemd -u root --hp /root >/tmp/ecommerce-ai-pm2-startup.txt || true

echo "==> Configuring nginx"
cat > /etc/nginx/sites-available/ecommerce-ai-admin <<NGINX
server {
    listen 80;
    server_name _;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/ecommerce-ai-admin /etc/nginx/sites-enabled/ecommerce-ai-admin
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx

cat > "$APP_DIR/tencent-cloud-deploy-info.txt" <<INFO
App URL: http://YOUR_SERVER_PUBLIC_IP
Local app port: ${APP_PORT}
Database URL: ${DATABASE_URL}
Data dir: ${DATA_DIR}

Useful commands:
pm2 status
pm2 logs ecommerce-ai-admin
systemctl status nginx
systemctl status postgresql
INFO
chmod 600 "$APP_DIR/tencent-cloud-deploy-info.txt"

echo
echo "Deployment complete."
echo "Open: http://YOUR_SERVER_PUBLIC_IP"
echo "Database URL was saved in: $APP_DIR/apps/admin-panel/.env.local"
echo "Deployment info saved in: $APP_DIR/tencent-cloud-deploy-info.txt"
