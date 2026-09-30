
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


/**
 * Temas visuais por prefixo
 * !  → tema "luxo" (novo)
 * resto / sem prefixo → visual original
 */

function useNewTheme(ctx) {
  try {
    return String(ctx && ctx.prefix || '') === '!';
  } catch (_) {
    return false;
  }
}

function line(ch, n) {
  return String(ch).repeat(n);
}

/** Menu principal — tema ! */
function mainMenuTheme(stats, botName, prefix, extra) {
  const p = prefix || '!';
  const orn = 'ঔৣֳ̤᷈͜͝͡';
  const extraInfo = extra || {};
  const mentionToken = extraInfo.mentionToken || 'user';
  const ownerName = extraInfo.ownerName || 'Ebai';
  let hora = extraInfo.hora;
  if (!hora) {
    const d = new Date();
    hora = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  const total = (stats && stats.totalMain) != null ? stats.totalMain : '?';
  const bot = botName || 'BEATRIZ BOT';
  const L = [];

  L.push('*╔═══━─❦ۜ✯ۣۜৡ ✧ ❖ ✧ ৡۣۜ✯ۜ─━━═╗*');
  L.push('*║*  *╭━━✯ ❖ 𝐈𝐍𝐅𝐎𝐒 ❖ ✯━━╮*');
  L.push('*║*  *│*');
  L.push('*║*  *│  ' + orn + ' ✦ 𝗕𝗢𝗧: ' + bot + '*');
  L.push('*║*  *│  ' + orn + ' ✦ 𝗨𝗦𝗨𝗔́𝗥𝗜𝗢:* @' + mentionToken);
  L.push('*║*  *│  ' + orn + ' ✦ 𝗗𝗢𝗡𝗢: ' + ownerName + '*');
  L.push('*║*  *│  ' + orn + ' ✦ 𝗣𝗥𝗘𝗙𝗜𝗫𝗢: [ ' + p + ' ]*');
  L.push('*║*  *│  ' + orn + ' ✦ 𝗛𝗢𝗥𝗔: ' + hora + '*');
  L.push('*║*  *│  ' + orn + ' ✦ 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦: ' + total + '*');
  L.push('*║*  *│*');
  L.push('*║*  *╰━━━ঔৣ͡➳ ✦ ❖ ✦ ➳ঔৣ͡━━━╯*');
  L.push('*║*');
  L.push('*║*  *╭━━✯ ❖ 𝐏𝐑𝐈𝐍𝐂𝐈𝐏𝐀𝐈𝐒 ❖ ✯━━╮*');
  L.push('*║*  *│  ✦ ❖ ✧ ❖ ✦ ❖ ✧ ❖ ✦*');
  L.push('*║*  *│*');

  const menus = [
    'menudono', 'menuadm', 'menugrupo', 'menuinternet',
    'menubn', 'menudiversao', 'menufig', 'menuimg',
    'menuseguranca', 'menuutilidades', 'menurpg', 'menuxp',
    'menueconomia', 'menualuguel', 'menudownload', 'menuwebgames', 'menupesquisa', 'menumodos'
  ];
  for (let i = 0; i < menus.length; i++) {
    L.push('*║*  *│  ' + orn + '💠 ' + p + menus[i] + '*');
  }

  L.push('*║*  *│*');
  L.push('*║*  *│  ✦ ❖ ✧ ❖ ✦ ❖ ✧ ❖ ✦*');
  L.push('*║*  *╰━━━ঔৣ͡➳ ✦ ❖ ✦ ➳ঔৣ͡━━━╯*');
  L.push('*║*');
  L.push('*║*  *╭━━✯ ❖ 𝐀𝐁𝐑𝐄𝐕𝐈𝐀𝐃𝐎𝐒 ❖ ✯━━╮*');
  L.push('*║*  *│  ✧ ❖ ✦ ❖ ✧ ❖ ✦ ❖ ✧*');
  L.push('*║*  *│*');
  L.push('*║*  *│  ' + orn + '🔮 ' + p + 's | sticker*');
  L.push('*║*  *│  ' + orn + '🔮 ' + p + 'd | delete*');
  L.push('*║*  *│  ' + orn + '🔮 ' + p + 'p | play*');
  L.push('*║*  *│  ' + orn + '🔮 ' + p + 'menu | este menu*');
  L.push('*║*  *│  ' + orn + '🔮 ' + p + 'ping*');
  L.push('*║*  *│  ' + orn + '🔮 ' + p + 'perfil*');
  L.push('*║*  *│*');
  L.push('*║*  *│  ✧ ❖ ✦ ❖ ✧ ❖ ✦ ❖ ✧*');
  L.push('*║*  *╰━━━ঔৣ͡➳ ✦ ❖ ✦ ➳ঔৣ͡━━━╯*');
  L.push('*╚══━━❦ۜ✯ۣۜৡ ✧ ❖ ✧ ৡۣۜ✯ۜ─━━══╝*');
  L.push('');
  L.push('*╔══━━❦ۜ✯ۣۜৡ ✧ ❖ ✧ ৡۣۜ✯ۜ─━━══╗*');
  L.push('*『 𝐁𝐄𝐀𝐓𝐑𝐈𝐙 𝐁𝐎𝐓 』*');
  L.push('*𝐃𝐨𝐧𝐨: Ebai · +258 874288439*');
  L.push('*╚══━━❦ۜ✯ۣۜৡ ✧ ❖ ✧ ৡۣۜ✯ۜ─━━══╝*');

  return L.join(String.fromCharCode(10));
}





function categoryMenuTheme(meta, cmds, prefix, category) {
  const p = prefix || '!';
  const title = (meta && meta.title) || 'MENU';
  const orn = 'ঔৣֳ̤᷈͜͝͡';
  const catEmoji = (typeof btzCatEmoji === 'function')
    ? btzCatEmoji(title, category)
    : ((meta && meta.emoji) || '🔮');
  // nunca usar coracao no RPG
  const safeEmoji = (catEmoji === '❤️' || catEmoji === '❤') ? '🎐' : catEmoji;

  const groups = (typeof btzGroupCommands === 'function')
    ? btzGroupCommands(category || '', cmds)
    : [{ title: null, emoji: safeEmoji, items: (cmds || []).slice().sort(function (a, b) {
        return String(a.name).localeCompare(String(b.name));
      }) }];

  const total = groups.reduce(function (n, g) { return n + g.items.length; }, 0);
  const lines = [];
  lines.push('╔══━─❦ ✧ ❖ ✧ ─━━╗');
  lines.push('║  ╭━━✯ ❖ ' + safeEmoji + ' ' + title + ' ❖ ✯━━╮');
  lines.push('║  │');

  for (let g = 0; g < groups.length; g++) {
    const gr = groups[g];
    if (gr.title) {
      lines.push('║  │');
      lines.push('║  ├─ ' + gr.title);
    }
    const rowEm = gr.emoji || safeEmoji;
    for (let i = 0; i < gr.items.length; i++) {
      const c = gr.items[i];
      let al = '';
      if (c.aliases && c.aliases.length) al = ' (' + String(c.aliases[0]) + ')';
      lines.push('║  │  ' + orn + rowEm + ' *' + p + c.name + '*' + al);
    }
  }

  lines.push('║  │');
  lines.push('║  │  Total: *' + total + '* comandos');
  lines.push('║  ╰━━━✦ ❖ ✦━━━╯');
  lines.push('╚══━─❦ ✧ ❖ ✧ ─━━╝');
  return lines.join(String.fromCharCode(10));
}


function invalidCommandBox(userTag, typed, suggestion, accuracy, botName) {
  return (
`┏━━━━━━━━━━━━━━━━━┓
┃ ❌ *COMANDO INVÁLIDO*
┃
┃ ➥ *Usuário:* ${userTag}
┃ ➥ *Digitou:* ${typed}
┃ ➥ *Sugestão:* ${suggestion || '—'}
┃ ➥ *Precisão:* ${accuracy != null ? accuracy + '%' : '—'}
┗━━━━━━━━━━━━━━━━━┛
> ${botName || 'Beatriz Bot'}`
  );
}

/** Similaridade simples (Levenshtein ratio) */
function similarity(a, b) {
  a = String(a || '').toLowerCase();
  b = String(b || '').toLowerCase();
  if (!a || !b) return 0;
  if (a === b) return 100;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, function () { return new Array(n + 1).fill(0); });
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  const dist = dp[m][n];
  const maxLen = Math.max(m, n);
  return Math.round((1 - dist / maxLen) * 100);
}

function findSuggestion(typed, commandNames) {
  let best = null;
  let bestScore = 0;
  const t = String(typed || '').toLowerCase();
  for (let i = 0; i < commandNames.length; i++) {
    const name = commandNames[i];
    const sc = similarity(t, name);
    if (sc > bestScore) {
      bestScore = sc;
      best = name;
    }
  }
  if (bestScore < 40) return { suggestion: null, accuracy: bestScore };
  return { suggestion: best, accuracy: bestScore };
}

module.exports = {
  btzGroupCommands,
  useNewTheme,
  mainMenuTheme,
  categoryMenuTheme,
  invalidCommandBox,
  similarity,
  findSuggestion
};
