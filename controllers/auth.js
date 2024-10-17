const BadRequestError = require("../errors/BadRequesError");
const { StatusCodes } = require("http-status-codes");

const User = require("../models/User");
const GameRecord = require("../models/GameRecord");

const LogIn = async (req, res) => {
  const { username: name, password } = req.body;
  if (!name || !password) {
    throw new BadRequestError("please provide all the credentials");
  }
  const user = await User.findOne({ username: name });
  if (!user) {
    throw new BadRequestError("please provide the correct credentials");
  }
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new BadRequestError("Invalid credentials");
  }
  const token = user.createJWT();
  const friends = user.friends;
  res.status(StatusCodes.OK).json({ username: name, token, friends });
};

const Register = async (req, res) => {
  const { username, password } = req.body;
  const exists = await User.findOne({ username: username });
  if (exists) {
    throw new BadRequestError("please provide unique name");
  }
  if (!username || !password) {
    throw new BadRequestError("please provide all the credentials");
  }
  const date = new Date();
  const user = await User.create({
    username,
    password,
    since: `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`,
  });
  const GR = await GameRecord.create({ _id: user._id, name: username });
  const token = user.createJWT();
  res.status(201).json({ username, token, friends: [] });
};

module.exports = {
  LogIn,
  Register,
};
