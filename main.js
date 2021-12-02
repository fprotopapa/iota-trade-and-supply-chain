/* main.js
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
//const streams = require('./node/streams');
//streams.set_panic_hook();

var util = require('./utils');
var author = require('./mbAuthor');
var subs = require('./mbSubscriber');

async function main() {
    /*
      Initizialization (Multi Branch Pub)
      Loading configuration, generating or loading author
      author -> announces channel
 
    */
    const client = await util.makeClient();
    // Create channel/ Open channel
    let auth = await author.makeAuthor(client);
    let announcementLink = author.parseAnnouncementLink(auth);
    // Log Channel details
    author.logChannel(auth);
    // Log node details
    //console.log("IOTA client info:", await client.getInfo());
    /*

      Generating Subscriber

      Subscriber -> receives annnouncement -> subscribes to channel
    */
    // Generate subscriber
    nodeUrl = util.getNodeURL();
    subA = subs.generateNewSubscriber(nodeUrl, util.makeSeed(81));
    subB = subs.generateNewSubscriber(nodeUrl, util.makeSeed(81));
    await subs.receiveAnnouncement(announcementLink, subA);
    await subs.receiveAnnouncement(announcementLink, subB);
    
    subLinkA = await subs.subscripeToChannel(announcementLink, subA);
    subLinkB = await subs.subscripeToChannel(announcementLink, subB);
    /*

      Author receives subscribtions & sends out keyload (needed to attach messages)

      Subscriber -> receives annnouncement -> subscribes to channel
    */
    await author.receiveSubscription(subLinkA, auth);
    await author.receiveSubscription(subLinkB, auth);
    console.log("Subscription processed");
  
    console.log("Sending Keyload");
    response = await auth.clone().send_keyload_for_everyone(announcementLink.copy());
    let keyload_link = response.link;
    console.log("Keyload message at: ", keyload_link.toString());
    console.log("Keyload message index: " + keyload_link.toMsgIndexHex());
    /*

      Author sends messages 

      Author -> synch state -> build payload in bytes ->
      sends messages and attaches to link (single branch: attach to last message)
    */
    await util.syncState(auth);
  
    let public_payload = util.toBytes("Public");
    let masked_payload = util.toBytes("Masked");
  
    console.log("Author Sending multiple signed packets");
    let msgLink = keyload_link;
    for (var x = 0; x < 3; x++) {
      msgLink = await util.sendSignedPacket(msgLink, auth, public_payload, masked_payload);
      console.log("Signed packet at: ", msgLink.toString());
      console.log("Signed packet index: " + msgLink.toMsgIndexHex());
    }
    /*

      Subscriber receives messages

      Subscriber -> fetch messages
    */
    console.log("\Subscriber fetching next messages");
    let messagesA = await util.fetchNextMessages(subA);
    util.showMessages(messagesA, "SubA");
    let messagesB = await util.fetchNextMessages(subB);
    util.showMessages(messagesB, "SubB");
}

main();