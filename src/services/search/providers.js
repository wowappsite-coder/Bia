'use strict';
const { get } = require('./http');
const cool = require('./cooldown');

async function wikipedia(q) {
  if (cool.isCool('wikipedia')) throw new Error('cooldown');
  const url = 'https://pt.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(q.replace(/\s+/g, '_'));
  try {
    const r = await get(url);
    if (r.status === 404) {
      // search API
      const s = await get('https://pt.wikipedia.org/w/api.php?action=opensearch&limit=3&namespace=0&format=json&search=' + encodeURIComponent(q));
      const j = JSON.parse(s.body);
      const titles = j[1] || [];
      const links = j[3] || [];
      if (!titles.length) throw new Error('vazio');
      cool.markOk('wikipedia');
      return {
        title: titles[0],
        summary: 'Resultados Wikipedia:\n' + titles.map((t, i) => (i + 1) + '. ' + t + (links[i] ? '\n   ' + links[i] : '')).join('\n'),
        url: links[0] || '',
        source: 'Wikipedia'
      };
    }
    const j = JSON.parse(r.body);
    cool.markOk('wikipedia');
    return {
      title: j.title || q,
      summary: (j.extract || j.description || '').slice(0, 900),
      url: (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || '',
      source: 'Wikipedia'
    };
  } catch (e) {
    cool.markFail('wikipedia');
    throw e;
  }
}

async function duckduckgo(q) {
  if (cool.isCool('duckduckgo')) throw new Error('cooldown');
  // Instant Answer API (publico, limitado)
  const url = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(q) + '&format=json&no_html=1&skip_disambig=1';
  try {
    const r = await get(url);
    const j = JSON.parse(r.body);
    const text = j.AbstractText || j.Answer || '';
    const related = (j.RelatedTopics || []).slice(0, 4).map((x) => x.Text).filter(Boolean);
    if (!text && !related.length) throw new Error('vazio');
    cool.markOk('duckduckgo');
    return {
      title: j.Heading || q,
      summary: (text || related.join('\n')).slice(0, 900),
      url: j.AbstractURL || j.Redirect || '',
      source: 'DuckDuckGo'
    };
  } catch (e) {
    cool.markFail('duckduckgo');
    throw e;
  }
}

async function arxiv(q) {
  if (cool.isCool('arxiv')) throw new Error('cooldown');
  const url = 'http://export.arxiv.org/api/query?search_query=all:' + encodeURIComponent(q) + '&start=0&max_results=3';
  try {
    const r = await get(url);
    const titles = [...r.body.matchAll(/<title>([\s\S]*?)<\/title>/g)].map((m) => m[1].trim()).filter((t) => t !== 'ArXiv Query: Search');
    const ids = [...r.body.matchAll(/<id>(https?:\/\/arxiv\.org\/abs\/[^<]+)<\/id>/g)].map((m) => m[1]);
    if (!titles.length) throw new Error('vazio');
    cool.markOk('arxiv');
    const lines = titles.slice(0, 3).map((t, i) => (i + 1) + '. ' + t.replace(/\s+/g, ' ') + (ids[i] ? '\n   ' + ids[i] : ''));
    return { title: 'arXiv: ' + q, summary: lines.join('\n'), url: ids[0] || '', source: 'arXiv' };
  } catch (e) {
    cool.markFail('arxiv');
    throw e;
  }
}

async function mdn(q) {
  if (cool.isCool('mdn')) throw new Error('cooldown');
  const url = 'https://developer.mozilla.org/api/v1/search?q=' + encodeURIComponent(q) + '&locale=pt-BR';
  try {
    const r = await get(url);
    const j = JSON.parse(r.body);
    const docs = (j.documents || []).slice(0, 3);
    if (!docs.length) throw new Error('vazio');
    cool.markOk('mdn');
    const lines = docs.map((d, i) => (i + 1) + '. ' + d.title + '\n   https://developer.mozilla.org' + d.mdn_url);
    return { title: 'MDN: ' + q, summary: lines.join('\n'), url: 'https://developer.mozilla.org' + docs[0].mdn_url, source: 'MDN' };
  } catch (e) {
    cool.markFail('mdn');
    throw e;
  }
}

async function npmSearch(q) {
  if (cool.isCool('npm')) throw new Error('cooldown');
  const url = 'https://registry.npmjs.org/-/v1/search?text=' + encodeURIComponent(q) + '&size=3';
  try {
    const r = await get(url);
    const j = JSON.parse(r.body);
    const objs = (j.objects || []).slice(0, 3);
    if (!objs.length) throw new Error('vazio');
    cool.markOk('npm');
    const lines = objs.map((o, i) => {
      const p = o.package || {};
      return (i + 1) + '. ' + p.name + ' — ' + (p.description || '').slice(0, 80) + '\n   ' + (p.links && p.links.npm ? p.links.npm : '');
    });
    return { title: 'npm: ' + q, summary: lines.join('\n'), url: (objs[0].package.links || {}).npm || '', source: 'npm' };
  } catch (e) {
    cool.markFail('npm');
    throw e;
  }
}

async function openverseImage(q) {
  if (cool.isCool('openverse')) throw new Error('cooldown');
  const url = 'https://api.openverse.org/v1/images/?q=' + encodeURIComponent(q) + '&page_size=5';
  try {
    const r = await get(url);
    const j = JSON.parse(r.body);
    const res = (j.results || []).filter((x) => x.url || x.thumbnail);
    if (!res.length) throw new Error('vazio');
    cool.markOk('openverse');
    const pick = res[0];
    return {
      title: pick.title || q,
      imageUrl: pick.url || pick.thumbnail,
      pageUrl: pick.foreign_landing_url || pick.detail_url || '',
      source: 'Openverse',
      license: pick.license || ''
    };
  } catch (e) {
    cool.markFail('openverse');
    throw e;
  }
}

async function wikimediaImage(q) {
  if (cool.isCool('wikimedia')) throw new Error('cooldown');
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=' +
    encodeURIComponent(q) + '&gsrlimit=5&prop=imageinfo&iiprop=url|mime&format=json';
  try {
    const r = await get(url);
    const j = JSON.parse(r.body);
    const pages = j.query && j.query.pages ? Object.values(j.query.pages) : [];
    const imgs = pages.filter((p) => p.imageinfo && p.imageinfo[0] && /image\//.test(p.imageinfo[0].mime || ''));
    if (!imgs.length) throw new Error('vazio');
    cool.markOk('wikimedia');
    const ii = imgs[0].imageinfo[0];
    return {
      title: imgs[0].title || q,
      imageUrl: ii.url,
      pageUrl: ii.descriptionurl || '',
      source: 'Wikimedia Commons',
      license: ''
    };
  } catch (e) {
    cool.markFail('wikimedia');
    throw e;
  }
}

async function openverseVideo(q) {
  if (cool.isCool('openverse_video')) throw new Error('cooldown');
  const url = 'https://api.openverse.org/v1/videos/?q=' + encodeURIComponent(q) + '&page_size=3';
  try {
    const r = await get(url);
    const j = JSON.parse(r.body);
    const res = (j.results || []).filter((x) => x.url);
    if (!res.length) throw new Error('vazio');
    cool.markOk('openverse_video');
    const pick = res[0];
    return {
      title: pick.title || q,
      videoUrl: pick.url,
      pageUrl: pick.foreign_landing_url || '',
      source: 'Openverse Video'
    };
  } catch (e) {
    cool.markFail('openverse_video');
    throw e;
  }
}



async function pexelsImage(q) {
  const key = process.env.PEXELS_API_KEY || '';
  if (!key) throw new Error('PEXELS_API_KEY ausente');
  const url = 'https://api.pexels.com/v1/search?query=' + encodeURIComponent(q) + '&per_page=5';
  const https = require('https');
  const body = await new Promise(function (resolve, reject) {
    const req = https.get(url, {
      headers: { Authorization: key, 'User-Agent': 'BeatrizBot/1.0' },
      timeout: 15000
    }, function (res) {
      let d = '';
      res.on('data', function (c) { d += c; });
      res.on('end', function () { resolve({ status: res.statusCode, body: d }); });
    });
    req.on('error', reject);
    req.on('timeout', function () { try { req.destroy(); } catch (e) {} reject(new Error('timeout')); });
  });
  if (body.status !== 200) throw new Error('pexels HTTP ' + body.status);
  const j = JSON.parse(body.body);
  const photos = j.photos || [];
  if (!photos.length) throw new Error('vazio');
  const ph = photos[0];
  const src = (ph.src && (ph.src.large || ph.src.original || ph.src.medium)) || '';
  if (!src) throw new Error('sem url');
  return {
    title: ph.alt || q,
    imageUrl: src,
    pageUrl: ph.url || '',
    source: 'Pexels',
    license: 'Pexels License'
  };
}

async function unsplashImage(q) {
  const key = process.env.UNSPLASH_ACCESS_KEY || '';
  if (!key) throw new Error('UNSPLASH_ACCESS_KEY ausente');
  const url = 'https://api.unsplash.com/search/photos?query=' + encodeURIComponent(q) + '&per_page=5';
  const https = require('https');
  const body = await new Promise(function (resolve, reject) {
    const req = https.get(url, {
      headers: {
        Authorization: 'Client-ID ' + key,
        'User-Agent': 'BeatrizBot/1.0',
        'Accept-Version': 'v1'
      },
      timeout: 15000
    }, function (res) {
      let d = '';
      res.on('data', function (c) { d += c; });
      res.on('end', function () { resolve({ status: res.statusCode, body: d }); });
    });
    req.on('error', reject);
    req.on('timeout', function () { try { req.destroy(); } catch (e) {} reject(new Error('timeout')); });
  });
  if (body.status !== 200) throw new Error('unsplash HTTP ' + body.status);
  const j = JSON.parse(body.body);
  const results = j.results || [];
  if (!results.length) throw new Error('vazio');
  const ph = results[0];
  const src = (ph.urls && (ph.urls.regular || ph.urls.full || ph.urls.small)) || '';
  if (!src) throw new Error('sem url');
  return {
    title: ph.description || ph.alt_description || q,
    imageUrl: src,
    pageUrl: (ph.links && ph.links.html) || '',
    source: 'Unsplash',
    license: 'Unsplash License'
  };
}

module.exports = {
  wikipedia, duckduckgo, arxiv, mdn, npmSearch,
  openverseImage, wikimediaImage, openverseVideo
,
  pexelsImage, unsplashImage
};
