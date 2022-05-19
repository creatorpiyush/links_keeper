const express = require("express");

require("dotenv").config();

const db = require("./models");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routers
app.use("/", require("./routes/index"));

app.use("/users", require("./routes/user"));

const PORT = process.env.PORT;

// * Server Listen
app.listen(PORT, () => {
  console.log(`Server is listening on ${PORT}`);
});
