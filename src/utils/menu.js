/**
 * Geração de menus a partir do registry real
 */

const registry = require('../commands/registry');
const config = require('../config');
const theme = require('./theme');

const CATEGORY_META = {
  dono: { emoji: '👑', title: 'MENU DONO' },
  admin: { emoji: '🛡️', title: 'MENU ADM' },
  grupo: { emoji: '👥', title: 'MENU GRUPO' },
  internet: { emoji: '🌐', title: 'MENU INTERNET' },
  bn: { emoji: '🎮', title: 'MENU BN' },
  diversao: { emoji: '🎭', title: 'MENU DIVERSÃO' },
  stickers: { emoji: '🎴', title: 'MENU STICKERS' },
  imagem: { emoji: '🖼️', title: 'MENU IMAGEM' },
  seguranca: { emoji: '🛡️', title: 'MENU SEGURANÇA' },
  utilidades: { emoji: '🧰', title: 'MENU UTILIDADES' },
  rpg: { emoji: '🎐', title: 'MENU RPG/FAMÍLIA' },
  xp: { emoji: '⭐', title: 'MENU XP/RANK' },
  economia: { emoji: '💰', title: 'MENU ECONOMIA' },
  aluguel: { emoji: '🏠', title: 'MENU ALUGUEL' },
  jogos: { emoji: '🎮', title: 'MENU JOGOS' },
  custom: { emoji: '✨', title: 'CUSTOM' },
  outros: { emoji: '📦', title: 'OUTROS' }
};

function generateMainMenu(ctx) {
  if (ctx && theme.useNewTheme(ctx)) {
    const _jid = (ctx && ctx.sender) ? ctx.sender : '';
    const _token = String(_jid).split('@')[0] || 'user';
    const _now = new Date();
    const _hora = String(_now.getHours()).padStart(2, '0') + ':' + String(_now.getMinutes()).padStart(2, '0');
    return theme.mainMenuTheme(registry.stats(), config.botName, '!', {
      mentionToken: _token,
      ownerName: 'Ebai',
      hora: _hora
    });
  }

  const stats = registry.stats();
  const total = (stats && stats.totalMain) != null ? stats.totalMain : '?';
  const pref = (config.prefixes && config.prefixes[0]) ? config.prefixes[0] : '!';

  const lines = [
    '╭──〔 𝐈𝐍𝐅𝐎 〕──╮',
    '> 𝐏𝐫𝐞𝐟𝐢𝐱𝐨: ' + pref,
    '> 𝐄𝐱: ' + pref + '𝐦𝐞𝐧𝐮',
    '> 𝐀𝐥𝐠𝐮𝐧𝐬 𝐜𝐨𝐦𝐚𝐧𝐝𝐨𝐬 𝐩𝐨𝐝𝐞𝐦 𝐟𝐮𝐧𝐜𝐢𝐨𝐧𝐚𝐫 𝐬𝐞𝐦 𝐩𝐫𝐞𝐟𝐢𝐱𝐨',
    '> 𝐄𝐱: 𝐦𝐞𝐧𝐮',
    '❀────────────────❀',
    '╭──〔 🌸 𝐌𝐄𝐍𝐔𝐒 〕──╮',
    '◈┃👑 𝗠𝗲𝗻𝘂 𝗗𝗼𝗻𝗼',
    '◈┃🛡️ 𝗠𝗲𝗻𝘂 𝗔𝗗𝗠',
    '◈┃👥 𝗠𝗲𝗻𝘂 𝗚𝗿𝘂𝗽𝗼',
    '◈┃🌐 𝗠𝗲𝗻𝘂 𝗜𝗻𝘁𝗲𝗿𝗻𝗲𝘁',
    '◈┃🎮 𝗠𝗲𝗻𝘂 𝗕𝗡',
    '◈┃🎭 𝗠𝗲𝗻𝘂 𝗗𝗶𝘃𝗲𝗿𝘀ã𝗼',
    '◈┃🎴 𝗠𝗲𝗻𝘂 𝗦𝘁𝗶𝗰𝗸𝗲𝗿𝘀',
    '◈┃🎨 𝗠𝗲𝗻𝘂 𝗜𝗺𝗮𝗴𝗲𝗺',
    '◈┃🔐 𝗦𝗲𝗴𝘂𝗿𝗮𝗻ç𝗮',
    '◈┃🧰 𝗨𝘁𝗶𝗹𝗶𝗱𝗮𝗱𝗲𝘀',
    '◈┃❤️ 𝗥𝗣𝗚/𝗙𝗮𝗺𝗶𝗹𝗶𝗮',
    '◈┃⭐ 𝗫𝗣/𝗥𝗔𝗡𝗞',
    '◈┃💰 𝗘𝗰𝗼𝗻𝗼𝗺𝗶𝗮',
    '◈┃🏠 𝗔𝗹𝘂𝗴𝘂𝗲𝗹',
    '◈┃📥 𝗠𝗲𝗻𝘂 𝗗𝗼𝘄𝗻𝗹𝗼𝗮𝗱',
    '◈┃📚 𝗠𝗲𝗻𝘂 𝗣𝗲𝘀𝗾𝘂𝗶𝘀𝗮',
    '◈┃⚙️ 𝗠𝗲𝗻𝘂 𝗠𝗼𝗱𝗼𝘀',
    '◈┃🎮 𝗠𝗲𝗻𝘂 𝗪𝗲𝗯𝗚𝗮𝗺𝗲𝘀',
    '╰──────────────────╯',
    '╭──〔 𝐒𝐈𝐒𝐓𝐄𝐌𝐀 〕──╮',
    '*🥏┃' + total + ' C͟O͟M͟A͟N͟D͟O͟S͟*',
    '*🥏┃P͟R͟E͟F͟I͟X͟O͟: ' + pref + '*',
    '❀────────────────❀',
    '',
    '      ──〔 𝐁𝐄𝐀𝐓𝐑𝐈𝐙 𝐁𝐎𝐓 〕──'
  ];
  return lines.join(String.fromCharCode(10));
}




/* BTZ_MENU_GROUPS_V2 */
function btzGroupCommands(category, cmds) {
  const list = (cmds || []).filter(function (c) {
    if (!c || c.hideFromMenu) return false;
    const n = String(c.name || '').toLowerCase();
    if (/^[0-9abc]$/i.test(n)) return false;
    if (/^h[1-8]$/.test(n) || n === 'hep') return false;
    return true;
  });

  function has(c, keys) {
    const n = String(c.name || '').toLowerCase();
    const als = (c.aliases || []).map(function (a) { return String(a).toLowerCase(); });
    if (keys.indexOf(n) >= 0) return true;
    for (var i = 0; i < als.length; i++) if (keys.indexOf(als[i]) >= 0) return true;
    return false;
  }
  function starts(c, pref) {
    return String(c.name || '').toLowerCase().indexOf(pref) === 0;
  }
  function pack(title, emoji, items) {
    if (!items || !items.length) return null;
    items.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    return { title: emoji + ' ' + title, emoji: emoji, items: items };
  }
  function restOf(all, used) {
    return all.filter(function (c) { return !used[String(c.name).toLowerCase()]; });
  }
  function mark(used, arr) {
    arr.forEach(function (c) { used[String(c.name).toLowerCase()] = 1; });
  }

  const cat = String(category || '').toLowerCase();
  const used = {};
  const groups = [];
  let g;

  const JOGO = ['jogodavelha','ttt','connect4','c4','forca','hangman','trivia','quiz','eununca','quemsueu','whoami','verdadeoudesafio','vod','ppt','jokenpo','moeda','coin','dado','dice','jogar','j1','j2','j3','j4','j5','j6','j7','j8','j9','aceitarvelha','recusarvelha','aceitarttt','recusarttt','aceitar4','recusar4','aceitac4','cancelar4','desistir','letra','responder','resposta','perguntaseu','question','rankingtrivia','ranktrivia','ngl','ppp','fc','resetefc','resetejdv'];
  const RANK = ['rankgado','rankgay','ranklindo','ranklinda','rankfeio','rankgostoso','rankgostosa','rankcorno','rankrico','rankpobre','rankotaku','rankbebado','rankpau','rankputa','rankputo','ranksafado','ranksafada','rankempresario','rankempresaria','ranknazista'];

  if (cat === 'bn' || cat === 'diversao' || cat === 'jogos') {
    const ranks = list.filter(function (c) { return has(c, RANK) || starts(c, 'rank'); });
    mark(used, ranks);
    const jogos = list.filter(function (c) { return has(c, JOGO) && !used[String(c.name).toLowerCase()]; });
    mark(used, jogos);
    const inter = restOf(list, used);
    g = pack('INTERAÇÃO', '🎯', inter); if (g) groups.push(g);
    g = pack('JOGOS', '🎮', jogos); if (g) groups.push(g);
    g = pack('RANKS', '🎐', ranks); if (g) groups.push(g);
  } else if (cat === 'admin') {
    const mod = list.filter(function (c) { return has(c, ['ban','kick','adv','advdel','advlist','advreset','mute','desmute','mutelist','hidetag','marcar','marcar2','promover','rebaixar','remover','add','blockuser','unblockuser']); });
    mark(used, mod);
    const gp = list.filter(function (c) { return has(c, ['abrirgrupo','fechargrupo','linkgp','revlinkgp','nomegp','descgp','setregras','bemvindo','saida','modoadm','modoprefixo']); });
    mark(used, gp);
    g = pack('MODERAÇÃO', '🛡️', mod); if (g) groups.push(g);
    g = pack('GRUPO', '👥', gp); if (g) groups.push(g);
    g = pack('OUTROS', '📦', restOf(list, used)); if (g) groups.push(g);
  } else if (cat === 'dono') {
    const sys = list.filter(function (c) { return has(c, ['reiniciar','restart','desligar','shutdown','backup','logs','stats','setprefix','broadcast','bc']); });
    mark(used, sys);
    const cmds = list.filter(function (c) { return has(c, ['addcmd1','addcmd2','addcmd3','delcmd','editcmd','listcmd','addadmin','deladmin','listagrupos','listausuarios','blockcmd','blockcmdg']); });
    mark(used, cmds);
    const mid = list.filter(function (c) { return has(c, ['setmedia','delmedia','listmedia','setaudio','delaudio','listaudio','migratemedia','criaraudio','crad']); });
    mark(used, mid);
    g = pack('SISTEMA', '⚙️', sys); if (g) groups.push(g);
    g = pack('COMANDOS', '📝', cmds); if (g) groups.push(g);
    g = pack('MÍDIA', '🖼️', mid); if (g) groups.push(g);
    g = pack('OUTROS', '📦', restOf(list, used)); if (g) groups.push(g);
  } else if (cat === 'rpg') {
    const fam = list.filter(function (c) { return has(c, ['casar','namorar','terminar','divorcio','minhadupla','familia','adotar','perfilrpg','statusrpg']) || starts(c, 'fam'); });
    mark(used, fam);
    const combat = list.filter(function (c) { return has(c, ['batalha','duelo','atacar','fugir','inventario','equipar']) || starts(c, 'isk'); });
    mark(used, combat);
    g = pack('FAMÍLIA', '🏡', fam); if (g) groups.push(g);
    g = pack('AVENTURA', '⚔️', combat); if (g) groups.push(g);
    g = pack('OUTROS', '🎐', restOf(list, used)); if (g) groups.push(g);
  } else if (cat === 'xp') {
    const rank = list.filter(function (c) { return starts(c, 'rank') || has(c, ['ranking','top','level','nivel','xp']); });
    mark(used, rank);
    g = pack('RANKING', '⭐', rank); if (g) groups.push(g);
    g = pack('OUTROS', '🎐', restOf(list, used)); if (g) groups.push(g);
  } else if (cat === 'economia') {
    const money = list.filter(function (c) { return has(c, ['saldo','daily','work','loja','comprar','vender','pix','transferir','banco','depositar','sacar']); });
    mark(used, money);
    g = pack('DINHEIRO', '💰', money); if (g) groups.push(g);
    g = pack('OUTROS', '📦', restOf(list, used)); if (g) groups.push(g);
  } else if (cat === 'stickers' || cat === 'imagem') {
    const st = list.filter(function (c) { return has(c, ['s','sticker','st','toimg','img','qc','gif','pack','take']); });
    mark(used, st);
    g = pack('FIGURINHAS', '🎴', st); if (g) groups.push(g);
    g = pack('OUTROS', '✨', restOf(list, used)); if (g) groups.push(g);
  } else if (cat === 'internet' || cat === 'utilidades') {
    const util = list.filter(function (c) { return has(c, ['ping','perfil','dono','criador','wame','gerarlink','traduzir','clima','cep']); });
    mark(used, util);
    g = pack('ÚTEIS', '🧰', util); if (g) groups.push(g);
    g = pack('OUTROS', '📦', restOf(list, used)); if (g) groups.push(g);
  } else if (cat === 'seguranca') {
    const sec = list.filter(function (c) { return has(c, ['antilink','antifake','antistatus','listanegra','whitelist']); });
    mark(used, sec);
    g = pack('PROTEÇÃO', '🔐', sec); if (g) groups.push(g);
    g = pack('OUTROS', '🛡️', restOf(list, used)); if (g) groups.push(g);
  } else if (cat === 'grupo') {
    const info = list.filter(function (c) { return has(c, ['linkgp','revlinkgp','nomegp','descgp','setregras','regras']); });
    mark(used, info);
    g = pack('INFO', 'ℹ️', info); if (g) groups.push(g);
    g = pack('OUTROS', '👥', restOf(list, used)); if (g) groups.push(g);
  } else if (cat === 'aluguel') {
    const plan = list.filter(function (c) { return has(c, ['aluguel','ativar','renovar','planos','pagamento','configpagamento']); });
    mark(used, plan);
    g = pack('PLANOS', '🏠', plan); if (g) groups.push(g);
    g = pack('OUTROS', '📦', restOf(list, used)); if (g) groups.push(g);
  } else {
    groups.push({ title: null, emoji: '🔮', items: list.slice().sort(function (a, b) {
      return String(a.name).localeCompare(String(b.name));
    }) });
  }

  return groups;
}

function btzCatEmoji(title, category) {
  const t = String(title || '').toUpperCase();
  const c = String(category || '').toLowerCase();
  if (c === 'rpg' || t.indexOf('RPG') >= 0 || t.indexOf('FAM') >= 0) return '🎐';
  if (c === 'bn' || t.indexOf('BN') >= 0) return '🎮';
  if (c === 'diversao' || t.indexOf('DIVERS') >= 0) return '🎭';
  if (c === 'admin' || t.indexOf('ADM') >= 0) return '🛡️';
  if (c === 'dono' || t.indexOf('DONO') >= 0) return '👑';
  if (c === 'grupo' || t.indexOf('GRUPO') >= 0) return '👥';
  if (c === 'internet' || t.indexOf('INTERNET') >= 0) return '🌐';
  if (c === 'stickers' || t.indexOf('STICK') >= 0 || t.indexOf('FIG') >= 0) return '🎴';
  if (c === 'imagem' || t.indexOf('IMAG') >= 0) return '🎨';
  if (c === 'seguranca' || t.indexOf('SEGUR') >= 0) return '🔐';
  if (c === 'utilidades' || t.indexOf('UTIL') >= 0) return '🧰';
  if (c === 'xp' || t.indexOf('XP') >= 0 || t.indexOf('RANK') >= 0) return '⭐';
  if (c === 'economia' || t.indexOf('ECON') >= 0) return '💰';
  if (c === 'aluguel' || t.indexOf('ALUG') >= 0) return '🏠';
  if (t.indexOf('DOWN') >= 0) return '📥';
  if (t.indexOf('GAME') >= 0 || t.indexOf('JOGO') >= 0) return '🕹️';
  if (t.indexOf('MODO') >= 0) return '⚙️';
  if (t.indexOf('PESQ') >= 0) return '📚';
  return '🔮';
}

function shouldHideFromCategoryMenu(cmd) {
  if (!cmd) return true;
  if (cmd.hideFromMenu) return true;
  const n = String(cmd.name || '').toLowerCase();
  if (/^[0-9]$/.test(n)) return true;
  if (/^[abc]$/.test(n)) return true;
  if (/^h[1-8]$/.test(n)) return true;
  if (n === 'hep') return true;
  return false;
}



function generateCategoryMenu(category, ctx) {
  if (ctx && theme.useNewTheme(ctx)) {
    const meta = CATEGORY_META[category] || { emoji: '🔮', title: String(category).toUpperCase() };
    const cmds = registry.getByCategory(category);
    return theme.categoryMenuTheme(meta, cmds, '!', category);
  }
  const meta = CATEGORY_META[category] || { emoji: '🔮', title: String(category).toUpperCase() };
  const raw = registry.getByCategory(category);
  const prefix = (config.prefixes && config.prefixes[0]) || '!';
  const groups = btzGroupCommands(category, raw);
  const total = groups.reduce(function (n, g) { return n + g.items.length; }, 0);
  if (!total) return '❌ Nenhum comando na categoria *' + meta.title + '*';
  const em = btzCatEmoji(meta.title, category);
  let text = '╭──〔 ' + em + ' ' + meta.title + ' 〕──╮\n';
  for (let g = 0; g < groups.length; g++) {
    const gr = groups[g];
    if (gr.title) text += '│\n│ ' + gr.title + '\n';
    for (let i = 0; i < gr.items.length; i++) {
      const cmd = gr.items[i];
      let line = prefix + cmd.name;
      if (cmd.aliases && cmd.aliases.length) line += ' (' + cmd.aliases[0] + ')';
      text += '◈┃ ' + line + '\n';
    }
  }
  text += '╰──────────────────╯\n';
  text += 'Total: ' + total + ' comandos\n';
  text += '❀────────────────❀';
  return text;
}

// Comandos de submenu
function registerMenuCommands() {
  const cats = Object.keys(CATEGORY_META);
  for (const cat of cats) {
    if (cat === 'custom' || cat === 'outros') continue;
    registry.register({
      name: `menu${cat}`,
      aliases: [`menu ${cat}`, `menú${cat}`],
      category: 'utilidades',
      description: `Abre o menu ${cat}`,
      handler: async (ctx) => {
        await ctx.reply(generateCategoryMenu(cat, ctx));
      }
    });
  }

  // Atalhos comuns
  const shortcuts = {
    'menuadm': 'admin',
    'menuadmin': 'admin',
    'menubn': 'bn',
    'menudono': 'dono',
    'menugrupo': 'grupo',
    'menuinternet': 'internet',
    'menusticker': 'stickers',
    'menustickers': 'stickers',
    'menuimg': 'imagem',
    'menuimagem': 'imagem',
    'menuseguranca': 'seguranca',
    'menurpg': 'rpg',
    'menufamilia': 'rpg',
    'menuxp': 'xp',
    'menurank': 'xp',
    'menueconomia': 'economia',
    'menualuguel': 'aluguel',
    'menudiversao': 'diversao',
    'menuutilidades': 'utilidades',
    'menutil': 'utilidades',
    'menusticker': 'stickers',
    'menufig': 'stickers',
    'menufigurinhas': 'stickers'
  };

  for (const [name, cat] of Object.entries(shortcuts)) {
    if (!registry.get(name)) {
      registry.register({
        name,
        category: 'utilidades',
        description: `Atalho menu ${cat}`,
        handler: async (ctx) => {
          await ctx.reply(generateCategoryMenu(cat, ctx));
        }
      });
    }
  }
}

module.exports = {
  generateMainMenu,
  generateCategoryMenu,
  registerMenuCommands,
  CATEGORY_META
};
