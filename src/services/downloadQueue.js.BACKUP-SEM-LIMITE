/**
 * Fila global de downloads + cancelamento + timeout de seguranca
 * - 1 download global de cada vez
 * - 1 download por utilizador de cada vez
 * - cancelardwd marca cancelamento do job atual
 * - job preso > MAX_JOB_MS e liberado automaticamente
 */

const MAX_JOB_MS = 3 * 60 * 1000; // 3 min max por download
const queue = [];
let busy = false;
let current = null;
let cancelFlag = false;
let watchdog = null;

function isBusy() {
  return busy;
}

function statusText() {
  if (!busy) return null;
  return {
    who: current && current.sender ? current.sender : '?',
    label: current && current.label ? current.label : 'download',
    waiting: queue.length,
    startedAt: current && current.at ? current.at : null
  };
}

function clearWatchdog() {
  if (watchdog) {
    try { clearTimeout(watchdog); } catch (_) {}
    watchdog = null;
  }
}

function armWatchdog() {
  clearWatchdog();
  watchdog = setTimeout(function () {
    if (!busy) return;
    console.error('[downloadQueue] TIMEOUT job — forcar release');
    cancelFlag = true;
    busy = false;
    current = null;
    clearWatchdog();
  }, MAX_JOB_MS);
}

function sameUser(a, b) {
  const da = String(a || '').replace(/\D/g, '').slice(-9);
  const db = String(b || '').replace(/\D/g, '').slice(-9);
  if (da && db && da === db) return true;
  return String(a || '') === String(b || '');
}

/**
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
function tryAcquire(ctx, label) {
  const sender = (ctx && (ctx.sender || ctx.senderPn)) || '?';
  const jid = (ctx && ctx.jid) || '';
  const job = {
    sender: sender,
    jid: jid,
    label: label || 'download',
    at: Date.now()
  };

  // utilizador ja tem download a correr
  if (busy && current && sameUser(current.sender, sender)) {
    return {
      ok: false,
      reason:
        '❌ *Ja tens um download em curso*\n\n' +
        'Espera terminar ou usa *cancelardwd*.'
    };
  }

  if (!busy) {
    busy = true;
    current = job;
    cancelFlag = false;
    armWatchdog();
    return { ok: true, queued: false };
  }

  return {
    ok: false,
    reason:
      '❌ *Download em andamento*\n\n' +
      'Outro pedido esta a ser processado.\n' +
      'Espera terminar ou o dono cancela com *cancelardwd*.\n' +
      (current && current.label ? 'Agora: *' + current.label + '*' : '')
  };
}

function release() {
  busy = false;
  current = null;
  cancelFlag = false;
  clearWatchdog();
}

function requestCancel(bySender) {
  if (!busy) {
    return { ok: false, reason: 'Nao ha download em curso.' };
  }
  // owner/admin podem cancelar qualquer; user so o proprio
  cancelFlag = true;
  return {
    ok: true,
    reason:
      '🛑 *Cancelamento pedido*\n\n' +
      'O download atual vai parar em breve.\n' +
      (current && current.label ? 'Job: *' + current.label + '*' : '')
  };
}

function isCancelled() {
  return !!cancelFlag;
}

function clearCancel() {
  cancelFlag = false;
}

/** Wrapper: corre handler so se livre */
function withDownloadLock(label, handler) {
  return async function (ctx) {
    const acq = tryAcquire(ctx, label);
    if (!acq.ok) {
      // silencioso — nao spamma "em andamento"
      return;
    }
    try {
      return await handler(ctx);
    } finally {
      release();
    }
  };
}

module.exports = {
  tryAcquire: tryAcquire,
  release: release,
  isBusy: isBusy,
  statusText: statusText,
  withDownloadLock: withDownloadLock,
  requestCancel: requestCancel,
  isCancelled: isCancelled,
  clearCancel: clearCancel,
  MAX_JOB_MS: MAX_JOB_MS
};
