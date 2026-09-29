/**
 * Quem Sou Eu? — adivinhacao Sim/Nao
 * quemsueu | pergunta ... | chute ... | desistir
 */
const { tag } = require('../../utils/mention');

const active = new Map(); // groupJid -> { secret, asks, startedBy }

const SECRETS = [
  // Animais
  { name: 'Leao', type: 'animal', tags: ['animal', 'mamifero', 'selvagem', 'africa', 'carnivoro', 'juba', 'felino', 'gatorupede', 'grande', 'vivo', 'natureza', 'predador', 'gatos', 'savana', 'rugido'] },
  { name: 'Elefante', type: 'animal', tags: ['animal', 'mamifero', 'grande', 'africa', 'asia', 'tromba', 'presa', 'cinzento', 'herbivoro', 'vivo', 'natureza', 'orelhas', 'pesado'] },
  { name: 'Golfinho', type: 'animal', tags: ['animal', 'mamifero', 'mar', 'oceano', 'agua', 'inteligente', 'nada', 'vivo', 'natureza', 'azul', 'som'] },
  { name: 'Aguia', type: 'animal', tags: ['animal', 'ave', 'voa', 'predador', 'penas', 'céu', 'vivo', 'natureza', 'rapina', 'olho'] },
  { name: 'Cobra', type: 'animal', tags: ['animal', 'reptil', 'rasteja', 'veneno', 'sem pernas', 'vivo', 'natureza', 'escamas', 'sibila'] },
  { name: 'Cachorro', type: 'animal', tags: ['animal', 'mamifero', 'domestico', 'pet', 'late', 'fiel', 'vivo', 'casa', 'melhor amigo'] },
  { name: 'Gato', type: 'animal', tags: ['animal', 'mamifero', 'domestico', 'pet', 'mia', 'felino', 'vivo', 'casa', 'independente'] },
  { name: 'Tubarao', type: 'animal', tags: ['animal', 'peixe', 'mar', 'oceano', 'predador', 'dentes', 'vivo', 'agua', 'perigoso'] },
  // Pessoas / personagens genericos
  { name: 'Albert Einstein', type: 'pessoa', tags: ['pessoa', 'humano', 'cientista', 'fisica', 'homem', 'famoso', 'historia', 'genio', 'cabelo', 'nobel', 'real'] },
  { name: 'Pelé', type: 'pessoa', tags: ['pessoa', 'humano', 'homem', 'futebol', 'desporto', 'brasil', 'famoso', 'jogador', 'rei', 'real'] },
  { name: 'Cleópatra', type: 'pessoa', tags: ['pessoa', 'humano', 'mulher', 'egito', 'rainha', 'historia', 'antiga', 'famosa', 'real'] },
  { name: 'Nelson Mandela', type: 'pessoa', tags: ['pessoa', 'humano', 'homem', 'africa', 'politico', 'paz', 'historia', 'famoso', 'real', 'liberdade'] },
  { name: 'Michael Jackson', type: 'pessoa', tags: ['pessoa', 'humano', 'homem', 'musica', 'cantor', 'danca', 'famoso', 'pop', 'real'] },
  { name: 'Shakespeare', type: 'pessoa', tags: ['pessoa', 'humano', 'homem', 'escritor', 'teatro', 'ingles', 'historia', 'famoso', 'real', 'livros'] },
  // Objetos
  { name: 'Telefone', type: 'objeto', tags: ['objeto', 'coisa', 'eletronico', 'comunicacao', 'chamada', 'bolso', 'tecnologia', 'inanimado', 'humano usa'] },
  { name: 'Relogio', type: 'objeto', tags: ['objeto', 'coisa', 'tempo', 'pulso', 'horas', 'inanimado', 'acessorio'] },
  { name: 'Livro', type: 'objeto', tags: ['objeto', 'coisa', 'papel', 'ler', 'paginas', 'conhecimento', 'inanimado', 'escola'] },
  { name: 'Bola', type: 'objeto', tags: ['objeto', 'coisa', 'redonda', 'desporto', 'futebol', 'jogar', 'inanimado'] },
  { name: 'Chave', type: 'objeto', tags: ['objeto', 'coisa', 'abrir', 'porta', 'metal', 'inanimado', 'pequena'] },
  { name: 'Oculos', type: 'objeto', tags: ['objeto', 'coisa', 'ver', 'rosto', 'lentes', 'inanimado', 'visao'] },
  { name: 'Guitarra', type: 'objeto', tags: ['objeto', 'coisa', 'musica', 'instrumento', 'cordas', 'som', 'inanimado'] },
  { name: 'Aviao', type: 'objeto', tags: ['objeto', 'coisa', 'voa', 'transporte', 'ceu', 'viagem', 'inanimado', 'grande'] },
  { name: 'Computador', type: 'objeto', tags: ['objeto', 'coisa', 'eletronico', 'tecnologia', 'internet', 'trabalho', 'inanimado'] },
  { name: 'Caneta', type: 'objeto', tags: ['objeto', 'coisa', 'escrever', 'tinta', 'papel', 'escola', 'inanimado', 'pequena'] },
  // Lugares / comida / outros
  { name: 'Pizza', type: 'comida', tags: ['comida', 'comer', 'italiana', 'queijo', 'massa', 'forno', 'sabor', 'nao vivo'] },
  { name: 'Cafe', type: 'comida', tags: ['comida', 'bebida', 'quente', 'grao', 'manha', 'cafeina', 'nao vivo'] },
  { name: 'Sol', type: 'natureza', tags: ['natureza', 'estrela', 'ceu', 'luz', 'quente', 'dia', 'espaco', 'nao vivo', 'grande'] },
  { name: 'Lua', type: 'natureza', tags: ['natureza', 'satelite', 'ceu', 'noite', 'espaco', 'nao vivo', 'orbita'] },
  { name: 'Arvore', type: 'natureza', tags: ['natureza', 'planta', 'folha', 'tronco', 'oxigenio', 'vivo', 'verde', 'terra'] },
  { name: 'Diamante', type: 'objeto', tags: ['objeto', 'coisa', 'joia', 'brilhante', 'duro', 'caro', 'inanimado', 'pedra'] }
];

function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickSecret() {
  return SECRETS[Math.floor(Math.random() * SECRETS.length)];
}

/** Analise simples por palavras-chave */
function answerYesNo(question, secret) {
  const q = norm(question);
  if (!q || q.length < 3) {
    return { ok: false, msg: 'Pergunta muito curta. Ex: *e um animal?*' };
  }

  // tentativa de adivinhar o nome
  const nameN = norm(secret.name);
  if (q.indexOf(nameN) >= 0 || nameN.split(' ').some(function (w) { return w.length > 3 && q.indexOf(w) >= 0; })) {
    return { ok: true, guess: true, yes: true };
  }

  const tags = secret.tags.map(norm);
  const type = norm(secret.type);

  // regras por tipo
  const rules = [
    { keys: ['animal', 'bicho', 'fera'], yes: type === 'animal' },
    { keys: ['pessoa', 'humano', 'gente', 'alguem', 'celebridade', 'famoso'], yes: type === 'pessoa' },
    { keys: ['objeto', 'coisa', 'item', 'ferramenta'], yes: type === 'objeto' },
    { keys: ['comida', 'comida', 'alimento', 'bebida', 'come', 'comer'], yes: type === 'comida' },
    { keys: ['natureza', 'planta', 'astro', 'ceu'], yes: type === 'natureza' },
    { keys: ['vivo', 'vida', 'ser vivo'], yes: tags.indexOf('vivo') >= 0 || type === 'animal' || type === 'pessoa' || tags.indexOf('planta') >= 0 },
    { keys: ['inanimado', 'nao vivo', 'sem vida'], yes: tags.indexOf('inanimado') >= 0 || tags.indexOf('nao vivo') >= 0 },
    { keys: ['homem', 'masculino', 'ele '], yes: tags.indexOf('homem') >= 0 },
    { keys: ['mulher', 'feminino', 'ela '], yes: tags.indexOf('mulher') >= 0 },
    { keys: ['voa', 'voar', 'ceu'], yes: tags.indexOf('voa') >= 0 || tags.indexOf('ceu') >= 0 },
    { keys: ['agua', 'mar', 'oceano', 'nada'], yes: tags.some(function (t) { return ['mar', 'oceano', 'agua', 'nada'].indexOf(t) >= 0; }) },
    { keys: ['africa'], yes: tags.indexOf('africa') >= 0 },
    { keys: ['asia'], yes: tags.indexOf('asia') >= 0 },
    { keys: ['brasil'], yes: tags.indexOf('brasil') >= 0 },
    { keys: ['domestico', 'casa', 'pet'], yes: tags.indexOf('domestico') >= 0 || tags.indexOf('pet') >= 0 || tags.indexOf('casa') >= 0 },
    { keys: ['selvagem'], yes: tags.indexOf('selvagem') >= 0 },
    { keys: ['grande', 'enorme', 'gigante'], yes: tags.indexOf('grande') >= 0 },
    { keys: ['pequeno', 'pequena'], yes: tags.indexOf('pequena') >= 0 || tags.indexOf('pequeno') >= 0 },
    { keys: ['eletronico', 'tecnologia', 'digital'], yes: tags.indexOf('eletronico') >= 0 || tags.indexOf('tecnologia') >= 0 },
    { keys: ['musica', 'instrumento', 'som'], yes: tags.indexOf('musica') >= 0 || tags.indexOf('instrumento') >= 0 },
    { keys: ['desporto', 'esporte', 'futebol', 'jogo'], yes: tags.some(function (t) { return ['desporto', 'futebol', 'jogador', 'jogar'].indexOf(t) >= 0; }) },
    { keys: ['famoso', 'conhecido', 'celebridade'], yes: tags.indexOf('famoso') >= 0 || tags.indexOf('famosa') >= 0 },
    { keys: ['real', 'existiu', 'historia'], yes: tags.indexOf('real') >= 0 || tags.indexOf('historia') >= 0 },
    { keys: ['metal'], yes: tags.indexOf('metal') >= 0 },
    { keys: ['comer', 'come-se', 'comestivel'], yes: type === 'comida' },
    { keys: ['mamifero'], yes: tags.indexOf('mamifero') >= 0 },
    { keys: ['ave', 'passaro'], yes: tags.indexOf('ave') >= 0 },
    { keys: ['peixe'], yes: tags.indexOf('peixe') >= 0 },
    { keys: ['reptil'], yes: tags.indexOf('reptil') >= 0 }
  ];

  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    for (let k = 0; k < r.keys.length; k++) {
      if (q.indexOf(r.keys[k]) >= 0) {
        return { ok: true, yes: !!r.yes, guess: false };
      }
    }
  }

  // tags diretas na pergunta
  for (let i = 0; i < tags.length; i++) {
    const t = tags[i];
    if (t.length >= 4 && q.indexOf(t) >= 0) {
      return { ok: true, yes: true, guess: false };
    }
  }

  // negacoes simples "nao e animal"
  if (/\bnao\b/.test(q)) {
    return {
      ok: true,
      yes: false,
      msg: 'Perguntas com "nao" confundem. Pergunta em positivo.\nEx: *e um animal?*'
    };
  }

  return {
    ok: true,
    yes: null,
    msg: 'Nao percebi bem. Tenta outra pergunta de Sim/Nao.\nEx: *e um animal?* / *e uma pessoa?* / *e grande?*'
  };
}

function endGame(groupJid) {
  active.delete(groupJid);
}

module.exports = [
  {
    name: 'quemsueu',
    aliases: ['whoami', 'adivinhar', 'quemsoueu', 'qse'],
    category: 'bn',
    description: 'Quem Sou Eu? — adivinhacao Sim/Nao',
    groupOnly: true,
    handler: async function (ctx) {
      if (active.has(ctx.jid)) {
        return ctx.reply(
          'Ja ha um jogo ativo neste grupo.\n' +
            '• *perguntaseu* texto\n' +
            '• *chute* nome\n' +
            '• *desistir* — revelar'
        );
      }
      const secret = pickSecret();
      active.set(ctx.jid, {
        secret: secret,
        asks: 0,
        startedBy: ctx.sender,
        startedAt: Date.now()
      });
      await ctx.reply(
        '╭──〔 🎭 𝐐𝐔𝐄𝐌 𝐒𝐎𝐔 𝐄𝐔? 〕──╮\n' +
          '> Pensei em algo secreto...\n' +
          '> Tipo: *animal*, *pessoa*, *objeto*...\n' +
          '❀────────────────❀\n' +
          '◈┃ *perguntaseu* e um animal?\n' +
          '◈┃ *perguntaseu* e famoso?\n' +
          '◈┃ *chute* leao\n' +
          '◈┃ *desistir* — revelar\n' +
          '╰──────────────────╯\n' +
          '> So perguntas de *Sim* ou *Nao*!'
      );
    }
  },
  {
    name: 'perguntaseu',
    aliases: ['question', 'pergunto', 'pse', 'ask', 'qsepergunta'],
    category: 'bn',
    description: 'Pergunta Sim/Nao no Quem Sou Eu',
    groupOnly: true,
    handler: async function (ctx) {
      const g = active.get(ctx.jid);
      if (!g) {
        return ctx.reply('Nenhum jogo ativo.\nUsa *quemsueu* para comecar.');
      }
      const text = (ctx.args || []).join(' ').trim() || (ctx.text || '').trim();
      if (!text) {
        return ctx.reply('Ex: *perguntaseuseu e um animal?*');
      }
      g.asks += 1;
      const res = answerYesNo(text, g.secret);
      if (res.guess) {
        endGame(ctx.jid);
        return ctx.reply(
          '╭──〔 🎉 𝐀𝐂𝐄𝐑𝐓𝐎𝐔! 〕──╮\n' +
            '◈┃ ' + tag(ctx.sender) + '\n' +
            '◈┃ Era: *' + g.secret.name + '*\n' +
            '◈┃ Perguntas: ' + g.asks + '\n' +
            '╰──────────────────╯\n' +
            '> *quemsueu* — novo jogo',
          { mentions: [ctx.sender] }
        );
      }
      if (res.msg && res.yes === null) {
        return ctx.reply('❓ ' + res.msg);
      }
      if (res.msg && res.yes === false && res.ok) {
        return ctx.reply('❓ ' + res.msg);
      }
      const ans = res.yes ? '✅ *SIM*' : '❌ *NÃO*';
      await ctx.reply(
        ans + '\n> Pergunta #' + g.asks + '\n> *chute* nome — se ja souberes'
      );
    }
  },
  {
    name: 'chute',
    aliases: ['guess', 'achoque', 'e'],
    category: 'bn',
    description: 'Chutar a resposta do Quem Sou Eu',
    groupOnly: true,
    handler: async function (ctx) {
      const g = active.get(ctx.jid);
      if (!g) {
        return ctx.reply('Nenhum jogo ativo. *quemsueu*');
      }
      const text = norm((ctx.args || []).join(' ') || ctx.text || '');
      if (!text) {
        return ctx.reply('Ex: *chute leao*');
      }
      const nameN = norm(g.secret.name);
      const hit =
        text === nameN ||
        nameN.indexOf(text) >= 0 ||
        text.indexOf(nameN) >= 0 ||
        nameN.split(' ').some(function (w) { return w.length > 3 && text.indexOf(w) >= 0; });
      if (hit) {
        endGame(ctx.jid);
        return ctx.reply(
          '╭──〔 🎉 𝐀𝐂𝐄𝐑𝐓𝐎𝐔! 〕──╮\n' +
            '◈┃ ' + tag(ctx.sender) + '\n' +
            '◈┃ Era: *' + g.secret.name + '*\n' +
            '◈┃ Perguntas: ' + g.asks + '\n' +
            '╰──────────────────╯',
          { mentions: [ctx.sender] }
        );
      }
      await ctx.reply('❌ Nao e *' + ((ctx.args || []).join(' ') || text) + '*. Continua a perguntar!');
    }
  },
  {
    name: 'desistir',
    aliases: ['revelar', 'desisto', 'forca'],
    category: 'bn',
    description: 'Revela o segredo do Quem Sou Eu',
    groupOnly: true,
    handler: async function (ctx) {
      const g = active.get(ctx.jid);
      if (!g) {
        return ctx.reply('Nenhum jogo ativo.');
      }
      const name = g.secret.name;
      const type = g.secret.type;
      endGame(ctx.jid);
      await ctx.reply(
        '╭──〔 🏳️ 𝐑𝐄𝐕𝐄𝐋𝐀𝐃𝐎 〕──╮\n' +
          '◈┃ Era: *' + name + '*\n' +
          '◈┃ Tipo: ' + type + '\n' +
          '◈┃ Perguntas: ' + g.asks + '\n' +
          '╰──────────────────╯\n' +
          '> *quemsueu* — jogar outra vez'
      );
    }
  }
];
