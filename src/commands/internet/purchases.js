/**
 * compra — estilo loja (só dono/admin)
 * Responda a mensagem de quem pagou → marca essa pessoa
 */
const { getDb, scopeGroup } = require('../../database');

function parseAmount(text) {
  if (!text) return null;
  const raw = String(text).trim().replace(',', '.');
  const m = raw.match(/^(\d+(?:\.\d+)?)\s*(mb|gb|m|g)?$/i);
  if (!m) return null;
  let value = parseFloat(m[1]);
  if (isNaN(value) || value <= 0) return null;
  const unit = (m[2] || 'mb').toLowerCase();
  if (unit === 'gb' || unit === 'g') value = value * 1024;
  const label = m[2] ? (m[1] + m[2].toUpperCase()) : (m[1] + 'MB');
  return { mb: value, label: label };
}

function formatData(mb) {
  if (mb >= 1024) {
    const gb = mb / 1024;
    const s = gb >= 10 ? gb.toFixed(1) : gb.toFixed(2);
    return s.replace(/\.00$/, '') + 'GB';
  }
  return Math.round(mb) + 'MB';
}

function getContextInfo(msg) {
  const m = msg && msg.message ? msg.message : {};
  return (
    (m.extendedTextMessage && m.extendedTextMessage.contextInfo) ||
    (m.imageMessage && m.imageMessage.contextInfo) ||
    (m.videoMessage && m.videoMessage.contextInfo) ||
    (m.documentMessage && m.documentMessage.contextInfo) ||
    (m.stickerMessage && m.stickerMessage.contextInfo) ||
    null
  );
}

function mentionId(jid) {
  return String(jid || 'user').split('@')[0];
}

async function canUseCompra(ctx) {
  if (ctx.isOwner()) return true;
  if (ctx.isBotAdmin && ctx.isBotAdmin()) return true;
  if (ctx.isGroup) {
    try {
      if (await ctx.isGroupAdmin()) return true;
    } catch (e) {}
  }
  return false;
}

async function resolveBuyerJid(ctx) {
  const ci = getContextInfo(ctx.msg);

  // 1) Resposta a alguém → JID real no grupo
  if (ci && ci.participant) return ci.participant;

  // 2) @menção
  if (ctx.mentioned && ctx.mentioned[0]) return ctx.mentioned[0];

  // 3) Texto citado ou argumento é número de telefone
  let maybeNum = (ctx.args[1] || '').replace(/\D/g, '');
  if (!maybeNum && ci && ci.quotedMessage) {
    const q =
      ci.quotedMessage.conversation ||
      (ci.quotedMessage.extendedTextMessage && ci.quotedMessage.extendedTextMessage.text) ||
      '';
    const digits = String(q).replace(/\D/g, '');
    if (digits.length >= 8 && digits.length <= 15) maybeNum = digits;
  }

  if (maybeNum.length >= 8 && ctx.isGroup) {
    try {
      const meta = await ctx.sock.groupMetadata(ctx.jid);
      const parts = meta.participants || [];
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const id = String(p.id || '');
        const idDigits = id.replace(/\D/g, '');
        const phone = String(p.phoneNumber || '').replace(/\D/g, '');
        if (
          idDigits.endsWith(maybeNum) ||
          idDigits.endsWith(maybeNum.slice(-9)) ||
          phone.endsWith(maybeNum) ||
          phone.endsWith(maybeNum.slice(-9))
        ) {
          return p.id;
        }
      }
    } catch (e) {}
    return maybeNum + '@s.whatsapp.net';
  }

  return null;
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

module.exports = [
  {
    name: 'compra',
    aliases: ['comprei', 'buy'],
    category: 'internet',
    description: 'Registra compra (só dono/admin). Responda quem pagou.',
    groupOnly: true,
    handler: async (ctx) => {
      if (!(await canUseCompra(ctx))) {
        return ctx.reply('❌ Só *dono* ou *admin do grupo* pode registrar compra.');
      }

      const g = scopeGroup(ctx);
      const amountText = ctx.args[0] || '';
      const parsed = parseAmount(amountText);
      if (!parsed) {
        return ctx.reply(
          '❌ *Como usar*\n\n' +
            '1. Responda a mensagem de quem pagou\n' +
            '2. Digite: compra 500\n' +
            '   ou: compra 1GB\n\n' +
            'Também: compra 500 @pessoa'
        );
      }

      const buyerJid = await resolveBuyerJid(ctx);
      if (!buyerJid) {
        return ctx.reply(
          '❌ Não identifiquei quem comprou.\n' +
            'Responda a *mensagem da pessoa* e use: compra 500'
        );
      }

      const tag = mentionId(buyerJid);
      const database = getDb();

      console.log('[COMPRA]', { admin: ctx.sender, buyer: buyerJid, tag: tag });

      database
        .prepare(
          'INSERT INTO purchases (group_jid, buyer_jid, buyer_number, product, amount_mb, amount_label) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(g, buyerJid, tag, parsed.label, parsed.mb, parsed.label);

      const myStats = database
        .prepare(
          'SELECT COUNT(*) as compras, COALESCE(SUM(amount_mb),0) as total_mb FROM purchases WHERE group_jid = ? AND buyer_jid = ?'
        )
        .get(g, buyerJid);

      const rankRows = database
        .prepare(
          'SELECT buyer_jid, SUM(amount_mb) as total_mb FROM purchases WHERE group_jid = ? GROUP BY buyer_jid ORDER BY total_mb DESC'
        )
        .all(g);

      const myRank = rankRows.findIndex(function (r) { return r.buyer_jid === buyerJid; }) + 1;
      const top = rankRows[0];
      const totalBuyers = rankRows.length;

      const hoje = database
        .prepare(
          "SELECT COUNT(*) as c FROM purchases WHERE group_jid = ? AND buyer_jid = ? AND date(created_at) = date('now')"
        )
        .get(g, buyerJid);

      const prev = database
        .prepare(
          'SELECT created_at FROM purchases WHERE group_jid = ? AND buyer_jid = ? ORDER BY id DESC LIMIT 1 OFFSET 1'
        )
        .get(g, buyerJid);

      // Mensagem no estilo da loja (organizada)
      let text = '✅ Obrigado @' + tag + ' por comprar *' + parsed.label + '*!\n';

      if (hoje && hoje.c === 1) {
        text += 'Você está fazendo a sua *primeira compra do dia*!\n';
      }
      if (prev && prev.created_at) {
        const days = daysSince(prev.created_at);
        if (days !== null && days >= 2) {
          text += 'Há *' + days + ' dias* que você não comprava. Bom tê-lo(a) de volta!\n';
        }
      }

      text += '\nVocê é o comprador nº *' + myRank + '* do grupo, com um total acumulado de *' + formatData(myStats.total_mb) + '*.';
      text += '\nCompras registradas: *' + myStats.compras + '*.';

      if (top && top.buyer_jid !== buyerJid) {
        text += '\nO maior comprador já acumulou *' + formatData(top.total_mb) + '*.';
        text += '\nRumo ao topo para desbloquear bônus!';
      } else {
        text += '\n🏆 Você é o *maior comprador* do grupo!';
      }

      text += '\n\n📊 Compradores no grupo: ' + totalBuyers;

      await ctx.sock.sendMessage(
        ctx.jid,
        { text: text, mentions: [buyerJid] },
        { quoted: ctx.msg }
      );
    }
  },
  {
    name: 'minhascompras',
    aliases: ['historico_compras'],
    category: 'internet',
    groupOnly: true,
    handler: async (ctx) => {
      const g = scopeGroup(ctx);
      const rows = getDb()
        .prepare(
          'SELECT * FROM purchases WHERE group_jid = ? AND buyer_jid = ? ORDER BY id DESC LIMIT 15'
        )
        .all(g, ctx.sender);
      if (!rows.length) return ctx.reply('📦 Sem compras neste grupo.');
      let t = '📦 *Suas compras*\n\n';
      rows.forEach(function (r, i) {
        t += (i + 1) + '. ' + r.amount_label + '\n';
      });
      await ctx.reply(t);
    }
  },
  {
    name: 'rankcompras',
    aliases: ['topcompras', 'topcompradores'],
    category: 'internet',
    groupOnly: true,
    handler: async (ctx) => {
      const g = scopeGroup(ctx);
      const rows = getDb()
        .prepare(
          'SELECT buyer_jid, SUM(amount_mb) as total_mb, COUNT(*) as c FROM purchases WHERE group_jid = ? GROUP BY buyer_jid ORDER BY total_mb DESC LIMIT 10'
        )
        .all(g);
      if (!rows.length) return ctx.reply('📊 Sem compras.');
      let text = '🏆 *TOP COMPRADORES*\n\n';
      const mentions = [];
      rows.forEach(function (r, i) {
        const medal = ['🥇', '🥈', '🥉'][i] || (i + 1) + '.';
        const tag = mentionId(r.buyer_jid);
        text += medal + ' @' + tag + ' — *' + formatData(r.total_mb) + '* (' + r.c + 'x)\n';
        mentions.push(r.buyer_jid);
      });
      await ctx.sock.sendMessage(ctx.jid, { text: text, mentions: mentions }, { quoted: ctx.msg });
    }
  }
];
