const express = require("express");
const router = express.Router();
const { LogIn, Register } = require("../controllers/auth");

router.route("/login").post(LogIn);
router.route("/register").post(Register);

module.exports = router;
