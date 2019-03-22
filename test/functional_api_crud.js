var assert = require('assert');
var app = require('../server');
var request = require('supertest')(app);

describe("User cycle operations", function() {
    var token;
    var userId;
    var savedMemes;
    //wait for db to be up
    before(function(done) {
        setTimeout(function() {
            done();
        }, 5000);
    });

    //shut everything down correctly
    after(function(done) {
        app.db.client.close();
        app.node2.kill();
        app.close(done);
    });

    it("should create a new registered User", function(done) {
        request.post("/api/users")
        .send({
            email: 'bush@sample.com',
            displayName: 'Bushman',
            password: "abc1234#"
        })
        .end(function (err,res) {
            assert.equal(res.status, 201);
            assert.equal(res.body.displayName, "Bushman", "Name of user should be as set");
            done();
        });
    });

    it("should not create a User twice", function(done) {
        request.post("/api/users")
         .send({
             email: "bush@sample.com",
             displayName: 'Bushman',
             password: 'abc1234#'
         })
         .end(function(err,res) {
             assert.equal(res.status, 500);
             assert.equal(res.body.message, "Error: Email account already registered");
             done();
         })
    })

    it("should detect incorrect password", function(done) {
        request.post("/api/sessions")
            .send({
                email: "bush@sample.com",
                password: "wrong1*"
            })
            .end(function(err, res) {
                assert.equal(res.status, 500);
                assert.equal(res.body.message, "Error: Wrong password");
                done();
            })
    })

    it("should allow registered user to login", function(done) {
        request.post('/api/sessions')
            .send({
                email: "bush@sample.com",
                password: "abc1234#"
            })
            .end(function(err,res) {
                token = res.body.token;
                userId = res.body.userId;
                assert.equal(res.status, 201);
                assert.equal(res.body.msg, "Authorized", "Message should be authorized")
                done();
            });
    });

    it("should allow registered user to logout", function(done) {
        request.del("/api/sessions/" + userId)
            .set('x-auth', token)
            .end(function (err, res) {
                assert.equal(res.status, 200);
                done();
            });
    });
    it("should not allow access if not logged in", function(done) {
        request.get("/api/users/" + userId)
            .end(function(err,res) {
                assert.equal(res.status, 500);
                done();
            });
    });
    it("should allow registered user to login", function (done) {
        request.post("/api/sessions")
            .send({
                email: 'bush@sample.com',
                password: 'abc1234#'
            })
            .end(function (err, res) {
                token = res.body.token;
                userId = res.body.userId;
                assert.equal(res.status, 201);
                assert.equal(res.body.msg, "Authorized", " Authorized Message");
                done();
            });
        });
        it("should delete a registered User", function (done) {
            request.del("/api/users/" + userId)
            .set('x-auth', token)
            .end(function (err, res) {
                assert.equal(res.status, 200);
                done();
            });
    });
});