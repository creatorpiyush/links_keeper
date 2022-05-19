const mongoose = require("mongoose");

const db_url = process.env.MONGODB_URL;

mongoose
  .connect(db_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((result) => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log("Error connecting to MongoDB", err);
  });

module.exports = {
  User: require("./users"),
};
