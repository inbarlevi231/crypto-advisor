const path = require('path');
const fs = require('fs');

const socialPath = path.join(__dirname, '../../data/social-buzz.json');
const socialItems = JSON.parse(fs.readFileSync(socialPath, 'utf8'));

function matchesAssets(item, selectedAssets) {
  if (!item.assets?.length) return true;
  if (!selectedAssets.length) return true;
  return item.assets.some((a) => selectedAssets.includes(String(a).toLowerCase()));
}

function matchesInvestorType(item, investorType) {
  if (!item.investorTypes?.length) return true;
  if (!investorType) return true;
  return item.investorTypes.some(
    (t) => String(t).toLowerCase() === String(investorType).toLowerCase()
  );
}

function pickSocialBuzz(assets = [], investorType = '') {
  const selected = assets.map((a) => a.toLowerCase());
  const type = String(investorType || '').trim();

  const both = socialItems.filter(
    (item) => matchesAssets(item, selected) && matchesInvestorType(item, type)
  );
  const byType = socialItems.filter((item) => matchesInvestorType(item, type));
  const byAssets = socialItems.filter((item) => matchesAssets(item, selected));

  const pool = both.length ? both : byType.length ? byType : byAssets.length ? byAssets : socialItems;
  const index = Math.abs(Date.now()) % pool.length;
  const item = pool[index];
  return {
    id: item.id,
    text: item.text,
    provider: 'static',
  };
}

module.exports = { pickSocialBuzz };
