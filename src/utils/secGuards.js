/**
 * SEC Parte 4 — guards leves (marcar, reacoes, welcome)
 * Nao remove funcionalidades; so evita rajadas.
 */

const marcarLast = new Map();   // groupJid -> ts
const welcomeBurst = new Map(); // groupJid -> { count, windowStart }
const reactSkip = { n: 0 };

const MARCAR_COOLDOWN_MS = 8000;   // 8s entre marcar no mesmo grupo
const WELCOME_MAX_PER_10S = 5;     // max welcomes por grupo / 10s
const WELCOME_WINDOW_MS = 10000;

function canMarcar(groupJid) {
  const now = Date.now();
  const last = marcarLast.get(groupJid) || 0;
  if (now - last < MARCAR_COOLDOWN_MS) {
    const wait = Math.ceil((MARCAR_COOLDOWN_MS - (now - last)) / 1000);
    return { ok: false, wait: wait };
  }
  marcarLast.set(groupJid, now);
  return { ok: true, wait: 0 };
}

/** true = pode enviar welcome; false = adiar/silenciar este */
function canWelcome(groupJid) {
  const now = Date.now();
  let st = welcomeBurst.get(groupJid);
  if (!st || now - st.windowStart > WELCOME_WINDOW_MS) {
    st = { count: 0, windowStart: now };
  }
  st.count += 1;
  welcomeBurst.set(groupJid, st);
  if (st.count > WELCOME_MAX_PER_10S) {
    console.log('[SEC] welcome rate limit grupo', String(groupJid).slice(0, 18), 'count', st.count);
    return false;
  }
  return true;
}

/** Se a fila esta em rajada, pode saltar 1 em cada N reacoes automaticas */
function shouldSkipAutoReact() {
  try {
    const q = require('./sendQueue');
    const st = q.stats && q.stats();
    if (st && (st.chainLen > 4 || st.recent >= 7)) {
      reactSkip.n += 1;
      // salta \~metade em rajada extrema
      if (reactSkip.n % 2 === 0) return true;
    }
  } catch (_) {}
  return false;
}

module.exports = {
  canMarcar: canMarcar,
  canWelcome: canWelcome,
  shouldSkipAutoReact: shouldSkipAutoReact,
  MARCAR_COOLDOWN_MS: MARCAR_COOLDOWN_MS
};
