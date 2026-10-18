'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
for (const name of ['session-log', 'localized-text', 'mod-support', 'presets', 'game-roster', 'data', 'help-languages']) require('../js/' + name + '.js');
const R = globalThis.RB2;
const textBytes = (s, zeros = 1) => {
  const b = Buffer.alloc(2 + s.length * 2 + zeros * 2); b.writeUInt16LE(0xfeff);
  for (let i = 0; i < s.length; i++) b.writeUInt16LE(s.charCodeAt(i), 2 + i * 2);
  return b;
};
test('session log retains newest events in order, identifies omissions and returns detached reports', () => {
  const log = new R.SessionLog(2);
  log.record('one'); log.record('two', { value: 2 }); log.record('three', {}, 'error');
  const report = log.report({ kind: 'test' });
  assert.equal(report.droppedEvents, 1); assert.deepEqual(report.events.map(e => e.sequence), [2, 3]);
  assert.equal(report.events[1].level, 'error'); report.events[0].details.value = 99;
  assert.equal(log.report().events[0].details.value, 2);
});
test('diagnostics bound metadata and omit binary contents, full URL paths and cycles without throwing', () => {
  const log = new R.SessionLog(), obj = { binary: Uint8Array.of(12, 34), long: 'a'.repeat(4000) };
  obj.self = obj;
  log.record('error', { error: new Error('file:///C:/Users/Private/editor/app.js:3:1'), obj }, 'error');
  log.record('hostile', { get value() { throw Error('getter'); } });
  const serialized = JSON.stringify(log.report());
  assert.ok(!serialized.includes('Users/Private')); assert.ok(serialized.includes('app.js:3:1'));
  const details = log.report().events[0].details;
  assert.deepEqual(details.obj.binary, { omittedBinaryBytes: 2 });
  assert.equal(details.obj.long.length, 2000); assert.equal(details.obj.self, '[omitted]');
});
test('localized text roundtrips Unicode, tags, line breaks, BOM and multiple terminators exactly', () => {
  const original = textBytes('\ufeff日本語 è <PAD=＄Ｒ１>\r\n😀', 3), d = new R.LocalizedTextDocument(original);
  assert.deepEqual(Buffer.from(d.encode()), original);
  d.setText('Changed\n<PAD=＄×>');
  assert.deepEqual(Buffer.from(d.encode()), textBytes('Changed\n<PAD=＄×>', 3));
  assert.throws(() => d.setText('bad\0text')); assert.throws(() => d.setText('\ud800'));
  assert.throws(() => new R.LocalizedTextDocument(Uint8Array.of(0, 1, 0, 0)));
  assert.throws(() => new R.LocalizedTextDocument(textBytes('x').subarray(0, 4)));
  assert.throws(() => new R.LocalizedTextDocument(Uint8Array.of(255, 254, 0)));
});
test('all six tutorial catalogs cover IDs 0..84 and language filenames remain distinct', () => {
  assert.deepEqual(Object.keys(R.HELP_LANGUAGES).sort(), ['DE', 'FR', 'IT', 'JP', 'SP', 'US']);
  for (const [language, rows] of Object.entries(R.HELP_LANGUAGES)) {
    assert.deepEqual(rows.map(r => r.id).sort((a, b) => a - b), Array.from({ length: 85 }, (_, i) => i));
    assert.deepEqual(R.LocalizedText.identify('TUTO_000_' + language + '.txt'), { id: 0, language });
  }
  assert.equal(R.LocalizedText.identify('CharacterName_000_US.txt'), null);
  assert.notEqual(R.HELP_LANGUAGES.IT[0].text, R.HELP_LANGUAGES.US[0].text);
});
const main = () => {
  const b = Buffer.alloc(160); for (let i = 0; i < 2; i++) { b.writeUInt32BE(i, i * 80); b.writeUInt32BE(9, i * 80 + 4); b.writeUInt32BE(i ? 10 : 0xffffffff, i * 80 + 8); } return b;
};
test('roster reader binds native IDs to supplied name/form texts, marks missing labels and rejects ambiguous input', () => {
  const texts = [{ name: 'CharacterName_009_US.txt', bytes: textBytes('Mod fighter') }, { name: 'CharacterName_010_US.txt', bytes: textBytes('New form') }];
  const result = R.GameRoster.profile({ main: main(), texts });
  assert.deepEqual(result.profile.characters.map(c => c.name), ['Mod fighter', 'Mod fighter / New form']);
  assert.deepEqual(result.missingNames, []); assert.equal(result.moveDefaults, 0);
  assert.ok(!result.profile.characters[0].useOriginalPortrait);
  assert.deepEqual(R.GameRoster.profile({ main: main(), texts: texts.slice(0, 1) }).missingNames, [1]);
  assert.throws(() => R.GameRoster.profile({ main: main(), texts: [...texts, texts[0]] }), /Duplicate/);
  assert.throws(() => R.GameRoster.profile({ main: main(), texts: [texts[0], { ...texts[1], name: 'CharacterName_010_IT.txt' }] }), /one language/);
  assert.throws(() => R.GameRoster.nativeNames(main().subarray(0, 159)), /80-byte/);
  const bad = main(); bad.writeUInt32BE(10, 80); assert.throws(() => R.GameRoster.nativeNames(bad), /numbering/);
});
test('loose roster selection shares the AFS parsing contract and rejects duplicate or unrelated files', () => {
  const files = [{ name: 'CS_MAIN.DAT', bytes: main() }, { name: 'CharacterName_009_US.txt', bytes: textBytes('Mod fighter') }, { name: 'CharacterName_010_US.txt', bytes: textBytes('New form') }];
  const before = files.map(f => Buffer.from(f.bytes));
  const result = R.GameRoster.fromFiles(files);
  assert.deepEqual(result.profile.characters.map(c => c.name), ['Mod fighter', 'Mod fighter / New form']);
  assert.throws(() => R.GameRoster.fromFiles(files.slice(1)), /exactly one cs_main/);
  assert.throws(() => R.GameRoster.fromFiles([...files, { ...files[0], name: 'cs_main.dat' }]), /only one copy/);
  assert.throws(() => R.GameRoster.fromFiles([...files, files[1]]), /only one copy/);
  assert.throws(() => R.GameRoster.fromFiles([...files, { name: 'unknown.dat', bytes: main() }]), /Unrecognized/);
  assert.throws(() => R.GameRoster.fromFiles([files[0], files[1], { ...files[2], name: 'CharacterName_010_IT.txt' }]), /one language/);
  files.forEach((f, i) => assert.deepEqual(Buffer.from(f.bytes), before[i]));
});
const localized = process.env.RB2_LOCALIZATION_FIXTURES;
test('all 510 original localized texts roundtrip and match bundled translations', { skip: !localized && 'Set RB2_LOCALIZATION_FIXTURES' }, () => {
  const names = fs.readdirSync(localized).filter(n => /^TUTO_.*\.txt$/.test(n)); assert.equal(names.length, 510);
  for (const name of names) {
    const original = fs.readFileSync(path.join(localized, name)), d = new R.LocalizedTextDocument(original), key = R.LocalizedText.identify(name);
    assert.deepEqual(Buffer.from(d.encode()), original, name);
    assert.equal(d.text, R.HELP_LANGUAGES[key.language].find(r => r.id === key.id).text, name);
  }
});
const roster = process.env.RB2_ROSTER_FIXTURES;
test('original cs_main and 137 localized name members reproduce all 100 independently catalogued native names', { skip: !roster && 'Set RB2_ROSTER_FIXTURES' }, () => {
  const read = n => fs.readFileSync(path.join(roster, n));
  const texts = fs.readdirSync(roster).filter(n => /^CharacterName_/.test(n)).map(name => ({ name, bytes: read(name) }));
  assert.equal(texts.length, 137);
  const result = R.GameRoster.profile({ main: read('cs_main.dat'), texts, groups: read('cs_form.dat'), appearance: read('preset_appearance_table.dat') });
  assert.equal(result.profile.characters.length, 100); assert.equal(result.missingNames.length, 0);
  assert.equal(result.moveDefaults, 100); assert.equal(result.profile.enhancedCharacters.length, 66);
  assert.deepEqual(result.profile.characters.map(c => c.name), R.DATA.characters.map(c => c.name.trim()));
});
