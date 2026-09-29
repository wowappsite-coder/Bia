const MONSTERS = [
  { id:'slime', name:'Slime', emoji:'🟢', rarity:'comum', level:1, hp:30, atk:6, def:2, spd:5, xp:8, iene:[1,4] },
  { id:'lobo', name:'Lobo', emoji:'🐺', rarity:'comum', level:2, hp:45, atk:10, def:4, spd:12, xp:14, iene:[2,6] },
  { id:'goblin', name:'Goblin', emoji:'👺', rarity:'comum', level:3, hp:50, atk:12, def:5, spd:10, xp:18, iene:[3,8] },
  { id:'esqueleto', name:'Esqueleto', emoji:'💀', rarity:'incomum', level:4, hp:60, atk:14, def:8, spd:8, xp:25, iene:[4,12] },
  { id:'orc', name:'Orc', emoji:'🪓', rarity:'incomum', level:5, hp:90, atk:18, def:12, spd:6, xp:35, iene:[6,15] },
  { id:'aranha', name:'Aranha Gigante', emoji:'🕷️', rarity:'incomum', level:4, hp:55, atk:15, def:6, spd:14, xp:28, iene:[4,10] },
  { id:'mago_sombrio', name:'Mago Sombrio', emoji:'🧙', rarity:'rara', level:7, hp:70, atk:22, def:8, spd:11, xp:50, iene:[10,25] },
  { id:'golem', name:'Golem de Pedra', emoji:'🗿', rarity:'rara', level:8, hp:140, atk:16, def:22, spd:3, xp:55, iene:[12,30] },
  { id:'wyvern', name:'Wyvern', emoji:'🐉', rarity:'epica', level:12, hp:200, atk:28, def:18, spd:16, xp:100, iene:[25,60] },
  { id:'lich', name:'Lich', emoji:'☠️', rarity:'lendaria', level:15, hp:250, atk:32, def:20, spd:12, xp:150, iene:[40,90] }
];
const BOSSES = [
  { id:'rei_goblin', name:'Rei Goblin', emoji:'👑', level:6, hp:180, atk:20, def:14, spd:9, xp:80, iene:[30,70],
    phases:[{ at:0.5, msg:'O Rei Goblin enlouquece!', atkMod:1.4 }] },
  { id:'dragao_menor', name:'Dragao Menor', emoji:'🔥', level:14, hp:400, atk:35, def:25, spd:14, xp:200, iene:[80,150],
    phases:[{ at:0.6, msg:'O dragao cospe fogo!', atkMod:1.3 },{ at:0.3, msg:'Furia draconica!', atkMod:1.6 }] },
  { id:'senhor_trevas', name:'Senhor das Trevas', emoji:'🌑', level:18, hp:500, atk:40, def:28, spd:15, xp:300, iene:[100,200],
    phases:[{ at:0.5, msg:'As trevas engolem o campo!', atkMod:1.5 }] }
];
function pickMonster(playerLevel) {
  const lv = playerLevel || 1;
  const pool = MONSTERS.filter(function (m) { return m.level <= lv + 3; });
  const list = pool.length ? pool : MONSTERS.slice(0, 3);
  return JSON.parse(JSON.stringify(list[Math.floor(Math.random() * list.length)]));
}
function pickBoss(playerLevel) {
  const lv = playerLevel || 1;
  let list = BOSSES.filter(function (b) { return b.level <= lv + 6; });
  if (!list.length) list = BOSSES;
  return JSON.parse(JSON.stringify(list[Math.floor(Math.random() * list.length)]));
}
module.exports = { MONSTERS, BOSSES, pickMonster, pickBoss };
