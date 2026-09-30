/**
 * Imagem para Termux: Jimp + conversão WebP via cwebp/ffmpeg se existir
 */
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

let sharp = null;
let Jimp = null;
let mode = 'none';

try {
  sharp = require('sharp');
  mode = 'sharp';
} catch {
  sharp = null;
}

if (!sharp) {
  try {
    Jimp = require('jimp');
    mode = 'jimp';
  } catch {
    Jimp = null;
    mode = 'none';
  }
}

function available() {
  return mode !== 'none';
}

function engineName() {
  return mode;
}

function tmp(ext) {
  return path.join(os.tmpdir(), `beatriz_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
}

/** PNG/JPEG buffer → WebP buffer (cwebp ou ffmpeg) */
async function pngToWebp(pngBuffer) {
  const inFile = tmp('png');
  const outFile = tmp('webp');
  try {
    fs.writeFileSync(inFile, pngBuffer);
    try {
      await execFileAsync('cwebp', ['-q', '80', inFile, '-o', outFile], { timeout: 30000 });
      if (fs.existsSync(outFile) && fs.statSync(outFile).size > 50) {
        return fs.readFileSync(outFile);
      }
    } catch (_) {}
    try {
      await execFileAsync('ffmpeg', ['-y', '-i', inFile, '-vcodec', 'libwebp', outFile], { timeout: 30000 });
      if (fs.existsSync(outFile) && fs.statSync(outFile).size > 50) {
        return fs.readFileSync(outFile);
      }
    } catch (_) {}
    return null;
  } finally {
    try { fs.unlinkSync(inFile); } catch (_) {}
    try { fs.unlinkSync(outFile); } catch (_) {}
  }
}

async function webpToPng(webpBuffer) {
  const inFile = tmp('webp');
  const outFile = tmp('png');
  fs.writeFileSync(inFile, webpBuffer);
  try {
    try {
      await execFileAsync('dwebp', [inFile, '-o', outFile], { timeout: 30000 });
      if (fs.existsSync(outFile)) return fs.readFileSync(outFile);
    } catch (_) {}
    try {
      await execFileAsync('ffmpeg', ['-y', '-i', inFile, '-frames:v', '1', outFile], { timeout: 30000 });
      if (fs.existsSync(outFile)) return fs.readFileSync(outFile);
    } catch (_) {}
    return null;
  } finally {
    try { fs.unlinkSync(inFile); } catch (_) {}
    try { fs.unlinkSync(outFile); } catch (_) {}
  }
}


async function videoToAnimatedWebp(videoBuffer, maxSeconds = 9) {
  const { execFile } = require('child_process');
  const { promisify } = require('util');
  const execFileAsync = promisify(execFile);
  const path = require('path');
  const os = require('os');

  function tmp(ext) {
    return path.join(os.tmpdir(), 'btz_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) + '.' + ext);
  }
  function isAnimatedWebp(buf) {
    if (!buf || buf.length < 20) return false;
    const n = Math.min(buf.length, 2 * 1024 * 1024);
    for (let i = 0; i < n - 4; i++) {
      if (buf[i] === 0x41 && buf[i+1] === 0x4E && buf[i+2] === 0x49 && buf[i+3] === 0x4D) return true;
      if (buf[i] === 0x41 && buf[i+1] === 0x4E && buf[i+2] === 0x4D && buf[i+3] === 0x46) return true;
    }
    return false;
  }

  const inFile = tmp('mp4');
  const outFile = tmp('webp');
  fs.writeFileSync(inFile, videoBuffer);
  const sec = Math.min(Math.max(Number(maxSeconds) || 9, 1), 9);
  // mais rapido: 320px + 8fps
  const size = 320;
  const fps = 8;

  const clean = function () {
    try { fs.unlinkSync(inFile); } catch (_) {}
    try { fs.unlinkSync(outFile); } catch (_) {}
  };

  try {
    // CAMINHO RAPIDO: video -> webp direto (1 passo so)
    const t0 = Date.now();
    try {
      await execFileAsync('ffmpeg', [
        '-y', '-i', inFile,
        '-t', String(sec),
        '-vf', 'scale=' + size + ':' + size + ':force_original_aspect_ratio=disable,fps=' + fps + ',setsar=1',
        '-an',
        '-c:v', 'libwebp',
        '-lossless', '0',
        '-compression_level', '3',
        '-q:v', '45',
        '-loop', '0',
        '-preset', 'default',
        outFile
      ], { timeout: 90000, maxBuffer: 30 * 1024 * 1024 });
    } catch (e) {
      console.error('[anim] direct', e.message);
    }

    // fallback: gif intermedio so se falhar
    if (!fs.existsSync(outFile) || fs.statSync(outFile).size < 500) {
      const gifFile = tmp('gif');
      try {
        await execFileAsync('ffmpeg', [
          '-y', '-i', inFile, '-t', String(sec),
          '-vf', 'scale=' + size + ':' + size + ':force_original_aspect_ratio=disable,fps=' + fps,
          '-an', gifFile
        ], { timeout: 60000 });
        await execFileAsync('ffmpeg', [
          '-y', '-i', gifFile,
          '-c:v', 'libwebp', '-lossless', '0', '-q:v', '40',
          '-loop', '0', '-an', outFile
        ], { timeout: 60000 });
      } catch (e) {
        console.error('[anim] gif path', e.message);
      }
      try { fs.unlinkSync(gifFile); } catch (_) {}
    }

    if (fs.existsSync(outFile) && fs.statSync(outFile).size > 500) {
      const buf = fs.readFileSync(outFile);
      const anim = isAnimatedWebp(buf);
      console.log('[anim] final', buf.length, 'animated=', anim, 'ms=', Date.now() - t0);
      clean();
      if (!anim) return null;
      return buf;
    }
    clean();
    return null;
  } catch (e) {
    console.error('[anim] fatal', e.message);
    clean();
    return null;
  }
}



async function toStickerWebp(buffer) {
  // Preferir jimp no Termux (sharp costuma falhar em android-arm64)
  try {
    const J = Jimp || require('jimp');
    const img = await J.read(buffer);
    img.resize(512, 512);
    const png = await img.getBufferAsync(J.MIME_PNG);
    const webp = await pngToWebp(png);
    if (webp) return webp;
    const err = new Error('NO_WEBP');
    err.png = png;
    throw err;
  } catch (e) {
    if (e && e.message === 'NO_WEBP') throw e;
    // fallback sharp se existir
    if (mode === 'sharp' && sharp) {
      try {
        return await sharp(buffer).resize(512, 512, { fit: 'fill' }).webp({ quality: 80 }).toBuffer();
      } catch (e2) {
        console.error('[sticker sharp]', e2.message);
      }
    }
    console.error('[sticker jimp]', e.message || e);
    throw e;
  }
}

async function toPng(buffer) {
  if (!buffer || !buffer.length) throw new Error('Buffer vazio');
  if (mode === 'sharp') {
    try { return await sharp(buffer).png().toBuffer(); }
    catch (e) {
      const via = await webpToPng(buffer);
      if (via) return via;
      throw e;
    }
  }
  if (mode === 'jimp') {
    try {
      const img = await Jimp.read(buffer);
      return await img.getBufferAsync(Jimp.MIME_PNG);
    } catch (_) {
      const via = await webpToPng(buffer);
      if (via) return via;
      const head = buffer.slice(0, 8);
      if (head[0] === 0x89 && head[1] === 0x50) return buffer;
      if (head[0] === 0xff && head[1] === 0xd8) return buffer;
      throw new Error('WebP: instale pkg install libwebp ffmpeg');
    }
  }
  const via = await webpToPng(buffer);
  if (via) return via;
  throw new Error('Nenhum processador');
}

async function blur(buffer, sigma = 5) {
  if (mode === 'sharp') return sharp(buffer).blur(sigma).jpeg().toBuffer();
  if (mode === 'jimp') {
    const img = await Jimp.read(buffer);
    img.blur(Math.min(10, sigma));
    return img.getBufferAsync(Jimp.MIME_JPEG);
  }
  throw new Error('Nenhum processador');
}

async function grayscale(buffer) {
  if (mode === 'sharp') return sharp(buffer).grayscale().jpeg().toBuffer();
  if (mode === 'jimp') {
    const img = await Jimp.read(buffer);
    img.greyscale();
    return img.getBufferAsync(Jimp.MIME_JPEG);
  }
  throw new Error('Nenhum processador');
}

async function rotate(buffer, deg = 90) {
  if (mode === 'sharp') return sharp(buffer).rotate(deg).jpeg().toBuffer();
  if (mode === 'jimp') {
    const img = await Jimp.read(buffer);
    img.rotate(deg);
    return img.getBufferAsync(Jimp.MIME_JPEG);
  }
  throw new Error('Nenhum processador');
}

async function flip(buffer, horizontal = true) {
  if (mode === 'sharp') {
    const s = sharp(buffer);
    return (horizontal ? s.flop() : s.flip()).jpeg().toBuffer();
  }
  if (mode === 'jimp') {
    const img = await Jimp.read(buffer);
    img.flip(horizontal, !horizontal);
    return img.getBufferAsync(Jimp.MIME_JPEG);
  }
  throw new Error('Nenhum processador');
}

async function invert(buffer) {
  if (mode === 'sharp') return sharp(buffer).negate().jpeg().toBuffer();
  if (mode === 'jimp') {
    const img = await Jimp.read(buffer);
    img.invert();
    return img.getBufferAsync(Jimp.MIME_JPEG);
  }
  throw new Error('Nenhum processador');
}

async function resize(buffer, w, h) {
  if (mode === 'sharp') return sharp(buffer).resize(w, h, { fit: 'inside' }).jpeg().toBuffer();
  if (mode === 'jimp') {
    const img = await Jimp.read(buffer);
    img.contain(w, h);
    return img.getBufferAsync(Jimp.MIME_JPEG);
  }
  throw new Error('Nenhum processador');
}


async function writeStickerExif(webpBuffer, packname, author) {
  try {
    if (!webpBuffer || webpBuffer.length < 100) return webpBuffer;
    const { Image } = require('node-webpmux');
    const img = new Image();
    await img.load(webpBuffer);
    const json = {
      'sticker-pack-id': 'com.beatriz.bot',
      'sticker-pack-name': packname || 'BEATRIZ BOT',
      'sticker-pack-publisher': author || 'Ebai +258 874288439',
      emojis: ['📌']
    };
    const jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ]);
    const len = Buffer.alloc(4);
    len.writeUInt32LE(jsonBuf.length, 0);
    img.exif = Buffer.concat([exifAttr, len, jsonBuf]);
    const out = await img.save(null);
    return (out && out.length > 100) ? out : webpBuffer;
  } catch (e) {
    console.error('[exif]', e.message || e);
    return webpBuffer;
  }
}

module.exports = {
  available,
  engineName,
  toStickerWebp,
  writeStickerExif,
  videoToAnimatedWebp,
  toPng,
  blur,
  grayscale,
  rotate,
  flip,
  invert,
  resize,
  pngToWebp
};
