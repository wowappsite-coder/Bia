const os = require('os');
const config = require('../../config');

function fmtUptime(sec) {
  sec = Math.floor(sec || 0);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts = [];
  if (d) parts.push(d + 'd');
  if (h || d) parts.push(h + 'h');
  parts.push(m + 'm');
  parts.push(s + 's');
  return parts.join(' ');
}

function fmtBytes(n) {
  n = Number(n) || 0;
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
  return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

module.exports = {
  name: 'statusbot',
  aliases: ['botstatus2', 'estadobot', 'sysstatus'],
  category: 'utilidades',
  description: 'Status detalhado do bot',
  handler: async function (ctx) {
    let stats = { totalMain: '?', totalAliases: '?' };
    try {
      stats = require('../registry').stats();
    } catch (_) {}

    const mem = process.memoryUsage();
    const rss = fmtBytes(mem.rss);
    const heap = fmtBytes(mem.heapUsed);
    const free = fmtBytes(os.freemem());
    const total = fmtBytes(os.totalmem());
    const up = fmtUptime(process.uptime());
    const load = (os.loadavg && os.loadavg()[0] != null) ? Number(os.loadavg()[0]).toFixed(2) : '?';

    let dlLine = 'Livre';
    try {
      const dq = require('../../services/downloadQueue');
      if (dq.isBusy && dq.isBusy()) {
        const st = dq.statusText ? dq.statusText() : null;
        dlLine = 'Ocupado' + (st && st.who ? ' (' + String(st.who).split('@')[0].slice(-6) + ')' : '');
      } else {
        dlLine = 'Livre';
      }
    } catch (_) {
      dlLine = 'N/A';
    }

    let readyAt = '-';
    try {
      if (global.BOT_READY_AT) {
        const ago = Math.floor((Date.now() - global.BOT_READY_AT) / 1000);
        readyAt = fmtUptime(ago) + ' atras';
      }
    } catch (_) {}

    let reconnects = '0';
    try {
      reconnects = String(global.BOT_RECONNECT_COUNT || 0);
    } catch (_) {}

    const prefixes = (config.prefixes || []).join(' ') || '!';
    const now = new Date().toLocaleString('pt-MZ', { timeZone: config.timezone || 'Africa/Maputo' });

    const useFancy = ctx && String(ctx.prefix || '') === '!';
    let text;
    if (useFancy) {
      const o = 'ঔৣֳ̤᷈͜͝͡';
      text =
        '*╔═══━─❦ۜ✯ۣۜৡ ✧ ❖ ✧ ৡۣۜ✯ۜ─━━═╗*\n' +
        '*║*  *╭━━✯ ❖ 𝐒𝐓𝐀𝐓𝐔𝐒 𝐁𝐎𝐓 ❖ ✯━━╮*\n' +
        '*║*  *│*\n' +
        '*║*  *│  ' + o + ' 🤖 *' + (config.botName || 'BEATRIZ BOT') + '*\n' +
        '*║*  *│  ' + o + ' ⏱ Uptime: ' + up + '*\n' +
        '*║*  *│  ' + o + ' 📦 Comandos: ' + stats.totalMain + '*\n' +
        '*║*  *│  ' + o + ' 🔗 Aliases: ' + stats.totalAliases + '*\n' +
        '*║*  *│  ' + o + ' 💾 RAM: ' + rss + ' (heap ' + heap + ')*\n' +
        '*║*  *│  ' + o + ' 🖥 Livre: ' + free + ' / ' + total + '*\n' +
        '*║*  *│  ' + o + ' 📊 Load: ' + load + '*\n' +
        '*║*  *│  ' + o + ' ⬇️ Download: ' + dlLine + '*\n' +
        '*║*  *│  ' + o + ' 🔌 Ready: ' + readyAt + '*\n' +
        '*║*  *│  ' + o + ' 🔄 Reconnects: ' + reconnects + '*\n' +
        '*║*  *│  ' + o + ' ⌨️ Prefixos: ' + prefixes + '*\n' +
        '*║*  *│  ' + o + ' 📅 ' + now + '*\n' +
        '*║*  *│*\n' +
        '*║*  *╰━━━ঔৣ͡➳ ✦ ❖ ✦ ➳ঔৣ͡━━━╯*\n' +
        '*╚══━━❦ۜ✯ۣۜৡ ✧ ❖ ✧ ৡۣۜ✯ۜ─━━══╝*';
    } else {
      text =
        '╭──〔 🤖 𝐒𝐓𝐀𝐓𝐔𝐒 𝐁𝐎𝐓 〕──╮\n' +
        '│\n' +
        '│ 🤖 *' + (config.botName || 'BEATRIZ BOT') + '*\n' +
        '│ ⏱ Uptime: *' + up + '*\n' +
        '│ 📦 Comandos: *' + stats.totalMain + '*\n' +
        '│ 🔗 Aliases: *' + stats.totalAliases + '*\n' +
        '│ 💾 RAM: *' + rss + '* (heap ' + heap + ')\n' +
        '│ 🖥 Livre: *' + free + '* / ' + total + '\n' +
        '│ 📊 Load: *' + load + '*\n' +
        '│ ⬇️ Download: *' + dlLine + '*\n' +
        '│ 🔌 Ready: *' + readyAt + '*\n' +
        '│ 🔄 Reconnects: *' + reconnects + '*\n' +
        '│ ⌨️ Prefixos: ' + prefixes + '\n' +
        '│ 📅 ' + now + '\n' +
        '│\n' +
        '╰──〔 𝐁𝐄𝐀𝐓𝐑𝐈𝐙 𝐁𝐎𝐓 〕──╯';
    }

    return ctx.reply(text);
  }
};
