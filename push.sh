#!/usr/bin/env bash
# Пуш игры на GitHub по SSH.
# Использование:  ./push.sh <логин>/<репозиторий>
# Пример:         ./push.sh ivanov/rybalka
set -e
REPO="$1"
[ -z "$REPO" ] && { echo "Укажи репозиторий: ./push.sh <логин>/<репозиторий>"; exit 1; }
KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
cd "$(dirname "$0")"

echo "→ проверяю SSH-ключ…"
ssh -i "$KEY" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -T git@github.com || true

echo "→ настраиваю remote…"
git remote remove origin 2>/dev/null || true
git remote add origin "git@github.com:${REPO}.git"

echo "→ пушу ветку main…"
GIT_SSH_COMMAND="ssh -i $KEY -o IdentitiesOnly=yes" git push -u origin main

echo
echo "Готово. Включи Pages: Settings → Pages → Source: GitHub Actions"
echo "Сайт: https://$(echo "$REPO" | cut -d/ -f1).github.io/$(echo "$REPO" | cut -d/ -f2)/"
