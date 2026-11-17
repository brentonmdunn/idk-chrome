import { prepareState } from './state.js';
import { searchTerms, validateEntry, parseImport, entryKey } from './glossary.js';
const $ = id => document.getElementById(id);
const KEY = 'idk-glossary-v1';
let state = prepareState();
let view = 'all', editingId = null, toastTimer, busy = false, ready = false;
const isExtension = !!globalThis.chrome?.storage?.local;
if (new URLSearchParams(location.search).has('tab') || !isExtension) document.body.classList.add('full-page');
async function readState() {
  return isExtension ? (await chrome.storage.local.get(KEY))[KEY] : JSON.parse(localStorage.getItem(KEY) || 'null');
}
async function writeState(next) {
  if (isExtension) await chrome.storage.local.set({ [KEY]: next });
  else localStorage.setItem(KEY, JSON.stringify(next));
}
function toast(message) {
  $('toast').textContent = message; $('toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3500);
}
async function mutate(change) {
  if (busy || !ready) return false;
  busy = true;
  try {
    const latest = await readState();
    const next = structuredClone(prepareState(latest || state));
    change(next);
    await writeState(next);
    state = next; render(); return true;
  } catch (error) { toast(`Could not save: ${error.message}`); return false; }
  finally { busy = false; }
}
function element(tag, className, text) {
  const node = document.createElement(tag); if (className) node.className = className;
  if (text !== undefined) node.textContent = text; return node;
}
function render() {
  const categories = [...new Set(state.terms.map(entry => entry.category).filter(Boolean))].sort();
  const previous = $('category').value;
  $('category').replaceChildren(new Option('All categories', 'all'), ...categories.map(category => new Option(category, category)));
  $('category').value = categories.includes(previous) ? previous : 'all';
  $('categories').replaceChildren(...categories.map(category => new Option(category)));
  $('all-count').textContent = state.terms.length;
  $('favorite-count').textContent = state.terms.filter(entry => state.favorites.includes(entry.id)).length;
  $('custom-count').textContent = state.terms.filter(entry => entry.custom).length;
  const matches = searchTerms(state.terms, $('search').value, $('category').value, view, state.favorites);
  $('result-count').textContent = `${matches.length} ${matches.length === 1 ? 'term' : 'terms'}`;
  const fragment = document.createDocumentFragment();
  for (const entry of matches) {
    const card = element('article', 'term-card');
    card.append(element('div', 'term-initial', entry.term[0].toUpperCase()));
    const content = element('div', 'term-content');
    const heading = element('div', 'term-heading');
    heading.append(element('h2', '', entry.term));
    if (entry.category) heading.append(element('span', 'category-badge', entry.category));
    content.append(heading);
    if (entry.expansion) content.append(element('h3', '', entry.expansion));
    if (entry.definition) content.append(element('p', '', entry.definition));
    const actions = element('div', 'card-actions');
    const saved = state.favorites.includes(entry.id);
    const star = element('button', `star${saved ? ' saved' : ''}`, saved ? '★' : '☆');
    star.setAttribute('aria-label', `${saved ? 'Unfavorite' : 'Favorite'} ${entry.term}`);
    star.setAttribute('aria-pressed', String(saved));
    star.addEventListener('click', () => mutate(next => { next.favorites = next.favorites.includes(entry.id) ? next.favorites.filter(id => id !== entry.id) : [...next.favorites, entry.id]; }));
    const edit = element('button', 'edit', 'Edit');
    edit.setAttribute('aria-label', `Edit ${entry.term}`); edit.addEventListener('click', () => openEditor(entry));
    actions.append(star, edit); card.append(content, actions); fragment.append(card);
  }
  if (!matches.length) {
    const empty = element('div', 'empty');
    empty.append(element('h2', '', $('search').value ? 'No terms found.' : view === 'favorites' ? 'No favorites yet.' : 'No terms yet.'), element('p', '', view === 'favorites' && !$('search').value ? 'Select the star on any term to save it here.' : 'Try a different search or add a term of your own.'));
    fragment.append(empty);
  }
  $('results').replaceChildren(fragment);
}
function openEditor(entry = null) {
  editingId = entry?.id || null;
  $('term-form').reset(); $('form-error').textContent = '';
  $('editor-title').textContent = entry ? 'Edit term' : 'Add a term';
  $('delete').hidden = !entry;
  for (const field of ['term','expansion','definition','category']) $(field === 'category' ? 'term-category' : field).value = entry?.[field] || '';
  $('editor').showModal(); $('term').focus();
}
async function confirmAction(title, message) {
  $('confirm-title').textContent = title; $('confirm-message').textContent = message;
  $('confirm-dialog').returnValue = 'cancel'; $('confirm-dialog').showModal();
  return new Promise(resolve => $('confirm-dialog').addEventListener('close', () => resolve($('confirm-dialog').returnValue === 'confirm'), {once:true}));
}
$('search').addEventListener('input', () => { render(); $('results').scrollTop = 0; });
$('category').addEventListener('change', () => { render(); $('results').scrollTop = 0; });
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  view = button.dataset.view;
  document.querySelectorAll('[data-view]').forEach(tab => { tab.classList.toggle('active', tab === button); tab.setAttribute('aria-pressed', String(tab === button)); });
  render(); $('results').scrollTop = 0;
}));
$('add').addEventListener('click', () => openEditor());
$('close-editor').addEventListener('click', () => $('editor').close());
$('editor').addEventListener('click', event => {
  if (event.target !== $('editor')) return;
  const bounds = $('editor').getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) $('editor').close();
});
$('term-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const entry = validateEntry(Object.fromEntries(['term','expansion','definition','category'].map(field => [field, $(field === 'category' ? 'term-category' : field).value])));
    const saved = await mutate(next => {
      if (next.terms.some(other => other.id !== editingId && entryKey(other) === entryKey(entry))) throw new Error('That term and expanded term already exist. Edit the existing entry instead.');
      if (editingId) {
        const index = next.terms.findIndex(other => other.id === editingId);
        if (index < 0) throw new Error('This entry was removed in another window.');
        next.terms[index] = { ...next.terms[index], ...entry };
      } else next.terms.push({ ...entry, id: crypto.randomUUID(), custom: true });
    });
    if (saved) { $('editor').close(); toast(editingId ? 'Term updated.' : 'Term added.'); }
  } catch (error) { $('form-error').textContent = error.message; }
});
$('delete').addEventListener('click', async () => {
  if (!await confirmAction('Delete this term?', 'This removes the term and its favorite from your local glossary. Export first if you need a backup.')) return;
  if (await mutate(next => { next.terms = next.terms.filter(entry => entry.id !== editingId); next.favorites = next.favorites.filter(id => id !== editingId); })) { $('editor').close(); toast('Term deleted.'); }
});
$('expand').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('index.html?tab=1') }));
$('export').addEventListener('click', () => {
  if (!ready) return;
  const blob = new Blob([JSON.stringify({ format: 'idk-glossary', version: 1, terms: state.terms, favorites: state.favorites }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const link = element('a'); link.href = url; link.download = `idk-glossary-${new Date().toISOString().slice(0,10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); toast('Glossary exported.');
});
$('import').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async event => {
  const file = event.target.files[0]; event.target.value = ''; if (!file) return;
  try {
    if (file.size > 8 * 1024 * 1024) throw new Error('Please use a JSON file smaller than 8 MB.');
    const text = await file.text(); const rows = parseImport(text);
    const raw = JSON.parse(text);
    if (!await confirmAction('Import glossary?', `Merge ${rows.length} terms into your glossary? Existing terms with the same term and expanded term will be kept. New terms appear in My terms.`)) return;
    let added = 0;
    if (await mutate(next => {
      const keys = new Map(next.terms.map(entry => [entryKey(entry), entry]));
      rows.forEach((entry, index) => {
        const key = entryKey(entry); let target = keys.get(key);
        if (!target) { target = { ...entry, id: crypto.randomUUID(), custom: true }; next.terms.push(target); keys.set(key, target); added++; }
        const original = raw.terms?.[index];
        if (original && Array.isArray(raw.favorites) && raw.favorites.includes(original.id) && !next.favorites.includes(target.id)) next.favorites.push(target.id);
      });
    })) toast(`Imported ${added} new ${added === 1 ? 'term' : 'terms'}.`);
  } catch (error) { toast(`Import failed: ${error.message}`); }
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName) && !$('editor').open && !$('confirm-dialog').open) { event.preventDefault(); $('search').focus(); }
  if (event.key === 'Escape' && !$('editor').open && !$('confirm-dialog').open && $('search').value) { event.preventDefault(); $('search').value = ''; render(); }
});
if (isExtension) chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[KEY]?.newValue) { state = prepareState(changes[KEY].newValue); render(); }
});
async function init() {
  $('add').disabled = true;
  try {
    const saved = await readState();
    state = prepareState(saved);
    state.terms.forEach(validateEntry);
    if (!saved || saved.version !== state.version) await writeState(state);
    ready = true; $('add').disabled = false; render(); $('search').focus();
  } catch (error) { $('results').textContent = `Could not open glossary: ${error.message} Try reopening the extension.`; }
}
init();
