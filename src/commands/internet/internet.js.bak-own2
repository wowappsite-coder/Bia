/* BEATRIZ_PAY_RULES: 1) exigir config do grupo 2) validar destino 3) txid unico normalizado */

/* BEATRIZ_PAY_FIX */
function beatrizMsgPayNotConfigured() {
  return '⚠️ *Pagamento nao configurado neste grupo.*\n\nPara receber comprovativos automaticos, o ADM/Owner deve configurar:\n*configpagamento*\n\nEx:\nconfigpagamento mpesa 84XXXXXXX\nconfigpagamento emola 86XXXXXXX\nconfigpagamento mkash 85XXXXXXX';
}

function beatrizNormTxid(s) {
  if (!s) return "";
  return String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function beatrizTxidLooksSame(a, b) {
  a = beatrizNormTxid(a);
  b = beatrizNormTxid(b);
  if (!a || !b) return false;
  if (a === b) return true;
  // confusao OCR 0/O 1/I 7/T etc — se 80%+ iguais no mesmo tamanho
  if (a.length === b.length && a.length >= 8) {
    var same = 0;
    for (var i = 0; i < a.length; i++) if (a[i] === b[i]) same++;
    if (same / a.length >= 0.85) return true;
  }
  return false;
}
function beatrizDigitsPhone(s) {
  return String(s || "").replace(/\D/g, "");
}

/**
 * MENU INTERNET - planos/produtos ISOLADOS POR GRUPO
 */
const db = require('../../database');
const config = require('../../config');
const { getDb, getGroupSetting, setGroupSetting, scopeGroup } = require('../../database');

const TABELA_PADRAO = [
  ["Net 1GB Dia", 25, 1, "1GB validos 24h"],
  ["Net 2GB Dia", 40, 1, "2GB validos 24h"],
  ["Net 5GB Dia", 80, 1, "5GB validos 24h"],
  ["Net 10GB Dia", 140, 1, "10GB validos 24h"],
  ["Net 5GB Semana", 150, 7, "5GB validos 7 dias"],
  ["Net 10GB Semana", 250, 7, "10GB validos 7 dias"],
  ["Net 20GB Semana", 400, 7, "20GB validos 7 dias"],
  ["Net 15GB Mes", 350, 30, "15GB validos 30 dias"],
  ["Net 25GB Mes", 500, 30, "25GB validos 30 dias"],
  ["Net 40GB Mes", 700, 30, "40GB validos 30 dias"],
  ["Net 60GB Mes", 900, 30, "60GB validos 30 dias"],
  ["Net 100GB Mes", 1300, 30, "100GB validos 30 dias"],
  ["Net 150GB Mes", 1800, 30, "150GB validos 30 dias"],
  ["Net 200GB Mes", 2200, 30, "200GB validos 30 dias"],
  ["Ilimitado Noite", 200, 30, "Ilimitado 00h-06h 30 dias"],
  ["Ilimitado Dia", 350, 7, "Ilimitado 7 dias"],
  ["Ilimitado Mes", 1200, 30, "Ilimitado 30 dias"],
  ["Fibra 10MB", 800, 30, "Fibra 10Mbps mensal"],
  ["Fibra 20MB", 1200, 30, "Fibra 20Mbps mensal"],
  ["Fibra 30MB", 1500, 30, "Fibra 30Mbps mensal"],
  ["Fibra 50MB", 2000, 30, "Fibra 50Mbps mensal"],
  ["Fibra 100MB", 3500, 30, "Fibra 100Mbps mensal"],
  ["Combo Casa 20MB", 1600, 30, "Fibra 20MB + router"],
  ["Combo Casa 50MB", 2500, 30, "Fibra 50MB + router"],
  ["Hotspot 5GB", 100, 7, "Hotspot 5GB 7 dias"],
  ["Hotspot 15GB", 250, 15, "Hotspot 15GB 15 dias"],
  ["Hotspot 30GB", 400, 30, "Hotspot 30GB 30 dias"],
  ["Estudante 20GB", 400, 30, "Pacote estudante 20GB"],
  ["Estudante 40GB", 650, 30, "Pacote estudante 40GB"],
  ["Gamer 50GB", 900, 30, "Baixa latencia 50GB"],
  ["Gamer 100GB", 1500, 30, "Baixa latencia 100GB"],
  ["Social 10GB", 200, 30, "WhatsApp Facebook TikTok 10GB"],
  ["Social 25GB", 400, 30, "Redes sociais 25GB"],
  ["Streaming 40GB", 750, 30, "YouTube Netflix 40GB"],
  ["Streaming 80GB", 1200, 30, "Streaming pesado 80GB"],
  ["Empresa 50MB", 3000, 30, "Fibra empresarial 50MB"],
  ["Empresa 100MB", 5000, 30, "Fibra empresarial 100MB"],
  ["Diario 500MB", 15, 1, "500MB 24h"],
  ["Diario 3GB", 55, 1, "3GB 24h"],
  ["Semanal 8GB", 200, 7, "8GB 7 dias"]
];

async function canManage(ctx) {
  if (ctx.isOwner()) return true;
  if (ctx.isBotAdmin && ctx.isBotAdmin()) return true;
  if (ctx.isGroup) {
    try { if (await ctx.isGroupAdmin()) return true; } catch (_) {}
  }
  return false;
}

function addProduct(groupJid, name, price, days, description) {
  getDb().prepare(
    'INSERT INTO plans (group_jid, name, price, days, description, active) VALUES (?, ?, ?, ?, ?, 1)'
  ).run(groupJid, name, price, days, description || '');
}

module.exports = [
  {
    name: 'internet',
    aliases: ['net'],
    category: 'internet',
    description: 'Menu internet/aluguel',
    handler: async (ctx) => {
      /* pay config empty hint — so neste ficheiro de pagamento */

      await ctx.reply(
        '🌐 *MENU INTERNET*\nDados por grupo.\n\n' +
        '• addproduto / addplano\n' +
        '• delproduto / delplano\n' +
        '• planos / tabela\n' +
        '• tabelapadrao (carrega tabela grande)\n' +
        '• limpartabela\n' +
        '• pedido / statuspedido\n' +
        '• pagamento / configpagamento\n' +
        '• aluguel / ativarbot / desativarbot'
      );
    }
  },
  {
    name: 'addproduto',
    aliases: ['addplano', 'produto'],
    category: 'internet',
    description: 'Cola tabela (qualquer formato, preserva linhas)',
    usage: 'addproduto + cola a tabela',
    groupOnly: true,
    handler: async (ctx) => {
      if (!(await canManage(ctx))) return ctx.reply('❌ Só admin do grupo ou dono.');
      const g = scopeGroup(ctx);

      function rawBody(msg) {
        if (!msg || !msg.message) return '';
        const m = msg.message;
        return String(
          m.conversation ||
          (m.extendedTextMessage && m.extendedTextMessage.text) ||
          (m.imageMessage && m.imageMessage.caption) ||
          ''
        );
      }

      let raw = rawBody(ctx.msg).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      raw = raw.replace(/^\s*[.!#]?addproduto\b\s*/i, '');
      raw = raw.replace(/^\s*[.!#]?addplano\b\s*/i, '');
      raw = raw.replace(/^\s*[.!#]?produto\b\s*/i, '');
      raw = raw.replace(/^\n/, '').trim();

      if (!raw || raw.length < 3) {
        try {
          const m = ctx.msg && ctx.msg.message;
          const ci = m && m.extendedTextMessage && m.extendedTextMessage.contextInfo;
          const q = ci && ci.quotedMessage;
          if (q) {
            raw = String(
              q.conversation ||
              (q.extendedTextMessage && q.extendedTextMessage.text) ||
              (q.imageMessage && q.imageMessage.caption) ||
              ''
            ).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
          }
        } catch (_) {}
      }

      if (!raw || raw.length < 3) {
        return ctx.reply(
          '📦 *ADDPRODUTO*\n\n' +
          'addproduto\n' +
          '100MB ➤ 4MT\n' +
          '1GB ➤ 24MT\n\n' +
          'Ou responde à tabela com *addproduto*.\n' +
          'Aceita qualquer formato (como addtabela).'
        );
      }

      // igual addtabela: grava texto livre COM quebras de linha
      try { setGroupSetting(g, 'custom_tabela', raw); } catch (e) {
        console.error('[addproduto] set', e.message);
      }

      // tenta registar pacotes (opcional)
      let added = 0;
      try {
        const lines = raw.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        let defaultDays = 1;
        for (let i = 0; i < lines.length; i++) {
          let line = lines[i].replace(/[➤►→➡➜]/g, '=').replace(/\s*=\s*/g, ' = ').trim();
          const low = line.toLowerCase();
          if (!/=/.test(line)) {
            if (/semanal|7\s*dias/.test(low)) defaultDays = 7;
            if (/mensal|30\s*dias/.test(low)) defaultDays = 30;
            if (/di[aá]rio|24h/.test(low)) defaultDays = 1;
            continue;
          }
          if (/paga aqui|m-?pesa|e-?mola/i.test(low)) continue;

          let name = null, price = null, days = defaultDays;
          let m = line.match(/^(\d+(?:[.,]\d+)?)\s*(MB|GB)\s*=\s*(\d+(?:[.,]\d+)?)\s*MT?/i);
          if (m) {
            name = m[1] + m[2].toUpperCase();
            price = parseFloat(m[3].replace(',', '.'));
          }
          if (!name) {
            m = line.match(/^(\d+(?:[.,]\d+)?)\s*MT\s*=\s*(\d+(?:[.,]\d+)?)\s*(MB|GB)?/i);
            if (m) {
              price = parseFloat(m[1].replace(',', '.'));
              name = m[2] + (m[3] ? m[3].toUpperCase() : 'MB');
            }
          }
          if (!name) {
            m = line.match(/^(.+?)\s*=\s*(\d+(?:[.,]\d+)?)\s*MT\s*$/i);
            if (m) {
              name = m[1].trim().slice(0, 80);
              price = parseFloat(m[2].replace(',', '.'));
            }
          }
          if (name && price && !isNaN(price) && price > 0) {
            try {
              addProduct(g, name, price, days, 'produto');
              added++;
            } catch (_) {}
          }
        }
      } catch (e) {
        console.error('[addproduto] parse', e.message);
      }

      let msg = '✅ Tabela salva neste grupo (linhas ok).\n';
      msg += 'Ver: *vertabela* / *net* / *megas*\n';
      if (added > 0) msg += '\n📦 ' + added + ' pacotes registados para pedidos.';
      await ctx.reply(msg);
    }
  },
  {
    name: 'delproduto',
    aliases: ['delplano'],
    category: 'internet',
    description: 'Remove produto deste grupo',
    usage: '!delproduto ID',
    groupOnly: true,
    handler: async (ctx) => {
      if (!(await canManage(ctx))) return ctx.reply('❌ Só admin/dono.');
      const g = scopeGroup(ctx);
      const id = parseInt(ctx.args[0], 10);
      if (isNaN(id)) return ctx.reply('❌ Use: !delproduto ID\nVeja IDs em !planos');
      const plan = getDb().prepare('SELECT * FROM plans WHERE id = ? AND group_jid = ?').get(id, g);
      if (!plan) return ctx.reply('❌ Produto não existe neste grupo.');
      getDb().prepare('UPDATE plans SET active = 0 WHERE id = ? AND group_jid = ?').run(id, g);
      await ctx.reply(`✅ Produto *${plan.name}* removido deste grupo.`);
    }
  },
  {
    name: 'tabelapadrao',
    aliases: ['carregartabela', 'tabelainternet', 'produtospadrao'],
    category: 'internet',
    description: 'Carrega tabela grande de internet neste grupo',
    groupOnly: true,
    handler: async (ctx) => {
      if (!(await canManage(ctx))) return ctx.reply('❌ Só admin/dono.');
      const g = scopeGroup(ctx);
      const force = (ctx.args[0] || '').toLowerCase() === 'force' || (ctx.args[0] || '').toLowerCase() === 'forcar';
      const existing = getDb().prepare('SELECT COUNT(*) as c FROM plans WHERE group_jid = ? AND active = 1').get(g);
      if (existing && existing.c > 0 && !force) {
        return ctx.reply(
          `⚠️ Este grupo já tem *${existing.c}* produtos.\n\n` +
          `Para acrescentar a tabela padrão mesmo assim:\n!tabelapadrao force\n\n` +
          `Para apagar tudo e recomeçar:\n!limpartabela\nDepois: !tabelapadrao`
        );
      }
      const insert = getDb().prepare(
        'INSERT INTO plans (group_jid, name, price, days, description, active) VALUES (?, ?, ?, ?, ?, 1)'
      );
      let n = 0;
      for (const [name, price, days, desc] of TABELA_PADRAO) {
        insert.run(g, name, price, days, desc);
        n++;
      }
      await ctx.reply(
        `✅ Tabela padrão carregada *neste grupo*.\n📦 ${n} produtos adicionados.\n\nUse !tabela ou !planos para ver.`
      );
    }
  },
  {
    name: 'limpartabela',
    aliases: ['limparprodutos'],
    category: 'internet',
    description: 'Apaga todos os produtos deste grupo',
    groupOnly: true,
    handler: async (ctx) => {
      if (!(await canManage(ctx))) return ctx.reply('❌ Só admin/dono.');
      const g = scopeGroup(ctx);
      const r = getDb().prepare('UPDATE plans SET active = 0 WHERE group_jid = ?').run(g);
      await ctx.reply(`🗑️ ${r.changes} produto(s) removidos *deste grupo*.`);
    }
  },
  {
    name: 'planos',
    aliases: ['produtos', 'listaprodutos'],
    category: 'internet',
    description: 'Lista produtos deste grupo',
    handler: async (ctx) => {
      const g = scopeGroup(ctx);
      const plans = getDb().prepare('SELECT * FROM plans WHERE active = 1 AND group_jid = ? ORDER BY id').all(g);
      if (!plans.length) {
        return ctx.reply('📋 Nenhum produto neste grupo.\n\n!addproduto Nome | preço | dias | desc\nOu: !tabelapadrao');
      }
      let text = '📋 *Produtos deste grupo*\n\n';
      plans.forEach(p => {
        text += `• ID ${p.id}: *${p.name}* — ${p.price} MT / ${p.days}d\n  ${p.description || ''}\n`;
      });
      text += `\nTotal: ${plans.length}`;
      await ctx.reply(text);
    }
  },
  {
    name: 'tabela',
    category: 'internet',
    description: 'Tabela de preços deste grupo',
    handler: async (ctx) => {
      const g = scopeGroup(ctx);
      try {
        const custom = getGroupSetting(g, 'custom_tabela', '');
        if (custom && String(custom).trim().length > 2) {
          return ctx.reply(String(custom).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim());
        }
      } catch (_) {}

      const plans = getDb().prepare(
        'SELECT * FROM plans WHERE active = 1 AND group_jid = ? ORDER BY days ASC, price ASC'
      ).all(g);
      if (!plans.length) return ctx.reply('📋 Tabela vazia.');
      const map = {};
      for (let i = 0; i < plans.length; i++) {
        const d = Number(plans[i].days) || 1;
        if (!map[d]) map[d] = [];
        map[d].push(plans[i]);
      }
      const keys = Object.keys(map).map(Number).sort(function (a, b) { return a - b; });
      let text = '🔥 *PROMOÇÃO DE MEGAS* 🔥\n\n';
      for (let k = 0; k < keys.length; k++) {
        const d = keys[k];
        let title = '📦 PACOTES (' + d + ' DIAS)';
        if (d === 1) title = '📅 PACOTES DIÁRIOS (24H)';
        if (d === 3) title = '📅 PACOTES 3 DIAS';
        if (d === 7) title = '📅 PACOTES SEMANAIS (7 DIAS)';
        if (d === 30) title = '📅 PACOTES MENSAIS (30 DIAS)';
        text += '*' + title + '*\n';
        const arr = map[d];
        for (let i = 0; i < arr.length; i++) {
          text += '🌐 ' + arr[i].name + ' = *' + arr[i].price + 'MT*\n';
        }
        text += '\n';
      }
      text += '📊 Total: *' + plans.length + '* pacotes';
      await ctx.reply(text.trim());
    }
  },

  {
    name: 'pedido',
    category: 'internet',
    description: 'Cria pedido neste grupo',
    usage: '!pedido ID',
    groupOnly: true,
    handler: async (ctx) => {
      const g = scopeGroup(ctx);
      const planId = parseInt(ctx.args[0], 10);
      if (isNaN(planId)) return ctx.reply('❌ Use: !pedido <ID>\nVeja !planos');
      const plan = getDb().prepare('SELECT * FROM plans WHERE id = ? AND active = 1 AND group_jid = ?').get(planId, g);
      if (!plan) return ctx.reply('❌ Produto não existe neste grupo.');
      let client = getDb().prepare('SELECT * FROM clients WHERE number = ?').get(ctx.user.number);
      if (!client) {
        const info = getDb().prepare('INSERT INTO clients (jid, number, name) VALUES (?, ?, ?)').run(ctx.sender, ctx.user.number, '');
        client = { id: info.lastInsertRowid };
      }
      const payNum = getGroupSetting(g, 'payment_number', '');
      const payName = getGroupSetting(g, 'payment_name', '');
      const info = getDb().prepare(`
        INSERT INTO orders (client_id, plan_id, group_jid, value_expected, number_expected, name_expected, status, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now', '+24 hours'))
      `).run(client.id, plan.id, g, plan.price, payNum, payName);
      await ctx.reply(
        `🧾 *Pedido #${info.lastInsertRowid}*\n\n` +
        `Produto: ${plan.name}\nValor: *${plan.price} MT*\n` +
        `Pague: ${payNum || '( !configpagamento )'} ${payName}\n\nEnvie o comprovativo neste grupo.`
      );
    }
  },
  {
    name: 'statuspedido',
    category: 'internet',
    description: 'Status do pedido',
    handler: async (ctx) => {
      const g = scopeGroup(ctx);
      const id = parseInt(ctx.args[0], 10);
      if (isNaN(id)) return ctx.reply('❌ !statuspedido ID');
      const order = getDb().prepare('SELECT * FROM orders WHERE id = ? AND (group_jid = ? OR group_jid IS NULL)').get(id, g);
      if (!order) return ctx.reply('❌ Pedido não encontrado neste grupo.');
      await ctx.reply(`📋 #${order.id}\nStatus: *${order.status}*\nValor: ${order.value_expected} MT`);
    }
  },
  {
    name: 'pagamento',
    aliases: ['pagamentos'],
    category: 'internet',
    description: 'Pagamento deste grupo',
    handler: async (ctx) => {
      const g = scopeGroup(ctx);
      let list = [];
      try { list = JSON.parse(getGroupSetting(g, 'payment_numbers', '[]') || '[]'); } catch (e) { list = []; }
      if (!Array.isArray(list)) list = [];
      if (!list.length) {
        const payNum = getGroupSetting(g, 'payment_number', '');
        const payName = getGroupSetting(g, 'payment_name', '');
        if (payNum) list.push({ num: String(payNum), name: payName || '' });
      }
      if (!list.length) {
        return ctx.reply(
          '╭──〔 💳 𝐏𝐀𝐆𝐀𝐌𝐄𝐍𝐓𝐎 〕──╮\n' +
          '│\n' +
          '│  Nenhum numero configurado.\n' +
          '│\n' +
          '│  Use:\n' +
          '│  *configpagamento NUMERO Nome*\n' +
          '│\n' +
          '╰──────────────────╯'
        );
      }
      let t = '';
      t += '╭──〔 💳 𝐏𝐀𝐆𝐀𝐌𝐄𝐍𝐓𝐎 〕──╮\n';
      t += '│\n';
      t += '│  *Numeros deste grupo*\n';
      t += '│\n';
      for (let i = 0; i < list.length; i++) {
        const n = list[i].num || list[i].number || '';
        const name = list[i].name || '';
        t += '│  *' + (i + 1) + '.*  `' + n + '`\n';
        if (name) t += '│      ' + name + '\n';
        t += '│\n';
      }
      t += '├──────────────────┤\n';
      t += '│  Apos pagar, envie o\n';
      t += '│  comprovativo *neste grupo*.\n';
      t += '│\n';
      t += '╰──〔 𝐁𝐄𝐀𝐓𝐑𝐈𝐙 𝐁𝐎𝐓 〕──╯';
      await ctx.reply(t);
    }
  },
  {
    name: 'configpagamento',
    category: 'internet',
    description: 'Config pagamento deste grupo',
    groupOnly: true,
    handler: async (ctx) => {
      if (!(await canManage(ctx))) return ctx.reply('❌ Só admin/dono.');
      const g = scopeGroup(ctx);
      const args = (ctx.args || []).slice();
      let provider = '';
      let num = '';
      let name = '';

      // Formatos:
      // configpagamento mpesa 84XXXXXXX
      // configpagamento emola 86XXXXXXX Nome
      // configpagamento 84XXXXXXX M-Pesa
      const provMap = {
        mpesa: 'M-Pesa', 'm-pesa': 'M-Pesa',
        emola: 'E-Mola', 'e-mola': 'E-Mola',
        mkash: 'M-Kash', 'm-kash': 'M-Kash'
      };
      const a0 = String(args[0] || '').toLowerCase();
      if (provMap[a0]) {
        provider = provMap[a0];
        num = String(args[1] || '').replace(/\D/g, '');
        name = args.slice(2).join(' ').trim() || provider;
      } else {
        num = String(args[0] || '').replace(/\D/g, '');
        name = args.slice(1).join(' ').trim();
        // se o nome for operadora, normaliza
        const nl = name.toLowerCase();
        if (provMap[nl]) { provider = provMap[nl]; name = provider; }
      }

      if (!num || num.length < 8) {
        return ctx.reply(
          '❌ *Como configurar*\n\n' +
          '*configpagamento mpesa 84XXXXXXX*\n' +
          '*configpagamento emola 86XXXXXXX*\n' +
          '*configpagamento mkash 85XXXXXXX*\n\n' +
          'Ou: *configpagamento 84XXXXXXX M-Pesa*\n\n' +
          'Podes adicionar *varios* numeros — um de cada vez.\n' +
          'Ver lista: *pagamento*\n' +
          'Remover: *delpagamento 84XXXXXXX*'
        );
      }

      let list = [];
      try { list = JSON.parse(getGroupSetting(g, 'payment_numbers', '[]') || '[]'); } catch (e) { list = []; }
      if (!Array.isArray(list)) list = [];

      // migrar legado
      const legacy = getGroupSetting(g, 'payment_number', '');
      if (legacy && !list.find(function (x) {
        return String(x.num) === String(legacy) || String(x.num).endsWith(String(legacy).slice(-9));
      })) {
        list.push({ num: String(legacy), name: getGroupSetting(g, 'payment_name', '') || '' });
      }

      var ix = -1;
      for (var i = 0; i < list.length; i++) {
        const n = String(list[i].num || '');
        if (n === String(num) || n.endsWith(num.slice(-9)) || num.endsWith(n.slice(-9))) {
          ix = i;
          break;
        }
      }
      const entry = { num: num, name: name || provider || '', provider: provider || '' };
      if (ix >= 0) list[ix] = entry;
      else list.push(entry);

      setGroupSetting(g, 'payment_numbers', JSON.stringify(list));
      // legado: primeiro da lista (compatibilidade)
      setGroupSetting(g, 'payment_number', list[0].num);
      setGroupSetting(g, 'payment_name', list[0].name || '');

      var t = '✅ *Numero guardado*\n\n💳 Lista deste grupo:\n';
      for (var j = 0; j < list.length; j++) {
        t += (j + 1) + '. *' + list[j].num + '*' +
          (list[j].name ? ' — ' + list[j].name : '') + '\n';
      }
      t += '\n_Comprovativos nestes numeros serao aceites._';
      await ctx.reply(t);
    }
  },
  {
    name: 'aluguel',
    aliases: ['planosaluguel', 'precosaluguel', 'rent'],
    category: 'aluguel',
    description: 'Planos e status do aluguel',
    handler: async (ctx) => {
      let plans;
      try { plans = require('../dono/rentprices').loadRentPlans(); }
      catch (_) { plans = (function(){ try { return require('../dono/rentprices').loadRentPlans(); } catch(_){ return config.rentalPlans||[]; } })(); }
      let text = '💰 *PLANOS DE ALUGUEL*\n\n';
      for (const p of plans) {
        text += p.emoji + ' *' + p.days + ' dias* — ' + p.price + '\n';
      }
      text += '\n📩 Para contratar ou tirar dúvidas:\nFale diretamente com o *Owner* no PV.\n';
      text += '📞 ' + (config.ownerDisplay || config.ownerNumber) + '\n';
      text += '\n_Somente o Owner ativa o plano no grupo._\n';
      if (ctx.isGroup) {
        const sub = getDb().prepare('SELECT * FROM subscriptions WHERE group_jid = ?').get(ctx.jid);
        text += '\n────────────\n';
        if (!sub) {
          text += '🏠 *Este grupo:* sem plano ativo.';
        } else {
          const daysLeft = Math.ceil((new Date(sub.end_date) - new Date()) / 86400000);
          text += '🏠 *Este grupo:*\nStatus: *' + sub.status + '*\nFim: ' + sub.end_date + '\nDias restantes: *' + (daysLeft > 0 ? daysLeft : 0) + '*';
        }
      }
      await ctx.reply(text);
    }
  },
  {
    name: 'ativarbot',
    category: 'aluguel',
    description: 'Ativa bot no grupo',
    ownerOnly: true,
    groupOnly: true,
    handler: async (ctx) => {
      if (!ctx.isOwner()) return ctx.reply('❌ Apenas o dono.');
      const allowed = ((function(){ try { return require('../dono/rentprices').loadRentPlans(); } catch(_){ return config.rentalPlans||[]; } })()).map(p => p.days);
      let days = parseInt(ctx.args[0], 10);
      if (!days || !allowed.includes(days)) {
        return ctx.reply('❌ Use: ativarbot <dias>\nPlanos: ' + allowed.join(', '));
      }
      const end = new Date(); end.setDate(end.getDate() + days);
      const db = getDb();
      try { db.prepare('ALTER TABLE subscriptions ADD COLUMN plan_days INTEGER').run(); } catch (_) {}
      db.prepare(`
        INSERT INTO subscriptions (group_jid, plan_id, start_date, end_date, status, plan_days)
        VALUES (?, NULL, datetime('now'), ?, 'active', ?)
        ON CONFLICT(group_jid) DO UPDATE SET
          plan_id = NULL,
          start_date = datetime('now'),
          end_date = excluded.end_date,
          status = 'active',
          plan_days = excluded.plan_days
      `).run(ctx.jid, end.toISOString(), days);
      await ctx.reply('✅ Bot ativado neste grupo por *' + days + ' dias*.\nExpira: ' + end.toISOString().slice(0, 10));
    }
  },
  {
    name: 'desativarbot',
    category: 'aluguel',
    description: 'Desativa bot no grupo',
    ownerOnly: true,
    groupOnly: true,
    handler: async (ctx) => {
      if (!ctx.isOwner()) return ctx.reply('❌ Apenas o dono.');
      getDb().prepare(`UPDATE subscriptions SET status = 'blocked' WHERE group_jid = ?`).run(ctx.jid);
      await ctx.reply('🔒 Bot desativado neste grupo.');
    }
  },
  {
    name: 'assinatura',
    category: 'aluguel',
    description: 'Lista assinaturas',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!ctx.isOwner()) return ctx.reply('❌ Apenas o dono.');
      const subs = getDb().prepare('SELECT * FROM subscriptions ORDER BY id DESC LIMIT 15').all();
      let text = '📜 Assinaturas\n';
      if (!subs.length) text += 'Nenhuma';
      subs.forEach(s => { text += `#${s.id} ${String(s.group_jid).slice(0, 20)} ${s.status} ${s.end_date}\n`; });
      await ctx.reply(text);
    }
  },
  {
    name: 'vencimento',
    category: 'aluguel',
    description: 'Vencimentos',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!ctx.isOwner()) return ctx.reply('❌ Apenas o dono.');
      const subs = getDb().prepare(`SELECT * FROM subscriptions WHERE status='active' AND date(end_date)<=date('now','+7 days') ORDER BY end_date`).all();
      if (!subs.length) return ctx.reply('✅ Nenhum perto.');
      let text = '⏰ Vencimentos\n';
      subs.forEach(s => { text += `${String(s.group_jid).slice(0, 20)} ${s.end_date}\n`; });
      await ctx.reply(text);
    }
  },
  {
    name: 'historico',
    category: 'aluguel',
    description: 'Histórico grupo',
    handler: async (ctx) => {
      const g = scopeGroup(ctx);
      if (!(await canManage(ctx))) return ctx.reply('❌ Só admin/dono.');
      const pays = getDb().prepare('SELECT * FROM payments WHERE group_jid = ? ORDER BY id DESC LIMIT 15').all(g);
      let text = '📜 Histórico deste grupo\n';
      if (!pays.length) text += 'Vazio';
      pays.forEach(p => { text += `#${p.id} ${p.provider} ${p.value_received}MT ${p.status}\n`; });
      await ctx.reply(text);
    }
  },
  {
    name: 'cliente',
    category: 'internet',
    description: 'Cliente',
    handler: async (ctx) => {
      if (!(await canManage(ctx))) return ctx.reply('❌ Só admin/dono.');
      const num = (ctx.args[0] || '').replace(/\D/g, '');
      if (!num) return ctx.reply('❌ Informe número');
      const c = getDb().prepare('SELECT * FROM clients WHERE number LIKE ?').get('%' + num);
      if (!c) return ctx.reply('❌ Não encontrado');
      await ctx.reply(`👤 #${c.id} ${c.name} ${c.number}`);
    }
  }
,

  {
    name: 'renovarbot',
    aliases: ['renovar', 'renovaraluguel'],
    category: 'aluguel',
    description: 'Renova aluguel do grupo (só Owner)',
    ownerOnly: true,
    groupOnly: true,
    handler: async (ctx) => {
      if (!ctx.isOwner()) return ctx.reply('❌ Apenas o dono.');
      const allowed = ((function(){ try { return require('../dono/rentprices').loadRentPlans(); } catch(_){ return config.rentalPlans||[]; } })()).map(p => p.days);
      let days = parseInt(ctx.args[0], 10);
      if (!days || !allowed.includes(days)) {
        return ctx.reply('❌ Use: renovarbot <dias>\nPlanos: ' + allowed.join(', '));
      }
      const db = getDb();
      const sub = db.prepare('SELECT * FROM subscriptions WHERE group_jid = ?').get(ctx.jid);
      let base = new Date();
      if (sub && sub.status === 'active' && sub.end_date && new Date(sub.end_date) > base) {
        base = new Date(sub.end_date);
      }
      base.setDate(base.getDate() + days);
      try { db.prepare('ALTER TABLE subscriptions ADD COLUMN plan_days INTEGER').run(); } catch (_) {}
      db.prepare(`
        INSERT INTO subscriptions (group_jid, plan_id, start_date, end_date, status, plan_days)
        VALUES (?, NULL, datetime('now'), ?, 'active', ?)
        ON CONFLICT(group_jid) DO UPDATE SET
          plan_id = NULL,
          end_date = excluded.end_date,
          status = 'active',
          plan_days = excluded.plan_days
      `).run(ctx.jid, base.toISOString(), days);
      await ctx.reply('✅ Renovado +*' + days + ' dias*.\nNova expiração: ' + base.toISOString().slice(0, 10));
    }
  },
  {
    name: 'cancelaraluguel',
    aliases: ['cancelarassinatura'],
    category: 'aluguel',
    description: 'Cancela aluguel do grupo (só Owner)',
    ownerOnly: true,
    groupOnly: true,
    handler: async (ctx) => {
      if (!ctx.isOwner()) return ctx.reply('❌ Apenas o dono.');
      getDb().prepare(`UPDATE subscriptions SET status = 'cancelled' WHERE group_jid = ?`).run(ctx.jid);
      await ctx.reply('🚫 Aluguel *cancelado* neste grupo.');
    }
  },
  {
    name: 'infoaluguel',
    aliases: ['statusaluguel'],
    category: 'aluguel',
    description: 'Info detalhada do aluguel neste grupo',
    groupOnly: true,
    handler: async (ctx) => {
      const sub = getDb().prepare('SELECT * FROM subscriptions WHERE group_jid = ?').get(ctx.jid);
      if (!sub) return ctx.reply('🏠 Sem assinatura neste grupo.\nUse *aluguel* para ver planos.');
      const daysLeft = Math.ceil((new Date(sub.end_date) - new Date()) / 86400000);
      await ctx.reply(
        '🏠 *INFO ALUGUEL*\n\n' +
        'Grupo: ' + ctx.jid + '\n' +
        'Plano: ' + (sub.plan_id || '?') + ' dias\n' +
        'Status: *' + sub.status + '*\n' +
        'Início: ' + (sub.start_date || '-') + '\n' +
        'Fim: ' + (sub.end_date || '-') + '\n' +
        'Dias restantes: *' + (daysLeft > 0 ? daysLeft : 0) + '*'
      );
    }
  },
  {
    name: 'alugueis',
    aliases: ['listaaluguel', 'gruposaluguel'],
    category: 'aluguel',
    description: 'Lista grupos com aluguel (só Owner)',
    ownerOnly: true,
    handler: async (ctx) => {
      if (!ctx.isOwner()) return ctx.reply('❌ Apenas o dono.');
      const rows = getDb().prepare(
        "SELECT * FROM subscriptions ORDER BY datetime(end_date) DESC LIMIT 30"
      ).all();
      if (!rows.length) return ctx.reply('Nenhum aluguel registado.');
      let text = '📋 *ALUGUÉIS*\n\n';
      for (const r of rows) {
        text += '• ' + String(r.group_jid).slice(0, 22) + '...\n';
        text += '  ' + r.status + ' | plano ' + (r.plan_id || '?') + 'd | fim ' + String(r.end_date || '').slice(0, 10) + '\n';
      }
      await ctx.reply(text);
    }
  }
];
