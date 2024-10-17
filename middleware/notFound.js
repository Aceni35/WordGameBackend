const notFound = (req, res) => {
  res.status(404).json({ msg: "page not found 404" });
};

module.exports = notFound;
