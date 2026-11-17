export function normalize(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
export function searchTerms(terms, query = '', category = 'all', view = 'all', favorites = []) {
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
  const exact = normalize(query.trim());
  return terms.filter(entry => (category === 'all' || entry.category === category)
    && (view !== 'custom' || entry.custom)
    && (view !== 'favorites' || favorites.includes(entry.id))
    && words.every(word => normalize([entry.term, entry.expansion, entry.definition, entry.category].join(' ')).includes(word)))
    .sort((a, b) => Number(normalize(b.term) === exact) - Number(normalize(a.term) === exact) || a.term.localeCompare(b.term, undefined, { numeric: true, sensitivity: 'base' }) || a.expansion.localeCompare(b.expansion));
}
export function validateEntry(entry) {
  for (const [field, max] of Object.entries({term:80, expansion:160, definition:2000, category:50})) {
    if (typeof entry?.[field] !== 'string' || !entry[field].trim() || entry[field].length > max) throw new Error(`Each term needs a ${field} (up to ${max} characters).`);
  }
  return Object.fromEntries(['term', 'expansion', 'definition', 'category'].map(field => [field, entry[field].trim()]));
}
export function parseImport(text) {
  const data = JSON.parse(text);
  const rows = Array.isArray(data) ? data : data?.terms;
  if (!Array.isArray(rows) || !rows.length || rows.length > 10000) throw new Error('Choose a JSON glossary containing 1–10,000 terms.');
  return rows.map(validateEntry);
}
export function entryKey(entry) { return normalize(entry.term.trim()) + '\u0000' + normalize(entry.expansion.trim()); }
