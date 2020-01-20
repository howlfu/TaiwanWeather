
var WmCWBParser = require('./wm.cwb.parser');
var allArea = require('../data/wm.area.code.json');
class WmCWBMgr{
    constructor(config) {
        this.interval = config.Interval;
        this.parser = new WmCWBParser(config.Cwb);
        this.cache = {};
    }

    Start() {
        //var loopInter = this.interval * 60000;
        //var _this = this;
        // this.readyInterval = setInterval(() => {
        //     if(this.parser.IsReady()) {
        //         clearInterval(this.readyInterval);
        //         _this.All();
        //     }
        // }, 5000);
        // setInterval(() => {
        //     _this.All();
        // }, loopInter);
    }

    Weather(county, town) {
        return this._checkCache(county, town, 'weather');
    }

    Alarm() {
        return this._checkCache(county, town, 'alarm_set');
    }

    All(county, town) {
        var _this = this;
        return new Promise(async (resolve, reject) => {
            var result = {};
            result.weather = await _this._getWeather(county, town);
            result.alarm_set = await _this._getAlert(county, town);
            resolve(result);
        })
    }

    // All() {
    //     this.cache = {}
    //     Object.keys(allArea).forEach(async function(code) {
    //         var county = allArea[code].AreaCounty;
    //         var town = allArea[code].AreaTown;
    //         if(!(county in this.cache)) {
    //             this.cache[county] = [];
    //         }
    //         var cacheDetail = {};
    //         cacheDetail.town = town;
    //         cacheDetail.weather = await this._getWeather(county, town);
    //         cacheDetail.alarm_set = await this._getAlert(county, town);
    //         this.cache[county].push(cacheDetail);
    //     }.bind(this));

    // }

    Stop() {
        this.cache = {};
    }

    _checkCache(county, town, type) {
        if(Object.keys(this.cache).length > 0) {
            if(county in this.cache) {
                var allArea = this.cache[county];
                if(allArea.length > 0) {
                    allArea.forEach(area => {
                        if(area.town == town) return area[type];
                    });
                }
            }
        }
    }

    _getWeather(county, town) {
        return new Promise(resolve => {
            this.parser.GetWeather(county, town, (result) => {
                resolve(result)
            });
        });
    }
    
    _getAlert(county, town) {
        return new Promise(resolve => {
            this.parser.GetAlertSet(county, town, (result) => {
                resolve(result);
            });
        });
    }
}

module.exports = WmCWBMgr;

// var testConfig = {
//     "Cwb": {
//         "IsDebug": true,
//         "CWBPath": "https://opendata.cwb.gov.tw/api/v1/rest/datastore/",
//         "AlertPath": "https://alerts.ncdr.nat.gov.tw/JSONAtomFeed.ashx",
//         "SuspendPath": "https://www.dgpa.gov.tw/typh/daily/nds.html",
//         "Auth": "CWB-7BB8EDCA-6853-4E86-89E2-6E846B7986DB"
//     },
//     "Api": {
//         "Port": 7123,
//         "IsSecure": true
//     },
//     "Interval": 5
// };

// var testMgr = new WmCWBMGr(testConfig);
// setTimeout(() => {
//     testMgr.All('臺北市', '中正區').then( ret => {
//         console.log(ret);
//     })
    
// }, 5000);