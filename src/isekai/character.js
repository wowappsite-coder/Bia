const RARITY_WEIGHTS = { comum:45, incomum:25, rara:15, epica:8, lendaria:4, mitica:2, divina:1 };
const RACES = [
  { id:'humano', name:'Humano', rarity:'comum', bonuses:{ forca:1, inteligencia:1, carisma:1 } },
  { id:'elfo', name:'Elfo', rarity:'incomum', bonuses:{ magia:3, percepcao:2, agilidade:1 } },
  { id:'meio_elfo', name:'Meio-Elfo', rarity:'incomum', bonuses:{ carisma:2, magia:1, precisao:1 } },
  { id:'anao', name:'Anão', rarity:'incomum', bonuses:{ defesa:3, vitalidade:2, forca:1 } },
  { id:'beastman', name:'Beastman', rarity:'incomum', bonuses:{ forca:2, agilidade:2, percepcao:1 } },
  { id:'demi', name:'Demi-Humano', rarity:'incomum', bonuses:{ agilidade:2, percepcao:2 } },
  { id:'goblin', name:'Goblin', rarity:'comum', bonuses:{ agilidade:2, sorte:1 } },
  { id:'orc', name:'Orc', rarity:'incomum', bonuses:{ forca:3, vitalidade:2 } },
  { id:'demonio', name:'Demônio', rarity:'rara', bonuses:{ magia:3, forca:2, carisma:-1 } },
  { id:'meio_demonio', name:'Meio-Demônio', rarity:'rara', bonuses:{ magia:2, forca:2 } },
  { id:'vampiro', name:'Vampiro', rarity:'rara', bonuses:{ agilidade:3, carisma:2, vitalidade:-1 } },
  { id:'oni', name:'Oni', rarity:'rara', bonuses:{ forca:4, defesa:2 } },
  { id:'espirito', name:'Espírito', rarity:'epica', bonuses:{ magia:4, percepcao:3, forca:-2 } },
  { id:'slime', name:'Slime', rarity:'rara', bonuses:{ vitalidade:3, defesa:2 } },
  { id:'dragonoide', name:'Dragonoide', rarity:'epica', bonuses:{ forca:4, defesa:3, magia:2 } },
  { id:'meio_dragao', name:'Meio-Dragão', rarity:'lendaria', bonuses:{ forca:5, magia:3, defesa:2 } },
  { id:'anjo', name:'Anjo', rarity:'lendaria', bonuses:{ magia:4, carisma:3, vitalidade:2 } },
  { id:'serafim', name:'Serafim', rarity:'mitica', bonuses:{ magia:6, carisma:4, percepcao:3 } },
  { id:'ser_divino', name:'Ser Divino', rarity:'divina', bonuses:{ magia:8, forca:4, sorte:5 } },
  { id:'desconhecida', name:'Raça Desconhecida', rarity:'mitica', bonuses:{ sorte:4 } }
];
const CLASSES = [
  { id:'guerreiro', name:'Guerreiro', rarity:'comum', focus:['forca','defesa'] },
  { id:'espadachim', name:'Espadachim', rarity:'comum', focus:['forca','agilidade'] },
  { id:'arqueiro', name:'Arqueiro', rarity:'comum', focus:['precisao','agilidade'] },
  { id:'aventureiro', name:'Aventureiro', rarity:'comum', focus:['sorte','vitalidade'] },
  { id:'ladrao', name:'Ladrão', rarity:'incomum', focus:['agilidade','sorte'] },
  { id:'cacador', name:'Caçador', rarity:'incomum', focus:['precisao','percepcao'] },
  { id:'cavaleiro', name:'Cavaleiro', rarity:'incomum', focus:['defesa','forca'] },
  { id:'monge', name:'Monge', rarity:'incomum', focus:['agilidade','vitalidade'] },
  { id:'mago', name:'Mago', rarity:'incomum', focus:['inteligencia','magia'] },
  { id:'curandeiro', name:'Curandeiro', rarity:'incomum', focus:['magia','carisma'] },
  { id:'assassino', name:'Assassino', rarity:'rara', focus:['agilidade','precisao'] },
  { id:'paladino', name:'Paladino', rarity:'rara', focus:['defesa','magia'] },
  { id:'necromante', name:'Necromante', rarity:'rara', focus:['magia','inteligencia'] },
  { id:'invocador', name:'Invocador', rarity:'rara', focus:['magia','carisma'] },
  { id:'alquimista', name:'Alquimista', rarity:'rara', focus:['inteligencia','sorte'] },
  { id:'ferreiro', name:'Ferreiro', rarity:'incomum', focus:['forca','inteligencia'] },
  { id:'mercador', name:'Mercador', rarity:'incomum', focus:['carisma','sorte'] },
  { id:'berserker', name:'Berserker', rarity:'rara', focus:['forca','vitalidade'] },
  { id:'heroi', name:'Herói', rarity:'lendaria', focus:['forca','carisma','sorte'] },
  { id:'arquimago', name:'Arquimago', rarity:'lendaria', focus:['magia','inteligencia'] },
  { id:'rei_demonio', name:'Rei Demônio', rarity:'mitica', focus:['forca','magia'] },
  { id:'santo', name:'Santo', rarity:'mitica', focus:['magia','carisma'] },
  { id:'guardiao_divino', name:'Guardião Divino', rarity:'divina', focus:['defesa','magia','vitalidade'] }
];
const AFFINITIES = [
  { id:'fogo', name:'Fogo', emoji:'🔥', rarity:'comum' },
  { id:'gelo', name:'Gelo', emoji:'❄️', rarity:'comum' },
  { id:'raio', name:'Raio', emoji:'⚡', rarity:'incomum' },
  { id:'vento', name:'Vento', emoji:'🌪️', rarity:'comum' },
  { id:'terra', name:'Terra', emoji:'🌍', rarity:'comum' },
  { id:'agua', name:'Água', emoji:'💧', rarity:'comum' },
  { id:'trevas', name:'Trevas', emoji:'🌑', rarity:'rara' },
  { id:'luz', name:'Luz', emoji:'☀️', rarity:'rara' },
  { id:'natureza', name:'Natureza', emoji:'🌿', rarity:'incomum' },
  { id:'sangue', name:'Sangue', emoji:'🩸', rarity:'epica' },
  { id:'divina', name:'Divina', emoji:'✨', rarity:'lendaria' },
  { id:'espaco', name:'Espaço', emoji:'🌀', rarity:'mitica' },
  { id:'tempo', name:'Tempo', emoji:'⏳', rarity:'mitica' }
];
const SKILLS = [
  { id:'corte', name:'Corte Poderoso', emoji:'⚔️', type:'fisico', rarity:'comum', mana:5, power:12, cd:1 },
  { id:'bola_fogo', name:'Bola de Fogo', emoji:'🔥', type:'magia', rarity:'comum', mana:10, power:15, cd:2 },
  { id:'lanca_gelo', name:'Lança de Gelo', emoji:'❄️', type:'magia', rarity:'comum', mana:10, power:14, cd:2 },
  { id:'relampago', name:'Relâmpago', emoji:'⚡', type:'magia', rarity:'incomum', mana:15, power:18, cd:3 },
  { id:'cura', name:'Cura Leve', emoji:'💚', type:'suporte', rarity:'comum', mana:12, power:10, cd:2 },
  { id:'barreira', name:'Barreira', emoji:'🛡️', type:'suporte', rarity:'rara', mana:20, power:0, cd:4 },
  { id:'visao', name:'Visão Espiritual', emoji:'👁️', type:'suporte', rarity:'rara', mana:8, power:0, cd:3 },
  { id:'passo', name:'Passo Sombrio', emoji:'🗡️', type:'fisico', rarity:'rara', mana:12, power:16, cd:3 },
  { id:'rugido', name:'Rugido Dracônico', emoji:'🐉', type:'fisico', rarity:'epica', mana:25, power:28, cd:5 },
  { id:'furia', name:'Fúria Berserker', emoji:'💢', type:'buff', rarity:'incomum', mana:0, power:8, cd:4 },
  { id:'tiro', name:'Tiro Preciso', emoji:'🏹', type:'fisico', rarity:'comum', mana:6, power:13, cd:1 },
  { id:'veneno', name:'Lâmina Venenosa', emoji:'☠️', type:'fisico', rarity:'incomum', mana:10, power:11, cd:2 },
  { id:'bencao', name:'Bênção Menor', emoji:'✨', type:'suporte', rarity:'incomum', mana:15, power:0, cd:3 },
  { id:'invocar', name:'Invocação Fraca', emoji:'👻', type:'magia', rarity:'rara', mana:30, power:20, cd:5 },
  { id:'olho_destino', name:'Olho do Destino', emoji:'🔮', type:'unica', rarity:'unica', mana:40, power:0, cd:10 },
  { id:'devorador', name:'Devorador de Habilidades', emoji:'🕳️', type:'unica', rarity:'unica', mana:50, power:5, cd:12 },
  { id:'biblioteca', name:'Biblioteca Infinita', emoji:'📚', type:'unica', rarity:'unica', mana:0, power:0, cd:0 },
  { id:'dominio', name:'Domínio Absoluto', emoji:'👑', type:'unica', rarity:'divina', mana:80, power:50, cd:15 }
];
const ORIGINS = ['Aldeão','Camponês','Órfão','Filho de comerciante','Filho de aventureiro','Nobre menor','Filho de mago','Membro de guilda','Fugitivo','Sobrevivente','Reencarnado','Escolhido','Descendente de linhagem rara','Trabalhador urbano','Estrangeiro'];
const SOCIAL = ['Miserável','Pobre','Camponês','Trabalhador','Aventureiro iniciante','Classe média','Rico','Nobre','Linhagem especial'];
const TITLES = [
  { name:'Novato', rarity:'comum' }, { name:'Aventureiro', rarity:'comum' },
  { name:'Sobrevivente', rarity:'incomum' }, { name:'Filho da Fortuna', rarity:'rara' },
  { name:'Talentoso', rarity:'incomum' }, { name:'Estranho', rarity:'incomum' },
  { name:'Escolhido', rarity:'epica' }, { name:'Herdeiro', rarity:'rara' },
  { name:'Prodígio', rarity:'lendaria' }
];
const LUCK_LABELS = [
  { min:0,max:15,label:'Péssima' },{ min:16,max:30,label:'Ruim' },{ min:31,max:50,label:'Normal' },
  { min:51,max:65,label:'Boa' },{ min:66,max:80,label:'Excelente' },{ min:81,max:90,label:'Absurda' },
  { min:91,max:97,label:'Insana' },{ min:98,max:100,label:'Divina' }
];
const POTENTIAL_LABELS = [
  { min:0,max:15,label:'Muito baixo' },{ min:16,max:30,label:'Baixo' },{ min:31,max:50,label:'Normal' },
  { min:51,max:65,label:'Bom' },{ min:66,max:80,label:'Excelente' },{ min:81,max:90,label:'Extraordinário' },
  { min:91,max:97,label:'Monstruoso' },{ min:98,max:100,label:'Divino' }
];
function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function pickWeighted(items){
  let total=0; const bag=[];
  for(let i=0;i<items.length;i++){
    const it=items[i];
    const w=RARITY_WEIGHTS[it.rarity]!=null?RARITY_WEIGHTS[it.rarity]:(it.rarity==='unica'?0.3:10);
    total+=w; bag.push({it,w});
  }
  let r=Math.random()*total;
  for(let i=0;i<bag.length;i++){ r-=bag[i].w; if(r<=0) return bag[i].it; }
  return bag[bag.length-1].it;
}
function luckLabel(v){ for(let i=0;i<LUCK_LABELS.length;i++) if(v>=LUCK_LABELS[i].min&&v<=LUCK_LABELS[i].max) return LUCK_LABELS[i].label; return 'Normal'; }
function potentialLabel(v){ for(let i=0;i<POTENTIAL_LABELS.length;i++) if(v>=POTENTIAL_LABELS[i].min&&v<=POTENTIAL_LABELS[i].max) return POTENTIAL_LABELS[i].label; return 'Normal'; }
function rollAttrs(race,klass){
  const base={ forca:randInt(8,14), defesa:randInt(8,14), agilidade:randInt(8,14), inteligencia:randInt(8,14), magia:randInt(8,14), precisao:randInt(8,14), percepcao:randInt(8,14), carisma:randInt(8,14), vitalidade:randInt(8,14), sorte:randInt(5,95) };
  const b=race.bonuses||{};
  Object.keys(b).forEach(function(k){ if(base[k]!=null) base[k]=Math.max(1,Math.min(100,base[k]+b[k])); });
  (klass.focus||[]).forEach(function(k){ if(base[k]!=null) base[k]=Math.min(100,base[k]+randInt(2,5)); });
  const hp=80+base.vitalidade*3+base.defesa;
  const mana=40+base.magia*3+base.inteligencia*2;
  return { attrs:base, hp, hpMax:hp, mana, manaMax:mana };
}
function rollSkills(luck){
  const pool=SKILLS.filter(function(s){ return s.rarity!=='unica'&&s.rarity!=='divina'; });
  const n=luck>=80?3:luck>=50?2:1;
  const out=[]; const used={};
  for(let i=0;i<n;i++){
    let s=pickWeighted(pool); let t=0;
    while(used[s.id]&&t<10){ s=pickWeighted(pool); t++; }
    used[s.id]=true; out.push(Object.assign({},s,{level:1}));
  }
  if(Math.random()<0.008+luck/5000){
    const u=SKILLS.filter(function(s){ return s.rarity==='unica'||s.rarity==='divina'; });
    if(u.length){ const x=u[randInt(0,u.length-1)]; if(!used[x.id]) out.push(Object.assign({},x,{level:1})); }
  }
  return out;
}
function generateCharacter(name){
  const race=pickWeighted(RACES); const klass=pickWeighted(CLASSES);
  const affinity=pickWeighted(AFFINITIES);
  const origin=ORIGINS[randInt(0,ORIGINS.length-1)];
  const social=SOCIAL[randInt(0,SOCIAL.length-1)];
  const title=pickWeighted(TITLES);
  const potential=randInt(5,100);
  const rolled=rollAttrs(race,klass);
  const luck=rolled.attrs.sorte;
  const skills=rollSkills(luck);
  return {
    phase:2, name:String(name).trim().slice(0,24),
    race:{ id:race.id, name:race.name, rarity:race.rarity },
    class:{ id:klass.id, name:klass.name, rarity:klass.rarity },
    affinity:{ id:affinity.id, name:affinity.name, emoji:affinity.emoji, rarity:affinity.rarity },
    origin:origin, social:social, title:title.name,
    potential:potential, potentialLabel:potentialLabel(potential),
    luck:luck, luckLabel:luckLabel(luck),
    level:1, xp:0, xpNext:100,
    hp:rolled.hp, hpMax:rolled.hpMax, mana:rolled.mana, manaMax:rolled.manaMax,
    attrs:rolled.attrs, skills:skills,
    iene:(social==='Rico'||social==='Nobre')?randInt(50,200):randInt(5,40),
    createdAt:new Date().toISOString()
  };
}
function parseData(row){
  if(!row) return null;
  try{ const d=typeof row.data==='string'?JSON.parse(row.data||'{}'):(row.data||{}); if(!d.name&&row.name) d.name=row.name; return d; }
  catch(_){ return { name:row.name, phase:1 }; }
}
function formatStatus(d){
  if(!d||!d.race) return '⚠️ Usa *iskiniciar Nome*';
  const a=d.attrs||{};
  return '╔══════════════════╗\n🌌 *ISEKAI STATUS*\n╚══════════════════╝\n\n👤 Nome: *'+d.name+'*\n🧬 Raça: '+d.race.name+' _('+d.race.rarity+')_\n⚔️ Classe: '+d.class.name+' _('+d.class.rarity+')_\n⭐ Nível: '+d.level+' | XP: '+d.xp+'/'+d.xpNext+'\n✨ Potencial: '+d.potentialLabel+' ('+d.potential+')\n🍀 Sorte: '+d.luckLabel+' ('+d.luck+'/100)\n\n❤️ HP: '+d.hp+'/'+d.hpMax+'\n💙 Mana: '+d.mana+'/'+d.manaMax+'\n\n⚔️ Força: '+a.forca+'  🛡️ Defesa: '+a.defesa+'\n🏃 Agi: '+a.agilidade+'  🧠 Int: '+a.inteligencia+'\n✨ Magia: '+a.magia+'  🎯 Prec: '+a.precisao+'\n👁️ Perc: '+a.percepcao+'  🗣️ Carisma: '+a.carisma+'\n❤️‍🩹 Vitalidade: '+a.vitalidade+'\n\n'+(d.affinity?d.affinity.emoji+' Afinidade: '+d.affinity.name+'\n':'')+'🏷️ Título: '+(d.title||'—')+'\n🪙 Ienes: '+(d.iene!=null?d.iene:0);
}
function formatPersonagem(d){
  if(!d||!d.race) return formatStatus(d);
  let sk=''; (d.skills||[]).forEach(function(s,i){ sk+=(i+1)+'. '+(s.emoji||'')+' '+s.name+' _('+s.rarity+')_\n'; });
  return formatStatus(d)+'\n──────────────\n📜 Origem: '+(d.origin||'—')+'\n🏛️ Social: '+(d.social||'—')+'\n🔮 Habilidades:\n'+(sk||'_nenhuma_');
}
function formatSkills(d){
  if(!d||!d.skills||!d.skills.length) return '🔮 Sem habilidades.';
  let t='🔮 *HABILIDADES ISEKAI*\n\n';
  d.skills.forEach(function(s,i){ t+=(i+1)+'. '+(s.emoji||'')+' *'+s.name+'*\n   Raridade: '+s.rarity+'\n   Tipo: '+(s.type||'?')+' | Nv: '+(s.level||1)+'\n   Mana: '+(s.mana!=null?s.mana:'?')+' | Poder: '+(s.power!=null?s.power:'?')+' | CD: '+(s.cd!=null?s.cd:'?')+'\n\n'; });
  return t.trim();
}
function formatAttrs(d){
  if(!d||!d.attrs) return '❌ Sem atributos.';
  const a=d.attrs;
  return '📊 *ATRIBUTOS — '+d.name+'*\n\n⚔️ Força: '+a.forca+'\n🛡️ Defesa: '+a.defesa+'\n🏃 Agilidade: '+a.agilidade+'\n🧠 Inteligência: '+a.inteligencia+'\n✨ Magia: '+a.magia+'\n🎯 Precisão: '+a.precisao+'\n👁️ Percepção: '+a.percepcao+'\n🗣️ Carisma: '+a.carisma+'\n❤️‍🩹 Vitalidade: '+a.vitalidade+'\n🍀 Sorte: '+a.sorte+' ('+(d.luckLabel||'')+')\n\n❤️ HP: '+d.hp+'/'+d.hpMax+'\n💙 Mana: '+d.mana+'/'+d.manaMax+'\n✨ Potencial: '+d.potentialLabel+' ('+d.potential+')';
}
module.exports={ generateCharacter, parseData, formatStatus, formatPersonagem, formatSkills, formatAttrs, RARITY_WEIGHTS };
