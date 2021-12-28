/* utils.js
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
    verifyDID,
    getRestURL,
    parseAnnouncementLinkString,
    fetchState,
    getEncryptPasswd,
    isEncryptedBinary,
    buildPath,
    checkFileExtension,
    fetchLatestLinkSB,
    showStates
}

function showStates(caller) {
    let currStates = fetchState(caller);
    console.log(currStates);
    let states = {};
    for (var i=0; i < currStates.length; i++) {
      states[i] = {};
      states[i]["id"] = currStates[i].identifier;
      states[i]["link"] = currStates[i].link.toString();
      states[i]["seq"] = currStates[i].seqNo;
      states[i]["branch"] = currStates[i].branchNo;
    }
    console.log(JSON.stringify(states));
    return states;
}

// Fetch state
async function fetchLatestLinkSB(caller, name) {
    // Fetch publisher states (sync to get same results)
    console.log('Latest Messagelink for: ', name);
    await syncState(caller);
    let currStates = caller.fetch_state();
    return streams.Address.parse(currStates[0].link.toString());
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
    //req.status(200);
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

function getEncryptPasswd() {
    // Read env variable name from config file
    encPwdEnv = config.env.authorPasswd; 
    // Get node url from environment, if not defined fall back to default
    let encPwd = process.env[encPwdEnv];
    if (encPwd === undefined) {
        encPwd = "123456";
    }
    return encPwd;
}

function checkFileExtension(filename, defaultExtension) {
    let ext = path.extname(filename);
    if (!ext) {
        filename = filename + defaultExtension;
    }
    return filename;
}

function buildPath(pathToDir) {
    let dirWD = path.resolve(__dirname);
    return path.join(dirWD, pathToDir);
}

function isEncryptedBinary(filename, dirPath) {
    filename = checkFileExtension(filename, '.bin');
    let ext = path.extname(filename);
    // Get list of saved instances
    var files = fs.readdirSync(dirPath);
    let foundInstances = files.filter(e => path.extname(e) === ext);
    // Check for existing author seed
    let isInstance = false;
    if (foundInstances.filter(e => path.basename(e) === filename).length) {
        isInstance = true;
    }
    return isInstance;
}

function getNodeURL() {
    // Read env variable name from config file
    nodeUrlEnv = config.env.nodeUrl; 
    // Get node url from environment, if not defined fall back to default
    let nodeUrl = process.env[nodeUrlEnv];
    if (nodeUrl === undefined) {
        nodeUrl = "https://chrysalis-nodes.iota.org";
    }
    return nodeUrl;
}

function getRestURL() {
    // Read env variable name from config file
    restUrlEnv = config.env.restUrl; 
    // Get node url from environment, if not defined fall back to default
    let restUrl = process.env[restUrlEnv];
    if (restUrl === undefined) {
        restUrl = "localhost";
    }
    return restUrl
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

function parseAnnouncementLinkString(announcementLinkStr) {
    return streams.Address.parse(announcementLinkStr);
}

function fetchState(sender) {
    states = sender.fetch_state();
    //console.log('link: ',states[0][0].get_link(), 'seq: ', states[0][0].get_seq_no(), 'branch: ', states[0][0].get_branch_no());
    //console.log('link: ',states[1].get_link(), 'seq: ', states[1].get_seq_no(), 'branch: ', states[1].get_branch_no());
    return states;
}