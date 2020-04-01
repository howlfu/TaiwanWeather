'use strict'
const WmHostWeatherApi = require('../api/wm.host.weather.data');
const WmCWBMgr = require('../cwb/wm.cwb.mgr');
const WmGeoGetter = require('../geo/wm.geo.getter');
class WmCoreService {
    constructor() {
        try {
            var configObj = require('../config.json');
            this.api = new WmHostWeatherApi(configObj.Api);
            var parseMgr = new WmCWBMgr(configObj.PareMgr);
            var geoGetter = new WmGeoGetter(configObj.GeoGetter);
            this.api.SetParserMgr(parseMgr);
            this.api.SetGeoGetter(geoGetter);
          } catch (error) {
            console.error('config file not exist!');
          }
          console.timeStamp('config file is exist!');
    }

    Start() {
        this.api.Start();
    }
}

module.exports = WmCoreService;