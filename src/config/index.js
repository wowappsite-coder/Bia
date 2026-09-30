
/* BTZ_OWNER_FIX_V1 */
function btzIsOwnerJid(jid) {
  try {
    const raw = String(jid || '');
    const digits = raw.replace(/\D/g, '');
    const owners = [
      process.env.OWNER_NUMBER,
      process.env.OWNER,
      process.env.OWNER_DISPLAY,
      process.env.DONO_NUMERO,
      '874288439',
      '258874288439'
    ].filter(Boolean).map(function (x) { return String(x).replace(/\D/g, ''); });
    const lids = [process.env.OWNER_LID].filter(Boolean).map(String);
    for (const o of owners) {
      if (!o) continue;
      if (digits === o || digits.endsWith(o) || digits.endsWith(o.slice(-9))) return true;
    }
    for (const l of lids) {
      if (l && (raw.includes(l) || digits.includes(l.replace(/\D/g, '')))) return true;
    }
  } catch (e) {}
  return false;
}

const path = require('path');
const fs = require('fs');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...rest] = trimmed.split('=');
      if (key) env[key.trim()] = rest.join('=').trim();
    });
  }
  return env;
}

const env = loadEnv();

const config = {
  botName: env.BOT_NAME || 'BEATRIZ BOT',
  ownerNumber: (env.OWNER_NUMBER || '874288439').replace(/\D/g, ''),
  ownerLid: (env.OWNER_LID || '135055783522320').replace(/\D/g, ''),
  botNumber: (env.BOT_NUMBER || '852935085').replace(/\D/g, ''),
  prefixes: (env.PREFIXES || '!,.,#,/').split(',').map(p => p.trim()).filter(Boolean),
  timezone: env.TIMEZONE || 'Africa/Maputo',
  dbPath: env.DB_PATH || path.join(process.cwd(), 'data', 'beatriz.db'),
  sessionPath: env.SESSION_PATH || path.join(process.cwd(), 'session'),
  logLevel: env.LOG_LEVEL || 'info',
  logPath: env.LOG_PATH || path.join(process.cwd(), 'logs'),
  antispamLimit: parseInt(env.ANTISPAM_LIMIT || '8', 10),
  xpPerMessage: parseInt(env.XP_PER_MESSAGE || '5', 10),
  xpPerCommand: parseInt(env.XP_PER_COMMAND || '15', 10),
    // Precos de aluguel (edite so aqui)
  rentalPlans: [
    { days: 1,   emoji: '⚪', price: '12 MT' },
    { days: 3,   emoji: '🟡', price: '24 MT' },
    { days: 7,   emoji: '🟢', price: '36 MT' },
    { days: 15,  emoji: '🔵', price: '84 MT' },
    { days: 30,  emoji: '🟣', price: '120 MT' },
    { days: 60,  emoji: '🟠', price: '216 MT' },
    { days: 90,  emoji: '🔴', price: '336 MT' },
    { days: 365, emoji: '⭐', price: '600 MT' }
  ],
  get ownerDisplay() {
    const n = String(this.ownerNumber || '').replace(/\D/g, '');
    if (n.length >= 9) return '+' + (n.startsWith('258') ? n : '258' + n.slice(-9));
    return n || 'Owner';
  },
  get ownerJid() {
    return this.ownerNumber + '@s.whatsapp.net';
  },
  isOwner(jid) {
    if (!jid) return false;
    const raw = String(jid);
    const digits = raw.replace(/\D/g, '');
    const owner = String(this.ownerNumber || '').replace(/\D/g, '');
    const lid = String(this.ownerLid || '').replace(/\D/g, '');
    if (lid && (digits === lid || raw.includes(lid))) return true;
    if (owner && (digits === owner || digits.endsWith(owner) || digits.slice(-9) === owner.slice(-9))) return true;
    return false;
  }
};

module.exports = config;
