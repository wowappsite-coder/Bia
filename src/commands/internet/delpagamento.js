const { getGroupSetting, setGroupSetting, scopeGroup } = require('../../database');

async function canManage(ctx) {
  if (ctx.isOwner && ctx.isOwner()) return true;
  if (ctx.isBotAdmin && ctx.isBotAdmin()) return true;
  try { if (ctx.isGroup && (await ctx.isGroupAdmin())) return true; } catch (e) {}
  return false;
}

module.exports = [
  {
    name: 'delpagamento',
    aliases: ['removerpagamento'],
    category: 'internet',
    description: 'Remove número de pagamento do grupo',
    groupOnly: true,
    handler: async (ctx) => {
      if (!(await canManage(ctx))) return ctx.reply('❌ Só admin/dono.');
      const g = scopeGroup(ctx);
      const num = (ctx.args[0] || '').replace(/\D/g, '');
      if (!num) return ctx.reply('❌ Use: delpagamento NUMERO');
      let list = [];
      try { list = JSON.parse(getGroupSetting(g, 'payment_numbers', '[]') || '[]'); } catch (e) { list = []; }
      if (!Array.isArray(list)) list = [];
      const before = list.length;
      list = list.filter(function (x) {
        return String(x.num) !== String(num) && !String(x.num).endsWith(num.slice(-9));
      });
      if (list.length === before) return ctx.reply('❌ Número não encontrado.');
      setGroupSetting(g, 'payment_numbers', JSON.stringify(list));
      if (list[0]) {
        setGroupSetting(g, 'payment_number', list[0].num);
        setGroupSetting(g, 'payment_name', list[0].name || '');
      } else {
        setGroupSetting(g, 'payment_number', '');
        setGroupSetting(g, 'payment_name', '');
      }
      await ctx.reply('✅ Removido. Restam ' + list.length + ' número(s).');
    }
  }
];
