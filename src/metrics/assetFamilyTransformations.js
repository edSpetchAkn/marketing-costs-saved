/**
 * assetFamilyTransformations.js
 *
 * Metric 5: % of Asset Families with Transformations or Product Link Rules
 *
 * Uses pre-mapped asset family data from fetchAssetFamilyList(), which already
 * extracts { code, hasTransformations, hasProductLinkRules } per family.
 *
 * A family passes if EITHER transformations OR product link rules are configured.
 *
 * Returns percentage: null if:
 *   - No asset families exist in this instance
 *   - The API did not expose transformation/product link rule fields (all values
 *     would be false by default from the mapping — indistinguishable from "none configured")
 *
 * Data source: context.assetFamilies (pre-mapped by fetchAssetFamilyList)
 */

import { CONFIG } from '../config.js';
import { debugLog } from '../utils/logger.js';

/**
 * Calculates the percentage of asset families with transformations or product link rules.
 *
 * @param {Object} context
 * @param {Array}  context.assetFamilies - Pre-mapped asset family objects
 *                                         [{ code, hasTransformations, hasProductLinkRules }]
 * @returns {Object} result
 */
export async function calculate(context) {
  const { assetFamilies } = context;
  const metricConfig = CONFIG.metrics.assetFamilyTransformations;

  if (!assetFamilies || assetFamilies.length === 0) {
    return {
      numerator: null,
      denominator: 0,
      percentage: null,
      label: metricConfig.label,
      caveat: 'No asset families configured in this PIM instance.',
      debugInfo: {
        totalFamilies: 0,
        withTransformations: 0,
        withProductLinkRules: 0,
        withEither: 0,
        withNeither: 0,
        familyBreakdown: [],
      },
    };
  }

  let withTransformations = 0;
  let withProductLinkRules = 0;
  let withEither = 0;
  const familyBreakdown = [];

  for (const family of assetFamilies) {
    const hasT = family.hasTransformations === true;
    const hasP = family.hasProductLinkRules === true;

    if (hasT) withTransformations++;
    if (hasP) withProductLinkRules++;
    if (hasT || hasP) withEither++;

    familyBreakdown.push({
      code: family.code,
      hasTransformations: hasT,
      hasProductLinkRules: hasP,
    });
  }

  const numerator = withEither;
  const denominator = assetFamilies.length;
  const percentage = Math.round((numerator / denominator) * 1000) / 10;

  const debugInfo = {
    totalFamilies: denominator,
    withTransformations,
    withProductLinkRules,
    withEither: numerator,
    withNeither: denominator - numerator,
    familyBreakdown,
  };

  debugLog('metric.assetFamilyTransformations', debugInfo);

  return {
    numerator,
    denominator,
    percentage,
    label: metricConfig.label,
    caveat: null,
    debugInfo,
  };
}
