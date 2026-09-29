const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../data/command-links');
const META = path.join(ROOT, 'links.json');
try { fs.mkdirSync(ROOT, { recursive: true }); } catch (_) {}

function load() {
  try {
    if (!fs.existsSync(META)) return {};
    return JSON.parse(fs.readFileSync(META, 'utf8') || '{}');
  } catch (_) {
    return {};
  }
}

function save(meta) {
  fs.mkdirSync(ROOT, { recursive: true });
  fs.writeFileSync(META, JSON.stringify(meta, null, 2));
}

function normKey(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

function get(commandName) {
  const key = normKey(commandName);
  if (!key) return null;
  const entry = load()[key];
  if (!entry || !entry.url) return null;
  return { command: key, url: entry.url, text: entry.text || '' };
}

function set(commandName, url, text) {
  const key = normKey(commandName);
  if (!key) throw new Error('comando invalido');
  if (!url || !/^https?:\/\//i.test(url)) throw new Error('link invalido (precisa http/https)');
  const meta = load();
  meta[key] = { url: String(url).trim(), text: String(text || '').trim(), updatedAt: Date.now() };
  save(meta);
  return meta[key];
}

function remove(commandName) {
  const key = normKey(commandName);
  const meta = load();
  if (!meta[key]) return false;
  delete meta[key];
  save(meta);
  return true;
}

function list() {
  const meta = load();
  return Object.keys(meta).sort().map(function (k) {
    return { command: k, url: meta[k].url, text: meta[k].text || '' };
  });
}

/** Envia o link associado ao comando (se existir). Nao lanca erro. */
async function sendLink(ctx, commandName, aliases) {
  try {
    const names = [commandName].concat(aliases || []);
    let info = null;
    for (const n of names) {
      info = get(n);
      if (info) break;
    }
    if (!info) return false;
    const body = (info.text ? info.text + '\n\n' : '') + info.url;
    await ctx.sock.sendMessage(ctx.jid, { text: body }, { quoted: ctx.msg });
    return true;
  } catch (e) {
    console.error('[commandLinks]', e.message || e);
    return false;
  }
}

module.exports = { get, set, remove, list, sendLink, normKey };
