const { token } = require('../../utils/mention');
/**
 * Comandos de atributos / brincadeiras de perfil
 * Cada um é um comando principal real com handler próprio
 */

const db = require('../../database');

const ATTRIBUTES = [
  'gay', 'lesbica', 'burro', 'inteligente', 'otaku', 'fiel', 'infiel', 'corno',
  'gado', 'gostoso', 'feio', 'rico', 'pobre', 'forte', 'fraco', 'pegador',
  'nerd', 'trabalhador', 'brabo', 'lindo', 'malandro', 'simpatico', 'engracado',
  'charmoso', 'misterioso', 'carinhoso', 'ciumento', 'corajoso', 'covarde',
  'esperto', 'talarico', 'chorao', 'brincalhao', 'traidor', 'bandido',
  'cachorro', 'vagabundo', 'pilantra', 'comedia', 'psicopata', 'fortao',
  'magrelo', 'bombado', 'chefe', 'presidente', 'rei', 'rainha', 'patrao',
  'playboy', 'zueiro', 'gamer', 'programador', 'visionario', 'bilionario',
  'poderoso', 'vencedor', 'senhor', 'fofoqueiro', 'dorminhoco', 'comilao',
  'atleta', 'estudioso', 'romantico', 'extrovertido', 'introvertido', 'calmo',
  'nervoso', 'organizado', 'bagunceiro', 'economico', 'gastador', 'saudavel',
  'supersticioso', 'cetico', 'religioso', 'ateu', 'tradicional', 'moderno',
  'liberal', 'patriotico', 'cosmopolita', 'rural', 'urbano', 'aventureiro',
  'caseiro', 'viajante', 'tecnologico', 'digital', 'offline', 'online',
  'social', 'antisocial', 'popular', 'solitario', 'lider', 'seguidor',
  'independente', 'dependente', 'criativo', 'pratico', 'sonhador', 'realista',
  'otimista', 'pessimista', 'confiante', 'inseguro', 'maduro', 'infantil',
  'serio', 'responsavel', 'irresponsavel', 'sigma', 'beta', 'louco', 'macho'
];

function randomPercent() {
  return Math.floor(Math.random() * 101);
}

function displayNumber(jid) {
  try {
    const u = db.getUser(jid);
    if (u && u.number) return String(u.number).replace(/\D/g, '').slice(-9);
  } catch (_) {}
  const d = String(jid).replace(/\D/g, '');
  if (d.length >= 9) return d.slice(-9);
  return d || 'user';
}

function getTarget(ctx) {
  const mentioned = ctx.getMentionedOrQuoted();
  if (mentioned) return mentioned;
  if (ctx.args[0] && ctx.args[0].includes('@')) {
    return ctx.args[0].replace('@', '') + '@s.whatsapp.net';
  }
  return ctx.sender;
}

function makeAttributeCommand(attr) {
  return {
    name: attr,
    category: 'bn',
    description: `Mede o nível de ${attr}`,
    groupOnly: false,
    handler: async (ctx) => {
      try {
        const target = getTarget(ctx);
        const percent = randomPercent();
        let emoji = '📊';
        if (percent >= 80) emoji = '🔥';
        else if (percent >= 50) emoji = '✨';
        else if (percent <= 20) emoji = '💀';

        // Salva para ranking
        try {
          const database = db.getDb();
          database.prepare(`
            INSERT INTO attributes (jid, group_jid, attribute, value)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(jid, group_jid, attribute) DO UPDATE SET value = excluded.value
          `).run(target, ctx.isGroup ? ctx.jid : null, attr, percent);
        } catch {}

        await ctx.reply(`${emoji} @${token(target)} é *${percent}%* ${attr}!`, {
          mentions: [target]
        });
      } catch (e) {
        await ctx.reply('❌ Erro ao processar atributo.');
        console.error(e);
      }
    }
  };
}

module.exports = ATTRIBUTES.map(makeAttributeCommand);
