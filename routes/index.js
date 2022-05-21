const route = require("express").Router();

const db = require("../models");

route.get("/", (req, res) => {
  res.send("Hello World!");
});

// dashboard
route.get("/dashboard", (req, res) => {
  console.log(req.session.user);
  if (req.session.user) {
    res.render("dashboard", {
      user: req.session.user,
    });
  } else {
    res.redirect("/");
  }
});

module.exports = route;
