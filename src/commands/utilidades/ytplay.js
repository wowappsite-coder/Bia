const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

function findYtDlp() {
  const list = [
    path.join(process.env.HOME || '', '.local/bin/yt-dlp'),
    '/data/data/com.termux/files/usr/bin/yt-dlp',
    'yt-dlp'
  ];
  for (const c of list) {
    try { if (c === 'yt-dlp' || fs.existsSync(c)) return c; } catch (_) {}
  }
  return 'yt-dlp';
}

function run(bin, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PATH: (process.env.HOME || '') + '/.local/bin:' + (process.env.PATH || '')
    };
    execFile(bin, args, {
      timeout: timeoutMs || 150000,
      maxBuffer: 32 * 1024 * 1024,
      env
    }, (err, stdout, stderr) => {
      if (err) return reject(new Error((stderr || err.message || 'erro').toString().slice(0, 400)));
      resolve(stdout || '');
    });
  });
}

function getJid(ctx) {
  return ctx.jid || ctx.chatId || (ctx.msg && ctx.msg.key && ctx.msg.key.remoteJid) || null;
}

function safeName(s) {
  return String(s || 'musica').replace(/[^\w\s\-\u00C0-\u024F.]/gi, '').trim().slice(0, 60) || 'musica';
}

function fmtDuration(sec) {
  sec = Math.max(0, parseInt(sec, 10) || 0);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
}

function fmtSize(bytes) {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  return Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    const lib = String(url).startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 60000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuf(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('HTTP ' + res.statusCode));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function buildCaption(title, artist, duration, size, link) {
  return (
    '╭──〔 ▶️ 𝐘𝐎𝐔𝐓𝐔𝐁𝐄 〕──╮\n' +
    '│\n' +
    '│  🎵 *' + title + '*\n' +
    '│\n' +
    '│  👤 *Canal:* ' + artist + '\n' +
    '│  ⏱️ *Duracao:* ' + duration + '\n' +
    '│  📦 *Tamanho:* ' + size + '\n' +
    (link ? ('│  🔗 *Link:*\n│  ' + link + '\n') : '') +
    '│\n' +
    '╰──〔 𝐁𝐄𝐀𝐓𝐑𝐈𝐙 𝐁𝐎𝐓 〕──╯'
  );
}

async function searchAndDownload(query, outDir) {
  const bin = findYtDlp();
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const outTpl = path.join(outDir, 'yp_' + stamp + '.%(ext)s');

  const infoRaw = await run(bin, [
    'ytsearch1:' + query,
    '--dump-json', '--no-playlist', '--no-warnings',
    '--skip-download', '--no-check-certificates'
  ], 50000);

  let info;
  try {
    const line = infoRaw.split('\n').find((l) => l.trim().startsWith('{')) || infoRaw;
    info = JSON.parse(line);
  } catch (_) {
    throw new Error('Nao encontrei essa musica.');
  }

  const title = info.title || query;
  const artist = String(info.artist || info.uploader || info.channel || 'YouTube');
  const webpage = info.webpage_url || info.original_url || '';
  const duration = info.duration || 0;
  const videoId = info.id;
  const url = videoId ? ('https://www.youtube.com/watch?v=' + videoId) : webpage;

  let thumbUrl = info.thumbnail || null;
  if (Array.isArray(info.thumbnails) && info.thumbnails.length) {
    const sorted = info.thumbnails.slice().sort((a, b) => (b.width || 0) - (a.width || 0));
    thumbUrl = (sorted[0] && sorted[0].url) || thumbUrl;
  }

  await run(bin, [
    url,
    '-f', 'bestaudio[ext=m4a]/bestaudio/best',
    '-x', '--audio-format', 'mp3', '--audio-quality', '96K',
    '--no-playlist', '--no-warnings', '--no-check-certificates',
    '-o', outTpl
  ], 150000);

  const files = fs.readdirSync(outDir)
    .filter((f) => f.startsWith('yp_' + stamp))
    .map((f) => path.join(outDir, f));
  if (!files.length) throw new Error('Audio nao encontrado.');

  const audioPath = files.find((f) => /\.(mp3|m4a|opus|webm)$/i.test(f)) || files[0];
  const size = fs.statSync(audioPath).size;
  if (size < 1000) throw new Error('Audio invalido.');

  let thumbBuf = null;
  if (thumbUrl) {
    try {
      thumbBuf = await fetchBuf(thumbUrl);
      if (!thumbBuf || thumbBuf.length < 500) thumbBuf = null;
    } catch (_) { thumbBuf = null; }
  }

  return { audioPath, title, artist, webpage, thumbBuf, size, duration };
}

module.exports = {
  name: 'ytplay',
  aliases: ['ytmusica', 'playyt', 'tocar'],
  category: 'utilidades',
  description: 'Toca musica do YouTube',
  async handler(ctx) {
    const query = (ctx.args || []).join(' ').trim();
    if (!query) return ctx.reply('Uso: *!ytplay nome da musica*');

    const chatJid = getJid(ctx);
    if (!chatJid || !ctx.sock) return ctx.reply('❌ Chat/socket invalido.');

    const outDir = path.join(process.cwd(), 'tmp', 'ytplay');

    try {
      try {
        if (ctx.msg && ctx.msg.key) {
          await ctx.sock.sendMessage(chatJid, { react: { text: '🎵', key: ctx.msg.key } });
        }
      } catch (_) {}

      const r = await searchAndDownload(query, outDir);
      const fileName = safeName(r.title) + '.mp3';
      const caption = buildCaption(
        String(r.title).slice(0, 90),
        String(r.artist).slice(0, 70),
        fmtDuration(r.duration),
        fmtSize(r.size),
        r.webpage || ''
      );

      if (r.thumbBuf) {
        try {
          await ctx.sock.sendMessage(chatJid, { image: r.thumbBuf, caption: caption });
        } catch (_) {
          await ctx.sock.sendMessage(chatJid, { text: caption });
        }
      } else {
        await ctx.sock.sendMessage(chatJid, { text: caption });
      }

      try {
        await ctx.sock.sendMessage(chatJid, {
          audio: { url: r.audioPath },
          mimetype: 'audio/mpeg',
          fileName,
          ptt: false
        });
      } catch (_) {
        try {
          const buf = fs.readFileSync(r.audioPath);
          await ctx.sock.sendMessage(chatJid, {
            audio: buf,
            mimetype: 'audio/mpeg',
            fileName,
            ptt: false
          });
        } catch (_) {
          await ctx.sock.sendMessage(chatJid, {
            document: { url: r.audioPath },
            mimetype: 'audio/mpeg',
            fileName
          });
        }
      }

      try {
        if (ctx.msg && ctx.msg.key) {
          await ctx.sock.sendMessage(chatJid, { react: { text: '✅', key: ctx.msg.key } });
        }
      } catch (_) {}

    } catch (e) {
      const msg = (e && e.message) ? e.message : 'Erro ao processar.';
      try {
        await ctx.sock.sendMessage(chatJid, { text: '❌ ' + msg.slice(0, 300) });
      } catch (_) {
        try { await ctx.reply('❌ ' + msg.slice(0, 300)); } catch (_) {}
      }
    } finally {
      try {
        if (fs.existsSync(outDir)) {
          for (const f of fs.readdirSync(outDir)) {
            if (f.startsWith('yp_')) {
              try { fs.unlinkSync(path.join(outDir, f)); } catch (_) {}
            }
          }
        }
      } catch (_) {}
    }
  }
};
