const express = require('express');
const aws = require('aws-sdk');
const axios = require('axios');
const mime = require('mime-types');
const router = express.Router();
require('dotenv').config();

// S3 setup
const bucketName = process.env.S3_BUCKET;
const s3 = new aws.S3({
  apiVersion: "2006-03-01",
  region: "ap-southeast-2"
});

(async () => {
  try {
    console.log("Creating bucket...");
    await s3.createBucket({ Bucket: bucketName }).promise();
    console.log(`Create bucket: ${bucketName}`);
  } catch(err) {
    if (err.statusCode !== 409) {
      console.log(`Error creating bucket: ${bucketName}`, err.stack);
    } else {
      console.log(`Bucket ${bucketName} already exists!`);
    }
  }
})();

router.get('/', async (req, res, next) => {
  const videoName = req.query.name;
  const hash = req.query.hash;
  const mimeType = mime.lookup(videoName);
  const urlParams = {
    Bucket: bucketName,
    Key: hash,
    Expires: 600,
    ContentType: mimeType
  };

  try {
    console.log(`Generating pre-signed URL for video ${videoName}...`);
    const presignedUrl = s3.getSignedUrl('putObject', urlParams);
    console.log(`Presigned URL for ${videoName} generated!`);
    res.json({ s3Url: presignedUrl });
  } catch(err) {
    console.log(err);
  }
});

module.exports = router;
