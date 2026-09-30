const { askBeatriz } = require('../../services/groqApi');
const msgCache = require('../../utils/msgCache');


/* === QUOTE_HELPER_BIA v1 === */
function __biaGetQuoted(ctx) {
  try {
    const msg = ctx.msg || ctx.message || {};
    const m = msg.message || msg || {};
    const candidates = [
      m.extendedTextMessage && m.extendedTextMessage.contextInfo,
      m.imageMessage && m.imageMessage.contextInfo,
      m.videoMessage && m.videoMessage.contextInfo,
      m.documentMessage && m.documentMessage.contextInfo,
      m.audioMessage && m.audioMessage.contextInfo,
      msg.contextInfo
    ];
    let ci = null;
    for (const c of candidates) { if (c && c.quotedMessage) { ci = c; break; } }
    if (!ci) return null;
    const q = ci.quotedMessage;
    let text = '';
    let hasImage = false;
    let hasAudio = false;
    if (q.conversation) text = q.conversation;
    else if (q.extendedTextMessage && q.extendedTextMessage.text) text = q.extendedTextMessage.text;
    else if (q.imageMessage) {
      hasImage = true;
      text = q.imageMessage.caption || '';
    } else if (q.videoMessage) {
      hasImage = true;
      text = q.videoMessage.caption || '';
    } else if (q.stickerMessage) {
      hasImage = true;
      text = text || '[figurinha]';
    } else if (q.audioMessage || q.pttMessage) {
      hasAudio = true;
      text = '[audio]';
    } else if (q.documentMessage) {
      text = q.documentMessage.caption || q.documentMessage.fileName || '[documento]';
    }
    const participant = ci.participant || '';
    const name = (ci.notify || ci.pushName || (participant.split('@')[0]) || 'alguem');
    return { text: String(text || '').trim(), hasImage, hasAudio, participant, name, quotedMessage: q, contextInfo: ci };
  } catch (e) {
    return null;
  }
}
async function __biaDownloadQuotedImage(ctx, quoted) {
  try {
    if (!quoted || !quoted.hasImage) return null;
    const sock = ctx.sock || ctx.client || ctx.conn;
    if (!sock || !sock.downloadMediaMessage) return null;
    // montar mensagem minima para download
    const node = {
      key: {
        remoteJid: ctx.chatId || ctx.from || (ctx.msg && ctx.msg.key && ctx.msg.key.remoteJid),
        id: (quoted.contextInfo && quoted.contextInfo.stanzaId) || 'quote',
        participant: quoted.participant
      },
      message: quoted.quotedMessage
    };
    const buf = await sock.downloadMediaMessage(node);
    if (!buf) return null;
    return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  } catch (e) {
    console.error('[bia quote img]', e.message);
    return null;
  }
}
/* === FIM QUOTE_HELPER_BIA === */


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

async function streamDownload(node, kind) {
  if (!downloadContentFromMessage || !node) return null;
  const stream = await downloadContentFromMessage(node, kind);
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

async function extractMedia(ctx) {
  const msg = ctx.msg;
  const m = unwrap(msg.message || {});
  const out = {
    imageBuffer: null,
    imageMime: null,
    audioBuffer: null,
    audioMime: null,
    docText: null
  };

  async function fromMsg(fullMsg, inner) {
    if (!inner) return;

    if (inner.imageMessage) {
      try {
        let buf = null;
        if (downloadMediaMessage && fullMsg) {
          buf = await downloadMediaMessage(fullMsg, 'buffer', {}, {
            logger: silentLogger,
            reuploadRequest: ctx.sock.updateMediaMessage.bind(ctx.sock)
          });
        }
        if (!buf || buf.length < 100) buf = await streamDownload(inner.imageMessage, 'image');
        if (buf && buf.length > 100) {
          out.imageBuffer = buf;
          out.imageMime = inner.imageMessage.mimetype || 'image/jpeg';
        }
      } catch (e) { console.error('[bia] img', e.message); }
    }

    if (inner.stickerMessage && !out.imageBuffer) {
      try {
        const buf = await streamDownload(inner.stickerMessage, 'sticker');
        if (buf && buf.length > 100) {
          out.imageBuffer = buf;
          out.imageMime = 'image/webp';
        }
      } catch (e) { console.error('[bia] sticker', e.message); }
    }

    if (inner.audioMessage) {
      try {
        let buf = null;
        if (downloadMediaMessage && fullMsg) {
          buf = await downloadMediaMessage(fullMsg, 'buffer', {}, {
            logger: silentLogger,
            reuploadRequest: ctx.sock.updateMediaMessage.bind(ctx.sock)
          });
        }
        if (!buf || buf.length < 50) buf = await streamDownload(inner.audioMessage, 'audio');
        if (buf && buf.length > 50) {
          out.audioBuffer = buf;
          out.audioMime = inner.audioMessage.mimetype || 'audio/ogg';
        }
      } catch (e) { console.error('[bia] audio', e.message); }
    }

    if (inner.documentMessage) {
      try {
        const dm = inner.documentMessage;
        const mt = String(dm.mimetype || '').toLowerCase();
        let buf = null;
        if (downloadMediaMessage && fullMsg) {
          buf = await downloadMediaMessage(fullMsg, 'buffer', {}, {
            logger: silentLogger,
            reuploadRequest: ctx.sock.updateMediaMessage.bind(ctx.sock)
          });
        }
        if (!buf || buf.length < 50) buf = await streamDownload(dm, 'document');
        if (buf && buf.length > 50) {
          if (mt.indexOf('image/') === 0) {
            out.imageBuffer = buf;
            out.imageMime = mt;
          } else if (mt.indexOf('text/') === 0 || mt.indexOf('json') >= 0) {
            out.docText = buf.toString('utf8').slice(0, 6000);
          } else {
            out.docText = '[Documento: ' + (dm.fileName || mt || 'ficheiro') + ']';
          }
        }
      } catch (e) { console.error('[bia] doc', e.message); }
    }
  }

  await fromMsg(msg, m);

  if (!out.imageBuffer && !out.audioBuffer && !out.docText) {
    try {
      const full = msgCache.getQuotedFull && msgCache.getQuotedFull(msg);
      if (full && full.message) await fromMsg(full, unwrap(full.message));
    } catch (e) { console.error('[bia] quoted cache', e.message); }
  }

  if (!out.imageBuffer && !out.audioBuffer && !out.docText) {
    try {
      const ci =
        (m.extendedTextMessage && m.extendedTextMessage.contextInfo) ||
        (m.imageMessage && m.imageMessage.contextInfo) ||
        (m.audioMessage && m.audioMessage.contextInfo) || null;
      const q = ci && ci.quotedMessage ? unwrap(ci.quotedMessage) : null;
      if (q) await fromMsg(null, q);
    } catch (e) { console.error('[bia] quoted', e.message); }
  }

  return out;
}

module.exports = [
  {
    name: 'bia',
    aliases: ['Bia', 'BIA', 'ia', 'ai', 'groq'],
    category: 'utilidades',
    description: 'Conversa com a Beatriz (texto, imagem, audio)',
    handler: async (ctx) => {
      const q = (ctx.text || (ctx.args || []).join(' ') || '').trim();
      const media = await extractMedia(ctx);

      if (!q && !media.imageBuffer && !media.audioBuffer && !media.docText) {
        return ctx.reply(
          'Uso:\n' +
          '• *bia sua pergunta*\n' +
          '• imagem com legenda *bia o que e isto?*\n' +
          '• responde a um audio com *bia o que foi dito?*'
        );
      }

      try {
 } catch (_) {}

      try {
        let prompt = q;
        if (media.docText) {
          prompt = (q ? q + '\n\n' : '') + 'Conteudo do documento:\n' + media.docText;
        }
        let answer = await askBeatriz(prompt, {
          imageBuffer: media.imageBuffer,
          imageMime: media.imageMime,
          audioBuffer: media.audioBuffer,
          audioMime: media.audioMime
        });
        if (answer.length > 1600) answer = answer.slice(0, 1580) + '...';
        await ctx.reply('💜 *Beatriz*\n\n' + answer);
      } catch (e) {
        console.error('[bia]', String(e.message || e).slice(0, 200));
        await ctx.reply('A Beatriz está temporariamente indisponível. Tente novamente mais tarde.');
      }
    }
  }
];
