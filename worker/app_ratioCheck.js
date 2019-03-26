"use strict";
var bcrypt = require('bcryptjs');
var https = require("https");
var async = require('async');
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var MongoClient = require('mongodb').MongoClient;
var globalNewsDoc;

var db = {};
MongoClient.connect(process.env.MONGODB_CONNECT_URL, function (err, client) {
assert.equal(null, err);
db.client = client;
db.collection = client.db('memender').collection('memesCollection');
console.log("Fork is connected to MongoDB server");
});

