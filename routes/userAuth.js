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
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
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
    return res.status(422).json({ errors: error, request: false });
  }

  if (password !== confirm_password) {
    return res.status(400).json({
      message: "Password and Confirm Password do not match",
      request: false,
    });
  }

  // * Check if user already exists
  db.User.findOne({
    email,
  }).then((user) => {
    if (user) {
      return res.status(400).json({
        message: "User already exists",
        request: false,
      });
    }

    // check if username already exists
    db.User.findOne({
      username,
    }).then((user) => {
      if (user) {
        return res.status(400).json({
          message: "Username already taken",
          request: false,
        });
      }

      let access_token = jwt.sign(
        {
          username,
          password,
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
                request: true,
              });
            })
            .catch((err) => {
              console.log(err);
              res.status(400).json({
                message: "Error creating user",
                err,
                request: false,
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
    return res.status(422).json({ errors: error, request: false });
  }

  // * empty field check
  if (email === "" || password === "") {
    return res.status(400).json({
      error: "Please fill in all fields",
      request: false,
    });
  }

  db.User.findOne({ email })
    .then((user) => {
      if (!user) {
        return res.status(400).json({
          message: "User not found",
          request: false,
        });
      }

      bcrypt.compare(password, user.password).then((isMatch) => {
        if (!isMatch) {
          return res.status(400).json({
            message: "Incorrect password",
            request: false,
          });
        }

        // * is user verified
        if (!user.is_verified) {
          sendVerificationEmail(user.email, user.username, user.access_token);
          return res.status(400).json({
            message: "User not verified",
            request: false,
          });
        }

        const payload = {
          email: user.email,
          password: password,
        };

        jwt.sign(payload, process.env.JWT_SECRET, (err, token) => {
          if (err) {
            return res.status(400).json({
              message: "Error logging in",
              request: false,
            });
          }

          // add token to database
          db.User.findOneAndUpdate({ email }, { access_token: token }).then(
            (user) => {
              if (!user) {
                return res.status(400).json({
                  message: "Error logging in",
                  request: false,
                });
              }
            }
          );

          // * set session
          let newUser = { ...user }._doc;
          delete newUser.password;
          delete newUser.forget_password_token;
          newUser.access_token = token;
          req.session.user = user;

          return res.json({
            message: "User logged in",
            userStatus: user.is_verified,
            request: true,
            token,
          });
        });
      });
    })
    .catch((err) => {
      return res.status(400).json({
        message: "Error logging in",
        request: false,
      });
      res.status(400).render("login", { error: "Error logging in" });
      req.flash("error", "Error logging in");
      return res.redirect("./login");
    });
});

// get user details via access token
route.get("/get/:access_token", (req, res) => {
  const { access_token } = req.params;

  db.User.findOne({ access_token }).then((user) => {
    if (!user) {
      return res.status(400).json({
        message: "User not found",
        request: false,
      });
    }

    userDetails = {
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      is_verified: user.is_verified,
      access_token: user.access_token,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    res.json({
      message: "User found",
      request: true,
      userDetails,
    });
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
          request: false,
        });
      }

      user.is_verified = true;
      user
        .save()
        .then((user) => {
          res.json({
            message: "User verified",
            request: true,
            user,
          });
        })
        .catch((err) => {
          res.status(400).json({
            message: "Error verifying user",
            request: false,
            err,
          });
        });
    })
    .catch((err) => {
      res.status(500).json({
        message: "Error verifying user",
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
          request: false,
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
              res.status(400).json({
                message: "Error getting links",
                err,
                request: false,
              });
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

          return res.status(200).json({
            message: "User found",
            user: userData,
            links,
            request: true,
          });
        })
        .catch((err) => {
          console.log(err);
          res.status(400).json({
            message: "Error getting links",
            err,
            request: false,
          });
        });
    })
    .catch((err) => {
      res.status(400).json({
        message: "Error getting user",
        err,
        request: false,
      });
    });
});

// * upload image
route.post(
  "/profile/:id/upload",
  upload.single("displayImage"),
  async (req, res) => {
    if (!req.session.user) {
      return res.status(400).json({
        message: "User not found",
        request: false,
      });
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
            request: true,
          });
        })
        .catch((err) => {
          res.status(400).json({
            message: "Error uploading image",
            err,
            request: false,
          });
        });
    });
  }
);

// * logout
route.delete("/logout", (req, res) => {
  req.session.destroy();
  return res.status(200).json({
    message: "User logged out",
    request: true,
  });
  res.status(200).redirect("./login");
});

// * forgot password
route.get("/forgot-password", (req, res) => {
  return res.render("forgot-password", { error: req.flash("error") });
});

route.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  if (email === "") {
    return res.status(400).json({
      message: "Please enter your email",
      request: false,
    });
  }

  db.User.findOne({ email })
    .then((user) => {
      if (!user) {
        return res.status(400).json({
          message: "User not found",
          request: false,
        });
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
          return res.status(200).json({
            message: "Email sent",
            request: true,
          });
        })
        .catch((err) => {
          return res.status(400).json({
            message: "Error sending email",
            request: false,
            err,
          });
        });
    })
    .catch((err) => {
      return res.status(400).json({
        message: "Error sending email",
        request: false,
        err,
      });
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
  const { forget_password_token, password, confirm_password } = req.body;

  if (password === "" || confirm_password === "") {
    return res.status(400).json({
      message: "Please enter your password",
      request: false,
    });
  }

  if (password !== confirm_password) {
    return res.status(400).json({
      message: "Passwords do not match",
      request: false,
    });
  }

  db.User.findOne({ forget_password_token })
    .then((user) => {
      if (!user) {
        return res.status(400).json({
          message: "User not found",
          request: false,
        });
      }

      // delete forget_password_token
      user.forget_password_token = null;

      // encrypt password
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, (err, hash) => {
          if (err) {
            return res.status(400).json({
              message: "Error encrypting password",
              err,
              request: false,
            });
          }

          user.password = hash;

          user.updated_at = Date.now();

          user
            .save()
            .then((user) => {
              return res.status(200).json({
                message: "Password reset successfully",
                request: true,
                username: user.username,
              });
            })
            .catch((err) => {
              return res.status(400).json({
                message: "Error resetting password",
                request: false,
                err,
              });
            });
        });
      });
    })
    .catch((err) => {
      return res.status(400).json({
        message: "Error resetting password",
        request: false,
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
    html: `<b>Hello ${username}!</b> <br> <br> <a href="http://localhost:3000/user/verify/${access_token}">Click here to verify your account</a>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    return info;
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
    return info;
  });
}

module.exports = route;
