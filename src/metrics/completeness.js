/**
 * completeness.js
 *
 * Metric 1: % of Products with 100% Completeness per Channel
 *
 * Discovers channels dynamically from product completeness data — no
 * separate channel API call required. Returns one result per channel,
 * sorted alphabetically, so the dashboard renders one card per channel.
 *
 * Data source: context.products (fetched with withCompletenesses: true)
 */

import { CONFIG } from '../config.js';
import { debugLog } from '../utils/logger.js';

/**
 * Calculates per-channel completeness percentages.
 *
 * @param {Object} context
 * @param {Array}  context.products - Sampled product array (with completenesses)
 * @returns {Array<Object>} Array of per-channel result objects
 */
export function calculate(context) {
  const { products } = context;
  const metricConfig = CONFIG.metrics.completeness;

  if (!products || products.length === 0) {
    return [{
      channelCode: 'unknown',
      numerator: 0,
      denominator: 0,
      percentage: null,
      label: metricConfig.label,
      caveat: 'No products found in sample.',
      debugInfo: {},
    }];
  }

  // Build a map of channelCode → { total, at100 } from embedded completeness data
  const channelMap = new Map();

  for (const product of products) {
    const completenesses = product.completenesses ?? [];
    for (const c of completenesses) {
      const ch = c.scope ?? c.channel ?? 'unknown';
      if (!channelMap.has(ch)) channelMap.set(ch, { total: 0, at100: 0 });
      const entry = channelMap.get(ch);
      entry.total++;
      if ((c.data ?? 0) >= 100) entry.at100++;
    }
  }

  if (channelMap.size === 0) {
    return [{
      channelCode: 'unknown',
      numerator: 0,
      denominator: products.length,
      percentage: null,
      label: metricConfig.label,
      caveat: 'No completeness data found. Ensure withCompletenesses is enabled.',
      debugInfo: { productsChecked: products.length },
    }];
  }

  const results = Array.from(channelMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([channelCode, { total, at100 }]) => ({
      channelCode,
      numerator: at100,
      denominator: total,
      percentage: total > 0 ? Math.round((at100 / total) * 1000) / 10 : null,
      label: metricConfig.label,
      caveat: null,
      debugInfo: {
        channelCode,
        productsAt100: at100,
        totalProducts: total,
        failingCount: total - at100,
      },
    }));

  debugLog('metric.completeness', results.map(r => ({
    channel: r.channelCode,
    percentage: r.percentage,
    numerator: r.numerator,
    denominator: r.denominator,
  })));

  return results;
}
