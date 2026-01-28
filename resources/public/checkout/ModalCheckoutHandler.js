export default class ModalCheckoutHandler {

    // constructor() {
    //     this.init();
    // }
    static #instance = null;
    #currentModal = null;
    #iframe = null;
    #modalContainer = null;
    #loaderElement = null;
    #fadeTimeout = 300;
    #messageListener = null;
    #checkoutFormInner = null;

    constructor() {
        this.translate = window.fluentcart?.$t || ((key) => key);
        this.#cacheElements();
        this.#bindEvents();
    }

    static init() {
        if (ModalCheckoutHandler.#instance) {
            return ModalCheckoutHandler.#instance;
        }

        ModalCheckoutHandler.#instance = new ModalCheckoutHandler();
        return ModalCheckoutHandler.#instance;
    }

    #cacheElements() {
        this.#loaderElement = document.querySelector('[data-fct-checkout-modal-loader]');
        this.#modalContainer = document.querySelector('[data-fct-checkout-modal-container]');
        this.#iframe = document.querySelector('[data-fct-checkout-modal-iframe]');
    }

    #bindEvents() {
        // Bind to all instant checkout buttons
        this.#bindCheckoutButtons();

        // Delegate close button clicks
        document.addEventListener('click', this.#handleCloseClick.bind(this));

        // Use MutationObserver to bind dynamically added buttons
        this.#observeNewButtons();
    }

    #bindCheckoutButtons() {
        const buttons = document.querySelectorAll('[data-fct-instant-checkout-button]');
        buttons.forEach(button => {
            button.addEventListener('click', this.#handleCheckoutClick.bind(this));
        });
    }

    #observeNewButtons() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Check if the node itself is a checkout button
                        if (node.hasAttribute?.('data-fct-instant-checkout-button')) {
                            node.addEventListener('click', this.#handleCheckoutClick.bind(this));
                        }
                        // Check for checkout buttons within the added node
                        if (node.querySelectorAll) {
                            const buttons = node.querySelectorAll('[data-fct-instant-checkout-button]');
                            buttons.forEach(button => {
                                button.addEventListener('click', this.#handleCheckoutClick.bind(this));
                            });
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    #handleCheckoutClick(e) {

        e.preventDefault();

        const button = e.currentTarget;
        const href = button.getAttribute('href');

        const url = new URL(href, window.location.origin);
        url.searchParams.set('fluent-cart', 'modal_checkout');

        this.openModal(url.toString());
    }

    #handleCloseClick(e) {
        if (e.target.closest('[data-fct-checkout-modal-close]')) {
            e.preventDefault();
            this.closeModal();
        }
    }

    #handleIframeLoad = () => {
        this.#hideLoader();
        const iframeDoc = this.#iframe.contentDocument || this.#iframe.contentWindow.document;
        const height = iframeDoc.body.scrollHeight;
        const checkoutFormInner = iframeDoc.querySelector('[data-fct-modal-checkout-form-inner]');

        if (checkoutFormInner) {
            checkoutFormInner.style.height = height + 120 + 'px';
        }

        this.#iframe.style.height = height + 120 + 'px';
    }

    #handleMessage = (e) => {
        if (e.origin !== window.location.origin) return;

        if (e.data?.type === 'fluentCartCheckoutComplete') {
            if (e.data.redirectUrl) {
                window.location.href = e.data.redirectUrl;
            } else {
                this.closeModal();
            }
        }
    }

    #showError() {
        if (typeof Toastify !== 'undefined') {
            new Toastify({
                text: this.translate("Modal checkout is not available. Please try again."),
                className: "info",
                duration: 3000,
                style: {
                    background: "linear-gradient(to right, rgb(255 30 30), rgb(252 133 101))",
                    color: '#fff',
                },
            }).showToast();
        } else {
            alert(this.translate("Modal checkout is not available. Please try again."));
        }
    }

    openModal(checkoutUrl) {
        if (this.#currentModal || !this.#modalContainer || !this.#iframe) {
            if (!this.#modalContainer || !this.#iframe) {
                this.#showError();
            }
            return;
        }

        this.#currentModal = this.#modalContainer;
        this.#showLoader();

        // Setup iframe
        this.#iframe.src = checkoutUrl;

        this.#iframe.addEventListener('load', () => {
            this.#handleIframeLoad();
            this.#setupIframeLinkBehavior(this.#iframe);
        }, { once: true });

        // Setup message listener
        if (!this.#messageListener) {
            this.#messageListener = true;
            window.addEventListener('message', this.#handleMessage);
        }

        // Show modal
        this.#modalContainer.classList.add('fct-checkout-modal-open');

        // Dispatch event
        window.dispatchEvent(new CustomEvent('fluentCartModalCheckoutOpened', {
            detail: { checkoutUrl }
        }));
    }

    closeModal() {
        if (!this.#currentModal) return;

        this.#currentModal.classList.remove('fct-checkout-modal-open');

        setTimeout(() => {
            if (this.#iframe) {
                this.#iframe.src = '';
            }
            this.#currentModal = null;

            window.dispatchEvent(new CustomEvent('fluentCartModalCheckoutClosed'));
        }, this.#fadeTimeout);
    }

    #showLoader() {
        if (this.#loaderElement) {
            this.#loaderElement.style.display = '';
        }
    }

    #hideLoader() {
        if (this.#loaderElement) {
            this.#loaderElement.style.display = 'none';
        }
    }

    #setupIframeLinkBehavior(iframe) {
        try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!doc || !doc.body) return;
            const ensureTargetBlank = (anchor) => {
                if (anchor.tagName !== 'A') return;

                const href = anchor.getAttribute('href') || '';
                if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
                    return;
                }
                if (!anchor.hasAttribute('target')) {
                    anchor.target = '_blank';
                }
                if (!anchor.rel) {
                    anchor.rel = 'noopener noreferrer';
                }
            };
            doc.querySelectorAll('a').forEach(ensureTargetBlank);
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType !== 1) continue;
                        if (node.matches?.('a')) {
                            ensureTargetBlank(node);
                        }
                        node.querySelectorAll?.('a').forEach(ensureTargetBlank);
                    }
                }
            });
            observer.observe(doc.body, {
                childList: true,
                subtree: true,
            });
        } catch {
            // Expected for cross-origin iframes – safely ignored
        }
    }
    

    // static init() {
    //     return new ModalCheckoutHandler();
    // }
}

// document.addEventListener('DOMContentLoaded', () => {
//     ModalCheckoutHandler.init();
// });
