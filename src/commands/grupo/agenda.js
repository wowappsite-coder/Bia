const db = require('../../database');
function listEvents(g) {
  return db.getDb().prepare('SELECT id, title, event_date, event_time FROM group_agenda WHERE group_jid=? ORDER BY event_date, event_time').all(g);
}
function parseDate(str) {
  const s = String(str || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + '-' + m[2].padStart(2,'0') + '-' + m[1].padStart(2,'0');
  return null;
}
function parseTime(str) {
  const m = String(str || '00:00').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return String(Math.min(23, +m[1])).padStart(2,'0') + ':' + String(Math.min(59, +m[2])).padStart(2,'0');
}
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function formatList(rows) {
  if (!rows.length) return '📅 Nenhum evento na agenda.';
  let t = '📅 *AGENDA*\n\n';
  rows.forEach(r => { t += '• *#' + r.id + '* ' + r.title + '\n  📆 ' + r.event_date + ' ⏰ ' + (r.event_time||'00:00') + '\n'; });
  return t.trim();
}
module.exports = [{
  name: 'agenda', aliases: ['eventos'], category: 'grupo', groupOnly: true,
  handler: async (ctx) => {
    const sub = (ctx.args[0] || '').toLowerCase();
    const database = db.getDb();
    if (!sub || sub === 'listar') return ctx.reply(formatList(listEvents(ctx.jid)));
    if (sub === 'hoje') {
      const rows = database.prepare('SELECT id,title,event_date,event_time FROM group_agenda WHERE group_jid=? AND event_date=? ORDER BY event_time').all(ctx.jid, todayStr());
      return ctx.reply(rows.length ? formatList(rows) : 'Nenhum evento para hoje.');
    }
    if (sub === 'proximo' || sub === 'next') {
      const rows = database.prepare("SELECT id,title,event_date,event_time FROM group_agenda WHERE group_jid=? AND event_date>=? ORDER BY event_date,event_time LIMIT 1").all(ctx.jid, todayStr());
      if (!rows.length) return ctx.reply('Nao ha proximos eventos.');
      const r = rows[0];
      return ctx.reply('📌 *Proximo*\n*' + r.title + '*\n📆 ' + r.event_date + ' ⏰ ' + (r.event_time||'00:00') + '\nID #' + r.id);
    }
    if (sub === 'adicionar' || sub === 'add') {
      const raw = (ctx.text || '').replace(/^(adicionar|add)\s*/i, '').trim();
      const parts = raw.split('|').map(s => s.trim());
      const title = parts[0];
      const date = parseDate(parts[1] || '');
      const time = parseTime(parts[2] || '00:00');
      if (!title || title.length < 2) return ctx.reply('Uso: agenda adicionar Titulo | DD/MM/AAAA | HH:MM');
      if (!date) return ctx.reply('Data invalida.');
      if (!time) return ctx.reply('Hora invalida.');
      const info = database.prepare('INSERT INTO group_agenda (group_jid,title,event_date,event_time,created_by) VALUES (?,?,?,?,?)').run(ctx.jid, title.slice(0,120), date, time, ctx.sender);
      return ctx.reply('Evento adicionado: *' + title + '*\n📆 ' + date + ' ⏰ ' + time + '\nID #' + info.lastInsertRowid);
    }
    if (sub === 'remover' || sub === 'del') {
      const id = parseInt(ctx.args[1], 10);
      if (!id) return ctx.reply('Uso: agenda remover ID');
      const row = database.prepare('SELECT id,title FROM group_agenda WHERE id=? AND group_jid=?').get(id, ctx.jid);
      if (!row) return ctx.reply('Evento nao encontrado.');
      database.prepare('DELETE FROM group_agenda WHERE id=? AND group_jid=?').run(id, ctx.jid);
      return ctx.reply('Removido #' + id + ' (' + row.title + ')');
    }
    if (sub === 'editar' || sub === 'edit') {
      const raw = (ctx.text || '').replace(/^(editar|edit)\s*/i, '').trim();
      const parts = raw.split('|').map(s => s.trim());
      const id = parseInt(parts[0], 10);
      if (!id) return ctx.reply('Uso: agenda editar ID | titulo | data | hora');
      const row = database.prepare('SELECT * FROM group_agenda WHERE id=? AND group_jid=?').get(id, ctx.jid);
      if (!row) return ctx.reply('Evento nao encontrado.');
      const title = parts[1] || row.title;
      const date = parts[2] ? parseDate(parts[2]) : row.event_date;
      const time = parts[3] ? parseTime(parts[3]) : row.event_time;
      if (!date || !time) return ctx.reply('Data/hora invalidas.');
      database.prepare('UPDATE group_agenda SET title=?, event_date=?, event_time=? WHERE id=? AND group_jid=?').run(title.slice(0,120), date, time, id, ctx.jid);
      return ctx.reply('Atualizado #' + id + ': *' + title + '*\n📆 ' + date + ' ⏰ ' + time);
    }
    return ctx.reply('📅 *AGENDA*\n• agenda\n• agenda hoje\n• agenda proximo\n• agenda adicionar Titulo | DD/MM/AAAA | HH:MM\n• agenda editar ID | titulo | data | hora\n• agenda remover ID');
  }
}];
