/**
 * Menu / interativo — nativeFlow single_select (formato moderno)
 */

const CATEGORIES = [
  { id: 'downloads', title: 'Menu Download', description: 'Baixe musicas, videos e arquivos', emoji: '📥' },
  { id: 'jogos', title: 'Menu Jogos', description: 'Mini-games e webgames', emoji: '🎮' },
  { id: 'musica', title: 'Menu Musica', description: 'Audio, play e TTS', emoji: '🎵' },
  { id: 'stickers', title: 'Menu Stickers', description: 'Figurinhas e imagem', emoji: '🎨' },
  { id: 'diversao', title: 'Menu Diversao', description: 'Brincadeiras e BN', emoji: '🎭' },
  { id: 'adm', title: 'Menu ADM', description: 'Gerenciar o grupo', emoji: '🛡️' },
  { id: 'dono', title: 'Menu Dono', description: 'Area exclusiva do dono', emoji: '👑' },
  { id: 'grupo', title: 'Menu Grupo', description: 'Utilitarios de grupo', emoji: '👥' },
  { id: 'rpg', title: 'Menu RPG/Familia', description: 'RPG e familia', emoji: '❤️' },
  { id: 'util', title: 'Menu Utilidades', description: 'IA, ping, perfil', emoji: '🧰' },
  { id: 'modos', title: 'Menu Modos', description: 'Modos do bot', emoji: '⚙️' },
  { id: 'aluguel', title: 'Menu Aluguel', description: 'Planos e assinatura', emoji: '🏠' }
];

const CMD_MAP = {
  downloads: [
    { id: 'menudownload', title: 'menudownload', desc: 'Menu download completo' },
    { id: 'ytplay', title: 'ytplay', desc: 'Tocar musica YT' },
    { id: 'ytd', title: 'ytd', desc: 'Baixar video' },
    { id: 'yta', title: 'yta', desc: 'Baixar audio' },
    { id: 'tk', title: 'tk', desc: 'TikTok' },
    { id: 'ig', title: 'ig', desc: 'Instagram' },
    { id: 'play', title: 'play', desc: 'Pesquisar/tocar' }
  ],
  jogos: [
    { id: 'menuwebgames', title: 'menuwebgames', desc: 'Jogos navegador' },
    { id: 'jogodavelha', title: 'jogodavelha', desc: 'Jogo da velha' },
    { id: 'connect4', title: 'connect4', desc: 'Ligue 4' }
  ],
  musica: [
    { id: 'ytplay', title: 'ytplay', desc: 'Tocar YT' },
    { id: 'crad', title: 'crad', desc: 'Criar audio TTS' }
  ],
  stickers: [
    { id: 's', title: 's', desc: 'Criar figurinha' },
    { id: 'toimg', title: 'toimg', desc: 'Sticker para imagem' },
    { id: 'gif', title: 'gif', desc: 'Sticker para GIF' }
  ],
  diversao: [
    { id: 'menudiversao', title: 'menudiversao', desc: 'Menu diversao' },
    { id: 'menubn', title: 'menubn', desc: 'Menu BN' }
  ],
  adm: [{ id: 'menuadm', title: 'menuadm', desc: 'Menu ADM' }],
  dono: [{ id: 'menudono', title: 'menudono', desc: 'Menu Dono' }],
  grupo: [{ id: 'menugrupo', title: 'menugrupo', desc: 'Menu Grupo' }],
  rpg: [{ id: 'menurpg', title: 'menurpg', desc: 'RPG/Familia' }],
  util: [
    { id: 'bia', title: 'bia', desc: 'IA Beatriz' },
    { id: 'ping', title: 'ping', desc: 'Latencia' },
    { id: 'perfil', title: 'perfil', desc: 'Perfil' }
  ],
  modos: [{ id: 'menumodos', title: 'menumodos', desc: 'Menu Modos' }],
  aluguel: [{ id: 'aluguel', title: 'aluguel', desc: 'Planos' }]
};

function getJid(ctx) {
  return ctx.jid || ctx.chatId || (ctx.msg && ctx.msg.key && ctx.msg.key.remoteJid);
}

function loadBaileys() {
  try { return require('@whiskeysockets/baileys'); } catch (_) {}
  try { return require('@adiwajshing/baileys'); } catch (_) {}
  return null;
}

async function sendInteractiveList(sock, jid, { bodyText, footerText, buttonTitle, sections }) {
  const baileys = loadBaileys();
  const rows = [];
  for (const sec of sections) {
    for (const r of sec.rows) {
      rows.push({
        header: r.header || '',
        title: String(r.title).slice(0, 24),
        description: String(r.description || '').slice(0, 72),
        id: r.rowId || r.id
      });
    }
  }

  // 1) nativeFlow single_select (formato atual)
  if (baileys && baileys.generateWAMessageFromContent && baileys.proto) {
    try {
      const { generateWAMessageFromContent, proto } = baileys;
      const native = proto.Message.InteractiveMessage.NativeFlowMessage.create({
        buttons: [
          {
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
              title: buttonTitle || 'Ver Menus',
              sections: [
                {
                  title: sections[0] && sections[0].title ? sections[0].title : 'Categorias',
                  rows: rows
                }
              ]
            })
          }
        ]
      });

      const interactive = proto.Message.InteractiveMessage.create({
        body: proto.Message.InteractiveMessage.Body.create({ text: bodyText }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: footerText || 'BEATRIZ BOT' }),
        header: proto.Message.InteractiveMessage.Header.create({
          title: 'BEATRIZ BOT',
          subtitle: 'Menu interativo',
          hasMediaAttachment: false
        }),
        nativeFlowMessage: native
      });

      const msg = generateWAMessageFromContent(
        jid,
        {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2
              },
              interactiveMessage: interactive
            }
          }
        },
        {}
      );

      await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
      console.log('[slash] sent nativeFlow single_select');
      return 'nativeFlow';
    } catch (e) {
      console.log('[slash] nativeFlow fail:', e && e.message);
    }
  }

  // 2) listMessage classico
  try {
    await sock.sendMessage(jid, {
      text: bodyText,
      footer: footerText || 'BEATRIZ BOT',
      title: 'BEATRIZ BOT',
      buttonText: buttonTitle || 'Ver Menus',
      sections: sections
    });
    console.log('[slash] sent classic list');
    return 'classic';
  } catch (e2) {
    console.log('[slash] classic fail:', e2 && e2.message);
  }

  // 3) fallback texto
  let t = bodyText + '\n\n';
  let n = 1;
  for (const sec of sections) {
    for (const r of sec.rows) {
      t += '*' + n + '.* ' + r.title + '\n';
      n++;
    }
  }
  t += '\n_Digite o numero da opcao_';
  await sock.sendMessage(jid, { text: t });
  return 'text';
}

async function openMainMenu(ctx) {
  const jid = getJid(ctx);
  if (!ctx.sock || !jid) return;

  const sections = [
    {
      title: 'Categorias de Menus',
      rows: CATEGORIES.map((c) => ({
        title: (c.emoji ? c.emoji + ' ' : '') + c.title,
        description: c.description,
        rowId: 'slashcat:' + c.id
      }))
    }
  ];

  const mode = await sendInteractiveList(ctx.sock, jid, {
    bodyText: 'Escolha A Baixo uma categoria:',
    footerText: '© Beatriz Bot • Prefixo /',
    buttonTitle: 'Ver Menus',
    sections
  });
  console.log('[slash] main mode=', mode);
}

async function openCategory(ctx, catId) {
  const jid = getJid(ctx);
  if (!ctx.sock || !jid) return;
  if (catId === '__main__') return openMainMenu(ctx);

  const cat = CATEGORIES.find((c) => c.id === catId);
  const cmds = CMD_MAP[catId] || [];
  if (!cat) return ctx.reply('Categoria invalida. Use /menu');

  const sections = [
    {
      title: cat.title,
      rows: [
        ...cmds.map((c) => ({
          title: c.title,
          description: c.desc,
          rowId: 'slashcmd:' + c.id
        })),
        {
          title: 'Voltar ao menu',
          description: 'Menu principal',
          rowId: 'slashcat:__main__'
        }
      ]
    }
  ];

  const mode = await sendInteractiveList(ctx.sock, jid, {
    bodyText: 'Selecione um comando de ' + cat.title + ':',
    footerText: '© Beatriz Bot • /menu',
    buttonTitle: 'Ver Comandos',
    sections
  });
  console.log('[slash] cat mode=', mode);
}

async function runExistingCommand(ctx, cmdName) {
  const maps = [global.commandRegistry, global.commands, ctx.registry].filter(Boolean);
  let entry = null;
  for (const reg of maps) {
    try {
      if (typeof reg.get === 'function') entry = reg.get(cmdName);
      else if (reg.commands && reg.commands.get) entry = reg.commands.get(cmdName);
      else if (reg[cmdName]) entry = reg[cmdName];
      if (entry) break;
    } catch (_) {}
  }
  if (entry && typeof (entry.handler || entry) === 'function') {
    const fn = entry.handler || entry;
    return await fn(Object.assign({}, ctx, { command: cmdName, args: [], prefix: '/', text: cmdName }));
  }
  return ctx.reply('📌 *' + cmdName + '*\nUse: */' + cmdName + '* ou *!' + cmdName + '*');
}

async function handleSlashListSelection(ctx, rowId) {
  if (!rowId || typeof rowId !== 'string') return false;
  // nativeFlow pode vir como id puro
  const id = String(rowId);
  if (!id.startsWith('slash')) return false;
  if (id === 'slashcat:__main__') {
    await openMainMenu(ctx);
    return true;
  }
  if (id.startsWith('slashcat:')) {
    await openCategory(ctx, id.slice(9));
    return true;
  }
  if (id.startsWith('slashcmd:')) {
    await runExistingCommand(ctx, id.slice(9));
    return true;
  }
  return false;
}

// nativeFlow interactive response
async function handleInteractiveResponse(ctx, msg) {
  try {
    const ir = msg && msg.message && msg.message.interactiveResponseMessage;
    if (!ir) return false;
    let rowId = '';
    if (ir.nativeFlowResponseMessage && ir.nativeFlowResponseMessage.paramsJson) {
      try {
        const p = JSON.parse(ir.nativeFlowResponseMessage.paramsJson);
        rowId = p.id || p.selectedId || p.rowId || '';
      } catch (_) {}
    }
    if (!rowId && ir.listResponseMessage) {
      rowId = (ir.listResponseMessage.singleSelectReply && ir.listResponseMessage.singleSelectReply.selectedRowId) || '';
    }
    if (rowId) return handleSlashListSelection(ctx, rowId);
  } catch (e) {
    console.error('interactive resp', e);
  }
  return false;
}

module.exports = {
  openMainMenu,
  openCategory,
  handleSlashListSelection,
  handleInteractiveResponse,
  CATEGORIES
};
