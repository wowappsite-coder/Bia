# 🤖 BEATRIZ BOT

WhatsApp Bot completo para **Termux**, modular, com banco de dados local (SQLite), sistema de aluguel, detecção de pagamentos M-Pesa/E-Mola/M-Kash, economia, XP, RPG/Família, segurança e centenas de comandos reais.

## 📋 Requisitos

- Termux atualizado
- Node.js 18+ (recomendado 20+)
- Espaço livre (~200MB+)

## 🚀 Instalação no Termux

```bash
pkg update && pkg upgrade -y
pkg install nodejs git python make clang binutils ffmpeg libjpeg-turbo -y

# Se better-sqlite3 ou sharp falharem:
export GYP_DEFINES="android_ndk_path=''"

cd ~
git clone <seu-repo> beatriz-bot   # ou extraia o zip
cd beatriz-bot

cp .env.example .env
# Edite .env se quiser (dono já vem 874288439)

npm install --legacy-peer-deps

# Iniciar
npm start
# ou
node src/index.js
```

Escaneie o QR Code que aparecer no terminal com o WhatsApp do número do bot (852935085).

## ⚙️ Configuração

Arquivo `.env`:

- `OWNER_NUMBER=874288439`
- `BOT_NUMBER=852935085`
- `PREFIXES=!,.,#,/`
- `BOT_NAME=BEATRIZ BOT`

## 📁 Estrutura

```
beatriz-bot/
├── src/
│   ├── index.js              # Entry point
│   ├── config/
│   ├── database/             # SQLite schema + helpers
│   ├── commands/
│   │   ├── registry.js       # Registro central
│   │   ├── loader.js
│   │   ├── admin/
│   │   ├── bn/
│   │   ├── economia/
│   │   ├── rpg/
│   │   ├── internet/
│   │   ├── dono/
│   │   ├── utilidades/
│   │   ├── stickers/
│   │   ├── seguranca/
│   │   └── xp/
│   ├── services/             # Pagamentos etc
│   └── utils/                # Parser, menu, context
├── data/                     # beatriz.db
├── session/                  # Auth Baileys
├── logs/
├── package.json
└── README.md
```

## 🔑 Prefixos

Todos os comandos funcionam:

- Com prefixo: `!ping` `.ping` `#ping`
- Sem prefixo: `ping` (se o comando existir no registry)

## 💳 Pagamentos

Envie o comprovativo **sem comando**. O bot detecta automaticamente M-Pesa, E-Mola e M-Kash, extrai ID, valor, destino e valida contra pedidos.

## 🏠 Aluguel

O dono gerencia planos, pedidos, assinaturas e ativação/desativação por grupo.

## 🛠️ Comandos principais por categoria

Use `!menu` e depois `!menuadm`, `!menubn`, `!menueconomia` etc.

## 🧪 Testes e Auditoria

```bash
npm test
node scripts/audit.js
```

## ⚠️ Avisos

- Use número dedicado para o bot.
- Não abuse de marcações em massa.
- Stickers dependem de `sharp` (pode precisar de build tools no Termux).
- O bot é offline-first; pouquíssimas funções externas.

## Licença

MIT — use e modifique livremente.
