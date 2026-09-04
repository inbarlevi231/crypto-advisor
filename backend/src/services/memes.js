const path = require('path');
const fs = require('fs');

const memesPath = path.join(__dirname, '../../data/memes.json');
const factsPath = path.join(__dirname, '../../data/fun-facts.json');
const memes = JSON.parse(fs.readFileSync(memesPath, 'utf8'));
const funFacts = JSON.parse(fs.readFileSync(factsPath, 'utf8'));

function pickMeme(seed = Date.now()) {
  const index = Math.abs(Number(seed)) % memes.length;
  const meme = memes[index];
  return {
    ...meme,
    provider: 'static',
  };
}

function pickFunFact(seed = Date.now()) {
  const index = Math.abs(Number(seed) + 17) % funFacts.length;
  return funFacts[index];
}

module.exports = { pickMeme, pickFunFact };
