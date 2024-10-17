const express = require("express");
const router = express.Router();

const { checkGame } = require("../controllers/versusFriend");
const { getWord, SendGameData } = require("../controllers/word");
const { getWord: vsGetWord } = require("../controllers/versusFriend");

router.route("/word").get(getWord).post(SendGameData);
router.route("/vsWord").get(vsGetWord);
router.route("/checkGame").get(checkGame);

module.exports = router;
