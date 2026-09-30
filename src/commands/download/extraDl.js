/**
 * Downloads extras: multidownload, mediafire, gdrive, capcut, fdroid
 * Isolado — nao altera outros comandos.
 * So ficheiros publicamente acessiveis. Sem contornar paywall/login.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');

const MAX_BYTES = 95 * 1024 * 1024; // \~95MB seguro WhatsApp
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

function request(urlStr, opts) {
  return new Promise((resolve, reject) => {
    let u;
    try {
      u = new URL(urlStr);
    } catch (e) {
      return reject(new Error('URL invalida'));
    }
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: (opts && opts.method) || 'GET',
        headers: Object.assign(
          {
            'User-Agent': UA,
            Accept: '*/*',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          (opts && opts.headers) || {}
        ),
        timeout: (opts && opts.timeout) || 60000
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let next = res.headers.location;
          if (!/^https?:\/\//i.test(next)) {
            next = u.protocol + '//' + u.hostname + next;
          }
          res.resume();
          return request(next, opts).then(resolve, reject);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            buf: Buffer.concat(chunks),
            text: Buffer.concat(chunks).toString('utf8')
          });
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    if (opts && opts.body) req.write(opts.body);
    req.end();
  });
}

function downloadToFile(urlStr, dest, onProgress) {
  return new Promise((resolve, reject) => {
    let u;
    try {
      u = new URL(urlStr);
    } catch (e) {
      return reject(new Error('URL invalida'));
    }
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.get(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: {
          'User-Agent': UA,
          Accept: '*/*',
          Referer: u.origin + '/'
        },
        timeout: 120000
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let next = res.headers.location;
          if (!/^https?:\/\//i.test(next)) next = u.protocol + '//' + u.hostname + next;
          res.resume();
          return downloadToFile(next, dest, onProgress).then(resolve, reject);
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          return reject(new Error('HTTP ' + res.statusCode));
        }
        const total = parseInt(res.headers['content-length'] || '0', 10) || 0;
        if (total && total > MAX_BYTES) {
          res.resume();
          return reject(new Error('Arquivo grande demais (' + (total / 1024 / 1024).toFixed(1) + ' MB). Limite \~95MB.'));
        }
        const ws = fs.createWriteStream(dest);
        let done = 0;
        let lastPct = -1;
        res.on('data', (c) => {
          done += c.length;
          if (done > MAX_BYTES) {
            res.destroy();
            ws.destroy();
            try { fs.unlinkSync(dest); } catch (_) {}
            return reject(new Error('Arquivo excedeu limite de \~95MB'));
          }
          if (onProgress && total > 0) {
            const pct = Math.floor((done / total) * 100);
            if (pct >= lastPct + 15 || pct === 100) {
              lastPct = pct;
              onProgress(pct, done, total);
            }
          }
        });
        res.pipe(ws);
        ws.on('finish', () => resolve({ size: done, total }));
        ws.on('error', reject);
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout no download'));
    });
  });
}

function fmtSize(n) {
  if (!n || n < 0) return '?';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

function safeName(name, fallback) {
  const n = String(name || fallback || 'arquivo')
    .replace(/[^\w.\- ()[\]]+/g, '_')
    .slice(0, 80);
  return n || fallback || 'arquivo';
}

async function sendFile(ctx, filePath, fileName, caption) {
  const sock = ctx.sock || ctx.client || ctx.conn;
  const jid = ctx.chatId || ctx.from || (ctx.msg && ctx.msg.key && ctx.msg.key.remoteJid);
  if (!sock || !jid) throw new Error('Sem conexao WhatsApp');
  const buf = fs.readFileSync(filePath);
  const lower = fileName.toLowerCase();
  const opts = { quoted: ctx.msg };

  if (/\.(jpg|jpeg|png|webp|gif)$/i.test(lower)) {
    await sock.sendMessage(jid, { image: buf, caption: caption || fileName }, opts);
  } else if (/\.(mp4|mkv|webm|3gp)$/i.test(lower)) {
    await sock.sendMessage(jid, { video: buf, caption: caption || fileName, mimetype: 'video/mp4' }, opts);
  } else if (/\.(mp3|m4a|ogg|opus|wav)$/i.test(lower)) {
    await sock.sendMessage(jid, { audio: buf, mimetype: 'audio/mpeg', fileName }, opts);
  } else {
    await sock.sendMessage(
      jid,
      {
        document: buf,
        fileName,
        mimetype: 'application/octet-stream',
        caption: caption || undefined
      },
      opts
    );
  }
}

async function runDownload(ctx, directUrl, fileName, title) {
  const tmp = path.join(os.tmpdir(), 'beatriz_dl_' + Date.now() + '_' + safeName(fileName, 'file'));
  let lastMsg = null;
  try {
    await ctx.reply('⬇️ A baixar: *' + (title || fileName) + '*\n⏳ 0%').catch(() => {});
    const info = await downloadToFile(directUrl, tmp, async (pct, done, total) => {
      // progresso discreto (evita flood)
      if (pct === 30 || pct === 60 || pct === 90) {
        try {
          await ctx.reply('⬇️ *' + (title || fileName) + '*\n📦 ' + fmtSize(done) + ' / ' + fmtSize(total) + ' (' + pct + '%)');
        } catch (_) {}
      }
    });
    const size = info.size || (fs.existsSync(tmp) ? fs.statSync(tmp).size : 0);
    const caption =
      '✅ *Download concluido*\n' +
      '📄 ' + fileName + '\n' +
      '📦 ' + fmtSize(size);
    await sendFile(ctx, tmp, fileName, caption);
  } finally {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch (_) {}
  }
}

/* ===== MediaFire ===== */
async function resolveMediaFire(pageUrl) {
  const res = await request(pageUrl, {
    headers: { Referer: 'https://www.mediafire.com/' }
  });
  if (res.status >= 400) throw new Error('MediaFire HTTP ' + res.status);
  // link direto comum
  let m =
    res.text.match(/href="(https?:\/\/download[^"]+)"/i) ||
    res.text.match(/href="(https?:\/\/[^"]+mediafire\.com\/[^"]+)"[^>]*>\s*Download/i) ||
    res.text.match(/aria-label="Download file"[^>]*href="([^"]+)"/i) ||
    res.text.match(/id="downloadButton"[^>]*href="([^"]+)"/i);
  if (!m) {
    m = res.text.match(/(https?:\/\/download\d+\.mediafire\.com\/[^\s"']+)/i);
  }
  if (!m) throw new Error('Link direto MediaFire nao encontrado (privado ou pagina mudou)');
  let direct = m[1].replace(/&amp;/g, '&');
  let name = 'mediafire_file';
  const n1 = res.text.match(/class="filename"[^>]*>([^<]+)</i) || res.text.match(/Filename:.*?>([^<]+)</i);
  if (n1) name = n1[1].trim();
  const n2 = pageUrl.match(/\/([^\/\?]+)$/);
  if (name === 'mediafire_file' && n2) name = decodeURIComponent(n2[1]);
  return { direct, name: safeName(name, 'mediafire_file') };
}

/* ===== Google Drive ===== */
function extractGdriveId(url) {
  let m = url.match(/\/file\/d\/([^\/]+)/);
  if (m) return m[1];
  m = url.match(/[?&]id=([^&]+)/);
  if (m) return m[1];
  m = url.match(/\/open\?id=([^&]+)/);
  if (m) return m[1];
  m = url.match(/\/uc\?.*?id=([^&]+)/);
  if (m) return m[1];
  return null;
}

async function resolveGdrive(pageUrl) {
  const id = extractGdriveId(pageUrl);
  if (!id) throw new Error('ID do Google Drive nao encontrado na URL');
  // confirmacao virus scan para ficheiros maiores
  let direct = 'https://drive.google.com/uc?export=download&id=' + id;
  const res = await request(direct, {
    headers: { Referer: 'https://drive.google.com/' }
  });
  // se HTML de confirmacao
  if (res.headers['content-type'] && String(res.headers['content-type']).includes('text/html')) {
    const conf =
      res.text.match(/href="(\/uc\?export=download[^"]+confirm=[^"]+)"/i) ||
      res.text.match(/confirm=([0-9A-Za-z_]+)&/i);
    if (conf) {
      if (conf[1].startsWith('/')) {
        direct = 'https://drive.google.com' + conf[1].replace(/&amp;/g, '&');
      } else {
        direct =
          'https://drive.google.com/uc?export=download&id=' +
          id +
          '&confirm=' +
          conf[1];
      }
    } else if (/accounts\.google\.com|Sign in/i.test(res.text)) {
      throw new Error('Arquivo privado — precisa de permissao publica (qualquer pessoa com o link)');
    }
  } else if (res.status >= 200 && res.status < 300 && res.buf.length > 1000) {
    // ja veio o ficheiro pequeno em memoria — gravar via URL direta na mesma
  }
  let name = 'gdrive_' + id;
  try {
    const meta = await request(
      'https://drive.google.com/file/d/' + id + '/view',
      { headers: { Referer: 'https://drive.google.com/' } }
    );
    const t = meta.text.match(/<title>([^<]+)<\/title>/i);
    if (t) {
      name = t[1].replace(/\s*-\s*Google Drive\s*$/i, '').trim() || name;
    }
  } catch (_) {}
  return { direct, name: safeName(name, 'gdrive_file') };
}

/* ===== F-Droid ===== */
async function resolveFdroid(pageUrl) {
  // pagina do app ou link direto .apk
  if (/\.apk(\?|$)/i.test(pageUrl)) {
    const name = decodeURIComponent(pageUrl.split('/').pop().split('?')[0]);
    return { direct: pageUrl, name: safeName(name, 'app.apk') };
  }
  const res = await request(pageUrl);
  if (res.status >= 400) throw new Error('F-Droid HTTP ' + res.status);
  // links de download oficiais fdroid
  let m =
    res.text.match(/href="(https?:\/\/[^"]+\.apk)"/i) ||
    res.text.match(/href="(\/\/[^"]+\.apk)"/i) ||
    res.text.match(/href="([^"]+\.apk)"/i);
  if (!m) throw new Error('APK publico nao encontrado nesta pagina F-Droid');
  let direct = m[1];
  if (direct.startsWith('//')) direct = 'https:' + direct;
  if (direct.startsWith('/')) {
    const u = new URL(pageUrl);
    direct = u.origin + direct;
  }
  const name = safeName(decodeURIComponent(direct.split('/').pop().split('?')[0]), 'app.apk');
  return { direct, name };
}

/* ===== CapCut ===== */
async function resolveCapCut(pageUrl) {
  // CapCut template/share — tenta obter media publica da pagina
  const res = await request(pageUrl, {
    headers: { Referer: 'https://www.capcut.com/' }
  });
  if (res.status >= 400) throw new Error('CapCut HTTP ' + res.status);
  // procura urls de video/mp4 publicas no HTML/JSON embutido
  const found = [];
  const re = /https?:\\\/\\\/[^"'\s]+?\.(?:mp4|mov)[^"'\s]*/gi;
  let m;
  while ((m = re.exec(res.text)) && found.length < 5) {
    const u = m[0].replace(/\\\//g, '/').replace(/\\u002F/g, '/');
    if (!found.includes(u)) found.push(u);
  }
  const re2 = /https?:\/\/[^"'\s]+?\.(?:mp4|mov)(?:\?[^"'\s]*)?/gi;
  while ((m = re2.exec(res.text)) && found.length < 8) {
    if (!found.includes(m[0])) found.push(m[0]);
  }
  if (!found.length) {
    throw new Error(
      'Nao encontrei ficheiro publico CapCut neste link.\n' +
        'O template pode exigir app/login ou nao expor download direto.'
    );
  }
  return { direct: found[0], name: 'capcut_video.mp4' };
}

/* ===== Multi detect ===== */
function detectService(url) {
  const u = url.toLowerCase();
  if (u.includes('mediafire.com')) return 'mediafire';
  if (u.includes('drive.google.com') || u.includes('docs.google.com')) return 'gdrive';
  if (u.includes('f-droid.org') || u.includes('fdroid')) return 'fdroid';
  if (u.includes('capcut.com') || u.includes('capcut.cn')) return 'capcut';
  return null;
}

async function resolveByService(service, url) {
  if (service === 'mediafire') return resolveMediaFire(url);
  if (service === 'gdrive') return resolveGdrive(url);
  if (service === 'fdroid') return resolveFdroid(url);
  if (service === 'capcut') return resolveCapCut(url);
  throw new Error('Servico nao suportado');
}

async function genericHandler(ctx, forcedService, usage) {
  const url = (ctx.args || []).join(' ').trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return ctx.reply(usage);
  }
  try {
    const service = forcedService || detectService(url);
    if (!service) {
      return ctx.reply(
        '❌ Nao identifiquei o servico neste link.\n' +
          'Usa o comando especifico:\n' +
          '*mediafire* / *gdrive* / *fdroid* / *capcut*'
      );
    }
    await ctx.reply('🔎 A resolver link (*' + service + '*)...').catch(() => {});
    const { direct, name } = await resolveByService(service, url);
    await runDownload(ctx, direct, name, name);
  } catch (e) {
    console.error('[extraDl]', e);
    await ctx.reply(
      '❌ Falha no download.\n' +
        (e && e.message ? e.message.slice(0, 220) : 'Erro desconhecido')
    );
  }
}

module.exports = [
  {
    name: 'multidl',
    aliases: ['multidownload', 'mdl'],
    category: 'download',
    description: 'Download multi-fonte (MediaFire, GDrive, F-Droid, CapCut)',
    usage: 'multidl <url>',
    handler: async (ctx) =>
      genericHandler(
        ctx,
        null,
        '📥 *MultiDL*\n\nUso: *multidl* <url>\n\nSuporta:\n• MediaFire\n• Google Drive (publico)\n• F-Droid\n• CapCut (se publico)\n\nEx: *multidl* https://www.mediafire.com/file/...'
      )
  },
  {
    name: 'mediafire',
    aliases: ['mf', 'mfire'],
    category: 'download',
    description: 'Download MediaFire',
    usage: 'mediafire <url>',
    handler: async (ctx) =>
      genericHandler(
        ctx,
        'mediafire',
        '📥 *MediaFire*\n\nUso: *mediafire* <url do ficheiro>\nEx: *mediafire* https://www.mediafire.com/file/xxx/arquivo.zip'
      )
  },
  {
    name: 'gdrive',
    aliases: ['drive', 'googledrive', 'gdr'],
    category: 'download',
    description: 'Download Google Drive publico',
    usage: 'gdrive <url>',
    handler: async (ctx) =>
      genericHandler(
        ctx,
        'gdrive',
        '📥 *Google Drive*\n\nUso: *gdrive* <url publico>\nO ficheiro tem de estar partilhado: *qualquer pessoa com o link*\n\nEx: *gdrive* https://drive.google.com/file/d/ID/view'
      )
  },
  {
    name: 'capcut',
    aliases: ['ccut', 'capcutdl'],
    category: 'download',
    description: 'Download CapCut publico',
    usage: 'capcut <url>',
    handler: async (ctx) =>
      genericHandler(
        ctx,
        'capcut',
        '📥 *CapCut*\n\nUso: *capcut* <url publico do template/video>\nSo funciona se o link expor media publica.\n\nEx: *capcut* https://www.capcut.com/...'
      )
  },
  {
    name: 'fdroid',
    aliases: ['f-droid', 'apkfdroid'],
    category: 'download',
    description: 'Download APK F-Droid',
    usage: 'fdroid <url>',
    handler: async (ctx) =>
      genericHandler(
        ctx,
        'fdroid',
        '📥 *F-Droid*\n\nUso: *fdroid* <url da pagina do app ou .apk>\nEx: *fdroid* https://f-droid.org/packages/org.app/'
      )
  }
];
