/**
 * Comandos de segurança / anti-*
 */

const db = require('../../database');

async function requireAdmin(ctx) {
  if (!ctx.isGroup) {
    await ctx.reply('❌ Apenas em grupos.');
    return false;
  }
  const ok = await ctx.isGroupAdmin() || ctx.isOwner() || ctx.isBotAdmin();
  if (!ok) {
    await ctx.reply('❌ Apenas administradores.');
    return false;
  }
  return true;
}

function toggleAnti(field) {
  return async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const arg = (ctx.args[0] || '').toLowerCase();
    const g = ctx.group;
    if (arg === 'on' || arg === 'ativar') {
      db.updateGroup(ctx.jid, { [field]: 1 });
      await ctx.reply(`✅ ${field} *ativado*.`);
    } else if (arg === 'off' || arg === 'desativar') {
      db.updateGroup(ctx.jid, { [field]: 0 });
      await ctx.reply(`✅ ${field} *desativado*.`);
    } else {
      await ctx.reply(`🛡️ ${field}: ${g[field] ? 'ATIVADO' : 'DESATIVADO'}\nUse: !${field} on/off`);
    }
  };
}

module.exports = [
  { name: 'antilink', category: 'seguranca', description: 'Anti-link básico', groupOnly: true, adminOnly: true, handler: toggleAnti('antilink') },
  { name: 'antilinkhard', category: 'seguranca', description: 'Anti-link rigoroso', groupOnly: true, adminOnly: true, handler: toggleAnti('antilink_hard') },
  { name: 'antilinkeasy', category: 'seguranca', description: 'Anti-link leve', groupOnly: true, adminOnly: true, handler: toggleAnti('antilink_easy') },
  { name: 'antiimg', category: 'seguranca', description: 'Anti imagem', groupOnly: true, adminOnly: true, handler: toggleAnti('antiimg') },
  { name: 'antivideo', category: 'seguranca', description: 'Anti vídeo', groupOnly: true, adminOnly: true, handler: toggleAnti('antivideo') },
  { name: 'antiaudio', category: 'seguranca', description: 'Anti áudio', groupOnly: true, adminOnly: true, handler: toggleAnti('antiaudio') },
  { name: 'antisticker', category: 'seguranca', description: 'Anti sticker', groupOnly: true, adminOnly: true, handler: toggleAnti('antisticker') },
  { name: 'antidoc', category: 'seguranca', description: 'Anti documento', groupOnly: true, adminOnly: true, handler: toggleAnti('antidoc') },
  { name: 'antistatus', category: 'seguranca', description: 'Anti status', groupOnly: true, adminOnly: true, handler: toggleAnti('antistatus') },
  { name: 'anticontato', category: 'seguranca', description: 'Anti contato', groupOnly: true, adminOnly: true, handler: toggleAnti('anticontato') },
  { name: 'antilocal', category: 'seguranca', description: 'Anti localização', groupOnly: true, adminOnly: true, handler: toggleAnti('antilocal') },
  { name: 'anticanal', category: 'seguranca', description: 'Anti canal', groupOnly: true, adminOnly: true, handler: toggleAnti('anticanal') },
  { name: 'antispam', category: 'seguranca', description: 'Anti spam', groupOnly: true, adminOnly: true, handler: toggleAnti('antispam') },
  { name: 'antipalavra', category: 'seguranca', description: 'Anti palavra', groupOnly: true, adminOnly: true, handler: toggleAnti('antipalavra') },
  { name: 'antipalavrao', category: 'seguranca', description: 'Anti palavrão', groupOnly: true, adminOnly: true, handler: toggleAnti('antipalavrao') },
  { name: 'antifake', category: 'seguranca', description: 'Anti número fake', groupOnly: true, adminOnly: true, handler: toggleAnti('antifake') },
  { name: 'antipagamento', category: 'seguranca', description: 'Anti comprovativo falso', groupOnly: true, adminOnly: true, handler: toggleAnti('antipagamento') },
  { name: 'anticatalogo', category: 'seguranca', description: 'Anti catálogo', groupOnly: true, adminOnly: true, handler: toggleAnti('anticatalogo') },
  { name: 'antidelete', category: 'seguranca', description: 'Anti delete (mostra apagadas)', groupOnly: true, adminOnly: true, handler: toggleAnti('antidelete') },
  { name: 'antidd', category: 'seguranca', description: 'Anti DDD', groupOnly: true, adminOnly: true, handler: toggleAnti('antidd') },
  {
    name: 'addddd',
    category: 'seguranca',
    description: 'Adiciona DDD bloqueado',
    groupOnly: true,
    adminOnly: true,
    usage: '!addddd 84',
    handler: async (ctx) => {
      if (!(await requireAdmin(ctx))) return;
      const ddd = (ctx.args[0] || '').replace(/\D/g, '');
      if (!ddd) return ctx.reply('❌ Informe o DDD. Ex: !addddd 84');
      const g = ctx.group;
      let list = [];
      try { list = JSON.parse(g.ddd_list || '[]'); } catch {}
      if (!list.includes(ddd)) list.push(ddd);
      db.updateGroup(ctx.jid, { ddd_list: JSON.stringify(list) });
      await ctx.reply(`✅ DDD ${ddd} adicionado à lista.`);
    }
  },
  {
    name: 'delddd',
    category: 'seguranca',
    description: 'Remove DDD da lista',
    groupOnly: true,
    adminOnly: true,
    handler: async (ctx) => {
      if (!(await requireAdmin(ctx))) return;
      const ddd = (ctx.args[0] || '').replace(/\D/g, '');
      const g = ctx.group;
      let list = [];
      try { list = JSON.parse(g.ddd_list || '[]'); } catch {}
      list = list.filter(d => d !== ddd);
      db.updateGroup(ctx.jid, { ddd_list: JSON.stringify(list) });
      await ctx.reply(`✅ DDD ${ddd} removido.`);
    }
  },
  {
    name: 'listddd',
    category: 'seguranca',
    description: 'Lista DDDs bloqueados',
    groupOnly: true,
    handler: async (ctx) => {
      const g = ctx.group;
      let list = [];
      try { list = JSON.parse(g.ddd_list || '[]'); } catch {}
      await ctx.reply(list.length ? `📋 DDDs bloqueados: ${list.join(', ')}` : '📋 Nenhum DDD na lista.');
    }
  },
  {
    name: 'disabled_blockcmd_admin',
    category: 'seguranca',
    description: 'Bloqueia comando no grupo',
    groupOnly: true,
    adminOnly: true,
    usage: '!blockcmd ban',
    handler: async (ctx) => {
      if (!(await requireAdmin(ctx))) return;
      const cmd = (ctx.args[0] || '').toLowerCase();
      if (!cmd) return ctx.reply('❌ Informe o comando.');
      const g = ctx.group;
      let list = [];
      try { list = JSON.parse(g.blocked_cmds || '[]'); } catch {}
      if (!list.includes(cmd)) list.push(cmd);
      db.updateGroup(ctx.jid, { blocked_cmds: JSON.stringify(list) });
      await ctx.reply(`✅ Comando *${cmd}* bloqueado neste grupo.`);
    }
  },
  {
    name: 'disabled_unblockcmd_admin',
    category: 'seguranca',
    description: 'Desbloqueia comando',
    groupOnly: true,
    adminOnly: true,
    handler: async (ctx) => {
      if (!(await requireAdmin(ctx))) return;
      const cmd = (ctx.args[0] || '').toLowerCase();
      const g = ctx.group;
      let list = [];
      try { list = JSON.parse(g.blocked_cmds || '[]'); } catch {}
      list = list.filter(c => c !== cmd);
      db.updateGroup(ctx.jid, { blocked_cmds: JSON.stringify(list) });
      await ctx.reply(`✅ Comando *${cmd}* desbloqueado.`);
    }
  },
  {
    name: 'disabled_listbcmd_admin',
    category: 'seguranca',
    description: 'Lista comandos bloqueados',
    groupOnly: true,
    handler: async (ctx) => {
      const g = ctx.group;
      let list = [];
      try { list = JSON.parse(g.blocked_cmds || '[]'); } catch {}
      await ctx.reply(list.length ? `🚫 Comandos bloqueados:\n${list.join(', ')}` : '📋 Nenhum comando bloqueado.');
    }
  },
  {
    name: 'setfigban',
    category: 'seguranca',
    description: 'Ativa ban de stickers (anti-sticker on)',
    groupOnly: true,
    adminOnly: true,
    handler: async (ctx) => {
      if (!(await requireAdmin(ctx))) return;
      db.updateGroup(ctx.jid, { antisticker: 1 });
      await ctx.reply('✅ Anti-sticker ativado. Stickers serão removidos automaticamente.');
    }
  },
  {
    name: 'delfigban',
    category: 'seguranca',
    description: 'Desativa ban de stickers',
    groupOnly: true,
    adminOnly: true,
    handler: async (ctx) => {
      if (!(await requireAdmin(ctx))) return;
      db.updateGroup(ctx.jid, { antisticker: 0 });
      await ctx.reply('✅ Anti-sticker desativado.');
    }
  },
  {
    name: 'listfigban',
    category: 'seguranca',
    description: 'Status do anti-sticker',
    groupOnly: true,
    handler: async (ctx) => {
      const g = ctx.group;
      await ctx.reply(`🎴 Anti-sticker: *${g.antisticker ? 'ATIVADO' : 'DESATIVADO'}*`);
    }
  },
  {
    name: 'modofigban',
    category: 'seguranca',
    description: 'Alterna anti-sticker',
    groupOnly: true,
    adminOnly: true,
    handler: async (ctx) => {
      if (!(await requireAdmin(ctx))) return;
      const g = ctx.group;
      const next = g.antisticker ? 0 : 1;
      db.updateGroup(ctx.jid, { antisticker: next });
      await ctx.reply(`✅ Anti-sticker: *${next ? 'ON' : 'OFF'}*`);
    }
  }
];
