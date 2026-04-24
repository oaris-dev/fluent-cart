# Upstream Proposal #25: Product Editor Custom Fields Filter

> **Consumer plugin:** any FluentCart extension plugin needing to persist custom per-variant metadata in `other_info` (e.g. per-variant unit pricing, delivery-time strings, subscription/access flags, etc.).
> **Priority:** Medium *(lowered from High — see History)*
> **FluentCart Version:** 1.3.22 *(upstream/master tip; re-audited — targets at [api/Resource/ProductVariationResource.php:101,228](../../../api/Resource/ProductVariationResource.php#L101) unchanged)*
> **Status:** Part A **submitted** upstream as [fluent-cart/fluent-cart#41](https://github.com/fluent-cart/fluent-cart/pull/41); Part B still Discussion-first, not filed yet.

## History

- **1.3.10 draft** proposed a single new PHP filter (`fluent_cart/product_editor_custom_fields`) that would be serialized over REST and consumed by the Vue editor. That design pre-dated FluentCart's `window.fluentCartAdminHooks` registry, which changes the right shape of the ask.
- **1.3.15 re-audit** split the proposal into Part A (PHP `Arr::only()` whitelist filter — PR-ready) and Part B (JS variant-editor hook — Discussion-first), aligning Part B with the `fluentCartAdminHooks` / `fluent_cart_product_pricing_actions_dropdown_items` precedent.
- **1.3.19 re-audit (Apr 20, 2026)** — upstream expanded the `Arr::only()` whitelist by 6 keys to support packaging/weight (`package_slug`, `weight`, `weight_unit`, `length`, `width`, `height`), without adding a filter. That's the third manual whitelist patch in two releases and strengthens the case for Part A. Part A submitted upstream as [#41](https://github.com/fluent-cart/fluent-cart/pull/41) with 1.3.19 defaults. Vue variant editor rewritten in 1.3.19 (~11 new components in `resources/admin/Modules/Products/parts/`); Part B injection point and field-schema decisions should be made against the new editor, not the `FormOld` fallback.

## Problem Statement

FluentCart's Vue product editor renders a fixed set of per-variant `other_info` fields and gives plugins no way to register additional ones. Plugins that legitimately need to persist per-variant metadata — such as a German-compliance plugin carrying Lieferzeit (delivery-time statement; § 312j Abs. 2 BGB), Grundpreis (unit-price-per-unit disclosure; § 2 PAngV), and a per-variant digital-content waiver flag — must either inject DOM hacks into the built JS bundle (fragile across updates) or fall back to a WordPress meta box outside the SPA (inconsistent UX).

Closing this gap has *two* distinct parts:

1. **Server side** — a filter on the `Arr::only()` whitelist in `ProductVariationResource`, or plugin-registered keys are silently stripped on save.
2. **Client side** — a JS filter invoked from the variant editor, so plugins can register field definitions via `window.fluentCartAdminHooks.addFilter(...)` — matching the existing pattern FluentCart already uses for `fluent_cart_product_pricing_actions_dropdown_items`.

The two pieces are independent: either is useful alone for a subset of use cases, but the combination is what makes a full custom-field story work end-to-end.

## Current Architecture (1.3.19)

### Server side — `Arr::only()` silently strips unknown keys

**File:** `api/Resource/ProductVariationResource.php`

Both `create()` and `update()` whitelist `other_info` keys for `payment_type === 'onetime'`:

```php
// create() — line 101:
if (Arr::get($otherInfo, 'payment_type') == 'onetime') {
    $otherInfo = Arr::only($otherInfo, [
        'payment_type',
        'description',
        'package_slug',    // added in 1.3.19 for packaging support
        'weight',          // added in 1.3.19
        'weight_unit',     // added in 1.3.19
        'length',          // added in 1.3.19
        'width',           // added in 1.3.19
        'height',          // added in 1.3.19
    ]);
}

// update() — line 243:
if (Arr::get($otherInfo, 'payment_type') == 'onetime') {
    $otherInfo = Arr::only($otherInfo, [
        'payment_type',
        'description',
        'bundle_child_ids',
        'package_slug',    // added in 1.3.19
        'weight',          // added in 1.3.19
        'weight_unit',     // added in 1.3.19
        'length',          // added in 1.3.19
        'width',           // added in 1.3.19
        'height',          // added in 1.3.19
    ]);
}
```

`update()` does fetch `$existingOtherInfo` beforehand, but only cherry-picks `is_bundle_product` and `bundle_child_ids` back in (lines 267–268). All other unknown keys are dropped on every save. The create/update asymmetry is preserved in 1.3.19: `bundle_child_ids` is only present in `update()`'s default whitelist.

**File:** `app/Http/Requests/ProductVariationRequest.php`

`sanitize()` lists only known keys. Unknown `other_info.*` keys *pass through* the RequestGuard (no sanitization rules apply to them), only to be stripped at the Resource layer.

### Client side — a hook registry exists, but no variant-editor custom-fields hook yet

**File:** `resources/admin/admin_hooks.js`

FluentCart initialises a `wp.hooks` instance before the admin SPA boots:

```js
const hooks = window.wp.hooks.createHooks();
window.fluentCartAdminHooks = hooks;
window.fluent_cart_admin = { hooks };
```

**File:** `resources/admin/Modules/Products/parts/ProductPricingActions.vue` (lines 44, 47, 86 in 1.3.19)

The admin app *already* uses this registry to make the per-variant pricing-actions dropdown extensible. 1.3.19 hardened the lookup with a defensive fallback:

```js
const hooks = window?.fluent_cart_admin?.hooks || window?.fluentCartAdminHooks;
const items = hooks?.applyFilters?.(
    'fluent_cart_product_pricing_actions_dropdown_items',
    [],
    variant
);
// …
hooks?.applyFilters?.(
    'fluent_cart_product_pricing_actions_dropdown_command',
    command,
    variant
);
```

This is the precedent a new "custom-fields" hook should follow. There is **no** equivalent hook yet for *inline* field injection in the variant editor form — and the 1.3.19 editor rewrite adds ~11 new components under `resources/admin/Modules/Products/parts/` (e.g. `VariantPrice.vue`, `PhysicalAttributes.vue`, `VariantInventory.vue`) that would be the natural injection points for Part B.

## Proposed Changes

### Part A — Server: filter the `Arr::only()` whitelist *(submitted as [PR #41](https://github.com/fluent-cart/fluent-cart/pull/41))*

**File:** `api/Resource/ProductVariationResource.php`

A single filter, applied identically in `create()` and `update()`, preserving each call site's 1.3.19 default array:

```php
// create():
if (Arr::get($otherInfo, 'payment_type') == 'onetime') {
    $allowedKeys = apply_filters(
        'fluent_cart/product_variation_other_info_keys',
        [
            'payment_type', 'description',
            'package_slug', 'weight', 'weight_unit',
            'length', 'width', 'height',
        ],
        $variant,
        false // $isUpdate
    );
    $otherInfo = Arr::only($otherInfo, $allowedKeys);
}
```

`update()` wraps its 9-key default identically, with `$isUpdate = true`.

Plugins register persistent keys:

```php
add_filter('fluent_cart/product_variation_other_info_keys', function ($keys, $variant, $isUpdate) {
    return array_merge($keys, [
        'customplugin_delivery_time',
        'customplugin_grundpreis_unit',
        'customplugin_grundpreis_amount',
    ]);
}, 10, 3);
```

**Backward compatibility:** default return values match the 1.3.19 hard-coded arrays exactly in each call site; behaviour is unchanged without hooks. The create/update asymmetry is preserved (8 keys vs 9 keys — `bundle_child_ids` is `update()`-only); normalising the two defaults is explicitly out of scope for this PR.

**Part A is small and self-contained.** It can ship as a standalone PR without committing to any UI design. Even without Part B, it unblocks plugins that populate `other_info` via REST directly or from a meta box.

### Part B — Client: variant-editor custom-fields hook *(Discussion first)*

**File:** Vue component that renders the variant editor form (`resources/admin/Modules/Products/…`)

Introduce a JS filter callable by plugins from their own admin-app bundle (or a small loader script enqueued on the product-editor page):

```js
const customFields = window.fluentCartAdminHooks.applyFilters(
    'fluent_cart_variant_editor_custom_fields',
    [],
    variant // the reactive variant model
);
```

Render each returned field inline after the native `other_info` section, with each field's `key` driving `v-model="variant.other_info[key]"`.

**Field definition shape — draft, needs upstream design input:**

```js
{
    key: 'customplugin_delivery_time',             // persists at variant.other_info[key]
    type: 'select',                            // text | number | select | checkbox | textarea
    label: 'Lieferzeit',
    placeholder: 'z.B. 2–4 Werktage',
    options: { '1-3': '1–3 Werktage', /* … */ },
    default: '',
    group: 'compliance',                       // optional grouping
    help: 'Required for German shops (§ 312j Abs. 2 BGB)',
    priority: 10                               // render order within the section
}
```

**Plugin registration:**

```js
window.fluentCartAdminHooks.addFilter(
    'fluent_cart_variant_editor_custom_fields',
    'custom-plugin/lieferzeit-grundpreis',
    (fields, variant) => {
        fields.push({ key: 'customplugin_delivery_time', type: 'select', /* … */ });
        fields.push({ key: 'customplugin_grundpreis_amount', type: 'number', /* … */ });
        return fields;
    }
);
```

**Why this needs a Discussion, not a PR:**

- The exact injection point in the Vue tree (which file, which slot) is a call for the upstream maintainers.
- The schema shape (above) is a first draft; in particular, conditional visibility (`dependsOn`), i18n, and validation integration all want input from the FluentCart side before anything is merged.
- Whether the hook fires once at mount vs reactively on every variant change has performance implications.

**Server-side validation for custom keys** *(may fold into Part A or ship separately):*

```php
// In ProductVariationRequest::rules()
$customRules = apply_filters('fluent_cart/product_variation_custom_rules', []);
return array_merge($hardcodedRules, $customRules);
```

Plugins supply Laravel-style rule strings: `['variants.other_info.customplugin_delivery_time' => 'nullable|sanitizeText|maxLength:50']`.

## Relationship to existing filters

| Existing | What it does | Why it doesn't solve this |
|---|---|---|
| `fluent_cart/product_admin_items` (AdminHelper.php) | Adds menu tabs to the product admin | Menu-level only, not in-form |
| `fluent_cart_product_pricing_actions_dropdown_items` (ProductPricingActions.vue) | Dropdown actions per variant row | Dropdown-level only, no inline fields |
| `fluent_cart/product_updated` (ProductController.php:333) | Fires *after* update | Too late — unknown keys already stripped |

## Backward Compatibility

- **Part A:** filter default matches current hard-coded array; no behaviour change without hooks.
- **Part B:** filter returns `[]` by default; no behaviour change without plugins registering.
- No database schema changes. `other_info` is a JSON column that already accepts arbitrary keys at the storage layer — both halves only affect code paths that currently strip or fail to render those keys.

## How a consumer plugin will use this

With both parts shipped, a consumer plugin's integration looks like:

```php
// in the consumer plugin — Grundpreis (base-price-per-unit) module
add_filter('fluent_cart/product_variation_other_info_keys', function ($keys) {
    return array_merge($keys, ['customplugin_grundpreis_amount', 'customplugin_grundpreis_unit']);
});

add_filter('fluent_cart/product_variation_custom_rules', function ($rules) {
    $rules['variants.other_info.customplugin_grundpreis_amount'] = 'nullable|numeric|min:0';
    $rules['variants.other_info.customplugin_grundpreis_unit']   = 'nullable|sanitizeText|maxLength:10';
    return $rules;
});
```

```js
// in the consumer plugin — admin JS bundle, editor-field registration
window.fluentCartAdminHooks.addFilter(
    'fluent_cart_variant_editor_custom_fields',
    'custom-plugin/grundpreis',
    (fields) => [
        ...fields,
        { key: 'customplugin_grundpreis_amount', type: 'number', label: 'Grundpreis', /* … */ },
        { key: 'customplugin_grundpreis_unit',   type: 'select', label: 'Einheit', /* … */ },
    ]
);
```

## Acceptance criteria

- [x] PR submitted for Part A (`fluent_cart/product_variation_other_info_keys` + backward-compatible defaults) → [fluent-cart/fluent-cart#41](https://github.com/fluent-cart/fluent-cart/pull/41)
- [ ] GitHub Discussion opened on upstream covering Part B (hook name, field schema, injection point for the 1.3.19 variant editor).
- [ ] After Discussion aligns the design: PR for Part B (variant-editor JS filter).
- [ ] Optional: PR for `fluent_cart/product_variation_custom_rules` (server-side validation for custom keys). Can ship with Part A or later.
- [ ] Once the upstream hooks land, consumer plugins implementing per-variant compliance metadata (Grundpreis, Lieferzeit, custom waiver flags, etc.) can consume them directly and drop their meta-box fallback paths.

## Testing

**Part A (PHP filter):**

1. Install FluentCart with the patch; no plugins hooking in → product save/update behaves identically to 1.3.19 (including packaging/weight keys round-tripping).
2. Register a test key via `fluent_cart/product_variation_other_info_keys`; set `variant.other_info.my_key = 'foo'` via REST; save; verify `my_key = 'foo'` persists across reloads on a `onetime` product.
3. Confirm `payment_type === 'subscription'` path is unaffected (that branch doesn't use `Arr::only()`).
4. Bug verified on LocalWP against 1.3.19 before the PR was filed: all 4 plugin-style keys (`customplugin_test_key`, `customplugin_grundpreis_amount`, `customplugin_grundpreis_unit`, `customplugin_delivery_time`) were stripped by `Arr::only()`; full repro log in the PR body.

**Part B (JS filter):**

1. Plugin calls `addFilter('fluent_cart_variant_editor_custom_fields', …)` at boot; field appears in editor.
2. Enter a value → save → verify it round-trips through Part A's whitelist and the REST payload.
3. Deactivate the plugin → field disappears; saved data untouched.
4. Native `other_info` fields (`payment_type`, `trial_days`, etc.) render and behave unchanged.

## Files Changed

| File | Change | Part |
|------|--------|------|
| `api/Resource/ProductVariationResource.php` | Wrap both `Arr::only()` calls with `fluent_cart/product_variation_other_info_keys` filter | A |
| `app/Http/Requests/ProductVariationRequest.php` | Merge `fluent_cart/product_variation_custom_rules` into `rules()` | A (optional) |
| `resources/admin/Modules/Products/…` (variant editor Vue component) | Call `window.fluentCartAdminHooks.applyFilters('fluent_cart_variant_editor_custom_fields', …)` and render returned fields | B |

## Open questions for the Discussion

1. **Hook name.** `fluent_cart_variant_editor_custom_fields` (snake, matches existing JS hook names) or `fluent_cart/variant_editor/custom_fields` (slash, matches PHP convention)? FluentCart currently mixes both.
2. **Injection point.** Should the hook fire once at mount (static field list) or reactively on every variant change (allows per-variant conditional fields)?
3. **Field-type surface.** Minimum set — `text`, `number`, `select`, `checkbox`, `textarea`? Can we defer `date`, `media`, conditional/dependent fields to a v2?
4. **Validation integration.** Does Part B imply Part A's validation filter *must* ship together, or can client-side validation-only be a starting point?
5. **Discoverability.** Expose a registry endpoint (`/wp-json/fluent-cart/v2/variant-editor-fields`) so merchants can audit what plugins register? Nice-to-have.
