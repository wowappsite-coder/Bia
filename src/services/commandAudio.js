const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../data/command-audio');
const FILES = path.join(ROOT, 'files');
const META = path.join(ROOT, 'meta.json');
try { fs.mkdirSync(FILES, { recursive: true }); } catch (_) {}

function loadMeta() {
  try {
    if (!fs.existsSync(META)) return {};
    return JSON.parse(fs.readFileSync(META, 'utf8') || '{}');
  } catch (_) { return {}; }
}
function saveMeta(meta) {
  fs.mkdirSync(ROOT, { recursive: true });
  fs.writeFileSync(META, JSON.stringify(meta, null, 2));
}
function normKey(s) {
  return String(s || '').toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim();
}

function get(commandName) {
  const key = normKey(commandName);
  if (!key) return null;
  const entry = loadMeta()[key];
  if (!entry || !entry.file) return null;
  const full = path.join(FILES, entry.file);
  if (!fs.existsSync(full)) return null;
  return {
    command: key,
    file: full,
    type: entry.type || 'audio',
    mimetype: entry.mimetype || 'audio/ogg; codecs=opus',
    ptt: entry.ptt !== false
  };
}

function list() {
  const meta = loadMeta();
  return Object.keys(meta).sort().map(function (k) {
    return { command: k, type: meta[k].type || 'audio', file: meta[k].file };
  });
}

function remove(commandName) {
  const key = normKey(commandName);
  const meta = loadMeta();
  if (!meta[key]) return false;
  const old = meta[key].file;
  delete meta[key];
  saveMeta(meta);
  if (old) {
    try {
      const full = path.join(FILES, old);
      if (fs.existsSync(full)) fs.unlinkSync(full);
    } catch (_) {}
  }
  return true;
}

function set(commandName, buffer, mimetype, ptt) {
  const key = normKey(commandName);
  if (!key || !buffer || !Buffer.isBuffer(buffer)) throw new Error('dados invalidos');

  let ext = '.ogg';
  const mt = String(mimetype || '').toLowerCase();
  if (mt.includes('mpeg') || mt.includes('mp3')) ext = '.mp3';
  else if (mt.includes('mp4') || mt.includes('m4a')) ext = '.m4a';
  else if (mt.includes('wav')) ext = '.wav';
  else if (mt.includes('ogg') || mt.includes('opus')) ext = '.ogg';

  const fileName = key.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') + ext;
  const full = path.join(FILES, fileName);

  const meta = loadMeta();
  if (meta[key] && meta[key].file && meta[key].file !== fileName) {
    try {
      const prev = path.join(FILES, meta[key].file);
      if (fs.existsSync(prev)) fs.unlinkSync(prev);
    } catch (_) {}
  }

  fs.writeFileSync(full, buffer);
  meta[key] = {
    file: fileName,
    type: 'audio',
    mimetype: mimetype || 'audio/ogg; codecs=opus',
    ptt: ptt !== false,
    updatedAt: new Date().toISOString()
  };
  saveMeta(meta);
  return { key: key, entry: meta[key] };
}

function resolve(commandName, args, aliases) {
  const name = normKey(commandName);
  const a = (args || []).map(function (x) { return normKey(x); }).filter(Boolean);
  const extra = (aliases || []).map(function (x) { return normKey(x); }).filter(Boolean);

  if (a.length) {
    const candidates = [name + ' ' + a.join(' '), name + a.join(''), name + ' ' + a[0]];
    for (let i = 0; i < extra.length; i++) {
      candidates.push(extra[i] + ' ' + a.join(' '));
      candidates.push(extra[i] + ' ' + a[0]);
    }
    for (let i = 0; i < candidates.length; i++) {
      const info = get(candidates[i]);
      if (info) return info;
    }
    return null;
  }

  const keys = [name].concat(extra);
  for (let i = 0; i < keys.length; i++) {
    if (!keys[i]) continue;
    const info = get(keys[i]);
    if (info) return info;
  }
  return null;
}

async function sendAudio(ctx, info) {
  const buf = fs.readFileSync(info.file);
  await ctx.sock.sendMessage(ctx.jid, {
    audio: buf,
    mimetype: info.mimetype || 'audio/ogg; codecs=opus',
    ptt: info.ptt !== false
  }, { quoted: ctx.msg });
}

module.exports = {
  get, set, remove, list, resolve, sendAudio, ROOT, FILES, normKey
};
