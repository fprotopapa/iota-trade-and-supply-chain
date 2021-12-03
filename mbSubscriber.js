/* mbSubscriber.js
*
*  SPDX-FileCopyrightText: Copyright 2021 Fabbio Protopapa
*  SPDX-License-Identifier: MIT
*
*  ToDo: 
*        - Refactor way of loading existing instance -> use import and export
*        - Store pwd etc with stronghold
*        - Store or retrieve index to work with reloaded instances
*        - Multi Branch
*/

const streams = require('./node/streams');
streams.set_panic_hook();

const fs = require('fs');
const configPath = './config/default.json';
const config = require(configPath);

var util = require('./utils');

module.exports = {
    generateNewSubscriber,
    subscripeToChannel,
    receiveAnnouncement,
    sendSubscribtionLink,
    getAnnouncementLink,
    makeSubLinkJson,
    getAuthorDID,
    receiveKeyload
}

// Generate Subscriber
function generateNewSubscriber(nodeUrl, seed) {
    const options = new streams.SendOptions(nodeUrl);
    return new streams.Subscriber(seed, options.clone());
}

// Subscribe to channel -> Return subscribtion link
async function subscripeToChannel(announcementLink, subscriber) {
    // catch timeout
    console.log("Subscribing...");
    response = await subscriber.clone().send_subscribe(announcementLink.copy());
    subLink = response.link
    console.log("Subscription message at: ", subLink.toString());
    console.log("Subscription message index: " + subLink.toMsgIndexHex());
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

function getAnnouncementLink (url, port, protocol='https') {
    return util.getRequest(url, port, '/ann', protocol).then((data) => {
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