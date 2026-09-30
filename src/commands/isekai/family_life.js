const isekaiDb = require('../../isekai/db');
const fam = require('../../isekai/family_life');

function need(ctx) {
  const g = isekaiDb.scopeGroup(ctx);
  const d = isekaiDb.getPlayerData(ctx.sender, g);
  if (!d || !d.race) return { ok: false, msg: 'Cria personagem: iskiniciar Nome' };
  fam.ensureFamily(d);
  return { ok: true, data: d, group: g };
}
function save(ctx, g, d) { isekaiDb.savePlayerData(ctx.sender, g, d); }
function argsOf(ctx) {
  if (ctx.args && ctx.args.length) return ctx.args.map(String);
  const t = String(ctx.text || '').trim();
  return t ? t.split(/\s+/).filter(Boolean) : [];
}

function tip(data, r) {
  let t = '\n🔮 *Rafael*\n';
  if (r && r.mood && r.mood.label === 'Feliz') t += 'Bom momento em familia. Continua assim.\n';
  else if (data.family.mood < 35) t += 'Humor baixo. Tenta conversar ou um passeio.\n';
  else t += 'Pequenos gestos fortalecem o vinculo.\n';
  if ((data.iene || 0) < 20) t += 'Sugestao: isklutar / iskvender para IENE.\n';
  return t;
}

module.exports = [
  {
    name: 'iskfamilia',
    aliases: ['iskfam', 'isklar'],
    category: 'isekai',
    handler: async (ctx) => {
      const n = need(ctx);
      if (!n.ok) return ctx.reply(n.msg);
      const parts = argsOf(ctx);
      const sub = (parts[0] || '').toLowerCase();
      const arg = (parts[1] || '').toLowerCase();

      if (!sub) {
        return ctx.reply(fam.panelMain(n.data));
      }
      if (sub === 'atividades' || sub === 'atividade') {
        const page = parseInt(arg, 10) || 1;
        return ctx.reply(fam.listActivities(page));
      }
      if (sub === 'fazer' || sub === 'acao') {
        if (!arg) return ctx.reply('Uso: iskfamiilia fazer limpar\nLista: iskfamiilia atividades');
        const r = fam.doActivity(n.data, arg);
        if (!r.ok) return ctx.reply(r.msg);
        save(ctx, n.group, n.data);
        let msg =
          '╭──〔 🌸 ' + r.activity.name + ' 〕──╮\n' +
          '◈┃' + r.mood.emoji + ' Humor: ' + r.mood.label + '\n' +
          '◈┃💕 Vinculo: ' + r.bondSpouse + '/100\n';
        if (r.cost) msg += '◈┃🪙 -Y' + r.cost + '\n';
        if (r.loot) msg += '◈┃🎁 ' + r.loot + '\n';
        msg += '╰──────────────────╯';
        msg += tip(n.data, r);
        return ctx.reply(msg);
      }
      if (sub === 'lar' || sub === 'casa') {
        if (arg && arg !== 'ver') {
          const r = fam.buyHouse(n.data, arg);
          if (!r.ok) return ctx.reply(r.msg);
          save(ctx, n.group, n.data);
          return ctx.reply('🏡 Nova residência: *' + r.house.name + '*\n-Y' + r.house.cost);
        }
        let t = '╭──〔 🏡 𝐋𝐀𝐑 〕──╮\n';
        fam.HOUSES.forEach(function (h) {
          if (h.id === 'nenhum') return;
          t += '◈┃ `' + h.id + '` — ' + h.name + ' (Y' + h.cost + ')\n';
        });
        t += '╰──────────────────╯\n';
        t += '> Comprar: iskfamiilia lar simples\n> Atual: ' + n.data.family.house;
        return ctx.reply(t);
      }
      if (sub === 'relacionamento' || sub === 'rel') {
        const f = n.data.family;
        const m = fam.moodLabel(f.mood);
        return ctx.reply(
          '╭──〔 ❤️ 𝐑𝐄𝐋𝐀𝐂𝐈𝐎𝐍𝐀𝐌𝐄𝐍𝐓𝐎 〕──╮\n' +
          '◈┃ Conjuge: ' + (f.spouse || n.data.marriedTo || 'nenhum') + '\n' +
          '◈┃ Personalidade: ' + (f.spousePersonality || '-') + '\n' +
          '◈┃ Vinculo: ' + f.bondSpouse + '/100\n' +
          '◈┃' + m.emoji + ' Humor: ' + m.label + '\n' +
          '◈┃ Parceiro: ' + (n.data.partner || '-') + '\n' +
          '╰──────────────────╯\n' +
          '> iskfamiilia fazer conversar\n> isknamorar / iskcasar'
        );
      }
      if (sub === 'filhos' || sub === 'filho') {
        const kids = n.data.family.kids || [];
        let t = '╭──〔 👶 𝐅𝐈𝐋𝐇𝐎𝐒 〕──╮\n';
        if (!kids.length) t += '◈┃ Nenhum ainda\n';
        else kids.forEach(function (k, i) {
          t += '◈┃ ' + (k.name || ('Filho ' + (i + 1))) + ' — ' + (k.age || 'crianca') + '\n';
        });
        t += '◈┃ Vinculo: ' + (n.data.family.bondKids || 0) + '/100\n';
        t += '╰──────────────────╯\n> iskfamiilia fazer brincar';
        return ctx.reply(t);
      }
      if (sub === 'eventos' || sub === 'evento') {
        const ev = fam.randomEvent(n.data);
        return ctx.reply(
          '╭──〔 🎉 𝐄𝐕𝐄𝐍𝐓𝐎 〕──╮\n◈┃ ' + ev + '\n╰──────────────────╯\n> iskfamiilia atividades'
        );
      }
      if (sub === 'memorias' || sub === 'memoria') {
        return ctx.reply(fam.memoriesText(n.data));
      }
      if (sub === 'financas' || sub === 'financeiro') {
        return ctx.reply(
          '╭──〔 💰 𝐅𝐈𝐍𝐀𝐍𝐂̧𝐀𝐒 〕──╮\n' +
          '◈┃ IENE: ' + (n.data.iene || 0) + '\n' +
          '◈┃ Casa: ' + n.data.family.house + '\n' +
          '◈┃ Despesas: comida, melhorias, festas\n' +
          '╰──────────────────╯\n> iskfamiilia lar | isksaldo'
        );
      }
      return ctx.reply('Opcoes: lar | relacionamento | filhos | atividades | fazer | eventos | memorias | financas');
    }
  }
];
