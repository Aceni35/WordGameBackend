const express = require("express");
const router = express.Router();
const { getLeaderboard } = require("../controllers/leaderboard");

router.route("/leaderboards").get(getLeaderboard);

module.exports = router;
