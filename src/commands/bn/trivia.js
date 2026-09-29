/**
 * Trivia — so texto A B C D (sem enquete)
 */
const { tag } = require('../../utils/mention');

let getDb = null;
try { getDb = require('../../database').getDb; } catch (_) {}

const active = new Map();
const bags = new Map();

function loadQuestions() {
  const parts = [];
  for (let i = 1; i <= 4; i++) {
    try {
      const arr = require('./trivia_q' + i);
      if (Array.isArray(arr)) parts.push.apply(parts, arr);
    } catch (e) {}
  }
  return parts;
}
const QUESTIONS = loadQuestions();

function ensureTable() {
  if (!getDb) return;
  try {
    getDb().exec(
      'CREATE TABLE IF NOT EXISTS trivia_scores (' +
      'group_jid TEXT NOT NULL, user_jid TEXT NOT NULL, points INTEGER DEFAULT 0, ' +
      'PRIMARY KEY (group_jid, user_jid))'
    );
  } catch (_) {}
}

function addPoint(groupJid, userJid) {
  ensureTable();
  if (!getDb) return;
  try {
    const db = getDb();
    const row = db.prepare(
      'SELECT points FROM trivia_scores WHERE group_jid = ? AND user_jid = ?'
    ).get(groupJid, userJid);
    if (row) {
      db.prepare(
        'UPDATE trivia_scores SET points = points + 1 WHERE group_jid = ? AND user_jid = ?'
      ).run(groupJid, userJid);
    } else {
      db.prepare(
        'INSERT INTO trivia_scores (group_jid, user_jid, points) VALUES (?, ?, 1)'
      ).run(groupJid, userJid);
    }
  } catch (e) {
    console.error('[trivia] score', e.message);
  }
}

function getRanking(groupJid, limit) {
  ensureTable();
  if (!getDb) return [];
  try {
    return getDb().prepare(
      'SELECT user_jid, points FROM trivia_scores WHERE group_jid = ? ORDER BY points DESC LIMIT ?'
    ).all(groupJid, limit || 10);
  } catch (_) {
    return [];
  }
}

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

function pickQuestion(groupJid) {
  if (!QUESTIONS.length) return null;
  let bag = bags.get(groupJid);
  if (!bag || !bag.length) {
    bag = shuffle(QUESTIONS.map(function (_, i) { return i; }));
    bags.set(groupJid, bag);
  }
  return QUESTIONS[bag.pop()];
}

function prepareQuestion(item) {
  const indexed = item.opts.map(function (text, i) {
    return { text: text, wasCorrect: item.correct.indexOf(i) !== -1 };
  });
  const must = indexed.filter(function (x) { return x.wasCorrect; });
  const rest = shuffle(indexed.filter(function (x) { return !x.wasCorrect; }));
  let pick = must.concat(rest).slice(0, 4);
  pick = shuffle(pick).slice(0, 4);
  const opts = pick.map(function (x) { return x.text; });
  const correct = [];
  pick.forEach(function (x, i) {
    if (x.wasCorrect) correct.push(i);
  });
  if (!correct.length) correct.push(0);
  return { q: item.q, opts: opts, correct: correct };
}

async function tryAnswer(ctx, idx) {
  const g = active.get(ctx.jid);
  if (!g || g.answered) return false;
  if (idx < 0 || idx >= g.opts.length) {
    await ctx.reply('Opcao invalida. Usa *A*, *B*, *C* ou *D*.');
    return true;
  }
  const ok = g.correct.indexOf(idx) !== -1;
  const L = ['A', 'B', 'C', 'D'];
  if (!ok) {
    await ctx.reply(
      'Errado, ' + tag(ctx.sender) + '!\nTenta outra letra.',
      { mentions: [ctx.sender] }
    );
    return true;
  }
  g.answered = true;
  addPoint(ctx.jid, ctx.sender);
  const correctTexts = g.correct.map(function (i) {
    return L[i] + ') ' + g.opts[i];
  }).join(' | ');
  await ctx.reply(
    '╭──〔 CERTO 〕──╮\n' +
      '◈┃ ' + tag(ctx.sender) + ' acertou primeiro!\n' +
      '◈┃ Resposta: *' + correctTexts + '*\n' +
      '◈┃ +1 ponto no ranking\n' +
      '╰──────────────────╯\n' +
      '> *trivia* — nova pergunta\n' +
      '> *rankingtrivia* — classificacao',
    { mentions: [ctx.sender] }
  );
  return true;
}

async function sendTrivia(ctx) {
  if (!ctx.isGroup) {
    return ctx.reply('Trivia so em *grupos*.');
  }
  if (active.has(ctx.jid) && !active.get(ctx.jid).answered) {
    return ctx.reply('Ja ha uma trivia aberta.\nResponde com *A*, *B*, *C* ou *D*.');
  }
  if (!QUESTIONS.length) {
    return ctx.reply('Banco de perguntas vazio. Falta trivia_q1.js ... q4.js');
  }

  const raw = pickQuestion(ctx.jid);
  const item = prepareQuestion(raw);
  const L = ['A', 'B', 'C', 'D'];
  const lines = item.opts.map(function (o, i) {
    return '◈┃ *' + L[i] + ')* ' + o;
  }).join('\n');

  const text =
    '╭──〔 TRIVIA 〕──╮\n' +
    '> ' + item.q + '\n' +
    '❀────────────────❀\n' +
    lines + '\n' +
    '╰──────────────────╯\n' +
    '> Responde com *A*, *B*, *C* ou *D*\n' +
    '> Quem acertar *primeiro* ganha 1 ponto';

  await ctx.reply(text);

  active.set(ctx.jid, {
    q: item.q,
    opts: item.opts.slice(),
    correct: item.correct.slice(),
    answered: false,
    startedAt: Date.now()
  });
}

function makeLetterHandler(letter, idx) {
  return {
    name: letter.toLowerCase(),
    aliases: [],
    category: 'bn',
    description: 'Resposta trivia ' + letter,
    handler: async function (ctx) {
      if (!ctx.isGroup || !active.has(ctx.jid)) return;
      const g = active.get(ctx.jid);
      if (!g || g.answered) return;
      await tryAnswer(ctx, idx);
    }
  };
}

module.exports = [
  {
    name: 'trivia',
    aliases: ['quiz', 'perguntatrivia', 'triviaquiz'],
    category: 'bn',
    description: 'Pergunta de trivia (grupo)',
    groupOnly: true,
    handler: async function (ctx) {
      await sendTrivia(ctx);
    }
  },
  {
    name: 'rankingtrivia',
    aliases: ['ranktrivia', 'triviarank', 'toptrivia'],
    category: 'bn',
    description: 'Ranking de trivia do grupo',
    groupOnly: true,
    handler: async function (ctx) {
      const rows = getRanking(ctx.jid, 10);
      if (!rows.length) {
        return ctx.reply('Ainda nao ha pontos neste grupo.\nUsa *trivia* para comecar!');
      }
      let t = '╭──〔 RANKING TRIVIA 〕──╮\n';
      const mentions = [];
      rows.forEach(function (r, i) {
        const medal = ['1.', '2.', '3.'][i] || ((i + 1) + '.');
        t += '◈┃ ' + medal + ' ' + tag(r.user_jid) + ' — *' + r.points + '* pts\n';
        mentions.push(r.user_jid);
      });
      t += '╰──────────────────╯';
      await ctx.reply(t, { mentions: mentions });
    }
  },
  makeLetterHandler('A', 0),
  makeLetterHandler('B', 1),
  makeLetterHandler('C', 2),
  makeLetterHandler('D', 3),
  {
    name: 'responder',
    aliases: ['resposta', 'answer'],
    category: 'bn',
    description: 'Responder trivia: responder A',
    groupOnly: true,
    handler: async function (ctx) {
      if (!active.has(ctx.jid)) {
        return ctx.reply('Nenhuma trivia aberta. Usa *trivia*.');
      }
      const raw = ((ctx.args || []).join(' ') || ctx.text || '').trim().toUpperCase();
      let idx = -1;
      if (/^[A-D]$/.test(raw)) idx = raw.charCodeAt(0) - 65;
      else if (/^[1-4]$/.test(raw)) idx = parseInt(raw, 10) - 1;
      else {
        const m = raw.match(/\b([A-D])\b/);
        if (m) idx = m[1].charCodeAt(0) - 65;
      }
      if (idx < 0) return ctx.reply('Usa: *responder A* (ou B, C, D)');
      await tryAnswer(ctx, idx);
    }
  }
];

module.exports.active = active;
module.exports.tryAnswerExternal = async function (ctx, idx) {
  if (!ctx.isGroup || !active.has(ctx.jid)) return false;
  const g = active.get(ctx.jid);
  if (!g || g.answered) return false;
  return tryAnswer(ctx, idx);
};
