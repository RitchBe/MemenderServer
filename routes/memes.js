"use strict";
var express = require('express');
var joi = require('joi'); // For data validation
var authHelper = require('./authHelper');
var router = express.Router();


router.post('/', authHelper.checkAuth, function(req,res,next) {
  var schema = {
    url: joi.string().max(300).required(),
    upvote: joi.number().required(),
    downvote: joi.number().required(),
    date: joi.date.required(),
    memeId: joi.string().max(100).required(),
    ratio: joi.number().max(100)
  };

  joi.validate(req.body, schema, function(err){
    if (err) return next(err);
    var xferMemes = {
      _id: req.body.memeId,
      type: "MEME_TYPE",
      userId: req.auth.userId,
      date: Date.now(),
      upvote: 0,
      downvote: 0,
      ratio: 0,

    };
    req.db.collection.insertOne(xferMemes,
      function createUser(err,result) {
        if (err) return next(err);
        res.status(201).json(result.ops[0])
      });
  });
});


router.get('/', authHelper.checkAuth, function(req,res,next){
  req.db.collection.find({type: 'MEME_TYPE'}).toArray(function(err,docs) {
    if (err) return next(err);
    res.status(200).json(docs);
  });
});

router.delete('/:id', authHelper.checkAuth, function(req,res,next){
  req.db.collection.findOneAndDelete({type: "MEME_TYPE", _id: req.params.id}, function(err, result){
    if (err) {
      console.log("POSSIBLE CONTENTION ERROR? err: " + err)
    } else if (result.ok != 1) {
      console.log("POSSIBLE CONTENTION ERROR? result: " + result)
    }
    res.status(200).json({msg: "memes Deleted"})
  })
})

//create update function to upvote and downvote.

// router.put('/memes/:id', authHelper.checkAuth, function(req,res,next) {
//   var schema = {
//     url: joi.string().max(300).required(),
//     upvote: joi.number().required(),
//     downvote: joi.number().required(),
//     date: joi.date.required(),
//     memeId: joi.string().max(100).required(),
//     ratio: joi.number().max(100)
//   };
//   async.eachSeries(req.body.)
// });

module.exports = router;