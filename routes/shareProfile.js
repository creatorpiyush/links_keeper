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
          .then((linksData) => {
            db.User.findOne({ username: username }).then((user) => {
              return res.status(200).json({
                request: true,
                data: linksData,
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
            return res.status(400).json({
              error: "Error finding links",
              request: false,
            });
          });
      } else {
        return res.status(400).json({
          error: "User not found",
          request: false,
        });
      }
    })
    .catch((err) => {
      return res.status(400).json({
        error: "Error finding page",
        request: false,
      });
    });
});

module.exports = route;
