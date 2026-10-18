'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
for (const name of ['data', 'music']) require('../js/' + name + '.js');
const R = globalThis.RB2;
const context = (mode = 'main', name = 'galaxy.mmd') => ({ mode, file: { name }, app: { data: R.DATA } });
test('native music labels keep selectors, text IDs and stream indices separate', () => {
  assert.equal(R.DATA.music.length, 57);
  assert.equal(R.DATA.music.find(r => r.id === 30).name, 'Battle of Omega (Solo Guitar)');
  assert.equal(R.DATA.music.find(r => r.id === 31).name, 'Battle of Omega (Full)');
  assert.equal(R.DATA.music.find(r => r.id === 30).textId, 58);
  assert.equal(R.DATA.music.find(r => r.id === 31).textId, 59);
  assert.equal(R.DATA.music.find(r => r.id === 56).textId, 54);
  for (let id = 32; id < 56; id++) assert.equal(R.DATA.music.find(r => r.id === id).textId, id - 2);
});
test('56 has different Galaxy and Tutorial meanings without mutating reference data', () => {
  const before = JSON.stringify(R.DATA.music), galaxy = context(), tutorial = context('main', 'tutorial.mmd');
  assert.match(R.Music.label(galaxy, 56), /Default.*The Great Expectation/);
  assert.match(R.Music.help(galaxy, 56), /converts 56 to selector 6/);
  assert.equal(R.Music.label(tutorial, 56), 'Select Randomly (Tutorial)');
  assert.match(R.Music.help(tutorial, 56), /0–55/);
  assert.equal(R.Music.label(galaxy, 31), 'Battle of Omega (Full)');
  assert.equal(JSON.stringify(R.DATA.music), before);
});
test('Battle Zone preview reports automatic selection even if the unused raw word is changed', () => {
  const zone = context('zone', 'zone_green_square.mmd');
  for (const raw of [0, 20, 30, 31, 56, 65535]) {
    assert.equal(R.Music.label(zone, raw), 'Automatic (Battle Zone)');
    assert.ok(R.Music.help(zone, raw).includes('(' + raw + ')'));
    assert.match(R.Music.help(zone, raw), /not read to select/);
  }
});
test('explicit mod music labels override stock dropdown assumptions', () => {
  const c = context();
  c.app.modEnabled = true; c.app.modProfile = { music: [{ id: 56, name: 'Mod track' }] };
  c.app.data = { music: [{ id: 56, name: 'Mod track' }] };
  assert.equal(R.Music.label(c, 56), 'Mod track');
  assert.match(R.Music.help(c, 56), /Mod-supplied/);
  assert.equal(R.Music.label(c, 65535), 'Music 65535');
});
