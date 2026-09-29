const { withDownloadLock } = require('../../services/downloadQueue');
/**
 * vta — vídeo → áudio (deteção reforçada)
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

let msgCache = null;
try { msgCache = require('../../utils/msgCache'); } catch (_) {}

let downloadMediaMessage = null;
let downloadContentFromMessage = null;
let extractMessageContent = null;

function loadBaileys() {
  const names = ['@whiskeysockets/baileys', 'baileys', '@adiwajshing/baileys'];
  for (let i = 0; i < names.length; i++) {
    try {
      const b = require(names[i]);
      downloadMediaMessage = b.downloadMediaMessage || downloadMediaMessage;
      downloadContentFromMessage = b.downloadContentFromMessage || downloadContentFromMessage;
      extractMessageContent = b.extractMessageContent || extractMessageContent;
      console.log('[vta] baileys:', names[i]);
      return;
    } catch (_) {}
  }
}
loadBaileys();

const silentLogger = {
  level: 'silent',
  trace() {}, debug() {}, info() {}, warn() {}, error() {},
  child() { return silentLogger; }
};

function unwrap(msg) {
  if (!msg || typeof msg !== 'object') return {};
  if (msg.ephemeralMessage && msg.ephemeralMessage.message) return unwrap(msg.ephemeralMessage.message);
  if (msg.viewOnceMessage && msg.viewOnceMessage.message) return unwrap(msg.viewOnceMessage.message);
  if (msg.viewOnceMessageV2 && msg.viewOnceMessageV2.message) return unwrap(msg.viewOnceMessageV2.message);
  if (msg.viewOnceMessageV2Extension && msg.viewOnceMessageV2Extension.message) {
    return unwrap(msg.viewOnceMessageV2Extension.message);
  }
  if (msg.documentWithCaptionMessage && msg.documentWithCaptionMessage.message) {
    return unwrap(msg.documentWithCaptionMessage.message);
  }
  if (msg.templateMessage && msg.templateMessage.hydratedTemplate) {
    return unwrap(msg.templateMessage.hydratedTemplate);
  }
  return msg;
}

function findVideoNode(message) {
  const m = unwrap(message || {});
  if (m.videoMessage) return { node: m.videoMessage, type: 'video', message: { videoMessage: m.videoMessage } };
  if (m.documentMessage && /video/i.test(String(m.documentMessage.mimetype || ''))) {
    return { node: m.documentMessage, type: 'document', message: { documentMessage: m.documentMessage } };
  }
  // percorrer keys
  const keys = Object.keys(m);
  for (let i = 0; i < keys.length; i++) {
    const v = m[keys[i]];
    if (v && typeof v === 'object' && v.videoMessage) {
      return { node: v.videoMessage, type: 'video', message: { videoMessage: v.videoMessage } };
    }
  }
  return null;
}

function resolveVideo(ctx) {
  const msg = ctx.msg;
  const candidates = [];

  // A) cache quoted
  try {
    if (msgCache && msgCache.getQuotedFull) {
      const full = msgCache.getQuotedFull(msg);
      if (full && full.message) {
        const found = findVideoNode(full.message);
        if (found) candidates.push({ targetMsg: full, ...found, src: 'cache' });
      }
    }
  } catch (e) {
    console.error('[vta] cache', e.message);
  }

  // B) ctx.quoted (context util)
  try {
    if (ctx.quoted) {
      const found = findVideoNode(ctx.quoted);
      if (found) {
        const ci = (msg.message && msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo) || {};
        candidates.push({
          targetMsg: {
            key: {
              remoteJid: msg.key.remoteJid,
              id: ci.stanzaId || msg.key.id,
              participant: ci.participant,
              fromMe: false
            },
            message: found.message
          },
          ...found,
          src: 'ctx.quoted'
        });
      }
    }
  } catch (_) {}

  // C) contextInfo.quotedMessage
  try {
    const raw = unwrap(msg.message || {});
    const ci =
      (raw.extendedTextMessage && raw.extendedTextMessage.contextInfo) ||
      (raw.videoMessage && raw.videoMessage.contextInfo) ||
      (raw.imageMessage && raw.imageMessage.contextInfo) ||
      (msg.message && msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo) ||
      null;
    if (ci && ci.quotedMessage) {
      const found = findVideoNode(ci.quotedMessage);
      if (found) {
        candidates.push({
          targetMsg: {
            key: {
              remoteJid: msg.key.remoteJid,
              id: ci.stanzaId || ('vta_' + Date.now()),
              participant: ci.participant,
              fromMe: false
            },
            message: found.message
          },
          ...found,
          src: 'quotedMessage'
        });
      }
    }
  } catch (e) {
    console.error('[vta] quoted', e.message);
  }

  // D) proprio video com legenda vta
  try {
    const found = findVideoNode(msg.message);
    if (found) {
      candidates.push({ targetMsg: msg, ...found, src: 'self' });
    }
  } catch (_) {}

  // E) extractMessageContent
  try {
    if (extractMessageContent && msg.message) {
      const content = extractMessageContent(msg.message);
      const found = findVideoNode(content);
      if (found) candidates.push({ targetMsg: msg, ...found, src: 'extract' });
    }
  } catch (_) {}

  console.log('[vta] candidates', candidates.map(function (c) { return c.src; }));
  return candidates[0] || null;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function downloadOne(ctx, info) {
  // 1) downloadMediaMessage
  if (downloadMediaMessage) {
    try {
      const buf = await downloadMediaMessage(
        info.targetMsg,
        'buffer',
        {},
        {
          logger: silentLogger,
          reuploadRequest: ctx.sock.updateMediaMessage && ctx.sock.updateMediaMessage.bind(ctx.sock)
        }
      );
      if (buf && buf.length > 500) {
        console.log('[vta] dmm ok', buf.length, info.src);
        return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
      }
    } catch (e) {
      console.error('[vta] dmm fail', info.src, e.message);
    }
  }

  // 2) downloadContentFromMessage
  if (downloadContentFromMessage && info.node) {
    try {
      const stream = await downloadContentFromMessage(info.node, info.type || 'video');
      const buf = await streamToBuffer(stream);
      if (buf && buf.length > 500) {
        console.log('[vta] content ok', buf.length, info.src);
        return buf;
      }
    } catch (e) {
      console.error('[vta] content fail', info.src, e.message);
    }
  }

  // 3) fake reconstruct
  if (downloadMediaMessage && info.node) {
    try {
      const only = {};
      if (info.type === 'document') only.documentMessage = info.node;
      else only.videoMessage = info.node;
      const fake = {
        key: info.targetMsg.key || ctx.msg.key,
        message: only
      };
      const buf = await downloadMediaMessage(fake, 'buffer', {}, {
        logger: silentLogger,
        reuploadRequest: ctx.sock.updateMediaMessage && ctx.sock.updateMediaMessage.bind(ctx.sock)
      });
      if (buf && buf.length > 500) {
        console.log('[vta] dmm2 ok', buf.length);
        return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
      }
    } catch (e) {
      console.error('[vta] dmm2 fail', e.message);
    }
  }

  return null;
}

module.exports = [
  {
    name: 'vta',
    aliases: ['videotoaudio', 'video2audio', 'tomp3', 'mp3'],
    category: 'utilidades',
    description: 'Converte vídeo em áudio',
    handler: withDownloadLock('vta', async (ctx) => {
      // debug util
      try {
        const keys = ctx.msg && ctx.msg.message ? Object.keys(ctx.msg.message) : [];
        console.log('[vta] msg.keys', keys.join(','));
      } catch (_) {}

      const info = resolveVideo(ctx);
      if (!info) {
        return ctx.reply(
          '❌ Não achei o vídeo na mensagem.\n\n' +
            'Faz assim:\n' +
            '1. Envia o vídeo (sem comando)\n' +
            '2. Segura no vídeo → *Responder*\n' +
            '3. Escreve só: *vta*'
        );
      }

      await ctx.reply('⏳ A extrair áudio do vídeo...');

      let buf = null;
      try {
        buf = await downloadOne(ctx, info);
      } catch (e) {
        console.error('[vta] download', e.message);
      }

      if (!buf) {
        return ctx.reply(
          '❌ Achei o vídeo, mas não consegui *baixar* a mídia.\n' +
            'Tenta enviar o vídeo outra vez e responde com *vta*.\n' +
            '(Vídeos muito antigos ou view-once falham às vezes.)'
        );
      }

      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vta-'));
      const inFile = path.join(dir, 'in.mp4');
      const outFile = path.join(dir, 'out.mp3');
      try {
        fs.writeFileSync(inFile, buf);
        await execFileAsync(
          'ffmpeg',
          ['-y', '-i', inFile, '-vn', '-acodec', 'libmp3lame', '-q:a', '4', outFile],
          { timeout: 180000 }
        );
        if (!fs.existsSync(outFile)) {
          return ctx.reply('❌ ffmpeg não gerou áudio. `pkg install ffmpeg`');
        }
        const audio = fs.readFileSync(outFile);
        await ctx.sock.sendMessage(
          ctx.jid,
          { audio: audio, mimetype: 'audio/mpeg', fileName: 'audio.mp3', ptt: false },
          { quoted: ctx.msg }
        );
      } catch (e) {
        console.error('[vta] ffmpeg', e.message);
        return ctx.reply('❌ Erro ffmpeg: ' + (e.message || e) + '\n`pkg install ffmpeg`');
      } finally {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
      }
    })
  }
];
