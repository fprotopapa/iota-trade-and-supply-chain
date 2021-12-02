/* mbAuthor.js
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
  makeAuthor,
  logChannel,
  parseAnnouncementLink,
  receiveSubscription,
  serveAnnouncementLink,
  getSubscribtionLink
}

async function makeAuthor(client) {
    // Generate author
    // Check for existing author seed
    if ((config.author.seed === null) || config.author.setSeed) {
        // Generate new seed and save to config.json
        var seed = util.makeSeed(81);
        config.author.seed = seed;
        console.log("New seed for author created.");
        // Generating author for new channel
        var author = streams.Author.fromClient(streams.StreamsClient.fromClient(client), seed, streams.ChannelType.MultiBranch);
        config.author.channelAddress = author.channel_address();
        config.author.channelType = streams.ChannelType.MultiBranch;
        // Send announcment and get link
        let response = await author.clone().send_announce();
        let announcementLink = response.link;
        let announcementLinkStr = announcementLink.toString();
        // Update config.json
        config.author.announcementLink = announcementLinkStr;
        
        util.writeJsonFile(config, configPath);
      } else {
        // Load existing seed
        var seed = config.author.seed;
        console.log("Existing seed for author loaded.");
        // Generating author for existing channel
        let announcementLinkStr = config.author.announcementLink;
        let announcementLink = streams.Address.parse(announcementLinkStr)
        let channelType = config.author.channelType;
        const options = new streams.SendOptions(nodeUrl);
        // Recover author !! announcementLink is freed !!
        var author = await streams.Author.recover(seed, announcementLink, channelType, options);  
      }
      return author;
}

function logChannel(author) {
    let announcementLink = streams.Address.parse(author.announcementLink());
    console.log("-----------------------------------------------------------------------")
    console.log("Channel address: ", author.channel_address());
    console.log("Multi branching: ", author.is_multi_branching());
    console.log("Announced at: ", author.announcementLink());
    console.log("Announce message index (hashed hex): " + announcementLink.toMsgIndexHex());
    console.log("Announce message id: " + announcementLink.msgId);
    console.log("-----------------------------------------------------------------------")
}

function parseAnnouncementLink(author) {
  return streams.Address.parse(author.announcementLink());
}

// Author receiving subscription
async function receiveSubscription(subscribtionLink, author) {
  await author.clone().receive_subscribe(subscribtionLink.copy());
}

function serveAnnouncementLink () {
    
}

function getSubscribtionLink() {

}