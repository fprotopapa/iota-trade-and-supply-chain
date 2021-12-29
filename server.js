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
  updateKeyloadLink
};

var announcementLink = null;
var announcementLinkPub = null;
var subscribers = {};
var keyload = null;

function updateAnnouncementLink(annLink, isPub) {
  if (isPub) {
    announcementLinkPub = annLink.toString();
  } else {
    announcementLink = annLink.toString();
  }
}

function updateKeyloadLink(keyloadLink) {
    keyload = keyloadLink.toString();
}

function getSubscribers() {
  return subscribers;
}

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
      //console.log(subscribers);
      res.send();
    } else {
      res.status(403).send();
    }  
  });

  rest.get('/key', (req, res) => {
    let did = req.query.did;
    if (util.verifyDID(did)) {
      if (keyload === null) {
        res.send(JSON.stringify('No keyload available.'));
      } else {
        res.send(JSON.stringify(keyload));
      }
    } else {
       res.status(403).send();
    }  
  });

  rest.get('/did', (req, res) => {
    res.send(util.getIdentityVPObject('offlineVerifiablePresentationAuthor.json'));
  });

  return rest;
}
