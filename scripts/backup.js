/**
 * Backup do banco de dados SQLite
 */
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'beatriz.db');
const outDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dbPath)) {
  console.error('Banco não encontrado:', dbPath);
  process.exit(1);
}

const dest = path.join(outDir, `backup_${Date.now()}.db`);
fs.copyFileSync(dbPath, dest);
console.log('Backup criado:', dest);
