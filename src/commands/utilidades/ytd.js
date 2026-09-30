const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const execFileAsync = promisify(execFile);
const { withDownloadLock } = require('../../services/downloadQueue');

function cleanYtUrl(u) {
  if (!u) return '';
  u = String(u).trim();
  const m = u.match(/https?:\/\/[^\s]+/i);
  if (m) u = m[0];
  u = u.replace(/[?&](si|feature|pp|utm_[^=]+)=[^&\s]*/gi, '');
  u = u.replace(/[?&]+$/, '');
  const sh = u.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/i);
  if (sh) return 'https://www.youtube.com/watch?v=' + sh[1];
  const be = u.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/i);
  if (be) return 'https://www.youtube.com/watch?v=' + be[1];
  const v = u.match(/[?&]v=([A-Za-z0-9_-]{6,})/i);
  if (v) return 'https://www.youtube.com/watch?v=' + v[1];
  return u;
}

async function runYtDlp(url, audioOnly) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytd-'));
  const out = path.join(dir, 'out.%(ext)s');
  const args = [
    '--no-playlist',
    '--no-warnings',
    '--js-runtimes', 'node',
    '-f', audioOnly
      ? 'bestaudio[ext=m4a]/bestaudio/best'
      : 'best[height<=720][ext=mp4]/best[ext=mp4]/best',
    '-o', out,
    '--max-filesize', '50M',
    '--geo-bypass',
    url
  ];
  if (audioOnly) {
    args.splice(1, 0, '-x', '--audio-format', 'mp3');
  }
  try {
    await execFileAsync('yt-dlp', args, { timeout: 180000, maxBuffer: 20 * 1024 * 1024 });
  } catch (e) {
    const err = (e.stderr || e.message || '').toString();
    const ex = new Error(err.slice(0, 300) || 'yt-dlp falhou');
    ex.dir = dir;
    throw ex;
  }
  const files = fs.readdirSync(dir).map(function (f) { return path.join(dir, f); }).filter(function (f) {
    return fs.statSync(f).isFile();
  });
  if (!files.length) {
    const ex = new Error('Download vazio');
    ex.dir = dir;
    throw ex;
  }
  return { file: files[0], dir: dir };
}

async function toWaMp4(input) {
  const out = path.join(os.tmpdir(), 'wa_' + Date.now() + '.mp4');
  await execFileAsync('ffmpeg', [
    '-y', '-i', input,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    '-pix_fmt', 'yuv420p',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    out
  ], { timeout: 180000, maxBuffer: 10 * 1024 * 1024 });
  return out;
}

module.exports = [
  {
    name: 'ytd',
    aliases: ['ytvideo', 'ytmp4'],
    category: 'utilidades',
    description: 'Baixa video YouTube (max 50MB)',
    handler: withDownloadLock('ytd', async function (ctx) {
      const raw = ((ctx.args || []).join(' ') || ctx.text || '').trim();
      const url = cleanYtUrl(raw);
      if (!url || !/youtu/i.test(url)) {
        return ctx.reply('Use: *ytd <link do youtube>*');
      }
      try {
        await ctx.reply('🎬 A baixar video...');
        const got = await runYtDlp(url, false);
        let sendPath = got.file;
        try { sendPath = await toWaMp4(got.file); } catch (e) {
          console.error('[ytd ffmpeg]', e.message);
        }
        const buf = fs.readFileSync(sendPath);
        if (buf.length > 50 * 1024 * 1024) {
          return ctx.reply('Arquivo > 50MB. Usa video mais curto.');
        }
        await ctx.sock.sendMessage(ctx.jid, {
          video: buf,
          mimetype: 'video/mp4',
          fileName: 'video.mp4',
          caption: '🎬 YouTube'
        }, { quoted: ctx.msg });
        try { fs.rmSync(got.dir, { recursive: true, force: true }); } catch (_) {}
        try { if (sendPath !== got.file) fs.unlinkSync(sendPath); } catch (_) {}
      } catch (e) {
        console.error('[ytd]', e);
        return ctx.reply('❌ Nao consegui baixar.\nMotivo: ' + String((e && e.message) || '').slice(0, 180));
      }
    })
  },
  {
    name: 'yta',
    aliases: ['ytaudio', 'ytmp3'],
    category: 'utilidades',
    description: 'Baixa audio YouTube',
    handler: withDownloadLock('yta', async function (ctx) {
      const raw = ((ctx.args || []).join(' ') || ctx.text || '').trim();
      const url = cleanYtUrl(raw);
      if (!url || !/youtu/i.test(url)) {
        return ctx.reply('Use: *yta <link do youtube>*');
      }
      try {
        await ctx.reply('🎧 A baixar audio...');
        const got = await runYtDlp(url, true);
        const buf = fs.readFileSync(got.file);
        await ctx.sock.sendMessage(ctx.jid, {
          audio: buf,
          mimetype: 'audio/mpeg',
          fileName: 'audio.mp3'
        }, { quoted: ctx.msg });
        try { fs.rmSync(got.dir, { recursive: true, force: true }); } catch (_) {}
      } catch (e) {
        return ctx.reply('❌ Audio falhou: ' + String((e && e.message) || '').slice(0, 180));
      }
    })
  }
];
