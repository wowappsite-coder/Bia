const api = require('../../services/elevenlabsApi');

module.exports = [
  {
    name: 'tts',
    aliases: ['falar', 'textovoce'],
    category: 'utilidades',
    description: 'Texto para audio (ElevenLabs)',
    handler: async (ctx) => {
      const text = (ctx.text || (ctx.args || []).join(' ') || '').trim();
      if (!text) {
        return ctx.reply('Uso: *tts seu texto*\nEx: tts Ola, eu sou a Beatriz Bot.');
      }
      try { await ctx.reply('⏳ A gerar audio...'); } catch (_) {}
      try {
        const audio = await api.textToSpeech(text);
        await ctx.sock.sendMessage(
          ctx.jid,
          { audio: audio, mimetype: 'audio/mpeg', ptt: false },
          { quoted: ctx.msg }
        );
      } catch (e) {
        console.error('[tts]', String(e.message || e).slice(0, 200));
        await ctx.reply('❌ Serviço temporariamente indisponível. Tente novamente.');
      }
    }
  }
];
