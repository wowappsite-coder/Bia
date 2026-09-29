const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '../../.env');
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.charAt(0) === '#') continue;
      const eq = line.indexOf('=');
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') ||
          (val.charAt(0) === "'" && val.charAt(val.length - 1) === "'")) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (_) {}
}
loadEnvFile();

function mask(k) {
  if (!k || k.length < 10) return '***';
  return k.slice(0, 6) + '…' + k.slice(-4);
}

function listKeys() {
  const out = [];
  const legacy = (process.env.ELEVENLABS_API_KEY || '').trim();
  if (legacy) out.push({ name: 'ELEVENLABS_API_KEY', key: legacy });
  for (let i = 1; i <= 9; i++) {
    const name = 'ELEVENLABS_KEY_' + i;
    const key = (process.env[name] || '').trim();
    if (key) out.push({ name: name, key: key });
  }
  // unique by key value
  const seen = {};
  const uniq = [];
  for (let i = 0; i < out.length; i++) {
    if (seen[out[i].key]) continue;
    seen[out[i].key] = true;
    uniq.push(out[i]);
  }
  return uniq;
}

const deadUntil = {}; // name -> timestamp

function getAvailableKeys() {
  const now = Date.now();
  return listKeys().filter(function (k) {
    return !deadUntil[k.name] || deadUntil[k.name] < now;
  });
}

function markTempFail(name, ms) {
  deadUntil[name] = Date.now() + (ms || 60000);
  console.error('[elevenlabs] key temp fail', mask(name), 'for', ms || 60000, 'ms');
}

function markAuthFail(name) {
  // 10 min em 401
  markTempFail(name, 10 * 60 * 1000);
  console.error('[elevenlabs] auth fail on', name);
}

function getVoiceId() {
  return process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
}

module.exports = {
  listKeys,
  getAvailableKeys,
  markTempFail,
  markAuthFail,
  getVoiceId,
  mask
};
