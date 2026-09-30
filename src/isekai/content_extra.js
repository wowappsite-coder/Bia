/** Conteudo extra — monstro/itens regionais (nao substitui items.js) */
const REGION_MONSTERS = {
  floresta_verde: [
    { id: 'lobo_verde', name: 'Lobo Verde', emoji: '🐺', hp: 40, atk: 12, def: 4, spd: 14, xp: 18, iene: [5, 15] },
    { id: 'ent_jovem', name: 'Ent Jovem', emoji: '🌳', hp: 70, atk: 10, def: 12, spd: 4, xp: 28, iene: [8, 20] }
  ],
  ruinas: [
    { id: 'esqueleto_antigo', name: 'Esqueleto Antigo', emoji: '💀', hp: 55, atk: 14, def: 6, spd: 8, xp: 24, iene: [10, 25] },
    { id: 'sombra', name: 'Sombra', emoji: '👤', hp: 45, atk: 16, def: 3, spd: 16, xp: 30, iene: [12, 28] }
  ],
  caverna: [
    { id: 'morcego_gigante', name: 'Morcego Gigante', emoji: '🦇', hp: 35, atk: 11, def: 3, spd: 18, xp: 16, iene: [4, 12] },
    { id: 'golem_pedra', name: 'Golem de Pedra', emoji: '🪨', hp: 90, atk: 15, def: 18, spd: 3, xp: 40, iene: [15, 35] }
  ],
  ilha_nevoa: [
    { id: 'espectro', name: 'Espectro da Nevoa', emoji: '👻', hp: 60, atk: 18, def: 5, spd: 12, xp: 45, iene: [20, 40] }
  ]
};

const EXTRA_ITEMS = {
  amuleto_sorte: { id: 'amuleto_sorte', name: 'Amuleto da Sorte', cat: 'acessorio', rarity: 'incomum', buy: 120, sell: 50, sorte: 5, slot: 'acessorio' },
  capa_viajante: { id: 'capa_viajante', name: 'Capa de Viajante', cat: 'armadura', rarity: 'comum', buy: 60, sell: 25, def: 3, slot: 'corpo' },
  adaga_sombra: { id: 'adaga_sombra', name: 'Adaga Sombria', cat: 'arma', rarity: 'raro', buy: 200, sell: 80, atk: 12, slot: 'arma', dur: 80 },
  elixir_raro: { id: 'elixir_raro', name: 'Elixir Raro', cat: 'pocao', rarity: 'raro', buy: 150, sell: 60, heal: 80, mana: 40, consumable: true },
  cristal_divino: { id: 'cristal_divino', name: 'Cristal Divino', cat: 'material', rarity: 'lendario', buy: 0, sell: 200 }
};

function pickRegionalMonster(location, level) {
  const list = REGION_MONSTERS[location];
  if (!list || !list.length) return null;
  const base = list[Math.floor(Math.random() * list.length)];
  const m = Object.assign({}, base);
  const lv = Math.max(1, level || 1);
  m.hp = Math.floor(m.hp * (1 + lv * 0.05));
  m.hpMax = m.hp;
  m.atk = Math.floor(m.atk * (1 + lv * 0.04));
  m.xp = Math.floor(m.xp * (1 + lv * 0.03));
  return m;
}

module.exports = { REGION_MONSTERS, EXTRA_ITEMS, pickRegionalMonster };
