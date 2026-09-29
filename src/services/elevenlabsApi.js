const https = require('https');
const keys = require('./elevenlabsKeys');

function requestRaw(opts, body, isBinaryBody) {
  return new Promise(function (resolve, reject) {
    const req = https.request(opts, function (res) {
      const chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks)
        });
      });
    });
    req.on('error', reject);
    req.on('timeout', function () {
      req.destroy();
      reject(new Error('Timeout ElevenLabs'));
    });
    if (body) req.write(body);
    req.end();
  });
}

async function withKeyRotation(fn) {
  const available = keys.getAvailableKeys();
  if (!available.length) {
    throw new Error('NO_KEYS');
  }
  let lastErr = null;
  for (let i = 0; i < available.length; i++) {
    const entry = available[i];
    try {
      return await fn(entry);
    } catch (e) {
      lastErr = e;
      const msg = String(e && e.message || e);
      console.error('[elevenlabs] fail', entry.name, keys.mask(entry.key), msg.slice(0, 120));
      if (msg.indexOf('401') >= 0 || msg.indexOf('invalid_api_key') >= 0 || msg.indexOf('unauthorized') >= 0) {
        keys.markAuthFail(entry.name);
        continue;
      }
      if (msg.indexOf('429') >= 0 || msg.indexOf('quota') >= 0 || msg.indexOf('rate') >= 0) {
        keys.markTempFail(entry.name, 120000);
        continue;
      }
      // outros erros: tenta proxima key uma vez
      keys.markTempFail(entry.name, 30000);
    }
  }
  throw lastErr || new Error('ALL_KEYS_FAILED');
}

async function textToSpeech(text) {
  const voiceId = keys.getVoiceId();
  const payload = JSON.stringify({
    text: String(text).slice(0, 2500),
    model_id: 'eleven_multilingual_v2',
    voice_settings: { stability: 0.4, similarity_boost: 0.75 }
  });

  return withKeyRotation(async function (entry) {
    const r = await requestRaw({
      hostname: 'api.elevenlabs.io',
      path: '/v1/text-to-speech/' + encodeURIComponent(voiceId),
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': entry.key,
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 60000
    }, payload);

    if (r.status === 401 || r.status === 403) {
      throw new Error('HTTP ' + r.status + ' unauthorized');
    }
    if (r.status === 429) {
      throw new Error('HTTP 429 rate/quota');
    }
    if (r.status < 200 || r.status >= 300) {
      throw new Error('HTTP ' + r.status + ': ' + r.body.toString('utf8').slice(0, 150));
    }
    if (!r.body.length) throw new Error('audio vazio');
    return r.body;
  });
}

async function speechToText(audioBuffer, mime) {
  // multipart manual
  const boundary = '----Beatriz' + Date.now();
  const filename = 'audio.ogg';
  const mt = mime || 'audio/ogg';

  const preamble =
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="model_id"\r\n\r\n' +
    'scribe_v1\r\n' +
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="file"; filename="' + filename + '"\r\n' +
    'Content-Type: ' + mt + '\r\n\r\n';

  const closing = '\r\n--' + boundary + '--\r\n';
  const body = Buffer.concat([
    Buffer.from(preamble, 'utf8'),
    audioBuffer,
    Buffer.from(closing, 'utf8')
  ]);

  return withKeyRotation(async function (entry) {
    const r = await requestRaw({
      hostname: 'api.elevenlabs.io',
      path: '/v1/speech-to-text',
      method: 'POST',
      headers: {
        'xi-api-key': entry.key,
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': body.length
      },
      timeout: 90000
    }, body);

    if (r.status === 401 || r.status === 403) throw new Error('HTTP ' + r.status + ' unauthorized');
    if (r.status === 429) throw new Error('HTTP 429 rate/quota');
    if (r.status < 200 || r.status >= 300) {
      throw new Error('HTTP ' + r.status + ': ' + r.body.toString('utf8').slice(0, 180));
    }
    const data = JSON.parse(r.body.toString('utf8'));
    const text = data.text || data.transcription || data.result || '';
    if (!text) throw new Error('transcricao vazia');
    return String(text).trim();
  });
}

module.exports = { textToSpeech, speechToText, withKeyRotation };
