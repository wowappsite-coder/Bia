const queues = new Map();
const lastSent = new Map();

function rand(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function detectType(content, options) {
  const opts = options || {};
  if (opts && opts.skipDelay) return 'none';
  const mentions = (opts.mentions || (content && content.mentions) || []).length;
  if (mentions >= 3) return 'mentions';
  if (content && typeof content === 'object') {
    if (content.image || content.video || content.document) return 'media';
    if (content.audio || content.sticker || content.ptt) return 'audio';
    if (content.text) {
      const t = String(content.text);
      // status de processamento: quase sem delay
      if (/⏳|A criar|processando|baixando|aguarde/i.test(t)) return 'status';
      if (/menu|╭──|┏━━|comandos/i.test(t)) return 'menu';
    }
  }
  if (typeof content === 'string' && /⏳|A criar|processando/i.test(content)) return 'status';
  return 'simple';
}

function delayRange(type) {
  // Delay humano leve, sem bloquear downloads/midia.
  switch (type) {
    case 'menu':
      return [1000, 2000];
    case 'simple':
      return [2000, 3000];
    case 'mentions':
      return [2000, 5000];
    case 'media':
    case 'audio':
    case 'status':
    case 'none':
    default:
      return [0, 0];
  }
}

async function showTyping(sock, jid, ms) {
  if (ms < 50) return;
  try { await sock.sendPresenceUpdate('composing', jid); } catch (_) {}
  await sleep(ms);
  try { await sock.sendPresenceUpdate('paused', jid); } catch (_) {}
}

function enqueue(jid, task) {
  const prev = queues.get(jid) || Promise.resolve();
  const next = prev.then(task).catch(function (e) {
    console.error('[sendDelay]', e && e.message ? e.message : e);
  });
  queues.set(jid, next.then(function () {}, function () {}));
  return next;
}

async function withDelay(sock, jid, content, options, sendFn) {
  const type = detectType(content, options);
  const range = delayRange(type);
  const ms = range[1] === 0 ? 0 : rand(range[0], range[1]);
  return enqueue(jid, async function () {
    const last = lastSent.get(jid) || 0;
    const gap = Date.now() - last;

    // Mensagens consecutivas: intervalo humano de 3–6s.
    // Downloads/midia continuam sem atraso artificial.
    if (last > 0 && type !== 'media' && type !== 'audio' && type !== 'status' && type !== 'none') {
      const wait = rand(3000, 6000);
      if (gap < wait) await sleep(wait - gap);
    }

    const result = await sendFn();
    lastSent.set(jid, Date.now());
    return result;
  });
}

module.exports = { withDelay, detectType, delayRange, rand, sleep };
