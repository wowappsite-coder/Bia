/**
 * Ferramentas de imagem - Jimp/sharp
 */
let downloadMediaMessage = null;
try {
  downloadMediaMessage = require('@whiskeysockets/baileys').downloadMediaMessage;
} catch (e) {
  console.warn('[LOADER]', 'baileys media:', e.message);
}
const media = require('../../utils/media');

async function getImageBuffer(ctx) {
  const msg = ctx.msg;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  let target = msg;
  if (quoted?.imageMessage || quoted?.stickerMessage) {
    target = {
      key: {
        remoteJid: ctx.jid,
        id: msg.message.extendedTextMessage.contextInfo.stanzaId,
        participant: msg.message.extendedTextMessage.contextInfo.participant
      },
      message: quoted
    };
  }
  if (!target.message?.imageMessage && !target.message?.stickerMessage) return null;
  try {
    if (!downloadMediaMessage) return null;
    return await downloadMediaMessage(target, 'buffer', {}, {
      logger: console,
      reuploadRequest: ctx.sock.updateMediaMessage
    });
  } catch {
    return null;
  }
}

function need(ctx) {
  if (!media.available()) {
    ctx.reply('❌ Sem processador de imagem.\nnpm install jimp --legacy-peer-deps');
    return false;
  }
  return true;
}

module.exports = [
  {
    name: 'blur',
    category: 'imagem',
    description: 'Aplica blur na imagem',
    handler: async (ctx) => {
      if (!need(ctx)) return;
      const buf = await getImageBuffer(ctx);
      if (!buf) return ctx.reply('❌ Envie ou responda uma imagem.');
      try {
        const out = await media.blur(buf, 5);
        await ctx.sock.sendMessage(ctx.jid, { image: out, caption: '🌫️ Blur' }, { quoted: ctx.msg });
      } catch {
        await ctx.reply('❌ Erro ao processar.');
      }
    }
  },
  {
    name: 'grayscale',
    aliases: ['pb', 'pretoebranco'],
    category: 'imagem',
    description: 'Preto e branco',
    handler: async (ctx) => {
      if (!need(ctx)) return;
      const buf = await getImageBuffer(ctx);
      if (!buf) return ctx.reply('❌ Envie ou responda uma imagem.');
      try {
        const out = await media.grayscale(buf);
        await ctx.sock.sendMessage(ctx.jid, { image: out, caption: '⬛ P&B' }, { quoted: ctx.msg });
      } catch {
        await ctx.reply('❌ Erro.');
      }
    }
  },
  {
    name: 'rotate',
    aliases: ['girar'],
    category: 'imagem',
    description: 'Gira a imagem 90°',
    handler: async (ctx) => {
      if (!need(ctx)) return;
      const buf = await getImageBuffer(ctx);
      if (!buf) return ctx.reply('❌ Envie ou responda uma imagem.');
      const deg = parseInt(ctx.args[0], 10) || 90;
      try {
        const out = await media.rotate(buf, deg);
        await ctx.sock.sendMessage(ctx.jid, { image: out, caption: `🔄 ${deg}°` }, { quoted: ctx.msg });
      } catch {
        await ctx.reply('❌ Erro.');
      }
    }
  },
  {
    name: 'flip',
    aliases: ['espelhar'],
    category: 'imagem',
    description: 'Espelha a imagem',
    handler: async (ctx) => {
      if (!need(ctx)) return;
      const buf = await getImageBuffer(ctx);
      if (!buf) return ctx.reply('❌ Envie ou responda uma imagem.');
      try {
        const out = await media.flip(buf, true);
        await ctx.sock.sendMessage(ctx.jid, { image: out, caption: '🪞 Espelho' }, { quoted: ctx.msg });
      } catch {
        await ctx.reply('❌ Erro.');
      }
    }
  },
  {
    name: 'invert',
    aliases: ['inverter', 'negativo'],
    category: 'imagem',
    description: 'Inverte cores',
    handler: async (ctx) => {
      if (!need(ctx)) return;
      const buf = await getImageBuffer(ctx);
      if (!buf) return ctx.reply('❌ Envie ou responda uma imagem.');
      try {
        const out = await media.invert(buf);
        await ctx.sock.sendMessage(ctx.jid, { image: out, caption: '🎨 Invertido' }, { quoted: ctx.msg });
      } catch {
        await ctx.reply('❌ Erro.');
      }
    }
  },
  {
    name: 'resize',
    aliases: ['redimensionar'],
    category: 'imagem',
    description: 'Redimensiona imagem',
    usage: '!resize 300 300',
    handler: async (ctx) => {
      if (!need(ctx)) return;
      const buf = await getImageBuffer(ctx);
      if (!buf) return ctx.reply('❌ Envie ou responda uma imagem.');
      const w = parseInt(ctx.args[0], 10) || 300;
      const h = parseInt(ctx.args[1], 10) || w;
      try {
        const out = await media.resize(buf, w, h);
        await ctx.sock.sendMessage(ctx.jid, { image: out, caption: `📐 ${w}x${h}` }, { quoted: ctx.msg });
      } catch {
        await ctx.reply('❌ Erro.');
      }
    }
  },
  {
    name: 'imagemmenu',
    aliases: ['menuimg', 'menuimagem'],
    category: 'imagem',
    description: 'Menu de imagem',
    handler: async (ctx) => {
      await ctx.reply(
        `🖼️ *MENU IMAGEM* (motor: ${media.engineName()})\n\n` +
        `• !blur\n• !pb / !grayscale\n• !rotate 90\n• !flip\n• !invert\n• !resize 300 300\n\n` +
        `_Responda a uma foto com o comando._`
      );
    }
  }
];
