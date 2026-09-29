const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const https = require('https');
const http = require('http');

const NAME_CACHE = path.join(__dirname, '../../data/pushnames.json');

function loadCache() {
  try { return JSON.parse(fs.readFileSync(NAME_CACHE, 'utf8')); } catch (_) { return {}; }
}
function saveCache(obj) {
  try {
    fs.mkdirSync(path.dirname(NAME_CACHE), { recursive: true });
    fs.writeFileSync(NAME_CACHE, JSON.stringify(obj));
  } catch (_) {}
}
function rememberName(jid, name) {
  if (!jid || !name) return;
  const n = String(name).trim();
  if (!n || /^\d{5,}$/.test(n)) return;
  const c = loadCache();
  c[String(jid)] = n.slice(0, 18);
  c[String(jid).split('@')[0]] = n.slice(0, 18);
  saveCache(c);
}

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error('no url'));
    const lib = String(url).startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 12000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return downloadBuffer(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('http ' + res.statusCode)); }
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function collectJids(userJid, meta) {
  const out = [];
  const id = String(userJid || '');
  if (id) out.push(id);
  const short = id.split('@')[0].split(':')[0];
  try {
    if (meta && meta.participants) {
      for (const p of meta.participants) {
        const pid = String(p.id || '');
        const ok = pid === id || pid.split('@')[0] === short ||
          (p.jid && String(p.jid).split('@')[0] === short);
        if (!ok) continue;
        if (p.id) out.push(String(p.id));
        if (p.jid) out.push(String(p.jid));
        if (p.phoneNumber) {
          const pn = String(p.phoneNumber).replace(/\D/g, '');
          if (pn) out.push(pn + '@s.whatsapp.net');
        }
      }
    }
  } catch (_) {}
  if (/^\d+$/.test(short) && short.length >= 8) out.push(short + '@s.whatsapp.net');
  return [...new Set(out)];
}

async function fetchPic(sock, jids) {
  for (const j of jids) {
    try {
      const url = await sock.profilePictureUrl(j, 'image');
      if (!url) continue;
      const buf = await downloadBuffer(url);
      if (buf && buf.length > 200) {
        console.log('[welcome] foto OK', j);
        return buf;
      }
    } catch (_) {}
  }
  console.log('[welcome] foto indisponivel');
  return null;
}

function cleanName(n) {
  n = String(n || '').trim();
  if (!n) return null;
  if (/^\d{5,}$/.test(n.replace(/\s/g, ''))) return null;
  if (/^(membro|novo\s*membro)$/i.test(n)) return null;
  return n.slice(0, 18);
}

async function resolveName(sock, userJid, meta, jids) {
  const cache = loadCache();
  for (const j of jids) {
    const c = cleanName(cache[j]) || cleanName(cache[String(j).split('@')[0]]);
    if (c) return c;
  }
  try {
    if (meta && meta.participants) {
      const id = String(userJid);
      const short = id.split('@')[0];
      for (const p of meta.participants) {
        const pid = String(p.id || '');
        const match = pid === id || pid.split('@')[0] === short ||
          jids.includes(pid) || (p.jid && jids.includes(String(p.jid)));
        if (!match) continue;
        const cand = cleanName(p.name) || cleanName(p.notify) ||
          cleanName(p.verifiedName) || cleanName(p.pushName);
        if (cand) { rememberName(userJid, cand); return cand; }
      }
    }
  } catch (_) {}
  try {
    for (const j of jids) {
      const c = sock.contacts && sock.contacts[j];
      if (!c) continue;
      const cand = cleanName(c.name) || cleanName(c.notify);
      if (cand) { rememberName(userJid, cand); return cand; }
    }
  } catch (_) {}
  for (const j of jids) {
    if (String(j).includes('@lid')) continue;
    try {
      const r = await sock.onWhatsApp(j);
      if (r && r[0]) {
        const cand = cleanName(r[0].notify) || cleanName(r[0].name);
        if (cand) { rememberName(userJid, cand); return cand; }
      }
    } catch (_) {}
  }
  return 'Membro';
}

async function generateBanner({ name, avatarBuf, groupName }) {
  const W = 900;
  const H = 320;
  const n = String(name || 'Membro').slice(0, 18);

  // fundo verde simples
  const img = new Jimp(W, H, 0x0D4F3CFF);

  // foto (quadrada, como antes)
  const SIZE = 160;
  let av = null;
  if (avatarBuf && avatarBuf.length > 200) {
    try {
      av = await Jimp.read(avatarBuf);
      av.cover(SIZE, SIZE);
    } catch (_) { av = null; }
  }
  if (!av) {
    av = new Jimp(SIZE, SIZE, 0x1B5E20FF);
    try {
      const font = await Jimp.loadFont(Jimp.FONT_SANS_128_WHITE);
      const letter = n.charAt(0).toUpperCase();
      av.print(font, 0, 20, { text: letter, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, SIZE, 140);
    } catch (_) {}
  }
  img.composite(av, 40, 80);

  // textos
  try {
    const f16 = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
    const f32 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    img.print(f16, 230, 70, 'BEM-VINDO AO GRUPO');
    img.print(f32, 230, 120, n);
    img.print(f16, 230, 180, String(groupName || 'grupo').slice(0, 28));
    img.print(f16, 230, 240, 'Beatriz-bot');
  } catch (e) {
    console.error('[welcome] font', e.message);
  }

  const buf = await img.quality(88).getBufferAsync(Jimp.MIME_JPEG);
  console.log('[welcome] ok', buf.length, n);
  return buf;
}

async function buildWelcomeMedia(sock, groupJid, userJid) {
  console.log('[welcome] build', userJid);
  await new Promise((r) => setTimeout(r, 800));
  let meta = null;
  try { meta = await sock.groupMetadata(groupJid); } catch (_) {}
  const groupName = (meta && meta.subject) || 'grupo';
  const jids = collectJids(userJid, meta);
  const name = await resolveName(sock, userJid, meta, jids);
  const pic = await fetchPic(sock, jids);
  const buffer = await generateBanner({ name, avatarBuf: pic, groupName });
  return buffer ? { buffer, name, groupName } : null;
}

module.exports = { buildWelcomeMedia, generateBanner, rememberName };
