/**
 * config.js
 *
 * Single source of truth for all configuration, thresholds, and narrative strings.
 * No metric module or renderer should hardcode values that belong here.
 *
 * To deploy against a new client instance:
 *   1. Adjust thresholds per engagement context
 *   2. Set debugMode: false before handover
 *   3. Do NOT hardcode attribute codes, family codes, or channel codes anywhere
 */

export const CONFIG = {
  // ──────────────────────────────────────────────
  // DEBUG — set to false before client handover
  // ──────────────────────────────────────────────
  debugMode: true,

  // ──────────────────────────────────────────────
  // API SETTINGS
  // ──────────────────────────────────────────────
  api: {
    sampleMaxProducts: 1000,   // Hard ceiling on product sample size
    samplePageSize: 100,       // Products per API page (Akeneo max = 100)
    maxAssetFamilyPages: 10,   // Max pages when paginating asset families
  },

  // ──────────────────────────────────────────────
  // STRUCTURED ATTRIBUTE TYPES
  // Attribute types that return discrete, machine-parseable values.
  // These reduce the manual formatting overhead required before data
  // can be syndicated to marketplaces and external channels.
  //
  // Mapping (PIM UI label → API type code):
  //   Date and time                    → pim_catalog_date
  //   Identifier                       → pim_catalog_identifier
  //   Measurement                      → pim_catalog_metric
  //   Multi-select                     → pim_catalog_multiselect
  //   Number                           → pim_catalog_number
  //   Price                            → pim_catalog_price_collection
  //   Reference entity multiple links  → akeneo_reference_entity_collection
  //   Reference entity single link     → akeneo_reference_entity
  //   Simple select                    → pim_catalog_simpleselect
  //   Table                            → pim_catalog_table
  //   Yes/No                           → pim_catalog_boolean
  // ──────────────────────────────────────────────
  structuredAttributeTypes: [
    'pim_catalog_date',
    'pim_catalog_identifier',
    'pim_catalog_metric',
    'pim_catalog_multiselect',
    'pim_catalog_number',
    'pim_catalog_price_collection',
    'akeneo_reference_entity_collection',
    'akeneo_reference_entity',
    'pim_catalog_simpleselect',
    'pim_catalog_table',
    'pim_catalog_boolean',
  ],

  // ──────────────────────────────────────────────
  // PRODUCT LINK / ASSOCIATION ATTRIBUTE TYPES
  // Used by the associations metric to discover product link attributes.
  // ──────────────────────────────────────────────
  productLinkAttributeTypes: [
    'pim_catalog_product_link',
  ],

  // ──────────────────────────────────────────────
  // ASSET COLLECTION ATTRIBUTE TYPE
  // ──────────────────────────────────────────────
  assetCollectionAttributeType: 'pim_catalog_asset_collection',

  // ──────────────────────────────────────────────
  // BUSINESS CONTEXT — displayed in the dashboard header
  // ──────────────────────────────────────────────
  businessContext: {
    goal: 'Reduce Costs',
    outcome: 'Marketing Costs Saved',
    componentTitle: 'Marketing Costs Saved',
  },

  // ──────────────────────────────────────────────
  // METRIC DEFINITIONS
  // Each metric has: key, label, description, thresholds, valueAtRisk, valueDelivered
  //
  // Thresholds: red < amber < green (percentage boundaries)
  //   percentage < red             → RED traffic light
  //   percentage >= red && < green → AMBER
  //   percentage >= green          → GREEN
  // ──────────────────────────────────────────────
  metrics: {
    completeness: {
      key: 'completeness',
      label: '% of Products with 100% Completeness per Channel',
      description: 'What percentage of your products have achieved full completeness across each active channel?',
      thresholds: { red: 50, amber: 70, green: 90 },
      valueAtRisk:
        'You risk paying for clicks that lead to empty or low-quality product pages. Incomplete data is the primary cause of high bounce rates, throwing away performance marketing budget on non-converting traffic.',
      valueDelivered:
        'This ensures ad-spend efficiency. By only exporting products that are 100% complete, you prevent paying for clicks that lead to low-quality product pages.',
    },

    structuredAttributes: {
      key: 'structuredAttributes',
      label: '% of Attributes that are Structured Types',
      description: 'What proportion of your data model uses structured attribute types (dates, identifiers, measurements, numbers, selects, prices, reference entities, tables, booleans)?',
      thresholds: { red: 30, amber: 50, green: 70 },
      valueAtRisk:
        "Unstructured product data requires cleaning and formatting before it can be sent to marketplaces or social platforms. You risk a ‘data tax’ on every channel you try to integrate with.",
      valueDelivered:
        'Structured data reduces feed management costs. When attributes are standardized, there are reduced time-costs for reformatting data before they can be sent to marketplaces.',
    },

    associations: {
      key: 'associations',
      label: '% of Products with Product Link / Association Populated',
      description: 'What percentage of your products have at least one product association or product link defined?',
      thresholds: { red: 30, amber: 50, green: 70 },
      valueAtRisk:
        "Without associations, you risk a lower Average Order Value. You aren’t maximizing the value of the traffic you already have.",
      valueDelivered:
        'This drives organic upselling and cross-selling without additional ad spend, increasing your Average Order Value (AOV).',
    },

    assetCollections: {
      key: 'assetCollections',
      label: '% of Products with Asset Collection Attribute Populated',
      description: 'What percentage of your products have at least one asset collection attribute with content?',
      thresholds: { red: 50, amber: 80, green: 100 },
      valueAtRisk:
        "Products with sparse imagery suffer from significantly lower click-through rates because of the lack of ‘Visual Proof’.",
      valueDelivered:
        'Providing a rich, pre-organized asset collection directly in the PIM saves the marketing team from hunting for associated assets.',
    },

    assetFamilyTransformations: {
      key: 'assetFamilyTransformations',
      label: '% of Asset Families with Transformations or Product Link Rules',
      description: 'What percentage of your asset families have auto-transformations or product link rules configured?',
      thresholds: { red: 50, amber: 80, green: 100 },
      valueAtRisk:
        'Without auto-transformations, you risk paying for manual graphic design hours to resize and crop images for every different channel.',
      valueDelivered:
        'The PIM can automatically resize and reformat images for different social and web channels, bypassing the need for manual formatting for every new campaign.',
    },
  },
};
