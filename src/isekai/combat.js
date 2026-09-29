const { pickMonster, pickBoss } = require('./monsters');
const { grantXp } = require('./xp');

let applyLootFn = null;
try { applyLootFn = require('./economy').applyLoot; } catch (_) {}
let wearEquipFn = null;
try { wearEquipFn = require('./economy').wearEquipment; } catch (_) {}
let dbBattle = null;
try {
  const dbi = require('./db');
  dbBattle = { save: dbi.saveBattleState, load: dbi.loadBattleState, clear: dbi.clearBattleState };
} catch (_) {}

const battles = new Map();
const pendingDuel = new Map();

function keyOf(jid, group) { return (group || 'global') + '|' + jid; }
function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function getBattle(jid, group) {
  const k = keyOf(jid, group);
  if (battles.has(k)) return battles.get(k);
  if (dbBattle) {
    try {
      const st = dbBattle.load(jid, group || 'global');
      if (st) { battles.set(k, st); return st; }
    } catch (_) {}
  }
  return null;
}

function setBattle(jid, group, state) {
  battles.set(keyOf(jid, group), state);
  if (dbBattle) { try { dbBattle.save(jid, group || 'global', state); } catch (_) {} }
}

function clearBattle(jid, group) {
  battles.delete(keyOf(jid, group));
  if (dbBattle) { try { dbBattle.clear(jid, group || 'global'); } catch (_) {} }
}

function calcDamage(attacker, defender, skill) {
  const a = attacker.attrs || {};
  const d = defender.attrs || defender;
  const isMagic = skill && (skill.type === 'magia' || skill.type === 'suporte');
  let base = skill ? (skill.power || 10) : (a.forca || 10) + rand(0, 4);
  if (skill && isMagic) base = base + Math.floor((a.magia || 0) * 0.4);
  else if (skill) base = base + Math.floor((a.forca || 0) * 0.35);
  const def = d.defesa != null ? d.defesa : (d.def || 0);
  let dmg = Math.max(1, base - Math.floor(def * 0.35) + rand(-2, 3));
  const critChance = clamp(5 + Math.floor((a.precisao || 10) / 10) + Math.floor((a.sorte || 10) / 20), 5, 35);
  const crit = Math.random() * 100 < critChance;
  if (crit) dmg = Math.floor(dmg * 1.6);
  const hitChance = clamp(75 + (a.precisao || 10) - (d.agilidade || d.spd || 10), 40, 95);
  const hit = Math.random() * 100 < hitChance;
  return { dmg: hit ? dmg : 0, crit, hit, miss: !hit };
}

function startPve(playerData, opts) {
  opts = opts || {};
  const mon = opts.boss ? pickBoss(playerData.level) : pickMonster(playerData.level);
  mon.hpMax = mon.hp;
  mon.attrs = { defesa: mon.def, agilidade: mon.spd, forca: mon.atk };
  return {
    type: opts.boss ? 'boss' : 'pve',
    enemy: mon, phaseIdx: 0,
    playerHp: playerData.hp, playerMana: playerData.mana,
    turn: 'player', defending: false, log: []
  };
}

function startDungeon(playerData) {
  const first = startPve(playerData, {});
  return {
    type: 'dungeon', dungeonId: 'dungeon_' + Date.now(),
    room: 1, maxRooms: 3 + rand(0, 2), cleared: 0,
    enemy: first.enemy, phaseIdx: 0,
    playerHp: playerData.hp, playerMana: playerData.mana,
    turn: 'player', defending: false, log: [], isFinalBoss: false
  };
}

function advanceDungeonRoom(state, playerData) {
  if (state.type !== 'dungeon') return { done: true };
  state.cleared = (state.cleared || 0) + 1;
  state.room = (state.room || 1) + 1;
  if (state.room > state.maxRooms) {
    const boss = startPve(playerData, { boss: true });
    state.enemy = boss.enemy;
    state.phaseIdx = 0;
    state.isFinalBoss = true;
    return { done: false, finalBoss: true, enemy: state.enemy };
  }
  if (Math.random() < 0.25) state.pendingEvent = 'chest';
  else state.pendingEvent = null;
  const next = startPve(playerData, {});
  state.enemy = next.enemy;
  state.phaseIdx = 0;
  state.isFinalBoss = false;
  return { done: false, room: state.room, enemy: state.enemy, event: state.pendingEvent };
}

function applyPlayerAttack(state, playerData, skill) {
  const lines = [];
  if (skill) {
    if ((skill.mana || 0) > state.playerMana) return { ok: false, msg: 'Mana insuficiente' };
    state.playerMana -= skill.mana || 0;
    lines.push('Usaste ' + (skill.emoji || '') + ' *' + skill.name + '*');
  } else lines.push('Ataque basico!');

  const r = calcDamage({ attrs: playerData.attrs }, { attrs: state.enemy.attrs, defesa: state.enemy.def, agilidade: state.enemy.spd }, skill || null);
  if (r.miss) lines.push('Errou!');
  else {
    state.enemy.hp = Math.max(0, state.enemy.hp - r.dmg);
    lines.push((r.crit ? 'CRITICO! ' : '') + 'Dano *' + r.dmg + '*');
    lines.push(state.enemy.emoji + ' ' + state.enemy.name + ' HP: ' + state.enemy.hp + '/' + state.enemy.hpMax);
  }
  if (state.enemy.hp <= 0) return { ok: true, lines: lines, victory: true };

  const er = calcDamage(
    { attrs: { forca: state.enemy.atk, precisao: 12, sorte: 10, magia: state.enemy.atk } },
    { attrs: playerData.attrs }, null
  );
  let edmg = er.dmg;
  if (state.defending) { edmg = Math.max(1, Math.floor(edmg * 0.5)); lines.push('Defesa!'); }
  state.defending = false;
  if (er.miss) lines.push(state.enemy.name + ' errou!');
  else {
    state.playerHp = Math.max(0, state.playerHp - edmg);
    lines.push(state.enemy.name + ' causou *' + edmg + '*');
    lines.push('HP: ' + state.playerHp + '/' + playerData.hpMax);
  }
  if (state.playerHp <= 0) return { ok: true, lines: lines, defeat: true };
  return { ok: true, lines: lines };
}

function tryFlee(state, playerData) {
  const chance = clamp(40 + (playerData.attrs.agilidade || 10) - (state.enemy.spd || 5), 15, 85);
  return { ok: Math.random() * 100 < chance, chance: chance };
}

function reward(playerData, enemy) {
  const xpInfo = grantXp(playerData, enemy.xp || 10);
  try {
    const story = require('./story');
    story.ensureStory(playerData);
    playerData.counters = playerData.counters || {};
    playerData.counters.kills = (playerData.counters.kills || 0) + 1;
    if (enemy && enemy.boss) playerData.counters.boss = (playerData.counters.boss || 0) + 1;
    story.logEvent(playerData, 'Derrotou ' + (enemy && enemy.name || 'inimigo'));
    story.checkChapter(playerData);
  } catch (_) {}

  let iene = 0;
  if (enemy.iene) iene = rand(enemy.iene[0], enemy.iene[1]);
  playerData.iene = Math.max(0, (playerData.iene || 0) + iene);
  let loot = [];
  try { if (applyLootFn) loot = applyLootFn(playerData, enemy) || []; } catch (_) {}
  let wear = null;
  try { if (wearEquipFn) wear = wearEquipFn(playerData, 1 + Math.floor(Math.random() * 3)); } catch (_) {}
  return { xp: xpInfo.xp, iene: iene, leveled: xpInfo.leveled, levels: xpInfo.levels, level: playerData.level, loot: loot, wear: wear };
}

function challengeDuel(fromJid, fromName, toJid, group) {
  pendingDuel.set(toJid + '|' + (group || 'global'), { from: fromJid, fromName: fromName, to: toJid, group: group || 'global', at: Date.now() });
}
function getPending(toJid, group) { return pendingDuel.get(toJid + '|' + (group || 'global')) || null; }
function clearPending(toJid, group) { pendingDuel.delete(toJid + '|' + (group || 'global')); }

function startDuel(aData, bData, aJid, bJid, group) {
  return {
    type: 'pvp', group: group || 'global',
    a: { jid: aJid, name: aData.name, hp: 10, hpMax: 10, mana: Math.min(30, aData.mana || 30), manaMax: 30, attrs: aData.attrs, skills: aData.skills || [] },
    b: { jid: bJid, name: bData.name, hp: 10, hpMax: 10, mana: Math.min(30, bData.mana || 30), manaMax: 30, attrs: bData.attrs, skills: bData.skills || [] },
    turn: aJid
  };
}

function formatDuel(state) {
  return 'DUELO\n' + state.a.name + ': ' + state.a.hp + '/10\n' + state.b.name + ': ' + state.b.hp + '/10\nTurno: ' + (state.turn === state.a.jid ? state.a.name : state.b.name);
}

function duelAction(state, actorJid, action, skillName) {
  if (state.turn !== actorJid) return { ok: false, msg: 'Nao e o teu turno.' };
  const me = state.a.jid === actorJid ? state.a : state.b;
  const foe = state.a.jid === actorJid ? state.b : state.a;
  const lines = [];
  if (action === 'defender') { me._def = true; lines.push(me.name + ' defende.'); }
  else {
    let skill = null;
    if (action === 'skill' && skillName) {
      skill = (me.skills || []).find(function (s) { return s.name && s.name.toLowerCase().indexOf(String(skillName).toLowerCase()) >= 0; });
    }
    if (skill && (skill.mana || 0) > me.mana) return { ok: false, msg: 'Mana insuficiente.' };
    if (skill) me.mana -= skill.mana || 0;
    const r = calcDamage({ attrs: me.attrs }, { attrs: foe.attrs }, skill);
    if (r.miss) lines.push('Errou!');
    else {
      let dmg = r.dmg;
      if (foe._def) dmg = Math.max(1, Math.floor(dmg * 0.5));
      foe.hp = Math.max(0, foe.hp - dmg);
      lines.push((r.crit ? 'CRITICO! ' : '') + dmg + ' dano. ' + foe.name + ' HP ' + foe.hp + '/10');
    }
    foe._def = false;
  }
  state.turn = foe.jid;
  if (foe.hp <= 0) return { ok: true, lines: lines, win: me.jid, over: true };
  return { ok: true, lines: lines };
}

module.exports = {
  getBattle, setBattle, clearBattle, battles,
  startPve, startDungeon, advanceDungeonRoom, applyPlayerAttack, tryFlee, reward,
  challengeDuel, getPending, clearPending, startDuel, formatDuel, duelAction
};
