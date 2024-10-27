const GameRecord = require("../models/GameRecord");
const User = require("../models/User");
const Clans = require("../models/clanModel");

const getHomepage = async (req, res) => {
  const { userId } = req.user;
  const { username, friends, notifications, clan } = await User.findById({
    _id: userId,
  });
  const gr = await GameRecord.findOne({ name: username });
  let wins = gr.wins;
  const userClan = await Clans.findOne({ name: clan }).exec();
  let totalWins = 0;
  let totalMembers = 0;
  if (userClan != null) {
    userClan.clanMembers.forEach((x) => {
      totalWins += x.wins;
      totalMembers += 1;
    });
  }

  const OnlineUsers = await User.find({ online: true });
  const onlineFriends = OnlineUsers.filter((u) => {
    return friends.some((f) => f.username === u.username);
  }).map((u) => ({
    username: u.username,
    id: u.id,
    online: u.online,
  }));
  console.log(onlineFriends);

  res.status(200).json({
    username,
    wins,
    friends,
    notifications,
    onlineFriends,
    userClan,
  });
};

const searchUser = async (req, res) => {
  const { search, username } = req.query;
  if (!search) {
    res.status(200).json({ users: [] });
    return;
  }
  const users = await User.find({
    username: { $regex: new RegExp(search, "i") },
  }).limit(10);
  res.status(200).json({ users, username });
};

const singleUser = async (req, res) => {
  const { search } = req.query;
  const { username: name } = req.user;
  const user = await User.findOne({ username: search });
  if (!user) {
    res.status(400).json({ msg: `no user with name ${search} exists` });
    return;
  }
  const user2 = await User.findOne({ username: name });
  const rec = user2.friends.filter((f) => {
    return f.username === search;
  });
  let won = rec[0].record.wins;
  let lost = rec[0].record.loss;
  const gameData = await GameRecord.findOne({ name: search });
  const { username, since } = user;
  const { avgGuess, losses, wins } = gameData;
  res.status(200).json({ username, since, avgGuess, losses, wins, won, lost });
};

module.exports = {
  getHomepage,
  searchUser,
  singleUser,
};
