const mongoose = require("mongoose");

const ClanSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    minlength: [4, "please provide a clan name larger than 4 characters"],
    maxlength: [10, "please provide a clan name smaller than 10 characters"],
  },
  maxMembers: {
    type: Number,
    min: 1,
    max: 10,
  },
  minWins: {
    type: Number,
    min: 0,
  },
  clanType: {
    type: String,
  },
  clanMembers: {
    type: Array,
  },
  clanOwner: {
    type: Object,
  },
  clanBest: {
    type: Object,
  },
  clanWon: {
    type: Number,
  },
  totalMembers: {
    type: Number,
    default: 1,
  },
});

module.exports = mongoose.model("Clan", ClanSchema);
