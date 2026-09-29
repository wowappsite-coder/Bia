/**
 * Sistema de economia local
 */

const db = require('../../database');
const { getDb } = require('../../database');

function formatMoney(n) {
  return Number(n || 0).toFixed(2) + ' MT';
}

module.exports = [
  {
    name: 'saldo',
    aliases: ['balance', 'bal', 'carteira'],
    category: 'economia',
    description: 'Mostra seu saldo',
    handler: async (ctx) => {
      const u = ctx.user;
      await ctx.reply(`💰 *Sua Carteira*\n\n💵 Carteira: ${formatMoney(u.wallet)}\n🏦 Banco: ${formatMoney(u.bank)}\n📊 Total: ${formatMoney((u.wallet || 0) + (u.bank || 0))}`);
    }
  },
  {
    name: 'banco',
    aliases: ['bank'],
    category: 'economia',
    description: 'Informações do banco',
    handler: async (ctx) => {
      const u = ctx.user;
      await ctx.reply(`🏦 *Banco*\n\nSaldo bancário: ${formatMoney(u.bank)}\nUse !depositar <valor> ou !sacar <valor>`);
    }
  },
  {
    name: 'depositar',
    aliases: ['dep', 'deposit'],
    category: 'economia',
    description: 'Deposita dinheiro no banco',
    usage: '!depositar 100',
    handler: async (ctx) => {
      const amount = parseFloat(ctx.args[0]);
      if (isNaN(amount) || amount <= 0) return ctx.reply('❌ Use: !depositar <valor>');
      const u = ctx.user;
      if ((u.wallet || 0) < amount) return ctx.reply('❌ Saldo insuficiente na carteira.');
      db.updateUser(ctx.sender, { wallet: (u.wallet || 0) - amount, bank: (u.bank || 0) + amount });
      getDb().prepare('INSERT INTO economy_log (jid, type, amount, description) VALUES (?, ?, ?, ?)').run(ctx.sender, 'deposit', amount, 'Depósito');
      await ctx.reply(`✅ Depositou ${formatMoney(amount)} no banco.`);
    }
  },
  {
    name: 'sacar',
    aliases: ['withdraw', 'saque'],
    category: 'economia',
    description: 'Saca dinheiro do banco',
    usage: '!sacar 50',
    handler: async (ctx) => {
      const amount = parseFloat(ctx.args[0]);
      if (isNaN(amount) || amount <= 0) return ctx.reply('❌ Use: !sacar <valor>');
      const u = ctx.user;
      if ((u.bank || 0) < amount) return ctx.reply('❌ Saldo insuficiente no banco.');
      db.updateUser(ctx.sender, { bank: (u.bank || 0) - amount, wallet: (u.wallet || 0) + amount });
      getDb().prepare('INSERT INTO economy_log (jid, type, amount, description) VALUES (?, ?, ?, ?)').run(ctx.sender, 'withdraw', amount, 'Saque');
      await ctx.reply(`✅ Sacou ${formatMoney(amount)} para a carteira.`);
    }
  },
  {
    name: 'transferir',
    aliases: ['pay', 'pix', 'enviar'],
    category: 'economia',
    description: 'Transfere dinheiro para outro usuário',
    usage: '!transferir @user 50',
    handler: async (ctx) => {
      const target = ctx.getMentionedOrQuoted();
      const amount = parseFloat(ctx.args.find(a => !a.startsWith('@') && !isNaN(parseFloat(a))));
      if (!target || isNaN(amount) || amount <= 0) return ctx.reply('❌ Use: !transferir @user <valor>');
      if (target === ctx.sender) return ctx.reply('❌ Não pode transferir para si mesmo.');
      const u = ctx.user;
      if ((u.wallet || 0) < amount) return ctx.reply('❌ Saldo insuficiente.');
      const targetUser = db.getUser(target);
      db.updateUser(ctx.sender, { wallet: (u.wallet || 0) - amount });
      db.updateUser(target, { wallet: (targetUser.wallet || 0) + amount });
      getDb().prepare('INSERT INTO economy_log (jid, type, amount, description) VALUES (?, ?, ?, ?)').run(ctx.sender, 'transfer_out', amount, target);
      getDb().prepare('INSERT INTO economy_log (jid, type, amount, description) VALUES (?, ?, ?, ?)').run(target, 'transfer_in', amount, ctx.sender);
      await ctx.reply(`✅ Transferiu ${formatMoney(amount)} com sucesso!`, { mentions: [target] });
    }
  },
  {
    name: 'daily',
    aliases: ['diario', 'dailyreward'],
    category: 'economia',
    description: 'Recompensa diária',
    handler: async (ctx) => {
      const u = ctx.user;
      const today = new Date().toISOString().slice(0, 10);
      if (u.last_daily === today) return ctx.reply('⏳ Você já coletou o daily hoje. Volte amanhã!');
      const reward = 50 + Math.floor(Math.random() * 100);
      db.updateUser(ctx.sender, { wallet: (u.wallet || 0) + reward, last_daily: today });
      getDb().prepare('INSERT INTO economy_log (jid, type, amount, description) VALUES (?, ?, ?, ?)').run(ctx.sender, 'daily', reward, 'Daily');
      await ctx.reply(`🎁 *Daily coletado!*\nVocê recebeu ${formatMoney(reward)}`);
    }
  },
  {
    name: 'work',
    aliases: ['trabalhar', 'job'],
    category: 'economia',
    description: 'Trabalha para ganhar dinheiro',
    handler: async (ctx) => {
      const u = ctx.user;
      const now = Date.now();
      if (u.last_work && (now - new Date(u.last_work).getTime()) < 30 * 60 * 1000) {
        return ctx.reply('⏳ Descanso necessário. Aguarde 30 minutos.');
      }
      const jobs = ['Programador', 'Vendedor', 'Motorista', 'Professor', 'Mecânico', 'Chef', 'Designer'];
      const job = jobs[Math.floor(Math.random() * jobs.length)];
      const earn = 20 + Math.floor(Math.random() * 80);
      db.updateUser(ctx.sender, { wallet: (u.wallet || 0) + earn, last_work: new Date().toISOString(), job });
      await ctx.reply(`💼 Você trabalhou como *${job}* e ganhou ${formatMoney(earn)}`);
    }
  },
  {
    name: 'crime',
    aliases: ['assaltar'],
    category: 'economia',
    description: 'Tenta um crime (risco de perder)',
    handler: async (ctx) => {
      const u = ctx.user;
      const now = Date.now();
      if (u.last_crime && (now - new Date(u.last_crime).getTime()) < 60 * 60 * 1000) {
        return ctx.reply('⏳ A polícia está de olho. Aguarde 1 hora.');
      }
      const success = Math.random() > 0.45;
      db.updateUser(ctx.sender, { last_crime: new Date().toISOString() });
      if (success) {
        const earn = 30 + Math.floor(Math.random() * 150);
        db.updateUser(ctx.sender, { wallet: (u.wallet || 0) + earn });
        await ctx.reply(`🔫 Crime bem-sucedido! Você ganhou ${formatMoney(earn)}`);
      } else {
        const lose = Math.min(u.wallet || 0, 20 + Math.floor(Math.random() * 50));
        db.updateUser(ctx.sender, { wallet: (u.wallet || 0) - lose });
        await ctx.reply(`🚨 Você foi pego! Perdeu ${formatMoney(lose)}`);
      }
    }
  },
  {
    name: 'roubar',
    aliases: ['rob', 'steal'],
    category: 'economia',
    description: 'Tenta roubar outro usuário',
    usage: '!roubar @user',
    groupOnly: true,
    handler: async (ctx) => {
      const target = ctx.getMentionedOrQuoted();
      if (!target || target === ctx.sender) return ctx.reply('❌ Marque alguém para roubar.');
      const u = ctx.user;
      const t = db.getUser(target);
      const now = Date.now();
      if (u.last_rob && (now - new Date(u.last_rob).getTime()) < 45 * 60 * 1000) {
        return ctx.reply('⏳ Aguarde 45 minutos para roubar novamente.');
      }
      if ((t.wallet || 0) < 10) return ctx.reply('❌ A vítima está pobre.');
      db.updateUser(ctx.sender, { last_rob: new Date().toISOString() });
      const success = Math.random() > 0.5;
      if (success) {
        const amount = Math.min(t.wallet, 10 + Math.floor(Math.random() * 40));
        db.updateUser(ctx.sender, { wallet: (u.wallet || 0) + amount });
        db.updateUser(target, { wallet: (t.wallet || 0) - amount });
        await ctx.reply(`💸 Você roubou ${formatMoney(amount)}!`, { mentions: [target] });
      } else {
        const fine = Math.min(u.wallet || 0, 15);
        db.updateUser(ctx.sender, { wallet: (u.wallet || 0) - fine });
        await ctx.reply(`🚨 Falhou e pagou multa de ${formatMoney(fine)}`);
      }
    }
  },
  {
    name: 'pescar',
    aliases: ['fish', 'pesca'],
    category: 'economia',
    description: 'Pesca para ganhar dinheiro',
    handler: async (ctx) => {
      const fishes = [
        { name: 'Sardinha', value: 5 },
        { name: 'Tilápia', value: 15 },
        { name: 'Dourado', value: 40 },
        { name: 'Tubarão', value: 100 },
        { name: 'Bota velha', value: 1 }
      ];
      const fish = fishes[Math.floor(Math.random() * fishes.length)];
      const u = ctx.user;
      db.updateUser(ctx.sender, { wallet: (u.wallet || 0) + fish.value });
      await ctx.reply(`🎣 Você pescou um(a) *${fish.name}* e ganhou ${formatMoney(fish.value)}`);
    }
  },
  {
    name: 'minerar',
    aliases: ['mine', 'mineracao'],
    category: 'economia',
    description: 'Minera recursos',
    handler: async (ctx) => {
      const ores = [
        { name: 'Pedra', value: 3 },
        { name: 'Carvão', value: 10 },
        { name: 'Ferro', value: 25 },
        { name: 'Ouro', value: 60 },
        { name: 'Diamante', value: 120 }
      ];
      const ore = ores[Math.floor(Math.random() * ores.length)];
      const u = ctx.user;
      db.updateUser(ctx.sender, { wallet: (u.wallet || 0) + ore.value });
      await ctx.reply(`⛏ Você minerou *${ore.name}* e ganhou ${formatMoney(ore.value)}`);
    }
  },
  {
    name: 'loja',
    aliases: ['shop', 'store'],
    category: 'economia',
    description: 'Loja de itens',
    handler: async (ctx) => {
      await ctx.reply(`🛒 *LOJA*\n\n1. 🎣 Vara de pesca - 200 MT\n2. ⛏ Picareta - 250 MT\n3. 🛡️ Escudo - 500 MT\n4. 🍀 Amuleto da sorte - 800 MT\n\nUse: !comprar <número>`);
    }
  },
  {
    name: 'comprar',
    aliases: ['buy'],
    category: 'economia',
    description: 'Compra item da loja',
    usage: '!comprar 1',
    handler: async (ctx) => {
      const items = {
        '1': { name: 'Vara de pesca', price: 200 },
        '2': { name: 'Picareta', price: 250 },
        '3': { name: 'Escudo', price: 500 },
        '4': { name: 'Amuleto da sorte', price: 800 }
      };
      const item = items[ctx.args[0]];
      if (!item) return ctx.reply('❌ Item inválido. Use !loja');
      const u = ctx.user;
      if ((u.wallet || 0) < item.price) return ctx.reply('❌ Saldo insuficiente.');
      let inv = {};
      try { inv = JSON.parse(u.inventory || '{}'); } catch {}
      inv[item.name] = (inv[item.name] || 0) + 1;
      db.updateUser(ctx.sender, { wallet: (u.wallet || 0) - item.price, inventory: JSON.stringify(inv) });
      await ctx.reply(`✅ Comprou *${item.name}* por ${formatMoney(item.price)}`);
    }
  },
  {
    name: 'inventario',
    aliases: ['inv', 'inventory', 'mochila'],
    category: 'economia',
    description: 'Mostra seu inventário',
    handler: async (ctx) => {
      const u = ctx.user;
      let inv = {};
      try { inv = JSON.parse(u.inventory || '{}'); } catch {}
      const keys = Object.keys(inv);
      if (!keys.length) return ctx.reply('🎒 Inventário vazio.');
      let text = '🎒 *Inventário*\n\n';
      keys.forEach(k => { text += `• ${k}: ${inv[k]}\n`; });
      await ctx.reply(text);
    }
  },
  {
    name: 'empregos',
    aliases: ['jobs'],
    category: 'economia',
    description: 'Lista de empregos',
    handler: async (ctx) => {
      await ctx.reply(`💼 *Empregos disponíveis*\n\n• Programador\n• Vendedor\n• Motorista\n• Professor\n• Mecânico\n• Chef\n• Designer\n\nUse !work para trabalhar.`);
    }
  },
  {
    name: 'rankmoney',
    aliases: ['rankdinheiro', 'topmoney'],
    category: 'economia',
    description: 'Ranking de dinheiro',
    handler: async (ctx) => {
      const rows = getDb().prepare(`
        SELECT u.jid, u.pushname, u.name, g.wallet, g.bank FROM user_group_data g
        JOIN users u ON u.jid = g.jid
        WHERE g.group_jid = ? AND (u.banned = 0 OR u.banned IS NULL)
        ORDER BY (g.wallet + g.bank) DESC LIMIT 10
      `).all(require('../../database').getScope());
      let text = '💰 *RANK DINHEIRO*\n\n';
      rows.forEach((r, i) => {
        const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
        const name = r.pushname || r.name || 'User';
        text += `${medal} ${name}: ${formatMoney((r.wallet || 0) + (r.bank || 0))}\n`;
      });
      await ctx.reply(text);
    }
  }
];
