const express = require("express");

const passport = require("passport");
const LocalStrategy = require("passport-local");

const hbs = require("hbs");

const session = require("express-session");

const flash = require("connect-flash");

const methodOverride = require("method-override");

const multer = require("multer");

require("dotenv").config();

const app = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(methodOverride("_method"));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname + "/public"));

// hbs
app.set("view engine", "hbs");
app.set("views", __dirname + "/public/views");

hbs.registerPartials(__dirname + "/public/views/partials");

hbs.localsAsTemplateData(app);

const db = require("./models");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images");
  },
  // filename: function (req, file, cb) {
  //   cb(null, file.fieldname + "-" + Date.now() + "." + file.originalname.split(".")[1]);
  // }
});

// routers
app.use("/", require("./routes/index"));

app.use("/user", require("./routes/userAuth"));

app.use("/links", require("./routes/userLinks"));

const PORT = process.env.PORT;

// * Server Listen
app.listen(PORT, () => {
  console.log(`Server is listening on ${PORT}`);
});
