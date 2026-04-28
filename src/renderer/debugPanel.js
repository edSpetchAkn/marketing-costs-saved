/**
 * debugPanel.js
 *
 * Collapsible debug panel — only rendered when CONFIG.debugMode is true.
 *
 * Shows:
 *   - Phase timings (fetch, calculate, render, total)
 *   - Raw counts (products sampled, attributes, asset families)
 *   - Per-channel completeness debug sections
 *   - Per-metric debugInfo for all 4 scalar metrics
 *   - Asset family fetch trace
 *   - CONFIG snapshot
 *   - "Copy Debug Data" button with execCommand fallback for iframe contexts
 *
 * REMINDER: Set CONFIG.debugMode = false before client handover.
 */

function copyToClipboard(text) {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
    } else {
      legacyCopy(text);
    }
  } catch (_) {
    legacyCopy(text);
  }
}

function legacyCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  Object.assign(ta.style, {
    position: 'fixed',
    top: '-9999px',
    left: '-9999px',
    opacity: '0',
    pointerEvents: 'none',
  });
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (_) {}
  document.body.removeChild(ta);
}

function renderSection(title, data) {
  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, {
    borderBottom: '1px solid #1e2030',
    paddingBottom: '10px',
    marginBottom: '10px',
  });

  const toggle = document.createElement('button');
  Object.assign(toggle.style, {
    background: 'none',
    border: 'none',
    color: '#8892a4',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '0',
    textAlign: 'left',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: 'inherit',
  });

  const arrow = document.createElement('span');
  arrow.textContent = '▶';
  Object.assign(arrow.style, {
    fontSize: '8px',
    display: 'inline-block',
    transition: 'transform 0.15s',
    color: '#4a5568',
  });

  const titleSpan = document.createElement('span');
  titleSpan.textContent = title;

  toggle.appendChild(arrow);
  toggle.appendChild(titleSpan);

  const content = document.createElement('pre');
  Object.assign(content.style, {
    display: 'none',
    marginTop: '8px',
    fontSize: '10px',
    color: '#d1d5db',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    lineHeight: '1.6',
    background: '#0d0d1a',
    padding: '10px',
    borderRadius: '3px',
    border: '1px solid #1e2030',
  });

  try {
    content.textContent = JSON.stringify(data, null, 2);
  } catch (_) {
    content.textContent = String(data);
  }

  toggle.addEventListener('click', () => {
    const open = content.style.display !== 'none';
    content.style.display = open ? 'none' : 'block';
    arrow.style.transform = open ? '' : 'rotate(90deg)';
  });

  wrapper.appendChild(toggle);
  wrapper.appendChild(content);
  return wrapper;
}

/**
 * Renders the full debug panel.
 *
 * @param {Object} opts
 * @param {Array}  opts.completenessResults        - Per-channel completeness result objects
 * @param {Array}  opts.scalarResults              - [structuredAttrs, associations, assetCollections, assetFamilyTransformations]
 * @param {Array}  opts.scalarKeys                 - Matching metric key strings for scalarResults
 * @param {Array}  opts.assetFamiliesFetchDebug    - Fetch trace strings from fetchAssetFamilyList
 * @param {number} opts.productCount               - Total products fetched
 * @param {number} opts.attributeCount             - Total attributes fetched
 * @param {number} opts.assetFamilyCount           - Total asset families fetched
 * @param {Object} opts.timings                    - { fetch, calculate, render, total } ms
 * @param {Object} opts.config                     - The CONFIG object
 * @returns {HTMLElement}
 */
export function renderDebugPanel({
  completenessResults,
  scalarResults,
  scalarKeys,
  assetFamiliesFetchDebug,
  productCount,
  attributeCount,
  assetFamilyCount,
  timings,
  config,
}) {
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    marginTop: '24px',
    background: '#11121e',
    border: '2px solid #D32F2F',
    borderRadius: '6px',
    fontFamily: '"Menlo", "Monaco", "Courier New", monospace',
    overflow: 'hidden',
  });

  // ── Panel header (acts as collapse toggle) ──
  const header = document.createElement('div');
  Object.assign(header.style, {
    background: '#D32F2F',
    padding: '9px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    userSelect: 'none',
  });

  const headerLabel = document.createElement('span');
  Object.assign(headerLabel.style, {
    color: '#fff',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.5px',
  });
  headerLabel.textContent = 'DEBUG PANEL — remove before client handover';

  const collapseBtn = document.createElement('span');
  Object.assign(collapseBtn.style, { color: '#ffffffcc', fontSize: '11px' });
  collapseBtn.textContent = '▼ Collapse';

  header.appendChild(headerLabel);
  header.appendChild(collapseBtn);

  // ── Panel body ──
  const body = document.createElement('div');
  Object.assign(body.style, { padding: '16px' });

  // Summary row
  const summary = document.createElement('div');
  Object.assign(summary.style, {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    marginBottom: '16px',
    padding: '10px 12px',
    background: '#0d0d1a',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#8892a4',
  });

  const summaryItems = [
    ['Products sampled', productCount.toLocaleString()],
    ['Attributes', attributeCount.toLocaleString()],
    ['Asset families', assetFamilyCount.toLocaleString()],
    ['Fetch', `${timings.fetch ?? '?'}ms`],
    ['Calculate', `${timings.calculate ?? '?'}ms`],
    ['Render', `${timings.render ?? '?'}ms`],
    ['Total', `${timings.total ?? '?'}ms`],
  ];

  for (const [key, val] of summaryItems) {
    const item = document.createElement('div');
    item.innerHTML =
      `<span style="color:#4a5568">${key}:</span>` +
      ` <span style="color:#e2e8f0;font-weight:600">${val}</span>`;
    summary.appendChild(item);
  }
  body.appendChild(summary);

  // Per-channel completeness sections
  for (const r of completenessResults) {
    const pct = r.percentage !== null ? `${r.percentage}%` : 'N/A';
    body.appendChild(renderSection(`completeness [${r.channelCode}] — ${pct}`, r.debugInfo));
  }

  // Scalar metric sections
  for (let i = 0; i < scalarResults.length; i++) {
    const result = scalarResults[i];
    const key = scalarKeys[i];
    const pct = result.percentage !== null ? `${result.percentage}%` : 'N/A';
    body.appendChild(renderSection(`${key} — ${pct}`, result.debugInfo));
  }

  // Asset family fetch trace
  body.appendChild(renderSection('assetFamilies fetch trace', assetFamiliesFetchDebug));

  // CONFIG snapshot
  body.appendChild(renderSection('CONFIG snapshot', {
    debugMode: config.debugMode,
    api: config.api,
    thresholds: Object.fromEntries(
      Object.entries(config.metrics).map(([k, m]) => [k, m.thresholds])
    ),
    structuredAttributeTypes: config.structuredAttributeTypes,
    productLinkAttributeTypes: config.productLinkAttributeTypes,
    assetCollectionAttributeType: config.assetCollectionAttributeType,
  }));

  // Copy debug data button
  const copyBtn = document.createElement('button');
  Object.assign(copyBtn.style, {
    marginTop: '14px',
    padding: '7px 14px',
    background: '#1e2030',
    color: '#8892a4',
    border: '1px solid #2d3348',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'color 0.15s',
  });
  copyBtn.textContent = 'Copy Debug Data';

  copyBtn.addEventListener('click', () => {
    const debugData = {
      timestamp: new Date().toISOString(),
      summary: { productCount, attributeCount, assetFamilyCount, timings },
      completeness: completenessResults,
      metrics: Object.fromEntries(scalarKeys.map((k, i) => [k, scalarResults[i]])),
      assetFamiliesFetchDebug,
    };
    copyToClipboard(JSON.stringify(debugData, null, 2));
    copyBtn.textContent = 'Copied!';
    copyBtn.style.color = '#388E3C';
    setTimeout(() => {
      copyBtn.textContent = 'Copy Debug Data';
      copyBtn.style.color = '#8892a4';
    }, 2000);
  });

  body.appendChild(copyBtn);

  panel.appendChild(header);
  panel.appendChild(body);

  // Collapse / expand toggle
  let collapsed = false;
  header.addEventListener('click', () => {
    collapsed = !collapsed;
    body.style.display = collapsed ? 'none' : 'block';
    collapseBtn.textContent = collapsed ? '▶ Expand' : '▼ Collapse';
  });

  return panel;
}
