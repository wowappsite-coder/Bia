const isekaiDb = require('../../isekai/db');

function need(ctx) {
  const g = isekaiDb.scopeGroup(ctx);
  const d = isekaiDb.getPlayerData(ctx.sender, g);
  if (!d || !d.race) return { ok: false, msg: 'Cria personagem: iskiniciar Nome' };
  return { ok: true, data: d, group: g };
}

module.exports = [
  {
    name: 'iskinventario',
    aliases: ['iskinv', 'iskbag'],
    category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx);
      if (!n.ok) return ctx.reply(n.msg);
      const d = n.data;
      const inv = d.inventory || {};
      const keys = Object.keys(inv).filter(function (k) { return inv[k] > 0; });
      const eq = d.equipment || {};
      let t = '╭──〔 🎒 INVENTARIO 〕──╮\n';
      t += '> IENE: *' + (d.iene || 0) + '*\n';
      t += '❀────────────────❀\n';
      t += '╭──〔 EQUIPADO 〕──╮\n';
      const slots = Object.keys(eq);
      if (!slots.length) t += '◈┃ (vazio)\n';
      else {
        for (let i = 0; i < slots.length; i++) {
          const s = slots[i];
          t += '◈┃ ' + s + ': *' + eq[s] + '*\n';
        }
      }
      t += '╰──────────────────╯\n';
      t += '╭──〔 ITENS 〕──╮\n';
      if (!keys.length) t += '◈┃ (vazio)\n';
      else {
        for (let i = 0; i < keys.length && i < 40; i++) {
          const k = keys[i];
          t += '◈┃ ' + k + ' x' + inv[k] + '\n';
        }
      }
      t += '╰──────────────────╯\n';
      t += '> iskequipar · iskconsumir · iskvender\n';
      t += '❀────────────────❀';
      await ctx.reply(t);
    }
  }
];
