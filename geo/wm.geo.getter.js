'use strict'
const fs = require('fs');
const path = require('path');
const ShpReader = require('shpjs');
class GeoGetter {
    constructor(config) {
        var _this = this;
        this.ready = false;
        var appDir = path.dirname(require.main.filename);
        var mapPath = path.join(appDir, 'data', config.FileName);
        //var mapPath = '../data/mapdata.zip'
        fs.exists(mapPath, function(isExists){
            if(isExists) {
                fs.readFile(mapPath, function(err, mapData) {
                    ShpReader(mapData).then(function(geojson){
                        _this.geojson = geojson;
                        _this.ready = true;
                    });
                });
            }else {
                console.log('file not found', mapPath);
            }
        })
        
    }

    isReady(){
        return this.ready;
    }

    getByPos(latitude, longitude, cb){
        if(this.ready) {
            var allGeo = this.geojson.features;
            var testPoint = [longitude, latitude];
            var bboxIndex = [];
            var location = {};
            for (let index = 0; index < allGeo.length; index++) {
                const geo = allGeo[index];
                let isInPoly = this._pointInBBox(testPoint, geo.geometry.bbox);
                if(isInPoly) {
                    let county = geo.properties.COUNTYNAME;
                    let town = geo.properties.TOWNNAME;
                    let code = geo.properties.TOWNCODE;
                    location.code= code;
                    location.county = county;
                    location.town = town;
                    bboxIndex.push(index);
                }
            }

            if(bboxIndex.length > 1) {
                for (let index = 0; index < bboxIndex.length; index++) {
                    const geo = this.geojson.features[bboxIndex[index]];
                    
                    var isInBoundry = this._pointInPolygon(testPoint, geo.geometry.coordinates[0]);
                    if(isInBoundry) {
                        let county = geo.properties.COUNTYNAME;
                        let town = geo.properties.TOWNNAME;
                        let code = geo.properties.TOWNCODE;
                        //console.log('??????: ' + code + ' ??????: ' + county + town);
                        location.code= code;
                        location.county = county;
                        location.town = town;
                        break;
                    }
                }
            } 
            cb(location)
        } else {
            console.log('wait geoJson ready');
            cb({});
        }
    }

    _pointInBBox(point, BBox) {
        if(BBox == undefined) console.log('bbox is undefined');
        if(BBox.length < 4) console.log('bbox element not enough!');
        let x = point[0],
            y = point[1],
            inside = false;
        var xHigh = BBox[2], xLow = BBox[0], yHigh = BBox[3], yLow = BBox[1];
        if(xHigh < xLow) {
            var tmpX = xHigh;
            xHigh = xLow;
            xLow = tmpX;
        }
        if(yHigh < yLow) {
            var tmpY = yHight;
            yHight = yLow;
            yLow = tmpY;
        }

        if(  xLow <= x && x <= xHigh && yLow <= y && y <= yHigh) {
            inside = !inside; 
        }
        return inside;
    }

    _pointInPolygon(point, polygon) {
        let x = point[0],
            y = point[1];
        var inPoly = false;
      
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          const xi = polygon[i][0], yi = polygon[i][1],
                xj = polygon[j][0], yj = polygon[j][1];
        
          if (((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inPoly = !inPoly;
          }
        }
        return inPoly;
      }


}

module.exports = GeoGetter;

// const tmpGetter = new GeoGetter({'FileName': 'mapdata.zip'});
// var testArry = [["25.024", "121.522"], ["25.0145", "121.461"], ["25.171", "121.447"],
//  ["24.574", "120.877"], ["24.0680263", "121.6150412"], ["23.0284174", "120.264059"], ["24.3182394","120.6894065"]]
// setTimeout(() => {
//     testArry.forEach(testPoint => {
//         tmpGetter.getByPos(testPoint[0], testPoint[1], function(result) {
//             if(Object.keys(result).length > 0)
//                 console.log('??????: ' + result.code + ' ??????: ' + result.county + result.town);
//         });
//     });
// }, 15);