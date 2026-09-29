const commandAudio = require('../../services/commandAudio');
const registry = require('../registry');
const msgCache = require('../../utils/msgCache');

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

function detectAudio(inner) {
  if (!inner) return null;
  if (inner.audioMessage) {
    const n = inner.audioMessage;
    return {
      node: n,
      mimetype: n.mimetype || 'audio/ogg; codecs=opus',
      ptt: !!n.ptt,
      kind: 'audio'
    };
  }
  if (inner.documentMessage && inner.documentMessage.mimetype) {
    const mt = inner.documentMessage.mimetype;
    if (mt.startsWith('audio/') || mt.includes('ogg') || mt.includes('mpeg') || mt.includes('mp4')) {
      return { node: inner.documentMessage, mimetype: mt, ptt: false, kind: 'document' };
    }
  }
  return null;
}

async function streamDownload(node, kind) {
  if (!downloadContentFromMessage || !node) return null;
  const stream = await downloadContentFromMessage(node, kind);
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  const buffer = Buffer.concat(chunks);
  return buffer.length ? buffer : null;
}

async function downloadQuotedAudio(ctx) {
  const msg = ctx.msg;
  const m = unwrap(msg.message || {});

  const selfDet = detectAudio(m);
  if (selfDet) {
    try {
      if (downloadMediaMessage) {
        const buf = await downloadMediaMessage(msg, 'buffer', {}, {
          logger: silentLogger,
          reuploadRequest: ctx.sock.updateMediaMessage.bind(ctx.sock)
        });
        if (buf && buf.length > 50) {
          return { buffer: buf, mimetype: selfDet.mimetype, ptt: selfDet.ptt };
        }
      }
    } catch (e) { console.error('[setaudio] self', e.message); }
    try {
      const buf = await streamDownload(selfDet.node, selfDet.kind === 'document' ? 'document' : 'audio');
      if (buf && buf.length > 50) {
        return { buffer: buf, mimetype: selfDet.mimetype, ptt: selfDet.ptt };
      }
    } catch (e) { console.error('[setaudio] self stream', e.message); }
  }

  try {
    const full = msgCache.getQuotedFull && msgCache.getQuotedFull(msg);
    if (full && full.message) {
      const det = detectAudio(unwrap(full.message));
      if (det && downloadMediaMessage) {
        const buf = await downloadMediaMessage(full, 'buffer', {}, {
          logger: silentLogger,
          reuploadRequest: ctx.sock.updateMediaMessage.bind(ctx.sock)
        });
        if (buf && buf.length > 50) {
          return { buffer: buf, mimetype: det.mimetype, ptt: det.ptt };
        }
      }
      if (det) {
        const buf = await streamDownload(det.node, det.kind === 'document' ? 'document' : 'audio');
        if (buf && buf.length > 50) {
          return { buffer: buf, mimetype: det.mimetype, ptt: det.ptt };
        }
      }
    }
  } catch (e) { console.error('[setaudio] cache', e.message); }

  const ci =
    (m.extendedTextMessage && m.extendedTextMessage.contextInfo) ||
    (m.audioMessage && m.audioMessage.contextInfo) ||
    (m.imageMessage && m.imageMessage.contextInfo) || null;
  const quoted = ci && ci.quotedMessage ? unwrap(ci.quotedMessage) : null;
  const det = detectAudio(quoted);
  if (det) {
    try {
      const buf = await streamDownload(det.node, det.kind === 'document' ? 'document' : 'audio');
      if (buf && buf.length > 50) {
        return { buffer: buf, mimetype: det.mimetype, ptt: det.ptt };
      }
    } catch (e) { console.error('[setaudio] quoted', e.message); }
  }
  return null;
}

function parseKey(ctx) {
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
    name: 'setaudio',
    aliases: ['setad', 'setaudio', 'audio cmd'],
    category: 'dono',
    description: 'Associa audio/ptt a um comando',
    ownerOnly: true,
    handler: async (ctx) => {
      const mediaKey = parseKey(ctx);
      if (!mediaKey) {
        return ctx.reply(
          'SETAUDIO / SETAD\n' +
          'Responda a um *audio* ou *ptt* com:\n' +
          'setaudio menu\n' +
          'setad menu bn\n' +
          'setaudio kiss'
        );
      }

      const parts = mediaKey.split(/\s+/);
      let target = registry.get(mediaKey);
      if (!target) target = registry.get(parts[0]);
      if (!target) return ctx.reply('Comando ' + parts[0] + ' nao existe.');

      const audio = await downloadQuotedAudio(ctx);
      if (!audio || !audio.buffer) {
        return ctx.reply('Nao baixei o audio. Responda ao audio/ptt com: setaudio ' + mediaKey);
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
          commandAudio.set(finalKeys[i], audio.buffer, audio.mimetype, audio.ptt);
        }

        const kb = Math.round(audio.buffer.length / 1024);
        await ctx.reply(
          'Audio salvo\n' +
          'Chaves: *' + finalKeys.join(', ') + '*\n' +
          'Tipo: *' + (audio.ptt ? 'ptt/voz' : 'audio') + '*\n' +
          'Tamanho: *' + kb + ' KB*\n' +
          'Testa: *' + target.name + '*'
        );
      } catch (e) {
        await ctx.reply('Falha: ' + (e.message || e));
      }
    }
  },
  {
    name: 'delaudio',
    aliases: ['delad', 'removeaudio'],
    category: 'dono',
    description: 'Remove audio de um comando',
    ownerOnly: true,
    handler: async (ctx) => {
      const mediaKey = parseKey(ctx);
      if (!mediaKey) return ctx.reply('Uso: delaudio kiss');

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
        if (commandAudio.remove(keys[i])) removed++;
      }

      if (removed) await ctx.reply('Removidos ' + removed + ' audio(s): *' + keys.join(', ') + '*');
      else await ctx.reply('Nenhum audio em *' + mediaKey + '*');
    }
  },
  {
    name: 'listaudio',
    aliases: ['listad', 'audios'],
    category: 'dono',
    description: 'Lista audios por comando',
    ownerOnly: true,
    handler: async (ctx) => {
      const rows = commandAudio.list();
      if (!rows.length) return ctx.reply('Nenhum audio configurado.');
      let t = '*AUDIOS*\n\n';
      for (let i = 0; i < rows.length; i++) {
        t += (i + 1) + '. *' + rows[i].command + '*\n';
      }
      await ctx.reply(t.trim());
    }
  }
];
