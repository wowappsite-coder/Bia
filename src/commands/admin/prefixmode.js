const db = require('../../database');

function getMode(groupJid) {
  try {
    const v = db.getGroupSetting(groupJid, 'prefix_only', '0');
    return String(v) === '1' || v === 1 || v === true;
  } catch (_) {
    return false;
  }
}
function setMode(groupJid, on) {
  db.setGroupSetting(groupJid, 'prefix_only', on ? '1' : '0');
}
module.exports.getPrefixOnly = getMode;
module.exports = [
  {
    name: 'modoprefixo',
    aliases: ['modosopreixo', 'prefixonly', 'modosemprefx', 'modosemprefixo', 'prefixmode'],
    category: 'admin',
    description: 'Modo so com prefixo (por grupo)',
    groupOnly: true,
    adminOnly: true,
    handler: async (ctx) => {
      if (!(await ctx.isGroupAdmin()) && !ctx.isOwner() && !ctx.isBotAdmin()) {
        return ctx.reply('Apenas admins do grupo.');
      }
      const arg = ((ctx.args && ctx.args[0]) || '').toLowerCase().trim();
      const cmdName = String(ctx.commandName || '').toLowerCase();
      let wantOn = null;
      if (['on','ligar','1','sim','so','só'].indexOf(arg) >= 0) wantOn = true;
      else if (['off','desligar','0','nao','não','livre','sem'].indexOf(arg) >= 0) wantOn = false;
      else if (!arg && (cmdName === 'modosopreixo' || cmdName === 'prefixonly')) wantOn = true;
      else if (!arg && (cmdName === 'modosemprefx' || cmdName === 'modosemprefixo')) wantOn = false;

      if (wantOn === null) {
        const cur = getMode(ctx.jid);
        return ctx.reply(
          'Estado: *' + (cur ? 'SO COM PREFIXO' : 'LIVRE') + '*\n\n' +
          '*modoprefixo on* — so !comando\n' +
          '*modoprefixo off* — com e sem prefixo'
        );
      }
      setMode(ctx.jid, wantOn);
      await ctx.reply(wantOn
        ? 'Modo *SO COM PREFIXO* ativo neste grupo.\nEx: !menu'
        : 'Modo *LIVRE* ativo neste grupo.\nmenu e !menu funcionam.');
    }
  }
];
