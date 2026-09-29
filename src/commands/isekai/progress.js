let panels; try { panels = require('../../isekai/panels'); } catch (_) {}
const isekaiDb = require('../../isekai/db');
const progress = require('../../isekai/progress');

function need(ctx) {
  const g = isekaiDb.scopeGroup(ctx);
  const d = isekaiDb.getPlayerData(ctx.sender, g);
  if (!d || !d.race) return { ok: false, msg: 'Cria personagem: iskiniciar Nome' };
  progress.ensureProgress(d);
  return { ok: true, data: d, group: g };
}
function save(ctx, g, d) { isekaiDb.savePlayerData(ctx.sender, g, d); }
function arg0(ctx) {
  if (ctx.args && ctx.args[0]) return String(ctx.args[0]).toLowerCase();
  const t = String(ctx.text || '').trim().split(/\s+/);
  return (t[0] || '').toLowerCase();
}

module.exports = [
  { name: 'isknivel', aliases: ['isklevel', 'iskxp'], category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      await ctx.reply(
        'NIVEL\nNivel: ' + n.data.level +
        '\nXP: ' + n.data.xp + '/' + n.data.xpNext +
        '\nRank: ' + progress.rankLabel(n.data) +
        '\nGuilda: ' + (n.data.guild || 'nenhuma') +
        '\nRep: ' + (n.data.guildRep || 0)
      );
    }},
  { name: 'iskguilda', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      let t = 'GUILDAS\nAtual: ' + (n.data.guild || 'nenhuma') + ' | Rep ' + (n.data.guildRep || 0) + '\n\n';
      progress.GUILDS.forEach(function (g) {
        t += g.emoji + ' ' + g.name + ' [' + g.id + ']\n';
      });
      t += '\nEntrar: iskguilda_entrar aventureiros';
      await ctx.reply(t);
    }},
  { name: 'iskguilda_entrar', aliases: ['iskguildaentrar'], category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const id = arg0(ctx);
      if (!id) return ctx.reply('Uso: iskguilda_entrar aventureiros|magos|cacadores|artesaos|mercadores|sombria|sagrada');
      const r = progress.joinGuild(n.data, id);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      await ctx.reply('Entraste na ' + r.guild.emoji + ' ' + r.guild.name);
    }},
  { name: 'iskquest', aliases: ['iskquests'], category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      let t = 'QUESTS\n\n';
      Object.keys(progress.QUESTS).forEach(function (id) {
        const q = progress.QUESTS[id];
        const st = n.data.quests[id];
        const prog = st && st.active ? (st.progress + '/' + st.need) : '-';
        t += '- ' + q.name + ' [' + id + ']\n  ' + (q.daily ? 'diaria' : q.weekly ? 'semanal' : '') +
          ' | prog ' + prog + '\n  Y' + q.reward.iene + ' +' + q.reward.xp + 'xp\n';
      });
      t += '\niskaceitarquest <id>\niskconcluir <id>';
      await ctx.reply(t);
    }},
  { name: 'iskaceitarquest', aliases: ['iskaceitar'], category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const id = arg0(ctx);
      if (!id) return ctx.reply('Uso: iskaceitarquest caca_goblin|pesca_dia|mina_dia|explorar|boss_semanal');
      const r = progress.acceptQuest(n.data, id);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      await ctx.reply('Quest aceita: ' + r.quest.name + '\nObjetivo: ' + r.quest.need + ' x ' + r.quest.key);
    }},
  { name: 'iskconcluir', aliases: ['iskcompletar'], category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const id = arg0(ctx);
      if (!id) return ctx.reply('Uso: iskconcluir <id>');
      const r = progress.completeQuest(n.data, id);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      let msg = 'Quest concluida: ' + r.quest.name + '\n+Y' + r.iene + ' +' + r.xp + ' XP';
      if (r.leveled && r.leveled.leveled) msg += '\nLEVEL UP x' + r.leveled.levels + ' -> Nv' + r.leveled.level;
      await ctx.reply(msg);
    }},
  { name: 'iskqueststatus', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      let t = 'QUEST STATUS\n';
      let any = false;
      Object.keys(n.data.quests || {}).forEach(function (id) {
        const st = n.data.quests[id];
        if (st && st.active) {
          any = true;
          t += '- ' + id + ': ' + st.progress + '/' + st.need + '\n';
        }
      });
      if (!any) t += '(nenhuma ativa)\n';
      await ctx.reply(t);
    }},
  { name: 'iskescola', aliases: ['iskmagia'], category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const tier = progress.MAGIC_TIERS[n.data.magicLevel] || 'Novato';
      await ctx.reply(
        'ESCOLA DE MAGIA\nNivel: ' + tier + ' (' + n.data.magicLevel + ')\nXP magico: ' + n.data.magicXp +
        '\n\nAula: iskaula (Y15)\nTreino attr: isktreinar forca'
      );
    }},
  { name: 'iskaula', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const r = progress.studyMagic(n.data);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      let msg = 'Aula concluida\nTier: ' + r.tier + '\nXP mag: ' + r.magicXp;
      if (r.up) msg += '\nSubiste de nivel magico!';
      await ctx.reply(msg);
    }},
  { name: 'isktreinar', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const attr = arg0(ctx);
      if (!attr) return ctx.reply('Uso: isktreinar forca|defesa|agilidade|magia|precisao|vitalidade');
      const r = progress.train(n.data, attr);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      await ctx.reply('Treino: ' + r.attr + ' = ' + r.value + '\n-Y10');
    }},
  { name: 'iskranking', aliases: ['iskrank'], category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      await ctx.reply(
        'TEU RANKING ISEKAI\nNome: ' + (n.data.name || '-') +
        '\nNivel: ' + n.data.level +
        '\nRank: ' + progress.rankLabel(n.data) +
        '\nRep guilda: ' + (n.data.guildRep || 0) +
        '\nIENE: Y' + (n.data.iene || 0) +
        '\n\n(Ranking global entre jogadores = expansao futura)'
      );
    }},
  { name: 'isktitulos', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const t = (n.data.titles || []).join('\n- ') || 'nenhum';
      await ctx.reply('TITULOS\n- ' + t);
    }},
  { name: 'iskconquistas', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const a = (n.data.achievements || []).join('\n- ') || 'nenhuma';
      await ctx.reply('CONQUISTAS\n- ' + a);
    }}
];
