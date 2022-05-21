const express = require("express");

const passport = require("passport");
const LocalStrategy = require("passport-local");

const hbs = require("hbs");

const session = require("express-session");

require("dotenv").config();

const app = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// hbs
app.set("view engine", "hbs");
app.set("views", __dirname + "/public/views");

const db = require("./models");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routers
app.use("/", require("./routes/index"));

app.use("/users", require("./routes/userAuth"));

const PORT = process.env.PORT;

// * Server Listen
app.listen(PORT, () => {
  console.log(`Server is listening on ${PORT}`);
});
