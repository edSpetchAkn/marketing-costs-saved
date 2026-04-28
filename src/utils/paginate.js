/**
 * paginate.js
 *
 * Pagination helper and PIM origin resolver.
 *
 * getPimOrigin() handles sandboxed Akeneo extension iframes where
 * window.location.origin returns the string "null" (not null).
 * Falls back to ancestorOrigins (Chrome/Edge) then document.referrer (Firefox).
 */

export function getPimOrigin() {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  if (origin && origin !== 'null') return origin;
  // ancestorOrigins: Chrome/Edge — contains parent origin even in sandboxed iframes
  const ao = window.location.ancestorOrigins;
  if (ao && ao.length > 0 && ao[0] && ao[0] !== 'null') return ao[0];
  // Firefox fallback — parse origin from the parent page referrer
  if (document.referrer) {
    try {
      return new URL(document.referrer).origin;
    } catch (_) {
      // ignore malformed referrer
    }
  }
  return '';
}

export async function fetchAllPages(lister, limit, maxPages, debugLabel, debugMode) {
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    let response;
    try {
      response = await lister({ page, limit });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to fetch ${debugLabel} (page ${page}): ${msg}`);
    }
    const items = response.items ?? [];
    all.push(...items);
    if (debugMode) {
      console.debug(`[PAGINATE] ${debugLabel} page ${page}/${maxPages} — ${items.length} items, total: ${all.length}`);
    }
    if (items.length === 0 || !response.links?.next) break;
  }
  return all;
}
