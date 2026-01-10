/**
 * Cloudflare Turnstile Handler
 * Manages Turnstile widget rendering and token retrieval
 */
class TurnstileHandler {
    constructor(checkoutHandler = null) {
        this.checkoutHandler = checkoutHandler;
        // this.setupGlobalCallback();
        this.autoRenderWidget();
    }

    /**
     * Setup global callback for Turnstile
     */
    // setupGlobalCallback() {
    //     window.fluentCartTurnstileCallback = function(token) {
    //         window.fluentCartTurnstileToken = token;
    //     };
    // }

    /**
     * Check if Turnstile is enabled
     */
    isEnabled() {
        return window.fluentcart_checkout_vars?.turnstile?.enabled;
    }

    /**
     * Auto-render Turnstile widget on page load
     */
    autoRenderWidget() {
        if (!this.isEnabled()) {
            return;
        }

        const widget = document.querySelector('[data-fluent-cart-turnstile-widget] .cf-turnstile');
        const wrapper = document.querySelector('[data-fluent-cart-turnstile-widget]');

        if (!widget) {
            return;
        }

        // Check if module is enabled via attribute
        const isActiveAttr = wrapper?.getAttribute('data-turnstile-active');

        if (!this.isEnabled() && isActiveAttr !== 'yes') {
            return;
        }

        // Check if Turnstile script is loaded
        if (typeof turnstile === 'undefined') {
            return;
        }

        const widgetId = widget.getAttribute('data-widget-id');

        if (!widgetId) {
            // Auto-render the widget on page load
            const siteKey = widget.getAttribute('data-sitekey') || window.fluentcart_checkout_vars?.turnstile?.site_key;
            if (siteKey) {
                try {
                    // Use string callback name to match global function
                    const renderedWidgetId = turnstile.render(widget, {
                        sitekey: siteKey,
                        callback: function (token) {
                            window.fluentCartTurnstileToken = token;
                        },
                        size: 'invisible',
                        theme: 'auto'
                    });
                    // Store the widget ID for later use (e.g., reset)
                    if (renderedWidgetId) {
                        widget.setAttribute('data-widget-id', renderedWidgetId);
                    }
                } catch (error) {
                    // Silent error handling
                }
            }
        }
    }

    /**
     * Reset Turnstile widget
     * Clears the current token and resets the widget for next verification
     */
   reset() {
    if (!this.isEnabled() || typeof turnstile === 'undefined') {
        return;
    }

    window.fluentCartTurnstileToken = null;

    const widget = document.querySelector(
        '[data-fluent-cart-turnstile-widget] .cf-turnstile'
    );
    if (!widget) return;

    const widgetId = widget.getAttribute('data-widget-id');
    if (!widgetId) return;

    try {
        turnstile.reset(widgetId);

        // 🔥 CRITICAL: re-execute after reset
        setTimeout(() => {
            turnstile.execute(widgetId);
        }, 50);

    } catch (e) {
        console.error('Turnstile reset failed', e);
    }
}


    /**
     * Handle security verification for checkout
     * @param {FormData} formData - The form data to append token to
     * @returns {Promise<boolean>}
     */
    async handleCheckoutSecurityVerification(formData) {
        if (!this.isEnabled()) {
            return true;
        }

        const turnstileToken = await this.getToken();
        console.log(turnstileToken, 'turnstiletoken')
        if (!turnstileToken) {
            if (this.checkoutHandler?.cleanupAfterProcessing) {
                this.checkoutHandler.cleanupAfterProcessing();
            }
            new Toastify({
                text: this.checkoutHandler?.translate?.("Please complete the security verification.") || "Please complete the security verification.",
                className: "warning",
                duration: 3000
            }).showToast();
            return false;
        }

        formData.append('cf_turnstile_token', turnstileToken);
        return true;
    }

    /**
     * Verify and append Turnstile token to form data
     * @param {FormData} formData - The form data to append token to
     * @param {Function} translate - Translation function
     * @param {Function} cleanupCallback - Cleanup callback on error
     * @returns {Promise<boolean>}
     * @deprecated Use handleCheckoutSecurityVerification instead
     */
    async verifyAndAppendToken(formData, translate, cleanupCallback) {
        if (!this.isEnabled()) {
            return true;
        }

        const turnstileToken = await this.getToken();
        if (!turnstileToken) {
            if (cleanupCallback) {
                cleanupCallback();
            }
            new Toastify({
                text: translate("Too many requests. Please try again after some time."),
                className: "warning",
                duration: 3000
            }).showToast();
            return false;
        }

        formData.append('cf_turnstile_token', turnstileToken);
        return true;
    }

    /**
     * Get Turnstile token
     * @returns {Promise<string|null>}
     */
    async getToken() {
        return new Promise(async (resolve) => {
            if (!this.isEnabled()) {
                resolve(null);
                return;
            }
            if (typeof turnstile === 'undefined') {
                resolve(null);
                return;
            }
            const widget = document.querySelector('[data-fluent-cart-turnstile-widget] .cf-turnstile');
            if (!widget) {
                resolve(null);
                return;
            }
            if (window.fluentCartTurnstileToken) {
                resolve(window.fluentCartTurnstileToken);
                return;
            }
            resolve(null);
        });
    }
}

export default TurnstileHandler;
