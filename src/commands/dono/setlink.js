const commandLinks = require('../../services/commandLinks');
const registry = require('../registry');

module.exports = [
  {
    name: 'setlink',
    aliases: ['addlink', 'linkcmd'],
    category: 'dono',
    description: 'Associa um link a um comando',
    ownerOnly: true,
    handler: async (ctx) => {
      // setlink menu https://...
      // setlink menu | texto opcional | https://...
      const raw = (ctx.text || (ctx.args || []).join(' ') || '').trim();
      if (!raw) {
        return ctx.reply(
          '*setlink*\n\n' +
          'Uso:\n' +
          '• *setlink menu https://site.com*\n' +
          '• *setlink regras https://chat.whatsapp.com/xxx*\n' +
          '• *setlink aluguel | Veja os planos | https://...*\n\n' +
          'Quando alguem usar o comando, o bot envia o link a seguir.'
        );
      }

      let cmdName = '';
      let url = '';
      let text = '';

      if (raw.includes('|')) {
        const parts = raw.split('|').map(s => s.trim()).filter(Boolean);
        cmdName = parts[0] || '';
        if (parts.length >= 3) {
          text = parts[1];
          url = parts[2];
        } else if (parts.length === 2) {
          // comando | url  OU  comando | texto (sem url)
          if (/^https?:\/\//i.test(parts[1])) url = parts[1];
          else return ctx.reply('Falta o link (http/https).\nEx: *setlink menu | texto | https://...*');
        }
      } else {
        const parts = raw.split(/\s+/);
        cmdName = parts[0] || '';
        // ultimo token que parece url
        for (let i = parts.length - 1; i >= 1; i--) {
          if (/^https?:\/\//i.test(parts[i])) {
            url = parts[i];
            text = parts.slice(1, i).join(' ').trim();
            break;
          }
        }
        if (!url && parts[1]) url = parts.slice(1).join(' ');
      }

      cmdName = commandLinks.normKey(cmdName);
      if (!cmdName) return ctx.reply('Indica o nome do comando.\nEx: *setlink menu https://...*');
      if (!url || !/^https?:\/\//i.test(url)) {
        return ctx.reply('Link invalido. Tem de comecar com http:// ou https://');
      }

      try {
        commandLinks.set(cmdName, url, text);
        return ctx.reply(
          '✅ Link definido!\n\n' +
          '📌 Comando: *' + cmdName + '*\n' +
          (text ? '📝 Texto: ' + text + '\n' : '') +
          '🔗 ' + url
        );
      } catch (e) {
        return ctx.reply('Erro: ' + (e.message || e));
      }
    }
  },
  {
    name: 'dellink',
    aliases: ['removelink', 'unlinkcmd'],
    category: 'dono',
    description: 'Remove link de um comando',
    ownerOnly: true,
    handler: async (ctx) => {
      const name = commandLinks.normKey((ctx.args && ctx.args[0]) || ctx.text || '');
      if (!name) return ctx.reply('Uso: *dellink menu*');
      const ok = commandLinks.remove(name);
      return ctx.reply(ok ? '🗑️ Link de *' + name + '* removido.' : 'Nenhum link em *' + name + '*.');
    }
  },
  {
    name: 'listlink',
    aliases: ['listlinks', 'links'],
    category: 'dono',
    description: 'Lista comandos com link',
    ownerOnly: true,
    handler: async (ctx) => {
      const items = commandLinks.list();
      if (!items.length) return ctx.reply('Nenhum link configurado.\nUsa *setlink comando https://...*');
      let t = '🔗 *Links por comando*\n\n';
      for (const it of items) {
        t += '• *' + it.command + '*\n  ' + it.url + (it.text ? '\n  _' + it.text + '_' : '') + '\n\n';
      }
      return ctx.reply(t.trim());
    }
  }
];
