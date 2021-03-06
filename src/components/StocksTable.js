import React from 'react';
import {Table, Modal, Button, Collapse} from 'antd';
import PropTypes from 'prop-types';
import {bindAll, kebabCase, isEmpty} from 'lodash';
import Item from 'antd/lib/list/Item';
const {Panel} = Collapse;


class StocksTable extends React.Component {

    constructor(props) {
        super(props);
        bindAll(this, ['onRowClick', 'handleOk', 'showModalContent']);
        this.count = 0;
        this.timer = null;
        this.state = {
            exchange: 'nse',
            showModal: false,
            stockitem: {}
        };
    }

    handleOk() {
        this.setState({showModal: false});
    }

    showModalContent() {
        const {stockitem = {}} = this.state;
        let stockURL = `https://economictimes.indiatimes.com/${stockitem.companyName}/stocks/companyid-${stockitem.companyId}.cms`;

        var tableData = Object.keys(stockitem).map((key) => {
            let data = stockitem[key];
            return {'param': key, 'value': data};
        });
        const columns = [
            {
                title: 'Parameter',
                dataIndex: 'param',
                key: 'param',
                sorter: (a, b) => a.param.localeCompare(b.param),
                sortDirections: ['ascend', 'descend']
            },
            {
                title: 'Value',
                dataIndex: 'value',
                key: 'value'
            }
        ];
        return (
            <div>

                <Table
                    dataSource={tableData}
                    columns={columns}
                    pagination={tableData.length > 14}/>
                <a href={stockURL} target="_blank" rel="noopener noreferrer">More Details ></a>
            </div>
        );
    }

    onRowClick(stockitem) {
        this.setState({stockitem, showModal: true});
    }

    render() {
        let {sectionData = [], param, sectionTitle= '', info = '', columns, additionalCols = []} = this.props;
        const {stockitem = {}} = this.state;
        if(isEmpty(sectionData)) {
            return null;
        }
        sectionData = sectionData.map((item) => {
            const {updatedDateTime = ''} = item;
            return {...item,
                updatedDateTime: updatedDateTime.split('|')[0],
                showBgHighlight: new Date().getTime() - new Date(`${(new Date()).toLocaleDateString()} ${updatedDateTime.split('|')[0]}`).getTime() < 500000 ? true : false
            };
        });
        const defaultcolumns = [
            {
                title: 'Company Name',
                dataIndex: 'companyName',
                key: 'companyName',
                // width: 180,
                sorter: (a, b) => a.companyName.localeCompare(b.companyName),
                sortDirections: ['ascend', 'descend']
            },
            {
                title: 'Current Price',
                dataIndex: 'current',
                key: 'current',
                sorter: (a, b) => a.current - b.current
            },
            {
                title: 'Traded Value',
                dataIndex: 'totalTradedValue',
                key: 'totalTradedValue',
                sorter: (a, b) => a.totalTradedValue - b.totalTradedValue
            },
            {
                title: 'Percent Change',
                dataIndex: 'percentChange',
                key: 'percentChange',
                sorter: (a, b) => a.percentChange - b.percentChange
            },
            {
                title: 'Last Updated Time',
                dataIndex: 'updatedDateTime',
                key: 'updatedDateTime',
                defaultSortOrder: 'descend',
                sorter: (a, b) => new Date(`${(new Date()).toLocaleDateString()} ${a.updatedDateTime}`).getTime() > new Date(`${(new Date()).toLocaleDateString()} ${b.updatedDateTime}`).getTime() ? 1 : -1
            }
            // {
            //     title: 'Action',
            //     key: 'action',
            //     width: '100px',
            //     render: (text, record) => (
            //         <div>

            //             <kite-button href="#" data-kite="l96dkdptji64q5ds"
            //                 data-exchange="NSE"
            //                 class="kite-buy"
            //                 title="Buy"
            //                 data-tradingsymbol={record.ticker}
            //                 data-transaction_type="BUY"
            //                 data-quantity="1"
            //                 data-order_type="LIMIT"
            //                 data-price="100">Buy</kite-button>
            //             <kite-button href="#" data-kite="l96dkdptji64q5ds"
            //                 class="kite-sell"
            //                 title="Sell"
            //                 data-exchange="NSE"
            //                 data-tradingsymbol={record.ticker}
            //                 data-transaction_type="SELL"
            //                 data-quantity="1"
            //                 data-order_type="LIMIT"
            //                 data-price="100">SELL</kite-button>
            //         </div>
            //     )
            // }
        ];
        if(param) {
            defaultcolumns.push({
                title: param,
                dataIndex: param,
                key: param,
                defaultSortOrder: 'descend',
                sorter: (a, b) => a[param] - b[param]
            });
        }
        additionalCols.forEach((item) => {
            defaultcolumns.push({
                title: item.name,
                dataIndex: item.dataIndex,
                key: item.dataIndex,
                defaultSortOrder: 'descend',
                sorter: (a, b) => a[item.dataIndex] - b[item.dataIndex]
            });
        });




        return(
            // <Collapse defaultActiveKey={['1']}>
            //     <Panel header="Settings" key="1">
            <div className="sections">
                <div className="section-header">
                    <h3>{sectionTitle}<span className="stock-signify">{info}</span></h3>
                </div>
                <div className="section-body">
                    <Table
                        onRow={(record, rowIndex) => {
                            return {
                                onClick: (e) => this.onRowClick(record)
                            };
                        }}
                        // scroll={{ x: 1500, y: 300 }}
                        rowClassName={(record, index) => record.showBgHighlight ? 'highlight-row': ''}
                        dataSource={sectionData}
                        columns={columns || defaultcolumns}
                        pagination={ {pageSize: 12} }/>
                    <Modal
                        className="field-properties-modal"
                        title= {'Stock Details'}
                        visible={this.state.showModal}
                        onOk={this.handleOk}
                        onCancel={this.handleOk}
                        footer={[
                            <Button key="primary-button" className="primary-button" type="primary" onClick={this.handleOk}>
                                        Ok
                            </Button>
                        ]}
                        destroyOnClose={true}>
                        <div>
                            {this.showModalContent()}
                        </div>
                    </Modal>
                </div>
            </div>
            //     </Panel>
            // </Collapse>
        );

    }
}

StocksTable.propTypes = {};

StocksTable.defaultProps = {};

export default StocksTable;
