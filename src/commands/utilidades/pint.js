/**
 * pint <pesquisa> — imagens publicas HD
 * Fontes: Openverse + Wikimedia (sem API Key)
 * Isolado do comando pin.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');

const MAX_IMAGES = 4;
const MIN_BYTES = 20 * 1024;
const UA = 'BeatrizBot/1.0 (WhatsApp bot; image search)';

let sharp = null;
try { sharp = require('sharp'); } catch (_) {}

function request(urlStr, opts) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(urlStr); } catch (e) { return reject(new Error('URL invalida')); }
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: (opts && opts.method) || 'GET',
        headers: Object.assign({
          'User-Agent': UA,
          Accept: 'application/json,image/*,*/*'
        }, (opts && opts.headers) || {}),
        timeout: 60000
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let next = res.headers.location;
            if (!/^https?:\/\//i.test(next)) next = u.protocol + '//' + u.hostname + next;
            return request(next, opts).then(resolve, reject);
          }
          resolve({ status: res.statusCode, buf, text: buf.toString('utf8'), headers: res.headers });
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

async function openverseSearch(query) {
  const url =
    'https://api.openverse.org/v1/images/?q=' +
    encodeURIComponent(query) +
    '&page_size=20&format=json';
  const res = await request(url);
  if (res.status < 200 || res.status >= 300) throw new Error('Openverse HTTP ' + res.status);
  const data = JSON.parse(res.text);
  const urls = [];
  for (const r of data.results || []) {
    const u = r.url || r.thumbnail;
    if (u && /^https?:\/\//i.test(u) && !urls.includes(u)) urls.push(u);
  }
  return urls;
}

async function wikimediaSearch(query) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*' +
    '&generator=search&gsrnamespace=6&gsrlimit=15' +
    '&gsrsearch=' + encodeURIComponent(query) +
    '&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=1200';
  const res = await request(url, {
    headers: { 'User-Agent': 'BeatrizBot/1.0 (contact: local; image-search)' }
  });
  if (res.status < 200 || res.status >= 300) throw new Error('Wiki HTTP ' + res.status);
  const data = JSON.parse(res.text);
  const pages = (data.query && data.query.pages) || {};
  const urls = [];
  for (const id of Object.keys(pages)) {
    const info = pages[id].imageinfo && pages[id].imageinfo[0];
    if (!info) continue;
    const mime = String(info.mime || '');
    if (!mime.startsWith('image/')) continue;
    if (mime.includes('svg')) continue;
    const u = info.thumburl || info.url;
    if (u && /^https?:\/\//i.test(u) && !urls.includes(u)) urls.push(u);
  }
  return urls;
}

async function wikipediaThumb(query) {
  // fallback: pagina wikipedia + thumbnail
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&format=json' +
    '&prop=pageimages&piprop=original|thumbnail&pithumbsize=1000' +
    '&titles=' + encodeURIComponent(query) +
    '&redirects=1';
  try {
    const res = await request(url, {
      headers: { 'User-Agent': 'BeatrizBot/1.0 (contact: local; image-search)' }
    });
    const data = JSON.parse(res.text);
    const pages = (data.query && data.query.pages) || {};
    const urls = [];
    for (const id of Object.keys(pages)) {
      const p = pages[id];
      if (p.original && p.original.source) urls.push(p.original.source);
      else if (p.thumbnail && p.thumbnail.source) urls.push(p.thumbnail.source);
    }
    return urls;
  } catch (_) {
    return [];
  }
}

function looksLikeRealImage(buf) {
  if (!buf || buf.length < MIN_BYTES) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf[0] === 0x89 && buf[1] === 0x50) return true;
  if (buf[0] === 0x52 && buf[1] === 0x49) return true;
  if (buf[0] === 0x47 && buf[1] === 0x49) return true;
  return false;
}

async function isLowDetailImage(buf) {
  if (!sharp) return false;
  try {
    const { data, info } = await sharp(buf)
      .resize(32, 32, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let sum = 0, sum2 = 0;
    const n = data.length;
    for (let i = 0; i < n; i++) { sum += data[i]; sum2 += data[i] * data[i]; }
    const mean = sum / n;
    const variance = sum2 / n - mean * mean;
    if (variance < 300) return true;
    if (info.width < 150 || info.height < 150) return true;
    return false;
  } catch (_) {
    return false;
  }
}

async function downloadImage(url) {
  const res = await request(url, {
    headers: {
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'User-Agent': UA
    }
  });
  if (res.status < 200 || res.status >= 300) throw new Error('HTTP ' + res.status);
  const ct = String((res.headers && res.headers['content-type']) || '');
  if (ct.includes('text/html') || ct.includes('json')) throw new Error('not image');
  if (!looksLikeRealImage(res.buf)) throw new Error('small/bad');
  if (await isLowDetailImage(res.buf)) throw new Error('placeholder');
  return res.buf;
}

module.exports = [
  {
    name: 'pint',
    aliases: ['pinterest', 'pintimg', 'imgpin'],
    category: 'utilidades',
    description: 'Pesquisa imagens publicas HD',
    usage: 'pint <pesquisa>',
    handler: async (ctx) => {
      const query = (ctx.args || []).join(' ').trim();
      if (!query) {
        return ctx.reply('📌 *PINT*\n\nUso: *pint* <pesquisa>\nEx: *pint Naruto*');
      }

      const tmpFiles = [];
      try {
        await ctx.reply('🔎 A procurar imagens HD: *' + query + '* ...').catch(() => {});

        let urls = [];
        try {
          urls = urls.concat(await openverseSearch(query));
        } catch (e) {
          console.error('[pint] openverse', e.message);
        }
        try {
          urls = urls.concat(await wikimediaSearch(query));
        } catch (e) {
          console.error('[pint] wiki', e.message);
        }
        try {
          urls = urls.concat(await wikipediaThumb(query));
        } catch (e) {
          console.error('[pint] wikipage', e.message);
        }

        urls = urls.filter((u, i, a) => u && /^https?:\/\//i.test(u) && a.indexOf(u) === i);

        if (!urls.length) {
          return ctx.reply(
            '❌ Nao encontrei imagens para: *' + query + '*\n' +
            'Tenta termo em ingles ou mais especifico.\nEx: *pint Naruto anime*'
          );
        }

        const sock = ctx.sock || ctx.client || ctx.conn;
        const jid = ctx.chatId || ctx.from || (ctx.msg && ctx.msg.key && ctx.msg.key.remoteJid);
        if (!sock || !jid) return ctx.reply('❌ Sem conexao.');

        let sent = 0;
        for (const u of urls) {
          if (sent >= MAX_IMAGES) break;
          let tmp = null;
          try {
            const buf = await downloadImage(u);
            tmp = path.join(os.tmpdir(), 'beatriz_pint_' + Date.now() + '_' + sent + '.jpg');
            fs.writeFileSync(tmp, buf);
            tmpFiles.push(tmp);
            await sock.sendMessage(
              jid,
              { image: buf, caption: sent === 0 ? '📌 *' + query + '*' : undefined },
              { quoted: ctx.msg }
            );
            sent++;
          } catch (e) {
            console.error('[pint] skip', e.message);
          } finally {
            try { if (tmp && fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) {}
          }
        }

        for (const f of tmpFiles) {
          try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
        }

        if (!sent) {
          return ctx.reply(
            '❌ Encontrei links mas nao consegui baixar.\nTenta: *pint ' + query + ' anime* ou outro termo.'
          );
        }
      } catch (e) {
        console.error('[pint]', e);
        for (const f of tmpFiles) {
          try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
        }
        await ctx.reply('❌ Erro na pesquisa de imagens.');
      }
    }
  }
];
