/**
 * Schema completo do BEATRIZ BOT
 * SQLite local - tudo persistente
 */

const SCHEMA = `
-- Usuários
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jid TEXT UNIQUE NOT NULL,
  number TEXT NOT NULL,
  name TEXT,
  pushname TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  messages INTEGER DEFAULT 0,
  commands_used INTEGER DEFAULT 0,
  wallet REAL DEFAULT 0,
  bank REAL DEFAULT 0,
  inventory TEXT DEFAULT '{}',
  job TEXT,
  last_daily TEXT,
  last_work TEXT,
  last_crime TEXT,
  last_rob TEXT,
  banned INTEGER DEFAULT 0,
  ban_reason TEXT,
  warns INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Grupos
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jid TEXT UNIQUE NOT NULL,
  name TEXT,
  description TEXT,
  owner_jid TEXT,
  welcome INTEGER DEFAULT 0,
  goodbye INTEGER DEFAULT 0,
  antilink INTEGER DEFAULT 0,
  antilink_hard INTEGER DEFAULT 0,
  antilink_easy INTEGER DEFAULT 0,
  antiimg INTEGER DEFAULT 0,
  antivideo INTEGER DEFAULT 0,
  antiaudio INTEGER DEFAULT 0,
  antisticker INTEGER DEFAULT 0,
  antidoc INTEGER DEFAULT 0,
  antistatus INTEGER DEFAULT 0,
  anticontato INTEGER DEFAULT 0,
  antilocal INTEGER DEFAULT 0,
  anticanal INTEGER DEFAULT 0,
  antispam INTEGER DEFAULT 1,
  antipalavra INTEGER DEFAULT 0,
  antipalavrao INTEGER DEFAULT 0,
  antifake INTEGER DEFAULT 0,
  antipagamento INTEGER DEFAULT 0,
  anticatalogo INTEGER DEFAULT 0,
  antidelete INTEGER DEFAULT 0,
  antidd INTEGER DEFAULT 0,
  mutados TEXT DEFAULT '[]',
  palavras_ban TEXT DEFAULT '[]',
  ddd_list TEXT DEFAULT '[]',
  figban_list TEXT DEFAULT '[]',
  blocked_cmds TEXT DEFAULT '[]',
  regras TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Administradores do bot (além do dono)
CREATE TABLE IF NOT EXISTS bot_admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jid TEXT UNIQUE NOT NULL,
  number TEXT NOT NULL,
  added_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Lista negra global
CREATE TABLE IF NOT EXISTS blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jid TEXT UNIQUE NOT NULL,
  number TEXT,
  reason TEXT,
  added_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Comandos personalizados (ADDCMD)
CREATE TABLE IF NOT EXISTS custom_commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_jid TEXT NOT NULL DEFAULT 'global',
  name TEXT NOT NULL,
  response TEXT NOT NULL,
  with_prefix INTEGER DEFAULT 1,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(group_jid, name, with_prefix)
);

-- Dados por usuário POR GRUPO (economia + xp isolados)
CREATE TABLE IF NOT EXISTS user_group_data (
  jid TEXT NOT NULL,
  group_jid TEXT NOT NULL,
  wallet REAL DEFAULT 0,
  bank REAL DEFAULT 0,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  messages INTEGER DEFAULT 0,
  inventory TEXT DEFAULT '{}',
  last_daily TEXT,
  last_work TEXT,
  last_crime TEXT,
  last_rob TEXT,
  job TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (jid, group_jid)
);

-- Economia - histórico
CREATE TABLE IF NOT EXISTS economy_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jid TEXT NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- XP / Rank atributos (para rankings tipo rankgay etc)
CREATE TABLE IF NOT EXISTS attributes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jid TEXT NOT NULL,
  group_jid TEXT,
  attribute TEXT NOT NULL,
  value INTEGER DEFAULT 0,
  UNIQUE(jid, group_jid, attribute)
);

-- Relacionamentos / Família
CREATE TABLE IF NOT EXISTS relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user1_jid TEXT NOT NULL,
  user2_jid TEXT NOT NULL,
  type TEXT NOT NULL, -- namoro, casamento, amante, pedido
  status TEXT DEFAULT 'pending', -- pending, accepted, ended
  started_at TEXT,
  ended_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS families (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  owner_jid TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS family_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  jid TEXT NOT NULL,
  role TEXT DEFAULT 'membro', -- owner, filho, membro
  joined_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id)
);

-- Pets
CREATE TABLE IF NOT EXISTS pets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_jid TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'cachorro',
  hunger INTEGER DEFAULT 50,
  happiness INTEGER DEFAULT 50,
  energy INTEGER DEFAULT 50,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  photo TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Planos Internet / Aluguel
CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_jid TEXT NOT NULL DEFAULT 'global',
  name TEXT NOT NULL,
  price REAL NOT NULL,
  days INTEGER NOT NULL,
  description TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Clientes (vendedores de internet / aluguel)
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jid TEXT,
  number TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Pedidos
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER,
  plan_id INTEGER,
  group_jid TEXT,
  value_expected REAL NOT NULL,
  number_expected TEXT,
  name_expected TEXT,
  status TEXT DEFAULT 'pending', -- pending, paid, expired, cancelled
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Pagamentos detectados
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_jid TEXT,
  order_id INTEGER,
  transaction_id TEXT UNIQUE,
  provider TEXT, -- mpesa, emola, mkash
  value_received REAL,
  fee REAL,
  destination_number TEXT,
  destination_name TEXT,
  date TEXT,
  time TEXT,
  raw_message TEXT,
  status TEXT DEFAULT 'PAGAMENTO_NAO_ENCONTRADO',
  -- PAGAMENTO_VALIDO, PAGAMENTO_INVALIDO, PAGAMENTO_SUSPEITO, PAGAMENTO_JA_UTILIZADO
  analyzed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Assinaturas / Aluguel do bot
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER,
  group_jid TEXT UNIQUE,
  plan_id INTEGER,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- active, expired, cancelled, blocked
  payment_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Configurações do bot
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Logs
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT,
  message TEXT,
  jid TEXT,
  data TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Contador de spam
CREATE TABLE IF NOT EXISTS spam_tracker (
  jid TEXT NOT NULL,
  group_jid TEXT,
  count INTEGER DEFAULT 1,
  last_message TEXT,
  window_start TEXT,
  PRIMARY KEY (jid, group_jid)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_jid ON users(jid);
CREATE INDEX IF NOT EXISTS idx_groups_jid ON groups(jid);
CREATE TABLE IF NOT EXISTS group_settings (
  group_jid TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  PRIMARY KEY (group_jid, key)
);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_jid TEXT NOT NULL,
  buyer_jid TEXT NOT NULL,
  buyer_number TEXT,
  product TEXT,
  amount_mb REAL NOT NULL DEFAULT 0,
  amount_label TEXT,
  price REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_purchases_group ON purchases(group_jid);

CREATE INDEX IF NOT EXISTS idx_payments_txid ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_plans_group ON plans(group_jid);
CREATE INDEX IF NOT EXISTS idx_orders_group ON orders(group_jid);
CREATE INDEX IF NOT EXISTS idx_subscriptions_group ON subscriptions(group_jid);
CREATE INDEX IF NOT EXISTS idx_custom_cmds_name ON custom_commands(name);
`;

module.exports = { SCHEMA };
