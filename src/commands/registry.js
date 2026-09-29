/**
 * Registro central de comandos do BEATRIZ BOT
 * Todo comando deve ser registrado aqui para aparecer no menu e ser executável.
 */

const commands = new Map();

function normalizeCmd(s) {
  if (!s) return '';
  try {
    return String(s).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
  } catch (_) {
    return String(s).toLowerCase().replace(/\s+/g, ' ').trim();
  }
}
 // name -> command object
const aliasesMap = new Map(); // alias -> name

/**
 * Estrutura de um comando:
 * {
 *   name: string,           // nome principal (único)
 *   aliases: string[],      // aliases (não contam como principais)
 *   category: string,       // admin, bn, economia, rpg, internet, dono, utilidades, stickers, seguranca, imagem, grupo, diversao, xp, aluguel
 *   description: string,
 *   usage: string,
 *   ownerOnly: boolean,
 *   adminOnly: boolean,     // admin do grupo ou bot admin
 *   botAdminOnly: boolean,  // admin do bot (ou dono)
 *   groupOnly: boolean,
 *   privateOnly: boolean,
 *   requiresSubscription: boolean,
 *   handler: async function(ctx)
 * }
 */

function register(cmd) {
  if (!cmd || !cmd.name || typeof cmd.handler !== 'function') {
    throw new Error(`Comando inválido: ${cmd?.name || 'sem nome'}`);
  }

  const name = normalizeCmd(cmd.name);
  if (commands.has(name)) {
    console.warn(`[REGISTRY] Comando já registrado, ignorando: ${name}`);
    return commands.get(name);
  }

  const entry = {
    name,
    aliases: (cmd.aliases || []).map(a => normalizeCmd(a)),
    category: cmd.category || 'outros',
    description: cmd.description || '',
    usage: cmd.usage || `!${name}`,
    ownerOnly: !!cmd.ownerOnly,
    adminOnly: !!cmd.adminOnly,
    botAdminOnly: !!cmd.botAdminOnly,
    groupOnly: !!cmd.groupOnly,
    privateOnly: !!cmd.privateOnly,
    requiresSubscription: !!cmd.requiresSubscription,
    handler: cmd.handler
  };

  commands.set(name, entry);

  for (const alias of entry.aliases) {
    if (aliasesMap.has(alias) || commands.has(alias)) {
      console.warn(`[REGISTRY] Alias conflitante ignorado: ${alias}`);
      continue;
    }
    aliasesMap.set(alias, name);
  }

  return entry;
}

function unregister(name) {
  if (!name) return false;
  const key = normalizeCmd(name);
  if (!commands.has(key)) return false;
  const entry = commands.get(key);
  for (const a of (entry.aliases || [])) aliasesMap.delete(a);
  commands.delete(key);
  return true;
}

function get(name) {
  if (!name) return null;
  const key = normalizeCmd(name);
  if (commands.has(key)) return commands.get(key);
  if (aliasesMap.has(key)) return commands.get(aliasesMap.get(key));
  return null;
}

function getAll() {
  return Array.from(commands.values());
}


// HIDE_FROM_MENU_SHORTS — 1-9 e a,b,c (connect4 / lixo) nao aparecem em menus
function isHiddenMenuName(name) {
  const n = String(name || '').toLowerCase();
  if (/^[0-9]$/.test(n)) return true;
  if (/^[abc]$/.test(n)) return true;
  return false;
}

function getByCategory(category) {
  return getAll().filter(c => c.category === category && !c.hideFromMenu && !isHiddenMenuName(c.name));
}

function getMainCommands() {
  return getAll(); // principais = registrados (aliases não estão aqui)
}

function getAliasesCount() {
  return aliasesMap.size;
}

function stats() {
  const cats = {};
  for (const cmd of commands.values()) {
    cats[cmd.category] = (cats[cmd.category] || 0) + 1;
  }
  return {
    totalMain: commands.size,
    totalAliases: aliasesMap.size,
    byCategory: cats
  };
}

function clear() {
  commands.clear();
  aliasesMap.clear();
}

module.exports = {
  unregister,
  register,
  get,
  getAll,
  getByCategory,
  getMainCommands,
  getAliasesCount,
  stats,
  clear
};
