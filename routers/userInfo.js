const express = require("express");
const router = express.Router();

const {
  getHomepage,
  searchUser,
  singleUser,
} = require("../controllers/userInfo");

router.route("/getHomepage").get(getHomepage);
router.route("/searchUsers").get(searchUser);
router.route("/getSingleUser").get(singleUser);

module.exports = router;
