const { isOwnerJid } = require('../../utils/ownerCheck');
/**
 * listagp2 — lista grupos com nome, link e data de criação
 * Apenas Owner
 */

function formatCreated(ts) {
  if (!ts) return 'desconhecida';
  // Baileys costuma usar segundos unix
  let n = Number(ts);
  if (!n || isNaN(n)) return 'desconhecida';
  if (n < 1e12) n = n * 1000; // segundos -> ms
  try {
    const d = new Date(n);
    if (isNaN(d.getTime())) return 'desconhecida';
    const pad = (x) => String(x).padStart(2, '0');
    return (
      pad(d.getDate()) +
      '/' +
      pad(d.getMonth() + 1) +
      '/' +
      d.getFullYear() +
      ' ' +
      pad(d.getHours()) +
      ':' +
      pad(d.getMinutes())
    );
  } catch (_) {
    return 'desconhecida';
  }
}

module.exports = [
  {
    name: 'listagp2',
    aliases: ['listagrupos2', 'grupos2', 'gplist2'],
    category: 'dono',
    description: 'Lista grupos: nome, link e data de criação',
    ownerOnly: true,
    handler: async (ctx) => {
      if (typeof ctx.isOwner === 'function' && !ctx.isOwner()) {
        return ctx.reply('❌ Só o dono.');
      }

      await ctx.reply('⏳ A recolher grupos (nome, link, data)...');

      let groups = [];
      try {
        const all = await ctx.sock.groupFetchAllParticipating();
        groups = Object.values(all || {});
      } catch (e) {
        return ctx.reply('❌ Erro ao listar grupos: ' + (e.message || e));
      }

      if (!groups.length) {
        return ctx.reply('👥 Bot não está em nenhum grupo.');
      }

      groups.sort(function (a, b) {
        return String(a.subject || '').localeCompare(String(b.subject || ''), 'pt');
      });

      const lines = [];
      lines.push('👥 *LISTA GP 2* — ' + groups.length + ' grupos\n');

      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        const jid = g.id;
        const nome = g.subject || 'Sem nome';
        const criado = formatCreated(g.creation || g.createdAt || g.ownerTime);

        let link = 'sem link (bot precisa ser admin)';
        try {
          const code = await ctx.sock.groupInviteCode(jid);
          if (code) link = 'https://chat.whatsapp.com/' + code;
        } catch (_) {
          link = 'sem permissão / sem link';
        }

        lines.push(
          '*' + (i + 1) + '.* ' + nome +
            '\n📛 Nome: ' + nome +
            '\n🔗 Link: ' + link +
            '\n📅 Criado: ' + criado +
            '\n'
        );
      }

      // envia em partes se for longo
      let buf = '';
      for (let i = 0; i < lines.length; i++) {
        if ((buf + lines[i]).length > 3400) {
          await ctx.reply(buf.trim());
          buf = '';
        }
        buf += lines[i] + (i === 0 ? '\n' : '\n');
      }
      if (buf.trim()) await ctx.reply(buf.trim());
    }
  }
];
