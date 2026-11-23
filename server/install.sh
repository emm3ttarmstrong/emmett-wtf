#!/usr/bin/env bash
# Installs or updates wtf-app and its timer on Omarchy. Run from a checkout of this repo: sudo server/install.sh
set -euo pipefail
here=$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")
[[ $(id -u) -eq 0 ]] || { echo "Run this with sudo." >&2; exit 1; }

install -m 755 "$here/wtf-app" /usr/local/sbin/wtf-app
install -m 644 "$here"/wtf-deploy.service "$here"/wtf-deploy.timer "$here"/wtf-hub-edits.service "$here"/wtf-hub-edits.path /etc/systemd/system/
install -d -m 755 /etc/wtf/apps /var/lib/wtf /var/lib/wtf/hub-edits /etc/caddy/sites
install -d -m 700 /etc/wtf/secrets
install -d -o emmett -g emmett /home/emmett/services

if ! grep -q '^import sites/\*\.caddy' /etc/caddy/Caddyfile; then
  printf '\n# emmett.wtf apps, written by wtf-app\nimport sites/*.caddy\n' >> /etc/caddy/Caddyfile
  caddy validate --config /etc/caddy/Caddyfile > /dev/null
  systemctl restart caddy
fi

systemctl daemon-reload
systemctl enable --now wtf-deploy.timer wtf-hub-edits.path
echo "wtf-app installed"
