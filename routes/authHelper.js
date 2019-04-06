// validate the req header user token

"use strict";
var jwt = require('jwt-simple');


module.exports.checkAuth = function(req,res, next) {
  // if(req.headers['authorization']) {
  //   try {
  //     req.auth = jwt.decode(req.headers['authorization', process.env.JWT_SECRET]);
  //     console.log(req.auth)
  //     if (req.auth && req.auth.sub) {
  //       return next();
  //     } else {
  //       return next(new Error('User is not logged in.'));
  //     }
  //   } catch (err) {
  //     return next(err);
  //   }
  // } else {
  //   return next(new Error('User is not Logged in.'))
  // }
  console.log('iam undefined')
  console.log(req.headers['authorization'])
  next();
}

