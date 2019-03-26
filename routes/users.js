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
    displayName: joi.string().alphanum().min(3).max(50).required(),
    email: joi.string().email().min(7).max(50).required(),
    password: joi.string().regex(/^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{7,15}$/).required()
  };

  joi.validate(req.body, schema, function(err, value) {
    if (err) {
      return next(new Error('Invalid field: display name must be 3 to 50 chr, valide email and password 7 to 15 chrct (with one number, one special character)'));
    }
    req.db.collection.findOne({
      type: 'USER_TYPE',
      email: req.body.email
    }, function(err, doc) {
      if (err) {
        return next(err);
      };
      if (doc) {
        return next(new Error('Email account already registered'));
      }

      var xferUser = {
        type: "USER_TYPE",
        displayName: req.body.displayName,
        email: req.body.email,
        passwordHash: null,
        date: Date.now(),
        completed: false,
        savedMemes: [],
        enableAlert: false,
        alertFrequency: 0,
        updatedMemes: []
      };

      //crypted password
      bcrypt.hash(req.body.password, 10, function getHash(err, hash) {
        if (err) {
          return next(err);
        }
        xferUser.passwordHash = hash;
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
  if (req.params.id != req.auth.userId) {
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
  if (req.params.id != req.auth.userId) {
    return next(new Error('Invalid request for saving memes'));
  }
  var schema = {
    memeId: joi.string().max(100).required(),
    url:joi.string().max(200).required()

  };
  joi.validate(req.body, schema, function(err) {
    if(err) {
      return next(err);
    };
    req.db.collection.findOneAndUpdate({type: 'USER_TYPE', _id: ObjectId(req.auth.userId)},
    {$addToSet: { savedMemes: req.body}},
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
  if (req.params.id != req.auth.userId) {
    return next(new Error('Invalid request for saved meme deletions'))
  }
  req.db.collection.findOneAndUpdate({
      type: "USER_TYPE",
      _id: ObjectId(req.auth.userId)
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
  if (req.params.id != req.auth.userId) {
    return next(new Error('Invalid request to get memes'))
  }
  req.db.collection.findOne({type: 'USER_TYPE', _id: ObjectId(req.auth.userId)}, function(err, doc) {
    if (err) return next(err);
    savedMemes = doc.savedMemes
    console.log(savedMemes)
    res.status(200).json(savedMemes)


  });
  // req.db.findOne({type: 'MEME_TYPE', memeId: savedMemes}, function(err, meme) {
  //   if (err) return next(err);
  // })

})    


router.get('/:id/memes', authHelper.checkAuth, function(req, res, next) {
  if (req.params.id != req.auth.userId) {
    return next(new Error("Invalid request to get uploaded meme"))
  }
  req.db.collection.find({type: "MEME_TYPE", userId:ObjectId(req.auth.userId)}).toArray(function(err,docs) {
    if (err) return next(err);
    res.status(200).json(docs)
  })
} )



router.delete('/:id/memes/:sid', authHelper.checkAuth, function(req, res, next) {
  if (req.params.id != req.auth.userId) {
    return next(new Error("Invalid request for deleting uploaded meme"))
  }
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
