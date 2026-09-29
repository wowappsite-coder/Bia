const SPACE_MENU_MAP = {
  'menu adm': 'menuadm',
  'menu admin': 'menuadm',
  'menu grupo': 'menugrupo',
  'menu gp': 'menugrupo',
  'menu bn': 'menubn',
  'menu diversao': 'menudiversao',
  'menu diversão': 'menudiversao',
  'menu download': 'menudownload',
  'menu downloads': 'menudownload',
  'menu dono': 'menudono',
  'menu owner': 'menudono',
  'menu internet': 'menuinternet',
  'menu fig': 'menufig',
  'menu figurinha': 'menufig',
  'menu stickers': 'menufig',
  'menu sticker': 'menufig',
  'menu img': 'menuimg',
  'menu imagem': 'menuimg',
  'menu seguranca': 'menuseguranca',
  'menu segurança': 'menuseguranca',
  'menu util': 'menuutil',
  'menu utilidades': 'menuutil',
  'menu rpg': 'menurpg',
  'menu familia': 'menurpg',
  'menu família': 'menurpg',
  'menu xp': 'menuxp',
  'menu rank': 'menuxp',
  'menu economia': 'menueconomia',
  'menu aluguel': 'aluguel',
  'menu aluguer': 'aluguel',
  'menu modos': 'menumodos',
  'menu 18': 'menuhentai',
  'menu +18': 'menuhentai',
  'menu hentai': 'menuhentai',
  'menu pesquisa': 'menupesquisa',
  'menu pesquisar': 'menupesquisa',
  'menu search': 'menupesquisa',
  'menu webgames': 'menuwebgames',
  'menu jogos': 'menuwebgames',
  'menu games': 'menuwebgames'
};

function stripAccents(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeCommandText(raw) {
  let t = String(raw || '').trim();
  if (!t) return t;
  const prefixes = ['!', '.', '#', '/', '?'];
  let pref = '';
  for (const p of prefixes) {
    if (t.startsWith(p)) { pref = p; t = t.slice(p.length).trim(); break; }
  }
  const key = stripAccents(t);
  if (SPACE_MENU_MAP[key]) return pref + SPACE_MENU_MAP[key];
  for (const [k, v] of Object.entries(SPACE_MENU_MAP)) {
    if (stripAccents(k) === key) return pref + v;
  }
  return pref + t;
}

module.exports = { normalizeCommandText, SPACE_MENU_MAP };
