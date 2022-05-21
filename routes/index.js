const route = require("express").Router();

const moment = require("moment");

const db = require("../models");

route.get("/", (req, res) => {
  res.send("Hello World!");
});

// dashboard
route.get("/dashboard", (req, res) => {
  if (req.session.user) {
    db.Link.find({ email: req.session.user.email })
      .populate("link")
      .then((link) => {
        res.render("dashboard", { link, user: req.session.user });
      });
    // res.render("dashboard", {
    //   user: req.session.user,
    // });
  } else {
    res.redirect("/");
  }
});

// shared-page
route.get("/:username", (req, res) => {
  const { username } = req.params;

  // db.User.findOne({ username })
  //   .then((user) => {
  //     if (!user) {
  //       return res.status(400).json({
  //         message: "User not found",
  //       });
  //     }

  //     user.populate("link").then((linksdata) => {
  //       res.render("shareLink", {
  //         user,
  //         linksdata,
  //       });
  //     });
  //   })

  //   .catch((err) => {
  //     res.status(400).json({
  //       message: "Error getting user",
  //     });
  //   });

  db.Link.find({ username: username })
    .populate("link")
    .then((linksdata) => {
      res.render("shareLink", {
        linksdata,
      });
    })
    .catch((err) => {
      res.status(400).json({
        message: "Error getting user",
      });
    });
});

module.exports = route;
