import blocktranslate from "@/BlockEditor/BlockEditorTranslator";

const { useBlockProps } = wp.blockEditor;

const CheckoutShippingBlock = {
    edit: (props) => {
        const blockProps = useBlockProps({
            className: '',
            'data-fluent-cart-checkout-shipping-amount-wrapper': '',
        });

        return <li { ...props } {...blockProps}>
                <span className="fct_summary_label">{blocktranslate('Shipping')}</span>
                <span className="fct_summary_value" data-fluent-cart-checkout-shipping-amount=""
                      data-shipping-method-id="">
                    $0.00
                </span>
        </li>;
    },
    save: (props) => {
        return null;
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

export default CheckoutShippingBlock;
