/**
 * yt — pesquisa YouTube (API)
 * ytd / yta — download (outro ficheiro)
 */
const https = require('https');


function getYoutubeKeys() {
  const keys = [];
  const multi = (process.env.YOUTUBE_API_KEYS || '').trim();
  if (multi) multi.split(/[,;\s]+/).forEach(function (k) {
    k = String(k || '').trim();
    if (k && keys.indexOf(k) < 0) keys.push(k);
  });
  [process.env.YOUTUBE_API_KEY, process.env.YOUTUBE_API_KEY_2, process.env.YOUTUBE_API_KEY_3, process.env.YT_API_KEY]
    .forEach(function (k) {
      k = String(k || '').trim();
      if (k && keys.indexOf(k) < 0) keys.push(k);
    });
  return keys;
}
function isYtQuotaError(status, raw) {
  if (status === 403 || status === 429) return true;
  return /quota|limit|dailyLimitExceeded|rateLimitExceeded|userRateLimitExceeded/i.test(String(raw || ''));
}

function getKey(){ return getYoutubeKeys()[0]||""; }

function httpGet(url) {
  return new Promise(function (resolve, reject) {
    https.get(url, function (res) {
      let data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function searchYoutube(query, max) {
  const key = getKey();
  if (!key) return { ok: false, error: 'YOUTUBE_API_KEY em falta no .env' };
  const q = encodeURIComponent(query);
  const url =
    'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=' +
    (max || 2) +
    '&q=' + q +
    '&key=' + key;
  const data = await httpGet(url);
  if (data.error) {
    return { ok: false, error: (data.error.message || 'Erro API').slice(0, 120) };
  }
  const items = data.items || [];
  return { ok: true, items: items };
}

module.exports = [
  {
    name: 'yt',
    aliases: ['ytsearch', 'pesquisayt', 'youtube'],
    category: 'utilidades',
    description: 'Pesquisa videos no YouTube (API)',
    handler: async (ctx) => {
      const query = (ctx.args || []).join(' ').trim();
      if (!query) {
        return ctx.reply(
          '╭──〔 🔍 YOUTUBE 〕──╮\n' +
            '> *yt <pesquisa>*\n' +
            '> Ex: yt EP 1 Naruto\n' +
            '❀────────────────❀\n' +
            '> Download: *ytd* (video) · *yta* (audio)'
        );
      }
      try {
        await ctx.reply('🔍 A pesquisar...');
        const res = await searchYoutube(query, 2);
        if (!res.ok) return ctx.reply('❌ ' + res.error);
        if (!res.items.length) return ctx.reply('❌ Nenhum resultado.');

        for (let i = 0; i < res.items.length; i++) {
          const it = res.items[i];
          const id = it.id && it.id.videoId;
          const sn = it.snippet || {};
          const title = sn.title || 'Sem titulo';
          const channel = sn.channelTitle || '';
          const thumb =
            (sn.thumbnails && (sn.thumbnails.medium || sn.thumbnails.default || sn.thumbnails.high));
          const link = id ? ('https://youtu.be/' + id) : '';
          const caption =
            '╭──〔 ▶️ ' + (i + 1) + ' 〕──╮\n' +
            '◈┃ 🎵 ' + title + '\n' +
            '◈┃ 📺 ' + channel + '\n' +
            '◈┃ 🔗 ' + link + '\n' +
            '╰──────────────────╯\n' +
            '> yta ' + link + ' · ytd ' + link;

          if (thumb && thumb.url) {
            await ctx.sock.sendMessage(
              ctx.jid,
              { image: { url: thumb.url }, caption: caption },
              { quoted: ctx.msg }
            );
          } else {
            await ctx.reply(caption);
          }
        }
      } catch (e) {
        await ctx.reply('❌ Erro: ' + String(e.message || e).slice(0, 100));
      }
    }
  }
];
