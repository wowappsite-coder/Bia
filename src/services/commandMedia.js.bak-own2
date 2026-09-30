
function beatrizIsErrorReply(text) {
  const raw = String(text == null ? '' : text);
  const t = raw.replace(/\uFEFF/g, '').trim();
  if (!t) return false;
  if (t.indexOf('❌') !== -1) return true;
  if (t.indexOf('⚠️') !== -1 || t.indexOf('⚠') !== -1) return true;
  if (t.indexOf('🚫') !== -1 || t.indexOf('⛔') !== -1 || t.indexOf('🔒') !== -1) return true;
  const low = t.toLowerCase();
  if (low.indexOf('precisam estar') !== -1) return true;
  if (low.indexOf('precisa estar') !== -1) return true;
  if (low.indexOf('nenhum pedido') !== -1) return true;
  if (low.indexOf('apenas o dono') !== -1) return true;
  if (low.indexOf('marque algu') !== -1) return true;
  if (low.indexOf('nao podes') !== -1 || low.indexOf('não podes') !== -1) return true;
  if (low.indexOf('expirou') !== -1 || low.indexOf('expirado') !== -1) return true;
  if (low.indexOf('falhou') !== -1 || low.indexOf('erro ao') !== -1) return true;
  if (low.indexOf('uso:') === 0) return true;
  if (low.indexOf('inválid') !== -1 || low.indexOf('invalid') !== -1) return true;
  if (low.indexOf('não está') !== -1 || low.indexOf('nao esta') !== -1) return true;
  if (low.indexOf('não estás') !== -1 || low.indexOf('nao estas') !== -1) return true;
  return false;
}

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '../../data/command-media');
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
  return { command: key, file: full, type: entry.type || 'image', mimetype: entry.mimetype || 'image/jpeg', name: entry.file };
}
function list() {
  const meta = loadMeta();
  return Object.keys(meta).sort().map(function (k) {
    return { command: k, type: meta[k].type, file: meta[k].file };
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
function set(commandName, buffer, type, mimetype) {
  const key = normKey(commandName);
  if (!key || !buffer || !Buffer.isBuffer(buffer)) throw new Error('dados invalidos');
  const ext = type === 'video' || type === 'gif' ? '.mp4' : (mimetype && mimetype.includes('png') ? '.png' : '.jpg');
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
  meta[key] = { file: fileName, type: type || 'image', mimetype: mimetype || 'image/jpeg', updatedAt: new Date().toISOString() };
  saveMeta(meta);
  return { key: key, entry: meta[key] };
}
async function sendWithCaption(ctx, info, caption, opts) {
  const buf = fs.readFileSync(info.file);
  const mentions = (opts && opts.mentions) || undefined;
  const text = caption == null ? '' : String(caption);
  if (info.type === 'video' || info.type === 'gif') {
    await ctx.sock.sendMessage(ctx.jid, {
      video: buf, caption: text, gifPlayback: info.type === 'gif',
      mimetype: info.mimetype || 'video/mp4', mentions: mentions
    }, { quoted: ctx.msg });
    return;
  }
  await ctx.sock.sendMessage(ctx.jid, {
    image: buf, caption: text, mimetype: info.mimetype || 'image/jpeg', mentions: mentions
  }, { quoted: ctx.msg });
}
async function sendOnly(ctx, info) {
  return sendWithCaption(ctx, info, '', null);
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
function wrapContext(ctx, commandName, args, aliases) {
  /* BEATRIZ_MEDIA_SKIP_ERROR v2 */
  const info = resolve(commandName, args, aliases);
  if (!info) return { used: false, info: null, hadError: false };
  const state = { used: false, info: info, hadError: false };
  const originalReply = ctx.reply.bind(ctx);

  function isErrorReply(text) {
    const raw = String(text == null ? '' : text);
    const t = raw.replace(/\uFEFF/g, '').trim();
    if (!t) return false;
    // qualquer mensagem de erro/aviso tipica do bot
    if (t.indexOf('❌') !== -1) return true;
    if (t.indexOf('⚠️') !== -1 || t.indexOf('⚠') !== -1) return true;
    if (t.indexOf('🚫') !== -1 || t.indexOf('⛔') !== -1 || t.indexOf('🔒') !== -1) return true;
    const low = t.toLowerCase();
    if (low.indexOf('precisam estar') !== -1) return true;
    if (low.indexOf('precisa estar') !== -1) return true;
    if (low.indexOf('nenhum pedido') !== -1) return true;
    if (low.indexOf('apenas o dono') !== -1) return true;
    if (low.indexOf('marque algu') !== -1) return true;
    if (low.indexOf('nao podes') !== -1 || low.indexOf('não podes') !== -1) return true;
    if (low.indexOf('não estás') !== -1 || low.indexOf('nao estas') !== -1) return true;
    if (low.indexOf('não está') !== -1 || low.indexOf('nao esta') !== -1) return true;
    if (low.indexOf('expirou') !== -1 || low.indexOf('expirado') !== -1) return true;
    if (low.indexOf('uso:') === 0 || low.indexOf('uso :') === 0) return true;
    if (low.indexOf('inválid') !== -1 || low.indexOf('invalid') !== -1) return true;
    if (low.indexOf('falhou') !== -1 || low.indexOf('erro ao') !== -1) return true;
    if (low.indexOf('solteiro') !== -1 && low.indexOf('neste grupo') !== -1) return true;
    return false;
  }

  ctx.reply = async function (text, opts) {
    try {
      if (!state.used) {
        if (isErrorReply(text)) {
          state.hadError = true;
          return await originalReply(text, opts);
        }
        state.used = true;
        try {
          await sendWithCaption(ctx, info, text, opts || {});
          return;
        } catch (e) {
          console.error('[commandMedia] fallback text:', e.message);
          return await originalReply(text, opts);
        }
      }
      return await originalReply(text, opts);
    } catch (e) {
      console.error('[commandMedia] reply wrap', e.message);
      return originalReply(text, opts);
    }
  };
  return state;
}

module.exports = { get, set, remove, list, resolve, sendWithCaption, sendOnly, wrapContext, ROOT, FILES, normKey };
