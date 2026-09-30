const path = require('path');
module.exports = {
  name: 'backupfull',
  aliases: ['backupbot', 'savebot'],
  category: 'dono',
  description: 'Backup completo do bot',
  ownerOnly: true,
  handler: async function (ctx) {
    await ctx.reply('A criar backup completo...');
    try {
      const ab = require(path.join(__dirname, '../../../scripts/autoBackup'));
      const out = ab.run();
      if (out) return ctx.reply('Backup criado:\n' + out + '\n\nCopia para a nuvem quando puderes.');
      return ctx.reply('Falhou ao criar backup. Ve o log no Termux.');
    } catch (e) {
      return ctx.reply('Erro: ' + String(e.message || e).slice(0, 150));
    }
  }
};
