const db = require('../../database');
const { tag, token, resolveInGroup } = require('../../utils/mention');

async function resolveTarget(ctx) {
  let target = ctx.sender;
  try {
    if (typeof ctx.getMentionedOrQuoted === 'function') {
      const t = ctx.getMentionedOrQuoted();
      if (t) target = t;
    } else if (ctx.mentioned && ctx.mentioned[0]) {
      target = ctx.mentioned[0];
    } else {
      const ci =
        (ctx.msg &&
          ctx.msg.message &&
          ctx.msg.message.extendedTextMessage &&
          ctx.msg.message.extendedTextMessage.contextInfo) ||
        null;
      if (ci && ci.mentionedJid && ci.mentionedJid[0]) target = ci.mentionedJid[0];
      else if (ci && ci.participant) target = ci.participant;
    }
  } catch (_) {}
  return target;
}

/** Nome legivel (nao so digitos) */
async function niceName(ctx, jid, u) {
  if (u && u.pushname && !/^\d{8,}$/.test(String(u.pushname).trim())) return u.pushname;
  if (u && u.name && !/^\d{8,}$/.test(String(u.name).trim())) return u.name;
  try {
    if (ctx.isGroup) {
      const meta = await ctx.sock.groupMetadata(ctx.jid);
      const parts = meta.participants || [];
      const want = String(jid).split('@')[0].replace(/\D/g, '');
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const id = String(p.id || '');
        const idN = id.split('@')[0].replace(/\D/g, '');
        if (id === jid || (want && idN && (idN === want || idN.endsWith(want.slice(-9))))) {
          if (p.name && !/^\d{8,}$/.test(p.name)) return p.name;
          if (p.notify && !/^\d{8,}$/.test(p.notify)) return p.notify;
        }
      }
    }
  } catch (_) {}
  // ultimo recurso: so mostra @menção (WhatsApp preenche o nome se mentions estiver certo)
  return null;
}

module.exports = [
  {
    name: 'perfil',
    aliases: ['meuperfil', 'verperfil'],
    category: 'xp',
    description: 'Perfil com foto e menção correta',
    handler: async (ctx) => {
      try {
        let target = await resolveTarget(ctx);
        let mentionJid = target;
        if (ctx.isGroup) {
          try {
            mentionJid = (await resolveInGroup(ctx.sock, ctx.jid, target)) || target;
          } catch (_) {}
        }

        const groupJid = ctx.isGroup ? ctx.jid : 'global';
        const u = db.getUser(target, groupJid);
        // tenta tambem pelo jid resolvido
        const u2 = mentionJid !== target ? db.getUser(mentionJid, groupJid) : u;
        const user = {
          pushname: (u2 && u2.pushname) || (u && u.pushname),
          name: (u2 && u2.name) || (u && u.name),
          xp: (u2 && u2.xp) || (u && u.xp) || 0,
          level: (u2 && u2.level) || (u && u.level) || 1,
          messages: (u2 && u2.messages) || (u && u.messages) || 0,
          msg_stickers: (u2 && u2.msg_stickers) || (u && u.msg_stickers) || 0,
          msg_images: (u2 && u2.msg_images) || (u && u.msg_images) || 0,
          msg_audios: (u2 && u2.msg_audios) || (u && u.msg_audios) || 0,
          msg_videos: (u2 && u2.msg_videos) || (u && u.msg_videos) || 0
        };

        const isSelf =
          String(target) === String(ctx.sender) ||
          String(mentionJid) === String(ctx.sender);

        const mentionTag = tag(mentionJid); // @xxxxx — WhatsApp troca pelo nome
        let display = await niceName(ctx, mentionJid, user);
        if (!display) display = mentionTag;

        const xp = user.xp || 0;
        const level = user.level || 1;
        const msgs = user.messages || 0;
        const stickers = user.msg_stickers || 0;
        const images = user.msg_images || 0;
        const audios = user.msg_audios || 0;
        const videos = user.msg_videos || 0;
        const progress = Math.min(100, Math.floor((xp % 100)));

        // IMPORTANTE: texto tem de ter @id E mentions: [jid] para aparecer o NOME
        const caption =
          '╭──〔 👤 PERFIL 〕──╮\n' +
          '> ' + (isSelf ? 'Teu perfil' : ('Perfil de ' + mentionTag)) + '\n' +
          '❀────────────────❀\n' +
          '╭──〔 ⭐ XP 〕──╮\n' +
          '◈┃ Nome: ' + mentionTag + (display && display !== mentionTag ? (' (*' + display + '*)') : '') + '\n' +
          '◈┃ XP: *' + xp + '*\n' +
          '◈┃ Nivel: *' + level + '*\n' +
          '◈┃ Progresso: *' + progress + '%*\n' +
          '╰──────────────────╯\n' +
          '╭──〔 💬 ATIVIDADE 〕──╮\n' +
          '◈┃ Mensagens: *' + msgs + '*\n' +
          '◈┃ Figurinhas: *' + stickers + '*\n' +
          '◈┃ Imagens: *' + images + '*\n' +
          '◈┃ Audios: *' + audios + '*\n' +
          '◈┃ Videos: *' + videos + '*\n' +
          '╰──────────────────╯\n' +
          '❀────────────────❀';

        let ppUrl = null;
        const tryIds = [mentionJid, target, String(target).replace('@lid', '@s.whatsapp.net')];
        for (let i = 0; i < tryIds.length; i++) {
          try {
            ppUrl = await ctx.sock.profilePictureUrl(tryIds[i], 'image');
            if (ppUrl) break;
          } catch (_) {}
        }

        const mentions = [mentionJid];

        if (ppUrl) {
          // Baileys: image + caption + mentions
          await ctx.sock.sendMessage(
            ctx.jid,
            {
              image: { url: ppUrl },
              caption: caption,
              mentions: mentions
            },
            { quoted: ctx.msg }
          );
        } else {
          // texto via ctx.reply (usa o mesmo sistema dos ranks que ja marca nome)
          await ctx.reply(caption + '\n> (Sem foto de perfil)', { mentions: mentions });
        }
      } catch (e) {
        console.error('[perfil]', e && e.message);
        await ctx.reply('Erro ao carregar perfil.');
      }
    }
  }
];
