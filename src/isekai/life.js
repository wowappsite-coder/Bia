const PROF_LIST = [
  { id: 'fazendeiro', name: 'Fazendeiro', emoji: '🌾' },
  { id: 'minerador', name: 'Minerador', emoji: '⛏️' },
  { id: 'pescador', name: 'Pescador', emoji: '🎣' },
  { id: 'ferreiro', name: 'Ferreiro', emoji: '⚒️' },
  { id: 'alquimista', name: 'Alquimista', emoji: '🧪' },
  { id: 'cozinheiro', name: 'Cozinheiro', emoji: '🍳' },
  { id: 'artesao', name: 'Artesao', emoji: '🧵' },
  { id: 'encantador', name: 'Encantador', emoji: '🪄' },
  { id: 'mercador', name: 'Mercador', emoji: '🛒' },
  { id: 'cacador', name: 'Cacador', emoji: '🏹' },
  { id: 'herbalista', name: 'Herbalista', emoji: '🌿' },
  { id: 'lenhador', name: 'Lenhador', emoji: '🪚' }
];

const SEEDS = {
  trigo: { id: 'trigo', name: 'Trigo', growMs: 3 * 60 * 1000, yield: ['trigo_grao', 2, 4], cost: 5 },
  cenoura: { id: 'cenoura', name: 'Cenoura', growMs: 4 * 60 * 1000, yield: ['cenoura', 1, 3], cost: 6 },
  erva: { id: 'erva', name: 'Erva Medicinal', growMs: 5 * 60 * 1000, yield: ['erva', 1, 3], cost: 8 },
  milho: { id: 'milho', name: 'Milho', growMs: 4 * 60 * 1000, yield: ['milho', 2, 5], cost: 7 }
};

const FISH = [
  { id: 'peixe', name: 'Peixe comum', chance: 45, sell: 8 },
  { id: 'peixe_raro', name: 'Peixe raro', chance: 15, sell: 25 },
  { id: 'tesouro_pesca', name: 'Tesouro', chance: 5, sell: 60 },
  { id: 'cristal', name: 'Cristal', chance: 3, sell: 40 },
  { id: 'nada', name: 'Nada', chance: 32, sell: 0 }
];

const ORES = [
  { id: 'pedra', name: 'Pedra', chance: 35, sell: 2 },
  { id: 'ferro', name: 'Ferro', chance: 28, sell: 7 },
  { id: 'prata', name: 'Prata', chance: 12, sell: 18 },
  { id: 'ouro', name: 'Ouro', chance: 6, sell: 35 },
  { id: 'cristal', name: 'Cristal', chance: 8, sell: 25 },
  { id: 'nucleo', name: 'Nucleo Magico', chance: 2, sell: 60 },
  { id: 'nada', name: 'Nada', chance: 9, sell: 0 }
];

const NOBILITY = [
  { id: 0, name: 'Plebeu' },
  { id: 1, name: 'Campones' },
  { id: 2, name: 'Cidadao' },
  { id: 3, name: 'Nobre menor' },
  { id: 4, name: 'Barao' },
  { id: 5, name: 'Visconde' },
  { id: 6, name: 'Conde' },
  { id: 7, name: 'Marques' },
  { id: 8, name: 'Duque' },
  { id: 9, name: 'Principe' },
  { id: 10, name: 'Rei' }
];

const CD = {
  pescar: 45 * 1000,
  minerar: 50 * 1000,
  plantar: 10 * 1000,
  colher: 5 * 1000,
  forjar: 60 * 1000,
  alquimia: 40 * 1000,
  cozinhar: 30 * 1000
};

function ensureLife(data) {
  if (!data.profs) data.profs = {};
  if (!data.farm) data.farm = { plots: [], level: 1, maxPlots: 3 };
  if (!data.cooldowns) data.cooldowns = {};
  if (!data.inventory || typeof data.inventory !== 'object') data.inventory = {};
  if (data.iene == null) data.iene = 0;
  if (data.nobility == null) data.nobility = 0;
  if (!data.properties) data.properties = [];
  if (data.merchantSkill == null) data.merchantSkill = 0;
  return data;
}

function profXpNeed(lv) {
  return 20 + lv * 15;
}

function addProfXp(data, profId, amount) {
  ensureLife(data);
  if (!data.profs[profId]) data.profs[profId] = { level: 1, xp: 0 };
  const p = data.profs[profId];
  p.xp += amount;
  let ups = 0;
  while (p.xp >= profXpNeed(p.level) && p.level < 50) {
    p.xp -= profXpNeed(p.level);
    p.level += 1;
    ups += 1;
  }
  return { level: p.level, xp: p.xp, ups: ups };
}

function profLevel(data, profId) {
  ensureLife(data);
  return (data.profs[profId] && data.profs[profId].level) || 0;
}

function onCd(data, key) {
  ensureLife(data);
  const now = Date.now();
  if ((data.cooldowns[key] || 0) > now) {
    return { ok: false, left: Math.ceil((data.cooldowns[key] - now) / 1000) };
  }
  return { ok: true };
}

function setCd(data, key, ms) {
  data.cooldowns[key] = Date.now() + ms;
}

function addInv(data, id, qty) {
  ensureLife(data);
  qty = Math.floor(Number(qty) || 0);
  if (qty <= 0) return false;
  data.inventory[id] = (data.inventory[id] || 0) + qty;
  return true;
}

function remInv(data, id, qty) {
  ensureLife(data);
  qty = Math.floor(Number(qty) || 0);
  if ((data.inventory[id] || 0) < qty) return false;
  data.inventory[id] -= qty;
  if (data.inventory[id] <= 0) delete data.inventory[id];
  return true;
}

function plant(data, seedId) {
  ensureLife(data);
  const seed = SEEDS[seedId];
  if (!seed) return { ok: false, msg: 'Semente desconhecida. iskplantar trigo|cenoura|erva|milho' };
  const cd = onCd(data, 'plantar');
  if (!cd.ok) return { ok: false, msg: 'Espera ' + cd.left + 's.' };
  if (data.farm.plots.length >= data.farm.maxPlots) {
    return { ok: false, msg: 'Terreno cheio (' + data.farm.maxPlots + ' lotes). Colhe primeiro.' };
  }
  if ((data.iene || 0) < seed.cost) return { ok: false, msg: 'Precisas Y' + seed.cost + ' para semente.' };
  data.iene -= seed.cost;
  const readyAt = Date.now() + seed.growMs;
  data.farm.plots.push({ seed: seedId, name: seed.name, readyAt: readyAt });
  setCd(data, 'plantar', CD.plantar);
  addProfXp(data, 'fazendeiro', 5);
  return { ok: true, name: seed.name, mins: Math.ceil(seed.growMs / 60000) };
}

function harvest(data) {
  ensureLife(data);
  const cd = onCd(data, 'colher');
  if (!cd.ok) return { ok: false, msg: 'Espera ' + cd.left + 's.' };
  const now = Date.now();
  const ready = [];
  const keep = [];
  data.farm.plots.forEach(function (p) {
    if (p.readyAt <= now) ready.push(p);
    else keep.push(p);
  });
  if (!ready.length) {
    const next = data.farm.plots.map(function (p) {
      return p.name + ' \~' + Math.max(0, Math.ceil((p.readyAt - now) / 60000)) + 'min';
    });
    return { ok: false, msg: 'Nada maduro.\n' + (next.join('\n') || '(vazio)') };
  }
  data.farm.plots = keep;
  const got = [];
  ready.forEach(function (p) {
    const seed = SEEDS[p.seed];
    if (!seed) return;
    const y = seed.yield;
    const qty = y[1] + Math.floor(Math.random() * (y[2] - y[1] + 1));
    const bonus = Math.floor(profLevel(data, 'fazendeiro') / 5);
    const finalQty = qty + bonus;
    addInv(data, y[0], finalQty);
    got.push(y[0] + ' x' + finalQty);
  });
  setCd(data, 'colher', CD.colher);
  addProfXp(data, 'fazendeiro', 8 * ready.length);
  return { ok: true, got: got };
}

function fish(data) {
  ensureLife(data);
  const cd = onCd(data, 'pescar');
  if (!cd.ok) return { ok: false, msg: 'Espera ' + cd.left + 's.' };
  const lv = Math.max(1, profLevel(data, 'pescador'));
  let roll = Math.random() * 100;
  let pick = FISH[FISH.length - 1];
  for (let i = 0; i < FISH.length; i++) {
    const boost = FISH[i].id === 'peixe_raro' || FISH[i].id === 'cristal' ? Math.min(8, lv) : 0;
    if (roll < FISH[i].chance + boost) { pick = FISH[i]; break; }
    roll -= FISH[i].chance;
  }
  setCd(data, 'pescar', CD.pescar);
  addProfXp(data, 'pescador', 6);
  if (pick.id === 'nada') return { ok: true, got: null, msg: 'Nao pescaste nada...' };
  addInv(data, pick.id === 'tesouro_pesca' ? 'pergaminho' : pick.id, 1);
  const itemId = pick.id === 'tesouro_pesca' ? 'pergaminho' : pick.id;
  return { ok: true, got: itemId, name: pick.name };
}

function mine(data) {
  ensureLife(data);
  const cd = onCd(data, 'minerar');
  if (!cd.ok) return { ok: false, msg: 'Espera ' + cd.left + 's.' };
  const lv = Math.max(1, profLevel(data, 'minerador'));
  let roll = Math.random() * 100;
  let pick = ORES[ORES.length - 1];
  for (let i = 0; i < ORES.length; i++) {
    const boost = (ORES[i].id === 'ouro' || ORES[i].id === 'nucleo') ? Math.min(5, Math.floor(lv / 2)) : Math.min(3, Math.floor(lv / 3));
    if (roll < ORES[i].chance + boost) { pick = ORES[i]; break; }
    roll -= ORES[i].chance;
  }
  setCd(data, 'minerar', CD.minerar);
  addProfXp(data, 'minerador', 6);
  if (pick.id === 'nada') return { ok: true, got: null, msg: 'So pedras soltas...' };
  const qty = 1 + (Math.random() < 0.2 ? 1 : 0);
  addInv(data, pick.id, qty);
  return { ok: true, got: pick.id, qty: qty, name: pick.name };
}

function forge(data, recipeId) {
  ensureLife(data);
  const cd = onCd(data, 'forjar');
  if (!cd.ok) return { ok: false, msg: 'Espera ' + cd.left + 's.' };
  if (profLevel(data, 'ferreiro') < 1) {
    data.profs.ferreiro = data.profs.ferreiro || { level: 1, xp: 0 };
  }
  const recipes = {
    espada_ferro: { need: { ferro: 3, madeira: 1 }, result: 'espada_ferro' },
    peitoral_ferro: { need: { ferro: 5, couro: 2 }, result: 'peitoral_ferro' },
    escudo_ferro: { need: { ferro: 4, madeira: 1 }, result: 'escudo_ferro' }
  };
  const rec = recipes[recipeId];
  if (!rec) return { ok: false, msg: 'Receitas: espada_ferro | peitoral_ferro | escudo_ferro' };
  for (const m of Object.keys(rec.need)) {
    if ((data.inventory[m] || 0) < rec.need[m]) {
      return { ok: false, msg: 'Falta ' + m + ' x' + rec.need[m] };
    }
  }
  for (const m of Object.keys(rec.need)) remInv(data, m, rec.need[m]);
  addInv(data, rec.result, 1);
  setCd(data, 'forjar', CD.forjar);
  addProfXp(data, 'ferreiro', 10);
  return { ok: true, result: rec.result };
}

function alchemy(data, recipeId) {
  ensureLife(data);
  const cd = onCd(data, 'alquimia');
  if (!cd.ok) return { ok: false, msg: 'Espera ' + cd.left + 's.' };
  if (!data.profs.alquimista) data.profs.alquimista = { level: 1, xp: 0 };
  const recipes = {
    pocao: { need: { erva: 2, agua_magica: 1 }, result: 'pocao' },
    antidoto: { need: { erva: 1, agua_magica: 1 }, result: 'antidoto' },
    mana_pocao: { need: { erva: 1, cristal: 1 }, result: 'mana_pocao' }
  };
  const rec = recipes[recipeId];
  if (!rec) return { ok: false, msg: 'Receitas: pocao | antidoto | mana_pocao' };
  for (const m of Object.keys(rec.need)) {
    if ((data.inventory[m] || 0) < rec.need[m]) {
      return { ok: false, msg: 'Falta ' + m + ' x' + rec.need[m] };
    }
  }
  for (const m of Object.keys(rec.need)) remInv(data, m, rec.need[m]);
  addInv(data, rec.result, 1);
  setCd(data, 'alquimia', CD.alquimia);
  addProfXp(data, 'alquimista', 8);
  return { ok: true, result: rec.result };
}

function cook(data, recipeId) {
  ensureLife(data);
  const cd = onCd(data, 'cozinhar');
  if (!cd.ok) return { ok: false, msg: 'Espera ' + cd.left + 's.' };
  if (!data.profs.cozinheiro) data.profs.cozinheiro = { level: 1, xp: 0 };
  const recipes = {
    sopa: { need: { carne: 1, erva: 1 }, result: 'sopa' },
    carne: { need: { peixe: 1 }, result: 'carne' }
  };
  const rec = recipes[recipeId];
  if (!rec) return { ok: false, msg: 'Receitas: sopa | carne' };
  for (const m of Object.keys(rec.need)) {
    if ((data.inventory[m] || 0) < rec.need[m]) {
      return { ok: false, msg: 'Falta ' + m + ' x' + rec.need[m] };
    }
  }
  for (const m of Object.keys(rec.need)) remInv(data, m, rec.need[m]);
  addInv(data, rec.result, 1);
  setCd(data, 'cozinhar', CD.cozinhar);
  addProfXp(data, 'cozinheiro', 6);
  return { ok: true, result: rec.result };
}

function merchantDeal(data, mode) {
  ensureLife(data);
  const skill = data.merchantSkill || 0;
  if (mode === 'treino') {
    if ((data.iene || 0) < 20) return { ok: false, msg: 'Treino custa Y20.' };
    data.iene -= 20;
    data.merchantSkill = Math.min(50, skill + 1);
    addProfXp(data, 'mercador', 5);
    return { ok: true, msg: 'Skill mercador: ' + data.merchantSkill };
  }
  // venda rapida de peixe/materiais com bonus
  const bonus = Math.min(0.25, skill * 0.005);
  let sold = 0;
  let gain = 0;
  const prices = { peixe: 8, peixe_raro: 25, pedra: 2, ferro: 7, prata: 18, ouro: 35, couro: 6, osso: 4 };
  Object.keys(prices).forEach(function (id) {
    const q = data.inventory[id] || 0;
    if (q > 0) {
      const g = Math.floor(prices[id] * q * (1 + bonus));
      gain += g;
      sold += q;
      delete data.inventory[id];
    }
  });
  if (!sold) return { ok: false, msg: 'Nada para negociar (peixe/minerio/couro/osso).' };
  data.iene += gain;
  addProfXp(data, 'mercador', 4 + Math.floor(sold / 3));
  return { ok: true, sold: sold, gain: gain, bonus: Math.floor(bonus * 100) };
}

function nobilityInfo(data) {
  ensureLife(data);
  const rank = Math.max(0, Math.min(NOBILITY.length - 1, data.nobility || 0));
  return NOBILITY[rank];
}

function tryNobilityUp(data) {
  ensureLife(data);
  const cur = data.nobility || 0;
  if (cur >= 4) return { ok: false, msg: 'Titulos altos exigem quests/politica (partes futuras). Max agora: Barao.' };
  const needIene = [0, 100, 300, 800, 2000][cur + 1] || 99999;
  if ((data.iene || 0) < needIene) {
    return { ok: false, msg: 'Precisas Y' + needIene + ' para subir (tens Y' + data.iene + ').' };
  }
  data.iene -= needIene;
  data.nobility = cur + 1;
  return { ok: true, rank: nobilityInfo(data) };
}

module.exports = {
  PROF_LIST, SEEDS, FISH, ORES, NOBILITY, CD,
  ensureLife, addProfXp, profLevel, plant, harvest, fish, mine,
  forge, alchemy, cook, merchantDeal, nobilityInfo, tryNobilityUp
};
