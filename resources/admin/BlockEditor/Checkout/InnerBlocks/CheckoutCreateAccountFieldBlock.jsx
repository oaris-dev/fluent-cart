import blocktranslate from "@/BlockEditor/BlockEditorTranslator";

const { useBlockProps, RichText } = wp.blockEditor;
const CheckoutCreateAccountFieldBlock = {
    attributes: {
        create_account_title: {
            type: 'string',
            default: blocktranslate('Create an Account?')
        }
    },
    edit: (props) => {
        const { attributes, setAttributes } = props;
        const blockProps = useBlockProps({
            className: 'fc-checkout-create-account-block',
        });

        return <div { ...props } {...blockProps}>
            <label htmlFor="allow_create_account">
                <input type="checkbox" name="allow_create_account" readOnly disabled placeholder={blocktranslate('Create Account')}/>
                <RichText
                    tagName="span"
                    value={attributes.create_account_title}
                    onChange={(value) => setAttributes({ create_account_title: value })}
                    placeholder={blocktranslate('Title')}
                    allowedFormats={['core/bold', 'core/italic']}
                />
            </label>
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

export default CheckoutCreateAccountFieldBlock;
