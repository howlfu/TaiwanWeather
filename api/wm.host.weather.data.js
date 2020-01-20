var express = require('express');
class WmHostWeatherApi {

    constructor(setting) {
        this.port = setting.Port;
        this.isSecure = setting.IsSecure;
        this.app = express();
    }

    SetParserMgr(mgr) {
        this.parserMgr = mgr;
    }

    Start() {
        this.regResFuncMap();
        console.log('start hosting port: ' + this.port);
        this.app.listen(this.port);
    }
    
    regResFuncMap(){
        this._registerGetHandlerFunc('/', this.onHandleIndexPage.bind(this));
        this._registerGetHandlerFunc('/weather', this.onHandleWeatherData);
        this._registerGetHandlerFunc('/alarm', this.onHandleAlarmData);
    }

    onHandleIndexPage(req, res) {
        var county = req.query.county;
        var town = req.query.town;
        this.parserMgr.All(county, town)
        .then( data => {
            res.send(data);
        });
    }

    onHandleWeatherData(req, res) {
        var weather = this.parserMgr.Weather();
        res.send(weather);
    }

    onHandleAlarmData(req, res) {
        var alam = this.parserMgr.Alarm();
        res.send(alam);
    }

    _registerGetHandlerFunc(res, cb) {
        this.app.get(res, cb);
    }

}
module.exports = WmHostWeatherApi
