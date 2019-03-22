var express = require('express'); // Route handlers and templates usage
var path = require('path'); // Populating the path property of the request
var logger = require('morgan'); // HTTP request logging
var bodyParser = require('body-parser'); // Access to the HTTP request body
var cp = require('child_process'); // Forking a separate Node.js processes
var responseTime = require('response-time'); // Performance logging
var assert = require('assert'); // assert testing of values
var helmet = require('helmet'); // Security measures
var RateLimit = require('express-rate-limit'); // IP based rate limiter
var csp = require('helmet-csp');


//check if prod, if prod no env but get config in EB
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

var users = require('./routes/users');
var session = require('./routes/sessions');
var memes = require('./routes/memes');

var app = express();
app.enable('trust proxy');

var limiter = new RateLimit({
  windowMs: 15 * 60 * 1000, //15min
  max: 100, //100 req by 15min
  delayMs: 0 //full speed until max
});
app.use(limiter);

app.use(helmet());
app.use(csp({ //cache
  directives: {
    defaultSrc: ['"self"'],
    scriptSrc:['"self"', '"unsafe-inline"', 'ajax.googleapis.com', 'maxcdn.bootstapcdn.com'],
    styleSrc:['"self"', '"unsafe-infline"', 'maxcdn.bootstrapcdn.com'],
    fontSrc: ['"self"', 'maxcdn.bootstrapcdn.com'],
    imgSrc: ["*"]
  }
}));

app.use(responseTime());

app.use(logger('dev')); //log all http req
app.use(bodyParser.json({limit: '100kb'})); //set a limit to the json. SECURITY

app.get('/', function (req, res) {
  //__dirname get the name of the dir where the code is executed
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

//for static content (html, spa, images etc)
app.use(express.static(path.join(__dirname, "build")));

var node2 = cp.fork('./worker/app_FORK.js', [], { execArgv: ['--inspect=9229'] });
var node2 = cp.fork('./worker/app_FORK.js');
node2.on('exit', function (code) {
  console.log("Worker crashed and was restarted.", code);
node2 = undefined;
node2 = cp.fork('./worker/app_FORK.js');
});


//CONNECTION TO DB
var db = {};
var MongoClient = require('mongodb').MongoClient;

MongoClient.connect(process.env.MONGODB_CONNECT_URL,{ useNewUrlParser: true }, function(err, client) {
  assert.equal(null, err);
  db.client = client;
  db.collection = client.db('memender').collection('memesCollection');
  console.log('connected')
});

app.use(function(req,res,next) {
  req.db = db;
  req.node2 = node2;
  next();
});

// Rest API routes
app.use('/api/users', users);
app.use('/api/sessions', session);
app.use('/api/memes', memes);


//404error
app.use(function (req,res,next) {
  var err = new Error('Not found');
  err.status = 404;
  next(err);
});

//error handler in dev
if (app.get('env') === 'development') {
  app.use(function (err,req,res,next) {
    res.status(err.status || 500).json({message: err.toString(), error: err});
    console.log(err);
  })
}

//error handler in production
app.use(function (err, req, res, next) {
res.status(err.status || 500).json({message: err.toString(), error: {}});
console.log(err);
});

app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function() {
  console.log('express server on ' + server.address().port);
});

server.db = db;
server.node2 = node2;
module.exports = server
