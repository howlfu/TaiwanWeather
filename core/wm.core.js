'use strict'
const WmHostWeatherApi = require('../api/wm.host.weather.data');
const WmCWBMgr = require('../cwb/wm.cwb.mgr');
class WmCoreService {
    constructor() {
        try {
            var configObj = require('../config.json');
            this.api = new WmHostWeatherApi(configObj.Api);
            var parseMgr = new WmCWBMgr(configObj.PareMgr);
            this.api.SetParserMgr(parseMgr);
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