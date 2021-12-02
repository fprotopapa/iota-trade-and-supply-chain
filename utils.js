/* utils.js
*
*  SPDX-FileCopyrightText: Copyright 2021 Fabbio Protopapa
*  SPDX-License-Identifier: MIT
*
*  ToDo: 
*        - Refactor way of loading existing instance -> use import and *        - Store pwd etc with stronghold
*        - Store or retrieve index to work with reloaded instances
*        - Multi Branch
*/

const streams = require('./node/streams');
streams.set_panic_hook();

const fs = require('fs');
const configPath = './config/default.json';
const config = require(configPath);
const https = require('https');
const http = require('http');

module.exports = {
    showMessages,
    syncState,
    fetchNextMessages,
    sendSignedPacket,
    toBytes,
    fromBytes,
    makeSeed,
    writeJsonFile,
    makeClient,
    getNodeURL,
    getRequest,
    postRequest,
    verifyDID
}

function postRequest(url, port, path, dataJson, protocol='https') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: url,
            port: port,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': dataJson.length
              }
        }

        let rest = https;
        if (protocol !== 'https') {
            rest = http;
        }

        const req = rest.request(options, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(res.statusCode);
            }
            res.on('data', function(chunk) {
                process.stdout.write(chunk);
            });
            resolve(res.statusCode);
        });
        req.on('error', (e) => {
        reject(e.message);
        });
    req.write(dataJson);
    req.end();
    });
}

function getRequest(url, port, path, protocol='https') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: url,
            port: port,
            path: path,
            method: 'GET'
        }

        let rest = https;
        if (protocol !== 'https') {
            rest = http;
        }

        const req = rest.request(options, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(res.statusCode);
            }
            var body = [];
            res.on('data', function(chunk) {
                body.push(chunk);
            });
            res.on('end', function() {
                try {
                    body = JSON.parse(Buffer.concat(body).toString());
                } catch(e) {
                    reject(e);
                }
                resolve(body);
            });
        });
        req.on('error', (e) => {
        reject(e.message);
        });
    req.end();
    });
}

// Show fetched messages
function showMessages(messages, subName) {
    console.log("Message for " + subName);
    for (var i = 0; i < messages.length; i++) {
        let next = messages[i];
        for (var j = 0; j < next.length; j++) {
        console.log("Found a message...");
        if (next[j].message == null) {
            console.log("Message undefined");
        } else {
            console.log(
            "Public: ",
            fromBytes(next[j].message.get_public_payload()),
            "\tMasked: ",
            fromBytes(next[j].message.get_masked_payload())
            );
        }
        }
    }
}

// Synch state before publishing
async function syncState(sender) {
console.log("Syncing state ...");
await sender.clone().sync_state();
}
// Fetch messages for receiver
async function fetchNextMessages(receiver) {
// Catch timeout, undefined
let isMessage = true;
let nextMsgs = [];
while (isMessage) {
    let msg = await receiver.clone().fetch_next_msgs();
    if (msg.length === 0) {
    isMessage = false;
    } else {
    nextMsgs.push(msg);
    }
}
return nextMsgs;
}

// Publisher sending signed packet
async function sendSignedPacket(msgLink, sender, publicPayload, maskedPayload) {
response = await sender
            .clone()
            .send_signed_packet(msgLink, publicPayload, maskedPayload);
return response.link;
}
  
// Make bytes out of string
function toBytes(str) {
    var bytes = [];
    for (var i = 0; i < str.length; ++i) {
        bytes.push(str.charCodeAt(i));
    }
    return bytes;
}

// Make string out of bytes
function fromBytes(bytes) {
    var str = "";
    for (var i = 0; i < bytes.length; ++i) {
        str += String.fromCharCode(bytes[i]);
    }
    return str;
}

// Save json file
function writeJsonFile(file, path) {
    fs.writeFile(path, JSON.stringify(file, null, 2), function writeJSON(err) {
        if (err) return console.log(err);
        console.log("File at " + path + " written.");
    });
}

// Create new random seed
function makeSeed(size) {
    const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let seed = "";
    for (i = 9; i < size; i++) {
    seed += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return seed;
}

function getNodeURL() {
    // Read env variable name from config file
    nodeUrlEnv = config.env.nodeUrl; 
    // Get node url from environment, if not defined fall back to default
    let nodeUrl = process.env[nodeUrlEnv];
    if (nodeUrl === undefined) {
        nodeUrl = "https://chrysalis-nodes.iota.org";
    }
    return nodeUrl
}

async function makeClient() {
    let nodeUrl = getNodeURL();
    // Build client from node url
    const client = await new streams.ClientBuilder().node(nodeUrl).build();
    return client;
}

function verifyDID(did) {
    return true;
}