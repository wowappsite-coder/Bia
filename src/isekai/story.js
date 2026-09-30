const CHAPTERS = [
  { id: 1, name: 'Chegada ao Mundo', need: {} },
  { id: 2, name: 'Primeira Cidade', need: { explore: 1 } },
  { id: 3, name: 'A Guilda', need: { guild: true } },
  { id: 4, name: 'Primeira Dungeon', need: { dungeon: 1 } },
  { id: 5, name: 'Conflito entre Reinos', need: { level: 8 } },
  { id: 6, name: 'Sombra no Horizonte', need: { level: 12, kills: 20 } },
  { id: 7, name: 'Provacao', need: { level: 18 } }
];

const WORLD_EVENTS = [
  { id: 'dragao', name: 'Aparicao de Dragao', durMin: 45, effect: 'perigo+' },
  { id: 'guerra', name: 'Rumores de Guerra', durMin: 60, effect: 'guerra' },
  { id: 'invasao', name: 'Invasao de Monstros', durMin: 30, effect: 'monstros+' },
  { id: 'torneio', name: 'Torneio Real', durMin: 40, effect: 'torneio' },
  { id: 'festival', name: 'Festival da Colheita', durMin: 50, effect: 'comercio+' },
  { id: 'tempestade', name: 'Tempestade Magica', durMin: 25, effect: 'viagem-' },
  { id: 'colheita', name: 'Grande Colheita', durMin: 35, effect: 'comida+' },
  { id: 'crise', name: 'Crise Economica', durMin: 40, effect: 'precos+' }
];

const RUMORS = [
  'Um dragao foi visto ao norte das montanhas.',
  'Um aventureiro desapareceu perto das ruinas.',
  'Ha uma dungeon proibida sob a capital.',
  'Uma guerra entre reinos pode comecar em breve.',
  'O mercado de Eloria paga bem por cristais.',
  'Uma princesa procura um heroi... ou um tolo.',
  'Na floresta ha um santuario esquecido.',
  'Bandidos controlam a estrada a noite.',
  'Um culto sombrio reune-se na caverna.',
  'A academia esconde um livro proibido.'
];

const KINGDOMS = {
  arvandia: {
    id: 'arvandia', name: 'Reino de Arvandia', capital: 'capital',
    gov: 'Monarquia', safety: 70, wealth: 65, pop: 'grande'
  },
  nordheim: {
    id: 'nordheim', name: 'Nordheim', capital: null,
    gov: 'Clas', safety: 45, wealth: 40, pop: 'media'
  },
  solaria: {
    id: 'solaria', name: 'Solaria', capital: null,
    gov: 'Conselho', safety: 60, wealth: 55, pop: 'media'
  }
};

function ensureStory(data) {
  if (data.chapter == null) data.chapter = 1;
  if (!data.storyFlags) data.storyFlags = {};
  if (!data.historyLog) data.historyLog = [];
  if (!data.rumorsHeard) data.rumorsHeard = [];
  if (!data.kingdomRep) data.kingdomRep = {};
  if (!data.worldEvent) data.worldEvent = null;
  if (!data.counters) data.counters = data.counters || {};
  if (data.counters.kills == null) data.counters.kills = 0;
  if (data.counters.dungeon == null) data.counters.dungeon = 0;
  if (data.counters.explore == null) data.counters.explore = 0;
  return data;
}

function logEvent(data, text) {
  ensureStory(data);
  data.historyLog.push({ t: Date.now(), text: String(text).slice(0, 120) });
  if (data.historyLog.length > 40) data.historyLog = data.historyLog.slice(-40);
}

function checkChapter(data) {
  ensureStory(data);
  let changed = false;
  for (let i = 0; i < CHAPTERS.length; i++) {
    const ch = CHAPTERS[i];
    if (data.chapter >= ch.id) continue;
    const need = ch.need || {};
    let ok = true;
    if (need.level && (data.level || 1) < need.level) ok = false;
    if (need.explore && (data.counters.explore || 0) < need.explore) ok = false;
    if (need.dungeon && (data.counters.dungeon || 0) < need.dungeon) ok = false;
    if (need.kills && (data.counters.kills || 0) < need.kills) ok = false;
    if (need.guild && !data.guild) ok = false;
    if (ok && ch.id === data.chapter + 1) {
      data.chapter = ch.id;
      logEvent(data, 'Capitulo ' + ch.id + ': ' + ch.name);
      changed = true;
    }
  }
  return changed;
}

function rollWorldEvent(data) {
  ensureStory(data);
  const now = Date.now();
  if (data.worldEvent && data.worldEvent.until > now) return data.worldEvent;
  if (Math.random() < 0.18) {
    const e = WORLD_EVENTS[Math.floor(Math.random() * WORLD_EVENTS.length)];
    data.worldEvent = {
      id: e.id, name: e.name, effect: e.effect,
      until: now + e.durMin * 60 * 1000
    };
    logEvent(data, 'Evento: ' + e.name);
    return data.worldEvent;
  }
  data.worldEvent = null;
  return null;
}

function randomRumor(data) {
  ensureStory(data);
  const r = RUMORS[Math.floor(Math.random() * RUMORS.length)];
  if (data.rumorsHeard.indexOf(r) < 0) data.rumorsHeard.push(r);
  if (data.rumorsHeard.length > 15) data.rumorsHeard = data.rumorsHeard.slice(-15);
  return r;
}

function addKingdomRep(data, kid, delta) {
  ensureStory(data);
  data.kingdomRep[kid] = Math.max(-100, Math.min(100, (data.kingdomRep[kid] || 0) + delta));
  return data.kingdomRep[kid];
}

function storyStatus(data) {
  ensureStory(data);
  checkChapter(data);
  const ch = CHAPTERS.find(function (c) { return c.id === data.chapter; }) || CHAPTERS[0];
  const next = CHAPTERS.find(function (c) { return c.id === data.chapter + 1; });
  return { chapter: ch, next: next, flags: data.storyFlags, log: data.historyLog.slice(-8) };
}

module.exports = {
  CHAPTERS, WORLD_EVENTS, RUMORS, KINGDOMS,
  ensureStory, logEvent, checkChapter, rollWorldEvent,
  randomRumor, addKingdomRep, storyStatus
};
