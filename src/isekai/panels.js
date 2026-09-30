/** Paineis visuais partilhados — respostas elegantes */
function panel(title, tip, lines, footer) {
  let t = '╭──〔 ' + title + ' 〕──╮\n';
  if (tip) t += '> ' + tip + '\n';
  t += '❀────────────────❀\n';
  t += '╭──〔 📋 〕──╮\n';
  (lines || []).forEach(function (l) { t += '◈┃ ' + l + '\n'; });
  if (!lines || !lines.length) t += '◈┃ —\n';
  t += '╰──────────────────╯\n';
  if (footer) t += '> ' + footer + '\n';
  t += '❀────────────────❀';
  return t;
}

function panelCombat(title, lines, footer) {
  let t = '╭──〔 ' + title + ' 〕──╮\n';
  t += '⚔━━━━━━━━━━━━━━⚔\n';
  (lines || []).forEach(function (l) { t += '◈┃ ' + l + '\n'; });
  t += '╰──────────────────╯\n';
  if (footer) t += '> ' + footer + '\n';
  t += '⚔━━━━━━━━━━━━━━⚔';
  return t;
}

function panelGold(title, lines, footer) {
  let t = '╭──〔 ' + title + ' 〕──╮\n';
  t += '💰━━━━━━━━━━━━━━💰\n';
  (lines || []).forEach(function (l) { t += '◈┃ ' + l + '\n'; });
  t += '╰──────────────────╯\n';
  if (footer) t += '> ' + footer + '\n';
  t += '💰━━━━━━━━━━━━━━💰';
  return t;
}

function panelMagic(title, lines, footer) {
  let t = '╭──〔 ' + title + ' 〕──╮\n';
  t += '✨────────────────✨\n';
  (lines || []).forEach(function (l) { t += '◈┃ ' + l + '\n'; });
  t += '╰──────────────────╯\n';
  if (footer) t += '> ' + footer + '\n';
  t += '✨────────────────✨';
  return t;
}

function panelDark(title, lines, footer) {
  let t = '╭──〔 ' + title + ' 〕──╮\n';
  t += '🌑━━━━━━━━━━━━━━🌑\n';
  (lines || []).forEach(function (l) { t += '◈┃ ' + l + '\n'; });
  t += '╰──────────────────╯\n';
  if (footer) t += '> ' + footer + '\n';
  t += '🌑━━━━━━━━━━━━━━🌑';
  return t;
}

module.exports = { panel, panelCombat, panelGold, panelMagic, panelDark };
