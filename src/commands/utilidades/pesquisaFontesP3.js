'use strict';
function eng() { try { return require('../../services/search/engine'); } catch (e) { return null; } }
function prov() { try { return require('../../services/search/providers'); } catch (e) { return null; } }

async function doImage(ctx, label) {
  const q = (ctx.args || []).join(' ').trim();
  if (!q) return ctx.reply('Ex: *' + label + ' gato*');
  const e = eng();
  const p = prov();
  try { await ctx.reply('🖼️ A procurar...'); } catch (x) {}
  let r = null;
  try {
    if (label === 'pexels' && p && p.pexelsImage) r = await p.pexelsImage(q);
    if (!r && label === 'unsplash' && p && p.unsplashImage) r = await p.unsplashImage(q);
    if (!r && p && p.openverseImage) r = await p.openverseImage(q);
    if (!r && p && p.wikimediaImage) r = await p.wikimediaImage(q);
    if (!r && e && e.searchImage) r = await e.searchImage(q);
  } catch (err) {}
  if (!r || !r.imageUrl) {
    return ctx.reply('❌ Sem imagem. Se for Pexels/Unsplash, configura a key no .env (Parte 3).');
  }
  const cap = '🖼️ *' + (r.source || label) + '*\n🔎 ' + q + (r.pageUrl ? '\n🔗 ' + r.pageUrl : '');
  try {
    if (typeof ctx.sendImage === 'function') return ctx.sendImage(r.imageUrl, cap);
    if (ctx.sock && ctx.jid) return ctx.sock.sendMessage(ctx.jid, { image: { url: r.imageUrl }, caption: cap });
  } catch (err) {}
  return ctx.reply(cap + '\n' + r.imageUrl);
}

module.exports = [
  { name: 'openverseimg', aliases: [], category: 'utilidades', description: 'Imagem Openverse', handler: (ctx) => doImage(ctx, 'openverse') },
  { name: 'wikimediacommons', aliases: [], category: 'utilidades', description: 'Imagem Wikimedia', handler: (ctx) => doImage(ctx, 'wikimedia') },
  { name: 'nasaimg', aliases: [], category: 'utilidades', description: 'Imagem NASA/Openverse', handler: (ctx) => doImage(ctx, 'openverse') },
  { name: 'pexels', aliases: [], category: 'utilidades', description: 'Imagem Pexels (API)', handler: (ctx) => doImage(ctx, 'pexels') },
  { name: 'unsplash', aliases: [], category: 'utilidades', description: 'Imagem Unsplash (API)', handler: (ctx) => doImage(ctx, 'unsplash') }
];
