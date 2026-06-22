/**
 * main.js
 *
 * Entry point for the Marketing Costs Saved Custom Component.
 * Position: pim.activity.navigation.tab
 *
 * Orchestration:
 *   Phase 1 — fetch attributes + product families + asset families in parallel,
 *              render shell with family dropdown
 *   Phase 2 — fetch all products for the selected family, calculate all 5 metrics,
 *              render results. Re-runs on every family change.
 */

import { CONFIG } from './config.js';
import { debugLog, debugError, debugTime, debugTimeEnd } from './utils/logger.js';
import { fetchAssetFamilyList } from './data/fetchAssetFamilyList.js';
import { calculate as calculateCompleteness }              from './metrics/completeness.js';
import { calculate as calculateStructuredAttributes }       from './metrics/structuredAttributes.js';
import { calculate as calculateAssociations }               from './metrics/associations.js';
import { calculate as calculateAssetCollections }           from './metrics/assetCollections.js';
import { calculate as calculateAssetFamilyTransformations } from './metrics/assetFamilyTransformations.js';
import {
  renderLoading,
  renderError,
  renderShell,
  renderMetricsLoading,
  renderMetrics,
  renderMetricsError,
} from './renderer/dashboard.js';

// ── SDK Waiter ────────────────────────────────────────────────────────────────

function waitForPim(timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    if (window.PIM) { resolve(window.PIM); return; }

    const startTime = Date.now();
    let interval = 100;

    const poll = () => {
      if (window.PIM) {
        debugLog('main', `PIM SDK detected after ${Date.now() - startTime}ms`);
        resolve(window.PIM);
        return;
      }
      if (Date.now() - startTime >= timeoutMs) {
        reject(new Error(
          `PIM SDK (window.PIM) was not available after ${timeoutMs / 1000}s. ` +
          'Ensure this script is loaded within an Akeneo Custom Component context.'
        ));
        return;
      }
      interval = Math.min(interval * 1.5, 500);
      setTimeout(poll, interval);
    };

    setTimeout(poll, interval);
  });
}

// ── Data Fetching ─────────────────────────────────────────────────────────────

async function fetchAllAttributes() {
  debugTime('fetchAttributes');
  const all = [];
  let page = 1;

  while (true) {
    const response = await globalThis.PIM.api.attribute_v1.list({ page, limit: 100 });
    const items = response.items ?? [];
    all.push(...items);
    debugLog('fetchAttributes', `Page ${page}: ${items.length} attrs (total: ${all.length})`);
    if (items.length === 0 || !response.links?.next) break;
    page++;
  }

  debugTimeEnd('fetchAttributes');
  debugLog('fetchAttributes', `Complete — ${all.length} attributes`);
  return all;
}

async function fetchAllFamilies() {
  debugTime('fetchFamilies');
  const all = [];
  let page = 1;

  while (true) {
    const response = await globalThis.PIM.api.family_v1.list({ page, limit: 100 });
    const items = response.items ?? [];
    all.push(...items);
    debugLog('fetchFamilies', `Page ${page}: ${items.length} families (total: ${all.length})`);
    if (items.length === 0 || !response.links?.next) break;
    page++;
  }

  debugTimeEnd('fetchFamilies');
  debugLog('fetchFamilies', `Complete — ${all.length} families`);
  return all;
}

async function fetchProductsByFamily(familyCode) {
  debugTime('fetchProducts');
  const searchFilter = familyCode === '__none__'
    ? { family: [{ operator: 'EMPTY' }] }
    : { family: [{ operator: 'IN', value: [familyCode] }] };

  const all = [];
  let page = 1;
  let useCompletenesses = true;
  let stringifySearch = false;

  while (true) {
    let response;
    try {
      response = await globalThis.PIM.api.product_uuid_v1.list({
        search: stringifySearch ? JSON.stringify(searchFilter) : searchFilter,
        page,
        limit: 100,
        ...(useCompletenesses && { withCompletenesses: true }),
      });
    } catch (err) {
      if (/422/.test(err?.message ?? '')) {
        if (useCompletenesses) { useCompletenesses = false; continue; }
        if (!stringifySearch)  { stringifySearch = true;   continue; }
      }
      throw err;
    }
    const items = response.items ?? [];
    all.push(...items);
    debugLog('fetchProducts', `Page ${page}: ${items.length} products (total: ${all.length})`);
    if (items.length === 0 || !response.links?.next) break;
    page++;
  }

  debugTimeEnd('fetchProducts');
  debugLog('fetchProducts', `Complete — ${all.length} products for family "${familyCode}"`);
  return all;
}

// ── Safe Metric Calculation ───────────────────────────────────────────────────

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

// ── Phase 2: Fetch products + calculate + render metrics ──────────────────────

async function runMetrics(metricsArea, { attributes, families, assetFamilies, assetFamiliesFetchDebug, familyCode }) {
  renderMetricsLoading(metricsArea);

  const userLocale = globalThis.PIM.context?.user?.catalog_locale ?? 'en_US';
  const family = families.find(f => f.code === familyCode);
  const familyLabel = familyCode === '__none__'
    ? 'No family'
    : (family?.labels?.[userLocale] ?? family?.labels?.['en_US'] ?? familyCode);

  const timings = {};
  const t0 = Date.now();

  let products;
  try {
    const t1 = Date.now();
    products = await fetchProductsByFamily(familyCode);
    timings.fetch = Date.now() - t1;
  } catch (err) {
    debugError('runMetrics.fetch', err);
    renderMetricsError(metricsArea, err.message);
    return;
  }

  const context = { products, attributes, assetFamilies };

  const ALL_KEYS = [
    'completeness',
    'structuredAttributes',
    'associations',
    'assetCollections',
    'assetFamilyTransformations',
  ];
  const enabledKeys = getEnabledMetrics(ALL_KEYS);

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

  const safeCompletenessResults = Array.isArray(completenessResults)
    ? completenessResults
    : [completenessResults];

  const t3 = Date.now();
  renderMetrics(metricsArea, {
    completenessResults: safeCompletenessResults,
    structuredAttributesResult,
    associationsResult,
    assetCollectionsResult,
    assetFamilyTransformationsResult,
    assetFamiliesFetchDebug,
    productCount: products.length,
    familyLabel,
    attributeCount: attributes.length,
    assetFamilyCount: assetFamilies.length,
    showCompleteness:              enabledKeys.has('completeness'),
    showStructuredAttributes:      enabledKeys.has('structuredAttributes'),
    showAssociations:              enabledKeys.has('associations'),
    showAssetCollections:          enabledKeys.has('assetCollections'),
    showAssetFamilyTransformations: enabledKeys.has('assetFamilyTransformations'),
    timings,
    config: CONFIG,
  });
  timings.render = Date.now() - t3;
  timings.total  = Date.now() - t0;

  debugLog('runMetrics.timings', { familyCode, ...timings });
}

// ── Phase 1: Fetch schema + render shell ──────────────────────────────────────

async function run(container) {
  renderLoading(container);

  let attributes, families, assetFamilies, assetFamiliesFetchDebug;
  try {
    debugTime('fetchSchema');
    const [attrResult, famResult, afResult] = await Promise.all([
      fetchAllAttributes(),
      fetchAllFamilies(),
      fetchAssetFamilyList(),
    ]);
    attributes = attrResult;
    families   = famResult;
    assetFamilies = afResult.families;
    assetFamiliesFetchDebug = afResult.fetchDebug;
    debugTimeEnd('fetchSchema');
  } catch (err) {
    debugError('run.fetch', err);
    renderError(container, `Failed to load catalogue data: ${err.message}`);
    return;
  }

  if (attributes.length === 0) {
    renderError(container, 'No attributes found in this PIM instance. Cannot calculate metrics.');
    return;
  }

  debugLog('run', {
    attributesFetched: attributes.length,
    familiesFetched: families.length,
    assetFamiliesFetched: assetFamilies.length,
  });

  const userLocale = globalThis.PIM.context?.user?.catalog_locale ?? 'en_US';

  const { metricsArea, defaultFamilyCode } = renderShell(container, {
    families,
    userLocale,
    config: CONFIG,
    onFamilyChange: (familyCode) => {
      runMetrics(metricsArea, { attributes, families, assetFamilies, assetFamiliesFetchDebug, familyCode });
    },
  });

  await runMetrics(metricsArea, { attributes, families, assetFamilies, assetFamiliesFetchDebug, familyCode: defaultFamilyCode });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

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
    const c = document.getElementById('root');
    if (c) renderError(c, err.message);
  }
}

window.MarketingCostsSaved = { init };
init();
