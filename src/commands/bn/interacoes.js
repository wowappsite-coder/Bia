const { tag } = require('../../utils/mention');

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
async function getTarget(ctx) {
  let target = null;
  try { if (ctx.getMentionedOrQuoted) target = ctx.getMentionedOrQuoted(); } catch (_) {}
  if (!target && ctx.mentioned && ctx.mentioned[0]) target = ctx.mentioned[0];
  if (target && target === ctx.sender) target = null;
  return target;
}
function fill(template, a, b) {
  return template.split('{a}').join(tag(a)).split('{b}').join(b ? tag(b) : 'alguem');
}
async function replyAction(ctx, withTarget, alone) {
  const target = await getTarget(ctx);
  const msg = target ? pick(withTarget) : pick(alone);
  const text = fill(msg, ctx.sender, target);
  await ctx.reply(text, { mentions: target ? [ctx.sender, target] : [ctx.sender] });
}

const BATER = {
  with: [
    '👊 {a} deu um tapa seco em {b}! O eco ainda esta no grupo 😂',
    '💥 {a} partiu pra cima de {b}. Alguem segura!',
    '🥊 {a} treinou boxe em {b}. Pontuacao: 10/10',
    '👋 {a} bateu em {b} com carinho... ou sera que nao?',
    '🫡 {a} aplicou o famoso "acordo" em {b}',
    '⚡ {a} nao pensou duas vezes e bateu em {b}!',
    '🎯 Mira certeira: {a} acertou {b} em cheio',
    '😤 {a} perdeu a paciencia e bateu em {b}'
  ],
  alone: [
    '👊 {a} bateu no ar. Inimigo imaginario derrotado!',
    '🥊 {a} treinou sozinho. Proximo round em breve',
    '💨 {a} deu um soco no vento. O vento nem sentiu',
    '😂 {a} quer bater em alguem? Marca: *bater @user*'
  ]
};
const TAPA = {
  with: [
    '🖐️ *SLAP!* {a} estapeou {b} na frente de todo mundo',
    '😅 {a} deu um tapa de novela em {b}',
    '📻 O som do tapa de {a} em {b} ecoou no chat',
    '🎭 {a} soltou o tapa dramatico em {b}',
    '🔥 {a} nao perdoou: tapa limpo em {b}',
    '👏 {a} aplaudiu a cara de {b}... com a mao aberta',
    '🌪️ Tapa tornado de {a} em {b}!',
    '💫 {b} ainda esta processando o tapa de {a}'
  ],
  alone: [
    '🖐️ {a} deu um tapa em si mesmo. Autoestima em dia?',
    '🪞 {a} treinou tapa no espelho',
    '😂 Marca alguem: *tapa @user*'
  ]
};
const MATAR = {
  with: [
    '☠️ {a} "eliminou" {b} no modo brincadeira. Respawn em 3... 2... 1...',
    '🎮 {a} deu GAME OVER em {b}. E so roleplay, calma!',
    '👻 {b} foi pro limbo do grupo por causa de {a}. Fantasminha 😂',
    '🏁 {a} finalizou {b} no jogo da zoeira',
    '💥 {a} usou o combo secreto em {b}. Ficcional, obvio!',
    '🪦 R.I.P. {b} (temporario). Culpado: {a} — modo zoeira',
    '🎭 {a} inventou o plot twist: {b} saiu de cena',
    '🪄 Puf! {a} fez {b} desaparecer... ate a proxima mensagem'
  ],
  alone: [
    '☠️ {a} tentou o modo dramatico sozinho. Marca: *matar @user*',
    '🎮 {a} esta no lobby esperando oponente ficticio',
    '👻 Use *matar @user* (so brincadeira!)'
  ]
};
const MORDER = {
  with: [
    '🦷 {a} mordeu {b}! Vacina antitetanica recomendada 😂',
    '🐶 {a} canalizou o cachorro e mordeu {b}',
    '🧛 {a} no modo vampiro: mordida em {b}',
    '🥖 {a} achou que {b} era pao e mordeu',
    '😈 {a} deixou a marca da mordida em {b}',
    '😂 {b} agora tem o carimbo de {a}',
    '🦈 Nham! {a} atacou {b}',
    '📌 {a} mordeu {b} de leve... ou nao'
  ],
  alone: [
    '🦷 {a} mordeu o ar. Zero calorias',
    '🐶 Use *morder @user*',
    '😂 Sem alvo pra morder!'
  ]
};
const CARETA = {
  with: [
    '😜 {a} fez a careta mais feia do grupo pra {b}',
    '🤪 {a} puxou o rosto e assustou {b}',
    '😝 {a} mostrou a lingua pra {b}',
    '🫠 {a} derreteu o rosto so pra provocar {b}',
    '🤡 {a} no modo palhaco mirando {b}',
    '😏 {a} soltou a careta lendaria em {b}',
    '🎭 {a} vs {b}: batalha de caretas',
    '📸 Alguem printa a careta de {a} pra {b}'
  ],
  alone: [
    '😜 {a} fez careta pro espelho do chat',
    '🤪 {a} treinou careta sozinho',
    '😝 Marca: *careta @user*'
  ]
};
const CHUTE = {
  with: [
    '🦵 {a} deu um chute em {b}! Gol de placa 😂',
    '⚽ {a} tratou {b} como bola. CHUTE!',
    '💨 {a} chutou {b} pra fora da conversa (de brincadeira)',
    '🥋 {a} aplicou o chute de kung fu em {b}',
    '🎯 Chute certeiro de {a} em {b}',
    '🚀 {b} quase voou com o chute de {a}',
    '😎 {a} chutou {b} e nem suou',
    '📣 Juiz: falta de {a} em {b}... mas valeu a zoeira'
  ],
  alone: [
    '🦵 {a} chutou o vento. Falta de alvo!',
    '⚽ {a} treinou bicicleta sozinho',
    '😂 Use *chute @user*'
  ]
};

function makeCmd(name, aliases, pack, description) {
  return {
    name: name,
    aliases: aliases || [],
    category: 'bn',
    description: description,
    handler: async function (ctx) {
      await replyAction(ctx, pack.with, pack.alone);
    }
  };
}

module.exports = [
  makeCmd('bater', ['soco', 'punch'], BATER, 'Bate em alguem (zoeira)'),
  makeCmd('tapa', ['slap', 'estape'], TAPA, 'Da um tapa (zoeira)'),
  makeCmd('matar', ['kill', 'eliminar'], MATAR, 'Elimina no modo brincadeira'),
  makeCmd('morder', ['bite', 'mordida'], MORDER, 'Morde alguem (zoeira)'),
  makeCmd('careta', ['face', 'grimace'], CARETA, 'Faz careta pra alguem'),
  makeCmd('chute', ['kick', 'chutar'], CHUTE, 'Chuta alguem (zoeira)')
];
