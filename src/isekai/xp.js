function xpForLevel(level) {
  level = Math.max(1, Number(level) || 1);
  return Math.floor(80 + level * 40 + Math.pow(level, 1.35) * 8);
}

function grantXp(playerData, amount) {
  if (!playerData) return { xp: 0, leveled: false, levels: 0 };
  amount = Math.floor(Number(amount) || 0);
  if (amount <= 0) return { xp: 0, leveled: false, levels: 0, level: playerData.level || 1 };
  if (playerData.level == null) playerData.level = 1;
  if (playerData.xp == null) playerData.xp = 0;
  if (playerData.xpNext == null) playerData.xpNext = xpForLevel(playerData.level);
  const pot = playerData.potential || 50;
  const mult = 1 + Math.min(0.2, Math.max(0, (pot - 50) / 250));
  amount = Math.floor(amount * mult);
  playerData.xp = (playerData.xp || 0) + amount;
  let levels = 0;
  while (playerData.xp >= (playerData.xpNext || xpForLevel(playerData.level)) && playerData.level < 100) {
    playerData.xp -= playerData.xpNext || xpForLevel(playerData.level);
    playerData.level = (playerData.level || 1) + 1;
    playerData.xpNext = xpForLevel(playerData.level);
    playerData.hpMax = (playerData.hpMax || 100) + 6;
    playerData.manaMax = (playerData.manaMax || 50) + 4;
    playerData.hp = playerData.hpMax;
    playerData.mana = playerData.manaMax;
    levels += 1;
  }
  return { xp: amount, leveled: levels > 0, levels: levels, level: playerData.level, xpNow: playerData.xp, xpNext: playerData.xpNext };
}

module.exports = { xpForLevel, grantXp };
