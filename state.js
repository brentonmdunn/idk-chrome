export function prepareState(saved) {
  if (!saved) return { version: 2, terms: [], favorites: [] };
  if (!Array.isArray(saved.terms) || !Array.isArray(saved.favorites)) throw new Error('Stored glossary could not be read.');
  // Remove the original bundled entries on upgrade; keep user-created/imported terms.
  const terms = saved.version === 2 ? saved.terms : saved.terms.filter(entry => !(typeof entry.id === 'string' && entry.id.startsWith('seed-') && !entry.custom));
  const ids = new Set(terms.map(entry => entry.id));
  return { version: 2, terms, favorites: saved.favorites.filter(id => ids.has(id)) };
}
