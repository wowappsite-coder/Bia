const GUILDS = [
  { id: 'aventureiros', name: 'Guilda dos Aventureiros', emoji: '⚔️' },
  { id: 'magos', name: 'Guilda dos Magos', emoji: '🧙' },
  { id: 'cacadores', name: 'Guilda dos Cacadores', emoji: '🏹' },
  { id: 'artesaos', name: 'Guilda dos Artesaos', emoji: '⚒️' },
  { id: 'mercadores', name: 'Guilda dos Mercadores', emoji: '🛒' },
  { id: 'sombria', name: 'Guilda Sombria', emoji: '🌑' },
  { id: 'sagrada', name: 'Ordem Sagrada', emoji: '☀️' }
];

const RANKS = [
  { id: 'F', min: 1 }, { id: 'E', min: 5 }, { id: 'D', min: 10 },
  { id: 'C', min: 15 }, { id: 'B', min: 22 }, { id: 'A', min: 30 },
  { id: 'S', min: 40 }, { id: 'SS', min: 50 }, { id: 'SSS', min: 60 },
  { id: 'EX', min: 80 }
];

const QUESTS = {
  caca_goblin: {
    id: 'caca_goblin', name: 'Caca aos Goblins', type: 'cacada',
    need: 5, key: 'kills', reward: { xp: 80, iene: 40 }, daily: true
  },
  pesca_dia: {
    id: 'pesca_dia', name: 'Pesca do Dia', type: 'pesca',
    need: 3, key: 'fish', reward: { xp: 40, iene: 25 }, daily: true
  },
  mina_dia: {
    id: 'mina_dia', name: 'Mineracao Diaria', type: 'mineracao',
    need: 3, key: 'mine', reward: { xp: 40, iene: 25 }, daily: true
  },
  explorar: {
    id: 'explorar', name: 'Explorar a Regiao', type: 'exploracao',
    need: 2, key: 'explore', reward: { xp: 50, iene: 30 }, daily: true
  },
  boss_semanal: {
    id: 'boss_semanal', name: 'Derrotar um Boss', type: 'boss',
    need: 1, key: 'boss', reward: { xp: 200, iene: 150 }, weekly: true
  }
};

const MAGIC_TIERS = ['Novato', 'Aprendiz', 'Adepto', 'Especialista', 'Mestre', 'Grande Mestre', 'Arquimago', 'Lendario', 'Divino'];

function xpForLevel(level) {
  return Math.floor(80 + level * 40 + Math.pow(level, 1.35) * 8);
}

function ensureProgress(data) {
  if (data.level == null) data.level = 1;
  if (data.xp == null) data.xp = 0;
  if (data.xpNext == null) data.xpNext = xpForLevel(data.level);
  if (!data.rank) data.rank = 'F';
  if (!data.guild) data.guild = null;
  if (data.guildRep == null) data.guildRep = 0;
  if (!data.quests) data.quests = {};
  if (!data.questProgress) data.questProgress = {};
  if (!data.questDone) data.questDone = {};
  if (!data.achievements) data.achievements = [];
  if (!data.titles) data.titles = data.titles || [];
  if (data.magicLevel == null) data.magicLevel = 0;
  if (data.magicXp == null) data.magicXp = 0;
  if (!data.cooldowns) data.cooldowns = {};
  if (!data.counters) data.counters = { kills: 0, fish: 0, mine: 0, explore: 0, boss: 0 };
  if (data.iene == null) data.iene = 0;
  return data;
}

function gainXp(data, amount) {
  ensureProgress(data);
  amount = Math.floor(Number(amount) || 0);
  if (amount <= 0) return { leveled: false, levels: 0 };
  // potencial acelera um pouco (max +25%)
  const pot = data.potential || 50;
  const mult = 1 + Math.min(0.25, (pot - 40) / 200);
  amount = Math.floor(amount * mult);
  data.xp = (data.xp || 0) + amount;
  let levels = 0;
  while (data.xp >= (data.xpNext || xpForLevel(data.level)) && data.level < 100) {
    data.xp -= data.xpNext || xpForLevel(data.level);
    data.level += 1;
    data.xpNext = xpForLevel(data.level);
    data.hpMax = (data.hpMax || 100) + 5;
    data.manaMax = (data.manaMax || 50) + 3;
    data.hp = data.hpMax;
    data.mana = data.manaMax;
    levels += 1;
  }
  tryRankUp(data);
  return { leveled: levels > 0, levels: levels, xp: data.xp, level: data.level };
}

function rankLabel(data) {
  ensureProgress(data);
  return data.rank || 'F';
}

function tryRankUp(data) {
  ensureProgress(data);
  let best = 'F';
  for (let i = 0; i < RANKS.length; i++) {
    if (data.level >= RANKS[i].min && data.guildRep >= (RANKS[i].min - 1) * 5) {
      best = RANKS[i].id;
    }
  }
  if (RANKS.findIndex(function (r) { return r.id === best; }) >
      RANKS.findIndex(function (r) { return r.id === data.rank; })) {
    data.rank = best;
    return true;
  }
  data.rank = data.rank || best;
  return false;
}

function joinGuild(data, guildId) {
  ensureProgress(data);
  const g = GUILDS.find(function (x) { return x.id === guildId; });
  if (!g) return { ok: false, msg: 'Guilda invalida. iskguilda' };
  if (data.guild === guildId) return { ok: false, msg: 'Ja estas nesta guilda.' };
  data.guild = guildId;
  data.guildRep = data.guildRep || 0;
  if (data.titles.indexOf('Membro de Guilda') < 0) data.titles.push('Membro de Guilda');
  return { ok: true, guild: g };
}

function acceptQuest(data, questId) {
  ensureProgress(data);
  const q = QUESTS[questId];
  if (!q) return { ok: false, msg: 'Quest desconhecida.' };
  const now = Date.now();
  if (data.quests[questId] && data.quests[questId].active) {
    return { ok: false, msg: 'Ja tens esta quest ativa.' };
  }
  if (q.daily && data.questDone[questId] && (now - data.questDone[questId]) < 20 * 60 * 60 * 1000) {
    return { ok: false, msg: 'Quest diaria em cooldown (\~20h).' };
  }
  if (q.weekly && data.questDone[questId] && (now - data.questDone[questId]) < 6 * 24 * 60 * 60 * 1000) {
    return { ok: false, msg: 'Quest semanal em cooldown.' };
  }
  data.quests[questId] = { active: true, progress: 0, need: q.need, key: q.key, at: now };
  data.questProgress[questId] = 0;
  return { ok: true, quest: q };
}

function bumpQuest(data, key, amount) {
  ensureProgress(data);
  amount = amount || 1;
  data.counters[key] = (data.counters[key] || 0) + amount;
  Object.keys(data.quests).forEach(function (qid) {
    const st = data.quests[qid];
    if (st && st.active && st.key === key) {
      st.progress = Math.min(st.need, (st.progress || 0) + amount);
      data.questProgress[qid] = st.progress;
    }
  });
}

function completeQuest(data, questId) {
  ensureProgress(data);
  const q = QUESTS[questId];
  const st = data.quests[questId];
  if (!q || !st || !st.active) return { ok: false, msg: 'Quest nao ativa.' };
  if ((st.progress || 0) < q.need) {
    return { ok: false, msg: 'Progresso ' + (st.progress || 0) + '/' + q.need };
  }
  st.active = false;
  data.questDone[questId] = Date.now();
  const rw = q.reward || {};
  const xpGain = gainXp(data, rw.xp || 0);
  data.iene = (data.iene || 0) + (rw.iene || 0);
  data.guildRep = (data.guildRep || 0) + 5;
  tryRankUp(data);
  addAchievement(data, 'quest_' + questId, 'Quest: ' + q.name);
  return { ok: true, quest: q, xp: rw.xp || 0, iene: rw.iene || 0, leveled: xpGain };
}

function addAchievement(data, id, label) {
  ensureProgress(data);
  if (data.achievements.indexOf(id) >= 0) return false;
  data.achievements.push(id);
  if (label && data.titles.indexOf(label) < 0 && data.titles.length < 20) {
    data.titles.push(label);
  }
  return true;
}

function studyMagic(data) {
  ensureProgress(data);
  const now = Date.now();
  if ((data.cooldowns.study || 0) > now) {
    return { ok: false, msg: 'Espera ' + Math.ceil((data.cooldowns.study - now) / 1000) + 's.' };
  }
  if ((data.iene || 0) < 15) return { ok: false, msg: 'Aula custa Y15.' };
  data.iene -= 15;
  data.cooldowns.study = now + 90000;
  data.magicXp = (data.magicXp || 0) + 10 + Math.floor(Math.random() * 8);
  const need = 30 + data.magicLevel * 25;
  let up = false;
  if (data.magicXp >= need && data.magicLevel < MAGIC_TIERS.length - 1) {
    data.magicXp -= need;
    data.magicLevel += 1;
    up = true;
  }
  gainXp(data, 8);
  return {
    ok: true,
    tier: MAGIC_TIERS[data.magicLevel] || 'Novato',
    magicLevel: data.magicLevel,
    magicXp: data.magicXp,
    up: up
  };
}

function train(data, attr) {
  ensureProgress(data);
  const allowed = ['forca', 'defesa', 'agilidade', 'magia', 'precisao', 'vitalidade'];
  if (allowed.indexOf(attr) < 0) {
    return { ok: false, msg: 'Atributos: ' + allowed.join(', ') };
  }
  const now = Date.now();
  if ((data.cooldowns.train || 0) > now) {
    return { ok: false, msg: 'Espera ' + Math.ceil((data.cooldowns.train - now) / 1000) + 's.' };
  }
  if ((data.iene || 0) < 10) return { ok: false, msg: 'Treino custa Y10.' };
  data.iene -= 10;
  data.cooldowns.train = now + 60000;
  if (!data.attrs) data.attrs = {};
  data.attrs[attr] = (data.attrs[attr] || 10) + 1;
  gainXp(data, 5);
  return { ok: true, attr: attr, value: data.attrs[attr] };
}

module.exports = {
  GUILDS, RANKS, QUESTS, MAGIC_TIERS, xpForLevel,
  ensureProgress, gainXp, rankLabel, tryRankUp, joinGuild,
  acceptQuest, bumpQuest, completeQuest, addAchievement,
  studyMagic, train
};
