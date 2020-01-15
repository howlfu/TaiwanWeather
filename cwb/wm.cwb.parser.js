'use strict'
const WmResType = require('./data/wm.res.type');
const WmCwbElementType = require('./data/wm.cwb.element.type');
const fetch = require('node-fetch');
const https = require('https');
class WmCWBParser {
    constructor(config) {
        if(config != undefined && config != null) {
            this.CWBPath = config.path;
            this.Auth = config.auth;
        }
        this.init();
    }

    SetPath(path) {
        this.CWBPath = path;
    }

    GetTown(county, town, cb) {
        if(county in WmResType) {
            var _this = this;
            async function getAllData() {
                var weatherDetail = await _this._getWeather(town, WmResType[county]);
                var pm25 = await _this._getPm25(county, town);
                if(weatherDetail != null && weatherDetail != undefined) {
                    weatherDetail.pm25 = pm25;
                }
                cb(weatherDetail);
            }
            getAllData();
            
        } else {
            console.log('incorrect count name');
        }
    }

    init() {
        this._checkIfApiReady();
    }

    _checkIfApiReady() {
        this._getWeather(null, WmResType['台北市'])
        .then((data) => {
            if(data != null && data != undefined) {
                if(Object.keys(data).length > 0) {
                    console.log('Api is ready');
                }
            }
        }).catch(function(err) {
            console.log(err.message);
        });
    }

    _getWeather(area, type) {
        var _this = this;
        return new Promise((resolve, reject) => {
            var fetchPath = this.CWBPath + type;
            fetchPath =  fetchPath + '?' + 'Authorization=' + this.Auth;
            var fetchByLocation = fetchPath;
            if(area != null && area != undefined) {
                fetchByLocation = fetchPath + '&' + 'locationName=' + encodeURIComponent(area);
            }
            fetch(fetchByLocation, {
                method: 'get',
                })
            .then(res => res.json())
            .then(retData => {
                var resolveData = {};
                try {
                    if(retData.records.locations[0].location.length != 0) {
                        var allWeatherElement = retData.records.locations[0].location[0].weatherElement;
                        resolveData = _this._getWeatherFactors(allWeatherElement);
                        resolve(resolveData);
                    } else {
                        fetch(fetchPath, {
                            method: 'get',
                            })
                        .then(res => res.json())
                        .then(retData => {
                            var allWeatherElement = retData.records.locations[0].location[0].weatherElement;
                            resolveData = _this._getWeatherFactors(allWeatherElement);
                            resolve(resolveData);
                        });
                    }
                    
                } catch (error) {
                    reject(error);
                }
            })
            .catch(function(err){
                reject(err);
            });
        });
    }

    _getPm25(county, site) {
        const agent = new https.Agent({rejectUnauthorized: false});
        return new Promise((resolve, reject) => {
            var fetchPath = 'https://opendata.epa.gov.tw/ws/data/aqi/?$format=json';
            fetch(fetchPath, {
                method: 'get',
                agent: agent
                })
            .then(res => res.json())
            .then(retData => {
                var pm25 = {};
                for(var i = 0; i < retData.length; i ++) {
                    var countyDetail = retData[i];
                    if(countyDetail.County == county) {
                        pm25[countyDetail.SiteName] = countyDetail['PM2.5'];
                    }
                }
                var siteString = site.replace('縣','').replace('市','').replace('區','');;
                if(siteString in pm25) {
                    try {
                        var intVal = parseInt(pm25[siteString]);
                        resolve(intVal)
                    } catch (error) {
                        resolve(0);
                    }
                }
                else {
                    var result = 0;
                    var pm25Array = Object.keys(pm25);
                    if(pm25Array.length != 0){
                        var allSum = 0;
                        pm25Array.forEach(function(pm){
                            try {
                                var intVal = parseInt(pm25[pm]);
                                allSum = allSum + intVal;
                            } catch (error) {
                            }
                        });
                        result = Math.round(allSum / pm25Array.length);
                    }
                    resolve(result);
                }
            })
            .catch(function(err){
                reject(err);
            });
        });
    }

    _getWeatherFactors(allWeatherElement) {
        var retData = {};
        var allWxs = allWeatherElement[WmCwbElementType.WX].time;
        var wxsElement = this._getCurrentDataIndex(allWxs);
        retData.desc = wxsElement[0].value;
        var allT = allWeatherElement[WmCwbElementType.T].time;
        var tElement = this._getCurrentDataIndex(allT);
        retData.temp = tElement[0].value + '度C';
        var allRH = allWeatherElement[WmCwbElementType.RH].time;
        var RHElement = this._getCurrentDataIndex(allRH);
        retData.humi = RHElement[0].value + '%';
        var allPop6 = allWeatherElement[WmCwbElementType.POP6].time;
        var Pop6Element = this._getCurrentDataIndex(allPop6);
        retData.rain = Pop6Element[0].value + '%';
        return retData;
    }

    _getCurrentDataIndex(allData) {
        if(allData == null || allData == undefined) return;
        var isDuration = false;
        if('startTime' in allData[0]) isDuration = true;
        var currentDate =  Date.now();
        var allDataLen = Object.keys(allData).length;
        for(var i = 0; i < allDataLen; i++) {
            if(isDuration) {
                var startTime = Date.parse(allData[i].startTime);
                var endTime = Date.parse(allData[i].endTime);
                if(startTime < currentDate && currentDate < endTime) {
                    return allData[i].elementValue;
                }
            } else {
                if (i == allDataLen - 1) break;
                var startTime = Date.parse(allData[i].dataTime);
                var endTime = Date.parse(allData[i + 1].dataTime);
                if(startTime < currentDate && currentDate < endTime) {
                    return allData[i].elementValue;
                }
            }
        }
    }

}

module.exports = WmCWBParser
// var config = {
//     "path": "https://opendata.cwb.gov.tw/api/v1/rest/datastore/",
//     "auth": "CWB-7BB8EDCA-6853-4E86-89E2-6E846B7986DB"
// }
// var testParser = new WmCWBParser(config);
// // testParser.GetTown('臺北市', '中正區', function(data) {
// //     console.log(data);
// // });
// testParser.GetTown('臺北市', '古亭', function(data) {
//     console.log(data);
// });
// testParser.GetTown('台灣市', '古亭', function(data) {
//     console.log(data);
// });

// var tmpData = {
//     0: {dataTime: "2020-01-14 12:00:00", elementValue: Array(1)},
//     1: {dataTime: "2020-01-14 15:00:00", elementValue: Array(1)},
//     2: {dataTime: "2020-01-14 18:00:00", elementValue: Array(1)},
//     3: {dataTime: "2020-01-14 21:00:00", elementValue: Array(1)},
//     4: {dataTime: "2020-01-15 00:00:00", elementValue: Array(1)},
//     5: {dataTime: "2020-01-15 03:00:00", elementValue: Array(1)},
//     6: {dataTime: "2020-01-15 06:00:00", elementValue: Array(1)},
//     7: {dataTime: "2020-01-15 09:00:00", elementValue: Array(1)},
//     8: {dataTime: "2020-01-15 12:00:00", elementValue: Array(1)},
//     9: {dataTime: "2020-01-15 15:00:00", elementValue: Array(1)},
//     10: {dataTime: "2020-01-15 18:00:00", elementValue: Array(1)},
//     11: {dataTime: "2020-01-15 21:00:00", elementValue: Array(1)},
//     12: {dataTime: "2020-01-16 00:00:00", elementValue: Array(1)},
//     13: {dataTime: "2020-01-16 03:00:00", elementValue: Array(1)},
//     14: {dataTime: "2020-01-16 06:00:00", elementValue: Array(1)},
//     15: {dataTime: "2020-01-16 09:00:00", elementValue: Array(1)},
//     16: {dataTime: "2020-01-16 12:00:00", elementValue: Array(1)},
//     17: {dataTime: "2020-01-16 15:00:00", elementValue: Array(1)},
//     18: {dataTime: "2020-01-16 18:00:00", elementValue: Array(1)},
//     19: {dataTime: "2020-01-16 21:00:00", elementValue: Array(1)},
//     20: {dataTime: "2020-01-17 00:00:00", elementValue: Array(1)},
//     21: {dataTime: "2020-01-17 03:00:00", elementValue: Array(1)},
//     22: {dataTime: "2020-01-17 06:00:00", elementValue: Array(1)},
//     23: {dataTime: "2020-01-17 09:00:00", elementValue: Array(1)}
// }

// var tmpData = {
//     0: {startTime: "2020-01-14 12:00:00", endTime: "2020-01-14 15:00:00", elementValue: Array(2)},
//     1: {startTime: "2020-01-14 15:00:00", endTime: "2020-01-14 18:00:00", elementValue: Array(2)},
//     2: {startTime: "2020-01-14 18:00:00", endTime: "2020-01-14 21:00:00", elementValue: Array(2)},
//     3: {startTime: "2020-01-14 21:00:00", endTime: "2020-01-15 00:00:00", elementValue: Array(2)},
//     4: {startTime: "2020-01-15 00:00:00", endTime: "2020-01-15 03:00:00", elementValue: Array(2)},
//     5: {startTime: "2020-01-15 03:00:00", endTime: "2020-01-15 06:00:00", elementValue: Array(2)},
//     6: {startTime: "2020-01-15 06:00:00", endTime: "2020-01-15 09:00:00", elementValue: Array(2)},
//     7: {startTime: "2020-01-15 09:00:00", endTime: "2020-01-15 12:00:00", elementValue: Array(2)},
//     8: {startTime: "2020-01-15 12:00:00", endTime: "2020-01-15 15:00:00", elementValue: Array(2)},
//     9: {startTime: "2020-01-15 15:00:00", endTime: "2020-01-15 18:00:00", elementValue: Array(2)},
//     10: {startTime: "2020-01-15 18:00:00", endTime: "2020-01-15 21:00:00", elementValue: Array(2)},
//     11: {startTime: "2020-01-15 21:00:00", endTime: "2020-01-16 00:00:00", elementValue: Array(2)},
//     12: {startTime: "2020-01-16 00:00:00", endTime: "2020-01-16 03:00:00", elementValue: Array(2)},
//     13: {startTime: "2020-01-16 03:00:00", endTime: "2020-01-16 06:00:00", elementValue: Array(2)},
//     14: {startTime: "2020-01-16 06:00:00", endTime: "2020-01-16 09:00:00", elementValue: Array(2)},
//     15: {startTime: "2020-01-16 09:00:00", endTime: "2020-01-16 12:00:00", elementValue: Array(2)},
//     16: {startTime: "2020-01-16 12:00:00", endTime: "2020-01-16 15:00:00", elementValue: Array(2)},
//     17: {startTime: "2020-01-16 15:00:00", endTime: "2020-01-16 18:00:00", elementValue: Array(2)},
//     18: {startTime: "2020-01-16 18:00:00", endTime: "2020-01-16 21:00:00", elementValue: Array(2)},
//     19: {startTime: "2020-01-16 21:00:00", endTime: "2020-01-17 00:00:00", elementValue: Array(2)},
//     20: {startTime: "2020-01-17 00:00:00", endTime: "2020-01-17 03:00:00", elementValue: Array(2)},
//     21: {startTime: "2020-01-17 03:00:00", endTime: "2020-01-17 06:00:00", elementValue: Array(2)},
//     22: {startTime: "2020-01-17 06:00:00", endTime: "2020-01-17 09:00:00", elementValue: Array(2)},
//     23: {startTime: "2020-01-17 09:00:00", endTime: "2020-01-17 12:00:00", elementValue: Array(2)}
// }

// var element = testParser._getCurrentDataIndex(tmpData);


