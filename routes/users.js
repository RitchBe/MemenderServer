var express = require('express');
var bcrypt = require('bcryptjs');
var async = require('async');
var joi = require('joi');
var authHelper = require('./authHelper');
var ObjectId = require('mongodb').ObjectID;

var router = express.Router();


//create a user
router.post('/', function postUser(req, res, next) {
  var schema = {
    userSub: joi.string().required(),
    nickname: joi.string().min(3).max(50).required(),
    picture: joi.string().required()
  };
  console.log('be ready to be in the db')

  joi.validate(req.body, schema, function(err, value) {
    if (err) {
      return next(new Error('Invalid field: display name must be 3 to 50 chr, valide email and password 7 to 15 chrct (with one number, one special character)'));
    }
    req.db.collection.findOne({
      type: 'USER_TYPE',
      userSub: req.body.userSub
    }, function(err, doc) {
      if (err) {
        return next(err);
      };
      if (doc) {
        return next(new Error('Email account already registered'));
      }

      var xferUser = {
        type: "USER_TYPE",
        nickname: req.body.nickname,
        userSub: req.body.userSub,
        picture: req.body.picture,
        date: Date.now(),
        completed: false,
        savedMemes: [],
        enableAlert: false,
        alertFrequency: 0,
        updatedMemes: []
      };

      //crypted password
      
    
        req.db.collection.insertOne(xferUser, function createUser(err, result) {
          if (err) {
            return next(err);
          }
          // req.node2.send({msg: "REFRESH_MEMES", doc: result.ops[0]});
          res.status(201).json(result.ops[0]);
        });
      });
    });
  });



//delete user
router.delete('/:id',
  authHelper.checkAuth,
  function(req, res, next) {
    if (req.params.id != req.auth.userId) {
      return next(new Error('Invalid request for accouunt deletion'));
    }

    req.db.collection.findOneAndDelete({
        type: 'USER_TYPE',
        _id: ObjectId(req.auth.userId)
      },
      function(err, result) {
        if (err) {
          console.log("POSSIBLE USER DELETION CONTENTION? err: " , err);
          return next(err);
        } else if (result.ok != 1) {
          console.log("POSSIBLE USER DELETION ERROR? result: " , result);
          return next(new Error("account deletion failur"));
        }
        res.status(200).json({
          msg: "User deleted"
        });
      });
  });

//get user
router.get('/:id', authHelper.checkAuth, function(req, res, next) {
  if (req.params.id != req.auth.sub) {
    return next(new Error('Invalid request for account fetch'))
  }
  req.db.collection.findOne({
    type: 'USER_TYPE',
    _id: ObjectId(req.auth.userId)
  }, function(err, doc) {
    if (err) return next(err);

    var xferProfile = {
      email: doc.email,
      displayName: doc.displayName,
      date: doc.date,
      savedMemes: doc.savedMemes,
      enableAlert: doc.enableAlert,
      alertFrequency: doc.alertFrequency,
      updatedMemes: doc.updatedMemes
    };

    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.header('Pragma', "no-cache");
    res.header('Expires', 0);
    res.status(200).json(xferProfile);
  })
})


// router.put('/:id', authHelper.checkAuth, function(req,res,next){
//   if(req.params.id != req.auth.userId) {
//     return next(new Error('invalid request for account update'))
//   }
//
// })

router.post('/:id/savedmemes', authHelper.checkAuth, function(req,res,next){
  if (req.params.id != req.auth.sub) {
    return next(new Error('Invalid request to get memes'))
  }
  var schema = {
    memeId: joi.string().max(100).required(),
    url:joi.string().max(200).required(),
    userSub: joi.string().max(200).required(),
    date: joi.date().required()

  };
  joi.validate(req.body, schema, function(err) {
    if(err) {
      return next(err);
    };
    req.db.collection.findOneAndUpdate({type: 'USER_TYPE', userSub: req.body.userSub},
    {$addToSet: { 
      savedMemes: {
        url: req.body.url,
        memeId: req.body.memeId,
        userSub: req.body.userSub,
        date: new Date(req.body.date)
      }}},
    {returnOriginal: true},
    function(err,result) {
      if (err) {
        console.log("POSSIBLE CONTENTION ERROR" , err)
        return next(err);
      } else if (result.ok != 1){
        console.log('POSSIBLE CONTENTION ERROR', result)
      }
      res.status(200).json(result.value)
    })
  })
})



router.delete('/:id/savedmemes/:sid', authHelper.checkAuth, function(req, res, next) {
  if (req.params.id != req.auth.sub) {
    return next(new Error('Invalid request to get memes'))
  }
  req.db.collection.findOneAndUpdate({
      type: "USER_TYPE",
      userSub: req.params.id
    }, {
      $pull: {
        savedMemes: {
          memeId: req.params.sid
        }
      }
    }, {
      returnOriginal: true
    },
    function(err, result) {
      if (err) {
        console.log("POSSIBLE CONTENTION ERROR? err: " + err);
        return next(err);
      } else if (result.ok != 1) {
        console.log("POSSIBLE CONTENTION ERROR? result:" + result )
      }
      res.status(200).json(result.value);
    });
});

router.get("/:id/savedmemes" , authHelper.checkAuth, function(req, res, next) {
  var savedMemes;
  // var last_id = req.query.next;
  if (req.params.id != req.auth.sub) {
    return next(new Error('Invalid request to get memes'))
  }

  var next_page = req.query.next;
  if (next_page) {
    req.db.collection.findOne({type: 'USER_TYPE', userSub: req.params.id}, function(err, doc) {
      if (err) return next(err);
      savedMemes = doc.savedMemes.sort({date:1}).slice(next_page + 1, next_page + 10);
      res.status(200).json(savedMemes);
      return;
    })
  } else {
    req.db.collection.findOne({type: 'USER_TYPE', userSub: req.params.id}, function(err, doc) {
      if (err) return next(err);
      if (doc.savedMemes) {
        savedMemes = doc.savedMemes.sort({date: 1}).slice(0,10)
        console.log(savedMemes)
        res.status(200).json(savedMemes)
        return;
      }
      res.status(200)
      return;

    });
  }


  

  // req.db.findOne({type: 'MEME_TYPE', memeId: savedMemes}, function(err, meme) {
  //   if (err) return next(err);
  // })

})    


router.get('/:id/memes', authHelper.checkAuth, function(req, res, next) {
  if (req.params.id != req.auth.sub) {
    return next(new Error('Invalid request to get memes'))
  }
   var last_date = req.query.next; 

   console.log(req.query.next);
   if (last_date) {
    req.db.collection.find({type: "MEME_TYPE", userSub: req.params.id, date: {$gt: new Date(last_date.toString())}}).sort({date: 1}).limit(10).toArray(function(err,docs) {
      if (err) return next(err);
      console.log(docs)
      res.status(200).json(docs)
      return;
    })
   } else {
     console.log('not here plasewe')
    req.db.collection.find({type: "MEME_TYPE", userSub: req.params.id}).sort({date: 1}).limit(10).toArray(function(err,docs) {
      if (err) return next(err);
      res.status(200).json(docs)
      return;
   })
  }
})



router.delete('/:id/memes/:sid', authHelper.checkAuth, function(req, res, next) {
  req.db.collection.findOneAndDelete({type: "MEME_TYPE", _id: ObjectId(req.params.sid), userSub: req.params.id}, function(err, result){
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

//   req.db.collection.findOneAndDelete({type: 'MEME_TYPE', _id: ObjectId(req.params.sid)}, function(err, result) {
//     if (err) {
//       console.log("POSSIBLE CONTENTION ERROR" , err)
//       return next(err)
//     } else if (result.ok != 1) {
//       console.log("POSSIBLE CONTENTION ERROR" , result)
//       return next(new Error('deleting meme failure'))
//     }
//     res.status(200).json({msg: 'Meme delete'})
//   })
// })



//create get /id/updatedmeme
//create delete /id/updatedmeme/id



module.exports = router;
