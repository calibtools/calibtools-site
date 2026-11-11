/**
 * Opens the <details> a link points at: the element itself if it is one, and
 * every closed <details> around it. Without this, a link to a folded section
 * (or to something inside one) scrolls to a closed bar and shows nothing.
 */
export interface DisclosureNode {
  tagName: string;
  open?: boolean;
  parentElement: DisclosureNode | null;
}

/** Returns how many <details> were opened. */
export function openDisclosuresFor(target: DisclosureNode | null): number {
  let opened = 0;
  for (let el = target; el; el = el.parentElement) {
    if (el.tagName === 'DETAILS' && !el.open) {
      el.open = true;
      opened += 1;
    }
  }
  return opened;
}

/** The element id in a URL hash, or null when there is none or it is malformed. */
export function idFromHash(hash: string): string | null {
  if (!hash || hash === '#') return null;
  try {
    return decodeURIComponent(hash.replace(/^#/, '')) || null;
  } catch {
    return null;
  }
}
