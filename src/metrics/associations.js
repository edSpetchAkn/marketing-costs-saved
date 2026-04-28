/**
 * associations.js
 *
 * Metric 3: % of Products with Product Link / Association Populated
 *
 * Checks two mechanisms and counts a product as "linked" if EITHER has data:
 *
 *   Mechanism A — Built-in associations (product.associations):
 *     Each product has an associations object keyed by association type code.
 *     A product has associations if any type has at least one entry in
 *     products or product_models arrays (groups are ignored).
 *
 *   Mechanism B — Product link attributes (pim_catalog_product_link type):
 *     Discover attribute codes of this type from the attribute list.
 *     A product has product links if any of those attribute codes has a
 *     non-empty value in product.values.
 *
 * Data source: context.products + context.attributes
 */

import { CONFIG } from '../config.js';
import { debugLog } from '../utils/logger.js';

/**
 * Calculates the percentage of products with at least one association or product link.
 *
 * @param {Object} context
 * @param {Array}  context.products   - Sampled product array
 * @param {Array}  context.attributes - Full attribute list (used to find product link attrs)
 * @returns {Object} result
 */
export async function calculate(context) {
  const { products, attributes } = context;
  const metricConfig = CONFIG.metrics.associations;
  const productLinkTypes = new Set(CONFIG.productLinkAttributeTypes);

  if (!products || products.length === 0) {
    return {
      numerator: null,
      denominator: 0,
      percentage: null,
      label: metricConfig.label,
      caveat: 'No products found in sample',
      debugInfo: {
        totalProducts: 0,
        productsWithAssociations: 0,
        productsWithProductLinks: 0,
        productsWithEither: 0,
        productLinkAttributeCodes: [],
        associationTypesFound: [],
        exampleUnlinkedUuids: [],
      },
    };
  }

  // Discover product link attribute codes from the full attribute list
  const productLinkAttributeCodes = (attributes || [])
    .filter((a) => productLinkTypes.has(a.type))
    .map((a) => a.code);

  const associationTypesFound = new Set();
  let productsWithAssociations = 0;
  let productsWithProductLinks = 0;
  let productsWithEither = 0;
  const unlinkedUuids = [];

  for (const product of products) {
    // ── Mechanism A: built-in associations ──
    let hasAssoc = false;
    const assocs = product.associations;
    if (assocs && typeof assocs === 'object') {
      for (const typeCode of Object.keys(assocs)) {
        const assocData = assocs[typeCode];
        if (!assocData) continue;
        const hasProducts =
          Array.isArray(assocData.products) && assocData.products.length > 0;
        const hasModels =
          Array.isArray(assocData.product_models) && assocData.product_models.length > 0;
        if (hasProducts || hasModels) {
          hasAssoc = true;
          associationTypesFound.add(typeCode);
        }
      }
    }

    // ── Mechanism B: product link attributes ──
    let hasLinks = false;
    if (productLinkAttributeCodes.length > 0) {
      const values = product.values;
      if (values && typeof values === 'object') {
        for (const code of productLinkAttributeCodes) {
          const entries = values[code];
          if (!Array.isArray(entries)) continue;
          const nonEmpty = entries.some((entry) => {
            const data = entry.data;
            return (
              data !== null &&
              data !== undefined &&
              data !== '' &&
              !(Array.isArray(data) && data.length === 0)
            );
          });
          if (nonEmpty) {
            hasLinks = true;
            break;
          }
        }
      }
    }

    if (hasAssoc) productsWithAssociations++;
    if (hasLinks) productsWithProductLinks++;

    if (hasAssoc || hasLinks) {
      productsWithEither++;
    } else {
      unlinkedUuids.push(product.uuid);
    }
  }

  const numerator = productsWithEither;
  const denominator = products.length;
  const percentage = Math.round((numerator / denominator) * 1000) / 10;

  // Describe which mechanisms contributed
  const hasProductLinkAttrs = productLinkAttributeCodes.length > 0;
  const hasAnyAssocData = associationTypesFound.size > 0;
  let caveat = null;
  if (!hasProductLinkAttrs) {
    caveat = 'No product link attributes found in this instance. Metric is based on associations only.';
  } else if (!hasAnyAssocData) {
    caveat = 'Metric is based on product link attributes only. No associations data detected.';
  }

  const debugInfo = {
    totalProducts: denominator,
    productsWithAssociations,
    productsWithProductLinks,
    productsWithEither: numerator,
    productLinkAttributeCodes,
    associationTypesFound: Array.from(associationTypesFound),
    exampleUnlinkedUuids: unlinkedUuids.slice(0, 5),
  };

  debugLog('metric.associations', debugInfo);

  return {
    numerator,
    denominator,
    percentage,
    label: metricConfig.label,
    caveat,
    debugInfo,
  };
}
