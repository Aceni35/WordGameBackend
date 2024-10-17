const { StatusCodes } = require("http-status-codes");
const User = require("../models/User");
const GameRecord = require("../models/GameRecord");

const getLeaderboard = async (req, res) => {
  const { username, userId } = req.user;
  const leaderboard = await GameRecord.find({}).sort("-wins").limit(10);
  const info = leaderboard.map((usr) => {
    const { name, wins, played, avgGuess } = usr;
    return { name, wins, played, avgGuess };
  });
  res.status(StatusCodes.OK).json({ info, username });
};

module.exports = { getLeaderboard };
