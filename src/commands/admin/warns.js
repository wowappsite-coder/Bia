const db = require('../../database');
const { tag } = require('../../utils/mention');
const WARN_LIMIT = 3;

const ADV_SUCCESS_MSGS = [
  "⚠️ Cartão amarelo na cara de @usuario. Ainda acha que manda aqui? ADV {n}/{lim}!",
  "😂 @usuario colecionando advertência que nem figurinha repetida. {n}/{lim} — Motivo: {motivo}",
  "🟡 @usuario foi avisado. Próximo passo é a calçada. ADV {n}/{lim} | {motivo}",
  "📋 Processo aberto: @usuario. Acusação: ser insuportável. ADV {n}/{lim}",
  "🚨 Alarme de mediocridade: @usuario levou ADV. {n}/{lim} — {motivo}",
  "📛 Etiqueta de aviso colada em @usuario. {n}/{lim}. Motivo: {motivo}",
  "🧹 A staff limpou a paciência e sobrou ADV pra @usuario. {n}/{lim}",
  "📉 Reputação de @usuario despencando. ADV {n}/{lim} | {motivo}",
  "🎯 Acertamos @usuario em cheio com a advertência. {n}/{lim} — {motivo}",
  "🧊 @usuario congelado no banco de reservas da vergonha. ADV {n}/{lim}",
  "📌 Fixado: @usuario está na corda bamba. {n}/{lim} advertências. Motivo: {motivo}",
  "🧾 Recibo de ADV pra @usuario. Pague com comportamento... se souber. {n}/{lim}",
  "😤 A paciência do grupo com @usuario acabou de encolher. ADV {n}/{lim}",
  "👢 Quase chute, ainda é ADV: @usuario em {n}/{lim}. Motivo: {motivo}",
  "📢 Megafone: @usuario, para de ser problema. ADV {n}/{lim}!",
  "🧨 @usuario acendeu pavio de novo. ADV {n}/{lim} — {motivo}",
  "🎭 Drama de @usuario ganhou classificação: advertido. {n}/{lim}",
  "🗑️ Quase lixo, ainda é aviso: @usuario {n}/{lim}. Motivo: {motivo}",
  "🛑 Pare aí, @usuario. A staff não é brinquedo. ADV {n}/{lim}",
  "😂 @usuario jogando no modo 'teste a moderação'. Spoiler: perdeu. {n}/{lim}",
  "📒 Caderninho da staff: mais uma risquinha em @usuario. {n}/{lim} | {motivo}",
  "👀 Olho em @usuario. ADV {n}/{lim}. Continua assim e vira história de ban.",
  "🧱 Realidade bateu em @usuario: ADV {n}/{lim}. Motivo: {motivo}",
  "🛎️ Serviço de aviso express entregue a @usuario. {n}/{lim}",
  "📣 Atenção grupo: @usuario já tem {n}/{lim} ADV. Motivo: {motivo}",
  "🧲 Mediocridade de @usuario puxou mais uma advertência. {n}/{lim}",
  "🎮 Strike {n}/{lim} pra @usuario. Próximo game over. Motivo: {motivo}",
  "🪙 Sorte de @usuario: ainda é ADV, não BAN. {n}/{lim} — {motivo}",
  "📎 Anexado ao prontuário de @usuario: mais uma ADV. {n}/{lim}",
  "👑 A staff decretou: @usuario está de observação. ADV {n}/{lim} | {motivo}"
];

const ADV_LIMIT_MSGS = [
  "🚫 @usuario esgotou as chances ({lim}/{lim}). Removido. Ninguém sentiu falta 😂",
  "👢 @usuario completou o álbum de ADV e ganhou o prêmio: a calçada.",
  "🏁 Game Over. @usuario bateu {lim} advertências e foi eliminado.",
  "📦 @usuario empacotado após {lim} ADV. Boa viagem, problema.",
  "💨 {lim} advertências depois, @usuario evaporou do grupo.",
  "🧹 Limpeza final: @usuario saiu por excesso de ADV.",
  "💀 @usuario não aprendeu com {lim} avisos. Ban/kick automático.",
  "🚪 Porta, @usuario e {lim} ADV. Matemática simples: FORA.",
  "😂 @usuario colecionou {lim} ADV e ganhou o ticket da saída.",
  "🛎️ Checkout forçado: @usuario. Motivo: excesso de advertências."
];

function pickAdvMsg(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function formatAdvMsg(target, reason, total, limit) {
  let msg = pickAdvMsg(ADV_SUCCESS_MSGS);
  msg = msg.split('@usuario').join(tag(target));
  msg = msg.split('{n}').join(String(total));
  msg = msg.split('{lim}').join(String(limit));
  msg = msg.split('{motivo}').join(reason || 'Sem motivo');
  return msg;
}
function formatAdvLimitMsg(target, limit) {
  let msg = pickAdvMsg(ADV_LIMIT_MSGS);
  msg = msg.split('@usuario').join(tag(target));
  msg = msg.split('{lim}').join(String(limit));
  return msg;
}

async function requireGroupAdmin(ctx) {
  if (!ctx.isGroup) { await ctx.reply('Apenas em grupos.'); return false; }
  if (ctx.isOwner() || ctx.isBotAdmin()) return true;
  try { if (await ctx.isGroupAdmin()) return true; } catch (_) {}
  await ctx.reply('Apenas administradores.');
  return false;
}
async function getTarget(ctx) {
  let t = null;
  try { if (ctx.getMentionedOrQuoted) t = ctx.getMentionedOrQuoted(); } catch (_) {}
  if (!t && ctx.mentioned && ctx.mentioned[0]) t = ctx.mentioned[0];
  return t;
}
function countWarns(g, u) {
  const r = db.getDb().prepare('SELECT COUNT(*) AS c FROM group_warns WHERE group_jid=? AND user_jid=?').get(g, u);
  return r ? r.c : 0;
}
function listWarns(g, u) {
  return db.getDb().prepare('SELECT id, reason, created_at FROM group_warns WHERE group_jid=? AND user_jid=? ORDER BY id DESC').all(g, u);
}
function addWarn(g, u, reason, by) {
  db.getDb().prepare('INSERT INTO group_warns (group_jid,user_jid,reason,by_jid) VALUES (?,?,?,?)').run(g, u, reason || 'Sem motivo', by);
  return countWarns(g, u);
}
function delOneWarn(g, u) {
  const row = db.getDb().prepare('SELECT id FROM group_warns WHERE group_jid=? AND user_jid=? ORDER BY id DESC LIMIT 1').get(g, u);
  if (!row) return 0;
  db.getDb().prepare('DELETE FROM group_warns WHERE id=?').run(row.id);
  return countWarns(g, u);
}
function resetWarns(g, u) {
  db.getDb().prepare('DELETE FROM group_warns WHERE group_jid=? AND user_jid=?').run(g, u);
}
function isBotJid(ctx, jid) {
  try {
    const botId = ctx.sock.user && (ctx.sock.user.id || '');
    const botNum = String(botId).split(':')[0].split('@')[0];
    return botNum && String(jid).split(':')[0].split('@')[0] === botNum;
  } catch (_) { return false; }
}

module.exports = [
  {
    name: 'adv', aliases: ['warn', 'advertencia'], category: 'admin', groupOnly: true, adminOnly: true,
    description: 'Adiciona advertencia',
    handler: async (ctx) => {
      if (!(await requireGroupAdmin(ctx))) return;
      const target = await getTarget(ctx);
      if (!target) return ctx.reply('Marque a pessoa. Ex: adv @user motivo');
      if (isBotJid(ctx, target)) return ctx.reply('Nao posso advertir a mim mesmo.');
      const reason = (ctx.args || []).filter(a => !String(a).includes('@')).join(' ') || 'Sem motivo';
      const total = addWarn(ctx.jid, target, reason, ctx.sender);
      await ctx.reply(formatAdvMsg(target, reason, total, WARN_LIMIT), { mentions: [target] });
      if (total >= WARN_LIMIT) {
        try {
          await ctx.sock.groupParticipantsUpdate(ctx.jid, [target], 'remove');
          await ctx.reply(formatAdvLimitMsg(target, WARN_LIMIT), { mentions: [target] });
          resetWarns(ctx.jid, target);
        } catch (e) {
          await ctx.reply('Atingiu o limite, mas nao consegui remover. Bot precisa ser admin.');
        }
      }
    }
  },
  {
    name: 'advlist', aliases: ['warns', 'listadv'], category: 'admin', groupOnly: true, adminOnly: true,
    handler: async (ctx) => {
      if (!(await requireGroupAdmin(ctx))) return;
      const target = await getTarget(ctx);
      if (!target) return ctx.reply('Marque a pessoa.');
      const rows = listWarns(ctx.jid, target);
      if (!rows.length) return ctx.reply(tag(target) + ' nao tem advertencias.', { mentions: [target] });
      let text = 'Advertencias de ' + tag(target) + ' (' + rows.length + ')\n\n';
      rows.forEach((r, i) => { text += (i + 1) + '. ' + (r.reason || '') + '\n   ' + r.created_at + '\n'; });
      await ctx.reply(text, { mentions: [target] });
    }
  },
  {
    name: 'advdel', aliases: ['unwarn'], category: 'admin', groupOnly: true, adminOnly: true,
    handler: async (ctx) => {
      if (!(await requireGroupAdmin(ctx))) return;
      const target = await getTarget(ctx);
      if (!target) return ctx.reply('Marque a pessoa.');
      if (!countWarns(ctx.jid, target)) return ctx.reply('Sem advertencias.');
      const after = delOneWarn(ctx.jid, target);
      await ctx.reply('Removida 1 adv de ' + tag(target) + '. Total: ' + after + '/' + WARN_LIMIT, { mentions: [target] });
    }
  },
  {
    name: 'advreset', aliases: ['resetadv'], category: 'admin', groupOnly: true, adminOnly: true,
    handler: async (ctx) => {
      if (!(await requireGroupAdmin(ctx))) return;
      const target = await getTarget(ctx);
      if (!target) return ctx.reply('Marque a pessoa.');
      resetWarns(ctx.jid, target);
      await ctx.reply('Advertencias de ' + tag(target) + ' zeradas.', { mentions: [target] });
    }
  }
];
