const express = require("express");
const router = express.Router();
const { createClan, searchClan } = require("../controllers/clan");

router.route("/createClan").post(createClan);
router.route("/searchClan").get(searchClan);

module.exports = router;
