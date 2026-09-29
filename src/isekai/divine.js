const GODS = [
  { id: 'luz', name: 'Deus da Luz', emoji: '☀️' },
  { id: 'trevas', name: 'Deus das Trevas', emoji: '🌑' },
  { id: 'guerra', name: 'Deus da Guerra', emoji: '⚔️' },
  { id: 'natureza', name: 'Deusa da Natureza', emoji: '🌿' },
  { id: 'oceanos', name: 'Deus dos Oceanos', emoji: '🌊' },
  { id: 'chamas', name: 'Deus das Chamas', emoji: '🔥' },
  { id: 'gelo', name: 'Deusa do Gelo', emoji: '❄️' },
  { id: 'raios', name: 'Deus dos Raios', emoji: '⚡' },
  { id: 'tempo', name: 'Deus do Tempo', emoji: '🕰️' },
  { id: 'espaco', name: 'Deus do Espaco', emoji: '🌌' },
  { id: 'morte', name: 'Deus da Morte', emoji: '💀' },
  { id: 'criacao', name: 'Deus da Criacao', emoji: '✨' }
];

const BLESSINGS = {
  luz: { name: 'Bencao da Luz', bonus: { magia: 3 }, durationMs: 2 * 60 * 60 * 1000 },
  trevas: { name: 'Bencao das Trevas', bonus: { forca: 2, agilidade: 2 }, durationMs: 2 * 60 * 60 * 1000 },
  guerra: { name: 'Bencao da Guerra', bonus: { forca: 4 }, durationMs: 90 * 60 * 1000 },
  natureza: { name: 'Bencao da Natureza', bonus: { vitalidade: 3 }, durationMs: 2 * 60 * 60 * 1000 },
  chamas: { name: 'Bencao das Chamas', bonus: { magia: 2, forca: 2 }, durationMs: 90 * 60 * 1000 },
  raios: { name: 'Bencao dos Raios', bonus: { precisao: 3, agilidade: 2 }, durationMs: 90 * 60 * 1000 }
};

const POWER_TIERS = ['Humano', 'Sobrenatural', 'Lendario', 'Mitico', 'Divino', 'Transcendente', 'Absoluto'];

function ensureDivine(data) {
  if (!data.godFavor) data.godFavor = {};
  if (!data.blessings) data.blessings = [];
  if (!data.pact) data.pact = null;
  if (data.powerTier == null) data.powerTier = 0;
  if (data.transcended == null) data.transcended = false;
  if (data.immortalCharges == null) data.immortalCharges = 0;
  if (!data.cooldowns) data.cooldowns = {};
  if (!data.inventory) data.inventory = {};
  if (data.iene == null) data.iene = 0;
  if (!data.titles) data.titles = [];
  return data;
}

function clearExpiredBlessings(data) {
  ensureDivine(data);
  const now = Date.now();
  data.blessings = (data.blessings || []).filter(function (b) { return b.until > now; });
}

function favor(data, godId) {
  return data.godFavor[godId] || 0;
}

function addFavor(data, godId, delta) {
  ensureDivine(data);
  data.godFavor[godId] = Math.max(-100, Math.min(100, favor(data, godId) + delta));
  return data.godFavor[godId];
}

function offer(data, godId, itemId) {
  ensureDivine(data);
  const god = GODS.find(function (g) { return g.id === godId; });
  if (!god) return { ok: false, msg: 'Deus desconhecido. iskdeuses' };
  const now = Date.now();
  if ((data.cooldowns['offer_' + godId] || 0) > now) {
    return { ok: false, msg: 'Espera para oferecer de novo a este deus.' };
  }
  let delta = 5;
  if (itemId === 'iene' || itemId === 'money') {
    const cost = 30;
    if ((data.iene || 0) < cost) return { ok: false, msg: 'Oferenda minima: Y30.' };
    data.iene -= cost;
    delta = 8;
  } else {
    if ((data.inventory[itemId] || 0) < 1) return { ok: false, msg: 'Nao tens esse item.' };
    data.inventory[itemId]--;
    if (data.inventory[itemId] <= 0) delete data.inventory[itemId];
    if (itemId === 'cristal' || itemId === 'nucleo' || itemId === 'escama') delta = 12;
  }
  data.cooldowns['offer_' + godId] = now + 120000;
  const f = addFavor(data, godId, delta);
  return { ok: true, favor: f, god: god, delta: delta };
}

function pray(data, godId) {
  ensureDivine(data);
  clearExpiredBlessings(data);
  const god = GODS.find(function (g) { return g.id === godId; });
  if (!god) return { ok: false, msg: 'Deus desconhecido.' };
  const now = Date.now();
  if ((data.cooldowns.pray || 0) > now) {
    return { ok: false, msg: 'Ja oraste recentemente.' };
  }
  data.cooldowns.pray = now + 180000;
  const f = addFavor(data, godId, 3);
  let blessed = null;
  if (f >= 25 && Math.random() < 0.35 && BLESSINGS[godId]) {
    const bl = BLESSINGS[godId];
    data.blessings = data.blessings.filter(function (b) { return b.god !== godId; });
    data.blessings.push({
      god: godId, name: bl.name, bonus: bl.bonus, until: now + bl.durationMs
    });
    blessed = bl.name;
  }
  return { ok: true, favor: f, god: god, blessed: blessed };
}

function makePact(data, godId) {
  ensureDivine(data);
  const god = GODS.find(function (g) { return g.id === godId; });
  if (!god) return { ok: false, msg: 'Deus desconhecido.' };
  if (data.pact) return { ok: false, msg: 'Ja tens pacto com: ' + data.pact.god };
  if (favor(data, godId) < 40) return { ok: false, msg: 'Favor insuficiente (min 40).' };
  const cost = 80;
  if ((data.iene || 0) < cost) return { ok: false, msg: 'Pacto custa Y' + cost };
  data.iene -= cost;
  data.pact = { god: godId, name: god.name, at: Date.now() };
  if (data.titles.indexOf('Pactuado') < 0) data.titles.push('Pactuado');
  if (BLESSINGS[godId]) {
    data.blessings.push({
      god: godId,
      name: BLESSINGS[godId].name + ' (Pacto)',
      bonus: BLESSINGS[godId].bonus,
      until: Date.now() + 24 * 60 * 60 * 1000
    });
  }
  return { ok: true, god: god };
}

function breakPact(data) {
  ensureDivine(data);
  if (!data.pact) return { ok: false, msg: 'Sem pacto.' };
  addFavor(data, data.pact.god, -25);
  data.pact = null;
  return { ok: true };
}

function tryTranscend(data) {
  ensureDivine(data);
  if (data.transcended) return { ok: false, msg: 'Ja transcendeste.' };
  const lv = data.level || 1;
  const pot = data.potential || 0;
  const favs = Object.keys(data.godFavor || {}).map(function (k) { return data.godFavor[k]; });
  const favMax = favs.length ? Math.max.apply(null, favs) : 0;
  if (lv < 20 && pot < 80 && favMax < 60) {
    return { ok: false, msg: 'Requisitos: nivel alto (\~20+) OU potencial alto OU favor >= 60.\n(Lv' + lv + ' Pot' + pot + ' Fav' + favMax + ')' };
  }
  if (!data.pact && favMax < 50) {
    return { ok: false, msg: 'Precisas de pacto ou favor elevado.' };
  }
  const cost = 200;
  if ((data.iene || 0) < cost) return { ok: false, msg: 'Ritual custa Y' + cost };
  data.iene -= cost;
  data.transcended = true;
  data.powerTier = Math.min(POWER_TIERS.length - 1, Math.max(4, (data.powerTier || 0) + 2));
  if (data.titles.indexOf('Transcendente') < 0) data.titles.push('Transcendente');
  data.hpMax = (data.hpMax || 100) + 30;
  data.manaMax = (data.manaMax || 50) + 20;
  data.hp = data.hpMax;
  data.mana = data.manaMax;
  data.immortalCharges = Math.min(1, (data.immortalCharges || 0) + 1);
  return { ok: true, tier: POWER_TIERS[data.powerTier] };
}

module.exports = {
  GODS, BLESSINGS, POWER_TIERS, ensureDivine, clearExpiredBlessings,
  favor, addFavor, offer, pray, makePact, breakPact, tryTranscend
};
