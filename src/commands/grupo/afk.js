const db = require('../../database');
const { tag } = require('../../utils/mention');
const recentNotify = new Map();

function setAfk(g, u, reason) {
  db.getDb().prepare(
    "INSERT INTO group_afk (group_jid,user_jid,reason,since) VALUES (?,?,?,datetime('now')) ON CONFLICT(group_jid,user_jid) DO UPDATE SET reason=excluded.reason, since=datetime('now')"
  ).run(g, u, reason || 'AFK');
}
function clearAfk(g, u) {
  const row = db.getDb().prepare('SELECT reason, since FROM group_afk WHERE group_jid=? AND user_jid=?').get(g, u);
  if (!row) return null;
  db.getDb().prepare('DELETE FROM group_afk WHERE group_jid=? AND user_jid=?').run(g, u);
  return row;
}
function getAfk(g, u) {
  return db.getDb().prepare('SELECT reason, since FROM group_afk WHERE group_jid=? AND user_jid=?').get(g, u);
}
function formatDuration(sinceStr) {
  try {
    let ms = Date.now() - new Date(sinceStr.replace(' ', 'T')).getTime();
    if (isNaN(ms) || ms < 0) ms = 0;
    const sec = Math.floor(ms / 1000);
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const parts = [];
    if (days) parts.push(days + (days === 1 ? ' dia' : ' dias'));
    if (hours) parts.push(hours + (hours === 1 ? ' hora' : ' horas'));
    if (mins || !parts.length) parts.push(mins + (mins === 1 ? ' minuto' : ' minutos'));
    return parts.join(' e ');
  } catch (_) { return 'algum tempo'; }
}
function extractMentionedJids(msg) {
  const m = msg.message || {};
  const ci = (m.extendedTextMessage && m.extendedTextMessage.contextInfo) ||
    (m.imageMessage && m.imageMessage.contextInfo) ||
    (m.videoMessage && m.videoMessage.contextInfo) || null;
  return ((ci && ci.mentionedJid) || []).filter(Boolean);
}
async function onMessage(sock, msg, sender, groupJid) {
  if (!groupJid || !String(groupJid).endsWith('@g.us')) return;
  const was = clearAfk(groupJid, sender);
  if (was) {
    try {
      await sock.sendMessage(groupJid, {
        text: '✅ ' + tag(sender) + ' voltou! Ficou AFK por *' + formatDuration(was.since) + '*.',
        mentions: [sender]
      }, { quoted: msg });
    } catch (_) {}
  }
  for (const jid of extractMentionedJids(msg)) {
    if (jid === sender) continue;
    const afk = getAfk(groupJid, jid);
    if (!afk) continue;
    const key = groupJid + '|' + jid + '|' + sender;
    const now = Date.now();
    if (now - (recentNotify.get(key) || 0) < 60000) continue;
    recentNotify.set(key, now);
    try {
      await sock.sendMessage(groupJid, {
        text: '😴 ' + tag(jid) + ' esta *AFK*\nMotivo: ' + (afk.reason || 'AFK') + '\nHa *' + formatDuration(afk.since) + '*.',
        mentions: [jid]
      }, { quoted: msg });
    } catch (_) {}
  }
}
module.exports = [{
  name: 'afk', aliases: ['away'], category: 'grupo', groupOnly: true,
  description: 'Marca AFK',
  handler: async (ctx) => {
    const reason = (ctx.text || '').trim() || 'AFK';
    setAfk(ctx.jid, ctx.sender, reason.slice(0, 120));
    await ctx.reply('😴 ' + tag(ctx.sender) + ' esta *AFK*\nMotivo: ' + reason.slice(0, 120), { mentions: [ctx.sender] });
  }
}];
module.exports.onMessage = onMessage;
