# Upstream Proposal #28: Block-Based Email Extensibility & Receipt Hooks

> **Consumer plugin:** any FluentCart extension plugin needing to extend the block-based email renderer or reorder/replace receipt sections (e.g. legal-notice blocks, custom tax summaries, locale-specific headers, etc.).
> **Priority:** Medium (revised from Low)
> **FluentCart Version:** 1.3.10
> **Status:** Draft — revised after architectural analysis

> ⚠ **Not re-audited against 1.3.15.** This doc still describes FluentCart 1.3.10 and hasn't been verified against the current `upstream/master` (1.3.15). The block-based email architecture has likely evolved since; FluentCart Pro 1.3.17+ ships block emails, which may also reshape this ask. Re-audit — and stamp the version header up-to-date — before opening a PR or Discussion. See [`025-product-editor-custom-fields.md`](025-product-editor-custom-fields.md) for the pattern.

## Architectural Discovery

After analyzing FluentCart's source code, we discovered that FluentCart is **NOT** building
toward WooCommerce-style file-based template overrides. Instead, it is building toward a
**Gutenberg block-based email composition system**.

Key evidence:

1. **`FluentBlockParser`** (`app/Services/Email/FluentBlockParser.php`) — A fully functional
   class (1,200+ lines) that converts Gutenberg block JSON to email-safe HTML tables. Supports
   23 core WordPress blocks + 7 custom FluentCart email blocks.

2. **Custom FluentCart email blocks** already defined:
   - `fluent-cart/order-wrapper`
   - `fluent-cart/order-items`
   - `fluent-cart/subscription-details`
   - `fluent-cart/license-details`
   - `fluent-cart/download-details`
   - `fluent-cart/order-addresses`
   - `fluent-cart/email-header`

3. **Feature flag** in `EmailNotificationMailer.php` (line 180):
   ```php
   if (Arr::get($notification, 'is_customxxx')) {
       $body = (new FluentBlockParser($data))->parse($body);
   }
   ```
   Disabled via incomplete `is_customxxx` flag — clearly work-in-progress.

4. **Stub for block registration** — `Email/Editor/Blocks.php` has an empty `register()`
   method, placeholder for future email block editor.

5. **Database-stored custom email bodies** — `EmailNotifications` already supports switching
   between file-based defaults and admin-stored HTML (`is_default_body` flag).

**Conclusion:** FluentCart will offer a visual block editor for email templates, following the
WordPress Gutenberg ecosystem. File-based template overrides would go against this direction.

## Original Proposal (Withdrawn)

The original proposal suggested extracting ReceiptRenderer's HTML into file-based templates
with `fluent_cart_locate_template()` overrides. **This is withdrawn** — it conflicts with
FluentCart's architectural intent.

## Revised Proposal

Instead of file-based template overrides, this proposal focuses on two areas:

### Part A: Expose FluentBlockParser extensibility for plugins

### Problem

`FluentBlockParser::renderBlock()` uses a hardcoded switch statement with no fallback for
unrecognized custom blocks. When FluentCart enables the block editor, plugins cannot register
their own email blocks.

### Proposed Changes

**1. Add filter in `renderBlock()` for custom block types:**

```php
private function renderBlock($block, $isRoot = false)
{
    $blockName = $block['blockName'] ?? '';

    switch ($blockName) {
        case 'core/paragraph':
            // ... existing cases ...
        default:
            // NEW: Allow plugins to render custom block types
            $html = apply_filters('fluent_cart/email_block_render', '', $block, $this->data);
            if (!empty($html)) {
                return $html;
            }
            // Existing fallback: render innerHTML directly
            return $block['innerHTML'] ?? '';
    }
}
```

**2. Add filter for block data context:**

```php
// In FluentBlockParser constructor or parse()
$this->data = apply_filters('fluent_cart/email_block_data', $data);
```

**3. Document the block registration pattern for `Email/Editor/Blocks.php`:**

```php
class Blocks {
    public function register()
    {
        // Allow plugins to register custom email blocks
        do_action('fluent_cart/register_email_blocks');
    }
}
```

### How a consumer plugin would use this

```php
// Register custom email blocks
add_action('fluent_cart/register_email_blocks', function () {
    // Register Gutenberg blocks for the email editor
    register_block_type('custom-plugin/withdrawal-notice', [
        'title'       => __('Widerrufsbelehrung', 'custom-plugin'),
        'category'    => 'custom-plugin',
        'description' => __('Withdrawal policy notice (German law)', 'custom-plugin'),
        'attributes'  => [
            'variant' => ['type' => 'string', 'default' => 'full'],
        ],
    ]);
    register_block_type('custom-plugin/impressum', [...]);
    register_block_type('custom-plugin/vsbg-notice', [...]);
    register_block_type('custom-plugin/tax-breakdown', [...]);
});

// Render custom blocks in email context
add_filter('fluent_cart/email_block_render', function ($html, $block, $data) {
    switch ($block['blockName']) {
        case 'custom-plugin/withdrawal-notice':
            return customplugin_render_email_block_widerruf($block, $data);
        case 'custom-plugin/impressum':
            return customplugin_render_email_block_impressum($block, $data);
        case 'custom-plugin/vsbg-notice':
            return customplugin_render_email_block_vsbg($block, $data);
        case 'custom-plugin/tax-breakdown':
            return customplugin_render_email_block_tax($block, $data);
    }
    return $html;
}, 10, 3);
```

---

### Part B: Receipt/Thank-You page section hooks

### Problem

While receipts and thank-you pages are rendered by class methods (not block-based), they
lack sufficient hooks for plugins to modify individual sections. The 13 action hooks in
`ThankYouRender` allow injection but not replacement.

### Proposed Changes (minimal, aligned with current architecture)

**1. Add section replacement filters in ReceiptRenderer:**

```php
public function renderHeader()
{
    // Allow plugins to completely replace this section
    $custom = apply_filters('fluent_cart/receipt/render_header', null, $this->order, $this->settings);
    if ($custom !== null) {
        echo $custom;
        return;
    }
    // ... existing rendering code ...
}

public function renderOrderItems()
{
    $custom = apply_filters('fluent_cart/receipt/render_order_items', null, $this->order, $this->settings);
    if ($custom !== null) {
        echo $custom;
        return;
    }
    // ... existing rendering code ...
}

// Same pattern for renderAddresses(), renderTaxNote(), renderPaymentHistory()
```

**2. Add section order filter:**

```php
public function render($hideWrapper = false)
{
    $sections = apply_filters('fluent_cart/receipt/sections', [
        'header',
        'addresses',
        'order_items',
        'tax_note',
        'payment_history',
    ], $this->order);

    if (!$hideWrapper) { $this->wrapperStart(); }
    foreach ($sections as $section) {
        $method = 'render' . str_replace('_', '', ucwords($section, '_'));
        if (method_exists($this, $method)) {
            $this->{$method}();
        }
    }
    if (!$hideWrapper) { $this->wrapperEnd(); }
}
```

This allows a consumer plugin to reorder sections (e.g., move tax note before payment history)
and inject new sections (e.g., `legal_notices` section) without replacing the renderer.

### How a consumer plugin would use Part B

```php
// Add legal notices section to receipts
add_filter('fluent_cart/receipt/sections', function ($sections, $order) {
    // Add after tax_note
    $pos = array_search('tax_note', $sections);
    array_splice($sections, $pos + 1, 0, ['customplugin_legal_notices']);
    return $sections;
}, 10, 2);

// Replace header with German-compliant version (Rechnungsnummer, USt-IdNr.)
add_filter('fluent_cart/receipt/render_header', function ($html, $order, $settings) {
    return customplugin_render_receipt_header($order, $settings);
}, 10, 3);
```

## Files to Modify

| File | Change |
|------|--------|
| `app/Services/Email/FluentBlockParser.php` | Add `fluent_cart/email_block_render` filter in default case |
| `app/Services/Email/Editor/Blocks.php` | Add `fluent_cart/register_email_blocks` action |
| `app/Services/Renderer/Receipt/ReceiptRenderer.php` | Add section replacement filters + section order filter |

## Backward Compatibility

- All filters return `null`/empty by default — zero change for existing users
- Block rendering filter only fires for unrecognized block types
- Section order defaults to current order
- Section replacement returns `null` by default (renders normally)
- No visual or behavioral changes without active plugin hooks

## Migration guidance for HTML-string-based plugins

Plugins currently injecting content into emails via HTML-string matching — e.g. `strpos($message, 'class="email_footer"')` — will break once FluentCart enables the block-based email pipeline:

- Block JSON is not HTML — string searching fails.
- Even after block → HTML conversion, class names may change.
- The `wp_mail` filter fires after rendering, but block structure differs.

**Recommended migration paths** once the proposals in this document and Proposal #027 land:

1. Block-based: register a `custom-plugin/<your-block-name>` block type (enabled by the hooks in Part A above).
2. Hook-based: use `fluent_cart/email_footer_content` from Proposal #027.
3. Both — blocks for visual-builder users, hook for programmatic fallback.

### HIGH: Email shortcode resolution

`Widerrufsbelehrung::resolveShortcode()` returns raw HTML strings. In block context, shortcode
resolution may work differently. Need to verify `FluentBlockParser` invokes
`fluent_cart/smartcode_fallback` during rendering.

### SAFE: Invoice PDF generation

`InvoiceDocument::renderTemplate()` uses its own file-based PHP template for PDF generation
via Dompdf. This is completely separate from the email/receipt rendering pipeline and is
**not affected** by the block architecture.

### SAFE: Invoice email attachment

`EmailInvoiceAttachment::maybeAttachInvoice()` uses `wp_mail` filter to add PDF attachments.
This works regardless of how the email body is composed — attachments are separate from content.

## Recommended Priority

1. **Proposal #027** (email footer hook) — Implement first, solves the immediate legal text
   injection need without depending on block architecture
2. **Part B** (receipt section hooks) — Small, focused, easy to merge
3. **Part A** (block extensibility) — Propose when FluentCart is closer to enabling the
   block editor feature (currently disabled)
