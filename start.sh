#!/data/data/com.termux/files/usr/bin/bash
cd "$(dirname "$0")"
while true; do
  echo "Iniciando BEATRIZ BOT..."
  node src/index.js
  code=$?
  if [ $code -eq 1 ]; then
    echo "Desligado pelo dono."
    exit 0
  fi
  echo "Reiniciando em 3s..."
  sleep 3
done
