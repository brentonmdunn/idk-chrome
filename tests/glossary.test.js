import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SEED_TERMS } from '../seed.js';
import { searchTerms, validateEntry, parseImport, entryKey } from '../glossary.js';
test('starter glossary has unique IDs and valid content', () => {
  assert.ok(SEED_TERMS.length >= 180);
  assert.equal(new Set(SEED_TERMS.map(e => e.id)).size, SEED_TERMS.length);
  for (const term of SEED_TERMS) assert.doesNotThrow(() => validateEntry(term));
});
test('search covers acronyms, expansions, definitions, multiple words and exact ranking', () => {
  assert.ok(searchTerms(SEED_TERMS,'customer acquisition').some(e => e.term === 'CAC'));
  assert.ok(searchTerms(SEED_TERMS,'identity factor').some(e => e.term === 'MFA'));
  assert.equal(searchTerms(SEED_TERMS,'api')[0].term, 'API');
  assert.deepEqual(searchTerms(SEED_TERMS,'zzzz-no-match'), []);
  assert.ok(searchTerms(SEED_TERMS,'  kPi ').some(e => e.term === 'KPI'));
});
test('view and category filters compose', () => {
  const custom = {...SEED_TERMS[0], id:'custom', custom:true};
  const terms = [...SEED_TERMS, custom];
  assert.deepEqual(searchTerms(terms,'','all','custom'), [custom]);
  assert.deepEqual(searchTerms(terms,'','all','favorites',[custom.id]), [custom]);
  assert.equal(searchTerms(terms,'','Technology','favorites',[custom.id]).length, 0);
});
test('backup import round-trips and accepts simple arrays', () => {
  assert.equal(parseImport(JSON.stringify({terms:SEED_TERMS})).length, SEED_TERMS.length);
  assert.deepEqual(parseImport(JSON.stringify([SEED_TERMS[0]])), [validateEntry(SEED_TERMS[0])]);
  assert.equal(entryKey({...SEED_TERMS[0],term:' asap '}),entryKey(SEED_TERMS[0]));
});
test('invalid imports are rejected before any mutation', () => {
  for (const value of ['broken','{}','[]','null','[null]',JSON.stringify([{...SEED_TERMS[0],definition:3}]), JSON.stringify([{...SEED_TERMS[0],term:' '}])]) assert.throws(() => parseImport(value));
  assert.throws(() => validateEntry({...SEED_TERMS[0],term:'a'.repeat(81)}));
});
test('manifest references files that exist and requests only local storage', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../manifest.json',import.meta.url)));
  assert.equal(manifest.manifest_version,3);
  assert.deepEqual(manifest.permissions,['storage']);
  for (const file of [manifest.action.default_popup,...Object.values(manifest.icons)]) assert.ok(fs.existsSync(new URL(`../${file}`,import.meta.url)));
});
