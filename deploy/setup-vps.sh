#!/usr/bin/env bash
# One-time VPS setup for the Fraud Detection app (Ubuntu/Debian).
# Safe to run again: every step checks / overwrites instead of duplicating.
#
# Usage:  bash setup-vps.sh <domain> [email-for-ssl]
#   e.g.  bash setup-vps.sh spam.example.com me@example.com
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
REPO_URL="https://github.com/parsanoroozi/Fraud-Detection.git"
APP_DIR="$HOME/app/src/Fraud-Detection"
SERVICE=fraud-detection
APP_PORT=8001
RUN_USER="$(id -un)"

if [ -z "$DOMAIN" ]; then
  echo "Usage: bash setup-vps.sh <domain> [email-for-ssl]"
  exit 1
fi

SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"
step() { echo; echo "==> $*"; }

step "1/7 Installing packages"
$SUDO apt-get update -y
$SUDO apt-get install -y git python3 python3-venv nginx curl ufw certbot python3-certbot-nginx

python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' \
  || { echo "Python 3.10+ is required, found $(python3 --version)"; exit 1; }

step "2/7 Getting the code into $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull
else
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO_URL" "$APP_DIR"
fi
[ -d "$APP_DIR/venv" ] || python3 -m venv "$APP_DIR/venv"
"$APP_DIR/venv/bin/pip" install -q --upgrade pip
"$APP_DIR/venv/bin/pip" install -q -r "$APP_DIR/backend/requirements.txt"

step "3/7 systemd service (starts on boot, restarts on crash)"
sed -e "s#/home/YOUR_USER#$HOME#g" -e "s#YOUR_USER#$RUN_USER#g" \
  "$APP_DIR/deploy/$SERVICE.service" | $SUDO tee /etc/systemd/system/$SERVICE.service > /dev/null
$SUDO systemctl daemon-reload
$SUDO systemctl enable $SERVICE
$SUDO systemctl restart $SERVICE
for i in $(seq 1 15); do
  curl -fsS "http://127.0.0.1:$APP_PORT/api/health" > /dev/null 2>&1 && break
  [ "$i" = 15 ] && { echo "App did not start. Logs:"; $SUDO journalctl -u $SERVICE -n 30 --no-pager; exit 1; }
  sleep 1
done
echo "  app is running on 127.0.0.1:$APP_PORT"

step "4/7 NGINX for $DOMAIN"
sed "s#YOUR_DOMAIN#$DOMAIN#g" "$APP_DIR/deploy/nginx.conf" \
  | $SUDO tee /etc/nginx/sites-available/$SERVICE > /dev/null
$SUDO ln -sf /etc/nginx/sites-available/$SERVICE /etc/nginx/sites-enabled/$SERVICE
$SUDO nginx -t
$SUDO systemctl enable nginx
$SUDO systemctl reload nginx || $SUDO systemctl start nginx

step "5/7 Firewall (ufw)"
# Keep every SSH port open BEFORE enabling ufw so we never lock ourselves out
SSH_PORTS="$( { echo "${SSH_CONNECTION:-}" | awk '{print $4}'; $SUDO sshd -T 2>/dev/null | awk '/^port /{print $2}'; } | grep -E '^[0-9]+$' | sort -u)"
[ -n "$SSH_PORTS" ] || SSH_PORTS=22
for p in $SSH_PORTS; do
  echo "  allowing SSH port $p"
  $SUDO ufw allow "$p/tcp"
done
$SUDO ufw allow 'Nginx Full'
$SUDO ufw --force enable
$SUDO ufw status

step "6/7 HTTPS certificate (Let's Encrypt)"
if [ -n "$EMAIL" ]; then EMAIL_ARGS=(-m "$EMAIL"); else EMAIL_ARGS=(--register-unsafely-without-email); fi
if $SUDO certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect "${EMAIL_ARGS[@]}"; then
  HTTPS_OK=1
else
  HTTPS_OK=0
  echo "  !! certbot failed - usually the domain's DNS A record doesn't point to this server yet."
  echo "  !! Fix DNS, then run:  sudo certbot --nginx -d $DOMAIN --redirect"
fi

step "7/7 Done"
echo "  App service : sudo systemctl status $SERVICE"
echo "  App logs    : sudo journalctl -u $SERVICE -f"
if [ "$HTTPS_OK" = 1 ]; then echo "  Open        : https://$DOMAIN"; else echo "  Open        : http://$DOMAIN"; fi
if [ ! -d "$APP_DIR/backend/static" ]; then
  echo
  echo "  NOTE: the web page appears after the first CI/CD deploy (it uploads the built frontend)."
  echo "        Until then only the API works: curl http://$DOMAIN/api/health"
fi
