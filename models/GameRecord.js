const mongoose = require("mongoose");

const RecordSchema = new mongoose.Schema({
  UserId_: {
    type: String,
  },
  name: {
    type: String,
  },
  played: {
    type: Number,
    default: 0,
  },
  losses: {
    type: Number,
    default: 0,
  },
  wins: {
    type: Number,
    default: 0,
  },
  avgGuess: {
    type: Number,
    default: 0,
  },
  waitingFor: {
    type: String,
    default: "no-word",
  },
  sentChallenge: {
    type: String,
    default: "no-one",
  },
});

module.exports = mongoose.model("GameRecord", RecordSchema);
