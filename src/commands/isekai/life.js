const isekaiDb = require('../../isekai/db');
const life = require('../../isekai/life');

function need(ctx) {
  const g = isekaiDb.scopeGroup(ctx);
  const d = isekaiDb.getPlayerData(ctx.sender, g);
  if (!d || !d.race) return { ok: false, msg: 'Cria personagem: iskiniciar Nome' };
  life.ensureLife(d);
  return { ok: true, data: d, group: g };
}
function save(ctx, g, d) { isekaiDb.savePlayerData(ctx.sender, g, d); }
function arg0(ctx) {
  if (ctx.args && ctx.args[0]) return String(ctx.args[0]).toLowerCase();
  const t = String(ctx.text || '').trim().split(/\s+/);
  return (t[0] || '').toLowerCase();
}

module.exports = [
  { name: 'iskprofissoes', aliases: ['iskprofissao', 'iskjobs'], category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      let t = 'PROFISSOES\n\n';
      life.PROF_LIST.forEach(function (p) {
        const pr = n.data.profs[p.id];
        const lv = pr ? pr.level : 0;
        const xp = pr ? pr.xp : 0;
        t += p.emoji + ' ' + p.name + (lv ? (' Nv.' + lv + ' (' + xp + 'xp)') : ' (bloqueada)') + '\n';
      });
      t += '\nUsa: iskplantar | iskpescar | iskminerar | iskforjar...';
      await ctx.reply(t);
    }},
  { name: 'iskfazenda', aliases: ['iskfarm'], category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const f = n.data.farm;
      let t = 'FAZENDA Nv.' + f.level + '\nLotes: ' + f.plots.length + '/' + f.maxPlots + '\n\n';
      if (!f.plots.length) t += '(vazio)\niskplantar trigo|cenoura|erva|milho\n';
      else {
        const now = Date.now();
        f.plots.forEach(function (p, i) {
          const left = Math.max(0, Math.ceil((p.readyAt - now) / 60000));
          t += (i + 1) + '. ' + p.name + (left ? (' \~' + left + 'min') : ' PRONTO') + '\n';
        });
        t += '\niskcolher';
      }
      await ctx.reply(t);
    }},
  { name: 'iskplantar', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const seed = arg0(ctx);
      if (!seed) return ctx.reply('Uso: iskplantar trigo|cenoura|erva|milho');
      const r = life.plant(n.data, seed);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      await ctx.reply('Plantado: ' + r.name + '\nPronto em \~' + r.mins + ' min');
    }},
  { name: 'iskcolher', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const r = life.harvest(n.data);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      await ctx.reply('Colheita:\n' + r.got.join('\n'));
    }},
  { name: 'iskpescar', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const r = life.fish(n.data);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      if (!r.got) return ctx.reply(r.msg);
      await ctx.reply('Pescaste: ' + r.name + ' [' + r.got + ']');
    }},
  { name: 'iskminerar', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const r = life.mine(n.data);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      if (!r.got) return ctx.reply(r.msg);
      await ctx.reply('Mineraste: ' + r.name + ' x' + r.qty + ' [' + r.got + ']');
    }},
  { name: 'iskforjar', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const id = arg0(ctx);
      if (!id) return ctx.reply('Uso: iskforjar espada_ferro|peitoral_ferro|escudo_ferro');
      const r = life.forge(n.data, id);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      await ctx.reply('Forjado: ' + r.result);
    }},
  { name: 'iskalquimia', aliases: ['iskalquimista'], category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const id = arg0(ctx);
      if (!id) return ctx.reply('Uso: iskalquimia pocao|antidoto|mana_pocao');
      const r = life.alchemy(n.data, id);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      await ctx.reply('Alquimia: ' + r.result);
    }},
  { name: 'iskcozinhar', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const id = arg0(ctx);
      if (!id) return ctx.reply('Uso: iskcozinhar sopa|carne');
      const r = life.cook(n.data, id);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      await ctx.reply('Cozinhado: ' + r.result);
    }},
  { name: 'iskmercador', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const mode = arg0(ctx) || 'vender';
      if (mode === 'treino' || mode === 'train') {
        const r = life.merchantDeal(n.data, 'treino');
        if (!r.ok) return ctx.reply(r.msg);
        save(ctx, n.group, n.data);
        return ctx.reply(r.msg);
      }
      const r = life.merchantDeal(n.data, 'vender');
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      await ctx.reply('Negocio: vendeu ' + r.sold + ' itens\n+Y' + r.gain + ' (bonus ' + r.bonus + '%)\nSaldo: Y' + n.data.iene);
    }},
  { name: 'isknobreza', aliases: ['isktitulo'], category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const sub = arg0(ctx);
      if (sub === 'subir' || sub === 'up') {
        const r = life.tryNobilityUp(n.data);
        if (!r.ok) return ctx.reply(r.msg);
        save(ctx, n.group, n.data);
        return ctx.reply('Nobreza: ' + r.rank.name);
      }
      const rank = life.nobilityInfo(n.data);
      await ctx.reply(
        'NOBREZA\nTitulo: ' + rank.name + '\nIENE: Y' + n.data.iene +
        '\n\nSubir (ate Barao): isknobreza subir\nTitulos altos = partes futuras'
      );
    }},
  { name: 'iskpropriedades', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const props = n.data.properties || [];
      let t = 'PROPRIEDADES\nFazenda: ativa (iskfazenda)\n';
      if (!props.length) t += 'Outras: nenhuma (expansao futura)\n';
      else props.forEach(function (p) { t += '- ' + p + '\n'; });
      await ctx.reply(t);
    }}
];
