

import {func} from 'prop-types';

import stockInitState from '../initialState/stockState';

import {LOAD_OPEN_INTEREST, API_SUFFIX, FETCH_ONLY_BUYERS, MOST_ACTIVE_BY_VALUE, UPDATE_SELECTED_STOCKS,
    FETCH_ONLY_SELLERS, SET_OPEN_INTEREST, RESET_APP, TRACK_SELECTED_STOCKS, UPDATE_REFRESH_RATE} from '../actions/actionTypes';
import {isEmpty} from 'rxjs-compat/operator/isEmpty';

const {SUCCESS} = API_SUFFIX;



const filterOpenInterestUtil = function filterOpenInterestUtil(allOIMap, state) {
    let myMap = {};
    Object.keys(allOIMap).forEach((item) => {
        const value = allOIMap[item];
        if(parseFloat(value['Increase(%)'], 10) > 5 && parseFloat(value['Chg(Rs)Chg (%)'].split(/\s+/g)[1], 10)) {
            myMap[item] = {...allOIMap[item]};
        }
    });
    return myMap;
};

const priceVolumeCriteria = function priceVolumeCriteria(type, item) {
    const {totalTradedValue, aboveDaysLowPerChange, volumeInThousand, bestSellQty,
        bestBuyQty, volume, month6HighPrice, month6LowPrice, current} = item;
    // if((totalTradedValue > 0.01 || volumeInThousand > 20) && (bestBuyQty > volume/2 || bestSellQty > volume/2)) {
    //     if((type === 'gain' && month6HighPrice/1.3 > current) ||
    //         (type === 'loss' && month6LowPrice < current/1.3)) {
    //         return true;
    //     }
    //     // return true;
    // }
    if(totalTradedValue > 0.06 || (type === 'gain' && bestBuyQty*current > 300000) || (type === 'loss' && bestSellQty*current > 300000)) {
        return true;
    }
  
    return false;
};


const extractRelevantParams = function extractRelevantParams(item) {
    return {
        companyName: item.companyName,
        updatedDateTime: item.updatedDateTime,
        current: item.current,
        volume: item.volume,
        percentChange: item.percentChange,
        totalTradedValue: item.totalTradedValue,
        ticker: item.ticker,
        companyId: item.companyId
    };
};

const filterBuyersDataFun = function filterBuyersData(buyersData, state) {
    let {searchresult = []} = buyersData;

    // searchresult.splice(Math.random()*buyersData.pagesummary.totalRecords, 1);
    

    const {dictDataFormat = {}, trackSelectedStocks, selectedStocks = []} = state;
    // const dataLen = pagesummary.totalRecords;
    let removedFromBuyers = {};
    let addedToBuyers = {};
    let latestDictDataFormat = {};

    if(trackSelectedStocks) {
        searchresult = searchresult.filter((item) => selectedStocks.includes(item.ticker));
    }
    
    let onlyBuyersWithHighDemand = searchresult.filter((item) => priceVolumeCriteria('gain', item));

    onlyBuyersWithHighDemand.forEach((item) => {
        latestDictDataFormat[item.ticker] = item;
        const {ticker} = item;
        if(!dictDataFormat[ticker]) {
            addedToBuyers[item.ticker] = extractRelevantParams(item);
        }
    });
    const dictDataFormatKeys = Object.keys(dictDataFormat);
    dictDataFormatKeys.forEach((item) => {
        // item.bestSellQty > 0
        if(!latestDictDataFormat[item]) {
            const getItem = dictDataFormat[item];
            removedFromBuyers[getItem.ticker] = extractRelevantParams(getItem);
        }
    });

    /******* Additional Condition for removed from only buyers */

    const existingOnlyBuyers = Object.keys(state.addedToBuyers);
    existingOnlyBuyers.forEach((item) => {
        // item.bestSellQty > 0
        if(!latestDictDataFormat[item]) {
            const getItem = state.addedToBuyers[item];
            removedFromBuyers[getItem.ticker] = extractRelevantParams(getItem);
        }
    });
    /**************************************************************** */

    if(dictDataFormatKeys.length === 0) {
        addedToBuyers = {};
    }

    return {
        dictDataFormat: latestDictDataFormat,
        removedFromBuyers: {
            ...state.removedFromBuyers,
            ...removedFromBuyers
        },
        addedToBuyers: {
            ...state.addedToBuyers,
            ...addedToBuyers
        },
        onlyBuyersWithHighDemand
    };
};



const filterSellesDataFun = function filterSellesDataFun(sellersData, state) {
    let {searchresult = []} = sellersData;
    // searchresult.splice(Math.random()*sellersData.pagesummary.totalRecords, 1);
    const {dictSellerDataFormat = {}, trackSelectedStocks, selectedStocks = []} = state;
    // const dataLen = pagesummary.totalRecords;
    let removedFromSellers = {};
    let addedToSellers = {};
    let latestDictDataFormat = {};

    if(trackSelectedStocks) {
        searchresult = searchresult.filter((item) => selectedStocks.includes(item.ticker));
    }

    let onlySellersWithHighDemand = searchresult.filter((item) => priceVolumeCriteria('loss', item));

    onlySellersWithHighDemand.forEach((item) => {
        latestDictDataFormat[item.ticker] = item;
        if(!dictSellerDataFormat[item.ticker]) {
            addedToSellers[item.ticker] = extractRelevantParams(item);
        }
    });
    const dictDataFormatKeys = Object.keys(dictSellerDataFormat);
    dictDataFormatKeys.forEach((item) => {
        // item.bestBuyQty > 0
        if(!latestDictDataFormat[item]) {
            const getItem = dictSellerDataFormat[item];
            removedFromSellers[getItem.ticker] = extractRelevantParams(getItem);
        }
    });

    /******* Additional Condition for removed from only sellers */

    const existingOnlySellers = Object.keys(state.removedFromSellers);
    existingOnlySellers.forEach((item) => {
        // item.bestSellQty > 0
        if(!latestDictDataFormat[item]) {
            const getItem = state.removedFromSellers[item];
            removedFromSellers[getItem.ticker] = extractRelevantParams(getItem);
        }
    });
    
    if(dictDataFormatKeys.length === 0) {
        addedToSellers = {};
    }

    return {
        dictSellerDataFormat: latestDictDataFormat,
        removedFromSellers: {
            ...state.removedFromSellers,
            ...removedFromSellers
        },
        addedToSellers: {
            ...addedToSellers,
            ...state.addedToSellers
        },
        onlySellersWithHighDemand
    };
};


const suddenChangeInValue = function suddenChangeInValue(allStocksData, state) {
    let {searchresult = []} = allStocksData;
    let {allStocksScripts = {}, selectedStocks = [], trackSelectedStocks} = state;

    if(trackSelectedStocks) {
        searchresult = searchresult.filter((item) => selectedStocks.includes(item.ticker));
    }

    // searchresult.splice(Math.random()*allStocksData.pagesummary.totalRecords, 1);
    // searchresult = searchresult.slice(1, 10);
    let allVolatileStocks = searchresult.filter((item) => item.totalTradedValue > 0.1 && (item.percentChange > 2 || item.percentChange < -2));

    let newAllStocksScripts = {};
    let totalTradedValue = 0;
    let filterSuddenValueGainer = {};
    let extremeSuddenSell = {};
    let extremeSuddenBuy = {};
    let myHoldings = {};
    let fallInYear = {};

    const onlyTradedStocks = searchresult.filter((item) => item.totalTradedValue > 0.005);
    onlyTradedStocks.forEach((item) => {
        const {ticker} = item;
        // newAllStocksScripts[ticker] = {...item, bestBuyQty: item.bestBuyQty*parseInt((Math.random()*40))};
       
        let buyToSell = null;
        newAllStocksScripts[ticker] = {...item, buyToSellRatio: buyToSell};
        totalTradedValue = totalTradedValue + item.totalTradedValue;
        if(item.volume > (allStocksScripts[ticker] && allStocksScripts[ticker].volume*1.2)) {
            filterSuddenValueGainer[item.ticker] = {...extractRelevantParams(item), buyToSellRatio: buyToSell};
        }


        if(item.current > (allStocksScripts[ticker] && allStocksScripts[ticker].current * 1.05) &&
        //    item.aboveDaysLowPerChange > allStocksScripts[ticker].aboveDaysLowPerChange * 1.03 &&
            item.totalTradedValue > 0.05) {

            extremeSuddenBuy[item.ticker] = {...extractRelevantParams(item), lastPrice: allStocksScripts[ticker].current, currentPrice: item.current};
        }
        if(item.current * 1.05 < (allStocksScripts[ticker] && allStocksScripts[ticker].current) &&
        //    item.belowDaysHighPerChange < allStocksScripts[ticker].belowDaysHighPerChange * 1.03 &&
           item.totalTradedValue > 0.05) {
            extremeSuddenSell[item.ticker] = {...extractRelevantParams(item), lastPrice: allStocksScripts[ticker].current, currentPrice: item.current};
        }


        if((item.current < item.yearHighPrice/2.5 || item.current < item.month6HighPrice/2.5) && item.totalTradedValue > 0.001) {
            fallInYear[item.ticker] = {...extractRelevantParams(item)};
        }

        const myItem = selectedStocks.find((item1) => ticker === item1);
        if(myItem) {
            myHoldings[item.ticker] = {...extractRelevantParams(item)};
        }

    });


    return {
        filterSuddenValueGainer : {
            ...state.filterSuddenValueGainer,
            ...filterSuddenValueGainer
        },
        extremeSuddenBuy : {
            ...state.extremeSuddenBuy,
            ...extremeSuddenBuy
        },
        extremeSuddenSell : {
            ...state.extremeSuddenSell,
            ...extremeSuddenSell
        },
        myHoldings,
        fallInYear,
        allVolatileStocks,
        allStocksScripts: {...newAllStocksScripts},
        totalTradedValue

    };
};

export default function sampleReducer(alias, initialState = {}) {
    return (state = initialState, action) => {
        switch (action.type) {
            case FETCH_ONLY_BUYERS:
            case FETCH_ONLY_SELLERS:
            case MOST_ACTIVE_BY_VALUE:
            case LOAD_OPEN_INTEREST:
                return Object.assign({}, {
                    ...state,
                    loading:true
                });
            case RESET_APP: {
                return Object.assign({}, {
                    ...stockInitState
                });
            }

            case UPDATE_SELECTED_STOCKS: {
                return Object.assign({}, {
                    ...state,
                    selectedStocks: action.payload.selectedStocks
                });
            }

            case TRACK_SELECTED_STOCKS: {
                return Object.assign({}, {
                    ...state,
                    trackSelectedStocks: action.payload
                });
            }

            case UPDATE_REFRESH_RATE: {
                return Object.assign({}, {
                    ...state,
                    refreshRate: action.payload
                });
            }
            case `${LOAD_OPEN_INTEREST}${SUCCESS}`:
                return Object.assign({}, {
                    ...state,
                    loading: false,
                    initData: action.payload
                });
            case `${FETCH_ONLY_BUYERS}${SUCCESS}`:

                var filterBuyersData = filterBuyersDataFun(action.payload, state);

                return Object.assign({}, {
                    ...state,
                    loading: false,
                    ...filterBuyersData,
                    onlyBuyersData: action.payload
                });
            case `${FETCH_ONLY_SELLERS}${SUCCESS}`:

                var filterSellersData = filterSellesDataFun(action.payload, state);

                return Object.assign({}, {
                    ...state,
                    loading: false,
                    ...filterSellersData,
                    onlySellersData: action.payload
                });
            case SET_OPEN_INTEREST:
                var filterOpenInterest = filterOpenInterestUtil(action.payload, state);
                return Object.assign({}, {
                    ...state,
                    openInterest: action.payload,
                    filterOpenInterest
                });
            case `${MOST_ACTIVE_BY_VALUE}${SUCCESS}`:

                var suddenValueChange = suddenChangeInValue(action.payload, state);
                var itemKeys = Object.keys(action.payload.searchresult[0]);
                return Object.assign({}, {
                    ...state,
                    loading: false,
                    ...suddenValueChange,
                    mostActiveByValueAllStocks: action.payload,
                    itemKeys
                });
            default:
                return state;
        }
    };
}

