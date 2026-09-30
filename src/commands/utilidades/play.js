const { withDownloadLock } = require('../../services/downloadQueue');
/**
 * play — Audius: pesquisa + thumbnail + audio
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

function apiKey() { return process.env.AUDIUS_API_KEY || ''; }
function bearer() { return process.env.AUDIUS_BEARER_TOKEN || ''; }
function appName() { return process.env.AUDIUS_APP_NAME || 'BeatrizBot'; }

function request(urlStr, asJson) {
  return new Promise(function (resolve, reject) {
    const u = new URL(urlStr);
    const lib = u.protocol === 'http:' ? http : https;
    const headers = {
      Accept: asJson ? 'application/json' : '*/*',
      'User-Agent': 'BeatrizBot/1.0'
    };
    if (bearer()) headers.Authorization = 'Bearer ' + bearer();

    const req = lib.get({
      hostname: u.hostname,
      path: u.pathname + u.search,
      protocol: u.protocol,
      headers: headers,
      timeout: 60000
    }, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        let next = res.headers.location;
        if (next.indexOf('http') !== 0) next = u.protocol + '//' + u.host + next;
        return request(next, asJson).then(resolve, reject);
      }
      const chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () {
        const buf = Buffer.concat(chunks);
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error('HTTP ' + res.statusCode));
        }
        if (asJson) {
          try { resolve(JSON.parse(buf.toString('utf8'))); }
          catch (e) { reject(new Error('JSON invalido')); }
        } else {
          resolve(buf);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', function () { req.destroy(); reject(new Error('Timeout')); });
  });
}

function downloadBuffer(urlStr, maxBytes, redirects) {
  redirects = redirects || 0;
  maxBytes = maxBytes || 15 * 1024 * 1024;
  return new Promise(function (resolve, reject) {
    if (redirects > 8) return reject(new Error('Demasiados redirects'));
    const u = new URL(urlStr);
    const lib = u.protocol === 'http:' ? http : https;
    const headers = { 'User-Agent': 'BeatrizBot/1.0', Accept: '*/*' };
    if (bearer()) headers.Authorization = 'Bearer ' + bearer();

    const req = lib.get({
      hostname: u.hostname,
      path: u.pathname + u.search,
      protocol: u.protocol,
      headers: headers,
      timeout: 90000
    }, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        let next = res.headers.location;
        if (next.indexOf('http') !== 0) next = u.protocol + '//' + u.host + next;
        return downloadBuffer(next, maxBytes, redirects + 1).then(resolve, reject);
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return reject(new Error('Download HTTP ' + res.statusCode));
      }
      const chunks = [];
      let total = 0;
      res.on('data', function (c) {
        total += c.length;
        if (total > maxBytes) {
          req.destroy();
          return reject(new Error('Ficheiro demasiado grande'));
        }
        chunks.push(c);
      });
      res.on('end', function () { resolve(Buffer.concat(chunks)); });
    });
    req.on('error', reject);
    req.on('timeout', function () { req.destroy(); reject(new Error('Timeout download')); });
  });
}

function withAuthQuery(url) {
  const app = encodeURIComponent(appName());
  let u = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'app_name=' + app;
  if (apiKey()) u += '&api_key=' + encodeURIComponent(apiKey());
  return u;
}

async function searchTracks(query) {
  const q = encodeURIComponent(query);
  const url = withAuthQuery('https://api.audius.co/v1/tracks/search?query=' + q);
  const data = await request(url, true);
  return (data && data.data) || [];
}

function streamCandidates(track) {
  const id = track.id;
  const list = [];
  list.push(withAuthQuery('https://api.audius.co/v1/tracks/' + id + '/stream'));
  list.push(withAuthQuery('https://discoveryprovider.audius.co/v1/tracks/' + id + '/stream'));
  const nodes = [
    'https://audius-discovery-1.cultur3stake.com',
    'https://audius-discovery-2.cultur3stake.com',
    'https://discoveryprovider2.audius.co',
    'https://discoveryprovider3.audius.co'
  ];
  for (let i = 0; i < nodes.length; i++) {
    list.push(withAuthQuery(nodes[i] + '/v1/tracks/' + id + '/stream'));
  }
  return list;
}

async function downloadTrackAudio(track) {
  const urls = streamCandidates(track);
  let lastErr = null;
  for (let i = 0; i < urls.length; i++) {
    try {
      const buf = await downloadBuffer(urls[i], 15 * 1024 * 1024);
      if (buf && buf.length > 2000) return buf;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Nenhum stream disponivel');
}

function isPlayable(track) {
  if (!track || !track.id) return false;
  if (track.is_stream_gated) return false;
  if (track.is_delete) return false;
  const d = Number(track.duration || 0);
  if (d > 600) return false;
  return true;
}

function pickArtwork(track) {
  const art = track && track.artwork;
  if (!art || typeof art !== 'object') return null;
  return art['480x480'] || art['1000x1000'] || art['150x150'] || null;
}

function trackLink(track) {
  const handle = track.user && (track.user.handle || track.user.name);
  const permalink = track.permalink;
  if (permalink && String(permalink).indexOf('http') === 0) return permalink;
  if (handle && permalink) {
    return 'https://audius.co/' + String(handle).replace(/^@/, '') + '/' + String(permalink).replace(/^\//, '');
  }
  if (track.id) return 'https://audius.co/track/' + track.id;
  return '';
}

module.exports = [
  {
    name: 'play',
    aliases: ['tocar', 'musica', 'audius'],
    category: 'utilidades',
    description: 'Pesquisa e toca musica no Audius (com capa)',
    handler: withDownloadLock('play', async (ctx) => {
      const q = (ctx.text || (ctx.args || []).join(' ') || '').trim();
      if (!q) {
        return ctx.reply('Uso: *play nome da musica*\nEx: play lo-fi hip hop');
      }

      try { await ctx.reply('🔎 A procurar no Audius: *' + q + '*'); } catch (_) {}

      let tracks;
      try {
        tracks = await searchTracks(q);
      } catch (e) {
        console.error('[play] search', e.message);
        return ctx.reply('❌ Falha na pesquisa:\n' + String(e.message).slice(0, 180));
      }

      if (!tracks.length) {
        return ctx.reply(
          '❌ Nao encontrei no *Audius*: *' + q + '*\n' +
          'O Audius e um catalogo independente.'
        );
      }

      let chosen = null;
      let buf = null;
      let lastErr = null;

      for (let i = 0; i < Math.min(tracks.length, 5); i++) {
        const t = tracks[i];
        if (!isPlayable(t)) continue;

        const title = t.title || 'Musica';
        const artist = (t.user && (t.user.name || t.user.handle)) || 'Artista';
        const link = trackLink(t);
        const catalog = t.genre || t.mood || 'Audius';
        const caption =
          '🎧 *' + title + '*\n' +
          '👤 ' + artist + '\n' +
          '📂 ' + catalog + '\n' +
          (link ? ('🔗 ' + link) : '');

        // thumbnail / capa do album
        const artUrl = pickArtwork(t);
        if (artUrl) {
          try {
            const img = await downloadBuffer(artUrl, 3 * 1024 * 1024);
            if (img && img.length > 100) {
              await ctx.sock.sendMessage(
                ctx.jid,
                { image: img, caption: caption },
                { quoted: ctx.msg }
              );
            } else {
              await ctx.reply(caption);
            }
          } catch (e) {
            console.error('[play] art', e.message);
            try { await ctx.reply(caption); } catch (_) {}
          }
        } else {
          try { await ctx.reply(caption + '\n⏳ A baixar audio...'); } catch (_) {}
        }

        try {
          buf = await downloadTrackAudio(t);
          chosen = t;
          break;
        } catch (e) {
          lastErr = e;
          console.error('[play] try', t.id, e.message);
          try {
            await ctx.reply('⚠️ Stream falhou nesta faixa, a tentar outra...');
          } catch (_) {}
        }
      }

      if (!chosen || !buf) {
        return ctx.reply(
          '❌ Encontrei resultados, mas o stream falhou.\n' +
          (lastErr ? String(lastErr.message).slice(0, 120) : '') +
          '\nTenta outro nome no catalogo Audius.'
        );
      }

      try {
        await ctx.sock.sendMessage(
          ctx.jid,
          {
            audio: buf,
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: String(chosen.title || 'track').replace(/[^\w\s.-]/g, '').slice(0, 50) + '.mp3'
          },
          { quoted: ctx.msg }
        );
      } catch (e) {
        console.error('[play] send', e.message);
        return ctx.reply('❌ Audio baixado mas falhou o envio no WhatsApp.');
      }
    })
  }
];
