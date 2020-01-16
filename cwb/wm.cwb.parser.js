'use strict'
const WmResType = require('./data/wm.res.type');
const WmCwbElementType = require('./data/wm.cwb.element.type');
const WmAlertPathType = require('./data//wm.alert.path.type');
const WmAlertResultType = require('./data/wm.alert.result.type');
const fetch = require('node-fetch');
const https = require('https');
class WmCWBParser {
    constructor(config) {
        if(config != undefined && config != null) {
            this.debug = config.IsDebug;
            this.CWBPath = config.CWBPath;
            this.alertPath = config.AlertPath;
            this.auth = config.Auth;
        }
        this.init();
    }

    SetCWBPath(path) {
        this.CWBPath = path;
    }

    SetalertPath(path) {
        this.alertPath = path;
    }

    GetWether(county, town, cb) {
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

    GetAlarmSet(county, town, cb) {
        var _this = this;
        async function getAllData() {
            var alertSet = await _this._getAlertSet(county, town);
            var suspend = await _this._getSuspend(county);
            cb(alertSet);
        }
        getAllData();
        
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
            fetchPath =  fetchPath + '?' + 'Authorization=' + this.auth;
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
        retData.temperature = tElement[0].value + '度C';
        var allRH = allWeatherElement[WmCwbElementType.RH].time;
        var RHElement = this._getCurrentDataIndex(allRH);
        retData.humidity = RHElement[0].value + '%';
        var allPop6 = allWeatherElement[WmCwbElementType.POP6].time;
        var Pop6Element = this._getCurrentDataIndex(allPop6);
        retData.rain_chance = Pop6Element[0].value + '%';
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

    _getAlertSet(county, town) {
        var _this = this;
        return new Promise((resolve, reject) => {
            var alertDetail = [], tmpAlertDetail = [];
            var len = Object.keys(WmAlertPathType).length;
            var count = 1;
            var currentDate = new Date();
            Object.keys(WmAlertPathType).forEach(type => {
                _this._getAlertSingle(WmAlertPathType[type])
                .then( alertData => {
                    var alertTime = new Date(alertData.updated);
                    var parsedData = _this._parseSum(alertData.summary['#text'], type, county, town);
                    if(parsedData != null) {
                        if(alertTime.getFullYear() == currentDate.getFullYear() &&
                            alertTime.getMonth() == currentDate.getMonth() &&
                            alertTime.getDate() == currentDate.getDate()) {
                                alertDetail.push(parsedData);
                        }
                        tmpAlertDetail.push(parsedData);
                    }
                    if(count == len) {
                        if(alertDetail.length == 0 && this.debug == true) {
                            alertDetail = tmpAlertDetail;
                        }
                        resolve(alertDetail);
                    }
                    count ++;
                }).catch(err => {
                    reject(err);
                });
            });
        });
    }

    _getAlertSingle(type) {
        //https://alerts.ncdr.nat.gov.tw/JSONAtomFeed.ashx?AlertType=
        var path = this.alertPath + '?AlertType=' + type;
        return new Promise((resolve, reject) => {
            fetch(path, {
                method: 'get',
                })
            .then(res => res.json())
            .then(retData => {
                var lastData = retData.entry[retData.entry.length - 1];
                resolve(lastData);
            }).catch(err => {
                reject(err);
            });
        });
    }

    _parseSum(sumData, type, county, town) {
        var result = {
            'type' :  WmAlertResultType[type]
        };
        switch (WmAlertPathType[type]) {
            case WmAlertPathType.TYPHOON:
                if(sumData.includes('最後一次報告')) return null;
                var tyType = '';
                if(sumData.includes('熱帶低氣壓')) tyType = '熱帶低氣壓';
                else if(sumData.includes('輕度颱風')) tyType = '輕度颱風';
                else if(sumData.includes('中度颱風')) tyType = '中度颱風';
                else if(sumData.includes('強烈颱風')) tyType = '強烈颱風';
                var nameIndex = sumData.indexOf( tyType + ' ') + tyType.length + 1;
                var tmpString1 = sumData.substr(nameIndex, sumData.length);
                result.title = tmpString1.substr(0, tmpString1.indexOf('（'));
                var speedIndex1 = tmpString1.indexOf('相當於 ') + 4;
                var tmpString2 = tmpString1.substr(speedIndex1, tmpString1.length);
                var centerSpeed = tmpString2.substr(0, tmpString2.indexOf(' '));
                var speedIndex2 = tmpString2.indexOf('相當於 ') + 4;
                var tmpString3 = tmpString2.substr(speedIndex2, tmpString2.length);
                var maxSpeed = tmpString3.substr(0, tmpString3.indexOf(' '));
                result.desc = tyType + '\n' + centerSpeed + '-' + maxSpeed + '級';
                break;
            case WmAlertPathType.MUD:
                var mud = '土石流';
                var levelIndex = sumData.indexOf('警戒');
                var lvlString = sumData.substr(levelIndex - 2, 4);
                result.title = mud;
                result.desc = mud + lvlString;
                break;
            case WmAlertPathType.FLOOD:
                var area = '';
                if(sumData.indexOf(county) > 0) area = county;
                if(sumData.indexOf(town) > 0) area = town;
                if(area == '') return null;
                var flood = '淹水';
                var levelIndex = sumData.indexOf('警戒');
                var lvlString = sumData.substr(levelIndex - 2, 4);
                result.title = flood;
                result.desc = area + '\n' + lvlString;
                break;
            case WmAlertPathType.RAIN:
                var countyS = county.replace('縣','').replace('市','');
                if(sumData.indexOf(countyS) < 0) return null;
                result.title = '降雨';
                result.desc = county + '\n' + '可能局部大雨';
                break;
            case WmAlertPathType.COLD:
                var coldIndex = sumData.indexOf('局部地區有') + 5;
                var tmpString = sumData.substr(coldIndex, sumData.length - coldIndex);
                var coldString = sumData.substr(coldIndex , tmpString.indexOf('氣溫'));
                result.title = '低溫';
                result.desc =  '全台局部地區\n' + coldString;
                break;
            case WmAlertPathType.WIND:
                var countyS = county.replace('縣','').replace('市','');
                if(sumData.indexOf(countyS) < 0) return null;
                var windIndex = sumData.indexOf('空曠地區') + 4;
                var tmpString = sumData.substr(windIndex, sumData.length - windIndex);
                var windString = sumData.substr(windIndex , tmpString.indexOf('，'));
                result.title = '強風';
                result.desc =  '部分地區' + windString;
                break;    
            case WmAlertPathType.FOG:
                var countyS = county.replace('縣','').replace('市','');
                if(sumData.indexOf(countyS) < 0) return null;
                var fogIndex = sumData.indexOf('能見度不足') + 5;
                var tmpString = sumData.substr(fogIndex, sumData.length - fogIndex);
                var fogString = sumData.substr(fogIndex , tmpString.indexOf('，'));
                result.title = '濃霧';
                result.desc =  countyS + '部分區域\n能見度不足' + fogString;
                break;
            case WmAlertPathType.THUNDER:
                var thunderIndex = sumData.indexOf('持續時間') + 4;
                var tmpString = sumData.substr(thunderIndex, sumData.length - thunderIndex);
                var thunderString = sumData.substr(thunderIndex , tmpString.indexOf('；'));
                result.title = '雷雨';
                result.desc = thunderString.replace(/\s/g, '') ;
                break
            default:
                break;
        }
        return result;
    }

    _getSuspend(count) {

    }

}

module.exports = WmCWBParser
// var config = {
//     "IsDebug": true,
//     "CWBPath": "https://opendata.cwb.gov.tw/api/v1/rest/datastore/",
//     "AlertPath": "https://alerts.ncdr.nat.gov.tw/JSONAtomFeed.ashx",
//     "Auth": "CWB-7BB8EDCA-6853-4E86-89E2-6E846B7986DB",
// }
// var testParser = new WmCWBParser(config);
// testParser.GetAlarmSet('宜蘭縣', '冬山鄉', function(data) {
//         console.log(data);
//     });
//var typhoonString = "1SEA18MITAG米塔2019-09-29T00:00:00+00:0018.30,126.802835980150輕度颱風SEVERE TROPICAL STORM2019-09-30T00:00:00+00:0021.40,123.503848960180輕度颱風 米塔（國際命名 MITAG）29日8時的中心位置在北緯 18.3 度，東經 126.8 度，即在臺\n北的東南方約 920 公里之海面上。中心氣壓 980 百帕，近中心最大風速每秒 28 公尺（約每小時 101 公里），相當於 10 級風，瞬\n間最大陣風每秒 35 公尺（約每小時 126 公里），相當於 12 級風，七級風暴風半徑 150 公里，\n十級風暴風半徑 – 公里。以每小時24公里速度，向西北進行，預測30日8時的中心位置在北緯 21.4 度，東經 123.5 度，即\n在臺北的南南東方約 450 公里之海面上。根據最新氣象資料顯示，第18號颱風過去3小時強度略為增強，目前中心在臺北東南方海面，向西\n北移動，其暴風圈朝巴士海峽接近，對巴士海峽及臺灣東南部海面(含蘭嶼、綠島)將構成威脅。預\n計此颱風未來強度有再增強且暴風圈有擴大的趨勢。臺灣東南部海面(含蘭嶼、綠島)、巴士海峽航行及作業船隻應嚴加戒備。颱風外圍環流影響，易有短時強降雨，今(29)日宜蘭縣、大臺北山區及基隆北海岸有局部大雨或豪\n雨，桃園、花蓮地區及大臺北平地有局部大雨發生的機率，請注意雷擊及強陣風，山區請慎防坍方\n、落石及溪水暴漲，低窪地區請慎防淹水。＊颱風外圍環流影響，臺灣附近各沿地區易有較強陣風，鄰近海域風浪明顯偏大，前往海邊活動請\n注意安全。\n＊本警報單之颱風半徑為平均半徑，第18號颱風之7級風暴風半徑東北象限約180公里，西南象限約\n 120公里，其他象限約150公里，平均半徑約為120公里。";
//var result = testParser._parseSum(typhoonString, 'TYPHOON');
// var mudString = "依據中央氣象局風雨資料研判：計77條土石流潛勢溪流達黃色警戒(相關詳細土石流警戒資訊請上土石流防災資訊網( http://246.swcb.gov.tw/ )查詢)";
// var result = testParser._parseSum(mudString, 'MUD');
// var floodString = "水利署訊:宜蘭縣冬山鄉淹水二級警戒(冬山站1小時雨量40.5mm) ,如持續降雨轄內易淹水村里及道路可能3小時內開始積淹水(如：冬山鄉-補城村,武淵村,珍珠村,三奇村,太和村,八寶村,丸山村,安平村,香和村,大進村,中山村)，建請即時注意淹水通報及應變，低窪地區及道路請特別注意防範積淹水。";
// var result = testParser._parseSum(floodString, 'FLOOD', '宜蘭縣', '冬山鄉');
// var rainString = '\n南方雲系北移，今（２９）日雲林、嘉義、臺南及澎湖地區有局部大雨發生的機率，請注意。\n        ';
// var result =  testParser._parseSum(rainString, 'RAIN', '雲林縣', '測試區');
// var coldString = '\n一、概述\n大陸冷氣團影響，中部以北及東北部氣溫偏低。今(14日)清晨至上午局部地區有10度以下氣溫(黃色燈號)發生的機率，請注意。\n\n二、今(14日)晨至今(14日)上午低溫區域\n[黃色燈號(寒冷)]\n新竹縣、苗栗縣有10度以下氣溫發生的機率，請注意。\n\n三、注意事項\n注意保暖及日夜溫差，使用瓦斯熱水器及電暖器具應注意室內通風及用電安全；留意早晚低溫導致之呼吸道及心血管疾病，關懷老人、遊民及弱勢族群避寒措施；農作物及水產養殖業注意寒害。\n\n註1：連江縣由於地理及氣候因素，氣溫門檻值為其他地區值減4度。\n        ';
// var result =  testParser._parseSum(coldString, 'COLD', '雲林縣', '測試區');
// var wind = "\n東北風明顯偏強，今（２６日）晚起臺南以北、東半部（含蘭嶼、綠島）、恆春半島及澎湖、金門、馬祖沿海空曠地區易有８至１０級強陣風，臺灣（含各離島）沿海及鄰近海域風浪明顯偏大，海邊活動請注意安全。\n        ";
// var result =  testParser._parseSum(wind, 'WIND', '雲林縣', '測試區');
// var fog = '\n今（１１）日馬祖、金門及西半部地區易有局部霧或低雲影響能見度，目前嘉義地區（４時３５分）有濃霧發生，能見度不足２００公尺，請注意。\n        ';
// var result =  testParser._parseSum(fog, 'FOG', '嘉義縣', '測試區');
// var thunder = "108 年 9 月 27 日 23 時 11 分 氣象局發布大雷雨即時訊息，持續時間至 1 時 15 分；請慎防劇烈降雨、雷擊，坍方、落石、土石流，低窪地區慎防淹水";
// var result =  testParser._parseSum(thunder, 'THUNDER', '嘉義縣', '測試區');
// console.log(result);
// // testParser.GetWether('臺北市', '中正區', function(data) {
// //     console.log(data);
// // });
// testParser.GetWether('臺北市', '古亭', function(data) {
//     console.log(data);
// });
// testParser.GetWether('台灣市', '古亭', function(data) {
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


