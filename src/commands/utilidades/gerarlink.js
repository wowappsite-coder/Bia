/**
 * gerarlink — upload anonimo no Catbox (sem API key / userhash)
 * Responder a uma mensagem com midia e usar: gerarlink
 * Isolado: nao altera outros comandos.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');

const CATBOX = 'https://catbox.moe/user/api.php';
const MAX_BYTES = 200 * 1024 * 1024; // 200MB (limite tipico Catbox)

function getQuotedNode(ctx) {
  try {
    const msg = ctx.msg || ctx.message || {};
    const m = msg.message || {};
    const ci =
      (m.extendedTextMessage && m.extendedTextMessage.contextInfo) ||
      (m.imageMessage && m.imageMessage.contextInfo) ||
      (m.videoMessage && m.videoMessage.contextInfo) ||
      (m.documentMessage && m.documentMessage.contextInfo) ||
      (m.audioMessage && m.audioMessage.contextInfo) ||
      null;
    if (!ci || !ci.quotedMessage) return null;
    return {
      key: {
        remoteJid: (msg.key && msg.key.remoteJid) || ctx.chatId || ctx.from,
        id: ci.stanzaId || 'quote',
        participant: ci.participant
      },
      message: ci.quotedMessage
    };
  } catch (_) {
    return null;
  }
}

function detectMedia(quotedMsg) {
  if (!quotedMsg) return null;
  if (quotedMsg.imageMessage) {
    return { type: 'image', node: quotedMsg.imageMessage, ext: 'jpg', mime: quotedMsg.imageMessage.mimetype || 'image/jpeg' };
  }
  if (quotedMsg.videoMessage) {
    return { type: 'video', node: quotedMsg.videoMessage, ext: 'mp4', mime: quotedMsg.videoMessage.mimetype || 'video/mp4' };
  }
  if (quotedMsg.audioMessage) {
    const pt = quotedMsg.audioMessage.ptt;
    return { type: 'audio', node: quotedMsg.audioMessage, ext: pt ? 'ogg' : 'mp3', mime: quotedMsg.audioMessage.mimetype || 'audio/ogg' };
  }
  if (quotedMsg.documentMessage) {
    const name = quotedMsg.documentMessage.fileName || 'file.bin';
    const ext = (name.split('.').pop() || 'bin').slice(0, 8);
    return { type: 'document', node: quotedMsg.documentMessage, ext, mime: quotedMsg.documentMessage.mimetype || 'application/octet-stream', fileName: name };
  }
  if (quotedMsg.stickerMessage) {
    return { type: 'sticker', node: quotedMsg.stickerMessage, ext: 'webp', mime: quotedMsg.stickerMessage.mimetype || 'image/webp' };
  }
  return null;
}

async function downloadQuoted(ctx, node) {
  const sock = ctx.sock || ctx.client || ctx.conn || ctx.baileys;
  if (!sock) throw new Error('Socket WhatsApp indisponivel');

  // Baileys moderno
  if (typeof sock.downloadMediaMessage === 'function') {
    const buf = await sock.downloadMediaMessage(node);
    if (!buf || !buf.length) throw new Error('Download vazio');
    return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  }

  // Alternativa: downloadContentFromMessage
  try {
    const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
    const q = node.message || {};
    let type = 'document';
    let media = q.documentMessage;
    if (q.imageMessage) { type = 'image'; media = q.imageMessage; }
    else if (q.videoMessage) { type = 'video'; media = q.videoMessage; }
    else if (q.audioMessage) { type = 'audio'; media = q.audioMessage; }
    else if (q.stickerMessage) { type = 'sticker'; media = q.stickerMessage; }
    if (!media) throw new Error('Sem midia na citacao');
    const stream = await downloadContentFromMessage(media, type === 'sticker' ? 'sticker' : type);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buf = Buffer.concat(chunks);
    if (!buf.length) throw new Error('Download vazio');
    return buf;
  } catch (e) {
    throw new Error('Falha ao baixar midia: ' + (e.message || e));
  }
}

function multipartUpload(filePath, fileName, mime) {
  return new Promise((resolve, reject) => {
    const boundary = '----BeatrizCatbox' + Date.now();
    const fileBuf = fs.readFileSync(filePath);
    const head =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="reqtype"\r\n\r\n` +
      `fileupload\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="fileToUpload"; filename="${fileName}"\r\n` +
      `Content-Type: ${mime || 'application/octet-stream'}\r\n\r\n`;
    const tail = `\r\n--${boundary}--\r\n`;
    const body = Buffer.concat([
      Buffer.from(head, 'utf8'),
      fileBuf,
      Buffer.from(tail, 'utf8')
    ]);

    const url = new URL(CATBOX);
    const opts = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': body.length,
        'User-Agent': 'BeatrizBot/1.0'
      },
      timeout: 120000
    };

    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8').trim();
        if (res.statusCode >= 200 && res.statusCode < 300 && /^https?:\/\//i.test(text)) {
          resolve(text);
        } else {
          reject(new Error(text || ('HTTP ' + res.statusCode)));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout no upload Catbox'));
    });
    req.write(body);
    req.end();
  });
}

module.exports = [
  {
    name: 'gerarlink',
    aliases: ['catbox', 'uplink', 'linkmidia', 'hostfile'],
    category: 'utilidades',
    description: 'Gera link publico (Catbox) da midia citada',
    handler: async (ctx) => {
      const node = getQuotedNode(ctx);
      if (!node || !node.message) {
        return ctx.reply(
          '🔗 *GERAR LINK*\n\n' +
          'Responde a uma mensagem com *imagem, video, audio, figurinha ou documento* e digita:\n' +
          '*gerarlink*\n\n' +
          'Upload anonimo via Catbox (sem API key).'
        );
      }

      const info = detectMedia(node.message);
      if (!info) {
        return ctx.reply('❌ A mensagem citada nao tem midia/arquivo suportado.');
      }

      let tmp = null;
      try {
        await ctx.reply('⏳ A baixar e enviar ao Catbox...').catch(() => {});

        const buf = await downloadQuoted(ctx, node);
        if (!buf || !buf.length) {
          return ctx.reply('❌ Nao foi possivel baixar o arquivo.');
        }
        if (buf.length > MAX_BYTES) {
          return ctx.reply('❌ Arquivo demasiado grande (max \~200MB).');
        }

        const safeName = (info.fileName || ('file.' + info.ext)).replace(/[^\w.\-]+/g, '_').slice(0, 80);
        tmp = path.join(os.tmpdir(), 'beatriz_catbox_' + Date.now() + '_' + safeName);
        fs.writeFileSync(tmp, buf);

        const link = await multipartUpload(tmp, safeName, info.mime);

        await ctx.reply(
          '✅ *Link gerado (Catbox)*\n\n' +
          '📁 Tipo: *' + info.type + '*\n' +
          '📦 Tamanho: *' + (buf.length / 1024).toFixed(1) + ' KB*\n' +
          '🔗 ' + link
        );
      } catch (e) {
        console.error('[gerarlink]', e);
        await ctx.reply(
          '❌ Falha ao gerar link.\n' +
          (e && e.message ? e.message.slice(0, 180) : 'Erro desconhecido')
        );
      } finally {
        try { if (tmp && fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) {}
      }
    }
  }
];
