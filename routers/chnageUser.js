const express = require("express");
const router = express.Router();
const { changePassword, changeUsername } = require("../controllers/changeUser");

router.route("/changePassword").patch(changePassword);
router.route("/changeUsername").patch(changeUsername);

module.exports = router;
