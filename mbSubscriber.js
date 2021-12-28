/* mbSubscriber.js
*
*  SPDX-FileCopyrightText: Copyright 2021 Fabbio Protopapa
*  SPDX-License-Identifier: MIT
*
*  ToDo: 
*        - Store or retrieve index to work with reloaded instances
*/

const streams = require('./node/streams');
streams.set_panic_hook();

const fs = require('fs');
const path = require('path');
const configPath = './config/default.json';
const config = require(configPath);

var util = require('./utils');

module.exports = {
    makeSubscriber,
    subscripeToChannel,
    receiveAnnouncement,
    sendSubscribtionLink,
    getAnnouncementLink,
    makeSubLinkJson,
    getAuthorDID,
    receiveKeyload
}

// Generate Subscriber
function makeSubscriber(client, filename) {
    // Generate Subscriber
    // Check for existing subscriber
    filename = util.checkFileExtension(filename, '.bin');
    let subPasswd = util.getEncryptPasswd();
    let dirPath = util.buildPath(config.dir.bin);
    let isSubInstance = util.isEncryptedBinary(filename, dirPath);
    if (!isSubInstance || config.caller.setSeed) {
        // Generate new seed 
        var seed = util.makeSeed(81);
        console.log("New seed for subscriber created.");
        // Generating subscriber
        var sub = streams.Subscriber.fromClient(
                                                streams.StreamsClient.fromClient(client), 
                                                seed);
        
        let expSub = sub.clone().export(subPasswd);
        fs.writeFileSync(path.join(dirPath, filename), expSub, 'binary');
        console.log("Subscriber instance exported: ", filename);
        } else {
        // Load existing seed
        impSub = new Uint8Array(fs.readFileSync(path.join(dirPath, filename)));
        var sub = streams.Subscriber.import(
                                            streams.StreamsClient.fromClient(client), 
                                            impSub, 
                                            subPasswd);
        console.log("Loaded subscriber instance from binary.");
        }
    return sub;
}

// Subscribe to channel -> Return subscribtion link
async function subscripeToChannel(announcementLink, subscriber) {
    // catch timeout
    console.log("--------------");
    console.log("Subscribing...");
    console.log("--------------");
    response = await subscriber.clone().send_subscribe(announcementLink.copy());
    subLink = response.link
    console.log("-------------------------------------------------------------");
    console.log("Subscription message at: ", subLink.toString());
    console.log("Subscription message index: " + subLink.toMsgIndexHex());
    console.log("-------------------------------------------------------------");
    return subLink;
}

// Subscriber receiving announcement
async function receiveAnnouncement(announcementLink, subscriber) {
    await subscriber.clone().receive_announcement(announcementLink.copy());
}    

function sendSubscribtionLink(url, port, dataJson, protocol='https') {
    return util.postRequest(url, port, '/sub', dataJson, protocol).then((status) => {
        const response = {
            statusCode: status
        };
    return response;
    }).catch(e => { 
        return response = {
            statusCode: e
        };
    }); 
}

function getAnnouncementLink (url, port, protocol='https', link='/ann') {
    return util.getRequest(url, port, link, protocol).then((data) => {
        const response = {
            statusCode: 200,
            body: data
        };
      return response;
    }).catch(e => { 
        return response = {
            statusCode: e,
            body: 'Error getting Announcement'
        };
    }); 
}

function getAuthorDID (url, port, protocol='https') {
    return util.getRequest(url, port, '/did', protocol).then((data) => {
        const response = {
            statusCode: 200,
            body: data
        };
      return response;
    }).catch(e => { 
        return response = {
            statusCode: e,
            body: 'Error getting author DID'
        };
    });
}

function makeSubLinkJson(subscribtionLink, did, name) {
    return data = JSON.stringify({
        sublink: subscribtionLink,
        did: did,
        name: name
      });
}

function receiveKeyload(subscriber, link) {
    return subscriber.receive_keyload(link);
}