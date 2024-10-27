const User = require("../models/User");
const GR = require("../models/GameRecord");

const addFriend = (socket) =>
  socket.on("add-friend", async ({ username, friend }, giveToast) => {
    const user = await User.findOne({ username: friend });
    console.log(username);
    const senderUser = await User.findOne({ username: username });
    let areFriends = false;
    let hasSent = false;
    let hasReceived = false;
    user.notifications.forEach((not) => {
      if (
        not.type === "friend-request" &&
        not.from === username &&
        not.isAccepted === "no-answer"
      ) {
        hasSent = true;
      }
    });
    user.friends.forEach((fr) => {
      if (fr.username === username) {
        areFriends = true;
      }
    });
    senderUser.notifications.forEach((not) => {
      if (
        not.from === friend &&
        not.type === "friend-request" &&
        not.isAccepted === "no-answer"
      ) {
        hasReceived = true;
        giveToast(
          `${username} has already sent you a friend request check your notifications`
        );
      }
    });
    if (areFriends) {
      giveToast(`you are already friends with ${friend}`);
      return;
    }
    if (hasSent) {
      giveToast(`you have already sent a friend request to ${friend}`);
    }
    if (hasSent === false && hasReceived === false) {
      giveToast(`friend request sent to ${friend}`);
      const newNots = [
        { type: "friend-request", from: username, isAccepted: "no-answer" },
        ...user.notifications,
      ];
      await User.findOneAndUpdate(
        { username: friend },
        { notifications: newNots },
        { new: true }
      );
      socket.to(friend).emit("friend-request", username);
    }
  });

// accept

const acceptFriend = (socket, id) =>
  socket.on("accept-friend", async (name, changeNots) => {
    try {
      const user1 = await User.findOne({ username: name });
      const user2 = await User.findOne({ username: id });
      const newNots = user2.notifications.map((not) => {
        if (
          not.from === name &&
          not.type === "friend-request" &&
          not.isAccepted === "no-answer"
        ) {
          return { ...not, isAccepted: "true" };
        } else {
          return not;
        }
      });
      user2.notifications = newNots;
      user1.notifications = [
        { type: "got-accepted", from: id, isAccepted: "true" },
        ...user1.notifications,
      ];
      const newFriends1 = [
        {
          username: user2.username,
          id: user2._id,
          record: { wins: 0, loss: 0 },
        },
        ...user1.friends,
      ];
      const newFriends2 = [
        {
          username: user1.username,
          id: user1._id,
          record: { wins: 0, loss: 0 },
        },
        ...user2.friends,
      ];
      user1.friends = newFriends1;
      await user1.save();
      user2.friends = newFriends2;
      await user2.save();
      changeNots(newFriends2);
      socket.to(name).emit("got-accepted", name, id);
    } catch (error) {
      console.log(error);
    }
  });

// reject friend

const rejectFriend = (socket, id) =>
  socket.on("reject-friend", async (friend, callback) => {
    const user = await User.findOne({ username: id });
    const newNots = user.notifications.map((n) => {
      if (
        n.from === friend &&
        n.type === "friend-request" &&
        n.isAccepted === "no-answer"
      ) {
        return { ...n, isAccepted: "rejected" };
      } else {
        return { ...n };
      }
    });
    user.notifications = newNots;
    await user.save();
    callback();
  });

const userDisconnect = (socket, id) =>
  socket.on("disconnect", async () => {
    const user = await User.findOneAndUpdate(
      { username: id },
      { online: false },
      { new: true }
    );
    if (user === null) {
      return;
    }
    const gr = await GR.findOne({ name: id });
    if (gr.sentChallenge != "no-one") {
      const rec = gr.sentChallenge;
      gr.sentChallenge = "no-one";
      await gr.save();
      const recNots = await User.findOne({ username: rec });
      const newNots = recNots.notifications.map((n) => {
        if (
          n.from === id &&
          n.type === "game-challenge" &&
          n.isAccepted === "no-answer"
        ) {
          return { ...n, isAccepted: "taken-back" };
        } else {
          return { ...n };
        }
      });
      recNots.notifications = newNots;
      await recNots.save();
      socket.to(rec).emit("challenge-back", rec);
    }
    console.log(`user ${id} disconnected`);
  });

const userConnect = async (id) => {
  const user = await User.findOneAndUpdate(
    { username: id },
    { online: true },
    { new: true }
  );
};

const removeFriend = (socket, id) =>
  socket.on("remove-friend", async (user, callback) => {
    const user1 = await User.findOne({ username: id });
    const user2 = await User.findOne({ username: user });
    const newFriends1 = user1.friends.filter((f) => {
      if (f.username != user) {
        return { ...f };
      }
    });
    const newFriends2 = user2.friends.filter((f) => {
      if (f.username != id) {
        return { ...f };
      }
    });
    user1.friends = newFriends1;
    user2.friends = newFriends2;
    await user1.save();
    await user2.save();
    socket.to(user).emit("unfriend", id);
    callback();
  });

module.exports = {
  addFriend,
  acceptFriend,
  rejectFriend,
  userDisconnect,
  userConnect,
  removeFriend,
};
