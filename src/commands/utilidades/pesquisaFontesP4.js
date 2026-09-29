'use strict';
function eng() { try { return require('../../services/search/engine'); } catch (e) { return null; } }
function prov() { try { return require('../../services/search/providers'); } catch (e) { return null; } }

async function doVideo(ctx) {
  const q = (ctx.args || []).join(' ').trim();
  if (!q) return ctx.reply('Ex: *video natureza*');
  const e = eng();
  const p = prov();
  try { await ctx.reply('🎬 A procurar...'); } catch (x) {}
  let r = null;
  try {
    if (p && p.openverseVideo) r = await p.openverseVideo(q);
    if (!r && e && e.searchVideo) r = await e.searchVideo(q);
  } catch (err) {}
  if (!r) return ctx.reply('❌ Nenhum video nas fontes publicas.');
  return ctx.reply(
    '╭──〔 🎬 VIDEO 〕──╮\n' +
    '│ 🔎 ' + q + '\n' +
    '│ 🎬 ' + String(r.title || '').slice(0, 80) + '\n' +
    '│ 🌐 ' + (r.source || 'Openverse') + '\n' +
    (r.pageUrl ? ('│ 🔗 ' + r.pageUrl + '\n') : '') +
    (r.videoUrl ? ('│ ▶️ ' + r.videoUrl + '\n') : '') +
    '╰────────────────╯'
  );
}

async function doClaude(ctx) {
  const q = (ctx.args || []).join(' ').trim();
  if (!q) return ctx.reply('Ex: *claude explica gravidade*');
  const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '';
  if (!key || /^sk-ant-api03-1eWksl/.test(key) || key.indexOf('FALSA') >= 0) {
    return ctx.reply(
      '⚠️ Claude precisa da API real no .env\n' +
      'ANTHROPIC_API_KEY=...\n' +
      'Enquanto isso usa *bia ' + q + '*'
    );
  }
  try {
    const https = require('https');
    const body = JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
      max_tokens: 400,
      messages: [{ role: 'user', content: q }]
    });
    const text = await new Promise(function (resolve, reject) {
      const req = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(body)
        }
      }, function (res) {
        let d = '';
        res.on('data', function (c) { d += c; });
        res.on('end', function () { resolve(d); });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
    const j = JSON.parse(text);
    const out = (j.content && j.content[0] && j.content[0].text) || j.error && j.error.message || text;
    return ctx.reply('🤖 *Claude*\n' + String(out).slice(0, 1500));
  } catch (err) {
    return ctx.reply('❌ Claude falhou. Usa *bia ' + q + '*');
  }
}

module.exports = [
  { name: 'videosearch', aliases: [], category: 'utilidades', description: 'Video Openverse', handler: doVideo },
  { name: 'openversevid', aliases: [], category: 'utilidades', description: 'Video Openverse', handler: doVideo },
  { name: 'nasavid', aliases: [], category: 'utilidades', description: 'Video Openverse', handler: doVideo },
  { name: 'claude', aliases: [], category: 'utilidades', description: 'IA Claude (API)', handler: doClaude },
  {
    name: 'fontesativas',
    aliases: ['sourceson'],
    category: 'utilidades',
    description: 'Fontes ativas',
    async handler(ctx) {
      return ctx.reply(
        '✅ *Fontes ativas (sem API)*\n' +
        '🌐 Wikipedia, DuckDuckGo, MDN, npm, arXiv\n' +
        '🖼️ Openverse, Wikimedia\n' +
        '🎬 Openverse Video\n' +
        '🤖 bia / ia (Groq)\n\n' +
        '🔑 *Com API (Parte 3)*\n' +
        '🖼️ Pexels, Unsplash\n' +
        '🤖 Claude'
      );
    }
  },
  {
    name: 'catalogocompleto',
    aliases: ['todasfontes'],
    category: 'utilidades',
    description: 'Catalogo reduzido',
    async handler(ctx) {
      function n(f) { try { return require(f).length; } catch (e) { return 0; } }
      const a = n('./pesquisaFontesP1.js');
      const b = n('./pesquisaFontesP2.js');
      const c = n('./pesquisaFontesP3.js');
      const d = n('./pesquisaFontesP4.js');
      return ctx.reply('📚 P1 ' + a + ' | P2 ' + b + ' | P3 ' + c + ' | P4 ' + d + '\nTotal: ' + (a + b + c + d));
    }
  }
];
