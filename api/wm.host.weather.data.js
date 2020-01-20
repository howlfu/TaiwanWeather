var express = require('express');
var WmCWBParser = require('../cwb/wm.cwb.parser');
class WmHostWeatherApi {

    constructor(setting) {
        this.port = setting.Port;
        this.isSecure = setting.IsSecure;
        this.interval = setting.Interval;
        this.app = express();
    }

    SetParserMgr(mgr) {
        this.parserMgr = mgr;
    }

    Start() {
        this.regResFuncMap();
        this.app.listen(this.port);
    }
    
    regResFuncMap(){
        this._registerGetHandlerFunc('/', this.onHandleIndexPage);
        this._registerGetHandlerFunc('/weather', this.onHandleWeatherData);
        this._registerGetHandlerFunc('/alarm', this.onHandleAlarmData);
    }

    onHandleIndexPage() {
        var all = this.parserMgr.All();
        res.send(all);
    }

    onHandleWeatherData() {
        var weather = this.parserMgr.Weather();
        res.send(weather);
    }

    onHandleAlarmData() {
        var alam = this.parserMgr.Alarm();
        res.send(alam);
    }

    _registerGetHandlerFunc(res, cb) {
        this.app.get(res, cb);
    }

}
module.exports = WmHostWeatherApi
var testConfig = {
    "Port": 7123,
    "IsSecure": true
}
var testApi = new WmHostWeatherApi(testConfig);
testApi.Start();