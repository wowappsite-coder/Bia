/**
 * Menu Hentai — isolado
 * Fonte: https://animeshentai.biz
 * Acesso: ADM/Owner por padrao | mhadm off = geral
 * 18+ apenas — conteudo adulto
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const BASE = 'https://animeshentai.biz';
const SESSION_DIR = path.join(process.cwd(), 'data', 'hentai-sessions');
const FLAG_FILE = path.join(process.cwd(), 'data', 'hentai-mhadm.json');

try { fs.mkdirSync(SESSION_DIR, { recursive: true }); } catch (_) {}

function loadFlags() {
  try {
    if (fs.existsSync(FLAG_FILE)) return JSON.parse(fs.readFileSync(FLAG_FILE, 'utf8'));
  } catch (_) {}
  return {}; // groupJid -> true = so ADM (default true se ausente)
}

function saveFlags(o) {
  try {
    fs.mkdirSync(path.dirname(FLAG_FILE), { recursive: true });
    fs.writeFileSync(FLAG_FILE, JSON.stringify(o));
  } catch (_) {}
}

/** true = so ADM/Owner | false = geral */
function isAdmOnly(groupJid) {
  if (!groupJid || !String(groupJid).endsWith('@g.us')) return true; // PV: so owner trata no check
  const f = loadFlags();
  if (Object.prototype.hasOwnProperty.call(f, groupJid)) return !!f[groupJid];
  return true; // default: so ADM
}

function setAdmOnly(groupJid, on) {
  const f = loadFlags();
  f[groupJid] = !!on;
  saveFlags(f);
}

async function canUseHentai(ctx) {
  try {
    if (typeof ctx.isOwner === 'function' && ctx.isOwner()) return true;
  } catch (_) {}
  const jid = ctx.jid || '';
  const admOnly = isAdmOnly(jid);
  if (!admOnly) return true;
  try {
    if (typeof ctx.isGroupAdmin === 'function' && (await ctx.isGroupAdmin())) return true;
  } catch (_) {}
  try {
    if (typeof ctx.isBotAdmin === 'function' && ctx.isBotAdmin()) return true;
  } catch (_) {}
  return false;
}

function box(lines) {
  const L = Array.isArray(lines) ? lines : [String(lines)];
  return (
    '╭──〔 🔥 𝐌𝐄𝐍𝐔 𝐇𝐄𝐍𝐓𝐀𝐈 〕──╮\n' +
    '│\n' +
    L.map(function (l) { return '│  ' + l; }).join('\n') +
    '\n│\n' +
    '╰──〔 𝟏𝟖+ 〕──╯'
  );
}

function sessKey(ctx) {
  const who = String(ctx.sender || '').replace(/\D/g, '').slice(-12);
  const jid = String(ctx.jid || 'pv');
  return path.join(SESSION_DIR, jid.replace(/[^a-zA-Z0-9._-]/g, '_') + '_' + who + '.json');
}

function loadSession(ctx) {
  try {
    const f = sessKey(ctx);
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (_) {}
  return null;
}

function saveSession(ctx, data) {
  try {
    fs.writeFileSync(sessKey(ctx), JSON.stringify(data));
  } catch (_) {}
}

function httpGet(urlStr, maxRedirects) {
  maxRedirects = maxRedirects == null ? 5 : maxRedirects;
  return new Promise(function (resolve, reject) {
    let u;
    try { u = new URL(urlStr); } catch (e) { return reject(e); }
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.get(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        protocol: u.protocol,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-BR,pt;q=0.9'
        },
        timeout: 20000
      },
      function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (maxRedirects <= 0) return reject(new Error('muitos redirects'));
          let next = res.headers.location;
          if (next.indexOf('http') !== 0) {
            next = u.protocol + '//' + u.hostname + (next.charAt(0) === '/' ? next : '/' + next);
          }
          res.resume();
          return resolve(httpGet(next, maxRedirects - 1));
        }
        const chunks = [];
        res.on('data', function (c) { chunks.push(c); });
        res.on('end', function () {
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8'), url: urlStr });
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', function () {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

function decodeHtml(t) {
  return String(t || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(parseInt(n, 10)); })
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSearch(html) {
  const results = [];
  const seen = {};
  // links /hentai/slug/
  const re = /href="(https?:\/\/animeshentai\.biz\/hentai\/[a-z0-9\-]+\/)"[^>]*>([^<]{2,120})</gi;
  let m;
  while ((m = re.exec(html))) {
    const url = m[1];
    const title = decodeHtml(m[2]);
    if (!title || seen[url]) continue;
    if (/^hentais?\( /i.test(title) || /^all \)/i.test(title)) continue;
    seen[url] = true;
    results.push({ title: title, url: url });
  }
  // fallback unquoted
  const re2 = /href=(https?:\/\/animeshentai\.biz\/hentai\/[a-z0-9\-]+\/)/gi;
  while ((m = re2.exec(html))) {
    const url = m[1];
    if (seen[url]) continue;
    const slug = url.split('/hentai/')[1].replace(/\//g, '');
    const title = slug.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    seen[url] = true;
    results.push({ title: title, url: url });
  }
  return results.slice(0, 12);
}

function parseEpisodes(html, baseUrl) {
  const eps = [];
  const seen = {};
  // padroes comuns de episodio
  const re = /href="(https?:\/\/animeshentai\.biz\/[^"]+)"[^>]*>([^<]*(?:[Ee]pis[oó]dio|EP\.?\s*\d+)[^<]*)</gi;
  let m;
  while ((m = re.exec(html))) {
    const url = m[1];
    const title = decodeHtml(m[2]);
    if (seen[url]) continue;
    seen[url] = true;
    eps.push({ title: title, url: url });
  }
  // /video/ ou /episodio/
  const re2 = /href="(https?:\/\/animeshentai\.biz\/(?:video|episodio|ep)[^"]+)"/gi;
  while ((m = re2.exec(html))) {
    const url = m[1];
    if (seen[url]) continue;
    seen[url] = true;
    eps.push({ title: 'EP ' + (eps.length + 1), url: url });
  }
  if (!eps.length) {
    // devolver pagina do titulo como unico "assistir"
    eps.push({ title: 'Abrir pagina', url: baseUrl });
  }
  return eps.slice(0, 40);
}

async function searchHentai(query) {
  const q = encodeURIComponent(String(query || '').trim());
  if (!q) return [];
  const url = BASE + '/search/' + q;
  const res = await httpGet(url);
  if (!res.body) return [];
  return parseSearch(res.body);
}

function menuText(p) {
  p = p || '!';
  return box([
    '⚠️ *Conteudo 18+*',
    '',
    '*' + p + 'hentai* <nome> — pesquisar',
    '*' + p + 'h1* … *h8* — escolher resultado',
    '*' + p + 'hep* — ver episodios do selecionado',
    '',
    '*' + p + 'mhadm on* — so ADM/Owner',
    '*' + p + 'mhadm off* — liberar para o grupo',
    '',
    '_Fonte: animeshentai.biz_',
    '_Modulo isolado — nao mistura com anime normal_'
  ]);
}

async function requireAccess(ctx) {
  const ok = await canUseHentai(ctx);
  if (!ok) {
    await ctx.reply(
      box([
        '🔒 *Menu Hentai restrito*',
        'So *ADM* e *Owner* podem usar.',
        '',
        'Owner/ADM: *mhadm off* para liberar o grupo.'
      ])
    );
    return false;
  }
  return true;
}

module.exports = [
  {
    name: 'menuhentai',
    aliases: ['menuh', 'menuhent', 'hmenu', 'menu-hentai'],
    category: 'admin',
    description: 'Menu Hentai 18+',
    groupOnly: false,
    handler: async function (ctx) {
      if (!(await requireAccess(ctx))) return;
      const p = (ctx.prefix != null && String(ctx.prefix).length) ? String(ctx.prefix) : '!';
      return ctx.reply(menuText(p));
    }
  },
  {
    name: 'mhadm',
    aliases: ['menuhentaiadm', 'hentaiadm'],
    category: 'admin',
    description: 'Liga/desliga restricao ADM do Menu Hentai',
    groupOnly: true,
    handler: async function (ctx) {
      // so owner ou adm do grupo
      let allowed = false;
      try { if (typeof ctx.isOwner === 'function' && ctx.isOwner()) allowed = true; } catch (_) {}
      try { if (!allowed && typeof ctx.isGroupAdmin === 'function' && (await ctx.isGroupAdmin())) allowed = true; } catch (_) {}
      if (!allowed) return ctx.reply('❌ So ADM/Owner.');

      const arg = String((ctx.args && ctx.args[0]) || '').toLowerCase();
      const jid = ctx.jid;
      if (arg === 'on' || arg === '1' || arg === 'sim') {
        setAdmOnly(jid, true);
        return ctx.reply(box(['🔒 *mhadm ON*', 'Menu Hentai so para *ADM* e *Owner*.']));
      }
      if (arg === 'off' || arg === '0' || arg === 'nao' || arg === 'não') {
        setAdmOnly(jid, false);
        return ctx.reply(box(['🔓 *mhadm OFF*', 'Menu Hentai liberado para *todo o grupo*.']));
      }
      const cur = isAdmOnly(jid);
      return ctx.reply(
        box([
          'Estado atual: *' + (cur ? 'ON (so ADM)' : 'OFF (geral)') + '*',
          '',
          '*mhadm on* — so ADM/Owner',
          '*mhadm off* — geral'
        ])
      );
    }
  },
  {
    name: 'hentai',
    aliases: ['hsearch', 'pesquisahentai'],
    category: 'admin',
    description: 'Pesquisar hentai 18+',
    handler: async function (ctx) {
      if (!(await requireAccess(ctx))) return;
      const q = (ctx.args || []).join(' ').trim();
      if (!q) {
        return ctx.reply(box(['Uso: *hentai <nome>*', 'Ex: *hentai princess burst*']));
      }
      try {
        await ctx.reply(box(['🔎 A pesquisar...', q]));
      } catch (_) {}
      let results = [];
      try {
        results = await searchHentai(q);
      } catch (e) {
        return ctx.reply(box(['❌ Falha na pesquisa.', String(e.message || e).slice(0, 120)]));
      }
      if (!results.length) {
        return ctx.reply(box(['❌ Nenhum resultado para:', '"' + q + '"']));
      }
      const show = results.slice(0, 8);
      saveSession(ctx, { query: q, results: show, selected: null, step: 'choose', at: Date.now() });
      const lines = ['🔎 *' + q + '*', ''];
      for (let i = 0; i < show.length; i++) {
        lines.push('*' + (i + 1) + '.* ' + show[i].title);
      }
      lines.push('', 'Escolhe: *h1* … *h' + show.length + '*');
      return ctx.reply(box(lines));
    }
  },
  {
    name: 'h1',
    aliases: [],
    category: 'admin',
    description: 'Escolher resultado 1',
    handler: async function (ctx) { return pickResult(ctx, 0); }
  },
  {
    name: 'h2',
    aliases: [],
    category: 'admin',
    description: 'Escolher resultado 2',
    handler: async function (ctx) { return pickResult(ctx, 1); }
  },
  {
    name: 'h3',
    aliases: [],
    category: 'admin',
    description: 'Escolher resultado 3',
    handler: async function (ctx) { return pickResult(ctx, 2); }
  },
  {
    name: 'h4',
    aliases: [],
    category: 'admin',
    description: 'Escolher resultado 4',
    handler: async function (ctx) { return pickResult(ctx, 3); }
  },
  {
    name: 'h5',
    aliases: [],
    category: 'admin',
    description: 'Escolher resultado 5',
    handler: async function (ctx) { return pickResult(ctx, 4); }
  },
  {
    name: 'h6',
    aliases: [],
    category: 'admin',
    description: 'Escolher resultado 6',
    handler: async function (ctx) { return pickResult(ctx, 5); }
  },
  {
    name: 'h7',
    aliases: [],
    category: 'admin',
    description: 'Escolher resultado 7',
    handler: async function (ctx) { return pickResult(ctx, 6); }
  },
  {
    name: 'h8',
    aliases: [],
    category: 'admin',
    description: 'Escolher resultado 8',
    handler: async function (ctx) { return pickResult(ctx, 7); }
  },
  {
    name: 'hep',
    aliases: ['heps', 'hentaiops', 'hentaieps'],
    category: 'admin',
    description: 'Listar episodios do hentai selecionado',
    handler: async function (ctx) {
      if (!(await requireAccess(ctx))) return;
      const s = loadSession(ctx);
      if (!s || !s.selected) {
        return ctx.reply(box(['Nada selecionado.', 'Usa: *hentai <nome>* → *h1*']));
      }
      try {
        await ctx.reply(box(['⏳ A carregar episodios...', s.selected.title]));
      } catch (_) {}
      let eps = [];
      try {
        const res = await httpGet(s.selected.url);
        eps = parseEpisodes(res.body || '', s.selected.url);
      } catch (e) {
        return ctx.reply(box(['❌ Erro ao ler pagina.', String(e.message || e).slice(0, 100)]));
      }
      s.eps = eps;
      s.step = 'eps';
      saveSession(ctx, s);
      const lines = [
        '🎬 *' + s.selected.title + '*',
        '🔗 ' + s.selected.url,
        '',
        'Episodios: *' + eps.length + '*',
        ''
      ];
      for (let i = 0; i < Math.min(eps.length, 15); i++) {
        lines.push('*' + (i + 1) + '.* ' + eps[i].title);
        lines.push(eps[i].url);
      }
      if (eps.length > 15) lines.push('... +' + (eps.length - 15) + ' (abre o link do titulo)');
      lines.push('', '_Assiste no navegador pelo link_');
      return ctx.reply(box(lines));
    }
  }
];

async function pickResult(ctx, idx) {
  if (!(await requireAccess(ctx))) return;
  const s = loadSession(ctx);
  if (!s || !s.results || !s.results[idx]) {
    return ctx.reply(box(['Nada pendente.', 'Usa: *hentai <nome>*']));
  }
  s.selected = s.results[idx];
  s.step = 'selected';
  saveSession(ctx, s);
  return ctx.reply(
    box([
      '✅ *Selecionado*',
      '🎬 ' + s.selected.title,
      '🔗 ' + s.selected.url,
      '',
      'Ver episodios: *hep*',
      '_Abre o link no navegador para assistir_'
    ])
  );
}
