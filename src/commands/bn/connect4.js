/**
 * Connect 4 — c4 / connect4
 * Com jogo ativo: digite so 1-7
 */
const { tag } = require('../../utils/mention');

const active = new Map();   // key -> game
const playerMap = new Map(); // jid -> key

const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const P1 = 1; // vermelho
const P2 = 2; // amarelo
const EMOJI = { 0: '⚪', 1: '🔴', 2: '🟡' };

function emptyBoard() {
  const b = [];
  for (let r = 0; r < ROWS; r++) {
    b[r] = [];
    for (let c = 0; c < COLS; c++) b[r][c] = EMPTY;
  }
  return b;
}

function render(board, meta) {
  let t = '╭──〔 🔴 𝐂𝐎𝐍𝐍𝐄𝐂𝐓 𝟒 〕──╮\n';
  if (meta) {
    t += '> ' + (meta.line1 || '') + '\n';
    if (meta.line2) t += '> ' + meta.line2 + '\n';
  }
  t += '❀────────────────❀\n\n';
  for (let r = 0; r < ROWS; r++) {
    const label = ['⑥', '⑤', '④', '③', '②', '①'][r];
    t += label + ' ';
    for (let c = 0; c < COLS; c++) t += EMOJI[board[r][c]] + ' ';
    t += '\n';
  }
  t += '    1  2  3  4  5  6  7\n';
  t += '\n╰──────────────────╯';
  return t;
}

function canDrop(board, col) {
  return col >= 0 && col < COLS && board[0][col] === EMPTY;
}

function drop(board, col, piece) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === EMPTY) {
      board[r][col] = piece;
      return r;
    }
  }
  return -1;
}

function checkWin(board, piece) {
  // horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (board[r][c] === piece && board[r][c + 1] === piece && board[r][c + 2] === piece && board[r][c + 3] === piece) return true;
    }
  }
  // vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      if (board[r][c] === piece && board[r + 1][c] === piece && board[r + 2][c] === piece && board[r + 3][c] === piece) return true;
    }
  }
  // diag \
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (board[r][c] === piece && board[r + 1][c + 1] === piece && board[r + 2][c + 2] === piece && board[r + 3][c + 3] === piece) return true;
    }
  }
  // diag /
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (board[r][c] === piece && board[r - 1][c + 1] === piece && board[r - 2][c + 2] === piece && board[r - 3][c + 3] === piece) return true;
    }
  }
  return false;
}

function isFull(board) {
  for (let c = 0; c < COLS; c++) if (board[0][c] === EMPTY) return false;
  return true;
}

function validCols(board) {
  const out = [];
  for (let c = 0; c < COLS; c++) if (canDrop(board, c)) out.push(c);
  return out;
}

function cloneBoard(board) {
  return board.map(function (row) { return row.slice(); });
}

/** Bot: ganhar > bloquear > centro > aleatorio */
function botMove(board) {
  const cols = validCols(board);
  if (!cols.length) return null;

  for (let i = 0; i < cols.length; i++) {
    const b = cloneBoard(board);
    drop(b, cols[i], P2);
    if (checkWin(b, P2)) return cols[i];
  }
  for (let i = 0; i < cols.length; i++) {
    const b = cloneBoard(board);
    drop(b, cols[i], P1);
    if (checkWin(b, P1)) return cols[i];
  }

  const prefer = [3, 2, 4, 1, 5, 0, 6];
  for (let i = 0; i < prefer.length; i++) {
    if (cols.indexOf(prefer[i]) !== -1) return prefer[i];
  }
  return cols[Math.floor(Math.random() * cols.length)];
}

function endGame(key, game) {
  active.delete(key);
  if (game && game.p1) playerMap.delete(game.p1);
  if (game && game.p2 && game.p2 !== 'bot') playerMap.delete(game.p2);
}

function findGame(jid) {
  const key = playerMap.get(jid);
  if (!key) return null;
  const g = active.get(key);
  if (!g) {
    playerMap.delete(jid);
    return null;
  }
  return { key: key, game: g };
}

function gameKey(ctx, a, b) {
  if (ctx.isGroup) return 'c4:' + ctx.jid + ':' + a;
  return 'c4:pv:' + a;
}

async function playColumn(ctx, col) {
  const found = findGame(ctx.sender);
  if (!found) return false; // sem jogo — silencioso

  const game = found.game;
  if (game.status === 'pending') {
    await ctx.reply('⏳ Aguarda o oponente aceitar (*aceitar4*).');
    return true;
  }

  const isP1 = game.p1 === ctx.sender;
  const isP2 = game.p2 === ctx.sender;
  if (!isP1 && !isP2) return false;

  const myPiece = isP1 ? P1 : P2;
  if (game.turn !== myPiece) {
    await ctx.reply('⏳ Não é a tua vez.');
    return true;
  }

  if (!canDrop(game.board, col)) {
    await ctx.reply('❌ Coluna cheia ou inválida. Escolhe 1-7 livre.\n\n' + render(game.board, {
      line1: 'Vez de ' + (game.turn === P1 ? '🔴' : '🟡')
    }));
    return true;
  }

  drop(game.board, col, myPiece);

  if (checkWin(game.board, myPiece)) {
    endGame(found.key, game);
    const winEmoji = myPiece === P1 ? '🔴' : '🟡';
    await ctx.reply(
      render(game.board, { line1: '🏆 FIM DE JOGO' }) +
        '\n\n🏆 *' + winEmoji + ' venceu!*\n' +
        (game.mode === 'bot'
          ? (myPiece === P1 ? 'Ganhaste ao bot!' : 'O bot ganhou.')
          : tag(ctx.sender)),
      game.mode === 'pvp' ? { mentions: [ctx.sender] } : {}
    );
    return true;
  }

  if (isFull(game.board)) {
    endGame(found.key, game);
    await ctx.reply(render(game.board, { line1: '🤝 EMPATE' }) + '\n\n🤝 *Empate!* Tabuleiro cheio.');
    return true;
  }

  // Bot joga
  if (game.mode === 'bot' && myPiece === P1) {
    const bc = botMove(game.board);
    if (bc !== null) {
      drop(game.board, bc, P2);
      if (checkWin(game.board, P2)) {
        endGame(found.key, game);
        await ctx.reply(
          render(game.board, { line1: '🏆 FIM DE JOGO' }) +
            '\n\n🤖 *Bot (🟡) venceu!*\nColuna ' + (bc + 1)
        );
        return true;
      }
      if (isFull(game.board)) {
        endGame(found.key, game);
        await ctx.reply(render(game.board, { line1: '🤝 EMPATE' }) + '\n\n🤝 *Empate!*');
        return true;
      }
    }
    game.turn = P1;
    await ctx.reply(
      render(game.board, {
        line1: '🔴 Tu  vs  🟡 Bot',
        line2: 'Vez de: 🔴 — digita 1-7'
      })
    );
    return true;
  }

  // PvP: troca turno
  game.turn = myPiece === P1 ? P2 : P1;
  const nextJid = game.turn === P1 ? game.p1 : game.p2;
  await ctx.reply(
    render(game.board, {
      line1: '🔴 vs 🟡',
      line2: 'Vez de: ' + (game.turn === P1 ? '🔴' : '🟡') + ' ' + tag(nextJid)
    }),
    { mentions: [nextJid] }
  );
  return true;
}

function makeNumHandler(n) {
  return {
    name: String(n),
    aliases: [],
    category: 'bn',
    description: 'Jogada Connect 4 coluna ' + n,
    handler: async (ctx) => {
      if (playerMap.has(ctx.sender)) {
        await playColumn(ctx, n - 1);
        return;
      }
      // Trivia: numero 1-6 = opcao
      try {
        const tr = require('./trivia_hooks');
        if (tr && tr.tryNum) await tr.tryNum(ctx, n - 1);
      } catch (_) {}
    }
  };
}

module.exports = [
  {
    name: 'connect4',
    aliases: ['c4', 'ligar4', 'quatroemlinha'],
    category: 'bn',
    description: 'Connect 4 — vs bot ou vs pessoa',
    handler: async (ctx) => {
      if (findGame(ctx.sender)) {
        return ctx.reply('⚠️ Já estás num Connect 4.\nDigita *1-7* ou *cancelar4*');
      }

      let opponent = null;
      try {
        if (typeof ctx.getMentionedOrQuoted === 'function') {
          opponent = ctx.getMentionedOrQuoted();
        } else if (ctx.mentioned && ctx.mentioned[0]) {
          opponent = ctx.mentioned[0];
        }
      } catch (_) {}

      // Solo vs bot
      if (!opponent || opponent === ctx.sender) {
        const key = gameKey(ctx, ctx.sender, 'bot');
        const game = {
          board: emptyBoard(),
          mode: 'bot',
          status: 'active',
          p1: ctx.sender,
          p2: 'bot',
          turn: P1
        };
        active.set(key, game);
        playerMap.set(ctx.sender, key);
        return ctx.reply(
          render(game.board, {
            line1: '🔴 Tu  vs  🟡 Bot',
            line2: 'Vez de: 🔴 — digita *1-7*'
          }) +
            '\n\n> *cancelar4* para sair'
        );
      }

      if (!ctx.isGroup) {
        return ctx.reply('❌ Desafio só em *grupo*.\nNo PV: *c4* (vs bot)');
      }

      if (findGame(opponent)) {
        return ctx.reply('❌ Esse jogador já está numa partida.');
      }

      const key = gameKey(ctx, ctx.sender, opponent);
      const game = {
        board: emptyBoard(),
        mode: 'pvp',
        status: 'pending',
        p1: ctx.sender,
        p2: opponent,
        turn: P1,
        challenger: ctx.sender
      };
      active.set(key, game);
      playerMap.set(ctx.sender, key);
      playerMap.set(opponent, key);

      return ctx.reply(
        '🔴 *CONNECT 4*\n\n' +
          tag(ctx.sender) + ' desafiou ' + tag(opponent) + '!\n\n' +
          tag(opponent) + ' digita *aceitar4* para jogar\n' +
          'ou *recusar4* para cancelar.',
        { mentions: [ctx.sender, opponent] }
      );
    }
  },

  {
    name: 'aceitar4',
    aliases: ['aceitac4', 'accept4'],
    category: 'bn',
    description: 'Aceita desafio Connect 4',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.status !== 'pending') {
        return ctx.reply('❌ Nenhum desafio pendente.');
      }
      const game = found.game;
      if (game.p2 !== ctx.sender) {
        return ctx.reply('❌ Este desafio não é para ti.');
      }
      game.status = 'active';
      game.turn = P1;
      await ctx.reply(
        render(game.board, {
          line1: '🔴 vs 🟡 — partida iniciada!',
          line2: 'Vez de: 🔴 ' + tag(game.p1)
        }) +
          '\n\n> Digita *1-7* na tua vez\n> *cancelar4* para sair',
        { mentions: [game.p1] }
      );
    }
  },

  {
    name: 'recusar4',
    aliases: ['cancelar4', 'sair4', 'recusac4'],
    category: 'bn',
    description: 'Recusa ou cancela Connect 4',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found) return ctx.reply('❌ Não estás num Connect 4.');
      endGame(found.key, found.game);
      await ctx.reply('🚫 Connect 4 cancelado.');
    }
  },

  // Jogadas: so o numero
  makeNumHandler(1),
  makeNumHandler(2),
  makeNumHandler(3),
  makeNumHandler(4),
  makeNumHandler(5),
  makeNumHandler(6),
  makeNumHandler(7)
];
