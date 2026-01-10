import blocktranslate from "@/BlockEditor/BlockEditorTranslator";

const { useBlockProps } = wp.blockEditor;

const CheckoutCouponBlock = {
    edit: (props) => {
        const blockProps = useBlockProps({
            className: '',
            'data-fluent-cart-checkout-page-applied-coupon': '',
        });

        return <li { ...props } {...blockProps}>
            <div className="fct_coupon" >
                <div className="fct_coupon_toggle" >
                    <a href="#" data-fluent-cart-checkout-page-coupon-field-toggle="">
                        {blocktranslate('Have a Coupon?')}
                    </a>
                </div>
            </div>
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

export default CheckoutCouponBlock;
