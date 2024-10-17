const GameRecord = require("../models/GameRecord");
const User = require("../models/User");
const mongoose = require("mongoose");
const axios = require("axios");
const Games = require("../models/Games");

const sendChallenge = (socket, id) => {
  socket.on("send-challenge", async (friend, callback) => {
    const receiverUser = await User.findOne({ username: friend });
    const newNots = [
      { type: "game-challenge", from: id, isAccepted: "no-answer" },
      ...receiverUser.notifications,
    ];
    receiverUser.notifications = newNots;
    await receiverUser.save();
    await GameRecord.findOneAndUpdate(
      { name: id },
      {
        sentChallenge: friend,
      },
      { new: true }
    );
    socket.to(friend).emit("challenge-received", id);
    callback();
  });
};

const cancelChallenge = (socket, id) => {
  socket.on("cancel-challenge", async (user, callback) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await GameRecord.findOneAndUpdate(
        { name: id },
        { sentChallenge: "no-one" },
        { new: true, session }
      );

      const receiverUser = await User.findOne({ username: user }).session(
        session
      );

      const newNots = receiverUser.notifications.map((n) => {
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

      receiverUser.notifications = newNots;
      await receiverUser.save({ session });
      await session.commitTransaction();
      session.endSession();
      socket.to(user).emit("challenge-back", id);
      callback();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error(error);
    }
  });
};

const acceptChallenge = (socket, id) =>
  socket.on("accept-challenge", async (from, callback) => {
    const newGame = await Games.create({ player1: id, player2: from });
    const user1 = await User.findOne({ username: id });
    const newNots = user1.notifications.map((n) => {
      if (
        n.type === "game-challenge" &&
        n.from === from &&
        n.isAccepted === "no-answer"
      ) {
        return { ...n, isAccepted: "game-played" };
      } else {
        return { ...n };
      }
    });
    user1.notifications = newNots;
    await user1.save();
    await GameRecord.findOneAndUpdate(
      { name: from },
      { sentChallenge: "no-one" }
    );
    socket.to(from).emit("challenge-accepted", id, newGame._id);
    callback(newGame._id);
  });

const getWord = async (req, res) => {
  try {
    const { data: randomWords } = await axios.get(
      "https://random-word-api.herokuapp.com/word?number=10"
    );
    let Word = "";
    let WordObject = {};

    for (const word of randomWords) {
      if (!Word) {
        try {
          const response = await axios.get(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
          );
          if (response.data[0]?.word) {
            Word = response.data[0].word;
            WordObject = response.data;
          }
        } catch (error) {
          console.log("err-word");
        }
      }
    }
    res.status(200).json({
      success: true,
      word: `${Word}`,
      partOfSpeech: WordObject[0].meanings[0].partOfSpeech,
      def: WordObject[0].meanings[0].definitions[0].definition,
    });
  } catch (error) {
    console.error("Error fetching random words:", error);
  }
};

const sendWord = (socket, id) =>
  socket.on("send-word", (data, opp, cb) => {
    socket.to(opp).emit("your-word", data);
    cb();
  });

const sendAttempt = (socket, id) =>
  socket.on("send-attempt", (opp) => {
    socket.to(opp.playerName).emit("receive-attempt", opp);
  });

const registerWin = (socket, id) =>
  socket.on("send-win", async (looser, att, gameId) => {
    const newGame = await Games.findOneAndDelete({ _id: gameId });
    const winner = await User.findOne({ username: id });
    const newRecord = winner.friends.map((f) => {
      if (f.username === looser) {
        let newWins = f.record.wins + 1;
        let losses = f.record.loss;
        let record = { wins: newWins, loss: losses };

        return { ...f, record: record };
      } else {
        return { ...f };
      }
    });
    winner.friends = newRecord;
    await winner.save();
    const Looser = await User.findOne({ username: looser });
    const newLooserRecord = Looser.friends.map((f) => {
      if (f.username === id) {
        let newWins = f.record.wins;
        let losses = f.record.loss + 1;
        let record = { wins: newWins, loss: losses };

        return { ...f, record: record };
      } else {
        return { ...f };
      }
    });
    Looser.friends = newLooserRecord;
    await Looser.save();
    socket.to(looser).emit("you-lost", att);
  });

const exitGame = (socket, id) =>
  socket.on("opp-giveup", async (opp, gameId) => {
    const game = await Games.findOneAndDelete({ _id: gameId });
    socket.to(opp).emit("opp-quit", id);
    const user1 = await User.findOne({ username: id });
    const new_user1 = user1.friends.map((f) => {
      if (f.username === opp) {
        let newWins = f.record.wins;
        let losses = f.record.loss + 1;
        let record = { wins: newWins, loss: losses };
        return { ...f, record: record };
      } else {
        return { ...f };
      }
    });
    user1.friends = new_user1;
    await user1.save();
    const user2 = await User.findOne({ username: opp });
    const new_user2 = user2.friends.map((f) => {
      if (f.username === id) {
        let newWins = f.record.wins + 1;
        let losses = f.record.loss;
        let record = { wins: newWins, loss: losses };
        return { ...f, record: record };
      } else {
        return { ...f };
      }
    });
    user2.friends = new_user2;
    await user2.save();
  });

const checkGame = async (req, res) => {
  const { gameId } = req.query;
  const game = await Games.findOne({ _id: gameId });
  if (game === null) {
    res.status(200).json({ success: false });
  } else {
    res.status(200).json({ success: true, game });
  }
};

module.exports = {
  sendChallenge,
  cancelChallenge,
  acceptChallenge,
  getWord,
  sendAttempt,
  registerWin,
  sendWord,
  exitGame,
  checkGame,
};
