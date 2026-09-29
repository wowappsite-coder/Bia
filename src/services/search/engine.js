'use strict';
const cache = require('./cache');
const providers = require('./providers');
const { enabledByType } = require('./sourceRegistry');

async function searchWeb(q) {
  const hit = cache.get('web', q);
  if (hit) return hit;
  const order = [
    ['wikipedia', providers.wikipedia],
    ['duckduckgo', providers.duckduckgo],
    ['mdn', providers.mdn],
    ['npm', providers.npmSearch],
    ['arxiv', providers.arxiv]
  ];
  const errors = [];
  for (const [id, fn] of order) {
    try {
      const r = await fn(q);
      if (r && (r.summary || r.title)) {
        cache.set('web', q, r);
        return r;
      }
    } catch (e) {
      errors.push(id + ': ' + (e.message || e));
    }
  }
  return null;
}

async function searchImage(q) {
  const hit = cache.get('img', q);
  if (hit) return hit;
  const order = [
    ['openverse', providers.openverseImage],
    ['wikimedia', providers.wikimediaImage]
  ];
  for (const [id, fn] of order) {
    try {
      const r = await fn(q);
      if (r && r.imageUrl) {
        cache.set('img', q, r);
        return r;
      }
    } catch (e) {}
  }
  return null;
}

async function searchVideo(q) {
  const hit = cache.get('vid', q);
  if (hit) return hit;
  try {
    const r = await providers.openverseVideo(q);
    if (r && r.videoUrl) {
      cache.set('vid', q, r);
      return r;
    }
  } catch (e) {}
  return null;
}

module.exports = { searchWeb, searchImage, searchVideo, enabledByType };
