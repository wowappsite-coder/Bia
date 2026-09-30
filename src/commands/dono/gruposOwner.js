/**
 * listagrupos + sairgrupo (sg1, sg2...)
 * Owner only
 */
let lastList = [];

module.exports = [
  {
    name: 'listagrupos',
    aliases: ['grupos', 'listgroups', 'meusgrupos'],
    category: 'dono',
    description: 'Lista grupos com nome',
    ownerOnly: true,
    handler: async (ctx) => {
      if (ctx.isOwner && !ctx.isOwner()) return ctx.reply('❌ Só o dono.');
      let items = [];
      try {
        const all = await ctx.sock.groupFetchAllParticipating();
        items = Object.values(all || {}).map((g) => ({
          jid: g.id,
          name: g.subject || g.id
        }));
      } catch (e) {
        return ctx.reply('❌ Erro ao listar: ' + e.message);
      }
      items.sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt'));
      lastList = items;
      if (!items.length) return ctx.reply('👥 Nenhum grupo.');

      let text = '👥 *Grupos do bot:* ' + items.length + '\n\n';
      items.forEach((g, i) => {
        const n = i + 1;
        text += '*' + n + '.* ' + String(g.name).slice(0, 42) + '\n';
        text += '    └ *sg' + n + '* ou *sairgrupo ' + n + '*\n';
      });
      text += '\n_Ex: sg3 → sai do grupo 3_';
      if (text.length > 3500) {
        await ctx.reply(text.slice(0, 3400) + '\n…');
        await ctx.reply(text.slice(3400));
      } else {
        await ctx.reply(text);
      }
    }
  },
  {
    name: 'sairgrupo',
    aliases: [
      'sg', 'leavegroup', 'sairgp',
      'sg1','sg2','sg3','sg4','sg5','sg6','sg7','sg8','sg9','sg10',
      'sg11','sg12','sg13','sg14','sg15','sg16','sg17','sg18','sg19','sg20',
      'sg21','sg22','sg23','sg24','sg25','sg26','sg27','sg28','sg29','sg30'
    ],
    category: 'dono',
    description: 'Bot sai do grupo N da lista',
    ownerOnly: true,
    handler: async (ctx) => {
      if (ctx.isOwner && !ctx.isOwner()) return ctx.reply('❌ Só o dono.');

      let num = parseInt((ctx.args && ctx.args[0]) || '', 10);
      const cmd = String(ctx.command || '');
      const m = cmd.match(/^sg(\d+)$/i);
      if (!num && m) num = parseInt(m[1], 10);

      if (!num) {
        try {
          const body =
            (ctx.msg &&
              ctx.msg.message &&
              (ctx.msg.message.conversation ||
                (ctx.msg.message.extendedTextMessage &&
                  ctx.msg.message.extendedTextMessage.text))) ||
            '';
          const m2 = String(body).match(/(?:sg|sairgrupo)\s*(\d+)/i);
          if (m2) num = parseInt(m2[1], 10);
        } catch (_) {}
      }

      if (!num || num < 1) {
        return ctx.reply('❌ Use *sg3* ou *sairgrupo 3*\nAntes: *listagrupos*');
      }

      if (!lastList.length) {
        try {
          const all = await ctx.sock.groupFetchAllParticipating();
          lastList = Object.values(all || {}).map((g) => ({
            jid: g.id,
            name: g.subject || g.id
          }));
        } catch (e) {
          return ctx.reply('❌ Faz *listagrupos* primeiro.');
        }
      }

      const item = lastList[num - 1];
      if (!item) {
        return ctx.reply('❌ Número inválido. Total: ' + lastList.length);
      }

      try {
        await ctx.sock.groupLeave(item.jid);
        await ctx.reply('✅ Saí do grupo *' + num + '*:\n' + item.name);
        lastList.splice(num - 1, 1);
      } catch (e) {
        await ctx.reply('❌ Falha: ' + (e.message || e));
      }
    }
  }
];
