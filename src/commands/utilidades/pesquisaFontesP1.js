'use strict';
function prov() { try { return require('../../services/search/providers'); } catch (e) { return null; } }
function eng() { try { return require('../../services/search/engine'); } catch (e) { return null; } }

async function run(ctx, kind) {
  const q = (ctx.args || []).join(' ').trim();
  if (!q) return ctx.reply('Ex: *' + kind + ' inteligencia artificial*');
  const p = prov();
  const e = eng();
  try {
    if (kind === 'wikipedia' && p && p.wikipedia) {
      const r = await p.wikipedia(q);
      return ctx.reply('📖 *Wikipedia*\n' + String(r.summary || '').slice(0, 900) + (r.url ? '\n🔗 ' + r.url : ''));
    }
    if (kind === 'duckduckgo' && p && p.duckduckgo) {
      const r = await p.duckduckgo(q);
      return ctx.reply('🔎 *DuckDuckGo*\n' + String(r.summary || '').slice(0, 900) + (r.url ? '\n🔗 ' + r.url : ''));
    }
    if (kind === 'mdn' && p && p.mdn) {
      const r = await p.mdn(q);
      return ctx.reply('💻 *MDN*\n' + String(r.summary || '').slice(0, 900));
    }
    if (kind === 'arxiv' && p && p.arxiv) {
      const r = await p.arxiv(q);
      return ctx.reply('🔬 *arXiv*\n' + String(r.summary || '').slice(0, 900));
    }
    if (e && e.searchWeb) {
      const r = await e.searchWeb(q);
      if (r) return ctx.reply('🔎 *' + (r.source || kind) + '*\n' + String(r.summary || '').slice(0, 900) + (r.url ? '\n🔗 ' + r.url : ''));
    }
  } catch (err) {
    return ctx.reply('❌ Falha em *' + kind + '*. Tenta *pesquisa ' + q + '*.');
  }
  return ctx.reply('❌ Sem resultado agora. Tenta *pesquisa ' + q + '*.');
}

const LIST = [
  ['wikipedia', 'wikipedia'],
  ['wiki', 'wikipedia'],
  ['duckduckgo', 'duckduckgo'],
  ['ddg', 'duckduckgo'],
  ['wikidata', 'wikipedia'],
  ['wikimedia', 'wikipedia'],
  ['archive', 'duckduckgo'],
  ['wayback', 'duckduckgo'],
  ['openverse', 'duckduckgo'],
  ['arxiv', 'arxiv'],
  ['pubmed', 'arxiv'],
  ['crossref', 'arxiv'],
  ['openalex', 'arxiv'],
  ['europepmc', 'arxiv'],
  ['nasa', 'duckduckgo'],
  ['noaa', 'duckduckgo'],
  ['usgs', 'duckduckgo'],
  ['loc', 'duckduckgo'],
  ['mdn', 'mdn']
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
