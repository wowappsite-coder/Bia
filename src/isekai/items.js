const ITEMS = {
  espada_ferro: { id:'espada_ferro', name:'Espada de Ferro', cat:'arma', rarity:'comum', buy:80, sell:32, slot:'arma', atk:8, dur:100 },
  espada_aco: { id:'espada_aco', name:'Espada de Aco', cat:'arma', rarity:'incomum', buy:160, sell:64, slot:'arma', atk:14, dur:120 },
  espada_magica: { id:'espada_magica', name:'Espada Magica', cat:'arma', rarity:'raro', buy:320, sell:128, slot:'arma', atk:18, mag:6, dur:110 },
  katana: { id:'katana', name:'Katana', cat:'arma', rarity:'raro', buy:280, sell:110, slot:'arma', atk:20, dur:100 },
  lanca_ferro: { id:'lanca_ferro', name:'Lanca de Ferro', cat:'arma', rarity:'comum', buy:70, sell:28, slot:'arma', atk:9, def:1, dur:100 },
  machado: { id:'machado', name:'Machado de Guerra', cat:'arma', rarity:'incomum', buy:150, sell:60, slot:'arma', atk:16, dur:90 },
  adaga: { id:'adaga', name:'Adaga', cat:'arma', rarity:'comum', buy:45, sell:18, slot:'arma', atk:6, agi:2, dur:80 },
  arco: { id:'arco', name:'Arco Simples', cat:'arma', rarity:'comum', buy:60, sell:24, slot:'arma', atk:7, prec:3, dur:90 },
  cajado: { id:'cajado', name:'Cajado de Aprendiz', cat:'arma', rarity:'comum', buy:55, sell:22, slot:'arma', atk:2, mag:10, dur:100 },
  grimorio: { id:'grimorio', name:'Grimorio Basico', cat:'arma', rarity:'incomum', buy:140, sell:56, slot:'arma', mag:14, dur:100 },
  capacete_couro: { id:'capacete_couro', name:'Capacete de Couro', cat:'armadura', rarity:'comum', buy:40, sell:16, slot:'cabeca', def:3, dur:80 },
  peitoral_couro: { id:'peitoral_couro', name:'Peitoral de Couro', cat:'armadura', rarity:'comum', buy:70, sell:28, slot:'peito', def:6, dur:90 },
  peitoral_ferro: { id:'peitoral_ferro', name:'Peitoral de Ferro', cat:'armadura', rarity:'incomum', buy:150, sell:60, slot:'peito', def:12, dur:120 },
  peitoral_aco: { id:'peitoral_aco', name:'Peitoral de Aco', cat:'armadura', rarity:'raro', buy:300, sell:120, slot:'peito', def:18, dur:140 },
  botas_couro: { id:'botas_couro', name:'Botas de Couro', cat:'armadura', rarity:'comum', buy:35, sell:14, slot:'pes', def:2, agi:1, dur:80 },
  luvas_ferro: { id:'luvas_ferro', name:'Luvas de Ferro', cat:'armadura', rarity:'incomum', buy:55, sell:22, slot:'maos', def:4, atk:1, dur:90 },
  escudo_madeira: { id:'escudo_madeira', name:'Escudo de Madeira', cat:'armadura', rarity:'comum', buy:50, sell:20, slot:'escudo', def:5, dur:70 },
  escudo_ferro: { id:'escudo_ferro', name:'Escudo de Ferro', cat:'armadura', rarity:'incomum', buy:120, sell:48, slot:'escudo', def:10, dur:110 },
  anel_forca: { id:'anel_forca', name:'Anel da Forca', cat:'acessorio', rarity:'incomum', buy:100, sell:40, slot:'anel', atk:3 },
  anel_magia: { id:'anel_magia', name:'Anel da Magia', cat:'acessorio', rarity:'incomum', buy:100, sell:40, slot:'anel', mag:3 },
  amuleto_vida: { id:'amuleto_vida', name:'Amuleto da Vida', cat:'acessorio', rarity:'raro', buy:200, sell:80, slot:'amuleto', hp:25 },
  colar_sorte: { id:'colar_sorte', name:'Colar da Sorte', cat:'acessorio', rarity:'raro', buy:180, sell:72, slot:'colar', sorte:5 },
  pocao: { id:'pocao', name:'Pocao de Cura', cat:'pocao', rarity:'comum', buy:25, sell:10, heal:40, consumable:true },
  pocao_grande: { id:'pocao_grande', name:'Pocao Grande', cat:'pocao', rarity:'incomum', buy:55, sell:22, heal:90, consumable:true },
  mana_pocao: { id:'mana_pocao', name:'Pocao de Mana', cat:'pocao', rarity:'comum', buy:30, sell:12, mana:35, consumable:true },
  antidoto: { id:'antidoto', name:'Antidoto', cat:'pocao', rarity:'incomum', buy:40, sell:16, consumable:true },
  pao: { id:'pao', name:'Pao', cat:'comida', rarity:'comum', buy:8, sell:3, heal:10, consumable:true },
  carne: { id:'carne', name:'Carne Assada', cat:'comida', rarity:'comum', buy:15, sell:6, heal:20, consumable:true },
  sopa: { id:'sopa', name:'Sopa Nutritiva', cat:'comida', rarity:'incomum', buy:22, sell:9, heal:30, mana:10, consumable:true },
  couro: { id:'couro', name:'Couro', cat:'material', rarity:'comum', buy:12, sell:6 },
  osso: { id:'osso', name:'Osso', cat:'material', rarity:'comum', buy:8, sell:4 },
  presa: { id:'presa', name:'Presa', cat:'material', rarity:'incomum', buy:20, sell:10 },
  pena: { id:'pena', name:'Pena', cat:'material', rarity:'comum', buy:6, sell:3 },
  ferro: { id:'ferro', name:'Minerio de Ferro', cat:'material', rarity:'comum', buy:15, sell:7 },
  cristal: { id:'cristal', name:'Cristal Magico', cat:'material', rarity:'raro', buy:50, sell:25 },
  nucleo: { id:'nucleo', name:'Nucleo Magico', cat:'material', rarity:'epico', buy:120, sell:60 },
  escama: { id:'escama', name:'Escama de Dragao', cat:'material', rarity:'lendario', buy:400, sell:200 },
  erva: { id:'erva', name:'Erva Medicinal', cat:'material', rarity:'comum', buy:10, sell:5 },
  agua_magica: { id:'agua_magica', name:'Agua Magica', cat:'material', rarity:'incomum', buy:18, sell:9 },
  madeira: { id:'madeira', name:'Madeira', cat:'material', rarity:'comum', buy:5, sell:2 },
  picareta: { id:'picareta', name:'Picareta', cat:'ferramenta', rarity:'comum', buy:45, sell:18 },
  vara_pesca: { id:'vara_pesca', name:'Vara de Pesca', cat:'ferramenta', rarity:'comum', buy:40, sell:16 },
  enxada: { id:'enxada', name:'Enxada', cat:'ferramenta', rarity:'comum', buy:35, sell:14 },
  pergaminho: { id:'pergaminho', name:'Pergaminho em Branco', cat:'magia', rarity:'comum', buy:20, sell:8 },
  chave_simples: { id:'chave_simples', name:'Chave Simples', cat:'util', rarity:'comum', buy:15, sell:5 }
};

const SHOP_CATS = {
  armas: { title:'Armas', cats:['arma'] },
  armaduras: { title:'Armaduras', cats:['armadura'] },
  pocoes: { title:'Pocoes', cats:['pocao'] },
  acessorios: { title:'Acessorios', cats:['acessorio'] },
  materiais: { title:'Materiais', cats:['material'] },
  comida: { title:'Comida', cats:['comida'] },
  magia: { title:'Magia', cats:['magia'] },
  ferramentas: { title:'Ferramentas', cats:['ferramenta'] },
  util: { title:'Utilidades', cats:['util'] }
};

const RECIPES = {
  pocao: { id:'pocao', result:'pocao', qty:1, need:{ erva:2, agua_magica:1 }, level:1 },
  pocao_grande: { id:'pocao_grande', result:'pocao_grande', qty:1, need:{ erva:3, agua_magica:2, cristal:1 }, level:5 },
  espada_ferro: { id:'espada_ferro', result:'espada_ferro', qty:1, need:{ ferro:3, madeira:1 }, level:1 },
  peitoral_ferro: { id:'peitoral_ferro', result:'peitoral_ferro', qty:1, need:{ ferro:5, couro:2 }, level:3 },
  sopa: { id:'sopa', result:'sopa', qty:1, need:{ carne:1, erva:1 }, level:1 }
};

const LOOT_TABLE = {
  default: [
    { id:'couro', chance:40, min:1, max:2 },
    { id:'osso', chance:30, min:1, max:2 }
  ],
  lobo: [
    { id:'couro', chance:55, min:1, max:3 },
    { id:'presa', chance:25, min:1, max:1 },
    { id:'osso', chance:20, min:1, max:2 }
  ],
  slime: [
    { id:'agua_magica', chance:35, min:1, max:2 },
    { id:'erva', chance:25, min:1, max:1 }
  ],
  goblin: [
    { id:'ferro', chance:30, min:1, max:2 },
    { id:'osso', chance:40, min:1, max:2 },
    { id:'pocao', chance:10, min:1, max:1 }
  ],
  boss: [
    { id:'cristal', chance:50, min:1, max:2 },
    { id:'nucleo', chance:25, min:1, max:1 },
    { id:'escama', chance:8, min:1, max:1 },
    { id:'pergaminho', chance:30, min:1, max:2 }
  ]
};

function getItem(id) { return ITEMS[id] || null; }

function listShop(catKey) {
  const conf = SHOP_CATS[catKey];
  if (!conf) return Object.values(ITEMS).filter(function (i) { return i.buy != null; });
  return Object.values(ITEMS).filter(function (i) {
    return conf.cats.indexOf(i.cat) >= 0 && i.buy != null;
  });
}

function rollLoot(enemy, luck) {
  luck = luck || 10;
  const key = (enemy && (enemy.lootKey || enemy.id || enemy.name || '')).toString().toLowerCase();
  let table = LOOT_TABLE.default;
  if (enemy && enemy.boss) table = LOOT_TABLE.boss;
  else if (LOOT_TABLE[key]) table = LOOT_TABLE[key];
  else {
    Object.keys(LOOT_TABLE).forEach(function (k) {
      if (k !== 'default' && k !== 'boss' && key.indexOf(k) >= 0) table = LOOT_TABLE[k];
    });
  }
  const out = [];
  const luckBonus = Math.min(12, Math.floor(luck / 15));
  table.forEach(function (row) {
    if (Math.random() * 100 < Math.min(85, row.chance + luckBonus)) {
      const qty = row.min + Math.floor(Math.random() * (row.max - row.min + 1));
      out.push({ id: row.id, qty: qty });
    }
  });
  return out;
}

module.exports = { ITEMS, SHOP_CATS, RECIPES, LOOT_TABLE, getItem, listShop, rollLoot };
