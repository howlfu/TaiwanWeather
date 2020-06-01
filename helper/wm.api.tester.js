'use strict'
const fetch = require('node-fetch');
const https = require('https');

function getGeo() {
    const agent = new https.Agent({rejectUnauthorized: false});
    return new Promise((resolve, reject) => {
        var fetchPath = 'https://weathmeter.hexsave.com:7123/geo?lati=25.024&long=121.522';
        fetch(fetchPath, {
            method: 'get',
            agent: agent
            })
        .then(res => res.json())
        .then(retData => {
            resolve(retData);
            
        })
        .catch(function(err){
            reject(err);
        });
    });
}

for (let index = 0; index < 500; index++) {
    getGeo().then(result => {
        console.log('區碼: ' + result.code + ' 區域: ' + result.county + result.town);
    });   
}