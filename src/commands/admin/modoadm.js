const { isOwnerJid } = require('../../utils/ownerCheck');
/**
 * modoadm on|off — so Owner + ADMs do grupo usam comandos
 * Membros: silencio total (sem resposta)
 */
const path = require('path');

function getHelpers() {
  try {
    return require('../../database');
  } catch (_) {
    try {
      return require(path.join(process.cwd(), 'src/database'));
    } catch (e2) {
      return {};
    }
  }
}

function readMode(groupJid) {
  const dbapi = getHelpers();
  if (dbapi.getGroupSetting) {
    const v = dbapi.getGroupSetting(groupJid, 'modoadm', '0');
    return v === true || v === 1 || v === '1' || v === 'on' || v === 'true';
  }
  try {
    const db = dbapi.getDb && dbapi.getDb();
    if (!db) return false;
    const row = db
      .prepare(
        "SELECT value FROM group_settings WHERE (group_jid = ? OR group_id = ?) AND key = 'modoadm' LIMIT 1"
      )
      .get(groupJid, groupJid);
    const v = row && row.value;
    return v === '1' || v === 'on' || v === 'true';
  } catch (_) {
    return false;
  }
}

function writeMode(groupJid, on) {
  const dbapi = getHelpers();
  const val = on ? '1' : '0';
  if (dbapi.setGroupSetting) {
    dbapi.setGroupSetting(groupJid, 'modoadm', val);
    return;
  }
  const db = dbapi.getDb && dbapi.getDb();
  if (!db) throw new Error('DB indisponivel');
  try {
    db.prepare(
      "INSERT OR REPLACE INTO group_settings (group_jid, key, value) VALUES (?, 'modoadm', ?)"
    ).run(groupJid, val);
  } catch (_) {
    db.prepare(
      "INSERT OR REPLACE INTO group_settings (group_id, key, value) VALUES (?, 'modoadm', ?)"
    ).run(groupJid, val);
  }
}

module.exports = [
  {
    name: 'modoadm',
    aliases: ['soadm', 'onlyadm', 'adminmode'],
    category: 'admin',
    description: 'Modo so ADM: membros ignorados',
    groupOnly: true,
    handler: async (ctx) => {
      if (!ctx.isGroup) return ctx.reply('❌ So em grupos.');

      const isStaff =
        (typeof ctx.isOwner === 'function' && ctx.isOwner()) ||
        (typeof ctx.isBotAdmin === 'function' && ctx.isBotAdmin()) ||
        (typeof ctx.isGroupAdmin === 'function' && (await ctx.isGroupAdmin()));

      if (!isStaff) {
        // silencio se modo ja ativo; senao avisa
        if (readMode(ctx.jid)) return;
        return ctx.reply('❌ Apenas Owner ou ADM do grupo.');
      }

      const arg = String(ctx.args || ctx.text || '')
        .trim()
        .toLowerCase()
        .replace(/^(modoadm|soadm|onlyadm|adminmode)\s*/i, '')
        .trim();

      if (!arg || arg === 'status') {
        const on = readMode(ctx.jid);
        return ctx.reply(
          on
            ? '🔐 *MODO ADM: LIGADO*\nSo Owner e ADMs do grupo usam comandos.\nMembros sao ignorados.'
            : '🔓 *MODO ADM: DESLIGADO*\nTodos podem usar comandos (conforme regras do grupo).'
        );
      }

      if (arg === 'on' || arg === 'ligar' || arg === '1' || arg === 'ativar') {
        writeMode(ctx.jid, true);
        return ctx.reply(
          '🔐 *MODO ADM LIGADO*\n\nA partir de agora so *Owner* e *ADMs do grupo* usam comandos.\nMembros sao ignorados em silencio.'
        );
      }

      if (arg === 'off' || arg === 'desligar' || arg === '0' || arg === 'desativar') {
        writeMode(ctx.jid, false);
        return ctx.reply('🔓 *MODO ADM DESLIGADO*\nTodos voltam a poder usar comandos.');
      }

      return ctx.reply('Uso:\n*modoadm on*\n*modoadm off*\n*modoadm* (status)');
    }
  }
];

// export helper para o index
module.exports.isModoAdmOn = readMode;
