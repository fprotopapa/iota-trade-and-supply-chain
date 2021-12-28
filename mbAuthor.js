/* mbAuthor.js
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
  makeAuthor,
  logChannel,
  parseAnnouncementLink,
  receiveSubscription,
}

async function makeAuthor(client, filename) {
    // Generate author
    // Check for existing author
    filename = util.checkFileExtension(filename, '.bin');
    let authorPasswd = util.getEncryptPasswd();
    let dirPath = util.buildPath(config.dir.bin);
    let isAuthorInstance = util.isEncryptedBinary(filename, dirPath);
    if (!isAuthorInstance || config.caller.setSeed) {
        // Generate new seed 
        var seed = util.makeSeed(81);
        console.log("New seed for author created.");
        // Generating author for new channel
        var author = streams.Author.fromClient(
                                              streams.StreamsClient.fromClient(client), 
                                              seed, 
                                              streams.ChannelType.SingleBranch);
        // Send announcment and get link
        let response = await author.clone().send_announce();
        
        let expAuthor = author.clone().export(authorPasswd);
        fs.writeFileSync(path.join(dirPath, filename), expAuthor, 'binary');
        console.log("Author instance exported: ", filename);
      } else {
        // Load existing seed
        impAuthor = new Uint8Array(fs.readFileSync(path.join(dirPath, filename)));
        var author = streams.Author.import(
                                        streams.StreamsClient.fromClient(client), 
                                        impAuthor, 
                                        authorPasswd);
        console.log("Loaded author instance from binary.");
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
