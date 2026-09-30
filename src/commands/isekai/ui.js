const isekaiDb = require('../../isekai/db');

const MENU = `╭──〔 🌌 𝐌𝐎𝐃𝐎 𝐈𝐒𝐄𝐊𝐀𝐈 〕──╮
> 𝐒𝐢𝐬𝐭𝐞𝐦𝐚 𝐝𝐞 𝐚𝐯𝐞𝐧𝐭𝐮𝐫𝐚
> 𝐔𝐬𝐞: 𝐢𝐬𝐤𝐦𝐞𝐧𝐮 <𝐜𝐚𝐭𝐞𝐠𝐨𝐫𝐢𝐚>
❀────────────────❀
╭──〔 🗂️ 𝐂𝐀𝐓𝐄𝐆𝐎𝐑𝐈𝐀𝐒 〕──╮
◈┃🌌 𝐩𝐞𝐫𝐬𝐨𝐧𝐚𝐠𝐞𝐦
◈┃⚔️ 𝐚𝐯𝐞𝐧𝐭𝐮𝐫𝐚
◈┃🎒 𝐢𝐧𝐯𝐞𝐧𝐭𝐚𝐫𝐢𝐨
◈┃💰 𝐞𝐜𝐨𝐧𝐨𝐦𝐢𝐚
◈┃🌾 𝐩𝐫𝐨𝐟𝐢𝐬𝐬𝐨𝐞𝐬
◈┃🏰 𝐠𝐮𝐢𝐥𝐝𝐚
◈┃🗺️ 𝐦𝐮𝐧𝐝𝐨
◈┃👥 𝐧𝐩𝐜𝐬
◈┃❤️ 𝐬𝐨𝐜𝐢𝐚𝐥
◈┃👨‍👩‍👧 𝐟𝐚𝐦𝐢𝐥𝐢𝐚
◈┃⚔️ 𝐩𝐚𝐫𝐭𝐲
◈┃☠️ 𝐯𝐢𝐝𝐚
◈┃✨ 𝐦𝐚𝐠𝐢𝐚
◈┃🙏 𝐝𝐢𝐯𝐢𝐧𝐨
◈┃👑 𝐝𝐞𝐬𝐭𝐢𝐧𝐨
◈┃🏆 𝐫𝐚𝐧𝐤𝐢𝐧𝐠
◈┃🧠 𝐚𝐬𝐬𝐢𝐬𝐭𝐞𝐧𝐭𝐞
◈┃⚙️ 𝐬𝐢𝐬𝐭𝐞𝐦𝐚
╰──────────────────╯
> 🥏┃ 𝐄𝐱: 𝐢𝐬𝐤𝐦𝐞𝐧𝐮 𝐚𝐯𝐞𝐧𝐭𝐮𝐫𝐚
❀────────────────❀

      ──〔 𝐈𝐒𝐄𝐊𝐀𝐈 〕──`;

const SUB = {
  personagem: ['iskstatus', 'iskpersonagem', 'iskatributos', 'iskhabilidades', 'iskvidas', 'iskhistorico'],
  aventura: ['isklutar', 'iskboss', 'iskdungeon', 'iskatacar', 'iskusar', 'iskdefender', 'iskfugir', 'iskexplorar'],
  inventario: ['iskinventario', 'iskequipar', 'iskconsumir', 'iskcraft'],
  economia: ['isksaldo', 'iskloja', 'iskcomprar', 'iskvender'],
  profissoes: ['iskprofissoes', 'iskfazenda', 'iskpescar', 'iskminerar', 'iskforjar'],
  guilda: ['iskguilda', 'iskguilda_entrar', 'iskquest', 'iskranking'],
  mundo: ['iskmundo', 'iskmapa', 'iskcidade', 'iskviajar', 'iskrumores'],
  npcs: ['isknpc', 'iskfalar', 'iskrelacoes'],
  social: ['iskrelacoes', 'iskdar', 'isknamorar', 'iskcasar', 'iskfamilia'],
  party: ['iskparty', 'iskconvidar', 'iskacampamento'],
  vida: ['iskferimentos', 'iskcura', 'iskmorte', 'iskreencarnar', 'iskvidas'],
  magia: ['iskmagia', 'iskescola', 'isktreinar'],
  divino: ['iskdeuses', 'iskorar', 'iskpacto', 'isktranscender'],
  destino: ['iskdestino', 'iskheroi', 'iskvilao'],
  ranking: ['iskranking', 'isknivel'],
  assistente: ['iskajuda', 'iskdica'],
  sistema: ['iskiniciar', 'iskmodo', 'iskmodo_off', 'iskmenu']
};

function subPanel(key) {
  const list = SUB[key];
  if (!list) return 'Categoria invalida. Ex: iskmenu aventura';
  let t = '╭──〔 ' + key.toUpperCase() + ' 〕──╮\n';
  list.forEach(function (c) { t += '◈┃ ' + c + '\n'; });
  t += '╰──────────────────╯\n';
  t += '> 🥏┃ Total: ' + list.length + '\n';
  t += '❀────────────────❀\n';
  t += '> iskmenu';
  return t;
}

function arg0(ctx) {
  if (ctx.args && ctx.args[0]) return String(ctx.args[0]).toLowerCase();
  const p = String(ctx.text || '').trim().split(/\s+/);
  return (p[0] || '').toLowerCase();
}

module.exports = [
  {
    name: 'iskmenu',
    aliases: ['iskpainel_menu'],
    category: 'isekai',
    handler: async (ctx) => {
      const cat = arg0(ctx);
      if (cat && SUB[cat]) return ctx.reply(subPanel(cat));
      if (cat && cat !== 'inicio' && cat !== 'voltar') {
        return ctx.reply('Categorias: ' + Object.keys(SUB).join(', '));
      }
      await ctx.reply(MENU);
    }
  },
  {
    name: 'iskdica',
    aliases: ['iskajuda'],
    category: 'isekai',
    handler: async (ctx) => {
      await ctx.reply(
        '╭──〔 🧠 𝐀𝐒𝐒𝐈𝐒𝐓𝐄𝐍𝐓𝐄 〕──╮\n' +
        '◈┃ Usa iskmenu para navegar\n' +
        '◈┃ isklutar · iskinventario · isksaldo\n' +
        '╰──────────────────╯'
      );
    }
  }
];
