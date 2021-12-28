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
    console.log("-----------------------------------------");
    console.log("------ Create/Load Author ---------------");
    console.log("-----------------------------------------");
    const client = await util.makeClient();
    // Create channel/ Open channel
    let auth = await author.makeAuthor(client, 'author');
    let announcementLink = author.parseAnnouncementLink(auth);
    // Make announcement link avaiable
    api.updateAnnouncementLink(announcementLink, false);
    console.log("-----------------------------------------");
    console.log("--- Create/Load Author Public Channel ---");
    console.log("-----------------------------------------");
    // Create channel/ Open channel
    let authPub = await author.makeAuthor(client, 'author_pub');
    let announcementLinkPub = author.parseAnnouncementLink(authPub);
    // Make announcement link avaiable
    api.updateAnnouncementLink(announcementLinkPub, true);
    // Start rest api
    rest = api.createAPI();
    rest.listen(port, () => {
      console.log("------------------------------------------------------");
      console.log(`Server listening at ${protocol}://${restUrl}:${port}`);
      console.log("------------------------------------------------------");
    });
    // Log Channel details
    console.log("-----------------------------------------");
    console.log("------ Channel Details Private ----------");
    console.log("-----------------------------------------");
    author.logChannel(auth);
    // Log Channel details
    console.log("-----------------------------------------");
    console.log("------ Channel Details Public -----------");
    console.log("-----------------------------------------");
    author.logChannel(authPub);
    // Log node details
    //console.log("IOTA client info:", await client.getInfo());
    /*

      Generating Subscriber

      Subscriber -> receives annnouncement -> subscribes to channel
    */
    console.log("-----------------------------------------");
    console.log("------ Create/Load Subscriber -----------");
    console.log("-----------------------------------------");
    // Generate subscriber
    /*
      SubA & SubB are subscribed and accepted to private channel
      SubC is subscribed but not accepted to private channel
      SubD listens to publich channel
    */
    subA = subs.makeSubscriber(client, 'subA');
    subB = subs.makeSubscriber(client, 'subB.bin');
    subC = subs.makeSubscriber(client, 'subC');
    subD = subs.makeSubscriber(client, 'subDPub');
    // Verify author
    let authorDid = subs.getAuthorDID(restUrl, port, protocol);
    authorDid.then(function(result) {
      console.log("-----------------------------------------");
      console.log("------ Author DID Verification ----------");
      console.log("-----------------------------------------");
      console.log('Author DID: ' + result.body);
      if (util.verifyDID(result.body)) {
        console.log('Author verified');
      } else {
        console.log('Not the author');
      }
    });
    // Get announcement link
    let restAnnLink;
    let restAnnLinkStr = subs.getAnnouncementLink(restUrl, port, protocol, '/ann');
    await restAnnLinkStr.then(function(result) {
      let str = JSON.stringify(result.body).replace('"', '').replace(/"$/,'');
      restAnnLink = util.parseAnnouncementLinkString(str);
      console.log("-----------------------------------------");
      console.log("------ Announcement Link ----------------");
      console.log("-----------------------------------------");
      console.log('Ann Link recv: ' + str);
    });
    // Get public announcement link
    let restAnnLinkPub;
    let restAnnLinkStrPub = subs.getAnnouncementLink(restUrl, port, protocol, '/annpub');
    await restAnnLinkStrPub.then(function(result) {
      let str = JSON.stringify(result.body).replace('"', '').replace(/"$/,'');
      restAnnLinkPub = util.parseAnnouncementLinkString(str);
      console.log("-----------------------------------------");
      console.log("------ Public Announcement Link ---------");
      console.log("-----------------------------------------");
      console.log('Ann Link Pub recv: ' + str);
    });
    // Receive and subscribe to channel
    await subs.receiveAnnouncement(restAnnLink, subA);
    await subs.receiveAnnouncement(restAnnLink, subB);
    await subs.receiveAnnouncement(restAnnLink, subC);
    await subs.receiveAnnouncement(restAnnLinkPub, subD);
    let subLinkA = await subs.subscripeToChannel(restAnnLink, subA);
    let subLinkB = await subs.subscripeToChannel(restAnnLink, subB);
    let subLinkC = await subs.subscripeToChannel(restAnnLink, subC);
    /*

      Author receives subscribtions & sends out keyload (needed to attach messages)

      Subscriber -> receives annnouncement -> subscribes to channel
    */
    // Client send subscribtion link to author (Sub Link, DID, Name)
    let subDataA = subs.makeSubLinkJson(subLinkA.toString(), '111111111', 'SubA');
    let responseA = subs.sendSubscribtionLink(restUrl, port, subDataA, protocol)
    responseA.then(function(result) {
      console.log('----------------');
      console.log('SubA link posted');
      console.log('----------------');
    });
    let subDataB = subs.makeSubLinkJson(subLinkB.toString(), '222222222', 'SubB');
    let responseB = subs.sendSubscribtionLink(restUrl, port, subDataB, protocol)
    responseB.then(function(result) {
      console.log('----------------');
      console.log('SubB link posted');
      console.log('----------------');
    });
    // Get subscribed clients
    var actSubs = {};
    while(Object.keys(actSubs).length === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      subscribers = api.getSubscribers();
      actSubs = JSON.parse(JSON.stringify(subscribers));
    }
    console.log('---------------------- Subscribed Subs ----------------------------------------');
    console.log('Subscribers:' + JSON.stringify(actSubs));
    console.log('-------------------------------------------------------------------------------');
    // Register subscribers
    let restSubLinkA = util.parseAnnouncementLinkString(actSubs["SubA"]["subLink"]);
    let restSubLinkB = util.parseAnnouncementLinkString(actSubs["SubB"]["subLink"]);
    await author.receiveSubscription(restSubLinkA, auth);
    await author.receiveSubscription(restSubLinkB, auth);
    console.log('----------------------');
    console.log("Subscription processed");
    console.log('----------------------');
    // Distributing keyload
    /*
    Send over REST !!!!!!!!
    */
    console.log('---------------');
    console.log("Sending Keyload");
    console.log('---------------');
    response = await auth.clone().send_keyload_for_everyone(announcementLink.copy());
    let keyload_link = response.link;
    console.log('----------------------------- Keyload -------------------------------------------');
    console.log("Keyload message at: ", keyload_link.toString());
    console.log("Keyload message index: " + keyload_link.toMsgIndexHex());
    console.log('---------------------------------------------------------------------------------');
    
    /*

      Author sends messages to public branch

      Author -> synch state -> build payload in bytes ->
      sends messages and attaches to link 

      Subs -> publishing to private branch
    */
    if (!DEBUG_SKIP_SENDING) {
      console.log("---------------------------------------------");
      console.log("------ Author Public: Sending ---------------");
      console.log("---------------------------------------------");
      console.log("Author Pub sending signed packet to public SB");
      let public_payloadPub = util.toBytes("For everybody");
      let masked_payloadPub = util.toBytes("For everybody but masked");
      let msgLinkPub = announcementLinkPub;
      for (var x = 0; x < 1; x++) {
        msgLinkPub = await util.sendSignedPacket(msgLinkPub, authPub, public_payloadPub, masked_payloadPub);
        console.log("Signed packet at: ", msgLinkPub.toString());
        console.log("Signed packet index: " + msgLinkPub.toMsgIndexHex());
      }
      console.log("-----------------------------------------");
      console.log("------ Subscriber A: Receiving ----------");
      console.log("-----------------------------------------");
      // SubA receive messages
      console.log("Subscriber A fetching next messages");
      let messagesA = await util.fetchNextMessages(subA);
      util.showMessages(messagesA, "SubA");
      // SubA sending packages
      await util.fetchLatestLinkSB(subA, 'SubA');
      // Signed packet
      let public_payloadA = util.toBytes("PB SubA");
      let masked_payloadA = util.toBytes("PB SubA");
      console.log("-----------------------------------------");
      console.log("------ Subscriber A: Sending ------------");
      console.log("-----------------------------------------");
      console.log("SubA sending signed packet to private SB");
      let msgLink = keyload_link;
      for (var x = 0; x < 1; x++) {
        msgLink = await util.sendSignedPacket(msgLink, subA, public_payloadA, masked_payloadA);
        console.log("Signed packet at: ", msgLink.toString());
        console.log("Signed packet index: " + msgLink.toMsgIndexHex());
      }
      console.log("-----------------------------------------");
      console.log("------ Subscriber B: Receiving ----------");
      console.log("-----------------------------------------");
      // SubB receive messages
      console.log("Subscriber B fetching next messages");
      let messagesB = await util.fetchNextMessages(subB);
      util.showMessages(messagesB, "SubB");
      console.log("-----------------------------------------");
      console.log("------ Subscriber B: Sending ------------");
      console.log("-----------------------------------------");
      // SubB sending packages
      await util.fetchLatestLinkSB(subB, 'SubB');
      // Signed packet
      let public_payloadB = util.toBytes("PB SubB");
      let masked_payloadB = util.toBytes("PB SubB");
      console.log("SubB sending signed packet to private SB");
      //let msgLink = keyload_link;
      for (var x = 0; x < 1; x++) {
        msgLink = await util.sendSignedPacket(msgLink, subB, public_payloadB, masked_payloadB);
        console.log("Signed packet at: ", msgLink.toString());
        console.log("Signed packet index: " + msgLink.toMsgIndexHex());
      }
      /*

          Subscriber receives messages

          Subscriber -> fetch messages
      */
      console.log("-----------------------------------------");
      console.log("--------- Fetch all messages ------------");
      console.log("-----------------------------------------");
      console.log("-----------------------------");
      console.log("Author fetching next messages");
      console.log("-----------------------------");
      let messagesAut = await util.fetchNextMessages(auth);
      util.showMessages(messagesAut, "Author");
      console.log("-----------------------------------");
      console.log("Subscriber A fetching next messages");
      console.log("-----------------------------------");
      messagesA = await util.fetchNextMessages(subA);
      util.showMessages(messagesA, "SubA");
      console.log("-----------------------------------");
      console.log("Subscriber B fetching next messages");
      console.log("-----------------------------------");
      messagesB = await util.fetchNextMessages(subB);
      util.showMessages(messagesB, "SubB");
      console.log("-----------------------------------");
      console.log("Subscriber C fetching next messages");
      console.log("-----------------------------------");
      let messagesC = await util.fetchNextMessages(subC);
      util.showMessages(messagesC, "SubC");
      console.log("-------------------------------------");
      console.log("Subscriber D fetching public messages");
      console.log("-------------------------------------");
      let messagesD = await util.fetchNextMessages(subD);
      util.showMessages(messagesD, "SubD");
      // fetch latest messages or with user state
      // console.log("Auth states");
      // let stateSubAuth = util.showStates(auth);
    }
  }
}


main();