module.exports = [{
  name: 'dono',
  aliases: ['owner', 'criador', 'botowner'],
  category: 'utilidades',
  description: 'Mostra o dono oficial do bot',
  handler: async (ctx) => {
    const OWNER_NUM = process.env.OWNER_DISPLAY || process.env.OWNER_NUMBER || process.env.OWNER || '874288439';
    const num = String(OWNER_NUM).replace(/\D/g, '').replace(/^258/, '') || '874288439';
    const wa = 'https://wa.me/258' + num;
    const text =
'╭─────── •°❀°• ───────╮\n' +
'      👑 *DONO OFICIAL*\n' +
'      *BEATRIZ BOT*\n' +
'╰─────── •°❀°• ───────╯\n' +
'\n' +
'│\n' +
'│  🧑‍💼 *Nome:* Ebai\n' +
'│  📱 *Número:* ' + num + '\n' +
'│  🔗 *Contato:*\n' +
'│  ' + wa + '\n' +
'│\n' +
'│  💬 Fale com o dono no PV\n' +
'│  para aluguel, suporte\n' +
'│  ou duvidas do bot.\n' +
'│\n' +
'╰─────────────── ❀ ───╯';
    try {
      if (ctx.reply) return await ctx.reply(text);
      if (ctx.sock && ctx.jid) return await ctx.sock.sendMessage(ctx.jid, { text });
    } catch (e) {
      console.log('dono err', e && e.message);
    }
  }
}];
