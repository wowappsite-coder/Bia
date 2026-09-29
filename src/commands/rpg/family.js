
/* BEATRIZ_REL_SCOPE */
function beatrizGroupId(ctx) {
  try {
    if (ctx && ctx.jid && String(ctx.jid).endsWith('@g.us')) return String(ctx.jid);
  } catch (_) {}
  try {
    if (typeof getScope === 'function') {
      const s = getScope();
      if (s && s !== 'global') return s;
    }
  } catch (_) {}
  return 'global';
}
function beatrizFindNamoro(database, sender, g) {
  // 1) neste grupo
  let r = database.prepare(`
    SELECT * FROM relationships
    WHERE status = 'accepted' AND type = 'namoro'
    AND group_jid = ?
    AND (user1_jid = ? OR user2_jid = ?)
    ORDER BY id DESC LIMIT 1
  `).get(g, sender, sender);
  if (r) return r;
  // 2) registos antigos sem grupo / global — migra para este grupo
  r = database.prepare(`
    SELECT * FROM relationships
    WHERE status = 'accepted' AND type = 'namoro'
    AND (group_jid IS NULL OR group_jid = '' OR group_jid = 'global')
    AND (user1_jid = ? OR user2_jid = ?)
    ORDER BY id DESC LIMIT 1
  `).get(sender, sender);
  if (r) {
    try { database.prepare('UPDATE relationships SET group_jid = ? WHERE id = ?').run(g, r.id); } catch (_) {}
    r.group_jid = g;
    return r;
  }
  return null;
}
function beatrizHasAcceptedAny(database, sender, target, g) {
  // so bloqueia se ja tem accepted NESTE grupo
  const me = database.prepare(`
    SELECT * FROM relationships
    WHERE status = 'accepted' AND type IN ('namoro','casamento')
    AND group_jid = ?
    AND (user1_jid = ? OR user2_jid = ?)
    LIMIT 1
  `).get(g, sender, sender);
  if (me) return me;
  if (target) {
    const ot = database.prepare(`
      SELECT * FROM relationships
      WHERE status = 'accepted' AND type IN ('namoro','casamento')
      AND group_jid = ?
      AND (user1_jid = ? OR user2_jid = ?)
      LIMIT 1
    `).get(g, target, target);
    if (ot) return ot;
  }
  return null;
}


/* BEATRIZ_TERMINAR_CONFIRM */
const beatrizTerminarPending = new Map(); // sender -> { other, exp }

/* BEATRIZ_NAMORO_FIX */
function beatrizIsBotJid(jid, ctx) {
  if (!jid || !ctx) return false;
  try {
    const u = ctx.sock && ctx.sock.user;
    if (!u) return false;
    const ids = [u.id, u.lid, u.jid].filter(Boolean).map(String);
    const t = String(jid);
    for (const id of ids) {
      if (t === id) return true;
      const a = t.split('@')[0].split(':')[0];
      const b = String(id).split('@')[0].split(':')[0];
      if (a && b && a === b) return true;
    }
  } catch (_) {}
  return false;
}
function beatrizExpirePending(database) {
  try {
    database.prepare(`
      UPDATE relationships SET status = 'ended', ended_at = datetime('now')
      WHERE status = 'pending' AND type = 'namoro'
      AND datetime(started_at) < datetime('now', '-1 minute')
    `).run();
  } catch (_) {
    try {
      database.prepare(`
        UPDATE relationships SET status = 'ended'
        WHERE status = 'pending' AND type = 'namoro'
        AND datetime(created_at) < datetime('now', '-1 minute')
      `).run();
    } catch (_2) {}
  }
}

/**
 * Sistema RPG / Família / Relacionamentos / Pets
 */

const db = require('../../database');
const { token, tag } = require('../../utils/mention');
const { getDb, getScope } = require('../../database');

module.exports = [
  {
    name: 'namorar',
    aliases: ['pedirnamoro'],
    category: 'rpg',
    description: 'Pede alguém em namoro',
    usage: '!namorar @user',
    groupOnly: true,
    handler: async (ctx) => {
      const target = ctx.getMentionedOrQuoted && ctx.getMentionedOrQuoted();
      if (!target || target === ctx.sender) return ctx.reply('❌ Marque alguém.');
      const database = getDb();
      const g = beatrizGroupId(ctx);
      if (typeof beatrizExpirePending === 'function') beatrizExpirePending(database);

      const existing = beatrizHasAcceptedAny(database, ctx.sender, target, g);
      if (existing) {
        return ctx.reply('❌ Um dos dois já está em um relacionamento *neste grupo*.\nUse *terminar* ou *minhadupla*.');
      }

      const ins = database.prepare(`
        INSERT INTO relationships (user1_jid, user2_jid, type, status, started_at, group_jid)
        VALUES (?, ?, 'namoro', 'pending', datetime('now'), ?)
      `).run(ctx.sender, target, g);
      const pedidoId = ins.lastInsertRowid;

      if (typeof beatrizIsBotJid === 'function' && beatrizIsBotJid(target, ctx)) {
        await ctx.reply(`💍 ${tag(String(ctx.sender))} pediu ${tag(String(target))} em namoro!\n⏳ O bot vai decidir...`, { mentions: [ctx.sender, target] });
        await new Promise(r => setTimeout(r, 1200 + Math.floor(Math.random() * 1800)));
        const still = database.prepare(`SELECT * FROM relationships WHERE id = ? AND status = 'pending'`).get(pedidoId);
        if (!still) return;
        if (Math.random() < 0.55) {
          database.prepare(`UPDATE relationships SET status = 'accepted', started_at = datetime('now'), group_jid = ? WHERE id = ?`).run(g, pedidoId);
          await ctx.reply(`💕 O bot *aceitou*! Agora ${tag(String(ctx.sender))} e ${tag(String(target))} estão namorando!`, { mentions: [ctx.sender, target] });
        } else {
          database.prepare(`UPDATE relationships SET status = 'ended', ended_at = datetime('now') WHERE id = ?`).run(pedidoId);
          await ctx.reply(`💔 O bot *recusou* o pedido de ${tag(String(ctx.sender))}.`, { mentions: [ctx.sender] });
        }
        return;
      }

      await ctx.reply(`💍 ${tag(String(ctx.sender))} pediu ${tag(String(target))} em namoro!\nUse *aceitar* ou *recusar*\n⏳ Expira em *1 minuto*`, { mentions: [ctx.sender, target] });
      setTimeout(() => {
        try {
          const db2 = getDb();
          const row = db2.prepare(`SELECT * FROM relationships WHERE id = ? AND status = 'pending'`).get(pedidoId);
          if (row) db2.prepare(`UPDATE relationships SET status = 'ended', ended_at = datetime('now') WHERE id = ?`).run(pedidoId);
        } catch (_) {}
      }, 60 * 1000);
    }
  },
  {
    name: 'aceitar',
    aliases: ['aceitar_namoro'],
    category: 'rpg',
    description: 'Aceita pedido de namoro',
    handler: async (ctx) => {
      const database = getDb();
      beatrizExpirePending(database);
      let pedido = database.prepare(`
        SELECT * FROM relationships 
        WHERE user2_jid = ? AND status = 'pending' AND type = 'namoro'
        ORDER BY id DESC LIMIT 1
      `).get(ctx.sender);
      if (!pedido) return ctx.reply('❌ Nenhum pedido pendente para ti (ou já expirou).');
      if (String(pedido.user1_jid) === String(ctx.sender)) {
        return ctx.reply('❌ Não podes aceitar o *teu próprio* pedido.');
      }
      if (beatrizIsBotJid(pedido.user2_jid, ctx)) {
        return ctx.reply('❌ Este pedido é para o bot — ele decide sozinho.');
      }
      database.prepare(`UPDATE relationships SET status = 'accepted', started_at = datetime('now') WHERE id = ?`).run(pedido.id);
      await ctx.reply(`💕 Agora ${tag(pedido.user1_jid)} e ${tag(ctx.sender)} estão namorando!`, {
        mentions: [pedido.user1_jid, ctx.sender]
      });
    }
  },
  {
    name: 'recusar',
    aliases: ['recusar_namoro'],
    category: 'rpg',
    description: 'Recusa pedido',
    handler: async (ctx) => {
      const database = getDb();
      beatrizExpirePending(database);
      const pedido = database.prepare(`
        SELECT * FROM relationships WHERE user2_jid = ? AND status = 'pending' AND type = 'namoro'
        ORDER BY id DESC LIMIT 1
      `).get(ctx.sender);
      if (!pedido) return ctx.reply('❌ Nenhum pedido pendente (ou já expirou).');
      if (String(pedido.user1_jid) === String(ctx.sender)) {
        return ctx.reply('❌ Não podes recusar o teu próprio pedido. Usa *cancelarpedido*.');
      }
      if (beatrizIsBotJid(pedido.user2_jid, ctx)) {
        return ctx.reply('❌ Pedido ao bot — ele decide sozinho.');
      }
      database.prepare(`UPDATE relationships SET status = 'ended', ended_at = datetime('now') WHERE id = ?`).run(pedido.id);
      await ctx.reply('💔 Pedido recusado.');
    }
  },
  {
    name: 'cancelarpedido',
    category: 'rpg',
    description: 'Cancela seu pedido',
    handler: async (ctx) => {
      const database = getDb();
      const r = database.prepare(`
        SELECT * FROM relationships WHERE user1_jid = ? AND status = 'pending'
      `).get(ctx.sender);
      if (!r) return ctx.reply('❌ Nenhum pedido seu pendente.');
      database.prepare(`UPDATE relationships SET status = 'ended' WHERE id = ?`).run(r.id);
      await ctx.reply('✅ Pedido cancelado.');
    }
  },
  {
    name: 'minhadupla',
    aliases: ['relacionamento', 'par'],
    category: 'rpg',
    description: 'Mostra seu relacionamento',
    handler: async (ctx) => {
      const database = getDb();
      const g = beatrizGroupId(ctx);
      let r = database.prepare(`
        SELECT * FROM relationships 
        WHERE status = 'accepted' AND type IN ('namoro','casamento')
        AND group_jid = ?
        AND (user1_jid = ? OR user2_jid = ?)
        ORDER BY id DESC LIMIT 1
      `).get(g, ctx.sender, ctx.sender);
      if (!r) {
        // migra legado
        r = database.prepare(`
          SELECT * FROM relationships 
          WHERE status = 'accepted' AND type IN ('namoro','casamento')
          AND (group_jid IS NULL OR group_jid = '' OR group_jid = 'global')
          AND (user1_jid = ? OR user2_jid = ?)
          ORDER BY id DESC LIMIT 1
        `).get(ctx.sender, ctx.sender);
        if (r) {
          try { database.prepare('UPDATE relationships SET group_jid = ? WHERE id = ?').run(g, r.id); } catch (_) {}
        }
      }
      if (!r) return ctx.reply('💔 Você está solteiro(a) *neste grupo*.');
      const other = r.user1_jid === ctx.sender ? r.user2_jid : r.user1_jid;
      await ctx.reply(`💕 Você está em um *${r.type}* com ${tag(other)}\nDesde: ${r.started_at}`, { mentions: [other] });
    }
  },
  {
    name: 'terminar',
    aliases: ['terminar_namoro'],
    category: 'rpg',
    description: 'Termina o namoro',
    handler: async (ctx) => {
      const database = getDb();
      const g = getScope();
      const arg = String((ctx.args && ctx.args[0]) || '').toLowerCase();
      const key = String(ctx.sender) + '|' + String(g);
      if (typeof beatrizTerminarPending === 'undefined') {
        global.beatrizTerminarPending = global.beatrizTerminarPending || new Map();
      }
      const map = (typeof beatrizTerminarPending !== 'undefined' && beatrizTerminarPending) || global.beatrizTerminarPending;

      if (arg === 'sim' || arg === 's' || arg === 'yes') {
        const pend = map.get(key);
        if (!pend || Date.now() > pend.exp) {
          map.delete(key);
          return ctx.reply('❌ Sem confirmação. Digite *terminar* de novo.');
        }
        database.prepare(`
          UPDATE relationships SET status = 'ended', ended_at = datetime('now')
          WHERE status = 'accepted' AND type IN ('namoro','casamento')
          AND group_jid = ? AND (user1_jid = ? OR user2_jid = ?)
        `).run(g, ctx.sender, ctx.sender);
        map.delete(key);
        return ctx.reply(`💔 Relacionamento com ${tag(pend.other)} terminado neste grupo.`, { mentions: [pend.other] });
      }
      if (arg === 'nao' || arg === 'n' || arg === 'no') {
        map.delete(key);
        return ctx.reply('✅ Relacionamento mantido.');
      }

      const r = database.prepare(`
        SELECT * FROM relationships 
        WHERE status = 'accepted' AND type IN ('namoro','casamento')
        AND group_jid = ?
        AND (user1_jid = ? OR user2_jid = ?)
        ORDER BY id DESC LIMIT 1
      `).get(g, ctx.sender, ctx.sender);
      if (!r) return ctx.reply('❌ Você não está em um relacionamento *neste grupo*.');
      const other = r.user1_jid === ctx.sender ? r.user2_jid : r.user1_jid;
      map.set(key, { other, exp: Date.now() + 60000 });
      await ctx.reply(
        `⚠️ Tem certeza que deseja terminar seu relacionamento com ${tag(other)}?\n\n*terminar sim* ou *terminar nao*\n⏳ 1 min`,
        { mentions: [other] }
      );
    }
  },
  {
    name: 'casar',
    category: 'rpg',
    description: 'Casa com o parceiro (precisa estar namorando)',
    handler: async (ctx) => {
      const database = getDb();
      const g = beatrizGroupId(ctx);
      const arg = String((ctx.args && ctx.args.join(' ')) || '').trim().toLowerCase();

      if (arg === 'sim' || arg === 's' || arg === 'yes' || arg === 'aceitar') {
        const pedido = database.prepare(`
          SELECT * FROM relationships
          WHERE status = 'pending' AND type = 'casamento'
          AND user2_jid = ? AND group_jid = ?
          ORDER BY id DESC LIMIT 1
        `).get(ctx.sender, g);
        if (!pedido) return ctx.reply('❌ Nenhum pedido de casamento pendente neste grupo.');
        database.prepare(`
          UPDATE relationships SET status = 'accepted', type = 'casamento', started_at = datetime('now'), group_jid = ?
          WHERE id = ?
        `).run(g, pedido.id);
        database.prepare(`
          UPDATE relationships SET status = 'ended', ended_at = datetime('now')
          WHERE status = 'accepted' AND type = 'namoro' AND group_jid = ?
          AND ((user1_jid = ? AND user2_jid = ?) OR (user1_jid = ? AND user2_jid = ?))
        `).run(g, pedido.user1_jid, pedido.user2_jid, pedido.user2_jid, pedido.user1_jid);
        return ctx.reply(`💒 ${tag(pedido.user1_jid)} e ${tag(ctx.sender)} se casaram!`, { mentions: [pedido.user1_jid, ctx.sender] });
      }
      if (arg === 'nao' || arg === 'n' || arg === 'no' || arg === 'recusar') {
        const pedido = database.prepare(`
          SELECT * FROM relationships WHERE status = 'pending' AND type = 'casamento'
          AND user2_jid = ? AND group_jid = ? ORDER BY id DESC LIMIT 1
        `).get(ctx.sender, g);
        if (!pedido) return ctx.reply('❌ Nenhum pedido de casamento pendente neste grupo.');
        database.prepare(`UPDATE relationships SET status = 'ended', ended_at = datetime('now') WHERE id = ?`).run(pedido.id);
        return ctx.reply('💔 Pedido de casamento recusado.');
      }

      const r = beatrizFindNamoro(database, ctx.sender, g);
      if (!r) {
        return ctx.reply('❌ Vocês precisam estar *namorando neste grupo* primeiro.\nUse *namorar @pessoa* → *aceitar* → depois *casar*.\n(*minhadupla* para ver o estado)');
      }
      const other = r.user1_jid === ctx.sender ? r.user2_jid : r.user1_jid;

      const already = database.prepare(`
        SELECT * FROM relationships WHERE status = 'accepted' AND type = 'casamento'
        AND group_jid = ? AND (user1_jid = ? OR user2_jid = ?) LIMIT 1
      `).get(g, ctx.sender, ctx.sender);
      if (already) return ctx.reply('❌ Já estás casado(a) neste grupo. Use *divorciar*.');

      database.prepare(`
        INSERT INTO relationships (user1_jid, user2_jid, type, status, started_at, group_jid)
        VALUES (?, ?, 'casamento', 'pending', datetime('now'), ?)
      `).run(ctx.sender, other, g);

      await ctx.reply(
        `💍 ${tag(ctx.sender)} pediu ${tag(other)} em casamento!\n\n*casar sim* para aceitar\n*casar nao* para recusar`,
        { mentions: [ctx.sender, other] }
      );
    }
  },
  {
    name: 'divorciar',
    category: 'rpg',
    description: 'Divorcia',
    handler: async (ctx) => {
      const database = getDb();
      const g = getScope();
      const r = database.prepare(`
        SELECT * FROM relationships 
        WHERE status = 'accepted' AND type = 'casamento'
        AND group_jid = ?
        AND (user1_jid = ? OR user2_jid = ?)
        ORDER BY id DESC LIMIT 1
      `).get(g, ctx.sender, ctx.sender);
      if (!r) return ctx.reply('❌ Você não está casado(a) *neste grupo*.');
      database.prepare(`UPDATE relationships SET status = 'ended', ended_at = datetime('now') WHERE id = ?`).run(r.id);
      const other = r.user1_jid === ctx.sender ? r.user2_jid : r.user1_jid;
      await ctx.reply(`📄 Divórcio com ${tag(other)} realizado neste grupo.`, { mentions: [other] });
    }
  },
  {
    name: 'criarfamilia',
    category: 'rpg',
    description: 'Cria uma família',
    usage: '!criarfamilia NomeDaFamilia',
    handler: async (ctx) => {
      if (!ctx.text) return ctx.reply('❌ Informe o nome da família.');
      const database = getDb();
      const existing = database.prepare('SELECT * FROM family_members WHERE jid = ?').get(ctx.sender);
      if (existing) return ctx.reply('❌ Você já está em uma família.');
      const info = database.prepare('INSERT INTO families (name, owner_jid, group_jid) VALUES (?, ?, ?)').run(ctx.text, ctx.sender, getScope());
      database.prepare('INSERT INTO family_members (family_id, jid, role) VALUES (?, ?, ?)').run(info.lastInsertRowid, ctx.sender, 'owner');
      await ctx.reply(`👨‍👩‍👧‍👦 Família *${ctx.text}* criada!`);
    }
  },
  {
    name: 'minhafamilia',
    category: 'rpg',
    description: 'Mostra sua família',
    handler: async (ctx) => {
      const database = getDb();
      const mem = database.prepare('SELECT * FROM family_members WHERE jid = ?').get(ctx.sender);
      if (!mem) return ctx.reply('❌ Você não está em nenhuma família.');
      const fam = database.prepare('SELECT * FROM families WHERE id = ?').get(mem.family_id);
      const members = database.prepare('SELECT * FROM family_members WHERE family_id = ?').all(mem.family_id);
      let text = `👨‍👩‍👧‍👦 *Família ${fam.name}*\n\n`;
      members.forEach(m => {
        text += `• ${tag(m.jid)} (${m.role})\n`;
      });
      await ctx.reply(text, { mentions: members.map(m => m.jid) });
    }
  },
  {
    name: 'sair_familia',
    category: 'rpg',
    description: 'Sai da família',
    handler: async (ctx) => {
      const database = getDb();
      const mem = database.prepare('SELECT * FROM family_members WHERE jid = ?').get(ctx.sender);
      if (!mem) return ctx.reply('❌ Você não está em família.');
      if (mem.role === 'owner') return ctx.reply('❌ O dono deve usar !deletar_familia ou transferir.');
      database.prepare('DELETE FROM family_members WHERE jid = ?').run(ctx.sender);
      await ctx.reply('✅ Você saiu da família.');
    }
  },
  {
    name: 'deletar_familia',
    category: 'rpg',
    description: 'Deleta a família (só dono)',
    handler: async (ctx) => {
      const database = getDb();
      const mem = database.prepare('SELECT * FROM family_members WHERE jid = ? AND role = ?').get(ctx.sender, 'owner');
      if (!mem) return ctx.reply('❌ Só o dono pode deletar.');
      database.prepare('DELETE FROM family_members WHERE family_id = ?').run(mem.family_id);
      database.prepare('DELETE FROM families WHERE id = ?').run(mem.family_id);
      await ctx.reply('✅ Família deletada.');
    }
  },
  {
    name: 'adotar',
    category: 'rpg',
    description: 'Adota alguém como filho',
    usage: '!adotar @user',
    handler: async (ctx) => {
      const target = ctx.getMentionedOrQuoted();
      if (!target) return ctx.reply('❌ Marque alguém.');
      const database = getDb();
      const mem = database.prepare('SELECT * FROM family_members WHERE jid = ?').get(ctx.sender);
      if (!mem) return ctx.reply('❌ Crie ou entre em uma família primeiro.');
      const targetMem = database.prepare('SELECT * FROM family_members WHERE jid = ?').get(target);
      if (targetMem) return ctx.reply('❌ Essa pessoa já está em uma família.');
      database.prepare('INSERT INTO family_members (family_id, jid, role) VALUES (?, ?, ?)').run(mem.family_id, target, 'filho');
      await ctx.reply(`👶 ${tag(target)} foi adotado(a)!`, { mentions: [target] });
    }
  },
  {
    name: 'flertar',
    category: 'rpg',
    description: 'Flerta com alguém',
    handler: async (ctx) => {
      const t = ctx.getMentionedOrQuoted();
      if (!t) return ctx.reply('❌ Marque alguém.');
      await ctx.reply(`😏 ${tag(ctx.sender)} está flertando com ${tag(t)}...`, {
        mentions: [ctx.sender, t]
      });
    }
  },
  {
    name: 'amante',
    category: 'rpg',
    description: 'Declara amante (brincadeira)',
    handler: async (ctx) => {
      const t = ctx.getMentionedOrQuoted();
      if (!t) return ctx.reply('❌ Marque alguém.');
      await ctx.reply(`💋 ${tag(ctx.sender)} e ${tag(t)} têm um caso secreto...`, {
        mentions: [ctx.sender, t]
      });
    }
  },
  {
    name: 'trair',
    category: 'rpg',
    description: 'Trai o parceiro (brincadeira)',
    handler: async (ctx) => {
      await ctx.reply('😈 Você traiu... O karma virá!');
    }
  },
  {
    name: 'transar',
    category: 'rpg',
    description: 'Ação adulta de brincadeira',
    handler: async (ctx) => {
      const t = ctx.getMentionedOrQuoted();
      if (!t) return ctx.reply('❌ Marque alguém.');
      await ctx.reply(`🔥 ${tag(ctx.sender)} e ${tag(t)} tiveram um momento especial...`, {
        mentions: [ctx.sender, t]
      });
    }
  },
  {
    name: 'escolhido',
    category: 'rpg',
    description: 'Declara alguém como escolhido',
    handler: async (ctx) => {
      const t = ctx.getMentionedOrQuoted();
      if (!t) return ctx.reply('❌ Marque alguém.');
      await ctx.reply(`✨ ${tag(t)} é o(a) escolhido(a) de ${tag(ctx.sender)}!`, {
        mentions: [ctx.sender, t]
      });
    }
  },
  // PETS
  {
    name: 'adotar_pet',
    aliases: ['pet'],
    category: 'rpg',
    description: 'Adota um pet',
    usage: '!adotar_pet nome tipo',
    handler: async (ctx) => {
      const name = ctx.args[0];
      const type = ctx.args[1] || 'cachorro';
      if (!name) return ctx.reply('❌ Use: !adotar_pet Nome [tipo]');
      const database = getDb();
      database.prepare(`
        INSERT INTO pets (owner_jid, name, type, group_jid) VALUES (?, ?, ?, ?)
      `).run(ctx.sender, name, type, getScope());
      await ctx.reply(`🐾 Você adotou *${name}* (${type})! Cuide bem com !dar_comida, !brincar etc.`);
    }
  },
  {
    name: 'meus_pets',
    aliases: ['pets'],
    category: 'rpg',
    description: 'Lista seus pets',
    handler: async (ctx) => {
      const pets = getDb().prepare('SELECT * FROM pets WHERE owner_jid = ? AND (group_jid = ? OR group_jid IS NULL OR group_jid = "global")').all(ctx.sender, getScope());
      if (!pets.length) return ctx.reply('🐾 Você não tem pets. Use !adotar_pet');
      let text = '🐾 *Seus Pets*\n\n';
      pets.forEach(p => {
        text += `• ${p.name} (${p.type}) — Fome:${p.hunger} Felicidade:${p.happiness} Energia:${p.energy}\n`;
      });
      await ctx.reply(text);
    }
  },
  {
    name: 'dar_comida',
    aliases: ['alimentar'],
    category: 'rpg',
    description: 'Alimenta o pet',
    handler: async (ctx) => {
      const pets = getDb().prepare('SELECT * FROM pets WHERE owner_jid = ? AND (group_jid = ? OR group_jid IS NULL OR group_jid = "global")').all(ctx.sender, getScope());
      if (!pets.length) return ctx.reply('❌ Sem pets.');
      const pet = pets[0];
      getDb().prepare('UPDATE pets SET hunger = MIN(100, hunger + 30), happiness = MIN(100, happiness + 10) WHERE id = ?').run(pet.id);
      await ctx.reply(`🍖 ${pet.name} comeu e ficou mais feliz!`);
    }
  },
  {
    name: 'brincar',
    category: 'rpg',
    description: 'Brinca com o pet',
    handler: async (ctx) => {
      const pets = getDb().prepare('SELECT * FROM pets WHERE owner_jid = ? AND (group_jid = ? OR group_jid IS NULL OR group_jid = "global")').all(ctx.sender, getScope());
      if (!pets.length) return ctx.reply('❌ Sem pets.');
      const pet = pets[0];
      getDb().prepare('UPDATE pets SET happiness = MIN(100, happiness + 25), energy = MAX(0, energy - 15) WHERE id = ?').run(pet.id);
      await ctx.reply(`🎾 Você brincou com ${pet.name}!`);
    }
  },
  {
    name: 'banhar_pet',
    category: 'rpg',
    description: 'Dá banho no pet',
    handler: async (ctx) => {
      const pets = getDb().prepare('SELECT * FROM pets WHERE owner_jid = ? AND (group_jid = ? OR group_jid IS NULL OR group_jid = "global")').all(ctx.sender, getScope());
      if (!pets.length) return ctx.reply('❌ Sem pets.');
      await ctx.reply(`🛁 ${pets[0].name} está limpinho!`);
    }
  },
  {
    name: 'dormir_pet',
    category: 'rpg',
    description: 'Faz o pet dormir',
    handler: async (ctx) => {
      const pets = getDb().prepare('SELECT * FROM pets WHERE owner_jid = ? AND (group_jid = ? OR group_jid IS NULL OR group_jid = "global")').all(ctx.sender, getScope());
      if (!pets.length) return ctx.reply('❌ Sem pets.');
      getDb().prepare('UPDATE pets SET energy = 100 WHERE id = ?').run(pets[0].id);
      await ctx.reply(`😴 ${pets[0].name} dormiu e recuperou energia.`);
    }
  },
  {
    name: 'status_pet',
    category: 'rpg',
    description: 'Status do pet',
    handler: async (ctx) => {
      const pets = getDb().prepare('SELECT * FROM pets WHERE owner_jid = ? AND (group_jid = ? OR group_jid IS NULL OR group_jid = "global")').all(ctx.sender, getScope());
      if (!pets.length) return ctx.reply('❌ Sem pets.');
      const p = pets[0];
      await ctx.reply(`🐾 *${p.name}* (${p.type})\n🍖 Fome: ${p.hunger}\n😊 Felicidade: ${p.happiness}\n⚡ Energia: ${p.energy}\n⭐ Level: ${p.level}`);
    }
  },
  {
    name: 'treinar_pet',
    category: 'rpg',
    description: 'Treina o pet',
    handler: async (ctx) => {
      const pets = getDb().prepare('SELECT * FROM pets WHERE owner_jid = ? AND (group_jid = ? OR group_jid IS NULL OR group_jid = "global")').all(ctx.sender, getScope());
      if (!pets.length) return ctx.reply('❌ Sem pets.');
      const p = pets[0];
      getDb().prepare('UPDATE pets SET xp = xp + 20, energy = MAX(0, energy - 20), level = CASE WHEN xp + 20 >= level * 50 THEN level + 1 ELSE level END WHERE id = ?').run(p.id);
      await ctx.reply(`🏋️ ${p.name} treinou e ganhou XP!`);
    }
  },
  {
    name: 'expulsar_filho',
    category: 'rpg',
    description: 'Expulsa membro da família',
    usage: '!expulsar_filho @user',
    handler: async (ctx) => {
      const target = ctx.getMentionedOrQuoted();
      if (!target) return ctx.reply('❌ Marque o membro.');
      const database = getDb();
      const mem = database.prepare('SELECT * FROM family_members WHERE jid = ?').get(ctx.sender);
      if (!mem || mem.role !== 'owner') return ctx.reply('❌ Só o dono da família pode expulsar.');
      const targetMem = database.prepare('SELECT * FROM family_members WHERE jid = ? AND family_id = ?').get(target, mem.family_id);
      if (!targetMem) return ctx.reply('❌ Essa pessoa não está na sua família.');
      if (targetMem.role === 'owner') return ctx.reply('❌ Não pode expulsar o dono.');
      database.prepare('DELETE FROM family_members WHERE jid = ? AND family_id = ?').run(target, mem.family_id);
      await ctx.reply(`✅ ${tag(target)} foi expulso(a) da família.`, { mentions: [target] });
    }
  },
  {
    name: 'aceitar_adocao',
    category: 'rpg',
    description: 'Aceita pedido de adoção pendente',
    handler: async (ctx) => {
      const database = getDb();
      const pedido = database.prepare(`
        SELECT * FROM relationships
        WHERE user2_jid = ? AND status = 'pending' AND type = 'adocao'
        ORDER BY created_at DESC LIMIT 1
      `).get(ctx.sender);
      if (!pedido) return ctx.reply('❌ Nenhum pedido de adoção pendente. (Use !adotar para adoção direta)');
      database.prepare(`UPDATE relationships SET status = 'accepted' WHERE id = ?`).run(pedido.id);
      const ownerMem = database.prepare('SELECT * FROM family_members WHERE jid = ?').get(pedido.user1_jid);
      if (ownerMem) {
        database.prepare('INSERT INTO family_members (family_id, jid, role) VALUES (?, ?, ?)').run(ownerMem.family_id, ctx.sender, 'filho');
      }
      await ctx.reply('👶 Adoção aceita!');
    }
  },
  {
    name: 'aniversariocasamento',
    aliases: ['aniversario_casamento'],
    category: 'rpg',
    description: 'Mostra aniversário de casamento',
    handler: async (ctx) => {
      const database = getDb();
      const r = database.prepare(`
        SELECT * FROM relationships
        WHERE status = 'accepted' AND type = 'casamento'
        AND (user1_jid = ? OR user2_jid = ?)
        ORDER BY started_at DESC LIMIT 1
      `).get(ctx.sender, ctx.sender);
      if (!r) return ctx.reply('❌ Você não está casado(a).');
      const other = r.user1_jid === ctx.sender ? r.user2_jid : r.user1_jid;
      const start = new Date(r.started_at);
      const days = Math.floor((Date.now() - start.getTime()) / (1000*60*60*24));
      await ctx.reply(`💒 Casados com ${tag(other)}\nDesde: ${r.started_at}\n⏱ ${days} dias juntos!`, { mentions: [other] });
    }
  },
  {
    name: 'historicofamilia',
    aliases: ['historico_familia'],
    category: 'rpg',
    description: 'Histórico da família',
    handler: async (ctx) => {
      const database = getDb();
      const mem = database.prepare('SELECT * FROM family_members WHERE jid = ?').get(ctx.sender);
      if (!mem) return ctx.reply('❌ Você não está em uma família.');
      const fam = database.prepare('SELECT * FROM families WHERE id = ?').get(mem.family_id);
      const members = database.prepare('SELECT * FROM family_members WHERE family_id = ?').all(mem.family_id);
      let text = `📜 *Histórico — ${fam.name}*\nCriada em: ${fam.created_at}\nMembros: ${members.length}\n\n`;
      members.forEach(m => { text += `• ${tag(m.jid)} (${m.role}) desde ${m.joined_at}\n`; });
      await ctx.reply(text, { mentions: members.map(m => m.jid) });
    }
  },
  {
    name: 'setfoto_pet',
    category: 'rpg',
    description: 'Define nome/foto textual do pet',
    usage: '!setfoto_pet descrição',
    handler: async (ctx) => {
      const database = getDb();
      // garante coluna photo
      try { database.prepare('ALTER TABLE pets ADD COLUMN photo TEXT').run(); } catch (_) {}
      try { database.prepare('ALTER TABLE pets ADD COLUMN group_jid TEXT').run(); } catch (_) {}

      let pets = [];
      try {
        pets = database.prepare(
          'SELECT * FROM pets WHERE owner_jid = ? AND (group_jid = ? OR group_jid IS NULL OR group_jid = \'\') ORDER BY id DESC'
        ).all(ctx.sender, (typeof beatrizGroupId === 'function' ? beatrizGroupId(ctx) : (typeof getScope === 'function' ? getScope() : 'global')));
      } catch (_) {
        pets = database.prepare('SELECT * FROM pets WHERE owner_jid = ? ORDER BY id DESC').all(ctx.sender);
      }
      if (!pets.length) {
        return ctx.reply('❌ Não tens pets.\nCria um com o comando de adotar/criar pet primeiro.');
      }

      const desc = String(ctx.text || ctx.args && ctx.args.join(' ') || '').trim();
      if (!desc) {
        return ctx.reply(
          '📸 *setfoto_pet*\n\n' +
          'Define a *descrição/foto textual* do teu pet (não é imagem).\n\n' +
          'Uso:\n*setfoto_pet 🐶 fofinho e bravo*\n\n' +
          'Pet atual: *' + pets[0].name + '*'
        );
      }

      database.prepare('UPDATE pets SET photo = ? WHERE id = ?').run(desc.slice(0, 200), pets[0].id);
      await ctx.reply('✅ Descrição do pet *' + pets[0].name + '* atualizada:\n' + desc.slice(0, 100));
    }
  }
,
  {
    name: 'limparrel',
    aliases: ['limparrelacionamento', 'resetrel'],
    category: 'rpg',
    description: 'Forca limpar teu relacionamento (bug)',
    handler: async (ctx) => {
      const database = getDb();
      const info = database.prepare(`
        UPDATE relationships SET status = 'ended', ended_at = datetime('now')
        WHERE status IN ('accepted','pending') AND type IN ('namoro','casamento')
        AND (user1_jid = ? OR user2_jid = ?)
      `).run(ctx.sender, ctx.sender);
      await ctx.reply('🧹 Relacionamentos limpos: *' + (info.changes || 0) + '*');
    }
  }
];

