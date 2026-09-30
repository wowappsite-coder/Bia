/**
 * Mencoes WhatsApp corretas
 * text: @id  |  mentions: [jid real do participante]
 * O cliente mostra o NOME do contacto, nao o LID cru.
 */

function token(jid) {
  if (!jid) return 'user';
  return String(jid).split('@')[0].split(':')[0];
}

function tag(jid) {
  return '@' + token(jid);
}

function digits(s) {
  return String(s || '').replace(/\D/g, '');
}

/**
 * Devolve o JID que esta na lista de participantes do grupo
 * (obrigatorio para o WhatsApp renderizar @Nome)
 */
async function resolveInGroup(sock, groupJid, jid) {
  if (!jid) return null;
  if (!groupJid || !String(groupJid).endsWith('@g.us')) return jid;

  try {
    const meta = await sock.groupMetadata(groupJid);
    const parts = meta.participants || [];

    // 1) match exacto
    let p = parts.find(function (x) { return x.id === jid; });
    if (p) return p.id;

    // 2) match por phoneNumber / jid alternativo (Baileys novo)
    const want = digits(jid);
    for (let i = 0; i < parts.length; i++) {
      const x = parts[i];
      const idDigits = digits(x.id);
      const phone = digits(x.phoneNumber || x.jid || '');
      const alt = digits(x.participantPn || x.lid || '');

      if (want && idDigits && (idDigits === want || idDigits.slice(-9) === want.slice(-9) || want.slice(-9) === idDigits.slice(-9))) {
        return x.id;
      }
      if (want && phone && (phone.slice(-9) === want.slice(-9) || want.slice(-9) === phone.slice(-9))) {
        return x.id;
      }
      if (want && alt && (alt === want || alt.slice(-9) === want.slice(-9))) {
        return x.id;
      }
    }
  } catch (_) {}
  return jid;
}

async function resolveMany(sock, groupJid, jids) {
  const out = [];
  const seen = {};
  for (let i = 0; i < (jids || []).length; i++) {
    const r = await resolveInGroup(sock, groupJid, jids[i]);
    if (r && !seen[r]) {
      seen[r] = true;
      out.push(r);
    }
  }
  return out;
}

/**
 * { text, mentions }
 * textTemplate: use {0} {1} onde o bot coloca @id
 */
async function build(sock, groupJid, textTemplate, jids) {
  const resolved = await resolveMany(sock, groupJid, jids);
  let text = String(textTemplate);
  for (let i = 0; i < resolved.length; i++) {
    text = text.split('{' + i + '}').join(tag(resolved[i]));
  }
  return { text: text, mentions: resolved };
}

module.exports = {
  token: token,
  tag: tag,
  resolveInGroup: resolveInGroup,
  resolveMany: resolveMany,
  build: build
};
