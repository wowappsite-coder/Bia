/**
 * pack <nome|id|link> — busca pack no Sticker.ly e envia figurinhas
 * API publica nao oficial (api.sticker.ly) — sem API Key
 * Isolado: nao altera outros comandos.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');

const UA = 'androidapp.stickerly/3.2.0 (Linux; U; Android 13; pt-BR)';
const MAX_SEND = 15; // evita flood no grupo

function requestJson(urlStr, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'GET',
        headers: Object.assign({ 'User-Agent': UA, Accept: 'application/json' }, headers || {}),
        timeout: 60000
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return requestJson(res.headers.location, headers).then(resolve, reject);
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error('HTTP ' + res.statusCode + ': ' + raw.slice(0, 120)));
          }
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error('JSON invalido da API Sticker.ly'));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout Sticker.ly'));
    });
    req.end();
  });
}

function downloadBuffer(urlStr) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.get(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: { 'User-Agent': UA },
        timeout: 60000
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadBuffer(res.headers.location).then(resolve, reject);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (res.statusCode < 200 || res.statusCode >= 300 || !buf.length) {
            return reject(new Error('Download falhou HTTP ' + res.statusCode));
          }
          resolve(buf);
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout download'));
    });
  });
}

function extractPackId(input) {
  if (!input) return null;
  const s = String(input).trim();
  // https://sticker.ly/s/XXXXX
  let m = s.match(/sticker\.ly\/s\/([A-Za-z0-9]+)/i);
  if (m) return m[1].toUpperCase();
  // ID tipico Sticker.ly: mistura letras+numeros (ex BE9H2K), nao palavras tipo "Naruto"
  if (/^[A-Za-z0-9]{5,12}$/.test(s) && /[0-9]/.test(s) && /[A-Za-z]/.test(s)) {
    return s.toUpperCase();
  }
  return null;
}

async function fetchPackById(packId) {
  const url = 'https://api.sticker.ly/v3.1/stickerPack/' + encodeURIComponent(packId);
  const data = await requestJson(url, { Host: 'api.sticker.ly' });
  if (data && data.error) throw new Error(data.message || 'Pack nao encontrado');
  const result = data.result || data;
  if (!result || !result.stickers) throw new Error('Pack invalido ou API mudou');
  return result;
}

async function searchPacks(query) {
  // Tentativas de endpoints de pesquisa (podem mudar)
  const q = encodeURIComponent(query);
  const tries = [
    'https://api.sticker.ly/v3.1/search/stickerPack?keyword=' + q + '&size=10',
    'https://api.sticker.ly/v3.1/stickerPack/search?keyword=' + q + '&size=10',
    'https://api.sticker.ly/v3.1/search?keyword=' + q + '&type=pack&size=10',
    'https://api.sticker.ly/v3.1/stickerPack?keyword=' + q
  ];
  for (const url of tries) {
    try {
      const data = await requestJson(url, { Host: 'api.sticker.ly' });
      const list =
        (data.result && (data.result.stickerPacks || data.result.packs || data.result.list)) ||
        data.stickerPacks ||
        data.packs ||
        data.results ||
        (Array.isArray(data.result) ? data.result : null) ||
        (Array.isArray(data) ? data : null);
      if (list && list.length) return list;
    } catch (_) {
      // tenta proximo
    }
  }
  return [];
}

function stickerUrls(pack) {
  const prefix = pack.resourceUrlPrefix || pack.resource_url_prefix || '';
  const stickers = pack.stickers || [];
  const out = [];
  for (const s of stickers) {
    const file = s.fileName || s.filename || s.file || s.url;
    if (!file) continue;
    if (/^https?:\/\//i.test(file)) out.push(file);
    else if (prefix) out.push(prefix.replace(/\/?$/, '/') + file.replace(/^\//, ''));
  }
  return out;
}

async function sendAsSticker(ctx, buf) {
  const sock = ctx.sock || ctx.client || ctx.conn;
  const jid = ctx.chatId || ctx.from || (ctx.msg && ctx.msg.key && ctx.msg.key.remoteJid);
  if (!sock || !jid) throw new Error('Sem conexao WhatsApp');

  // preferir sticker nativo
  try {
    await sock.sendMessage(jid, { sticker: buf }, { quoted: ctx.msg });
    return;
  } catch (_) {}

  // fallback imagem
  try {
    await sock.sendMessage(jid, { image: buf, caption: '' }, { quoted: ctx.msg });
    return;
  } catch (e) {
    throw e;
  }
}

module.exports = [
  {
    name: 'pack',
    aliases: ['stickerly', 'stickerpack', 'lypack'],
    category: 'stickers',
    description: 'Baixa pack do Sticker.ly e envia figurinhas',
    usage: 'pack <nome|id|link sticker.ly>',
    handler: async (ctx) => {
      const arg = (ctx.args || []).join(' ').trim();
      if (!arg) {
        return ctx.reply(
          '📦 *PACK Sticker.ly*\n\n' +
            'Uso:\n' +
            '• *pack* <id>\n' +
            '• *pack* https://sticker.ly/s/XXXX\n' +
            '• *pack* <nome> (pesquisa, se a API permitir)\n\n' +
            'Ex: *pack BE9H2K*\n' +
            'Ex: *pack* https://sticker.ly/s/BE9H2K'
        );
      }

      try {
        await ctx.reply('⏳ A procurar pack no Sticker.ly...').catch(() => {});

        let packId = extractPackId(arg);
        let pack = null;

        if (packId) {
          pack = await fetchPackById(packId);
        } else {
          const results = await searchPacks(arg);
          if (!results.length) {
            return ctx.reply(
              '❌ Nao encontrei packs com esse nome.\n\n' +
                'A pesquisa do Sticker.ly pode estar limitada.\n' +
                'Usa o *ID* ou o *link* do pack:\n' +
                'https://sticker.ly/s/XXXXXX\n\n' +
                'Ex: *pack BE9H2K*'
            );
          }
          // se varios, lista os primeiros
          if (results.length > 1 && !extractPackId(arg)) {
            const lines = results.slice(0, 8).map((p, i) => {
              const id = p.packId || p.id || p.sid || '?';
              const name = p.name || p.title || 'Pack';
              return (i + 1) + '. *' + name + '* — `' + id + '`';
            });
            return ctx.reply(
              '📦 *Resultados Sticker.ly*\n\n' +
                lines.join('\n') +
                '\n\nUsa: *pack <id>* para baixar.'
            );
          }
          const first = results[0];
          packId = first.packId || first.id || first.sid;
          if (!packId) {
            return ctx.reply('❌ Resultado sem ID de pack. Tenta com o link sticker.ly/s/...');
          }
          pack = await fetchPackById(String(packId));
        }

        const urls = stickerUrls(pack);
        if (!urls.length) {
          return ctx.reply('❌ Pack sem stickers ou formato da API mudou.');
        }

        const name = pack.name || pack.title || packId || 'Pack';
        const author = pack.authorName || pack.author || '';
        const total = urls.length;
        const toSend = urls.slice(0, MAX_SEND);

        await ctx.reply(
          '✅ *' + name + '*\n' +
            (author ? '👤 ' + author + '\n' : '') +
            '🎴 ' + total + ' stickers\n' +
            'Enviando ' + toSend.length + (total > MAX_SEND ? ' (limite anti-spam)' : '') + '...'
        );

        let ok = 0;
        for (const u of toSend) {
          try {
            const buf = await downloadBuffer(u);
            await sendAsSticker(ctx, buf);
            ok++;
          } catch (e) {
            console.error('[pack] sticker fail', e.message);
          }
        }

        if (!ok) {
          return ctx.reply(
            '❌ Nao consegui enviar as figurinhas.\n' +
              'A API/CDN do Sticker.ly pode ter mudado ou bloqueado o acesso.'
          );
        }

        if (total > MAX_SEND) {
          await ctx.reply('ℹ️ Enviadas ' + ok + '/' + total + '. Limite de ' + MAX_SEND + ' por vez.');
        }
      } catch (e) {
        console.error('[pack]', e);
        await ctx.reply(
          '❌ Falha ao obter pack do Sticker.ly.\n' +
            (e && e.message ? e.message.slice(0, 200) : 'Erro desconhecido') +
            '\n\nTenta com o link: https://sticker.ly/s/ID'
        );
      }
    }
  }
];
