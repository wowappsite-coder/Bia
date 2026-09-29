'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = path.join(process.cwd(), 'data', 'search-cache');
const TTL_MS = 10 * 60 * 1000; // 10 min

function ensure() {
  try { fs.mkdirSync(DIR, { recursive: true }); } catch (e) {}
}

function keyOf(kind, q) {
  return crypto.createHash('sha1').update(String(kind) + '|' + String(q).toLowerCase().trim()).digest('hex');
}

function get(kind, q) {
  ensure();
  const f = path.join(DIR, keyOf(kind, q) + '.json');
  try {
    if (!fs.existsSync(f)) return null;
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (Date.now() - (j.ts || 0) > TTL_MS) return null;
    return j.data;
  } catch (e) { return null; }
}

function set(kind, q, data) {
  ensure();
  const f = path.join(DIR, keyOf(kind, q) + '.json');
  try {
    fs.writeFileSync(f, JSON.stringify({ ts: Date.now(), data }));
  } catch (e) {}
}

module.exports = { get, set };
