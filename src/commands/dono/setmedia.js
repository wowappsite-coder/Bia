const commandMedia = require('../../services/commandMedia');
const registry = require('../registry');
const msgCache = require('../../utils/msgCache');
const fs = require('fs');

let downloadMediaMessage = null;
let downloadContentFromMessage = null;
try {
  const baileys = require('@whiskeysockets/baileys');
  downloadMediaMessage = baileys.downloadMediaMessage;
  downloadContentFromMessage = baileys.downloadContentFromMessage;
} catch (_) {}

const silentLogger = {
  level: 'silent',
  trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {},
  child() { return this; }
};

function unwrap(msg) {
  if (!msg) return msg;
  if (msg.ephemeralMessage && msg.ephemeralMessage.message) return unwrap(msg.ephemeralMessage.message);
  if (msg.viewOnceMessage && msg.viewOnceMessage.message) return unwrap(msg.viewOnceMessage.message);
  if (msg.viewOnceMessageV2 && msg.viewOnceMessageV2.message) return unwrap(msg.viewOnceMessageV2.message);
  if (msg.documentWithCaptionMessage && msg.documentWithCaptionMessage.message) {
    return unwrap(msg.documentWithCaptionMessage.message);
  }
  return msg;
}

function detectMedia(inner) {
  if (!inner) return null;
  if (inner.imageMessage) {
    return { node: inner.imageMessage, type: 'image', mimetype: inner.imageMessage.mimetype || 'image/jpeg', kind: 'image' };
  }
  if (inner.videoMessage) {
    const mt = inner.videoMessage.mimetype || 'video/mp4';
    const isGif = !!inner.videoMessage.gifPlayback || (mt && mt.includes('gif'));
    return { node: inner.videoMessage, type: isGif ? 'gif' : 'video', mimetype: mt, kind: 'video' };
  }
  if (inner.stickerMessage) {
    return { node: inner.stickerMessage, type: 'image', mimetype: 'image/webp', kind: 'sticker' };
  }
  if (inner.documentMessage && inner.documentMessage.mimetype) {
    const mt = inner.documentMessage.mimetype;
    if (mt.startsWith('image/')) return { node: inner.documentMessage, type: 'image', mimetype: mt, kind: 'document' };
    if (mt.startsWith('video/')) return { node: inner.documentMessage, type: 'video', mimetype: mt, kind: 'document' };
  }
  return null;
}

async function streamDownload(node, kind) {
  if (!downloadContentFromMessage || !node) return null;
  const stream = await downloadContentFromMessage(node, kind === 'sticker' ? 'sticker' : kind);
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  const buffer = Buffer.concat(chunks);
  return buffer.length ? buffer : null;
}


async function downloadQuotedMedia(ctx) {
  const msg = ctx.msg;
  const m = unwrap(msg.message || {});
  const sock = ctx.sock;
  const lastErr = [];

  async function tryDownloadMediaMessage(fullMsg, det) {
    if (!downloadMediaMessage || !fullMsg || !det) return null;
    try {
      const buf = await downloadMediaMessage(
        fullMsg,
        'buffer',
        {},
        {
          logger: silentLogger,
          reuploadRequest: sock && sock.updateMediaMessage
            ? sock.updateMediaMessage.bind(sock)
            : undefined
        }
      );
      if (buf && buf.length > 100) {
        return { buffer: buf, type: det.type, mimetype: det.mimetype };
      }
    } catch (e) {
      lastErr.push('dmm:' + (e && e.message ? e.message : e));
    }
    return null;
  }

  async function tryStream(node, kind, det) {
    try {
      const k = kind === 'document'
        ? (det.type === 'video' ? 'video' : 'image')
        : kind;
      const buf = await streamDownload(node, k);
      if (buf && buf.length > 100) {
        return { buffer: buf, type: det.type, mimetype: det.mimetype };
      }
    } catch (e) {
      lastErr.push('stream:' + (e && e.message ? e.message : e));
    }
    return null;
  }

  // 1) midia na propria mensagem (legenda)
  const selfDet = detectMedia(m);
  if (selfDet) {
    let r = await tryDownloadMediaMessage(msg, selfDet);
    if (r) return r;
    r = await tryStream(selfDet.node, selfDet.kind, selfDet);
    if (r) return r;
  }

  // contextInfo (resposta)
  const ci =
    (m.extendedTextMessage && m.extendedTextMessage.contextInfo) ||
    (m.imageMessage && m.imageMessage.contextInfo) ||
    (m.videoMessage && m.videoMessage.contextInfo) ||
    (m.documentMessage && m.documentMessage.contextInfo) ||
    null;

  // 2) cache da mensagem original
  try {
    const full = msgCache.getQuotedFull && msgCache.getQuotedFull(msg);
    if (full && full.message) {
      const det = detectMedia(unwrap(full.message));
      if (det) {
        let r = await tryDownloadMediaMessage(full, det);
        if (r) return r;
        r = await tryStream(det.node, det.kind, det);
        if (r) return r;
      }
    }
  } catch (e) {
    lastErr.push('cache:' + (e && e.message ? e.message : e));
  }

  // 3) reconstruir mensagem citada com key completa (stanzaId)
  if (ci && ci.quotedMessage) {
    const quoted = unwrap(ci.quotedMessage);
    const det = detectMedia(quoted);
    if (det) {
      const rebuilt = {
        key: {
          remoteJid: (msg.key && msg.key.remoteJid) || ctx.jid,
          id: ci.stanzaId || (msg.key && msg.key.id),
          fromMe: false,
          participant: ci.participant || undefined
        },
        message: ci.quotedMessage
      };
      let r = await tryDownloadMediaMessage(rebuilt, det);
      if (r) return r;
      r = await tryStream(det.node, det.kind, det);
      if (r) return r;
    }
  }

  // 4) ctx.quoted (se o Context expuser)
  try {
    if (ctx.quoted) {
      const det = detectMedia(unwrap(ctx.quoted));
      if (det) {
        const r = await tryStream(det.node, det.kind, det);
        if (r) return r;
      }
    }
  } catch (e) {}

  if (lastErr.length) {
    console.error('[setmedia download]', lastErr.join(' | '));
  }
  return null;
}

function parseMediaKey(ctx) {
  let key = (ctx.args || []).map(function (x) {
    return String(x || '').toLowerCase().trim();
  }).filter(Boolean).join(' ');
  if (!key && ctx.text) key = String(ctx.text).toLowerCase().trim();
  return key.replace(/\s+/g, ' ').trim();
}

function uniqueKeys(list) {
  const seen = {};
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const k = String(list[i] || '').toLowerCase().trim();
    if (!k || seen[k]) continue;
    seen[k] = true;
    out.push(k);
  }
  return out;
}

module.exports = [
  {
    name: 'setmedia',
    aliases: ['setmidia', 'mediacmd'],
    category: 'dono',
    description: 'Associa midia a um comando',
    ownerOnly: true,
    handler: async (ctx) => {
      const mediaKey = parseMediaKey(ctx);
      if (!mediaKey) {
        return ctx.reply('SETMEDIA\nResponda foto com: setmedia kiss | setmedia menu bn');
      }
      const parts = mediaKey.split(/\s+/);
      let target = registry.get(mediaKey);
      if (!target) target = registry.get(parts[0]);
      if (!target) return ctx.reply('Comando ' + parts[0] + ' nao existe.');

      const media = await downloadQuotedMedia(ctx);
      if (!media || !media.buffer) {
        return ctx.reply('Nao baixei a midia.\n\n1) Envia a *foto/video*\n2) *Responde* a essa mensagem\n3) Escreve: *setmedia ' + mediaKey + '*\n\n_A midia tem de ser recente (depois do bot ligar)._');
      }

      try {
        const isSub = mediaKey.indexOf(' ') >= 0;
        let finalKeys = [mediaKey];
        if (!isSub) {
          finalKeys = [target.name].concat(target.aliases || []);
          if (finalKeys.indexOf(mediaKey) < 0) finalKeys.push(mediaKey);
        }
        finalKeys = uniqueKeys(finalKeys);
        for (let i = 0; i < finalKeys.length; i++) {
          commandMedia.set(finalKeys[i], media.buffer, media.type, media.mimetype);
        }
        const kb = Math.round(media.buffer.length / 1024);
        await ctx.reply(
          'Midia salva\nChaves: *' + finalKeys.join(', ') + '*\nTipo: *' + media.type + '*\nTamanho: *' + kb + ' KB*\nTesta: *' + target.name + '*'
        );
      } catch (e) {
        await ctx.reply('Falha: ' + (e.message || e));
      }
    }
  },
  {
    name: 'delmedia',
    aliases: ['removemedia', 'delmidia'],
    category: 'dono',
    description: 'Remove midia',
    ownerOnly: true,
    handler: async (ctx) => {
      const mediaKey = parseMediaKey(ctx);
      if (!mediaKey) return ctx.reply('Uso: delmedia kiss');
      const isSub = mediaKey.indexOf(' ') >= 0;
      let keys = [mediaKey];
      if (!isSub) {
        const target = registry.get(mediaKey);
        if (target) {
          keys = [target.name].concat(target.aliases || []);
          if (keys.indexOf(mediaKey) < 0) keys.push(mediaKey);
        }
      }
      keys = uniqueKeys(keys);
      let removed = 0;
      for (let i = 0; i < keys.length; i++) {
        if (commandMedia.remove(keys[i])) removed++;
      }
      if (removed) await ctx.reply('Removidas ' + removed + ' chave(s): *' + keys.join(', ') + '*');
      else await ctx.reply('Nenhuma midia em *' + mediaKey + '*');
    }
  },
  {
    name: 'listmedia',
    aliases: ['medias', 'listmidia'],
    category: 'dono',
    description: 'Lista midias',
    ownerOnly: true,
    handler: async (ctx) => {
      const rows = commandMedia.list();
      if (!rows.length) return ctx.reply('Nenhuma midia.');
      let t = '*MIDIAS*\n\n';
      for (let i = 0; i < rows.length; i++) {
        t += (i + 1) + '. *' + rows[i].command + '* — ' + rows[i].type + '\n';
      }
      await ctx.reply(t.trim());
    }
  },
  {
    name: 'migratemedia',
    aliases: ['fixarmedia', 'syncmedia'],
    category: 'dono',
    description: 'Copia midia para aliases PT/EN',
    ownerOnly: true,
    handler: async (ctx) => {
      const rows = commandMedia.list();
      if (!rows.length) return ctx.reply('Nenhuma midia para migrar.');
      let added = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (String(row.command).indexOf(' ') >= 0) continue;
        const target = registry.get(row.command);
        if (!target) continue;
        const info = commandMedia.get(row.command);
        if (!info) continue;
        let buf;
        try { buf = fs.readFileSync(info.file); } catch (e) { continue; }
        const keys = uniqueKeys([target.name].concat(target.aliases || []));
        for (let j = 0; j < keys.length; j++) {
          if (!commandMedia.get(keys[j])) {
            commandMedia.set(keys[j], buf, info.type, info.mimetype);
            added++;
          }
        }
      }
      await ctx.reply('Migracao: +' + added + ' chaves.\nUse listmedia');
    }
  }
];
