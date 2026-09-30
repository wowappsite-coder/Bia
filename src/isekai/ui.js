/**
 * Menu Isekai completo + Assistente Rafael
 * So lista comandos tipicos do sistema — o jogador usa o que existir no bot
 */
const ASSISTANT_NAME = 'Rafael';
const ASSISTANT_ICON = '🔮';

/** Catalogo de categorias (comandos planejados/implementados) */
const MENU_CATS = {
  personagem: {
    title: 'PERSONAGEM', emoji: '🌌',
    cmds: ['iskstatus', 'iskpersonagem', 'iskatributos', 'iskhabilidades', 'iskvidas', 'iskhistorico', 'isktitulos', 'iskconquistas', 'isknivel']
  },
  aventura: {
    title: 'AVENTURA', emoji: '⚔️',
    cmds: ['isklutar', 'iskboss', 'iskdungeon', 'iskatacar', 'iskusar', 'iskdefender', 'iskfugir', 'iskduelo', 'iskdaceitar', 'iskbatalha', 'isktreinar', 'iskexplorar']
  },
  inventario: {
    title: 'INVENTARIO', emoji: '🎒',
    cmds: ['iskinventario', 'iskequipar', 'iskdesequipar', 'iskconsumir', 'iskcraft', 'iskusaritem']
  },
  economia: {
    title: 'ECONOMIA', emoji: '💰',
    cmds: ['isksaldo', 'iskloja', 'iskcomprar', 'iskvender']
  },
  profissoes: {
    title: 'PROFISSOES', emoji: '🌾',
    cmds: ['iskprofissoes', 'iskfazenda', 'iskplantar', 'iskcolher', 'iskpescar', 'iskminerar', 'iskforjar', 'iskalquimia', 'iskcozinhar', 'iskmercador', 'isknobreza', 'iskpropriedades']
  },
  guilda: {
    title: 'GUILDA & QUESTS', emoji: '🏰',
    cmds: ['iskguilda', 'iskguilda_entrar', 'iskquest', 'iskaceitarquest', 'iskqueststatus', 'iskconcluir', 'iskranking']
  },
  mundo: {
    title: 'MUNDO', emoji: '🗺️',
    cmds: ['iskmundo', 'iskmapa', 'isklocal', 'iskcidade', 'iskviajar', 'iskexplorar', 'iskeventos', 'iskeventomundo', 'iskfaccoes', 'iskreputacao', 'iskrumores', 'iskreinos', 'iskdescobrir', 'iskhistoria']
  },
  npcs: {
    title: 'NPCs', emoji: '👥',
    cmds: ['isknpc', 'iskfalar', 'iskrelacoes', 'iskrumores']
  },
  social: {
    title: 'RELACIONAMENTOS', emoji: '❤️',
    cmds: ['iskrelacoes', 'iskdar', 'isknamorar', 'iskcasar', 'iskterminar', 'iskescolhas', 'iskdecidir', 'iskeventossociais']
  },
  familia: {
    title: 'FAMILIA', emoji: '👨‍👩‍👧',
    cmds: ['iskfamilia']
  },
  party: {
    title: 'PARTY', emoji: '⚔️',
    cmds: ['iskparty', 'iskconvidar', 'iskexpulsar', 'iskacampamento']
  },
  vida: {
    title: 'VIDA & REENCARNACAO', emoji: '☠️',
    cmds: ['iskferimentos', 'iskcura', 'iskmorte', 'isklegado', 'iskreencarnar', 'iskvidas', 'iskhistorico']
  },
  magia: {
    title: 'MAGIA', emoji: '✨',
    cmds: ['iskmagia', 'iskescola', 'iskaula', 'isktreinar']
  },
  divino: {
    title: 'DIVINO', emoji: '🙏',
    cmds: ['iskdeuses', 'iskorar', 'iskoferecer', 'iskpacto', 'iskpacto_quebrar', 'iskbencaos', 'iskfavor', 'isktranscender', 'iskpoder']
  },
  destino: {
    title: 'DESTINO', emoji: '👑',
    cmds: ['iskdestino', 'iskalinhamento', 'iskheroi', 'iskvilao', 'iskreputacao', 'iskhistorico', 'iskdestino_log']
  },
  ranking: {
    title: 'RANKINGS', emoji: '🏆',
    cmds: ['iskranking', 'isknivel']
  },
  assistente: {
    title: 'ASSISTENTE', emoji: '🧠',
    cmds: ['iskajuda', 'iskdica', 'iskpainel']
  },
  sistema: {
    title: 'SISTEMA', emoji: '⚙️',
    cmds: ['iskiniciar', 'iskmodo', 'iskmodo_off', 'iskmenu']
  }
};

const CAT_ALIASES = {
  personagem: 'personagem', person: 'personagem', status: 'personagem',
  aventura: 'aventura', combate: 'aventura', battle: 'aventura',
  inventario: 'inventario', inv: 'inventario', bag: 'inventario',
  economia: 'economia', loja: 'economia', money: 'economia',
  profissoes: 'profissoes', profissao: 'profissoes', farm: 'profissoes',
  guilda: 'guilda', quest: 'guilda', quests: 'guilda',
  mundo: 'mundo', mapa: 'mundo', exploracao: 'mundo',
  npcs: 'npcs', npc: 'npcs',
  social: 'social', romance: 'social', relacoes: 'social',
  familia: 'familia', family: 'familia',
  party: 'party', grupo: 'party',
  vida: 'vida', morte: 'vida', reencarnar: 'vida',
  magia: 'magia', escola: 'magia',
  divino: 'divino', deuses: 'divino',
  destino: 'destino', alinhamento: 'destino',
  ranking: 'ranking', rank: 'ranking',
  assistente: 'assistente', ajuda: 'assistente', dica: 'assistente',
  sistema: 'sistema', system: 'sistema'
};

function bar(cur, max, size) {
  size = size || 10;
  max = Math.max(1, max || 1);
  cur = Math.max(0, Math.min(max, cur || 0));
  const filled = Math.round((cur / max) * size);
  return '█'.repeat(filled) + '░'.repeat(size - filled);
}

function panel(title, body) {
  return '╭━━〔 ' + title + ' 〕━━╮\n' + String(body || '').replace(/\n+$/, '') + '\n╰━━━━━━━━━━━━━━━━╯';
}

function formatMainMenu(data) {
  let head =
    '╭━━━━━━━━━━━━━━━━━━━━╮\n' +
    '┃  🌌 MODO ISEKAI 🌌  ┃\n' +
    '┃   「 AVENTURE-SE 」  ┃\n' +
    '╰━━━━━━━━━━━━━━━━━━━━╯\n';
  if (data && data.name) {
    const race = (data.race && (data.race.name || data.race)) || '-';
    const cls = (data.class && (data.class.name || data.class)) || '-';
    head +=
      '\n👤 ' + data.name +
      '\n🧬 ' + race + ' · ⚔️ ' + cls +
      '\n⭐ Nv ' + (data.level || 1) + ' · 🏅 ' + (data.rank || 'F') +
      '\n🪙 ' + (data.iene || 0) + ' IENE\n';
  }
  head +=
    '\n✦ SISTEMA ISEKAI ✦\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '🌌 personagem\n' +
    '⚔️ aventura\n' +
    '🎒 inventario\n' +
    '💰 economia\n' +
    '🌾 profissoes\n' +
    '🏰 guilda\n' +
    '🗺️ mundo\n' +
    '👥 npcs\n' +
    '❤️ social\n' +
    '👨‍👩‍👧 familia\n' +
    '⚔️ party\n' +
    '☠️ vida\n' +
    '✨ magia\n' +
    '🙏 divino\n' +
    '👑 destino\n' +
    '🏆 ranking\n' +
    '🧠 assistente\n' +
    '⚙️ sistema\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    'Abre categoria:\n' +
    '*iskmenu aventura*\n' +
    '*iskmenu personagem*\n' +
    '...\n' +
    '_Bot antigo: menu / loja_';
  return head;
}

function formatSubMenu(key) {
  const cat = MENU_CATS[key];
  if (!cat) {
    return 'Categoria invalida.\nUsa: iskmenu\nou iskmenu aventura|personagem|economia|...';
  }
  let body = cat.emoji + ' *' + cat.title + '*\n\n';
  cat.cmds.forEach(function (c) {
    body += '◇ `' + c + '`\n';
  });
  body += '\n← iskmenu';
  return panel(cat.title, body);
}

function listAllCategories() {
  return Object.keys(MENU_CATS);
}

function countMenuCmds() {
  let n = 0;
  Object.keys(MENU_CATS).forEach(function (k) {
    n += MENU_CATS[k].cmds.length;
  });
  return n;
}

function formatStatus(data) {
  if (!data) return 'Sem personagem.';
  const race = (data.race && (data.race.name || data.race)) || '-';
  const cls = (data.class && (data.class.name || data.class)) || '-';
  const a = data.attrs || {};
  const titles = (data.titles || []).slice(0, 5).join(', ') || 'nenhum';
  let body =
    '👤 *' + (data.name || '-') + '*\n' +
    '🧬 ' + race + ' · ⚔️ ' + cls + '\n' +
    '⭐ Nv ' + (data.level || 1) + ' · XP ' + (data.xp || 0) + '/' + (data.xpNext || '?') + '\n' +
    '🏅 Rank ' + (data.rank || 'F') + ' · 🎯 Pot ' + (data.potential || '-') + '\n\n' +
    '❤️ HP ' + bar(data.hp, data.hpMax) + ' ' + (data.hp || 0) + '/' + (data.hpMax || 0) + '\n' +
    '🔷 MP ' + bar(data.mana, data.manaMax, 8) + ' ' + (data.mana || 0) + '/' + (data.manaMax || 0) + '\n\n' +
    '⚔️ For ' + (a.forca || 0) + ' · 🛡️ Def ' + (a.defesa || 0) + '\n' +
    '💨 Agi ' + (a.agilidade || 0) + ' · 🔮 Mag ' + (a.magia || 0) + '\n' +
    '🎯 Prec ' + (a.precisao || 0) + ' · 🍀 Sort ' + (a.sorte || 0) + '\n\n' +
    '🪙 IENE: ' + (data.iene || 0) + '\n' +
    '🏷️ ' + titles;
  if (data.dead || data.deadPending) body += '\n\n☠️ ESTADO: FALECIDO';
  if (data.location) body += '\n📍 ' + data.location;
  return panel('STATUS', body);
}

function formatCombat(playerData, state) {
  if (!state || !state.enemy) return 'Sem combate.';
  const e = state.enemy;
  const body =
    '👤 *' + (playerData.name || 'Tu') + '*\n' +
    '❤️ ' + bar(state.playerHp, playerData.hpMax) + ' ' + state.playerHp + '/' + (playerData.hpMax || 0) + '\n' +
    '🔷 ' + bar(state.playerMana, playerData.manaMax, 8) + ' ' + state.playerMana + '\n\n' +
    '        ⚔️ VS\n\n' +
    (e.emoji || '👹') + ' *' + e.name + '*\n' +
    '❤️ ' + bar(e.hp, e.hpMax) + ' ' + e.hp + '/' + e.hpMax + '\n\n' +
    (state.type === 'dungeon' ? '🏰 Sala ' + state.room + '/' + state.maxRooms + '\n' : '') +
    'iskatacar · iskusar · iskdefender · iskfugir';
  return panel('COMBATE', body);
}

function formatVictory(enemy, rew) {
  let body =
    (enemy.emoji || '👹') + ' *' + enemy.name + '* derrotado!\n\n' +
    '⭐ XP +' + (rew.xp || 0) + '\n🪙 IENE +' + (rew.iene || 0);
  if (rew.loot && rew.loot.length) body += '\n\n🎁 ' + rew.loot.join(', ');
  if (rew.leveled) body += '\n\n⬆️ Level UP → Nv ' + rew.level;
  return panel('VITORIA', body);
}

function formatInventory(data) {
  const inv = data.inventory || {};
  const keys = Object.keys(inv).filter(function (k) { return inv[k] > 0; });
  let body = '🪙 IENE: ' + (data.iene || 0) + '\n\n';
  if (!keys.length) body += '(vazio)';
  else keys.slice(0, 25).forEach(function (k) { body += '◇ ' + k + ' ×' + inv[k] + '\n'; });
  return panel('INVENTARIO', body);
}

function assistant(data, context) {
  context = context || 'geral';
  const tips = [];
  const avoid = [];
  const hp = data.hp || 0;
  const hpMax = data.hpMax || 100;
  const pct = hp / Math.max(1, hpMax);
  const iene = data.iene || 0;
  const inv = data.inventory || {};
  const opens = {
    vitoria: ['Analise concluida.', 'Combate encerrado.', 'Resultado favoravel.'],
    derrota: ['Analise de combate concluida.'],
    geral: ['Analisei a tua situacao.', 'Sugestoes com base no teu estado.']
  };
  const open = (opens[context] || opens.geral);
  const line = open[Math.floor(Math.random() * open.length)];

  if (data.dead || data.deadPending) {
    return ASSISTANT_ICON + ' *' + ASSISTANT_NAME + '*\n' + line +
      '\nEstado: falecido.\n1. iskreencarnar\n2. iskmorte\n3. iskvidas';
  }
  if (pct < 0.25) {
    tips.push('iskconsumir pocao');
    avoid.push('iskboss / iskdungeon agora');
  } else if (pct < 0.45) tips.push('Recuperar HP antes de boss');
  if ((data.mana || 0) < 12) tips.push('iskconsumir mana_pocao');
  if (iene < 25 && Object.keys(inv).length) tips.push('iskvender materiais');
  if (iene >= 40) tips.push('iskloja · iskequipar');
  if ((data.level || 1) < 5) tips.push('isklutar · iskexplorar');
  else tips.push('iskdungeon');
  if (!data.guild) tips.push('iskguilda_entrar aventureiros');
  else tips.push('iskquest');
  if (context === 'vitoria') tips.push('iskinventario');
  if (context === 'derrota') {
    tips.push('iskconsumir pocao');
    avoid.push('Mesmo inimigo agora');
  }

  const seen = {};
  const uniq = [];
  tips.forEach(function (t) {
    if (!seen[t] && uniq.length < 5) { seen[t] = 1; uniq.push(t); }
  });

  let t = ASSISTANT_ICON + ' *' + ASSISTANT_NAME + '*\n' + line + '\n\n💡 Sugestoes:\n';
  uniq.forEach(function (x, i) { t += (i + 1) + '. ' + x + '\n'; });
  if (avoid.length) {
    t += '\n⚠️ Evita:\n';
    avoid.forEach(function (x) { t += '• ' + x + '\n'; });
  }
  return t.trim();
}

function withAssistant(mainMsg, data, context) {
  try {
    return String(mainMsg) + '\n\n' + assistant(data, context || 'geral');
  } catch (_) {
    return String(mainMsg);
  }
}

function formatMenu() {
  return formatMainMenu(null);
}

module.exports = {
  ASSISTANT_NAME, ASSISTANT_ICON, MENU_CATS, CAT_ALIASES,
  bar, panel, formatMenu, formatMainMenu, formatSubMenu,
  formatStatus, formatCombat, formatVictory, formatInventory,
  assistant, withAssistant, listAllCategories, countMenuCmds
};
