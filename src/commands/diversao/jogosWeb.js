/**
 * MENU JOGOS WEB — isolado
 * NÃO entra no Menu Diversão (category: jogos + hideFromMenu)
 */

const GAMES = [
  { n:1,  nome:'Drift Hunters', short:'jogo de corrida', tipo:'Corrida / Drift', multi:'Não', sobre:'Jogo de carros focado em drift, com vários carros, pistas e opções de personalização.', url:'https://www.crazygames.com/game/drift-hunters' },
  { n:2,  nome:'Agar.io', short:'jogo multiplayer', tipo:'IO / Sobrevivência', multi:'Sim', sobre:'Controla uma célula, come e cresce no mapa online.', url:'https://agar.io' },
  { n:3,  nome:'AdventureQuest Worlds', short:'jogo RPG', tipo:'MMORPG', multi:'Sim', sobre:'RPG online gratuito com quests e classes.', url:'https://www.aq.com' },
  { n:4,  nome:'Slither.io', short:'jogo multiplayer', tipo:'IO / Cobra', multi:'Sim', sobre:'Serpente online: come orbes e evita bater noutras.', url:'https://slither.io' },
  { n:5,  nome:'Fireboy and Watergirl', short:'jogo de aventura', tipo:'Puzzle cooperativo', multi:'Sim (local)', sobre:'Dois elementos, um templo, um objetivo em cooperação.', url:'https://www.coolmathgames.com/0-fireboy-and-watergirl-forest-temple' },
  { n:6,  nome:'Duck Life 4', short:'jogo de aventura', tipo:'Treino / Corrida', multi:'Não', sobre:'Treina o pato e vence corridas.', url:'https://poki.com/en/g/duck-life-4' },
  { n:7,  nome:'Slope', short:'jogo de velocidade', tipo:'Corrida infinita', multi:'Não', sobre:'Controla a bola na rampa infinita sem cair.', url:'https://poki.com/en/g/slope' },
  { n:8,  nome:'2048', short:'jogo de puzzle', tipo:'Puzzle numérico', multi:'Não', sobre:'Junta blocos iguais até chegar ao 2048.', url:'https://play2048.co' },
  { n:9,  nome:'Isleward', short:'jogo MMORPG', tipo:'MMORPG pixel', multi:'Sim', sobre:'MMORPG pixel art open-source no browser.', url:'https://isleward.com' },
  { n:10, nome:'Skribbl.io', short:'jogo de desenho', tipo:'Desenho / Adivinhação', multi:'Sim', sobre:'Desenha a palavra secreta; os outros tentam adivinhar.', url:'https://skribbl.io' },
  { n:11, nome:'Gartic.io', short:'jogo de desenho', tipo:'Desenho / Adivinhação', multi:'Sim', sobre:'Salas de desenho online com vários modos.', url:'https://gartic.io' },
  { n:12, nome:'Bonk.io', short:'jogo de ação', tipo:'Física / PvP', multi:'Sim', sobre:'Batalhas rápidas com física e mapas da comunidade.', url:'https://bonk.io' },
  { n:13, nome:'Paper.io 2', short:'jogo multiplayer', tipo:'Território', multi:'Sim', sobre:'Marca território e defende a tua área no mapa.', url:'https://paper-io.com' },
  { n:14, nome:'Shell Shockers', short:'jogo FPS', tipo:'FPS / Ovos', multi:'Sim', sobre:'FPS multiplayer em que todos são ovos armados.', url:'https://shellshock.io' },
  { n:15, nome:'ZombsRoyale.io', short:'jogo battle royale', tipo:'Battle Royale 2D', multi:'Sim', sobre:'Battle royale top-down com armas e zona.', url:'https://zombsroyale.io' },
  { n:16, nome:'Krunker', short:'jogo FPS', tipo:'FPS pixel', multi:'Sim', sobre:'FPS rápido no browser, estilo pixel art.', url:'https://krunker.io' },
  { n:17, nome:'Survev.io', short:'jogo battle royale', tipo:'Battle Royale', multi:'Sim', sobre:'Battle royale no browser (estilo Surviv.io).', url:'https://survev.io' },
  { n:18, nome:'Drift Boss', short:'jogo de corrida', tipo:'Arcade / Drift', multi:'Não', sobre:'Desliza na plataforma sem cair — viciante.', url:'https://poki.com/en/g/drift-boss' },
  { n:19, nome:'Drift.io', short:'jogo de corrida', tipo:'Drift multiplayer', multi:'Sim', sobre:'Drift online com upgrades e corridas.', url:'https://drift.io' },
  { n:20, nome:'Escape Road', short:'jogo de fuga', tipo:'Fuga policial', multi:'Não', sobre:'Foge da polícia em estradas infinitas.', url:'https://www.crazygames.com/game/escape-road' },
  { n:21, nome:'Drive Mad', short:'jogo de corrida', tipo:'Física veicular', multi:'Não', sobre:'Veículos malucos e pistas com física.', url:'https://poki.com/en/g/drive-mad' },
  { n:22, nome:'Moto X3M', short:'jogo de motocross', tipo:'Motocross / Stunt', multi:'Não', sobre:'Motas, acrobacias e obstáculos.', url:'https://poki.com/en/g/moto-x3m' },
  { n:23, nome:'Madalin Stunt Cars 2', short:'jogo de carros', tipo:'Stunt / Mundo aberto', multi:'Sim', sobre:'Carros desportivos, stunts e mapa livre.', url:'https://www.crazygames.com/game/madalin-stunt-cars-2' },
  { n:24, nome:'Highway Traffic', short:'jogo de trânsito', tipo:'Trânsito / Corrida', multi:'Não', sobre:'Desvia do trânsito na autoestrada.', url:'https://poki.com/en/g/highway-traffic' },
  { n:25, nome:'Super Star Car', short:'jogo de corrida', tipo:'Corrida arcade', multi:'Não', sobre:'Corridas arcade rápidas com vários carros.', url:'https://www.crazygames.com/game/super-star-car' },
  { n:26, nome:'Grand Action Simulator', short:'jogo de ação', tipo:'Ação / Sandbox', multi:'Não', sobre:'Mundo aberto com ação e missões de carro.', url:'https://www.crazygames.com/game/grand-action-hero' },
  { n:27, nome:'Fallen London', short:'jogo RPG', tipo:'RPG narrativo', multi:'Sim', sobre:'RPG em texto numa Londres subterrânea.', url:'https://www.fallenlondon.com' },
  { n:28, nome:'Shakes & Fidget', short:'jogo RPG', tipo:'RPG humorístico', multi:'Sim', sobre:'RPG com humor, dungeons e PvP.', url:'https://sfgame.net' },
  { n:29, nome:'Hero Zero', short:'jogo RPG', tipo:'Super-herói', multi:'Sim', sobre:'Cria o teu herói e luta na cidade.', url:'https://www.herozerogame.com' },
  { n:30, nome:'Elvenar', short:'jogo de estratégia', tipo:'City builder', multi:'Sim', sobre:'Constrói cidade de elfos ou humanos.', url:'https://en.elvenar.com' },
  { n:31, nome:'Forge of Empires', short:'jogo de estratégia', tipo:'Estratégia histórica', multi:'Sim', sobre:'Evolui a cidade através das eras.', url:'https://www.forgeofempires.com' },
  { n:32, nome:'Tribal Wars 2', short:'jogo de estratégia', tipo:'Estratégia / Guerra', multi:'Sim', sobre:'Aldeias, tribos e conquista do mapa.', url:'https://www.tribalwars2.com' },
  { n:33, nome:'Drakensang Online', short:'jogo RPG', tipo:'MMORPG 3D', multi:'Sim', sobre:'MMORPG de fantasia com combate em tempo real.', url:'https://www.drakensang.com' },
  { n:34, nome:'DarkOrbit Reloaded', short:'jogo espacial', tipo:'MMO espacial', multi:'Sim', sobre:'Naves, facções e combates no espaço.', url:'https://www.darkorbit.com' },
  { n:35, nome:'Stickman Hook', short:'jogo arcade', tipo:'Balanço / Timing', multi:'Não', sobre:'Balança de gancho em gancho sem cair.', url:'https://poki.com/en/g/stickman-hook' },
  { n:36, nome:'OvO', short:'jogo de plataforma', tipo:'Parkour', multi:'Não', sobre:'Parkour 2D rápido com fases e velocidade.', url:'https://poki.com/en/g/ovo' },
  { n:37, nome:'Tunnel Rush', short:'jogo arcade', tipo:'Túnel / Reflexos', multi:'Não', sobre:'Desvia de obstáculos em alta velocidade.', url:'https://poki.com/en/g/tunnel-rush' },
  { n:38, nome:'Rooftop Snipers', short:'jogo de ação', tipo:'Duelo de snipers', multi:'Sim', sobre:'Duelos engraçados de sniper em telhados.', url:'https://www.crazygames.com/game/rooftop-snipers' },
  { n:39, nome:'Getaway Shootout', short:'jogo de ação', tipo:'Corrida caótica', multi:'Sim', sobre:'Chega ao carro primeiro a tiro e empurrões.', url:'https://www.crazygames.com/game/getaway-shootout' },
  { n:40, nome:'Soccer Physics', short:'jogo de futebol', tipo:'Futebol / Física', multi:'Sim', sobre:'Futebol com física exagerada e hilariante.', url:'https://www.crazygames.com/game/soccer-physics' },
  { n:41, nome:'Basket Bros', short:'jogo de basquete', tipo:'Basquete 1v1', multi:'Sim', sobre:'Basquete 2D multiplayer rápido.', url:'https://basketbros.io' },
  { n:42, nome:'Little Alchemy 2', short:'jogo de puzzle', tipo:'Criação / Elementos', multi:'Não', sobre:'Combina elementos e descobre novos itens.', url:'https://littlealchemy2.com' },
  { n:43, nome:'Cookie Clicker', short:'jogo idle', tipo:'Clicker / Idle', multi:'Não', sobre:'Produz cookies e evolui o império.', url:'https://orteil.dashnet.org/cookieclicker/' },
  { n:44, nome:'The Impossible Quiz', short:'jogo de quiz', tipo:'Quiz trapaceiro', multi:'Não', sobre:'Perguntas absurdas onde a lógica falha.', url:'https://www.crazygames.com/game/the-impossible-quiz' },
  { n:45, nome:"World's Hardest Game", short:'jogo de habilidade', tipo:'Precisão / Labirinto', multi:'Não', sobre:'Jogo clássico de precisão extremamente difícil.', url:'https://www.coolmathgames.com/0-worlds-hardest-game' },
  { n:46, nome:'Lichess', short:'jogo de xadrez', tipo:'Xadrez online', multi:'Sim', sobre:'Xadrez gratuito com ranking e torneios.', url:'https://lichess.org' },
  { n:47, nome:'Chess.com', short:'jogo de xadrez', tipo:'Xadrez online', multi:'Sim', sobre:'Joga xadrez, puzzles e partidas online.', url:'https://www.chess.com/play' },
  { n:48, nome:'Sudoku Online', short:'jogo de puzzle', tipo:'Sudoku', multi:'Não', sobre:'Sudoku clássico com vários níveis.', url:'https://sudoku.com' },
  { n:49, nome:'Minesweeper Online', short:'jogo de puzzle', tipo:'Campo minado', multi:'Não', sobre:'Campo minado clássico no browser.', url:'https://minesweeper.online' },
  { n:50, nome:'Bloons TD 5', short:'jogo tower defense', tipo:'Tower Defense', multi:'Não', sobre:'Defende a pista contra ondas de balões.', url:'https://ninjakiwi.com/Games/Tower-Defense/Play/Bloons-Tower-Defense-5.html' },
  { n:51, nome:'Free Kick Pro 3D', short:'futebol / faltas', tipo:'Futebol / Cobranças', multi:'Não', sobre:'Cobranças de falta em 3D: curva, força e precisão para marcar o golo.', url:'https://www.silvergames.com/en/3d-free-kick' },
  { n:52, nome:'Kogama: Football Adventure', short:'futebol + aventura', tipo:'Futebol / Parkour', multi:'Sim', sobre:'Aventura 3D com bola de futebol, obstáculos e desafios multiplayer.', url:'https://www.y8.com/games/kogama_football_adventure' },
  { n:53, nome:'City Runner 3D', short:'corrida + parkour', tipo:'Corrida / Parkour', multi:'Não', sobre:'Corre pela cidade em 3D, salta obstáculos e evita obstáculos no percurso.', url:'https://poki.com/en/g/temple-run-2' },
  { n:54, nome:'Port Azur 3D', short:'corrida simulador', tipo:'Corrida / Simulador', multi:'Não', sobre:'Corrida 3D com sensação de condução e pistas variadas.', url:'https://www.crazygames.com/game/madalin-stunt-cars-2' },
  { n:55, nome:'Alpine Ski 3D', short:'esqui 3D', tipo:'Esqui / Desporto', multi:'Não', sobre:'Desce a montanha de esqui em 3D, desvia de obstáculos e chega primeiro.', url:'https://bubblebox.com/alpine-ski-master' },
  { n:56, nome:'Xtreme Motorbikes', short:'motos 3D', tipo:'Motos / Direção', multi:'Não', sobre:'Motas em 3D com acrobacias e percurso extremo.', url:'https://poki.com/en/g/moto-x3m' },
  { n:57, nome:'Next Drive', short:'condução 3D', tipo:'Condução / Física', multi:'Não', sobre:'Condução 3D com física realista e estradas livres.', url:'https://poki.com/en/g/drive-mad' },
  { n:58, nome:'Evo-F', short:'corrida carros 3D', tipo:'Corrida / Carros', multi:'Não', sobre:'Corrida de carros 3D com evolução e velocidade.', url:'https://www.crazygames.com/game/drift-hunters' },
  { n:59, nome:'City Rider 3D', short:'simulador condução', tipo:'Simulador / Cidade', multi:'Não', sobre:'Simulador de condução pela cidade em ambiente 3D.', url:'https://poki.com/en/g/highway-traffic' },
  { n:60, nome:'Cat Simulator: Kitty Craft', short:'simulador de gato', tipo:'Simulador / Exploração', multi:'Não', sobre:'Controla um gato, explora o mundo e diverte-te no modo livre.', url:'https://www.crazygames.com/game/cat-simulator-kitty-craft' },
];

function circ(n) {
  return '`' + String(n) + '`';
}

function listaJogos() {
  let t = '╭━━━〔🌸 *MENU JOGOS* 🌸〕━━━╮\n┃\n';
  for (const g of GAMES) {
    t += '┃ ' + circ(g.n) + ' *' + g.nome + '*: > ' + g.short + '\n';
  }
  t += '┃\n┃ Digite: *jogon1*\n┃ para abrir o jogo nº1\n';
  t += '╰━━━━━━━━━━━━━━━━━━━━╯\n\n';
  t += '🔎 Exemplo: *jogon1*';
  return t;
}

function ficha(g) {
  return (
    '╭━━〔 🎮 *' + g.nome.toUpperCase() + '* 〕━━╮\n' +
    '┃\n' +
    '┃ 🎮 *Tipo:* ' + g.tipo + '\n' +
    '┃ 👥 *Multiplayer:* ' + g.multi + '\n' +
    '┃ 🌐 *Plataforma:* Navegador\n' +
    '┃ 📱 *Funciona no celular:* Sim\n' +
    '┃ 📦 *Instalação:* Não precisa\n' +
    '┃\n' +
    '┃ 📝 *Sobre:*\n' +
    '┃ ' + g.sobre + '\n' +
    '┃\n' +
    '┃ 🔗 *JOGAR AGORA:*\n' +
    '┃ ' + g.url + '\n' +
    '╰━━━━━━━━━━━━━━━━━━━━╯'
  );
}

function getByN(n) {
  return GAMES.find(function (x) { return x.n === n; }) || null;
}

const cmds = [
  {
    name: 'jogos',
    aliases: ['menujogos', 'listajogos', 'jogosweb', 'menujogo', 'webgames', 'menuwebgames', 'menugames'],
    category: 'jogos',
    description: 'Menu JOGOS WEB',
    hideFromMenu: false,
    handler: async function (ctx) {
      await ctx.reply(listaJogos());
    }
  },
  {
    name: 'jogon',
    aliases: ['jogo'],
    category: 'jogos',
    description: 'Ficha jogon N',
    hideFromMenu: true,
    handler: async function (ctx) {
      const n = parseInt(String((ctx.args && ctx.args[0]) || '').replace(/\D/g, ''), 10);
      if (!n || n < 1 || n > 60) {
        return ctx.reply('❌ Use *jogon1* até *jogon60*\nLista: *jogos*');
      }
      const g = getByN(n);
      if (!g) return ctx.reply('❌ Jogo não encontrado.');
      await ctx.reply(ficha(g));
    }
  }
];

for (let i = 1; i <= 60; i++) {
  (function (num) {
    cmds.push({
      name: 'jogon' + num,
      aliases: [],
      category: 'jogos',
      description: 'Jogo web #' + num,
      hideFromMenu: true,
      handler: async function (ctx) {
        const g = getByN(num);
        if (!g) return ctx.reply('❌ Jogo não encontrado.');
        await ctx.reply(ficha(g));
      }
    });
  })(i);
}

module.exports = cmds;
