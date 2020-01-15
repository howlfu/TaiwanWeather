'use strict'
const WmCoreService = require('./core/wm.core');

function main() {
  var WmCore = new WmCoreService();
  WmCore.Start();
}

main();