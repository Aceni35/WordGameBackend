const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { genSalt, hash, compare } = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: [4, "username requires a minimum of 4 letters or numbers"],
    maxlength: [8, "username requires a maximum of 8 letters or numbers"],
  },
  online: {
    type: Boolean,
    required: false,
    default: true,
  },
  password: {
    type: String,
    minlength: 4,
    required: true,
  },
  friends: {
    type: Array,
    required: false,
  },
  notifications: {
    type: Array,
    required: false,
  },
  since: {
    type: String,
  },
  clan: {
    type: String,
    default: "no-clan",
  },
});

UserSchema.methods.createJWT = function () {
  return jwt.sign(
    { userId: this._id, username: this.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_LIFETIME }
  );
};

UserSchema.methods.matchPassword = async function (candidate) {
  const isMatch = await compare(candidate, this.password);
  return isMatch;
};

UserSchema.pre("save", async function () {
  const salt = await genSalt(10);
  const crypted = await hash(this.password, salt);
  this.password = crypted;
});

module.exports = mongoose.model("User", UserSchema);
