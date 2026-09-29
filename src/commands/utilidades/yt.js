/**
 * yt — YouTube Data API v3 (max 2 resultados + thumbnail)
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '../../../.env');
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.charAt(0) === '#') continue;
      const eq = line.indexOf('=');
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') ||
          (val.charAt(0) === "'" && val.charAt(val.length - 1) === "'")) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (_) {}
}
loadEnvFile();


function getYoutubeKeys() {
  const keys = [];
  const multi = (process.env.YOUTUBE_API_KEYS || '').trim();
  if (multi) multi.split(/[,;\s]+/).forEach(function (k) {
    k = String(k || '').trim();
    if (k && keys.indexOf(k) < 0) keys.push(k);
  });
  [process.env.YOUTUBE_API_KEY, process.env.YOUTUBE_API_KEY_2, process.env.YOUTUBE_API_KEY_3, process.env.YT_API_KEY]
    .forEach(function (k) {
      k = String(k || '').trim();
      if (k && keys.indexOf(k) < 0) keys.push(k);
    });
  return keys;
}
function isYtQuotaError(status, raw) {
  if (status === 403 || status === 429) return true;
  return /quota|limit|dailyLimitExceeded|rateLimitExceeded|userRateLimitExceeded/i.test(String(raw || ''));
}

function getApiKey(){ return getYoutubeKeys()[0]||""; }

function youtubeSearch(query) {
  return new Promise(function (resolve, reject) {
    const key = getApiKey();
    if (!key) return reject(new Error('YOUTUBE_API_KEY nao configurada no .env'));

    // max 2 | relevance | prefere PT | regiao MZ
    const params =
      'part=snippet' +
      '&type=video' +
      '&maxResults=2' +
      '&order=relevance' +
      '&relevanceLanguage=pt' +
      '&regionCode=MZ' +
      '&safeSearch=none' +
      '&q=' + encodeURIComponent(query) +
      '&key=' + encodeURIComponent(key);

    const req = https.get(
      {
        hostname: 'www.googleapis.com',
        path: '/youtube/v3/search?' + params,
        headers: { Accept: 'application/json' },
        timeout: 60000
      },
      function (res) {
        const chunks = [];
        res.on('data', function (c) { chunks.push(c); });
        res.on('end', function () {
          const raw = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error('YouTube HTTP ' + res.statusCode + ': ' + raw.slice(0, 220)));
          }
          try {
            const data = JSON.parse(raw);
            resolve(data.items || []);
          } catch (e) {
            reject(new Error('JSON invalido'));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', function () {
      req.destroy();
      reject(new Error('Timeout YouTube'));
    });
  });
}

function downloadBuffer(urlStr, redirects) {
  redirects = redirects || 0;
  return new Promise(function (resolve, reject) {
    if (!urlStr) return reject(new Error('sem url'));
    if (redirects > 5) return reject(new Error('redirects'));
    let u;
    try { u = new URL(urlStr); } catch (e) { return reject(e); }
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.get(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        protocol: u.protocol,
        headers: { 'User-Agent': 'BeatrizBot/1.0' },
        timeout: 20000
      },
      function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return downloadBuffer(res.headers.location, redirects + 1).then(resolve, reject);
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          return reject(new Error('HTTP ' + res.statusCode));
        }
        const chunks = [];
        res.on('data', function (c) { chunks.push(c); });
        res.on('end', function () { resolve(Buffer.concat(chunks)); });
      }
    );
    req.on('error', reject);
    req.on('timeout', function () {
      req.destroy();
      reject(new Error('Timeout img'));
    });
  });
}

function pickThumb(snippet) {
  const t = (snippet && snippet.thumbnails) || {};
  if (t.high && t.high.url) return t.high.url;
  if (t.medium && t.medium.url) return t.medium.url;
  if (t.default && t.default.url) return t.default.url;
  return null;
}

module.exports = [
  {
    name: 'yt',
    aliases: ['youtube', 'yts', 'pesquisaryt'],
    category: 'utilidades',
    description: 'Pesquisa videos no YouTube (max 2)',
    handler: async (ctx) => {
      const q = (ctx.text || (ctx.args || []).join(' ') || '').trim();
      if (!q) {
        return ctx.reply('Uso: *yt nome do video*\nEx: yt Naruto episodio 1');
      }
      if (!getApiKey()) {
        return ctx.reply('❌ Falta YOUTUBE_API_KEY no ficheiro .env');
      }

      try { await ctx.reply('🔎 A procurar: *' + q + '*'); } catch (_) {}

      let items;
      try {
        items = await youtubeSearch(q);
      } catch (e) {
        console.error('[yt]', e.message);
        return ctx.reply('❌ Falha YouTube:\n' + String(e.message || e).slice(0, 250));
      }

      // garante no maximo 2
      items = (items || []).slice(0, 2);

      if (!items.length) {
        return ctx.reply('❌ Nenhum video encontrado para: *' + q + '*');
      }

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const id = it.id && it.id.videoId;
        const sn = it.snippet || {};
        const title = sn.title || 'Sem titulo';
        const channel = sn.channelTitle || 'Canal';
        const link = id ? ('https://www.youtube.com/watch?v=' + id) : '';
        const thumbUrl = pickThumb(sn);

        const caption =
          (i + 1) + '. *' + title + '*\n' +
          '👤 ' + channel + '\n' +
          (link ? ('🔗 ' + link) : '');

        if (thumbUrl) {
          try {
            const img = await downloadBuffer(thumbUrl);
            if (img && img.length > 100) {
              await ctx.sock.sendMessage(
                ctx.jid,
                { image: img, caption: caption },
                { quoted: ctx.msg }
              );
              continue;
            }
          } catch (e) {
            console.error('[yt] thumb', e.message);
          }
        }
        try { await ctx.reply(caption); } catch (_) {}
      }
    }
  }
];
