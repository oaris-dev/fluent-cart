import blocktranslate from "@/BlockEditor/BlockEditorTranslator";

const { useBlockProps } = wp.blockEditor;

const CheckoutManualDiscountBlock = {
    edit: (props) => {
        const blockProps = useBlockProps();

        return <li { ...props } {...blockProps}>
                <span className="fct_summary_label">{blocktranslate('Manual Discount')}</span>
                <span className="fct_summary_value">
                -$0.00
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

export default CheckoutManualDiscountBlock;
