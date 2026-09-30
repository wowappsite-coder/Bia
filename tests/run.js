/**
 * Testes básicos do BEATRIZ BOT (sem conexão WhatsApp)
 */
const path = require('path');
const fs = require('fs');
const assert = require('assert');

process.chdir(path.join(__dirname, '..'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

console.log('\n🧪 BEATRIZ BOT — Testes\n');

// Mock native modules before loading project code
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
Module.prototype.require = function (id) {
  if (id === 'better-sqlite3') return function () { return mockDb; };
  if (id === 'sharp') {
    const c = () => ({
      resize: () => c(), webp: () => c(), jpeg: () => c(), png: () => c(),
      blur: () => c(), grayscale: () => c(), rotate: () => c(), flip: () => c(),
      extract: () => c(), toBuffer: async () => Buffer.alloc(10),
      metadata: async () => ({ width: 100, height: 100 })
    });
    return () => c();
  }
  if (id === '@whiskeysockets/baileys') {
    return { downloadMediaMessage: async () => Buffer.alloc(10) };
  }
  return originalRequire.apply(this, arguments);
};

console.log('1. Arquivos essenciais');
test('src/index.js existe', () => assert.ok(fs.existsSync('src/index.js')));
test('src/config/index.js existe', () => assert.ok(fs.existsSync('src/config/index.js')));
test('src/database/schema.js existe', () => assert.ok(fs.existsSync('src/database/schema.js')));
test('src/commands/registry.js existe', () => assert.ok(fs.existsSync('src/commands/registry.js')));
test('src/utils/parser.js existe', () => assert.ok(fs.existsSync('src/utils/parser.js')));
test('src/middlewares/security.js existe', () => assert.ok(fs.existsSync('src/middlewares/security.js')));
test('src/services/payment.js existe', () => assert.ok(fs.existsSync('src/services/payment.js')));
test('package.json existe', () => assert.ok(fs.existsSync('package.json')));
test('start.sh existe', () => assert.ok(fs.existsSync('start.sh')));

console.log('\n2. Config');
const config = require('../src/config');
test('botName definido', () => assert.ok(config.botName));
test('ownerNumber = 874288439', () => assert.strictEqual(config.ownerNumber, '874288439'));
test('botNumber = 852935085', () => assert.strictEqual(config.botNumber, '852935085'));
test('prefixes é array não vazio', () => assert.ok(Array.isArray(config.prefixes) && config.prefixes.length > 0));
test('isOwner reconhece dono', () => assert.ok(config.isOwner('874288439@s.whatsapp.net')));
test('isOwner rejeita outro', () => assert.ok(!config.isOwner('999999999@s.whatsapp.net')));

console.log('\n3. Parser');
const { detectPayment, parseMessage, extractText } = require('../src/utils/parser');
const registry = require('../src/commands/registry');

// Load a minimal command for no-prefix test
registry.register({
  name: 'ping',
  category: 'utilidades',
  handler: async () => {}
});

test('detectPayment reconhece M-Pesa exemplo', () => {
  const sample = `ID Trans: CO260808.1125.m89748.
Enviou para o MPESA 857144748 as 11:25:58 08/08/2026, valor: 20.00MT, taxa: 2.00MT. Saldo: 4.82MT.`;
  const r = detectPayment(sample);
  assert.ok(r, 'deve detectar');
  assert.ok(r.transactionId, 'deve ter TXID');
  assert.ok(r.value === 20 || r.value === 20.0, 'valor 20');
  assert.ok(r.destinationNumber && r.destinationNumber.includes('857144748'), 'número destino');
});

test('detectPayment rejeita texto comum', () => {
  assert.strictEqual(detectPayment('olá tudo bem?'), null);
});

test('parseMessage com prefixo', () => {
  const msg = { message: { conversation: '!ping teste' } };
  const p = parseMessage(msg);
  assert.ok(p);
  assert.strictEqual(p.command, 'ping');
  assert.strictEqual(p.hasPrefix, true);
  assert.strictEqual(p.text, 'teste');
});

test('parseMessage sem prefixo (comando registrado)', () => {
  const msg = { message: { conversation: 'ping' } };
  const p = parseMessage(msg);
  assert.ok(p);
  assert.strictEqual(p.command, 'ping');
  assert.strictEqual(p.hasPrefix, false);
});

test('parseMessage ignora mensagem normal', () => {
  const msg = { message: { conversation: 'bom dia pessoal' } };
  const p = parseMessage(msg);
  assert.strictEqual(p, null);
});

console.log('\n4. Registry + comandos');
registry.clear();
// Mock database module path used by commands
const dbPath = require.resolve('../src/database');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    getDb: () => mockDb,
    getUser: () => ({ wallet: 0, bank: 0, xp: 0, level: 1, messages: 0, inventory: '{}', number: '1' }),
    updateUser: () => {},
    getGroup: () => ({ mutados: '[]', blocked_cmds: '[]', ddd_list: '[]', palavras_ban: '[]', welcome: 1, antisticker: 0 }),
    updateGroup: () => {},
    isBotAdmin: () => false,
    isBlacklisted: () => false,
    getSetting: () => '',
    setSetting: () => {},
    log: () => {},
    initDatabase: () => mockDb
  }
};

const { loadCommands } = require('../src/commands/loader');
const { registerMenuCommands } = require('../src/utils/menu');
loadCommands();
registerMenuCommands();
const stats = registry.stats();
const all = registry.getMainCommands();

test('pelo menos 250 comandos principais', () => assert.ok(stats.totalMain >= 250, `só ${stats.totalMain}`));
test('todos têm handler function', () => {
  for (const c of all) {
    assert.strictEqual(typeof c.handler, 'function', `${c.name} sem handler`);
  }
});
test('sem nome duplicado no registry', () => {
  const names = all.map(c => c.name);
  assert.strictEqual(names.length, new Set(names).size);
});
test('demote NÃO é alias de promover', () => {
  const promover = registry.get('promover');
  assert.ok(promover);
  assert.ok(!(promover.aliases || []).includes('demote'), 'demote não pode estar em promover');
});
test('demote resolve para rebaixar', () => {
  const cmd = registry.get('demote');
  assert.ok(cmd, 'demote deve existir como alias');
  assert.strictEqual(cmd.name, 'rebaixar');
});
test('figemoji tem handler real (não só texto informativo curto)', () => {
  const cmd = registry.get('figemoji');
  assert.ok(cmd);
  const src = cmd.handler.toString();
  assert.ok(src.includes('sharp') || src.length > 200, 'figemoji deve gerar sticker');
});
test('quando tem handler real', () => {
  const cmd = registry.get('quando');
  assert.ok(cmd);
  const src = cmd.handler.toString();
  assert.ok(src.includes('opts') || src.includes('random'), 'quando deve sortear resposta');
});

console.log('\n5. Pagamento service');
const payment = require('../src/services/payment');
test('analyzePayment exportado', () => assert.strictEqual(typeof payment.analyzePayment, 'function'));
test('formatDetectionReply exportado', () => assert.strictEqual(typeof payment.formatDetectionReply, 'function'));

console.log('\n6. Segurança middleware');
const sec = require('../src/middlewares/security');
test('checkSecurity exportado', () => assert.strictEqual(typeof sec.checkSecurity, 'function'));
test('checkSubscription exportado', () => assert.strictEqual(typeof sec.checkSubscription, 'function'));

console.log('\n━━━━━━━━━━━━━━━━━━━━');
console.log(`Resultado: ${passed} passou, ${failed} falhou`);
console.log(`Comandos no registry: ${stats.totalMain}`);
console.log(`Aliases: ${stats.totalAliases}`);
console.log('━━━━━━━━━━━━━━━━━━━━\n');

process.exit(failed > 0 ? 1 : 0);
