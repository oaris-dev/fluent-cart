# Upstream Proposal #27: Email Footer Content Hook

> **Consumer plugin:** any FluentCart extension plugin needing to inject content into transactional-email footers (e.g. legal notices, contact details, translated disclaimers, auxiliary branding, etc.).
> **Priority:** Medium
> **FluentCart Version:** 1.3.22 *(re-audited 2026-04-24 — `getEmailFooter()` still at line 154, `parseEmailContent()` call site at line 191, zero structural drift from the 1.3.10 draft)*
> **Status:** Draft — ready for public fork PR

## Problem Statement

FluentCart's email system has no action hook for plugins to inject content into email footers.
The `getEmailFooter()` method in `EmailNotificationMailer.php` (lines 154-170) assembles the
footer from settings + FluentCart branding, with no extension point.

German law requires specific legal texts in every transactional email:
- Impressum (legal-identity page required on German commercial sites; TMG § 5)
- Widerrufsbelehrung (consumer withdrawal-rights policy; § 355 BGB) for applicable orders
- VSBG (Alternative Dispute Resolution) notice
- VAT ID if applicable

Without a footer hook, the only option is overriding the entire email template, which is fragile
and conflicts with other plugins and FluentCart updates.

## Current Architecture

**`EmailNotificationMailer.php`** (lines 154-170):
```php
public function getEmailFooter(): string
{
    $footer = "";
    $settings = EmailNotifications::getSettings();
    $emailFooter = Arr::get($settings, 'email_footer', '');
    if (!empty($emailFooter)) {
        $footer .= ShortcodeTemplateBuilder::make($emailFooter, []);
    }
    $isEmailFooter = EmailNotifications::getSettings('show_email_footer');
    if (!App::isProActive() || $isEmailFooter === 'yes') {
        $cartFooter = "<div style='padding: 15px; text-align: center; ...'>"
                    . "Powered by <a href='https://fluentcart.com'>FluentCart</a></div>";
        $footer .= $cartFooter;
    }
    return $footer;
}
```

**`general_template.php`** (lines 72-84):
```php
<?php if (!empty($emailFooter)): ?>
    <table class="email_footer" align="center" width="100%" ...>
        <tbody><tr><td>
            <?php echo $emailFooter; ?>
        </td></tr></tbody>
    </table>
<?php endif; ?>
```

**No existing hooks in the footer assembly.** The `$emailFooter` variable is built entirely
within `getEmailFooter()` and passed to the template.

## Proposed Changes

### 1. Modify `getEmailFooter()` to accept context and add filter

**File:** `app/Services/Email/EmailNotificationMailer.php`

**Important:** `getEmailFooter()` currently takes no parameters and has no access to the
email type or order. It has no `$this->emailType`, `getEmailType()`, or `getOrder()` methods.
However, it's called from `parseEmailContent($notification, $data)` at line 191, where both
`$notification` (email config including type/name) and `$data` (template data including order,
customer, etc.) are available. So we need two changes:

**Change 1 — Add optional `$context` parameter and filter to `getEmailFooter()`:**

```php
public function getEmailFooter(array $context = []): string
{
    $footer = "";
    $settings = EmailNotifications::getSettings();
    $emailFooter = Arr::get($settings, 'email_footer', '');
    if (!empty($emailFooter)) {
        $footer .= ShortcodeTemplateBuilder::make($emailFooter, []);
    }

    // NEW: Allow plugins to add content to email footers (e.g., legal notices, links)
    $pluginFooter = apply_filters('fluent_cart/email_footer_content', '', $context);
    if (!empty($pluginFooter)) {
        $footer .= $pluginFooter;
    }

    $isEmailFooter = EmailNotifications::getSettings('show_email_footer');
    if (!App::isProActive() || $isEmailFooter === 'yes') {
        $cartFooter = "<div style='padding: 15px; text-align: center; ...'>"
                    . "Powered by <a href='https://fluentcart.com'>FluentCart</a></div>";
        $footer .= $cartFooter;
    }
    return $footer;
}
```

**Change 2 — Pass context from call site in `parseEmailContent()` (around line 191):**

```php
// Before:
'emailFooter' => $this->getEmailFooter(),

// After:
'emailFooter' => $this->getEmailFooter([
    'notification' => $notification,
    'data'         => $data,
]),
```

This passes the notification config (which includes the email type/name) and the template
data (which includes the order, customer, etc.) to the filter.

**Why a filter (not an action):** Cleaner, no `ob_start` needed, consistent with FluentCart's
existing patterns. Multiple plugins can concatenate content by appending to `$pluginFooter`.

### 2. Context available to plugins

Through `$context['notification']`, plugins can access:
- `$context['notification']['name']` — e.g., `order_paid_customer`, `order_refund_customer`
- `$context['notification']['title']` — human-readable email title

Through `$context['data']`, plugins can access:
- Order data, customer data, and other template variables

This allows plugins to conditionally include content. For example, Widerrufsbelehrung only
applies to purchase confirmation emails, not password resets.

## Backward Compatibility

- No existing behavior changes — the hook fires but has no default listeners
- Footer output is identical when no plugins hook in
- User-configured footer text (from settings) renders before plugin content
- FluentCart branding renders after plugin content
- Order: user footer → plugin content → FluentCart branding

## How a consumer plugin would use this

```php
add_filter('fluent_cart/email_footer_content', function ($content, $context) {
    $notification = $context['notification'] ?? [];
    $emailName = $notification['name'] ?? '';
    $data = $context['data'] ?? [];
    $order = $data['order'] ?? null;

    $blocks = [];

    // Impressum (all emails)
    $impressum = customplugin_get_setting('impressum_text');
    if ($impressum) {
        $blocks[] = '<div style="padding: 10px; font-size: 12px; color: #666;">'
                  . '<strong>' . __('Impressum', 'custom-plugin') . '</strong><br>'
                  . nl2br(esc_html($impressum))
                  . '</div>';
    }

    // Widerrufsbelehrung (purchase emails only)
    if (in_array($emailName, ['order_paid_customer', 'order_placed_offline_customer'])) {
        $widerruf = customplugin_get_setting('widerrufsbelehrung_short');
        if ($widerruf) {
            $blocks[] = '<div style="padding: 10px; font-size: 12px; color: #666;">'
                      . '<strong>' . __('Widerrufsbelehrung', 'custom-plugin') . '</strong><br>'
                      . wp_kses_post($widerruf)
                      . '</div>';
        }
    }

    // VSBG notice (all order-related emails)
    if ($order) {
        $vsbg = customplugin_get_setting('vsbg_notice');
        if ($vsbg) {
            $blocks[] = '<div style="padding: 10px; font-size: 12px; color: #666;">'
                      . wp_kses_post($vsbg)
                      . '</div>';
        }
    }

    if (!empty($blocks)) {
        $content .= '<div style="border-top: 1px solid #eee; margin-top: 15px; padding-top: 15px;">'
                   . implode('', $blocks)
                   . '</div>';
    }

    return $content;
}, 10, 2);
```

## Testing

1. Hook `fluent_cart/email_footer_content` → add a test string
2. Trigger an order confirmation email → test string appears in footer
3. Verify it appears between user footer text and "Powered by FluentCart"
4. Test with multiple plugins hooking → all content concatenated in priority order
5. Test with empty return → no change to existing footer
6. Test email type context → conditional content only appears for correct email types
7. Verify HTML email rendering (table-based layout) is not broken

## Files Changed

| File | Change |
|------|--------|
| `app/Services/Email/EmailNotificationMailer.php` | Add `fluent_cart/email_footer_content` filter in `getEmailFooter()` |

**Single-file change** — minimal impact, easy to review and merge.
