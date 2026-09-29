/**
 * crad / criaraudio — TTS ElevenLabs (só dono)
 * Lê a key do .env sem pacote dotenv (evita conflito npm).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '../../../.env');
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

function getApiKey() {
  return process.env.ELEVENLABS_API_KEY || '';
}
function getVoiceId() {
  return process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
}

function ttsElevenLabs(text) {
  return new Promise(function (resolve, reject) {
    const apiKey = getApiKey();
    if (!apiKey) return reject(new Error('ELEVENLABS_API_KEY nao configurada no .env'));
    const voiceId = getVoiceId();
    const body = JSON.stringify({
      text: String(text).slice(0, 2500),
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.4, similarity_boost: 0.75 }
    });
    const req = https.request(
      {
        hostname: 'api.elevenlabs.io',
        path: '/v1/text-to-speech/' + encodeURIComponent(voiceId),
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 60000
      },
      function (res) {
        const chunks = [];
        res.on('data', function (c) { chunks.push(c); });
        res.on('end', function () {
          const buf = Buffer.concat(chunks);
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error('ElevenLabs HTTP ' + res.statusCode + ': ' + buf.toString('utf8').slice(0, 200)));
          }
          if (!buf.length) return reject(new Error('Audio vazio'));
          resolve(buf);
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', function () {
      req.destroy();
      reject(new Error('Timeout ElevenLabs'));
    });
    req.write(body);
    req.end();
  });
}

module.exports = [
  {
    name: 'criaraudio',
    aliases: ['crad', 'tts', 'fala'],
    category: 'dono',
    description: 'Gera audio com ElevenLabs (dono)',
    ownerOnly: true,
    handler: async (ctx) => {
      const text = (ctx.text || (ctx.args || []).join(' ') || '').trim();
      if (!text) {
        return ctx.reply(
          'CRIARAUDIO / CRAD\n\nUso: *crad seu texto aqui*\nEx: crad Ola, bem-vindo ao grupo!'
        );
      }
      if (!getApiKey()) {
        return ctx.reply('❌ Falta ELEVENLABS_API_KEY no ficheiro .env\nAdiciona e reinicia o bot.');
      }
      try { await ctx.reply('⏳ A gerar audio...'); } catch (_) {}

      let audioBuf;
      try {
        audioBuf = await ttsElevenLabs(text);
      } catch (e) {
        console.error('[criaraudio]', e.message);
        return ctx.reply('❌ Falha ElevenLabs:\n' + String(e.message || e).slice(0, 200));
      }

      try {
        await ctx.sock.sendMessage(
          ctx.jid,
          { audio: audioBuf, mimetype: 'audio/mpeg', ptt: false },
          { quoted: ctx.msg }
        );
      } catch (e) {
        console.error('[criaraudio] send', e.message);
        return ctx.reply('❌ Audio gerado mas falhou o envio no WhatsApp.');
      }
    }
  }
];
