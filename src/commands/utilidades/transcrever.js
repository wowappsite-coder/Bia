const api = require('../../services/elevenlabsApi');
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
  return msg;
}

async function getAudioBuffer(ctx) {
  const msg = ctx.msg;
  const m = unwrap(msg.message || {});

  // audio na propria mensagem
  if (m.audioMessage && downloadMediaMessage) {
    try {
      const buf = await downloadMediaMessage(msg, 'buffer', {}, {
        logger: silentLogger,
        reuploadRequest: ctx.sock.updateMediaMessage.bind(ctx.sock)
      });
      if (buf && buf.length > 50) {
        return { buffer: buf, mime: m.audioMessage.mimetype || 'audio/ogg' };
      }
    } catch (e) { console.error('[transcrever] self', e.message); }
  }

  // quoted
  try {
    const full = msgCache.getQuotedFull && msgCache.getQuotedFull(msg);
    if (full && full.message && downloadMediaMessage) {
      const inner = unwrap(full.message);
      if (inner.audioMessage) {
        const buf = await downloadMediaMessage(full, 'buffer', {}, {
          logger: silentLogger,
          reuploadRequest: ctx.sock.updateMediaMessage.bind(ctx.sock)
        });
        if (buf && buf.length > 50) {
          return { buffer: buf, mime: inner.audioMessage.mimetype || 'audio/ogg' };
        }
      }
    }
  } catch (e) { console.error('[transcrever] quoted', e.message); }

  // stream fallback quotedMessage
  try {
    const ci =
      (m.extendedTextMessage && m.extendedTextMessage.contextInfo) ||
      (m.audioMessage && m.audioMessage.contextInfo) || null;
    const q = ci && ci.quotedMessage ? unwrap(ci.quotedMessage) : null;
    if (q && q.audioMessage && downloadContentFromMessage) {
      const stream = await downloadContentFromMessage(q.audioMessage, 'audio');
      const chunks = [];
      for await (const c of stream) chunks.push(c);
      const buf = Buffer.concat(chunks);
      if (buf.length > 50) {
        return { buffer: buf, mime: q.audioMessage.mimetype || 'audio/ogg' };
      }
    }
  } catch (e) { console.error('[transcrever] stream', e.message); }

  return null;
}

module.exports = [
  {
    name: 'transcrever',
    aliases: ['stt', 'transcreve', 'ouvir'],
    category: 'utilidades',
    description: 'Audio para texto (ElevenLabs)',
    handler: async (ctx) => {
      const audio = await getAudioBuffer(ctx);
      if (!audio) {
        return ctx.reply(
          'Uso: *responde a um audio* com:\n*transcrever*\n\nou envia o audio com legenda *transcrever*'
        );
      }
      try { await ctx.reply('⏳ A transcrever...'); } catch (_) {}
      try {
        const text = await api.speechToText(audio.buffer, audio.mime);
        await ctx.reply('📝 *Transcrição:*\n\n' + text);
      } catch (e) {
        console.error('[transcrever]', String(e.message || e).slice(0, 200));
        await ctx.reply('❌ Serviço temporariamente indisponível. Tente novamente.');
      }
    }
  }
];
