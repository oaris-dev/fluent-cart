const { InspectorControls } = wp.blockEditor;
import EditorPanel from "@/BlockEditor/Components/EditorPanel";
import EditorPanelRow from "@/BlockEditor/Components/EditorPanelRow";
import blocktranslate from "@/BlockEditor/BlockEditorTranslator";
import CustomSelect from "@/BlockEditor/Components/CustomSelect";
import SelectProductModal from "@/BlockEditor/Components/ProductPicker/SelectProductModal.jsx";

const InspectorSettings = ({ attributes, setAttributes, selectedProduct, setSelectedProduct }) => {
    return (
        <InspectorControls>
            <div className="fct-inspector-control-wrap fct-inspector-control-wrap--product-card">
                <div className="fct-inspector-control-group">
                    <div className="fct-inspector-control-body">
                        <EditorPanel title={blocktranslate('Product')}>

                            {/* query type */}
                            <EditorPanelRow>
                                <span className="fct-inspector-control-label">
                                    {blocktranslate('Query type')}
                                </span>
                                <div className="actions">
                                    <CustomSelect
                                        customKeys={{
                                            key: 'value',
                                            label: 'label'
                                        }}
                                        defaultValue={attributes.query_type}
                                        options={[
                                            {label: blocktranslate('Default'), value: 'default'},
                                            {label: blocktranslate('Custom'), value: 'custom'},
                                        ]}
                                        onChange={function (value) {
                                            setAttributes({query_type: value});
                                        }}
                                    />
                                </div>
                            </EditorPanelRow>

                            {attributes.query_type === 'custom' && (
                                <EditorPanelRow className="flex-col">

                                    <SelectProductModal
                                       onModalClosed={(selectedProduct) => {
                                            setAttributes({product_id: selectedProduct.ID || ''});
                                            setSelectedProduct(selectedProduct);
                                        }}
                                    />

                                    {selectedProduct?.detail && (
                                        <div className="fct-product-price-range">
                                            <strong>{blocktranslate('Price Range')}</strong>: 
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
                                    )}
                    
                                    {!selectedProduct?.detail && (
                                    <div className="fct-product-price-range">
                                        <strong>{blocktranslate('Price Range')}</strong>: $0.00
                                    </div>
                                    )}                                
                                </EditorPanelRow>
                            )}
                        </EditorPanel>
                    </div>
                </div>
            </div>
        </InspectorControls>
    );
};

export default InspectorSettings;
