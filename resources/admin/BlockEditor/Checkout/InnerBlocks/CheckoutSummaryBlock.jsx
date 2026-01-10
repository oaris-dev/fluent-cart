import blocktranslate from "@/BlockEditor/BlockEditorTranslator";

const blockEditorData = window.fluent_cart_checkout_data;
const {useBlockProps, InnerBlocks} = wp.blockEditor;

const DEFAULT_TEMPLATE = [
    ['fluent-cart/checkout-order-summary'],
    [
        'fluent-cart/checkout-summary-footer',
        {},
        [
            ['fluent-cart/checkout-subtotal'],
            ['fluent-cart/checkout-shipping'],
            ['fluent-cart/checkout-coupon'],
            ['fluent-cart/checkout-manual-discount'],
            ['fluent-cart/checkout-tax'],
            ['fluent-cart/checkout-shipping-tax'],
            ['fluent-cart/checkout-total']
        ]
    ]
];

const CheckoutSummaryBlock = {
    edit: (props) => {
        const blockProps = useBlockProps({
            className: 'fc-checkout-summary-block',
        });

        return <div {...props} {...blockProps}>
            <div className="fct_checkout_summary">
                <div className="fct_summary active">
                    <div className="fct_summary_box">
                        <div className="fct_checkout_form_section" >
                            <div className="fct_form_section_body" >
                                <InnerBlocks
                                    template={DEFAULT_TEMPLATE}
                                    templateLock={false}
                                    allowedBlocks={
                                        [
                                            'core/heading',
                                            'core/paragraph',
                                            'fluent-cart/checkout-order-summary',
                                            'fluent-cart/checkout-summary-footer'
                                        ]
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
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

export default CheckoutSummaryBlock;
