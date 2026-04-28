/**
 * main.js
 *
 * Entry point for the Marketing Costs Saved Custom Component.
 * Position: pim.activity.navigation.tab
 *
 * At this position there is no product/category context — the component
 * calls PIM.api.* directly to fetch catalogue-wide data.
 *
 * Orchestration:
 *   1. Wait for window.PIM (polling with exponential backoff)
 *   2. Fetch attributes + product sample + asset families in parallel
 *   3. Calculate all 5 metrics (isolated — one failure won't block others)
 *   4. Render the dashboard
 */

import { CONFIG } from './config.js';
import { debugLog, debugError, debugTime, debugTimeEnd } from './utils/logger.js';
import { fetchAssetFamilyList } from './data/fetchAssetFamilyList.js';
import { calculate as calculateCompleteness }             from './metrics/completeness.js';
import { calculate as calculateStructuredAttributes }      from './metrics/structuredAttributes.js';
import { calculate as calculateAssociations }              from './metrics/associations.js';
import { calculate as calculateAssetCollections }          from './metrics/assetCollections.js';
import { calculate as calculateAssetFamilyTransformations } from './metrics/assetFamilyTransformations.js';
import { renderDashboard, renderLoading, renderError } from './renderer/dashboard.js';

// ── SDK Waiter ────────────────────────────────────────────────────────────────

/**
 * Polls for window.PIM with exponential backoff.
 * Resolves once the SDK is available or rejects after timeoutMs.
 *
 * @param {number} [timeoutMs=10000]
 * @returns {Promise<Object>} The PIM SDK instance
 */
function waitForPim(timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    if (window.PIM) {
      resolve(window.PIM);
      return;
    }

    const startTime = Date.now();
    let interval = 100;

    const poll = () => {
      if (window.PIM) {
        debugLog('main', `PIM SDK detected after ${Date.now() - startTime}ms`);
        resolve(window.PIM);
        return;
      }
      if (Date.now() - startTime >= timeoutMs) {
        reject(
          new Error(
            `PIM SDK (window.PIM) was not available after ${timeoutMs / 1000}s. ` +
            'Ensure this script is loaded within an Akeneo Custom Component context.'
          )
        );
        return;
      }
      interval = Math.min(interval * 1.5, 500);
      setTimeout(poll, interval);
    };

    setTimeout(poll, interval);
  });
}

// ── Data Fetching ─────────────────────────────────────────────────────────────

/**
 * Fetches all catalogue attributes using paginated attribute_v1.list().
 *
 * @returns {Promise<Array>} Flat array of all attribute objects
 */
async function fetchAllAttributes() {
  debugTime('fetchAttributes');
  const all = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const response = await globalThis.PIM.api.attribute_v1.list({ page, limit });
    const items = response.items ?? [];
    all.push(...items);

    debugLog('fetchAttributes', `Page ${page}: ${items.length} attrs (total so far: ${all.length})`);

    if (items.length === 0 || !response.links?.next) break;
    page++;
  }

  debugTimeEnd('fetchAttributes');
  debugLog('fetchAttributes', `Complete — ${all.length} attributes`);
  return all;
}

/**
 * Fetches a product sample with completeness data.
 * Capped at CONFIG.api.sampleMaxProducts.
 *
 * @returns {Promise<Array>} Flat array of sampled product objects
 */
async function fetchProductSample() {
  debugTime('fetchProducts');
  const all = [];
  let page = 1;
  const limit = CONFIG.api.samplePageSize;
  const maxPages = CONFIG.api.sampleMaxProducts / limit;

  while (page <= maxPages) {
    const response = await globalThis.PIM.api.product_uuid_v1.list({
      page,
      limit,
      withCompletenesses: true,
    });
    const items = response.items ?? [];
    all.push(...items);

    debugLog('fetchProducts', `Page ${page}/${maxPages}: ${items.length} products (total: ${all.length})`);

    if (items.length === 0 || !response.links?.next) break;
    page++;
  }

  debugTimeEnd('fetchProducts');
  debugLog('fetchProducts', `Complete — ${all.length} products`);
  return all;
}

// ── Safe Metric Calculation ───────────────────────────────────────────────────

/**
 * Wraps a metric calculate() call so that a single metric failure
 * does not prevent the remaining metrics from rendering.
 *
 * @param {Function} fn        - The calculate() function to invoke
 * @param {Object}   context   - The shared context object
 * @param {string}   metricKey - Key into CONFIG.metrics (used for error label)
 * @returns {Promise<Object|Array>} A metric result or error result
 */
async function safeCalculate(fn, context, metricKey) {
  try {
    return await fn(context);
  } catch (err) {
    debugError(`metric.${metricKey}`, err);
    return {
      numerator: null,
      denominator: 0,
      percentage: null,
      label: CONFIG.metrics[metricKey]?.label ?? metricKey,
      caveat: 'Calculation error — see browser console for details.',
      debugInfo: { error: err.message, stack: err.stack },
      error: true,
    };
  }
}

// ── Metric Visibility ─────────────────────────────────────────────────────────

/**
 * Reads the `enabled_metrics` custom variable and returns a Set of valid keys.
 * Falls back to all keys if the variable is unset, empty, or all values are invalid.
 *
 * @param {string[]} allKeys - All known metric keys for this component
 * @returns {Set<string>}
 */
function getEnabledMetrics(allKeys) {
  try {
    const vars = globalThis.PIM.custom_variables ?? {};
    const raw = Array.isArray(vars)
      ? vars.find(v => v.code === 'enabled_metrics')?.value
      : vars.enabled_metrics;
    if (typeof raw === 'string' && raw.trim().length > 0) {
      const requested = new Set(raw.split(',').map(k => k.trim()).filter(Boolean));
      const valid = allKeys.filter(k => requested.has(k));
      if (valid.length > 0) {
        debugLog('main.enabledMetrics', valid);
        return new Set(valid);
      }
    }
  } catch (_) {}
  return new Set(allKeys);
}

// ── Main Orchestration ────────────────────────────────────────────────────────

/**
 * Fetches data, calculates all 5 metrics, and renders the dashboard.
 *
 * @param {HTMLElement} container - The DOM element to render into
 */
async function run(container) {
  renderLoading(container);

  const timings = {};
  const t0 = Date.now();

  // ── Phase 1: Fetch attributes, products, and asset families in parallel ──
  let attributes, products, assetFamilies, assetFamiliesFetchDebug;
  try {
    debugTime('fetchAll');
    const t1 = Date.now();
    const [attrResult, prodResult, afResult] = await Promise.all([
      fetchAllAttributes(),
      fetchProductSample(),
      fetchAssetFamilyList(),
    ]);
    attributes = attrResult;
    products = prodResult;
    assetFamilies = afResult.families;
    assetFamiliesFetchDebug = afResult.fetchDebug;
    timings.fetch = Date.now() - t1;
    debugTimeEnd('fetchAll');
  } catch (err) {
    debugError('main.fetch', err);
    renderError(container, `Failed to load data from PIM: ${err.message}`);
    return;
  }

  if (attributes.length === 0) {
    renderError(container, 'No attributes found in this PIM instance. Cannot calculate metrics.');
    return;
  }

  if (products.length === 0) {
    renderError(container, 'No products found in this PIM instance. Cannot calculate metrics.');
    return;
  }

  debugLog('main', {
    attributesFetched: attributes.length,
    productsFetched: products.length,
    assetFamiliesFetched: assetFamilies.length,
  });

  const context = { products, attributes, assetFamilies };

  // ── Phase 2: Calculate all 5 metrics (failures isolated per metric) ──
  const t2 = Date.now();
  const [
    completenessResults,
    structuredAttributesResult,
    associationsResult,
    assetCollectionsResult,
    assetFamilyTransformationsResult,
  ] = await Promise.all([
    safeCalculate(calculateCompleteness,             context, 'completeness'),
    safeCalculate(calculateStructuredAttributes,      context, 'structuredAttributes'),
    safeCalculate(calculateAssociations,              context, 'associations'),
    safeCalculate(calculateAssetCollections,          context, 'assetCollections'),
    safeCalculate(calculateAssetFamilyTransformations, context, 'assetFamilyTransformations'),
  ]);
  timings.calculate = Date.now() - t2;

  // completenessResults is an array; safeCalculate wraps it as-is.
  // If calculate() threw, we get a single error object — normalise to array.
  const safeCompletenessResults = Array.isArray(completenessResults)
    ? completenessResults
    : [completenessResults];

  // ── Phase 3: Determine which metrics to show ──
  const ALL_KEYS = [
    'completeness',
    'structuredAttributes',
    'associations',
    'assetCollections',
    'assetFamilyTransformations',
  ];
  const enabledKeys = getEnabledMetrics(ALL_KEYS);

  // ── Phase 4: Render ──
  const t3 = Date.now();
  renderDashboard(container, {
    completenessResults: safeCompletenessResults,
    structuredAttributesResult,
    associationsResult,
    assetCollectionsResult,
    assetFamilyTransformationsResult,
    assetFamiliesFetchDebug,
    productCount: products.length,
    attributeCount: attributes.length,
    assetFamilyCount: assetFamilies.length,
    showCompleteness:             enabledKeys.has('completeness'),
    showStructuredAttributes:     enabledKeys.has('structuredAttributes'),
    showAssociations:             enabledKeys.has('associations'),
    showAssetCollections:         enabledKeys.has('assetCollections'),
    showAssetFamilyTransformations: enabledKeys.has('assetFamilyTransformations'),
    timings,
    config: CONFIG,
  });
  timings.render = Date.now() - t3;
  timings.total  = Date.now() - t0;

  debugLog('main.timings', timings);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

/**
 * Initialises the component: ensures the root container exists,
 * waits for the PIM SDK, then runs the main orchestration.
 */
async function init() {
  if (!document.getElementById('root')) {
    document.body.innerHTML = '<div id="root"></div>';
  }
  const container = document.getElementById('root');

  try {
    await waitForPim();
    await run(container);
  } catch (err) {
    debugError('main.init', err);
    renderError(container, err.message);
  }
}

window.MarketingCostsSaved = { init };
init();
