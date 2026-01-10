import blocktranslate from "@/BlockEditor/BlockEditorTranslator";
import apiFetch from "@wordpress/api-fetch";
import {addQueryArgs} from "@wordpress/url";
import InspectorSettings from "@/BlockEditor/PriceRange/Components/InspectorSettings";
import {useSingleProductData} from "@/BlockEditor/ProductInfo/Context/SingleProductContext";
import {PriceRange} from "@/BlockEditor/Icons";

const {useBlockProps} = wp.blockEditor;
const {registerBlockType} = wp.blocks;
const {useEffect, useState} = wp.element;
const {useSelect} = wp.data;
const {store: blockEditorStore} = wp.blockEditor;

const blockEditorData = window.fluent_cart_price_range_data;
const placeholderImage = blockEditorData.placeholder_image;
const rest = window['fluentCartRestVars'].rest;

registerBlockType(blockEditorData.slug + '/' + blockEditorData.name, {
    title: blockEditorData.title,
    description: blockEditorData.description,
    icon: {
        src: PriceRange,
    },
    category: "fluent-cart",
    attributes: {
        product_id: {
            type: ['string', 'number'],
            default: '',
        },
        query_type: {
            type: 'string',
            default: 'default',
        },
        inside_product_info: {
            type: 'string',
            default: '-',
        }
    },
    edit: ({attributes, setAttributes, clientId}) => {
        const blockProps = useBlockProps();
        const [selectedProduct, setSelectedProduct] = useState({});
        const fetchUrl = rest.url + '/products/' + attributes.product_id;

        const singleProductData = useSingleProductData();

        const isInsideProductInfo = useSelect((select) => {
            const {getBlockParents, getBlockName} = select(blockEditorStore);

            // Get all parent block IDs of this block
            const parents = getBlockParents(clientId);

            // Check if any parent has blockName 'product-info'
            return parents.some((parentId) => getBlockName(parentId) === 'fluent-cart/product-info');
        }, [clientId]);

        setAttributes({inside_product_info: isInsideProductInfo ? 'yes' : 'no'});

        const fetchProduct = () => {
            apiFetch({
                path: addQueryArgs(fetchUrl, {
                    with: ['detail', 'variants']
                }),
                headers: {
                    'X-WP-Nonce': rest.nonce
                }
            }).then((response) => {
                setSelectedProduct(response.product || {});
            }).finally(() => {

            });
        }

        useEffect(() => {
            if (singleProductData?.product) {
                setSelectedProduct(singleProductData.product);
            }
            if (!isInsideProductInfo && attributes.product_id) {
                fetchProduct();
            }
        }, [attributes.product_id, singleProductData?.product]);

        return (
            <div {...blockProps}>
                {!isInsideProductInfo ? (
                    <InspectorSettings
                        attributes={attributes}
                        setAttributes={setAttributes}
                        selectedProduct={selectedProduct}
                        setSelectedProduct={setSelectedProduct}
                    />
                ) : ''}
                
                {selectedProduct?.detail ? (
                    <div className="fct-product-price-range">
                        <span
                            className="price-min"
                            dangerouslySetInnerHTML={{
                                __html: selectedProduct.detail.formatted_min_price
                            }}
                        />

                        {selectedProduct.detail.min_price !== selectedProduct.detail.max_price && (
                            <>
                                {' - '}
                                <span
                                    className="price-max"
                                    dangerouslySetInnerHTML={{
                                        __html: selectedProduct.detail.formatted_max_price
                                    }}
                                />
                            </>
                        )}
                    </div>
                )
                : '$0.00'}
            </div>
              
        );
    },

    save: function (props) {
        return null;
    },
    });
