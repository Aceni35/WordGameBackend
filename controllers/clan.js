const User = require("../models/User");
const GR = require("../models/GameRecord");
const Clan = require("../models/clanModel");
const GameRecord = require("../models/GameRecord");

const createClan = async (req, res) => {
  const { username: usr } = req.user;
  const { name, max, min, type } = req.body;
  if (!name || !max || !min || !type) {
    res.status(400).json({ success: false, msg: "please provide all data" });
    return;
  }
  if (name.length < 4) {
    res.status(400).json({
      success: false,
      msg: "clan name has to be longer than 4 letters",
    });
    return;
  }
  const user = await GR.findOne({ name: usr });
  let { wins, name: usr_name } = user;
  let newMember = { wins, usr_name };
  const clan = await Clan.create({
    name: name,
    maxMembers: max,
    minWins: min,
    clanType: type,
    clanOwner: newMember,
    clanWon: wins,
    clanBest: newMember,
    clanMembers: [newMember],
    totalMembers: 1,
  });
  await User.findOneAndUpdate({ username: usr }, { clan: clan.name });
  res.status(200).json({ success: true, clan });
};

const sendMessage = (socket, id) =>
  socket.on("send-clan-message", (clanMates, message, cb) => {
    console.log(clanMates);
    clanMates.forEach((cm) => {
      if (cm.usr_name != id) {
        socket.to(cm.usr_name).emit("clan-message-receive", message, id);
      }
      cb();
    });
  });

const searchClan = async (req, res) => {
  const { name, filters, min, max, type, gw } = req.query;
  if (!name) {
    res.status(400).json({ msg: "please provide clan name" });
  }

  if (filters === "off") {
    const clans = await Clan.find({
      name: { $regex: new RegExp(name, "i") },
    });
    res.status(200).json({ clans });
  } else if (filters === "on") {
    const clans = await Clan.find({
      name: { $regex: new RegExp(name, "i") },
      totalMembers: { $gt: Number(min) - 1, $lt: Number(max) + 1 },
      clanType: type,
      clanWon: { $gt: Number(gw) - 1 },
    });
    res.status(200).json({ clans });
  }
};

const joinClan = (socket, id) =>
  socket.on("join-clan", async (clan, cb) => {
    const user = await User.findOne({ username: id });
    if (user.clan != "no-clan") {
      cb("warning", "leave your current clan before joining another");
      return;
    }
    const userClan = await Clan.findOne({ name: clan });
    if (userClan === null) {
      cb("warning", "clan no longer exists");
      return;
    }
    if (userClan.clanType === "req") {
      const { clanOwner } = userClan;
      const owner = await User.findOne({ username: clanOwner.usr_name });
      let hasSent = false;
      owner.notifications.forEach((not) => {
        if (not === null) return;
        if (
          not.type === "clan-request" &&
          not.from === id &&
          not.isAccepted === "no-answer"
        ) {
          hasSent = true;
        }
      });
      if (hasSent) {
        cb("warning", "you have already sent a request to join");
        return;
      }
      owner.notifications = [
        { type: "clan-request", from: id, isAccepted: "no-answer" },
        ...owner.notifications,
      ];
      socket.to(clanOwner.usr_name).emit("clan-request", id);
      cb("info", "request to join has been sent");
      await owner.save();
      return;
    }
    const userGr = await GR.findOne({ name: id });
    let wins = userGr.wins;
    if (userClan.maxMembers === userClan.totalMembers) {
      cb("warning", "clan is full");
      return;
    }
    if (userGr.wins < userClan.minWins) {
      cb("warning", "you need more wins to join");
      return;
    }
    userClan.clanMembers = [
      ...userClan.clanMembers,
      { wins: wins, usr_name: id },
    ];
    userClan.totalMembers = userClan.totalMembers + 1;
    userClan.clanWon = userClan.clanWon + userGr.wins;
    await userClan.save();
    user.clan = clan;
    await user.save();
    userClan.clanMembers.forEach((member) => {
      socket.to(member.usr_name).emit("new-clanMate", id);
    });
    cb();
  });

const leaveClan = (socket, id) =>
  socket.on("leave-clan", async (clan, cb) => {
    const userClan = await Clan.findOne({ name: clan });
    if (userClan.clanOwner.usr_name === id && userClan.totalMembers > 1) {
      cb("warning", "please leave someone else as clan leader");
      return;
    }
    await User.findOneAndUpdate({ username: id }, { clan: "no-clan" });
    if (userClan.totalMembers === 1) {
      await Clan.findOneAndDelete({ name: clan });
      cb("success", "You left the clan");
      return;
    }
    userClan.clanMembers.map((member) => {
      if (member.usr_name != id) {
        socket.to(member.usr_name).emit("teamMate-left", id);
      }
    });
    let newMates = userClan.clanMembers.filter((member) => {
      if (member.usr_name != id) {
        return member;
      }
    });
    const userGr = await GR.findOne({ name: id });
    userClan.clanWon = userClan.clanWon - userGr.wins;
    userClan.totalMembers = userClan.totalMembers - 1;
    userClan.clanMembers = newMates;
    await userClan.save();
    cb("success", "You left the clan");
  });

const acceptRequest = (socket, id) =>
  socket.on("accept-clanMate", async (name, clanName, cb) => {
    const user = await User.findOne({ username: name });
    const userClan = await Clan.findOne({ name: clanName });
    if (userClan === null) {
      cb("warning", "clan no longer exists");
      return;
    }
    if (
      user.clan != "no-clan" ||
      userClan.maxMembers === userClan.totalMembers
    ) {
      let newNots = user.notifications.map((not) => {
        if (not.from === name && not.type === "clan-request") {
          return { ...not, from: username, isAccepted: "not-possible" };
        } else {
          return not;
        }
      });
      user.notifications = newNots;
      await user.save();
    } else {
      const userGr = await GR.findOne({ name: name });
      userClan.clanWon = userClan.clanWon + userGr.wins;
      userClan.totalMembers = userClan.totalMembers + 1;
      let wins = userGr.wins;
      userClan.clanMembers = [
        ...userClan.clanMembers,
        { wins: wins, usr_name: name },
      ];
      const owner = await User.findOne({
        username: userClan.clanOwner.usr_name,
      });

      let newNots = owner.notifications.map((not) => {
        if (
          not.from === name &&
          not.type === "clan-request" &&
          not.isAccepted === "no-answer"
        ) {
          return { ...not, from: name, isAccepted: "true" };
        } else {
          return not;
        }
      });
      owner.notifications = newNots;
      await owner.save();
      user.clan = clanName;
      await user.save();
      await userClan.save();
      socket.to(name).emit("new-clan", clanName);
      cb();
      userClan.clanMembers.map((member) => {
        if (member.usr_name != id) {
          socket.to(member.usr_name).emit("new-clanMate", name);
        }
      });
    }
  });

const rejectRequest = (socket, id) =>
  socket.on("reject-clanMate", async (name, cb) => {
    const owner = await User.findOne({ username: id });
    let newNots = owner.notifications.map((not) => {
      if (
        not.from === name &&
        not.type === "clan-request" &&
        not.isAccepted === "no-answer"
      ) {
        return { ...not, from: name, isAccepted: "false" };
      } else return not;
    });
    owner.notifications = newNots;
    await owner.save();
    cb();
  });

const kickMember = (socket, id) =>
  socket.on("kick-member", async (name, clanName, cb) => {
    const userClan = await Clan.findOne({ name: clanName });
    const user = await User.findOne({ username: name });
    if (user.clan === "no-clan" || user.clan != userClan.name) {
      cb("info", "user has already left the clan");
      return;
    }
    const userGr = await GameRecord.findOne({ name: name });
    let newMembers = userClan.clanMembers.filter((mem) => {
      if (mem.usr_name != name) {
        return mem;
      }
    });
    user.clan = "no-clan";
    socket.to(name).emit("kicked");
    userClan.clanMembers.forEach((mem) => {
      if (mem.usr_name === id || mem.usr_name === name) return;
      socket.to(mem.usr_name).emit("mate-kicked", name);
    });
    await user.save();
    userClan.totalMembers -= 1;
    userClan.clanMembers = newMembers;
    userClan.clanWon -= userGr.wins;
    await userClan.save();
    cb("success", "clanMate removed");
  });

const promoteMember = (socket, id) =>
  socket.on("promote-member", async (name, clanName, cb) => {
    const user = await User.findOne({ username: name });
    const userClan = await Clan.findOne({ name: clanName });
    if (user.clan != clanName) {
      cb("warning", "user is no longer in your clan");
      return;
    }
    const user2 = await User.findOne({ username: id });
    let hasNots = false;
    user2.notifications.forEach((not) => {
      if (not.type === "clan-request" && not.isAccepted === "no-answer") {
        hasNots = true;
      }
    });
    if (hasNots) {
      cb("warning", "please take care of the clan requests first");
      return;
    }
    const userGr = await GR.findOne({ name: name });
    userClan.clanOwner = { usr_name: name, wins: userGr.wins };
    await userClan.save();
    socket.to(name).emit("promoted");
    userClan.clanMembers.forEach((mem) => {
      if (mem.usr_name === id || mem.usr_name === name) return;
      socket.to(mem.usr_name).emit("new-owner");
    });
    cb("success", "new owner has been set");
  });

module.exports = {
  createClan,
  sendMessage,
  searchClan,
  joinClan,
  leaveClan,
  acceptRequest,
  rejectRequest,
  kickMember,
  promoteMember,
};
