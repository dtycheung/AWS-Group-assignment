var express = require("express");
const axios = require("axios");
var router = express.Router();

/* GET home page. */
router.get("/", async (req, res, next) => {
  const hash = req.query.hash;

  try {
    const response = await axios.get(
      `${process.env.TRANSCODE_SERVER}/transcode?hash=${hash}`
    );
    const link = response.data;
    if (link.success) {
      res.json({ video: link.url });
    } else {
      res.json({ error: link.message });
    }
  } catch (err) {
    res.json({ error: "Unknow error occured " });
  }
});

module.exports = router;
