import blocktranslate from "@/BlockEditor/BlockEditorTranslator";

const { useBlockProps } = wp.blockEditor;
const blockEditorData = window.fluent_cart_checkout_data;

const CheckoutOrderSummaryBlock = {
    edit: (props) => {
        const blockProps = useBlockProps();

        return <div { ...props } {...blockProps}>
            <div className="fct_form_section_header" >
                <div data-fluent-cart-checkout-cart-items-toggle="" className="fct_toggle_content">
                    <h4>{blocktranslate('Order summary')}</h4>
                    <div className="fct_toggle_icon" >
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="6" viewBox="0 0 10 6"
                             fill="none">
                            <path
                                d="M1 1L4.29289 4.29289C4.62623 4.62623 4.79289 4.79289 5 4.79289C5.20711 4.79289 5.37377 4.62623 5.70711 4.29289L9 1"
                                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                                strokeLinejoin="round"></path>
                        </svg>
                    </div>
                </div>

                <div className="fct_summary_toggle_total" >
                                    <span className="value" data-fluent-cart-checkout-estimated-total="">
                                        $0.00
                                    </span>
                </div>
            </div>
            <div data-fluent-cart-checkout-item-wrapper="" className="fct_items_wrapper" >
                <div className="fct_line_items" >
                    <div
                        className="fct_line_item fct_product_id_875 fct_item_id_298 fct_item_type_onetime fct_has_image"
                    >
                        <div className="fct_line_item_info" >
                            <div className="fct_item_image" >
                                <a href="#">
                                    <img decoding="async"
                                         src={blockEditorData.placeholder_image}
                                         alt={blocktranslate('Product Image')}/>
                                </a>
                            </div>
                            <div className="fct_item_content" >
                                <div className="fct_item_title" >
                                    {blocktranslate('Product Title')}

                                    <div className="fct_item_variant_title" >
                                        {blocktranslate('%s Variation Title', '–')}
                                    </div>

                                </div>
                            </div>
                        </div>

                        <div className="fct_line_item_price" >
                            <span className="fct_line_item_total">
                                $0.00
                            </span>
                        </div>
                    </div>
                </div>
            </div>
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

export default CheckoutOrderSummaryBlock;
