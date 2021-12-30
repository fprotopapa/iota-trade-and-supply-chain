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

var SHIPPER_STATE = 0;
var CARGO_STATE = 0;
var FF_STATE = 0;
var CONSIGNEE_STATE = 0;

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
      var announcementLinkPub = author.parseAnnouncementLink(authPub);
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
      if (AUTHOR) {
        var keyloadPublic = announcementLinkPub;
      }
      while (true) {
        if (AUTHOR) {
          let messagesAuth = await authorReceive(auth);
          keyloadPublic = await sendFilteredAuthMessages(authPub, messagesAuth, keyloadPublic);
        }
        if (SUBSCRIBER && (!CARGO)) {
          let messages = [];
          messages = await subscriberReceiveMessages(subA, 'Subscribers');
          if (messages.length > 0) {
            await simulateShipper(messages);
            await simulateFreigthF(messages);
            await simulateConsignee(messages);
          }
        } else if (CARGO) {
          let messages = [];
          messages = await subscriberReceiveMessages(subA, 'Cargo');
          if (messages.length > 0) {
            await simulateCargo(messages);
          }
        }
      }
    }
  }
}

async function sendFilteredAuthMessages(caller, messages, keyloadLink) {
  let keyload = keyloadLink;
  for (var i = 0; i < messages.length; i++) { 
    let msgJson = JSON.parse(messages[i]);
    if (msgJson.code === 333) { // Message from Freight Forwarder
      if (msgJson.status === "Clearance") {
        let respJson = JSON.stringify({
          name: "Author",
          code: 111,
          id: "1235363674",
          export: msgJson.export,
          import: msgJson.import
        });
        keyload = await authorPublicSend(caller, respJson, keyload);
      }
    }
    if (msgJson.code === 222) { // Message from Cargo
      let respJson = JSON.stringify({
        name: "Author",
        code: 111,
        id: "1235363674",
        place: msgJson.place,
        time: msgJson.time,
        status: "Shipment status"
      });
      keyload = await authorPublicSend(caller, respJson, keyload);
    }
  }
  return keyload;
}

async function simulateCargo(messages) {
  if (CARGO_STATE === 0) {
    for (var i = 0; i < messages.length; i++) { 
      let msgJson = JSON.parse(messages[i]);
      if (msgJson.code === 333) { // Message from Freight Forwarder
        if (msgJson.status === "Clearance") {
          let respJson = JSON.stringify({
            name: "Cargo",
            code: 222,
            place: "New York",
            time: "2021-12-06T10:30",
            id: "1235363674",
            temperature: "20C"
          });
          CARGO_STATE = 1;
          await subscriberPrivateSend(subFreightF, respJson, "Cargo");
        } 
      }
    }
  } else if ((CARGO_STATE > 0) && (CARGO_STATE < 4)) {
    let place = '';
    let date = '';
    let temp = '';
    if (CARGO_STATE === 1) {
      place = 'Rotterdam';
      date = '2021-12-18T18:00';
      temp = '23C';
    } else if (CARGO_STATE === 2) {
      place = 'Berlin';
      date = '2021-12-19T20:00';
      temp = '21C';
    } else if (CARGO_STATE === 3) {
      place = 'Warsaw';
      date = '2021-12-20T21:00';
      temp = '19C';
    }
    let respJson = JSON.stringify({
      name: "Cargo",
      code: 222,
      place: place,
      time: date,
      id: "1235363674",
      temperature: temp,
    });
    CARGO_STATE++;
    await subscriberPrivateSend(subFreightF, respJson, "Cargo");
  }
}

async function simulateFreigthF(messages) {
  if (FF_STATE === 0) {
    for (var i = 0; i < messages.length; i++) { 
      let msgJson = JSON.parse(messages[i]);
      if (msgJson.code === 555) { // Message from Shipper
        if (msgJson.status === "Delivered to FF") {
          let respJson = JSON.stringify({
            name: "FreightForw",
            code: 333,
            place: "New York",
            time: "2021-12-06T10:30",
            id: "1235363674",
            status: "Cargo Received",
            condition: "Good"
          });
          FF_STATE = 2;
          await subscriberPrivateSend(subFreightF, respJson, "Freight Forwarder");
        } 
        if (msgJson.code === 222) { // Message from Cargo
          let port = '';
          let date = '';
          if (msgJson.place === "Rotterdam") {
            port = "Rotterdam";
            date = "2021-12-18T18:00";
          } else if (msgJson.place === "Berlin") {
            port = "Berlin";
            date = "2021-12-19T20:00";
          } else if (msgJson.place === "Warsaw") {
            port = "Warsaw";
            date = "2021-12-20T21:00";
            FF_STATE = 1;
          } else if (msgJson.place === "New York") {
            port = "New York";
            date = "2021-12-16T06:30";
          }
          let respJson = JSON.stringify({
            name: "FreightForw",
            code: 333,
            place: port,
            time: date,
            id: "1235363674",
            status: "Shipping"
          });
          await subscriberPrivateSend(subFreightF, respJson, "Freight Forwarder");
        }
      }
    }
  } else if (FF_STATE === 1) {
    FF_STATE = 3;
    let respJson = JSON.stringify({
      name: "FreightForw",
      code: 333,
      place: "Warsaw",
      time: "2021-12-21T05:00",
      id: "1235363674",
      status: "Delivered"
    });
    await subscriberPrivateSend(subConsignee, respJson, "Freight Forwarder");
  } else if (FF_STATE === 2) {
    FF_STATE = 0;
    let respJson = JSON.stringify({
      name: "FreightForw",
      code: 333,
      place: "New York",
      time: "2021-12-14T15:00",
      id: "1235363674",
      status: "Clearance",
      import: "importClearanceURL",
      export: "exportClearanceURL"
    });
    await subscriberPrivateSend(subConsignee, respJson, "Freight Forwarder");
  } 
}

async function simulateConsignee(messages) {
  if (CONSIGNEE_STATE > 0) {
    for (var i = 0; i < messages.length; i++) { 
      let msgJson = JSON.parse(messages[i]);
      if (msgJson.code === 333) { // Message from Freight Forwarder
        if (msgJson.status === "Delivered") {
          let respJson = JSON.stringify({
            name: "Consignee",
            code: 444,
            place: "Warsaw",
            time: "2021-12-10T09:00",
            id: "1235363674",
            status: "Accepted"
          });
          await subscriberPrivateSend(subConsignee, respJson, "Consignee");
        }
      }
    }
  } else if (CONSIGNEE_STATE == 0) {
    CONSIGNEE_STATE++;
    let respJson = JSON.stringify({
      name: "Consignee",
      code: 444,
      place: "Warsaw",
      time: "2021-12-01T09:00",
      id: "1235363674",
      status: "Ordered"
    });
    await subscriberPrivateSend(subConsignee, respJson, "Consignee");
  }
}

async function simulateShipper(messages) {
  if (SHIPPER_STATE > 0) {
    for (var i = 0; i < messages.length; i++) { 
      let msgJson = JSON.parse(messages[i]);
      if (msgJson.code === 444) { // Message from Consignee
        if (msgJson.status === "Ordered") {
          SHIPPER_STATE = 1;
          let respJson = JSON.stringify({
            name: "Shipper",
            code: 555,
            place: "New York",
            time: "2021-12-01T12:00",
            status: "Start"
          });
          await subscriberPrivateSend(subShipper, respJson, "Shipper");
        }
      }
    }
    } else if ((SHIPPER_STATE > 0) && (SHIPPER_STATE < 3)){
      let prod = "";
      let timestamp = "";
      if (SHIPPER_STATE === 1) {
        prod = "Ready";
        timestamp = "2021-12-05T15:00";
      } else if (SHIPPER_STATE === 2) {
        prod = "Delivered to FF";
        timestamp = "2021-12-06T10:00";
      }
      let respJson = JSON.stringify({
        name: "Shipper",
        code: 555,
        place: "New York",
        time: timestamp,
        status: prod
      });
      await subscriberPrivateSend(subShipper, respJson, "Shipper");
      SHIPPER_STATE++;
    }
}

async function authorReceive(author) {
  console.log("-----------------------------");
  console.log("Author fetching next messages");
  console.log("-----------------------------");
  let messagesAut = await util.fetchNextMessages(author);
  let messagesStr = getMessageContent(messagesAut, "Author");
  return messageStr;
}

async function authorPublicSend(authPub, messageJSON, messageLink){
  console.log("---------------------------------------------");
  console.log("------ Author Public: Sending ---------------");
  console.log("---------------------------------------------");
  console.log("Author Pub sending signed packet to public SB");
  let public_payloadPub = util.toBytes(JSON.stringify(messageJSON));
  let masked_payloadPub = util.toBytes("");
  let msgLinkPub = messageLink;
  msgLinkPub = await util.sendSignedPacket(msgLinkPub, authPub, public_payloadPub, masked_payloadPub);
  console.log("Signed packet at: ", msgLinkPub.toString());
  console.log("Signed packet index: " + msgLinkPub.toMsgIndexHex());
  return msgLinkPub;
}

async function subscriberReceiveMessages(sub, name) {
  console.log("-------------------------------------------------");
  console.log("------ Subscriber ", name, ": Receiving ----------");
  console.log("-------------------------------------------------");
  // Sub receive messages
  console.log("Subscriber", name, " fetching next messages");
  let messages = await util.fetchNextMessages(sub);
  let messagesStr = [];
  messagesStr = getMessageContent(messages, name);
  return messagesStr;
}

async function subscriberPrivateSend(sub, msgJson, name) {
  // Sub sending packages
  let keyloadReceived = await util.fetchLatestLinkSB(sub, name);
  // Signed packet
  let public_payload = util.toBytes("");
  let masked_payload = util.toBytes(JSON.stringify(msgJson));
  console.log("-----------------------------------------");
  console.log("------ Subscriber ", name, ": Sending ------------");
  console.log("-----------------------------------------");
  console.log("Message: ", JSON.stringify(msgJson));
  console.log( name, " sending signed packet to private SB");
  let msgLink = keyloadReceived;
  msgLink = await util.sendSignedPacket(msgLink, sub, public_payload, masked_payload);
  console.log("Signed packet at: ", msgLink.toString());
  console.log("Signed packet index: " + msgLink.toMsgIndexHex());
}

// Show fetched messages
function getMessageContent(messages, subName) {
  console.log("Message for " + subName);
  messagesStr = [];
  for (var i = 0; i < messages.length; i++) {
    let next = messages[i];
    for (var j = 0; j < next.length; j++) {
    console.log("Found a message...");
    if (next[j].message == null) {
        console.log("Message undefined");
    } else {
        messageStr.push(fromBytes(next[j].message.get_masked_payload()));
        console.log(
        "Public: ",
        fromBytes(next[j].message.get_public_payload()),
        "\tMasked: ",
        fromBytes(next[j].message.get_masked_payload())
        );
      }
    }
  }
  return messageStr;
}

main();