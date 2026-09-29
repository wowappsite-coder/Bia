const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

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
      timeout: timeoutMs || 120000,
      maxBuffer: 40 * 1024 * 1024,
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

function extractUrl(text) {
  const m = String(text || '').match(/https?:\/\/[^\s<>"']+/i);
  return m ? m[0].replace(/[)\].,;]+$/, '') : null;
}

function safeName(s) {
  return String(s || 'video').replace(/[\/\\?%*:|"<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 70) || 'video';
}

function fmtSize(bytes) {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  return Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

async function downloadFromUrl(url, outDir, stamp) {
  const bin = findYtDlp();
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outTpl = path.join(outDir, 'md_' + stamp + '.%(ext)s');

  let info = null;
  try {
    const raw = await run(bin, [
      url, '--dump-json', '--no-playlist', '--no-warnings',
      '--skip-download', '--no-check-certificates'
    ], 60000);
    const line = raw.split('\n').find((l) => l.trim().startsWith('{')) || raw;
    info = JSON.parse(line);
  } catch (_) {
    throw new Error('Nao foi possivel ler este link (privado, expirado ou site nao suportado).');
  }

  const title = info.title || info.fulltitle || 'media';

  try {
    await run(bin, [
      url, '-f', 'bv*+ba/b', '--merge-output-format', 'mp4',
      '--no-playlist', '--no-warnings', '--no-check-certificates',
      '-o', outTpl
    ], 180000);
  } catch (_) {
    await run(bin, [
      url, '-f', 'best',
      '--no-playlist', '--no-warnings', '--no-check-certificates',
      '-o', outTpl
    ], 180000);
  }

  const files = fs.readdirSync(outDir)
    .filter((f) => f.startsWith('md_' + stamp))
    .map((f) => path.join(outDir, f));
  if (!files.length) throw new Error('Ficheiro nao encontrado apos download.');

  const mediaPath = files.find((f) => /\.(mp4|webm|mkv)$/i.test(f))
    || files.find((f) => /\.(mp3|m4a|opus)$/i.test(f))
    || files[0];

  const size = fs.statSync(mediaPath).size;
  if (size < 1000) throw new Error('Ficheiro invalido.');
  if (size > 50 * 1024 * 1024) throw new Error('Ficheiro grande demais (' + fmtSize(size) + '). Limite 50MB.');

  return { mediaPath, title, size, files };
}

function createDlCommand(name, label, aliases) {
  return {
    name,
    aliases: aliases || [],
    category: 'utilidades',
    description: 'Download ' + label + ' (link)',
    async handler(ctx) {
      const raw = (ctx.args || []).join(' ').trim();
      let url = extractUrl(raw);

      // tenta mensagem citada
      if (!url && ctx.msg && ctx.msg.message && ctx.msg.message.extendedTextMessage) {
        const q = ctx.msg.message.extendedTextMessage.contextInfo;
        const qm = q && q.quotedMessage;
        if (qm) {
          const qt = qm.conversation
            || (qm.extendedTextMessage && qm.extendedTextMessage.text)
            || '';
          url = extractUrl(qt);
        }
      }

      if (!url) {
        return ctx.reply(
          '📥 *' + label + '*\n\n' +
          'Uso:\n*' + (ctx.prefix || '!') + name + ' link_do_video*\n\n' +
          'Exemplo:\n*' + (ctx.prefix || '!') + name + ' https://...*'
        );
      }

      const chatJid = getJid(ctx);
      if (!chatJid || !ctx.sock) return ctx.reply('❌ Chat/socket invalido.');

      const outDir = path.join(process.cwd(), 'tmp', 'moredl');
      const stamp = Date.now();
      let cleanup = [];

      try {
        try {
          if (ctx.msg && ctx.msg.key) {
            await ctx.sock.sendMessage(chatJid, { react: { text: '⬇️', key: ctx.msg.key } });
          }
        } catch (_) {}

        const r = await downloadFromUrl(url, outDir, stamp);
        cleanup = r.files || [r.mediaPath];

        const isAudio = /\.(mp3|m4a|opus|ogg)$/i.test(r.mediaPath);
        const fileName = safeName(r.title) + (isAudio ? '.mp3' : '.mp4');

        const caption =
          '╭──〔 📥 ' + label.toUpperCase() + ' 〕──╮\n' +
          '│  🎬 *' + String(r.title).slice(0, 80) + '*\n' +
          '│  📦 ' + fmtSize(r.size) + '\n' +
          '╰──〔 𝐁𝐄𝐀𝐓𝐑𝐈𝐙 𝐁𝐎𝐓 〕──╯';

        await ctx.sock.sendMessage(chatJid, { text: caption });

        if (isAudio) {
          try {
            await ctx.sock.sendMessage(chatJid, {
              audio: { url: r.mediaPath },
              mimetype: 'audio/mpeg',
              fileName,
              ptt: false
            });
          } catch (_) {
            await ctx.sock.sendMessage(chatJid, {
              document: { url: r.mediaPath },
              mimetype: 'audio/mpeg',
              fileName
            });
          }
        } else {
          try {
            await ctx.sock.sendMessage(chatJid, {
              video: { url: r.mediaPath },
              mimetype: 'video/mp4',
              fileName,
              caption: String(r.title).slice(0, 100)
            });
          } catch (_) {
            await ctx.sock.sendMessage(chatJid, {
              document: { url: r.mediaPath },
              mimetype: 'video/mp4',
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
        const msg = (e && e.message) ? e.message : 'Erro no download.';
        try {
          await ctx.sock.sendMessage(chatJid, { text: '❌ *' + label + '*\n' + msg.slice(0, 300) });
        } catch (_) {
          try { await ctx.reply('❌ ' + msg.slice(0, 300)); } catch (_) {}
        }
      } finally {
        for (const f of cleanup) {
          try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
        }
      }
    }
  };
}

module.exports = { createDlCommand, extractUrl, getJid };
