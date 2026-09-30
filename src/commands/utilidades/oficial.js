module.exports = [
  {
    name: 'canaloficial',
    aliases: ['canal', 'channel'],
    category: 'utilidades',
    description: 'Canal oficial do bot',
    handler: async function (ctx) {
      return ctx.reply(
        '📢 *Canal oficial BEATRIZ BOT*\n\n' +
        'https://whatsapp.com/channel/0029Vb6PhNkATRSjN3udCi26'
      );
    }
  },
  {
    name: 'grupooficial',
    aliases: ['gpoficial', 'grupoofc'],
    category: 'utilidades',
    description: 'Grupo oficial do bot',
    handler: async function (ctx) {
      return ctx.reply(
        '👥 *Grupo oficial BEATRIZ BOT*\n\n' +
        'https://chat.whatsapp.com/IBGTzlxazMP6DQOckdfZR0'
      );
    }
  }
];
