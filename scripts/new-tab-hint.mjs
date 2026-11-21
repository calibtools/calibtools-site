/**
 * Hidden text read after a link that opens a file in a new tab: newTabHint('PDF') → " (PDF, opens in a new tab)".
 * No imports, so browser islands can use it; pages and the Markdown pipeline go through fileLinkHint
 * in file-links.mjs, which adds the file size.
 */
export function newTabHint(kind = '', size = '') {
  return ` (${[kind, size, 'opens in a new tab'].filter(Boolean).join(', ')})`;
}
