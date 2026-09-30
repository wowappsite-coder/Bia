/**
 * Consulta de perfis de jogos (comandos 4 letras)
 * Isolado — nao altera outros comandos.
 *
 * Fontes:
 * mine — Mojang (publico, sem key)
 * free — endpoints community sem key (pode falhar)
 * codm — endpoint nao oficial (pode falhar)
 * clsh — Clash of Clans oficial (precisa COC_API_TOKEN no .env)
 * braw — Brawl Stars oficial (precisa BRAWL_API_TOKEN no .env)
 * fort — Fortnite-API (precisa FORTNITE_API_KEY no .env)
 * rblx — Roblox (publico, sem key)
 * pubg — sem API publica mobile fiavel
 * mlbb — sem API publica de stats fiavel
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');

const RATE = new Map(); // simple rate limit por sender
const RATE_MS = 8000;

function rateOk(sender) {
  const now = Date.now();
  const last = RATE.get(sender) || 0;
  if (now - last < RATE_MS) return false;
  RATE.set(sender, now);
  return true;
}

function requestJson(urlStr, headers) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(urlStr); } catch (e) { return reject(new Error('URL invalida')); }
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'GET',
        headers: Object.assign({
          'User-Agent': 'BeatrizBot/1.0',
          Accept: 'application/json'
        }, headers || {}),
        timeout: 20000
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return requestJson(res.headers.location, headers).then(resolve, reject);
          }
          let data = null;
          try { data = JSON.parse(raw); } catch (_) {}
          resolve({ status: res.statusCode, data, raw });
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function downloadBuf(urlStr) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(urlStr); } catch (e) { return reject(e); }
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.get(
      { hostname: u.hostname, path: u.pathname + u.search, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', Accept: 'image/avif,image/webp,image/*,*/*' }, timeout: 25000 },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadBuf(res.headers.location).then(resolve, reject);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (res.statusCode < 200 || res.statusCode >= 300 || buf.length < 500) {
            return reject(new Error('download fail'));
          }
          resolve(buf);
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function sendProfile(ctx, text, avatarUrl) {
  const sock = ctx.sock || ctx.client || ctx.conn;
  const jid = ctx.chatId || ctx.from || (ctx.msg && ctx.msg.key && ctx.msg.key.remoteJid);
  const urls = Array.isArray(avatarUrl) ? avatarUrl : (avatarUrl ? [avatarUrl] : []);
  for (const url of urls) {
    if (!url) continue;
    let tmp = null;
    try {
      const buf = await downloadBuf(url);
      if (!buf || buf.length < 800) continue;
      // rejeita "imagem" quase vazia
      tmp = path.join(os.tmpdir(), 'beatriz_gp_' + Date.now() + '.png');
      fs.writeFileSync(tmp, buf);
      if (sock && jid) {
        await sock.sendMessage(jid, { image: buf, caption: text }, { quoted: ctx.msg });
        try { fs.unlinkSync(tmp); } catch (_) {}
        return;
      }
    } catch (e) {
      console.error('[gameProfiles] avatar', e.message);
    } finally {
      try { if (tmp && fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) {}
    }
  }
  await ctx.reply(text);
}


function needArg(ctx, usage) {
  const a = (ctx.args || []).join(' ').trim();
  if (!a) {
    ctx.reply(usage);
    return null;
  }
  if (!rateOk(ctx.sender)) {
    ctx.reply('⏳ Aguarde alguns segundos antes de consultar de novo.');
    return null;
  }
  return a;
}

function env(name) {
  return process.env[name] || '';
}

/* ========== MINECRAFT ========== */
async function handleMine(ctx) {
  const name = needArg(ctx, '⛏️ *MINE*\nUso: *mine* <nickname>\nEx: *mine* Notch');
  if (!name) return;
  try {
    await ctx.reply('⏳ A consultar Minecraft...').catch(() => {});
    let r = await requestJson('https://api.mojang.com/users/profiles/minecraft/' + encodeURIComponent(name));
    if (r.status === 404 || !r.data || !r.data.id) {
      r = await requestJson('https://api.minecraftservices.com/minecraft/profile/lookup/name/' + encodeURIComponent(name));
    }
    if (!r.data || !r.data.id) {
      return ctx.reply('❌ Jogador Minecraft nao encontrado: *' + name + '*');
    }
    const uuid = r.data.id;
    const nick = r.data.name || name;
    const uuidDash = uuid.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
    const avatars = [
      'https://mc-heads.net/body/' + uuid + '/right',
      'https://mc-heads.net/player/' + uuid,
      'https://crafatar.com/renders/body/' + uuid + '?overlay=true',
      'https://mc-heads.net/avatar/' + uuid + '/256'
    ];
    const text =
      '⛏️ *MINECRAFT*\n\n' +
      '👤 Nome: *' + nick + '*\n' +
      '🆔 UUID: `' + uuidDash + '`\n' +
      '🔗 Skin: https://mc-heads.net/body/' + uuid;
    await sendProfile(ctx, text, avatars);
  } catch (e) {
    console.error('[mine]', e);
    await ctx.reply('❌ Falha ao consultar Minecraft.');
  }
}

/* ========== FREE FIRE ========== */
async function handleFree(ctx) {
  const raw = needArg(ctx,
    '🔥 *FREE*\n' +
    'Uso:\n' +
    '• *free* <UID>\n' +
    '• *free* <nickname>\n' +
    '• *free* <UID|nick> <regiao>\n\n' +
    'Ex: *free* 1234567890\n' +
    'Ex: *free* NomeDoPlayer\n' +
    'Regioes: sg, ind, br, me, id, th, vn, tw'
  );
  if (!raw) return;

  const regions = ['sg','ind','br','me','id','th','vn','tw','pk','bd','ru','us'];
  const parts = raw.trim().split(/\s+/);
  let query = parts[0];
  let region = 'sg';
  if (parts.length >= 2) {
    const last = parts[parts.length - 1].toLowerCase();
    if (regions.includes(last)) {
      region = last;
      query = parts.slice(0, -1).join(' ');
    } else {
      query = parts.join(' ');
    }
  }

  const onlyDigits = query.replace(/\D/g, '');
  const isUid = /^\d{5,15}$/.test(onlyDigits) && onlyDigits === query.replace(/\s/g, '');
  let uid = isUid ? onlyDigits : null;

  try {
    await ctx.reply('⏳ A consultar Free Fire (' + (isUid ? 'UID' : 'nick') + ')...').catch(() => {});

    let lastErr = '';

    // Pesquisa por nickname
    if (!uid) {
      const searchTries = [
        'https://freefire-api-six.vercel.app/get_search_account_by_keyword?keyword=' + encodeURIComponent(query) + '&server=' + region,
        'https://freefire-api-six.vercel.app/get_search_account_by_keyword?keyword=' + encodeURIComponent(query)
      ];
      for (const url of searchTries) {
        try {
          const r = await requestJson(url);
          if (r.status >= 200 && r.status < 300 && r.data) {
            let list =
              (r.data.data && (Array.isArray(r.data.data) ? r.data.data : (r.data.data.accounts || r.data.data.list))) ||
              r.data.accounts || r.data.result || (Array.isArray(r.data) ? r.data : null);
            if (list && list.length) {
              const qlow = query.toLowerCase();
              const best = list.find(x => String(x.nickname || x.name || '').toLowerCase() === qlow) || list[0];
              uid = String(best.accountId || best.uid || best.id || best.userId || '');
              if (uid) break;
            }
            if (!uid && (r.data.accountId || r.data.uid)) {
              uid = String(r.data.accountId || r.data.uid);
              break;
            }
          }
          lastErr = 'search HTTP ' + r.status;
        } catch (e) {
          lastErr = e.message;
        }
      }
      if (!uid) {
        return ctx.reply(
          '❌ Nao encontrei o nickname *' + query + '* no Free Fire.\n' +
          'Tenta com o *UID* (mais fiavel).\nEx: *free* 1234567890'
        );
      }
    }

    // Perfil por UID
    let data = null;
    const tries = [
      'https://freefire-api-six.vercel.app/get_player_personal_show?server=' + region + '&uid=' + uid,
      'https://glob-info2.vercel.app/info?uid=' + uid,
      'https://freefire-api-six.vercel.app/get_player_stats?server=' + region + '&uid=' + uid
    ];
    for (const url of tries) {
      try {
        const r = await requestJson(url);
        if (r.status >= 200 && r.status < 300 && r.data) {
          data = r.data;
          break;
        }
        lastErr = 'HTTP ' + r.status;
      } catch (e) {
        lastErr = e.message;
      }
    }

    if (!data) {
      return ctx.reply(
        '❌ UID *' + uid + '* — perfil nao carregou.\n' +
        'Fontes publicas sem key podem estar offline.\n' +
        (lastErr ? '(' + lastErr + ')' : '')
      );
    }

    const basic = data.basicInfo || data.result || data;
    const nick = basic.nickname || basic.name || query;
    const level = basic.level != null ? basic.level : '?';
    const likes = basic.liked != null ? basic.liked : (basic.likes != null ? basic.likes : '?');
    const rank = basic.rank != null ? basic.rank : '?';
    const regionOut = basic.region || region;
    const clan = (data.clanBasicInfo && data.clanBasicInfo.clanName) || '';
    const accountId = basic.accountId || uid;

    // PRIME / membership
    let prime = 'Nao';
    try {
      const hasPrime =
        basic.hasPrime || basic.isPrime || basic.prime ||
        basic.primeType || basic.membershipState ||
        (data.primeInfo && (data.primeInfo.hasPrime || data.primeInfo.isPrime)) ||
        (data.profileInfo && data.profileInfo.prime) ||
        basic.monthlyCard || basic.monthlyCardEndTime;
      if (hasPrime === true || hasPrime === 1 || hasPrime === '1') prime = 'Sim';
      else if (typeof hasPrime === 'number' && hasPrime > 0) prime = 'Sim';
      else if (typeof hasPrime === 'string' && hasPrime && hasPrime !== '0') prime = 'Sim';
      // timestamp de cartao mensal
      if (prime === 'Nao' && basic.monthlyCardEndTime) {
        const end = Number(basic.monthlyCardEndTime) * (String(basic.monthlyCardEndTime).length < 12 ? 1000 : 1);
        if (end > Date.now()) prime = 'Sim';
      }
    } catch (_) {}

    const text =
      '🔥 *FREE FIRE*\n\n' +
      '👤 Nome: *' + nick + '*\n' +
      '🆔 UID: `' + accountId + '`\n' +
      '⭐ Nivel: *' + level + '*\n' +
      '🏆 Rank: *' + rank + '*\n' +
      '❤️ Likes: *' + likes + '*\n' +
      '👑 Prime: *' + prime + '*\n' +
      '🌍 Regiao: *' + regionOut + '*' +
      (clan ? '\n🛡️ Clan: *' + clan + '*' : '');

    await ctx.reply(text);
  } catch (e) {
    console.error('[free]', e);
    await ctx.reply('❌ Falha ao consultar Free Fire.');
  }
}

async function handleCodm(ctx) {
  const q = needArg(ctx, '🎯 *CODM*\nUso: *codm* <nickname ou UID>\nEx: *codm* ShadowHex');
  if (!q) return;
  try {
    await ctx.reply('⏳ A consultar CODM...').catch(() => {});
    const r = await requestJson('https://callofdutymobile.vercel.app/user/' + encodeURIComponent(q));
    if (!r.data || r.data.success === false || !r.data.data) {
      return ctx.reply(
        '❌ Jogador CODM nao encontrado ou API offline.\n' +
        'Fonte nao oficial pode estar indisponivel.'
      );
    }
    const d = r.data.data;
    const text =
      '🎯 *CALL OF DUTY MOBILE*\n\n' +
      '👤 Nick: *' + (d.nickname || q) + '*\n' +
      '🆔 ID: `' + (d.shortId || '?') + '`\n' +
      '⭐ Nivel: *' + (d.level != null ? d.level : '?') + '*\n' +
      '🏆 Rank MP: *' + (d.customReadableMpRank || '?') + '*\n' +
      '📊 Rating: *' + (d.rating != null ? d.rating : '?') + '*\n' +
      '🌍 Pais: *' + (d.country || '?') + '*';
    const codmAvatars = [d.picUrl, d.customLevelImageUrl, d.customMpRankImageUrl].filter(Boolean);
    await sendProfile(ctx, text, codmAvatars);
  } catch (e) {
    console.error('[codm]', e);
    await ctx.reply('❌ Falha ao consultar CODM (fonte nao oficial).');
  }
}

/* ========== CLASH OF CLANS ========== */
async function handleClsh(ctx) {
  const tag = needArg(ctx, '🏰 *CLSH*\nUso: *clsh* <player tag>\nEx: *clsh* #2PP\n\nRequer *COC_API_TOKEN* no .env\nhttps://developer.clashofclans.com/');
  if (!tag) return;
  const token = env('COC_API_TOKEN');
  if (!token) {
    return ctx.reply(
      '⚠️ Clash of Clans precisa de token oficial.\n' +
      '1. Cria em https://developer.clashofclans.com/\n' +
      '2. No Termux: echo \'COC_API_TOKEN=seu_token\' >> .env\n' +
      '3. Reinicia o bot'
    );
  }
  try {
    await ctx.reply('⏳ A consultar Clash of Clans...').catch(() => {});
    let t = tag.trim().toUpperCase();
    if (!t.startsWith('#')) t = '#' + t;
    const r = await requestJson(
      'https://api.clashofclans.com/v1/players/' + encodeURIComponent(t),
      { Authorization: 'Bearer ' + token }
    );
    if (r.status === 404) return ctx.reply('❌ Jogador CoC nao encontrado.');
    if (r.status === 403) return ctx.reply('❌ Token CoC invalido ou IP nao autorizado.');
    if (!r.data || !r.data.name) return ctx.reply('❌ Resposta invalida da API CoC.');
    const p = r.data;
    const text =
      '🏰 *CLASH OF CLANS*\n\n' +
      '👤 Nome: *' + p.name + '*\n' +
      '🏷️ Tag: `' + p.tag + '`\n' +
      '⭐ Nivel: *' + p.expLevel + '*\n' +
      '🏆 Trofeus: *' + p.trophies + '* (best ' + p.bestTrophies + ')\n' +
      '🏠 CV: *' + p.townHallLevel + '*\n' +
      '⚔️ War stars: *' + (p.warStars || 0) + '*' +
      (p.clan ? '\n🛡️ Clan: *' + p.clan.name + '* (' + p.clan.tag + ')' : '');
    await ctx.reply(text);
  } catch (e) {
    console.error('[clsh]', e);
    await ctx.reply('❌ Falha ao consultar Clash of Clans.');
  }
}

/* ========== BRAWL STARS ========== */
async function handleBraw(ctx) {
  const tag = needArg(ctx, '⭐ *BRAW*\nUso: *braw* <player tag>\nEx: *braw* #2PP\n\nRequer *BRAWL_API_TOKEN* no .env\nhttps://developer.brawlstars.com/');
  if (!tag) return;
  const token = env('BRAWL_API_TOKEN');
  if (!token) {
    return ctx.reply(
      '⚠️ Brawl Stars precisa de token oficial.\n' +
      '1. https://developer.brawlstars.com/\n' +
      '2. echo \'BRAWL_API_TOKEN=seu_token\' >> .env\n' +
      '3. Reinicia o bot'
    );
  }
  try {
    await ctx.reply('⏳ A consultar Brawl Stars...').catch(() => {});
    let t = tag.trim().toUpperCase();
    if (!t.startsWith('#')) t = '#' + t;
    const r = await requestJson(
      'https://api.brawlstars.com/v1/players/' + encodeURIComponent(t),
      { Authorization: 'Bearer ' + token }
    );
    if (r.status === 404) return ctx.reply('❌ Jogador Brawl Stars nao encontrado.');
    if (r.status === 403) return ctx.reply('❌ Token Brawl invalido.');
    if (!r.data || !r.data.name) return ctx.reply('❌ Resposta invalida.');
    const p = r.data;
    const text =
      '⭐ *BRAWL STARS*\n\n' +
      '👤 Nome: *' + p.name + '*\n' +
      '🏷️ Tag: `' + p.tag + '`\n' +
      '🏆 Trofeus: *' + p.trophies + '* (best ' + p.highestTrophies + ')\n' +
      '📊 Nivel: *' + p.expLevel + '*\n' +
      '🎯 3v3 wins: *' + (p['3vs3Victories'] || 0) + '*\n' +
      'solo: *' + (p.soloVictories || 0) + '* | duo: *' + (p.duoVictories || 0) + '*' +
      (p.club ? '\n🛡️ Club: *' + p.club.name + '*' : '');
    await ctx.reply(text);
  } catch (e) {
    console.error('[braw]', e);
    await ctx.reply('❌ Falha ao consultar Brawl Stars.');
  }
}

/* ========== FORTNITE ========== */
async function handleFort(ctx) {
  const name = needArg(ctx,
    '🪂 *FORT*\n' +
    'Uso: *fort* <epic name>\n' +
    'Ex: *fort* Ninja\n\n' +
    'Requer *FORTNITE_API_KEY* (gratis):\n' +
    'https://dash.fortnite-api.com/'
  );
  if (!name) return;
  const key = env('FORTNITE_API_KEY');
  if (!key) {
    return ctx.reply(
      '⚠️ Fortnite precisa de key gratuita.\n' +
      '1. Entra em https://dash.fortnite-api.com/\n' +
      '2. Cria a key\n' +
      '3. No Termux:\n' +
      "echo 'FORTNITE_API_KEY=sua_key' >> $HOME/beatriz-bot/.env\n" +
      '4. Reinicia o bot (*npm start*)'
    );
  }
  try {
    await ctx.reply('⏳ A consultar Fortnite...').catch(() => {});
    // image=all gera card visual do perfil/stats
    const url =
      'https://fortnite-api.com/v2/stats/br/v2?name=' +
      encodeURIComponent(name) +
      '&image=all';
    const r = await requestJson(url, { Authorization: key });

    if (r.status === 404) {
      return ctx.reply('❌ Conta Fortnite nao encontrada (ou stats privadas).');
    }
    if (r.status === 401 || r.status === 403) {
      return ctx.reply('❌ FORTNITE_API_KEY invalida.');
    }
    if (!r.data || !r.data.data) {
      return ctx.reply('❌ Resposta invalida da API Fortnite.');
    }

    const d = r.data.data;
    const overall = (d.stats && d.stats.all && d.stats.all.overall) || {};
    const accName = (d.account && d.account.name) ? d.account.name : name;
    const accId = (d.account && d.account.id) ? d.account.id : '?';

    const text =
      '🪂 *FORTNITE*\n\n' +
      '👤 Nome: *' + accName + '*\n' +
      '🆔 ID: `' + accId + '`\n' +
      '🏆 Wins: *' + (overall.wins != null ? overall.wins : '?') + '*\n' +
      '💀 Kills: *' + (overall.kills != null ? overall.kills : '?') + '*\n' +
      '📊 KD: *' + (overall.kd != null ? overall.kd : '?') + '*\n' +
      '🎮 Matches: *' + (overall.matches != null ? overall.matches : '?') + '*\n' +
      '⏱️ Tempo: *' + (overall.minutesPlayed != null ? overall.minutesPlayed + ' min' : '?') + '*';

    // Imagem gerada pela API (card completo do perfil)
    const imageUrl = d.image || (r.data.data && r.data.data.image) || null;
    if (imageUrl) {
      await sendProfile(ctx, text, imageUrl);
    } else {
      await ctx.reply(text);
    }
  } catch (e) {
    console.error('[fort]', e);
    await ctx.reply('❌ Falha ao consultar Fortnite.');
  }
}

async function handlePubg(ctx) {
  const q = needArg(ctx, '🪖 *PUBG*\nUso: *pubg* <id/nick>');
  if (!q) return;
  await ctx.reply(
    '❌ *PUBG Mobile*\n\n' +
    'Nao existe API publica oficial fiavel para PUBG Mobile.\n' +
    'A API oficial da PUBG e so PC/console.\n' +
    'Nao invento dados. Integracao nao ativada.'
  );
}

async function handleMlbb(ctx) {
  const q = needArg(ctx, '⚔️ *MLBB*\nUso: *mlbb* <id> <zone>\nEx: *mlbb* 1234567 2001');
  if (!q) return;
  await ctx.reply(
    '❌ *Mobile Legends*\n\n' +
    'Nao ha API publica estavel de perfil/stats sem key privada.\n' +
    'Nao invento dados. Integracao completa nao ativada.'
  );
}


/* ========== ROBLOX ========== */
async function handleRblx(ctx) {
  const q = needArg(ctx, '🧱 *RBLX*\nUso: *rblx* <username>\nEx: *rblx* Roblox');
  if (!q) return;
  const username = q.split(/\s+/)[0].replace(/[^a-zA-Z0-9_]/g, '');
  if (!username) return ctx.reply('❌ Username invalido.');
  try {
    await ctx.reply('⏳ A consultar Roblox...').catch(() => {});

    const body = JSON.stringify({ usernames: [username], excludeBannedUsers: false });
    const lookup = await new Promise((resolve, reject) => {
      const u = new URL('https://users.roblox.com/v1/usernames/users');
      const req = https.request(
        {
          hostname: u.hostname,
          path: u.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            'User-Agent': 'Mozilla/5.0 BeatrizBot/1.0',
            Accept: 'application/json'
          },
          timeout: 20000
        },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            let data = null;
            try { data = JSON.parse(raw); } catch (_) {}
            resolve({ status: res.statusCode, data });
          });
        }
      );
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      req.write(body);
      req.end();
    });

    const entry = lookup.data && lookup.data.data && lookup.data.data[0];
    if (!entry || !entry.id) {
      return ctx.reply('❌ Usuario Roblox nao encontrado: *' + username + '*');
    }
    const userId = entry.id;
    const name = entry.name || username;
    const display = entry.displayName || name;

    let desc = '';
    let created = '';
    try {
      const det = await requestJson('https://users.roblox.com/v1/users/' + userId);
      if (det.data) {
        desc = (det.data.description || '').trim().slice(0, 120);
        created = det.data.created ? String(det.data.created).slice(0, 10) : '';
      }
    } catch (_) {}

    // Avatar CORPO COMPLETO (skin inteira) — varios fallbacks
    let avatarUrl = null;
    const avatarTries = [
      'https://thumbnails.roblox.com/v1/users/avatar?userIds=' + userId + '&size=720x720&format=Png&isCircular=false',
      'https://thumbnails.roblox.com/v1/users/avatar?userIds=' + userId + '&size=420x420&format=Png&isCircular=false',
      'https://www.roblox.com/avatar-thumbnail/image?userId=' + userId + '&width=720&height=720&format=png',
      'https://thumbnails.roblox.com/v1/users/avatar-bust?userIds=' + userId + '&size=420x420&format=Png&isCircular=false'
    ];

    for (const apiUrl of avatarTries) {
      try {
        if (apiUrl.includes('thumbnails.roblox.com')) {
          const th = await requestJson(apiUrl);
          const img = th.data && th.data.data && th.data.data[0] && th.data.data[0].imageUrl;
          if (img && /^https?:\/\//i.test(img) && !img.includes('error')) {
            avatarUrl = img;
            break;
          }
        } else {
          // URL direta de imagem
          avatarUrl = apiUrl;
          break;
        }
      } catch (_) {}
    }

    const text =
      '🧱 *ROBLOX*\n\n' +
      '👤 Nome: *' + name + '*\n' +
      '✨ Display: *' + display + '*\n' +
      '🆔 ID: `' + userId + '`' +
      (created ? '\n📅 Criado: *' + created + '*' : '') +
      (desc ? '\n📝 ' + desc : '') +
      '\n🔗 https://www.roblox.com/users/' + userId + '/profile';

    // tenta enviar com avatar; se falhar, so texto
    if (avatarUrl) {
      try {
        await sendProfile(ctx, text, avatarUrl);
        return;
      } catch (e) {
        console.error('[rblx] avatar send', e.message);
      }
    }
    await ctx.reply(text);
  } catch (e) {
    console.error('[rblx]', e);
    await ctx.reply('❌ Falha ao consultar Roblox.');
  }
}

module.exports = [
  { name: 'free', aliases: [], category: 'utilidades', description: 'Free Fire UID', handler: handleFree },
  { name: 'pubg', aliases: [], category: 'utilidades', description: 'PUBG Mobile (indisponivel)', handler: handlePubg },
  { name: 'codm', aliases: [], category: 'utilidades', description: 'CODM nick/UID', handler: handleCodm },
  { name: 'mlbb', aliases: [], category: 'utilidades', description: 'MLBB (indisponivel)', handler: handleMlbb },
  { name: 'clsh', aliases: [], category: 'utilidades', description: 'Clash of Clans tag', handler: handleClsh },
  { name: 'braw', aliases: [], category: 'utilidades', description: 'Brawl Stars tag', handler: handleBraw },
  { name: 'fort', aliases: [], category: 'utilidades', description: 'Fortnite name', handler: handleFort },
  { name: 'mine', aliases: [], category: 'utilidades', description: 'Minecraft nick', handler: handleMine }
,
  { name: 'rblx', aliases: ['roblox', 'blox'], category: 'utilidades', description: 'Roblox username', handler: handleRblx }
];
