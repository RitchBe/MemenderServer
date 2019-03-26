"use strict";
var express = require('express');
var joi = require('joi'); // For data validation
var authHelper = require('./authHelper');
var router = express.Router();
var ObjectId = require('mongodb').ObjectID;


router.post('/', authHelper.checkAuth, function(req,res,next) {
  var schema = {
    url: joi.string().max(300).required(),
    upvote: joi.number().required(),
    downvote: joi.number().required(),
    total: joi.number().required(),
    date: joi.date().required(),
    ratio: joi.number().max(100),
  };

  joi.validate(req.body, schema, function(err){
    if (err) return next(err);
    var xferMemes = {
      type: "MEME_TYPE",
      userId: req.auth.userId,
      date: Date.now(),
      upvote: 0,
      downvote: 0,
      total: 0,
      ratio: 0,
      url: req.body.url

    };
    req.db.collection.insertOne(xferMemes,
      function createMeme(err,result) {
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
      console.log("POSSIBLE CONTENTION ERROR? err: " , err)
      return next(err)
    } else if (result.ok != 1) {
      console.log("POSSIBLE CONTENTION ERROR? result: " , result)
      return next(new Error("delete meme failure"))
    }
    res.status(200).json({msg: "memes Deleted"})
  })
})

//create update function to upvote and downvote.

router.put('/:id/upvote', authHelper.checkAuth, function(req,res,next) {
  var schema = {
    memeId: joi.string().max(300).required(),
  };
joi.validate(req.body, schema, function(err) {
  if(err) {
    return next(err)
  }
  req.db.collection.findOneAndUpdate({type:"MEME_TYPE", _id: ObjectId(req.params.id)},
  {$inc: {upvote: 1, total: 1}},{returnOriginal: true},
  function(err,result) {
    if (err) {
      console.log("CONTENTION ERROR?"  ,err)
      return next(err);
    } else if (result.ok != 1 ) {
      console.log("CONTENTION ERROR" , result)
      return next(new Error("Upvote failure"))
    }
    res.status(200).json({msg: "Meme upvoted"})
  })
})
});

router.put('/:id/downvote', authHelper.checkAuth, function(req,res,next) {
  var schema = {
    memeId: joi.string().max(300).required(),
  };
joi.validate(req.body, schema, function(err) {
  if(err) {
    return next(err)
  }
  req.db.collection.findOneAndUpdate({type:"MEME_TYPE", _id: ObjectId(req.params.id)},
  {$inc: {downvote: 1, total: 1}},{returnOriginal: true},
  function(err,result) {
    if (err) {
      console.log("CONTENTION ERROR?"  ,err)
      return next(err);
    } else if (result.ok != 1 ) {
      console.log("CONTENTION ERROR" , result)
      return next(new Error("downvote failure"))
    }
    res.status(200).json({msg: "Meme downvoted"})
  })
})
});

module.exports = router;