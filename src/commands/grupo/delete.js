function unwrap(m) {
  m = m || {};
  for (let i = 0; i < 5; i++) {
    if (m.ephemeralMessage && m.ephemeralMessage.message) m = m.ephemeralMessage.message;
    else if (m.viewOnceMessage && m.viewOnceMessage.message) m = m.viewOnceMessage.message;
    else if (m.viewOnceMessageV2 && m.viewOnceMessageV2.message) m = m.viewOnceMessageV2.message;
    else break;
  }
  return m;
}

function getQuotedMeta(msg) {
  const m = unwrap((msg && msg.message) || {});
  const ci =
    (m.extendedTextMessage && m.extendedTextMessage.contextInfo) ||
    (m.imageMessage && m.imageMessage.contextInfo) ||
    (m.videoMessage && m.videoMessage.contextInfo) ||
    (m.stickerMessage && m.stickerMessage.contextInfo) ||
    (m.documentMessage && m.documentMessage.contextInfo) ||
    (m.audioMessage && m.audioMessage.contextInfo) ||
    null;
  if (ci && ci.stanzaId) return { id: ci.stanzaId, participant: ci.participant || null };
  try {
    const raw = JSON.stringify(msg.message || {});
    const id = raw.match(/"stanzaId":"([^"]+)"/);
    const p = raw.match(/"participant":"([^"]+)"/);
    if (id) return { id: id[1], participant: p ? p[1] : null };
  } catch (_) {}
  return null;
}

async function doDelete(ctx) {
  const meta = getQuotedMeta(ctx.msg);
  if (!meta || !meta.id) {
    return ctx.reply('Responde a uma mensagem com *d* ou *delmsg*');
  }
  const jid = ctx.jid;
  let botId = '';
  try { botId = String(ctx.sock.user.id || ''); } catch (_) {}
  const keys = [
    { remoteJid: jid, fromMe: true, id: meta.id },
    { remoteJid: jid, fromMe: true, id: meta.id, participant: botId },
    { remoteJid: jid, fromMe: true, id: meta.id, participant: meta.participant },
    { remoteJid: jid, fromMe: false, id: meta.id, participant: meta.participant },
    { remoteJid: jid, fromMe: false, id: meta.id }
  ];
  for (const key of keys) {
    const clean = {};
    for (const k of Object.keys(key)) {
      if (key[k] != null && key[k] !== '') clean[k] = key[k];
    }
    try { await ctx.sock.sendMessage(jid, { delete: clean }); } catch (_) {}
  }
  try {
    if (ctx.msg && ctx.msg.key) {
      await ctx.sock.sendMessage(jid, { delete: ctx.msg.key });
    }
  } catch (_) {}
}

module.exports = [
  {
    name: 'delmsg',
    aliases: ['delete', 'del', 'apagar'],
    category: 'grupo',
    description: 'Apaga mensagem respondida',
    groupOnly: false,
    handler: doDelete
  }
];
