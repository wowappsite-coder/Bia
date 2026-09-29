/**
 * Codigos de acesso para planos / aluguel
 * gerarcodigo | resgatarcodigo | listacodigos | detalhecodigo | apagarcodigo
 */
const { getDb } = require('../../database');

function ensureTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS access_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      days INTEGER NOT NULL,
      status TEXT DEFAULT 'unused',
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      used_by TEXT,
      used_group TEXT,
      activated_at TEXT,
      expires_at TEXT
    )
  `);
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code)`);
  } catch (_) {}
}

function randChunk(len) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function generateCode() {
  // UGP-X7K2-P9LM
  return 'UGP-' + randChunk(4) + '-' + randChunk(4);
}

function parseDays(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  let m = s.match(/^(\d+)\s*d(?:ays?|ias?)?$/i);
  if (m) return parseInt(m[1], 10);
  m = s.match(/^(\d+)$/);
  if (m) return parseInt(m[1], 10);
  return null;
}

function isOwner(ctx) {
  return typeof ctx.isOwner === 'function' && ctx.isOwner();
}

function activateSubscription(groupJid, days, meta) {
  const db = getDb();
  try {
    db.prepare('ALTER TABLE subscriptions ADD COLUMN plan_days INTEGER').run();
  } catch (_) {}
  try {
    db.prepare('ALTER TABLE subscriptions ADD COLUMN activated_by TEXT').run();
  } catch (_) {}
  try {
    db.prepare('ALTER TABLE subscriptions ADD COLUMN access_code TEXT').run();
  } catch (_) {}

  const end = new Date();
  end.setDate(end.getDate() + days);
  const endIso = end.toISOString();

  db.prepare(`
    INSERT INTO subscriptions (group_jid, plan_id, start_date, end_date, status, plan_days)
    VALUES (?, NULL, datetime('now'), ?, 'active', ?)
    ON CONFLICT(group_jid) DO UPDATE SET
      plan_id = NULL,
      start_date = datetime('now'),
      end_date = excluded.end_date,
      status = 'active',
      plan_days = excluded.plan_days
  `).run(groupJid, endIso, days);

  try {
    if (meta && meta.user) {
      db.prepare(
        `UPDATE subscriptions SET activated_by = ?, access_code = ? WHERE group_jid = ?`
      ).run(meta.user, meta.code || null, groupJid);
    }
  } catch (_) {}

  return endIso;
}

module.exports = [
  {
    name: 'gerarcodigo',
    aliases: ['gencode', 'criarcodigo', 'codegen'],
    category: 'dono',
    description: 'Gera codigo de acesso (Owner)',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!isOwner(ctx)) return ctx.reply('❌ Apenas o dono.');
      ensureTable();

      const arg =
        (ctx.args && ctx.args[0]) ||
        String(ctx.text || '')
          .replace(/^(gerarcodigo|gencode|criarcodigo|codegen)\s*/i, '')
          .trim()
          .split(/\s+/)[0];

      const days = parseDays(arg);
      if (!days || days < 1 || days > 365) {
        return ctx.reply(
          '❌ Uso: *gerarcodigo 30d*\n\n' +
            'Exemplos:\n' +
            '• gerarcodigo 7d\n' +
            '• gerarcodigo 15\n' +
            '• gerarcodigo 30d\n' +
            '• gerarcodigo 365d\n\n' +
            'Dias permitidos: *1 a 365*'
        );
      }

      const db = getDb();
      let code = generateCode();
      let tries = 0;
      while (tries < 10) {
        const exists = db.prepare('SELECT id FROM access_codes WHERE code = ?').get(code);
        if (!exists) break;
        code = generateCode();
        tries++;
      }

      const by = ctx.sender || ctx.jid || '';
      db.prepare(
        `INSERT INTO access_codes (code, days, status, created_by) VALUES (?, ?, 'unused', ?)`
      ).run(code, days, by);

      await ctx.reply(
        '🎫 *CODIGO GERADO*\n\n' +
          '🔑 Codigo: *' +
          code +
          '*\n' +
          '📅 Plano: *' +
          days +
          ' dias*\n' +
          '📌 Status: *nao usado*\n' +
          '⏳ Expira so depois de resgatar\n\n' +
          'Cliente no *grupo* digita:\n' +
          '*resgatarcodigo ' +
          code +
          '*'
      );
    }
  },
  {
    name: 'resgatarcodigo',
    aliases: ['redeem', 'usarcodigo', 'ativarcodigo'],
    category: 'aluguel',
    description: 'Resgata codigo e ativa o plano no grupo',
    groupOnly: true,
    handler: async (ctx) => {
      ensureTable();
      if (!ctx.isGroup) {
        return ctx.reply('❌ Resgata o codigo *dentro do grupo* onde o bot deve ficar ativo.');
      }

      const raw =
        (ctx.args && ctx.args.join(' ')) ||
        String(ctx.text || '')
          .replace(/^(resgatarcodigo|redeem|usarcodigo|ativarcodigo)\s*/i, '')
          .trim();

      const code = String(raw || '')
        .toUpperCase()
        .replace(/\s+/g, '');

      if (!code || code.length < 6) {
        return ctx.reply('❌ Uso: *resgatarcodigo UGP-XXXX-XXXX*');
      }

      const db = getDb();
      const row = db.prepare('SELECT * FROM access_codes WHERE code = ?').get(code);

      if (!row) {
        return ctx.reply('❌ Codigo invalido.');
      }
      if (row.status !== 'unused') {
        return ctx.reply(
          '❌ Este codigo *ja foi usado*.\nCada codigo so funciona uma vez.'
        );
      }

      const days = parseInt(row.days, 10) || 0;
      if (days < 1) {
        return ctx.reply('❌ Codigo com plano invalido. Fala com o Owner.');
      }

      const endIso = activateSubscription(ctx.jid, days, {
        user: ctx.sender,
        code
      });

      db.prepare(
        `UPDATE access_codes SET
          status = 'used',
          used_by = ?,
          used_group = ?,
          activated_at = datetime('now'),
          expires_at = ?
         WHERE code = ? AND status = 'unused'`
      ).run(ctx.sender, ctx.jid, endIso, code);

      // confirma
      const check = db.prepare('SELECT status FROM access_codes WHERE code = ?').get(code);
      if (!check || check.status !== 'used') {
        return ctx.reply('❌ Falha ao marcar codigo. Tenta de novo ou contacta o Owner.');
      }

      await ctx.reply(
        '✅ *CODIGO RESGATADO*\n\n' +
          '🔑 ' +
          code +
          '\n' +
          '📅 Plano: *' +
          days +
          ' dias*\n' +
          '▶️ Ativo desde: *agora*\n' +
          '⏹️ Expira em: *' +
          endIso.slice(0, 10) +
          '*\n\n' +
          'O bot esta ativo neste grupo.'
      );
    }
  },
  {
    name: 'listacodigos',
    aliases: ['codigos', 'listcodes'],
    category: 'dono',
    description: 'Lista codigos de acesso',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!isOwner(ctx)) return ctx.reply('❌ Apenas o dono.');
      ensureTable();
      const db = getDb();
      const filter = ((ctx.args && ctx.args[0]) || '').toLowerCase();
      let rows;
      if (filter === 'unused' || filter === 'livres' || filter === 'livre') {
        rows = db
          .prepare(
            `SELECT * FROM access_codes WHERE status = 'unused' ORDER BY id DESC LIMIT 30`
          )
          .all();
      } else if (filter === 'used' || filter === 'usados') {
        rows = db
          .prepare(
            `SELECT * FROM access_codes WHERE status = 'used' ORDER BY id DESC LIMIT 30`
          )
          .all();
      } else {
        rows = db
          .prepare(`SELECT * FROM access_codes ORDER BY id DESC LIMIT 30`)
          .all();
      }

      if (!rows.length) return ctx.reply('📭 Nenhum codigo.');

      let text = '🎫 *LISTA DE CODIGOS*\n';
      if (filter) text += 'Filtro: ' + filter + '\n';
      text += '\n';
      for (const r of rows) {
        const st =
          r.status === 'unused' ? '🟢 livre' : r.status === 'used' ? '🔴 usado' : r.status;
        text +=
          '• *' +
          r.code +
          '* | ' +
          r.days +
          'd | ' +
          st +
          (r.expires_at ? ' | exp ' + String(r.expires_at).slice(0, 10) : '') +
          '\n';
      }
      text += '\nDetalhe: *detalhecodigo UGP-XXXX-XXXX*';
      await ctx.reply(text);
    }
  },
  {
    name: 'detalhecodigo',
    aliases: ['codeinfo', 'infocodigo'],
    category: 'dono',
    description: 'Detalhe de um codigo',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!isOwner(ctx)) return ctx.reply('❌ Apenas o dono.');
      ensureTable();
      const code = String((ctx.args && ctx.args[0]) || '')
        .toUpperCase()
        .replace(/\s+/g, '');
      if (!code) return ctx.reply('❌ Uso: *detalhecodigo UGP-XXXX-XXXX*');

      const r = getDb().prepare('SELECT * FROM access_codes WHERE code = ?').get(code);
      if (!r) return ctx.reply('❌ Codigo nao encontrado.');

      let text =
        '🎫 *DETALHE DO CODIGO*\n\n' +
        '🔑 Codigo: *' +
        r.code +
        '*\n' +
        '📅 Dias: *' +
        r.days +
        '*\n' +
        '📌 Status: *' +
        r.status +
        '*\n' +
        '🆕 Criado: ' +
        (r.created_at || '-') +
        '\n';

      if (r.status === 'used') {
        text +=
          '👤 Usado por: ' +
          (r.used_by || '-') +
          '\n' +
          '👥 Grupo: ' +
          (r.used_group || '-') +
          '\n' +
          '▶️ Ativado: ' +
          (r.activated_at || '-') +
          '\n' +
          '⏹️ Expira: ' +
          (r.expires_at || '-') +
          '\n';
      } else {
        text += '⏳ Ainda nao usado (nao expira ate resgatar)\n';
      }

      await ctx.reply(text);
    }
  },
  {
    name: 'apagarcodigo',
    aliases: ['delcodigo', 'revogarcodigo'],
    category: 'dono',
    description: 'Apaga/revoga codigo nao usado',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!isOwner(ctx)) return ctx.reply('❌ Apenas o dono.');
      ensureTable();
      const code = String((ctx.args && ctx.args[0]) || '')
        .toUpperCase()
        .replace(/\s+/g, '');
      if (!code) return ctx.reply('❌ Uso: *apagarcodigo UGP-XXXX-XXXX*');
      const db = getDb();
      const r = db.prepare('SELECT * FROM access_codes WHERE code = ?').get(code);
      if (!r) return ctx.reply('❌ Codigo nao encontrado.');
      if (r.status === 'used') {
        return ctx.reply(
          '❌ Codigo ja usado. Nao apaga o historico.\n(O plano no grupo continua ate a data de fim.)'
        );
      }
      db.prepare(`UPDATE access_codes SET status = 'revoked' WHERE code = ?`).run(code);
      await ctx.reply('🗑️ Codigo *' + code + '* revogado.');
    }
  }
];
