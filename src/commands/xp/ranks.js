const { token, tag } = require('../../utils/mention');
const db = require('../../database');

const RANK_ATTRIBUTES = [
  'gay', 'lesbica', 'burro', 'inteligente', 'otaku', 'fiel', 'infiel', 'corno',
  'gado', 'gostoso', 'rico', 'pobre', 'forte', 'pegador', 'macho', 'nerd',
  'trabalhador', 'brabo', 'lindo', 'malandro', 'engracado', 'charmoso',
  'visionario', 'poderoso', 'vencedor', 'sigma', 'beta', 'louco', 'casal'
];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

async function getGroupMemberIds(ctx) {
  if (!ctx.isGroup) return [];
  try {
    const meta = await ctx.sock.groupMetadata(ctx.jid);
    return (meta.participants || []).map(p => p.id || p.jid).filter(Boolean);
  } catch (e) {
    return [];
  }
}

function makeRankCommand(attr) {
  return {
    name: 'rank' + attr,
    category: 'xp',
    description: 'Ranking aleatorio de ' + attr + ' (5 membros)',
    groupOnly: true,
    handler: async (ctx) => {
      try {
        let members = await getGroupMemberIds(ctx);
        try {
          const botId = ctx.sock.user && (ctx.sock.user.id || '');
          const botNum = String(botId).split(':')[0].split('@')[0];
          members = members.filter(id => String(id).split(':')[0].split('@')[0] !== botNum);
        } catch (_) {}

        if (!members.length) return ctx.reply('❌ Não consegui listar os membros.');

        const picked = shuffle(members).slice(0, Math.min(5, members.length));
        const scored = picked
          .map(jid => ({ jid, value: Math.floor(Math.random() * 101) }))
          .sort((a, b) => b.value - a.value);

        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        let text = '🏆 *RANK ' + attr.toUpperCase() + '*\n\n';
        const mentions = [];
        scored.forEach((r, i) => {
          text += (medals[i] || (String(i + 1) + '.')) + ' ' + tag(r.jid) + ' — *' + r.value + '%*\n';
          mentions.push(r.jid);
        });
        await ctx.reply(text.trim(), { mentions });
      } catch (e) {
        console.error(e);
        await ctx.reply('❌ Erro ao gerar ranking.');
      }
    }
  };
}


const meuXp = {
  name: 'meuxp',
  aliases: ['xp', 'nivel', 'level'],
  category: 'xp',
  description: 'Perfil com foto e stats',
  handler: async (ctx) => {
    try {
      let target = ctx.sender;
      try {
        if (typeof ctx.getMentionedOrQuoted === 'function') {
          const t = ctx.getMentionedOrQuoted();
          if (t) target = t;
        } else if (ctx.mentioned && ctx.mentioned[0]) {
          target = ctx.mentioned[0];
        } else {
          const ci = ctx.msg && ctx.msg.message && ctx.msg.message.extendedTextMessage && ctx.msg.message.extendedTextMessage.contextInfo;
          if (ci && ci.participant) target = ci.participant;
          if (ci && ci.mentionedJid && ci.mentionedJid[0]) target = ci.mentionedJid[0];
        }
      } catch (_) {}

      const groupJid = ctx.isGroup ? ctx.jid : 'global';
      const u = db.getUser(target, groupJid);
      const isSelf = String(target) === String(ctx.sender);
      const name = u.pushname || u.name || String(target).split('@')[0];
      const xp = u.xp || 0;
      const level = u.level || 1;
      const msgs = u.messages || 0;
      const stickers = u.msg_stickers || 0;
      const images = u.msg_images || 0;
      const audios = u.msg_audios || 0;
      const videos = u.msg_videos || 0;
      const progress = Math.min(100, Math.floor((xp % 100)));

      const caption =
        '╭──〔 👤 PERFIL 〕──╮\n' +
        '> ' + (isSelf ? 'Teu perfil' : ('Perfil de ' + name)) + '\n' +
        '❀────────────────❀\n' +
        '╭──〔 ⭐ XP 〕──╮\n' +
        '◈┃ Nome: *' + name + '*\n' +
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
      try {
        ppUrl = await ctx.sock.profilePictureUrl(target, 'image');
      } catch (_) {
        try {
          ppUrl = await ctx.sock.profilePictureUrl(String(target).replace('@lid', '@s.whatsapp.net'), 'image');
        } catch (_) {}
      }

      if (ppUrl) {
        await ctx.sock.sendMessage(ctx.jid, {
          image: { url: ppUrl },
          caption: caption,
          mentions: [target]
        }, { quoted: ctx.msg });
      } else {
        await ctx.reply(caption + '\n> (Sem foto de perfil)', { mentions: [target] });
      }
    } catch (e) {
      console.error('[perfil]', e && e.message);
      await ctx.reply('Erro ao carregar perfil.');
    }
  }
};


module.exports = [
  meuXp,
  {
    name: 'rank',
    aliases: ['ranking', 'top', 'toplist'],
    category: 'xp',
    description: 'Ranking de XP',
    groupOnly: true,
    handler: async (ctx) => {
      try {
        const database = db.getDb();
        const rows = database.prepare(`
          SELECT u.jid, g.xp, g.level FROM user_group_data g
          JOIN users u ON u.jid = g.jid
          WHERE g.group_jid = ? ORDER BY g.xp DESC LIMIT 10
        `).all(require('../../database').getScope());
        if (!rows.length) {
          const members = await getGroupMemberIds(ctx);
          const picked = shuffle(members).slice(0, 5);
          let text = '⭐ *RANKING XP*\n\n';
          const mentions = [];
          picked.forEach((jid, i) => {
            text += (['🥇','🥈','🥉','4️⃣','5️⃣'][i] || '') + ' ' + tag(jid) + '\n';
            mentions.push(jid);
          });
          return ctx.reply(text.trim(), { mentions });
        }
        let text = '⭐ *RANKING XP*\n\n';
        const mentions = [];
        rows.forEach((r, i) => {
          text += (['🥇','🥈','🥉'][i] || ((i+1)+'.')) + ' ' + tag(r.jid) + '\n   ⭐ ' + r.xp + ' XP\n';
          mentions.push(r.jid);
        });
        await ctx.reply(text.trim(), { mentions });
      } catch (e) {
        await ctx.reply('❌ Erro no ranking.');
      }
    }
  },
  {
    name: 'meuxp',
    aliases: ['xp', 'nivel', 'level'],
    category: 'xp',
    description: 'Seu XP',
    handler: async (ctx) => {
      const u = ctx.user;
      await ctx.reply('⭐ *Seu XP*\n\n⭐ ' + u.xp + ' XP | Nível ' + u.level + '\n💬 ' + u.messages + ' msgs');
    }
  },
  ...RANK_ATTRIBUTES.map(makeRankCommand)
];
