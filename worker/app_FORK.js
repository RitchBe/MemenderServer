"use strict";
var bcrypt = require('bcryptjs');
var https = require("https");
var async = require('async');
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var MongoClient = require('mongodb').MongoClient;
var agenda = require('agenda')
var globalNewsDoc;
var urlExists = require('url-exists');

//
// MongoDB database connection initialization
//

console.log('i am working')

var db = {};
MongoClient.connect(process.env.MONGODB_CONNECT_URL, function (err, client) {
assert.equal(null, err);
db.client = client;
db.collection = client.db('memender').collection('memesCollection');
console.log("Fork is connected to MongoDB server");
});


// const database =  MongoClient.connect(process.env.MONGODB_CONNECT_URL);
// const agenda = new Agenda().mongo(database, 'memender');

// agenda.define('Delete bad memes', (job, done) => {
//     db.collection.find({type: "MEME_TYPE", total: {$gt: 100}}).toArray(function(err, docs) {
//         if (err) return err;
//         console.log(docs)
//     }, done);
// });

// agenda.processEvery('5 seconds')

process.on("message", (msg) => {
    console.log('Message from parent:' , msg)
})

let savedDoc
setInterval(() => {
    db.collection.find({type: "MEME_TYPE", total: {$gt: 100}}).toArray(function(err, docs) {
        if (err) return err;
        docs.forEach(meme => {
            if ( ((meme.upvote / meme.total) * 100) < 40 ) {
              db.collection.deleteOne({_id: ObjectId(meme._id)})
            }
            else {
                console.log('You are kept !')
            }
        });
    });
}, 600000)

// setInterval(()=> {
//     console.log('deleting...')
//     db.collection.find({type: "MEME_TYPE"}).toArray(function(err, docs) {
//         if (err) return err;
//         docs.forEach(meme => {
//             urlExists(meme.url, function(err, exists) {
//                 if (exists) {
//                     console.log('you good')
//                     return;
//                 } else {
//                     console.log('prepare to die')
//                     db.collection.deleteOne({_id: Object(meme._id)})
//                 }
//             })
//         })
//     })
// }, 10000)