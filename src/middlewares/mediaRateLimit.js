/**
 * Rate limit GLOBAL por utilizador para comandos de midia/download/sticker.
 * Janela movel 5 minutos. Owner = sem limite. ADM grupo/bot = 6. User = 3.
 */
const WINDOW_MS = 5 * 60 * 1000;
const LIMIT_USER = 3;
const LIMIT_ADMIN = 6;
const BYPASS_OWNER = true;

/** timestamps por userId */
const usage = new Map();

/** categorias consideradas pesadas */
const HEAVY_CATEGORIES = {
  download: 1,
  stickers: 1,
  imagem: 1
};

/** nomes principais + aliases tipicos (mesmo que a categoria nao bata) */
const HEAVY_NAMES = {
  // stickers / imagem
  s: 1, sticker: 1, figurinha: 1, fig: 1, figu: 1, st: 1,
  toimg: 1, togif: 1, gif: 1, qc: 1, pack: 1,
  stb: 1, stv: 1, stazul: 1, stpink: 1, sty: 1, stg: 1,
  // youtube / audio
  yt: 1, ytd: 1, yta: 1, ytplay: 1, ytplay2: 1, play: 1, spotify: 1,
  // redes
  tk: 1, tiktok: 1, ig: 1, instagram: 1, fb: 1, facebook: 1,
  kw: 1, kawai: 1, pin: 1, pint: 1, pinterest: 1,
  vk: 1, twitter: 1, x: 1, twitch: 1, reddit: 1,
  vimeo: 1, rumble: 1, dailymotion: 1, bilibili: 1,
  // ficheiros
  multidl: 1, mediafire: 1, gdrive: 1, capcut: 1, fdroid: 1,
  gerarlink: 1, vta: 1, videotoaudio: 1,
  // anime / filme
  anime: 1, dwdanimeep: 1, filme: 1, serie: 1, fs: 1, dwfilme: 1,
  a1: 1, a2: 1, a3: 1, a4: 1, f1: 1, f2: 1, f3: 1, f4: 1,
  n1: 1, n2: 1, n3: 1, n4: 1, n5: 1, n6: 1, n7: 1, n8: 1,
  maiseps: 1, dub: 1, leg: 1, d1: 1, l2: 1,
  // audio tts pesado
  crad: 1, criaraudio: 1, tts: 1
};

function normalizeId(jid) {
  return String(jid || '').replace(/@.*/, '').replace(/\D/g, '') || String(jid || '');
}

function cleanList(list, now) {
  const out = [];
  for (let i = 0; i < list.length; i++) {
    if (now - list[i] < WINDOW_MS) out.push(list[i]);
  }
  return out;
}

function isHeavyCommand(cmd, parsedName) {
  if (!cmd) return false;
  const cat = String(cmd.category || '').toLowerCase();
  if (HEAVY_CATEGORIES[cat]) return true;
  const name = String(cmd.name || '').toLowerCase();
  if (HEAVY_NAMES[name]) return true;
  const p = String(parsedName || '').toLowerCase();
  if (HEAVY_NAMES[p]) return true;
  const aliases = cmd.aliases || [];
  for (let i = 0; i < aliases.length; i++) {
    if (HEAVY_NAMES[String(aliases[i]).toLowerCase()]) return true;
  }
  return false;
}

function getLimit(role) {
  if (role === 'owner') return Infinity;
  if (role === 'admin') return LIMIT_ADMIN;
  return LIMIT_USER;
}

/**
 * Verifica e, se permitido, consome 1 slot.
 * @returns {{ ok: true } | { ok: false, msg: string }}
 */
function checkAndConsume(userKey, role) {
  // SEM LIMITE DE MIDIA/DOWNLOAD/STICKER.
  return {
    ok: true,
    bypass: true,
    unlimited: true,
    used: 0,
    limit: Infinity
  };
}

/** so consulta sem consumir */
function peek(userKey, role) {
  if (BYPASS_OWNER && role === 'owner') return { used: 0, limit: Infinity };
  const now = Date.now();
  const key = normalizeId(userKey);
  const list = cleanList(usage.get(key) || [], now);
  usage.set(key, list);
  return { used: list.length, limit: getLimit(role) };
}

module.exports = {
  isHeavyCommand,
  checkAndConsume,
  peek,
  WINDOW_MS,
  LIMIT_USER,
  LIMIT_ADMIN,
  BYPASS_OWNER
};
