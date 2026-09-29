const fs = require('fs');
const path = require('path');
const https = require('https');
const media = require('../../utils/media');

const STYLES = {
  st:            { bg: 0xffffffff, white: false, label: 'branco/preto' },
  stb:           { bg: 0x000000ff, white: true,  label: 'preto/branco' },
  'st-azul':     { bg: 0x1e88e5ff, white: true,  label: 'azul' },
  'st-pink':     { bg: 0xff69b4ff, white: true,  label: 'pink' },
  'st-y':        { bg: 0xffeb3bff, white: false, label: 'amarelo' },
  'st-g':        { bg: 0x43a047ff, white: true,  label: 'verde' },
  'st-vermelho': { bg: 0xe53935ff, white: true,  label: 'vermelho' },
  'st-roxo':     { bg: 0x8e24aaff, white: true,  label: 'roxo' },
  'st-laranja':  { bg: 0xfb8c00ff, white: false, label: 'laranja' },
  'st-ciano':    { bg: 0x00bcd4ff, white: false, label: 'ciano' },
  'st-rosa':     { bg: 0xf8bbd0ff, white: false, label: 'rosa' },
  'st-cinza':    { bg: 0xbdbdbdff, white: false, label: 'cinza' },
  'st-marrom':   { bg: 0x6d4c41ff, white: true,  label: 'marrom' },
  'st-dourado':  { bg: 0xffd54fff, white: false, label: 'dourado' },
  'st-prata':    { bg: 0xcfd8dcff, white: false, label: 'prata' },
  'st-violeta':  { bg: 0x7b1fa2ff, white: true,  label: 'violeta' },
  'st-turquesa': { bg: 0x26a69aff, white: false, label: 'turquesa' }
};

const ALIASES = {
  st: ['stbranco', 'textosticker'],
  stb: ['stpreto', 'stblack'],
  'st-azul': ['stazul', 'stblue', 'sta'],
  'st-pink': ['stpink', 'stpk'],
  'st-y': ['stamarelo', 'styellow', 'sty'],
  'st-g': ['stverde', 'stgreen', 'stg'],
  'st-vermelho': ['stvermelho', 'stred', 'stv'],
  'st-roxo': ['stroxo', 'stpurple', 'str'],
  'st-laranja': ['stlaranja', 'storange', 'stl'],
  'st-ciano': ['stciano', 'stcyan', 'stc'],
  'st-rosa': ['strosa', 'stro'],
  'st-cinza': ['stcinza', 'stgray', 'stgrey', 'stci'],
  'st-marrom': ['stmarrom', 'stbrown', 'stm'],
  'st-dourado': ['stdourado', 'stgold', 'std'],
  'st-prata': ['stprata', 'stsilver', 'sts'],
  'st-violeta': ['stvioleta', 'stviolet', 'stvi'],
  'st-turquesa': ['stturquesa', 'stturquoise', 'stt']
};

const CACHE_DIR = path.join(__dirname, '../../../data/emoji-cache');
try { fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch (_) {}

function emojiFilename(emoji) {
  const cps = [];
  for (const ch of emoji) {
    const cp = ch.codePointAt(0);
    if (cp === 0xfe0f) continue;
    cps.push(cp.toString(16));
  }
  return cps.join('-') + '.png';
}

function httpsGet(url) {
  return new Promise(function (resolve, reject) {
    https.get(url, { timeout: 8000 }, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('HTTP ' + res.statusCode));
      }
      const chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () { resolve(Buffer.concat(chunks)); });
    }).on('error', reject);
  });
}

async function loadEmojiPng(emoji) {
  const file = emojiFilename(emoji);
  const local = path.join(CACHE_DIR, file);
  try {
    if (fs.existsSync(local)) return fs.readFileSync(local);
  } catch (_) {}
  const url = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/' + file;
  try {
    const buf = await httpsGet(url);
    try { fs.writeFileSync(local, buf); } catch (_) {}
    return buf;
  } catch (e) {
    try {
      const simple = [...emoji].map(function (c) {
        return c.codePointAt(0).toString(16);
      }).filter(function (x) { return x !== 'fe0f'; }).join('-') + '.png';
      const buf = await httpsGet('https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/' + simple);
      try { fs.writeFileSync(local, buf); } catch (_) {}
      return buf;
    } catch (_) {
      return null;
    }
  }
}

function tokenize(str) {
  const tokens = [];
  const re = /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)|([^\p{Extended_Pictographic}]+)/gu;
  let m;
  while ((m = re.exec(str)) !== null) {
    if (m[1]) tokens.push({ type: 'emoji', value: m[1] });
    else if (m[2] && m[2].length) tokens.push({ type: 'text', value: m[2] });
  }
  return tokens;
}

async function renderTextPng(text, style) {
  const Jimp = require('jimp');
  const SIZE = 512;
  const PAD = 28;
  const maxW = SIZE - PAD * 2;
  const maxH = SIZE - PAD * 2;
  const white = style.white;
  const fontSpecs = white
    ? [
        { path: Jimp.FONT_SANS_128_WHITE, size: 128, emoji: 100 },
        { path: Jimp.FONT_SANS_64_WHITE, size: 64, emoji: 56 },
        { path: Jimp.FONT_SANS_32_WHITE, size: 32, emoji: 36 },
        { path: Jimp.FONT_SANS_16_WHITE, size: 16, emoji: 24 }
      ]
    : [
        { path: Jimp.FONT_SANS_128_BLACK, size: 128, emoji: 100 },
        { path: Jimp.FONT_SANS_64_BLACK, size: 64, emoji: 56 },
        { path: Jimp.FONT_SANS_32_BLACK, size: 32, emoji: 36 },
        { path: Jimp.FONT_SANS_16_BLACK, size: 16, emoji: 24 }
      ];
  const tokens = tokenize(String(text).slice(0, 280).trim());

  async function buildLayout(spec) {
    let font;
    try { font = await Jimp.loadFont(spec.path); } catch (_) { return null; }
    const emojiSize = spec.emoji;
    const items = [];
    for (const tok of tokens) {
      if (tok.type === 'emoji') {
        items.push({ type: 'emoji', value: tok.value, w: emojiSize + 6, h: emojiSize });
      } else {
        const parts = tok.value.split(/(\s+)/);
        for (const part of parts) {
          if (!part) continue;
          items.push({ type: 'text', value: part, w: Jimp.measureText(font, part), h: Math.ceil(spec.size * 1.2) });
        }
      }
    }
    if (!items.length) return null;
    const limit = Math.floor(maxW * 0.92);
    const lines = [];
    let cur = [], curW = 0;
    for (const it of items) {
      if (cur.length && curW + it.w > limit) {
        lines.push({ items: cur, w: curW });
        cur = []; curW = 0;
      }
      if (!cur.length && it.w > limit) return null;
      cur.push(it); curW += it.w;
    }
    if (cur.length) lines.push({ items: cur, w: curW });
    let totalH = 0;
    const lineMeta = [];
    for (const line of lines) {
      let h = Math.ceil(spec.size * 1.05);
      for (const it of line.items) h = Math.max(h, it.h);
      const gap = Math.max(4, Math.round(spec.size * 0.12));
      totalH += h + gap;
      lineMeta.push({ items: line.items, w: line.w, h: h, gap: gap });
    }
    if (totalH > maxH * 0.95) return null;
    return {
      font: font,
      emojiSize: emojiSize,
      lineMeta: lineMeta,
      totalH: totalH,
      contentW: Math.max.apply(null, lineMeta.map(function (l) { return l.w; }))
    };
  }

  let layout = null;
  for (let i = 0; i < fontSpecs.length; i++) {
    layout = await buildLayout(fontSpecs[i]);
    if (layout) break;
  }
  if (!layout) layout = await buildLayout(fontSpecs[fontSpecs.length - 1]);

  const contentW = layout ? Math.min(maxW, Math.max(layout.contentW + 8, 40)) : maxW;
  const contentH = layout ? Math.min(maxH, Math.max(layout.totalH + 8, 40)) : maxH;
  const layer = new Jimp(contentW + 4, contentH + 4, 0x00000000);

  if (layout) {
    let y = 2;
    for (const lm of layout.lineMeta) {
      let x = Math.max(0, Math.floor((contentW - lm.w) / 2));
      for (const it of lm.items) {
        if (it.type === 'text') {
          layer.print(layout.font, x, y + Math.floor((lm.h - it.h) / 2), it.value);
          x += it.w;
        } else {
          try {
            const ebuf = await loadEmojiPng(it.value);
            if (ebuf) {
              const eimg = await Jimp.read(ebuf);
              eimg.resize(layout.emojiSize, layout.emojiSize);
              layer.composite(eimg, x, y + Math.floor((lm.h - layout.emojiSize) / 2));
            }
          } catch (_) {}
          x += it.w;
        }
      }
      y += lm.h + lm.gap;
    }
  }

  const targetW = Math.floor(maxW * 0.92);
  const targetH = Math.floor(maxH * 0.92);
  const scale = Math.min(targetW / layer.bitmap.width, targetH / layer.bitmap.height, 3.5);
  const newW = Math.max(1, Math.floor(layer.bitmap.width * scale));
  const newH = Math.max(1, Math.floor(layer.bitmap.height * scale));
  layer.resize(newW, newH);

  const bg = new Jimp(SIZE, SIZE, style.bg);
  bg.composite(layer, Math.floor((SIZE - newW) / 2), Math.floor((SIZE - newH) / 2));
  return bg.getBufferAsync(Jimp.MIME_PNG);
}

async function sendTextSticker(ctx, style) {
  const text = (ctx.text || '').trim();
  if (!text) return ctx.reply('Escreve o texto. Ex: stv parabens 🎉');
  try {
    let png = await renderTextPng(text, style);
    let stickerBuf = png;
    try {
      if (media.toStickerWebp) stickerBuf = await media.toStickerWebp(png);
    } catch (_) {}
    await ctx.sock.sendMessage(ctx.jid, { sticker: stickerBuf }, { quoted: ctx.msg });
  } catch (e) {
    await ctx.reply('Erro: ' + (e.message || e));
  }
}

function makeCmd(name, style) {
  return {
    name: name,
    aliases: ALIASES[name] || [],
    category: 'stickers',
    description: 'Figurinha texto ' + style.label,
    handler: async function (ctx) { return sendTextSticker(ctx, style); }
  };
}

const commands = Object.keys(STYLES).map(function (n) { return makeCmd(n, STYLES[n]); });
commands.push({
  name: 'stcores',
  aliases: ['stcolors', 'menusttexto'],
  category: 'stickers',
  description: 'Lista cores',
  handler: async function (ctx) {
    await ctx.reply(
      '*FIGURINHAS DE TEXTO*\n\n' +
      'st stb sta stpk sty stg stv str stl stc stro stci stm std sts stvi stt\n\n' +
      'Ex: *stv parabens 🎉*\n' +
      'Emojis precisam internet na 1a vez (depois cache).'
    );
  }
});
module.exports = commands;
