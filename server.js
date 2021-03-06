/* server.js
*
*  SPDX-FileCopyrightText: Copyright 2021 Fabbio Protopapa
*  SPDX-License-Identifier: MIT
*
* Cmd:
* node server
*/
var express = require('express');

var util = require('./utils');

module.exports = { 
  createAPI,
  updateAnnouncementLink,
  getSubscribers,
  updateKeyloadLink,
  updateDID
};

var announcementLink = null;
var announcementLinkPub = null;
var subscribers = {};
var keyload = null;
var didAuthor = null;
// Load DID object
async function updateDID() {
  didAuthor = await util.getIdentityVPObject('offlineVerifiablePresentationAuthor.json');
}
// Change announcement link
function updateAnnouncementLink(annLink, isPub) {
  if (isPub) {
    announcementLinkPub = annLink.toString();
  } else {
    announcementLink = annLink.toString();
  }
}
// Change keyload link
function updateKeyloadLink(keyloadLink) {
    keyload = keyloadLink.toString();
}
// Return registered subscribers
function getSubscribers() {
  return subscribers;
}
// Start rest server
function createAPI() {
  var rest = express();
  
  rest.use(express.json());

  rest.get('/', (req, res) => {
    res.send(JSON.stringify('Hello!'));
  });

  rest.get('/ann', (req, res) => {
    if (announcementLink === null) {
      res.send(JSON.stringify('No announcement available.'));
    } else {
      res.send(JSON.stringify(announcementLink));
    }
  });

  rest.get('/annpub', (req, res) => {
    if (announcementLinkPub === null) {
      res.send(JSON.stringify('No announcement available.'));
    } else {
      res.send(JSON.stringify(announcementLinkPub));
    }
  });

  rest.post('/sub', (req, res) => {
    let name = req.body.name;
    let sublink = req.body.sublink;
    let did = req.body.did;
    if (util.verifyDID(did)) {
      subscribers[name] = {};
      subscribers[name]['subLink'] = sublink;
      subscribers[name]['did'] = did;
      res.send();
    } else {
      res.status(403).send();
    }  
  });

  rest.post('/key', (req, res) => {
    let did = req.body;
    if (util.verifyDID(did)) {
      if (keyload === null) {
        res.status(300).send();
      } else {
        res.status(200).send(JSON.stringify(keyload));
      }
    } else {
       res.status(403).send();
    }  
  });

  rest.get('/did', (req, res) => {
    if (didAuthor === null) {
      res.send(JSON.stringify('No DID available.'));
    } else {
      res.send(didAuthor);
    }
  });

  return rest;
}
