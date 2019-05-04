"use strict";
var express = require('express');
var joi = require('joi'); // For data validation
var authHelper = require('./authHelper');
var router = express.Router();
var ObjectId = require('mongodb').ObjectID;


router.post('/', authHelper.checkAuth, function(req,res,next) {
  var schema = {
    url: joi.string().max(300).required(),
    userSub: joi.string().max(300).required()
  };

  joi.validate(req.body, schema, function(err){
    if (err) return next(err);
    var xferMemes = {
      type: "MEME_TYPE",
      date: new Date(Date.now()),
      upvote: 0,
      downvote: 0,
      total: 0,
      ratio: 0,
      url: req.body.url,
      userSub: req.body.userSub

    };
    req.db.collection.insertOne(xferMemes,
      function createMeme(err,result) {
        if (err) return next(err);
        res.status(201).json(result.ops[0])
      });
  });
});


// function checkRelation(obj, data) {
//   return data.findOne({type: "RELATION_TYPE", memeId: obj._id, userSub: obj.userSub }).then(function(relation) {
//     if (relation) return true;
//     return false;
//   });
// }


router.get('/:id/bestofalltime', authHelper.checkAuth, function(req,res,next){
  // req.db.collection.find({type: 'MEME_TYPE'}).toArray(function(err,docs) {
  //   if (err) return next(err);
  //   res.status(200).json(docs);
  // });

  var next_page = req.query.next;
    if (next_page === 0) {
      req.db.collection.find({type: "MEME_TYPE"}
      ).sort({upvote: -1 , downvote: 1}).limit(10).toArray(function(err, docs) {
        if (err) return next(err);
        res.status(200).json(docs)
    })
  } else {
    req.db.collection.find({type: "MEME_TYPE"}
    ).sort({upvote: -1 , downvote: 1}).skip(next_page * 10).limit(10).toArray(function(err, docs) {
      if (err) return next(err);
      res.status(200).json(docs)
    })
  }
});

router.get('/:id/monthlybest', authHelper.checkAuth, function(req,res,next){
  // req.db.collection.find({type: 'MEME_TYPE'}).toArray(function(err,docs) {
  //   if (err) return next(err);
  //   res.status(200).json(docs);
  // });

    // req.db.collection.aggregate([
    //   {$match: {type: "MEME_TYPE", date: {$lt: new Date(), $gte: new Date(new Date().setDate(new Date().getDate()-31))}}},
    //   {$sort: {upvote: -1, downvote: 1}},
    // ]).limit(50).toArray(function(err, docs) {
    //   if (err) return next(err);
    //   res.status(200).json(docs)
    // })
  var next_page = req.query.next;
  if(next_page && next_page > 1) {
    req.db.collection.find({type: "MEME_TYPE", date: {$lt: new Date(), $gte: new Date(new Date().setDate(new Date().getDate()-31))}}).sort({upvote: -1, downvote: 1}).skip(next_page - 1).limit(5).toArray(function(err,docs){
      if (err) return next(err);
      res.status(200).json(docs)
    })
  } else {
    req.db.collection.find({type: "MEME_TYPE", date: {$lt: new Date(), $gte: new Date(new Date().setDate(new Date().getDate()-31))}}).sort({upvote: -1, downvote: 1}).limit(5).toArray(function(err,docs){
      if (err) return next(err);
      res.status(200).json(docs)
    })
  }

});

router.get('/:id/weeklybest', authHelper.checkAuth, function(req,res,next){
  // req.db.collection.find({type: 'MEME_TYPE'}).toArray(function(err,docs) {
  //   if (err) return next(err);
  //   res.status(200).json(docs);
  // });


  var next_page = req.query.next;
  if(next_page && next_page > 1) {
    req.db.collection.find({type: "MEME_TYPE", date: {$lt: new Date(), $gte: new Date(new Date().setDate(new Date().getDate()-7))}}).sort({upvote: -1, downvote: 1}).skip(next_page - 1).limit(5).toArray(function(err,docs){
      if (err) return next(err);
      res.status(200).json(docs)
    })
  } else {
    req.db.collection.find({type: "MEME_TYPE", date: {$lt: new Date(), $gte: new Date(new Date().setDate(new Date().getDate()-7))}}).sort({upvote: -1, downvote: 1}).limit(5).toArray(function(err,docs){
      if (err) return next(err);
      res.status(200).json(docs)
    })
  }

});



router.get('/:id', authHelper.checkAuth, function(req,res,next){
  // req.db.collection.find({type: 'MEME_TYPE'}).toArray(function(err,docs) {
  //   if (err) return next(err);
  //   res.status(200).json(docs);
  // });
  console.log('this is usersub')
  console.log(req.params.id)

      req.db.collection.aggregate([
        {$match: {type: "MEME_TYPE", userChecked: {$nin: [req.params.id]}}},
        {$sample: {size: 5}},
      ]).toArray(function(err, docs) {
        if (err) return next(err); 

        res.status(200).json(docs)
          }) 

        })








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
    userSub: joi.string().max(300).required()
  };
  console.log(req.body)
  console.log(req.params.id)
joi.validate(req.body, schema, function(err) {
  if(err) {
    return next(err)
  }

  req.db.collection.findOneAndUpdate({type:"MEME_TYPE", _id: ObjectId(req.params.id)},
  {$inc: {upvote: 1, total: 1}, $push: {userChecked: req.body.userSub}},{returnOriginal: true},
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

router.post('/:id/createrelation', authHelper.checkAuth, function(req,res,next){
  console.log('eeejjj')
  var schema ={
    memeId: joi.string().max(300).required(),
    userSub: joi.string().max(300).required()
  };

  joi.validate(req.body, schema ,function(err) {
    if (err) return next(err);
    var xferRelations = {
      type: 'RELATION_TYPE',
      memeId: req.params.id,
      userSub: req.body.userSub 
    }
  
    req.db.collection.insertOne(xferRelations, function createRelation(err,result) {
      if (err) return next(err);
      res.status(201).json(result.ops[0])
    })

  })
})

router.put('/:id/downvote', authHelper.checkAuth, function(req,res,next) {
  var schema = {
    memeId: joi.string().max(300).required(),
    userSub: joi.string().max(300).required()
  };
joi.validate(req.body, schema, function(err) {
  if(err) {
    return next(err)
  }
  req.db.collection.findOneAndUpdate({type:"MEME_TYPE", _id: ObjectId(req.params.id)},
  {$inc: {downvote: 1, total: 1}, $push: {userChecked: req.body.userSub}},{returnOriginal: true},
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