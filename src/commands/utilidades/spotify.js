/**
 * spotify — pesquisa Spotify Web API (isolado)
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

function clientId() { return process.env.SPOTIFY_CLIENT_ID || ''; }
function clientSecret() { return process.env.SPOTIFY_CLIENT_SECRET || ''; }

let cachedToken = null;
let tokenExpires = 0;

function httpsRequest(options, body) {
  return new Promise(function (resolve, reject) {
    const req = https.request(options, function (res) {
      const chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () {
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') });
      });
    });
    req.on('error', reject);
    req.on('timeout', function () { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpires - 30000) return cachedToken;

  const id = clientId();
  const secret = clientSecret();
  if (!id || !secret || secret === 'COLA_AQUI_O_CLIENT_SECRET') {
    throw new Error('SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET em falta no .env');
  }

  const basic = Buffer.from(id + ':' + secret).toString('base64');
  const body = 'grant_type=client_credentials';
  const r = await httpsRequest({
    hostname: 'accounts.spotify.com',
    path: '/api/token',
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + basic,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body)
    },
    timeout: 60000
  }, body);

  if (r.status < 200 || r.status >= 300) {
    throw new Error('Token Spotify HTTP ' + r.status + ': ' + r.body.slice(0, 180));
  }
  const data = JSON.parse(r.body);
  cachedToken = data.access_token;
  tokenExpires = Date.now() + (Number(data.expires_in || 3600) * 1000);
  return cachedToken;
}

async function searchTracks(query) {
  const token = await getAccessToken();
  const q =
    '/v1/search?type=track&limit=3&q=' + encodeURIComponent(query);
  const r = await httpsRequest({
    hostname: 'api.spotify.com',
    path: q,
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json'
    },
    timeout: 60000
  });

  if (r.status < 200 || r.status >= 300) {
    throw new Error('Search HTTP ' + r.status + ': ' + r.body.slice(0, 180));
  }
  const data = JSON.parse(r.body);
  return (data.tracks && data.tracks.items) || [];
}

function downloadBuffer(urlStr, redirects) {
  redirects = redirects || 0;
  return new Promise(function (resolve, reject) {
    if (!urlStr) return reject(new Error('sem url'));
    if (redirects > 5) return reject(new Error('redirects'));
    const u = new URL(urlStr);
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.get({
      hostname: u.hostname,
      path: u.pathname + u.search,
      protocol: u.protocol,
      headers: { 'User-Agent': 'BeatrizBot/1.0' },
      timeout: 20000
    }, function (res) {
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
    });
    req.on('error', reject);
    req.on('timeout', function () { req.destroy(); reject(new Error('Timeout img')); });
  });
}

function pickCover(track) {
  const imgs = track.album && track.album.images;
  if (!imgs || !imgs.length) return null;
  // imagens ja vem ordenadas (maior primeiro)
  return imgs[1] && imgs[1].url ? imgs[1].url : imgs[0].url;
}

module.exports = [
  {
    name: 'spotify',
    aliases: ['sp', 'spot'],
    category: 'utilidades',
    description: 'Pesquisa musicas no Spotify',
    handler: async (ctx) => {
      const q = (ctx.text || (ctx.args || []).join(' ') || '').trim();
      if (!q) {
        return ctx.reply('Uso: *spotify nome da musica*\nEx: spotify Justin Bieber Baby');
      }
      if (!clientId() || !clientSecret()) {
        return ctx.reply('❌ Falta SPOTIFY_CLIENT_ID ou SPOTIFY_CLIENT_SECRET no .env');
      }

      try { await ctx.reply('🔎 A procurar no Spotify: *' + q + '*'); } catch (_) {}

      let tracks;
      try {
        tracks = await searchTracks(q);
      } catch (e) {
        console.error('[spotify]', e.message);
        return ctx.reply('❌ Falha Spotify:\n' + String(e.message || e).slice(0, 220));
      }

      tracks = (tracks || []).slice(0, 3);
      if (!tracks.length) {
        return ctx.reply('❌ Nenhuma musica encontrada para: *' + q + '*');
      }

      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        const name = t.name || 'Musica';
        const artists = (t.artists || []).map(function (a) { return a.name; }).filter(Boolean).join(', ') || 'Artista';
        const album = (t.album && t.album.name) || 'Album';
        const link = (t.external_urls && t.external_urls.spotify) || '';
        const cover = pickCover(t);

        const caption =
          '🎵 *' + name + '*\n' +
          '👤 ' + artists + '\n' +
          '💿 ' + album + '\n' +
          (link ? ('🔗 ' + link) : '');

        if (cover) {
          try {
            const img = await downloadBuffer(cover);
            if (img && img.length > 100) {
              await ctx.sock.sendMessage(
                ctx.jid,
                { image: img, caption: caption },
                { quoted: ctx.msg }
              );
              continue;
            }
          } catch (e) {
            console.error('[spotify] cover', e.message);
          }
        }
        try { await ctx.reply(caption); } catch (_) {}
      }
    }
  }
];
