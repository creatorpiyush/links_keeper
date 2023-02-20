const route = require("express").Router();

const db = require("../models");

route.get("/:username", (req, res) => {
  const { username } = req.params;

  let ifPageExists = db.User.findOne({ username });

  ifPageExists
    .then((user) => {
      if (user) {
        db.Link.find({ email: user.email })
          .populate("link")
          .then((linksdata) => {
            db.User.findOne({ username: username }).then((user) => {
              res.render("shareLink", {
                linksdata,
                user: {
                  username: user.username,
                  displayImage: user.displayImage,
                  displayName: user.displayName,
                  firstName: user.firstName,
                  lastName: user.lastName,
                },
              });
            });
          })
          .catch((err) => {
            res.status(400).render("error", {
              error: "Error finding links",
            });
          });
      } else {
        res.status(400).render("error", {
          error: "User not found",
        });
      }
    })
    .catch((err) => {
      res.status(400).render("error", {
        error: "Error finding page",
      });
    });
});

module.exports = route;
