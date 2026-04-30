/**
 * dashboard.js
 *
 * Two-phase dashboard renderer for Marketing Costs Saved.
 *
 * Phase 1 — renderShell: header + family dropdown + empty metrics area.
 * Phase 2 — renderMetrics / renderMetricsLoading: fills the metrics area.
 *
 * renderLoading / renderError handle full-container states during Phase 1.
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

function getFamilyLabel(family, locale) {
  if (!family.labels) return family.code;
  return family.labels[locale] || family.labels['en_US'] || family.code;
}

function renderSectionBlock(title, cards) {
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
  Object.assign(detail.style, { fontSize: '13px', color: '#67768a', lineHeight: '1.5' });
  detail.textContent = message;

  box.appendChild(title);
  box.appendChild(detail);
  container.appendChild(box);
}

/**
 * Renders the static shell: header, family dropdown, empty metrics area.
 * Returns { metricsArea, defaultFamilyCode }.
 */
export function renderShell(container, { families, userLocale, config, onFamilyChange }) {
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
    marginBottom: '16px',
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
  });
  subtitle.textContent =
    "These metrics measure your PIM's readiness to reduce marketing operational costs " +
    'through automation, structured data, and rich media management.';

  header.appendChild(breadcrumb);
  header.appendChild(title);
  header.appendChild(subtitle);
  wrapper.appendChild(header);

  // ── Family filter row ──
  const sorted = [...families].sort((a, b) =>
    getFamilyLabel(a, userLocale).localeCompare(getFamilyLabel(b, userLocale))
  );

  const filterRow = document.createElement('div');
  Object.assign(filterRow.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    padding: '12px 16px',
    background: '#f5f7fb',
    border: '1px solid #e8ebf0',
    borderRadius: '6px',
  });

  const filterLabel = document.createElement('label');
  filterLabel.htmlFor = 'mcs-family-select';
  Object.assign(filterLabel.style, {
    fontSize: '12px',
    fontWeight: '700',
    color: '#67768a',
    whiteSpace: 'nowrap',
  });
  filterLabel.textContent = 'Product family:';

  const select = document.createElement('select');
  select.id = 'mcs-family-select';
  Object.assign(select.style, {
    fontSize: '13px',
    color: '#11324d',
    background: '#ffffff',
    border: '1px solid #d8dce6',
    borderRadius: '4px',
    padding: '5px 10px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    minWidth: '220px',
  });

  for (const family of sorted) {
    const opt = document.createElement('option');
    opt.value = family.code;
    opt.textContent = getFamilyLabel(family, userLocale);
    select.appendChild(opt);
  }

  const noneOpt = document.createElement('option');
  noneOpt.value = '__none__';
  noneOpt.textContent = '(No family)';
  select.appendChild(noneOpt);

  select.addEventListener('change', () => onFamilyChange(select.value));

  filterRow.appendChild(filterLabel);
  filterRow.appendChild(select);
  wrapper.appendChild(filterRow);

  const metricsArea = document.createElement('div');
  wrapper.appendChild(metricsArea);

  container.appendChild(wrapper);

  const defaultFamilyCode = sorted.length > 0 ? sorted[0].code : '__none__';
  return { metricsArea, defaultFamilyCode };
}

export function renderMetricsLoading(metricsArea) {
  metricsArea.innerHTML = '';

  const wrap = document.createElement('div');
  Object.assign(wrap.style, {
    padding: '24px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#67768a',
    fontSize: '13px',
  });

  const spinner = document.createElement('div');
  Object.assign(spinner.style, {
    width: '16px',
    height: '16px',
    border: '2px solid #e8ebf0',
    borderTopColor: '#9452ba',
    borderRadius: '50%',
    flexShrink: '0',
    animation: 'mcs-spin 0.8s linear infinite',
  });

  wrap.appendChild(spinner);
  wrap.appendChild(document.createTextNode('Loading products…'));
  metricsArea.appendChild(wrap);
}

export function renderMetricsError(metricsArea, message) {
  metricsArea.innerHTML = '';

  const box = document.createElement('div');
  Object.assign(box.style, {
    marginTop: '8px',
    padding: '16px',
    background: '#fdf3f2',
    border: '1px solid #D32F2F44',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#67768a',
    lineHeight: '1.5',
  });
  box.textContent = `Failed to load products: ${message}`;
  metricsArea.appendChild(box);
}

/**
 * Renders metric sections and optional debug panel into the metrics area.
 */
export function renderMetrics(metricsArea, {
  completenessResults,
  structuredAttributesResult,
  associationsResult,
  assetCollectionsResult,
  assetFamilyTransformationsResult,
  assetFamiliesFetchDebug,
  productCount,
  familyLabel,
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
  metricsArea.innerHTML = '';

  // ── Product count badge ──
  const badge = document.createElement('div');
  Object.assign(badge.style, {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    background: '#f5f7fb',
    border: '1px solid #e8ebf0',
    borderRadius: '12px',
    fontSize: '11px',
    color: '#67768a',
    marginBottom: '20px',
  });
  badge.textContent = productCount > 0
    ? `${productCount.toLocaleString()} products — ${familyLabel}`
    : `No products found in ${familyLabel}`;
  metricsArea.appendChild(badge);

  // ── Section 1: Completeness by channel ──
  if (showCompleteness && completenessResults.length > 0) {
    const completenessCards = completenessResults.map((r) =>
      renderMetricCard(r, 'completeness', config, `Channel: ${r.channelCode}`)
    );
    metricsArea.appendChild(renderSectionBlock('Completeness at 100% — by channel', completenessCards));
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
    metricsArea.appendChild(renderSectionBlock('Data Model & Asset Management', section2Cards));
  }

  // ── Footer ──
  const footer = document.createElement('div');
  Object.assign(footer.style, {
    marginTop: '8px',
    fontSize: '11px',
    color: '#8e9aaa',
    lineHeight: '1.6',
  });
  footer.textContent = `Metrics calculated at ${new Date().toLocaleTimeString()}.`;
  metricsArea.appendChild(footer);

  // ── Debug panel ──
  if (config.debugMode) {
    const scalarKeys = ['structuredAttributes', 'associations', 'assetCollections', 'assetFamilyTransformations'];
    const scalarResults = [
      structuredAttributesResult,
      associationsResult,
      assetCollectionsResult,
      assetFamilyTransformationsResult,
    ];
    metricsArea.appendChild(renderDebugPanel({
      completenessResults,
      scalarResults,
      scalarKeys,
      assetFamiliesFetchDebug,
      productCount,
      attributeCount,
      assetFamilyCount,
      timings,
      config,
    }));
  }
}
