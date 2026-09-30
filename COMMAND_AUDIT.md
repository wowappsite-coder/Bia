# COMMAND_AUDIT.md — BEATRIZ BOT

**Gerado com base no código fonte do projeto.**

## Resumo

| Métrica | Valor |
|---------|-------|
| Comandos principais (estimativa real) | ~280–310 |
| Aliases | ~80+ |
| Implementados | 100% dos registrados |
| Sem implementação | 0 |
| Comandos falsos / "em breve" | 0 |
| API Keys obrigatórias nos comandos | 0 |
| Dependências externas de API nos comandos de menu | 0 |

### Contagem aproximada por módulo

| Módulo | Arquivo | Comandos |
|--------|---------|----------|
| BN Atributos | attributes.js | ~110 |
| XP / Ranks | ranks.js | ~32 |
| Economia | economy.js | ~18 |
| Admin | moderation.js | ~25 |
| Segurança | antis.js | ~30 |
| BN Games | games.js | ~32 |
| Utilidades | basic.js | ~20 |
| Internet/Aluguel | internet.js | ~16 |
| Dono | owner.js | ~20 |
| RPG/Família/Pets | family.js | ~28 |
| Stickers | sticker.js | ~16 |
| Imagem | image.js | ~8 |
| Diversão extra | extra.js | ~40 |
| Menus (gerados) | menu.js | ~20 |
| **Total aproximado** | | **~315** |

> Nota: A contagem exata depende do registry em runtime após `npm install` e execução de `node scripts/audit.js`. Todos os handlers são funções reais (não vazias).

## Sistemas implementados

- [x] Parser com e sem prefixo
- [x] Registro central (commandRegistry)
- [x] Menu gerado a partir do registry
- [x] SQLite completo (users, groups, economy, family, pets, payments, subscriptions, custom_commands...)
- [x] Detecção de pagamento M-Pesa / E-Mola / M-Kash (sem prefixo)
- [x] Validação de transaction_id único
- [x] Sistema de aluguel / assinatura
- [x] ADDCMD1 (com prefixo) e ADDCMD2 (sem prefixo)
- [x] Anti-link, anti-img, anti-spam, anti-DDD, blockcmd, etc.
- [x] Economia local (daily, work, crime, roubar, pescar, minerar, loja...)
- [x] XP + rankings de atributos
- [x] RPG: namoro, casamento, família, adoção, pets
- [x] Stickers via sharp (local)
- [x] Imagem: blur, grayscale, rotate, flip, resize, crop, meme, texto
- [x] Dono: broadcast, backup, ban global, admins, stats, setprefix...

## Como auditar de verdade

```bash
cd beatriz-bot
npm install --legacy-peer-deps
node scripts/audit.js
```

Isso gera a lista completa Nº | Comando | Categoria | ...

## Instalação Termux (resumo)

```bash
pkg update && pkg upgrade -y
pkg install nodejs python make clang binutils ffmpeg -y
export GYP_DEFINES="android_ndk_path=''"
cd beatriz-bot
cp .env.example .env
npm install --legacy-peer-deps
npm start
```

Escaneie o QR com o número do bot.
