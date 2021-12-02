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

module.exports = {
    generateNewSubscriber,
    subscripeToChannel,
    receiveAnnouncement,
    sendSubscribtionLink,
    getAnnouncementLink
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

function sendSubscribtionLink() {

}

function getAnnouncementLink () {

}
