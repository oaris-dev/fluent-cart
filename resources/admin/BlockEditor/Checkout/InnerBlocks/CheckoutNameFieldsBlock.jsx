import blocktranslate from "@/BlockEditor/BlockEditorTranslator";

const { useBlockProps } = wp.blockEditor;
const CheckoutNameFieldsBlock = {
    edit: (props) => {
        const blockProps = useBlockProps({
            className: 'fc-checkout-name-fields-block',
        });

        return <div { ...props } {...blockProps}>
            <input type="text" readOnly disabled placeholder={blocktranslate('Name')}/>
            <input type="text" readOnly disabled placeholder={blocktranslate('Email')}/>
        </div>;
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

export default CheckoutNameFieldsBlock;
