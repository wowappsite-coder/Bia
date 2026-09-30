/**
 * Auditoria objetiva completa - não precisa de npm install
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');
const originalRequire = Module.prototype.require;

const mockDb = {
  prepare: () => ({
    get: () => null,
    all: () => [],
    run: () => ({ lastInsertRowid: 1, changes: 1 })
  }),
  exec: () => {},
  pragma: () => {}
};

const mockDbModule = {
  getDb: () => mockDb,
  getUser: () => ({ wallet: 0, bank: 0, xp: 0, level: 1, messages: 0, inventory: '{}', number: '123' }),
  updateUser: () => {},
  getGroup: () => ({ mutados: '[]', blocked_cmds: '[]', ddd_list: '[]', welcome: 1, goodbye: 0 }),
  updateGroup: () => {},
  isBotAdmin: () => false,
  isBlacklisted: () => false,
  getSetting: () => '',
  setSetting: () => {},
  log: () => {},
  initDatabase: () => mockDb
};

Module.prototype.require = function (id) {
  if (id === 'better-sqlite3') {
    return function () { return mockDb; };
  }
  if (id === 'sharp') {
    const chain = () => ({
      resize: () => chain(),
      webp: () => chain(),
      jpeg: () => chain(),
      png: () => chain(),
      blur: () => chain(),
      grayscale: () => chain(),
      rotate: () => chain(),
      flip: () => chain(),
      extract: () => chain(),
      toBuffer: async () => Buffer.alloc(10),
      metadata: async () => ({ width: 100, height: 100 })
    });
    return () => chain();
  }
  if (id === '@whiskeysockets/baileys') {
    return { downloadMediaMessage: async () => Buffer.alloc(10) };
  }
  if (typeof id === 'string' && id.includes('database') && !id.includes('schema') && !id.includes('node_modules')) {
    // Resolve relative database requires to mock
    try {
      const resolved = Module._resolveFilename(id, this);
      if (resolved.includes('src/database') && !resolved.includes('schema')) {
        return mockDbModule;
      }
    } catch (e) {}
  }
  return originalRequire.apply(this, arguments);
};

// Also patch relative requires from command files
const registry = require('../src/commands/registry');
registry.clear();

const base = path.join(__dirname, '..', 'src', 'commands');
const cats = ['admin', 'bn', 'economia', 'rpg', 'internet', 'dono', 'utilidades', 'stickers', 'seguranca', 'imagem', 'grupo', 'diversao', 'xp'];

const results = [];
const placeholders = [];
const emptyHandlers = [];
const withApi = [];

function isPlaceholder(src, name) {
  // Explicit placeholders
  if (/em breve|coming soon|não implementado|nao implementado|TODO\b|FIXME\b|em desenvolvimento/i.test(src)) {
    return 'explicit_todo';
  }
  // fig* info-only stickers that just tell user to send image
  const infoOnlyFigs = ['figemoji', 'figanime', 'figmemes', 'figanimais', 'figflork', 'figbebe', 'figdesenho', 'figengracada', 'figraiva', 'figroblox'];
  if (infoOnlyFigs.includes(name)) {
    return 'info_only_sticker_pack';
  }
  // setfigban incomplete
  if (name === 'setfigban' && src.includes('em desenvolvimento')) {
    return 'partial';
  }
  if (name === 'listfigban' && src.length < 300) {
    return 'minimal_info';
  }
  return false;
}

for (const cat of cats) {
  const dir = path.join(base, cat);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js'))) {
    const full = path.join(dir, f);
    try {
      delete require.cache[require.resolve(full)];
      const mod = require(full);
      const cmds = Array.isArray(mod) ? mod : (mod.commands || [mod]);
      for (const cmd of cmds) {
        if (!cmd || !cmd.name || typeof cmd.handler !== 'function') continue;

        const src = cmd.handler.toString();
        const len = src.length;
        const empty = len < 40 || /^\s*async\s*\([^)]*\)\s*=>\s*\{\s*\}\s*$/.test(src);
        const ph = isPlaceholder(src, cmd.name);
        const usesApi = /axios\.|fetch\s*\(|api[_-]?key|API_KEY|openai|googleapis/i.test(src);

        try {
          registry.register({
            name: cmd.name,
            aliases: cmd.aliases || [],
            category: cmd.category || cat,
            description: cmd.description || '',
            ownerOnly: !!cmd.ownerOnly,
            adminOnly: !!cmd.adminOnly,
            groupOnly: !!cmd.groupOnly,
            handler: cmd.handler
          });
        } catch (e) {
          // duplicate name
        }

        results.push({
          name: cmd.name,
          aliases: cmd.aliases || [],
          category: cmd.category || cat,
          file: `${cat}/${f}`,
          handlerLen: len,
          empty,
          placeholder: ph,
          usesApi
        });

        if (empty) emptyHandlers.push(cmd.name);
        if (ph) placeholders.push({ name: cmd.name, type: ph });
        if (usesApi) withApi.push(cmd.name);
      }
    } catch (e) {
      console.log('LOAD_ERR', cat + '/' + f, e.message.slice(0, 120));
    }
  }
}

// Register menus
try {
  const { registerMenuCommands } = require('../src/utils/menu');
  registerMenuCommands();
} catch (e) {
  console.log('menu_err', e.message);
}

const stats = registry.stats();
const allMain = registry.getMainCommands();

// Category table from results (source of truth for handlers)
const byCat = {};
for (const r of results) {
  if (!byCat[r.category]) {
    byCat[r.category] = { total: 0, implemented: 0, placeholders: 0, empty: 0, api: 0 };
  }
  byCat[r.category].total++;
  if (!r.empty && !r.placeholder) byCat[r.category].implemented++;
  else if (r.placeholder) byCat[r.category].placeholders++;
  if (r.empty) byCat[r.category].empty++;
  if (r.usesApi) byCat[r.category].api++;
}

// Menu commands count
const menuOnly = allMain.filter(c => c.name.startsWith('menu') || c.name.startsWith('menú'));
const realFunctional = results.filter(r => !r.empty && !r.placeholder);

console.log(JSON.stringify({
  registryMain: stats.totalMain,
  registryAliases: stats.totalAliases,
  resultsCount: results.length,
  realFunctional: realFunctional.length,
  placeholders: placeholders.length,
  emptyHandlers: emptyHandlers.length,
  withApi: withApi.length,
  menuCommands: menuOnly.length,
  byCategory: byCat,
  placeholderList: placeholders,
  emptyList: emptyHandlers,
  apiList: withApi,
  allNames: allMain.map(c => c.name).sort()
}, null, 2));
