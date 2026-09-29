// Hooks usados pelo connect4 (numeros) — evita circular require pesado
const path = require('path');

function getActive() {
  try {
    // estado vive no modulo trivia
    delete require.cache[require.resolve('./trivia')];
  } catch (_) {}
  return null;
}

// Implementacao inline minima: le o mesmo Map se exportado
let api = null;
try {
  api = require('./trivia');
} catch (_) {}

module.exports = {
  tryNum: async function (ctx, idx) {
    // trivia exporta helpers no final — se nao, silencioso
    if (api && typeof api.tryAnswerExternal === 'function') {
      return api.tryAnswerExternal(ctx, idx);
    }
  }
};
