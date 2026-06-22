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
import {
  fetchProducts,
  fetchAttributes,
  fetchFamilies,
  fetchAssetFamilies,
  calculateCompleteness,
  calculateStructuredAttributeTypes,
  calculateAssociations,
  calculateAssetCollections,
  calculateAssetFamilyTransformations,
} from '@akeneo/maturity-metrics';
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

// ── Safe Metric Calculation ───────────────────────────────────────────────────

async function safeMetric(metricKey, fn) {
  try {
    return await fn();
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
    products = await fetchProducts(familyCode);
    timings.fetch = Date.now() - t1;
  } catch (err) {
    debugError('runMetrics.fetch', err);
    renderMetricsError(metricsArea, err.message);
    return;
  }

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
    safeMetric('completeness', () => calculateCompleteness(products)),
    safeMetric('structuredAttributes', () => calculateStructuredAttributeTypes(attributes, { structuredAttributeTypes: CONFIG.structuredAttributeTypes })),
    safeMetric('associations', () => calculateAssociations(products, attributes, { productLinkAttributeTypes: CONFIG.productLinkAttributeTypes })),
    safeMetric('assetCollections', () => calculateAssetCollections(products, attributes, { assetCollectionAttributeType: CONFIG.assetCollectionAttributeType })),
    safeMetric('assetFamilyTransformations', () => calculateAssetFamilyTransformations(assetFamilies)),
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
    showCompleteness:               enabledKeys.has('completeness'),
    showStructuredAttributes:       enabledKeys.has('structuredAttributes'),
    showAssociations:               enabledKeys.has('associations'),
    showAssetCollections:           enabledKeys.has('assetCollections'),
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
      fetchAttributes(),
      fetchFamilies(),
      fetchAssetFamilies(),
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
