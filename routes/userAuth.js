const route = require("express").Router();

const db = require("../models");

const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");

const nodemailer = require("nodemailer");

const crypto = require("crypto");

const { body, validationResult } = require("express-validator");

const multer = require("multer");

const moment = require("moment");

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "creatorpiyush",
  api_key: "897718564747982",
  api_secret: "J8UTV3thq628g70AC3R-eXDG5sw",
});

// multer
const upload = multer({ dest: "public/images" });

// * signup
route.get("/signup", (req, res) => {
  if (!req.session.user) {
    return res.render("signup", { error: req.flash("error") });
  } else {
    return res.redirect("/dashboard");
  }
});

route.post("/signup", (req, res) => {
  const { email, username, password, confirm_password, displayName } = req.body;

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
          status: 400,
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
        displayName,
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
  if (!req.session.user) {
    return res.render("login", { error: req.flash("error") });
  } else {
    return res.redirect("/dashboard");
  }
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
          status: 400,
          request: false,
        });
      }

      user.is_verified = true;
      user
        .save()
        .then((user) => {
          res.json({
            message: "User verified",
            status: 200,
            request: true,
            user,
          });
        })
        .catch((err) => {
          res.status(400).json({
            message: "Error verifying user",
            status: 400,
            request: false,
            err,
          });
        });
    })
    .catch((err) => {
      res.status(500).json({
        message: "Error verifying user",
        status: 500,
        request: false,
        err,
      });
    });
});

// * user profile
route.get("/profile/:id", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const { id } = req.params;

  await db.User.findById(id)
    .then(async (user) => {
      if (!user) {
        return res.status(400).json({
          message: "User not found",
        });
      }

      // todo : count public private links

      await db.Link.find({ email: user.email })
        .then(async (links) => {
          await db.Link.countDocuments({ email: user.email })
            .then((count) => {
              link_counter = count;
            })
            .catch((err) => {
              console.log(err);
            });

          let userData = {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            displayImage: user.displayImage,
            is_verified: user.is_verified,
            displayCover: user.displayCover,
            created_at: moment(user.created_at).format("MMMM Do YYYY h:mm a"),
            updated_at: moment(user.updated_at).format("MMMM Do YYYY h:mm a"),
            link_counter,
          };

          return res.render("profile", {
            userData,
            links,
          });
        })
        .catch((err) => {
          res.status(400).json({
            message: "Error getting links",
            err,
          });
        });
    })
    .catch((err) => {
      res.status(400).json({
        message: "Error getting user",
        err,
      });
    });
});

// * upload image
route.post(
  "/profile/:id/upload",
  upload.single("displayImage"),
  async (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const { id } = req.params;

    cloudinary.uploader.upload(req.file.path, async (err, result) => {
      // console.log(result);

      await db.User.findByIdAndUpdate(id, {
        displayImage: result.secure_url,
      })
        .then((user) => {
          res.json({
            message: "Image uploaded",
            user,
          });
        })
        .catch((err) => {
          res.status(400).json({
            message: "Error uploading image",
            err,
          });
        });
    });
  }
);

// * logout
route.delete("/logout", (req, res) => {
  req.session.destroy();
  res.status(200).redirect("./login");
});

// * forgot password
route.get("/forgot-password", (req, res) => {
  return res.render("forgot-password", { error: req.flash("error") });
});

route.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  if (email === "") {
    return res.render("forgot-password", { error: "Please enter your email" });
  }

  db.User.findOne({ email })
    .then((user) => {
      if (!user) {
        return res.render("forgot-password", { error: "User not found" });
      }

      // token to verify user
      const forget_password_token = crypto.randomBytes(20).toString("hex");

      user.forget_password_token = forget_password_token;

      user
        .save()
        .then((user) => {
          sendForgotPasswordEmail(
            user.email,
            user.username,
            forget_password_token
          );
          return res.render("forgot-password", { success: "Email sent" });
        })
        .catch((err) => {
          return res.render("forgot-password", {
            error: "Error sending email",
          });
        });
    })
    .catch((err) => {
      return res.render("forgot-password", { error: "Error sending email" });
    });
});

// * reset password
route.get("/reset-password/:forget_password_token", (req, res) => {
  res.render("reset-password", {
    forget_password_token: req.params.forget_password_token,
    error: req.flash("error"),
  });
});

route.post("/reset-password", (req, res) => {
  const { forget_password_token } = req.body;
  const { password, confirm_password } = req.body;

  if (password === "" || confirm_password === "") {
    return res.render("reset-password", {
      error: "Please enter your password",
    });
  }

  if (password !== confirm_password) {
    return res.render("reset-password", { error: "Passwords do not match" });
  }

  db.User.findOne({ forget_password_token })
    .then((user) => {
      if (!user) {
        return res.render("reset-password", { error: "User not found" });
      }

      // delete forget_password_token
      user.forget_password_token = null;

      // encrypt password
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, (err, hash) => {
          if (err) {
            console.log(err);
            return res.render("reset-password", {
              error: "Error encrypting password",
            });
          }

          user.password = hash;

          user.updated_at = Date.now();

          user
            .save()
            .then((user) => {
              res.redirect("/user/login");
            })
            .catch((err) => {
              res.render("reset-password", {
                error: "Error resetting password",
              });
            });
        });
      });
    })
    .catch((err) => {
      res.render("reset-password", { error: "Error resetting password" });
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
    html: `<b>Hello ${username}!</b> <br> <br> <a href="http://localhost:3000/user/verify/${access_token}">Click here to verify your account</a>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);
  });
}

// * send forgot password email
function sendForgotPasswordEmail(email, username, forget_password_token) {
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
    html: `<b>Hello ${username}!</b> <br> <br> <a href="http://localhost:3000/user/reset-password/${forget_password_token}">Click here to reset your password</a>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);
  });
}

module.exports = route;
