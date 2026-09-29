/**
 * Backup completo do bot -> ZIP no Download do telemovel
 * Uso: node scripts/autoBackup.js
 * Ou automatico pelo bot a cada 24h
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const name = 'beatriz-bot-AUTO-' + stamp + '.zip';

const candidates = [
  path.join('/storage/emulated/0/Download', name),
  path.join(process.env.HOME || '', 'storage', 'downloads', name),
  path.join(ROOT, 'data', 'backups', name)
];

function ensureDir(p) {
  try { fs.mkdirSync(path.dirname(p), { recursive: true }); } catch (_) {}
}

function run() {
  const out = candidates[0];
  ensureDir(out);
  ensureDir(path.join(ROOT, 'data', 'backups', name));

  // inclui o essencial; evita node_modules (enorme)
  const include = [
    'src',
    'data',
    'session',
    '.env',
    'package.json',
    'package-lock.json'
  ].filter(function (f) {
    return fs.existsSync(path.join(ROOT, f));
  });

  try {
    execFileSync(
      'zip',
      ['-r', '-q', out].concat(include).concat(['-x', 'data/filme-tmp/*', 'data/anime-tmp/*', 'data/backups/*', '*.bak*', 'session/app-state*']),
      { cwd: ROOT, timeout: 120000 }
    );
    const st = fs.statSync(out);
    // copia local
    try {
      const local = path.join(ROOT, 'data', 'backups', name);
      fs.copyFileSync(out, local);
    } catch (_) {}
    console.log('[BACKUP] OK', out, '(' + Math.round(st.size / 1024 / 1024) + ' MB)');
    return out;
  } catch (e) {
    // fallback sem zip binary: tar.gz
    const tarOut = out.replace(/\.zip$/, '.tar.gz');
    try {
      execFileSync(
        'tar',
        ['-czf', tarOut, '--exclude=node_modules', '--exclude=data/filme-tmp', '--exclude=data/anime-tmp', '--exclude=data/backups'].concat(include),
        { cwd: ROOT, timeout: 120000 }
      );
      console.log('[BACKUP] OK (tar)', tarOut);
      return tarOut;
    } catch (e2) {
      console.error('[BACKUP] FALHOU', e.message, e2.message);
      return null;
    }
  }
}

if (require.main === module) run();
module.exports = { run };
