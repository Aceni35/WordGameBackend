const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema({
  player1: {
    type: String,
  },
  player2: {
    type: String,
  },
});

module.exports = mongoose.model("GameSchema", GameSchema);
