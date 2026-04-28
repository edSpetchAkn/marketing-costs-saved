# Marketing Costs Saved

An Akeneo PIM Custom Component (UI Extension) that calculates 5 PIM data maturity metrics and presents them with traffic-light indicators and value narratives. Designed to communicate to enrichment teams, PIM managers, and marketing leads how feature adoption reduces marketing operational costs.

**Position:** `pim.activity.navigation.tab`
**Type:** `sdk_script` (vanilla JS, no framework)

---

## Business Context

| Layer | Value |
|---|---|
| Business Goal | Reduce Costs |
| Business Outcome | Marketing Costs Saved |

---

## Metrics Reference

### 1 — % of Products with 100% Completeness per Channel

**What it measures:** The percentage of sampled products that have achieved 100% completeness within each active channel. Returns one card per channel, discovered dynamically from product completeness data.

**How it's calculated:** Products are fetched with `withCompletenesses: true`. For each channel, the component counts how many products have a completeness value of `>= 100` for that channel. Channels are derived from the completeness data itself — no separate channel API call is needed.

**API source:** `PIM.api.product_uuid_v1.list({ withCompletenesses: true })`

**Thresholds:** Red < 50% | Amber 50–89% | Green ≥ 90%

**Value at Risk:** You risk paying for clicks that lead to empty or low-quality product pages. Incomplete data is the primary cause of high bounce rates, throwing away performance marketing budget on non-converting traffic.

**Value Delivered:** This ensures ad-spend efficiency. By only exporting products that are 100% complete, you prevent paying for clicks that lead to low-quality product pages.

---

### 2 — % of Attributes that are Structured Types

**What it measures:** The proportion of the PIM's attribute schema that uses discrete, structured attribute types. This is an instance-level metric — it measures the data model, not individual products.

**How it's calculated:** All attributes are fetched. Each attribute's `type` is compared against the `structuredAttributeTypes` list in CONFIG. Structured count / total attributes × 100.

**API source:** `PIM.api.attribute_v1.list()`

**Structured types counted:** `pim_catalog_date`, `pim_catalog_identifier`, `pim_catalog_metric`, `pim_catalog_multiselect`, `pim_catalog_number`, `pim_catalog_price_collection`, `akeneo_reference_entity_collection`, `akeneo_reference_entity`, `pim_catalog_simpleselect`, `pim_catalog_table`, `pim_catalog_boolean`

**Thresholds:** Red < 30% | Amber 30–69% | Green ≥ 70%

**Value at Risk:** Unstructured product data requires cleaning and formatting before it can be sent to marketplaces or social platforms. A 'data tax' on every channel integration.

**Value Delivered:** Structured data reduces feed management costs — less reformatting time before syndication.

---

### 3 — % of Products with Product Link / Association Populated

**What it measures:** The percentage of products with at least one product relationship defined. Checks both legacy associations and the newer `pim_catalog_product_link` attribute type.

**How it's calculated:** Two mechanisms are checked independently and the product passes if either has data:

- **Mechanism A (legacy associations):** Checks `product.associations[typeCode].products` and `.product_models` arrays for any non-empty entry.
- **Mechanism B (product link attributes):** Discovers attributes of type `pim_catalog_product_link`, then checks if any have a non-empty value in `product.values`.

**API source:** `PIM.api.product_uuid_v1.list()` + `PIM.api.attribute_v1.list()`

**Thresholds:** Red < 30% | Amber 30–69% | Green ≥ 70%

**Value at Risk:** Without associations, you risk a lower Average Order Value — not maximizing the value of existing traffic.

**Value Delivered:** Drives organic upselling and cross-selling without additional ad spend, increasing AOV.

---

### 4 — % of Products with Asset Collection Attribute Populated

**What it measures:** The percentage of products with at least one asset collection attribute containing linked assets.

**How it's calculated:** All `pim_catalog_asset_collection` attributes are discovered from the attribute list. For each product, `values[assetAttrCode]` entries are checked for non-empty `data` arrays. Returns N/A if no asset collection attributes exist in the instance.

**API source:** `PIM.api.product_uuid_v1.list()` + `PIM.api.attribute_v1.list()`

**Thresholds:** Red < 50% | Amber 50–99% | Green = 100% _(aspirational target — most instances will be amber)_

**Value at Risk:** Products with sparse imagery suffer from lower click-through rates because of the lack of Visual Proof.

**Value Delivered:** Pre-organized asset collections in the PIM save marketing teams from hunting for assets.

---

### 5 — % of Asset Families with Transformations or Product Link Rules

**What it measures:** The percentage of asset families that have at least one auto-transformation or product link rule configured.

**How it's calculated:** Asset families are fetched. Each family's `transformations` and `product_link_rules` arrays are checked. A family passes if either array has at least one entry. Falls back silently to false for both flags if the API does not expose those fields (caveat shown in UI).

**API source:** `PIM.api.asset_family_v1.list()` with REST fallback to `/api/rest/v1/asset-families`

**Thresholds:** Red < 50% | Amber 50–99% | Green = 100% _(aspirational target)_

**Value at Risk:** Without auto-transformations, manual graphic design hours are required to resize and crop images per channel.

**Value Delivered:** The PIM can automatically resize and reformat images for different social and web channels, eliminating manual formatting per campaign.

---

## Configuration Guide

All configuration lives in [src/config.js](src/config.js).

| Key | Description | Change per client? |
|---|---|---|
| `debugMode` | `true` shows the debug panel. Set to `false` before handover. | **[PER-CLIENT]** |
| `api.sampleMaxProducts` | Hard ceiling on product sample. Default 1000. | **[PER-CLIENT]** — increase if instance has small catalogue |
| `api.samplePageSize` | Products per API page. Akeneo max is 100. | **[FRAMEWORK]** — do not change |
| `api.maxAssetFamilyPages` | Pages to fetch for asset families. Default 10 (= up to 1000 families). | **[PER-CLIENT]** — increase for large asset catalogues |
| `structuredAttributeTypes` | Array of type codes treated as structured. | **[VERSION-DEPENDENT]** — add types introduced in newer Akeneo releases |
| `productLinkAttributeTypes` | Array of product link type codes. Currently `['pim_catalog_product_link']`. | **[VERSION-DEPENDENT]** |
| `assetCollectionAttributeType` | String type code for asset collections. | **[FRAMEWORK]** — do not change |
| `businessContext` | Header copy. | **[PER-CLIENT]** — optional cosmetic change |
| `metrics[key].thresholds` | Red/amber/green percentage boundaries. | **[PER-CLIENT]** — adjust to engagement context |
| `metrics[key].valueAtRisk` | Narrative shown when red or amber. | **[PER-CLIENT]** — optional tailoring |
| `metrics[key].valueDelivered` | Narrative shown when green. | **[PER-CLIENT]** — optional tailoring |

---

## Deployment Steps

1. Set `CONFIG.debugMode = false` in [src/config.js](src/config.js)
2. Build: `npm run build` — produces `dist/marketing-costs-saved.js`
3. Fill in `.env` with the target PIM credentials (see `.env` file for keys)
4. Upload: `make upload`
   - First run: creates the extension and saves the UUID to `.env`
   - Subsequent runs: updates the existing extension using the saved UUID
5. In the PIM, navigate to Activity → confirm the tab appears

**Important:** Always use `POST /{uuid}` (not `PATCH`) for updates. The `upload.sh` script handles this correctly.

---

## Debug Mode

Set `CONFIG.debugMode = true` to enable the debug panel. It appears at the bottom of the dashboard and shows:

- Phase timings (fetch, calculate, render, total in ms)
- Products sampled / attributes count / asset families count
- Per-channel completeness raw results
- Raw `debugInfo` for each of the 4 scalar metrics
- Asset family fetch trace (SDK vs REST path, page counts)
- Full CONFIG snapshot

Set to `false` before any client-facing deployment.

---

## Known Limitations

- **Product sample ceiling:** Completeness and product-level metrics (Metrics 1, 3, 4) are calculated from a sample of up to `sampleMaxProducts` products. On large catalogues the result is statistically representative but not exact. The UI displays a caveat when the sample ceiling is reached.
- **Asset family transformation field availability:** The `transformations` and `product_link_rules` fields on asset families may not be returned by the API on all Akeneo versions. If absent, `hasTransformations` and `hasProductLinkRules` both default to `false`, making Metric 5 show 0% rather than N/A. Verify on a live Serenity instance before presenting results.
- **Asset collection N/A:** If the PIM instance has no `pim_catalog_asset_collection` attributes at all, Metric 4 returns N/A rather than 0%. This is intentional — the metric is not applicable, not failing.
- **Green threshold at 100% for Metrics 4 and 5:** These are aspirational targets. Most clients will show amber or red. This is intentional for the value narrative framing.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "PIM SDK not available" error | Component loaded outside PIM iframe | Deploy and test inside the PIM UI |
| All products show 0% completeness | `withCompletenesses` not returning data | Check that the API user has completeness permissions |
| Metric 3 caveat: "based on associations only" | No `pim_catalog_product_link` attributes exist | Expected — check if the client uses this feature |
| Metric 4 shows N/A | No asset collection attributes in the instance | Expected — the client has not set up DAM integration |
| Metric 5 shows 0% unexpectedly | `transformations` field not in API response | Verify on the instance; may require Akeneo version check |
| Build fails with syntax error | Apostrophe or quote character in a single-quoted string in config.js | Switch affected strings to double quotes |
| Upload returns 401 | Token expired or wrong credentials | Refill `.env` and run `make upload` again |
| Upload returns 422 | Duplicate extension name | Check if extension already exists under a different UUID |
