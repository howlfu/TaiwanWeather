var express = require('express');
var https = require('https');
const fs = require('fs');
const checker = require('../helper/hex.checker')
class WmHostWeatherApi {

    constructor(setting) {
        this.port = setting.Port;
        this.isSecure = setting.IsSecure;
        this.app = express();
    }

    SetParserMgr(mgr) {
        this.parserMgr = mgr;
    }

    SetGeoGetter(getter) {
        this.geoGetter = getter;
    }

    Start() {
        this.regResFuncMap();
        if(this.isSecure == true) {
            var path = require('path');
            var appDir = path.dirname(require.main.filename);
            var certFile = path.join(appDir, '/data/ssl/server.pem');
            var certKey = path.join(appDir, '/data/ssl/key.pem');
            var server = https.createServer({
                cert: fs.readFileSync(certFile),
                key: fs.readFileSync(certKey)
            }, this.app);

            server.listen(this.port, function() {
                console.log('runing Web Server in ' + this.port + ' port...');
            }.bind(this));
        } else {
            console.log('start hosting port: ' + this.port);
            this.app.listen(this.port);
        }
        
    }
    
    regResFuncMap(){
        this._registerGetHandlerFunc('/', this.onHandleIndexPage.bind(this));
        this._registerGetHandlerFunc('/weather', this.onHandleWeatherData.bind(this));
        this._registerGetHandlerFunc('/alarm', this.onHandleAlarmData.bind(this));
        this._registerGetHandlerFunc('/geo', this.onHandleLocateData.bind(this));
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

    onHandleLocateData(req, res) {
        var latitude  = req.query.lati;
        var longitude = req.query.long;
        if(!checker.isNonEmptyStr(longitude) || !checker.isNonEmptyStr(latitude)) return res.sendStatus(404);
        this.geoGetter.getByPos(latitude, longitude, function(result) {
            //console.log('區碼: ' + result.code + ' 區域: ' + result.county + result.town);
            res.send(result);
        });
    }

    _registerGetHandlerFunc(res, cb) {
        this.app.get(res, cb);
    }

}
module.exports = WmHostWeatherApi
