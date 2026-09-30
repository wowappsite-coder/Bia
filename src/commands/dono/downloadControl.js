/**
 * Controlo de downloads: cancelar + bloquear (grupo/global)
 * Owner: tudo | ADM: so cancelar o proprio em alguns casos
 */
const fs = require('fs');
const path = require('path');

const BLOCK_FILE = path.join(__dirname, '../../../data/download-blocks.json');

function loadBlocks() {
  try {
    if (fs.existsSync(BLOCK_FILE)) {
      return JSON.parse(fs.readFileSync(BLOCK_FILE, 'utf8'));
    }
  } catch (_) {}
  return { global: false, groups: {} };
}

function saveBlocks(data) {
  try {
    fs.mkdirSync(path.dirname(BLOCK_FILE), { recursive: true });
    fs.writeFileSync(BLOCK_FILE, JSON.stringify(data));
  } catch (e) {
    console.error('[dwd block]', e.message);
  }
}

function isDownloadBlocked(groupJid) {
  const b = loadBlocks();
  if (b.global) return { blocked: true, scope: 'global' };
  if (groupJid && b.groups && b.groups[groupJid]) {
    return { blocked: true, scope: 'group' };
  }
  return { blocked: false };
}

module.exports = [
  {
    name: 'cancelardwd',
    aliases: ['canceldl', 'cancelardownload', 'stopdwd', 'parardwd'],
    category: 'dono',
    description: 'Cancela o download em curso',
    handler: async function (ctx) {
      let dq;
      try { dq = require('../../services/downloadQueue'); } catch (_) {
        return ctx.reply('Fila de download indisponivel.');
      }
      if (!dq.isBusy || !dq.isBusy()) {
        return ctx.reply('Nao ha download em curso.');
      }
      const st = dq.statusText ? dq.statusText() : null;
      const isOwner = typeof ctx.isOwner === 'function' && ctx.isOwner()
      // owner/bot admin cancelam qualquer; membro so o proprio
      if (!isOwner && !isBotAdm) {
        const who = st && st.who;
        const me = ctx.sender || '';
        const same =
          who &&
          (String(who) === String(me) ||
            String(who).replace(/\D/g, '').slice(-9) === String(me).replace(/\D/g, '').slice(-9));
        if (!same) {
          return ctx.reply('So podes cancelar o *teu* download. Pede ao dono/adm.');
        }
      }
      const r = dq.requestCancel(ctx.sender);
      return ctx.reply(r.reason || 'Cancelamento pedido.');
    }
  },
  {
    name: 'blockdwd',
    aliases: ['bloqueardownload'],
    category: 'dono',
    description: 'Bloqueia downloads neste grupo',
    groupOnly: true,
    ownerOnly: true,
    handler: async function (ctx) {
      const b = loadBlocks();
      if (!b.groups) b.groups = {};
      b.groups[ctx.jid] = true;
      saveBlocks(b);
      return ctx.reply('🔒 Downloads *bloqueados* neste grupo.\nDesbloquear: *unblockdwd*');
    }
  },
  {
    name: 'blockdwdg',
    aliases: ['bloqueardownloadglobal'],
    category: 'dono',
    description: 'Bloqueia downloads em todos os grupos',
    ownerOnly: true,
    handler: async function (ctx) {
      const b = loadBlocks();
      b.global = true;
      saveBlocks(b);
      return ctx.reply('🔒 Downloads *bloqueados GLOBALMENTE*.\nDesbloquear: *unblockdwdg*');
    }
  },
  {
    name: 'unblockdwd',
    aliases: ['desbloqueardownload'],
    category: 'dono',
    description: 'Desbloqueia downloads neste grupo',
    groupOnly: true,
    ownerOnly: true,
    handler: async function (ctx) {
      const b = loadBlocks();
      if (!b.groups) b.groups = {};
      delete b.groups[ctx.jid];
      // se global estiver on, desbloquear so este grupo via allowlist
      if (!b.allow) b.allow = {};
      if (b.global) b.allow[ctx.jid] = true;
      saveBlocks(b);
      return ctx.reply('🔓 Downloads *liberados* neste grupo.');
    }
  },
  {
    name: 'unblockdwdg',
    aliases: ['desbloqueardownloadglobal'],
    category: 'dono',
    description: 'Desbloqueia downloads globalmente',
    ownerOnly: true,
    handler: async function (ctx) {
      const b = loadBlocks();
      b.global = false;
      saveBlocks(b);
      return ctx.reply('🔓 Downloads *liberados globalmente*.');
    }
  }
];

// export helper para outros modulos
module.exports.isDownloadBlocked = isDownloadBlocked;
