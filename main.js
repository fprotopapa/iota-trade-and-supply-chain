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
const DEBUG_SKIP_SENDING = false;
const AUTHOR = true;
const SUBSCRIBER = true;
const CARGO = true;
const SIMSUBS = true;

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
       if (SIMSUBS) {
        var subFreightF = subs.makeSubscriber(client, 'FreightF');
        var subConsignee = subs.makeSubscriber(client, 'Consignee');
        var subShipper = subs.makeSubscriber(client, 'Shipper');
        var subPublic = subs.makeSubscriber(client, 'PublicSubscriber');
       } 
       if (CARGO) {
        var subCargo = subs.makeSubscriber(client, 'Cargo');
       }
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
        if (SIMSUBS) {
        // Receive and subscribe to channel
        await subs.receiveAnnouncement(restAnnLink, subFreightF);
        await subs.receiveAnnouncement(restAnnLink, subConsignee);
        await subs.receiveAnnouncement(restAnnLink, subShipper);
        await subs.receiveAnnouncement(restAnnLinkPub, subPublic);
        var subLinkFreightF = await subs.subscripeToChannel(restAnnLink, subFreightF);
        var subLinkConsignee = await subs.subscripeToChannel(restAnnLink, subConsignee);
        var subLinkShipper = await subs.subscripeToChannel(restAnnLink, subShipper);
        }
        if (CARGO) {
          await subs.receiveAnnouncement(restAnnLink, subCargo);
          var subLinkCargo = await subs.subscripeToChannel(restAnnLink, subCargo);
        }


        /*
          Author receives subscribtions & sends out keyload (needed to attach messages)

          Subscriber -> receives annnouncement -> subscribes to channel
        */
        if (SIMSUBS) {
          var didShipper = await util.getIdentityVPObject('offlineVerifiablePresentationShipper.json');
          let subDataShipper = subs.makeSubLinkJson(subLinkShipper.toString(), didShipper, 'Shipper');

          var didConsignee = await util.getIdentityVPObject('offlineVerifiablePresentationConsignee.json');
          let subDataConsignee = subs.makeSubLinkJson(subLinkConsignee.toString(), didConsignee, 'Consignee');

          var didFreightF = await util.getIdentityVPObject('offlineVerifiablePresentationFreightForwarder.json');
          let subDataFreightF = subs.makeSubLinkJson(subLinkFreightF.toString(), didFreightF, 'FreightForwarder');

          let responseA = subs.sendSubscribtionLink(restUrl, port, subDataShipper, protocol);
          responseA.then(function(result) {
            console.log('----------------');
            console.log('Shipper link posted');
            console.log('----------------');
          });
          let responseB = subs.sendSubscribtionLink(restUrl, port, subDataConsignee, protocol);
          responseB.then(function(result) {
            console.log('----------------');
            console.log('Consignee link posted');
            console.log('----------------');
          });
          let responseC = subs.sendSubscribtionLink(restUrl, port, subDataFreightF, protocol);
          responseC.then(function(result) {
            console.log('----------------');
            console.log('Freight Forwarder link posted');
            console.log('----------------');
          });
        }
        if (CARGO) {
          var didCargo = await util.getIdentityVPObject('offlineVerifiablePresentationCargo.json');
          let subDataCargo = subs.makeSubLinkJson(subLinkCargo.toString(), didCargo, 'Cargo');
          let responseD = subs.sendSubscribtionLink(restUrl, port, subDataCargo, protocol);
          responseD.then(function(result) {
            console.log('----------------');
            console.log('Cargo link posted');
            console.log('----------------');
          });
        }
      }

    if (AUTHOR) {
      // Get subscribed clients
      var actSubs = {};
      while((Object.keys(actSubs).length === 0) && (Object.keys(actSubs).length < 4)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        subscribers = api.getSubscribers();
        actSubs = JSON.parse(JSON.stringify(subscribers));
      }
      console.log('---------------------- Subscribed Subs ----------------------------------------');
      console.log('Subscribers:' + JSON.stringify(actSubs));
      console.log('-------------------------------------------------------------------------------');
      // Register subscribers
      let restSubLinkShipper = util.parseMsgLinkStrToAddress(actSubs["Shipper"]["subLink"]);
      let restSubLinkConsignee = util.parseMsgLinkStrToAddress(actSubs["Consignee"]["subLink"]);
      let restSubLinkFreightF = util.parseMsgLinkStrToAddress(actSubs["FreightForwarder"]["subLink"]);
      let restSubLinkCargo = util.parseMsgLinkStrToAddress(actSubs["Cargo"]["subLink"]);
      await author.receiveSubscription(restSubLinkShipper, auth);
      await author.receiveSubscription(restSubLinkConsignee, auth);
      await author.receiveSubscription(restSubLinkFreightF, auth);
      await author.receiveSubscription(restSubLinkCargo, auth);
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
     let did = '';
     if (CARGO) {
      did = didCargo;
     } else {
      did = didShipper;
     }
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
      const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
      
      while (true) {
        if (AUTHOR) {
          keyloadPublic = await sendFilteredAuthMessages(auth, authPub, keyloadPublic);
        }
        if (SUBSCRIBER && SIMSUBS) {
          await simulateConsignee(subConsignee);
          await simulateShipper(subShipper);
          await simulateFreigthF(subFreightF);
        }
        if (SUBSCRIBER && CARGO) {
          await simulateCargo(subCargo);
        }
        await delay(5000);
      }
    }
  }
}

async function sendFilteredAuthMessages(caller, pubCaller, keyloadLink) {
  let messages = await authorReceive(caller);
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
        keyload = await authorPublicSend(pubCaller, respJson, keyload);
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
      keyload = await authorPublicSend(pubCaller, respJson, keyload);
    }
  }
  return keyload;
}

async function simulateCargo(caller) {
  let messages = await subscriberReceiveMessages(caller, 'Cargo');
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
          await subscriberPrivateSend(caller, respJson, "Cargo");
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
    await subscriberPrivateSend(caller, respJson, "Cargo");
  }
}

async function simulateFreigthF(caller) {
  let messages = await subscriberReceiveMessages(caller, 'Freight Forwarder');
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
          await subscriberPrivateSend(caller, respJson, "Freight Forwarder");
        } 
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
        await subscriberPrivateSend(caller, respJson, "Freight Forwarder");
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
    await subscriberPrivateSend(caller, respJson, "Freight Forwarder");
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
    await subscriberPrivateSend(caller, respJson, "Freight Forwarder");
  } 
}

async function simulateConsignee(caller) {
  let messages = await subscriberReceiveMessages(caller, 'Consignee');
  if ((CONSIGNEE_STATE > 0) && (messages.length > 0)) {
    for (var i = 0; i < messages.length; i++) { 
      let msgJson = JSON.parse(messages[i]); //.replace(/\\/g, "")
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
          await subscriberPrivateSend(caller, respJson, "Consignee");
        }
      }
    }
  } else if (CONSIGNEE_STATE === 0) {
    CONSIGNEE_STATE++;
    let respJson = JSON.stringify({
      name: "Consignee",
      code: 444,
      place: "Warsaw",
      time: "2021-12-01T09:00",
      id: "1235363674",
      status: "Ordered"
    });
    await subscriberPrivateSend(caller, respJson, "Consignee");
  }
}

async function simulateShipper(caller) {
  let messages = await subscriberReceiveMessages(caller, 'Shipper');
  if ((SHIPPER_STATE === 0) && (messages.length > 0)) {
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
          await subscriberPrivateSend(caller, respJson, "Shipper");
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
      await subscriberPrivateSend(caller, respJson, "Shipper");
      SHIPPER_STATE++;
    }
}

async function authorReceive(author) {
  console.log("-----------------------------");
  console.log("Author fetching next messages");
  console.log("-----------------------------");
  let messagesAut = await util.fetchNextMessages(author);
  let messageStr = getMessageContent(messagesAut, "Author");
  return messageStr;
}

async function authorPublicSend(authPub, messageJSON, messageLink){
  console.log("---------------------------------------------");
  console.log("------ Author Public: Sending ---------------");
  console.log("---------------------------------------------");
  console.log("Author Pub sending signed packet to public SB");
  let public_payloadPub = util.toBytes(messageJSON);
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
  let masked_payload = util.toBytes(msgJson);
  console.log("-----------------------------------------");
  console.log("------ Subscriber ", name, ": Sending ------------");
  console.log("-----------------------------------------");
  console.log("Message: ", msgJson);
  console.log( name, " sending signed packet to private SB");
  let msgLink = keyloadReceived;
  msgLink = await util.sendSignedPacket(msgLink, sub, public_payload, masked_payload);
  console.log("Signed packet at: ", msgLink.toString());
  console.log("Signed packet index: " + msgLink.toMsgIndexHex());
}

// Show fetched messages
function getMessageContent(messages, subName) {
  console.log("Message for " + subName);
  let messageStr = [];
  for (var i = 0; i < messages.length; i++) {
    let next = messages[i];
    for (var j = 0; j < next.length; j++) {
    console.log("Found a message...");
    if (next[j].message == null) {
        console.log("Message undefined");
    } else {
        messageStr.push(util.fromBytes(next[j].message.get_masked_payload()));
        console.log(
        "Public: ",
        util.fromBytes(next[j].message.get_public_payload()),
        "\tMasked: ",
        util.fromBytes(next[j].message.get_masked_payload())
        );
      }
    }
  }
  return messageStr;
}

main();