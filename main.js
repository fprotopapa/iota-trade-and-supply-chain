/* main.js
*
*  SPDX-FileCopyrightText: Copyright 2021 Fabbio Protopapa
*  SPDX-License-Identifier: MIT
*
*  ToDo: 
*
*/

var util = require('./utils');
var author = require('./mbAuthor');
var subs = require('./mbSubscriber');
var api = require('./server');
const { disabled } = require('express/lib/application');

const DEBUG_SKIP_STREAMS = false;
const DEBUG_SKIP_SENDING = true;
const AUTHOR = true;
const SUBSCRIBER = true;
const CARGO = false;

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
  const client = await util.makeClient();
  if(!DEBUG_SKIP_STREAMS) {
    if (AUTHOR) {
      console.log("-----------------------------------------");
      console.log("------ Create/Load Author ---------------");
      console.log("-----------------------------------------");
      api.updateDID();
      // Create channel/ Open channel
      var auth = await author.makeAuthor(client, 'author');
      var announcementLink = author.parseAnnouncementLink(auth);
      // Make announcement link avaiable
      api.updateAnnouncementLink(announcementLink, false);
      console.log("-----------------------------------------");
      console.log("--- Create/Load Author Public Channel ---");
      console.log("-----------------------------------------");
      // Create channel/ Open channel
      var authPub = await author.makeAuthor(client, 'author_pub');
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
    }

    if (SUBSCRIBER) {
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
        var subA = subs.makeSubscriber(client, 'subA');
        var subB = subs.makeSubscriber(client, 'subB.bin');
        var subC = subs.makeSubscriber(client, 'subC');
        var subD = subs.makeSubscriber(client, 'subDPub');
        // Verify author
        let authorDid = subs.getAuthorDID(restUrl, port, protocol);
        authorDid.then(function(result) {
          console.log("-----------------------------------------");
          console.log("------ Author DID Verification ----------");
          console.log("-----------------------------------------");
          console.log('Author DID: ' + JSON.stringify(result.body));
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
          restAnnLink = util.parseMsgLinkStrToAddress(str);
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
          restAnnLinkPub = util.parseMsgLinkStrToAddress(str);
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
        let did = await util.getIdentityVPObject('offlineVerifiablePresentationCargo.json');
        let subDataA = subs.makeSubLinkJson(subLinkA.toString(), did, 'SubA');
        let responseA = subs.sendSubscribtionLink(restUrl, port, subDataA, protocol)
        responseA.then(function(result) {
          console.log('----------------');
          console.log('SubA link posted');
          console.log('----------------');
        });
        let subDataB = subs.makeSubLinkJson(subLinkB.toString(), did, 'SubB');
        let responseB = subs.sendSubscribtionLink(restUrl, port, subDataB, protocol)
        responseB.then(function(result) {
          console.log('----------------');
          console.log('SubB link posted');
          console.log('----------------');
        });
    }

    if (AUTHOR) {
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
      let restSubLinkA = util.parseMsgLinkStrToAddress(actSubs["SubA"]["subLink"]);
      let restSubLinkB = util.parseMsgLinkStrToAddress(actSubs["SubB"]["subLink"]);
      await author.receiveSubscription(restSubLinkA, auth);
      await author.receiveSubscription(restSubLinkB, auth);
      console.log('----------------------');
      console.log("Subscription processed");
      console.log('----------------------');
      // Distributing keyload
      console.log('---------------');
      console.log("Sending Keyload");
      console.log('---------------');
      response = await auth.clone().send_keyload_for_everyone(announcementLink.copy());
      let keyload_link = response.link;
      api.updateKeyloadLink(keyload_link);
      console.log('----------------------------- Keyload -------------------------------------------');
      console.log("Keyload message at: ", keyload_link.toString());
      console.log("Keyload message index: " + keyload_link.toMsgIndexHex());
      console.log('---------------------------------------------------------------------------------');
    } 
    if (SUBSCRIBER) {
      /*

        Author sends messages to public branch

        Author -> synch state -> build payload in bytes ->
        sends messages and attaches to link 

        Subs -> publishing to private branch
      */
      did = await util.getIdentityVPObject('offlineVerifiablePresentationCargo.json');
      let didJson = JSON.stringify(did);
      keyloadReceived = subs.getKeyloadLink(restUrl, port, didJson, protocol);
      await keyloadReceived.then(function(result) {
        let str = result.body.replace('"', '').replace(/"$/,'');
        keyloadReceived = util.parseMsgLinkStrToAddress(str);
        console.log("-----------------------------------------");
        console.log("------ Keyload Link ---------------------");
        console.log("-----------------------------------------");
        console.log('Keyload Link recv: ' + str);
      });
    }

    if (!DEBUG_SKIP_SENDING) {
      while (true) {
        if (AUTHOR) {
          await authorPublicSend(authPub);
        }
        if (SUBSCRIBER) {
          await subscriberPrivateSend(subA, 'subA');
          await subscriberPrivateSend(subB, 'subB');
        }
        /*

            Subscriber receives messages

            Subscriber -> fetch messages
        */
        if (AUTHOR) {
          await authorReceive(auth);
        }
      }
    }
  }
}

async function authorReceive(author) {
  console.log("-----------------------------------------");
  console.log("--------- Fetch all messages ------------");
  console.log("-----------------------------------------");
  console.log("-----------------------------");
  console.log("Author fetching next messages");
  console.log("-----------------------------");
  let messagesAut = await util.fetchNextMessages(author);
  util.showMessages(messagesAut, "Author");
}

async function authorPublicSend(authPub){
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
}

async function subscriberPrivateSend(sub, name) {
  console.log("-------------------------------------------------");
  console.log("------ Subscriber ", name, ": Receiving ----------");
  console.log("-------------------------------------------------");
  // SubA receive messages
  console.log("Subscriber", name, " fetching next messages");
  let messages = await util.fetchNextMessages(sub);
  util.showMessages(messages, name);
  // SubA sending packages
  await util.fetchLatestLinkSB(sub, name);
  // Signed packet
  let public_payload = util.toBytes("PB Sub");
  let masked_payload = util.toBytes("PB Sub");
  console.log("-----------------------------------------");
  console.log("------ Subscriber ", name, ": Sending ------------");
  console.log("-----------------------------------------");
  console.log( name, " sending signed packet to private SB");
  let msgLink = keyloadReceived;
  for (var x = 0; x < 1; x++) {
    msgLink = await util.sendSignedPacket(msgLink, sub, public_payload, masked_payload);
    console.log("Signed packet at: ", msgLink.toString());
    console.log("Signed packet index: " + msgLink.toMsgIndexHex());
  }
}

main();