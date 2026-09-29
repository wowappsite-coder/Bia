const isekaiDb = require('../../isekai/db');
const death = require('../../isekai/death');

function need(ctx) {
  const g = isekaiDb.scopeGroup(ctx);
  const d = isekaiDb.getPlayerData(ctx.sender, g);
  if (!d || !d.race) return { ok: false, msg: 'Cria personagem: iskiniciar Nome' };
  death.ensureDeath(d);
  death.clearExpiredWounds(d);
  return { ok: true, data: d, group: g };
}
function save(ctx, g, d) { isekaiDb.savePlayerData(ctx.sender, g, d); }

module.exports = [
  { name: 'iskferimentos', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      if (n.data.dead) return ctx.reply('Estas morto.');
      const w = n.data.wounds || [];
      if (!w.length) return ctx.reply('Sem ferimentos. HP: ' + n.data.hp + '/' + n.data.hpMax);
      let t = 'FERIMENTOS\nHP: ' + n.data.hp + '/' + n.data.hpMax + '\n\n';
      w.forEach(function (x, i) {
        const left = Math.max(0, Math.ceil((x.until - Date.now()) / 60000));
        t += (i + 1) + '. ' + x.type + ' (' + x.severity + ') \~' + left + 'min\n';
      });
      t += '\nCurar: iskcura';
      await ctx.reply(t);
    }},
  { name: 'iskcura', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const block = death.blockIfDead(n.data);
      if (block) return ctx.reply(block);
      const r = death.healWounds(n.data, true);
      if (!r.ok) {
        const r2 = death.healWounds(n.data, false);
        save(ctx, n.group, n.data);
        return ctx.reply(r.msg + (r2.ok ? '\n' + r2.msg : ''));
      }
      save(ctx, n.group, n.data);
      await ctx.reply(r.msg + '\nHP: ' + n.data.hp + '/' + n.data.hpMax);
    }},
  { name: 'iskmorte', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      if (!n.data.dead && !n.data.deadPending) {
        return ctx.reply('Ainda vivo.\nHP: ' + n.data.hp + '/' + n.data.hpMax + '\n(Morte: derrota PvE com HP 0 ou isksuicidio_teste)');
      }
      const s = n.data._legacySnap || {};
      await ctx.reply(
        'VOCE MORREU\n\nNome: ' + (s.name || n.data.name) +
        '\nNivel: ' + (s.level || '?') +
        '\nCausa: ' + (n.data.deathCause || s.cause || '?') +
        '\nEstado: Morto\n\nisklegado | iskreencarnar'
      );
    }},
  { name: 'isklegado', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const s = n.data._legacySnap;
      if (!s && !(n.data.lifeHistory && n.data.lifeHistory.length)) {
        return ctx.reply('Sem legado ainda (aparece apos morte).');
      }
      let t = 'LEGADO\n';
      if (s) {
        t += 'Ultima morte:\n' + s.name + ' Nv' + s.level + '\nCausa: ' + s.cause + '\nIenes: ' + s.iene + '\n';
      }
      if (n.data.family && n.data.family.inheritedNote) t += n.data.family.inheritedNote + '\n';
      await ctx.reply(t);
    }},
  { name: 'iskreencarnar', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const r = death.reincarnate(n.data);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      let msg = 'REENCARNACAO\nVida #' + r.lifeNum + '\nNome: ' + r.name + '\n';
      msg += r.exceptional ? 'Resultado: EXCEPCIONAL (10%)\n' : 'Resultado: normal (90% reducao)\n';
      msg += 'Memoria: ' + r.memory + '\n';
      if (r.inherited) msg += 'Heranca ao conjuge: Y' + r.inherited + '\n';
      msg += '\nNova ficha: iskstatus';
      await ctx.reply(msg);
    }},
  { name: 'iskvidas', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      let t = 'VIDAS\nAtual: #' + (n.data.lifeNum || 1) + '\nMemoria: ' + (n.data.memory || '-') + '\n\n';
      const h = n.data.lifeHistory || [];
      if (!h.length) t += '(primeira vida)\n';
      else h.forEach(function (v) {
        t += 'Vida #' + v.life + ' — ' + v.name + ' Nv' + v.level +
          '\n  ' + (v.race || '?') + ' / ' + (v.class || '?') +
          '\n  Morte: ' + (v.cause || '?') + '\n\n';
      });
      await ctx.reply(t);
    }},
  { name: 'iskdestino', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      await ctx.reply(
        'DESTINO\nCaminho: ' + (n.data.path || 'aventureiro') +
        '\nAlinhamento: ' + death.alignLabel(n.data.alignment || 0) + ' (' + (n.data.alignment || 0) + ')' +
        '\nVida #' + (n.data.lifeNum || 1) +
        '\n\niskheroi | iskvilao | iskalinhamento'
      );
    }},
  { name: 'iskalinhamento', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      await ctx.reply(
        'ALINHAMENTO: ' + death.alignLabel(n.data.alignment || 0) +
        ' (' + (n.data.alignment || 0) + ')\nSanto > Bom > Neutro > Mal > Extremo\nMuda com iskescolhas / acoes.'
      );
    }},
  { name: 'iskheroi', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const block = death.blockIfDead(n.data);
      if (block) return ctx.reply(block);
      death.shiftAlign(n.data, 2);
      const r = death.setPath(n.data, 'heroi');
      save(ctx, n.group, n.data);
      if (!r.ok) return ctx.reply(r.msg + '\nAlign: ' + death.alignLabel(n.data.alignment));
      await ctx.reply('Caminho HEROI ativado.\nTitulo: Heroi');
    }},
  { name: 'iskvilao', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const block = death.blockIfDead(n.data);
      if (block) return ctx.reply(block);
      death.shiftAlign(n.data, -2);
      const r = death.setPath(n.data, 'vilao');
      save(ctx, n.group, n.data);
      if (!r.ok) return ctx.reply(r.msg + '\nAlign: ' + death.alignLabel(n.data.alignment));
      await ctx.reply('Caminho VILAO ativado.\nTitulo: Vilao');
    }},
  { name: 'iskhistorico', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      await ctx.reply(
        'HISTORICO\nVida #' + (n.data.lifeNum || 1) +
        '\nPath: ' + (n.data.path || '-') +
        '\nAlign: ' + death.alignLabel(n.data.alignment || 0) +
        '\nDead: ' + (!!n.data.dead) +
        '\nTitulos: ' + ((n.data.titles || []).join(', ') || '-')
      );
    }},
  { name: 'isksuicidio_teste', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      if (n.data.dead) return ctx.reply('Ja morto.');
      death.kill(n.data, 'teste voluntario');
      save(ctx, n.group, n.data);
      await ctx.reply('Morreste (teste).\niskmorte | iskreencarnar');
    }}
];
