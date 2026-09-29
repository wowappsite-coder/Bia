
function getRawMessageText(msg) {
  if (!msg || !msg.message) return '';
  const m = msg.message;
  return String(
    m.conversation ||
    (m.extendedTextMessage && m.extendedTextMessage.text) ||
    (m.imageMessage && m.imageMessage.caption) ||
    (m.videoMessage && m.videoMessage.caption) ||
    ''
  );
}

function parseAddCmdBody(msg, cmdNames) {
  let raw = getRawMessageText(msg).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const alt = (cmdNames || []).map(function (n) {
    return n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('|');
  raw = raw.replace(new RegExp('^\\s*[.!#]?(?:' + alt + ')\\b\\s*', 'i'), '');
  const idx = raw.indexOf('|');
  if (idx < 0) return null;
  const namePart = raw.slice(0, idx).replace(/\s+/g, ' ').trim();
  let response = raw.slice(idx + 1);
  // remove so uma linha em branco inicial; NAO colapsar o resto
  response = response.replace(/^\n/, '').replace(/\s+$/, '');
  if (response.charAt(0) === ' ') response = response.replace(/^ +/, '');
  if (!namePart || !response.trim()) return null;
  return { name: namePart, response: response };
}

const { normalizeCmd } = require('../../utils/parser');
/**
 * Comandos exclusivos do dono
 */
const db = require('../../database');
const { getDb } = require('../../database');
const config = require('../../config');
const registry = require('../registry');
const fs = require('fs');
const path = require('path');


function extractAddcmdPayload(ctx) {
  // texto apos o comando, PRESERVANDO quebras de linha
  let full = '';
  if (ctx.text && String(ctx.text).length) full = String(ctx.text);
  else if (ctx.body) {
    full = String(ctx.body).replace(/^[!./]*(addcmd1|addcmd2|addcmd3)\s+/i, '');
  }
  full = full.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  let name = '';
  let response = '';

  const pipe = full.indexOf('|');
  if (pipe >= 0) {
    name = full.slice(0, pipe).replace(/\n/g, ' ').trim();
    response = full.slice(pipe + 1).replace(/^\n+/, '');
  } else {
    // 1a linha = nome, resto = resposta
    const nl = full.indexOf('\n');
    if (nl >= 0) {
      name = full.slice(0, nl).trim();
      response = full.slice(nl + 1).replace(/^\n+/, '');
    } else {
      name = full.trim();
      response = '';
    }
  }

  // se resposta vazia, usa mensagem citada
  if (!response.trim() && ctx.msg && ctx.msg.message) {
    try {
      const m = ctx.msg.message;
      const ci =
        (m.extendedTextMessage && m.extendedTextMessage.contextInfo) ||
        (m.imageMessage && m.imageMessage.contextInfo) ||
        null;
      const q = ci && ci.quotedMessage;
      if (q) {
        response =
          q.conversation ||
          (q.extendedTextMessage && q.extendedTextMessage.text) ||
          (q.imageMessage && q.imageMessage.caption) ||
          (q.videoMessage && q.videoMessage.caption) ||
          '';
        response = String(response).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      }
    } catch (_) {}
  }

  response = String(response).replace(/\s+$/g, '');
  return { name: name, response: response };
}

function requireOwner(ctx) {
  if (!ctx.isOwner()) {
    ctx.reply('❌ Apenas o dono pode usar este comando.');
    return false;
  }
  return true;
}

module.exports = [
  {
    name: 'reiniciar',
    aliases: ['restart'],
    category: 'dono',
    description: 'Reinicia o bot',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      await ctx.reply('🔄 Reiniciando...');
      process.exit(0);
    }
  },
  {
    name: 'desligar',
    aliases: ['shutdown'],
    category: 'dono',
    description: 'Desliga o bot',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      await ctx.reply('⏹ Desligando...');
      process.exit(1);
    }
  },
  {
    name: 'broadcast',
    aliases: ['bc'],
    category: 'dono',
    description: 'Broadcast para grupos',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      if (!ctx.text) return ctx.reply('❌ Informe a mensagem.');
      const groups = getDb().prepare('SELECT jid FROM groups').all();
      let ok = 0;
      for (const g of groups) {
        try {
          await ctx.sock.sendMessage(g.jid, { text: `📢 *Broadcast*\n\n${ctx.text}` });
          ok++;
          await new Promise(r => setTimeout(r, 1200));
        } catch {}
      }
      await ctx.reply(`✅ Enviado para ${ok} grupos.`);
    }
  },
  {
    name: 'listagrupos',
    category: 'dono',
    description: 'Lista grupos',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      const groups = getDb().prepare('SELECT jid, name FROM groups LIMIT 40').all();
      let text = normalizeCommandText(`👥 Grupos: ${groups.length}\n\n`);
      groups.forEach((g, i) => { text += `${i+1}. ${g.name || g.jid.slice(0,18)}\n`; });
      await ctx.reply(text);
    }
  },
  {
    name: 'listausuarios',
    category: 'dono',
    description: 'Stats usuários',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      const total = getDb().prepare('SELECT COUNT(*) as c FROM users').get().c;
      const banned = getDb().prepare('SELECT COUNT(*) as c FROM users WHERE banned = 1').get().c;
      await ctx.reply(`👤 Usuários: ${total}\n🚫 Banidos: ${banned}`);
    }
  },
  {
    name: 'blockuser',
    category: 'dono',
    description: 'Ban global',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      const target = ctx.getMentionedOrQuoted();
      if (!target) return ctx.reply('❌ Marque o usuário.');
      const reason = ctx.text.replace(/@\d+/g, '').trim() || 'Sem motivo';
      db.updateUser(target, { banned: 1, ban_reason: reason });
      getDb().prepare('INSERT OR IGNORE INTO blacklist (jid, number, reason, added_by) VALUES (?, ?, ?, ?)').run(target, target.replace(/\D/g,''), reason, ctx.sender);
      await ctx.reply('🚫 Banido globalmente.');
    }
  },
  {
    name: 'unblockuser',
    category: 'dono',
    description: 'Remove ban global',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      const target = ctx.getMentionedOrQuoted();
      if (!target) return ctx.reply('❌ Marque o usuário.');
      db.updateUser(target, { banned: 0, ban_reason: null });
      getDb().prepare('DELETE FROM blacklist WHERE jid = ?').run(target);
      await ctx.reply('✅ Desbanido.');
    }
  },
  {
    name: 'addadmin',
    category: 'dono',
    description: 'Adiciona admin do bot',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      const target = ctx.getMentionedOrQuoted();
      if (!target) return ctx.reply('❌ Marque o usuário.');
      getDb().prepare('INSERT OR IGNORE INTO bot_admins (jid, number, added_by) VALUES (?, ?, ?)').run(target, target.replace(/\D/g,''), ctx.sender);
      await ctx.reply('✅ Admin adicionado.');
    }
  },
  {
    name: 'deladmin',
    category: 'dono',
    description: 'Remove admin do bot',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      const target = ctx.getMentionedOrQuoted();
      if (!target) return ctx.reply('❌ Marque o usuário.');
      getDb().prepare('DELETE FROM bot_admins WHERE jid = ?').run(target);
      await ctx.reply('✅ Admin removido.');
    }
  },
  {
    name: 'addcmd1',
    category: 'dono',
    description: 'Cria comando COM prefixo (deste grupo)',
    ownerOnly: true,
    usage: '!addcmd1 nome | resposta',
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      const parsed = parseAddCmdBody(ctx.msg, ['addcmd1', 'addcmd']);
      if (!parsed) return ctx.reply('❌ Use:\n!addcmd1 nome | resposta\n\n(Pode ser multi-linha depois do |)');
      const cmdName = normalizeCmd(parsed.name);
      const response = parsed.response;
      const g = ctx.isGroup ? ctx.jid : 'global';
      getDb().prepare(
        'INSERT OR REPLACE INTO custom_commands (group_jid, name, response, with_prefix, created_by) VALUES (?, ?, ?, 1, ?)'
      ).run(g, cmdName, response, ctx.sender);
      try {
        registry.register({
          name: cmdName,
          category: 'custom',
          description: 'Custom',
          handler: async (c) => {
            const cg = c.isGroup ? c.jid : 'global';
            const row = getDb().prepare(
              'SELECT response FROM custom_commands WHERE name = ? AND with_prefix = 1 AND group_jid = ?'
            ).get(cmdName, cg);
            if (!row) return c.reply('❌ Comando não existe neste grupo.');
            return c.reply(String(row.response || '').replace(/\r\n/g, '\n'));
          }
        });
      } catch (e) {}
      await ctx.reply('✅ Comando ' + config.prefixes[0] + cmdName + ' criado *neste grupo*.');
    }
  },
  {
    name: 'addcmd2',
    category: 'dono',
    description: 'Cria comando SEM prefixo (deste grupo)',
    ownerOnly: true,
    usage: '!addcmd2 nome | resposta',
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      const parsed = parseAddCmdBody(ctx.msg, ['addcmd2']);
      if (!parsed) return ctx.reply('❌ Use:\n!addcmd2 nome | resposta\n\n(Pode ser multi-linha depois do |)');
      const cmdName = normalizeCmd(parsed.name);
      const response = parsed.response;
      const g = ctx.isGroup ? ctx.jid : 'global';
      getDb().prepare(
        'INSERT OR REPLACE INTO custom_commands (group_jid, name, response, with_prefix, created_by) VALUES (?, ?, ?, 0, ?)'
      ).run(g, cmdName, response, ctx.sender);
      try {
        registry.register({
          name: cmdName,
          category: 'custom',
          description: 'Custom',
          handler: async (c) => {
            const cg = c.isGroup ? c.jid : 'global';
            const row = getDb().prepare(
              'SELECT response FROM custom_commands WHERE name = ? AND with_prefix = 0 AND group_jid = ?'
            ).get(cmdName, cg);
            if (!row) return c.reply('❌ Comando não existe neste grupo.');
            return c.reply(String(row.response || '').replace(/\r\n/g, '\n'));
          }
        });
      } catch (e) {}
      await ctx.reply('✅ Comando *' + cmdName + '* criado *neste grupo* (sem prefixo).');
    }
  },

  {
    name: 'addcmd3',
    aliases: ['addcmdglobal', 'addglobal'],
    category: 'dono',
    description: 'Cria comando GLOBAL (todos os grupos, sem prefixo)',
    ownerOnly: true,
    usage: '!addcmd3 nome | resposta',
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      const parts = ctx.text.split('|').map(s => s.trim());
      if (parts.length < 2) return ctx.reply('❌ Use: !addcmd3 nome | resposta');
      const cmdName = normalizeCmd(parts[0]);
      const response = parts.slice(1).join('|').trim();
      if (!cmdName || !response) return ctx.reply('❌ Nome e resposta obrigatorios.');
      // group_jid = '*' => global
      getDb().prepare(
        "INSERT OR REPLACE INTO custom_commands (group_jid, name, response, with_prefix, created_by) VALUES ('*', ?, ?, 0, ?)"
      ).run(cmdName, response, ctx.sender);
      try {
        registry.register({
          name: cmdName,
          category: 'custom',
          description: 'Custom GLOBAL',
          handler: async (c) => {
            const db = getDb();
            const cg = c.isGroup ? c.jid : 'global';
            // grupo tem prioridade sobre global
            let row = db.prepare(
              'SELECT response FROM custom_commands WHERE name = ? AND group_jid = ? LIMIT 1'
            ).get(cmdName, cg);
            if (!row) {
              row = db.prepare(
                "SELECT response FROM custom_commands WHERE name = ? AND group_jid = '*' LIMIT 1"
              ).get(cmdName);
            }
            if (!row) return; // mudo
            return c.reply(row.response);
          }
        });
      } catch (e) {}
      await ctx.reply('✅ Comando *' + cmdName + '* criado em modo *GLOBAL* (todos os grupos, sem prefixo).');
    }
  },
  {
    name: 'delcmd3',
    aliases: ['delcmdglobal', 'delglobal'],
    category: 'dono',
    description: 'Remove comando custom GLOBAL',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      const name = normalizeCmd(ctx.args[0] || ctx.text || '');
      if (!name) return ctx.reply('❌ Informe o nome. Ex: delcmd3 regras');
      const r = getDb().prepare(
        "DELETE FROM custom_commands WHERE name = ? AND group_jid = '*'"
      ).run(name);
      const still = getDb().prepare('SELECT 1 FROM custom_commands WHERE name = ? LIMIT 1').get(name);
      if (!still && registry.unregister) {
        try { registry.unregister(name); } catch (_) {}
      }
      await ctx.reply(r.changes ? ('✅ *' + name + '* removido do *GLOBAL*.') : ('❌ *' + name + '* nao existia no global.'));
    }
  },
  {
    name: 'delcmd',
    category: 'dono',
    description: 'Remove comando custom deste grupo',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      const name = (ctx.args[0] || '').toLowerCase();
      if (!name) return ctx.reply('❌ Informe o nome.');
      const g = ctx.isGroup ? ctx.jid : 'global';
      const r = getDb().prepare('DELETE FROM custom_commands WHERE name = ? AND group_jid = ?').run(name, g);
      // remove do registry só se não existir em nenhum grupo
      const still = getDb().prepare('SELECT 1 FROM custom_commands WHERE name = ? LIMIT 1').get(name);
      if (!still && registry.unregister) {
        try { registry.unregister(name); } catch (_) {}
      }
      await ctx.reply(r.changes ? `✅ ${name} removido *deste grupo*.` : `❌ ${name} não existia neste grupo.`);
    }
  },
  {
    name: 'listcmd',
    category: 'dono',
    description: 'Lista custom commands',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      const g = ctx.isGroup ? ctx.jid : 'global';
      const cmds = getDb().prepare('SELECT * FROM custom_commands WHERE group_jid = ?').all(g);
      if (!cmds.length) return ctx.reply('Nenhum neste grupo.');
      let text = '✨ Custom *deste grupo*:\n';
      cmds.forEach(c => { text += `• ${c.with_prefix ? '!' : ''}${c.name}\n`; });
      await ctx.reply(text);
    }
  },
  {
    name: 'editcmd',
    category: 'dono',
    description: 'Edita custom command',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      const parsed = parseAddCmdBody(ctx.msg, ['editcmd']);
      if (!parsed) return ctx.reply('❌ !editcmd nome | nova resposta\n(Pode ser multi-linha)');
      const g = ctx.isGroup ? ctx.jid : 'global';
      const r = getDb().prepare(
        'UPDATE custom_commands SET response = ? WHERE name = ? AND group_jid = ?'
      ).run(parsed.response, normalizeCmd(parsed.name), g);
      await ctx.reply(r.changes ? '✅ Atualizado.' : '❌ Não encontrado.');
    }
  },

  {
    name: 'backup',
    category: 'dono',
    description: 'Backup do banco',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      try {
        const dest = path.join(path.dirname(config.dbPath), `backup_${Date.now()}.db`);
        fs.copyFileSync(config.dbPath, dest);
        await ctx.reply(`✅ Backup: ${path.basename(dest)}`);
      } catch (e) {
        await ctx.reply('❌ ' + e.message);
      }
    }
  },
  {
    name: 'logs',
    category: 'dono',
    description: 'Últimos logs',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      const rows = getDb().prepare('SELECT * FROM logs ORDER BY id DESC LIMIT 8').all();
      let text = '📜 Logs\n';
      rows.forEach(r => { text += `[${r.type}] ${(r.message||'').slice(0,60)}\n`; });
      await ctx.reply(text || 'Vazio');
    }
  },
  {
    name: 'stats',
    category: 'dono',
    description: 'Estatísticas',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      const users = getDb().prepare('SELECT COUNT(*) as c FROM users').get().c;
      const groups = getDb().prepare('SELECT COUNT(*) as c FROM groups').get().c;
      const cmds = registry.stats().totalMain;
      await ctx.reply(`📊 Users: ${users}\nGrupos: ${groups}\nComandos: ${cmds}`);
    }
  },
  {
    name: 'setprefix',
    category: 'dono',
    description: 'Altera prefixos runtime',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      if (!ctx.args.length) return ctx.reply(`Atuais: ${config.prefixes.join(' ')}`);
      config.prefixes = ctx.args;
      await ctx.reply(`✅ Prefixos: ${ctx.args.join(' ')}`);
    }
  },
  {
    name: 'banlist',
    category: 'dono',
    description: 'Lista blacklist',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!requireOwner(ctx)) return;
      const list = getDb().prepare('SELECT * FROM blacklist LIMIT 15').all();
      let text = '🚫 Blacklist\n';
      list.forEach(b => { text += `• ${b.number||b.jid}\n`; });
      await ctx.reply(text || 'Vazia');
    }
  }
];
