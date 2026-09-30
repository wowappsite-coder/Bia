/**
 * gif — figurinha animada -> GIF no chat
 * Conversao: libwebp (anim_dump/webpmux) + ffmpeg
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile, execFileSync } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

function which(bin) {
  try {
    return execFileSync('which', [bin]).toString().trim();
  } catch (_) {
    const p = '/data/data/com.termux/files/usr/bin/' + bin;
    if (fs.existsSync(p)) return p;
    return null;
  }
}

const FFMPEG = which('ffmpeg') || 'ffmpeg';
const ANIM_DUMP = which('anim_dump');
const WEBPMUX = which('webpmux');
const DWEBP = which('dwebp');

console.log('[gif] ffmpeg=', FFMPEG, 'anim_dump=', ANIM_DUMP, 'webpmux=', WEBPMUX);

let downloadMediaMessage = null;
let downloadContentFromMessage = null;
try {
  const b = require('@whiskeysockets/baileys');
  downloadMediaMessage = b.downloadMediaMessage;
  downloadContentFromMessage = b.downloadContentFromMessage;
} catch (_) {
  try {
    const b = require('@adiwajshing/baileys');
    downloadMediaMessage = b.downloadMediaMessage;
    downloadContentFromMessage = b.downloadContentFromMessage;
  } catch (_2) {}
}

let msgCache = null;
try {
  msgCache = require('../../utils/msgCache');
} catch (_) {}

const silentLogger = {
  level: 'silent',
  trace() {},
  debug() {},
  info() {},
  warn() {},
  error() {},
  fatal() {},
  child() {
    return this;
  }
};

function unwrap(msg) {
  if (!msg) return msg;
  if (msg.ephemeralMessage && msg.ephemeralMessage.message) {
    return unwrap(msg.ephemeralMessage.message);
  }
  if (msg.viewOnceMessage && msg.viewOnceMessage.message) {
    return unwrap(msg.viewOnceMessage.message);
  }
  if (msg.viewOnceMessageV2 && msg.viewOnceMessageV2.message) {
    return unwrap(msg.viewOnceMessageV2.message);
  }
  return msg;
}

function resolveSticker(ctx) {
  const msg = ctx.msg;
  if (!msg) return null;
  const m = unwrap(msg.message || {});

  try {
    if (msgCache && msgCache.getQuotedFull) {
      const full = msgCache.getQuotedFull(msg);
      if (full && full.message) {
        const inner = unwrap(full.message);
        if (inner.stickerMessage) {
          return { targetMsg: full, mediaNode: inner.stickerMessage };
        }
      }
    }
  } catch (_) {}

  const ci =
    (m.extendedTextMessage && m.extendedTextMessage.contextInfo) ||
    (m.imageMessage && m.imageMessage.contextInfo) ||
    (m.videoMessage && m.videoMessage.contextInfo) ||
    null;

  const quoted = ci && ci.quotedMessage ? unwrap(ci.quotedMessage) : null;
  if (quoted && quoted.stickerMessage) {
    return {
      targetMsg: {
        key: {
          remoteJid: msg.key.remoteJid,
          id: ci.stanzaId,
          participant: ci.participant,
          fromMe: false
        },
        message: quoted
      },
      mediaNode: quoted.stickerMessage
    };
  }
  if (m.stickerMessage) {
    return { targetMsg: msg, mediaNode: m.stickerMessage };
  }
  return null;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

async function getBuffer(ctx, info) {
  const sock = ctx.sock;
  if (downloadMediaMessage && info.targetMsg) {
    try {
      const buf = await downloadMediaMessage(
        info.targetMsg,
        'buffer',
        {},
        {
          logger: silentLogger,
          reuploadRequest: sock.updateMediaMessage
            ? sock.updateMediaMessage.bind(sock)
            : undefined
        }
      );
      if (buf && buf.length > 50) {
        return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
      }
    } catch (e) {
      console.error('[gif] dmm', e.message);
    }
  }
  if (downloadContentFromMessage && info.mediaNode) {
    try {
      const stream = await downloadContentFromMessage(info.mediaNode, 'sticker');
      const buf = await streamToBuffer(stream);
      if (buf && buf.length > 50) return buf;
    } catch (e) {
      console.error('[gif] content', e.message);
    }
  }
  return null;
}

function rmrf(dir) {
  try {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      try {
        fs.unlinkSync(p);
      } catch (_) {
        try {
          rmrf(p);
        } catch (_2) {}
      }
    }
    fs.rmdirSync(dir);
  } catch (_) {}
}

async function convert(webpBuf) {
  const base = path.join(os.tmpdir(), 'beatriz-gif-' + Date.now());
  fs.mkdirSync(base, { recursive: true });
  const webp = path.join(base, 'in.webp');
  const mp4 = path.join(base, 'out.mp4');
  const gifOut = path.join(base, 'out.gif');
  fs.writeFileSync(webp, webpBuf);

  try {
    // --- 1) anim_dump (libwebp) extrai frames PNG ---
    if (ANIM_DUMP) {
      try {
        const frameDir = path.join(base, 'frames');
        fs.mkdirSync(frameDir, { recursive: true });
        // anim_dump escreve dump_XXXX.png no cwd
        await execFileAsync(
          ANIM_DUMP,
          ['-folder', frameDir, webp],
          { timeout: 60000 }
        );
        let frames = fs
          .readdirSync(frameDir)
          .filter((f) => /\.(png|pam|tiff)$/i.test(f))
          .sort();
        // alguns builds usam prefixo dump_
        if (!frames.length) {
          frames = fs
            .readdirSync(frameDir)
            .filter((f) => /png/i.test(f))
            .sort();
        }
        console.log('[gif] anim_dump frames', frames.length);
        if (frames.length > 0) {
          // renomear para seq %04d
          frames.forEach((f, i) => {
            const src = path.join(frameDir, f);
            const dst = path.join(frameDir, 'f' + String(i + 1).padStart(4, '0') + '.png');
            if (src !== dst) {
              try {
                fs.renameSync(src, dst);
              } catch (_) {
                fs.copyFileSync(src, dst);
              }
            }
          });
          const pattern = path.join(frameDir, 'f%04d.png');
          try {
            await execFileAsync(
              FFMPEG,
              [
                '-y',
                '-framerate',
                '15',
                '-i',
                pattern,
                '-movflags',
                'faststart',
                '-pix_fmt',
                'yuv420p',
                '-vf',
                'scale=trunc(iw/2)*2:trunc(ih/2)*2',
                '-an',
                mp4
              ],
              { timeout: 120000 }
            );
            if (fs.existsSync(mp4) && fs.statSync(mp4).size > 100) {
              console.log('[gif] mp4 from frames', fs.statSync(mp4).size);
              return { buf: fs.readFileSync(mp4), mode: 'mp4' };
            }
          } catch (e) {
            console.error('[gif] frames->mp4', e.message);
          }
          try {
            await execFileAsync(
              FFMPEG,
              ['-y', '-framerate', '15', '-i', pattern, '-loop', '0', gifOut],
              { timeout: 120000 }
            );
            if (fs.existsSync(gifOut) && fs.statSync(gifOut).size > 100) {
              return { buf: fs.readFileSync(gifOut), mode: 'gif' };
            }
          } catch (e) {
            console.error('[gif] frames->gif', e.message);
          }
        }
      } catch (e) {
        console.error('[gif] anim_dump', e.message);
      }
    }

    // --- 2) webpmux conta frames e extrai um a um ---
    if (WEBPMUX && DWEBP) {
      try {
        const info = await execFileAsync(WEBPMUX, ['-info', webp], { timeout: 15000 });
        const stdout = (info.stdout || '').toString();
        const m = stdout.match(/Number of frames:\s*(\d+)/i);
        const n = m ? parseInt(m[1], 10) : 0;
        console.log('[gif] webpmux frames', n);
        if (n > 0) {
          const frameDir = path.join(base, 'wm');
          fs.mkdirSync(frameDir, { recursive: true });
          let ok = 0;
          for (let i = 1; i <= Math.min(n, 80); i++) {
            const fw = path.join(frameDir, 't' + i + '.webp');
            const fp = path.join(frameDir, 'f' + String(i).padStart(4, '0') + '.png');
            try {
              await execFileAsync(
                WEBPMUX,
                ['-get', 'frame', String(i), webp, '-o', fw],
                { timeout: 10000 }
              );
              await execFileAsync(DWEBP, [fw, '-o', fp], { timeout: 10000 });
              if (fs.existsSync(fp)) ok++;
            } catch (_) {}
          }
          console.log('[gif] extracted pngs', ok);
          if (ok > 0) {
            const pattern = path.join(frameDir, 'f%04d.png');
            try {
              await execFileAsync(
                FFMPEG,
                [
                  '-y',
                  '-framerate',
                  '12',
                  '-i',
                  pattern,
                  '-movflags',
                  'faststart',
                  '-pix_fmt',
                  'yuv420p',
                  '-vf',
                  'scale=trunc(iw/2)*2:trunc(ih/2)*2',
                  '-an',
                  mp4
                ],
                { timeout: 120000 }
              );
              if (fs.existsSync(mp4) && fs.statSync(mp4).size > 100) {
                return { buf: fs.readFileSync(mp4), mode: 'mp4' };
              }
            } catch (e) {
              console.error('[gif] wm mp4', e.message);
            }
          }
        }
      } catch (e) {
        console.error('[gif] webpmux', e.message);
      }
    }

    // --- 3) sharp ---
    try {
      const sharp = require('sharp');
      const g = await sharp(webpBuf, { animated: true, pages: -1 }).gif().toBuffer();
      if (g && g.length > 100) {
        fs.writeFileSync(gifOut, g);
        try {
          await execFileAsync(
            FFMPEG,
            [
              '-y',
              '-i',
              gifOut,
              '-movflags',
              'faststart',
              '-pix_fmt',
              'yuv420p',
              '-vf',
              'scale=trunc(iw/2)*2:trunc(ih/2)*2',
              '-an',
              mp4
            ],
            { timeout: 120000 }
          );
          if (fs.existsSync(mp4) && fs.statSync(mp4).size > 100) {
            return { buf: fs.readFileSync(mp4), mode: 'mp4' };
          }
        } catch (_) {}
        return { buf: g, mode: 'gif' };
      }
    } catch (e) {
      console.error('[gif] sharp', e.message);
    }

    // --- 4) ffmpeg direto ---
    try {
      await execFileAsync(
        FFMPEG,
        [
          '-y',
          '-i',
          webp,
          '-movflags',
          'faststart',
          '-pix_fmt',
          'yuv420p',
          '-an',
          mp4
        ],
        { timeout: 90000 }
      );
      if (fs.existsSync(mp4) && fs.statSync(mp4).size > 100) {
        return { buf: fs.readFileSync(mp4), mode: 'mp4' };
      }
    } catch (e) {
      console.error('[gif] ff direct', e.message);
    }

    return null;
  } finally {
    rmrf(base);
  }
}

module.exports = [
  {
    name: 'gif',
    aliases: ['sticker2gif', 'webp2gif', 'togif'],
    category: 'stickers',
    description: 'Figurinha animada -> GIF',
    handler: async (ctx) => {
      const info = resolveSticker(ctx);
      if (!info || !info.mediaNode) {
        return ctx.reply('📎 Responde a uma *figurinha animada* com *gif*.');
      }
      if (info.mediaNode.isAnimated === false) {
        return ctx.reply('⚠️ So figurinhas *animadas*.');
      }

      try {
        await ctx.sock.sendMessage(ctx.jid, {
          react: { text: '⏳', key: ctx.msg.key }
        });
      } catch (_) {}

      let statusKey = null;
      try {
        const st = await ctx.reply('⏳ A converter...');
        if (st && st.key) statusKey = st.key;
      } catch (_) {}

      try {
        const buffer = await getBuffer(ctx, info);
        if (!buffer) {
          return ctx.reply(
            '❌ Nao baixou a figurinha.\nEnvia de novo e responde com *gif*.'
          );
        }

        const conv = await convert(buffer);
        if (!conv) {
          return ctx.reply(
            '❌ Conversao falhou.\n' +
              'Confirma no Termux:\n' +
              'pkg install libwebp ffmpeg\n' +
              'which anim_dump webpmux'
          );
        }

        if (conv.mode === 'mp4') {
          await ctx.sock.sendMessage(
            ctx.jid,
            {
              video: conv.buf,
              gifPlayback: true,
              mimetype: 'video/mp4'
            },
            { quoted: ctx.msg }
          );
        } else {
          try {
            await ctx.sock.sendMessage(
              ctx.jid,
              { video: conv.buf, gifPlayback: true },
              { quoted: ctx.msg }
            );
          } catch (_) {
            await ctx.sock.sendMessage(
              ctx.jid,
              { image: conv.buf, mimetype: 'image/gif' },
              { quoted: ctx.msg }
            );
          }
        }

        try {
          await ctx.sock.sendMessage(ctx.jid, {
            react: { text: '✅', key: ctx.msg.key }
          });
        } catch (_) {}
      } catch (e) {
        console.error('[gif] fatal', e);
        await ctx.reply('❌ Erro: ' + (e.message || ''));
      } finally {
        try {
          if (statusKey) {
            await ctx.sock.sendMessage(ctx.jid, { delete: statusKey });
          }
        } catch (_) {}
      }
    }
  }
];
