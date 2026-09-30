const welcomeBanner = require('./welcomeBanner');

function isWelcomeOn(g) {
  if (!g) return false;
  // so aceita 1 / '1' / true — nunca "vaza" de outro grupo
  const v = g.welcome;
  return v === 1 || v === '1' || v === true;
}

async function handleAdd(sock, update, g) {
  if (!update || update.action !== 'add') return;
  if (!isWelcomeOn(g)) {
    console.log('[welcome] OFF neste grupo', update.id);
    return;
  }

  const groupJid = update.id;
  for (const p of (update.participants || [])) {
    let mentionJid = p;
    try {
      const mention = require('../utils/mention');
      const resolved = await mention.resolveInGroup(sock, groupJid, p);
      if (resolved) mentionJid = resolved;
    } catch (_) {}

    const tag = '@' + String(mentionJid).split('@')[0].split(':')[0];
    const caption = 'Seja bem-vindo(a) ' + tag + ' ao grupo!';

    let sent = false;
    try {
      const media = await welcomeBanner.buildWelcomeMedia(sock, groupJid, mentionJid);
      if (media && media.buffer) {
        await sock.sendMessage(groupJid, {
          image: media.buffer,
          caption: caption,
          mentions: [mentionJid]
        });
        sent = true;
        console.log('[welcome] imagem OK', groupJid);
      }
    } catch (e) {
      console.error('[welcome]', e && e.message ? e.message : e);
    }
    if (!sent) {
      try {
        await sock.sendMessage(groupJid, {
          text: caption,
          mentions: [mentionJid]
        });
      } catch (e2) {
        console.error('[welcome text]', e2 && e2.message);
      }
    }
  }
}

module.exports = { handleAdd, isWelcomeOn };
