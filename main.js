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
var util = require('./utils');
var author = require('./mbAuthor');
var subs = require('./mbSubscriber');
var api = require('./server');

const DEBUG_SKIP_STREAMS = false;
const DEBUG_SKIP_SENDING = false;


async function main() {
  /*
    Initizialization (Multi Branch Pub)
    Loading configuration, generating or loading author
    author -> announces channel

  */
  // Configure rest api
  const restUrl = util.getRestURL();
  const protocol = 'http';
  const port = 8000;
  /* 
  *   Streams 
  *
  */
  if(!DEBUG_SKIP_STREAMS) {

    const client = await util.makeClient();
    // Create channel/ Open channel
    let auth = await author.makeAuthor(client);
    let announcementLink = author.parseAnnouncementLink(auth);
    // Make announcement link avaiable
    api.updateAnnouncementLink(announcementLink);
    // Start rest api
    rest = api.createAPI();
    rest.listen(port, () => {
      console.log(`Server listening at ${protocol}://${restUrl}:${port}`)
    });
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
    // Verify author
    let authorDid = subs.getAuthorDID(restUrl, port, protocol);
    authorDid.then(function(result) {
      console.log('Author DID: ' + result.body);
      if (util.verifyDID(result.body)) {
        console.log('Author verified');
      } else {
        console.log('Not the author');
      }
    });
    // Get announcement link
    let restAnnLink;
    let restAnnLinkStr = subs.getAnnouncementLink(restUrl, port, protocol);
    await restAnnLinkStr.then(function(result) {
      let str = JSON.stringify(result.body).replace('"', '').replace(/"$/,'');
      restAnnLink = util.parseAnnouncementLinkString(str);
      console.log('Ann Link recv: ' + str);
    });
    // Receive and subscribe to channel
    await subs.receiveAnnouncement(restAnnLink, subA);
    await subs.receiveAnnouncement(restAnnLink, subB);
    let subLinkA = await subs.subscripeToChannel(restAnnLink, subA);
    let subLinkB = await subs.subscripeToChannel(restAnnLink, subB);
    /*

      Author receives subscribtions & sends out keyload (needed to attach messages)

      Subscriber -> receives annnouncement -> subscribes to channel
    */
    // Client send subscribtion link to author (Sub Link, DID, Name)
    let subDataA = subs.makeSubLinkJson(subLinkA.toString(), '111111111', 'SubA');
    let responseA = subs.sendSubscribtionLink(restUrl, port, subDataA, protocol)
    responseA.then(function(result) {
      console.log('SubA link posted');
    });
    let subDataB = subs.makeSubLinkJson(subLinkB.toString(), '222222222', 'SubB');
    let responseB = subs.sendSubscribtionLink(restUrl, port, subDataB, protocol)
    responseB.then(function(result) {
      console.log('SubB link posted');
    });
    // Get subscribed clients
    var actSubs = {};
    while(Object.keys(actSubs).length === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      subscribers = api.getSubscribers();
      actSubs = JSON.parse(JSON.stringify(subscribers));
    }
    console.log('Subscribers:' + JSON.stringify(actSubs));
    // Register subscribers
    let restSubLinkA = util.parseAnnouncementLinkString(actSubs["SubA"]["subLink"]);
    let restSubLinkB = util.parseAnnouncementLinkString(actSubs["SubB"]["subLink"]);
    await author.receiveSubscription(restSubLinkA, auth);
    await author.receiveSubscription(restSubLinkB, auth);
    console.log("Subscription processed");
    // Distributing keyload
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
    if (!DEBUG_SKIP_SENDING) {
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
  }
}

main();