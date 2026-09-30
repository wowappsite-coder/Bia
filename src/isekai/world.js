const PLACES = {
  vila_inicial: {
    id: 'vila_inicial', name: 'Vila Inicial', type: 'vila', danger: 1,
    links: ['floresta_verde', 'estrada_norte'],
    services: ['taverna', 'mercado', 'ferreiro'],
    desc: 'Pequena vila onde muitos aventureiros comecam.'
  },
  floresta_verde: {
    id: 'floresta_verde', name: 'Floresta Verde', type: 'floresta', danger: 2,
    links: ['vila_inicial', 'ruinas'],
    services: [],
    desc: 'Arvores densas. Monstros fracos e ervas.'
  },
  estrada_norte: {
    id: 'estrada_norte', name: 'Estrada do Norte', type: 'estrada', danger: 2,
    links: ['vila_inicial', 'capital'],
    services: [],
    desc: 'Caminho para a capital. Bandidos ocasionais.'
  },
  capital: {
    id: 'capital', name: 'Capital Eloria', type: 'cidade', danger: 1,
    links: ['estrada_norte', 'porto', 'academia'],
    services: ['guilda', 'mercado', 'banco', 'hospital', 'taverna'],
    desc: 'Grande cidade: guilda, mercado e academia.'
  },
  porto: {
    id: 'porto', name: 'Porto de Eloria', type: 'porto', danger: 2,
    links: ['capital', 'ilha_nevoa'],
    services: ['mercado', 'taverna'],
    desc: 'Cheiro a mar. Peixe barato e navios.'
  },
  academia: {
    id: 'academia', name: 'Academia de Magia', type: 'escola', danger: 1,
    links: ['capital'],
    services: ['escola'],
    desc: 'Torres e livros. Magos estudam aqui.'
  },
  ruinas: {
    id: 'ruinas', name: 'Ruinas Antigas', type: 'ruina', danger: 3,
    links: ['floresta_verde', 'caverna'],
    services: [],
    secret: true,
    desc: 'Pedras antigas e ecos estranhos.'
  },
  caverna: {
    id: 'caverna', name: 'Caverna Escura', type: 'caverna', danger: 3,
    links: ['ruinas'],
    services: [],
    desc: 'Umidade e minerio. Cuidado com o que mora dentro.'
  },
  ilha_nevoa: {
    id: 'ilha_nevoa', name: 'Ilha da Nevoa', type: 'ilha', danger: 4,
    links: ['porto'],
    services: [],
    secret: true,
    desc: 'Nevoeiro eterno. Rumores de tesouros.'
  }
};

const NPCS = {
  mara: {
    id: 'mara', name: 'Mara', place: 'vila_inicial', job: 'taverneira',
    personality: 'amigavel', lines: [
      'Bem-vindo a taverna! Cuidado na floresta.',
      'Ouvi falar de ruinas ao norte da floresta...',
      'Um prato quente e boas historias, sempre.'
    ]
  },
  garen: {
    id: 'garen', name: 'Garen', place: 'vila_inicial', job: 'ferreiro',
    personality: 'serio', lines: [
      'Preciso de ferro. Traz minerio e falamos.',
      'Uma boa lamina salva vidas.',
      'Nao estragues o aço.'
    ]
  },
  elena: {
    id: 'elena', name: 'Elena', place: 'capital', job: 'guild_master',
    personality: 'confiante', lines: [
      'A guilda precisa de aventureiros capazes.',
      'Rank sobe com feitos, nao com palavras.',
      'Ha rumores de um dragao nas montanhas...'
    ]
  },
  orin: {
    id: 'orin', name: 'Orin', place: 'porto', job: 'comerciante',
    personality: 'ganancioso', lines: [
      'Peixe barato hoje. Cristais? Caros.',
      'Negocio e negocio.',
      'A ilha na nevoa nao e para novatos.'
    ]
  },
  lyra: {
    id: 'lyra', name: 'Lyra', place: 'academia', job: 'professora',
    personality: 'misteriosa', lines: [
      'A magia exige disciplina.',
      'Estuda antes de conjurar.',
      'O tempo e o espaco tem preco.'
    ]
  },
  bruno: {
    id: 'bruno', name: 'Bruno', place: 'capital', job: 'guarda',
    personality: 'desconfiado', lines: [
      'Sem confusao na capital.',
      'Crimes tem consequencias.',
      'Movimenta-te.'
    ]
  }
};

const EVENTS = [
  { id: 'festival', name: 'Festival da Vila', effect: 'comercio+' },
  { id: 'tempestade', name: 'Tempestade', effect: 'viagem-' },
  { id: 'feira', name: 'Feira Comercial', effect: 'precos' },
  { id: 'lobos', name: 'Lobos na estrada', effect: 'perigo+' },
  { id: 'colheita', name: 'Boa Colheita', effect: 'comida+' }
];

const RUMORS = [
  'Ouvi dizer que existe uma ruina ao norte da floresta.',
  'Um dragao foi visto longe, nas montanhas.',
  'O porto paga bem por cristais.',
  'A academia esconde livros proibidos.',
  'Na ilha da nevoa ha um tesouro... ou uma armadilha.',
  'Bandidos rondam a estrada do norte a noite.'
];

function ensureWorld(data) {
  if (!data.location) data.location = 'vila_inicial';
  if (!data.discovered) data.discovered = { vila_inicial: true };
  if (!data.npcRel) data.npcRel = {};
  if (!data.cityRep) data.cityRep = {};
  if (!data.cooldowns) data.cooldowns = {};
  if (data.iene == null) data.iene = 0;
  if (!data.worldEvent) data.worldEvent = null;
  if (data.worldTime == null) data.worldTime = 0;
  return data;
}

function getPlace(id) {
  return PLACES[id] || null;
}

function timeOfDay(data) {
  ensureWorld(data);
  const t = (data.worldTime || 0) % 4;
  return ['Manha', 'Dia', 'Tarde', 'Noite'][t];
}

function weather() {
  const w = ['Ensolarado', 'Nublado', 'Chuva', 'Neblina', 'Vento'];
  return w[Math.floor(Math.random() * w.length)];
}

function relLabel(score) {
  if (score <= -40) return 'Inimigo';
  if (score <= -15) return 'Hostil';
  if (score < 15) return 'Neutro';
  if (score < 40) return 'Amigavel';
  if (score < 70) return 'Amigo';
  return 'Confidente';
}

function addRel(data, npcId, delta) {
  ensureWorld(data);
  data.npcRel[npcId] = Math.max(-100, Math.min(100, (data.npcRel[npcId] || 0) + delta));
  return data.npcRel[npcId];
}

function activeEvent(data) {
  ensureWorld(data);
  const now = Date.now();
  if (data.worldEvent && data.worldEvent.until > now) return data.worldEvent;
  if (Math.random() < 0.15) {
    const e = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    data.worldEvent = { id: e.id, name: e.name, effect: e.effect, until: now + 30 * 60 * 1000 };
    return data.worldEvent;
  }
  data.worldEvent = null;
  return null;
}

function travel(data, destId) {
  ensureWorld(data);
  const cur = getPlace(data.location);
  const dest = getPlace(destId);
  if (!dest) return { ok: false, msg: 'Local desconhecido.' };
  if (!cur) return { ok: false, msg: 'Localizacao invalida.' };
  if (cur.links.indexOf(destId) < 0) {
    return { ok: false, msg: 'Nao ha caminho direto. Links: ' + cur.links.join(', ') };
  }
  if (dest.secret && !data.discovered[destId]) {
    // permite viajar se link conhecido, marca descoberta
  }
  const cost = 5 + (dest.danger || 1) * 3;
  if ((data.iene || 0) < cost) return { ok: false, msg: 'Viagem custa Y' + cost };
  const now = Date.now();
  if ((data.cooldowns.travel || 0) > now) {
    return { ok: false, msg: 'Espera ' + Math.ceil((data.cooldowns.travel - now) / 1000) + 's.' };
  }
  data.iene -= cost;
  data.cooldowns.travel = now + 20000;
  data.location = destId;
  data.discovered[destId] = true;
  data.worldTime = (data.worldTime || 0) + 1;

  // evento de viagem
  let event = null;
  const roll = Math.random();
  if (roll < 0.12 * (dest.danger || 1)) {
    event = 'perigo';
  } else if (roll < 0.2) {
    event = 'viajante';
  } else if (roll < 0.28) {
    event = 'tesouro';
    data.iene += 10 + Math.floor(Math.random() * 20);
  }
  return { ok: true, place: dest, cost: cost, event: event };
}

function exploreHere(data) {
  ensureWorld(data);
  const place = getPlace(data.location);
  if (!place) return { ok: false, msg: 'Local invalido.' };
  const now = Date.now();
  if ((data.cooldowns.explore || 0) > now) {
    return { ok: false, msg: 'Espera ' + Math.ceil((data.cooldowns.explore - now) / 1000) + 's.' };
  }
  data.cooldowns.explore = now + 35000;
  data.worldTime = (data.worldTime || 0) + 1;

  const roll = Math.random() * 100;
  const danger = place.danger || 1;

  if (roll < 8) {
    // segredo
    const secrets = Object.keys(PLACES).filter(function (id) {
      return PLACES[id].secret && !data.discovered[id] && (place.links.indexOf(id) >= 0 || Math.random() < 0.3);
    });
    if (secrets.length) {
      const s = secrets[Math.floor(Math.random() * secrets.length)];
      data.discovered[s] = true;
      return { ok: true, type: 'segredo', place: PLACES[s] };
    }
  }
  if (roll < 15 + danger * 8) {
    return { ok: true, type: 'monstro', danger: danger };
  }
  if (roll < 30) {
    const mats = ['erva', 'couro', 'madeira', 'ferro', 'pena'];
    const id = mats[Math.floor(Math.random() * mats.length)];
    if (!data.inventory) data.inventory = {};
    data.inventory[id] = (data.inventory[id] || 0) + 1;
    return { ok: true, type: 'recurso', item: id };
  }
  if (roll < 40) {
    data.iene += 5 + Math.floor(Math.random() * 15);
    return { ok: true, type: 'tesouro', iene: 5 };
  }
  if (roll < 55) {
    const npcs = Object.keys(NPCS).filter(function (id) { return NPCS[id].place === data.location; });
    if (npcs.length) {
      return { ok: true, type: 'npc', npc: NPCS[npcs[Math.floor(Math.random() * npcs.length)]] };
    }
  }
  if (roll < 65) {
    return { ok: true, type: 'rumor', text: RUMORS[Math.floor(Math.random() * RUMORS.length)] };
  }
  return { ok: true, type: 'nada', msg: 'Exploraste a area... nada de especial.' };
}

function talkNpc(data, npcId) {
  ensureWorld(data);
  const npc = NPCS[npcId];
  if (!npc) return { ok: false, msg: 'NPC desconhecido. isknpc' };
  if (npc.place !== data.location) {
    return { ok: false, msg: npc.name + ' esta em ' + (getPlace(npc.place) && getPlace(npc.place).name || npc.place) };
  }
  const line = npc.lines[Math.floor(Math.random() * npc.lines.length)];
  const rel = addRel(data, npcId, 2);
  return { ok: true, npc: npc, line: line, rel: rel, label: relLabel(rel) };
}

function rollWorldEvent(data) {
  return activeEvent(data);
}

module.exports = {
  PLACES, NPCS, EVENTS, RUMORS,
  ensureWorld, getPlace, timeOfDay, weather, relLabel, addRel,
  travel, exploreHere, talkNpc, rollWorldEvent, activeEvent
};
