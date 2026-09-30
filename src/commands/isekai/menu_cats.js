const SUB = {
  personagem: ['iskstatus', 'iskpersonagem', 'iskatributos', 'iskhabilidades'],
  aventura: ['isklutar', 'iskboss', 'iskdungeon', 'iskatacar', 'iskexplorar'],
  economia: ['isksaldo', 'iskloja', 'iskcomprar', 'iskvender'],
  vida: ['iskferimentos', 'iskcura', 'iskmorte', 'iskreencarnar'],
  divino: ['iskdeuses', 'iskorar', 'iskpacto', 'isktranscender'],
  social: ['iskrelacoes', 'iskdar', 'isknamorar', 'iskcasar', 'iskfamilia'],
  npcs: ['isknpc', 'iskfalar', 'iskrelacoes'],
  sistema: ['iskiniciar', 'iskmodo', 'iskmodo_off', 'iskmenu']
};

function panel(key) {
  const list = SUB[key];
  if (!list) return 'iskmenu';
  let t = '╭──〔 ' + key.toUpperCase() + ' 〕──╮\n';
  list.forEach(function (c) { t += '◈┃ ' + c + '\n'; });
  t += '╰──────────────────╯\n> iskmenu';
  return t;
}
function h(k) { return async function (ctx) { await ctx.reply(panel(k)); }; }

module.exports = [
  { name: 'iskaventura', category: 'isekai', handler: h('aventura') },
  { name: 'iskeconomia', category: 'isekai', handler: h('economia') },
  { name: 'iskvida', category: 'isekai', handler: h('vida') },
  { name: 'iskdivino', category: 'isekai', handler: h('divino') },
  { name: 'isksocial', category: 'isekai', handler: h('social') },
  { name: 'isknpcs', category: 'isekai', handler: h('npcs') },
  { name: 'isksistema', category: 'isekai', handler: h('sistema') }
];
