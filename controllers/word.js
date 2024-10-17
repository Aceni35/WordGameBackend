const axios = require("axios");
const { StatusCodes } = require("http-status-codes");
const User = require("../models/User");
const BadRequest = require("../errors/BadRequesError");
const GameRecord = require("../models/GameRecord");
const Clans = require("../models/clanModel");

const getWord = async (req, res) => {
  const { userId, username } = req.user;

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
        } catch (error) {}
      }
    }
    const getUser = await GameRecord.findByIdAndUpdate({ _id: userId });
    let newNumber = getUser.played + 1;
    const newData = await GameRecord.findByIdAndUpdate(
      { _id: userId },
      {
        played: newNumber,
        losses: newNumber - getUser.wins - 1,
        waitingFor: Word,
      },
      { new: true }
    );

    res.status(StatusCodes.OK).json({
      success: true,
      word: `${Word}`,
      user: username,
      partOfSpeech: WordObject[0].meanings[0].partOfSpeech,
      def: WordObject[0].meanings[0].definitions[0].definition,
    });
  } catch (error) {
    console.error("Error fetching random words:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "An error occurred" });
  }
};

const SendGameData = async (req, res) => {
  const { userId, username } = req.user;
  const { win, noGuess, gameWord, clan } = req.body;
  if (clan != null) {
    const userClan = await Clans.findOne({ name: clan });
    userClan.clanWon = userClan.clanWon + 1;
    await userClan.save();
  }
  const oldUser = await GameRecord.findByIdAndUpdate({ _id: userId });
  if (gameWord != oldUser.waitingFor) {
    throw new BadRequest("word does not match to your current given word");
  }
  if (win === undefined || noGuess === undefined) {
    throw new BadRequest("Bad data submitted");
  }
  let newWins = oldUser.wins;
  if (win === true) {
    newWins++;
  }
  let newAvg = (oldUser.avgGuess + noGuess) / oldUser.played;
  const newUser = await GameRecord.findByIdAndUpdate(
    { _id: userId },
    { wins: newWins, avgGuess: newAvg, waitingFor: "no-word" },
    { new: true }
  );
  res.status(StatusCodes.OK).json({ newUser });
};

module.exports = { getWord, SendGameData };
