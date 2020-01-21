var express = require('express');
var https = require('https');
const fs = require('fs');
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
