const ROMANCE_NPCS = {
  elena: { id: 'elena', name: 'Elena', likes: ['cristal', 'pocao', 'pergaminho'], dislikes: ['osso'], minRel: 40 },
  mara: { id: 'mara', name: 'Mara', likes: ['pao', 'carne', 'pocao'], dislikes: ['preso'], minRel: 35 },
  lyra: { id: 'lyra', name: 'Lyra', likes: ['cristal', 'pergaminho'], dislikes: ['ferro'], minRel: 40 },
  orin: { id: 'orin', name: 'Orin', likes: ['ouro', 'cristal', 'ferro'], dislikes: [], minRel: 45 }
};

const PARTY_ROLES = ['tank', 'dps', 'mage', 'healer', 'support'];

function ensureSocial(data) {
  if (!data.npcRel) data.npcRel = {};
  if (!data.npcTrust) data.npcTrust = {};
  if (!data.npcFlags) data.npcFlags = {};
  if (!data.partner) data.partner = null;
  if (!data.marriedTo) data.marriedTo = null;
  if (!data.family) data.family = { spouse: null, kids: [], marriedAt: null };
  if (!data.party) data.party = [];
  if (data.partyMoral == null) data.partyMoral = 70;
  if (!data.choices) data.choices = {};
  if (!data.cooldowns) data.cooldowns = {};
  if (!data.inventory) data.inventory = {};
  if (data.iene == null) data.iene = 0;
  if (!data.titles) data.titles = [];
  return data;
}

function relScore(data, npcId) {
  return data.npcRel[npcId] || 0;
}

function trustScore(data, npcId) {
  if (data.npcTrust[npcId] != null) return data.npcTrust[npcId];
  return Math.floor((data.npcRel[npcId] || 0) / 2);
}

function relLabel(score) {
  if (score <= -40) return 'Inimigo';
  if (score <= -15) return 'Hostil';
  if (score < 15) return 'Neutro';
  if (score < 35) return 'Amigavel';
  if (score < 55) return 'Amigo';
  if (score < 75) return 'Proximo';
  return 'Confidente';
}

function addRel(data, npcId, dRel, dTrust) {
  ensureSocial(data);
  data.npcRel[npcId] = Math.max(-100, Math.min(100, (data.npcRel[npcId] || 0) + (dRel || 0)));
  const baseTrust = trustScore(data, npcId);
  data.npcTrust[npcId] = Math.max(-100, Math.min(100, baseTrust + (dTrust != null ? dTrust : Math.floor((dRel || 0) / 2))));
  return { rel: data.npcRel[npcId], trust: data.npcTrust[npcId] };
}

function gift(data, npcId, itemId) {
  ensureSocial(data);
  const now = Date.now();
  const key = 'gift_' + npcId;
  if ((data.cooldowns[key] || 0) > now) {
    return { ok: false, msg: 'Espera ' + Math.ceil((data.cooldowns[key] - now) / 1000) + 's para presentear.' };
  }
  if ((data.inventory[itemId] || 0) < 1) return { ok: false, msg: 'Nao tens esse item.' };
  data.inventory[itemId]--;
  if (data.inventory[itemId] <= 0) delete data.inventory[itemId];
  data.cooldowns[key] = now + 60000;

  const rom = ROMANCE_NPCS[npcId];
  let delta = 3;
  let note = 'gostou';
  if (rom) {
    if ((rom.likes || []).indexOf(itemId) >= 0) { delta = 8; note = 'ADOROU'; }
    if ((rom.dislikes || []).indexOf(itemId) >= 0) { delta = -6; note = 'nao gostou'; }
  }
  const r = addRel(data, npcId, delta, Math.floor(delta / 2));
  return { ok: true, delta: delta, note: note, rel: r.rel, trust: r.trust };
}

function tryDate(data, npcId) {
  ensureSocial(data);
  const rom = ROMANCE_NPCS[npcId];
  if (!rom) return { ok: false, msg: 'Este NPC nao tem rota romantica (elena|mara|lyra|orin).' };
  if (data.marriedTo) return { ok: false, msg: 'Ja estas casado(a).' };
  if (data.partner && data.partner !== npcId) return { ok: false, msg: 'Ja namoras. iskterminar primeiro.' };
  const rel = relScore(data, npcId);
  const trust = trustScore(data, npcId);
  if (rel < rom.minRel || trust < rom.minRel - 10) {
    return { ok: false, msg: rom.name + ' ainda nao tem interesse.\nRel ' + rel + ' / Trust ' + trust + ' (min \~' + rom.minRel + ')' };
  }
  data.partner = npcId;
  data.npcFlags[npcId] = data.npcFlags[npcId] || {};
  data.npcFlags[npcId].dating = true;
  addRel(data, npcId, 5, 5);
  return { ok: true, name: rom.name };
}

function tryMarry(data, npcId) {
  ensureSocial(data);
  const rom = ROMANCE_NPCS[npcId];
  if (!rom) return { ok: false, msg: 'NPC invalido.' };
  if (data.marriedTo) return { ok: false, msg: 'Ja casado(a).' };
  if (data.partner !== npcId) return { ok: false, msg: 'Namora primeiro: isknamorar ' + npcId };
  const rel = relScore(data, npcId);
  const trust = trustScore(data, npcId);
  if (rel < 70 || trust < 55) {
    return { ok: false, msg: 'Precisa Rel>=70 e Trust>=55 (tens ' + rel + '/' + trust + ').' };
  }
  const cost = 100;
  if ((data.iene || 0) < cost) return { ok: false, msg: 'Cerimonia custa Y' + cost };
  data.iene -= cost;
  data.marriedTo = npcId;
  data.partner = npcId;
  data.family.spouse = rom.name;
  data.family.marriedAt = new Date().toISOString();
  data.npcFlags[npcId] = data.npcFlags[npcId] || {};
  data.npcFlags[npcId].married = true;
  addRel(data, npcId, 10, 10);
  if (data.titles.indexOf('Casado') < 0) data.titles.push('Casado');
  return { ok: true, name: rom.name, cost: cost };
}

function breakUp(data) {
  ensureSocial(data);
  if (!data.partner && !data.marriedTo) return { ok: false, msg: 'Sem relacionamento.' };
  if (data.marriedTo) return { ok: false, msg: 'Casamento nao se dissolve por comando simples.' };
  const id = data.partner;
  data.partner = null;
  if (data.npcFlags[id]) data.npcFlags[id].dating = false;
  addRel(data, id, -15, -10);
  return { ok: true };
}

function inviteParty(data, npcId) {
  ensureSocial(data);
  if (data.party.length >= 3) return { ok: false, msg: 'Party cheia (max 3 + tu).' };
  if (data.party.find(function (m) { return m.id === npcId; })) {
    return { ok: false, msg: 'Ja esta na party.' };
  }
  const rel = relScore(data, npcId);
  const trust = trustScore(data, npcId);
  if (rel < 20) return { ok: false, msg: 'Relacao baixa. Recusou.' };
  const chance = Math.min(90, 40 + trust);
  if (Math.random() * 100 > chance) {
    addRel(data, npcId, -2, -1);
    return { ok: false, msg: 'O NPC recusou o convite.' };
  }
  const role = PARTY_ROLES[Math.floor(Math.random() * PARTY_ROLES.length)];
  const name = (ROMANCE_NPCS[npcId] && ROMANCE_NPCS[npcId].name) || npcId;
  data.party.push({
    id: npcId, name: name, role: role,
    loyalty: Math.min(100, 40 + Math.floor(rel / 2)),
    hp: 80, hpMax: 80
  });
  data.partyMoral = Math.min(100, (data.partyMoral || 70) + 5);
  addRel(data, npcId, 3, 2);
  return { ok: true, role: role, name: name };
}

function kickParty(data, npcId) {
  ensureSocial(data);
  const i = data.party.findIndex(function (m) { return m.id === npcId; });
  if (i < 0) return { ok: false, msg: 'Nao esta na party.' };
  data.party.splice(i, 1);
  data.partyMoral = Math.max(0, (data.partyMoral || 70) - 8);
  addRel(data, npcId, -5, -3);
  return { ok: true };
}

function camp(data) {
  ensureSocial(data);
  const now = Date.now();
  if ((data.cooldowns.camp || 0) > now) {
    return { ok: false, msg: 'Espera ' + Math.ceil((data.cooldowns.camp - now) / 1000) + 's.' };
  }
  data.cooldowns.camp = now + 90000;
  const heal = 15 + Math.floor(Math.random() * 20);
  data.hp = Math.min(data.hpMax || 100, (data.hp || 50) + heal);
  data.mana = Math.min(data.manaMax || 50, (data.mana || 20) + 10);
  data.partyMoral = Math.min(100, (data.partyMoral || 70) + 8);
  data.party.forEach(function (m) {
    m.hp = m.hpMax;
    m.loyalty = Math.min(100, (m.loyalty || 50) + 2);
  });
  const chats = [
    'O grupo conversa ao redor da fogueira.',
    'Alguem conta uma historia de batalha.',
    'Voces reparam o equipamento em silencio.',
    'O cheiro da comida sobe na noite.'
  ];
  return { ok: true, heal: heal, chat: chats[Math.floor(Math.random() * chats.length)] };
}

function makeChoice(data, choiceId, option) {
  ensureSocial(data);
  const CHOICES = {
    merchant_attack: {
      text: 'Um comerciante esta a ser atacado!',
      options: {
        '1': { label: 'Ajudar', rel: 5, iene: -5, flag: 'helped_merchant' },
        '2': { label: 'Ignorar', rel: -2, flag: 'ignored_merchant' },
        '3': { label: 'Roubar os bandidos', iene: 25, rep: -10, flag: 'robbed_bandits' }
      }
    },
    lost_child: {
      text: 'Uma crianca esta perdida na praca.',
      options: {
        '1': { label: 'Ajudar a encontrar os pais', rel: 6, flag: 'helped_child' },
        '2': { label: 'Ignorar', rel: -3, flag: 'ignored_child' }
      }
    }
  };
  const c = CHOICES[choiceId];
  if (!c) return { ok: false, msg: 'Escolha desconhecida.' };
  if (data.choices[choiceId]) return { ok: false, msg: 'Ja fizeste esta escolha.' };
  const opt = c.options[String(option)];
  if (!opt) return { ok: false, msg: 'Opcao invalida (1/2/3).' };
  data.choices[choiceId] = { option: String(option), at: Date.now() };
  if (opt.iene) data.iene = Math.max(0, (data.iene || 0) + opt.iene);
  if (opt.rel) {
    data.cityRep = data.cityRep || {};
    const loc = data.location || 'vila_inicial';
    data.cityRep[loc] = (data.cityRep[loc] || 0) + opt.rel;
  }
  if (opt.rep) data.guildRep = (data.guildRep || 0) + opt.rep;
  if (opt.flag) data.npcFlags[opt.flag] = true;
  return { ok: true, label: opt.label, text: c.text };
}

module.exports = {
  ROMANCE_NPCS, ensureSocial, relScore, trustScore, relLabel, addRel,
  gift, tryDate, tryMarry, breakUp, inviteParty, kickParty, camp, makeChoice
};
