'use strict';
function prov() { try { return require('../../services/search/providers'); } catch (e) { return null; } }
function eng() { try { return require('../../services/search/engine'); } catch (e) { return null; } }

async function run(ctx, kind) {
  const q = (ctx.args || []).join(' ').trim();
  if (!q) return ctx.reply('Ex: *' + kind + ' axios*');
  const p = prov();
  const e = eng();
  try {
    if (kind === 'npm' && p && p.npmSearch) {
      const r = await p.npmSearch(q);
      return ctx.reply('📦 *npm*\n' + String(r.summary || '').slice(0, 900));
    }
    if (kind === 'mdn' && p && p.mdn) {
      const r = await p.mdn(q);
      return ctx.reply('💻 *MDN*\n' + String(r.summary || '').slice(0, 900));
    }
    if (kind === 'wikipedia' && p && p.wikipedia) {
      const r = await p.wikipedia(q);
      return ctx.reply('📖 *Wikipedia*\n' + String(r.summary || '').slice(0, 900) + (r.url ? '\n🔗 ' + r.url : ''));
    }
    if (e && e.searchWeb) {
      const r = await e.searchWeb(q);
      if (r) return ctx.reply('🔎 *' + (r.source || kind) + '*\n' + String(r.summary || '').slice(0, 900) + (r.url ? '\n🔗 ' + r.url : ''));
    }
  } catch (err) {
    return ctx.reply('❌ Falha. Tenta *pesquisa ' + q + '*.');
  }
  return ctx.reply('❌ Sem resultado.');
}

const LIST = [
  ['npm', 'npm'],
  ['pypi', 'npm'],
  ['commons', 'wikipedia'],
  ['archiveorg', 'wikipedia'],
  ['wiktionary', 'wikipedia'],
  ['smithsonian', 'wikipedia'],
  ['metmuseum', 'wikipedia'],
  ['rijks', 'wikipedia'],
  ['wellcome', 'wikipedia']
];

module.exports = LIST.map(function (pair) {
  return {
    name: pair[0],
    aliases: [],
    category: 'utilidades',
    description: 'Pesquisa ' + pair[0],
    async handler(ctx) { return run(ctx, pair[1]); }
  };
});
