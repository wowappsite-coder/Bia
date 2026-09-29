const ALIGN = [
  { min: 60, label: 'Santo' },
  { min: 20, label: 'Bom' },
  { min: -19, label: 'Neutro' },
  { min: -59, label: 'Mal' },
  { min: -100, label: 'Extremamente Mal' }
];

function ensureDeath(data) {
  if (!data.wounds) data.wounds = [];
  if (data.dead == null) data.dead = false;
  if (data.deadPending == null) data.deadPending = false;
  if (!data.lifeHistory) data.lifeHistory = [];
  if (data.lifeNum == null) data.lifeNum = 1;
  if (data.alignment == null) data.alignment = 0;
  if (!data.path) data.path = 'aventureiro';
  if (!data.deathCause) data.deathCause = null;
  if (!data.cooldowns) data.cooldowns = {};
  if (!data.inventory) data.inventory = {};
  if (data.iene == null) data.iene = 0;
  if (!data.titles) data.titles = [];
  return data;
}

function alignLabel(v) {
  for (let i = 0; i < ALIGN.length; i++) {
    if (v >= ALIGN[i].min) return ALIGN[i].label;
  }
  return 'Neutro';
}

function addWound(data, type, severity) {
  ensureDeath(data);
  if (data.dead) return null;
  const ms = severity === 'grave' ? 30 * 60 * 1000 : severity === 'moderado' ? 15 * 60 * 1000 : 8 * 60 * 1000;
  const w = { type: type || 'corte', severity: severity || 'leve', at: Date.now(), until: Date.now() + ms };
  data.wounds.push(w);
  data.woundPen = data.woundPen || {};
  if (type === 'perna') data.woundPen.agilidade = (data.woundPen.agilidade || 0) + 2;
  if (type === 'braco') data.woundPen.forca = (data.woundPen.forca || 0) + 2;
  if (type === 'sangramento') data.woundPen.hpDrain = 1;
  return w;
}

function clearExpiredWounds(data) {
  ensureDeath(data);
  const now = Date.now();
  data.wounds = (data.wounds || []).filter(function (w) { return w.until > now; });
  if (!data.wounds.length) data.woundPen = {};
}

function healWounds(data, useItem) {
  ensureDeath(data);
  clearExpiredWounds(data);
  if (!data.wounds.length) return { ok: false, msg: 'Sem ferimentos.' };
  if (useItem) {
    if ((data.inventory.pocao_grande || 0) >= 1) {
      data.inventory.pocao_grande--;
      if (data.inventory.pocao_grande <= 0) delete data.inventory.pocao_grande;
      data.wounds = [];
      data.woundPen = {};
      data.hp = Math.min(data.hpMax || 100, (data.hp || 1) + 50);
      return { ok: true, msg: 'Pocao grande curou todos os ferimentos.' };
    }
    if ((data.inventory.pocao || 0) >= 1) {
      data.inventory.pocao--;
      if (data.inventory.pocao <= 0) delete data.inventory.pocao;
      data.wounds.shift();
      data.hp = Math.min(data.hpMax || 100, (data.hp || 1) + 25);
      return { ok: true, msg: 'Pocao curou 1 ferimento.' };
    }
    return { ok: false, msg: 'Precisas pocao ou pocao_grande.' };
  }
  data.wounds = data.wounds.filter(function (w) { return w.severity !== 'leve'; });
  return { ok: true, msg: 'Descanso tratou ferimentos leves.' };
}

function kill(data, cause) {
  ensureDeath(data);
  if (data.dead || data.deadPending) return { ok: false, msg: 'Ja estas morto.' };
  data.dead = true;
  data.deadPending = true;
  data.hp = 0;
  data.deathCause = cause || 'desconhecida';
  data.deathAt = new Date().toISOString();
  data._legacySnap = {
    name: data.name,
    level: data.level || 1,
    race: data.race,
    class: data.class,
    titles: (data.titles || []).slice(),
    iene: data.iene || 0,
    path: data.path,
    alignment: data.alignment,
    cause: data.deathCause,
    partner: data.marriedTo || data.partner || null,
    lifeNum: data.lifeNum || 1
  };
  return { ok: true, snap: data._legacySnap };
}

function reincarnate(data) {
  ensureDeath(data);
  if (!data.deadPending && !data.dead) return { ok: false, msg: 'Nao estas morto.' };
  if (data._reincarnating) return { ok: false, msg: 'Reencarnacao ja em curso.' };
  data._reincarnating = true;

  const snap = data._legacySnap || {
    name: data.name, level: data.level, race: data.race, class: data.class,
    iene: data.iene, cause: data.deathCause, lifeNum: data.lifeNum || 1
  };

  data.lifeHistory = data.lifeHistory || [];
  data.lifeHistory.push({
    life: snap.lifeNum || data.lifeNum || 1,
    name: snap.name,
    level: snap.level,
    race: snap.race && (snap.race.name || snap.race),
    class: snap.class && (snap.class.name || snap.class),
    cause: snap.cause,
    iene: snap.iene,
    at: data.deathAt || new Date().toISOString()
  });

  let inherited = 0;
  if (data.marriedTo && (data.iene || 0) > 0) {
    inherited = Math.floor(data.iene * 0.3);
  }

  const exceptional = Math.random() < 0.10;
  const memoryRoll = Math.random();
  let memory = 'nenhuma';
  if (memoryRoll < 0.05) memory = 'completa';
  else if (memoryRoll < 0.20) memory = 'parcial';
  else if (memoryRoll < 0.45) memory = 'fragmentada';

  const lifeNum = (data.lifeNum || 1) + 1;
  const keepAlign = data.alignment || 0;
  const keepPath = data.path || 'aventureiro';
  const history = data.lifeHistory.slice();

  let newChar = null;
  try {
    const { generateCharacter } = require('./character');
    newChar = generateCharacter(snap.name || data.name || 'Viajante');
  } catch (_) {}

  if (newChar) {
    Object.keys(data).forEach(function (k) {
      if (k === 'jid' || k === 'group_jid') return;
      delete data[k];
    });
    Object.assign(data, newChar);
  } else {
    data.level = 1;
    data.xp = 0;
    data.xpNext = 100;
    data.hp = 80;
    data.hpMax = 80;
    data.mana = 40;
    data.manaMax = 40;
    data.inventory = {};
    data.equipment = {};
  }

  if (exceptional) {
    data.potential = Math.max(data.potential || 50, 85 + Math.floor(Math.random() * 15));
    data.potentialLabel = 'Extraordinario';
    data.iene = 30 + Math.floor(Math.random() * 50);
    data.titles = ['Reencarnacao Abencoada'];
  } else {
    data.iene = Math.floor(Math.random() * 15);
    data.titles = [];
  }

  data.lifeNum = lifeNum;
  data.lifeHistory = history;
  data.dead = false;
  data.deadPending = false;
  data.deathCause = null;
  data.wounds = [];
  data.woundPen = {};
  data.memory = memory;
  data.alignment = Math.floor(keepAlign * 0.3);
  data.path = (keepPath === 'heroi' || keepPath === 'vilao') ? 'aventureiro' : keepPath;
  data.partner = null;
  data.marriedTo = null;
  data.family = {
    spouse: null, kids: [], marriedAt: null,
    inheritedNote: inherited > 0 ? ('Conjuge recebeu Y' + inherited) : null
  };
  data.party = [];
  data.location = 'vila_inicial';
  data.discovered = { vila_inicial: true };
  data._legacySnap = null;
  data._reincarnating = false;
  data.phase = 2;

  return {
    ok: true,
    exceptional: exceptional,
    memory: memory,
    lifeNum: lifeNum,
    inherited: inherited,
    name: data.name
  };
}

function shiftAlign(data, delta) {
  ensureDeath(data);
  data.alignment = Math.max(-100, Math.min(100, (data.alignment || 0) + delta));
  return data.alignment;
}

function setPath(data, path) {
  ensureDeath(data);
  if (path === 'heroi') {
    if ((data.alignment || 0) < 15 || (data.guildRep || 0) < 30) {
      return { ok: false, msg: 'Precisas alinhamento positivo e rep guilda >= 30.' };
    }
    data.path = 'heroi';
    if (data.titles.indexOf('Heroi') < 0) data.titles.push('Heroi');
    return { ok: true, path: 'heroi' };
  }
  if (path === 'vilao') {
    if ((data.alignment || 0) > -15) {
      return { ok: false, msg: 'Precisas alinhamento negativo (escolhas mas).' };
    }
    data.path = 'vilao';
    if (data.titles.indexOf('Vilao') < 0) data.titles.push('Vilao');
    return { ok: true, path: 'vilao' };
  }
  data.path = 'aventureiro';
  return { ok: true, path: 'aventureiro' };
}

function blockIfDead(data) {
  ensureDeath(data);
  if (data.dead || data.deadPending) return 'Morto. Usa iskmorte e iskreencarnar.';
  return null;
}

module.exports = {
  ensureDeath, alignLabel, addWound, clearExpiredWounds, healWounds,
  kill, reincarnate, shiftAlign, setPath, blockIfDead
};
