'use strict'

class WmCoreService {
    constructor() {
        try {
            this._configObj = require('../config.json');
          } catch (error) {
            console.error('config file not exist!');
          }
          console.timeStamp('config file is exist!');
    }

    start() {
        console.info('service start..');
    }
}

module.exports = WmCoreService;