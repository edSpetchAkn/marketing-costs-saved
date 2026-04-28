/**
 * structuredAttributes.js
 *
 * Metric 2: % of Attributes that are Structured Types
 *
 * Instance-level metric — examines the catalogue's attribute schema,
 * not individual product data. Structured types are those that return
 * discrete, machine-parseable values rather than free-form text.
 * The full list is defined in CONFIG.structuredAttributeTypes.
 *
 * Data source: context.attributes (full attribute list)
 */

import { CONFIG } from '../config.js';
import { debugLog } from '../utils/logger.js';

/**
 * Calculates the percentage of catalogue attributes using structured types.
 *
 * @param {Object} context
 * @param {Array}  context.attributes - Full attribute list from the PIM instance
 * @returns {Object} result
 */
export async function calculate(context) {
  const { attributes } = context;
  const metricConfig = CONFIG.metrics.structuredAttributes;
  const structuredTypes = new Set(CONFIG.structuredAttributeTypes);

  if (!attributes || attributes.length === 0) {
    return {
      numerator: null,
      denominator: 0,
      percentage: null,
      label: metricConfig.label,
      caveat: 'No attributes found in this PIM instance',
      debugInfo: {
        totalAttributes: 0,
        structuredAttributes: 0,
        unstructuredAttributes: 0,
        structuredBreakdown: {},
        unstructuredBreakdown: {},
        exampleUnstructuredCodes: [],
      },
    };
  }

  const structuredBreakdown = {};
  const unstructuredBreakdown = {};
  const unstructuredCodes = [];

  for (const attr of attributes) {
    const type = attr.type;
    if (structuredTypes.has(type)) {
      structuredBreakdown[type] = (structuredBreakdown[type] || 0) + 1;
    } else {
      unstructuredBreakdown[type] = (unstructuredBreakdown[type] || 0) + 1;
      unstructuredCodes.push(attr.code);
    }
  }

  const numerator = Object.values(structuredBreakdown).reduce((sum, n) => sum + n, 0);
  const denominator = attributes.length;
  const percentage = Math.round((numerator / denominator) * 1000) / 10;

  const debugInfo = {
    totalAttributes: denominator,
    structuredAttributes: numerator,
    unstructuredAttributes: denominator - numerator,
    structuredBreakdown,
    unstructuredBreakdown,
    exampleUnstructuredCodes: unstructuredCodes.slice(0, 10),
  };

  debugLog('metric.structuredAttributes', debugInfo);

  return {
    numerator,
    denominator,
    percentage,
    label: metricConfig.label,
    caveat: null,
    debugInfo,
  };
}
