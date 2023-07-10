const route = require("express").Router();

const moment = require("moment");

const db = require("../models");

route.get("/", (req, res) => {
  res.redirect("/dashboard");
});

// dashboard
route.get("/dashboard", async (req, res) => {
  if (req.session.user) {
   await db.Link.find({ email: req.session.user.email })
      .populate("link")
      .then((link) => {
        return res.status(200).json({
          request: true,
          data: link,
          user: req.session.user,
        })
        res.render("dashboard", { link, user: req.session.user });
      });
  } else {
    return res.status(400).json({
      error: "Please login to continue",
      request: false,
    });

    res.redirect("/user/login");
  }
});

// Login redirect
route.get("/login", (req, res) => {
  res.redirect("/user/login");
});

// signup
route.get("/signup", (req, res) => {
  res.redirect("/user/signup");
});

// Share Link
route.use("/share", require("./shareProfile"));

// // shared-page
// route.get("/:username", (req, res) => {
//   const { username } = req.params;

//   let ifPageExists = db.User.findOne({ username });

//   ifPageExists
//     .then((user) => {
//       if (user) {
//         db.Link.find({ email: user.email })
//           .populate("link")
//           .then((linksdata) => {
//             db.User.findOne({ username: username }).then((user) => {
//               res.render("shareLink", {
//                 linksdata,
//                 user,
//               });
//             });
//           })
//           .catch((err) => {
//             res.status(400).render("error", {
//               error: "Error finding links",
//             });
//           });
//       } else {
//         res.status(400).render("error", {
//           error: "User not found",
//         });
//       }
//     })
//     .catch((err) => {
//       res.status(400).render("error", {
//         error: "Error finding page",
//       });
//     });
// });

module.exports = route;
