'use strict';
const https = require('https');
const http = require('http');

function get(url, timeoutMs) {
  timeoutMs = timeoutMs || 12000;
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const lib = u.protocol === 'http:' ? http : https;
      const req = lib.get(url, {
        headers: {
          'User-Agent': 'BeatrizBot/1.0 (research; +local)',
          Accept: 'application/json, text/html, */*'
        },
        timeout: timeoutMs
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return get(res.headers.location, timeoutMs).then(resolve, reject);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          resolve({ status: res.statusCode || 0, body: buf.toString('utf8'), buf, headers: res.headers });
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { try { req.destroy(); } catch (e) {} reject(new Error('timeout')); });
    } catch (e) { reject(e); }
  });
}

module.exports = { get };
