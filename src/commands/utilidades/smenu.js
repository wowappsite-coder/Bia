const { openMainMenu } = require('../../interactive/slashMenu');

module.exports = {
  name: 'smenu',
  aliases: ['intermenu', 'menui'],
  category: 'utilidades',
  description: 'Menu interativo (prefixo /)',
  async handler(ctx) {
    return openMainMenu(ctx);
  }
};
