/**
 * Middleware de segurança em tempo real
 * Conectado aos eventos de mensagens do WhatsApp
 */

const { getGroup, updateUser, getDb } = require('../database');
const { extractText } = require('../utils/parser');
const config = require('../config');

const LINK_REGEX = /(https?:\/\/|www\.|wa\.me\/|chat\.whatsapp\.com\/|t\.me\/|bit\.ly\/|tinyurl\.|goo\.gl\/)\S+/i;
const spamMap = new Map(); // jid+group -> { count, start }

function isGroupAdminSync(participants, sender) {
  if (!participants) return false;
  const p = participants.find(x => x.id === sender || x.id === sender.replace('@s.whatsapp.net', '@lid'));
  return p && (p.admin === 'admin' || p.admin === 'superadmin');
}

/**
 * Verifica proteções do grupo. Retorna true se a mensagem deve ser BLOQUEADA (apagada).
 */
async function checkSecurity(sock, msg) {
  try {
    const jid = msg.key.remoteJid;
    if (!jid || !jid.endsWith('@g.us')) return false;
    if (msg.key.fromMe) return false;

    const sender = msg.key.participant || msg.key.remoteJid;
    if (config.isOwner(sender)) return false;

    const group = getGroup(jid);
    if (!group) return false;

    // Meta do grupo (admins)
    let meta = null;
    try {
      meta = await sock.groupMetadata(jid);
    } catch {}
    if (meta && isGroupAdminSync(meta.participants, sender)) return false;

    const m = msg.message || {};
    const text = extractText(msg) || '';
    const hasImage = !!(m.imageMessage);
    const hasVideo = !!(m.videoMessage);
    const hasAudio = !!(m.audioMessage || m.pttMessage);
    const hasDoc = !!(m.documentMessage);
    const hasSticker = !!(m.stickerMessage);
    const hasContact = !!(m.contactMessage || m.contactsArrayMessage);
    const hasLocation = !!(m.locationMessage || m.liveLocationMessage);

    // Anti-link
    if ((group.antilink || group.antilink_hard || group.antilink_easy) && LINK_REGEX.test(text)) {
      const hard = !!group.antilink_hard;
      await deleteAndWarn(sock, msg, jid, sender, '🔗 Link detectado (anti-link)', hard);
      return true;
    }

    // Anti-imagem
    if (group.antiimg && hasImage) {
      await deleteAndWarn(sock, msg, jid, sender, '🖼️ Imagem bloqueada (anti-img)', false);
      return true;
    }

    // Anti-vídeo
    if (group.antivideo && hasVideo) {
      await deleteAndWarn(sock, msg, jid, sender, '🎬 Vídeo bloqueado (anti-video)', false);
      return true;
    }

    // Anti-áudio
    if (group.antiaudio && hasAudio) {
      await deleteAndWarn(sock, msg, jid, sender, '🎵 Áudio bloqueado (anti-audio)', false);
      return true;
    }

    // Anti-documento
    if (group.antidoc && hasDoc) {
      await deleteAndWarn(sock, msg, jid, sender, '📄 Documento bloqueado (anti-doc)', false);
      return true;
    }

    // Anti-sticker
    if (group.antisticker && hasSticker) {
      await deleteAndWarn(sock, msg, jid, sender, '🎴 Sticker bloqueado (anti-sticker)', false);
      return true;
    }

    // Anti-contato
    if (group.anticontato && hasContact) {
      await deleteAndWarn(sock, msg, jid, sender, '👤 Contato bloqueado', false);
      return true;
    }

    // Anti-localização
    if (group.antilocal && hasLocation) {
      await deleteAndWarn(sock, msg, jid, sender, '📍 Localização bloqueada', false);
      return true;
    }

    // Anti-status: menção do grupo em status
    if (group.antistatus) {
      const hasStatusMention = !!(
        m.groupStatusMentionMessage ||
        m.statusMentionMessage ||
        m.groupMentionedMessage ||
        m.groupStatusMessage ||
        m.groupStatusMessageV2 ||
        (m.protocolMessage && (m.protocolMessage.type === 25 || m.protocolMessage.type === 'STATUS_MENTION_MESSAGE'))
      );
      const textLooksStatus =
        /este grupo foi mencionado/i.test(text) ||
        /grupo foi mencionado/i.test(text) ||
        /status de /i.test(text) ||
        /mentioned this group/i.test(text);
      if (hasStatusMention || textLooksStatus) {
        const offender = resolveStatusOffender(msg, jid, sender);
        if (!offender) {
          // mensagem fantasma do proprio grupo — ignorar
          try { await sock.sendMessage(jid, { delete: msg.key }); } catch (_) {}
          return true;
        }
        if (shouldSkipDuplicateAdv(jid, offender, 'antistatus')) {
          try { await sock.sendMessage(jid, { delete: msg.key }); } catch (_) {}
          return true;
        }
        await deleteAndWarn(sock, msg, jid, offender, '📱 Status mencionando o grupo (anti-status)', false);
        return true;
      }
    }

    // Anti-canal / status view
    if (group.anticanal && (text.includes('https://whatsapp.com/channel') || text.includes('wa.me/channel'))) {
      await deleteAndWarn(sock, msg, jid, sender, '📢 Canal bloqueado', false);
      return true;
    }

    // Anti-catálogo
    if (group.anticatalogo && (m.productMessage || m.orderMessage)) {
      await deleteAndWarn(sock, msg, jid, sender, '🛒 Catálogo bloqueado', false);
      return true;
    }

    // Anti-DDD
    if (group.antidd) {
      let dddList = [];
      try { dddList = JSON.parse(group.ddd_list || '[]'); } catch {}
      if (dddList.length) {
        const num = (sender || '').replace(/\D/g, '');
        // DDD MZ style: primeiros dígitos após 258
        const local = num.startsWith('258') ? num.slice(3) : num;
        const prefix = local.slice(0, 2);
        if (dddList.includes(prefix) || dddList.includes(local.slice(0, 3))) {
          await deleteAndWarn(sock, msg, jid, sender, `📵 DDD bloqueado (${prefix})`, true);
          return true;
        }
      }
    }

    // Anti-palavra / palavrão
    if (group.antipalavra || group.antipalavrao) {
      let palavras = [];
      try { palavras = JSON.parse(group.palavras_ban || '[]'); } catch {}
      const defaultBad = ['porra', 'caralho', 'puta', 'fdp', 'vsf', 'pqp'];
      const list = group.antipalavrao ? [...palavras, ...defaultBad] : palavras;
      const lower = text.toLowerCase();
      for (const w of list) {
        if (w && lower.includes(String(w).toLowerCase())) {
          await deleteAndWarn(sock, msg, jid, sender, '🚫 Palavra bloqueada', false);
          return true;
        }
      }
    }

    // Anti-spam (mensagens rápidas)
    if (group.antispam) {
      const key = `${sender}|${jid}`;
      const now = Date.now();
      let data = spamMap.get(key);
      if (!data || now - data.start > 15000) {
        data = { count: 1, start: now };
      } else {
        data.count++;
      }
      spamMap.set(key, data);
      if (data.count >= (config.antispamLimit || 8)) {
        await deleteAndWarn(sock, msg, jid, sender, '⚡ Spam detectado', false);
        spamMap.set(key, { count: 0, start: now });
        return true;
      }
    }

    // Anti-fake (números muito curtos / estrangeiros simples)
    if (group.antifake) {
      const num = (sender || '').replace(/\D/g, '');
      if (num && !num.startsWith('258') && num.length < 11) {
        // Apenas avisa / remove se configurado de forma agressiva - aqui só remove msg
        await deleteAndWarn(sock, msg, jid, sender, '🕵️ Número suspeito (anti-fake)', false);
        return true;
      }
    }

    return false;
  } catch (e) {
    console.error('[SECURITY]', e.message);
    return false;
  }
}

const AUTO_ADV_MSGS = ["⚠️ ADV automatica na cara de @usuario. {motivo} — {n}/{lim}", "😂 @usuario testou a seguranca e levou ADV. {n}/{lim} | {motivo}", "🟡 @usuario avisado. Continua assim e vai pra calcada. {n}/{lim}", "📋 Processo automatico: @usuario. {motivo}. ADV {n}/{lim}", "🚨 Alarme: @usuario quebrou regra. {motivo} — {n}/{lim}", "📛 Etiqueta de aviso em @usuario. {n}/{lim}. {motivo}", "🧹 Staff automatica limpou a paciencia com @usuario. ADV {n}/{lim}", "📉 @usuario caindo no ranking de comportamento. {n}/{lim} | {motivo}", "🎯 Mira automatica em @usuario. ADV {n}/{lim} — {motivo}", "🧊 @usuario no banco da vergonha. {n}/{lim}", "📌 Fixado: @usuario na corda bamba. {n}/{lim} — {motivo}", "🧾 Recibo automatico de ADV pra @usuario. {n}/{lim}", "😤 Paciencia do grupo encolheu por causa de @usuario. {n}/{lim}", "👢 Quase kick: @usuario em {n}/{lim}. {motivo}", "📢 @usuario, para de testar o bot. ADV {n}/{lim}!", "🧨 @usuario acendeu pavio de novo. {motivo} — {n}/{lim}", "🎭 Drama de @usuario ganhou ADV automatica. {n}/{lim}", "🗑️ Quase lixo: @usuario {n}/{lim}. {motivo}", "🛑 Pare, @usuario. Regra nao e brinquedo. ADV {n}/{lim}", "😂 @usuario no modo 'sera que passa?'. Nao passou. {n}/{lim}", "📒 Risquinha automatica em @usuario. {n}/{lim} | {motivo}", "👀 Olho em @usuario. ADV {n}/{lim}. Proximo e adeus.", "🧱 Realidade: @usuario tomou ADV. {n}/{lim} — {motivo}", "🛎️ Aviso express pra @usuario. {n}/{lim}", "📣 @usuario ja tem {n}/{lim} ADV. {motivo}", "🧲 Mediocridade de @usuario puxou ADV. {n}/{lim}", "🎮 Strike {n}/{lim} automatico em @usuario. {motivo}", "🪙 Ainda e ADV, nao ban... por enquanto. @usuario {n}/{lim}", "📎 Prontuario de @usuario: +1 ADV. {n}/{lim}", "👑 Sistema decretou ADV pra @usuario. {n}/{lim} | {motivo}"];
const AUTO_LIMIT_MSGS = ["🚫 @usuario esgotou {lim}/{lim} ADV automaticas. Removido. Ninguem sentiu falta 😂", "👢 @usuario completou o album de ADV e ganhou a calcada.", "🏁 Game Over. @usuario bateu {lim} avisos e foi eliminado.", "📦 @usuario empacotado apos {lim} ADV. Boa viagem, problema.", "💨 {lim} advertencias depois, @usuario evaporou do grupo.", "🧹 Limpeza final: @usuario saiu por excesso de ADV automatica.", "💀 @usuario nao aprendeu com {lim} avisos. Kick automatico.", "🚪 Porta + @usuario + {lim} ADV = FORA.", "😂 @usuario colecionou {lim} ADV e ganhou ticket de saida.", "🛎️ Checkout forcado: @usuario. Excesso de advertencias."];
function pickAuto(arr){return arr[Math.floor(Math.random()*arr.length)];}
function formatAutoAdv(sender, reason, total, limit){let m=pickAuto(AUTO_ADV_MSGS);const tag='@'+String(sender||'').split('@')[0].split(':')[0];m=m.split('@usuario').join(tag);m=m.split('{n}').join(String(total));m=m.split('{lim}').join(String(limit));m=m.split('{motivo}').join(reason||'Regra');return m;}
function formatAutoLimit(sender, limit){let m=pickAuto(AUTO_LIMIT_MSGS);const tag='@'+String(sender||'').split('@')[0].split(':')[0];m=m.split('@usuario').join(tag);m=m.split('{lim}').join(String(limit));return m;}


function isGroupLikeJid(id) {
  const x = String(id || '');
  if (!x) return true;
  if (x.endsWith('@g.us')) return true;
  if (x.endsWith('@lid') && /^\d{14,}@lid$/.test(x)) {
    // lids de grupo costumam ser longos; nao bloquear todos lids de user
  }
  // IDs tipo 120363... sao tipicos de grupo (sem @)
  const digits = x.replace(/\D/g, '');
  if (digits.indexOf('120363') === 0 && digits.length >= 15) return true;
  return false;
}

function resolveStatusOffender(msg, jid, sender) {
  // Se sender ja e um user valido, usar
  if (sender && !isGroupLikeJid(sender) && (String(sender).includes('@s.whatsapp.net') || String(sender).includes('@lid'))) {
    return sender;
  }
  try {
    const m = msg.message || {};
    const ctx =
      (m.groupStatusMentionMessage && m.groupStatusMentionMessage) ||
      (m.statusMentionMessage && m.statusMentionMessage) ||
      (m.groupMentionedMessage && m.groupMentionedMessage) ||
      (m.protocolMessage && m.protocolMessage) ||
      {};
    const cand = [
      msg.key && msg.key.participant,
      msg.key && msg.key.participantPn,
      msg.participant,
      ctx.participant,
      ctx.sender,
      ctx.mentionedJid && ctx.mentionedJid[0],
      m.extendedTextMessage && m.extendedTextMessage.contextInfo && m.extendedTextMessage.contextInfo.participant
    ];
    for (let i = 0; i < cand.length; i++) {
      const c = cand[i];
      if (c && !isGroupLikeJid(c) && String(c) !== String(jid)) return c;
    }
  } catch (_) {}
  // ultimo recurso: se sender for o grupo, nao advertir
  if (isGroupLikeJid(sender) || String(sender) === String(jid)) return null;
  return sender || null;
}

// Dedup: mesma pessoa + mesmo motivo em 8s = 1 adv
var _advRecent = {};
function shouldSkipDuplicateAdv(jid, user, reason) {
  const key = String(jid) + '|' + String(user) + '|' + String(reason || '');
  const now = Date.now();
  if (_advRecent[key] && now - _advRecent[key] < 8000) return true;
  _advRecent[key] = now;
  // limpeza leve
  const keys = Object.keys(_advRecent);
  if (keys.length > 200) {
    for (let i = 0; i < keys.length; i++) {
      if (now - _advRecent[keys[i]] > 60000) delete _advRecent[keys[i]];
    }
  }
  return false;
}

async function deleteAndWarn(sock, msg, jid, sender, reason, removeUser) {
  try {
    await sock.sendMessage(jid, { delete: msg.key });
  } catch {}

  const WARN_LIMIT = 3;
  let total = 0;
  try {
    const db = getDb();
    db.prepare(
      'INSERT INTO group_warns (group_jid, user_jid, reason, by_jid) VALUES (?, ?, ?, ?)'
    ).run(jid, sender, reason || 'Seguranca', 'system');
    const row = db.prepare(
      'SELECT COUNT(*) AS c FROM group_warns WHERE group_jid = ? AND user_jid = ?'
    ).get(jid, sender);
    total = row ? row.c : 0;
  } catch (e) {
    console.error('[SECURITY] warn db', e.message);
  }

  const tagUser = '@' + String(sender || '').split('@')[0].split(':')[0];
  try {
    await sock.sendMessage(jid, {
      text:
        '⚠️ *ADV AUTOMATICA*\n' +
        tagUser + '\n' +
        (reason || 'Regra de seguranca') + '\n' +
        'Total: *' + total + '/' + WARN_LIMIT + '*',
      mentions: [sender]
    });
  } catch {}

  if (removeUser || total >= WARN_LIMIT) {
    try {
      await sock.groupParticipantsUpdate(jid, [sender], 'remove');
      try {
        await sock.sendMessage(jid, {
          text: (removeUser && total < WARN_LIMIT)
            ? ('🚫 @' + String(sender || '').split('@')[0].split(':')[0] + ' removido (HARD).')
            : formatAutoLimit(sender, WARN_LIMIT),
          mentions: [sender]
        });
      } catch {}
      try {
        getDb().prepare(
          'DELETE FROM group_warns WHERE group_jid = ? AND user_jid = ?'
        ).run(jid, sender);
      } catch {}
    } catch (e) {
      try {
        await sock.sendMessage(jid, {
          text: '⚠️ Limite de ADV atingido, mas nao consegui remover. Bot precisa ser *admin*.'
        });
      } catch {}
    }
  }
}

function checkSubscription(groupJid) {
  try {
    const db = getDb();
    const sub = db.prepare(`SELECT * FROM subscriptions WHERE group_jid = ?`).get(groupJid);
    // Sem registro = sem plano ativo → bloqueia comandos protegidos
    if (!sub) return { ok: false, reason: 'no_sub' };
    if (sub.status === 'blocked' || sub.status === 'cancelled') {
      return { ok: false, reason: 'blocked' };
    }
    if (sub.status === 'expired' || (sub.end_date && new Date(sub.end_date) < new Date())) {
      // Auto-expira
      try {
        db.prepare(`UPDATE subscriptions SET status = 'expired' WHERE group_jid = ?`).run(groupJid);
      } catch (_) {}
      return { ok: false, reason: 'expired' };
    }
    if (sub.status !== 'active') return { ok: false, reason: sub.status || 'inactive' };
    return { ok: true, sub };
  } catch (e) {
    // Em erro de DB, não libera grupo por acidente
    console.error('[SUB]', e.message);
    return { ok: false, reason: 'error' };
  }
}

module.exports = {
  checkSecurity,
  checkSubscription
};
