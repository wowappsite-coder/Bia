const { withDownloadLock } = require('../../services/downloadQueue');
/**
 * tk / ig — download de vídeo TikTok e Instagram
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

function extractUrl(text) {
  const m = String(text || '').match(/https?:\/\/[^\s<>"']+/i);
  return m ? m[0].replace(/[)\].,;]+$/, '') : null;
}

function httpGetBuffer(url, redirects) {
  redirects = redirects || 0;
  return new Promise(function (resolve, reject) {
    if (redirects > 8) return reject(new Error('muitos redirects'));
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
          Accept: '*/*'
        },
        timeout: 60000
      },
      function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          res.resume();
          return resolve(httpGetBuffer(next, redirects + 1));
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          return reject(new Error('HTTP ' + res.statusCode));
        }
        const chunks = [];
        res.on('data', function (c) {
          chunks.push(c);
        });
        res.on('end', function () {
          resolve(Buffer.concat(chunks));
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', function () {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

function httpGetJson(url) {
  return httpGetBuffer(url).then(function (buf) {
    return JSON.parse(buf.toString('utf8'));
  });
}

async function downloadWithYtDlp(pageUrl) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tkig-'));
  const out = path.join(dir, 'video.%(ext)s');
  try {
    const bin = fs.existsSync('/data/data/com.termux/files/usr/bin/yt-dlp')
      ? 'yt-dlp'
      : 'yt-dlp';
    await execFileAsync(
      bin,
      [
        '-f',
        'mp4/best',
        '--no-playlist',
        '-o',
        out,
        '--max-filesize',
        '50M',
        pageUrl
      ],
      { timeout: 180000 }
    );
    const files = fs.readdirSync(dir).filter(function (f) {
      return /\.(mp4|mkv|webm|mov)$/i.test(f);
    });
    if (!files.length) throw new Error('yt-dlp sem ficheiro');
    const buf = fs.readFileSync(path.join(dir, files[0]));
    return buf;
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (_) {}
  }
}

async function downloadTikTok(pageUrl) {
  // 1) yt-dlp
  try {
    return await downloadWithYtDlp(pageUrl);
  } catch (e) {
    console.error('[tk] yt-dlp', e.message);
  }
  // 2) tikwm
  try {
    const api =
      'https://www.tikwm.com/api/?url=' + encodeURIComponent(pageUrl) + '&hd=1';
    const data = await httpGetJson(api);
    const play =
      (data && data.data && (data.data.hdplay || data.data.play || data.data.wmplay)) ||
      null;
    if (!play) throw new Error('tikwm sem url');
    return await httpGetBuffer(play);
  } catch (e) {
    console.error('[tk] tikwm', e.message);
    throw e;
  }
}

async function downloadInstagram(pageUrl) {
  try {
    return await downloadWithYtDlp(pageUrl);
  } catch (e) {
    console.error('[ig] yt-dlp', e.message);
    throw e;
  }
}

async function sendVideo(ctx, buffer, caption) {
  if (!buffer || buffer.length < 1000) throw new Error('video vazio');
  // limite pratico WhatsApp \~16-64MB; cortamos aviso aos 48MB
  if (buffer.length > 48 * 1024 * 1024) {
    return ctx.reply('❌ Vídeo demasiado grande para o WhatsApp (' +
      Math.round(buffer.length / 1024 / 1024) + ' MB).');
  }
  await ctx.sock.sendMessage(
    ctx.jid,
    {
      video: buffer,
      caption: caption || '',
      mimetype: 'video/mp4'
    },
    { quoted: ctx.msg }
  );
}

function getText(ctx) {
  return (
    (ctx.text || '') +
    ' ' +
    ((ctx.args && ctx.args.join(' ')) || '')
  );
}

module.exports = [
  {
    name: 'tk',
    aliases: ['tiktok', 'ttdl', 'tiktokdl'],
    category: 'utilidades',
    description: 'Baixa vídeo do TikTok',
    handler: withDownloadLock('tk', async (ctx) => {
      const url = extractUrl(getText(ctx));
      if (!url || !/tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com/i.test(url)) {
        return ctx.reply(
          '🎵 *TikTok*\n\nUsa:\n*tk* https://www.tiktok.com/...\n\nou cola o link depois do comando.'
        );
      }
      await ctx.reply('⏳ A baixar TikTok...');
      try {
        const buf = await downloadTikTok(url);
        await sendVideo(ctx, buf, '✅ TikTok');
      } catch (e) {
        console.error('[tk]', e.message);
        await ctx.reply(
          '❌ Não consegui baixar este TikTok.\n' +
            'Tenta outro link ou instala: `pip install -U yt-dlp`'
        );
      }
    })
  },
  {
    name: 'ig',
    aliases: ['instagram', 'igdl', 'reels'],
    category: 'utilidades',
    description: 'Baixa vídeo do Instagram',
    handler: withDownloadLock('ig', async (ctx) => {
      const url = extractUrl(getText(ctx));
      if (!url || !/instagram\.com|instagr\.am/i.test(url)) {
        return ctx.reply(
          '📸 *Instagram*\n\nUsa:\n*ig* https://www.instagram.com/reel/...\n\n(Reels / posts com vídeo)'
        );
      }
      await ctx.reply('⏳ A baixar Instagram...');
      try {
        const buf = await downloadInstagram(url);
        await sendVideo(ctx, buf, '✅ Instagram');
      } catch (e) {
        console.error('[ig]', e.message);
        await ctx.reply(
          '❌ Não consegui baixar este Instagram.\n' +
            'Contas privadas ou links expirados falham.\n' +
            'Confirma yt-dlp: `pip install -U yt-dlp`'
        );
      }
    })
  }
];
