# FluentCart JavaScript Script Handles

This document provides a comprehensive list of all JavaScript script handles used by FluentCart. This information is essential for third-party developers working with optimization plugins, caching solutions, or custom integrations that need to exclude FluentCart scripts from minification, combination, or asynchronous loading.

## Table of Contents

- [Overview](#overview)
- [Complete Script Handle List](#complete-script-handle-list)
- [Understanding Dynamic Handles](#understanding-dynamic-handles)
- [Implementation Examples](#implementation-examples)
- [Best Practices](#best-practices)

## Overview

FluentCart uses ES6 modules for most of its JavaScript files. These scripts are automatically marked with `type="module"` and should **not** be combined or minified by optimization plugins, as this can break functionality.

### Why Exclude FluentCart Scripts?

1. **ES6 Modules**: FluentCart scripts use ES6 module syntax which requires proper module handling
2. **Dependencies**: Scripts have specific load order dependencies that must be maintained
3. **Localization**: Scripts use `wp_localize_script()` for data injection that must be preserved
4. **Dynamic Loading**: Some scripts are conditionally loaded based on page context

## Complete Script Handle List

### Core Application Scripts

| Handle | Description | Loaded On |
|--------|-------------|-----------|
| `fluent-cart-app` | Main FluentCart application script | Cart, Checkout pages |

### Checkout Page Scripts

| Handle | Description | Loaded On |
|--------|-------------|-----------|
| `fct-checkout` | Main checkout page script | Checkout page |
| `fct-orderbump` | Order bump functionality script | Checkout page |

### Single Product Page Scripts

| Handle | Description | Loaded On |
|--------|-------------|-----------|
| `fluent-cart-single-product-page` | Main single product page script | Single product pages |
| `fluent-cart-single-product-page_1` | Secondary script (xzoom library) | Single product pages |
| `fluentcart-single-product-js` | Single product functionality | Shop/archive pages |
| `fluentcart-zoom-js` | Image zoom functionality (xzoom) | Shop/archive pages |

### Product Card Scripts

| Handle | Description | Loaded On |
|--------|-------------|-----------|
| `fluent-cart-product-card-js` | Product card component script | Product cards, shop pages |

### Shop/Archive Page Scripts

| Handle | Description | Loaded On |
|--------|-------------|-----------|
| `{app-slug}-fluentcart-product-page-js` | Main shop/archive page script | Shop, archive, taxonomy pages |
| `{app-slug}-fluentcart-product-filter-slider` | Product filter slider (noUiSlider) | Shop pages with filters |

**Note**: `{app-slug}` defaults to `fluent-cart` but can be customized. See [Understanding Dynamic Handles](#understanding-dynamic-handles).

### Cart Page Scripts

| Handle | Description | Loaded On |
|--------|-------------|-----------|
| `{app-slug}-fluentcart-toastify-notify-style` | Toast notification library | Cart, checkout pages |

**Note**: Despite the name containing "style", this is a JavaScript file.

### Customer Dashboard Scripts

| Handle | Description | Loaded On |
|--------|-------------|-----------|
| `fluentcart-customer-js` | Customer profile/dashboard script | Customer dashboard pages |

### Third-Party Scripts

| Handle | Description | Loaded On |
|--------|-------------|-----------|
| `cloudflare-turnstile` | Cloudflare Turnstile CAPTCHA | Checkout pages (when enabled) |

### Admin Scripts (Optional)

| Handle | Description | Loaded On |
|--------|-------------|-----------|
| `fluent-products-inline-js` | Admin-only inline script | Admin product editing |

**Note**: Admin scripts are typically not needed for frontend optimization exclusions.

## Understanding Dynamic Handles

Some FluentCart script handles are generated dynamically using the app slug. The default app slug is `fluent-cart`, but it can be customized via filters.

### How to Get the App Slug

```php
$app_slug = \FluentCart\App\App::slug();
// Default: 'fluent-cart'
```

### Dynamic Handle Patterns

The following handles use the app slug prefix:

- `{app-slug}-app` → `fluent-cart-app`
- `{app-slug}-fluentcart-product-page-js` → `fluent-cart-fluentcart-product-page-js`
- `{app-slug}-fluentcart-product-filter-slider` → `fluent-cart-fluentcart-product-filter-slider`
- `{app-slug}-fluentcart-toastify-notify-style` → `fluent-cart-fluentcart-toastify-notify-style`

### Checking for Custom Slug

If you need to support custom app slugs, you can check the registered scripts:

```php
global $wp_scripts;
$app_slug = 'fluent-cart'; // Default

// Check if custom slug is used
foreach ($wp_scripts->registered as $handle => $script) {
    if (strpos($handle, '-fluentcart-product-page-js') !== false) {
        // Extract slug from handle
        $app_slug = str_replace('-fluentcart-product-page-js', '', $handle);
        break;
    }
}
```

## Implementation Examples

### SiteGround Optimizer

For SiteGround Optimizer, use these filters:

```php
/**
 * Exclude FluentCart scripts from combination
 */
add_filter('sgo_javascript_combine_exclude', 'fluentcart_js_combine_exclude');
function fluentcart_js_combine_exclude($exclude_list) {
    $app_slug = 'fluent-cart'; // Default, or use \FluentCart\App\App::slug()
    
    $fluentcart_handles = [
        // Core scripts
        'fluent-cart-app',
        
        // Checkout scripts
        'fct-checkout',
        'fct-orderbump',
        
        // Product page scripts
        'fluent-cart-single-product-page',
        'fluent-cart-single-product-page_1',
        'fluentcart-single-product-js',
        'fluentcart-zoom-js',
        'fluent-cart-product-card-js',
        
        // Shop/archive scripts
        $app_slug . '-fluentcart-product-page-js',
        $app_slug . '-fluentcart-product-filter-slider',
        
        // Cart scripts
        $app_slug . '-fluentcart-toastify-notify-style',
        
        // Customer dashboard
        'fluentcart-customer-js',
        
        // Third-party
        'cloudflare-turnstile',
    ];
    
    return array_merge($exclude_list, $fluentcart_handles);
}

/**
 * Exclude FluentCart scripts from asynchronous loading
 */
add_filter('sgo_js_async_exclude', 'fluentcart_js_async_exclude');
function fluentcart_js_async_exclude($exclude_list) {
    $app_slug = 'fluent-cart'; // Default, or use \FluentCart\App\App::slug()
    
    // Use the same handles as above
    return fluentcart_js_combine_exclude($exclude_list);
}
```

### Generic WordPress Optimization Plugins

For other optimization plugins, you may need to use different hooks. Here's a pattern-based approach that works with most plugins:

```php
/**
 * Generic exclusion for FluentCart scripts
 * Works with most optimization plugins
 */
add_action('wp_enqueue_scripts', 'fluentcart_exclude_from_optimization', 999);
function fluentcart_exclude_from_optimization() {
    // Get app slug dynamically
    if (class_exists('\FluentCart\App\App')) {
        $app_slug = \FluentCart\App\App::slug();
    } else {
        $app_slug = 'fluent-cart'; // Fallback
    }
    
    $handles = [
        'fluent-cart-app',
        'fct-checkout',
        'fct-orderbump',
        'fluent-cart-single-product-page',
        'fluent-cart-single-product-page_1',
        'fluentcart-single-product-js',
        'fluentcart-zoom-js',
        'fluent-cart-product-card-js',
        $app_slug . '-fluentcart-product-page-js',
        $app_slug . '-fluentcart-product-filter-slider',
        $app_slug . '-fluentcart-toastify-notify-style',
        'fluentcart-customer-js',
        'cloudflare-turnstile',
    ];
    
    // Mark scripts to exclude (example for Autoptimize)
    foreach ($handles as $handle) {
        if (wp_script_is($handle, 'registered')) {
            // Add data attribute to prevent optimization
            add_filter("script_loader_tag", function($tag, $handle_name) use ($handle) {
                if ($handle_name === $handle) {
                    $tag = str_replace('<script ', '<script data-no-optimize="1" ', $tag);
                }
                return $tag;
            }, 10, 2);
        }
    }
}
```

### Pattern-Based Exclusion (Recommended)

For maximum compatibility and future-proofing, use pattern-based exclusion:

```php
/**
 * Pattern-based exclusion for FluentCart scripts
 * Automatically catches all FluentCart scripts, even if handles change
 */
add_filter('sgo_javascript_combine_exclude', 'fluentcart_js_combine_exclude_pattern');
function fluentcart_js_combine_exclude_pattern($exclude_list) {
    global $wp_scripts;
    
    if (!isset($wp_scripts->registered)) {
        return $exclude_list;
    }
    
    $patterns = [
        'fluent-cart',      // Matches: fluent-cart-app, fluent-cart-single-product-page, etc.
        'fluentcart',       // Matches: fluentcart-single-product-js, fluentcart-customer-js, etc.
        'fct-',             // Matches: fct-checkout, fct-orderbump, etc.
    ];
    
    foreach ($wp_scripts->registered as $handle => $script) {
        foreach ($patterns as $pattern) {
            if (strpos($handle, $pattern) === 0 || strpos($handle, '-' . $pattern) !== false) {
                $exclude_list[] = $handle;
                break;
            }
        }
        
        // Also exclude Cloudflare Turnstile
        if ($handle === 'cloudflare-turnstile') {
            $exclude_list[] = $handle;
        }
    }
    
    return array_unique($exclude_list);
}

add_filter('sgo_js_async_exclude', 'fluentcart_js_async_exclude_pattern');
function fluentcart_js_async_exclude_pattern($exclude_list) {
    return fluentcart_js_combine_exclude_pattern($exclude_list);
}
```

## Best Practices

### 1. Use Pattern-Based Exclusion

Pattern-based exclusion is recommended because:
- It automatically catches new scripts added in future updates
- It handles custom app slugs automatically
- It's more maintainable

### 2. Test After Implementation

Always test the following after implementing exclusions:
- ✅ Checkout process completes successfully
- ✅ Add to cart functionality works
- ✅ Product pages load correctly
- ✅ Cart drawer opens and functions properly
- ✅ Shop/archive pages filter correctly
- ✅ Customer dashboard loads properly

### 3. Monitor Console Errors

Check browser console for JavaScript errors after optimization changes:
- Module loading errors
- Dependency errors
- Localization data errors

### 4. Verify Script Loading

Use browser DevTools to verify:
- Scripts are not combined into single files
- Scripts maintain their `type="module"` attribute
- Scripts load in the correct order
- Localization data is present

### 5. Handle Custom App Slugs

If your site uses a custom app slug, ensure your exclusion code:
- Dynamically detects the slug, OR
- Uses pattern-based exclusion, OR
- Allows configuration of the slug

## Troubleshooting

### Scripts Still Being Combined

1. **Check filter priority**: Ensure your filter runs early enough (priority 10 or lower)
2. **Verify handle names**: Use browser DevTools to check actual script handles
3. **Clear caches**: Clear all optimization and caching caches
4. **Check plugin conflicts**: Other plugins might be combining scripts

### Scripts Not Loading

1. **Check dependencies**: Ensure parent scripts load before dependent scripts
2. **Verify localization**: Check that `wp_localize_script()` data is present
3. **Module errors**: Check browser console for ES6 module errors
4. **CORS issues**: Verify script URLs are accessible

### Performance Concerns

If excluding FluentCart scripts impacts performance:
1. FluentCart scripts are already optimized during build
2. They use ES6 modules which are efficiently loaded by modern browsers
3. The performance impact of exclusion is minimal compared to breaking functionality

## Additional Resources

- [FluentCart Developer Documentation](../README.md)
- [WordPress Script API](https://developer.wordpress.org/reference/functions/wp_enqueue_script/)
- [ES6 Modules Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

## Support

For issues related to script exclusion or optimization conflicts:
1. Check this documentation first
2. Test with pattern-based exclusion
3. Verify script handles using browser DevTools
4. Contact FluentCart support with specific error messages

---

**Last Updated**: This document reflects FluentCart version 1.3.4 and may be updated with future releases.

