function normalizeDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

function getOwnerDigitsList() {
  const keys = ['OWNER_NUMBER', 'OWNER', 'OWNER_DISPLAY', 'DONO_NUMERO', 'OWNER_NUM'];
  const list = [];
  for (const k of keys) {
    const v = process.env[k];
    if (v) list.push(normalizeDigits(v));
  }
  list.push('874288439', '258874288439');
  return list.filter(Boolean);
}

function getOwnerLids() {
  const raw = [process.env.OWNER_LID, process.env.OWNER_LIDS, process.env.OWNER_JID]
    .filter(Boolean).join(',');
  return raw.split(/[,;\s]+/).map(function (x) { return String(x).trim(); }).filter(Boolean);
}

function isOwnerJid(jid) {
  try {
    const raw = String(jid || '');
    const digits = normalizeDigits(raw);
    const owners = getOwnerDigitsList();
    for (let i = 0; i < owners.length; i++) {
      const o = owners[i];
      if (!o) continue;
      if (digits === o) return true;
      if (digits.endsWith(o)) return true;
      if (o.length >= 9 && digits.endsWith(o.slice(-9))) return true;
    }
    const lids = getOwnerLids();
    for (let i = 0; i < lids.length; i++) {
      const l = lids[i];
      if (!l) continue;
      if (raw === l || raw.indexOf(l) >= 0) return true;
      const ld = normalizeDigits(l);
      if (ld && digits.indexOf(ld) >= 0) return true;
    }
  } catch (e) {}
  return false;
}

module.exports = { isOwnerJid, getOwnerDigitsList, getOwnerLids, normalizeDigits };
