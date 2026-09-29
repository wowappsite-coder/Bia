/**
 * Tenta ler voto de enquete (Baileys).
 * Se nao conseguir, devolve null.
 */
function tryGetVoteIndex(msg, pollRecord) {
  if (!msg || !msg.message || !msg.message.pollUpdateMessage) return null;
  const pu = msg.message.pollUpdateMessage;
  const voter = msg.key.participant || msg.participant || msg.key.remoteJid;

  // Metodo 1: getAggregateVotesInPollMessage
  try {
    const { getAggregateVotesInPollMessage } = require('@whiskeysockets/baileys');
    if (getAggregateVotesInPollMessage && pollRecord && pollRecord.message) {
      const message = pollRecord.message.message
        ? pollRecord.message
        : { message: pollRecord.message };
      const agg = getAggregateVotesInPollMessage({
        message: message,
        pollUpdates: [pu]
      });
      if (Array.isArray(agg)) {
        for (let i = 0; i < agg.length; i++) {
          const voters = agg[i].voters || [];
          for (let j = 0; j < voters.length; j++) {
            const v = String(voters[j] || '');
            const vo = String(voter || '');
            if (v === vo || v.indexOf(vo.split('@')[0]) >= 0 || vo.indexOf(v.split('@')[0]) >= 0) {
              return i;
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('[trivia_poll agg]', e.message);
  }

  // Metodo 2: decryptPollVote (se existir na tua versao)
  try {
    const baileys = require('@whiskeysockets/baileys');
    if (baileys.decryptPollVote && pu.vote && pollRecord && pollRecord.secret) {
      const dec = baileys.decryptPollVote({
        encPayload: pu.vote.encPayload,
        encIv: pu.vote.encIv,
        encKey: pollRecord.secret
      });
      if (dec && dec.selectedOptions && dec.selectedOptions.length) {
        // selectedOptions podem ser indices ou hashes
        const opt = dec.selectedOptions[0];
        if (typeof opt === 'number') return opt;
      }
    }
  } catch (e) {
    console.error('[trivia_poll dec]', e.message);
  }

  return null;
}

module.exports = { tryGetVoteIndex };
