'use strict';
const fails = new Map(); // id -> { n, until }

function markFail(id) {
  const cur = fails.get(id) || { n: 0, until: 0 };
  cur.n += 1;
  if (cur.n >= 5) {
    cur.until = Date.now() + 10 * 60 * 1000;
    cur.n = 0;
  }
  fails.set(id, cur);
}

function markOk(id) {
  fails.delete(id);
}

function isCool(id) {
  const cur = fails.get(id);
  if (!cur) return false;
  if (cur.until && Date.now() < cur.until) return true;
  if (cur.until && Date.now() >= cur.until) {
    fails.delete(id);
    return false;
  }
  return false;
}

module.exports = { markFail, markOk, isCool };
