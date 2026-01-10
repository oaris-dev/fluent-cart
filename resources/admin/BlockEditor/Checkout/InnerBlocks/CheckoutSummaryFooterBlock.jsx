import blocktranslate from "@/BlockEditor/BlockEditorTranslator";

const blockEditorData = window.fluent_cart_checkout_data;
const {useBlockProps, InnerBlocks} = wp.blockEditor;
const CheckoutSummaryFooterBlock = {
    edit: (props) => {
        const blockProps = useBlockProps({
            className: 'fc-checkout-summary-footer-block fct_summary_items',
        });

        return <div {...props} {...blockProps}>
                <ul className="fct_summary_items_list">
                    <InnerBlocks
                        templateLock={false}
                        allowedBlocks={
                            [
                                'core/heading',
                                'core/paragraph',
                                'fluent-cart/checkout-subtotal',
                                'fluent-cart/checkout-shipping',
                                'fluent-cart/checkout-coupon',
                                'fluent-cart/checkout-manual-discount',
                                'fluent-cart/checkout-tax',
                                'fluent-cart/checkout-shipping-tax',
                                'fluent-cart/checkout-total'
                            ]
                        }
                    />
                </ul>
        </div>;
    },
    save: (props) => {
        const blockProps = useBlockProps.save({className: 'fct_checkout_summary'});

        return (
            <div {...blockProps}>
                <InnerBlocks.Content/>
            </div>
        );
    },
    supports: {
        html: false,
        align: ["left", "center", "right"],
        typography: {
            fontSize: true,
            lineHeight: true
        },
        spacing: {
            margin: true
        },
        color: {
            text: true
        }
    },
    category: "fluent-cart"
};

export default CheckoutSummaryFooterBlock;
