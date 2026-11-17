import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { prepareState } from '../state.js';
const TERMS = [
  { id: 'cac', term: 'CAC', expansion: 'Customer Acquisition Cost', definition: 'The cost of acquiring a customer.', category: 'Finance', custom: true },
  { id: 'mfa', term: 'MFA', expansion: 'Multi-Factor Authentication', definition: 'Verify identity using more than one factor.', category: 'Technology', custom: true },
  { id: 'api', term: 'API', expansion: 'Application Programming Interface', definition: 'Software communication.', category: 'Technology', custom: true },
  { id: 'kpi', term: 'KPI', expansion: 'Key Performance Indicator', definition: 'A performance metric.', category: 'Strategy', custom: true }
];
import { searchTerms, validateEntry, parseImport, entryKey } from '../glossary.js';
test('new installations start empty', () => {
  assert.deepEqual(prepareState(), {version: 2, terms: [], favorites: []});
});
test('upgrade removes bundled terms and favorites while keeping personal terms', () => {
  const saved = {terms: [{...TERMS[0], id: 'seed-finance-0', custom: false}, TERMS[1]], favorites: ['seed-finance-0', TERMS[1].id]};
  assert.deepEqual(prepareState(saved), {version: 2, terms: [TERMS[1]], favorites: [TERMS[1].id]});
  assert.deepEqual(prepareState(prepareState(saved)), prepareState(saved));
});
test('search covers acronyms, expansions, definitions, multiple words and exact ranking', () => {
  assert.ok(searchTerms(TERMS,'customer acquisition').some(e => e.term === 'CAC'));
  assert.ok(searchTerms(TERMS,'identity factor').some(e => e.term === 'MFA'));
  assert.equal(searchTerms(TERMS,'api')[0].term, 'API');
  assert.deepEqual(searchTerms(TERMS,'zzzz-no-match'), []);
  assert.ok(searchTerms(TERMS,'  kPi ').some(e => e.term === 'KPI'));
});
test('view and category filters compose', () => {
  const custom = {...TERMS[0], id:'custom', custom:true};
  const terms = [custom];
  assert.deepEqual(searchTerms(terms,'','all','custom'), [custom]);
  assert.deepEqual(searchTerms(terms,'','all','favorites',[custom.id]), [custom]);
  assert.equal(searchTerms(terms,'','Technology','favorites',[custom.id]).length, 0);
});
test('backup import round-trips and accepts simple arrays', () => {
  assert.equal(parseImport(JSON.stringify({terms:TERMS})).length, TERMS.length);
  assert.deepEqual(parseImport(JSON.stringify([TERMS[0]])), [validateEntry(TERMS[0])]);
  assert.equal(entryKey({...TERMS[0],term:' cac '}),entryKey(TERMS[0]));
});
test('empty backups round-trip', () => {
  assert.deepEqual(parseImport(JSON.stringify({terms: []})), []);
});
test('invalid imports are rejected before any mutation', () => {
  for (const value of ['broken','{}','null','[null]',JSON.stringify([{...TERMS[0],definition:3}]), JSON.stringify([{...TERMS[0],term:' '}])]) assert.throws(() => parseImport(value));
  assert.throws(() => validateEntry({...TERMS[0],term:'a'.repeat(81)}));
});
test('manifest references files that exist and requests only local storage', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../manifest.json',import.meta.url)));
  assert.equal(manifest.manifest_version,3);
  assert.deepEqual(manifest.permissions,['storage']);
  for (const file of [manifest.action.default_popup,...Object.values(manifest.icons)]) assert.ok(fs.existsSync(new URL(`../${file}`,import.meta.url)));
});
