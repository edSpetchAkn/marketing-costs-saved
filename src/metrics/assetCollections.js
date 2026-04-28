/**
 * assetCollections.js
 *
 * Metric 4: % of Products with Asset Collection Attribute Populated
 *
 * Discovers all attributes of type pim_catalog_asset_collection, then checks
 * whether each product has at least one of those attributes populated with
 * at least one linked asset.
 *
 * Returns percentage: null (not 0) if no asset collection attributes exist
 * in this PIM instance — this metric is then not applicable.
 *
 * Data source: context.products + context.attributes
 */

import { CONFIG } from '../config.js';
import { debugLog } from '../utils/logger.js';

/**
 * Calculates the percentage of products with at least one populated asset
 * collection attribute.
 *
 * @param {Object} context
 * @param {Array}  context.products   - Sampled product array
 * @param {Array}  context.attributes - Full attribute list
 * @returns {Object} result
 */
export async function calculate(context) {
  const { products, attributes } = context;
  const metricConfig = CONFIG.metrics.assetCollections;

  // Discover asset collection attribute codes for this instance
  const assetCollectionAttributeCodes = (attributes || [])
    .filter((a) => a.type === CONFIG.assetCollectionAttributeType)
    .map((a) => a.code);

  // If no asset collection attributes exist, metric is not applicable
  if (assetCollectionAttributeCodes.length === 0) {
    return {
      numerator: null,
      denominator: products ? products.length : 0,
      percentage: null,
      label: metricConfig.label,
      caveat: 'No asset collection attributes found in this PIM instance. This metric is not applicable.',
      debugInfo: {
        totalProducts: products ? products.length : 0,
        assetCollectionAttributeCodes: [],
        productsWithAssets: 0,
        productsWithoutAssets: 0,
        examplePopulatedUuids: [],
        exampleUnpopulatedUuids: [],
      },
    };
  }

  if (!products || products.length === 0) {
    return {
      numerator: null,
      denominator: 0,
      percentage: null,
      label: metricConfig.label,
      caveat: 'No products found in sample',
      debugInfo: {
        totalProducts: 0,
        assetCollectionAttributeCodes,
        productsWithAssets: 0,
        productsWithoutAssets: 0,
        examplePopulatedUuids: [],
        exampleUnpopulatedUuids: [],
      },
    };
  }

  const populatedUuids = [];
  const unpopulatedUuids = [];

  for (const product of products) {
    const values = product.values;
    let hasAssets = false;

    if (values && typeof values === 'object') {
      for (const code of assetCollectionAttributeCodes) {
        const entries = values[code];
        if (!Array.isArray(entries)) continue;
        const populated = entries.some((entry) => {
          const data = entry.data;
          return Array.isArray(data) && data.length > 0;
        });
        if (populated) {
          hasAssets = true;
          break;
        }
      }
    }

    if (hasAssets) {
      populatedUuids.push(product.uuid);
    } else {
      unpopulatedUuids.push(product.uuid);
    }
  }

  const numerator = populatedUuids.length;
  const denominator = products.length;
  const percentage = Math.round((numerator / denominator) * 1000) / 10;

  const debugInfo = {
    totalProducts: denominator,
    assetCollectionAttributeCodes,
    productsWithAssets: numerator,
    productsWithoutAssets: denominator - numerator,
    examplePopulatedUuids: populatedUuids.slice(0, 3),
    exampleUnpopulatedUuids: unpopulatedUuids.slice(0, 5),
  };

  debugLog('metric.assetCollections', debugInfo);

  return {
    numerator,
    denominator,
    percentage,
    label: metricConfig.label,
    caveat: null,
    debugInfo,
  };
}
