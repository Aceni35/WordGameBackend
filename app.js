require("express-async-errors");
require("dotenv").config();
const cors = require("cors");

const express = require("express");
const app = express();
const socket = require("socket.io");
const io = socket(3000, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

const connectDB = require("./connectDB/connect");

// Routers

const WordRouter = require("./routers/word");
const authRouter = require("./routers/auth");
const changeData = require("./routers/chnageUser");
const getInfo = require("./routers/userInfo");
const leaderboards = require("./routers/leaderboard");
const clan = require("./routers/clan");

// Errors
const { StatusCodes } = require("http-status-codes");
const BadRequestError = require("./errors/BadRequesError");
const notFound = require("./middleware/notFound");
const ErrorHandler = require("./middleware/HandleError");

// middleware
app.use(cors());
app.use(express.json());
const checkAuth = require("./middleware/authentication");

//socket
const {
  sendChallenge,
  cancelChallenge,
  acceptChallenge,
  sendWord,
  sendAttempt,
  registerWin,
  exitGame,
} = require("./controllers/versusFriend");
const {
  addFriend,
  acceptFriend,
  rejectFriend,
  userDisconnect,
  userConnect,
  removeFriend,
} = require("./controllers/friends");
const {
  sendMessage,
  joinClan,
  leaveClan,
  acceptRequest,
  rejectRequest,
  kickMember,
  promoteMember,
} = require("./controllers/clan");

// routes
app.use("/api/v1", authRouter);
app.use("/api/v1", checkAuth, changeData);
app.use("/api/v1", checkAuth, clan);
app.use("/api/v1", checkAuth, leaderboards);
app.use("/api/v1", checkAuth, WordRouter);
app.use("/api/v1", checkAuth, getInfo);

app.use(notFound);
app.use(ErrorHandler);

const connect = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(5000, () => {
      console.log("listening on port 5000");
    });
  } catch (error) {
    console.log(error);
  }
};
connect();

io.on("connection", (socket) => {
  const id = socket.handshake.query.id;
  console.log(`user ${id} connected`);
  socket.join(id);
  userConnect(id);
  addFriend(socket, id);
  acceptFriend(socket, id);
  rejectFriend(socket, id);
  userDisconnect(socket, id);
  sendChallenge(socket, id);
  cancelChallenge(socket, id);
  removeFriend(socket, id);
  acceptChallenge(socket, id);
  sendWord(socket, id);
  sendAttempt(socket, id);
  registerWin(socket, id);
  exitGame(socket, id);
  sendMessage(socket, id);
  joinClan(socket, id);
  leaveClan(socket, id);
  acceptRequest(socket, id);
  rejectRequest(socket, id);
  kickMember(socket, id);
  promoteMember(socket, id);
});
