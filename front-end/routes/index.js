var express = require('express');
var router = express.Router();
var crypto = require("crypto")
var filesupload = require("express-fileupload")

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Video Resizing Tool', result: false, code : "I am a code"});
});


module.exports = router;
