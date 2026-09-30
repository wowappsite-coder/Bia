const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const execFileAsync = promisify(execFile);
const { withDownloadLock } = require('../../services/downloadQueue');

function pickUrl(text) {
  if (!text) return '';
  const m = String(text).match(/https?:\/\/[^\s]+/i);
  return m ? m[0].replace(/[)>.,;]+$/, '') : '';
}

async function downloadMedia(url, preferVideo) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdl-'));
  const out = path.join(dir, 'out.%(ext)s');
  const args = [
    '--no-playlist',
    '--no-warnings',
    '--js-runtimes', 'node',
    '-f', preferVideo
      ? 'best[height<=720][ext=mp4]/best[ext=mp4]/best'
      : 'best',
    '-o', out,
    '--max-filesize', '50M',
    '--geo-bypass',
    url
  ];
  try {
    await execFileAsync('yt-dlp', args, { timeout: 180000, maxBuffer: 20 * 1024 * 1024 });
  } catch (e) {
    const err = (e.stderr || e.message || '').toString();
    const ex = new Error(err.slice(0, 250) || 'download falhou');
    ex.dir = dir;
    throw ex;
  }
  const files = fs.readdirSync(dir)
    .map(function (f) { return path.join(dir, f); })
    .filter(function (f) { return fs.statSync(f).isFile(); });
  if (!files.length) {
    const ex = new Error('Ficheiro vazio');
    ex.dir = dir;
    throw ex;
  }
  // preferir video/mp4 se houver varios
  files.sort(function (a, b) {
    const ea = path.extname(a).toLowerCase();
    const eb = path.extname(b).toLowerCase();
    if (ea === '.mp4' && eb !== '.mp4') return -1;
    if (eb === '.mp4' && ea !== '.mp4') return 1;
    return fs.statSync(b).size - fs.statSync(a).size;
  });
  return { file: files[0], dir: dir };
}

async function toWaMp4(input) {
  const out = path.join(os.tmpdir(), 'wa_sdl_' + Date.now() + '.mp4');
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

function isImage(file) {
  return /\.(jpe?g|png|webp|gif)$/i.test(file);
}
function isVideo(file) {
  return /\.(mp4|mkv|webm|mov)$/i.test(file);
}

async function sendDownloaded(ctx, file, caption) {
  const buf = fs.readFileSync(file);
  if (buf.length > 50 * 1024 * 1024) {
    throw new Error('Arquivo > 50MB');
  }
  if (isImage(file)) {
    await ctx.sock.sendMessage(ctx.jid, {
      image: buf,
      caption: caption || ''
    }, { quoted: ctx.msg });
    return;
  }
  // video (reencode se preciso)
  let sendPath = file;
  if (!/\.mp4$/i.test(file)) {
    try { sendPath = await toWaMp4(file); } catch (e) {
      console.error('[sdl ffmpeg]', e.message);
    }
  } else {
    try { sendPath = await toWaMp4(file); } catch (_) {}
  }
  const vbuf = fs.readFileSync(sendPath);
  await ctx.sock.sendMessage(ctx.jid, {
    video: vbuf,
    mimetype: 'video/mp4',
    fileName: 'video.mp4',
    caption: caption || ''
  }, { quoted: ctx.msg });
  try { if (sendPath !== file) fs.unlinkSync(sendPath); } catch (_) {}
}

function makeHandler(label, title, urlHint) {
  return withDownloadLock(label, async function (ctx) {
    const raw = ((ctx.args || []).join(' ') || ctx.text || '').trim();
    const url = pickUrl(raw);
    if (!url) {
      return ctx.reply('Use: *' + label + ' <link>*\nEx: *' + label + ' ' + urlHint + '*');
    }
    try {
      await ctx.reply('⏳ A baixar (' + title + ')...');
      const got = await downloadMedia(url, true);
      await sendDownloaded(ctx, got.file, title);
      try { fs.rmSync(got.dir, { recursive: true, force: true }); } catch (_) {}
    } catch (e) {
      console.error('[' + label + ']', e);
      return ctx.reply(
        '❌ Nao consegui baixar (' + title + ').\n' +
        'Motivo: ' + String((e && e.message) || 'erro').slice(0, 180) + '\n\n' +
        'Confirma que o link e publico e tenta de novo.'
      );
    }
  });
}

module.exports = [
  {
    name: 'fb',
    aliases: ['facebook', 'fbdl'],
    category: 'utilidades',
    description: 'Download Facebook',
    handler: makeHandler('fb', '📘 Facebook', 'https://facebook.com/...')
  },
  {
    name: 'kw',
    aliases: ['kawai', 'kwai', 'kwdl'],
    category: 'utilidades',
    description: 'Download Kwai',
    handler: makeHandler('kw', '🎵 Kwai', 'https://www.kwai.com/...')
  },
  {
    name: 'pin',
    aliases: ['pinterest', 'pindl'],
    category: 'utilidades',
    description: 'Download Pinterest',
    handler: makeHandler('pin', '📌 Pinterest', 'https://pin.it/...')
  },
  ,
  {
    name: 'vk',
    aliases: ['vkclips', 'vkvideo'],
    category: 'utilidades',
    description: 'Download VK',
    handler: makeHandler('vk', 'VK', 'https://vk.com/...')
  },
  {
    name: 'twitch',
    aliases: ['twclip', 'twch'],
    category: 'utilidades',
    description: 'Download Twitch',
    handler: makeHandler('twitch', 'Twitch', 'https://twitch.tv/...')
  },
  {
    name: 'rumble',
    aliases: [],
    category: 'utilidades',
    description: 'Download Rumble',
    handler: makeHandler('rumble', 'Rumble', 'https://rumble.com/...')
  },
  {
    name: 'vimeo',
    aliases: [],
    category: 'utilidades',
    description: 'Download Vimeo',
    handler: makeHandler('vimeo', 'Vimeo', 'https://vimeo.com/...')
  },
  {
    name: 'dailymotion',
    aliases: ['dm', 'dmotion'],
    category: 'utilidades',
    description: 'Download Dailymotion',
    handler: makeHandler('dailymotion', 'Dailymotion', 'https://dailymotion.com/...')
  },
  {
    name: 'twitter',
    aliases: ['x', 'xtwitter', 'twt'],
    category: 'utilidades',
    description: 'Download X/Twitter',
    handler: makeHandler('twitter', 'X/Twitter', 'https://x.com/...')
  },
  {
    name: 'likee',
    aliases: [],
    category: 'utilidades',
    description: 'Download Likee',
    handler: makeHandler('likee', 'Likee', 'https://likee.video/...')
  },
  {
    name: 'snap',
    aliases: ['spotlight', 'snapchat'],
    category: 'utilidades',
    description: 'Download Snapchat Spotlight',
    handler: makeHandler('snap', 'Snapchat', 'https://snapchat.com/...')
  },
  {
    name: 'clapper',
    aliases: [],
    category: 'utilidades',
    description: 'Download Clapper',
    handler: makeHandler('clapper', 'Clapper', 'https://clapperapp.com/...')
  },
  {
    name: 'triller',
    aliases: [],
    category: 'utilidades',
    description: 'Download Triller',
    handler: makeHandler('triller', 'Triller', 'https://triller.co/...')
  },
  {
    name: 'lemon8',
    aliases: [],
    category: 'utilidades',
    description: 'Download Lemon8',
    handler: makeHandler('lemon8', 'Lemon8', 'https://lemon8-app.com/...')
  },
  {
    name: 'reddit',
    aliases: ['redd'],
    category: 'utilidades',
    description: 'Download Reddit',
    handler: makeHandler('reddit', 'Reddit', 'https://reddit.com/...')
  },
  {
    name: 'tumblr',
    aliases: [],
    category: 'utilidades',
    description: 'Download Tumblr',
    handler: makeHandler('tumblr', 'Tumblr', 'https://tumblr.com/...')
  },
  {
    name: 'threads',
    aliases: ['thread'],
    category: 'utilidades',
    description: 'Download Threads',
    handler: makeHandler('threads', 'Threads', 'https://threads.net/...')
  },
  {
    name: 'bilibili',
    aliases: ['bili'],
    category: 'utilidades',
    description: 'Download Bilibili',
    handler: makeHandler('bilibili', 'Bilibili', 'https://bilibili.com/...')
  },
  {
    name: 'snack',
    aliases: ['snackvideo'],
    category: 'utilidades',
    description: 'Download SnackVideo',
    handler: makeHandler('snack', 'SnackVideo', 'https://snackvideo.com/...')
  },
  {
    name: 'moj',
    aliases: [],
    category: 'utilidades',
    description: 'Download Moj',
    handler: makeHandler('moj', 'Moj', 'https://mojapp.in/...')
  },
  {
    name: 'josh',
    aliases: [],
    category: 'utilidades',
    description: 'Download Josh',
    handler: makeHandler('josh', 'Josh', 'https://joshapp.com/...')
  },
  {
    name: 'chingari',
    aliases: [],
    category: 'utilidades',
    description: 'Download Chingari',
    handler: makeHandler('chingari', 'Chingari', 'https://chingari.io/...')
  },
  {
    name: 'sharechat',
    aliases: [],
    category: 'utilidades',
    description: 'Download ShareChat',
    handler: makeHandler('sharechat', 'ShareChat', 'https://sharechat.com/...')
  },
  {
    name: 'zili',
    aliases: [],
    category: 'utilidades',
    description: 'Download Zili',
    handler: makeHandler('zili', 'Zili', 'https://ziliapp.com/...')
  }

];
