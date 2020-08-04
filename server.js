"use strict";

const express = require("express");
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const session = require('express-session');
const passport = require('passport');
const ObjectID = require('mongodb').ObjectID;
const mongo = require('mongodb').MongoClient;
const LocalStrategy = require('passport-local');

const app = express();

app.set('view engine', 'pug');

fccTesting(app); //For FCC testing purposes
app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  
  return res.redirect('/');
};

mongo.connect(process.env.DATABASE, (err, db) => {
  if (err)
  {
    console.log(process.env.DATABASE);
    console.log("Database error: " + err);
  }
  else
  {
    console.log("Successful database connection.");
    
    passport.use(new LocalStrategy((username, password, done) => {
      db.collection('users').findOne({username}, (err, user) => {
        console.log(`User ${user} attempted to log in.`);
        if (err) return done(err);
        if (!user) return done(null, false);
        if (password !== user.password) return done(null, false);
        
        return done(null, user);
      });
    }));
    
    passport.serializeUser((user, done) => {
      done(null, user._id);
    });
    passport.deserializeUser((id, done) => {
      db.collection('users').findOne(
        {_id: new ObjectID(id)},
        (err, doc) => done(null, doc)
      );
    });
    
    app.route("/").get((req, res) => {
      //Change the response to render the Pug template
      res.render("./pug/index.pug", {title: 'Home Page ', message: 'Please login', showLogin:true});
    });
    
    app.route("/login").post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
      res.render("./pug/profile.pug");
    });
    
    app.route("/profile").get(ensureAuthenticated, (req, res) => {
      res.render(`${process.cwd()}/views/pug/profile`, {username: req.user.username});
    });
    
    app.listen(process.env.PORT || 3000, () => {
      console.log("Listening on port " + process.env.PORT);
    });
  }
});