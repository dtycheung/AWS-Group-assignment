var express = require("express");
const aws = require("aws-sdk");
const ffmpeg = require("fluent-ffmpeg");
const stream = require("stream");
const redis = require("redis");
const { default: PQueue } = require("p-queue");
var router = express.Router();
require("dotenv").config();

const requestQueue = new PQueue({ concurrency: 1 });

// S3 setup
const bucketName = process.env.S3_BUCKET;
const s3 = new aws.S3({
  apiVersion: "2006-03-01",
  region: "ap-southeast-2",
});

(async () => {
  try {
    console.log("Creating bucket...");
    await s3.createBucket({ Bucket: bucketName }).promise();
    console.log(`Create bucket: ${bucketName}`);
  } catch (err) {
    if (err.statusCode !== 409) {
      console.log(`Error creating bucket: ${bucketName}`, err.stack);
    } else {
      console.log(`Bucket ${bucketName} already exists!`);
    }
  }
})();

// Redis setup
const redisClient = redis.createClient({
  url: process.env.REDIS_ENDPOINT
});

(async () => {
  try {
    await redisClient.connect();
  } catch(err) {
    console.log(err);
  }
})();

/* GET home page. */
router.get("/", async (req, res, next) => {
  
  const hash = req.query.hash;
  const bucketParams = {
    Bucket: bucketName,
    Key: hash,
  };

  try {
    await requestQueue.add(async () => {
      console.log("Retrieving video");
      s3Result = await s3.getObject(bucketParams).promise();
      signedUrl = await convertVideo(s3Result.Body, hash);
      res.json({ success: true, url: signedUrl });
    });
  } catch (err) {
    if (err.statusCode === 404) {
      res.json({ success: false, message: "No object found" });
    } else {
      res.json({ success: false, message: "An error has occured!" });
      console.log(err);
    }
  }
});

module.exports = router;


/**
 * Asynchronously transcodes a video using h265
 * @param {*} video 
 * @param {*} hash 
 * @returns
 */
const convertVideo = (video, hash) => {
  return new Promise((resolve, reject) => {
    /* Converting the video uploaded by user to h265 encoded mp4 file.
       With help from: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/1106#issuecomment-888330751
      */
    const bufferStream = new stream.PassThrough();
    ffmpeg(stream.Readable.from(video))
      .videoCodec("libx265")
      .format("mp4")
      /* The below line allows us to write the output to a stream,
          unable to remux otherwise
          https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/346
        */
      .outputOptions(["-preset superfast", "-movflags frag_keyframe+empty_moov"])
      .on("end", () => console.log("Done!"))
      .on("stderr", function (errLn) {
        console.log(errLn);
      })
      .on("error", function (err) {
        throw new Error("Could not transcode!");
      })
      .stream(bufferStream);

    // Converting the stream to a buffer
    const buffers = [];
    bufferStream.on("data", function (buf) {
      buffers.push(buf);
    });
    bufferStream.on("end", async () => {
      const outputBuffer = Buffer.concat(buffers);
      const key = hash + "-h265";
      const objectParams = {
        Bucket: bucketName,
        Key: key,
        Body: outputBuffer,
      };
      await s3.putObject(objectParams).promise();
      const signedUrl = s3.getSignedUrl("getObject", {
        Expires: 3600,
        Bucket: bucketName,
        Key: key,
      });
      await redisClient.setEx(hash, 3600, signedUrl);
      resolve(signedUrl);
    });
    bufferStream.on("error", function (err) {
      throw new Error("Could not complete transcode!");
    });
  });
};
