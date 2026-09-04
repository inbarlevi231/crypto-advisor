const path = require('path');
const fs = require('fs');

const socialPath = path.join(__dirname, '../../data/social-buzz.json');
const socialItems = JSON.parse(fs.readFileSync(socialPath, 'utf8'));

function pickSocialBuzz(assets = []) {
  const selected = assets.map((a) => a.toLowerCase());
  const matches = socialItems.filter(
    (item) =>
      !item.assets?.length ||
      item.assets.some((a) => selected.includes(String(a).toLowerCase()))
  );
  const pool = matches.length ? matches : socialItems;
  const index = Math.abs(Date.now()) % pool.length;
  const item = pool[index];
  return {
    id: item.id,
    text: item.text,
    provider: 'static',
  };
}

module.exports = { pickSocialBuzz };
