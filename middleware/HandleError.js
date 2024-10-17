const { StatusCodes } = require("http-status-codes");

const errorHandler = (err, req, res, next) => {
  if (err.code === 11000) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: "please provide a unique username" });
    return;
  }
  res.status(400).json({ msg: err.message, code: err.statusCode });
};

module.exports = errorHandler;
