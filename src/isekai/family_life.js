/**
 * Vida familiar Isekai — NAO e o RPG familia do bot
 */
const MOODS = [
  { min: 80, label: 'Feliz', emoji: '😊' },
  { min: 60, label: 'Bem', emoji: '🙂' },
  { min: 40, label: 'Normal', emoji: '😐' },
  { min: 20, label: 'Triste', emoji: '😔' },
  { min: 0, label: 'Conflitado', emoji: '😡' }
];

const HOUSES = [
  { id: 'nenhum', name: 'Nenhum', cost: 0 },
  { id: 'quarto', name: 'Quarto alugado', cost: 50 },
  { id: 'simples', name: 'Casa simples', cost: 200 },
  { id: 'confortavel', name: 'Casa confortavel', cost: 500 },
  { id: 'mansao', name: 'Mansao', cost: 1500 }
];

const ACTIVITIES = {
  limpar: { id: 'limpar', cat: 'casa', name: 'Limpar a casa', cost: 0, bond: 2, mood: 3, cd: 60 },
  cozinhar: { id: 'cozinhar', cat: 'casa', name: 'Cozinhar jantar', cost: 8, bond: 4, mood: 5, cd: 90, item: 'peixe' },
  cafe: { id: 'cafe', cat: 'casa', name: 'Cafe da manha', cost: 5, bond: 3, mood: 4, cd: 90 },
  descansar: { id: 'descansar', cat: 'casa', name: 'Descansar em familia', cost: 0, bond: 2, mood: 6, cd: 120 },
  jardim: { id: 'jardim', cat: 'casa', name: 'Cuidar do jardim', cost: 3, bond: 2, mood: 3, cd: 90 },
  conversar: { id: 'conversar', cat: 'rel', name: 'Conversar com conjuge', cost: 0, bond: 5, mood: 4, cd: 60, needSpouse: true },
  presente: { id: 'presente', cat: 'rel', name: 'Dar presente', cost: 15, bond: 8, mood: 6, cd: 120, needSpouse: true },
  jantar_fora: { id: 'jantar_fora', cat: 'rel', name: 'Jantar fora', cost: 25, bond: 7, mood: 7, cd: 180, needSpouse: true },
  caminhar: { id: 'caminhar', cat: 'rel', name: 'Caminhar juntos', cost: 0, bond: 4, mood: 5, cd: 90, needSpouse: true },
  encontro: { id: 'encontro', cat: 'rel', name: 'Encontro romantico', cost: 20, bond: 9, mood: 8, cd: 200, needSpouse: true },
  brincar: { id: 'brincar', cat: 'filhos', name: 'Brincar com filho', cost: 0, bond: 6, mood: 5, cd: 90, needKid: true },
  ensinar: { id: 'ensinar', cat: 'filhos', name: 'Ensinar habilidade', cost: 10, bond: 5, mood: 4, cd: 120, needKid: true },
  passeio_filho: { id: 'passeio_filho', cat: 'filhos', name: 'Passeio com filho', cost: 12, bond: 7, mood: 6, cd: 150, needKid: true },
  refeicao: { id: 'refeicao', cat: 'filhos', name: 'Refeicao em familia', cost: 10, bond: 6, mood: 7, cd: 120 },
  praca: { id: 'praca', cat: 'cotidiano', name: 'Ir a praca', cost: 0, bond: 3, mood: 4, cd: 60 },
  mercado: { id: 'mercado', cat: 'cotidiano', name: 'Visitar mercado', cost: 5, bond: 2, mood: 3, cd: 90 },
  taverna: { id: 'taverna', cat: 'cotidiano', name: 'Visitar taverna', cost: 12, bond: 3, mood: 5, cd: 100 },
  parque: { id: 'parque', cat: 'cotidiano', name: 'Piquenique no parque', cost: 8, bond: 5, mood: 6, cd: 120 },
  pescar_fam: { id: 'pescar_fam', cat: 'cotidiano', name: 'Pescar em familia', cost: 5, bond: 5, mood: 5, cd: 120, reward: 'peixe' },
  festival: { id: 'festival', cat: 'evento', name: 'Festival da cidade', cost: 20, bond: 8, mood: 10, cd: 300 },
  festa: { id: 'festa', cat: 'evento', name: 'Festa familiar', cost: 30, bond: 10, mood: 12, cd: 360 }
};

const EVENTS = [
  'Seu conjuge preparou uma pequena surpresa.',
  'Uma chuva leve cai sobre o telhado. Momento calmo.',
  'Chegou uma carta de um parente distante.',
  'A casa precisa de pequenos reparos.',
  'Convite para o festival da vila.',
  'Seu filho (ou futuro filho) sonha em ser aventureiro.',
  'O mercado local esta em promocao hoje.',
  'Uma noite estrelada convida a conversar.'
];

function ensureFamily(data) {
  if (!data.family) data.family = {};
  const f = data.family;
  if (f.mood == null) f.mood = 55;
  if (f.bondSpouse == null) f.bondSpouse = data.marriedTo ? 50 : 0;
  if (f.bondKids == null) f.bondKids = 0;
  if (!f.house) f.house = 'nenhum';
  if (!f.upgrades) f.upgrades = [];
  if (!f.memories) f.memories = [];
  if (!f.kids) f.kids = [];
  if (!f.cooldowns) f.cooldowns = {};
  if (f.spousePersonality == null && data.marriedTo) {
    const ps = ['gentil', 'alegre', 'timido', 'aventureiro', 'trabalhador', 'carinhoso', 'serio'];
    f.spousePersonality = ps[Math.floor(Math.random() * ps.length)];
  }
  if (data.iene == null) data.iene = 0;
  return data;
}

function moodLabel(v) {
  for (let i = 0; i < MOODS.length; i++) {
    if (v >= MOODS[i].min) return MOODS[i];
  }
  return MOODS[MOODS.length - 1];
}

function panelMain(data) {
  ensureFamily(data);
  const f = data.family;
  const m = moodLabel(f.mood);
  const house = HOUSES.find(function (h) { return h.id === f.house; }) || HOUSES[0];
  const spouse = f.spouse || data.marriedTo || 'Nenhum';
  return (
    '╭──〔 🌸 𝐅𝐀𝐌𝐈́𝐋𝐈𝐀 𝐈𝐒𝐄𝐊𝐀𝐈 〕──╮\n' +
    '> 𝐕𝐢𝐝𝐚 & 𝐃𝐞𝐬𝐭𝐢𝐧𝐨\n' +
    '❀────────────────❀\n' +
    '╭──〔 🏡 𝐑𝐄𝐒𝐔𝐌𝐎 〕──╮\n' +
    '◈┃❤️ Conjuge: ' + spouse + '\n' +
    '◈┃👶 Filhos: ' + (f.kids.length || 0) + '\n' +
    '◈┃🏡 Lar: ' + house.name + '\n' +
    '◈┃' + m.emoji + ' Humor: ' + m.label + ' (' + f.mood + ')\n' +
    '◈┃💕 Vinculo conjuge: ' + f.bondSpouse + '/100\n' +
    '◈┃🪙 IENE: ' + (data.iene || 0) + '\n' +
    '╰──────────────────╯\n' +
    '╭──〔 🗂️ 𝐌𝐄𝐍𝐔𝐒 〕──╮\n' +
    '◈┃ iskfamiilia lar\n' +
    '◈┃ iskfamiilia relacionamento\n' +
    '◈┃ iskfamiilia filhos\n' +
    '◈┃ iskfamiilia atividades\n' +
    '◈┃ iskfamiilia eventos\n' +
    '◈┃ iskfamiilia memorias\n' +
    '◈┃ iskfamiilia financas\n' +
    '╰──────────────────╯\n' +
    '> 🥏┃ Ex: iskfamiilia atividades\n' +
    '❀────────────────❀'
  );
}

function listActivities(page) {
  page = Math.max(1, page || 1);
  const ids = Object.keys(ACTIVITIES);
  const per = 8;
  const start = (page - 1) * per;
  const slice = ids.slice(start, start + per);
  const maxPage = Math.max(1, Math.ceil(ids.length / per));
  let t = '╭──〔 🌸 𝐀𝐓𝐈𝐕𝐈𝐃𝐀𝐃𝐄𝐒 〕──╮\n';
  t += '> Pagina ' + page + '/' + maxPage + '\n';
  slice.forEach(function (id) {
    const a = ACTIVITIES[id];
    t += '◈┃ `' + id + '` — ' + a.name;
    if (a.cost) t += ' (Y' + a.cost + ')';
    t += '\n';
  });
  t += '╰──────────────────╯\n';
  t += '> Fazer: iskfamiilia fazer ' + (slice[0] || 'limpar') + '\n';
  if (page < maxPage) t += '> Prox: iskfamiilia atividades ' + (page + 1) + '\n';
  t += '> Voltar: iskfamiilia';
  return t;
}

function doActivity(data, actId) {
  ensureFamily(data);
  const a = ACTIVITIES[actId];
  if (!a) return { ok: false, msg: 'Atividade desconhecida. iskfamiilia atividades' };
  if (a.needSpouse && !data.marriedTo && !data.family.spouse) {
    return { ok: false, msg: 'Precisas de conjuge (iskcasar).' };
  }
  if (a.needKid && !(data.family.kids && data.family.kids.length)) {
    return { ok: false, msg: 'Ainda sem filhos nesta vida.' };
  }
  const now = Date.now();
  const cdKey = 'fam_' + actId;
  if ((data.family.cooldowns[cdKey] || 0) > now) {
    const s = Math.ceil((data.family.cooldowns[cdKey] - now) / 1000);
    return { ok: false, msg: 'Espera ' + s + 's para repetir.' };
  }
  if ((data.iene || 0) < (a.cost || 0)) {
    return { ok: false, msg: 'IENE insuficiente (Y' + a.cost + ').' };
  }
  data.iene = (data.iene || 0) - (a.cost || 0);
  data.family.cooldowns[cdKey] = now + (a.cd || 60) * 1000;
  data.family.mood = Math.max(0, Math.min(100, data.family.mood + (a.mood || 0)));
  if (a.needSpouse || data.marriedTo) {
    data.family.bondSpouse = Math.max(0, Math.min(100, data.family.bondSpouse + (a.bond || 0)));
  }
  if (a.needKid || (data.family.kids && data.family.kids.length)) {
    data.family.bondKids = Math.max(0, Math.min(100, data.family.bondKids + Math.floor((a.bond || 0) * 0.8)));
  }
  let loot = null;
  if (a.loot && Math.random() < 0.55) {
    data.inventory = data.inventory || {};
    data.inventory[a.loot] = (data.inventory[a.loot] || 0) + (1 + Math.floor(Math.random() * 2));
    loot = a.loot;
  }
  // memoria ocasional
  if (Math.random() < 0.35) {
    data.family.memories.push({
      t: Date.now(),
      text: a.name
    });
    if (data.family.memories.length > 25) {
      data.family.memories = data.family.memories.slice(-25);
    }
  }
  const m = moodLabel(data.family.mood);
  return {
    ok: true,
    activity: a,
    mood: m,
    bondSpouse: data.family.bondSpouse,
    bondKids: data.family.bondKids,
    loot: loot,
    cost: a.cost || 0
  };
}

function buyHouse(data, houseId) {
  ensureFamily(data);
  const h = HOUSES.find(function (x) { return x.id === houseId; });
  if (!h || h.id === 'nenhum') return { ok: false, msg: 'Casas: quarto, simples, confortavel, mansao' };
  if (data.family.house === h.id) return { ok: false, msg: 'Ja tens esta casa.' };
  const cur = HOUSES.find(function (x) { return x.id === data.family.house; });
  if (cur && cur.cost >= h.cost && h.id !== 'nenhum') {
    return { ok: false, msg: 'So podes melhorar (casa melhor).' };
  }
  if ((data.iene || 0) < h.cost) return { ok: false, msg: 'Custa Y' + h.cost };
  data.iene -= h.cost;
  data.family.house = h.id;
  data.family.mood = Math.min(100, data.family.mood + 8);
  return { ok: true, house: h };
}

function randomEvent(data) {
  ensureFamily(data);
  return EVENTS[Math.floor(Math.random() * EVENTS.length)];
}

function memoriesText(data) {
  ensureFamily(data);
  const mem = data.family.memories || [];
  if (!mem.length) return 'Sem memorias ainda.\nFaz atividades: iskfamiilia atividades';
  let t = '╭──〔 📖 𝐌𝐄𝐌𝐎́𝐑𝐈𝐀𝐒 〕──╮\n';
  mem.slice(-8).forEach(function (m, i) {
    t += '◈┃ ' + (i + 1) + '. ' + m.text + '\n';
  });
  t += '╰──────────────────╯';
  return t;
}

module.exports = {
  ACTIVITIES, HOUSES, MOODS, EVENTS,
  ensureFamily, moodLabel, panelMain, listActivities,
  doActivity, buyHouse, randomEvent, memoriesText
};
