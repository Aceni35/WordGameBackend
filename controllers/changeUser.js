const { StatusCodes } = require("http-status-codes");
const BadRequest = require("../errors/BadRequesError");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const GameRecord = require("../models/GameRecord");

const changePassword = async (req, res) => {
  const { userId } = req.user;
  const { password: newPass } = req.body;
  if (!newPass) {
    throw new BadRequest("please provide the new password");
  }
  const oldUser = await User.findById({ _id: userId });
  const isMatch = await oldUser.matchPassword(newPass);
  console.log(isMatch);
  if (isMatch) {
    throw new BadRequest("The passwords cant match your old one");
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPass = await bcrypt.hash(newPass, salt);

  const user = await User.findByIdAndUpdate(
    { _id: userId },
    { password: hashedPass },
    { new: true, runValidators: true }
  );
  res
    .status(StatusCodes.OK)
    .json({ user, msg: "password changed successfuly" });
};

const changeUsername = async (req, res) => {
  const { userId, username } = req.user;
  const { username: newName } = req.body;
  if (!username) {
    throw new BadRequest("no account matches your current username");
  }
  if (newName === username) {
    throw new BadRequest("your old username cant match your new one");
  }
  if (!newName) {
    throw new BadRequest("please provide your new name");
  }
  await GameRecord.findOneAndUpdate({ name: username }, { name: newName });
  const newUser = await User.findByIdAndUpdate(
    { _id: userId },
    { username: newName },
    { new: true, runValidators: true }
  );

  res
    .status(StatusCodes.OK)
    .json({ newUser, msg: "username changed successfuly" });
};

module.exports = { changePassword, changeUsername };
