/**
 * Cache de mensagens (media + ids recentes para limpar)
 */
const cache = new Map();
const recent = new Map(); // jid -> [{key, ts}]
const MAX = 500;
const MAX_RECENT = 150;

function cacheKey(jid, id) {
  return String(jid || '') + '|' + String(id || '');
}

function saveMessage(msg) {
  try {
    if (!msg || !msg.key || !msg.message) return;
    const id = msg.key.id;
    const jid = msg.key.remoteJid;
    if (!id || !jid) return;

    // lista recente para limpar
    let arr = recent.get(jid);
    if (!arr) { arr = []; recent.set(jid, arr); }
    arr.push({ key: { ...msg.key }, ts: Date.now() });
    if (arr.length > MAX_RECENT) arr.splice(0, arr.length - MAX_RECENT);

    const m = msg.message;
    const has =
      m.imageMessage || m.videoMessage || m.stickerMessage || m.audioMessage ||
      m.documentMessage ||
      (m.ephemeralMessage && m.ephemeralMessage.message) ||
      (m.viewOnceMessage && m.viewOnceMessage.message) ||
      (m.viewOnceMessageV2 && m.viewOnceMessageV2.message);
    if (!has) return;
    cache.set(cacheKey(jid, id), msg);
    if (cache.size > MAX) {
      const first = cache.keys().next().value;
      cache.delete(first);
    }
  } catch (_) {}
}

function getRecentKeys(jid, limit) {
  const arr = recent.get(jid) || [];
  const n = Math.min(limit || 40, arr.length);
  return arr.slice(-n).map(function (x) { return x.key; });
}

function getMessage(jid, id) {
  if (!id) return null;
  return cache.get(cacheKey(jid, id)) || null;
}

function getQuotedFull(ctxMsg) {
  try {
    const m = ctxMsg.message || {};
    const ci =
      (m.extendedTextMessage && m.extendedTextMessage.contextInfo) ||
      (m.imageMessage && m.imageMessage.contextInfo) ||
      (m.videoMessage && m.videoMessage.contextInfo) ||
      null;
    if (!ci || !ci.stanzaId) return null;
    const jid = ctxMsg.key.remoteJid;
    let full = getMessage(jid, ci.stanzaId);
    if (full) return full;
    for (const [k, v] of cache.entries()) {
      if (k.endsWith('|' + ci.stanzaId)) return v;
    }
    return null;
  } catch (_) {
    return null;
  }
}

module.exports = { saveMessage, getMessage, getQuotedFull, getRecentKeys };
