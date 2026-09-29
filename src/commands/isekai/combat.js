/**
 * Comandos combate Isekai — Extra 1 (limpo)
 */
const isekaiDb = require('../../isekai/db');
const combat = require('../../isekai/combat');
let ui=null; try{ ui=require('../../isekai/ui'); }catch(_){}

function needChar(ctx) {
  const g = isekaiDb.scopeGroup(ctx);
  const d = isekaiDb.getPlayerData(ctx.sender, g);
  if (!d || !d.race) return { ok: false, msg: 'Cria personagem: iskiniciar Nome' };
  return { ok: true, data: d, group: g };
}

function findSkill(data, text) {
  const q = String(text || '').toLowerCase().trim();
  if (!q) return null;
  const list = data.skills || [];
  return list.find(function (s) {
    return String(s.name).toLowerCase().indexOf(q) >= 0 || String(s.id).toLowerCase() === q;
  }) || null;
}

function handleVictory(ctx, n, b, r) {
  const rew = combat.reward(n.data, b.enemy);
  let msg = (r.lines || []).join('\n');
  msg += '\n\n*Vitoria!*\n+' + rew.xp + ' XP · +' + rew.iene + ' IENE';
  if (rew.loot && rew.loot.length) msg += '\nLoot: ' + rew.loot.join(', ');
  if (rew.wear && rew.wear.broken && rew.wear.broken.length) {
    msg += '\nEquip quebrado: ' + rew.wear.broken.join(', ');
  }
  if (rew.leveled) msg += '\nLevel UP *' + rew.level + '*!';

  if (b.type === 'dungeon' && !b.isFinalBoss) {
    n.data.hp = Math.min(n.data.hpMax, b.playerHp);
    n.data.mana = b.playerMana;
    const adv = combat.advanceDungeonRoom(b, n.data);
    b.playerHp = n.data.hp;
    b.playerMana = n.data.mana;
    isekaiDb.savePlayerData(ctx.sender, n.group, n.data);
    if (adv.finalBoss) {
      combat.setBattle(ctx.sender, n.group, b);
      msg += '\n\nSala FINAL! Boss: ' + b.enemy.emoji + ' ' + b.enemy.name;
      return msg;
    }
    if (!adv.done) {
      combat.setBattle(ctx.sender, n.group, b);
      msg += '\n\nSala ' + b.room + '/' + b.maxRooms + '\n' + b.enemy.emoji + ' ' + b.enemy.name;
      if (adv.event === 'chest') {
        n.data.iene = (n.data.iene || 0) + 15;
        isekaiDb.savePlayerData(ctx.sender, n.group, n.data);
        msg += '\nBau +15 IENE';
      }
      return msg;
    }
  }

  n.data.hp = Math.min(n.data.hpMax, Math.max(1, b.playerHp + 5));
  n.data.mana = b.playerMana;
  isekaiDb.savePlayerData(ctx.sender, n.group, n.data);
  combat.clearBattle(ctx.sender, n.group);
  if (b.type === 'dungeon') msg += '\n\nDungeon concluida!';
  try { if (ui) msg = ui.withAssistant(msg, n.data, 'vitoria'); } catch(_){}
  return msg;
}

function handleDefeat(ctx, n, b) {
  n.data.hp = 1;
  n.data.mana = b.playerMana;
  isekaiDb.savePlayerData(ctx.sender, n.group, n.data);
  combat.clearBattle(ctx.sender, n.group);
}

function saveMidFight(ctx, n, b) {
  combat.setBattle(ctx.sender, n.group, b);
  n.data.hp = b.playerHp;
  n.data.mana = b.playerMana;
  isekaiDb.savePlayerData(ctx.sender, n.group, n.data);
}

module.exports = [
  {
    name: 'isklutar',
    aliases: ['iskcombate', 'iskpve'],
    category: 'isekai',
    handler: async (ctx) => {
      const n = needChar(ctx);
      if (!n.ok) return ctx.reply(n.msg);
      if (combat.getBattle(ctx.sender, n.group)) return ctx.reply('Ja estas em combate. iskatacar / iskfugir');
      const b = combat.startPve(n.data, {});
      combat.setBattle(ctx.sender, n.group, b);
      await ctx.reply(
        'Combate!\n' + b.enemy.emoji + ' ' + b.enemy.name +
        '\nHP ' + b.enemy.hp + '/' + b.enemy.hpMax +
        '\nTeu HP: ' + b.playerHp + '/' + n.data.hpMax +
        '\n\niskatacar | iskusar <skill> | iskdefender | iskfugir'
      );
    }
  },
  {
    name: 'iskboss',
    category: 'isekai',
    handler: async (ctx) => {
      const n = needChar(ctx);
      if (!n.ok) return ctx.reply(n.msg);
      if (combat.getBattle(ctx.sender, n.group)) return ctx.reply('Ja em combate.');
      const b = combat.startPve(n.data, { boss: true });
      combat.setBattle(ctx.sender, n.group, b);
      await ctx.reply(
        'BOSS!\n' + b.enemy.emoji + ' ' + b.enemy.name +
        '\nHP ' + b.enemy.hp + '/' + b.enemy.hpMax +
        '\n\niskatacar | iskusar | iskdefender | iskfugir'
      );
    }
  },
  {
    name: 'iskdungeon',
    category: 'isekai',
    handler: async (ctx) => {
      const n = needChar(ctx);
      if (!n.ok) return ctx.reply(n.msg);
      if (combat.getBattle(ctx.sender, n.group)) return ctx.reply('Ja em combate.');
      const d = combat.startDungeon(n.data);
      combat.setBattle(ctx.sender, n.group, d);
      await ctx.reply(
        'DUNGEON\nSala 1/' + d.maxRooms +
        '\n' + d.enemy.emoji + ' ' + d.enemy.name +
        '\nHP ' + d.enemy.hp + '/' + d.enemy.hpMax +
        '\n\niskatacar | iskfugir'
      );
    }
  },
  {
    name: 'iskatacar',
    category: 'isekai',
    handler: async (ctx) => {
      const n = needChar(ctx);
      if (!n.ok) return ctx.reply(n.msg);
      const b = combat.getBattle(ctx.sender, n.group);
      if (!b) return ctx.reply('Sem combate. isklutar');
      if (b.type === 'pvp') {
        const r = combat.duelAction(b, ctx.sender, 'attack');
        if (!r.ok) return ctx.reply(r.msg);
        let msg = r.lines.join('\n');
        if (r.over) {
          combat.clearBattle(b.a.jid, b.group);
          combat.clearBattle(b.b.jid, b.group);
          const wname = r.win === b.a.jid ? b.a.name : b.b.name;
          msg += '\n\n' + wname + ' venceu o duelo! (PvP nao mata)';
        } else {
          combat.setBattle(b.a.jid, b.group, b);
          combat.setBattle(b.b.jid, b.group, b);
          msg += '\n\n' + combat.formatDuel(b);
        }
        return ctx.reply(msg);
      }
      const r = combat.applyPlayerAttack(b, n.data, null);
      if (!r.ok) return ctx.reply(r.msg);
      let msg = r.lines.join('\n');
      if (r.victory) msg = handleVictory(ctx, n, b, r);
      else if (r.defeat) {
        handleDefeat(ctx, n, b);
        msg += '\n\nDerrota (HP=1)';
        try { if (ui) msg = ui.withAssistant(msg, n.data, 'derrota'); } catch(_){}
      } else {
        saveMidFight(ctx, n, b);
      }
      await ctx.reply(msg);
    }
  },
  {
    name: 'iskusar',
    category: 'isekai',
    handler: async (ctx) => {
      const n = needChar(ctx);
      if (!n.ok) return ctx.reply(n.msg);
      const q = (ctx.text || '').trim() || ((ctx.args && ctx.args.join(' ')) || '');
      if (!q) return ctx.reply('Uso: iskusar <habilidade>');
      const b = combat.getBattle(ctx.sender, n.group);
      if (!b) return ctx.reply('Sem combate.');
      if (b.type === 'pvp') {
        const r = combat.duelAction(b, ctx.sender, 'skill', q);
        if (!r.ok) return ctx.reply(r.msg);
        let msg = r.lines.join('\n');
        if (r.over) {
          combat.clearBattle(b.a.jid, b.group);
          combat.clearBattle(b.b.jid, b.group);
          const wname = r.win === b.a.jid ? b.a.name : b.b.name;
          msg += '\n\n' + wname + ' venceu!';
        } else {
          combat.setBattle(b.a.jid, b.group, b);
          combat.setBattle(b.b.jid, b.group, b);
          msg += '\n\n' + combat.formatDuel(b);
        }
        return ctx.reply(msg);
      }
      const sk = findSkill(n.data, q);
      if (!sk) return ctx.reply('Nao tens essa habilidade. iskhabilidades');
      const r = combat.applyPlayerAttack(b, n.data, sk);
      if (!r.ok) return ctx.reply(r.msg);
      let msg = r.lines.join('\n');
      if (r.victory) msg = handleVictory(ctx, n, b, r);
      else if (r.defeat) {
        handleDefeat(ctx, n, b);
        msg += '\n\nDerrota (HP=1)';
        try { if (ui) msg = ui.withAssistant(msg, n.data, 'derrota'); } catch(_){}
      } else {
        saveMidFight(ctx, n, b);
      }
      await ctx.reply(msg);
    }
  },
  {
    name: 'iskdefender',
    category: 'isekai',
    handler: async (ctx) => {
      const n = needChar(ctx);
      if (!n.ok) return ctx.reply(n.msg);
      const b = combat.getBattle(ctx.sender, n.group);
      if (!b) return ctx.reply('Sem combate.');
      if (b.type === 'pvp') {
        const r = combat.duelAction(b, ctx.sender, 'defender');
        if (!r.ok) return ctx.reply(r.msg);
        combat.setBattle(b.a.jid, b.group, b);
        combat.setBattle(b.b.jid, b.group, b);
        return ctx.reply(r.lines.join('\n') + '\n\n' + combat.formatDuel(b));
      }
      b.defending = true;
      const r = combat.applyPlayerAttack(b, n.data, null);
      let msg = 'Defendes!\n' + (r.lines || []).join('\n');
      if (r.victory) msg = handleVictory(ctx, n, b, r);
      else if (r.defeat) {
        handleDefeat(ctx, n, b);
        msg += '\n\nDerrota (HP=1)';
        try { if (ui) msg = ui.withAssistant(msg, n.data, 'derrota'); } catch(_){}
      } else {
        saveMidFight(ctx, n, b);
      }
      await ctx.reply(msg);
    }
  },
  {
    name: 'iskfugir',
    aliases: ['iskflee', 'iskcorrer'],
    category: 'isekai',
    handler: async (ctx) => {
      const n = needChar(ctx);
      if (!n.ok) return ctx.reply(n.msg);
      const b = combat.getBattle(ctx.sender, n.group);
      if (!b) return ctx.reply('Sem combate.');
      if (b.type === 'pvp') return ctx.reply('Nao podes fugir de duelo.');
      const r = combat.tryFlee(b, n.data);
      if (r.ok) {
        n.data.hp = b.playerHp;
        n.data.mana = b.playerMana;
        isekaiDb.savePlayerData(ctx.sender, n.group, n.data);
        combat.clearBattle(ctx.sender, n.group);
        await ctx.reply('Fugiste! (chance ' + r.chance + '%)');
      } else {
        const atk = combat.applyPlayerAttack(b, n.data, null);
        let msg = 'Falha ao fugir (' + r.chance + '%)\n' + (atk.lines || []).join('\n');
        if (atk.defeat) {
          handleDefeat(ctx, n, b);
          msg += '\n\nDerrota';
        } else {
          saveMidFight(ctx, n, b);
        }
        await ctx.reply(msg);
      }
    }
  },
  {
    name: 'iskduelo',
    aliases: ['iskpvp'],
    category: 'isekai',
    handler: async (ctx) => {
      const n = needChar(ctx);
      if (!n.ok) return ctx.reply(n.msg);
      const mention = (ctx.mentionedJid && ctx.mentionedJid[0]) || null;
      if (!mention) return ctx.reply('Marca alguem: iskduelo @user');
      if (mention === ctx.sender) return ctx.reply('Nao podes duelar contigo.');
      combat.challengeDuel(ctx.sender, n.data.name, mention, n.group);
      await ctx.reply('Desafio enviado! O outro usa: iskdaceitar');
    }
  },
  {
    name: 'iskdaceitar',
    aliases: ['iskaceitar_duelo'],
    category: 'isekai',
    handler: async (ctx) => {
      const n = needChar(ctx);
      if (!n.ok) return ctx.reply(n.msg);
      const pend = combat.getPending(ctx.sender, n.group);
      if (!pend) return ctx.reply('Sem desafio pendente.');
      const aData = isekaiDb.getPlayerData(pend.from, n.group);
      if (!aData || !aData.race) return ctx.reply('Oponente sem personagem.');
      const st = combat.startDuel(aData, n.data, pend.from, ctx.sender, n.group);
      combat.clearPending(ctx.sender, n.group);
      combat.setBattle(pend.from, n.group, st);
      combat.setBattle(ctx.sender, n.group, st);
      await ctx.reply('Duelo iniciado!\n' + combat.formatDuel(st) + '\n\niskatacar no teu turno');
    }
  },
  {
    name: 'iskbatalha',
    aliases: ['iskcombate_status'],
    category: 'isekai',
    handler: async (ctx) => {
      const n = needChar(ctx);
      if (!n.ok) return ctx.reply(n.msg);
      const b = combat.getBattle(ctx.sender, n.group);
      if (!b) return ctx.reply('Sem combate ativo.');
      if (b.type === 'pvp') return ctx.reply(combat.formatDuel(b));
      await ctx.reply(
        (b.type === 'dungeon' ? 'Dungeon sala ' + b.room + '/' + b.maxRooms + '\n' : '') +
        b.enemy.emoji + ' ' + b.enemy.name +
        '\nHP inimigo: ' + b.enemy.hp + '/' + b.enemy.hpMax +
        '\nTeu HP: ' + b.playerHp + ' | Mana: ' + b.playerMana
      );
    }
  }
];
