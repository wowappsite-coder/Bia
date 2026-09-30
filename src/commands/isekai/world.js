const isekaiDb = require('../../isekai/db');
const world = require('../../isekai/world');

function need(ctx) {
  const g = isekaiDb.scopeGroup(ctx);
  const d = isekaiDb.getPlayerData(ctx.sender, g);
  if (!d || !d.race) return { ok: false, msg: 'Cria personagem: iskiniciar Nome' };
  world.ensureWorld(d);
  return { ok: true, data: d, group: g };
}
function save(ctx, g, d) { isekaiDb.savePlayerData(ctx.sender, g, d); }
function arg0(ctx) {
  if (ctx.args && ctx.args[0]) return String(ctx.args[0]).toLowerCase();
  const t = String(ctx.text || '').trim().split(/\s+/);
  return (t[0] || '').toLowerCase();
}

function mapText(data) {
  const lines = [];
  Object.keys(world.PLACES).forEach(function (id) {
    const p = world.PLACES[id];
    const known = data.discovered[id];
    const here = data.location === id ? ' <<' : '';
    if (known) lines.push('- ' + p.name + ' [' + id + ']' + here);
    else if (p.secret) lines.push('- ???');
  });
  return lines.join('\n');
}

module.exports = [
  { name: 'iskmundo', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const p = world.getPlace(n.data.location);
      const ev = world.rollWorldEvent(n.data);
      save(ctx, n.group, n.data);
      await ctx.reply(
        'MUNDO ISEKAI\nLocal: ' + (p ? p.name : n.data.location) +
        '\nHora: ' + world.timeOfDay(n.data) +
        '\nClima: ' + world.weather() +
        '\nEvento: ' + (ev ? ev.name : 'nenhum') +
        '\n\niskmapa | iskviajar | iskexplorar'
      );
    }},
  { name: 'iskmapa', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      await ctx.reply('MAPA\n' + mapText(n.data) + '\n\nViajar: iskviajar <id>');
    }},
  { name: 'isklocal', aliases: ['iskonde'], category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const p = world.getPlace(n.data.location);
      if (!p) return ctx.reply('Local invalido.');
      await ctx.reply(
        p.name + ' [' + p.id + ']\n' + p.desc +
        '\nTipo: ' + p.type + ' | Perigo: ' + p.danger +
        '\nSaidas: ' + p.links.join(', ') +
        '\nServicos: ' + (p.services.join(', ') || '-')
      );
    }},
  { name: 'iskcidade', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const p = world.getPlace(n.data.location);
      if (!p) return ctx.reply('Local invalido.');
      if (p.type !== 'cidade' && p.type !== 'vila' && p.type !== 'porto') {
        return ctx.reply('Nao estas numa cidade/vila.\nLocal: ' + p.name);
      }
      await ctx.reply(
        'CIDADE\n' + p.name + '\n' + p.desc +
        '\nServicos: ' + (p.services.join(', ') || '-') +
        '\nRep local: ' + ((n.data.cityRep && n.data.cityRep[p.id]) || 0)
      );
    }},
  { name: 'iskviajar', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const dest = arg0(ctx);
      if (!dest) {
        const p = world.getPlace(n.data.location);
        return ctx.reply('Uso: iskviajar <id>\nSaidas: ' + (p ? p.links.join(', ') : '-'));
      }
      const r = world.travel(n.data, dest);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      let msg = 'Viajaste para ' + r.place.name + '\n-Y' + r.cost;
      if (r.event === 'perigo') msg += '\nEncontro perigoso! Usa isklutar ou iskexplorar com cuidado.';
      if (r.event === 'viajante') msg += '\nEncontraste um viajante simpatico.';
      if (r.event === 'tesouro') msg += '\nEncontraste algumas moedas no caminho!';
      await ctx.reply(msg);
    }},
  { name: 'iskexplorar', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      // se ja existir combate iske xplorar da parte 3, este handler no world.js
      // pode coexistir - loader carrega ambos; o ultimo pode sobrescrever.
      // Para evitar conflito de nome, usamos a logica world e mencionamos combate.
      const r = world.exploreHere(n.data);
      if (!r.ok) return ctx.reply(r.msg);
      // quest bump explore se existir progress
      try {
        const progress = require('../../isekai/progress');
        if (progress.bumpQuest) progress.bumpQuest(n.data, 'explore', 1);
      } catch (_) {}
      save(ctx, n.group, n.data);
      if (r.type === 'monstro') {
        return ctx.reply('Exploracao: monstro proximo (perigo ' + r.danger + ')!\nUsa isklutar ou iskboss');
      }
      if (r.type === 'segredo') {
        return ctx.reply('Descobriste: ' + r.place.name + '!\n' + r.place.desc);
      }
      if (r.type === 'recurso') return ctx.reply('Encontraste: ' + r.item);
      if (r.type === 'tesouro') return ctx.reply('Tesouro! +IENE');
      if (r.type === 'npc') return ctx.reply('Viste ' + r.npc.name + '.\niskfalar ' + r.npc.id);
      if (r.type === 'rumor') return ctx.reply('Rumor: ' + r.text);
      await ctx.reply(r.msg || 'Nada especial.');
    }},
  { name: 'isknpc', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      let t = 'NPCs neste local:\n';
      let any = false;
      Object.keys(world.NPCS).forEach(function (id) {
        const npc = world.NPCS[id];
        if (npc.place === n.data.location) {
          any = true;
          t += '- ' + npc.name + ' [' + id + '] (' + npc.job + ')\n';
        }
      });
      if (!any) t += '(nenhum)\n';
      t += '\niskfalar <id>';
      await ctx.reply(t);
    }},
  { name: 'iskfalar', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const id = arg0(ctx);
      if (!id) return ctx.reply('Uso: iskfalar mara|garen|elena|orin|lyra|bruno');
      const r = world.talkNpc(n.data, id);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      await ctx.reply(
        r.npc.name + ' (' + r.npc.personality + '):\n"' + r.line + '"\n\nRelacao: ' + r.label + ' (' + r.rel + ')'
      );
    }},
  { name: 'iskrelacoes', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const rel = n.data.npcRel || {};
      const keys = Object.keys(rel);
      if (!keys.length) return ctx.reply('Sem relacoes ainda.\nFala com NPCs: iskfalar');
      let t = 'RELACOES\n';
      keys.forEach(function (id) {
        const npc = world.NPCS[id];
        const name = npc ? npc.name : id;
        t += '- ' + name + ': ' + world.relLabel(rel[id]) + ' (' + rel[id] + ')\n';
      });
      await ctx.reply(t);
    }},
  { name: 'iskeventos', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const ev = world.rollWorldEvent(n.data);
      save(ctx, n.group, n.data);
      if (!ev) return ctx.reply('Nenhum evento ativo no momento.');
      const left = Math.max(0, Math.ceil((ev.until - Date.now()) / 60000));
      await ctx.reply('EVENTO\n' + ev.name + '\nEfeito: ' + ev.effect + '\n\~' + left + ' min');
    }},
  { name: 'iskfaccoes', category: 'isekai',
    handler: async (ctx) => {
      await ctx.reply(
        'FACCOES\n- Guilda dos Aventureiros\n- Igreja da Luz\n- Culto Sombrio\n- Reino de Arvandia\n- Associacao de Magos\n- Guilda Mercantil\n\nRep detalhada por faccao = expansao futura'
      );
    }},
  { name: 'iskreputacao', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const p = world.getPlace(n.data.location);
      const rep = (n.data.cityRep && p && n.data.cityRep[p.id]) || 0;
      await ctx.reply(
        'REPUTACAO\nLocal: ' + (p ? p.name : '-') + ' = ' + rep +
        '\nGuilda rep: ' + (n.data.guildRep || 0)
      );
    }},
  { name: 'iskrumores', category: 'isekai',
    handler: async (ctx) => {
      const r = world.RUMORS[Math.floor(Math.random() * world.RUMORS.length)];
      await ctx.reply('RUMOR\n"' + r + '"');
    }}
];
