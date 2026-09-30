/**
 * SEC Parte 3 — Fila inteligente de envio
 * - 1 envio de cada vez na prática: se a fila estiver vazia, envia já
 * - Só introduz atraso mínimo quando há vários envios em concorrência
 * - Nao remove midia/reacoes/texto
 */

const MAX_PER_WINDOW = 8;      // envios por janela
const WINDOW_MS = 3000;        // 3s
const BUSY_GAP_MS = 120;       // gap so quando a fila esta ocupada
const REACT_GAP_MS = 80;

let queue = Promise.resolve();
let chainLen = 0;
let recentTs = [];
let totalSent = 0;
let burstEvents = 0;

function pruneRecent(now) {
  recentTs = recentTs.filter(function (t) { return now - t < WINDOW_MS; });
}

function isBurst(now) {
  pruneRecent(now);
  return recentTs.length >= MAX_PER_WINDOW || chainLen > 1;
}

function gapFor(content) {
  const now = Date.now();
  if (!isBurst(now) && chainLen <= 1) return 0;
  burstEvents += 1;
  if (content && content.react) return REACT_GAP_MS;
  return BUSY_GAP_MS;
}

function logBurst(kind) {
  if (chainLen > 2 || recentTs.length >= MAX_PER_WINDOW - 1) {
    console.log(
      '[SEC QUEUE]',
      kind || 'send',
      'chain=', chainLen,
      'recent=', recentTs.length,
      'total=', totalSent,
      'bursts=', burstEvents
    );
  }
}

/**
 * Enfileira um envio. resolve com o resultado de sendFn.
 */
function enqueue(sendFn, content) {
  chainLen += 1;
  const run = queue.then(async function () {
    const wait = gapFor(content);
    if (wait > 0) {
      logBurst(content && content.react ? 'react' : 'msg');
      await new Promise(function (r) { setTimeout(r, wait); });
    }
    try {
      const res = await sendFn();
      totalSent += 1;
      recentTs.push(Date.now());
      pruneRecent(Date.now());
      return res;
    } catch (e) {
      console.error('[SEC QUEUE] send error:', e && e.message);
      return null;
    } finally {
      chainLen = Math.max(0, chainLen - 1);
    }
  });
  // evita unhandled rejection a partir da cadeia
  queue = run.catch(function () {});
  return run;
}

/**
 * Envolve sock.sendMessage uma unica vez.
 */
function wrapSocket(sock) {
  if (!sock || sock.__secQueueWrapped) return sock;
  const original = sock.sendMessage.bind(sock);
  sock.sendMessage = function (jid, content, options) {
    return enqueue(function () {
      return original(jid, content, options);
    }, content || {});
  };
  sock.__secQueueWrapped = true;
  sock.__secQueueStats = function () {
    return {
      chainLen: chainLen,
      recent: recentTs.length,
      totalSent: totalSent,
      burstEvents: burstEvents
    };
  };
  console.log('[SEC QUEUE] sendMessage envolvido (fila inteligente ativa)');
  return sock;
}

module.exports = {
  enqueue: enqueue,
  wrapSocket: wrapSocket,
  stats: function () {
    return { chainLen: chainLen, recent: recentTs.length, totalSent: totalSent, burstEvents: burstEvents };
  }
};
