/**
 * dashboard.js
 *
 * Main dashboard layout renderer for the Marketing Costs Saved component.
 *
 * Layout:
 *   Section 1 — Completeness at 100% (one card per active channel)
 *   Section 2 — Data model & asset management (4 scalar metric cards)
 *   Footer    — Sample size notice + timestamp
 *   Debug     — Collapsible debug panel (CONFIG.debugMode only)
 *
 * Exports:
 *   renderLoading(container)
 *   renderError(container, message)
 *   renderDashboard(container, opts)
 */

import { renderMetricCard } from './metricCard.js';
import { renderDebugPanel } from './debugPanel.js';

function ensureGlobalStyles() {
  if (document.getElementById('mcs-styles')) return;
  const style = document.createElement('style');
  style.id = 'mcs-styles';
  style.textContent = `
    @keyframes mcs-spin {
      to { transform: rotate(360deg); }
    }
    @media (max-width: 768px) {
      .mcs-grid { grid-template-columns: 1fr !important; }
    }
  `;
  document.head.appendChild(style);
}

/**
 * @param {HTMLElement} container
 */
export function renderLoading(container) {
  ensureGlobalStyles();
  container.innerHTML = '';

  const wrap = document.createElement('div');
  Object.assign(wrap.style, {
    padding: '32px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#67768a',
    fontSize: '14px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  });

  const spinner = document.createElement('div');
  Object.assign(spinner.style, {
    width: '18px',
    height: '18px',
    border: '2px solid #e8ebf0',
    borderTopColor: '#9452ba',
    borderRadius: '50%',
    flexShrink: '0',
    animation: 'mcs-spin 0.8s linear infinite',
  });

  wrap.appendChild(spinner);
  wrap.appendChild(document.createTextNode('Loading Marketing Costs Saved…'));
  container.appendChild(wrap);
}

/**
 * @param {HTMLElement} container
 * @param {string}      message
 */
export function renderError(container, message) {
  container.innerHTML = '';

  const box = document.createElement('div');
  Object.assign(box.style, {
    margin: '24px',
    padding: '20px',
    background: '#fdf3f2',
    border: '1px solid #D32F2F44',
    borderRadius: '6px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  });

  const title = document.createElement('div');
  Object.assign(title.style, {
    fontSize: '14px',
    fontWeight: '700',
    color: '#D32F2F',
    marginBottom: '6px',
  });
  title.textContent = 'Marketing Costs Saved — Error';

  const detail = document.createElement('div');
  Object.assign(detail.style, {
    fontSize: '13px',
    color: '#67768a',
    lineHeight: '1.5',
  });
  detail.textContent = message;

  box.appendChild(title);
  box.appendChild(detail);
  container.appendChild(box);
}

/**
 * Renders a labelled section with a grid of metric cards.
 *
 * @param {string}         title
 * @param {HTMLElement[]}  cards
 * @returns {HTMLElement}
 */
function renderSection(title, cards) {
  const section = document.createElement('div');
  Object.assign(section.style, { marginBottom: '28px' });

  const heading = document.createElement('h3');
  Object.assign(heading.style, {
    margin: '0 0 12px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#11324d',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  });
  heading.textContent = title;

  const grid = document.createElement('div');
  grid.className = 'mcs-grid';
  Object.assign(grid.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  });

  for (const card of cards) grid.appendChild(card);

  section.appendChild(heading);
  section.appendChild(grid);
  return section;
}

/**
 * Renders the full Marketing Costs Saved dashboard.
 *
 * @param {HTMLElement} container
 * @param {Object} opts
 * @param {Array}  opts.completenessResults        - Per-channel completeness result objects
 * @param {Object} opts.structuredAttributesResult
 * @param {Object} opts.associationsResult
 * @param {Object} opts.assetCollectionsResult
 * @param {Object} opts.assetFamilyTransformationsResult
 * @param {Array}  opts.assetFamiliesFetchDebug    - Fetch trace strings
 * @param {number} opts.productCount               - Products in sample
 * @param {number} opts.attributeCount             - Attributes fetched
 * @param {number} opts.assetFamilyCount           - Asset families fetched
 * @param {boolean} opts.showCompleteness
 * @param {boolean} opts.showStructuredAttributes
 * @param {boolean} opts.showAssociations
 * @param {boolean} opts.showAssetCollections
 * @param {boolean} opts.showAssetFamilyTransformations
 * @param {Object} opts.timings                    - { fetch, calculate, render, total } ms
 * @param {Object} opts.config                     - The CONFIG object
 */
export function renderDashboard(container, {
  completenessResults,
  structuredAttributesResult,
  associationsResult,
  assetCollectionsResult,
  assetFamilyTransformationsResult,
  assetFamiliesFetchDebug,
  productCount,
  attributeCount,
  assetFamilyCount,
  showCompleteness = true,
  showStructuredAttributes = true,
  showAssociations = true,
  showAssetCollections = true,
  showAssetFamilyTransformations = true,
  timings,
  config,
}) {
  ensureGlobalStyles();
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, {
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#11324d',
    maxWidth: '1100px',
    boxSizing: 'border-box',
  });

  // ── Header ──
  const header = document.createElement('div');
  Object.assign(header.style, {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '2px solid #f0f2f5',
  });

  const breadcrumb = document.createElement('div');
  Object.assign(breadcrumb.style, {
    fontSize: '11px',
    fontWeight: '700',
    color: '#9452ba',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
    marginBottom: '6px',
  });
  breadcrumb.textContent = `${config.businessContext.goal} › ${config.businessContext.outcome}`;

  const title = document.createElement('h2');
  Object.assign(title.style, {
    margin: '0 0 10px',
    fontSize: '22px',
    fontWeight: '700',
    color: '#11324d',
    letterSpacing: '-0.3px',
  });
  title.textContent = config.businessContext.componentTitle;

  const subtitle = document.createElement('div');
  Object.assign(subtitle.style, {
    fontSize: '13px',
    color: '#67768a',
    lineHeight: '1.6',
    maxWidth: '680px',
    marginBottom: '14px',
  });
  subtitle.textContent =
    "These metrics measure your PIM’s readiness to reduce marketing operational costs " +
    'through automation, structured data, and rich media management.';

  const isSample = productCount >= config.api.sampleMaxProducts;
  const sampleNotice = document.createElement('div');
  Object.assign(sampleNotice.style, {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    background: '#f5f7fb',
    border: '1px solid #e8ebf0',
    borderRadius: '12px',
    fontSize: '11px',
    color: '#67768a',
  });
  sampleNotice.textContent = isSample
    ? `Based on a sample of ${productCount.toLocaleString()} products (catalogue may be larger)`
    : `Based on all ${productCount.toLocaleString()} products`;

  header.appendChild(breadcrumb);
  header.appendChild(title);
  header.appendChild(subtitle);
  header.appendChild(sampleNotice);
  wrapper.appendChild(header);

  // ── Section 1: Completeness by channel ──
  if (showCompleteness && completenessResults.length > 0) {
    const completenessCards = completenessResults.map((r) =>
      renderMetricCard(r, 'completeness', config, `Channel: ${r.channelCode}`)
    );
    wrapper.appendChild(renderSection('Completeness at 100% — by channel', completenessCards));
  }

  // ── Section 2: Data model & asset management ──
  const section2Cards = [];
  if (showStructuredAttributes) {
    section2Cards.push(renderMetricCard(structuredAttributesResult, 'structuredAttributes', config));
  }
  if (showAssociations) {
    section2Cards.push(renderMetricCard(associationsResult, 'associations', config));
  }
  if (showAssetCollections) {
    section2Cards.push(renderMetricCard(assetCollectionsResult, 'assetCollections', config));
  }
  if (showAssetFamilyTransformations) {
    section2Cards.push(renderMetricCard(assetFamilyTransformationsResult, 'assetFamilyTransformations', config));
  }

  if (section2Cards.length > 0) {
    wrapper.appendChild(renderSection('Data Model & Asset Management', section2Cards));
  }

  // ── Footer ──
  const footer = document.createElement('div');
  Object.assign(footer.style, {
    marginTop: '8px',
    fontSize: '11px',
    color: '#8e9aaa',
    lineHeight: '1.6',
  });
  footer.textContent =
    `Metrics calculated at ${new Date().toLocaleTimeString()}. ` +
    `Completeness and product-level metrics are based on a sample of up to ` +
    `${config.api.sampleMaxProducts.toLocaleString()} products and may not represent the full catalogue.`;
  wrapper.appendChild(footer);

  // ── Debug panel (debugMode only) ──
  if (config.debugMode) {
    const scalarKeys = ['structuredAttributes', 'associations', 'assetCollections', 'assetFamilyTransformations'];
    const scalarResults = [
      structuredAttributesResult,
      associationsResult,
      assetCollectionsResult,
      assetFamilyTransformationsResult,
    ];
    wrapper.appendChild(
      renderDebugPanel({
        completenessResults,
        scalarResults,
        scalarKeys,
        assetFamiliesFetchDebug,
        productCount,
        attributeCount,
        assetFamilyCount,
        timings,
        config,
      })
    );
  }

  container.appendChild(wrapper);
}
