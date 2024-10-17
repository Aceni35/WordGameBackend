class CustomError extends Error {
  constructor(message) {
    super(message);
    console.log(message);
  }
}

module.exports = CustomError;
