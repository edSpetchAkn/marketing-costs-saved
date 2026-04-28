/**
 * fetchAssetFamilyList.js
 *
 * Primary path: PIM.api.asset_family_v1.list() (SDK method).
 * Fallback path: direct fetch to /api/rest/v1/asset-families with credentials:include,
 * used when the SDK method returns 0 families but the REST endpoint has data.
 *
 * extractItems handles three response shapes:
 *   1. Plain array (some SDK versions)
 *   2. SDK-normalised: { items: [] }
 *   3. Raw REST: { _embedded: { items: [] } }
 *
 * Each family is mapped to { code, hasTransformations, hasProductLinkRules }
 * for use by the assetFamilyTransformations metric.
 */

import { CONFIG } from '../config.js';
import { getPimOrigin } from '../utils/paginate.js';

function extractItems(response) {
  if (Array.isArray(response)) return response;
  if (!response || typeof response !== 'object') return [];
  if (Array.isArray(response.items)) return response.items;
  const embedded = response._embedded;
  if (embedded && typeof embedded === 'object' && Array.isArray(embedded.items)) return embedded.items;
  return [];
}

function hasNextPage(response) {
  if (Array.isArray(response)) return false;
  if (!response || typeof response !== 'object') return false;
  const links = response.links ?? response._links;
  return !!(links?.next);
}

function mapFamilies(families) {
  return families.map((family) => ({
    code: family.code,
    hasTransformations: (family.transformations ?? []).length > 0,
    hasProductLinkRules: (family.product_link_rules ?? []).length > 0,
  }));
}

async function fetchViaSdk(fetchDebug) {
  const api = globalThis.PIM.api.asset_family_v1;
  if (!api) {
    fetchDebug.push('SDK: asset_family_v1 not available');
    return [];
  }
  const all = [];
  for (let page = 1; page <= CONFIG.api.maxAssetFamilyPages; page++) {
    let response;
    try {
      response = await api.list({ page, limit: 100 });
    } catch (err) {
      fetchDebug.push(`SDK: list() threw on page ${page}: ${err.message}`);
      break;
    }
    if (page === 1) {
      const shape = Array.isArray(response)
        ? `plain array, length=${response.length}`
        : response && typeof response === 'object'
          ? `object, keys=[${Object.keys(response).join(', ')}]`
          : String(response);
      fetchDebug.push(`SDK: page 1 response shape: ${shape}`);
    }
    const items = extractItems(response);
    all.push(...items);
    fetchDebug.push(`SDK: page ${page} → ${items.length} items`);
    if (items.length === 0 || !hasNextPage(response)) break;
  }
  return all;
}

async function fetchViaRest(fetchDebug) {
  fetchDebug.push('REST: SDK returned 0 — trying direct fetch fallback');
  const all = [];
  const origin = getPimOrigin();
  let url = `${origin}/api/rest/v1/asset-families?limit=100`;
  fetchDebug.push(`REST: base URL = ${url}`);

  while (url) {
    let response;
    try {
      response = await fetch(url, { credentials: 'include' });
    } catch (err) {
      fetchDebug.push(`REST: fetch threw: ${err.message}`);
      break;
    }
    if (!response.ok) {
      fetchDebug.push(`REST: non-OK status ${response.status} ${response.statusText}`);
      break;
    }
    const json = await response.json();
    if (all.length === 0) {
      const shape = Array.isArray(json)
        ? `plain array, length=${json.length}`
        : json && typeof json === 'object'
          ? `object, keys=[${Object.keys(json).join(', ')}]`
          : String(json);
      fetchDebug.push(`REST: page 1 response shape: ${shape}`);
    }
    const items = extractItems(json);
    all.push(...items);
    fetchDebug.push(`REST: ${items.length} items on this page, running total: ${all.length}`);
    const links = json._links ?? json.links;
    url = links?.next?.href ?? null;
    if (items.length === 0) break;
  }
  return all;
}

/**
 * Fetches all asset families and maps them to { code, hasTransformations, hasProductLinkRules }.
 *
 * @returns {Promise<{ families: Array, fetchDebug: string[] }>}
 */
export async function fetchAssetFamilyList() {
  const fetchDebug = [];
  const sdkFamilies = await fetchViaSdk(fetchDebug);
  if (sdkFamilies.length > 0) {
    fetchDebug.push(`SDK: success — ${sdkFamilies.length} families total`);
    return { families: mapFamilies(sdkFamilies), fetchDebug };
  }
  const restFamilies = await fetchViaRest(fetchDebug);
  fetchDebug.push(`REST: final total — ${restFamilies.length} families`);
  return { families: mapFamilies(restFamilies), fetchDebug };
}
