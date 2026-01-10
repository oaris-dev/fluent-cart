import blocktranslate from "@/BlockEditor/BlockEditorTranslator";

const { useBlockProps } = wp.blockEditor;

const CheckoutTotalBlock = {
    edit: (props) => {
        const blockProps = useBlockProps({
            className: 'fct_summary_items_total',
        });

        return <li { ...props } {...blockProps}>
                <span className="fct_summary_label">{blocktranslate('Total')}</span>
                <span className="fct_summary_value" data-fluent-cart-checkout-estimated-total="">
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

export default CheckoutTotalBlock;
