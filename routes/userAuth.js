const route = require("express").Router();

const db = require("../models");

const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");

const nodemailer = require("nodemailer");

const { body, validationResult } = require("express-validator");

// * signup
route.post("/signup", (req, res) => {
  const { email, username, password, confirm_password } = req.body;

  // * Validate
  body("email", "Email is required").isEmail();
  body("email", "Email is not valid").isEmail();
  body("username", "Username is required").notEmpty();
  body("password", "Password is required").notEmpty();
  body("confirm_password", "Confirm password is required").notEmpty();
  body("confirm_password", "Confirm password must match password").equals(
    password
  );

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).json({ errors: error });
  }

  if (password !== confirm_password) {
    return res.status(400).json({
      message: "Password and Confirm Password do not match",
    });
  }

  // * Check if user already exists
  db.User.findOne({
    email,
  }).then((user) => {
    if (user) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // check if username already exists
    db.User.findOne({
      username,
    }).then((user) => {
      if (user) {
        return res.status(400).json({
          message: "Username already taken",
        });
      }

      let access_token = jwt.sign(
        {
          email,
          username,
          password,
          confirm_password,
        },
        process.env.JWT_SECRET
      );

      // * Create new user
      const newUser = new db.User({
        email,
        username,
        password,
        access_token,
      });

      // * Hash password
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;

          // * Save user to database
          newUser

            .save()

            .then((user) => {
              sendVerificationEmail(email, username, access_token);
              res.json({
                message: "User created",
                user,
              });
            })

            .catch((err) => {
              console.log(err);
              res.status(400).json({
                message: "Error creating user",
                err,
              });
            });
        });
      });
    });
  });
});

// * login

route.get("/login", (req, res) => {
  console.log(req.flash("error"));
  return res.render("login", { error: req.flash("error") });
  // res.send(req.flash("error"));
});

route.post("/login", (req, res) => {
  const { email, password } = req.body;

  // * Validate
  body("email", "Email is required").isEmail();
  body("email", "Email is not valid").isEmail();
  body("password", "Password is required").notEmpty();

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: error });
  }

  // * empty field check
  if (email === "" || password === "") {
    return res.status(400).render("login", {
      error: "Please fill in all fields",
    });
  }

  db.User.findOne({ email })
    .then((user) => {
      if (!user) {
        return res.status(400).render("login", { error: "User not found" });
      }

      bcrypt.compare(password, user.password).then((isMatch) => {
        if (!isMatch) {
          return res.render("login", { error: "Incorrect password" });
        }

        // * is user verified
        if (!user.is_verified) {
          sendVerificationEmail(user.email, user.username, user.access_token);
          return res.render("login", { error: "User not verified" });
        }

        const payload = {
          id: user.id,
          name: user.name,
          email: user.email,
          access_token: user.access_token,
        };

        jwt.sign(payload, process.env.JWT_SECRET, (err, token) => {
          if (err) {
            return res
              .status(400)
              .render("login", { error: "Error logging in" });
          }

          req.session.user = user;

          res.status(200).redirect("/dashboard");
        });
      });
    })
    .catch((err) => {
      res.status(400).render("login", { error: "Error logging in" });
      req.flash("error", "Error logging in");
      return res.redirect("./login");
    });
});

// * verify email
route.get("/verify/:access_token", (req, res) => {
  const { access_token } = req.params;

  db.User.findOne({ access_token })
    .then((user) => {
      if (!user) {
        return res.status(400).json({
          message: "User not found",
        });
      }

      user.is_verified = true;
      user
        .save()
        .then((user) => {
          res.json({
            message: "User verified",
            user,
          });
        })
        .catch((err) => {
          res.status(400).json({
            message: "Error verifying user",
            err,
          });
        });
    })
    .catch((err) => {
      res.status(500).json({
        message: "Error verifying user",
        err,
      });
    });
});

// * send verification email
function sendVerificationEmail(email, username, access_token) {
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

  let mailOptions = {
    from: `"Fred Foo 👻" <${process.env.EMAIL}>`, // sender address
    to: email,
    subject: "Hello ✔",
    text: "Hello world?",
    html: `<b>Hello ${username}!</b> <br> <br> <a href="http://localhost:3000/users/verify/${access_token}">Click here to verify your account</a>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);
  });
}

module.exports = route;
