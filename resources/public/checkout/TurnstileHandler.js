/**
 * Cloudflare Turnstile Handler
 * Manages Turnstile widget rendering and token retrieval
 */
class TurnstileHandler {
    constructor(checkoutHandler = null) {
        this.checkoutHandler = checkoutHandler;
        this.pendingTokenPromise = null;
        this.pendingResolve = null;
        this.isExecuting = false;
        this.setupGlobalCallback();
        this.autoRenderWidget();
    }

    /**
     * Setup global callback for Turnstile
     */
    setupGlobalCallback() {
        window.fluentCartTurnstileHandlerInstance = this;
        window.fluentCartTurnstileCallback = function (token) {
            window.fluentCartTurnstileHandlerInstance?.handleToken(token);
        };
    }

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
                        callback: this.handleToken.bind(this),
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
        this.pendingTokenPromise = null;
        this.pendingResolve = null;
        this.isExecuting = false;

        const widget = document.querySelector(
            '[data-fluent-cart-turnstile-widget] .cf-turnstile'
        );
        if (!widget) return;

        const widgetId = widget.getAttribute('data-widget-id');
        if (!widgetId) return;

        try {
            turnstile.reset(widgetId);
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
        if (!turnstileToken) {
            if (this.checkoutHandler?.cleanupAfterProcessing) {
                this.checkoutHandler.cleanupAfterProcessing();
            }
            new Toastify({
                text: this.checkoutHandler?.translate?.("Please complete the security verification.") || "Please complete the security verification.",
                className: "warning",
                duration: 3000
            }).showToast();
            this.reset();
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
            this.reset();
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
        if (!this.isEnabled()) {
            return null;
        }
        if (typeof turnstile === 'undefined') {
            return null;
        }
        const widget = document.querySelector('[data-fluent-cart-turnstile-widget] .cf-turnstile');
        if (!widget) {
            return null;
        }

        if (window.fluentCartTurnstileToken) {
            return window.fluentCartTurnstileToken;
        }

        let widgetId = widget.getAttribute('data-widget-id');
        if (!widgetId) {
            const siteKey = widget.getAttribute('data-sitekey') || window.fluentcart_checkout_vars?.turnstile?.site_key;
            if (!siteKey) {
                return null;
            }
            try {
                widgetId = turnstile.render(widget, {
                    sitekey: siteKey,
                    callback: this.handleToken.bind(this),
                    size: 'invisible',
                    theme: 'auto'
                });
                if (widgetId) {
                    widget.setAttribute('data-widget-id', widgetId);
                }
            } catch (error) {
                return null;
            }
        }

        if (this.pendingTokenPromise) {
            return this.pendingTokenPromise;
        }

        this.pendingTokenPromise = new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 30;
            this.pendingResolve = resolve;

            const poll = () => {
                if (window.fluentCartTurnstileToken) {
                    const token = window.fluentCartTurnstileToken;
                    this.pendingTokenPromise = null;
                    this.pendingResolve = null;
                    this.isExecuting = false;
                    resolve(token);
                    return;
                }

                if (attempts >= maxAttempts) {
                    this.pendingTokenPromise = null;
                    this.pendingResolve = null;
                    this.isExecuting = false;
                    resolve(null);
                    return;
                }

                attempts++;
                setTimeout(poll, 100);
            };

            try {
                if (!this.isExecuting) {
                    this.isExecuting = true;
                    let response = null;
                    try {
                        response = turnstile.getResponse(widgetId);
                    } catch (error) {
                        response = null;
                    }

                    if (response) {
                        this.handleToken(response);
                        return;
                    }

                    try {
                        turnstile.reset(widgetId);
                    } catch (error) {
                        // ignore
                    }
                    turnstile.execute(widgetId);
                }
            } catch (error) {
                this.isExecuting = false;
            }

            poll();
        });

        return this.pendingTokenPromise;
    }

    resolvePendingToken(token) {
        if (!this.pendingResolve) {
            return;
        }
        const resolve = this.pendingResolve;
        this.pendingResolve = null;
        this.pendingTokenPromise = null;
        this.isExecuting = false;
        resolve(token);
    }

    handleToken(token) {
        if (!token) {
            return;
        }
        window.fluentCartTurnstileToken = token;
        this.resolvePendingToken(token);
    }
}

export default TurnstileHandler;
