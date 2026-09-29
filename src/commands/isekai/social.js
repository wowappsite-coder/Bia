
function panelTitle(title, tip, bodyLines, footer) {
  let t = '╭──〔 ' + title + ' 〕──╮\n';
  if (tip) t += '> ' + tip + '\n';
  t += '❀────────────────❀\n';
  t += '╭──〔 📋 〕──╮\n';
  (bodyLines || []).forEach(function (line) {
    t += '◈┃ ' + line + '\n';
  });
  if (!bodyLines || !bodyLines.length) t += '◈┃ (vazio)\n';
  t += '╰──────────────────╯\n';
  if (footer) t += '> ' + footer + '\n';
  t += '❀────────────────❀';
  return t;
}

const isekaiDb = require('../../isekai/db');
const social = require('../../isekai/social');

function need(ctx) {
  const g = isekaiDb.scopeGroup(ctx);
  const d = isekaiDb.getPlayerData(ctx.sender, g);
  if (!d || !d.race) return { ok: false, msg: 'Cria personagem: iskiniciar Nome' };
  social.ensureSocial(d);
  return { ok: true, data: d, group: g };
}
function save(ctx, g, d) { isekaiDb.savePlayerData(ctx.sender, g, d); }
function argsOf(ctx) {
  if (ctx.args && ctx.args.length) return ctx.args.map(String);
  const t = String(ctx.text || '').trim();
  return t ? t.split(/\s+/).filter(Boolean) : [];
}

module.exports = [
  { name: 'iskrelacoes_old', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const keys = Object.keys(n.data.npcRel || {});
      let t = 'RELACOES\n';
      if (n.data.partner) t += 'Parceiro(a): ' + n.data.partner + '\n';
      if (n.data.marriedTo) t += 'Casado(a) com: ' + n.data.marriedTo + '\n';
      t += '\n';
      if (!keys.length) t += '(fala/presenteia NPCs)\n';
      keys.forEach(function (id) {
        const rel = social.relScore(n.data, id);
        const tr = social.trustScore(n.data, id);
        const nm = (social.ROMANCE_NPCS[id] && social.ROMANCE_NPCS[id].name) || id;
        t += nm + ' [' + id + ']\n  ' + social.relLabel(rel) + ' | Rel ' + rel + ' | Trust ' + tr + '\n';
      });
      await ctx.reply(t);
    }},
  { name: 'iskdar', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const parts = argsOf(ctx);
      const npcId = (parts[0] || '').toLowerCase();
      const itemId = (parts[1] || '').toLowerCase();
      if (!npcId || !itemId) return ctx.reply('Uso: iskdar <npc> <item>\nEx: iskdar elena pocao');
      const r = social.gift(n.data, npcId, itemId);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      await ctx.reply('Presente (' + r.note + ')\nRel ' + r.rel + ' | Trust ' + r.trust + ' (' + (r.delta > 0 ? '+' : '') + r.delta + ')');
    }},
  { name: 'isknamorar', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const id = (argsOf(ctx)[0] || '').toLowerCase();
      if (!id) return ctx.reply('Rotas: elena mara lyra orin\nUso: isknamorar elena\nSobe relacao com iskfalar / iskdar');
      const r = social.tryDate(n.data, id);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      await ctx.reply('A namorar com ' + r.name + '!\nCasar depois: iskcasar ' + id);
    }},
  { name: 'iskcasar', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const id = (argsOf(ctx)[0] || '').toLowerCase();
      if (!id) return ctx.reply('Uso: iskcasar elena');
      const r = social.tryMarry(n.data, id);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      await ctx.reply('CASAMENTO\nCasaste com ' + r.name + '!\n-Y' + r.cost + '\n(Isolado do RPG familia antigo)');
    }},
  { name: 'iskterminar', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const r = social.breakUp(n.data);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      await ctx.reply('Relacionamento terminado.');
    }},
  { name: 'iskfamilia_legacy', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const f = n.data.family || {};
      await ctx.reply(
        'FAMILIA ISEKAI\nConjuge: ' + (f.spouse || n.data.marriedTo || 'nenhum') +
        '\nCasamento: ' + (f.marriedAt || '-') +
        '\nFilhos: ' + ((f.kids && f.kids.length) ? f.kids.join(', ') : 'nenhum') +
        '\nParceiro: ' + (n.data.partner || '-') +
        '\n\n(Nao e o RPG familia do bot)'
      );
    }},
  { name: 'iskparty', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      let t = 'PARTY\nMoral: ' + (n.data.partyMoral || 70) + '/100\n\n';
      if (!n.data.party.length) t += '(vazia)\niskconvidar <npc>\n';
      else n.data.party.forEach(function (m, i) {
        t += (i + 1) + '. ' + m.name + ' [' + m.id + '] ' + m.role +
          '\n   HP ' + m.hp + '/' + m.hpMax + ' | Lealdade ' + m.loyalty + '\n';
      });
      t += '\niskconvidar | iskexpulsar | iskacampamento';
      await ctx.reply(t);
    }},
  { name: 'iskconvidar', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const id = (argsOf(ctx)[0] || '').toLowerCase();
      if (!id) return ctx.reply('Uso: iskconvidar elena\nSobe relacao antes ajuda');
      const r = social.inviteParty(n.data, id);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      await ctx.reply(r.name + ' entrou como ' + r.role + '!');
    }},
  { name: 'iskexpulsar', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const id = (argsOf(ctx)[0] || '').toLowerCase();
      if (!id) return ctx.reply('Uso: iskexpulsar elena');
      const r = social.kickParty(n.data, id);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      await ctx.reply(id + ' saiu da party.');
    }},
  { name: 'iskacampamento', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const r = social.camp(n.data);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      await ctx.reply('ACAMPAMENTO\n' + r.chat + '\n+' + r.heal + ' HP | Mana ok\nMoral subiu.');
    }},
  { name: 'iskescolhas', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const arg = (argsOf(ctx)[0] || '').toLowerCase();
      if (!arg) {
        return ctx.reply('ESCOLHAS\n1) merchant_attack\n2) lost_child\n\nEx: iskescolhas merchant_attack\nDepois: iskdecidir merchant_attack 1');
      }
      if (arg === 'merchant_attack') {
        return ctx.reply('Comerciante atacado!\n1 Ajudar\n2 Ignorar\n3 Roubar bandidos\n\niskdecidir merchant_attack 1');
      }
      if (arg === 'lost_child') {
        return ctx.reply('Crianca perdida!\n1 Ajudar\n2 Ignorar\n\niskdecidir lost_child 1');
      }
      await ctx.reply('Desconhecida. iskescolhas');
    }},
  { name: 'iskdecidir', category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const parts = argsOf(ctx);
      const id = (parts[0] || '').toLowerCase();
      const opt = parts[1] || '1';
      if (!id) return ctx.reply('Uso: iskdecidir merchant_attack 1');
      const r = social.makeChoice(n.data, id, opt);
      if (!r.ok) return ctx.reply(r.msg);
      save(ctx, n.group, n.data);
      await ctx.reply('Escolheste: ' + r.label + '\n(' + r.text + ')');
    }},
  { name: 'iskeventossociais', category: 'isekai',
    handler: async (ctx) => {
      const events = ['Festival da Vila', 'Torneio local', 'Festa na taverna', 'Cerimonia na igreja', 'Feira cultural'];
      const e = events[Math.floor(Math.random() * events.length)];
      await ctx.reply('EVENTO SOCIAL\n' + e + '\nParticipa com iskfalar / iskviajar');
    }}
,
  {
    name: 'iskrelacoes',
    aliases: ['iskrel', 'iskrelacionamentos'],
    category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx);
      if (!n.ok) return ctx.reply(n.msg);
      const d = n.data;
      const lines = [];
      if (d.marriedTo || (d.family && d.family.spouse)) {
        lines.push('💍 Conjuge: ' + (d.family && d.family.spouse || d.marriedTo));
        if (d.family && d.family.bondSpouse != null) lines.push('💕 Vinculo: ' + d.family.bondSpouse + '/100');
      } else {
        lines.push('💍 Conjuge: nenhum');
      }
      if (d.partner) lines.push('💞 Parceiro: ' + d.partner);
      const rel = d.npcRel || d.relations || {};
      const keys = Object.keys(rel);
      if (keys.length) {
        lines.push('── NPCs ──');
        keys.slice(0, 12).forEach(function (k) {
          const v = typeof rel[k] === 'object' ? (rel[k].score || rel[k].v || 0) : rel[k];
          lines.push(k + ': ' + v);
        });
      } else {
        lines.push('NPCs: ainda sem vinculos');
      }
      await ctx.reply(panelTitle('❤️ 𝐑𝐄𝐋𝐀𝐂̧𝐎̃𝐄𝐒', 'NPCs, romance e vinculos', lines, 'iskfalar · iskdar · isknamorar'));
    }
  },
];
